/* Webcams & Wetter: Webcam-Status mit Aktualisierungsanzeige, Grossansicht, zusätzliche Wetterwerte,
   Seitenwind-Rechner und Sonnenbogen. Auto-Refresh und Archivbild kommen aus 07-ui.js (data-webcam). */
(function () {
  'use strict';
  var F = window.FLUBAG;

  // ---------- Webcams ----------
  var cams = F.$$('[data-wc]').map(function (fig) {
    var img = F.$('img[data-webcam]', fig);
    return {
      fig: fig, img: img, a: F.$('.wc-cam__media', fig), badge: F.$('.card__badge', fig),
      state: F.$('[data-wc-state]', fig), bar: F.$('[data-wc-bar]', fig),
      base: img.getAttribute('src'), fb: img.getAttribute('data-fallback') || '',
      mode: 'loading', last: 0, own: false
    };
  });
  function bust(u) { return u + (u.indexOf('?') > -1 ? '&' : '?') + 't=' + Date.now(); }
  function isFallback(c) { var s = c.img.getAttribute('src') || ''; return !!c.fb && (s === c.fb || s.indexOf('data:') === 0); }
  function restartBar(c) { if (!c.bar) return; c.bar.style.animation = 'none'; void c.bar.offsetWidth; c.bar.style.animation = ''; }
  function setLive(c) {
    c.mode = 'live'; c.last = Date.now();
    c.fig.classList.add('is-live'); c.fig.classList.remove('is-archive');
    if (c.badge) { c.badge.className = 'card__badge chip chip--bad'; c.badge.innerHTML = '<span class="dot dot--bad"></span>LIVE'; }
    c.a.setAttribute('href', c.img.getAttribute('src'));
    restartBar(c); tick();
  }
  function setArchive(c) {
    c.mode = 'archive';
    c.fig.classList.remove('is-live'); c.fig.classList.add('is-archive');
    var offline = c.fb.indexOf('data:') === 0;
    if (c.badge) { c.badge.className = 'card__badge chip'; c.badge.textContent = offline ? 'Offline' : 'Archivbild'; }
    c.state.textContent = offline ? 'Nicht erreichbar' : 'Archivbild · Kamera nicht erreichbar';
    c.a.setAttribute('href', c.a.getAttribute('data-wc-large') || c.fb);
  }
  function probe(c) {
    var p = new Image();
    p.onload = function () { c.own = true; c.img.src = p.src; };
    p.src = bust(c.base);
  }
  function tick() {
    var now = Date.now();
    cams.forEach(function (c) {
      if (c.mode !== 'live') return;
      var s = Math.max(0, Math.round((now - c.last) / 1000));
      c.state.textContent = 'Live · ' + (s < 5 ? 'gerade aktualisiert' : 'vor ' + (s < 60 ? s + ' s' : Math.floor(s / 60) + ' min'));
    });
  }
  cams.forEach(function (c) {
    c.img.addEventListener('load', function () { if (isFallback(c)) setArchive(c); else setLive(c); });
    c.img.addEventListener('error', function () { if (c.own && !isFallback(c)) c.img.src = c.fb; });
    if (c.img.complete && c.img.naturalWidth) setLive(c);
  });
  setInterval(tick, 5000);
  // Kameras, die ausgefallen waren, im Hintergrund erneut versuchen und danach selbst aktualisieren
  setInterval(function () {
    if (document.hidden) return;
    cams.forEach(function (c) {
      if (c.mode === 'archive') probe(c);
      else if (c.own && c.mode === 'live') c.img.src = bust(c.base);
    });
  }, 60000);
  var reload = F.$('[data-wc-reload]');
  if (reload) reload.addEventListener('click', function () {
    cams.forEach(function (c) { if (c.mode === 'archive') probe(c); else c.img.src = bust(c.base); });
    F.toast('Webcam-Bilder werden neu geladen');
  });

  // ---------- Zusatzwerte Wetter ----------
  var ICONS = function (code, day) {
    if (code >= 95) return 'storm';
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
    if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
    if (code >= 51 && code <= 57) return 'drizzle';
    if (code === 45 || code === 48) return 'fog';
    if (code === 3) return 'cloudy';
    if (code === 2) return day ? 'partly' : 'cloudy';
    return day ? 'clear' : 'night';
  };
  var liveBtn = F.$('[data-wc-live]');
  F.listen('flubag:weather', function (w) {
    var g = F.$('[data-wc-gust]'), d = F.$('[data-wc-dew]'), t = F.$('[data-wc-wxtime]');
    if (g && w.gust != null) g.textContent = Math.round(w.gust) + ' kt';
    if (d && w.dew != null) d.textContent = Math.round(w.dew) + ' °C';
    if (t && w.time) t.textContent = 'Stand ' + String(w.time).slice(11, 16) + ' Uhr';
    var key = ICONS(w.code, w.isDay);
    F.$$('[data-wc-icon]').forEach(function (el) { el.hidden = el.getAttribute('data-wc-icon') !== key; });
    var ic = F.$('.wc-icon'); if (ic) ic.classList.add('is-set');
    if (liveBtn) liveBtn.disabled = false;
  });
  F.listen('flubag:weather-error', function () {
    var t = F.$('[data-wc-wxtime]');
    if (t) t.textContent = 'Wetterdaten nicht erreichbar';
    F.$$('[data-wc-gust], [data-wc-dew]').forEach(function (el) { if (el.textContent === '--') el.textContent = 'nicht verfügbar'; });
  });

  // ---------- Seitenwind-Rechner ----------
  var calc = F.$('[data-wc-calc]');
  if (calc) {
    var dirIn = F.$('#wc-dir', calc), spdIn = F.$('#wc-spd', calc);
    var af = (F.data.site && F.data.site.airfield) || { rwy33: 334, rwy15: 154 };
    var HEAD = { 33: af.rwy33, 15: af.rwy15 };
    var fill = function (inp) { inp.style.setProperty('--fill', ((inp.value - inp.min) / (inp.max - inp.min) * 100) + '%'); };
    var update = function () {
      var dir = +dirIn.value, spd = +spdIn.value;
      fill(dirIn); fill(spdIn);
      F.$('[data-wc-out="dir"]', calc).textContent = F.pad3(dir) + '°';
      F.$('[data-wc-out="spd"]', calc).textContent = spd + ' kt';
      var comp = {};
      [33, 15].forEach(function (n) { comp[n] = F.weather.components(dir, spd, HEAD[n]); });
      var calm = spd < 2, best = comp[33].head >= -2 ? 33 : 15;
      [33, 15].forEach(function (n) {
        var box = F.$('[data-wc-rwy="' + n + '"]', calc), c = comp[n];
        var h = Math.round(c.head), x = Math.round(c.cross);
        var hf = F.$('[data-wc-head]', box), xf = F.$('[data-wc-cross]', box);
        hf.style.width = Math.min(100, Math.abs(h) / 40 * 100) + '%';
        hf.classList.toggle('is-tail', h < 0);
        xf.style.width = Math.min(100, Math.abs(x) / 40 * 100) + '%';
        hf.parentNode.previousElementSibling.textContent = h < 0 ? 'Rückenwind' : 'Gegenwind';
        F.$('[data-wc-headval]', box).textContent = Math.abs(h) + ' kt';
        F.$('[data-wc-crossval]', box).textContent = Math.abs(x) + ' kt' + (x > 0 ? ' v. rechts' : x < 0 ? ' v. links' : '');
        var tag = F.$('[data-wc-tag]', box);
        var isBest = calm ? n === 33 : n === best;
        box.classList.toggle('is-best', isBest);
        box.classList.toggle('is-tail', !calm && h < 0);
        // Bezeichnung passend zur grösseren Komponente: fast reiner Querwind heisst "Seitenwind"
        var kind = (Math.abs(h) <= 2 && Math.abs(x) > Math.abs(h)) ? 'Seitenwind' : (h < 0 ? 'Rückenwind' : 'Gegenwind');
        if (calm) { tag.className = 'chip' + (n === 33 ? ' chip--ok' : ''); tag.textContent = n === 33 ? 'Primärpiste' : 'Windstill'; }
        else if (isBest) { tag.className = 'chip chip--ok'; tag.textContent = kind; }
        else { tag.className = 'chip' + (kind === 'Rückenwind' ? ' chip--warn' : ''); tag.textContent = kind; }
      });
    };
    [dirIn, spdIn].forEach(function (i) { i.addEventListener('input', update); });
    if (liveBtn) liveBtn.addEventListener('click', function () {
      var w = F.weather.data;
      if (!w) return;
      var d = Math.round(w.dir / 10) * 10; if (d <= 0) d = 360;
      dirIn.value = d; spdIn.value = Math.min(40, Math.round(w.speed));
      update();
      F.toast('Aktueller Wind übernommen: ' + w.windText);
    });
    update();
  }

  // ---------- Sonnenbogen ----------
  var sunBox = F.$('[data-wc-sun]');
  function toMin(s) { var p = String(s || '').split(':'); return p.length === 2 ? (+p[0]) * 60 + (+p[1]) : null; }
  function dur(m) { m = Math.max(0, Math.round(m)); var h = Math.floor(m / 60), r = m % 60; return (h ? h + ' h ' : '') + r + ' min'; }
  function sun() {
    if (!sunBox || !F.status || !F.status.sunTimes) return;
    var z = F.zurich(new Date()), t = F.status.sunTimes(z.y, z.m, z.d);
    if (!t) return;
    var rise = toMin(t.sunrise), set = toMin(t.sunset), now = z.minutes;
    var frac = Math.min(1, Math.max(0, (now - rise) / (set - rise)));
    var path = F.$('[data-wc-sun-done]', sunBox), dot = F.$('[data-wc-sun-dot]', sunBox), txt = F.$('[data-wc-sun-text]', sunBox);
    if (path && path.getTotalLength) {
      var pt = path.getPointAtLength(path.getTotalLength() * frac);
      dot.setAttribute('cx', pt.x.toFixed(1)); dot.setAttribute('cy', pt.y.toFixed(1));
      path.style.strokeDasharray = (frac * 100).toFixed(2) + ' 100';
    }
    sunBox.classList.toggle('is-night', now < rise || now > set);
    if (now < rise) txt.textContent = 'Die Sonne geht in ' + dur(rise - now) + ' auf.';
    else if (now <= set) txt.textContent = 'Noch ' + dur(set - now) + ' bis Sonnenuntergang. Flugbetrieb längstens bis zur Abenddämmerung.';
    else txt.textContent = 'Die Sonne ist untergegangen. Abenddämmerung heute um ' + t.dusk + '.';
  }
  F.ready(function () { sun(); setInterval(sun, 60000); });
})();
