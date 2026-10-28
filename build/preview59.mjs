// v59 : captures (390 px) de l'onglet « Classements ». Usage : node preview59.mjs [baseURL]
import puppeteer from 'puppeteer-core'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:8859/', OUT = '/workspace/pokedex/screenshots/v59/'; fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms)); const errs = [];
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage(); p.on('pageerror', e => errs.push('pageerror ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text()); }); p.on('response', r => { if (r.status() >= 400) errs.push(r.status() + ' ' + r.url()); });
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await p.goto(BASE, { waitUntil: 'networkidle0' }); await sleep(800);
const shots = [['pvp-super', { s: 'pvp', lg: 'g', sh: 1 }], ['pvp-coupe-des-jeunes', { s: 'pvp', lg: 'l', sh: 1 }], ['pvp-coupe-en-cours', { s: 'pvp', lg: 'c', sh: 1 }], ['raids-global', { s: 'raid', rv: 'g', sh: 0 }], ['raids-par-boss-mega-rayquaza', { s: 'raid', rv: 'b', sh: 1, boss: '384-mega|Méga légendaire' }], ['raids-par-type-dragon', { s: 'raid', rv: 't', ty: 'dragon', sh: 1 }], ['max-attaquant', { s: 'max', ro: 'A' }], ['max-soigneur', { s: 'max', ro: 'H' }]];
for (const [f, st] of shots) {
  await p.evaluate(s => { localStorage.setItem('rank', JSON.stringify(s)); location.hash = '#/'; }, st); await p.reload({ waitUntil: 'networkidle0' });
  await p.evaluate(() => { location.hash = '#/classements'; }); await sleep(1800);
  await p.screenshot({ path: OUT + f + '.png' }); console.log(OUT + f + '.png'); }
// menu entry + tap on a row opens the GO sheet
await p.evaluate(() => { location.hash = '#/'; }); await sleep(600); await p.click('#menubtn'); await sleep(500); await p.screenshot({ path: OUT + 'menu.png' }); console.log(OUT + 'menu.png');
await p.click('#rankbtn'); await sleep(1500); await p.click('#rank-view .rkrow'); await sleep(2500);
console.log('fiche ouverte :', await p.evaluate(() => location.hash + ' jeu=' + (document.querySelector('#dgame') || {}).value));
console.log('ERREURS', JSON.stringify(errs)); await b.close();
