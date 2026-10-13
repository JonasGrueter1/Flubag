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
  const hidden = await p.evaluate(() => [...document.querySelectorAll('[data-reveal]:not(.is-in)')].map((e) => e.tagName.toLowerCase() + (e.className ? '.' + String(e.className).split(' ')[0] : '')));
  if (hidden.length) errors.push('Nach dem Durchscrollen nicht eingeblendet (data-reveal ohne .is-in): ' + [...new Set(hidden)].join(', '));
  await p.evaluate(() => document.querySelectorAll('[data-reveal]').forEach((e) => e.classList.add('is-in')));
}
if (scrollTo) { await p.evaluate((y) => window.scrollTo(0, y), scrollTo); await p.waitForTimeout(1200); }
const total = await p.evaluate(() => document.documentElement.scrollHeight);
if (args.includes('--full') && total > 14000) {
  // Chromium kann sehr lange Seiten nicht am Stück fotografieren: in Teile schneiden
  const parts = [];
  for (let y = 0, i = 0; y < total; y += 6000, i++) {
    const file = out.replace(/\.png$/, `-teil${i}.png`);
    await p.screenshot({ path: file, fullPage: true, clip: { x: 0, y, width, height: Math.min(6000, total - y) } });
    parts.push(file);
  }
  console.log(parts.join('\n'));
} else {
  await p.screenshot({ path: out, fullPage: args.includes('--full') });
  console.log(out);
}
const overflow = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
if (overflow > 1) errors.push(`Horizontales Scrollen: Seite ist ${overflow}px breiter als der Bildschirm`);
if (errors.length) console.log([...new Set(errors)].join('\n'));
await browser.close();
