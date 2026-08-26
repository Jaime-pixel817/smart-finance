#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// SPIKE spike/three-propio — three.js propio en vez de three.min.js r128 del CDN
// ═══════════════════════════════════════════════════════════════════════════
//
// Empaqueta three.js con SOLO las 21 clases que usa el globo y lo deja en
// public/assets/three-sf.js como script clásico que define window.THREE
// (risk-sphere.js lo lee como global; así este cambio NO toca el globo).
//
// ─── EL PRESUPUESTO, MEDIDO EN ESTE MAC CON lighthouserc.json ──────────────
// Mismo Mac, mismas 3 corridas, mediana, dist/ servido por lhci. La única
// diferencia entre las dos columnas es de dónde sale three.js:
//
//                                CDN r128     propio 0.150.1
//   three (transferido)           121 565         103 571
//   risk-sphere.js                 36 730          36 730
//   HOME script total             189 328         171 307   (−18 021)
//   tope de lighthouserc.json     187 392         187 392
//   margen                         −1 936         +16 085
//   CLS                             0.000           0.000
//   LCP                              2 724           2 731
//   a11y                              1.00            1.00
//   TBT                              82 ms           38 ms
//
// El 189 328 de aquí reproduce el 189 308 del runner de CI (20 B de ruido),
// así que el −18 021 es trasladable. En PRODUCCIÓN el ahorro es mayor: Vercel
// sirve brotli de verdad, 84 654 contra 120 830, o sea −36 176 B (−30 %).
// Y se cae una conexión a un tercero (cdnjs): un origen menos que resolver,
// negociar TLS y en el que confiar. La caché compartida entre sitios que
// justificaba un CDN público lleva años muerta (particionado por origen).
//
// LO QUE NO ARREGLA: el globo sigue siendo el 82 % del JavaScript del home
// (140 301 de 171 307). Esto lo hace más barato, no barato.
//
// Uso: node scripts/build-three.mjs   (o npm run build:three)
//
// ─── LO QUE PESA, MEDIDO (no citado) ───────────────────────────────────────
// El CDN se descargó y se midió aquí mismo. cdnjs sirve BROTLI: 120 830 B de
// cuerpo (content-length 120 859), que es de dónde salen los 121 558 que
// cuenta Lighthouse (cuerpo + ~700 B de cabeceras).
//
//                              crudo     gzip-6   brotli-11
//   three.min.js r128 (cdnjs)  603 445   149 992    120 830
//   npm three@0.150.1 (21 cl.)  418 103   103 837     84 654   ← este bundle
//   npm three@0.185.1 (21 cl.)  517 214   126 599    102 560
//
// OJO CON QUÉ COMPRESIÓN CUENTA CADA COSA. lhci sirve dist/ con express +
// `compression`, o sea gzip-6/brotli-4, NO el brotli-11 de Cloudflare. Así
// que en CI el bundle propio se pesa por su gzip y el del CDN por su brotli:
// con three@0.185 el presupuesto EMPEORA (126 599 > 121 558) aunque en
// producción (Vercel, brotli) mejore. Con three@0.150 gana en los dos sitios.
//
// ─── POR QUÉ 0.150.1 Y NO LA ÚLTIMA ────────────────────────────────────────
// three ha ENGORDADO desde 2022: el mínimo tree-shakeable está en r145-r150 y
// desde ahí sube monótono (0.145 → 83 277 B brotli; 0.150 → 84 654;
// 0.160 → 91 751; 0.170 → 94 007; 0.185 → 102 560). r128 desde npm sale en
// 99 938: o sea que buena parte del ahorro es SUBIR de versión, no solo
// quitar clases. Tree-shaking solo no da casi nada porque WebGLRenderer
// arrastra el backend entero: él solo son 505 798 B crudos de los 517 214 del
// bundle de 0.185 — las otras veinte clases juntas son 140 084.
//
// Y hay un motivo que no es de bytes: r167 QUITÓ BufferAttribute.updateRange
// (lo sustituye updateRanges[] + addUpdateRange()). risk-sphere.js lo escribe
// en tres sitios (líneas ~2039, ~2051 y ~2179). Con three@0.185:
//   · prefers-reduced-motion revienta en el arranque (TypeError: Cannot set
//     properties of undefined (setting 'offset')) → globe:fail → el globo se
//     cambia por el SVG estático y se pierden los ocho marcadores;
//   · y en cuanto un dedo acaricia el globo (o el ratón lo sobrevuela en
//     escritorio) se lanza el MISMO error una vez por frame — 343 en 3 s — y
//     el globo SE CONGELA sin dejar de parecer correcto (0 píxeles de cambio
//     en 3 s, medido). Es el peor tipo de fallo: no se ve roto.
// 0.150.1 todavía tiene updateRange y se comporta igual que r128 en las
// cuatro pruebas (reduce, sin WebGL, script que no llega, dedo).
//
// ─── TECHO SI ALGÚN DÍA HACE FALTA MÁS ─────────────────────────────────────
// El globo solo usa ShaderMaterial (ni un material integrado, ni un #include
// en sus shaders). Sustituyendo ShaderLib y ShaderChunk por objetos vacíos,
// three@0.185 baja a 358 415 crudos / 99 001 gzip-6 / 80 547 brotli-11. Son
// ~22 KB brotli más, pero es parchear las tripas de la librería: no se hace
// en un spike.
import { rollup } from 'rollup';
import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import { gzipSync, brotliCompressSync, constants } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const version = JSON.parse(readFileSync(path.join(raiz, 'node_modules/three/package.json'), 'utf8')).version;
const salida = path.join(raiz, 'public/assets/three-sf.js');

const bundle = await rollup({
  input: path.join(raiz, 'scripts/three/entry.js'),
  plugins: [resolve(), terser({ format: { comments: false } })],
  treeshake: { moduleSideEffects: false, propertyReadSideEffects: false },
  onwarn(aviso, avisar) { if (aviso.code !== 'CIRCULAR_DEPENDENCY') avisar(aviso); },
});
await bundle.write({
  file: salida,
  format: 'iife',
  name: 'THREE',
  extend: true,
  banner: `/* three.js r${version.split('.')[1]} (npm three@${version}) — solo las clases del globo. Lo genera scripts/build-three.mjs */`,
});
await bundle.close();

const b = readFileSync(salida);
const br = (q) => brotliCompressSync(b, { params: { [constants.BROTLI_PARAM_QUALITY]: q } }).length;
console.log(`[three] three@${version} → public/assets/three-sf.js`);
console.log(`[three] crudo ${b.length}  gzip6 ${gzipSync(b, { level: 6 }).length}  brotli4 ${br(4)}  brotli11 ${br(11)}`);
