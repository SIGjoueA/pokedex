// v60.29 : captures (390 px) des formes précisées (textes Méga, disponibilité, lieux). Usage : node preview60-29.mjs <baseURL> <préfixe>
//   ex. node preview60-29.mjs https://sigjouea.github.io/pokedex/ avant ; node preview60-29.mjs http://localhost:8870/ apres
import puppeteer from 'puppeteer-core'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:8870/', PRE = process.argv[3] || 'apres', OUT = '/workspace/pokedex-v6029/screenshots/apercu-v60.29/'; fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms)), errs = [];
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage(); p.on('pageerror', e => errs.push('pageerror ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text()); });
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await p.goto(BASE, { waitUntil: 'networkidle0' }); await sleep(800);
const unstick = () => p.evaluate(() => { for (const el of document.querySelectorAll('body *')) { const ps = getComputedStyle(el).position; if (ps === 'sticky' || ps === 'fixed') el.style.visibility = 'hidden'; } });
const shot = async (name, key, game, titleRe) => {
  await p.evaluate(k => { location.hash = '#/p/' + k; }, key); await sleep(1800);
  await p.evaluate(g => changeGame(g), game || 'all'); await sleep(1500);
  const sec = await p.evaluateHandle(re => {
    const rx = new RegExp(re);
    return [...document.querySelectorAll('#detail-view section.box')].find(s => rx.test(s.querySelector('h2')?.textContent || ''));
  }, titleRe);
  if (!sec.asElement()) { console.log('pas de bloc', name, titleRe); return; }
  await p.evaluate(s => { const fb = s.querySelector('.foldbtn'); if (fb && !s.classList.contains('open')) fb.click(); s.scrollIntoView(); }, sec); await unstick(); await sleep(300);
  const txt = await p.evaluate(s => s.innerText.replace(/\s+/g, ' ').slice(0, 420), sec);
  await sec.asElement().screenshot({ path: `${OUT}${PRE}-${name}.png` }); console.log(`${OUT}${PRE}-${name}.png\n   ${txt}`);
};
await shot('01-mega-florizarre-za', '3-mega', 'za', '^Pokédex(?! régional)');
// The description may not be in a section.box with that title — fallback handled below if needed
await shot('02-mega-dracaufeu-x-lgpe', '6-mega-x', 'lgpe', '^Pokédex(?! régional)');
await shot('03-mega-raichu-x-present-dans', '26-mega-x', null, '^Présent dans');
await shot('04-raichu-alola-present-dans', '26-alola', null, '^Présent dans');
await shot('05-tauros-paldea-combat-sv', '128-paldea-combat-breed', 'sv', '^Où le trouver');
await shot('06-mega-nigirigon-courbee-zadlc', '978-curly-mega', 'zadlc', '^Pokédex(?! régional)');
console.log('ERREURS', JSON.stringify(errs)); await b.close();
