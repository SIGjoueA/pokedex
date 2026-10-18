// v34 audit fixes, applied after a rebuild (end of build-data.mjs) or alone: node apply-v34.mjs. Every step is idempotent.
import { execFileSync } from 'node:child_process';
const H = new URL('.', import.meta.url).pathname, R = new URL('..', import.meta.url).pathname;
const node = f => execFileSync('node', [H + f], { stdio: 'inherit' }), py = f => execFileSync('python3', [H + f], { stdio: 'inherit', cwd: R });
node('fix-v34-types.mjs');      // Arceus / Silvallié: type of each plate / memory
node('fix-v34-lgpe.mjs');       // Let's Go: Kanto + Meltan / Melmetal only
node('fix-v34-merge.mjs');      // Papilord / Lépidonille / Pérégrain: one form each (core.mg → migration in the app)
node('fix-v34-names.mjs');      // Noyau, Zygarde 10 %, Floette Fleur …, Zygarde 10 % in Z-A, Xerneas / Koraidon / Miraidon battle forms
py('fix-v34-frlgsw-loc.py');    // RF/VF Switch: no GBA-only rows, « Centre Pokémon »
py('fix-v34-desc.py');          // leftover machine translations (units)
node('fix-v34-za-alpha.mjs');   // Z-A Barons from Poképédia (needs pokepedia.mjs apply first)
node('fix-v35-formnames.mjs');  // v35: official name of default forms (core fn) + aligned sibling names
node('fix-v35-sprites.mjs');   // v35: HOME / animated sprite file of each form (core hs / as)
node('fetch-home.mjs');        // v35: self-hosted HOME webp (img/h, core hh)
node('apply-go-overrides.mjs'); // GO releases / Mordudor / evolution items (go-overrides.json), after the type fix
node('fix-v36.mjs');           // v36: Gigamax, Théffroi / Polthégeist Authentique, talents sans \\n
node('fix-v37.mjs');           // v37: Gigamax → forme de base, Salarsen Gigamax Aigüe / Grave
node('fix-v38.mjs');           // v38: Dynamax GO, icônes Énergie Primo
node('fix-v39.mjs');           // v39: revue v33 (RF/VF Switch hors dex, Isolarmure, Méga-Gemmes, Casino, shiny Z-A, noms de formes, Meltan GO)
node('fix-v42.mjs');           // v42: lieux GBA / DS depuis Poképédia (espèces sans rencontre PokéAPI)
node('fix-v44.mjs');           // v44: Salarsen Gigamax = une seule fiche
node('fix-v44c.mjs');          // v44: différences mâle / femelle d’apparence = une seule entrée (core fe, bouton ♀)
node('fix-v44d.mjs');          // v44: Méga-Mistigrix une seule entrée (image ♂ / ♀), « mâle » / « femelle » sur les 4 vraies différences
node('fix-v47.mjs');           // v47: GO depuis le game master (refresh-go + overrides), descriptions Poképédia, images des Méga-Gemmes Z-A, Grotte Métamo
