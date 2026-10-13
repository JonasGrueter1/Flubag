// Kopiert die Originalbilder der heutigen flubag.ch Seite in src/images
// (umbenannt, sortiert, auf max. 2400 px verkleinert).
// Aufruf: node tools/images.mjs <ordner-mit-crawl-bildern>
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const SRC = process.argv[2];
if (!SRC) { console.error('Pfad zum Crawl-Bilderordner fehlt'); process.exit(1); }
const W = 'orig/www.flubag.ch';
const F = `${W}/sites/default/files`;
const P = 'orig/pilots.flubag.ch/sites/pilots.flubag.ch/files';

const MAP = {
  // Startseite Slider
  'hero/slide-00': `${W}/themes/flubag/images/slider/slide-00.jpg`,
  'hero/slide-01': `${W}/themes/flubag/images/slider/slide-01.jpg`,
  'hero/slide-02': `${W}/themes/flubag/images/slider/slide-02.jpg`,
  'hero/slide-03': `${W}/themes/flubag/images/slider/slide-03.jpg`,
  'hero/slide-04': `${W}/themes/flubag/images/slider/slide-04.jpg`,
  'hero/slide-05': `${W}/themes/flubag/images/slider/slide-05.jpg`,
  // Schnupperflug
  'schnupperflug/discovery-0': `${F}/page-photo/discovery-0.jpg`,
  'schnupperflug/discovery-1': `${F}/page-photo/discovery-1.jpg`,
  'schnupperflug/discovery-2': `${F}/page-photo/discovery-2.jpg`,
  'schnupperflug/discovery-3': `${F}/page-photo/discovery-3.jpg`,
  'schnupperflug/discovery-4': `${F}/page-photo/discovery-4.jpg`,
  'schnupperflug/discovery-5': `${F}/page-photo/discovery-5.jpg`,
  // Rundfluege / Gutscheine (Shop)
  'rundflug/luzern': 'shop/rundflug-luzern.jpg',
  'rundflug/pilatus-rigi': 'shop/rundflug-pilatus-rigi.jpeg',
  'rundflug/titlis': 'shop/rundflug-titlis.jpeg',
  'rundflug/eiger-moench-jungfrau': 'shop/rundflug-eiger-moench-jungfrau.jpeg',
  'rundflug/matterhorn': 'shop/rundflug-matterhorn.jpeg',
  'rundflug/schnupperflug-gutschein': 'shop/schnupperflug.png',
  'rundflug/wertgutschein': 'shop/wertgutschein.jpeg',
  // Flotte
  'flotte/hb-cql': `${P}/aircraft/photo/hb-cql_0.jpg`,
  'flotte/hb-cvz': `${P}/aircraft/photo/hb-cvz.jpeg`,
  'flotte/hb-czu': `${P}/aircraft/photo/hb-czu.jpeg`,
  'flotte/hb-oen': `${P}/aircraft/photo/hb-oen.jpeg`,
  'flotte/hb-wec': `${P}/aircraft/photo/hb-wec.jpeg`,
  // Team
  'team/daniel-urech': `${F}/people/DanielUrech.jpg`,
  'team/felix-egolf': `${F}/people/FelixEgolf.jpg`,
  'team/marc-michel': `${F}/people/MarcMichel.jpg`,
  'team/michael-estermann': `${F}/people/michael-estermann_0.png`,
  'team/michael-hartmann': `${F}/people/0BCA04A8-7673-48A5-9D8C-CC5025D925DE.jpeg`,
  'team/pavel-urbanek': `${F}/people/PavelUrbanek_0.jpg`,
  'team/philipp-huwyler': `${F}/people/PhilippHuwyler_0.jpg`,
  'team/simon-laub': `${F}/people/Simon Laub.jpg`,
  'team/tom-kreienbuehl': `${F}/people/tom-kreienbuehl.jpg`,
  'team/urs-reber': `${F}/people/urs-reber_1.jpg`,
  'team/patrizia-wandeler': `${F}/inline-images/wandeler-patricia.jpg`,
  'team/verwaltungsrat': `${F}/inline-images/board-of-directors_0.png`,
  // News
  'news/ziellandekonkurrenz-2026': `${F}/news/title-photos/5.jpg`,
  'news/zlk-01': `${F}/news/photos/12.jpg`,
  'news/zlk-02': `${F}/news/photos/2.jpg`,
  'news/zlk-03': `${F}/news/photos/3.jpg`,
  'news/zlk-04': `${F}/news/photos/4.jpg`,
  'news/zlk-05': `${F}/news/photos/6.jpg`,
  'news/zlk-06': `${F}/news/photos/18.jpg`,
  'news/zlk-07': `${F}/news/photos/14.jpg`,
  'news/zlk-08': `${F}/news/photos/16.jpg`,
  'news/ppl-ronnie-widmer': `${F}/news/title-photos/Prüfung Ronnie (002).jpg`,
  'news/hangarierung': `${F}/news/title-photos/a0232250-bf46-486d-8f99-627ef012c301.jpg`,
  'news/infoabend': `${F}/news/title-photos/discovery-2.jpg`,
  // Flugplatz
  'flugplatz/werkstatt-1960': `${F}/inline-images/geb1.jpg`,
  'flugplatz/webcam-sued': 'orig/flubag.ch/webcam/cam-south000.jpg',
  'flugplatz/webcam-west': 'orig/flubag.ch/webcam/cam-west000.jpg',
  // Piloten: Anflug Piste 33 und Airport Briefing
  'briefing/holding-point': `${F}/inline-images/Holding Point.png`,
  'briefing/downwind': `${F}/inline-images/Downwind.png`,
  'briefing/base': `${F}/inline-images/Base.png`,
  'briefing/begin-final': `${F}/inline-images/Begin Final.png`,
  'briefing/final': `${F}/inline-images/Final.png`,
  'briefing/intermediate-final': `${F}/inline-images/Intermediate Final.jpg`,
  'briefing/westwind': `${F}/inline-images/wind.png`,
  'briefing/bise': `${F}/inline-images/bise.png`,
  'briefing/para-zone': `${F}/inline-images/para_0.png`,
  'briefing/parking-briefing': `${F}/inline-images/parking.png`,
  'briefing/parkordnung': `${F}/inline-images/parking.jpg`,
  'briefing/takeoff': `${F}/inline-images/takeoff.png`,
  'briefing/situation': `${F}/inline-images/situation.png`,
  // Briefing Links Logos
  'links/homebriefing': `${F}/inline-images/homebriefing.jpg`,
  'links/skybriefing': `${F}/inline-images/skybriefing.png`,
  'links/dabs': `${F}/inline-images/dabs.png`,
  'links/meteoswiss': `${F}/inline-images/meteoswiss.png`,
  'links/dwd': `${F}/inline-images/dwd-logo.png`,
  'links/webcams-ch': `${F}/inline-images/webcams-ch.png`,
  'links/flubag-reservation': `${F}/inline-images/flubag_0.png`,
  'links/airportheli-reservation': `${F}/inline-images/airportheli.png`,
  // Partner
  'partner/airportheli': `${F}/inline-images/airportheli.gif`,
  'partner/paraclub': `${F}/inline-images/paraclub.png`,
  'partner/sg-pilatus': `${F}/inline-images/segelflug.gif`,
  'partner/mfgb': `${F}/inline-images/mfgb.gif`,
  'partner/axa': `${F}/inline-images/axa-winterthur_0.png`,
  'partner/flugzeugflug': `${F}/inline-images/flugzeugflug.png`,
  'misc/voucher-icon': `${W}/themes/flubag/images/voucher.png`,
};

const OUT = path.resolve('src/images');
let n = 0;
for (const [name, rel] of Object.entries(MAP)) {
  const from = path.join(SRC, rel);
  if (!fs.existsSync(from)) { console.warn('FEHLT', rel); continue; }
  const meta = await sharp(from).metadata();
  const isGraphic = /^(partner|misc)\//.test(name) || (/^links\//.test(name) && meta.format === 'png');
  const ext = isGraphic ? 'png' : 'jpg';
  const to = path.join(OUT, `${name}.${ext}`);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  let img = sharp(from, { animated: false }).rotate().resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true });
  img = ext === 'png' ? img.png({ compressionLevel: 9 }) : img.flatten({ background: '#ffffff' }).jpeg({ quality: 86, mozjpeg: true });
  await img.toFile(to);
  n++;
}
console.log(`${n} Bilder nach src/images kopiert`);
