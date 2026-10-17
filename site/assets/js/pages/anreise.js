/* Anreise: Leaflet Karte (swisstopo), Routenplaner nach Verkehrsmittel, Kontakt als vCard, Distanz vom Standort */
(function () {
  'use strict';
  var F = window.FLUBAG;
  var af = (F.data.site && F.data.site.airfield) || { lat: 47.19, lon: 8.2047 };
  var HOME = [af.lat, af.lon];
  var DEST = af.lat + ',' + af.lon;

  // ---------- Routenplaner ----------
  var google = F.$('[data-an-google]'), apple = F.$('[data-an-apple]');
  var APPLE_FLAG = { driving: 'd', walking: 'w', transit: 'r' };
  function setMode(mode) {
    if (google) google.href = 'https://www.google.com/maps/dir/?api=1&destination=' + DEST + '&travelmode=' + mode;
    if (apple) apple.href = 'https://maps.apple.com/?daddr=' + DEST + (APPLE_FLAG[mode] ? '&dirflg=' + APPLE_FLAG[mode] : '');
  }
  F.$$('input[name="an-mode"]').forEach(function (r) {
    r.addEventListener('change', function () { if (r.checked) setMode(r.value); });
  });

  // ---------- Kontakt als vCard ----------
  var vbtn = F.$('[data-an-vcard]');
  if (vbtn) vbtn.addEventListener('click', function () {
    var s = F.data.site || {};
    var v = [
      'BEGIN:VCARD', 'VERSION:3.0',
      'FN:FLUBAG Flugbetriebs AG', 'ORG:FLUBAG Flugbetriebs AG Beromünster',
      'ADR;TYPE=WORK:;;Moos 3;Neudorf;;6025;Schweiz',
      'TEL;TYPE=WORK,VOICE:' + (s.phone || '+41 41 930 18 66'),
      'TEL;TYPE=WORK,FAX:' + (s.fax || '+41 41 930 33 57'),
      'EMAIL;TYPE=WORK:' + (s.email || 'flubag@flubag.ch'),
      'URL:' + (s.url || 'https://www.flubag.ch'),
      'GEO:' + af.lat + ';' + af.lon,
      'NOTE:Flugplatz Luzern-Beromünster (LSZO). Restaurant Flüüger: ' + ((s.restaurant && s.restaurant.phone) || '+41 41 930 12 98'),
      'END:VCARD'
    ].join('\r\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([v], { type: 'text/vcard;charset=utf-8' }));
    a.download = 'FLUBAG-Flugplatz-Beromuenster.vcf';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    F.toast('Kontakt gespeichert');
  });

  // ---------- Karte ----------
  var mapEl = F.$('[data-an-map]');
  var offline = F.$('[data-an-offline]');
  var map = null, layers = {}, active = 'karte', meLayer = null;

  function showOffline() {
    if (offline) offline.hidden = false;
    if (mapEl) mapEl.classList.add('is-offline');
  }

  function setLayer(name) {
    if (!map || !layers[name]) return;
    if (layers[active]) map.removeLayer(layers[active]);
    active = name;
    layers[name].addTo(map);
    F.$$('[data-an-layer]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-an-layer') === name)); });
  }

  function initMap() {
    if (map || !mapEl) return;
    if (!window.L) { showOffline(); return; }
    var L = window.L;
    map = L.map(mapEl, {
      center: HOME, zoom: window.innerWidth < 720 ? 11 : 12, minZoom: 7, maxZoom: 18, zoomControl: false,
      scrollWheelZoom: false, dragging: !F.isTouch, touchZoom: true, keyboard: true
    });
    L.control.zoom({ position: 'topleft', zoomInTitle: 'Hineinzoomen', zoomOutTitle: 'Herauszoomen' }).addTo(map);
    L.control.scale({ position: 'bottomright', imperial: false, maxWidth: 110 }).addTo(map);
    if (map.attributionControl) map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
    var base = 'https://wmts.geo.admin.ch/1.0.0/';
    var tiles = { karte: ['ch.swisstopo.pixelkarte-farbe', 'jpeg', 18], luftbild: ['ch.swisstopo.swissimage', 'jpeg', 19], icao: ['ch.bazl.luftfahrtkarten-icao', 'png', 12] };
    var loaded = 0, failed = 0;
    Object.keys(tiles).forEach(function (k) {
      var t = tiles[k];
      layers[k] = L.tileLayer(base + t[0] + '/default/current/3857/{z}/{x}/{y}.' + t[1], {
        maxNativeZoom: t[2], maxZoom: 18, attribution: k === 'icao' ? '© swisstopo, BAZL' : '© swisstopo'
      });
      layers[k].on('tileload', function () {
        loaded++;
        if (offline && !offline.hidden) { offline.hidden = true; mapEl.classList.remove('is-offline'); }
      });
      layers[k].on('tileerror', function () { failed++; if (failed >= 4 && loaded === 0) showOffline(); });
    });
    setLayer(active);

    var icon = L.divIcon({
      className: 'an-marker', iconSize: [20, 20], iconAnchor: [10, 10], popupAnchor: [0, -30],
      html: '<span class="an-marker__pulse"></span><span class="an-marker__dot"></span><span class="an-marker__label">LSZO</span>'
    });
    var s = F.data.site || {};
    L.marker(HOME, { icon: icon, title: 'Flugplatz Luzern-Beromünster', alt: 'Flugplatz Luzern-Beromünster', zIndexOffset: 500 })
      .addTo(map)
      .bindPopup('<strong>Flugplatz Luzern-Beromünster</strong>FLUBAG Flugbetriebs AG<br>Moos 3, 6025 Neudorf<br><a href="https://www.google.com/maps/dir/?api=1&destination=' + DEST + '" target="_blank" rel="noopener">Route planen</a> · <a href="tel:' + (s.phoneHref || '+41419301866') + '">' + F.escape(s.phone || '+41 41 930 18 66') + '</a>');
  }

  F.$$('[data-an-layer]').forEach(function (b) {
    b.addEventListener('click', function () { initMap(); setLayer(b.getAttribute('data-an-layer')); });
  });

  if (mapEl) {
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (en) {
        if (en.some(function (e) { return e.isIntersecting; })) { io.disconnect(); initMap(); }
      }, { rootMargin: '400px 0px' });
      io.observe(mapEl);
    } else initMap();
  }

  // ---------- Distanz vom eigenen Standort (Luftlinie) ----------
  var locBtn = F.$('[data-an-locate]'), result = F.$('[data-an-result]');
  function rad(d) { return d * Math.PI / 180; }
  function distKm(a, b) {
    var dLat = rad(b[0] - a[0]), dLon = rad(b[1] - a[1]);
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }
  function bearing(a, b) {
    var y = Math.sin(rad(b[1] - a[1])) * Math.cos(rad(b[0]));
    var x = Math.cos(rad(a[0])) * Math.sin(rad(b[0])) - Math.sin(rad(a[0])) * Math.cos(rad(b[0])) * Math.cos(rad(b[1] - a[1]));
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  }
  function say(html) { if (result) { result.innerHTML = html; result.hidden = false; } }
  if (locBtn) locBtn.addEventListener('click', function () {
    if (!navigator.geolocation) { say('Dein Browser kann den Standort nicht bestimmen.'); return; }
    say('Standort wird bestimmt …');
    navigator.geolocation.getCurrentPosition(function (pos) {
      var me = [pos.coords.latitude, pos.coords.longitude];
      var km = distKm(me, HOME), brg = bearing(me, HOME);
      var dirs = ['Norden', 'Nordosten', 'Osten', 'Südosten', 'Süden', 'Südwesten', 'Westen', 'Nordwesten'];
      var nm = km / 1.852;
      say('Luftlinie <strong>' + (km < 10 ? km.toFixed(1) : Math.round(km)).toString() + ' km</strong> (' + Math.round(nm) + ' NM). Der Flugplatz liegt von dir aus Richtung ' + dirs[Math.round(brg / 45) % 8] + ' (' + F.pad3(Math.round(brg)) + '°). Die Strecke auf der Strasse ist länger.');
      initMap();
      if (map && window.L) {
        if (meLayer) map.removeLayer(meLayer);
        meLayer = window.L.layerGroup([
          window.L.polyline([me, HOME], { color: '#e63201', weight: 3, dashArray: '8 8', interactive: false }),
          window.L.marker(me, { icon: window.L.divIcon({ className: '', html: '<span class="an-me" style="display:block"></span>', iconSize: [16, 16], iconAnchor: [8, 8] }), keyboard: false, interactive: false })
        ]).addTo(map);
        map.fitBounds(window.L.latLngBounds([me, HOME]), { padding: [60, 60], maxZoom: 13 });
      }
    }, function () {
      say('Standort nicht verfügbar. Bitte erlaube den Zugriff auf deinen Standort oder plane die Route direkt.');
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 });
  });
})();
