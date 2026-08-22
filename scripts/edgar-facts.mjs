#!/usr/bin/env node
// Descarga los hechos XBRL (companyfacts) y la lista de filings (submissions)
// de una empresa en SEC EDGAR y produce content/research/<slug>/data/financials.json
// con los ultimos 7 anos fiscales (10-K) y los ultimos 8 trimestres (10-Q).
//
// Uso:
//   node scripts/edgar-facts.mjs <CIK> <slug> [--years=7] [--quarters=8] [--dry] [--cache]
//
//   --dry    no escribe el archivo, solo imprime el resumen
//   --cache  reutiliza las respuestas crudas guardadas en .cache/edgar/ (no vuelve a pedir)
//
// Nunca inventa: si un tag no existe para un ano, el valor queda en null y el
// tag aparece en missingTags. Rate limit: maximo 2 peticiones por segundo.

import { mkdir, writeFile, readFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const USER_AGENT = 'SmartFinance.lat research bot (contacto: sandovalricanojaime@gmail.com)';
const MIN_INTERVAL_MS = 500; // 2 req/s

// --- Mapa de conceptos -> tags XBRL (en orden de preferencia) -------------
// Cada entrada: { tags: [..], kind: 'flow' | 'stock' }
//   flow  = dato de periodo (P&L, flujo de caja): se exige un periodo de ~1 ano (10-K) o ~1 trimestre (10-Q)
//   stock = dato instantaneo (balance): solo tiene `end`
export const CONCEPTS = {
  revenue: { tags: ['RevenueFromContractWithCustomerExcludingAssessedTax', 'Revenues', 'SalesRevenueNet'], kind: 'flow' },
  costOfRevenue: { tags: ['CostOfGoodsAndServicesSold', 'CostOfRevenue', 'CostOfGoodsSold'], kind: 'flow' },
  grossProfit: { tags: ['GrossProfit'], kind: 'flow' },
  operatingIncome: { tags: ['OperatingIncomeLoss'], kind: 'flow' },
  netIncome: { tags: ['NetIncomeLoss'], kind: 'flow' },
  da: { tags: ['DepreciationDepletionAndAmortization', 'DepreciationAndAmortization', 'DepreciationAmortizationAndAccretionNet'], kind: 'flow' },
  capex: { tags: ['PaymentsToAcquirePropertyPlantAndEquipment'], kind: 'flow' },
  cfo: { tags: ['NetCashProvidedByUsedInOperatingActivities'], kind: 'flow' },
  sbc: { tags: ['ShareBasedCompensation', 'AllocatedShareBasedCompensationExpense'], kind: 'flow' },
  taxExpense: { tags: ['IncomeTaxExpenseBenefit'], kind: 'flow' },
  pretaxIncome: { tags: ['IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest', 'IncomeLossFromContinuingOperationsBeforeIncomeTaxesMinorityInterestAndIncomeLossFromEquityMethodInvestments'], kind: 'flow' },
  cash: { tags: ['CashAndCashEquivalentsAtCarryingValue', 'CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents'], kind: 'stock' },
  longTermDebt: { tags: ['LongTermDebtNoncurrent', 'LongTermDebt'], kind: 'stock', optional: true },
  longTermDebtCurrent: { tags: ['LongTermDebtCurrent'], kind: 'stock', optional: true },
  shortTermBorrowings: { tags: ['ShortTermBorrowings', 'OtherBorrowings'], kind: 'stock', optional: true },
  operatingLeaseLiabilityNoncurrent: { tags: ['OperatingLeaseLiabilityNoncurrent'], kind: 'stock' },
  operatingLeaseLiabilityCurrent: { tags: ['OperatingLeaseLiabilityCurrent'], kind: 'stock' },
  equity: { tags: ['StockholdersEquity'], kind: 'stock' },
  dilutedShares: { tags: ['WeightedAverageNumberOfDilutedSharesOutstanding'], kind: 'flow', unit: 'shares' },
  buybacks: { tags: ['PaymentsForRepurchaseOfCommonStock'], kind: 'flow' },
};

// --- HTTP con rate limit -------------------------------------------------
let lastRequestAt = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url, { cache = false } = {}) {
  const kind = url.includes('/companyfacts/') ? 'companyfacts' : 'submissions';
  const cacheFile = join(ROOT, '.cache', 'edgar', `${kind}-${url.split('/').pop()}`);
  if (cache) {
    try {
      await access(cacheFile);
      return JSON.parse(await readFile(cacheFile, 'utf8'));
    } catch { /* no hay cache: descargar */ }
  }
  const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, 'Accept-Encoding': 'gzip, deflate' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} al pedir ${url}`);
  const json = await res.json();
  if (cache) {
    await mkdir(dirname(cacheFile), { recursive: true });
    await writeFile(cacheFile, JSON.stringify(json));
  }
  return json;
}

// --- Utilidades -----------------------------------------------------------
export function padCik(cik) {
  const digits = String(cik).replace(/\D/g, '');
  if (!digits) throw new Error(`CIK invalido: ${cik}`);
  return digits.padStart(10, '0');
}

const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);

/** Devuelve los "facts" (filas de unidades) de un tag, o null si no existe. */
function factsFor(companyfacts, tag, unitPref) {
  const node = companyfacts.facts?.['us-gaap']?.[tag];
  if (!node) return null;
  const units = node.units || {};
  const unitKey = unitPref && units[unitPref] ? unitPref : (units.USD ? 'USD' : Object.keys(units)[0]);
  if (!unitKey) return null;
  return units[unitKey].map((f) => ({ ...f, unit: unitKey }));
}

/**
 * Selecciona, para cada ano fiscal, el hecho anual (10-K, fp=FY).
 * Deduplica por `fy`/`end` quedandose con el filing mas reciente (filed max),
 * pero exige que el periodo sea ~1 ano (flows) para no mezclar trimestres.
 */
function annualSeries(facts, kind) {
  if (!facts) return new Map();
  const byEnd = new Map();
  for (const f of facts) {
    if (f.form !== '10-K' || f.fp !== 'FY') continue;
    if (kind === 'flow') {
      if (!f.start) continue;
      const d = daysBetween(f.start, f.end);
      if (d < 340 || d > 390) continue; // solo periodos anuales
    }
    const prev = byEnd.get(f.end);
    if (!prev) byEnd.set(f.end, { ...f, originalFiling: { fy: f.fy, fp: f.fp, filed: f.filed, accn: f.accn } });
    else {
      // valor: el filing mas reciente (puede traer reexpresiones); etiqueta FY: el filing original
      const orig = f.filed < prev.originalFiling.filed ? { fy: f.fy, fp: f.fp, filed: f.filed, accn: f.accn } : prev.originalFiling;
      const latest = f.filed > prev.filed ? f : prev;
      byEnd.set(f.end, { ...latest, originalFiling: orig });
    }
  }
  return byEnd; // clave: fecha de cierre (end)
}

/** Selecciona hechos trimestrales (10-Q, periodo ~90 dias) por fecha de cierre. */
function quarterlySeries(facts) {
  if (!facts) return new Map();
  const byEnd = new Map();
  for (const f of facts) {
    if (f.form !== '10-Q' || !f.start) continue;
    const d = daysBetween(f.start, f.end);
    if (d < 80 || d > 100) continue;
    const prev = byEnd.get(f.end);
    if (!prev) byEnd.set(f.end, { ...f, originalFiling: { fy: f.fy, fp: f.fp, filed: f.filed, accn: f.accn } });
    else {
      const orig = f.filed < prev.originalFiling.filed ? { fy: f.fy, fp: f.fp, filed: f.filed, accn: f.accn } : prev.originalFiling;
      const latest = f.filed > prev.filed ? f : prev;
      byEnd.set(f.end, { ...latest, originalFiling: orig });
    }
  }
  return byEnd;
}

/** Primer tag de la lista que tenga dato para ese `end`; devuelve {value, tag, fact} o null. */
function pick(seriesByTag, tags, end) {
  for (const tag of tags) {
    const m = seriesByTag.get(tag);
    const f = m && m.get(end);
    if (f) return { value: f.val, tag, fact: f };
  }
  return null;
}

const sum = (...xs) => xs.reduce((acc, x) => (x == null ? acc : (acc ?? 0) + x), null);
const sub = (a, b) => (a == null || b == null ? null : a - b);

// --- Construccion del JSON -----------------------------------------------
export function buildFinancials({ companyfacts, submissions, cik, years = 7, quarters = 8 }) {
  const missingTags = new Set();
  const tagsUsed = {};

  // Series anuales por tag
  const annualByTag = new Map();
  const quarterlyByTag = new Map();
  for (const [concept, def] of Object.entries(CONCEPTS)) {
    for (const tag of def.tags) {
      const facts = factsFor(companyfacts, tag, def.unit);
      if (!facts) continue;
      annualByTag.set(tag, annualSeries(facts, def.kind));
      if (def.kind === 'flow') quarterlyByTag.set(tag, quarterlySeries(facts));
    }
  }

  // Anos fiscales disponibles: usamos los cierres donde hay ingresos reportados en 10-K.
  const revenueEnds = new Set();
  for (const tag of CONCEPTS.revenue.tags) {
    const m = annualByTag.get(tag);
    if (m) for (const end of m.keys()) revenueEnds.add(end);
  }
  const ends = [...revenueEnds].sort().slice(-years);

  const annual = ends.map((end) => {
    const row = { fy: null, periodEnd: end, form: '10-K', filed: null, accession: null, originalFiling: null };
    const values = {};
    const tagsByConcept = {};
    for (const [concept, def] of Object.entries(CONCEPTS)) {
      const hit = pick(annualByTag, def.tags, end);
      if (hit) {
        values[concept] = hit.value;
        tagsUsed[concept] = tagsUsed[concept] || hit.tag;
        tagsByConcept[concept] = hit.tag;
        if (concept === 'revenue') {
          // La etiqueta FY sale del 10-K original de ese ano (companyfacts repite el
          // dato en los 10-K posteriores como comparativo, con el fy del filing nuevo).
          row.fy = `FY${hit.fact.originalFiling.fy}`;
          row.filed = hit.fact.filed;
          row.accession = hit.fact.accn;
          row.originalFiling = { filed: hit.fact.originalFiling.filed, accession: hit.fact.originalFiling.accn };
        }
      } else {
        values[concept] = null;
        if (!def.optional) missingTags.add(`${concept}@${end}`);
      }
    }
    // Derivados
    const grossProfit = values.grossProfit ?? sub(values.revenue, values.costOfRevenue);
    const debtTagsFound = ['longTermDebt', 'longTermDebtCurrent', 'shortTermBorrowings']
      .filter((k) => values[k] != null)
      .map((k) => tagsUsed[k]);
    const financialDebt = debtTagsFound.length ? sum(values.longTermDebt, values.longTermDebtCurrent, values.shortTermBorrowings) : 0;
    return {
      ...row,
      revenue: values.revenue,
      costOfRevenue: values.costOfRevenue,
      grossProfit,
      grossProfitDerived: values.grossProfit == null && grossProfit != null,
      operatingIncome: values.operatingIncome,
      netIncome: values.netIncome,
      da: values.da,
      ebitda: sum(values.operatingIncome, values.da) === null || values.operatingIncome == null || values.da == null ? null : values.operatingIncome + values.da,
      capex: values.capex,
      cfo: values.cfo,
      fcf: sub(values.cfo, values.capex),
      sbc: values.sbc,
      taxExpense: values.taxExpense,
      pretaxIncome: values.pretaxIncome,
      cash: values.cash,
      financialDebt,
      debtTagsFound,
      operatingLeaseLiabilities: sum(values.operatingLeaseLiabilityNoncurrent, values.operatingLeaseLiabilityCurrent),
      equity: values.equity,
      dilutedShares: values.dilutedShares,
      buybacks: values.buybacks,
      tags: tagsByConcept,
      unit: 'USD',
      source: 'EDGAR companyfacts',
    };
  });

  // Trimestres: cierres donde hay ingresos en 10-Q
  const qEnds = new Set();
  for (const tag of CONCEPTS.revenue.tags) {
    const m = quarterlyByTag.get(tag);
    if (m) for (const end of m.keys()) qEnds.add(end);
  }
  const quarterly = [...qEnds].sort().slice(-quarters).map((end) => {
    const rev = pick(quarterlyByTag, CONCEPTS.revenue.tags, end);
    const oi = pick(quarterlyByTag, CONCEPTS.operatingIncome.tags, end);
    const ni = pick(quarterlyByTag, CONCEPTS.netIncome.tags, end);
    return {
      fy: rev ? `FY${rev.fact.originalFiling.fy}` : null,
      fp: rev ? rev.fact.originalFiling.fp : null,
      periodStart: rev ? rev.fact.start : null,
      periodEnd: end,
      form: '10-Q',
      filed: rev ? rev.fact.filed : null,
      accession: rev ? rev.fact.accn : null,
      revenue: rev ? rev.value : null,
      operatingIncome: oi ? oi.value : null,
      netIncome: ni ? ni.value : null,
      unit: 'USD',
      source: 'EDGAR companyfacts',
    };
  });

  // Meta desde submissions
  const recent = submissions.filings?.recent || {};
  const lastFiling = recent.form?.length
    ? { form: recent.form[0], filed: recent.filingDate[0], accession: recent.accessionNumber[0], primaryDocument: recent.primaryDocument[0] }
    : null;
  const meta = {
    cik: padCik(cik),
    name: submissions.name || companyfacts.entityName || null,
    tickers: submissions.tickers || [],
    exchanges: submissions.exchanges || [],
    fiscalYearEnd: submissions.fiscalYearEnd || null, // MMDD
    sic: submissions.sic || null,
    sicDescription: submissions.sicDescription || null,
    stateOfIncorporation: submissions.stateOfIncorporation || null,
    lastFiling,
    generatedBy: 'scripts/edgar-facts.mjs',
    sources: [
      `https://data.sec.gov/api/xbrl/companyfacts/CIK${padCik(cik)}.json`,
      `https://data.sec.gov/submissions/CIK${padCik(cik)}.json`,
    ],
    note: 'Valores en USD tal como los reporta la empresa (no en millones). dilutedShares en acciones. ebitda = operatingIncome + da; fcf = cfo - capex. `fy` es la etiqueta que la propia empresa usa en el 10-K original de ese ano (originalFiling); `filed`/`accession` apuntan al filing mas reciente que reporta la cifra (puede ser un 10-K posterior con comparativos). Si falta un tag el valor es null (ver missingTags). `tags` dice que tag XBRL se uso en cada fila.',
  };

  return { meta, tagsUsed, missingTags: [...missingTags].sort(), annual, quarterly };
}

// --- Resumen en consola ---------------------------------------------------
const fmtM = (v) => (v == null ? '   n/d' : (v / 1e6).toFixed(1).padStart(9));
export function printSummary(out) {
  const m = out.meta;
  console.log(`\n${m.name} (${m.tickers.join(', ')} · ${m.exchanges.join(', ')}) CIK ${m.cik} · cierre fiscal ${m.fiscalYearEnd} · SIC ${m.sic} ${m.sicDescription || ''}`);
  if (m.lastFiling) console.log(`Ultimo filing: ${m.lastFiling.form} ${m.lastFiling.filed} (${m.lastFiling.accession})`);
  console.log('\nAnual (USD millones):');
  console.log('FY      cierre      ingresos   op.inc  net.inc      D&A    capex      CFO      FCF     caja   deuda  arrend.  acc.dil(M)');
  for (const r of out.annual) {
    console.log(`${(r.fy || '?').padEnd(7)} ${r.periodEnd} ${fmtM(r.revenue)} ${fmtM(r.operatingIncome)} ${fmtM(r.netIncome)} ${fmtM(r.da)} ${fmtM(r.capex)} ${fmtM(r.cfo)} ${fmtM(r.fcf)} ${fmtM(r.cash)} ${fmtM(r.financialDebt)} ${fmtM(r.operatingLeaseLiabilities)} ${fmtM(r.dilutedShares)}`);
  }
  if (out.quarterly.length) {
    console.log('\nTrimestral (10-Q, USD millones):');
    for (const q of out.quarterly) console.log(`${(q.fy || '?').padEnd(7)} ${(q.fp || '').padEnd(3)} ${q.periodEnd} ingresos ${fmtM(q.revenue)} op.inc ${fmtM(q.operatingIncome)} net.inc ${fmtM(q.netIncome)}`);
  }
  console.log('\nTags usados:', JSON.stringify(out.tagsUsed));
  console.log(out.missingTags.length ? `Tags faltantes (${out.missingTags.length}): ${out.missingTags.join(', ')}` : 'Tags faltantes: ninguno');
}

// --- CLI ------------------------------------------------------------------
async function main() {
  const args = process.argv.slice(2);
  const flags = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? true]; }));
  const [cikArg, slug] = args.filter((a) => !a.startsWith('--'));
  if (!cikArg || !slug) {
    console.error('Uso: node scripts/edgar-facts.mjs <CIK> <slug> [--years=7] [--quarters=8] [--dry] [--cache]');
    process.exit(1);
  }
  const cik = padCik(cikArg);
  const years = Number(flags.years || 7);
  const quarters = Number(flags.quarters || 8);
  const cache = Boolean(flags.cache);

  console.error(`Descargando EDGAR para CIK ${cik}…`);
  const companyfacts = await fetchJson(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`, { cache });
  const submissions = await fetchJson(`https://data.sec.gov/submissions/CIK${cik}.json`, { cache });

  const out = buildFinancials({ companyfacts, submissions, cik, years, quarters });
  printSummary(out);

  if (flags.dry) {
    console.log('\n--dry: no se escribio ningun archivo.');
    return;
  }
  const outFile = join(ROOT, 'content', 'research', slug, 'data', 'financials.json');
  await mkdir(dirname(outFile), { recursive: true });
  await writeFile(outFile, JSON.stringify(out, null, 2) + '\n');
  console.log(`\nEscrito: ${outFile}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
