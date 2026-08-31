// EL CV DE JAIME VA EN PRIMERA PERSONA, Y ESTA PRUEBA LO SOSTIENE EN ESPAÑOL.
//
// Es SU CV: la voz es la suya, no la de alguien contando lo que hizo. La tabla
// inglesa lo cumplía entera; la española tenía SEIS cadenas hablando de él en
// tercera persona —«donó», «pasó», «entrevistó», «le pidió», «su curso», «sus
// primeras»— cuya gemela inglesa decía «I». Nadie las vio: en español el
// pretérito de «yo» y el de «él» solo se distinguen por el acento (doné/donó,
// entrevisté/entrevistó, pedí/pidió) y «mi curso» y «su curso» se escriben
// casi igual, así que la línea se lee natural y dice otra cosa.
//
// CÓMO SE EMPAREJAN LAS DOS TABLAS. No por posición: `lang` y `cifraSuya` van
// en orden distinto en cada una, así que la posición se desalinea. Se emparejan
// POR NOMBRE DE CLAVE, conservando el orden dentro de cada nombre — las tablas
// tienen las mismas 196 claves con el mismo número de cadenas cada una (lo
// comprueba la primera prueba), y los arreglos van en el mismo orden porque
// `es` está tipado `typeof en`.
//
// POR QUÉ HAY LISTA DE EXCEPCIONES Y POR QUÉ ES BUENA. La regla marca los
// verbos en tercera persona (`-ó`/`-ió`), y en español eso es correcto cuando
// el sujeto NO es Jaime: «el profesor que escribió esta carta», «lo escribió y
// lo firmó alguien más». Distinguir el sujeto con una expresión regular no se
// puede. Así que cada excepción va escrita aquí con su motivo: si una cadena
// nueva salta, el autor tiene que decidir a conciencia si arregla la voz o si
// de verdad está hablando de otra persona, que es justo la pausa que faltó.
// Añadir una excepción sin motivo escrito es saltarse la prueba a mano.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const CV = new URL('../../i18n/cv.ts', import.meta.url);

/** Quita comentarios sin tocar lo que va dentro de comillas simples. */
function sinComentarios(t) {
  const out = [];
  let i = 0;
  while (i < t.length) {
    if (t[i] === "'") {
      let j = i + 1;
      while (j < t.length) {
        if (t[j] === '\\') { j += 2; continue; }
        if (t[j] === "'") break;
        j++;
      }
      out.push(t.slice(i, j + 1));
      i = j + 1;
      continue;
    }
    if (t.startsWith('//', i)) { const j = t.indexOf('\n', i); i = j === -1 ? t.length : j; continue; }
    if (t.startsWith('/*', i)) { const j = t.indexOf('*/', i); i = j === -1 ? t.length : j + 2; continue; }
    out.push(t[i]);
    i++;
  }
  return out.join('');
}

/** `clave: 'valor'` → Map(clave → [valores, en orden de aparición]). */
function porClave(texto) {
  const m = new Map();
  for (const [, k, v] of texto.matchAll(/(\w+)\s*:\s*'((?:[^'\\]|\\.)*)'/g)) {
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(v);
  }
  return m;
}

const fuente = readFileSync(CV, 'utf8');
const corte = fuente.indexOf('const es: typeof en = {');
assert.ok(corte > 0, 'no se encontró el arranque de la tabla española');
const EN = porClave(sinComentarios(fuente.slice(0, corte)));
const ES = porClave(sinComentarios(fuente.slice(corte)));

/** Cada par (clave, cadena inglesa, cadena española) de las dos tablas. */
function* pares() {
  for (const [k, ings] of EN) {
    const esp = ES.get(k);
    if (!esp) continue;
    for (let i = 0; i < Math.min(ings.length, esp.length); i++) yield [k, ings[i], esp[i]];
  }
}

const PRIMERA_EN = /\b(I|my|me|myself)\b/;
// Una palabra que TERMINA en «ó» es el pretérito de «él/ella» (donó, entrevistó,
// pidió, escribió). Tiene que ir con `\p{L}` y bandera `u`: con `\b\w+ó\b` a
// secas, «ó» no cuenta como carácter de palabra en JavaScript y la expresión
// casaba dentro de «adopción», «publicación» y otras veinte — 19 falsos
// positivos. El `(?![\p{L}])` exige que la palabra se acabe ahí.
const TERCERA_ES = /[\p{L}]+ó(?![\p{L}])/u;
const MY_EN = /\bmy\b/;
const SU_ES = /\bsus?\b/;

// Verbos en tercera persona que son CORRECTOS porque el sujeto NO es Jaime.
// Se anotan como `clave|verbo`, no como clave a secas: `tipo` y `relacion`
// tienen varias cadenas cada una, y una de las seis que estaban mal era
// justamente un `tipo` («al que entrevistó en Singapur»). Exentar la clave
// entera habría dejado el agujero abierto; exentar el verbo exacto no.
const SUJETO_AJENO = new Map([
  ['cartaLloyd|escribió', 'el sujeto es Lloyd George: «el profesor que escribió esta carta»'],
  ['cartaAndy|escribió', 'el sujeto es Andy Toh: «el CEO que escribió esta carta»'],
  ['nota|escribió', 'el sujeto es el firmante: «lo escribió y lo firmó alguien más»'],
  ['toronto|reforzó', 'el sujeto es la visita: «esta visita reforzó algo…»'],
  ['playa|recordó', 'el sujeto es la experiencia: «una experiencia… que me recordó…»'],
  ['tipo|dejó', 'el sujeto es el Chief ETF Strategist: «lo que dejó…», título que publica el sitio'],
  ['relacion|observó', 'el sujeto es Andy Toh: «me observó durante mi programa»']
]);

// «su/sus» que son CORRECTOS porque lo poseído es de otra persona. Mismo
// formato `clave|fragmento`, por el mismo motivo.
const POSEE_OTRO = new Map([
  ['tipo|su mentoría', 'lo poseído es de Mauricio Mercenario, dentro de una cita de Jaime sobre él']
]);

test('las dos tablas del CV tienen las mismas claves y el mismo número de cadenas', () => {
  assert.deepEqual(
    [...EN.keys()].sort(),
    [...ES.keys()].sort(),
    'una tabla tiene claves que la otra no: los dos paneles dejarían de decir lo mismo'
  );
  for (const [k, ings] of EN) {
    assert.equal(
      ES.get(k).length, ings.length,
      `la clave «${k}» tiene ${ings.length} cadenas en inglés y ${ES.get(k).length} en español`
    );
  }
});

test('ninguna cadena española habla de Jaime en tercera persona cuando la inglesa dice «I»', () => {
  const fallos = [];
  for (const [k, ing, esp] of pares()) {
    if (!PRIMERA_EN.test(ing)) continue;
    const verbo = esp.match(TERCERA_ES);
    if (!verbo) continue;
    if (SUJETO_AJENO.has(`${k}|${verbo[0]}`)) continue;
    fallos.push(`[${k}] «${verbo[0]}»\n    EN: ${ing}\n    ES: ${esp}`);
  }
  assert.deepEqual(
    fallos, [],
    'la gemela inglesa va en primera persona y la española en tercera. Es SU CV: si el inglés dice «I», el español dice «yo». ' +
    'Si de verdad el sujeto es otra persona, añade la clave a SUJETO_AJENO con su motivo escrito.\n' + fallos.join('\n')
  );
});

test('ninguna cadena española dice «su» donde la inglesa dice «my»', () => {
  const fallos = [];
  for (const [k, ing, esp] of pares()) {
    if (!MY_EN.test(ing)) continue;
    if (!SU_ES.test(esp)) continue;
    if ([...POSEE_OTRO.keys()].some((e) => e.startsWith(k + '|') && esp.includes(e.slice(k.length + 1)))) continue;
    fallos.push(`[${k}]\n    EN: ${ing}\n    ES: ${esp}`);
  }
  assert.deepEqual(
    fallos, [],
    'el inglés dice «my» y el español «su». Si lo que posee es otra persona, añade la clave a POSEE_OTRO con su motivo.\n' + fallos.join('\n')
  );
});
