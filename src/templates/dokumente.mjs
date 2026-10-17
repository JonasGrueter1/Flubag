// Dokumente & Newsletter: erzeugt dokumente.html aus src/data/dokumente.json und src/data/flotte.json.
// Die komplette Liste steht im HTML (funktioniert ohne JS). src/js/pages/dokumente.js filtert nur.

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Titel der alten Seite enthalten " - " als Trenner: als Doppelpunkt darstellen
const docTitle = (t) => String(t).replace(/\s+[-–—]\s+/g, ': ');
const norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[\u2013\u2014]/g, ' ').replace(/\s-\s/g, ' ').replace(/\s+/g, ' ').trim();
const fileName = (u) => { try { return decodeURIComponent(String(u).split('/').pop()); } catch (e) { return String(u).split('/').pop(); } };
const TYPE = { pdf: 'PDF', xlsx: 'Excel' };
const typeIcon = (t) => (t === 'xlsx' ? 'file-spreadsheet' : 'file-text');

const GROUPS = [
  { key: 'flugzeug', id: 'flugzeuge', label: 'Flugzeuge', icon: 'plane', text: 'Flughandbücher, Checklisten und weitere Handbücher der fünf Flugzeuge.' },
  { key: 'syllabus', id: 'syllabi', label: 'Syllabi', icon: 'graduation-cap', text: 'Die Ausbildungsprogramme der Flugschule.' },
  { key: 'familiarization', id: 'familiarization', label: 'Familiarization', icon: 'clipboard-check', text: 'Familiarization Training: Student Questionnaires zu den Flugzeugen und zu FLARM.' },
  { key: 'newsletter', id: 'newsletter', label: 'Newsletter', icon: 'newspaper', text: 'Alle Newsletter der FLUBAG, die neueste Ausgabe zuerst.' },
  { key: 'flugplatz', id: 'flugplatz', label: 'Flugplatz', icon: 'map-pin', text: 'Briefing, Verfahren, Checkflug, Safety Policy und Reporting.' },
];
const SECTIONS = [
  { key: 'Flughandbuch', icon: 'book-open' },
  { key: 'Checklisten', icon: 'list-checks' },
  { key: 'Weitere Handbücher', icon: 'layers' },
];
const AIRPORT_PAGES = {
  'Checkflug & FLARM': 'checkflug-flarm.html',
  'Anflug Piste 33': 'piste-33.html',
  'Airport Briefing': 'airport-briefing.html',
  'Briefing Links': 'briefing-links.html',
  'Reporting': 'reporting.html',
  'Safety Policy': 'safety-policy.html',
};

// "Section 9, Part 2" -> 9.2 ; Dokumente ohne Abschnittsnummer bleiben vorne
function sectionOrder(title) {
  const m = String(title).match(/^Sec(?:tion)?\s+(\d+)(?:,\s*Part\s+(\d+))?/i);
  return m ? Number(m[1]) + (m[2] ? Number(m[2]) / 10 : 0) : -1;
}

export function pages(DATA) {
  const docs = DATA.dokumente || [];
  const fleet = DATA.flotte || [];
  const byGroup = (g) => docs.filter((d) => d.group === g);
  const groupLabel = Object.fromEntries(GROUPS.map((g) => [g.key, g.label]));
  const acOf = (reg) => fleet.find((a) => a.reg === reg);

  // Ein Dokument als Zeile
  const item = (d, opts = {}) => {
    const a = d.aircraft ? acOf(d.aircraft) : null;
    const title = opts.title || docTitle(d.title);
    const meta = [TYPE[d.type] || String(d.type).toUpperCase(), ...(opts.meta || [])].filter(Boolean).join(' · ');
    const q = norm([d.title, title, d.section, d.aircraft, a && a.type, a && a.variant, groupLabel[d.group], TYPE[d.type], d.type, fileName(d.url), opts.extra].filter(Boolean).join(' '));
    return `<li class="dk-item${opts.cls ? ' ' + opts.cls : ''}" data-dk-item data-group="${d.group}"${a ? ` data-ac="${a.id}"` : ''} data-q="${esc(q)}">
            <a class="dk-doc" href="${esc(d.url)}" target="_blank" rel="noopener">
              <span class="dk-doc__icon dk-doc__icon--${esc(d.type)}"><x-icon name="${typeIcon(d.type)}"></x-icon></span>
              <span class="dk-doc__body">${opts.kicker ? `<span class="dk-doc__kicker">${esc(opts.kicker)}</span>` : ''}<span class="dk-doc__title" data-dk-title>${esc(title)}</span><span class="dk-doc__meta">${esc(meta)}</span></span>
              <x-icon name="${d.type === 'xlsx' ? 'download' : 'arrow-up-right'}" class="dk-doc__go"></x-icon>
            </a>
          </li>`;
  };

  // Kopf einer Gruppe: summary des Akkordeons (nur Inline-Inhalt und Überschrift erlaubt)
  const groupHead = (g, n) => `
      <summary class="dk-group__head">
        <span class="dk-group__icon"><x-icon name="${g.icon}"></x-icon></span>
        <span class="dk-group__intro"><h3 id="g-${g.id}" class="dk-group__title">${g.label}</h3><span class="dk-group__text">${g.text}</span></span>
        <span class="dk-group__n mono"><span data-dk-gn>${n}</span> <span data-dk-gw>${n === 1 ? 'Datei' : 'Dateien'}</span></span>
        <span class="dk-chev" aria-hidden="true"></span>
      </summary>`;

  // ---------- Flugzeuge ----------
  const planes = fleet.map((a) => {
    const own = docs.filter((d) => d.group === 'flugzeug' && d.aircraft === a.reg);
    if (!own.length) return '';
    const secs = SECTIONS.map((s) => {
      let list = own.filter((d) => d.section === s.key);
      if (!list.length) return '';
      if (s.key === 'Flughandbuch') list = list.map((d, i) => ({ d, i })).sort((x, y) => sectionOrder(x.d.title) - sectionOrder(y.d.title) || x.i - y.i).map((x) => x.d);
      return `
          <div class="dk-sub" data-dk-subsec>
            <h5 class="dk-sub__title"><x-icon name="${s.icon}"></x-icon>${s.key}<span class="dk-sub__n mono">${list.length}</span></h5>
            <ul class="dk-list">
          ${list.map((d) => item(d, { meta: [s.key, a.reg] })).join('\n          ')}
            </ul>
          </div>`;
    }).join('');
    const mini = SECTIONS.map((sec) => { const k = own.filter((d) => d.section === sec.key).length; return k ? `${sec.key} ${k}` : ''; }).filter(Boolean).join(' · ');
    return `
      <details class="dk-plane" id="flugzeug-${a.id}" data-dk-plane="${a.id}" data-dk-subsec-group>
        <summary class="dk-plane__head">
          <span class="dk-plane__img"><x-img src="${a.image}" alt="${esc(a.variant)} ${a.reg}" sizes="120px"></x-img></span>
          <span class="dk-plane__name">
            <span class="dk-plane__reg mono">${a.reg} · <span data-dk-pn>${own.length}</span> Dokumente</span>
            <h4 id="dk-${a.id}" class="dk-plane__type">${esc(a.type)}</h4>
            <span class="dk-plane__variant">${esc(a.variant)} · ${a.seats} Plätze</span>
          </span>
          <span class="dk-plane__mini mono">${esc(mini)}</span>
          <span class="dk-chev" aria-hidden="true"></span>
        </summary>
        <div class="dk-plane__body">
          <div class="dk-plane__links">
            <a class="btn btn--ghost btn--sm" href="flugzeug-${a.id}.html"><x-icon name="plane"></x-icon>Zum Flugzeug</a>
            ${a.portal ? `<a class="btn btn--text btn--sm" href="${esc(a.portal)}" target="_blank" rel="noopener">Im Pilotenportal <x-icon name="arrow-up-right"></x-icon></a>` : ''}
          </div>
          <div class="dk-plane__secs">${secs}
          </div>
        </div>
      </details>`;
  }).join('');

  // ---------- Syllabi und Familiarization als Karten ----------
  const cards = (group, kicker, strip) => byGroup(group).map((d) => {
    const short = d.title.replace(strip, '').trim();
    return item(d, { title: short, kicker, cls: 'dk-item--card', meta: [kicker] });
  }).join('\n        ');

  // ---------- Newsletter nach Jahr ----------
  const news = byGroup('newsletter').map((d, i) => {
    const m = d.title.match(/(\d{4})\/(\d+)/);
    return { d, i, year: m ? +m[1] : 0, no: m ? +m[2] : 0, sup: /erg[aä]nzung/i.test(d.title) };
  }).sort((x, y) => y.year - x.year || y.no - x.no || (x.sup - y.sup) || x.i - y.i);
  const years = [...new Set(news.map((n) => n.year))];
  const latest = news[0];
  const newsHtml = years.map((y) => {
    const list = news.filter((n) => n.year === y);
    return `
        <div class="dk-year" data-dk-subsec>
          <p class="dk-year__label"><span>${y}</span><small class="mono">${list.length} ${list.length === 1 ? 'Datei' : 'Dateien'}</small></p>
          <ul class="dk-list dk-list--news">
          ${list.map((n) => item(n.d, {
            title: `Ausgabe ${n.no}${n.sup ? ' · Ergänzung' : ''}`,
            kicker: `Newsletter ${y}`,
            cls: 'dk-item--news' + (n === latest ? ' dk-item--latest' : ''),
            meta: [n === latest ? 'Neueste Ausgabe' : '', n.sup ? 'Ergänzung' : ''],
            extra: `${y}-${n.no} ${y}/${n.no} ${n.no}-${String(y).slice(2)}`,
          })).join('\n          ')}
          </ul>
        </div>`;
  }).join('');

  // ---------- Flugplatz nach Abschnitt ----------
  const ap = byGroup('flugplatz');
  const apSecs = [...new Set(ap.map((d) => d.section))].map((s) => {
    const list = ap.filter((d) => d.section === s);
    const page = AIRPORT_PAGES[s];
    return `
        <div class="dk-sub dk-sub--ap" data-dk-subsec>
          <h4 class="dk-sub__title">${esc(s)}<span class="dk-sub__n mono">${list.length}</span>${page ? `<a class="dk-sub__page" href="${page}">Zur Seite <x-icon name="arrow-right"></x-icon></a>` : ''}</h4>
          <ul class="dk-list">
          ${list.map((d) => item(d, { meta: [s] })).join('\n          ')}
          </ul>
        </div>`;
  }).join('');

  const count = (g) => byGroup(g).length;
  const total = docs.length;

  const chips = [`<button type="button" class="dk-chip" data-dk-group="alle" aria-pressed="true">Alle<span class="dk-chip__n" data-dk-n="alle">${total}</span></button>`]
    .concat(GROUPS.map((g) => `<button type="button" class="dk-chip" data-dk-group="${g.key}" aria-pressed="false"><x-icon name="${g.icon}"></x-icon>${g.label}<span class="dk-chip__n" data-dk-n="${g.key}">${count(g.key)}</span></button>`))
    .join('\n          ');
  const subchips = [`<button type="button" class="dk-chip dk-chip--sub" data-dk-ac="alle" aria-pressed="true">Alle Flugzeuge</button>`]
    .concat(fleet.map((a) => `<button type="button" class="dk-chip dk-chip--sub" data-dk-ac="${a.id}" aria-pressed="false"><b>${a.reg}</b><small>${esc(a.type)}</small></button>`))
    .join('\n          ');

  const portal = (DATA.site && DATA.site.pilotsPortal) || 'https://pilots.flubag.ch/';

  const body = `
<section class="page-hero page-hero--chart page-hero--compact dk-hero">
  <svg class="page-hero__deco dk-deco" viewBox="0 0 400 400" aria-hidden="true" focusable="false">
    <g fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round">
      <rect class="dk-deco__sheet dk-deco__sheet--3" x="150" y="70" width="170" height="220" rx="14"/>
      <rect class="dk-deco__sheet dk-deco__sheet--2" x="115" y="100" width="170" height="220" rx="14"/>
      <path class="dk-deco__sheet" d="M80 130 h120 l50 50 v170 a14 14 0 0 1 -14 14 h-156 a14 14 0 0 1 -14 -14 v-206 a14 14 0 0 1 14 -14 z"/>
      <path d="M200 130 v36 a14 14 0 0 0 14 14 h36"/>
      <path d="M100 220 h120 M100 250 h120 M100 280 h90 M100 310 h110" stroke-width="6" stroke-linecap="round" opacity="0.6"/>
    </g>
  </svg>
  <div class="container page-hero__inner">
    <ol class="breadcrumbs"><li><a href="index.html">Start</a></li><li><a href="piloten.html">Piloten</a></li><li>Dokumente &amp; Newsletter</li></ol>
    <p class="eyebrow">Bibliothek für Piloten</p>
    <h1 data-split data-split-now>Dokumente &amp; Newsletter.</h1>
    <p class="lead">Flughandbücher, Checklisten und Handbücher der Flotte, Syllabi, Familiarization, alle Newsletter und die Dokumente zum Flugplatz. Durchsuchbar an einem Ort, als PDF oder Excel.</p>
    <div class="page-hero__meta">
      <span class="chip"><x-icon name="files"></x-icon>${total}&nbsp;Dokumente</span>
      <span class="chip"><x-icon name="plane"></x-icon>${fleet.length} Flugzeuge</span>
      <a class="chip dk-hero__portal" href="#pilotenportal"><x-icon name="log-in"></x-icon>Pilotenportal</a>
      ${latest ? `<a class="chip chip--brand dk-hero__latest" href="${esc(latest.d.url)}" target="_blank" rel="noopener"><x-icon name="newspaper"></x-icon>Neu: Newsletter ${latest.year}/${latest.no}</a>` : ''}
    </div>
  </div>
</section>

<section class="section dk-sec dk-lib" id="bibliothek" aria-labelledby="lib-title">
  <div class="container">
    <div class="section-head section-head--split dk-head">
      <div class="stack">
        <p class="eyebrow" data-reveal>Bibliothek</p>
        <h2 id="lib-title" data-split>Alle Unterlagen, ein Suchfeld.</h2>
      </div>
      <p class="lead" data-reveal>Kennzeichen, Typ, Stichwort oder Jahr eintippen, zum Beispiel «HB-CQL», «Checklist», «Mass» oder «2024». Die Filter grenzen nach Gruppe und Flugzeug ein, die Gruppen lassen sich auf- und zuklappen.</p>
    </div>

    <div class="dk-toolbar" data-dk-toolbar hidden>
      <div class="dk-search">
        <label class="visually-hidden" for="dk-q">Dokumente durchsuchen</label>
        <x-icon name="search"></x-icon>
        <input class="input" id="dk-q" type="search" placeholder="Suchen, z.B. HB-CQL, Checklist, 2024" autocomplete="off" data-dk-q>
        <kbd class="dk-search__kbd" aria-hidden="true">/</kbd>
      </div>
      <div class="dk-chips" role="group" aria-label="Nach Gruppe filtern">
          ${chips}
      </div>
      <div class="dk-chips dk-chips--sub" role="group" aria-label="Nach Flugzeug filtern" data-dk-subchips hidden>
          ${subchips}
      </div>
      <div class="dk-status">
        <p class="dk-count mono" aria-live="polite" data-dk-count>${total} Dokumente</p>
        <button class="btn btn--text btn--sm" type="button" data-dk-reset hidden><x-icon name="x"></x-icon>Filter zurücksetzen</button>
      </div>
    </div>

    <div class="dk-groups">
      <details class="dk-group" id="flugzeuge" data-dk-sec="flugzeug" open>${groupHead(GROUPS[0], count('flugzeug'))}
      <div class="dk-group__body">
      <div class="dk-planes">${planes}
      </div>
      </div>
      </details>

      <details class="dk-group" id="syllabi" data-dk-sec="syllabus">${groupHead(GROUPS[1], count('syllabus'))}
      <div class="dk-group__body">
      <ul class="dk-list dk-list--cards" style="--n: ${count('syllabus')}" data-dk-subsec>
        ${cards('syllabus', 'Syllabus', /^Syllabus\s+/)}
      </ul>
      </div>
      </details>

      <details class="dk-group" id="familiarization" data-dk-sec="familiarization">${groupHead(GROUPS[2], count('familiarization'))}
      <div class="dk-group__body">
      <ul class="dk-list dk-list--cards" style="--n: ${count('familiarization')}" data-dk-subsec>
        ${cards('familiarization', 'Familiarization', /^Familiarization\s+/)}
      </ul>
      </div>
      </details>

      <details class="dk-group" id="newsletter" data-dk-sec="newsletter">${groupHead(GROUPS[3], count('newsletter'))}
      <div class="dk-group__body">
      <div class="dk-years">${newsHtml}
      </div>
      </div>
      </details>

      <details class="dk-group" id="flugplatz" data-dk-sec="flugplatz">${groupHead(GROUPS[4], count('flugplatz'))}
      <div class="dk-group__body">
      <div class="dk-ap">${apSecs}
      </div>
      </div>
      </details>
    </div>

    <div class="dk-empty" data-dk-empty hidden>
      <x-icon name="search-x"></x-icon>
      <p class="dk-empty__title">Keine Dokumente gefunden.</p>
      <p class="muted">Anderer Suchbegriff oder ein anderer Filter? Die Originale liegen auch im <a href="${esc(portal)}" target="_blank" rel="noopener">Pilotenportal</a>.</p>
      <button class="btn btn--ghost btn--sm" type="button" data-dk-reset>Suche und Filter zurücksetzen</button>
    </div>
  </div>
</section>

<section class="section section--alt section--glow dk-sec" id="pilotenportal" aria-labelledby="portal-title">
  <div class="container">
    <div class="dk-portal" data-reveal>
      <div class="stack">
        <p class="eyebrow">Pilotenportal</p>
        <h2 id="portal-title" class="dk-portal__title">pilots.flubag.ch</h2>
        <p class="lead">Die Handbücher, Checklisten, Syllabi, Familiarizations und Newsletter dieser Bibliothek stammen aus dem Pilotenportal der FLUBAG. Dort sind sie nach Flugzeugen, Syllabi, Familiarization und Newsletter geordnet. Piloten mit Zugang melden sich mit ihrem Login an.</p>
        <div class="row">
          <a class="btn btn--primary" href="${esc(portal)}" target="_blank" rel="noopener"><x-icon name="arrow-up-right"></x-icon>Pilotenportal öffnen</a>
          <a class="btn btn--ghost" href="https://pilots.flubag.ch/user/login" target="_blank" rel="noopener"><x-icon name="log-in"></x-icon>Login</a>
        </div>
      </div>
      <ul class="dk-portal__links">
        <li><a href="https://pilots.flubag.ch/aircraft" target="_blank" rel="noopener"><x-icon name="plane"></x-icon><span>Flugzeuge</span><x-icon name="arrow-up-right"></x-icon></a></li>
        <li><a href="https://pilots.flubag.ch/syllabi" target="_blank" rel="noopener"><x-icon name="graduation-cap"></x-icon><span>Syllabi</span><x-icon name="arrow-up-right"></x-icon></a></li>
        <li><a href="https://pilots.flubag.ch/familiarization" target="_blank" rel="noopener"><x-icon name="clipboard-check"></x-icon><span>Familiarization</span><x-icon name="arrow-up-right"></x-icon></a></li>
        <li><a href="https://pilots.flubag.ch/newsletters" target="_blank" rel="noopener"><x-icon name="newspaper"></x-icon><span>Newsletter</span><x-icon name="arrow-up-right"></x-icon></a></li>
      </ul>
    </div>
  </div>
</section>

<section class="section dk-sec" aria-labelledby="mehr-title">
  <div class="container">
    <div class="section-head dk-head">
      <p class="eyebrow" data-reveal>Im Pilotenbereich</p>
      <h2 id="mehr-title" data-split>Mehr für Piloten.</h2>
    </div>
    <ul class="link-tiles dk-more" data-reveal-group="0.06">
      <li data-reveal><a class="link-tile" href="briefing-links.html"><span class="link-tile__logo"><x-icon name="compass"></x-icon></span><span><span class="link-tile__title">Briefing Links</span><span class="link-tile__sub">Briefing, Wetter, Webcams, Reservation</span></span><x-icon name="arrow-right"></x-icon></a></li>
      <li data-reveal><a class="link-tile" href="airport-briefing.html"><span class="link-tile__logo"><x-icon name="book-open"></x-icon></span><span><span class="link-tile__title">Airport Briefing</span><span class="link-tile__sub">Gefahren, Sprungbetrieb, Start und Landung</span></span><x-icon name="arrow-right"></x-icon></a></li>
      <li data-reveal><a class="link-tile" href="flotte.html"><span class="link-tile__logo"><x-icon name="plane"></x-icon></span><span><span class="link-tile__title">Unsere Flotte</span><span class="link-tile__sub">Die fünf Flugzeuge im Detail</span></span><x-icon name="arrow-right"></x-icon></a></li>
      <li data-reveal><a class="link-tile" href="reporting.html"><span class="link-tile__logo"><x-icon name="siren"></x-icon></span><span><span class="link-tile__title">Reporting</span><span class="link-tile__sub">Ereignis melden</span></span><x-icon name="arrow-right"></x-icon></a></li>
    </ul>
  </div>
</section>
`;

  return [{
    file: 'dokumente.html',
    meta: {
      title: 'Dokumente & Newsletter',
      description: 'Bibliothek für Piloten in LSZO: Flughandbücher, Checklisten und Handbücher der FLUBAG Flotte, Syllabi, Familiarization, Newsletter und Flugplatz-Dokumente.',
      nav: 'piloten',
      bodyClass: 'no-cta',
      ogImage: 'flotte/hb-cql',
    },
    body,
  }];
}
