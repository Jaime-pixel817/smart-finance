# La IA ignora la pregunta escrita (reproducido en producción, 2026-08-25)

Jaime: *"le pregunto cosas y no responde y solo me pone lo mismo"*.

## Reproducción

Las dos llamadas, contra https://smartfinance.lat el 2026-08-25:

1. `GET /api/news?accion=explicar&tipo=activo&id=spy&loc=es` → `antes-get-sin-pregunta.json`
2. `POST /api/news` con `{"accion":"explicar","tipo":"activo","id":"spy","loc":"es","pregunta":"por que subio hoy?"}` → `antes-post-con-pregunta.json`

Las dos respuestas son prácticamente iguales: qué es el SPY y su resumen del
mes (739.09 → 765.77, +3.61 %). La pregunta "¿por qué subió hoy?" solo aparece
como nota al pie de la segunda ("No tengo datos sobre por qué subió hoy
específicamente"), después de dos párrafos que nadie pidió.

## Por qué pasa (raíz, en `api/_lib/ia.js` tal y como está en `main`)

1. **La instrucción al modelo no cambia con la pregunta.** `mensajeUsuario()`
   manda siempre el mismo `TASK:` ("Explain what this asset is, what moves its
   price, and what it did over the range…") y la pregunta se añade al final
   como un apéndice ("The reader also asked…"). Haiku obedece el TASK — que
   pide la explicación genérica — y trata la pregunta como posdata.
2. **El bloque DATOS no depende de la pregunta.** Se arma siempre igual: ficha
   del activo + resumen del rango (1M por defecto). Para "¿por qué subió hoy?"
   harían falta el movimiento de HOY y las noticias aprobadas del símbolo;
   para "¿cómo va el año?" la serie de 1Y. Nada de eso se pide.
3. **No hay conversación**: cada pregunta empieza de cero, sin el contexto de
   la respuesta anterior.

## El arreglo (este PR)

- Con `pregunta`, el encargo pasa a "responde ESTO con los datos de abajo",
  con la intención clasificada (qué es · por qué se movió · cuándo/cuánto ·
  comparar · término · consejo → rechazo) y un bloque DATOS armado para ESA
  pregunta.
- Si piden una causa y no hay noticia aprobada que la respalde, la respuesta
  dice claramente que no se puede saber — como PRIMERA frase, no como pie.
- 2–3 repreguntas encadenadas (historial solo en el navegador), preguntas
  sugeridas por contexto, y todas las guardas existentes intactas.
