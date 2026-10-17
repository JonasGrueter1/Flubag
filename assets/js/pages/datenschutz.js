/* Datenschutz: zeigt live, was diese Website im Browser gespeichert hat (Cookies,
   localStorage, sessionStorage) und löscht Einträge auf Wunsch. Liest nur lokal. */
(function () {
  'use strict';
  var F = window.FLUBAG;
  var panel = F.$('[data-storage-panel]');
  if (!panel) return;
  var list = F.$('[data-storage-list]', panel);
  var empty = F.$('[data-storage-empty]', panel);
  var countEl = F.$('[data-storage-count]', panel);
  var sizeEl = F.$('[data-storage-size]', panel);
  var cookieEl = F.$('[data-cookie-count]', panel);
  var btnClear = F.$('[data-storage-clear]', panel);
  var btnRefresh = F.$('[data-storage-refresh]', panel);

  var INFO = {
    'flubag-theme': 'Hell- oder Dunkelmodus',
    'flubag-gift': 'Entwurf im Gutschein-Designer',
    'flubag-briefing-favs': 'Favoriten auf der Seite Briefing Links',
    'flubag-intro': 'Intro der Startseite gesehen',
    'flubag-wx-v1': 'Wetterdaten, 10 Minuten Zwischenspeicher'
  };

  function store(type) { try { return window[type]; } catch (e) { return null; } }

  function entries() {
    var out = [];
    [['localStorage', 'dauerhaft'], ['sessionStorage', 'bis der Tab geschlossen wird']].forEach(function (t) {
      var s = store(t[0]);
      if (!s) return;
      try {
        for (var i = 0; i < s.length; i++) {
          var k = s.key(i);
          if (!k || k.indexOf('flubag') !== 0) continue;
          var v = s.getItem(k) || '';
          out.push({ type: t[0], life: t[1], key: k, bytes: (k.length + v.length) * 2 });
        }
      } catch (e) { /* blockiert */ }
    });
    return out.sort(function (a, b) { return a.key < b.key ? -1 : 1; });
  }

  function cookies() {
    try { return document.cookie ? document.cookie.split(';').filter(function (c) { return c.trim(); }).length : 0; } catch (e) { return 0; }
  }

  function size(b) { return b < 1024 ? b + ' B' : (b / 1024).toLocaleString('de-CH', { maximumFractionDigits: 1 }) + ' kB'; }

  function render() {
    var items = entries();
    var total = items.reduce(function (s, e) { return s + e.bytes; }, 0);
    countEl.textContent = items.length;
    sizeEl.textContent = size(total);
    cookieEl.textContent = cookies();
    empty.hidden = items.length > 0;
    btnClear.disabled = items.length === 0;
    list.innerHTML = items.map(function (e) {
      var info = INFO[e.key] || 'Einstellung dieser Website';
      return '<li class="storage-item" data-key="' + F.escape(e.key) + '" data-type="' + e.type + '">' +
        '<span class="storage-item__key">' + F.escape(e.key) + '</span>' +
        '<span class="storage-item__meta">' + F.escape(info) + ' · ' + e.type + ', ' + e.life + ' · ' + size(e.bytes) + '</span>' +
        '<button class="btn btn--ghost btn--sm storage-item__del" type="button" aria-label="' + F.escape(e.key) + ' löschen">' + F.icon('x') + '</button>' +
        '</li>';
    }).join('');
  }

  function remove(type, key) {
    var s = store(type);
    try { if (s) s.removeItem(key); } catch (e) { /* blockiert */ }
  }

  list.addEventListener('click', function (ev) {
    var b = ev.target.closest('.storage-item__del');
    if (!b) return;
    var li = b.closest('.storage-item');
    remove(li.getAttribute('data-type'), li.getAttribute('data-key'));
    li.classList.add('is-out');
    setTimeout(render, F.reducedMotion ? 0 : 320);
    F.toast('Eintrag gelöscht.');
  });

  btnClear.addEventListener('click', function () {
    entries().forEach(function (e) { remove(e.type, e.key); });
    F.$$('.storage-item', list).forEach(function (li) { li.classList.add('is-out'); });
    setTimeout(render, F.reducedMotion ? 0 : 320);
    F.toast('Alle Einträge dieser Website gelöscht.');
  });

  btnRefresh.addEventListener('click', render);
  window.addEventListener('storage', render);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) render(); });
  // Wetter und Theme schreiben erst nach dem Laden, deshalb später nochmals
  F.listen('flubag:weather', function () { setTimeout(render, 50); });
  F.listen('flubag:theme', function () { setTimeout(render, 50); });
  render();
})();
