// v60.34 : rendus shiny HOME auto-hébergés.
// PokéAPI sprites other/home/shiny/<hs>.png → docs/img/hs/<key>.webp, 256 px, WebP q78.
// PNG bruts dans build/.cache/home-shiny/. Relançable (ignore les fichiers déjà écrits).
// Ne modifie pas core.json. Les formes sans hs n’ont pas de shiny HOME.
import fs from 'node:fs';
import sharp from 'sharp';

const D = new URL('../docs/', import.meta.url);
const C = new URL('./.cache/home-shiny/', import.meta.url);
const O = new URL('img/hs/', D);
fs.mkdirSync(C, { recursive: true });
fs.mkdirSync(O, { recursive: true });

const core = JSON.parse(fs.readFileSync(new URL('data/core.json', D)));
const BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/shiny/';

const entries = [];
for (const e of core.e) {
  if (e.hs && e.sh) entries.push({ k: e.k, hs: e.hs });
  if (e.fe && e.fe.hs && e.fe.sh) entries.push({ k: e.fe.k, hs: e.fe.hs });
}

let ok = 0, skip = 0, bad = [];
async function one(e) {
  const out = new URL(`${e.k}.webp`, O);
  if (fs.existsSync(out)) { skip++; ok++; return; }
  const raw = new URL(String(e.hs).replaceAll('/', '_') + '.png', C);
  if (!fs.existsSync(raw)) {
    const r = await fetch(BASE + e.hs + '.png');
    if (!r.ok) { bad.push(e.k + ' (' + r.status + ')'); return; }
    fs.writeFileSync(raw, Buffer.from(await r.arrayBuffer()));
  }
  await sharp(fs.readFileSync(raw)).resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 78, alphaQuality: 90 }).toFile(out.pathname);
  ok++;
}

const q = entries.slice();
await Promise.all(Array.from({ length: 12 }, async () => {
  while (q.length) {
    const e = q.shift();
    try { await one(e); } catch (err) { bad.push(e.k + ' (' + (err && err.message) + ')'); }
  }
}));
console.log('shiny HOME webp :', ok, 'dont déjà présents', skip, 'échecs', bad.length, bad.slice(0, 20).join(', '));
