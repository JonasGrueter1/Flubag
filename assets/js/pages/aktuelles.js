/* Aktuelles: Filter nach Kategorie (Zähler, URL-Parameter ?kategorie=...).
   Wird auch von den News-Artikeln geladen: Teilen-Knopf [data-share]. */
(function () {
  'use strict';
  var F = window.FLUBAG;

  // Teilen: Web Share API, sonst Link kopieren
  F.$$('[data-share]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var data = { title: document.title, url: location.href.split('#')[0] };
      if (navigator.share) { navigator.share(data).catch(function () {}); return; }
      var done = function () { F.toast('Link kopiert.'); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(data.url).then(done, function () { window.prompt('Link kopieren:', data.url); });
      else window.prompt('Link kopieren:', data.url);
    });
  });

  var bar = F.$('[data-news-filter]');
  var list = F.$('[data-news-list]');
  if (!bar || !list) return;
  var rows = F.$$('.news-row', list);
  var btns = F.$$('[data-filter]', bar);
  var status = F.$('[data-news-status]');
  var empty = F.$('[data-news-empty]');

  // Zähler aus den tatsächlich vorhandenen Beiträgen
  var counts = { alle: rows.length };
  rows.forEach(function (r) { var c = r.getAttribute('data-category'); counts[c] = (counts[c] || 0) + 1; });
  F.$$('[data-count-for]', bar).forEach(function (el) { el.textContent = counts[el.getAttribute('data-count-for')] || 0; });
  F.$$('[data-news-total]').forEach(function (el) { el.textContent = rows.length; });
  // Kategorien ohne Beiträge ausblenden
  btns.forEach(function (b) { var k = b.getAttribute('data-filter'); if (k !== 'alle' && !counts[k]) b.hidden = true; });

  function apply(cat, announce) {
    var shown = 0;
    btns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-filter') === cat)); });
    rows.forEach(function (r) {
      var on = cat === 'alle' || r.getAttribute('data-category') === cat;
      r.classList.toggle('is-hidden', !on);
      r.classList.remove('is-filtered-in');
      if (on) {
        shown++;
        if (announce) { r.classList.add('is-in'); void r.offsetWidth; r.classList.add('is-filtered-in'); }
      }
    });
    if (empty) empty.hidden = shown > 0;
    if (status && announce) status.textContent = shown + (shown === 1 ? ' Beitrag' : ' Beiträge') + (cat === 'alle' ? '' : ' in ' + cat);
    if (announce && F.motion && F.motion.refresh) F.motion.refresh();
  }

  bar.addEventListener('click', function (e) {
    var b = e.target.closest('[data-filter]');
    if (!b) return;
    var cat = b.getAttribute('data-filter');
    apply(cat, true);
    try {
      var url = new URL(location.href);
      if (cat === 'alle') url.searchParams.delete('kategorie'); else url.searchParams.set('kategorie', cat);
      history.replaceState(null, '', url.pathname + url.search + url.hash);
    } catch (err) { /* ohne History API */ }
  });

  var start = new URLSearchParams(location.search).get('kategorie');
  var match = start && btns.filter(function (b) { return b.getAttribute('data-filter').toLowerCase() === start.toLowerCase(); })[0];
  apply(match ? match.getAttribute('data-filter') : 'alle', false);
})();
