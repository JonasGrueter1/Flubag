/* Infoabende: Termine automatisch als "vorbei" markieren, Countdown zum nächsten Termin,
   Kalender-Datei (.ics), Datumsauswahl im Formular, Personen-Stepper und Bordkarten-Vorschau.
   Neue Termine: in infoabende.html ein weiteres <li data-ia-date="JJJJ-MM-TTTHH:MM"> eintragen.
   Vorschau mit anderem Datum (zum Testen): infoabende.html?heute=2026-03-01 */
(function () {
  'use strict';
  var F = window.FLUBAG;
  var list = F.$('[data-ia-dates]');
  if (!list) return;

  var WD = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  var WD_S = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  var pad = F.pad;
  var PAST_AFTER = 3 * 3600000; // ab drei Stunden nach Beginn gilt ein Termin als vorbei

  function parse(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(s || '');
    return m ? new Date(+m[1], +m[2] - 1, +m[3], m[4] ? +m[4] : 18, m[5] ? +m[5] : 0) : null;
  }
  function dayMonth(d) { return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.'; }
  function timeText(d) { return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function longText(d) { return WD[d.getDay()] + ', ' + dayMonth(d) + d.getFullYear() + ', ' + timeText(d) + ' Uhr'; }
  function shortText(d) { return WD_S[d.getDay()] + ' ' + dayMonth(d); }
  function sameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }

  // "Heute" (optional per URL simulierbar, damit FLUBAG neue Termine vorab prüfen kann)
  var offset = 0;
  var sim = new URLSearchParams(location.search).get('heute');
  if (sim && /^\d{4}-\d{2}-\d{2}$/.test(sim)) offset = parse(sim + 'T12:00').getTime() - Date.now();
  function now() { return new Date(Date.now() + offset); }
  var today = now();

  // ---------------------------------------------------------------- Termine
  var items = F.$$('[data-ia-date]', list)
    .map(function (el) { return { el: el, d: parse(el.getAttribute('data-ia-date')) }; })
    .filter(function (x) { return x.d; })
    .sort(function (a, b) { return a.d - b.d; });
  var future = items.filter(function (x) { return x.d.getTime() + PAST_AFTER > today.getTime(); });
  var past = items.filter(function (x) { return x.d.getTime() + PAST_AFTER <= today.getTime(); });
  var next = future[0] || null;

  // kommende Termine zuerst, darunter die vergangenen
  future.concat(past).forEach(function (x) { list.appendChild(x.el); });
  if (future.length && past.length) {
    var sep = document.createElement('li');
    sep.className = 'ia-dates__sep';
    sep.textContent = 'Vergangene Termine';
    list.insertBefore(sep, past[0].el);
  }

  function badge(x, text, cls) {
    var b = F.$('[data-ia-badge]', x.el);
    if (!b) return;
    b.textContent = text;
    b.className = 'chip ' + (cls || '');
  }
  past.forEach(function (x) {
    x.el.classList.add('is-past');
    badge(x, 'Vorbei', 'ia-badge--past');
  });
  future.forEach(function (x, i) {
    x.el.classList.add('is-upcoming');
    if (i === 0) x.el.classList.add('is-next');
    badge(x, i === 0 ? (sameDay(x.d, today) ? 'Heute' : 'Nächster Termin') : 'Anmeldung offen', i === 0 ? 'chip--brand' : 'chip--ok');
    var side = F.$('.ia-ticket__side', x.el);
    if (side) {
      var a = document.createElement('a');
      a.className = 'btn btn--primary btn--sm';
      a.href = '#anmeldung';
      a.setAttribute('data-ia-pick', x.el.getAttribute('data-ia-date'));
      a.textContent = 'Anmelden';
      side.appendChild(a);
    }
  });

  var none = F.$('[data-ia-none]');
  if (none) none.hidden = !!next;
  var chip = F.$('[data-ia-chip-text]');
  if (chip) chip.textContent = next ? 'Nächster Termin: ' + shortText(next.d) + next.d.getFullYear() : 'Die nächsten Daten folgen';

  // ---------------------------------------------------------------- Countdown + Kalender
  var cd = F.$('[data-ia-countdown]');
  if (cd && next) {
    cd.hidden = false;
    F.$('[data-ia-next-text]', cd).textContent = longText(next.d);
    var out = { d: F.$('[data-cd="d"]', cd), h: F.$('[data-cd="h"]', cd), m: F.$('[data-cd="m"]', cd), s: F.$('[data-cd="s"]', cd) };
    var label = F.$('.readout__label', cd);
    var tick = function () {
      var diff = Math.max(0, next.d.getTime() - now().getTime());
      var s = Math.floor(diff / 1000);
      out.d.textContent = pad(Math.floor(s / 86400));
      out.h.textContent = pad(Math.floor(s / 3600) % 24);
      out.m.textContent = pad(Math.floor(s / 60) % 60);
      out.s.textContent = pad(s % 60);
      if (!diff) { label.textContent = 'Der Infoabend hat begonnen'; clearInterval(timer); }
    };
    var timer = setInterval(tick, 1000);
    tick();

    F.$('[data-ia-ics]', cd).addEventListener('click', function () {
      var f = function (x) { return x.getFullYear() + pad(x.getMonth() + 1) + pad(x.getDate()) + 'T' + pad(x.getHours()) + pad(x.getMinutes()) + '00'; };
      var u = new Date();
      var stamp = u.getUTCFullYear() + pad(u.getUTCMonth() + 1) + pad(u.getUTCDate()) + 'T' + pad(u.getUTCHours()) + pad(u.getUTCMinutes()) + pad(u.getUTCSeconds()) + 'Z';
      var site = (F.data && F.data.site) || {};
      var ics = [
        'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//FLUBAG Flugbetriebs AG//Infoabend//DE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        'UID:infoabend-' + f(next.d) + '@flubag.ch',
        'DTSTAMP:' + stamp,
        'DTSTART;TZID=' + F.config.tz + ':' + f(next.d),
        'SUMMARY:Infoabend "Wie werde ich Pilot?" (FLUBAG)',
        'LOCATION:Flugplatz\\, Theorieraum AHB\\, Moos 3\\, 6025 Neudorf',
        'DESCRIPTION:Infoabend der FLUBAG Flugbetriebs AG. Auskunft: ' + (site.phone || '') + ' / ' + (site.email || ''),
        'URL:' + (site.url || 'https://www.flubag.ch') + '/infoabende.html',
        'END:VEVENT', 'END:VCALENDAR'
      ].join('\r\n');
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
      a.download = 'flubag-infoabend-' + next.el.getAttribute('data-ia-date').slice(0, 10) + '.ics';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      F.toast('Der Kalendereintrag wird heruntergeladen.');
    });
  }

  // ---------------------------------------------------------------- Formular
  var form = F.$('form[data-form-name="Infoabend-Anmeldung"]');
  if (!form) return;
  var choices = F.$('[data-ia-choices]', form);
  var tpl = F.$('template[data-ia-icon]', form);
  var iconHtml = tpl ? tpl.innerHTML : '';

  // künftige Termine als Auswahl-Karten vor "Nächster Infoabend" und "Individueller Termin"
  future.slice().reverse().forEach(function (x) {
    var label = document.createElement('label');
    label.className = 'choice';
    label.innerHTML = '<input type="radio" name="datum" required data-label="Datum">' +
      '<span class="choice__card">' + iconHtml +
      '<span class="choice__title">' + F.escape(WD[x.d.getDay()] + ', ' + dayMonth(x.d)) + '</span>' +
      '<span class="choice__meta">' + x.d.getFullYear() + ' · ' + timeText(x.d) + ' Uhr</span></span>';
    var input = label.querySelector('input');
    input.value = longText(x.d);
    input.setAttribute('data-short', shortText(x.d));
    input.setAttribute('data-iso', x.el.getAttribute('data-ia-date'));
    choices.insertBefore(label, choices.firstChild);
  });
  // Vorauswahl: nächster Termin, sonst "Nächster Infoabend"
  var first = F.$('input[name="datum"]', choices);
  if (first) { first.checked = true; first.defaultChecked = true; }

  function pick(iso) {
    var r = F.$('input[name="datum"][data-iso="' + iso + '"]', form);
    if (r) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); }
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-ia-pick]');
    if (a) pick(a.getAttribute('data-ia-pick'));
    if (e.target.closest('[data-ia-pick-next]') && next) pick(next.el.getAttribute('data-ia-date'));
  });

  // Personen-Stepper
  var persons = F.$('input[name="personen"]', form);
  F.$$('[data-ia-step]', form).forEach(function (b) {
    b.addEventListener('click', function () {
      var v = parseInt(persons.value, 10) || 1;
      persons.value = Math.min(+persons.max || 20, Math.max(+persons.min || 1, v + parseInt(b.getAttribute('data-ia-step'), 10)));
      persons.dispatchEvent(new Event('input', { bubbles: true }));
      persons.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });

  // Bordkarten-Vorschau
  var pass = {
    name: F.$('[data-pass="name"]'),
    datum: F.$('[data-pass="datum"]'),
    personen: F.$('[data-pass="personen"]')
  };
  var nameInput = F.$('input[name="name"]', form);
  function updatePass() {
    var sel = F.$('input[name="datum"]:checked', form);
    if (pass.name) pass.name.textContent = (nameInput.value || '').trim() || 'Du';
    if (pass.datum) pass.datum.textContent = sel ? sel.getAttribute('data-short') : (next ? shortText(next.d) : 'Folgt');
    if (pass.personen) pass.personen.textContent = Math.max(1, parseInt(persons.value, 10) || 1);
  }
  form.addEventListener('input', updatePass);
  form.addEventListener('change', updatePass);
  form.addEventListener('reset', function () { setTimeout(updatePass, 0); });
  updatePass();
})();
