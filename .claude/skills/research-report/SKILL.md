---
name: research-report
description: "Prepara y revisa un Equity Research Report de SmartFinance.lat (estructura de 10 bloques, sources.yaml, financials.json, model.json, pruebas de autoría). Úsalo al arrancar el reporte de una empresa, al añadir una sección, al revisar que cada cifra tenga fuente, o al actualizarlo por trimestre. Jaime es el autor; Claude trae datos, calcula y critica."
---

# Research report

Fuente de verdad: `docs/2026-08-21-estrategia/01-agente-finanzas-y-datos.md` (secciones B y C) y `03-agente-planeacion.md` (C.1). Primera empresa recomendada: Lululemon (NASDAQ: LULU); Dollarama como reporte #2.

## Reparto no negociable
- **Jaime escribe**: la pregunta de tesis, qué hace la empresa y por qué gana, los comparables y su justificación, TODOS los supuestos del DCF con `rationale`, riesgos, bull/bear, conclusión y "qué me haría cambiar de opinión".
- **Claude hace**: bajar EDGAR → JSON, tablas y gráficas, calcular DCF/sensibilidades/escenarios, revisar claridad y consistencia, atacar la tesis, montar la página. Ninguna cifra sale de la IA sin fuente. Si un dato falta, se escribe "no lo sé".

## Pasos

1. **Estructura** — crear `content/research/<empresa>/` con:
   ```
   meta.yaml            ticker, nombre, moneda, sector, fecha de datos, versión, estado
   sources.yaml         id, título, URL o "10-K FY2025 p. X", fecha de acceso, qué cifra respalda
   data/financials.json 5 años: ingresos, margen bruto, op., neto, FCF, deuda, caja, acciones, ROIC…
   assumptions.json     supuestos del DCF con rationale (lo escribe Jaime)
   model.json           salida: DCF, WACC, sensibilidad WACC×g, comparables, escenarios
   report.en.mdx / report.es.mdx
   derivatives/         (lo llena derive-content)
   decision-log.md      por qué esta empresa, por qué estos comps, qué cambió tras feedback
   ```
2. **Datos** — `node scripts/edgar-facts.mjs <CIK>` → `data/financials.json` (EDGAR `companyfacts`, XBRL, 5 años). Cada campo lleva `source` (id de `sources.yaml`) y `asOf`. Jaime verifica 3 cifras contra el 10-K y lo anota en `decision-log.md`.
3. **Modelo** — leer `assumptions.json`; calcular DCF, WACC, sensibilidad WACC×g, múltiplos de comparables (con fecha y fuente) y valor por escenario bull/base/bear → `model.json`. El resultado es un **rango**, nunca un precio objetivo único. Devolver a Jaime las sensibilidades y preguntarle en voz alta "¿por qué este margen?".
4. **Redacción en 10 bloques** (10–12 páginas + apéndice, 4 000–5 500 palabras):
   1. Resumen de una página: tesis en 3 líneas, rango de valor por escenario, 3 catalizadores, 3 riesgos, fecha de datos, disclaimer.
   2. Qué hace y cómo gana dinero (segmentos, unit economics, regiones).
   3. Industria y competencia (el moat se demuestra con números: margen bruto, ROIC, ventas/tienda vs rivales).
   4. Desempeño financiero 5 años (6–8 ratios, no 30; tablas desde `financials.json`).
   5. Palancas de crecimiento y management (asignación de capital, incentivos).
   6. Riesgos rankeados (probabilidad × impacto, "cómo se vería en los números").
   7. Valuación: DCF con supuestos explícitos + sensibilidad + comparables → rango.
   8. Escenarios bull/base/bear con drivers, probabilidades y KPIs que los confirmarían.
   9. Conclusión + "qué me haría cambiar de opinión" + "qué aprendí".
   10. Apéndice: tabla de fuentes con fecha, JSON de supuestos, glosario, historial de versiones, disclosure de IA.
5. **Crítica cruzada** — Claude ataca la tesis (lista de objeciones y de lo que falta); Jaime responde por escrito; las respuestas van a "10 preguntas difíciles" del apéndice.
6. **QA cifra↔fuente** — tabla `cifra → fuente → verificada (sí/no)`; el DCF y la tabla histórica usan el mismo JSON; sello "Datos al DD-MM-AAAA, precio de cierre"; sección "Lo que no sé"; sin "Buy/Sell" (solo "escenario más probable"); disclaimer educativo.
7. **Pruebas de autoría** (todas antes de publicar): commits con nombre y fechas de Jaime; `assumptions.json` con `rationale` escrito por él; video de 3–5 min sin guion leído; `decision-log.md`; caja "Cómo se usó la IA" en el reporte; registro de errores corregidos (changelog); 10 preguntas difíciles con respuestas; hoja de cálculo de Jaime que cuadra con el JSON; observaciones que una IA no puede tener (visita a tienda, precio en MX vs CA, la app).
8. **Publicación** — `/research/<empresa>` en EN y ES (misma ruta), PDF, `updated` real, og:image, JSON-LD; pasar `pre-deploy-check`; luego `derive-content`.
9. **Actualización trimestral** — nueva versión en `meta.yaml`, diff visible en el changelog; la V1 equivocada y corregida vale más que una V1 perfecta.
