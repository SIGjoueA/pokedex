// Obtainable species per version group = species (default form) with a learnset in that version group (PokéAPI GraphQL, beta DB).
// A learnset means the species is in the game's data → obtainable by trade / transfer (Pal Park, Poké Transfer, Bank, HOME) / event.
// Output: build/obtainable.json { vg: [species ids] } (cached copy in build/.cache/obtainable-raw.json)
import fs from 'node:fs';
const EP = 'https://beta.pokeapi.co/graphql/v1beta';
const q = async query => { const r = await fetch(EP, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) }); const j = await r.json(); if (j.errors) throw new Error(JSON.stringify(j.errors)); return j.data; };
const vgs = (await q('{ pokemon_v2_versiongroup { id name } }')).pokemon_v2_versiongroup;
const poke = (await q('{ pokemon_v2_pokemon { id pokemon_species_id is_default } }')).pokemon_v2_pokemon;
const def = new Map(poke.filter(p => p.is_default).map(p => [p.id, p.pokemon_species_id]));
const out = {};
for (const vg of vgs) {
  const rows = (await q(`{ pokemon_v2_pokemonmove(where: {version_group_id: {_eq: ${vg.id}}}, distinct_on: pokemon_id) { pokemon_id } }`)).pokemon_v2_pokemonmove;
  out[vg.name] = [...new Set(rows.map(r => def.get(r.pokemon_id)).filter(Boolean))].sort((a, b) => a - b);
  console.log(vg.name, out[vg.name].length, 'max', out[vg.name].at(-1));
}
fs.writeFileSync(new URL('./obtainable.json', import.meta.url), JSON.stringify(out));
