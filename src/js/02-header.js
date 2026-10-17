/* Header: Scroll-Verhalten, Mega-Menüs, Mobile-Menü */
(function () {
  'use strict';
  var F = window.FLUBAG;

  F.header = {
    init: function () {
      var header = F.$('[data-header]');
      if (!header) return;
      var lastY = window.scrollY, ticking = false;
      if (F.$('.hero, .page-hero')) document.body.classList.add('has-hero');

      function onScroll() {
        var y = window.scrollY;
        header.classList.toggle('is-scrolled', y > 40);
        var menuOpen = header.classList.contains('menu-open') || F.$('.mainnav__item.is-open');
        if (!menuOpen) header.classList.toggle('is-hidden', y > 320 && y > lastY + 2);
        if (y < lastY - 2) header.classList.remove('is-hidden');
        lastY = y;
        ticking = false;
      }
      window.addEventListener('scroll', function () { if (!ticking) { requestAnimationFrame(onScroll); ticking = true; } }, { passive: true });
      onScroll();

      // Mega-Menüs (Desktop)
      var items = F.$$('.mainnav__item.has-menu');
      var closeTimer;
      function closeAll(except) {
        items.forEach(function (it) {
          if (it === except) return;
          it.classList.remove('is-open');
          var b = it.querySelector('.mainnav__trigger');
          if (b) b.setAttribute('aria-expanded', 'false');
        });
      }
      function open(it) {
        closeAll(it);
        it.classList.add('is-open');
        it.querySelector('.mainnav__trigger').setAttribute('aria-expanded', 'true');
      }
      items.forEach(function (it) {
        var btn = it.querySelector('.mainnav__trigger');
        btn.addEventListener('click', function () {
          if (it.classList.contains('is-open')) closeAll(); else open(it);
        });
        if (!F.isTouch) {
          it.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { clearTimeout(closeTimer); open(it); } });
          it.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { closeTimer = setTimeout(function () { it.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); }, 180); } });
        }
        it.addEventListener('focusout', function (e) { if (!it.contains(e.relatedTarget)) { it.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); } });
      });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeAll(); if (header.classList.contains('menu-open')) toggleMobile(false); } });
      document.addEventListener('click', function (e) { if (!e.target.closest('.mainnav')) closeAll(); });

      // Mobile-Menü
      var burger = F.$('[data-menu-toggle]');
      var menu = F.$('[data-mobile-menu]');
      function toggleMobile(force) {
        var openIt = force != null ? force : menu.hidden;
        menu.hidden = !openIt;
        header.classList.toggle('menu-open', openIt);
        burger.setAttribute('aria-expanded', String(openIt));
        burger.setAttribute('aria-label', openIt ? 'Menü schliessen' : 'Menü öffnen');
        document.documentElement.style.overflow = openIt ? 'hidden' : '';
        // Seite hinter dem Menü für Tastatur und Screenreader sperren, Fokus ins Menü und beim Schliessen zurück zum Burger
        F.$$('body > *').forEach(function (el) { if (el !== header && el !== menu && el.tagName !== 'SCRIPT') el.inert = openIt; });
        if (openIt) { var first = menu.querySelector('summary, a'); if (first) first.focus({ preventScroll: true }); }
        else if (menu.contains(document.activeElement) || document.activeElement === document.body) burger.focus({ preventScroll: true });
        if (F.lenis) { openIt ? F.lenis.stop() : F.lenis.start(); }
        if (openIt && F.hasGsap() && !F.reducedMotion) {
          gsap.fromTo(menu.querySelector('.mobile-menu__bg'), { opacity: 0 }, { opacity: 1, duration: 0.35 });
          gsap.fromTo(menu.querySelectorAll('.mm-group, .mm-link, .mobile-menu__foot, .mobile-menu__status'), { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.05, ease: 'power3.out' });
        }
      }
      if (burger && menu) {
        burger.addEventListener('click', function () { toggleMobile(); });
        F.$$('a', menu).forEach(function (a) { a.addEventListener('click', function () { toggleMobile(false); }); });
        F.$$('.mm-group[data-current]', menu).forEach(function (d) { d.open = true; });
        window.addEventListener('resize', function () { if (window.innerWidth > 1240 && !menu.hidden) toggleMobile(false); });
      }
    }
  };
})();
