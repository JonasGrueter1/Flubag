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
    w.dirName = w.calm ? 'variabel' : dirName(w.dir);
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
    var h = Math.round(comp.head);
    w.rwyText = w.calm ? 'Windstill, Piste 33 primär' : 'Piste ' + best + ': ' + (Math.abs(h) <= 1 ? 'kaum Längswind' : Math.abs(h) + ' kt ' + (h > 0 ? 'Gegenwind' : 'Rückenwind')) + ', ' + Math.abs(Math.round(comp.cross)) + ' kt Seitenwind';
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
          // Notlösung: lieber ein älteres Wetter zeigen (mit Zeitstempel im Cache) als gar keins
          if (cached && cached.raw) { self.set(cached.raw); return; }
          F.$$('[data-wx-field]').forEach(function (el) { if (el.textContent === '--') el.textContent = 'nicht verfügbar'; });
          document.documentElement.classList.add('wx-error');
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
