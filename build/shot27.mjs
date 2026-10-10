// v27 preview screenshots (360 px, real local build) + 3 contact sheets. Usage: node shot27.mjs [baseURL]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:8801/', OUT = '/workspace/pokedex/screenshots/v27/';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const sleep = ms => new Promise(r => setTimeout(r, ms)); const errs = []; const files = {};
const page = async (scheme = 'light') => { const p = await b.newPage(); p.on('pageerror', e => errs.push(e.message)); await p.setViewport({ width: 360, height: 780, deviceScaleFactor: 2, isMobile: true, hasTouch: true }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]); await p.goto(BASE, { waitUntil: 'networkidle0' }); await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: 'networkidle0' }); await sleep(400); return p; };
const shot = async (p, id, f, opt = {}) => { await sleep(450); await p.screenshot({ path: OUT + f, ...opt }); files[id] = OUT + f; console.log(OUT + f); };
const sheetSel = async (p, g) => { await p.select('#dgame', g); await sleep(700); };
{ const p = await page();
  await shot(p, 'grid', '01-barre-liste-vue-grille.png', { clip: { x: 0, y: 0, width: 360, height: 420 } });
  await p.click('#viewbtn'); await sleep(600); await shot(p, 'list', '02-barre-liste-vue-liste.png', { clip: { x: 0, y: 0, width: 360, height: 420 } }); await p.click('#viewbtn'); await sleep(400);
  await p.click('#catbtn'); await shot(p, 'cat1', '05-menu-categorie-haut.png');
  await p.evaluate(() => { document.querySelector('#catlist').scrollTop = 9999; }); await shot(p, 'cat2', '06-menu-categorie-bas.png'); await p.keyboard.press('Escape'); await sleep(300);
  await p.evaluate(() => { document.querySelector('#legend details').open = true; }); await shot(p, 'leg', '07-legende-liste.png');
  await p.select('#game', 'home'); await sleep(800); await p.evaluate(() => { document.querySelector('#legend details').open = true; }); await shot(p, 'legh', '08-legende-home-liste.png');
  await p.select('#game', ''); await sleep(500);
  await p.evaluate(async () => { const f = new File([JSON.stringify({ favs: [], caught: [], shiny: [] })], 'x.json', { type: 'application/json' }); const dt = new DataTransfer(); dt.items.add(f); const i = document.getElementById('import'); i.files = dt.files; i.dispatchEvent(new Event('change')); }); await sleep(300);
  await shot(p, 'msg', '09-message-sauvegarde-importee.png');
  await p.evaluate(async () => { const f = new File(['pas du json'], 'x.json', { type: 'application/json' }); const dt = new DataTransfer(); dt.items.add(f); const i = document.getElementById('import'); i.files = dt.files; i.dispatchEvent(new Event('change')); }); await sleep(300);
  await shot(p, 'msg2', '10-message-fichier-invalide.png');
  await p.select('#game', 'sw'); await sleep(900); await shot(p, 'cnt', '11-liste-epee-bouclier-compteur.png', { clip: { x: 0, y: 0, width: 360, height: 420 } });
  await p.select('#game', ''); await sleep(400);
  await p.goto(BASE + '#/p/25'); await sleep(1400); await sheetSel(p, 'sw');
  await p.evaluate(() => document.querySelector('#trackinfo').scrollIntoView({ block: 'center' })); await shot(p, 'sw', '12-fiche-suivi-epee-bouclier.png');
  await p.evaluate(() => document.querySelector('#dgamebtn').scrollIntoView({ block: 'center' })); await p.click('#dgamebtn'); await sleep(300);
  await p.evaluate(() => { const l = document.querySelector('#dgamelist'), o = l.querySelector('[data-v="swisle"]'); l.scrollTop = o.offsetTop - 160; }); await shot(p, 'menu', '13-fiche-menu-jeux.png'); await p.keyboard.press('Escape'); await sleep(300);
  await sheetSel(p, 'home'); await shot(p, 'home', '14-fiche-home-gen-iv-v.png');
  await p.close(); }
for (const scheme of ['light', 'dark']) { const p = await page(scheme);
  await p.goto(BASE + '#/p/25'); await sleep(1400); await sheetSel(p, 'la'); await p.click('#actbar .baron'); await sleep(400);
  await shot(p, 'baron-' + scheme, scheme === 'light' ? '03-fiche-legendes-arceus-baron-clair.png' : '04-fiche-legendes-arceus-baron-sombre.png');
  const r = await p.$eval('#actbar', e => { const x = e.getBoundingClientRect(); return { x: 0, y: x.top, width: 360, height: x.height }; });
  await shot(p, 'bar-' + scheme, scheme === 'light' ? '03b-barre-baron-clair-zoom.png' : '04b-barre-baron-sombre-zoom.png', { clip: r }); await p.close(); }
// contact sheets
const b64 = f => fs.readFileSync(f).toString('base64');
const planche = async (file, title, intro, cells) => { const p = await b.newPage(); await p.setViewport({ width: 800, height: 600, deviceScaleFactor: 2 });
  await p.setContent(`<html><body style="margin:0;padding:22px 20px;font:15px system-ui,'Noto Sans',sans-serif;background:#e9ebf1;color:#171a24"><h1 style="font-size:22px;margin:0 0 4px">${title}</h1><p style="margin:0 0 16px;color:#4a5266">${intro}</p><div style="display:grid;grid-template-columns:repeat(2,370px);gap:22px 20px">${cells.map(([id, cap]) => `<figure style="margin:0"><figcaption style="font-weight:700;margin:0 0 6px;font-size:15px;line-height:1.3">${cap}</figcaption><img style="width:370px;display:block;border-radius:12px;box-shadow:0 1px 8px rgba(0,0,0,.2)" src="data:image/png;base64,${b64(files[id])}"></figure>`).join('')}</div></body></html>`);
  await sleep(400); await p.setViewport({ width: 800, height: await p.evaluate(() => document.body.scrollHeight), deviceScaleFactor: 2 }); await p.screenshot({ path: OUT + file, fullPage: true }); await p.close(); console.log(OUT + file); };
await planche('planche-1-barre-et-menus.png', 'v27 — 1/3 · Barre de la liste et menu Catégorie', 'Nouvelle icône grille / liste (elle montre l’affichage obtenu en appuyant) · titres de blocs dans Catégorie.', [['grid', '① Vue grille : icône « liste avec vignettes »'], ['list', '② Vue liste : icône « 4 carrés »'], ['cat1', '③ Catégorie ouvert (haut) : Statut, Marques'], ['cat2', '④ Catégorie ouvert (bas) : HOME, Barons']]);
await planche('planche-2-baron-et-legende.png', 'v27 — 2/3 · Baron brun-rouge et légende en liste', 'Pikachu dans Légendes Arceus, Capturé + Baron cochés (B. shiny reste jaune) · légende : une icône + une phrase par ligne.', [['bar-light', '① Barre zoomée — mode clair'], ['bar-dark', '② Barre zoomée — mode sombre'], ['baron-light', '③ Fiche complète — mode clair'], ['baron-dark', '④ Fiche complète — mode sombre'], ['leg', '⑤ Légende des marques (vue de base)'], ['legh', '⑥ Légende des marques (Pokémon HOME)']]);
await planche('planche-3-messages-et-noms.png', 'v27 — 3/3 · Messages intégrés, noms de jeux, chiffres romains', 'Bandeau au lieu des fenêtres alert() · « / » espacé, noms complets, préfixes ÉV / ÉB · « Gén. IV–V ».', [['msg', '① Message : « Sauvegarde importée »'], ['msg2', '② Message d’erreur : fichier invalide'], ['sw', '③ Fiche : suivi « Épée / Bouclier » + « ÉB Isolarmure »'], ['menu', '④ Fiche : menu des jeux'], ['cnt', '⑤ Liste : compteur « Épée / Bouclier »'], ['home', '⑥ Fiche HOME : bouton « Gén. IV–V »']]);
console.log('errors', errs); await b.close();
