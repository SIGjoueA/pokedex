// v60.5 (v60.8: sim Max avec Dialga et Palkia Dynamax): exhaustive boss lists for the GO sheet (« Raids & arènes » Normal / Obscur, « Combats Max » by role), added to docs/data/raid-moves.json.
// Raids: same rule as the sheet's « utile » (build/raid-moves-v2-final-analyse.mjs): best moveset ≥ 60 % of the best non-Méga attacker (Méga: of the best attacker),
// each boss under the attacker's best moveset against it. Max: same rule as the Combats Max ranking (build/rank-max.mjs): ≥ 60 % of the best in the role.
// Inputs (kept locally, not versioned): screenshots/raid-v2/final/data-final-v60.6.json, screenshots/max-v1/final/sim-p50-l40-v60.8.json.
import fs from 'node:fs'; import path from 'node:path';
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..'), OUT = path.join(ROOT, 'docs/data/raid-moves.json');
const V = JSON.parse(fs.readFileSync(path.join(ROOT, 'screenshots/raid-v2/final/data-final-v60.6.json')));
const M = JSON.parse(fs.readFileSync(path.join(ROOT, 'screenshots/max-v1/final/sim-p50-l40-v60.8.json')));
const RR = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/data/rank-raid.json'))), RM = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/data/rank-max.json')));
if (V.bosses.some((b, j) => b.k !== RR.B[j][0])) throw new Error('raid bosses ≠ rank-raid.json'); if (M.bosses.some((b, j) => b.key !== RM.B[j][0])) throw new Error('max bosses ≠ rank-max.json');
const mvk = [], mvI = {}, mi = k => mvI[k] ??= mvk.push(k) - 1, pc = x => Math.round(x * 100);
// ---- raids
const S = V.sets, tops = V.bosses.map(b => { let all = 0, nm = 0; b.sc.forEach((v, i) => { v = v[0]; if (v > all) all = v; if (S[i].kind !== 'm' && v > nm) nm = v; }); return { all, nm }; });
const by = {}; S.forEach((s, i) => (by[s.k + '|' + (s.kind === 's' ? 'o' : 'n')] ??= { k: s.k, kind: s.kind, idx: [] }).idx.push(i));
const bl = {};
for (const [id, A] of Object.entries(by)) { const g = new Map();
  V.bosses.forEach((b, j) => { const top = A.kind === 'm' ? tops[j].all : tops[j].nm; let bi = -1, my = -1; for (const i of A.idx) if (b.sc[i][0] > my) { my = b.sc[i][0]; bi = i; }
    if (my < 0.6 * top) return; const key = S[bi].f + '|' + S[bi].c; if (!g.has(key)) g.set(key, [mi(S[bi].f), mi(S[bi].c), []]); g.get(key)[2].push([j, pc(my / top)]); });
  if (!g.size) continue; const [k, v] = id.split('|'); (bl[k] ||= {})[v] = [...g.values()].sort((a, b) => b[2].length - a[2].length); }
// ---- Combats Max (formulas of build/rank-max.mjs)
const bm = {}, bset = {}; // bset[k][ro] = { 'f|c': nombre de boss où ce moveset est le meilleur de la forme (top 5) }
M.bosses.forEach((b, j) => { const r = M.res[b.key], ids = Object.keys(r), mx = k => Math.max(...ids.map(i => r[i][k])) || 1, m = { Th: mx('Th'), Tm: mx('Tm'), Ta: mx('Ta'), Hh: mx('Hh'), Hs: mx('Hs') };
  const sc = ids.map(i => { const x = r[i]; return [+i, { A: x.A, T: 0.6 * x.Tm / m.Tm + 0.2 * x.Th / m.Th + 0.2 * x.Ta / m.Ta, H: 0.7 * x.Hh / m.Hh + 0.3 * x.Hs / m.Hs }]; });
  for (const ro of 'ATH') { const best = new Map(); for (const [i, v] of sc) { const k = M.sets[i].k, o = best.get(k); if (!o || v[ro] > o) best.set(k, v[ro]); }
    const bi = new Map(); for (const [i, v] of sc) { const k = M.sets[i].k; if (v[ro] === best.get(k) && !bi.has(k)) bi.set(k, i); }
    const L = [...best.entries()].sort((a, b) => b[1] - a[1]), top = L[0][1] || 1;
    L.forEach(([k, v], pos) => { if (pos < 5) { const s = M.sets[bi.get(k)], o = ((bset[k] ||= {})[ro] ||= {}); o[s.f + '|' + s.c] = (o[s.f + '|' + s.c] || 0) + 1; }
      if (v / top < 0.6) return; const s = M.sets[bi.get(k)], g = ((bm[k] ||= {})[ro] ||= new Map()), key = s.f + '|' + s.c; if (!g.has(key)) g.set(key, [mi(s.f), mi(s.c), []]); g.get(key)[2].push([j, pc(v / top), pos + 1]); }); } });
// v60.7 : chaque boss sous le moveset de la forme qui est le meilleur contre lui ; le plus utilisé d'abord.
for (const k in bm) for (const ro in bm[k]) bm[k][ro] = [...bm[k][ro].values()].sort((a, b) => b[2].length - a[2].length);
const out = JSON.parse(fs.readFileSync(OUT));
// v60.7 : « parmi les 5 meilleurs contre n des N boss » recalculé sur la simulation actuelle (n = boss où la forme est dans les 5 premiers du rôle ; N = boss testés).
// Moveset affiché inchangé quand la forme en avait déjà un ; sinon, celui qui est le plus souvent son meilleur parmi ces boss.
const mx = out.mx || {};
for (const k of new Set([...Object.keys(mx), ...Object.keys(bset)])) for (const ro of 'ATH') { const n = (bm[k]?.[ro] || []).flatMap(g => g[2]).filter(x => x[2] <= 5).length, cur = mx[k]?.[ro];
  if (cur) cur[2] = n; else if (n) { const [f, c] = Object.entries(bset[k][ro]).sort((a, b) => b[1] - a[1])[0][0].split('|'); ((mx[k] ||= {}).A ||= [[], [], 0], mx[k].T ||= [[], [], 0], mx[k].H ||= [[], [], 0]); mx[k][ro] = [[f], [c], n]; } }
out.mx = mx; out.mxb = RM.nb;
Object.assign(out, { mvk, rb: RR.B.map(b => [b[0], b[1], b[2]]), bl, mb: RM.B.map(b => [b[0], b[1], b[2]]), bm });
fs.writeFileSync(OUT, JSON.stringify(out));
console.log('raid-moves.json', JSON.stringify(out).length, 'octets ; raids', Object.keys(bl).length, 'formes ; Max', Object.keys(bm).length, 'formes');
