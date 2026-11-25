# v60.39 — État des lieux des données de lieux

Vérifié le 25 novembre 2026 sur les fichiers déjà livrés dans `docs/data/` (main 7d6608f, d77). Aucune source distante, `build-data.mjs` n’a pas été lancé.

## Formats

- `f.pl[jeu]` (Poképédia, texte) : `[[nom du lieu, précisions], …]`. 1 029 formes ont au moins une entrée. Noms déjà en français, typographie des modules Poképédia. Principalement les jeux Switch (ÉV + DLC, Z-A + DLC, LPA, DEPS, ÉB + DLC, Let’s Go, RF/VF Switch) ; des lignes ponctuelles aussi sur les anciens jeux (fossiles, légendaires, concours…).
- `f.pln[jeu]` : phrase de méthode (« Faire évoluer … », « Échange », « Méga-Évolution de … »). Ce n’est pas un nom de lieu. 857 formes. Non indexé.
- `f.en[jeu]` (PokéAPI, compact) : `[indiceLieu, indiceMéthode, nivMin, nivMax, taux, conditions?, versions?]`. 923 formes, 21 jeux (ceux dont `gm.enc` est vrai). Les noms passent par `loc.json`.
- `loc.json` (~39 Ko, déjà dans le pack) : `a` 1 432 intitulés de lieux (1 335 distincts, 41 noms en double dont « Route 1 » ×5), `m` 62 méthodes, `c` 101 conditions. Noms déjà affichés en français sur la fiche.

Priorité d’affichage de la fiche (`encHTML0`) : `ppLocs` (pl, héritage de la forme de base sauf forme régionale ou Méga) ; sinon `pln` ; sinon `en` (éventuellement via `enOf`).

## Couverture par jeu (entrées propres, avant héritage)

Jeux Switch sans `enc` (Poképédia seulement, pas de repli PokéAPI) :

| jeu | formes pl | noms de lieux distincts |
|---|---:|---:|
| zadlc | 360 | 74 |
| za | 205 | 66 |
| sv | 403 | 46 |
| svdisk | 194 | 7 |
| svmask | 157 | 18 |
| la | 235 | 41 |
| bdsp | 325 | 129 |

Jeux avec pl et en (ex. ÉB) : les deux existent, mais les intitulés ne se recouvrent presque pas après normalisation (accents ignorés). Épée / Bouclier : 362 pl + 430 en, seulement 15 noms communs (« Plaine Verdoyante (Terres Sauvages) » côté Poképédia contre « Plaine Verdoyante (Antre D) » côté PokéAPI). Isolarmure / Couronneige : 0 ou 1 nom identique (dens vs zones).

Anciens jeux : surtout `en` (hgss 297, frlg 149, rs 136, y 106, rb 114, plus xy / sm / usum / b2w2 / bw / pt / dp / e / c / gs). Quelques `pl` ponctuels. RF/VF Switch : 27 pl + 116 en.

Tous les 28 jeux de la série principale ont au moins quelques lieux nommés. Pokémon HOME et Pokémon GO n’ont ni `pl` ni `en`.

## Normalisation et rapprochement des formats

- Affichage : conserver la typographie d’origine (accents, tirets, parenthèses).
- Recherche / dédoublonnage : `norm()` déjà utilisé dans l’appli (NFD, suppression des diacritiques, minuscules, conservation des lettres et chiffres seulement). « Désert Rôtissable » = « desert rotissable ».
- Ne pas fusionner un nom Poképédia et un nom PokéAPI qui ne sont pas identiques après `norm()`. Le recouvrement est trop faible et la granularité diffère : un mélange produirait des faux positifs (un Pokémon « trouvé » dans un lieu dont le nom n’est pas celui de la fiche).
- Les homonymes de `loc.a` (« Route 1 » à Kanto, Johto, Unova, Alola…) restent un seul libellé ; le menu Jeu les départage. Sans jeu choisi, une mention le rappelle si le lieu apparaît dans plusieurs régions.
- L’index suit la fiche : pour chaque forme et chaque jeu, on prend `pl` s’il y a des lignes (comme `ppLocs`), sinon `en`. On n’indexe jamais `pln`. On n’indexe une forme dans un jeu que si `inGame` est vrai (évite d’attribuer la Forêt de Jade à une casquette de Pikachu ou à un Gigamax). Pas d’héritage vers une forme régionale, une Méga, un Gigamax, un Primo ou une forme de combat : mieux vaut les omettre que leur coller les herbes de la forme de base.

## Index retenu

Fichier `docs/data/loc-index.json`, généré par `build/fix-v60-39.mjs` à partir de `core.json`, `loc.json` et `sp/*.json` déjà livrés. Format compact : `{v, g, k, n, L}` avec `L[lieu] = [indiceForme, masqueJeux, …]` (28 jeux tiennent sur un entier 32 bits). Ordre de grandeur : ~200 Ko, ~46 Ko compressé — assez léger pour le pack hors-ligne. Chargé seulement à la première utilisation du filtre « Lieu… ».

Après filtre `inGame` et sans héritage abusif : environ 1 579 noms, 1 076 formes, 31 800 couples lieu–forme–jeu.

Couverture de l’index (formes distinctes / noms de lieux distincts) :

| jeu | formes | lieux | jeu | formes | lieux |
|---|---:|---:|---|---:|---:|
| frlgsw | 116 | 118 | zadlc | 201 | 74 |
| za | 202 | 66 | svdisk | 173 | 7 |
| svmask | 154 | 17 | sv | 372 | 44 |
| la | 235 | 41 | bdsp | 114 | 114 |
| swcrown | 247 | 114 | swisle | 232 | 80 |
| sw | 430 | 146 | lgpe | 138 | 50 |
| usum | 333 | 109 | sm | 233 | 91 |
| oras | 134 | 143 | xy | 320 | 81 |
| b2w2 | 233 | 132 | bw | 122 | 87 |
| hgss | 185 | 166 | pt | 140 | 159 |
| dp | 115 | 156 | e | 131 | 109 |
| frlg | 116 | 119 | rs | 135 | 103 |
| c | 172 | 126 | gs | 166 | 124 |
| y | 106 | 74 | rb | 114 | 74 |

Jeux non couverts dans l’appli (mention claire) : Pokémon HOME et Pokémon GO. Les 28 jeux ont des données, parfois sommaires (Disque Indigo : 7 noms de lieux Poképédia ; DEPS : 114 formes avec un lieu nommé, le reste est souvent une phrase `pln` d’évolution, volontairement exclue).

Cas connus vérifiés sur le prototype : « Forêt de Jade » → Pikachu, Chenipan, Aspicot, pas Mew ; « Désert Rôtissable » (ÉV) → Taupiqueur, Hippopotas, pas Pikachu ; Mew (151) n’a aucun lieu dans l’index.

## Risques et limites (vérifiés / non vérifiés)

Vérifié dans les JSON livrés : schémas `pl` / `en` / `pln` / `loc.json`, priorité d’affichage, recouvrement des noms, nécessité du filtre `inGame`, présence de Mew, homonymes « Route 1 », taille de l’index.

Non vérifié ici (et donc non promis) : exhaustivité par rapport aux tables officielles des jeux, mises à jour Poképédia / PokéAPI postérieures aux données livrées, exactitude de chaque taux ou méthode (le filtre ne s’en sert pas), lieux de Pokémon GO, complétude réelle de DEPS ou du Disque Indigo au-delà de ce que les fiches montrent déjà.

Risques acceptés : un cadeau in-game dont le lieu figure sur la fiche (ex. un village) est trouvable par ce lieu, comme sur la fiche ; sans jeu choisi, « Route 1 » agrège plusieurs régions (mention + menu Jeu) ; certaines zones restent grossières (Septentria, Disque Indigo).
