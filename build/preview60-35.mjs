// v60.35 : captures 390 px avant / après de la zone pack hors-ligne (shiny HOME optionnel).
// Usage : node preview60-35.mjs <baseURL> <préfixe>
//   ex. node preview60-35.mjs http://127.0.0.1:8935/ avant
import puppeteer from 'puppeteer-core'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://127.0.0.1:8935/', PRE = process.argv[3] || 'apres';
const OUT = new URL('../screenshots/apercu-v60.35/', import.meta.url).pathname;
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
await p.goto(BASE + (BASE.includes('?') ? '&' : '?') + 'v=6035' + PRE, { waitUntil: 'networkidle0' });
if (PRE === 'avant') {
  await p.evaluate(async () => {
    if (navigator.serviceWorker) { const regs = await navigator.serviceWorker.getRegistrations(); for (const r of regs) await r.unregister(); }
  });
} else if (navigator) {
  await p.evaluate(async () => { if (navigator.serviceWorker) try { await navigator.serviceWorker.ready; } catch {} });
}
await sleep(600);
const hideChrome = () => p.evaluate(() => { document.querySelectorAll('#toast, #upd, .toast').forEach(el => { el.hidden = true; el.style.display = 'none'; }); });
await hideChrome();

const shot = async (name) => {
  await hideChrome();
  const path = `${OUT}${PRE}-${name}.png`;
  await p.screenshot({ path });
  const txt = await p.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 320));
  console.log(path + '\n   ' + txt);
};

const openOffline = async () => {
  await p.evaluate(() => {
    if (typeof menuOpen === 'function') menuOpen(true);
    const off = document.getElementById('offline');
    if (off) off.scrollIntoView({ block: 'start' });
    const menu = document.getElementById('menu');
    if (menu && off) {
      const top = off.closest('.msec') || off;
      menu.scrollTop = Math.max(0, top.offsetTop - 48);
    }
  });
  await hideChrome();
  await sleep(400);
};

await openOffline();
await shot('01-zone-hors-ligne');

if (PRE === 'apres') {
  const hasBtn = await p.evaluate(() => !!document.getElementById('dlhs'));
  if (hasBtn) {
    await p.evaluate(() => { const b = document.getElementById('dlhs'); if (b) b.click(); });
    // wait for a progress line
    for (let i = 0; i < 40; i++) {
      const t = await p.evaluate(() => (document.getElementById('offline') || {}).innerText || '');
      if (/\d+\s*\/\s*\d+/.test(t)) { console.log('progress:', t.replace(/\s+/g, ' ').trim()); break; }
      await sleep(200);
    }
    await hideChrome(); await sleep(200);
    await openOffline();
    await shot('02-progression');
    // wait for done / déjà téléchargé
    for (let i = 0; i < 90; i++) {
      const t = await p.evaluate(() => (document.getElementById('offline') || {}).innerText || '');
      if (/déjà télécharg/.test(t)) { console.log('done:', t.replace(/\s+/g, ' ').trim()); break; }
      await sleep(400);
    }
    await hideChrome(); await sleep(200);
    await openOffline();
    await shot('03-deja-telecharge');
  } else {
    console.log('pas de bouton #dlhs (état déjà téléchargé ou aperçu incomplet)');
  }
}

await b.close();
if (errs.length) { console.log('erreurs', errs.slice(0, 20).join('\n')); process.exitCode = 1; }
else console.log('ok', errs.length, 'erreurs');
