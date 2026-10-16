/* Safety Policy: Melde-Assistent (Anhang 1) und Filter der meldepflichtigen Vorfälle */
(function () {
  'use strict';
  var F = window.FLUBAG;
  if (!F) return;
  var $ = F.$, $$ = F.$$;

  // Meldeweg: Ja / Nein / alle Wege
  var flow = $('[data-sp-flow]');
  var ask = $('[data-sp-ask]');
  var out = $('[data-sp-out]');
  var TEXT = {
    ja: 'Sofort REGA 1414 (aus dem Ausland +41 333 333 333), innert 72 Stunden BAZL über das Meldeportal und zusätzlich die interne Meldung per E-Mail.',
    nein: 'Interne Meldung per E-Mail. Im Zweifelsfall lieber die Liste der meldepflichtigen Vorfälle prüfen.',
    alle: 'Alle Meldewege gemäss Anhang 1 der Safety Policy.'
  };
  if (flow && ask) {
    ask.addEventListener('change', function (e) {
      var v = e.target.value;
      if (!TEXT[v]) return;
      flow.setAttribute('data-mode', v);
      if (out) out.textContent = TEXT[v];
    });
  }

  // Liste: Motorflugzeuge / Segelflugzeuge und TMG
  var list = $('[data-sp-list]');
  var type = $('[data-sp-type]');
  if (list) {
    $$('li[data-only]', list).forEach(function (li) {
      li.setAttribute('data-label', li.getAttribute('data-only') === 'motor' ? 'Motorflug' : 'Segelflug, TMG');
    });
  }
  if (list && type) {
    type.addEventListener('change', function (e) {
      if (e.target.name === 'sp-typ') list.setAttribute('data-type', e.target.value);
    });
  }
})();
