// v60.28 : captures (390 px) des « † » (attaques exclusives) dans Classements › Raids et Combats Max. Usage : node preview60-28.mjs [baseURL]
import puppeteer from 'puppeteer-core'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:8928/', OUT = '/workspace/pokedex-v6028/screenshots/apercu-v60.28/'; fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms)), errs = [];
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage(); p.on('pageerror', e => errs.push('pageerror ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text()); });
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const unstick = () => p.evaluate(() => { for (const el of document.querySelectorAll('body *')) { const ps = getComputedStyle(el).position; if (ps === 'sticky' || ps === 'fixed') el.style.visibility = 'hidden'; } });
const go = async (name, st, opt = {}) => {
  await p.evaluate(s => { localStorage.setItem('rank', JSON.stringify(s)); location.hash = '#/'; }, st);
  await p.reload({ waitUntil: 'networkidle0' });
  await p.evaluate(() => { location.hash = '#/classements'; }); await sleep(2000);
  await unstick();
  if (opt.hideCp) await p.evaluate(() => document.querySelectorAll('.pcslot').forEach(el => { el.style.display = 'none'; }));
  if (opt.find) {
    const li = await p.evaluateHandle(f => [...document.querySelectorAll('#rank-view .rklist > li')].find(x => x.textContent.includes(f)), opt.find);
    if (!li.asElement()) console.log('! pas trouvé', name, opt.find);
    else await p.evaluate(x => window.scrollTo(0, x.getBoundingClientRect().top + window.scrollY - 280), li);
    await sleep(400);
  }
  const txt = await p.evaluate(() => (document.querySelector('#rank-view .rklist')?.innerText || document.querySelector('#rank-view')?.innerText || '').replace(/\s+/g, ' ').slice(0, 700));
  await p.screenshot({ path: OUT + name + '.png' }); console.log(OUT + name + '.png\n   ' + txt);
};
await p.goto(BASE, { waitUntil: 'networkidle0' }); await sleep(800);
await go('01-classement-raids-global-dague', { s: 'raid', rv: 'g', sh: 0, bt: 'l' });
await go('02-classement-max-attaquant-dague', { s: 'max', mv: 'g', ro: 'A', bt: 'l' });
await go('03-classement-raids-par-boss-mewtwo-dague', { s: 'raid', rv: 'b', sh: 0, boss: '150|5★', bt: 'l' }, { hideCp: true });
console.log('ERREURS', JSON.stringify(errs)); await b.close();
