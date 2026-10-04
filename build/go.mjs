// Pokémon GO data: PokeMiners game_masters (stats, moves, evolutions, buddy distance, candy) + pogoapi.net (released / shiny lists).
import { get, frName, idOf } from './lib.mjs';
const ROMAN_DUMMY = null;
const FORM_SYN = { GALARIAN: 'galar', HISUIAN: 'hisui', ALOLA: 'alola', ALOLAN: 'alola', PALDEA: 'paldea', PALDEA_COMBAT: 'paldea-combat-breed', PALDEA_BLAZE: 'paldea-blaze-breed', PALDEA_AQUA: 'paldea-aqua-breed' };
const ITEM_FR = {
  ITEM_SUN_STONE: 'Pierre Soleil', ITEM_KINGS_ROCK: 'Roche Royale', ITEM_METAL_COAT: 'Peau Métal', ITEM_DRAGON_SCALE: 'Écaille Draco',
  ITEM_UP_GRADE: 'Améliorator', ITEM_GEN4_EVOLUTION_STONE: 'Pierre Sinnoh', ITEM_GEN5_EVOLUTION_STONE: 'Pierre Unys', ITEM_BEANS: 'Haricots (Gimmighoul)',
  ITEM_OTHER_EVOLUTION_STONE_A: 'Pierre d’évolution spéciale', ITEM_OTHER_EVOLUTION_STONE_MAPLE_A: 'Pierre d’évolution spéciale (Maple A)',
  ITEM_OTHER_EVOLUTION_STONE_MAPLE_B: 'Pierre d’évolution spéciale (Maple B)', ITEM_OTHER_EVOLUTION_STONE_MAPLE_C: 'Pierre d’évolution spéciale (Maple C)',
};
const LURE_FR = { ITEM_TROY_DISK_MAGNETIC: 'Module Leurre Magnétique', ITEM_TROY_DISK_GLACIAL: 'Module Leurre Glacial', ITEM_TROY_DISK_MOSSY: 'Module Leurre Moussu', ITEM_TROY_DISK_RAINY: 'Module Leurre Pluvieux' };
const TYPE_KEY = t => t.replace('POKEMON_TYPE_', '').toLowerCase();
const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');

export async function buildGo({ entries, byKey, species, sById, moveObjs, typeFr, moveFr }) {
  const gm = await get('x', { name: 'go-latest' });
  const stamp = new Date(+(await get('x', { name: 'go-timestamp', text: true })).trim());
  const released = await get('x', { name: 'pogoapi-released_pokemon' });
  const shinyApi = await get('x', { name: 'pogoapi-shiny_pokemon' });
  const alolan = await get('x', { name: 'pogoapi-alolan_pokemon' });
  const galarian = await get('x', { name: 'pogoapi-galarian_pokemon' });
  const megaApi = await get('x', { name: 'pogoapi-mega_pokemon' });
  const cpmArr = gm.map(e => e.data.playerLevel).find(Boolean).cpMultiplier;
  const cpm = L => Number.isInteger(L) ? cpmArr[L - 1] : Math.sqrt((cpmArr[Math.floor(L) - 1] ** 2 + cpmArr[Math.floor(L)] ** 2) / 2);
  const maxCp = (st, L) => Math.max(10, Math.floor((st.baseAttack + 15) * Math.sqrt(st.baseDefense + 15) * Math.sqrt(st.baseStamina + 15) * cpm(L) ** 2 / 10));

  // moves
  const moveSet = {};
  const moveNum = {};
  for (const e of gm) { const m = e.data.moveSettings; const mm = e.templateId.match(/^V(\d+)_MOVE_/); if (m && mm) { const nm = typeof m.movementId === 'string' ? m.movementId : e.templateId.replace(/^V\d+_MOVE_/, ''); moveSet[nm] = m; moveNum[+mm[1]] = nm; } }
  const pokeMoveByNorm = {};
  for (const M of Object.values(moveObjs)) pokeMoveByNorm[norm(M.name)] = M.id;
  const goMoves = {}; // key -> [fr, type, power, energy, durationMs, fast?]
  const unmappedMoves = new Set();
  function goMove(key) {
    if (typeof key === 'number') key = moveNum[key];
    if (!key || typeof key !== 'string') return null;
    if (goMoves[key]) return key;
    const m = moveSet[key]; if (!m) return null;
    const fast = key.endsWith('_FAST');
    const base = key.replace(/_FAST$/, '');
    let id = pokeMoveByNorm[norm(base)] || pokeMoveByNorm[norm(base.replace(/_[A-Z]+$/, ''))];
    let fr = id ? moveFr(id) : null;
    if (!fr) { unmappedMoves.add(base); fr = base.split('_').map(w => w[0] + w.slice(1).toLowerCase()).join(' '); }
    const t = TYPE_KEY(m.pokemonType);
    goMoves[key] = [fr, t, m.power || 0, Math.abs(m.energyDelta || 0), m.durationMs, fast ? 1 : 0];
    return key;
  }

  // pokémon templates
  const T = {}; // id -> { noForm, bySfx }
  const nameToId = {};
  for (const e of gm) {
    const ps = e.data.pokemonSettings; const m = e.templateId.match(/^V(\d{4})_POKEMON_(.+)$/);
    if (!ps || !m) continue;
    const id = +m[1]; nameToId[ps.pokemonId] = id;
    const t = T[id] ||= { noForm: null, bySfx: {}, nameU: ps.pokemonId };
    if (!ps.form) { t.noForm = ps; continue; }
    let rest = ps.form.slice(ps.pokemonId.length + 1);
    if (!ps.form.startsWith(ps.pokemonId + '_')) rest = ps.form;
    const sfx = FORM_SYN[rest] || rest.toLowerCase().replace(/_/g, '-');
    t.bySfx[sfx] = ps;
  }
  const speciesSfxFromGo = (id, formName) => {
    const t = T[id]; if (!t || !formName) return null;
    let rest = formName.startsWith(t.nameU + '_') ? formName.slice(t.nameU.length + 1) : formName;
    return FORM_SYN[rest] || rest.toLowerCase().replace(/_/g, '-');
  };
  const entryOf = (id, formName) => {
    const sfx = speciesSfxFromGo(id, formName);
    const S = sById[id]; if (!S) return null;
    const baseE = byKey[String(id)]; if (!baseE) return null;
    if (!sfx || sfx === 'normal' || sfx === baseE.defSfx) return String(id);
    const k = `${id}-${sfx}`; return byKey[k] ? k : null;
  };

  const releasedSp = new Set(Object.keys(released).map(Number));
  const alolaSp = new Set(Object.keys(alolan).map(Number)), galarSp = new Set(Object.keys(galarian).map(Number));
  const megaOk = new Set(megaApi.map(m => `${m.pokemon_id}|${m.form}`));
  const perKey = {};
  const TEMP = { TEMP_EVOLUTION_MEGA: 'mega', TEMP_EVOLUTION_MEGA_X: 'mega-x', TEMP_EVOLUTION_MEGA_Y: 'mega-y', TEMP_EVOLUTION_PRIMAL: 'primal' };
  const TEMP_API = { 'mega': 'Normal', 'mega-x': 'X', 'mega-y': 'Y' };
  function dataFrom(ps, ov) {
    const st = ov?.stats ? { baseAttack: ov.stats.baseAttack, baseDefense: ov.stats.baseDefense, baseStamina: ov.stats.baseStamina } : ps.stats;
    const types = ov?.typeOverride1 ? [ov.typeOverride1, ov.typeOverride2].filter(Boolean) : [ps.type, ps.type2].filter(Boolean);
    const o = { a: st.baseAttack, d: st.baseDefense, s: st.baseStamina, m50: maxCp(st, 50), m51: maxCp(st, 51), t: types.map(TYPE_KEY) };
    if (ps.kmBuddyDistance) o.bd = ps.kmBuddyDistance;
    const mv = (arr) => (arr || []).map(k => goMove(k)).filter(Boolean);
    o.fm = mv(ps.quickMoves); o.cm = mv(ps.cinematicMoves);
    const ef = mv(ps.eliteQuickMove), ec = mv(ps.eliteCinematicMove);
    if (ef.length) o.fe = ef; if (ec.length) o.ce = ec;
    if (ps.thirdMove) o.th = [ps.thirdMove.stardustToUnlock, ps.thirdMove.candyToUnlock];
    if (ps.shadow?.shadowChargeMove) { o.shm = goMove(ps.shadow.shadowChargeMove); o.pum = goMove(ps.shadow.purifiedChargeMove); }
    if (ps.pokemonClass) o.cl = ps.pokemonClass.replace('POKEMON_CLASS_', '').toLowerCase();
    return o;
  }
  const unmapped = [];
  for (const e of entries) {
    const t = T[e.id]; if (!t) continue;
    let ps, ov, ok = releasedSp.has(e.id);
    if (e.cat === 'mega' || e.cat === 'primal') {
      const base = t.bySfx[byKey[String(e.id)].defSfx] || t.bySfx.normal || t.noForm; if (!base) continue;
      ov = (base.tempEvoOverrides || []).find(o => TEMP[o.tempEvoId] === e.sfx);
      if (!ov) continue; ps = base;
      ok = ok && (e.cat === 'primal' ? true : megaOk.has(`${e.id}|${TEMP_API[e.sfx]}`));
    } else {
      const cands = e.cat === 'base' ? [e.defSfx && t.bySfx[e.defSfx], t.bySfx.normal, t.noForm] : e.sfx === 'female' ? [t.bySfx.female, t.bySfx[byKey[String(e.id)].defSfx], t.bySfx.normal, t.noForm] : [t.bySfx[e.sfx]];
      ps = cands.find(Boolean);
      if (!ps) continue;
      if (e.sfx === 'alola') ok = ok && alolaSp.has(e.id);
      if (e.sfx === 'galar') ok = ok && galarSp.has(e.id);
    }
    if (e.cat === 'gmax' || e.sfx.endsWith('-female')) continue;
    const o = dataFrom(ps, ov); o.r = ok ? 1 : 0;
    if (e.cat === 'base' || e.cat === 'sex') {
      const sh = shinyApi[String(e.id)];
      if (sh) { o.sh = ['wild', 'raid', 'egg', 'evolution', 'research', 'photobomb'].filter(k => sh['found_' + k]); }
    } else if (e.sfx === 'alola') { const sh = shinyApi[String(e.id)]; if (sh && sh.alolan_shiny) o.sh = ['alola']; }
    perKey[e.key] = o;
  }

  // evolutions (GO)
  const edges = {};
  const questText = id => {
    const q = gm.map(x => x.data.evolutionQuestTemplate).find(x => x && x.questTemplateId === id); if (!q) return null;
    const g = q.goals?.[0] || {}; const n = g.target;
    const cond = g.condition || [];
    const types = cond.flatMap(c => c.withPokemonType?.pokemonType || c.withOpponentPokemonBattleStatus?.opponentPokemonType || []).map(TYPE_KEY).map(k => typeFr[k]);
    const ty = types.length ? ` de type ${types.join(' / ')}` : '';
    switch (q.questType) {
      case 'QUEST_BUDDY_EVOLUTION_WALK': return `Marcher ${n} km avec ce Pokémon comme compagnon`;
      case 'QUEST_BUDDY_EARN_AFFECTION_POINTS': return `Gagner ${n} cœurs avec ce Pokémon comme compagnon`;
      case 'QUEST_BUDDY_FEED': return `Donner ${n} friandises à ce Pokémon comme compagnon`;
      case 'QUEST_CATCH_POKEMON': return `Capturer ${n} Pokémon${ty}`;
      case 'QUEST_FIGHT_POKEMON': return `Vaincre ${n} Pokémon${ty} en combat`;
      case 'QUEST_COMPLETE_BATTLE': return `Gagner ${n} combats (raids/Dynamax) avec des Pokémon${ty}`;
      case 'QUEST_COMPLETE_RAID_BATTLE': return `Gagner ${n} raids`;
      case 'QUEST_LAND_THROW': return `Réussir ${n} lancers « Excellent »`;
      case 'QUEST_USE_INCENSE': return `Utiliser ${n} Encens`;
      default: return null;
    }
  };
  for (const e of gm) {
    const ps = e.data.pokemonSettings; const m = e.templateId.match(/^V(\d{4})_POKEMON_(.+)$/);
    if (!ps || !m || !ps.evolutionBranch) continue;
    const id = +m[1];
    const fromKey = entryOf(id, ps.form);
    if (!fromKey) continue;
    for (const b of ps.evolutionBranch) {
      if (!b.evolution || b.temporaryEvolution) continue;
      const toId = nameToId[b.evolution]; if (!toId) continue;
      const toKey = entryOf(toId, b.form);
      if (!toKey) continue;
      if (ps.form && !ps.form.endsWith('_NORMAL') && fromKey === String(id) && ps.form !== undefined && !(byKey[fromKey].defSfx && ps.form.toLowerCase().endsWith(byKey[fromKey].defSfx))) { /* default-looking form */ }
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
      if (b.evolutionMoveRequirement) { const mk = goMove(b.evolutionMoveRequirement) || goMove(b.evolutionMoveRequirement + '_FAST'); o.mv = mk ? goMoves[mk][0] : b.evolutionMoveRequirement; }
      if (b.questDisplay?.length) { const q = questText(b.questDisplay[0].questRequirementTemplateId); o.q = q || 'Quête d’évolution spéciale'; }
      const k = fromKey + '>' + toKey;
      const ex = edges[k];
      if (ex) { const sig = x => JSON.stringify(x); const { alt: _a, ...main } = ex.o; if (sig(o) !== sig(main) && !(ex.o.alt || []).some(a => sig(a) === sig(o))) (ex.o.alt ||= []).push(o); } else edges[k] = { f: fromKey, t: toKey, o: { ...o } };
    }
  }
  if (unmappedMoves.size) console.log('GO moves without PokéAPI match:', [...unmappedMoves].join(', '));
  const shared = { moves: goMoves, ts: stamp.toISOString().slice(0, 10), cl: {} };
  console.log('GO entries', Object.keys(perKey).length, 'released', Object.values(perKey).filter(x => x.r).length, 'edges', Object.keys(edges).length);
  return { perKey, edges, shared };
}
