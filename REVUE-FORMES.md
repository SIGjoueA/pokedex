# Revue des formes — marques partagées ou séparées

*Pokédex FR — revue préparée le 10 octobre 2026. Rapport uniquement : rien n’est encore implémenté.*

Point de départ : les masques d’Ogerpon ne partagent pas la marque « Capturé ». Ogerpon n’est qu’un seul Pokémon qui change de forme en changeant de masque : en attraper un, c’est avoir toutes ses formes dans ce jeu.

**Périmètre** : les 210 espèces de l’app qui ont au moins deux formes « hors combat » (sont exclues les formes de combat déjà gérées — Primo, Morphéo, Mode Transe, Forme Parfaite, Ultra-Necrozma, Météno, Mimiqui, etc. —, les Méga-Évolutions et les Gigamax).

**Sources** : Bulbapedia (pages « List of Pokémon with form differences » et pages espèces), Serebii (pages espèces et objets : Miroir Sacré, Pointeau ADN, Vase Scellé, catalogue Motisma, nectars, ROM, Plaques), Poképedia (noms français des formes et des objets). Les points que je n’ai pas pu confirmer sont marqués « à vérifier ».

**Classement**
- **a — interchangeable** (27 espèces) : le même individu peut changer de forme (objet tenu, objet clé, capacité, saison…) → les formes devraient partager les marques *dans les jeux où le changement est possible*.
- **b — à capturer séparément** (177 espèces dont les différences de sexe) : forme fixée pour toujours par individu (forme régionale, sexe, motif, taille, crème, casquette, Gigamax…). L’app fait déjà ce qu’il faut.
- **c — douteux** (6 espèces) : formes purement esthétiques, invisibles ou non obtenables, à trancher.

**Comportement actuel de l’app (pour toutes les espèces)** : chaque forme hors combat a sa propre clé (`493-fire`, `1017-wellspring-mask`…) avec ses marques à elle (Capturé, Shiny, Baron, marques HOME). Aucun lien entre les formes, sauf pour les formes de combat (`bo`) qui héritent de la base. Autre point : dans la liste d’un jeu, une forme n’apparaît que si les données la disent « disponible dans ce jeu ». Or ces données viennent des movepools par forme de PokéAPI, qui manquent pour plusieurs formes obtenues par transformation. Résultat : certaines formes interchangeables sont **masquées** dans des jeux où on peut les avoir (Dialga/Palkia Originels, Hoopa Déchaîné, formes Totémiques dans Légendes Arceus, Amovénus Totémique…).


## (a) Formes interchangeables — devraient partager les marques (27 espèces)

| N° | Pokémon | Formes | Changement possible (jeux de l’app) | Détails / jeux où c’est impossible | Comportement actuel de l’app |
|---|---|---|---|---|---|
| 386 | Deoxys | Normale / Attaque / Défense / Vitesse | Rubis Oméga / Saphir Alpha | RS : Normale fixe ; Émeraude : Vitesse fixe (forme imposée par le jeu, pas de changement). ROSA : Météorite (objet clé). | Marques séparées par forme ❌ |
| 412 | Cheniti | Cape Plante / Sable / Déchet | Diamant / Perle, Platine, X / Y, Diamant Étincelant / Perle Scintillante | Change de cape après un combat selon le terrain. Légendes Arceus : cape fixe (forme de l’individu sauvage) → à vérifier, traité comme non changeable. | Marques séparées par forme ❌ |
| 479 | Motisma | Normale / Chaleur / Lavage / Froid / Hélice / Tonte | Platine, X / Y, Épée / Bouclier, Écarlate / Violet, ÉV Disque Indigo | Pt : appareils du Manoir ; XY : cartons d’appareils ; ÉB : catalogue Motisma ; ÉV : catalogue Motisma. Légendes Arceus / Z-A Méga-Dimension : formes absentes des données de l’app → à vérifier (c). | Marques séparées par forme ❌ |
| 483 | Dialga | Alternative / Originelle | Légendes Arceus | Légendes Arceus : Cristal Adamant (Ruines Ancestrales). DP / Pt / DÉPS : forme Originelle inexistante. Dans l’app, la forme Originelle n’est disponible dans AUCUN jeu (données PokéAPI). | Marques séparées par forme ❌ ; formes masquées : Légendes Arceus (1/1 formes absentes) |
| 484 | Palkia | Alternative / Originelle | Légendes Arceus | Légendes Arceus : Orbe Perlé / Cristal Perlé. DP / Pt / DÉPS : forme Originelle inexistante. Dans l’app, forme Originelle disponible dans aucun jeu. | Marques séparées par forme ❌ ; formes masquées : Légendes Arceus (1/1 formes absentes) |
| 487 | Giratina | Alternative / Originelle | Platine, Légendes Arceus | Pt : Orbe Platiné (tenu) ; Légendes Arceus : Orbe Platiné / Ruines Ancestrales. DP : forme Originelle inexistante (base seulement ; Giratina hors dex régional dans l’app). | Marques séparées par forme ❌ |
| 492 | Shaymin | Terrestre / Céleste | Légendes Arceus | Fleur Gracidée. Revient en forme Terrestre la nuit / si gelé / déposé (selon jeu). Seul jeu de l’app où Shaymin figure : Légendes Arceus. | Marques séparées par forme ❌ |
| 493 | Arceus | 18 types (Plaques) + « ??? » | Légendes Arceus | Change selon la Plaque tenue / choisie (Légendes Arceus : Plaque Légende). La forme « ??? » (493-unknown) n’est pas obtenable légitimement → voir (c). | Marques séparées par forme ❌ |
| 585 | Vivaldaim | Printemps / Été / Automne / Hiver | Noir / Blanc, Noir 2 / Blanc 2 | NB / N2B2 : la forme suit la saison réelle (change tout seul chaque mois) → un seul individu « est » toutes les formes. ÉV (+ Disque Indigo) : forme fixée par individu (b). | Marques séparées par forme ❌ |
| 586 | Haydaim | Printemps / Été / Automne / Hiver | Noir / Blanc, Noir 2 / Blanc 2 | Comme Vivaldaim. ÉV : forme fixe par individu (b). | Marques séparées par forme ❌ |
| 641 | Boréas | Avatar / Totémique | Noir 2 / Blanc 2, Légendes Arceus | Miroir Sacré (N2B2, ROSA, SL/USUL, ÉB, Légendes Arceus, ÉV). NB : forme Totémique inexistante. Dans l’app, Totémique absente de Légendes Arceus → écart. | Marques séparées par forme ❌ ; formes masquées : Légendes Arceus (1/1 formes absentes) |
| 642 | Fulguris | Avatar / Totémique | Noir 2 / Blanc 2, Légendes Arceus | Idem Boréas. Totémique absente de Légendes Arceus dans l’app. | Marques séparées par forme ❌ ; formes masquées : Légendes Arceus (1/1 formes absentes) |
| 645 | Démétéros | Avatar / Totémique | Noir 2 / Blanc 2, Légendes Arceus | Idem Boréas. Totémique absente de Légendes Arceus dans l’app. | Marques séparées par forme ❌ ; formes masquées : Légendes Arceus (1/1 formes absentes) |
| 646 | Kyurem | Normal / Blanc / Noir | Noir 2 / Blanc 2 | Pointeau ADN avec Reshiram/Zekrom (N2B2, SL/USUL, ÉB Couronneige, ÉV Disque Indigo). NB : fusion inexistante. | Marques séparées par forme ❌ |
| 647 | Keldeo | Normale / Décidée | Noir 2 / Blanc 2 | Forme Décidée tant qu’il connaît Lame Ointe (N2B2+). Z-A Méga-Dimension : Keldeo présent, forme Décidée non listée → à vérifier. | Marques séparées par forme ❌ |
| 649 | Genesect | Normal / 4 Modules (Aqua, Choc, Pyro, Cryo) | Noir / Blanc, Noir 2 / Blanc 2, Z-A Méga-Dimension | Change selon le Module tenu. Z-A Méga-Dimension : Modules présents dans les données de l’app → à confirmer en jeu. | Marques séparées par forme ❌ |
| 676 | Couafarel | Sauvage + 9 coupes | X / Y, Légendes Z-A | XY : toiletteur d’Illumis (coupe expire après 5 jours) ; Légendes Z-A : toiletteur à Illumis. USUL : pas de toiletteur → coupes non changeables (à vérifier). | Marques séparées par forme ❌ |
| 718 | Zygarde | 50 % / 10 % | Soleil / Lune, Ultra-Soleil / Ultra-Lune | SL / USUL : Fusiorateur Zygarde (changement libre 10 % ↔ 50 %). XY : 50 % seulement. Z-A / Méga-Dimension : 10 % non listé → à vérifier. Forme Parfaite = combat (déjà gérée). | Marques séparées par forme ❌ |
| 720 | Hoopa | Enchaîné / Déchaîné | — (aucun jeu de l’app ne liste la forme) | Vase Scellé (ROSA, SL/USUL, ÉB, ÉV). XY : Déchaîné inexistant. Z-A Méga-Dimension : Hoopa présent, Déchaîné non listé → à vérifier. Dans l’app, Déchaîné disponible dans aucun jeu. | Marques séparées par forme ❌ |
| 741 | Plumeline | Flamenco / Pom-pom / Hula / Buyō | Soleil / Lune, Ultra-Soleil / Ultra-Lune | Nectars (SL/USUL). ÉV (+ DLC) : forme selon le biome de capture ; nectars présents ? → à vérifier (c pour ÉV). | Marques séparées par forme ❌ |
| 773 | Silvallié | 18 types (ROM) | Soleil / Lune, Ultra-Soleil / Ultra-Lune, Épée / Bouclier | Change selon la ROM tenue (SL, USUL, ÉB, ÉV Disque Indigo). | Marques séparées par forme ❌ |
| 800 | Necrozma | Normal / Crinière du Couchant / Ailes de l’Aurore | Ultra-Soleil / Ultra-Lune | Moniteur Solgaleo / Lunala (USUL, ÉB Couronneige, ÉV Disque Indigo). SL : fusion inexistante. Ultra-Necrozma = combat (déjà géré). | Marques séparées par forme ❌ |
| 888 | Zacian | Héros Aguerri / Roi des Épées | Épée / Bouclier | Roi des Épées en tenant l’Épée Rouillée (ÉB ; ÉV Disque Indigo). | Marques séparées par forme ❌ |
| 889 | Zamazenta | Héros Aguerri / Roi des Boucliers | Épée / Bouclier | Roi des Boucliers en tenant le Bouclier Rouillé. | Marques séparées par forme ❌ |
| 898 | Sylveroy | Normal / Cavalier du Froid / Cavalier d’Effroi | ÉB Couronneige | Rênes de l’Unité avec Blizzeval / Spectreval (ÉB Couronneige, ÉV Disque Indigo). | Marques séparées par forme ❌ |
| 905 | Amovénus | Avatar / Totémique | Légendes Arceus | Miroir Sacré (Légendes Arceus, ÉV). Dans l’app, la forme Totémique n’est disponible dans aucun jeu → écart. | Marques séparées par forme ❌ ; formes masquées : Légendes Arceus (1/1 formes absentes) |
| 1017 | Ogerpon | Masque Turquoise / du Puits / du Fourneau / de la Pierre | ÉV Masque Turquoise | Change selon le masque tenu (ÉV Masque Turquoise / Disque Indigo). Le masque Turquoise est la forme de base. | Marques séparées par forme ❌ |

## (c) Cas douteux (6 espèces)

| N° | Pokémon | Formes | Changement possible | Analyse | Comportement actuel |
|---|---|---|---|---|---|
| 414 | Papilord | Papilord « Plante / Sable / Déchet » | — (aucun jeu de l’app ne liste la forme) | Papilord n’a pas de formes visibles (cape héritée de Cheniti mais invisible ; HOME n’en compte qu’une). Proposer de fusionner en une seule forme. | Marques séparées par forme (comptées dans les totaux) |
| 664 | Lépidonille | Lépidonille : 20 motifs | — (aucun jeu de l’app ne liste la forme) | Motif invisible (seul Prismillon l’affiche ; HOME ne compte pas de formes pour Lépidonille). Proposer de fusionner en une seule forme. | Marques séparées par forme (comptées dans les totaux) |
| 665 | Pérégrain | Pérégrain : 20 motifs | — (aucun jeu de l’app ne liste la forme) | Idem Lépidonille → fusionner. | Marques séparées par forme (comptées dans les totaux) |
| 716 | Xerneas | Mode Actif / Mode Paisible | — (aucun jeu de l’app ne liste la forme) | Mode Paisible = apparence hors combat, même individu (comme une forme de combat inversée). Proposer de le traiter comme « forme de combat » (hérite des marques de la base, non compté). | Marques séparées par forme (comptées dans les totaux) |
| 1007 | Koraidon | Forme Ultime + formes de déplacement (Sprint / Planeur) | — (aucun jeu de l’app ne liste la forme) | Formes de monture de l’histoire, non capturables séparément (le Koraidon de combat ou le second exemplaire sont en forme Ultime). Proposer de les traiter comme formes de combat. | Marques séparées par forme (comptées dans les totaux) |
| 1008 | Miraidon | Mode Ultime + modes de déplacement (Conduite / Planeur) | — (aucun jeu de l’app ne liste la forme) | Comme Koraidon : formes de monture → traiter comme formes de combat. | Marques séparées par forme (comptées dans les totaux) |

## (b) Formes à capturer séparément (81 espèces + 96 différences de sexe)

| N° | Pokémon | Formes (clés) | Raison | Comportement actuel |
|---|---|---|---|---|
| 19 | Rattata | 3 formes (base, female, alola) | Forme d’Alola + différence de sexe : distincts. | Marques séparées ✅ |
| 20 | Rattatac | 3 formes (base, female, alola) | Forme d’Alola + différence de sexe : distincts. | Marques séparées ✅ |
| 25 | Pikachu | 10 formes (base, female, original-cap, hoenn-cap, sinnoh-cap, unova-cap, kalos-cap, alola-cap, partner-cap, world-cap) | Casquettes (événements) + différence de sexe : individus distincts. | Marques séparées ✅ |
| 26 | Raichu | 3 formes (base, female, alola) | Forme d’Alola + différence de sexe : distincts. | Marques séparées ✅ |
| 27 | Sabelette | 2 formes (base, alola) | Forme régionale : espèce régionale distincte. | Marques séparées ✅ |
| 28 | Sablaireau | 2 formes (base, alola) | Forme régionale : espèce régionale distincte. | Marques séparées ✅ |
| 37 | Goupix | 2 formes (base, alola) | Forme régionale : espèce régionale distincte. | Marques séparées ✅ |
| 38 | Feunard | 2 formes (base, alola) | Forme régionale : espèce régionale distincte. | Marques séparées ✅ |
| 50 | Taupiqueur | 2 formes (base, alola) | Forme régionale : espèce régionale distincte. | Marques séparées ✅ |
| 51 | Triopikeur | 2 formes (base, alola) | Forme régionale : espèce régionale distincte. | Marques séparées ✅ |
| 52 | Miaouss | 3 formes (base, alola, galar) | Forme régionale : espèce régionale distincte. | Marques séparées ✅ |
| 53 | Persian | 2 formes (base, alola) | Forme régionale : espèce régionale distincte. | Marques séparées ✅ |
| 58 | Caninos | 2 formes (base, hisui) | Forme régionale : espèce régionale distincte. | Marques séparées ✅ |
| 59 | Arcanin | 2 formes (base, hisui) | Forme régionale : espèce régionale distincte. | Marques séparées ✅ |
| 74 | Racaillou | 2 formes (base, alola) | Forme régionale : espèce régionale distincte. | Marques séparées ✅ |
| 75 | Gravalanch | 2 formes (base, alola) | Forme régionale : espèce régionale distincte. | Marques séparées ✅ |
| 76 | Grolem | 2 formes (base, alola) | Forme régionale : espèce régionale distincte. | Marques séparées ✅ |
| 77 | Ponyta | 2 formes (base, galar) | Forme régionale : espèce régionale distincte. | Marques séparées ✅ |
| 78 | Galopa | 2 formes (base, galar) | Forme régionale : espèce régionale distincte. | Marques séparées ✅ |
| 79 | Ramoloss | 2 formes (base, galar) | Forme régionale : espèce régionale distincte. | Marques séparées ✅ |
| 80 | Flagadoss | 2 formes (base, galar) | Forme régionale : espèce régionale distincte. | Marques séparées ✅ |
| 83 | Canarticho | 2 formes (base, galar) | Forme régionale : espèce régionale distincte. | Marques séparées ✅ |
| 88 | Tadmorv | 2 formes (base, alola) | Forme régionale : espèce régionale distincte. | Marques séparées ✅ |
| 89 | Grotadmorv | 2 formes (base, alola) | Forme régionale : espèce régionale distincte. | Marques séparées ✅ |
| 100 | Voltorbe | 2 formes (base, hisui) | Forme régionale : espèce régionale distincte. | Marques séparées ✅ |
| 101 | Électrode | 2 formes (base, hisui) | Forme régionale : espèce régionale distincte. | Marques séparées ✅ |
| 103 | Noadkoko | 2 formes (base, alola) | Forme régionale : espèce régionale distincte. | Marques séparées ✅ |
| 105 | Ossatueur | 2 formes (base, alola) | Forme régionale : espèce régionale distincte. | Marques séparées ✅ |
| 110 | Smogogo | 2 formes (base, galar) | Forme régionale : espèce régionale distincte. | Marques séparées ✅ |
| 122 | M. Mime | 2 formes (base, galar) | Forme régionale : espèce régionale distincte. | Marques séparées ✅ |
| 128 | Tauros | 4 formes (base, paldea-combat-breed, paldea-blaze-breed, paldea-aqua-breed) | Races de Paldea : individus distincts. | Marques séparées ✅ |
| 144 | Artikodin | 2 formes (base, galar) | Forme régionale : espèce régionale distincte. | Marques séparées ✅ |
| 145 | Électhor | 2 formes (base, galar) | Forme régionale : espèce régionale distincte. | Marques séparées ✅ |
| 146 | Sulfura | 2 formes (base, galar) | Forme régionale : espèce régionale distincte. | Marques séparées ✅ |
| 157 | Typhlosion | 2 formes (base, hisui) | Forme régionale : espèce régionale distincte. | Marques séparées ✅ |
| 172 | Pichu | 2 formes (base, spiky-eared) | Pichu Troizépi (événement HGSS) : individu distinct. | Marques séparées ✅ |
| 194 | Axoloto | 3 formes (base, female, paldea) | Forme de Paldea + différence de sexe : distincts. | Marques séparées ✅ |
| 199 | Roigada | 2 formes (base, galar) | Forme régionale : espèce régionale distincte. | Marques séparées ✅ |
| 201 | Zarbi | 28 formes (base, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, r, s, t, u, v, w, x, y, z, exclamation, question) | 28 formes fixes par individu. | Marques séparées ✅ |
| 211 | Qwilfish | 2 formes (base, hisui) | Forme régionale : espèce régionale distincte. | Marques séparées ✅ |
| 215 | Farfuret | 4 formes (base, female, hisui-female, hisui) | Forme de Hisui + différence de sexe : distincts. | Marques séparées ✅ |
| 222 | Corayon | 2 formes (base, galar) | Forme régionale : espèce régionale distincte. | Marques séparées ✅ |
| 263 | Zigzaton | 2 formes (base, galar) | Forme régionale : espèce régionale distincte. | Marques séparées ✅ |
| 264 | Linéon | 2 formes (base, galar) | Forme régionale : espèce régionale distincte. | Marques séparées ✅ |
| 413 | Cheniselle | 3 formes (base, sandy, trash) | Cheniselle : cape fixée à l’évolution. | Marques séparées ✅ |
| 422 | Sancoki | 2 formes (base, east) | Mer Occident / Orient : fixe. | Marques séparées ✅ |
| 423 | Tritosor | 2 formes (base, east) | Mer Occident / Orient : fixe. | Marques séparées ✅ |
| 503 | Clamiral | 2 formes (base, hisui) | Forme régionale : espèce régionale distincte. | Marques séparées ✅ |
| 549 | Fragilady | 2 formes (base, hisui) | Forme régionale : espèce régionale distincte. | Marques séparées ✅ |
| 550 | Bargantua | 3 formes (base, white-striped, blue-striped) | Motifs rouge / bleu / blanc : fixes (le blanc évolue en Paragruel). | Marques séparées ✅ |
| 554 | Darumarond | 2 formes (base, galar) | Forme régionale : espèce régionale distincte. | Marques séparées ✅ |
| 555 | Darumacho | 2 formes (base, galar-standard) | Galar (Mode Normal) : forme régionale ; Mode Transe = combat. | Marques séparées ✅ |
| 562 | Tutafeh | 2 formes (base, galar) | Forme régionale : espèce régionale distincte. | Marques séparées ✅ |
| 570 | Zorua | 2 formes (base, hisui) | Forme régionale : espèce régionale distincte. | Marques séparées ✅ |
| 571 | Zoroark | 2 formes (base, hisui) | Forme régionale : espèce régionale distincte. | Marques séparées ✅ |
| 618 | Limonde | 2 formes (base, galar) | Forme régionale : espèce régionale distincte. | Marques séparées ✅ |
| 628 | Gueriaigle | 2 formes (base, hisui) | Forme régionale : espèce régionale distincte. | Marques séparées ✅ |
| 666 | Prismillon | 20 formes (base, icy-snow, polar, tundra, continental, garden, elegant, modern, marine, archipelago, high-plains, sandstorm, river, monsoon, savanna, sun, ocean, jungle, fancy, poke-ball) | Motif fixé par individu (région / événement). | Marques séparées ✅ |
| 669 | Flabébé | 5 formes (base, yellow, orange, blue, white) | Couleur de fleur fixe. | Marques séparées ✅ |
| 670 | Floette | 6 formes (base, yellow, orange, blue, white, eternal) | Couleurs fixes. ⚠ Fleur Éternelle : jamais distribuée légitimement → proposer de la marquer « non obtenable » (hors totaux). | Marques séparées ✅ |
| 671 | Florges | 5 formes (base, yellow, orange, blue, white) | Couleur de fleur fixe. | Marques séparées ✅ |
| 705 | Colimucus | 2 formes (base, hisui) | Forme régionale : espèce régionale distincte. | Marques séparées ✅ |
| 706 | Muplodocus | 2 formes (base, hisui) | Forme régionale : espèce régionale distincte. | Marques séparées ✅ |
| 710 | Pitrouille | 4 formes (base, small, large, super) | Taille fixe. | Marques séparées ✅ |
| 711 | Banshitrouye | 4 formes (base, small, large, super) | Taille fixe. | Marques séparées ✅ |
| 713 | Séracrawl | 2 formes (base, hisui) | Forme régionale : espèce régionale distincte. | Marques séparées ✅ |
| 724 | Archéduc | 2 formes (base, hisui) | Forme régionale : espèce régionale distincte. | Marques séparées ✅ |
| 745 | Lougaroc | 3 formes (base, midnight, dusk) | Diurne / Nocturne / Crépusculaire : fixée à l’évolution. | Marques séparées ✅ |
| 801 | Magearna | 2 formes (base, original) | Couleur du Passé : individu distinct (événement). | Marques séparées ✅ |
| 849 | Salarsen | 2 formes (base, low-key) | Aigüe / Grave : fixée par la nature à l’évolution. | Marques séparées ✅ |
| 869 | Charmilly | 63 formes (base, ruby-cream-strawberry-sweet, matcha-cream-strawberry-sweet, mint-cream-strawberry-sweet, lemon-cream-strawberry-sweet, salted-cream-strawberry-sweet, ruby-swirl-strawberry-sweet, caramel-swirl-strawberry-sweet, rainbow-swirl-strawberry-sweet, vanilla-cream-berry-sweet, ruby-cream-berry-sweet, matcha-cream-berry-sweet, mint-cream-berry-sweet, lemon-cream-berry-sweet, salted-cream-berry-sweet, ruby-swirl-berry-sweet, caramel-swirl-berry-sweet, rainbow-swirl-berry-sweet, vanilla-cream-love-sweet, ruby-cream-love-sweet, matcha-cream-love-sweet, mint-cream-love-sweet, lemon-cream-love-sweet, salted-cream-love-sweet, ruby-swirl-love-sweet, caramel-swirl-love-sweet, rainbow-swirl-love-sweet, vanilla-cream-star-sweet, ruby-cream-star-sweet, matcha-cream-star-sweet, mint-cream-star-sweet, lemon-cream-star-sweet, salted-cream-star-sweet, ruby-swirl-star-sweet, caramel-swirl-star-sweet, rainbow-swirl-star-sweet, vanilla-cream-clover-sweet, ruby-cream-clover-sweet, matcha-cream-clover-sweet, mint-cream-clover-sweet, lemon-cream-clover-sweet, salted-cream-clover-sweet, ruby-swirl-clover-sweet, caramel-swirl-clover-sweet, rainbow-swirl-clover-sweet, vanilla-cream-flower-sweet, ruby-cream-flower-sweet, matcha-cream-flower-sweet, mint-cream-flower-sweet, lemon-cream-flower-sweet, salted-cream-flower-sweet, ruby-swirl-flower-sweet, caramel-swirl-flower-sweet, rainbow-swirl-flower-sweet, vanilla-cream-ribbon-sweet, ruby-cream-ribbon-sweet, matcha-cream-ribbon-sweet, mint-cream-ribbon-sweet, lemon-cream-ribbon-sweet, salted-cream-ribbon-sweet, ruby-swirl-ribbon-sweet, caramel-swirl-ribbon-sweet, rainbow-swirl-ribbon-sweet) | 63 combinaisons crème × sucrerie : fixées à l’évolution. | Marques séparées ✅ |
| 892 | Shifours | 2 formes (base, rapid-strike) | Style Poing Final / Mille Poings : fixé à l’évolution. | Marques séparées ✅ |
| 893 | Zarude | 2 formes (base, dada) | Papa : individu distinct (événement). | Marques séparées ✅ |
| 901 | Ursaking | 2 formes (base, bloodmoon) | Lune Vermeille : individu distinct. | Marques séparées ✅ |
| 925 | Famignol | 2 formes (base, family-of-three) | Famille de trois / quatre : aléatoire à l’évolution. | Marques séparées ✅ |
| 931 | Tapatoès | 4 formes (base, blue-plumage, yellow-plumage, white-plumage) | 4 plumages fixes. | Marques séparées ✅ |
| 978 | Nigirigon | 3 formes (base, droopy, stretchy) | 3 formes fixes. | Marques séparées ✅ |
| 982 | Deusolourdo | 2 formes (base, three-segment) | Deux / Trois segments : aléatoire à l’évolution. | Marques séparées ✅ |
| 999 | Mordudor | 2 formes (base, roaming) | Forme Marche (Pokémon GO) : individu distinct. | Marques séparées ✅ |
| 1012 | Poltchageist | 2 formes (base, artisan) | Contrefaçon / Authentique : fixe (visuel quasi identique). | Marques séparées ✅ |
| 1013 | Théffroyable | 2 formes (base, masterpiece) | Médiocre / Exceptionnelle : fixe. | Marques séparées ✅ |

### Différences de sexe uniquement (96 espèces) — b, marques séparées ✅

3 Florizarre · 12 Papilusion · 41 Nosferapti · 42 Nosferalto · 44 Ortide · 45 Rafflesia · 64 Kadabra · 65 Alakazam · 84 Doduo · 85 Dodrio · 97 Hypnomade · 111 Rhinocorne · 112 Rhinoféros · 118 Poissirène · 119 Poissoroy · 123 Insécateur · 129 Magicarpe · 130 Léviator · 133 Évoli · 154 Méganium · 165 Coxy · 166 Coxyclaque · 178 Xatu · 185 Simularbre · 186 Tarpaud · 190 Capumain · 195 Maraiste · 198 Cornèbre · 202 Qulbutoké · 203 Girafarig · 207 Scorplane · 208 Steelix · 212 Cizayox · 214 Scarhino · 217 Ursaring · 221 Cochignon · 224 Octillery · 229 Démolosse · 232 Donphan · 255 Poussifeu · 256 Galifeu · 257 Braségali · 267 Charmillon · 269 Papinox · 272 Ludicolo · 274 Pifeuil · 275 Tengalice · 307 Méditikka · 308 Charmina · 315 Rosélia · 316 Gloupti · 317 Avaltout · 322 Chamallot · 323 Camérupt · 332 Cacturne · 350 Milobellus · 369 Relicanth · 396 Étourmi · 397 Étourvol · 398 Étouraptor · 399 Keunotor · 400 Castorno · 401 Crikzik · 402 Mélokrik · 403 Lixy · 404 Luxio · 405 Luxray · 407 Roserade · 415 Apitrini · 417 Pachirisu · 418 Mustébouée · 419 Mustéflott · 424 Capidextre · 443 Griknot · 444 Carmache · 445 Carchacrok · 449 Hippopotas · 450 Hippodocus · 453 Cradopaud · 454 Coatox · 456 Écayon · 457 Luminéon · 459 Blizzi · 460 Blizzaroi · 461 Dimoret · 464 Rhinastoc · 465 Bouldeneu · 473 Mammochon · 521 Déflaisan · 592 Viskuse · 593 Moyade · 668 Némélios · 678 Mistigrix · 876 Wimessir · 902 Paragruel · 916 Fragroin

## Écarts relevés (résumé)

1. **Toutes les espèces (a) ont des marques séparées par forme** (Ogerpon, Arceus, Silvallié, Motisma, Shaymin, Giratina, Dialga, Palkia, Kyurem, Necrozma, Sylveroy, Hoopa, Couafarel, Deoxys, Plumeline, Boréas, Fulguris, Démétéros, Amovénus, Zacian, Zamazenta, Genesect, Keldeo, Zygarde 10 %/50 %, Cheniti, Vivaldaim/Haydaim dans NB/N2B2). Pour la complétion, il faut aujourd’hui cocher chaque forme à la main.
2. **Formes interchangeables masquées** (absentes des données du jeu) :
   - Dialga / Palkia Originels : disponibles dans **aucun** jeu (devraient l’être dans Légendes Arceus).
   - Amovénus Totémique : aucun jeu (devrait être dans Légendes Arceus).
   - Boréas / Fulguris / Démétéros Totémiques : absents de Légendes Arceus.
   - Hoopa Déchaîné : aucun jeu (absent de XY, c’est normal ; Z-A Méga-Dimension à vérifier).
   - Motisma (formes appareils) : absentes de Légendes Arceus et de Z-A Méga-Dimension (à vérifier en jeu).
   - Keldeo Décidé, Zygarde 10 % : absents de Z-A / Méga-Dimension (à vérifier).
3. **Formes douteuses comptées dans les totaux** : Koraidon / Miraidon (formes de monture), Xerneas Mode Paisible, Papilord (3 « capes » invisibles), Lépidonille et Pérégrain (20 motifs invisibles chacun → 38 entrées de trop), Arceus « ??? » (non obtenable), Floette Fleur Éternelle (jamais distribuée).
4. Les cas (b) (formes régionales, sexes, Prismillon, Charmilly, Zarbi, Pitrouille, casquettes de Pikachu, Gigamax…) sont **déjà corrects**.

## Corrections proposées

1. **Groupes de formes liées par jeu** : une table `LINKED = { 1017: ['svmask', 'svdisk'], 493: ['la'], 479: ['pt', 'xy', 'sw', 'sv', 'svdisk'], … }` (espèce → jeux où le changement est possible, groupes de sauvegarde inclus).
2. **Rendre visibles les formes masquées** : surcharge de disponibilité dans `build-data.mjs` (comme celle qui existe pour Pitrouille) pour les formes listées au point 2, puis bump `DATA_VERSION` (d10).
3. **Cas (c)** : Koraidon / Miraidon (formes de monture) et Xerneas Paisible → traités comme formes de combat (`bo` → héritent de la base, hors totaux). Papilord / Lépidonille / Pérégrain → une seule entrée (les formes invisibles sont fusionnées dans la base, avec migration des marques). Arceus « ??? » et Floette Éternelle → retirés des totaux (ou masqués).
4. **Migration** : à la première ouverture, si une forme d’un groupe lié est cochée dans un jeu lié, cocher toutes les formes du groupe dans ce jeu (union, sans rien perdre). Tests + audit.

## Proposition : comportement des marques liées

| Marque | Proposition | Pourquoi |
|---|---|---|
| **Capturé** (par jeu) | Cocher une forme → toutes les formes de l’espèce sont cochées **dans ce jeu et son groupe de sauvegarde** (ex. ÉV + Masque Turquoise + Disque Indigo), **uniquement si le changement est possible dans ce jeu**. Décocher une forme → décoche toutes les formes liées (sinon on retombe dans l’incohérence). | C’est le même individu. |
| **Shiny** (par jeu) | Lié aussi. | Un Ogerpon shiny reste shiny quel que soit le masque. |
| **Baron** (Légendes Arceus / Z-A) | Lié aussi (Motisma dans Z-A, Arceus est exclu des Barons de toute façon). | Statut de l’individu. |
| **Jeux où le changement est impossible** | Pas de lien : chaque forme est cochée séparément (ex. Deoxys dans Émeraude, Kyurem dans NB, Necrozma dans SL, Hoopa dans XY). | La forme est imposée par le jeu. |
| **Marques HOME (origine / transfert)** | Liées aussi : une marque d’origine posée sur une forme vaut pour toutes les formes de l’espèce. **Option** : garder « HOME Pokédex des formes » séparé si Yann veut suivre l’enregistrement de chaque forme dans le Pokédex HOME (il faut alors redéposer le Pokémon dans chaque forme). | La marque d’origine appartient à l’individu, pas à la forme. Attention : certaines formes reviennent à la forme de base au dépôt (Shaymin Céleste, Hoopa Déchaîné et coupes de Couafarel dans les jeux 6G/7G ; Zacian/Zamazenta sans leur objet) — c’est sans effet sur un lien « individu ». |
| **Affichage** | Sur la fiche : petite note « Formes liées dans ce jeu — changement via [objet] ». Dans la liste avec « Formes » activé, les formes liées restent visibles, mais elles sont cochées ensemble. | Ça explique pourquoi cocher une forme coche les autres. |
| **Compteurs** | Option recommandée : dans un jeu lié, l’espèce compte **1** (la base), les autres formes liées ne sont plus comptées à part, comme les formes de combat. | Évite de gonfler les totaux avec des formes « gratuites ». |
