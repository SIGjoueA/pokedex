// v60.25: PvPoke speciesId → app entry key, shared by fetch-pvp.mjs, fetch-pvp-moves.mjs and audit.mjs.
// Before v60.25 the link was « same dex number + same GO base stats, base form first »: every form with the same stats as its base
// (Alola / Galar / Hisui / Paldea forms, Motisma, Genesect, Arceus, Silvallié, Necrozma, Kyurem, Plumeline…) was folded onto the base
// entry (wrong rank on the base sheet, nothing on the form sheet), and Pikachu costumes were folded onto Pikachu.
// Now: 1) explicit table PVP_FORMS, 2) generic name rule (speciesId suffix → key suffix, alolan → alola…), always checked against our GO
// base stats (atk/def/sta must be equal, else no link). PVP_ABSENT = PvPoke ids deliberately not linked (reason shown in the build log).
// PVP_COSMETIC = forms that differ only by their look (same GO stats and moves): their sheet shows the rank of the PvPoke species
// (alias, never added to the « Classements » lists).
export const PVP_FORMS = {
  tauros_combat: '128-paldea-combat-breed', tauros_blaze: '128-paldea-blaze-breed', tauros_aqua: '128-paldea-aqua-breed',
  burmy_plant: '412', wormadam_plant: '413', cherrim_overcast: '421', cherrim_sunny: '421-sunshine',
  giratina_altered: '487', shaymin_land: '492', darmanitan_standard: '555',
  tornadus_incarnate: '641', thundurus_incarnate: '642', landorus_incarnate: '645', enamorus_incarnate: '905',
  keldeo_ordinary: '647', meloetta_aria: '648', aegislash_shield: '681', pumpkaboo_average: '710', gourgeist_average: '711',
  oricorio_baile: '741', lycanroc_midday: '745',
  minior_meteor: '774', minior_core: '774-green', // core = any colour: Noyau Vert = first one out in GO
  necrozma_dusk_mane: '800-dusk', necrozma_dawn_wings: '800-dawn',
  indeedee_male: '876', morpeko_full_belly: '877',
  zacian_hero: '888', zacian_crowned_sword: '888-crowned', zamazenta_hero: '889', zamazenta_crowned_shield: '889-crowned',
  urshifu_single_strike: '892', tatsugiri_curly: '978',
};
const COSTUME = 'costume GO de Pikachu (attaques à part, pas de fiche dans l’appli)', NOGO = 'pas encore dans Pokémon GO (pas de données GO dans l’appli)';
export const PVP_ABSENT = {
  pikachu_5th_anniversary: COSTUME, pikachu_flying: COSTUME, pikachu_horizons: COSTUME, pikachu_kariyushi: COSTUME,
  pikachu_libre: COSTUME, pikachu_pop_star: COSTUME, pikachu_rock_star: COSTUME, pikachu_shaymin: COSTUME,
  darmanitan_galarian_zen: NOGO, clefable_mega: NOGO, eternatus_eternamax: NOGO, calyrex_ice_rider: NOGO, basculegion_male: NOGO, basculegion_female: NOGO,
  hoopa_confined: 'doublon PvPoke de « hoopa » (même fiche)', wishiwashi_solo: 'doublon PvPoke de « wishiwashi » (même fiche)',
  toxtricity_amped: 'doublon PvPoke de « toxtricity » (même fiche)', eiscue_ice: 'doublon PvPoke de « eiscue » (même fiche)',
  maushold_family_of_four: 'doublon PvPoke de « maushold » (même fiche)', palafin_zero: 'doublon PvPoke de « palafin » (même fiche)',
  koraidon_apex: 'forme de combat pas encore dans Pokémon GO (pas de fiche GO correspondante)', miraidon_ultimate: 'forme de combat pas encore dans Pokémon GO (pas de fiche GO correspondante)',
};
// dex → PvPoke speciesId whose rank the look-only forms of this dex share
export const PVP_COSMETIC = { 201: 'unown', 422: 'shellos', 423: 'gastrodon', 550: 'basculin', 585: 'deerling', 586: 'sawsbuck', 666: 'vivillon',
  669: 'flabebe', 670: 'floette', 671: 'florges', 676: 'furfrou', 774: 'minior_core', 931: 'squawkabilly', 982: 'dudunsparce',
  999: 'gimmighoul', 1012: 'poltchageist', 1013: 'sinistcha' };
const REG = { alolan: 'alola', galarian: 'galar', hisuian: 'hisui', paldean: 'paldea' };
// gm = PvPoke gamemaster pokemon.json, core = docs/data/core.json, goOf(key) = GO data of an app entry (sp/<dex>.json f[key].go)
export function mapPvPoke(gm, core, goOf) {
  const ent = Object.fromEntries(core.e.map(e => [e.k, e])), sids = {};
  for (const p of gm) if (!(p.tags || []).includes('duplicate')) (sids[p.dex] ||= new Set()).add(p.speciesId.replace(/_shadow$/, ''));
  const prefix = {}; for (const [d, s] of Object.entries(sids)) { const a = [...s].map(x => x.split('_')); let n = 0; while (a.every(t => t[n] !== undefined && t[n] === a[0][n])) n++; prefix[d] = a[0].slice(0, n).join('_'); }
  const keyOf = {}, keyMega = {}, miss = [], absent = [], bad = [], seen = new Set();
  for (const p of gm) {
    const sid = p.speciesId.replace(/_shadow$/, ''), tags = p.tags || []; if (tags.includes('duplicate') || seen.has(sid)) continue; seen.add(sid);
    if (PVP_ABSENT[sid]) { absent.push(sid); continue; }
    const pre = prefix[p.dex], suf = sid === pre ? '' : sid.slice(pre.length + 1);
    const k = PVP_FORMS[sid] || (suf ? `${p.dex}-${suf.split('_').map(t => REG[t] || t).join('-')}` : String(p.dex));
    const e = ent[k], g = e && e.id === p.dex && goOf(k);
    if (!g) { miss.push(sid); continue; }
    if (g.a !== p.baseStats.atk || g.d !== p.baseStats.def || g.s !== p.baseStats.hp) { bad.push(`${sid}→${k}`); continue; }
    ((tags.includes('mega') || ['mega', 'primal'].includes(e.c)) ? keyMega : keyOf)[sid] = k;
  }
  // look-only forms → alias to the key of their PvPoke species, only when GO stats and moves are the same
  const alias = {}, sig = g => g && JSON.stringify([g.a, g.d, g.s, g.t, g.fm, g.cm, g.fe || [], g.ce || []]);
  for (const [dex, sid] of Object.entries(PVP_COSMETIC)) {
    const base = keyOf[sid]; if (!base) { miss.push(sid + ' (alias)'); continue; }
    for (const e of core.e) if (e.id === +dex && e.k !== base && e.c === 'form' && !Object.values(keyOf).includes(e.k)) { const g = goOf(e.k); if (g && sig(g) === sig(goOf(base))) alias[e.k] = base; }
  }
  return { keyOf, keyMega, alias, miss, absent, bad };
}
