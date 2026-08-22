// Genera los íconos de las secciones del boletín: assets/email/*.png
//
// Se corre a mano (npm run build:email-icons) y el resultado se commitea. NO se
// genera en cada envío, y esa es toda la gracia:
//
//   - Los cuatro íconos son siempre los mismos. Dibujarlos en cada correo sería
//     gastar tiempo de función para producir bytes idénticos.
//   - Al ser ficheros estáticos los sirve Vercel desde su CDN, con una URL que
//     no cambia nunca. El proxy de imágenes de Gmail los guarda una vez y no
//     vuelve a pedirlos.
//   - Aquí sí conviene sharp, que ya estaba en el proyecto como dependencia de
//     desarrollo. Este script corre en esta máquina, no en producción, así que
//     sus 30 MB de binarios no viajan al paquete de ninguna función. La gráfica
//     del dólar, que sí hay que dibujar en cada envío, va por otro camino sin
//     dependencias (api/_lib/lienzo.js).
//
// Los trazos van en unidades del viewBox de 24 y se rasterizan a 32 px, para
// enseñarlos a 16 px en el correo: el doble, que es lo que hace que no se vean
// borrosos en pantallas de alta densidad.

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const VERDE = '#0F8A5F';
const LADO = 32;

// Mismo grosor en los cuatro y remates redondos: es lo que hace que se lean
// como un juego y no como cuatro íconos sueltos.
const TRAZO = 1.6;

// Sin una sola letra dentro. Un ícono con texto se rasteriza con las fuentes
// que haya en la máquina que lo genere, y además metería información en una
// imagen que la mitad de los clientes de correo no va a cargar.
const ICONOS = {
  // Para arrancar el día: un amanecer.
  consejo: `
    <path d="M3 18.5h18"/>
    <path d="M7 18.5a5 5 0 0 1 10 0"/>
    <path d="M12 3.5v2.2"/>
    <path d="M5.4 7.2 6.9 8.7"/>
    <path d="M18.6 7.2 17.1 8.7"/>
  `,
  // La noticia de hoy: un periódico con su bloque de foto.
  noticia: `
    <rect x="3" y="5" width="18" height="14" rx="2"/>
    <path d="M6.5 9h6"/>
    <path d="M6.5 12h6"/>
    <path d="M6.5 15h4"/>
    <rect x="15" y="9" width="3.5" height="6" rx="0.6"/>
  `,
  // Así amaneció el dólar: una moneda.
  dolar: `
    <circle cx="12" cy="12" r="8.5"/>
    <path d="M12 6.6v10.8"/>
    <path d="M14.6 9.5c0-1.05-1.15-1.7-2.6-1.7s-2.6.7-2.6 1.9c0 2.7 5.2 1.5 5.2 4.1 0 1.2-1.15 1.9-2.6 1.9s-2.6-.7-2.6-1.75"/>
  `,
  // Hoy aprenderás: un libro abierto.
  leccion: `
    <path d="M12 7.2C10.5 5.9 8.6 5.3 6 5.3H3.8v11.4H6c2.6 0 4.5.6 6 1.9"/>
    <path d="M12 7.2c1.5-1.3 3.4-1.9 6-1.9h2.2v11.4H18c-2.6 0-4.5.6-6 1.9"/>
    <path d="M12 7.2v11.4"/>
  `
};

function svg(trazos) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${LADO}" height="${LADO}" viewBox="0 0 24 24"
    fill="none" stroke="${VERDE}" stroke-width="${TRAZO}" stroke-linecap="round" stroke-linejoin="round">
    ${trazos}
  </svg>`;
}

(async () => {
  const destino = path.join(__dirname, '..', 'public', 'assets', 'email');
  fs.mkdirSync(destino, { recursive: true });

  for (const nombre of Object.keys(ICONOS)) {
    const salida = path.join(destino, nombre + '.png');
    // Fondo transparente: uno de los cuatro se apoya sobre el bloque tintado
    // del arranque y los otros tres sobre blanco. Con paleta, porque son dos
    // colores y una rampa de suavizado: pesan una décima parte que en color
    // verdadero.
    const bytes = await sharp(Buffer.from(svg(ICONOS[nombre])))
      .png({ palette: true, compressionLevel: 9 })
      .toBuffer();
    fs.writeFileSync(salida, bytes);
    console.log(nombre.padEnd(10), bytes.length + ' bytes');
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
