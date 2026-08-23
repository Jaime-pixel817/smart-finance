# Un reto interactivo para /challenge · /es/reto — tres ideas y la que gana

Fecha: 2026-08-23 · Rama `feat/reto`

Jaime pidió *"una tool nueva que sea algo interactivo y dinámico para jóvenes como reto,
quiz o algo así padre y que nos diferencie"*.

Lo que ya existe y de lo que hay que separarse:

- `/tools` — tres calculadoras de sliders (interés compuesto, inflación, CETES).
- Quiz de 3 preguntas al final de cada lección (opción múltiple sobre el texto).
- Glosario al tacto.
- `/market` — datos reales con gráficas.

Lo único que tenemos y nadie más en este nicho en español tiene gratis: **series de
precio reales de 21 activos, 5 años de historia, servidas por `/api/history`
(Yahoo Finance, caché de 60 s)**. El reto tiene que colgarse de ahí, o no nos
diferencia de cualquier quiz de Google Forms.

## Criterios (los de Jaime, en orden)

1. Divertido para alguien de 16–20.
2. Se juega en **2 minutos en el teléfono**.
3. Enseña algo real.
4. Se puede compartir.
5. **No fomenta apostar ni prometer rendimientos.**
6. Sin cuenta y sin backend nuevo (recordatorio duro: `api/*.js` ya son 12 de 12
   funciones en el plan de Vercel; no se puede añadir ni una).

---

## Idea A — "¿Y luego qué pasó?" (reto diario del gráfico ciego)

Cinco rondas. En cada una se ve la forma de **40 semanas reales** de un activo real,
**sin nombre y sin precios** (normalizada a base 100, así BTC y el dólar se ven
iguales). Las siguientes 8 semanas están tapadas. Cuatro botones: cayó fuerte /
bajó / subió / subió fuerte, donde "fuerte" es el **movimiento típico de ese
activo** (mediana del valor absoluto de sus movimientos de 8 semanas en 5 años),
no un número inventado. Se responde de un toque, se revela la curva escondida
dibujándose, el porcentaje real, las fechas y qué activo era.

El reto es **el mismo para todo el mundo cada día** (semilla = la fecha), como
Wordle, y al final sale una cuadrícula de emojis para compartir.

- **A favor**
  - Usa el dato real y vivo: cada día es un reto distinto sin que nadie lo escriba.
  - Un toque por ronda: cinco rondas caben en 100 segundos en el teléfono.
  - El remate **es la lección**: la puntuación se compara con la de tirar un dado
    (3.75 de 10). Casi todo el mundo saca cerca de eso. La conclusión que se lleva
    el jugador es "no se puede adivinar el corto plazo", que es exactamente lo que
    dicen las lecciones de errores al invertir y del S&P 500.
  - Compartible de verdad: cuadrícula de emojis + puntuación en la URL + racha diaria.
  - Cero backend: `/api/history` ya existe y ya está en caché compartida.
- **En contra**
  - Es un juego de acertar la dirección del mercado: si se enmarca mal, parece
    apostar. Se resuelve con el marco (ver abajo), pero hay que ser explícito.
  - Depende de la red: sin `/api/history` no hay partida (mensaje claro y reintento).
  - Cinco peticiones al arrancar (una por activo). Van en paralelo, en caché de 60 s
    y son las MISMAS cinco para todos los que jueguen hoy, así que la CDN las sirve
    casi siempre sin tocar la función.

**Sobre "no fomenta apostar":** este juego es lo contrario de una casa de apuestas
porque no se gana nada, no hay dinero ni cartera simulada, y el resultado que el
juego celebra no es acertar sino **descubrir que nadie acierta**. La pantalla final
dice, con el número del jugador al lado del de un dado, que cinco de cinco es suerte
y no habilidad. Es el argumento anti-especulación más fuerte que se puede montar:
que lo descubra jugando, no que se lo digan.

## Idea B — "Tu primer millón" (10 años de decisiones mensuales)

Cada mes simulado eliges: ahorrar, meter a un índice, o gastar. Se aplican
rendimientos históricos reales y al final se compara tu resultado contra el promedio.

- **A favor**: enseña interés compuesto y coste de oportunidad de golpe; muy visual.
- **En contra**:
  - 120 decisiones no caben en 2 minutos ni con atajos; o se recorta tanto que
    deja de ser un juego.
  - **Se pisa con `/tools/interes-compuesto`**, que ya cuenta esa historia con
    sliders y una gráfica.
  - Es justo donde más fácil se resbala uno a **prometer rendimientos**: el final
    natural es "hubieras tenido $X", que es lo que CLAUDE.md prohíbe insinuar.
  - No usa datos vivos: los rendimientos irían escritos en el repo.

## Idea C — "El reto de la inflación" (sobrevive 12 meses con el INPC real)

Sueldo de estudiante, precios reales de México, doce meses de inflación real.

- **A favor**: cercanísimo a un chavo mexicano; el dato del INPC es público y real.
- **En contra**:
  - **Ya existe `/tools/inflacion`** y la lección de inflación: sería la tercera vez
    que contamos lo mismo.
  - El INPC no lo sirve ninguno de nuestros 12 endpoints; habría que escribir la
    tabla en el repo y mantenerla a mano cada mes (una fuente más que se pudre en
    silencio, justo lo que nos pasó con el horario de la BMV).
  - Los precios de "un litro de leche en 2019" son difíciles de citar con fuente
    verificable uno por uno.

---

## Gana la A

Porque es la única de las tres que (1) **no repite** nada de lo que ya hay,
(2) **se alimenta sola** de un endpoint que ya existe y ya está pagado, así que hay
un reto nuevo cada día sin que nadie escriba nada, (3) cabe en dos minutos con un
toque por ronda, (4) se comparte con una cuadrícula de emojis que ya sabemos que
funciona, y (5) su lección — *el corto plazo no se adivina* — es la más útil y la
más honesta que le podemos dar a alguien de 16 años que está a punto de abrir su
primera cuenta de inversión.

La B y la C se guardan: la B tiene sentido cuando exista el portafolio personal
(pilar 1 del roadmap) y la C, el día que haya una fuente de INPC automatizable.

## Cómo se construye (resumen técnico)

| Pieza | Dónde |
|---|---|
| Cálculo puro y con pruebas | `src/lib/challenge/reto.mjs` + `reto.test.mjs` (`node --test`) |
| Marcado y estilos | `src/components/challenge/Challenge.astro` + `src/styles/challenge.css` |
| Navegador (fetch, pintado, estado) | `src/scripts/challenge.ts` |
| Páginas | `src/pages/challenge.astro`, `src/pages/es/reto.astro` |
| Datos | `GET /api/history?pair=<X>&range=5Y` (Yahoo Finance, semanal, caché 60 s) |
| Estado del jugador | `localStorage` (`sf:reto:v1`): racha y mejor puntuación. Nada sale del teléfono |
| Compartir | `?s=<puntos>&d=<fecha>` en la URL + texto con cuadrícula de emojis al portapapeles |

Reglas del sitio que aplican aquí: chip de fuente y frescura en la gráfica (nunca
"en vivo"), disclaimer educativo, SVG propio (nada de librerías nuevas),
`prefers-reduced-motion` respetado, `aria-live` en el resultado y foco visible.

---

## Cómo quedó (capturas de `capturas/`, 390×844 a 2×)

| Archivo | Qué es |
|---|---|
| `movil-1-pregunta.png` | La ronda antes de contestar: gráfica ciega, zona tapada con su `?` y las cuatro respuestas con el umbral del propio activo. |
| `movil-2-revelado.png` | Después de contestar: el lienzo se abre, la parte tapada entra en verde o rojo, y salen el veredicto, el movimiento real, las fechas y el activo (enlazado a su ficha). |
| `movil-3-resultado.png` | El resultado, la cuadrícula de emojis, tu puntuación al lado de la del azar y la lección. |
| `movil-tema-claro-en.png` | Lo mismo en inglés, tema claro y `prefers-reduced-motion`. |
| `escritorio-1280.png` | Escritorio, con "Reto" ya en la barra superior. |
| `herramientas-tarjeta.png` | Cómo entra el reto en `/es/herramientas`. |

## Comprobado con datos reales, no de oído

Con 600 rondas generadas de 120 días distintos sobre las series de verdad
(`/api/history`, 5 años semanales de los doce activos):

- **El umbral de cada activo sale donde tiene que salir**: EUR/MXN 2 %,
  USD/MXN 2.5 %, Dow 3.5 %, S&P 500 4 %, Nasdaq 100 6 %, Microsoft 7 %,
  Apple 8 %, Amazon 9 %, Nvidia 14 %, Bitcoin 15 %, Ethereum 20 %, Solana 25 %.
  Sin esto, las mismas cuatro respuestas no se podrían usar para el dólar y
  para Solana.
- **El reparto de las cuatro bandas** en esas 600 rondas: subió fuerte 191,
  subió 171, bajó 150, cayó fuerte 88. Es decir: **el mercado subió más veces
  de las que bajó**, y contestar siempre "subió" saca ~4.6 de 10, por encima
  del 3.75 del azar. Eso NO se esconde: se dice en la pantalla final, porque
  es exactamente la lección que sostiene invertir a largo plazo.
- **El zoom del revelado nunca deja la curva fuera del lienzo**: en el peor de
  los 600 casos la línea queda entre y=21.7 y y=238.3 de un lienzo de 0 a 260,
  con un factor de apertura de hasta 0.20.
