// French description of a PokéAPI evolution detail.
import { get, frName } from './lib.mjs';
const TOD = { day: 'de jour', night: 'de nuit', dusk: 'au crépuscule' };
const REGION = { alola: 'à Alola', galar: 'à Galar', hisui: 'à Hisui', paldea: 'à Paldea', kanto: 'à Kanto', johto: 'à Johto', hoenn: 'à Hoenn', sinnoh: 'à Sinnoh', unova: 'à Unys', kalos: 'à Kalos' };
const locCache = {};
async function locFr(loc) {
  if (!locCache[loc.url]) { const L = await get(loc.url); locCache[loc.url] = frName(L.names) || loc.name.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase()); }
  return locCache[loc.url];
}
export async function evoText(d, c) {
  const p = [];
  const t = d.trigger.name;
  if (d.min_level) p.push(`Niv. ${d.min_level}`);
  switch (t) {
    case 'use-item': p.push(d.item ? `Utiliser ${await c.itemFr(d.item.url)}` : 'Utiliser un objet'); break;
    case 'trade': p.push(d.trade_species ? `Échange contre ${c.speciesFr(d.trade_species.url)}` : 'Échange'); break;
    case 'shed': p.push('Niv. 20 avec une place libre dans l’équipe et une Poké Ball dans le sac'); break;
    case 'spin': p.push(c.collapsed ? 'Tourner sur soi-même en tenant un Bonbon (la forme dépend du Bonbon et du moment)' : 'Tourner sur soi-même en tenant un Bonbon'); break;
    case 'three-critical-hits': p.push('Réussir 3 coups critiques lors d’un même combat'); break;
    case 'take-damage': p.push(`Subir au moins ${d.min_damage_taken} PV de dégâts dans un combat, puis passer sous l’arche de pierre`); break;
    case 'recoil-damage': p.push(`Subir au moins ${d.min_damage_taken} PV de dégâts de contrecoup`); break;
    case 'tower-of-darkness': p.push('Visiter la Tour des Ténèbres'); break;
    case 'tower-of-waters': p.push('Visiter la Tour des Eaux'); break;
    case 'three-defeated-bisharp': p.push('Vaincre 3 Scalproie chefs, puis monter de niveau'); break;
    case 'meltan-candies': p.push('Donner 400 Bonbons Meltan'); break;
    case 'gimmighoul-coins': p.push('Posséder 999 Pièces Gimmighoul'); break;
    case 'in-battle-level-up': p.push('Monter de niveau pendant un combat'); break;
    case 'strong-style-move': case 'agile-style-move': case 'use-move':
      if (d.used_move) p.push(`Utiliser ${c.moveFr(d.used_move.url)} ${d.min_move_count || ''} fois${t === 'strong-style-move' ? ' (style Puissant)' : t === 'agile-style-move' ? ' (style Rapide)' : ''}`.replace(/\s+/g, ' ')); break;
    default: break;
  }
  if (d.held_item) p.push(t === 'trade' ? `en tenant ${await c.itemFr(d.held_item.url)}` : `en tenant ${await c.itemFr(d.held_item.url)}`);
  if (d.min_happiness) p.push(`avec un bonheur élevé (≥ ${d.min_happiness})`);
  if (d.min_affection) p.push(`avec ${d.min_affection} cœurs d’affection minimum (Pokémon-Amie)`);
  if (d.min_beauty) p.push(`avec une beauté ≥ ${d.min_beauty}`);
  if (d.known_move) p.push(`en connaissant ${c.moveFr(d.known_move.url)}`);
  if (d.known_move_type) p.push(`en connaissant une capacité de type ${c.typeFr[d.known_move_type.name]}`);
  if (d.party_species) p.push(`avec ${c.speciesFr(d.party_species.url)} dans l’équipe`);
  if (d.party_type) p.push(`avec un Pokémon de type ${c.typeFr[d.party_type.name]} dans l’équipe`);
  if (d.location) p.push(`à : ${await locFr(d.location)}`);
  if (d.region) p.push(REGION[d.region.name] || `région ${d.region.name}`);
  if (d.near_special_rock) p.push('près d’un rocher spécial (Roche Moussue / Glacée)');
  if (d.time_of_day) p.push(TOD[d.time_of_day] || d.time_of_day);
  if (d.gender === 1) p.push('femelle uniquement'); else if (d.gender === 2) p.push('mâle uniquement');
  if (d.needs_overworld_rain) p.push('sous la pluie');
  if (d.turn_upside_down) p.push('en retournant la console');
  if (d.relative_physical_stats !== null && d.relative_physical_stats !== undefined) p.push(d.relative_physical_stats > 0 ? 'Attaque > Défense' : d.relative_physical_stats < 0 ? 'Attaque < Défense' : 'Attaque = Défense');
  if (d.min_steps) p.push(`après ${d.min_steps} pas en mode « Go ! » (Écarlate/Violet)`);
  if (d.needs_multiplayer) p.push('avec un autre joueur (Cercle Union)');
  if (d.allowed_natures?.length) p.push(`nature : ${d.allowed_natures.map(n => c.natureFr[n.name] || n.name).join(', ')}`);
  if (d.condition_expression) { const e = d.condition_expression; if (e.percentage_chance) p.push(`aléatoire (≈ ${e.percentage_chance} %)`); }
  if (!p.length) p.push(t === 'level-up' ? 'Montée de niveau' : 'Condition spéciale');
  if (t === 'level-up' && d.min_level === null && p.length && !p[0].startsWith('Niv')) {
    // e.g. happiness only: make it clear it is a level-up
    p[0] = 'Montée de niveau ' + p[0];
  }
  return p;
}
