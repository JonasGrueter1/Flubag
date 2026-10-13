/* 00-core.js */
/* FLUBAG Kern: Namespace, Konfiguration, Hilfsfunktionen */
(function () {
  'use strict';
  var F = (window.FLUBAG = window.FLUBAG || {});

  // ------------------------------------------------------------------
  // KONFIGURATION: hier stellt FLUBAG ein, wohin Formulare gesendet werden.
  //   mode "auto":      zuerst an endpoint senden, sonst E-Mail-Programm öffnen
  //   mode "mailto":    immer das E-Mail-Programm öffnen
  //   endpoint:         "api/send.php" (liegt bei, braucht PHP Hosting)
  //                     oder z.B. eine Formspree URL "https://formspree.io/f/xxxx"
  // ------------------------------------------------------------------
  F.config = {
    form: {
      mode: 'auto',
      endpoint: 'api/send.php',
      email: 'flubag@flubag.ch'
    },
    weather: { lat: 47.19, lon: 8.2047, cacheMinutes: 10 },
    tz: 'Europe/Zurich'
  };

  F.data = window.FLUBAG_DATA || {};
  F.$ = function (sel, root) { return (root || document).querySelector(sel); };
  F.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  F.on = function (el, ev, fn, opt) { if (el) el.addEventListener(ev, fn, opt); };
  F.emit = function (name, detail) { document.dispatchEvent(new CustomEvent(name, { detail: detail })); };
  F.listen = function (name, fn) { document.addEventListener(name, function (e) { fn(e.detail); }); };
  F.reducedMotion = document.documentElement.classList.contains('reduced-motion');
  F.isTouch = window.matchMedia('(hover: none)').matches;
  F.hasGsap = function () { return !!(window.gsap && window.ScrollTrigger); };

  F.store = {
    get: function (k, session) { try { return JSON.parse((session ? sessionStorage : localStorage).getItem(k)); } catch (e) { return null; } },
    set: function (k, v, session) { try { (session ? sessionStorage : localStorage).setItem(k, JSON.stringify(v)); } catch (e) { /* privat / blockiert */ } }
  };

  F.chf = function (n, decimals) {
    var d = decimals == null ? (n % 1 ? 2 : 0) : decimals;
    return 'CHF ' + Number(n).toLocaleString('de-CH', { minimumFractionDigits: d, maximumFractionDigits: d });
  };
  F.num = function (n, d) { return Number(n).toLocaleString('de-CH', { maximumFractionDigits: d || 0 }); };
  F.pad = function (n) { return (n < 10 ? '0' : '') + n; };
  F.icon = function (name) {
    var tpl = document.getElementById('icon-' + name);
    return tpl ? tpl.innerHTML : '';
  };
  F.escape = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  };

  // Uhrzeit in Zürich (unabhängig von der Zeitzone des Besuchers)
  F.zurich = function (date) {
    var d = date || new Date();
    var parts = new Intl.DateTimeFormat('de-CH', { timeZone: F.config.tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23' }).formatToParts(d);
    var o = {};
    parts.forEach(function (p) { o[p.type] = p.value; });
    var wd = { 'So': 0, 'Mo': 1, 'Di': 2, 'Mi': 3, 'Do': 4, 'Fr': 5, 'Sa': 6 }[(o.weekday || '').replace('.', '')];
    return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour, min: +o.minute, wd: wd, minutes: +o.hour * 60 + +o.minute };
  };
  F.fmtTime = function (date) {
    return new Intl.DateTimeFormat('de-CH', { timeZone: F.config.tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);
  };
  F.minToTime = function (m) { m = Math.round(m); return F.pad(Math.floor(m / 60) % 24) + ':' + F.pad(m % 60); };

  // F.ready(fn): läuft, sobald alle Module gestartet sind (auch wenn später registriert)
  var readyFns = [], booted = false;
  F.ready = function (fn) { if (booted) { try { fn(); } catch (e) { console.error(e); } } else readyFns.push(fn); };
  F._runReady = function () { booted = true; readyFns.forEach(function (fn) { try { fn(); } catch (e) { console.error(e); } }); };
})();

;
/* 01-theme.js */
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

;
/* 02-header.js */
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
        if (F.lenis) { openIt ? F.lenis.stop() : F.lenis.start(); }
        if (openIt && F.hasGsap() && !F.reducedMotion) {
          gsap.fromTo(menu.querySelector('.mobile-menu__bg'), { opacity: 0 }, { opacity: 0.98, duration: 0.35 });
          gsap.fromTo(menu.querySelectorAll('.mm-group, .mm-link, .mobile-menu__foot, .mobile-menu__status'), { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.05, ease: 'power3.out' });
        }
      }
      if (burger && menu) {
        burger.addEventListener('click', function () { toggleMobile(); });
        F.$$('a', menu).forEach(function (a) { a.addEventListener('click', function () { toggleMobile(false); }); });
        F.$$('.mm-group[data-current]', menu).forEach(function (d) { d.open = true; });
        window.addEventListener('resize', function () { if (window.innerWidth > 1180 && !menu.hidden) toggleMobile(false); });
      }
    }
  };
})();

;
/* 03-motion.js */
/* Smooth Scrolling (Lenis) und alle Scroll-Animationen (GSAP) */
(function () {
  'use strict';
  var F = window.FLUBAG;

  function initLenis() {
    if (F.reducedMotion || !window.Lenis || F.isTouch) return;
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
      if (url.pathname !== location.pathname || !url.hash || url.hash === '#') return;
      var target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -90 });
      history.pushState(null, '', url.hash);
    });
    if (location.hash) {
      var t = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (t) setTimeout(function () { lenis.scrollTo(t, { offset: -90, immediate: true }); }, 60);
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
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach(function (el) { io.observe(el); });
  }

  function splitHeadings() {
    F.$$('[data-split]').forEach(function (el) {
      if (!window.SplitText) { el.classList.add('is-split'); return; }
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
          scrollTrigger: { trigger: sec, start: 'top top', end: function () { return '+=' + dist(); }, pin: true, scrub: 0.6, invalidateOnRefresh: true, anticipatePin: 1 }
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
        if (window.MotionPathPlugin) gsap.registerPlugin(MotionPathPlugin);
        if (window.ScrollToPlugin) gsap.registerPlugin(ScrollToPlugin);
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
        counters();
        F.$$('[data-steps] .step').forEach(function (s) { s.classList.add('is-active'); });
        F.$$('[data-steps]').forEach(function (l) { l.style.setProperty('--progress', 1); });
      }
      pointerFx();
    },
    refresh: function () { if (F.hasGsap()) ScrollTrigger.refresh(); }
  };
})();

;
/* 04-weather.js */
/* Live Wetter für LSZO (Open-Meteo, ohne API Key) */
(function () {
  'use strict';
  var F = window.FLUBAG;
  var KEY = 'flubag-wx-v1';
  var WMO = {
    0: 'Klar', 1: 'Überwiegend klar', 2: 'Teilweise bewölkt', 3: 'Bedeckt', 45: 'Nebel', 48: 'Nebel mit Reif',
    51: 'Leichter Niesel', 53: 'Niesel', 55: 'Starker Niesel', 56: 'Gefrierender Niesel', 57: 'Gefrierender Niesel',
    61: 'Leichter Regen', 63: 'Regen', 65: 'Starker Regen', 66: 'Gefrierender Regen', 67: 'Gefrierender Regen',
    71: 'Leichter Schneefall', 73: 'Schneefall', 75: 'Starker Schneefall', 77: 'Schneegriesel',
    80: 'Regenschauer', 81: 'Regenschauer', 82: 'Starke Regenschauer', 85: 'Schneeschauer', 86: 'Schneeschauer',
    95: 'Gewitter', 96: 'Gewitter mit Hagel', 99: 'Gewitter mit Hagel'
  };

  function dirName(deg) {
    var n = ['N', 'NNO', 'NO', 'ONO', 'O', 'OSO', 'SO', 'SSO', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return n[Math.round(deg / 22.5) % 16];
  }

  // Gegen- und Seitenwind für eine Piste (rwyHeading in Grad)
  function components(windDir, speed, rwyHeading) {
    var a = (windDir - rwyHeading) * Math.PI / 180;
    return { head: speed * Math.cos(a), cross: speed * Math.sin(a) };
  }

  function enrich(raw) {
    var c = raw.current;
    var site = (F.data.site && F.data.site.airfield) || { rwy33: 334, rwy15: 154 };
    var w = {
      time: c.time, temp: c.temperature_2m, dew: c.dew_point_2m, rh: c.relative_humidity_2m,
      dir: c.wind_direction_10m, speed: c.wind_speed_10m, gust: c.wind_gusts_10m,
      cloud: c.cloud_cover, code: c.weather_code, vis: c.visibility, qnh: c.pressure_msl, precip: c.precipitation, isDay: c.is_day,
      sunrise: raw.daily && raw.daily.sunrise && raw.daily.sunrise[0], sunset: raw.daily && raw.daily.sunset && raw.daily.sunset[0]
    };
    w.wx = WMO[w.code] || '';
    w.calm = w.speed < 2;
    w.dirName = dirName(w.dir);
    w.windText = w.calm ? 'Windstill' : F.pad3(Math.round(w.dir / 10) * 10) + '°/' + F.pad(Math.round(w.speed)) + ' kt' + (w.gust - w.speed >= 8 ? ' G' + Math.round(w.gust) : '');
    w.tempText = Math.round(w.temp) + ' °C';
    w.qnhText = Math.round(w.qnh) + ' hPa';
    w.visText = w.vis == null ? '--' : (w.vis >= 10000 ? '10 km +' : (w.vis / 1000).toFixed(1).replace('.0', '') + ' km');
    w.cloudText = w.cloud + ' %';
    // Wolkenuntergrenze grob geschätzt (Spread x 400 ft)
    if (w.dew != null) w.cloudbaseFt = Math.max(0, Math.round(((w.temp - w.dew) * 400) / 100) * 100);
    w.cloudbaseText = w.cloudbaseFt != null ? 'ca. ' + F.num(w.cloudbaseFt) + ' ft AGL' : '--';
    w.rwy33 = components(w.dir, w.speed, site.rwy33);
    w.rwy15 = components(w.dir, w.speed, site.rwy15);
    var best = w.rwy33.head >= -2 ? 33 : 15;
    w.bestRwy = best;
    var comp = best === 33 ? w.rwy33 : w.rwy15;
    w.rwyText = w.calm ? 'Windstill, Piste 33 primär' : 'Piste ' + best + ': ' + Math.abs(Math.round(comp.head)) + ' kt ' + (comp.head >= 0 ? 'Gegenwind' : 'Rückenwind') + ', ' + Math.abs(Math.round(comp.cross)) + ' kt Seitenwind';
    w.tailwind33 = w.rwy33.head < -1;
    w.westHazard = !w.calm && w.dir >= 230 && w.dir <= 310 && (w.speed >= 12 || w.gust >= 20);
    w.biseHazard = !w.calm && w.dir >= 20 && w.dir <= 100 && (w.speed >= 10 || w.gust >= 18);
    return w;
  }
  F.pad3 = function (n) { n = ((n % 360) + 360) % 360; if (n === 0) n = 360; return (n < 10 ? '00' : n < 100 ? '0' : '') + n; };

  function fill(w) {
    F.$$('[data-wx-field]').forEach(function (el) {
      var k = el.getAttribute('data-wx-field');
      if (w[k] != null) el.textContent = w[k];
    });
    F.$$('[data-wx]').forEach(function (el) { el.hidden = false; el.classList.add('is-loaded'); });
    F.$$('[data-wx-arrow]').forEach(function (el) { el.style.transform = 'rotate(' + w.dir + 'deg)'; });
    F.$$('[data-wx-hazard]').forEach(function (el) {
      var t = el.getAttribute('data-wx-hazard');
      el.hidden = !((t === 'west' && w.westHazard) || (t === 'bise' && w.biseHazard) || (t === 'tail33' && w.tailwind33));
    });
  }

  F.weather = {
    data: null,
    components: components,
    load: function () {
      var cached = F.store.get(KEY, true);
      if (cached && Date.now() - cached.t < F.config.weather.cacheMinutes * 60000) { this.set(cached.raw); return; }
      var c = F.config.weather;
      var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + c.lat + '&longitude=' + c.lon +
        '&current=temperature_2m,relative_humidity_2m,dew_point_2m,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m,visibility,is_day' +
        '&daily=sunrise,sunset&wind_speed_unit=kn&timezone=Europe%2FZurich&forecast_days=1';
      var self = this;
      var get = function () { return fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); };
      get().catch(function () { return new Promise(function (res) { setTimeout(res, 2500); }).then(get); })
        .then(function (raw) { F.store.set(KEY, { t: Date.now(), raw: raw }, true); self.set(raw); })
        .catch(function () {
          F.$$('[data-wx-field]').forEach(function (el) { if (el.textContent === '--') el.textContent = 'nicht verfügbar'; });
          F.emit('flubag:weather-error');
        });
    },
    set: function (raw) {
      try { this.data = enrich(raw); } catch (e) { return; }
      fill(this.data);
      F.emit('flubag:weather', this.data);
    }
  };
})();

;
/* 05-status.js */
/* Platzstatus nach "Weisung Piloten 2026": Betriebszeiten, Mittagspause,
   Sonn- und Feiertage, Abenddämmerung (berechnet mit SunCalc). Ohne Gewähr. */
(function () {
  'use strict';
  var F = window.FLUBAG;
  var LAT = 47.19, LON = 8.2047;

  function easter(y) {
    var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4,
      f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30,
      i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
      month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(Date.UTC(y, month - 1, day));
  }
  function key(y, m, d) { return y + '-' + F.pad(m) + '-' + F.pad(d); }
  function addDays(dt, n) { var x = new Date(dt.getTime()); x.setUTCDate(x.getUTCDate() + n); return key(x.getUTCFullYear(), x.getUTCMonth() + 1, x.getUTCDate()); }

  var holidayCache = {};
  function holidays(y) {
    if (holidayCache[y]) return holidayCache[y];
    var e = easter(y), h = {};
    var normal = { '01-01': 'Neujahrstag', '02-05': 'St. Agatha (Neudorf)', '08-01': 'Nationalfeiertag', '08-15': 'Maria Himmelfahrt', '09-29': 'St. Michael (Beromünster)', '11-01': 'Allerheiligen', '12-08': 'Maria Empfängnis', '12-26': 'Stephanstag' };
    Object.keys(normal).forEach(function (md) { h[y + '-' + md] = { name: normal[md], special: false }; });
    h[addDays(e, 1)] = { name: 'Ostermontag', special: false };
    h[addDays(e, 39)] = { name: 'Auffahrt', special: false };
    h[addDays(e, 50)] = { name: 'Pfingstmontag', special: false };
    h[addDays(e, 60)] = { name: 'Fronleichnam', special: false };
    h[addDays(e, -2)] = { name: 'Karfreitag', special: true };
    h[addDays(e, 0)] = { name: 'Ostersonntag', special: true };
    h[addDays(e, 49)] = { name: 'Pfingstsonntag', special: true };
    h[y + '-12-25'] = { name: 'Weihnachten', special: true };
    // Eidg. Bettag: dritter Sonntag im September
    var sept1 = new Date(Date.UTC(y, 8, 1)).getUTCDay();
    var firstSun = 1 + ((7 - sept1) % 7);
    h[key(y, 9, firstSun + 14)] = { name: 'Eidg. Bettag', special: true };
    holidayCache[y] = h;
    return h;
  }

  function duskMinutes(y, m, d) {
    if (!window.SunCalc) return 19 * 60;
    var t = SunCalc.getTimes(new Date(Date.UTC(y, m - 1, d, 11, 0)), LAT, LON);
    var z = F.zurich(t.dusk);
    return z.minutes;
  }
  function sunTimes(y, m, d) {
    if (!window.SunCalc) return null;
    var t = SunCalc.getTimes(new Date(Date.UTC(y, m - 1, d, 11, 0)), LAT, LON);
    return { sunrise: F.fmtTime(t.sunrise), sunset: F.fmtTime(t.sunset), dusk: F.fmtTime(t.dusk) };
  }

  // Regeln für einen Tag (Zürcher Datum)
  function dayRules(y, m, d, wd) {
    var hol = holidays(y)[key(y, m, d)];
    var sundayLike = wd === 0 || !!hol;
    var dusk = duskMinutes(y, m, d);
    var r = { y: y, m: m, d: d, wd: wd, holiday: hol ? hol.name : null, special: hol ? hol.special : false, sunday: sundayLike, dusk: dusk };
    if (!sundayLike) {
      r.open = 8 * 60; r.close = Math.min(dusk, 21 * 60); r.landingsUntil = 21 * 60 + 30;
      r.pause = [12 * 60, 13 * 60]; r.circuitsUntil = Math.min(19 * 60 + 30, r.close);
    } else {
      r.open = 9 * 60; r.close = Math.min(dusk, 20 * 60); r.landingsUntil = 21 * 60;
      r.pause = [12 * 60, 14 * 60]; r.circuitsUntil = null;
    }
    if (r.close < r.pause[1]) r.close = r.pause[1];
    return r;
  }

  function statusAt(now) {
    var z = F.zurich(now);
    var r = dayRules(z.y, z.m, z.d, z.wd);
    var t = z.minutes, s;
    if (t < r.open) s = { level: 'bad', title: 'Geschlossen', text: 'Flugbetrieb ab ' + F.minToTime(r.open) + ' Uhr' };
    else if (t >= r.pause[0] && t < r.pause[1]) s = { level: 'warn', title: 'Mittagspause', text: 'Keine Starts bis ' + F.minToTime(r.pause[1]) + ' Uhr, Landungen frei' };
    else if (t < r.close) s = { level: 'ok', title: 'Flugbetrieb', text: 'Starts bis ' + F.minToTime(r.close) + ' Uhr' + (r.circuitsUntil && t < r.circuitsUntil ? ', Platzrunden bis ' + F.minToTime(r.circuitsUntil) : (r.sunday ? ', keine Platzrunden' : '')) };
    else if (t < r.landingsUntil) s = { level: 'warn', title: 'Abendbetrieb', text: 'Nur noch Landungen bis ' + F.minToTime(r.landingsUntil) + ' Uhr' };
    else s = { level: 'bad', title: 'Geschlossen', text: 'Morgen wieder geöffnet' };
    s.rules = r;
    s.short = s.title + (s.level === 'ok' ? ' bis ' + F.minToTime(r.close) : '');
    return s;
  }

  var DAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  var DAYS_LONG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

  function renderInline(s) {
    F.$$('[data-airfield-status-inline]').forEach(function (el) {
      el.innerHTML = '<span class="dot dot--' + s.level + '"></span><span>' + F.escape(s.short) + '</span>';
      el.setAttribute('title', s.title + ': ' + s.text);
    });
  }

  function renderCard(s) {
    var r = s.rules, sun = sunTimes(r.y, r.m, r.d);
    F.$$('[data-airfield-status]').forEach(function (el) {
      var hours = r.sunday
        ? F.minToTime(r.open) + ' bis 12:00 und 14:00 bis ' + F.minToTime(r.close)
        : F.minToTime(r.open) + ' bis ' + F.minToTime(r.close) + ' (Pause 12 bis 13)';
      el.innerHTML =
        '<div class="status-card">' +
          '<div class="status-card__head"><span class="dot dot--' + s.level + '"></span><span class="status-card__title">' + s.title + '</span></div>' +
          '<p class="status-card__text">' + F.escape(s.text) + '</p>' +
          '<dl class="data-list status-card__list">' +
            '<div><dt>Heute (' + DAYS_LONG[r.wd] + (r.holiday ? ', ' + F.escape(r.holiday) : '') + ')</dt><dd class="mono">' + hours + '</dd></div>' +
            '<div><dt>Landungen bis</dt><dd class="mono">' + F.minToTime(r.landingsUntil) + '</dd></div>' +
            (sun ? '<div><dt>Sonnenaufgang / -untergang</dt><dd class="mono">' + sun.sunrise + ' / ' + sun.sunset + '</dd></div><div><dt>Abenddämmerung</dt><dd class="mono">' + sun.dusk + '</dd></div>' : '') +
          '</dl>' +
          (r.special ? '<p class="status-card__note">Heute sind nur Flüge von mindestens einer Stunde oder Flüge von und nach anderen Plätzen erlaubt.</p>' : '') +
          '<p class="status-card__disclaimer">Berechnet aus der Weisung Piloten 2026. Ohne Gewähr: Massgebend sind Flugplatzleitung, Pistenzustand, NOTAM und Sprungbetrieb.</p>' +
        '</div>';
    });
  }

  function renderWeek(now) {
    F.$$('[data-hours-week]').forEach(function (el) {
      var start = 6 * 60, end = 22 * 60, span = end - start;
      var pct = function (m) { return ((Math.min(Math.max(m, start), end) - start) / span * 100).toFixed(2) + '%'; };
      var html = '<div class="hours-axis"><span></span><span class="hours-axis__ticks"><span>06</span><span>10</span><span>14</span><span>18</span><span>22</span></span><span></span></div>';
      var zNow = F.zurich(now);
      for (var i = 0; i < 7; i++) {
        var d = new Date(now.getTime() + i * 86400000);
        var z = F.zurich(d);
        var r = dayRules(z.y, z.m, z.d, z.wd);
        var segs = [[r.open, r.pause[0]], [r.pause[1], r.close]];
        var bar = segs.map(function (sg) { return '<span class="hours-day__seg" style="left:' + pct(sg[0]) + ';width:calc(' + pct(sg[1]) + ' - ' + pct(sg[0]) + ')"></span>'; }).join('');
        if (!r.sunday) bar += '<span class="hours-day__seg hours-day__seg--pause" style="left:' + pct(r.pause[0]) + ';width:calc(' + pct(r.pause[1]) + ' - ' + pct(r.pause[0]) + ')"></span>';
        if (i === 0) bar += '<span class="hours-day__now" style="left:' + pct(zNow.minutes) + '"></span>';
        html += '<div class="hours-day' + (i === 0 ? ' is-today' : '') + '">' +
          '<span class="hours-day__name">' + (i === 0 ? 'Heute' : DAYS[z.wd] + ' ' + z.d + '.' + z.m + '.') + '</span>' +
          '<span class="hours-day__bar" title="' + (r.holiday ? F.escape(r.holiday) : DAYS_LONG[z.wd]) + '">' + bar + '</span>' +
          '<span class="hours-day__text">' + F.minToTime(r.open) + ' bis ' + F.minToTime(r.close) + (r.holiday ? ' *' : '') + '</span></div>';
      }
      el.innerHTML = html;
    });
  }

  F.status = {
    at: statusAt,
    dayRules: dayRules,
    holidays: holidays,
    sunTimes: sunTimes,
    init: function () {
      function tick() {
        var now = new Date(), s = statusAt(now);
        renderInline(s); renderCard(s); renderWeek(now);
        var sun = sunTimes(s.rules.y, s.rules.m, s.rules.d);
        if (sun) F.$$('[data-sun-field]').forEach(function (el) { el.textContent = sun[el.getAttribute('data-sun-field')] || ''; });
        F.$$('[data-sun-inline]').forEach(function (el) { el.hidden = !sun; });
        F.emit('flubag:status', s);
      }
      tick();
      setInterval(tick, 60000);
    }
  };
})();

;
/* 06-forms.js */
/* Formulare: Validierung, Mehrschritt-Assistent, Versand (Endpoint oder E-Mail) */
(function () {
  'use strict';
  var F = window.FLUBAG;
  var MSG = {
    required: 'Bitte ausfüllen.',
    email: 'Bitte gib eine gültige E-Mail-Adresse ein.',
    tel: 'Bitte gib eine gültige Telefonnummer ein.',
    min: 'Der Wert ist zu klein.',
    max: 'Der Wert ist zu gross.',
    date: 'Bitte wähle ein Datum in der Zukunft.',
    check: 'Bitte bestätigen.',
    choice: 'Bitte wähle eine Option.'
  };

  function fieldOf(input) { return input.closest('.field') || input.closest('.choice-grid') || input.closest('.check') || input.parentElement; }
  function setError(input, msg) {
    var f = fieldOf(input);
    if (!f) return;
    f.classList.toggle('is-invalid', !!msg);
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    var err = f.querySelector('.field__error');
    if (!err && msg) { err = document.createElement('p'); err.className = 'field__error'; err.id = (input.id || input.name) + '-err'; f.appendChild(err); input.setAttribute('aria-describedby', err.id); }
    if (err) err.textContent = msg || '';
  }

  function validateInput(input) {
    if (input.disabled || input.closest('[hidden]')) return true;
    var v = (input.value || '').trim(), msg = '';
    if (input.type === 'radio') {
      var group = F.$$('input[name="' + input.name + '"]', input.form);
      if (group.some(function (g) { return g.required; }) && !group.some(function (g) { return g.checked; })) msg = MSG.choice;
      setError(group[0], msg);
      return !msg;
    }
    if (input.type === 'checkbox') { if (input.required && !input.checked) msg = MSG.check; }
    else if (input.required && !v) msg = MSG.required;
    else if (v && input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) msg = MSG.email;
    else if (v && input.type === 'tel' && !/^[+()\d\s/.-]{7,}$/.test(v)) msg = MSG.tel;
    else if (v && input.type === 'number' && input.min !== '' && +v < +input.min) msg = MSG.min;
    else if (v && input.type === 'number' && input.max !== '' && +v > +input.max) msg = MSG.max;
    else if (v && input.type === 'date' && input.min && v < input.min) msg = MSG.date;
    setError(input, msg);
    return !msg;
  }

  function validate(scope) {
    var inputs = F.$$('input, select, textarea', scope).filter(function (i) { return i.name && !i.closest('.honeypot'); });
    var seenRadio = {}, ok = true, first = null;
    inputs.forEach(function (i) {
      if (i.type === 'radio') { if (seenRadio[i.name]) return; seenRadio[i.name] = 1; }
      if (!validateInput(i)) { ok = false; if (!first) first = i; }
    });
    if (first) { first.focus({ preventScroll: true }); first.scrollIntoView({ behavior: F.reducedMotion ? 'auto' : 'smooth', block: 'center' }); }
    return ok;
  }

  function values(form) {
    var out = {}, fd = new FormData(form);
    fd.forEach(function (v, k) {
      if (k.charAt(0) === '_' || k === 'website') return;
      out[k] = out[k] ? out[k] + ', ' + v : v;
    });
    return out;
  }

  function labelFor(form, name) {
    var el = form.querySelector('[name="' + name + '"]');
    if (!el) return name;
    if (el.dataset.label) return el.dataset.label;
    var f = el.closest('.field');
    var l = f && f.querySelector('.field__label');
    if (l) return l.textContent.replace('*', '').trim();
    var g = el.closest('fieldset');
    var lg = g && g.querySelector('legend');
    return lg ? lg.textContent.trim() : name;
  }

  function mailto(form, data) {
    var subject = (form.dataset.subject || 'Anfrage über flubag.ch');
    var lines = Object.keys(data).map(function (k) { return labelFor(form, k) + ': ' + data[k]; });
    var href = 'mailto:' + F.config.form.email + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\n') + '\n\n(gesendet über das Formular auf flubag.ch)');
    window.location.href = href;
  }

  function success(form, viaMail) {
    form.classList.add('is-sent');
    var box = form.querySelector('.form-success');
    if (box) {
      var note = box.querySelector('[data-mail-note]');
      if (note) note.hidden = !viaMail;
      var h = box.querySelector('h3');
      if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
      box.scrollIntoView({ behavior: F.reducedMotion ? 'auto' : 'smooth', block: 'center' });
    }
    F.toast(viaMail ? 'Dein E-Mail-Programm wurde mit allen Angaben geöffnet.' : 'Danke! Deine Anfrage ist bei uns angekommen.');
  }

  function submit(form) {
    var btn = form.querySelector('[type="submit"]');
    if (form.querySelector('.honeypot input') && form.querySelector('.honeypot input').value) { success(form, false); return; }
    var data = values(form);
    data._form = form.dataset.formName || form.id || 'Kontakt';
    data._page = location.href;
    var cfg = F.config.form;
    if (cfg.mode === 'mailto' || location.protocol === 'file:') { mailto(form, values(form)); success(form, true); return; }
    if (btn) btn.classList.add('is-loading');
    fetch(cfg.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(data) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok || !j.ok) throw new Error(j.error || r.status); return j; }); })
      .then(function () { success(form, false); })
      .catch(function () { mailto(form, values(form)); success(form, true); })
      .then(function () { if (btn) btn.classList.remove('is-loading'); });
  }

  function wizard(form) {
    var steps = F.$$('[data-step]', form);
    var prog = F.$$('[data-wizard-progress] li', form);
    var i = 0;
    function show(n) {
      i = Math.max(0, Math.min(n, steps.length - 1));
      steps.forEach(function (s, k) { s.classList.toggle('is-current', k === i); });
      prog.forEach(function (p, k) { p.classList.toggle('is-current', k === i); p.classList.toggle('is-done', k < i); });
      F.emit('flubag:wizard-step', { form: form, index: i });
      var top = form.getBoundingClientRect().top + window.scrollY - 120;
      if (Math.abs(window.scrollY - top) > 200) { if (F.lenis) F.lenis.scrollTo(top); else window.scrollTo({ top: top, behavior: 'smooth' }); }
    }
    form.addEventListener('click', function (e) {
      if (e.target.closest('[data-next]')) { e.preventDefault(); if (validate(steps[i])) show(i + 1); }
      if (e.target.closest('[data-prev]')) { e.preventDefault(); show(i - 1); }
    });
    show(0);
  }

  function summary(form) {
    var boxes = F.$$('[data-summary]', form);
    if (!boxes.length) return;
    var update = function () {
      var data = values(form);
      boxes.forEach(function (b) {
        var names = (b.getAttribute('data-summary') || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        b.innerHTML = names.filter(function (n) { return data[n]; }).map(function (n) {
          return '<div><dt>' + F.escape(labelFor(form, n)) + '</dt><dd>' + F.escape(data[n]) + '</dd></div>';
        }).join('') || '<div><dt>Noch keine Angaben</dt><dd></dd></div>';
      });
    };
    form.addEventListener('input', update);
    form.addEventListener('change', update);
    update();
  }

  F.forms = {
    validate: validate,
    values: values,
    init: function () {
      var today = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
      F.$$('form[data-form]').forEach(function (form) {
        form.setAttribute('novalidate', '');
        F.$$('input[type="date"][data-future]', form).forEach(function (d) { d.min = today; });
        var t = form.querySelector('input[name="_t"]');
        if (t) t.value = String(Date.now());
        form.addEventListener('blur', function (e) { if (e.target.matches('input, select, textarea') && e.target.value) validateInput(e.target); }, true);
        form.addEventListener('change', function (e) { if (e.target.closest('.is-invalid')) validateInput(e.target); });
        form.addEventListener('submit', function (e) { e.preventDefault(); if (validate(form)) submit(form); });
        if (form.hasAttribute('data-wizard')) wizard(form);
        summary(form);
        F.$$('[data-form-reset]', form).forEach(function (b) { b.addEventListener('click', function () { form.reset(); form.classList.remove('is-sent'); if (form.hasAttribute('data-wizard')) wizard(form); }); });
      });
      // Formular über URL vorbelegen, z.B. kontakt.html?thema=Hangar
      var params = new URLSearchParams(location.search);
      params.forEach(function (v, k) {
        F.$$('form[data-form] [name="' + k + '"]').forEach(function (el) {
          if (el.type === 'radio' || el.type === 'checkbox') el.checked = el.value === v; else el.value = v;
          el.dispatchEvent(new Event('change', { bubbles: true }));
        });
      });
    }
  };
})();

;
/* 07-ui.js */
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
          if (links[i]) links[i].scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
        });
      }, { rootMargin: '-35% 0px -60% 0px' });
      map.forEach(function (s) { if (s) io.observe(s); });
    });
  }

  function copyButtons() {
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-copy]');
      if (!b) return;
      var text = b.getAttribute('data-copy');
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { F.toast('Kopiert: ' + text); });
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

  F.ui = {
    init: function () { tabs(); lightbox(); scrollUi(); subnav(); copyButtons(); webcams(); }
  };
})();

;
/* 08-crosswind.js */
/* Seitenwind-Anzeige für Piste 15/33 */
(function () {
  'use strict';
  var F = window.FLUBAG;

  function svg() {
    var ticks = '', cards = '';
    for (var a = 0; a < 360; a += 10) {
      var r1 = a % 30 === 0 ? 86 : 90, rad = (a - 90) * Math.PI / 180;
      ticks += '<line class="xwind__tick" x1="' + (100 + r1 * Math.cos(rad)).toFixed(1) + '" y1="' + (100 + r1 * Math.sin(rad)).toFixed(1) + '" x2="' + (100 + 95 * Math.cos(rad)).toFixed(1) + '" y2="' + (100 + 95 * Math.sin(rad)).toFixed(1) + '"/>';
    }
    [['N', 0], ['O', 90], ['S', 180], ['W', 270]].forEach(function (c) {
      var rad = (c[1] - 90) * Math.PI / 180;
      cards += '<text class="xwind__card" x="' + (100 + 76 * Math.cos(rad)).toFixed(1) + '" y="' + (100 + 76 * Math.sin(rad)).toFixed(1) + '">' + c[0] + '</text>';
    });
    var rwy = (F.data.site && F.data.site.airfield.rwy33) || 334;
    return '<svg class="xwind__svg" viewBox="0 0 200 200" role="img" aria-label="Windrichtung relativ zur Piste 15/33">' +
      '<circle class="xwind__ring" cx="100" cy="100" r="95"/><circle class="xwind__ring" cx="100" cy="100" r="62"/>' + ticks + cards +
      '<g transform="rotate(' + rwy + ' 100 100)"><rect class="xwind__runway" x="91" y="40" width="18" height="120" rx="2"/>' +
      '<line class="xwind__runway-line" x1="100" y1="48" x2="100" y2="152"/>' +
      '<text class="xwind__rwy-label" x="100" y="150" transform="rotate(180 100 150)">33</text><text class="xwind__rwy-label" x="100" y="50">15</text></g>' +
      '<g class="xwind__arrow" data-xwind-arrow style="transform-origin:100px 100px"><path d="M100 66 L109 44 L102.5 46 L102.5 6 L97.5 6 L97.5 46 L91 44 Z"/></g>' +
      '</svg>';
  }

  function readout(label, value, cls) {
    return '<div class="readout ' + (cls || '') + '"><span class="readout__label">' + label + '</span><span class="readout__value">' + value + '</span></div>';
  }

  function render(el, w) {
    var c33 = w.rwy33, c15 = w.rwy15;
    var fmt = function (c) {
      return Math.abs(Math.round(c.head)) + ' kt <small>' + (c.head >= 0 ? 'Gegenw.' : 'Rückenw.') + '</small> · ' + Math.abs(Math.round(c.cross)) + ' kt <small>' + (c.cross >= 0 ? 'von rechts' : 'von links') + '</small>';
    };
    var rec = w.calm ? 'Windstill: Piste 33 primär (Starts und Landungen).' :
      (w.tailwind33 ? 'Rückenwind auf 33: kein Start auf Piste 33 nahe max. Startgewicht. Landung auf 15 prüfen.' : 'Gegenwind auf Piste 33: Standardbetrieb auf 33.');
    var hazards = '';
    if (w.westHazard) hazards += '<p class="chip chip--warn">Starker Westwind: Turbulenzen östlich des Waldstücks beim Start 33</p>';
    if (w.biseHazard) hazards += '<p class="chip chip--warn">Bise: Turbulenzen im Endanflug 33 möglich</p>';
    el.querySelector('[data-xwind-data]').innerHTML =
      readout('Wind', w.windText) + readout('Böen', Math.round(w.gust) + ' kt') +
      readout('Piste 33', fmt(c33)) + readout('Piste 15', fmt(c15)) +
      readout('Temperatur', w.tempText) + readout('QNH', w.qnhText) +
      '<div class="xwind__rec">' + '<p class="notice ' + (w.tailwind33 || w.westHazard || w.biseHazard ? 'notice--warn' : '') + '" style="grid-template-columns:1fr">' + rec + '</p>' + (hazards ? '<div class="row mt-s">' + hazards + '</div>' : '') + '</div>';
    var arrow = el.querySelector('[data-xwind-arrow]');
    if (arrow) { arrow.style.transform = 'rotate(' + (w.calm ? 0 : w.dir) + 'deg)'; arrow.style.opacity = w.calm ? 0.3 : 1; }
  }

  F.crosswind = {
    init: function () {
      var els = F.$$('[data-xwind]');
      if (!els.length) return;
      els.forEach(function (el) {
        el.classList.add('xwind');
        el.innerHTML = svg() + '<div class="xwind__data" data-xwind-data><p class="muted">Winddaten werden geladen …</p></div>';
      });
      F.listen('flubag:weather', function (w) { els.forEach(function (el) { render(el, w); }); });
      F.listen('flubag:weather-error', function () { els.forEach(function (el) { el.querySelector('[data-xwind-data]').innerHTML = '<p class="muted">Wetterdaten sind gerade nicht erreichbar.</p>'; }); });
      if (F.weather.data) els.forEach(function (el) { render(el, F.weather.data); });
    }
  };
})();

;
/* 99-init.js */
/* Start: alle Module initialisieren. Läuft bei DOMContentLoaded, also nachdem auch
   die Seiten-Skripte (defer) ihren Inhalt gerendert haben. */
(function () {
  'use strict';
  var F = window.FLUBAG;
  function boot() {
    var mods = ['theme', 'header', 'ui', 'forms', 'status', 'crosswind', 'motion'];
    mods.forEach(function (m) { try { if (F[m] && F[m].init) F[m].init(); } catch (e) { console.error('FLUBAG ' + m, e); } });
    try { F.weather.load(); } catch (e) { console.error(e); }
    F._runReady();
  }
  if (document.readyState === 'complete') boot(); else document.addEventListener('DOMContentLoaded', boot);
})();
