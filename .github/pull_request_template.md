## Qué cambia

<!-- Una o dos frases. Enlaza el issue o la sección del plan (docs/) si aplica. -->

## Cómo probar

<!-- Comandos, URL de preview o capturas (390 / 768 / 1280 px si hay UI). -->

## Checklist pre-deploy (★ = lo verifica CI; el resto lo firma quien abre el PR)

Push a `main` = producción. No se mergea con casillas sin marcar; si una no aplica, explica por qué.

- [ ] ★ `npm run check-es` verde (`/es` y `sitemap.xml` regenerados, nunca editados a mano)
- [ ] ★ Enlaces internos sin 404 (lychee)
- [ ] ★ `npm run check-seo`: títulos y descripciones únicos, hreflang, sitemap y HTML de acuerdo, JSON-LD sin `@id` colgando, robots.txt sin tapar el sitemap, `api/*.js` en 12
- [ ] ★ `npm run check-lh`: rendimiento ≥ 88 y a11y ≥ 95 en móvil, CLS ≤ 0.02, JS ≤ 180 KB en las seis rutas principales
- [ ] Si tocaste una ruta que NO está en `lighthouserc.json`, mide esa a mano y pega los números
- [ ] Paridad EN/ES y hreflang en/es/x-default; nav actualizado en las 9 páginas inglesas si cambió
- [ ] Cada cifra con fuente y `asOf`; "retraso" o "último cierre" donde aplique; nunca "en vivo"
- [ ] Atribución de proveedores (TradingView, CoinGecko, Yahoo, Twelve Data, Banxico); ningún símbolo nuevo en `/api/markets`
- [ ] Opinión marcada como tesis, dato como dato; disclaimer educativo + "no es recomendación" en cada página financiera
- [ ] Disclosure de IA donde intervino ("Why it matters — AI-assisted"; en research, qué hizo Claude y qué hizo Jaime)
- [ ] Ningún dato inventado (si falta, se dice)
- [ ] a11y: skip-link, roles, contraste **en los dos temas y en los estados apagados**, foco visible (y sin recortar dentro de un carril con `overflow`), `prefers-reduced-motion`, alt text
- [ ] Fecha `updated` real en frontmatter y sitemap
- [ ] og:image (EN y ES) y JSON-LD válidos
- [ ] Sin secretos en el diff (`.env*`, API keys); nada interno servido (`.vercelignore`)
- [ ] Si añadiste una superficie que valga la pena medir, ¿lleva su evento? Once y solo once (`src/lib/analytics.ts`), sin datos personales y documentado en `/methodology`
