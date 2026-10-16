/* Preise: Flugkosten-Rechner (unverbindliche Schätzung exkl. MwSt.) */
(function () {
  'use strict';
  var F = window.FLUBAG;
  var root = F.$('[data-calc]');
  if (!root) return;
  var form = F.$('[data-calc-form]', root);
  var fleet = F.data.flotte || [];
  var P = F.data.preise || {};
  var LT = P.landetaxen || [];
  var fiPerMin = (P.fluglehrer && P.fluglehrer[0] && P.fluglehrer[0].perMin) || 0;
  var minIn = form.elements.minuten;
  var landIn = form.elements.landungen;
  var shown = 0, raf = 0, last = null;

  function byId(id) { for (var i = 0; i < fleet.length; i++) if (fleet[i].id === id) return fleet[i]; return fleet[0]; }
  function fee(i) { return parseFloat(LT[i] && LT[i].price) || 0; }
  function money(n) { return F.chf(n, 2); }

  // Landetaxe nach MTOW (Flugzeuge bis 999 kg, bis 1999 kg, über 1999 kg)
  function weightFee(a) {
    var kg = a.specs && a.specs.mtowKg;
    if (!kg) return { price: fee(1), label: LT[1] && LT[1].label };
    var i = kg <= 999 ? 0 : kg <= 1999 ? 1 : 2;
    return { price: fee(i), label: (LT[i] && LT[i].label) + ', MTOW ' + F.num(kg) + ' kg' };
  }

  function read() {
    var sel = form.querySelector('input[name="flugzeug"]:checked');
    var tarif = form.querySelector('input[name="tarif"]:checked');
    var lands = Math.max(0, Math.min(40, parseInt(landIn.value, 10) || 0));
    return {
      a: byId(sel ? sel.value : ''),
      min: Math.max(10, Math.min(300, parseInt(minIn.value, 10) || 0)),
      tarif: tarif ? tarif.value : '1',
      fi: form.elements.fluglehrer.checked,
      lands: lands,
      lt: form.elements.landetaxe.value
    };
  }

  function calc(s) {
    var perMin = s.tarif === '2' ? s.a.priceMin2 : s.a.priceMin1;
    var rent = s.min * perMin;
    var fuel = rent * (s.a.fuel || 0) / 100;
    var fi = s.fi ? s.min * fiPerMin : 0;
    var lf = s.lt === 'auto' ? weightFee(s.a) : s.lt === '0' ? { price: 0, label: 'Pauschal-Landetaxe' } : { price: parseFloat(s.lt), label: s.lt === '9' ? LT[3].label : LT[4].label };
    var land = s.lands * lf.price;
    return { perMin: perMin, rent: rent, fuel: fuel, fi: fi, land: land, lf: lf, total: rent + fuel + fi + land };
  }

  function tween(to) {
    cancelAnimationFrame(raf);
    var el = F.$('[data-calc-total]', root);
    if (F.reducedMotion) { shown = to; el.textContent = money(to); return; }
    var from = shown, t0 = performance.now(), dur = 450;
    (function step(t) {
      var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      shown = from + (to - from) * e;
      el.textContent = money(shown);
      if (k < 1) raf = requestAnimationFrame(step);
    })(t0);
  }

  function set(sel, text) { var el = F.$(sel, root); if (el) el.textContent = text; }

  function update() {
    var s = read(), r = calc(s);
    last = { s: s, r: r };
    F.$('[data-calc-min-out]', root).textContent = s.min + ' min';
    set('[data-calc-plane]', s.a.reg + ' · ' + s.a.type + ' · Preis ' + s.tarif);
    tween(r.total);
    set('[data-calc-perhour]', money(r.total / s.min * 60));
    set('[data-calc-val="rent"]', money(r.rent));
    set('[data-calc-val="fuel"]', money(r.fuel));
    set('[data-calc-val="fi"]', money(r.fi));
    set('[data-calc-val="land"]', money(r.land));
    set('[data-calc-note="rent"]', s.min + ' min × ' + money(r.perMin));
    set('[data-calc-note="fuel"]', (s.a.fuel || 0) + '% auf die Miete');
    set('[data-calc-note="fi"]', s.fi ? s.min + ' min × ' + money(fiPerMin) : 'ohne Fluglehrer');
    set('[data-calc-note="land"]', s.lands + ' × ' + money(r.lf.price) + ' (' + r.lf.label + ')');
    ['rent', 'fuel', 'fi', 'land'].forEach(function (k) {
      var b = F.$('[data-calc-bar="' + k + '"]', root);
      if (b) b.style.width = (r.total ? (r[k] / r.total * 100).toFixed(2) : 0) + '%';
    });
    F.$$('[data-calc-preset]', root).forEach(function (b) { b.classList.toggle('is-active', +b.getAttribute('data-calc-preset') === s.min); });
    F.$$('.pr-rate').forEach(function (c) { c.classList.toggle('is-picked', c.id === 'miete-' + s.a.id); });
  }

  form.addEventListener('input', update);
  form.addEventListener('change', function (e) {
    if (e.target === landIn) landIn.value = read().lands;
    update();
  });
  form.addEventListener('submit', function (e) { e.preventDefault(); });

  root.addEventListener('click', function (e) {
    var p = e.target.closest('[data-calc-preset]');
    if (p) { minIn.value = p.getAttribute('data-calc-preset'); minIn.dispatchEvent(new Event('input', { bubbles: true })); return; }
    var st = e.target.closest('[data-calc-step]');
    if (st) { landIn.value = Math.max(0, Math.min(40, (parseInt(landIn.value, 10) || 0) + (+st.getAttribute('data-calc-step')))); update(); return; }
    if (e.target.closest('[data-calc-copy]') && last) {
      var s = last.s, r = last.r;
      var text = [
        'FLUBAG Flugkosten-Schätzung (unverbindlich, CHF exkl. MwSt.)',
        s.a.reg + ' ' + s.a.type + ', ' + s.min + ' min, Preis ' + s.tarif,
        'Flugzeugmiete: ' + money(r.rent),
        'Benzinzuschlag ' + s.a.fuel + '%: ' + money(r.fuel),
        'Fluglehrer: ' + money(r.fi),
        'Landetaxen (' + s.lands + '): ' + money(r.land),
        'Total: ' + money(r.total)
      ].join('\n');
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { F.toast('Schätzung kopiert'); }, function () { F.toast('Kopieren nicht möglich'); });
    }
  });

  // "Berechnen" auf den Preiskarten übernimmt das Flugzeug in den Rechner
  F.$$('[data-calc-pick]').forEach(function (b) {
    b.addEventListener('click', function () {
      var r = form.querySelector('input[name="flugzeug"][value="' + b.getAttribute('data-calc-pick') + '"]');
      if (r) { r.checked = true; update(); }
      var target = document.getElementById('rechner');
      if (F.lenis) F.lenis.scrollTo(target, { offset: -90 }); else target.scrollIntoView({ behavior: F.reducedMotion ? 'auto' : 'smooth' });
    });
  });

  update();
})();
