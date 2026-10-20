// Fetch Pokémon TCG Pocket data from TCGdex (https://tcgdex.dev, MIT-licensed open API) → docs/data/pocket.json.
// French first, English fallback for names. Images are not bundled: the app loads `${img}/low.webp` on demand.
// Output: { v, src, r: [rarity labels], s: [{ id, n, d, c (cards) , cards: [[localId, name, rarityIdx, [dexIds], cat]] }] }
import fs from 'fs';
const API = 'https://api.tcgdex.net/v2/';
const get = async (u, t = 4) => { for (;;) { try { const r = await fetch(API + u); if (r.status === 404) return null; if (!r.ok) throw new Error(r.status); return await r.json(); } catch (e) { if (!--t) throw new Error(u + ' ' + e.message); await new Promise(r => setTimeout(r, 1500)); } } };
const RAR = ['Un Diamant', 'Deux Diamants', 'Trois Diamants', 'Quatre Diamants', 'Une Étoile', 'Deux Étoiles', 'Trois Étoiles', 'Un chromatique', 'Deux chromatiques', 'Couronne', 'Sans Rareté'];
const RMAP = { 'One Diamond': 0, 'Two Diamond': 1, 'Three Diamond': 2, 'Four Diamond': 3, 'One Star': 4, 'Two Star': 5, 'Three Star': 6, 'One Shiny': 7, 'Two Shiny': 8, 'Crown': 9, 'None': 10 };
const pool = async (items, n, fn) => { const out = new Array(items.length); let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); } })); return out; };
const ser = await get('fr/series/tcgp'), serEn = await get('en/series/tcgp');
const ids = [...new Set([...serEn.sets.map(s => s.id), ...ser.sets.map(s => s.id)])];
const sets = [], unk = new Set();
for (const id of ids) {
  const fr = await get('fr/sets/' + id), en = await get('en/sets/' + id); const base = fr || en; if (!base) continue;
  const enC = new Map((en ? en.cards : []).map(c => [c.localId, c])), frC = new Map((fr ? fr.cards : []).map(c => [c.localId, c]));
  const lids = [...new Set([...(en ? en.cards : []), ...(fr ? fr.cards : [])].map(c => c.localId))];
  const cards = await pool(lids, 12, async lid => {
    const d = await get('en/cards/' + id + '-' + lid) || {}; const f = frC.get(lid), e = enC.get(lid);
    let r = RMAP[d.rarity]; if (r == null) { unk.add(d.rarity); r = 10; }
    const img = (f && f.image) || (e && e.image) || d.image || '';
    return [lid, (f && f.name) || (e && e.name) || d.name || '?', r, d.dexId || [], d.category === 'Pokemon' || d.category === 'Pokémon' ? 0 : 1, img ? (img.includes('/fr/') ? 1 : 0) : 2];
  });
  cards.sort((a, b) => a[0].localeCompare(b[0], 'en', { numeric: true }));
  sets.push({ id, n: (fr && fr.name) || base.name, en: en && en.name, d: base.releaseDate || '', o: base.cardCount.official, cards });
  console.log(id, sets.at(-1).n, cards.length);
}
sets.sort((a, b) => (a.d || '').localeCompare(b.d || '') || a.id.localeCompare(b.id));
if (unk.size) console.log('unknown rarities', [...unk]);
const out = { v: new Date().toISOString().slice(0, 10), src: 'TCGdex', img: 'https://assets.tcgdex.net/', r: RAR, s: sets };
fs.writeFileSync(new URL('../docs/data/pocket.json', import.meta.url), JSON.stringify(out));
console.log('sets', sets.length, 'cards', sets.reduce((a, s) => a + s.cards.length, 0));
