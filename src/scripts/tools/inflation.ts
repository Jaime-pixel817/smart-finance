// Pinta la herramienta "¿Cuánto me come la inflación?" (InflationTool.astro).
// Toda la aritmética viene de src/lib/finance/inflation.mjs (con tests); aquí
// solo se leen los sliders, se formatea y se mueven el ancho de una barra y el
// texto de la conclusión.
import { resumenInflacion } from '../../lib/finance/inflation.mjs';
import { conectar } from './url-state';

function montar(raiz: HTMLElement) {
  const locale = raiz.dataset.locale === 'es' ? 'es' : 'en';
  const region = locale === 'es' ? 'es-MX' : 'en-US';
  const pesos = new Intl.NumberFormat(region, { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
  const pct1 = new Intl.NumberFormat(region, { maximumFractionDigits: 1 });

  const q = <T extends Element>(s: string) => raiz.querySelector<T>(s);
  const sl = {
    precio: q<HTMLInputElement>('[data-param="p"]'),
    inflacion: q<HTMLInputElement>('[data-param="i"]'),
    anios: q<HTMLInputElement>('[data-param="y"]')
  };
  if (!sl.precio || !sl.inflacion || !sl.anios) return;
  const out = { precio: q<HTMLElement>('#ifPriceOut'), inflacion: q<HTMLElement>('#ifRateOut'), anios: q<HTMLElement>('#ifYearsOut') };
  const need = q<HTMLElement>('[data-if-need]');
  const power = q<HTMLElement>('[data-if-power]');
  const nowLabel = q<HTMLElement>('[data-if-now-label]'), nowVal = q<HTMLElement>('[data-if-now-val]');
  const laterLabel = q<HTMLElement>('[data-if-later-label]'), laterVal = q<HTMLElement>('[data-if-later-val]');
  const barra = q<SVGRectElement>('[data-if-bar]');
  const parkedNom = q<HTMLElement>('[data-if-parked-nom]'), parkedReal = q<HTMLElement>('[data-if-parked-real]');
  const invNom = q<HTMLElement>('[data-if-inv-nom]'), invReal = q<HTMLElement>('[data-if-inv-real]');
  const verdict = q<HTMLElement>('[data-if-verdict]');
  const tasa = Number(raiz.dataset.rate || '') || 0;

  function pintar() {
    const precio = Number(sl.precio!.value);
    const inflacion = Number(sl.inflacion!.value);
    const anios = Number(sl.anios!.value);
    const r = resumenInflacion({ precio, inflacionPct: inflacion, anios, tasaPct: tasa });

    out.precio!.textContent = pesos.format(precio);
    out.inflacion!.textContent = pct1.format(inflacion) + ' %';
    out.anios!.textContent = String(anios);

    if (need) need.textContent = pesos.format(r.precioFuturo);
    if (power) {
      power.textContent = (raiz.dataset.powerTpl || '')
        .replace('{price}', pesos.format(precio))
        .replace('{power}', pesos.format(r.poder))
        .replace('{lost}', pct1.format(r.perdidoPct) + ' %');
    }
    if (nowLabel) nowLabel.textContent = raiz.dataset.nowTpl || '';
    if (nowVal) nowVal.textContent = pesos.format(precio);
    if (laterLabel) laterLabel.textContent = (raiz.dataset.laterTpl || '').replace('{years}', String(anios));
    if (laterVal) laterVal.textContent = pesos.format(r.poder);
    // La barra encoge en proporción a lo que sigue comprando el mismo dinero.
    if (barra) barra.setAttribute('width', String(Math.max(0, Math.min(100, (r.poder / precio) * 100))));

    if (parkedNom) parkedNom.textContent = pesos.format(r.parado.nominal);
    if (parkedReal) parkedReal.textContent = pesos.format(r.parado.real);
    if (invNom) invNom.textContent = pesos.format(r.invertido.nominal);
    if (invReal) invReal.textContent = pesos.format(r.invertido.real);
    if (verdict) verdict.textContent = (r.tasaRealPct >= 0 ? raiz.dataset.win : raiz.dataset.lose) || '';
  }

  conectar(raiz, pintar, 'inflacion');
}

document.querySelectorAll<HTMLElement>('[data-widget="inflation"]').forEach(montar);
