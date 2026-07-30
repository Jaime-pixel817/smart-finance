Varios cambios, algunos solo para móvil (@media hasta 767px), otros para
todo el sitio. Van por bloque.

═══════════════════════════════════════
1. HERO EN MÓVIL: TEXTO SOBRE EL GLOBO
═══════════════════════════════════════
En móvil, el título ("Finance That Actually Clicks."), el texto pequeño
("Updated finance..."), y los botones de LinkedIn/TikTok deben aparecer
SUPERPUESTOS sobre el globo, igual que ya pasa en escritorio — no
apilados en secuencia como está ahora. NO reduzcas el tamaño del globo
en móvil, se queda igual de grande. Agrega el degradado/sombra necesario
detrás del texto para que siga siendo legible sobre las partículas.

═══════════════════════════════════════
2. ABOUT EN MÓVIL: QUITAR FLECHITAS
═══════════════════════════════════════
En móvil, quita el ícono de flecha (↗) junto a los links de texto
"LinkedIn" y "TikTok" en About. Los links de texto se quedan
funcionando igual, solo sin el ícono. No toques esto en escritorio.

═══════════════════════════════════════
3. "START HERE" EN DOS PASOS: GANCHO → PÁGINA DE LECCIONES
═══════════════════════════════════════
- En la página principal, la sección "Start Here" debe mostrar SOLO un
  bloque promocional/gancho: título llamativo, una frase corta
  invitando a aprender, y un botón tipo "Ver todas las lecciones" (tú
  elige el mejor texto y diseño, que se vea atractivo, con buen uso de
  espacio, puede llevar un ícono o ilustración simple relacionada a
  aprender/finanzas). NO muestres las 6 tarjetas aquí.
- Ese botón debe llevar a una PÁGINA NUEVA (ej. /lessons/index.html)
  donde SÍ aparezcan las 6 tarjetas de lecciones, exactamente como están
  ahora: mismo ícono, título, descripción, acordeón "Más contexto", y
  botón "Leer más" que lleva a la lección completa — sin cambiar nada de
  su contenido ni comportamiento, solo cambia dónde viven. Cuadrícula
  responsiva: 2 columnas en móvil, igual que en escritorio ya la tienes.
  Mismo nav/footer que el resto del sitio.
- Si el link "Lessons" del nav apuntaba a esta sección dentro de la
  home, actualízalo para que ahora lleve a esta página nueva.
- Todo bilingüe (EN/ES).

═══════════════════════════════════════
4. QUITAR "ECONOMIC CALENDAR" POR COMPLETO
═══════════════════════════════════════
Elimina la sección del calendario económico entera, su CSS, y cualquier
traducción que le pertenezca exclusivamente. Sin referencias huérfanas.

═══════════════════════════════════════
5. NOTICIAS: 4 TARJETAS, CUADRÍCULA 2×2, CON IMAGEN Y OPINIÓN AUTOMÁTICA
═══════════════════════════════════════
- Amplía de 3 a 4 titulares de Bloomberg.
- Layout: cuadrícula 2×2 en escritorio; en móvil, una sola columna.
- Agrega una imagen a cada tarjeta (usa la miniatura del feed de
  Bloomberg si está disponible; si no, un fondo genérico relacionado al
  tema — no inventes fotos falsas).
- "My take" generado automáticamente (1 vez al día): ya tengo
  ANTHROPIC_API_KEY configurada en Vercel (Production). Modifica
  /api/news.js: cuando el caché expire (~24h), después de traer los
  titulares, llama a la API de Anthropic (modelo claude-haiku-4-5) para
  generar una opinión/contexto de 1-2 líneas por titular, en mi tono
  (estudiante/creador de contenido explicando finanzas a alguien que
  apenas empieza, cercano pero informado, sin sonar robótico). Cachea el
  resultado completo (titulares + imágenes + takes) por ~24h. Usa
  process.env.ANTHROPIC_API_KEY, nunca expuesta al cliente. Si la
  llamada a Anthropic falla, cae de vuelta a un placeholder neutro sin
  romper nada. Quita el sistema manual de NEWS_TAKES del frontend.

═══════════════════════════════════════
6. RECENT BREAKDOWNS: CUADRÍCULA 2×3 EN MÓVIL
═══════════════════════════════════════
En móvil, cambia el layout de las 6 tarjetas de posts a una cuadrícula
de 2 columnas × 3 filas, con la imagen que ya tiene cada una. En
escritorio no cambies el layout.

═══════════════════════════════════════
NO TOQUES
═══════════════════════════════════════
El tamaño del globo, Market pulse/Crypto, el gráfico VIX, el resto del
Hero, Follow, Footer.

═══════════════════════════════════════
VERIFICACIÓN
═══════════════════════════════════════
Revisa en 375px que el texto sobre el globo sea legible, que las
cuadrículas 2×3 y 2×2 se vean bien alineadas sin cortarse, que la nueva
página de lecciones funcione y no rompa ningún link del nav, que
/api/news no rompa si Anthropic falla, y que no aparezca scroll
horizontal ni en móvil ni en escritorio.