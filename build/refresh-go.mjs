// v47: lean GO update of docs/data from the cached game master (node fetch-go.mjs first), without a full rebuild. Idempotent.
// Entry → game-master template: build/go-templates.json (keys: app key → [templateId, tempEvoId | null]).
// Updates, for every mapped entry: stats / max CP / types / buddy km / moves (fast, charged, elite, shadow) / 3rd move cost / class
// (sp/<id>.json f[k].go; release status, shiny, dates and hand-made fields are kept), creates GO data (r = 0) for a mapped entry that had none,
// refreshes go.json moves (type / power / energy / duration; French name kept, new move → PokéAPI French name) and go.json ts,
// and the GO evolution costs in evo.json (candy, km, quest, lure, item, time of day…). Then run apply-go-overrides.mjs (dates / releases / Gigamax copies).
// Usage: node refresh-go.mjs [--dry]   (prints every change; also lists game-master species / forms that no app entry uses yet)
import fs from 'node:fs';
const DRY = process.argv.includes('--dry');
const D = new URL('../docs/data/', import.meta.url), C = new URL('./.cache/', import.meta.url);
const rd = f => JSON.parse(fs.readFileSync(new URL(f, D))), wr = (f, o) => DRY || fs.writeFileSync(new URL(f, D), JSON.stringify(o));
if (!fs.existsSync(new URL('go-latest.json', C))) { console.log('refresh-go: no build/.cache/go-latest.json (run node fetch-go.mjs) → skipped'); process.exit(0); }
const GM = JSON.parse(fs.readFileSync(new URL('go-latest.json', C)));
const stamp = fs.existsSync(new URL('go-timestamp.txt', C)) ? new Date(+fs.readFileSync(new URL('go-timestamp.txt', C), 'utf8').trim()).toISOString().slice(0, 10) : null;
const src = fs.existsSync(new URL('go-source.txt', C)) ? fs.readFileSync(new URL('go-source.txt', C), 'utf8').trim() : '?';
const MAP = JSON.parse(fs.readFileSync(new URL('./go-templates.json', import.meta.url))).keys;
const OV = JSON.parse(fs.readFileSync(new URL('./go-overrides.json', import.meta.url)));
const core = rd('core.json'), goj = rd('go.json'), evo = rd('evo.json'), byKey = Object.fromEntries(core.e.map(e => [e.k, e]));
const typeFr = Object.fromEntries(core.types);
const TK = t => String(t).replace('POKEMON_TYPE_', '').toLowerCase();
const cpmArr = GM.map(e => e.data.playerLevel).find(Boolean).cpMultiplier;
const cpm = L => Number.isInteger(L) ? cpmArr[L - 1] : Math.sqrt((cpmArr[Math.floor(L) - 1] ** 2 + cpmArr[Math.floor(L)] ** 2) / 2);
const maxCp = (st, L) => Math.max(10, Math.floor((st.baseAttack + 15) * Math.sqrt(st.baseDefense + 15) * Math.sqrt(st.baseStamina + 15) * cpm(L) ** 2 / 10));
const moveSet = {}, moveNum = {};
for (const e of GM) { const m = e.data.moveSettings, mm = e.templateId.match(/^V(\d+)_MOVE_/); if (m && mm) { const nm = typeof m.movementId === 'string' ? m.movementId : e.templateId.replace(/^V\d+_MOVE_/, ''); moveSet[nm] = m; moveNum[+mm[1]] = nm; } }
const tpl = {}; for (const e of GM) { const ps = e.data.pokemonSettings; if (ps && /^V\d{4}_POKEMON_/.test(e.templateId)) tpl[e.templateId] = ps; }
const log = [], used = new Set();
const mk = k => { if (typeof k === 'number') k = moveNum[k]; if (typeof k !== 'string' || !moveSet[k]) return null; used.add(k); return k; };
function dataFrom(ps, ov) {
  const st = ov?.stats || ps.stats;
  const types = ov?.typeOverride1 ? [ov.typeOverride1, ov.typeOverride2].filter(Boolean) : [ps.type, ps.type2].filter(Boolean);
  const o = { a: st.baseAttack, d: st.baseDefense, s: st.baseStamina, m50: maxCp(st, 50), m51: maxCp(st, 51), t: types.map(TK) };
  if (ps.kmBuddyDistance) o.bd = ps.kmBuddyDistance;
  const mv = a => (a || []).map(mk).filter(Boolean);
  o.fm = mv(ps.quickMoves); o.cm = mv(ps.cinematicMoves);
  const ef = mv(ps.eliteQuickMove), ec = mv(ps.eliteCinematicMove); if (ef.length) o.fe = ef; if (ec.length) o.ce = ec;
  if (ps.thirdMove) o.th = [ps.thirdMove.stardustToUnlock, ps.thirdMove.candyToUnlock];
  if (ps.shadow?.shadowChargeMove) { o.shm = mk(ps.shadow.shadowChargeMove); o.pum = mk(ps.shadow.purifiedChargeMove); }
  if (ps.pokemonClass) o.cl = String(ps.pokemonClass).replace('POKEMON_CLASS_', '').toLowerCase();
  return o;
}
const F = ['a', 'd', 's', 'm50', 'm51', 't', 'bd', 'fm', 'cm', 'fe', 'ce', 'th', 'shm', 'pum', 'cl'];
const sps = new Map(); const spOf = id => { if (!sps.has(id)) sps.set(id, rd(`sp/${id}.json`)); return sps.get(id); };
const J = x => JSON.stringify(x ?? null);
let nChanged = 0, nNew = 0;
for (const [k, [tid, temp]] of Object.entries(MAP)) {
  const e = byKey[k]; if (!e) { log.push(`! go-templates : fiche inconnue ${k}`); continue; }
  const ps = tpl[tid]; if (!ps) { log.push(`! ${k} : modèle ${tid} absent du game master`); continue; }
  const ov = temp ? (ps.tempEvoOverrides || []).find(o => o.tempEvoId === temp) : null;
  if (temp && !ov?.stats) { log.push(`${k} : ${temp} pas encore dans le game master`); continue; }
  const n = dataFrom(ps, ov), f = spOf(e.id).f[k]; if (!f) { log.push(`! ${k} absente de sp/${e.id}.json`); continue; }
  if (!f.go) { f.go = { ...n, r: 0 }; nNew++; log.push(`+ ${k} ${e.n} : nouvelles données GO (${n.a}/${n.d}/${n.s}, PC max ${n.m50}) — pas encore marqué sorti`); continue; }
  const d = F.filter(x => J(f.go[x]) !== J(n[x])).map(x => `${x} ${J(f.go[x])} → ${J(n[x])}`);
  if (f.go.nost) d.push('stats du game master (fin de « stats à venir »)');
  if (!d.length) continue;
  nChanged++; log.push(`~ ${k} ${e.n} : ${d.join(' ; ')}`);
  for (const x of F) { if (n[x] === undefined) delete f.go[x]; else f.go[x] = n[x]; } delete f.go.nost;
}
// Gigamax / mega fallbacks copy their base: apply-go-overrides.mjs. Moves referenced by data not refreshed here (Gigamax copies, overrides) are kept.
for (const [id, sp] of sps) for (const f of Object.values(sp.f)) if (f.go) for (const x of ['fm', 'cm', 'fe', 'ce']) (f.go[x] || []).forEach(m => used.add(m));
for (const e of core.e) { const f = spOf(e.id).f[e.k]; if (f?.go) for (const x of ['fm', 'cm', 'fe', 'ce', 'shm', 'pum']) [].concat(f.go[x] || []).forEach(m => used.add(m)); }
// moves
const UA = { 'User-Agent': 'PokedexPWA/1.0 (personal PWA)' };
async function frMove(key) {
  const slug = key.replace(/_FAST$/, '').toLowerCase().replace(/_/g, '-'), cf = new URL(`pokeapi-move-${slug}.json`, C);
  try { let j; if (fs.existsSync(cf)) j = JSON.parse(fs.readFileSync(cf)); else { const r = await fetch(`https://pokeapi.co/api/v2/move/${slug}`, { headers: UA }); if (!r.ok) throw 0; j = await r.json(); fs.writeFileSync(cf, JSON.stringify({ names: j.names })); }
    const n = (j.names || []).find(x => x.language.name === 'fr'); if (n) return n.name; } catch {}
  return key.replace(/_FAST$/, '').split('_').map(w => w[0] + w.slice(1).toLowerCase()).join(' ');
}
let nMv = 0;
for (const k of [...used].sort()) {
  const m = moveSet[k]; if (!m) continue;
  const v = [goj.moves[k]?.[0] || await frMove(k), TK(m.pokemonType), m.power || 0, Math.abs(m.energyDelta || 0), m.durationMs, k.endsWith('_FAST') ? 1 : 0];
  if (J(v) !== J(goj.moves[k])) { log.push(`${goj.moves[k] ? '~' : '+'} attaque ${k} : ${J(goj.moves[k])} → ${J(v)}`); goj.moves[k] = v; nMv++; }
}
if (stamp && goj.ts !== stamp) { log.push(`go.json ts ${goj.ts} → ${stamp} (${src})`); goj.ts = stamp; }
// evolutions (same rules as go.mjs). Edge keys come from the template map (canonical form: form name, or <ID>_NORMAL when none).
const canon = ps => typeof ps.form === 'string' ? ps.form : ps.form ? null : ps.pokemonId + '_NORMAL';
const keysOfCanon = {}; for (const [k, [tid, temp]] of Object.entries(MAP)) { if (temp || !tpl[tid]) continue; const c = canon(tpl[tid]); if (c) (keysOfCanon[c] ||= new Set()).add(k); }
const one = c => { const s = keysOfCanon[c]; if (!s) return null; const a = [...s]; if (a.length === 1) return a[0]; const b = a.find(k => !k.includes('-')); return b || null; };
const ITEM_FR = { ITEM_SUN_STONE: 'Pierre Soleil', ITEM_KINGS_ROCK: 'Roche Royale', ITEM_METAL_COAT: 'Peau Métal', ITEM_DRAGON_SCALE: 'Écaille Draco', ITEM_UP_GRADE: 'Améliorator', ITEM_GEN4_EVOLUTION_STONE: 'Pierre Sinnoh', ITEM_GEN5_EVOLUTION_STONE: 'Pierre Unys', ITEM_BEANS: 'Haricots (Gimmighoul)', ITEM_OTHER_EVOLUTION_STONE_A: 'Pièces de Mordudor', ITEM_OTHER_EVOLUTION_STONE_MAPLE_A: 'Pomme Sucrée', ITEM_OTHER_EVOLUTION_STONE_MAPLE_B: 'Pomme Acidulée', ITEM_OTHER_EVOLUTION_STONE_MAPLE_C: 'Pomme Nectar' };
const LURE_FR = { ITEM_TROY_DISK_MAGNETIC: 'Module Leurre Magnétique', ITEM_TROY_DISK_GLACIAL: 'Module Leurre Glacial', ITEM_TROY_DISK_MOSSY: 'Module Leurre Moussu', ITEM_TROY_DISK_RAINY: 'Module Leurre Pluvieux' };
const quests = Object.fromEntries(GM.map(x => x.data.evolutionQuestTemplate).filter(Boolean).map(q => [q.questTemplateId, q]));
const questText = id => { const q = quests[id]; if (!q) return null; const g = q.goals?.[0] || {}, n = g.target, cond = g.condition || [];
  const types = cond.flatMap(c => c.withPokemonType?.pokemonType || c.withOpponentPokemonBattleStatus?.opponentPokemonType || []).map(TK).map(k => typeFr[k]); const ty = types.length ? ` de type ${types.join(' / ')}` : '';
  return ({ QUEST_BUDDY_EVOLUTION_WALK: `Marcher ${n} km avec ce Pokémon comme compagnon`, QUEST_BUDDY_EARN_AFFECTION_POINTS: `Gagner ${n} cœurs avec ce Pokémon comme compagnon`, QUEST_BUDDY_FEED: `Donner ${n} friandises à ce Pokémon comme compagnon`, QUEST_CATCH_POKEMON: `Capturer ${n} Pokémon${ty}`, QUEST_FIGHT_POKEMON: `Vaincre ${n} Pokémon${ty} en combat`, QUEST_COMPLETE_BATTLE: `Gagner ${n} combats (raids/Dynamax) avec des Pokémon${ty}`, QUEST_COMPLETE_RAID_BATTLE: `Gagner ${n} raids`, QUEST_LAND_THROW: `Réussir ${n} lancers « Excellent »`, QUEST_USE_INCENSE: `Utiliser ${n} Encens` })[q.questType] || null; };
const edges = {};
for (const ps of Object.values(tpl)) {
  if (!ps.evolutionBranch) continue; const from = canon(ps) && one(canon(ps)); if (!from) continue;
  for (const b of ps.evolutionBranch) {
    if (!b.evolution || b.temporaryEvolution) continue;
    const to = one(typeof b.form === 'string' ? b.form : b.evolution + '_NORMAL'); if (!to) continue;
    const o = { c: b.candyCost };
    if (b.evolutionItemRequirement) o.i = ITEM_FR[b.evolutionItemRequirement] || b.evolutionItemRequirement;
    if (b.evolutionItemRequirementCost) o.ic = b.evolutionItemRequirementCost;
    if (b.kmBuddyDistanceRequirement) o.km = b.kmBuddyDistanceRequirement;
    if (b.mustBeBuddy) o.mb = 1;
    if (b.lureItemRequirement) o.l = LURE_FR[b.lureItemRequirement] || b.lureItemRequirement;
    if (b.noCandyCostViaTrade) o.nt = 1;
    if (b.onlyDaytime) o.dn = 'jour'; if (b.onlyNighttime) o.dn = 'nuit'; if (b.onlyDuskPeriod) o.dn = 'crépuscule';
    if (b.onlyFullMoon) o.fm = 1; if (b.onlyUpsideDown) o.ud = 1;
    if (b.genderRequirement) o.g = b.genderRequirement === 'MALE' ? 'mâle' : 'femelle';
    if (b.evolutionMoveRequirement) { const k = mk(b.evolutionMoveRequirement) || mk(b.evolutionMoveRequirement + '_FAST'); o.mv = k ? goj.moves[k]?.[0] || k : b.evolutionMoveRequirement; }
    if (b.questDisplay?.length) o.q = questText(b.questDisplay[0].questRequirementTemplateId) || 'Quête d’évolution spéciale';
    const ek = from + '>' + to, ex = edges[ek];
    if (ex) { const { alt: _a, ...main } = ex; if (J(o) !== J(main) && !(ex.alt || []).some(a => J(a) === J(o))) (ex.alt ||= []).push(o); } else edges[ek] = o;
  }
}
const skip = new Set(Object.keys(OV.evoItems?.edges || {})); let nEvo = 0;
const norm = o => { if (!o) return null; const { alt, ...m } = o; return J(Object.fromEntries(Object.entries(m).sort())); };
for (const row of evo) {
  const ek = row[0] + '>' + row[1], o = edges[ek]; if (!o || skip.has(ek)) continue;
  if (norm(row[3]) === norm(o)) continue;
  if (row[3] && Object.keys(o).every(x => J(o[x]) === J(row[3][x])) && Object.keys(row[3]).filter(x => x !== 'alt').every(x => x in o)) continue;
  log.push(`~ évolution GO ${ek} : ${J(row[3])} → ${J(o)}`); nEvo++;
  const keepAlt = row[3]?.alt; row[3] = { ...o }; if (keepAlt && !o.alt) row[3].alt = keepAlt; while (row.length > 4) row.pop();
}
// game-master species / forms not used by any app entry (new forms to map by hand when the app has an entry for them)
const mapped = new Set(Object.values(MAP).map(x => x[0]));
const mappedCanon = new Set(Object.keys(keysOfCanon));
const loose = Object.entries(tpl).filter(([t, ps]) => typeof ps.form === 'string' && !mapped.has(t) && !mappedCanon.has(ps.form) && !/_(NORMAL|SHADOW|PURIFIED|COPY_2019|\d{4}(_[A-Z0-9]+)*|COSTUME.*|FALL_2019|HALLOWEEN.*|GOFEST.*|WCS.*|VS_\d+)$/.test(ps.form));
const ids = new Set(core.e.map(e => e.id)), noGo = core.e.filter(e => e.c !== 'gmax' && !spOf(e.id).f[e.k]?.go).map(e => e.k);
const sigOf = ps => J([ps.stats, ps.type, ps.type2]), mappedSig = new Set([...mapped].filter(t => tpl[t]).map(t => t.slice(0, 5) + sigOf(tpl[t])));
const unmappedForApp = loose.filter(([t, ps]) => ids.has(+t.slice(1, 5)) && !mappedSig.has(t.slice(0, 5) + sigOf(ps))).map(([t]) => t); // same stats / types as a mapped sibling = costume / cosmetic form
if (!DRY) { for (const [id, sp] of sps) wr(`sp/${id}.json`, sp); wr('go.json', goj); wr('evo.json', evo); }
console.log(`refresh-go (${src} ${stamp}) : ${nChanged} fiches mises à jour, ${nNew} nouvelles, ${nMv} attaques, ${nEvo} évolutions${DRY ? ' [--dry : rien écrit]' : ''}`);
log.forEach(l => console.log('  ' + l));
console.log(`  modèles de formes du game master sans fiche reliée (${unmappedForApp.length}) : ${unmappedForApp.slice(0, 60).join(' ')}`);
