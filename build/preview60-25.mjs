// v60.25 : captures (390 px) du rang PvP des formes reliées à PvPoke (fiche GO + Classements). Usage : node preview60-25.mjs [baseURL]
import puppeteer from 'puppeteer-core'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:8925/', OUT = '/workspace/pokedex/screenshots/apercu-v60.25/'; fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms)), errs = [];
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage(); p.on('pageerror', e => errs.push('pageerror ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text()); });
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await p.goto(BASE, { waitUntil: 'networkidle0' }); await sleep(800);
await p.evaluate(() => { location.hash = '#/p/150-armored'; }); await sleep(2000); await p.evaluate(() => changeGame('go')); await sleep(1500);
const box = async (re) => p.evaluateHandle(r => [...document.querySelectorAll('#detail-view section.box')].find(s => new RegExp(r).test(s.querySelector('h2')?.textContent || '')), re);
const shot = async (name, key, moves) => {
  await p.evaluate(k => { location.hash = '#/p/' + k; }, key); await sleep(2200);
  const sec = await box(moves ? '^Attaques' : '^Combats GO \\(PvP\\)');
  if (!sec.asElement()) { console.log('! pas de section', name); return; }
  await p.evaluate((s, mv) => { const fb = s.querySelector('.foldbtn'); if (fb && !s.classList.contains('open')) fb.click(); if (mv) s.querySelector('[data-mvm=pvp]')?.click(); }, sec, moves); await sleep(500);
  const s2 = await box(moves ? '^Attaques' : '^Combats GO \\(PvP\\)'); await p.evaluate(s => s.scrollIntoView(), s2); await sleep(300);
  await p.addStyleTag({ content: '.dtop,.top{position:static!important}' });
  const txt = await p.evaluate(s => s.innerText.replace(/\s+/g, ' ').slice(0, 600), s2);
  await s2.asElement().screenshot({ path: OUT + name + '.png' }); console.log(OUT + name + '.png\n   ' + txt);
};
await shot('01-mewtwo-armure-pvp', '150-armored');
await shot('02-zacian-couronne-pvp', '888-crowned');
await shot('03-zygarde-10-pvp', '718-10');
await shot('04-limonde-de-galar-pvp', '618-galar');
await shot('05-limonde-base-pvp', '618');
await shot('06-kyurem-noir-pvp', '646-black');
await shot('07-genesect-choc-pvp', '649-shock');
await shot('08-zarbi-b-forme-apparence', '201-b');
await shot('09-limonde-de-galar-attaques-pvp', '618-galar', true);
const rank = async (name, lg, find) => {
  await p.evaluate(() => { location.hash = '#/classements'; }); await sleep(2500);
  await p.evaluate(() => document.querySelector('#rank-view [data-rk=s][data-v=pvp]')?.click()); await sleep(800);
  await p.evaluate(l => { const s = document.querySelector('#rklg'); s.value = l; s.dispatchEvent(new Event('change', { bubbles: true })); }, lg); await sleep(1200);
  const li = await p.evaluateHandle(f => [...document.querySelectorAll('#rank-view .rklist > li')].find(x => x.textContent.includes(f)), find);
  if (!li.asElement()) { console.log('! pas trouvé', name, find); return; }
  await p.evaluate(x => window.scrollTo(0, x.getBoundingClientRect().top + window.scrollY - 330), li); await sleep(400);
  await p.screenshot({ path: OUT + name + '.png' }); console.log(OUT + name + '.png  ' + await p.evaluate(x => x.innerText.replace(/\s+/g, ' '), li));
};
await rank('10-classement-ligue-master-kyurem-noir-necrozma', 'm', 'Kyurem Noir');
await rank('11-classement-ligue-super-limonde-de-galar', 'g', 'Limonde de Galar');
await rank('12-classement-ligue-hyper-grotadmorv-alola', 'u', 'Grotadmorv d’Alola');
console.log('ERREURS', JSON.stringify(errs)); await b.close();
