/* Vorschau-Version: Hinweis einblenden, Formulare nur vorführen */
(function () {
  'use strict';
  var F = window.FLUBAG;
  if (F && F.config && F.config.form) F.config.form.mode = 'demo';
  var css = '.vorschau-badge{position:fixed;left:12px;bottom:12px;z-index:400;max-width:min(340px,calc(100vw - 96px));padding:9px 13px;border-radius:12px;background:rgba(6,11,22,.92);color:#edf2fa;font:500 12px/1.4 Inter Variable,Inter,system-ui,sans-serif;box-shadow:0 10px 30px -10px rgba(0,0,0,.6);border:1px solid rgba(255,90,38,.55);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}' +
    '.vorschau-badge strong{display:inline-block;margin-right:6px;padding:1px 7px;border-radius:99px;background:#e63201;color:#fff;font-size:10px;letter-spacing:.08em;text-transform:uppercase}' +
    '.vorschau-badge a{color:#ffb08e}.vorschau-badge button{margin-left:6px;background:none;border:0;color:#a9b6ca;cursor:pointer;font:inherit;padding:0 2px}';
  function show() {
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    var b = document.createElement('div');
    b.className = 'vorschau-badge'; b.setAttribute('role', 'note');
    b.innerHTML = '<strong>Entwurf</strong>Redesign-Konzept von Jonas Grüter, nicht die offizielle Website der FLUBAG. ' +
      '<a href="https://www.flubag.ch/" target="_blank" rel="noopener">Zur offiziellen Seite</a>' +
      '<button type="button" aria-label="Hinweis ausblenden">&#x2715;</button>';
    b.querySelector('button').addEventListener('click', function () { b.remove(); });
    document.body.appendChild(b);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show); else show();
})();
