// Stage 1b: Pokémon GO community data (cached in build/.cache).
//  - PokeMiners game_masters (raw GAME_MASTER dump): base stats, moves, evolutions, buddy distance, candy.
//  - pogoapi.net: list of released Pokémon + shiny availability (not derivable from the game master).
import { get } from './lib.mjs';
await get('https://raw.githubusercontent.com/PokeMiners/game_masters/master/latest/latest.json', { name: 'go-latest' });
await get('https://raw.githubusercontent.com/PokeMiners/game_masters/master/latest/timestamp.txt', { name: 'go-timestamp', text: true });
for (const f of ['released_pokemon', 'shiny_pokemon', 'alolan_pokemon', 'galarian_pokemon', 'pokemon_max_cp', 'cp_multiplier', 'mega_pokemon', 'pokemon_evolutions']) {
  await get(`https://pogoapi.net/api/v1/${f}.json`, { name: 'pogoapi-' + f });
}
console.log('GO data cached');
