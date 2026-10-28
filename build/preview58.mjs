// v58 : captures (390 px) du bloc « Attaques » GO (raid v2, Combats Max). Usage : node preview58.mjs [baseURL]
import puppeteer from 'puppeteer-core'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:8858/', OUT = '/workspace/pokedex/screenshots/v58/'; fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms)); const errs = [];
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage(); p.on('pageerror', e => errs.push('pageerror ' + e.message)); p.on('response', r => { if (r.status() >= 400) errs.push(r.status() + ' ' + r.url()); });
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await p.goto(BASE, { waitUntil: 'networkidle0' }); await sleep(800);
const shots = [['383', 'raid', 'groudon'], ['150', 'raid', 'mewtwo'], ['384-mega', 'raid', 'mega-rayquaza'], ['248', 'raid', 'tyranocif'], ['6-gmax', 'max', 'dracaufeu-gigamax'], ['242', 'max', 'leuphorie'], ['150-mega-y', 'raid', 'mega-mewtwo-y'], ['37-mega', 'raid', 'x'], ['150-armored', 'raid', 'mewtwo-armure'], ['302-mega', 'raid', 'mega-tenefix']];
for (const [k, mode, f] of shots) { if (f === 'x') continue;
  await p.goto(BASE + '#/p/' + k); await sleep(1300); try { await p.select('#dgame', 'go'); } catch (e) { errs.push(k + ' select ' + e.message); } await sleep(1200);
  const ok = await p.evaluate(m => { const s = document.querySelector('.gomoves'); if (!s) return false; const bt = s.querySelector(`[data-mvm=${m}]`); if (bt) bt.click(); s.querySelectorAll('details.rdwx').forEach(d => d.open = true);
    s.querySelectorAll('.foldbtn,.fold-more,button').forEach(x => { if (/Voir plus/.test(x.textContent)) x.click(); }); s.classList.remove('folded'); s.style.maxHeight = 'none'; return true; }, mode);
  if (!ok) { errs.push(k + ' pas de bloc Attaques'); continue; } await p.evaluate(() => document.querySelectorAll('body *').forEach(e => { const c = getComputedStyle(e).position; if (c === 'fixed' || c === 'sticky') e.style.display = 'none'; })); await sleep(500);
  const el = await p.$('.gomoves'); await el.screenshot({ path: OUT + f + '.png' }); console.log(OUT + f + '.png'); }
console.log('ERREURS', JSON.stringify(errs)); await b.close();
