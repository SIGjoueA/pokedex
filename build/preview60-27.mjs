// v60.27 : captures (390 px) des raids Téracristal d’Écarlate / Violet. Usage : node preview60-27.mjs <baseURL> <préfixe>
//   ex. node preview60-27.mjs https://sigjouea.github.io/pokedex/ avant ; node preview60-27.mjs http://localhost:8870/ apres
import puppeteer from 'puppeteer-core'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:8870/', PRE = process.argv[3] || 'apres', OUT = '/workspace/pokedex-v6027/screenshots/apercu-v60.27/'; fs.mkdirSync(OUT, { recursive: true });
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
  await p.evaluate((s, o) => { const fb = s.querySelector('.foldbtn'); if (fb && !s.classList.contains('open')) fb.click(); if (o) s.querySelectorAll('.raidloc details, details').forEach(d => d.open = true); s.scrollIntoView(); }, sec, open); await unstick(); await sleep(300);
  const txt = await p.evaluate(s => s.innerText.replace(/\s+/g, ' ').slice(0, 400), sec);
  await sec.asElement().screenshot({ path: `${OUT}${PRE}-${name}.png` }); console.log(`${OUT}${PRE}-${name}.png\n   ${txt}`);
};
await shot('01-pikachu-ev-paldea', '25', 'sv', true);
await shot('02-chartor-talent-cache-garanti', '324', 'sv', true);
await shot('03-tauros-paldea-flamboyante', '128-paldea-blaze-breed', 'sv', true);
await shot('04-grotadmorv-alola-disque-indigo', '89-alola', 'svdisk', true);
await shot('05-ogerpon-antre-interdit', '1017', 'svmask', true);
await shot('06-chapignon-tera-par-defaut', '286', 'sv', true);
console.log('ERREURS', JSON.stringify(errs)); await b.close();
