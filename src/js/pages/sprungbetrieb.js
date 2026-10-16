/* Regeln Sprungbetrieb: Simulation des Absetzvorgangs (Scroll und Abspielen) */
(function () {
  'use strict';
  var F = window.FLUBAG;
  if (!F) return;
  var $ = F.$, $$ = F.$$;
  var sim = $('[data-sb-sim]');
  var steps = $$('[data-sb-step]');
  if (!sim || !steps.length) return;

  var clock = $('[data-sb-clock]', sim);
  var lamp = $('[data-sb-lamp]', sim);
  var lampText = $('[data-sb-lamp-text]', sim);
  var rwy = $('[data-sb-rwy]', sim);
  var rwyText = $('[data-sb-rwy-text]', sim);
  var phase = $('[data-sb-phase]', sim);
  var fill = $('[data-sb-fill]', sim);
  var dots = $('[data-sb-dots]', sim);
  var btn = $('[data-sb-play]', sim);
  var btnText = $('[data-sb-play-text]', sim);
  var last = steps.length - 1;

  dots.innerHTML = steps.map(function (s, i) { return '<i style="left:' + (i / last * 100).toFixed(2) + '%"></i>'; }).join('');
  var dotEls = $$('i', dots);
  var current = -1;

  function show(i) {
    if (i === current || i < 0) return;
    current = i;
    var s = steps[i];
    var on = s.getAttribute('data-lamp') === 'on';
    var free = s.getAttribute('data-rwy') === 'Frei';
    clock.textContent = s.getAttribute('data-clock');
    clock.classList.toggle('is-text', clock.textContent.charAt(0) !== 'T');
    lamp.classList.toggle('is-on', on);
    lampText.textContent = on ? 'EIN' : 'AUS';
    rwy.classList.toggle('is-closed', !free);
    rwyText.textContent = s.getAttribute('data-rwy');
    phase.textContent = s.getAttribute('data-phase');
    fill.style.width = (i / last * 100) + '%';
    dotEls.forEach(function (d, k) { d.classList.toggle('is-done', k <= i); });
    steps.forEach(function (st, k) { st.classList.toggle('is-current', k === i); });
  }
  show(0);

  var playing = false, timer = null;
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      if (playing) return;
      entries.forEach(function (en) { if (en.isIntersecting) show(steps.indexOf(en.target)); });
    }, { rootMargin: '-40% 0px -55% 0px' });
    steps.forEach(function (s) { io.observe(s); });
  }

  function stop() {
    playing = false;
    clearTimeout(timer);
    btn.setAttribute('aria-pressed', 'false');
    btnText.textContent = 'Ablauf abspielen';
    sim.classList.remove('is-playing');
  }
  function tick(i) {
    show(i);
    timer = setTimeout(function () { if (i < last) tick(i + 1); else stop(); }, i === last ? 3200 : 2600);
  }
  btn.addEventListener('click', function () {
    if (playing) { stop(); return; }
    playing = true;
    btn.setAttribute('aria-pressed', 'true');
    btnText.textContent = 'Stopp';
    sim.classList.add('is-playing');
    current = -1;
    tick(0);
  });
})();
