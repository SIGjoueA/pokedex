// v60.37 : captures 390 px avant / après des filtres capacité et talent.
// Usage : node preview60-37.mjs <baseURL> <préfixe>
import puppeteer from 'puppeteer-core'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://127.0.0.1:8937/';
const PRE = process.argv[3] || 'apres';
const OUT = new URL('../screenshots/apercu-v60.37/', import.meta.url).pathname;
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
await p.goto(BASE + (BASE.includes('?') ? '&' : '?') + 'v=6037' + PRE, { waitUntil: 'networkidle0' });
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
    const mv = document.querySelector('#mvq'), ab = document.querySelector('#abq');
    const sug = document.querySelector('#mvsug:not([hidden]), #absug:not([hidden])');
    const meth = document.querySelector('#mvmeth');
    const count = document.querySelector('#count')?.textContent || '';
    return `mv=${mv ? mv.value : '∅'} ab=${ab ? ab.value : '∅'} sug=${sug ? 'yes' : 'no'} meth=${meth && !meth.hidden ? meth.innerText.replace(/\s+/g,' ') : 'hidden'} | ${count}`;
  });
  console.log(path + '\n   ' + adv + '\n   ' + txt);
};
const reset = async () => {
  await p.evaluate(() => { const b = document.querySelector('#reset'); if (b && !b.hidden) b.click(); });
  await sleep(300);
};
const typeIn = async (sel, value) => {
  await p.evaluate((sel) => { const el = document.querySelector(sel); el.focus(); el.value = ''; el.dispatchEvent(new Event('input', { bubbles: true })); }, sel);
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

const waitLearn = async () => {
  await p.evaluate(() => { document.querySelector('#mvq')?.focus(); });
  await p.waitForFunction(() => typeof LEARN !== 'undefined' && LEARN, { timeout: 15000 }).catch(() => {});
  await sleep(200);
  await p.evaluate(() => { if (typeof closeSug === 'function') closeSug(); document.querySelector('#mvq')?.blur(); });
};
await shot('01-liste');
if (PRE !== 'avant') await waitLearn();
if (PRE === 'avant') {
  await typeIn('#q', 'Pikachu');
  await sleep(300);
  await shot('02-recherche-nom');
} else {
  await typeIn('#mvq', 'séi');
  await sleep(400);
  await shot('02-saisie-seisme');
  await pickFirstSug('#mvsug');
  await sleep(600);
  await p.evaluate(() => window.scrollTo(0, 0));
  await shot('03-seisme');
  await p.evaluate(() => {
    const b = [...document.querySelectorAll('#mvmeth [data-meth]')].find(x => x.dataset.meth === 'l');
    if (b) b.click();
  });
  await sleep(500);
  await p.evaluate(() => window.scrollTo(0, 0));
  await shot('04-seisme-niveau');
  await reset();
  await typeIn('#abq', 'lévi');
  await sleep(400);
  await shot('05-saisie-levitation');
  await pickFirstSug('#absug');
  await sleep(600);
  await p.evaluate(() => window.scrollTo(0, 0));
  await shot('06-levitation');
  // Jeu XY + Lévitation, puis recherche Ectoplasma (le talent perdu doit apparaitre)
  await p.evaluate(async () => {
    if (typeof setGame === 'function') await setGame('xy');
    else {
      const sel = document.querySelector('#game');
      sel.value = 'xy';
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  await sleep(2000);
  await typeIn('#q', 'Ectoplasma');
  await sleep(400);
  await p.evaluate(() => window.scrollTo(0, 0));
  await shot('07-levitation-xy');
  await reset();
  // composition : nom + capacité (Pikachu n’apprend pas Séisme)
  await typeIn('#q', 'Pikachu');
  await typeIn('#mvq', 'Séisme');
  await sleep(300);
  await pickFirstSug('#mvsug');
  await sleep(500);
  await shot('08-pikachu-seisme');
}

await b.close();
if (errs.length) console.log('ERRS\n' + errs.slice(0, 30).join('\n'));
else console.log('no page errors');
