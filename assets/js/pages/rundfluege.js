/* Rundflüge: Hero-Slides, Routenkarte (Leaflet + swisstopo), Flugzeug fliegt die Route ab,
   Routen-Skizzen, Personenrechner, Boarding Pass und Anfrage mit Live-Preis. */
(function () {
  'use strict';
  var F = window.FLUBAG;
  var ROUTES = (F.data && F.data.rundfluege) || [];
  if (!ROUTES.length) return;

  var HOME = [47.19, 8.2047];
  var reduced = F.reducedMotion;
  var byId = {};
  ROUTES.forEach(function (r, i) { byId[r.id] = r; r._i = i; });

  // Bekannte Orte entlang der Routen (für Beschriftungen von Wegpunkten)
  var POI = [
    ['Hallwilersee', 47.288, 8.222], ['Baldeggersee', 47.205, 8.262], ['Sempachersee', 47.145, 8.155],
    ['Luzern', 47.0517, 8.3075], ['Pilatus', 46.979, 8.2547], ['Rigi', 47.0567, 8.4853],
    ['Titlis', 46.772, 8.437], ['Mythen', 47.03, 8.68], ['Zugersee', 47.12, 8.5], ['Stanserhorn', 46.93, 8.34],
    ['Engelhorn', 46.66, 8.13], ['Eiger', 46.5775, 8.0053], ['Mönch', 46.5586, 7.9975], ['Jungfrau', 46.5367, 7.9625],
    ['Konkordiaplatz', 46.5, 8.03], ['Thunersee', 46.69, 7.71], ['Matterhorn', 45.9763, 7.6586], ['Goms', 46.45, 8.25],
    ['Grimselpass', 46.5617, 8.3372], ['Melchsee-Frutt', 46.775, 8.27], ['Vierwaldstättersee', 46.98, 8.4]
  ];
  var OVERVIEW = ['Luzern', 'Pilatus', 'Rigi', 'Titlis', 'Eiger', 'Matterhorn'];
  var SKETCH = ['Luzern', 'Hallwilersee', 'Baldeggersee', 'Sempachersee', 'Pilatus', 'Rigi', 'Titlis', 'Mythen', 'Stanserhorn', 'Eiger', 'Thunersee', 'Matterhorn', 'Grimselpass'];

  // ------------------------------------------------------------------ Geometrie
  function hav(a, b) {
    var R = 6371.0088, rad = Math.PI / 180;
    var dLat = (b[0] - a[0]) * rad, dLon = (b[1] - a[1]) * rad;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function poiName(p) {
    for (var i = 0; i < POI.length; i++) if (hav(p, [POI[i][1], POI[i][2]]) < 1.5) return POI[i][0];
    return '';
  }
  ROUTES.forEach(function (r) {
    var cum = [0];
    for (var i = 1; i < r.path.length; i++) cum.push(cum[i - 1] + hav(r.path[i - 1], r.path[i]));
    r._cum = cum;
    r._km = cum[cum.length - 1];
    r._kmR = Math.round(r._km / 5) * 5;
  });
  var minKm = Math.min.apply(null, ROUTES.map(function (r) { return r._kmR; }));
  var maxKm = Math.max.apply(null, ROUTES.map(function (r) { return r._kmR; }));
  var minDur = Math.min.apply(null, ROUTES.map(function (r) { return r.duration; }));
  var maxDur = Math.max.apply(null, ROUTES.map(function (r) { return r.duration; }));
  var minPrice = Math.min.apply(null, ROUTES.map(function (r) { return r.price; }));

  // Distanzen sofort einsetzen (vor dem Start der Animationen, damit data-count greift)
  F.$$('[data-rf-km]').forEach(function (el) {
    var r = byId[el.getAttribute('data-rf-km')];
    if (!r) return;
    el.textContent = r._kmR;
    el.setAttribute('data-count', String(r._kmR));
  });
  F.$$('[data-rf-dist]').forEach(function (el) {
    var r = byId[el.getAttribute('data-rf-dist')];
    if (r) el.textContent = 'ca. ' + r._kmR + ' km';
  });

  // ------------------------------------------------------------------ Skizzen (SVG, auch Fallback ohne Leaflet)
  var SVGNS = 'http://www.w3.org/2000/svg';
  function sketch(routes, opts) {
    opts = opts || {};
    var W = opts.w || 200, H = opts.h || 200, pad = opts.pad || 22;
    var pts = [];
    routes.forEach(function (r) { pts = pts.concat(r.path); });
    var lat0 = pts.reduce(function (s, p) { return s + p[0]; }, 0) / pts.length;
    var k = Math.cos(lat0 * Math.PI / 180);
    var xs = pts.map(function (p) { return p[1] * k; }), ys = pts.map(function (p) { return p[0]; });
    var minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs), minY = Math.min.apply(null, ys), maxY = Math.max.apply(null, ys);
    var sc = Math.min((W - 2 * pad) / (maxX - minX || 1), (H - 2 * pad) / (maxY - minY || 1));
    var ox = (W - (maxX - minX) * sc) / 2, oy = (H - (maxY - minY) * sc) / 2;
    function xy(p) { return [ox + (p[1] * k - minX) * sc, H - oy - (p[0] - minY) * sc]; }
    var svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('class', 'rf-sketch');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    var labels = {}, segs = [];
    routes.forEach(function (r) {
      for (var s = 1; s < r.path.length; s++) segs.push([xy(r.path[s - 1]), xy(r.path[s])]);
      var d = r.path.map(function (p, i) { var q = xy(p); return (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join(' ');
      var base = document.createElementNS(SVGNS, 'path');
      base.setAttribute('d', d); base.setAttribute('class', 'rf-sketch__base');
      var draw = document.createElementNS(SVGNS, 'path');
      draw.setAttribute('d', d); draw.setAttribute('class', 'rf-sketch__draw'); draw.setAttribute('pathLength', '1');
      svg.appendChild(base); svg.appendChild(draw);
      r.path.forEach(function (p, i) {
        if (i === 0 || i === r.path.length - 1) return;
        var q = xy(p), c = document.createElementNS(SVGNS, 'circle');
        c.setAttribute('cx', q[0].toFixed(1)); c.setAttribute('cy', q[1].toFixed(1)); c.setAttribute('r', opts.dot || 2.6);
        c.setAttribute('class', 'rf-sketch__wp');
        svg.appendChild(c);
        var n = poiName(p);
        if (n && (!opts.only || opts.only.indexOf(n) > -1)) labels[n] = q;
      });
    });
    // Beschriftungen platzieren: rechts, links, oben oder unten, ohne Überlappung
    var fs = opts.font || 9, cw = fs * 0.62, boxes = [];
    var h = xy(HOME);
    function hit(b) {
      if (b.x < 1 || b.x + b.w > W - 1 || b.y < 1 || b.y + b.h > H - 1) return true;
      return boxes.some(function (o) { return b.x < o.x + o.w && b.x + b.w > o.x && b.y < o.y + o.h && b.y + b.h > o.y; });
    }
    // Kreuzt eine Strecke der Route das Beschriftungs-Rechteck?
    function cross(a, c, d, e) {
      var d1 = (e[0] - d[0]) * (a[1] - d[1]) - (e[1] - d[1]) * (a[0] - d[0]);
      var d2 = (e[0] - d[0]) * (c[1] - d[1]) - (e[1] - d[1]) * (c[0] - d[0]);
      var d3 = (c[0] - a[0]) * (d[1] - a[1]) - (c[1] - a[1]) * (d[0] - a[0]);
      var d4 = (c[0] - a[0]) * (e[1] - a[1]) - (c[1] - a[1]) * (e[0] - a[0]);
      return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
    }
    function onLine(b) {
      var x0 = b.x - 1, y0 = b.y - 1, x1 = b.x + b.w + 1, y1 = b.y + b.h + 1;
      var edges = [[[x0, y0], [x1, y0]], [[x1, y0], [x1, y1]], [[x1, y1], [x0, y1]], [[x0, y1], [x0, y0]]];
      var inside = function (p) { return p[0] > x0 && p[0] < x1 && p[1] > y0 && p[1] < y1; };
      return segs.some(function (s) {
        if (inside(s[0]) || inside(s[1])) return true;
        return edges.some(function (e) { return cross(s[0], s[1], e[0], e[1]); });
      });
    }
    function place(name, q, cls, gap) {
      var w = name.length * cw, hh = fs + 2;
      var cand = [
        { x: q[0] + gap, y: q[1] - hh / 2, a: 'start' }, { x: q[0] - gap - w, y: q[1] - hh / 2, a: 'end' },
        { x: q[0] - w / 2, y: q[1] - gap - hh, a: 'middle' }, { x: q[0] - w / 2, y: q[1] + gap, a: 'middle' },
        { x: q[0] + gap * 0.7, y: q[1] - gap * 0.7 - hh, a: 'start' }, { x: q[0] - gap * 0.7 - w, y: q[1] - gap * 0.7 - hh, a: 'end' },
        { x: q[0] + gap * 0.7, y: q[1] + gap * 0.7, a: 'start' }, { x: q[0] - gap * 0.7 - w, y: q[1] + gap * 0.7, a: 'end' }
      ];
      // zuerst eine Position ohne Linie darunter, sonst die erste freie (Schrift hat einen Halo)
      var free = cand.filter(function (c) { return !hit({ x: c.x, y: c.y, w: w, h: hh }); });
      var clean = free.filter(function (c) { return !onLine({ x: c.x, y: c.y, w: w, h: hh }); });
      var pick = clean[0] || free[0];
      if (pick) cand = [pick];
      for (var i = 0; i < cand.length; i++) {
        var c = cand[i], b = { x: c.x, y: c.y, w: w, h: hh };
        if (hit(b)) continue;
        boxes.push(b);
        var t = document.createElementNS(SVGNS, 'text');
        t.setAttribute('x', (c.a === 'start' ? c.x : c.a === 'end' ? c.x + w : c.x + w / 2).toFixed(1));
        t.setAttribute('y', (c.y + hh - 2.5).toFixed(1));
        t.setAttribute('text-anchor', c.a);
        t.setAttribute('class', cls);
        t.textContent = name;
        svg.appendChild(t);
        return;
      }
    }
    var r0 = opts.home || 5;
    boxes.push({ x: h[0] - r0, y: h[1] - r0, w: 2 * r0, h: 2 * r0 });
    place('LSZO', h, 'rf-sketch__label rf-sketch__label--home', r0 + 4);
    Object.keys(labels).forEach(function (n) { place(n, labels[n], 'rf-sketch__label', 5); });
    var home = document.createElementNS(SVGNS, 'circle');
    home.setAttribute('cx', h[0].toFixed(1)); home.setAttribute('cy', h[1].toFixed(1)); home.setAttribute('r', r0);
    home.setAttribute('class', 'rf-sketch__home');
    svg.appendChild(home);
    return svg;
  }
  F.$$('[data-rf-sketch]').forEach(function (box) {
    var r = byId[box.getAttribute('data-rf-sketch')];
    if (!r) return;
    box.appendChild(sketch([r], { w: 200, h: 200, pad: 26, only: SKETCH }));
    var cap = document.createElement('span');
    cap.className = 'rf-route__sketch-cap mono';
    cap.textContent = 'ca. ' + r._kmR + ' km · ' + r.duration + ' min';
    box.appendChild(cap);
  });

  // ------------------------------------------------------------------ Hero: Bilder der Routen überblenden
  (function heroSlides() {
    var wrap = F.$('[data-rf-slides]');
    if (!wrap) return;
    var first = F.$('.rf-slide', wrap);
    var startId = first ? first.getAttribute('data-route-slide') : ROUTES[0].id;
    var start = byId[startId] ? byId[startId]._i : 0;
    var order = ROUTES.map(function (r, i) { return ROUTES[(start + i) % ROUTES.length]; });
    var slides = [first];
    order.slice(1).forEach(function (r) {
      var fig = document.createElement('figure');
      fig.className = 'rf-slide';
      fig.setAttribute('data-route-slide', r.id);
      fig.setAttribute('aria-hidden', 'true');
      var img = document.createElement('img');
      img.alt = '';
      img.decoding = 'async';
      fig.appendChild(img);
      wrap.appendChild(fig);
      slides.push(fig);
    });
    var ticks = F.$$('[data-route-tick]');
    var idxEl = F.$('[data-rf-slide-index]');
    var cur = 0, timer = null, DELAY = 6500;
    function mark() {
      var id = slides[cur].getAttribute('data-route-slide');
      ticks.forEach(function (t) { t.classList.toggle('is-active', t.getAttribute('data-route-tick') === id); });
      if (idxEl) idxEl.textContent = '0' + (byId[id]._i + 1);
    }
    function show(n) {
      var next = (n + slides.length) % slides.length;
      var img = slides[next].querySelector('img');
      if (!img.getAttribute('src')) return; // noch nicht geladen
      slides[cur].classList.remove('is-active');
      cur = next;
      slides[cur].classList.add('is-active');
      mark();
    }
    mark();
    // Auf kleinen Bildschirmen und bei Datensparmodus keine zusätzlichen grossen Bilder laden
    var saveData = navigator.connection && navigator.connection.saveData;
    if (reduced || saveData || window.matchMedia('(max-width: 760px)').matches) return;
    window.addEventListener('load', function () {
      // Bilder erst nach dem Laden der Seite nachladen, dann wechseln
      slides.slice(1).forEach(function (fig) {
        var src = F.$('#' + fig.getAttribute('data-route-slide') + ' .rf-route__frame img');
        var img = fig.querySelector('img');
        if (!src) return;
        img.sizes = '100vw';
        img.srcset = src.getAttribute('srcset') || '';
        img.src = src.getAttribute('src');
      });
      timer = setInterval(function () { if (!document.hidden) show(cur + 1); }, DELAY);
    });
    ticks.forEach(function (t) {
      t.addEventListener('mouseenter', function () {
        var i = slides.map(function (s) { return s.getAttribute('data-route-slide'); }).indexOf(t.getAttribute('data-route-tick'));
        if (i > -1 && i !== cur) { show(i); if (timer) { clearInterval(timer); timer = setInterval(function () { if (!document.hidden) show(cur + 1); }, DELAY); } }
      });
    });
  })();

  // ------------------------------------------------------------------ Boarding Pass (Gutschein-Teaser)
  function updatePass(r) {
    if (!r) return;
    var set = function (sel, v) { var el = F.$(sel); if (el) el.textContent = v; };
    set('[data-rf-pass-name]', r.name);
    set('[data-rf-pass-dur]', r.duration + ' min');
    set('[data-rf-pass-price]', F.chf(r.price));
  }

  // ------------------------------------------------------------------ Zahl weich hochzählen
  function tween(el, to, fmt) {
    var from = +(el.getAttribute('data-v') || 0);
    el.setAttribute('data-v', to);
    if (reduced || !window.gsap || from === to) { el.textContent = fmt(to); return; }
    var o = { v: from };
    gsap.to(o, { v: to, duration: 0.6, ease: 'power3.out', onUpdate: function () { el.textContent = fmt(Math.round(o.v)); } });
  }

  // ------------------------------------------------------------------ Personenrechner pro Route
  function calcPersons(id) {
    var box = F.$('[data-rf-calc="' + id + '"]');
    var c = box && box.querySelector('input:checked');
    return c ? +c.value : 1;
  }
  F.$$('[data-rf-calc]').forEach(function (box) {
    var price = +box.getAttribute('data-price');
    var sum = F.$('[data-rf-calc-sum]', box), note = F.$('[data-rf-calc-note]', box);
    sum.setAttribute('data-v', price);
    box.addEventListener('change', function () {
      var n = calcPersons(box.getAttribute('data-rf-calc'));
      note.textContent = 'Total für ' + n + (n === 1 ? ' Person' : ' Personen');
      tween(sum, price * n, F.chf);
    });
  });

  // ------------------------------------------------------------------ Anfrage-Formular: Route vorwählen, Live-Preis
  var form = F.$('form[data-form-name="Rundflug-Anfrage"]');
  var totalEl = form && F.$('[data-rf-total]', form);
  var totalNote = form && F.$('[data-rf-total-note]', form);
  var totalInput = form && F.$('[data-rf-total-input]', form);
  function formRoute() {
    var c = form && form.querySelector('input[name="rundflug"]:checked');
    return c ? byId[c.getAttribute('data-route')] : null;
  }
  function formPersons() {
    var c = form && form.querySelector('input[name="personen"]:checked');
    return c ? +c.value : 1;
  }
  function updateTotal() {
    if (!form) return;
    var r = formRoute(), n = formPersons();
    totalEl.classList.toggle('is-empty', !r);
    if (!r) {
      totalNote.textContent = 'Preis total';
      totalEl.textContent = 'Bitte Route wählen';
      totalEl.setAttribute('data-v', 0);
      totalInput.value = '';
      return;
    }
    totalNote.textContent = n + ' × ' + F.chf(r.price) + ' (' + r.duration + ' min)';
    tween(totalEl, r.price * n, F.chf);
    totalInput.value = F.chf(r.price * n) + ' (' + n + ' × ' + F.chf(r.price) + ')';
    updatePass(r);
  }
  function preselect(id, persons) {
    if (!form || !byId[id]) return;
    var radio = form.querySelector('input[name="rundflug"][data-route="' + id + '"]');
    if (radio) { radio.checked = true; radio.dispatchEvent(new Event('change', { bubbles: true })); }
    if (persons) {
      var p = form.querySelector('input[name="personen"][value="' + persons + '"]');
      if (p) { p.checked = true; p.dispatchEvent(new Event('change', { bubbles: true })); }
    }
    var card = radio && radio.closest('.choice');
    if (card && !reduced) { card.classList.remove('is-flash'); void card.offsetWidth; card.classList.add('is-flash'); }
  }
  if (form) {
    form.addEventListener('change', function (e) { if (e.target.name === 'rundflug' || e.target.name === 'personen') updateTotal(); });
    form.addEventListener('reset', function () { setTimeout(updateTotal, 0); });
    updateTotal();
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-rf-request]');
    if (!a) return;
    var id = a.getAttribute('data-rf-request');
    if (id) preselect(id, calcPersons(id));
  });

  // ------------------------------------------------------------------ Routenkarte
  var explorer = F.$('[data-rf-explorer]');
  var mapEl = F.$('[data-rf-map]');
  var pickBtns = F.$$('[data-rf-pick]');
  var hud = {
    code: F.$('[data-rf-hud-code]'), title: F.$('[data-rf-hud-title]'), dur: F.$('[data-rf-hud-dur]'),
    price: F.$('[data-rf-hud-price]'), dist: F.$('[data-rf-hud-dist]'), fill: F.$('[data-rf-hud-fill]'),
    actions: F.$('[data-rf-hud-actions]'), request: F.$('[data-rf-hud-request]'), details: F.$('[data-rf-hud-details]'),
    note: F.$('[data-rf-hud-note]'), replay: F.$('[data-rf-replay]')
  };
  var map = null, current = null, flight = null, layers = {}, activeLayer = 'karte';
  var wpLayer = null, overviewLayer = null, plane = null, planeRot = null, trail = null;

  function renderHud(r) {
    if (!hud.title) return;
    if (!r) {
      hud.code.textContent = 'LSZO · ' + ROUTES.length + ' ROUTEN';
      hud.title.textContent = 'Alle Routen';
      hud.dur.innerHTML = minDur + ' bis ' + maxDur + ' <small>min</small>';
      hud.price.innerHTML = '<small>ab</small> ' + F.chf(minPrice);
      hud.dist.innerHTML = minKm + ' bis ' + maxKm + ' <small>km</small>';
      hud.actions.hidden = true;
      hud.replay.hidden = true;
      hud.fill.style.width = '0%';
      hud.note.textContent = 'Wähle eine Route, das Flugzeug fliegt sie für dich ab.';
      return;
    }
    hud.code.textContent = 'ROUTE 0' + (r._i + 1) + ' · LSZO';
    hud.title.textContent = r.name;
    hud.dur.innerHTML = r.duration + ' <small>min</small>';
    hud.price.innerHTML = F.escape(F.chf(r.price));
    hud.dist.innerHTML = r._kmR + ' <small>km</small>';
    hud.actions.hidden = false;
    hud.request.setAttribute('data-rf-request', r.id);
    hud.details.setAttribute('href', '#' + r.id);
    hud.note.textContent = r.highlights.join(' · ');
  }

  var PLANE_SVG = '<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">' +
    '<g class="rf-plane__outline"><rect x="28.5" y="7" width="7" height="48" rx="3.5"/><rect x="3" y="19" width="58" height="9" rx="3"/><rect x="20" y="47" width="24" height="7" rx="2.5"/></g>' +
    '<g class="rf-plane__body"><rect x="28.5" y="7" width="7" height="48" rx="3.5"/><rect x="3" y="19" width="58" height="9" rx="3"/><rect x="20" y="47" width="24" height="7" rx="2.5"/></g>' +
    '<rect class="rf-plane__prop" x="23" y="3.5" width="18" height="2.4" rx="1.2"/><circle class="rf-plane__cockpit" cx="32" cy="17" r="2.2"/></svg>';

  function pathCls(layer, name, on) {
    var el = layer && layer.getElement && layer.getElement();
    if (el) el.classList.toggle(name, !!on);
  }
  function isWide() { return window.matchMedia('(min-width: 1024px)').matches; }
  function fitOpts() {
    var hudEl = F.$('[data-rf-hud]');
    var overlay = hudEl && getComputedStyle(hudEl).position === 'absolute';
    var bottom = overlay ? hudEl.offsetHeight + 34 : 30;
    var side = isWide() ? 48 : 22;
    return { paddingTopLeft: [isWide() ? 70 : side, 66], paddingBottomRight: [side, bottom], maxZoom: 12 };
  }
  var touched = false;
  function refit() {
    if (!map || touched) return;
    map.invalidateSize({ pan: false });
    map.fitBounds(current ? current._bounds : map._rfAll, fitOpts());
    setTimeout(declutter, 30);
  }

  function setLayer(name) {
    if (!map || !layers[name]) return;
    if (layers[activeLayer]) map.removeLayer(layers[activeLayer]);
    activeLayer = name;
    layers[name].addTo(map);
    mapEl.setAttribute('data-layer', name);
    F.$$('[data-rf-layer]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-rf-layer') === name)); });
  }

  function initMap(viaSelect) {
    if (map || !mapEl) return !!map;
    if (!window.L) { fallback(); return false; }
    var L = window.L;
    map = L.map(mapEl, {
      zoomControl: false, scrollWheelZoom: false, dragging: !F.isTouch, touchZoom: true, doubleClickZoom: true,
      minZoom: 7, maxZoom: 14, zoomSnap: 0.25, zoomDelta: 1, attributionControl: true, keyboard: true
    });
    if (map.attributionControl) map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
    var wide = isWide();
    L.control.zoom({ position: wide ? 'topleft' : 'bottomright', zoomInTitle: 'Hineinzoomen', zoomOutTitle: 'Herauszoomen' }).addTo(map);
    L.control.scale({ position: wide ? 'topleft' : 'bottomleft', imperial: false, maxWidth: 120 }).addTo(map);
    var base = 'https://wmts.geo.admin.ch/1.0.0/';
    var tiles = { karte: ['ch.swisstopo.pixelkarte-farbe', 'jpeg', 18], luftbild: ['ch.swisstopo.swissimage', 'jpeg', 19], icao: ['ch.bazl.luftfahrtkarten-icao', 'png', 12] };
    var loaded = 0, failed = 0;
    var offline = F.$('[data-rf-offline]');
    Object.keys(tiles).forEach(function (k) {
      var t = tiles[k];
      layers[k] = L.tileLayer(base + t[0] + '/default/current/3857/{z}/{x}/{y}.' + t[1], {
        maxNativeZoom: t[2], maxZoom: 14, attribution: k === 'icao' ? '© swisstopo, BAZL' : '© swisstopo'
      });
      layers[k].on('tileload', function () {
        loaded++;
        if (offline && !offline.hidden) { offline.hidden = true; mapEl.classList.remove('is-offline'); }
      });
      layers[k].on('tileerror', function () {
        failed++;
        if (failed >= 3 && loaded === 0 && offline) { offline.hidden = false; mapEl.classList.add('is-offline'); }
      });
    });
    setLayer(activeLayer);

    // Routen: Glow, gestrichelte Linie, unsichtbare breite Klickfläche
    var all = L.latLngBounds([]);
    ROUTES.forEach(function (r) {
      r._glow = L.polyline(r.path, { className: 'rf-line-glow', interactive: false, weight: 14, color: '#ff5a26' }).addTo(map);
      r._case = L.polyline(r.path, { className: 'rf-line-case', interactive: false, weight: 6, color: '#0b1426', lineJoin: 'round', lineCap: 'round' }).addTo(map);
      r._line = L.polyline(r.path, { className: 'rf-line', interactive: false, weight: 3, color: '#e63201', lineJoin: 'round', lineCap: 'round' }).addTo(map);
      r._hit = L.polyline(r.path, { className: 'rf-line-hit', weight: 20, opacity: 0, color: '#000' }).addTo(map);
      r._hit.bindTooltip(r.name + ' · ' + r.duration + ' min', { sticky: true, direction: 'top', className: 'wp-label', offset: [0, -8] });
      r._hit.on('click', function () { select(r.id); });
      r._bounds = r._line.getBounds();
      all.extend(r._bounds);
    });
    map._rfAll = all;
    trail = L.polyline([], { className: 'rf-trail', interactive: false, weight: 4, color: '#ffb08e', lineCap: 'round', lineJoin: 'round' }).addTo(map);

    // Übersichts-Beschriftungen
    overviewLayer = L.layerGroup().addTo(map);
    POI.forEach(function (p) {
      if (OVERVIEW.indexOf(p[0]) < 0) return;
      L.marker([p[1], p[2]], { icon: L.divIcon({ className: 'rf-wp', html: '<span class="wp-marker"></span>', iconSize: [10, 10] }), keyboard: false, interactive: false })
        .bindTooltip(p[0], { permanent: true, direction: 'right', className: 'wp-label rf-label', offset: [6, 0] })
        .addTo(overviewLayer);
    });
    wpLayer = L.layerGroup().addTo(map);
    map.on('zoomend moveend', declutter);

    // Heimatflugplatz
    L.marker(HOME, { icon: L.divIcon({ className: 'rf-home', html: '<span class="home-marker"></span>', iconSize: [18, 18] }), keyboard: false, interactive: false, zIndexOffset: 400 })
      .bindTooltip('LSZO Beromünster', { permanent: true, direction: 'left', className: 'wp-label rf-label rf-label--home', offset: [-10, 0] })
      .addTo(map);

    // Flugzeug
    plane = L.marker(HOME, { icon: L.divIcon({ className: 'rf-plane', html: '<span class="rf-plane__rot">' + PLANE_SVG + '</span>', iconSize: [46, 46], iconAnchor: [23, 23] }), keyboard: false, interactive: false, zIndexOffset: 1000 });

    map.fitBounds(all, fitOpts());
    setTimeout(declutter, 30);
    mapEl.classList.add('is-ready');
    // Grösse kann sich nach dem Laden der Schriften ändern: neu einpassen, solange niemand die Karte bewegt hat
    mapEl.addEventListener('pointerdown', function () { touched = true; });
    mapEl.addEventListener('wheel', function () { touched = true; }, { passive: true });
    if ('ResizeObserver' in window) {
      var rT = null, lastW = mapEl.clientWidth, lastH = mapEl.clientHeight;
      new ResizeObserver(function () {
        if (Math.abs(mapEl.clientWidth - lastW) < 2 && Math.abs(mapEl.clientHeight - lastH) < 2) return;
        lastW = mapEl.clientWidth; lastH = mapEl.clientHeight;
        clearTimeout(rT);
        rT = setTimeout(function () { if (!flight) refit(); else map.invalidateSize({ pan: false }); }, 160);
      }).observe(mapEl);
    }
    window.addEventListener('load', function () { setTimeout(function () { if (!flight) refit(); }, 100); });

    // Touch: ein Finger scrollt die Seite, zwei Finger bewegen die Karte
    if (F.isTouch) {
      var hint = F.$('[data-rf-touch-hint]'), shown = 0;
      mapEl.addEventListener('touchstart', function (e) {
        if (!hint || e.touches.length !== 1 || shown > 1) return;
        shown++;
        hint.hidden = false;
        setTimeout(function () { hint.hidden = true; }, 2200);
      }, { passive: true });
    }
    if (!viaSelect) { if (current) select(current.id, { instant: true, noFly: true }); else renderHud(null); }
    return true;
  }

  function fallback() {
    var box = F.$('[data-rf-fallback]');
    if (!box || box.firstChild) return;
    mapEl.classList.add('is-fallback');
    box.appendChild(sketch(ROUTES, { w: 600, h: 640, pad: 40, dot: 3.5, home: 7, font: 13, only: OVERVIEW }));
  }

  // Dauerhafte Beschriftungen, die sich überlappen, ausblenden (wichtige zuerst)
  function declutter() {
    if (!map) return;
    var tips = F.$$('.leaflet-tooltip.rf-label', mapEl);
    var prio = current ? current.highlights.join(' ') : '';
    tips.sort(function (a, b) {
      var pa = a.classList.contains('rf-label--home') ? 0 : prio.indexOf(a.textContent) > -1 ? 1 : 2;
      var pb = b.classList.contains('rf-label--home') ? 0 : prio.indexOf(b.textContent) > -1 ? 1 : 2;
      return pa - pb;
    });
    var placed = [];
    tips.forEach(function (t) {
      t.style.visibility = '';
      var r = t.getBoundingClientRect();
      var hitOther = placed.some(function (o) { return r.left < o.right + 2 && r.right > o.left - 2 && r.top < o.bottom - 2 && r.bottom > o.top + 2; });
      if (hitOther) t.style.visibility = 'hidden'; else placed.push(r);
    });
  }

  function stopFlight() {
    if (flight) { cancelAnimationFrame(flight.raf); clearTimeout(flight.wait); flight = null; }
  }

  function headingBetween(a, b) {
    var L = window.L;
    var p = L.CRS.EPSG3857.project(L.latLng(a[0], a[1])), q = L.CRS.EPSG3857.project(L.latLng(b[0], b[1]));
    var dx = q.x - p.x, dy = q.y - p.y;
    if (!dx && !dy) return null;
    return Math.atan2(dx, dy) * 180 / Math.PI;
  }

  function posAt(r, d) {
    var cum = r._cum, path = r.path, k = 0;
    while (k < cum.length - 2 && d > cum[k + 1]) k++;
    var seg = cum[k + 1] - cum[k] || 1, t = Math.max(0, Math.min(1, (d - cum[k]) / seg));
    var a = path[k], b = path[k + 1];
    return { ll: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], k: k };
  }

  function fly(r) {
    stopFlight();
    if (!map) return;
    var total = r._km;
    var dur = Math.min(16000, 5200 + total * 32);
    var ang = headingBetween(r.path[0], r.path[1]) || 0;
    plane.setLatLng(r.path[0]).addTo(map);
    var rotEl = plane.getElement() && plane.getElement().querySelector('.rf-plane__rot');
    hud.replay.hidden = true;
    mapEl.classList.add('is-flying');
    function place(p) {
      var e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; // weich starten und landen
      var d = e * total;
      var now = posAt(r, d), ahead = posAt(r, Math.min(total, d + Math.max(0.6, total * 0.015)));
      var target = headingBetween(now.ll, ahead.ll);
      if (target != null) {
        var diff = ((target - ang + 540) % 360) - 180;
        ang += diff * (p === 1 ? 1 : 0.18);
      }
      plane.setLatLng(now.ll);
      if (rotEl) rotEl.style.transform = 'rotate(' + ang.toFixed(1) + 'deg)';
      trail.setLatLngs(r.path.slice(0, now.k + 1).concat([now.ll]));
      hud.fill.style.width = (p * 100).toFixed(1) + '%';
    }
    function done() {
      mapEl.classList.remove('is-flying');
      hud.replay.hidden = false;
      hud.replay.querySelector('span').textContent = 'Nochmals';
      hud.note.textContent = 'Gelandet in Beromünster. In echt dauert dieser Flug ' + r.duration + ' Minuten.';
      flight = null;
    }
    if (reduced) { place(1); trail.setLatLngs(r.path); done(); return; }
    var t0 = null;
    flight = { raf: 0, wait: 0 };
    function frame(ts) {
      if (!flight) return;
      if (t0 == null) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur);
      place(p);
      if (p < 1) flight.raf = requestAnimationFrame(frame); else done();
    }
    flight.raf = requestAnimationFrame(frame);
  }

  function select(id, opts) {
    opts = opts || {};
    var r = id && id !== 'all' ? byId[id] : null;
    current = r;
    touched = false;
    pickBtns.forEach(function (b) {
      var on = b.getAttribute('data-rf-pick') === (r ? r.id : 'all');
      b.setAttribute('aria-pressed', String(on));
      if (on && opts.fromPicker && b.parentElement.scrollWidth > b.parentElement.clientWidth) {
        var box = b.parentElement;
        box.scrollTo({ left: b.offsetLeft - (box.clientWidth - b.offsetWidth) / 2, behavior: reduced ? 'auto' : 'smooth' });
      }
    });
    renderHud(r);
    if (r) updatePass(r);
    if (!map && !initMap(true)) return;
    var L = window.L;
    stopFlight();
    ROUTES.forEach(function (x) {
      pathCls(x._line, 'is-active', x === r);
      pathCls(x._line, 'is-dim', r && x !== r);
      pathCls(x._case, 'is-dim', r && x !== r);
      pathCls(x._case, 'is-active', x === r);
      pathCls(x._glow, 'is-active', x === r);
    });
    trail.setLatLngs([]);
    wpLayer.clearLayers();
    mapEl.classList.toggle('has-route', !!r);
    if (!r) {
      if (plane) map.removeLayer(plane);
      if (!map.hasLayer(overviewLayer)) overviewLayer.addTo(map);
      if (opts.instant || reduced) map.fitBounds(map._rfAll, fitOpts()); else map.flyToBounds(map._rfAll, Object.assign({ duration: 1 }, fitOpts()));
      setTimeout(declutter, 30);
      return;
    }
    r._case.bringToFront();
    r._line.bringToFront();
    trail.bringToFront();
    map.removeLayer(overviewLayer);
    var midLon = r._bounds.getCenter().lng;
    r.path.forEach(function (p, i) {
      if (i === 0 || i === r.path.length - 1) return;
      var name = poiName(p);
      var m = L.marker(p, { icon: L.divIcon({ className: 'rf-wp', html: '<span class="wp-marker' + (name ? ' is-named' : '') + '"></span>', iconSize: [10, 10] }), keyboard: false, interactive: false });
      var left = p[1] < midLon;
      if (name) m.bindTooltip(name, { permanent: true, direction: left ? 'left' : 'right', className: 'wp-label rf-label', offset: [left ? -6 : 6, 0] });
      m.addTo(wpLayer);
    });
    setTimeout(declutter, 0);
    if (plane) {
      plane.setLatLng(r.path[0]).addTo(map);
      var rot0 = plane.getElement() && plane.getElement().querySelector('.rf-plane__rot');
      if (rot0) rot0.style.transform = 'rotate(' + (headingBetween(r.path[0], r.path[1]) || 0).toFixed(1) + 'deg)';
    }
    hud.fill.style.width = '0%';
    if (opts.noFly) {
      map.fitBounds(r._bounds, fitOpts());
      hud.replay.hidden = false;
      hud.replay.querySelector('span').textContent = 'Abfliegen';
      return;
    }
    var go = function () { if (current === r) fly(r); };
    if (opts.instant || reduced) { map.fitBounds(r._bounds, fitOpts()); go(); return; }
    map.flyToBounds(r._bounds, Object.assign({ duration: 1.1 }, fitOpts()));
    var started = false;
    var start = function () { if (started) return; started = true; map.off('moveend', start); setTimeout(go, 150); };
    map.on('moveend', start);
    setTimeout(start, 1500);
  }

  pickBtns.forEach(function (b) {
    b.addEventListener('click', function () { select(b.getAttribute('data-rf-pick'), { fromPicker: true }); });
  });
  F.$$('[data-rf-layer]').forEach(function (b) {
    b.addEventListener('click', function () { if (!map) initMap(); setLayer(b.getAttribute('data-rf-layer')); });
  });
  if (hud.replay) hud.replay.addEventListener('click', function () { if (current) fly(current); });
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-rf-show]');
    if (a) select(a.getAttribute('data-rf-show'));
  });

  // Karte erst laden, wenn sie in die Nähe kommt (spart Kacheln beim ersten Laden)
  if (explorer && mapEl) {
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (en) {
        if (en.some(function (x) { return x.isIntersecting; })) { io.disconnect(); initMap(); }
      }, { rootMargin: '400px 0px' });
      io.observe(explorer);
    } else {
      F.ready(initMap);
    }
  }

  // Ohne Lenis (Touch, reduzierte Bewegung): Anker selbst anfahren, damit Formular-Vorauswahl und
  // Sprung zuverlässig zusammenspielen.
  document.addEventListener('click', function (e) {
    if (F.lenis || e.defaultPrevented || e.button) return;
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    var id = a && decodeURIComponent(a.getAttribute('href').slice(1));
    var t = id && document.getElementById(id);
    if (!t) return;
    e.preventDefault();
    t.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' });
    if (history.pushState) history.pushState(null, '', '#' + id);
  });

  // Vorauswahl über Anker (rundfluege.html#titlis) oder Parameter (?route=titlis)
  var params = new URLSearchParams(location.search);
  var pre = params.get('route') || decodeURIComponent((location.hash || '').slice(1));
  if (byId[pre]) {
    current = byId[pre];
    renderHud(current);
    updatePass(current);
    pickBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-rf-pick') === pre)); });
    if (form) F.ready(function () { if (!formRoute()) preselect(pre); });
  } else {
    renderHud(null);
  }
})();
