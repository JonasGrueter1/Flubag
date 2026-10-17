/* Geschichte & Team: Jahre seit der Gründung (14.2.1966) live berechnen */
(function () {
  'use strict';
  var F = window.FLUBAG;
  var el = F && F.$('[data-gs-years]');
  if (!el) return;
  var now = new Date();
  var years = now.getFullYear() - 1966;
  if (now.getMonth() < 1 || (now.getMonth() === 1 && now.getDate() < 14)) years--;
  el.setAttribute('data-count', String(years));
  el.textContent = String(years);
})();
