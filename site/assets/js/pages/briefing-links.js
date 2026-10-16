/* Briefing Links: Suche, Schnellzugriff (Favoriten), Kurzbriefing kopieren */
(function () {
  'use strict';
  var F = window.FLUBAG;
  var KEY = 'flubag-briefing-favs';

  var items = F.$$('.bl-item');
  var groups = F.$$('[data-bl-group]');
  var input = F.$('[data-bl-filter]');
  var count = F.$('[data-bl-count]');
  var empty = F.$('[data-bl-empty]');
  var favBox = F.$('[data-bl-favbox]');
  var favList = F.$('[data-bl-favlist]');
  var copyBtn = F.$('[data-bl-copy]');
  var timeEl = F.$('[data-bl-time]');

  // Funktionen, die JS brauchen, erst jetzt zeigen
  F.$$('[data-bl-search], .bl-star').forEach(function (el) { el.hidden = false; });
  if (favBox) favBox.hidden = false;
  if (copyBtn) copyBtn.hidden = false;

  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }

  items.forEach(function (li) {
    var a = li.querySelector('[data-bl-link]');
    li._q = norm((a ? a.textContent + ' ' + (a.getAttribute('data-keywords') || '') + ' ' + a.getAttribute('href') : ''));
  });

  // ---------- Suche ----------
  function filter() {
    var terms = norm(input ? input.value : '').trim().split(/\s+/).filter(Boolean);
    var shown = 0;
    items.forEach(function (li) {
      var ok = terms.every(function (t) { return li._q.indexOf(t) > -1; });
      li.hidden = !ok;
      if (ok) shown++;
    });
    groups.forEach(function (g) { g.hidden = !F.$$('.bl-item', g).some(function (li) { return !li.hidden; }); });
    if (empty) empty.hidden = shown > 0;
    if (count) count.textContent = terms.length ? shown + ' von ' + items.length + ' Links' : items.length + ' Links in 6 Gruppen';
  }
  if (input) {
    input.addEventListener('input', filter);
    input.addEventListener('keydown', function (e) { if (e.key === 'Escape') { input.value = ''; filter(); } });
    document.addEventListener('keydown', function (e) {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      var t = e.target;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      e.preventDefault();
      input.focus();
    });
    filter();
  }
  F.$$('[data-bl-reset]').forEach(function (b) {
    b.addEventListener('click', function () { if (input) { input.value = ''; filter(); input.focus(); } });
  });

  // ---------- Schnellzugriff ----------
  var links = F.$$('[data-bl-link]');
  function getFavs() { var f = F.store.get(KEY); return Array.isArray(f) ? f.filter(function (x) { return typeof x === 'string'; }) : []; }
  function linkFor(id) { for (var i = 0; i < links.length; i++) if (links[i].getAttribute('data-bl-link') === id) return links[i]; return null; }
  function titleOf(a) {
    var t = a.querySelector('.bl-card__title, .link-tile__title, .doc__title');
    return t ? t.textContent.trim() : a.textContent.trim();
  }

  function renderFavs() {
    var favs = getFavs().filter(linkFor);
    F.$$('[data-bl-star]').forEach(function (b) {
      var on = favs.indexOf(b.getAttribute('data-bl-star')) > -1;
      b.setAttribute('aria-pressed', String(on));
    });
    if (!favList) return;
    favList.innerHTML = favs.map(function (id) {
      var a = linkFor(id), ext = a.getAttribute('target') === '_blank';
      return '<li><a class="bl-fav__link" href="' + F.escape(a.getAttribute('href')) + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' +
        '<span>' + F.escape(titleOf(a)) + '</span>' + F.icon(ext ? 'arrow-up-right' : 'arrow-right') + '</a>' +
        '<button class="bl-fav__remove" type="button" data-bl-unfav="' + F.escape(id) + '" aria-label="' + F.escape(titleOf(a)) + ' aus dem Schnellzugriff entfernen">' + F.icon('x') + '</button></li>';
    }).join('');
  }

  function toggle(id) {
    var favs = getFavs(), i = favs.indexOf(id), a = linkFor(id);
    if (i > -1) favs.splice(i, 1); else favs.push(id);
    F.store.set(KEY, favs);
    renderFavs();
    if (a) F.toast(i > -1 ? titleOf(a) + ' entfernt' : titleOf(a) + ' im Schnellzugriff');
  }

  document.addEventListener('click', function (e) {
    var star = e.target.closest('[data-bl-star]');
    if (star) { toggle(star.getAttribute('data-bl-star')); return; }
    var un = e.target.closest('[data-bl-unfav]');
    if (un) toggle(un.getAttribute('data-bl-unfav'));
  });
  renderFavs();

  // ---------- Kurzbriefing: Zeitstempel und Kopieren ----------
  function onWeather(w) {
    if (!w) return;
    document.documentElement.classList.add('is-wx-loaded');
    if (timeEl && w.time) {
      var t = String(w.time).split('T')[1];
      timeEl.textContent = t ? 'Modellstand ' + t.slice(0, 5) + ' Uhr' : '';
    }
  }
  F.listen('flubag:weather', onWeather);
  function onWeatherError() {
    if (timeEl) timeEl.textContent = 'Wetterwerte nicht verfügbar';
    var panel = F.$('.bl-panel');
    if (panel && !(F.weather && F.weather.data)) panel.classList.add('is-wx-error');
  }
  F.listen('flubag:weather-error', onWeatherError);
  F.ready(function () {
    if (F.weather && F.weather.data) return;
    var f = F.$('.bl-panel [data-wx-field]');
    if (f && f.textContent === 'nicht verfügbar') onWeatherError();
  });
  if (F.weather && F.weather.data) onWeather(F.weather.data);
  F.ready(function () { if (F.weather && F.weather.data) onWeather(F.weather.data); });

  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      var w = F.weather && F.weather.data;
      var s = F.status && F.status.at ? F.status.at(new Date()) : null;
      var lines = ['LSZO Kurzbriefing (Modelldaten, ohne Gewähr)'];
      if (s) lines.push('Platzstatus: ' + s.short);
      if (w) {
        lines.push('Wind: ' + w.windText + ' (' + w.rwyText + ')');
        lines.push('QNH: ' + w.qnhText + ' · Sicht: ' + w.visText + ' · Temperatur: ' + w.tempText);
        if (w.wx) lines.push('Wetter: ' + w.wx + ' · Wolkenbasis geschätzt: ' + w.cloudbaseText);
      } else {
        lines.push('Wetterwerte noch nicht geladen.');
      }
      lines.push('Offizielles Briefing: skybriefing.com');
      var text = lines.join('\n');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { F.toast('Kurzbriefing kopiert'); }, function () { F.toast('Kopieren nicht möglich'); });
      } else {
        F.toast('Kopieren nicht möglich');
      }
    });
  }
})();
