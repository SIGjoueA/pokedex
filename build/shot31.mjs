// v31 screenshots (360 px + 1000 px): shiny block, ability-aware weaknesses, base-form note, alternative sprites (on demand), description popups.
// Usage: node shot31.mjs [baseURL]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:8801/', OUT = '/workspace/pokedex/screenshots/v31/';
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms)); const errs = [], F = {};
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
async function page(w) { const p = await b.newPage(); p.on('pageerror', e => errs.push(e.message)); await p.setViewport(w < 700 ? { width: 360, height: 780, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { width: 1000, height: 800, deviceScaleFactor: 1 }); await p.goto(BASE, { waitUntil: 'networkidle0' }); return p; }
const shot = async (p, id, f) => { await sleep(450); await p.screenshot({ path: OUT + f }); F[id] = OUT + f; console.log(OUT + f); };
const open = async (p, k, g = 'all') => { await p.goto(BASE + '#/'); await sleep(300); await p.goto(BASE + '#/p/' + k); await sleep(1300); await p.select('#dgame', g); await sleep(900); };
const to = (p, sel, dy = -130) => p.evaluate((s, dy) => { const e = typeof s === 'string' && s.startsWith('h2:') ? [...document.querySelectorAll('.detail h2')].find(h => h.textContent.includes(s.slice(3))) : document.querySelector(s); e.scrollIntoView({ block: 'start' }); window.scrollBy(0, dy); }, sel, dy).then(() => sleep(350));
for (const w of [360, 1000]) {
  const p = await page(w), t = w + 'px';
  await open(p, '6', 'svdisk'); await to(p, '.shinybox'); await shot(p, 'sh1' + w, `01-shiny-dracaufeu-ev-disque-indigo-${t}.png`);
  await open(p, '25', 'lgpe'); await to(p, '.shinybox'); await shot(p, 'sh2' + w, `02-shiny-pikachu-lets-go-lock-partiel-${t}.png`);
  await open(p, '1007', 'sv'); await to(p, '.shinybox'); await shot(p, 'sh3' + w, `03-shiny-koraidon-shiny-lock-${t}.png`);
  await open(p, '6', 'hgss'); await to(p, '.shinybox'); await shot(p, 'sh4' + w, `04-shiny-dracaufeu-hgss-sans-charme-${t}.png`);
  await open(p, '479', 'dp'); await to(p, 'h2:Faiblesses'); await shot(p, 'ab1' + w, `05-faiblesses-motisma-levitation-${t}.png`);
  await open(p, '186', 'svmask'); await to(p, 'h2:Faiblesses'); await shot(p, 'ab2' + w, `06-faiblesses-tarpaud-absorb-eau-${t}.png`);
  await open(p, '52-galar'); await to(p, '.trackbox', -90); await shot(p, 'bn1' + w, `07-note-forme-miaouss-galar-${t}.png`);
  await open(p, '6-mega-x', 'xy'); await to(p, '.basenote', -200); await shot(p, 'bn2' + w, `08-note-forme-mega-dracaufeu-x-${t}.png`);
  for (const [i, m] of [['1', 'off'], ['2', 'home'], ['3', 'anim']]) { await open(p, '6'); if (m !== 'off') { await p.click(`[data-spr="${m}"]`); await p.waitForFunction(() => document.querySelector('#heroimg').complete && document.querySelector('#heroimg').naturalWidth > 0, { timeout: 10000 }).catch(() => {}); } await sleep(600); await shot(p, 'sp' + i + w, `09-sprites-${i}-${m === 'off' ? 'officiel' : m === 'home' ? 'home' : 'anime'}-${t}.png`); }
  await open(p, '6', 'xy'); await to(p, 'h2:Capacités', -60); await p.evaluate(() => { const b = [...document.querySelectorAll('.mv .dsc')].find(x => /Lance-Flammes|Flammèche/.test(x.textContent)); b.scrollIntoView({ block: 'center' }); window.scrollBy(0, -80); b.click(); }); await sleep(900); await shot(p, 'pp1' + w, `10-popup-attaque-${t}.png`);
  await open(p, '479', 'dp'); await to(p, 'h2:Talents', -120); await p.evaluate(() => document.querySelector('.ab .dsc').click()); await sleep(600); await shot(p, 'pp2' + w, `11-popup-talent-${t}.png`);
  await open(p, '25', 'bw'); await to(p, '.held', -120); await p.evaluate(() => document.querySelector('.held .dsc').click()); await sleep(900); await shot(p, 'pp3' + w, `12-popup-objet-tenu-${t}.png`);
  await p.goto(BASE + '#/'); await sleep(900); await p.click('#gamebtn'); await sleep(400); await shot(p, 'fr1' + w, `13-jeux-menu-rf-vf-switch-${t}.png`); await p.keyboard.press('Escape');
  await p.select('#game', 'frlgsw'); await sleep(900); await shot(p, 'fr2' + w, `14-liste-rf-vf-switch-kanto-151-${t}.png`);
  await open(p, '4', 'frlgsw'); await to(p, '.trackbox', -150); await shot(p, 'fr3' + w, `15-salameche-rf-vf-switch-transfere-gba-${t}.png`);
  await to(p, '.shinybox'); await shot(p, 'fr4' + w, `16-shiny-rf-vf-switch-${t}.png`);
  await open(p, '6'); await to(p, 'h2:Présent dans', -110); await shot(p, 'av1' + w, `17-present-dans-icones-jeux-${t}.png`);
  await p.close();
}
const b64 = f => fs.readFileSync(f).toString('base64');
const planche = async (file, title, cells, cols = 2, iw = 370) => { const q = await b.newPage(); await q.setViewport({ width: cols * (iw + 20) + 20, height: 600, deviceScaleFactor: 2 });
  await q.setContent(`<html><body style="margin:0;padding:22px 20px;font:15px system-ui,'Noto Sans',sans-serif;background:#e9ebf1;color:#171a24"><h1 style="font-size:22px;margin:0 0 14px">${title}</h1><div style="display:grid;grid-template-columns:repeat(${cols},${iw}px);gap:22px 20px;align-items:start">${cells.map(([id, cap]) => `<figure style="margin:0"><figcaption style="font-weight:700;margin:0 0 6px;line-height:1.3">${cap}</figcaption><img style="width:${iw}px;display:block;border-radius:12px;box-shadow:0 1px 8px rgba(0,0,0,.2)" src="data:image/png;base64,${b64(F[id])}"></figure>`).join('')}</div></body></html>`);
  await sleep(400); await q.setViewport({ width: cols * (iw + 20) + 20, height: await q.evaluate(() => document.body.scrollHeight), deviceScaleFactor: 2 }); await q.screenshot({ path: OUT + file, fullPage: true }); await q.close(); console.log(OUT + file); };
await planche('planche-1-v31-shiny.png', 'v31 (local) — bloc ✨ Shiny (360 px)', [['sh1360', '① Dracaufeu · ÉV Disque Indigo : méthodes, meilleure en vert'], ['sh2360', '② Pikachu · Let’s Go : verrou partiel (partenaire)'], ['sh3360', '③ Koraidon · Écarlate / Violet : SHINY LOCK'], ['sh4360', '④ Dracaufeu · HG/SS : pas de Charme Chroma']]);
await planche('planche-2-v31-faiblesses-forme.png', 'v31 (local) — faiblesses selon le talent, note de forme (360 px)', [['ab1360', '⑤ Motisma · Diamant / Perle : Lévitation (seul talent)'], ['ab2360', '⑥ Tarpaud · ÉV : Absorb-Eau (si le Pokémon l’a)'], ['bn1360', '⑦ Miaouss de Galar : forme régionale'], ['bn2360', '⑧ Méga-Dracaufeu X : Dracaufite X']]);
await planche('planche-3-v31-sprites-popups.png', 'v31 (local) — sprites à la demande, descriptions au toucher (360 px)', [['sp1360', '⑨ Officiel (hors-ligne)'], ['sp2360', '⑨ HOME (réseau, au toucher)'], ['sp3360', '⑨ Animé (réseau, au toucher)'], ['pp1360', '⑩ Attaque'], ['pp2360', '⑪ Talent'], ['pp3360', '⑫ Objet tenu']], 3, 300);
await planche('planche-5-v31-rf-vf-switch.png', 'v31 (local) — Rouge Feu / Vert Feuille (Switch), « Présent dans » (360 px)', [['fr1360', '⑬ Jeux : RF/VF (Switch) en tête de la section Switch'], ['fr2360', '⑭ Liste : Pokédex de Kanto (151)'], ['fr3360', '⑮ Salamèche : Capturé / Shiny + Transféré (marque GBA)'], ['fr4360', '⑯ Bloc Shiny RF/VF (Switch)'], ['av1360', '⑰ Présent dans : icône du jeu (couleurs du menu Jeux)'], ['av11000', '⑰ Présent dans · 1000 px']]);
await planche('planche-4-v31-bureau.png', 'v31 (local) — bureau 1000 px', [['sh11000', 'Shiny · Dracaufeu ÉV Disque Indigo'], ['ab11000', 'Faiblesses · Motisma'], ['sp21000', 'Sprite HOME'], ['pp11000', 'Popup attaque'], ['fr11000', 'Jeux · RF/VF (Switch)'], ['fr31000', 'Salamèche · RF/VF (Switch)']], 2, 480);
console.log('errors', errs); await b.close();
