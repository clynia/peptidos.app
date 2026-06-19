/* ==========================================================================
   peptidos.app — Aviso de cookies
   Banner de consentimiento minimal. Guarda la elección en localStorage y no
   vuelve a aparecer. RGPD / LSSI-CE: aceptar y rechazar con el mismo peso.
   ========================================================================== */
(function () {
  'use strict';
  var KEY = 'pa-cookies-v1';
  try { if (localStorage.getItem(KEY)) return; } catch (e) {}

  function policyHref() {
    var p = location.pathname;
    if (p.indexOf('/paginas/') > -1) return 'privacidad.html';
    if (p.indexOf('/articulos/') > -1 || p.indexOf('/herramientas/') > -1) return '../paginas/privacidad.html';
    return 'paginas/privacidad.html';
  }

  var el = document.createElement('div');
  el.className = 'cookie-banner';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Aviso de cookies');
  el.setAttribute('aria-live', 'polite');
  el.innerHTML =
    '<div class="cookie-banner__text">' +
      '<span class="cookie-banner__label">Cookies</span>' +
      '<p>Usamos solo cookies técnicas necesarias para que la web funcione. No hay rastreo ni publicidad. Si algún día añadimos analítica, te lo pediremos antes. <a href="' + policyHref() + '">Más información</a>.</p>' +
    '</div>' +
    '<div class="cookie-banner__actions">' +
      '<button type="button" class="btn btn--ghost" data-cc="reject">Rechazar</button>' +
      '<button type="button" class="btn" data-cc="accept">Aceptar</button>' +
    '</div>';

  function close(choice) {
    try { localStorage.setItem(KEY, choice); } catch (e) {}
    el.classList.remove('is-in');
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 320);
  }

  el.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-cc]') : null;
    if (b) close(b.getAttribute('data-cc'));
  });

  function show() {
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('is-in'); });
  }
  if (document.readyState !== 'loading') show();
  else document.addEventListener('DOMContentLoaded', show);
})();
