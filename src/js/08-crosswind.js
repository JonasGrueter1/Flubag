/* Seitenwind-Anzeige für Piste 15/33 */
(function () {
  'use strict';
  var F = window.FLUBAG;

  function svg() {
    var ticks = '', cards = '';
    for (var a = 0; a < 360; a += 10) {
      var r1 = a % 30 === 0 ? 86 : 90, rad = (a - 90) * Math.PI / 180;
      ticks += '<line class="xwind__tick" x1="' + (100 + r1 * Math.cos(rad)).toFixed(1) + '" y1="' + (100 + r1 * Math.sin(rad)).toFixed(1) + '" x2="' + (100 + 95 * Math.cos(rad)).toFixed(1) + '" y2="' + (100 + 95 * Math.sin(rad)).toFixed(1) + '"/>';
    }
    [['N', 0], ['O', 90], ['S', 180], ['W', 270]].forEach(function (c) {
      var rad = (c[1] - 90) * Math.PI / 180;
      cards += '<text class="xwind__card" x="' + (100 + 76 * Math.cos(rad)).toFixed(1) + '" y="' + (100 + 76 * Math.sin(rad)).toFixed(1) + '">' + c[0] + '</text>';
    });
    var rwy = (F.data.site && F.data.site.airfield.rwy33) || 334;
    return '<svg class="xwind__svg" viewBox="0 0 200 200" role="img" aria-label="Windrichtung relativ zur Piste 15/33">' +
      '<circle class="xwind__ring" cx="100" cy="100" r="95"/><circle class="xwind__ring" cx="100" cy="100" r="62"/>' + ticks + cards +
      '<g transform="rotate(' + rwy + ' 100 100)"><rect class="xwind__runway" x="91" y="40" width="18" height="120" rx="2"/>' +
      '<line class="xwind__runway-line" x1="100" y1="48" x2="100" y2="152"/>' +
      '<text class="xwind__rwy-label" x="100" y="150" transform="rotate(180 100 150)">33</text><text class="xwind__rwy-label" x="100" y="50">15</text></g>' +
      '<g class="xwind__arrow" data-xwind-arrow style="transform-origin:100px 100px"><path d="M100 66 L109 44 L102.5 46 L102.5 6 L97.5 6 L97.5 46 L91 44 Z"/></g>' +
      '</svg>';
  }

  function readout(label, value, cls) {
    return '<div class="readout ' + (cls || '') + '"><span class="readout__label">' + label + '</span><span class="readout__value">' + value + '</span></div>';
  }

  function render(el, w) {
    var c33 = w.rwy33, c15 = w.rwy15;
    var fmt = function (c) {
      var h = Math.round(c.head), x = Math.round(c.cross);
      return (h === 0 ? '0 kt' : Math.abs(h) + ' kt <small>' + (h > 0 ? 'Gegenw.' : 'Rückenw.') + '</small>') + ' · ' +
        (x === 0 ? '0 kt <small>quer</small>' : Math.abs(x) + ' kt <small>' + (x > 0 ? 'von rechts' : 'von links') + '</small>');
    };
    var rec = w.calm ? 'Windstill: Piste 33 primär (Starts und Landungen).' :
      (w.tailwind33 ? 'Rückenwind auf 33: kein Start auf Piste 33 nahe max. Startgewicht. Landung auf 15 prüfen.' :
        (Math.abs(c33.head) <= 1.5 ? 'Kaum Längswind auf Piste 33: Standardbetrieb auf 33.' : 'Gegenwind auf Piste 33: Standardbetrieb auf 33.'));
    var hazards = '';
    if (w.westHazard) hazards += '<p class="chip chip--warn">Starker Westwind: Turbulenzen östlich des Waldstücks beim Start 33</p>';
    if (w.biseHazard) hazards += '<p class="chip chip--warn">Bise: Turbulenzen im Endanflug 33 möglich</p>';
    el.querySelector('[data-xwind-data]').innerHTML =
      readout('Wind', w.windText) + readout('Böen', Math.round(w.gust) + ' kt') +
      readout('Piste 33', fmt(c33)) + readout('Piste 15', fmt(c15)) +
      readout('Temperatur', w.tempText) + readout('QNH', w.qnhText) +
      '<div class="xwind__rec">' + '<p class="notice ' + (w.tailwind33 || w.westHazard || w.biseHazard ? 'notice--warn' : '') + '" style="grid-template-columns:1fr">' + rec + '</p>' + (hazards ? '<div class="row mt-s">' + hazards + '</div>' : '') + '</div>';
    var arrow = el.querySelector('[data-xwind-arrow]');
    if (arrow) { arrow.style.transform = 'rotate(' + (w.calm ? 0 : w.dir) + 'deg)'; arrow.style.opacity = w.calm ? 0.3 : 1; }
  }
  function renderAll(els, w) { els.forEach(function (el) { render(el, w); }); F.liveNotes(); }

  F.crosswind = {
    init: function () {
      var els = F.$$('[data-xwind]');
      // Live-Schalter aus (F.config.live.weather = false): Widget bleibt leer und ist per data-live ausgeblendet
      if (!els.length || !F.live('weather')) return;
      els.forEach(function (el) {
        el.classList.add('xwind');
        el.innerHTML = F.liveBadge('xwind__badge') + svg() + '<div class="xwind__data" data-xwind-data><p class="muted">Winddaten werden geladen …</p></div>' + F.liveNote('xwind__note');
      });
      F.liveNotes();
      F.listen('flubag:weather', function (w) { renderAll(els, w); });
      F.listen('flubag:weather-error', function () { els.forEach(function (el) { el.querySelector('[data-xwind-data]').innerHTML = '<p class="muted">Wetterdaten sind gerade nicht erreichbar.</p>'; }); });
      if (F.weather.data) renderAll(els, F.weather.data);
    }
  };
})();
