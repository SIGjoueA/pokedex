# État des lieux — recherche par capacité, talent et lieu (v60.37)

Date : 25 novembre 2026. Source : `docs/` de `main` (`bbaaa4f`, v60.36, DATA_VERSION d76). Aucune donnée n’a été régénérée avec `build-data.mjs`.

## Recherche et filtres déjà en place (vérifié)

La boîte `#q` (placeholder « Nom ou n°… ») compare, après `norm()` (casse et accents ignorés) :

- le nom français (`p.nn`), anglais (`p.ne`), japonais (`p.nj`) et la romanisation (`p.nr`) ;
- un numéro national, ou le numéro régional si un jeu est sélectionné.

Filtres déjà combinés dans `filtered()` (ET logique) :

- jeu (`#game`, y compris HOME, GO et sous-Pokédex) ;
- génération, catégorie, tri ;
- jusqu’à deux types (`#typechips`) ;
- étoiles de raid si la catégorie « Dispo en raid » est active.

**Aucun filtre ni suggestion par capacité, talent ou lieu.** Les capacités et talents ne sont affichés que sur la fiche, après `loadShared()` + `loadSp(id)`.

## Capacités — données déjà présentes (vérifié)

| Fichier | Poids | Hors-ligne |
| --- | --- | --- |
| `docs/data/moves.json` | 819 capacités, ~39 Ko | oui (`cachePack`) |
| `docs/data/tm.json` | libellés CT/CS/DT, 27 jeux (pas Z-A) | oui |
| `docs/data/sp/1.json` … `1025.json` | 1 025 fichiers, 8,99 Mo, ~8,8 Ko / fichier | oui (tout le dossier) |

Structure d’une fiche : `ls` (jeuxets dédupliqués) + `lm` (id de jeu → indice dans `ls`). Une forme peut renvoyer au jeuxet d’une autre via `mvOf`. Méthodes, telles qu’affichées sur la fiche :

- `l` : niveau — `[id, niveau]`
- `m` : CT/CS/DT — ids de capacité, libellés via `tm.json`
- `e` : œuf / élevage — ids
- `t` : tuteur — ids
- `o` : autre — `[id, indice]` dans `ref.mm`

Couverture des jeuxets (`lm`) : **26 jeux sur 28**. Absents : **Légendes Z-A et son DLC** (`za`, `zadlc`). Présents : RF/VF Switch (`frlgsw`), Let’s Go, Légendes Arceus, et tous les autres jeux de `core.games`. 1 190 formes ont leur propre `ls`/`lm` ; 327 utilisent `mvOf` ; 1 416 formes du `core` ont un jeuxet une fois `mvOf` résolu.

GO n’a pas de jeuxet dans `sp/` (capacités GO à part, `go.json` / `pvp-moves.json`).

Exemples contrôlés : Séisme = id 89. L’index provisoire trouve 368 formes (dont Rhinoféros, Groudon, Carchacrok, Libégon ; pas Pikachu). Dracaufeu et Florizarre figurent comme CT dans plusieurs jeux — c’est déjà ce que la fiche affiche (PokéAPI).

## Talents — données déjà présentes (vérifié)

| Fichier | Poids | Hors-ligne |
| --- | --- | --- |
| `docs/data/ref.json` (`ab`) | 313 talents, nom FR + texte + génération d’apparition, dans ~39 Ko | oui (`cachePack`) |
| `f.a` / `f.pa` dans `sp/*.json` | talent actuel `[[id, caché], …]` et historique par génération | oui |

La fiche utilise déjà `abilityList` / `pickGen` : pas de talent avant la gén. III ni dans Let’s Go, Légendes Arceus et Z-A (`NO_ABIL`) ; talents cachés à partir de la gén. V ; un talent ne peut pas précéder sa génération d’apparition.

Exemple contrôlé : Lévitation = id 26. Porteurs actuels (gén. IX) : 71 formes (dont Libégon, pas Ectoplasma). Ectoplasma l’a en gén. III–VI seulement (`pa`), ce que la fiche montre déjà.

## Lieux — données présentes, pas triviales (vérifié, reporté)

| Source | Poids / couverture | Hors-ligne |
| --- | --- | --- |
| `docs/data/loc.json` | dictionnaires `a` (1 432 lieux), `m` (62 méthodes), `c` (101 conditions), ~39 Ko | oui |
| `f.pl[jeu]` | texte Poképédia, 1 029 formes, surtout jeux Switch (ÉV, ÉB et DLC, Arceus, Z-A, RF/VF Switch…) | oui (dans `sp/`) |
| `f.en` | indices compactés PokéAPI, 923 formes, 21 jeux (surtout Gén. III–VIII) | oui |

Deux formats, couvertures inégales, pas d’index inversé « Pokémon présents au lieu X ». **Reporté à une version suivante** (pas trivial).

## Conséquence pour l’aperçu

On ne peut pas parcourir les 9 Mo de `sp/` à chaque frappe. Un index compact `docs/data/learn-index.json` (capacités + talents), généré de façon idempotente par `fix-v60-37.mjs` à partir des fichiers déjà livrés, est nécessaire. Poids constaté : **~1,94 Mo** brut, **~372 Ko** gzip. À ajouter au pack hors-ligne et à charger seulement à la première utilisation des nouveaux filtres (démarrage de la liste inchangé). Cela change le schéma des données → **DATA_VERSION d77**.

## Non vérifié

- Exactitude de chaque jeuxet PokéAPI par rapport aux jeux officiels (on s’aligne sur ce que la fiche affiche déjà).
- Compatibilité des attaques GO (hors périmètre).
- Jeuxets de Z-A (absents des données).
- Recherche par lieu (volontairement reportée).
