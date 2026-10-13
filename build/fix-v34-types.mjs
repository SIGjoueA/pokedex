// v34: Arceus (493) and Silvallié (773) forms take the type of their plate / memory (key suffix). Idempotent.
import fs from 'node:fs';
const D = new URL('../docs/data/', import.meta.url);
const core = JSON.parse(fs.readFileSync(new URL('core.json', D)));
const TY = new Set(core.types.map(t => t[0]));
let n = 0;
for (const id of [493, 773]) {
  const spU = new URL(`sp/${id}.json`, D), sp = JSON.parse(fs.readFileSync(spU));
  for (const e of core.e.filter(e => e.id === id && e.c === 'form')) {
    const t = e.k.slice(String(id).length + 1); if (!TY.has(t)) continue;
    e.t = [t]; if (sp.f[e.k]) { sp.f[e.k].t = [t]; if (sp.f[e.k].go) sp.f[e.k].go.t = [t]; } n++;
  }
  fs.writeFileSync(spU, JSON.stringify(sp));
}
fs.writeFileSync(new URL('core.json', D), JSON.stringify(core));
console.log('types Arceus / Silvallié :', n, 'formes');
