// v47 (idempotent, chained last in apply-v34.mjs):
//  1. GO: refresh-go.mjs (stats / moves / evolution costs from the cached game master — PokeMiners or alexelgt mirror, see fetch-go.mjs;
//     skipped without build/.cache/go-latest.json) then apply-go-overrides.mjs again (Gigamax copies, announced debuts « upcoming »)
//  2. Pokédex descriptions: official Poképédia texts for versions that were machine-translated (fix-v47-desc.mjs, build/pokepedia/desc-v47.json)
//  3. Méga-Gemmes Z-A / Méga-Dimension + Orbes: item sprites (fix-v47-stones.mjs)
//  4. Grotte Métamo (Altering Cave, RF/VF + Émeraude): only Zubat exists there. The 8 other species of the planned Wonder Spot event
//     (Wattouat, Capumain, Pomdepik, Caratroc, Teddiursa, Malosse, Cerfrousse, Queulorior) were never distributed (Bulbapedia, Serebii,
//     PokéAPI issue #1457) and are not on Switch either (verified 2026-10-18) → their « Grotte Métamo (B…I) » rows are removed.
//     RF/VF Switch « Hors dex » list re-checked (Serebii, Bulbapedia, pokemon.com 2026-10-07): unchanged — Celebi (cadeau Pokémon HOME mobile
//     for completing the RF/VF Pokédex, cannot enter the game), Mentali / Noctali (no clock, no RSE on Switch) stay unobtainable.
import fs from 'node:fs'; import { execFileSync } from 'node:child_process';
const H = new URL('.', import.meta.url).pathname, node = f => execFileSync('node', [H + f], { stdio: 'inherit' });
node('refresh-go.mjs'); node('apply-go-overrides.mjs'); node('fix-v47-desc.mjs'); node('fix-v47-stones.mjs');
const D = new URL('../docs/data/', import.meta.url), rd = f => JSON.parse(fs.readFileSync(new URL(f, D))), wr = (f, o) => fs.writeFileSync(new URL(f, D), JSON.stringify(o));
{ const loc = rd('loc.json'), bad = new Set(loc.a.map((n, i) => /^Grotte Métamo \([B-I]\)$/.test(n) ? i : -1).filter(i => i >= 0)), core = rd('core.json'); let n = 0, sps = new Set();
  for (const id of new Set(core.e.map(e => e.id))) { const sp = rd(`sp/${id}.json`); let ch = false;
    for (const f of Object.values(sp.f)) for (const g of Object.keys(f.en || {})) { const L = f.en[g], K = L.filter(r => !bad.has(r[0])); if (K.length !== L.length) { n += L.length - K.length; ch = true; if (K.length) f.en[g] = K; else delete f.en[g]; } }
    if (ch) { wr(`sp/${id}.json`, sp); sps.add(id); } }
  console.log(`fix-v47 : Grotte Métamo, ${n} lignes de rencontre jamais distribuées retirées (${[...sps].join(', ') || 'déjà fait'})`); }
