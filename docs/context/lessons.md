# Lecciones — errores convertidos en reglas

- **Push a `main` = producción.** Vercel despliega directo. Todo cambio va por rama + PR; nunca `git push origin main` sin CI verde y checklist.
- **Nunca editar `/es` ni `sitemap.xml` a mano.** Se generan con `npm run build:es`; `npm run check-es` falla si quedaron desactualizados. Cuando llegue Astro, `build-es.js` queda congelado (reescribe los fuentes EN in place).
- **`path` es una variable especial en zsh** (alias de `$PATH`). No usar `path=` en scripts ni en comandos sueltos de la shell: rompe el PATH de la sesión. Usar `ruta`, `file_path`, etc.
- **Twelve Data free no permite display público** sin el *Redistribution Rights Add-On* (Terms §2.3) y es solo no comercial. Etiquetar siempre fuente/retraso, no exponer endpoints a terceros y no añadir símbolos a `/api/markets` (cuota 672/800 créditos/día). Datos nuevos van por `/api/history` (Yahoo, caché 60 s).
- **Skills y plugins de Claude Code son por máquina.** Lo que está en `~/.claude/` no viaja con el repo: por eso `.claude/agents/` y `.claude/skills/` se versionan aquí y `superpowers` se instala con `claude plugin install superpowers@claude-plugins-official` en cada máquina nueva.
- **Headless Chrome tiene ancho mínimo 500 px.** Para comprobar móvil real (390 px) usar iframes locales de distintos anchos o Lighthouse con `--preset=mobile`; `resize_window` no sirve en la pestaña automatizada.
- El nav está duplicado en las 9 páginas inglesas (y `ARTICLE_I18N` en cada una): un cambio de nav se hace en TODAS, y luego `npm run build:es`.
