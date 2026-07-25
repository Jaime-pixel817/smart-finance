// Toggle EN/ES de las páginas de artículo.
//
// Mismo mecanismo que index.html: el inglés vive en el HTML y el español en un
// diccionario. Cada artículo define el suyo en window.ARTICLE_I18N antes de
// cargar este script; aquí solo está la mecánica, que es idéntica en los tres.
//
// data-i18n-html marca los pocos nodos que traen etiquetas dentro (<strong>,
// <a>) y hay que guardar/restaurar como HTML en vez de como texto plano. Solo
// se usa con strings del diccionario de la propia página, nunca con datos de
// una API.
(function () {
  var translations = window.ARTICLE_I18N || {};

  document.querySelectorAll('[data-i18n]').forEach(function (el) {
    el.dataset.i18nOriginal = el.hasAttribute('data-i18n-html') ? el.innerHTML : el.textContent;
  });

  function setLanguage(lang) {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      var value = (lang === 'es' && translations[key]) ? translations[key] : el.dataset.i18nOriginal;
      if (el.hasAttribute('data-i18n-html')) {
        el.innerHTML = value;
      } else {
        el.textContent = value;
      }
    });
    document.querySelectorAll('.lang-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });
    document.documentElement.lang = lang;
    try { localStorage.setItem('sf-lang', lang); } catch (e) { /* modo privado */ }
  }

  document.querySelectorAll('.lang-btn').forEach(function (btn) {
    btn.addEventListener('click', function () { setLanguage(btn.dataset.lang); });
  });

  // Si el visitante ya había elegido idioma, se respeta al abrir el artículo.
  var saved = null;
  try { saved = localStorage.getItem('sf-lang'); } catch (e) { /* modo privado */ }
  if (saved === 'es') setLanguage('es');
})();
