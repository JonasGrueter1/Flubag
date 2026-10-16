/* Gutscheine: Konfigurator mit Live-Bordkarte, Druckvorschau, Mini-Leiste (Handy),
   Flugpfad "So funktioniert's" und Gutschein einlösen */
(function () {
  'use strict';
  var F = window.FLUBAG;
  var root = F.$('[data-gift]');
  if (!root) return;

  var D = F.data || {};
  var ROUTES = D.rundfluege || [];
  var P = D.preise || {};
  var SCHNUPPER = P.schnupperflug || [];
  var SHOP_ALL = (D.site && D.site.shop) || 'https://shop.e-guma.ch/flubag/de/gutscheine';
  var MIN = 20, MAX = 3000, STORE_KEY = 'flubag-gift';
  var CODES = { luzern: 'LUZ', 'pilatus-rigi': 'PIL', titlis: 'TIT', 'eiger-moench-jungfrau': 'JFJ', matterhorn: 'MAT', schnupperflug: 'FLY', wertgutschein: 'GIFT' };
  var PLACES = { luzern: 'Luzern', 'pilatus-rigi': 'Pilatus & Rigi', titlis: 'Titlis', 'eiger-moench-jungfrau': 'Jungfraujoch', matterhorn: 'Matterhorn', schnupperflug: 'Selber fliegen', wertgutschein: 'Freie Wahl' };
  var PH = { fuer: 'Dein Lieblingsmensch', von: 'Dein Name', msg: 'Hier erscheint deine Widmung.' };

  var form = F.$('[data-gift-form]', root);
  var pass = F.$('[data-gift-pass]', root);
  var dock = F.$('[data-gift-dock]', root);
  var shopBtn = F.$('[data-gift-shop]', root);
  var printBtn = F.$('[data-gift-print]', root);
  var liveEl = F.$('[data-gift-live]', root);
  var ownWrap = F.$('[data-gift-own]', root);
  var ownInput = F.$('#g-eigen', root);
  var msgInput = F.$('#g-widmung', root);
  var countEl = F.$('[data-gift-count]', root);
  var countSr = F.$('[data-gift-count-sr]', root);
  var ringEl = F.$('[data-gift-ring]', root);
  if (!form || !pass) return;

  function q(key, scope) { return F.$('[data-p="' + key + '"]', scope || pass); }
  function routeById(id) { for (var i = 0; i < ROUTES.length; i++) if (ROUTES[i].id === id) return ROUTES[i]; return null; }
  function schnupperByKey(k) { for (var i = 0; i < SCHNUPPER.length; i++) if (SCHNUPPER[i].shop === k) return SCHNUPPER[i]; return SCHNUPPER[0]; }
  function kindOf(id) { return routeById(id) ? 'rundflug' : (id === 'schnupperflug' ? 'schnupperflug' : 'wertgutschein'); }
  function validId(id) { return !!(routeById(id) || id === 'schnupperflug' || id === 'wertgutschein'); }

  // ---------------------------------------------------------------- Zustand
  var state = { id: 'eiger-moench-jungfrau', personen: '1', schnupper: SCHNUPPER[0] ? SCHNUPPER[0].shop : '', betrag: '100', eigen: '', fuer: '', von: '', widmung: '', versand: 'print' };
  var DEFAULTS = JSON.parse(JSON.stringify(state));
  var lastAmount = 100;

  function radio(name) { var r = form.querySelector('input[name="' + name + '"]:checked'); return r ? r.value : ''; }
  function setRadio(name, value) {
    F.$$('input[name="' + name + '"]', form).forEach(function (r) { r.checked = r.value === String(value); });
  }
  function readForm() {
    state.id = radio('gutschein') || state.id;
    state.personen = radio('personen') || '1';
    state.schnupper = radio('schnupper') || state.schnupper;
    state.betrag = radio('betrag') || state.betrag;
    state.eigen = ownInput.value;
    state.fuer = form.elements.fuer.value;
    state.von = form.elements.von.value;
    state.widmung = msgInput.value;
    state.versand = radio('versand') || 'print';
  }
  function writeForm() {
    setRadio('gutschein', state.id);
    setRadio('personen', state.personen);
    setRadio('schnupper', state.schnupper);
    setRadio('betrag', state.betrag);
    ownInput.value = state.eigen;
    form.elements.fuer.value = state.fuer;
    form.elements.von.value = state.von;
    msgInput.value = state.widmung.slice(0, 160);
    setRadio('versand', state.versand);
  }

  function amount() {
    if (state.betrag !== 'eigen') { lastAmount = +state.betrag || 100; return lastAmount; }
    var v = Math.round(+state.eigen);
    if (state.eigen !== '' && v >= MIN && v <= MAX) { lastAmount = v; return v; }
    return lastAmount;
  }

  // Alles, was die Bordkarte zeigt, aus dem Zustand berechnen
  function compute() {
    var kind = kindOf(state.id), v = { kind: kind, code: CODES[state.id], place: PLACES[state.id] };
    if (kind === 'rundflug') {
      var r = routeById(state.id), n = Math.min(3, Math.max(1, +state.personen || 1));
      v.kindLabel = 'Rundflug'; v.flug = r.name; v.title = r.title; v.dauer = r.duration + ' min';
      v.xLabel = 'Personen'; v.x = n + (n > 1 ? '\u00a0Personen' : '\u00a0Person');
      v.price = r.price * n; v.priceLabel = n + ' × ' + F.chf(r.price); v.shop = r.shop; v.shopTitle = r.title;
      v.what = r.title + ' · ' + v.x;
    } else if (kind === 'schnupperflug') {
      var o = schnupperByKey(state.schnupper);
      v.kindLabel = 'Erlebnis'; v.flug = 'Schnupperflug'; v.title = 'Schnupperflug ' + o.aircraft; v.dauer = o.minutes + ' min';
      v.xLabel = 'Flugzeug'; v.x = o.aircraft;
      v.price = o.price; v.priceLabel = 'inkl. Fluglehrer'; v.shop = P.schnupperflugShop || SHOP_ALL; v.shopTitle = 'Schnupperflug verschenken';
      v.what = 'Schnupperflug · ' + o.aircraft + ' · ' + o.minutes + ' min';
    } else {
      var a = amount();
      v.kindLabel = 'Gutschein'; v.flug = 'Wertgutschein'; v.title = 'Wertgutschein'; v.dauer = 'Nach Wahl';
      v.xLabel = 'Einlösbar für'; v.x = 'Rund- und Schnupperflüge';
      v.price = a; v.priceLabel = 'Wert'; v.shop = P.wertgutscheinShop || SHOP_ALL; v.shopTitle = 'Wertgutschein';
      v.what = 'Wertgutschein · ' + F.chf(a);
    }
    v.versand = state.versand === 'post' ? 'Postversand' : 'print@home';
    return v;
  }

  // ---------------------------------------------------------------- Effekte
  var animate = !F.reducedMotion;
  function swap(el) {
    if (!el || !animate) return;
    el.classList.remove('is-swap'); void el.offsetWidth; el.classList.add('is-swap');
  }
  function setText(el, text, fx) {
    if (!el || el.textContent === text) return false;
    el.textContent = text;
    if (fx) swap(el);
    return true;
  }

  // Abflugtafel-Effekt für den Ziel-Code
  var LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  function flap(el, to) {
    if (!el) return;
    if (el._to === to) return;
    el._to = to;
    clearInterval(el._iv);
    if (!animate || !el._ready) { el.textContent = to; el._ready = true; return; }
    el.style.width = '';
    el.textContent = to;
    var w = el.getBoundingClientRect().width;
    el.style.width = Math.ceil(w) + 'px';
    el.classList.add('is-flapping');
    var frame = 0, n = to.length;
    el._iv = setInterval(function () {
      frame++;
      var out = '';
      for (var i = 0; i < n; i++) out += frame > 3 + i * 3 ? to.charAt(i) : LETTERS.charAt(Math.floor(Math.random() * 26));
      el.textContent = out;
      if (frame > 3 + n * 3) { clearInterval(el._iv); el.textContent = to; el.style.width = ''; el.classList.remove('is-flapping'); }
    }, 42);
  }

  // Preis weich hochzählen
  function tween(el, to) {
    if (!el) return;
    var from = el._val == null ? to : el._val;
    el._val = to;
    cancelAnimationFrame(el._raf);
    if (!animate || from === to) { el.textContent = F.chf(to); return; }
    var t0 = performance.now(), dur = 700;
    (function step(t) {
      var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = F.chf(Math.round(from + (to - from) * e));
      if (k < 1) el._raf = requestAnimationFrame(step);
    })(t0);
  }

  // Strichcode, abhängig von der Auswahl (nur Dekoration)
  function barcode(seed) {
    var h = 2166136261 >>> 0, i;
    for (i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    function rnd() { h ^= h << 13; h >>>= 0; h ^= h >>> 17; h ^= h << 5; h >>>= 0; return (h % 1000) / 1000; }
    var x = 0, rects = '';
    while (x < 196) {
      var w = 1 + Math.floor(rnd() * 3.2);
      rects += '<rect x="' + x + '" width="' + w + '" height="52"/>';
      x += w + 1 + Math.floor(rnd() * 3);
    }
    return '<svg viewBox="0 0 198 52" preserveAspectRatio="none" aria-hidden="true" focusable="false"><g fill="currentColor">' + rects + '</g></svg>';
  }

  // Foto im Kopf der Bordkarte überblenden (gleiche Bildquelle wie die Auswahlkachel)
  var photos = F.$$('[data-photo]', pass);
  var photoKey = 'eiger-moench-jungfrau';
  function setPhoto(id) {
    if (id === photoKey || photos.length < 2) return;
    var tile = form.querySelector('input[name="gutschein"][value="' + id + '"] + .gift-pick__card img');
    if (!tile) return;
    photoKey = id;
    var cur = photos[0].classList.contains('is-on') ? photos[0] : photos[1];
    var next = cur === photos[0] ? photos[1] : photos[0];
    var show = function () {
      if (photoKey !== id) return;
      next.classList.add('is-on');
      cur.classList.remove('is-on');
    };
    next.onload = show;
    next.classList.remove('is-on');
    next.sizes = photos[0].getAttribute('sizes') || '460px';
    next.srcset = tile.getAttribute('srcset') || '';
    next.src = tile.getAttribute('src');
    if (next.complete && next.naturalWidth) show();
  }

  // ---------------------------------------------------------------- Darstellung
  var prev = {};
  function render(initial) {
    var v = compute();
    var kindChanged = prev.kind !== v.kind;
    var idChanged = prev.id !== state.id;
    var fx = !initial;

    // Panels für Rundflug / Schnupperflug / Wertgutschein
    F.$$('[data-gift-panel]', form).forEach(function (p) {
      var on = p.getAttribute('data-gift-panel') === v.kind;
      if (p.hidden === on) {
        p.hidden = !on;
        if (on && fx && animate) { p.classList.remove('is-entering'); void p.offsetWidth; p.classList.add('is-entering'); }
      }
    });
    if (ownWrap) ownWrap.hidden = state.betrag !== 'eigen';

    // Bordkarte
    flap(q('code'), v.code);
    setText(q('place'), v.place, fx);
    setText(q('kindLabel'), v.kindLabel, fx && kindChanged);
    setText(q('flug'), v.flug, fx);
    setText(q('dauer'), v.dauer, fx);
    setText(q('xLabel'), v.xLabel, fx && kindChanged);
    setText(q('x'), v.x, fx);
    setText(q('versand'), v.versand, fx);
    setText(q('priceLabel'), v.priceLabel, fx);
    tween(q('price'), v.price);
    q('price').classList.toggle('is-long', v.price >= 1000);

    var fuer = state.fuer.trim(), von = state.von.trim(), msg = state.widmung.trim();
    var fEl = q('fuer'), vEl = q('von'), mEl = q('msg');
    fEl.textContent = fuer || PH.fuer; fEl.classList.toggle('is-placeholder', !fuer);
    vEl.textContent = von || PH.von; vEl.classList.toggle('is-placeholder', !von);
    mEl.textContent = msg ? '"' + msg + '"' : PH.msg; mEl.classList.toggle('is-placeholder', !msg);

    var seed = state.id + '|' + v.price + '|' + fuer + '|' + von;
    if (seed !== prev.seed) q('barcode').innerHTML = barcode(seed);

    if (idChanged) {
      setPhoto(state.id);
      if (fx && animate) {
        pass.classList.remove('is-departing'); void pass.offsetWidth; pass.classList.add('is-departing');
      }
    }

    // Aktionen
    setText(F.$('[data-gift-what]', root), v.what, false);
    tween(F.$('[data-gift-total]', root), v.price);
    shopBtn.href = v.shop;
    var note = F.$('[data-gift-shopnote]', root);
    if (note) {
      note.textContent = 'Öffnet "' + v.shopTitle + '" im Gutschein-Shop in einem neuen Tab. Name, Widmung und Versandart gibst du dort ein.' +
        (state.widmung.trim() ? ' Deine Widmung kopieren wir dir beim Klick in die Zwischenablage.' : '');
    }

    // Mini-Leiste (Handy)
    if (dock) {
      flap(q('code', dock) || F.$('[data-d="code"]', dock), v.code);
      F.$('[data-d="title"]', dock).textContent = v.flug;
      F.$('[data-d="detail"]', dock).textContent = v.kind === 'rundflug' ? v.x : (v.kind === 'schnupperflug' ? v.x.replace('Cessna ', 'C') + ' · ' + v.dauer : 'freie Wahl');
      tween(F.$('[data-d="price"]', dock), v.price);
      if (fx && animate && (idChanged || prev.price !== v.price)) { dock.classList.remove('is-pulse'); void dock.offsetWidth; dock.classList.add('is-pulse'); }
    }

    // Widmungszähler
    var len = msgInput.value.length;
    countEl.textContent = len;
    ringEl.style.strokeDashoffset = (56.55 * (1 - Math.min(1, len / 160))).toFixed(2);
    var counter = countEl.closest('.gift-count');
    counter.classList.toggle('is-near', len >= 140 && len < 160);
    counter.classList.toggle('is-full', len >= 160);
    countSr.textContent = len >= 140 ? 'Noch ' + (160 - len) + ' Zeichen frei.' : '';
    F.$$('.gift-idea', form).forEach(function (b) { b.classList.toggle('is-used', b.getAttribute('data-idea') === state.widmung); });

    if (fx && (idChanged || prev.price !== v.price || prev.versand !== v.versand)) announce(v);
    prev = { kind: v.kind, id: state.id, price: v.price, seed: seed, versand: v.versand };
  }

  var liveT;
  function announce(v) {
    clearTimeout(liveT);
    liveT = setTimeout(function () { liveEl.textContent = 'Vorschau aktualisiert: ' + v.what + ', ' + F.chf(v.price) + ', ' + v.versand + '.'; }, 500);
  }

  var saveT;
  function save() {
    clearTimeout(saveT);
    saveT = setTimeout(function () { F.store.set(STORE_KEY, state); }, 400);
  }

  function validateOwn() {
    if (state.betrag !== 'eigen') { ownWrap.classList.remove('is-invalid'); ownInput.removeAttribute('aria-invalid'); return; }
    var v = +state.eigen, bad = state.eigen !== '' && (!(v >= MIN) || !(v <= MAX));
    ownWrap.classList.toggle('is-invalid', bad);
    if (bad) ownInput.setAttribute('aria-invalid', 'true'); else ownInput.removeAttribute('aria-invalid');
  }

  // ---------------------------------------------------------------- Ereignisse
  form.addEventListener('submit', function (e) { e.preventDefault(); });
  form.addEventListener('input', function () { readForm(); validateOwn(); render(false); save(); });
  form.addEventListener('change', function (e) {
    readForm();
    if (e.target === ownInput && state.eigen !== '') {
      var v = Math.round(+state.eigen);
      if (v < MIN || v > MAX || isNaN(v)) { v = Math.min(MAX, Math.max(MIN, isNaN(v) ? MIN : v)); ownInput.value = v; state.eigen = String(v); }
    }
    if (e.target.name === 'betrag' && state.betrag === 'eigen') { prefillOwn(); setTimeout(focusOwn, 30); }
    validateOwn(); render(false); save();
  });

  // Eigener Betrag: mit dem zuletzt gewählten Betrag vorbelegen, damit Feld und Bordkarte übereinstimmen
  function prefillOwn() {
    if (state.eigen !== '') return;
    state.eigen = String(lastAmount);
    ownInput.value = state.eigen;
  }
  function focusOwn() {
    ownInput.focus({ preventScroll: true });
    try { ownInput.select(); } catch (err) { /* nicht unterstützt */ }
  }

  F.$$('.gift-idea', form).forEach(function (b) {
    b.addEventListener('click', function () {
      msgInput.value = b.getAttribute('data-idea').slice(0, 160);
      readForm(); render(false); save();
      msgInput.focus({ preventScroll: true });
    });
  });

  var resetBtn = F.$('[data-gift-reset]', form);
  if (resetBtn) resetBtn.addEventListener('click', function () {
    state = JSON.parse(JSON.stringify(DEFAULTS));
    writeForm(); validateOwn(); render(false); save();
    F.toast('Konfigurator zurückgesetzt.');
  });

  // Widmung beim Klick auf "Weiter zum Shop" in die Zwischenablage kopieren
  shopBtn.addEventListener('click', function () {
    var txt = state.widmung.trim();
    if (!txt || !navigator.clipboard || !navigator.clipboard.writeText) return;
    navigator.clipboard.writeText(txt).then(function () { F.toast('Widmung kopiert. Im Shop kannst du sie einfach einfügen.'); }, function () {});
  });

  // Weich zu einem Element scrollen, unter Header und Sprungmarken-Leiste.
  // Ohne Lenis (Touch-Geräte) eigene Animation: Sie setzt die Position in jedem Frame und wird darum
  // nicht abgebrochen, wenn die Sprungmarken-Leiste unterwegs ihr scrollIntoView() aufruft.
  var scrollRaf = 0;
  function animateScroll(target) {
    var html = document.documentElement;
    var from = window.scrollY, t0 = performance.now();
    var dist = Math.abs(target() - from);
    var dur = Math.min(1100, 350 + dist * 0.09);
    cancelAnimationFrame(scrollRaf);
    function stop() {
      cancelAnimationFrame(scrollRaf);
      html.style.scrollBehavior = '';
      window.removeEventListener('touchstart', stop);
      window.removeEventListener('wheel', stop);
    }
    html.style.scrollBehavior = 'auto';
    if (F.reducedMotion || dist < 2) { window.scrollTo(0, target()); stop(); return; }
    window.addEventListener('touchstart', stop, { passive: true });
    window.addEventListener('wheel', stop, { passive: true });
    (function step(now) {
      var k = Math.min(1, (now - t0) / dur);
      var e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      window.scrollTo(0, from + (target() - from) * e);
      if (k < 1) scrollRaf = requestAnimationFrame(step); else stop();
    })(t0);
  }
  function scrollOffset() {
    var sub = F.$('.subnav');
    return (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 76) + (sub ? sub.offsetHeight : 0) + 16;
  }
  function scrollToEl(el) {
    if (!el) return;
    // Position aus offsetTop: ignoriert laufende Einblend-Transforms (data-reveal, is-entering)
    var target = function () {
      var y = 0, n = el;
      while (n) { y += n.offsetTop; n = n.offsetParent; }
      return Math.max(0, y - scrollOffset());
    };
    // Lenis mit absoluter Zahl: bei Element-Zielen rechnet es scroll-padding-top noch dazu
    if (F.lenis) { F.lenis.scrollTo(target()); return; }
    animateScroll(target);
  }

  // Touch-Geräte: Sprungmarken auf dieser Seite (Hero, Sprungmarken-Leiste, Texte) mit derselben Animation
  document.addEventListener('click', function (e) {
    if (F.lenis || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    var a = e.target.closest && e.target.closest('main a[href^="#"]');
    if (!a) return;
    var id = decodeURIComponent(a.getAttribute('href').slice(1));
    var t = id && document.getElementById(id);
    if (!t) return;
    e.preventDefault();
    scrollToEl(t);
    if (history.pushState) history.pushState(null, '', '#' + id);
  });

  // Auswahl aus dem Katalog übernehmen und zum Konfigurator springen
  F.$$('[data-gift-pick]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('data-gift-pick');
      if (!validId(id)) return;
      e.preventDefault();
      e.stopPropagation();
      state.id = id;
      if (a.hasAttribute('data-schnupper')) state.schnupper = a.getAttribute('data-schnupper');
      if (a.hasAttribute('data-betrag')) state.betrag = a.getAttribute('data-betrag');
      var own = state.betrag === 'eigen' && kindOf(id) === 'wertgutschein';
      if (own) prefillOwn();
      writeForm(); validateOwn(); render(false); save();
      scrollToEl(own ? F.$('[data-gift-panel="wertgutschein"]', form) : F.$('.gift-config', root));
      if (own) setTimeout(focusOwn, 1200);
    });
  });

  // Handy: "Zur Vorschau" in Formular und Mini-Leiste
  F.$$('[data-gift-to-preview], [data-gift-dock] a[href="#vorschau"]', root).forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      scrollToEl(F.$('.gift-stage', root));
    });
  });

  // ---------------------------------------------------------------- Drucken
  if (printBtn) printBtn.addEventListener('click', function () {
    var v = compute();
    var sheet = document.createElement('div');
    sheet.className = 'gift-print';
    var head = document.createElement('div');
    head.className = 'gift-print__head';
    head.innerHTML = '<span>FLUBAG · Flugplatz Luzern-Beromünster</span><span>Vorschau</span>';
    var clone = pass.cloneNode(true);
    clone.removeAttribute('style');
    clone.removeAttribute('data-tilt');
    clone.classList.remove('is-departing', 'is-bump');
    var code = clone.querySelector('[data-p="code"]');
    if (code) { code.textContent = v.code; code.style.width = ''; code.classList.remove('is-flapping'); }
    var price = clone.querySelector('[data-p="price"]');
    if (price) price.textContent = F.chf(v.price);
    F.$$('[data-p]', clone).forEach(function (el) { el.removeAttribute('data-p'); });
    F.$$('.is-swap', clone).forEach(function (el) { el.classList.remove('is-swap'); });
    var foot = document.createElement('p');
    foot.className = 'gift-print__foot';
    foot.innerHTML = '<strong>Vorschau, kein gültiger Gutschein.</strong> Bestellen kannst du diesen Gutschein im Shop der FLUBAG Flugbetriebs AG: ' + F.escape(v.shop.replace(/^https?:\/\//, '')) + '. Nach der Bestellung erhältst du den Gutschein mit Gutscheinnummer als PDF (print@home) oder per Post.';
    sheet.appendChild(head); sheet.appendChild(clone); sheet.appendChild(foot);
    document.body.appendChild(sheet);
    var html = document.documentElement;
    html.classList.add('is-printing-gift');
    var done = false;
    function cleanup() {
      if (done) return;
      done = true;
      html.classList.remove('is-printing-gift');
      if (sheet.parentNode) sheet.parentNode.removeChild(sheet);
      window.removeEventListener('afterprint', cleanup);
    }
    window.addEventListener('afterprint', cleanup);
    setTimeout(function () {
      try { window.print(); } catch (e) { /* Druck nicht verfügbar */ }
      setTimeout(cleanup, 1500);
    }, 60);
  });

  // ---------------------------------------------------------------- Mini-Leiste (Handy)
  if (dock && 'IntersectionObserver' in window) {
    var mq = window.matchMedia('(max-width: 860px)');
    var inForm = false, inPass = false, typing = false, typeT;
    var toggleDock = function () {
      var on = mq.matches && inForm && !inPass && !typing;
      dock.classList.toggle('is-visible', on);
      dock.setAttribute('aria-hidden', String(!on));
      if (on) dock.removeAttribute('inert'); else dock.setAttribute('inert', '');
      document.body.classList.toggle('gift-dock-on', on);
    };
    new IntersectionObserver(function (en) { inForm = en[0].isIntersecting; toggleDock(); }, { rootMargin: '-35% 0px -10% 0px' }).observe(form);
    new IntersectionObserver(function (en) { inPass = en[0].isIntersecting; toggleDock(); }, { threshold: 0.25 }).observe(pass);
    if (mq.addEventListener) mq.addEventListener('change', toggleDock);
    // Beim Tippen (Bildschirmtastatur) würde die Leiste das Eingabefeld verdecken
    var isText = function (el) { return el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && /^(text|number|search|)$/.test(el.type || ''))); };
    form.addEventListener('focusin', function (e) { if (isText(e.target)) { clearTimeout(typeT); typing = true; toggleDock(); } });
    form.addEventListener('focusout', function (e) { if (isText(e.target)) { typeT = setTimeout(function () { typing = false; toggleDock(); }, 150); } });
  }

  // Desktop: Konfigurator im Bild? (blendet den Nach-oben-Knopf aus, der sonst die Aktionen überdeckt)
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { document.body.classList.toggle('gift-config-on', en[0].isIntersecting); }, { rootMargin: '-20% 0px -20% 0px' }).observe(F.$('.gift-config', root));
  }

  // ---------------------------------------------------------------- Start: URL > gespeichert > Formular
  readForm();
  var params = new URLSearchParams(location.search);
  var fromUrl = params.get('gutschein');
  if (fromUrl && validId(fromUrl)) {
    state.id = fromUrl;
    if (/^[123]$/.test(params.get('personen') || '')) state.personen = params.get('personen');
    if (params.get('flug') && schnupperByKey(params.get('flug')).shop === params.get('flug')) state.schnupper = params.get('flug');
    var b = params.get('betrag');
    if (b && /^\d+$/.test(b)) {
      if (['50', '100', '150', '200', '250', '300', '500'].indexOf(b) > -1) state.betrag = b;
      else if (+b >= MIN && +b <= MAX) { state.betrag = 'eigen'; state.eigen = b; }
    }
  } else {
    var saved = F.store.get(STORE_KEY);
    if (saved && typeof saved === 'object' && validId(saved.id)) {
      Object.keys(DEFAULTS).forEach(function (k) { if (typeof saved[k] === 'string') state[k] = saved[k]; });
    }
  }
  writeForm();
  readForm();
  validateOwn();
  if (state.id !== photoKey) { animate = false; setPhoto(state.id); animate = !F.reducedMotion; }
  var wasAnimate = animate;
  animate = false;
  render(true);
  animate = wasAnimate;
  F.$$('[data-p="code"], [data-d="code"]').forEach(function (el) { el._ready = true; });

  // ---------------------------------------------------------------- Gutschein einlösen
  var nr = F.$('[data-redeem-nr]');
  function updateRedeem() {
    var v = nr ? nr.value.trim() : '';
    F.$$('[data-redeem]').forEach(function (a) {
      var kind = a.getAttribute('data-redeem');
      if (kind === 'schnupper' || kind === 'rundflug') {
        a.href = (kind === 'schnupper' ? 'schnupperflug.html' : 'rundfluege.html') + (v ? '?gutschein=' + encodeURIComponent(v) : '') + '#anfrage';
      } else {
        var mail = a.getAttribute('data-email') || (D.site && D.site.email) || '';
        var body = 'Guten Tag\n\nIch möchte meinen Gutschein einlösen.\n\nGutscheinnummer: ' + (v || '') + '\nGewünschter Flug: \nWunschtermin: \nTelefon: \n\nFreundliche Grüsse';
        a.href = 'mailto:' + mail + '?subject=' + encodeURIComponent('Gutschein einlösen' + (v ? ' ' + v : '')) + '&body=' + encodeURIComponent(body);
      }
    });
  }
  if (nr) { nr.addEventListener('input', updateRedeem); updateRedeem(); }

  // ---------------------------------------------------------------- Flugpfad "So funktioniert's"
  var how = F.$('[data-gift-how]');
  if (how) {
    var steps = F.$$('.gift-how__step', how);
    var setP = function (p) {
      how.style.setProperty('--gift-p', p.toFixed(3));
      steps.forEach(function (s, i) { s.classList.toggle('is-active', p >= (steps.length > 1 ? i / (steps.length - 1) : 0) - 0.04); });
    };
    F.ready(function () {
      if (!F.hasGsap() || F.reducedMotion) { setP(1); return; }
      ScrollTrigger.create({
        trigger: how, start: 'top 72%', end: 'bottom 62%',
        onUpdate: function (self) { setP(self.progress); },
        onRefresh: function (self) { setP(self.progress); }
      });
    });
  }
})();
