/* Weisung Piloten 2026: Tagesleiste mit Zeitregler, Feiertagskalender, Karte Helikopter-Radius */
(function () {
  'use strict';
  var F = window.FLUBAG;
  if (!F || !F.status) return;
  var $ = F.$, $$ = F.$$;

  var MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  var DAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  var DAYS_LONG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  var START = 420, END = 1320, SPAN = END - START;
  function pct(m) { return ((Math.min(Math.max(m, START), END) - START) / SPAN * 100); }
  function t(m) { return F.minToTime(m); }

  var now = F.zurich(new Date());
  var today = F.status.dayRules(now.y, now.m, now.d, now.wd);
  var dusk = window.SunCalc ? today.dusk : null;

  // Uhrzeiger in der Hero-Grafik
  var hand = $('.wz-deco__hand');
  if (hand) hand.style.transform = 'rotate(' + (now.minutes / 1440 * 360) + 'deg)';

  // ---------- Tagesleiste Werktag / Sonntag ----------
  var RULES = {
    werktag: { open: 480, limit: 1260, land: 1290, pause: [720, 780], circuits: 1170, label: 'Montag bis Samstag' },
    sonntag: { open: 540, limit: 1200, land: 1260, pause: [720, 840], circuits: null, label: 'Sonntag und Feiertage' }
  };

  function evaluate(key, m) {
    var r = RULES[key];
    var close = dusk != null ? Math.max(Math.min(dusk, r.limit), r.pause[1]) : r.limit;
    var pause = m >= r.pause[0] && m < r.pause[1];
    var closed = m < r.open || m >= r.land;
    var starts = !closed && !pause && m < close;
    var landOnly = !closed && !pause && m >= close;
    var head, rows = [];
    if (closed) head = ['bad', 'Geschlossen'];
    else if (pause) head = ['warn', 'Mittagspause'];
    else if (landOnly) head = ['warn', 'Nur Landungen'];
    else head = ['ok', 'Flugbetrieb'];

    if (closed) rows.push(['bad', 'Starts', m < r.open ? 'Betrieb ab ' + t(r.open) + ' Uhr' : 'Betrieb beendet']);
    else if (pause) rows.push(['warn', 'Starts', 'Keine Starts bis ' + t(r.pause[1]) + ' Uhr']);
    else if (starts) rows.push(['ok', 'Starts', 'Erlaubt bis ' + t(close) + ' Uhr' + (dusk != null && dusk < r.limit ? ' (Dämmerung)' : '')]);
    else rows.push(['bad', 'Starts', 'Keine Starts mehr' + (dusk != null && dusk < r.limit ? ' (nach der Dämmerung)' : '')]);

    if (closed) rows.push(['bad', 'Landungen', 'Keine']);
    else if (pause) rows.push(['ok', 'Landungen', 'Für Flugzeuge frei, Helikopter max. 2']);
    else rows.push([landOnly ? 'warn' : 'ok', 'Landungen', 'Erlaubt bis ' + t(r.land) + ' Uhr']);

    if (r.circuits == null) rows.push(['bad', 'Platzrunden', 'Keine Platzrunden erlaubt']);
    else if (starts && m < r.circuits) rows.push(['ok', 'Platzrunden', 'Erlaubt bis ' + t(Math.min(r.circuits, close)) + ' Uhr']);
    else if (m >= r.circuits) rows.push(['bad', 'Platzrunden', 'Nach 19:30 keine Platzrunden']);
    else rows.push(['bad', 'Platzrunden', 'Nicht möglich, keine Starts']);

    if (closed) rows.push(['bad', 'Helikopter', 'Kein Betrieb']);
    else if (m >= 1080) rows.push(['warn', 'Helikopter', 'Max. 6 Bewegungen, keine Grundschulungs- und Schnupperflüge']);
    else if (pause) rows.push(['warn', 'Helikopter', 'Keine Starts, max. 2 Landungen']);
    else rows.push(['ok', 'Helikopter', 'Gemäss Betriebszeiten']);
    return { head: head, rows: rows };
  }

  var board = $('[data-wz-board]');
  if (board) {
    var input = $('[data-wz-time]', board);
    var out = $('[data-wz-time-out]', board);
    var todayKey = today.sunday ? 'sonntag' : 'werktag';

    var duskEl = $('[data-wz-dusk]', board);
    if (duskEl) duskEl.textContent = dusk != null ? t(dusk) + ' Uhr' : 'nicht verfügbar';
    $$('[data-wz-dusk-bar]', board).forEach(function (el) {
      var limit = +el.getAttribute('data-wz-dusk-bar');
      if (dusk == null || dusk >= limit) return;
      el.style.left = pct(dusk) + '%';
      el.style.width = (pct(limit) - pct(dusk)) + '%';
      el.classList.add('is-on');
      el.title = 'Nach der Abenddämmerung (heute ' + t(dusk) + ')';
    });

    var curs = {};
    $$('[data-wz-lane]', board).forEach(function (lane) {
      var key = lane.getAttribute('data-wz-lane');
      var c = document.createElement('span');
      c.className = 'wz-cur';
      $('.wz-lane__track', lane).appendChild(c);
      curs[key] = c;
      if (key === todayKey) {
        var name = $('.wz-lane__name strong', lane);
        if (name) name.insertAdjacentHTML('beforeend', '<span class="wz-today">Heute' + (today.holiday ? ', ' + F.escape(today.holiday) : '') + '</span>');
      }
    });

    var verdicts = {};
    $$('[data-wz-verdict]', board).forEach(function (v) {
      var key = v.getAttribute('data-wz-verdict');
      verdicts[key] = v;
      v.classList.toggle('is-today', key === todayKey);
    });

    var update = function () {
      var m = +input.value;
      out.textContent = t(m) + ' Uhr';
      input.style.setProperty('--fill', ((m - START) / SPAN * 100) + '%');
      input.setAttribute('aria-valuetext', t(m) + ' Uhr');
      Object.keys(verdicts).forEach(function (key) {
        var e = evaluate(key, m);
        if (curs[key]) curs[key].style.left = pct(m) + '%';
        verdicts[key].innerHTML =
          '<h3 class="wz-verdict__title"><span>' + RULES[key].label + '</span><span class="chip chip--' + e.head[0] + '">' + e.head[1] + '</span></h3>' +
          '<ul>' + e.rows.map(function (r) {
            return '<li><span class="dot dot--' + r[0] + '"></span><b>' + r[1] + '</b><span>' + F.escape(r[2]) + '</span></li>';
          }).join('') + '</ul>';
      });
    };
    var start = Math.round(now.minutes / 15) * 15;
    input.value = Math.min(Math.max(start, START), END);
    input.addEventListener('input', update);
    update();

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (en) {
        if (en[0].isIntersecting) { board.classList.add('is-in'); io.disconnect(); }
      }, { threshold: 0.2 });
      io.observe(board);
    } else board.classList.add('is-in');
  }

  // ---------- Feiertage mit Daten ----------
  var NAMES = {
    'St. Agatha (Neudorf)': 'St. Agatha, Neudorf',
    'St. Michael (Beromünster)': 'St. Michael, Beromünster',
    'Nationalfeiertag': 'Nationalfeiertag Schweiz',
    'Eidg. Bettag': 'Eidgenössischer Bettag'
  };
  var MOVABLE = ['Karfreitag', 'Ostersonntag', 'Ostermontag', 'Auffahrt', 'Pfingstsonntag', 'Pfingstmontag', 'Fronleichnam', 'Eidg. Bettag'];
  function dayNum(y, m, d) { return Date.UTC(y, m - 1, d) / 86400000; }
  var todayNum = dayNum(now.y, now.m, now.d);

  function list(y) {
    var h = F.status.holidays(y);
    return Object.keys(h).sort().map(function (k) {
      var p = k.split('-'), yy = +p[0], mm = +p[1], dd = +p[2];
      return {
        key: k, y: yy, m: mm, d: dd, wd: new Date(Date.UTC(yy, mm - 1, dd)).getUTCDay(),
        raw: h[k].name, name: NAMES[h[k].name] || h[k].name, special: h[k].special,
        movable: MOVABLE.indexOf(h[k].name) > -1, diff: dayNum(yy, mm, dd) - todayNum
      };
    });
  }
  function fmtDate(x) { return '<b>' + DAYS[x.wd] + '</b>' + x.d + '. ' + MONTHS[x.m - 1] + ' ' + x.y; }
  function rel(diff) { return diff === 0 ? 'heute' : diff === 1 ? 'morgen' : diff < 0 ? 'vorbei' : 'in ' + diff + ' Tagen'; }

  var body = $('[data-wz-holidays]');
  var yearsEl = $('[data-wz-years]');
  var nextEl = $('[data-wz-next]');
  if (body && yearsEl) {
    var years = [now.y, now.y + 1];
    var all = list(now.y).concat(list(now.y + 1));
    var next = null;
    for (var i = 0; i < all.length; i++) { if (all[i].diff >= 0) { next = all[i]; break; } }

    if (nextEl && next) {
      nextEl.innerHTML = F.icon('calendar') + '<span>Nächster Feiertag: ' + F.escape(next.name) + ', ' + DAYS_LONG[next.wd] + ', ' + next.d + '. ' + MONTHS[next.m - 1] + ' ' + next.y + ' (' + rel(next.diff) + ')</span>' +
        '<span class="chip ' + (next.special ? 'chip--warn' : '') + '">' + (next.special ? 'Sonntagsregel plus' : 'Sonntagsregel') + '</span>';
      nextEl.hidden = false;
    }

    var render = function (y) {
      body.innerHTML = list(y).map(function (x) {
        var cls = x.diff < 0 ? 'is-past' : (next && x.key === next.key ? 'is-next' : '');
        return '<tr class="' + cls + '">' +
          '<td class="wz-date">' + fmtDate(x) + '</td>' +
          '<td class="wz-name">' + F.escape(x.name) + (x.movable ? '<span class="wz-tag">beweglich</span>' : '') + '</td>' +
          '<td>' + (x.special ? '<span class="chip chip--warn">Sonntagsregel plus</span>' : '<span class="chip">Sonntagsregel</span>') + '</td>' +
          '<td class="num">' + rel(x.diff) + '</td></tr>';
      }).join('');
    };

    yearsEl.innerHTML = years.map(function (y, k) {
      return '<label><input type="radio" name="wz-year" value="' + y + '"' + (k === 0 ? ' checked' : '') + '><span>' + y + '</span></label>';
    }).join('');
    yearsEl.addEventListener('change', function (e) { if (e.target.name === 'wz-year') render(+e.target.value); });
    render(years[0]);
  }

  // ---------- Karte: 3 km Radius Helikopter ----------
  var mapEl = $('[data-wz-map]');
  function initMap() {
    if (!mapEl || mapEl._init || !window.L) return;
    mapEl._init = true;
    var L = window.L, home = [47.19, 8.2047];
    var map = L.map(mapEl, { center: home, zoom: 12, minZoom: 9, maxZoom: 17, scrollWheelZoom: false, dragging: !F.isTouch, touchZoom: true });
    L.tileLayer('https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg', { maxNativeZoom: 18, maxZoom: 18, attribution: '© swisstopo' }).addTo(map);
    var ring = L.circle(home, { radius: 3000, color: '#e63201', weight: 2.5, dashArray: '8 6', fillColor: '#e63201', fillOpacity: 0.1 }).addTo(map);
    L.circleMarker(home, { radius: 7, color: '#fff', weight: 2, fillColor: '#e63201', fillOpacity: 1 }).addTo(map)
      .bindTooltip('LSZO', { permanent: true, direction: 'right', offset: [8, 0], className: 'wp-label' });
    map.fitBounds(ring.getBounds(), { padding: [16, 16] });
  }
  if (mapEl) {
    if ('IntersectionObserver' in window) {
      var mio = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { initMap(); mio.disconnect(); } }, { rootMargin: '300px 0px' });
      mio.observe(mapEl);
    } else initMap();
  }
})();
