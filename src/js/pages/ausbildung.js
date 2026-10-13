/* Ausbildung PPL & LAPL: Kostenrechner, Fortschritt im Ablauf, Selbsttest, Funkalphabet */
(function () {
  'use strict';
  var F = window.FLUBAG;
  var reduced = F.reducedMotion;
  var WEEKS_PER_MONTH = 4.345;

  function fmt(n) { return Math.round(n).toLocaleString('de-CH'); }

  // Zahl weich hoch- oder runterzählen
  function tween(el, to, dur) {
    var from = el._v == null ? to : el._v;
    el._v = to;
    if (el._raf) cancelAnimationFrame(el._raf);
    if (reduced || from === to) { el.textContent = fmt(to); return; }
    var t0 = null;
    dur = dur || 650;
    function step(t) {
      if (!t0) t0 = t;
      var p = Math.min(1, (t - t0) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(from + (to - from) * e);
      if (p < 1) el._raf = requestAnimationFrame(step);
    }
    el._raf = requestAnimationFrame(step);
  }

  // Workaround (bis 03-motion.js angepasst ist): Elemente mit data-reveal="clip" erkennt der
  // IntersectionObserver in Chromium nie als sichtbar, weil clip-path inset(100%) die Schnittfläche
  // auf null setzt. Darum hier den Elternknoten beobachten und .is-in selbst setzen.
  (function () {
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target._clipKids.forEach(function (k) { k.classList.add('is-in'); });
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    F.$$('main [data-reveal="clip"]').forEach(function (el) {
      var t = el.parentElement;
      (t._clipKids = t._clipKids || []).push(el);
      io.observe(t);
    });
  })();

  function onceVisible(el, fn) {
    if (!el) return;
    if (!('IntersectionObserver' in window)) { fn(); return; }
    var io = new IntersectionObserver(function (en) {
      if (en[0].isIntersecting) { io.disconnect(); fn(); }
    }, { threshold: 0.25 });
    io.observe(el);
  }

  // ------------------------------------------------------------------
  // 1. Kostenrechner, kalibriert auf die FLUBAG Erfahrungswerte (preise.json)
  // ------------------------------------------------------------------
  var calc = (function () {
    var root = F.$('[data-calc]');
    if (!root) return null;
    var form = F.$('[data-calc-form]', root);
    var hours = F.$('[data-calc-hours]', root);
    var week = F.$('[data-calc-week]', root);
    var theory = F.$('[data-calc-theory]', root);
    var totalEl = F.$('[data-calc-total]', root);
    var bar = F.$('[data-calc-bar]', root);
    var legend = F.$('[data-calc-legend]', root);
    var monthbar = F.$('[data-calc-monthbar]', root);
    var stdBtn = F.$('[data-calc-std]', root);
    var shown = false;

    // Basiswerte aus den Daten (Fallback: Zahlen der alten Website)
    var A = (F.data.preise && F.data.preise.ausbildung) || {};
    function item(re, fb) {
      var it = (A.items || []).filter(function (x) { return re.test(x.label); })[0];
      return it ? +it.price : fb;
    }
    var BASE_H = 55, BASE_INSTR = 100;
    var plane150 = item(/Flugstunden/i, 7700) / BASE_H;          // CHF pro Flugstunde C150
    var fleet = F.data.flotte || [];
    function rent(id, fb) { var a = fleet.filter(function (x) { return x.id === id; })[0]; return a && a.price1 ? +a.price1 : fb; }
    var plane172 = plane150 * rent('hb-cql', 312) / rent('hb-cvz', 198);
    var instrRate = item(/Fluglehrer/i, 9400) / BASE_INSTR;      // CHF pro Stunde Instruktion
    var landing = item(/Landeg/i, 1000) / BASE_H;                // CHF pro Flugstunde
    var exam = item(/Prüfung/i, 500);
    var medical = item(/ärzt/i, 250);
    var theoryCost = A.theorie || 3000;

    var LIC = {
      PPL: { min: 45, std: 55, info: 'Privatpilotenlizenz, weltweit (ICAO) anerkannt. EASA Mindestflugzeit 45 h.', help: 'Das Minimum gibt EASA vor. Bei uns sind es für die PPL erfahrungsgemäss rund 55 Flugstunden.', stdLabel: 'Erfahrungswert 55 h übernehmen' },
      LAPL: { min: 30, std: 40, info: 'Light Aircraft Pilot Licence, gültig in den EASA Staaten. EASA Mindestflugzeit 30 h.', help: 'Das Minimum gibt EASA vor. Für die LAPL rechnen wir mit der Annahme von 40 Flugstunden.', stdLabel: 'Annahme 40 h übernehmen' }
    };
    var PLANE = {
      C150: { name: 'Cessna 150', short: 'C150', info: 'Das zweiplätzige Schulflugzeug.' },
      C172: { name: 'Cessna 172', short: 'C172', info: 'Die vierplätzige Skyhawk, im Verhältnis der Mietpreise teurer pro Stunde.' }
    };
    var COLORS = { plane: 'var(--brand)', instr: 'var(--sky-2)', land: 'var(--cub)', theory: 'var(--ok)', exam: '#a78bfa', med: '#94a3b8' };

    // Balken und Legende einmalig aufbauen
    var parts = [
      { k: 'plane', label: 'Flugzeug' },
      { k: 'instr', label: 'Fluglehrer' },
      { k: 'land', label: 'Landegebühren' },
      { k: 'theory', label: 'Theorie' },
      { k: 'exam', label: 'Prüfung (BAZL)' },
      { k: 'med', label: 'Fliegerarzt' }
    ];
    parts.forEach(function (p) {
      p.seg = document.createElement('span');
      p.seg.style.background = COLORS[p.k];
      p.seg.style.flexGrow = '0';
      bar.appendChild(p.seg);
      p.li = document.createElement('li');
      p.li.innerHTML = '<i style="background:' + COLORS[p.k] + '"></i><span>' + p.label + '</span><b></b>';
      p.val = p.li.querySelector('b');
      legend.appendChild(p.li);
    });
    // Monatsraster (24 Monate)
    for (var i = 0; i < 24; i++) { var c = document.createElement('i'); c.style.setProperty('--i', i); monthbar.appendChild(c); }
    var ml = document.createElement('span');
    ml.className = 'calc__months-label';
    ml.innerHTML = '<span>Jahr 1</span><span>Jahr 2</span>';
    monthbar.appendChild(ml);

    function val(name) { var r = form.querySelector('input[name="' + name + '"]:checked'); return r ? r.value : null; }
    function r10(n) { return Math.round(n / 10) * 10; }

    function compute() {
      var lic = val('lizenz') || 'PPL', pl = val('flugzeug') || 'C150';
      var h = +hours.value, w = +week.value;
      var res = {
        lic: lic, pl: pl, h: h, w: w, theory: theory.checked,
        plane: r10(h * (pl === 'C172' ? plane172 : plane150)),
        instr: r10(h * (BASE_INSTR / BASE_H) * instrRate),
        land: r10(h * landing),
        exam: exam,
        med: medical,
        theoryCost: theory.checked ? theoryCost : 0
      };
      res.total = res.plane + res.instr + res.land + res.exam + res.med + res.theoryCost;
      res.weeks = h / w;
      res.months = res.weeks / WEEKS_PER_MONTH;
      res.instrH = Math.round(h * BASE_INSTR / BASE_H);
      return res;
    }

    function fill(input) {
      var p = (input.value - input.min) / (input.max - input.min) * 100;
      input.style.setProperty('--fill', p + '%');
    }

    var last = null;
    function render() {
      var r = compute();
      last = r;
      fill(hours); fill(week);
      F.$('[data-calc-hours-out]', root).textContent = r.h + ' h';
      F.$('[data-calc-week-out]', root).textContent = r.w + ' pro Woche';
      F.$('[data-calc-tag]', root).textContent = r.lic + ' · ' + PLANE[r.pl].short + ' · ' + r.h + ' h' + (r.theory ? '' : ' · ohne Theorie');
      F.$('[data-calc-licinfo]', root).textContent = LIC[r.lic].info;
      F.$('[data-calc-planeinfo]', root).textContent = PLANE[r.pl].info;
      F.$('[data-calc-hourshelp]', root).textContent = LIC[r.lic].help;
      F.$('[data-calc-std-label]', root).textContent = LIC[r.lic].stdLabel;
      stdBtn.setAttribute('aria-pressed', String(r.h === LIC[r.lic].std));
      var stdPct = (LIC[r.lic].std - hours.min) / (hours.max - hours.min) * 100;
      root.style.setProperty('--std', stdPct + '%');
      F.$('[data-calc-min]', root).textContent = 'Min. ' + hours.min + ' h';

      var values = { plane: r.plane, instr: r.instr, land: r.land, theory: r.theoryCost, exam: r.exam, med: r.med };
      parts.forEach(function (p) {
        var v = values[p.k];
        if (shown || reduced) p.seg.style.flexGrow = String(v);
        p.val.textContent = v ? F.chf(v) : 'nicht eingerechnet';
        p.li.classList.toggle('is-off', !v);
        if (p.k === 'plane') p.li.querySelector('span').textContent = 'Flugzeug ' + PLANE[r.pl].name;
      });
      if (shown || reduced) tween(totalEl, r.total);

      var months = Math.max(1, Math.round(r.months));
      F.$('[data-calc-months]', root).innerHTML = months + ' <small>' + (months === 1 ? 'Monat' : 'Monate') + '</small>';
      F.$('[data-calc-weeks]', root).textContent = Math.ceil(r.weeks);
      F.$('[data-calc-perhour]', root).innerHTML = r.instrH + ' <small>h</small>';
      F.$$('i', monthbar).forEach(function (cell, idx) {
        var on = idx + 1 <= Math.floor(r.months);
        var part = !on && idx < r.months;
        cell.classList.toggle('is-on', on || (part && r.months - idx >= 0.5));
        cell.classList.toggle('is-part', part && r.months - idx < 0.5);
      });
    }

    function setLicense(lic, keepHours) {
      var L = LIC[lic];
      var r = form.querySelector('input[name="lizenz"][value="' + lic + '"]');
      if (r) r.checked = true;
      hours.min = L.min;
      if (!keepHours || +hours.value < L.min) hours.value = L.std;
      render();
    }

    form.addEventListener('submit', function (e) { e.preventDefault(); });
    form.addEventListener('input', function (e) { if (e.target === hours || e.target === week) render(); });
    form.addEventListener('change', function (e) {
      if (e.target.name === 'lizenz') setLicense(e.target.value);
      else render();
    });
    form.addEventListener('reset', function () {
      setTimeout(function () { hours.min = 45; hours.value = 55; week.value = 2; render(); }, 0);
    });
    stdBtn.addEventListener('click', function () { hours.value = LIC[val('lizenz') || 'PPL'].std; render(); });

    F.$('[data-calc-copy]', root).addEventListener('click', function () {
      var r = last || compute();
      var months = Math.max(1, Math.round(r.months));
      var text = 'FLUBAG Kostenrechner (unverbindliche Schätzung): ' + r.lic + ', ' + PLANE[r.pl].name + ', ' + r.h + ' Flugstunden, ' +
        (r.theory ? 'inkl. Theorie' : 'ohne Theorie') + ': rund ' + F.chf(r.total) + '. Dauer ca. ' + months + ' Monate bei ' + r.w +
        (r.w === 1 ? ' Lektion' : ' Lektionen') + ' pro Woche. ' + location.href.split('#')[0] + '#rechner';
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { F.toast('Ergebnis kopiert'); }, function () { F.toast('Kopieren nicht möglich'); });
      } else F.toast('Kopieren nicht möglich');
    });

    // Links "Mit PPL / LAPL rechnen"
    document.addEventListener('click', function (e) {
      var a = e.target.closest('[data-calc-set]');
      if (a) setLicense(a.getAttribute('data-calc-set'));
    });

    render();
    // Erster Auftritt: Balken wachsen, Total zählt hoch
    onceVisible(F.$('.calc__result', root), function () {
      shown = true;
      if (!reduced) { totalEl._v = 0; totalEl.textContent = '0'; }
      setTimeout(function () { render(); }, reduced ? 0 : 120);
    });

    return {
      setWeek: function (n) { week.value = Math.min(5, Math.max(1, n)); render(); },
      monthsFor: function (h, w) { return Math.max(1, Math.round(h / w / WEEKS_PER_MONTH)); }
    };
  })();

  // Anteil der Theorie an den Gesamtkosten
  F.$$('[data-share]').forEach(function (el) {
    var part = +el.getAttribute('data-share-part'), total = +el.getAttribute('data-share-total');
    var out = F.$('[data-share-out]', el);
    if (out && part && total) out.textContent = 'rund ' + Math.round(part / total * 100) + ' %';
  });

  // ------------------------------------------------------------------
  // 2. Ablauf: Fortschrittsanzeige zu den 9 Schritten
  // ------------------------------------------------------------------
  (function () {
    var steps = F.$$('.ausb-steps .step');
    var count = F.$('[data-flow-count]'), fillEl = F.$('[data-flow-fill]'), label = F.$('[data-flow-label]');
    var plane = F.$('.ausb-progress__plane');
    if (!steps.length || !count) return;
    function update() {
      var active = steps.filter(function (s) { return s.classList.contains('is-active'); });
      var n = active.length, p = n / steps.length * 100;
      count.textContent = n;
      fillEl.style.width = p + '%';
      plane.style.left = p + '%';
      label.textContent = n ? 'Schritt ' + n + ': ' + active[n - 1].getAttribute('data-flow-title') : 'Bereit zum Start';
    }
    if ('MutationObserver' in window) {
      var mo = new MutationObserver(update);
      steps.forEach(function (s) { mo.observe(s, { attributes: true, attributeFilter: ['class'] }); });
    }
    update();
  })();

  // ------------------------------------------------------------------
  // 3. Selbsttest "Bereit fürs Cockpit?"
  // ------------------------------------------------------------------
  (function () {
    var quiz = F.$('[data-quiz]');
    if (!quiz) return;
    var NAMES = ['q-alter', 'q-medical', 'q-zeit', 'q-motiv'];
    var result = F.$('[data-quiz-result]', quiz);
    var list = F.$('[data-quiz-list]', quiz);
    var gauge = F.$('[data-quiz-gauge]', quiz);
    var tpl = F.$('[data-quiz-icons]', quiz);
    var ICON = {};
    if (tpl) F.$$('[data-i]', tpl.content).forEach(function (s) { ICON[s.getAttribute('data-i')] = s.innerHTML; });

    var TEXT = {
      'q-alter': {
        u16: ['info', 1, 'Du bist früh dran, perfekt! Den ersten Alleinflug darfst du ab 16 Jahren machen, die Lizenz gibt es ab 17. Bis dahin kannst du dich schon informieren, zum Beispiel an einem <a href="infoabende.html">Infoabend</a>.'],
        '16': ['ok', 2, 'Perfektes Timing: Mit 16 darfst du den ersten Alleinflug machen, die Lizenz gibt es ab 17.'],
        '17': ['ok', 2, 'Das Alter passt: Ab 17 Jahren kannst du die Lizenz erhalten.']
      },
      'q-medical': {
        fit: ['ok', 2, 'Sehr gut. Für die Ausbildung brauchst du ein Medical (PPL: Klasse 2, LAPL: LAPL Medical). Die Adressen der Fliegerärzte bekommst du von uns.'],
        unsicher: ['info', 1, 'Kläre deine Fragen früh mit einem Fliegerarzt. Die fliegerärztliche Untersuchung (rund CHF 250) zeigt, ob einem Medical etwas im Weg steht.']
      },
      'q-motiv': {
        alpen: ['ok', 2, 'Dann freu dich auf die Navigation: Zweimal geht es in der Ausbildung über die Alpen, bei der sogenannten Alpeneinweisung.'],
        passagiere: ['ok', 2, 'Nach der bestandenen Prüfung darfst du sofort Passagiere mitnehmen. In der vierplätzigen Cessna 172 haben bis zu drei Gäste Platz.'],
        challenge: ['ok', 2, 'Basismanöver, Notverfahren, Navigation, Funk: Jede Lektion bringt dich weiter. Und dann kommt der magische Moment, der erste Alleinflug.'],
        neugier: ['ok', 2, 'Der beste Weg, es herauszufinden: ein <a href="schnupperflug.html">Schnupperflug</a>. Du sitzt selbst am Steuer, und der Flug kann sogar an die Ausbildung angerechnet werden.']
      }
    };

    function answers() {
      var a = {};
      NAMES.forEach(function (n) { var r = quiz.querySelector('input[name="' + n + '"]:checked'); if (r) a[n] = r.value; });
      return a;
    }

    function update() {
      var a = answers(), n = Object.keys(a).length;
      F.$('[data-quiz-count]', quiz).textContent = n;
      F.$('[data-quiz-fill]', quiz).style.width = (n / NAMES.length * 100) + '%';
      if (n < NAMES.length) { result.hidden = true; return; }

      var items = [], score = 0;
      ['q-alter', 'q-medical'].forEach(function (k) { var t = TEXT[k][a[k]]; score += t[1]; items.push(t); });
      var w = +a['q-zeit'];
      var months = calc ? calc.monthsFor(55, w) : Math.round(55 / w / WEEKS_PER_MONTH);
      score += 2;
      items.push(['ok', 2, 'Mit ' + (w === 3 ? '3 oder mehr Lektionen' : w === 1 ? '1 Lektion' : w + ' Lektionen') + ' pro Woche bist du rein rechnerisch in rund ' + months + ' Monaten am Ziel (bei rund 55 Flugstunden, ohne Pausen wegen Wetter oder Ferien). <button type="button" data-quiz-tocalc="' + w + '">Im Rechner ansehen</button>']);
      var m = TEXT['q-motiv'][a['q-motiv']]; score += m[1]; items.push(m);

      var full = score >= 8;
      F.$('[data-quiz-kicker]', quiz).textContent = full ? 'Cleared for take-off' : 'Ready for departure';
      F.$('[data-quiz-title]', quiz).textContent = full ? 'Du bist startklar!' : 'Fast startklar!';
      list.innerHTML = items.map(function (t) {
        return '<li class="is-' + t[0] + '">' + (ICON[t[0]] || '') + '<span>' + t[2] + '</span></li>';
      }).join('');
      var wasHidden = result.hidden;
      result.hidden = false;
      gauge.style.strokeDashoffset = '314.16';
      requestAnimationFrame(function () { requestAnimationFrame(function () { gauge.style.strokeDashoffset = String(314.16 * (1 - score / 8)); }); });
      if (wasHidden && !reduced) {
        var rect = result.getBoundingClientRect();
        if (rect.top > innerHeight * 0.8) {
          if (F.lenis) F.lenis.scrollTo(result, { offset: -140 }); else result.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }

    quiz.addEventListener('change', update);
    quiz.addEventListener('click', function (e) {
      var b = e.target.closest('[data-quiz-tocalc]');
      if (b) {
        if (calc) calc.setWeek(+b.getAttribute('data-quiz-tocalc'));
        var target = document.getElementById('rechner');
        if (F.lenis) F.lenis.scrollTo(target, { offset: -90 }); else target.scrollIntoView({ behavior: 'smooth' });
      }
      if (e.target.closest('[data-quiz-reset]')) {
        F.$$('input', quiz).forEach(function (i) { i.checked = false; });
        update();
        var first = quiz.querySelector('input');
        if (first) first.focus({ preventScroll: true });
      }
    });
    update();
  })();

  // ------------------------------------------------------------------
  // 4. Funkalphabet (ICAO)
  // ------------------------------------------------------------------
  (function () {
    var box = F.$('[data-funk]');
    if (!box) return;
    var input = F.$('[data-funk-input]', box), out = F.$('[data-funk-out]', box), spoken = F.$('[data-funk-spoken]', box), speak = F.$('[data-funk-speak]', box);
    var ICAO = {
      A: 'Alfa', B: 'Bravo', C: 'Charlie', D: 'Delta', E: 'Echo', F: 'Foxtrot', G: 'Golf', H: 'Hotel', I: 'India', J: 'Juliett',
      K: 'Kilo', L: 'Lima', M: 'Mike', N: 'November', O: 'Oscar', P: 'Papa', Q: 'Quebec', R: 'Romeo', S: 'Sierra', T: 'Tango',
      U: 'Uniform', V: 'Victor', W: 'Whiskey', X: 'X-ray', Y: 'Yankee', Z: 'Zulu',
      '0': 'Zero', '1': 'One', '2': 'Two', '3': 'Tree', '4': 'Four', '5': 'Fife', '6': 'Six', '7': 'Seven', '8': 'Eight', '9': 'Niner'
    };
    var words = [];

    function normalize(s) {
      return String(s).toUpperCase()
        .replace(/Ä/g, 'AE').replace(/Ö/g, 'OE').replace(/Ü/g, 'UE').replace(/ß/g, 'SS')
        .normalize('NFD').replace(/[̀-ͯ]/g, '');
    }

    function render(animate) {
      var s = normalize(input.value);
      var html = [], i = 0;
      words = [];
      var groups = [];
      s.split('').forEach(function (ch) {
        if (ICAO[ch]) {
          var digit = /[0-9]/.test(ch);
          html.push('<li class="funk__card' + (digit ? ' funk__card--digit' : '') + '" style="--i:' + i + '"><span class="funk__letter">' + ch + '</span><span class="funk__word">' + ICAO[ch] + '</span></li>');
          words.push(ICAO[ch]);
          if (!groups.length) groups.push([]);
          groups[groups.length - 1].push(ICAO[ch]);
          i++;
        } else if (/\s/.test(ch) && html.length && html[html.length - 1].indexOf('funk__gap') < 0) {
          html.push('<li class="funk__gap" aria-hidden="true"></li>');
          groups.push([]);
        }
      });
      out.classList.remove('is-anim');
      if (!html.length) {
        out.innerHTML = '<li class="funk__empty">Tippe deinen Namen ein, zum Beispiel «Anna» oder «Jürg».</li>';
        spoken.textContent = '';
      } else {
        out.innerHTML = html.join('');
        spoken.innerHTML = '<b>Am Funk:</b> ' + groups.filter(function (g) { return g.length; }).map(function (g) { return F.escape(g.join(' ')); }).join(' · ');
      }
      if (animate && !reduced) { void out.offsetWidth; out.classList.add('is-anim'); }
      if (speak) speak.hidden = !words.length || !('speechSynthesis' in window);
    }

    var timer = null;
    input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(function () { render(true); }, 120); });
    F.$$('[data-funk-example]', box).forEach(function (b) {
      b.addEventListener('click', function () { input.value = b.getAttribute('data-funk-example'); render(true); });
    });
    if (speak) speak.addEventListener('click', function () {
      if (!('speechSynthesis' in window) || !words.length) return;
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(words.join(', '));
      u.lang = 'en-GB';
      u.rate = 0.9;
      window.speechSynthesis.speak(u);
    });
    render(false);
    onceVisible(out, function () { render(true); });
  })();
})();
