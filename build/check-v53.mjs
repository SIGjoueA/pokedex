// v53 check: Collection fields (Ball, lieu, date), Méga (X/Y choice, narrowing), overview search / filters / sort. Needs docs/ served on :8811.
// SHOTS=1 writes preview screenshots to screenshots/v53/.
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const BASE = 'http://localhost:8811/', SHOT = process.env.SHOTS === '1', DIR = new URL('../screenshots/v53/', import.meta.url).pathname;
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errs.push(m.text()); });
const sleep = ms => new Promise(r => setTimeout(r, ms)); let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const shot = async n => { if (SHOT) { fs.mkdirSync(DIR, { recursive: true }); await p.screenshot({ path: DIR + n }); } };
const L = k => p.evaluate(k => JSON.parse(localStorage.getItem(k) || 'null'), k);
const ev = (sel, val) => p.evaluate((s, v) => { const el = document.querySelector(s); if (el.type === 'checkbox') el.checked = v; else el.value = v; el.dispatchEvent(new Event(el.tagName === 'INPUT' && el.type !== 'checkbox' ? 'input' : 'change', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, sel, val);
await p.goto(BASE + '#/', { waitUntil: 'networkidle0' }); await sleep(600);
await p.evaluate(() => { localStorage.clear(); const S = (k, v) => localStorage.setItem(k, JSON.stringify(v)); S('imgsDoneF', true); S('seenV', 'v53');
  S('collection', [{ id: 'a', k: '25', g: 'sv', n: 'Pika', sh: true, sx: 'f', w: 'home', at: '2026-10-01T10:00:00Z', cd: '2026-09-02', b: 'great-ball' },
    { id: 'b', k: '133', g: 'swsh' === 0 ? '' : 'sw', n: '', sh: false, sx: 'm', w: '', at: '2026-10-02T10:00:00Z', gx: true },
    { id: 'c', k: '1', g: 'la', n: 'Bulbi', sh: false, sx: '', w: '', at: '2026-10-03T10:00:00Z', gone: { s: 'trade', d: '', n: '' } }]); S('colmode', true); });
await p.reload({ waitUntil: 'networkidle0' }); await sleep(1500);
ok(await p.evaluate(() => !!$('#coltools') && $('#colgrid, .colgrid').children.length === 3), 'overview tools + 3 cards');
// Add window: new fields + Méga for Dracaufeu
await p.click('.colnew'); await sleep(300);
ok(await p.evaluate(() => !!$('#cfb') && $('#cfb').options.length > 30 && !!$('#cfl') && $('#cfcd').type === 'date'), 'Ball / lieu / date fields');
// Jeu actuel defaults to the origin game
await ev('#cfpk', 'Dracaufeu #0006'); await sleep(500); await ev('#cfg', 'xy'); await sleep(400);
ok(await p.evaluate(() => $('#cfw').value === 'xy' && !$('#cfmgw').hidden), 'Jeu actuel prefilled with origin, Méga box shown');
await ev('#cfmg', true); await sleep(300);
let v = await p.evaluate(() => ({ vis: !$('#cfmgv').hidden, o: [...$('#cfmgv').options].map(o => o.value) }));
ok(v.vis && v.o.join() === '6-mega-x,6-mega-y', 'X / Y choice ' + JSON.stringify(v));
await p.type('#cflv', '52');
await ev('#cfw', 'sw'); await sleep(400);
ok(await p.evaluate(() => $('#cfmgw').hidden && !$('#cfmg').checked && /jeu actuel/.test($('#cfnote').textContent)), 'Jeu actuel without Mega: box cleared + hidden');
await shot('4-jeu-actuel-sans-mega.png');
await ev('#cfw', 'go'); await sleep(400);
ok(await p.evaluate(() => !$('#cflvw').hidden && $('#cflv').max === '50'), 'Niveau 1–50 for Jeu actuel GO'); await ev('#cfw', 'xy'); await sleep(300); await ev('#cfmg', true); await sleep(200);
ok(await p.evaluate(() => !$('#cfmgw').hidden), 'Jeu actuel GO: box back');
await ev('#cfmg', true); await sleep(200);
await ev('#cfmgv', '6-mega-y'); await ev('#cfb', 'ultra-ball'); await p.type('#cfl', 'Route 7'); await ev('#cfcd', '2014-01-12'); await sleep(200);
await p.evaluate(() => $('#cfl').blur()); await p.evaluate(() => $('#colmodal .colsheet').scrollTo(0, 0)); await shot('1-ajout-champs.png');
await p.click('#cfok'); await sleep(500);
let c = (await L('collection')).find(e => e.k === '6');
ok(c && c.g === 'xy' && c.w === 'xy' && c.lv === 52 && c.mg === '6-mega-y' && c.b === 'ultra-ball' && c.l === 'Route 7' && c.cd === '2014-01-12', 'stored ' + JSON.stringify(c));
v = await L('caught_g'); ok(!v.includes('go:6-mega-y') && v.includes('xy:6'), 'dex: base ticked in X / Y, no GO Mega mark');
ok(await p.evaluate(() => [...document.querySelectorAll('.colcard .cb.mg')].some(x => x.textContent === 'Méga Y')), 'Méga badge on card');
// Méga ticked first narrows Jeu actuel + Pokémon list
await p.click('.colnew'); await sleep(300); await ev('#cfmg', true); await sleep(300);
v = await p.evaluate(() => [...$('#cfw').options].filter(o => o.value && !o.disabled).map(o => o.value));
ok(v.length && v.every(g => ['xy', 'oras', 'sm', 'usum', 'lgpe', 'za', 'zadlc', 'go'].includes(g)), 'Méga first narrows Jeu actuel ' + v.join(','));
ok(await p.evaluate(() => [...$('#colpkf').options].some(o => /Dracaufeu #0006/.test(o.value)) && ![...$('#colpkf').options].some(o => /Pikachu #0025/.test(o.value))), 'Méga narrows Pokémon list');
await p.evaluate(() => closeCol());
await p.click('.colnew'); await sleep(300); await ev('#cfpk', 'Pikachu #0025'); await sleep(500);
ok(await p.evaluate(() => $('#cfmgw').hidden), 'no Méga box for Pikachu'); await p.evaluate(() => closeCol());
// existing specimen with empty Jeu actuel = origin
await p.evaluate(() => document.querySelector('.colcard[data-cid="b"]').click()); await sleep(400);
ok(await p.evaluate(() => $('#cfw').value === 'sw'), 'empty Jeu actuel shown as origin'); await p.evaluate(() => closeCol());
// v53c: Balls of the origin game
await p.click('.colnew'); await sleep(300); await ev('#cfpk', 'Pikachu #0025'); await sleep(500); await ev('#cfg', 'sv'); await sleep(400); await ev('#cfb', 'dream-ball'); await sleep(200);
await ev('#cfg', 'la'); await sleep(500);
v = await p.evaluate(() => ({ o: [...$('#cfb').options].map(o => o.value).filter(Boolean), b: $('#cfb').value, n: $('#cfnote').textContent }));
ok(v.o.includes('lapoke-ball') && !v.o.includes('poke-ball') && !v.o.includes('dream-ball') && v.b === '' && /Ball effacée/.test(v.n), 'Légendes Arceus: Hisui Balls only, incompatible Ball cleared ' + v.o.length);
await p.evaluate(() => { $('#cfb').focus(); }); await shot('5-balls-arceus.png');
await ev('#cfg', 'lgpe'); await sleep(400);
ok(await p.evaluate(() => [...$('#cfb').options].filter(o => o.value).length === 5), 'Let’s Go: 5 Balls');
await ev('#cfg', 'za'); await sleep(400);
ok(await p.evaluate(() => [...$('#cfb').options].filter(o => o.value).length === 38), 'no data (Z-A): full list');
await p.evaluate(() => closeCol());
// v53c: GO level 1–50 by half levels, 40 / 50 highlighted
await p.click('.colnew'); await sleep(300); await ev('#cfpk', 'Bulbizarre #0001'); await sleep(500); await ev('#cfg', 'go'); await sleep(400);
ok(await p.evaluate(() => $('#cfw').value === 'go' && !$('#cflvw').hidden && $('#cflv').max === '50' && $('#cflv').step === '0.5'), 'GO: Niveau 1–50, step 0.5');
await p.type('#cflv', '50.5'); await p.click('#cfok'); await sleep(300);
ok(await p.evaluate(() => /1 à 50/.test($('#cferr').textContent)), 'GO level 50.5 refused');
ok(await p.evaluate(() => !$('#cfgow').hidden), 'GO: PC / IV fields shown');
await p.evaluate(() => { $('#cflv').value = '40'; $('#cfiv0').value = '15'; }); await p.click('#cfok'); await sleep(300);
ok(await p.evaluate(() => /trois valeurs/.test($('#cferr').textContent)), 'incomplete IV refused');
await p.evaluate(() => { $('#cfiv0').value = '16'; $('#cfiv1').value = '15'; $('#cfiv2').value = '15'; }); await p.click('#cfok'); await sleep(300);
ok(await p.evaluate(() => /0 à 15/.test($('#cferr').textContent)), 'IV 16 refused');
await p.evaluate(() => { $('#cfiv0').value = '15'; $('#cfcp').value = '2345'; }); await p.click('#cfok'); await sleep(500);
v = (await L('collection')).find(e => e.k === '1' && e.g === 'go'); ok(v && v.lv === 40 && v.cp === 2345 && v.iv.join() === '15,15,15', 'GO level 40, PC, IV stored');
ok(await p.evaluate(() => /15\/15\/15 · 100 %/.test(document.querySelector('.colcard .cb.iv').textContent)), 'IV badge on card');
ok(await p.evaluate(() => !!document.querySelector('.colcard .collv.hl')), 'N. 40 highlighted on card');
await p.evaluate(() => document.querySelector('.colcard .collv.hl').closest('.colcard').click()); await sleep(400);
ok(await p.evaluate(() => /N\. 40/.test($('.colhero .collv.hl').textContent)), 'N. 40 highlighted in detail');
ok(await p.evaluate(() => /PC 2\s345 · IV 15\/15\/15 \(100 %\)/.test($('.colgo').textContent)), 'PC / IV % in detail');
await shot('6-niveau-go.png'); await p.evaluate(() => closeCol());
// v53c: ＋ on a Mega sheet = base species + « Peut méga-évoluer » ticked
await p.evaluate(() => colOpen({ k: '6-mega-x', g: 'xy' })); await sleep(500);
v = await p.evaluate(() => ({ pk: $('#cfpk').value, mg: $('#cfmg').checked, vis: !$('#cfmgw').hidden, mv: $('#cfmgv').value, w: $('#cfw').value }));
ok(/^Dracaufeu #0006/.test(v.pk) && v.mg && v.vis && v.mv === '6-mega-x' && v.w === 'xy', '＋ on Méga-Dracaufeu X sheet ' + JSON.stringify(v));
await p.evaluate(() => closeCol());
await p.evaluate(() => colOpen({ k: '6-mega-x', g: 'sw' })); await sleep(500);
v = await p.evaluate(() => ({ mg: $('#cfmg').checked, w: $('#cfw').value, o: [...$('#cfw').options].filter(o => o.value && !o.disabled).map(o => o.value) }));
ok(v.mg && v.w === '' && v.o.every(g => ['xy', 'oras', 'sm', 'usum', 'lgpe', 'za', 'zadlc', 'go'].includes(g)), '＋ from a game without Mega: still ticked, Jeu actuel to choose among Mega games ' + JSON.stringify(v));
await p.evaluate(() => closeCol());
// detail
await p.evaluate(() => document.querySelector('.colcard[data-cid] .cb.mg').closest('.colcard').click()); await sleep(400);
v = await p.evaluate(() => $('.colhero').textContent);
ok(/N\. 52/.test(v) && /Méga Y/.test(v) && /Hyper Ball/.test(v) && /Route 7/.test(v) && /12\/01\/2014/.test(v), 'detail shows Méga, Ball, lieu, date');
await shot('3-mega-fiche.png'); await p.evaluate(() => closeCol());
// search / filters / sort
await p.type('#colq', 'pika'); await sleep(300);
ok(await p.evaluate(() => $('.colgrid').children.length === 1 && document.activeElement.id === 'colq'), 'search by surnom keeps focus');
await p.evaluate(() => { $('#colq').value = ''; $('#colq').dispatchEvent(new Event('input', { bubbles: true })); }); await sleep(200);
await p.click('#colfbtn'); await sleep(200);
await ev('#cvsp', 'gx'); await sleep(200);
ok(await p.evaluate(() => $('.colgrid').children.length === 1 && /\(1\)/.test($('#colfbtn').textContent)), 'Gigamax filter + count');
await ev('#cvsp', ''); await ev('#cvhg', true); await sleep(200);
ok(await p.evaluate(() => $('.colgrid').children.length === 4), 'hide « Plus en ma possession »');
await ev('#colso', 'cd'); await sleep(200);
ok(await p.evaluate(() => $('.colgrid .colcard').dataset.cid === 'a'), 'sort by date de capture (latest first)');
await ev('#colso', 'lv'); await sleep(200);
ok(await p.evaluate(() => $('.colgrid .colcard .collv') && $('.colgrid .colcard').querySelector('.collv')), 'sort by Niveau (highest first)');
await ev('#colso', 'dex'); await sleep(200);
v = await p.evaluate(() => [...document.querySelectorAll('.colgrid .colcard')].map(x => x.dataset.cid).join());
ok(v.split(',')[2] === 'a', 'sort by Pokédex number ' + v);
await p.evaluate(() => window.scrollTo(0, 0)); await shot('2-vue-filtres.png');
ok(!errs.length, 'no JS errors ' + errs.join(' | '));
await b.close(); console.log(fails ? `${fails} FAIL` : 'ALL PASS'); process.exit(fails ? 1 : 0);
