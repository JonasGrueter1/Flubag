/* Formulare: Validierung, Mehrschritt-Assistent, Versand (Endpoint oder E-Mail) */
(function () {
  'use strict';
  var F = window.FLUBAG;
  var MSG = {
    required: 'Bitte ausfüllen.',
    email: 'Bitte gib eine gültige E-Mail-Adresse ein.',
    tel: 'Bitte gib eine gültige Telefonnummer ein.',
    min: 'Der Wert ist zu klein.',
    max: 'Der Wert ist zu gross.',
    date: 'Bitte wähle ein Datum in der Zukunft.',
    datePast: 'Das Datum darf nicht in der Zukunft liegen.',
    check: 'Bitte bestätigen.',
    choice: 'Bitte wähle eine Option.'
  };

  function fieldOf(input) { return input.closest('.field') || input.closest('.choice-grid') || input.closest('.check') || input.parentElement; }
  function setError(input, msg) {
    var f = fieldOf(input);
    if (!f) return;
    f.classList.toggle('is-invalid', !!msg);
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    var err = f.querySelector('.field__error');
    if (!err && msg) { err = document.createElement('p'); err.className = 'field__error'; err.id = (input.id || input.name) + '-err'; f.appendChild(err); input.setAttribute('aria-describedby', err.id); }
    if (err) err.textContent = msg || '';
  }

  function validateInput(input) {
    if (input.disabled || input.closest('[hidden]')) return true;
    var v = (input.value || '').trim(), msg = '';
    if (input.type === 'radio') {
      var group = F.$$('input[name="' + input.name + '"]', input.form);
      if (group.some(function (g) { return g.required; }) && !group.some(function (g) { return g.checked; })) msg = MSG.choice;
      setError(group[0], msg);
      return !msg;
    }
    if (input.type === 'checkbox') { if (input.required && !input.checked) msg = MSG.check; }
    else if (input.required && !v) msg = MSG.required;
    else if (v && input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) msg = MSG.email;
    else if (v && input.type === 'tel' && !/^[+()\d\s/.-]{7,}$/.test(v)) msg = MSG.tel;
    else if (v && input.type === 'number' && input.min !== '' && +v < +input.min) msg = MSG.min;
    else if (v && input.type === 'number' && input.max !== '' && +v > +input.max) msg = MSG.max;
    else if (v && input.type === 'date' && input.min && v < input.min) msg = MSG.date;
    else if (v && input.type === 'date' && input.max && v > input.max) msg = MSG.datePast;
    setError(input, msg);
    return !msg;
  }

  function validate(scope) {
    var inputs = F.$$('input, select, textarea', scope).filter(function (i) { return i.name && !i.closest('.honeypot'); });
    var seenRadio = {}, ok = true, first = null;
    inputs.forEach(function (i) {
      if (i.type === 'radio') { if (seenRadio[i.name]) return; seenRadio[i.name] = 1; }
      if (!validateInput(i)) { ok = false; if (!first) first = i; }
    });
    if (first) { first.focus({ preventScroll: true }); first.scrollIntoView({ behavior: F.reducedMotion ? 'auto' : 'smooth', block: 'center' }); }
    return ok;
  }

  function values(form) {
    var out = {}, fd = new FormData(form);
    fd.forEach(function (v, k) {
      if (k.charAt(0) === '_' || k === 'website') return;
      out[k] = out[k] ? out[k] + ', ' + v : v;
    });
    return out;
  }

  function labelFor(form, name) {
    var el = form.querySelector('[name="' + name + '"]');
    if (!el) return name;
    if (el.dataset.label) return el.dataset.label;
    var f = el.closest('.field');
    var l = f && f.querySelector('.field__label');
    if (l) return l.textContent.replace('*', '').trim();
    var g = el.closest('fieldset');
    var lg = g && g.querySelector('legend');
    return lg ? lg.textContent.trim() : name;
  }

  function mailto(form, data) {
    var subject = (form.dataset.subject || 'Anfrage über flubag.ch');
    var lines = Object.keys(data).map(function (k) { return labelFor(form, k) + ': ' + data[k]; });
    var href = 'mailto:' + F.config.form.email + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\n') + '\n\n(gesendet über das Formular auf flubag.ch)');
    window.location.href = href;
  }

  function success(form, viaMail) {
    form.classList.add('is-sent');
    var box = form.querySelector('.form-success');
    if (box) {
      var note = box.querySelector('[data-mail-note]');
      if (note) note.hidden = !viaMail;
      var h = box.querySelector('h3');
      if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
      box.scrollIntoView({ behavior: F.reducedMotion ? 'auto' : 'smooth', block: 'center' });
    }
    F.toast(viaMail ? 'Dein E-Mail-Programm wurde mit allen Angaben geöffnet.' : 'Danke! Deine Anfrage ist bei uns angekommen.');
  }

  function submit(form) {
    var btn = form.querySelector('[type="submit"]');
    if (form.querySelector('.honeypot input') && form.querySelector('.honeypot input').value) { success(form, false); return; }
    var data = values(form);
    var tEl = form.querySelector('input[name="_t"]');
    if (tEl) data._t = tEl.value;
    data._form = form.dataset.formName || form.id || 'Kontakt';
    data._page = location.href;
    var cfg = F.config.form;
    if (cfg.mode === 'mailto' || location.protocol === 'file:') { mailto(form, values(form)); success(form, true); return; }
    if (btn) btn.classList.add('is-loading');
    fetch(cfg.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(data) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok || !j.ok) throw new Error(j.error || r.status); return j; }); })
      .then(function () { success(form, false); })
      .catch(function () { mailto(form, values(form)); success(form, true); })
      .then(function () { if (btn) btn.classList.remove('is-loading'); });
  }

  function wizard(form) {
    var steps = F.$$('[data-step]', form);
    var prog = F.$$('[data-wizard-progress] li', form);
    var i = 0;
    function show(n) {
      i = Math.max(0, Math.min(n, steps.length - 1));
      steps.forEach(function (s, k) { s.classList.toggle('is-current', k === i); });
      prog.forEach(function (p, k) { p.classList.toggle('is-current', k === i); p.classList.toggle('is-done', k < i); });
      F.emit('flubag:wizard-step', { form: form, index: i });
      var top = form.getBoundingClientRect().top + window.scrollY - 120;
      if (Math.abs(window.scrollY - top) > 200) { if (F.lenis) F.lenis.scrollTo(top); else window.scrollTo({ top: top, behavior: 'smooth' }); }
    }
    form.addEventListener('click', function (e) {
      if (e.target.closest('[data-next]')) { e.preventDefault(); if (validate(steps[i])) show(i + 1); }
      if (e.target.closest('[data-prev]')) { e.preventDefault(); show(i - 1); }
    });
    show(0);
  }

  function summary(form) {
    var boxes = F.$$('[data-summary]', form);
    if (!boxes.length) return;
    var update = function () {
      var data = values(form);
      boxes.forEach(function (b) {
        var names = (b.getAttribute('data-summary') || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        b.innerHTML = names.filter(function (n) { return data[n]; }).map(function (n) {
          return '<div><dt>' + F.escape(labelFor(form, n)) + '</dt><dd>' + F.escape(data[n]) + '</dd></div>';
        }).join('') || '<div><dt>Noch keine Angaben</dt><dd></dd></div>';
      });
    };
    form.addEventListener('input', update);
    form.addEventListener('change', update);
    update();
  }

  F.forms = {
    validate: validate,
    values: values,
    init: function () {
      var today = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
      F.$$('form[data-form]').forEach(function (form) {
        form.setAttribute('novalidate', '');
        F.$$('input[type="date"][data-future]', form).forEach(function (d) { d.min = today; });
        F.$$('input[type="date"][data-past]', form).forEach(function (d) { var n = new Date(); d.max = n.getFullYear() + '-' + F.pad(n.getMonth() + 1) + '-' + F.pad(n.getDate()); });
        var t = form.querySelector('input[name="_t"]');
        if (t) t.value = String(Date.now());
        form.addEventListener('blur', function (e) { if (e.target.matches('input, select, textarea') && e.target.value) validateInput(e.target); }, true);
        form.addEventListener('change', function (e) { if (e.target.closest('.is-invalid')) validateInput(e.target); });
        form.addEventListener('submit', function (e) { e.preventDefault(); if (validate(form)) submit(form); });
        if (form.hasAttribute('data-wizard')) wizard(form);
        summary(form);
        F.$$('[data-form-reset]', form).forEach(function (b) { b.addEventListener('click', function () { form.reset(); form.classList.remove('is-sent'); if (form.hasAttribute('data-wizard')) wizard(form); }); });
      });
      // Formular über URL vorbelegen, z.B. kontakt.html?thema=Hangar
      var params = new URLSearchParams(location.search);
      params.forEach(function (v, k) {
        F.$$('form[data-form] [name="' + (window.CSS && CSS.escape ? CSS.escape(k) : k) + '"]').forEach(function (el) {
          if (el.type === 'radio' || el.type === 'checkbox') el.checked = el.value === v; else el.value = v;
          el.dispatchEvent(new Event('change', { bubbles: true }));
        });
      });
    }
  };
})();
