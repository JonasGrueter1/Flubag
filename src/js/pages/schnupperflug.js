/* Schnupperflug: Auswahl aus den Preiskarten übernehmen, Begleitpersonen, Preis */
(function () {
  'use strict';
  var F = window.FLUBAG;
  var form = F.$('form[data-form-name="Schnupperflug-Anfrage"]');
  if (!form) return;
  var companions = F.$('[data-companions]', form);
  var priceEl = F.$('[data-sf-price]', form);

  function update() {
    var sel = form.querySelector('input[name="flug"]:checked');
    var is172 = sel && sel.value.indexOf('172') > -1;
    companions.hidden = !is172;
    if (!is172) form.querySelector('[name="begleitung"]').value = 'Keine';
    priceEl.textContent = sel ? F.chf(+sel.getAttribute('data-price')) : 'noch offen';
  }
  form.addEventListener('change', update);

  F.$$('[data-pick]').forEach(function (a) {
    a.addEventListener('click', function () {
      var r = form.querySelector('input[name="flug"][value="' + a.getAttribute('data-pick') + '"]');
      if (r) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); }
    });
  });
  update();
})();
