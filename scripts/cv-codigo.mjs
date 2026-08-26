#!/usr/bin/env node
// `npm run cv:codigo` — saca un código bueno para el CV y dice dónde ponerlo.
//
// POR QUÉ EXISTE ESTE COMANDO
// ═══════════════════════════════════════════════════════════════════════════
// src/lib/cv/slug.mjs exige 20 caracteres sin palabras adivinables, y una regla
// que estorba se acaba esquivando: quien tenga que inventarse veinte
// caracteres escribe `jaime-sandoval-curriculum-2026`, que mide 30, pasa el
// largo y se adivina al segundo intento. Así que la regla viene con la forma
// cómoda de cumplirla al lado. Un código no se inventa, se sortea.
//
// El sorteo es `crypto.randomBytes` con RECHAZO, no `% 36`: 256 no es múltiplo
// de 36, así que el resto a secas daría a los ocho primeros caracteres del
// alfabeto un 2.8 % más de probabilidad que a los demás. Se tiran los bytes de
// 252 para arriba (252 = 36 × 7) y con eso cada carácter sale con exactamente
// la misma probabilidad. Es la diferencia entre 103.4 bits de verdad y 103.4
// bits en el papel.
//
// Vive en /scripts, que .vercelignore excluye del despliegue: esto no corre en
// ningún build, ni de Vercel ni del CI. Lo corre Jaime, en su máquina, una vez.
import { randomBytes } from 'node:crypto';
import { slugCv, MINIMO } from '../src/lib/cv/slug.mjs';

const ALFABETO = 'abcdefghijklmnopqrstuvwxyz0123456789'; // 36
const LIMITE = 252; // 36 × 7: el mayor múltiplo de 36 que cabe en un byte

function sortear(largo) {
  let s = '';
  while (s.length < largo) {
    for (const b of randomBytes(largo * 2)) {
      if (b >= LIMITE) continue; // rechazo: sin esto el sorteo estaría sesgado
      s += ALFABETO[b % 36];
      if (s.length === largo) break;
    }
  }
  return s;
}

// Se vuelve a pasar por la MISMA función que usa el build. Dos motivos: que el
// comando no pueda dar nunca un valor que luego tumbe el despliegue, y que si
// alguien endurece las reglas de slug.mjs, esto se entere solo. El bucle es por
// los falsos positivos de la lista de palabras, que existen y son rarísimos
// (del orden de 1 entre un millón): un slug sorteado puede contener 'vista' por
// casualidad, y entonces se sortea otro.
let codigo = '';
for (let intento = 0; intento < 50 && !codigo; intento++) {
  const candidato = sortear(MINIMO);
  try {
    codigo = slugCv(candidato);
  } catch {
    /* le tocó una palabra de la lista: otro. */
  }
}
if (!codigo) {
  console.error('[cv:codigo] 50 intentos sin sacar un codigo valido. Eso no puede pasar por azar: mira si alguien endurecio las reglas de src/lib/cv/slug.mjs.');
  process.exit(1);
}

const nl = '\n';
process.stdout.write(
  nl +
  '  ' + codigo + nl + nl +
  '  ' + MINIMO + ' caracteres sorteados con crypto (103.4 bits). La cuenta de por que hacen' + nl +
  '  falta 20 esta en la cabecera de src/lib/cv/slug.mjs.' + nl + nl +
  '  QUE HACER CON EL, EN ESTE ORDEN:' + nl + nl +
  '  1. Vercel > el proyecto > Settings > Environment Variables > Add New.' + nl +
  '     Nombre: CV_SLUG   ·   Valor: el de arriba' + nl +
  '     MARCA Production Y Preview. Las variables de Vercel son por entorno: solo' + nl +
  '     en Production, cada despliegue de preview se queda sin CV (que es el fallo' + nl +
  '     seguro, pero no vas a poder revisarlo antes de publicar).' + nl +
  '  2. Vuelve a desplegar. Sin redesplegar, la variable no entra: el sitio es' + nl +
  '     estatico y la direccion se decide EN EL BUILD.' + nl +
  '  3. En tu maquina, en .env.local (que .gitignore ya excluye):' + nl +
  '       CV_SLUG=' + codigo + nl +
  '  4. Comprueba que existe: abre https://smartfinance.lat/cv/' + codigo + nl + nl +
  '  DOS AVISOS:' + nl +
  '  · NO lo commitees, no lo pegues en un issue, en un PR ni en una captura.' + nl +
  '    Este repositorio es publico. La direccion ES la credencial.' + nl +
  '  · Con CV_SLUG en .env.local, cada build local emite tu direccion y ya no' + nl +
  '    emite /cv/vista-previa, que es lo que mide Lighthouse. Para eso:' + nl +
  '      CV_SLUG= npm run build && npm run check-lh' + nl + nl
);
