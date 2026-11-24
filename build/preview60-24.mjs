// v60.24 : captures (390 px) des raids Dynamax d’Épée / Bouclier. Usage : node preview60-24.mjs <baseURL> <préfixe>
//   ex. node preview60-24.mjs https://sigjouea.github.io/pokedex/ avant ; node preview60-24.mjs http://localhost:8864/ apres
import puppeteer from 'puppeteer-core'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:8864/', PRE = process.argv[3] || 'apres', OUT = '/workspace/pokedex/screenshots/apercu-v60.24/'; fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms)), errs = [];
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage(); p.on('pageerror', e => errs.push('pageerror ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text()); });
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await p.goto(BASE, { waitUntil: 'networkidle0' }); await sleep(800);
const unstick = () => p.evaluate(() => { for (const el of document.querySelectorAll('body *')) { const ps = getComputedStyle(el).position; if (ps === 'sticky' || ps === 'fixed') el.style.visibility = 'hidden'; } });
const shot = async (name, key, game, open) => {
  await p.evaluate(k => { location.hash = '#/p/' + k; }, key); await sleep(1800);
  if (game) { await p.evaluate(g => changeGame(g), game); await sleep(1500); }
  const sec = await p.evaluateHandle(() => [...document.querySelectorAll('#detail-view section.box')].find(s => /^Où le trouver/.test(s.querySelector('h2')?.textContent || '')));
  if (!sec.asElement()) { console.log('pas de bloc', name); return; }
  await p.evaluate((s, o) => { const fb = s.querySelector('.foldbtn'); if (fb && !s.classList.contains('open')) fb.click(); if (o) s.querySelectorAll('.raidloc details').forEach(d => d.open = true); s.scrollIntoView(); }, sec, open); await unstick(); await sleep(300);
  const txt = await p.evaluate(s => s.innerText.replace(/\s+/g, ' ').slice(0, 400), sec);
  await sec.asElement().screenshot({ path: `${OUT}${PRE}-${name}.png` }); console.log(`${OUT}${PRE}-${name}.png\n   ${txt}`);
};
await shot('01-tygnon-eb-couronneige', '107', 'sw', true);
await shot('02-mackogneur-gigamax-eb', '68-gmax', 'sw');
await shot('03-mackogneur-eb', '68', 'sw', true);
await shot('04-lokhlass-eb-nombreux-antres', '131', 'sw');
await shot('05-leuphorie-isolarmure', '113', 'swisle', true);
await shot('06-mewtwo-expedition-dynamax', '150', 'sw');
console.log('ERREURS', JSON.stringify(errs)); await b.close();
