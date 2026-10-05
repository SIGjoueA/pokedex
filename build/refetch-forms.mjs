import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { loadAll } from './entries.mjs';
import { DOCS, HERE } from './lib.mjs';

const { entries } = await loadAll();
const IDS = new Set([201,412,414,421,422,423,585,586,664,665,666,669,670,671,676,854,855,869,999,1012,1013,1017,1024]);
const want = entries.filter(e => IDS.has(e.id) && e.img);
const IMG = path.join(DOCS, 'img');
const MAN = path.join(HERE, 'art-manifest.json');
const man = JSON.parse(fs.readFileSync(MAN, 'utf8'));
async function dl(url) {
  for (let k = 0; k < 6; k++) {
    try { const r = await fetch(url); if (!r.ok) throw new Error(r.status); return Buffer.from(await r.arrayBuffer()); }
    catch (e) { if (k === 5) throw e; await new Promise(r => setTimeout(r, 400 * (k + 1) ** 2)); }
  }
}
const sha = b => crypto.createHash('sha1').update(b).digest('hex');
const enc = (buf, out) => sharp(buf).trim().resize(256, 256, { fit: 'inside' }).webp({ quality: 72, effort: 5 }).toFile(out);
let n = 0, fail = [];
for (const e of want) {
  try {
    const out = path.join(IMG, e.key + '.webp');
    const buf = await dl(e.img); man[e.key] ||= {}; man[e.key].sha = sha(buf);
    await enc(buf, out);
    if (e.shiny) {
      const so = path.join(IMG, 's', e.key + '.webp');
      const sb = await dl(e.shiny); man[e.key].shSha = sha(sb);
      if (man[e.key].shSha !== man[e.key].sha) await enc(sb, so);
      else fs.rmSync(so, { force: true });
    }
    n++; if (n % 40 === 0) console.log(n, '/', want.length);
  } catch (err) { fail.push(e.key + ':' + err.message); }
}
fs.writeFileSync(MAN, JSON.stringify(man));
console.log('refetched', n, 'fail', fail.length, fail.slice(0, 8));
