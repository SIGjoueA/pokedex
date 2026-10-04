// Download official artwork, resize to 256px max, WebP -> ../public/img/{id}.webp
import fs from 'node:fs'; import sharp from 'sharp';
const list = JSON.parse(fs.readFileSync('art-urls.json'));
fs.mkdirSync('../public/img', { recursive: true });
let i = 0, done = 0, fail = [];
await Promise.all(Array.from({ length: 12 }, async () => {
  while (i < list.length) {
    const { id, url } = list[i++]; const out = `../public/img/${id}.webp`;
    if (fs.existsSync(out)) { done++; continue; }
    try {
      let buf;
      for (let k = 0; k < 5; k++) { try { const r = await fetch(url); if (!r.ok) throw 0; buf = Buffer.from(await r.arrayBuffer()); break; } catch { await new Promise(r => setTimeout(r, 700 * (k + 1))); } }
      if (!buf) throw new Error('dl');
      await sharp(buf).trim().resize(256, 256, { fit: 'inside' }).webp({ quality: 72, effort: 5 }).toFile(out);
      if (++done % 100 === 0) console.log(done);
    } catch (e) { fail.push(id); }
  }
}));
console.log('done', done, 'failed', fail);
