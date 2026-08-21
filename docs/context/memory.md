# Memoria del proyecto — decisiones de arquitectura

Fuente: `docs/2026-08-21-estrategia/` (auditoría + documento "Smart Finance 2.0" + plan maestro del 2026-08-21). Cada línea es una decisión tomada; lo que sigue abierto está marcado como pendiente.

- **Stack:** migrar a **Astro 6 estático** (sin adapter) + islas Preact solo donde hay interacción + MDX con content collections e i18n nativo; la carpeta `/api` (serverless CommonJS en Vercel, Upstash, Resend) se queda **intacta**. Next.js descartado (sobre-ingeniería sin auth/usuarios).
- **Migración incremental:** legacy se mueve a `public/` el día 1; cada página legacy se borra en el mismo PR en que nace su versión Astro con la **misma URL**; `build-es.js` queda congelado desde ese momento y se elimina al migrar la última página.
- **Eliminar el globo 3D**: fuera three.js, `assets/risk-sphere.js`, `assets/geoMasks.js` y `desktop-check.png` (decorativo, ~722 KB, Lighthouse móvil 51).
- **Navegación móvil:** bottom tab bar (56 px + safe-area); lienzo de diseño 375–430 px primero, escritorio = ensanchar a 12 columnas.
- **Gráficas:** **Lightweight Charts v5** (isla perezosa, atribución a TradingView) para todo precio/historial; **SVG propio** generado en build para sparklines, financieros del research y módulos de aprendizaje; Chart.js se retira.
- **Datos:** caché **compartida en Redis** (Upstash) para `/api` + **registro de símbolos** (capa `api/_lib/providers/`: Yahoo → Stooq EOD → Twelve Data) con degradación honesta "último cierre". Nunca "en vivo"; toda cifra con fuente + `asOf`.
- **Research:** hub `/research` (misma ruta en EN y ES) + un Equity Research Report interactivo (DCF editable, sensibilidad, comparables, fuentes numeradas, PDF). Contenido en `content/research/<empresa>/` (meta.yaml, sources.yaml, data/financials.json, model.json, report.{en,es}.mdx, derivatives/).
- **Primera empresa recomendada: Lululemon (NASDAQ: LULU)** — datos XBRL gratis vía EDGAR, origen Vancouver; Dollarama como reporte #2 (dic). **Pendiente: decisión de Jaime.**
- **Boletín:** recomendado pasar de diario a **semanal (domingo)** para no chocar con el tope de Resend (100/día). Pendiente: decisión de Jaime.
- **"My take" de noticias (IA):** renombrar a "Why it matters — AI-assisted" + disclosure; 1 take semanal escrito por Jaime.
- **Licencias:** código MIT; contenido editorial CC BY-NC-ND 4.0. **Analítica:** Vercel Web Analytics + Speed Insights. Modo claro: fase 2.
- **Gobernanza:** `main` protegido (PR obligatorio, CI requerido, historia lineal); CI en GitHub Actions (check-es, links, Lighthouse); healthcheck cada 6 h; plantilla de PR con el checklist pre-deploy; `/methodology` pública.
- **Roadmap:** 24-ago → 15-nov-2026 (MVP), con el research corriendo **en paralelo desde la semana 3** (7-sep); fase 2 del 16-nov al 15-ene-2027. Hitos duros: Actinver práctica 28-sep, reto real 5-oct → 13-nov; reporte publicado ≤ 30-oct (límite 15-nov); Rotman temprana 7-nov; suplementaria 1-dic; U of T límite 15-ene-2027.
