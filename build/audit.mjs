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
console.log(`audit: ${pass} passed, ${fail} failed`); for (const f of fails) console.log('  FAIL', f);
