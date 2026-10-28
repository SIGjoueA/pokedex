// v59: adds E = { formKey: [exclusive move keys (fe + ce)] } to docs/data/rank-raid.json and rank-max.json (« † » in « Classements »), from docs/data/sp/*.json.
import fs from 'node:fs'; import path from 'node:path';
const D = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'docs/data'), SP = {};
const sp = id => SP[id] ??= (fs.existsSync(`${D}/sp/${id}.json`) ? JSON.parse(fs.readFileSync(`${D}/sp/${id}.json`)) : null);
for (const f of ['rank-raid.json', 'rank-max.json', 'rank-pvp.json']) { const p = `${D}/${f}`; if (!fs.existsSync(p)) continue; const j = JSON.parse(fs.readFileSync(p));
  const keys = new Set(f === 'rank-raid.json' ? j.F.map(x => x[0]) : f === 'rank-max.json' ? j.F : Object.values(j.L).flatMap(l => l.r.map(r => r[0]))), E = {};
  for (const k of keys) { const s = sp(k.split('-')[0]), g = s && s.f && s.f[k] && s.f[k].go; const e = g ? [...(g.fe || []), ...(g.ce || [])] : []; if (e.length) E[k] = e; }
  j.E = E; fs.writeFileSync(p, JSON.stringify(j)); console.log(f, 'formes avec attaques exclusives :', Object.keys(E).length, '/', keys.size); }
