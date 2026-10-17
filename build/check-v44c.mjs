// v44c/d check: visual gender differences = one entry, image toggle ♀ / ♂ only (no ♀ mark any more), migration of old female-key marks,
// Méga-Mistigrix = one entry (either Mistigrix + gem), the 4 real differences kept as two entries labelled « mâle » / « femelle ». Needs docs/ served on :8811.
import puppeteer from 'puppeteer-core';
const BASE = 'http://localhost:8811/';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
const sleep = ms => new Promise(r => setTimeout(r, ms)); let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
await p.goto(BASE, { waitUntil: 'networkidle0' }); await sleep(600);
// ---- data / entries
const d = await p.evaluate(() => ({ sex: E.filter(x => x.c === 'sex').map(x => x.k), fe: E.filter(x => x.fe && !x.mb).length, n: E.length, f3: !!BY_KEY['3-female'], of3: FEM_OF['3-female']?.k, ofH: FEM_OF['215-hisui-female']?.k, ofM: FEM_OF['678-female-mega']?.k,
  keep: [678, 876, 902, 916].map(id => E.filter(x => x.id === id && !x.mb).map(x => x.k).join('+')), mm: E.filter(x => x.id === 678 && x.mb).map(x => x.k), l3: BY_KEY['3'].l || '',
  names: [678, 876, 902, 916].map(id => fullN(BY_KEY[String(id)]) + '/' + fullN(BY_KEY[id + '-female'])), sub: numHTML(BY_KEY['678']) + ' | ' + numHTML(BY_KEY['678-female']) }));
ok(d.sex.join() === '678-female,876-female,902-female,916-female', 'only the 4 real differences keep a female entry: ' + d.sex.join());
ok(d.fe === 99 && !d.f3 && d.of3 === '3' && d.ofH === '215-hisui' && d.ofM === '678-male-mega', `99 species carry ♀ image (fe), FEM_OF ok (${d.n} entries)`);
ok(d.n === 1500, 'entry count 1500: ' + d.n);
ok(d.keep.join(' ') === '678+678-female 876+876-female 902+902-female 916+916-female' && d.mm.join() === '678-male-mega', 'two entries for the 4; Méga-Mistigrix one entry: ' + d.keep.join(' ') + ' ' + d.mm.join());
ok(d.names.join() === 'Mistigrix mâle/Mistigrix femelle,Wimessir mâle/Wimessir femelle,Paragruel mâle/Paragruel femelle,Fragroin mâle/Fragroin femelle', 'names: ' + d.names.join(', '));
ok(/#0678 · Mâle/.test(d.sub) && /#0678 · Femelle/.test(d.sub), 'subtitles: ' + d.sub);
ok(!d.l3, 'Florizarre: no « Mâle » label');
// ---- migration from an older save with marks on female entries (incl. the female Mega)
const om = await p.evaluate(() => originOf('sw'));
await p.evaluate(om => { localStorage.clear(); const S = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  S('caught_g', ['sv:25-female', 'svmask:25-female', 'go:3-female', 'la:215-hisui-female']); S('shiny_g', ['sw:25-female', 'swisle:25-female']); S('home_o', [om + ':25-female', 'za:678-female-mega']); S('home_og', [om + ':25-female']);
  S('home_sh', ['25-female', '678-female-mega']); S('favs', ['449-female', '678-female-mega']); S('baron_g', ['la:215-hisui-female']); S('caught', ['12-female']); S('mega_gems', ['za:678-female-mega']); }, om);
await p.reload({ waitUntil: 'networkidle0' }); await sleep(800);
const L = k => p.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), k);
let cg = await L('caught_g'), sg = await L('shiny_g'), ho = await L('home_o'), hog = await L('home_og'), hs = await L('home_sh'), fv = await L('favs'), bg = await L('baron_g'), lc = await L('caught'), mgm = await L('mega_gems');
ok(['sv:25', 'go:3', 'sw:25', 'la:215-hisui'].every(x => cg.includes(x)) && sg.includes('sw:25'), 'migration: species captured / shiny ' + JSON.stringify([cg, sg]));
ok(ho.includes(om + ':25') && hog.includes(om + ':25') && hs.includes('25') && fv.includes('449') && bg.includes('la:215-hisui') && lc.includes(12), 'migration: HOME origin / HOME shiny / favourite / Baron / old manual mark ' + JSON.stringify([ho, hs, fv, bg, lc]));
ok(ho.includes('za:678-male-mega') && hs.includes('678-male-mega') && fv.includes('678-male-mega') && mgm.includes('za:678-male-mega') && !cg.some(x => x.endsWith(':678-male-mega')), 'migration: female Mega marks → Méga-Mistigrix (HOME, shiny, favourite, gem; no Capturé mark) ' + JSON.stringify([ho, hs, mgm]));
ok(cg.includes('sv:25-female') && sg.includes('sw:25-female') && ho.includes(om + ':25-female') && ho.includes('za:678-female-mega') && hs.includes('25-female') && fv.includes('449-female') && mgm.includes('za:678-female-mega'), 'migration: old female keys kept (nothing removed)');
ok(!(await p.evaluate(() => localStorage.getItem('fem_g'))), 'no ♀ marks created any more');
// ---- sheets: no ♀ mark button anywhere
const bar = () => p.$$eval('#actbar button', bs => bs.map(x => (x.querySelector('.t')?.textContent || '') + (x.getAttribute('aria-pressed') === 'true' ? '=on' : '=off') + (x.disabled ? '(dis)' : '')));
const sheet = async (k, g) => { await p.goto(BASE + '#/p/' + k); await sleep(700); if (g) { await p.select('#dgame', g); await sleep(500); } return bar(); };
for (const [k, g] of [['25', 'sv'], ['3', 'svdisk'], ['3', 'go'], ['3', 'home'], ['3', 'all'], ['678-male-mega', 'za']]) {
  const t = await sheet(k, g), tr = await p.$eval('#trackinfo', e => e.textContent).catch(() => '');
  ok(!t.some(x => x.startsWith('Femelle')) && !(await p.$('#actbar .fem')) && !/Femelle/.test(tr), `${k} ${g}: no ♀ button / line · ${t.join(' · ')}`);
}
// ---- hero image toggle + old links
await sheet('3'); let src = await p.$eval('#heroimg', i => i.getAttribute('src')); ok(/img\/h\/3\.webp/.test(src), 'hero: male image ' + src);
await p.click('#febtn'); await sleep(300); src = await p.$eval('#heroimg', i => i.getAttribute('src')); ok(/3-female\.webp/.test(src) && (await p.$eval('#febtn', x => x.textContent)).includes('Mâle'), 'hero ♀ toggle: female image ' + src);
await p.goto(BASE + '#/p/449-female'); await sleep(900); src = await p.$eval('#heroimg', i => i.getAttribute('src'));
ok(/449-female/.test(src) && (await p.$eval('h1', h => h.textContent)) === 'Hippopotas', 'old link #/p/449-female → Hippopotas sheet, female image ' + src);
await sheet('678-male-mega'); ok((await p.$eval('h1', h => h.textContent)) === 'Méga-Mistigrix' && !!(await p.$('#febtn')), 'Méga-Mistigrix: one sheet with the ♀ / ♂ image button');
await p.click('#febtn'); await sleep(300); src = await p.$eval('#heroimg', i => i.getAttribute('src')); ok(/678-female-mega/.test(src), 'Méga-Mistigrix ♀ image ' + src);
await p.goto(BASE + '#/p/678-female-mega'); await sleep(900); ok((await p.$eval('h1', h => h.textContent)) === 'Méga-Mistigrix' && /678-female-mega/.test(await p.$eval('#heroimg', i => i.getAttribute('src'))), 'old link #/p/678-female-mega → Méga-Mistigrix, female image');
// ---- 4 real differences: name + number
await sheet('678'); ok((await p.$eval('h1', h => h.textContent)) === 'Mistigrix mâle' && /#0678 · Mâle/.test(await p.$eval('.hero .num', x => x.textContent)), 'Mistigrix sheet: « Mistigrix mâle », « #0678 · Mâle »');
await sheet('678-female'); ok((await p.$eval('h1', h => h.textContent)) === 'Mistigrix femelle' && /#0678 · Femelle/.test(await p.$eval('.hero .num', x => x.textContent)), 'Mistigrix femelle sheet: name + number');
// ---- Méga-Mistigrix in Z-A: female Mistigrix + gem ⇒ Méga caught; gem button on the female sheet
await p.evaluate(() => { localStorage.clear(); }); await p.reload({ waitUntil: 'networkidle0' }); await sleep(600);
let t = await sheet('678-female', 'za'); ok(t.includes('Capturé=off') && t.some(x => /Gemme|ite/.test(x) && !x.includes('(dis)')), 'Mistigrix femelle in Z-A (game list completed): Capturé + Méga-Gemme ' + t.join(' · '));
for (const [k, g] of [['876-female', 'zadlc'], ['902-female', 'la']]) { t = await sheet(k, g); const mv = await p.$$eval('section h2', hs => hs.map(h => h.textContent).join('|'));
  ok(t.includes('Capturé=off') && (await p.$eval('#dgame', e => e.value)) === g, `${k} in ${g}: sheet available ${t.join(' · ')} · ${mv.slice(0, 120)}`); }
await p.evaluate(() => { toggleMark(BY_KEY['678-female'], 'caught', 'za'); toggleGem(BY_KEY['678-male-mega'], 'za'); });
ok(await p.evaluate(() => isCaught(BY_KEY['678-male-mega'], 'za') && !isCaught(BY_KEY['678'], 'za')), 'Z-A: Mistigrix femelle + gem ⇒ Méga-Mistigrix caught');
const mdx = await p.evaluate(() => { MEGADEX = null; const m = megaDex(); return ['678', '678-female', '678-male-mega'].every(k => m.keys.has(k)); }); ok(mdx, 'Méga-Dex: Mistigrix mâle + femelle + Méga');
// ---- import of an old backup with female keys
await p.goto(BASE + '#/'); await sleep(300);
const fh = await p.$('#import'); const fs = await import('node:fs'); fs.writeFileSync('/tmp/v44c-backup.json', JSON.stringify({ caught_g: ['xy:3-female'], home_o: ['kalos:3-female'], home_sh: ['3-female'], fem_g: ['xy:3'] }));
await fh.uploadFile('/tmp/v44c-backup.json'); await sleep(800);
cg = await L('caught_g'); ho = await L('home_o'); hs = await L('home_sh');
ok(cg.includes('xy:3') && ho.includes('kalos:3') && hs.includes('3') && !(await p.evaluate(() => localStorage.getItem('fem_g'))), 'import of an old backup: migrated, fem_g ignored ' + JSON.stringify([cg, ho, hs]));
ok(!errs.length, 'no JS errors ' + JSON.stringify(errs));
await b.close(); process.exit(fails ? 1 : 0);
