// v40: audit v33 « Amélioration » 2 — Méga-Mistigrix ♂ / ♀ (no double « Méga »). Idempotent.
import fs from 'node:fs';
const D = new URL('../docs/data/', import.meta.url);
const rd = f => JSON.parse(fs.readFileSync(new URL(f, D))), wr = (f, o) => fs.writeFileSync(new URL(f, D), JSON.stringify(o));
const core = rd('core.json'), sp = rd('sp/678.json');
const NM = { '678-male-mega': 'Méga-Mistigrix ♂', '678-female-mega': 'Méga-Mistigrix ♀' };
for (const e of core.e) if (NM[e.k]) { e.n = NM[e.k]; if (sp.f[e.k]) sp.f[e.k].n = NM[e.k]; }
wr('core.json', core); wr('sp/678.json', sp);
console.log('v40 ok');
