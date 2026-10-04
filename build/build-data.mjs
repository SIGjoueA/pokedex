// Stage 3: assemble compact JSON for the app from the PokéAPI cache (+ GO data) -> docs/data/
//   core.json        loaded at startup (entries, games, type chart)
//   dex/{game}.json  regional Pokédex of one game (loaded when the game is selected)
//   sp/{id}.json     details of one species (all its forms), loaded on demand
//   evo.json, moves.json, ref.json, go.json   shared tables loaded with the first detail page
import fs from 'node:fs';
import path from 'node:path';
import { get, pool, API, DOCS, HERE, idOf, frName } from './lib.mjs';
import { GAMES } from './games.mjs';
import { loadAll, list, genNum } from './entries.mjs';
import { buildGo } from './go.mjs';
import { evoText } from './evotext.mjs';
import { parseEggs } from './eggs.mjs';
import { clean as cleanEn } from './translate-prep.mjs';

const OUT = path.join(DOCS, 'data');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'sp'), { recursive: true }); fs.mkdirSync(path.join(OUT, 'dex'), { recursive: true });
const write = (f, o) => { const s = JSON.stringify(o); fs.writeFileSync(path.join(OUT, f), s); return s.length; };
const clean = s => (s || '').replace(/[\n\f\r\u00ad]+/g, ' ').replace(/\s+/g, ' ').trim();

// ---------------------------------------------------------------- entries
let { species, entries } = await loadAll();
const dupes = new Set(JSON.parse(fs.readFileSync(path.join(HERE, 'art-dupes.json'), 'utf8')));
const manifest = JSON.parse(fs.readFileSync(path.join(HERE, 'art-manifest.json'), 'utf8'));
entries = entries.filter(e => !dupes.has(e.key));
const byKey = Object.fromEntries(entries.map(e => [e.key, e]));
const keyOfForm = {}; // PokéAPI pokemon / pokemon-form name -> entry key
for (const e of entries) if (!e.synthetic) { keyOfForm[e.P.name] ??= e.key; keyOfForm[e.F.name] ??= e.key; }
for (const e of entries) if (e.cat === 'base') { keyOfForm[e.P.name] = e.key; keyOfForm[e.F.name] = e.key; }
const sById = Object.fromEntries(species.map(s => [s.id, s]));

// ---------------------------------------------------------------- versions / version groups
const vgs = {};
for (const u of await list('version-group')) { const V = await get(u); vgs[V.name] = { id: V.id, order: V.order, gen: genNum(V.generation.name), versions: V.versions.map(v => v.name) }; }
const versions = {};
for (const u of await list('version')) { const V = await get(u); versions[V.name] = { id: V.id, fr: frName(V.names) || V.name }; }

// ---------------------------------------------------------------- types + chart per generation
const T = [];
for (const u of (await list('type')).filter(u => idOf(u) <= 18)) T.push(await get(u));
const typeKeys = T.map(t => t.name);
const typesOut = T.map(t => [t.name, frName(t.names)]);
function chartFor(g) {
  const exist = new Set(typeKeys.filter(k => !(g < 6 && k === 'fairy') && !(g < 2 && (k === 'dark' || k === 'steel'))));
  const chart = {};
  for (const t of T) {
    if (!exist.has(t.name)) continue;
    let rel = t.damage_relations;
    const past = t.past_damage_relations.map(p => ({ g: genNum(p.generation.name), r: p.damage_relations })).filter(p => p.g >= g).sort((a, b) => b.g - a.g);
    for (const p of past) rel = p.r;
    const row = {};
    for (const [list_, m] of [['double_damage_to', 2], ['half_damage_to', 0.5], ['no_damage_to', 0]]) for (const x of rel[list_]) if (exist.has(x.name)) row[x.name] = m;
    chart[t.name] = row;
  }
  return chart;
}
const charts = { 1: chartFor(1), 2: chartFor(2), 6: chartFor(6) };

// ---------------------------------------------------------------- reference tables
const refItems = {}; const refAb = {}; const methodNames = [];
const itemCache = {};
async function itemFr(url) { const id = idOf(url); if (!itemCache[id]) { const I = await get(url); itemCache[id] = frName(I.names) || I.name; } return itemCache[id]; }
const moveUrls = await list('move');
const moveObjs = {}; await pool(moveUrls, 8, async u => { const M = await get(u); moveObjs[M.id] = M; });
const abilityObjs = {}; await pool(await list('ability'), 8, async u => { const A = await get(u); abilityObjs[A.id] = A; });
const eggGroups = {}; for (const u of await list('egg-group')) { const G = await get(u); eggGroups[G.name] = frName(G.names) || G.name; }
const natureFr = {}; for (const u of await list('nature')) { const N = await get(u); natureFr[N.name] = frName(N.names) || N.name; }
const typeFr = Object.fromEntries(typesOut);
const moveFr = u => frName(moveObjs[idOf(u)].names) || moveObjs[idOf(u)].name;
const speciesFr = u => { const s = sById[idOf(u)]; return frName(s.names) || s.name; };

// ---------------------------------------------------------------- games + regional dexes
const dexObjs = {};
for (const u of await list('pokedex')) { const D = await get(u); dexObjs[D.name] = D; }
const games = [];
const dexOut = {};
const speciesGames = {}; // species id -> Set(game id)
for (const g of GAMES) {
  const vg = vgs[g.vg];
  const dexes = g.dex.map(n => dexObjs[n]);
  const order = []; const nums = {};
  dexes.forEach((D, di) => {
    for (const en of [...D.pokemon_entries].sort((a, b) => a.entry_number - b.entry_number)) {
      const sid = idOf(en.pokemon_species.url);
      if (!nums[sid]) { nums[sid] = []; order.push(sid); }
      nums[sid].push(di, en.entry_number);
    }
  });
  const infos = (g.info || []).map(n => dexObjs[n]);
  const info = {};
  infos.forEach((D, di) => { for (const en of D.pokemon_entries) { const sid = idOf(en.pokemon_species.url); (info[sid] ||= []).push(di, en.entry_number); } });
  dexOut[g.id] = { dx: dexes.map(D => frName(D.names) || D.name), e: order.map(sid => [sid, ...nums[sid]]) };
  for (const sid of order) (speciesGames[sid] ||= new Set()).add(g.id);
  games.push({
    id: g.id, n: g.fr, s: g.short, ...(g.home ? { h: g.home } : {}), d: g.d, k: g.kind, g: vg.gen, vo: vg.order, mv: g.mv, evo: vgs[g.evoVg || g.vg].order,
    ver: g.ver.map(v => [versions[v].id, versions[v].fr]),
    dx: dexOut[g.id].dx, info: infos.map(D => frName(D.names) || D.name), count: order.length,
    _nums: nums, _info: info,
  });
}
const gameById = Object.fromEntries(games.map(g => [g.id, g]));

// ---------------------------------------------------------------- locations / encounters (PokéAPI)
const verToGame = {}; for (const g of GAMES) for (const v of g.ver) verToGame[v] = g.id;
const SHORT_METHOD = {
  walk: 'Herbes hautes / grotte', 'old-rod': 'Canne', 'good-rod': 'Super Canne', 'super-rod': 'Méga Canne', surf: 'Surf', 'rock-smash': 'Éclate-Roc',
  headbutt: 'Coup d’Boule (arbre)', 'headbutt-low': 'Coup d’Boule (arbre, rare)', 'headbutt-normal': 'Coup d’Boule (arbre)', 'headbutt-high': 'Coup d’Boule (arbre, fréquent)',
  gift: 'Cadeau', 'gift-egg': 'Œuf cadeau', static: 'Rencontre fixe', 'dark-grass': 'Herbes sombres', 'grass-spots': 'Herbes mouvantes', 'cave-spots': 'Nuage de poussière',
  'bridge-spots': 'Ombre de pont', 'super-rod-spots': 'Pêche (ombre)', 'surf-spots': 'Surf (ombre)', 'yellow-flowers': 'Fleurs jaunes', 'purple-flowers': 'Fleurs violettes',
  'red-flowers': 'Fleurs rouges', 'rough-terrain': 'Terrain accidenté', pokeflute: 'Pokéflûte', 'squirt-bottle': 'Carapuce à O', 'wailmer-pail': 'Wailmerrosoir',
  seaweed: 'Plongée (algues)', 'roaming-grass': 'Errant (herbe)', 'roaming-water': 'Errant (eau)', 'devon-scope': 'Devon Scope', 'feebas-tile-fishing': 'Pêche (case Barpau)',
  'island-scan': 'Scan des îles', sos: 'Appel à l’aide (SOS)', 'bubbling-spots': 'Pêche (bulles)', 'berry-trees': 'Arbre à baies', 'npc-trade': 'Échange PNJ',
  'sos-from-bubbling-spot': 'SOS (bulles)', overworld: 'Monde extérieur', 'overworld-water': 'Monde extérieur (eau)', 'overworld-flying': 'Monde extérieur (ciel)',
  'overworld-special': 'Apparition rare (herbe)', 'overworld-flying-special': 'Apparition rare (ciel)', 'overworld-water-special': 'Apparition rare (eau)', horde: 'Horde (5 Pokémon)',
  'hidden-grotto': 'Trouée cachée', 'honey-tree': 'Arbre à Miel', 'overworld-dirt': 'Monde extérieur (sol)', wanderer: 'Emplacement fixe', 'wanderer-water': 'Emplacement fixe (eau)',
  'chase-water': 'Poursuite (eau)', 'dynamax-adventure': 'Expédition Dynamax', 'max-raid': 'Raid Dynamax', 'trash-can-ambush': 'Embuscade (poubelle)', 'rustling-bush-ambush': 'Embuscade (buisson)',
  'ceiling-ambush': 'Embuscade (plafond)', 'ground-ambush': 'Embuscade (sol)', 'sky-ambush': 'Embuscade (ciel)', 'pokemon-ranger': 'Pokémon Ranger', 'pokemon-battle-revolution': 'Pokémon Battle Revolution',
};
const encMethodObj = {}; for (const u of await list('encounter-method')) { const M = await get(u); encMethodObj[M.name] = M; }
const encCondObj = {}; for (const u of await list('encounter-condition-value')) { const C = await get(u); encCondObj[C.name] = C; }
const encCache = { loc: [], locIdx: {}, m: [], mIdx: {}, c: [], cIdx: {} };
const SFX_FR = { north: 'Nord', south: 'Sud', east: 'Est', west: 'Ouest', northeast: 'Nord-Est', northwest: 'Nord-Ouest', southeast: 'Sud-Est', southwest: 'Sud-Ouest', inside: 'intérieur', outside: 'extérieur', cave: 'grotte' };
const unslug = n => n.replace(/-area$/, '').split('-').map(w => w[0]?.toUpperCase() + w.slice(1)).join(' ');
async function areaIndex(url) {
  if (url in encCache.locIdx) return encCache.locIdx[url];
  const A = await get(url); const L = await get(A.location.url);
  let name = frName(A.names);
  if (!name) {
    const lf = frName(L.names); const sfx = A.name.startsWith(L.name + '-') ? A.name.slice(L.name.length + 1) : '';
    if (lf) name = !sfx || sfx === 'area' || sfx === 'main' ? lf : SFX_FR[sfx] ? `${lf} (${SFX_FR[sfx]})` : /^(max-den-)/.test(sfx) ? `${lf} (${sfx.slice(8).toUpperCase()})` : /^(b?\d+f|\d+)$/.test(sfx) ? `${lf} ${sfx.toUpperCase()}` : lf;
    else name = unslug(A.name);
  }
  return encCache.locIdx[url] = encCache.loc.push(name) - 1;
}
async function methodIndex(name) {
  if (name in encCache.mIdx) return encCache.mIdx[name];
  const M = encMethodObj[name];
  return encCache.mIdx[name] = encCache.m.push(SHORT_METHOD[name] || frName(M.names) || name) - 1;
}
async function condIndex(name) {
  if (name in encCache.cIdx) return encCache.cIdx[name];
  if (/^(trade-|coins-|story-progress-catch-all|other-caught)/.test(name)) return encCache.cIdx[name] = null;
  const C = encCondObj[name]; const fr = frName(C.names);
  return encCache.cIdx[name] = fr ? encCache.c.push(fr) - 1 : null;
}
const gamesWithEnc = new Set();
async function encountersOf(pid) {
  const raw = await get(`${API}/pokemon/${pid}/encounters`);
  const per = {}; // game -> Map(key -> row)
  for (const a of raw) {
    const ai = await areaIndex(a.location_area.url);
    for (const vd of a.version_details) {
      const gid = verToGame[vd.version.name]; if (!gid) continue;
      const by = new Map();
      for (const d of vd.encounter_details) {
        const mi = await methodIndex(d.method.name);
        const cs = []; for (const c of d.condition_values) { const ci = await condIndex(c.name); if (ci !== null && !cs.includes(ci)) cs.push(ci); } cs.sort((x, y) => x - y);
        const k = mi + '|' + cs.join('.'); const o = by.get(k) || { m: mi, c: cs, min: 999, max: 0, ch: 0 };
        o.min = Math.min(o.min, d.min_level); o.max = Math.max(o.max, d.max_level); o.ch += d.chance; by.set(k, o);
      }
      const mapG = per[gid] ||= new Map();
      for (const o of by.values()) {
        const key = [ai, o.m, o.min, o.max, Math.min(o.ch, 100), o.c.join('.')].join('|');
        const r = mapG.get(key) || { row: [ai, o.m, o.min, o.max, Math.min(o.ch, 100), o.c], vs: new Set() };
        r.vs.add(versions[vd.version.name].id); mapG.set(key, r);
      }
    }
  }
  const out = {};
  for (const [gid, m] of Object.entries(per)) {
    const g = gameById[gid]; const all = g.ver.map(v => v[0]);
    out[gid] = [...m.values()].map(({ row, vs }) => {
      const full = all.every(v => vs.has(v));
      const r = row.slice(); if (!r[5].length && full) return r.slice(0, 5);
      r[5] = r[5].length ? r[5] : 0; if (!full) r.push([...vs].sort((a, b) => a - b)); return r;
    }).sort((x, y) => x[0] - y[0] || x[1] - y[1]);
    gamesWithEnc.add(gid);
  }
  return out;
}
// TM / HM / TR numbers per game
const tmByVg = {};
for (const u of await list('machine')) {
  const M = await get(u); const m = M.item.name.match(/^(tm|hm|tr)(\d+)$/); if (!m) continue;
  const lab = (m[1] === 'tm' ? 'CT' : m[1] === 'hm' ? 'CS' : 'DT') + m[2];
  const o = tmByVg[M.version_group.name] ||= {}; const mid = idOf(M.move.url);
  if (!(o[mid] || '').split('/').includes(lab)) o[mid] = o[mid] ? o[mid] + '/' + lab : lab;
}
const tmOut = {};
for (const g of games) {
  for (const vg of [...g.mv].reverse()) if (tmByVg[vg]) { tmOut[g.id] = { ...(tmOut[g.id] || {}), ...Object.fromEntries(Object.entries(tmByVg[vg]).filter(([k]) => !(tmOut[g.id] || {})[k])) }; }
}

// ---------------------------------------------------------------- GO data
const go = await buildGo({ entries, byKey, species, sById, moveObjs, typeFr, moveFr: id => frName(moveObjs[id].names) });

const eggs = await parseEggs(go.perKey);
for (const [k, v] of Object.entries(eggs.byKey)) go.perKey[k].eg = v;
go.shared.egg = { season: eggs.season, upd: eggs.updated, n: Object.keys(eggs.byKey).length };

// machine translations of English-only Pokédex texts
const TR = JSON.parse(fs.readFileSync(path.join(HERE, 'translations-fr.json'), 'utf8'));

// ---------------------------------------------------------------- per-entry availability by game
const movesVgsCache = new Map();
const moveVgs = P => { if (!movesVgsCache.has(P)) movesVgsCache.set(P, new Set(P.moves.flatMap(m => m.version_group_details.map(d => d.version_group.name)))); return movesVgsCache.get(P); };
const SWSH_VGS = ['sword-shield', 'the-isle-of-armor', 'the-crown-tundra'];
function availability(e) {
  const sg = speciesGames[e.id] || new Set();
  if (e.cat === 'base') return [...sg];
  const out = [];
  for (const g of games) {
    if (!sg.has(g.id)) continue;
    const vg = vgs[g.mv[g.mv.length - 1]]; const own = vgs[g.mv[0]];
    let ok;
    if (e.cat === 'mega' || e.cat === 'primal') {
      const MEGA_GAMES = e.cat === 'primal' ? ['oras'] : ['xy', 'oras', 'sm', 'usum', 'lgpe', 'za', 'zadlc'];
      const intro = vgs[e.intro].order;
      ok = MEGA_GAMES.includes(g.id) && (own.order >= intro || (e.intro === 'mega-dimension' && (g.id === 'za' || g.id === 'zadlc')));
    }
    else if (e.cat === 'sex') ok = g.g >= 4 && (!e.variety || moveVgs(e.P).size === 0 || g.mv.some(v => moveVgs(e.P).has(v)));
    else if (e.variety) {
      const mv = moveVgs(e.P);
      if (mv.size) ok = g.mv.some(v => mv.has(v));
      else if (e.cat === 'gmax') ok = g.mv.some(v => SWSH_VGS.includes(v));
      else if (e.cat === 'mega') ok = g.id === 'za' || g.id === 'zadlc';
      else ok = vg.order >= vgs[e.intro].order;
    } else ok = vg.order >= vgs[e.intro].order; // cosmetic form
    if (e.sfx.endsWith('female') && e.synthetic && e.sfx !== 'female') ok = ok && g.g >= 8;
    if (ok) out.push(g.id);
  }
  return out;
}

// ---------------------------------------------------------------- evolution edges
const chainUrls = await list('evolution-chain');
const edges = {}; // "from>to" -> { f, t, d: [] }
const itemsForEvo = [];
async function walkChain(n, parent) {
  if (parent) {
    const dets = n.evolution_details;
    const isSpinMany = dets.length > 8;
    for (const d of (isSpinMany ? dets.slice(0, 1) : dets)) {
      const from = d.required_pokemon_form ? (keyOfForm[d.required_pokemon_form.name] || String(idOf(parent.species.url))) : String(idOf(parent.species.url));
      const to = d.evolved_pokemon_form && !isSpinMany ? (keyOfForm[d.evolved_pokemon_form.name] || String(idOf(n.species.url))) : String(idOf(n.species.url));
      const k = from + '>' + to;
      const x = await evoText(d, { itemFr, moveFr, speciesFr, typeFr, natureFr, collapsed: isSpinMany });
      (edges[k] ||= { f: from, t: to, d: [] }).d.push({
        v: vgs[d.version_group.name]?.order ?? 0, df: d.is_default ? 1 : 0,
        g: [d.required_pokemon_form?.name || '', d.evolved_pokemon_form?.name || '', d.gender || ''].join('|'), x,
      });
    }
  }
  for (const c of n.evolves_to) await walkChain(c, n);
}
for (const u of chainUrls) { const c = await get(u); await walkChain(c.chain, null); }
for (const [k, v] of Object.entries(go.edges)) { (edges[k] ||= { f: v.f, t: v.t, d: [] }).o = v.o; }
const evoOut = Object.values(edges).map(e => e.o ? [e.f, e.t, e.d, e.o] : [e.f, e.t, e.d]);
// chains by species (for the client to find the connected component quickly)
const chainOf = {}; for (const s of species) chainOf[s.id] = idOf(s.evolution_chain.url);

// ---------------------------------------------------------------- per-species details
const STATS = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];
const MET = { 'level-up': 'l', machine: 'm', egg: 'e', tutor: 't' };
const usedMoves = new Set(), usedAb = new Set(), usedItems = new Set();
const statsOf = P => { const a = [0, 0, 0, 0, 0, 0]; P.stats.forEach(s => a[STATS.indexOf(s.stat.name)] = s.base_stat); return a; };
const typesOf = P => P.types.sort((a, b) => a.slot - b.slot).map(t => t.type.name);
function pastStats(P) {
  const cur = statsOf(P); const ent = (P.past_stats || []).map(p => ({ g: genNum(p.generation.name), s: p.stats })).sort((a, b) => a.g - b.g);
  const out = [];
  for (const e of ent) {
    const a = cur.slice();
    for (const p of [...ent].filter(x => x.g >= e.g).sort((x, y) => y.g - x.g)) for (const s of p.s) { if (s.stat.name === 'special') { a[3] = s.base_stat; a[4] = s.base_stat; } else a[STATS.indexOf(s.stat.name)] = s.base_stat; }
    out.push([e.g, a]);
  }
  return out;
}
function abList(P) { return P.abilities.slice().sort((a, b) => a.slot - b.slot).map(a => [idOf(a.ability.url), a.is_hidden ? 1 : 0]); }
function pastAbilities(P) {
  const ent = (P.past_abilities || []).map(p => ({ g: genNum(p.generation.name), a: p.abilities })).sort((a, b) => a.g - b.g);
  const out = [];
  for (const e of ent) {
    const slots = new Map(P.abilities.map(a => [a.slot, [idOf(a.ability.url), a.is_hidden ? 1 : 0]]));
    for (const p of [...ent].filter(x => x.g >= e.g).sort((x, y) => y.g - x.g)) for (const a of p.a) { if (!a.ability) slots.delete(a.slot); else slots.set(a.slot, [idOf(a.ability.url), a.is_hidden ? 1 : 0]); }
    out.push([e.g, [...slots.entries()].sort((x, y) => x[0] - y[0]).map(x => x[1])]);
  }
  return out;
}
function pastTypes(P) { return (P.past_types || []).map(p => [genNum(p.generation.name), p.types.sort((a, b) => a.slot - b.slot).map(t => t.type.name)]).sort((a, b) => a[0] - b[0]); }
function learnsets(P) {
  const per = {}; // vg -> {l,m,e,t,o}
  for (const m of P.moves) {
    const id = idOf(m.move.url);
    for (const d of m.version_group_details) {
      const vg = d.version_group.name; const meth = d.move_learn_method.name;
      const o = per[vg] ||= { l: [], m: [], e: [], t: [], o: [] };
      if (meth === 'level-up') o.l.push([id, d.level_learned_at, d.order ?? 0]);
      else if (MET[meth]) o[MET[meth]].push(id);
      else { let mi = methodNames.indexOf(meth); if (mi < 0) mi = methodNames.push(meth) - 1; o.o.push([id, mi]); }
    }
  }
  return per;
}
function gameLearnset(per, g) {
  const out = { l: [], m: new Set(), e: new Set(), t: new Set(), o: [] };
  let any = false; const seenL = new Set();
  for (const vg of g.mv) {
    const o = per[vg]; if (!o) continue; any = true;
    for (const x of o.l) { const k = x[0] + ':' + x[1]; if (!seenL.has(k)) { seenL.add(k); out.l.push(x); } }
    o.m.forEach(i => out.m.add(i)); o.e.forEach(i => out.e.add(i)); o.t.forEach(i => out.t.add(i)); out.o.push(...o.o);
  }
  if (!any) return null;
  out.l.sort((a, b) => a[1] - b[1] || a[2] - b[2] || a[0] - b[0]);
  const f = { l: out.l.map(([i, l]) => [i, l]), m: [...out.m].sort((a, b) => a - b), e: [...out.e].sort((a, b) => a - b), t: [...out.t].sort((a, b) => a - b) };
  if (out.o.length) f.o = out.o;
  for (const k of ['l', 'm', 'e', 't']) if (!f[k].length) delete f[k];
  for (const k of Object.keys(f)) (k === 'l' || k === 'o' ? f[k].map(x => x[0]) : f[k]).forEach(i => usedMoves.add(i));
  return f;
}
const heldOf = async P => {
  const out = [];
  for (const h of P.held_items) {
    const id = idOf(h.item.url); await itemFr(h.item.url); usedItems.add(id);
    const by = {}; for (const vd of h.version_details) (by[vd.rarity] ||= []).push(versions[vd.version.name]?.id);
    for (const [r, vs] of Object.entries(by)) out.push([id, +r, vs.filter(Boolean).sort((a, b) => a - b)]);
  }
  return out;
};

let totalSp = 0;
const encOwner = new Map();
const goOut = go.perKey;
const coreEntries = []; const avByKey = {};
const mvHash = {};
for (const S of species) {
  const ents = entries.filter(e => e.id === S.id);
  const fl = S.flavor_text_entries.filter(f => f.language.name === 'fr');
  const ftab = []; const fv = {};
  for (const f of fl) { const t = clean(f.flavor_text); if (!t) continue; let i = ftab.indexOf(t); if (i < 0) i = ftab.push(t) - 1; fv[versions[f.version.name]?.id ?? f.version.name] = i; }
  const frVers = new Set(fl.map(f => f.version.name));
  const ttab = []; const tv = {};
  for (const f of S.flavor_text_entries) {
    if (f.language.name !== 'en' || frVers.has(f.version.name)) continue;
    const t = TR[cleanEn(f.flavor_text)]; if (!t) continue;
    let i = ttab.indexOf(t); if (i < 0) i = ttab.push(t) - 1; tv[versions[f.version.name]?.id ?? f.version.name] = i;
  }
  const sp = {
    id: S.id, gn: frName(S.genera, 'genus') || '', ft: ftab, fv, ...(ttab.length ? { tt: ttab, tv } : {}),
    gr: S.gender_rate, cr: S.capture_rate, hc: S.hatch_counter, bh: S.base_happiness,
    eg: S.egg_groups.map(g => eggGroups[g.name]), gw: S.growth_rate.name,
    gm: {}, f: {},
  };
  for (const g of games) { const n = g._nums[S.id]; if (n) { sp.gm[g.id] = n; if (g._info[S.id]) sp.gm[g.id + '*'] = g._info[S.id]; } }
  const lsCache = new Map(); const mvBySpecies = {};
  for (const e of ents) {
    const P = e.P;
    const f = { n: e.fr, t: typesOf(P), s: statsOf(P), h: P.height / 10, w: P.weight / 10, a: abList(P) };
    const pt = pastTypes(P); if (pt.length) f.pt = pt;
    const ps = pastStats(P); if (ps.length) f.ps = ps;
    const pa = pastAbilities(P); if (pa.length) f.pa = pa;
    f.a.forEach(a => usedAb.add(a[0])); pa.forEach(p => p[1].forEach(a => usedAb.add(a[0])));
    const av = availability(e); avByKey[e.key] = av;
    if (e.cat !== 'base' || av.length) f.av = av;
    const ho = await heldOf(P); if (ho.length) f.hi = ho;
    // learnsets
    if (!lsCache.has(P)) lsCache.set(P, learnsets(P));
    const per = lsCache.get(P);
    if (e.cosmetic || (e.cat === 'sex' && e.synthetic)) { if (e.cat !== 'base') f.mvOf = String(e.id); }
    else if (av.length) {
      const sets = []; const idx = {};
      for (const gid of av) {
        const ls = gameLearnset(per, gameById[gid]); if (!ls) continue;
        const h = JSON.stringify(ls); let i = sets.findIndex(s => s.h === h);
        if (i < 0) { sets.push({ h, ls }); i = sets.length - 1; }
        idx[gid] = i;
      }
      if (sets.length) { f.ls = sets.map(s => s.ls); f.lm = idx; }
    }
    if (go.perKey[e.key]) f.go = go.perKey[e.key];
    if (!encOwner.has(P.id)) {
      encOwner.set(P.id, e.key);
      const en = await encountersOf(P.id); if (Object.keys(en).length) f.en = en;
    } else if (encOwner.get(P.id) !== e.key) f.enOf = encOwner.get(P.id);
    sp.f[e.key] = f;
    coreEntries.push(e);
  }
  // identical learnsets between forms -> reference the base
  const baseF = sp.f[String(S.id)];
  for (const [k, f] of Object.entries(sp.f)) {
    if (k === String(S.id) || !f.ls || !baseF?.ls) continue;
    if (JSON.stringify([f.ls, f.lm]) === JSON.stringify([baseF.ls, baseF.lm])) { delete f.ls; delete f.lm; f.mvOf = String(S.id); }
  }
  if (!baseF?.ls) for (const [k, f] of Object.entries(sp.f)) if (f.mvOf === String(S.id)) delete f.mvOf;
  totalSp += write(`sp/${S.id}.json`, sp);
}

// ---------------------------------------------------------------- moves table
const movesOut = {};
const CLS = { physical: 'p', special: 's', status: 'n' };
for (const id of usedMoves) {
  const M = moveObjs[id]; if (!M) continue;
  const past = (M.past_values || []).map(p => {
    const o = {}; if (p.type) o.t = p.type.name; if (p.power !== null) o.p = p.power; if (p.accuracy !== null) o.a = p.accuracy; if (p.pp !== null) o.pp = p.pp;
    return [vgs[p.version_group.name]?.order ?? 0, o];
  }).filter(x => Object.keys(x[1]).length).sort((a, b) => a[0] - b[0]);
  const row = [frName(M.names) || M.name, M.type.name, CLS[M.damage_class.name], M.power, M.accuracy, M.pp];
  if (past.length) row.push(past);
  movesOut[id] = row;
}
// ---------------------------------------------------------------- ref table
const refOut = { ab: {}, it: {}, mm: methodNames, eg: eggGroups };
const clip = s => clean(s);
for (const id of usedAb) { const A = abilityObjs[id]; const fl = A.flavor_text_entries.filter(f => f.language.name === 'fr').pop(); refOut.ab[id] = [frName(A.names) || A.name, clip(fl?.flavor_text), genNum(A.generation.name)]; }
for (const id of usedItems) refOut.it[id] = itemCache[id];
for (const id of Object.keys(itemCache)) refOut.it[id] = itemCache[id];

// ---------------------------------------------------------------- core
const core = {
  v: new Date().toISOString(), types: typesOut, charts,
  games: games.map(({ _nums, _info, ...g }) => ({ ...g, ...(gamesWithEnc.has(g.id) ? { enc: 1 } : {}) })),
  e: coreEntries.map(e => {
    const r = { k: e.key, id: e.id, n: e.fr, en: e.en, t: typesOf(e.P), g: idOf(e.S.generation.url), s: statsOf(e.P) };
    if (e.cat !== 'base') { r.c = e.cat; r.l = e.label; } else if (e.label) r.l = e.label;
    r.gb = games.reduce((m, g, i) => m + (avByKey[e.key].includes(g.id) ? 2 ** i : 0), 0);
    if (e.S.is_legendary) r.lg = 1; if (e.S.is_mythical) r.my = 1; if (e.S.is_baby) r.ba = 1;
    if (manifest[e.key]?.shSha && manifest[e.key].shSha !== manifest[e.key].sha) r.sh = 1;
    if (go.perKey[e.key]?.r) r.go = 1;
    return r;
  }),
  chains: chainOf,
};
// species-level game membership flag for entries is looked up in dex files
const sizes = { core: write('core.json', core), dex: 0 };
for (const g of games) sizes.dex += write(`dex/${g.id}.json`, dexOut[g.id]);
sizes.evo = write('evo.json', evoOut);
sizes.moves = write('moves.json', movesOut);
sizes.ref = write('ref.json', refOut);
sizes.go = write('go.json', go.shared);
sizes.loc = write('loc.json', { a: encCache.loc, m: encCache.m, c: encCache.c });
sizes.tm = write('tm.json', tmOut);
sizes.sp = totalSp;
console.log('entries', coreEntries.length, 'edges', evoOut.length, 'sizes (bytes, raw):', sizes);
