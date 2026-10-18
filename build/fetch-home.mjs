// v35: self-hosted HOME images (default art): PokeAPI sprites other/home/<hs>.png → docs/img/h/<key>.webp, 256 px, WebP q78.
// Raw PNGs cached in build/.cache/home/. Sets core e.hh = 1 for each written file. Rerunnable (skips existing files).
import fs from 'node:fs'; import sharp from 'sharp';
const D = new URL('../docs/', import.meta.url), C = new URL('./.cache/home/', import.meta.url), O = new URL('img/h/', D);
fs.mkdirSync(C, { recursive: true }); fs.mkdirSync(O, { recursive: true });
const core = JSON.parse(fs.readFileSync(new URL('data/core.json', D)));
const BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/';
const todo = core.e.filter(e => e.hs); let ok = 0, bad = [];
async function one(e) {
  const out = new URL(`${e.k}.webp`, O); if (fs.existsSync(out)) { e.hh = 1; ok++; return; }
  const raw = new URL(e.hs.replace('/', '_') + '.png', C);
  if (!fs.existsSync(raw)) { const r = await fetch(BASE + e.hs + '.png'); if (!r.ok) { bad.push(e.k); return; } fs.writeFileSync(raw, Buffer.from(await r.arrayBuffer())); }
  await sharp(fs.readFileSync(raw)).resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 78, alphaQuality: 90 }).toFile(out.pathname);
  e.hh = 1; ok++;
}
for (const e of core.e) delete e.hh;
const q = todo.slice(); await Promise.all(Array.from({ length: 12 }, async () => { while (q.length) { const e = q.shift(); try { await one(e); } catch { bad.push(e.k); } } }));
fs.writeFileSync(new URL('data/core.json', D), JSON.stringify(core));
console.log('HOME webp :', ok, 'échecs', bad.length, bad.slice(0, 10).join());
