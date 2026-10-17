/* Reporting: Suche und Filter der meldepflichtigen Ereignisse (Akkordeon), Online-Meldung (anonym oder mit Kontakt).
   Ohne JS bleibt das Akkordeon nutzbar (erste Kategorie offen), Suche und Filter blenden nur ein und aus. */
(function () {
  'use strict';
  var F = window.FLUBAG;

  function refresh() { if (F.motion && F.motion.refresh) F.motion.refresh(); }
  var refreshTimer = 0;
  function refreshSoon() { clearTimeout(refreshTimer); refreshTimer = setTimeout(refresh, 120); }

  // ---------- Meldepflichtige Ereignisse ----------
  var tools = F.$('[data-mp-tools]');
  var cats = F.$$('[data-mp-list]');
  if (tools && cats.length) (function () {
    var input = F.$('[data-mp-q]', tools);
    var countEl = F.$('[data-mp-count]', tools);
    var allBtn = F.$('[data-mp-all]', tools);
    var empty = F.$('[data-mp-empty]');
    var LABEL = { leicht: 'Leichtflugzeuge und Helikopter', segel: 'Segelflugzeuge', ballon: 'Ballone' };
    function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
    function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

    var list = cats.map(function (c) {
      var items = F.$$('.rp-list > li', c).map(function (li, i) {
        li.setAttribute('data-n', (i < 9 ? '0' : '') + (i + 1)); // Originalnummer bleibt bei gefilterter Liste erhalten
        var text = li.textContent, span = document.createElement('span');
        span.textContent = text; // eigener Textblock, damit Markierungen im Raster bleiben
        li.textContent = '';
        li.appendChild(span);
        return { el: li, box: span, text: text, q: norm(text) };
      });
      return { el: c, kinds: ' ' + c.getAttribute('data-mp-list') + ' ', n: F.$('[data-mp-n]', c), items: items };
    });
    var total = list.reduce(function (s, c) { return s + c.items.length; }, 0);
    var state = { q: '', cat: 'alle' };
    var saved = null; // Aufklapp-Zustand vor Suche oder Filter, wird danach wiederhergestellt
    var busy = false;

    tools.hidden = false;

    function mark(it, terms) {
      if (!terms.length) { it.box.textContent = it.text; return; }
      var re = new RegExp('(' + terms.map(escRe).join('|') + ')', 'gi');
      var parts = it.text.split(re);
      it.box.innerHTML = parts.map(function (p, i) { return i % 2 ? '<mark>' + F.escape(p) + '</mark>' : F.escape(p); }).join('');
    }

    function updateAllBtn() {
      if (!allBtn) return;
      var vis = list.filter(function (c) { return !c.el.hidden; });
      var allOpen = vis.length > 0 && vis.every(function (c) { return c.el.open; });
      allBtn.textContent = allOpen ? 'Alle zuklappen' : 'Alle aufklappen';
      allBtn.setAttribute('aria-expanded', String(allOpen));
      allBtn.hidden = vis.length < 2;
    }

    function apply() {
      var raw = state.q.trim();
      var terms = norm(raw).split(/\s+/).filter(Boolean);
      var rawTerms = raw.split(/\s+/).filter(Boolean);
      var active = terms.length > 0 || state.cat !== 'alle';
      if (active && !saved) saved = list.map(function (c) { return c.el.open; });

      busy = true;
      var shown = 0, shownCats = 0;
      list.forEach(function (c, k) {
        var catOn = state.cat === 'alle' || c.kinds.indexOf(' ' + state.cat + ' ') > -1;
        var n = 0;
        c.items.forEach(function (it) {
          var on = catOn && terms.every(function (t) { return it.q.indexOf(t) > -1; });
          it.el.hidden = !on;
          mark(it, on ? rawTerms : []);
          if (on) n++;
        });
        c.el.hidden = n === 0;
        if (c.n) c.n.textContent = n;
        if (n) { shown += n; shownCats++; }
        if (active) c.el.open = n > 0;
        else if (saved) c.el.open = saved[k];
      });
      if (!active) saved = null;
      busy = false;

      if (countEl) {
        var who = state.cat !== 'alle' ? ' für ' + LABEL[state.cat] : '';
        if (terms.length) countEl.textContent = (shown === 1 ? '1 Treffer' : shown + ' Treffer') + ' für «' + raw + '»' + who;
        else if (state.cat !== 'alle') countEl.textContent = shown + ' meldepflichtige Ereignisse' + who;
        else countEl.textContent = total + ' meldepflichtige Ereignisse in ' + list.length + ' Kategorien';
      }
      if (empty) empty.hidden = shown > 0;
      F.$$('[data-mp-cat]', tools).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-mp-cat') === state.cat)); });
      updateAllBtn();
      refreshSoon();
    }

    var t = 0;
    input.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { state.q = input.value; apply(); }, 90); });
    input.addEventListener('keydown', function (e) { if (e.key === 'Escape' && input.value) { input.value = ''; state.q = ''; apply(); } });
    tools.addEventListener('click', function (e) {
      var b = e.target.closest('[data-mp-cat]');
      if (b) { state.cat = b.getAttribute('data-mp-cat'); apply(); return; }
      if (e.target.closest('[data-mp-all]')) {
        var vis = list.filter(function (c) { return !c.el.hidden; });
        var open = !vis.every(function (c) { return c.el.open; });
        busy = true;
        vis.forEach(function (c) { c.el.open = open; });
        busy = false;
        updateAllBtn();
        refreshSoon();
      }
    });
    list.forEach(function (c) {
      c.el.addEventListener('toggle', function () {
        if (!busy) { updateAllBtn(); refreshSoon(); }
      });
    });
    updateAllBtn();
  })();

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
  var contactBox = F.$('[data-rp-contact-box]', form);
  function named() { return contacts.some(function (i) { return i.value.trim() !== ''; }); }
  function updateAnon() {
    var n = named();
    if (anon) anon.classList.toggle('is-named', n);
    if (anonText) anonText.textContent = n ? 'Meldung mit Kontakt' : 'Anonyme Meldung';
    if (n && contactBox) contactBox.open = true; // z.B. nach automatischem Ausfüllen
  }
  // Vor der Prüfung: Kontaktfelder mit Inhalt sichtbar machen, damit Fehlermeldungen erreichbar sind
  form.addEventListener('submit', function () { if (contactBox && named()) contactBox.open = true; }, true);
  if (contactBox) contactBox.addEventListener('toggle', refreshSoon);
  form.addEventListener('input', updateAnon);
  function afterReset() { setTimeout(function () { updateAnon(); toggleOther(); if (contactBox && !named()) contactBox.open = false; }, 0); }
  form.addEventListener('reset', afterReset);
  F.$$('[data-form-reset]', form).forEach(function (b) { b.addEventListener('click', afterReset); });
  updateAnon();
  toggleOther();
})();
