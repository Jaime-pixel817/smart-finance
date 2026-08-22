// Gráficas SVG del research, generadas EN EL BUILD desde los datos ya
// verificados (content/research/*/data/financials.json). Sin librerías: el
// sitio ya dibuja sus sparklines y la calculadora de interés compuesto a mano
// (ver src/scripts/compound.ts) y estas siguen la misma idea.
//
// Todo el color sale de los tokens de src/styles/tokens.css, así las gráficas
// cambian con el tema claro/oscuro sin JavaScript. El viewBox es 400×250: a
// ancho de teléfono se ve casi 1:1 y en escritorio crece hasta ~460 px, que es
// donde el texto de 11 px sigue siendo legible.

const W = 400, H = 250;
const M = { top: 26, right: 10, bottom: 34, left: 46 };
const IW = W - M.left - M.right;
const IH = H - M.top - M.bottom;

/** Formateador por defecto (con firma de numero, no el constructor String). */
const str = (v) => String(v);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const n2 = (x) => Math.round(x * 100) / 100;

/** Escala "bonita": devuelve { min, max, ticks[] } con pasos 1/2/2.5/5 × 10^k. */
export function niceScale(min, max, count = 4) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 1, ticks: [0, 1] };
  if (min === max) { min = Math.min(0, min); max = max === 0 ? 1 : max * 1.2; }
  const span = max - min;
  const raw = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step / 1000; v += step) ticks.push(n2(v));
  return { min: lo, max: hi, ticks };
}

function frame({ scale, labels, fmtY, showZero = true }) {
  const y = (v) => M.top + IH * (1 - (v - scale.min) / (scale.max - scale.min || 1));
  const grid = scale.ticks.map((t) => {
    const yy = n2(y(t));
    const zero = showZero && Math.abs(t) < 1e-9;
    return `<line class="fc-grid${zero ? ' fc-zero' : ''}" x1="${M.left}" y1="${yy}" x2="${W - M.right}" y2="${yy}"/>` +
      `<text class="fc-ytick" x="${M.left - 6}" y="${yy + 3.5}" text-anchor="end">${esc(fmtY(t))}</text>`;
  }).join('');
  const step = IW / labels.length;
  const xlabels = labels.map((l, i) => `<text class="fc-xtick" x="${n2(M.left + step * (i + 0.5))}" y="${H - M.bottom + 16}" text-anchor="middle">${esc(l)}</text>`).join('');
  return { y, grid, xlabels, step };
}

function wrap({ inner, ariaLabel, cls = '' }) {
  return `<svg class="fc ${cls}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(ariaLabel)}" preserveAspectRatio="xMidYMid meet">${inner}</svg>`;
}

/**
 * Barras verticales (ingresos, FCF, recompras). Valores negativos permitidos.
 * opts: { labels[], values[], fmtY, fmtVal, ariaLabel, color, highlight (índice) }
 */
export function barChart({ labels, values, fmtY = str, fmtVal = str, ariaLabel = '', color = 'var(--s1)', highlight = -1 }) {
  const vals = values.map((v) => (Number.isFinite(v) ? v : 0));
  const scale = niceScale(Math.min(0, ...vals), Math.max(0, ...vals));
  const { y, grid, xlabels, step } = frame({ scale, labels, fmtY });
  const bw = Math.min(34, step * 0.62);
  const y0 = y(0);
  const bars = vals.map((v, i) => {
    const cx = M.left + step * (i + 0.5);
    const yy = y(v);
    const top = Math.min(yy, y0), h = Math.max(1, Math.abs(yy - y0));
    const on = i === highlight;
    return `<rect class="fc-bar${on ? ' is-on' : ''}" x="${n2(cx - bw / 2)}" y="${n2(top)}" width="${n2(bw)}" height="${n2(h)}" rx="2" style="fill:${color}"/>` +
      `<text class="fc-val" x="${n2(cx)}" y="${n2(v >= 0 ? top - 5 : top + h + 11)}" text-anchor="middle">${esc(fmtVal(values[i]))}</text>`;
  }).join('');
  return wrap({ inner: grid + bars + xlabels, ariaLabel });
}

/**
 * Barras agrupadas (caja vs. deuda vs. arrendamientos).
 * opts: { labels[], series: [{ name, values[], color }], ... }
 */
export function groupedBarChart({ labels, series, fmtY = str, ariaLabel = '' }) {
  const all = series.flatMap((s) => s.values.filter(Number.isFinite));
  const scale = niceScale(Math.min(0, ...all), Math.max(0, ...all));
  const { y, grid, xlabels, step } = frame({ scale, labels, fmtY });
  const gw = Math.min(38, step * 0.72);
  const bw = gw / series.length;
  const y0 = y(0);
  const bars = labels.map((_, i) => series.map((s, k) => {
    const v = Number.isFinite(s.values[i]) ? s.values[i] : 0;
    const x = M.left + step * (i + 0.5) - gw / 2 + bw * k;
    const yy = y(v);
    const top = Math.min(yy, y0), h = Math.max(1, Math.abs(yy - y0));
    return `<rect class="fc-bar" x="${n2(x)}" y="${n2(top)}" width="${n2(Math.max(1, bw - 1.5))}" height="${n2(h)}" rx="1.5" style="fill:${s.color}"/>`;
  }).join('')).join('');
  return wrap({ inner: grid + bars + xlabels, ariaLabel });
}

/**
 * Líneas (márgenes). opts: { labels[], series: [{ name, values[], color }], ... }
 * Dibuja punto por año y la etiqueta del último valor de cada serie.
 */
export function lineChart({ labels, series, fmtY = str, fmtVal = str, ariaLabel = '', zeroBase = false }) {
  const all = series.flatMap((s) => s.values.filter(Number.isFinite));
  const scale = niceScale(zeroBase ? 0 : Math.min(...all), Math.max(...all));
  const { y, grid, xlabels, step } = frame({ scale, labels, fmtY, showZero: zeroBase });
  const x = (i) => M.left + step * (i + 0.5);
  const paths = series.map((s) => {
    const pts = s.values.map((v, i) => (Number.isFinite(v) ? [x(i), y(v)] : null)).filter(Boolean);
    if (!pts.length) return '';
    const d = pts.map((p, i) => (i ? 'L' : 'M') + n2(p[0]) + ' ' + n2(p[1])).join(' ');
    const dots = pts.map((p) => `<circle class="fc-dot" cx="${n2(p[0])}" cy="${n2(p[1])}" r="2.6" style="fill:${s.color}"/>`).join('');
    const lastI = s.values.length - 1;
    const label = Number.isFinite(s.values[lastI])
      ? `<text class="fc-val" x="${n2(x(lastI))}" y="${n2(y(s.values[lastI]) - 8)}" text-anchor="end" style="fill:${s.color}">${esc(fmtVal(s.values[lastI]))}</text>`
      : '';
    return `<path class="fc-line" d="${d}" style="stroke:${s.color}"/>${dots}${label}`;
  }).join('');
  return wrap({ inner: grid + paths + xlabels, ariaLabel });
}

/**
 * "Football field": barras horizontales de rango con una marca de precio.
 * rows: [{ label, low, high, mid?, color }], mark: { value, label } | null.
 * Este sí se redibuja en el navegador (mismo código, importado por el script).
 * @param {{ rows: any[], mark?: { value: number, label: string } | null, fmt?: (v: number) => string, ariaLabel?: string, width?: number }} opts
 */
export function footballField(opts) {
  const { rows, mark = null, fmt = str, ariaLabel = '', width = 400 } = opts;
  const h = 34;
  const top = 8, left = 82, right = 12, bottom = 26;
  const height = top + rows.length * h + bottom;
  const iw = width - left - right;
  const values = rows.flatMap((r) => [r.low, r.high]).filter(Number.isFinite);
  if (mark && Number.isFinite(mark.value)) values.push(mark.value);
  if (!values.length) return '';
  const scale = niceScale(Math.min(...values) * 0.95, Math.max(...values) * 1.05, 3);
  const x = (v) => left + iw * ((v - scale.min) / (scale.max - scale.min || 1));
  const grid = scale.ticks.map((t) => `<line class="fc-grid" x1="${n2(x(t))}" y1="${top}" x2="${n2(x(t))}" y2="${top + rows.length * h}"/>` +
    `<text class="fc-xtick" x="${n2(x(t))}" y="${top + rows.length * h + 16}" text-anchor="middle">${esc(fmt(t))}</text>`).join('');
  const bars = rows.map((r, i) => {
    const cy = top + i * h + h / 2;
    if (!Number.isFinite(r.low) || !Number.isFinite(r.high)) {
      return `<text class="fc-ff-label" x="${left - 8}" y="${cy + 4}" text-anchor="end">${esc(r.label)}</text>` +
        `<text class="fc-ff-empty" x="${left + 4}" y="${cy + 4}">${esc(r.empty || '—')}</text>`;
    }
    const x1 = x(Math.min(r.low, r.high)), x2 = x(Math.max(r.low, r.high));
    const mid = Number.isFinite(r.mid) ? `<line class="fc-ff-mid" x1="${n2(x(r.mid))}" y1="${n2(cy - 11)}" x2="${n2(x(r.mid))}" y2="${n2(cy + 11)}"/>` : '';
    return `<text class="fc-ff-label" x="${left - 8}" y="${n2(cy + 4)}" text-anchor="end">${esc(r.label)}</text>` +
      `<rect class="fc-ff-bar" x="${n2(x1)}" y="${n2(cy - 9)}" width="${n2(Math.max(2, x2 - x1))}" height="18" rx="4" style="fill:${r.color || 'var(--s1)'}"/>` + mid +
      `<text class="fc-ff-num fc-ff-lo" x="${n2(x1 - 4)}" y="${n2(cy + 4)}" text-anchor="end">${esc(fmt(Math.min(r.low, r.high)))}</text>` +
      `<text class="fc-ff-num fc-ff-hi" x="${n2(x2 + 4)}" y="${n2(cy + 4)}">${esc(fmt(Math.max(r.low, r.high)))}</text>`;
  }).join('');
  const marker = mark && Number.isFinite(mark.value)
    ? `<line class="fc-ff-mark" x1="${n2(x(mark.value))}" y1="${top - 4}" x2="${n2(x(mark.value))}" y2="${top + rows.length * h + 2}"/>` +
      `<text class="fc-ff-marktext" x="${n2(x(mark.value))}" y="${top + rows.length * h + 16}" text-anchor="middle">${esc(mark.label || '')}</text>`
    : '';
  return `<svg class="fc fc-ff" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(ariaLabel)}" preserveAspectRatio="xMidYMid meet">${grid}${bars}${marker}</svg>`;
}
