# v60.40 — État des lieux (types et faiblesses)

Vérifié le 25 novembre 2026 sur `docs/` à `52f0419` (v60.39, d78). Les tables de types (`core.json` / `DATA.charts`, générations I, II–V et VI+) et les talents qui modifient les faiblesses (bloc `ABEFF`, v31 puis v60.21) sont déjà vérifiés et audités : ils ne sont pas recalculés ici, seulement cités et réutilisés.

## Ce que l’appli fait déjà

- Il n’y a **pas de calculateur de types séparé**. Le calculateur, c’est le tableau « Faiblesses & résistances » de la fiche (`effHTML`, `typeMults`, `chartFor`).
- **Table des types** : génération I, générations II–V, générations VI et suivantes (et multiplicateurs GO sur la fiche Pokémon GO). Contrôles historiques dans `build/audit.mjs`.
- **Talents** (v60.21, `ABIL_EFF`) : Lévitation, Absorbe-Eau, Lavabo, Peau Sèche, Absorbe-Volt, Paratonnerre, Motorisé, Torche, Herbivore, Isograisse, Ignifugé, Aquabulle, Garde Mystik, Filtre / Solide Roc / Prisme-Armure, Souffle Delta, Mer Primaire, Terre Finale, Téra-Carapace, Boule de Poils, Sel Purificateur, Absorbe-Terre, Bien Cuit. Un tableau par talent, bouton « Types seuls » s’il y en a plusieurs. Rien dans Let’s Go, Légendes Arceus et Z-A (`NO_ABIL`). Contrôles `v60.21` dans `build/audit.mjs` (Électhor n’y figure pas ; Ectoplasma / Lévitation, Primo-Kyogre / Primo-Groudon, Méga-Rayquaza, Munja, etc.).
- La note de Lévitation mentionnait déjà Gravité, Anti-Air, Racines et Balle Fer, **sans les appliquer** dans le tableau.
- Souffle Delta, Mer Primaire et Terre Finale n’étaient appliqués que si **ce** Pokémon a le talent, pas comme météo de terrain pour n’importe quelle fiche.
- Pas d’options météo, terrain, objet, Téra ou Gravité sur le tableau.

## Ce que cette version ajoute

Des options simples **sur le même tableau**, uniquement pour ce qui change l’efficacité des types ou la défense de type (détail et sources : `regles.md`). Les talents v60.21 restent le point de départ ; les nouvelles règles se composent par-dessus.
