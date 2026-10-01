// Smoke test: serves the repo locally, opens /mapa at desktop and phone sizes,
// clicks every airport, tab, seasonal panel and the Ferias mode, and fails on
// any page error / console error. External hosts are stubbed so it runs offline.
// Usage: npm test [-- --shots <dir>]
import http from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const shotsArg = process.argv.indexOf('--shots');
const shots = shotsArg > -1 ? process.argv[shotsArg + 1] : null;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };

const server = http.createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/patagonia-dashboard/, '');
  if (p === '/' ) p = '/index.html';
  let file = path.join(root, p);
  if (!path.extname(file) && existsSync(file + '.html')) file += '.html'; // GitHub Pages style /mapa -> mapa.html
  try { res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' }); res.end(await readFile(file)); }
  catch { res.writeHead(404); res.end('not found'); }
}).listen(0);
const base = `http://127.0.0.1:${server.address().port}/patagonia-dashboard`;

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
const fa = path.join(root, 'node_modules/@fortawesome/fontawesome-free');
async function stub(route) {
  const url = new URL(route.request().url());
  if (url.hostname === '127.0.0.1') return route.continue();
  if (url.hostname === 'cdnjs.cloudflare.com' && url.pathname.includes('font-awesome') && existsSync(fa)) {
    const rel = url.pathname.split(/font-awesome\/[^/]+\//)[1];
    try { return route.fulfill({ body: await readFile(path.join(fa, rel)), contentType: types[path.extname(rel)] }); } catch {}
  }
  // Legacy CDN URLs (pre-vendoring) map to the same pinned local copies
  const legacy = { 'unpkg.com/leaflet@1.9.4/dist/leaflet.js': 'lib/leaflet/leaflet.js', 'unpkg.com/leaflet@1.9.4/dist/leaflet.css': 'lib/leaflet/leaflet.css', 'cdn.jsdelivr.net/npm/chart.js': 'lib/chart.js/chart.umd.min.js', 'cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.0.0': 'lib/chartjs-plugin-datalabels/chartjs-plugin-datalabels.min.js' }[url.hostname + url.pathname];
  if (url.hostname === 'cdn.tailwindcss.com') /* original Play CDN */ return route.fulfill({ contentType: 'text/javascript', body: `document.head.insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="${base}/assets/css/tailwind.min.css">')` });
  if (legacy) return route.fulfill({ body: await readFile(path.join(root, legacy)), contentType: types[path.extname(legacy)] });
  if (/\.(png|jpe?g)$/.test(url.pathname) || url.hostname.includes('basemaps')) return route.fulfill({ body: PNG, contentType: 'image/png' });
  return route.fulfill({ status: 404, body: '' });
}

const errors = [];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
if (shots) await mkdir(shots, { recursive: true });

for (const vp of [{ name: 'desktop', width: 1440, height: 900 }, { name: 'mobile', width: 390, height: 844, isMobile: true, hasTouch: true }]) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch });
  const page = await ctx.newPage();
  await page.route('**/*', stub);
  page.on('pageerror', e => errors.push(`[${vp.name}] pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(`[${vp.name}] console: ${m.text()}`); });
  await page.goto(`${base}/mapa`, { waitUntil: 'load' });
  await page.waitForTimeout(500);
  const shot = async n => { if (shots) await page.screenshot({ path: `${shots}/${vp.name}-${n}.png` }); };
  await shot('0-home');
  const click = async (sel) => { await page.locator(sel).first().click({ timeout: 3000 }).catch(e => errors.push(`[${vp.name}] click ${sel}: ${e.message.split('\n')[0]}`)); await page.waitForTimeout(250); };
  // USH first and last: catches Ushuaia-only blocks that stay visible after switching destination
  for (const code of ['USH', 'BBA', 'BRC', 'FTE', 'USH']) {
    await page.evaluate(c => window.openPanel(c), code);
    await page.waitForTimeout(400);
    for (const tab of ['plane', 'tourist', 'world', 'brazil']) {
      await page.evaluate(t => window.switchTab(t), tab);
      await page.waitForTimeout(200);
      await shot(`${code}-${tab}`);
      const leaks = await page.evaluate(([code, tab]) => {
        const prefixes = ['brc', 'fte', 'ush'].filter(p => p !== code.toLowerCase());
        return [...document.querySelectorAll(`#tab-${tab} [id]`)]
          .filter(el => prefixes.some(p => el.id.startsWith(p + '-')))
          .filter(el => el.offsetParent !== null && el.getBoundingClientRect().height > 0)
          .map(el => el.id);
      }, [code, tab]);
      if (leaks.length) errors.push(`[${vp.name}] ${code}/${tab}: blocks from other destinations visible: ${leaks.join(', ')}`);
    }
    if (code === 'BRC') { await page.evaluate(() => { switchTab('tourist'); toggleWinterPanel(); }); await page.waitForTimeout(600); await shot('BRC-winter'); await page.evaluate(() => closeWinterPanel()); }
    if (code === 'USH') for (const p of ['Winter', 'Cruise', 'Summer']) { await page.evaluate(p => { switchTab('tourist'); window[`toggleUsh${p}Panel`](); }, p); await page.waitForTimeout(600); await shot(`USH-${p}`); await page.evaluate(p => window[`closeUsh${p}Panel`](), p); }
  }
  await page.evaluate(() => window.closePanelAndClearMap());
  await page.waitForTimeout(300);
  await click('#btn-ferias-brasil');
  await page.waitForTimeout(1600);
  await shot('ferias');
  await click('.ferias-sector-btn[data-sector="Turismo"]');
  await click('.ferias-month-btn[data-month="11"]');
  await shot('ferias-filtered');
  // Horizontal overflow check (mobile usability)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 1) errors.push(`[${vp.name}] page overflows horizontally by ${overflow}px`);
  await ctx.close();
}
await browser.close();
server.close();
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log('Smoke test passed');
