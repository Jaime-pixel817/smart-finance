// Calculadora de interés compuesto (CompoundCalculator.astro). Puerto de
// public/assets/lesson-widgets.js sin Chart.js: misma fórmula, mismos
// controles, misma frase; la curva se dibuja en SVG con los tokens del sitio.
//
// Valor futuro de una serie de aportes mensuales con capitalización mensual:
// aporte * (((1+i)^n − 1) / i), con i la tasa mensual y n los meses
// (anualidad ordinaria: el aporte entra al final de cada mes).
function valorFuturo(aporte: number, tasaAnualPct: number, meses: number): number {
  const i = tasaAnualPct / 100 / 12;
  if (i === 0) return aporte * meses;
  return aporte * (Math.pow(1 + i, meses) - 1) / i;
}

function montar(raiz: HTMLElement) {
  const locale = raiz.dataset.locale === 'es' ? 'es' : 'en';
  const region = locale === 'es' ? 'es-MX' : 'en-US';
  const pesos = new Intl.NumberFormat(region, { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
  let cortos: Intl.NumberFormat;
  try { cortos = new Intl.NumberFormat(region, { style: 'currency', currency: 'MXN', notation: 'compact', maximumFractionDigits: 1 }); } catch { cortos = pesos; }
  const numero = new Intl.NumberFormat(region, { maximumFractionDigits: 1 });

  const q = <T extends Element>(s: string) => raiz.querySelector<T>(s);
  const sl = { aporte: q<HTMLInputElement>('[data-lw="monthly"]'), tasa: q<HTMLInputElement>('[data-lw="rate"]'), anios: q<HTMLInputElement>('[data-lw="years"]') };
  const out = { aporte: q<HTMLElement>('#lwMonthlyOut'), tasa: q<HTMLElement>('#lwRateOut'), anios: q<HTMLElement>('#lwYearsOut') };
  const resumen = q<HTMLElement>('[data-lw-summary]');
  const svg = q<SVGSVGElement>('[data-lw-svg]');
  const area = q<SVGPathElement>('[data-lw-area]'), lContrib = q<SVGPathElement>('[data-lw-contrib]'), lComp = q<SVGPathElement>('[data-lw-compound]');
  const grid = q<SVGGElement>('[data-lw-grid]'), yticks = q<HTMLElement>('[data-lw-yticks]'), xticks = q<HTMLElement>('[data-lw-xticks]');
  if (!sl.aporte || !sl.tasa || !sl.anios || !resumen) return;
  const tpl = raiz.dataset.tpl || 'After {years} years: {total} — of which only {contrib} came from you.';

  const W = 600, H = 200;
  function leer() { return { aporte: Number(sl.aporte!.value), tasa: Number(sl.tasa!.value), anios: Number(sl.anios!.value) }; }
  function series(v: { aporte: number; tasa: number; anios: number }) {
    const aportes: number[] = [], comp: number[] = [];
    for (let a = 0; a <= v.anios; a++) { aportes.push(v.aporte * 12 * a); comp.push(Math.round(valorFuturo(v.aporte, v.tasa, a * 12))); }
    return { aportes, comp };
  }
  // "Números bonitos" para 3–4 ticks del eje Y.
  function niceStep(max: number, ticks = 4): number {
    const raw = max / ticks, mag = Math.pow(10, Math.floor(Math.log10(raw)));
    for (const m of [1, 2, 2.5, 5, 10]) if (raw <= m * mag) return m * mag;
    return 10 * mag;
  }
  function path(vals: number[], max: number): string {
    const n = vals.length; if (n < 2) return '';
    return vals.map((y, i) => (i ? 'L' : 'M') + ((i / (n - 1)) * W).toFixed(1) + ' ' + (H - (y / max) * H).toFixed(1)).join(' ');
  }
  function pintar() {
    const v = leer();
    out.aporte!.textContent = pesos.format(v.aporte);
    out.tasa!.textContent = numero.format(v.tasa) + '%';
    out.anios!.textContent = String(v.anios);
    const total = Math.round(valorFuturo(v.aporte, v.tasa, v.anios * 12));
    const aportado = v.aporte * 12 * v.anios;
    resumen!.textContent = tpl.replace('{years}', String(v.anios)).replace('{total}', pesos.format(total)).replace('{contrib}', pesos.format(aportado));
    if (!svg || !area || !lContrib || !lComp) return;
    const s = series(v);
    const step = niceStep(Math.max(total, 1));
    const max = Math.max(step, Math.ceil(total / step) * step);
    lComp.setAttribute('d', path(s.comp, max));
    lContrib.setAttribute('d', path(s.aportes, max));
    const p = path(s.comp, max);
    area.setAttribute('d', p ? p + ` L${W} ${H} L0 ${H} Z` : '');
    if (grid && yticks) {
      let g = '', labels = '';
      for (let y = step; y <= max + 1e-6; y += step) {
        const py = H - (y / max) * H;
        g += `<line x1="0" x2="${W}" y1="${py.toFixed(1)}" y2="${py.toFixed(1)}"/>`;
        labels += `<span style="top:${((py / H) * 100).toFixed(2)}%">${cortos.format(y)}</span>`;
      }
      grid.innerHTML = g; yticks.innerHTML = labels;
    }
    if (xticks) {
      const every = v.anios > 20 ? 10 : v.anios > 10 ? 5 : v.anios > 5 ? 2 : 1;
      const marks: string[] = [];
      for (let a = 0; a <= v.anios; a += every) marks.push(String(a));
      if (marks[marks.length - 1] !== String(v.anios)) marks.push(String(v.anios));
      xticks.innerHTML = marks.map((m) => `<span>${m}</span>`).join('');
    }
  }
  Object.values(sl).forEach((el) => el!.addEventListener('input', pintar));
  pintar();
}

document.querySelectorAll<HTMLElement>('[data-widget="compound"]').forEach(montar);
