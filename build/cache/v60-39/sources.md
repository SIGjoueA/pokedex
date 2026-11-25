# v60.39 — Sources

- Fiches déjà livrées : `docs/data/sp/*.json` (`f.pl` Poképédia, `f.en` PokéAPI, `f.pln` méthodes).
- Catalogue : `docs/data/core.json` (28 jeux, `inGame` via `gb`).
- Intitulés PokéAPI : `docs/data/loc.json`.
- Priorité d’affichage : `ppLocs` / `encHTML0` dans `docs/app.js`.
- Aucune nouvelle source distante. L’index est produit par `build/fix-v60-39.mjs` (idempotent), sans `build-data.mjs`.
