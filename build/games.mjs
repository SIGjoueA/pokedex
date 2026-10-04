// Game catalogue (newest first). Order follows real release dates (Japan), verified against
// Wikipedia / Bulbapedia release lists. `vgs` = PokéAPI version-group(s) used for the regional dex membership/moves.
// `dex` = PokéAPI pokedex names, combined in this order (a species keeps the number of its first dex).
export const GAMES = [
  { id: 'zadlc', fr: 'Légendes Pokémon : Z-A – Méga-Dimension', short: 'Z-A Méga-Dimension', d: '2025-12-10', vg: 'mega-dimension', mv: ['legends-za', 'mega-dimension'], dex: ['hyperspace'], ver: ['mega-dimension'], kind: 'dlc' },
  { id: 'za', fr: 'Légendes Pokémon : Z-A', short: 'Légendes Z-A', d: '2025-10-16', vg: 'legends-za', mv: ['legends-za'], dex: ['lumiose-city'], ver: ['legends-za'], kind: 'legends' },
  { id: 'svdisk', fr: 'Écarlate / Violet : Le Disque Indigo', short: 'ÉV Disque Indigo', d: '2023-12-14', vg: 'the-indigo-disk', mv: ['scarlet-violet', 'the-indigo-disk'], dex: ['blueberry'], ver: ['the-indigo-disk-scarlet', 'the-indigo-disk-violet'], kind: 'dlc' },
  { id: 'svmask', fr: 'Écarlate / Violet : Le Masque Turquoise', short: 'ÉV Masque Turquoise', d: '2023-09-13', vg: 'the-teal-mask', mv: ['scarlet-violet', 'the-teal-mask'], dex: ['kitakami'], ver: ['the-teal-mask-scarlet', 'the-teal-mask-violet'], kind: 'dlc' },
  { id: 'sv', fr: 'Écarlate / Violet', short: 'Écarlate/Violet', d: '2022-11-18', vg: 'scarlet-violet', mv: ['scarlet-violet'], dex: ['paldea', 'kitakami', 'blueberry'], ver: ['scarlet', 'violet'], kind: 'main' },
  { id: 'la', fr: 'Légendes Pokémon : Arceus', short: 'Légendes Arceus', d: '2022-01-28', vg: 'legends-arceus', mv: ['legends-arceus'], dex: ['hisui'], ver: ['legends-arceus'], kind: 'legends' },
  { id: 'bdsp', fr: 'Diamant Étincelant / Perle Scintillante', short: 'DÉ/PS', d: '2021-11-19', vg: 'brilliant-diamond-shining-pearl', mv: ['brilliant-diamond-shining-pearl'], dex: ['original-sinnoh'], ver: ['brilliant-diamond', 'shining-pearl'], kind: 'main', evoVg: 'diamond-pearl' },
  { id: 'swcrown', fr: 'Épée / Bouclier : Les Terres enneigées de la Couronne', short: 'ÉB Couronneige', d: '2020-10-22', vg: 'the-crown-tundra', mv: ['sword-shield', 'the-crown-tundra'], dex: ['crown-tundra'], ver: ['the-crown-tundra-sword', 'the-crown-tundra-shield'], kind: 'dlc' },
  { id: 'swisle', fr: 'Épée / Bouclier : L’Île solitaire de l’Armure', short: 'ÉB Isolarmure', d: '2020-06-17', vg: 'the-isle-of-armor', mv: ['sword-shield', 'the-isle-of-armor'], dex: ['isle-of-armor'], ver: ['the-isle-of-armor-sword', 'the-isle-of-armor-shield'], kind: 'dlc' },
  { id: 'sw', fr: 'Épée / Bouclier', short: 'Épée/Bouclier', d: '2019-11-15', vg: 'sword-shield', mv: ['sword-shield'], dex: ['galar', 'isle-of-armor', 'crown-tundra'], ver: ['sword', 'shield'], kind: 'main' },
  { id: 'lgpe', fr: 'Let’s Go, Pikachu / Évoli', short: 'Let’s Go', d: '2018-11-16', vg: 'lets-go-pikachu-lets-go-eevee', mv: ['lets-go-pikachu-lets-go-eevee'], dex: ['letsgo-kanto'], ver: ['lets-go-pikachu', 'lets-go-eevee'], kind: 'main' },
  { id: 'usum', fr: 'Ultra-Soleil / Ultra-Lune', short: 'Ultra-Soleil/Lune', d: '2017-11-17', vg: 'ultra-sun-ultra-moon', mv: ['ultra-sun-ultra-moon'], dex: ['updated-alola'], info: ['updated-melemele', 'updated-akala', 'updated-ulaula', 'updated-poni'], ver: ['ultra-sun', 'ultra-moon'], kind: 'main' },
  { id: 'sm', fr: 'Soleil / Lune', short: 'Soleil/Lune', d: '2016-11-18', vg: 'sun-moon', mv: ['sun-moon'], dex: ['original-alola'], info: ['original-melemele', 'original-akala', 'original-ulaula', 'original-poni'], ver: ['sun', 'moon'], kind: 'main' },
  { id: 'oras', fr: 'Rubis Oméga / Saphir Alpha', short: 'Rubis Oméga/Saphir Alpha', d: '2014-11-21', vg: 'omega-ruby-alpha-sapphire', mv: ['omega-ruby-alpha-sapphire'], dex: ['updated-hoenn'], ver: ['omega-ruby', 'alpha-sapphire'], kind: 'main' },
  { id: 'xy', fr: 'X / Y', short: 'X/Y', d: '2013-10-12', vg: 'x-y', mv: ['x-y'], dex: ['kalos-central', 'kalos-coastal', 'kalos-mountain'], ver: ['x', 'y'], kind: 'main' },
  { id: 'b2w2', fr: 'Noir 2 / Blanc 2', short: 'Noir 2/Blanc 2', d: '2012-06-23', vg: 'black-2-white-2', mv: ['black-2-white-2'], dex: ['updated-unova'], ver: ['black-2', 'white-2'], kind: 'main' },
  { id: 'bw', fr: 'Noir / Blanc', short: 'Noir/Blanc', d: '2010-09-18', vg: 'black-white', mv: ['black-white'], dex: ['original-unova'], ver: ['black', 'white'], kind: 'main' },
  { id: 'hgss', fr: 'Or HeartGold / Argent SoulSilver', short: 'HeartGold/SoulSilver', d: '2009-09-12', vg: 'heartgold-soulsilver', mv: ['heartgold-soulsilver'], dex: ['updated-johto'], ver: ['heartgold', 'soulsilver'], kind: 'main' },
  { id: 'pt', fr: 'Platine', short: 'Platine', d: '2008-09-13', vg: 'platinum', mv: ['platinum'], dex: ['extended-sinnoh'], ver: ['platinum'], kind: 'main' },
  { id: 'dp', fr: 'Diamant / Perle', short: 'Diamant/Perle', d: '2006-09-28', vg: 'diamond-pearl', mv: ['diamond-pearl'], dex: ['original-sinnoh'], ver: ['diamond', 'pearl'], kind: 'main' },
  { id: 'e', fr: 'Émeraude', short: 'Émeraude', d: '2004-09-16', vg: 'emerald', mv: ['emerald'], dex: ['hoenn'], ver: ['emerald'], kind: 'main' },
  { id: 'frlg', fr: 'Rouge Feu / Vert Feuille', short: 'Rouge Feu/Vert Feuille', d: '2004-01-29', vg: 'firered-leafgreen', mv: ['firered-leafgreen'], dex: ['kanto'], ver: ['firered', 'leafgreen'], kind: 'main' },
  { id: 'rs', fr: 'Rubis / Saphir', short: 'Rubis/Saphir', d: '2002-11-21', vg: 'ruby-sapphire', mv: ['ruby-sapphire'], dex: ['hoenn'], ver: ['ruby', 'sapphire'], kind: 'main' },
  { id: 'c', fr: 'Cristal', short: 'Cristal', d: '2000-12-14', vg: 'crystal', mv: ['crystal'], dex: ['original-johto'], ver: ['crystal'], kind: 'main' },
  { id: 'gs', fr: 'Or / Argent', short: 'Or/Argent', d: '1999-11-21', vg: 'gold-silver', mv: ['gold-silver'], dex: ['original-johto'], ver: ['gold', 'silver'], kind: 'main' },
  { id: 'y', fr: 'Jaune', short: 'Jaune', d: '1998-09-12', vg: 'yellow', mv: ['yellow'], dex: ['kanto'], ver: ['yellow'], kind: 'main' },
  { id: 'rb', fr: 'Rouge / Bleu', short: 'Rouge/Bleu', d: '1996-02-27', vg: 'red-blue', mv: ['red-blue'], dex: ['kanto'], ver: ['red', 'blue'], kind: 'main' },
];
export const EXCLUDED = [
  ['Pokémon Colosseum / XD', 'pas de Pokédex régional (PokéAPI n’en fournit pas)'],
  ['Pokémon Champions', 'jeu de combat hors série principale / Légendes ; Pokédex de 231 entrées présent dans PokéAPI mais non demandé'],
  ['Rouge/Vert/Bleu (Japon)', 'même Pokédex que Rouge/Bleu'],
];
