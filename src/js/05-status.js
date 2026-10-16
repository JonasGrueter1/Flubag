/* Platzstatus nach "Weisung Piloten 2026": Betriebszeiten, Mittagspause,
   Sonn- und Feiertage, Abenddämmerung (berechnet mit SunCalc). Ohne Gewähr. */
(function () {
  'use strict';
  var F = window.FLUBAG;
  var LAT = 47.19, LON = 8.2047;

  function easter(y) {
    var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4,
      f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30,
      i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
      month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(Date.UTC(y, month - 1, day));
  }
  function key(y, m, d) { return y + '-' + F.pad(m) + '-' + F.pad(d); }
  function addDays(dt, n) { var x = new Date(dt.getTime()); x.setUTCDate(x.getUTCDate() + n); return key(x.getUTCFullYear(), x.getUTCMonth() + 1, x.getUTCDate()); }

  var holidayCache = {};
  function holidays(y) {
    if (holidayCache[y]) return holidayCache[y];
    var e = easter(y), h = {};
    var normal = { '01-01': 'Neujahrstag', '02-05': 'St. Agatha (Neudorf)', '08-01': 'Nationalfeiertag', '08-15': 'Maria Himmelfahrt', '09-29': 'St. Michael (Beromünster)', '11-01': 'Allerheiligen', '12-08': 'Maria Empfängnis', '12-26': 'Stephanstag' };
    Object.keys(normal).forEach(function (md) { h[y + '-' + md] = { name: normal[md], special: false }; });
    h[addDays(e, 1)] = { name: 'Ostermontag', special: false };
    h[addDays(e, 39)] = { name: 'Auffahrt', special: false };
    h[addDays(e, 50)] = { name: 'Pfingstmontag', special: false };
    h[addDays(e, 60)] = { name: 'Fronleichnam', special: false };
    h[addDays(e, -2)] = { name: 'Karfreitag', special: true };
    h[addDays(e, 0)] = { name: 'Ostersonntag', special: true };
    h[addDays(e, 49)] = { name: 'Pfingstsonntag', special: true };
    h[y + '-12-25'] = { name: 'Weihnachten', special: true };
    // Eidg. Bettag: dritter Sonntag im September
    var sept1 = new Date(Date.UTC(y, 8, 1)).getUTCDay();
    var firstSun = 1 + ((7 - sept1) % 7);
    h[key(y, 9, firstSun + 14)] = { name: 'Eidg. Bettag', special: true };
    holidayCache[y] = h;
    return h;
  }

  function duskMinutes(y, m, d) {
    if (!window.SunCalc) return 19 * 60;
    var t = SunCalc.getTimes(new Date(Date.UTC(y, m - 1, d, 11, 0)), LAT, LON);
    var z = F.zurich(t.dusk);
    return z.minutes;
  }
  function sunTimes(y, m, d) {
    if (!window.SunCalc) return null;
    var t = SunCalc.getTimes(new Date(Date.UTC(y, m - 1, d, 11, 0)), LAT, LON);
    return { sunrise: F.fmtTime(t.sunrise), sunset: F.fmtTime(t.sunset), dusk: F.fmtTime(t.dusk) };
  }

  // Regeln für einen Tag (Zürcher Datum)
  function dayRules(y, m, d, wd) {
    var hol = holidays(y)[key(y, m, d)];
    var sundayLike = wd === 0 || !!hol;
    var dusk = duskMinutes(y, m, d);
    var r = { y: y, m: m, d: d, wd: wd, holiday: hol ? hol.name : null, special: hol ? hol.special : false, sunday: sundayLike, dusk: dusk };
    if (!sundayLike) {
      r.open = 8 * 60; r.close = Math.min(dusk, 21 * 60); r.landingsUntil = 21 * 60 + 30;
      r.pause = [12 * 60, 13 * 60]; r.circuitsUntil = Math.min(19 * 60 + 30, r.close);
    } else {
      r.open = 9 * 60; r.close = Math.min(dusk, 20 * 60); r.landingsUntil = 21 * 60;
      r.pause = [12 * 60, 14 * 60]; r.circuitsUntil = null;
    }
    if (r.close < r.pause[1]) r.close = r.pause[1];
    return r;
  }

  function statusAt(now) {
    var z = F.zurich(now);
    var r = dayRules(z.y, z.m, z.d, z.wd);
    var t = z.minutes, s;
    if (t < r.open) s = { level: 'bad', title: 'Geschlossen', text: 'Flugbetrieb ab ' + F.minToTime(r.open) + ' Uhr' };
    else if (t >= r.pause[0] && t < r.pause[1]) s = { level: 'warn', title: 'Mittagspause', text: 'Keine Starts bis ' + F.minToTime(r.pause[1]) + ' Uhr, Landungen frei' };
    else if (t < r.close) s = { level: 'ok', title: 'Flugbetrieb', text: 'Starts bis ' + F.minToTime(r.close) + ' Uhr' + (r.circuitsUntil && t < r.circuitsUntil ? ', Platzrunden bis ' + F.minToTime(r.circuitsUntil) : (r.sunday ? ', keine Platzrunden' : '')) };
    else if (t < r.landingsUntil) s = { level: 'warn', title: 'Abendbetrieb', text: 'Nur noch Landungen bis ' + F.minToTime(r.landingsUntil) + ' Uhr' };
    else s = { level: 'bad', title: 'Geschlossen', text: 'Morgen wieder geöffnet' };
    s.rules = r;
    s.short = s.title + (s.level === 'ok' ? ' bis ' + F.minToTime(r.close) : '');
    return s;
  }

  var DAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  var DAYS_LONG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

  function renderInline(s) {
    F.$$('[data-airfield-status-inline]').forEach(function (el) {
      el.innerHTML = '<span class="dot dot--' + s.level + '"></span><span>' + F.escape(s.short) + '</span>';
      el.setAttribute('title', s.title + ': ' + s.text);
    });
  }

  function renderCard(s) {
    var r = s.rules, sun = sunTimes(r.y, r.m, r.d);
    F.$$('[data-airfield-status]').forEach(function (el) {
      var hours = r.sunday
        ? F.minToTime(r.open) + ' bis 12:00 und 14:00 bis ' + F.minToTime(r.close)
        : F.minToTime(r.open) + ' bis ' + F.minToTime(r.close) + ' (Pause 12 bis 13)';
      el.innerHTML =
        '<div class="status-card">' +
          '<div class="status-card__head"><span class="dot dot--' + s.level + '"></span><span class="status-card__title">' + s.title + '</span></div>' +
          '<p class="status-card__text">' + F.escape(s.text) + '</p>' +
          '<dl class="data-list status-card__list">' +
            '<div><dt>Heute (' + DAYS_LONG[r.wd] + (r.holiday ? ', ' + F.escape(r.holiday) : '') + ')</dt><dd class="mono">' + hours + '</dd></div>' +
            '<div><dt>Landungen bis</dt><dd class="mono">' + F.minToTime(r.landingsUntil) + '</dd></div>' +
            (sun ? '<div><dt>Sonnenaufgang / -untergang</dt><dd class="mono">' + sun.sunrise + ' / ' + sun.sunset + '</dd></div><div><dt>Abenddämmerung</dt><dd class="mono">' + sun.dusk + '</dd></div>' : '') +
          '</dl>' +
          (r.special ? '<p class="status-card__note">Heute sind nur Flüge von mindestens einer Stunde oder Flüge von und nach anderen Plätzen erlaubt.</p>' : '') +
          '<p class="status-card__disclaimer">Berechnet aus der Weisung Piloten 2026. Ohne Gewähr: Massgebend sind Flugplatzleitung, Pistenzustand, NOTAM und Sprungbetrieb.</p>' +
        '</div>';
    });
  }

  function renderWeek(now) {
    F.$$('[data-hours-week]').forEach(function (el) {
      el.classList.add('hours-week');
      var start = 6 * 60, end = 22 * 60, span = end - start;
      var pct = function (m) { return ((Math.min(Math.max(m, start), end) - start) / span * 100).toFixed(2) + '%'; };
      var html = '<div class="hours-axis"><span></span><span class="hours-axis__ticks"><span>06</span><span>10</span><span>14</span><span>18</span><span>22</span></span><span></span></div>';
      var zNow = F.zurich(now);
      for (var i = 0; i < 7; i++) {
        var d = new Date(now.getTime() + i * 86400000);
        var z = F.zurich(d);
        var r = dayRules(z.y, z.m, z.d, z.wd);
        var segs = [[r.open, r.pause[0]], [r.pause[1], r.close]];
        var bar = segs.map(function (sg) { return '<span class="hours-day__seg" style="left:' + pct(sg[0]) + ';width:calc(' + pct(sg[1]) + ' - ' + pct(sg[0]) + ')"></span>'; }).join('');
        if (!r.sunday) bar += '<span class="hours-day__seg hours-day__seg--pause" style="left:' + pct(r.pause[0]) + ';width:calc(' + pct(r.pause[1]) + ' - ' + pct(r.pause[0]) + ')"></span>';
        if (i === 0) bar += '<span class="hours-day__now" style="left:' + pct(zNow.minutes) + '"></span>';
        html += '<div class="hours-day' + (i === 0 ? ' is-today' : '') + '">' +
          '<span class="hours-day__name">' + (i === 0 ? 'Heute' : DAYS[z.wd] + ' ' + z.d + '.' + z.m + '.') + '</span>' +
          '<span class="hours-day__bar" title="' + (r.holiday ? F.escape(r.holiday) : DAYS_LONG[z.wd]) + '">' + bar + '</span>' +
          '<span class="hours-day__text">' + F.minToTime(r.open) + ' bis ' + F.minToTime(r.close) + (r.holiday ? ' *' : '') + '</span></div>';
      }
      el.innerHTML = html;
    });
  }

  F.status = {
    at: statusAt,
    dayRules: dayRules,
    holidays: holidays,
    sunTimes: sunTimes,
    init: function () {
      function tick() {
        var now = new Date(), s = statusAt(now);
        renderInline(s); renderCard(s); renderWeek(now);
        var sun = sunTimes(s.rules.y, s.rules.m, s.rules.d);
        if (sun) F.$$('[data-sun-field]').forEach(function (el) { el.textContent = sun[el.getAttribute('data-sun-field')] || ''; });
        F.$$('[data-sun-inline]').forEach(function (el) { el.hidden = !sun; });
        F.emit('flubag:status', s);
      }
      tick();
      setInterval(tick, 60000);
    }
  };
})();
