/* Reporting: Filter der meldepflichtigen Ereignisse, Online-Meldung (anonym oder mit Kontakt) */
(function () {
  'use strict';
  var F = window.FLUBAG;

  // ---------- Filter nach Luftfahrzeug-Kategorie ----------
  var filter = F.$('[data-mp-filter]');
  var lists = F.$$('[data-mp-list]');
  var countEl = F.$('[data-mp-count]');
  var LABEL = { alle: 'alle Luftfahrzeuge', leicht: 'Leichtflugzeuge und Helikopter', segel: 'Segelflugzeuge', ballon: 'Ballone' };

  function applyCat(cat) {
    var total = 0;
    lists.forEach(function (l) {
      var on = cat === 'alle' || (' ' + l.getAttribute('data-mp-list') + ' ').indexOf(' ' + cat + ' ') > -1;
      l.hidden = !on;
      if (on) total += F.$$('.rp-list > li', l).length;
    });
    F.$$('[data-mp-cat]', filter).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-mp-cat') === cat)); });
    if (countEl) countEl.textContent = total + ' meldepflichtige Ereignisse für ' + LABEL[cat];
    if (F.motion && F.motion.refresh) F.motion.refresh();
  }

  if (filter && lists.length) {
    filter.hidden = false;
    filter.addEventListener('click', function (e) {
      var b = e.target.closest('[data-mp-cat]');
      if (b) applyCat(b.getAttribute('data-mp-cat'));
    });
    applyCat('alle');
  }

  // ---------- Online-Meldung ----------
  var form = F.$('.rp-form');
  if (!form) return;

  // Datum: nicht in der Zukunft
  var d = new Date(), z = F.zurich ? F.zurich(d) : null;
  var today = z ? z.y + '-' + F.pad(z.m) + '-' + F.pad(z.d) : d.toISOString().slice(0, 10);
  F.$$('input[data-rp-past]', form).forEach(function (i) { i.max = today; });

  // Anderes Luftfahrzeug: Kennzeichen-Feld zeigen
  var lfz = F.$('[data-rp-lfz]', form);
  var other = F.$('[data-rp-other]', form);
  function toggleOther() { if (other && lfz) other.hidden = lfz.value !== 'Anderes Luftfahrzeug'; }
  if (lfz) lfz.addEventListener('change', toggleOther);

  // Anzeige: anonym oder mit Kontakt
  var anon = F.$('[data-rp-anon]', form);
  var anonText = F.$('[data-rp-anon-text]', form);
  var contacts = F.$$('[data-rp-contact]', form);
  function updateAnon() {
    var named = contacts.some(function (i) { return i.value.trim() !== ''; });
    if (anon) anon.classList.toggle('is-named', named);
    if (anonText) anonText.textContent = named ? 'Meldung mit Kontakt' : 'Anonyme Meldung';
  }
  form.addEventListener('input', updateAnon);
  form.addEventListener('reset', function () { setTimeout(function () { updateAnon(); toggleOther(); }, 0); });
  F.$$('[data-form-reset]', form).forEach(function (b) { b.addEventListener('click', function () { setTimeout(function () { updateAnon(); toggleOther(); }, 0); }); });
  updateAnon();
  toggleOther();
})();
