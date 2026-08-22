// Carga en el BUILD los reportes de research de content/research/<slug>/:
// meta.yaml, sources.yaml, model.json y data/financials.json. Es la única
// puerta de entrada a esos ficheros: las páginas y los componentes leen de
// aquí, nunca del disco.
//
// El registro de abajo (REPORTS) es lo que decide qué URLs existen: un reporte
// con `page: true` genera /research/<slug> y /es/research/<slug>; los demás
// solo aparecen en la lista del hub como "qué viene".
// Los ficheros se inlinean con import.meta.glob(?raw) en vez de leerse con
// node:fs: así Vite los mete en el grafo del build (recarga en caliente al
// editarlos) y no hace falta @types/node solo para esto.
import { parseYaml } from './yaml.mjs';

const RAW = import.meta.glob('../../../content/research/**/*.{yaml,json}', {
  query: '?raw', import: 'default', eager: true
}) as Record<string, string>;

export type ReportStatus = 'draft' | 'review' | 'published';

export interface ReportSource {
  id: string;
  type?: string;
  title?: string;
  form?: string;
  filed?: string | null;
  accession?: string | null;
  url?: string | null;
  index?: string | null;
  retrieved?: string | null;
  notes?: string | null;
  value?: string | null;
}

export interface ReportMeta {
  ticker: string;
  name: string;
  exchange?: string;
  cik?: string;
  currency?: string;
  fiscalYearEnd?: string;
  analysisDate?: string | null;
  priceAtAnalysis?: number | null;
  priceDate?: string | null;
  author?: string;
  version?: string;
  status?: ReportStatus;
  dataAsOf?: string | null;
  aiDisclosure?: string;
}

/** Fila anual ya en millones de dólares y con los porcentajes derivados. */
export interface AnnualRow {
  fy: string;
  periodEnd: string;
  revenue: number | null;
  grossProfit: number | null;
  operatingIncome: number | null;
  ebitda: number | null;
  netIncome: number | null;
  da: number | null;
  capex: number | null;
  cfo: number | null;
  fcf: number | null;
  sbc: number | null;
  cash: number | null;
  financialDebt: number | null;
  operatingLeases: number | null;
  equity: number | null;
  dilutedShares: number | null;
  buybacks: number | null;
  grossMarginPct: number | null;
  ebitdaMarginPct: number | null;
  netMarginPct: number | null;
  fcfMarginPct: number | null;
  revenueGrowthPct: number | null;
  accession: string | null;
  form: string | null;
  filed: string | null;
}

export interface Report {
  slug: string;
  routeId: string;
  meta: ReportMeta;
  sources: ReportSource[];
  /** model.json tal cual: lo escribe Jaime, la página no lo reinterpreta. */
  model: any;
  /** financials.json tal cual (dólares, no millones). */
  financials: any;
  /** Histórico anual en millones, listo para tablas y gráficas. */
  annual: AnnualRow[];
  /** Fecha del último filing que respalda los datos. */
  lastFiling: { form: string; filed: string; accession: string } | null;
}

export interface ReportEntry {
  slug: string;
  dir: string;
  routeId: string;
  /** ¿tiene página propia? (si no, solo sale en la lista del hub) */
  page: boolean;
  ticker: string;
  name: string;
}

/** Registro de reportes. Añadir uno nuevo = una línea aquí + su ruta en i18n/routes.ts. */
export const REPORTS: ReportEntry[] = [
  { slug: 'lululemon', dir: 'lululemon', routeId: 'research.lululemon', page: true, ticker: 'LULU', name: 'lululemon athletica inc.' },
  { slug: 'chipotle', dir: 'chipotle', routeId: '', page: false, ticker: 'CMG', name: 'Chipotle Mexican Grill' }
];

function read(rel: string): string {
  const want = '/content/research/' + rel;
  for (const [k, v] of Object.entries(RAW)) if (k.endsWith(want)) return v;
  throw new Error('research: falta el fichero content/research/' + rel);
}
const MM = (x: unknown): number | null => (typeof x === 'number' && Number.isFinite(x) ? Math.round((x / 1e6) * 10) / 10 : null);
const div = (a: number | null, b: number | null): number | null =>
  a !== null && b !== null && b !== 0 ? Math.round((a / b) * 1000) / 10 : null;

/** ¿este campo lo tiene que escribir Jaime todavía? */
export function pending(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') return v.trim() === '' || /ESCRIBE AQU|TODO \(Jaime\)|TODO Jaime/i.test(v);
  if (Array.isArray(v)) return v.length === 0 || v.every((x) => pending(x));
  if (typeof v === 'object') return Object.keys(v as object).length === 0;
  return false;
}

function annualRows(financials: any): AnnualRow[] {
  const rows: AnnualRow[] = (financials.annual || []).map((r: any) => {
    const revenue = MM(r.revenue);
    const ebitda = MM(r.ebitda);
    const netIncome = MM(r.netIncome);
    const fcf = MM(r.fcf);
    const grossProfit = MM(r.grossProfit);
    return {
      fy: r.fy,
      periodEnd: r.periodEnd,
      revenue,
      grossProfit,
      operatingIncome: MM(r.operatingIncome),
      ebitda,
      netIncome,
      da: MM(r.da),
      capex: MM(r.capex),
      cfo: MM(r.cfo),
      fcf,
      sbc: MM(r.sbc),
      cash: MM(r.cash),
      financialDebt: MM(r.financialDebt),
      operatingLeases: MM(r.operatingLeaseLiabilities),
      equity: MM(r.equity),
      dilutedShares: MM(r.dilutedShares),
      buybacks: MM(r.buybacks),
      grossMarginPct: div(grossProfit, revenue),
      ebitdaMarginPct: div(ebitda, revenue),
      netMarginPct: div(netIncome, revenue),
      fcfMarginPct: div(fcf, revenue),
      revenueGrowthPct: null,
      accession: r.accession ?? null,
      form: r.form ?? null,
      filed: r.filed ?? null
    };
  });
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i].revenue, b = rows[i - 1].revenue;
    rows[i].revenueGrowthPct = a !== null && b ? Math.round(((a / b - 1) * 100) * 10) / 10 : null;
  }
  return rows;
}

const cache = new Map<string, Report>();

export function loadReport(slug: string): Report {
  const hit = cache.get(slug);
  if (hit) return hit;
  const entry = REPORTS.find((r) => r.slug === slug);
  if (!entry) throw new Error('research: no existe el reporte "' + slug + '"');
  const meta = parseYaml(read(entry.dir + '/meta.yaml')) as ReportMeta;
  const sourcesDoc = parseYaml(read(entry.dir + '/sources.yaml')) as { sources: ReportSource[] };
  const model = JSON.parse(read(entry.dir + '/model.json'));
  const financials = JSON.parse(read(entry.dir + '/data/financials.json'));
  const report: Report = {
    slug: entry.slug,
    routeId: entry.routeId,
    meta,
    sources: sourcesDoc?.sources || [],
    model,
    financials,
    annual: annualRows(financials),
    lastFiling: financials?.meta?.lastFiling || null
  };
  cache.set(slug, report);
  return report;
}

/** Solo los datos financieros (para los reportes que aún no tienen carpeta completa). */
export function loadFinancials(dir: string): any {
  return JSON.parse(read(dir + '/data/financials.json'));
}

/** Reportes con página propia. */
export const PAGED_REPORTS = REPORTS.filter((r) => r.page);
