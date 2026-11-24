// v60.30 : captures (390 px) du filtre « Dispo en raid » et de la vue Raids. Usage : node preview60-30.mjs <baseURL> <préfixe>
//   ex. node preview60-30.mjs https://sigjouea.github.io/pokedex/ avant ; node preview60-30.mjs http://localhost:8930/ apres
import puppeteer from 'puppeteer-core'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:8930/', PRE = process.argv[3] || 'apres', OUT = '/workspace/pokedex-v6030/screenshots/apercu-v60.30/'; fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms)), errs = [];
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage(); p.on('pageerror', e => errs.push('pageerror ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text()); });
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await p.goto(BASE, { waitUntil: 'networkidle0' }); await sleep(800);
await p.evaluate(() => { document.querySelectorAll('#toast, #upd, .toast').forEach(el => { el.hidden = true; el.style.display = 'none'; }); });

const hideChrome = () => p.evaluate(() => { document.querySelectorAll('#toast, #upd, .toast').forEach(el => { el.hidden = true; el.style.display = 'none'; }); });
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

// 01 : liste, jeu Épée / Bouclier, filtre « Dispo en raid », puce 5★
await p.evaluate(async () => {
  await setGame('sw');
  await loadRaids();
  state.cat = 'raid'; state.rstars = ['5'];
  const c = document.querySelector('#cat'); if (c) c.value = 'raid';
  render();
});
await sleep(1200);
await shot('01-filtre-dispo-en-raid');

// 02 : vue Raids ÉB, 5★, quelques antres ouverts
await p.evaluate(() => { RV.g = 'sw'; RV.s = '5'; location.hash = '#/raids/sw'; });
await sleep(800);
await p.evaluate(() => {
  const sec = document.querySelector('#raid-view details.rvsec');
  if (sec) sec.open = true;
  [...document.querySelectorAll('#raid-view details.rvloc')].slice(0, 2).forEach(d => { d.open = true; });
  window.scrollTo(0, 0);
});
await sleep(400);
await shot('02-vue-raids-eb');

// 03 : vue Raids ÉV, 6★ (plus caractéristique des raids Téracristal)
await p.evaluate(() => { RV.g = 'sv'; RV.s = '6'; location.hash = '#/raids/sv'; });
await sleep(800);
await p.evaluate(() => {
  const sec = document.querySelector('#raid-view details.rvsec');
  if (sec) sec.open = true;
  [...document.querySelectorAll('#raid-view details.rvloc')].forEach(d => { d.open = true; });
});
await sleep(400);
await shot('03-vue-raids-ev');

// 04 : fiche ouverte depuis la vue (premier boss de Paldea 6★) — bloc « Où le trouver »
await p.evaluate(() => {
  const a = document.querySelector('#raid-view a.rkrow[data-raid]');
  if (a) { sheetPref = a.getAttribute('data-raid') || 'sv'; fromRaids = true; raidBack = location.hash; location.hash = a.getAttribute('href'); }
});
await sleep(2000);
const sec = await p.evaluateHandle(() => [...document.querySelectorAll('#detail-view section.box')].find(s => /^Où le trouver/.test(s.querySelector('h2')?.textContent || '')));
if (sec.asElement()) {
  await p.evaluate(s => {
    const fb = s.querySelector('.foldbtn'); if (fb && !s.classList.contains('open')) fb.click();
    s.querySelectorAll('.raidloc details, details').forEach(d => d.open = true);
    const nav = document.querySelector('#detail-view .dtop');
    const top = s.getBoundingClientRect().top + window.scrollY - (nav ? nav.offsetHeight + 2 : 0);
    window.scrollTo(0, Math.max(0, top));
  }, sec);
  await hideChrome(); await sleep(300);
  const txt = await p.evaluate(s => ({ box: s.innerText.replace(/\s+/g, ' ').slice(0, 420), back: document.querySelector('#detail-view .dnav a')?.getAttribute('aria-label') || '', name: document.querySelector('#detail-view h1')?.textContent || '' }), sec);
  await p.screenshot({ path: `${OUT}${PRE}-04-fiche-depuis-vue.png` });
  console.log(`${OUT}${PRE}-04-fiche-depuis-vue.png\n   ${JSON.stringify(txt)}`);
} else {
  console.log('pas de bloc fiche');
  await shot('04-fiche-depuis-vue');
}

console.log('ERREURS', JSON.stringify(errs));
await b.close();
