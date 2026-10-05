// Fetch PokéAPI mega-stones → docs/img/stones/{item}.png + docs/data/mega-stones.json
import fs from 'node:fs';
import path from 'node:path';
import { get, API, DOCS, HERE, frName } from './lib.mjs';
import { loadAll } from './entries.mjs';
import { megaBase } from './battle.mjs';

const cat = await get(`${API}/item-category/mega-stones/`, { name: 'item_category_mega_stones' });
const stones = [];
for (const it of cat.items) {
  const I = await get(it.url);
  const spr = I.sprites?.default;
  stones.push({
    item: I.name,
    fr: frName(I.names) || I.name,
    sprite: spr,
    en: I.names?.find(n => n.language.name === 'en')?.name || I.name,
  });
}
const byItem = Object.fromEntries(stones.map(s => [s.item, s]));
console.log('stones', stones.length, 'with sprite', stones.filter(s => s.sprite).length);

const STEM = {
  manectric: 'manectite', mawile: 'mawilite', absol: 'absolite', alakazam: 'alakazite',
  banette: 'banettite', gengar: 'gengarite', heracross: 'heracronite', medicham: 'medichamite',
  pinsir: 'pinsirite', aerodactyl: 'aerodactylite', kangaskhan: 'kangaskhanite',
  tyranitar: 'tyranitarite', houndoom: 'houndoominite', ampharos: 'ampharosite',
  scizor: 'scizorite', glalie: 'glalitite', steelix: 'steelixite', sceptile: 'sceptilite',
  blaziken: 'blazikenite', swampert: 'swampertite', gardevoir: 'gardevoirite',
  sableye: 'sablenite', aggron: 'aggronite', sharpedo: 'sharpedonite', camerupt: 'cameruptite',
  altaria: 'altarianite', lucario: 'lucarionite', abomasnow: 'abomasite', gallade: 'galladite',
  audino: 'audinite', diancie: 'diancite', lopunny: 'lopunnite', salamence: 'salamencite',
  metagross: 'metagrossite', latias: 'latiasite', latios: 'latiosite',
  venusaur: 'venusaurite', charizard: 'charizardite', blastoise: 'blastoisinite',
  beedrill: 'beedrillite', pidgeot: 'pidgeotite', slowbro: 'slowbronite',
  gyarados: 'gyaradosite', mewtwo: 'mewtwonite', aggron: 'aggronite',
  latios: 'latiosite', latias: 'latiasite',
};

const { entries } = await loadAll();
const byKey = Object.fromEntries(entries.map(e => [e.key, e]));
const OUT = path.join(DOCS, 'img', 'stones');
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(path.join(DOCS, 'data'), { recursive: true });

async function dl(url, dest) {
  if (!url || fs.existsSync(dest)) return !!url && fs.existsSync(dest);
  for (let i = 0; i < 5; i++) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(r.status);
      fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
      return true;
    } catch (e) { if (i === 4) { console.warn('dl fail', url, e.message); return false; } await new Promise(r => setTimeout(r, 400 * (i + 1))); }
  }
}

function candidates(sp, xy) {
  const stems = [STEM[sp], `${sp}ite`, `${sp}nite`, `${sp}lite`].filter(Boolean);
  const out = [];
  for (const stem of stems) {
    if (xy) out.push(`${stem}-${xy}`, `${sp}ite-${xy}`, `${sp}nite-${xy}`);
    else out.push(stem);
  }
  return [...new Set(out)];
}

const map = {};
let hit = 0, miss = [];
for (const e of entries.filter(x => x.cat === 'mega')) {
  const mb = megaBase(e, byKey);
  const base = byKey[mb] || byKey[String(e.id)];
  const sp = (base?.S?.name || base?.pokemonName || '').toLowerCase();
  const xy = (e.sfx.match(/mega-(x|y|z)$/) || [])[1];
  let st = null, item = null;
  for (const c of candidates(sp, xy)) {
    if (byItem[c]) { st = byItem[c]; item = c; break; }
  }
  if (!st?.sprite) { miss.push(`${e.key} sp=${sp}`); continue; }
  const local = `img/stones/${st.item}.png`;
  const ok = await dl(st.sprite, path.join(DOCS, local));
  if (!ok) { miss.push(`${e.key} dl`); continue; }
  map[e.key] = { item: st.item, fr: st.fr, img: local };
  hit++;
}
fs.writeFileSync(path.join(HERE, 'mega-stones.json'), JSON.stringify({ byItem, map }));
// Fallback: Key Stone / Gemme Sésame sprite for Z-A megas without a classic stone
const ks = byItem['key-stone'] || (await (async () => {
  const I = await get(`${API}/item/key-stone/`, { name: 'item_key_stone' });
  return { item: I.name, fr: frName(I.names) || 'Gemme Sésame', sprite: I.sprites?.default };
})());
if (!byItem['key-stone'] && ks.sprite) {
  byItem['key-stone'] = ks;
}
const fallback = { item: 'key-stone', fr: ks.fr || 'Gemme Sésame', img: 'img/stones/key-stone.png', label: 'Méga-Gemme' };
if (ks.sprite) await dl(ks.sprite, path.join(DOCS, 'img/stones/key-stone.png'));
fs.writeFileSync(path.join(DOCS, 'data', 'mega-stones.json'), JSON.stringify({ fallback, stones: map }));
console.log('mapped', hit, '/', entries.filter(x => x.cat === 'mega').length, 'miss', miss.length);
console.log(miss.join('\n'));
