// Punto de partida del laboratorio de DCF y traducción entre los controles de
// la página y los supuestos que entiende src/lib/finance/dcf.mjs.
//
// REGLA DE AUTORÍA (content/research/lululemon/README.md): los supuestos del
// REPORTE los escribe Jaime en model.json → dcf.assumptions, con su razón en
// dcf.rationale. Mientras estén en null, el laboratorio necesita alguna
// posición inicial para los controles, y esa posición NO es una opinión: es
// UNA SOLA REGLA MECÁNICA — "el último año fiscal reportado, congelado cinco
// años" — aplicada a los datos ya verificados contra el 10-K. Cada valor de
// arranque viene con la división exacta de la que sale (`derivation`) para que
// se pueda auditar en la propia página.
//
// Las dos excepciones, marcadas como tales en la página:
//   - g terminal: 2.0 %, la meta de inflación de largo plazo de la Fed en
//     dólares. Es una convención, no un pronóstico.
//   - beta: 1.00, el promedio del mercado por definición (no la beta de LULU,
//     que es uno de los TODO de sources.yaml).
// rf y ERP sí son datos con fuente y fecha: model.json → dcf.assumptions.wacc.

const round = (x, d = 1) => Math.round(x * 10 ** d) / 10 ** d;

/** Convención documentada: g terminal de arranque y beta de arranque. */
export const CONVENTION = { terminalG: 2, beta: 1 };

/**
 * Posición inicial de los controles a partir del histórico verificado.
 * Devuelve { controls, assumptions, derivation, baseRow }.
 */
export function labStart(model) {
  const hist = model.historical || [];
  const last = hist[hist.length - 1];
  const prev = hist[hist.length - 2];
  if (!last || !prev) throw new Error('labStart: hacen falta al menos dos años en historical');

  const growth = round(((last.revenue / prev.revenue) - 1) * 100);
  const margin = round((last.ebitda / last.revenue) * 100);
  const da = round((last.da / last.revenue) * 100);
  const capex = round((last.capex / last.revenue) * 100);
  const tax = round((last.taxExpense / last.pretaxIncome) * 100);

  const w = model.dcf?.assumptions?.wacc || {};
  const rf = typeof w.rf === 'number' ? w.rf : null;
  const erp = typeof w.erp === 'number' ? w.erp : null;
  const wacc = rf !== null && erp !== null ? round(rf + CONVENTION.beta * erp) : 9;

  const controls = {
    g1: growth,          // crecimiento de ingresos, años 1–2
    g2: growth,          // crecimiento de ingresos, años 3–5
    m: margin,           // margen EBITDA (plano)
    w: wacc,             // WACC
    g: CONVENTION.terminalG, // g terminal
    da, capex,
    nwc: 0,              // Δ capital de trabajo como % del Δ ventas
    tax,
    t: 'gordon',         // tipo de valor terminal
    x: 12                // múltiplo de salida EV/EBITDA (solo si t = exit-multiple)
  };

  const derivation = {
    g1: { code: 'lastYear', detail: `${fmt(last.revenue)} / ${fmt(prev.revenue)} − 1`, fy: last.fy },
    g2: { code: 'lastYear', detail: `${fmt(last.revenue)} / ${fmt(prev.revenue)} − 1`, fy: last.fy },
    m: { code: 'lastYear', detail: `${fmt(last.ebitda)} / ${fmt(last.revenue)}`, fy: last.fy },
    w: { code: 'wacc', detail: `${rf} + ${CONVENTION.beta.toFixed(2)} × ${erp}`, fy: null },
    g: { code: 'convention', detail: '2.0 %', fy: null },
    da: { code: 'lastYear', detail: `${fmt(last.da)} / ${fmt(last.revenue)}`, fy: last.fy },
    capex: { code: 'lastYear', detail: `${fmt(last.capex)} / ${fmt(last.revenue)}`, fy: last.fy },
    nwc: { code: 'noData', detail: '0', fy: null },
    tax: { code: 'lastYear', detail: `${fmt(last.taxExpense)} / ${fmt(last.pretaxIncome)}`, fy: last.fy }
  };

  return { controls, assumptions: toAssumptions(controls, model), derivation, baseRow: last };
}

function fmt(n) {
  return typeof n === 'number' ? n.toLocaleString('en-US', { maximumFractionDigits: 1 }) : '—';
}

/** ¿Jaime ya escribió los supuestos del reporte? (todos los campos con valor). */
export function hasAuthorAssumptions(model) {
  const a = model?.dcf?.assumptions;
  if (!a) return false;
  const num = (x) => typeof x === 'number' && Number.isFinite(x);
  if (!Array.isArray(a.revenueGrowthPct) || !a.revenueGrowthPct.every(num)) return false;
  if (!Array.isArray(a.ebitdaMarginPct) || !a.ebitdaMarginPct.every(num)) return false;
  for (const k of ['daPctRevenue', 'capexPctRevenue', 'nwcPctDeltaRevenue', 'taxRatePct']) if (!num(a[k])) return false;
  if (!num(a.wacc?.wacc)) return false;
  if (!a.terminal?.type) return false;
  return true;
}

/** Controles equivalentes a los supuestos que escribió Jaime (o null). */
export function authorControls(model) {
  if (!hasAuthorAssumptions(model)) return null;
  const a = model.dcf.assumptions;
  const g = a.revenueGrowthPct;
  const m = a.ebitdaMarginPct;
  return {
    g1: g[0], g2: g[g.length - 1], m: m[0],
    w: a.wacc.wacc, g: a.terminal.g ?? CONVENTION.terminalG,
    da: a.daPctRevenue, capex: a.capexPctRevenue, nwc: a.nwcPctDeltaRevenue, tax: a.taxRatePct,
    t: a.terminal.type, x: a.terminal.exitMultipleEVEBITDA ?? 12
  };
}

/** Controles → supuestos de dcf.mjs. Fase 1 = años 1–2, fase 2 = años 3–5. */
export function toAssumptions(c, model) {
  const years = model?.dcf?.horizonYears || 5;
  const phase1 = Math.min(2, years);
  const growth = Array.from({ length: years }, (_, i) => (i < phase1 ? c.g1 : c.g2));
  const margins = Array.from({ length: years }, () => c.m);
  const base = model?.dcf?.assumptions?.wacc || {};
  return {
    revenueGrowthPct: growth,
    ebitdaMarginPct: margins,
    daPctRevenue: c.da,
    capexPctRevenue: c.capex,
    nwcPctDeltaRevenue: c.nwc,
    taxRatePct: c.tax,
    sbcTreatment: model?.dcf?.assumptions?.sbcTreatment ?? null,
    terminal: { type: c.t, g: c.g, exitMultipleEVEBITDA: c.x },
    wacc: { ...base, wacc: c.w }
  };
}

/** Modelo listo para runDCF con los controles actuales (no muta el original). */
export function modelWith(model, controls, extras = {}) {
  const nd = model.dcf?.netDebtAtValuation || {};
  const base = (model.historical || [])[(model.historical || []).length - 1] || {};
  return {
    ...model,
    meta: { ...model.meta, sharesDiluted: model.meta?.sharesDiluted ?? base.dilutedShares ?? null },
    dcf: {
      ...model.dcf,
      assumptions: toAssumptions(controls, model),
      netDebtAtValuation: {
        asOf: nd.asOf ?? base.periodEnd ?? null,
        cash: typeof nd.cash === 'number' ? nd.cash : (base.cash ?? 0),
        financialDebt: typeof nd.financialDebt === 'number' ? nd.financialDebt : (base.financialDebt ?? 0),
        leasesIncluded: nd.leasesIncluded === true,
        operatingLeases: base.operatingLeases ?? 0,
        minorities: nd.minorities ?? 0,
        preferred: nd.preferred ?? 0
      }
    },
    ...extras
  };
}

// --- Enlace con mis supuestos ----------------------------------------------
export const PARAM_KEYS = ['g1', 'g2', 'm', 'w', 'g', 'da', 'capex', 'nwc', 'tax', 't', 'x'];

/** Controles → query string corta (solo lo que difiere del arranque). */
export function encodeControls(controls, start) {
  const p = new URLSearchParams();
  for (const k of PARAM_KEYS) {
    const v = controls[k];
    if (v === undefined || v === null) continue;
    if (start && String(start[k]) === String(v)) continue;
    p.set(k, typeof v === 'number' ? String(round(v, 2)) : String(v));
  }
  return p.toString();
}

/** Query string → controles, cayendo al arranque en lo que falte o no valga. */
export function decodeControls(search, start, limits = LIMITS) {
  const p = typeof search === 'string' ? new URLSearchParams(search.replace(/^\?/, '')) : search;
  const out = { ...start };
  for (const k of PARAM_KEYS) {
    if (!p || !p.has(k)) continue;
    const raw = p.get(k);
    if (k === 't') { if (raw === 'gordon' || raw === 'exit-multiple') out.t = raw; continue; }
    const n = Number(raw);
    if (!Number.isFinite(n)) continue;
    const lim = limits[k];
    out[k] = lim ? Math.min(lim.max, Math.max(lim.min, n)) : n;
  }
  return out;
}

/** Rangos de los controles: acotan el enlace compartido y los sliders. */
export const LIMITS = {
  g1: { min: -10, max: 25, step: 0.5 },
  g2: { min: -10, max: 25, step: 0.5 },
  m: { min: 5, max: 35, step: 0.5 },
  w: { min: 6, max: 14, step: 0.1 },
  g: { min: 0, max: 4, step: 0.1 },
  da: { min: 0, max: 15, step: 0.1 },
  capex: { min: 0, max: 20, step: 0.1 },
  nwc: { min: -20, max: 40, step: 1 },
  tax: { min: 0, max: 45, step: 0.5 },
  x: { min: 4, max: 30, step: 0.5 }
};
