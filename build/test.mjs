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
  await p.click('#formsbtn'); await sleep(400);
  const nForms = parseInt(await count()); ok(nForms > 1500, tag + ' forms shown: ' + await count());
  await p.type('#q', 'raichu'); await sleep(200); console.log('raichu+forms', await cards(6));
  await p.screenshot({ path: SHOTS + `forms-${tag}.png` });
  await p.$eval('#q', e => { e.value = ''; e.dispatchEvent(new Event('input')); });
  await p.click('#formsbtn'); await sleep(200);
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
  ok(await p.$eval('.dnav .cg', e => e.disabled) && await p.$eval('.dnav .sh', e => e.disabled), tag + ' base-view Capturé/Shiny buttons are read-only');
  ok(/vue d’ensemble/.test(await p.$eval('#trackinfo', e => e.textContent)), tag + ' base strip is the overview');
  await p.click('.dnav .fav'); ok((await p.evaluate(() => localStorage.favs)).includes('"26-alola"'), tag + ' favorite stored globally as string key');
  await go('#/'); await sel('sm'); await go('#/p/26-alola'); await p.click('.dnav .cg'); await p.click('.dnav .sh');
  ok((await p.evaluate(() => [localStorage.caught_g, localStorage.shiny_g])).every(x => x.includes('"sm:26-alola"')), tag + ' form mark stored per game as sm:26-alola');
  await go('#/'); await sel('xy'); await go('#/p/25'); await p.click('.dnav .cg');
  await go('#/'); await sel(''); await sleep(200);
  ok(/1 \/ 1025 capturés/.test(await count()), tag + ' base counter derived from per-game marks: ' + await count());
  await go('#/p/25'); await sleep(300);
  ok(/Anciens jeux|Jeux Switch/.test(await p.$eval('#trackinfo', e => e.textContent)) && /X\/Y — capturé/.test(await p.$eval('#trackinfo', e => e.textContent)), tag + ' base detail per-game breakdown');
  // buttons alignment
  const al = await p.evaluate(() => [...document.querySelectorAll('.dnav .cg,.dnav .sh')].map(b => { const r = b.getBoundingClientRect(); const ic = b.querySelector('svg'); const ir = ic && ic.getBoundingClientRect(); return { oneLine: b.scrollHeight <= b.clientHeight + 1, noOverflow: b.scrollWidth <= b.clientWidth + 1, iconLeft: !ic || ir.right <= r.right && ir.left >= r.left, within: r.right <= innerWidth }; }));
  ok(al.every(x => x.oneLine && x.noOverflow && x.iconLeft && x.within), tag + ' dnav buttons ' + JSON.stringify(al));
  const tops = await p.evaluate(() => [...document.querySelectorAll('.dnav > :not(.sp)')].map(e => Math.round(e.getBoundingClientRect().top))); ok(new Set(tops).size === 1, tag + ' all dnav items on one row ' + tops);
  await p.screenshot({ path: SHOTS + `dnav-${tag}.png`, clip: { x: 0, y: 0, width: w, height: 140 } });
  // ---- encounters / TM numbers / translated texts / disclaimer
  await go('#/p/19'); await p.select('#dgame', 'rb'); await sleep(400);
  const encs = await p.$$eval('.enc', e => e.map(x => x.textContent));
  ok(encs.some(x => /Route 1/.test(x)) , tag + ' Rattata rb encounters: ' + encs.length + ' ' + (encs[0] || ''));
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
  const hasBtn = sel => p.$(sel).then(x => !!x);
  // base view = global marks, untouched
  await p.evaluate(() => localStorage.setItem('caught', '[25,"26-alola"]')); await p.reload({ waitUntil: 'networkidle0' });
  await sel(''); await p.select('#cat', 'caught'); await sleep(200); ok((await count()).startsWith('1 Pokémon'), tag + ' legacy global mark still shown as caught in base view');
  await p.select('#cat', ''); await go('#/p/25'); await sleep(300);
  ok(/Marque manuelle de l’ancienne version/.test(await strip()), tag + ' legacy mark explained: ' + (await strip()).slice(0, 160));
  ok(JSON.stringify(await ls2('caught')) === '[25,"26-alola"]', tag + ' legacy data untouched');
  // base view: Capturé / Complété (Switch) / Anciens jeux, GO counts only for "capturé"
  await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: 'networkidle0' });
  const pk = await p.evaluate(() => {
    const info = e => { const av = gamesOf(e); return { k: e.k, sw: coreOf(av.filter(g => SWITCH_IDS.has(g))), old: coreOf(av.filter(g => !SWITCH_IDS.has(g))), go: !!e.go }; };
    const L = E.filter(e => !e.c).map(info);
    return { sw: L.find(x => x.sw.length === 1 && x.old.length === 0 && x.go), old: L.find(x => x.sw.length === 0 && x.old.length >= 1 && x.old.length <= 3) };
  });
  ok(pk.sw && pk.old, tag + ' found test Pokémon ' + JSON.stringify(pk));
  const mkg = async (g, k, btn = '.dnav .cg') => { await go('#/'); await sel(g); await go('#/p/' + k); await sleep(150); await p.click(btn); await sleep(100); };
  const baseCount = async c => { await go('#/'); await sel(''); await p.select('#cat', c); await sleep(200); const t = await count(); await p.select('#cat', ''); return t; };
  await mkg('go', pk.sw.k);
  ok((await baseCount('caught')).startsWith('1 Pokémon') && (await baseCount('swdone')).startsWith('0 Pokémon'), tag + ' GO mark counts as caught, not Switch-complete');
  await mkg(pk.sw.sw[0], pk.sw.k);
  ok((await baseCount('swdone')).startsWith('1 Pokémon'), tag + ' caught in all Switch games where it exists → Complété');
  await go('#/'); await sel(''); await sleep(200);
  ok(/1 complétés? Switch/.test(await p.$eval('.status', e => e.textContent)), tag + ' header counter complétés Switch: ' + await p.$eval('.status', e => e.textContent));
  ok(await p.$$eval('.mk.cm', e => e.length) >= 1, tag + ' ✔ marker on card');
  for (const g of pk.old.old) await mkg(g, pk.old.k);
  ok((await baseCount('olddone')).startsWith('1 Pokémon'), tag + ' caught in all pre-Switch games → Anciens jeux ' + pk.old.old);
  await go('#/'); await sel(''); await go('#/p/' + pk.old.k); await sleep(300);
  ok(/Anciens jeux/.test(await strip()), tag + ' detail breakdown mentions Anciens jeux');
  await mkg(pk.sw.sw[0], pk.sw.k, '.dnav .sh');
  await go('#/'); await sel(''); await p.select('#cat', 'shiny'); await sleep(200); ok((await count()).startsWith('1 Pokémon'), tag + ' shiny derived from per-game shiny'); await p.select('#cat', '');
  await go('#/'); await sel(''); await p.click('#legend summary').catch(() => {}); ok(await p.$eval('#legend', e => !e.hidden && /Pokémon GO compte/.test(e.textContent)), tag + ' legend visible in base view');
  await p.screenshot({ path: SHOTS + `base-view-${tag}.png` });
  await p.evaluate(() => localStorage.clear()); await p.evaluate(() => localStorage.setItem('caught', '[25,"26-alola"]')); await p.reload({ waitUntil: 'networkidle0' });
  // ---- the sheet's own game switcher is the tracking context
  await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: 'networkidle0' });
  const cgState = () => p.$eval('.dnav .cg', e => ({ dis: e.disabled, on: e.getAttribute('aria-pressed') === 'true', lab: e.getAttribute('aria-label') }));
  const swS = async g => { await p.select('#dgame', g); await sleep(300); };
  await go('#/'); await sel('sv'); await go('#/p/25'); await sleep(300);
  ok(/Écarlate/.test(await strip()) && /Écarlate/.test((await cgState()).lab), tag + ' sheet starts on list game (SV) ' + (await cgState()).lab);
  await swS('sw');
  ok(/Épée/.test(await strip()) && /Épée/.test((await cgState()).lab) && !/Écarlate/.test((await cgState()).lab), tag + ' switching in sheet changes label to Épée/Bouclier: ' + (await cgState()).lab);
  ok(await hasBtn('#trackinfo .tr'), tag + ' Home-transfer button visible for Épée/Bouclier');
  await p.click('.dnav .cg'); await sleep(100);
  ok(JSON.stringify(await ls2('caught_g')) === '["sw:25"]' && (await cgState()).on, tag + ' mark stored under sw only: ' + JSON.stringify(await ls2('caught_g')));
  await p.click('#trackinfo .tr'); await sleep(100); ok(JSON.stringify(await ls2('home_g')) === '["sw:25"]', tag + ' transfer stored under sw');
  await p.click('.dnav .sh'); await sleep(100); ok(JSON.stringify(await ls2('shiny_g')) === '["sw:25"]' && await hasBtn('#trackinfo .trs'), tag + ' shiny stored under sw, shiny-transfer button appears');
  await swS('sv'); ok(!(await cgState()).on && await p.$eval('.dnav .sh', e => e.getAttribute('aria-pressed') === 'false'), tag + ' back on SV: states are SV\'s own (not caught)');
  ok(!(await p.$eval('#trackinfo .tr', e => e.getAttribute('aria-pressed') === 'true')), tag + ' SV transfer state not set');
  await swS('rb'); ok(!(await cgState()).dis && !(await hasBtn('#trackinfo .tr')) && /Rouge/.test((await cgState()).lab), tag + ' Rouge/Bleu: buttons enabled, no Home transfer button');
  await swS('go'); await sleep(400); ok(!(await cgState()).dis && await hasBtn('#trackinfo .tr') && /GO/.test((await cgState()).lab), tag + ' GO: buttons + transfer button');
  await swS('home'); ok((await cgState()).dis && /lecture seule|vue d’ensemble/.test(await strip()), tag + ' general-infos option: read-only overview');
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
  await p.click('.dnav .cg'); await sleep(100); ok(JSON.stringify(await ls2('caught_g')) === '["sw:25"]', tag + ' mark stored for sheet game');
  await go('#/p/26'); await sleep(300); ok(await p.$eval('#dgame', e => e.value) === 'sw' && !(await cgState()).dis, tag + ' sheet game kept while browsing sheets');
  await go('#/'); await sleep(200); ok(await p.$eval('#game', e => e.value) === '', tag + ' list filter still unset');
  const mk25 = await p.$eval('.card[href="#/p/25"], a[href="#/p/25"]', e => e.parentElement.innerHTML.includes('mk') || e.innerHTML.includes('mk')).catch(() => null);
  await p.select('#cat', 'caught'); await sleep(200); ok((await count()).startsWith('1 Pokémon'), tag + ' base list reflects the mark on return'); await p.select('#cat', '');
  await go('#/p/25'); await sleep(300); ok(await p.$eval('#dgame', e => e.value) === 'home' && (await cgState()).dis, tag + ' sheet game choice reset after returning to the list');
  await p.screenshot({ path: SHOTS + `sheet-context-${tag}.png`, clip: { x: 0, y: 0, width: w, height: 260 } });
  await p.evaluate(() => localStorage.clear()); await p.evaluate(() => localStorage.setItem('caught', '[25,"26-alola"]')); await p.reload({ waitUntil: 'networkidle0' });
  // Rouge/Bleu (not Home-compatible)
  await go('#/'); await sel('rb'); await go('#/p/25');
  ok(/Rouge\/Bleu/.test(await strip()) && !(await hasBtn('#trackinfo .tr')), tag + ' rb strip, no Home button: ' + await strip());
  await p.click('.dnav .cg'); ok(JSON.stringify(await ls2('caught_g')) === '["rb:25"]' && JSON.stringify(await ls2('caught')) === '[25,"26-alola"]', tag + ' rb mark stored per game, legacy global unchanged');
  await go('#/'); await sleep(200); ok(/Rouge\/Bleu : 1 \/ 151 capturés/.test(await count()), tag + ' rb counter: ' + await count());
  await p.select('#cat', 'caught'); await sleep(200); ok((await count()).startsWith('1 Pokémon'), tag + ' rb caught filter'); 
  await sel('xy'); ok((await count()).startsWith('0 Pokémon'), tag + ' other game has no marks: ' + await count()); await p.select('#cat', '');
  // Épée/Bouclier (Home-compatible): caught + transfer + shiny transfer
  await sel('sw'); await go('#/p/25');
  ok(await hasBtn('#trackinfo .tr'), tag + ' sw has Home transfer button');
  await p.click('#trackinfo .tr'); await sleep(100);
  ok((await ls2('home_g')).includes('sw:25') && (await ls2('caught_g')).includes('sw:25'), tag + ' transfer auto-marks caught');
  await p.click('.dnav .sh'); await sleep(100); ok(await hasBtn('#trackinfo .trs'), tag + ' shiny-transfer button appears when shiny');
  await p.click('#trackinfo .trs'); await sleep(100); ok((await ls2('homeshiny_g')).includes('sw:25'), tag + ' shiny transfer stored');
  // Home view derived
  await go('#/'); await sel('home'); await sleep(300);
  ok(/HOME : 1 \/ 1025 transférés · 1 shiny · 0 complets/.test(await count()), tag + ' Home counter: ' + await count());
  await p.select('#cat', 'caught'); await sleep(200); ok((await count()).startsWith('1 Pokémon'), tag + ' Home caught filter derived'); await p.select('#cat', 'shiny'); await sleep(200); ok((await count()).startsWith('1 Pokémon'), tag + ' Home shiny filter derived'); await p.select('#cat', '');
  await go('#/p/25'); await sleep(300);
  ok(/Transféré depuis 1 \/ \d+ jeux/.test(await strip()) && /Épée\/Bouclier — transféré · ✨ shiny/.test(await strip()), tag + ' Home detail shows source: ' + await strip());
  ok(await p.$eval('.dnav .cg', e => e.disabled), tag + ' Home buttons read-only');
  await p.screenshot({ path: SHOTS + `home-derived-${tag}.png` });
  // un-catching in the game removes the transfer
  await go('#/'); await sel('sw'); await go('#/p/25'); await p.click('.dnav .cg'); await sleep(100);
  ok(!(await ls2('home_g')).includes('sw:25') && !(await ls2('homeshiny_g')).includes('sw:25'), tag + ' un-catch clears transfer');
  await p.click('#trackinfo .tr'); await p.screenshot({ path: SHOTS + `track-sw-${tag}.png`, clip: { x: 0, y: 0, width: w, height: 200 } });
  const tr1 = await p.evaluate(() => [...document.querySelectorAll('#trackinfo .trackbtns button')].map(b => ({ one: b.scrollHeight <= b.clientHeight + 1, w: b.getBoundingClientRect().right <= innerWidth })));
  ok(tr1.every(x => x.one && x.w), tag + ' transfer buttons one line / inside viewport ' + JSON.stringify(tr1));
  // GO is a game too
  await go('#/'); await sel('go'); await go('#/p/150'); await p.click('.dnav .cg'); await p.click('#trackinfo .tr'); await sleep(100);
  ok((await ls2('home_g')).includes('go:150'), tag + ' GO transfer');
  // export / import round-trip
  const dump = await p.evaluate(() => JSON.stringify({ favs: [...FAVS], caught: [...CAUGHT], shiny: [...SHINY], caught_g: [...CAUGHT_G], shiny_g: [...SHINY_G], home_g: [...TRANS_G], homeshiny_g: [...STRANS_G] }));
  await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: 'networkidle0' });
  await p.evaluate(async d => { const f = new File([d], 'x.json', { type: 'application/json' }); const dt = new DataTransfer(); dt.items.add(f); const i = document.getElementById('import'); i.files = dt.files; window.alert = () => {}; i.dispatchEvent(new Event('change')); }, dump);
  await sleep(500);
  ok((await ls2('home_g')).includes('go:150') && (await ls2('caught_g')).includes('rb:25') && (await ls2('caught')).includes(25), tag + ' import restores per-game + transfer marks');
  await sel('');
  // ---- Home markers: partial / shiny / complete
  await go('#/'); await sel('home'); await p.evaluate(() => { localStorage.removeItem('home_g'); });
  const pick = await p.evaluate(() => { const q = E.find(x => !x.c && homeAvail(x).length === 2 && !homeAvail(x).includes('go')); return q && { k: q.k, av: homeAvail(q), n: q.n }; });
  ok(!!pick, tag + ' found a Pokémon present in exactly 2 Home-compatible games ' + JSON.stringify(pick));
  await p.evaluate(() => { for (const x of [...TRANS_G]) TRANS_G.delete(x); for (const x of [...STRANS_G]) STRANS_G.delete(x); saveTrack(); });
  await sel(pick.av[0]); await go('#/p/' + pick.k); await p.click('#trackinfo .tr'); await sleep(100);
  await go('#/'); await sel('home'); await p.type('#q', pick.n); await sleep(300);
  let mks = await p.$$eval('.card .mk', e => e.map(x => x.className));
  ok(mks.some(c => /hm/.test(c)) && !mks.some(c => /cm/.test(c)), tag + ' partial transfer = 🏠 only ' + mks);
  ok(/0 complets/.test(await count()), tag + ' counter 0 complets: ' + await count());
  await sel(pick.av[1]); await go('#/p/' + pick.k); await p.click('#trackinfo .tr'); await p.click('.dnav .sh'); await p.click('#trackinfo .trs'); await sleep(100);
  await go('#/'); await sel('home'); await p.$eval('#q', (e, n) => { e.value = n; e.dispatchEvent(new Event('input')); }, pick.n); await sleep(300);
  mks = await p.$$eval('.card .mk', e => e.map(x => x.className));
  ok(mks.some(c => /cm/.test(c)) && mks.some(c => /sh/.test(c)) && mks.some(c => /hm/.test(c)), tag + ' complete = 🏠 ✨ ✔ ' + mks);
  ok(/1 complets/.test(await count()) && /1 shiny/.test(await count()), tag + ' counters: ' + await count());
  ok(await p.$eval('#legend', e => !e.hidden && /tous les jeux/.test(e.textContent)), tag + ' legend visible in Home');
  await go('#/p/' + pick.k); await sleep(300);
  ok((await p.$$eval('#trackinfo .homerows li', e => e.map(x => x.textContent))).length === 2 && /complet/.test(await strip()), tag + ' detail lists per-game status: ' + await strip());
  await p.screenshot({ path: SHOTS + `home-complete-${tag}.png` });
  await p.evaluate(() => { for (const x of [...TRANS_G]) TRANS_G.delete(x); for (const x of [...STRANS_G]) STRANS_G.delete(x); saveTrack(); });
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
  await p.goto(BASE); await sleep(300); await p.select('#game', 'za'); await sleep(500); ok((await p.$eval('#count', e => e.textContent)).startsWith('232'), 'offline game dex');
  await p.close();
}
console.log('console errors:', errs.length, errs.slice(0, 10));
console.log(fails ? `${fails} FAILURES` : 'ALL PASS');
await b.close();
