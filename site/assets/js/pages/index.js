/* Startseite: Hero-Slider und sanftes Einblenden des Hero-Inhalts */
(function () {
  'use strict';
  var F = window.FLUBAG;

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
      if (i !== 0) loadRest();
      bars.forEach(function (b, k) {
        b.classList.toggle('is-active', k === i);
        b.classList.toggle('is-done', k < i);
        if (k === i) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
      });
      if (idxEl) idxEl.textContent = F.pad(i + 1);
      if (capEl) capEl.textContent = slides[i].getAttribute('data-caption');
      clearTimeout(timer);
      if (!F.reducedMotion) timer = setTimeout(function () { go(i + 1); }, MS);
    }
    bars.forEach(function (b, k) { b.addEventListener('click', function () { go(k); }); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) clearTimeout(timer); else go(i); });
    // Bilder der übrigen Slides erst nach dem Laden der Seite holen (data-defer im Build)
    var loaded = false;
    function loadRest() {
      if (loaded) return; loaded = true;
      slides.slice(1).forEach(function (s) {
        var img = s.querySelector('img[data-src]');
        if (!img) return;
        img.srcset = img.getAttribute('data-srcset'); img.src = img.getAttribute('data-src');
        img.removeAttribute('data-srcset'); img.removeAttribute('data-src');
      });
    }
    bars.forEach(function (b) { b.addEventListener('pointerenter', loadRest, { once: true }); });
    if (document.readyState === 'complete') setTimeout(loadRest, 300);
    else window.addEventListener('load', function () { setTimeout(loadRest, 300); });
    go(0);
  }

  // Einmaliges, ruhiges Einblenden von Text, Buttons und Gutschein-Karte
  function heroIn() {
    if (!window.gsap || F.reducedMotion) return;
    gsap.from('[data-hero-in]', { y: 24, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.12, delay: 0.4, clearProps: 'transform,opacity' });
  }

  heroSlider();
  F.ready(heroIn);
})();
