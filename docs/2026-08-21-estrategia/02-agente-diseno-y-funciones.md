# Smart Finance 2.0 — Creatividad de funciones y diseño

Agente: diseño de producto / UX-UI / frontend. Fecha: 2026-08-21. Insumos: `audit-findings.md`, `tokens.css`, capturas reales 390 px y 1280 px, skill de brainstorming (superpowers), skill `dataviz` (validador de paleta ejecutado), búsquedas 2026 sobre Robinhood, Public, Yahoo AlphaSpace, Google Finance, Perplexity Finance, Lightweight Charts, uPlot, fintech LatAm.

**Método.** Siguiendo la skill de brainstorming, cada decisión estructural lista 2–3 alternativas y la elegida con su porqué (no se converge antes de explorar). Nada de esto está implementado: es la propuesta para aprobar antes de tocar código. Clasificación: *arquitectónica* (rehace IA, sistema visual y superficies).

**Veredicto de diseño en cinco líneas (sin repetir la auditoría).**
1. El sitio de hoy es una landing de boletín personal con un dashboard pegado debajo: el producto empieza en el píxel ~1.700 del móvil.
2. El lenguaje visual es plantilla "crypto dashboard": negro + verde + resplandores + globo; Fraunces queda huérfana (solo H1 y logo) y no significa nada.
3. Las gráficas son Chart.js por defecto: rejilla completa, 7 ticks en Y con 2 decimales, etiquetas X giradas, sin lectura táctil del precio.
4. Todo sigue el ritmo "eyebrow + H2 + párrafo + tarjeta" (landing), no ritmo de app: nada se puede *usar* sin leer un párrafo antes.
5. Lo que se queda porque es bueno: cifras en mono con cero barrado, ▲▼ redundantes al color, esqueletos sin CLS, prohibición de "en vivo", tokens comentados.

---

## A. Competidores y referencias

| Referencia | Qué hacen mejor | Qué adaptar a Smart Finance | Qué evitar |
|---|---|---|---|
| **Robinhood** (app) + **Legend** (web) | Gráfica de precio que se "raspa" con el dedo y actualiza el número grande (sin tooltip flotante); línea coloreada por dirección; filas de activos con sparkline; bottom tab bar de 5; Legend: multi-gráfica y screener IA (Cortex) | Readout de precio al arrastrar, línea por dirección, asset row con sparkline, tab bar inferior | Confeti/gamificación del trading, jerga de órdenes, explicar poco; el verde fluorescente como marca; la densidad de Legend no es para móvil |
| **Public.com** (Alpha, Key Moments) | Resúmenes IA de "por qué se movió" por activo; Earnings hub; UI blanco/negro con tipografía grande; preguntas en lenguaje natural | Bloque "por qué se movió" con disclosure de IA y fuentes; búsqueda en lenguaje natural en fase 2 | IA sin fuentes; producto que requiere cuenta de inversión; app separada para la IA |
| **Yahoo Finance** + **AlphaSpace** (2026) | Ficha por ticker completísima (stats, financieros, noticias); AlphaSpace: dashboards con widgets y sesiones persistentes (US$39.99/mes) | Estructura de ficha de activo por pestañas (Resumen · Gráfica · Stats · Noticias · Aprende · Research) | Densidad publicitaria, menús infinitos, dashboards personalizables (sobre-ingeniería para nuestro tamaño) |
| **Google Finance** (salió de beta jun-2026) | "Key Moments": marcadores en la gráfica que explican el movimiento; comparar activos; briefings programados en lenguaje natural; claro/oscuro limpios | Marcadores de eventos ligados a *nuestra* noticia explicada (fase 2); comparador 2–3 activos en %; el briefing ya lo tenemos (boletín) | Estética Material genérica; dependencia de cuenta; paneles IA que compiten con el dato |
| **Perplexity Finance** | Ficha conversacional con citas, heatmap, screener NL, Earnings hub con transcripción, "tasks" | "Preguntar sobre este activo" con citas y límites educativos (fase 2); heatmap sectorial simple (fase 3) | Conversación como navegación principal (un principiante no sabe qué preguntar); datos que no podemos sostener |
| **Koyfin** | Research profundo: 10 años de financieros, gráficas de fundamentales, comps, dashboards densos y gratis generosos | Gráficas de financieros 5 años (ingresos, márgenes, FCF) y tabla de comps con primera columna fija | Densidad de escritorio, miles de criterios, curva de aprendizaje de terminal |
| **TradingView** | La mejor gráfica interactiva (crosshair, rangos, cinética); Lightweight Charts open source (~12 KB gz en v5) | Usar Lightweight Charts; crosshair táctil; rangos 1D·1S·1M·3M·1A·5A·Máx | Indicadores técnicos, dibujar líneas, social trading, Pine |
| **Finviz** | Heatmap S&P, screener rápido, HTML ligerísimo | La ligereza como estándar (HTML estático + poco JS); heatmap sectorial más adelante | Estética 2005, anuncios, rojo/verde saturado como único canal |
| **Morningstar** + **Seeking Alpha** | Research estructurado (tesis, foso, fair value, riesgos), disclosure de posiciones, debate | Esqueleto de reporte (Tesis → Números → Valoración → Riesgos → Qué vigilar) con supuestos editables y disclosure de estudiante; barra "precio vs valor estimado" | Muros de pago, estrellas/ratings (autoridad que no tenemos), 5.000 palabras sin visual |
| **Investopedia** | Definiciones claras, "key takeaways", SEO educativo, simulador | Glosario (nuestra firma "glosario al tacto"), "La versión corta" (ya existe), prev/next y rutas | Artículos de 2.000 palabras, publicidad, tono enciclopédico sin ejemplos en pesos, simulador de trading |
| **FT / The Economist** | Jerarquía editorial serif + sans; gráficos anotados con una idea; "chart of the day"; contención cromática en datos | Serif para titulares editoriales (news, learn, research), sans para producto; gráfica anotada con 1 idea; "gráfica del día" en el boletín | Muro de pago, densidad textual, tono adulto que ahuyenta a un chico de 17 |
| **Revolut / Nu / Wise** (fintech de consumo) | Mobile-first de verdad: números grandes, tarjetas con una sola acción, bottom sheets, modo claro excelente, lenguaje humano (Nu), identidad cromática propia | Números grandes, "una tarjeta = una acción", bottom sheets, modo claro de primera, español humano | Copiar el morado de Nu o el lima de Wise (en LatAm se leen como ellos), recompensas/confeti, cualquier olor a apuesta |

**Patrón → referencia → decisión para Smart Finance**

| Dimensión | Quién lo hace mejor | Decisión SF 2.0 |
|---|---|---|
| Navegación | Robinhood (tab bar), Nu (sheets) | Tab bar de 5 en móvil; barra superior + ⌘K en escritorio |
| Jerarquía visual | FT, Revolut | Número/título grande primero; eyebrow mono solo como etiqueta de dato |
| Dashboards | Yahoo AlphaSpace, Koyfin | Sin dashboards personalizables; un "Hoy" curado + watchlist local |
| Charts | TradingView, Robinhood | Lightweight Charts + readout táctil; línea por dirección; 3–4 ticks |
| Market cards | Robinhood, Google Finance | Tile 128×96 con precio, Δ y sparkline; fila de activo con sparkline |
| Tipografía | FT/Economist, Revolut | Geist (UI) + Geist Mono (cifras) + Fraunces (editorial) — reescopada |
| Densidad | Koyfin (alta) vs Nu (baja) | Media: una idea por tarjeta, listas densas solo en /markets |
| Interacciones | Robinhood (scrub), Public | Arrastre de precio, sliders, bottom sheets, swipe en carruseles |
| Animaciones | Revolut (contención) | 150–250 ms, solo cambios de estado; nada continuo |
| Móvil | Nu, Robinhood | 375–430 px como lienzo de diseño; escritorio es ensanchar |
| Dark/Light | Google Finance | Ambos desde tokens; auto + toggle; gráficas revalidadas por modo |
| Búsqueda | Perplexity, Yahoo | Overlay único: activos + lecciones + noticias + herramientas |
| Filtros | Finviz (rápido) | Chips de una fila, nunca dropdowns anidados |
| Personalización | Google Finance (watchlist) | Watchlist local sin cuenta (fase 1.5); sin perfiles |
| Tools | Investopedia, Nu (calculadoras) | 5–7 herramientas con parámetros en URL |
| IA | Public, Google (Key Moments) | IA solo para *explicar* con fuentes y etiqueta; nunca recomienda |

**La oportunidad específica para jóvenes (lo que nadie hace bien para un estudiante de 17 en México/LatAm/Canadá):**
- Explicar el dato en el momento y *en pesos*: "USD/MXN 18.45" no dice nada; "tu celular importado, tu viaje, tu beca en dólares" sí. Nadie une precio → consecuencia personal.
- Enseñar con el mercado real: las lecciones viven lejos de los precios en todos lados; aquí la lección de inflación enlaza al dato de Banxico de hoy y la noticia enlaza a la lección.
- Bilingüe de verdad ES/EN LatAm↔Canadá: CETES/Afore y TFSA/RESP, MXN/CAD/USD, ejemplos locales. Google/Perplexity traducen; no contextualizan.
- Research construido en público con supuestos que el lector mueve: Morningstar/Seeking Alpha entregan conclusiones cerradas; aquí el DCF es un juguete honesto.
- Sin cuenta, sin app, sin cuota, sin "invierte ya": los brokers (GBM+, Flink, Bitso) quieren tu depósito y AlphaSpace tu suscripción; la confianza viene de un creador con cara + fuentes citadas.

---

## B. Nueva arquitectura de información

### Sitemap

| Ruta | Qué es | Notas |
|---|---|---|
| `/` | **Hoy**: pulso, historia del día, seguir aprendiendo, herramienta, research destacado, breakdowns, boletín | Producto en los primeros 844 px |
| `/markets` | Pulso completo + listas: Índices · Acciones (US/MX/CA) · Divisas · Cripto · Tasas/macro | Filas densas con sparkline; chips de filtro en una fila |
| `/markets/[symbol]` | Ficha de activo (USDMXN, SPY, AAPL, BTC, CETES28…) | Pestañas: Resumen · Gráfica · Stats · Noticias · Aprende · Research |
| `/markets/compare?a=SPY&b=IPC` | Comparador 2–3 activos normalizados en % | Fase 1.5 |
| `/news` · `/news/[slug]` | Noticias explicadas (3/día + "la semana en 5 puntos") | Filtros: Peso · Fed/Banxico · Acciones · Cripto · Macro |
| `/learn` · `/learn/[path]` · `/learn/[path]/[lesson]` | 3 rutas (Desde cero · Cómo funcionan los mercados · Invertir con cabeza) | Progreso local, quiz, prev/next, fuentes |
| `/learn/glossary` | Glosario A–Z | Mismo JSON que el "glosario al tacto" |
| `/tools` · `/tools/[tool]` | Herramientas | Parámetros en URL para compartir |
| `/research` · `/research/[company]` | Índice + reportes interactivos (LULU primero) | Metodología y disclosure |
| `/about` | Jaime, misión, metodología, fuentes, entrevistas, contacto | Aquí va la foto grande y las credenciales |
| `/community` | Grupo estudiantil (qué es, cómo unirse, sesiones) + breakdowns TikTok/LinkedIn | Única casa de los breakdowns |
| `/newsletter` · `/newsletter/[issue]` | Alta + archivo web de números | |
| `/search` | Página de búsqueda (no-JS y deep links); el overlay es la UI principal | |
| `/legal/disclaimer` · `/legal/privacy` | Obligatorios por el boletín | |
| `/es/...` | Espejo completo | Misma IA, mismas rutas |
| `/404` | Con buscador y pulso | |

### Navegación móvil — alternativas y decisión

| Opción | Pros | Contras |
|---|---|---|
| A. Hamburguesa + buscador fijo (actual mejorado) | Cero cambio estructural | Todo a dos toques; el menú esconde el producto; es lo que tienen las landings |
| B. Pestañas horizontales bajo la barra superior | Visible, barato | Compite con los chips de filtro; se pierde al hacer scroll |
| **C. Bottom tab bar de 5 (elegida)** | Destinos siempre al pulgar; patrón que la audiencia ya usa (Robinhood, Nu, TikTok); deja la barra superior libre para idioma/tema/más | Requiere decidir 5 destinos y un "Más" |

**Tab bar:** **Hoy** (/) · **Mercados** · **Noticias** · **Aprende** · **Buscar** (abre overlay). Por qué estos: son los cuatro hábitos diarios + la vía universal para llegar a cualquier cosa. Herramientas y Research no son pestañas porque son de uso ocasional; viven en Hoy (módulos), dentro de Aprende ("Herramientas") y en la ficha de activo ("Research"), y en el menú **Más** (☰ arriba a la derecha: Herramientas, Research, Comunidad, Boletín, Acerca de, Idioma, Tema). 56 px + safe-area, iconos 24 px con etiqueta 11 px, activa con relleno sutil, sin badges.

**Escritorio:** barra superior de 64 px: wordmark · Hoy · Mercados · Noticias · Aprende · Herramientas · Research · [buscador ⌘K 280 px] · EN/ES · tema · botón "Boletín". Contenedor 1200 px, 12 columnas, gutter 24.

**Búsqueda global:** un solo overlay (tecla `/` o ⌘K; pestaña Buscar en móvil) con campo de 48 px, resultados agrupados: Activos (símbolo, nombre, precio, Δ, sparkline) · Lecciones · Noticias · Herramientas · Research · Términos del glosario; recientes y "tendencia hoy" al abrir; acepta "USD/MXN", "AAPL", "inflación", "¿qué es el VIX?". Fase 1: índice estático JSON (~300 símbolos + contenido, ~20 KB, fuzzy en cliente). Fase 2: búsqueda de símbolos por API.

### HOME móvil, pantalla por pantalla (390×844)

| Y (px) | Bloque | Qué ve/hace el usuario |
|---|---|---|
| 0–52 | Barra superior | Wordmark · ES/EN (pill única con el otro idioma) · tema · ☰ Más |
| 52–96 | Línea "Hoy" | "Jue 21 ago · NYSE abierto · BMV abierto" (mono 12); primera visita: una frase "Mercados y dinero, explicados para jóvenes" con ×, se recuerda en localStorage |
| 96–208 | **Pulso** (carrusel snap) | 4 tiles 128×96: USD/MXN · S&P 500 · BTC · Tasa Banxico — precio mono 18, Δ con ▲▼, sparkline 1D; deslizar muestra IPC, Nasdaq, ETH, CETES, Oro; toque → ficha |
| 208–560 | **La historia de hoy** | Kicker tema+hora+fuente · título Fraunces 22 · "Qué pasó" 2 líneas · "Por qué importa" 2 líneas · chips de impacto (USD/MXN ▼0.4 % · SPY ▲0.2 %) · mini gráfica 1D del activo principal · chip "Resumen IA revisado por Jaime · Bloomberg · 08:40" · "Leer explicación →" |
| 560–700 | **Sigue aprendiendo** | Tarjeta: ruta "Desde cero · 2/6" con barra, siguiente lección, 5 min, botón Continuar (primera visita: "Empieza aquí: qué pasa cuando el peso se debilita") |
| 700–844 | **Herramientas** (inicio) | 2 tiles: Interés compuesto · ¿Cuánto me come la inflación? |
| debajo | Research destacado (LULU: precio vs valor estimado, barra) · "Mercados en 60 s" (5 filas: mayores movimientos) · Breakdowns (3 tarjetas 140×200 en fila) · Boletín compacto · "Quién hace esto" (avatar 48 px + 2 líneas → /about) · footer | Largo total objetivo ≤ 3.200 px (hoy 7.378) |

En los primeros 844 px el usuario ve mercados, una noticia explicada y el inicio del aprendizaje: tres de los cuatro pilares sin leer un titular de marketing.

### Decisiones pendientes de la auditoría

| Tema | Alternativas | Decisión y porqué |
|---|---|---|
| **Globo** | (a) dejarlo lazy; (b) hero con gráfica grande animada; (c) quitarlo y poner producto | **(c).** No lee ningún dato, cuesta 175 KB gz y 100 vh de móvil, ignora reduced-motion. Lo sustituyen el pulso y la historia del día; el "wow" pasa a ser el readout táctil de la gráfica |
| **About** | (a) seguir en home; (b) /about; (c) /about + presencia mínima | **(c).** Foto y credenciales a `/about`; en home, un "Quién hace esto" al final y bylines con avatar de 24 px en noticias y research. La cara da confianza junto al dato, no antes del dato |
| **Breakdowns TikTok/LinkedIn** | (a) home; (b) /news; (c) /community + fila en home | **(c).** Son contenido de creador, no producto; tarjetas estáticas con miniatura WebP ≤ 25 KB (sin embeds de 1 MB), fecha y 3 bullets de "qué aprendes" (SEO) |
| **Grupo estudiantil** | (a) enlace en footer; (b) /community | **(b).** Qué es, cómo unirse (enlace/form), próximas sesiones, miembros; enlazado desde Más, About y footer |
| **/es** | (a) ES como raíz; (b) EN raíz + /es (actual); (c) auto-redirect por idioma | **(b) + sugerencia.** No romper hreflang/SEO; banner único si `navigator.language` empieza por es-/en- y no coincide; el toggle conserva la ruta; números y monedas localizados por `Intl` (es-MX "$18.45 MXN", en "MX$18.45"). Ingeniería: generar ambos idiomas desde JSON de strings, no regex sobre HTML. Si >60 % de sesiones son ES, reevaluar la raíz |

---

## C. Sistema de diseño "Smart Finance 2.0"

### Principios
1. **El dato antes que el adorno.** Todo píxel del primer viewport es un número, una gráfica o una lección.
2. **Cada número trae su porqué** a un toque (glosario, "por qué importa", "qué es esto").
3. **Honesto con la cadencia y la fuente.** Chip fuente·hora en toda superficie de datos; nunca "en vivo"; IA siempre etiquetada.
4. **Pulgar primero.** 44 px, acciones abajo, swipe, nada solo-hover.
5. **Una voz, dos idiomas, dos temas.** Mismo layout ES/EN y claro/oscuro; strings, números y colores tokenizados.

### Color — tokens (contraste WCAG vs bg-0 / superficie-1)

| Token | Dark | Contraste | Light | Contraste | Uso |
|---|---|---|---|---|---|
| `--bg-0` | `#09090B` | — | `#F7F7F4` | — | Página (se abandona el #000 puro: menos halo sobre OLED, permite 4 escalones) |
| `--bg-1` | `#111114` | — | `#FFFFFF` | — | Tarjetas, paneles |
| `--bg-2` | `#18181C` | — | `#F1F1ED` | — | Chips, pestañas, inputs dentro de tarjeta |
| `--bg-3` | `#202027` | — | `#E9E9E4` | — | Sheets, popovers, hover |
| `--line` | `rgba(244,244,241,.10)` | 1.22:1 | `rgba(18,19,22,.10)` | 1.23:1 | Separación de 1 px (alfa, como hoy) |
| `--ink` | `#F4F4F1` | 18.1 / 17.1 | `#121316` | 17.3 / 18.6 | Texto principal |
| `--ink-2` | `#A3A3AB` | 7.9 / 7.5 | `#5B5E66` | 6.0 / 6.5 | Secundario |
| `--ink-3` | `#7E7E88` | 5.0 / 4.7 | `#666A74` | 5.0 / 5.4 | Atribución, ejes (nunca < 4.5) |
| `--up` | `#16C47F` | 8.8 / 8.3 | `#0B8F5A` marcas · `#05734A` texto | 3.8 · 5.5 | Sube; ▲ siempre |
| `--down` | `#FF5A5F` | 6.5 / 6.2 | `#D6363E` marcas · `#B8262E` texto | 4.4 · 5.8 | Baja; ▼ siempre (1.4× de luminancia respecto a up en dark) |
| `--neutral` | `#9BA3AF` | 7.8 | `#5B5E66` | 6.0 | Sin cambio / cerrado |
| `--warn` | `#FFB84D` | 11.6 | `#9A6200` texto · `#E0A030` punto | 4.7 | Mercado cerrado, dato viejo, aviso |
| `--brand-fill` / `--on-brand` | `#16C47F` / `#04140D` | 8.3 | `#16C47F` / `#04140D` | 8.2 | Botón primario idéntico en ambos modos (texto oscuro sobre verde) |
| `--brand-text` | `#16C47F` | 8.8 | `#087248` | 5.6 | Subrayado de glosario, foco, pestaña activa |
| `--brand-wash` | `rgba(22,196,127,.12)` | — | `rgba(22,196,127,.14)` | — | Fondo de pestaña activa/callout; sustituye a todos los gradientes |

Decisión de marca (alternativas: mantener verde = up; cambiar a lima/violeta; marca neutra + verde solo dato): **se mantiene verde = marca = up** (coherencia con TikTok, decisión ya documentada), pero el verde deja de ser decoración: fuera eyebrows verdes, enlaces verdes, glows y gradientes. Queda en cuatro sitios: botón primario, ▲, pestaña/foco y el subrayado del glosario. Lima/violeta se descartan por Wise/Nu.

**Acentos de datos (6 series, identidad, orden fijo; validados con `validate_palette.js`: TODO PASA en ambos modos sobre sus superficies):**

| Serie | Dark (#111114) | Contraste | Light (#FFFFFF) | Contraste |
|---|---|---|---|---|
| 1 azul | `#3D8BEF` | 5.5 | `#1F6FD6` | 4.9 |
| 2 ámbar | `#C98500` | 6.1 | `#B8730A` | 3.8 |
| 3 teal | `#1FA7B0` | 6.5 | `#0A8FA0` | 3.9 |
| 4 violeta | `#9085E9` | 6.0 | `#7C5CE6` | 4.6 |
| 5 magenta | `#D55181` | 4.8 | `#D4397E` | 4.5 |
| 6 oliva | `#8F9A1E` | 6.1 | `#7D7A14` | 4.5 |

Reglas: verde/rojo **nunca** son serie (son estado); una sola serie de precio se pinta por dirección (`--up`/`--down`); comparación "base vs resultado" (aportaciones vs interés) usa `--ink-3` punteado vs `--brand`; escenarios bull/base/bear usan up/ink/down con etiqueta; secuencial = azul claro→oscuro; nunca doble eje Y; leyenda siempre con ≥ 2 series y etiquetas directas.

### Tipografía
Se mantienen las tres familias, **reescopadas**: Fraunces 600 pasa de "solo H1 del hero" a **titular editorial** (noticia explicada, lección, reporte de research, citas destacadas) — el serif significa "esto se lee", la sans "esto se usa" (cue FT/Economist sin copiar la maqueta). Geist: 400/500/600 (se elimina 700; títulos en 600). Geist Mono: 400/500 (se eliminan 600/700; énfasis por tamaño/color). Total 6 archivos ≈ 140 KB → ≈ 100 KB con subset latino; preload de Geist 400 y Mono 500.

| Rol | Móvil | Escritorio | Fuente |
|---|---|---|---|
| display (titular editorial) | 32/36 | 44/48 | Fraunces 600, tracking −0.01em |
| h1 UI (Mercados, Aprende) | 24/30 | 30/36 | Geist 600 |
| h2 / h3 | 20/26 · 17/24 | 22/28 · 17/24 | Geist 600 |
| body / lectura | 16/25 · 17/27 | igual | Geist 400, ancho 680 |
| small / caption | 14/20 · 12/16 | igual | Geist 400 / Mono 400 |
| eyebrow | 11/14, 500, .08em, mayúsculas | igual | Mono (solo etiquetas de dato) |
| num-xl / l / m / s | 32 · 20 · 16 · 13 | 40 · 22 · 16 · 13 | Mono 500, `tnum zero` |

**Espaciado** (4 pt): 4·8·12·16·20·24·32·40·48·64. Sección móvil 32 (hoy 96), escritorio 64; padding de tarjeta 16/20; gutter 16/24/32. **Radios:** 6 inputs/chips · 10 botones/tiles · 14 tarjetas · 20 sheets · 999 píldoras. **Bordes/sombras:** dark = 1 px `--line`, sin sombras, elevación por escalón de superficie; light = 1 px `--line` + `0 1px 2px rgba(18,19,22,.06)`, sheets `0 8px 24px rgba(18,19,22,.10)`. Foco: anillo 2 px `--brand-text`, offset 2. **Grid:** 4/8/12 columnas, contenedor 1200, lectura 680.

### Catálogo de componentes (estados: default · hover · pressed · activo · cargando · vacío · error · cerrado · retrasado)

| Componente | Anatomía | Notas móviles y estados |
|---|---|---|
| Market tile (pulso) | 128×96: símbolo mono 12 · precio mono 18 · Δ ▲▼ 13 · sparkline 56×24 | Cargando: 3 barras skel; cerrado: punto ámbar + "cierre"; error: "—" y chip fuente en rojo apagado |
| Asset row | 56 px: símbolo+nombre · sparkline 64×24 · precio · Δ (color + ▲▼) | Lista virtual si > 40; swipe no (toque abre ficha) |
| Price chart panel | Readout (precio 32, Δ, fecha bajo scrub) · rangos 1D·1S·1M·3M·1A·5A·Máx (40 px alto, scroll horizontal) · lienzo 200 px · línea base punteada (cierre previo) · chip fuente | Arrastrar = crosshair + readout; `touch-action: pan-y`; cerrado/retrasado visible; vacío: "sin datos para este rango" |
| Stat tile | Etiqueta 12 · valor mono 20 · (Δ o contexto 12) · "¿qué es?" | 2 por fila en móvil; sin iconos decorativos |
| News story card | Kicker · título Fraunces · Qué pasó · Por qué importa · chips de impacto · mini gráfica · Aprende · chip IA/fuente/hora | Compacta (home) y completa (/news/[slug]); "👍👎 ¿te sirvió?" local |
| Lesson card | Nº y ruta · título · 1 línea · 5 min · progreso | Una sola acción (toda la tarjeta es el enlace); fuera "More context" + "Read more" duplicados |
| Learning-module widget | Título "Pruébalo con tus números" · 2–4 sliders con valor mono a la derecha · gráfica SVG 180 px · frase resultado · "Qué estás viendo" · disclaimer | Thumb 28 px con área 44; `<input type=range>` nativo estilizado; resultado con `aria-live` |
| Tool panel | Inputs arriba · resultado grande mono · desglose · "Copiar link" · "Qué aprendes" | Parámetros en URL; sin botón "calcular" (reactivo) |
| Research header | Marca de la empresa · nombre/ticker/bolsa · precio+Δ · "Valor estimado (base)" con barra bear–base–bull · switch de escenario sticky | Sticky 96 px; colapsa a 56 al hacer scroll |
| DCF control | Slider con etiqueta, valor, "¿qué es?" y preset del escenario marcado | Cambiar escenario anima los sliders 200 ms; botón "restablecer" |
| Scenario switch | Segmented 3 posiciones: Bear · Base · Bull | Colores down/ink/up con texto; teclado ←→ |
| Source/timestamp chip | "Retraso 15 min · Yahoo · 14:32" mono 12 `--ink-3` punto de frescura: verde ≤ 15 min, ámbar ≤ 1 h, gris más | En toda superficie de datos; toque → sheet "de dónde sale este número" |
| Disclaimer block | 1 línea + expandir | Una sola definición, reutilizada |
| Bottom nav | 5 ítems 56 px + safe-area | Activo: icono relleno + `--brand-wash`; oculto al abrir teclado |
| Search overlay | Campo 48 px · grupos · recientes · tendencias | Cierra con swipe-down/Esc; `role=dialog`, foco atrapado |
| Skeleton | Barras con el ancho final (sin CLS), shimmer 1.2 s | Reduced-motion: sin shimmer |
| Empty / error | Icono de línea 24 px + 1 frase + acción | Error de dato: muestra último valor conocido + chip rojo apagado "sin actualizar desde 14:32" |
| Glosario al tacto (firma) | Término con subrayado punteado `--brand-text` · sheet: eyebrow TÉRMINO, palabra Fraunces 24, definición 2 líneas, "En pesos:" ejemplo, enlace a lección | Ver "elemento firma" |

### Microinteracciones y motion
- **Sí:** entrada del número grande (recorte + subida, 600 ms, no 1.1 s); cambio de rango con crossfade de línea 150 ms; readout que sigue el dedo sin transición; sheets 240 ms `cubic-bezier(.22,.61,.36,1)`; subrayado de pestaña que se desliza 180 ms; sliders actualizan en `input` sin throttle visible (rAF); estado pressed con escala 0.98.
- **No:** scroll-reveal en toda la página (reveal.js solo en la primera carga del home o eliminarlo), parallax, marquesina continua del ticker (se vuelve carrusel estático con swipe), globo/WebGL, confeti, contadores que suben desde cero, animaciones de fondo.
- **Reduced-motion:** todo pasa a opacidad o instantáneo; sheets sin desplazamiento; sparklines sin dibujo progresivo.

### Elemento firma — alternativas y elección

| Opción | Qué es | Juicio |
|---|---|---|
| 1. **Glosario al tacto** (elegida) | Toda palabra técnica lleva subrayado punteado verde; al tocar, una sheet de 2 líneas con ejemplo en pesos y enlace a lección; igual en ES/EN, en noticias, lecciones, research y herramientas | Propia, educativa, barata (JSON de ~150 términos + 1 componente), visible en cada pantalla; convierte el verde en "aquí hay explicación" |
| 2. Línea con marcadores | Marcadores numerados en la gráfica ligados a la noticia explicada | Buena función (fase 2), pero Google Finance ya la hizo suya ("Key Moments") |
| 3. Franja de pulso | Los 4 tiles como cabecera de todas las páginas | Útil como estructura (Hoy, Mercados, Noticias) pero no identidad |

**Qué es decorativo y desaparece:** globo y three.js; resplandores radiales y gradientes verdes en tarjetas/boletín; fondo de rejilla de las tarjetas de noticias; foto circular de 260 px en home; los tres pills del hero; doble línea del wordmark ("MARKETS & MONEY, DECODED"); eyebrows y enlaces verdes como relleno; scroll-reveal generalizado; etiquetas X giradas y rejilla completa en gráficas; "← Back to Smart Finance" (lo sustituye la navegación); iconos en cuadro verde de las lecciones; marquesina de ticker.

---

## D. Funciones

### Top 10 priorizadas

| # | Función | Para quién | Valor | Esfuerzo | Datos | MVP |
|---|---|---|---|---|---|---|
| 1 | Ficha de activo `/markets/[symbol]` | Todos | El producto deja de ser 14 símbolos en una lista | M | Twelve Data/Yahoo (precio e historial), CoinGecko, Banxico | Sí |
| 2 | Noticia explicada (4 bloques, 3/día) | Estudiante que llega de TikTok | Hábito diario; el hueco de mercado | M | Bloomberg RSS + Claude Haiku + revisión de Jaime | Sí |
| 3 | "Hoy": pulso + historia + continuar | Todos | Home con producto; −60 % de scroll | S | Reusa /api/markets y /api/sparklines | Sí |
| 4 | Rutas de aprendizaje con progreso local y quiz | Principiante | Orden, retorno, sensación de avance | M | Sin datos externos | Sí |
| 5 | 5 módulos interactivos | Principiante/escuela | Lo que diferencia de Investopedia | M | Banxico (inflación); resto local | 2 en MVP |
| 6 | Herramientas (5–7) | Jóvenes MX/CA | Uso real y compartible | M | Banxico, tipo de cambio | 3 en MVP |
| 7 | Research interactivo (LULU) | Aplicación U of T, curiosos | Pieza insignia; nadie la tiene | L | SEC XBRL companyfacts + precios | Sí (1 empresa) |
| 8 | Búsqueda global | Todos | Llegar a todo en 2 toques | S | Índice JSON estático | Sí |
| 9 | Glosario al tacto | Todos | Firma + educación continua | S | JSON ~150 términos | Sí |
| 10 | Modo claro + auto | Quien lee de día/escuela | Accesibilidad y "premium" | S | — | Sí |
| — | Siguientes: watchlist local (S), comparador (M), marcadores de eventos (M), "Pregúntale" IA con citas (L), heatmap (M); **no**: alertas/cuentas, simulador de trading, screener | | | | | |

**Spec de una línea cada una.** (1) Encabezado precio+Δ, chart panel con rangos, stats (rango 52 s, cambio 1A, qué es), noticias explicadas relacionadas, lección ligada, research si existe; allowlist de ~300 símbolos con páginas pre-generadas. (2) Pipeline: RSS → Claude con esquema fijo (qué pasó/por qué/impacto/aprende + símbolos afectados) → cola de revisión de 1 clic para Jaime → publicar a las 8:00 con el boletín; sin revisión no sale. (3) Pulso de 8 tiles desde la caché de 15 min; historia del día = la noticia más reciente publicada; "continuar" lee localStorage. (4) 3 rutas × 5–6 lecciones en JSON (orden, tiempo, prerequisito), barra de progreso, quiz de 3 preguntas al final, prev/next, fuentes al pie. (5) Ver siguiente tabla. (6) Ver herramientas. (7) Ver diseño de research. (8) Overlay con índice JSON, fuzzy (Fuse-like propio ≤ 3 KB), atajos `/` y ⌘K. (9) `<dfn data-term>` en markdown → subrayado + sheet; glosario A–Z generado del mismo JSON. (10) `color-scheme` + `data-theme`, toggle en barra superior, gráficas leen tokens.

### Cinco módulos de aprendizaje interactivo

| Módulo | Sliders / controles | Qué cambia en pantalla | Qué aprende |
|---|---|---|---|
| **Inflación** | Precio de hoy (MX$50–5.000, default "tacos y refresco $100") · inflación anual 0–15 % (default dato Banxico del mes) · años 1–30 | Barra de "qué compras con los mismos $100" que se encoge; frase "para comprar lo mismo necesitarías $X"; toggle "dinero en cuenta al 0 % vs CETES al 7 %" dibuja línea nominal vs real | Poder adquisitivo; nominal vs real; por qué ahorrar "debajo del colchón" pierde |
| **Riesgo / retorno** | % en acciones 0–100 (resto CETES) · horizonte 1–30 años · botón "simular otra vez" | Abanico p10–p90 de 200 caminos (semilla fija por defecto), retorno esperado, "peor año" en rojo, caja "¿aguantarías ver −30 % un año?" | Volatilidad, horizonte, por qué más retorno exige aguantar caídas |
| **Diversificación** | Nº de empresas 1–20 · toggle "mismo sector / sectores distintos" | Curva de volatilidad del portafolio que baja y se aplana; línea punteada "riesgo que no se va" | Riesgo específico vs de mercado; por qué un ETF de 500 ≠ 20 acciones del mismo sector |
| **P/E y DCF simplificado** | Parte 1: utilidad por acción · "cuánto pagas por cada peso de utilidad" (P/E 5–60) → precio implícito, comparado con P/E real de AAPL/WALMEX/LULU (dato mensual estático). Parte 2: crecimiento 5 años 0–30 % · margen FCF 5–35 % · tasa de descuento 6–14 % | Termómetro "valor vs precio"; tabla 3×3 de sensibilidad (azul secuencial) | Precio ≠ valor; el valor depende de supuestos; ancla para el research |
| **Presupuesto 50/30/20** | Ingreso mensual 2k–40k (o mesada/beca) · toggle "vivo con mis papás" · 3 sliders ligados que suman 100 % | Pesos por categoría; "si ahorras X al mes, en 5 años al 7 % tienes Y" (enlaza a interés compuesto); ejemplos reales (Spotify, transporte) | La regla como punto de partida; ahorro automático primero |

### Herramientas que sí (7) y que no

Sí: **Convertidor contextual** (USD/MXN/CAD/EUR con tipo del día + "¿cuánto cuesta X en pesos?" + 1 año de historial); **Interés compuesto** (el módulo, standalone, con link); **CETES vs cuenta vs inflación** (tasa Banxico real); **Calculadora de inflación** ("¿cuánto valen hoy $100 de 2015?", INPC); **Presupuesto 50/30/20** con "copiar plan"; **Deuda de tarjeta** (pago mínimo vs pagar X al 45 % típico: meses e intereses totales); **"Estudiar en Canadá"** (costo en CAD × tipo de cambio × inflación → ahorro mensual requerido; nicho exacto de la audiencia). **No:** hipoteca (no es la audiencia), Afore/retiro detallado (regulatorio), simulador de trading con dinero ficticio (fomenta trading y cuesta mucho), screener, impuestos/ISR (cambia, riesgo), conversor cripto avanzado.

### Estructura de la noticia explicada
Kicker (tema · hora · fuente) + chip "Resumen IA · revisado por Jaime" o "Escrito por Jaime" → **Título** en lenguaje claro (Fraunces, no el titular de agencia) → **Qué pasó** (2–3 frases con cifra, fecha y quién) → **Por qué importa** (2–3 frases para un estudiante en MX/CA: peso, tasas, precios, beca, empleo) → **Impacto en mercados** (chips de activos con Δ del día + mini gráfica del principal; "todavía no se sabe" está permitido) → **Aprende más** (1 lección, 1–2 términos del glosario, 1 pregunta para pensar) → pie con fuentes enlazadas, hora, disclaimer, 👍👎 local. 120–180 palabras en total; máximo 3 por día hábil; fin de semana "la semana en 5 puntos".

### Research en móvil — diseño de interacción
- **Header sticky** (96→56 px): marca de la empresa, nombre/ticker/bolsa, precio retrasado + Δ, "Valor estimado (base) $X" con barra bear–base–bull donde se marca el precio; debajo, **switch Bear · Base · Bull** que permanece fijo.
- **Anclas horizontales** (chips): Tesis · Negocio · Números · Valoración · Comparables · Riesgos · Qué vigilar · Fuentes.
- **Tesis:** 3 bullets + "la pregunta que responde este reporte" + disclosure (estudiante, sin posición, educativo).
- **Números:** barras SVG de ingresos 5 años y, en gráfica aparte (nunca doble eje), línea de margen operativo; FCF; 4 stat tiles (crecimiento, margen, caja neta, recompras), cada uno con "¿qué es?".
- **Valoración:** 4 sliders DCF (crecimiento de ingresos 5 años, margen FCF objetivo, tasa de descuento, crecimiento terminal) con preset por escenario; cambiar de escenario anima los sliders y muestra el delta; salida: valor/acción grande + barra vs precio + tabla de sensibilidad 3×3 (descuento × crecimiento) en azul secuencial; "restablecer" y "copiar link con mis supuestos" (query params).
- **Comparables:** tabla con scroll horizontal y primera columna fija; columnas P/E, EV/EBITDA, crecimiento, margen; fila de la empresa resaltada con `--brand-wash`; toque en cabecera ordena.
- **Riesgos:** 3–5 tarjetas "qué lo detonaría / cómo lo veríamos en los datos". **Qué vigilar:** próximos eventos (resultados, cambio de CEO) y compromiso de actualización. **Fuentes/metodología** con enlaces al 10-K/XBRL.

---

## E. Reglas mobile-first y performance como criterios de diseño

| Regla | Valor |
|---|---|
| Lienzo de diseño | 375–430 px primero; escritorio = ensanchar a 12 columnas, nunca "otra versión" |
| Objetivos táctiles | Mínimo 44×44; tab bar 56 + safe-area; rangos 40 alto × ≥ 48 ancho; thumb de slider 28 con área de 44; 8 px entre objetivos |
| Gestos | Arrastre horizontal en la gráfica = scrub (long-press 150 ms si hay conflicto con scroll vertical, `touch-action: pan-y`); swipe en carruseles (pulso, breakdowns, tabs de ficha); rangos por pestañas (y ←→ en teclado); pinch-zoom desactivado en gráficas; sheets se cierran con swipe-down |
| Gráficas responsive | Alto 200 px móvil / 280 tablet / 320 escritorio; 3–4 ticks Y ("números bonitos", ≤ 2 decimales en FX, 0 en índices); 4–5 ticks X, nunca giradas; rejilla solo horizontal, 1 px `--line`; línea 2 px; relleno 12 %→0; tooltip = fila de lectura fija encima (precio, Δ, fecha), no burbujas flotantes; etiqueta de cierre previo punteada en 1D; `aspect-ratio` reservado para CLS 0 |
| Presupuesto por página (gz) | HTML ≤ 30 KB (CSS fuera del HTML, cacheada) · CSS ≤ 25 KB total · JS home ≤ 60 KB (LWC ~15 + app ~25 + formato/i18n ~5 + búsqueda ~5); gráficas cargan al entrar en viewport · Fuentes ≤ 110 KB (6 archivos, 2 preload) · Imágenes: avatar 48 px AVIF ≤ 4 KB, miniaturas ≤ 25 KB lazy, `srcset` obligatorio · Primer viewport ≤ 300 KB; sin CDN de terceros (LWC autoalojada), sin three.js |
| Métricas objetivo | LCP ≤ 2.0 s y TTI ≤ 3 s en Android gama media 4G; INP ≤ 150 ms; CLS 0; Lighthouse móvil ≥ 90 |
| Datos | Una petición por superficie (batch), `AbortController`, último valor conocido en localStorage para pintar al instante + chip de frescura |

### Librería de gráficas — alternativas y decisión

| Opción | Peso gz | A favor | En contra |
|---|---|---|---|
| Chart.js 4 (actual) | ~60 KB | Conocida, gráficas de categorías | Aspecto genérico, sin eje temporal financiero, crosshair por plugin propio, tooltips flotantes, cinética nula |
| **Lightweight Charts v5** (elegida para precios) | ~12–16 KB tree-shaken | Hecha para finanzas: eje de tiempo, crosshair, táctil y cinética, área/línea/velas/histograma/baseline, marcadores de serie (eventos), canvas rápido | Sin ejes de categorías ni leyenda propia (se hacen en HTML), requiere JS (se cubre con skeleton) |
| uPlot | ~50 KB min / ~16 KB gz | Muy rápido, series temporales | API de bajo nivel, tooltips y táctil a mano, look que hay que construir entero |
| SVG propio | 0 KB | Control total, accesible, sin CLS, ideal para ≤ 400 puntos | No conviene para históricos largos ni scrub fino |

**Decisión:** Lightweight Charts para todo precio/historial (pulso grande, ficha, research); **SVG propio** para sparklines, módulos de aprendizaje, herramientas y financieros de research (barras 5 años, sensibilidad); **Chart.js se elimina**. Ahorro ≈ 45 KB gz frente a hoy, interacción táctil nativa y una sola estética de datos.
