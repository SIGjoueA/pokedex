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
// v50c: TCGdex stops at B2a (2026-02). Missing sets / cards are merged from two community sources, politely (1 request / 2 s):
// - Limitless TCG Pocket (pocket.limitlesstcg.com): set list, dates, card numbers, English names, type, rarity, small English card images;
// - Pokékalos cartodex (pokekalos.fr): French set + card names and rarity including « chromatique » (Limitless does not tell shiny from stars).
// Card ids stay « <set>-<NNN> » (TCGdex style), so existing user data keeps working.
const sleep = ms => new Promise(r => setTimeout(r, ms));
const UA = { 'user-agent': 'Mozilla/5.0 (personal Pokédex PWA; contact pokedexsigjouea@gmail.com)' };
const page = async u => { for (let t = 0; t < 4; t++) { await sleep(2000 + t * 8000); const r = await fetch(u, { headers: UA }).catch(() => null); if (r && r.ok) return r.text(); console.log('retry', u, r && r.status); } return ''; };
const txt = h => h.replace(/<[^>]+>/g, ' ').replace(/&#0?39;|&rsquo;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const LSYM = { '◊': 0, '◊◊': 1, '◊◊◊': 2, '◊◊◊◊': 3, '☆': 4, '☆☆': 5, '☆☆☆': 6, 'Crown Rare': 9, 'Promo': 10 };
const KSYM = { '1 losange': 0, '2 losanges': 1, '3 losanges': 2, '4 losanges': 3, '1 étoile': 4, '2 étoiles': 5, '3 étoiles': 6, '1 étoile chromatique': 7, '2 étoiles chromatiques': 8, '1 couronne': 9 };
const MON = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
const core = JSON.parse(fs.readFileSync(new URL('../docs/data/core.json', import.meta.url)));
const nn = x => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’']/g, "'").toLowerCase().trim();
const byFr = new Map(), byEn = new Map(); for (const e of core.e) { if (!byFr.has(nn(e.n))) byFr.set(nn(e.n), e.id); if (e.en && !byEn.has(nn(e.en))) byEn.set(nn(e.en), e.id); }
const dexOf = (fr, en) => { const strip = x => x.replace(/[-\s]ex$/i, '').replace(/^(Méga-|Mega |Méga )/i, '').replace(/ [XY]$/, '');
  for (const [m, x] of [[byFr, fr], [byFr, fr && strip(fr)], [byEn, en], [byEn, en && strip(en)], [byFr, fr && strip(fr).replace(/ (d’|d'|de |du ).*$/, '')], [byEn, en && strip(en).replace(/^(Alolan|Galarian|Hisuian|Paldean) /, '')]]) if (x && m.has(nn(x))) return [m.get(nn(x))];
  for (const x of [fr, en]) if (x) { const w = strip(x.replace(/-ex\b/i, '')).split(' '); while (w.length > 1) { w.pop(); const k = nn(w.join(' ')); if (byFr.has(k)) return [byFr.get(k)]; if (byEn.has(k)) return [byEn.get(k)]; } }
  return []; };
const lidx = await page('https://pocket.limitlesstcg.com/cards');
const lsets = [...lidx.matchAll(/<a href="\/cards\/([^"]+)">\s*<span class="set-icon">.*?<\/span>\s*(.*?)\s*<span[^]*?<a href="\/cards\/\1">([^<]*)<\/a>[^]*?<a href="\/cards\/\1">(\d+)<\/a>/g)].map(m => ({ id: m[1], en: txt(m[2]), date: m[3], n: +m[4] }));
const kidx = await page('https://www.pokekalos.fr/jeux/mobile/pocket/cartodex/extensions.html');
const kslug = {}; for (const m of kidx.matchAll(/href="(\/jeux\/mobile\/pocket\/cartodex\/extensions\/[^"]+\.html)"[^>]*data-name="([^"]*)"[^>]*data-date="([^"]*)"[^>]*>[^]*?class="pkpi-code">([^<]+)</g)) kslug[txt(m[4]).replace(/^PROMO-/i, 'P-')] = { u: m[1], n: txt(m[2]), d: m[3] };
for (const [c, u] of [['P-A', 'promo-a'], ['P-B', 'promo-b']]) kslug[c] ||= { u: `/jeux/mobile/pocket/cartodex/extensions/${u}.html`, n: c.replace('P-', 'Promo-') };
console.log('Pokékalos sets', Object.keys(kslug).join(' '));
const KNAME = { B2b: 'Méga-Rayonnement', B3: 'Aura Palpitante', B3a: 'Propulsion Paradoxe', B3b: 'Jours Heureux', B4: 'Domination Céleste', B4a: 'L’Ambition de la Team Rocket', B4b: 'Booster de Luxe Méga', A4b: 'Booster de Luxe ex', 'P-B': 'Promo-B' }; // Poképédia / Pokékalos, if the index layout changes
const enFr = new Map(); for (const st of sets) for (const c of st.cards) if (c[4]) enFr.set(c[1], c[1]);
let added = 0;
for (const L of lsets) {
  const have = sets.find(x => x.id === L.id); if (have && have.cards.length >= L.n) continue;
  const lh = await page(`https://pocket.limitlesstcg.com/cards/${L.id}?display=list`);
  const rows = [...lh.matchAll(/<tr data-hover="([^"]*)">([^]*?)<\/tr>/g)].map(m => { const td = [...m[2].matchAll(/<td[^>]*>([^]*?)<\/td>/g)].map(x => txt(x[1])); return { no: +td[1], en: td[2], typ: td[3], r: td[4] }; }).sort((a, b) => a.no - b.no);
  // shiny: in Pocket numbering, ☆ cards after the first ☆☆ block are « 1 chromatique », then ☆☆ = « 2 chromatiques » (checked on A1–B2: exact)
  let s2 = false, sh = false; for (const r of rows) { let k = LSYM[r.r] ?? 10; if (k === 5 && !sh) s2 = true; if (k === 4 && s2) { k = 7; sh = true; } else if (k === 5 && sh) k = 8; r.k = k; }
  const K = kslug[L.id]; const kh = K ? await page('https://www.pokekalos.fr' + K.u) : '';
  const kc = new Map([...kh.matchAll(/<a class="pkp-card"[^>]*data-name="([^"]*)" data-number="([^"]*)" data-rarity="[^"]*">[^]*?aria-label="([^"]*)"/g)].map(m => [+m[2], { n: txt(m[1]), r: KSYM[m[3].split(' ·')[0]] }]));
  const promo = /^P-/.test(L.id);
  const cards = rows.map(r => { const k = kc.get(r.no), lid = String(r.no).padStart(3, '0'), cat = /^(Item|Supporter|Tool|Stadium)/.test(r.typ) ? 1 : 0, fr = k && k.n;
    return [lid, fr || r.en, promo ? 10 : k && k.r != null ? k.r : r.k, cat ? [] : dexOf(fr, r.en), cat, 3]; });
  const d = (/^(\d+) (\w{3}) (\d+)$/.exec(L.date) || []); const date = d.length ? `20${d[3]}-${MON[d[2]]}-${d[1].padStart(2, '0')}` : (have ? have.d : (K && K.d) || '');
  if (have) { const ids = new Set(have.cards.map(c => c[0])); const extra = cards.filter(c => !ids.has(c[0])); have.cards.push(...extra); have.cards.sort((a, b) => a[0].localeCompare(b[0], 'en', { numeric: true })); added += extra.length; console.log(L.id, '+', extra.length, '(Limitless / Pokékalos)'); }
  else { sets.push({ id: L.id, n: KNAME[L.id] || (K && K.n) || L.en, en: L.en, d: date, o: 0, cards, src: 'll' }); added += cards.length; console.log(L.id, sets.at(-1).n, cards.length, kc.size ? 'FR ok' : 'no FR'); }
}
console.log('merged cards', added);
sets.sort((a, b) => (a.d || '').localeCompare(b.d || '') || a.id.localeCompare(b.id));
if (unk.size) console.log('unknown rarities', [...unk]);
const out = { v: new Date().toISOString().slice(0, 10), src: 'TCGdex', img: 'https://assets.tcgdex.net/', r: RAR, s: sets };
fs.writeFileSync(new URL('../docs/data/pocket.json', import.meta.url), JSON.stringify(out));
console.log('sets', sets.length, 'cards', sets.reduce((a, s) => a + s.cards.length, 0));
