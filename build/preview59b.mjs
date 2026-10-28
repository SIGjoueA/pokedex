// v59 : captures (390 px) — retour depuis une fiche, « † », Combats Max global et par boss. Usage : node preview59b.mjs [baseURL]
import puppeteer from 'puppeteer-core'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:8859/', OUT = '/workspace/pokedex/screenshots/v59/'; fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms)), errs = [];
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage(); p.on('pageerror', e => errs.push('pageerror ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text()); });
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await p.goto(BASE, { waitUntil: 'networkidle0' }); await sleep(800);
const go = async (f, st, full) => { await p.evaluate(s => { localStorage.setItem('rank', JSON.stringify(s)); location.hash = '#/'; }, st); await p.reload({ waitUntil: 'networkidle0' });
  await p.evaluate(() => { location.hash = '#/classements'; }); await sleep(1800); if (f) { await p.screenshot({ path: OUT + f + '.png', fullPage: !!full }); console.log(OUT + f + '.png'); } };
const B = [['max-par-boss-attaquant-artikodin', 'A', '144'], ['max-par-boss-tank-artikodin', 'T', '144'], ['max-par-boss-soigneur-artikodin', 'H', '144']];
const max = await p.evaluate(() => fetch('data/rank-max.json').then(r => r.json())); const gm = max.B.find(x => x[2] >= 6 && /Dracaufeu/.test(x[1])) || max.B.find(x => x[2] >= 6);
B.push(['max-par-boss-attaquant-' + gm[1].toLowerCase().normalize('NFD').replace(/[^a-z]+/g, '-').replace(/-$/, ''), 'A', gm[0]]);
for (const [f, ro, mb] of B) await go(f, { s: 'max', mv: 'b', ro, mb });
for (const ro of 'ATH') await go('max-global-' + { A: 'attaquant', T: 'tank', H: 'soigneur' }[ro], { s: 'max', mv: 'g', ro });
await go('dague-raids-global', { s: 'raid', rv: 'g', sh: 0 });
await go('dague-pvp-super', { s: 'pvp', lg: 'g', sh: 1 });
// back flow: raids per boss, scroll, open the 5th row, back
await go('', { s: 'raid', rv: 'b', sh: 1, boss: '384-mega|Méga légendaire' }); await p.evaluate(() => window.scrollTo(0, 500)); await sleep(400);
await p.screenshot({ path: OUT + 'retour-1-classement.png' }); const rows = await p.$$('#rank-view .rkrow'); await rows[6].click(); await sleep(2500);
await p.screenshot({ path: OUT + 'retour-2-fiche.png' }); console.log('fiche', await p.evaluate(() => location.hash + ' ← ' + document.querySelector('#detail-view .dnav a').getAttribute('href')));
await p.click('#detail-view .dnav a'); await sleep(2000); await p.screenshot({ path: OUT + 'retour-3-classement.png' });
console.log('après retour', await p.evaluate(() => location.hash + ' scrollY=' + window.scrollY + ' vue=' + document.querySelector('#rank-view .rkbt')?.textContent));
await p.evaluate(() => { location.hash = '#/'; }); await sleep(800); await p.evaluate(() => { location.hash = '#/p/6'; }); await sleep(2000);
console.log('fiche depuis la liste ←', await p.evaluate(() => document.querySelector('#detail-view .dnav a').getAttribute('href')));
console.log('ERREURS', JSON.stringify(errs)); await b.close();
