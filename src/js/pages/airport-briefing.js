/* Airport Briefing: Saisonanzeige Sprungbetrieb, Hinweis "keine Gefahren" */
(function () {
  'use strict';
  var F = window.FLUBAG;

  // Saison Fallschirmsprungbetrieb (Mitte Mai bis Mitte September, als 15.5. bis 15.9. angenähert)
  var chip = F.$('[data-ab-season]');
  if (chip) {
    var z = F.zurich(new Date());
    var md = z.m * 100 + z.d;
    var inSeason = md >= 515 && md <= 915;
    chip.className = 'chip pl-chip-wrap' + (inSeason ? ' chip--warn' : '');
    chip.innerHTML = F.icon('calendar') + (inSeason
      ? 'Saison: bei guter Witterung täglich Sprungbetrieb'
      : 'Ausserhalb der Saison: trotzdem immer mit Sprungbetrieb rechnen');
    chip.title = 'Es muss immer mit Fallschirmsprungbetrieb gerechnet werden.';
  }

  var calm = F.$('[data-ab-nohazard]');
  function onWeather(w) {
    if (calm && w) calm.hidden = !!(w.westHazard || w.biseHazard || w.tailwind33);
  }
  F.listen('flubag:weather', onWeather);
  F.ready(function () { if (F.weather && F.weather.data) onWeather(F.weather.data); });
})();
