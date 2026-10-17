/* Pilotenbereich: Seitensuche, Gefahren-Leerzustand, Datum im News-Leerzustand */
(function () {
  'use strict';
  var F = window.FLUBAG;

  // Datum im Leerzustand der Pilot News
  var today = F.$('[data-pl-today]');
  if (today) {
    var z = F.zurich(new Date());
    today.textContent = F.pad(z.d) + '.' + F.pad(z.m) + '.' + z.y;
  }

  // Seitensuche über die gruppierten Kacheln
  var input = F.$('[data-pl-filter]');
  var groups = F.$('[data-pl-groups]');
  var none = F.$('[data-pl-noresult]');
  if (input && groups) {
    var norm = function (s) { return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };
    var items = F.$$('.pl-link', groups).map(function (a) {
      return { li: a.parentElement, group: a.closest('.pl-group'), text: norm(a.textContent + ' ' + (a.getAttribute('data-keywords') || '')) };
    });
    var run = function () {
      var terms = norm(input.value).split(/\s+/).filter(Boolean);
      var hits = 0;
      items.forEach(function (it) {
        var ok = terms.every(function (t) { return it.text.indexOf(t) > -1; });
        it.li.hidden = !ok;
        if (ok) hits++;
      });
      F.$$('.pl-group', groups).forEach(function (g) { g.hidden = !F.$$('.pl-links li', g).some(function (li) { return !li.hidden; }); });
      if (none) none.hidden = hits > 0;
      if (F.motion) F.motion.refresh();
    };
    input.addEventListener('input', run);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        var first = items.filter(function (it) { return !it.li.hidden; })[0];
        if (first) { e.preventDefault(); first.li.querySelector('a').click(); }
      }
      if (e.key === 'Escape') { input.value = ''; run(); }
    });
  }

  // Gefahrenhinweise: "alles ruhig" anzeigen, wenn keine Warnung aktiv ist; Modellzeit anzeigen
  var calm = F.$('[data-pl-nohazard]');
  var stamp = F.$('[data-pl-wxtime]');
  function onWeather(w) {
    if (!w) return;
    if (calm) calm.hidden = !!(w.westHazard || w.biseHazard || w.tailwind33);
    if (stamp && w.time) stamp.textContent = ', Stand ' + String(w.time).slice(11, 16) + ' Uhr';
  }
  F.listen('flubag:weather', onWeather);
  F.ready(function () { if (F.weather && F.weather.data) onWeather(F.weather.data); });
})();
