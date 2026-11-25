// v60.33 : captures (390 px) des meilleurs attaquants 5★ Téracristal, Dynamax 5★ et Aventure Dynamax.
// Usage : node preview60-33.mjs <baseURL> <préfixe>
//   ex. node preview60-33.mjs http://localhost:8933/ apres
import puppeteer from 'puppeteer-core'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:8933/', PRE = process.argv[3] || 'apres';
const OUT = new URL('../screenshots/apercu-v60.33/', import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms)), errs = [];
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage(); p.on('pageerror', e => errs.push('pageerror ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text()); });
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await p.goto(BASE + (BASE.includes('?') ? '&' : '?') + 'v=6033', { waitUntil: 'networkidle0' });
await p.evaluate(async () => { if (navigator.serviceWorker) { const regs = await navigator.serviceWorker.getRegistrations(); for (const r of regs) await r.unregister(); } }); await sleep(800);
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

const openRank = async () => {
  await p.evaluate(() => {
    const sec = document.querySelector('#raid-view details.svrksec');
    if (sec) sec.open = true;
    window.scrollTo(0, 0);
  });
  await hideChrome(); await sleep(300);
};

const pickBoss = async (pred, mode = 'd') => {
  const id = await p.evaluate((fnSrc, mode) => {
    const tab = document.querySelector(`#raid-view [data-svrk-mode="${mode}"]`);
    if (tab) tab.click();
    const sel = document.querySelector('#raid-view [data-svrk-boss]');
    if (!sel) return '';
    const fn = new Function('o', fnSrc);
    const opt = [...sel.options].find(o => fn(o));
    if (!opt) return '';
    sel.value = opt.value;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    return opt.value;
  }, pred, mode);
  await sleep(700);
  await openRank();
  return id;
};

// 01 : vue Raids ÉV, un boss 5★, attaque directe
await p.evaluate(() => { RV.g = 'sv'; RV.s = '5'; location.hash = '#/raids/sv'; });
await sleep(1200);
await p.evaluate(async () => {
  await loadRaids();
  RV.g = 'sv'; RV.s = '5';
  renderRaids();
});
await sleep(800);
const fiveId = await pickBoss("return (o.value || '').endsWith('-5')");
await shot('01-vue-raids-5-directe');

// 02 : même boss 5★, onglet accumulation
await p.evaluate(() => {
  const tab = document.querySelector('#raid-view [data-svrk-mode="a"]');
  if (tab) tab.click();
});
await openRank();
await shot('02-vue-raids-5-accumulation');

// 03 : vue Raids ÉB, un boss Dynamax 5★ (Gigamax si possible)
await p.evaluate(() => { RV.g = 'sw'; RV.s = '5'; location.hash = '#/raids/sw'; });
await sleep(1000);
await p.evaluate(() => { RV.g = 'sw'; RV.s = '5'; renderRaids(); });
await sleep(700);
await p.evaluate(() => { RV.swBoss = '6-gmax-mx'; RV.svMode = 'd'; renderRaids(); });
await sleep(700);
await openRank();
const mxId = '6-gmax-mx';
await shot('03-vue-raids-dynamax');

// 04 : vue Couronneige, un légendaire d’Aventure Dynamax
await p.evaluate(() => { RV.g = 'swcrown'; RV.s = 'exp'; location.hash = '#/raids/swcrown'; });
await sleep(1000);
await p.evaluate(() => { RV.g = 'swcrown'; RV.s = 'exp'; renderRaids(); });
await sleep(700);
const advId = await pickBoss("return (o.value || '').endsWith('-adv')");
await shot('04-vue-raids-aventure');

// 05 : fiche d’un boss 5★ ÉV
const fiveK = fiveId ? fiveId.replace(/-5$/, '') : '25';
await p.evaluate(k => {
  sheetPref = 'sv'; fromRaids = true; raidBack = '#/raids/sv';
  location.hash = '#/p/' + k;
}, fiveK);
await sleep(2000);
await p.evaluate(() => {
  const fold = document.querySelector('#detail-view section.box .foldbtn');
  if (fold) {
    const sec = fold.closest('section.box');
    if (sec && !sec.classList.contains('open')) fold.click();
  }
  document.querySelectorAll('#detail-view details').forEach(d => { d.open = true; });
  const boxes = [...document.querySelectorAll('#detail-view .svrkbox')];
  const box = boxes.find(el => (el.dataset.svrkId || '').endsWith('-5')) || boxes[boxes.length - 1];
  const nav = document.querySelector('#detail-view .dtop');
  if (box) {
    const top = box.getBoundingClientRect().top + window.scrollY - (nav ? nav.offsetHeight + 2 : 0);
    window.scrollTo(0, Math.max(0, top));
  }
});
await hideChrome(); await sleep(300);
await shot('05-fiche-5');

await b.close();
if (errs.length) { console.log('erreurs', errs.slice(0, 20).join('\n')); process.exitCode = 1; }
else console.log('ok', errs.length, 'erreurs');
