/* Smooth Scrolling (Lenis) und alle Scroll-Animationen (GSAP) */
(function () {
  'use strict';
  var F = window.FLUBAG;

  // Ohne Lenis (Touch, reduzierte Bewegung): Anker nach dem Laden nachkorrigieren,
  // weil Bilder und Schriften das Layout nach dem ersten Sprung noch verschieben.
  function fixHashWithoutLenis() {
    if (location.hash.length < 2) return;
    window.addEventListener('load', function () {
      setTimeout(function () {
        var t = document.getElementById(decodeURIComponent(location.hash.slice(1)));
        var off = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
        if (t && Math.abs(t.getBoundingClientRect().top - off) > 120) t.scrollIntoView({ behavior: 'instant', block: 'start' });
      }, 80);
    });
  }

  // Ankerziel fokussieren, damit der nächste Tab-Schritt im Inhalt weitergeht (Skip-Link, Subnav)
  function focusTarget(target) {
    if (!target.matches('a[href], button, input, select, textarea, [tabindex]')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }
  // Eigene Anker (href="#...") gehören immer zur aktuellen Seite, auch mit <base href="/"> (404-Seite)
  function ownAnchor(a) { return (a.getAttribute('href') || '').charAt(0) === '#'; }

  // Ohne Lenis mit <base href="/">: "#..." Links würden sonst die Startseite laden
  function baseAnchors() {
    if (!document.querySelector('base[href]')) return;
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a || a.getAttribute('href').length < 2) return;
      var target = document.getElementById(decodeURIComponent(a.getAttribute('href').slice(1)));
      if (!target) return;
      e.preventDefault();
      location.hash = a.getAttribute('href');
      focusTarget(target);
    });
  }

  function initLenis() {
    if (F.reducedMotion || !window.Lenis || F.isTouch) { fixHashWithoutLenis(); baseAnchors(); return; }
    var lenis = new Lenis({ duration: 1.1, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true });
    F.lenis = lenis;
    if (F.hasGsap()) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(0);
    }
    // interne Anker weich anfahren
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href*="#"]');
      if (!a) return;
      var url = new URL(a.href, location.href);
      if ((!ownAnchor(a) && url.pathname !== location.pathname) || !url.hash || url.hash === '#') return;
      var target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target); // Lenis rechnet scroll-padding-top (Header, Subnav) selbst ein
      history.pushState(null, '', location.pathname + location.search + url.hash); // voller Pfad: <base> nicht beachten
      focusTarget(target);
    });
    if (location.hash) {
      var t = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (t) setTimeout(function () { lenis.scrollTo(t, { immediate: true }); }, 60);
    }
  }

  function reveals() {
    var els = F.$$('[data-reveal]');
    F.$$('[data-reveal-group]').forEach(function (g) {
      var step = parseFloat(g.getAttribute('data-reveal-group')) || 0.08;
      F.$$('[data-reveal]', g).forEach(function (el, i) { el.style.setProperty('--delay', (i * step).toFixed(2) + 's'); });
    });
    if (!('IntersectionObserver' in window)) { els.forEach(function (el) { el.classList.add('is-in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        (en.target._rv || [en.target]).forEach(function (x) { x.classList.add('is-in'); });
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    // clip-path inset(100%) macht die Schnittfläche 0: bei "clip" den Elternknoten beobachten
    els.forEach(function (el) {
      var t = el.getAttribute('data-reveal') === 'clip' && el.parentElement ? el.parentElement : el;
      (t._rv = t._rv || []).push(el);
      io.observe(t);
    });
  }

  function splitHeadings() {
    F.$$('[data-split]').forEach(function (el) {
      // Überschriften mit Link oder Button nicht zerlegen: SplitText würde den Link klonen und für Screenreader verstecken
      if (!window.SplitText || el.querySelector('a, button')) { el.classList.add('is-split'); return; }
      var split = new SplitText(el, { type: 'lines', linesClass: 'split-line', mask: 'lines' });
      el.classList.add('is-split');
      var immediate = el.hasAttribute('data-split-now');
      gsap.from(split.lines, {
        yPercent: 110, opacity: 0, duration: 1.1, ease: 'power4.out', stagger: 0.09,
        delay: parseFloat(el.getAttribute('data-split-delay') || 0),
        scrollTrigger: immediate ? null : { trigger: el, start: 'top 88%', once: true }
      });
    });
  }

  function counters() {
    F.$$('[data-count]').forEach(function (el) {
      var end = parseFloat(el.getAttribute('data-count'));
      var from = parseFloat(el.getAttribute('data-count-from') || 0);
      var dec = (el.getAttribute('data-count').split('.')[1] || '').length;
      var sep = el.hasAttribute('data-count-nosep');
      var fmt = function (v) { return sep ? v.toFixed(dec) : Number(v).toLocaleString('de-CH', { minimumFractionDigits: dec, maximumFractionDigits: dec }); };
      if (!F.hasGsap() || F.reducedMotion) { el.textContent = fmt(end); return; }
      var o = { v: from };
      el.textContent = fmt(from);
      gsap.to(o, { v: end, duration: 2.2, ease: 'power3.out', onUpdate: function () { el.textContent = fmt(o.v); }, scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });
  }

  function parallax() {
    F.$$('.page-hero__media img').forEach(function (img) {
      gsap.fromTo(img, { yPercent: -6 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: img.closest('.page-hero'), start: 'top top', end: 'bottom top', scrub: true } });
    });
    F.$$('[data-parallax]').forEach(function (el) {
      var amt = parseFloat(el.getAttribute('data-parallax')) || 0.15;
      gsap.fromTo(el, { yPercent: -amt * 50 }, { yPercent: amt * 50, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  }

  function steps() {
    F.$$('[data-steps]').forEach(function (list) {
      var items = F.$$('.step', list);
      ScrollTrigger.create({
        trigger: list, start: 'top 70%', end: 'bottom 60%', scrub: true,
        onUpdate: function (self) { list.style.setProperty('--progress', self.progress.toFixed(3)); }
      });
      items.forEach(function (it) {
        ScrollTrigger.create({ trigger: it, start: 'top 68%', onEnter: function () { it.classList.add('is-active'); }, onLeaveBack: function () { it.classList.remove('is-active'); } });
      });
    });
  }

  function hscroll() {
    F.$$('[data-hscroll]').forEach(function (sec) {
      var track = sec.querySelector('[data-hscroll-track]');
      if (!track) return;
      var mm = gsap.matchMedia();
      mm.add('(min-width: 900px)', function () {
        var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
        gsap.to(track, {
          x: function () { return -dist(); }, ease: 'none',
          scrollTrigger: { trigger: sec, start: 'top top', end: function () { return '+=' + dist(); }, pin: true, scrub: 0.6, invalidateOnRefresh: true, anticipatePin: 1,
            onToggle: function (st) { document.documentElement.classList.toggle('is-hpinned', st.isActive); } }
        });
      });
    });
  }

  function marquees() {
    F.$$('.marquee__track').forEach(function (t) {
      if (t.dataset.cloned) return;
      t.dataset.cloned = '1';
      var kids = Array.prototype.slice.call(t.children);
      kids.forEach(function (k) { var c = k.cloneNode(true); c.setAttribute('aria-hidden', 'true'); t.appendChild(c); });
    });
  }

  function pointerFx() {
    if (F.isTouch) return;
    F.$$('[data-magnetic]').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var x = e.clientX - r.left, y = e.clientY - r.top;
        el.style.setProperty('--mx', x + 'px'); el.style.setProperty('--my', y + 'px');
        if (!F.reducedMotion && window.gsap) gsap.to(el, { x: (x - r.width / 2) * 0.18, y: (y - r.height / 2) * 0.25, duration: 0.4, ease: 'power3.out' });
      });
      el.addEventListener('pointerleave', function () { if (window.gsap) gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.4)' }); });
    });
    document.addEventListener('pointermove', function (e) {
      var c = e.target.closest && e.target.closest('.card--glow');
      if (!c) return;
      var r = c.getBoundingClientRect();
      c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
    F.$$('[data-tilt]').forEach(function (el) {
      var max = parseFloat(el.getAttribute('data-tilt')) || 8;
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        if (window.gsap) gsap.to(el, { rotateY: px * max, rotateX: -py * max, transformPerspective: 900, duration: 0.5, ease: 'power2.out' });
      });
      el.addEventListener('pointerleave', function () { if (window.gsap) gsap.to(el, { rotateX: 0, rotateY: 0, duration: 0.9, ease: 'power3.out' }); });
    });
  }

  F.motion = {
    init: function () {
      marquees();
      initLenis();
      if (F.hasGsap() && !F.reducedMotion) {
        gsap.registerPlugin(ScrollTrigger);
        if (window.SplitText) gsap.registerPlugin(SplitText);
        document.documentElement.classList.add('anim-ready');
        reveals();
        var doSplit = function () { try { splitHeadings(); } catch (e) { F.$$('[data-split]').forEach(function (el) { el.classList.add('is-split'); }); } };
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(doSplit); else doSplit();
        counters();
        parallax();
        steps();
        hscroll();
        window.addEventListener('load', function () { ScrollTrigger.refresh(); });
      } else {
        F.$$('[data-split]').forEach(function (el) { el.classList.add('is-split'); });
        F.$$('[data-reveal]').forEach(function (el) { el.classList.add('is-in'); });
        counters();
        F.$$('[data-steps] .step').forEach(function (s) { s.classList.add('is-active'); });
        F.$$('[data-steps]').forEach(function (l) { l.style.setProperty('--progress', 1); });
      }
      pointerFx();
    },
    refresh: function () { if (F.hasGsap()) ScrollTrigger.refresh(); }
  };
})();
