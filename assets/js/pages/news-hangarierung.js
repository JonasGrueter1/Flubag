/* Hangarierung: Schiebetür-Check (schematisch). Regler zieht das Flugzeug heraus,
   "Türen schliessen" zeigt, ob die Türen das Flugzeug treffen würden. */
(function () {
  'use strict';
  var F = window.FLUBAG;
  var root = F.$('[data-door-check]');
  if (!root) return;
  var plane = F.$('[data-plane]', root);
  var range = F.$('[data-door-range]', root);
  var btn = F.$('[data-door-close]', root);
  var btnLabel = F.$('[data-door-close-label]', root);
  var status = F.$('[data-door-status]', root);
  var msg = F.$('[data-door-msg]', root);
  var doorL = F.$('[data-door="left"]', root);
  var doorR = F.$('[data-door="right"]', root);

  // Geometrie in SVG-Einheiten (Mitte der Türöffnung bei x = 200)
  var ZONE = [96, 130], RESERVE = 160, Y0 = 60, Y1 = 240, OPENING_HALF = 90;
  var PARTS = [
    { y0: -62, y1: -50, hw: 30 },  // Höhenleitwerk
    { y0: -60, y1: 50, hw: 9 },    // Rumpf
    { y0: -8, y1: 12, hw: 80 },    // Flügel
    { y0: 50, y1: 53, hw: 16 }     // Propeller
  ];
  var closed = false;

  function posY() { return Y0 + (+range.value / 100) * (Y1 - Y0); }

  function check() {
    var y = posY(), hit = 0;
    PARTS.forEach(function (p) { if (y + p.y0 < ZONE[1] && y + p.y1 > ZONE[0]) hit = Math.max(hit, p.hw); });
    var state = hit ? 'bad' : (y - 62 < RESERVE ? 'warn' : 'ok');
    return { y: y, hit: hit, state: state };
  }

  var TEXT = {
    bad: ['Im Türbereich', 'Das Flugzeug steht noch im Bereich der Schiebetüren.'],
    warn: ['Knapp draussen', 'Knapp aus dem Türbereich. Noch zwei Meter weiter, dann bist du auf der sicheren Seite.'],
    ok: ['Sicher, mit Reserve', 'Vollständig ausserhalb der Schiebetüren, mit zwei Metern Reserve. So passt es.']
  };

  function setDoors(travel) {
    doorL.style.transform = 'translateX(' + travel + 'px)';
    doorR.style.transform = 'translateX(' + (-travel) + 'px)';
  }

  function render() {
    var c = check();
    plane.style.transform = 'translate(200px,' + c.y.toFixed(1) + 'px)';
    root.classList.toggle('is-clear', c.state !== 'bad');
    status.innerHTML = '<span class="dot dot--' + c.state + '"></span><span>' + TEXT[c.state][0] + '</span>';
    if (!closed) msg.textContent = TEXT[c.state][1];
    return c;
  }

  function open() {
    closed = false;
    root.classList.remove('is-hit');
    setDoors(0);
    btnLabel.textContent = 'Türen schliessen';
  }

  btn.addEventListener('click', function () {
    if (closed) { open(); render(); return; }
    var c = render();
    closed = true;
    btnLabel.textContent = 'Türen öffnen';
    root.classList.remove('is-hit');
    void root.offsetWidth;
    if (c.hit) {
      root.classList.add('is-hit');
      setDoors(OPENING_HALF - c.hit);
      msg.innerHTML = '<strong>Autsch!</strong> Die Schiebetür trifft das Flugzeug. Genau so entstehen Hangarierungsschäden. Zieh das Flugzeug weiter heraus.';
    } else {
      setDoors(OPENING_HALF);
      msg.innerHTML = c.state === 'warn'
        ? '<strong>Knapp.</strong> Die Türen gehen zu, aber es bleibt kaum Spielraum. Besser noch zwei Meter weiter ziehen.'
        : '<strong>Sicher.</strong> Das Flugzeug steht vollständig ausserhalb des Türbereichs. Die Türen sind zu.';
    }
  });

  range.addEventListener('input', function () { if (closed) open(); render(); });
  render();
})();
