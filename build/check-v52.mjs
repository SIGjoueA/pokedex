// v52 check: boosters per card (data, large view, set filter) + Deluxe reprints (A4b / B4b) sharing the original card. Needs docs/ served on :8811.
// SHOTS=1 writes screenshots/v52/1-boosters.png, 2-filtre-booster.png, 3-luxe.png.
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const BASE = 'http://localhost:8811/', SHOT = process.env.SHOTS === '1', DIR = new URL('../screenshots/v52/', import.meta.url).pathname;
const PKD = JSON.parse(fs.readFileSync(new URL('../docs/data/pocket.json', import.meta.url)));
const DLX = JSON.parse(fs.readFileSync(new URL('./pocket-deluxe.json', import.meta.url)));
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const S = id => PKD.s.find(s => s.id === id), C = id => { const i = id.lastIndexOf('-'); return S(id.slice(0, i)).cards.find(c => c[0] === id.slice(i + 1)); };
const bo = id => { const i = id.lastIndexOf('-'), s = S(id.slice(0, i)); return (C(id)[6] || []).map(k => s.b[k]); };
// data: boosters
ok(JSON.stringify(S('A1').b.slice().sort()) === '["Dracaufeu","Mewtwo","Pikachu"]', 'A1 boosters in French ' + JSON.stringify(S('A1').b));
ok(JSON.stringify(bo('A1-001')) === '["Mewtwo"]' && bo('A1-036').includes('Dracaufeu'), 'A1-001 → Mewtwo, A1-036 → Dracaufeu');
ok(bo('A1-026').length === 3, 'A1-026 (common card) in all 3 boosters ' + JSON.stringify(bo('A1-026')));
const multi = PKD.s.filter(s => (s.b || []).length > 1).map(s => s.id); ok(['A1', 'A2', 'A3', 'A4', 'B1'].every(x => multi.includes(x)), 'multi-booster sets ' + multi.join(' '));
const reg = PKD.s.filter(s => !/^P-/.test(s.id)); const cov = reg.map(s => [s.id, s.cards.filter(c => (c[6] || []).length).length / s.cards.length]);
ok(cov.every(([, r]) => r >= 0.9), 'booster known for ≥ 90 % of the cards of each set ' + cov.map(([i, r]) => i + ' ' + Math.round(r * 100)).join(', '));
ok(PKD.s.flatMap(s => s.cards.map(c => [s, c])).every(([s, c]) => Array.isArray(c[6]) && c[6].every(i => s.b && s.b[i])), 'booster indices valid');
ok((S('P-A').b || []).length > 3 && S('P-A').cards.some(c => c[6].length), 'promo sources (Booster promo série A, vol. N; série B not published by Pokékalos/TCGdex) ' + (S('P-A').b || []).length);
// data: Deluxe
ok(Object.keys(DLX).length > 400 && DLX['A4b-001'] === 'A1-001' && !DLX['A4b-002'], 'Deluxe map: A4b-001 = A1-001, A4b-002 (foil) distinct, ' + Object.keys(DLX).length + ' aliases');
ok(Object.entries(DLX).every(([k, o]) => C(k)[7] === o && C(o) && !C(o)[7] && C(o)[2] === C(k)[2] || C(k)[7] === o && C(o) && !C(o)[7]), 'field 7 = original id, original is not itself an alias');
ok(Object.entries(DLX).every(([k, o]) => JSON.stringify(C(k)[3]) === JSON.stringify(C(o)[3]) || !C(k)[3].length), 'alias keeps the same species');
const ids = PKD.s.flatMap(s => s.cards.map(c => s.id + '-' + c[0])); ok(new Set(ids).size === ids.length, 'unique card ids (a card stays one entry)');
const UNI = PKD.s.reduce((a, s) => a + s.cards.filter(c => !c[7]).length, 0);
// UI
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|404|net::|Failed to load resource/.test(m.text())) errs.push(m.text()); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const shot = async n => { if (SHOT) { fs.mkdirSync(DIR, { recursive: true }); await p.evaluate(() => document.querySelectorAll('.toast,#toast').forEach(t => t.remove())); await sleep(1800); await p.screenshot({ path: DIR + n }); } };
const L = k => p.evaluate(k => JSON.parse(localStorage.getItem(k) || 'null'), k);
await p.goto(BASE + '#/', { waitUntil: 'networkidle0' }); await sleep(500);
// stored copies on Deluxe ids (pre-v52): A4b-001 {fr:2,en:1} + A1-001 {fr:1,ja:1} → A1-001 {fr:2,ja:1,en:1}; A4b-002 (foil) untouched
await p.evaluate(() => { localStorage.clear(); const S = (k, v) => localStorage.setItem(k, JSON.stringify(v)); S('imgsDoneF', true); S('seenV', 'v49'); S('pkmode', true);
  S('pocket', { 'A4b-001': { fr: 2, en: 1 }, 'A1-001': { fr: 1, ja: 1 }, 'A4b-002': { fr: 1 }, 'A4b-003': { de: 1 }, 'A1-036': { fr: 1 } }); });
await p.reload({ waitUntil: 'networkidle0' }); await sleep(2000);
let q = await L('pocket');
ok(JSON.stringify(q['A1-001']) === JSON.stringify({ fr: 2, ja: 1, en: 1 }) && !q['A4b-001'] && q['A4b-002'] && !q['A4b-003'] && q['A1-002'] && q['A1-002'].de === 1, 'migration: Deluxe copies moved to the original, max per language ' + JSON.stringify(q));
let v = await p.evaluate(() => ({ h: $('.pkhead').textContent, a1: $('[data-pks="A1"] .pksc').textContent, a4b: $('[data-pks="A4b"] .pksc').textContent }));
ok(v.h.includes('/ ' + UNI + ' ') && v.a1 === '3 / 286' && v.a4b === '4 / 379', 'totals without double count, Deluxe completion from originals ' + JSON.stringify(v));
await p.evaluate(() => $('[data-pks="A1"]').click()); await sleep(800);
v = await p.evaluate(() => [...document.querySelectorAll('#pkboo [data-pkb]')].map(x => x.textContent));
ok(v.length === 4 && /Tous/.test(v[0]) && v.some(t => /Mewtwo/.test(t)), 'booster chips in A1 ' + JSON.stringify(v));
await p.evaluate(() => [...document.querySelectorAll('#pkboo [data-pkb]')].find(x => /Mewtwo/.test(x.textContent)).click()); await sleep(600);
const nM = S('A1').cards.filter(c => c[6].includes(S('A1').b.indexOf('Mewtwo'))).length;
v = await p.evaluate(() => ({ n: document.querySelectorAll('.pkgrid .pkcard').length, first: $('.pkgrid .pkcard').dataset.pk, pressed: $('#pkboo [aria-pressed=true]').textContent }));
ok(v.n === nM && v.n < 286 && /Mewtwo/.test(v.pressed) && v.first === 'A1-001', 'Mewtwo filter shows only Mewtwo-booster cards ' + JSON.stringify(v) + ' expected ' + nM);
await p.evaluate(() => window.scrollTo(0, 0)); await shot('2-filtre-booster.png');
await p.evaluate(() => $('[data-pkv="A1-001"]').click()); await sleep(900);
v = await p.evaluate(() => $('.pkbig .pkboos') && [...document.querySelectorAll('.pkbig .pkboos')].map(x => x.textContent).join(' | '));
ok(v && /Booster.? : Mewtwo/.test(v) && /A4b n° 001/.test(v), 'large view: « Boosters : Mewtwo, … (A4b n° 001) » ' + v);
await p.evaluate(() => $('#colx').click()); await sleep(300);
await p.evaluate(() => $('[data-pkb="-1"]').click()); await sleep(300);
await p.evaluate(() => $('[data-pkv="A1-026"]').click()); await sleep(900);
v = await p.evaluate(() => $('.pkbig .pkboos').textContent); ok(/Boosters : /.test(v) && /Dracaufeu/.test(v) && /Mewtwo/.test(v) && /Pikachu/.test(v), 'multi-booster card ' + v);
await shot('1-boosters.png');
await p.evaluate(() => $('#colx').click()); await sleep(300);
// Deluxe set view
await p.evaluate(() => $('.pkback').click()); await sleep(400); await p.evaluate(() => $('[data-pks="A4b"]').click()); await sleep(900);
v = await p.evaluate(() => ({ boo: !!$('#pkboo'), rep: ($('.pkrepn') || {}).textContent, own: [...document.querySelectorAll('.pkcard.own')].map(x => x.dataset.pk), first: $('.pkgrid .pkcard').dataset.pk }));
ok(!v.boo && /rééditions identiques/.test(v.rep) && v.first === 'A1-001' && v.own.includes('A1-001') && v.own.includes('A4b-002'), 'A4b view: original cards owned via the shared id, foil separate ' + JSON.stringify(v));
await p.evaluate(() => $('.pkgrid [data-pkt="A1-002"]').click()); await sleep(500);
q = await L('pocket'); ok(q['A1-002'].fr === 1 && !q['A4b-003'], '＋ on a Deluxe reprint adds to the original id');
await p.evaluate(() => $('[data-pkv="A4b-001"]').click()); await sleep(900);
v = await p.evaluate(() => [...document.querySelectorAll('.pkbig .pkboos')].map(x => x.textContent).join(' | ') + ' #' + $('#pksteps').dataset.id);
ok(/Même carte que Puissance Génétique n° 001/.test(v) && /Mewtwo \(A1\)/.test(v) && /#A1-001$/.test(v), 'Deluxe large view: same card + steppers on the original ' + v);
await p.evaluate(() => $('#colx').click()); await sleep(300); await p.evaluate(() => window.scrollTo(0, 0));
await shot('3-luxe.png');
// species sheet: no duplicate Deluxe reprints
await p.evaluate(() => { location.hash = '#/p/1'; }); await sleep(2000);
v = await p.evaluate(() => [...document.querySelectorAll('#mypocket .pkcard')].map(x => x.dataset.pk));
ok(v.length && new Set(v).size === v.length , 'species sheet lists each card once ' + v.length) ;
ok(!errs.length, 'no JS errors ' + errs.join(' | '));
await b.close(); console.log(fails ? `${fails} FAIL` : 'ALL PASS'); process.exit(fails ? 1 : 0);
