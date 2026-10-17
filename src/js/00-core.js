/* FLUBAG Kern: Namespace, Konfiguration, Hilfsfunktionen */
(function () {
  'use strict';
  var F = (window.FLUBAG = window.FLUBAG || {});

  // ------------------------------------------------------------------
  // KONFIGURATION: hier stellt FLUBAG ein, wohin Formulare gesendet werden.
  //   mode "auto":      zuerst an endpoint senden, sonst E-Mail-Programm öffnen
  //   mode "mailto":    immer das E-Mail-Programm öffnen
  //   endpoint:         "api/send.php" (liegt bei, braucht PHP Hosting)
  //                     oder z.B. eine Formspree URL "https://formspree.io/f/xxxx"
  //
  // LIVE-DATEN: hier lassen sich die Live-Anzeigen ganz abschalten (true = an, false = aus).
  //   status:  Platzstatus, Wochenleiste der Betriebszeiten, Sonnenzeiten (berechnet aus der Weisung Piloten)
  //   weather: Wetter von Open-Meteo, Seitenwind-Widget, Wetterwerte in der Statusleiste
  // Ausgeschaltet wird nichts geladen bzw. gerechnet, und alle Elemente mit data-live="status"
  // bzw. data-live="weather" sind ausgeblendet. Danach neu bauen (npm run build).
  // ------------------------------------------------------------------
  F.config = {
    form: {
      mode: 'auto',
      endpoint: 'api/send.php',
      email: 'flubag@flubag.ch'
    },
    live: { status: true, weather: true },
    weather: { lat: 47.19, lon: 8.2047, cacheMinutes: 10 },
    tz: 'Europe/Zurich'
  };

  // Live-Schalter auf <html> spiegeln (der Build setzt die Klassen schon im HTML, das hier gilt zur Laufzeit)
  F.live = function (k) { var l = F.config.live || {}; return l[k] !== false; };
  ['status', 'weather'].forEach(function (k) { document.documentElement.classList.toggle('live-off-' + k, !F.live(k)); });

  // Hinweis an allen Live-Anzeigen: Kurzform sichtbar am Widget, Langform als Fussnote
  F.LIVE_SHORT = 'Richtwert ohne Gewähr';
  F.liveBadge = function (cls) {
    return '<span class="live-badge' + (cls ? ' ' + cls : '') + '">' + F.icon('info') + F.LIVE_SHORT + '</span>';
  };
  F.liveNote = function (cls) {
    return '<p class="live-note' + (cls ? ' ' + cls : '') + '" data-live-note>Richtwerte ohne Gewähr: Platzstatus nach unserer Auslegung der <a href="weisungen.html">Weisung Piloten</a>, ' +
      'Wetter aus Modelldaten von Open-Meteo, kein METAR. Massgebend sind die Weisung Piloten und die offiziellen Flugwetterinformationen (skybriefing, MeteoSchweiz).</p>';
  };
  // Mehrere Live-Widgets im selben Abschnitt: die Langform nur einmal zeigen (beim letzten Widget)
  F.liveNotes = function () {
    var groups = [], last = [];
    F.$$('[data-live-note]').forEach(function (n) {
      var g = n.closest('section, footer, aside') || document.body, i = groups.indexOf(g);
      if (i < 0) { groups.push(g); last.push(n); } else last[i] = n;
    });
    F.$$('[data-live-note]').forEach(function (n) { n.hidden = last.indexOf(n) < 0; });
  };

  F.data = window.FLUBAG_DATA || {};
  F.$ = function (sel, root) { return (root || document).querySelector(sel); };
  F.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  F.on = function (el, ev, fn, opt) { if (el) el.addEventListener(ev, fn, opt); };
  F.emit = function (name, detail) { document.dispatchEvent(new CustomEvent(name, { detail: detail })); };
  F.listen = function (name, fn) { document.addEventListener(name, function (e) { fn(e.detail); }); };
  F.reducedMotion = document.documentElement.classList.contains('reduced-motion');
  F.isTouch = window.matchMedia('(hover: none)').matches;
  F.hasGsap = function () { return !!(window.gsap && window.ScrollTrigger); };

  F.store = {
    get: function (k, session) { try { return JSON.parse((session ? sessionStorage : localStorage).getItem(k)); } catch (e) { return null; } },
    set: function (k, v, session) { try { (session ? sessionStorage : localStorage).setItem(k, JSON.stringify(v)); } catch (e) { /* privat / blockiert */ } }
  };

  F.chf = function (n, decimals) {
    var d = decimals == null ? (n % 1 ? 2 : 0) : decimals;
    return 'CHF ' + Number(n).toLocaleString('de-CH', { minimumFractionDigits: d, maximumFractionDigits: d });
  };
  F.num = function (n, d) { return Number(n).toLocaleString('de-CH', { maximumFractionDigits: d || 0 }); };
  F.pad = function (n) { return (n < 10 ? '0' : '') + n; };
  F.icon = function (name) {
    var tpl = document.getElementById('icon-' + name);
    return tpl ? tpl.innerHTML : '';
  };
  F.escape = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  };

  // Uhrzeit in Zürich (unabhängig von der Zeitzone des Besuchers)
  F.zurich = function (date) {
    var d = date || new Date();
    var parts = new Intl.DateTimeFormat('de-CH', { timeZone: F.config.tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23' }).formatToParts(d);
    var o = {};
    parts.forEach(function (p) { o[p.type] = p.value; });
    var wd = { 'So': 0, 'Mo': 1, 'Di': 2, 'Mi': 3, 'Do': 4, 'Fr': 5, 'Sa': 6 }[(o.weekday || '').replace('.', '')];
    return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour, min: +o.minute, wd: wd, minutes: +o.hour * 60 + +o.minute };
  };
  F.fmtTime = function (date) {
    return new Intl.DateTimeFormat('de-CH', { timeZone: F.config.tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);
  };
  F.minToTime = function (m) { m = Math.round(m); return F.pad(Math.floor(m / 60) % 24) + ':' + F.pad(m % 60); };

  // F.ready(fn): läuft, sobald alle Module gestartet sind (auch wenn später registriert)
  var readyFns = [], booted = false;
  F.ready = function (fn) { if (booted) { try { fn(); } catch (e) { console.error(e); } } else readyFns.push(fn); };
  F._runReady = function () { booted = true; readyFns.forEach(function (fn) { try { fn(); } catch (e) { console.error(e); } }); };
})();
