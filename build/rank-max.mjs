// v59: « Classements » tab, Combats Max → docs/data/rank-max.json, from the Max v1 simulation (screenshots/max-v1/final/sim-p50-l40.json, kept locally — not versioned).
// Roles: A = damage; T = 0.6 meter + 0.2 staying power + 0.2 Gardomax shield absorbed; H = 0.7 healing + 0.3 survival (same as build/max-report.mjs).
// No averages: per boss and role, each form keeps its best moveset; % = its score / best form's score. Global: 1) bosses where n° 1, 2) bosses where useful (≥ 60 %), 3) best %.
// Output: { date, src, nb, mv: [moveKey], F: [formKey], B: [[bossKey, name, tier, types]], R: { A|T|H: { b: [[[f, mf, mc, pct] …top 20] per boss], g: [[f, mf, mc, n1, nu, best] …top 60] } } }
// v60.4: R.A|T|H.x = per boss, ranks 21–60 (≥ 30 % of the best), same row format, used on the device to build the teams of 3.
// Usage: node rank-max.mjs [path/to/sim.json]
import fs from 'node:fs'; import path from 'node:path';
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const S = JSON.parse(fs.readFileSync(process.argv[2] || path.join(ROOT, 'screenshots/max-v1/final/sim-p50-l40.json'))), USE = 0.6;
const mvI = {}, mv = [], mi = k => mvI[k] ??= mv.push(k) - 1, fI = {}, F = [], fi = k => fI[k] ??= F.push(k) - 1, pct = x => Math.round(x * 1000) / 10;
const NM = []; // v60.4: per-boss normalisation maxima, for the on-device recalculation (docs/sim.js)
function scores(bk) { const r = S.res[bk], ids = Object.keys(r), mx = k => Math.max(...ids.map(i => r[i][k])) || 1;
  const m = { Th: mx('Th'), Tm: mx('Tm'), Ta: mx('Ta'), Hh: mx('Hh'), Hs: mx('Hs') }; NM.push(m);
  return ids.map(i => { const x = r[i]; return [+i, { A: x.A, T: 0.6 * x.Tm / m.Tm + 0.2 * x.Th / m.Th + 0.2 * x.Ta / m.Ta, H: 0.7 * x.Hh / m.Hh + 0.3 * x.Hs / m.Hs }]; }); }
const SC = S.bosses.map(b => scores(b.key)), R = {};
for (const ro of 'ATH') {
  const per = SC.map(sc => { const best = new Map(); for (const [i, v] of sc) { const k = S.sets[i].k, o = best.get(k); if (!o || v[ro] > o[1]) best.set(k, [i, v[ro]]); }
    const L = [...best.entries()].sort((a, b) => b[1][1] - a[1][1]), top = L[0][1][1] || 1; return L.map(([k, [i, v]]) => [k, i, v / top]); });
  const A = new Map(); per.forEach(L => L.forEach(([k, i, r], pos) => { if (r < USE) return; const a = A.get(k) || { n1: 0, nu: 0, best: 0, sets: {} }; if (pos === 0) a.n1++; a.nu++; a.best = Math.max(a.best, r); a.sets[i] = (a.sets[i] || 0) + (pos === 0 ? 1000 : 0) + r; A.set(k, a); }));
  const g = [...A.entries()].sort((x, y) => y[1].n1 - x[1].n1 || y[1].nu - x[1].nu || y[1].best - x[1].best).slice(0, 60).map(([k, a]) => { const s = S.sets[+Object.entries(a.sets).sort((x, y) => y[1] - x[1])[0][0]]; return [fi(k), mi(s.f), mi(s.c), a.n1, a.nu, pct(a.best)]; });
  const row = ([k, i, r]) => [fi(k), mi(S.sets[i].f), mi(S.sets[i].c), pct(r)];
  per.forEach((L, j) => { NM[j][ro] = Math.max(...SC[j].map(([, v]) => v[ro])); });
  R[ro] = { b: per.map(L => L.slice(0, 20).map(row)), x: per.map(L => L.slice(20, 60).filter(([, , r]) => r >= 0.3).map(row)), g };
}
const PM = JSON.parse(fs.readFileSync(path.join(ROOT, 'build/go-moves-patch.json'))), MB = JSON.parse(fs.readFileSync(path.join(ROOT, 'build/max-bosses.json')));
const goOf = k => { if (MB.inline[k]) return MB.inline[k]; const g = JSON.parse(fs.readFileSync(`${ROOT}/docs/data/sp/${parseInt(k)}.json`)).f[k].go, p = PM.movepool[k]; if (!p) return g;
  const o = { ...g }; for (const f of ['fm', 'cm', 'fe', 'ce']) if (p[f]) o[f] = [...new Set([...(g[f] || []), ...p[f]])]; return o; };
const BS = S.bosses.map(sb => { const b = MB.bosses.find(x => x.key === sb.key), g = goOf(b.key); return [g.a, g.d, b.hp, b.cpm, b.atkMult, b.meMult, b.rate, b.limit, b.enrageAt, b.enrage, sb.moves]; });
const out = { date: '2026-10-28', src: 'Simulation Combats Max v1 (niveau 40, Gardomax et Régémax niveau 3, sans esquive)', nb: S.bosses.length, mv, F, B: S.bosses.map(b => [b.key, b.fr, b.tier, b.t]), R, BS, NM: NM.map(m => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, +v.toPrecision(6)]))) };
fs.writeFileSync(path.join(ROOT, 'docs/data/rank-max.json'), JSON.stringify(out));
console.log('rank-max.json', JSON.stringify(out).length, 'octets');
for (const ro of 'ATH') console.log(ro, 'global', R[ro].g.slice(0, 5).map(r => F[r[0]] + ' ' + r[3] + '/' + r[4] + ' ' + r[5]).join(', '));
