// v60.4: checks docs/sim.js (on-device port) against the precomputed simulations, attacker at level 40, IV 15/15/15, best moveset.
// node build/check-sim.mjs <raid data-final.json> <max sim.json> [raid boss keys,…] [max boss keys,…]
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm';
const R = path.join(path.dirname(new URL(import.meta.url).pathname), '..'), D = R + '/docs/data';
vm.runInThisContext(fs.readFileSync(D + '/../sim.js', 'utf8')); const S = globalThis.PKSIM; S.setMoves(JSON.parse(fs.readFileSync(D + '/go.json')).moves);
const spc = {}, sp = k => (spc[parseInt(k)] ??= JSON.parse(fs.readFileSync(`${D}/sp/${parseInt(k)}.json`))).f[k];
const rr = JSON.parse(fs.readFileSync(D + '/rank-raid.json')), rm = JSON.parse(fs.readFileSync(D + '/rank-max.json'));
const [raidF, maxF, rb = '', mb = ''] = process.argv.slice(2);
const rankOf = m => { const L = [...m.entries()].sort((a, b) => b[1] - a[1]); return new Map(L.map(([k, v], i) => [k, [i + 1, v / L[0][1]]])); };
const report = (name, ref, mine) => { const A = rankOf(ref), B = rankOf(mine); let dmax = 0, rk = 0, same20 = 0; const top = [...A.entries()].filter(([, [r]]) => r <= 20);
  for (const [k, [r, p]] of A) { const q = B.get(k); dmax = Math.max(dmax, Math.abs(p - q[1]) * 100); if (r <= 80) rk = Math.max(rk, Math.abs(r - q[0])); }
  for (const [k] of top) if (B.get(k)[0] <= 20) same20++;
  console.log(`${name.padEnd(34)} formes ${String(A.size).padStart(4)} · écart max ${dmax.toFixed(3)} pt de % · écart de rang max (top 80) ${rk} · top 20 identique ${same20}/20`); return [dmax, rk]; };
if (raidF) { const d = JSON.parse(fs.readFileSync(raidF)); const keys = rb ? rb.split(',') : ['150-mega-x', '384', '483-origin', '889', '249#s', '382-primal', '800-dusk', '646-black', '150#s'];
  let ws = 0, wr = 0, sd = 0, n = 0;
  for (const bk of keys) { const sh = bk.endsWith('#s') ? 1 : 0, k0 = bk.replace('#s', ''), j = d.bosses.findIndex((b, i) => b.k === k0 && rr.BS[i][5] === sh); if (j < 0) { console.log('boss absent', bk); continue; } const b = d.bosses[j], bs = rr.BS[j];
    const B = { a: bs[0], d: bs[1], t: b.t, fm: bs[2], cm: bs[3], cpm: bs[4], shadow: !!bs[5] };
    for (const pool of ['n', 's']) { const ref = new Map(), mine = new Map();
      d.sets.forEach((s, i) => { if (pool === 'n' && s.kind === 's') return; const id = s.k + '|' + (s.kind === 's' ? 1 : 0), g = sp(s.k).go;
        const v = S.raidScore({ a: g.a, d: g.d, s: g.s, t: rr.TY[s.k] || g.t, f: s.f, c: s.c, sh: s.kind === 's' }, B);
        sd = Math.max(sd, Math.abs(v - b.sc[i][0])); n++;
        if (!(ref.get(id) >= b.sc[i][0])) ref.set(id, b.sc[i][0]); if (!(mine.get(id) >= v)) mine.set(id, v); });
      const [a, r] = report(`raid ${b.n}${rr.BS[j][5] && !/obscur/i.test(b.n) ? ' obscur' : ''} (${pool === 'n' ? 'sans' : 'avec'} obscurs)`, ref, mine); ws = Math.max(ws, a); wr = Math.max(wr, r); } }
  console.log(`RAID : ${n} movesets recalculés, écart max de score brut ${sd.toFixed(4)} (référence arrondie à 0,001), écart max ${ws.toFixed(3)} pt de %, écart de rang max ${wr}`); }
if (maxF) { const X = JSON.parse(fs.readFileSync(maxF)); const keys = mb ? mb.split(',') : ['6-gmax', '890-eternamax', '144', '149', '812-gmax', '888', '68-gmax', '94-gmax'];
  let wr = 0, ws = 0, n = 0, rd = 0;
  for (const bk of keys) { const j = X.bosses.findIndex(b => b.key === bk); if (j < 0) { console.log('boss absent', bk); continue; } const b = X.bosses[j], bs = rm.BS[j];
    const B = { a: bs[0], d: bs[1], t: b.t, hp: bs[2], cpm: bs[3], atkMult: bs[4], meMult: bs[5], rate: bs[6], limit: bs[7], enrageAt: bs[8], enrage: bs[9], moves: bs[10] }, N = rm.NM[j];
    const ref = { A: new Map(), T: new Map(), H: new Map() }, mine = { A: new Map(), T: new Map(), H: new Map() }, res = X.res[bk];
    for (const i of Object.keys(res)) { const s = X.sets[+i], g = sp(s.k)?.go || JSON.parse(fs.readFileSync(R + '/build/max-bosses.json')).inline[s.k];
      const r = S.maxEval({ a: g.a, d: g.d, s: g.s, t: g.t, f: s.f, c: s.c, k: s.k }, B); n++;
      for (const k of ['A', 'Tm', 'Ta', 'Hh', 'Hs', 'Th']) rd = Math.max(rd, Math.abs(r[k] - res[i][k]) / Math.max(1, Math.abs(res[i][k])));
      const v0 = S.maxRoles(res[i], N), v1 = S.maxRoles(r, N);
      for (const ro of 'ATH') { if (!(ref[ro].get(s.k) >= v0[ro])) ref[ro].set(s.k, v0[ro]); if (!(mine[ro].get(s.k) >= v1[ro])) mine[ro].set(s.k, v1[ro]); } }
    for (const ro of 'ATH') { const [a, r] = report(`max ${b.fr} — ${ro}`, ref[ro], mine[ro]); ws = Math.max(ws, a); wr = Math.max(wr, r); } }
  console.log(`MAX : ${n} movesets recalculés, écart relatif max des mesures brutes ${(rd * 100).toFixed(4)} %, écart max ${ws.toFixed(3)} pt de %, écart de rang max ${wr}`); }
