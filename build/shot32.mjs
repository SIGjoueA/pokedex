// v32 screenshots (360 px + 1000 px): Poképédia descriptions / étymologie / distributions, lieux Switch, GO (PC 40, PvP, régions, bonbons), catégories Méga / Gigamax.
// Usage: node shot32.mjs [baseURL]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:8801/', OUT = '/workspace/pokedex/screenshots/v32/';
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms)); const errs = [], F = {};
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
async function page(w) { const p = await b.newPage(); p.on('pageerror', e => errs.push(e.message)); await p.setViewport(w < 700 ? { width: 360, height: 780, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { width: 1000, height: 800, deviceScaleFactor: 1 }); await p.goto(BASE, { waitUntil: 'networkidle0' }); return p; }
const shot = async (p, id, f) => { await sleep(450); await p.screenshot({ path: OUT + f }); F[id] = OUT + f; console.log(OUT + f); };
const open = async (p, k, g = 'all') => { await p.goto(BASE + '#/'); await sleep(300); await p.goto(BASE + '#/p/' + k); await sleep(1300); await p.select('#dgame', g); await sleep(900); };
const to = (p, sel, dy = -130) => p.evaluate((s, dy) => { const e = typeof s === 'string' && s.startsWith('h2:') ? [...document.querySelectorAll('.detail h2')].find(h => h.textContent.includes(s.slice(3))) : document.querySelector(s); e.scrollIntoView({ block: 'start' }); window.scrollBy(0, dy); }, sel, dy).then(() => sleep(350));
const cat = async (p, v, g = '') => { await p.keyboard.press('Escape'); await p.goto(BASE + '#/'); await sleep(500); await p.select('#game', g); await sleep(700); await p.evaluate(() => { const b = document.querySelector('#formsbtn'); if (b.getAttribute('aria-pressed') === 'true') b.click(); }); await p.select('#cat', v); await sleep(800); await p.evaluate(() => scrollTo(0, 0)); };
const menu = async p => { await p.evaluate(() => window.scrollTo(0, 0)); await p.click('#catbtn'); await sleep(500); };
for (const w of [360, 1000]) {
  const p = await page(w), t = w + 'px';
  await open(p, '6', 'xy'); await to(p, '.desc', -150); await shot(p, 'd1' + w, `01-description-poképédia-dracaufeu-xy-${t}.png`);
  await open(p, '1017-wellspring-mask', 'svmask'); await to(p, '.desc', -150); await shot(p, 'd2' + w, `02-description-forme-ogerpon-puits-${t}.png`);
  await open(p, '6'); await to(p, '.etybox', -110); await p.evaluate(() => document.querySelector('.evd').open = true); await shot(p, 'd3' + w, `03-origine-du-nom-distributions-${t}.png`);
  await open(p, '174', 'b2w2'); await to(p, '.desc', -150); await shot(p, 'd4' + w, `04-description-trad-auto-dernier-recours-${t}.png`);
  await open(p, '133', 'sv'); await to(p, '.encbox', -110); await shot(p, 'l1' + w, `05-lieux-evoli-ecarlate-violet-${t}.png`);
  await open(p, '52-galar', 'sv'); await to(p, '.encbox', -110); await shot(p, 'l2' + w, `06-cadeau-miaouss-galar-ev-${t}.png`);
  await open(p, '129', 'bdsp'); await to(p, '.encbox', -110); await shot(p, 'l3' + w, `07-echange-magicarpe-deps-${t}.png`);
  await open(p, '25', 'za'); await to(p, '.encbox', -110); await shot(p, 'l4' + w, `08-lieux-pikachu-z-a-${t}.png`);
  await open(p, '133', 'go'); await to(p, '.gostats', -110); await shot(p, 'g1' + w, `09-go-pc-max-40-50-51-pvp-${t}.png`);
  await to(p, '.goinfo', -110); await shot(p, 'g2' + w, `10-go-bonbons-compagnon-${t}.png`);
  await open(p, '115', 'go'); await to(p, '.goinfo', -110); await shot(p, 'g3' + w, `11-go-exclusivite-regionale-kangourex-${t}.png`);
  await open(p, '376', 'go'); await to(p, '.pvpbox', -110); await shot(p, 'g4' + w, `12-go-pvp-metalosse-top-master-${t}.png`);
  await open(p, '132', 'go'); await to(p, '.ditbox', -110); await shot(p, 'g5' + w, `12b-go-metamorph-deguisements-actuels-${t}.png`);
  await p.evaluate(() => document.querySelector('.ditpast').open = true); await to(p, '.ditpast', -110); await shot(p, 'g6' + w, `12c-go-metamorph-anciens-deguisements-${t}.png`);
  await cat(p, ''); await menu(p); await shot(p, 'c1' + w, `13-categorie-menu-mega-gigamax-${t}.png`); 
  await cat(p, 'mega'); await shot(p, 'c2' + w, `14-categorie-mega-evolutions-${t}.png`);
  await cat(p, 'gmax'); await shot(p, 'c3' + w, `15-categorie-gigamax-${t}.png`);
  await cat(p, '', 'rb'); await menu(p); await shot(p, 'c4' + w, `16-categorie-grisee-rouge-bleu-${t}.png`); 
  await p.close();
}
const b64 = f => fs.readFileSync(f).toString('base64');
const planche = async (file, title, cells, cols = 2, iw = 370) => { const q = await b.newPage(); await q.setViewport({ width: cols * (iw + 20) + 20, height: 600, deviceScaleFactor: 2 });
  await q.setContent(`<html><body style="margin:0;padding:22px 20px;font:15px system-ui,'Noto Sans',sans-serif;background:#e9ebf1;color:#171a24"><h1 style="font-size:22px;margin:0 0 14px">${title}</h1><div style="display:grid;grid-template-columns:repeat(${cols},${iw}px);gap:22px 20px;align-items:start">${cells.map(([id, cap]) => `<figure style="margin:0"><figcaption style="font-weight:700;margin:0 0 6px;line-height:1.3">${cap}</figcaption><img style="width:${iw}px;display:block;border-radius:12px;box-shadow:0 1px 8px rgba(0,0,0,.2)" src="data:image/png;base64,${b64(F[id])}"></figure>`).join('')}</div></body></html>`);
  await sleep(400); await q.setViewport({ width: cols * (iw + 20) + 20, height: await q.evaluate(() => document.body.scrollHeight), deviceScaleFactor: 2 }); await q.screenshot({ path: OUT + file, fullPage: true }); await q.close(); console.log(OUT + file); };
await planche('planche-1-v32-descriptions.png', 'v32 (local) — descriptions Poképédia, origine du nom (360 px)', [['d1360', '① Dracaufeu · X / Y : texte Poképédia + crédit CC BY-NC-SA'], ['d2360', '② Ogerpon Masque du Puits · Masque Turquoise : texte de la forme'], ['d3360', '③ Vue d’ensemble : origine du nom, distributions'], ['d4360', '④ Toudoudou · N2 / B2 : traduction automatique (dernier recours, signalée)']]);
await planche('planche-2-v32-lieux.png', 'v32 (local) — lieux de capture détaillés (Poképédia, 360 px)', [['l1360', '⑤ Évoli · Écarlate / Violet'], ['l2360', '⑥ Miaouss de Galar · cadeau (Académie)'], ['l3360', '⑦ Magicarpe · DEPS : échange en jeu'], ['l4360', '⑧ Pikachu · Légendes Z-A']]);
await planche('planche-3-v32-go.png', 'v32 (local) — Pokémon GO : PC max, PvP, bonbons, régions, Métamorph (360 px)', [['g1360', '⑨ Évoli : PC max niv. 40 / 50 / 51 + PvP'], ['g2360', '⑩ Évoli : bonbons d’évolution groupés'], ['g3360', '⑪ Kangourex : exclusivité régionale'], ['g4360', '⑫ Métalosse : top 100 Ligue Master'], ['g5360', '⑫b Métamorph : déguisements actuels (icône + lien)'], ['g6360', '⑫c Métamorph : anciens déguisements par période']]);
await planche('planche-4-v32-categories.png', 'v32 (local) — catégories Méga-évolutions / Gigamax (360 px)', [['c1360', '⑬ Menu Catégorie : après Ultra-Chimères'], ['c2360', '⑭ Méga-évolutions (Formes désactivé)'], ['c3360', '⑮ Gigamax (+ Éthernatos Infinimax)'], ['c4360', '⑯ Rouge / Bleu : grisées']]);
await planche('planche-5-v32-bureau.png', 'v32 (local) — bureau 1000 px', [['d11000', 'Description Poképédia'], ['l11000', 'Lieux Évoli ÉV'], ['g11000', 'GO : PC max + PvP'], ['c21000', 'Méga-évolutions'], ['g51000', 'Métamorph : déguisements GO'], ['c11000', 'Menu Catégorie']], 2, 480);
console.log('errors', errs); await b.close();
