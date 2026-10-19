// v49 check: mode Collection (toggle, add from a list card / a sheet with prefill, required fields, dex tick, delete keeps dex,
// « Ma collection » count, export / import round trip, old backup without collection). Headless; needs docs/ served on :8811.
// SHOTS=1 also writes the 3 preview screenshots to screenshots/v49/.
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const BASE = 'http://localhost:8811/', SHOT = process.env.SHOTS === '1', DIR = new URL('../screenshots/v49/', import.meta.url).pathname;
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errs.push(m.text()); });
const sleep = ms => new Promise(r => setTimeout(r, ms)); let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const shot = async n => { if (SHOT) { fs.mkdirSync(DIR, { recursive: true }); await p.screenshot({ path: DIR + n }); } };
const tap = async sel => { for (let i = 0; i < 2; i++) { await p.evaluate(s => document.querySelector(s).scrollIntoView({ block: 'center' }), sel); await sleep(400); } await p.click(sel); };
const L = k => p.evaluate(k => JSON.parse(localStorage.getItem(k) || 'null'), k);
await p.goto(BASE + '#/', { waitUntil: 'networkidle0' }); await sleep(600);
await p.evaluate(() => { localStorage.clear(); const S = (k, v) => localStorage.setItem(k, JSON.stringify(v)); S('imgsDoneF', true); S('seenV', 'v49'); });
await p.reload({ waitUntil: 'networkidle0' }); await sleep(1500);
// toggle + empty state
ok(await p.$('#modeseg button[data-m=col]'), 'toggle Dex | Collection present');
await p.click('#modeseg button[data-m=col]'); await sleep(300);
let v = await p.evaluate(() => ({ col: !$('#collection').hidden, res: getComputedStyle($('#results')).display, empty: !!$('.colempty') }));
ok(v.col && v.res === 'none' && v.empty, 'Collection mode: list hidden, empty hint shown');
await p.click('#modeseg button[data-m=dex]'); await sleep(300);
ok(await p.evaluate(() => $('#collection').hidden && getComputedStyle($('#results')).display !== 'none'), 'back to Dex');
// add from a list card in a game view (Écarlate / Violet)
await p.evaluate(() => { $('#game').value = 'sv'; $('#game').dispatchEvent(new Event('change')); }); await sleep(1500);
ok(await p.evaluate(() => document.querySelectorAll('#results .card .cadd').length > 10), '➕ on list cards (grid)');
await p.evaluate(() => $('#results .card .cadd[data-add="25"]').scrollIntoView({ block: 'center' })); await sleep(600);
await p.evaluate(() => $('#results .card .cadd[data-add="25"]').scrollIntoView({ block: 'center' })); await sleep(300);
await p.click('#results .card .cadd[data-add="25"]');
await sleep(400);
v = await p.evaluate(() => ({ m: !!$('#colmodal'), pk: $('#cfpk') && $('#cfpk').value, g: $('#cfg') && $('#cfg').value, hash: location.hash }));
ok(v.m && /Pikachu #0025/.test(v.pk) && v.g === 'sv' && !v.hash.includes('/p/'), 'card ➕ opens modal, prefilled Pikachu + Écarlate / Violet, no navigation ' + JSON.stringify(v));
await p.click('#cfsh'); await p.type('#cfn', 'Pika'); await shot('1-modal-ajout.png');
await p.click('#cfok'); await sleep(500);
let c = await L('collection'), cg = await L('caught_g'), sg = await L('shiny_g');
ok(c.length === 1 && c[0].k === '25' && c[0].g === 'sv' && c[0].sh && c[0].n === 'Pika' && c[0].id && c[0].at, 'entry stored with id + created date');
ok(cg.includes('sv:25') && sg.includes('sv:25'), 'dex: Capturé + Shiny ticked in Écarlate / Violet');
// list view ➕
await p.evaluate(() => { $('#viewbtn').click(); }); await sleep(400);
ok(await p.evaluate(() => { const a = $('#results .card .cadd'); return a && a.getBoundingClientRect().width > 20; }), '➕ on list cards (list view)');
await p.evaluate(() => { $('#viewbtn').click(); }); await sleep(300);
// required-field validation
await p.evaluate(() => { $('#game').value = ''; $('#game').dispatchEvent(new Event('change')); }); await sleep(1000);
await tap('#results .card .cadd'); await sleep(300);
ok(await p.evaluate(() => $('#cfg').value === ''), 'no game selected in the list → origin game empty');
await p.click('#cfok'); await sleep(200);
ok(await p.evaluate(() => !$('#cferr').hidden && !!$('#colmodal')), 'missing origin game → error, not added');
await p.evaluate(() => { $('#cfpk').value = 'zzzz'; $('#cfg').value = 'za'; }); await p.click('#cfok'); await sleep(200);
ok(await p.evaluate(() => !$('#cferr').hidden && /Pokémon/.test($('#cferr').textContent)), 'unknown Pokémon → error');
ok((await L('collection')).length === 1, 'nothing added while invalid');
await p.click('#colx'); await sleep(200);
// add from a sheet with prefill (Goupix d'Alola, sheet game Soleil / Lune)
await p.evaluate(() => { location.hash = '#/p/37-alola'; }); await sleep(1500); await p.evaluate(() => changeGame('sm')); await sleep(1500);
await p.click('.dnav .cadd2'); await sleep(300);
v = await p.evaluate(() => ({ pk: $('#cfpk').value, g: $('#cfg').value }));
ok(/Alola/.test(v.pk) && v.g === 'sm', 'sheet ➕ prefilled with the form + sheet game ' + JSON.stringify(v));
await p.select('#cfsx', 'f'); await p.select('#cfw', 'home'); await p.click('#cfok'); await sleep(500);
cg = await L('caught_g'); ok(cg.some(k => k.startsWith('sm:37-alola')) || cg.includes('sm:37-alola'), 'dex: Capturé ticked in Soleil / Lune');
// second specimen from the block
await tap('#mycol .coladd'); await sleep(300); await p.click('#cfok'); await sleep(500);
v = await p.evaluate(() => ({ t: $('#mycol .colcnt').textContent, n: document.querySelectorAll('#mycol .colrow').length }));
ok(/Tu en as 2/.test(v.t) && v.n === 2, '« Ma collection »: Tu en as 2 ' + JSON.stringify(v));
await p.evaluate(() => { location.hash = '#/p/37'; }); await sleep(1500);
ok(await p.evaluate(() => /Tu en as 2/.test($('#mycol').textContent)), 'block counts the species (all forms) on the base sheet');
await p.evaluate(() => window.scrollTo(0, $('#mycol').getBoundingClientRect().top + scrollY - 120)); await sleep(300); await shot('3-ma-collection-fiche.png');
// edit: origin fixed
await tap('#mycol .colrow'); await sleep(300);
ok(await p.evaluate(() => $('#cfg').disabled && $('#cfpk').disabled && !!$('#cfdel')), 'detail: origin game + Pokémon fixed, delete available');
await p.evaluate(() => { $('#cfn').value = 'Neige'; }); await p.click('#cfok'); await sleep(300);
ok((await L('collection')).some(e => e.n === 'Neige' && e.up), 'edit saved');
// delete with confirmation keeps dex
await tap('#mycol .colrow'); await sleep(300); await p.click('#cfdel'); await sleep(150);
ok((await L('collection')).length === 3 && await p.evaluate(() => /Confirmer/.test($('#cfdel').textContent)), 'first tap asks confirmation, nothing deleted');
await p.click('#cfdel'); await sleep(400);
ok((await L('collection')).length === 2, 'confirmed delete');
cg = await L('caught_g'); ok(cg.includes('sm:37-alola') || cg.some(k => k.startsWith('sm:37-alola')), 'dex tick kept after delete');
ok(await p.evaluate(() => /Tu en as 1/.test($('#mycol').textContent)), 'block updated: Tu en as 1');
// ticking Capturé in dex adds nothing
await p.evaluate(() => { location.hash = '#/p/906'; }); await sleep(1400); await p.evaluate(() => changeGame('sv')); await sleep(1400);
await p.evaluate(() => { const b = $('#actbar .cg'); if (b) b.click(); }); await sleep(400);
ok((await L('caught_g')).includes('sv:906') && (await L('collection')).length === 2, 'ticking Capturé in the dex adds nothing to the collection');
// Collection list + screenshot (add a 3rd from GO)
await p.click('.dnav .cadd2'); await sleep(300); await p.select('#cfg', 'go'); await p.click('#cfok'); await sleep(400);
await p.evaluate(() => { location.hash = '#/'; }); await sleep(800);
await p.click('#modeseg button[data-m=col]'); await sleep(800);
v = await p.evaluate(() => ({ n: document.querySelectorAll('#collection .colcard').length, sh: [...document.querySelectorAll('#collection .colcard img')].some(i => i.src.includes('/img/s/25')), sn: /Pika/.test($('#collection').textContent) }));
ok(v.n === 3 && v.sh && v.sn, 'Collection list: 3 cards, shiny image, surnom ' + JSON.stringify(v));
await shot('2-liste-collection.png');
await tap('#collection .colcard'); await sleep(300); ok(await p.evaluate(() => !!$('#cfdel')), 'tap card opens detail'); await p.click('#colx');
// export / import round trip
const before = await L('collection');
const exp = await p.evaluate(async () => { let blob; const o = URL.createObjectURL; URL.createObjectURL = x => { blob = x; return 'blob:x'; }; const c = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () {}; $('#export').click(); URL.createObjectURL = o; HTMLAnchorElement.prototype.click = c; return JSON.parse(await blob.text()); });
ok(Array.isArray(exp.collection) && exp.collection.length === 3, 'export contains the collection');
const imp = async d => { await p.evaluate(() => { localStorage.setItem('collection', '[]'); }); await p.reload({ waitUntil: 'networkidle0' }); await sleep(1200);
  const h = await p.$('#import'); fs.writeFileSync('/tmp/v49imp.json', JSON.stringify(d)); await h.uploadFile('/tmp/v49imp.json'); await sleep(800); };
await imp(exp); let after = await L('collection');
ok(JSON.stringify(after) === JSON.stringify(before), 'import restores the collection identically');
await imp(exp); ok((await L('collection')).length === 3, 'importing twice adds no duplicates (same ids)');
const old = { ...exp }; delete old.collection; await imp(old);
ok((await L('collection')).length === 0 && (await L('caught_g')).includes('sv:25'), 'old backup without collection imports fine');
ok(!errs.length, 'no JS errors ' + errs.join(' | '));
await b.close(); console.log(fails ? `${fails} FAIL` : 'ALL PASS'); process.exit(fails ? 1 : 0);
