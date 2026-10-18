// v27 previews (mock only, nothing implemented): grid/list icon, Baron checked colour, Catégorie headings. Usage: node preview27.mjs [baseURL]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:8801/', OUT = '/workspace/pokedex/screenshots/preview27/';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const errs = [];
const mkp = async (scheme = 'light') => { const p = await b.newPage(); p.on('pageerror', e => errs.push(e.message)); await p.setViewport({ width: 360, height: 780, deviceScaleFactor: 2, isMobile: true, hasTouch: true }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]); return p; };
const clip = async (p, sel, pad = 0) => { const r = await p.$eval(sel, e => { const x = e.getBoundingClientRect(); return { x: x.left, y: x.top, width: x.width, height: x.height }; }); return (await p.screenshot({ clip: { x: Math.max(0, r.x - pad), y: Math.max(0, r.y - pad), width: Math.min(360, r.width + 2 * pad), height: r.height + 2 * pad }, encoding: 'base64' })); };
const compose = async (file, title, cols, cells, note = '') => { // cells: [{label, img}]
  const p = await b.newPage(); await p.setViewport({ width: 360 * cols + 24 * (cols + 1), height: 400, deviceScaleFactor: 2 });
  await p.setContent(`<html><body style="margin:0;padding:16px 24px;font:14px system-ui,sans-serif;background:#e9ebf1;color:#171a24"><h1 style="font-size:17px;margin:0 0 4px">${title}</h1>${note ? `<p style="margin:0 0 12px;color:#5d667c">${note}</p>` : ''}<div style="display:grid;grid-template-columns:repeat(${cols},360px);gap:16px 24px">${cells.map(c => `<figure style="margin:0"><figcaption style="font-weight:700;margin:0 0 6px">${c.label}</figcaption><img style="width:360px;display:block;border-radius:10px;box-shadow:0 1px 6px rgba(0,0,0,.18)" src="data:image/png;base64,${c.img}"></figure>`).join('')}</div></body></html>`);
  await sleep(300); const h = await p.evaluate(() => document.body.scrollHeight); await p.setViewport({ width: 360 * cols + 24 * (cols + 1), height: h, deviceScaleFactor: 2 });
  await p.screenshot({ path: OUT + file, fullPage: true }); await p.close(); console.log(OUT + file);
};
const GRID_SVG = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="currentColor"><rect x="3" y="3" width="7.5" height="7.5" rx="1.8"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.8"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.8"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.8"/></svg>';
const LIST_SVG = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="currentColor"><rect x="3" y="4" width="5" height="4.5" rx="1.2"/><rect x="10" y="5.25" width="11" height="2" rx="1"/><rect x="3" y="9.75" width="5" height="4.5" rx="1.2"/><rect x="10" y="11" width="11" height="2" rx="1"/><rect x="3" y="15.5" width="5" height="4.5" rx="1.2"/><rect x="10" y="16.75" width="11" height="2" rx="1"/></svg>';

// 1) Grid / list icon
{ const p = await mkp('light'); await p.goto(BASE, { waitUntil: 'networkidle0' }); await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: 'networkidle0' }); await sleep(500);
  const top = async () => (await p.screenshot({ clip: { x: 0, y: 0, width: 360, height: 280 }, encoding: 'base64' }));
  const a = await top(); await p.evaluate(s => { document.querySelector('#viewbtn').innerHTML = s; }, LIST_SVG); const a2 = await top();
  await p.click('#viewbtn'); await sleep(600); const c = await top(); await p.evaluate(s => { document.querySelector('#viewbtn').innerHTML = s; }, GRID_SVG); const c2 = await top();
  await p.close();
  await compose('v27-apercu-bouton-grille-liste-360.png', 'Bouton grille / liste — actuel vs proposé (360 px)', 2, [
    { label: 'Actuel — en grille (☰ = passer en liste)', img: a }, { label: 'Proposé — en grille (icône « liste »)', img: a2 },
    { label: 'Actuel — en liste (▦ = passer en grille)', img: c }, { label: 'Proposé — en liste (icône « grille »)', img: c2 }],
    'L’icône montre l’affichage que l’on obtient en appuyant. La proposition remplace ☰ (qui ressemble à un menu) par une liste avec vignettes.'); }

// 2) Baron checked colour (light + dark)
const BROWN = `.act.baron[aria-pressed=true]{color:#8a3b12!important;border-color:#a0522d!important;background:rgba(160,82,45,.13)!important}
@media (prefers-color-scheme:dark){.act.baron[aria-pressed=true]{color:#e8a477!important;border-color:#c46a3c!important;background:rgba(196,106,60,.18)!important}}`;
{ const cells = [];
  for (const scheme of ['light', 'dark']) {
    const p = await mkp(scheme); await p.goto(BASE, { waitUntil: 'networkidle0' }); await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: 'networkidle0' });
    await p.goto(BASE + '#/p/25'); await sleep(1200); await p.select('#dgame', 'la'); await sleep(600);
    await p.evaluate(() => { const bt = document.querySelector('#actbar .baron'); if (bt) bt.click(); }); await sleep(500);
    const cur = await clip(p, '#actbar'); await p.addStyleTag({ content: BROWN }); await sleep(200); const prop = await clip(p, '#actbar');
    const lab = scheme === 'light' ? 'mode clair' : 'mode sombre';
    cells.push({ label: `Actuel (${lab}) — Baron coché = rouge, comme Capturé`, img: cur }, { label: `Proposé (${lab}) — Baron coché = brun-rouge`, img: prop });
    await p.close();
  }
  await compose('v27-apercu-baron-brun-rouge-360.png', 'Couleur de « Baron » coché — actuel vs brun-rouge (Pikachu, Légendes Arceus, 360 px)', 2, cells, 'Capturé et Baron cochés. Baron shiny reste jaune comme Shiny.'); }

// 3) Catégorie headings
{ const cells = [];
  const p = await mkp('light'); await p.goto(BASE, { waitUntil: 'networkidle0' }); await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: 'networkidle0' }); await sleep(500);
  const open = async (scroll) => { await p.click('#catbtn'); await sleep(400); if (scroll) await p.evaluate(s => { document.querySelector('#catlist').scrollTop = s; }, scroll); await sleep(300); const i = await p.screenshot({ encoding: 'base64' }); await p.keyboard.press('Escape'); await sleep(300); return i; };
  const c1 = await open(0), c2 = await open(9999);
  await p.evaluate(() => { const H = { leg: 'Statut', caught: 'Marques', trans: 'HOME', baron: 'Barons' }; MENUS.cat.cfg.sep = v => H[v] ? ['h', H[v]] : v === 'swdone' ? 'sep' : ''; buildMenu(MENUS.cat); });
  const p1 = await open(0), p2 = await open(9999); await p.close();
  await compose('v27-apercu-categorie-titres-360.png', 'Menu Catégorie — séparateurs actuels vs titres de blocs (360 px)', 2, [
    { label: 'Actuel — haut du menu', img: c1 }, { label: 'Proposé — titres Statut / Marques / HOME / Barons', img: p1 },
    { label: 'Actuel — bas du menu', img: c2 }, { label: 'Proposé — bas du menu', img: p2 }],
    'Mêmes titres que les séparateurs du menu Jeux (SWITCH, 3DS…). Le trait simple entre « Shiny » et « Complétés » est conservé.'); }
console.log('errors', errs); await b.close();
