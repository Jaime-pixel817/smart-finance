// Pruebas de Smart Finance AI. Lo que se comprueba aquí es exactamente lo que
// no se ve mirando la página: que una pregunta de "¿compro?" no llegue nunca al
// modelo, que una cifra que el modelo se invente no llegue nunca a la pantalla,
// y que el tope de gasto pare de verdad.
//
// Ninguna prueba llama a Anthropic ni a Redis: el cliente y la caché se
// inyectan de mentira. Una prueba que gasta dinero no se corre.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { construir } from '../../scripts/build-ia-contexto.mjs';

const require = createRequire(import.meta.url);
const ia = require('./ia.js');
const contexto = require('../../src/generated/ia-contexto.json');

// ---------------------------------------------------------------------------
// El manifiesto de grounding sigue siendo el sitio de verdad.

test('el manifiesto commiteado es el que produce el generador hoy', () => {
  assert.deepEqual(
    construir(),
    contexto,
    'src/generated/ia-contexto.json está desactualizado: corre `node scripts/build-ia-contexto.mjs` y commitea'
  );
});

test('hay una lección en el manifiesto por cada MDX del sitio', () => {
  const mdx = readdirSync(new URL('../../src/content/lessons/es/', import.meta.url))
    .filter((f) => f.endsWith('.mdx')).length;
  assert.equal(contexto.lecciones.length, mdx);
  for (const l of contexto.lecciones) {
    assert.ok(l.es.cuerpo.length > 500, l.slug + ': el cuerpo en español salió vacío o cortado');
    assert.ok(l.en.cuerpo.length > 500, l.slug + ': el cuerpo en inglés salió vacío o cortado');
    assert.ok(l.es.fuentes.length >= 2, l.slug + ': el schema exige dos fuentes y no llegaron al manifiesto');
  }
});

// ---------------------------------------------------------------------------
// 1. El clasificador de consejo financiero.

test('rechaza que le pidan un consejo de inversión, en español y en inglés', () => {
  const consejos = [
    '¿compro?', '¿Compro Bitcoin?', '¿vendo mis acciones ahora?',
    '¿cuánto va a subir el dólar?', '¿en qué invierto mis ahorros?',
    '¿me conviene meterle a esto?', '¿es buena inversión?',
    '¿debería comprar ahora o espero?', '¿le entro al Nasdaq?',
    '¿va a bajar el peso la próxima semana?', '¿qué acciones me recomiendas?',
    'should I buy this?', 'is it worth buying now?', 'will it go up next month?',
    'what stocks should I buy', 'give me a price target', 'buy or sell?'
  ];
  for (const c of consejos) {
    assert.equal(ia.esConsejo(c), true, 'no detectó consejo en: ' + c);
  }
});

test('deja pasar las preguntas que sí son de entender', () => {
  const buenas = [
    '¿qué es un ETF?', 'no entendí la parte de las tasas',
    '¿por qué el número sube cuando el peso se debilita?',
    '¿qué significa que subió 2 %?', '¿de dónde sale este dato?',
    'what does the VIX measure?', 'explain this chart to me',
    '¿cuándo cierra la bolsa mexicana?', '¿qué pasó en marzo?'
  ];
  for (const b of buenas) {
    assert.equal(ia.esConsejo(b), false, 'falso positivo en: ' + b);
  }
});

test('caza al modelo dando consejo, y deja pasar la advertencia negada', () => {
  const consejos = [
    'Con esta subida, deberías comprar dólares antes de que suba más.',
    'Te recomiendo esperar a que baje.', 'Es un buen momento para entrar.',
    'El dólar va a subir la próxima semana.', 'Llegará a 21 pesos.',
    'You should buy now.', 'I would sell before earnings.',
    'It is a good time to invest.', 'It will go up from here.'
  ];
  for (const c of consejos) assert.equal(ia.daConsejo(c), true, 'no detectó consejo dado en: ' + c);

  const advertencias = [
    'Nadie sabe si va a subir o a bajar, y quien te diga lo contrario te está vendiendo algo.',
    'Esta explicación no te dice si deberías comprar nada.',
    'This is not a recommendation and nobody knows what it will do next.',
    'El precio pasó de 18.4032 a 19.0100 en el mes.'
  ];
  for (const a of advertencias) assert.equal(ia.daConsejo(a), false, 'falso positivo en: ' + a);
});

test('las otras formas de pedir el consejo, que no son "¿compro?"', () => {
  const consejos = [
    '¿debo comprar dólares?', '¿debo vender ahora?', '¿me conviene entrarle?',
    '¿es momento de entrar?', '¿ya es buen momento para comprar?',
    '¿tú qué harías?', '¿qué me recomiendas?', 'what would you do?',
    'is now a good time?', '¿está barato?', '¿está caro el dólar?',
    '¿la acción está infravalorada?', 'is this cheap?'
  ];
  for (const c of consejos) assert.equal(ia.esConsejo(c), true, 'no detectó consejo en: ' + c);
});

test('preguntar por la CAUSA no es pedir una valuación', () => {
  // "¿está barato?" pide el juicio; "¿por qué está caro?" pide la causa, y esa
  // sí se explica. La diferencia es el porqué, y solo vale en la ENTRADA.
  assert.equal(ia.esConsejo('¿por qué está caro el dólar?'), false);
  assert.equal(ia.esConsejo('why is gold so expensive right now?'), false);
  // En la SALIDA no hay excepción: el prompt le prohíbe al modelo decirlo.
  assert.equal(ia.daConsejo('El dólar está caro porque subió mucho.'), true);
});

test('caza al modelo recomendando sin decir "deberías comprar"', () => {
  const consejos = [
    'Es momento de comprar: el peso está barato en este punto de la serie.',
    'Vale la pena comprar ahora.',
    'This is a good time to buy.',
    'Now is a good entry.',
    'El peso está barato a este nivel.',
    'La acción está infravalorada.',
    'Considera aumentar tu posición.',
    'You should consider buying more.',
    'A este precio parece barata.'
  ];
  for (const c of consejos) assert.equal(ia.daConsejo(c), true, 'no detectó consejo dado en: ' + c);
});

test('"va a valer" pregunta un pronóstico, pero no lo da', () => {
  // La frase está tal cual en la lección de la tarjeta de crédito. Meter
  // "valer" en la lista de SALIDA dejaba muda la lección entera.
  assert.equal(ia.esConsejo('¿cuánto va a valer el dólar en diciembre?'), true);
  assert.equal(
    ia.daConsejo('Deja que los pagos puntuales te construyan un historial que a los veinticinco va a valer dinero de verdad.'),
    false
  );
  assert.equal(ia.daConsejo('El dólar va a subir la próxima semana.'), true);
});

test('el clasificador de salida no enmudece el texto real del sitio', () => {
  // 1,438 frases de las diez lecciones y del glosario. Un falso positivo aquí
  // no es teórico: es una lección que ya no se puede explicar.
  const sospechosas = [];
  const mirar = (etiqueta, texto) => {
    if (typeof texto !== 'string') return;
    for (const f of texto.split(/(?<=[.!?])\s+/)) {
      if (f.trim() && ia.daConsejo(f)) sospechosas.push(etiqueta + ' :: ' + f.trim().slice(0, 90));
    }
  };
  for (const l of contexto.lecciones) {
    mirar('leccion ' + l.slug + ' es', l.es.cuerpo);
    mirar('leccion ' + l.slug + ' en', l.en.cuerpo);
  }
  // Una sola, conocida y aceptada: "prices will rise 6%" de la lección de
  // inflación, que habla de expectativas y no del precio de un activo. Se deja
  // pasar a propósito — estrechar `will rise` abriría la puerta a una
  // predicción de verdad, y la asimetría de este archivo manda al revés.
  assert.deepEqual(
    sospechosas.filter((s) => !/leccion inflacion en/.test(s)), [],
    'el clasificador de salida enmudece texto legítimo del sitio'
  );
  assert.equal(sospechosas.length, 1, 'apareció (o desapareció) un falso positivo conocido');
});

test('ningún patrón vivo termina en `\\b` detrás de una vocal acentuada', () => {
  // El bug que dejaba pasar "subirá", "bajará", "caerá" y "alcanzará". Es
  // invisible leyendo el patrón, así que lo vigila una prueba.
  const listas = {
    PATRONES_CONSEJO: ia.PATRONES_CONSEJO,
    PATRONES_VALUACION: ia.PATRONES_VALUACION,
    PATRONES_CONSEJO_DADO: ia.PATRONES_CONSEJO_DADO
  };
  const trampa = /(?:[áéíóúüñ]|\[[^\]]*[áéíóúüñ][^\]]*\])\\b/;
  for (const [nombre, lista] of Object.entries(listas)) {
    assert.ok(lista.length, nombre + ' no llegó a la prueba');
    for (const re of lista) {
      assert.ok(!trampa.test(re.source),
        nombre + ': `\\b` detrás de una vocal acentuada nunca casa. Termina con FIN. → ' + re.source);
    }
  }
});

test('las predicciones acentuadas SÍ se cazan, en los dos clasificadores', () => {
  // `\b` no es una frontera detrás de una vocal acentuada: /subir[áa]\b/ no
  // casa con "subirá". Las cuatro formas estaban escritas así y las cuatro
  // pasaban de largo por los dos clasificadores.
  for (const c of ['¿el dólar subirá?', '¿bajará el peso?', '¿caerá el Nasdaq?', '¿alcanzará los 21?']) {
    assert.equal(ia.esConsejo(c), true, 'la entrada no cazó: ' + c);
  }
  for (const c of ['El precio subirá.', 'El dólar bajará mañana.', 'La acción caerá pronto.',
    'El índice alcanzará máximos este año.']) {
    assert.equal(ia.daConsejo(c), true, 'la salida no cazó: ' + c);
  }
});

test('la negación solo salva lo que niega el saber o el decir, y en su misma oración', () => {
  // Advertencias: lo negado es el SABER o el DECIR.
  assert.equal(ia.daConsejo('Nadie sabe si va a subir o a bajar.'), false);
  assert.equal(ia.daConsejo('Esta explicación no te dice si deberías comprar nada.'), false);
  assert.equal(ia.daConsejo('No sé si subirá, y quien lo diga se lo está inventando.'), false);

  // Predicción de verdad con un "no" de la oración ANTERIOR: no se salva.
  assert.equal(ia.daConsejo('No hay duda: el precio subirá con fuerza.'), true);
  assert.equal(ia.daConsejo('Esto no es un consejo. El dólar va a subir.'), true);

  // Un "no" pegado al consejo tampoco lo salva: recomendar no comprar también
  // es recomendar.
  assert.equal(ia.daConsejo('No vale la pena comprar a este nivel.'), true);

  // Y se miran TODAS las coincidencias, no la primera: si la primera viene
  // negada, la segunda —el consejo de verdad— tiene que seguir cayendo.
  assert.equal(ia.daConsejo('Nadie sabe si va a subir. El dólar va a bajar la próxima semana.'), true);
});

test('las frases fijas del sitio no disparan el clasificador de salida', () => {
  const fijas = [ia.FRASE_CONSEJO, ia.FRASE_SIN_VERIFICAR, ia.FRASE_TOPE, ia.FRASE_SIN_CONTADOR, ia.FRASE_SIN_DATOS];
  for (const f of fijas) {
    for (const lang of ['es', 'en']) {
      assert.ok(f[lang].length > 40, 'frase demasiado corta en ' + lang);
      assert.equal(ia.daConsejo(f[lang]), false, 'una frase del propio sitio parece un consejo: ' + f[lang]);
    }
  }
  assert.match(ia.FRASE_CONSEJO.es, /errores al invertir/);
});

// ---------------------------------------------------------------------------
// 2. La guardia de cifras.

const DATOS = [
  'Ficha del activo:',
  '  nombre: Dólar en pesos',
  '  símbolo: USD/MXN',
  'Serie de precios (1M, 22 puntos, cierre de cada barra):',
  '  primer punto  2026-07-23: 18.4032',
  '  último punto  2026-08-21: 19.0100',
  '  cambio del periodo: 0.6068 (3.30 %)',
  '  máximo del periodo 2026-08-19: 19.2500',
  '  mínimo del periodo 2026-07-25: 18.1000'
].join('\n');

test('una respuesta que solo usa cifras del bloque DATOS pasa', () => {
  const buena = 'El dólar arrancó el mes en 18.4032 pesos y terminó en 19.0100, ' +
    'una subida de 3.30 % en el periodo. El punto más alto fue el 19 de agosto de 2026, en 19.2500.';
  assert.deepEqual(ia.numerosFuera(buena, DATOS), []);
});

test('una cifra inventada se caza aunque el resto sea correcto', () => {
  const mala = 'El dólar subió 3.30 % y los analistas esperan que llegue a 20.5000 pesos.';
  assert.deepEqual(ia.numerosFuera(mala, DATOS), ['20.5000']);
});

test('redondear está permitido; inventar el decimal no', () => {
  assert.deepEqual(ia.numerosFuera('Cerró en 19.01 pesos.', DATOS), []);
  assert.deepEqual(ia.numerosFuera('Abrió en 18.40 pesos.', DATOS), []);
  assert.deepEqual(ia.numerosFuera('Subió 3.3 %.', DATOS), []);
  assert.deepEqual(ia.numerosFuera('Abrió en 18.41 pesos.', DATOS), ['18.41']);
});

test('el signo no cuenta: DATOS trae la caída y la respuesta la narra en positivo', () => {
  const datos = '  cambio del periodo: -1.2500 (-2.31 %)';
  assert.deepEqual(ia.numerosFuera('Cayó 2.31 % en el periodo, 1.2500 pesos menos.', datos), []);
});

test('una fecha del bloque se puede escribir con palabras', () => {
  assert.deepEqual(ia.numerosFuera('El 21 de agosto de 2026 tocó su nivel más alto.', DATOS), []);
  assert.deepEqual(ia.numerosFuera('El 30 de agosto de 2026 tocó su nivel más alto.', DATOS), ['30']);
});

test('los separadores de millar no confunden a la guardia', () => {
  const datos = '  último punto 2026-08-21: 6412.35';
  assert.deepEqual(ia.numerosFuera('Cerró en 6,412.35 puntos.', datos), []);
  assert.deepEqual(ia.numerosFuera('Cerró en 6,512.35 puntos.', datos), ['6,512.35']);
});

test('un número chico pasa como prosa, pero no si lleva unidad pegada', () => {
  assert.deepEqual(ia.numerosFuera('Hay 3 cosas que entender aquí.', DATOS), []);
  assert.deepEqual(ia.numerosFuera('Se lee en 2 minutos.', DATOS), []);
  assert.deepEqual(ia.numerosFuera('El peso subió 5 % este mes.', DATOS), ['5']);
  assert.deepEqual(ia.numerosFuera('Costaría 7 pesos más.', DATOS), ['7']);
});

test('la unidad también cuenta DELANTE del número: "$9" no es prosa', () => {
  // Es como se escribe el dinero casi siempre, y como lo escribe el glosario
  // en 32 de sus 61 entradas. Mirando solo lo que va detrás, un entero chico
  // con el símbolo delante se colaba entero.
  assert.deepEqual(ia.numerosFuera('Un café que cuesta $9 se te vuelve más caro.', DATOS), ['9']);
  assert.deepEqual(ia.numerosFuera('Cuesta MXN 9 en la esquina.', DATOS), ['9']);
  assert.deepEqual(ia.numerosFuera('It costs USD 8 today.', DATOS), ['8']);
  assert.deepEqual(ia.numerosFuera('Vale €7 allá.', DATOS), ['7']);
  // Y lo que el bloque SÍ respalda sigue pasando, escrito con símbolo delante.
  assert.deepEqual(ia.numerosFuera('Pasó de $18.4032 a $19.0100.', DATOS), []);
  const conPesos = 'ejemplo en pesos: una comisión de $20 sobre una compra de $1,000';
  assert.deepEqual(ia.numerosFuera('Sobre $1,000 te cobran $20.', conPesos), []);
  assert.deepEqual(ia.numerosFuera('Sobre $1,000 te cobran $30.', conPesos), ['30']);
  // Un número chico SIN moneda delante sigue siendo prosa.
  assert.deepEqual(ia.numerosFuera('Hay 3 cosas que entender aquí.', DATOS), []);
});

test('y DETRÁS pegado al número: "9$" tampoco es prosa', () => {
  // La tercera posición en la que se escribe el dinero. Tapado el símbolo
  // delante, este era el mismo agujero corrido un carácter: un entero chico
  // inventado con el símbolo detrás seguía pasando por prosa.
  assert.deepEqual(ia.numerosFuera('Un café que cuesta 9$ se te vuelve más caro.', DATOS), ['9']);
  assert.deepEqual(ia.numerosFuera('Vale 7 € allá.', DATOS), ['7']);
  assert.deepEqual(ia.numerosFuera('Cuesta 6£ en Londres.', DATOS), ['6']);
  // Y lo respaldado sigue pasando escrito así.
  const conPesos = 'ejemplo en pesos: una comisión de $20 sobre una compra de $1,000';
  assert.deepEqual(ia.numerosFuera('Te cobran 20$ de comisión.', conPesos), []);
  assert.deepEqual(ia.numerosFuera('Te cobran 30$ de comisión.', conPesos), ['30']);
  // Sin símbolo, un entero chico sigue siendo prosa.
  assert.deepEqual(ia.numerosFuera('Se lee en 2 minutos.', DATOS), []);
});

// ---------------------------------------------------------------------------
// 3. El resumen de una serie: las cuentas las hace el servidor.

test('resumirSerie calcula el cambio, el máximo y el mínimo, y no los deja al modelo', () => {
  const serie = {
    range: '1M',
    tzOffset: 0,
    points: [
      [Date.parse('2026-07-23T00:00:00Z') / 1000, 18.4032],
      [Date.parse('2026-08-05T00:00:00Z') / 1000, 18.1],
      [Date.parse('2026-08-19T00:00:00Z') / 1000, 19.25],
      [Date.parse('2026-08-21T00:00:00Z') / 1000, 19.01]
    ]
  };
  const r = ia.resumirSerie(serie, 4);
  assert.match(r.texto, /primer punto {2}2026-07-23: 18\.4032/);
  assert.match(r.texto, /último punto {2}2026-08-21: 19\.0100/);
  assert.match(r.texto, /cambio del periodo: 0\.6068 \(3\.30 %\)/);
  assert.match(r.texto, /máximo del periodo 2026-08-19: 19\.2500/);
  assert.match(r.texto, /mínimo del periodo 2026-08-05: 18\.1000/);
  assert.equal(r.asOf, '2026-08-21');
  // Y lo que calculó es exactamente lo que la guardia deja pasar después.
  assert.deepEqual(ia.numerosFuera('Subió 3.30 % hasta 19.0100.', r.texto), []);
});

test('una serie de un solo punto no se explica: se dice que no hay datos', () => {
  assert.throws(() => ia.resumirSerie({ range: '1M', points: [[0, 1]] }, 2), /dos puntos/);
});

// ---------------------------------------------------------------------------
// 4. La puerta: query mal formada.

test('la query se valida antes de gastar nada', () => {
  assert.equal(ia.leerPedido({ tipo: 'otra', id: 'x' }).error, 'tipo_desconocido');
  assert.equal(ia.leerPedido({ tipo: 'activo' }).error, 'falta_id');
  assert.equal(ia.leerPedido({ tipo: 'activo', id: 'spy', modo: 'chatear' }).error, 'modo_desconocido');
  const p = ia.leerPedido({ tipo: 'activo', id: 'usdmxn', lang: 'fr', rango: '7Y', pregunta: 'x'.repeat(500) });
  assert.equal(p.lang, 'es', 'un idioma que no existe cae al español, no revienta');
  assert.equal(p.rango, '1M', 'un rango que no existe cae al de siempre');
  assert.equal(p.pregunta.length, ia.MAX_PREGUNTA, 'la pregunta se recorta antes de pagarla');
});

// ---------------------------------------------------------------------------
// 5. El flujo completo, con Anthropic y Redis de mentira.

/** Caché en memoria con la misma forma que api/_lib/cache.js. */
function cacheFalsa(opciones = {}) {
  const datos = new Map();
  const cuotas = new Map();
  return {
    datos, cuotas,
    async leer(clave) {
      return datos.has(clave) ? { valor: datos.get(clave), stale: false, edadMs: 0 } : null;
    },
    async escribir(clave, valor) { datos.set(clave, valor); return valor; },
    async contarCuota(proveedor) {
      if (opciones.redisCaido) return null;
      const n = (cuotas.get(proveedor) || 0) + 1;
      cuotas.set(proveedor, n);
      return n;
    }
  };
}

/** Cliente de Anthropic de mentira: devuelve lo que le digas, en orden. */
function clienteFalso(respuestas) {
  const llamadas = [];
  return {
    llamadas,
    messages: {
      async create(params) {
        llamadas.push(params);
        const r = respuestas[Math.min(llamadas.length - 1, respuestas.length - 1)];
        return { content: [{ type: 'text', text: JSON.stringify(r) }] };
      }
    }
  };
}

const REQ = { headers: { 'x-forwarded-for': '203.0.113.7' } };

const SERIE_FALSA = {
  serie: async () => ({
    valor: {
      range: '1M', tzOffset: 0,
      points: [
        [Date.parse('2026-07-23T00:00:00Z') / 1000, 18.4032],
        [Date.parse('2026-08-21T00:00:00Z') / 1000, 19.01]
      ]
    },
    stale: false
  })
};

function deps(extra = {}) {
  return Object.assign({
    cache: cacheFalsa(),
    historia: SERIE_FALSA,
    noticias: { listar: async () => [] }
  }, extra);
}

const QUERY_ACTIVO = { tipo: 'activo', id: 'usdmxn', lang: 'es', rango: '1M' };

test('una respuesta limpia sale con su etiqueta, sus fuentes y su asOf del servidor', async () => {
  const cliente = clienteFalso([{
    respuesta: 'El USD/MXN dice cuántos pesos cuesta un dólar. En este mes pasó de 18.4032 a 19.0100, ' +
      'una subida de 3.30 %.',
    preguntas: [],
    datosUsados: ['primer punto 2026-07-23: 18.4032', 'último punto 2026-08-21: 19.0100'],
    fuentes: ['Yahoo Finance'],
    asOf: 'la fecha que al modelo le dé la gana'
  }]);
  const d = deps({ crearCliente: () => cliente });
  const r = await ia.explicar(QUERY_ACTIVO, REQ, d);

  assert.equal(r.codigo, 200);
  assert.equal(r.cuerpo.rechazada, undefined);
  assert.equal(r.cuerpo.generadoPor, 'ia');
  assert.equal(r.cuerpo.modelo, ia.MODELO);
  assert.equal(r.cuerpo.asOf, '2026-08-21', 'el asOf lo pone el servidor, no el modelo');
  assert.ok(r.cuerpo.metodologia, 'la respuesta siempre trae el enlace a la metodología');
  assert.equal(cliente.llamadas.length, 1);
  // El bloque DATOS viajó entero en el mensaje, y el sistema prohíbe inventar.
  assert.match(cliente.llamadas[0].messages[0].content, /=== DATA \(everything you know\) ===/);
  assert.match(cliente.llamadas[0].system, /must already be/);
});

test('la segunda visita con el mismo contexto no vuelve a pagarle a Anthropic', async () => {
  const cliente = clienteFalso([{
    respuesta: 'Pasó de 18.4032 a 19.0100.', preguntas: [],
    datosUsados: ['x'], fuentes: ['Yahoo Finance'], asOf: '2026-08-21'
  }]);
  const d = deps({ crearCliente: () => cliente });
  await ia.explicar(QUERY_ACTIVO, REQ, d);
  const segunda = await ia.explicar(QUERY_ACTIVO, REQ, d);
  assert.equal(segunda.cuerpo.cacheado, true);
  assert.equal(cliente.llamadas.length, 1, 'la respuesta cacheada no debe costar una llamada más');
});

test('una cifra inventada se reintenta una vez, diciéndole cuál sobra', async () => {
  const cliente = clienteFalso([
    { respuesta: 'Subió 3.30 % y va camino de 25.0000 pesos.', preguntas: [], datosUsados: ['x'], fuentes: [], asOf: 'x' },
    { respuesta: 'Subió 3.30 %, de 18.4032 a 19.0100.', preguntas: [], datosUsados: ['x'], fuentes: ['Yahoo Finance'], asOf: 'x' }
  ]);
  const r = await ia.explicar(QUERY_ACTIVO, REQ, deps({ crearCliente: () => cliente }));

  assert.equal(cliente.llamadas.length, 2, 'tiene que reintentar exactamente una vez');
  assert.match(cliente.llamadas[1].messages[0].content, /25\.0000/, 'el reintento le dice qué cifra sobraba');
  assert.equal(r.codigo, 200);
  assert.equal(r.cuerpo.reintentado, true);
  assert.match(r.cuerpo.respuesta, /18\.4032/);
});

test('el reintento también se paga: la cuota cuenta LLAMADAS, no consultas', async () => {
  // El reintento cuesta lo mismo que la primera llamada. Contando una sola por
  // consulta, el techo real era el DOBLE del escrito en el encabezado.
  const cache = cacheFalsa();
  const cliente = clienteFalso([
    { respuesta: 'El mes cerró en 25.0000 pesos.', preguntas: [], datosUsados: [], fuentes: [], asOf: 'x' },
    { respuesta: 'Perdón: cerró en 24.0000 pesos.', preguntas: [], datosUsados: [], fuentes: [], asOf: 'x' }
  ]);
  await ia.explicar(QUERY_ACTIVO, REQ, deps({ cache, crearCliente: () => cliente }));

  assert.equal(cliente.llamadas.length, 2);
  assert.equal(cache.cuotas.get('ia'), 2, 'dos llamadas al modelo, dos unidades de cuota');
  assert.equal([...cache.cuotas.keys()].filter((k) => k.startsWith('ia:ip:')).length, 1);
  assert.equal([...cache.cuotas.values()].filter((v) => v === 2).length, 2, 'la de la IP también');
});

test('si el tope se agota justo antes del reintento, sale el mensaje honesto y no un 429', async () => {
  const cache = cacheFalsa();
  let n = 0;
  cache.contarCuota = async () => { n += 1; return n <= 2 ? 1 : ia.MAX_DIA + 1; };
  const cliente = clienteFalso([
    { respuesta: 'El mes cerró en 25.0000 pesos.', preguntas: [], datosUsados: [], fuentes: [], asOf: 'x' }
  ]);
  const r = await ia.explicar(QUERY_ACTIVO, REQ, deps({ cache, crearCliente: () => cliente }));

  assert.equal(cliente.llamadas.length, 1, 'el reintento que no se puede pagar no se hace');
  assert.equal(r.codigo, 200);
  assert.equal(r.cuerpo.rechazada, 'cifras_inventadas');
  assert.doesNotMatch(r.cuerpo.respuesta, /25\.0000/);
});

test('si vuelve a inventar, la persona ve un mensaje honesto y NO la respuesta', async () => {
  const cliente = clienteFalso([
    { respuesta: 'El mes cerró en 25.0000 pesos.', preguntas: [], datosUsados: [], fuentes: [], asOf: 'x' },
    { respuesta: 'Perdón: cerró en 24.0000 pesos.', preguntas: [], datosUsados: [], fuentes: [], asOf: 'x' }
  ]);
  const r = await ia.explicar(QUERY_ACTIVO, REQ, deps({ crearCliente: () => cliente }));

  assert.equal(cliente.llamadas.length, 2, 'se reintenta UNA vez, no en bucle');
  assert.equal(r.cuerpo.rechazada, 'cifras_inventadas');
  assert.equal(r.cuerpo.respuesta, ia.FRASE_SIN_VERIFICAR.es);
  assert.doesNotMatch(r.cuerpo.respuesta, /25\.0000|24\.0000/, 'la cifra inventada no puede salir a pantalla');
});

test('si el modelo se pone a recomendar, la respuesta no sale y no se reintenta', async () => {
  const cliente = clienteFalso([
    { respuesta: 'Con esta subida, deberías comprar dólares antes de que suba más.', preguntas: [], datosUsados: [], fuentes: [], asOf: 'x' }
  ]);
  const r = await ia.explicar(QUERY_ACTIVO, REQ, deps({ crearCliente: () => cliente }));
  assert.equal(cliente.llamadas.length, 1, 'reintentar un consejo es pagar dos veces por el mismo fallo');
  assert.equal(r.cuerpo.rechazada, 'consejo');
  // La frase tiene que decir lo que PASÓ. Aquí no falló ninguna comprobación de
  // cifras: el modelo dio un consejo, y esa es la frase que lo dice.
  assert.equal(r.cuerpo.respuesta, ia.FRASE_CONSEJO.es);
  assert.notEqual(r.cuerpo.respuesta, ia.FRASE_SIN_VERIFICAR.es);
  assert.match(r.cuerpo.leccion, /errores/, 'y enlaza a la lección de errores al invertir');
  // Cuando el fallo SÍ es de cifras, la frase sigue siendo la otra.
  const cifras = clienteFalso([
    { respuesta: 'Cerró en 25.0000 pesos.', preguntas: [], datosUsados: [], fuentes: [], asOf: 'x' }
  ]);
  const r2 = await ia.explicar(QUERY_ACTIVO, REQ, deps({ crearCliente: () => cifras }));
  assert.equal(r2.cuerpo.rechazada, 'cifras_inventadas');
  assert.equal(r2.cuerpo.respuesta, ia.FRASE_SIN_VERIFICAR.es);
});

test('"¿compro?" ni siquiera llega al modelo', async () => {
  const cliente = clienteFalso([{ respuesta: 'no debería verse', preguntas: [], datosUsados: [], fuentes: [], asOf: 'x' }]);
  const d = deps({ crearCliente: () => cliente });
  const r = await ia.explicar(Object.assign({ pregunta: '¿compro dólares hoy?' }, QUERY_ACTIVO), REQ, d);

  assert.equal(cliente.llamadas.length, 0, 'el clasificador va ANTES de gastar un token');
  assert.equal(r.cuerpo.rechazada, 'consejo');
  assert.equal(r.cuerpo.respuesta, ia.FRASE_CONSEJO.es);
  assert.match(r.cuerpo.leccion, /errores/, 'la frase fija enlaza a la lección de riesgo');
  assert.equal(d.cache.cuotas.size, 0, 'una pregunta rechazada tampoco gasta cuota');
});

test('al llegar al tope del día se apaga solo y lo dice sin disimulo', async () => {
  const cache = cacheFalsa();
  cache.contarCuota = async (proveedor) => (proveedor === 'ia' ? ia.MAX_DIA + 1 : 1);
  const cliente = clienteFalso([{ respuesta: 'no debería verse', preguntas: [], datosUsados: [], fuentes: [], asOf: 'x' }]);
  const r = await ia.explicar(QUERY_ACTIVO, REQ, deps({ cache, crearCliente: () => cliente }));

  assert.equal(r.codigo, 429);
  assert.equal(r.cuerpo.rechazada, 'tope_dia');
  assert.equal(cliente.llamadas.length, 0);
  assert.equal(r.cuerpo.respuesta, ia.FRASE_TOPE.es);
});

test('el tope por IP para a quien insiste, y el secreto se lo salta', async () => {
  const cache = cacheFalsa();
  cache.contarCuota = async (proveedor) => (proveedor.startsWith('ia:ip:') ? ia.MAX_IP + 1 : 1);
  const cliente = clienteFalso([{
    respuesta: 'De 18.4032 a 19.0100.', preguntas: [], datosUsados: ['x'], fuentes: ['Yahoo Finance'], asOf: 'x'
  }]);

  const parado = await ia.explicar(QUERY_ACTIVO, REQ, deps({ cache, crearCliente: () => cliente }));
  assert.equal(parado.cuerpo.rechazada, 'tope_ip');
  assert.equal(cliente.llamadas.length, 0);

  const conSecreto = await ia.explicar(
    Object.assign({}, QUERY_ACTIVO, { id: 'eurmxn' }), REQ,
    deps({ cache, crearCliente: () => cliente, saltarTopeIp: true })
  );
  assert.equal(conSecreto.codigo, 200);
  assert.equal(cliente.llamadas.length, 1);
});

test('sin contador (Redis caído) no se genera: no saber lo que gastas no es permiso para gastar', async () => {
  const cliente = clienteFalso([{ respuesta: 'no debería verse', preguntas: [], datosUsados: [], fuentes: [], asOf: 'x' }]);
  const r = await ia.explicar(QUERY_ACTIVO, REQ, deps({ cache: cacheFalsa({ redisCaido: true }), crearCliente: () => cliente }));
  assert.equal(r.cuerpo.rechazada, 'sin_contador');
  assert.equal(cliente.llamadas.length, 0);
  assert.equal(r.cuerpo.respuesta, ia.FRASE_SIN_CONTADOR.es);
});

test('una noticia que no está aprobada no se explica', async () => {
  const cliente = clienteFalso([{ respuesta: 'no debería verse', preguntas: [], datosUsados: [], fuentes: [], asOf: 'x' }]);
  const r = await ia.explicar(
    { tipo: 'noticia', id: 'una-que-no-existe', lang: 'es' }, REQ,
    deps({ crearCliente: () => cliente, noticias: { listar: async () => [] } })
  );
  assert.equal(r.codigo, 404);
  assert.equal(r.cuerpo.rechazada, 'sin_datos');
  assert.equal(cliente.llamadas.length, 0);
});

test('el bloque DATOS de una noticia sale del texto aprobado, no del feed', async () => {
  const noticia = {
    id: '2026-08-21-algo', slug: 'algo', estado: 'aprobada', leccion: 'lesson.peso',
    fuente: { nombre: 'Bloomberg', titular: 'Something happened', url: 'https://x.test/a', publicado: '2026-08-21T11:00:00.000Z' },
    es: { titulo: 'Algo pasó', que: 'Pasó esto.', porque: 'Importa por esto.', impacto: 'Todavía no se sabe.' },
    en: { titulo: 'Something', que: 'This.', porque: 'Because.', impacto: 'Too early.' }
  };
  const bloque = await ia.armarDatos(
    { tipo: 'noticia', id: 'algo', lang: 'es' },
    { noticias: { listar: async () => [noticia] } }
  );
  assert.match(bloque.datos, /qué pasó: Pasó esto\./);
  assert.match(bloque.datos, /REVISADA por una persona/);
  assert.equal(bloque.asOf, '2026-08-21');
  assert.equal(bloque.fuentes[0].url, 'https://x.test/a');
  assert.match(bloque.leccion, /peso/);
});

test('el bloque DATOS de una lección lleva su texto y sus fuentes', async () => {
  const bloque = await ia.armarDatos({ tipo: 'leccion', id: 'peso-tipo-de-cambio', lang: 'es' }, {});
  assert.match(bloque.datos, /texto completo de la lección/);
  assert.ok(bloque.datos.length > 2000);
  assert.ok(bloque.fuentes.length >= 2);
  assert.ok(bloque.fuentes.every((f) => /^https?:\/\//.test(f.url)));
});

test('el bloque DATOS de un término es el glosario, con su ejemplo en pesos', async () => {
  const bloque = await ia.armarDatos({ tipo: 'termino', id: 'tipo-de-cambio', lang: 'es' }, {});
  assert.match(bloque.datos, /en pesos:/);
  assert.equal(bloque.titulo, 'Tipo de cambio');
});

test('modo preguntas: tres preguntas o no sale', async () => {
  const cliente = clienteFalso([{
    respuesta: 'Tres preguntas para repasar esto:',
    preguntas: ['¿Qué mide el USD/MXN?', '¿Qué pasó entre 18.4032 y 19.0100?', '¿Por qué sube el número cuando el peso se debilita?'],
    datosUsados: ['x'], fuentes: ['Yahoo Finance'], asOf: 'x'
  }]);
  const r = await ia.explicar(Object.assign({}, QUERY_ACTIVO, { modo: 'preguntas' }), REQ, deps({ crearCliente: () => cliente }));
  assert.equal(r.cuerpo.preguntas.length, 3);

  const corto = clienteFalso([{ respuesta: 'Solo una:', preguntas: ['¿Y?'], datosUsados: [], fuentes: [], asOf: 'x' }]);
  const malo = await ia.explicar(Object.assign({}, QUERY_ACTIVO, { modo: 'preguntas', id: 'eurusd' }), REQ, deps({ crearCliente: () => corto }));
  assert.equal(malo.cuerpo.rechazada, 'faltan_preguntas');
});

// ---------------------------------------------------------------------------
// 6. El router de api/news.js, con req/res de mentira.

function resFalso() {
  const r = { codigo: null, cuerpo: null, cabeceras: {} };
  r.setHeader = (k, v) => { r.cabeceras[k.toLowerCase()] = v; };
  r.status = (c) => { r.codigo = c; return r; };
  r.json = (c) => { r.cuerpo = c; return r; };
  r.send = (c) => { r.cuerpo = c; return r; };
  return r;
}

test('GET /api/news?accion=explicar con una query mal formada da 400 y no cachea', async () => {
  const handler = require('../news.js');
  const res = resFalso();
  await handler({ method: 'GET', query: { accion: 'explicar', tipo: 'inventado', id: 'x' }, headers: {} }, res);
  assert.equal(res.codigo, 400);
  assert.equal(res.cuerpo.error, 'tipo_desconocido');
  assert.equal(res.cabeceras['cache-control'], 'no-store');
});

test('la pregunta escrita a mano viaja por POST y no se cachea en el CDN', async () => {
  const handler = require('../news.js');
  const res = resFalso();
  // Sin ANTHROPIC_API_KEY ni Redis esto no puede generar nada; lo que se
  // comprueba es el ENRUTADO: que POST {accion:'explicar'} no choque con la
  // puerta del secreto (como sí hacen generar y decidir) y que la respuesta
  // nunca se guarde en un caché compartido.
  await handler({
    method: 'POST', headers: {},
    body: { accion: 'explicar', tipo: 'inventado', id: 'x', pregunta: 'algo personal' }
  }, res);
  assert.equal(res.codigo, 400, 'llegó a la validación del pedido, no al 401 del secreto');
  assert.equal(res.cuerpo.error, 'tipo_desconocido');
  assert.equal(res.cabeceras['cache-control'], 'no-store');
});

test('un POST de las acciones privadas sigue necesitando el secreto', async () => {
  const handler = require('../news.js');
  for (const accion of ['generar', 'decidir']) {
    const res = resFalso();
    await handler({ method: 'POST', headers: {}, body: { accion } }, res);
    assert.equal(res.codigo, 401, accion + ' se coló sin secreto');
  }
});

test('explicar es la ÚNICA acción pública: revisar sigue pidiendo el secreto', async () => {
  const handler = require('../news.js');
  const res = resFalso();
  await handler({ method: 'GET', query: { accion: 'revision' }, headers: {} }, res);
  assert.equal(res.codigo, 401);
});
