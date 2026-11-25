// v60.34 : captures 390 px avant / après des illustrations HOME par défaut.
// Usage : node preview60-34.mjs <baseURL> <préfixe>
//   ex. node preview60-34.mjs http://127.0.0.1:8934/ avant
import puppeteer from 'puppeteer-core'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://127.0.0.1:8934/', PRE = process.argv[3] || 'apres';
const OUT = new URL('../screenshots/apercu-v60.34/', import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms)), errs = [];
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
p.on('pageerror', e => errs.push('pageerror ' + e.message));
p.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text()); });
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await p.goto(BASE + (BASE.includes('?') ? '&' : '?') + 'v=6034' + PRE, { waitUntil: 'networkidle0' });
await p.evaluate(async () => { if (navigator.serviceWorker) { const regs = await navigator.serviceWorker.getRegistrations(); for (const r of regs) await r.unregister(); } });
await sleep(800);
const hideChrome = () => p.evaluate(() => { document.querySelectorAll('#toast, #upd, .toast').forEach(el => { el.hidden = true; el.style.display = 'none'; }); });
await hideChrome();

const shot = async (name) => {
  await hideChrome();
  const path = `${OUT}${PRE}-${name}.png`;
  await p.screenshot({ path });
  const txt = await p.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 280));
  console.log(path + '\n   ' + txt);
};

// 01 : liste en grille (portraits)
await p.evaluate(() => {
  state.view = 'grid'; state.game = ''; state.cat = ''; state.q = ''; state.forms = false;
  location.hash = '#/';
  render();
});
await sleep(800);
await p.evaluate(() => window.scrollTo(0, 0));
await hideChrome(); await sleep(300);
await shot('01-liste-grille');

// 02 : fiche Pikachu, illustration par défaut
await p.evaluate(() => { sheetPref = 'all'; location.hash = '#/p/25'; });
await sleep(2000);
await p.evaluate(() => {
  document.querySelectorAll('#detail-view details').forEach(d => { d.open = false; });
  const hero = document.querySelector('#detail-view .hero');
  const nav = document.querySelector('#detail-view .dtop');
  if (hero) {
    const top = hero.getBoundingClientRect().top + window.scrollY - (nav ? nav.offsetHeight + 2 : 0);
    window.scrollTo(0, Math.max(0, top));
  }
});
await hideChrome(); await sleep(400);
await shot('02-fiche-pikachu');

// 03 : même fiche, illustration shiny
await p.evaluate(() => {
  const btn = document.querySelector('#shbtn');
  if (btn) btn.click();
});
await sleep(800);
await p.evaluate(() => {
  const hero = document.querySelector('#detail-view .hero');
  const nav = document.querySelector('#detail-view .dtop');
  if (hero) {
    const top = hero.getBoundingClientRect().top + window.scrollY - (nav ? nav.offsetHeight + 2 : 0);
    window.scrollTo(0, Math.max(0, top));
  }
});
await hideChrome(); await sleep(400);
await shot('03-fiche-pikachu-shiny');

// 04 : forme sans rendu HOME (Mewtwo Armuré) — secours sprite
await p.evaluate(() => { sheetPref = 'all'; location.hash = '#/p/150-armored'; });
await sleep(2000);
await p.evaluate(() => {
  const hero = document.querySelector('#detail-view .hero');
  const nav = document.querySelector('#detail-view .dtop');
  if (hero) {
    const top = hero.getBoundingClientRect().top + window.scrollY - (nav ? nav.offsetHeight + 2 : 0);
    window.scrollTo(0, Math.max(0, top));
  }
});
await hideChrome(); await sleep(400);
await shot('04-fiche-sans-home');

// 05 : vue Raids (portraits des boss)
await p.evaluate(() => { location.hash = '#/raids/sv'; });
await sleep(1500);
await p.evaluate(async () => {
  if (typeof loadRaids === 'function') await loadRaids();
  RV.g = 'sv'; RV.s = '5';
  renderRaids();
});
await sleep(800);
await p.evaluate(() => window.scrollTo(0, 0));
await hideChrome(); await sleep(300);
await shot('05-vue-raids');

// 06 : Collection, exemplaires shiny (contraste 2D officiel → 3D HOME)
await p.evaluate(() => { location.hash = '#/'; });
await sleep(400);
await p.evaluate(() => {
  const now = '2026-11-25T12:00:00Z';
  const rows = [
    { id: 'a1', k: '25', g: 'sw', n: 'Éclair', sh: true, sx: '', w: 'sw', at: now },
    { id: 'a2', k: '6', g: 'sw', n: '', sh: true, sx: '', w: 'sw', at: now },
    { id: 'a3', k: '150', g: 'sw', n: '', sh: false, sx: '', w: 'sw', at: now }
  ];
  localStorage.setItem('collection', JSON.stringify(rows));
  localStorage.setItem('colmode', 'true');
  if (typeof COLL !== 'undefined') { COLL.splice(0, COLL.length, ...rows); }
  if (typeof colSetMode === 'function') colSetMode(true);
  window.scrollTo(0, 0);
});
await sleep(800);
await hideChrome(); await sleep(400);
await shot('06-collection-shiny');

await b.close();
if (errs.length) { console.log('erreurs', errs.slice(0, 20).join('\n')); process.exitCode = 1; }
else console.log('ok', errs.length, 'erreurs');
