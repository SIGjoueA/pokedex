// Builds the list of "entries" (species + forms) from cached PokéAPI data. Shared by build-data.mjs and fetch-images.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { get, API, CACHE, idOf, frName, enName } from './lib.mjs';
import { composeNames, jaOfNames, roOfNames } from './names.mjs';

export const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9 };
export const genNum = name => ROMAN[name.replace('generation-', '')];
export const list = async ep => (await get(`${API}/${ep}?limit=5000`, { name: `list_${ep}` })).results.map(r => r.url);

// Forms we deliberately leave out (not Pokédex forms / event-only costumes / Totems / Let's Go starters)
const EXCLUDE = /(^|-)(totem|cosplay|rock-star|belle|pop-star|phd|libre|starter)(-|$)/;
const REGION = { alola: 'Alola', galar: 'Galar', hisui: 'Hisui', paldea: 'Paldea' };
const FR_REGION = { alola: 'd’Alola', galar: 'de Galar', hisui: 'de Hisui', paldea: 'de Paldea' };
// Vivillon-line pattern names (Scatterbug/Spewpa have no FR form_names in PokéAPI)
const PATTERN_FR = {
  icy_snow: 'Blizzard', 'icy-snow': 'Blizzard', polar: 'Banquise', tundra: 'Glace', continental: 'Continent',
  garden: 'Verdure', elegant: 'Monarchie', meadow: 'Floraison', modern: 'Métropole', marine: 'Rivage',
  archipelago: 'Archipel', 'high-plains': 'Sécheresse', high_plains: 'Sécheresse', sandstorm: 'Sable',
  river: 'Delta', monsoon: 'Cyclone', savanna: 'Mangrove', sun: 'Zénith', ocean: 'Soleil Levant',
  jungle: 'Jungle', fancy: 'Fantaisie', 'poke-ball': 'Poké Ball', poke_ball: 'Poké Ball',
};
const CLOAK_FR = { plant: 'Cape Plante', sandy: 'Cape Sable', trash: 'Cape Déchet' };


export function formCategory(sfx) {
  if (sfx === 'female' || (/-female$/.test(sfx) && !/mega/.test(sfx))) return 'sex';
  if (/(^|-)gmax$/.test(sfx) || sfx === 'eternamax') return 'gmax';
  if (/^mega/.test(sfx) || /-mega(-|$)/.test(sfx)) return 'mega';
  if (sfx === 'primal') return 'primal';
  if (/(^|-)cap$/.test(sfx)) return 'form'; // Pikachu « Casquette d’Alola » is a cap, not a regional form
  if (/(^|-)(alola|galar|hisui|paldea)(-|$)/.test(sfx)) return 'reg';
  return 'form';
}
const CAT_RANK = { sex: 0, form: 1, reg: 2, mega: 3, primal: 3, gmax: 4 };
// Megas of non-default base forms: Magearna Couleur du Passé, Nigirigon Courbée / Affalée / Raide (official FR form names)
const MEGA_PRE_FR = { original: 'Passé', curly: 'Courbée', droopy: 'Affalée', stretchy: 'Raide' };
// Pitrouille / Banshitrouye sizes (Yann: Taille S / M / L / XL)
const SIZE_FR = { small: 'Taille S', average: 'Taille M', large: 'Taille L', super: 'Taille XL' };

function shortLabel(sfx, cat, formNameFr, speciesFr, fullFr) {
  if (cat === 'sex') return sfx === 'female' ? 'Femelle' : (formNameFr || sfx);
  if (cat === 'gmax') return sfx === 'eternamax' ? 'Éternamax' : 'Gigamax' + (/^(.+)-gmax$/.test(sfx) && sfx !== 'gmax' ? ' ' + sfx.replace(/-gmax$/, '').replace(/-/g, ' ') : '');
  if (cat === 'mega') {
    const m = sfx.match(/(?:mega-(x|y|z)$)|(?:^(male|female)-mega$)/); const x = m && (m[1] || m[2]);
    if (x) return 'Méga ' + ({ x: 'X', y: 'Y', z: 'Z', male: '♂', female: '♀' }[x]);
    const pre = (sfx.match(/^(.+)-mega$/) || [])[1]; // species with several Megas from different base forms
    return 'Méga' + (pre && MEGA_PRE_FR[pre] ? ' ' + MEGA_PRE_FR[pre] : '');
  }
  if (cat === 'primal') return 'Primo';
  if (cat === 'reg' && REGION[sfx]) return REGION[sfx];
  if (cat === 'reg') { const t = (fullFr || formNameFr || sfx).replace(speciesFr, '').replace(/^\s*(de|d’)\s*/, '').trim(); return t || sfx; }
  if (!formNameFr && (PATTERN_FR[sfx] || CLOAK_FR[sfx])) return PATTERN_FR[sfx] || CLOAK_FR[sfx];
  let t = (formNameFr || sfx).replace(speciesFr, '').trim();
  t = t.replace(/^(Forme|Aspect|Motif|Style|Mode|Coupe|Fleur|Taille|Noyau|Casquette|Masque|Mer|Plumage)\s+(d’|de |du |des |de la |)?/i, m => /^(Casquette|Masque|Plumage|Fleur|Noyau|Mer)/i.test(m) ? m : '');
  t = t.replace(/^[\s\-–]+|[\s\-–]+$/g, ''); // « Ultra-Necrozma » minus species → « Ultra »
  return t || PATTERN_FR[sfx] || CLOAK_FR[sfx] || sfx;
}

// Prefer form-specific HOME art when the form has a real form_name (Unown letters, Alcremie creams…).
// Species official-artwork is often a shared/wrong render (e.g. Unown OA is letter F, not A).
function formArt(F, P) {
  const home = F?.sprites?.other?.home;
  const oaF = F?.sprites?.other?.['official-artwork'];
  const oaP = P?.sprites?.other?.['official-artwork'];
  if (F?.form_name && home?.front_default) return { img: home.front_default, shiny: home.front_shiny || undefined };
  const img = oaF?.front_default || oaP?.front_default || home?.front_default || P?.sprites?.front_default;
  const shiny = oaF?.front_shiny || oaP?.front_shiny || home?.front_shiny || undefined;
  return { img, shiny };
}

// Base form without an official form name (Yann: never « Normal »):
// regional variants exist → « Commun » (officially « de Kanto »…); else male/female split → « Mâle »; else « Commun ».
// True regional variants only (Pikachu « Casquette d’Alola » is a cap, not a regional form).
const isRegional = f => f.cat === 'reg' && !/(^|-)cap$/.test(f.sfx || '');
function commonLabel(forms, hasFemale) {
  if (forms.some(isRegional)) return 'Commun';
  if (hasFemale) return 'Mâle';
  return 'Commun';
}

function baseLabel(forms, F0, defSfx, sfr) {
  if (!forms.length) return '';
  const fn0 = frName(F0.form_names);
  const hasFemale = forms.some(f => f.sfx === 'female' || /-female$/.test(f.sfx));
  const nonSex = forms.filter(f => f.cat !== 'sex');
  // Only sexual dimorphism → Mâle / Femelle
  if (hasFemale && !nonSex.length && !fn0 && !defSfx) return 'Mâle';
  // Default form carries an official form name (Zarbi A, Charmilly Lait Vanille…, Prismillon Floraison…)
  if (fn0) {
    if (/^Forme de /i.test(fn0)) return commonLabel(forms, hasFemale); // e.g. "Forme de Morphéo" / "Forme de Motisma"
    const lab = shortLabel(defSfx || F0.form_name || '', 'form', fn0, sfr, frName(F0.names));
    // Official « Mode Normal » etc. but the species has regional variants (Darumacho) → « Commun ».
    // Other official names stay (Arceus type Normal, Keldeo Forme Normale, Pitrouille taille Normale).
    if (lab && /^normale?$/i.test(lab) && forms.some(isRegional)) return 'Commun';
    if (lab && lab !== sfr) return lab;
  }
  const fromMap = PATTERN_FR[F0.form_name] || PATTERN_FR[defSfx] || CLOAK_FR[F0.form_name] || CLOAK_FR[defSfx];
  if (fromMap) return fromMap;
  if (defSfx) {
    const lab = shortLabel(defSfx, 'form', fn0, sfr);
    if (lab && lab !== defSfx) return lab;
  }
  return commonLabel(forms, hasFemale);
}

export async function loadAll() {
  const speciesUrls = await list('pokemon-species');
  const species = [];
  for (const u of speciesUrls) species.push(await get(u));
  species.sort((a, b) => a.id - b.id);
  const entries = []; // flat, in display order
  const pokemonByName = {};
  for (const S of species) {
    const sfr = frName(S.names) || S.name, sen = enName(S.names) || S.name;
    const vars = [];
    for (const v of S.varieties) vars.push({ v, P: await get(v.pokemon.url) });
    const def = vars.find(x => x.v.is_default) || vars[0];
    const P0 = def.P;
    const F0 = await get(P0.forms[0].url);
    const defSfx = P0.name === S.name ? '' : P0.name.slice(S.name.length + 1);
    const baseArt = formArt(F0, P0);
    const base = {
      key: String(S.id), id: S.id, sfx: '', cat: 'base', S, P: P0, F: F0, fr: sfr, en: sen, defSfx,
      pokemonName: P0.name, img: baseArt.img,
      shiny: baseArt.shiny,
    };
    const forms = [];
    const addForm = (e) => { if (EXCLUDE.test(e.sfx)) return; forms.push(e); };
    // cosmetic forms of the default pokemon
    const cosmetic = [];
    for (const f of P0.forms.slice(1)) {
      const F = await get(f.url);
      let sfx = (F.form_name || F.name.replace(P0.name + '-', '')).toLowerCase();
      cosmetic.push({ F, sfx });
    }
    for (const { F, sfx } of cosmetic) {
      const art = formArt(F, P0);
      const nm = frName(F.names), fn = frName(F.form_names);
      const cat = formCategory(sfx);
      addForm({ key: `${S.id}-${sfx}`, id: S.id, sfx, cat, S, P: P0, F, fr: nm || `${sfr} ${fn || sfx}`, en: `${sen} ${F.form_name || sfx}`, label: shortLabel(sfx, cat, fn, sfr, nm), img: art.img, shiny: art.shiny, cosmetic: true, intro: F.version_group.name, order: F.form_order ?? F.order });
    }
    // other varieties
    for (const { v, P } of vars) {
      if (P === P0) continue;
      let sfx = P.name.slice(S.name.length + 1);
      const F = await get(P.forms[0].url);
      const cat = formCategory(sfx);
      const nm = frName(F.names), fn = frName(F.form_names);
      const art = formArt(F, P);
      addForm({ key: `${S.id}-${sfx}`, id: S.id, sfx, cat, S, P, F, fr: nm || `${sfr} ${fn || sfx}`, en: `${sen} ${sfx.replace(/-/g, ' ')}`, label: shortLabel(sfx, cat, fn, sfr, nm),
        img: art.img, shiny: art.shiny,
        intro: F.version_group.name, order: P.order, variety: true });
    }
    // synthetic female forms from the HOME renders (visible sexual dimorphism)
    const hasF = forms.some(f => f.sfx === 'female');
    const dimorphic = S.has_gender_differences && S.gender_rate > 0 && S.gender_rate < 8;
    if (!hasF && dimorphic) {
      const ff = P0.sprites?.other?.home?.front_female;
      if (ff) addForm({ key: `${S.id}-female`, id: S.id, sfx: 'female', cat: 'sex', S, P: P0, F: F0, fr: `${sfr} femelle`, en: `${sen} female`, label: 'Femelle', img: ff, shiny: P0.sprites.other.home.front_shiny_female, intro: 'diamond-pearl', synthetic: true });
    }
    // female variants of non-default varieties with their own HOME female render (e.g. Hisuian Sneasel)
    for (const { P } of vars) {
      if (P === P0) continue;
      const ff = P.sprites?.other?.home?.front_female; if (!ff || !dimorphic) continue;
      const bs = P.name.slice(S.name.length + 1);
      addForm({ key: `${S.id}-${bs}-female`, id: S.id, sfx: `${bs}-female`, cat: 'sex', S, P, F: await get(P.forms[0].url), fr: `${frName((await get(P.forms[0].url)).names) || sfr} femelle`, en: `${sen} ${bs} female`, label: `${REGION[bs] || bs} femelle`, img: ff, shiny: P.sprites.other.home.front_shiny_female, intro: 'legends-arceus', synthetic: true });
    }
    for (let i = forms.length - 1; i >= 0; i--) if (!forms[i].img) forms.splice(i, 1);
    for (const f of forms) { f.fr = f.fr.replace(/Paldéa/g, 'Paldea'); if (f.label) f.label = f.label.replace(/Paldéa/g, 'Paldea'); }
    // Regional default mode: « Galar Normal » (Darumacho de Galar, Mode Normal) → « Galar »
    for (const f of forms) if (f.cat === 'reg' && f.label) f.label = f.label.replace(/\s+(Mode\s+)?Normale?$/i, '');
    forms.sort((a, b) => (CAT_RANK[a.cat] - CAT_RANK[b.cat]) || ((a.order ?? 0) - (b.order ?? 0)));
    base.label = baseLabel(forms, F0, defSfx, sfr);
    if (S.id === 710 || S.id === 711) { // sizes S / M / L / XL, in size order
      base.label = SIZE_FR[defSfx] || SIZE_FR.average;
      for (const f of forms) if (SIZE_FR[f.sfx]) f.label = SIZE_FR[f.sfx];
      const ord = ['small', 'average', 'large', 'super'];
      forms.sort((a, b) => ord.indexOf(a.sfx) - ord.indexOf(b.sfx));
    }
    const seen = {};
    for (const e of [base, ...forms]) { (seen[e.fr] ||= []).push(e); }
    for (const arr of Object.values(seen)) if (arr.length > 1) for (const e of arr) if (e.label) e.fr += ` (${e.label})`;
    // English / Japanese / romaji names (species + form, composed from PokéAPI names only)
    const sp = { en: sen, ja: jaOfNames(S.names), ro: roOfNames(S.names) };
    const grp = [base, ...forms];
    for (const e of grp.filter(x => !x.synthetic)) Object.assign(e, composeNames(e, sp), { _n: 1 });
    for (const e of grp.filter(x => x.synthetic)) { // synthetic female entries: same name as the male/base entry they derive from + (Female)
      const bs = e.sfx === 'female' ? '' : e.sfx.replace(/-female$/, ''); const src = grp.find(x => x.sfx === bs && x._n) || base;
      Object.assign(e, { en: src.en.replace(/\)$/, '') + (/\)$/.test(src.en) ? ', Female)' : ' (Female)'), ja: src.ja, ro: src.ro, jaSpecific: false });
    }
    entries.push(base, ...forms);
  }
  return { species, entries };
}
