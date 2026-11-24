// v60.31 : captures (390 px) des raids 7★ événementiels d’Écarlate / Violet.
// Usage : node preview60-31.mjs <baseURL> <préfixe>
//   ex. node preview60-31.mjs http://localhost:8931/ apres
import puppeteer from 'puppeteer-core'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:8931/', PRE = process.argv[3] || 'apres';
const OUT = new URL('../screenshots/apercu-v60.31/', import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms)), errs = [];
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage(); p.on('pageerror', e => errs.push('pageerror ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text()); });
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await p.goto(BASE, { waitUntil: 'networkidle0' }); await sleep(800);
const hideChrome = () => p.evaluate(() => { document.querySelectorAll('#toast, #upd, .toast').forEach(el => { el.hidden = true; el.style.display = 'none'; }); });
await hideChrome();

const shot = async (name, sel) => {
  await hideChrome();
  const path = `${OUT}${PRE}-${name}.png`;
  if (sel) {
    const el = await p.$(sel);
    if (!el) { console.log('pas d’élément', name, sel); return; }
    await el.screenshot({ path });
  } else {
    await p.screenshot({ path });
  }
  const txt = await p.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 500));
  console.log(path + '\n   ' + txt);
};

// 01 : liste, jeu Écarlate / Violet, filtre « Dispo en raid », puce 7★
await p.evaluate(async () => {
  await setGame('sv');
  await loadRaids();
  state.cat = 'raid'; state.rstars = ['7'];
  const c = document.querySelector('#cat'); if (c) c.value = 'raid';
  render();
});
await sleep(1200);
await hideChrome();
await p.evaluate(() => {
  const chips = document.querySelector('#raidchips');
  if (chips) chips.scrollLeft = chips.scrollWidth;
  window.scrollTo(0, 0);
});
await sleep(200);
await shot('01-filtre-7-ev');

// 02 : vue Raids ÉV, section 7★ (en cours / à venir visibles)
await p.evaluate(() => { RV.g = 'sv'; RV.s = '7'; location.hash = '#/raids/sv'; });
await sleep(1000);
await p.evaluate(() => {
  const sec = document.querySelector('#raid-view details.t7sec, #raid-view details.rvsec');
  if (sec) sec.open = true;
  document.querySelectorAll('#raid-view details.rvloc').forEach(d => { d.open = true; });
  window.scrollTo(0, 0);
});
await sleep(400);
await shot('02-vue-raids-ev-7');

// 03 : fiche Lanssorien, bloc « Raids 7★ (événements) »
await p.evaluate(() => {
  sheetPref = 'sv'; fromRaids = true; raidBack = '#/raids/sv';
  location.hash = '#/p/887';
});
await sleep(2000);
const sec = await p.evaluateHandle(() => [...document.querySelectorAll('#detail-view section.box')].find(s => /^Où le trouver/.test(s.querySelector('h2')?.textContent || '') || s.querySelector('.t7block')));
if (sec.asElement()) {
  await p.evaluate(s => {
    const fb = s.querySelector('.foldbtn'); if (fb && !s.classList.contains('open')) fb.click();
    s.querySelectorAll('details').forEach(d => d.open = true);
    const box = s.querySelector('.t7block') || s;
    const nav = document.querySelector('#detail-view .dtop');
    const top = box.getBoundingClientRect().top + window.scrollY - (nav ? nav.offsetHeight + 2 : 0);
    window.scrollTo(0, Math.max(0, top));
  }, sec);
  await hideChrome(); await sleep(300);
  const txt = await p.evaluate(() => ({
    box: (document.querySelector('.t7block') || document.body).innerText.replace(/\s+/g, ' ').slice(0, 500),
    back: document.querySelector('#detail-view .dnav a')?.getAttribute('aria-label') || '',
    name: document.querySelector('#detail-view h1')?.textContent || ''
  }));
  await p.screenshot({ path: `${OUT}${PRE}-03-fiche-7.png` });
  console.log(`${OUT}${PRE}-03-fiche-7.png\n   ${JSON.stringify(txt)}`);
} else {
  console.log('pas de bloc 7★ / Où le trouver');
  await shot('03-fiche-7');
}

await b.close();
if (errs.length) { console.log('erreurs', errs.slice(0, 20).join('\n')); process.exitCode = 1; }
else console.log('ok', errs.length, 'erreurs');
