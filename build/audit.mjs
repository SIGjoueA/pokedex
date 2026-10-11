// Data audit: spot-checks built data against well-known facts. Usage: node audit.mjs   (run after build-data.mjs)
import fs from 'node:fs';
import path from 'node:path';
import { DOCS, HERE } from './lib.mjs';
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
ok('Pikachu forms', ['25', '25-female', '25-gmax', '25-alola-cap', '25-original-cap'].every(k => forms(25).includes(k)), forms(25).join(','));
ok('Mistigrix forms', forms(678).includes('678') && forms(678).includes('678-female'), forms(678).join(','));
eq('Zarbi forms', forms(201).length, 28); ok('Rotom forms', forms(479).length === 6, forms(479).join(',')); ok('Tauros breeds', ['128-paldea-combat-breed', '128-paldea-blaze-breed', '128-paldea-aqua-breed'].every(k => forms(128).includes(k)), forms(128).join(','));
ok('Deoxys forms', forms(386).length === 4); ok('Shaymin', forms(492).length === 2); ok('Giratina', forms(487).length === 2);
ok('Oricorio', forms(741).length === 4, forms(741).join(',')); ok('Lycanroc', forms(745).length === 3, forms(745).join(',')); ok('Vivaldaim seasons', forms(585).length === 4, forms(585).join(','));
ok('Flabébé colors', forms(669).length === 5, forms(669).join(',')); ok('Indeedee', forms(876).length === 2); ok('Basculegion', forms(902).length >= 2, forms(902).join(','));
ok('Hippopotas F', forms(449).includes('449-female')); ok('Mega Dracaufeu X/Y', forms(6).includes('6-mega-x') && forms(6).includes('6-mega-y')); ok('Gmax Dracaufeu', forms(6).includes('6-gmax'));
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
const pogoFile = path.join(HERE, '.cache/pogoapi-pokemon_max_cp.json'); fs.mkdirSync(path.dirname(pogoFile), { recursive: true });
if (!fs.existsSync(pogoFile)) fs.writeFileSync(pogoFile, await (await fetch('https://pogoapi.net/api/v1/pokemon_max_cp.json')).text());
const pogo = JSON.parse(fs.readFileSync(pogoFile, 'utf8'));
let n = 0, bad = [];
for (const r of pogo) { if (r.form && r.form !== 'Normal') continue; const g = gof(String(r.pokemon_id)); if (!g) continue; n++; if (g.m51 !== r.max_cp) bad.push(`${r.pokemon_id}:${g.m50}!=${r.max_cp}`); }
ok(`GO max CP vs pogoapi (${n} species)`, bad.length < 5, bad.slice(0, 8).join(' ')); if (bad.length) console.log('maxcp diffs', bad.length, bad.slice(0, 10));
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
  { const html = fs.readFileSync(path.join(DOCS, 'index.html'), 'utf8'); for (const [v, l] of [['baron', 'Barons'], ['nobaron', '⚪ Barons manquants'], ['barons', '✨ Barons shiny'], ['nobarons', '⚪✨ Barons shiny manquants']]) ok('v25 catégorie ' + v, html.includes(`<option value="${v}">${l}</option>`)); }
  ok('v25 icône Baron en cache hors-ligne', sw.includes("'img/alpha/baron.png'"));
}
// ---- v27: legend list, in-app messages, unified names
{ const app = fs.readFileSync(path.join(HERE, '../docs/app.js'), 'utf8'), css = fs.readFileSync(path.join(HERE, '../docs/style.css'), 'utf8');
  const code = app.split('\n').filter(l => !/^\s*\/\//.test(l)).map(l => l.replace(/\s\/\/ .*$/, '')).join('\n');
  ok('v27 aucun alert() dans app.js', !/\balert\(/.test(code));
  ok('v27 toast() en zone live polie', /function toast\(/.test(app) && /aria-live', 'polite'/.test(app) && /\.toast\.on\{/.test(css));
  ok('v27 légende en liste (ul.lgl)', /BASE_LEGEND = '<ul class="lgl">'/.test(app) && /HOME_LEGEND = '<ul class="lgl">'/.test(app) && /\.lgl li\{/.test(css));
  ok('v27 pas de numéro de génération en chiffres arabes', !/Gén\. ?\d/.test(code) && !/\dᵉ/.test(code));
  ok('v27 pas de « / » collé dans les noms de jeux (app)', !/'(?:DÉ\/PS|[^'<\/]*[A-Za-zÉé0-9]\/[A-Za-zÉé0-9][^'<\/]*)'/.test(code.match(/const GAME_SHORT = \{[^\n]*\}/)[0]) && !/É\/[VB]/.test(code) && !/ROSA|USUL/.test(code));
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
  ok('v28 17 Gigamax sortis + Duralugon le 2026-11-06', core.e.filter(e => e.c === 'gmax' && e.go).length === 17 && E['884-gmax'].gof === '2026-11-06' && F(884, '884-gmax').go.shf === '2026-11-06');
  ok('v28 pas de shiny Gigamax Lézargus / Salarsen', F(818, '818-gmax').go.nosh === 1 && F(849, '849-amped-gmax').go.nosh === 1 && !F(6, '6-gmax').go.nosh);
  ok('v28 Méga-Dracaufeu X / Y, Méga-Mewtwo X / Y, Primo-Kyogre / Groudon dans GO', ['6-mega-x', '6-mega-y', '150-mega-x', '150-mega-y', '382-primal', '383-primal'].every(k => E[k].go === 1));
  ok('v28 Méga-Lugulabre pas encore dans GO', !E['609-mega'].go);
  ok('v28 Gigamax GO = stats de la base', F(6, '6-gmax').go.a === F(6).go.a && F(6, '6-gmax').go.m50 === F(6).go.m50);
  ok('v28 shiny Méga = Méga-Évolution d’un shiny', JSON.stringify(F(6, '6-mega-x').go.sh) === '["mega"]');
  ok('v28 nombre de Méga / Primo GO', core.e.filter(e => (e.c === 'mega' || e.c === 'primal') && e.go).length === 62);
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
  ok('v30 « Présent dans » en vue d’ensemble seulement', /\$\{mode !== 'all' \? '' : availHTML\(/.test(app));
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
  ok('v31 RF/VF Switch : jeu séparé, compatible HOME, 151, 1er de la section Switch', fg && fg.h === 'direct' && fg.count === 151 && fg.extra === 0 && fi === 0 && fo && !fo.h);
  const inG = (e, i) => (e.gb >> i) & 1, bad = core.e.filter(e => inG(e, fi) && (!inG(e, oi) || e.id > 151));
  ok('v31 RF/VF Switch : uniquement le Pokédex de Kanto de RF/VF', bad.length === 0 && core.e.filter(e => inG(e, fi)).length === 151, bad.slice(0, 5).map(e => e.k).join());
  ok('v31 RF/VF Switch : n° Kanto identiques à RF/VF (GBA)', [1, 25, 150].every(id => JSON.stringify(sp(id).gm.frlgsw) === JSON.stringify(sp(id).gm.frlg)) && fs.existsSync(path.join(HERE, '../docs/data/dex/frlgsw.json')));
  ok('v31 RF/VF Switch : marque d’origine GBA (image) dans les jeux actuels', /id: 'gba'[^}]*games: \['frlgsw'\]/.test(app) && fs.existsSync(path.join(HERE, '../docs/img/origin/gba.png')) && /SWITCH_IDS = new Set\(\['frlgsw'/.test(app));
  ok('v31 Présent dans : icône du jeu (même pastille que les menus Jeux)', (app.match(/data-game="\$\{g\}">\$\{gdot\(g\)\}/g) || []).length === 2 && /\.avl li a \.gdot\{/.test(fs.readFileSync(path.join(HERE, '../docs/style.css'), 'utf8')));
  ok('v31 SW : version ≥ v31, DATA_VERSION ≥ d11', +sw.match(/VERSION = 'v(\d+)'/)[1] >= 31 && +sw.match(/DATA_VERSION = 'd(\d+)'/)[1] >= 11);
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
  ok('v32 SW : v32 + DATA_VERSION ≥ d12 + NOTES', /VERSION = 'v32'/.test(sw) && +((sw.match(/DATA_VERSION = 'd(\d+)'/) || [])[1] || 0) >= 12 && /Poképédia/.test(sw.match(/NOTES = '([^']*)'/)[1]));
}
console.log(`audit: ${pass} passed, ${fail} failed`); for (const f of fails) console.log('  FAIL', f);
