// v34 before (v33, port 8802) / after (v34, port 8801) screenshots at 360 px + contact sheet planche-v34.png. Usage: node shot34.mjs
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const OUT = '/workspace/pokedex/screenshots/v34/'; fs.mkdirSync(OUT, { recursive: true });
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const CASES = [
  ['arceus-feu', '493-fire', 'all', 'h2', /Faiblesses/],
  ['mordudor-go', '999-roaming', 'go', 'li', /Bonbons d’évolution|Pièces/],
  ['mordudor-go-coffre', '999', 'go', 'li', /Bonbons d’évolution|Pièces/],
  ['verpom-go', '840', 'go', 'li', /Bonbons d’évolution/],
  ['mmime-galar-go', '122-galar', 'go', 'h2', /Pokémon GO/],
  ['dracaufeu-za-lieux', '6', 'za', 'h2', /Où le trouver/],
  ['pikachu-rfvf-switch-lieux', '25', 'frlgsw', 'h2', /Où le trouver/],
  ['zygarde-10-nom', '718-10', 'all', 'h1', /Zygarde/],
  ['floette-eternelle', '670-eternal', 'all', 'h1', /Floette/],
];
async function shoot(port, tag) {
  const p = await b.newPage(); await p.setViewport({ width: 360, height: 780, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const U = `http://localhost:${port}/`; await p.goto(U, { waitUntil: 'networkidle0' });
  for (const [name, k, g, selr, re] of CASES) {
    await p.evaluate(g => { sheetPref = g; }, g); await p.goto(U + '#/p/' + k); await sleep(1600);
    const box = await p.evaluate((selr, re) => { const r = new RegExp(re); const el = [...document.querySelectorAll('#detail-view ' + selr)].find(e => r.test(e.textContent)); if (!el) return null; const bx = el.closest('section.box, .hero') || el; bx.scrollIntoView({ block: 'start' }); window.scrollBy(0, -60); return true; }, selr, re.source);
    await sleep(400); await p.screenshot({ path: `${OUT}${name}-${tag}.png` }); if (!box) console.log('pas trouvé', name, tag);
  }
  // lists: Let's Go count / Lépidonille forms
  for (const [name, game, q, forms] of [['letsgo-liste', 'lgpe', '', false], ['lepidonille-formes', '', 'lépidonille', true]]) {
    await p.goto(U + '#/'); await sleep(600); await p.select('#game', game); await sleep(900);
    await p.evaluate((q, f) => { state.forms = f; const i = document.querySelector('#q'); i.value = q; i.dispatchEvent(new Event('input')); }, q, forms); await sleep(700);
    await p.evaluate(() => window.scrollTo(0, 0)); await p.screenshot({ path: `${OUT}${name}-${tag}.png` });
    await p.evaluate(() => { const i = document.querySelector('#q'); i.value = ''; i.dispatchEvent(new Event('input')); state.forms = false; });
  }
  await p.close();
}
await shoot(8802, 'avant'); await shoot(8801, 'apres');
// contact sheet: avant | après per row, 360 px wide each, half height crop
const names = [...CASES.map(c => c[0]), 'letsgo-liste', 'lepidonille-formes'];
const p = await b.newPage(); await p.setViewport({ width: 760, height: 400, deviceScaleFactor: 1 });
const img = f => 'data:image/png;base64,' + fs.readFileSync(OUT + f).toString('base64');
await p.setContent(`<html><body style="margin:0;font:13px system-ui;background:#eee"><h1 style="font-size:16px;margin:8px">Pokédex v34 — avant (v33) / après (v34), 360 px</h1>${names.map(n => `<div style="display:flex;gap:8px;margin:8px"><figure style="margin:0;width:360px"><figcaption>${n} · avant</figcaption><div style="height:430px;overflow:hidden;border:1px solid #999"><img src="${img(n + '-avant.png')}" width="360"></div></figure><figure style="margin:0;width:360px"><figcaption>${n} · après</figcaption><div style="height:430px;overflow:hidden;border:1px solid #999"><img src="${img(n + '-apres.png')}" width="360"></div></figure></div>`).join('')}</body></html>`);
await sleep(500); await p.screenshot({ path: OUT + 'planche-v34.png', fullPage: true });
await b.close(); console.log('captures :', fs.readdirSync(OUT).length);
