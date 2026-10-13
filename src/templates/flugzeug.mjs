// Detailseiten der Flotte: erzeugt flugzeug-<id>.html für jedes Flugzeug aus src/data/flotte.json.
// Daten: flotte.json (Typ, Specs, Preise, Facts), dokumente.json (Handbücher, Checklisten, Familiarization),
// preise.json (Erklärung Preis 2, Fluglehrer, Schnupperflug). CSS und JS teilen sich die Seiten mit flotte.html.

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const num = (v, d = 2) => Number(v).toLocaleString('de-CH', { maximumFractionDigits: d });
const chf = (v, dec) => {
  const d = dec ?? (Number(v) % 1 ? 2 : 0);
  return 'CHF ' + Number(v).toLocaleString('de-CH', { minimumFractionDigits: d, maximumFractionDigits: d });
};
// Dokumenttitel der alten Seite enthalten " - " als Trenner: als Doppelpunkt darstellen
const docTitle = (t) => esc(String(t).replace(/\s+[-–—]\s+/g, ': '));
const has = (v) => v !== null && v !== undefined && v !== '';
const fmtMin = (m) => `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`;

const SECTIONS = [
  { key: 'Flughandbuch', title: 'Flughandbuch', icon: 'book-open' },
  { key: 'Checklisten', title: 'Checklisten', icon: 'clipboard-check' },
  { key: 'Weitere Handbücher', title: 'Weitere Handbücher', icon: 'layers' },
];

// "Section 9, Part 2" -> 9.2 ; Dokumente ohne Abschnittsnummer behalten ihre Reihenfolge vorne
function sectionOrder(title) {
  const m = String(title).match(/^Sec(?:tion)?\s+(\d+)(?:,\s*Part\s+(\d+))?/i);
  return m ? Number(m[1]) + (m[2] ? Number(m[2]) / 10 : 0) : -1;
}

function avionicsIcon(name) {
  if (/transponder|mode s/i.test(name)) return 'radar';
  if (/flarm/i.test(name)) return 'shield-check';
  if (/glascockpit|skyview/i.test(name)) return 'monitor';
  if (/autopilot/i.test(name)) return 'compass';
  if (/gps|nav/i.test(name)) return 'navigation';
  if (/tandem|sitz/i.test(name)) return 'armchair';
  return 'radio';
}

function docItem(d, extraMeta) {
  const isXls = d.type === 'xlsx';
  const meta = [isXls ? 'Excel' : 'PDF', extraMeta].filter(Boolean).join(' · ');
  return `<li><a class="doc" href="${esc(d.url)}" target="_blank" rel="noopener" data-doc="${esc(String(d.title).toLowerCase())}"><x-icon name="${isXls ? 'file-spreadsheet' : 'file-text'}" class="doc__icon"></x-icon><span><span class="doc__title">${docTitle(d.title)}</span><span class="doc__meta">${esc(meta)}</span></span><x-icon name="arrow-up-right" class="doc__go"></x-icon></a></li>`;
}

export function pages(DATA) {
  const fleet = DATA.flotte;
  const docs = DATA.dokumente || [];
  const preise = DATA.preise || {};
  const fi = (preise.fluglehrer || []).find((f) => /flubag/i.test(f.label)) || { perMin: 1.5, perHour: 90 };

  return fleet.map((a, i) => {
    const prev = fleet[(i - 1 + fleet.length) % fleet.length];
    const next = fleet[(i + 1) % fleet.length];
    const s = a.specs || {};
    const schnupper = (preise.schnupperflug || []).filter((o) => o.aircraft === a.type);
    const isTrial = schnupper.length > 0;

    // ---------- Dokumente
    const own = docs.filter((d) => d.group === 'flugzeug' && d.aircraft === a.reg);
    const groups = SECTIONS.map((sec) => {
      const list = own.filter((d) => d.section === sec.key);
      if (sec.key === 'Flughandbuch') list.sort((x, y) => sectionOrder(x.title) - sectionOrder(y.title));
      return { ...sec, list };
    }).filter((g) => g.list.length);
    const famDocs = docs.filter((d) => d.group === 'familiarization' && (d.title === `Familiarization ${a.type}` || (/FLARM/i.test(d.title) && a.avionics.some((x) => /flarm/i.test(x)))));
    const docCount = own.length;

    // ---------- Kennzahlen (null Werte weglassen)
    const stats = [
      has(s.cruiseKmh) && { value: s.cruiseKmh, unit: 'km/h', label: 'Reisegeschwindigkeit' },
      has(s.rangeKm) && { value: s.rangeKm, unit: 'km', label: 'Reichweite' },
      has(s.mtowKg) && { value: s.mtowKg, unit: 'kg', label: 'Max. Abfluggewicht' },
      has(a.seats) && { value: a.seats, unit: '', label: a.seats === 1 ? 'Platz' : 'Plätze' },
    ].filter(Boolean);
    const specs = [
      has(s.engine) && { label: 'Motor', value: esc(s.engine), wide: true },
      has(s.cruiseKt) && { label: 'Reiseflug', value: `${num(s.cruiseKt)} <small>kt</small>` },
      has(s.spanM) && { label: 'Spannweite', value: `${num(s.spanM)} <small>m</small>` },
      has(s.lengthM) && { label: 'Länge', value: `${num(s.lengthM)} <small>m</small>` },
      has(s.ceilingFt) && { label: 'Dienstgipfelhöhe', value: `${num(s.ceilingFt)} <small>ft</small>` },
      has(a.built) && { label: 'Baujahr', value: esc(a.built) },
      has(a.fuel) && { label: 'Benzinzuschlag', value: `${num(a.fuel)} <small>%</small>` },
    ].filter(Boolean);

    const rolesChips = a.role.map((r) => `<span class="chip">${esc(r)}</span>`).join('');
    const builtChip = has(a.built) ? `<span class="chip"><x-icon name="calendar"></x-icon>Baujahr ${esc(a.built)}</span>` : '';
    const descr = `${a.type} ${a.reg} der FLUBAG in Luzern-Beromünster: ${a.seats} Plätze, technische Daten, Mietpreise ab ${chf(a.price2)} pro Stunde, Handbücher und Checklisten.`;
    const p60 = (m) => chf(Math.round(m * 60 * 100) / 100, 2);

    // ---------- CTA
    const roundtrip = a.role.includes('Rundflüge');
    const cta = isTrial
      ? {
          bg: 'hero/slide-01',
          eyebrow: 'Schnupperflug',
          title: `Selbst ans Steuer der ${esc(a.reg)}.`,
          lead: `Mit einem Fluglehrer am Doppelsteuer: ${schnupper.map((o) => `${o.minutes} Minuten für ${chf(o.price)}`).join(' oder ')}, inklusive Fluglehrer. Vorkenntnisse sind keine nötig.${a.seats > 2 ? ' In der ' + esc(a.type) + ' können Freunde oder Familie hinten mitfliegen.' : ''}`,
          actions: `<a class="btn btn--primary btn--lg" href="schnupperflug.html#anfrage" data-magnetic><x-icon name="plane-takeoff"></x-icon>Schnupperflug anfragen</a>
        <a class="btn btn--ghost btn--lg" href="gutscheine.html"><x-icon name="gift"></x-icon>Als Gutschein verschenken</a>${roundtrip ? '\n        <a class="btn btn--ghost btn--lg" href="rundfluege.html"><x-icon name="route"></x-icon>Rundflüge</a>' : ''}`,
        }
      : {
          bg: 'hero/slide-04',
          eyebrow: 'Mit Lizenz ins Cockpit',
          title: `Bereit für die ${esc(a.reg)}?`,
          lead: `Mit gültiger Lizenz und Einweisung auf das Muster reservierst du die ${esc(a.reg)} online. Fragen zu Einweisung oder Umschulung beantworten wir gerne.`,
          actions: `<a class="btn btn--primary btn--lg" href="{{site.reservation}}" target="_blank" rel="noopener" data-magnetic><x-icon name="calendar-check"></x-icon>Flugzeug reservieren</a>
        <a class="btn btn--ghost btn--lg" href="kontakt.html"><x-icon name="mail"></x-icon>Kontakt aufnehmen</a>${roundtrip ? '\n        <a class="btn btn--ghost btn--lg" href="rundfluege.html"><x-icon name="route"></x-icon>Rundflüge</a>' : ''}`,
        };

    const body = `
<section class="page-hero ac-hero" aria-labelledby="ac-title">
  <div class="page-hero__media ac-hero__bg" aria-hidden="true"><x-img src="${esc(a.image)}" alt="" sizes="(max-width: 860px) 92vw, 560px" loading="eager"></x-img></div>
  <span class="ac-hero__ghost mono" aria-hidden="true">${esc(a.reg)}</span>
  <div class="container ac-hero__grid">
    <div class="page-hero__inner ac-hero__text">
      <ol class="breadcrumbs"><li><a href="index.html">Start</a></li><li><a href="flotte.html">Flotte</a></li><li>${esc(a.reg)}</li></ol>
      <p class="eyebrow">${esc(a.type)} · ${esc(a.nickname)}</p>
      <h1 id="ac-title" class="ac-hero__title"><span class="ac-hero__reg mono" data-flap="${esc(a.reg)}">${esc(a.reg)}</span> <span class="ac-hero__type">${esc(a.variant)}</span></h1>
      <p class="lead">${esc(a.intro)}</p>
      <div class="page-hero__meta">
        <span class="chip"><x-icon name="users"></x-icon>${a.seats} Plätze</span>
        ${builtChip}
        ${rolesChips}
      </div>
      <div class="row mt-s">
        <a class="btn btn--primary btn--lg" href="#preise" data-magnetic><x-icon name="receipt"></x-icon>Mietpreise</a>
        <a class="btn btn--ghost btn--lg" href="#dokumente"><x-icon name="book-open"></x-icon>Handbücher</a>
      </div>
    </div>
    <figure class="ac-hero__photo">
      <div class="ac-hero__frame hud-corners" data-tilt="5">
        <x-img src="${esc(a.image)}" alt="${esc(a.variant)} ${esc(a.reg)} der FLUBAG" sizes="(max-width: 860px) 92vw, 560px" loading="eager" fetchpriority="high"></x-img>
        <span class="ac-hero__tag mono">${esc(a.reg)}</span>
      </div>
      <figcaption class="ac-hero__hud instrument force-dark">
        <span class="readout"><span class="readout__label">Plätze</span><span class="readout__value">${a.seats}</span></span>
        ${has(s.cruiseKt) ? `<span class="readout"><span class="readout__label">Reiseflug</span><span class="readout__value">${num(s.cruiseKt)} <small>kt</small></span></span>` : ''}
        <span class="readout"><span class="readout__label">Miete ab</span><span class="readout__value">${num(a.price2)} <small>CHF/h</small></span></span>
      </figcaption>
    </figure>
  </div>
  <a class="scroll-cue" href="#technik" aria-label="Weiter zu den technischen Daten"><span></span></a>
</section>

<nav class="subnav" data-subnav aria-label="Inhalt dieser Seite">
  <div class="container">
    <ul class="subnav__list">
      <li><a href="#technik">Technische Daten</a></li>
      ${a.facts && a.facts.length ? '<li><a href="#wusstest">Wusstest du?</a></li>' : ''}
      <li><a href="#preise">Mietpreise</a></li>
      <li><a href="#dokumente">Handbücher &amp; Checklisten</a></li>
      <li><a href="#flotte">Weitere Flugzeuge</a></li>
    </ul>
  </div>
</nav>

<section class="section" id="technik" aria-labelledby="technik-title">
  <div class="container split split--top ac-tech">
    <div class="stack-l sticky">
      <div class="stack">
        <p class="eyebrow" data-reveal>Technische Daten</p>
        <h2 id="technik-title" data-split>Die ${esc(a.type)} in Zahlen.</h2>
        <p class="lead" data-reveal>${esc(a.variant)}: ${esc(a.builtNote)}${has(a.built) ? `, Baujahr ${esc(a.built)}` : ''}.</p>
      </div>
      ${a.avionics && a.avionics.length ? `<div class="ac-avionics instrument hud-corners force-dark" data-reveal>
        <p class="ac-avionics__head mono"><span>COCKPIT · AUSRÜSTUNG</span><span class="dot dot--ok"></span></p>
        <ul class="ac-avionics__list">
          ${a.avionics.map((x) => `<li><x-icon name="${avionicsIcon(x)}"></x-icon><span>${esc(x)}</span></li>`).join('\n          ')}
        </ul>
      </div>` : ''}
    </div>
    <div class="stack-l">
      <div class="stats stats--2" data-reveal>
        ${stats.map((st) => `<div class="stat"><span class="stat__value"><span data-count="${st.value}"${st.value >= 1000 ? '' : ''}>${num(st.value)}</span>${st.unit ? `<small>${st.unit}</small>` : ''}</span><span class="stat__label">${st.label}</span></div>`).join('\n        ')}
      </div>
      <div class="specs ac-specs" data-reveal-group="0.06">
        ${specs.map((sp) => `<div class="spec${sp.wide ? ' spec--wide' : ''}" data-reveal><span class="spec__label">${sp.label}</span><span class="spec__value">${sp.value}</span></div>`).join('\n        ')}
      </div>
      <div class="notice" data-reveal>
        <x-icon name="info"></x-icon>
        <div><p><strong>Technische Daten sind typische Werte des Flugzeugmusters, massgebend ist das Flughandbuch.</strong></p><p>Leistungen hängen von Beladung, Höhe, Leistungseinstellung und Wetter ab.</p></div>
      </div>
    </div>
  </div>
</section>

${a.facts && a.facts.length ? `<section class="section section--alt section--glow" id="wusstest" aria-labelledby="wusstest-title">
  <div class="container">
    <div class="section-head">
      <p class="eyebrow" data-reveal>Wusstest du?</p>
      <h2 id="wusstest-title" data-split>${a.facts.length} Fakten zur ${esc(a.reg)}.</h2>
    </div>
    <div class="ac-facts" data-reveal-group="0.12">
      ${a.facts.map((f, k) => `<article class="ac-fact card card--glow" data-reveal><span class="ac-fact__num mono">0${k + 1}</span><x-icon name="${['sparkles', 'lightbulb', 'star'][k % 3]}" class="ac-fact__icon"></x-icon><p class="ac-fact__text">${esc(f)}</p></article>`).join('\n      ')}
    </div>
  </div>
</section>` : ''}

<section class="section section--chart" id="preise" aria-labelledby="preise-title">
  <div class="container split split--top ac-price">
    <div class="stack-l">
      <div class="stack">
        <p class="eyebrow" data-reveal>Mietpreise</p>
        <h2 id="preise-title" data-split>Was kostet die ${esc(a.reg)}?</h2>
        <p class="lead" data-reveal>Abgerechnet wird pro Minute. ${esc(preise.note || 'Alle Preise in CHF exkl. MwSt.')}</p>
      </div>
      <div class="rate-card ac-rate-card" data-reveal>
        <div class="rate-card__head">
          <div><p class="rate-card__reg">${esc(a.reg)}</p><p class="rate-card__type">${esc(a.variant)}</p></div>
          <span class="chip chip--brand"><x-icon name="fuel"></x-icon>Benzinzuschlag ${num(a.fuel)} %</span>
        </div>
        <div class="rate-card__prices">
          <div class="rate"><p class="rate__label">Preis 1</p><p class="rate__hour">${chf(a.price1)} <small>/ Std.</small></p><p class="rate__min">${chf(a.priceMin1, 2)} / Min.</p></div>
          <div class="rate rate--alt"><p class="rate__label">Preis 2 *</p><p class="rate__hour">${chf(a.price2)} <small>/ Std.</small></p><p class="rate__min">${chf(a.priceMin2, 2)} / Min.</p></div>
        </div>
        <p class="ac-rate-card__note">* ${esc(preise.price2Note || '')}</p>
      </div>
      <div class="row" data-reveal>
        <a class="btn btn--ghost" href="preise.html"><x-icon name="receipt"></x-icon>Alle Preise und Landetaxen</a>
      </div>
    </div>

    <div class="ac-calc form-panel" data-ac-calc data-min1="${a.priceMin1}" data-min2="${a.priceMin2}" data-fi="${fi.perMin}" data-reveal>
      <p class="eyebrow eyebrow--plain">Flugkosten-Rechner</p>
      <h3 class="ac-calc__title">Wie lange willst du fliegen?</h3>
      <div class="range">
        <div class="range__head"><label class="field__label" for="ac-calc-min">Flugzeit</label><output class="range__value" for="ac-calc-min" data-calc-time>${fmtMin(60)}</output></div>
        <input type="range" id="ac-calc-min" min="15" max="240" step="5" value="60" data-calc-range>
        <div class="ac-calc__ticks mono" aria-hidden="true"><span>15 min</span><span>2 h</span><span>4 h</span></div>
      </div>
      <label class="check"><input type="checkbox" data-calc-fi><span>Mit Fluglehrer (${chf(fi.perMin, 2)} pro Minute auf Flubag-Flugzeugen)</span></label>
      <div class="ac-calc__out" aria-live="polite">
        <div class="ac-calc__res"><span class="readout__label">Mit Preis 1</span><span class="ac-calc__val" data-calc-p1>${p60(a.priceMin1)}</span></div>
        <div class="ac-calc__res ac-calc__res--alt"><span class="readout__label">Mit Preis 2</span><span class="ac-calc__val" data-calc-p2>${p60(a.priceMin2)}</span></div>
      </div>
      <p class="field__help">Richtwert für die Flugzeugmiete${''}: zuzüglich Benzinzuschlag ${num(a.fuel)} % und Landetaxen, exkl. MwSt.</p>
    </div>
  </div>
</section>

<section class="section" id="dokumente" aria-labelledby="dokumente-title">
  <div class="container">
    <div class="section-head section-head--split">
      <div class="stack">
        <p class="eyebrow" data-reveal>Für Piloten</p>
        <h2 id="dokumente-title" data-split>Handbücher &amp; Checklisten.</h2>
      </div>
      <p class="lead" data-reveal>${docCount} Dokumente zur ${esc(a.reg)}: Flughandbuch, Checklisten und weitere Handbücher. Sie öffnen sich in einem neuen Fenster.</p>
    </div>

    <div class="ac-docs__tools" data-reveal>
      <div class="ac-search">
        <label class="visually-hidden" for="ac-doc-q">Dokumente durchsuchen</label>
        <x-icon name="search"></x-icon>
        <input class="input" type="search" id="ac-doc-q" placeholder="Dokument suchen, z.B. Emergency" autocomplete="off" data-doc-filter>
      </div>
      <p class="ac-docs__count mono subtle" data-doc-count aria-live="polite">${docCount} Dokumente</p>
    </div>

    <div class="ac-docs" data-docs data-reveal-group="0.1">
      ${groups.map((g) => `<div class="ac-docs__group" data-doc-group data-reveal>
        <h3 class="ac-docs__title"><x-icon name="${g.icon}"></x-icon>${g.title}<span class="chip">${g.list.length}</span></h3>
        <ul class="doc-list">
          ${g.list.map((d) => docItem(d, g.title)).join('\n          ')}
        </ul>
      </div>`).join('\n      ')}
    </div>
    <p class="ac-docs__empty muted" data-doc-empty hidden>Kein Dokument gefunden. Versuch es mit einem anderen Begriff.</p>

    <div class="ac-docs__extra" data-reveal-group="0.1">
      ${famDocs.length ? `<div class="card card--pad" data-reveal>
        <x-icon name="clipboard-check" class="card__icon"></x-icon>
        <h3 class="card__title mt-s">Familiarization ${esc(a.type)}</h3>
        <p class="card__text">Fragebogen (Student Questionnaire) zur Einweisung auf das Muster.</p>
        <ul class="doc-list mt-s">
          ${famDocs.map((d) => docItem(d, 'Fragebogen')).join('\n          ')}
        </ul>
      </div>` : ''}
      <div class="card card--pad ac-portal" data-reveal>
        <x-icon name="key-round" class="card__icon"></x-icon>
        <h3 class="card__title mt-s">Pilotenportal</h3>
        <p class="card__text">Die Unterlagen der ${esc(a.reg)} findest du auch im Pilotenportal der FLUBAG. Reserviert wird online im Reservationssystem.</p>
        <div class="card__foot">
          <a class="btn btn--ghost btn--sm portal" href="${esc(a.portal)}" target="_blank" rel="noopener"><x-icon name="external-link"></x-icon>${esc(a.reg)} im Pilotenportal</a>
          <a class="btn btn--text" href="{{site.reservation}}" target="_blank" rel="noopener">Reservation <x-icon name="arrow-up-right"></x-icon></a>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="section section--alt" id="flotte" aria-labelledby="flotte-title">
  <div class="container">
    <div class="section-head section-head--split">
      <div class="stack">
        <p class="eyebrow" data-reveal>Die Flotte</p>
        <h2 id="flotte-title" data-split>Weiterfliegen.</h2>
      </div>
      <div class="row" data-reveal><a class="btn btn--ghost" href="flotte.html#vergleich"><x-icon name="arrow-left-right"></x-icon>Flugzeuge vergleichen</a><a class="btn btn--text" href="flotte.html">Ganze Flotte <x-icon name="arrow-right"></x-icon></a></div>
    </div>
    <nav class="ac-pager" aria-label="Vorheriges und nächstes Flugzeug" data-reveal-group="0.1">
      ${[{ p: prev, dir: 'prev', label: 'Vorheriges Flugzeug', icon: 'arrow-left' }, { p: next, dir: 'next', label: 'Nächstes Flugzeug', icon: 'arrow-right' }].map((o) => `<a class="ac-pager__item ac-pager__item--${o.dir} card card--glow" href="flugzeug-${esc(o.p.id)}.html" rel="${o.dir}" data-reveal>
        <span class="ac-pager__media"><x-img src="${esc(o.p.image)}" alt="${esc(o.p.variant)} ${esc(o.p.reg)}" sizes="(max-width: 640px) 40vw, 260px"></x-img></span>
        <span class="ac-pager__body">
          <span class="ac-pager__dir mono">${o.dir === 'prev' ? `<x-icon name="${o.icon}"></x-icon>${o.label}` : `${o.label}<x-icon name="${o.icon}"></x-icon>`}</span>
          <span class="ac-pager__reg mono">${esc(o.p.reg)}</span>
          <span class="ac-pager__type">${esc(o.p.type)} · ${esc(o.p.nickname)}</span>
        </span>
      </a>`).join('\n      ')}
    </nav>
    <ul class="ac-strip" aria-label="Alle Flugzeuge der Flotte" data-reveal>
      ${fleet.map((p) => `<li><a class="ac-strip__item${p.id === a.id ? ' is-current' : ''}" href="flugzeug-${esc(p.id)}.html"${p.id === a.id ? ' aria-current="page"' : ''}><span class="mono">${esc(p.reg)}</span><span class="ac-strip__type">${esc(p.type)}</span></a></li>`).join('\n      ')}
    </ul>
  </div>
</section>

<section class="ac-cta force-dark" aria-labelledby="ac-cta-title">
  <div class="ac-cta__bg" aria-hidden="true"><x-img src="${cta.bg}" alt="" sizes="100vw" data-parallax="0.15"></x-img></div>
  <div class="container ac-cta__inner">
    <p class="eyebrow" data-reveal>${cta.eyebrow}</p>
    <h2 class="ac-cta__title" id="ac-cta-title" data-split>${cta.title}</h2>
    <p class="lead ac-cta__lead" data-reveal>${cta.lead}</p>
    <div class="ac-cta__actions" data-reveal>
        ${cta.actions}
    </div>
  </div>
</section>
`;

    return {
      file: `flugzeug-${a.id}.html`,
      meta: {
        title: `${a.reg} ${a.type}`,
        description: descr,
        nav: 'flotte',
        ogImage: a.image,
        bodyClass: 'no-cta page-flugzeug',
        css: ['flotte'],
        js: ['flotte'],
      },
      body,
    };
  });
}
