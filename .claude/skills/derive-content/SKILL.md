---
name: derive-content
description: "Deriva piezas de difusión a partir de un reporte de research o una lección de SmartFinance.lat: post de LinkedIn EN/ES, 5 guiones de TikTok, carrusel de Instagram, issue del boletín y checklist de publicación. Úsalo cuando una pieza ya está publicada o lista y hay que convertirla en contenido para redes y newsletter sin inventar cifras."
---

# Derive content

Entrada: `content/research/<empresa>/report.{en,es}.mdx` (o una lección). Salida: `content/research/<empresa>/derivatives/`. Regla única: **toda cifra citada existe en la pieza de origen con su fuente y fecha**; nada nuevo se calcula aquí. Jaime graba, ajusta el tono y publica; esto son borradores.

## Pasos

1. **Leer la fuente** y extraer: tesis en 1 línea, 3 hallazgos con cifra + fuente, rango de valor por escenario, 3 riesgos, fecha de datos, gráficas disponibles (SVG → PNG con sharp).
2. **LinkedIn** → `linkedin.en.md` y `linkedin.es.md`: gancho de 1 línea, 3 hallazgos con cifras citadas (fuente entre paréntesis), 1 gráfica PNG, disclosure breve ("análisis educativo, no recomendación; datos al DD-MM-AAAA; IA usada para datos y redacción, tesis y supuestos míos"), CTA al reporte. ≤ 1 300 caracteres.
3. **TikTok ×5** → `tiktok/01-company-explained.md … 05-my-thesis.md`. Temas fijos: company explained · what happened · financial performance · valuation · my thesis. Cada guion: 45–60 s, gancho en los primeros 3 s, texto en pantalla por plano, fuente visible en pantalla cuando aparece una cifra, lista de b-roll, CTA final. Lenguaje de Jaime (primera persona, sin jerga sin explicar).
4. **Carrusel IG** → `carousel/` con 8–10 láminas (`01.md … 10.md` + PNG 1080×1350 cuando haya plantilla): portada con la pregunta, 1 idea por lámina, última lámina = "qué me haría cambiar de opinión" + CTA + disclaimer corto.
5. **Newsletter** → `newsletter.md`: issue especial (asunto, preheader, 3 bloques: por qué esta empresa, los 3 números, qué sigue; enlace al reporte; la gráfica del dólar sigue yendo como siempre). Probar con `/api/send-newsletter?dry=1`.
6. **Checklist de publicación** → `publish-checklist.md`:
   - [ ] Cifras cruzadas contra el reporte (misma fecha de datos)
   - [ ] Fuente visible en cada cifra (texto o pantalla)
   - [ ] Disclaimer educativo + "no es recomendación" en cada pieza
   - [ ] Disclosure de IA (qué hizo Claude, qué hizo Jaime)
   - [ ] Sin datos de Twelve Data (sin derechos de redistribución); citar EDGAR/Yahoo/Stooq/Banxico
   - [ ] Imágenes ≤ 200 KB, alt text, marca Smart Finance
   - [ ] Fechas y plataforma en `docs/calendar.md`; métricas a capturar (impresiones, vistas, guardados) en `docs/kpis/`
   - [ ] Revisado y aprobado por Jaime
7. Resumir en el PR qué se generó y qué falta grabar/revisar.
