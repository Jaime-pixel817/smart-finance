# El tablero: qué mirar cada mes y qué hacer con lo que salga

Media hora, el primer lunes de cada mes. Ni una hora, ni cada día: los números
de un sitio de este tamaño se mueven por ruido de una semana a otra, y mirarlos
a diario solo sirve para tomar decisiones malas más rápido.

**Dónde está**: `vercel.com` → proyecto `smart-finance` → pestaña **Analytics**
(visitas y eventos) y pestaña **Speed Insights** (velocidad de visitas reales).
Arriba a la derecha se elige el periodo: pon **Last 30 days**.

Lo que mide el sitio y lo que no está escrito, en palabras normales y en las dos
lenguas, en `/methodology` y `/es/metodologia`. Este archivo es el otro lado: el
manual de lectura.

---

## Antes de nada: el número que casi todos leen mal

Los eventos NO son personas. Si `explicame` sale 300 veces no son 300 personas
preguntando: puede ser una clase de 20 tocando quince palabras cada uno. Para
saber cuánta gente hay, mira **Visitors** en la pestaña Analytics; los eventos
sirven para comparar **entre ellos** y **contra el mes pasado**, no para
inventar personas.

Y con pocos visitantes casi nada es significativo. Con menos de ~200 visitantes
en el mes, un evento que pasa de 4 a 9 no significa nada. Escríbelo igual en la
bitácora y espera al mes siguiente.

---

## Los once eventos, y qué decisión cambia cada uno

| Evento | Qué contesta | Si sube | Si baja o sale casi en cero |
|---|---|---|---|
| `reto_empezado` | De los que abren `/challenge`, ¿cuántos llegan a contestar la primera ronda? | El gancho funciona: vale la pena enlazarlo desde el home y el boletín | La página promete mal o cuesta empezar. Mira la primera pantalla en el teléfono |
| `reto_terminado` (`puntos`, `aciertos`) | ¿Se termina la partida o se abandona a media? ¿Es demasiado fácil o imposible? | Si `aciertos` se pega a 5/5, el reto es fácil y aburre; si se pega a 0, es ruido y frustra | Muchos `reto_empezado` sin `reto_terminado` = se abandona; mira en qué ronda |
| `leccion_terminada` (`leccion`) | ¿Qué lecciones se acaban? | La lección que más se termina es la que hay que derivar a TikTok y LinkedIn primero | Una lección con visitas y sin terminados es demasiado larga o empieza mal |
| `quiz_respondido` (`leccion`, `acierto`) | ¿El quiz se contesta, y se acierta? | Sano | Un quiz con muchos fallos en la misma lección normalmente es una pregunta mal escrita, no gente que no entendió |
| `herramienta_usada` (`herramienta`) | ¿Con qué calculadora juega la gente? | La más usada merece su propia lección y su propia pieza de difusión | Una calculadora con visitas y sin uso: los sliders no se ven o no se entiende qué se ajusta |
| `activo_seguido` (`activo`, `sigue`) | ¿Qué activos le importan a la gente? | La lista de los cinco más seguidos manda: son los que deberían salir en el boletín y en el comparador | Nadie sigue nada: el botón no se entiende o no se ve |
| `comparacion_hecha` (`activos`, `n`) | ¿Se usa el comparador y con qué pares? | Los pares repetidos son ideas de contenido gratis («el dólar contra el S&P 500 en cinco años») | El comparador es un callejón: hay que enlazarlo desde las fichas |
| `explicame` (`termino`) | ¿Qué palabras traban la lectura? | Los diez términos más tocados son la lista de temas de las próximas lecciones | El glosario al tacto no se ve como algo tocable |
| `boletin_alta` (`desde`) | ¿Cuánta gente se da de alta y desde dónde? | Es el KPI de crecimiento del proyecto | Compáralo con las visitas del home; si el formulario se ve y nadie se da de alta, la promesa del correo no convence |
| `research_abierto` (`reporte`) | ¿Se abre el research? | El pilar 3 tiene público | Es el trabajo más caro del sitio: si no se abre, el problema es cómo se enlaza, no el reporte |
| `research_leido` (`reporte`, `hasta`) | ¿Hasta dónde se lee? | Lo que importa es la caída entre 25 % y 50 % | Si casi nadie pasa del 25 %, el reporte necesita un resumen ejecutivo arriba, no más bloques |

---

## La rutina de la media hora

1. **Visitas del mes y de dónde llegan** (Analytics → Visitors, Pages, Referrers).
   Anota el total y las tres páginas más vistas.
2. **Los tres números que mandan**: `boletin_alta`, `reto_empezado` y
   `leccion_terminada`. Son alta, hábito y aprendizaje: el proyecto entero cabe
   en esos tres.
3. **Las tres listas de contenido gratis**: los términos más tocados
   (`explicame`), los pares más comparados (`comparacion_hecha`) y los activos
   más seguidos (`activo_seguido`). De ahí salen los temas del mes siguiente.
4. **Speed Insights**: mira el **P75** (no el promedio) de LCP, CLS e INP en
   móvil. El presupuesto del CI ya impide que un PR los rompa en laboratorio;
   esta pestaña es la realidad, con teléfonos de verdad y redes de verdad. Si
   el P75 real se separa mucho del laboratorio, el problema es de red o de una
   imagen, no de código.
5. **Escribe cinco renglones** en la bitácora de abajo. Sin bitácora, el mes
   siguiente no hay con qué comparar y todo esto no sirve de nada.

---

## Metas para 2026–2027

No son promesas, son la vara para saber si un mes fue bueno. Se revisan en
enero de 2027.

| Métrica | Hoy (23 ago 2026) | Meta a 6 meses |
|---|---|---|
| Visitantes al mes | sin medir (esto empieza ahora) | 1 000 |
| Suscriptores del boletín | ~90 | 300 |
| `boletin_alta` al mes | sin medir | 40 |
| `reto_empezado` / visitas a `/challenge` | sin medir | 50 % |
| `leccion_terminada` al mes | sin medir | 150 |
| `research_leido` con `hasta=50` / `research_abierto` | sin medir | 40 % |
| LCP móvil P75 (Speed Insights) | sin medir | < 2.5 s |
| CLS móvil P75 | sin medir | < 0.05 |

La primera columna dice «sin medir» a propósito: el mes 1 es la línea base, no
un examen. La trampa clásica es inventarse el punto de partida.

---

## Lo que este tablero NO puede contestar

Vale la pena tenerlo escrito para no pedirle a los números algo que no tienen:

- **Quién** hizo algo. No hay identificador, así que no se puede seguir a una
  persona de una visita a la siguiente ni armar un embudo por usuario.
- **Qué escribió alguien** en una calculadora, qué activos tiene en su
  watchlist o qué correo dio. Nada de eso se manda (`limpiar()` en
  `src/lib/analytics.ts` lo tira antes de salir).
- **Si alguien aprendió.** `leccion_terminada` dice que llegó al final, no que
  entendió. Lo más cerca que hay es `quiz_respondido` con `acierto`.
- **Cuánta gente usa el sitio de verdad**, si mucha lleva GPC o Do Not Track o
  un bloqueador. La cuenta va por lo bajo, siempre. Eso es a propósito.

---

## Bitácora mensual

Una entrada por mes. Cinco renglones: qué subió, qué bajó, qué se decidió.

<!-- Plantilla:
### 2026-09 (leído el 2026-10-05)
- Visitantes: … · Páginas más vistas: … · De dónde llegan: …
- Los tres que mandan: boletin_alta … · reto_empezado … · leccion_terminada …
- Términos más tocados: … → tema de la próxima lección: …
- Speed Insights P75 móvil: LCP … · CLS … · INP …
- Decisión del mes: …
-->

### 2026-08 — mes 0

Nada que leer todavía: la analítica se encendió el 23 de agosto de 2026 con
este PR. La primera lectura de verdad es el **5 de octubre de 2026**, con
septiembre entero medido.

**Antes de esa fecha hay que haber hecho dos cosas en el panel de Vercel**
(están en el PR, con los pasos): encender **Web Analytics** y encender **Speed
Insights** en el proyecto. Los `<script>` ya están en todas las páginas, pero
sin esos dos interruptores el archivo `/_vercel/insights/script.js` devuelve 404
y no se guarda nada. Se comprueba en un minuto: abre
`https://smartfinance.lat`, pestaña Network del navegador, filtra por
`insights` y mira que la petición dé 200.
