/* Parkordnung: Parkfeld-Check (Sprungbetrieb, Cessna C150/C152) */
(function () {
  'use strict';
  var F = window.FLUBAG;
  var root = F.$('[data-po]');
  if (!root) return;
  var grid = F.$('[data-po-grid]', root);
  var para = F.$('[data-po-para]', root);
  var summary = F.$('[data-po-summary]', root);
  var notes = F.$('[data-po-notes]', root);
  var PARA = [4, 8, 11, 14];   // während "Para-ON" aufgehoben (Zone B)
  var C150 = [1, 2];            // Cessna C150/C152: nicht auf 1 und 2
  var last = {};

  // Felder sofort anlegen, damit Animationen greifen
  var html = '';
  for (var n = 1; n <= 14; n++) html += '<div class="po-spot" data-spot="' + n + '"><span class="po-spot__num">' + n + '</span><span data-spot-icon></span></div>';
  grid.innerHTML = html;
  var spots = F.$$('[data-spot]', grid);

  function ranges(list) {
    var out = [], i = 0;
    while (i < list.length) {
      var j = i;
      while (j + 1 < list.length && list[j + 1] === list[j] + 1) j++;
      out.push(j - i >= 2 ? list[i] + ' bis ' + list[j] : (j > i ? list[i] + ', ' + list[j] : String(list[i])));
      i = j + 1;
    }
    return out.join(', ');
  }

  function update() {
    var isPara = para.checked;
    var type = (root.querySelector('input[name="po-type"]:checked') || {}).value;
    var free = [];
    spots.forEach(function (el) {
      var n = +el.getAttribute('data-spot');
      var reason = '';
      if (isPara && PARA.indexOf(n) > -1) reason = 'gesperrt bei Sprungbetrieb (Zone B)';
      else if (type === 'c150' && C150.indexOf(n) > -1) reason = 'nicht für C150/C152 (Propellerwind Richtung Restaurant)';
      var blocked = !!reason;
      if (last[n] !== undefined && last[n] !== blocked) { el.classList.remove('is-changed'); void el.offsetWidth; el.classList.add('is-changed'); }
      last[n] = blocked;
      el.classList.toggle('is-blocked', blocked);
      el.querySelector('[data-spot-icon]').innerHTML = F.icon(blocked ? 'x' : 'check');
      el.setAttribute('title', 'Feld ' + n + ': ' + (blocked ? reason : 'frei'));
      el.setAttribute('aria-label', 'Feld ' + n + ': ' + (blocked ? reason : 'frei'));
      if (!blocked) free.push(n);
    });
    summary.innerHTML = free.length + ' von 14 Feldern frei: <span class="mono">' + ranges(free) + '</span>';
    var list = [];
    if (isPara) list.push('Zone B: während Absprung keine Benutzung, Rollen ebenfalls untersagt. Keine Landungen und Starts, solange das Drehlicht eingeschaltet ist.');
    if (type === 'c150') list.push('Cessna C150/C152 Richtung Neudorf parkieren (Tankentlüftung).');
    list.push('Hartbelag vor dem Hangar nur zum Hangarieren, kein Rollen.');
    notes.innerHTML = list.map(function (t) { return '<li>' + F.icon('info') + '<span>' + F.escape(t) + '</span></li>'; }).join('');
  }
  root.addEventListener('change', update);
  update();
})();
