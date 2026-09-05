// scripts/check-sistema-cv.mjs — EL GUARDIÁN DEL SISTEMA DE APPLE.
//
// ═══════════════════════════════════════════════════════════════════════════
// POR QUÉ EXISTE
// ═══════════════════════════════════════════════════════════════════════════
// El 2026-09-04 Jaime dijo, textual: «Toda la estructura de la página está mal.
// Hay un montón de espacios blancos… no tiene sintonía, no tiene armonía, no
// tiene estructura… los recuadros negros todos deberían de tener el mismo
// tamaño». La auditoría del mismo día puso números a esa frase, medidos sobre
// lo publicado, en WebKit y en Chromium:
//
//   · 24 126 px de documento = 26.8 pantallas
//   · 52 % de las filas de la prosa SIN TINTA
//   · 8 756 px vacíos de lado a lado, repartidos en diez huecos de 433 a 1 426
//   · 15 tamaños de texto en el cuerpo
//   · 12 tarjetas oscuras con 10 alturas distintas (329 a 567)
//   · 29 de 39 imágenes a 154 px de ancho; Toronto al 0.32× de su natural
//   · 227 bloques de nota = 2 137 palabras = el 50.6 % del cuerpo
//   · rótulos repetidos: «TO WRITE» ×17, «In the chapter ↓» ×14, «Proven…» ×8
//
// El problema de fondo NO es que alguien maquetara mal un capítulo: es que no
// había ninguna regla que dijera cuándo un capítulo está mal. Cada vez que se
// añade material, el documento se vuelve a descomponer por el mismo sitio.
// Jaime lo dijo con todas las letras: «que se analice cada elemento, ya que
// constantemente iré añadiendo cosas».
//
// Este archivo ES esa regla. Construye el CV, lo recorre en los DOS motores y
// en los DOS anchos de escritorio, y falla nombrando qué elemento y qué valor
// se salió del sistema. No opina: mide.
//
// El sistema que vigila está escrito y medido en
//   cv-material/ola5/SISTEMA-REFERENCIA.md   (Apple Newsroom / Apple Stories)
// y declarado en CSS en
//   src/styles/cv.css   (bloque «EL SISTEMA», tokens --sf-*)
//
// ═══════════════════════════════════════════════════════════════════════════
// LAS NUEVE PRUEBAS (§5 del documento de referencia; la 9 la añadió el
// arreglo del 2026-09-04 — ver abajo)
// ═══════════════════════════════════════════════════════════════════════════
//  1 TAMAÑOS   todo texto del cuerpo mide uno de los OCHO: 56 40 24 21 19 17 14 12
//  2 TARJETAS  toda tarjeta oscura mide 482 × 288. Una sola talla, como pidió él.
//  3 FOTOS     todo img/video/canvas del cuerpo tiene un ancho del sistema y
//              NINGUNA baja de 308 px (el piso absoluto; Apple no baja de 480)
//  4 PASOS     el aire entre bloques es 16 · 44 · 72 · 80; dentro, 8 · 20
//  5 HUECOS    ninguna franja de más de 160 px sin un píxel de tinta, medida
//              en PÍXELES PINTADOS (capturas encadenadas), no en cajas
//  6 DESBORDE  scrollWidth === innerWidth en los dos motores y los dos anchos
//  7 NOTAS     ≤ 59 notas y ≤ el tope de huecos «TO WRITE» declarado abajo
//  8 REPES     ningún rótulo repetido 8 veces o más (un rótulo que sale 8
//              veces no informa de nada), y ningún bloque que se quede en
//              opacity: 0 después de recorrer la página — que es el fallo que
//              la Mac de Jaime (Safari 16.6, sin `animation-timeline`) VE y
//              que ninguna captura de Chrome enseña.
//  9 PORTADA   la tapa llega a su ÚLTIMO fotograma en los dos idiomas y en
//              los dos motores, moviendo la rueda una sola vez.
//
// ── POR QUÉ LA 9 EXISTE, Y POR QUÉ LA 8b NO BASTABA ────────────────────────
// La 8b busca bloques que se quedan en `opacity: 0`. El fallo del 2026-09-04
// era exactamente el contrario: la TAPA se quedaba ENCENDIDA. En el CV en
// español, en WebKit, `--intro-p` no se movía de 0 —el conductor buscaba la
// pista una sola vez y siempre en el panel inglés—, así que la foto se
// quedaba a sangre, la tarjeta no llegaba a formarse, la tapa no se iba, y
// encima quedaban 306 px (1440) y 367 px (1920) de recorrido reservado en los
// que no pasaba nada. Ninguna prueba de este archivo lo vio, y la tabla de
// recibos del paso que lo introdujo tenía cuatro filas: las cuatro en inglés.
// De ahí la regla nueva, que se enuncia en la lengua de Jaime: la portada
// TIENE que acabar de pasar, en su idioma y en su navegador.
//
// ═══════════════════════════════════════════════════════════════════════════
// LOS TOPES, Y POR QUÉ NO SON CERO HOY
// ═══════════════════════════════════════════════════════════════════════════
// El sistema entra por fases: primero las reglas (esta ola), después los
// capítulos (la siguiente). Si el guardián exigiera cero desde el primer día
// solo se podría hacer una cosa con él: apagarlo. Así que cada prueba lleva un
// TOPE declarado aquí arriba, con el número medido el día que se escribió, y
// falla cuando lo SUPERA. La deuda no puede crecer, y cada ola baja los topes
// a mano hasta que todos sean 0 — llegar a 0 es el criterio de «terminado».
//
// Un tope no es un permiso: es el número que Jaime lee para saber cuánto
// queda. Se imprime siempre, se pase o se falle.
//
// ═══════════════════════════════════════════════════════════════════════════
// CÓMO SE CORRE
// ═══════════════════════════════════════════════════════════════════════════
//   CV_SLUG= npm run build && npm run check-sistema-cv
//
// Necesita Playwright suelto con los dos motores, igual que check-reflow y
// check-contraste-cv (y por lo mismo: no entra en el CI de Vercel):
//   npm i --no-save playwright && npx playwright install chromium webkit
// Si falta, LO DICE y sale con 1 en vez de fingir que midió.
//
// Banderas:
//   --dist=dist         la carpeta construida
//   --motores=chromium,webkit
//   --anchos=1440,1920
//   --idiomas=en,es
//   --json=RUTA         vuelca todas las infracciones a un JSON
//   --lista=N           cuántas infracciones se imprimen por prueba (20)
//   --sin-topes         imprime y NO falla (para medir una línea base nueva)

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import zlib from 'node:zlib';

// ═══════════════════════════════════════════════════════════════════════════
// EL SISTEMA, EN NÚMEROS. Todos salen de SISTEMA-REFERENCIA.md; ninguno se
// inventa aquí. Si uno cambia, cambia en el documento primero.
// ═══════════════════════════════════════════════════════════════════════════
const TAMANOS = [56, 40, 24, 21, 19, 17, 14, 12];          // §3.1
const PASOS_ENTRE = [16, 44, 72, 80];                       // §3.1 aire
const PASOS_DENTRO = [0, 8, 16, 20];                        // §3.1 aire interior
const TARJETA = { w: 482, h: 288 };                         // §3.4 (iv)
const ANCHOS_FOTO = [1920, 1440, 1280, 980, 782, 653, 482, 316, 308, 171]; // §4
const PISO_FOTO = 308;                                      // §4, piso absoluto
const HUECO_MAX = 160;                                      // §5.5
const NOTAS_MAX = 59;                                       // §3.4 (x): 227 → 59
const TOL = 1;                                              // ±1 px

// ── LOS TOPES ─────────────────────────────────────────────────────────────
//    Medidos el 2026-09-04 sobre `origin/main` (4f7696b) con este mismo
//    guardián y `--sin-topes`, en los 8 combos (2 motores × 2 anchos × 2
//    idiomas). La cuenta que manda es la del PEOR combo, nunca la suma: medir
//    dos idiomas no puede duplicar la deuda de un mismo defecto.
//    Bajan; no suben. Cada ola los baja a mano.
//
//    UNA HONESTIDAD SOBRE LOS HUECOS. La auditoría publicó 8 756 px en diez
//    franjas contando también el ancho vacío (el 36 % del marco de lado a
//    lado); aquí se mide solo el ALTO sin tinta dentro de la columna útil, y
//    desde el 2026-09-04 en PÍXELES PINTADOS (ver «EL BARRIDO»), que es la
//    misma vara con la que se sacó aquel 52 % de filas sin tinta. Los números
//    de las dos ya son comparables: hoy son 34.9 % (chromium 1440 EN) y
//    34.7 % (webkit), y las franjas de más de 160 px son DOS a 1440 en
//    inglés — 178 px y 305 px — contra los diez huecos de hasta 1 426 px que
//    midió la auditoría sobre lo publicado.
// ── LOS TOPES SE BAJARON AL CERRAR LA OLA 5 · PASO 1 (2026-09-04) ──────────
// Un tope que se queda arriba después de que la ola lo haya batido no vigila
// nada: deja sitio para devolver en silencio lo que se acaba de ganar. Los
// cinco que este paso bajó, con el número de antes al lado:
//   tamanos  7 → 1     (los tokens de la escala: 44·38·28·20·16·13·11 fuera)
//   pasos  213 → 132   (los cuatro pasos 16·44·72·80 en `--cv-v1…v4`)
//   huecos  13 → 5     (la rejilla del capítulo 2 y el aire del sistema)
//   huecoPx 3036 → 1200
//   apagados  — → 0    (ya era 0; ahora además hay una prueba que lo cazó)
// Los que NO bajaron son la deuda declarada de la ola siguiente, que es la de
// los CAPÍTULOS: las 12 tarjetas oscuras, las 42 fotos fuera de medida, las 39
// por debajo del piso, las 50 notas, los 24 huecos y los 9 rótulos repetidos.
// ── LOS TOPES QUE BAJÓ EL PASO DEL MICRÓFONO (2026-09-04) ─────────────────
// Tres, y los tres los bajó el mismo cambio: el índice de texto de catorce
// fichas del módulo del micrófono se convirtió en el carrusel de diez tarjetas
// negras de 482 × 288 que Jaime pidió.
//   fotos  42 → 41   el lienzo pasa de 353 a 782, que SÍ es un ancho del
//                    sistema (§4). Es la primera imagen del CV que lo cumple.
//   pasos 132 → 91   las catorce fichas del índice llevaban `gap: 2px` con
//                    cuatro hijos cada una: 42 distancias que no eran un paso,
//                    en un solo bloque. Hoy el módulo entero solo usa
//                    16 · 44 entre bloques y 8 · 16 dentro.
//   repes   9 → 7    se fueron «In the chapter ↓» ×14 (uno por ficha) y
//                    «TikTok» ×11 (la fuente repetida en cada renglón del
//                    índice; la tarjeta la dice UNA vez y ya no llega a ocho).
// `huecoPx` NO baja y se queda en 1 000 sobre 924 medidos: es la única cuenta
// que se mueve entre corridas, y el margen relativo se conserva.
// ── LA CORRECCIÓN DEL 2026-09-04: DOS TOPES SE HABÍAN BAJADO SIN ARREGLAR
//    NADA, Y LA VARA DE LOS HUECOS CAMBIÓ ────────────────────────────────────
// La revisión del paso de Safari lo cazó y tenía razón: `huecos` 5 → 4 y
// `huecoPx` 1 120 → 920 no salieron de quitar ni un píxel blanco, sino de
// pintar un fondo del MISMO color del papel sobre 172/200 px que el lienzo
// clavado ya tapaba. El comentario del CSS lo decía con todas las letras («no
// cambia ni un píxel de lo que se ve»). Un tope que se baja así queda bajado
// para siempre, y Jaime lo lee como progreso.
// La respuesta NO ha sido devolver los topes a su sitio y seguir con la misma
// vara —eso deja la puerta abierta al siguiente fondo del color del papel—,
// sino cambiar la vara: la prueba 5 mide ahora PÍXELES PINTADOS. Un fondo
// blanco sobre papel blanco no aporta ninguno, y de paso desaparecen los
// huecos que la vara de cajas se INVENTABA bajo los elementos `sticky`.
// El fondo de `.intro-pista` se quitó, por inútil.
// Números con la vara nueva, en los 8 combos (peor combo):
//   huecos  4 → 3      (178 px · 305 px · 182 px; las dos primeras salen en
//                       los 8 combos, la tercera desde el 55 % del documento)
//   huecoPx 1 000 → 700 sobre 665 medidos
// No es que la página haya mejorado entre ayer y hoy: es que ayer el número
// estaba mal. Los dos que la vara de cajas fabricaba —«216 px desde y=900» y
// «236 px desde y=2472»— no existen en pantalla, y el barrido de capturas lo
// enseña en los dos motores.
// ── LOS TOPES QUE BAJÓ LA OLA 6 · PASO A (2026-09-05): LA ENTRADA DEL DOCUMENTO
// La tapa (3ª pantalla), el micrófono, el capítulo del grupo y el de las
// conversaciones se reconstruyeron SOLO con las plantillas de §3.4, y las
// fotos entraron por CURADURIA-FOTOS.md. Medido con `--sin-topes` en los 8
// combos sobre el build de esta rama; el número de antes, al lado:
//   tarjetas   12 → 0     las 12 tarjetas del capítulo 3 miden 482 × 288: UNA talla
//   fotos      41 → 27    retrato 653 · Toronto+Torre 482 · grupo 980 · entrevista 653 ·
//                         4 losas 482 · Moris+Marg 482 · Canadá 308; 14 fotos de 154 fuera
//   pisos      39 → 25    ninguna foto de los capítulos 1-3 baja de 308
//   pasos      91 → 61    la rejilla vieja ya no toca los capítulos del sistema
//   huecos      3 → 1     las franjas de 178 (mic → cap 2) y 305 (cap 2) ya no existen;
//                         queda la de 182 en el 60 % (capítulos 6-7, ola siguiente)
//   huecoPx   700 → 200   sobre 182 medidos: el margen relativo de siempre
//   notas     136 → 107   -29: cierres «Proven», «What I took from it» ×12, las tres
//                         notas de traducción (al bloque único), «The cover:…»
//   pendientes 24 → 19    los 3 «PHOTO TO COME» y 4 «MATERIAL TO COME» del
//                         capítulo 3 son UN recuadro; los huecos siguen todos
//   repes       7 → 1     «↓» ×19, «To write» ×16, «↗» ×13, «What I took from it»
//                         ×12, «/10» ×8 y «Watch…TikTok» ×8 se fueron; queda «2026»
//                         ×14 (capítulos 4 y 9)
// Los que NO bajaron son la deuda de los pasos B y C: tamanos (el h2
// `visually-hidden` de la frase), las 25 fotos bajo el piso de los capítulos
// 4-9, las 107 notas contra 59, y el «2026» repetido de cartas y expediente.
// ── LOS TOPES QUE BAJÓ LA OLA 6 · PASO B (2026-09-05): LAS PRUEBAS DE TERCEROS
//    Y EL SERVICIO ───────────────────────────────────────────────────────────
// Las cartas (4), el taller y el Reto (5) y el servicio (6) se reconstruyeron
// SOLO con las plantillas de §3.4, con las fotos de CURADURIA-FOTOS.md.
// Medido con `--sin-topes` en los 8 combos sobre el build de esta rama:
//   fotos      27 → 13    las dos cartas en pareja 482 · él abriendo + la lámina
//                         S.M.A.R.T. en pareja 482 · el auditorio 653 · el clip
//                         308 · marcha + stand 482 · la playa sola 482; 13
//                         fotos de 154 fuera y 4 WebP huérfanos borrados. Las
//                         13 que quedan son de los capítulos 7-9
//   pisos      25 → 11    ninguna foto de los capítulos 1-6 baja de 308
//   pasos      61 → 32    las 32 que quedan son del 7 en adelante y del cierre
//   huecos      1 → 0     la franja de 182 px (capítulos 6-7) ya no existe
//   huecoPx   200 → 0     cero píxeles vacíos sumados, en los 8 combos
//   notas     107 → 74    -33: «Proven» ×3, «The letter itself» ×2, «See it on
//                         LinkedIn / Open the scan», los rótulos de cada
//                         testimonio y del calendario, las notas de traducción
//                         del taller y de la playa (al bloque único), la tercera
//                         mención a la carta de Lloyd George
//   pendientes 19 → 19    no baja: los huecos siguen todos. Los dos materiales
//                         que faltan del taller (cuánta gente vino, el apellido
//                         de Gustavo) son UN recuadro, como en el capítulo 3
//   repes       1 → 1     «2026» ×14 → ×12: los dos de las fichas de las cartas
//                         se fueron; los doce que quedan son del expediente
// La marca del Reto Actinver (154 px, original de 182) sale de la cuenta de
// fotos con `data-marca` (ver la sonda): es una marca de tercero, no una foto.
// Los que NO bajaron son la deuda del paso C: tamanos (el h2 `visually-hidden`
// de la frase), las 11 fotos bajo el piso de los capítulos 7-9, las 75 notas
// contra 59, y el «2026» repetido del expediente.
const TOPES = {
  tamanos: 1,      // el único que queda: un h2 `visually-hidden` a 25.5 px
  tarjetas: 0,     // las 12 + 7 tarjetas oscuras miden 482 × 288 — y se queda en cero
  parejas: 0,      // .sf-par mal formada — nace en cero y se queda en cero
  fotos: 13,       // imágenes con un ancho que no es del sistema (capítulos 7-9)
  pisos: 11,       // imágenes por debajo de 308 px (capítulos 7-9; la moda sigue en 154)
  pasos: 32,       // distancias que no son un paso del sistema (capítulos 7-9 y el cierre)
  huecos: 0,       // ninguna franja de más de 160 px sin tinta — y se queda en cero
  huecoPx: 0,      // cero píxeles vacíos sumados
  desborde: 0,     // scrollWidth > innerWidth — esto ya está limpio, y sigue
  notas: 74,       // bloques de nota a la vista, vara de la auditoría (≤ 59)
  pendientes: 19,  // huecos declarados, todos con su geometría final
  repes: 1,        // «2026» ×12 (expediente)
  apagados: 0,     // bloques que nunca llegan a verse — el fallo de Safari 16.6
  portada: 0       // combos donde la tapa NO llega a su último fotograma
};
// ═══════════════════════════════════════════════════════════════════════════
const arg = (n, d) => {
  const p = process.argv.find((a) => a.startsWith('--' + n + '='));
  return p ? p.slice(n.length + 3) : d;
};
const bandera = (n) => process.argv.includes('--' + n);

const RAIZ = arg('dist', 'dist');
const RUTA = '/cv/vista-previa.html';
const MOTORES = arg('motores', 'chromium,webkit').split(',').filter(Boolean);
const ANCHOS = arg('anchos', '1440,1920').split(',').filter(Boolean).map(Number);
const IDIOMAS = arg('idiomas', 'en,es').split(',').filter(Boolean);
const LISTA = Number(arg('lista', '20'));
const JSON_SALIDA = arg('json', '');
const SIN_TOPES = bandera('sin-topes');
const ALTOS = { 1440: 900, 1920: 1080, 1280: 800, 1536: 864 };

let pw;
try {
  pw = await import('playwright');
} catch {
  console.error('[sistema] falta Playwright. Instálalo suelto y vuelve:');
  console.error('[sistema]   npm i --no-save playwright && npx playwright install chromium webkit');
  console.error('[sistema] NO se ha medido nada.');
  process.exit(1);
}
if (!fs.existsSync(path.join(RAIZ, RUTA.slice(1)))) {
  console.error('[sistema] no está ' + path.join(RAIZ, RUTA.slice(1)) + '.');
  console.error('[sistema] Ese archivo solo se emite sin CV_SLUG: CV_SLUG= npm run build');
  process.exit(1);
}

const TIPO = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.avif': 'image/avif', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.woff2': 'font/woff2', '.webm': 'video/webm',
  '.mp4': 'video/mp4', '.txt': 'text/plain', '.xml': 'application/xml'
};
const raizAbs = path.resolve(RAIZ);
const servidor = http.createServer((req, res) => {
  let f = path.join(raizAbs, decodeURIComponent(req.url.split('?')[0]));
  if (!f.startsWith(raizAbs)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f) && fs.existsSync(f + '.html')) f += '.html';
  if (!fs.existsSync(f)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': TIPO[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => servidor.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${servidor.address().port}`;

// ═══════════════════════════════════════════════════════════════════════════
// LA SONDA. Todo lo que se mide sale de UNA pasada dentro de la página, para
// que ningún número se lea de un estado distinto que otro.
//
// TRES TRAMPAS, escritas aquí porque cada una costó una medición entera:
//  · `getComputedStyle` bajo animaciones por scroll da valores rancios; se leen
//    CAJAS (`getBoundingClientRect`) y, para el tamaño de letra, el estilo del
//    PADRE del nodo de texto, que no lo anima nadie.
//  · La aparición por scroll deja el documento ~14 % corto si no se recorre
//    antes; por eso el recorrido va DOS veces y con `loading="eager"` forzado.
//  · Con `file://` la hoja no carga y salen los dos paneles de idioma: se sirve
//    por HTTP, como ya hace medir-cv.mjs.
// ═══════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════
// LA SONDA DE LA PORTADA (prueba 9). Va aparte porque es la única que NECESITA
// MOVER LA PÁGINA: se planta al principio del recorrido de la intro, se planta
// al final, y compara los dos fotogramas. Todo lo demás se mide quieto.
//
// LO QUE SE EXIGE, y por qué son dos cosas y no una:
//  · que la TAPA se haya ido (opacidad ≤ .01 o `visibility: hidden`) — es lo
//    que un lector ve: si sigue puesta, el CV no ha arrancado;
//  · que el RECORTE haya cambiado entre el primer fotograma y el último — la
//    tapa podría irse por otro motivo, y lo que Jaime pidió es la tarjeta.
// Las dos juntas no se pueden cumplir por accidente.
//
// LA VARA ES «UN SOLO GESTO». El recorrido reservado es de 306 px a 1440: si
// hiciera falta más de una rueda para terminarlo, la queja de Jaime («abajo
// hay un espacio gigante en blanco») volvería por la puerta de atrás. Por eso
// se mide EN EL ÚLTIMO PÍXEL del recorrido declarado, no 3 000 px más abajo.
//
// SI NO HAY EFECTO, NO HAY PRUEBA, y eso no es una excusa: sin `data-intro`
// (JavaScript apagado) o con «menos movimiento» la pista no reserva recorrido
// —mide una pantalla justa— y la tapa es una portada normal. Se devuelve
// `armada: false` y la prueba pasa, que es el comportamiento correcto.
// ═══════════════════════════════════════════════════════════════════════════
// EL BARRIDO DE PÍXELES PINTADOS (prueba 5)
// ═══════════════════════════════════════════════════════════════════════════
// LA VARA CAMBIÓ EL 2026-09-04, Y ESTE ES EL PORQUÉ. Hasta hoy las franjas se
// medían con una MÁSCARA DE CAJAS: se sumaban los rectángulos de todo lo que
// «debería» pintar (texto, imágenes, fondos, bordes) y se llamaba hueco a la
// fila sin ninguno. Esa vara tenía dos agujeros, y los dos se destaparon el
// mismo día:
//
//  1. SE PODÍA CALLAR SIN ARREGLAR NADA. Contaba como tinta cualquier
//     `background-color` no transparente, incluido el papel sobre papel. El
//     paso de Safari bajó `huecos` de 5 a 4 y `huecoPx` de 1 120 a 920
//     declarándole a `.intro-pista` un fondo del MISMO blanco; su propio
//     comentario decía «no cambia ni un píxel de lo que se ve». Un tope que
//     baja así queda bajado para siempre y Jaime lo lee como progreso.
//  2. INVENTABA HUECOS QUE NO EXISTEN. La máscara se lee con el documento
//     quieto arriba del todo, y ahí un elemento `sticky` está en su sitio
//     natural — pero durante el scroll VIAJA y pinta lo que su caja en reposo
//     no cubre. El lienzo de la portada mide una pantalla y recorre la pista
//     entera: la máscara acusaba «216 px vacíos desde y=900» donde no hay ni
//     un píxel blanco. Modelar eso es reimplementar el motor de pintado.
//
// Así que se mide lo que hay: se recorre el documento en capturas encadenadas,
// se recorta la columna útil (980 px centrados) y se marca la fila que tenga
// algún píxel por debajo de 243 en cualquier canal. Un fondo del color del
// papel no aporta nada porque no se ve; un `sticky` aporta donde de verdad
// pasa; y lo que un scroller recorta no cuenta, sin necesidad de la aritmética
// de recortes que hacía falta antes. Es además la vara de la AUDITORÍA, así
// que el número vuelve a ser comparable con el 52 % que Jaime tiene en la
// cabeza. Cuesta ~26 capturas por combo; el guardián ya recorría el documento
// dos veces, y una vara que se puede fudgear no vale lo que ahorra.
const UTIL = 980;
const UMBRAL_TINTA = 243;   // por debajo de esto en cualquier canal, hay tinta

// PNG de Playwright → píxeles. Sin dependencias: `zlib` y los cinco filtros.
function pixelesPNG(png) {
  let i = 8, w = 0, h = 0, prof = 0, tipo = 0;
  const trozos = [];
  while (i < png.length) {
    const largo = png.readUInt32BE(i);
    const nombre = png.toString('ascii', i + 4, i + 8);
    if (nombre === 'IHDR') {
      const d = png.subarray(i + 8, i + 8 + largo);
      w = d.readUInt32BE(0); h = d.readUInt32BE(4); prof = d[8]; tipo = d[9];
    }
    if (nombre === 'IDAT') trozos.push(png.subarray(i + 8, i + 8 + largo));
    if (nombre === 'IEND') break;
    i += 12 + largo;
  }
  const canales = tipo === 6 ? 4 : tipo === 2 ? 3 : tipo === 0 ? 1 : 0;
  if (prof !== 8 || !canales) throw new Error(`PNG no soportado (profundidad ${prof}, tipo ${tipo})`);
  const crudo = zlib.inflateSync(Buffer.concat(trozos));
  const paso = w * canales;
  const out = Buffer.alloc(h * paso);
  let p = 0;
  for (let y = 0; y < h; y++) {
    const f = crudo[p++];
    const linea = crudo.subarray(p, p + paso); p += paso;
    const dest = out.subarray(y * paso, (y + 1) * paso);
    const prev = y > 0 ? out.subarray((y - 1) * paso, y * paso) : null;
    for (let x = 0; x < paso; x++) {
      const a = x >= canales ? dest[x - canales] : 0;
      const b = prev ? prev[x] : 0;
      const c = prev && x >= canales ? prev[x - canales] : 0;
      let v = linea[x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      }
      dest[x] = v & 255;
    }
  }
  return { w, h, canales, datos: out };
}

async function barrido(page, ancho, alto) {
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  const colI = Math.max(0, Math.round((ancho - UTIL) / 2));
  const mapa = new Uint8Array(total);
  for (let y = 0; y < total; y += alto) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(140);
    const real = await page.evaluate(() => window.scrollY);
    const { w, h, canales, datos } = pixelesPNG(await page.screenshot({ type: 'png' }));
    const hasta = Math.min(w, colI + UTIL);
    for (let fy = 0; fy < h; fy++) {
      const abs = real + fy;
      if (abs >= total) break;
      if (mapa[abs]) continue;
      for (let fx = colI; fx < hasta; fx++) {
        const o = fy * w * canales + fx * canales;
        if (datos[o] < UMBRAL_TINTA || datos[o + 1] < UMBRAL_TINTA || datos[o + 2] < UMBRAL_TINTA) { mapa[abs] = 1; break; }
      }
    }
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  let tinta = 0, ultima = 0;
  for (let i = 0; i < total; i++) if (mapa[i]) { tinta++; ultima = i; }
  // Lo que hay debajo del último píxel de tinta no es un hueco: es el final.
  const huecos = [];
  let ini = -1;
  for (let i = 0; i <= ultima; i++) {
    if (!mapa[i]) { if (ini < 0) ini = i; continue; }
    if (ini >= 0) {
      const px = i - ini;
      if (px > HUECO_MAX) huecos.push({ y: ini, px, pct: +((ini / total) * 100).toFixed(1) });
      ini = -1;
    }
  }
  return { huecos, tinta, filas: total };
}

const SONDA_PORTADA = async () => {
  const vis = (s) => [...document.querySelectorAll(s)].find((n) => {
    const r = n.getBoundingClientRect();
    return r.width > 0 || r.height > 0;
  }) || null;
  const fotograma = () => {
    const marco = vis('.portada-marco'), tapa = vis('.portada-uno');
    const ct = tapa ? getComputedStyle(tapa) : null;
    return {
      p: getComputedStyle(document.documentElement).getPropertyValue('--intro-p').trim(),
      clip: marco ? getComputedStyle(marco).clipPath : null,
      opacidad: ct ? +ct.opacity : null,
      visibilidad: ct ? ct.visibility : null
    };
  };
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  const pista = vis('.intro-pista');
  const modo = document.documentElement.getAttribute('data-intro');
  if (!pista || !modo) return { armada: false, motivo: 'sin efecto (data-intro=' + modo + ')' };
  window.scrollTo(0, 0);
  await espera(200);
  const arriba = pista.getBoundingClientRect().top + window.scrollY;
  const recorrido = Math.round(pista.getBoundingClientRect().height - window.innerHeight);
  if (recorrido <= 8) return { armada: false, modo, recorrido, motivo: 'la pista no reserva recorrido' };
  window.scrollTo(0, arriba);
  await espera(260);
  const inicio = fotograma();
  window.scrollTo(0, arriba + recorrido);
  await espera(320);
  const final = fotograma();
  window.scrollTo(0, 0);
  await espera(260);
  const tapaFuera = final.opacidad !== null && (final.opacidad <= 0.01 || final.visibilidad === 'hidden');
  const recorteCambio = inicio.clip !== final.clip;
  const motivos = [];
  if (!tapaFuera) motivos.push(`la tapa sigue puesta (opacidad ${final.opacidad}, ${final.visibilidad})`);
  if (!recorteCambio) motivos.push(`el recorte no se movió (${final.clip})`);
  return { armada: true, modo, recorrido, inicio, final, ok: tapaFuera && recorteCambio, motivo: motivos.join(' · ') };
};

const SONDA = (lang) => {
  const raiz = document.querySelector(lang === 'es' ? '.cv-es' : '.cv-en');
  if (!raiz) return { error: 'no encuentro el panel de idioma .cv-' + lang };
  const Y = window.scrollY;
  const abs = (r) => ({ t: r.top + Y, b: r.bottom + Y, l: r.left, r: r.right, w: r.width, h: r.height });

  const sel = (el) => {
    if (!el || el.nodeType !== 1) return '?';
    const t = el.tagName.toLowerCase();
    const id = el.id ? '#' + el.id : '';
    const cls = (el.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean).slice(0, 3);
    return t + id + (cls.length ? '.' + cls.join('.') : '');
  };
  const cadena = (el) => {
    const p = [];
    for (let n = el; n && n !== raiz && p.length < 4; n = n.parentElement) p.unshift(sel(n));
    return p.join(' > ');
  };
  const seVe = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  // ¿Está dentro de un <details> cerrado? El contenido sigue en el DOM y con
  // caja: hay que preguntar por el `open` del ancestro, no por `display`.
  // Regla del sistema §3.4 (x): lo plegado NO cuenta como tinta a la vista.
  const plegado = (el) => {
    for (let n = el; n && n !== raiz; n = n.parentElement) {
      const d = n.parentElement;
      if (d && d.tagName === 'DETAILS' && !d.open && n.tagName !== 'SUMMARY') return true;
    }
    return false;
  };
  // La TAPA está fuera del sistema por decisión escrita: es una portada a
  // sangre con su propia tipografía de cartel, medida aparte por
  // check-contraste-cv.mjs. El sistema empieza en el capítulo 2.
  const enTapa = (el) => !!el.closest('.cap-portada, .portada-uno, .portada-dos');

  const fuera = (el) => plegado(el) || enTapa(el) || !seVe(el);

  const out = {
    tamanos: [], tarjetas: [], fotos: [], pasos: [], huecos: [], parejas: [],
    notas: 0, notasPalabras: 0, palabras: 0, pendientes: 0, repes: [], apagados: [], texto: [],
    alto: 0, desborde: 0, tinta: 0, filas: 0
  };

  // ── 1 · TAMAÑOS DE TEXTO ────────────────────────────────────────────────
  // Un nodo de texto con contenido; el tamaño se lee de su elemento padre.
  const vistos = new Map();
  const it = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
  const rotulos = new Map();
  for (let n = it.nextNode(); n; n = it.nextNode()) {
    const txt = (n.nodeValue || '').replace(/\s+/g, ' ').trim();
    if (!txt) continue;
    const el = n.parentElement;
    if (!el || fuera(el)) continue;
    const fs = Math.round(parseFloat(getComputedStyle(el).fontSize) * 2) / 2;
    if (!vistos.has(fs)) vistos.set(fs, { px: fs, n: 0, donde: cadena(el), muestra: txt.slice(0, 40) });
    vistos.get(fs).n++;
    // Las palabras A LA VISTA del cuerpo (la tapa va aparte, como en todo
    // este archivo): es el denominador del porcentaje de notas.
    out.palabras += txt.split(/\s+/).filter(Boolean).length;
    // ── 8 · REPETICIONES. Un rótulo corto que sale 8 veces o más no informa
    //    de nada (§3.4 x). Solo cuentan los cortos: un párrafo repetido es
    //    otro problema, y la prosa larga no se repite por accidente.
    if (txt.length <= 90) {
      const k = txt.toLowerCase();
      if (!rotulos.has(k)) rotulos.set(k, { texto: txt.slice(0, 60), n: 0, donde: cadena(el) });
      rotulos.get(k).n++;
    }
  }
  out.tamanos = [...vistos.values()].sort((a, b) => b.px - a.px);
  out.repes = [...rotulos.values()].filter((r) => r.n >= 8).sort((a, b) => b.n - a.n);

  // ── 2 · TARJETAS OSCURAS ────────────────────────────────────────────────
  // Se reconocen por clase declarada (.sf-tarjeta, la del sistema) y por las
  // que hoy hacen ese papel en el documento (.cita, .tile). Si mañana nace
  // otra, se añade aquí — o mejor, se le pone .sf-tarjeta.
  for (const el of raiz.querySelectorAll('.sf-tarjeta, li.cita, .tarjeta')) {
    if (fuera(el)) continue;
    const r = abs(el.getBoundingClientRect());
    out.tarjetas.push({ donde: cadena(el), w: Math.round(r.w), h: Math.round(r.h), y: Math.round(r.t) });
  }

  // ── 2b · LA PAREJA CON UN NÚMERO DE HIJOS QUE NO ES DOS ─────────────────
  // §3.3 regla 2: una fila de dos columnas contiene EXACTAMENTE dos hijos.
  // Los huecos del CV salen de filas con tres bloques a un lado y uno al otro.
  // Esto NO se marca en rojo en el CSS a propósito (lo abriría un comité de
  // admisiones); se cuenta aquí, que corre antes del PR.
  for (const el of raiz.querySelectorAll('.sf-par')) {
    if (fuera(el)) continue;
    const n = [...el.children].length;
    if (n !== 2 && n !== 1) out.parejas.push({ donde: cadena(el), n });
  }

  // ── 3 · FOTOS ───────────────────────────────────────────────────────────
  // UNA EXCEPCIÓN, ESCRITA EN EL MARCADO Y NO AQUÍ: `data-marca`. Es la
  // marca de un tercero (el logo del Reto Actinver, original de 182 px), no
  // una foto: CLAUDE.md manda que vaya pequeña junto al nombre del concurso y
  // sobre placa oscura fija, y CURADURIA-FOTOS.md §3 (cap. 5) la deja fuera
  // del suelo de 480 a propósito: «el suelo de 480 no aplica». Se salta y se
  // cuenta aparte (`marcas`), para que no desaparezca en silencio.
  out.marcas = 0;
  for (const el of raiz.querySelectorAll('img, video, canvas')) {
    if (fuera(el)) continue;
    if (el.hasAttribute('data-marca')) { out.marcas++; continue; }
    const r = el.getBoundingClientRect();
    out.fotos.push({
      donde: cadena(el),
      w: Math.round(r.width), h: Math.round(r.height), y: Math.round(r.top + Y),
      alt: (el.getAttribute('alt') || el.getAttribute('aria-label') || '').slice(0, 48)
    });
  }

  // ── 4 · PASOS DE AIRE ───────────────────────────────────────────────────
  // Entre HERMANOS consecutivos. «Entre bloques» = hijos directos de una
  // `section.cap`; lo demás es «dentro». Los solapes (negativos) y lo que
  // está en la misma línea (mismo `top`) no son aire y no se cuentan.
  // `.sf-ancho` ENTRA EN LA LISTA (ola 5). §3.2 declara TRES pistas —lectura
  // 653, útil 980 y marco ancho 1280— y `cv.css` ya le da a las tres el mismo
  // aire entre bloques (`.sf-doc > * + *, .sf-ancho > * + * { 44px }`). Faltaba
  // aquí: sin ella, los 44 px que el sistema MANDA entre los bloques del marco
  // ancho se medían con la vara de «dentro» (0·8·16·20) y se contaban como
  // infracción. El módulo del micrófono es el primero que vive en esa pista.
  const secciones = [...raiz.querySelectorAll('section.cap, .sf-doc, .sf-util, .sf-ancho')];
  const bloques = new Set(secciones);
  const contenedores = new Set([raiz, ...raiz.querySelectorAll('*')]);
  for (const cont of contenedores) {
    const hijos = [...cont.children].filter((e) => !fuera(e));
    for (let i = 1; i < hijos.length; i++) {
      const a = hijos[i - 1].getBoundingClientRect(), b = hijos[i].getBoundingClientRect();
      if (b.top <= a.bottom) continue;                    // solape o misma fila
      const d = Math.round(b.top - a.bottom);
      if (d === 0) continue;
      out.pasos.push({
        entre: bloques.has(cont), d,
        donde: sel(cont) + ' : ' + sel(hijos[i - 1]) + ' → ' + sel(hijos[i]),
        y: Math.round(a.bottom + Y)
      });
    }
  }

  // ── 5 · LAS FRANJAS VACÍAS SE MIDEN EN PÍXELES PINTADOS, NO EN CAJAS ────
  // El barrido vive FUERA de la sonda (necesita hacer capturas, y eso es cosa
  // del guion, no de la página): ver `barrido()` más abajo. Aquí solo se deja
  // el alto del documento, que es de lo que cuelga todo lo demás.
  const alto = Math.max(document.documentElement.scrollHeight, raiz.getBoundingClientRect().height + Y);
  out.alto = Math.round(alto);

  // ── 6 · DESBORDE HORIZONTAL ─────────────────────────────────────────────
  out.desborde = Math.max(0, document.documentElement.scrollWidth - window.innerWidth);

  // ── 7 · NOTAS Y HUECOS PENDIENTES ───────────────────────────────────────
  // LA VARA SE AMPLIÓ EL 2026-09-04, Y ESTO IMPORTA MÁS DE LO QUE PARECE.
  // Contaba tres familias de clases y salía «50 · tope del sistema 59», que en
  // este formato se lee como «esta regla ya está dentro del sistema». No lo
  // está: el 227 que Jaime tiene en la cabeza salió de contar TODO el aparato
  // que rodea al documento —notas y fuentes, sí, pero también los pies de
  // figura, los rótulos y los huecos «TO WRITE»—, y con esa vara hoy siguen a
  // la vista 136 bloques. Un guardián que mide un tercio de lo que midió la
  // auditoría no puede decir si la auditoría se está cerrando.
  // Se cuenta con la vara de la auditoría, se DEDUPLICA por anidamiento (un
  // `.meta-mono` dentro de un `figcaption` es una nota, no dos) y se imprimen
  // además las PALABRAS y su porcentaje sobre las que se ven, que es la cifra
  // que él comparó: 2 137 palabras = 50.6 % del cuerpo.
  const esNota = (el) => !plegado(el) && seVe(el);
  const cuentaPal = (t) => (t || '').trim().split(/\s+/).filter(Boolean).length;
  const NOTA_SEL = '.meta-mono, .sf-nota, .nota, .fuente, .pie-fuente,'
    + ' .hueco, .hueco-mat, .foto-hueco, .sf-pendiente, .pendiente,'
    + ' figcaption, .pie, .etiqueta';
  const nodosNota = [...raiz.querySelectorAll(NOTA_SEL)].filter(esNota);
  const raicesNota = nodosNota.filter((n) => !nodosNota.some((o) => o !== n && o.contains(n)));
  out.notas = raicesNota.length;
  out.notasPalabras = raicesNota.reduce((s, n) => s + cuentaPal(n.textContent), 0);
  out.pendientes = [...raiz.querySelectorAll('.hueco, .hueco-mat, .foto-hueco, .sf-pendiente, .pendiente')]
    .filter(esNota).length;

  // ── 8b · LO QUE SE QUEDA APAGADO ────────────────────────────────────────
  // WebKit 16.6 no tiene `animation-timeline`. Un bloque cuyo estado final
  // dependa de un scroll-timeline se queda en opacity: 0 PARA SIEMPRE en la
  // Mac de Jaime, y ninguna captura de Chrome lo enseña.
  //
  // NO SE PUEDE MEDIR ESTO CON EL BLOQUE FUERA DE PANTALLA, y esa trampa costó
  // la primera corrida: en Chromium una animación `view()` pone opacity 0 a
  // TODO lo que está lejos del pliegue —es su estado correcto, no un fallo—,
  // así que la primera medición acusó a los ocho titulares de un defecto que
  // no tienen. Lo que se pregunta es otra cosa: ¿llegó este bloque a VERSE
  // alguna vez mientras pasaba por la pantalla? La opacidad máxima de cada
  // candidato se apunta durante el segundo recorrido (`window.__sfVistos`), y
  // aquí solo se lee. Un bloque que nunca pasó de 0.01 estando a la vista es
  // el fallo que ve la Mac de Jaime.
  const apuntados = window.__sfVistos || new Map();
  for (const el of raiz.querySelectorAll('section.cap, section.cap > *, .sf-doc > *')) {
    if (plegado(el) || enTapa(el)) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) continue;
    const max = apuntados.get(el);
    if (max === undefined) continue;          // nunca cruzó la pantalla: no se juzga
    if (max <= 0.01) out.apagados.push({ donde: cadena(el), y: Math.round(r.top + Y), opacidad: max });
  }
  out.soporta = {
    scroll: !!(window.CSS && CSS.supports && CSS.supports('animation-timeline: scroll()')),
    subgrid: !!(window.CSS && CSS.supports && CSS.supports('grid-template-rows: subgrid'))
  };
  return out;
};

// ═══════════════════════════════════════════════════════════════════════════
// EL RECORRIDO
// ═══════════════════════════════════════════════════════════════════════════
const combos = [];
for (const motor of MOTORES) for (const w of ANCHOS) for (const idioma of IDIOMAS) combos.push({ motor, w, idioma });

const medidas = [];
for (const motor of MOTORES) {
  let nav;
  try {
    nav = await pw[motor].launch();
  } catch (e) {
    console.error(`[sistema] no arranca ${motor}: ${e.message.split('\n')[0]}`);
    console.error(`[sistema]   npx playwright install ${motor}`);
    console.error('[sistema] NO se ha medido nada con ese motor, y eso NO es un aprobado.');
    await new Promise((r) => servidor.close(r));
    process.exit(1);
  }
  for (const c of combos.filter((x) => x.motor === motor)) {
    const alto = ALTOS[c.w] || 900;
    const ctx = await nav.newContext({ viewport: { width: c.w, height: alto }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    // `scroll-behavior: smooth` convierte cada salto del recorrido en una
    // animación y el recorrido deja de recorrer. Se anula nada más cargar.
    await page.goto(BASE + RUTA + (c.idioma === 'es' ? '#es' : ''), { waitUntil: 'load' });
    await page.addStyleTag({ content: 'html,body,*{scroll-behavior:auto !important}' });
    await page.evaluate(() => {
      for (const i of document.querySelectorAll('img,iframe')) i.setAttribute('loading', 'eager');
    });
    for (let pasada = 0; pasada < 2; pasada++) {
      // El SEGUNDO recorrido, además de despertar la aparición por scroll,
      // apunta la opacidad MÁXIMA de cada bloque mientras cruza la pantalla:
      // es el único momento en que esa cifra significa algo (ver 8b).
      await page.evaluate(async ({ vh, apuntar }) => {
        if (apuntar) window.__sfVistos = new Map();
        const candidatos = apuntar
          ? [...document.querySelectorAll('section.cap, section.cap > *, .sf-doc > *')]
          : [];
        const paso = Math.round(vh * 0.8);
        const mirar = () => {
          for (const el of candidatos) {
            const r = el.getBoundingClientRect();
            if (r.bottom < 0 || r.top > vh || r.width <= 0 || r.height <= 0) continue;
            const o = parseFloat(getComputedStyle(el).opacity);
            const p = window.__sfVistos.get(el);
            if (p === undefined || o > p) window.__sfVistos.set(el, o);
          }
        };
        for (let y = 0; y < document.documentElement.scrollHeight + vh; y += paso) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 25));
          if (apuntar) { mirar(); await new Promise((r) => setTimeout(r, 40)); mirar(); }
        }
        window.scrollTo(0, 0);
        await new Promise((r) => setTimeout(r, 120));
        if (apuntar) mirar();
      }, { vh: alto, apuntar: pasada === 1 });
    }
    // La prueba 9 va ANTES de la sonda quieta porque mueve la página; deja el
    // scroll donde lo encontró (arriba) y espera a que se asiente.
    const portada = await page.evaluate(SONDA_PORTADA);
    // El barrido de píxeles va DESPUÉS de la portada (que necesita la intro
    // sin tocar) y ANTES de la sonda quieta; deja el scroll arriba.
    const franjas = await barrido(page, c.w, alto);
    await page.waitForTimeout(300);
    const m = await page.evaluate(SONDA, c.idioma);
    if (m.error) { console.error('[sistema] ' + m.error); process.exit(1); }
    medidas.push({ ...c, ...m, ...franjas, portada });
    await ctx.close();
    process.stderr.write(`[sistema] medido ${motor} ${c.w} ${c.idioma}: ${m.alto} px\n`);
  }
  await nav.close();
}
await new Promise((r) => servidor.close(r));

// ═══════════════════════════════════════════════════════════════════════════
// EL VEREDICTO
// ═══════════════════════════════════════════════════════════════════════════
const cerca = (v, lista, tol = TOL) => lista.some((x) => Math.abs(v - x) <= tol);
const etq = (m) => `${m.motor} ${m.w} ${m.idioma}`;
const infra = { tamanos: [], tarjetas: [], parejas: [], fotos: [], pisos: [], pasos: [], huecos: [], desborde: [], notas: [], pendientes: [], repes: [], apagados: [], portada: [] };

// ── `combo` Y `donde` SON DOS COSAS, Y LLEGARON A SER UNA ──────────────────
// La sonda devuelve cada infracción con un `donde` que es SU SELECTOR. El
// motor y el ancho se añaden aquí. Escrito `{ donde: etq(m), ...t }` el spread
// pisa la etiqueta con el selector y el informe pierde en qué motor y a qué
// ancho pasó — que es justo lo que se mira, porque «solo en webkit» y «en los
// dos» son dos problemas distintos: el primero lo ve Jaime en su Mac y no lo
// enseña ninguna captura de Chrome. Va en una clave PROPIA.
for (const m of medidas) {
  for (const t of m.tamanos) if (!cerca(t.px, TAMANOS, 0.5)) infra.tamanos.push({ combo: etq(m), px: t.px, n: t.n, sel: t.donde, muestra: t.muestra });
  for (const t of m.tarjetas) if (Math.abs(t.w - TARJETA.w) > 0.5 || Math.abs(t.h - TARJETA.h) > 0.5) infra.tarjetas.push({ ...t, combo: etq(m) });
  for (const p of m.parejas || []) infra.parejas.push({ ...p, combo: etq(m) });
  for (const f of m.fotos) {
    if (!cerca(f.w, ANCHOS_FOTO)) infra.fotos.push({ ...f, combo: etq(m) });
    if (f.w < PISO_FOTO) infra.pisos.push({ ...f, combo: etq(m) });
  }
  for (const p of m.pasos) {
    const ok = p.entre ? cerca(p.d, PASOS_ENTRE) : cerca(p.d, [...PASOS_DENTRO, ...PASOS_ENTRE]);
    if (!ok) infra.pasos.push({ ...p, combo: etq(m) });
  }
  for (const h of m.huecos) infra.huecos.push({ ...h, combo: etq(m) });
  if (m.desborde > 0) infra.desborde.push({ combo: etq(m), px: m.desborde });
  if (m.notas > NOTAS_MAX) infra.notas.push({ combo: etq(m), n: m.notas, pal: m.notasPalabras, pct: m.palabras ? +((m.notasPalabras / m.palabras) * 100).toFixed(1) : 0 });
  infra.pendientes.push({ combo: etq(m), n: m.pendientes });
  for (const r of m.repes) infra.repes.push({ ...r, combo: etq(m) });
  for (const a of m.apagados) infra.apagados.push({ ...a, combo: etq(m) });
  if (m.portada && m.portada.armada && !m.portada.ok) {
    infra.portada.push({ combo: etq(m), donde: m.portada.motivo, recorrido: m.portada.recorrido, modo: m.portada.modo });
  }
}

// Las cuentas que mandan: el PEOR de los combos, no la suma (medir dos idiomas
// no puede duplicar la deuda de un mismo defecto).
const peor = (fn) => Math.max(0, ...medidas.map(fn));
const cuenta = {
  tamanos: peor((m) => m.tamanos.filter((t) => !cerca(t.px, TAMANOS, 0.5)).length),
  tarjetas: peor((m) => m.tarjetas.filter((t) => Math.abs(t.w - TARJETA.w) > 0.5 || Math.abs(t.h - TARJETA.h) > 0.5).length),
  parejas: peor((m) => (m.parejas || []).length),
  fotos: peor((m) => m.fotos.filter((f) => !cerca(f.w, ANCHOS_FOTO)).length),
  pisos: peor((m) => m.fotos.filter((f) => f.w < PISO_FOTO).length),
  pasos: peor((m) => m.pasos.filter((p) => !(p.entre ? cerca(p.d, PASOS_ENTRE) : cerca(p.d, [...PASOS_DENTRO, ...PASOS_ENTRE]))).length),
  huecos: peor((m) => m.huecos.length),
  huecoPx: peor((m) => m.huecos.reduce((s, h) => s + h.px, 0)),
  desborde: peor((m) => m.desborde),
  notas: peor((m) => m.notas),
  pendientes: peor((m) => m.pendientes),
  repes: peor((m) => m.repes.length),
  apagados: peor((m) => m.apagados.length),
  // LA ÚNICA QUE SE SUMA EN VEZ DE COGER EL PEOR COMBO, y es a propósito: aquí
  // cada combo es un NAVEGADOR Y UN IDIOMA distintos, no dos varas sobre el
  // mismo defecto. Que la portada funcione en chromium inglés no perdona que
  // no funcione en webkit español — ese fue exactamente el fallo. Lo que se
  // imprime es «en cuántos de los 8 combos la portada no llega al final».
  portada: medidas.filter((m) => m.portada && m.portada.armada && !m.portada.ok).length
};

const NOMBRE = {
  tamanos: '1 · TAMAÑOS fuera de los ocho (56 40 24 21 19 17 14 12)',
  tarjetas: '2a · TARJETAS oscuras que no miden 482 × 288',
  parejas: '2b · PAREJAS (.sf-par) con un número de hijos que no es dos',
  fotos: '3a · FOTOS con un ancho que no es del sistema',
  pisos: '3b · FOTOS por debajo del piso de 308 px',
  pasos: '4 · AIRE que no es un paso (entre 16·44·72·80 · dentro 8·20)',
  huecos: '5a · FRANJAS de más de 160 px sin tinta',
  huecoPx: '5b · PÍXELES vacíos, sumados',
  desborde: '6 · DESBORDE horizontal (scrollWidth > innerWidth)',
  notas: '7a · NOTAS a la vista — vara de la auditoría (el sistema pide ≤ 59)',
  pendientes: '7b · HUECOS «TO WRITE» declarados',
  repes: '8a · RÓTULOS repetidos 8 veces o más',
  apagados: '8b · BLOQUES apagados (opacity 0) tras recorrer — el fallo de Safari',
  portada: '9 · LA PORTADA no llega a su último fotograma (combos de 8)'
};

const L = [];
L.push('');
L.push('══════════════════════════════════════════════════════════════════════');
L.push('  EL GUARDIÁN DEL SISTEMA — CV de Jaime Sandoval Ricaño');
L.push('  Sistema: Apple Newsroom / Stories · cv-material/ola5/SISTEMA-REFERENCIA.md');
L.push('══════════════════════════════════════════════════════════════════════');
for (const m of medidas) {
  const sinTinta = m.filas ? (100 - (m.tinta / m.filas) * 100).toFixed(1) : '?';   // píxeles PINTADOS
  const p = m.portada;
  const tapa = !p || !p.armada ? 'portada sin efecto' : (p.ok ? 'portada ✓' : 'portada ✗');
  L.push(`  ${etq(m).padEnd(20)} ${String(m.alto).padStart(6)} px · ${(m.alto / (ALTOS[m.w] || 900)).toFixed(1)} pantallas · ${sinTinta}% de filas sin tinta` +
    (m.soporta && !m.soporta.scroll ? '  · sin animation-timeline' : '') + '  · ' + tapa);
}
L.push('');

let fallos = 0;
const linea = (k) => {
  const n = cuenta[k], tope = TOPES[k] ?? 0;
  const mal = n > tope;
  if (mal) fallos++;
  L.push(`${mal ? '✗' : '·'} ${NOMBRE[k]}`);
  L.push(`   ${String(n).padStart(6)}   tope ${tope}${mal ? '   ← SUPERADO' : (n ? '   (deuda dentro del tope)' : '   limpio')}`);
  return mal;
};

for (const k of ['tamanos', 'tarjetas', 'parejas', 'fotos', 'pisos', 'pasos', 'huecos', 'huecoPx', 'desborde', 'notas', 'pendientes', 'repes', 'apagados', 'portada']) {
  linea(k);
  const lista = k === 'huecoPx' ? infra.huecos : infra[k];
  if (!lista || !lista.length) { L.push(''); continue; }
  // Se imprime UNA vez por infracción distinta, no una por combo — pero SE
  // DICE EN CUÁLES SALIÓ. «solo en webkit 1920» y «en los cuatro» piden cosas
  // distintas: lo primero es un defecto de motor que ninguna captura de Chrome
  // enseña (y que la Mac de Jaime SÍ ve), lo segundo es del documento.
  const clave = (x) => JSON.stringify([x.sel || x.donde || x.texto || x.alt || '', x.px, x.d, x.w, x.h, x.y, x.n]);
  const juntos = new Map();
  for (const x of lista) {
    const c = clave(x);
    if (!juntos.has(c)) juntos.set(c, { x, combos: new Set() });
    juntos.get(c).combos.add(x.combo);
  }
  const unicos = [...juntos.values()];
  const donde = ({ combos }) =>
    combos.size >= medidas.length ? `[los ${combos.size} combos]` : `[${[...combos].join(' · ')}]`;
  for (const u of unicos.slice(0, LISTA)) {
    const x = u.x;
    if (k === 'tamanos') L.push(`     ${String(x.px).padStart(6)} px · ${x.n} nodos · ${x.sel}  «${x.muestra}»  ${donde(u)}`);
    else if (k === 'tarjetas') L.push(`     ${x.w}×${x.h} en y=${x.y} ${x.w !== TARJETA.w ? '(ancho)' : ''}${x.h !== TARJETA.h ? '(alto)' : ''}  ${x.donde}  ${donde(u)}`);
    else if (k === 'fotos' || k === 'pisos') L.push(`     ${String(x.w).padStart(5)}×${String(x.h).padEnd(5)} en y=${x.y}  «${x.alt}»  ${donde(u)}`);
    else if (k === 'pasos') L.push(`     ${String(x.d).padStart(5)} px ${x.entre ? 'entre' : 'dentro'} en y=${x.y}  ${x.donde}  ${donde(u)}`);
    else if (k === 'huecos' || k === 'huecoPx') L.push(`     ${String(x.px).padStart(5)} px vacíos desde y=${x.y}  (${x.pct}% del documento)  ${donde(u)}`);
    else if (k === 'desborde') L.push(`     ${x.px} px de más  ${donde(u)}`);
    else if (k === 'parejas') L.push(`     ${x.n} hijos  ${x.donde}  ${donde(u)}`);
    else if (k === 'repes') L.push(`     ×${String(x.n).padStart(3)}  «${x.texto}»  ${donde(u)}`);
    else if (k === 'apagados') L.push(`     opacity ${x.opacidad} en y=${x.y}  ${x.donde}  ${donde(u)}`);
    else if (k === 'portada') L.push(`     ${x.donde}  (modo ${x.modo}, ${x.recorrido} px de recorrido reservado)  ${donde(u)}`);
    else if (k === 'notas') L.push(`     ${x.n} bloques · ${x.pal} palabras · ${x.pct}% de las que se ven  ${donde(u)}`);
    else if (k === 'pendientes') L.push(`     ${x.n}  ${donde(u)}`);
  }
  if (unicos.length > LISTA) L.push(`     … y ${unicos.length - LISTA} más`);
  L.push('');
}

L.push('──────────────────────────────────────────────────────────────────────');
if (SIN_TOPES) {
  L.push('  --sin-topes: se ha medido y NO se falla. Copia las cuentas a TOPES.');
  L.push('  TOPES = ' + JSON.stringify(cuenta));
} else if (fallos) {
  L.push(`  ✗ ${fallos} prueba(s) por encima de su tope. El sistema se ha roto por ahí.`);
} else {
  L.push('  ✓ Ninguna prueba supera su tope. La deuda no ha crecido.');
  L.push('  Bajar los topes es el trabajo; llegar a 0 en todos es «terminado».');
}
L.push('──────────────────────────────────────────────────────────────────────');
console.log(L.join('\n'));

if (JSON_SALIDA) {
  fs.writeFileSync(JSON_SALIDA, JSON.stringify({ cuenta, topes: TOPES, infra, medidas: medidas.map((m) => ({ motor: m.motor, w: m.w, idioma: m.idioma, alto: m.alto, tinta: m.tinta, filas: m.filas, soporta: m.soporta, portada: m.portada })) }, null, 2));
  console.log('[sistema] JSON en ' + JSON_SALIDA);
}
process.exit(SIN_TOPES ? 0 : (fallos ? 1 : 0));
