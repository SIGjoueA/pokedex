// v60 (aperçu) : « Classements » → onglet Team GO Rocket → docs/data/rank-rocket.json. Giovanni + 3 Leaders seulement (sbires ignorés).
// Équipes : build/rocket-lineups.json (source Leek Duck « Rocket Lineups » maj 2 oct. 2026, recoupée RotomLabs + Pokémon GO Hub / PokeDaily ; valable jusqu'au 1er déc. 2026).
// Combat : moteur JcJ (tours de 0,5 s, attaques JcJ de pvp-moves.json : [puissance, énergie, tours]), dégâts = ⌊0,5 × P × Att/Déf × STAB × efficacité × 1,3⌋ + 1, énergie plafonnée à 100.
// Adversaire Rocket : calé sur la simulation Rocket de Pokebattler (fight.pokebattler.com rankingJobs /rocket/…, oct. 2026 : IV et CP affichés par adversaire) —
//   Att = (baseAtt + ⌊2/3·baseAtt + 24⌋)·C, Déf = (baseDéf + 14)·C, PV ≈ ⌊0,6·(basePV + 15)⌋·H ; C = 1,215 / H = 1,05 (Giovanni), C = 1,1255 / H = 1 (Leader)
//   (C déduit des CP Pokebattler : Persian 4796, Zekrom 11 500, Tyranocif 9103) ; pas de bonus Obscur ajouté (Pokebattler n'en ajoute pas). Plus d'ATT_SCALE.
//   Il a 2 boucliers pour tout le combat, supposés grillés sur son 1er Pokémon (emplacement 1 : 2 boucliers, emplacements 2-3 : 0) ; il lance son attaque chargée dès qu'il a l'énergie. Ses attaques possibles : toutes ses attaques non exclusives ;
//   on garde le PIRE cas pour le contre (moveset adverse le plus gênant).
// Contre : niveau 40, IV 15/15/15, Obscur ×1,2 Att / ×5/6 Déf, ni Méga ni Primo (interdites en combat de Dresseurs), PSH boucliers joueur (défaut 1 = réglage SHIELD_1 de Pokebattler ; le joueur en a 2 pour toute l'équipe), deux attaques chargées (appât sur boucliers adverses, puis la plus rentable).
// Score d'un contre = (part des PV adverses retirés) ÷ (part de ses propres PV perdus) : > 1 = il gagne le duel ; 2 = il pourrait en battre deux comme lui.
// Sans moyenne : par adversaire, % = score / meilleur score ; par chef : 1) nb d'adversaires où n° 1, 2) nb où utile (≥ 60 %), 3) meilleur %.
// Usage : node rank-rocket.mjs   (lecture seule de docs/data sauf l'écriture de docs/data/rank-rocket.json)
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { BATTLE_ONLY } from './battle.mjs';
const R = path.join(path.dirname(new URL(import.meta.url).pathname), '..'), D = R + '/docs/data';
const PM = JSON.parse(fs.readFileSync(D + '/pvp-moves.json')).m, GM = JSON.parse(fs.readFileSync(D + '/go.json')).moves;
const SPC = {}; const sp = n => SPC[n] ??= JSON.parse(fs.readFileSync(`${D}/sp/${n}.json`)); const go = k => sp(parseInt(k)).f[k].go, fname = k => sp(parseInt(k)).f[k].n;
const CPM40 = 0.7903, USE = 0.6, PSH = +(process.env.PSH ?? 1);
const C = {normal:{n:'rock steel',i:'ghost'},fire:{s:'grass ice bug steel',n:'fire water rock dragon'},water:{s:'fire ground rock',n:'water grass dragon'},electric:{s:'water flying',n:'electric grass dragon',i:'ground'},grass:{s:'water ground rock',n:'fire grass poison flying bug dragon steel'},ice:{s:'grass ground flying dragon',n:'fire water ice steel'},fighting:{s:'normal ice rock dark steel',n:'poison flying psychic bug fairy',i:'ghost'},poison:{s:'grass fairy',n:'poison ground rock ghost',i:'steel'},ground:{s:'fire electric poison rock steel',n:'grass bug',i:'flying'},flying:{s:'grass fighting bug',n:'electric rock steel'},psychic:{s:'fighting poison',n:'psychic steel',i:'dark'},bug:{s:'grass psychic dark',n:'fire fighting poison flying ghost steel fairy'},rock:{s:'fire ice flying bug',n:'fighting ground steel'},ghost:{s:'psychic ghost',n:'dark',i:'normal'},dragon:{s:'dragon',n:'steel',i:'fairy'},dark:{s:'psychic ghost',n:'fighting dark fairy'},steel:{s:'ice rock fairy',n:'fire water electric steel'},fairy:{s:'fighting dragon dark',n:'fire poison steel'}};
const eff = (mt, dT) => dT.reduce((m, t) => m * ((C[mt].s||'').split(' ').includes(t) ? 1.6 : (C[mt].i||'').split(' ').includes(t) ? 0.390625 : (C[mt].n||'').split(' ').includes(t) ? 0.625 : 1), 1);
const dmg = (m, atk, def, aT, dT) => Math.floor(0.5 * PM[m][0] * atk / def * (aT.includes(GM[m][1]) ? 1.2 : 1) * eff(GM[m][1], dT) * 1.3) + 1;
// duel : a = { atk, def, hp, t, f, c }, o = idem + sh (boucliers) → [part PV adverses retirés, part PV perdus]
function duel(a, o) {
  // a.c = [c1, c2?] ; politique : tant que l'adversaire a des boucliers → attaque chargée la moins chère (appât) ;
  // ensuite la plus forte si l'énergie suffit, sinon la moins chère si elle met K.O. ou si l'on risque d'être K.O. avant d'avoir l'énergie de la plus forte.
  const af = dmg(a.f, a.atk, o.def, a.t, o.t), of = dmg(o.f, o.atk, a.def, o.t, a.t), oc = dmg(o.c, o.atk, a.def, o.t, a.t);
  const AC = a.c.map(c => ({ e: PM[c][1], d: dmg(c, a.atk, o.def, a.t, o.t) })).sort((x, y) => x.e - y.e || y.d - x.d);
  const cheap = AC[0], big = AC.reduce((m, x) => x.d / x.e > m.d / m.e ? x : m, AC[0]);
  let ah = a.hp, oh = o.hp, ae = 0, oe = 0, acd = 0, ocd = 0, sh = o.sh, psh = PSH;
  const aT = PM[a.f][2], oT = PM[o.f][2], oC = PM[o.c][1], aG = PM[a.f][1], oG = PM[o.f][1];
  const pick = () => { if (ae < cheap.e) return null; if (sh > 0) return cheap; if (ae >= big.e) return big;
    if (cheap.d >= oh) return cheap; const tBig = Math.ceil((big.e - ae) / aG) * aT, tDie = Math.ceil(ah / of) * oT; return tDie <= tBig + 1 ? cheap : null; };
  for (let turn = 0; turn < 2000 && ah > 0 && oh > 0; turn++) {
    const order = a.atk >= o.atk ? [0, 1] : [1, 0];
    for (const s of order) { if (ah <= 0 || oh <= 0) break;
      if (s === 0 && acd === 0) { const m = pick(); if (m) { ae -= m.e; if (sh > 0) { sh--; oh -= 1; } else oh -= m.d; acd = -1; } }
      if (s === 1 && ocd === 0 && oe >= oC) { oe -= oC; if (psh > 0) { psh--; ah -= 1; } else ah -= oc; ocd = -1; } }
    if (ah <= 0 || oh <= 0) break;
    if (acd === -1) acd = 0; else { if (acd === 0) acd = aT; acd--; if (acd === 0) { oh -= af; ae = Math.min(100, ae + aG); } }
    if (ocd === -1) ocd = 0; else { if (ocd === 0) ocd = oT; ocd--; if (ocd === 0) { ah -= of; oe = Math.min(100, oe + oG); } }
  }
  return [Math.min(1, (o.hp - Math.max(0, oh)) / o.hp), Math.min(1, (a.hp - Math.max(0, ah)) / a.hp)];
}
const score = ([dealt, lost]) => dealt / Math.max(lost, 0.005);
// « Sans légendaires » : exclut légendaires et fabuleux (core.json lg / my), Ultra-Chimères (liste UB_IDS de app.js) et Paradoxes (liste codée ici, absente des données de l'app).
const CORE = JSON.parse(fs.readFileSync(D + '/core.json')).e, NOLEG = new Set([...CORE.filter(p => p.lg || p.my).map(p => p.id), 793, 794, 795, 796, 797, 798, 799, 803, 804, 805, 806, ...Array.from({ length: 12 }, (_, i) => 984 + i), 1005, 1006, 1007, 1008, 1009, 1010, 1020, 1021, 1022, 1023]);
const LU = JSON.parse(fs.readFileSync(R + '/build/rocket-lineups.json'));
function oppVariants(k, rank, si = 0) { const g = go(k), st = x => x * RCPM * rank;
  const C = rank > 1.1 ? 1.215 : 1.1255, H = rank > 1.1 ? 1.05 : 1; // calé sur Pokebattler (voir en-tête)
  const base = { t: g.t, atk: (g.a + Math.floor(2 / 3 * g.a + 24)) * C, def: (g.d + 14) * C, hp: Math.floor(Math.floor(0.6 * (g.s + 15)) * H), sh: si === 0 ? 2 : 0 }; // 2 boucliers pour TOUT le combat : en pratique grillés sur le 1er Pokémon
  const V = []; for (const f of g.fm || []) for (const c of g.cm || []) if (PM[f] && PM[c] && GM[f] && GM[c] && c !== 'FRUSTRATION' && c !== 'RETURN') V.push({ ...base, f, c }); return V; }
if (isMainThread) {
  const sets = []; for (const file of fs.readdirSync(D + '/sp')) { const F = JSON.parse(fs.readFileSync(D + '/sp/' + file)).f;
    for (const [k, v] of Object.entries(F)) { const g = v.go; if (!g || !g.a || /-(mega|primal|gmax)/.test(k) || BATTLE_ONLY[k] || !(g.fm || g.fe) || !(g.cm || g.ce)) continue;
      if (/-female$/.test(k)) { const m = F[k.replace(/-female$/, '')]?.go; if (m && m.a === g.a && m.d === g.d && m.s === g.s && String(m.t) === String(g.t) && String([m.fm, m.cm, m.fe, m.ce]) === String([g.fm, g.cm, g.fe, g.ce])) continue; } // même fiche que le mâle → fusion
      const CM = [...(g.cm||[]), ...(g.ce||[])].filter(c => c !== 'FRUSTRATION' && c !== 'RETURN' && PM[c] && GM[c]), PAIRS = CM.length < 2 ? CM.map(c => [c]) : CM.flatMap((c, i) => CM.slice(i + 1).map(d => [c, d]));
      for (const sh of g.shm ? [0, 1] : [0]) for (const f of [...(g.fm||[]), ...(g.fe||[])]) { if (!PM[f] || !GM[f]) continue; for (const c of PAIRS) sets.push({ k, sh, f, c }); } } }
  const opps = []; for (const L of LU.leaders) L.slots.forEach((sl, si) => sl.forEach(k => { if (!opps.find(o => o.id === L.id + '|' + k)) opps.push({ id: L.id + '|' + k, k, rank: L.rank, si }); }));
  console.error('sets', sets.length, 'adversaires', opps.length);
  if (process.env.SANITY) { // SANITY="68:COUNTER_FAST:DYNAMIC_PUNCH,CLOSE_COMBAT@giovanni|53;..." → duels détaillés (pire cas adverse)
    for (const q of process.env.SANITY.split(';')) { const [me, opp] = q.split('@'), [k, f, cs, shd] = me.split(':'), [lid, ok] = opp.split('|'), L = LU.leaders.find(x => x.id === lid);
      const g = go(k), x = shd ? 1.2 : 1, y = shd ? 5 / 6 : 1, a = { t: g.t, atk: (g.a + 15) * CPM40 * x, def: (g.d + 15) * CPM40 * y, hp: Math.floor((g.s + 15) * CPM40), f, c: cs.split(',') };
      const V = oppVariants(ok, L.rank, L.slots.findIndex(sl => sl.map(String).includes(ok))).map(v => [v, duel(a, v)]).sort((p, q2) => score(p[1]) - score(q2[1]));
      console.log(fname(k) + (shd ? ' Obscur' : ''), f, cs, 'vs', L.n, fname(ok), `PV ${a.hp} | adv Att ${V[0][0].atk.toFixed(0)} Déf ${V[0][0].def.toFixed(0)} PV ${V[0][0].hp}`);
      for (const [v, r] of V) console.log('   ', v.f, v.c, 'retiré', (r[0] * 100).toFixed(0) + '%', 'perdu', (r[1] * 100).toFixed(0) + '%', r[0] >= 1 ? 'GAGNE' : 'perd'); }
    process.exit(0); }
  const N = os.cpus().length, res = {};
  await Promise.all([...Array(N)].map((_, w) => new Promise(ok => { const mine = opps.filter((_, i) => i % N === w); if (!mine.length) return ok();
    const wk = new Worker(new URL(import.meta.url), { workerData: { sets, opps: mine } }); wk.on('message', m => { res[m.id] = m.sc; console.error('ok', m.id); }); wk.on('exit', ok); })));
  const mvI = {}, mv = [], mi = k => mvI[k] ??= mv.push(k) - 1, fI = {}, F = [], fi = (k, sh) => fI[k + '|' + sh] ??= F.push([k, sh]) - 1, pct = x => Math.round(x * 1000) / 10;
  const E = {}; const exOf = k => { const g = go(k); return [...(g.fe || []), ...(g.ce || [])]; };
  const per = id => { const sc = res[id], best = new Map(); sc.forEach((v, i) => { const s = sets[i], fk = s.k + '|' + s.sh, o = best.get(fk); if (!o || v > o[1]) best.set(fk, [i, v]); });
    const L = [...best.entries()].sort((a, b) => b[1][1] - a[1][1]), top = L[0][1][1]; return L.map(([fk, [i, v]]) => [fk, i, v / top, v]); };
  const row = ([, i, r, v]) => { const s = sets[i]; const ex = exOf(s.k).filter(m => m === s.f || s.c.includes(m)); if (ex.length) E[s.k] = [...new Set([...(E[s.k] || []), ...exOf(s.k)])]; return [fi(s.k, s.sh), mi(s.f), mi(s.c[0]), pct(r), Math.round(v * 100) / 100, s.c[1] ? mi(s.c[1]) : -1]; };
  if (process.env.DUMP) fs.writeFileSync(process.env.DUMP, JSON.stringify(Object.fromEntries(Object.keys(res).map(id => [id, per(id).slice(0, 10).map(x => x[0])]))));
  const out = { date: new Date().toISOString().slice(0, 10), src: LU.src, valid: LU.valid, upd: LU.upd, nb: 0, mv, F, E, L: [] };
  for (const L of LU.leaders) {
    const slots = L.slots.map(sl => sl.map(k => { const P = per(L.id + '|' + k); return { k, n: fname(k), t: go(k).t, top: P.slice(0, 10).map(row), P }; }));
    const A = new Map(); slots.flat().forEach(o => o.P.forEach(([fk, i, r], pos) => { if (r < USE) return; const a = A.get(fk) || { n1: 0, nu: 0, best: 0, sets: {} }; if (pos === 0) a.n1++; a.nu++; a.best = Math.max(a.best, r); a.sets[i] = (a.sets[i] || 0) + (pos === 0 ? 1000 : 0) + r; A.set(fk, a); }));
    const flat = slots.flat(), TOP = flat.map(o => o.P[0][3]), ids = flat.map(o => L.id + '|' + o.k);
    const cv = i => flat.map((o, j) => { const v = res[ids[j]][i], p = pct(v / TOP[j]); return [v >= 1 ? p : -p, Math.round(v * 100) / 100]; }); // [% du n° 1 (négatif = perdu), score brut : > 1 gagne, ≥ 2 = moins de 50 % de PV perdus]
    const okc = x => x >= USE * 100;
    const g = [...A.entries()].map(([fk, a]) => { const c = Object.keys(a.sets).map(Number).map(i => [i, cv(i)]).map(([i, c]) => [i, c, c.filter(x => okc(x[0])).length, c.reduce((t, x) => t + Math.max(0, x[0]), 0)]).sort((x, y) => y[2] - x[2] || y[3] - x[3])[0];
        return { fk, a, i: c[0], c: c[1], nu: c[2], n1: flat.filter(o => o.P[0][0] === fk).length, best: Math.max(...c[1].map(x => x[0])) }; })
      .sort((x, y) => y.nu - x.nu || y.n1 - x.n1 || y.best - x.best).slice(0, 20).map(o => { const s = sets[o.i]; row([0, o.i, 0, 0]); return [fi(s.k, s.sh), mi(s.f), mi(s.c[0]), o.n1, o.nu, o.best, s.c[1] ? mi(s.c[1]) : -1, o.c]; });
    // Équipe conseillée : par emplacement, le moveset qui maximise son PIRE score brut (PV retirés ÷ PV perdus, > 1 = gagne) sur les options de l'emplacement (puis la somme) ; pas deux fois la même espèce.
    const mkTeam = ok => { const used = new Set(); return slots.map(sl => { const sid = sl.map(o => L.id + '|' + o.k), top = sl.map(o => o.P[0][3]); let b = null;
      res[sid[0]].forEach((_, i) => { const k = String(sets[i].k), sp = k.split('-')[0]; if (used.has(sp) || !ok(k)) return; const c = sid.map(id => res[id][i]), w = Math.min(...c), t = c.reduce((x, y) => x + y, 0);
        if (!b || w > b.w || (w === b.w && t > b.t)) b = { i, w, t }; });
      const st = sets[b.i]; used.add(String(st.k).split('-')[0]); row([0, b.i, 0, 0]);
      return [fi(st.k, st.sh), mi(st.f), mi(st.c[0]), st.c[1] ? mi(st.c[1]) : -1, sid.map((id, j) => { const v = res[id][b.i], p = pct(v / top[j]); return [v >= 1 ? p : -p, Math.round(v * 100) / 100]; })]; }); };
    const team = mkTeam(() => true), team2 = mkTeam(k => !NOLEG.has(parseInt(k)));
    const nOpp = slots.flat().length; out.nb += nOpp;
    out.L.push({ id: L.id, n: L.n, role: L.role, catch: L.catch, catchNote: L.catchNote || '', nOpp, S: slots.map(sl => sl.map(o => [o.k, o.n, o.t, o.top])), g, team, team2 });
    console.log(L.n, 'top :', g.slice(0, 5).map(r => F[r[0]][0] + (F[r[0]][1] ? '(O)' : '') + ' ' + r[3] + '/' + r[4] + ' ' + r[5]).join(', '));
    for (const T of [team, team2]) console.log('  équipe :', T.map(r => F[r[0]][0] + (F[r[0]][1] ? '(O)' : '') + ' ' + mv[r[1]] + '/' + mv[r[2]] + (r[3] >= 0 ? '+' + mv[r[3]] : '') + ' [' + r[4].map(x => x[1]).join(' ') + ']').join(' | '));
    slots.flat().forEach(o => console.log('  ', o.n, o.top.slice(0, 4).map(r => F[r[0]][0] + (F[r[0]][1] ? '(O)' : '') + ' ' + mv[r[1]] + '/' + mv[r[2]] + (r[5] >= 0 ? '+' + mv[r[5]] : '') + ' ' + r[4]).join(' | ')));
  }
  if (!process.env.NOWRITE) fs.writeFileSync(D + '/rank-rocket.json', JSON.stringify(out)); console.log('rank-rocket.json', JSON.stringify(out).length, 'octets');
} else {
  const { sets, opps } = workerData, G = {};
  const me = s => { const g = G[s.k] ??= go(s.k), x = s.sh ? 1.2 : 1, y = s.sh ? 5 / 6 : 1; return { t: g.t, atk: (g.a + 15) * CPM40 * x, def: (g.d + 15) * CPM40 * y, hp: Math.floor((g.s + 15) * CPM40), f: s.f, c: s.c }; };
  const A = sets.map(me);
  for (const o of opps) { const V = oppVariants(o.k, o.rank, o.si); parentPort.postMessage({ id: o.id, sc: A.map(a => { let w = Infinity; for (const v of V) w = Math.min(w, score(duel(a, v))); return +w.toFixed(4); }) }); }
}
