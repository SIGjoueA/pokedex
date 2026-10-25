// v55: PvP move stats + recommended movesets from PvPoke (open source, https://github.com/pvpoke/pvpoke, MIT) → docs/data/pvp-moves.json (lazy, with GO sheets).
// pvp-moves.json = { src, date, m: { goMoveKey: [power, energy, turns] } (fast: energy = gain; charged: energy = cost, turns 0),
//                    ms: { entryKey: { g|u|m: [fast, charged1, charged2] (goMoveKey) } } }  — moveset of the species' rank in PvPoke « overall ».
// Species mapping as in fetch-pvp.mjs (dex number + GO base stats). Usage: node fetch-pvp-moves.mjs  (downloads ~6 MB)
import fs from 'node:fs'; import path from 'node:path';
const HERE = path.dirname(new URL(import.meta.url).pathname), D = path.join(HERE, '../docs/data');
const RAW = 'https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/';
const get = async u => { const r = await fetch(u, { headers: { 'User-Agent': 'PokedexPWA/1.0 (personal PWA)' } }); if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); };
const [gm, mv] = [await get(RAW + 'gamemaster/pokemon.json'), await get(RAW + 'gamemaster/moves.json')];
const go = JSON.parse(fs.readFileSync(path.join(D, 'go.json')));
const PV = Object.fromEntries(mv.map(x => [x.moveId, x]));
// GO key → PvPoke id: fast keys end in _FAST in our data
const m = {}, toKey = {}, missM = [];
for (const k of Object.keys(go.moves)) {
  const ALIAS = { FUTURESIGHT: 'FUTURE_SIGHT', PYROBALL: 'PYRO_BALL', TECHNO_BLAST_WATER: 'TECHNO_BLAST_DOUSE', HIDDEN_POWER: 'HIDDEN_POWER_NORMAL' }; // same stats for every Hidden Power type
  const id0 = k.replace(/_FAST$/, ''), id = ALIAS[id0] || id0, x = PV[id] || PV[k];
  if (!x) { missM.push(k); continue; }
  const fast = x.energyGain > 0 || /_FAST$/.test(k);
  m[k] = fast ? [x.power, x.energyGain, x.turns || Math.round(x.cooldown / 500)] : [x.power, x.energy, 0];
  toKey[(fast ? 'F:' : 'C:') + x.moveId] = k;
}
const core = JSON.parse(fs.readFileSync(path.join(D, 'core.json')));
const byId = {}; for (const e of core.e) (byId[e.id] ||= []).push(e);
const spCache = {}; const goOf = (id, k) => { spCache[id] ||= JSON.parse(fs.readFileSync(path.join(D, `sp/${id}.json`))); const f = spCache[id].f[k]; return f && f.go; };
const keyOf = {};
for (const p of gm) {
  if (p.tags && (p.tags.includes('mega') || p.tags.includes('duplicate'))) continue;
  const id = p.dex, sid = p.speciesId.replace(/_shadow$/, ''); if (keyOf[sid]) continue;
  const cands = (byId[id] || []).filter(e => !['mega', 'primal', 'gmax'].includes(e.c));
  const mm = cands.filter(e => { const g = goOf(id, e.k); return g && g.a === p.baseStats.atk && g.d === p.baseStats.def && g.s === p.baseStats.hp; });
  const pick = mm.find(e => !e.c) || mm.find(e => e.c === 'reg' && sid.includes('_')) || mm[0];
  if (pick) keyOf[sid] = pick.k;
}
const ms = {};
for (const [lg, cp] of Object.entries({ g: 1500, u: 2500, m: 10000 })) {
  const list = await get(RAW + `rankings/all/overall/rankings-${cp}.json`);
  for (const x of list) {
    if (/_shadow$/.test(x.speciesId)) continue; const k = keyOf[x.speciesId]; if (!k || !x.moveset) continue;
    const [f, ...c] = x.moveset.map(v => v.replace(/^HIDDEN_POWER_.*/, 'HIDDEN_POWER_NORMAL')), set = [toKey['F:' + f], ...c.map(c => toKey['C:' + c])];
    if (set.some(v => !v)) continue; (ms[k] ||= {})[lg] ||= set;
  }
}
const out = { src: 'PvPoke (pvpoke.com, gamemaster et classements « overall »)', date: new Date().toISOString().slice(0, 10), m, ms };
fs.writeFileSync(path.join(D, 'pvp-moves.json'), JSON.stringify(out));
console.log(`pvp-moves.json: ${Object.keys(m).length} attaques (${missM.length} sans donnée PvP : ${missM.slice(0, 15).join(', ')}), ${Object.keys(ms).length} entrées avec moveset`);
