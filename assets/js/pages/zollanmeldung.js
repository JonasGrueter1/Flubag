/* Zollanmeldung: Zeit-Helfer (Frist 2 Stunden vorher), Hinweise zu Betriebszeiten, Kalender-Erinnerung */
(function () {
  'use strict';
  var F = window.FLUBAG;
  if (!F) return;
  var $ = F.$;
  var form = $('[data-zl-form]');
  var out = $('[data-zl-out]');
  if (!form || !out) return;

  var MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  var DAYS_LONG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  var HOUR = 3600000, MIN = 60000;
  var dateIn = form.elements.datum;
  var timeIn = form.elements.zeit;
  var dl = $('[data-zl-deadline]', out);
  var dateOut = $('[data-zl-date]', out);
  var count = $('[data-zl-count]', out);
  var hint = $('[data-zl-hint]', out);
  var icsBtn = $('[data-zl-ics]', out);
  var tLabel = $('[data-zl-time-label]', form);
  var last = null;

  // Zürcher Wanduhrzeit als "UTC-Millisekunden" rechnen (unabhängig von der Zeitzone des Geräts)
  function parts(ms) { var d = new Date(ms); return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), wd: d.getUTCDay(), h: d.getUTCHours(), min: d.getUTCMinutes() }; }
  function nowMs() { var z = F.zurich(new Date()); return Date.UTC(z.y, z.m - 1, z.d, z.h, z.min); }
  function iso(p) { return p.y + '-' + F.pad(p.m) + '-' + F.pad(p.d); }
  function hm(p) { return F.pad(p.h) + ':' + F.pad(p.min); }
  function dur(min, dativ) {
    var h = Math.floor(min / 60), m = min % 60;
    if (h >= 48) return Math.floor(h / 24) + (dativ ? ' Tagen' : ' Tage');
    return (h ? h + ' h ' : '') + m + ' min';
  }

  // Vorbelegung: heute, in etwa 3 Stunden (auf 15 Minuten gerundet)
  var startMs = Math.ceil((nowMs() + 3 * HOUR) / (15 * MIN)) * 15 * MIN;
  var start = parts(startMs);
  // Liegt der Vorschlag ausserhalb der Betriebszeit, stattdessen nächster Tag 10:00
  if (F.status && F.status.dayRules) {
    var sr = F.status.dayRules(start.y, start.m, start.d, start.wd), sm = start.h * 60 + start.min;
    if (sm < sr.open || sm >= sr.close) {
      var base = Date.UTC(start.y, start.m - 1, start.d, 10, 0);
      start = parts(sm >= sr.close ? base + 24 * HOUR : base);
    }
  }
  dateIn.value = iso(start);
  timeIn.value = hm(start);
  dateIn.min = iso(parts(nowMs()));

  function art() { var r = form.querySelector('input[name="art"]:checked'); return r ? r.value : 'abflug'; }

  function hintHtml(items) {
    var warn = items.some(function (x) { return x[0] === 'warn'; });
    hint.className = 'zl-out__hint' + (warn ? ' is-warn' : '');
    hint.innerHTML = F.icon(warn ? 'triangle-alert' : 'info') + '<div>' + items.map(function (x) { return '<p>' + (x[0] === 'warn' ? '<strong>' + F.escape(x[1]) + '</strong>' : F.escape(x[1])) + '</p>'; }).join('') + '</div>';
    hint.hidden = !items.length;
  }

  function update() {
    var a = art();
    tLabel.textContent = a === 'abflug' ? 'Geplante Abflugzeit' : 'Geplante Landezeit';
    if (!dateIn.value || !timeIn.value) {
      dl.textContent = '--:--';
      dateOut.textContent = 'Datum und Zeit eingeben';
      count.hidden = true; hint.hidden = true; icsBtn.disabled = true; last = null;
      out.classList.remove('is-late');
      return;
    }
    var dp = dateIn.value.split('-').map(Number), tp = timeIn.value.split(':').map(Number);
    var plan = Date.UTC(dp[0], dp[1] - 1, dp[2], tp[0], tp[1]);
    var dead = plan - 2 * HOUR;
    var p = parts(dead), pp = parts(plan);
    dl.textContent = hm(p);
    dateOut.textContent = DAYS_LONG[p.wd] + ', ' + p.d + '. ' + MONTHS[p.m - 1] + ' ' + p.y + (p.d !== pp.d ? ' (Vortag)' : '') + ' · ' + (a === 'abflug' ? 'Abflug' : 'Landung') + ' ' + hm(pp) + ' Uhr';

    var now = nowMs(), diff = Math.round((dead - now) / MIN);
    count.hidden = false;
    if (plan < now) {
      count.className = 'zl-out__count is-late'; count.textContent = 'Die geplante Zeit liegt in der Vergangenheit';
    } else if (diff < 0) {
      count.className = 'zl-out__count is-late'; count.textContent = 'Frist seit ' + dur(-diff, true) + ' abgelaufen. Bitte sofort anrufen.';
    } else {
      count.className = 'zl-out__count' + (diff < 30 ? ' is-soon' : ''); count.textContent = (diff === 0 ? 'Jetzt abschicken' : 'Noch ' + dur(diff) + ' bis zur Frist');
    }
    out.classList.toggle('is-late', diff < 0);

    // Hinweise aus der Weisung Piloten 2026 (ohne Gewähr)
    var items = [];
    if (F.status && F.status.dayRules) {
      var r = F.status.dayRules(pp.y, pp.m, pp.d, pp.wd), t = pp.h * 60 + pp.min;
      if (a === 'abflug') {
        if (t < r.open || t >= r.close) items.push(['warn', 'Laut Weisung Piloten 2026 sind an diesem Tag Starts nur von ' + F.minToTime(r.open) + ' bis ' + F.minToTime(r.close) + ' Uhr möglich (Abenddämmerung berechnet).']);
        else if (t >= r.pause[0] && t < r.pause[1]) items.push(['warn', 'Mittagspause: Zwischen ' + F.minToTime(r.pause[0]) + ' und ' + F.minToTime(r.pause[1]) + ' Uhr sind keine Starts erlaubt.']);
        items.push(['info', 'Ein vorzeitiger Abflug ist ausgeschlossen. Eine Verzögerung von mehr als 30 Minuten oder eine Stornierung möglichst frühzeitig melden.']);
      } else {
        if (t < r.open || t >= r.landingsUntil) items.push(['warn', 'Laut Weisung Piloten 2026 sind an diesem Tag Landungen von ' + F.minToTime(r.open) + ' bis ' + F.minToTime(r.landingsUntil) + ' Uhr möglich.']);
        items.push(['info', 'Bei vorzeitiger Landung Gepäck vorerst im Flugzeug lassen und direkt ins C-Büro gehen. Eine Verzögerung von mehr als 30 Minuten möglichst frühzeitig melden.']);
      }
      if (r.holiday) items.push([r.special ? 'warn' : 'info', r.holiday + ': Es gelten die Bestimmungen für Sonntage' + (r.special ? ', zusätzlich nur Flüge von mindestens einer Stunde oder von und nach andern Plätzen.' : '.')]);
      else if (pp.wd === 0) items.push(['info', 'Sonntag: Es gelten die Betriebszeiten für Sonntage.']);
    }
    hintHtml(items);
    icsBtn.disabled = plan < now;
    last = { a: a, plan: plan, dead: dead };
  }

  function icsText(s) { return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n'); }
  function icsDate(ms) { var p = parts(ms); return p.y + F.pad(p.m) + F.pad(p.d) + 'T' + F.pad(p.h) + F.pad(p.min) + '00'; }
  icsBtn.addEventListener('click', function () {
    if (!last) return;
    var s = F.data.site || {};
    var what = last.a === 'abflug' ? 'Abflug' : 'Landung';
    var desc = 'Geplant: ' + what + ' Beromünster ' + hm(parts(last.plan)) + ' Uhr\n' +
      'Zollformular: ' + (s.customs || 'https://customsmanager.ch/lszo') + '\n' +
      'Direkt anschliessend anrufen: +41 41 930 18 66 (wenn Büro nicht besetzt +41 79 325 41 29)';
    var lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//FLUBAG//Zollanmeldung//DE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:zoll-' + last.plan + '-' + Date.now() + '@flubag.ch',
      'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''),
      'DTSTART;TZID=Europe/Zurich:' + icsDate(last.dead - 30 * MIN),
      'DTEND;TZID=Europe/Zurich:' + icsDate(last.dead),
      'SUMMARY:' + icsText('Zollanmeldung LSZO abschicken (Frist ' + hm(parts(last.dead)) + ')'),
      'DESCRIPTION:' + icsText(desc),
      'URL:' + (s.customs || 'https://customsmanager.ch/lszo'),
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsText('Zollanmeldung LSZO abschicken'), 'TRIGGER:-PT15M', 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'
    ];
    var blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'zollanmeldung-lszo.ics';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    if (F.toast) F.toast('Kalender-Erinnerung erstellt');
  });

  form.addEventListener('input', update);
  form.addEventListener('change', update);
  form.addEventListener('submit', function (e) { e.preventDefault(); });
  update();
  setInterval(update, 30000);
})();
