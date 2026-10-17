# Baukasten: So baust du eine Seite der neuen FLUBAG Website

Projekt: `/home/user/flubag`. Statische Website (HTML, CSS, JS ohne Framework), gebaut mit `tools/build.mjs` nach `site/`.
Referenzseiten, die du dir zuerst anschauen musst: `src/pages/index.html` (Startseite) und `src/pages/schnupperflug.html` (Unterseite mit Formular). Daran orientierst du Aufbau, Klassen und Qualität.

## Befehle

```bash
cd /home/user/flubag
node tools/build.mjs --no-images --only <seitenname>   # eine Seite bauen (Bilder sind schon gerechnet)
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/ || (node tools/serve.mjs 8080 > /tmp/serve.log 2>&1 &)
node tools/shot.mjs <seitenname> --full --out /tmp/<name>-desktop.png                  # Desktop 1440 px, ganze Seite
node tools/shot.mjs <seitenname> --full --width 390 --height 844 --out /tmp/<name>-mobile.png   # Handy
node tools/shot.mjs <seitenname> --full --theme light --out /tmp/<name>-light.png      # heller Modus
```
`shot.mjs` gibt JS-Fehler, fehlende Dateien, horizontales Scrollen und nicht eingeblendete data-reveal Elemente aus. Sehr lange Seiten (über 14'000 px) speichert es automatisch in Teilen (`...-teil0.png`, `-teil1.png`). Lange Screenshots zum Anschauen in Teile schneiden (Python PIL, je 1800 px hoch) und mit dem Read Tool ansehen. Die Build-Warnungen "Toter Link" zu Seiten, die andere gerade bauen, darfst du ignorieren, alle anderen Warnungen nicht.

## Dateien

| Was | Wo |
|---|---|
| Seite | `src/pages/<name>.html` (Dateiname = URL, flach, z.B. `airport-briefing.html`) |
| Seiten-CSS (nur für diese Seite) | `src/css/pages/<name>.css` (wird automatisch eingebunden) |
| Seiten-JS (nur für diese Seite) | `src/js/pages/<name>.js` (wird automatisch eingebunden, klassisches Script, kein Modul) |
| Seiten aus Daten erzeugen | `src/templates/<name>.mjs` exportiert `pages(DATA)` und gibt `[{ file, meta, body }]` zurück |
| Daten | `src/data/*.json` (site, flotte, rundfluege, preise, team, news, dokumente) |
| Originaltexte der alten Seite | `docs/originaltexte.md` (jede alte Seite mit URL) |

**Nicht anfassen** (gehören allen, sonst gibt es Konflikte): `src/css/0*.css`, `src/js/0*.js`, `src/js/99-init.js`, `src/partials/*`, `src/layout.html`, `tools/*`, `src/data/*.json`, Seiten anderer. Brauchst du dort eine Änderung oder findest du einen Fehler, schreib es in deinen Schlussbericht. Kein `git commit`.

## Meta-Block (Pflicht, ganz oben in jeder Seite)

```html
<!--meta {
  "title": "Airport Briefing",
  "description": "Ein bis zwei Sätze für Google, max. ca. 155 Zeichen.",
  "nav": "piloten",
  "ogImage": "briefing/situation",
  "vendor": ["leaflet"]
} -->
```
`nav` ist die Gruppe im Menü: `fliegen`, `erleben`, `flotte`, `flugplatz`, `piloten`, `kontakt` (leer für Impressum usw.). `vendor` nur wenn du Leaflet (Karten) brauchst. Optional `"noindex": true` (z.B. 404), `"bodyClass"`, `"css": ["andere-seite"]` um CSS einer anderen Seite mitzuladen.

## Template-Syntax

* `<!-- @include logo -->` fügt `src/partials/logo.html` ein.
* `{{site.phone}}`, `{{site.email}}`, `{{site.phoneHref}}`, `{{site.shop}}`, `{{site.reservation}}`, `{{site.customs}}`, `{{site.restaurant.url}}`, `{{site.airfield.rwy33}}` usw. aus `src/data/site.json`. Alle Daten: `{{data.flotte}}`, `{{data.rundfluege}}`, `{{data.preise...}}`, `{{data.team...}}`, `{{data.news}}`, `{{data.dokumente}}`.
* Schleifen: `<!-- @each data.flotte as a --> ... {{a.reg}} ... <!-- @end -->` (verschachtelbar; `loop.number`, `loop.first`, `loop.last`).
* Bedingungen: `<!-- @if a.lead --> ... <!-- @else --> ... <!-- @endif -->`, auch `a.id == "hb-cql"`, `!a.built`.
* Filter: `{{a.price1 | chf}}` → "CHF 198", `| num`, `| upper`, `| lower`, `| slug`.
* Bilder IMMER so: `<x-img src="hero/slide-05" alt="Beschreibung" sizes="(max-width: 860px) 100vw, 50vw"></x-img>` (macht automatisch srcset/WebP/width/height/lazy). Für das grosse Hero-Bild `loading="eager" fetchpriority="high"`. Grossansicht (Lightbox) verlinkt auf `assets/img/<key>.jpg` (bzw. `.png` bei PNG Quellen).
* Icons: `<x-icon name="plane-takeoff"></x-icon>` (alle Lucide Icons, z.B. plane, plane-landing, wind, compass, map-pin, phone, mail, calendar, clock, gift, users, graduation-cap, arrow-right, arrow-up-right, file-text, download, search, check, circle-check, triangle-alert, info, shield-check, camera, route, timer, calculator, book-open, mountain-snow, radio, siren, scale, euro, receipt, parking-meter, fuel, ruler, gauge, history, newspaper; eigene: parachute, runway, facebook, instagram).

### Verfügbare Bilder (`<x-img src="...">`)
hero/slide-00 (Cessna über Voralpen), hero/slide-01 (Start Gegenlicht), hero/slide-02 (über Nebelmeer), hero/slide-03 (Gruppe mit Fluglehrer vor HB-CGF), hero/slide-04 (über Aletschgletscher), hero/slide-05 (Cessna auf Graspiste, Dorf Beromünster) ·
schnupperflug/discovery-0 bis -5 (Fluglehrer mit Schülerin, Cockpit) ·
rundflug/luzern, rundflug/pilatus-rigi, rundflug/titlis, rundflug/eiger-moench-jungfrau, rundflug/matterhorn, rundflug/schnupperflug-gutschein, rundflug/wertgutschein ·
flotte/hb-cql, flotte/hb-cvz, flotte/hb-czu, flotte/hb-oen, flotte/hb-wec (nur 640 px gross, nicht riesig anzeigen) ·
team/<vorname-nachname> (10 Fluglehrer, patrizia-wandeler, verwaltungsrat = Gruppenfoto) ·
news/ziellandekonkurrenz-2026, news/zlk-01 bis zlk-08 (Galerie), news/ppl-ronnie-widmer, news/hangarierung, news/infoabend ·
flugplatz/werkstatt-1960 (historisch), flugplatz/webcam-sued, flugplatz/webcam-west (Archivbilder der Webcams) ·
briefing/holding-point, downwind, base, begin-final, final, intermediate-final (Anflug Piste 33, beschriftete Luftbilder), briefing/westwind, bise, para-zone, parking-briefing, takeoff, situation (Airport Briefing Grafiken), briefing/parkordnung (Plan) ·
links/homebriefing, skybriefing, dabs, meteoswiss, dwd, webcams-ch, flubag-reservation, airportheli-reservation (Logos, PNG) ·
partner/... (Logos), misc/voucher-icon.

Live Webcams (direkt vom Flubag Server): `https://flubag.ch/webcam/cam-south000.jpg` (Süd, Richtung Holding Point Piste 33), `https://flubag.ch/webcam/cam-west000.jpg` (West, Windsack und Holding Point Piste 15), `https://paraclub.myhostpoint.ch/webcam/image.jpg` (Paraclub). Einbinden als `<img src="..." data-webcam data-fallback="assets/img/flugplatz/webcam-sued-960.webp" ...>` (lädt alle 60 s neu, zeigt bei Fehler das Archivbild).

## Seitenaufbau

```html
<section class="page-hero">                       <!-- grosses Bild. Für Piloten-Seiten ohne Foto: class="page-hero page-hero--chart page-hero--compact" und kein __media -->
  <div class="page-hero__media"><x-img src="..." alt="..." sizes="100vw" loading="eager" fetchpriority="high"></x-img></div>
  <div class="container page-hero__inner">
    <ol class="breadcrumbs"><li><a href="index.html">Start</a></li><li><a href="piloten.html">Piloten</a></li><li>Seite</li></ol>
    <p class="eyebrow">Kleine Überschrift</p>
    <h1 data-split data-split-now>Grosse Überschrift.</h1>
    <p class="lead">Einleitung.</p>
    <div class="page-hero__meta"><span class="chip"><x-icon name="timer"></x-icon>Info</span></div>
  </div>
</section>
<section class="section"> <div class="container"> ... </div> </section>
<section class="section section--alt"> ... </section>   <!-- abwechselnd: section, section--alt, section--chart (Raster), section--glow -->
```
Der grosse CTA "Dein Platz im Cockpit ist frei" und der Footer kommen automatisch. Bei Piloten-Seiten, Impressum, Datenschutz, 404: `"bodyClass": "no-cta"` im Meta-Block, dann fällt der CTA weg.

## CSS Bausteine (siehe `src/css/04-components.css`, `03-layout.css`)

Gemeinsam nutzbar: `.scroll-cue` (Maus-Scrollhinweis im Hero: `<a class="scroll-cue" href="#start"><span></span></a>`). `.media-frame > img[data-parallax]` ist automatisch übergross, damit beim Parallax keine Ränder sichtbar werden. `.sticky` rutscht automatisch unter eine `.subnav`.
Layout: `container`, `container--narrow`, `section`, `section--alt`, `section--chart`, `section--glow`, `section--tight`, `section-head` (+ `--center`, `--split`), `grid grid-2|grid-3|grid-4|grid-auto`, `split` (+ `--wide-left`, `--wide-right`, `--top`), `stack`, `stack-l`, `row`, `sticky`, `subnav` (Sprungmarken für lange Seiten: `<nav class="subnav" data-subnav><div class="container"><ul class="subnav__list"><li><a href="#abschnitt">..</a></li></ul></div></nav>`).
Typo: `eyebrow`, `display`, `h1|h2|h3`, `lead`, `muted`, `subtle`, `mono`, `brand-text`, `prose` (für Fliesstext mit Listen, Regeln).
Elemente: `btn btn--primary|btn--ghost|btn--light|btn--text` (+ `--sm`, `--lg`, `--block`), `chip` (+ `--brand|--ok|--warn|--bad`), `card` (+ `card--pad`, `card--glow`, `card__media`, `card__body`, `card__title`, `card__text`, `card__foot`, `card__icon`, `card__badge`), `tile` (Bildkachel mit Text), `stats` + `stat`, `data-list` (dl), `specs` + `spec`, `table-wrap` + `table`, `accordion` + `details.acc` (summary + `acc__body`), `tabs` (`data-tabs`, `tabs__list`, `tabs__btn` mit `data-tab="id"`, Panels `data-tab-panel="id"`), `steps` + `step` (`data-steps` für Scroll-Fortschritt), `gallery` (+ `--3`, `--4`, `data-gallery` für Lightbox, Elemente `a.gallery__item`), `notice` (+ `--warn|--danger|--brand`, mit `<x-icon>` als erstem Kind), `doc-list` + `a.doc` (`doc__icon`, `doc__title`, `doc__meta`, `doc__go`), `people` + `person` (`person__photo`, `person__name`, `person__role`, `person--lead`), `rate-card` (Mietpreise), `pass` (Bordkarte), `map` (Leaflet), `map-layers`, `link-tiles` + `link-tile`, `range` (Schieberegler), `segmented`, `bar-split` + `legend`, `htimeline` (horizontale Zeitleiste), `marquee`, `instrument hud-corners` (Cockpit-Panel), `readout` (+ `__label`, `__value`), `status-pill`, `checklist`, `media-frame` (+ `--tall`, `--wide`), `figure`.
Formulare: `form` mit `data-form data-form-name="..." data-subject="..."`, `form-panel`, `form-grid` (+ `span-2`), `field`, `field__label` (+ `<span class="req">*</span>`), `input`, `select`, `textarea`, `field__help`, `check`, `choice-grid` + `label.choice` (Radio-Karten), `wizard` (`data-wizard`, `wizard__progress` mit `data-wizard-progress`, Schritte `fieldset.wizard__step[data-step]`, Buttons `data-next`/`data-prev`), `summary-box` mit `dl.data-list[data-summary="feld1, feld2"]`, Honeypot `<div class="honeypot" aria-hidden="true"><label>Website <input name="website" tabindex="-1" autocomplete="off"></label></div>`, `<input type="hidden" name="_t">`, `form-success` Block mit `<h3>`, `[data-mail-note]` und `[data-form-reset]` (siehe schnupperflug.html). Datum in der Zukunft: `type="date" data-future`. Vorbelegen per URL: `kontakt.html?thema=Hangar` setzt das Feld `name="thema"`.

## Animationen und Live-Funktionen (data-Attribute)

* `data-reveal` (fade-up beim Scrollen; Varianten `="left"`, `="right"`, `="scale"`, `="fade"`, `="clip"` für Bilder), Eltern `data-reveal-group` staffelt Kinder.
* `data-split` auf Überschriften (Zeilen fahren ein), im Hero zusätzlich `data-split-now`.
* `data-count="1966"` Zähler (`data-count-from`, `data-count-nosep` für Jahreszahlen).
* `data-parallax="0.12"` auf Bildern in `media-frame`.
* `data-steps` (Liste `.steps`) füllt die Linie beim Scrollen.
* `data-hscroll` + `data-hscroll-track` horizontales Scrollen mit Pin (nur Desktop).
* `data-tilt="8"` 3D-Neigung, `data-magnetic` für Buttons.
* Live: `data-airfield-status` (Platzstatus-Karte), `data-airfield-status-inline` (kurz), `data-hours-week` (7-Tage Betriebszeiten), `data-xwind` (Seitenwind-Widget Piste 15/33), `data-wx-field="windText|tempText|qnhText|visText|cloudText|cloudbaseText|wx|rwyText|dirName"` (Wetterwerte), `data-sun-field="sunrise|sunset|dusk"`, `data-wx-hazard="west|bise|tail33"` (Element wird nur bei Gefahr angezeigt).
* **Live-Schalter:** `F.config.live = { status: true, weather: true }` in `src/js/00-core.js`. Jeden Bereich, der nur Live-Daten zeigt, mit `data-live="status"` (Platzstatus, Wochenleiste, Sonnenzeiten), `data-live="weather"` (Wetterwerte, Seitenwind, Wind-Chips, Gefahrenhinweise) oder `data-live="status weather"` (gemischt, verschwindet erst, wenn beides aus ist) markieren: Karte, Panel, Chip, Sprungmarke in der Subnav, Abschnitt. Ist ein Schalter aus, setzt der Build `live-off-status` / `live-off-weather` auf `<html>` und `src/css/07-live.css` blendet die Bereiche aus. Keine leeren Rahmen oder Überschriften ohne Inhalt stehen lassen. Bestehende `data-live` Attribute nie entfernen. `F.live('weather')` fragt den Schalter im JS ab.
* **Hinweis an Live-Widgets:** Platzstatus-Karte, Wochenleiste und Seitenwind-Widget zeigen automatisch die Kurzform "Richtwert ohne Gewähr" (`F.liveBadge()`) und die Fussnote (`F.liveNote()`, pro Abschnitt nur einmal sichtbar, `F.liveNotes()` räumt auf). Eigene Live-Panels auf Seiten brauchen eine eigene Fussnote (Modelldaten, kein METAR, ohne Gewähr).
* **Hell/Dunkel:** Standard hell. Ohne gespeicherte Wahl gilt `prefers-color-scheme`, die gespeicherte Wahl (`localStorage` "flubag-theme") hat Vorrang. Beides setzt das Inline-Skript in `src/layout.html` vor dem Stylesheet. Screenshots mit `--theme light` und `--theme dark` prüfen.
* Icons in per JS erzeugtem Markup: `F.icon('arrow-right')` liefert das SVG (verfügbar: arrow-right, arrow-up-right, arrow-left, check, circle-check, plane, plane-takeoff, plane-landing, file-text, file-spreadsheet, download, x, map-pin, timer, clock, calendar, users, user, gift, info, triangle-alert, external-link, search, phone, mail, route, wind, compass, book-open, graduation-cap, chevron-down, chevron-right, star, sparkles, radio, copy).
* JS-API in Seiten-Skripten: `var F = window.FLUBAG;` `F.$`, `F.$$`, `F.data` (= alle JSON Daten), `F.chf(420)`, `F.num`, `F.escape`, `F.toast('Text')`, `F.ready(fn)` (nach Start aller Module), `F.listen('flubag:weather', function (w) {...})` (w.dir, w.speed, w.gust, w.temp, w.qnh ...), `F.status.dayRules(y,m,d,wd)`, `F.status.holidays(y)`, `F.motion.refresh()` (nach DOM-Änderungen), `F.lenis`. Inhalte, die dein Script rendert, sofort beim Laden einfügen (nicht erst in F.ready), dann greifen Animationen automatisch.
* Karten: Leaflet (`"vendor": ["leaflet"]`), Kacheln von swisstopo: `https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg` (Landeskarte), `.../ch.swisstopo.swissimage/default/current/3857/{z}/{x}/{y}.jpeg` (Luftbild), `.../ch.bazl.luftfahrtkarten-icao/default/current/3857/{z}/{x}/{y}.png` (ICAO Karte). Attribution "© swisstopo". Flugplatz LSZO: 47.19, 8.2047.

## Texte: Regeln (wichtig!)

1. **Alle Inhalte der alten Seite übernehmen.** Nichts weglassen: jede Regel, Zahl, Uhrzeit, Telefonnummer, jedes PDF, jedes Bild. Quelle: `docs/originaltexte.md`. Du darfst umformulieren, gliedern und aufwerten, aber nichts Inhaltliches verlieren oder verfälschen.
2. **Du-Form** für Besucher (Schnupperflug, Rundflüge, Ausbildung). Bei Regeln und Weisungen für Piloten neutral und präzise bleiben (Originalwortlaut bei Regeln weitgehend beibehalten, nur Rechtschreibung korrigieren).
3. **Schweizer Rechtschreibung**: ss statt ß, CHF, Anführungszeichen "..." ok.
4. **Keine Gedankenstriche**: kein "–", kein "—" und kein " - " als Satzzeichen. Stattdessen Punkt, Komma, Doppelpunkt oder Klammer. Bindestriche in Wörtern (Luzern-Beromünster, E-Mail) sind ok. Für Zeitspannen "08:00 bis 21:00" statt "08:00–21:00".
5. **Nichts erfinden.** Neue Infos aus dem Internet nur, wenn sie allgemein bekannt und sicher sind. Schätzungen klar als Schätzung kennzeichnen. Keine erfundenen Termine, Preise, Namen oder Zitate.
6. Links auf PDFs und externe Seiten gehen auf die Original-URLs (stehen in `docs/originaltexte.md` bzw. `src/data/dokumente.json`) mit `target="_blank" rel="noopener"`.
7. Barrierefreiheit: sinnvolle `alt` Texte, Überschriften-Hierarchie (eine h1), Labels an allen Formularfeldern, genug Kontrast.

## Qualität: Bevor du fertig bist

* Seite baut ohne Warnungen (ausser "Toter Link" auf noch fehlende Seiten anderer).
* Screenshots Desktop dunkel, Desktop hell und Handy (390 px) angeschaut, keine überlappenden oder abgeschnittenen Elemente, kein horizontales Scrollen auf dem Handy, keine JS-Fehler.
* Formulare: Pflichtfelder validieren, Erfolgsmeldung erscheint (im Test öffnet sich mailto, das ist ok).
* Die Seite soll modern, hochwertig und lebendig wirken: grosse Typografie, Bilder, Animationen (data-reveal, data-split), aber gut lesbar.
