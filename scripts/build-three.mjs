#!/usr/bin/env node
// Empaqueta three.js con SOLO lo que usa el globo y lo deja en
// public/assets/three-sf.js como script clásico que define window.THREE
// (risk-sphere.js lo lee como global; así este cambio no toca el globo).
//
// Uso: node scripts/build-three.mjs
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
