// Pruebas de la capa de datos del research: lector de YAML, punto de partida
// del laboratorio y generadores de SVG. Se corren con `npm test` (node --test).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { parseYaml, parseScalar } from './yaml.mjs';
import { labStart, toAssumptions, modelWith, encodeControls, decodeControls, LIMITS, onGrid, hasAuthorAssumptions, authorControls } from './lab.mjs';
import { niceScale, barChart, lineChart, groupedBarChart, footballField } from './charts.mjs';
import { runDCF, sanityChecks } from '../finance/dcf.mjs';

const DIR = new URL('../../../content/research/lululemon/', import.meta.url);
const model = JSON.parse(readFileSync(new URL('model.json', DIR), 'utf8'));

// --- YAML ------------------------------------------------------------------
test('parseScalar: nulos, booleanos, números y comillas', () => {
  assert.equal(parseScalar('null'), null);
  assert.equal(parseScalar('~'), null);
  assert.equal(parseScalar(''), null);
  assert.equal(parseScalar('true'), true);
  assert.equal(parseScalar('4.65'), 4.65);
  assert.equal(parseScalar('-3'), -3);
  assert.equal(parseScalar('"0001397187"'), '0001397187');
  assert.equal(parseScalar("'a b'"), 'a b');
  assert.equal(parseScalar('https://x.test/a  # comentario'), 'https://x.test/a');
  assert.equal(parseScalar('"tiene # dentro"'), 'tiene # dentro');
});

test('parseYaml: mapa, secuencia de mapas y escalar de bloque plegado', () => {
  const doc = parseYaml([
    '# comentario suelto',
    'ticker: LULU',
    'cik: "0001397187"',
    'analysisDate: null',
    'nota: >-',
    '  primera línea',
    '  segunda línea',
    '',
    '  otro párrafo',
    'lista:',
    '  - id: a',
    '    url: https://a.test',
    '  - id: b',
    '    url: null',
    'anidado:',
    '  x: 1',
    '  y:',
    '    z: 2'
  ].join('\n'));
  assert.equal(doc.ticker, 'LULU');
  assert.equal(doc.cik, '0001397187');
  assert.equal(doc.analysisDate, null);
  assert.equal(doc.nota, 'primera línea segunda línea\n\notro párrafo');
  assert.deepEqual(doc.lista, [{ id: 'a', url: 'https://a.test' }, { id: 'b', url: null }]);
  assert.deepEqual(doc.anidado, { x: 1, y: { z: 2 } });
});

test('parseYaml: los ficheros reales de LULU se leen enteros', () => {
  const meta = parseYaml(readFileSync(new URL('meta.yaml', DIR), 'utf8'));
  assert.equal(meta.ticker, 'LULU');
  assert.equal(meta.cik, '0001397187');
  assert.equal(meta.status, 'draft');
  assert.equal(meta.analysisDate, null);
  assert.match(meta.aiDisclosure, /Ningún supuesto ni texto de tesis de este reporte fue escrito por la IA\.$/);

  const src = parseYaml(readFileSync(new URL('sources.yaml', DIR), 'utf8'));
  assert.equal(src.sources.length, 20);
  const tenK = src.sources.find((s) => s.id === '10K-FY25');
  assert.equal(tenK.form, '10-K');
  assert.equal(tenK.accession, '0001397187-26-000020');
  assert.ok(tenK.url.startsWith('https://www.sec.gov/'));
  assert.equal(src.sources.filter((s) => s.url === null).length, 4); // los TODO de Jaime
});

test('parseYaml: avisa en vez de adivinar cuando ve algo que no soporta', () => {
  assert.throws(() => parseYaml('a: [1, 2]'), /flow/);
  assert.throws(() => parseYaml('---\na: 1'), /multidocumento/);
});

// --- Laboratorio de DCF ----------------------------------------------------
test('labStart: cada valor sale del último año fiscal reportado', () => {
  const { controls, derivation } = labStart(model);
  const h = model.historical;
  const last = h[h.length - 1], prev = h[h.length - 2];
  const r1 = (x) => Math.round(x * 10) / 10;
  assert.equal(controls.g1, r1(((last.revenue / prev.revenue) - 1) * 100));
  assert.equal(controls.g1, controls.g2);
  assert.equal(controls.m, r1((last.ebitda / last.revenue) * 100));
  assert.equal(controls.da, r1((last.da / last.revenue) * 100));
  assert.equal(controls.capex, r1((last.capex / last.revenue) * 100));
  assert.equal(controls.tax, r1((last.taxExpense / last.pretaxIncome) * 100));
  assert.equal(controls.nwc, 0);
  assert.equal(controls.g, 2);
  // WACC = rf + 1.00 x ERP, con rf y ERP verificados en model.json
  const w = model.dcf.assumptions.wacc;
  assert.equal(controls.w, r1(w.rf + 1 * w.erp));
  assert.equal(derivation.g1.fy, last.fy);
  assert.equal(derivation.w.code, 'wacc');
  assert.equal(derivation.g.code, 'convention');
});

test('labStart: todos los valores caen en la rejilla de su slider', () => {
  // Si no, el navegador redondea el value del <input type="range"> y el precio
  // que se ve al cargar no coincide con el que se calculó en el build.
  const { controls } = labStart(model);
  for (const [k, lim] of Object.entries(LIMITS)) {
    assert.ok(onGrid(controls[k], lim), `${k} = ${controls[k]} no cae en min ${lim.min} + k·${lim.step}`);
  }
});

test('el laboratorio NO inventa supuestos: o están TODOS escritos por Jaime, o no hay ninguno', () => {
  // OJO: la versión anterior de esta prueba exigía que `model.json` siguiera
  // VACÍO. Eso convertía el CI en un candado contra su propio autor: el día que
  // Jaime escribiera su tesis, la prueba se caía y el build con ella. La regla
  // que de verdad importa no es "no hay supuestos" sino "ningún supuesto
  // aparece sin que Jaime lo haya escrito", y eso se comprueba con un
  // invariante CONDICIONAL: los tres campos van juntos o no van.
  const g = model.dcf.assumptions.revenueGrowthPct;
  const m = model.dcf.assumptions.ebitdaMarginPct;
  const w = model.dcf.assumptions.wacc.wacc;
  const razones = Object.values(model.dcf.rationale).map(String);
  const plantilla = (v) => /ESCRIBE AQUÍ POR QUÉ \(Jaime\)/.test(v);

  const hayCifras = g.some((v) => v !== null) || m.some((v) => v !== null) || w !== null;
  const hayRazones = razones.some((v) => v && !plantilla(v));

  if (!hayCifras) {
    // Estado inicial: nada escrito. Entonces NADA puede estar a medias.
    assert.equal(hasAuthorAssumptions(model), false);
    assert.equal(authorControls(model), null);
    for (const v of g) assert.equal(v, null);
    for (const v of m) assert.equal(v, null);
    assert.equal(w, null);
    for (const v of razones) assert.ok(plantilla(v), 'hay una razón escrita sin sus cifras');
    return;
  }

  // Jaime empezó a escribir: entonces el modelo tiene que estar COMPLETO.
  // Un DCF a medias publica un precio objetivo que nadie sostuvo.
  for (const v of g) assert.notEqual(v, null, 'falta un año de crecimiento');
  for (const v of m) assert.notEqual(v, null, 'falta un año de margen');
  assert.notEqual(w, null, 'falta el WACC');
  assert.ok(hayRazones, 'hay cifras sin una sola razón escrita');
  for (const v of razones) {
    assert.ok(!plantilla(v), 'quedó una razón con el texto de plantilla');
    assert.ok(v.trim().length > 0, 'quedó una razón vacía');
  }
  assert.equal(hasAuthorAssumptions(model), true);
  assert.notEqual(authorControls(model), null);
});

test('toAssumptions: fase 1 son los años 1–2 y fase 2 los años 3–5', () => {
  const a = toAssumptions({ g1: 6, g2: 3, m: 24, w: 9, g: 2, da: 4, capex: 6, nwc: 0, tax: 25, t: 'gordon', x: 12 }, model);
  assert.deepEqual(a.revenueGrowthPct, [6, 6, 3, 3, 3]);
  assert.deepEqual(a.ebitdaMarginPct, [24, 24, 24, 24, 24]);
  assert.equal(a.wacc.wacc, 9);
  assert.equal(a.wacc.rf, model.dcf.assumptions.wacc.rf); // rf y ERP con fuente se conservan
  assert.equal(a.terminal.type, 'gordon');
});

test('modelWith + runDCF: el arranque da un DCF que corre y es coherente', () => {
  const { controls } = labStart(model);
  const res = runDCF(modelWith(model, controls));
  assert.ok(res.impliedPrice > 0);
  assert.ok(res.tvShareOfEVPct > 50 && res.tvShareOfEVPct < 80);
  // Sin deuda financiera, el equity tiene que ser mayor que el EV (caja neta).
  assert.ok(res.equity > res.ev);
  assert.equal(res.shares, model.historical[model.historical.length - 1].dilutedShares);
  // Más WACC, menos precio; más crecimiento, más precio.
  const caro = runDCF(modelWith(model, { ...controls, w: controls.w + 2 }));
  assert.ok(caro.impliedPrice < res.impliedPrice);
  const crece = runDCF(modelWith(model, { ...controls, g1: controls.g1 + 5, g2: controls.g2 + 5 }));
  assert.ok(crece.impliedPrice > res.impliedPrice);
});

test('modelWith: la caja y la deuda salen del cierre fiscal verificado', () => {
  const { controls } = labStart(model);
  const live = modelWith(model, controls);
  const last = model.historical[model.historical.length - 1];
  assert.equal(live.dcf.netDebtAtValuation.cash, last.cash);
  assert.equal(live.dcf.netDebtAtValuation.financialDebt, last.financialDebt);
  assert.equal(live.dcf.netDebtAtValuation.leasesIncluded, false);
});

test('sanityChecks con el arranque: solo avisa de lo que falta escribir', () => {
  // Se vacían las razones a propósito: la prueba comprueba QUÉ avisa el
  // arranque cuando falta texto por escribir, no en qué punto va la tesis de
  // Jaime. Con el fichero tal cual, esta prueba se caía el día que él
  // escribiera sus porqués — un candado del CI contra su propio autor.
  const vacio = structuredClone(model);
  for (const k of Object.keys(vacio.dcf.rationale)) vacio.dcf.rationale[k] = 'ESCRIBE AQUÍ POR QUÉ (Jaime)';
  const { controls } = labStart(vacio);
  const live = modelWith(vacio, controls);
  const codes = sanityChecks(live, runDCF(live)).map((a) => a.code).sort();
  assert.deepEqual(codes, ['RATIONALE_PENDING', 'SCENARIO_PROB_MISSING']);
});

test('enlace con mis supuestos: ida y vuelta, y los valores fuera de rango se recortan', () => {
  const { controls } = labStart(model);
  assert.equal(encodeControls(controls, controls), ''); // sin cambios, sin parámetros
  const mios = { ...controls, w: 11.2, g: 1.5, t: 'exit-multiple', x: 14 };
  const qs = encodeControls(mios, controls);
  assert.ok(qs.includes('w=11.2') && qs.includes('g=1.5') && qs.includes('t=exit-multiple'));
  assert.ok(!qs.includes('da='), 'no debería viajar lo que no cambió');
  const vuelta = decodeControls('?' + qs, controls);
  assert.equal(vuelta.w, 11.2);
  assert.equal(vuelta.g, 1.5);
  assert.equal(vuelta.t, 'exit-multiple');
  assert.equal(vuelta.da, controls.da);
  // Basura y valores imposibles no rompen nada
  const sucio = decodeControls('?w=999&g=abc&t=magia', controls);
  assert.equal(sucio.w, LIMITS.w.max);
  assert.equal(sucio.g, controls.g);
  assert.equal(sucio.t, controls.t);
});

// --- Gráficas --------------------------------------------------------------
test('niceScale: pasos redondos que contienen los datos', () => {
  const s = niceScale(0, 11102.6);
  assert.ok(s.min <= 0 && s.max >= 11102.6);
  assert.ok(s.ticks.length >= 3);
  const paso = s.ticks[1] - s.ticks[0];
  for (let i = 2; i < s.ticks.length; i++) {
    assert.ok(Math.abs((s.ticks[i] - s.ticks[i - 1]) - paso) < 1e-6);
  }
});

test('las gráficas devuelven SVG accesible y con todos los años', () => {
  const labels = ['FY19', 'FY20', 'FY21'];
  const bar = barChart({ labels, values: [1, 2, 3], ariaLabel: 'ingresos' });
  assert.ok(bar.startsWith('<svg'));
  assert.ok(bar.includes('role="img"') && bar.includes('aria-label="ingresos"'));
  assert.equal((bar.match(/<rect/g) || []).length, 3);
  for (const l of labels) assert.ok(bar.includes('>' + l + '<'));

  const line = lineChart({ labels, series: [{ name: 'm', values: [10, 20, 30], color: 'var(--s1)' }], ariaLabel: 'márgenes' });
  assert.ok(line.includes('<path class="fc-line trazo-linea" pathLength="1"'));
  assert.equal((line.match(/<circle/g) || []).length, 3);
  // El trazado se apoya en `pathLength="1"` para no medir la línea con
  // JavaScript, y en `--i` para que las barras entren de izquierda a derecha.
  assert.ok(bar.includes('--i:0') && bar.includes('--i:2'));
  assert.ok(bar.includes('data-fc') && line.includes('data-fc'));

  const grouped = groupedBarChart({
    labels,
    series: [{ name: 'a', values: [1, 2, 3], color: 'var(--s1)' }, { name: 'b', values: [0, 0, 0], color: 'var(--s5)' }],
    ariaLabel: 'balance'
  });
  assert.equal((grouped.match(/<rect/g) || []).length, 6); // las barras en cero también se dibujan
});

test('footballField: filas sin datos salen como "pendiente" y la marca de precio se dibuja', () => {
  const svg = footballField({
    rows: [
      { label: 'lab', low: 180, high: 240, mid: 210, color: 'var(--s1)' },
      { label: 'bear', low: NaN, high: NaN, empty: 'pendiente' }
    ],
    mark: { value: 300, label: 'Mercado' },
    fmt: (v) => '$' + Math.round(v)
  });
  assert.ok(svg.includes('fc-ff-bar'));
  assert.ok(svg.includes('>pendiente<'));
  assert.ok(svg.includes('fc-ff-mark'));
  assert.ok(svg.includes('>Mercado<'));
  // La marca cae dentro del lienzo aunque quede fuera del rango de las barras.
  assert.ok(!/x1="-/.test(svg));
});

test('footballField: sin ninguna fila con datos no dibuja nada', () => {
  assert.equal(footballField({ rows: [{ label: 'a', low: NaN, high: NaN }] }), '');
});

// --- El nombre de la sección ------------------------------------------------
// La sección se renombró a "Smart Finance Projects" y el `isPartOf` de cada
// reporte se quedó diciendo "Smart Finance Research": dos nombres para el
// MISMO URL en el JSON-LD del sitio. Esto lo vigila leyendo los ficheros como
// texto porque son TypeScript y `node --test` no los importa.
test('el hub y el isPartOf de los reportes le dan UN solo nombre a /research', () => {
  const lee = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
  const nombre = (txt) => (txt.match(/'@type': 'CollectionPage',\s*\n?\s*name: '([^']+)'/) || [])[1];
  const hubEn = nombre(lee('../../pages/research.astro'));
  const hubEs = nombre(lee('../../pages/es/research.astro'));
  const reporte = (lee('./jsonld.ts').match(/'@type': 'CollectionPage', name: '([^']+)'/) || [])[1];
  assert.equal(hubEn, 'Smart Finance Projects');
  assert.equal(hubEs, hubEn); // es un nombre propio: no se traduce
  assert.equal(reporte, hubEn);
});
