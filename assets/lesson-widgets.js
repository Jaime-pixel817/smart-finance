/* Widgets interactivos de las lecciones.
 *
 * Por ahora hay uno: la calculadora de interés compuesto de
 * /lessons/interes-compuesto. La lección dedica una sección entera a "la
 * curva" y no enseñaba ninguna; esto la pinta con los números del lector.
 *
 * El HTML del widget vive completo en la página (sliders, canvas, leyenda,
 * resumen): así sus textos llevan data-i18n y el generador de /es los traduce
 * como al resto de la lección. Aquí solo se les da vida.
 *
 * La gráfica usa el Chart.js 4.4.0 del mismo CDN que ya carga el home. Si el
 * CDN no responde, los sliders y el resumen siguen funcionando sin gráfica:
 * nada de este archivo hace peticiones de red propias.
 */
(function () {
  'use strict';

  // Valor futuro de una serie de aportes mensuales con capitalización
  // mensual: aporte * (((1+i)^n − 1) / i), con i la tasa mensual y n los
  // meses. Es la anualidad ordinaria: el aporte entra al final de cada mes.
  function valorFuturo(aporteMensual, tasaAnualPct, meses) {
    const i = (tasaAnualPct / 100) / 12;
    if (i === 0) return aporteMensual * meses;
    return aporteMensual * (Math.pow(1 + i, meses) - 1) / i;
  }

  function montarCompound(raiz) {
    const esEs = document.documentElement.lang === 'es';
    const region = esEs ? 'es-MX' : 'en-US';
    const dic = window.ARTICLE_I18N || {};

    // MXN según el idioma de la página: "$589,016" en es-MX,
    // "MX$589,016" en en-US. Sin decimales: aquí importa la forma, no el centavo.
    const pesos = new Intl.NumberFormat(region, {
      style: 'currency', currency: 'MXN', maximumFractionDigits: 0
    });
    // Para los ticks del eje: "$500 k" / "MX$500K". Si el navegador no trae
    // notation compact (muy viejo), se cae al formato completo.
    let pesosCortos;
    try {
      pesosCortos = new Intl.NumberFormat(region, {
        style: 'currency', currency: 'MXN', notation: 'compact', maximumFractionDigits: 1
      });
    } catch (e) { pesosCortos = pesos; }
    const numero = new Intl.NumberFormat(region, { maximumFractionDigits: 1 });

    const sliders = {
      aporte: raiz.querySelector('[data-lw="monthly"]'),
      tasa: raiz.querySelector('[data-lw="rate"]'),
      anios: raiz.querySelector('[data-lw="years"]')
    };
    const salidas = {
      aporte: raiz.querySelector('#lwMonthlyOut'),
      tasa: raiz.querySelector('#lwRateOut'),
      anios: raiz.querySelector('#lwYearsOut')
    };
    const resumen = raiz.querySelector('[data-lw-summary]');
    const canvas = raiz.querySelector('canvas');
    if (!sliders.aporte || !sliders.tasa || !sliders.anios || !resumen) return;

    // La plantilla del resumen: en /es sale del diccionario, que viaja en la
    // propia página; en inglés, del atributo data-tpl-en del elemento.
    const plantilla = (esEs && dic['l2.widget.summary_tpl']) ||
      resumen.getAttribute('data-tpl-en') ||
      'After {years} years: {total} — of which only {contrib} came from you.';

    // Los nombres de las series salen de la leyenda visible: en /es ya están
    // traducidos, así que la gráfica habla el idioma de la página sin lógica
    // extra.
    function textoClave(clave, respaldo) {
      const el = raiz.querySelector('[data-i18n="' + clave + '"]');
      const t = el && el.textContent.trim();
      return t || respaldo;
    }

    // Colores y fuente desde los tokens reales de la página, no copiados.
    const css = getComputedStyle(document.documentElement);
    function token(nombre, respaldo) {
      const v = (css.getPropertyValue(nombre) || '').trim();
      return v || respaldo;
    }
    const colCompuesto = token('--brand', '#16C47F');
    const colAportes = token('--muted', '#8A8A8E');
    const colRejilla = token('--line', 'rgba(245, 245, 242, 0.12)');
    const fuenteMono = token('--font-mono', 'ui-monospace, monospace');
    // Relleno bajo la curva: el verde de marca a ~13 % de alfa. Solo si el
    // token es un hex de 6 dígitos, que es como está escrito en tokens.css.
    const colRelleno = /^#[0-9a-f]{6}$/i.test(colCompuesto)
      ? colCompuesto + '22'
      : 'rgba(22, 196, 127, 0.13)';

    const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function leer() {
      return {
        aporte: Number(sliders.aporte.value),
        tasa: Number(sliders.tasa.value),
        anios: Number(sliders.anios.value)
      };
    }

    // Un punto por año, con el año 0 incluido: 31 puntos como máximo. Es
    // suficiente para la forma de la curva y barato de redibujar en el drag.
    function series(v) {
      const etiquetas = [], aportes = [], compuesto = [];
      for (let a = 0; a <= v.anios; a++) {
        etiquetas.push(String(a));
        aportes.push(v.aporte * 12 * a);
        compuesto.push(Math.round(valorFuturo(v.aporte, v.tasa, a * 12)));
      }
      return { etiquetas, aportes, compuesto };
    }

    let grafica = null;
    function montarGrafica(v) {
      if (!window.Chart || !canvas) return;
      const s = series(v);
      grafica = new Chart(canvas, {
        type: 'line',
        data: {
          labels: s.etiquetas,
          datasets: [
            {
              label: textoClave('l2.widget.contrib', 'Just your contributions'),
              data: s.aportes,
              borderColor: colAportes,
              backgroundColor: 'transparent',
              borderWidth: 1.6,
              borderDash: [5, 4],
              pointRadius: 0,
              tension: 0
            },
            {
              label: textoClave('l2.widget.compound', 'With compound interest'),
              data: s.compuesto,
              borderColor: colCompuesto,
              backgroundColor: colRelleno,
              fill: true,
              borderWidth: 2,
              pointRadius: 0,
              tension: 0.25
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          // Con prefers-reduced-motion la gráfica aparece ya dibujada.
          animation: quieto ? false : { duration: 450 },
          interaction: { mode: 'index', intersect: false },
          plugins: {
            // La leyenda es HTML de la página, para que /es la traduzca.
            legend: { display: false },
            tooltip: {
              callbacks: {
                // "12 años" / "12 years": la unidad se lee del label del
                // slider de años, que ya está en el idioma de la página.
                title: function (items) {
                  if (!items.length) return '';
                  return items[0].label + ' ' +
                    textoClave('l2.widget.years', 'years').toLowerCase();
                },
                label: function (item) {
                  return item.dataset.label + ': ' + pesos.format(item.parsed.y);
                }
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              border: { color: colRejilla },
              ticks: {
                color: colAportes,
                font: { family: fuenteMono, size: 10 },
                maxTicksLimit: 8,
                maxRotation: 0
              }
            },
            y: {
              grid: { color: colRejilla },
              border: { display: false },
              ticks: {
                color: colAportes,
                font: { family: fuenteMono, size: 10 },
                maxTicksLimit: 5,
                callback: function (valor) { return pesosCortos.format(valor); }
              }
            }
          }
        }
      });
    }

    function pintar() {
      const v = leer();
      salidas.aporte.textContent = pesos.format(v.aporte);
      salidas.tasa.textContent = numero.format(v.tasa) + '%';
      salidas.anios.textContent = String(v.anios);

      const total = Math.round(valorFuturo(v.aporte, v.tasa, v.anios * 12));
      const aportado = v.aporte * 12 * v.anios;
      resumen.textContent = plantilla
        .replace('{years}', String(v.anios))
        .replace('{total}', pesos.format(total))
        .replace('{contrib}', pesos.format(aportado));

      if (grafica) {
        const s = series(v);
        grafica.data.labels = s.etiquetas;
        grafica.data.datasets[0].data = s.aportes;
        grafica.data.datasets[1].data = s.compuesto;
        // 'none': el redibujo sigue al dedo 1:1. Animar cada tick del slider
        // se siente como retraso, no como animación.
        grafica.update('none');
      }
    }

    Object.keys(sliders).forEach(function (k) {
      sliders[k].addEventListener('input', pintar);
    });

    montarGrafica(leer());
    pintar();
  }

  function arrancar() {
    const raiz = document.querySelector('[data-widget="compound"]');
    if (raiz) montarCompound(raiz);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', arrancar);
  } else {
    arrancar();
  }
})();
