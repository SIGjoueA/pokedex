# Inventaire des illustrations (v60.34)

## Vues et blocs qui affichent un Pokémon

| Vue / bloc | Fichier | Fonction | Avant | Après |
| --- | --- | --- | --- | --- |
| Liste (grille et liste) | `docs/app.js` | `cardHTML` | `artOf` (HOME si `hh`) | `artImg` : HOME, secours sprite, lazy |
| Fiche, écran de chargement | `openDetail` | `img/${k}.webp` officiel | `artOf` / `artImg` (HOME) |
| Fiche, illustration | `renderDetail` (`#heroimg`) | HOME si non shiny ; shiny = sprite officiel `img/s` | HOME y compris shiny HOME si présent ; secours sprite ; pas de lazy (LCP) |
| Boutons HOME / Officiel / Animé | `setSprite` | Shiny HOME distant (PokéAPI) ou secours officiel | Shiny HOME local `img/hs` en priorité, puis secours sprite |
| Formes (puces) | `formSwitcher` | `artOf` | `artImg`, lazy |
| Évolutions | `evoHTML` | `artOf` | `artImg`, lazy |
| Autres puces d’espèces | fiches (ex. objets) | `artOf` | `artImg`, lazy |
| Vue Raids, 7★, classements attaquants | `renderRaids`, `svRankListHTML`, etc. | `artOf` | `artImg`, lazy |
| Classements GO (raids, Max, Rocket) | lignes `rkrow` | `artOf` | `artImg`, lazy |
| Collection (cartes, liste, fiche, choix d’évolution) | `colImg` | shiny = `img/s` officiel | `artOf(..., shiny)` + secours |
| Costumes GO | `costumesHTML` | image communautaire, déjà un secours `artOf` | secours via `artImg` |
| Pokémon Pocket (cartes) | `pkImg` | scans de cartes TCG, pas un portrait | inchangé |
| Icônes Méga-Gemme, Énergie GO, origin, Dynamax | `img/stones`, `img/energy`, `img/origin`, `img/max` | hors sujet | inchangé |

## Formes sans rendu HOME (secours = illustration officielle)

10 formes dans `core.json` n’ont pas de `hs` / `hh` (absentes du dépôt PokéAPI other/home) :

- 150-armored — Mewtwo Armuré
- 172-spiky-eared — Pichu Troizépi
- 854-antique — Théffroi Forme Authentique
- 855-antique — Polthégeist Forme Authentique
- 1007-sprinting-build — Koraidon Forme de Course
- 1007-gliding-build — Koraidon Forme de Vol
- 1008-drive-mode — Miraidon Mode Terrestre
- 1008-glide-mode — Miraidon Mode Aérien
- 1012-artisan — Poltchageist Forme Onéreuse
- 1013-masterpiece — Théffroyable Forme Exceptionnelle

Les 100 formes femelles distinctes ont bien un rendu HOME (`fe.hh`).

## Pack hors-ligne et performances

Voir le rapport de version : le pack « images » télécharge les rendus HOME (et le sprite officiel des 10 formes sans HOME), pas les shiny. Les shiny (officiels et HOME) restent en cache à la demande, avec `loading="lazy"` partout sauf l’illustration de la fiche.

## Shiny HOME manquants (secours = sprite officiel shiny)

7 casquettes de Pikachu ont un identifiant `hs` dans `core.json`, mais le dépôt PokéAPI `other/home/shiny` répond 404 :

- 25-alola-cap, 25-hoenn-cap, 25-kalos-cap, 25-original-cap, 25-sinnoh-cap, 25-unova-cap, 25-world-cap

Fichiers auto-hébergés : 1584 webp dans `docs/img/hs/` (16,44 Mo). Attendu : 1591 (entrées `hs` + `sh`, femelles comprises).

## Tailles constatées (v60.34)

- Sprites officiels `docs/img/*.webp` : 1641 fichiers, 19,99 Mo
- Sprites officiels shiny `docs/img/s/` : 1640 fichiers, 19,78 Mo (cache à la demande)
- Rendus HOME `docs/img/h/` : 1592 fichiers, 16,65 Mo (pack images ~17 Mo)
- Rendus HOME shiny `docs/img/hs/` : 1584 fichiers, 16,44 Mo (cache à la demande)
- `docs/img/` au total : 73,38 Mo ; `docs/` ≈ 107 Mo
