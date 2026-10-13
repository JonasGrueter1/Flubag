/* Hell / Dunkel Umschalter mit kreisförmigem Übergang */
(function () {
  'use strict';
  var F = window.FLUBAG;
  var root = document.documentElement;

  function apply(theme) {
    root.setAttribute('data-theme', theme);
    try { localStorage.setItem('flubag-theme', theme); } catch (e) {}
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'light' ? '#f5f2eb' : '#060b16');
    F.emit('flubag:theme', theme);
  }

  F.theme = {
    init: function () {
      F.$$('[data-theme-toggle]').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
          if (!document.startViewTransition || F.reducedMotion) { apply(next); return; }
          var r = btn.getBoundingClientRect();
          var x = r.left + r.width / 2, y = r.top + r.height / 2;
          var end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
          var t = document.startViewTransition(function () { apply(next); });
          t.ready.then(function () {
            root.animate({ clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + end + 'px at ' + x + 'px ' + y + 'px)'] },
              { duration: 650, easing: 'cubic-bezier(.16,1,.3,1)', pseudoElement: '::view-transition-new(root)' });
          }).catch(function () {});
        });
      });
    }
  };
})();
