// v55: recommended Raid / Gym moveset (PvE) per GO entry → docs/data/raid-moves.json, from GO game master move stats already in go.json.
// Comprehensive DPS (GamePress formula) vs a neutral target: fast/charged cycle + energy from damage taken (boss DPS y = 900/Def); STAB ×1.2; weather and dodges ignored.
// Damage per hit = floor(0.5 × power × Atk/Def × mult) + 1, Atk = (base+15)×CPM(40), target Def 180 (typical boss). Same Pokémon ⇒ TDO constant, so DPS³×TDO ranks like DPS.
// raid-moves.json = { date, ms: { entryKey: [[fast, charged, dps], [fast, charged, dps] (best without † moves, only if the best uses one)] } }
// Usage: node fetch-raid-moves.mjs (offline, reads docs/data)
import fs from 'node:fs'; import path from 'node:path';
const D = path.join(path.dirname(new URL(import.meta.url).pathname), '../docs/data');
const go = JSON.parse(fs.readFileSync(path.join(D, 'go.json'))), M = go.moves, CPM40 = 0.7903, DEF = 180;
const ms = {};
for (const f of fs.readdirSync(path.join(D, 'sp'))) {
  const sp = JSON.parse(fs.readFileSync(path.join(D, 'sp', f)));
  for (const [k, e] of Object.entries(sp.f || {})) {
    const d = e.go; if (!d || !d.a || !d.t) continue;
    const A = (d.a + 15) * CPM40, HP = (d.s + 15) * CPM40, Y = 900 / ((d.d + 15) * CPM40), hit = (key) => { const m = M[key]; return Math.floor(0.5 * m[2] * A / DEF * (d.t.includes(m[1]) ? 1.2 : 1)) + 1; };
    const combos = (fs_, cs) => { let best = null;
      for (const fk of fs_) { const F = M[fk]; if (!F || !F[4]) continue;
        for (const ck of cs) { const C = M[ck]; if (!C || !C[4] || !F[3]) continue;
          const fd = F[4] / 1000, cd = C[4] / 1000, FDPS = hit(fk) / fd, FEPS = F[3] / fd, CDPS = hit(ck) / cd, CEPS = C[3] / cd;
          const x = 0.5 * C[3] + 0.5 * F[3], dps = (FDPS * CEPS + CDPS * FEPS) / (CEPS + FEPS) + (CDPS - FDPS) / (CEPS + FEPS) * (0.5 - x / HP) * Y;
          if (!best || dps > best[2]) best = [fk, ck, Math.round(dps * 10) / 10]; } }
      return best; };
    const fa = [...(d.fm || []), ...(d.fe || [])], ca = [...(d.cm || []), ...(d.ce || [])];
    const b = combos(fa, ca); if (!b) continue;
    const el = (d.fe || []).includes(b[0]) || (d.ce || []).includes(b[1]);
    const r = [b]; if (el) { const n = combos(d.fm || [], d.cm || []); if (n) r.push(n); }
    ms[k] = r;
  }
}
fs.writeFileSync(path.join(D, 'raid-moves.json'), JSON.stringify({ date: new Date().toISOString().slice(0, 10), ms }));
console.log('raid-moves.json:', Object.keys(ms).length, 'entrées');
