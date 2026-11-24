// v60.21 : captures (390 px) des faiblesses selon le talent. Usage : node preview60-21.mjs [baseURL]
import puppeteer from 'puppeteer-core'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:8861/', OUT = '/workspace/pokedex/screenshots/apercu-v60.21/'; fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms)), errs = [];
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage(); p.on('pageerror', e => errs.push('pageerror ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text()); });
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await p.goto(BASE, { waitUntil: 'networkidle0' }); await sleep(800);
const shot = async (name, key, game, ab) => {
  await p.evaluate(k => { location.hash = '#/p/' + k; }, key); await sleep(1800);
  if (game) { await p.evaluate(g => changeGame(g), game); await sleep(1500); }
  const sec = await p.evaluateHandle(() => [...document.querySelectorAll('#detail-view section.box')].find(s => /^Faiblesses/.test(s.querySelector('h2')?.textContent || '')));
  await p.evaluate(s => { const fb = s.querySelector('.foldbtn'); if (fb && !s.classList.contains('open')) fb.click(); s.scrollIntoView(); }, sec); await sleep(300);
  if (ab) { await p.evaluate((s, a) => { const bt = [...s.querySelectorAll('.abseg [data-abv]')].find(x => x.textContent.startsWith(a)); bt && bt.click(); }, sec, ab); await sleep(300); }
  const ab2 = await p.evaluate(s => s.innerText.replace(/\s+/g, ' ').slice(0, 900), sec);
  await sec.asElement().screenshot({ path: OUT + name + '.png' }); console.log(OUT + name + '.png\n   ' + ab2);
};
await shot('01-ectoplasma-rubis-omega-levitation', '94', 'oras');
await shot('02-ectoplasma-vue-generale-corps-maudit', '94', 'all');
await shot('03-munja-garde-mystik', '292', 'all');
await shot('04-lanturn-types-seuls', '171', 'all');
await shot('05-lanturn-absorbe-volt', '171', 'all', 'Absorbe-Volt');
await shot('06-ponyta-torche', '77', 'all', 'Torche');
await shot('07-galvagon-absorbe-volt', '880', 'all', 'Absorbe-Volt');
await shot('08-cradopaud-peau-seche', '453', 'all', 'Peau Sèche');
await shot('09-rhinastoc-solide-roc', '464', 'all', 'Solide Roc');
await shot('10-mega-rayquaza-souffle-delta', '384-mega', 'oras');
await shot('11-ectoplasma-lets-go-sans-talent', '94', 'lgpe');
console.log('ERREURS', JSON.stringify(errs)); await b.close();
