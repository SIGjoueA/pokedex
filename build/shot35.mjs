// v35 before (v34, port 8803) / after (v35, port 8801) at 360 px: sheet titles of default forms + list with Formes. Contact sheet planche-v35.png.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const OUT = '/workspace/pokedex/screenshots/v35/'; fs.mkdirSync(OUT, { recursive: true });
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const SHEETS = [['nigirigon', '978'], ['deoxys', '386'], ['plumeline', '741'], ['ogerpon', '1017'], ['miaouss', '52']];
async function shoot(port, tag) {
  const p = await b.newPage(); await p.setViewport({ width: 360, height: 780, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const U = `http://localhost:${port}/`; await p.goto(U, { waitUntil: 'networkidle0' });
  for (const [n, k] of SHEETS) { await p.goto(U + '#/p/' + k); await sleep(1500); await p.evaluate(() => { const h = document.querySelector('.hero h1'); h.scrollIntoView({ block: 'center' }); }); await sleep(300); await p.screenshot({ path: `${OUT}${n}-${tag}.png` }); }
  await p.goto(U + '#/'); await sleep(600);
  await p.evaluate(() => { state.forms = true; const i = document.querySelector('#q'); i.value = 'nigirigon'; i.dispatchEvent(new Event('input')); }); await sleep(800);
  await p.evaluate(() => document.querySelector('#results').scrollIntoView()); await sleep(300); await p.screenshot({ path: `${OUT}liste-formes-${tag}.png` });
  const SPRK = [['prismillon-blizzard', '666-icy-snow'], ['vivaldaim-hiver', '585-winter'], ['zarbi-c', '201-c'], ['motisma-lavage', '479-wash'], ['flabebe-bleue', '669-blue']];
  for (const [n, k] of SPRK) { await p.goto(U + '#/p/' + k); await sleep(1600); if (tag === 'avant') { await p.click('.sprsw [data-spr="home"]'); await sleep(1800); } await p.evaluate(() => document.querySelector('#heroimg').scrollIntoView({ block: 'center' })); await sleep(300); await p.screenshot({ path: `${OUT}${n}-${tag}.png` }); }
  await p.goto(U + '#/'); await sleep(400); await p.evaluate(() => { state.forms = false; const i = document.querySelector('#q'); i.value = ''; i.dispatchEvent(new Event('input')); }); await sleep(1500);
  await p.evaluate(() => scrollTo(0, 0)); await p.screenshot({ path: `${OUT}grille-${tag}.png` });
  await p.click('#viewbtn'); await sleep(1200); await p.screenshot({ path: `${OUT}liste-${tag}.png` }); await p.click('#viewbtn'); await sleep(300);
  await p.close();
}
await shoot(8803, 'avant'); await shoot(8801, 'apres');
const names = [...SHEETS.map(s => s[0]), 'liste-formes', 'prismillon-blizzard', 'vivaldaim-hiver', 'zarbi-c', 'motisma-lavage', 'flabebe-bleue', 'grille', 'liste'];
const p = await b.newPage(); await p.setViewport({ width: 760, height: 400 });
const img = f => 'data:image/png;base64,' + fs.readFileSync(OUT + f).toString('base64');
await p.setContent(`<body style="margin:0;font:13px system-ui;background:#eee"><h1 style="font-size:16px;margin:8px">Pokédex v35 — nom de la forme par défaut, image HOME de chaque forme (avant = bouton HOME cliqué), HOME par défaut en grille / liste, avant (v34) / après (v35), 360 px</h1>${names.map(n => `<div style="display:flex;gap:8px;margin:8px">${['avant', 'apres'].map(t => `<figure style="margin:0;width:360px"><figcaption>${n} · ${t === 'apres' ? 'après' : t}</figcaption><div style="height:420px;overflow:hidden;border:1px solid #999"><img src="${img(`${n}-${t}.png`)}" width="360" style="margin-top:-180px"></div></figure>`).join('')}</div>`).join('')}</body>`);
await sleep(500); await p.screenshot({ path: OUT + 'planche-v35.png', fullPage: true }); await b.close(); console.log('ok');
