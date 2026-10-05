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
    node fetch-extra.mjs     # encounters, locations, TM/HM machines (PokéAPI) + GO egg pool (Leek Duck) -> build/.cache
    node fetch-go.mjs        # PokeMiners game_masters + pogoapi.net -> build/.cache
    node fetch-images.mjs    # illustrations -> docs/img/{clé}.webp (256 px) et docs/img/s/{clé}.webp (shiny)
    # textes Pokédex seulement en anglais (traduction automatique, une seule fois ; résultat versionné : build/translations-fr.json)
    #   node translate-prep.mjs && python3 translate.py && python3 translate-fix.py   (pip install argostranslate)
    node build-data.mjs      # -> docs/data/*.json (efface et recrée docs/data)
    node audit.mjs           # vérifications de cohérence (~100 faits connus)
    node make-icons.mjs      # icônes PWA (facultatif)
    node test.mjs 8765       # tests Chrome headless (360 px et 1000 px), captures dans ../screenshots
Après toute modification de `docs/`, incrémenter `VERSION` dans `docs/sw.js` (et `DATA_VERSION` si le format des JSON change).

## Fichiers de données (`docs/data/`)
| Fichier | Contenu | Chargement |
|---|---|---|
| `core.json` (~240 Ko) | liste des 1 591 entrées (espèces + formes), types, tables de types par génération, catalogue des jeux | au démarrage |
| `dex/{jeu}.json` | Pokédex régional d'un jeu (ordre + numéros) | au choix du jeu |
| `sp/{id}.json` | une espèce : textes, stats passées, talents, objets, attaques par jeu, GO, pour chaque forme | à l'ouverture d'une fiche |
| `evo.json`, `moves.json`, `ref.json`, `go.json`, `tm.json`, `loc.json` | évolutions (FR), attaques, talents/objets, attaques GO, numéros de CT/CS/DT par jeu, noms de lieux/méthodes de rencontre | à la première fiche |

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

## Rencontres, CT/CS, œufs GO, textes traduits
- **Rencontres** : PokéAPI `pokemon/{id}/encounters` (noms de lieux FR de PokéAPI, sinon nom du lieu + suffixe). Données jusqu'à la génération VIII (pas de Légendes Arceus, DEPS, Écarlate/Violet, Z-A : message explicite).
- **CT / CS / DT** : PokéAPI `machine` par groupe de versions (ex. « CT24 »), affichés dans l'onglet CT/CS.
- **Œufs GO** : distance (1/2/5/7/10/12 km, Aventure Synchro, cadeaux) lue sur la page Leek Duck « Eggs » (communautaire) = **pool de la saison en cours uniquement** (date indiquée dans l'app). Aucune valeur inventée.
- **Textes Pokédex traduits** : les jeux sans texte français dans PokéAPI (avant Noir/Blanc, Noir 2/Blanc 2, Légendes Arceus, Écarlate/Violet) reçoivent une traduction automatique (Argos Translate, noms de Pokémon remplacés par les noms français), stockée à part (`tt`/`tv` dans `sp/*.json`) et toujours signalée « Traduit en français faute de données officielles ». Les textes officiels FR priment.

## Noms (FR / EN / JA / romaji)
En-tête de chaque fiche : nom français, puis genus · nom anglais, puis nom japonais · romaji. Les noms d'espèces viennent de PokéAPI (`ja-Hrkt`/`ja`, `ja-roma`). Formes : nom anglais = nom de forme PokéAPI (« Alolan Raichu »), sinon « Espèce (libellé de forme) » ; japonais = nom de forme PokéAPI s'il contient le nom de l'espèce (メガフシギバナ), « région + espèce » pour Alola/Galar/Hisui/Paldea (アローラライチュウ), sinon « espèce（libellé japonais de la forme） » ; les formes sans libellé japonais dans PokéAPI (femelles, Charmilly, Pichu Troizépi, Amphinobi Synergie) affichent le nom de l'espèce. Romaji des morceaux de forme : translittération Hepburn automatique (`build/names.mjs`) accolée au romaji PokéAPI de l'espèce. La recherche couvre FR, EN, japonais (hiragana ou katakana) et romaji, sans accents ni casse.

## Suivi des captures
- **Système d'icônes** (identique dans légende, filtre Catégorie, cartes et compteurs ; les `<option>` natives utilisent des emojis équivalents) : Poké Ball rouge 🔴 = capturé dans ≥ 1 jeu (GO compris) ; **Poké Ball dorée** 🟡 = complété, Poké Ball dorée seule = complété jeux actuels (tous les jeux Switch où il existe, plus Pokémon GO s’il y est disponible ; un jeu et ses extensions comptent pour un) ; Poké Ball dorée + 🕹 = complété dans les anciens jeux (les deux niveaux = dorée + 🕹) ; icône Home 🏠 bleue = transféré depuis ≥ 1 jeu, **Home dorée** 🟡🏠 = transféré depuis tous les jeux compatibles où il existe (GO compte, sauf Pokémon fabuleux qui ne peuvent pas sortir de GO) ; ✨ = shiny (simple, par jeu ; pas de complétion shiny). GO compte pour « capturé » et pour la complétion jeux actuels (même palier que Switch). Vue de base : lecture seule, dérivée des marques par jeu ; le détail liste l'état par jeu.
- **Migration** : les anciennes marques globales `caught`/`shiny` sont conservées comme « marques manuelles de l'ancienne version » : comptées comme capturé/shiny dans la vue de base, indiquées comme telles dans le détail avec un bouton « Retirer ». Elles ne servent à aucune complétion. Les favoris (`favs`) restent globaux.
- Un jeu ou Pokémon GO choisi dans « Jeux » : marques par jeu et par forme, `caught_g`, `shiny_g` (`"rb:25"`, `"sw:26-alola"`), compteurs et filtres Catégorie propres au jeu.
- **Transféré vers Home** (`home_g`, `homeshiny_g`) : marquer un transfert marque aussi « capturé » dans ce jeu ; décocher « capturé » retire le transfert. Jeux compatibles : directs (GO, Let's Go, Épée/Bouclier + extensions, DÉ/PS, Légendes Arceus, Écarlate/Violet + extensions, Z-A + Méga-Dimension), via Pokémon Bank (X/Y, ROSA, Soleil/Lune, Ultra), via Poké Fret/Bank (Noir/Blanc, N2/B2, Diamant/Perle, Platine, HGSS). Non listés : Rouge/Bleu/Jaune, Or/Argent/Cristal, Rubis/Saphir/Émeraude, Rouge Feu/Vert Feuille (passage par d'autres jeux nécessaire).
- **Sauvegardes partagées** : un jeu et ses extensions forment une seule sauvegarde (`base` dans `build/games.mjs` : Épée/Bouclier + Isolarmure + Couronneige, Écarlate/Violet + Masque Turquoise + Disque Indigo, Légendes Z-A + Méga-Dimension). Marquer capturé / shiny / transféré dans l'un l'applique à tous les jeux du groupe où le Pokémon existe ; les compteurs et les complétions (Switch, Home) comptent un groupe une seule fois. Au démarrage et après import, les anciennes marques sont fusionnées par union dans chaque groupe (rien n'est perdu).
- **Variantes de combat** (`bo` dans `core.json`, liste documentée dans `build/battle.mjs`) : formes qui n'existent qu'en combat (Méga, Primo, Éternamax + liste explicite : Morphéo météo, Ceriflor ensoleillé, Darumacho Transe, Meloetta Danse, Amphinobi Sacha/Synergie, Exagide Assaut, Zygarde Parfaite, Froussardine Banc, Météno noyaux, Mimiqui démasqué, Ultra-Necrozma, Nigosier Gobe-Tout/Gobe-Chu, Bekaglaçon Tête Dégel, Morpeko Affamé, Superdofin Super, Terapagos Téracristal/Stellaire). **Mégas (Légendes Z-A)** — comptent pour la complétion jeux actuels et Home (Z-A / Méga-Dimension uniquement) : bouton sprite-only sur la fiche (pierre FR en tooltip ; X/Y = pierres distinctes ; à défaut sprite **Gemme Sésame** / `key-stone` + libellé Méga-Gemme) ; capturé/shiny en Z-A = forme de base capturée (shiny) dans la sauvegarde Z-A **et** gemme obtenue. Transfert Home de la Méga : manuel, sauf si gemme cochée — transférer la base transfère aussi la Méga. **Les formes Gigamax se marquent séparément** (Capturé / Shiny / Transféré), car il faut les capturer en jeu. Les autres variantes de combat (Méga, Primo, Éternamax, etc.) ne se marquent pas séparément : elles héritent des marques de la forme de base (« Variante de combat – suit la forme de base »), restent visibles dans la liste Formes et ne comptent pas dans les totaux. Les marques existantes posées sur ces variantes sont reportées sur la forme de base à la migration.
- Vue **Pokémon HOME** : lecture seule, dérivée des transferts (🏠 transféré, ✨ shiny transféré, ✔ transféré depuis tous les jeux compatibles où il existe ; les extensions ne comptent que si aucun jeu de base ne le contient).

## Limites connues
Rencontres absentes pour les jeux récents (voir plus haut). Textes Pokédex FR officiels seulement à partir de Noir/Blanc (PokéAPI), le reste est traduit automatiquement. Distance d'éclosion GO limitée au pool de la saison en cours. Illustrations : officielles (PokéAPI sprites) ou rendus HOME pour certaines formes (style mixte). Les illustrations shiny (~19 Mo) ne sont mises en cache que lorsqu'on les ouvre.

## Taille
`docs/` ≈ 52 Mo (images ≈ 44 Mo dont shiny 19 Mo à la demande, données ≈ 6 Mo, ≈ 1,5 Mo compressées).
