// Data audit: spot-checks built data against well-known facts. Usage: node audit.mjs   (run after build-data.mjs)
import fs from 'node:fs';
import path from 'node:path';
import { DOCS, HERE } from './lib.mjs';
import { mapPvPoke, PVP_ABSENT, PVP_FORMS } from './pvp-map.mjs';
const D = f => JSON.parse(fs.readFileSync(path.join(DOCS, 'data', f), 'utf8'));
const core = D('core.json'), evo = D('evo.json'), ref = D('ref.json'), moves = D('moves.json'), go = D('go.json'), tm = D('tm.json'), loc = D('loc.json');
const E = Object.fromEntries(core.e.map(e => [e.k, e])); const G = Object.fromEntries(core.games.map(g => [g.id, g]));
const sp = id => D(`sp/${id}.json`);
const dex = id => D(`dex/${id}.json`);
const pickGen = (list, gen, cur) => { const e = (list || []).find(x => x[0] >= gen); return e ? e[1] : cur; };
const typesAt = (f, g) => pickGen(f.pt, g, f.t).join('/');
const statsAt = (f, g) => pickGen(f.ps, g, f.s).join('/');
const abAt = (f, g) => { let l = pickGen(f.pa, g, f.a); if (g < 5) l = l.filter(a => !a[1]); return l.filter(a => (ref.ab[a[0]][2] || 1) <= g).map(a => ref.ab[a[0]][0] + (a[1] ? '*' : '')).join(','); };
let pass = 0, fail = 0; const fails = [];
const eq = (label, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); ok ? pass++ : (fail++, fails.push(`${label}: got ${JSON.stringify(got)} expected ${JSON.stringify(want)}`)); };
const ok = (label, c, info = '') => { c ? pass++ : (fail++, fails.push(`${label} ${info}`)); };
const F = (id, k = String(id)) => sp(id).f[k];

// ---- types per generation
eq('Mélofée gen1', typesAt(F(35), 1), 'normal'); eq('Mélofée gen5', typesAt(F(35), 5), 'normal'); eq('Mélofée gen6', typesAt(F(35), 6), 'fairy');
eq('Magnéti gen1', typesAt(F(81), 1), 'electric'); eq('Magnéti gen2', typesAt(F(81), 2), 'electric/steel');
eq('M. Mime gen5', typesAt(F(122), 5), 'psychic'); eq('M. Mime gen6', typesAt(F(122), 6), 'psychic/fairy');
eq('Togekiss gen4', typesAt(F(468), 4), 'normal/flying'); eq('Togekiss gen6', typesAt(F(468), 6), 'fairy/flying');
eq('Azumarill gen3', typesAt(F(184), 3), 'water'); eq('Azumarill gen6', typesAt(F(184), 6), 'water/fairy');
eq('Gardevoir gen4', typesAt(F(282), 4), 'psychic'); eq('Gardevoir gen9', typesAt(F(282), 9), 'psychic/fairy');
eq('Ectoplasma gen9', typesAt(F(94), 9), 'ghost/poison'); eq('Léviator gen2', typesAt(F(130), 2), 'water/flying');
eq('Gengar... Rattata Alola', F(19, '19-alola').t, ['dark', 'normal']);
eq('Raichu Alola', F(26, '26-alola').t, ['electric', 'psychic']);
eq('Mew gen1', typesAt(F(151), 1), 'psychic'); eq('Nymphali', F(700).t, ['fairy']);
// ---- stats history
eq('Pikachu gen1', statsAt(F(25), 1), '35/55/30/50/50/90'); eq('Pikachu gen9', statsAt(F(25), 9), '35/55/40/50/50/90');
eq('Alakazam gen1 spé', statsAt(F(65), 1), '55/50/45/135/135/120');
eq('Papilusion gen5', statsAt(F(12), 5), '60/45/50/80/80/70'); eq('Papilusion gen6', statsAt(F(12), 6), '60/45/50/90/80/70');
eq('Dardargnan gen5', statsAt(F(15), 5), '65/80/40/45/80/75'); eq('Dardargnan gen6', statsAt(F(15), 6), '65/90/40/45/80/75');
eq('Mewtwo gen9', F(150).s, [106, 110, 90, 154, 90, 130]); eq('Mewtwo gen1', statsAt(F(150), 1), '106/110/90/154/154/130');
eq('Ectoplasma gen1 spé', statsAt(F(94), 1), '60/65/60/130/130/110');
eq('Leuphorie', F(242).s, [255, 10, 10, 75, 135, 55]);
// ---- abilities per generation
eq('Pikachu gen3', abAt(F(25), 3), 'Statik'); eq('Pikachu gen5', abAt(F(25), 5), 'Statik,Paratonnerre*');
eq('Mélofée gen3', abAt(F(35), 3), 'Joli Sourire'); eq('Mélofée gen4', abAt(F(35), 4), 'Joli Sourire,Garde Magik');
eq('Mélofée gen5', abAt(F(35), 5), 'Joli Sourire,Garde Magik,Garde-Ami*');
ok('Dracaufeu gen9 Brasier', abAt(F(6), 9).startsWith('Brasier'));
eq('Mew gen3', abAt(F(151), 3), 'Synchro');
// ---- game / expansion dex separation (no duplicates in "Présent dans", base game not listed when the Pokémon is only in an expansion dex)
{
  const poke = async n => { const r = await fetch(`https://pokeapi.co/api/v2/pokedex/${n}/`); if (!r.ok) throw new Error('pokedex ' + n); return new Set((await r.json()).pokemon_entries.map(e => e.pokemon_species.name)); };
  const havePoke = true;
  const pairs = [['sw', 'galar'], ['swisle', 'isle-of-armor'], ['swcrown', 'crown-tundra'], ['sv', 'paldea'], ['svmask', 'kitakami'], ['svdisk', 'blueberry'], ['za', 'lumiose-city'], ['zadlc', 'hyperspace'], ['xy', null], ['sm', null], ['usum', null]];
  for (const [g, pd] of pairs) {
    if (!pd) { let rep = 0; for (const r of dex(g).e) { const nums = r.slice(1); const seen = new Set(); for (let i = 0; i < nums.length; i += 2) { const key = nums[i] + ':' + nums[i + 1]; if (seen.has(key)) rep++; seen.add(key); } } ok(`${g}: no repeated dex label/number (${dex(g).dx.join('/')})`, rep === 0); continue; }
    if (!havePoke) continue;
    const want = await poke(pd), got = new Set(dex(g).e.map(r => r[0]));
    ok(`dex ${g} = PokéAPI ${pd} (${got.size} vs ${want.size})`, want.size === got.size);
  }
  const v = sp(3).f['3'].av; ok('Venusaur: Isolarmure yes, Épée/Bouclier base no, Paldea base no, Disque Indigo yes', v.includes('swisle') && !v.includes('sw') && !v.includes('sv') && v.includes('svdisk') && !v.includes('svmask') && !v.includes('swcrown'), JSON.stringify(v));
  const names = core.games.map(g => g.n); ok('game names unique', new Set(names).size === names.length);
  let dup = 0; for (const e of core.e.filter(e => !e.c)) { const f = sp(e.id).f[e.k]; if (new Set(f.av).size !== f.av.length) dup++; }
  ok('no duplicated game within any species sheet', dup === 0, dup);
}
// ---- regional dex
const dn = (g, name) => { const d = dex(g); const i = d.e.findIndex(r => sp(r[0]).f[String(r[0])].n === name); return i < 0 ? null : d.e[i][2]; };
eq('rb Mewtwo', dn('rb', 'Mewtwo'), 150); eq('rb count', dex('rb').e.length, 151); eq('Z-A #1', sp(dex('za').e[0][0]).f[String(dex('za').e[0][0])].n, 'Germignon');
eq('sv Poussacha', dn('sv', 'Poussacha'), 1); eq('sw Ouistempo', dn('sw', 'Ouistempo'), 1); eq('la Brindibou', dn('la', 'Brindibou'), 1);
eq('gs Germignon', dn('gs', 'Germignon'), 1); eq('gs Pikachu?', dn('gs', 'Pikachu'), 22); eq('e Arcko', dn('e', 'Arcko'), 1);
eq('dp Tortipouss', dn('dp', 'Tortipouss'), 1); eq('bw Victini', dn('bw', 'Victini'), 0); eq('xy Marisson', dn('xy', 'Marisson'), 1);
eq('sm Brindibou', dn('sm', 'Brindibou'), 1); eq('lgpe count', dex('lgpe').e.length, 153); eq('lgpe Meltan', dn('lgpe', 'Meltan'), 152 + 0 || null);
eq('swcrown count>0', dex('swcrown').e.length > 0, true); eq('sv Tauros', dn('sv', 'Tauros') !== null, true);
// ---- evolution texts
const ev = (a, b) => (evo.find(x => x[0] === a && x[1] === b) || [0, 0, []])[2].map(d => d.x.join(', ')).join(' | ');
ok('Évoli>Mentali', /bonheur.*jour/.test(ev('133', '196')), ev('133', '196')); ok('Évoli>Noctali', /nuit/.test(ev('133', '197')));
ok('Évoli>Nymphali', /Fée/.test(ev('133', '700'))); ok('Têtarte>Tarpaud', /Roche Royale/.test(ev('61', '186')));
ok('Psystigri>Mistigrix', /mâle/.test(ev('677', '678'))); ok('Pandespiègle>Pandarbare', /Ténèbres/.test(ev('674', '675')));
ok('Sepiatop>Sepiatroce', /retournant/.test(ev('686', '687'))); ok('Colossinge>Courrousinge', /Poing de Colère/.test(ev('57', '979')));
ok('Pikachu>Raichu Alola', /Alola/.test(ev('25', '26-alola'))); ok('Rosabyss', /Écaille Océan/.test(ev('366', '368')));
ok('Debugant>Kicklee', /Attaque > Défense/.test(ev('236', '106'))); ok('Cheniti>Cheniselle', /femelle/.test(ev('412', '413')));
ok('Qwilfish Hisui>Qwilpik', /Multitoxik/.test(ev('211-hisui', '904'))); ok('Ramoloss Galar>Roigada', /Couronne Galanoa/.test(ev('79-galar', '199-galar')));
ok('Mordudor>Gromago', /999/.test(ev('999', '1000')));
// ---- forms listing
const forms = id => core.e.filter(e => e.id === id).map(e => e.k);
ok('Pikachu forms (v44 : femelle = ♀ sur la fiche, core fe)', ['25', '25-gmax', '25-alola-cap', '25-original-cap'].every(k => forms(25).includes(k)) && !forms(25).includes('25-female') && core.e.find(e => e.k === '25').fe?.k === '25-female', forms(25).join(','));
ok('Mistigrix forms', forms(678).includes('678') && forms(678).includes('678-female'), forms(678).join(','));
eq('Zarbi forms', forms(201).length, 28); ok('Rotom forms', forms(479).length === 6, forms(479).join(',')); ok('Tauros breeds', ['128-paldea-combat-breed', '128-paldea-blaze-breed', '128-paldea-aqua-breed'].every(k => forms(128).includes(k)), forms(128).join(','));
ok('Deoxys forms', forms(386).length === 4); ok('Shaymin', forms(492).length === 2); ok('Giratina', forms(487).length === 2);
ok('Oricorio', forms(741).length === 4, forms(741).join(',')); ok('Lycanroc', forms(745).length === 3, forms(745).join(',')); ok('Vivaldaim seasons', forms(585).length === 4, forms(585).join(','));
ok('Flabébé colors', forms(669).length === 5, forms(669).join(',')); ok('Indeedee', forms(876).length === 2); ok('Basculegion', forms(902).length >= 2, forms(902).join(','));
ok('Hippopotas F (v44 : ♀ sur la fiche)', !forms(449).includes('449-female') && core.e.find(e => e.k === '449').fe?.k === '449-female'); ok('Mega Dracaufeu X/Y', forms(6).includes('6-mega-x') && forms(6).includes('6-mega-y')); ok('Gmax Dracaufeu', forms(6).includes('6-gmax'));
ok('Alcremie many', forms(869).length >= 9, forms(869).length); ok('Minior', forms(774).length >= 2, forms(774).join(','));
ok('Raichu Alola', forms(26).includes('26-alola')); ok('Arcanin Hisui', forms(58).includes('58-hisui')); ok('Rapasdepic Paldea? (Tauros)', forms(128).length >= 4);
// ---- GO
const gof = k => sp(+k.split('-')[0]).f[k].go;
eq('GO Mewtwo L50', gof('150').m50, 4724); eq('GO Mewtwo atk/def/sta', [gof('150').a, gof('150').d, gof('150').s], [300, 182, 214]);
eq('GO Leuphorie L50', gof('242').m50, 3117); eq('GO Leuphorie sta', gof('242').s, 496);
ok('GO Dracaufeu moves', gof('6').fm.includes('FIRE_SPIN_FAST') && (gof('6').cm.includes('BLAST_BURN') || (gof('6').ce || []).includes('BLAST_BURN')), JSON.stringify(gof('6').cm));
ok('GO Pikachu buddy 1km', gof('25').bd === 1, gof('25').bd); ok('GO Raichu Alola exists', !!gof('26-alola'));
ok('GO Evoli evo 25 candy', (evo.find(e => e[0] === '133' && e[1] === '134')[3] || {}).c === 25);
ok('GO Nymphali walk 70 hearts?', JSON.stringify(evo.find(e => e[0] === '133' && e[1] === '700')[3]).includes('"c":25'));
// v47: pogoapi.net is no longer maintained → base stats cross-checked against PvPoke's game master (independent, updated every season)
const pvpFile = path.join(HERE, '.cache/pvpoke-pokemon.json'); fs.mkdirSync(path.dirname(pvpFile), { recursive: true });
if (!fs.existsSync(pvpFile)) fs.writeFileSync(pvpFile, await (await fetch('https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/gamemaster/pokemon.json')).text());
const pvpk = JSON.parse(fs.readFileSync(pvpFile, 'utf8'));
let n = 0, bad = [];
for (const r of pvpk) { if (r.speciesId.includes('_') || (r.tags || []).includes('mega')) continue; const g = sp(r.dex).f[String(r.dex)]?.go; if (!g || g.nost) continue; n++; if (g.a !== r.baseStats.atk || g.d !== r.baseStats.def || g.s !== r.baseStats.hp) bad.push(`${r.dex} ${r.speciesId}:${g.a}/${g.d}/${g.s}!=${r.baseStats.atk}/${r.baseStats.def}/${r.baseStats.hp}`); }
ok(`GO stats vs PvPoke (${n} species)`, n > 800 && bad.length < 5, bad.slice(0, 8).join(' ')); if (bad.length) console.log('GO stats diffs', bad.length, bad.slice(0, 10));
const gmTs = (() => { try { return D('go.json').ts; } catch { return null; } })(); ok('GO game master date ≤ 60 days old (fetch-go.mjs + refresh-go.mjs)', !!gmTs && (Date.now() - Date.parse(gmTs)) / 864e5 <= 60, gmTs);
ok('no pogoapi.net call left in fetch-go / go.mjs (v47)', !/pogoapi\.net\/api/.test(fs.readFileSync(path.join(HERE, 'fetch-go.mjs'), 'utf8') + fs.readFileSync(path.join(HERE, 'go.mjs'), 'utf8')));
// ---- TM / encounters
eq('TM rb Mega Punch', tm.rb['5'], 'CT01'); eq('TM sv count', Object.keys(tm.sv).length, 229); ok('CS rb Cut', tm.rb['15'] === 'CS01', tm.rb['15']);
ok('Enc Rattata rb Route 1', (F(19).en.rb || []).some(r => loc.a[r[0]] === 'Route 1'));
ok('Enc Pikachu sv none', !F(25).en || !F(25).en.sv);
// ---- v21 Hors dex: no sibling-dex species in a « Hors dex » tail; separate lists for games with expansions
{
  const dx = Object.fromEntries(core.games.map(g => [g.id, D(`dex/${g.id}.json`)])), grp = g => g.base || g.id;
  for (const g of core.games) { const sib = new Set(core.games.filter(h => grp(h) === grp(g)).flatMap(h => dx[h.id].e.map(r => r[0]))); const bad = (dx[g.id].x || []).filter(s => sib.has(s)); ok('Hors dex ' + g.id + ' sans espèce d’un dex de la même sauvegarde', !bad.length, JSON.stringify(bad.slice(0, 5))); ok('extra count ' + g.id, (g.extra || 0) === (dx[g.id].x || []).length); }
  for (const b of ['sw', 'sv']) { const h = D(`dex/hors-${b}.json`), reg = new Set(core.games.filter(g => grp(g) === b).flatMap(g => dx[g.id].e.map(r => r[0]))); ok('hors-' + b + ' list', h.x.length > 0 && h.x.every(s => !reg.has(s)) && h.x.every((s, i) => !i || h.x[i - 1] < s), h.x.length); ok('hors-' + b + ' base dexes untouched', core.games.filter(g => grp(g) === b).every(g => !(dx[g.id].x || []).length)); }
  eq('Hors dex É/B count', D('dex/hors-sw.json').x.length, 80); eq('Hors dex É/V count', D('dex/hors-sv.json').x.length, 69);
  eq('ROSA total', dx.oras.e.length + dx.oras.x.length, 721); ok('Mew Hors dex ROSA → sp.hx', (D('sp/151.json').hx || []).includes('oras') && (D('sp/151.json').hx || []).includes('sw'));
  ok('Z-A Hors dex vide (Méga-Dimension)', !dx.za.x.length && !dx.zadlc.x.length);
}
// ---- v22: Pokémon HOME origin marks + Méga-énergie X / Y
{
  const DOCS = path.join(HERE, '../docs');
  for (const f of ['kalos', 'alola', 'gb', 'gba', 'lgpe', 'go', 'galar', 'sinnoh', 'hisui', 'paldea', 'za']) ok('origin mark ' + f + '.png hébergée', fs.existsSync(path.join(DOCS, 'img/origin', f + '.png')));
  ok('origin marks credit (Bulbagarden Archives)', /Bulbagarden Archives/.test(fs.readFileSync(path.join(DOCS, 'img/origin/CREDITS.txt'), 'utf8')));
  const css = fs.readFileSync(path.join(DOCS, 'style.css'), 'utf8'), app = fs.readFileSync(path.join(DOCS, 'app.js'), 'utf8');
  ok('no hotlinking of origin marks', !/bulbagarden\.net/i.test(css + app));
  for (const g of ['rb', 'y', 'gs', 'c']) eq('Console virtuelle ' + g + ' → Home (vc)', core.games.find(x => x.id === g).h, 'vc');
  ok('every Home-compatible game has an origin mark', core.games.filter(g => g.h).every(g => new RegExp(`games: \\[[^\\]]*'${g.id}'`).test(app)), core.games.filter(g => g.h).map(g => g.id).join());
  for (const m of ['alola', 'kalos', 'none', 'gb']) ok('v23 ancienne marque hors dorure ' + m, new RegExp(`id: '${m}', old: 1`).test(app));
  for (const m of ['za', 'paldea', 'hisui', 'sinnoh', 'galar', 'lgpe', 'go']) ok('v23 marque Switch/GO comptée ' + m, new RegExp(`id: '${m}', n:`).test(app));
  for (const g of ['rs', 'e', 'frlg']) ok('v23 GBA ' + g + ' sans lien HOME (pas de marque)', !core.games.find(x => x.id === g).h && !new RegExp(`games: \\[[^\\]]*'${g}'`).test(app));
  const me = D('mega-energy.json'); for (const id of ['6-x', '6-y', '150-x', '150-y']) ok('energy icon ' + id, me.ids.map(String).includes(id) && fs.existsSync(path.join(DOCS, 'img/energy', id + '.webp')));
}
// ---- v24: « HOME » in capitals in user-visible strings; Catégorie entries
{
  const DOCS = path.join(HERE, '../docs'), app = fs.readFileSync(path.join(DOCS, 'app.js'), 'utf8').replace("k === 'Home'", ''), html = fs.readFileSync(path.join(DOCS, 'index.html'), 'utf8');
  ok('v24 no « Home » (lower-case) in app.js / index.html', !/\bHome\b/.test(app + html), (app + html).match(/.{0,30}\bHome\b.{0,30}/g));
  for (const v of ['swmiss', 'oldmiss', 'strans', 'nostrans', 'hmiss']) ok('v24 catégorie ' + v, html.includes(`value="${v}"`));
  ok('v24 HOME manquants label', html.includes('⚪🏠 HOME manquants (marques Switch + GO)'));
}
// ---- v25: Baron (Alpha) icon self-hosted + credited; Baron storage in backups; regional-first regions
{
  const DOCS = path.join(HERE, '../docs'), app = fs.readFileSync(path.join(DOCS, 'app.js'), 'utf8'), css = fs.readFileSync(path.join(DOCS, 'style.css'), 'utf8'), sw = fs.readFileSync(path.join(DOCS, 'sw.js'), 'utf8');
  ok('v25 icône Baron hébergée (img/alpha/baron.png)', fs.existsSync(path.join(DOCS, 'img/alpha/baron.png')) && fs.statSync(path.join(DOCS, 'img/alpha/baron.png')).size > 500);
  ok('v25 crédit icône Baron (Bulbagarden Archives)', /Bulbagarden Archives/.test(fs.readFileSync(path.join(DOCS, 'img/alpha/CREDITS.txt'), 'utf8')));
  ok('v25 pas de hotlink Bulbagarden', !/bulbagarden\.net/.test(app + css));
  for (const k of ['baron_g', 'barons_g', 'home_b', 'home_bs']) ok('v25 sauvegarde/export ' + k, app.includes(`${k}: [...`) && app.includes(`d.${k}`));
  ok('v25 B. shiny coché = style Shiny', /\.act\.barons\[aria-pressed=true\]\{color:#b58f00;border-color:#f2c200;background:rgba\(242,194,0,\.12\)\}/.test(css) && css.includes('.act.sh[aria-pressed=true]{color:#b58f00;border-color:#f2c200;background:rgba(242,194,0,.12)}'));
  ok('v25 régions des formes régionales', /alola: \['sm', 'usum'\], galar: \['sw', 'swisle', 'swcrown'\], hisui: \['la'\], paldea: \['sv', 'svmask', 'svdisk'\]/.test(app));
  { const html = fs.readFileSync(path.join(DOCS, 'index.html'), 'utf8'); for (const [v, l] of [['baron', 'Barons'], ['nobaron', '⚪ Barons manquants']]) ok('v25 catégorie ' + v, html.includes(`<option value="${v}">${l}</option>`)); }
  { const html = fs.readFileSync(path.join(DOCS, 'index.html'), 'utf8'), app = fs.readFileSync(path.join(DOCS, 'app.js'), 'utf8'); ok('v47 « Baron shiny » retiré (filtres + bouton), marques conservées (export barons_g / home_bs)', !/value="(no)?barons"/.test(html) && !/class="act barons"/.test(app) && /barons_g: \[\.\.\.BARONS_G\]/.test(app) && /home_bs: \[\.\.\.HOME_BS\]/.test(app)); ok('v47 blocs HOME « Dex national HOME » + « Shiny »', /else if \(mode === 'home'\) \{ P = homeDexHTML\(p\) \+ homeSrcHTML\(p, f, 'Compatibilité'\) \+ homeShinyHTML\(p, f\); N = evoB; \}/.test(app)); }
  ok('v25 icône Baron en cache hors-ligne', sw.includes("'img/alpha/baron.png'"));
}
// ---- v27: legend list, in-app messages, unified names
{ const app = fs.readFileSync(path.join(HERE, '../docs/app.js'), 'utf8'), css = fs.readFileSync(path.join(HERE, '../docs/style.css'), 'utf8');
  const code = app.split('\n').filter(l => !/^\s*\/\//.test(l)).map(l => l.replace(/\s\/\/ .*$/, '')).join('\n');
  ok('v27 aucun alert() dans app.js', !/\balert\(/.test(code));
  ok('v27 toast() en zone live polie', /function toast\(/.test(app) && /aria-live', 'polite'/.test(app) && /\.toast\.on\{/.test(css));
  ok('v27 légende en liste (ul.lgl)', /BASE_LEGEND = '<ul class="lgl">'/.test(app) && /HOME_LEGEND = '<ul class="lgl">'/.test(app) && /\.lgl li\{/.test(css));
  ok('v27 pas de numéro de génération en chiffres arabes', !/Gén\. ?\d/.test(code) && !/\dᵉ/.test(code));
  ok('v27 pas de « / » collé dans les noms de jeux (app)', !/'(?:DÉ\/PS|[^'<\/]*[A-Za-zÉé0-9]\/[A-Za-zÉé0-9][^'<\/]*)'/.test(code.match(/const GAME_SHORT = \{[^\n]*\}/)[0]) && !/É\/[VB]/.test(code) && !/ROSA|USUL/.test(code.replace(/\/\/[^\n]*/g, '')));
  const core = JSON.parse(fs.readFileSync(path.join(HERE, '../docs/data/core.json'), 'utf8'));
  ok('v27 core.json : noms courts avec « / » espacé', core.games.every(g => !/\S\/|\/\S/.test(g.s) && !/\S\/|\/\S/.test(g.n)));
  ok('v27 bouton grille / liste en icônes SVG (plus de ☰ / ▦)', /VIEW_LIST_IC = '<svg/.test(app) && /VIEW_GRID_IC = '<svg/.test(app) && !/'☰'|'▦'/.test(code));
  ok('v27 Baron coché brun-rouge (clair + sombre), B. shiny inchangé', /\.act\.baron\[aria-pressed=true\]\{color:#8a3b12;border-color:#a0522d/.test(css) && /\.act\.baron\[aria-pressed=true\]\{color:#e8a477;border-color:#c46a3c/.test(css) && /\.act\.barons\[aria-pressed=true\]\{color:#b58f00;border-color:#f2c200/.test(css));
  ok('v27 titres du menu Catégorie', /CAT_HEAD = \{ leg: 'Statut', caught: 'Marques', trans: 'HOME', baron: 'Barons' \}/.test(app) && /sep: catSep/.test(app));
  const games = fs.readFileSync(path.join(HERE, 'games.mjs'), 'utf8'); ok('v27 games.mjs : noms courts avec « / » espacé', !/short: '[^']*(\S\/|\/\S)[^']*'/.test(games)); }
// ---- v26: every list / sheet selector uses the custom dropdown
{ const app = fs.readFileSync(path.join(HERE, '../docs/app.js'), 'utf8'); for (const id of ['game', 'cat', 'gen', 'sort', 'dgame']) ok('v26 menu personnalisé #' + id, app.includes(`initMenu('${id}'`)); }
{ const html = fs.readFileSync(path.join(HERE, '../docs/index.html'), 'utf8'); ok('v26 catégorie Ultra-Chimères sous Fabuleux', /value="myth">Fabuleux<\/option>\s*<option value="ub">Ultra-Chimères<\/option>/.test(html)); }
// ---- v28: GO Megas / Primals / Gigamax (build/go-overrides.json must stay applied after every GO update)
{ const OV = JSON.parse(fs.readFileSync(path.join(HERE, 'go-overrides.json'), 'utf8'));
  for (const k of OV.megaReleased.keys) ok('v28 Méga sortie dans GO (override) ' + k, E[k] && E[k].go === 1 && F(E[k].id, k).go && F(E[k].id, k).go.r === 1);
  for (const [k, o] of Object.entries(OV.gmax.forms)) { const g = E[k] && F(E[k].id, k).go; ok('v28 Gigamax GO ' + k, !!g && (o.from ? !E[k].go && E[k].gof === o.from && g.rf === o.from && g.r === 0 : E[k].go === 1 && g.r === 1) && (o.shiny ? g.sh && g.sh[0] === 'max' && !g.nosh : g.nosh === 1)); }
  ok('v28 Gigamax hors liste sans GO', core.e.filter(e => e.c === 'gmax' && (e.go || e.gof)).length === Object.keys(OV.gmax.forms).length && !E['892-single-strike-gmax'].go && !E['890-eternamax']?.go);
  ok('v60.14 18 Gigamax sortis dont Duralugon (6/11/2026, v44 : Salarsen = une fiche)', core.e.filter(e => e.c === 'gmax' && e.go).length === 18 && E['884-gmax'].go === 1 && !E['884-gmax'].gof && F(884, '884-gmax').go.r === 1 && !F(884, '884-gmax').go.rf && !F(884, '884-gmax').go.shf);
  ok('v28 pas de shiny Gigamax Lézargus ; v60.18 Salarsen Gigamax shiny GO', F(818, '818-gmax').go.nosh === 1 && F(849, '849-amped-gmax').go.sh?.includes('max') && !F(849, '849-amped-gmax').go.nosh && !F(6, '6-gmax').go.nosh);
  ok('v28 Méga-Dracaufeu X / Y, Méga-Mewtwo X / Y, Primo-Kyogre / Groudon dans GO', ['6-mega-x', '6-mega-y', '150-mega-x', '150-mega-y', '382-primal', '383-primal'].every(k => E[k].go === 1));
  ok('v60.6 Méga-Lugulabre sortie dans GO (31/10/2026), Vent Mauvais +', E['609-mega'].go === 1 && F(609, '609-mega').go.r === 1 && F(609, '609-mega').go.cm.includes('OMINOUS_WIND_PLUS'));
  ok('v28 Gigamax GO = stats de la base', F(6, '6-gmax').go.a === F(6).go.a && F(6, '6-gmax').go.m50 === F(6).go.m50);
  ok('v28 shiny Méga = Méga-Évolution d’un shiny', JSON.stringify(F(6, '6-mega-x').go.sh) === '["mega"]');
  ok('v28 nombre de Méga / Primo GO', core.e.filter(e => (e.c === 'mega' || e.c === 'primal') && e.go).length === 63);
  const app = fs.readFileSync(path.join(HERE, '../docs/app.js'), 'utf8'), bd = fs.readFileSync(path.join(HERE, 'build-data.mjs'), 'utf8');
  ok('v28 build-data lance apply-go-overrides', bd.includes("await import('./apply-go-overrides.mjs')") && !/e\.cat !== 'mega'\) r\.go/.test(bd));
  ok('v28 GO hors dorure (goGold)', /const goGold = p => !!p\.go && !p\.mb && p\.c !== 'gmax' && p\.c !== 'primal';/.test(app) && (app.match(/goGold\(p\)/g) || []).length >= 3); }
// ---- v29: cries (self-hosted MP3) + species reproduction data
{ const C = D('cries.json'), dir = path.join(HERE, '../docs/cries'); let miss = 0, bytes = 0; const seen = new Set();
  for (const v of Object.values(C)) for (const f of v) if (f && !seen.has(f)) { seen.add(f); const fp = path.join(dir, f[0] === 'o' ? 'legacy' : 'latest', f.slice(2) + '.mp3'); if (!fs.existsSync(fp)) miss++; else bytes += fs.statSync(fp).size; }
  ok('v29 cris : tous les fichiers référencés existent', miss === 0, miss + ' manquants');
  ok('v29 cris : toutes les formes ont un cri', core.e.every(e => C[e.k] && C[e.k][0]), core.e.filter(e => !C[e.k]).map(e => e.k).slice(0, 5).join());
  ok('v29 cris : taille raisonnable (< 20 Mo)', bytes < 20 * 1048576, (bytes / 1048576).toFixed(1) + ' Mo');
  eq('v29 cri Dracaufeu (actuel + ancien)', C['6'], ['l/6', 'o/6']); eq('v29 cri Méga-Dracaufeu X (propre)', C['6-mega-x'][0], 'l/10034'); eq('v29 Pêchaminus sans cri ancien', C['1025'][1], 0);
  const s6 = sp(6); eq('v29 Dracaufeu reproduction', [s6.gr, s6.cr, s6.hc, s6.bh, s6.eg, s6.gw], [1, 45, 20, 70, ['Monstrueux', 'Draconique'], 'medium-slow']);
  ok('v29 SW : cris en cache après écoute', /pokedex-cries/.test(fs.readFileSync(path.join(HERE, '../docs/sw.js'), 'utf8'))); }
// ---- v30: update prompt (waiting SW), sheet game selector
{ const sw = fs.readFileSync(path.join(HERE, '../docs/sw.js'), 'utf8'), app = fs.readFileSync(path.join(HERE, '../docs/app.js'), 'utf8'), css = fs.readFileSync(path.join(HERE, '../docs/style.css'), 'utf8');
  const inst = (sw.match(/addEventListener\('install'[\s\S]*?\n\}\);/) || [''])[0];
  ok('v30 SW : pas de skipWaiting forcé à l’installation (sauf pont v29-)', !/\.then\(\(\) => self\.skipWaiting\(\)\)/.test(inst) && /\+m\[1\] < 30/.test(inst));
  ok('v30 SW : skipWaiting sur demande + version / nouveautés', /type === 'SKIP_WAITING'\) self\.skipWaiting\(\)/.test(sw) && /type === 'VERSION'/.test(sw) && /const NOTES = '[^']{10,160}'/.test(sw));
  ok('v30 app : rechargement unique après le tap (controllerchange gardé)', /if \(!SW_ASKED \|\| SW_RELOADING\) return; SW_RELOADING = true; location\.reload\(\)/.test(app));
  ok('v30 app : pas de bannière à la première installation', /if \(!navigator\.serviceWorker\.controller/.test(app));
  ok('v30 app : vérifications au démarrage, au retour (visibilitychange) et toutes les 30 min', /swWatch\(reg\)/.test(app) && /visibilitychange[^\n]*swCheck\(\)/.test(app) && /setInterval\(swCheck, 30 \* 60 \* 1000\)/.test(app) && /\.update\(\)/.test(app));
  ok('v30 sélecteur de jeu de la fiche dans l’en-tête collant', /navHTML\(p, `<div class="gamebar dgbar">/.test(app) && /\.dgbar\{/.test(css) && /\.gnum\{/.test(css));
  ok('v30 « Présent dans » en vue d’ensemble seulement', /else \{ P = availHTML\(sp, games[^\n]*homeSrcHTML\(p, f\) \+ goBox;/.test(app));
  ok('v43 ordre des blocs : jeu (lieu → objets → repro → shiny), GO (Obscur & Purifié puis Costumes après Formes), HOME (Compatibilité), vue d’ensemble (Costumes GO en dernier)', /if \(gm\) \{ P = tradeBoxHTML\(p, gm\.id\) \+ regB; N = evoB \+ encHTML[^\n]*C = heldHTML[^\n]*shinyHTML[^\n]*breedHTML[^\n]*M = (?:gmaxMoveHTML\(p\) \+ )?movesHTML[^\n]*D = E\.ev; \}/.test(app) && app.includes("costumesHTML('Costumes')") && app.includes("homeSrcHTML(p, f, 'Compatibilité')") && app.includes("costumesHTML('Costumes GO')") && app.includes('${size}\n    ${baseNoteHTML(p)}\n    <section class="box trackbox">'));
}
// ---- v31: shiny data, popup texts, Rouge Feu / Vert Feuille (Switch)
{ const S = D('shiny.json'), DS = D('desc.json'), mv = D('moves.json'), ref = D('ref.json'), sw = fs.readFileSync(path.join(HERE, '../docs/sw.js'), 'utf8'), app = fs.readFileSync(path.join(HERE, '../docs/app.js'), 'utf8');
  const gids = core.games.map(g => g.id), keys = new Set(core.e.map(e => e.k)), ids = new Set(core.e.map(e => e.id));
  ok('v31 shiny : méthodes pour chaque jeu (+ GO)', gids.every(g => S.m[g]) && S.m.go, gids.filter(g => !S.m[g]).join());
  ok('v31 shiny : Gén. I sans chromatiques, Gén. II+ avec taux de base', ['rb', 'y'].every(g => !S.m[g].e) && gids.filter(g => !['rb', 'y'].includes(g)).every(g => S.m[g].e && /1\/(8192|4096)/.test(S.m[g].b)));
  ok('v31 shiny : Charme Chroma à partir de Noir 2 / Blanc 2 seulement', ['gs', 'c', 'rs', 'e', 'frlg', 'frlgsw', 'dp', 'pt', 'hgss', 'bw'].every(g => !S.m[g].c) && ['b2w2', 'xy', 'sv', 'za'].every(g => S.m[g].c));
  const badK = Object.values(S.l).flatMap(l => Object.keys(l)).filter(k => k[0] === '#' ? !ids.has(+k.slice(1)) : !keys.has(k));
  ok('v31 shiny : verrous liés à des espèces / formes existantes', badK.length === 0, badK.slice(0, 5).join());
  ok('v31 shiny : verrous connus (Koraidon ÉV, Zacian ÉB, Mew Let’s Go total ; Pikachu partenaire partiel)', S.l.sv['#1007'][0] === 't' && S.l.sw['#888'][0] === 't' && S.l.lgpe['#151'][0] === 't' && S.l.lgpe['#25'][0] === 'p');
  ok('v31 shiny : Méga-Dimension, légendaires chromatiques vérifiés', JSON.stringify(S.ok.zadlc) === '[380,381,638,639,640,999,1000]' && /Vérifié/.test(S.v.zadlc) && /Vérifié/.test(S.v.lgpe));
  ok('v31 descriptions : toutes les attaques ont un texte FR', Object.keys(mv).every(k => DS.m[k]), Object.keys(mv).filter(k => !DS.m[k]).length + ' manquantes');
  ok('v31 descriptions : objets tenus (≥ 90 %)', Object.keys(DS.i).length / Object.keys(ref.it).length >= 0.9, Object.keys(DS.i).length + '/' + Object.keys(ref.it).length);
  ok('v31 sprites HOME / animés : jamais pré-chargés par le service worker', !/githubusercontent/.test(sw) && /never precached/.test(app));
  const fg = core.games.find(g => g.id === 'frlgsw'), fo = core.games.find(g => g.id === 'frlg'), fi = gids.indexOf('frlgsw'), oi = gids.indexOf('frlg');
  ok('v31 RF/VF Switch : jeu séparé, compatible HOME, 151, 1er de la section Switch', fg && fg.h === 'direct' && fg.count === 150 && fg.extra === 61 && fi === 0 && fo && !fo.h);
  const inG = (e, i) => (e.gb >> i) & 1, bad = core.e.filter(e => inG(e, fi) && (!inG(e, oi) || e.id > 151));
  ok('v31 RF/VF Switch : uniquement le Pokédex de Kanto de RF/VF', bad.length === 0 && !inG(E['151'], fi) && core.e.filter(e => inG(e, fi)).length === 150, bad.slice(0, 5).map(e => e.k).join());
  ok('v31 RF/VF Switch : n° Kanto identiques à RF/VF (GBA)', [1, 25, 150].every(id => JSON.stringify(sp(id).gm.frlgsw) === JSON.stringify(sp(id).gm.frlg)) && fs.existsSync(path.join(HERE, '../docs/data/dex/frlgsw.json')));
  ok('v31 RF/VF Switch : marque d’origine GBA (image) dans les jeux actuels', /id: 'gba'[^}]*games: \['frlgsw'\]/.test(app) && fs.existsSync(path.join(HERE, '../docs/img/origin/gba.png')) && /SWITCH_IDS = new Set\(\['frlgsw'/.test(app));
  ok('v31 Présent dans : icône du jeu (même pastille que les menus Jeux)', (app.match(/data-game="\$\{g\}">\$\{gdot\(g\)\}/g) || []).length === 2 && /\.avl li a \.gdot\{/.test(fs.readFileSync(path.join(HERE, '../docs/style.css'), 'utf8')));
  ok('v31 SW : version ≥ v31, DATA_VERSION ≥ d11', +sw.match(/VERSION = 'v(\d+)(?:\.\d+)*'/)[1] >= 31 && +sw.match(/DATA_VERSION = 'd(\d+)'/)[1] >= 11);
}
// ---- v32: Poképédia (descriptions, étymologies, distributions, lieux Switch), GO extras, Méga / Gigamax filters
{ const core = D('core.json'), sw = fs.readFileSync(path.join(HERE, '../docs/sw.js'), 'utf8'), app = fs.readFileSync(path.join(HERE, '../docs/app.js'), 'utf8'), html = fs.readFileSync(path.join(HERE, '../docs/index.html'), 'utf8');
  const ids = [...new Set(core.e.map(e => e.id))], S = ids.map(id => [id, sp(id)]);
  const withPp = S.filter(([, s]) => s.pt && (s.pv || Object.values(s.f).some(f => f.pv))).length;
  ok('v32 Poképédia : descriptions pour ≥ 99 % des espèces', withPp / ids.length >= 0.99, withPp + '/' + ids.length);
  const badIdx = S.filter(([, s]) => [s.pv || {}, ...Object.values(s.f).map(f => f.pv || {})].some(m => Object.values(m).some(i => !s.pt || i < 0 || i >= s.pt.length))).map(([id]) => id);
  ok('v32 Poképédia : index de textes valides', badIdx.length === 0, badIdx.slice(0, 5).join());
  const verOk = new Set(core.games.flatMap(g => g.ver.map(v => String(v[0]))));
  const badVer = S.filter(([, s]) => Object.keys(s.pv || {}).some(v => !verOk.has(v))).map(([id]) => id);
  ok('v32 Poképédia : versions connues de l’app uniquement', badVer.length === 0, badVer.slice(0, 5).join());
  const dirty = S.filter(([, s]) => (s.pt || []).some(t => /\{\{|\}\}|\[\[|\]\]|'''|<ref|<br/.test(t))).map(([id]) => id);
  ok('v32 Poképédia : textes nettoyés (pas de wikicode)', dirty.length === 0, dirty.slice(0, 8).join());
  const s6 = sp(6), s1017 = sp(1017), s26 = sp(26);
  ok('v32 extensions → texte du jeu de base (Ogerpon Masque du Puits, Méga-Dimension)', s1017.f['1017-wellspring-mask'].pv['42'] === s1017.f['1017-wellspring-mask'].pv['40'] && s6.pv['48'] === s6.pv['47']);
  ok('v32 formes : textes propres (Ogerpon masques, Raichu d’Alola)', s1017.f['1017-wellspring-mask'].pv['40'] !== s1017.f['1017'].pv['40'] && /Alola/.test(s26.pt[s26.f['26-alola'].pv['27']]));
  ok('v32 étymologies : ligne en français pour ≥ 97 % des espèces', S.filter(([, s]) => s.ety && s.ety.some(r => /^Français/.test(r[0]))).length / ids.length >= 0.97);
  ok('v32 distributions événementielles : années + libellés', S.filter(([, s]) => s.evd).length > 100 && S.every(([, s]) => !s.evd || s.evd.every(e => /^\d{4}$/.test(e[0]) && e[1].length > 2)));
  const LG = ['sv', 'svmask', 'svdisk', 'za', 'zadlc', 'la', 'bdsp', 'sw', 'swisle', 'swcrown', 'lgpe'], cov = {};
  for (const [, s] of S) for (const f of Object.values(s.f)) for (const g of Object.keys(f.pl || {})) cov[g] = (cov[g] || 0) + 1;
  ok('v32 lieux Poképédia : tous les jeux Switch (ÉV + DLC, Z-A + DLC, LPA, DEPS, ÉB + DLC, Let’s Go)', LG.every(g => cov[g] > 20), JSON.stringify(cov));
  const badG = Object.keys(cov).filter(g => !core.games.some(x => x.id === g)); ok('v32 lieux : identifiants de jeux valides', badG.length === 0, badG.join());
  const anyL = re => S.some(([, s]) => Object.values(s.f).some(f => Object.values(f.pl || {}).some(L => L.some(x => re.test(x[1])))));
  ok('v32 lieux : cadeaux et échanges in-game présents', anyL(/^Donné/) && anyL(/^Échange/));
  ok('v32 lieux : pas de texte « À compléter »', S.every(([, s]) => Object.values(s.f).every(f => !f.pln || Object.values(f.pln).every(t => !/compléter/i.test(t)))));
  ok('v32 lieux : noms de lieux sans « Page|Affiché » ni wikicode', S.every(([, s]) => Object.values(s.f).every(f => !f.pl || Object.values(f.pl).every(L => L.every(([pl]) => !/[|\[\]{}]/.test(pl))))));
  ok('v32 crédit Poképédia CC BY-NC-SA 3.0 FR (app + à propos)', /CC BY-NC-SA 3\.0 FR/.test(app) && /pokepedia\.fr/.test(html) && /by-nc-sa\/3\.0\/fr/.test(html));
  ok('v32 extrait Poképédia suivi (rebuild sans re-télécharger)', fs.existsSync(path.join(HERE, 'pokepedia/extract.json.gz')) && /pokepedia\.mjs'\)\.then\(m => m\.apply\(\)\)/.test(fs.readFileSync(path.join(HERE, 'build-data.mjs'), 'utf8')));
  const pvp = D('pvp.json'), keys = new Set(core.e.map(e => e.k));
  ok('v32 PvP : classements PvPoke (3 ligues) liés à des entrées existantes', pvp.n.g > 500 && pvp.n.m > 200 && Object.keys(pvp.r).length > 500 && Object.keys(pvp.r).every(k => keys.has(k)));
  ok('v32 PvP : chargé avec les données GO seulement et dans le pack hors-ligne', /getJSON\('data\/pvp\.json'\)/.test(app) && /'data\/pvp\.json'/.test(app) && !/pvp/.test(sw));
  const ov = JSON.parse(fs.readFileSync(path.join(HERE, 'go-overrides.json'), 'utf8')).regional;
  const rgKeys = Object.keys(ov.keys).filter(k => !k.startsWith('_'));
  ok('v32 GO régionaux : clés valides, appliqués par apply-go-overrides', rgKeys.every(k => keys.has(k)) && sp(115).f['115'].go.rg === 'Australie' && sp(336).f['336'].go.rgm === 1);
  ok('v32 GO : PC max niv. 40 (multiplicateur 0,7903)', /40: 0\.7903/.test(app));
  ok('v32 Catégories Méga-évolutions / Gigamax après Ultra-Chimères', /value="ub">Ultra-Chimères<\/option>\s*<option value="mega">Méga-évolutions<\/option>\s*<option value="gmax">Gigamax<\/option>/.test(html));
  { const dit = JSON.parse(fs.readFileSync(new URL('../docs/data/sp/132.json', import.meta.url))).f['132'].go?.dit, ids = new Set(core.e.map(e => e.id)), DJ = JSON.parse(fs.readFileSync(new URL('./go-ditto.json', import.meta.url)));
    ok('v32 Métamorph GO : déguisements actuels / passés appliqués depuis go-ditto.json', dit && dit.cur.ids.length === DJ.current.names.length && dit.past.length === DJ.past.length && [dit.cur, ...dit.past].every(x => x.ids.length && x.ids.every(id => ids.has(id))));
    ok('v32 Métamorph GO : sources citées (URL) + date de vérification', dit && dit.src.length >= 2 && dit.src.every(([n, u]) => n && /^https:\/\//.test(u)) && /^\d{4}-\d\d-\d\d$/.test(dit.chk)); }
  ok('v32 SW : VERSION ≥ v32 + DATA_VERSION ≥ d12 + NOTES', +((sw.match(/const VERSION = 'v(\d+)(?:\.\d+)*'/) || [])[1] || 0) >= 32 && +((sw.match(/DATA_VERSION = 'd(\d+)'/) || [])[1] || 0) >= 12 && /const NOTES = '[^']{10,160}'/.test(sw));
  { const css = fs.readFileSync(new URL('../docs/style.css', import.meta.url), 'utf8');
    ok('v33 hero : image en bloc centrée + boutons Officiel / HOME / Animé centrés dessous (CSS)', /\.hero #heroimg\{display:block;margin:0 auto;box-sizing:border-box;[^}]*aspect-ratio:1\/1/.test(css) && /\.hero \.sprsw\{display:flex;width:max-content;[^}]*margin:4px auto 8px/.test(css)); }
}
// ---- v34 : corrections de l'audit v33 (régressions)
{ const app = fs.readFileSync(path.join(DOCS, 'app.js'), 'utf8'), sw = fs.readFileSync(path.join(DOCS, 'sw.js'), 'utf8');
  const OV = JSON.parse(fs.readFileSync(path.join(HERE, 'go-overrides.json'), 'utf8'));
  const TY = new Set(core.types.map(t => t[0]));
  const typed = core.e.filter(e => (e.id === 493 || e.id === 773) && e.c === 'form' && TY.has(e.k.split('-').slice(1).join('-')));
  ok('v34 Arceus / Silvallié : 34 formes du type de leur plaque / ROM (core + fiche)', typed.length === 34 && typed.every(e => e.t.length === 1 && e.t[0] === e.k.split('-')[1] && sp(e.id).f[e.k].t[0] === e.t[0]));
  eq('v34 Arceus Feu : type', E['493-fire'].t, ['fire']); eq('v34 Silvallié Type : Fée', E['773-fairy'].t, ['fairy']);
  const goR = k => { const e = E[k]; return !!(e && e.go && sp(e.id).f[k].go && sp(e.id).f[k].go.r === 1); };
  const rel = Object.keys(OV.released.keys).filter(k => !k.startsWith('_'));
  ok('v34 GO : 13 espèces + 20 formes sorties (go-overrides released) marquées disponibles', rel.length >= 33 && rel.every(goR), rel.filter(k => !goR(k)).join());
  ok('v34 GO : Zeraora, Salarsen, Tapatoès, M. Mime de Galar, Zygarde 10 %, Zacian Épée Suprême, Darumacho de Galar disponibles', ['807', '849', '931', '122-galar', '718-10', '888-crowned', '555-galar-standard', '982-three-segment'].every(goR));
  ok('v34 GO : Mordudor = Forme Marche seulement', goR('999-roaming') && !E['999'].go && sp(999).f['999'].go.r === 0);
  const ed = (a, b) => evo.find(x => x[0] === a && x[1] === b)[3];
  ok('v34 GO évolutions : Pommes de Verpom, 999 Pièces de Mordudor sans bonbons', ed('840', '841').i === 'Pomme Acidulée' && ed('840', '842').i === 'Pomme Sucrée' && ed('840', '1011').i === 'Pomme Nectar' && ed('999', '1000').i === 'Pièces de Mordudor' && ed('999', '1000').ic === 999 && ed('999', '1000').c === undefined);
  ok('v34 GO évolutions : plus de code interne (Maple / Pierre d’évolution spéciale)', !evo.some(x => x[3] && /Maple|Pierre d’évolution spéciale/.test(x[3].i || '')) && !/Pièces Gimmighoul/.test(JSON.stringify(evo)));
  ok('v34 GO : bonbons absents → pas de « ? + »', /filter\(Boolean\)\.join\(' \+ '\) \|\| '\?'/.test(app));
  const zb = core.e.filter(e => e.zb);
  ok('v34 Barons Z-A : liste Poképédia (niveau Baron en Z-A / Méga-Dimension), sans légendaires ni Méga', zb.length > 150 && zb.length < 400 && zb.every(e => !e.lg && !e.my && !e.mb), String(zb.length));
  { const zi = core.games.findIndex(g => g.id === 'za'), zd = core.games.findIndex(g => g.id === 'zadlc'), zaNon = core.e.filter(e => ((e.gb >> zi) & 1 || (e.gb >> zd) & 1) && !e.c && !e.lg && !e.my && !e.zb);
  ok('v34 Barons Z-A : espèces sans niveau Baron exclues (alphaOk teste core.zb) ; marques gardées (non supprimées)', /p\.zb \|\| \(p\.c !== 'reg' && b\.zb\)/.test(app) && /\['hisui', 'za'\]\.some\(m => HOME_O\.has/.test(app) && !!E['181'].zb && zaNon.length >= 5, String(zaNon.length)); }
  const L = core.games.findIndex(g => g.id === 'lgpe'), inL = e => (e.gb >> L) & 1;
  eq('v34 Let’s Go : 153 espèces', new Set(core.e.filter(inL).map(e => e.id)).size, 153);
  eq('v34 Let’s Go : 15 Méga de Kanto (filtre Méga)', core.e.filter(e => inL(e) && e.mb).length, 15);
  ok('v34 Let’s Go : aucune espèce hors Kanto (sauf Meltan / Melmetal)', core.e.filter(inL).every(e => e.id <= 151 || e.id === 808 || e.id === 809) && dex('lgpe').x.length === 0 && G.lgpe.extra === 0);
  ok('v34 Papilord / Lépidonille / Pérégrain : une seule forme, anciennes clés migrées (core.mg)', [414, 664, 665].every(id => core.e.filter(e => e.id === id).length === 1) && Object.keys(core.mg || {}).length === 40 && /function migrateMerged\(\)/.test(app));
  ok('v34 noms de formes : plus de mots anglais (polar, meadow, sandy, trash…)', !core.e.some(e => /\b(polar|tundra|meadow|sandy|trash|poke-ball|garden|elegant)\b/.test(e.n)));
  ok('v34 noms : Météno Noyau, Zygarde Forme 10 %, Floette Fleur Éternelle', !core.e.some(e => /Noyeau/.test(e.n)) && E['718-10'].n === 'Zygarde Forme 10 %' && E['670-eternal'].n === 'Floette Fleur Éternelle');
  ok('v34 Zygarde 10 % dans Z-A et Méga-Dimension', ['za', 'zadlc'].every(g => sp(718).f['718-10'].av.includes(g) && (E['718-10'].gb >> core.games.findIndex(x => x.id === g)) & 1));
  ok('v34 Xerneas / Koraidon / Miraidon : formes = variantes de la base (comptent pour 1)', core.e.filter(e => [716, 1007, 1008].includes(e.id) && e.c === 'form').every(e => e.bo === String(e.id)) && core.e.filter(e => [716, 1007, 1008].includes(e.id) && e.c === 'form').length === 5);
  ok('v34 hors-ligne : drapeau du pack lié à DATA_VERSION (sw → dv)', /dv: DATA_VERSION/.test(sw) && /v === DATA_DV/.test(app) && /store\.set\('packDone2', DATA_DV/.test(app) && !/store\.set\('packDone2', true\)/.test(app));
  ok('v34 RF/VF Switch : pas de ligne GBA (Colosseum), « Centre Pokémon » en français', !loc.a.some(a => /Pokecenter/.test(a)) && !loc.m.some(m => /Pokemon /.test(m)) && !(sp(25).f['25'].en.frlgsw || []).some(r => /Colosseum/.test(loc.m[r[1]])));
  ok('v34 lieux : repli « Faire évoluer … » / « Lieu non renseigné » pour les jeux Poképédia', /Lieu non renseigné pour ce jeu/.test(app) && /Faire évoluer \$\{/.test(app));
  { let bad = 0; for (const id of [43, 275, 276, 409]) { const s = sp(id); bad += Object.entries(s.tv || {}).filter(([v, i]) => !(s.pv || {})[v] && s.fv[v] === undefined && /pieds\/seconde|miles|\d pieds/.test(s.tt[i])).length; } eq('v34 descriptions : plus d’unités impériales', bad, 0); }
  ok('v34 SW : VERSION ≥ v34, DATA_VERSION ≥ d14 (v35 : v35 / d15)', +((sw.match(/const VERSION = 'v(\d+)(?:\.\d+)*'/) || [])[1] || 0) >= 34 && +((sw.match(/DATA_VERSION = 'd(\d+)'/) || [])[1] || 0) >= 14);
  ok('v34 build : apply-v34.mjs lancé à la fin de build-data.mjs', /import\('\.\/apply-v34\.mjs'\)/.test(fs.readFileSync(path.join(HERE, 'build-data.mjs'), 'utf8')));
}

// ---- v35 : images HOME (défaut) par forme
{ const app = fs.readFileSync(path.join(DOCS, 'app.js'), 'utf8');
  ok('v35 HOME auto-hébergé : chaque hh a son fichier img/h', [...core.e, ...core.e.filter(e => e.fe).map(e => e.fe)].filter(e => e.hh).every(e => fs.existsSync(path.join(DOCS, 'img/h', e.k + '.webp'))) && core.e.filter(e => e.hh).length + core.e.filter(e => e.fe && e.fe.hh).length >= 1500); // v44: + ♀ (core fe)
  const dup = []; const g = {}; for (const e of core.e) if (e.hs && e.c !== 'sex') (g[e.id + '|' + e.hs] ||= []).push(e.k); for (const v of Object.values(g)) if (v.length > 1 && v.join() !== '849-amped-gmax,849-low-key-gmax') dup.push(v.join('='));
  ok('v35 aucune forme ne réutilise le sprite HOME d’une autre ' + dup.slice(0, 5).join(' '), !dup.length);
  ok('v35 Prismillon / Flabébé / Zarbi / Vivaldaim : fichier cosmétique propre', E['666-icy-snow'].hs === '666-icy-snow' && E['669-blue'].hs === '669-blue' && E['201-b'].hs === '201-b' && E['585-winter'].hs === '585-winter');
  { const fe = core.e.filter(e => e.fe), sx = core.e.filter(e => e.c === 'sex').map(e => e.k).sort().join();
  ok('v44 différences mâle / femelle : 4 espèces en deux entrées (Mistigrix, Wimessir, Paragruel, Fragroin), « mâle » / « femelle » dans le nom et le sous-titre', sx === '678-female,876-female,902-female,916-female' && [678, 876, 902, 916].every(id => { const m = E[String(id)], f = E[id + '-female']; return m.fn === m.n + ' mâle' && m.l === 'Mâle' && f.n === m.n + ' femelle' && f.l === 'Femelle'; }), sx);
  ok('v44d Méga-Mistigrix : une seule entrée (fe = image ♀, 2ᵉ base mb2 = Mistigrix femelle)', !E['678-female-mega'] && E['678-male-mega'].n === 'Méga-Mistigrix' && E['678-male-mega'].fe?.k === '678-female-mega' && E['678-male-mega'].mb2 === '678-female' && core.e.filter(e => e.id === 678 && e.mb).length === 1);
  ok('v44d plus de bouton ♀ (marque) : seulement l’image ♀ / ♂', !/class="act fem"/.test(app) && !/FEM_G/.test(app) && /id="febtn"/.test(app));
  ok('v44 99 femelles d’apparence rattachées (core fe) : sprites + données sp gardés, jeux dès la gén. IV', fe.length === 100 && fe.filter(e => !e.mb).length === 99 && fe.every(e => { const f = D(`sp/${e.id}.json`).f[e.fe.k]; return f && !f.ls && e.fe.hs && (e.fe.gb & ~e.gb) === 0 && core.games.every((g, i) => !((e.fe.gb >> i) & 1) || g.g >= 4) && fs.existsSync(path.join(HERE, '../docs/img', e.fe.k + '.webp')); }));
  ok('v44 pas de « Mâle » sur une entrée unique', fe.every(e => e.l !== 'Mâle')); }
  ok('v37 Gigamax → forme de base (gbk) + Salarsen Gigamax (v44 : une fiche, marques Aigüe / Grave)', core.e.filter(e => e.c === 'gmax').every(e => E[e.gbk]) && !E['849-low-key-gmax'] && E['849-amped-gmax']?.gbk === '849' && /SAL_BASE = \{ A: '849', G: '849-low-key' \}/.test(app) && E['892-rapid-strike-gmax'].gbk === '892-rapid-strike' && /p\.c === 'gmax'\) \{ const b = base \|\| BY_KEY\[p\.gbk\]/.test(app));
  ok('v37c GO Méga : Méga-énergie en premier, sans doublon', /slot = gT \? '' : energyMates/.test(app) && /const goMegaOn = /.test(app));
  ok('v37b boutons : Méga (gemme d’abord, sans Capturé), Gigamax (Gigamax), base (+ Gigamax)', /if \(mg\) \{ first = slot; slot = ''; \}/.test(app) && /data-gmax=/.test(app) && /toggleMark\(g, 'caught', c, p\)/.test(app) && /\$\{slot\}\$\{dmb\}\$\{gbs\}/.test(app));
  ok('v35 HOME par défaut dans l’app', /let spriteMode = 'home'/.test(app) && /spriteMode = 'home'; closePop\(\)/.test(app) && /const artOf = p => p\.hh/.test(app) && !/pokeId\(p\)/.test(app.split('function spriteBtns')[1].slice(0, 1500)));
}
// ---- v38 : Dynamax GO, icônes Gigamax / Dynamax / Énergie Primo
{ const app = fs.readFileSync(path.join(DOCS, 'app.js'), 'utf8'), core = JSON.parse(fs.readFileSync(path.join(DOCS, 'data/core.json'))), me = JSON.parse(fs.readFileSync(path.join(DOCS, 'data/mega-energy.json')));
  const ov = JSON.parse(fs.readFileSync(new URL('./go-overrides.json', import.meta.url))), dk = Object.keys(ov.dynamax.keys), dm = core.e.filter(e => e.dmx);
  ok('v38 Dynamax GO : go-overrides = core dmx', dk.length > 100 && dm.length === dk.length && dm.every(e => ov.dynamax.keys[e.k] === e.dmx) && !!core.e.find(e => e.k === '6').dmx && !core.e.find(e => e.k === '151').dmx);
  ok('v38 icônes présentes', ['img/max/gigamax.webp', 'img/max/dynamax.webp', 'img/energy/382.webp', 'img/energy/383.webp'].every(f => fs.existsSync(path.join(DOCS, f))) && ['382', '383'].every(i => me.ids.includes(i)));
  ok('v38 boutons : icône Gigamax, Dynamax GO avant Gigamax', !app.includes('🔺') && /data-dmax=/.test(app) && /go_dynamax/.test(app) && /\$\{slot\}\$\{dmb\}\$\{gbs\}/.test(app));
}
// ---- v35 : nom officiel de la forme par défaut
{ const app = fs.readFileSync(path.join(DOCS, 'app.js'), 'utf8');
  eq('v35 Nigirigon Forme Courbée', E['978'].fn, 'Nigirigon Forme Courbée'); eq('v35 Deoxys Forme Normale', E['386'].fn, 'Deoxys Forme Normale');
  ok('v35 Giratina / Shaymin / Boréas / Vivaldaim / Plumeline / Lougaroc / Zygarde / Ogerpon / Morpeko / Deusolourdo / Famignol', E['487'].fn === 'Giratina Forme Alternative' && E['492'].fn === 'Shaymin Forme Terrestre' && E['641'].fn === 'Boréas Forme Avatar' && E['585'].fn === 'Vivaldaim Forme Printemps' && E['741'].fn === 'Plumeline Style Flamenco' && E['745'].fn === 'Lougaroc Forme Diurne' && E['718'].fn === 'Zygarde Forme 50 %' && E['1017'].fn === 'Ogerpon Masque Turquoise' && E['877'].fn === 'Morpeko Mode Rassasié' && E['982'].fn === 'Deusolourdo Forme Double' && E['925'].fn === 'Famignol Famille de Quatre');
  ok('v35 pas de nom de forme pour régionaux / Méga / Gigamax / sexe seul (Miaouss, Florizarre, Pikachu)', !E['52'].fn && !E['3'].fn && !E['25'].fn && !E['6'].fn);
  ok('v35 fn uniquement sur des bases ayant des formes alternatives (v44d : ou une femelle distincte), préfixé par le nom de l’espèce', core.e.filter(e => e.fn).every(e => !e.c && e.fn.startsWith(e.n + ' ') && core.e.some(x => x.id === e.id && (x.c === 'form' || x.c === 'sex'))) && core.e.filter(e => e.fn).length >= 50);
  ok('v35 noms de formes alignés (Flabébé Fleur Bleue, Prismillon Motif Blizzard, Ogerpon Masque du Puits, Dialga Originel)', E['669-blue'].n === 'Flabébé Fleur Bleue' && E['666-icy-snow'].n === 'Prismillon Motif Blizzard' && E['1017-wellspring-mask'].n === 'Ogerpon Masque du Puits' && !core.e.some(e => /Diagla/.test(e.n)));
  ok('v35 app : titre, puces de formes, liste avec Formes et recherche utilisent fullN', /<h1>\$\{esc\(fullN\(p\)\)\}<\/h1>/.test(app) && /state\.forms \? fullN\(p\) : p\.n/.test(app) && /p\.nn = norm\(fullN\(p\)\)/.test(app) && /title="\$\{esc\(fullN\(q\)\)\}"/.test(app));
}
// ---- v41 : contrôles automatiques (types des formes, dispo GO / go-overrides, compteur Let's Go) + formes interchangeables
{ const TY = new Set(core.types.map(t => t[0]));
  const bad = core.e.filter(e => e.c && (!Array.isArray(e.t) || e.t.length < 1 || e.t.length > 2 || new Set(e.t).size !== e.t.length || !e.t.every(t => TY.has(t))));
  ok('v41 types des formes : 1 ou 2 types valides, sans doublon', bad.length === 0, bad.slice(0, 5).map(e => e.k).join(','));
  eq('v41 types de formes connues', [E['479-heat'].t, E['26-alola'].t, E['6-mega-x'] && E['6-mega-x'].t, E['648-pirouette'] && E['648-pirouette'].t], [['electric', 'fire'], ['electric', 'psychic'], ['fire', 'dragon'], ['normal', 'fighting']]);
  const ov = JSON.parse(fs.readFileSync(new URL('./go-overrides.json', import.meta.url))), un = (ov.unreleased.keys || []).filter(k => E[k]), rel = Object.keys(ov.released.keys).filter(k => E[k]);
  ok('v41 GO : clés « unreleased » absentes de GO', un.length > 0 && un.every(k => !E[k].go), un.filter(k => E[k].go).join(','));
  ok('v41 GO : clés « released » présentes dans GO', rel.length > 0 && rel.every(k => E[k].go), rel.filter(k => !E[k].go).join(','));
  ok('v41 GO : aucune clé à la fois sortie et non sortie', !un.some(k => k in ov.released.keys));
  const lg = dex('lgpe'), ids = new Set(lg.e.map(x => x[0])), nreq = new Set(lg.x || []);
  eq('v41 compteur Let’s Go', [lg.e.length, ids.size, [...ids].filter(i => !nreq.has(i)).length], [153, 153, 153]);
  const app = fs.readFileSync(path.join(DOCS, 'app.js'), 'utf8');
  ok('v41 formes interchangeables : FLINK / FSHORT, raccourci, images des formes', /const FLINK = \{ 493: '\*', 773: '\*', 676: \['xy'\], 649: \['bw', 'b2w2', 'home'\]/.test(app) && /Cocher toutes les formes/.test(app) && /✓ Toutes cochées/.test(app) && /new Set\(E\.map\(artOf\)\)/.test(app));
  ok('v48 Ogerpon lié dans Écarlate / Violet (+ HOME), séparé dans GO, migration idempotente', /1017: \['sv', 'home'\]/.test(app) && /function migrateLinkV48\(\)/.test(app) && /migrateFem\(\); migrateLinkV48\(\);/.test(app) && !/1017: '\*'/.test(app));
}
// ---- v60.11: peremption (coupe PvP, equipes Rocket), doublon « Gigamax », cri de Mewtwo Armure
{ const rp = D('rank-pvp.json'), rr = D('rank-rocket.json'), app = fs.readFileSync(path.join(DOCS, 'app.js'), 'utf8'), keys = new Set(core.e.map(e => e.k));
  ok('v60.11 coupe PvP : dernier jour (cup.fin), règles et classement valides', /^\d{4}-\d{2}-\d{2}$/.test(rp.cup.fin) && rp.cup.r && rp.L.c.r.length >= 100 && rp.L.c.r.every(r => keys.has(r[0])));
  ok('v60.11 coupe PvP : masquée après cup.fin (plus de « Coupe en cours » périmée)', /cupOver = !!\(pv\.cup && pv\.cup\.fin && TODAY > pv\.cup\.fin\)/.test(app));
  ok('v60.11 Rocket : date de fin de rotation + avertissement après cette date', /^\d{4}-\d{2}-\d{2}$/.test(rr.valid) && /rkOld = !!\(rk\.valid && TODAY >= rk\.valid\)/.test(app) && /rkwarn/.test(fs.readFileSync(path.join(DOCS, 'style.css'), 'utf8')));
  ok('v60.11 Classements Combats Max : pas de « Gigamax » en double (nom du boss + niveau)', /tl = \(t, n\) => t >= 6 \? \(\/Gigamax\/\.test\(n\) \? '6★' : 'Gigamax 6★'\)/.test(app) && !/tl\(b\[2\]\)/.test(app) && !/tl\(x\[2\]\)/.test(app));
}
// ---- v60.12: Météno GO (Noyau Vert 19/10, Noyau Jaune 14/11), sources Pocket manuelles
{ const pk = D('pocket.json'), S = Object.fromEntries(pk.s.map(s => [s.id, s])), srcOf = (sid, l) => { const s = S[sid], c = s.cards.find(x => x[0] === l); return c[6].map(i => s.b[i]); };
  const gk = k => sp(774).f[k].go, ent = k => core.e.find(e => e.k === k);
  ok('v60.12 Météno GO : Forme Météore, Noyau Vert et Noyau Jaune sortis (go.r = 1, entrée go)', ['774', '774-green', '774-yellow'].every(k => gk(k).r === 1 && !gk(k).rf && ent(k).go === 1 && !ent(k).gof));
  ok('v60.12 Météno GO : les 5 autres noyaux pas encore sortis (non annoncés)', ['774-red', '774-orange', '774-blue', '774-indigo', '774-violet'].every(k => !gk(k).r && !ent(k).go));
  ok('v60.12 Pocket : A1 283 Mew hors booster (set.x), P-A 050 Mewtwo-ex = boutique, P-B 103 Pikachu-ex = Missions Pikachu', /Pokédex de Kanto/.test(S.A1.x['283']) && srcOf('A1', '283').length === 0 && /Poké Gold/.test(srcOf('P-A', '050')[0]) && /Pika Pika/.test(srcOf('P-B', '103')[0]));
  ok('v60.12 Pocket : toutes les cartes de A1, P-A, P-B, P-C ont une source (booster ou set.x)', ['A1', 'P-A', 'P-B', 'P-C'].every(id => S[id].cards.every(c => c[6].length || (S[id].x || {})[c[0]])));
}
// ---- v60.14: Hisui Sliggoo/Goodra + Duralugon GMax released, Pocket C1 official count
{ const pk = D('pocket.json'), C1 = pk.s.find(s => s.id === 'C1');
  const hisui = k => { const e = core.e.find(x => x.k === k), g = sp(+k.split('-')[0]).f[k].go; return e && e.go === 1 && !e.gof && g && g.r === 1 && !g.rf; };
  ok('v60.14 Colimucus et Muplodocus de Hisui sortis dans GO (6/11/2026)', hisui('705-hisui') && hisui('706-hisui') && !('705-hisui' in (JSON.parse(fs.readFileSync(path.join(HERE, 'go-overrides.json'), 'utf8')).upcoming.keys || {})));
  ok('v60.14 Pocket C1 Fusion Double : 131 cartes de base + 86 secrètes', C1 && C1.o === 131 && C1.cards.length === 217);
}
// ---- v60.15: Super Méga 25 000 PV, comptes officiels Pocket (B2b–B4b, A4b, promo A/B)
{ const pk = D('pocket.json'), S = Object.fromEntries(pk.s.map(s => [s.id, s])), app = fs.readFileSync(path.join(DOCS, 'app.js'), 'utf8'), sw = fs.readFileSync(path.join(DOCS, 'sw.js'), 'utf8');
  const O = { 'P-A': [117, 117], A4b: [353, 379], 'P-B': [103, 103], B2b: [69, 117], B3: [155, 234], B3a: [74, 109], B3b: [69, 106], B4: [155, 233], B4a: [72, 110], B4b: [402, 429], C1: [131, 217] };
  ok('v60.15 Pocket : comptes officiels de cartes de base (Bulbapedia)', Object.entries(O).every(([id, [o, n]]) => S[id] && S[id].o === o && S[id].cards.length === n));
  const rb = JSON.parse(fs.readFileSync(path.join(HERE, 'raid-bosses.json'), 'utf8'));
  const sm = ['609-mega', '36-mega'].map(k => rb.bosses.find(b => b.k === k));
  ok('v60.15 Super Méga-Raids : 25 000 PV confirmés (Méga-Lugulabre, Méga-Mélodelfe)', rb.tiers['Super Méga'].hp === 25000 && sm.every(b => b && b.hp === 25000 && b.cpm === 0.7903) && sm[0].shields === 7 && sm[1].shields === 8);
  ok('v60.15 note Super Méga : 25 000 PV, plus de « à confirmer »', /Le boss a 25 000 PV \(valeur confirmée pour les Super Méga-Raids\)/.test(app) && !/PV du boss non publiés, à confirmer/.test(app));
  ok('v60.15 SW : VERSION ≥ v60.15, DATA_VERSION ≥ d57', +((sw.match(/VERSION = 'v(\d+)(?:\.\d+)?'/) || [])[1] || 0) >= 60 && /VERSION = 'v60\.(1[5-9]|[2-9]\d)'/.test(sw) && +((sw.match(/DATA_VERSION = 'd(\d+)'/) || [])[1] || 0) >= 57);
}
// ---- v60.16: Pokémon GO event costumes (optional marks, not in GO completion)
{ const cost = D('costumes.json'), app = fs.readFileSync(path.join(DOCS, 'app.js'), 'utf8'), sw = fs.readFileSync(path.join(DOCS, 'sw.js'), 'utf8'), html = fs.readFileSync(path.join(DOCS, 'index.html'), 'utf8');
  const all = Object.values(cost.s || {}).flat();
  const ids = new Set(all.map(c => c.id));
  ok('v60.16 costumes.json : schéma et volume', cost && cost.n >= 300 && Object.keys(cost.s).length >= 120 && cost.n === all.length && all.length === ids.size);
  ok('v60.16 costumes : identifiants stables, pas de Mewtwo Armure', all.every(c => /^\d+-[a-z0-9]+$/i.test(c.id) && c.n && ['off','ppe','ppe-unoff','en'].includes(c.frs)) && !all.some(c => /armored/i.test(c.id) || /Armure/.test(c.n)));
  ok('v60.16 costumes : source française renseignée, sans nom inventé pour les 2026 encore non traduits', all.every(c => c.frs !== 'en' || /nom français non vérifié/.test(app)) && all.filter(c => c.frs === 'off').length >= 8);
  ok('v60.16 SW : VERSION ≥ v60.16, DATA_VERSION ≥ d58', /VERSION = 'v60\.(1[6-9]|[2-9]\d)'/.test(sw) && +((sw.match(/DATA_VERSION = 'd(\d+)'/) || [])[1] || 0) >= 58);
  ok('v60.16 pack hors-ligne : data/costumes.json', /'data\/costumes\.json'/.test(app));
  ok('v60.16 export/import : go_costumes et go_costumes_s', /go_costumes: \[\.\.\.COSTUME_C\]/.test(app) && /go_costumes_s: \[\.\.\.COSTUME_S\]/.test(app) && /d\.go_costumes/.test(app));
  ok('v60.16 costumes hors complétion : marques séparées, jamais de coche auto de l’espèce', /COSTUME_C/.test(app) && !/toggleMark\([^\n]*COSTUME/.test(app) && !/CAUGHT_G\.add\([^\n]*COSTUME/.test(app) && /n’inscrit pas l’espèce/.test(app));
  ok('v60.16 fiche : bloc Costumes interactif (plus seulement « En chantier »)', /function costumesHTML\(title\)/.test(app) && /costcg/.test(app) && !/function costumesHTML\(title\) \{ return `<section class="box costbox"><h2>\$\{title\}<\/h2><p class="note">En chantier\.<\/p><\/section>`; \}/.test(app) && app.includes("costumesHTML('Costumes')") && app.includes("costumesHTML('Costumes GO')"));
  ok('v60.16 menu : compteur costumes', /id="gocost"/.test(html) && /updateGoCostMenu/.test(app));
}


// ---- v60.17: official French G-Max move names (sheets + Combats Max rankings)
{ const gm = D('gmax-moves.json'), app = fs.readFileSync(path.join(DOCS, 'app.js'), 'utf8'), sw = fs.readFileSync(path.join(DOCS, 'sw.js'), 'utf8'), sim = fs.readFileSync(path.join(DOCS, 'sim.js'), 'utf8');
  const core = D('core.json'), moves = gm && gm.moves || {}, keys = Object.keys(moves);
  const types = new Set(['normal','fire','water','grass','electric','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy']);
  const gmax = core.e.filter(e => e.c === 'gmax' && e.k !== '890-eternamax');
  const official = ['Fouet G-Max','Fournaise G-Max','Canonnade G-Max','Illusion G-Max','Foudre G-Max','Pactole G-Max','Frappe G-Max','Hantise G-Max','Bulles G-Max','Résonance G-Max','Câlin G-Max','Récolte G-Max','Pestilence G-Max','Fonte G-Max','Percussion G-Max','Pyroball G-Max','Gâchette G-Max','Rafale G-Max','Ondes G-Max','Récif G-Max','Téphra G-Max','Corrosion G-Max','Nectar G-Max','Enlisement G-Max','Choc G-Max','Combustion G-Max','Sentence G-Max','Torpeur G-Max','Cure G-Max','Percée G-Max','Usure G-Max','Coup Final G-Max','Multicoup G-Max'];
  ok('v60.17 gmax-moves.json : 34 clés, 33 noms officiels', gm && gm.n === 34 && gm.nu === 33 && keys.length === 34 && new Set(Object.values(moves).map(m => m.n)).size === 33);
  ok('v60.17 gmax-moves.json : chaque entrée a un nom français officiel, un type et le nom anglais', keys.every(k => /gmax$/.test(k) && moves[k].n && / G-Max$/.test(moves[k].n) && types.has(moves[k].t) && /^G-Max /.test(moves[k].en) && moves[k].p));
  ok('v60.17 gmax-moves.json : les 33 noms officiels (Poképédia) sont tous présents', official.every(n => Object.values(moves).some(m => m.n === n)) && official.length === 33);
  ok('v60.17 toutes les formes Gigamax du dex (sauf Infinimax) ont une attaque G-Max', gmax.every(e => moves[e.k] && moves[e.k].n) && moves['849-low-key-gmax']?.n === 'Choc G-Max');
  ok('v60.17 noms de repli de l’app alignés sur gmax-moves.json', keys.every(k => app.includes("'" + k + "': ['" + moves[k].n.replace(/'/g, "\\'") + "', '" + moves[k].t + "']") || app.includes('"' + k + '"')));
  ok('v60.17 fiche GO : onglet Combats Max même sans classement (showMax / Duralugon Gigamax)', /showMax = !!\(MX \|\| \(p\.c === 'gmax' && GM\)\)/.test(app) && /function gmaxMoveOf/.test(app) && /function gmaxKeyOf/.test(app));
  ok('v60.17 Classements Combats Max : nom G-Max sur les lignes Gigamax seulement', /const msMax = /.test(app) && /p\.c === 'gmax' \? gmaxMoveOf\(p\)/.test(app) && /msMax\(mx\.E/.test(app) && app.split('msMax(mx.E').length >= 5);
  ok('v60.17 fiche hors GO : bloc Attaque G-Max', /function gmaxMoveHTML/.test(app) && /M = gmaxMoveHTML\(p\)/.test(app));
  ok('v60.17 pack hors-ligne : data/gmax-moves.json', /'data\/gmax-moves\.json'/.test(app));
  ok('v60.17 sim : types G-Max complets dont Duralugon (884-gmax, dragon)', /884-gmax':'dragon'/.test(sim) && /133-gmax':'normal'/.test(sim) && /809-gmax':'steel'/.test(sim) && /892-rapid-strike-gmax':'water'/.test(sim));
  ok('v60.17 SW : VERSION ≥ v60.17, DATA_VERSION ≥ d59', /VERSION = 'v60\.(1[7-9]|[2-9]\d)'/.test(sw) && +((sw.match(/DATA_VERSION = 'd(\d+)'/) || [])[1] || 0) >= 59);
  ok('v60.18 SW : VERSION ≥ v60.18, DATA_VERSION ≥ d60', /VERSION = 'v60\.(1[8-9]|[2-9]\d)'/.test(sw) && +((sw.match(/DATA_VERSION = 'd(\d+)'/) || [])[1] || 0) >= 60);
  ok('v60.18 Salarsen Gigamax : shiny GO (Combats Max), Forme Grave renseignée', F(849, '849-amped-gmax').go.sh?.includes('max') && !F(849, '849-amped-gmax').go.nosh && Array.isArray(F(849, '849-low-key').go.sh) && F(849, '849-low-key').go.sh.length > 0);
}


// ---- v60.19: Pokémon GO Shadow (Obscur) / Purified (Purifié) marks, not in GO completion
{ const sh = D('shadow.json'), app = fs.readFileSync(path.join(DOCS, 'app.js'), 'utf8'), sw = fs.readFileSync(path.join(DOCS, 'sw.js'), 'utf8'), html = fs.readFileSync(path.join(DOCS, 'index.html'), 'utf8');
  const keys = Object.keys(sh.s || {});
  const coreKeys = new Set(core.e.map(e => e.k));
  ok('v60.19 shadow.json : schéma et volume', sh && sh.n === keys.length && sh.n >= 480 && sh.n <= 520 && sh.ns >= 350 && sh.ns === keys.filter(k => sh.s[k].sh).length && keys.length === new Set(keys).size);
  ok('v60.19 shadow.json : clés d’entrées du dex, sans Méga / Gigamax / femelle', keys.every(k => coreKeys.has(k) && /^\d+(?:-[a-z0-9-]+)?$/.test(k) && !['mega','primal','gmax','sex'].includes(E[k].c) && !/-female$/.test(k) && !/-gmax$/.test(k)));
  ok('v60.19 shadow.json : espèces typiques, formes régionales, pas de Pikachu ni Kangourex', sh.s['1'] && sh.s['1'].sh && sh.s['19-alola'] && sh.s['19-alola'].sh && sh.s['150'] && sh.s['150'].sh && sh.s['249'] && sh.s['249'].apex && sh.s['215-hisui'] && sh.s['263-galar'] && sh.s['641'] && !sh.s['25'] && !sh.s['115'] && !sh.s['83-galar'] && !sh.s['562-galar']);
  ok('v60.19 pack hors-ligne : data/shadow.json', /'data\/shadow\.json'/.test(app));
  ok('v60.19 export/import : go_shadow, go_shadow_s, go_purified', /go_shadow: \[\.\.\.SHADOW_C\]/.test(app) && /go_shadow_s: \[\.\.\.SHADOW_S\]/.test(app) && /go_purified: \[\.\.\.PURIFIED\]/.test(app) && /d\.go_shadow/.test(app) && /d\.go_purified/.test(app));
  ok('v60.19 hors complétion : marques séparées, jamais de coche auto de l’espèce', /SHADOW_C/.test(app) && !/toggleMark\([^\n]*SHADOW/.test(app) && !/CAUGHT_G\.add\([^\n]*SHADOW/.test(app) && /n’inscrit pas l’espèce/.test(app));
  ok('v60.19 fiche : bloc Obscur & Purifié interactif, lecture seule en vue d’ensemble', /function shadowHTML\(title\)/.test(app) && /shadcg/.test(app) && app.includes("D = shadowHTML('Obscur & Purifié') + costumesHTML('Costumes')") && app.includes("shadowHTML('Obscur & Purifié GO')"));
  ok('v60.19 menu : compteurs Obscur et Purifié', /id="goshad"/.test(html) && /updateGoShadMenu/.test(app));
  ok('v60.19 SW : VERSION ≥ v60.19, DATA_VERSION ≥ d61', /VERSION = 'v60\.(19|[2-9]\d)'/.test(sw) && +((sw.match(/DATA_VERSION = 'd(\d+)'/) || [])[1] || 0) >= 61);
}

// ---- v60.20: Duralugon Gigamax as a Combats Max attacker
{ const sw = fs.readFileSync(path.join(DOCS, 'sw.js'), 'utf8'), rm = D('rank-max.json'), rd = D('raid-moves.json');
  const g = (rm.R.A.g || []).find(r => rm.F[r[0]] === '884-gmax');
  ok('v60.20 SW : VERSION ≥ v60.20, DATA_VERSION ≥ d62', /VERSION = 'v60\.(2[0-9]|[3-9]\d)'/.test(sw) && +((sw.match(/DATA_VERSION = 'd(\d+)'/) || [])[1] || 0) >= 62);
  ok('v60.20 Duralugon Gigamax attaquant dans le classement Combats Max', rm.F.includes('884-gmax') && g && g[3] >= 1 && g[4] >= 20);
  ok('v60.20 Duralugon Gigamax : listes de boss sur la fiche (utile en attaquant)', !!(rd.bm && rd.bm['884-gmax'] && rd.bm['884-gmax'].A && rd.bm['884-gmax'].A.length));
}

// ---- v60.21: talents qui changent les faiblesses (bloc ABEFF de docs/app.js, évalué tel quel)
{ const src = fs.readFileSync(path.join(DOCS, 'app.js'), 'utf8'), blk = src.slice(src.indexOf('// ABEFF-START'), src.indexOf('// ABEFF-END'));
  const { NO_ABIL, ABIL_EFF, typeMults, abMults } = new Function(blk + '\nreturn { NO_ABIL, ABIL_EFF, typeMults, abMults };')();
  const ch = g => core.charts[g <= 1 ? 1 : g <= 5 ? 2 : 6];
  const abIds = (f, g) => { let l = pickGen(f.pa, g, f.a); if (g < 5) l = l.filter(a => !a[1]); return l.filter(a => (ref.ab[a[0]][2] || 1) <= g).map(a => a[0]); };
  const M = (id, k, g, ab) => { const f = F(id, k), t = pickGen(f.pt, g, f.t); return abMults(t, ch(g), ab); };
  const B = (id, k, g) => { const f = F(id, k); return typeMults(pickGen(f.pt, g, f.t), ch(g)); };
  const NAMES = { 26: 'Lévitation', 297: 'Absorbe-Terre', 11: 'Absorbe-Eau', 114: 'Lavabo', 87: 'Peau Sèche', 10: 'Absorbe-Volt', 78: 'Motorisé', 31: 'Paratonnerre', 18: 'Torche', 273: 'Bien Cuit', 157: 'Herbivore', 47: 'Isograisse', 85: 'Ignifugé', 199: 'Aquabulle', 272: 'Sel Purificateur', 218: 'Boule de Poils', 111: 'Filtre', 116: 'Solide Roc', 232: 'Prisme-Armure', 25: 'Garde Mystik', 189: 'Mer Primaire', 190: 'Terre Finale', 191: 'Souffle Delta', 305: 'Téra-Carapace' };
  eq('v60.21 talents gérés = liste attendue', Object.keys(ABIL_EFF).map(Number).sort((a, b) => a - b), Object.keys(NAMES).map(Number).sort((a, b) => a - b));
  for (const [id, n] of Object.entries(NAMES)) { ok(`v60.21 nom officiel ${n}`, ref.ab[id] && ref.ab[id][0] === n, ref.ab[id] && ref.ab[id][0]); ok(`v60.21 ${n} : effet pas avant le talent`, ABIL_EFF[id].g >= (ref.ab[id][2] || 3)); }
  eq('v60.21 jeux sans talents', Object.keys(NO_ABIL).sort(), ['la', 'lgpe', 'za', 'zadlc']);
  // Lévitation selon la génération : Ectoplasma l’a jusqu’en VI, Corps Maudit ensuite
  ok('v60.21 Ectoplasma gen3/6 Lévitation, gen7 non', abIds(F(94), 3).includes(26) && abIds(F(94), 6).includes(26) && !abIds(F(94), 7).includes(26));
  eq('v60.21 Ectoplasma gen6 Lévitation : Sol ×2 → ×0', [B(94, '94', 6).ground, M(94, '94', 6, 26).ground], [2, 0]);
  ok('v60.21 Méga-Ectoplasma sans Lévitation', !abIds(F(94, '94-mega'), 6).includes(26));
  // Garde Mystik : seules les attaques super efficaces touchent Munja
  { const m = M(292, '292', 9, 25); eq('v60.21 Munja Garde Mystik', Object.keys(m).filter(t => m[t] > 0).sort(), ['dark', 'fire', 'flying', 'ghost', 'rock']); eq('v60.21 Munja seul talent', abIds(F(292), 9), [25]); }
  { const m = M(292, '292', 3, 25); eq('v60.21 Munja Garde Mystik gen3 (Acier résiste Ténèbres/Spectre, non concerné)', Object.keys(m).filter(t => m[t] > 0).sort(), ['dark', 'fire', 'flying', 'ghost', 'rock']); }
  eq('v60.21 Lanturn Absorbe-Volt : Électrik ×1 → ×0', [B(171, '171', 9).electric, M(171, '171', 9, 10).electric], [1, 0]);
  eq('v60.21 Lanturn Absorbe-Eau caché : Eau ×½ → ×0', [B(171, '171', 9).water, M(171, '171', 9, 11).water], [0.5, 0]);
  ok('v60.21 Lanturn : Absorbe-Eau caché absent avant la gen V', !abIds(F(171), 4).includes(11) && abIds(F(171), 5).includes(11));
  eq('v60.21 Ponyta Torche : Feu ×½ → ×0', [B(77, '77', 9).fire, M(77, '77', 9, 18).fire], [0.5, 0]);
  ok('v60.21 Ponyta de Galar sans Torche', !abIds(F(77, '77-galar'), 9).includes(18));
  eq('v60.21 Galvagon Absorbe-Volt : Électrik ×¼ → ×0', [B(880, '880', 9).electric, M(880, '880', 9, 10).electric], [0.25, 0]);
  eq('v60.21 Cradopaud Peau Sèche : Eau ×0, Feu ×1,25', [M(453, '453', 9, 87).water, M(453, '453', 9, 87).fire], [0, 1.25]);
  ok('v60.21 Rhinastoc Paratonnerre + Solide Roc', abIds(F(464), 9).includes(31) && abIds(F(464), 9).includes(116));
  eq('v60.21 Rhinastoc Solide Roc : Eau ×4 → ×3, Plante ×4 → ×3', [M(464, '464', 9, 116).water, M(464, '464', 9, 116).grass], [3, 3]);
  ok('v60.21 Paratonnerre sans effet avant la gen V', ABIL_EFF[31].g === 5 && ABIL_EFF[114].g === 5);
  { const m = M(384, '384-mega', 6, 191); eq('v60.21 Méga-Rayquaza Souffle Delta : Glace ×4 → ×2, Roche ×2 → ×1, Dragon/Fée inchangés', [m.ice, m.rock, m.dragon, m.fairy, m.electric], [2, 1, 2, 2, 0.5]); }
  eq('v60.21 Primo-Kyogre Mer Primaire : Feu ×0', M(382, '382-primal', 6, 189).fire, 0);
  eq('v60.21 Primo-Groudon Terre Finale : Eau ×0', M(383, '383-primal', 6, 190).water, 0);
  { const m = M(1024, '1024-terastal', 9, 305); eq('v60.21 Terapagos Téracristal Téra-Carapace : Combat ×2 → ×½, Spectre ×0 reste', [m.fighting, m.ghost, m.fire], [0.5, 0, 0.5]); }
  eq('v60.21 Groret Isograisse : Feu et Glace ×½', [M(325, '325', 9, 47).fire, M(325, '325', 9, 47).ice], [0.5, 0.5]);
  eq('v60.21 Pichu Troizépi : Statik seul (pas de Paratonnerre caché)', F(172, '172-spiky-eared').a, [[9, 0]]);
  ok('v60.21 Méga-Heatran (Z-A seulement) sans talent', F(485, '485-mega').a.length === 0);
  // every form with a talent of the list: the effect actually changes something for at least one of its types (no dead entry)
  { let dead = 0, n = 0; for (const e of core.e) { const f = sp(e.id).f[e.k]; if (!f || !f.a) continue; for (const [id] of f.a) if (ABIL_EFF[id]) { n++; const a = abMults(f.t, ch(9), id), b = typeMults(f.t, ch(9)); if (!Object.keys(a).some(t => a[t] !== b[t])) dead++; } } ok(`v60.21 talents de la liste sur ${n} formes (dont ${dead} sans effet visible, ex. Lévitation sur un type Vol)`, n > 250 && dead < 15); }
  const sw = fs.readFileSync(path.join(DOCS, 'sw.js'), 'utf8');
  ok('v60.21 SW : VERSION ≥ v60.21, DATA_VERSION ≥ d63', /VERSION = 'v60\.(2[1-9]|[3-9]\d)'/.test(sw) && +((sw.match(/DATA_VERSION = 'd(\d+)'/) || [])[1] || 0) >= 63);
}


// ---- v60.22: lieux / méthodes d’obtention des anciens jeux (build/fix-v60-22.mjs) et textes du Pokédex
{
  const OLD = ['rb', 'y', 'gs', 'c', 'rs', 'e', 'frlg', 'dp', 'pt', 'hgss', 'bw', 'b2w2', 'xy', 'oras', 'sm', 'usum', 'frlgsw'], GI = Object.fromEntries(core.games.map((g, i) => [g.id, i]));
  const shows = (e, s, g) => { const f = s.f[e.k] || {}; let P = null; if (f.pl && f.pl[g]) P = f.pl[g]; else if (!(e.c === 'reg' || e.mb)) { const b = s.f[f.enOf || String(s.id)]; P = b && b.pl ? b.pl[g] || null : null; }
    if (P && P.length) return 'pl'; if ((f.pln && f.pln[g]) || (e.c !== 'reg' && ((s.f[String(s.id)] || {}).pln || {})[g])) return 'pln';
    const src = f.en ? f : (f.enOf && s.f[f.enOf]) || f; return src.en && src.en[g] && src.en[g].length ? 'en' : null; };
  const none = {}, cache = {}, S = id => cache[id] ||= sp(id); let wiki = 0, tag = 0, glitch = 0;
  for (const e of core.e) { if (e.c === 'gmax') continue; const s = S(e.id);
    for (const g of OLD) { if (!((e.gb >> GI[g]) & 1) && !(e.k === String(e.id) && (s.hx || []).includes(g))) continue; if (!shows(e, s, g)) (none[g] ||= []).push(e.k); } }
  for (const s of Object.values(cache)) for (const f of Object.values(s.f)) {
    for (const [g, rows] of Object.entries(f.pl || {})) if (OLD.includes(g)) for (const [pl, d] of rows) { const t = pl + ' ' + d; if (/\{\{|\}\}|\[\[|\]\]/.test(t)) wiki++; if (/, (No2?|Bl2?|R|B|O|A|X|Y|D|P|Ru|Sa|RuO|SaA|So|Lu|US|UL|RF|VF|HG|SS)\b|· —/.test(t)) tag++; if (/^Bug\b/.test(d)) glitch++; }
    for (const [g, t] of Object.entries(f.pln || {})) if (OLD.includes(g) && /\{\{|\}\}|\[\[|\]\]|\bBP\b/.test(t)) wiki++;
  }
  const nN = Object.values(none).reduce((a, l) => a + l.length, 0);
  ok('v60.22 anciens jeux : fiches sans lieu ni méthode ≤ 50 (avant : 4 174)', nN <= 50, `${nN} ${JSON.stringify(none)}`);
  eq('v60.22 pas de balise wiki dans les lieux / méthodes', wiki, 0); eq('v60.22 pas d’abréviation de version ni de taux « — » restants', tag, 0); eq('v60.22 pas de glitch (Bug du Croupier)', glitch, 0);
  eq('v60.22 Florizarre X/Y', F(3).pln.xy, 'Faire évoluer Herbizarre'); eq('v60.22 Rattata X/Y', F(19).pln.xy, 'Échange');
  eq('v60.22 Méga-Alakazam ROSA', F(65, '65-mega').pln.oras, 'Méga-Évolution d’Alakazam (avec sa Méga-Gemme)'); eq('v60.22 Primo-Kyogre', F(382, '382-primal').pln.oras, 'Primo-Résurgence de Kyogre');
  eq('v60.22 Miaouss Soleil / Lune (Hors dex)', F(52).pln.sm, 'À transférer par la Banque Pokémon'); eq('v60.22 Salamèche Or / Argent', F(4).pln.gs, 'À transférer par le Bloc Temporel');
  ok('v60.22 Léviator ROSA : Atalanopolis, Méga Canne', (F(130).pl.oras || []).some(r => r[0] === 'Atalanopolis' && /Méga Canne/.test(r[1])));
  ok('v60.22 Granivol RF/VF Switch (lignes RF/VF, taux par version)', (F(165).pl.frlgsw || []).some(r => /5 % Rouge Feu, 30 % Vert Feuille/.test(r[1])));
  ok('v60.22 Mew Rouge / Bleu : pas de lieu (événement seulement)', !(F(151).pl || {}).rb);
  eq('v60.22 Empiflor N2B2 = texte officiel de Noir / Blanc', [sp(71).pv[21], sp(71).pv[22]], [sp(71).pv[17], sp(71).pv[17]]);
  eq('v60.22 Hippopotas N2B2 = texte officiel de Noir / Blanc', [sp(449).pv[21], sp(449).pv[22]], [sp(449).pv[17], sp(449).pv[17]]);
  ok('v60.22 Raikou Écarlate / Violet : hors Pokédex (pna)', [40, 41].every(v => (sp(243).pna || []).includes(v)));
  // machine translation still shown on a game sheet: Chenipotte (RF/VF) only — no official French text known
  { const tr = []; for (const e of core.e) { const s = S(e.id), f = s.f[e.k] || {}; const src = v => (f.pv && f.pv[v] !== undefined) || (s.pv && s.pv[v] !== undefined) || s.fv[v] !== undefined ? 'ok' : s.tv && s.tv[v] !== undefined ? 'tr' : null;
      core.games.forEach((g, i) => { if (!((e.gb >> i) & 1) && !(e.k === String(e.id) && (s.hx || []).includes(g.id))) return; if (g.ver.some(([v]) => src(v) === 'tr')) tr.push(g.id + ':' + e.k); }); }
    eq('v60.22 traduction automatique affichée : Chenipotte RF/VF seulement', tr, ['frlg:265']); }
  { const L = loc.a.filter(a => /\b(City|Town|Forest|Island|Tower|Mt\.|Mount|Path|Road|Cave|Lake)\b/.test(a) && !/^Cave (Taupiqueur|Connecterre)$/.test(a)); eq('v60.22 noms de lieux PokéAPI sans anglais', L, []); }
  { const src = fs.readFileSync(path.join(DOCS, 'app.js'), 'utf8'), m = src.match(/const GEN_HOW = (\/.*\/);/), RE = m && eval(m[1]); let bad = 0, n = 0;
    ok('v60.22 app : note neutre (sans crédit Poképédia) pour les méthodes générées', !!RE && /GEN_HOW\.test\(na\) \? '<p class="note">Pas de lieu de capture dans ce jeu\.<\/p>'/.test(src));
    for (const e of core.e) { const f = S(e.id).f[e.k] || {}; for (const t of Object.values(f.pln || {})) { const gen = RE && RE.test(t); if (gen) n++; if (gen !== !!(e.mb || e.bo)) bad++; } }
    eq('v60.22 méthodes générées = exactement celles des Méga / Primo / changements de forme', bad, 0); ok('v60.22 méthodes générées présentes', n >= 100, n); }
  const sw = fs.readFileSync(path.join(DOCS, 'sw.js'), 'utf8');
  ok('v60.22 SW : VERSION ≥ v60.22, DATA_VERSION ≥ d64', /VERSION = 'v60\.(2[2-9]|[3-9]\d)'/.test(sw) && +((sw.match(/DATA_VERSION = 'd(\d+)'/) || [])[1] || 0) >= 64);
}


// ---- v60.23: où obtenir la Méga-Gemme / Gemme Bleue / Gemme Rouge (build/fix-v60-23.mjs → mega-stones.json loc)
{ const ms = D('mega-stones.json'), L = ms.loc || {}, GI = Object.fromEntries(core.games.map((g, i) => [g.id, i]));
  const KNOWN = { za: ['257-mega', '384-mega'] }; // Poképédia : pas de lieu Z-A pour la Braségalite ; Méga-Rayquaza dans Z-A : sources divergentes
  const nameOf = e => e.id === 384 && e.c === 'mega' ? 'Draco Ascension' : (ms.stones[e.k] || {}).fr;
  const miss = {}; let n = 0;
  for (const e of core.e) { if (!(e.mb || e.c === 'primal')) continue;
    for (const g of ['xy', 'oras', 'sm', 'usum', 'lgpe', 'za']) { if (!((e.gb >> GI[g]) & 1)) continue; const nm = nameOf(e);
      if (nm && L[nm] && L[nm][g] && L[nm][g].length) n++; else if (!(KNOWN[g] || []).includes(e.k)) (miss[g] ||= []).push(e.k); } }
  eq('v60.23 chaque Méga / Primo (X / Y, ROSA, SL, USUL, Let’s Go, Z-A) a son objet localisé ou est dans la liste connue', miss, {}); ok('v60.23 formes avec objet localisé', n >= 280, n);
  { const bad = Object.entries(ms.stones).filter(([k, s]) => !/-primal$/.test(k) && !/[iï]te( [XYZ])?$/.test(s.fr || '')).map(([k, s]) => k + ':' + s.fr); eq('v60.23 noms des Méga-Gemmes en « -ite »', bad, []); }
  eq('v60.23 noms officiels', ['382-primal', '383-primal', '65-mega', '6-mega-x', '150-mega-y', '94-mega', '485-mega', '978-curly-mega'].map(k => (ms.stones[k] || {}).fr),
    ['Gemme Bleue', 'Gemme Rouge', 'Alakazamite', 'Dracaufite X', 'Mewtwoïte Y', 'Ectoplasmite', 'Heatranite', 'Nigirigonite']);
  let wiki = 0, code = 0, empty = 0; const VS = ['', 'X', 'Y', 'Rubis Oméga', 'Saphir Alpha', 'Soleil', 'Lune', 'Ultra-Soleil', 'Ultra-Lune', 'Let’s Go, Pikachu', 'Let’s Go, Évoli'];
  for (const [nm, gs] of Object.entries(L)) for (const [g, rows] of Object.entries(gs)) { if (!['xy', 'oras', 'sm', 'usum', 'lgpe', 'za'].includes(g)) code++;
    for (const [v, t] of rows) { if (/\{\{|\}\}|\[\[|\]\]|''|<|>|&\w+;|\bwp:|Fichier:/.test(t)) wiki++; if (/\b(SL|USUL|ROSA|LPZA|LGPE|RuO|SaA|XY)\b|\bmission [A-Z]+\d+\b/.test(t.replace('Poussifeu XY', ''))) code++; /* « Poussifeu XY » = nom de la distribution */ if (!t || t.length < 12 || !VS.includes(v)) empty++; } }
  eq('v60.23 pas de balise wiki dans les lieux des objets', wiki, 0); eq('v60.23 pas de code de jeu / mission non traduit', code, 0); eq('v60.23 lignes vides ou version inconnue', empty, 0);
  const T = (nm, g) => (L[nm] && L[nm][g] || []).map(r => (r[0] ? r[0] + ' : ' : '') + r[1]).join(' | ');
  ok('v60.23 Alakazamite X / Y : Grotte Miroitante, 20 h – 21 h', /Grotte Miroitante.*20 h et 21 h/.test(T('Alakazamite', 'xy')), T('Alakazamite', 'xy'));
  ok('v60.23 Alakazamite ROSA : Poivressel', /Poivressel/.test(T('Alakazamite', 'oras')));
  ok('v60.23 Alakazamite SL = Vieille Route, USUL = Plaine de Poni (alternative résolue par jeu)', /Vieille Route/.test(T('Alakazamite', 'sm')) && !/Poni/.test(T('Alakazamite', 'sm')) && /Plaine de Poni/.test(T('Alakazamite', 'usum')) && !/Vieille Route/.test(T('Alakazamite', 'usum')));
  ok('v60.23 Alakazamite Let’s Go : 30 000 ₽', /30 000 ₽/.test(T('Alakazamite', 'lgpe')));
  ok('v60.23 Alakazamite Z-A : Méga-Fragments, mission principale 10', /Méga-Fragments.*mission principale 10\s:\s«\sLes secrets de la Méga-Évolution\s»/.test(T('Alakazamite', 'za')));
  ok('v60.23 Dracaufite X : lignes X et Y distinctes en X / Y', (L['Dracaufite X'].xy || []).some(r => r[0] === 'X' && /Salamèche/.test(r[1])) && (L['Dracaufite X'].xy || []).some(r => r[0] === 'Y' && /échange/.test(r[1])));
  ok('v60.23 Gemme Bleue ROSA : une ligne par version', ['Rubis Oméga', 'Saphir Alpha'].every(v => (L['Gemme Bleue'].oras || []).some(r => r[0] === v)) && /Arthur/.test(T('Gemme Bleue', 'oras')));
  ok('v60.23 Gemme Rouge ROSA : Max (Rubis Oméga)', (L['Gemme Rouge'].oras || []).some(r => r[0] === 'Rubis Oméga' && /Max/.test(r[1])));
  ok('v60.23 Méga-Rayquaza ROSA / SL / USUL : Draco Ascension, pas de Méga-Gemme', ['oras', 'sm', 'usum'].every(g => /Pas de Méga-Gemme.*Draco Ascension/.test(T('Draco Ascension', g))) && !(L['Draco Ascension'] || {}).za);
  eq('v60.23 Méga-Rayquaza « Où le trouver » ROSA', F(384, '384-mega').pln.oras, 'Méga-Évolution de Rayquaza (avec la capacité Draco Ascension)');
  eq('v60.23 Méga-Mewtwo X Let’s Go : méthode au lieu de « Aucune rencontre PokéAPI »', F(150, '150-mega-x').pln.lgpe, 'Méga-Évolution de Mewtwo (avec sa Méga-Gemme)');
  ok('v60.23 apostrophes typographiques', !Object.values(L).some(gs => Object.values(gs).some(rows => rows.some(r => /'/.test(r[1])))));
  ok('v60.23 Heatranite Z-A (Méga-Dimension)', /mission extradimensionnelle 09/.test(T('Heatranite', 'za')));
  const src = fs.readFileSync(path.join(DOCS, 'app.js'), 'utf8');
  ok('v60.23 app : bloc objet requis + crédit Poképédia', /function stoneLocHTML/.test(src) && /Où obtenir l’objet[^`]*Poképédia<\/a> \(CC BY-NC-SA 3\.0 FR\)/.test(src));
  ok('v60.23 app : plus d’« Orbe Bleu / Rouge » (Gemme Bleue / Rouge depuis ROSA)', !/Orbe (Bleu|Rouge)/.test(src));
  const sw = fs.readFileSync(path.join(DOCS, 'sw.js'), 'utf8');
  ok('v60.23 SW : VERSION ≥ v60.23, DATA_VERSION ≥ d65', /VERSION = 'v60\.(2[3-9]|[3-9]\d)'/.test(sw) && +((sw.match(/DATA_VERSION = 'd(\d+)'/) || [])[1] || 0) >= 65);
}

// ---- v60.24: raids Dynamax d’Épée / Bouclier (build/fix-v60-24.mjs → sp f.rd[sw|swisle|swcrown] = [[zone, texte, drapeaux]])
{ const GS = ['sw', 'swisle', 'swcrown'], all = [], zoneGame = {}; let tableNum = 0, plRaid = 0, plGA = 0, wiki = 0, haBad = [], dens = new Set();
  const hasHA = (s, k) => ((s.f[k] && s.f[k].a) || (s.f[String(s.id)] || {}).a || []).some(a => a[1]);
  for (const id of [...new Set(core.e.map(e => e.id))]) { const s = sp(id);
    for (const [k, f] of Object.entries(s.f)) {
      for (const g of GS) for (const [pl, d] of (f.pl && f.pl[g]) || []) { if (/^Antre (événementiel )?\d+$/.test(pl)) plRaid++; if (pl === 'Grand Antre Dynamax' && g !== 'swcrown') plGA++; void d; }
      for (const [g, rows] of Object.entries(f.rd || {})) { if (!GS.includes(g)) continue; // v60.27: rd a aussi sv / svmask / svdisk (raids Téracristal)
        for (const [z, t, fl] of rows) { all.push({ id, k, g, z, t, fl });
          if (/Antres? \d|Antre événementiel \d|\b\d{2,3}\b(?! %| IV)(?![^·]*★)/.test(t.replace(/Niv\. \d+/, ''))) tableNum++;
          if (/\{\{|\}\}|\[\[|\]\]|<|>|undefined|NaN|null/.test(z + t)) wiki++;
          if (/talent caché/.test(t) && !hasHA(s, k)) haBad.push(k);
          if (!/^(Expédition|Raid événementiel)/.test(z)) { (zoneGame[z] ||= new Set()).add(g); const m = t.match(/^Antres? ([A-Z, ]+?) \(faisceau (rouge|mauve)\)/); if (m) m[1].split(', ').forEach(L => dens.add(z + ' ' + L)); else wiki++; } } } } }
  eq('v60.24 plus de « Antre N » (numéro de table) dans « Où le trouver »', plRaid, 0); eq('v60.24 pas de numéro de table dans les lignes de raid', tableNum, 0);
  eq('v60.24 « Grand Antre Dynamax » rangé dans Couronneige', plGA, 0); eq('v60.24 lignes de raid propres (balises, jeu, format)', wiki, 0);
  eq('v60.24 talent caché seulement pour les Pokémon qui en ont un', [...new Set(haBad)], []);
  eq('v60.24 chaque zone dans un seul jeu', Object.entries(zoneGame).filter(([, s]) => s.size > 1).map(([z]) => z), []);
  eq('v60.24 275 antres physiques (44 zones)', [dens.size, Object.keys(zoneGame).length], [275, 44]);
  const keys = g => new Set(all.filter(r => r.g === g && !/^Expédition|^Raid/.test(r.z)).map(r => r.k)).size;
  ok('v60.24 fiches avec antres : ÉB ≥ 370, Isolarmure ≥ 250, Couronneige ≥ 200', keys('sw') >= 370 && keys('swisle') >= 250 && keys('swcrown') >= 200, [keys('sw'), keys('swisle'), keys('swcrown')].join('/'));
  const ZI = ['Plaine Salutation', 'Lande Boldair', 'Mer Align\'Îlots', 'Mer Isol\'Îlots', 'Îlot Calméole', 'Caverne Pugnacité'], ZC = ['Repos du Géant', 'Lac Poké Ball', 'Mer Banquise', 'Pente Enneigée', 'Plaine Granfroy', 'Plateau Beau-Gant'], ZS = ['Plaine Verdoyante', 'Plaine Rocheuse', 'Fosse des Sables', 'Lac Milobellus Sud', 'Prairie Entre-Ponts', 'Miroir du Géant'];
  eq('v60.24 zones rangées par jeu (Isolarmure / Couronneige / Terres Sauvages)', [ZI.filter(z => !(zoneGame[z] && zoneGame[z].has('swisle'))), ZC.filter(z => !(zoneGame[z] && zoneGame[z].has('swcrown'))), ZS.filter(z => !(zoneGame[z] && zoneGame[z].has('sw')))], [[], [], []]);
  const R = (k, g) => { const e = E[k], s = sp(e ? e.id : +k), f = s.f[k]; return ((f.rd || {})[g] || []).map(r => r[0] + ' | ' + r[1]); };
  ok('v60.24 Tygnon : antres de Couronneige (Repos du Géant, mauve, talent caché garanti)', R('107', 'swcrown').some(t => /^Repos du Géant \| Antre A \(faisceau mauve\) · 4★ 15 % · 5★ 20 % · 5 IV parfaits · talent caché garanti · Bouclier uniquement$/.test(t)), R('107', 'swcrown').join(' ; '));
  ok('v60.24 Tygnon : antre A de la Plaine Verdoyante (rouge), IV selon la version', R('107', 'sw').includes('Plaine Verdoyante | Antre A (faisceau rouge) · 3★ 20 % · 4★ 25 % · 5★ Épée 30 % · IV parfaits : 4 (Épée) / 3 (Bouclier)'), R('107', 'sw').join(' ; '));
  ok('v60.24 Mackogneur Gigamax : Plaine Rocheuse antre C (mauve), 5★ 5 %, Épée uniquement', R('68', 'sw').includes('Plaine Rocheuse | Antre C (faisceau mauve) · Gigamax · 5★ 5 % · 4 IV parfaits · talent caché possible · Épée uniquement'));
  ok('v60.24 Mackogneur : « talent caché possible » (Possible) dans les Terres Sauvages', R('68', 'sw').some(t => /^Plaine Verdoyante \| Antre A \(faisceau rouge\) · 5★ 10 % · 4 IV parfaits · talent caché possible$/.test(t)));
  ok('v60.24 Leuphorie : antres mauves d’Isolarmure = talent caché garanti', R('242', 'swisle').some(t => /^Plaine Salutation \| Antres? (?:[A-Z], )*I(?:, [A-Z])* \(faisceau mauve\) · 3–5★ 5 % · 4 IV parfaits · talent caché garanti$/.test(t)), R('242', 'swisle').slice(0, 3).join(' ; '));
  ok('v60.24 Mewtwo : Expédition Dynamax dans Couronneige seulement', R('150', 'swcrown').includes('Expédition Dynamax – Grand Antre Dynamax | Pokémon hors du commun (fin d’expédition) · Niv. 70 · une seule capture') && !R('150', 'sw').length);
  ok('v60.24 Expédition / raid événementiel : bon jeu', all.every(r => !/^Expédition/.test(r.z) || r.g === 'swcrown') && all.every(r => !/^Raid événementiel/.test(r.z) || (r.g === 'sw' && /e/.test(r.fl || ''))));
  ok('v60.24 Gigamax marqués (drapeau g)', all.every(r => /(^|· )Gigamax ·/.test(r.t) === /g/.test(r.fl || '')));
  ok('v60.24 Salarsen Gigamax Aigüe / Grave (notes)', R('849', 'sw').some(t => /Gigamax.*forme Aigüe/.test(t)) && R('849', 'swcrown').some(t => /Gigamax.*forme Aigüe dans Épée, forme Grave dans Bouclier/.test(t)));
  ok('v60.24 Vémini (cadeau du Grand Antre Dynamax) reste dans Couronneige', ((F(803).pl || {}).swcrown || []).some(r => /^Grand Antre Dynamax/.test(r[0]) && /^Donné/.test(r[1])));
  ok('v60.24 Papilusion Gigamax (Plaine Verdoyante B, C) : 1–5★ 10 % (taux sans étoile, sommes à 90 %)', R('12', 'sw').includes('Plaine Verdoyante | Antres B, C (faisceau mauve) · Gigamax · 1–5★ 10 % · 4 IV parfaits · talent caché possible'));
  ok('v60.24 Iguolta antre 25 : « 35, 30, Bo » = Épée 35 % / Bouclier 30 %', R('695', 'sw').some(t => /5★ Épée 35 % \/ Bouclier 30 %/.test(t)));
  // taux : somme par antre, étoile et version = 100 % (écarts connus de la source Poképédia)
  { const { parseLua } = await import('./pokepedia.mjs'), M = parseLua(fs.readFileSync(path.join(HERE, 'cache/v60-24/Module_Localisations_Données_Pokémon_Épée_et_Bouclier.wiki'), 'utf8')), bad = [];
    for (const [p, mons] of Object.entries(M)) { const t = (p.match(/^Antre (\d+)$/) || [])[1]; if (!t) continue; const S = {};
      for (const recs of Object.values(mons)) for (const r of [].concat(recs)) { for (const st of ['1', '2', '3', '4', '5']) if (r[st]) { const v = String(r[st]).split(/\s*,\s*/), o = {}; let un;
        for (let i = 0; i < v.length; i++) if (v[i + 1] === 'Ep' || v[i + 1] === 'Bo') { o[v[i + 1]] = +v[i]; i++; } else un = +v[i];
        const x = (S[st] ||= { Ep: 0, Bo: 0 }); for (const w of ['Ep', 'Bo']) x[w] += o[w] ?? un ?? 0; }
        if (r.taux && !['1', '2', '3', '4', '5'].some(st => r[st])) for (const st of ['1', '2', '3', '4', '5']) { const x = (S[st] ||= { Ep: 0, Bo: 0 }); x.Ep += +r.taux; x.Bo += +r.taux; } }
      for (const [st, x] of Object.entries(S)) for (const v of ['Ep', 'Bo']) if (Math.abs(x[v] - 100) > 0.5) bad.push(`${t}/${st}/${v}/${x[v]}`); }
    eq('v60.24 sommes des taux = 100 % (hors écarts connus de Poképédia)', bad.filter(b => !['119/3', '143/3', '151/1', '151/2', '151/3', '157/3', '190/5', '192/4'].includes(b.split('/').slice(0, 2).join('/'))), []); }
  const src = fs.readFileSync(path.join(DOCS, 'app.js'), 'utf8');
  ok('v60.24 app : bloc Raids Dynamax + crédit Poképédia + note des Badges', /function raidHTML/.test(src) && /Raids Dynamax/.test(src) && /Poképédia<\/a> \(CC BY-NC-SA 3\.0 FR\), pages des antres et des zones/.test(src) && src.includes('0 → 1★ ; 1–2 → 1–2★ ; 3 → 1–3★ ; 4–5 → 2–3★ ; 6–7 → 3–4★ ; 8 → 3–5★'));
  const sw = fs.readFileSync(path.join(DOCS, 'sw.js'), 'utf8');
  ok('v60.24 SW : VERSION ≥ v60.24, DATA_VERSION ≥ d66', /VERSION = 'v60\.(2[4-9]|[3-9]\d)'/.test(sw) && +((sw.match(/DATA_VERSION = 'd(\d+)'/) || [])[1] || 0) >= 66);
}
// ---- v60.25: formes GO reliées à PvPoke (build/pvp-map.mjs, utilisé par fetch-pvp.mjs et fetch-pvp-moves.mjs)
{ const SPC = {}, goOf = k => { const id = k.split('-')[0]; if (!(id in SPC)) SPC[id] = fs.existsSync(path.join(DOCS, 'data', `sp/${id}.json`)) ? sp(id) : null; const f = SPC[id] && SPC[id].f[k]; return f && f.go; };
  const M = mapPvPoke(pvpk, core, goOf), all = { ...M.keyOf, ...M.keyMega }, pv = D('pvp.json'), pm = D('pvp-moves.json'), rp = D('rank-pvp.json'), keys = new Set(core.e.map(e => e.k));
  const WANT = { mewtwo_armored: '150-armored', zacian_crowned_sword: '888-crowned', zamazenta_crowned_shield: '889-crowned', zacian_hero: '888', zamazenta_hero: '889',
    zygarde_10: '718-10', zygarde_complete: '718-complete', necrozma_dusk_mane: '800-dusk', necrozma_dawn_wings: '800-dawn', kyurem_black: '646-black', kyurem_white: '646-white',
    sliggoo_hisuian: '705-hisui', goodra_hisuian: '706-hisui', stunfisk_galarian: '618-galar', stunfisk: '618', marowak_alolan: '105-alola', muk_alolan: '89-alola',
    weezing_galarian: '110-galar', rotom_wash: '479-wash', rotom_heat: '479-heat', genesect_shock: '649-shock', keldeo_resolute: '647-resolute', urshifu_rapid_strike: '892-rapid-strike',
    tauros_aqua: '128-paldea-aqua-breed', tauros_blaze: '128-paldea-blaze-breed', castform_sunny: '351-sunny', meowstic_female: '678-female', cherrim_sunny: '421-sunshine',
    giratina_origin: '487-origin', minior_core: '774-green', charizard_mega_x: '6-mega-x', kyogre_primal: '382-primal' };
  eq('v60.25 PvPoke → formes de l’appli (liste vérifiée)', Object.fromEntries(Object.keys(WANT).map(s => [s, all[s] || null])), WANT);
  const inv = {}; for (const [s, k] of Object.entries(all)) (inv[k] ||= []).push(s);
  eq('v60.25 PvPoke : aucune fiche reliée à deux espèces PvPoke', Object.entries(inv).filter(([, v]) => v.length > 1), []);
  eq('v60.25 PvPoke : pas de lien refusé (stats GO différentes)', M.bad, []);
  eq('v60.25 PvPoke : chaque espèce PvPoke reliée ou non reliée exprès (PVP_ABSENT)', M.miss, []);
  ok('v60.25 PvPoke : table PVP_FORMS / PVP_ABSENT sans id inconnu', [...Object.keys(PVP_FORMS), ...Object.keys(PVP_ABSENT)].every(s => pvpk.some(p => p.speciesId === s)) && Object.values(PVP_FORMS).every(k => keys.has(k)));
  const linked = new Set([...Object.values(M.keyOf), ...Object.keys(M.alias)]);
  eq('v60.25 chaque fiche GO (hors Méga / Primo / Gigamax) reliée à PvPoke ou forme d’apparence', core.e.filter(e => !['mega', 'primal', 'gmax'].includes(e.c) && goOf(e.k) && !linked.has(e.k)).map(e => e.k), []);
  ok('v60.25 formes d’apparence : alias vers une fiche reliée, jamais aussi reliée en propre', Object.keys(M.alias).length >= 80 && Object.entries(M.alias).every(([a, b]) => Object.values(M.keyOf).includes(b) && !inv[a]));
  ok('v60.25 pvp.json : clés r ⊂ fiches reliées, alias a = build', Object.keys(pv.r).every(k => keys.has(k) && Object.values(M.keyOf).includes(k)) && JSON.stringify(pv.a) === JSON.stringify(M.alias));
  ok('v60.25 pvp.json : formes régionales classées à part de leur forme de base', ['618-galar', '89-alola', '110-galar', '646-black', '800-dawn', '647-resolute', '649-shock', '128-paldea-aqua-breed'].every(k => pv.r[k]) && JSON.stringify(pv.r['618']) !== JSON.stringify(pv.r['618-galar']));
  ok('v60.25 pvp-moves.json : moveset des formes reliées (Limonde de Galar, Kyurem Noir, Genesect Choc)', ['618-galar', '646-black', '649-shock'].every(k => pm.ms[k]));
  const dupL = Object.entries(rp.L).filter(([, l]) => new Set(l.r.map(r => r[0] + '|' + r[1])).size !== l.r.length).map(([k]) => k);
  eq('v60.25 Classements PvP : pas de doublon fiche + Obscur dans une liste', dupL, []);
  ok('v60.25 Classements PvP : clés = fiches reliées (ou Méga)', Object.values(rp.L).every(l => l.r.every(r => Object.values(all).includes(r[0]))));
  const src = fs.readFileSync(path.join(DOCS, 'app.js'), 'utf8');
  ok('v60.25 app : rang et moveset PvP des formes d’apparence (pvp.json a)', /const ak = P\.a && P\.a\[p\.k\], r = P\.r\[p\.k\] \|\| \(ak \? P\.r\[ak\] : null\)/.test(src) && /go\.pvm\.ms\[go\.pvp\.a\[p\.k\]\]/.test(src) && /PvPoke ne classe pas cette forme à part/.test(src));
  ok('v60.25 fetch-pvp / fetch-pvp-moves : liens via pvp-map.mjs', ['fetch-pvp.mjs', 'fetch-pvp-moves.mjs'].every(f => /mapPvPoke\(gm, core, goOf\)/.test(fs.readFileSync(path.join(HERE, f), 'utf8'))));
  const sw = fs.readFileSync(path.join(DOCS, 'sw.js'), 'utf8');
  ok('v60.25 SW : VERSION ≥ v60.25, DATA_VERSION ≥ d67', /VERSION = 'v60\.(2[5-9]|[3-9]\d)'/.test(sw) && +((sw.match(/DATA_VERSION = 'd(\d+)'/) || [])[1] || 0) >= 67);
}


// ---- v60.26: historical GO egg pools (docs/data/go-eggs.json)
{ const eh = D('go-eggs.json'), goj = D('go.json'), src = fs.readFileSync(path.join(DOCS, 'app.js'), 'utf8');
  const seasons = eh.seasons || [], named = seasons.filter(s => !s.kind), pre = seasons.filter(s => s.kind === 'pre'), mix = seasons.filter(s => s.kind === 'mix');
  const keys = new Set(core.e.map(e => e.k));
  ok('v60.26 go-eggs.json : saison courante = Sentiers crépusculaires / Twilight Trails', eh.current === 'twilight-trails' && goj.egg && goj.egg.season === 'Twilight Trails' && (named.find(s => s.id === 'twilight-trails') || {}).fr === 'Sentiers crépusculaires');
  ok('v60.26 go-eggs.json : 24 saisons nommées depuis 2020, 23 avec nom FR Poképédia', named.length === 24 && named.filter(s => s.fr).length === 23);
  ok('v60.26 Season of Celebration sans nom FR inventé', named.some(s => s.id === 'celebration' && s.en === 'Season of Celebration' && !s.fr));
  ok('v60.26 Saison d’Alola : pas de pool isolé, période mixte mars–juin 2022 présente', named.some(s => s.id === 'alola' && !Object.keys(s.pool || {}).length) && mix.some(s => s.id === 'period-2022-03-01-alola-go' && Object.keys(s.pool || {}).length >= 40));
  ok('v60.26 au moins 30 périodes d’avant les saisons et 300 espèces', pre.length >= 30 && Object.keys(eh.byKey || {}).length >= 300);
  const badK = Object.keys(eh.byKey || {}).filter(k => !keys.has(k));
  eq('v60.26 clés d’historique ⊂ fiches de l’appli', badK, []);
  const curPool = (named.find(s => s.id === eh.current) || {}).pool || {};
  const spEg = [];
  for (const e of core.e) {
    const f = (fs.existsSync(path.join(DOCS, 'data', `sp/${e.id}.json`)) ? sp(e.id) : { f: {} }).f[e.k];
    if (f && f.go && f.go.eg) spEg.push(e.k);
  }
  ok('v60.26 pool actuel des fiches (go.eg) = saison courante de go-eggs.json', spEg.length === goj.egg.n && spEg.every(k => curPool[k]) && Object.keys(curPool).length >= spEg.length);
  ok('v60.26 exemples : Bulbizarre et Riolu déjà sortis, Mewtwo sans historique', !!(eh.byKey['1'] && eh.byKey['1'].length > 1) && !!(eh.byKey['447'] && eh.byKey['447'].some(x => x.s === 'celebration')) && !eh.byKey['150']);
  ok('v60.26 sources citées (Leek Duck, Serebii, Poképédia)', (eh.src || []).length >= 4 && eh.src.some(s => /leekduck\.com\/eggs/.test(s[1])) && eh.src.some(s => /serebii\.net\/pokemongo\/previouseggs/.test(s[1])) && eh.src.some(s => /pokepedia\.fr/.test(s[1])));
  ok('v60.26 app : Déjà sorti en œuf + chargement de go-eggs.json + pack hors-ligne', /function eggHistHTML|const eggHistHTML/.test(src) && /Déjà sorti en œuf/.test(src) && /getJSON\('data\/go-eggs\.json'\)/.test(src) && /data\/go-eggs\.json/.test(src) && /CC BY-NC-SA 3\.0 FR/.test(src));
  ok('v60.26 update-go-eggs : union sans effacer les saisons passées', /mergeCurrentSeason/.test(fs.readFileSync(path.join(HERE, 'eggs.mjs'), 'utf8')) && /Past seasons are never removed|sans supprimer|without removing past/i.test(fs.readFileSync(path.join(HERE, 'update-go-eggs.mjs'), 'utf8') + fs.readFileSync(path.join(HERE, 'eggs.mjs'), 'utf8')));
  ok('v60.26 apply-go-overrides lance update-go-eggs (routine hebdo)', /update-go-eggs\.mjs/.test(fs.readFileSync(path.join(HERE, 'apply-go-overrides.mjs'), 'utf8')));
  const sw = fs.readFileSync(path.join(DOCS, 'sw.js'), 'utf8');
  ok('v60.26 SW : VERSION ≥ v60.26, DATA_VERSION ≥ d68', /VERSION = 'v60\.(2[6-9]|[3-9]\d)'/.test(sw) && +((sw.match(/DATA_VERSION = 'd(\d+)'/) || [])[1] || 0) >= 68);
  ok('v60.26 libellés FR des périodes avant les saisons, sans n° de version ni mois anglais', pre.length >= 30 && pre.every(s => s.labelFr && !/\d+\.\d+/.test(s.labelFr) && !/\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/.test(s.labelFr)));
  ok('v60.26 lancement (juillet 2016) pour le pool 1.0', pre.some(s => s.labelFr === 'lancement (juillet 2016)'));
  ok('v60.26 Marathon Éclosion daté officiellement (14/11/2018 – 27/11/2018)', pre.some(s => s.labelFr === 'Marathon Éclosion (14/11/2018 – 27/11/2018)' && s.from === '2018-11-14' && s.to === '2018-11-27'));
  const preSorted = [...pre].sort((a, b) => (b.from || '').localeCompare(a.from || '') || (b.to || '').localeCompare(a.to || ''));
  ok('v60.26 toutes les périodes avant les saisons ont une date de tri', pre.every(s => s.from));
  ok('v60.26 Toujours en avant : nom officiel, saison précédente (02/06–08/09/2026)', named.some(s => s.id === 'forever-forward' && s.fr === 'Toujours en avant' && s.from === '2026-06-02' && s.to === '2026-09-08'));
  ok('v60.26 date de vérif Leek Duck renseignée (pool ≥ date de mise à jour)', !!(eh.checked && eh.updated && eh.checked >= eh.updated));
  ok('v60.26 app : labelFr + note saison en cours (site officiel, tableau Leek Duck, Forever Forward)', /labelFr/.test(src) && /saison en cours/.test(src) && /mise à jour du tableau/.test(src) && /Forever Forward/.test(src) && /site officiel/.test(src));
}
// ---- v60.27: raids Téracristal d’Écarlate / Violet (build/fix-v60-27.mjs → sp f.rd[sv|svmask|svdisk] = [[zone, texte, drapeaux]])
{ const games = ['sv', 'svmask', 'svdisk'], all = [];
  const evPl = [], starPl = [], antrePl = [], wiki = [], haBad = [], zoneGame = {}, star7 = [];
  for (const e of core.e) { const f = F(e.id, e.k); if (!f) continue;
    for (const g of games) { const L = (f.rd && f.rd[g]) || []; for (const r of L) all.push({ k: e.k, g, z: r[0], t: r[1], fl: r[2] || '' }); }
    for (const [g, L] of Object.entries(f.pl || {})) if (games.includes(g)) for (const r of L) {
      if (/^Cristal de raid [1-6] étoiles? \((?:Paldea|Septentria|Terra-Dôme)\)$/.test(r[0])) starPl.push(e.k + ' ' + g);
      if (/^Cristal de raid événementiel /.test(r[0])) evPl.push(e.k + ' ' + r[0]);
      if (/^Antre Interdit/.test(r[0])) antrePl.push(e.k);
    }
  }
  for (const r of all) {
    if (/[{}|\[\]]|Exclusif Ec|Exclusif Vi/.test(r.z + r.t)) wiki.push(r.k + ' ' + r.z);
    if (/7★/.test(r.t) || /événementiel/.test(r.z)) star7.push(r.k + ' ' + r.z);
    (zoneGame[r.z] ||= new Set()).add(r.g);
    if (/talent caché/.test(r.t)) { const f = F((E[r.k] || {}).id || r.k.split('-')[0], r.k); const a = (f && f.a) || []; if (!a.some(x => x[1])) haBad.push(r.k); }
  }
  eq('v60.27 plus de « Cristal de raid N étoiles » dans « Où le trouver » (pl)', starPl, []);
  eq('v60.27 Antre Interdit dans les lieux habituels (Ogerpon seulement, pas un raid)', antrePl, ['1017']);
  eq('v60.27 cristaux événementiels conservés dans pl (hors lot)', evPl.sort(), ['1009 Cristal de raid événementiel 13', '1009 Cristal de raid événementiel 46', '1010 Cristal de raid événementiel 13', '1010 Cristal de raid événementiel 46', '248 Cristal de raid événementiel 73', '914 Cristal de raid événementiel 72'].sort());
  eq('v60.27 lignes de raid propres (balises, pas d’abréviation Ec./Vi.)', wiki, []);
  eq('v60.27 pas de 7★ ni d’événement dans rd', star7, []);
  eq('v60.27 talent caché seulement pour les Pokémon qui en ont un', [...new Set(haBad)], []);
  eq('v60.27 chaque zone dans un seul jeu', Object.entries(zoneGame).filter(([, s]) => s.size > 1).map(([z]) => z), []);
  const keys = g => new Set(all.filter(r => r.g === g).map(r => r.k)).size, lines = g => all.filter(r => r.g === g).length;
  eq('v60.27 fiches / lignes : Paldea, Septentria, Terra-Dôme', [keys('sv'), lines('sv'), keys('svmask'), lines('svmask'), keys('svdisk'), lines('svdisk')], [369, 419, 95, 121, 95, 111]);
  eq('v60.27 zones rangées par jeu (Paldea / Septentria / Terra-Dôme)', [ [...(zoneGame['Paldea'] || [])], [...(zoneGame['Septentria'] || [])], [...(zoneGame['Terra-Dôme'] || [])], [...(zoneGame['Antre Interdit (Septentria)'] || [])] ], [['sv'], ['svmask'], ['svdisk'], []]);
  const R = (k, g) => { const e = E[k], f = e && F(e.id, k); return ((f && f.rd && f.rd[g]) || []).map(r => r[0] + ' | ' + r[1]); };
  ok('v60.27 Pikachu : Paldea 2–3★', R('25', 'sv').includes('Paldea | 2–3★'), R('25', 'sv').join(' ; '));
  ok('v60.27 Chartor : talent caché garanti en 6★', R('324', 'sv').includes('Paldea | 4★') && R('324', 'sv').includes('Paldea | 6★ · talent caché garanti'), R('324', 'sv').join(' ; '));
  ok('v60.27 Bekipan : talent caché garanti en 6★', R('279', 'sv').includes('Paldea | 3★') && R('279', 'sv').includes('Paldea | 6★ · talent caché garanti'));
  ok('v60.27 Chapignon : Téra par défaut en 5★, talent caché possible en 6★', R('286', 'sv').includes('Paldea | 5★ · Téra par défaut') && R('286', 'sv').includes('Paldea | 6★ · talent caché possible'));
  ok('v60.27 Tauros de Paldea Flamboyante : Écarlate uniquement, fiche de la forme', R('128-paldea-blaze-breed', 'sv').includes('Paldea | 5★ · Écarlate uniquement') && R('128-paldea-blaze-breed', 'sv').includes('Paldea | 6★ · talent caché possible · Écarlate uniquement') && !R('128', 'sv').length);
  ok('v60.27 Tauros de Paldea Aquatique : Violet uniquement', R('128-paldea-aqua-breed', 'sv').includes('Paldea | 5★ · Violet uniquement') && R('128-paldea-aqua-breed', 'sv').includes('Paldea | 6★ · talent caché possible · Violet uniquement'));
  ok('v60.27 Tauros de Paldea Combative : 4★ et 6★ (talent caché possible)', R('128-paldea-combat-breed', 'sv').includes('Paldea | 4★') && R('128-paldea-combat-breed', 'sv').includes('Paldea | 6★ · talent caché possible'));
  ok('v60.27 Grotadmorv d’Alola : Terra-Dôme 6★ (Disque Indigo), pas la forme de Kanto', R('89-alola', 'svdisk').includes('Terra-Dôme | 6★ · talent caché possible') && !R('89', 'svdisk').length);
  ok('v60.27 Muciole : Septentria 2★ et 4★, Écarlate uniquement', R('313', 'svmask').includes('Septentria | 2★ et 4★ · Écarlate uniquement'));
  { const pl = ((F(1017, '1017').pl || {}).svmask || []).map(r => r[0] + ' | ' + r[1]);
    ok('v60.27 Ogerpon : Antre Interdit en lieu habituel, pas dans les raids', pl.includes('Antre Interdit (Septentria) | Rencontre · Niv. 20, 70 · une seule capture') && !R('1017', 'svmask').length && !R('1017', 'sv').length && !R('1017', 'svdisk').length, JSON.stringify({ pl, rd: R('1017', 'svmask') }));
    ok('v60.27 Ogerpon : pas de « Raid Téracristal » sur l’Antre Interdit', pl.every(t => !/Raid Téracristal/.test(t))); }
  ok('v60.27 Lougaroc Crépusculaire : 6★ sans talent caché (la fiche n’en a pas, malgré Poképédia « Possible »)', R('745-dusk', 'sv').includes('Paldea | 6★') && R('745-dusk', 'sv').every(t => !/talent caché/.test(t)));
  ok('v60.27 Florizarre / Dracaufeu : pas de raid Téracristal 1★–6★', !R('3', 'sv').length && !R('3', 'svdisk').length && !R('6', 'sv').length && !R('6', 'svdisk').length);
  { const { parseLua } = await import('./pokepedia.mjs'), C = path.join(HERE, 'cache/v60-27'), fname = t => t.replace(/[ /:]/g, '_') + '.wiki';
    const MOD = parseLua(fs.readFileSync(path.join(C, fname('Module:Localisations/Données/Pokémon Écarlate et Violet')), 'utf8'));
    const placeOf = (z, s) => `Cristal de raid ${s} étoile${s > 1 ? 's' : ''} (${z})`, miss = [];
    for (const z of ['Paldea', 'Septentria', 'Terra-Dôme']) for (const s of [1, 2, 3, 4, 5, 6]) { const w = fs.readFileSync(path.join(C, fname(placeOf(z, s))), 'utf8'); if (!(placeOf(z, s) in MOD) || !w.includes('#invoke:Tableau Pokémon|teracristal')) miss.push(placeOf(z, s)); }
    eq('v60.27 cache : 18 pages de cristaux + module', miss, []);
    eq('v60.27 entrées du module (18 cristaux)', [1, 2, 3, 4, 5, 6].map(s => ['Paldea', 'Septentria', 'Terra-Dôme'].map(z => Object.keys(MOD[placeOf(z, s)] || {}).length)), [[58, 15, 11], [57, 16, 11], [77, 26, 22], [93, 23, 21], [99, 25, 21], [70, 28, 27]]); }
  const src = fs.readFileSync(path.join(DOCS, 'app.js'), 'utf8');
  ok('v60.27 app : bloc Raids Téracristal + crédit Poképédia + note de l’histoire', /function teraRaidHTML/.test(src) && /Raids Téracristal/.test(src) && /Poképédia<\/a> \(CC BY-NC-SA 3\.0 FR\), pages des cristaux de raid/.test(src) && src.includes('début → 1–2★ ; 3 Badges → 1–3★ ; 6 Badges → 1–4★ ; après le générique → 3–5★') && src.includes('6★ 90 (75 après capture)'));
  const sw = fs.readFileSync(path.join(DOCS, 'sw.js'), 'utf8');
  ok('v60.27 SW : VERSION ≥ v60.27, DATA_VERSION ≥ d69', /VERSION = 'v60\.(2[7-9]|[3-9]\d)'/.test(sw) && +((sw.match(/DATA_VERSION = 'd(\d+)'/) || [])[1] || 0) >= 69);
}

console.log(`audit: ${pass} passed, ${fail} failed`); for (const f of fails) console.log('  FAIL', f);
