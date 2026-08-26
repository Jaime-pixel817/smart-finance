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

---

## Comprobación con datos REALES (2026-08-25, tarde)

### Antes — producción, que hoy sigue con el código viejo

`POST /api/news {"accion":"explicar","tipo":"activo","id":"spy","lang":"es","pregunta":"¿por qué subió hoy?"}`
→ `antes-produccion-2026-08-25.json`:

> «SPY es un ETF, un fondo que agrupa las 500 empresas más grandes de Estados
> Unidos en un solo precio. […] **En el mes que termina el 25 de agosto**, SPY
> subió de 739.09 a 765.91, una ganancia de 26.82…»

Preguntas por hoy y te contesta el mes. Es el bug.

### Después — el motor de esta rama, con la MISMA llamada a Yahoo que hace el sitio

`node docs/2026-08-25-ia-responde/datos-real.mjs` → `despues-bloque-datos-real.txt`.
No hace falta el modelo: lo que se enseña es el bloque DATOS, que es justo lo
que no cambiaba.

| pregunta | intención | serie que se arma |
|---|---|---|
| (ninguna, el botón a secas) | — | 1M, 22 puntos — el resumen del mes de siempre |
| «¿por qué subió hoy?» | `causa` | **1D, 79 puntos** + *Movimiento de HOY* (cierre anterior 763.48 → 765.91, **cambio de hoy 2.43, 0.32 %**) + «Noticias aprobadas de este activo: **NINGUNA** […] La causa del movimiento NO SE SABE con estos datos» |
| «¿cómo va este año?» | `movimiento` | **1Y, 251 puntos** (645.16 → 765.91, +18.72 %) |

El movimiento de hoy (+2.43) y el del mes (+26.82) son cifras distintas: antes
la única disponible era la del mes, así que la respuesta a «¿por qué subió hoy?»
no podía ni citar el dato correcto.

### Lo que falta comprobar contra un despliegue

La llamada real al MODELO con el código nuevo no se pudo hacer desde aquí: este
entorno no tiene `ANTHROPIC_API_KEY` y el preview de Vercel de la rama está
detrás de la protección de despliegue (302). En cuanto esto se mergee y
despliegue, la comprobación es una línea:

```sh
curl -s -X POST https://smartfinance.lat/api/news \
  -H 'Content-Type: application/json' \
  -d '{"accion":"explicar","tipo":"activo","id":"spy","lang":"es","pregunta":"¿por qué subió hoy?"}' \
  | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).respuesta))"
```

Tiene que abrir diciendo que con estos datos no se puede saber el porqué (o
citando una noticia aprobada del símbolo), no con «SPY es un ETF».
