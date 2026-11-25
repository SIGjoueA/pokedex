# Sprites HOME et animés — état des lieux (v60.36)

Date de vérification : 25/11/2026. Dépôt PokéAPI/sprites, arbre `showdown` sha `fd7003b1d05b68e0f632807e18aa12788378abfe`. Liste locale `build/sprite-files.json` identique (aucun fichier ajouté ou retiré depuis la v46, 18/10/2026).

## Ce qui n’est plus « en aperçu »

Aucun drapeau, aucun mode aperçu, aucune option cachée. Depuis la v35, chaque fiche affiche les trois boutons HOME / Officiel / Animé. Depuis la v35 / v60.34, le style par défaut est le rendu HOME auto-hébergé, pour tout le monde. L’animé n’est chargé qu’au toucher du bouton, depuis le dépôt PokéAPI (`other/showdown/*.gif`, autre origine), jamais préchargé, jamais dans le service worker ni dans les packs hors-ligne.

## Couverture des sprites animés (identifiant `as` dans core.json)

| Ensemble | Avec `as` | Sans `as` | Total |
| --- | ---: | ---: | ---: |
| Entrées core | 1363 (90,8 %) | 138 | 1501 |
| dont Méga | 57 | 39 (toutes les Méga Z-A) | 96 |
| dont Gigamax | 34 | 0 | 34 |
| dont Primo | 2 | 0 | 2 |
| Femelles distinctes (`fe`) | 99 | 1 (Méga-Mistigrix femelle) | 100 |

Les 138 entrées sans `as` n’ont pas de fichier Showdown dans le dépôt aujourd’hui. Grandes familles :

- 39 Méga de Légendes Z-A (ids HOME 10287–10326, pas de GIF Showdown) ;
- 14 espèces de base récentes : paradoxes de fer (Roue-de-Fer, etc.), Miraidon, Ogerpon, Terapagos, Pêchaminus ;
- formes de combat / authentiques déjà sans HOME (Mewtwo Armuré, Pichu Troizépi, Koraidon / Miraidon de course ou de vol, Formes Authentiques et Onéreuse / Exceptionnelle) ;
- la plupart des Charmilly (2/64 ont un `as`), quelques motifs Prismillon, Cheniti Sable / Déchet, Couafarel Coupe Reine, Arceus ???, Famignol Famille de Trois, masques d’Ogerpon, formes Téracristal / Stellaire de Terapagos.

Femelle : 99/100 ont un `as` du type `female/<id>`. Seule `678-female-mega` (Méga-Mistigrix femelle) n’en a pas. Deux entrées partagent `female/215`.

Shiny : pour chaque `as` présent, l’appli demande `showdown/shiny/<as>.gif` (ou `showdown/shiny/female/<id>.gif`).

## Vérification des URL (HEAD, 25/11/2026)

2 920 URL uniques correspondant à tous les `as` assignés (normal + shiny, femelles comprises) : **2 920 HTTP 200, 0 échec, 0 fichier 404**. Les identifiants `as` de `core.json` coïncident avec la liste live du dépôt.

Poids des GIF (Content-Length) : 307,18 Mo au total (155,43 Mo normal, 151,74 Mo shiny). Médiane ≈ 66 Ko, moyenne ≈ 105 Ko. Les plus lourds : Éthernatos Infinimax ≈ 2,5 Mo, puis plusieurs Gigamax (Melmetal, Cuivrelame, Dunaconda, etc., ≈ 1 Mo). C’est trop lourd pour le pack automatique (~17 Mo) et pour un précache. Ils restent exclus du hors-ligne, chargés seulement au toucher.

Non vérifié : l’apparence visuelle de chaque GIF (seul le code HTTP et la taille ont été contrôlés) ; les sprites « back » du dépôt, non utilisés par l’appli.

## Comportement avant correction

Si l’animé manque, est hors-ligne ou échoue, `setSprite` basculait sur le **sprite officiel** et affichait un toast d’erreur, en sautant le rendu HOME pourtant déjà par défaut.
