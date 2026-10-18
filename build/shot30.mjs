// v30 screenshots: sticky sheet game selector, game menu with regional numbers / order, « Présent dans » on the overview only.
// Usage: node shot30.mjs [baseURL] [outDir]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:8801/', OUT = process.argv[3] || '/workspace/pokedex/screenshots/v30/';
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms)); const errs = [], F = {};
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage(); p.on('pageerror', e => errs.push(e.message));
await p.setViewport({ width: 360, height: 780, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await p.goto(BASE, { waitUntil: 'networkidle0' }); await sleep(500);
const shot = async (id, f, page = p) => { await sleep(450); await page.screenshot({ path: OUT + f }); F[id] = OUT + f; console.log(OUT + f); };
const open = async (k, game = 'all') => { await p.goto(BASE + '#/'); await sleep(300); await p.goto(BASE + '#/p/' + k); await sleep(1300); { await p.select('#dgame', game); await sleep(900); } };
// 1 sheet scrolled down, sticky selector visible (Écarlate / Violet)
await open('6', 'sw'); await p.evaluate(() => window.scrollTo(0, 1500)); await shot('sticky', '01-fiche-defilee-selecteur-collant.png');
// 2 game menu open (top)
await open('6'); await p.click('#dgamebtn'); await sleep(400); await shot('menutop', '02-menu-jeux-haut.png');
// 3 menu around Hors dex / Méga-Dex (Mewtwo: Méga-Dex above Méga-Dimension; Électhor 145: Hors dex ÉV above Disque Indigo)
await open('150'); await p.click('#dgamebtn'); await sleep(300); await shot('menumega', '03-menu-mega-dex-mewtwo.png');
await open('145'); await p.click('#dgamebtn'); await sleep(300);
await p.evaluate(() => { const l = document.querySelector('#dgamelist'), li = l.querySelector('[data-v="svhors"]'); if (li) l.scrollTop = li.offsetTop - 120; }); await shot('menuhors', '04-menu-hors-dex-electhor.png');
// 5 overview with Présent dans / 6 game sheet without it
await open('6'); await p.evaluate(() => { const h = [...document.querySelectorAll('.detail > section h2')].find(x => /Présent dans/.test(x.textContent)); h.scrollIntoView({ block: 'start' }); window.scrollBy(0, -130); }); await shot('ov', '05-vue-ensemble-present-dans.png');
await open('6', 'sw'); await p.evaluate(() => { const h = [...document.querySelectorAll('.detail > section h2')].find(x => /Où le trouver/.test(x.textContent)); h.scrollIntoView({ block: 'start' }); window.scrollBy(0, -130); }); await shot('gs', '06-fiche-jeu-sans-present-dans.png');
// 7 desktop 1000 px
const d = await b.newPage(); await d.setViewport({ width: 1000, height: 800, deviceScaleFactor: 1 });
await d.goto(BASE + '#/p/6', { waitUntil: 'networkidle0' }); await sleep(1200); await d.select('#dgame', 'sw'); await sleep(900); await d.evaluate(() => window.scrollTo(0, 1400)); await shot('desk', '07-bureau-1000px-selecteur-collant.png', d);
// 8 update banner: simulated version bump on a copy of docs/ served on 8812
{ const path = await import('node:path'), { spawn } = await import('node:child_process');
  const DOCS = '/workspace/pokedex/docs', TMP = '/tmp/pdx-shot30', U = 'http://localhost:8812/';
  fs.rmSync(TMP, { recursive: true, force: true }); fs.mkdirSync(TMP);
  for (const f of fs.readdirSync(DOCS)) if (f !== 'sw.js') fs.symlinkSync(path.join(DOCS, f), path.join(TMP, f));
  const sw0 = fs.readFileSync(path.join(DOCS, 'sw.js'), 'utf8'); fs.writeFileSync(path.join(TMP, 'sw.js'), sw0);
  const srv = spawn('python3', ['-m', 'http.server', '8812', '--directory', TMP], { stdio: 'ignore' }); await sleep(1200);
  const ctx = await b.createBrowserContext();
  for (const [w, h, mob, id, f] of [[360, 780, true, 'upd', '08-banniere-mise-a-jour-360.png'], [1000, 800, false, 'upd2', '09-banniere-mise-a-jour-1000.png']]) {
    const q = await ctx.newPage(); await q.setViewport({ width: w, height: h, deviceScaleFactor: mob ? 2 : 1, isMobile: mob, hasTouch: mob });
    fs.writeFileSync(path.join(TMP, 'sw.js'), sw0);
    await q.goto(U + '#/p/25', { waitUntil: 'networkidle0' }); await q.evaluate(() => navigator.serviceWorker.ready); await sleep(1200);
    fs.writeFileSync(path.join(TMP, 'sw.js'), sw0.replace(/const VERSION = '[^']+'/, `const VERSION = 'v31'`));
    await q.reload({ waitUntil: 'networkidle0' }); await q.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    for (let i = 0; i < 20; i++) { if (await q.evaluate(() => !!document.querySelector('#upd.on'))) break; await sleep(500); }
    await shot(id, f, q);
    if (w === 360) { await q.click('#upd .updgo'); await sleep(3500); } await q.close();
  }
  await ctx.close(); srv.kill(); fs.rmSync(TMP, { recursive: true, force: true });
}
const b64 = f => fs.readFileSync(f).toString('base64');
const planche = async (file, title, cells) => { const q = await b.newPage(); await q.setViewport({ width: 800, height: 600, deviceScaleFactor: 2 });
  await q.setContent(`<html><body style="margin:0;padding:22px 20px;font:15px system-ui,'Noto Sans',sans-serif;background:#e9ebf1;color:#171a24"><h1 style="font-size:22px;margin:0 0 14px">${title}</h1><div style="display:grid;grid-template-columns:repeat(2,370px);gap:22px 20px">${cells.map(([id, cap]) => `<figure style="margin:0"><figcaption style="font-weight:700;margin:0 0 6px;line-height:1.3">${cap}</figcaption><img style="width:370px;display:block;border-radius:12px;box-shadow:0 1px 8px rgba(0,0,0,.2)" src="data:image/png;base64,${b64(F[id])}"></figure>`).join('')}</div></body></html>`);
  await sleep(400); await q.setViewport({ width: 800, height: await q.evaluate(() => document.body.scrollHeight), deviceScaleFactor: 2 }); await q.screenshot({ path: OUT + file, fullPage: true }); await q.close(); console.log(OUT + file); };
await planche('planche-1-v30.png', 'v30 (local) — sélecteur de jeu collant et menu', [['sticky', '① Fiche défilée : sélecteur de jeu collant sous ← ‹ › ★'], ['menutop', '② Menu de la fiche : même ordre que « Jeux », numéros régionaux'], ['menumega', '③ Mewtwo : Méga-Dex au-dessus de Méga-Dimension'], ['menuhors', '④ Électhor : Hors dex ÉV au-dessus du Disque Indigo']]);
await planche('planche-2-v30.png', 'v30 (local) — « Présent dans » seulement en vue d’ensemble', [['ov', '⑤ Vue d’ensemble : « Présent dans » (inchangé)'], ['gs', '⑥ Fiche Épée / Bouclier : plus de « Présent dans »']]);
await planche('planche-3-v30.png', 'v30 (local) — invite de mise à jour (version simulée « v31 »)', [['upd', '⑦ Mobile : « Nouvelle version disponible » + Mettre à jour'], ['desk', '⑧ Bureau 1000 px : sélecteur de jeu collant']]);
console.log('errors', errs); await b.close();
