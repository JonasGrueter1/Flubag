/* Flotte und Flugzeug-Detailseiten: Filter, Vergleich (Duell), Split-Flap Kennzeichen, Kostenrechner, Dokumentsuche */
(function () {
  'use strict';
  var F = window.FLUBAG;
  if (!F) return;
  var FLEET = (F.data && F.data.flotte) || [];
  var byId = {};
  FLEET.forEach(function (a) { byId[a.id] = a; });

  /* ---------- Schieberegler: Füllstand */
  function rangeFill(input) {
    var min = +input.min || 0, max = +input.max || 100;
    input.style.setProperty('--fill', ((+input.value - min) / (max - min) * 100).toFixed(1) + '%');
  }
  // Rappenbeträge immer mit zwei Stellen (CHF 3.00 statt CHF 3)
  F.$$('[data-chf2]').forEach(function (el) { el.textContent = F.chf(+el.getAttribute('data-chf2'), 2); });

  F.$$('.range input[type="range"]').forEach(function (r) {
    rangeFill(r);
    r.addEventListener('input', function () { rangeFill(r); });
  });

  /* =====================================================================
     FLOTTE: Filter nach Einsatz
     ===================================================================== */
  var filter = F.$('[data-fleet-filter]');
  if (filter && FLEET.length) {
    var list = F.$('[data-fleet-filter-list]', filter);
    var countEl = F.$('[data-fleet-filter-count]', filter);
    var cards = F.$$('[data-fleet-card]');
    var grid = cards[0] && cards[0].parentElement;
    // Einsätze, die mindestens zwei Flugzeuge teilen, plus Anzahl Plätze
    var roles = [];
    FLEET.forEach(function (a) { (a.role || []).forEach(function (r) { if (roles.indexOf(r) < 0) roles.push(r); }); });
    function matches(a, key) {
      if (!key) return true;
      if (key.indexOf('seats:') === 0) return a.seats === +key.slice(6);
      return (a.role || []).indexOf(key) > -1;
    }
    var opts = [{ key: '', label: 'Alle' }].concat(roles.map(function (r) { return { key: r, label: r }; }));
    var seats = [];
    FLEET.forEach(function (a) { if (seats.indexOf(a.seats) < 0) seats.push(a.seats); });
    seats.sort().forEach(function (n) { opts.push({ key: 'seats:' + n, label: n + ' Plätze', sep: !opts.some(function (o) { return o.sep; }) }); });
    opts.forEach(function (o) { o.n = FLEET.filter(function (a) { return matches(a, o.key); }).length; });
    opts = opts.filter(function (o) { return !o.key || o.key.indexOf('seats:') === 0 || o.n > 1; });
    list.innerHTML = opts.map(function (o, i) {
      return (o.sep ? '<span class="fl-filter__sep" aria-hidden="true"></span>' : '') + '<button class="fl-filter__btn" type="button" data-role="' + F.escape(o.key) + '" aria-pressed="' + (i === 0) + '">' + F.escape(o.label) + ' <span class="subtle">' + o.n + '</span></button>';
    }).join('');
    function apply(role) {
      var shown = 0;
      cards.forEach(function (c) {
        var a = byId[c.getAttribute('data-fleet-card')];
        var on = !!a && matches(a, role);
        c.hidden = !on;
        if (on) shown++;
      });
      if (grid) grid.classList.toggle('is-filtered', !!role);
      F.$$('.fl-filter__btn', list).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-role') === role)); });
      countEl.textContent = role ? shown + ' von ' + FLEET.length + ' Flugzeugen' : FLEET.length + ' Flugzeuge';
      if (F.motion && F.motion.refresh) F.motion.refresh();
    }
    list.addEventListener('click', function (e) {
      var b = e.target.closest('.fl-filter__btn');
      if (b) apply(b.getAttribute('data-role'));
    });
    filter.hidden = false;
    apply('');
  }

  /* =====================================================================
     FLOTTE: Vergleich zweier Flugzeuge
     ===================================================================== */
  var duel = F.$('[data-duel]');
  if (duel && FLEET.length > 1) {
    var rowsEl = F.$('[data-duel-rows]', duel);
    var max = function (fn) { return Math.max.apply(null, FLEET.map(function (a) { return fn(a) || 0; })); };
    var METRICS = [
      { key: 'speed', name: 'Reisegeschwindigkeit', get: function (a) { return a.specs.cruiseKmh; }, fmt: function (v, a) { return F.num(v) + ' <small>km/h</small>'; }, hint: function (a) { return a.specs.cruiseKt + ' kt'; }, unit: 'km/h' },
      { key: 'mtow', name: 'Max. Abfluggewicht', get: function (a) { return a.specs.mtowKg; }, fmt: function (v) { return F.num(v) + ' <small>kg</small>'; }, unit: 'kg' },
      { key: 'range', name: 'Reichweite', get: function (a) { return a.specs.rangeKm; }, fmt: function (v) { return F.num(v) + ' <small>km</small>'; }, unit: 'km' },
      { key: 'seats', name: 'Plätze', get: function (a) { return a.seats; }, fmt: function (v) { return String(v); }, unit: '' },
      { key: 'price', name: 'Mietpreis (Preis 1)', get: function (a) { return a.price1; }, fmt: function (v) { return F.num(v) + ' <small>CHF/h</small>'; }, unit: 'CHF/h' }
    ];
    METRICS.forEach(function (m) { m.max = max(m.get); });

    rowsEl.innerHTML = METRICS.map(function (m) {
      return '<div class="duel-row" data-metric="' + m.key + '">' +
        '<div class="duel-row__bar duel-row__bar--a"><span class="duel-row__track"><span class="duel-row__fill"></span></span><span class="duel-row__val"></span></div>' +
        '<div class="duel-row__label"><span class="duel-row__name">' + m.name + '</span><span class="duel-row__hint"></span></div>' +
        '<div class="duel-row__bar duel-row__bar--b"><span class="duel-row__track"><span class="duel-row__fill"></span></span><span class="duel-row__val"></span></div>' +
        '</div>';
    }).join('') + '<p class="duel__summary muted" data-duel-summary></p>';

    function sel(side) { var r = duel.querySelector('input[name="duel-' + side + '"]:checked'); return r ? byId[r.value] : null; }
    function plane(a) {
      return '<span class="duel__thumb"><img src="assets/img/' + F.escape(a.image) + '-480.webp" alt="' + F.escape(a.variant + ' ' + a.reg) + '" width="480" height="360" loading="lazy" decoding="async"></span>' +
        '<span class="duel__info"><span class="duel__reg">' + F.escape(a.reg) + '</span><span class="duel__type">' + F.escape(a.type) + '</span><span class="duel__nick">' + F.escape(a.nickname) + '</span>' +
        '<a class="duel__link" href="flugzeug-' + F.escape(a.id) + '.html">Details ' + F.icon('arrow-right') + '</a></span>';
    }
    function diffText(m, a, b) {
      var va = m.get(a), vb = m.get(b);
      if (va == null || vb == null) return '';
      var d = Math.abs(va - vb);
      if (!d) return 'gleich';
      return 'Differenz ' + (m.key === 'price' ? 'CHF ' + F.num(d) + '/h' : F.num(d) + (m.unit ? ' ' + m.unit : ''));
    }
    function render() {
      var a = sel('a'), b = sel('b');
      if (!a || !b) return;
      // gleiches Flugzeug auf der anderen Seite sperren
      F.$$('input[name="duel-a"]', duel).forEach(function (r) { r.disabled = r.value === b.id; });
      F.$$('input[name="duel-b"]', duel).forEach(function (r) { r.disabled = r.value === a.id; });
      F.$('[data-duel-plane="a"]', duel).innerHTML = plane(a);
      F.$('[data-duel-plane="b"]', duel).innerHTML = plane(b);
      METRICS.forEach(function (m) {
        var row = F.$('[data-metric="' + m.key + '"]', rowsEl);
        [['a', a], ['b', b]].forEach(function (p) {
          var v = m.get(p[1]);
          var bar = F.$('.duel-row__bar--' + p[0], row);
          F.$('.duel-row__fill', bar).style.setProperty('--w', v ? (v / m.max * 100).toFixed(1) + '%' : '0%');
          F.$('.duel-row__val', bar).innerHTML = v != null ? m.fmt(v, p[1]) : '<span class="subtle">k. A.</span>';
        });
        F.$('.duel-row__hint', row).textContent = diffText(m, a, b);
      });
      var dv = b.specs.cruiseKmh - a.specs.cruiseKmh;
      var dp = b.price1 - a.price1;
      var fast = dv ? (dv > 0 ? b.reg : a.reg) : '';
      var cheap = dp ? (dp > 0 ? a.reg : b.reg) : '';
      var speedTxt = 'im Reiseflug rund ' + F.num(Math.abs(dv)) + ' km/h schneller';
      var priceTxt = 'kostet ' + F.chf(Math.abs(dp)) + ' pro Stunde weniger (Preis 1)';
      var txt;
      if (fast && cheap && fast === cheap) txt = 'Die ' + fast + ' ist ' + speedTxt + ' und ' + priceTxt;
      else if (fast && cheap) txt = 'Die ' + fast + ' ist ' + speedTxt + ', die ' + cheap + ' ' + priceTxt;
      else if (fast) txt = 'Die ' + fast + ' ist ' + speedTxt + ', bei gleichem Mietpreis (Preis 1)';
      else if (cheap) txt = 'Beide sind im Reiseflug gleich schnell, die ' + cheap + ' ' + priceTxt;
      else txt = 'Beide sind gleich schnell und kosten gleich viel (Preis 1)';
      F.$('[data-duel-summary]', rowsEl).textContent = txt + '.';
    }
    duel.addEventListener('change', function (e) { if (e.target.name === 'duel-a' || e.target.name === 'duel-b') render(); });
    var swap = F.$('[data-duel-swap]', duel);
    if (swap) swap.addEventListener('click', function () {
      var a = sel('a'), b = sel('b');
      F.$$('input[name="duel-a"], input[name="duel-b"]', duel).forEach(function (r) { r.disabled = false; });
      duel.querySelector('input[name="duel-a"][value="' + b.id + '"]').checked = true;
      duel.querySelector('input[name="duel-b"][value="' + a.id + '"]').checked = true;
      swap.classList.toggle('is-spun');
      render();
    });
    render();
  }

  /* =====================================================================
     DETAIL: Kennzeichen als Split-Flap Anzeige
     ===================================================================== */
  F.$$('[data-flap]').forEach(function (el) {
    var text = el.getAttribute('data-flap');
    var sr = document.createElement('span');
    sr.className = 'visually-hidden';
    sr.textContent = text;
    el.parentNode.insertBefore(sr, el);
    el.setAttribute('aria-hidden', 'true');
    el.classList.add('flap');
    el.innerHTML = text.split('').map(function (c) { return '<span class="flap__c">' + F.escape(c) + '</span>'; }).join('');
    if (F.reducedMotion) return;
    var POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    F.$$('.flap__c', el).forEach(function (s, i) {
      var target = text.charAt(i);
      if (!/[A-Z0-9]/.test(target)) return;
      var ticks = 8 + i * 3, n = 0;
      s.classList.add('is-flipping');
      s.textContent = POOL.charAt(Math.floor(Math.random() * POOL.length));
      setTimeout(function step() {
        n++;
        if (n >= ticks) { s.textContent = target; s.classList.remove('is-flipping'); return; }
        s.textContent = POOL.charAt(Math.floor(Math.random() * POOL.length));
        setTimeout(step, 55);
      }, 350);
    });
  });

  /* =====================================================================
     DETAIL: Flugkosten-Rechner
     ===================================================================== */
  F.$$('[data-ac-calc]').forEach(function (box) {
    var min1 = +box.getAttribute('data-min1'), min2 = +box.getAttribute('data-min2'), fi = +box.getAttribute('data-fi') || 0;
    var range = F.$('[data-calc-range]', box), fiBox = F.$('[data-calc-fi]', box);
    var tEl = F.$('[data-calc-time]', box), p1 = F.$('[data-calc-p1]', box), p2 = F.$('[data-calc-p2]', box);
    function fmt(m) { return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + F.pad(m % 60) + ' min'; }
    function update() {
      var m = +range.value, extra = fiBox && fiBox.checked ? fi * m : 0;
      tEl.textContent = fmt(m);
      p1.textContent = F.chf(Math.round((min1 * m + extra) * 100) / 100, 2);
      p2.textContent = F.chf(Math.round((min2 * m + extra) * 100) / 100, 2);
      rangeFill(range);
    }
    range.addEventListener('input', update);
    if (fiBox) fiBox.addEventListener('change', update);
    update();
  });

  /* =====================================================================
     DETAIL: Dokumente durchsuchen
     ===================================================================== */
  var q = F.$('[data-doc-filter]');
  var docsRoot = F.$('[data-docs]');
  if (q && docsRoot) {
    var items = F.$$('li', docsRoot);
    var total = items.length;
    var countDoc = F.$('[data-doc-count]');
    var empty = F.$('[data-doc-empty]');
    items.forEach(function (li) { var t = F.$('.doc__title', li); li._title = t ? t.textContent : ''; });
    function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
    function run() {
      var term = q.value.trim().toLowerCase();
      var shown = 0;
      items.forEach(function (li) {
        var a = F.$('a', li), t = F.$('.doc__title', li);
        var hay = (li._title + ' ' + (a.getAttribute('data-doc') || '') + ' ' + li.textContent).toLowerCase();
        var on = !term || hay.indexOf(term) > -1;
        li.hidden = !on;
        if (on) shown++;
        if (t) t.innerHTML = term ? F.escape(li._title).replace(new RegExp('(' + esc(F.escape(q.value.trim())) + ')', 'ig'), '<mark>$1</mark>') : F.escape(li._title);
      });
      F.$$('[data-doc-group]', docsRoot).forEach(function (g) { g.hidden = !F.$$('li:not([hidden])', g).length; });
      if (countDoc) countDoc.textContent = term ? shown + ' von ' + total + ' Dokumenten' : total + ' Dokumente';
      if (empty) empty.hidden = shown > 0;
      if (F.motion && F.motion.refresh) F.motion.refresh();
    }
    q.addEventListener('input', run);
    q.addEventListener('keydown', function (e) { if (e.key === 'Escape') { q.value = ''; run(); } });
  }
})();
