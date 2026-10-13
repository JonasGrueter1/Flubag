/* Startseite: Intro, Hero-Slider, Flotten-Umschalter */
(function () {
  'use strict';
  var F = window.FLUBAG;

  // Intro nur beim ersten Besuch pro Sitzung
  function intro() {
    var el = F.$('[data-intro]');
    if (!el || F.reducedMotion || F.store.get('flubag-intro', true) || !window.gsap) return;
    F.store.set('flubag-intro', 1, true);
    el.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    var tl = gsap.timeline({ onComplete: function () { el.remove(); document.documentElement.style.overflow = ''; } });
    tl.from(el.querySelectorAll('.intro__runway span'), { scaleX: 0, opacity: 0, duration: 0.4, stagger: { each: 0.05, from: 'center' } })
      .from(el.querySelector('.logo-oval'), { scale: 0.6, opacity: 0, transformOrigin: '50% 50%', duration: 0.6, ease: 'back.out(1.6)' }, 0.1)
      .from(el.querySelector('.logo-runway'), { yPercent: 40, opacity: 0, duration: 0.6, ease: 'power3.out' }, 0.25)
      .from(el.querySelector('.intro__text'), { opacity: 0, letterSpacing: '0.6em', duration: 0.6 }, 0.35)
      .to(el.querySelector('.intro__logo'), { y: -30, scale: 1.08, duration: 0.5, ease: 'power2.in' }, 1.15)
      .to(el, { clipPath: 'inset(0 0 100% 0)', duration: 0.8, ease: 'power4.inOut' }, 1.25);
  }

  function heroSlider() {
    var slides = F.$$('.hero__slide');
    var bars = F.$$('.hero__bars button');
    var idxEl = F.$('[data-hero-index]'), capEl = F.$('[data-hero-caption]');
    if (slides.length < 2) return;
    var i = 0, timer, MS = 7000;
    document.documentElement.style.setProperty('--slide-ms', MS + 'ms');
    function go(n) {
      slides[i].classList.remove('is-active');
      i = (n + slides.length) % slides.length;
      slides[i].classList.add('is-active');
      bars.forEach(function (b, k) { b.classList.toggle('is-active', k === i); b.classList.toggle('is-done', k < i); });
      if (idxEl) idxEl.textContent = F.pad(i + 1);
      if (capEl) capEl.textContent = slides[i].getAttribute('data-caption');
      clearTimeout(timer);
      if (!F.reducedMotion) timer = setTimeout(function () { go(i + 1); }, MS);
    }
    bars.forEach(function (b, k) { b.addEventListener('click', function () { go(k); }); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) clearTimeout(timer); else go(i); });
    // Bilder der übrigen Slides erst nach dem Laden der Seite holen
    slides.slice(1).forEach(function (s) { var img = s.querySelector('img'); if (img) img.loading = 'eager'; });
    go(0);
  }

  function heroIn() {
    if (!window.gsap || F.reducedMotion) return;
    gsap.from('[data-hero-in]', { y: 30, opacity: 0, duration: 1.1, ease: 'power3.out', stagger: 0.12, delay: 0.5 });
    gsap.to('.hero__content', { yPercent: -18, opacity: 0.2, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  }

  function fleetSwitch() {
    var root = F.$('[data-fleet-switch]');
    if (!root) return;
    var tabs = F.$$('[data-fleet]', root), panels = F.$$('[data-fleet-panel]', root);
    function select(id) {
      tabs.forEach(function (t) { t.setAttribute('aria-selected', String(t.getAttribute('data-fleet') === id)); });
      panels.forEach(function (p) {
        var on = p.getAttribute('data-fleet-panel') === id;
        p.hidden = !on;
        if (on) { p.classList.remove('is-entering'); void p.offsetWidth; p.classList.add('is-entering'); }
      });
    }
    tabs.forEach(function (t, k) {
      t.addEventListener('click', function () { select(t.getAttribute('data-fleet')); });
      t.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        var n = tabs[(k + d + tabs.length) % tabs.length];
        n.focus(); select(n.getAttribute('data-fleet'));
      });
    });
  }

  heroSlider();
  fleetSwitch();
  F.ready(function () { intro(); heroIn(); });
})();
