// Stage 1b: encounters, machines (TM/HM), locations from PokéAPI + GO egg data from pogoapi.net -> build/.cache
import { get, pool, API, idOf } from './lib.mjs';
const list = async ep => (await get(`${API}/${ep}?limit=5000`, { name: `list_${ep}` })).results.map(r => r.url);
const N = 8;
const run = async (label, urls) => { let n = 0; await pool(urls, N, async u => { await get(u); if (++n % 300 === 0) console.log(label, n, '/', urls.length); }); console.log('done', label, urls.length); };
const pk = await list('pokemon');
await run('encounters', pk.map(u => `${API}/pokemon/${idOf(u)}/encounters`));
await run('machine', await list('machine'));
// referenced location areas -> locations
const areas = new Set();
for (const u of pk) { const e = await get(`${API}/pokemon/${idOf(u)}/encounters`); e.forEach(x => areas.add(x.location_area.url)); }
await run('location-area', [...areas]);
const locs = new Set();
for (const u of areas) { const a = await get(u); locs.add(a.location.url); }
await run('location', [...locs]);
await run('region', await list('region'));
await get('https://leekduck.com/eggs/', { name: 'leekduck-eggs', text: true });
console.log('ok');
await run('encounter-method', await list('encounter-method'));
await run('encounter-condition-value', await list('encounter-condition-value'));
await run('encounter-condition', await list('encounter-condition'));
