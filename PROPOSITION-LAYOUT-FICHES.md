# Proposition — mise en page des fiches Pokémon
*(brouillon pour validation Yann — pas encore implémenté)*

## Constat actuel (incohérences)

Sur mobile, les actions de suivi sont **réparties à deux endroits** et **changent selon le type de fiche** :

| Contrôle | Où aujourd’hui | Quand |
|---|---|---|
| ← ‹ › navigation | Bandeau sticky `.dnav` (haut) | Toujours |
| ★ Favori | Bandeau sticky | Toujours |
| 🔴 Capturé | Bandeau sticky | Toujours (parfois grisé) |
| ✨ Shiny capturé | Bandeau sticky | Toujours (parfois grisé) |
| 💎 Méga-Gemme | Bandeau sticky | **Uniquement** fiche Méga |
| 💎 Méga-Gemme(s) | Bloc texte sous le bandeau (`#trackinfo`) | **Uniquement** forme de base **en contexte Z-A** |
| 🏠 Transféré vers Home | Bloc `#trackinfo` (sous le bandeau) | Jeu compatible Home, pas battle-only |
| ✨ Transféré (shiny) | Idem `#trackinfo` | Si shiny / gemme |
| ✨ illustration shiny | Coin du **hero** (bannière colorée) | Si art shiny dispo |

Effets secondaires déjà constatés :
- Sur fiche Méga, Capturé/Shiny passent en **icône seule** pour faire tenir la gemme (hack `.dnav.mega`).
- Sur forme de base Z-A, les gemmes sont **plus bas**, dans le texte de suivi — pas au même endroit que sur la fiche Méga.
- Le bandeau sticky ne contient **pas** Transfert Home → il « saute » d’une fiche à l’autre (présent / absent / déplacé).
- Le sélecteur de jeu de la fiche (`.gamebar`) est sticky à `top: 60px`, sous le bandeau — OK, mais la zone d’actions reste fragmentée.

## Proposition : une seule rangée d’actions, toujours au même endroit

### A. Bandeau sticky (toujours visible) — navigation seule
```
[ ← ] [ ‹ ] [ › ]                    [ ★ ]
```
- Uniquement navigation + favori.
- Pas de Capturé / Shiny / Gemme / Home ici.
- Reste léger sur une ligne, stable sur tous les types de fiches.

### B. Rangée d’actions fixe — juste sous le bandeau (ou en bas de l’écran en barre sticky mobile)
**Toujours la même structure**, cases vides / grisées si non applicables :

```
[ 🔴 Capturé ]  [ ✨ Shiny ]  [ 🏠 Home ]  [ ✨🏠 Shiny Home ]  [ 💎 Gemme(s) ]
```

Règles d’affichage (état, pas de déplacement) :

| Bouton | Visible | Actif |
|---|---|---|
| Capturé | Toujours | Désactivé si vue d’ensemble, HOME, battle-only, ou Méga hors Z-A |
| Shiny | Toujours | Idem Capturé |
| Transféré Home | Toujours si le jeu courant peut envoyer vers Home ; sinon case grisée « N/A » ou masquée **mais emplacement réservé** (meilleure UX : masquée seulement si le jeu n’a jamais Home — à trancher) | Selon règles actuelles |
| Shiny Home | Si Home possible et (shiny ou déjà marqué) | Idem |
| Méga-Gemme | Si l’espèce a ≥1 Méga **et** contexte Z-A / Méga-Dimension (forme de base **ou** fiche Méga). 1 bouton par pierre (X/Y séparés) | Toujours cliquable en Z-A |

Ainsi :
- Forme de base hors Z-A : Capturé + Shiny + Home (si applicable) — **pas** de gemme, mais la rangée ne « saute » pas de place pour Capturé.
- Forme de base en Z-A : + gemme(s) dans **la même rangée**.
- Fiche Méga en Z-A : Capturé/Shiny grisés (dérivés) + gemme dans la **même** rangée.
- Fiche Méga hors Z-A (battle-only) : Capturé/Shiny grisés, pas de gemme, note « suit la forme de base ».

**Mobile** : cette rangée en `position: sticky` sous la nav (ou barre du bas type thumb-zone). Libellés courts ou icône + caption (comme la gemme actuelle).

### C. Corps de fiche — hiérarchie visuelle proposée (ordre fixe)

1. **Hero** : nº national · sprite (échelle tailles Pitrouille) · nom FR · genus · EN / JA · types  
   - Bouton art shiny **reste** sur le hero (prévisualisation, pas un marquage de capture).
2. **Contexte de suivi** (texte seul, sans boutons) : « Suivi pour : Légendes Z-A » · notes battle-only / Méga · compteurs tous jeux — **lecture seule**.
3. **Formes** (puces) — si multi-formes.
4. **Description** Pokédex (+ note traduction si besoin).
5. **Stats** (+ tableau type si utile).
6. **Talents**.
7. **Attaques** (onglets Niveau / CT / Œuf / Tuteur + badges compteur).
8. **Évolution**.
9. **Rencontres / localisation** (si le jeu a des encounters).
10. **Jeux** où il apparaît.
11. **Bloc GO** (si applicable).

Le **sélecteur de jeu de la fiche** reste sticky sous la nav d’actions, comme aujourd’hui, car il change le contexte de marquage.

## Variantes à valider

1. **Rangée d’actions en haut** (sous nav) vs **barre du bas** (zone pouce) sur mobile — recommandation : bas sur mobile, haut sur desktop.
2. Home « N/A » visible grisé vs entièrement masqué quand le jeu n’envoie pas vers Home.
3. Garder le libellé texte sous la gemme sur tactile (oui, à conserver).

## Hors scope de cette proposition
- Pas de changement des règles de marquage (Z-A gemme, battle-only, hors dex…).
- Pas d’implémentation tant que tu n’as pas validé A/B/C + variantes 1–2.
