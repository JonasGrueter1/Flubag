/* Dokumente & Newsletter: Suche, Filter nach Gruppe und Flugzeug, Treffer hervorheben.
   Die vollständige Liste steht im HTML, dieses Script blendet nur ein und aus. */
(function () {
  'use strict';
  var F = window.FLUBAG;
  var toolbar = F.$('[data-dk-toolbar]');
  if (!toolbar) return;

  var input = F.$('[data-dk-q]', toolbar);
  var subchips = F.$('[data-dk-subchips]', toolbar);
  var countEl = F.$('[data-dk-count]', toolbar);
  var empty = F.$('[data-dk-empty]');
  var groupsWrap = F.$('.dk-groups');
  var resets = F.$$('[data-dk-reset]');
  var sections = F.$$('[data-dk-sec]');
  var subsecs = F.$$('[data-dk-subsec]');
  var planes = F.$$('[data-dk-plane]');
  var GROUPS = ['alle', 'flugzeug', 'syllabus', 'familiarization', 'newsletter', 'flugplatz'];

  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  var items = F.$$('[data-dk-item]').map(function (li) {
    var t = F.$('[data-dk-title]', li);
    return { el: li, q: li.getAttribute('data-q') || '', group: li.getAttribute('data-group'), ac: li.getAttribute('data-ac') || '', title: t, text: t ? t.textContent : '' };
  });
  var total = items.length;
  var state = { q: '', group: 'alle', ac: 'alle' };

  toolbar.hidden = false;

  // Treffer im Titel markieren (Text wird immer escaped)
  function highlight(it, terms) {
    if (!it.title) return;
    if (!terms.length) { it.title.textContent = it.text; return; }
    var re = new RegExp('(' + terms.map(escRe).join('|') + ')', 'gi');
    var parts = it.text.split(re);
    if (parts.length === 1) { it.title.textContent = it.text; return; }
    it.title.innerHTML = parts.map(function (p, i) { return i % 2 ? '<mark>' + F.escape(p) + '</mark>' : F.escape(p); }).join('');
  }

  function apply(opts) {
    var terms = norm(state.q).trim().split(/\s+/).filter(Boolean);
    var rawTerms = state.q.trim().split(/\s+/).filter(Boolean);
    var perGroup = { alle: 0 }, shown = 0;
    GROUPS.forEach(function (g) { perGroup[g] = 0; });

    items.forEach(function (it) {
      var mq = terms.every(function (t) { return it.q.indexOf(t) > -1; });
      if (mq) { perGroup.alle++; perGroup[it.group] = (perGroup[it.group] || 0) + 1; }
      var mg = state.group === 'alle' || it.group === state.group;
      var ma = state.group !== 'flugzeug' || state.ac === 'alle' || it.ac === state.ac;
      var on = mq && mg && ma;
      it.el.hidden = !on;
      if (on) { shown++; highlight(it, rawTerms); }
    });

    subsecs.forEach(function (s) { s.hidden = !F.$$('[data-dk-item]', s).some(function (li) { return !li.hidden; }); });
    planes.forEach(function (p) { p.hidden = !F.$$('[data-dk-item]', p).some(function (li) { return !li.hidden; }); });
    sections.forEach(function (s) {
      var n = F.$$('[data-dk-item]', s).filter(function (li) { return !li.hidden; }).length;
      s.hidden = n === 0;
      var gn = F.$('[data-dk-gn]', s), gw = F.$('[data-dk-gw]', s);
      if (gn) gn.textContent = n;
      if (gw) gw.textContent = n === 1 ? 'Datei' : 'Dateien';
    });

    F.$$('[data-dk-group]', toolbar).forEach(function (b) {
      var g = b.getAttribute('data-dk-group');
      b.setAttribute('aria-pressed', String(g === state.group));
      var n = F.$('[data-dk-n]', b);
      if (n) n.textContent = perGroup[g] || 0;
      b.classList.toggle('is-zero', !perGroup[g]);
    });
    if (subchips) {
      subchips.hidden = state.group !== 'flugzeug';
      F.$$('[data-dk-ac]', subchips).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-dk-ac') === state.ac)); });
    }

    var filtered = !!(terms.length || state.group !== 'alle');
    if (countEl) countEl.textContent = filtered ? shown + ' von ' + total + ' Dokumenten' : total + ' Dokumente';
    resets.forEach(function (b) { b.hidden = !filtered && b.closest('[data-dk-toolbar]') !== null; });
    if (empty) empty.hidden = shown > 0;

    // URL merken, damit sich gefilterte Ansichten teilen lassen
    try {
      var p = new URLSearchParams(location.search);
      ['q', 'gruppe', 'flugzeug'].forEach(function (k) { p.delete(k); });
      if (state.q.trim()) p.set('q', state.q.trim());
      if (state.group !== 'alle') p.set('gruppe', state.group);
      if (state.group === 'flugzeug' && state.ac !== 'alle') p.set('flugzeug', state.ac);
      var qs = p.toString();
      history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
    } catch (e) { /* ohne History API */ }

    if (opts && opts.scroll) scrollToResults();
    if (F.motion && F.motion.refresh) F.motion.refresh();
  }

  // Nach einem Filterwechsel weit unten: zurück an den Anfang der Treffer
  function scrollToResults() {
    if (!groupsWrap) return;
    var bar = toolbar.getBoundingClientRect();
    var top = groupsWrap.getBoundingClientRect().top;
    var sticky = getComputedStyle(toolbar).position === 'sticky';
    var offset = sticky ? bar.bottom + 16 : 100;
    if (top < offset - 4) {
      var y = window.scrollY + top - offset;
      if (F.lenis) F.lenis.scrollTo(y, { duration: 0.8 }); else window.scrollTo({ top: y, behavior: F.reducedMotion ? 'auto' : 'smooth' });
    }
  }

  var timer = 0;
  input.addEventListener('input', function () {
    clearTimeout(timer);
    timer = setTimeout(function () { state.q = input.value; apply(); }, 90);
  });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { input.value = ''; state.q = ''; apply(); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    e.preventDefault();
    input.focus();
  });

  toolbar.addEventListener('click', function (e) {
    var g = e.target.closest('[data-dk-group]');
    if (g) {
      state.group = g.getAttribute('data-dk-group');
      if (state.group !== 'flugzeug') state.ac = 'alle';
      apply({ scroll: true });
      return;
    }
    var a = e.target.closest('[data-dk-ac]');
    if (a) { state.ac = a.getAttribute('data-dk-ac'); apply({ scroll: true }); }
  });

  resets.forEach(function (b) {
    b.addEventListener('click', function () {
      state = { q: '', group: 'alle', ac: 'alle' };
      input.value = '';
      apply({ scroll: true });
      input.focus({ preventScroll: true });
    });
  });

  // Startzustand aus der URL (z.B. dokumente.html?gruppe=newsletter&q=2024)
  try {
    var p = new URLSearchParams(location.search);
    if (p.get('q')) { state.q = p.get('q'); input.value = state.q; }
    if (GROUPS.indexOf(p.get('gruppe')) > -1) state.group = p.get('gruppe');
    if (state.group === 'flugzeug' && p.get('flugzeug') && planes.some(function (pl) { return pl.getAttribute('data-dk-plane') === p.get('flugzeug'); })) state.ac = p.get('flugzeug');
  } catch (e) { /* ignorieren */ }
  apply();
})();
