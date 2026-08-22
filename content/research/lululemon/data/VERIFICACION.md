# Verificación manual de `financials.json` (LULU)

**Fecha:** 21 ago 2026 · **Quién:** IA (agente finanzas), pendiente de que Jaime repita el ejercicio con el PDF del 10-K.

**Fuente primaria comparada:** 10-K de lululemon athletica inc. por el año fiscal cerrado el 1-feb-2026, presentado el 17-mar-2026, accession `0001397187-26-000020`. Tablas del visor XBRL de EDGAR:
- Estado de resultados: https://www.sec.gov/Archives/edgar/data/1397187/000139718726000020/R5.htm
- Balance: https://www.sec.gov/Archives/edgar/data/1397187/000139718726000020/R3.htm
- Flujo de caja: https://www.sec.gov/Archives/edgar/data/1397187/000139718726000020/R7.htm
- Documento completo: https://www.sec.gov/Archives/edgar/data/1397187/000139718726000020/lulu-20260201.htm

| Concepto (FY2025, cierre 2026-02-01) | 10-K (miles USD) | `financials.json` (USD) | Diferencia |
|---|---|---|---|
| Net revenue | 11,102,600 | 11,102,600,000 | 0 |
| Income from operations | 2,210,615 | 2,210,615,000 | 0 |
| Net income | 1,579,183 | 1,579,183,000 | 0 |
| Purchase of property and equipment (capex) | (680,802) | 680,802,000 | 0 |
| Cash and cash equivalents, end of period | 1,807,202 | 1,807,202,000 | 0 |
| Diluted weighted-average shares (miles) | 119,068 | 119,068,000 | 0 |
| Total stockholders' equity | 4,961,840 | 4,961,840,000 | 0 |

También cuadran contra el mismo 10-K: gross profit 6,284,132; income tax expense 659,784; D&A 496,228; SBC 62,203; CFO 1,602,477; recompras 1,178,349 (todo en miles).

**Notas:**
- La caja viene del tag `CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents` porque LULU dejó de etiquetar `CashAndCashEquivalentsAtCarryingValue` en sus 10-K desde FY2019; el 10-K lo presenta como "Cash and cash equivalents" (1,807.2 M), así que para LULU son equivalentes. El documento de estrategia traía 1,514.7 M como caja de FY2025: esa cifra **no** es la del 10-K (probablemente es de un trimestre posterior o de otra fuente); usar 1,807.2 M para el cierre fiscal y la caja del 10-Q más reciente para la valuación.
- `fy` sigue la convención de la empresa: el año cerrado el 1-feb-2026 es "fiscal 2025" (stockanalysis lo llama FY2026). Siempre etiquetar por fecha de cierre.
- Deuda financiera: no existen tags `LongTermDebt*` para LULU; `ShortTermBorrowings` = 0 hasta FY2024 y `OtherBorrowings` = 0 en FY2025. Se registra 0 con `debtTagsFound` vacío en FY2025 (coherente con el 10-K: línea de crédito revolvente sin disponer).
- Pendiente de verificar por Jaime: las cifras de los años FY2019–FY2023 contra sus 10-K originales (el script toma el valor del filing más reciente que las reporta, que puede incluir reexpresiones).
