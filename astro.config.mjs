// Configuración de Astro para Smart Finance 2.0.
//
// Sitio ESTÁTICO sin adapter: Vercel lo detecta solo y sigue sirviendo las
// funciones CommonJS de /api tal cual (con adapter, la carpeta raíz /api deja
// de servirse). El sitio legacy vive en public/ y Astro lo copia a dist/ sin
// tocarlo; cada página legacy se borra de public/ en el PR en que nace su
// versión Astro con la misma URL.
//
// MDX: las lecciones viven en src/content/lessons/{en,es}/*.mdx (content
// collection tipada en src/content.config.ts) y usan componentes como <Term>
// (glosario al tacto) y <CompoundCalculator /> desde el propio texto.
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://smartfinance.lat',
  output: 'static',
  // Coincide con vercel.json (cleanUrls + trailingSlash:false): /market ->
  // dist/market.html y nunca /market/.
  trailingSlash: 'never',
  build: { format: 'file' },
  i18n: {
    locales: ['en', 'es'],
    defaultLocale: 'en',
    routing: { prefixDefaultLocale: false }
  },
  integrations: [preact(), mdx()],
  vite: {
    build: { assetsInlineLimit: 0 }
  }
});
