# Pokédex (FR) – PWA hors-ligne

Site statique dans `docs/` (HTML/CSS/JS sans framework ni backend), publié par GitHub Pages (branche `main`, dossier `/docs`) :
https://sigjouea.github.io/pokedex/

## Fonctions
- Recherche instantanée sans accents, filtres type / génération / catégorie / tri, grille ou liste.
- **Jeux** : Pokémon HOME, Pokémon GO, puis 27 jeux (série principale + Légendes + DLC) du plus récent au plus ancien. Un jeu choisi = seuls les Pokémon (et formes) de son Pokédex régional, triés et numérotés selon ce Pokédex (numéro régional affiché sur la carte, numéro national en gris).
- **Formes** (bouton dans l'en-tête, masquées par défaut) : régionales, Méga, Primo, Gigamax, multi-formes (Zarbi, Flabébé, Vivaldaim…), mâle/femelle. Sélecteur de formes sur la fiche.
- **Fiche par jeu** : stats / types / talents / objets tenus / attaques / évolutions tels qu'à l'époque du jeu, Pokédex FR, numéros régionaux.
- **Pokémon GO** : stats ATT/DEF/END, PC max (niv. 50 et 51), attaques avec DPS, distance compagnon, coûts d'évolution, shiny, statut de sortie.
- Capturés (Poké Ball), shiny et favoris dans `localStorage` (`caught`, `shiny`, `favs`) ; export / import JSON.
- Hors-ligne : service worker (coquille + données), images en cache sur demande ou en arrière-plan.

## Lancer en local
    python3 -m http.server 8765 --directory docs
puis http://localhost:8765 (le service worker exige localhost ou HTTPS).

## Reconstruire les données (Node 20+, Internet)
    cd build && npm install
    node fetch-pokeapi.mjs   # PokéAPI -> build/.cache (reprise possible, concurrence limitée, nouvelles tentatives)
    node fetch-go.mjs        # PokeMiners game_masters + pogoapi.net -> build/.cache
    node fetch-images.mjs    # illustrations -> docs/img/{clé}.webp (256 px) et docs/img/s/{clé}.webp (shiny)
    node build-data.mjs      # -> docs/data/*.json (efface et recrée docs/data)
    node make-icons.mjs      # icônes PWA (facultatif)
    node test.mjs 8765       # tests Chrome headless (360 px et 1000 px), captures dans ../screenshots
Après toute modification de `docs/`, incrémenter `VERSION` dans `docs/sw.js` (et `DATA_VERSION` si le format des JSON change).

## Fichiers de données (`docs/data/`)
| Fichier | Contenu | Chargement |
|---|---|---|
| `core.json` (~240 Ko) | liste des 1 591 entrées (espèces + formes), types, tables de types par génération, catalogue des jeux | au démarrage |
| `dex/{jeu}.json` | Pokédex régional d'un jeu (ordre + numéros) | au choix du jeu |
| `sp/{id}.json` | une espèce : textes, stats passées, talents, objets, attaques par jeu, GO, pour chaque forme | à l'ouverture d'une fiche |
| `evo.json`, `moves.json`, `ref.json`, `go.json` | évolutions (FR), attaques, talents/objets, attaques GO | à la première fiche |

Clés d'entrée : `25` (espèce de base), `26-alola`, `25-female`, `6-mega-x`, `25-gmax`, `201-b`… Dans `localStorage`, la base reste un entier (compatible avec les anciennes sauvegardes), les formes sont des chaînes (`"26-alola"`).

## Règles de numérotation régionale
Les Pokédex viennent de PokéAPI (`/pokedex/{nom}`). Jeux à plusieurs Pokédex : fusion dans l'ordre indiqué, un Pokémon garde le numéro de son premier Pokédex (le Pokédex d'origine est affiché) :
- Écarlate/Violet : Paldea → Kitakami → Myrtille (664) ; Épée/Bouclier : Galar → Isolarmure → Couronneige (584) ; X/Y : Centre → Côtes → Monts (457).
- Soleil/Lune et Ultra-Soleil/Ultra-Lune : Pokédex d'Alola (numéro principal) ; les numéros par île sont indiqués sur la fiche.
- Légendes Z-A : Pokédex de Lumiose ; Méga-Dimension : Pokédex Hyperespace. DLC de SV / EB : leur propre Pokédex.
- Home et GO : ordre national.
Exclus : Colosseum / XD (aucun Pokédex régional dans PokéAPI), Pokémon Champions (jeu de combat), versions japonaises Rouge/Vert/Bleu (même Pokédex que Rouge/Bleu).

## Formes
Les formes proviennent de `pokemon` / `pokemon-form` de PokéAPI. Femelles : formes « dimorphisme » ajoutées d'après les rendus HOME quand `has_gender_differences` (à partir de la génération IV). Sont exclus : Totems, Pikachu casquettes cosplay, formes sans illustration. Les formes identiques à l'octet près à une autre sont fusionnées (`build/art-dupes.json`). Disponibilité d'une forme par jeu : déduite des données d'attaques de PokéAPI + règles (Gigamax = Épée/Bouclier, Méga = jeux compatibles et Pokédex du jeu, féminin ≥ gén. IV) – approximative.

## Pokémon GO
Source principale : PokeMiners `game_masters` (`latest/latest.json`, daté dans `go.json`) ; liste des Pokémon sortis / shiny / Méga : pogoapi.net. PC max = formule officielle `floor((ATT+15)·√(DEF+15)·√(END+15)·cpm²/10)`, vérifiée (Mewtwo 4 724, Leuphorie 3 117 au niveau 50). Aucune valeur n'est inventée : une donnée absente n'est pas affichée (la distance d'éclosion n'est pas dans la source ; le statut shiny est au niveau espèce). Pied de page : « Données GO : communautaires, non officielles ».

## Limites connues
Pas de lieux / rencontres. Textes Pokédex FR seulement à partir de Noir/Blanc (PokéAPI). Pas de numéros de CT. Illustrations : officielles (PokéAPI sprites) ou rendus HOME pour certaines formes (style mixte). Les illustrations shiny (~19 Mo) ne sont mises en cache que lorsqu'on les ouvre.

## Taille
`docs/` ≈ 52 Mo (images ≈ 44 Mo dont shiny 19 Mo à la demande, données ≈ 6 Mo, ≈ 1,5 Mo compressées).
