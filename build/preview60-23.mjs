// v60.23 : captures (390 px) du bloc « Objet requis » des fiches Méga / Primo. Usage : node preview60-23.mjs [baseURL]
import puppeteer from 'puppeteer-core'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:8861/', OUT = '/workspace/pokedex/screenshots/apercu-v60.23/'; fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms)), errs = [];
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage(); p.on('pageerror', e => errs.push('pageerror ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text()); });
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await p.goto(BASE, { waitUntil: 'networkidle0' }); await sleep(800);
const shot = async (name, key, game) => {
  await p.evaluate(k => { location.hash = '#/p/' + k; }, key); await sleep(1800);
  if (game) { await p.evaluate(g => changeGame(g), game); await sleep(1500); }
  const sec = await p.evaluateHandle(() => [...document.querySelectorAll('#detail-view section.box')].find(s => /^Où le trouver/.test(s.querySelector('h2')?.textContent || '')));
  if (!sec.asElement()) { console.log('! pas de section', name); return; }
  await p.evaluate(s => { const fb = s.querySelector('.foldbtn'); if (fb && !s.classList.contains('open')) fb.click(); s.scrollIntoView(); }, sec); await sleep(400);
  const txt = await p.evaluate(s => s.innerText.replace(/\s+/g, ' ').slice(0, 700), sec);
  await sec.asElement().screenshot({ path: OUT + name + '.png' }); console.log(OUT + name + '.png\n   ' + txt);
};
await shot('01-mega-alakazam-rosa', '65-mega', 'oras');
await shot('02-mega-dracaufeu-x-x-y', '6-mega-x', 'xy');
await shot('03-mega-dracaufeu-y-x-y', '6-mega-y', 'xy');
await shot('04-primo-kyogre-rosa', '382-primal', 'oras');
await shot('05-mega-rayquaza-rosa', '384-mega', 'oras');
await shot('06-mega-alakazam-ultra-soleil-ultra-lune', '65-mega', 'usum');
await shot('07-mega-melodelfe-z-a', '36-mega', 'za');
await shot('08-mega-heatran-z-a-mega-dimension', '485-mega', 'zadlc');
await shot('09-mega-mewtwo-x-lets-go', '150-mega-x', 'lgpe');
await shot('10-mega-rayquaza-z-a-sans-objet', '384-mega', 'za');
console.log('ERREURS', JSON.stringify(errs)); await b.close();
