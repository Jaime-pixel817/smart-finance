// Pinta el módulo "Riesgo y retorno" (RiskReturn.astro).
//
// Toda la aritmética viene de src/lib/finance/risk.mjs (con tests): aquí solo
// se leen los dos sliders, se le pide una simulación y se convierten sus
// series en un abanico de SVG, tres cifras y dos frases. Ningún texto vive en
// este archivo: las plantillas viajan en data-* desde el componente.
//
// La semilla arranca fija (la del módulo) para que la página abra igual para
// todo el mundo y para que una captura sea repetible; "simular otra vez" solo
// cambia ese número.
import { simular } from '../../lib/finance/risk.mjs';

function montar(raiz: HTMLElement) {
  const locale = raiz.dataset.locale === 'es' ? 'es' : 'en';
  const region = locale === 'es' ? 'es-MX' : 'en-US';
  const pesos = new Intl.NumberFormat(region, { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
  let cortos: Intl.NumberFormat;
  try { cortos = new Intl.NumberFormat(region, { style: 'currency', currency: 'MXN', notation: 'compact', maximumFractionDigits: 1 }); } catch { cortos = pesos; }
  const pct1 = new Intl.NumberFormat(region, { maximumFractionDigits: 1, signDisplay: 'auto' });

  const q = <T extends Element>(s: string) => raiz.querySelector<T>(s);
  const slAcciones = q<HTMLInputElement>('[data-param="a"]');
  const slAnios = q<HTMLInputElement>('[data-param="h"]');
  if (!slAcciones || !slAnios) return;
  const outAcciones = q<HTMLElement>('#rrStocksOut'), outAnios = q<HTMLElement>('#rrYearsOut');
  const etiqueta = q<HTMLElement>('[data-rr-label]');
  const mediana = q<HTMLElement>('[data-rr-median]'), rango = q<HTMLElement>('[data-rr-range]');
  const banda = q<SVGPathElement>('[data-rr-band]'), linea = q<SVGPathElement>('[data-rr-median-path]');
  const inicio = q<SVGPathElement>('[data-rr-start]');
  const grid = q<SVGGElement>('[data-rr-grid]'), yticks = q<HTMLElement>('[data-rr-yticks]'), xticks = q<HTMLElement>('[data-rr-xticks]');
  const esperado = q<HTMLElement>('[data-rr-expected]');
  const peor = q<HTMLElement>('[data-rr-worst]'), peorNota = q<HTMLElement>('[data-rr-worst-note]');
  const otraVez = q<HTMLButtonElement>('[data-rr-again]');

  const caminos = Number(raiz.dataset.caminos) || 200;
  const inicial = Number(raiz.dataset.inicial) || 10000;
  const cetesPct = Number(raiz.dataset.cetes) || undefined;
  const tpl = {
    result: raiz.dataset.resultTpl || '',
    range: raiz.dataset.rangeTpl || '',
    stocks: raiz.dataset.stocksTpl || '',
    year: raiz.dataset.yearTpl || '',
    worst: raiz.dataset.worstTpl || ''
  };
  // La primera corrida es siempre la misma: la semilla por omisión del módulo.
  let semilla: number | undefined;

  const W = 600, H = 200;
  /** "Números bonitos" para 3–4 marcas del eje Y (mismo criterio que la calculadora). */
  function niceStep(max: number, ticks = 4): number {
    const raw = max / ticks, mag = Math.pow(10, Math.floor(Math.log10(raw)));
    for (const m of [1, 2, 2.5, 5, 10]) if (raw <= m * mag) return m * mag;
    return 10 * mag;
  }
  const x = (i: number, n: number) => (n < 2 ? 0 : (i / (n - 1)) * W);
  const y = (v: number, max: number) => H - (v / max) * H;
  function linePath(vals: number[], max: number): string {
    return vals.map((v, i) => (i ? 'L' : 'M') + x(i, vals.length).toFixed(1) + ' ' + y(v, max).toFixed(1)).join(' ');
  }
  /** Banda cerrada: p90 de ida, p10 de regreso. */
  function bandPath(bajo: number[], alto: number[], max: number): string {
    if (alto.length < 2) return '';
    const ida = alto.map((v, i) => (i ? 'L' : 'M') + x(i, alto.length).toFixed(1) + ' ' + y(v, max).toFixed(1)).join(' ');
    const vuelta = bajo.slice().reverse().map((v, i) => 'L' + x(bajo.length - 1 - i, bajo.length).toFixed(1) + ' ' + y(v, max).toFixed(1)).join(' ');
    return ida + ' ' + vuelta + ' Z';
  }

  function pintar() {
    const pctAcciones = Number(slAcciones!.value);
    const anios = Number(slAnios!.value);
    const r = simular({ pctAcciones, anios, inicial, caminos, cetesPct, ...(semilla === undefined ? {} : { semilla }) });

    if (outAcciones) {
      outAcciones.textContent = tpl.stocks
        .replace('{stocks}', pctAcciones + ' %')
        .replace('{cetes}', (100 - pctAcciones) + ' %');
    }
    if (outAnios) outAnios.textContent = String(anios);
    if (etiqueta) etiqueta.textContent = tpl.result.replace('{years}', String(anios));
    if (mediana) mediana.textContent = pesos.format(r.finalP50);
    if (rango) rango.textContent = tpl.range.replace('{low}', pesos.format(r.finalP10)).replace('{high}', pesos.format(r.finalP90));
    if (esperado) esperado.textContent = tpl.year.replace('{rate}', pct1.format(r.anualizadoP50Pct) + ' %');
    if (peor) peor.textContent = pct1.format(r.peorAnioPct) + ' %';
    if (peorNota) peorNota.textContent = tpl.worst.replace('{n}', String(anios * caminos));

    // Escala: el techo del abanico, redondeado a un número bonito.
    const step = niceStep(Math.max(r.finalP90, inicial * 1.2));
    const max = Math.max(step, Math.ceil(r.finalP90 / step) * step);
    banda?.setAttribute('d', bandPath(r.p10, r.p90, max));
    linea?.setAttribute('d', linePath(r.p50, max));
    inicio?.setAttribute('d', `M0 ${y(inicial, max).toFixed(1)} L${W} ${y(inicial, max).toFixed(1)}`);

    if (grid && yticks) {
      let g = '', labels = '';
      for (let v = step; v <= max + 1e-6; v += step) {
        const py = y(v, max);
        g += `<line x1="0" x2="${W}" y1="${py.toFixed(1)}" y2="${py.toFixed(1)}"/>`;
        labels += `<span style="top:${((py / H) * 100).toFixed(2)}%">${cortos.format(v)}</span>`;
      }
      grid.innerHTML = g;
      yticks.innerHTML = labels;
    }
    if (xticks) {
      const cada = anios > 20 ? 10 : anios > 10 ? 5 : anios > 5 ? 2 : 1;
      const marcas: string[] = [];
      for (let a = 0; a <= anios; a += cada) marcas.push(String(a));
      if (marcas[marcas.length - 1] !== String(anios)) marcas.push(String(anios));
      xticks.innerHTML = marcas.map((m) => `<span>${m}</span>`).join('');
    }
  }

  slAcciones.addEventListener('input', pintar);
  slAnios.addEventListener('input', pintar);
  otraVez?.addEventListener('click', () => {
    semilla = (Math.floor(Math.random() * 0xFFFFFFFF) >>> 0) || 1;
    pintar();
  });
  pintar();
}

document.querySelectorAll<HTMLElement>('[data-widget="risk"]').forEach(montar);
