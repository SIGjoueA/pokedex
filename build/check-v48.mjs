// v48 check: Ogerpon linked in Écarlate / Violet (+ extensions), still linked in HOME, separate in GO; v48 migration idempotent, nothing removed.
// Headless only (no screenshots). Needs docs/ served on :8811.
import puppeteer from 'puppeteer-core';
const BASE = 'http://localhost:8811/';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
const sleep = ms => new Promise(r => setTimeout(r, ms)); let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const K = ['1017', '1017-wellspring-mask', '1017-hearthflame-mask', '1017-cornerstone-mask'];
await p.goto(BASE + '#/', { waitUntil: 'networkidle0' }); await sleep(800);
await p.evaluate(() => { const S = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  S('imgsDoneF', true); S('seenV', 'v48'); S('caught_g', ['svmask:1017-hearthflame-mask', 'go:1017', 'za:25']); S('shiny_g', ['svmask:1017-wellspring-mask']); });
await p.reload({ waitUntil: 'networkidle0' }); await sleep(1500);
const st = () => p.evaluate(() => ({ c: JSON.parse(localStorage.caught_g), s: JSON.parse(localStorage.shiny_g) }));
let s1 = await st();
ok(K.every(k => s1.c.includes('svmask:' + k)), 'migration: Masque Turquoise (Ogerpon only exists there in the ÉV save) marks on the 4 masks');
ok(K.every(k => s1.s.includes('svmask:' + k)), 'migration: shiny copied to the 4 masks');
ok(s1.c.includes('go:1017') && !s1.c.includes('go:1017-wellspring-mask'), 'GO stays separate');
ok(s1.c.includes('za:25') && s1.c.includes('svmask:1017-hearthflame-mask'), 'no mark removed');
await p.reload({ waitUntil: 'networkidle0' }); await sleep(1500);
const s2 = await st(); ok(JSON.stringify(s2) === JSON.stringify(s1), 'migration idempotent (second start: no change)');
const linked = await p.evaluate(() => [fLinked(BY_KEY['1017-cornerstone-mask'], 'sv'), fLinked(BY_KEY['1017'], 'svdisk'), fLinked(BY_KEY['1017'], 'home'), fLinked(BY_KEY['1017'], 'go')]);
ok(JSON.stringify(linked) === '[true,true,true,false]', 'fLinked sv / svdisk / home = true, go = false ' + JSON.stringify(linked));
// UI: untick on one mask → all 4 unticked in sv; tick again → all 4
await p.evaluate(() => { localStorage.setItem('caught_g', '[]'); localStorage.setItem('shiny_g', '[]'); });
await p.reload({ waitUntil: 'networkidle0' }); await sleep(1500);
await p.evaluate(() => { location.hash = '#/p/1017-cornerstone-mask'; }); await sleep(1200); await p.evaluate(() => changeGame('svmask')); await sleep(1500);
await p.click('#actbar .cg'); await sleep(600);
const s3 = await st(); ok(K.every(k => s3.c.includes('svmask:' + k)), 'tick Masque de la Pierre in ÉV → 4 masks ticked');
await p.click('#actbar .cg'); await sleep(600);
const s4 = await st(); ok(!K.some(k => s4.c.includes('svmask:' + k)), 'untick → 4 masks unticked');
ok(!errs.length, 'no page errors ' + errs.join(' | '));
await b.close(); console.log(fails ? `${fails} FAIL` : 'ALL PASS'); process.exit(fails ? 1 : 0);
