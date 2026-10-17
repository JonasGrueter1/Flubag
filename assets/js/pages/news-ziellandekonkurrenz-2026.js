/* Ziellandekonkurrenz: kleines Präzisionslande-Spiel */
(function () {
  'use strict';
  var F = window.FLUBAG;
  var root = F.$('[data-spot-game]');
  if (!root) return;
  var plane = F.$('[data-game-plane]', root);
  var field = F.$('.spot-game__field', root);
  var marks = F.$('[data-game-marks]', root);
  var result = F.$('[data-game-result]', root);
  var bestEl = F.$('[data-game-best]', root);
  var btnStart = F.$('[data-game-start]', root);
  var btnTouch = F.$('[data-game-touch]', root);

  var METERS = 120;      // gezeigter Pistenausschnitt
  var TARGET = 0.62;     // Position der Ziellinie (Anteil)
  var DURATION = 3600;   // ms für den ganzen Ausschnitt (ca. 33 m/s)
  var running = false, t0 = 0, raf = 0, x = 0, best = null, last = [0.1, 61], ended = 0;

  function fmt(m) { return Number(m).toLocaleString('de-CH', { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }

  function place(p, h) {
    var w = field.clientWidth;
    last = [p, h];
    plane.style.transform = 'translate3d(' + (p * w) + 'px,' + (-h) + 'px,0)';
  }

  function frame(now) {
    var p = (now - t0) / DURATION;
    x = p;
    // Sinkflug: die Höhe nimmt zum Ende des Ausschnitts gegen 0 ab
    var h = p < 0.45 ? 5 + 65 * (1 - Math.max(0, p) / 0.45) : 5;
    place(p, h);
    if (p >= 1.02) { finish(null); return; }
    raf = requestAnimationFrame(frame);
  }

  function start() {
    // verhindert, dass das Loslassen der Leertaste sofort einen neuen Anflug startet
    if (running || performance.now() - ended < 400) return;
    running = true;
    F.$$('.spot-game__mark', marks).forEach(function (m) { m.classList.add('is-old'); });
    btnTouch.disabled = false;
    btnStart.disabled = true;
    result.textContent = 'Anflug läuft ...';
    t0 = performance.now();
    if (F.reducedMotion) DURATION = 5200;
    raf = requestAnimationFrame(frame);
    btnTouch.focus({ preventScroll: true });
  }

  function finish(touchAt) {
    running = false;
    ended = performance.now();
    cancelAnimationFrame(raf);
    btnTouch.disabled = true;
    btnStart.disabled = false;
    if (touchAt == null) {
      place(1.05, 40);
      result.innerHTML = '<strong>Go around!</strong> Zu spät, das Flugzeug ist über das Ziel hinaus. Neuer Anflug?';
      btnStart.focus({ preventScroll: true });
      return;
    }
    place(touchAt, 0);
    var dev = (touchAt - TARGET) * METERS;
    var abs = Math.abs(dev);
    var mark = document.createElement('span');
    mark.className = 'spot-game__mark';
    mark.style.left = (touchAt * 100) + '%';
    marks.appendChild(mark);
    var where = abs < 0.05 ? 'genau auf der Linie' : fmt(abs) + ' m ' + (dev < 0 ? 'vor' : 'nach') + ' der Linie';
    var verdict = abs < 1 ? 'Volltreffer!' : abs < 5 ? 'Sehr präzise!' : abs < 15 ? 'Gute Landung.' : 'Da geht noch mehr.';
    if (best === null || abs < best) { best = abs; bestEl.textContent = 'BEST ' + fmt(best) + ' M'; }
    result.innerHTML = '<strong>' + verdict + '</strong> Aufgesetzt ' + where + '.';
    btnStart.innerHTML = F.icon('plane-landing') + 'Nochmals anfliegen';
    btnStart.focus({ preventScroll: true });
  }

  btnStart.addEventListener('click', start);
  btnTouch.addEventListener('click', function () { if (running) finish(Math.min(1, Math.max(0, x))); });
  document.addEventListener('keydown', function (e) {
    if (!running || (e.key !== ' ' && e.code !== 'Space')) return;
    e.preventDefault();
    finish(Math.min(1, Math.max(0, x)));
  });
  place(0.1, 61);
  window.addEventListener('resize', function () { if (!running) place(last[0], last[1]); });
})();
