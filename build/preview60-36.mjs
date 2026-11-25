// v60.36 : captures 390 px avant / après des sprites animés (fiche + secours).
// Usage : node preview60-36.mjs <baseURL> <préfixe>
import puppeteer from 'puppeteer-core'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://127.0.0.1:8936/', PRE = process.argv[3] || 'apres';
const OUT = new URL('../screenshots/apercu-v60.36/', import.meta.url).pathname;
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
await p.goto(BASE + (BASE.includes('?') ? '&' : '?') + 'v=6036' + PRE, { waitUntil: 'networkidle0' });
await p.evaluate(async () => {
  if (navigator.serviceWorker) { const regs = await navigator.serviceWorker.getRegistrations(); for (const r of regs) await r.unregister(); }
});
await sleep(600);
const hideChrome = (hideToast = true) => p.evaluate((hideToast) => {
  document.querySelectorAll('#upd').forEach(el => { el.hidden = true; el.style.display = 'none'; });
  if (hideToast) document.querySelectorAll('#toast, .toast').forEach(el => { el.hidden = true; el.style.display = 'none'; });
}, hideToast);

const shot = async (name, hideToast = true) => {
  await hideChrome(hideToast);
  const path = `${OUT}${PRE}-${name}.png`;
  await p.screenshot({ path });
  const txt = await p.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 280));
  const src = await p.evaluate(() => { const i = document.querySelector('#heroimg'); return i ? i.src : ''; });
  const pressed = await p.evaluate(() => [...document.querySelectorAll('.sprsw button')].map(b => `${b.textContent}:${b.getAttribute('aria-pressed')}`).join(' '));
  console.log(path + '\n   ' + txt + '\n   src=' + src + '  ' + pressed);
};

const openSheet = async (k) => {
  await p.evaluate((k) => { sheetPref = 'all'; location.hash = '#/p/' + k; }, k);
  await sleep(2000);
  await p.evaluate(() => {
    const hero = document.querySelector('#detail-view .hero');
    const nav = document.querySelector('#detail-view .dtop');
    if (hero) {
      const top = hero.getBoundingClientRect().top + window.scrollY - (nav ? nav.offsetHeight + 2 : 0);
      window.scrollTo(0, Math.max(0, top));
    }
  });
  await sleep(300);
};

const clickAnim = async () => {
  await p.evaluate(() => {
    const btn = document.querySelector('.sprsw [data-spr="anim"]');
    if (btn) btn.click();
  });
  await sleep(1500);
  await p.evaluate(() => {
    const hero = document.querySelector('#detail-view .hero');
    const nav = document.querySelector('#detail-view .dtop');
    if (hero) {
      const top = hero.getBoundingClientRect().top + window.scrollY - (nav ? nav.offsetHeight + 2 : 0);
      window.scrollTo(0, Math.max(0, top));
    }
  });
  await sleep(400);
};

await openSheet('25');
await clickAnim();
await shot('01-pikachu-anime');

await openSheet('26-mega-x');
await clickAnim();
// avant : toast d’erreur visible ; après : secours HOME, pas de toast d’erreur
await shot('02-mega-sans-anime', PRE === 'avant' ? false : true);

await b.close();
if (errs.length) { console.log('erreurs', errs.slice(0, 20).join('\n')); process.exitCode = 1; }
else console.log('ok', errs.length, 'erreurs');
