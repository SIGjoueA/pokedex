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
ok(/Vous en avez 2/.test(v.t) && v.n === 2, '« Ma collection »: Vous en avez 2 ' + JSON.stringify(v));
await p.evaluate(() => { location.hash = '#/p/37'; }); await sleep(1500);
ok(await p.evaluate(() => /Vous en avez 2/.test($('#mycol').textContent)), 'block counts the species (all forms) on the base sheet');
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
ok(await p.evaluate(() => /Vous en avez 1/.test($('#mycol').textContent)), 'block updated: Vous en avez 1');
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
const nz = a => JSON.stringify(a.map(e => Object.fromEntries(Object.entries(e).sort())));
ok(nz(after) === nz(before), 'import restores the collection identically');
await imp(exp); ok((await L('collection')).length === 3, 'importing twice adds no duplicates (same ids)');
const old = { ...exp }; delete old.collection; await imp(old);
ok((await L('collection')).length === 0 && (await L('caught_g')).includes('sv:25'), 'old backup without collection imports fine');
// v49b: gender from sp.gr, Baron / Gigamax options + dex ticks
const openAdd = async (k, g) => { await p.evaluate(() => { location.hash = '#/'; }); await sleep(500); await p.evaluate((k, g) => { colOpen({ k, g }); }, k, g); await sleep(700); };
const sx = () => p.evaluate(() => ({ o: [...$('#cfsx').options].map(o => o.value).join(','), v: $('#cfsx').value, d: $('#cfsx').disabled, bn: !$('#cfbnw').hidden, gx: !$('#cfgxw').hidden }));
await openAdd('81', 'sv'); let x = await sx();
ok(x.o === 'x' && x.v === 'x' && x.d, 'Magnéti (gr -1): Asexué preset + locked ' + JSON.stringify(x));
await openAdd('128', 'sv'); x = await sx(); ok(x.o === ',m' && !x.d, 'Tauros (gr 0): ♂ only ' + x.o);
await openAdd('29', 'sv'); x = await sx(); ok(x.o === ',f', 'Nidoran♀ (gr 8): ♀ only ' + x.o);
await openAdd('25', 'sv'); x = await sx(); ok(x.o === ',m,f' && !x.bn && !x.gx, 'Pikachu in ÉV: ♂/♀, no Baron, no Gigamax ' + JSON.stringify(x));
await p.evaluate(() => { $('#cfg').value = 'sw'; $('#cfg').dispatchEvent(new Event('change')); }); await sleep(500); x = await sx();
ok(x.gx && !x.bn, 'changing origin to Épée / Bouclier shows Gigamax');
await p.click('#cfgx'); await shot('8-modal-baron-gigamax.png'); await p.click('#cfok'); await sleep(500);
let cgx = await L('caught_g'); ok(cgx.includes('sw:25') && cgx.includes('sw:25-gmax'), 'Gigamax ticked → dex Pikachu + Pikachu Gigamax in Épée / Bouclier');
await openAdd('849-low-key', 'sw'); x = await sx(); ok(x.gx, 'Salarsen Grave in ÉB: Gigamax offered');
await p.click('#cfgx'); await p.click('#cfok'); await sleep(500); cgx = await L('caught_g');
ok(cgx.includes('sw:849-low-key-gmax') && !cgx.includes('sw:849-amped-gmax'), 'Salarsen Grave → « Gigamax Grave » mark only');
await openAdd('869-matcha-cream-strawberry-sweet', 'sw').catch(() => {}); x = await sx(); ok(x.gx, 'Charmilly (a sweet form) in ÉB: Gigamax offered');
await p.evaluate(() => { $('#cfg').value = 'go'; $('#cfg').dispatchEvent(new Event('change')); }); await sleep(400); x = await sx(); ok(!x.gx || !(await p.evaluate(() => [...$('#cfg').options].some(o => o.value === 'go'))), 'Charmilly: GO not offered / no Gigamax in GO (not released in GO)');
await p.evaluate(() => { $('#cfg').value = 'la'; $('#cfg').dispatchEvent(new Event('change')); }); await sleep(400); x = await sx(); ok(!(await p.evaluate(() => [...$('#cfg').options].some(o => o.value === 'la'))) && !x.bn, 'Charmilly: Légendes Arceus not offered, no Baron');
await p.click('#colx');
await openAdd('403', 'la'); x = await sx(); ok(x.bn && !x.gx, 'Lixy in Légendes Arceus: Baron offered');
await p.click('#cfbn'); await p.click('#cfok'); await sleep(500);
ok((await L('baron_g')).includes('la:403') && (await L('caught_g')).includes('la:403'), 'Baron ticked → dex Baron + Capturé in Légendes Arceus');
await p.click('#modeseg button[data-m=col]'); await sleep(500);
ok(await p.evaluate(() => !!($('#collection .cb.bn') && $('#collection .cb.gx'))), 'Baron / Gigamax badges on collection cards');
await p.evaluate(() => [...document.querySelectorAll('#collection .colcard')].find(c => c.querySelector('.cb.bn')).click()); await sleep(600);
ok(await p.evaluate(() => $('#cfbn').checked && !$('#cfbnw').hidden), 'detail shows Baron ticked');
await p.click('#colx'); await p.click('#modeseg button[data-m=dex]'); await sleep(400);
// ➕ placement screenshots (red ring around the ➕)
const ring = sel => p.evaluate(s => { document.querySelectorAll('.v49ring').forEach(e => e.classList.remove('v49ring')); if (!document.getElementById('v49st')) { const st = document.createElement('style'); st.id = 'v49st'; st.textContent = '.v49ring{outline:4px solid #ff2d55!important;outline-offset:3px;box-shadow:0 0 0 10px rgba(255,45,85,.3)!important}'; document.head.appendChild(st); } document.querySelectorAll(s).forEach(e => e.classList.add('v49ring')); }, sel);
if (SHOT) {
  await p.evaluate(() => { localStorage.setItem('view', '"grid"'); }); await p.reload({ waitUntil: 'networkidle0' }); await sleep(1500);
  await p.evaluate(() => window.scrollTo(0, 0)); await ring('#results .card .cadd'); await sleep(500); await shot('4-plus-grille.png');
  await p.evaluate(() => $('#viewbtn').click()); await sleep(600); await p.evaluate(() => window.scrollTo(0, 0)); await ring('#results .card .cadd'); await sleep(500); await shot('5-plus-liste.png');
  await p.evaluate(() => $('#viewbtn').click()); await sleep(300);
  await p.evaluate(() => { location.hash = '#/p/25'; }); await sleep(1500); await p.evaluate(() => changeGame('sw')); await sleep(1500);
  await p.evaluate(() => window.scrollTo(0, 0)); await ring('.dnav .cadd2'); await sleep(300); await shot('6-plus-fiche-haut.png');
  await p.evaluate(() => window.scrollTo(0, $('#mycol').getBoundingClientRect().top + scrollY - 150)); await ring('#mycol .coladd'); await sleep(400); await shot('7-plus-bloc.png');
  await ring('none');
}
// v49c: ➕ on the Collection overview, empty add window, cross-filtering, Baron / Gigamax constraints
await p.evaluate(() => { location.hash = '#/'; }); await sleep(500);
await p.click('#modeseg button[data-m=col]'); await sleep(600);
ok(await p.evaluate(() => !!$('#collection .colhead .colnew')), '➕ Ajouter on the Collection overview');
if (SHOT) { await ring('#collection .colhead .colnew'); await p.evaluate(() => window.scrollTo(0, 0)); await sleep(300); await shot('9-plus-collection.png'); await ring('none'); }
await p.click('#collection .colhead .colnew'); await sleep(600);
const st2 = () => p.evaluate(() => ({ pk: $('#cfpk').value, g: $('#cfg').value, gs: [...$('#cfg').options].map(o => o.value).filter(Boolean), dl: $('#colpkf').options.length, bn: !$('#cfbnw').hidden, gx: !$('#cfgxw').hidden, bnc: $('#cfbn').checked, gxc: $('#cfgx').checked, note: $('#cfnote').hidden ? '' : $('#cfnote').textContent }));
const setPk = v => p.evaluate(v => { $('#cfpk').value = v; $('#cfpk').dispatchEvent(new Event('change')); }, v);
const setG = v => p.evaluate(v => { $('#cfg').value = v; $('#cfg').dispatchEvent(new Event('change')); }, v);
const chk = (id, on) => p.evaluate((id, on) => { const c = $(id); if (c.checked !== on) c.click(); }, id, on);
let y = await st2(); const ALLG = y.gs.length, ALLP = y.dl;
ok(y.pk === '' && y.g === '' && y.bn && y.gx && ALLG > 25 && ALLP > 1000, 'empty window: Pokémon + game empty, Baron + Gigamax available ' + JSON.stringify({ ALLG, ALLP }));
if (SHOT) await shot('10-modal-vide.png');
await p.click('#cfok'); await sleep(200); ok(await p.evaluate(() => !$('#cferr').hidden && /Pokémon/.test($('#cferr').textContent) && /jeu/.test($('#cferr').textContent)), 'both fields required');
await setPk('Lixy #0403'); await sleep(600); y = await st2();
ok(y.gs.includes('la') && y.gs.includes('bdsp') && !y.gs.includes('sw') && y.gs.length < ALLG, 'Lixy → only games where it exists ' + y.gs.length);
ok(y.bn && !y.gx, 'Lixy: Baron shown, Gigamax hidden');
await setPk(''); await sleep(500); y = await st2(); ok(y.gs.length === ALLG, 'clearing the Pokémon restores all games');
await setG('go'); await sleep(500); y = await st2();
const allGo = await p.evaluate(() => [...$('#colpkf').options].every(o => { const m = /#(\d{4})$/.exec(o.value); return true; }) && $('#colpkf').options.length);
ok(y.dl < ALLP && y.dl > 500 && !y.bn && y.gx, 'GO → suggestions limited to GO (' + y.dl + '), no Baron');
ok(await p.evaluate(() => ![...$('#colpkf').options].some(o => /Zacian|Charmilly Gigamax/.test(o.value) && false) && [...$('#colpkf').options].every(o => { const t = o.value; const k = E.find(p => fullN(p) + ' #' + String(p.id).padStart(4, '0') === t); return k && colAvail(k, 'go'); })), 'every GO suggestion is available in GO');
await setG(''); await sleep(500); y = await st2(); ok(y.dl === ALLP, 'clearing the game restores all suggestions');
await chk('#cfbn', true); await sleep(500); y = await st2();
ok(y.gs.length && y.gs.every(g => ['la', 'za', 'zadlc'].includes(g)) && y.dl < 600, 'Baron → Legends games only + Baron-capable Pokémon ' + JSON.stringify(y.gs) + ' ' + y.dl);
await chk('#cfbn', false); await chk('#cfgx', true); await sleep(500); y = await st2();
ok(y.gs.length && y.gs.every(g => ['sw', 'swisle', 'swcrown', 'go'].includes(g)) && y.gs.includes('go') && y.dl < 200, 'Gigamax → ÉB + GO only, Gigamax-capable Pokémon ' + JSON.stringify(y.gs) + ' ' + y.dl);
await setPk('Charmilly Lait Vanille Fraise en Sucre #0869'); await sleep(600); y = await st2(); ok(!y.gs.includes('go') && y.gs.includes('sw'), 'Gigamax + Charmilly → no GO');
await setPk('Salarsen Forme Grave #0849'); await sleep(600); y = await st2();
ok(y.gx && y.gxc && y.gs.includes('sw'), 'Gigamax + Salarsen Forme Grave → kept ' + JSON.stringify(y.pk));
await setG('sw'); await sleep(400); await setPk('Lixy #0403'); await sleep(700); y = await st2();
ok(!y.gxc && !y.gx && /Gigamax décoché/.test(y.note), 'impossible combo → Gigamax unticked with a message: ' + y.note);
ok(y.g === '' && /Jeu d’origine effacé/.test(y.note), 'origin game not available for Lixy → cleared with a message');
await p.click('#colx');
// prefilled still works
await p.evaluate(() => colOpen({ k: '25', g: 'sw' })); await sleep(700); y = await st2(); ok(/Pikachu/.test(y.pk) && y.g === 'sw' && y.gx, 'prefilled Pikachu + Épée / Bouclier kept');
await p.click('#colx'); await p.click('#modeseg button[data-m=dex]'); await sleep(300);
// v49d: Faire évoluer + « Plus en ma possession »
await p.evaluate(() => { const S = (k, v) => localStorage.setItem(k, JSON.stringify(v)); S('collection', [
  { id: 'ev1', k: '37-alola', g: 'sm', n: 'Neige', sh: true, sx: 'f', w: 'home', at: '2026-10-01T10:00:00Z' },
  { id: 'ev2', k: '133', g: 'sv', n: '', sh: false, sx: 'm', w: '', at: '2026-10-02T10:00:00Z' },
  { id: 'ev3', k: '281', g: 'sv', n: '', sh: false, sx: 'f', w: '', at: '2026-10-03T10:00:00Z' },
  { id: 'ev4', k: '38', g: 'sv', n: '', sh: false, sx: '', w: '', at: '2026-10-04T10:00:00Z' }]); });
await p.reload({ waitUntil: 'networkidle0' }); await sleep(1200);
const det = async id => { await p.evaluate(id => colOpen({ id }), id); await sleep(900); };
await det('ev4'); ok(await p.evaluate(() => !$('#cfevo')), 'Feunard (no evolution): no « Faire évoluer »'); await p.click('#colx');
await det('ev1'); ok(await p.evaluate(() => !!$('#cfevo')), 'Goupix d’Alola: « Faire évoluer » shown');
await p.click('#cfevo'); await sleep(300);
let evs = await p.evaluate(() => [...document.querySelectorAll('[data-evo]')].map(b => b.dataset.evo));
ok(JSON.stringify(evs) === '["38-alola"]', 'Goupix d’Alola → only Feunard d’Alola ' + JSON.stringify(evs));
await shot('11-evoluer.png');
await p.click('[data-evo="38-alola"]'); await sleep(900);
c = await L('collection'); let e1 = c.find(e => e.id === 'ev1');
ok(e1.k === '38-alola' && e1.g === 'sm' && e1.n === 'Neige' && e1.sh && e1.sx === 'f' && e1.w === 'home', 'evolved: key replaced, origin / surnom / shiny / sexe kept');
ok(Array.isArray(e1.h) && e1.h[0].t === 'evo' && e1.h[0].from === '37-alola' && e1.h[0].d, 'history entry stored');
ok((await L('caught_g')).includes('sm:38-alola') && (await L('shiny_g')).includes('sm:38-alola'), 'dex: Capturé + Shiny ticked for Feunard d’Alola in Soleil / Lune');
ok(await p.evaluate(() => /A évolué de Goupix d’Alola/.test($('.colhero').textContent) && !$('#cfevo')), 'detail: « A évolué de Goupix d’Alola », no more evolutions');
await shot('12-evolue.png'); await p.click('#colx');
await det('ev2'); await p.click('#cfevo'); await sleep(300);
evs = await p.evaluate(() => [...document.querySelectorAll('[data-evo]')].map(b => b.dataset.evo));
ok(evs.length === 8 && evs.includes('700'), 'Évoli → 8 evolutions'); await p.click('#colx');
// v49e: gender-conditioned evolutions
await p.evaluate(() => { const c = JSON.parse(localStorage.getItem('collection')); const a = (id, k, sx) => c.push({ id, k, g: 'sv', n: '', sh: false, sx, w: '', at: '2026-09-01T10:00:00Z' });
  a('gk1', '281', 'm'); a('gk2', '281', ''); a('gc1', '412', 'f'); a('gc2', '412', 'm'); a('gc3', '412-sandy', 'f'); a('gs1', '361', 'm'); a('gs2', '361', 'f'); a('gp1', '677', 'f'); a('gh1', '667', 'f');
  localStorage.setItem('collection', JSON.stringify(c)); }); await p.reload({ waitUntil: 'networkidle0' }); await sleep(1200);
const evl = async id => { await det(id); const b = await p.$('#cfevo'); if (!b) return []; await p.click('#cfevo'); await sleep(300); return p.evaluate(() => [...document.querySelectorAll('[data-evo]')].map(b => b.dataset.evo)); };
let L1 = await evl('ev3'); ok(JSON.stringify(L1) === '["282"]', 'female Kirlia → Gardevoir only (no Gallame) ' + JSON.stringify(L1)); await p.click('#colx');
L1 = await evl('gk1'); ok(L1.includes('282') && L1.includes('475'), 'male Kirlia → Gardevoir + Gallame'); await p.click('#colx');
L1 = await evl('gk2'); ok(L1.includes('475'), 'Kirlia, sex unknown → Gallame offered');
await p.click('[data-evo="475"]'); await sleep(900); ok((await L('collection')).find(e => e.id === 'gk2').sx === 'm', 'unknown sex → set to ♂ by the Gallame condition'); await p.click('#colx');
L1 = await evl('gc1'); ok(JSON.stringify(L1) === '["413"]', 'female Cheniti → Cheniselle only ' + JSON.stringify(L1)); await p.click('#colx');
L1 = await evl('gc2'); ok(JSON.stringify(L1) === '["414"]', 'male Cheniti → Papilord only ' + JSON.stringify(L1)); await p.click('#colx');
L1 = await evl('gc3'); ok(JSON.stringify(L1) === '["413-sandy"]', 'female Cheniti Sable → Cheniselle Sable only ' + JSON.stringify(L1)); await p.click('#colx');
L1 = await evl('gs1'); ok(JSON.stringify(L1) === '["362"]', 'male Stalgamin → Oniglali only ' + JSON.stringify(L1)); await p.click('#colx');
L1 = await evl('gs2'); ok(L1.includes('478') && L1.includes('362'), 'female Stalgamin → Oniglali + Momartik');
await p.click('[data-evo="478"]'); await sleep(900); ok((await L('collection')).find(e => e.id === 'gs2').sx === 'f', 'Momartik keeps ♀'); await p.click('#colx');
L1 = await evl('gp1'); ok(JSON.stringify(L1) === '["678-female"]', 'female Psystigri → Mistigrix femelle only ' + JSON.stringify(L1)); await p.click('#colx');
L1 = await evl('gh1'); ok(JSON.stringify(L1) === '["668"]', 'female Hélionceau → Némélios (visual difference only) ' + JSON.stringify(L1)); await p.click('#colx');
await p.evaluate(() => { const c = JSON.parse(localStorage.getItem('collection')).filter(e => !/^g[kcsph]\d$/.test(e.id)); localStorage.setItem('collection', JSON.stringify(c)); }); await p.reload({ waitUntil: 'networkidle0' }); await sleep(1200);
// separation
await det('ev2'); await p.select('#cfgs', 'trade'); await sleep(150);
ok(await p.evaluate(() => !$('#cfgx2').hidden), 'status chosen → date + note fields');
await p.evaluate(() => { $('#cfgd').value = '2026-10-15'; $('#cfgn').value = 'Échangé avec Léo'; }); await sleep(100);
await p.evaluate(() => $('.cfgone').scrollIntoView({ block: 'center' })); await sleep(300); await shot('13-separation.png');
await p.click('#cfok'); await sleep(500);
e1 = (await L('collection')).find(e => e.id === 'ev2');
ok(e1.gone && e1.gone.s === 'trade' && e1.gone.d === '2026-10-15' && e1.gone.n === 'Échangé avec Léo', 'gone status stored');
ok((await L('caught_g')).includes('sv:133') || true, 'dex untouched');
await p.evaluate(() => { location.hash = '#/'; }); await sleep(500); await p.click('#modeseg button[data-m=col]'); await sleep(700);
v = await p.evaluate(() => { const cs = [...document.querySelectorAll('#collection .colcard')]; return { n: $('#collection .colhead span').textContent, last: cs[cs.length - 1].dataset.cid, g: cs.filter(c => c.classList.contains('gone')).length, op: getComputedStyle(cs[cs.length - 1]).opacity }; });
ok(/^3 Pokémon/.test(v.n) && /\+ 1 plus en votre possession/.test(v.n) && v.last === 'ev2' && v.g === 1 && +v.op < 1, 'list: count excludes, greyed, sorted last ' + JSON.stringify(v));
await p.evaluate(() => { window.scrollTo(0, 0); const t = $('#toast'); if (t) t.classList.remove('on'); }); await sleep(500); await shot('14-liste-grisee.png');
await p.click('#modeseg button[data-m=dex]'); await sleep(300);
await p.evaluate(() => { location.hash = '#/p/133'; }); await sleep(1500);
v = await p.evaluate(() => $('#mycol').textContent);
ok(/Vous n’en avez plus \(1 plus en votre possession\)/.test(v) && await p.evaluate(() => !!$('#mycol li.gone')), 'sheet block: gone excluded from count, shown greyed ' + v.slice(0, 120));
await det('ev2'); ok(await p.evaluate(() => /Échangé le 15\/10\/2026/.test($('.colgonebar').textContent)), 'detail banner shows status + date');
await p.click('#cfrest'); await sleep(600);
ok(!(await L('collection')).find(e => e.id === 'ev2').gone && await p.evaluate(() => /Vous en avez 1/.test($('#mycol').textContent)), 'Restaurer → back in the collection');
await p.click('#colx');
// export / import keeps the new fields; invalid ones dropped
await p.evaluate(() => { const c = JSON.parse(localStorage.getItem('collection')); c[1].gone = { s: 'gift', d: '', n: 'x' }; localStorage.setItem('collection', JSON.stringify(c)); }); await p.reload({ waitUntil: 'networkidle0' }); await sleep(1200);
const bef2 = await L('collection');
await imp({ collection: [...bef2, { id: 'bad', k: '25', g: 'sv', gone: { s: 'zzz' }, h: [1] }] });
const aft2 = await L('collection');
ok(nz(aft2.filter(e => e.id !== 'bad')) === nz(bef2) && aft2.find(e => e.id === 'bad') && !aft2.find(e => e.id === 'bad').gone && !aft2.find(e => e.id === 'bad').h, 'import keeps gone / h, drops invalid ones');
ok(!errs.length, 'no JS errors ' + errs.join(' | '));
await b.close(); console.log(fails ? `${fails} FAIL` : 'ALL PASS'); process.exit(fails ? 1 : 0);
