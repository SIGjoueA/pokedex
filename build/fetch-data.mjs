// Build-time data fetch from PokéAPI -> ../public/data/pokedex.json
import fs from 'node:fs';
import path from 'node:path';
const API = 'https://pokeapi.co/api/v2';
const CACHE = path.resolve('.cache'); fs.mkdirSync(CACHE, { recursive: true });
const OUT = path.resolve('../public/data'); fs.mkdirSync(OUT, { recursive: true });

async function get(url) {
  const key = url.replace(/[^a-z0-9]+/gi, '_');
  const f = path.join(CACHE, key + '.json');
  if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8'));
  for (let i = 0; i < 6; i++) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(r.status);
      const t = await r.text();
      fs.writeFileSync(f, t);
      return JSON.parse(t);
    } catch (e) { await new Promise(r => setTimeout(r, 800 * (i + 1))); }
  }
  throw new Error('failed ' + url);
}
async function pool(items, n, fn) {
  const res = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) { const k = i++; res[k] = await fn(items[k], k); }
  }));
  return res;
}
const fr = (names, field = 'name') => (names.find(n => n.language.name === 'fr') || {})[field];
const idOf = u => +u.match(/\/(\d+)\/?$/)[1];

// ---- Types
const typeList = (await get(`${API}/type?limit=100`)).results.filter(t => idOf(t.url) <= 18);
const types = await pool(typeList, 6, t => get(t.url));
const typeKeys = types.map(t => t.name);
const typesOut = types.map(t => ({ key: t.name, fr: fr(t.names) }));
// chart[attacker][defender] = multiplier
const chart = {};
for (const t of types) {
  chart[t.name] = {};
  for (const d of typeKeys) chart[t.name][d] = 1;
  for (const x of t.damage_relations.double_damage_to) if (chart[t.name][x.name] !== undefined) chart[t.name][x.name] = 2;
  for (const x of t.damage_relations.half_damage_to) if (chart[t.name][x.name] !== undefined) chart[t.name][x.name] = 0.5;
  for (const x of t.damage_relations.no_damage_to) if (chart[t.name][x.name] !== undefined) chart[t.name][x.name] = 0;
}
function defense(tlist) { // multiplier per attacking type against defender types
  const o = {};
  for (const a of typeKeys) o[a] = tlist.reduce((m, d) => m * chart[a][d], 1);
  return o;
}

// Pokémon GO uses fixed steps: each "step" = x1.6 (weak) or x0.625 (resist); immunity = 2 resist steps.
function goSteps(tlist) {
  const o = {};
  for (const a of typeKeys) {
    const st = tlist.reduce((sum, d) => sum + (chart[a][d] === 2 ? 1 : chart[a][d] === 0.5 ? -1 : chart[a][d] === 0 ? -2 : 0), 0);
    if (st) o[a] = st;
  }
  return o;
}

// ---- Species + pokemon
const count = (await get(`${API}/pokemon-species?limit=1`)).count;
console.log('species count', count);
const ids = Array.from({ length: count }, (_, i) => i + 1);
let done = 0;
const rows = await pool(ids, 12, async id => {
  const sp = await get(`${API}/pokemon-species/${id}`);
  const defVar = sp.varieties.find(v => v.is_default) || sp.varieties[0];
  const pk = await get(defVar.pokemon.url);
  if (++done % 100 === 0) console.log(done);
  return { sp, pk };
});

// ---- Evolution chains + items
const chainIds = [...new Set(rows.map(r => idOf(r.sp.evolution_chain.url)))];
const chains = await pool(chainIds, 8, id => get(`${API}/evolution-chain/${id}`));
const itemNames = new Set();
const scanF = n => { for (const d of n.evolution_details) { if (d.item) itemNames.add(d.item.url); if (d.held_item) itemNames.add(d.held_item.url); } n.evolves_to.forEach(scanF); };
chains.forEach(c => scanF(c.chain));
const itemFr = {};
await pool([...itemNames], 8, async u => { const it = await get(u); itemFr[u] = fr(it.names) || it.name; });
const moveCache = {};
async function moveFr(u) { if (!moveCache[u]) { const m = await get(u); moveCache[u] = fr(m.names) || m.name; } return moveCache[u]; }
const TOD = { day: 'de jour', night: 'de nuit' };
async function cond(details) {
  if (!details.length) return '';
  const d = details[0]; const p = [];
  const trig = d.trigger.name;
  if (d.min_level) p.push(`Niv. ${d.min_level}`);
  if (trig === 'use-item' && d.item) p.push(itemFr[d.item.url]);
  if (trig === 'trade') p.push('Échange' + (d.held_item ? ` avec ${itemFr[d.held_item.url]}` : '') + (d.trade_species ? '' : ''));
  else if (d.held_item) p.push(`tenant ${itemFr[d.held_item.url]}`);
  if (d.min_happiness) p.push('Bonheur élevé');
  if (d.min_affection) p.push('Affection élevée');
  if (d.min_beauty) p.push('Beauté élevée');
  if (d.known_move) p.push(`connaît ${await moveFr(d.known_move.url)}`);
  if (d.known_move_type) p.push('connaît une capacité de type ' + (typesOut.find(t => t.key === d.known_move_type.name)?.fr || ''));
  if (d.location) p.push('lieu spécial');
  if (d.gender === 1) p.push('femelle'); if (d.gender === 2) p.push('mâle');
  if (d.time_of_day) p.push(TOD[d.time_of_day] || d.time_of_day);
  if (d.needs_overworld_rain) p.push('sous la pluie');
  if (d.turn_upside_down) p.push('console retournée');
  if (d.relative_physical_stats !== null && d.relative_physical_stats !== undefined) p.push(d.relative_physical_stats > 0 ? 'Att > Déf' : d.relative_physical_stats < 0 ? 'Att < Déf' : 'Att = Déf');
  if (d.party_species) p.push('avec un autre Pokémon dans l\'équipe');
  if (!p.length && trig === 'level-up') p.push('Montée de niveau');
  if (!p.length) p.push('Condition spéciale');
  return p.join(', ');
}
async function conv(n) {
  return { id: idOf(n.species.url), c: await cond(n.evolution_details), e: await Promise.all(n.evolves_to.map(conv)) };
}
const chainsOut = {};
for (const c of chains) chainsOut[c.id] = await conv(c.chain);

// ---- Assemble
const STATS = { hp: 0, attack: 1, defense: 2, 'special-attack': 3, 'special-defense': 4, speed: 5 };
const clean = s => (s || '').replace(/[\n\f\r]+/g, ' ').replace(/\s+/g, ' ').trim();
const pokemon = rows.map(({ sp, pk }) => {
  const tl = pk.types.sort((a, b) => a.slot - b.slot).map(t => t.type.name);
  const dm = defense(tl);
  const stats = [0, 0, 0, 0, 0, 0];
  pk.stats.forEach(s => stats[STATS[s.stat.name]] = s.base_stat);
  // latest French flavor text
  const fl = sp.flavor_text_entries.filter(f => f.language.name === 'fr').pop();
  const art = pk.sprites.other?.['official-artwork']?.front_default || pk.sprites.front_default;
  return {
    id: sp.id,
    fr: fr(sp.names) || sp.name,
    en: (sp.names.find(n => n.language.name === 'en') || {}).name || sp.name,
    slug: sp.name,
    t: tl,
    g: idOf(sp.generation.url),
    st: stats,
    h: pk.height / 10, w: pk.weight / 10,
    genus: fr(sp.genera, 'genus') || '',
    desc: clean(fl?.flavor_text),
    leg: sp.is_legendary, myth: sp.is_mythical, baby: sp.is_baby,
    ch: idOf(sp.evolution_chain.url),
    // multipliers in the main games (x4, x2, x0.5, x0.25, x0)
    go: goSteps(tl),
    wk: Object.fromEntries(Object.entries(dm).filter(([, v]) => v !== 1)),
    _art: art
  };
});
fs.writeFileSync(path.join(OUT, 'pokedex.json'), JSON.stringify({
  generatedAt: new Date().toISOString(), source: 'https://pokeapi.co',
  types: typesOut, pokemon: pokemon.map(({ _art, ...p }) => p), chains: chainsOut
}));
fs.writeFileSync('art-urls.json', JSON.stringify(pokemon.map(p => ({ id: p.id, url: p._art }))));
console.log('ok', pokemon.length, 'chains', Object.keys(chainsOut).length);
