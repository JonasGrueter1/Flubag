// Vorschau-Version für GitHub Pages: kopiert site/ nach einem Zielordner und passt sie an.
//   node tools/preview.mjs [zielordner] [basis]   (Standard: preview/ und /Flubag/)
// Unterschiede zur echten Website:
//   - deutlich als Entwurf markiert (Hinweis unten links, "Entwurf:" im Titel)
//   - für Suchmaschinen gesperrt (noindex, robots.txt)
//   - Formulare im Modus 'demo': es wird nichts an die FLUBAG gesendet
//   - ohne .htaccess und PHP (läuft auf GitHub Pages nicht)
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SITE = path.join(ROOT, 'site');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, 'preview'));
const BASE = process.argv[3] || '/Flubag/';

const SKIP = new Set(['.htaccess', 'api', 'sitemap.xml']);

fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(SITE, OUT, { recursive: true, filter: (src) => !SKIP.has(path.basename(src)) });

const SCRIPT = `/* Vorschau-Version: Hinweis einblenden, Formulare nur vorführen */
(function () {
  'use strict';
  var F = window.FLUBAG;
  if (F && F.config && F.config.form) F.config.form.mode = 'demo';
  var css = '.vorschau-badge{position:fixed;left:12px;bottom:12px;z-index:400;max-width:min(340px,calc(100vw - 96px));padding:9px 13px;border-radius:12px;background:rgba(6,11,22,.92);color:#edf2fa;font:500 12px/1.4 Inter Variable,Inter,system-ui,sans-serif;box-shadow:0 10px 30px -10px rgba(0,0,0,.6);border:1px solid rgba(255,90,38,.55);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}' +
    '.vorschau-badge strong{display:inline-block;margin-right:6px;padding:1px 7px;border-radius:99px;background:#e63201;color:#fff;font-size:10px;letter-spacing:.08em;text-transform:uppercase}' +
    '.vorschau-badge a{color:#ffb08e}.vorschau-badge button{margin-left:6px;background:none;border:0;color:#a9b6ca;cursor:pointer;font:inherit;padding:0 2px}';
  function show() {
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    var b = document.createElement('div');
    b.className = 'vorschau-badge'; b.setAttribute('role', 'note');
    b.innerHTML = '<strong>Entwurf</strong>Redesign-Konzept von Jonas Grüter, nicht die offizielle Website der FLUBAG. ' +
      '<a href="https://www.flubag.ch/" target="_blank" rel="noopener">Zur offiziellen Seite</a>' +
      '<button type="button" aria-label="Hinweis ausblenden">&#x2715;</button>';
    b.querySelector('button').addEventListener('click', function () { b.remove(); });
    document.body.appendChild(b);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show); else show();
})();
`;
fs.writeFileSync(path.join(OUT, 'assets/js/vorschau.js'), SCRIPT);
fs.writeFileSync(path.join(OUT, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');

let n = 0;
for (const f of fs.readdirSync(OUT).filter((x) => x.endsWith('.html'))) {
  const p = path.join(OUT, f);
  let html = fs.readFileSync(p, 'utf8');
  html = html
    .replace(/<meta name="robots"[^>]*>/g, '')
    .replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<meta name="robots" content="noindex, nofollow">')
    .replace(/<title>/, '<title>Entwurf: ')
    .replace(/<base href="\/">/, `<base href="${BASE}">`)
    // läuft als letztes defer-Skript, also vor dem Start der Module (DOMContentLoaded)
    .replace('</body>', '<script defer src="assets/js/vorschau.js"></script>\n</body>');
  fs.writeFileSync(p, html);
  n++;
}
console.log(`Vorschau: ${n} Seiten nach ${OUT} (Basis ${BASE})`);
