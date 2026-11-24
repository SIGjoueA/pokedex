// v60.32 : captures (390 px) des meilleurs attaquants des raids Téracristal 7★ et 6★.
// Usage : node preview60-32.mjs <baseURL> <préfixe>
//   ex. node preview60-32.mjs http://localhost:8932/ apres
import puppeteer from 'puppeteer-core'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:8932/', PRE = process.argv[3] || 'apres';
const OUT = new URL('../screenshots/apercu-v60.32/', import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms)), errs = [];
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage(); p.on('pageerror', e => errs.push('pageerror ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text()); });
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await p.goto(BASE + (BASE.includes('?') ? '&' : '?') + 'v=6032', { waitUntil: 'networkidle0' });
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

// 01 : vue Raids ÉV, bloc Meilleurs attaquants (Lanssorien en cours le 24/11/2026)
await p.evaluate(() => { RV.g = 'sv'; RV.s = ''; location.hash = '#/raids/sv'; });
await sleep(1200);
await p.evaluate(async () => {
  await loadRaids();
  RV.g = 'sv'; RV.s = '';
  renderRaids();
});
await sleep(800);
await p.evaluate(() => {
  const sec = document.querySelector('#raid-view details.svrksec');
  if (sec) sec.open = true;
  window.scrollTo(0, 0);
});
await hideChrome(); await sleep(300);
await shot('01-vue-raids-attaquants');

// 02 : même vue, un boss 6★ (type Téra au choix)
const sixId = await p.evaluate(() => {
  const sel = document.querySelector('#raid-view [data-svrk-boss]');
  if (!sel) return '';
  const opt = [...sel.options].find(o => (o.value || '').endsWith('-6'));
  return opt ? opt.value : '';
});
if (sixId) {
  await p.evaluate(id => {
    const sel = document.querySelector('#raid-view [data-svrk-boss]');
    if (!sel) return;
    sel.value = id;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  }, sixId);
  await sleep(600);
  await p.evaluate(() => {
    const sec = document.querySelector('#raid-view details.svrksec');
    if (sec) sec.open = true;
    const feu = document.querySelector('#raid-view [data-svrk-tera="fire"]');
    if (feu) feu.click();
  });
  await sleep(400);
  await p.evaluate(() => {
    const ctl = document.querySelector('#raid-view .rvctl');
    const chips = document.querySelector('#raid-view .svrktera') || document.querySelector('#raid-view .svrkbox');
    const navH = (document.querySelector('#raid-view .dtop')?.offsetHeight || 0) + (ctl?.offsetHeight || 0);
    if (chips) {
      const top = chips.getBoundingClientRect().top + window.scrollY - navH - 8;
      window.scrollTo(0, Math.max(0, top));
    } else window.scrollTo(0, 0);
  });
  await hideChrome(); await sleep(300);
  await shot('02-vue-raids-6-tera');
} else {
  await shot('02-vue-raids-6-tera');
}

// 03 : fiche Lanssorien, meilleurs attaquants du raid 7★
await p.evaluate(() => {
  sheetPref = 'sv'; fromRaids = true; raidBack = '#/raids/sv';
  location.hash = '#/p/887';
});
await sleep(2000);
await p.evaluate(() => {
  const box = document.querySelector('#detail-view .t7block .svrkbox') || document.querySelector('#detail-view .svrkbox');
  const fold = document.querySelector('#detail-view section.box .foldbtn');
  if (fold) {
    const sec = fold.closest('section.box');
    if (sec && !sec.classList.contains('open')) fold.click();
  }
  document.querySelectorAll('#detail-view details').forEach(d => { d.open = true; });
  const nav = document.querySelector('#detail-view .dtop');
  if (box) {
    const top = box.getBoundingClientRect().top + window.scrollY - (nav ? nav.offsetHeight + 2 : 0);
    window.scrollTo(0, Math.max(0, top));
  }
});
await hideChrome(); await sleep(300);
await shot('03-fiche-lanssorien');

// 04 : fiche d’un boss 6★, choix du type Téra
const sixK = sixId ? sixId.replace(/-6$/, '') : '700';
await p.evaluate(k => {
  sheetPref = 'sv'; fromRaids = true; raidBack = '#/raids/sv';
  location.hash = '#/p/' + k;
}, sixK);
await sleep(2000);
await p.evaluate(() => {
  const fold = document.querySelector('#detail-view section.box .foldbtn');
  if (fold) {
    const sec = fold.closest('section.box');
    if (sec && !sec.classList.contains('open')) fold.click();
  }
  document.querySelectorAll('#detail-view details').forEach(d => { d.open = true; });
  const box = document.querySelector('#detail-view .svrk6 .svrkbox') || document.querySelector('#detail-view .svrkbox');
  const nav = document.querySelector('#detail-view .dtop');
  if (box) {
    const top = box.getBoundingClientRect().top + window.scrollY - (nav ? nav.offsetHeight + 2 : 0);
    window.scrollTo(0, Math.max(0, top));
  }
});
await hideChrome(); await sleep(300);
await shot('04-fiche-6');

await b.close();
if (errs.length) { console.log('erreurs', errs.slice(0, 20).join('\n')); process.exitCode = 1; }
else console.log('ok', errs.length, 'erreurs');
