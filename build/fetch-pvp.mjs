// v32: PvP rankings (GO Battle League) from PvPoke (open source, https://github.com/pvpoke/pvpoke, MIT) → docs/data/pvp.json (lazy-loaded with GO sheets).
// pvp.json = { src, date, n: {g, u, m} (ranked count per league), r: { entryKey: [gRank, uRank, mRank, gShadow, uShadow, mShadow] } } (0 = not ranked)
// Mapping PvPoke speciesId → app entry: same National dex number + same GO base stats (atk/def/sta) as our GO data; ties → the base form first.
// Usage: node fetch-pvp.mjs   (downloads ~4 MB, re-run to refresh)
import fs from 'node:fs'; import path from 'node:path';
const HERE = path.dirname(new URL(import.meta.url).pathname), D = path.join(HERE, '../docs/data');
const RAW = 'https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/';
const get = async u => { const r = await fetch(u, { headers: { 'User-Agent': 'PokedexPWA/1.0 (personal PWA)' } }); if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); };
const gm = await get(RAW + 'gamemaster/pokemon.json');
const L = { g: 1500, u: 2500, m: 10000 };
const rk = {}; for (const [k, cp] of Object.entries(L)) rk[k] = await get(RAW + `rankings/all/overall/rankings-${cp}.json`);
const core = JSON.parse(fs.readFileSync(path.join(D, 'core.json')));
const byId = {}; for (const e of core.e) (byId[e.id] ||= []).push(e);
const spCache = {}; const goOf = (id, k) => { spCache[id] ||= JSON.parse(fs.readFileSync(path.join(D, `sp/${id}.json`))); const f = spCache[id].f[k]; return f && f.go; };
const keyOf = {}, miss = [];
for (const p of gm) {
  if (p.tags && (p.tags.includes('mega') || p.tags.includes('duplicate'))) continue;
  const id = p.dex, sid = p.speciesId.replace(/_shadow$/, ''); if (keyOf[sid]) continue;
  const cands = (byId[id] || []).filter(e => !['mega', 'primal', 'gmax'].includes(e.c));
  const m = cands.filter(e => { const g = goOf(id, e.k); return g && g.a === p.baseStats.atk && g.d === p.baseStats.def && g.s === p.baseStats.hp; });
  const pick = m.find(e => !e.c) || m.find(e => e.c === 'reg' && sid.includes('_')) || m[0];
  if (pick) keyOf[sid] = pick.k; else miss.push(p.speciesId);
}
const r = {}, n = {};
for (const [lg, list] of Object.entries(rk)) {
  const col = { g: 0, u: 1, m: 2 }[lg]; n[lg] = list.length;
  list.forEach((x, i) => { const sh = /_shadow$/.test(x.speciesId), k = keyOf[x.speciesId.replace(/_shadow$/, '')]; if (!k) return; const a = r[k] ||= [0, 0, 0, 0, 0, 0]; const c = col + (sh ? 3 : 0); if (!a[c]) a[c] = i + 1; });
}
for (const k of Object.keys(r)) { while (r[k].length && !r[k][r[k].length - 1]) r[k].pop(); }
const out = { src: 'PvPoke (pvpoke.com, classements « overall » toutes saisons, Ligue Super / Hyper / Master)', date: new Date().toISOString().slice(0, 10), n, r };
fs.writeFileSync(path.join(D, 'pvp.json'), JSON.stringify(out));
console.log(`pvp.json: ${Object.keys(r).length} entrées classées (${n.g} / ${n.u} / ${n.m}), ${miss.length} espèces PvPoke non associées : ${miss.slice(0, 25).join(', ')}`);
