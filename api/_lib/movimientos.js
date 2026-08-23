// "Qué se movió esta semana": los que más subieron y los que más bajaron del
// registro de activos del sitio.
//
// POR QUÉ NO BASTABA CON EL DÓLAR
// -------------------------------
// El correo enseñaba dos números —USD/MXN y el VIX— y una gráfica. Eso dice
// cómo le fue al peso, no cómo le fue al mercado. Un boletín semanal que se
// llama "la semana del mercado" y solo habla del dólar obliga al lector a
// entrar al sitio para enterarse de lo que pasó, y la mayoría no entra.
//
// DE DÓNDE SALEN LOS NÚMEROS
// --------------------------
// De /api/history?pair=<X>&range=1W, el MISMO endpoint que dibuja las gráficas
// del sitio (Yahoo Finance, gratis, caché de 60 s compartida en Redis). El
// cambio se mide igual que en el resto del correo: primer punto contra último
// de la semana. Nada de /api/markets: su cuota de Twelve Data va contada y una
// llamada más por semana no vale el riesgo (ver CLAUDE.md).
//
// POR QUÉ NO HAY CRIPTO EN ESTA TABLA, que es la decisión menos obvia de aquí.
// `range=1W` es `5d` de calendario: para una acción eso son las cinco sesiones
// de lunes a viernes, y para el bitcoin son los últimos cinco días CONTANDO el
// fin de semana, que además terminan en el minuto en que sale el correo. En la
// primera versión de esta tabla salían Ethereum +27.50 % y el S&P 500 −1.26 %
// en la misma columna, con el mismo encabezado, midiendo periodos distintos:
// una comparación falsa presentada como una lista ordenada. Con los nueve que
// quedan —siete de la sesión de EE. UU. y dos divisas— la ventana es la misma
// para todos (lunes 13:30 UTC → viernes 20:00 UTC) y la columna significa una
// sola cosa. La cripto vuelve el día que se mida contra la misma semana, no
// antes; mientras tanto sigue teniendo su ficha en /market.
//
// LA LISTA ES UNA COPIA DE src/data/symbols.ts, y no puede dejar de serlo:
// symbols.ts es TypeScript y vive en src/, que api/ no importa. Contra la
// desincronización hay una prueba (boletin.test.mjs) que abre symbols.ts y
// comprueba que cada entrada de aquí existe allá con el mismo ticker y el mismo
// par de historial. Si alguien renombra un símbolo, la prueba lo dice.
//
// EL DÓLAR Y EL VIX TAMPOCO ESTÁN, por otro motivo: tienen su propio bloque
// justo encima, con su gráfica. Repetirlos aquí sería enseñar el mismo dato dos
// veces y gastar el sitio que necesita lo que el lector no ha visto.

// pair = la clave de /api/history. Todos comparten ventana semanal, que es la
// condición para poder ordenarlos en la misma columna.
const ACTIVOS = [
  { id: 'spy',    sym: 'SPY',     pair: 'SPY',    en: 'S&P 500',        es: 'S&P 500' },
  { id: 'qqq',    sym: 'QQQ',     pair: 'QQQ',    en: 'Nasdaq 100',     es: 'Nasdaq 100' },
  { id: 'dia',    sym: 'DIA',     pair: 'DIA',    en: 'Dow Jones',      es: 'Dow Jones' },
  { id: 'aapl',   sym: 'AAPL',    pair: 'AAPL',   en: 'Apple',          es: 'Apple' },
  { id: 'msft',   sym: 'MSFT',    pair: 'MSFT',   en: 'Microsoft',      es: 'Microsoft' },
  { id: 'nvda',   sym: 'NVDA',    pair: 'NVDA',   en: 'Nvidia',         es: 'Nvidia' },
  { id: 'amzn',   sym: 'AMZN',    pair: 'AMZN',   en: 'Amazon',         es: 'Amazon' },
  { id: 'eurmxn', sym: 'EUR/MXN', pair: 'EURMXN', en: 'Euro in pesos',  es: 'Euro en pesos' },
  { id: 'eurusd', sym: 'EUR/USD', pair: 'EURUSD', en: 'Euro in dollars', es: 'Euro en dólares' }
];


// Cuántos se enseñan de cada lado. Tres y tres caben en un correo sin volverlo
// una hoja de cálculo, y de nueve activos son dos tercios: lo que queda fuera
// es el montón de en medio, que es justo lo que no es noticia.
const CUANTOS = 3;

// Menos de esto y la tabla no sale. Con tres o cuatro respuestas, "los que más
// subieron" serían "los únicos que contestaron", y eso es un titular falso
// disfrazado de dato. Seis es además el mínimo para que los tres de arriba y
// los tres de abajo no puedan ser el mismo activo.
const MINIMO_PARA_PUBLICAR = 6;

// Cuántas peticiones a la vez. Las nueve de golpe contra Yahoo (aunque sea por
// nuestro propio endpoint) es la forma de que empiece a contestar 429 justo el
// domingo a las 8 de la mañana; de cuatro en cuatro son tres rondas.
const A_LA_VEZ = 4;

// Tope de todo el bloque. Es un adorno del correo, no el correo: si la semana
// tarda más que esto en llegar, sale sin tabla y con todo lo demás intacto.
const PRESUPUESTO_MS = 12000;
const MS_POR_PETICION = 6000;

async function pedirSerie(base, pair, pedirJSON) {
  const datos = await pedirJSON(base + '/api/history?pair=' + pair + '&range=1W', MS_POR_PETICION);
  const puntos = (datos && datos.points) || [];
  if (puntos.length < 2) return null;

  const primero = puntos[0][1];
  const ultimo = puntos[puntos.length - 1][1];
  if (typeof primero !== 'number' || typeof ultimo !== 'number' || !primero) return null;

  return {
    valor: ultimo,
    cambioPct: ((ultimo - primero) / primero) * 100,
    ultimoTs: puntos[puntos.length - 1][0]
  };
}

/**
 * Devuelve { suben, bajan, asOf } o null si no hay bastante para publicar.
 *
 * `pedirJSON` se inyecta (lo pasa boletin.js) en vez de importarse: es la misma
 * función con el mismo presupuesto de tiempo que usa el resto del correo, y así
 * las pruebas pueden pasar una de mentira sin tocar la red.
 */
async function delaSemana(base, pedirJSON) {
  const limite = Date.now() + PRESUPUESTO_MS;
  const resultados = [];

  for (let i = 0; i < ACTIVOS.length; i += A_LA_VEZ) {
    if (Date.now() > limite) {
      console.warn('boletín: "qué se movió" se quedó sin tiempo; sale con ' + resultados.length + ' activos');
      break;
    }

    const tanda = ACTIVOS.slice(i, i + A_LA_VEZ);
    const hechos = await Promise.all(tanda.map(async (a) => {
      try {
        const s = await pedirSerie(base, a.pair, pedirJSON);
        return s ? Object.assign({}, a, s) : null;
      } catch (e) {
        // Un activo que no contesta no puede tumbar la tabla entera: sale la
        // tabla con los que sí, y este simplemente no aparece.
        console.error('boletín: falló ' + a.sym + ':', e.message);
        return null;
      }
    }));

    for (const h of hechos) if (h) resultados.push(h);
  }

  if (resultados.length < MINIMO_PARA_PUBLICAR) {
    console.warn('boletín: solo ' + resultados.length + ' de ' + ACTIVOS.length +
      ' activos contestaron; no sale la tabla de "qué se movió"');
    return null;
  }

  const ordenados = resultados.slice().sort((a, b) => b.cambioPct - a.cambioPct);
  const suben = ordenados.slice(0, CUANTOS).filter((x) => x.cambioPct > 0);
  // Del final hacia atrás: el que más bajó primero.
  const bajan = ordenados.slice(-CUANTOS).reverse().filter((x) => x.cambioPct < 0);

  // Un mercado entero en verde (o en rojo) es normal y la tabla lo tiene que
  // poder decir. Si un lado se queda vacío, el otro se queda como está: se
  // enseña lo que pasó, no una simetría inventada.
  if (!suben.length && !bajan.length) return null;

  return {
    suben,
    bajan,
    // El punto más reciente de todos: es la hora de la que habla la tabla, y va
    // en el chip de fuente que la acompaña.
    asOf: resultados.reduce((max, x) => Math.max(max, x.ultimoTs || 0), 0) || null,
    consultados: resultados.length
  };
}

module.exports = { delaSemana, ACTIVOS, CUANTOS, MINIMO_PARA_PUBLICAR };
