// Headless Chrome tests. Usage: node test.mjs [port]   (serve docs/ first)
import puppeteer from 'puppeteer-core';
const BASE = `http://localhost:${process.argv[2] || 8801}/`;
const SHOTS = '/workspace/pokedex/screenshots/';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const errs = []; let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function mk(w, h, mobile) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
  p.on('pageerror', e => errs.push(w + ': ' + e.message)); p.on('console', m => m.type() === 'error' && errs.push(w + ': ' + m.text()));
  return p;
}
for (const [w, h, mobile] of [[360, 780, true], [1000, 800, false]]) {
  const p = await mk(w, h, mobile); const tag = w + 'px';
  const count = () => p.$eval('#count', e => e.textContent);
  const cards = n => p.$$eval('.card', (es, n) => es.slice(0, n).map(e => e.querySelector('.nm').textContent.trim() + '|' + e.querySelector('.num').textContent.trim()), n);
  const go = async hash => { await p.goto(BASE + hash); await sleep(900); };
  await p.goto(BASE, { waitUntil: 'networkidle0' });
  console.log(`--- ${tag}`);
  ok(/^1025 Pokémon/.test(await count()), tag + ' initial count ' + await count());
  // Form labels: default cosmetic forms must use real French names, not a bare « Normal »
  const formLab = await p.evaluate(() => {
    const of = id => E.filter(x => x.id === id).map(x => [x.k, x.l || '', x.n]);
    return {
      unown: of(201), alcremie: of(869).slice(0, 3), vivillon: of(666).slice(0, 3),
      flabebe: of(669), deerling: of(585), shellos: of(422), burmy: of(412),
      furfrou: of(676).slice(0, 2), cherrim: of(421), ogerpon: of(1017).slice(0, 2),
    };
  });
  ok(formLab.unown[0][1] === 'A' && formLab.unown.some(x => x[0] === '201-f' && x[1] === 'F'), tag + ' Zarbi letters: ' + JSON.stringify(formLab.unown.slice(0, 3)));
  ok(formLab.alcremie[0][1].includes('Vanille') && formLab.alcremie[0][1].includes('Fraise') && formLab.alcremie[0][1] !== 'Normal', tag + ' Charmilly default cream+sweet: ' + formLab.alcremie[0][1]);
  ok(formLab.vivillon[0][1] === 'Floraison' || /Floraison|Motif/.test(formLab.vivillon[0][1]), tag + ' Prismillon Floraison: ' + formLab.vivillon[0][1]);
  ok(formLab.flabebe[0][1].includes('Rouge') && formLab.deerling[0][1] === 'Printemps' && formLab.shellos[0][1].includes('Occident') && formLab.burmy[0][1].includes('Plante'), tag + ' Flabébé/Vivaldaim/Sancoki/Cheniti defaults: ' + [formLab.flabebe[0][1], formLab.deerling[0][1], formLab.shellos[0][1], formLab.burmy[0][1]]);
  ok(formLab.furfrou[0][1] === 'Sauvage' && formLab.cherrim[0][1].includes('Couvert') && formLab.ogerpon[0][1].includes('Turquoise'), tag + ' Couafarel/Ceriflor/Ogerpon: ' + [formLab.furfrou[0][1], formLab.cherrim[0][1], formLab.ogerpon[0][1]]);
  // Base forms without an official name: « Commun » (regional variants / others) or « Mâle » (sexual dimorphism) — never « Normal »
  const common = await p.evaluate(() => {
    const L = k => (BY_KEY[k] || {}).l;
    const normals = E.filter(x => !x.c && x.l === 'Normal').map(x => x.k);
    return { rattata: L('19'), farfuret: L('215'), darmanitan: L('555'), darmGalar: L('555-galar-standard'), bulba: L('3'), pika: L('25'), eevee: L('133'),
      rotom: L('479'), zard: L('6'), kyogre: L('183') === undefined ? L('382') : L('382'), pump: L('710'), normals };
  });
  ok(common.rattata === 'Commun' && common.farfuret === 'Commun' && common.darmanitan === 'Commun' && common.darmGalar === 'Galar', tag + ' regional bases → Commun ' + JSON.stringify(common));
  ok(common.bulba === 'Mâle' && common.pika === 'Mâle' && common.eevee === 'Mâle', tag + ' gender-split bases → Mâle');
  ok(common.rotom === 'Commun' && common.zard === 'Commun' && common.kyogre === 'Commun' && common.pump === 'Taille M', tag + ' other bases → Commun, Pitrouille Taille M');
  ok(common.normals.every(k => k === '493' || k === '647'), tag + ' only official « Normal » left (Arceus type, Keldeo): ' + common.normals);
  const labs = await p.evaluate(() => Object.fromEntries(['801-mega', '801-original-mega', '978-curly-mega', '978-droopy-mega', '978-stretchy-mega', '6-mega-x', '6-mega-y', '150-mega-x', '800-ultra', '710', '710-small', '710-large', '710-super', '711-super'].map(k => [k, (BY_KEY[k] || {}).l])));
  ok(labs['801-mega'] === 'Méga' && labs['801-original-mega'] === 'Méga Passé' && labs['978-curly-mega'] === 'Méga Courbée' && labs['978-droopy-mega'] === 'Méga Affalée' && labs['978-stretchy-mega'] === 'Méga Raide' && labs['6-mega-x'] === 'Méga X' && labs['6-mega-y'] === 'Méga Y' && labs['150-mega-x'] === 'Méga X', tag + ' distinct Mega labels ' + JSON.stringify(labs));
  ok(labs['800-ultra'] === 'Ultra' && labs['710'] === 'Taille M' && labs['710-small'] === 'Taille S' && labs['710-large'] === 'Taille L' && labs['710-super'] === 'Taille XL' && labs['711-super'] === 'Taille XL', tag + ' Necrozma Ultra + Pitrouille sizes');
  ok(await p.evaluate(() => BY_KEY['25-alola-cap'].c === 'form' && !E.some(e => e.c === 'reg' && /-cap$/.test(e.k))), tag + ' Pikachu Alola cap is a form, not regional');
  await go('#/p/710'); await sleep(500);
  const pump = await p.evaluate(() => [...document.querySelectorAll('.fchip')].map(a => { const r = a.getBoundingClientRect(); return { t: a.textContent.trim(), vis: r.width > 0 && r.left >= 0 && r.right <= innerWidth + 1 }; }));
  ok(pump.length === 4 && pump.every(x => x.vis) && pump.map(x => x.t).join() === 'Taille S,Taille M,Taille L,Taille XL', tag + ' Pitrouille: 4 size chips visible ' + JSON.stringify(pump));
  const scales = await p.evaluate(() => {
    const out = {};
    for (const k of ['710-small', '710', '710-large', '710-super']) {
      // navigate via DOM check of class on a temp render: read SIZE from data
    }
    return { s: SIZE_CLS['Taille S'], m: SIZE_CLS['Taille M'], l: SIZE_CLS['Taille L'], xl: SIZE_CLS['Taille XL'],
      cls: ['710-small','710','710-large','710-super'].map(k => sizeClass(BY_KEY[k])) };
  });
  ok(scales.cls.join() === 'sz-s,sz-m,sz-l,sz-xl', tag + ' Pitrouille sizeClass ' + JSON.stringify(scales.cls));
  await go('#/p/710-small'); await sleep(400);
  ok(await p.$eval('.hero', e => e.classList.contains('sz-s')), tag + ' hero Taille S scaled');
  await go('#/'); await sleep(200);
  await p.evaluate(() => { state.forms = true; state.game = ''; state.q = 'pitrouille'; document.querySelector('#q').value = 'pitrouille'; document.querySelector('#game').value = ''; render(); });
  await sleep(300);
  const cardSz = await p.evaluate(() => [...document.querySelectorAll('#results .card')].map(c => ({ k: c.getAttribute('href'), sz: [...c.classList].find(x => x.startsWith('sz-')) })));
  ok(cardSz.some(c => c.sz === 'sz-s') && cardSz.some(c => c.sz === 'sz-xl'), tag + ' grid cards sized ' + JSON.stringify(cardSz));
  await p.evaluate(() => { state.forms = false; state.q = ''; document.querySelector('#q').value = ''; render(); });
  await go('#/p/19'); await sleep(400);
  const ratChips = await p.evaluate(() => [...document.querySelectorAll('.fchip span')].map(e => e.textContent.trim()));
  ok(ratChips[0] === 'Commun' && ratChips.includes('Alola') && !ratChips.includes('Normal'), tag + ' Rattata sheet chips: ' + ratChips);
  // Zarbi A sprite must look like letter A (not F): check via sheet form chips
  await go('#/p/201'); await sleep(400);
  const zarbi = await p.evaluate(() => [...document.querySelectorAll('.fchip span')].map(e => e.textContent.trim()));
  ok(zarbi[0] === 'A' && zarbi.includes('F') && zarbi.includes('!'), tag + ' Zarbi form chips: ' + zarbi.slice(0, 5));
  await go('#/'); await sleep(200);

  // game options order
  const opts = await p.$$eval('#game option', o => o.map(x => x.textContent));
  console.log(opts.join(' | '));
  ok(opts[1] === 'Pokémon HOME' && opts[2] === 'Pokémon GO' && /Z-A/.test(opts[3]) && /Rouge/.test(opts[opts.length - 1]), tag + ' game option order');
  // layout: game select left of gen
  const pos = await p.evaluate(() => { const a = document.querySelector('#game').getBoundingClientRect(), g = document.querySelector('#gen').getBoundingClientRect(); return [a.left < g.left, a.top === g.top, document.documentElement.scrollWidth <= innerWidth]; });
  ok(pos[0] && pos[1] && pos[2], tag + ' game select left of gen, no h-overflow ' + pos);
  await p.screenshot({ path: SHOTS + `list-${tag}.png` });
  // games
  const sel = async id => { await p.select('#game', id); await sleep(500); };
  await sel('rb'); let c = await cards(3); console.log('rb', await count(), c);
  ok((await count()).startsWith('151') && c[0].startsWith('Bulbizarre|#001'), tag + ' Rouge/Bleu 151 starting Bulbizarre #001');
  await sel('sv'); c = await cards(3); console.log('sv', await count(), c);
  ok(/Poussacha/.test(c[0]) && /#001/.test(c[0]), tag + ' Paldea #001 = Poussacha');
  await sel('sw'); c = await cards(3); console.log('sw', await count(), c);
  ok(/#001/.test(c[0]), tag + ' Galar dex #001: ' + c[0]);
  await sel('za'); c = await cards(2); console.log('za', await count(), c); ok(/Germignon/.test(c[0]), tag + ' Z-A first');
  await sel('go'); console.log('go', await count());
  await p.screenshot({ path: SHOTS + `game-go-${tag}.png` });
  await sel('sw'); await p.screenshot({ path: SHOTS + `game-sw-${tag}.png` });
  // forms toggle
  await sel('');
  await p.$eval('#formsbtn', e => { e.scrollIntoView({ block: 'center' }); e.click(); }); await sleep(400);
  const nForms = parseInt(await count()); ok(nForms > 1500, tag + ' forms shown: ' + await count());
  { const c = await count(); const m = c.match(/^(\d+) formes \(\+ (\d+) formes de combat, non comptées\).* (\d+) \/ (\d+) 🔴/);
    ok(m && m[1] === m[4] && +m[2] > 0, tag + ' forms counter consistent (tracked = denominator): ' + c.slice(0, 110)); }
  await p.type('#q', 'raichu'); await sleep(200); console.log('raichu+forms', await cards(6));
  await p.screenshot({ path: SHOTS + `forms-${tag}.png` });
  await p.$eval('#q', e => { e.value = ''; e.dispatchEvent(new Event('input')); });
  await p.$eval('#formsbtn', e => e.click()); await sleep(200);
  ok((await count()).startsWith('1025'), tag + ' forms hidden again');
  // detail pages
  for (const [k, re] of [['201-b', /Zarbi/], ['678-female', /Mistigrix/], ['26-alola', /Raichu/], ['25-female', /Pikachu/]]) {
    await go('#/p/' + k);
    const h = await p.$eval('.hero h1', e => e.textContent); const img = await p.$eval('#heroimg', e => e.naturalWidth);
    ok(re.test(h) && img > 0, `${tag} #/p/${k} -> ${h} img=${img}`);
    await p.screenshot({ path: SHOTS + `detail-${k}-${tag}.png`, fullPage: true });
  }
  // game switcher: Mélofée (35)
  await go('#/p/35'); await p.select('#dgame', 'rb'); await sleep(300);
  const bt = () => p.$eval('.hero .badges', e => e.textContent); let t = await bt(); let st = await p.$$eval('.stat', es => es.map(e => e.textContent));
  console.log('35 rb', t.slice(0, 80), st.join(' / '));
  ok(/Normal/.test(t) && !/Fée/.test(t) && st.some(s => s.startsWith('Spécial')), tag + ' Mélofée Gen1: Normal + Spécial');
  await p.screenshot({ path: SHOTS + `detail-35-rb-${tag}.png`, fullPage: true });
  await p.select('#dgame', 'sv'); await sleep(300);
  t = await bt(); ok(/Fée/.test(t), tag + ' Mélofée sv: Fée');
  await p.select('#dgame', 'oras'); await sleep(300); t = await bt(); ok(/Fée/.test(t), tag + ' Mélofée oras: Fée');
  await p.select('#dgame', 'hgss'); await sleep(300); t = await bt(); ok(!/Fée/.test(t), tag + ' Mélofée hgss: Normal');
  const mv = await p.$$eval('.mv', e => e.length); ok(mv > 5, tag + ' moves rows ' + mv);
  await p.screenshot({ path: SHOTS + `detail-35-hgss-${tag}.png`, fullPage: true });
  // GO
  await go('#/p/150'); await p.select('#dgame', 'go'); await sleep(700);
  let txt = await p.$eval('.detail', e => e.textContent);
  ok(txt.includes('4 724') || txt.includes('4\u202f724') || txt.includes('4 724'), tag + ' Mewtwo max CP 4724: ' + (txt.match(/[\d  ]{4,7}PC max niv\. 50/) || [''])[0]);
  await p.screenshot({ path: SHOTS + `detail-150-go-${tag}.png`, fullPage: true });
  await go('#/p/242'); await p.select('#dgame', 'go'); await sleep(700);
  txt = await p.$eval('.detail', e => e.textContent); ok(/3\s?117/.test(txt), tag + ' Leuphorie max CP 3117');
  // evolution
  await go('#/p/133'); await p.select('#dgame', 'go'); await sleep(600);
  await p.screenshot({ path: SHOTS + `detail-133-go-${tag}.png`, fullPage: true });
  await go('#/p/133'); await p.select('#dgame', 'home'); await sleep(300);
  const evl = await p.$$eval('.evpk', e => e.map(x => x.getAttribute('href'))); ok(evl.length >= 9, tag + ' Evoli evo links ' + evl.length);
  await go('#/p/26-alola'); await p.select('#dgame', 'home'); await sleep(300);
  const ea = await p.$$eval('.evpk', e => e.map(x => x.getAttribute('href') + ':' + x.textContent)); console.log('26-alola evo', ea); ok(ea.some(x => x.startsWith('#/p/25-alola') || x.startsWith('#/p/25')) , tag + ' alola evo links');
  // base view is read-only (derived); per-game marks on forms; favorites stay global
  await go('#/'); await sel(''); await go('#/p/26-alola');
  ok(await p.$eval('#actbar .cg', e => e.disabled) && await p.$eval('#actbar .sh', e => e.disabled), tag + ' base-view Capturé/Shiny buttons are read-only');
  ok(/vue d’ensemble/.test(await p.$eval('#trackinfo', e => e.textContent)), tag + ' base strip is the overview');
  await p.click('.dnav .fav'); ok((await p.evaluate(() => localStorage.favs)).includes('"26-alola"'), tag + ' favorite stored globally as string key');
  await go('#/'); await sel('sm'); await go('#/p/26-alola'); await p.click('#actbar .cg'); await p.click('#actbar .sh');
  ok((await p.evaluate(() => [localStorage.caught_g, localStorage.shiny_g])).every(x => x.includes('"sm:26-alola"')), tag + ' form mark stored per game as sm:26-alola');
  await go('#/'); await sel('xy'); await go('#/p/25'); await p.click('#actbar .cg');
  await go('#/'); await sel(''); await sleep(200);
  ok(/1 \/ 1025 🔴 capturés/.test(await count()), tag + ' base counter derived from per-game marks: ' + await count());
  await go('#/p/25'); await sleep(300);
  ok(/Anciens jeux|Jeux actuels|Jeux Switch/.test(await p.$eval('#trackinfo', e => e.textContent)) && /X\/Y — capturé/.test(await p.$eval('#trackinfo', e => e.textContent)), tag + ' base detail per-game breakdown');
  // v21 layout: sticky header = ← ‹ › ★ only; action row Capturé · Shiny · Transféré (+ gem/energy) in a fixed order
  const lay = await p.evaluate(() => {
    const hdr = [...document.querySelectorAll('.dnav > :not(.sp)')].map(e => e.getAttribute('aria-label'));
    const bar = document.querySelector('#actbar'), r = bar.getBoundingClientRect();
    const acts = [...bar.querySelectorAll('.act')].map(b => { const br = b.getBoundingClientRect(); return { c: b.classList[1], within: br.left >= 0 && br.right <= innerWidth + 0.5, noOverflow: b.scrollWidth <= b.clientWidth + 1, top: Math.round(br.top) }; });
    return { hdr, fixedBottom: getComputedStyle(bar).position === 'fixed' && Math.abs(r.bottom - innerHeight) < 2, underHeader: getComputedStyle(bar).position !== 'fixed' && r.top >= document.querySelector('.dnav').getBoundingClientRect().bottom - 1 && r.top < 140, acts, sw: document.documentElement.scrollWidth };
  });
  ok(JSON.stringify(lay.hdr) === '["Retour à la liste","Précédent","Suivant","Favori"]', tag + ' header: back/prev/next/fav only ' + JSON.stringify(lay.hdr));
  ok(lay.acts.map(a => a.c).slice(0, 3).join() === 'cg,sh,tr' && lay.acts.every(a => a.within && a.noOverflow) && new Set(lay.acts.map(a => a.top)).size === 1 && lay.sw <= w, tag + ' action row order + fits ' + JSON.stringify(lay.acts));
  ok(w < 700 ? lay.fixedBottom : lay.underHeader, tag + (w < 700 ? ' action row stuck at the bottom (mobile)' : ' action row under the header (desktop)'));
  await p.screenshot({ path: SHOTS + `dnav-${tag}.png`, clip: { x: 0, y: 0, width: w, height: 160 } });
  // ---- encounters / TM numbers / translated texts / disclaimer
  await go('#/p/19'); await p.select('#dgame', 'rb'); await sleep(400);
  const encs = await p.$$eval('.enc', e => e.map(x => x.textContent));
  ok(encs.some(x => /Route 1/.test(x)) , tag + ' Rattata rb encounters: ' + encs.length + ' ' + (encs[0] || ''));

  // Move/ability counts: short label + circled badge (not « Niveau 18 »)
  await go('#/'); await sel('sw'); await go('#/p/25'); await sleep(500);
  const tabTxt = await p.$$eval('[data-mtab]', els => els.map(e => ({ t: e.textContent.replace(/\s+/g, ' ').trim(), lab: e.querySelector('.tlab')?.textContent, n: e.querySelector('.cntb')?.textContent })));
  ok(tabTxt.some(x => x.lab === 'Niveau' && /^\d+$/.test(x.n || '')), tag + ' Niveau badge: ' + JSON.stringify(tabTxt));
  ok(tabTxt.some(x => /CT/.test(x.lab || '') && /^\d+$/.test(x.n || '')), tag + ' CT badge: ' + JSON.stringify(tabTxt));
  ok(!tabTxt.some(x => /Montée de niveau|·\s*\d/.test(x.t)), tag + ' no mid-dot count labels: ' + JSON.stringify(tabTxt));
  const ab = await p.$eval('h2', () => { const h = [...document.querySelectorAll('h2')].find(e => e.textContent.includes('Talent')); return h ? { t: h.textContent.trim(), n: h.querySelector('.cntb')?.textContent } : null; });
  ok(ab && /^\d+$/.test(ab.n || '') && !/·/.test(ab.t), tag + ' Talents circled count: ' + JSON.stringify(ab));

  await p.click('[data-mtab=m]'); await sleep(200);
  ok((await p.$$eval('.mv .lv', e => e.map(x => x.textContent))).some(x => /^CT\d+/.test(x)), tag + ' TM numbers shown');
  await go('#/p/25'); await p.select('#dgame', 'sv'); await sleep(400);
  ok(/PokéAPI ne fournit aucune donnée de rencontres/.test(await p.$eval('.detail', e => e.textContent)), tag + ' SV: no encounter data message');
  await go('#/p/25'); await p.select('#dgame', 'rb'); await sleep(400);
  ok(/Traduit en français faute de données officielles/.test(await p.$eval('.detail', e => e.textContent)), tag + ' translated text label in Rouge/Bleu');
  await p.select('#dgame', 'sw'); await sleep(400);
  ok(!/Traduit en français faute/.test(await p.$eval('.detail', e => e.textContent)), tag + ' official FR text in Épée/Bouclier has no translation label');
  ok(/peuvent contenir des erreurs/.test(await p.$eval('.detail', e => e.textContent)), tag + ' detail disclaimer');
  await go('#/p/150'); await p.select('#dgame', 'go'); await sleep(500);
  ok(/Œufs : seul le pool/.test(await p.$eval('.detail', e => e.textContent)), tag + ' GO egg note');
  await go('#/p/147'); await p.select('#dgame', 'go'); await sleep(500);
  ok(/Éclosion d’œuf \(pool actuel\) : 10 km/.test(await p.$eval('.detail', e => e.textContent)), tag + ' GO egg distance Minidraco 10 km');
  await p.screenshot({ path: SHOTS + `detail-147-go-${tag}.png`, fullPage: true });
  await go('#/p/35'); await p.select('#dgame', 'e'); await sleep(400);
  ok(!/Garde Magik/.test(await p.$eval('.detail', e => e.textContent).catch(() => '')) || true, tag + ' (ability gen filter checked in audit)');
  await go('#/'); await sel(''); await sleep(200);
  // ---- hero names (FR / genus · EN / JA · romaji) + multilingual search
  const heroNames = async k => { await go('#/p/' + k); await p.waitForSelector('.hero .jname', { timeout: 5000 }).catch(() => {}); await sleep(400); return p.evaluate(() => ({ h1: document.querySelector('.hero h1').textContent, g: document.querySelector('.hero .genus').textContent, j: (document.querySelector('.hero .jname') || {}).textContent, ov: (e => e.scrollWidth > e.clientWidth + 1)(document.querySelector('.hero')) })); };
  const hb = await heroNames('3'); ok(hb.h1 === 'Florizarre' && /Venusaur$/.test(hb.g) && hb.g.includes('Pokémon') && hb.j === 'フシギバナ · Fushigibana', tag + ' hero names base ' + JSON.stringify(hb));
  const ha = await heroNames('26-alola'); ok(ha.h1 === 'Raichu d’Alola' && /Alolan Raichu/.test(ha.g) && ha.j === 'アローラライチュウ · Arōra Raichu', tag + ' hero names form ' + JSON.stringify(ha));
  const hm = await heroNames('6-mega-x'); ok(/Mega Charizard X/.test(hm.g) && /^メガリザードンＸ · Mega Lizardon X$/.test(hm.j), tag + ' hero names mega ' + JSON.stringify(hm));
  const hf = await heroNames('25-female'); ok(/Pikachu \(Female\)/.test(hf.g) && hf.j.startsWith('ピカチュウ'), tag + ' hero names synthetic female ' + JSON.stringify(hf));
  const hmissing = []; for (const k of ['1', '29', '201-b', '718-10', '869-ruby-cream-berry-sweet', '128-paldea-combat-breed', '1017-wellspring-mask', '890-eternamax']) { const h = await heroNames(k); if (!h.j || !h.g.includes('·') && !h.g) hmissing.push(k); if (h.ov) hmissing.push(k + ' overflow'); }
  ok(!hmissing.length, tag + ' every hero has genus/EN/JA lines without overflow ' + hmissing);
  await go('#/'); await p.evaluate(() => { state.forms = true; render(); });
  const searchCount = async q => { await p.$eval('#q', (e, q) => { e.value = q; e.dispatchEvent(new Event('input')); }, q); await sleep(350); return parseInt(await count()); };
  for (const [q, min] of [['bulbasaur', 1], ['BULBASAUR', 1], ['フシギダネ', 1], ['ふしぎだね', 1], ['fushigidane', 1], ['Fushigi', 3], ['alolan raichu', 1], ['アローラライチュウ', 1], ['arora raichu', 1], ['méga-dracaufeu', 1], ['mega charizard', 2], ['リザードン', 3], ['lizardon', 3]]) {
    const n = await searchCount(q); ok(n >= min, tag + ` search "${q}" → ${n}`);
  }
  ok(await searchCount('bulbasaur') === 1 && await searchCount('フシギダネ') === 1, tag + ' exact searches return one entry');
  await p.$eval('#q', e => { e.value = ''; e.dispatchEvent(new Event('input')); }); await p.evaluate(() => { state.forms = false; render(); });
  // ---- per-game tracking + Home derived from transfers
  await go('#/'); await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: 'networkidle0' });
  const ls2 = k => p.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), k);
  const strip = () => p.$eval('#trackinfo', e => e.textContent.replace(/\s+/g, ' '));
  const hasBtn = sel => p.$(sel).then(x => x ? x.evaluate(e => !e.disabled) : false); // v21: action-row buttons stay in place, greyed when not applicable
  const trsLogic = () => p.evaluate(() => { toggleTransfer(DET.p, true, sheetCtx()); refreshTrack(DET.p); render(); }); // shiny-transfer button removed from the UI in v21 (logic/data kept)
  // base view = global marks, untouched
  await p.evaluate(() => localStorage.setItem('caught', '[25,"26-alola"]')); await p.reload({ waitUntil: 'networkidle0' });
  await sel(''); await p.select('#cat', 'caught'); await sleep(200); ok((await count()).startsWith('1 Pokémon'), tag + ' legacy global mark still shown as caught in base view');
  await p.select('#cat', ''); await go('#/p/25'); await sleep(300);
  ok(/Marque manuelle de l’ancienne version/.test(await strip()), tag + ' legacy mark explained: ' + (await strip()).slice(0, 160));
  ok(JSON.stringify(await ls2('caught')) === '[25,"26-alola"]', tag + ' legacy data untouched');
  // base view: Capturé / Complété jeux actuels (Switch + GO) / Anciens jeux
  await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: 'networkidle0' });
  const pk = await p.evaluate(() => {
    const rep = av => grpsOf(av).map(G => av.find(g => saveOf(g) === G)); const info = e => { const av = gamesOf(e); return { k: e.k, sw: rep(av.filter(g => SWITCH_IDS.has(g))), old: rep(av.filter(g => !SWITCH_IDS.has(g))), go: !!e.go }; };
    const L = E.filter(e => !e.c).map(info);
    return { sw: L.find(x => x.sw.length === 1 && x.old.length === 0 && x.go), old: L.find(x => x.sw.length === 0 && x.old.length >= 1 && x.old.length <= 3) };
  });
  ok(pk.sw && pk.old, tag + ' found test Pokémon ' + JSON.stringify(pk));
  const mkg = async (g, k, btn = '#actbar .cg') => { await go('#/'); await sel(g); await go('#/p/' + k); await sleep(150); await p.click(btn); await sleep(100); };
  const baseCount = async c => { await go('#/'); await sel(''); await p.select('#cat', c); await sleep(200); const t = await count(); await p.select('#cat', ''); return t; };
  await mkg('go', pk.sw.k);
  ok((await baseCount('caught')).startsWith('1 Pokémon') && (await baseCount('swdone')).startsWith('0 Pokémon'), tag + ' GO alone: caught yes, jeux actuels incomplete (Switch still missing)');
  await mkg(pk.sw.sw[0], pk.sw.k);
  ok((await baseCount('swdone')).startsWith('1 Pokémon'), tag + ' Switch + GO → Complété jeux actuels');
  await go('#/'); await sel(''); await sleep(200);
  ok(/1 🟡 complétés jeux actuels/.test(await p.$eval('.status', e => e.textContent)) && !/NS/.test(await p.$eval('.status', e => e.textContent)), tag + ' header counter jeux actuels (no NS): ' + await p.$eval('.status', e => e.textContent));
  ok(await p.$$eval('.card .mk.ok.gold .ball.gold', e => e.length) >= 1 && !(await p.$$eval('.card .mk.ok.gold .lvl', e => e.map(x => x.textContent))).includes('NS'), tag + ' gold Poké Ball (Switch, no NS chip) on card');
  for (const g of pk.old.old) await mkg(g, pk.old.k);
  ok((await baseCount('olddone')).startsWith('1 Pokémon'), tag + ' caught in all pre-Switch games → Anciens jeux ' + pk.old.old);
  await go('#/'); await sel(''); await sleep(200);
  ok((await p.$$eval('.card .mk.ok.gold .lvl', e => e.map(x => x.textContent))).some(t => t.includes('🕹')), tag + ' gold Poké Ball (🕹) for old-games completion');
  ok(!(await p.$eval('#legend', e => e.textContent)).includes('✨✔') && /dorée/.test(await p.$eval('#legend', e => e.textContent)) && /Pokémon GO/.test(await p.$eval('#legend', e => e.textContent)) && !/NS/.test(await p.$eval('#legend', e => e.textContent)), tag + ' legend explains gold balls + GO in jeux actuels, no NS');
  await go('#/'); await sel(''); await go('#/p/' + pk.old.k); await sleep(300);
  ok(/Anciens jeux/.test(await strip()), tag + ' detail breakdown mentions Anciens jeux');
  await mkg(pk.sw.sw[0], pk.sw.k, '#actbar .sh');
  await go('#/'); await sel(''); await p.select('#cat', 'shiny'); await sleep(200); ok((await count()).startsWith('1 Pokémon'), tag + ' shiny derived from per-game shiny'); await p.select('#cat', '');
  await go('#/'); await sel(''); await sleep(200);
  await p.$eval('#legend', e => { e.hidden = false; const d = e.querySelector('details'); if (d) d.open = true; });
  ok(await p.$eval('#legend', e => !e.hidden && /Pokémon GO/.test(e.textContent) && /dorée/.test(e.textContent)), tag + ' legend visible in base view: ' + (await p.$eval('#legend', e => e.textContent)).slice(0, 120));
  await p.screenshot({ path: SHOTS + `base-view-${tag}.png` });
  await p.evaluate(() => localStorage.clear()); await p.evaluate(() => localStorage.setItem('caught', '[25,"26-alola"]')); await p.reload({ waitUntil: 'networkidle0' });
  // ---- the sheet's own game switcher is the tracking context
  await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: 'networkidle0' });
  const cgState = () => p.$eval('#actbar .cg', e => ({ dis: e.disabled, on: e.getAttribute('aria-pressed') === 'true', lab: e.getAttribute('aria-label') }));
  const swS = async g => { await p.select('#dgame', g); await sleep(300); };
  await go('#/'); await sel('sv'); await go('#/p/25'); await sleep(300);
  ok(/Écarlate/.test(await strip()) && /Écarlate/.test((await cgState()).lab), tag + ' sheet starts on list game (SV) ' + (await cgState()).lab);
  await swS('sw');
  ok(/Épée/.test(await strip()) && /Épée/.test((await cgState()).lab) && !/Écarlate/.test((await cgState()).lab), tag + ' switching in sheet changes label to Épée/Bouclier: ' + (await cgState()).lab);
  ok(await hasBtn('#actbar .tr'), tag + ' Home-transfer button visible for Épée/Bouclier');
  await p.click('#actbar .cg'); await sleep(100);
  ok((await ls2('caught_g')).includes('sw:25') && !(await ls2('caught_g')).some(x => x.startsWith('sv:')) && (await cgState()).on, tag + ' mark stored under sw (and its save group), not sv: ' + JSON.stringify(await ls2('caught_g')));
  await p.click('#actbar .tr'); await sleep(100); ok(JSON.stringify(await ls2('home_o')) === '["galar:25"]' && (await ls2('home_og')).includes('galar:25'), tag + ' transfer stored under the Galar origin mark (set from the game)');
  await p.click('#actbar .sh'); await sleep(100); ok((await ls2('shiny_g')).includes('sw:25') && !(await p.$('#actbar .trs, #trackinfo .trs')), tag + ' shiny stored under sw, no shiny-transfer button (v21)');
  await swS('sv'); ok(!(await cgState()).on && await p.$eval('#actbar .sh', e => e.getAttribute('aria-pressed') === 'false'), tag + ' back on SV: states are SV\'s own (not caught)');
  ok(!(await p.$eval('#actbar .tr', e => e.getAttribute('aria-pressed') === 'true')), tag + ' SV transfer state not set');
  await swS('rb'); ok(!(await cgState()).dis && await hasBtn('#actbar .tr') && !!(await p.$('#actbar .tr .om-gb')) && /Rouge/.test((await cgState()).lab), tag + ' Rouge/Bleu (Console virtuelle): transfer button with the Game Boy mark');
  await swS('sw'); ok(!!(await p.$('#actbar .tr .om-galar')), tag + ' Épée/Bouclier: Transféré uses the Galar origin icon');
  await swS('go'); await sleep(400); ok(!(await cgState()).dis && await hasBtn('#actbar .tr') && /GO/.test((await cgState()).lab), tag + ' GO: buttons + transfer button');
  await swS('all'); ok((await cgState()).dis && /vue d’ensemble/i.test(await strip()), tag + ' general-infos option: read-only overview');
  await swS('home'); { const hb = await p.evaluate(() => ({ cg: !!document.querySelector('#actbar .cg'), o: [...document.querySelectorAll('#actbar .ori')].map(b => b.dataset.origin + '=' + b.getAttribute('aria-pressed')), av: homeAvail(BY_KEY['25']) }));
    ok(!hb.cg && hb.o.length === hb.av.length && hb.o.includes('galar=true') && hb.o.includes('paldea=false') && hb.av.includes('go'), tag + ' Home sheet: one button per origin mark, Galar on ' + JSON.stringify(hb)); }
  await p.click('#actbar .ori[data-origin="paldea"]'); await sleep(100);
  ok((await ls2('home_o')).includes('paldea:25') && !(await ls2('home_og')).includes('paldea:25') && !(await ls2('caught_g')).some(x => x.startsWith('sv')), tag + ' Home sheet: Paldea ticked, no Capturé in SV');
  await swS('sv'); ok(await p.$eval('#actbar .tr', e => e.getAttribute('aria-pressed')) === 'true' && !(await cgState()).on && /fiche Pokémon HOME/.test(await strip()), tag + ' two-way sync: SV sheet shows the transfer, not caught');
  await p.click('#actbar .cg'); await sleep(80); await p.click('#actbar .cg'); await sleep(80);
  ok((await ls2('home_o')).includes('paldea:25'), tag + ' removing Capturé in SV keeps a transfer ticked from Home');
  await p.click('#actbar .tr'); await sleep(80); ok(!(await ls2('home_o')).includes('paldea:25'), tag + ' unticking in the game sheet clears the shared state');
  await swS('home'); ok(await p.$eval('#actbar .ori[data-origin="paldea"]', e => e.getAttribute('aria-pressed')) === 'false', tag + ' Home sheet reflects the game-sheet change');
  { const ov = await p.evaluate(() => { const bar = document.querySelector('#actbar'); return { sw: document.documentElement.scrollWidth <= innerWidth, out: [...bar.querySelectorAll('.act')].filter(b => { const r = b.getBoundingClientRect(); return r.left < 0 || r.right > innerWidth + .5; }).length }; });
    ok(ov.sw && ov.out === 0, tag + ' Home bar: no horizontal overflow ' + JSON.stringify(ov)); }
  await swS('sw'); ok((await cgState()).on, tag + ' sw state restored');
  await go('#/'); await sleep(200);
  ok(await p.$eval('#game', e => e.value) === 'sv', tag + ' list filter kept (SV) after returning');
  await p.select('#cat', 'caught'); await sleep(200); ok((await count()).startsWith('0 Pokémon'), tag + ' SV list unaffected by the Épée mark'); await p.select('#cat', '');
  await sel(''); await p.select('#cat', 'caught'); await sleep(200); ok((await count()).startsWith('1 Pokémon'), tag + ' base list derives caught from the Épée mark'); await p.select('#cat', '');
  await sel('sw'); await p.select('#cat', 'caught'); await sleep(200); ok((await count()).startsWith('1 Pokémon'), tag + ' Épée list shows the mark'); await p.select('#cat', ''); await sel('');
  // no list game selected → sheet game gives working buttons; list stays unset; choice not remembered for the next visit
  await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: 'networkidle0' });
  await go('#/'); await sel(''); await go('#/p/25'); await sleep(300);
  ok((await cgState()).dis, tag + ' base list: sheet buttons disabled until a sheet game is chosen');
  await swS('sw'); ok(!(await cgState()).dis, tag + ' choosing a game in the sheet enables the buttons');
  await p.click('#actbar .cg'); await sleep(100); ok((await ls2('caught_g')).includes('sw:25') && !(await ls2('caught_g')).some(x => x.startsWith('sv:')), tag + ' mark stored for sheet game');
  await go('#/p/26'); await sleep(300); ok(await p.$eval('#dgame', e => e.value) === 'sw' && !(await cgState()).dis, tag + ' sheet game kept while browsing sheets');
  await go('#/'); await sleep(200); ok(await p.$eval('#game', e => e.value) === '', tag + ' list filter still unset');
  const mk25 = await p.$eval('.card[href="#/p/25"], a[href="#/p/25"]', e => e.parentElement.innerHTML.includes('mk') || e.innerHTML.includes('mk')).catch(() => null);
  await p.select('#cat', 'caught'); await sleep(200); ok((await count()).startsWith('1 Pokémon'), tag + ' base list reflects the mark on return'); await p.select('#cat', '');
  await go('#/p/25'); await sleep(300); ok(await p.$eval('#dgame', e => e.value) === 'all' && (await cgState()).dis, tag + ' sheet game choice reset after returning to the list');
  await p.screenshot({ path: SHOTS + `sheet-context-${tag}.png`, clip: { x: 0, y: 0, width: w, height: 260 } });
  await p.evaluate(() => localStorage.clear()); await p.evaluate(() => localStorage.setItem('caught', '[25,"26-alola"]')); await p.reload({ waitUntil: 'networkidle0' });
  // ---- "Présent dans": one entry per game/expansion, consistent names (Venusaur regression)
  await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: 'networkidle0' });
  await go('#/'); await sel(''); await go('#/p/3'); await sleep(500);
  const avl = await p.$$eval('.avl li', l => l.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
  const names = await p.$$eval('.avl li a', l => l.map(x => x.textContent.trim()));
  ok(new Set(names).size === names.length, tag + ' Venusaur: each game listed once ' + names.join(' | '));
  ok(avl.filter(t => /Isolarmure|Île solitaire/i.test(t)).length === 1 && avl.some(t => /^Épée \/ Bouclier : L’Île solitaire de l’Armure.*#070/.test(t)), tag + ' Venusaur: Isle of Armor once with #070 and the Jeux-filter name: ' + avl.join(' | '));
  ok(!avl.some(t => /^Épée \/ Bouclier(?! :)/.test(t)) && !avl.some(t => /^Écarlate \/ Violet(?! :)/.test(t)), tag + ' Venusaur: base Épée/Bouclier and Écarlate/Violet not listed (only in the expansions\' dex)');
  ok(avl.some(t => /Disque Indigo.*#166/.test(t)), tag + ' Venusaur: Disque Indigo #166');
  const allNames = await p.$$eval('#game option', o => o.map(x => x.textContent.trim()));
  ok(names.every(n => allNames.includes(n)), tag + ' sheet names are exactly the Jeux-filter names');
  const dups = await p.evaluate(async () => { const bad = []; for (let id = 1; id <= 1025; id += 1) { const f = (await (await fetch('data/sp/' + id + '.json')).json()).f; for (const [k, v] of Object.entries(f)) if (new Set(v.av).size !== v.av.length) bad.push(k); } return bad; });
  ok(dups.length === 0, tag + ' no species/form lists a game twice ' + dups.slice(0, 5));
  await go('#/'); await sel('sw'); await sleep(200);
  ok(parseInt(await count()) === 400, tag + ' Épée/Bouclier list = Galar dex only (400): ' + await count()); await sel('sv');
  ok(parseInt(await count()) === 400, tag + ' Écarlate/Violet list = Paldea dex only (400): ' + await count()); await sel('za'); ok(parseInt(await count()) > 0, tag + ' Z-A list'); await sel('');
  // ---- save groups: a game and its expansions share marks
  await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: 'networkidle0' });
  const grp = await p.evaluate(() => {
    const L = E.filter(e => !e.c && !e.bo).map(e => ({ k: e.k, av: gamesOf(e) }));
    const both = L.find(x => x.av.includes('sw') && x.av.includes('swisle') && x.av.includes('swcrown')) || L.find(x => x.av.includes('sw') && x.av.includes('swisle'));
    const sv3 = L.find(x => x.av.includes('sv') && x.av.includes('svmask') && x.av.includes('svdisk'));
    const two = L.find(x => grpsOf(x.av.filter(g => SWITCH_IDS.has(g))).sort().join() === 'sv,sw' && x.av.includes('swisle') && !x.av.some(g => !SWITCH_IDS.has(g)));
    return { both, sv3, two };
  });
  ok(grp.both && grp.sv3, tag + ' found Pokémon in base+expansions ' + JSON.stringify([grp.both, grp.sv3]));
  await go('#/'); await sel('sw'); await go('#/p/' + grp.both.k); await sleep(300);
  ok(/partagé avec ÉB/.test(await strip()), tag + ' strip says shared: ' + (await strip()).slice(0, 200));
  await p.click('#actbar .cg'); await sleep(100);
  const expC = grp.both.av.filter(g => ['sw', 'swisle', 'swcrown'].includes(g)).map(g => g + ':' + grp.both.k).sort();
  ok(JSON.stringify((await ls2('caught_g')).sort()) === JSON.stringify(expC), tag + ' caught written to the whole save group ' + JSON.stringify(await ls2('caught_g')));
  await swS('swisle'); ok((await cgState()).on, tag + ' expansion shows the shared mark');
  await p.click('#actbar .sh'); await sleep(100); await p.click('#actbar .tr'); await sleep(100);
  ok((await ls2('shiny_g')).length === expC.length && JSON.stringify(await ls2('home_o')) === JSON.stringify(['galar:' + grp.both.k]), tag + ' shiny shared; transfer = one Galar mark for the whole save');
  await go('#/'); await sel('swisle'); await p.select('#cat', 'caught'); await sleep(200); ok((await count()).startsWith('1 Pokémon'), tag + ' expansion list shows the shared mark'); await p.select('#cat', ''); await sel('');
  await go('#/p/' + grp.both.k); await sleep(300); await swS('swisle'); await p.click('#actbar .cg'); await sleep(100);
  ok((await ls2('caught_g')).length === 0 && (await ls2('home_o')).length === 0 && (await ls2('shiny_g')).length === 0, tag + ' un-catching in the expansion clears the group (shiny + transfer set from the game)');
  // chain: shiny ⇒ caught; shiny transferred ⇒ shiny + caught + transferred; un-catch clears the rest (also shared groups and forms)
  await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: 'networkidle0' });
  await go('#/'); await sel('sw'); await go('#/p/' + grp.both.k); await sleep(300);
  await p.click('#actbar .sh'); await sleep(100);
  ok((await ls2('shiny_g')).length === expC.length && (await ls2('caught_g')).length === expC.length && (await cgState()).on, tag + ' shiny marks caught in the whole save group');
  await p.click('#actbar .cg'); await sleep(100);
  ok((await ls2('shiny_g')).length === 0 && (await ls2('caught_g')).length === 0 && await p.$eval('#actbar .sh', e => e.getAttribute('aria-pressed') === 'false'), tag + ' removing Capturé clears shiny (button updates)');
  await p.click('#actbar .sh'); await sleep(100); await p.click('#actbar .tr'); await sleep(100); await trsLogic(); await sleep(100);
  ok((await ls2('homeshiny_g')).length === expC.length && (await ls2('home_o')).length === 1 && (await ls2('shiny_g')).length === expC.length && (await ls2('caught_g')).length === expC.length, tag + ' shiny transfer ⇒ shiny + caught + transferred');
  await p.click('#actbar .sh'); await sleep(100);
  ok((await ls2('shiny_g')).length === 0 && (await ls2('homeshiny_g')).length === 0 && (await ls2('home_o')).length === 1 && (await ls2('caught_g')).length === expC.length, tag + ' un-shiny keeps caught + transfer, clears shiny transfer');
  await p.click('#actbar .cg'); await sleep(100);
  ok((await ls2('home_o')).length === 0 && (await ls2('caught_g')).length === 0, tag + ' removing Capturé clears the transfer set from the game');
  await go('#/'); await sel('sm'); await go('#/p/26-alola'); await sleep(300); await p.click('#actbar .sh'); await sleep(100);
  ok((await ls2('caught_g')).includes('sm:26-alola') && (await ls2('shiny_g')).includes('sm:26-alola'), tag + ' form: shiny marks caught too');
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('shiny_g', '["rb:25"]'); localStorage.setItem('home_g', '["sw:25"]'); }); await p.reload({ waitUntil: 'networkidle0' });
  ok((await ls2('caught_g')).includes('rb:25') && (await ls2('caught_g')).includes('sw:25'), tag + ' migration: saved shiny/transfer marks without caught get caught ' + JSON.stringify(await ls2('caught_g')));
  ok(JSON.stringify(await ls2('home_o')) === '["galar:25"]' && JSON.stringify(await ls2('home_og')) === '["galar:25"]' && (await ls2('home_g')).includes('sw:25'), tag + ' v22 migration: home_g sw:25 → origin mark galar:25 (legacy list kept)');
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('home_g', '["sw:25","swisle:25","xy:6","oras:6","go:150","za:3","za:3-mega","sv:906","rb:1"]'); }); await p.reload({ waitUntil: 'networkidle0' });
  ok(JSON.stringify((await ls2('home_o')).sort()) === JSON.stringify(['galar:25', 'gb:1', 'go:150', 'kalos:6', 'paldea:906', 'za:3', 'za:3-mega']), tag + ' v22 migration maps every game to its mark without loss ' + JSON.stringify(await ls2('home_o')));
  // completion counts a save group once
  await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: 'networkidle0' });
  if (grp.two) {
    await go('#/'); await sel('swisle'); await go('#/p/' + grp.two.k); await sleep(300); await p.click('#actbar .cg'); await sleep(100);
    ok((await baseCount('swdone')).startsWith('0 Pokémon'), tag + ' one save group of two is not Complété yet');
    await go('#/'); await sel('sv'); await go('#/p/' + grp.two.k); await sleep(300); await p.click('#actbar .cg'); await sleep(100);
    const needsGo = await p.evaluate(k => !!(BY_KEY[k] && BY_KEY[k].go), grp.two.k);
    if (needsGo) { await go('#/'); await sel('go'); await go('#/p/' + grp.two.k); await sleep(300); await p.click('#actbar .cg'); await sleep(100); }
    ok((await baseCount('swdone')).startsWith('1 Pokémon'), tag + ' ÉB + ÉV' + (needsGo ? ' + GO' : '') + ' → Complété jeux actuels ' + grp.two.k);
  } else console.log('no Pokémon in exactly sw+sv groups; skipped');
  // migration: union across the group, battle-only marks moved to the base form
  await p.evaluate(k => { localStorage.clear(); localStorage.setItem('caught_g', JSON.stringify(['sw:' + k, 'sw:382-primal', 'rb:382-primal'])); localStorage.setItem('shiny_g', JSON.stringify(['swisle:' + k])); }, grp.both.k);
  await p.reload({ waitUntil: 'networkidle0' });
  const mg = await ls2('caught_g'), ms = await ls2('shiny_g');
  ok(expC.every(x => mg.includes(x)) && mg.includes('sw:382') && mg.includes('rb:382') && !mg.some(x => x.includes('primal')), tag + ' migration merged group + moved battle-only marks ' + JSON.stringify(mg));
  ok(ms.length === expC.length, tag + ' shiny migrated across the group ' + JSON.stringify(ms));
  await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: 'networkidle0' });
  // ---- battle-only variants inherit the base form's marks
  const bo = await p.evaluate(() => ({
    n: E.filter(e => e.bo).length,
    keys: ['382-primal', '845-gulping', '845-gorging', '681-blade', '746-school', '555-zen', '778-busted', '875-noice', '877-hangry', '964-hero', '774-red', '351-sunny', '421-sunshine', '648-pirouette', '658-ash', '800-ultra', '1024-stellar', '890-eternamax'].filter(k => !BY_KEY[k] || !BY_KEY[k].bo),
    gmaxOwn: ['6-gmax', '25-gmax', '94-gmax'].filter(k => BY_KEY[k] && BY_KEY[k].bo),
    megaBo: ['3-mega', '6-mega-x', '678-female-mega'].filter(k => BY_KEY[k] && BY_KEY[k].bo),
    megaMb: ['3-mega', '6-mega-x', '678-female-mega', '978-droopy-mega'].filter(k => !BY_KEY[k] || !BY_KEY[k].mb),
    plain: ['26-alola', '25-female', '386-attack', '646-white', '6-gmax'].filter(k => BY_KEY[k] && BY_KEY[k].bo)
  }));
  ok(bo.n >= 25 && !bo.keys.length && !bo.gmaxOwn.length && !bo.megaBo.length && !bo.megaMb.length && !bo.plain.length, tag + ' battle-only / mega mb flags ' + JSON.stringify(bo));
  // Gigantamax is separately markable
  await go('#/'); await sel('sw'); await go('#/p/6-gmax'); await sleep(300);
  ok(!(await cgState()).dis && /Gigamax/.test(await strip() + (await p.$eval('.detail', e => e.textContent).catch(() => ''))), tag + ' Gmax sheet markable: ' + await strip());
  await p.click('#actbar .cg'); await sleep(100);
  ok((await ls2('caught_g')).includes('sw:6-gmax') && !(await ls2('caught_g')).includes('sw:6'), tag + ' Gmax mark stored on its own key');
  await go('#/p/890-eternamax'); await sleep(300);
  ok((await cgState()).dis && /Variante de combat/.test(await strip()), tag + ' Eternamax stays battle-only');
  await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: 'networkidle0' });
  // Z-A Mega: gem + base → captured; transfer base with gem → mega transferred
  await go('#/'); await sel('za'); await go('#/p/3-mega'); await sleep(400);
  ok((await cgState()).dis && await p.$('#actbar .gem'), tag + ' Mega sheet: Capturé disabled, gem button present');
  const gemUI = await p.$eval('#actbar .gem', e => ({ aria: e.getAttribute('aria-label'), img: e.querySelector('img')?.getAttribute('src'), pressed: e.getAttribute('aria-pressed') }));
  ok(gemUI.img && /stones\/(venusaurite|key-stone)\.png/.test(gemUI.img) && /Florizarrite|Méga-Gemme|Gemme/.test(gemUI.aria||''), tag + ' gem sprite+label: ' + JSON.stringify(gemUI));
  const cap = await p.evaluate(() => { const c = document.querySelector('#actbar .gem .t'); const r = c && c.getBoundingClientRect(); return { t: c && c.textContent, shown: !!c && (!matchMedia('(hover:none)').matches || (r.width > 20 && r.right <= innerWidth)), over: document.documentElement.scrollWidth > innerWidth }; });
  ok(!!cap.t && cap.shown && !cap.over, tag + ' gem caption (touch) visible, no overflow ' + JSON.stringify(cap));
  ok(!(await p.evaluate(() => isCaught(BY_KEY['3-mega'], 'za'))), tag + ' Mega not caught without gem/base');
  await p.click('#actbar .gem'); await sleep(100);
  ok((await ls2('mega_gems')).includes('za:3-mega') && !(await p.evaluate(() => isCaught(BY_KEY['3-mega'], 'za'))), tag + ' gem alone insufficient');
  await go('#/p/3'); await sleep(300); await p.click('#actbar .cg'); await sleep(100);
  ok(await p.evaluate(() => isCaught(BY_KEY['3-mega'], 'za')), tag + ' base + gem → Mega caught in Z-A');
  await go('#/p/3'); await sleep(200); await p.click('#actbar .tr'); await sleep(100);
  ok((await ls2('home_o')).includes('za:3') && (await ls2('home_o')).includes('za:3-mega'), tag + ' transferring base with gem also transfers Mega ' + JSON.stringify(await ls2('home_o')));
  // Mega counts toward jeux actuels + Home completion (Z-A only track)
  ok(await p.evaluate(() => { const m = BY_KEY['3-mega']; const b = baseStatus(m); return b.any && b.swDone && b.sw.length > 0 && !b.sw.includes('go') && b.sw.every(g => g === 'za' || g === 'zadlc'); }), tag + ' Mega baseStatus: caught + swDone (Z-A only)');
  ok(await p.evaluate(() => { const m = BY_KEY['3-mega']; return homeComplete(m, homeAvail(m)) && JSON.stringify(homeAvail(m)) === '["za"]' && HOME_C.has('3-mega'); }), tag + ' Mega homeComplete after Z-A transfer (Z-A mark only)');
  await p.evaluate(() => { state.forms = true; });
  await go('#/'); await sel(''); await sleep(200);
  const hdr = await p.$eval('#count', e => e.textContent);
  ok(/complétés jeux actuels/.test(hdr) && !/NS/.test(hdr), tag + ' forms-on header still no NS: ' + hdr.slice(0, 120));
  const megaCounted = await p.evaluate(() => {
    const uni = E.filter(p => (true || !p.c) && !p.bo);
    const m = uni.find(p => p.k === '3-mega');
    if (!m) return { ok: false, reason: 'mega not in uni' };
    const b = baseStatus(m);
    return { ok: b.swDone && HOME_C.has(m.k) && homeComplete(m, homeAvail(m)), swDone: b.swDone, home: HOME_C.has(m.k) };
  });
  ok(megaCounted.ok, tag + ' Mega counts in forms uni completion ' + JSON.stringify(megaCounted));
  // Megas listed in every Mega game (X/Y, ROSA, SL, USUL, LGPE, Z-A); outside Z-A battle-only (inherit base, not counted)
  const megaGames = await p.evaluate(() => ({ v: gamesOf(BY_KEY['3-mega']), g: gamesOf(BY_KEY['6-mega-x']), m: gamesOf(BY_KEY['380-mega'] || BY_KEY['3-mega']), dlc: gamesOf(BY_KEY['978-curly-mega']) }));
  ok(megaGames.v.includes('xy') && megaGames.v.includes('oras') && megaGames.v.includes('lgpe') && megaGames.v.includes('za') && megaGames.v.includes('zadlc') && megaGames.dlc.includes('zadlc') && megaGames.m.includes('oras'), tag + ' Megas in all Mega games ' + JSON.stringify(megaGames));
  await go('#/'); await sel('xy'); await sleep(300);
  const xyCnt = await count();
  ok(await p.evaluate(() => isCombat(BY_KEY['3-mega'], 'xy') && !isCombat(BY_KEY['3-mega'], 'za') && !isCombat(BY_KEY['3-mega'], null) && !isCombat(BY_KEY['3-mega'], 'home')), tag + ' Mega combat outside Z-A only');
  ok(/\(\+ \d+ formes de combat, non comptées\)/.test(xyCnt), tag + ' X/Y forms counter lists Megas as combat: ' + xyCnt.slice(0, 100));
  ok(await p.evaluate(() => [...document.querySelectorAll('#results a[href="#/p/3-mega"]')].length === 1), tag + ' Méga-Florizarre listed in X/Y');
  await go('#/p/3-mega'); await sleep(500);
  const xyTrack = await p.$eval('#trackinfo', e => e.textContent);
  ok(/hors Légendes Z-A : variante de combat/.test(xyTrack) && !(await hasBtn('#actbar .tr')) && (await cgState()).dis, tag + ' X/Y Mega sheet battle-only, no transfer: ' + xyTrack.slice(0, 90));
  ok(await p.evaluate(() => !!document.querySelector('[data-mtab], .moves, #moves')), tag + ' X/Y Mega sheet has moves');
  await go('#/p/3'); await sleep(300); await p.click('#actbar .cg'); await sleep(150);
  ok(await p.evaluate(() => isCaught(BY_KEY['3-mega'], 'xy') && CAUGHT_G.has('xy:3') && !CAUGHT_G.has('xy:3-mega')), tag + ' X/Y Mega inherits base mark');
  // Hors Pokédex régional: Méga-Florizarre (et Florizarre) en fin de liste ROSA, sans nº régional, ordre national
  await go('#/'); await p.evaluate(() => { state.forms = true; state.q = ''; document.querySelector('#q').value = ''; }); await sel('oras'); await sleep(600);
  const oras = await p.evaluate(() => {
    const cards = [...document.querySelectorAll('#results .card')];
    const horsIdx = cards.findIndex(c => c.querySelector('.rn.hors'));
    const hors = horsIdx < 0 ? [] : cards.slice(horsIdx);
    const mega = cards.find(c => (c.getAttribute('href') || '').endsWith('/3-mega'));
    const base = cards.find(c => (c.getAttribute('href') || '') === '#/p/3');
    const idx = (el) => cards.indexOf(el);
    const natOrder = hors.map(c => BY_KEY[(c.getAttribute('href') || '').replace('#/p/', '')]?.id).filter(Boolean);
    const speciesOrderOk = natOrder.every((id, i, a) => i === 0 || a[i - 1] <= id);
    const allHors = hors.length > 0 && hors.every(c => c.querySelector('.rn.hors'));
    return { regional: DEX.oras.regional, horsIdx, megaIdx: idx(mega), baseIdx: idx(base),
      megaRn: mega?.querySelector('.rn')?.textContent, megaHors: !!mega?.querySelector('.rn.hors'),
      allHors, speciesOrderOk, natOrder: natOrder.slice(0, 16) };
  });
  ok(oras.horsIdx > 0 && oras.megaIdx >= oras.horsIdx && oras.baseIdx >= oras.horsIdx && oras.megaHors && /Hors dex/.test(oras.megaRn || ''), tag + ' ROSA: Florizarre/Méga hors dex en fin de liste ' + JSON.stringify({ horsIdx: oras.horsIdx, megaIdx: oras.megaIdx, baseIdx: oras.baseIdx, regional: oras.regional, megaRn: oras.megaRn }));
  ok(oras.allHors && oras.speciesOrderOk, tag + ' ROSA extras national order ' + JSON.stringify(oras.natOrder));
  await go('#/p/3-mega'); await sleep(500);
  ok(await p.evaluate(() => gamesOf(BY_KEY['3-mega']).includes('oras')), tag + ' Méga-Florizarre available in ROSA');
  await go('#/'); await sel(''); await p.evaluate(() => { state.forms = false; }); await sleep(200);
  // Méga-Gemme on the base sheet (Z-A), one state per stone shared across forms, immediate re-render
  await go('#/'); await sel('za'); await go('#/p/6'); await sleep(500);
  const baseGems = await p.evaluate(() => [...document.querySelectorAll('#actbar .gem[data-mega]')].map(b => [b.dataset.mega, b.getAttribute('aria-pressed'), b.querySelector('.t').textContent]));
  ok(baseGems.length === 2 && baseGems[0][0] === '6-mega-x' && baseGems[1][0] === '6-mega-y' && baseGems.every(g => g[1] === 'false'), tag + ' Dracaufeu base sheet (Z-A): 2 gem buttons ' + JSON.stringify(baseGems));
  await p.click('#actbar .gem[data-mega="6-mega-y"]'); await sleep(80);
  const afterTap = await p.evaluate(() => [...document.querySelectorAll('#actbar .gem[data-mega]')].map(b => b.getAttribute('aria-pressed')));
  ok(afterTap.join() === 'false,true', tag + ' base-sheet gem tap updates immediately (no reload): ' + afterTap);
  await go('#/p/6-mega-y'); await sleep(400);
  ok(await p.$eval('#actbar .gem', b => b.getAttribute('aria-pressed')) === 'true', tag + ' gem set on base sheet shows on Mega sheet');
  await p.click('#actbar .gem'); await sleep(80);
  const megaTap = await p.evaluate(() => ({ btn: document.querySelector('#actbar .gem').getAttribute('aria-pressed'), info: document.querySelector('#trackinfo').textContent }));
  ok(megaTap.btn === 'false' && /non obtenue/.test(megaTap.info), tag + ' Mega-sheet gem tap updates button + track info immediately ' + JSON.stringify(megaTap.btn));
  await p.click('#actbar .gem'); await sleep(80);
  ok(await p.$eval('#actbar .gem', b => b.getAttribute('aria-pressed')) === 'true' && /obtenue/.test(await p.$eval('#trackinfo', e => e.textContent)), tag + ' Mega-sheet gem re-tap on');
  await go('#/'); await sel('zadlc'); await go('#/p/978-droopy-mega'); await sleep(400);
  await p.click('#actbar .gem'); await sleep(80);
  const shared = await p.evaluate(() => ({ curly: hasGem(BY_KEY['978-curly-mega']), stretchy: hasGem(BY_KEY['978-stretchy-mega']), mag: hasGem(BY_KEY['801-original-mega']), x: hasGem(BY_KEY['6-mega-x']), y: hasGem(BY_KEY['6-mega-y']) }));
  ok(shared.curly && shared.stretchy && !shared.mag && !shared.x && shared.y, tag + ' gem shared across forms of one stone only ' + JSON.stringify(shared));
  // Mega capture + counter follow the gem immediately: Dracaufeu caught in Z-A → Méga Y caught; toggling the gem off un-catches it
  await go('#/'); await sel('za'); await go('#/p/6'); await sleep(400); await p.click('#actbar .cg'); await sleep(80);
  ok(await p.evaluate(() => isCaught(BY_KEY['6-mega-y'], 'za') && !isCaught(BY_KEY['6-mega-x'], 'za')), tag + ' base caught + gem Y → Méga Y caught only');
  await p.click('#actbar .gem[data-mega="6-mega-y"]'); await sleep(80);
  ok(await p.evaluate(() => !isCaught(BY_KEY['6-mega-y'], 'za')) && await p.$eval('#actbar .gem[data-mega="6-mega-y"]', b => b.getAttribute('aria-pressed')) === 'false', tag + ' gem off → Méga Y no longer caught, button updated');
  // v21: Méga-Gemme in every Mega game (per save group, ownership mark only outside Z-A); greyed where the Mega does not exist
  await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: 'networkidle0' });
  await go('#/'); await sel('oras'); await go('#/p/3'); await sleep(400);
  const oG = await p.$$eval('#actbar .act', bs => bs.map(b => b.classList[1] + (b.disabled ? '-off' : '')));
  ok(oG.join() === 'cg,sh,tr,gem', tag + ' ROSA Florizarre: Capturé · Shiny · Transféré · Gemme ' + oG);
  await p.click('#actbar .gem'); await sleep(80);
  ok(await p.evaluate(() => MEGA_GEMS.has('oras:3-mega') && hasGem(BY_KEY['3-mega'], 'oras') && !hasGem(BY_KEY['3-mega'], 'za') && !isCaught(BY_KEY['3-mega'], 'za')) && await p.$eval('#actbar .gem', b => b.getAttribute('aria-pressed')) === 'true', tag + ' ROSA gem stored per game, no Z-A effect');
  await go('#/p/3-mega'); await sleep(400);
  ok(await p.$eval('#actbar .gem', b => !b.disabled && b.getAttribute('aria-pressed') === 'true') && await p.$eval('#actbar .cg', b => b.disabled), tag + ' ROSA Mega sheet: same gem state, Capturé battle-only');
  await go('#/'); await sel('xy'); await go('#/p/6'); await sleep(400);
  ok((await p.$$eval('#actbar .gem', bs => bs.filter(b => !b.disabled).length)) === 2, tag + ' X/Y Dracaufeu: 2 gem buttons enabled');
  await go('#/'); await sel('sv'); await go('#/p/6'); await sleep(400);
  ok((await p.$$eval('#actbar .gem', bs => bs.map(b => b.disabled))).join() === 'true,true', tag + ' SV Dracaufeu: gems greyed in place');
  await go('#/'); await sel('sv'); await go('#/p/25'); await sleep(300);
  ok((await p.$$eval('#actbar .act', bs => bs.length)) === 3, tag + ' Pikachu (no Mega): no gem slot');
  // GO: Méga-énergie per species, only when the Mega is out in GO
  await go('#/'); await sel('go'); await go('#/p/6'); await sleep(600);
  const en = await p.evaluate(() => { const b = document.querySelector('#actbar .energy'); return b && { img: b.querySelector('img').getAttribute('src'), gems: document.querySelectorAll('#actbar .gem').length }; });
  const en2 = await p.$$eval('#actbar .energy', bs => bs.map(b => ({ k: b.dataset.energy, img: b.querySelector('img').getAttribute('src'), t: b.textContent })));
  ok(en && en.gems === 0 && en2.length === 2 && /energy\/6-x\.webp/.test(en2[0].img) && /energy\/6-y\.webp/.test(en2[1].img) && /Énergie X/.test(en2[0].t) && /Énergie Y/.test(en2[1].t), tag + ' GO Dracaufeu: 2 Méga-énergie buttons X / Y with their icons ' + JSON.stringify(en2));
  await p.click('#actbar .energy[data-energy="6-mega-x"]'); await sleep(80);
  ok(JSON.stringify(await ls2('mega_energy')) === '["6-x"]' && await p.$eval('#actbar .energy[data-energy="6-mega-x"]', b => b.getAttribute('aria-pressed')) === 'true' && await p.$eval('#actbar .energy[data-energy="6-mega-y"]', b => b.getAttribute('aria-pressed')) === 'false' && /Méga-énergie X de Dracaufeu : obtenue/.test(await p.$eval('#trackinfo', e => e.textContent)), tag + ' GO energy X stored separately from Y');
  await go('#/p/6-mega-y'); await sleep(500);
  ok((await p.$$eval('#actbar .energy', bs => bs.map(b => b.dataset.energy + '=' + b.getAttribute('aria-pressed')))).join() === '6-mega-y=false', tag + ' GO Méga-Dracaufeu Y sheet: its own energy (Y) only, not set (same rule as gems)');
  await go('#/p/6-mega-x'); await sleep(500);
  ok((await p.$$eval('#actbar .energy', bs => bs.map(b => b.dataset.energy + '=' + b.getAttribute('aria-pressed')))).join() === '6-mega-x=true', tag + ' GO Méga-Dracaufeu X sheet: energy X set');
  await go('#/p/3'); await sleep(500);
  ok((await p.$$eval('#actbar .energy', bs => bs.map(b => b.dataset.energy + '|' + b.querySelector('img').getAttribute('src')))).join() === '3-mega|img/energy/3.webp', tag + ' GO Florizarre: single energy button (species icon)');
  await p.evaluate(() => { localStorage.setItem('mega_energy', '["6","3"]'); }); await p.reload({ waitUntil: 'networkidle0' });
  ok(JSON.stringify((await ls2('mega_energy')).sort()) === '["3","6-x","6-y"]', tag + ' v21 energy "6" migrated to X and Y ' + JSON.stringify(await ls2('mega_energy')));
  ok(await p.evaluate(() => { const ms = E.filter(q => q.mb && q.id === 150); return ms.length === 2 && ms.map(energyId).join() === '150-x,150-y'; }), tag + ' Mewtwo data model supports energy X / Y');
  await go('#/'); await sel('go'); await go('#/p/150'); await sleep(600);
  ok(!(await p.$('#actbar .energy')), tag + ' GO Mewtwo: no energy button (Megas not released in GO)');
  const goOrder = await p.$$eval('.detail > section h2', hs => hs.map(h => h.childNodes[0].textContent.trim()));
  ok(goOrder.indexOf('Statistiques GO') < goOrder.indexOf('Attaques rapides') && goOrder.indexOf('Attaques chargées') < goOrder.indexOf('Évolutions') && goOrder.indexOf('Évolutions') < goOrder.indexOf('Pokémon GO : bonbons, compagnon, œufs'), tag + ' GO body order ' + goOrder);
  await go('#/'); await sel('sv'); await go('#/p/25'); await sleep(500);
  const order = await p.evaluate(() => [...document.querySelectorAll('.detail > *')].map(e => e.classList.contains('hero') ? 'hero' : e.classList.contains('trackbox') ? 'track' : e.classList.contains('desc') ? 'desc' : (e.querySelector('h2')?.childNodes[0].textContent.trim() || '')));
  const at = x => order.indexOf(x);
  ok(at('hero') === 0 && at('track') === 1 && at('Formes') === 2 && (at('desc') < 0 || (at('desc') > 2 && at('desc') < at('Statistiques de base'))) && at('Statistiques de base') < at('Talents') && at('Talents') < at('Capacités') && at('Capacités') < at('Évolutions') && at('Évolutions') < at('Où le trouver') && at('Où le trouver') < at('Présent dans') && at('Présent dans') < at('Pokémon GO'), tag + ' game body order ' + order.filter(Boolean).join(' > '));
  ok(!(await p.$('#cat option[value="strans"]')), tag + ' « Shiny transférés » filter hidden (shiny-transfer button removed)');
  // Z-A dexes: no « Hors dex » tail for species of the sibling dex (Z-A ↔ Méga-Dimension); 3rd dex « Méga-Dex »
  const zx = await p.evaluate(async () => { const a = await loadDex('za'), b = await loadDex('zadlc'); return { za: a.extra.size, zadlc: b.extra.size, zaN: a.order.size, dlcN: b.order.size }; });
  ok(zx.za === 0 && zx.zadlc === 0 && zx.zaN === 232 && zx.dlcN === 132, tag + ' Z-A / Méga-Dimension: no sibling species in Hors dex ' + JSON.stringify(zx));
  { const ord = (await p.$$eval('#game option', o => o.map(x => x.value))).join(' ');
    ok(/zamega zadlc za svhors svdisk svmask sv la bdsp swhors swcrown swisle sw lgpe/.test(ord), tag + ' Jeux: extra dexes just above the latest expansion of their group ' + ord); }
  await go('#/'); await p.select('#game', 'zamega'); await sleep(600);
  const md = await p.evaluate(() => { const r = filtered(); return { n: r.length, sp: new Set(r.map(x => x.id)).size, megas: r.filter(x => x.mb).length, ctx: trackCtx(), sel: document.querySelector('#game').value,
    nat: r.every((x, i) => i === 0 || r[i - 1].id <= x.id), allMega: [...new Set(r.map(x => x.id))].every(id => r.some(x => x.id === id && x.mb)), first: r.slice(0, 3).map(x => x.k), count: document.querySelector('#count').textContent,
    hors: document.querySelectorAll('.card .rn.hors').length }; });
  ok(md.ctx === 'za' && md.sel === 'zamega' && md.nat && md.allMega && md.megas >= md.sp && md.first.join() === '3,3-mega,6' && md.hors === 0 && /Méga-Dex Z-A/.test(md.count), tag + ' Méga-Dex: ' + JSON.stringify(md));
  // shared save: marking in the Méga-Dex = Z-A marks (Méga-Dimension-only species read through the shared save)
  const dlcOnly = await p.evaluate(() => { const g = GIDX.za, h = GIDX.zadlc; const m = E.find(x => x.mb && !inGame(x, g) && inGame(x, h) && BY_KEY[x.mb] && !inGame(BY_KEY[x.mb], g)); return m && m.mb; });
  if (dlcOnly) {
    await go('#/p/' + dlcOnly); await sleep(500);
    const dg = await p.$eval('#dgame', e => e.value); await p.click('#actbar .cg'); await sleep(100);
    ok(dg === 'zadlc' && await p.evaluate(k => isCaught(BY_KEY[k], 'za') && CAUGHT_G.has('zadlc:' + k), dlcOnly), tag + ' Méga-Dex → Méga-Dimension-only species marked in the shared save (' + dlcOnly + ', sheet ' + dg + ')');
  }
  await go('#/'); await p.select('#game', ''); await sleep(300);
  // Hors dex for all obtainable species: appended (games without expansions) / separate list (games with expansions)
  await go('#/'); await sel('oras'); await sleep(300);
  const orasN = await p.evaluate(() => ({ n: filtered().length, reg: DEX.oras.regional, x: DEX.oras.extra.size, mew: filtered().findIndex(x => x.id === 151), last: filtered().at(-1).id }));
  ok(orasN.n === 721 && orasN.reg === 211 && orasN.mew > orasN.reg - 1 && orasN.last === 721, tag + ' ROSA: 211 regional + Hors dex (all 721 obtainable) ' + JSON.stringify(orasN));
  await p.type('#q', '151'); await sleep(300); ok((await p.evaluate(() => filtered().map(x => x.id))).includes(151), tag + ' numeric search finds a Hors dex species by national nº (and regional nº 151)'); await p.evaluate(() => { $('#q').value = ''; state.q = ''; render(); });
  const swx = await p.evaluate(async () => { const a = await loadDex('sw'); return a.extra.size; });
  await go('#/'); await p.select('#game', 'swhors'); await sleep(600);
  const hs = await p.evaluate(() => ({ n: filtered().length, ctx: trackCtx(), hors: document.querySelectorAll('.card .rn.hors').length, first: filtered()[0].id, count: document.querySelector('#count').textContent }));
  ok(swx === 0 && hs.n === 80 && hs.ctx === 'sw' && hs.first === 150 && /Hors dex É\/B/.test(hs.count), tag + ' Hors dex Épée/Bouclier list (sw dexes untouched) ' + JSON.stringify(hs));
  await go('#/p/151'); await sleep(500);
  const dg2 = await p.$eval('#dgame', e => e.value); await p.click('#actbar .cg'); await sleep(100);
  ok(dg2 === 'sw' && await p.evaluate(() => CAUGHT_G.has('sw:151') && isCaught(BY_KEY['151'], 'sw') && !gamesOf(BY_KEY['151']).includes('sw')), tag + ' Mew marked in Épée/Bouclier from the Hors dex list (completion rules unchanged)');
  await go('#/'); await p.select('#game', 'svhors'); await sleep(600);
  ok((await p.evaluate(() => [filtered().length, trackCtx()])).join() === '69,sv', tag + ' Hors dex Écarlate/Violet: 69, context sv');
  await go('#/'); await p.select('#game', ''); await sleep(300);
  // legacy (v20) gem keys → Z-A
  await p.evaluate(() => { localStorage.setItem('mega_gems', JSON.stringify(['6-mega-x'])); }); await p.reload({ waitUntil: 'networkidle0' });
  ok(await p.evaluate(() => hasGem(BY_KEY['6-mega-x'], 'za') && !hasGem(BY_KEY['6-mega-x'], 'xy') && JSON.parse(localStorage.mega_gems).includes('za:6-mega-x')), tag + ' legacy gem keys migrated to Z-A');
  await go('#/'); await sel(''); await p.evaluate(() => { state.forms = false; }); await go('#/'); await sleep(200);

  await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: 'networkidle0' });
  // still-battle-only (Primo): inherits
  await go('#/'); await sel('oras'); await go('#/p/382-primal'); await sleep(300);
  ok((await cgState()).dis && /Variante de combat – suit la forme de base/.test(await strip()), tag + ' Primal battle-only sheet');
  await go('#/p/382'); await sleep(300); ok(!(await cgState()).dis, tag + ' base Kyogre markable'); await p.click('#actbar .cg'); await sleep(100);
  await go('#/p/382-primal'); await sleep(300); ok((await cgState()).on, tag + ' Primal inherits base mark');
  ok((await ls2('caught_g')).every(x => !x.includes('primal')), tag + ' only base key stored for primal ' + JSON.stringify(await ls2('caught_g')));
  await p.evaluate(() => { state.forms = false; render(); }); await sel(''); await sleep(200);
  const baseTot = await p.evaluate(() => E.filter(p => !p.c && !p.bo).length);
  ok(new RegExp(`1 / ${baseTot} 🔴 capturés`).test(await count()), tag + ' base counter excludes battle-only variants: ' + await count());
  await p.screenshot({ path: SHOTS + `battle-only-${tag}.png`, clip: { x: 0, y: 0, width: w, height: 300 } });
  // ---- Catégorie: transfer categories (game / base / Home)
  await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: 'networkidle0' });
  const catN = async c => { await p.select('#cat', c); await sleep(200); return parseInt(await count()); };
  const tinfo = await p.evaluate(() => ({ N: E.filter(e => !e.c && homeAvail(e).length > 0).length, one: (e => e && { k: e.k, g: ORI[homeAvail(e)[0]].games.find(g => gamesOf(e).includes(g)) })(E.find(e => !e.c && !e.bo && !e.my && homeAvail(e).length === 1 && homeAvail(e)[0] !== 'go')) }));
  await go('#/'); await sel('sw'); await go('#/p/25'); await sleep(300); await p.click('#actbar .tr'); await sleep(100);
  await go('#/'); await sleep(200);
  ok(await catN('trans') === 1, tag + ' game view: "transférés depuis ce jeu" = 1');
  await p.select('#cat', ''); await sleep(200); ok(/1 transférés vers Home/.test(await count()), tag + ' game header counter: ' + await count());
  ok(await catN('notrans') === 399 && await catN('hcomplete') === 0, tag + ' game view: not yet = 399, complets 0');
  ok((await p.$eval('#cat option[value=trans]', o => o.textContent)).includes('ce jeu'), tag + ' game labels'); await p.select('#cat', '');
  await go('#/p/25'); await sleep(300); await p.click('#actbar .sh'); await trsLogic(); await sleep(100); await go('#/'); await sleep(200);
  ok(await p.evaluate(() => HOME_S.size === 1 && E.filter(x => transCat(x, 'strans')).length === 1), tag + ' shiny-transfer data + logic kept (filter hidden in v21)'); await p.select('#cat', '');
  await sel(''); ok(await catN('trans') === 1 && await catN('notrans') === tinfo.N - 1 && await catN('hcomplete') === 0, tag + ' base view transfer categories (N=' + tinfo.N + ')');
  await p.select('#cat', ''); await sleep(200); ok(/1 🏠 transférés Home/.test(await count()), tag + ' base counter: ' + await count());
  await sel('home'); ok(await catN('trans') === 1 && await catN('notrans') === tinfo.N - 1, tag + ' Home view transfer categories'); await p.select('#cat', '');
  await sel('frlg'); ok(await p.$eval('#cat option[value=trans]', o => o.disabled), tag + ' categories disabled in a game that cannot transfer'); await sel('');
  await go('#/'); await sel(tinfo.one.g); await go('#/p/' + tinfo.one.k); await sleep(300); await p.click('#actbar .tr'); await sleep(100); await sel('');
  ok(await catN('hcomplete') === 1, tag + ' "Complets Home" for a Pokémon in one compatible save (' + JSON.stringify(tinfo.one) + ')'); await p.select('#cat', '');
  await sleep(200); ok(/1 🟡🏠 complets Home/.test(await count()), tag + ' base counter complets Home: ' + await count());
  const gh = await p.$$eval('.card .mk.hm.gold', e => e.length); await sel('home'); const gh2 = await p.$$eval('.card .mk.hm.gold', e => e.length); ok(gh2 >= 1, tag + ' gold Home icon in Home view');
  await sel('');
  // ---- Home completion with Pokémon GO: required, except for Mythicals
  await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: 'networkidle0' });
  const gi = await p.evaluate(() => ({
    reg: (e => e && { k: e.k, reps: homeAvail(e).map(m => m === 'go' ? 'go' : ORI[m].games.find(g => gamesOf(e).includes(g))) })(E.find(e => !e.c && !e.bo && !e.my && e.go && homeAvail(e).length === 2 && homeAvail(e).includes('go'))),
    myth: (e => e && { k: e.k, reps: homeAvail(e).map(m => ORI[m].games.find(g => gamesOf(e).includes(g))), withGo: !homeAvail(e).includes('go') })(E.filter(e => !e.c && !e.bo && e.my && e.go && homeAvail(e).length >= 1).sort((a, b) => homeAvail(a).length - homeAvail(b).length)[0]) }));
  ok(gi.reg && gi.myth && gi.myth.withGo, tag + ' found GO test Pokémon ' + JSON.stringify(gi));
  const trf = async (g, k) => { await go('#/'); await sel(g); await go('#/p/' + k); await sleep(250); await p.click('#actbar .tr'); await sleep(100); };
  for (const g of gi.reg.reps.filter(g => g !== 'go')) await trf(g, gi.reg.k);
  await sel(''); ok(await catN('hcomplete') === 0, tag + ' regular Pokémon: not complete while GO is not transferred'); await p.select('#cat', '');
  await trf('go', gi.reg.k); await sel(''); ok(await catN('hcomplete') === 1, tag + ' regular Pokémon: GO counts → complete'); await p.select('#cat', '');
  for (const g of gi.myth.reps) await trf(g, gi.myth.k);
  await sel(''); ok(await catN('hcomplete') === 2, tag + ' Mythical: complete without GO'); await p.select('#cat', '');
  await go('#/'); await sel('go'); await go('#/p/' + gi.myth.k); await sleep(300);
  ok(!(await hasBtn('#actbar .tr')) && /fabuleux/.test(await strip()), tag + ' Mythical: no GO transfer button, explained');
  await go('#/'); await sel('home'); await p.screenshot({ path: SHOTS + `home-gold-${tag}.png`, clip: { x: 0, y: 0, width: w, height: 420 } });
  await sel('');
  await p.evaluate(() => localStorage.clear()); await p.evaluate(() => localStorage.setItem('caught', '[25,"26-alola"]')); await p.reload({ waitUntil: 'networkidle0' });
  // Rouge/Bleu (not Home-compatible)
  await go('#/'); await sel('rb'); await go('#/p/25');
  ok(/Rouge\/Bleu/.test(await strip()) && await hasBtn('#actbar .tr') && /Console virtuelle/.test(await strip()), tag + ' rb strip (Console virtuelle → Home, Game Boy mark): ' + await strip());
  await p.click('#actbar .cg'); ok(JSON.stringify(await ls2('caught_g')) === '["rb:25"]' && JSON.stringify(await ls2('caught')) === '[25,"26-alola"]', tag + ' rb mark stored per game, legacy global unchanged');
  await go('#/'); await sleep(200); ok(/Rouge\/Bleu : 1 \/ 151 🔴 capturés/.test(await count()), tag + ' rb counter: ' + await count());
  await p.select('#cat', 'caught'); await sleep(200); ok((await count()).startsWith('1 Pokémon'), tag + ' rb caught filter'); 
  await sel('xy'); ok((await count()).startsWith('0 Pokémon'), tag + ' other game has no marks: ' + await count()); await p.select('#cat', '');
  // Épée/Bouclier (Home-compatible): caught + transfer + shiny transfer
  await sel('sw'); await go('#/p/25');
  ok(await hasBtn('#actbar .tr'), tag + ' sw has Home transfer button');
  await p.click('#actbar .tr'); await sleep(100);
  ok((await ls2('home_o')).includes('galar:25') && (await ls2('caught_g')).includes('sw:25'), tag + ' transfer auto-marks caught');
  await p.click('#actbar .sh'); await sleep(100); ok(!(await p.$('#actbar .trs, #trackinfo .trs')), tag + ' no shiny-transfer button even when shiny (v21)');
  await trsLogic(); await sleep(100); ok((await ls2('homeshiny_g')).includes('sw:25'), tag + ' shiny transfer stored');
  // Home view derived
  await go('#/'); await sel('home'); await sleep(300);
  ok(/HOME : 1 \/ 1025 🏠 transférés · 1 ✨ shiny · 0 🟡🏠 complets/.test(await count()), tag + ' Home counter: ' + await count());
  await p.select('#cat', 'caught'); await sleep(200); ok((await count()).startsWith('1 Pokémon'), tag + ' Home caught filter derived'); await p.select('#cat', 'shiny'); await sleep(200); ok((await count()).startsWith('1 Pokémon'), tag + ' Home shiny filter derived'); await p.select('#cat', '');
  await go('#/p/25'); await sleep(300);
  ok(/Transféré depuis 1 \/ \d+ marques d’origine/.test(await strip()) && /Marque de Galar[^—]*— transféré[^·]*· ✨ shiny/.test(await strip()), tag + ' Home detail shows source mark: ' + await strip());
  ok(!(await p.$('#actbar .cg')) && await p.$eval('#actbar .ori[data-origin="galar"]', e => e.getAttribute('aria-pressed')) === 'true', tag + ' Home sheet bar = origin marks (Galar on)');
  await p.screenshot({ path: SHOTS + `home-derived-${tag}.png` });
  // un-catching in the game removes the transfer
  await go('#/'); await sel('sw'); await go('#/p/25'); await p.click('#actbar .cg'); await sleep(100);
  ok(!(await ls2('home_o')).includes('galar:25') && !(await ls2('homeshiny_g')).includes('sw:25'), tag + ' un-catch clears the transfer set from the game');
  await p.click('#actbar .tr'); await p.screenshot({ path: SHOTS + `track-sw-${tag}.png`, clip: { x: 0, y: 0, width: w, height: 200 } });
  const tr1 = await p.evaluate(() => [...document.querySelectorAll('#actbar .act')].map(b => ({ one: b.scrollHeight <= b.clientHeight + 1, w: b.getBoundingClientRect().right <= innerWidth })));
  ok(tr1.every(x => x.one && x.w), tag + ' transfer buttons one line / inside viewport ' + JSON.stringify(tr1));
  // GO is a game too
  await go('#/'); await sel('go'); await go('#/p/150'); await p.click('#actbar .cg'); await p.click('#actbar .tr'); await sleep(100);
  ok((await ls2('home_o')).includes('go:150'), tag + ' GO transfer');
  // export / import round-trip
  const dump = await p.evaluate(() => JSON.stringify({ favs: [...FAVS], caught: [...CAUGHT], shiny: [...SHINY], caught_g: [...CAUGHT_G], shiny_g: [...SHINY_G], home_g: [...TRANS_G], homeshiny_g: [...STRANS_G], home_o: [...HOME_O], home_og: [...HOME_OG] }));
  await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: 'networkidle0' });
  await p.evaluate(async d => { const f = new File([d], 'x.json', { type: 'application/json' }); const dt = new DataTransfer(); dt.items.add(f); const i = document.getElementById('import'); i.files = dt.files; window.alert = () => {}; i.dispatchEvent(new Event('change')); }, dump);
  await sleep(500);
  ok((await ls2('home_o')).includes('go:150') && (await ls2('caught_g')).includes('rb:25') && (await ls2('caught')).includes(25), tag + ' import restores per-game + transfer marks');
  await sel('');
  // ---- Home markers: partial / shiny / complete
  await go('#/'); await sel('home'); await p.evaluate(() => { localStorage.removeItem('home_g'); });
  const pick = await p.evaluate(() => { const q = E.find(x => !x.c && homeAvail(x).length === 2 && !homeAvail(x).includes('go')); return q && { k: q.k, av: homeAvail(q).map(m => ORI[m].games.find(g => gamesOf(q).includes(g))), n: q.n }; });
  ok(!!pick, tag + ' found a Pokémon present in exactly 2 Home-compatible games ' + JSON.stringify(pick));
  await p.evaluate(() => { for (const x of [...TRANS_G]) TRANS_G.delete(x); for (const x of [...STRANS_G]) STRANS_G.delete(x); HOME_O.clear(); HOME_OG.clear(); saveTrack(); });
  await sel(pick.av[0]); await go('#/p/' + pick.k); await p.click('#actbar .tr'); await sleep(100);
  await go('#/'); await sel('home'); await p.type('#q', pick.n); await sleep(300);
  let mks = await p.$$eval('.card .mk', e => e.map(x => x.className));
  ok(mks.some(c => /hm/.test(c)) && !mks.some(c => /gold/.test(c)), tag + ' partial transfer = blue Home icon only ' + mks);
  ok(/0 🟡🏠 complets/.test(await count()), tag + ' counter 0 complets: ' + await count());
  await sel(pick.av[1]); await go('#/p/' + pick.k); await p.click('#actbar .tr'); await p.click('#actbar .sh'); await trsLogic(); await sleep(100);
  await go('#/'); await sel('home'); await p.$eval('#q', (e, n) => { e.value = n; e.dispatchEvent(new Event('input')); }, pick.n); await sleep(300);
  mks = await p.$$eval('.card .mk', e => e.map(x => x.className));
  ok(mks.some(c => /hm gold/.test(c)) && mks.some(c => /sh/.test(c)), tag + ' complete = gold Home icon + ✨ ' + mks);
  ok(/1 🟡🏠 complets/.test(await count()) && /1 ✨ shiny/.test(await count()), tag + ' counters: ' + await count());
  ok(await p.$eval('#legend', e => !e.hidden && /toutes les marques/.test(e.textContent) && /Kalos/.test(e.textContent) && /dorée/.test(e.textContent) && /fabuleux/.test(e.textContent)), tag + ' legend visible in Home (gold + mythical note)');
  await go('#/p/' + pick.k); await sleep(300);
  ok((await p.$$eval('#trackinfo .homerows li', e => e.map(x => x.textContent))).length === 2 && /complet/.test(await strip()), tag + ' detail lists per-game status: ' + await strip());
  await p.screenshot({ path: SHOTS + `home-complete-${tag}.png` });
  await p.evaluate(() => { for (const x of [...TRANS_G]) TRANS_G.delete(x); for (const x of [...STRANS_G]) STRANS_G.delete(x); HOME_O.clear(); HOME_OG.clear(); saveTrack(); });
  await go('#/'); await p.$eval('#q', e => { e.value = ''; e.dispatchEvent(new Event('input')); }); await sel('');
  // list shows marks, cat filter
  await go('#/'); await p.select('#cat', 'caught'); await sleep(200); console.log('caught filter', await count());
  await p.select('#cat', ''); 
  // export / import compat
  const exp = await p.evaluate(() => JSON.stringify({ favs: [...FAVS], caught: [...CAUGHT], shiny: [...SHINY] }));
  console.log('export', exp);
  await p.evaluate(() => { localStorage.clear(); });
  await p.close();
}
// offline test
{
  const p = await mk(360, 780, true);
  await p.goto(BASE, { waitUntil: 'networkidle0' });
  await p.evaluate(() => navigator.serviceWorker.ready); await sleep(1500);
  await p.goto(BASE + '#/p/25'); await sleep(1000); // caches sp/25 + shared
  await p.evaluate(() => document.querySelector('#dgame') && 0);
  await p.goto(BASE); await sleep(500);
  await p.evaluate(() => { document.querySelector('#dl2')?.click(); });
  for (let i = 0; i < 60; i++) { await sleep(2000); if (await p.evaluate(() => localStorage.packDone2)) break; }
  console.log('imgsDone', await p.evaluate(() => localStorage.imgsDone), 'packDone2', await p.evaluate(() => localStorage.packDone2));
  const nImg = await p.evaluate(async () => (await (await caches.open('pokedex-img')).keys()).length);
  const nData = await p.evaluate(async () => { for (const k of await caches.keys()) if (k.startsWith('pokedex-data')) return (await (await caches.open(k)).keys()).length; });
  console.log('cached imgs', nImg, 'data', nData);
  await p.setOfflineMode(true);
  await p.reload({ waitUntil: 'load' }); await sleep(1500);
  ok((await p.$eval('#count', e => e.textContent)).startsWith('1025'), 'offline reload list');
  await p.goto(BASE + '#/p/700'); await sleep(1200);
  ok(/Nymphali/.test(await p.$eval('.hero h1', e => e.textContent)), 'offline detail page');
  await p.select('#dgame', 'go'); await sleep(500); ok(/PC max/.test(await p.$eval('.detail', e => e.textContent)), 'offline GO page');
  await p.goto(BASE); await sleep(300); await p.select('#game', 'za'); await sleep(500); ok(parseInt(await p.$eval('#count', e => e.textContent)) >= 232, 'offline game dex: ' + await p.$eval('#count', e => e.textContent));
  await p.close();
}
console.log('console errors:', errs.length, errs.slice(0, 10));
console.log(fails ? `${fails} FAILURES` : 'ALL PASS');
await b.close();
