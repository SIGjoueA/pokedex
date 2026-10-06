// Stage 2: official artwork / HOME renders -> 256px WebP.
//   docs/img/{key}.webp   (key = "25" or "26-alola")      -> shown in lists/detail (cached for offline)
//   docs/img/s/{key}.webp (shiny, loaded on demand only)  -> never part of the background download
// Forms whose artwork is byte-identical to the base (or to another form) are dropped (written to art-dupes.json).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { DOCS, HERE, pool } from './lib.mjs';
import { loadAll } from './entries.mjs';

const { entries } = await loadAll();
const IMG = path.join(DOCS, 'img'); fs.mkdirSync(path.join(IMG, 's'), { recursive: true });
const MAN = path.join(HERE, 'art-manifest.json');
const man = fs.existsSync(MAN) ? JSON.parse(fs.readFileSync(MAN, 'utf8')) : {};
async function dl(url) {
  for (let k = 0; k < 6; k++) {
    try { const r = await fetch(url); if (!r.ok) throw new Error(r.status); return Buffer.from(await r.arrayBuffer()); }
    catch (e) { if (k === 5) throw e; await new Promise(r => setTimeout(r, 600 * (k + 1) ** 2)); }
  }
}
const sha = b => crypto.createHash('sha1').update(b).digest('hex');
const enc = (buf, out, q) => sharp(buf).trim().resize(256, 256, { fit: 'inside' }).webp({ quality: q, effort: 5 }).toFile(out);
const speciesWithForms = new Set(entries.filter(e => e.cat !== 'base').map(e => e.id));
const jobs = entries.filter(e => e.img);
let n = 0, fail = [];
await pool(jobs, 10, async e => {
  const m = man[e.key] ||= {};
  try {
    const out = path.join(IMG, e.key + '.webp');
    const needMain = e.cat !== 'base' || !fs.existsSync(out);
    const needHash = e.cat === 'base' ? speciesWithForms.has(e.id) && !m.sha : !m.sha;
    if ((needMain && !(m.sha && fs.existsSync(out))) || needHash) {
      const buf = await dl(e.img); m.sha = sha(buf);
      if (!fs.existsSync(out) && e.cat !== 'dupe') await enc(buf, out, 72);
    }
    if (e.shiny) {
      const so = path.join(IMG, 's', e.key + '.webp');
      if (!m.shSha || !fs.existsSync(so)) {
        const sb = await dl(e.shiny); m.shSha = sha(sb);
        if (m.shSha !== m.sha) await enc(sb, so, 68);
      }
    }
  } catch (err) { fail.push(e.key + ':' + err.message); }
  if (++n % 200 === 0) { console.log(n, '/', jobs.length); fs.writeFileSync(MAN, JSON.stringify(man)); }
});
fs.writeFileSync(MAN, JSON.stringify(man));
// duplicates among forms of one species (same bytes as the base or an earlier form)
const KEEP_DUPES = new Set(['201-f']); // Zarbi F has no distinct artwork but must stay listed (image copied from the base)
// Species whose forms share one artwork but are real, separately tracked forms: Cheniselle capes, Lépidonille/Pérégrain patterns, Pitrouille/Banshitrouye sizes (Taille S/M/L/XL)
const KEEP_DUPE_SPECIES = new Set([414, 664, 665, 710, 711]);
const dupes = []; const seen = {};
for (const e of entries) {
  const m = man[e.key]; if (!m?.sha) continue;
  const k = e.id + ':' + m.sha;
  if (seen[k]) { if (e.cat !== 'base' && !KEEP_DUPES.has(e.key) && !KEEP_DUPE_SPECIES.has(e.id)) dupes.push(e.key); } else seen[k] = e.key;
}
fs.writeFileSync(path.join(HERE, 'art-dupes.json'), JSON.stringify(dupes));
for (const k of dupes) for (const f of [path.join(IMG, k + '.webp'), path.join(IMG, 's', k + '.webp')]) fs.rmSync(f, { force: true });
// remove shiny files identical to the normal art
for (const e of entries) { const m = man[e.key]; if (m?.sha && m.shSha === m.sha) fs.rmSync(path.join(IMG, 's', e.key + '.webp'), { force: true }); }
console.log('done; failed:', fail.length, fail.slice(0, 10), 'dupes:', dupes.length, dupes.join(' '));
