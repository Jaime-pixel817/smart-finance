# Equity Research: lululemon athletica (LULU) — carpeta de trabajo

Estado: **borrador 0.1** (plantillas y datos; sin tesis ni supuestos todavía). Autor: Jaime Sandoval. La IA es herramienta, no autora: ver `meta.yaml → aiDisclosure`.

## Qué hay aquí

| Archivo | Qué es | Quién lo llena |
|---|---|---|
| `data/financials.json` | 7 años de 10-K + 8 trimestres de 10-Q bajados de SEC EDGAR (`node scripts/edgar-facts.mjs 0001397187 lululemon`) | IA (script); Jaime lo concilia con su hoja de cálculo |
| `data/VERIFICACION.md` | Qué cifras se compararon contra el 10-K, fuente, fecha y diferencias | IA hizo FY2025; Jaime repite con FY2019–FY2024 |
| `meta.yaml` | Ticker, CIK, moneda, fecha y precio del análisis, versión, disclosure de IA | Jaime (fecha, precio, versión) |
| `sources.yaml` | Filings reales (10-K, 10-Q, 8-K) con accession y URL; `TODO` = transcripción, proxy, precio/beta, comps | Jaime cierra los TODO |
| `model.json` | El JSON único del reporte (esquema de la sección C del plan): histórico ← financials.json; `dcf.assumptions` en `null` con `rationale: "ESCRIBE AQUÍ POR QUÉ (Jaime)"`; comps propuestos con valores `null`; `thesis` vacía; `outputs` los calcula `src/lib/finance/dcf.mjs` | **Jaime** escribe todos los supuestos y textos; la IA solo calcula `outputs` |

Regla: el DCF, las tablas y las gráficas del reporte leen **el mismo** `model.json`. Si un número no sale de ahí, no va en el reporte.

## Flujo de 3 semanas (resumen de la sección B del plan)

**Semana 1 — leer y entender.** Jaime lee el 10-K (Item 1 negocio, 1A riesgos, 7 MD&A) y la última llamada de resultados, toma notas a mano y arma **su propia hoja de cálculo** con el histórico (tiene que poder explicar cada celda); después la concilia con `data/financials.json`. La IA, mientras: baja EDGAR → JSON (hecho), prepara tablas/gráficas y genera preguntas de estudio *después* de que Jaime leyó.

**Semana 2 — supuestos.** Jaime llena `model.json → dcf.assumptions` y cada `rationale` con su razón en una línea (crecimiento, margen, capex, impuestos, WACC, g); elige los comparables y escribe por qué entra/sale cada uno; fija bear/base/bull con probabilidades. La IA calcula DCF, sensibilidad WACC×g y escenarios, devuelve las alertas de sanidad (`sanityChecks`) y hace de abogado del diablo. Jaime ajusta y explica en voz alta "¿por qué este margen?".

**Semana 3 — escribir y publicar.** Jaime redacta los 10 bloques (resumen de una página, negocio, industria, 5 años de finanzas, palancas y management, riesgos rankeados, valuación como rango, escenarios, conclusión + "qué me haría cambiar de opinión", apéndice). Crítica cruzada: la IA ataca la tesis por escrito, Jaime responde por escrito. Diseño, publicación con fecha de datos y disclaimer, video de 3–5 min sin leer. Después: actualización trimestral con diff visible.

## Pruebas de autoría (para que nadie dude de quién hizo el reporte)

1. Commits con el nombre de Jaime y fechas; `rationale` escritos por él en `model.json`.
2. Video explicando la tesis sin guion.
3. *Decision log*: por qué LULU, por qué esos comps, qué cambió tras feedback.
4. Caja "Cómo se usó la IA" dentro del reporte (`aiDisclosure`).
5. Registro de errores corregidos entre versiones.
6. 10 preguntas difíciles publicadas con sus respuestas.
7. Hoja de cálculo de Jaime que cuadra con `financials.json` (la conciliación es la prueba).
8. Observaciones que una IA no puede tener: visita a tienda, precio de un leggings en MX vs CA, la app.

## Comandos

```bash
node scripts/edgar-facts.mjs 0001397187 lululemon          # regenera data/financials.json
node scripts/edgar-facts.mjs 0001397187 lululemon --dry    # solo imprime, no escribe
npm test                                                   # pruebas del motor DCF
```
