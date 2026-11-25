// v60.39 : captures 390 px avant / après du filtre Lieu.
// Usage : node preview60-39.mjs <baseURL> <préfixe>
import puppeteer from 'puppeteer-core'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://127.0.0.1:8939/';
const PRE = process.argv[3] || 'apres';
const OUT = new URL('../screenshots/apercu-v60.39/', import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms)), errs = [];
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
p.on('pageerror', e => errs.push('pageerror ' + e.message));
p.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text()); });
await p.evaluateOnNewDocument(() => {
  Object.defineProperty(navigator, 'connection', { configurable: true, get: () => ({ saveData: true, type: 'cellular' }) });
});
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await p.goto(BASE + (BASE.includes('?') ? '&' : '?') + 'v=6039' + PRE, { waitUntil: 'networkidle0' });
await p.evaluate(async () => {
  if (navigator.serviceWorker) { const regs = await navigator.serviceWorker.getRegistrations(); for (const r of regs) await r.unregister(); }
});
await sleep(800);
const hideChrome = () => p.evaluate(() => {
  document.querySelectorAll('#upd, #toast, .toast').forEach(el => { el.hidden = true; el.style.display = 'none'; });
});
const shot = async (name) => {
  await hideChrome();
  const path = `${OUT}${PRE}-${name}.png`;
  await p.screenshot({ path });
  const txt = await p.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 280));
  const adv = await p.evaluate(() => {
    const mv = document.querySelector('#mvq'), ab = document.querySelector('#abq'), loc = document.querySelector('#locq');
    const sug = document.querySelector('#mvsug:not([hidden]), #absug:not([hidden]), #locsug:not([hidden])');
    const note = document.querySelector('#advnote');
    const count = document.querySelector('#count')?.textContent || '';
    return `mv=${mv ? mv.value : '∅'} ab=${ab ? ab.value : '∅'} loc=${loc ? loc.value : '∅'} sug=${sug ? 'yes' : 'no'} note=${note && !note.hidden ? note.innerText : 'hidden'} | ${count}`;
  });
  console.log(path + '\n   ' + adv + '\n   ' + txt);
};
const reset = async () => {
  await p.evaluate(() => { const b = document.querySelector('#reset'); if (b && !b.hidden) b.click(); });
  await sleep(300);
};
const typeIn = async (sel, value) => {
  await p.evaluate((sel) => { const el = document.querySelector(sel); if (!el) return; el.focus(); el.value = ''; el.dispatchEvent(new Event('input', { bubbles: true })); }, sel);
  await p.type(sel, value, { delay: 40 });
  await sleep(400);
};
const pickFirstSug = async (listSel) => {
  await p.evaluate((listSel) => {
    const li = document.querySelector(listSel + ' li[aria-selected="true"], ' + listSel + ' li');
    if (li) li.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  }, listSel);
  await sleep(800);
};
const selectGame = async (id) => {
  await p.evaluate((id) => {
    const sel = document.querySelector('#game');
    if (!sel) return;
    sel.value = id;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  }, id);
  await sleep(700);
};
const waitLoc = async () => {
  await p.evaluate(() => { document.querySelector('#locq')?.focus(); });
  await p.waitForFunction(() => typeof LOC !== 'undefined' && LOC, { timeout: 15000 }).catch(() => {});
  await sleep(200);
  await p.evaluate(() => { if (typeof closeSug === 'function') closeSug(); document.querySelector('#locq')?.blur(); });
};

await shot('01-liste');
if (PRE === 'avant') {
  await typeIn('#q', 'Pikachu');
  await sleep(300);
  await shot('02-recherche-nom');
} else {
  await waitLoc();
  await typeIn('#locq', 'foret de jade');
  await sleep(500);
  await shot('02-saisie-foret-de-jade');
  await pickFirstSug('#locsug');
  await sleep(700);
  await p.evaluate(() => window.scrollTo(0, 0));
  await shot('03-foret-de-jade');
  await reset();
  await selectGame('sv');
  await typeIn('#locq', 'desert rotissable');
  await sleep(500);
  await shot('04-saisie-desert-sv');
  await pickFirstSug('#locsug');
  await sleep(800);
  await p.evaluate(() => window.scrollTo(0, 0));
  await shot('05-desert-rotissable-sv');
  await reset();
  await selectGame('home');
  await typeIn('#locq', 'foret de jade');
  await sleep(400);
  await pickFirstSug('#locsug');
  await sleep(800);
  await p.evaluate(() => window.scrollTo(0, 0));
  await shot('06-home-mention');
}
await b.close();
if (errs.length) { console.error('preview errors:\n' + errs.join('\n')); process.exit(1); }
