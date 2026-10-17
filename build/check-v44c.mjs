// v44c check: visual gender differences = one entry + optional « ♀ Femelle » mark (no effect on completion), migration of old female-key marks,
// the 4 real differences kept as two entries. Needs docs/ served on :8811.
import puppeteer from 'puppeteer-core';
const BASE = 'http://localhost:8811/';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
const sleep = ms => new Promise(r => setTimeout(r, ms)); let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
await p.goto(BASE, { waitUntil: 'networkidle0' }); await sleep(600);
// ---- data / entries
const d = await p.evaluate(() => ({ sex: E.filter(x => x.c === 'sex').map(x => x.k), fe: E.filter(x => x.fe).length, n: E.length, f3: !!BY_KEY['3-female'], of3: FEM_OF['3-female']?.k, ofH: FEM_OF['215-hisui-female']?.k,
  keep: [678, 876, 902, 916].map(id => E.filter(x => x.id === id && !x.mb).map(x => x.k).join('+')), mm: E.filter(x => x.id === 678 && x.mb).map(x => x.k), l3: BY_KEY['3'].l || '' }));
ok(d.sex.join() === '678-female,876-female,902-female,916-female', 'only the 4 real differences keep a female entry: ' + d.sex.join());
ok(d.fe === 99 && !d.f3 && d.of3 === '3' && d.ofH === '215-hisui', `99 species carry ♀ (fe), 3-female no entry, FEM_OF ok (${d.n} entries)`);
ok(d.keep.join(' ') === '678+678-female 876+876-female 902+902-female 916+916-female' && d.mm.length === 2, 'Mistigrix / Wimessir / Paralyse / Fragroin: two entries; Méga-Mistigrix ♂ / ♀: ' + d.keep.join(' ') + ' ' + d.mm.join());
ok(!d.l3, 'Florizarre: no « Mâle » label any more');
// ---- migration from a v44 (and older) save with marks on female entries
const om = await p.evaluate(() => originOf('sw'));
await p.evaluate(om => { localStorage.clear(); const S = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  S('caught_g', ['sv:25-female', 'svmask:25-female', 'go:3-female', 'la:215-hisui-female']); S('shiny_g', ['sw:25-female', 'swisle:25-female']); S('home_o', [om + ':25-female']); S('home_og', [om + ':25-female']);
  S('home_sh', ['25-female']); S('favs', ['449-female']); S('baron_g', ['la:215-hisui-female']); S('caught', ['12-female']); }, om);
await p.reload({ waitUntil: 'networkidle0' }); await sleep(800);
const L = k => p.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), k);
let cg = await L('caught_g'), sg = await L('shiny_g'), fg = await L('fem_g'), ho = await L('home_o'), hog = await L('home_og'), hs = await L('home_sh'), fv = await L('favs'), bg = await L('baron_g'), lc = await L('caught');
ok(['sv:25', 'go:3', 'sw:25', 'la:215-hisui'].every(x => cg.includes(x)) && sg.includes('sw:25'), 'migration: species captured / shiny ' + JSON.stringify([cg, sg]));
ok(['sv:25', 'svmask:25', 'go:3', 'sw:25', 'la:215-hisui', 'home:25'].every(x => fg.includes(x)), 'migration: ♀ marks ' + JSON.stringify(fg));
ok(ho.includes(om + ':25') && hog.includes(om + ':25') && hs.includes('25') && fv.includes('449') && bg.includes('la:215-hisui') && lc.includes(12), 'migration: HOME origin / HOME shiny / favourite / Baron / old manual mark ' + JSON.stringify([ho, hs, fv, bg, lc]));
ok(cg.includes('sv:25-female') && sg.includes('sw:25-female') && ho.includes(om + ':25-female') && hs.includes('25-female') && fv.includes('449-female'), 'migration: old female keys kept (nothing removed)');
// ---- sheet buttons
const bar = () => p.$$eval('#actbar button', bs => bs.map(x => (x.querySelector('.t')?.textContent || '') + (x.getAttribute('aria-pressed') === 'true' ? '=on' : '=off') + (x.disabled ? '(dis)' : '')));
const sheet = async (k, g) => { await p.goto(BASE + '#/p/' + k); await sleep(700); if (g) { await p.select('#dgame', g); await sleep(500); } return bar(); };
let t = await sheet('25', 'sv'); console.log('  Pikachu ÉV:', t.join(' · '));
ok(t[t.length - 1] === 'Femelle=on', 'Pikachu ÉV: ♀ last, on (migrated)');
// unticking ♀ is not undone by the migration at the next start
await p.click('#actbar .fem'); await sleep(300); await p.reload({ waitUntil: 'networkidle0' }); await sleep(800); await p.select('#dgame', 'sv'); await sleep(500); t = await bar();
ok(t.includes('Femelle=off') && t.includes('Capturé=on'), 'untick ♀ survives a restart (no resurrection), Capturé kept ' + t.join(' · '));
// ♀ does not change completion / counts
const st = () => p.evaluate(() => { const q = BY_KEY['25'], s = baseStatus(q); return JSON.stringify([s.any, s.swDone, s.oldDone, s.c.slice().sort(), isCaught(q, 'sv'), homeComplete(q)]); });
const s0 = await st(); await p.click('#actbar .fem'); await sleep(300); const s1 = await st();
ok(s0 === s1, 'ticking ♀ on a captured Pikachu changes no completion ' + s1);
await p.evaluate(() => { state.game = 'sv'; }); await p.goto(BASE + '#/'); await sleep(300);
const cnt = () => p.evaluate(async () => { await setGame('sv'); render(); return $('#count').textContent; });
const c1 = await cnt(); t = await sheet('25', 'sv'); await p.click('#actbar .fem'); await sleep(300); await p.goto(BASE + '#/'); await sleep(300); const c2 = await cnt();
ok(c1 === c2, 'ÉV list counter unchanged by ♀: ' + c2);
// ♀ on an uncaught species ⇒ Capturé (like Baron); unticking Capturé clears ♀
t = await sheet('3', 'svdisk'); console.log('  Florizarre Disque Indigo:', t.join(' · '));
ok(t.includes('Capturé=off') && t.includes('Femelle=off'), 'Florizarre ÉV Disque Indigo: ♀ shown');
await p.click('#actbar .fem'); await sleep(300); t = await bar(); ok(t.includes('Capturé=on') && t.includes('Femelle=on'), '♀ ⇒ Capturé');
await p.click('#actbar .cg'); await sleep(300); t = await bar(); ok(t.includes('Capturé=off') && t.includes('Femelle=off'), 'untick Capturé ⇒ ♀ cleared');
t = await sheet('3', 'frlgsw'); ok(!t.some(x => x.startsWith('Femelle')), 'Rouge Feu / Vert Feuille Switch (gén. III): no ♀ ' + t.join(' · '));
t = await sheet('3', 'go'); ok(t.some(x => x.startsWith('Femelle=')), 'GO: ♀ ' + t.join(' · '));
t = await sheet('3', 'home'); ok(t.some(x => x.startsWith('Femelle=')), 'HOME: ♀ ' + t.join(' · '));
await p.click('#actbar .fem'); await sleep(300); ok((await L('fem_g')).includes('home:3') && !(await p.evaluate(() => HOME_C.has('3'))), 'HOME ♀: own mark, no transfer implied');
t = await sheet('3', 'all'); ok(t.includes('Femelle=off(dis)'), 'overview: ♀ greyed');
const ov = await p.$eval('#trackinfo', e => e.textContent); ok(/Femelle .*notée dans .*Pokémon HOME/.test(ov), 'overview: where ♀ is noted');
t = await sheet('678', 'sv'); ok(!t.some(x => x.startsWith('Femelle')), 'Mistigrix: no ♀ button (two entries)');
// hero image toggle + old link
await sheet('3'); let src = await p.$eval('#heroimg', i => i.getAttribute('src')); ok(/img\/h\/3\.webp/.test(src), 'hero: male image ' + src);
await p.click('#febtn'); await sleep(300); src = await p.$eval('#heroimg', i => i.getAttribute('src')); ok(/3-female\.webp/.test(src), 'hero ♀ toggle: female image ' + src);
await p.goto(BASE + '#/p/449-female'); await sleep(900); src = await p.$eval('#heroimg', i => i.getAttribute('src'));
ok(/449-female/.test(src) && (await p.$eval('h1', h => h.textContent)) === 'Hippopotas', 'old link #/p/449-female → Hippopotas sheet, female image ' + src);
// import of an old backup with female keys
await p.evaluate(() => { localStorage.clear(); }); await p.reload({ waitUntil: 'networkidle0' }); await sleep(600);
await p.goto(BASE + '#/'); await sleep(300);
const fh = await p.$('#import'); const fs = await import('node:fs'); fs.writeFileSync('/tmp/v44c-backup.json', JSON.stringify({ caught_g: ['xy:3-female'], home_o: ['kalos:3-female'], home_sh: ['3-female'] }));
await fh.uploadFile('/tmp/v44c-backup.json'); await sleep(800);
cg = await L('caught_g'); fg = await L('fem_g'); ho = await L('home_o'); hs = await L('home_sh');
ok(cg.includes('xy:3') && fg.includes('xy:3') && fg.includes('home:3') && ho.includes('kalos:3') && hs.includes('3'), 'import of an old backup: migrated ' + JSON.stringify([cg, fg, ho, hs]));
ok(!errs.length, 'no JS errors ' + JSON.stringify(errs));
await b.close(); process.exit(fails ? 1 : 0);
