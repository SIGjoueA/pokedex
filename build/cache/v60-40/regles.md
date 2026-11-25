# v60.40 — Règles retenues, écarts et décisions

Chaque règle **nouvelle** est recoupée sur au moins deux sources parmi Bulbapedia, Poképédia et `@smogon/calc` 0.12.0 (déjà utilisé dans le projet). Les tables de types et les talents du bloc `ABEFF` (v60.21) sont **réutilisés tels quels** ; leurs contrôles d’audit existants restent la référence.

Génération indiquée : première génération (ou premier jeu) où l’effet existe dans la série principale, et éventuel changement ultérieur.

## Retenues (changent l’efficacité ou la défense de type)

### Vents mystérieux (météo de Souffle Delta) — génération VI (ROSA)

Les capacités super efficaces contre le type Vol ne le sont plus que normalement contre ce type (Électrik, Glace et Roche passent à ×1 contre le type Vol). L’autre type du Pokémon continue de s’appliquer (Dracaufeu, Feu/Vol : Roche 4→2, Électrik 2→1, Glace 1→½). Cela ne concerne pas Piège de Roc. Effet de **terrain** : tout Pokémon dont le typage défensif actuel inclut Vol, pas seulement Méga-Rayquaza.

Sources : Bulbapedia *Strong winds* ; Poképédia *Souffle Delta* et *Météo (mécanisme)* ; `@smogon/calc` `gen789.js` (`Strong Winds` + `effectiveness['Flying'] > 1` puis `typeEffectiveness /= 2`). Le talent Souffle Delta sur le porteur reste celui de la v60.21 ; on n’applique pas deux fois le même effet.

### Pluie battante (Mer Primaire) et soleil intense (Terre Finale) — génération VI (ROSA)

Les capacités offensives de type Feu échouent sous la pluie battante ; celles de type Eau échouent sous le soleil intense (multiplicateur affiché ×0). Effet de terrain, pour toute cible. Ciel Gris / Air Lock, trop situationnels, ne sont pas un interrupteur (mention seulement).

Sources : Bulbapedia *Primordial Sea* / *Desolate Land* ; Poképédia *Mer Primaire* / *Terre Finale* / *Météo* ; calc `gen789.js` (échec immédiat si `Heavy Rain` + Feu ou `Harsh Sunshine` + Eau). Les talents sur le porteur restent ceux de la v60.21.

### Gravité — génération IV

Le type Vol perd son immunité au type Sol (ce type compte comme ×1) ; Lévitation et le Ballon sont aussi annulés. L’autre type s’applique (Électhor Électrik/Vol : Sol ×2). Ne retire pas le type Vol.

Sources : Bulbapedia *Gravity* et notes d’*Zapdos* ; Poképédia *Gravité* et note d’*Électhor* (×2) ; calc `getMoveEffectiveness` (Gravité + Vol + Sol → 1, puis produit des types).

### Balle Fer (Iron Ball) — génération IV, changement en génération V

Cloue le porteur au sol (et divise sa Vitesse par 2, hors tableau). Interaction avec Sol :

- Génération IV : comme Gravité, l’immunité Vol devient ×1 puis l’autre type compte (Électhor : Sol ×2). Confirmé par calc `gen4.js` (reconstitution du produit après avoir remplacé le 0 d’un des types par 1) et par Bulbapedia *Iron Ball* / notes d’*Zapdos*.
- Génération V et suivantes : si le porteur est de type Vol et n’est cloué **que** par la Balle Fer, Sol vaut ×1 **quel que soit l’autre type** (Électhor : ×1). Si Gravité (ou le Point de Mire) est aussi actif, on applique ces effets (Électhor + Gravité + Balle Fer : ×2). Un non-Vol avec Lévitation : la Balle Fer annule Lévitation et le tableau des types s’applique (Ectoplasma : Sol ×2).

**Écart tranché :** la fiche Poképédia *Électhor* (y compris des pages de générations antérieures à la Balle Fer) indique un unique ×2 pour Gravité ou Balle Fer, sans distinguer la génération V. Cette note est copiée d’une génération à l’autre et moins précise. Décision : suivre Bulbapedia *Iron Ball* (« Generation V onward ») et `@smogon/calc` (`gen56.js` / `gen789.js` : le produit déjà à 0 passe à 1). Le tableau indique clairement la génération.

Nom officiel : **Balle Fer**. Il n’existe pas d’objet officiel « Anneau Ancrage » ; l’effet demandé (rendre Sol efficace) est couvert par Gravité et la Balle Fer. Le **Point de Mire** (Ring Target, gén. V) est l’objet qui lève toutes les immunités de type.

### Ballon (Air Balloon) — génération V

Immunité au type Sol jusqu’au premier coup reçu. Sous Gravité, l’immunité tombe (le Ballon n’éclate pas).

Sources : Bulbapedia *Air Balloon* ; Poképédia *Ballon* ; calc (`Air Balloon` ignore Sol sauf si `isGravity`).

### Point de Mire (Ring Target) — génération V

Annule les immunités dues aux types (Sol touche Vol, Normal et Combat touchent Spectre, etc.) ; l’autre type s’applique (Électhor : Sol ×2 ; Ténéfix Ténèbres/Spectre : Combat ×2). Ne cloue pas au sol (les terrains ne s’appliquent pas pour autant).

Sources : Poképédia *Type* (exemple Ténéfix) ; Bulbapedia *Ring Target* ; calc `getMoveEffectiveness` (`isRingTarget` : 0 devient 1).

### Baies anti-type — génération IV (Baie Roséli : génération VI)

Chocco (Feu), Pocpoc (Eau), Parma (Électrik), Ratam (Plante), Nanone (Glace), Pomroz (Combat), Kébia (Poison), Jouca (Sol), Cobaba (Vol), Yapap (Psy), Panga (Insecte), Charti (Roche), Sédra (Spectre), Fraigo (Dragon), Lampou (Ténèbres), Babiri (Acier), Roséli (Fée) : ÷2 une seule fois si l’attaque de ce type est **super efficace**. Baie Zalis : ÷2 une seule fois contre une capacité **Normal**, même si elle n’est pas super efficace.

Sous vents mystérieux, si l’attaque n’est plus super efficace, la baie correspondante ne s’applique pas (Bulbapedia *Strong winds* ; calc teste `typeEffectiveness > 1`, sauf Normal pour Zalis).

Sources : Poképédia *Type* / fiches des baies (noms officiels, déjà dans `ref.it` sauf Roséli, nom *Baie Roséli*) ; Bulbapedia type-resist berries ; calc `getBerryResistType` + `calculateFinalModsSMSSSV`. Maturation (Ripeur) non proposée (trop particulier).

### Téracristal (défense) — génération IX (Écarlate / Violet)

Hors type Stellaire, le typage **défensif** est uniquement le type Téra (Dracaufeu Téra Feu : plus d’immunité Sol, Roche ×2 et non ×4). Le type Stellaire conserve les types d’origine en défense. Pas d’option Téra dans Z-A, Légendes Arceus, Let’s Go, ni avant la gén. IX.

Sources : Bulbapedia *Terastal phenomenon* ; Poképédia *Téracristalisation* ; calc `gen789.js` (si `teraType` et ≠ `Stellar`, une seule prise en compte) et `pokemon.js` `hasType` (après Téra, le typage défensif est le type Téra). Les attaques de type Stellaire (×2 contre une cible déjà téracristallisée) ne sont pas un type du tableau, donc non affichées.

### Champ Brumeux — génération VI

Les capacités Dragon infligent ½ dégâts aux Pokémon **au sol**. Un type Vol, Lévitation ou Ballon n’est pas au sol, sauf Gravité ou Balle Fer. Affiché sur le tableau (Dragon ×½) seulement si le Pokémon est au sol, avec une mention sinon.

Sources : Bulbapedia *Misty Terrain* ; Poképédia *Champ Brumeux* ; calc `gen789.js` (`bpMods` 2048 si `Misty` + Dragon + `isGrounded`). C’est un modificateur de puissance, pas une case de la table des types ; on l’affiche quand même parce qu’il s’applique à **toutes** les capacités Dragon contre une cible au sol, donc à la défense de type.

## Mentions sans changement du tableau

### Tempête de sable — génération II ; bonus Déf. Spé. depuis la génération IV

Ne change pas les faiblesses. Depuis Diamant / Perle, la Déf. Spé. des types Roche est ×1,5. Note seulement.

Sources : Bulbapedia *Sandstorm* ; calc `calculateDefenseSMSSSV` (`Sand` + type Roche + attaque spéciale).

### Neige — génération IX (série principale actuelle)

Ne change pas les faiblesses. La Défense des types Glace est ×1,5. La **grêle** (gén. III–VIII) n’a pas cet effet. Option proposée seulement en génération IX, avec une note.

Sources : Bulbapedia *Snow* ; calc (le bonus n’est dans `gen789.js` que pour `Snow`, pas `Hail`). Poképédia *Météo* décrit aussi un bonus de Défense Glace pour la neige de la série principale (à partir de Légendes Arceus) ; pour Écarlate / Violet, on s’aligne sur Bulbapedia + calc (Défense, pas la Vitesse propre à Légendes Arceus).

### Champs Électrifié, Psychique, Herbu — génération VI

N’altèrent pas le tableau des types. Ils renforcent, pour un lanceur au sol, les capacités de leur type (×1,5 en Gén. VI–VII, ×1,3 depuis la Gén. VIII), plus sommeil interdit / priorité interdite / soin et affaiblissement de certaines capacités Sol. Note seulement.

**Champ Herbu et Sol :** seules Séisme, Piétisol et Ampleur (Magnitude) sont réduites, pas Coud’Krâne, Telluriforce, etc. On ne change donc pas le multiplicateur Sol. Calc 0.12.0 n’écrit que `Bulldoze` et `Earthquake` (pas `Magnitude`) : écart mineur, documenté, et une raison de plus de rester sur une note et non un ×½ Sol.

Sources : Bulbapedia *Electric/Psychic/Grassy Terrain* ; Poképédia pages des champs ; calc `terrainMultiplier` et la liste des moves Herbu.

## Écartées, et pourquoi

- **Soleil et pluie ordinaires** : ils changent la puissance des capacités Feu / Eau (×1,5 / ×0,5), pas l’efficacité des types. Le brief vise le soleil intense et la pluie battante, qui **annulent**. Écarté du tableau.
- **Bottes Ferreuses** (Heavy-Duty Boots, gén. VIII) : protègent des pièges au sol, **pas** des types. Nommées pour écarter toute confusion ; non proposées.
- **Parapluie** (Utility Umbrella) : ignore soleil et pluie ordinaires, pas les météos « primordiales » retenues ici. Inutile sur ce tableau.
- **Anti-Air, Racines, Myria-Flèches, Atterrissage, Vol Magnétik, Lévikinésie, Zone Inverse, Ciel Gris, Klutz, Ripeur :** trop liés à un tour de combat ou à une capacité précise pour un affichage simple et stable. Lévitation + Gravité / Balle Fer / Ballon, qui tiennent en une option, sont traités.
- **Pokémon GO, Let’s Go, Légendes Arceus, Z-A :** autre système de combat (et pas de talents dans Let’s Go / Z-A / Légendes Arceus). Options masquées, mention claire. (Cas très particulier du Méga-Rayquaza « Rogue » dans Z-A : non repris, trop spécifique.)

## Invérifiable, s’il en reste

Rien d’essentiel n’est resté sans au moins deux sources pour les règles **retenues**. Le seul flou utile à signaler n’est pas un trou de règle, c’est l’**écart Poképédia / Bulbapedia + calc** sur Électhor + Balle Fer à partir de la gén. V (voir plus haut), tranché et affiché. Calc n’inclut pas Ampleur dans la réduction du Champ Herbu : on n’en fait pas un chiffre du tableau. Les combats inversés et les cas Ciel Gris / Air Lock n’ont pas été simulés dans un jeu : ils sont volontairement hors interface.
