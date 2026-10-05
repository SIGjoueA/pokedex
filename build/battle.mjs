// Battle-only form variants: forms that cannot be obtained / caught as such and only exist in battle or through an in-battle trigger.
// They inherit the marks of their base form (`bo` = key of that base entry in core.json) and stay visible in the Formes list.
// Rule 1 (by category): Primal Reversion and Eternamax.
// Rule 2 (explicit list): other in-battle transformations.
// NOT battle-only:
//   - Mega Evolutions (Légendes Z-A): markable via Méga-Gemme rules in the app (`mb` = base key). Captured in Z-A = base caught + gem owned.
//   - Gigantamax: caught separately in-game.
//   - Deoxys, Rotom, Arceus, Origin formes, Shaymin Sky, Kyurem B/W, Therian, Hoopa Unbound, Keldeo Resolute,
//     Necrozma Dusk/Dawn, Crowned Zacian/Zamazenta, Calyrex riders, Ogerpon masks, etc.
export const BATTLE_ONLY = {
  '351-sunny': ['351', 'Morphéo : change selon la météo en combat'],
  '351-rainy': ['351', 'Morphéo : change selon la météo en combat'],
  '351-snowy': ['351', 'Morphéo : change selon la météo en combat'],
  '421-sunshine': ['421', 'Ceriflor : forme Ensoleillé déclenchée par le soleil en combat'],
  '555-zen': ['555', 'Darumacho : Mode Transe en combat (Gloire Zen)'],
  '555-galar-zen': ['555-galar-standard', 'Darumacho de Galar : Mode Transe en combat'],
  '648-pirouette': ['648', 'Meloetta : Forme Danse via Chant Relique en combat'],
  '658-ash': ['658', 'Amphinobi : Forme Sacha (Synergie) en combat'],
  '658-battle-bond': ['658', 'Amphinobi Synergie (talent Synergie, devient Sacha en combat)'],
  '681-blade': ['681', 'Exagide : Forme Assaut via Roi Bouclier en combat'],
  '718-complete': ['718', 'Zygarde : Forme Parfaite via Rassemblement (talent Aura Cellulaire) en combat'],
  '746-school': ['746', 'Froussardine : Forme Banc via Banc en combat'],
  '774-red': ['774', 'Météno : Noyau, sous 50 % PV en combat'], '774-orange': ['774', 'Météno : Noyau'], '774-yellow': ['774', 'Météno : Noyau'],
  '774-green': ['774', 'Météno : Noyau'], '774-blue': ['774', 'Météno : Noyau'], '774-indigo': ['774', 'Météno : Noyau'], '774-violet': ['774', 'Météno : Noyau'],
  '778-busted': ['778', 'Mimiqui : Forme Démasquée après un coup en combat'],
  '800-ultra': ['800', 'Necrozma : Ultra-Necrozma via Ultra-Explosion en combat'],
  '845-gulping': ['845', 'Nigosier : Forme Gobe-Tout en combat (Cramorant)'],
  '845-gorging': ['845', 'Nigosier : Forme Gobe-Chu en combat'],
  '875-noice': ['875', 'Bekaglaçon : Tête Dégel après un coup physique en combat'],
  '877-hangry': ['877', 'Morpeko : Forme Affamé en combat (Cercle Faim)'],
  '964-hero': ['964', 'Superdofin : Forme Super après un retrait du combat'],
  '1024-terastal': ['1024', 'Terapagos : Forme Téracristal en combat'],
  '1024-stellar': ['1024', 'Terapagos : Forme Stellaire en combat'],
};
const CAT_RE = /(^|-)(mega(-[xyz])?|primal|eternamax)$/;
const MEGA_RE = /(^|-)((male|female|original|curly|droopy|stretchy)-)?mega(-[xyz])?$/;

/** Base key for a Mega form (for Z-A gem rules). */
export function megaBase(e, byKey) {
  if (e.cat !== 'mega') return null;
  const sfx = e.sfx || '';
  let cand;
  if (/(^|-)male-mega$/.test(sfx)) cand = String(e.id);
  else if (/(^|-)female-mega$/.test(sfx)) cand = `${e.id}-female`;
  else if (/original-mega$/.test(sfx)) cand = `${e.id}-original`;
  else if (/curly-mega$/.test(sfx)) cand = String(e.id); // curly = default Nigirigon
  else if (/(droopy|stretchy)-mega$/.test(sfx)) cand = `${e.id}-${sfx.replace(/-mega$/, '')}`;
  else {
    const rest = sfx.replace(/(^|-)mega(-[xyz])?$/, '').replace(/^-/, '');
    cand = rest ? `${e.id}-${rest}` : String(e.id);
  }
  return byKey[cand] ? cand : String(e.id);
}

/** Battle-only base key, or null. Megas are NOT battle-only (Z-A gem rules). */
export function battleBase(e, byKey) {
  if (BATTLE_ONLY[e.key]) { const b = BATTLE_ONLY[e.key][0]; return byKey[b] ? b : String(e.id); }
  if (e.cat === 'primal' || e.sfx === 'eternamax' || /eternamax$/.test(e.sfx || '')) {
    const rest = (e.sfx || '').replace(CAT_RE, '');
    const cand = rest ? `${e.id}-${rest}` : String(e.id);
    return byKey[cand] ? cand : String(e.id);
  }
  return null;
}
