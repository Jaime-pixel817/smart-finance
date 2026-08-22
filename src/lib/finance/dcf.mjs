// Motor de DCF (flujo de caja libre desapalancado) de SmartFinance.lat.
// Modulo ESM puro, sin dependencias. Formulas de la seccion C del plan
// (docs/2026-08-21-estrategia/01-agente-finanzas-y-datos.md).
//
// Convenciones: porcentajes en puntos (4.5 = 4.5 %); montos en las unidades
// que traiga el modelo (USD millones en model.json); acciones en millones si
// los montos van en millones.

const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const pct = (p) => p / 100;

/**
 * Proyecta el UFCF ano por ano.
 * assumptions: { revenueGrowthPct[], ebitdaMarginPct[], daPctRevenue, capexPctRevenue,
 *                nwcPctDeltaRevenue, taxRatePct, sbcTreatment?: 'expense'|'addback', sbcPctRevenue? }
 * base: { revenue } del ano base (FY0).
 * Devuelve [{ year, revenue, ebitda, da, ebit, nopat, capex, deltaNwc, sbc, ufcf }]
 */
export function projectUFCF(assumptions, base) {
  const a = assumptions;
  if (!a || !Array.isArray(a.revenueGrowthPct) || !Array.isArray(a.ebitdaMarginPct)) {
    throw new Error('projectUFCF: faltan revenueGrowthPct[] o ebitdaMarginPct[]');
  }
  if (a.revenueGrowthPct.length !== a.ebitdaMarginPct.length) {
    throw new Error('projectUFCF: revenueGrowthPct y ebitdaMarginPct deben tener el mismo largo');
  }
  for (const k of ['daPctRevenue', 'capexPctRevenue', 'nwcPctDeltaRevenue', 'taxRatePct']) {
    if (!isNum(a[k])) throw new Error(`projectUFCF: supuesto ${k} no es numero (${a[k]})`);
  }
  if (!base || !isNum(base.revenue)) throw new Error('projectUFCF: base.revenue no es numero');

  const rows = [];
  let prevRevenue = base.revenue;
  for (let i = 0; i < a.revenueGrowthPct.length; i++) {
    const g = a.revenueGrowthPct[i];
    const m = a.ebitdaMarginPct[i];
    if (!isNum(g) || !isNum(m)) throw new Error(`projectUFCF: supuesto nulo en el ano ${i + 1}`);
    const revenue = prevRevenue * (1 + pct(g));
    const ebitda = revenue * pct(m);
    const da = revenue * pct(a.daPctRevenue);
    const ebit = ebitda - da;
    const nopat = ebit * (1 - pct(a.taxRatePct));
    const capex = revenue * pct(a.capexPctRevenue);
    const deltaNwc = (revenue - prevRevenue) * pct(a.nwcPctDeltaRevenue);
    const sbc = a.sbcTreatment === 'expense' && isNum(a.sbcPctRevenue) ? revenue * pct(a.sbcPctRevenue) : 0;
    const ufcf = nopat + da - capex - deltaNwc - sbc;
    rows.push({ year: i + 1, revenue, ebitda, da, ebit, nopat, capex, deltaNwc, sbc, ufcf });
    prevRevenue = revenue;
  }
  return rows;
}

/** Factor de descuento del ano t (1-indexado). midYear => exponente t - 0.5. */
export function discountFactor(t, waccPct, midYear = true) {
  return 1 / Math.pow(1 + pct(waccPct), midYear ? t - 0.5 : t);
}

/**
 * Descuenta una serie de UFCF. Acepta numeros o filas de projectUFCF.
 * Devuelve { pv, factors[], pvByYear[] }.
 */
export function discount(ufcf, waccPct, midYear = true) {
  if (!isNum(waccPct)) throw new Error('discount: wacc no es numero');
  const flows = ufcf.map((x) => (isNum(x) ? x : x.ufcf));
  const factors = flows.map((_, i) => discountFactor(i + 1, waccPct, midYear));
  const pvByYear = flows.map((f, i) => f * factors[i]);
  return { pv: pvByYear.reduce((s, x) => s + x, 0), factors, pvByYear };
}

/**
 * Valor terminal (sin descontar).
 * type 'gordon': UFCF_N (1+g) / (WACC - g); type 'exit-multiple': EBITDA_N x multiplo.
 */
export function terminalValue({ type, g, exitMultiple }, lastUFCF, lastEBITDA, waccPct) {
  if (type === 'gordon') {
    if (!isNum(g) || !isNum(waccPct)) throw new Error('terminalValue: g o wacc no es numero');
    if (g >= waccPct) throw new Error(`terminalValue: g (${g}) debe ser menor que WACC (${waccPct})`);
    return (lastUFCF * (1 + pct(g))) / (pct(waccPct) - pct(g));
  }
  if (type === 'exit-multiple') {
    if (!isNum(exitMultiple)) throw new Error('terminalValue: exitMultiple no es numero');
    return lastEBITDA * exitMultiple;
  }
  throw new Error(`terminalValue: tipo desconocido "${type}"`);
}

/** Multiplo EV/EBITDA implicito por un TV Gordon (para cotejar con comps). */
export function impliedExitMultiple(tv, lastEBITDA) {
  return lastEBITDA ? tv / lastEBITDA : null;
}

/** g implicito por un TV de multiplo: g = (TV·WACC − UFCF) / (TV + UFCF). */
export function impliedGrowth(tv, lastUFCF, waccPct) {
  const w = pct(waccPct);
  return ((tv * w - lastUFCF) / (tv + lastUFCF)) * 100;
}

/** Equity = EV − deuda financiera + caja − minoritarios − preferentes. netDebt puede ser numero o desglose. */
export function enterpriseToEquity(ev, netDebt) {
  if (isNum(netDebt)) return ev - netDebt;
  const { cash = 0, financialDebt = 0, minorities = 0, preferred = 0, leasesIncluded = false, operatingLeases = 0 } = netDebt || {};
  // Bajo US GAAP el EBITDA ya es post-renta: NO restar arrendamientos salvo que el modelo lo pida (IFRS 16).
  const leases = leasesIncluded ? operatingLeases : 0;
  return ev - financialDebt + cash - minorities - preferred - leases;
}

export function impliedPrice(equity, shares) {
  if (!isNum(shares) || shares <= 0) throw new Error('impliedPrice: acciones invalidas');
  return equity / shares;
}

/**
 * WACC = E/(D+E)·Ke + D/(D+E)·Kd·(1−τ); Ke = rf + β·ERP + prima pais/tamano.
 * weights: { equity, debt } (suman 1). Devuelve { costOfEquity, wacc, weights }.
 */
export function wacc({ rf, beta, erp, countryPremium = 0, kd = 0, taxRate = 0, weights }) {
  for (const [k, v] of Object.entries({ rf, beta, erp })) if (!isNum(v)) throw new Error(`wacc: ${k} no es numero`);
  const w = weights || { equity: 1, debt: 0 };
  if (Math.abs((w.equity ?? 0) + (w.debt ?? 0) - 1) > 1e-9) throw new Error('wacc: los pesos deben sumar 1');
  const costOfEquity = rf + beta * erp + countryPremium;
  const afterTaxKd = kd * (1 - pct(taxRate));
  return { costOfEquity, afterTaxKd, wacc: w.equity * costOfEquity + w.debt * afterTaxKd, weights: w };
}

/**
 * DCF completo. model: { dcf: { assumptions, midYear, netDebtAtValuation }, historical[], meta.sharesDiluted }
 * overrides: parches de escenario (se mezclan sobre assumptions, terminal incluido).
 */
export function runDCF(model, overrides = {}) {
  const a = mergeAssumptions(model.dcf.assumptions, overrides);
  const base = baseYear(model);
  const midYear = model.dcf.midYear !== false;
  const waccPct = a.wacc?.wacc;
  if (!isNum(waccPct)) throw new Error('runDCF: falta dcf.assumptions.wacc.wacc');
  const rows = projectUFCF(a, base);
  const { pv, factors } = discount(rows, waccPct, midYear);
  const last = rows[rows.length - 1];
  const tv = terminalValue({ type: a.terminal.type, g: a.terminal.g, exitMultiple: a.terminal.exitMultipleEVEBITDA }, last.ufcf, last.ebitda, waccPct);
  const pvTV = tv * discountFactor(rows.length, waccPct, false); // sin mid-year en el TV
  const ev = pv + pvTV;
  const nd = model.dcf.netDebtAtValuation || {};
  const equity = enterpriseToEquity(ev, { ...nd, operatingLeases: nd.operatingLeases ?? base.operatingLeases ?? 0 });
  const shares = model.meta?.sharesDiluted ?? base.dilutedShares;
  const price = isNum(shares) && shares > 0 ? impliedPrice(equity, shares) : null;
  return {
    assumptions: a, rows, factors, pvExplicit: pv, tv, pvTV, ev, equity, shares, impliedPrice: price,
    tvShareOfEVPct: ev ? (pvTV / ev) * 100 : null,
    impliedExitMultiple: a.terminal.type === 'gordon' ? impliedExitMultiple(tv, last.ebitda) : a.terminal.exitMultipleEVEBITDA,
    impliedG: a.terminal.type === 'exit-multiple' ? impliedGrowth(tv, last.ufcf, waccPct) : a.terminal.g,
  };
}

/** Tabla 2D de precios implicitos: filas = WACC, columnas = g (solo Gordon). */
export function sensitivity(model, waccRange, gRange) {
  const prices = waccRange.map((w) => gRange.map((g) => {
    try {
      return runDCF(model, { wacc: { wacc: w }, terminal: { type: 'gordon', g } }).impliedPrice;
    } catch { return null; }
  }));
  return { waccPcts: waccRange, gPcts: gRange, prices };
}

/** Rango ±1 pp en pasos de 0.5 (WACC) y ±1 pp en pasos de 0.25 (g), como pide el plan. */
export function defaultRanges(waccPct, gPct) {
  const r = (c, step, n) => Array.from({ length: 2 * n + 1 }, (_, i) => +(c + (i - n) * step).toFixed(4));
  return { waccRange: r(waccPct, 0.5, 2), gRange: r(gPct, 0.25, 4) };
}

/** Valor ponderado por escenario: Σ prob_s · precio_s. Devuelve { byScenario, weightedPrice }. */
export function scenarioValues(model) {
  const byScenario = {};
  let weighted = 0;
  for (const [name, s] of Object.entries(model.scenarios || {})) {
    const r = runDCF(model, s.overrides || {});
    byScenario[name] = { prob: s.prob, impliedPrice: r.impliedPrice, ev: r.ev, tvShareOfEVPct: r.tvShareOfEVPct };
    weighted += (s.prob ?? 0) * (r.impliedPrice ?? 0);
  }
  return { byScenario, weightedPrice: weighted };
}

/**
 * Controles de sanidad. Devuelve [{ level: 'error'|'warn', code, message }].
 * Se puede llamar con el modelo crudo (antes de calcular) y con `result` de runDCF.
 * @param {any} model
 * @param {any} [result]
 */
export function sanityChecks(model, result = null) {
  const alerts = [];
  const push = (level, code, message) => alerts.push({ level, code, message });
  const a = model?.dcf?.assumptions || {};
  const waccPct = a.wacc?.wacc;
  const g = a.terminal?.g;
  const type = a.terminal?.type;

  // Supuestos nulos: no se puede calcular
  const missing = [];
  for (const k of ['daPctRevenue', 'capexPctRevenue', 'nwcPctDeltaRevenue', 'taxRatePct']) if (!isNum(a[k])) missing.push(k);
  if (!Array.isArray(a.revenueGrowthPct) || a.revenueGrowthPct.some((x) => !isNum(x))) missing.push('revenueGrowthPct');
  if (!Array.isArray(a.ebitdaMarginPct) || a.ebitdaMarginPct.some((x) => !isNum(x))) missing.push('ebitdaMarginPct');
  if (!isNum(waccPct)) missing.push('wacc.wacc');
  if (!type) missing.push('terminal.type');
  if (missing.length) push('error', 'MISSING_ASSUMPTIONS', `Supuestos sin valor: ${missing.join(', ')}`);

  // Rationale vacio o placeholder
  const rat = model?.dcf?.rationale || {};
  const pendientes = Object.entries(rat).filter(([, v]) => !v || /ESCRIBE AQU/i.test(String(v))).map(([k]) => k);
  if (pendientes.length) push('warn', 'RATIONALE_PENDING', `Falta la razon escrita de: ${pendientes.join(', ')}`);

  // WACC
  if (isNum(waccPct)) {
    if (waccPct < 6 || waccPct > 14) push('error', 'WACC_OUT_OF_RANGE', `WACC ${waccPct} % fuera de 6–14 %`);
    else if (waccPct < 7 || waccPct > 11) push('warn', 'WACC_UNUSUAL', `WACC ${waccPct} % fuera del rango tipico 7–11 %`);
  }
  // g
  if (type === 'gordon' && isNum(g)) {
    if (isNum(waccPct) && g >= waccPct) push('error', 'G_GE_WACC', `g (${g} %) debe ser menor que WACC (${waccPct} %)`);
    if (g > 3) push('warn', 'G_ABOVE_3', `g ${g} % > 3 % nominal en USD: justificar`);
    if (g < 0) push('warn', 'G_NEGATIVE', `g negativa (${g} %)`);
  }
  // Probabilidades
  const sc = model?.scenarios;
  if (sc && Object.keys(sc).length) {
    const probs = Object.values(sc).map((s) => s.prob);
    if (probs.some((p) => !isNum(p))) push('warn', 'SCENARIO_PROB_MISSING', 'Hay escenarios sin probabilidad');
    else if (Math.abs(probs.reduce((s, p) => s + p, 0) - 1) > 1e-6) push('error', 'SCENARIO_PROB_SUM', `Las probabilidades suman ${probs.reduce((s, p) => s + p, 0).toFixed(3)}, no 1`);
  }
  // Margen proyectado vs maximo historico
  const hist = Array.isArray(model?.historical) ? model.historical : [];
  const histMargins = hist.filter((h) => isNum(h.ebitda) && isNum(h.revenue) && h.revenue > 0).map((h) => (h.ebitda / h.revenue) * 100);
  if (histMargins.length && Array.isArray(a.ebitdaMarginPct) && a.ebitdaMarginPct.every(isNum)) {
    const maxHist = Math.max(...histMargins);
    const maxProj = Math.max(...a.ebitdaMarginPct);
    if (maxProj > maxHist + 1e-9) {
      const hasReason = rat.ebitdaMarginPct && !/ESCRIBE AQU/i.test(String(rat.ebitdaMarginPct));
      push(hasReason ? 'warn' : 'error', 'MARGIN_ABOVE_RECORD', `Margen EBITDA proyectado ${maxProj.toFixed(1)} % supera el maximo historico ${maxHist.toFixed(1)} %${hasReason ? '' : ' sin razon escrita'}`);
    }
  }
  // Capex vs D&A con crecimiento
  if (isNum(a.capexPctRevenue) && isNum(a.daPctRevenue) && Array.isArray(a.revenueGrowthPct) && a.revenueGrowthPct.every(isNum)) {
    const growing = a.revenueGrowthPct.some((x) => x > 0);
    if (growing && a.capexPctRevenue < a.daPctRevenue) push('warn', 'CAPEX_BELOW_DA', `Capex ${a.capexPctRevenue} % < D&A ${a.daPctRevenue} % de ventas con crecimiento positivo`);
  }
  // Fecha de datos
  const asOf = model?.meta?.priceDate || model?.meta?.analysisDate;
  if (asOf) {
    const days = Math.round((Date.now() - new Date(asOf).getTime()) / 86400000);
    if (days > 90) push('warn', 'STALE_DATA', `Datos de hace ${days} dias (> 90): mostrar banner "desactualizado"`);
  }
  // Resultados
  if (result) {
    const s = result.tvShareOfEVPct;
    if (isNum(s)) {
      if (s > 80) push('error', 'TV_SHARE_HIGH', `El valor terminal es ${s.toFixed(1)} % del EV (> 80 %)`);
      else if (s < 50 || s > 75) push('warn', 'TV_SHARE_UNUSUAL', `El valor terminal es ${s.toFixed(1)} % del EV (fuera de 50–75 %)`);
    }
    if (isNum(result.impliedExitMultiple) && (result.impliedExitMultiple < 4 || result.impliedExitMultiple > 30)) {
      push('warn', 'EXIT_MULTIPLE_UNUSUAL', `Multiplo EV/EBITDA implicito ${result.impliedExitMultiple.toFixed(1)}x: cotejar con comps`);
    }
    const price = model?.meta?.priceAtAnalysis;
    const sens = result.sensitivity;
    if (isNum(price) && sens && sens.prices?.length) {
      const flat = sens.prices.flat().filter(isNum);
      if (flat.length && (price < Math.min(...flat) || price > Math.max(...flat))) {
        push('warn', 'PRICE_OUTSIDE_SENSITIVITY', `El precio de mercado ${price} cae fuera de la tabla de sensibilidad [${Math.min(...flat).toFixed(1)}, ${Math.max(...flat).toFixed(1)}]: explicar`);
      }
    }
  }
  return alerts;
}

// --- helpers ---------------------------------------------------------------
export function baseYear(model) {
  const hist = model.historical || [];
  const by = model.dcf?.baseYear;
  const row = (by && hist.find((h) => h.fy === by)) || hist[hist.length - 1];
  if (!row) throw new Error('baseYear: no hay historico');
  return row;
}

export function mergeAssumptions(base, overrides) {
  const out = { ...base, terminal: { ...(base?.terminal || {}) }, wacc: { ...(base?.wacc || {}) } };
  for (const [k, v] of Object.entries(overrides || {})) {
    if (k === 'terminal' || k === 'wacc') out[k] = { ...out[k], ...v };
    else out[k] = v;
  }
  return out;
}
