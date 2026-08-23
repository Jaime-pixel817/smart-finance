// Pinta la herramienta "CETES vs cuenta vs inflación" (CetesTool.astro).
// La comparación entera la resuelve src/lib/finance/savings.mjs (con tests);
// aquí solo se leen los cinco sliders, se formatea y se elige la frase final.
import { compararAhorro } from '../../lib/finance/savings.mjs';
import { conectar } from './url-state';

function montar(raiz: HTMLElement) {
  const locale = raiz.dataset.locale === 'es' ? 'es' : 'en';
  const region = locale === 'es' ? 'es-MX' : 'en-US';
  const pesos = new Intl.NumberFormat(region, { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
  const pct2 = new Intl.NumberFormat(region, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pct1 = new Intl.NumberFormat(region, { maximumFractionDigits: 1 });

  const q = <T extends Element>(s: string) => raiz.querySelector<T>(s);
  const sl = {
    monto: q<HTMLInputElement>('[data-param="a"]'),
    anios: q<HTMLInputElement>('[data-param="y"]'),
    cetes: q<HTMLInputElement>('[data-param="c"]'),
    cuenta: q<HTMLInputElement>('[data-param="b"]'),
    inflacion: q<HTMLInputElement>('[data-param="i"]')
  };
  if (!sl.monto || !sl.anios || !sl.cetes || !sl.cuenta || !sl.inflacion) return;
  const out = {
    monto: q<HTMLElement>('#ctAmountOut'), anios: q<HTMLElement>('#ctYearsOut'), cetes: q<HTMLElement>('#ctCetesOut'),
    cuenta: q<HTMLElement>('#ctAccountOut'), inflacion: q<HTMLElement>('#ctInflationOut')
  };
  const big = q<HTMLElement>('[data-ct-big]'), real = q<HTMLElement>('[data-ct-real]');
  const verdict = q<HTMLElement>('[data-ct-verdict]');
  const barra = (n: number) => q<SVGRectElement>(`[data-ct-b${n}]`);
  const barraVal = (n: number) => q<HTMLElement>(`[data-ct-b${n}-val]`);
  const celda = (n: number, k: 'nom' | 'real') => q<HTMLElement>(`[data-ct-t${n}-${k}]`);

  function pintar() {
    const monto = Number(sl.monto!.value);
    const anios = Number(sl.anios!.value);
    const cetesPct = Number(sl.cetes!.value);
    const cuentaPct = Number(sl.cuenta!.value);
    const inflacionPct = Number(sl.inflacion!.value);
    const r = compararAhorro({ monto, anios, cetesPct, cuentaPct, inflacionPct });

    out.monto!.textContent = pesos.format(monto);
    out.anios!.textContent = String(anios);
    out.cetes!.textContent = pct2.format(cetesPct) + ' %';
    out.cuenta!.textContent = pct2.format(cuentaPct) + ' %';
    out.inflacion!.textContent = pct1.format(inflacionPct) + ' %';

    if (big) big.textContent = pesos.format(r.cetes.nominal);
    if (real) real.textContent = (raiz.dataset.realTpl || '').replace('{real}', pesos.format(r.cetes.real));

    // Las cuatro barras comparten escala: el más alto ocupa el 100 %.
    const valores = [monto, r.cetes.real, r.cuenta.real, r.efectivo.real];
    const max = Math.max(...valores) || 1;
    valores.forEach((v, i) => {
      barra(i)?.setAttribute('width', String(Math.max(0, Math.min(100, (v / max) * 100))));
      const etiqueta = barraVal(i);
      if (etiqueta) etiqueta.textContent = pesos.format(v);
    });

    const filas = [r.cetes, r.cuenta, r.efectivo];
    filas.forEach((d, i) => {
      const nom = celda(i + 1, 'nom'), rl = celda(i + 1, 'real');
      if (nom) nom.textContent = pesos.format(d.nominal);
      if (rl) rl.textContent = pesos.format(d.real);
    });

    if (verdict) {
      const brecha = pesos.format(Math.abs(r.brechaReal));
      const base = r.ganador === 'empate'
        ? (raiz.dataset.tie || '')
        : (r.ganador === 'cuenta' ? (raiz.dataset.winAccount || '') : (raiz.dataset.winCetes || '')).replace('{gap}', brecha);
      // El ganador puede seguir perdiendo contra la inflación: eso se dice.
      const mejor = Math.max(r.cetes.real, r.cuenta.real);
      const cola = mejor >= monto ? (raiz.dataset.beats || '') : (raiz.dataset.stillLosing || '');
      verdict.textContent = base + ' ' + cola;
    }
  }

  conectar(raiz, pintar);
}

document.querySelectorAll<HTMLElement>('[data-widget="cetes"]').forEach(montar);
