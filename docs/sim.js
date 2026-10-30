// v60.4: on-device port of the raid v2 simulation (build/raid-moves-v2-full.mjs, PATCH=1, RUNS=40, DOWN=3.5) and of the Combats Max v1 simulation
// (build/max-sim.mjs, pT=0.5, runs=4), generalised to one real specimen: its level (CPM), its IVs, Obscur (Att ×1,2 / Déf ×5/6), its moves and its Max move levels.
// Same constants, same seeded RNG, same formulas: with level 40, IV 15/15/15 and level-3 Max moves it gives the precomputed scores (checked by build/check-sim.mjs).
(function (G) {
  'use strict';
  const STAB = 1.2, SE = 1.6, NVE = 0.625, IMM = 0.390625;
  const C = {normal:{n:'rock steel',i:'ghost'},fire:{s:'grass ice bug steel',n:'fire water rock dragon'},water:{s:'fire ground rock',n:'water grass dragon'},electric:{s:'water flying',n:'electric grass dragon',i:'ground'},grass:{s:'water ground rock',n:'fire grass poison flying bug dragon steel'},ice:{s:'grass ground flying dragon',n:'fire water ice steel'},fighting:{s:'normal ice rock dark steel',n:'poison flying psychic bug fairy',i:'ghost'},poison:{s:'grass fairy',n:'poison ground rock ghost',i:'steel'},ground:{s:'fire electric poison rock steel',n:'grass bug',i:'flying'},flying:{s:'grass fighting bug',n:'electric rock steel'},psychic:{s:'fighting poison',n:'psychic steel',i:'dark'},bug:{s:'grass psychic dark',n:'fire fighting poison flying ghost steel fairy'},rock:{s:'fire ice flying bug',n:'fighting ground steel'},ghost:{s:'psychic ghost',n:'dark',i:'normal'},dragon:{s:'dragon',n:'steel',i:'fairy'},dark:{s:'psychic ghost',n:'fighting dark fairy'},steel:{s:'ice rock fairy',n:'fire water electric steel'},fairy:{s:'fighting dragon dark',n:'fire poison steel'}};
  const eff = (mt, dT) => dT.reduce((m, t) => m * ((C[mt].s || '').split(' ').includes(t) ? SE : (C[mt].i || '').split(' ').includes(t) ? IMM : (C[mt].n || '').split(' ').includes(t) ? NVE : 1), 1);
  const dmg = (P, atk, def, stab, e) => Math.floor(0.5 * P * atk / def * stab * e) + 1;
  // CP multipliers, levels 1 → 55 by half levels (index = (level − 1) × 2); levels 40 and 50 use the rounded values of the simulations
  const CPMS = [0.0939999967813491,0.135137430784308,0.166397869586944,0.192650914456886,0.215732470154762,0.236572655026622,0.255720049142837,0.273530381100769,0.29024988412857,0.306057381335773,0.321087598800659,0.335445032295077,0.349212676286697,0.36245774877879,0.375235587358474,0.387592411085168,0.399567276239395,0.41119354951725,0.422500014305114,0.432926413410414,0.443107545375824,0.453059953871985,0.46279838681221,0.472336077786704,0.481684952974319,0.490855810259008,0.499858438968658,0.508701756943992,0.517393946647644,0.525942508771329,0.534354329109191,0.542635762230353,0.550792694091796,0.558830599438087,0.566754519939422,0.574569148039264,0.582278907299041,0.589887911977272,0.59740000963211,0.604823657502073,0.61215728521347,0.61940411056605,0.626567125320434,0.633649181622743,0.640652954578399,0.647580963301656,0.654435634613037,0.661219263506722,0.667934000492096,0.674581899290818,0.681164920330047,0.687684905887771,0.694143652915954,0.700542893277978,0.706884205341339,0.713169102333341,0.719399094581604,0.725575616972598,0.731700003147125,0.734741011137376,0.737769484519958,0.740785574597326,0.743789434432983,0.746781208702482,0.749761044979095,0.752729105305821,0.75568550825119,0.758630366519684,0.761563837528228,0.764486065255226,0.767397165298461,0.77029727397159,0.77318650484085,0.776064945942412,0.778932750225067,0.781790064808426,0.784636974334716,0.787473583646825,0.7903,0.792803950958807,0.795300006866455,0.79780392148697,0.800300002098083,0.802803892322847,0.805299997329711,0.807803863460723,0.81029999256134,0.812803834895026,0.815299987792968,0.817803806620319,0.820299983024597,0.822803778631297,0.825299978256225,0.827803750922782,0.830299973487854,0.832803753381377,0.835300028324127,0.837803755931569,0.8403];
  const cpm = lv => CPMS[Math.round(((lv || 40) - 1) * 2)] || 0.7903;
  const cp = (g, iv, lv) => { const m = cpm(lv); return Math.max(10, Math.floor((g.a + iv[0]) * Math.sqrt(g.d + iv[1]) * Math.sqrt(g.s + iv[2]) * m * m / 10)); };
  let M = {}; let seed = 1; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  // ---------- Raid v2 ----------
  const R_DELAY = [1.5, 2.5], R_CHP = 0.5, R_RUNS = 40, R_DOWN = 3.5;
  // a: { a, d, s, t, f, c, sh, lv, iv:[a,d,s], pp } — pp (v60.5): Méga level multiplier of a « + » charged move's power (default 1) ; bo: { t, atk, def }
  function rsim(a, bo, f, c) {
    const m = cpm(a.lv), iv = a.iv || [15, 15, 15];
    const aAtk = (a.a + iv[0]) * m * (a.sh ? 1.2 : 1), aDef = (a.d + iv[1]) * m * (a.sh ? 5 / 6 : 1), aHP = Math.floor((a.s + iv[2]) * m);
    const af = dmg(M[a.f][2], aAtk, bo.def, a.t.includes(M[a.f][1]) ? STAB : 1, eff(M[a.f][1], bo.t)), ac = dmg(M[a.c][2] * (a.pp && /_PLUS$/.test(a.c) ? a.pp : 1), aAtk, bo.def, a.t.includes(M[a.c][1]) ? STAB : 1, eff(M[a.c][1], bo.t));
    const bf = dmg(M[f][2], bo.atk, aDef, bo.t.includes(M[f][1]) ? STAB : 1, eff(M[f][1], a.t)), bc = dmg(M[c][2], bo.atk, aDef, bo.t.includes(M[c][1]) ? STAB : 1, eff(M[c][1], a.t));
    let hp = aHP, e = 0, t = 0, tdo = 0, be = 0, bt = 0;
    const bossNext = () => { const ch = be >= M[c][3] && rnd() < R_CHP; const k = ch ? c : f; bt += M[k][4] / 1000 + R_DELAY[0] + rnd() * (R_DELAY[1] - R_DELAY[0]); return ch; };
    let bCh = bossNext();
    for (;;) { const ch = e >= M[a.c][3], end = t + M[ch ? a.c : a.f][4] / 1000;
      while (bt <= end) { const d = bCh ? bc : bf; hp -= d; e = Math.min(100, e + Math.ceil(d * 0.5)); be = bCh ? be - M[c][3] : Math.min(100, be + M[f][3]);
        if (hp <= 0) return { t: bt, tdo }; bCh = bossNext(); }
      t = end; if (ch) { tdo += ac; e -= M[a.c][3]; } else { tdo += af; e = Math.min(100, e + M[a.f][3]); }
      be = Math.min(100, be + Math.ceil((ch ? ac : af) * 0.5)); }
  }
  const rphase = (a, B, st) => { let T = 0, Dm = 0; for (const f of B.fm) for (const c of B.cm) { seed = 7; for (let i = 0; i < R_RUNS; i++) { const r = rsim(a, st, f, c); T += r.t + R_DOWN; Dm += r.tdo; } } const n = B.fm.length * B.cm.length * R_RUNS; return { dps: Dm / T, tdo: Dm / n }; };
  // B: { a, d, t, fm, cm, cpm, shadow } → ∛(DPS³ × TDO)
  function raidScore(a, B) {
    if (!M[a.f] || !M[a.c]) return 0;
    const n = rphase(a, B, { t: B.t, atk: (B.a + 15) * B.cpm, def: (B.d + 15) * B.cpm }); if (!B.shadow) return Math.cbrt(n.dps ** 3 * n.tdo);
    const e = rphase(a, B, { t: B.t, atk: (1.81 * B.a + 15) * B.cpm, def: (3 * B.d + 15) * B.cpm });
    const dps = 1 / (0.55 / n.dps + 0.45 / e.dps), tdo = 0.55 * n.tdo + 0.45 * e.tdo; return Math.cbrt(dps ** 3 * tdo);
  }
  // ---------- Combats Max v1 ----------
  const ORB = 10, ORB_EVERY = 15, PHASE_S = 9, SWITCH_S = 1, TICK = 0.5, GUARD_LAYERS = 3, PT = 0.5, X_RUNS = 4;
  const GMAX_TYPE = { '3-gmax':'grass','6-gmax':'fire','9-gmax':'water','12-gmax':'bug','25-gmax':'electric','52-gmax':'normal','68-gmax':'fighting','94-gmax':'ghost','99-gmax':'water','131-gmax':'ice','143-gmax':'normal','569-gmax':'poison','812-gmax':'grass','815-gmax':'fire','818-gmax':'water','849-amped-gmax':'electric','861-gmax':'dark' };
  const maxKind = k => GMAX_TYPE[k] ? 'gmax' : /^88[89]-crowned$/.test(k) ? 'crowned' : k === '890' ? 'eter' : 'dmax';
  // Max move levels 1–3: Max Attack 250/300/350, G-Max (and Éthernatos) 350/400/450, Gardomax 20/40/60, Régémax 8/12/16 % of max HP
  const maxParams = (k, f, ml) => { const kind = maxKind(k), l = ml || [3, 3, 3];
    return { mt: kind === 'gmax' ? GMAX_TYPE[k] : kind === 'crowned' ? 'steel' : kind === 'eter' ? 'dragon' : f === 'HIDDEN_POWER_FAST' ? 'normal' : M[f][1],
      mp: (kind === 'gmax' || kind === 'eter' ? [350, 400, 450] : [250, 300, 350])[l[0] - 1], guard: [20, 40, 60][l[1] - 1], spirit: [0.08, 0.12, 0.16][l[2] - 1], shield0: k === '889-crowned' }; };
  // s: { a, d, s, t, f, c, k, lv, iv, ml } ; B: { a, d, t, hp, cpm, atkMult, meMult, rate, limit, enrageAt, enrage, moves }
  function battle(s, x, B, mT, mS) {
    const m = cpm(s.lv), iv = s.iv || [15, 15, 15], atk = (s.a + iv[0]) * m, def = (s.d + iv[1]) * m, hp0 = Math.floor((s.s + iv[2]) * m), GUARD = x.guard, SPIRIT = x.spirit;
    const bAtk = (B.a + 15) * B.cpm * B.atkMult, bDef = (B.d + 15) * B.cpm;
    const st = mv => s.t.includes(M[mv][1]) ? STAB : 1, bst = mv => B.t.includes(M[mv][1]) ? STAB : 1;
    const df = dmg(M[s.f][2], atk, bDef, st(s.f), eff(M[s.f][1], B.t)), dc = dmg(M[s.c][2], atk, bDef, st(s.c), eff(M[s.c][1], B.t));
    const dmax = dmg(x.mp, atk, bDef, s.t.includes(x.mt) ? STAB : 1, eff(x.mt, B.t));
    const dT = dmg(M[mT][2], bAtk, def, bst(mT), eff(M[mT][1], s.t)) * 2, dS = dmg(M[mS][2], bAtk, def, bst(mS), eff(M[mS][1], s.t));
    const charge = d => Math.max(1, Math.floor(d / B.hp * 200 * B.meMult * 100) / 100);
    const sh0 = x.shield0 ? GUARD : 0;
    const P = [0, 1, 2, 3].map(i => ({ role: i < 2 ? 'A' : i === 2 ? 'T' : 'H', left: 3, hp: hp0, e: 0, sh: sh0, next: 0, out: false, dmg: 0, meter: 0, absorb: 0, heal: 0, alive: 0 }));
    let bhp = B.hp, meter = 0, t = 0, nb = B.rate, orb = ORB_EVERY;
    const hit = (p, d) => { if (p.out || p.next > t + 50) return; const a = Math.min(p.sh, d); p.sh -= a; p.absorb += a; d -= a; p.hp -= d; p.e = Math.min(100, p.e + Math.ceil(d * 0.5));
      if (p.hp <= 0) { p.left--; if (p.left <= 0) { p.out = true; p.alive = t; } else { p.hp = hp0; p.e = 0; p.sh = sh0; p.next = t + SWITCH_S; } } };
    while (t < B.limit) {
      const live = P.filter(p => !p.out); if (!live.length) break;
      for (const p of live) if (t >= p.next) { const ch = p.e >= M[s.c][3], d = ch ? dc : df; if (ch) p.e -= M[s.c][3]; else p.e = Math.min(100, p.e + M[s.f][3]);
        bhp -= d; p.dmg += d; const cg = charge(d); meter += cg; p.meter += cg; p.next = t + M[ch ? s.c : s.f][4] / 1000; }
      if (t >= orb) { meter += ORB; orb += ORB_EVERY; }
      if (meter >= 100) { const L = P.filter(p => !p.out);
        for (const p of L) for (let i = 0; i < 3; i++) {
          if (p.role === 'A') { bhp -= dmax; p.dmg += dmax; }
          else if (p.role === 'T') p.sh = Math.min(GUARD * GUARD_LAYERS, p.sh + GUARD);
          else for (const q of L) { const h = Math.min(hp0 - q.hp, Math.floor(hp0 * SPIRIT)); q.hp += h; p.heal += h; } }
        meter = 0; t += PHASE_S; nb = t + B.rate; for (const p of L) p.next = Math.max(p.next, t); continue; }
      if (t >= nb) { const mult = t >= B.enrageAt ? B.enrage : 1, L = P.filter(p => !p.out);
        if (rnd() < PT) { const sh = L.filter(p => p.sh > 0), pool = sh.length ? sh : L; hit(pool[Math.floor(rnd() * pool.length)], dT * mult); }
        else for (const p of L) hit(p, dS * mult);
        nb += B.rate; }
      t += TICK;
    }
    for (const p of P) if (!p.out) p.alive = t;
    return { Th: hp0 / (PT * dT + (1 - PT) * dS), A: (P[0].dmg + P[1].dmg) / 2, Tm: P[2].meter, Ta: P[2].absorb, Hh: P[3].heal, Hs: P[3].alive };
  }
  function maxEval(s, B) {
    if (!M[s.f] || !M[s.c]) return null; const x = maxParams(s.k, s.f, s.ml);
    const acc = { Th: 0, A: 0, Tm: 0, Ta: 0, Hh: 0, Hs: 0 }; let n = 0;
    const mv = B.moves.length > 1 ? B.moves : [B.moves[0], B.moves[0]];
    for (const a of mv) for (const b of mv) { if (a === b && mv.length > 1) continue; seed = 11;
      for (let i = 0; i < X_RUNS; i++) { const r = battle(s, x, B, a, b); for (const k in acc) acc[k] += r[k]; n++; } }
    for (const k in acc) acc[k] /= n; return acc;
  }
  // role scores as in build/rank-max.mjs; N = per-boss maxima over all precomputed movesets { Th, Tm, Ta, Hh, Hs }
  const maxRoles = (r, N) => ({ A: r.A, T: 0.6 * r.Tm / N.Tm + 0.2 * r.Th / N.Th + 0.2 * r.Ta / N.Ta, H: 0.7 * r.Hh / N.Hh + 0.3 * r.Hs / N.Hs });
  G.PKSIM = { setMoves: m => { M = m; }, cpm, cp, raidScore, maxEval, maxRoles, maxKind, GMAX_TYPE };
})(typeof window !== 'undefined' ? window : globalThis);
