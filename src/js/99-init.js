/* Start: alle Module initialisieren. Läuft bei DOMContentLoaded, also nachdem auch
   die Seiten-Skripte (defer) ihren Inhalt gerendert haben. */
(function () {
  'use strict';
  var F = window.FLUBAG;
  function boot() {
    var mods = ['theme', 'header', 'ui', 'forms', 'status', 'crosswind', 'motion'];
    mods.forEach(function (m) { try { if (F[m] && F[m].init) F[m].init(); } catch (e) { console.error('FLUBAG ' + m, e); } });
    try { F.weather.load(); } catch (e) { console.error(e); }
    F._runReady();
  }
  if (document.readyState === 'complete') boot(); else document.addEventListener('DOMContentLoaded', boot);
})();
