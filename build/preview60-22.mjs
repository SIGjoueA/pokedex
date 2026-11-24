// v60.22 : captures (390 px) avant / après des lieux et textes des anciens jeux. Usage : node preview60-22.mjs <baseURL> <préfixe>
//   ex. node preview60-22.mjs https://sigjouea.github.io/pokedex/ avant ; node preview60-22.mjs http://localhost:8862/ apres
import puppeteer from 'puppeteer-core'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:8862/', PRE = process.argv[3] || 'apres', OUT = '/workspace/pokedex/screenshots/apercu-v60.22/'; fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms)), errs = [];
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage(); p.on('pageerror', e => errs.push('pageerror ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text()); });
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await p.goto(BASE, { waitUntil: 'networkidle0' }); await sleep(800);
const shot = async (name, key, game, re) => {
  await p.evaluate(k => { location.hash = '#/p/' + k; }, key); await sleep(1800);
  if (game) { await p.evaluate(g => changeGame(g), game); await sleep(1500); }
  const sec = await p.evaluateHandle(r => [...document.querySelectorAll('#detail-view section.box')].find(s => new RegExp(r).test(s.querySelector('h2')?.textContent || '')), re);
  if (!sec.asElement()) { console.log('pas de bloc', name); return; }
  await p.evaluate(s => { const fb = s.querySelector('.foldbtn'); if (fb && !s.classList.contains('open')) fb.click(); s.scrollIntoView(); }, sec); await sleep(300);
  const txt = await p.evaluate(s => s.innerText.replace(/\s+/g, ' ').slice(0, 500), sec);
  await sec.asElement().screenshot({ path: `${OUT}${PRE}-${name}.png` }); console.log(`${OUT}${PRE}-${name}.png\n   ${txt}`);
};
const LOC = '^Où le trouver', DESC = '^Pokédex(?! régional)';
await shot('01-florizarre-x-y', '3', 'xy', LOC);
await shot('02-leviator-rosa', '130', 'oras', LOC);
await shot('03-miaouss-soleil-lune-hors-dex', '52', 'sm', LOC);
await shot('04-granivol-rf-vf-switch', '187', 'frlgsw', LOC);
await shot('05-mega-alakazam-rosa', '65-mega', 'oras', LOC);
await shot('06-salameche-or-argent', '4', 'gs', LOC);
await shot('07-empiflor-noir2-blanc2-description', '71', 'b2w2', DESC);
console.log('ERREURS', JSON.stringify(errs)); await b.close();
