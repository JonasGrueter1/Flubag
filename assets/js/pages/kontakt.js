/* Kontakt: vCard, Themen-Hinweise, Thema per URL (?thema=...), Zeichenzähler */
(function () {
  'use strict';
  var F = window.FLUBAG;
  var site = (F.data && F.data.site) || {};
  var form = F.$('#kontaktformular');

  // Kopieren: [data-copy] erledigt 07-ui.js global (eigener Handler hier würde doppelt melden)

  // Kontakt als vCard speichern
  F.$$('[data-vcard]').forEach(function (b) {
    b.addEventListener('click', function () {
      var a = site.address || {}, af = site.airfield || {};
      var vcf = [
        'BEGIN:VCARD', 'VERSION:3.0',
        'FN:' + (site.name || 'FLUBAG Flugbetriebs AG'),
        'ORG:' + (site.name || 'FLUBAG Flugbetriebs AG'),
        'ADR;TYPE=WORK:;;' + (a.street || '') + ';' + (a.city || '') + ';;' + (a.zip || '') + ';Schweiz',
        'TEL;TYPE=WORK,VOICE:' + (site.phone || ''),
        site.fax ? 'TEL;TYPE=WORK,FAX:' + site.fax : '',
        'EMAIL;TYPE=WORK:' + (site.email || ''),
        'URL:' + (site.url || ''),
        af.lat ? 'GEO:' + af.lat + ';' + af.lon : '',
        'NOTE:Flugplatz Luzern-Beromünster (' + (af.icao || 'LSZO') + ')',
        'END:VCARD'
      ].filter(Boolean).join('\r\n');
      var link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob([vcf], { type: 'text/vcard;charset=utf-8' }));
      link.download = 'FLUBAG-Kontakt.vcf';
      document.body.appendChild(link);
      link.click();
      setTimeout(function () { URL.revokeObjectURL(link.href); link.remove(); }, 1000);
    });
  });

  if (!form) return;
  var select = F.$('[data-topic]', form);
  var hint = F.$('[data-topic-hint]', form);
  var msg = F.$('[data-msg]', form);
  var count = F.$('[data-msg-count]', form);

  function btn(href, label, ext) {
    return '<a class="btn btn--ghost btn--sm" href="' + href + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' + label + ' ' + F.icon(ext ? 'arrow-up-right' : 'arrow-right') + '</a>';
  }
  var HINTS = {
    'Schnupperflug': { icon: 'plane-takeoff', text: 'Für Schnupperflüge gibt es ein eigenes Formular: Flugzeug, Dauer und Wunschtermin wählst du dort in 4 Schritten.', links: [['schnupperflug.html#anfrage', 'Zum Schnupperflug-Formular']] },
    'Rundflug': { icon: 'route', text: 'Route, Termin und Anzahl Gäste wählst du am einfachsten direkt im Rundflug-Formular.', links: [['rundfluege.html#anfrage', 'Zum Rundflug-Formular']] },
    'Gutschein': { icon: 'gift', text: 'Gutscheine für Rund- und Schnupperflüge bestellst du online und druckst sie direkt zu Hause aus.', links: [['gutscheine.html', 'Gutschein gestalten'], [site.shop || '', 'Zum Shop', true]] },
    'Ausbildung': { icon: 'graduation-cap', text: 'Ablauf, Kosten und die 9 Ausbildungsschritte findest du auf der Ausbildungsseite. Persönlich beraten wir dich gerne an einem Infoabend.', links: [['ausbildung.html', 'Zur Ausbildung'], ['infoabende.html', 'Infoabende']] },
    'Infoabend': { icon: 'calendar', text: 'Für die Infoabende "Wie werde ich Pilot?" kannst du dich direkt online anmelden.', links: [['infoabende.html#anmeldung', 'Zur Anmeldung']] },
    'Hangarplatz': { icon: 'info', text: 'Wir vermieten nur Innenplätze im Hangar. Schreib uns, für welches Flugzeug du einen Platz suchst.', links: [] },
    'Flugzeugmiete/Charter': { icon: 'plane', text: 'Für Charter-, Schulungs- und Rundflüge stehen unsere Flugzeuge bereit. Mietpreise und Details zu jedem Flugzeug findest du hier:', links: [['preise.html', 'Preise'], ['flotte.html', 'Flotte'], [site.reservation || '', 'Reservation', true]] },
    'Zoll': { icon: 'triangle-alert', warn: true, text: 'Zollanmeldungen bitte nicht über dieses Formular. Das Zollformular muss 2 Stunden vor dem geplanten Start bzw. 2 Stunden vor der geplanten Landung in Beromünster komplett ausgefüllt werden. Danach ruft der Pilot persönlich unter ' + (site.phone || '') + ' an (wenn das Büro nicht besetzt ist: ' + (site.phoneMobile || '') + ').', links: [[site.customs || '', 'Zum Zollformular', true], ['zollanmeldung.html', 'Ablauf Zollanmeldung']] }
  };

  function showHint() {
    var h = HINTS[select.value];
    form.setAttribute('data-subject', 'Kontaktanfrage: ' + (select.value || 'Allgemein'));
    if (!h) { hint.hidden = true; hint.innerHTML = ''; return; }
    hint.innerHTML = '<div class="notice' + (h.warn ? ' notice--warn' : ' notice--brand') + '">' + F.icon(h.icon) +
      '<div><p>' + F.escape(h.text) + '</p>' +
      (h.links.length ? '<div class="topic-hint__links">' + h.links.filter(function (l) { return l[0]; }).map(function (l) { return btn(l[0], F.escape(l[1]), l[2]); }).join('') + '</div>' : '') +
      '</div></div>';
    hint.hidden = false;
  }
  select.addEventListener('change', showHint);

  function updateCount() { if (count) count.textContent = F.num(msg.value.length); }
  if (msg) { msg.addEventListener('input', updateCount); updateCount(); }
  form.addEventListener('reset', function () { setTimeout(function () { showHint(); updateCount(); }, 0); });

  // Thema aus der URL, tolerant: ?thema=Hangar, ?thema=gutscheine, ?thema=charter ...
  function norm(s) { return String(s || '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/[^a-z]/g, ''); }
  var ALIAS = { hangar: 'Hangarplatz', charter: 'Flugzeugmiete/Charter', miete: 'Flugzeugmiete/Charter', flugzeugmiete: 'Flugzeugmiete/Charter', zollanmeldung: 'Zoll', ppl: 'Ausbildung', lapl: 'Ausbildung', pilot: 'Ausbildung', rundfluege: 'Rundflug', gutscheine: 'Gutschein', infoabende: 'Infoabend' };
  var wanted = new URLSearchParams(location.search).get('thema');
  F.ready(function () {
    if (wanted) {
      var w = norm(wanted), opts = F.$$('option', select), match = null;
      if (ALIAS[w]) match = ALIAS[w];
      opts.forEach(function (o) { var n = norm(o.value); if (!match && (n === w || n.indexOf(w) === 0 || w.indexOf(n) === 0)) match = o.value; });
      select.value = match || 'Allgemeine Anfrage';
      if (!match) { var b = F.$('#k-betreff', form); if (b && !b.value) b.value = wanted; }
      setTimeout(function () {
        var top = F.$('#formular').getBoundingClientRect().top + window.scrollY - 90;
        if (F.lenis) F.lenis.scrollTo(top); else window.scrollTo({ top: top, behavior: F.reducedMotion ? 'auto' : 'smooth' });
      }, 350);
    }
    showHint();
  });
})();
