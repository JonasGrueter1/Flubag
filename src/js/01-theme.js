/* Hell / Dunkel Umschalter mit kreisförmigem Übergang.
   Standard ist hell. Ohne gespeicherte Wahl gilt die Systemeinstellung (prefers-color-scheme).
   Das Startattribut setzt schon das Inline-Skript in layout.html (ohne Aufblitzen). */
(function () {
  'use strict';
  var F = window.FLUBAG;
  var root = document.documentElement;
  var KEY = 'flubag-theme';
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function stored() {
    var t = null;
    try { t = localStorage.getItem(KEY); } catch (e) {}
    return t === 'light' || t === 'dark' ? t : null;
  }
  function current() { return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; }

  // Beschriftung der Umschalter passend zum aktuellen Modus
  function label(theme) {
    var next = theme === 'dark' ? 'hellen' : 'dunklen';
    F.$$('[data-theme-toggle]').forEach(function (btn) {
      if (!btn.querySelector('span')) { btn.setAttribute('aria-label', 'Zum ' + next + ' Modus wechseln'); btn.setAttribute('title', 'Zum ' + next + ' Modus wechseln'); }
    });
  }

  function apply(theme, save) {
    root.setAttribute('data-theme', theme);
    if (save) { try { localStorage.setItem(KEY, theme); } catch (e) {} }
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'light' ? '#f5f2eb' : '#060b16');
    label(theme);
    F.emit('flubag:theme', theme);
  }

  F.theme = {
    current: current,
    init: function () {
      label(current());
      // Systemeinstellung ändert sich (z.B. Nachtmodus am Abend): nur folgen, solange niemand selbst gewählt hat
      if (mq) {
        var onSystem = function (e) { if (!stored()) apply(e.matches ? 'dark' : 'light', false); };
        if (mq.addEventListener) mq.addEventListener('change', onSystem); else if (mq.addListener) mq.addListener(onSystem);
      }
      F.$$('[data-theme-toggle]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var next = current() === 'light' ? 'dark' : 'light';
          if (!document.startViewTransition || F.reducedMotion) { apply(next, true); return; }
          var r = btn.getBoundingClientRect();
          var x = r.left + r.width / 2, y = r.top + r.height / 2;
          var end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
          var t = document.startViewTransition(function () { apply(next, true); });
          t.ready.then(function () {
            root.animate({ clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + end + 'px at ' + x + 'px ' + y + 'px)'] },
              { duration: 650, easing: 'cubic-bezier(.16,1,.3,1)', pseudoElement: '::view-transition-new(root)' });
          }).catch(function () {});
        });
      });
    }
  };
})();
