// v29 Pokémon cries (PokéAPI « cries » repository; © Nintendo / Game Freak — fan project, non commercial).
// Re-runnable / polite: lists cached in build/.cache (lib.get, User-Agent), .ogg cached in build/.cache/cries/, 4 downloads at a time with retries.
// Output: docs/cries/{latest|legacy}/{pokemonId}.mp3 (mono 48 kb/s MP3: plays on iPhone Safari, unlike the source Ogg Vorbis),
//         docs/data/cries.json = { k: [latest|0, legacy|0] } ("l/6" → cries/latest/6.mp3, "o/6" → cries/legacy/6.mp3).
// Mapping: default form = species pokemon; other varieties (Méga, régionales, Gigamax…) = their own pokemon when the repo has a cry for it;
//          cosmetic forms / synthetic females = species cry. Identical files (same .ogg bytes) are stored once.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { get, pool, API, CACHE, DOCS, idOf } from './lib.mjs';
const UA = { 'user-agent': 'pokedex-pwa-build/2.0 (personal project; github.com/SIGjoueA/pokedex)' };
const OGG = path.join(CACHE, 'cries'); fs.mkdirSync(OGG, { recursive: true });
const OUT = path.join(DOCS, 'cries');
const core = JSON.parse(fs.readFileSync(path.join(DOCS, 'data/core.json'), 'utf8'));
const species = (await get(`${API}/pokemon-species?limit=5000`, { name: 'list_pokemon-species_names' })).results.map(r => ({ name: r.name, id: idOf(r.url) }));
const pokemon = (await get(`${API}/pokemon?limit=5000`, { name: 'list_pokemon_names' })).results.map(r => ({ name: r.name, id: idOf(r.url) }));
const spName = Object.fromEntries(species.map(s => [s.id, s.name])), pkByName = Object.fromEntries(pokemon.map(p => [p.name, p.id]));
const tree = await get('https://api.github.com/repos/PokeAPI/cries/git/trees/main?recursive=1', { name: 'cries_tree' });
const have = { latest: new Set(), legacy: new Set() };
for (const t of tree.tree) { const m = t.path.match(/^cries\/pokemon\/(latest|legacy)\/(\d+)\.ogg$/); if (m) have[m[1]].add(+m[2]); }
console.log('repo cries: latest', have.latest.size, 'legacy', have.legacy.size);
async function dl(kind, id) {
  const f = path.join(OGG, `${kind}-${id}.ogg`); if (fs.existsSync(f) && fs.statSync(f).size > 0) return f;
  const url = `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/${kind}/${id}.ogg`;
  for (let i = 0; i < 6; i++) {
    try { const r = await fetch(url, { headers: UA }); if (r.status === 404) return null; if (!r.ok) throw new Error('HTTP ' + r.status); fs.writeFileSync(f, Buffer.from(await r.arrayBuffer())); return f; }
    catch (e) { await new Promise(r => setTimeout(r, 800 * (i + 1) ** 2)); }
  }
  throw new Error('failed ' + url);
}
const pidOf = e => { if (e.k === String(e.id)) return e.id; const sfx = e.k.slice(String(e.id).length + 1); return pkByName[`${spName[e.id]}-${sfx}`] || null; };
const want = new Map(), map = {};
for (const e of core.e) {
  const pid = pidOf(e), sid = e.id, r = [];
  for (const kind of ['latest', 'legacy']) { const id = pid && have[kind].has(pid) ? pid : have[kind].has(sid) ? sid : null; r.push(id ? kind + ':' + id : 0); if (id) want.set(kind + ':' + id, [kind, id]); }
  map[e.k] = r;
}
console.log('to fetch', want.size);
let n = 0;
await pool([...want.values()], 4, async ([kind, id]) => { await dl(kind, id); if (++n % 400 === 0) console.log(' ', n); });
// transcode + dedupe by source bytes (stale MP3s of a previous run are removed)
const byHash = new Map(), file = {}, keep = new Set(); let bytes = 0, files = 0;
for (const [key, [kind, id]] of want) {
  const src = path.join(OGG, `${kind}-${id}.ogg`); if (!fs.existsSync(src)) continue;
  const h = crypto.createHash('sha1').update(fs.readFileSync(src)).digest('hex');
  if (byHash.has(h)) { file[key] = byHash.get(h); continue; }
  const sub = kind === 'latest' ? 'latest' : 'legacy', rel = `${kind === 'latest' ? 'l' : 'o'}/${id}`, dst = path.join(OUT, sub, id + '.mp3');
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  if (!fs.existsSync(dst)) execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', src, '-ac', '1', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '48k', dst]);
  byHash.set(h, rel); file[key] = rel; keep.add(path.join(sub, id + '.mp3')); bytes += fs.statSync(dst).size; files++;
}
for (const sub of ['latest', 'legacy']) for (const f of fs.existsSync(path.join(OUT, sub)) ? fs.readdirSync(path.join(OUT, sub)) : []) if (!keep.has(path.join(sub, f))) fs.unlinkSync(path.join(OUT, sub, f));
const out = {}; for (const [k, r] of Object.entries(map)) { const v = r.map(x => (x && file[x]) || 0); if (v[0] || v[1]) out[k] = v; }
fs.writeFileSync(path.join(DOCS, 'data/cries.json'), JSON.stringify(out));
console.log(`cries: ${files} fichiers MP3, ${(bytes / 1048576).toFixed(1)} Mo, ${Object.keys(out).length} formes avec un cri (${Object.values(out).filter(v => v[1]).length} avec cri ancien)`);
