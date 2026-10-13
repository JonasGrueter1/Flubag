// Screenshots für die Kontrolle:
//   node tools/shot.mjs <seite> [--width 1440] [--height 900] [--full] [--out datei.png] [--theme light] [--scroll 1200]
// Erwartet einen laufenden Server (node tools/serve.mjs 8080). Gibt JS-Fehler aus.
import { chromium } from 'playwright';
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const page = args[0] || 'index';
const width = +opt('width', 1440), height = +opt('height', 900);
const out = opt('out', `/tmp/shot-${page}-${width}.png`);
const base = opt('base', 'http://localhost:8080');
const theme = opt('theme', 'dark');
const scrollTo = +opt('scroll', 0);
const launchArgs = process.env.HTTPS_PROXY ? ['--proxy-server=' + process.env.HTTPS_PROXY, '--proxy-bypass-list=localhost;127.0.0.1'] : [];
const browser = await chromium.launch({ args: launchArgs });
const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, reducedMotion: args.includes('--reduced') ? 'reduce' : 'no-preference' });
await ctx.addInitScript((t) => { try { localStorage.setItem('flubag-theme', t); sessionStorage.setItem('flubag-intro', '1'); } catch (e) {} }, theme);
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', (e) => errors.push('JS-Fehler: ' + e.message));
p.on('console', (m) => { if (m.type() === 'error' && !/net::ERR|Failed to load resource/.test(m.text())) errors.push('Konsole: ' + m.text()); });
p.on('requestfailed', (r) => { const u = r.url(); if (u.startsWith(base)) errors.push('Fehlt: ' + u); });
await p.goto(`${base}/${page === 'index' ? '' : page + '.html'}`, { waitUntil: 'load' });
await p.waitForTimeout(1200);
if (args.includes('--full')) {
  // langsam durchscrollen, damit alle Animationen auslösen
  const h = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += Math.round(height * 0.7)) { await p.evaluate((yy) => window.scrollTo(0, yy), y); await p.waitForTimeout(160); }
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(800);
  await p.evaluate(() => document.querySelectorAll('[data-reveal]').forEach((e) => e.classList.add('is-in')));
}
if (scrollTo) { await p.evaluate((y) => window.scrollTo(0, y), scrollTo); await p.waitForTimeout(1200); }
await p.screenshot({ path: out, fullPage: args.includes('--full') });
console.log(out);
if (errors.length) console.log([...new Set(errors)].join('\n'));
await browser.close();
