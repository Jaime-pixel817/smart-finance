// La ruta REAL de una foto, con su huella de contenido.
//
// `node scripts/build-photos.mjs` escribe cada foto en
// public/assets/fotos/<nombre>.<huella>.<ext> y deja el mapa
// nombre lógico → ruta final en src/generated/photos.json (commiteado).
//
// POR QUÉ ESTA INDIRECCIÓN. vercel.json sirve /assets/fotos/* con
// `cache-control: immutable` durante un año, o sea que promete que ese URL no
// cambia nunca. Mientras los archivos se llamaron `breakdown-andy-toh.webp` a
// secas, esa promesa era mentira: se arregló el recorte, se desplegó, y el
// teléfono de Jaime siguió enseñando el recorte viejo hasta 2027 porque tenía
// ese URL guardado y `immutable` se salta hasta el recargar. Con huella, otra
// foto = otro URL, y el cambio llega a quien ya visitó el sitio.
//
// Escribir la ruta a pelo en una página vuelve a romperlo en silencio, así que
// no se hace: se llama a foto('breakdown-japan.webp').
//
// Y SI FALTA, SE CAE. Al revés que src/lib/og.ts —donde no tener la og:image
// propia solo significa caer en la genérica y por eso ahí se degrada— aquí no
// hay nada razonable que servir: un `<img>` roto no avisa a nadie y se
// descubre en producción. El build es local y obligatorio antes de subir
// (`npm run build`), así que el sitio para caerse es este.
import fotos from '../generated/photos.json';

const MAPA: Record<string, string> = fotos;

/**
 * @param nombre  nombre lógico con extensión, tal cual lo escribe
 *                scripts/build-photos.mjs: 'breakdown-japan.webp',
 *                'jaime-96.jpg', 'grupo-800.webp'.
 * @returns       la ruta absoluta del sitio, con huella:
 *                '/assets/fotos/breakdown-japan.5f3a91c2.webp'
 */
export function foto(nombre: string): string {
  const ruta = MAPA[nombre];
  if (!ruta) {
    throw new Error(
      'foto(): "' + nombre + '" no está en src/generated/photos.json. ' +
      'Corre `node scripts/build-photos.mjs` y commitea el manifiesto junto con public/assets/fotos/. ' +
      'Disponibles: ' + Object.keys(MAPA).join(', ')
    );
  }
  return ruta;
}
