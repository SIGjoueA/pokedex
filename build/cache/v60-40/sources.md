# v60.40 — Sources consultées (règles nouvelles seulement)

Les tables de types et le bloc `ABEFF` (v60.21) ne sont pas retravaillés. Sources déjà retenues à l’époque : Poképédia, Bulbapedia, simulateur Showdown.

## Recoupées pour les règles nouvelles

- Bulbapedia : Strong winds, Primordial Sea, Desolate Land, Iron Ball, Grounded, Zapdos (notes d’efficacité), Air Balloon, Gravity, terrains (effet défensif du Champ Brumeux ; puissances des autres champs), Terastal phenomenon (défense), Snow, Sandstorm, type-resist berries.
- Poképédia : Météo (mécanisme), Souffle Delta, Mer Primaire, Terre Finale, Balle Fer, Ballon, Gravité, Type (Point de Mire, baies, Balle Fer, Ballon), Électhor (note Sol), pages des champs et de la téracristalisation pour les noms officiels.
- `@smogon/calc` 0.12.0 (déjà une dépendance du projet, `build/package.json`) : `mechanics/gen4.js`, `gen56.js`, `gen789.js`, `mechanics/util.js` (`getMoveEffectiveness`, `isGrounded`), `items.js` (`getBerryResistType`), `pokemon.js` (`hasType` / Téra).

Aucune source distante n’a été écrite dans `docs/data/`. `build-data.mjs` n’a pas été lancé.
