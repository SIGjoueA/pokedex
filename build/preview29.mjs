// v29 screenshots (360 px): implemented items (cries, reproduction & capture, held items) + PREVIEW mockups injected in the page
// (2 ability caveats on weaknesses, 5 base-form note, 6 alternative sprites, 7 FR description popups). Mockups are NOT in the app.
// Usage: node preview29.mjs [baseURL]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:8801/', OUT = '/workspace/pokedex/screenshots/v29/';
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms)); const F = {}; const errs = [];
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage(); p.on('pageerror', e => errs.push(e.message));
await p.setViewport({ width: 360, height: 780, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await p.goto(BASE, { waitUntil: 'networkidle0' }); await sleep(600);
const shot = async (id, f) => { await sleep(500); await p.screenshot({ path: OUT + f }); F[id] = OUT + f; console.log(OUT + f); };
const open = async (k, game) => { await p.goto(BASE + '#/p/' + k); await sleep(1300); if (game) { await p.select('#dgame', game); await sleep(900); } };
const to = async (sel, dy = -70) => { await p.evaluate((s, dy) => { const e = document.querySelector(s); e.scrollIntoView({ block: 'start' }); window.scrollBy(0, dy); }, sel, dy); await sleep(400); };
// ---- implemented
await open('6'); await p.evaluate(() => document.querySelector('.hero .cry').classList.add('on')); await shot('cry', 'i1-cri-dracaufeu.png');
await to('.breed', -120); await shot('breed', 'i2-reproduction-dracaufeu.png');
await open('25', 'bw'); await to('.held', -80); await shot('held', 'i3-objets-tenus-pikachu-nb.png');
// ---- (2) ability caveats on the weaknesses box (Motisma, Lévitation)
await open('479', 'dp'); await p.evaluate(() => {
  const h = [...document.querySelectorAll('.detail > section h2')].find(x => /Faiblesses/.test(x.textContent)); const s = h.parentElement;
  const sol = [...s.querySelectorAll('.eff.w .badge')].find(a => a.dataset.type === 'ground'); if (sol) { sol.style.opacity = '.45'; sol.style.textDecoration = 'line-through'; sol.insertAdjacentHTML('afterend', '<sup style="font-weight:700;color:#7b5cd6">*</sup>'); }
  s.querySelector('#effnote').insertAdjacentHTML('beforebegin', '<div style="margin:12px 0 4px;padding:10px 12px;border-radius:12px;background:rgba(123,92,214,.10);border:1px solid rgba(123,92,214,.35);font-size:14px;line-height:1.4"><b>* Talent Lévitation</b> : immunisé contre <b>Sol</b> (×0). Sans ce talent (Motisma n’en a qu’un) la faiblesse s’appliquerait.<br><span style="color:var(--mute);font-size:13px">Autres talents pris en compte : Absorb Eau / Lavabouche (Eau ×0), Absorb Volt / Paratonnerre / Motorisé (Électrik ×0), Torche / Torche Dure (Feu ×0), Herbivore (Plante ×0), Isograisse (Feu, Glace ×0,5), Ignifugé (Feu ×0,5)…</span></div>');
  s.scrollIntoView({ block: 'start' }); window.scrollBy(0, -70); }); await shot('p2', 'p2-faiblesses-talents-motisma.png');
// ---- (5) base-form note on a linked form
await open('6-mega-x', 'xy'); await p.evaluate(() => {
  const t = document.querySelector('.trackbox'); t.insertAdjacentHTML('afterend', '<section class="box" style="border-left:4px solid var(--accent)"><h2 style="margin-bottom:6px">Forme de Dracaufeu</h2><p style="margin:0;font-size:14px;line-height:1.45"><b>Méga-Évolution</b> de <a href="#/p/6">Dracaufeu</a> (Dracaufite X, en combat). Description, reproduction, évolutions, lieux et objets tenus = ceux de l’espèce : voir la <a href="#/p/6">fiche de Dracaufeu</a>. Sur cette fiche : stats, types, talent et attaques propres à la Méga.</p></section>');
  document.querySelector('.trackbox').scrollIntoView({ block: 'start' }); window.scrollBy(0, -70); }); await shot('p5', 'p5-note-forme-de-base.png');
// ---- (6) alternative sprites (official / HOME / animated)
const S = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';
for (const [i, [lab, src, px]] of [['Officiel', null], ['HOME', S + 'other/home/6.png'], ['Animé', S + 'versions/generation-v/black-white/animated/6.gif', 1]].entries()) {
  await p.goto(BASE + '#/'); await sleep(500); await open('6'); await p.evaluate((i, src, px) => {
    const img = document.querySelector('#heroimg');
    if (src) { img.src = src; if (px) { img.style.imageRendering = 'pixelated'; img.style.width = '192px'; img.style.height = '192px'; img.style.margin = '32px auto'; } }
    img.insertAdjacentHTML('afterend', `<div style="display:inline-flex;margin:4px auto 6px;border-radius:12px;background:rgba(0,0,0,.28);padding:3px;gap:2px">${['Officiel', 'HOME', 'Animé'].map((l, j) => `<span style="padding:6px 12px;border-radius:9px;font-size:13px;font-weight:600;${j === i ? 'background:#fff;color:#14161e' : 'color:#fff'}">${l}</span>`).join('')}</div>`);
  }, i, src, px || 0); await p.waitForFunction(() => document.querySelector('#heroimg').complete, { timeout: 8000 }).catch(() => {}); await shot('p6' + i, `p6-sprites-${i + 1}-${lab.toLowerCase()}.png`);
}
// ---- (7) FR descriptions as tap popups (moves + abilities)
await open('6', 'xy'); await p.evaluate(() => {
  const mv = [...document.querySelectorAll('.mv')].find(m => /Lance-Flammes/.test(m.textContent));
  [...document.querySelectorAll('.mv .mn b')].slice(0, 30).forEach(x => x.insertAdjacentHTML('beforeend', ' <span style="color:var(--mute);font-weight:500">ⓘ</span>'));
  if (mv) { mv.style.position = 'relative'; mv.insertAdjacentHTML('beforeend', '<div style="position:absolute;left:0;right:0;top:calc(100% + 6px);z-index:5;background:var(--card,#fff);border:1px solid var(--line);border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,.25);padding:10px 12px;font-size:14px;line-height:1.4;text-align:left"><b>Lance-Flammes</b><br>L’ennemi reçoit un torrent de flammes. Peut aussi le brûler.<br><span style="color:var(--mute);font-size:13px">Spéciale · Puissance 90 · Précision 100 · PP 15 (texte officiel FR, PokéAPI)</span></div>'); mv.scrollIntoView({ block: 'center' }); window.scrollBy(0, 60); }
}); await shot('p7', 'p7-popup-attaque.png');
await open('479', 'dp'); await p.evaluate(() => {
  const ab = document.querySelector('.ab'); if (!ab) return; const d = ab.querySelector('.mute'); if (d) d.style.display = 'none';
  ab.querySelector('b').insertAdjacentHTML('beforeend', ' <span style="color:var(--mute);font-weight:500">ⓘ</span>');
  ab.style.position = 'relative'; ab.insertAdjacentHTML('beforeend', '<div style="position:absolute;left:0;right:0;top:calc(100% + 4px);z-index:5;background:var(--card,#fff);border:1px solid var(--line);border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,.25);padding:10px 12px;font-size:14px;line-height:1.4"><b>Lévitation</b><br>Le Pokémon flotte, ce qui l’immunise contre les capacités de type Sol.</div>');
  ab.scrollIntoView({ block: 'start' }); window.scrollBy(0, -140); }); await shot('p7b', 'p7-popup-talent.png');
// ---- contact sheets
const b64 = f => fs.readFileSync(f).toString('base64');
const planche = async (file, title, intro, cells) => { const q = await b.newPage(); await q.setViewport({ width: 800, height: 600, deviceScaleFactor: 2 });
  await q.setContent(`<html><body style="margin:0;padding:22px 20px;font:15px system-ui,'Noto Sans',sans-serif;background:#e9ebf1;color:#171a24"><h1 style="font-size:22px;margin:0 0 4px">${title}</h1><p style="margin:0 0 16px;color:#4a5266">${intro}</p><div style="display:grid;grid-template-columns:repeat(2,370px);gap:22px 20px">${cells.map(([id, cap]) => `<figure style="margin:0"><figcaption style="font-weight:700;margin:0 0 6px;line-height:1.3">${cap}</figcaption><img style="width:370px;display:block;border-radius:12px;box-shadow:0 1px 8px rgba(0,0,0,.2)" src="data:image/png;base64,${b64(F[id])}"></figure>`).join('')}</div></body></html>`);
  await sleep(400); await q.setViewport({ width: 800, height: await q.evaluate(() => document.body.scrollHeight), deviceScaleFactor: 2 }); await q.screenshot({ path: OUT + file, fullPage: true }); await q.close(); console.log(OUT + file); };
await planche('planche-1-v29-implemente.png', 'v29 (local) — implémenté', 'Cris 🔊 (actuel + ancien), bloc « Reproduction & capture » après les stats, objets tenus sauvages par jeu juste avant les rencontres.', [['cry', '① Cris dans l’en-tête : « Cri » (actuel) et « Ancien » (cri d’origine)'], ['breed', '③ Reproduction & capture (vue d’ensemble)'], ['held', '④ Objets tenus sauvages — Pikachu, Noir / Blanc']]);
await planche('planche-2-v29-apercus.png', 'v29 — aperçus (maquettes, pas dans l’app)', 'Maquettes injectées dans la vraie page à 360 px.', [['p2', '② Faiblesses + talents (Motisma, Lévitation)'], ['p5', '⑤ Note « forme de base » sur une forme liée'], ['p7', '⑦ Description FR d’une attaque (toucher ⓘ)'], ['p7b', '⑦ Description FR d’un talent (toucher ⓘ)']]);
await planche('planche-3-v29-sprites.png', 'v29 — aperçu ⑥ : autres sprites dans l’en-tête', 'Sélecteur Officiel / HOME / Animé (Noir / Blanc animé ; Showdown possible). Maquette.', [['p60', 'Officiel (actuel)'], ['p61', 'Rendu HOME'], ['p62', 'Sprite animé Gén. V']]);
console.log('errors', errs); await b.close();
