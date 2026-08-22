---
name: pre-deploy-check
description: "Checklist pre-deploy de SmartFinance.lat (sección 7 del documento Smart Finance 2.0). Úsalo antes de abrir o mergear cualquier PR a main: verifica build de /es, enlaces, presupuesto de rendimiento, paridad EN/ES, fuentes y asOf en cada cifra, disclaimers, disclosure de IA, a11y, fechas, og:image y JSON-LD, y deja el checklist firmado en el PR."
---

# Pre-deploy check

Push a `main` = producción en Vercel. Nada se mergea sin esta lista completa. ★ = lo verifica CI (`.github/workflows/ci.yml`); el resto lo verifica el agente `gestor` y lo firma en el PR (la plantilla en `.github/pull_request_template.md` ya trae la lista).

## Pasos

1. **Build y paridad** — `npm ci` y `npm run check-es` ★ (falla si `/es` o `sitemap.xml` quedaron desactualizados; nunca editar `/es` a mano). Cuando exista Astro: `astro check`, `vitest run`, `parity.test.ts`.
2. **Enlaces** — `lychee --offline './**/*.html'` ★: 0 enlaces internos rotos; revisar también el nav en las 9 páginas inglesas y el footer.
3. **Rendimiento** — Lighthouse móvil (`--preset=mobile`) en `/`, `/market`, una lección y `/research/<empresa>`: meta ≥ 90, LCP < 2.5 s, JS ≤ 150 KB gz, peso total < 600 KB. Hasta que haya Lighthouse CI, pegar los números en el PR. Sin globo 3D ni three.js.
4. **Datos honestos** — cada cifra con fuente y `asOf`; "retraso" o "último cierre" donde aplique (`assets/source.js`); nunca "en vivo"; atribución de proveedores (TradingView, CoinGecko, Yahoo, Twelve Data, Banxico); ningún símbolo nuevo en `/api/markets`.
5. **Opinión vs dato** — la opinión está marcada como tesis; disclaimer educativo + "no es recomendación" en el footer de toda página financiera; sin "Buy/Sell".
6. **Disclosure de IA** — los "takes" de noticias se llaman "Why it matters — AI-assisted"; en research se dice qué hizo Claude y qué hizo Jaime; ningún dato inventado (si falta, se dice).
7. **Accesibilidad** — skip-link, landmarks/roles, contraste AA, foco visible, `prefers-reduced-motion`, alt text; revisión en 390/768/1280 px con capturas (iframes locales; headless Chrome no baja de 500 px).
8. **SEO y metadatos** — fecha `updated` real en frontmatter y sitemap; canonical + hreflang en/es/x-default; og:image EN y ES (`npm run build:og`); JSON-LD válido; títulos/descripciones en ambos idiomas.
9. **Secretos y basura** — `git diff` sin API keys ni `.env*`; nada de `docs/`, `.claude/`, `scripts/` servido (`.vercelignore`); `ensayo.json` no va.
10. **Healthcheck** — tras el deploy, `curl -fsS` a `/api/markets`, `/api/news`, `/api/sparklines`, `/api/history?pair=USDMXN&range=1D` devuelven JSON (mismo check que `healthcheck.yml`).
11. **Firma** — marcar cada casilla de la plantilla del PR con cómo se verificó (comando, captura o enlace al run de Actions). Si algo no aplica, decir por qué. Si algo falla, el PR no se mergea.
