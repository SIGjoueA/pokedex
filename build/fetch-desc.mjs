// v31: French descriptions for the sheet popups (moves + held items), from PokéAPI's CSV dump (2 files, cached in build/.cache/csv).
// Abilities already have their French text in data/ref.json. Output: docs/data/desc.json { m: {moveId: text}, i: {itemId: text} } — latest FR text.
// Re-runnable: node fetch-desc.mjs [--refresh]
import fs from 'node:fs'; import path from 'node:path';
const HERE = path.dirname(new URL(import.meta.url).pathname), C = path.join(HERE, '.cache/csv'), DOCS = path.join(HERE, '../docs');
const UA = 'PokedexFR-build/1.0 (github.com/SIGjoueA/pokedex)';
fs.mkdirSync(C, { recursive: true });
async function csv(name) {
  const f = path.join(C, name + '.csv');
  if (!fs.existsSync(f) || process.argv.includes('--refresh')) {
    const r = await fetch(`https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/${name}.csv`, { headers: { 'User-Agent': UA } });
    if (!r.ok) throw new Error(name + ' ' + r.status); fs.writeFileSync(f, await r.text()); await new Promise(r => setTimeout(r, 800));
  }
  return parse(fs.readFileSync(f, 'utf8'));
}
function parse(s) { // RFC 4180 (quoted fields with newlines)
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < s.length; i++) { const ch = s[i];
    if (q) { if (ch === '"') { if (s[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true; else if (ch === ',') { row.push(cur); cur = ''; } else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; } else if (ch !== '\r') cur += ch; }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  const [h, ...r] = rows; return r.filter(x => x.length === h.length).map(x => Object.fromEntries(h.map((k, i) => [k, x[i]])));
}
const clean = t => t.replace(/\u00ad\s*/g, '').replace(/[\n\f\r]+/g, ' ').replace(/\s{2,}/g, ' ').replace(/ ([!?;:»])/g, '\u202f$1').replace(/« /g, '«\u202f').trim();
const latest = (rows, idk) => { const out = {}, vg = {}; for (const r of rows) if (r.language_id === '5') { const id = r[idk], v = +r.version_group_id; if (!(id in vg) || v > vg[id]) { vg[id] = v; out[id] = clean(r.flavor_text); } } return out; };
const moves = JSON.parse(fs.readFileSync(path.join(DOCS, 'data/moves.json'), 'utf8')), ref = JSON.parse(fs.readFileSync(path.join(DOCS, 'data/ref.json'), 'utf8'));
const mAll = latest(await csv('move_flavor_text'), 'move_id'), iAll = latest(await csv('item_flavor_text'), 'item_id');
const prose = {}; for (const r of await csv('item_prose')) if (r.local_language_id === '5' && r.short_effect) prose[r.item_id] = clean(r.short_effect);
const m = {}, i = {}; let mMiss = [], iMiss = [];
for (const id of Object.keys(moves)) mAll[id] ? (m[id] = mAll[id]) : mMiss.push(id);
for (const id of Object.keys(ref.it)) (iAll[id] || prose[id]) ? (i[id] = iAll[id] || prose[id]) : iMiss.push(id);
fs.writeFileSync(path.join(DOCS, 'data/desc.json'), JSON.stringify({ m, i }));
console.log(`desc.json: ${Object.keys(m).length}/${Object.keys(moves).length} moves, ${Object.keys(i).length}/${Object.keys(ref.it).length} items; missing moves ${mMiss.length} (${mMiss.slice(0, 12).map(x => moves[x][0]).join(', ')}…), items ${iMiss.length} (${iMiss.slice(0, 8).map(x => ref.it[x]).join(', ')})`);
fs.writeFileSync(path.join(HERE, 'desc-report.json'), JSON.stringify({ mMiss: mMiss.map(x => [x, moves[x][0]]), iMiss: iMiss.map(x => [x, ref.it[x]]) }, null, 1));
