// v34 (REVUE-FORMES-2): Papilord, Lépidonille and Pérégrain have one form each. Their pattern / cloak entries are removed;
// core.mg keeps « removed key → base key » so the app migrates stored marks as a union (migrateMerged). Idempotent.
import fs from 'node:fs';
const D = new URL('../docs/data/', import.meta.url);
const rd = f => JSON.parse(fs.readFileSync(new URL(f, D))), wr = (f, o) => fs.writeFileSync(new URL(f, D), JSON.stringify(o));
const core = rd('core.json'), IDS = [414, 664, 665];
const gone = core.e.filter(e => IDS.includes(e.id) && e.c === 'form');
core.mg = { ...(core.mg || {}) }; for (const e of gone) core.mg[e.k] = String(e.id);
core.e = core.e.filter(e => !gone.includes(e));
for (const e of core.e) if (IDS.includes(e.id) && !e.c) delete e.l; // no cloak (Papilord) / pattern (before Prismillon)
for (const id of IDS) { const sp = rd(`sp/${id}.json`), b = sp.f[String(id)];
  for (const k of Object.keys(sp.f)) if (core.mg[k]) { const f = sp.f[k]; if (b && f.av) b.av = [...new Set([...(b.av || []), ...f.av])]; delete sp.f[k]; }
  wr(`sp/${id}.json`, sp); }
wr('core.json', core);
const evo = rd('evo.json'); wr('evo.json', evo.filter(x => !core.mg[x[0]] && !core.mg[x[1]]));
const cr = rd('cries.json'); if (cr && !Array.isArray(cr)) { for (const k of Object.keys(cr)) if (core.mg[k]) delete cr[k]; wr('cries.json', cr); }
console.log('formes fusionnées :', gone.length, '→', Object.keys(core.mg).length, 'clés migrées');
