/* 404 "Go around!": angeforderte Adresse zeigen, Animation steuern,
   alte Adressen der früheren Website (z.B. /de/node/137) der neuen Seite zuordnen. */
(function () {
  'use strict';
  var F = window.FLUBAG;
  var me = document.currentScript && document.currentScript.src;
  // Wurzel der Website aus der Adresse dieses Skripts (funktioniert auch unter /de/node/...)
  var root = me ? me.replace(/assets\/js\/pages\/404\.js.*$/, '') : location.origin + '/';

  var path = location.pathname || '/';
  var shown = path + location.search;
  try { shown = decodeURI(shown); } catch (e) { /* ungültige Kodierung */ }
  if (shown.length > 90) shown = shown.slice(0, 87) + '...';
  F.$$('[data-ga-path]').forEach(function (el) { el.textContent = shown; });

  // Fehlerhaften Link melden: Adresse und Herkunft gleich mitschicken
  F.$$('[data-ga-report]').forEach(function (a) {
    var body = 'Diese Adresse führt auf eine Fehlerseite:\n' + location.href + (document.referrer ? '\nGefunden auf: ' + document.referrer : '');
    a.href = a.getAttribute('href') + '&body=' + encodeURIComponent(body);
  });

  // Zurück: nur wenn es eine vorherige Seite gibt, sonst zur Startseite
  F.$$('[data-ga-back]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (document.referrer && history.length > 1) history.back();
      else location.href = root + 'index.html';
    });
  });

  // Animation: SMIL (Flugzeug) und CSS (Spur) gemeinsam neu starten
  var scene = F.$('[data-ga-scene]');
  var svg = scene && F.$('svg', scene);
  function restart() {
    if (!svg || !svg.setCurrentTime) return;
    scene.classList.add('is-restart');
    void scene.offsetWidth;
    svg.setCurrentTime(0);
    scene.classList.remove('is-restart');
    if (svg.unpauseAnimations) svg.unpauseAnimations();
  }
  if (svg && F.reducedMotion && svg.pauseAnimations) {
    svg.pauseAnimations();
    try { svg.setCurrentTime(5); } catch (e) { /* älterer Browser */ }
  }
  F.$$('[data-ga-replay]').forEach(function (b) {
    b.addEventListener('click', function () {
      restart();
      if (F.reducedMotion && svg && svg.pauseAnimations) setTimeout(function () { svg.pauseAnimations(); }, 5600);
    });
  });

  // Alte Adressen (Drupal) auf neue Seiten abbilden
  var NODES = {
    '': 'index.html', 'becoming-a-pilot': 'infoabende.html', 'contact/infoabend_wie_werde_ich_pilot_': 'infoabende.html#anmeldung',
    'flight-instructors': 'fluglehrer.html', 'pilots': 'piloten.html', 'webcams': 'webcams.html',
    'node/45': 'ausbildung.html', 'node/46': 'zollanmeldung.html', 'node/47': 'preise.html', 'node/52': 'geschichte.html',
    'node/58': 'sprungbetrieb.html', 'node/59': 'parkordnung.html', 'node/64': 'weisungen.html', 'node/66': 'checkflug-flarm.html',
    'node/67': 'schnupperflug.html', 'node/84': 'infoabende.html', 'node/71': 'briefing-links.html', 'node/75': 'piste-33.html', 'node/82': 'news-hangarierung.html',
    'node/90': 'datenschutz.html#cookies', 'node/94': 'airport-briefing.html', 'node/105': 'safety-policy.html',
    'node/106': 'reporting.html', 'node/107': 'reporting.html', 'node/108': 'reporting.html', 'node/109': 'reporting.html',
    'node/110': 'reporting.html', 'node/123': 'anreise.html', 'node/134': 'news-gratulation-ppl.html',
    'node/137': 'news-ziellandekonkurrenz-2026.html'
  };
  var WORDS = [
    [/schnupper|discovery/, 'schnupperflug.html'], [/rundfl|sightseeing/, 'rundfluege.html'], [/gutschein|voucher/, 'gutscheine.html'],
    [/infoabend/, 'infoabende.html'], [/fluglehrer|instructor/, 'fluglehrer.html'], [/ausbildung|ppl|lapl|training/, 'ausbildung.html'],
    [/flotte|fleet|aircraft|flugzeug/, 'flotte.html'], [/webcam|wetter|weather/, 'webcams.html'], [/anreise|direction|anfahrt/, 'anreise.html'],
    [/zoll|customs/, 'zollanmeldung.html'], [/preis|price/, 'preise.html'], [/geschichte|history/, 'geschichte.html'],
    [/news|aktuell/, 'aktuelles.html'], [/impressum|imprint/, 'impressum.html'], [/datenschutz|privacy|cookie/, 'datenschutz.html'],
    [/kontakt|contact/, 'kontakt.html'], [/pilot/, 'piloten.html']
  ];
  var NAMES = {
    'index.html': 'Startseite', 'infoabende.html': 'Infoabende', 'fluglehrer.html': 'Unsere Fluglehrer', 'piloten.html': 'Pilotenbereich',
    'webcams.html': 'Webcams und Wetter', 'ausbildung.html': 'Ausbildung PPL und LAPL', 'zollanmeldung.html': 'Zollanmeldung',
    'preise.html': 'Preise', 'geschichte.html': 'Geschichte und Team', 'sprungbetrieb.html': 'Regeln Sprungbetrieb',
    'parkordnung.html': 'Parkordnung', 'weisungen.html': 'Weisung Piloten 2026', 'checkflug-flarm.html': 'Checkflug und FLARM',
    'schnupperflug.html': 'Schnupperflug', 'briefing-links.html': 'Briefing Links', 'piste-33.html': 'Anflug und Abflug Piste 33',
    'news-hangarierung.html': 'Hangarierungsschäden vermeiden', 'datenschutz.html': 'Datenschutz und Cookies',
    'airport-briefing.html': 'Airport Briefing', 'safety-policy.html': 'Safety Policy', 'reporting.html': 'Ereignisse melden',
    'anreise.html': 'Anreise', 'news-gratulation-ppl.html': 'Gratulation zur PPL', 'news-ziellandekonkurrenz-2026.html': 'Ziellandekonkurrenz 2026',
    'rundfluege.html': 'Rundflüge', 'gutscheine.html': 'Gutscheine', 'flotte.html': 'Unsere Flotte', 'aktuelles.html': 'Aktuelles',
    'impressum.html': 'Impressum', 'kontakt.html': 'Kontakt'
  };

  function lookup(p) {
    var rel = p.toLowerCase().replace(/^\/+|\/+$/g, '');
    var lang = /^(de|en|fr|it)(\/|$)/.test(rel);
    var key = rel.replace(/^(de|en|fr|it)(\/|$)/, '');
    if (lang && Object.prototype.hasOwnProperty.call(NODES, key)) return NODES[key];
    for (var i = 0; i < WORDS.length; i++) if (WORDS[i][0].test(key)) return WORDS[i][1];
    return null;
  }

  var target = lookup(path);
  var box = F.$('[data-ga-redirect]');
  if (target && box) {
    var link = F.$('[data-ga-redirect-link]', box);
    link.href = root + target;
    link.textContent = NAMES[target.split('#')[0]] || target;
    if (!/^\/?(de|en|fr|it)(\/|$)/i.test(path)) { F.$('strong', box).textContent = 'Suchst du vielleicht diese Seite?'; F.$('[data-ga-redirect-text]', box).textContent = 'Passend zu deiner Adresse:'; }
    box.hidden = false;
  }
})();
