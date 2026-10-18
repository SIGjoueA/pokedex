// v34: Let's Go = Kanto 151 + Meltan / Melmetal only. Non-Kanto species that have a Mega (dex/lgpe.json « x ») are removed from the game (core gb bit + sp av). Idempotent.
import fs from 'node:fs';
const D = new URL('../docs/data/', import.meta.url);
const rd = f => JSON.parse(fs.readFileSync(new URL(f, D))), wr = (f, o) => fs.writeFileSync(new URL(f, D), JSON.stringify(o));
const core = rd('core.json'), dx = rd('dex/lgpe.json'), L = core.games.findIndex(g => g.id === 'lgpe');
const keep = new Set(dx.e.map(x => x[0])); let n = 0; const sps = new Set();
for (const e of core.e) if (!keep.has(e.id) && (e.gb >> L) & 1) { e.gb -= 2 ** L; n++; sps.add(e.id); }
for (const id of sps) { const sp = rd(`sp/${id}.json`); for (const f of Object.values(sp.f)) if (f.av) f.av = f.av.filter(g => g !== 'lgpe'); if (sp.gm) delete sp.gm.lgpe; wr(`sp/${id}.json`, sp); }
dx.x = []; wr('dex/lgpe.json', dx);
const g = core.games[L]; g.extra = 0; wr('core.json', core);
console.log(`Let's Go : ${n} entrées hors Kanto retirées (${sps.size} espèces)`);
