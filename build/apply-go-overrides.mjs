// v28 Pokémon GO overrides: Megas released after the (frozen) pogoapi list + Gigamax forms (Max Battles). Idempotent.
// Run automatically at the end of build-data.mjs; can be re-run alone:  node apply-go-overrides.mjs
// Source of truth: build/go-overrides.json (manual, never written by the scripts). See README « Pokémon GO ».
//  - megaReleased.keys: sp f[k].go.r = 1 and core go = 1. A Mega without GO data in the game master (not yet mined)
//    gets the base form's moves / buddy distance + its own types, flagged nost (stats not available yet).
//  - Megas / Primals: shiny in GO = Mega Evolution of a shiny → go.sh = ['mega'] when the base form has a shiny in GO.
//  - gmax.forms: go data copied from the base form (same stats in GO), r = 1 (released) or r = 0 + rf = release date
//    (the app shows it from that date: core gof); sh = ['max'] if shiny, shf = shiny release date; nosh = 1 if no shiny.
import fs from 'node:fs';
const D = new URL('../docs/data/', import.meta.url);
const rd = f => JSON.parse(fs.readFileSync(new URL(f, D)));
const wr = (f, o) => fs.writeFileSync(new URL(f, D), JSON.stringify(o));
const OV = JSON.parse(fs.readFileSync(new URL('./go-overrides.json', import.meta.url)));
const core = rd('core.json'), byKey = Object.fromEntries(core.e.map(e => [e.k, e]));
const megaKeys = OV.megaReleased.keys, gmax = OV.gmax.forms;
const sps = new Map(); const spOf = id => { if (!sps.has(id)) sps.set(id, rd(`sp/${id}.json`)); return sps.get(id); };
const log = [];
const STATS = ['a', 'd', 's', 'm50', 'm51', 'sh', 'shf', 'nosh', 'r', 'rf', 'nost', 'eg'];
const baseGo = (sp, id) => { const b = sp.f[String(id)]; return b && b.go ? b.go : null; };
for (const k of megaKeys) {
  const e = byKey[k]; if (!e) { log.push(`! Méga inconnue ${k}`); continue; }
  const sp = spOf(e.id), f = sp.f[k]; if (!f) { log.push(`! ${k} absente de sp/${e.id}.json`); continue; }
  if (!f.go) { const b = baseGo(sp, e.id); if (!b) { log.push(`! ${k} : pas de données GO pour la base`); continue; } f.go = Object.fromEntries(Object.entries(b).filter(([x]) => !STATS.includes(x))); f.go.t = e.t; f.go.nost = 1; log.push(`${k} : pas encore dans le game master → attaques de la base, stats à venir`); }
  f.go.r = 1; e.go = 1;
}
for (const e of core.e) if (e.c === 'mega' || e.c === 'primal') { // shiny Mega / Primal = Mega Evolution of a shiny
  const sp = spOf(e.id), f = sp.f[e.k], b = baseGo(sp, e.id);
  if (f && f.go && f.go.r && b && b.sh && b.sh.length) f.go.sh = ['mega'];
  if (f && f.go && f.go.r) e.go = 1;
}
for (const e of core.e) if (e.c === 'gmax') { delete e.go; delete e.gof; const sp = spOf(e.id), f = sp.f[e.k]; if (f && f.go) delete f.go; }
for (const [k, o] of Object.entries(gmax)) {
  if (k.startsWith('_')) continue;
  const e = byKey[k]; if (!e || e.c !== 'gmax') { log.push(`! Gigamax inconnu ${k}`); continue; }
  const sp = spOf(e.id), f = sp.f[k], b = baseGo(sp, e.id); if (!f || !b) { log.push(`! ${k} : pas de données GO pour la base`); continue; }
  const g = Object.fromEntries(Object.entries(b).filter(([x]) => !['sh', 'r', 'rf', 'shf', 'nosh', 'eg'].includes(x)));
  g.r = o.from ? 0 : 1; if (o.from) g.rf = o.from;
  if (o.shiny) { g.sh = ['max']; if (o.shinyFrom) g.shf = o.shinyFrom; } else g.nosh = 1;
  f.go = g;
  if (g.r) e.go = 1; else e.gof = o.from;
}
// v34: released species / forms missing from the frozen pogoapi list (released.keys: entry → game-master form name), entries GO doesn't have
// (unreleased.keys) and GO evolution items shown in the app (evoItems.edges, evo.json « from>to »). Stats / moves taken from the cached game master.
{ const REL = (OV.released || {}).keys || {}, UNREL = (OV.unreleased || {}).keys || [];
  const GMF = new URL('./.cache/go-latest.json', import.meta.url); let GM = null;
  const gm = () => GM ||= fs.existsSync(GMF) ? JSON.parse(fs.readFileSync(GMF)) : [];
  const goj = rd('go.json'); let movesAdded = 0;
  const cpm = L => { const a = gm().map(e => e.data.playerLevel).find(Boolean)?.cpMultiplier; return Number.isInteger(L) ? a[L - 1] : Math.sqrt((a[Math.floor(L) - 1] ** 2 + a[Math.floor(L)] ** 2) / 2); };
  const maxCp = (st, L) => Math.max(10, Math.floor((st.baseAttack + 15) * Math.sqrt(st.baseDefense + 15) * Math.sqrt(st.baseStamina + 15) * cpm(L) ** 2 / 10));
  const TK = t => t.replace('POKEMON_TYPE_', '').toLowerCase();
  const mv = key => { if (typeof key !== 'string') return null; if (goj.moves[key]) return key;
    const m = gm().map(e => e.data.moveSettings).find(x => x && x.movementId === key); if (!m) return null;
    const base = key.replace(/_FAST$/, '');
    goj.moves[key] = [base.split('_').map(w => w[0] + w.slice(1).toLowerCase()).join(' '), TK(m.pokemonType), m.power || 0, Math.abs(m.energyDelta || 0), m.durationMs, key.endsWith('_FAST') ? 1 : 0]; movesAdded++; return key; };
  for (const [k, form] of Object.entries(REL)) {
    if (k.startsWith('_')) continue; const e = byKey[k]; if (!e) { log.push(`! sortie GO inconnue ${k}`); continue; }
    const sp = spOf(e.id), f = sp.f[k]; if (!f) { log.push(`! ${k} absente de sp/${e.id}.json`); continue; }
    if (!f.go && form) { const ps = gm().map(x => x.data.pokemonSettings).find(x => x && x.form === form);
      if (!ps) { log.push(`! ${k} : forme ${form} absente du game master`); continue; }
      const st = ps.stats, g = { a: st.baseAttack, d: st.baseDefense, s: st.baseStamina, m50: maxCp(st, 50), m51: maxCp(st, 51), t: [ps.type, ps.type2].filter(Boolean).map(TK) };
      if (ps.kmBuddyDistance) g.bd = ps.kmBuddyDistance;
      g.fm = (ps.quickMoves || []).map(mv).filter(Boolean); g.cm = (ps.cinematicMoves || []).map(mv).filter(Boolean);
      if (ps.thirdMove) g.th = [ps.thirdMove.stardustToUnlock, ps.thirdMove.candyToUnlock];
      if (ps.pokemonClass) g.cl = ps.pokemonClass.replace('POKEMON_CLASS_', '').toLowerCase();
      f.go = g; log.push(`${k} : données GO depuis le game master (${form})`); }
    if (!f.go) { log.push(`! ${k} : pas de données GO`); continue; }
    f.go.r = 1; e.go = 1;
  }
  for (const k of UNREL) { const e = byKey[k]; if (!e) { log.push(`! indisponible GO inconnu ${k}`); continue; } const f = spOf(e.id).f[k]; if (f && f.go) f.go.r = 0; delete e.go; }
  if (movesAdded) wr('go.json', goj);
  const EI = (OV.evoItems || {}).edges || {}, evo = rd('evo.json'); let ne = 0;
  for (const ed of evo) { const o = EI[ed[0] + '>' + ed[1]]; if (!o || !ed[3]) continue; for (const [x, v] of Object.entries(o)) { if (v === null) delete ed[3][x]; else ed[3][x] = v; } ne++; }
  for (const ed of evo) for (const c of ed[2] || []) if (c.x) c.x = c.x.map(t => t.replace('Pièces Gimmighoul', 'Pièces de Mordudor'));
  wr('evo.json', evo); log.push(`GO v34 : ${Object.keys(REL).filter(k => !k.startsWith('_')).length} sorties ajoutées, ${UNREL.length} retirées, ${ne} objets d’évolution, ${movesAdded} attaques ajoutées`); }
// v32: regional exclusives (go.rg = zone in French, go.rgm = 1 when migratory). Cleared first so a removed key disappears.
{ const RG = OV.regional || { keys: {}, migratory: {} };
  for (const e of core.e) { const sp = spOf(e.id), f = sp.f[e.k]; if (f && f.go) { delete f.go.rg; delete f.go.rgm; delete f.go.rgf; } }
  for (const [grp, mig] of [[RG.keys || {}, 0], [RG.migratory || {}, 1]]) for (const [k, z] of Object.entries(grp)) {
    if (k.startsWith('_')) continue; const e = byKey[k]; if (!e) { log.push(`! régional inconnu ${k}`); continue; }
    const sp = spOf(e.id), f = sp.f[k]; if (!f || !f.go) { const b = sp.f[String(e.id)]; if (b && b.go) { (b.go.rgf ||= []).push([e.l || e.n, z]); continue; } log.push(`! régional ${k} sans données GO`); continue; }
    f.go.rg = z; if (mig) f.go.rgm = 1; }
  log.push(`régionaux GO : ${Object.keys(RG.keys || {}).filter(k => !k.startsWith('_')).length} + ${Object.keys(RG.migratory || {}).length} migrateurs`); }
// v32: Ditto (Métamorph) disguises in GO from build/go-ditto.json (manual, cited) → sp/132.json f['132'].go.dit
{ const DT = JSON.parse(fs.readFileSync(new URL('./go-ditto.json', import.meta.url)));
  const byEn = new Map(core.e.filter(e => !e.c).map(e => [e.en, e.id]));
  const ids = ns => ns.map(n => { const id = byEn.get(n); if (!id) throw new Error(`go-ditto.json : nom inconnu « ${n} »`); return id; });
  const used = new Set([DT.current, ...DT.past].flatMap(x => x.src));
  const sp = spOf(132), f = sp.f['132'];
  if (f && f.go) { f.go.dit = { cur: { l: DT.current.label, ids: ids(DT.current.names) }, past: DT.past.map(x => ({ l: x.label, ids: ids(x.names) })),
      src: [...used].map(k => { if (!DT.sources[k]) throw new Error(`go-ditto.json : source inconnue ${k}`); return DT.sources[k]; }), chk: DT.checked };
    log.push(`Métamorph GO : ${f.go.dit.cur.ids.length} déguisements actuels, ${f.go.dit.past.reduce((n, x) => n + x.ids.length, 0)} passés (vérifié le ${DT.checked})`); }
  else log.push('! Métamorph (132) sans données GO'); }
// v47: announced GO debuts (upcoming.keys: entry → { from, shinyFrom }) → go.r = 0 + go.rf = from, core gof = from: the app shows the entry
// as « annoncé pour le … » and as released from that day. GO data must exist (refresh-go.mjs creates it from the game master).
// A Mega / Primal with a shiny base gets sh = ['mega'] + shf. Once the date has passed, move the key to released.keys / megaReleased.keys.
{ const UP = (OV.upcoming || {}).keys || {};
  for (const e of core.e) if (e.c !== 'gmax' && e.gof && !UP[e.k]) { delete e.gof; const f = spOf(e.id).f[e.k]; if (f && f.go) { delete f.go.rf; delete f.go.shf; } }
  for (const [k, o] of Object.entries(UP)) {
    if (k.startsWith('_')) continue; const e = byKey[k]; if (!e) { log.push(`! sortie annoncée inconnue ${k}`); continue; }
    const sp = spOf(e.id), f = sp.f[k]; if (!f || !f.go) { log.push(`! ${k} : pas de données GO (lancer refresh-go.mjs)`); continue; }
    f.go.r = 0; f.go.rf = o.from; delete e.go; e.gof = o.from;
    const b = baseGo(sp, e.id);
    if ((e.c === 'mega' || e.c === 'primal') && b && b.sh && b.sh.length) { f.go.sh = ['mega']; f.go.shf = o.shinyFrom || o.from; }
    else if (o.shinyFrom) f.go.shf = o.shinyFrom; else delete f.go.shf;
    log.push(`${k} ${e.n} : annoncé dans GO pour le ${o.from}`);
  } }
// v38: Dynamax in GO (dynamax.keys: entry → release date) → core dmx = date (the app shows the « Dynamax » button from that date). Cleared first.
{ const DM = (OV.dynamax || {}).keys || {}; for (const e of core.e) delete e.dmx;
  for (const [k, d] of Object.entries(DM)) { if (k.startsWith('_')) continue; const e = byKey[k]; if (!e) { log.push(`! Dynamax inconnu ${k}`); continue; } e.dmx = d; }
  log.push(`Dynamax GO : ${Object.keys(DM).filter(k => !k.startsWith('_')).length} formes`); }
for (const [id, sp] of sps) wr(`sp/${id}.json`, sp);
wr('core.json', core);
const nM = core.e.filter(e => (e.c === 'mega' || e.c === 'primal') && e.go).length, nG = core.e.filter(e => e.c === 'gmax' && e.go).length, nF = core.e.filter(e => e.gof).length;
console.log(`GO overrides: ${nM} Méga/Primo sorties, ${nG} Gigamax sortis, ${nF} à venir (${core.e.filter(e => e.gof).map(e => e.k + ' ' + e.gof).join(', ')})`);
log.forEach(l => console.log('  ' + l));
