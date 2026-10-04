// GO egg hatch pool (current season) parsed from the cached Leek Duck page (community source, not official).
// Returns { byKey: {entryKey: [[km, tag]]}, season, updated }. tag: '' | 'as' (Aventure Synchro) | 'ga' (cadeau d'ami) | 'gr' (cadeau de route)
import { get } from './lib.mjs';
const FORM_SUFFIX = { GALARIAN: 'galar', ALOLA: 'alola', ALOLAN: 'alola', HISUIAN: 'hisui', PALDEA: 'paldea', FEMALE: 'female', MALE: '' };
export async function parseEggs(byKey) {
  const t = await get('https://leekduck.com/eggs/', { name: 'leekduck-eggs', text: true });
  const season = (t.match(/current season, ([A-Za-z' ]+?)\./) || [])[1] || '';
  const updated = (t.match(/Updated on <time datetime="(\d{4}-\d{2}-\d{2})/) || [])[1] || '';
  const out = {}; const unmapped = [];
  for (const sec of t.split('<h2 id="').slice(1)) {
    const id = sec.slice(0, sec.indexOf('"'));
    const m = id.match(/^(\d+)-km-eggs(?:-(.+))?$/); if (!m) continue;
    const km = +m[1]; const tag = !m[2] ? '' : m[2].includes('adventure') ? 'as' : m[2].includes('friend') ? 'ga' : m[2].includes('route') ? 'gr' : '';
    for (const it of sec.matchAll(/pokemon_icons_crop\/pm(\d+)(?:\.f([A-Z_]+))?(?:\.c[A-Z_0-9]+)?\.icon\.png" alt="([^"]*)"/g)) {
      const dex = it[1], form = it[2];
      let key = dex;
      if (form) {
        const suf = FORM_SUFFIX[form] ?? form.toLowerCase().replace(/_/g, '-');
        key = suf === '' ? dex : `${dex}-${suf}`;
        if (!byKey[key]) { if (byKey[dex] && /\(Male\)/.test(it[3])) key = dex; else { unmapped.push(it[3]); continue; } }
      }
      if (!byKey[key]) { unmapped.push(it[3]); continue; }
      const arr = out[key] ||= [];
      if (!arr.some(x => x[0] === km && x[1] === tag)) arr.push(tag ? [km, tag] : [km]);
    }
  }
  if (unmapped.length) console.log('eggs: unmapped', unmapped.join(', '));
  return { byKey: out, season, updated };
}
