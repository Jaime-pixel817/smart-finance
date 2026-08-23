// Lector de YAML mínimo para los ficheros de research (meta.yaml, sources.yaml).
//
// POR QUÉ EXISTE: el sitio no tiene dependencia de YAML y no queremos añadir
// una para leer dos ficheros en el build. Esto cubre EXACTAMENTE el subconjunto
// que usan content/research/*/{meta,sources}.yaml:
//
//   - comentarios de línea completa y comentarios al final de una línea
//   - mapas anidados por indentación (2 espacios)
//   - secuencias de mapas y de escalares (`- clave: valor` / `- valor`)
//   - escalares con comillas dobles o simples, sin comillas, null / ~ / vacío,
//     booleanos y números
//   - escalares de bloque plegados (`>`, `>-`) y literales (`|`, `|-`)
//
// Lo que NO soporta (y avisa con throw): anclas/alias, flow (`{}` / `[]`),
// multidocumento (`---`), claves complejas. Si un día hace falta algo de eso,
// mejor añadir la dependencia de verdad que estirar esto.

const BLOCK = /^([>|])([-+]?)$/;

/** Quita el comentario final de una línea respetando lo que va entre comillas. */
function stripComment(s) {
  let quote = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quote) {
      if (c === quote) quote = null;
    } else if (c === '"' || c === "'") {
      quote = c;
    } else if (c === '#' && (i === 0 || /\s/.test(s[i - 1]))) {
      return s.slice(0, i);
    }
  }
  return s;
}

/** Convierte un escalar de YAML a valor de JavaScript. */
export function parseScalar(raw) {
  const s = stripComment(raw).trim();
  if (s === '' || s === '~' || s === 'null' || s === 'Null' || s === 'NULL') return null;
  if (s === 'true' || s === 'True') return true;
  if (s === 'false' || s === 'False') return false;
  if (s[0] === '"' && s[s.length - 1] === '"' && s.length > 1) {
    return s.slice(1, -1).replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
  }
  if (s[0] === "'" && s[s.length - 1] === "'" && s.length > 1) return s.slice(1, -1).replace(/''/g, "'");
  if (/^-?\d+$/.test(s)) return Number(s);
  if (/^-?\d*\.\d+$/.test(s)) return Number(s);
  return s;
}

/** Lista de líneas útiles: { indent, text } sin blancos ni comentarios sueltos. */
function tokenize(src) {
  const out = [];
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*$/.test(line)) { out.push({ indent: -1, text: '', blank: true, n: i + 1 }); continue; }
    if (/^\s*#/.test(line)) continue;
    if (/^---\s*$/.test(line) || /^\.\.\.\s*$/.test(line)) throw new Error('yaml.mjs: multidocumento no soportado (línea ' + (i + 1) + ')');
    const indent = line.length - line.replace(/^ +/, '').length;
    out.push({ indent, text: line.slice(indent).replace(/\s+$/, ''), blank: false, n: i + 1 });
  }
  return out;
}

/** Junta un escalar de bloque (`>`, `|`) que empieza en `i` bajo `parentIndent`. */
function readBlockScalar(lines, i, parentIndent, style, chomp) {
  const body = [];
  let j = i;
  let base = null;
  for (; j < lines.length; j++) {
    const l = lines[j];
    if (l.blank) { body.push(''); continue; }
    if (l.indent <= parentIndent) break;
    if (base === null) base = l.indent;
    body.push(' '.repeat(Math.max(0, l.indent - base)) + l.text);
  }
  while (body.length && body[body.length - 1] === '') body.pop();
  let text;
  if (style === '|') {
    text = body.join('\n');
  } else {
    // Plegado: las líneas seguidas se unen con espacio; una línea en blanco es
    // un salto de párrafo; una línea más indentada se respeta tal cual.
    const parts = [];
    for (const l of body) {
      if (l === '') { parts.push('\n'); continue; }
      if (l.startsWith(' ') || parts.length === 0 || parts[parts.length - 1] === '\n') parts.push(l);
      else parts[parts.length - 1] += ' ' + l;
    }
    text = parts.join('\n').replace(/\n\n+/g, '\n\n');
  }
  if (chomp !== '-') text += '\n';
  return [text, j];
}

/** Parte una línea `clave: resto` (o devuelve null si no es un par). */
function splitKey(text) {
  let quote = null;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) { if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'") { quote = c; continue; }
    if (c === ':' && (i + 1 === text.length || /\s/.test(text[i + 1]))) {
      const key = text.slice(0, i).trim().replace(/^["'](.*)["']$/, '$1');
      return { key, rest: text.slice(i + 1).trim() };
    }
  }
  return null;
}

function parseBlock(lines, i, indent) {
  // ¿secuencia o mapa?
  while (i < lines.length && lines[i].blank) i++;
  if (i >= lines.length) return [null, i];
  if (lines[i].text === '-' || lines[i].text.startsWith('- ')) return parseSeq(lines, i, indent);
  return parseMap(lines, i, indent);
}

function parseSeq(lines, i, indent) {
  const arr = [];
  while (i < lines.length) {
    const l = lines[i];
    if (l.blank) { i++; continue; }
    if (l.indent < indent) break;
    if (l.indent > indent) throw new Error('yaml.mjs: indentación inesperada en la línea ' + l.n);
    if (!(l.text === '-' || l.text.startsWith('- '))) break;
    const rest = l.text === '-' ? '' : l.text.slice(2).trim();
    const childIndent = l.indent + 2;
    if (rest === '') {
      const [v, next] = parseBlock(lines, i + 1, childIndent);
      arr.push(v); i = next; continue;
    }
    const kv = splitKey(rest);
    if (!kv) { arr.push(parseScalar(rest)); i++; continue; }
    // Mapa que empieza en la misma línea del guion: se reinyecta como línea
    // virtual al nivel del primer campo y se sigue leyendo hacia abajo.
    const virtual = [{ indent: childIndent, text: rest, blank: false, n: l.n }, ...lines.slice(i + 1)];
    const [v, next] = parseMap(virtual, 0, childIndent);
    arr.push(v);
    i = i + next; // next cuenta la línea virtual, que corresponde a lines[i]
  }
  return [arr, i];
}

function parseMap(lines, i, indent) {
  const obj = {};
  while (i < lines.length) {
    const l = lines[i];
    if (l.blank) { i++; continue; }
    if (l.indent < indent) break;
    if (l.indent > indent) throw new Error('yaml.mjs: indentación inesperada en la línea ' + l.n + ': ' + l.text);
    if (l.text.startsWith('- ') || l.text === '-') break;
    const kv = splitKey(l.text);
    if (!kv) throw new Error('yaml.mjs: no entiendo la línea ' + l.n + ': ' + l.text);
    const m = BLOCK.exec(kv.rest);
    if (m) {
      const [text, next] = readBlockScalar(lines, i + 1, l.indent, m[1], m[2]);
      obj[kv.key] = text; i = next; continue;
    }
    if (kv.rest === '') {
      // Hijo: mapa o secuencia en las líneas siguientes con más indentación
      // (una secuencia puede ir al MISMO nivel que su clave, es válido).
      let j = i + 1;
      while (j < lines.length && lines[j].blank) j++;
      const child = lines[j];
      if (child && (child.indent > l.indent || (child.indent === l.indent && (child.text === '-' || child.text.startsWith('- '))))) {
        const [v, next] = parseBlock(lines, j, child.indent);
        obj[kv.key] = v; i = next; continue;
      }
      obj[kv.key] = null; i++; continue;
    }
    if (/^[[{]/.test(kv.rest)) throw new Error('yaml.mjs: estilo flow no soportado (línea ' + l.n + ')');
    obj[kv.key] = parseScalar(kv.rest);
    i++;
  }
  return [obj, i];
}

/** Lee un documento YAML del subconjunto soportado y devuelve el valor. */
export function parseYaml(src) {
  const lines = tokenize(String(src));
  let i = 0;
  while (i < lines.length && lines[i].blank) i++;
  if (i >= lines.length) return null;
  const [value] = parseBlock(lines, i, lines[i].indent);
  return value;
}

export default parseYaml;
