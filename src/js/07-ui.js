/* UI Bausteine: Toasts, Tabs, Lightbox, Nach-oben, Höhenmesser, Unternavigation */
(function () {
  'use strict';
  var F = window.FLUBAG;

  F.toast = function (msg, icon) {
    var region = F.$('[data-toasts]');
    if (!region) return;
    var t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg><p></p>';
    t.querySelector('p').textContent = msg;
    region.appendChild(t);
    setTimeout(function () { t.classList.add('is-leaving'); setTimeout(function () { t.remove(); }, 450); }, 4800);
  };

  function tabs() {
    F.$$('[data-tabs]').forEach(function (root) {
      var btns = F.$$('[data-tab]', root), panels = F.$$('[data-tab-panel]', root);
      function select(id, focus) {
        btns.forEach(function (b) { var on = b.getAttribute('data-tab') === id; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; if (on && focus) b.focus(); });
        panels.forEach(function (p) { p.hidden = p.getAttribute('data-tab-panel') !== id; });
        F.emit('flubag:tab', { root: root, id: id });
        if (F.motion) F.motion.refresh();
      }
      btns.forEach(function (b, i) {
        b.setAttribute('role', 'tab');
        b.addEventListener('click', function () { select(b.getAttribute('data-tab')); });
        b.addEventListener('keydown', function (e) {
          var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
          if (d) { e.preventDefault(); select(btns[(i + d + btns.length) % btns.length].getAttribute('data-tab'), true); }
        });
      });
      panels.forEach(function (p) { p.setAttribute('role', 'tabpanel'); });
      var start = btns.filter(function (b) { return b.getAttribute('aria-selected') === 'true'; })[0] || btns[0];
      if (start) select(start.getAttribute('data-tab'));
    });
  }

  function lightbox() {
    var lb = F.$('[data-lightbox]');
    if (!lb) return;
    var img = F.$('[data-lb-img]', lb), cap = F.$('[data-lb-caption]', lb), count = F.$('[data-lb-count]', lb);
    var items = [], idx = 0, lastFocus = null;
    function show(i) {
      idx = (i + items.length) % items.length;
      var a = items[idx];
      img.src = a.getAttribute('href');
      var inner = a.querySelector('img');
      img.alt = inner ? inner.alt : '';
      cap.textContent = a.getAttribute('data-caption') || (inner ? inner.alt : '');
      count.textContent = (idx + 1) + ' / ' + items.length;
      lb.classList.toggle('is-single', items.length < 2);
    }
    function open(group, i) {
      items = group; lastFocus = document.activeElement;
      lb.hidden = false; document.documentElement.style.overflow = 'hidden';
      if (F.lenis) F.lenis.stop();
      show(i);
      F.$('[data-lb-close]', lb).focus();
    }
    function close() {
      lb.hidden = true; document.documentElement.style.overflow = '';
      if (F.lenis) F.lenis.start();
      if (lastFocus) lastFocus.focus();
    }
    document.addEventListener('click', function (e) {
      var a = e.target.closest('[data-gallery] a[href]');
      if (!a) return;
      e.preventDefault();
      var group = F.$$('a[href]', a.closest('[data-gallery]'));
      open(group, group.indexOf(a));
    });
    F.$('[data-lb-close]', lb).addEventListener('click', close);
    F.$('[data-lb-prev]', lb).addEventListener('click', function () { show(idx - 1); });
    F.$('[data-lb-next]', lb).addEventListener('click', function () { show(idx + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
    document.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') show(idx + 1);
      if (e.key === 'ArrowLeft') show(idx - 1);
    });
    var sx = null;
    lb.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) { if (sx == null) return; var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1)); sx = null; });
  }

  function scrollUi() {
    var top = F.$('[data-to-top]'), alt = F.$('[data-altimeter]'), fill = F.$('[data-altimeter-fill]'), val = F.$('[data-altimeter-value]');
    var plane = alt && alt.querySelector('.altimeter__plane');
    var ticking = false;
    function update() {
      var h = document.documentElement.scrollHeight - innerHeight;
      var p = h > 0 ? Math.min(1, Math.max(0, scrollY / h)) : 0;
      if (top) top.classList.toggle('is-visible', scrollY > innerHeight * 1.2);
      if (alt) {
        alt.classList.toggle('is-visible', scrollY > 200 && h > innerHeight);
        fill.style.height = (p * 100) + '%';
        plane.style.bottom = (p * 100) + '%';
        var ft = Math.round((2146 + p * 7854) / 50) * 50;
        val.textContent = F.num(ft) + ' ft';
      }
      ticking = false;
    }
    window.addEventListener('scroll', function () { if (!ticking) { requestAnimationFrame(update); ticking = true; } }, { passive: true });
    update();
    if (top) top.addEventListener('click', function () { if (F.lenis) F.lenis.scrollTo(0, { duration: 1.6 }); else window.scrollTo({ top: 0, behavior: 'smooth' }); });
  }

  // Footer: Linkspalten unter 760 px als Akkordeon (zu), darüber immer offen und ohne Tab-Stopp auf dem Titel
  function footerAccordion() {
    var accs = F.$$('[data-footer-acc]');
    if (!accs.length || !window.matchMedia) return;
    var mq = window.matchMedia('(max-width: 760px)');
    function apply() {
      accs.forEach(function (d) {
        var sum = d.querySelector('summary');
        d.open = !mq.matches;
        if (mq.matches) sum.removeAttribute('tabindex'); else sum.setAttribute('tabindex', '-1');
      });
    }
    accs.forEach(function (d) {
      d.querySelector('summary').addEventListener('click', function (e) { if (!mq.matches) e.preventDefault(); });
    });
    apply();
    if (mq.addEventListener) mq.addEventListener('change', apply); else if (mq.addListener) mq.addListener(apply);
  }

  function subnav() {
    F.$$('[data-subnav]').forEach(function (nav) {
      var links = F.$$('a[href^="#"]', nav);
      var map = links.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });
      if (!('IntersectionObserver' in window)) return;
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          var i = map.indexOf(en.target);
          links.forEach(function (l, k) { l.classList.toggle('is-active', k === i); });
          // nur die Leiste waagrecht scrollen, nie das Fenster (scrollIntoView bricht laufendes Scrollen ab)
          var a = links[i], list = a && a.closest('.subnav__list');
          if (list && list.scrollWidth > list.clientWidth) {
            var ar = a.getBoundingClientRect(), lr = list.getBoundingClientRect();
            list.scrollBy({ left: ar.left - lr.left - (list.clientWidth - ar.width) / 2, behavior: F.reducedMotion ? 'auto' : 'smooth' });
          }
        });
      }, { rootMargin: '-35% 0px -60% 0px' });
      map.forEach(function (s) { if (s) io.observe(s); });
      // zurück im Hero: keine Sprungmarke mehr hervorheben
      var first = map.filter(Boolean)[0];
      if (first) window.addEventListener('scroll', function () {
        if (first.getBoundingClientRect().top > window.innerHeight * 0.4) links.forEach(function (l) { l.classList.remove('is-active'); });
      }, { passive: true });
    });
  }

  function copyButtons() {
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-copy]');
      if (!b) return;
      var text = b.getAttribute('data-copy');
      var manual = function () { window.prompt('Zum Kopieren markieren:', text); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { F.toast('Kopiert: ' + text); }, manual);
      else manual();
    });
  }

  // Live-Webcams: alle 60 s neu laden, bei Fehler gespeichertes Bild zeigen
  function webcams() {
    F.$$('img[data-webcam]').forEach(function (img) {
      var base = img.getAttribute('src');
      var fb = img.getAttribute('data-fallback');
      var failed = false;
      if (fb && img.parentElement) img.parentElement.style.background = 'center / cover no-repeat url("' + fb + '")';
      function fallback() {
        if (failed || (img.complete && img.naturalWidth)) return;
        failed = true;
        img.src = fb;
        var badge = img.parentElement.querySelector('.chip');
        if (badge) { badge.textContent = 'Archivbild'; badge.className = 'card__badge chip'; }
      }
      img.addEventListener('error', fallback);
      setTimeout(fallback, 9000);
      setInterval(function () { if (!failed && !document.hidden) img.src = base + (base.indexOf('?') > -1 ? '&' : '?') + 't=' + Date.now(); }, 60000);
    });
  }

  // Füllbalken für alle Schieberegler (.range nutzt var(--fill))
  function ranges() {
    function fill(r) {
      var min = parseFloat(r.min) || 0, max = parseFloat(r.max) || 100, v = parseFloat(r.value) || 0;
      r.style.setProperty('--fill', ((v - min) / ((max - min) || 1) * 100).toFixed(2) + '%');
    }
    F.$$('input[type="range"]').forEach(fill);
    document.addEventListener('input', function (e) { if (e.target.matches && e.target.matches('input[type="range"]')) fill(e.target); });
  }

  F.ui = {
    init: function () { tabs(); lightbox(); scrollUi(); subnav(); copyButtons(); webcams(); ranges(); footerAccordion(); }
  };
})();
