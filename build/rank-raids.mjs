// v59: « Classements » tab, raids → docs/data/rank-raid.json, from the raid v2 simulation (data-final.json: 28 680 attacker movesets × 164 bosses,
// score = ∛(DPS³ × TDO), level 40, no weather; produced by build/raid-moves-v2-full.mjs, kept locally — not versioned, 76 MB).
// No averages: per boss, each form keeps its best moveset; % = its score / best form's score. Global and per boss type ranking:
// 1) bosses where the form is n° 1, 2) bosses where it is useful (≥ 60 % of the best), 3) best single-boss %. Two pools: without / with shadow attackers.
// Output: { date, src, nb, mv: [moveKey], F: [[entryKey, shadow 0/1]], B: [[bossKey, name, tier, types]], P: { n|s: { b: [[[f, mf, mc, pct] …top 20] per boss], g: [[f, mf, mc, n1, nu, best] …top 100], t: { type: [nBoss, [[f, mf, mc, n1, nu, best] …top 30]] } } } }
// v60.4: P.n|s.x = per boss, the next counters after the top 20 (up to rank 80, ≥ 40 % of the best), same row format, used on the device to build the teams.
// Usage: node rank-raids.mjs [path/to/data-final.json]
import fs from 'node:fs'; import path from 'node:path';
const HERE = path.dirname(new URL(import.meta.url).pathname), ROOT = path.join(HERE, '..');
const IN = process.argv[2] || path.join(ROOT, 'screenshots/raid-v2/final/data-final.json');
const XN = 80, XMIN = 0.4; // v60.4: ranks 21–80 (≥ 40 %) kept for the teams (no-legendary team, team from the collection)
const d = JSON.parse(fs.readFileSync(IN)); const S = d.sets, B = d.bosses, USE = 0.6;
const mvI = {}, mv = []; const mi = k => mvI[k] ??= mv.push(k) - 1;
const fI = {}, F = []; const fi = (k, sh) => fI[k + '|' + sh] ??= F.push([k, sh]) - 1;
const pct = x => Math.round(x * 1000) / 10;
const P = {};
for (const pool of ['n', 's']) {
  const ok = s => pool === 's' || s.kind !== 's';
  const per = B.map(b => { const best = new Map(); b.sc.forEach((v, i) => { const s = S[i]; if (!ok(s)) return; const id = s.k + '|' + (s.kind === 's' ? 1 : 0), o = best.get(id); if (!o || v[0] > o[1]) best.set(id, [i, v[0]]); });
    const L = [...best.entries()].sort((a, b) => b[1][1] - a[1][1]), top = L[0][1][1]; return L.map(([id, [i, v]]) => [id, i, v / top]); });
  const rank = idx => { const A = new Map();
    for (const j of idx) per[j].forEach(([id, i, r], pos) => { if (r < USE) return; const a = A.get(id) || { n1: 0, nu: 0, best: 0, sets: {} }; if (pos === 0) a.n1++; a.nu++; a.best = Math.max(a.best, r); a.sets[i] = (a.sets[i] || 0) + (pos === 0 ? 1000 : 0) + r; A.set(id, a); });
    return [...A.entries()].sort((x, y) => y[1].n1 - x[1].n1 || y[1].nu - x[1].nu || y[1].best - x[1].best).map(([id, a]) => { const i = +Object.entries(a.sets).sort((x, y) => y[1] - x[1])[0][0], s = S[i]; return [fi(s.k, s.kind === 's' ? 1 : 0), mi(s.f), mi(s.c), a.n1, a.nu, pct(a.best)]; }); };
  const all = B.map((_, j) => j), types = {}; B.forEach((b, j) => b.t.forEach(t => (types[t] ||= []).push(j)));
  const row = ([, i, r]) => { const s = S[i]; return [fi(s.k, s.kind === 's' ? 1 : 0), mi(s.f), mi(s.c), pct(r)]; };
  P[pool] = { b: per.map(L => L.slice(0, 20).map(row)), x: per.map(L => L.slice(20, XN).filter(([, , r]) => r >= XMIN).map(row)), g: rank(all).slice(0, 100), t: Object.fromEntries(Object.entries(types).map(([t, idx]) => [t, [idx.length, rank(idx).slice(0, 30)]])) };
}
// v60.4: boss parameters for the on-device recalculation of the collection team (docs/sim.js), same inputs as build/raid-moves-v2-full.mjs with PATCH=1
const D = path.join(ROOT, 'docs/data'), PM = JSON.parse(fs.readFileSync(path.join(ROOT, 'build/go-moves-patch.json'))), PTY = JSON.parse(fs.readFileSync(path.join(ROOT, 'build/go-types-patch.json'))).types;
const RB = JSON.parse(fs.readFileSync(path.join(ROOT, 'build/raid-bosses.json'))).bosses;
const goOf = k => { const g = { ...JSON.parse(fs.readFileSync(`${D}/sp/${parseInt(k)}.json`)).f[k].go }, p = PM.movepool[k];
  if (p) for (const f of ['fm', 'cm', 'fe', 'ce']) if (p[f]) g[f] = [...(g[f] || []), ...p[f].filter(m => !(g[f] || []).includes(m))]; if (PTY[k]) g.t = PTY[k].t; return g; };
if (RB.length !== B.length || RB.some((b, j) => b.k !== B[j].k)) throw new Error('raid-bosses.json ≠ simulation');
const BS = RB.map(b => { const g = b.go || goOf(b.k); return [g.a, g.d, g.fm, g.cm, b.cpm, b.shadow ? 1 : 0]; });
const TOP = Object.fromEntries(['n', 's'].map(pool => [pool, B.map(b => Math.max(...b.sc.filter((v, i) => pool === 's' || S[i].kind !== 's').map(v => v[0])))]));
const TY = Object.fromEntries(Object.entries(PTY).map(([k, v]) => [k, v.t])); // attacker types used by the simulation (patch)
const out = { date: '2026-10-28', src: 'Simulation raid v2 (niveau 40, sans météo ni esquive, Méga au niveau de base)', nb: B.length, mv, F, B: B.map(b => [b.k, b.n, b.tier, b.t]), P, BS, TOP, TY };
fs.writeFileSync(path.join(ROOT, 'docs/data/rank-raid.json'), JSON.stringify(out));
console.log('rank-raid.json', JSON.stringify(out).length, 'octets ; formes', F.length, '; top global sans obscurs :', P.n.g.slice(0, 5).map(r => F[r[0]][0] + ' ' + r[3] + '/' + r[4]).join(', '));
