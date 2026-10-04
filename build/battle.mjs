// Battle-only form variants: forms that cannot be obtained / caught as such and only exist in battle or through an in-battle trigger.
// They are never marked separately: they inherit the marks of their base form (`bo` = key of that base entry in core.json) and stay visible in the Formes list.
// Rule 1 (by category): every Mega Evolution, Primal Reversion, Gigantamax form and Eternamax.
// Rule 2 (explicit list below): other in-battle transformations. Each line: key → [base key, reason].
// Deliberately NOT battle-only (obtainable out of battle, so markable on their own): Deoxys, Rotom, Arceus, Giratina/Dialga/Palkia Origin, Shaymin Sky, Kyurem B/W, Therian formes,
// Hoopa Unbound, Keldeo Resolute, Necrozma Dusk/Dawn, Zacian/Zamazenta Crowned, Calyrex riders, Ogerpon masks, Koraidon/Miraidon builds, Xerneas, Zygarde 10 %, Oricorio, Lycanroc, etc.
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
const CAT_RE = /(^|-)(mega(-[xyz])?|primal|gmax|eternamax)$/;
// returns the base key (string) or null
export function battleBase(e, byKey) {
  if (BATTLE_ONLY[e.key]) { const b = BATTLE_ONLY[e.key][0]; return byKey[b] ? b : String(e.id); }
  if (e.cat === 'mega' || e.cat === 'primal' || e.cat === 'gmax') {
    const rest = e.sfx.replace(CAT_RE, '');
    const cand = rest ? `${e.id}-${rest}` : String(e.id);
    return byKey[cand] ? cand : String(e.id);
  }
  return null;
}
