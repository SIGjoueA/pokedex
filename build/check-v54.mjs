// v54 check: trade-only tiles (⇄ + tint) in a game / GO, « Échange requis » filter, sheet reason / indispo note,
// add window « Peut méga-évoluer » row (no overflow), GO order in #cfg / #cfw, Dex ☰ placed as in Collection / Pocket.
// Needs docs/ served on :8811. SHOTS=1 writes preview screenshots to screenshots/v54/.
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const BASE = 'http://localhost:8811/', SHOT = process.env.SHOTS === '1', DIR = new URL('../screenshots/v54/', import.meta.url).pathname;
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errs.push(m.text()); });
const sleep = ms => new Promise(r => setTimeout(r, ms)); let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const shot = async n => { if (SHOT) { fs.mkdirSync(DIR, { recursive: true }); await p.screenshot({ path: DIR + n }); } };
const ev = (sel, val) => p.evaluate((s, v) => { const el = document.querySelector(s); if (el.type === 'checkbox') el.checked = v; else el.value = v; el.dispatchEvent(new Event(el.tagName === 'INPUT' && el.type !== 'checkbox' ? 'input' : 'change', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, sel, val);
const game = async g => { await p.evaluate(g => { $('#game').value = g; $('#game').dispatchEvent(new Event('change')); }, g); await sleep(1500); };
await p.goto(BASE + '#/', { waitUntil: 'networkidle0' }); await sleep(600);
await p.evaluate(() => { localStorage.clear(); const S = (k, v) => localStorage.setItem(k, JSON.stringify(v)); S('imgsDoneF', true); S('seenV', 'v54'); });
await p.reload({ waitUntil: 'networkidle0' }); await sleep(1500);
ok(await p.evaluate(() => !!TRADE && TRADE.g.sw.length > 50 && TRADE.f.go.length > 0), 'trade.json loaded');
// ☰ in Dex: same rect as in Collection
const rect = () => p.evaluate(() => { const r = $('#menubtn').getBoundingClientRect(), s = $('#modeseg').getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(s.right), Math.round(s.top - r.top), Math.round(s.height - r.height)]; });
const rd = await rect(); await shot('4-dex-bouton-menu.png');
await p.click('#modeseg [data-m=col]'); await sleep(800); const rc = await rect();
await p.click('#modeseg [data-m=pk]'); await sleep(1200); const rp = await rect();
ok(rd.join() === rc.join() && rc.join() === rp.join() && rd[2] < rd[0] && !rd[3] && !rd[4], 'Dex ☰ at Collection / Pocket place ' + JSON.stringify([rd, rc, rp]));
await p.click('#modeseg [data-m=dex]'); await sleep(800);
// Épée / Bouclier: Pomdrapi / Dratatin
await game('sw');
let t = await p.evaluate(() => [...document.querySelectorAll('.card.trade')].map(a => a.getAttribute('href')));
ok(t.includes('#/p/841') && t.includes('#/p/842') && !t.includes('#/p/840'), 'sw: Pomdrapi + Dratatin tinted, Verpom not (' + t.length + ')');
ok(await p.evaluate(() => !!document.querySelector('.card.trade .trk')), '⇄ icon on tile');
ok(await p.evaluate(() => getComputedStyle($('.card.trade')).backgroundImage.includes('gradient')), 'distinct background');
await ev('#cat', 'trade'); await sleep(600);
let n = await p.evaluate(() => [...document.querySelectorAll('#results .card')].length), all = await p.evaluate(() => document.querySelectorAll('#results .card:not(.trade)').length);
ok(n > 20 && all === 0, `Échange requis filter: ${n} cards, all tinted`);
await p.evaluate(() => scrollTo(0, 0)); await shot('1-dex-epee-echanges.png');
{ const c = await p.evaluate(() => { const o = [...$('#cat').options].map(o => o.textContent), i = o.indexOf('⇄ Échange requis'); return [o[i - 1], o[i + 1], i, o.length]; }); console.log('INFO cat around trade: ' + JSON.stringify(c)); }
// headless Chrome cannot capture a native <select> popup: draw its options as an overlay list instead
await p.evaluate(() => { const r = $('#cat').getBoundingClientRect(), d = document.createElement('div'); d.id = 'catshot';
  d.style.cssText = `position:fixed;left:${r.left}px;top:${r.bottom + 4}px;width:300px;z-index:99;background:var(--bg2);border:1px solid var(--line);border-radius:12px;box-shadow:0 8px 30px #0004;padding:4px 0;font-size:14px`;
  d.innerHTML = [...$('#cat').options].map(o => `<div style="padding:5px 12px;${o.selected ? 'background:var(--accent);color:var(--accent-fg);font-weight:700' : ''}${o.disabled ? ';opacity:.4' : ''}">${o.textContent}</div>`).join(''); document.body.appendChild(d); });
await shot('5-menu-categorie.png'); await p.evaluate(() => $('#catshot').remove());
await ev('#cat', ''); await sleep(400);
// Soleil / Lune: Goupix d'Alola only via regional representative
await game('sm');
t = await p.evaluate(() => [...document.querySelectorAll('.card.trade')].map(a => a.getAttribute('href')));
ok(t.includes('#/p/37-alola') && t.includes('#/p/27-alola') && !t.includes('#/p/75-alola') && !t.includes('#/p/37'), 'sm: Goupix / Sabelette d’Alola tinted (one per version), Gravalanch not');
await p.goto(BASE + '#/p/37-alola', { waitUntil: 'networkidle0' }); await sleep(1200);
await p.select('#dgame', 'sm'); await sleep(1500);
let tx = await p.evaluate(() => $('.tradebox') ? $('.tradebox').innerText : '');
ok(/Échange requis/.test(tx) && /Soleil/.test(tx), 'sm sheet line: ' + tx.replace(/\n/g, ' · '));
// NPC row names the Pokémon asked for
await p.select('#dgame', 'usum').catch(() => {}); await sleep(800);
await p.goto(BASE + '#/p/122', { waitUntil: 'networkidle0' }); await sleep(1000); await p.select('#dgame', 'rb'); await sleep(1500);
tx = await p.evaluate(() => $('.tradebox') ? $('.tradebox').innerText : '');
ok(/PNJ contre Abra/.test(tx), 'rb M. Mime: ' + tx.replace(/\n/g, ' · '));
await p.goto(BASE + '#/p/842', { waitUntil: 'networkidle0' }); await sleep(1000); await p.select('#dgame', 'sw'); await sleep(1500);
tx = await p.evaluate(() => $('.tradebox') ? $('.tradebox').innerText : '');
ok(/Pomme Sucrée/.test(tx), 'sw Dratatin: ' + tx.replace(/\n/g, ' · '));
await p.evaluate(() => scrollTo(0, 0)); await shot('2-fiche-raison.png');
// Indispo note (Mew in Rouge / Bleu)
await p.goto(BASE + '#/p/151', { waitUntil: 'networkidle0' }); await sleep(1000); await p.select('#dgame', 'rb'); await sleep(1500);
tx = await p.evaluate(() => $('.tradebox.indispo') ? $('.tradebox.indispo').innerText : '');
ok(/Indisponible/.test(tx), 'rb Mew note: ' + tx.replace(/\n/g, ' · '));
// GO
await p.goto(BASE + '#/', { waitUntil: 'networkidle0' }); await sleep(800); await game('go');
let g = await p.evaluate(() => ({ t: document.querySelectorAll('.card.trade').length, o: document.querySelectorAll('.card.tradeo').length }));
ok(g.t > 20 && g.o > 0, 'GO: required + optional tiles ' + JSON.stringify(g));
await game('');
ok(await p.evaluate(() => !document.querySelector('.card.trade, .card.tradeo') && $('#cat option[value=trade]').disabled), 'Tous les jeux: no tint, filter disabled');
// Add window: GO order + Méga row on phone
await p.click('.card .cadd'); await sleep(400);
let o = await p.evaluate(() => ({ g: [...$('#cfg').options].map(o => o.value).slice(0, 2), w: [...$('#cfw').options].map(o => o.value).slice(0, 3) }));
ok(o.g.join() === ',go' && o.w.join() === ',home,go', 'GO first in #cfg, under HOME in #cfw ' + JSON.stringify(o));
await p.evaluate(() => $('#colx').click()); await sleep(300);
await p.goto(BASE + '#/p/6', { waitUntil: 'networkidle0' }); await sleep(1000);
await p.evaluate(() => { const b = document.querySelector('[data-add]'); b && b.click(); }); await sleep(500);
await ev('#cfg', ''); await sleep(300);
await p.evaluate(() => { for (const id of ['cfbnw', 'cfgxw', 'cfmgw', 'cfmgv']) $('#' + id).hidden = false; });
let ov = await p.evaluate(() => { const f = $('#colform').getBoundingClientRect(); return [...document.querySelectorAll('.cfx > *')].map(e => Math.round(e.getBoundingClientRect().right - f.right)); });
ok(ov.every(x => x <= 1), 'Méga row fits (right overflow ' + ov.join(',') + ')');
await p.evaluate(() => $('#cfmgw').scrollIntoView({ block: 'center' })); await sleep(200); await shot('3-ajout-mega.png');
await p.evaluate(() => $('#cfl').scrollIntoView({ block: 'center' })); await sleep(200);
{ const r = await p.evaluate(() => { const g = s => $(s).getBoundingClientRect(), a = g('#cfl'), d = g('#cfcd'), la = $('#cfl').closest('label').getBoundingClientRect(), ld = $('#cfcd').closest('label').getBoundingClientRect(); return [a.top - d.top, a.height - d.height, la.top - ld.top]; });
  ok(r.every(x => Math.abs(x) < 1), 'Lieu / Date aligned (Δtop, Δheight, Δlabel) ' + r.map(Math.round)); }
await shot('6-lieu-date.png');
ok(!errs.length, 'no page errors ' + errs.join(' | '));
await b.close(); console.log(fails ? `${fails} FAIL` : 'ALL PASS'); process.exit(fails ? 1 : 0);
