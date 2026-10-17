/* Piste 33: schematische Platzrunde, Flugzeug folgt dem Scrollen durch die Schritte */
(function () {
  'use strict';
  var F = window.FLUBAG;
  var root = F.$('[data-p33]');
  if (!root) return;
  var svg = F.$('svg', root);
  var legs = F.$$('[data-p33-leg]', svg);
  var full = F.$('[data-p33-full]', svg);
  var flown = F.$('[data-p33-flown]', svg);
  var plane = F.$('[data-p33-plane]', svg);
  var planeRot = F.$('[data-p33-plane-rot]', svg);
  var dots = F.$$('[data-p33-dot]', svg);
  var labels = F.$$('[data-p33-lbl]', svg);
  var stepLabel = F.$('[data-p33-label]', root);
  var steps = F.$$('[data-p33-step]');
  var legend = F.$$('[data-p33-go]');
  var names = ['Holding Point', 'Begin Downwind', 'Begin Base', 'Begin Final', 'Final', 'Short Final'];

  // Ganze Route als ein zusammenhängender Pfad (für Strichlänge und Position)
  var d = legs.map(function (l, i) { var s = l.getAttribute('d'); return i ? s.replace(/^M\s*[-\d.]+\s*,?\s*[-\d.]+\s*/, '') : s; }).join(' ');
  full.setAttribute('d', d);
  flown.setAttribute('d', d);
  var total = full.getTotalLength();
  var lens = legs.map(function (l) { return l.getTotalLength(); });
  var cum = [0];
  lens.forEach(function (l, i) { cum.push(cum[i] + l); });
  // Position des Flugzeugs, wenn ein Schritt in der Bildschirmmitte steht
  var keys = [0, cum[2], cum[3], cum[4], cum[4] + lens[4] * 0.45, cum[5]];
  flown.style.strokeDasharray = total + ' ' + total;

  var active = -1, current = 0, target = 0, raf = null;

  function place(dist) {
    var p = full.getPointAtLength(dist);
    var q = dist < total - 1 ? full.getPointAtLength(dist + 1) : full.getPointAtLength(dist - 1);
    var ang = Math.atan2(q.y - p.y, q.x - p.x) * 180 / Math.PI;
    if (dist >= total - 1) ang += 180;
    plane.setAttribute('transform', 'translate(' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ')');
    planeRot.setAttribute('transform', 'rotate(' + ang.toFixed(1) + ')');
    flown.style.strokeDashoffset = (total - dist).toFixed(1);
  }

  function setActive(i) {
    if (i === active) return;
    active = i;
    steps.forEach(function (s, k) { s.classList.toggle('is-active', k === i); });
    legs.forEach(function (l, k) { l.classList.toggle('is-active', k === i); });
    dots.forEach(function (c, k) { c.classList.toggle('is-active', k === i); c.classList.toggle('is-done', k < i); });
    labels.forEach(function (t, k) { t.classList.toggle('is-active', k === i); });
    legend.forEach(function (a, k) { a.classList.toggle('is-active', k === i); if (k === i) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current'); });
    if (stepLabel) stepLabel.textContent = F.pad(i + 1) + ' ' + names[i];
  }

  function measure() {
    var ref = window.innerHeight * (window.innerWidth <= 860 ? 0.62 : 0.5);
    var centers = steps.map(function (s) { var r = s.getBoundingClientRect(); return r.top + r.height / 2; });
    var last = steps[steps.length - 1].getBoundingClientRect();
    var dist, idx = 0;
    if (ref <= centers[0]) { dist = keys[0]; idx = 0; }
    else if (ref >= centers[centers.length - 1]) {
      var f = Math.min(1, (ref - centers[centers.length - 1]) / Math.max(1, last.bottom - centers[centers.length - 1]));
      dist = keys[keys.length - 1] + (total - keys[keys.length - 1]) * f;
      idx = steps.length - 1;
    } else {
      for (var i = 0; i < centers.length - 1; i++) {
        if (ref >= centers[i] && ref < centers[i + 1]) {
          var t = (ref - centers[i]) / (centers[i + 1] - centers[i]);
          dist = keys[i] + (keys[i + 1] - keys[i]) * t;
          idx = t < 0.5 ? i : i + 1;
          break;
        }
      }
    }
    target = dist;
    setActive(idx);
  }

  function tick() {
    current += (target - current) * (F.reducedMotion ? 1 : 0.18);
    if (Math.abs(target - current) < 0.3) current = target;
    place(current);
    raf = current !== target ? requestAnimationFrame(tick) : null;
  }

  function update() { measure(); if (!raf) raf = requestAnimationFrame(tick); }

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  measure();
  current = target;
  place(current);

  // Live-Wind relativ zur Piste (Skizze: Piste 33 zeigt nach oben, 334°)
  var arrow = F.$('[data-p33-wind-arrow]', svg);
  var windText = F.$('[data-p33-wind-text]', svg);
  var rwy = (F.data.site && F.data.site.airfield && F.data.site.airfield.rwy33) || 334;
  function onWeather(w) {
    if (!w) return;
    if (windText) windText.textContent = w.calm ? 'calm' : F.pad3(Math.round(w.dir / 10) * 10) + '/' + F.pad(Math.round(w.speed));
    if (arrow) {
      arrow.style.opacity = w.calm ? 0.25 : 1;
      arrow.setAttribute('transform', 'rotate(' + Math.round((w.calm ? 0 : w.dir) + 180 - rwy) + ')');
    }
  }
  F.listen('flubag:weather', onWeather);
  F.ready(function () { if (F.weather && F.weather.data) onWeather(F.weather.data); update(); });
})();
