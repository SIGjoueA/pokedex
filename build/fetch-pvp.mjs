// v32: PvP rankings (GO Battle League) from PvPoke (open source, https://github.com/pvpoke/pvpoke, MIT) → docs/data/pvp.json (lazy-loaded with GO sheets).
// pvp.json = { src, date, n: {g, u, m} (ranked count per league), r: { entryKey: [gRank, uRank, mRank, gShadow, uShadow, mShadow] } } (0 = not ranked)
// Mapping PvPoke speciesId → app entry: same National dex number + same GO base stats (atk/def/sta) as our GO data; ties → the base form first.
// Usage: node fetch-pvp.mjs [--rank-only]   (downloads ~5 MB, re-run to refresh)
// v59: also writes docs/data/rank-pvp.json (« Classements » tab) = { src, date, L: { g|u|m|l|c: { t, cp, r: [[entryKey, shadow 0/1, score, fast, charged1, charged2?] …top 200] } } }; --rank-only = rank-pvp.json only
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
if (!process.argv.includes('--rank-only')) fs.writeFileSync(path.join(D, 'pvp.json'), JSON.stringify(out));
// v59: ranking lists (top 200 per league / cup, with PvPoke score and moveset) + Little Cup + the current themed cup
const LISTS = { g: ['Ligue Super', 1500, 'all'], u: ['Ligue Hyper', 2500, 'all'], m: ['Ligue Master', 10000, 'all'], l: ['Coupe des Jeunes', 500, 'little'], c: ['Coupe Halloween Méga (Ligue Super)', 1500, 'halloweenmega'] };
const GOM = JSON.parse(fs.readFileSync(path.join(D, 'go.json'))).moves; const mv = id => !id || id === 'none' ? null : GOM[id + '_FAST'] ? id + '_FAST' : id;
const keyMega = {}; for (const p of gm) { if (!(p.tags || []).includes('mega')) continue; const c = (byId[p.dex] || []).filter(e => ['mega', 'primal'].includes(e.c)).filter(e => { const g = goOf(p.dex, e.k); return g && g.a === p.baseStats.atk && g.d === p.baseStats.def && g.s === p.baseStats.hp; }); if (c[0]) keyMega[p.speciesId.replace(/_shadow$/, '')] = c[0].k; }
const RL = {}; let unk = 0;
for (const [lg, [t, cp, cup]] of Object.entries(LISTS)) {
  const list = lg === 'g' || lg === 'u' || lg === 'm' ? rk[lg] : await get(RAW + `rankings/${cup}/overall/rankings-${cp}.json`); const r = [];
  for (const x of list) { if (r.length >= 200) break; const sid = x.speciesId.replace(/_shadow$/, ''), k = keyOf[sid] || keyMega[sid]; if (!k) { unk++; continue; } const [f, c1, c2] = x.moveset || []; r.push([k, /_shadow$/.test(x.speciesId) ? 1 : 0, x.score, mv(f), mv(c1), ...(mv(c2) ? [mv(c2)] : [])]); }
  RL[lg] = { t, cp, n: list.length, r };
}
fs.writeFileSync(path.join(D, 'rank-pvp.json'), JSON.stringify({ src: 'PvPoke (pvpoke.com, classements « overall »)', date: new Date().toISOString().slice(0, 10), cup: { c: '27 oct. – 3 nov. 2026' }, L: RL }));
console.log('rank-pvp.json:', Object.entries(RL).map(([k, v]) => `${k} ${v.r.length}/${v.n}`).join(', '), '— ignorés (forme inconnue) :', unk);
console.log(`pvp.json: ${Object.keys(r).length} entrées classées (${n.g} / ${n.u} / ${n.m}), ${miss.length} espèces PvPoke non associées : ${miss.slice(0, 25).join(', ')}`);
