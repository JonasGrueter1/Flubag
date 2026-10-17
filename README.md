# FLUBAG Website Redesign

Neues Design für die Website der **FLUBAG Flugbetriebs AG**, Flugplatz Luzern-Beromünster (LSZO).
Konzept und Redesign: Jonas Grüter.

Alle Inhalte, Seiten und Bilder der bisherigen www.flubag.ch sind übernommen (siehe `docs/BESTANDSAUFNAHME.md` und `docs/originaltexte.md`), neu gestaltet und um viele Funktionen erweitert.

## Anschauen

**Ohne Installation:** Ordner `site/` öffnen und `index.html` doppelklicken. Läuft komplett im Browser.

**Mit lokalem Server** (empfohlen, dann funktioniert alles wie online):

```bash
npm install
npm run serve      # startet den Vorschau-Server auf http://localhost:8080
```

## Was ist neu

* Modernes Design in Cockpit-Nachtblau und dem Orange aus dem FLUBAG Logo, heller und dunkler Modus (Standard hell, folgt der Systemeinstellung)
* Animationen: Bild-Slider mit Ken-Burns-Effekt, Text-Einblendungen, Parallax, horizontales Scrollen, Zähler, Höhenmesser als Scroll-Anzeige, Seitenübergänge
* **Live am Flugplatz:** Platzstatus nach der Weisung Piloten 2026 (inkl. Feiertage und Abenddämmerung), Live-Wetter, Seitenwind für Piste 15/33, Webcams mit Auto-Refresh, 7-Tage Betriebszeiten. Alle Werte sind als "Richtwert ohne Gewähr" gekennzeichnet und lassen sich abschalten (siehe unten)
* **Formulare:** Schnupperflug-Buchung in 4 Schritten, Rundflug-Anfrage, Infoabend-Anmeldung, Kontakt, Ereignismeldung
* **Rechner und Tools:** Kostenrechner Pilotenausbildung, Flugkosten-Rechner, Gutschein-Konfigurator als Bordkarte, Zollanmeldung-Zeithelfer, Funkalphabet
* **Interaktive Karte** der Rundflüge mit swisstopo Karten (Landeskarte, Luftbild, ICAO-Karte)
* Eigene Seiten für Rundflüge, Gutscheine und die Flotte (vorher nur im Shop bzw. Pilotenportal)
* Durchsuchbare Dokumenten-Bibliothek (Handbücher, Checklisten, Syllabi, Newsletter)
* Mobil optimiert, schnell (WebP Bilder in mehreren Grössen), barrierearm, ohne Tracking und ohne Google Fonts

## Aufbau

| Ordner | Inhalt |
|---|---|
| `site/` | **Fertige Website.** Dieser Ordner kommt auf den Webserver. |
| `src/pages/` | Inhalt jeder Seite (HTML) |
| `src/data/` | Daten: Flotte, Preise, Rundflüge, Team, News, Dokumente, Kontaktdaten |
| `src/css/`, `src/js/` | Design und Funktionen |
| `src/images/` | Originalbilder (werden beim Build automatisch optimiert) |
| `src/partials/` | Header, Footer, Logo |
| `tools/` | Build, Vorschau-Server, Screenshots |
| `docs/` | Bestandsaufnahme der alten Seite, Originaltexte, Baukasten-Anleitung |

## Seiten (37)

| Bereich | Seiten |
|---|---|
| Start | index |
| Flugplatz | geschichte, webcams, anreise, aktuelles (mit news-ziellandekonkurrenz-2026, news-gratulation-ppl, news-hangarierung), preise |
| Flugschule | schnupperflug, ausbildung, infoabende, fluglehrer |
| Rundflüge & Gutscheine | rundfluege, gutscheine |
| Flotte | flotte, flugzeug-hb-cql, flugzeug-hb-cvz, flugzeug-hb-czu, flugzeug-hb-oen, flugzeug-hb-wec (aus `src/data/flotte.json` über `src/templates/flugzeug.mjs`) |
| Piloten | piloten, weisungen, sprungbetrieb, piste-33, checkflug-flarm, parkordnung, airport-briefing, briefing-links, zollanmeldung, reporting, safety-policy, dokumente (aus `src/data/dokumente.json` über `src/templates/dokumente.mjs`) |
| Kontakt & Rechtliches | kontakt, impressum, datenschutz, 404 |

Alle Seiten liegen als `<name>.html` direkt in `site/`.

## Inhalte ändern

1. Preise, Flugzeuge, Routen, Team, News: Datei in `src/data/` anpassen.
2. Texte einer Seite: `src/pages/<seite>.html`.
3. Danach bauen: `npm run build` (erzeugt `site/` neu).

Neue Infoabend-Termine: in `src/pages/infoabende.html` eintragen (dort ist beschrieben wie), vergangene Termine werden automatisch als vorbei markiert.

## Online stellen (Checkliste)

1. Inhalt von `site/` auf den Webserver kopieren (z.B. Infomaniak, per FTP).
2. **Formulare:** Die Datei `site/api/send.php` versendet alle Formulare per E-Mail an flubag@flubag.ch. Läuft auf jedem Hosting mit PHP. Empfänger und Absender stehen oben in der Datei. Ohne PHP: in `src/js/00-core.js` bei `endpoint` z.B. eine Formspree-Adresse eintragen. Wenn nichts erreichbar ist, öffnet sich automatisch das E-Mail-Programm mit allen Angaben.
3. **Webcams:** Die Bilder werden live von `flubag.ch/webcam/...` geladen. Dieser Ordner muss auf dem Server bleiben.
4. **PDFs:** Die Dokumente sind auf die bisherigen Adressen verlinkt (`/sites/default/files/...` und `pilots.flubag.ch`). Beim Umzug den Ordner `sites/default/files/page/attachment/` behalten oder die Links in `src/data/dokumente.json` anpassen.
5. **Wetterdaten** kommen von Open-Meteo (frei für nicht kommerzielle Nutzung). Für den produktiven Einsatz einer Firma die Nutzungsbedingungen prüfen (günstiges Abo) oder die Anzeige abschalten (Schalter `F.config.live.weather`, siehe "Live-Daten").
6. **Karten** von swisstopo (frei nutzbar mit Quellenangabe "© swisstopo", ist eingebaut).
7. Inhalte vor dem Go-live mit FLUBAG prüfen: Preise, Termine, Rundflugpreise (aus dem Gutschein-Shop, Stand Oktober 2026), technische Daten der Flugzeuge (typische Werte der Muster, massgebend ist das Flughandbuch).
8. Die versteckte Datei `site/.htaccess` mit hochladen (404-Seite, 301-Weiterleitungen aller alten `/de/...` Adressen, Caching).
9. Vor dem Upload einmal `npm run build` ohne `--no-images` ausführen (erzeugt alle Bildgrössen und die Vorschaubilder für Social Media).
10. Nach dem Upload jedes Formular einmal testweise absenden (Schnupperflug, Rundflug, Infoabend, Kontakt, Reporting). Die Absenderadresse website@flubag.ch muss im SPF-Eintrag der Domain erlaubt sein.
11. Die Domain auf https://www.flubag.ch umleiten (canonical, `sitemap.xml` und `robots.txt` verwenden diese Adresse; eine vorbereitete Regel steht auskommentiert in `.htaccess`) und `sitemap.xml` in der Google Search Console einreichen.
12. Externe Links prüfen: Einige Links der alten Seite waren nicht mehr erreichbar. BAZL, SUST, ECCAIRS2 und Paraclub (Website skydive-luzern.ch) sind auf die neuen Adressen umgestellt, für aviationreporting.eu/justculture gibt es noch keinen Ersatz.

## Live-Daten (Platzstatus und Wetter)

Der Schalter steht oben in `src/js/00-core.js`:

```js
live: { status: true, weather: true },
```

* `status: false` blendet Platzstatus, Wochenleiste der Betriebszeiten und Sonnenzeiten aus (nichts wird berechnet).
* `weather: false` lädt gar kein Wetter mehr von Open-Meteo und blendet Wetterwerte, Seitenwind-Widgets und die Wetterteile der Statusleiste aus.
* Danach `npm run build`. Der Build schreibt die Klassen `live-off-status` bzw. `live-off-weather` direkt ins `<html>` Tag, so blitzt beim Laden nichts auf.
* Welche Bereiche verschwinden, steuert das Attribut `data-live="status"`, `data-live="weather"` oder `data-live="status weather"` (gemischter Bereich, erst ausgeblendet, wenn beides aus ist). Es steht auf allen Live-Panels, Karten und Sprungmarken. Beim Bearbeiten von Seiten diese Attribute stehen lassen.

Jedes Live-Widget trägt sichtbar den Hinweis **"Richtwert ohne Gewähr"** und eine Fussnote: "Richtwerte ohne Gewähr: Platzstatus nach unserer Auslegung der Weisung Piloten, Wetter aus Modelldaten von Open-Meteo, kein METAR. Massgebend sind die Weisung Piloten und die offiziellen Flugwetterinformationen (skybriefing, MeteoSchweiz)." Stehen mehrere Widgets im selben Abschnitt, erscheint die Fussnote nur einmal. In der Statusleiste steht der Hinweis als Tooltip und für Screenreader.

## Hell und Dunkel

Standard ist der helle Modus. Ist im Betriebssystem der dunkle Modus eingestellt, startet die Seite dunkel. Wer selbst umschaltet, dessen Wahl wird gespeichert (`localStorage` "flubag-theme") und hat ab dann Vorrang. Das Inline-Skript in `src/layout.html` setzt den Modus vor dem ersten Zeichnen.

## Technik

Statisches HTML, CSS und JavaScript ohne Framework. Bibliotheken lokal eingebunden: GSAP (Animationen), Lenis (weiches Scrollen), Leaflet (Karten), SunCalc (Dämmerung). Schriften: Archivo, Inter, JetBrains Mono (lokal, keine Google Fonts). Build mit Node.js (`tools/build.mjs`), Bilder mit sharp.
