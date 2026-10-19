/* Dokumente & Newsletter: Suche, Filter nach Gruppe und Flugzeug, Treffer hervorheben, Gruppen auf- und zuklappen.
   Die vollständige Liste steht im HTML (Gruppen und Flugzeuge als <details>, ohne JS per Klick erreichbar).
   Dieses Script blendet nur ein und aus und öffnet die passende Gruppe für Anker wie #syllabi oder #flugzeug-hb-cql. */
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
  var accs = sections.concat(planes); // alle <details>
  var GROUPS = ['alle', 'flugzeug', 'syllabus', 'familiarization', 'newsletter', 'flugplatz'];

  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function visibleItems(el) { return F.$$('[data-dk-item]', el).filter(function (li) { return !li.hidden; }).length; }
  var refreshTimer = 0;
  function refreshSoon() { clearTimeout(refreshTimer); refreshTimer = setTimeout(function () { if (F.motion && F.motion.refresh) F.motion.refresh(); }, 120); }

  var items = F.$$('[data-dk-item]').map(function (li) {
    var t = F.$('[data-dk-title]', li);
    return { el: li, q: li.getAttribute('data-q') || '', group: li.getAttribute('data-group'), ac: li.getAttribute('data-ac') || '', title: t, text: t ? t.textContent : '' };
  });
  var total = items.length;
  var state = { q: '', group: 'alle', ac: 'alle' };
  var saved = null; // Auf-/Zu-Zustand vor Suche oder Filter, wird danach wiederhergestellt

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
    var active = terms.length > 0 || state.group !== 'alle';
    if (active && !saved) saved = accs.map(function (d) { return d.open; });
    var perGroup = { alle: 0 }, shown = 0;
    GROUPS.forEach(function (g) { perGroup[g] = 0; });

    items.forEach(function (it) {
      var mq = terms.every(function (t) { return it.q.indexOf(t) > -1; });
      if (mq) { perGroup.alle++; perGroup[it.group] = (perGroup[it.group] || 0) + 1; }
      var mg = state.group === 'alle' || it.group === state.group;
      var ma = state.group !== 'flugzeug' || state.ac === 'alle' || it.ac === state.ac;
      var on = mq && mg && ma;
      it.el.hidden = !on;
      highlight(it, on ? rawTerms : []);
      if (on) shown++;
    });

    subsecs.forEach(function (s) { s.hidden = visibleItems(s) === 0; });
    planes.forEach(function (p, k) {
      var n = visibleItems(p);
      p.hidden = n === 0;
      var pn = F.$('[data-dk-pn]', p);
      if (pn) pn.textContent = n;
      // Flugzeug mit Treffern öffnen: bei Suche oder gewähltem Flugzeug, sonst Zustand des Besuchers behalten
      if (active && n && (terms.length || state.ac !== 'alle')) p.open = true;
      else if (saved) p.open = saved[sections.length + k];
    });
    sections.forEach(function (s, k) {
      var n = visibleItems(s);
      s.hidden = n === 0;
      if (active) s.open = n > 0;
      else if (saved) s.open = saved[k];
      var gn = F.$('[data-dk-gn]', s), gw = F.$('[data-dk-gw]', s);
      if (gn) gn.textContent = n;
      if (gw) gw.textContent = n === 1 ? 'Datei' : 'Dateien';
    });
    if (!active) saved = null;

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

    if (countEl) countEl.textContent = active ? shown + ' von ' + total + ' Dokumenten' : total + ' Dokumente';
    resets.forEach(function (b) { b.hidden = !active && b.closest('[data-dk-toolbar]') !== null; });
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
    refreshSoon();
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

  // Anker (#flugzeuge, #syllabi, #familiarization, #newsletter, #flugplatz, #flugzeug-<id>): passende Gruppe öffnen
  function openFor(hash) {
    var id = '';
    try { id = decodeURIComponent(String(hash || '').replace(/^#/, '')); } catch (e) { return null; }
    if (!id) return null;
    var el = document.getElementById(id);
    if (!el || (accs.indexOf(el) < 0 && !groupsWrap.contains(el))) return null;
    if (el.closest('[hidden]')) { state = { q: '', group: 'alle', ac: 'alle' }; input.value = ''; apply(); }
    for (var d = el; d && d !== groupsWrap; d = d.parentElement) if (d.tagName === 'DETAILS') d.open = true;
    refreshSoon();
    return el;
  }
  // vor dem weichen Scrollen (Lenis) öffnen, sonst stimmt die Zielposition nicht
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href*="#"]');
    if (!a) return;
    var url;
    try { url = new URL(a.href, location.href); } catch (err) { return; }
    if (url.pathname === location.pathname && url.hash) openFor(url.hash);
  }, true);
  window.addEventListener('hashchange', function () {
    var el = openFor(location.hash);
    if (el && !F.lenis) el.scrollIntoView({ block: 'start', behavior: 'auto' });
  });

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
  accs.forEach(function (d) { d.addEventListener('toggle', refreshSoon); });

  // Startzustand aus der URL (z.B. dokumente.html?gruppe=newsletter&q=2024)
  try {
    var p = new URLSearchParams(location.search);
    if (p.get('q')) { state.q = p.get('q'); input.value = state.q; }
    if (GROUPS.indexOf(p.get('gruppe')) > -1) state.group = p.get('gruppe');
    if (state.group === 'flugzeug' && p.get('flugzeug') && planes.some(function (pl) { return pl.getAttribute('data-dk-plane') === p.get('flugzeug'); })) state.ac = p.get('flugzeug');
  } catch (e) { /* ignorieren */ }
  apply();
  if (location.hash) openFor(location.hash);
})();
