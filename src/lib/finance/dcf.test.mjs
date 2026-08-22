import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  projectUFCF, discount, discountFactor, terminalValue, enterpriseToEquity, impliedPrice, wacc,
  runDCF, sensitivity, defaultRanges, scenarioValues, sanityChecks, impliedExitMultiple, impliedGrowth, mergeAssumptions,
} from './dcf.mjs';

const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `esperaba ${b}, obtuve ${a}`);

// Ejemplo calculado a mano (ver comentarios): base 1000, un ano.
//   Rev1 = 1100; EBITDA = 330; D&A = 55; EBIT = 275; NOPAT = 206.25; capex = 55; dNWC = 10
//   UFCF = 206.25 + 55 - 55 - 10 = 196.25
const ONE_YEAR = { revenueGrowthPct: [10], ebitdaMarginPct: [30], daPctRevenue: 5, capexPctRevenue: 5, nwcPctDeltaRevenue: 10, taxRatePct: 25 };

test('projectUFCF: ejemplo de un ano calculado a mano', () => {
  const [r] = projectUFCF(ONE_YEAR, { revenue: 1000 });
  close(r.revenue, 1100); close(r.ebitda, 330); close(r.da, 55); close(r.ebit, 275);
  close(r.nopat, 206.25); close(r.capex, 55); close(r.deltaNwc, 10); close(r.ufcf, 196.25);
});

test('projectUFCF: el crecimiento se encadena ano a ano y SBC como gasto resta', () => {
  const rows = projectUFCF({ ...ONE_YEAR, revenueGrowthPct: [10, 10], ebitdaMarginPct: [30, 30], sbcTreatment: 'expense', sbcPctRevenue: 1 }, { revenue: 1000 });
  close(rows[1].revenue, 1210);
  close(rows[0].ufcf, 196.25 - 11); // SBC 1 % de 1100
});

test('projectUFCF: falla ruidosamente con supuestos nulos', () => {
  assert.throws(() => projectUFCF({ ...ONE_YEAR, taxRatePct: null }, { revenue: 1000 }), /taxRatePct/);
  assert.throws(() => projectUFCF({ ...ONE_YEAR, revenueGrowthPct: [null] }, { revenue: 1000 }), /ano 1/);
});

test('discount: factor fin de ano y mid-year', () => {
  close(discountFactor(1, 10, false), 1 / 1.1);
  close(discountFactor(1, 10, true), 1 / Math.sqrt(1.1));
  const { pv } = discount([196.25], 10, false);
  close(pv, 196.25 / 1.1);
  close(discount([196.25], 10, true).pv, 196.25 / Math.sqrt(1.1));
});

test('terminalValue: Gordon y multiplo de salida; g >= WACC lanza error', () => {
  close(terminalValue({ type: 'gordon', g: 2 }, 196.25, 330, 10), 196.25 * 1.02 / 0.08); // 2502.1875
  close(terminalValue({ type: 'exit-multiple', exitMultiple: 8 }, 196.25, 330, 10), 2640);
  assert.throws(() => terminalValue({ type: 'gordon', g: 10 }, 1, 1, 10), /menor que WACC/);
  assert.throws(() => terminalValue({ type: 'otro' }, 1, 1, 10), /desconocido/);
});

test('enterpriseToEquity e impliedPrice: caja suma, deuda resta; arrendamientos solo si se piden', () => {
  close(enterpriseToEquity(2453.125, { cash: 100, financialDebt: 50 }), 2503.125);
  close(enterpriseToEquity(1000, 200), 800);
  close(enterpriseToEquity(1000, { cash: 0, financialDebt: 0, operatingLeases: 300, leasesIncluded: false }), 1000);
  close(enterpriseToEquity(1000, { cash: 0, financialDebt: 0, operatingLeases: 300, leasesIncluded: true }), 700);
  close(impliedPrice(2503.125, 100), 25.03125);
  assert.throws(() => impliedPrice(1, 0), /acciones/);
});

test('wacc: Ke = rf + beta*ERP (caso LULU del plan: 4.65 + 0.95*4.23 = 8.67)', () => {
  const r = wacc({ rf: 4.65, beta: 0.95, erp: 4.23 });
  close(r.costOfEquity, 8.6685); close(r.wacc, 8.6685);
  const d = wacc({ rf: 4.65, beta: 0.95, erp: 4.23, kd: 5, taxRate: 25, weights: { equity: 0.8, debt: 0.2 } });
  close(d.wacc, 0.8 * 8.6685 + 0.2 * 3.75);
  assert.throws(() => wacc({ rf: 4, beta: 1, erp: 4, weights: { equity: 0.5, debt: 0.2 } }), /sumar 1/);
});

test('impliedExitMultiple / impliedGrowth son coherentes entre si', () => {
  const tv = terminalValue({ type: 'gordon', g: 2 }, 196.25, 330, 10);
  close(impliedExitMultiple(tv, 330), tv / 330);
  close(impliedGrowth(tv, 196.25, 10), 2);
});

// Modelo completo de prueba (un ano, sin mid-year) que cuadra con el ejemplo a mano.
const MODEL = {
  meta: { sharesDiluted: 100, priceAtAnalysis: 25 },
  historical: [{ fy: 'FY0', revenue: 1000, ebitda: 280, dilutedShares: 100, operatingLeases: 300 }],
  dcf: {
    midYear: false, baseYear: 'FY0',
    assumptions: { ...ONE_YEAR, terminal: { type: 'gordon', g: 2 }, wacc: { wacc: 10 } },
    rationale: { ebitdaMarginPct: 'margen 30 % porque...', revenueGrowthPct: 'porque...' },
    netDebtAtValuation: { cash: 100, financialDebt: 50, leasesIncluded: false },
  },
  scenarios: { bear: { prob: 0.3, overrides: { ebitdaMarginPct: [20] } }, base: { prob: 0.5, overrides: {} }, bull: { prob: 0.2, overrides: { ebitdaMarginPct: [35] } } },
};

test('runDCF: EV, equity y precio del ejemplo a mano', () => {
  const r = runDCF(MODEL);
  close(r.pvExplicit, 196.25 / 1.1);
  close(r.tv, 2502.1875);
  close(r.pvTV, 2502.1875 / 1.1);
  close(r.ev, 2453.125);
  close(r.equity, 2503.125);
  close(r.impliedPrice, 25.03125);
  close(r.tvShareOfEVPct, (2502.1875 / 1.1) / 2453.125 * 100);
});

test('runDCF: overrides de escenario cambian el resultado; mergeAssumptions no muta la base', () => {
  const base = runDCF(MODEL).impliedPrice;
  const bull = runDCF(MODEL, { ebitdaMarginPct: [35] }).impliedPrice;
  assert.ok(bull > base);
  const m = mergeAssumptions(MODEL.dcf.assumptions, { terminal: { g: 1 } });
  assert.equal(m.terminal.g, 1);
  assert.equal(MODEL.dcf.assumptions.terminal.g, 2);
  assert.equal(m.terminal.type, 'gordon');
});

test('sensitivity: tabla WACC x g monotona (mas WACC => menos precio; mas g => mas precio)', () => {
  const { waccRange, gRange } = defaultRanges(10, 2);
  assert.deepEqual(waccRange, [9, 9.5, 10, 10.5, 11]);
  assert.equal(gRange.length, 9); close(gRange[0], 1); close(gRange[8], 3);
  const s = sensitivity(MODEL, waccRange, gRange);
  assert.equal(s.prices.length, 5);
  close(s.prices[2][4], 25.03125); // centro = caso base
  assert.ok(s.prices[0][4] > s.prices[4][4]);
  assert.ok(s.prices[2][8] > s.prices[2][0]);
});

test('scenarioValues: precio ponderado = suma prob x precio', () => {
  const { byScenario, weightedPrice } = scenarioValues(MODEL);
  const expected = 0.3 * byScenario.bear.impliedPrice + 0.5 * byScenario.base.impliedPrice + 0.2 * byScenario.bull.impliedPrice;
  close(weightedPrice, expected);
  assert.ok(byScenario.bear.impliedPrice < byScenario.base.impliedPrice && byScenario.base.impliedPrice < byScenario.bull.impliedPrice);
});

test('sanityChecks: modelo sano solo avisa del TV (ejemplo de 1 ano tiene TV > 80 %)', () => {
  const r = runDCF(MODEL);
  const alerts = sanityChecks(MODEL, r);
  const codes = alerts.map((a) => a.code);
  assert.ok(codes.includes('TV_SHARE_HIGH'));
  assert.ok(!codes.includes('MISSING_ASSUMPTIONS'));
  assert.ok(!codes.includes('SCENARIO_PROB_SUM'));
  assert.ok(!codes.includes('WACC_OUT_OF_RANGE'));
});

test('sanityChecks: g >= WACC, WACC fuera de rango y g > 3 %', () => {
  const bad = structuredClone(MODEL);
  bad.dcf.assumptions.wacc.wacc = 5;
  bad.dcf.assumptions.terminal.g = 5;
  const codes = sanityChecks(bad).map((a) => a.code);
  assert.ok(codes.includes('G_GE_WACC'));
  assert.ok(codes.includes('WACC_OUT_OF_RANGE'));
  assert.ok(codes.includes('G_ABOVE_3'));
});

test('sanityChecks: probabilidades que no suman 1 y margen sobre el record sin razon', () => {
  const bad = structuredClone(MODEL);
  bad.scenarios.base.prob = 0.6; // suma 1.1
  bad.dcf.assumptions.ebitdaMarginPct = [40]; // record historico 28 %
  bad.dcf.rationale.ebitdaMarginPct = 'ESCRIBE AQUÍ POR QUÉ (Jaime)';
  const alerts = sanityChecks(bad);
  const byCode = Object.fromEntries(alerts.map((a) => [a.code, a]));
  assert.equal(byCode.SCENARIO_PROB_SUM.level, 'error');
  assert.equal(byCode.MARGIN_ABOVE_RECORD.level, 'error');
  assert.ok(byCode.RATIONALE_PENDING);
  // con razon escrita baja a warn
  bad.dcf.rationale.ebitdaMarginPct = 'porque la escala...';
  assert.equal(sanityChecks(bad).find((a) => a.code === 'MARGIN_ABOVE_RECORD').level, 'warn');
});

test('sanityChecks: plantilla vacia (model.json de LULU) reporta supuestos faltantes y no explota', async () => {
  const { readFile } = await import('node:fs/promises');
  const model = JSON.parse(await readFile(new URL('../../../content/research/lululemon/model.json', import.meta.url), 'utf8'));
  const alerts = sanityChecks(model);
  const codes = alerts.map((a) => a.code);
  assert.ok(codes.includes('MISSING_ASSUMPTIONS'));
  assert.ok(codes.includes('RATIONALE_PENDING'));
  assert.ok(codes.includes('SCENARIO_PROB_MISSING'));
  assert.equal(model.historical.at(-1).revenue, 11102.6); // cuadra con el 10-K FY2025
});

test('sanityChecks: capex < D&A con crecimiento y datos viejos', () => {
  const m = structuredClone(MODEL);
  m.dcf.assumptions.capexPctRevenue = 3; // D&A 5
  m.meta.priceDate = '2020-01-01';
  const codes = sanityChecks(m).map((a) => a.code);
  assert.ok(codes.includes('CAPEX_BELOW_DA'));
  assert.ok(codes.includes('STALE_DATA'));
});

test('sanityChecks: precio de mercado fuera de la tabla de sensibilidad', () => {
  const r = runDCF(MODEL);
  r.sensitivity = sensitivity(MODEL, [9, 10, 11], [1, 2, 3]);
  const far = structuredClone(MODEL); far.meta.priceAtAnalysis = 1000;
  assert.ok(sanityChecks(far, r).some((a) => a.code === 'PRICE_OUTSIDE_SENSITIVITY'));
  assert.ok(!sanityChecks(MODEL, r).some((a) => a.code === 'PRICE_OUTSIDE_SENSITIVITY'));
});
