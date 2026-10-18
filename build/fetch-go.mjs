// Stage 1b: Pokémon GO game master (cached in build/.cache, always re-downloaded).
// v47: pogoapi.net is no longer maintained → no network call to it any more. Released / shiny / Alola / Galar / Mega base lists are a frozen
// snapshot in build/go-frozen.json, completed by hand in build/go-overrides.json.
// Game master = the raw Niantic GAME_MASTER dump, same format from two community mirrors; the newest one wins:
//  - PokeMiners game_masters (latest/latest.json + latest/timestamp.txt)
//  - alexelgt/game_masters (GAME_MASTER.json + timestamp.json), mirror updated more often since 2026-09
// Writes .cache/go-latest.json, .cache/go-timestamp.txt (ms epoch), .cache/go-source.txt. Then: node refresh-go.mjs (lean update of docs/data)
// or a full rebuild (go.mjs). Usage: node fetch-go.mjs
import fs from 'node:fs'; import path from 'node:path';
const C = path.join(path.dirname(new URL(import.meta.url).pathname), '.cache'); fs.mkdirSync(C, { recursive: true });
const UA = { 'User-Agent': 'PokedexPWA/1.0 (personal PWA)' };
const txt = async u => { for (let i = 0; i < 4; i++) { try { const r = await fetch(u, { headers: UA }); if (!r.ok) throw new Error(u + ' HTTP ' + r.status); return await r.text(); } catch (e) { if (i === 3) throw e; await new Promise(r => setTimeout(r, 2000 * (i + 1))); } } };
const SRC = [
  { id: 'PokeMiners', gm: 'https://raw.githubusercontent.com/PokeMiners/game_masters/master/latest/latest.json', ts: async () => +(await txt('https://raw.githubusercontent.com/PokeMiners/game_masters/master/latest/timestamp.txt')).trim() },
  { id: 'alexelgt', gm: 'https://raw.githubusercontent.com/alexelgt/game_masters/master/GAME_MASTER.json', ts: async () => +JSON.parse(await txt('https://raw.githubusercontent.com/alexelgt/game_masters/master/timestamp.json')).uploadTime },
];
const got = [];
for (const s of SRC) { try { const t = await s.ts(); if (!t) throw new Error('no timestamp'); got.push({ ...s, t }); console.log(`${s.id}: ${new Date(t).toISOString()}`); } catch (e) { console.log(`! ${s.id}: ${e.message}`); } }
if (!got.length) throw new Error('no game master source reachable');
got.sort((a, b) => b.t - a.t);
for (const s of got) {
  try { const body = await txt(s.gm); const gm = JSON.parse(body);
    if (!Array.isArray(gm) || !gm.some(e => e.data?.pokemonSettings) || !gm.some(e => e.data?.playerLevel)) throw new Error('unexpected format');
    fs.writeFileSync(path.join(C, 'go-latest.json'), body); fs.writeFileSync(path.join(C, 'go-timestamp.txt'), String(s.t)); fs.writeFileSync(path.join(C, 'go-source.txt'), s.id);
    console.log(`GO game master cached: ${s.id} ${new Date(s.t).toISOString().slice(0, 10)} (${gm.length} templates)`); process.exit(0);
  } catch (e) { console.log(`! ${s.id}: ${e.message}`); }
}
throw new Error('no usable game master');
