// Stage 1: download (and cache in build/.cache) everything needed from PokéAPI.
import { get, pool, API, idOf } from './lib.mjs';
const list = async (ep) => (await get(`${API}/${ep}?limit=5000`, { name: `list_${ep}` })).results.map(r => r.url);
const N = 8;
const steps = [
  ['generation', 1], ['version-group', 1], ['version', 1], ['pokedex', 1], ['egg-group', 1], ['type', 1],
  ['pokemon-species', 1], ['pokemon', 1], ['pokemon-form', 1], ['move', 1], ['ability', 1], ['evolution-chain', 1],
];
let total = 0;
for (const [ep] of steps) {
  const urls = await list(ep);
  let n = 0;
  await pool(urls, N, async u => { await get(u); if (++n % 250 === 0) console.log(ep, n, '/', urls.length); });
  console.log('done', ep, urls.length); total += urls.length;
}
console.log('total', total);
