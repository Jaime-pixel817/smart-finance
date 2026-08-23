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
// una comparación falsa presentada como una lista ordenada.
//
// SACAR LA CRIPTO NO BASTÓ, y esto costó otra vuelta. Quedaban nueve —siete de
// la sesión de EE. UU. y dos divisas— y aquí decía que los nueve compartían
// ventana (lunes 13:30 UTC → viernes 20:00 UTC). Era mentira, medido:
//
//   SPY/QQQ/DIA/AAPL/MSFT/NVDA/AMZN   lun 13:30Z → vie 20:00Z
//   EUR/MXN                           dom 23:00Z → vie 22:00Z
//   EUR/USD                           dom 23:00Z → vie 21:00Z
//
// El FX abre el domingo por la noche y cierra un par de horas después: ~14.5 h
// de más por delante y 1–2 h por detrás. No era teórico. En la semana del
// 2026-08-17, EUR/MXN salía TERCERO de los que más subieron con +0.20 % y en la
// ventana de las acciones sube +0.07 %; el que le tocaba ese puesto era
// Microsoft (+0.14 %). El mismo defecto por el que se sacó la cripto, en la
// tabla que se rediseñó para evitarlo, decidiendo una fila de seis.
//
// ASÍ QUE LA VENTANA YA NO SE DECLARA: SE CALCULA Y SE RECORTA. Se toma la que
// comparten de verdad los de la sesión de EE. UU. y todas las series se cortan
// a ella antes de medir el cambio. La cripto vuelve el día que se mida contra
// la misma semana, no antes; mientras tanto sigue teniendo su ficha en /market.
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

// pair = la clave de /api/history.
//
// `sesion` dice en qué horario cotiza cada uno, y NO es decorativo: los 'us'
// son los que definen la ventana de la tabla, y contra ellos se recorta todo lo
// demás. Un activo nuevo que no cotice en la sesión de EE. UU. entra como 'fx'
// (o como lo que sea) y se recorta igual; lo que no puede es entrar como 'us'
// sin cotizar en ella, porque entonces mueve la ventana de todos.
const ACTIVOS = [
  { id: 'spy',    sym: 'SPY',     pair: 'SPY',    sesion: 'us', en: 'S&P 500',        es: 'S&P 500' },
  { id: 'qqq',    sym: 'QQQ',     pair: 'QQQ',    sesion: 'us', en: 'Nasdaq 100',     es: 'Nasdaq 100' },
  { id: 'dia',    sym: 'DIA',     pair: 'DIA',    sesion: 'us', en: 'Dow Jones',      es: 'Dow Jones' },
  { id: 'aapl',   sym: 'AAPL',    pair: 'AAPL',   sesion: 'us', en: 'Apple',          es: 'Apple' },
  { id: 'msft',   sym: 'MSFT',    pair: 'MSFT',   sesion: 'us', en: 'Microsoft',      es: 'Microsoft' },
  { id: 'nvda',   sym: 'NVDA',    pair: 'NVDA',   sesion: 'us', en: 'Nvidia',         es: 'Nvidia' },
  { id: 'amzn',   sym: 'AMZN',    pair: 'AMZN',   sesion: 'us', en: 'Amazon',         es: 'Amazon' },
  { id: 'eurmxn', sym: 'EUR/MXN', pair: 'EURMXN', sesion: 'fx', en: 'Euro in pesos',  es: 'Euro en pesos' },
  { id: 'eurusd', sym: 'EUR/USD', pair: 'EURUSD', sesion: 'fx', en: 'Euro in dollars', es: 'Euro en dólares' }
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
//
// Las cuentas importan porque esto corre DENTRO del envío, que tiene 60 s de
// función y un presupuesto de 50 s para escribirle a la lista. El plazo se mira
// entre tandas, así que lo peor que puede pasar es cruzarlo justo al empezar
// una: 8 s + los 5 de esa tanda = 13 s. En la práctica son dos o tres segundos,
// porque /api/history contesta en menos de uno.
const PRESUPUESTO_MS = 8000;
const MS_POR_PETICION = 5000;

// Trae la serie EN CRUDO. Antes esta función ya devolvía el cambio calculado, y
// ahí estaba el problema: medía cada activo contra su propia ventana antes de
// que nadie pudiera compararlas. Ahora el cambio se calcula más abajo, cuando ya
// se sabe qué ventana comparten todos.
async function pedirSerie(base, pair, pedirJSON) {
  const datos = await pedirJSON(base + '/api/history?pair=' + pair + '&range=1W', MS_POR_PETICION);
  const puntos = ((datos && datos.points) || []).filter(
    (p) => Array.isArray(p) && typeof p[0] === 'number' && typeof p[1] === 'number'
  );
  return puntos.length >= 2 ? puntos : null;
}

/**
 * La ventana que comparten DE VERDAD los activos de la sesión de EE. UU.:
 * del más tardío de los inicios al más temprano de los finales.
 *
 * Se saca de los datos y no de una constante escrita a mano a propósito. "Lunes
 * 13:30 UTC" solo es cierto medio año: con el horario de invierno de Nueva York
 * la apertura se va a las 14:30, y un lunes festivo la semana empieza el martes.
 * Una constante mentiría dos veces al año sin que nada avisara — que es
 * exactamente cómo esta tabla acabó declarando una ventana que no tenía.
 *
 * Es la intersección y no la unión porque la intersección es la única en la que
 * TODOS tienen datos: en la unión, el que no cotiza en los bordes se mide en un
 * periodo más largo, que es el fallo que esto arregla.
 */
function ventanaDeLaSesion(series) {
  const us = series.filter((s) => s.sesion === 'us' && s.puntos);
  if (!us.length) return null;

  const ini = Math.max.apply(null, us.map((s) => s.puntos[0][0]));
  const fin = Math.min.apply(null, us.map((s) => s.puntos[s.puntos.length - 1][0]));
  return fin > ini ? { ini, fin } : null;
}

/**
 * Recorta una serie a la ventana común y mide el cambio de punto a punto.
 *
 * El recorte es a los puntos que CAEN DENTRO, no a un interpolado: preferimos
 * empezar a medir el FX a las 14:00 (su primer punto dentro de la sesión) que
 * inventar un precio a las 13:30 que nadie cotizó. El desfase que queda es el
 * de la resolución de la serie —una hora como mucho—, contra las 14.5 h que
 * había antes.
 */
function medirEnVentana(puntos, ventana) {
  const dentro = puntos.filter((p) => p[0] >= ventana.ini && p[0] <= ventana.fin);
  if (dentro.length < 2) return null;

  const primero = dentro[0][1];
  const ultimo = dentro[dentro.length - 1][1];
  if (!primero) return null;

  return {
    valor: ultimo,
    cambioPct: ((ultimo - primero) / primero) * 100,
    ultimoTs: dentro[dentro.length - 1][0]
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
        const puntos = await pedirSerie(base, a.pair, pedirJSON);
        return puntos ? Object.assign({}, a, { puntos: puntos }) : null;
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

  // La ventana común, y todos recortados a ella. Sin ventana no hay tabla: una
  // columna ordenada en la que cada fila mide un periodo distinto es una
  // comparación falsa, y preferimos el correo sin este bloque a con él mintiendo.
  const ventana = ventanaDeLaSesion(resultados);
  if (!ventana) {
    console.warn('boletín: sin serie de la sesión de EE. UU. no hay ventana común; no sale la tabla');
    return null;
  }

  const medidos = [];
  for (const r of resultados) {
    const m = medirEnVentana(r.puntos, ventana);
    if (!m) {
      console.warn('boletín: ' + r.sym + ' no tiene dos puntos dentro de la ventana común; se queda fuera');
      continue;
    }
    // Sin `puntos`: la serie entera se archiva con el número y no hace falta
    // guardar cinco días de precios por activo para enseñar un porcentaje.
    const fila = Object.assign({}, r, m);
    delete fila.puntos;
    medidos.push(fila);
  }

  if (medidos.length < MINIMO_PARA_PUBLICAR) {
    console.warn('boletín: solo ' + medidos.length + ' activos caen dentro de la ventana común; no sale la tabla');
    return null;
  }

  const ordenados = medidos.slice().sort((a, b) => b.cambioPct - a.cambioPct);
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
    // El final de la ventana común, que ahora es el mismo para todos: la hora
    // de la que habla la tabla entera. Antes era el punto más nuevo de
    // cualquiera, y lo ganaba siempre el FX con su cierre de dos horas después
    // — el chip anunciaba una hora a la que la mitad de las filas ya no medía.
    asOf: ventana.fin,
    ventana: ventana,
    consultados: medidos.length
  };
}

module.exports = { delaSemana, ACTIVOS, CUANTOS, MINIMO_PARA_PUBLICAR, ventanaDeLaSesion, medirEnVentana };
