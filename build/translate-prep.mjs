// Collects Pokédex texts that exist only in English in PokéAPI (all games before Noir/Blanc, B2W2, Légendes Arceus, partial SV...)
// and writes build/.cache/en-texts.json = [[cleanedEnglish, textWithFrenchNames], ...] for translate.py (machine translation).
import fs from 'node:fs';
import path from 'node:path';
import { get, API, idOf, frName, enName, HERE } from './lib.mjs';
const list = async ep => (await get(`${API}/${ep}?limit=5000`, { name: `list_${ep}` })).results.map(r => r.url);
export const clean = s => (s || '').replace(/[\n\f\r\u00ad]+/g, ' ').replace(/\s+/g, ' ').trim();
const names = []; // [en, fr]
for (const u of await list('pokemon-species')) { const S = await get(u); const en = enName(S.names), fr = frName(S.names); if (en && fr && en !== fr) names.push([en, fr]); }
const moves = [];
for (const u of await list('move')) { const M = await get(u); const en = enName(M.names), fr = frName(M.names); if (en && fr && en !== fr && /^[A-Za-z' .-]+$/.test(en)) moves.push([en, fr]); }
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// longest first so "Mr. Mime" wins over "Mime"
names.sort((a, b) => b[0].length - a[0].length); moves.sort((a, b) => b[0].length - a[0].length);
const nameMap = new Map(); for (const [en, fr] of names) { nameMap.set(en.toLowerCase(), fr); }
const moveMap = new Map(); for (const [en, fr] of moves) moveMap.set(en.toUpperCase(), fr);
const nameRe = new RegExp(`(?<![\\p{L}\\p{N}])(${names.map(n => esc(n[0])).join('|')})(?![\\p{L}\\p{N}])`, 'giu');
const moveRe = new RegExp(`(?<![\\p{L}\\p{N}])(${moves.filter(m => m[0].length > 3).map(n => esc(n[0].toUpperCase())).join('|')})(?![\\p{L}\\p{N}])`, 'gu');
const COMMON = new Set(['mew', 'muk', 'onix', 'seel', 'abra', 'ditto', 'eevee']); // short/ambiguous: only Capitalised or UPPER
export function preprocess(t) {
  let s = t.replace(/POK[ée]MON/g, 'Pokémon').replace(/POKéMON/g, 'Pokémon').replace(/Pok[eé]mon/g, 'Pokémon');
  s = s.replace(nameRe, m => {
    const fr = nameMap.get(m.toLowerCase()); if (!fr) return m;
    if (COMMON.has(m.toLowerCase()) && !(m === m.toUpperCase() || m[0] === m[0].toUpperCase())) return m;
    return fr;
  });
  s = s.replace(moveRe, m => moveMap.get(m) || m);
  return s;
}
if (process.argv[1].endsWith('translate-prep.mjs')) {
  const out = new Map();
  for (const u of await list('pokemon-species')) {
    const S = await get(u);
    const frV = new Set(S.flavor_text_entries.filter(f => f.language.name === 'fr').map(f => f.version.name));
    for (const f of S.flavor_text_entries) {
      if (f.language.name !== 'en' || frV.has(f.version.name)) continue;
      const raw = clean(f.flavor_text); if (raw && !out.has(raw)) out.set(raw, preprocess(raw));
    }
  }
  fs.writeFileSync(path.join(HERE, '.cache/en-texts.json'), JSON.stringify([...out]));
  console.log('texts to translate', out.size);
  const a = [...out]; for (const i of [0, 500, 1500, 3000]) console.log(a[i]);
}
if (process.argv[1].endsWith('translate-prep.mjs')) fs.writeFileSync(path.join(HERE, '.cache/names-en-fr.json'), JSON.stringify(names.filter(n => n[0].length > 4)));
