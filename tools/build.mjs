// Build der FLUBAG Website.
// Liest src/ und schreibt die fertige, statische Seite nach site/.
//
//   node tools/build.mjs              alles bauen
//   node tools/build.mjs --no-images  Bilder nicht neu rechnen (schneller)
//   node tools/build.mjs --only kontakt   nur eine Seite (plus Assets)
//
// Seiten liegen in src/pages/*.html. Oben steht ein Meta-Block:
//   <!--meta { "title": "...", "description": "...", "nav": "fliegen" } -->
// Danach normales HTML. Zusätzlich verfügbar:
//   <!-- @include name -->              fügt src/partials/name.html ein
//   {{site.phone}} / {{year}}           Werte aus src/data/site.json
//   <x-img src="hero/slide-00" alt=".." sizes="..">   responsive Bild
//   <x-icon name="plane">               Inline SVG Icon (Lucide oder src/icons)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'site');
const NM = path.join(ROOT, 'node_modules');
const args = process.argv.slice(2);
const ONLY = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const SKIP_IMAGES = args.includes('--no-images');
const warnings = [];
const warn = (m) => warnings.push(m);

const read = (p) => fs.readFileSync(p, 'utf8');
const write = (p, c) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, c); };
const copy = (from, to) => { fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to); };
const walk = (dir) => fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]) : [];
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ---------------------------------------------------------------- Daten
const DATA = {};
for (const f of walk(path.join(SRC, 'data')).filter((f) => f.endsWith('.json'))) {
  DATA[path.basename(f, '.json')] = JSON.parse(read(f));
}
const SITE = DATA.site;

// ---------------------------------------------------------------- Vendor + Fonts + Static
function copyVendor() {
  const v = path.join(OUT, 'assets/vendor');
  const files = {
    'gsap/gsap.min.js': 'gsap/dist/gsap.min.js',
    'gsap/ScrollTrigger.min.js': 'gsap/dist/ScrollTrigger.min.js',
    'gsap/SplitText.min.js': 'gsap/dist/SplitText.min.js',
    'gsap/MotionPathPlugin.min.js': 'gsap/dist/MotionPathPlugin.min.js',
    'gsap/ScrollToPlugin.min.js': 'gsap/dist/ScrollToPlugin.min.js',
    'lenis/lenis.min.js': 'lenis/dist/lenis.min.js',
    'leaflet/leaflet.js': 'leaflet/dist/leaflet.js',
    'leaflet/leaflet.css': 'leaflet/dist/leaflet.css',
    'suncalc/suncalc.js': 'suncalc/suncalc.js',
  };
  for (const [to, from] of Object.entries(files)) copy(path.join(NM, from), path.join(v, to));
  for (const f of walk(path.join(NM, 'leaflet/dist/images'))) copy(f, path.join(v, 'leaflet/images', path.basename(f)));
  const fonts = {
    'archivo-latin.woff2': '@fontsource-variable/archivo/files/archivo-latin-standard-normal.woff2',
    'archivo-latin-ext.woff2': '@fontsource-variable/archivo/files/archivo-latin-ext-standard-normal.woff2',
    'inter-latin.woff2': '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
    'inter-latin-ext.woff2': '@fontsource-variable/inter/files/inter-latin-ext-wght-normal.woff2',
    'jetbrains-mono-latin.woff2': '@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2',
  };
  for (const [to, from] of Object.entries(fonts)) copy(path.join(NM, from), path.join(OUT, 'assets/fonts', to));
}

function copyStatic() {
  const base = path.join(SRC, 'static');
  for (const f of walk(base)) copy(f, path.join(OUT, path.relative(base, f)));
}

// ---------------------------------------------------------------- Bilder
const IMG = {}; // key -> { w, h, widths: [], ext, fallback }
const CACHE_FILE = path.join(NM, '.cache/flubag-images.json');
async function buildImages() {
  const cache = fs.existsSync(CACHE_FILE) ? JSON.parse(read(CACHE_FILE)) : {};
  const base = path.join(SRC, 'images');
  for (const f of walk(base)) {
    const rel = path.relative(base, f).replace(/\\/g, '/');
    const key = rel.replace(/\.(jpe?g|png|webp)$/i, '');
    const stat = fs.statSync(f);
    const isPng = /\.png$/i.test(f);
    const graphic = /^(partner|links|misc)\//.test(key);
    let info = cache[key];
    const outDir = path.join(OUT, 'assets/img', path.dirname(key));
    const name = path.basename(key);
    const fresh = info && info.mtime === stat.mtimeMs && info.widths.every((w) => fs.existsSync(path.join(outDir, `${name}-${w}.webp`))) && fs.existsSync(path.join(outDir, `${name}.${info.fallbackExt}`));
    if (!fresh) {
      if (SKIP_IMAGES && info) { IMG[key] = info; continue; }
      const meta = await sharp(f).metadata();
      const w = meta.width, h = meta.height;
      const steps = graphic ? [w] : [480, 960, 1440, 2048].filter((s) => s < w).concat(w <= 2048 ? [w] : []);
      const widths = [...new Set(steps)].sort((a, b) => a - b);
      fs.mkdirSync(outDir, { recursive: true });
      for (const sw of widths) {
        await sharp(f).resize({ width: sw, withoutEnlargement: true }).webp({ quality: graphic ? 90 : 78, effort: 5 }).toFile(path.join(outDir, `${name}-${sw}.webp`));
      }
      const fallbackExt = isPng ? 'png' : 'jpg';
      const fb = sharp(f).resize({ width: Math.min(w, 1600), withoutEnlargement: true });
      await (isPng ? fb.png({ compressionLevel: 9 }) : fb.jpeg({ quality: 80, mozjpeg: true })).toFile(path.join(outDir, `${name}.${fallbackExt}`));
      if (/^(hero|rundflug|flotte|schnupperflug|news)\//.test(key)) {
        await sharp(f).resize(1200, 630, { fit: 'cover', position: 'attention' }).jpeg({ quality: 80 }).toFile(path.join(outDir, `${name}-og.jpg`));
      }
      info = { w, h, widths, fallbackExt, mtime: stat.mtimeMs };
      cache[key] = info;
    }
    IMG[key] = info;
  }
  write(CACHE_FILE, JSON.stringify(cache));
}

function imgTag(attrs) {
  const key = attrs.src;
  const info = IMG[key];
  if (!info) { warn(`Bild fehlt: ${key}`); return `<img alt="${esc(attrs.alt)}" src="assets/img/${key}.jpg">`; }
  const dir = `assets/img/${key}`;
  const largest = info.widths[info.widths.length - 1];
  const def = info.widths.find((w) => w >= 1440) || largest;
  const srcset = info.widths.map((w) => `${dir}-${w}.webp ${w}w`).join(', ');
  const out = {
    src: `${dir}-${def}.webp`,
    srcset,
    sizes: attrs.sizes || '100vw',
    width: info.w,
    height: info.h,
    alt: attrs.alt ?? '',
    loading: attrs.loading || 'lazy',
    decoding: 'async',
  };
  if (attrs.loading === 'eager') delete out.decoding;
  const extra = Object.entries(attrs).filter(([k]) => !['src', 'sizes', 'alt', 'loading'].includes(k));
  if (attrs.alt === undefined) warn(`Bild ohne alt: ${key}`);
  return `<img ${[...Object.entries(out), ...extra].map(([k, v]) => v === true ? k : `${k}="${esc(v)}"`).join(' ')}>`;
}

// ---------------------------------------------------------------- Icons
const iconCache = {};
function iconSvg(name, cls = '') {
  if (!iconCache[name]) {
    const own = path.join(SRC, 'icons', `${name}.svg`);
    const lucide = path.join(NM, 'lucide-static/icons', `${name}.svg`);
    const file = fs.existsSync(own) ? own : fs.existsSync(lucide) ? lucide : null;
    if (!file) { warn(`Icon fehlt: ${name}`); return ''; }
    const svg = read(file).replace(/<!--[\s\S]*?-->/g, '').replace(/\s*\n\s*/g, ' ').trim();
    // width/height/class nur am <svg>-Tag entfernen (nicht an <rect> usw.)
    iconCache[name] = svg.replace(/<svg\b[^>]*>/, (tag) => tag.replace(/\s(width|height|class)="[^"]*"/g, ''));
  }
  return iconCache[name].replace('<svg', `<svg class="icon icon-${name}${cls ? ' ' + cls : ''}" aria-hidden="true" focusable="false"`);
}

// ---------------------------------------------------------------- Templates
const parseAttrs = (s) => {
  const a = {};
  for (const m of s.matchAll(/([\w:-]+)(?:\s*=\s*"([^"]*)")?/g)) a[m[1]] = m[2] === undefined ? true : m[2];
  return a;
};
function get(obj, p) { return p.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj); }

// Mini-Templates:  <!-- @each data.flotte as a --> ... <!-- @end -->
//                  <!-- @if a.lead --> ... <!-- @else --> ... <!-- @endif -->
//                  (Bedingungen: pfad, !pfad, pfad == "wert", pfad != "wert")
//                  {{ a.price1 | chf }}   Filter: chf, num, upper, lower, json, slug, esc
//                  In Schleifen gibt es zusätzlich loop.index, loop.number, loop.first, loop.last, loop.count
const FILTERS = {
  chf2: (v) => 'CHF ' + Number(v).toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  chf: (v) => 'CHF ' + Number(v).toLocaleString('de-CH', { minimumFractionDigits: Number(v) % 1 ? 2 : 0, maximumFractionDigits: 2 }),
  num: (v) => Number(v).toLocaleString('de-CH'),
  upper: (v) => String(v).toUpperCase(),
  lower: (v) => String(v).toLowerCase(),
  json: (v) => esc(JSON.stringify(v)),
  slug: (v) => String(v).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
  esc: (v) => esc(v),
};
function evalCond(expr, ctx) {
  expr = expr.trim();
  if (expr.startsWith('!')) return !evalCond(expr.slice(1), ctx);
  const m = expr.match(/^([\w.]+)\s*(==|!=)\s*"([^"]*)"$/);
  if (m) { const v = String(get(ctx, m[1]) ?? ''); return m[2] === '==' ? v === m[3] : v !== m[3]; }
  const v = get(ctx, expr);
  return Array.isArray(v) ? v.length > 0 : !!v;
}
// passendes Schluss-Tag finden (verschachtelte Blöcke berücksichtigen)
function findClose(html, from, kind) {
  const re = kind === 'each' ? /<!--\s*@(each\s[^>]*?|end)\s*-->/g : /<!--\s*@(if\s[^>]*?|endif)\s*-->/g;
  re.lastIndex = from;
  let depth = 1, m;
  while ((m = re.exec(html))) {
    if (m[1] === 'end' || m[1] === 'endif') { if (--depth === 0) return m; } else depth++;
  }
  throw new Error(`Schluss-Tag für @${kind} fehlt`);
}
function blocks(html, ctx) {
  const open = /<!--\s*@(each|if)\s+([^>]*?)\s*-->/;
  let out = '', rest = html;
  for (;;) {
    const m = rest.match(open);
    if (!m) return out + rest;
    out += rest.slice(0, m.index);
    const after = m.index + m[0].length;
    const close = findClose(rest, after, m[1]);
    const inner = rest.slice(after, close.index);
    if (m[1] === 'each') {
      const [, listPath, name] = m[2].match(/^([\w.]+)\s+as\s+(\w+)$/) || [];
      const list = get(ctx, listPath);
      if (!Array.isArray(list)) warn(`@each ohne Liste: ${listPath} (${ctx.page?.file})`);
      (Array.isArray(list) ? list : []).forEach((item, i, arr) => {
        const c = { ...ctx, [name]: item, loop: { index: i, number: i + 1, first: i === 0, last: i === arr.length - 1, count: arr.length } };
        out += substitute(blocks(inner, c), c);
      });
    } else {
      let elseIdx = -1, depth = 0;
      for (const t of inner.matchAll(/<!--\s*@(if\s[^>]*?|endif|else)\s*-->/g)) {
        if (t[1] === 'endif') depth--; else if (t[1] === 'else') { if (depth === 0) { elseIdx = t.index; break; } } else depth++;
      }
      const yes = elseIdx >= 0 ? inner.slice(0, elseIdx) : inner;
      const no = elseIdx >= 0 ? inner.slice(inner.indexOf('-->', elseIdx) + 3) : '';
      out += blocks(evalCond(m[2], ctx) ? yes : no, ctx);
    }
    rest = rest.slice(close.index + close[0].length);
  }
}
function substitute(html, ctx) {
  return html.replace(/\{\{\s*([\w.]+)\s*(?:\|\s*(\w+)\s*)?\}\}/g, (m, p, filter) => {
    const v = get(ctx, p);
    if (v === undefined) { warn(`Variable fehlt: ${p} (${ctx.page?.file})`); return ''; }
    if (v === null) return '';
    if (!filter) return String(v);
    if (!FILTERS[filter]) { warn(`Filter fehlt: ${filter}`); return String(v); }
    return FILTERS[filter](v);
  });
}

function expand(html, ctx, depth = 0) {
  if (depth > 8) throw new Error('Include zu tief verschachtelt');
  html = html.replace(/<!--\s*@include\s+([\w/-]+)\s*-->/g, (_, name) => {
    const f = path.join(SRC, 'partials', `${name}.html`);
    if (!fs.existsSync(f)) { warn(`Partial fehlt: ${name}`); return ''; }
    return expand(read(f), ctx, depth + 1);
  });
  if (depth > 0) return html;
  html = blocks(html, ctx);
  html = substitute(html, ctx);
  html = html.replace(/<x-img\s([^>]*?)\/?>/g, (_, a) => imgTag(parseAttrs(a)));
  html = html.replace(/<x-icon\s([^>]*?)\/?>(<\/x-icon>)?/g, (_, a) => { const at = parseAttrs(a); return iconSvg(at.name, at.class || ''); });
  return html;
}

function parsePage(src, file) {
  const m = src.match(/^\s*<!--meta\s*([\s\S]*?)-->/);
  if (!m) throw new Error(`Meta-Block fehlt in ${file}`);
  const meta = JSON.parse(m[1]);
  return { meta, body: src.slice(m[0].length) };
}

// ---------------------------------------------------------------- CSS + JS
function bundle() {
  const cssFiles = walk(path.join(SRC, 'css')).filter((f) => f.endsWith('.css') && !f.includes(`${path.sep}pages${path.sep}`)).sort();
  write(path.join(OUT, 'assets/css/main.css'), cssFiles.map((f) => `/* ${path.basename(f)} */\n${read(f)}`).join('\n'));
  for (const f of walk(path.join(SRC, 'css/pages'))) copy(f, path.join(OUT, 'assets/css/pages', path.basename(f)));
  const jsFiles = walk(path.join(SRC, 'js')).filter((f) => f.endsWith('.js') && !f.includes(`${path.sep}pages${path.sep}`)).sort();
  write(path.join(OUT, 'assets/js/main.js'), jsFiles.map((f) => `/* ${path.basename(f)} */\n${read(f)}`).join('\n;\n'));
  for (const f of walk(path.join(SRC, 'js/pages'))) copy(f, path.join(OUT, 'assets/js/pages', path.basename(f)));
  const clientData = { site: SITE, flotte: DATA.flotte, rundfluege: DATA.rundfluege, preise: DATA.preise, dokumente: DATA.dokumente, news: DATA.news };
  write(path.join(OUT, 'assets/js/data.js'), `window.FLUBAG_DATA = ${JSON.stringify(clientData)};\n`);
}

// ---------------------------------------------------------------- Seiten
const VENDOR = {
  leaflet: { css: ['assets/vendor/leaflet/leaflet.css'], js: ['assets/vendor/leaflet/leaflet.js'] },
};

async function collectPages() {
  const list = [];
  for (const f of walk(path.join(SRC, 'pages')).filter((f) => f.endsWith('.html'))) {
    const { meta, body } = parsePage(read(f), f);
    list.push({ file: meta.file || path.basename(f), meta, body });
  }
  for (const f of walk(path.join(SRC, 'templates')).filter((f) => f.endsWith('.mjs'))) {
    const mod = await import(pathToFileURL(f).href + `?t=${Date.now()}`);
    for (const p of mod.pages(DATA)) list.push(p);
  }
  return list;
}

function renderPage(p, layout, allFiles) {
  const name = p.file.replace(/\.html$/, '');
  const meta = { nav: '', bodyClass: '', vendor: [], ...p.meta };
  const ctx = { site: SITE, data: DATA, year: new Date().getFullYear(), page: { ...meta, file: p.file, name } };
  let content = expand(p.body, ctx);
  const cssPage = fs.existsSync(path.join(SRC, 'css/pages', `${name}.css`)) ? `<link rel="stylesheet" href="assets/css/pages/${name}.css">` : '';
  const extraCss = (meta.css || []).map((c) => `<link rel="stylesheet" href="assets/css/pages/${c}.css">`).join('');
  const jsPage = fs.existsSync(path.join(SRC, 'js/pages', `${name}.js`)) ? `<script defer src="assets/js/pages/${name}.js"></script>` : '';
  const extraJs = (meta.js || []).map((c) => `<script defer src="assets/js/pages/${c}.js"></script>`).join('');
  const vendorCss = meta.vendor.flatMap((v) => VENDOR[v]?.css || []).map((h) => `<link rel="stylesheet" href="${h}">`).join('');
  const vendorJs = meta.vendor.flatMap((v) => VENDOR[v]?.js || []).map((h) => `<script defer src="${h}"></script>`).join('');
  const fullTitle = name === 'index' ? `${SITE.shortName} | ${SITE.tagline}` : `${meta.title} | ${SITE.shortName} ${SITE.tagline}`;
  const og = meta.ogImage && IMG[meta.ogImage] ? `assets/img/${meta.ogImage}-og.jpg` : 'assets/img/hero/slide-00-og.jpg';
  let html = expand(layout, { ...ctx, content: '%%CONTENT%%' })
    .replace(/%%TITLE%%/g, esc(fullTitle))
    .replace(/%%DESCRIPTION%%/g, esc(meta.description || ''))
    .replace(/%%CANONICAL%%/g, `${SITE.url}/${name === 'index' ? '' : p.file}`)
    .replace(/%%OG_IMAGE%%/g, `${SITE.url}/${og}`)
    .replace(/%%BODY_CLASS%%/g, esc(`page-${name} ${meta.bodyClass}`.trim()))
    .replace('%%BASE%%', meta.base ? `<base href="${meta.base === true ? '/' : esc(meta.base)}">\n` : '')
    .replace(/%%PAGE%%/g, name)
    .replace('%%HEAD_EXTRA%%', vendorCss + cssPage + extraCss + (meta.noindex ? '<meta name="robots" content="noindex">' : '') + (meta.jsonld ? `<script type="application/ld+json">${JSON.stringify(meta.jsonld)}</script>` : ''))
    .replace('%%SCRIPTS_EXTRA%%', vendorJs + jsPage + extraJs);
  html = html.replace('%%CONTENT%%', () => content);
  // Seiten ohne Abschluss-CTA (Impressum, Datenschutz, 404): Block gar nicht ausgeben
  if (/\bno-cta\b/.test(meta.bodyClass)) html = html.replace(/<section class="cta-final"[\s\S]*?<\/section>\s*/, '');
  // aktive Navigation markieren
  html = html.replace(/<a([^>]*?)href="([^"#?]+\.html)"/g, (m, pre, href) => href === p.file && !/aria-current/.test(pre) ? `<a${pre}href="${href}" aria-current="page"` : m);
  if (meta.nav) html = html.replace(new RegExp(`data-nav-group="${meta.nav}"`, 'g'), `data-nav-group="${meta.nav}" data-current`);
  // interne Links prüfen
  for (const m of html.matchAll(/href="([^"#?:]+\.html)(?:#[^"]*)?"/g)) if (!allFiles.has(m[1])) warn(`Toter Link in ${p.file}: ${m[1]}`);
  for (const m of html.matchAll(/(?:src|href)="(assets\/[^"?#]+)"/g)) if (!fs.existsSync(path.join(OUT, m[1])) && !m[1].includes('/pages/')) warn(`Datei fehlt in ${p.file}: ${m[1]}`);
  return html;
}

// ---------------------------------------------------------------- Ablauf
const t0 = Date.now();
fs.mkdirSync(OUT, { recursive: true });
copyVendor();
copyStatic();
await buildImages();
bundle();
const layout = read(path.join(SRC, 'layout.html'));
const pages = await collectPages();
const allFiles = new Set(pages.map((p) => p.file));
let built = 0;
for (const p of pages) {
  if (ONLY && p.file.replace(/\.html$/, '') !== ONLY) continue;
  write(path.join(OUT, p.file), renderPage(p, layout, allFiles));
  built++;
}
if (!ONLY) {
  const urls = pages.filter((p) => !p.meta.noindex).map((p) => `  <url><loc>${SITE.url}/${p.file === 'index.html' ? '' : p.file}</loc></url>`).join('\n');
  write(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
}
console.log(`Fertig: ${built} Seiten, ${Object.keys(IMG).length} Bilder in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
if (warnings.length) { console.log(`\n${warnings.length} Warnungen:`); for (const w of [...new Set(warnings)]) console.log('  - ' + w); }
