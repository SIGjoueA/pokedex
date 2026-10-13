// v34: Z-A Barons = entries that Poképédia lists with a « Baron » level in Z-A or Méga-Dimension (sp f.pl za / zadlc) → core e.zb = 1.
// Non-regional forms inherit from their base in the app. Idempotent; rerun after pokepedia.mjs apply.
import fs from 'node:fs';
const D = new URL('../docs/data/', import.meta.url);
const core = JSON.parse(fs.readFileSync(new URL('core.json', D)));
const ids = [...new Set(core.e.map(e => e.id))], zb = new Set();
for (const id of ids) { const sp = JSON.parse(fs.readFileSync(new URL(`sp/${id}.json`, D)));
  for (const [k, f] of Object.entries(sp.f)) if (['za', 'zadlc'].some(g => ((f.pl || {})[g] || []).some(([, d]) => /Baron/.test(d)))) zb.add(k); }
for (const e of core.e) { delete e.zb; if (zb.has(e.k)) e.zb = 1; }
fs.writeFileSync(new URL('core.json', D), JSON.stringify(core));
console.log('Barons Z-A (Poképédia) :', zb.size, 'entrées');
