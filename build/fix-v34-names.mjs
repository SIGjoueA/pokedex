// v34: name typos, Zygarde 10 % in Z-A, Xerneas / Koraidon / Miraidon alternate forms = battle forms of the base (count for 1). Idempotent.
import fs from 'node:fs';
const D = new URL('../docs/data/', import.meta.url);
const rd = f => JSON.parse(fs.readFileSync(new URL(f, D))), wr = (f, o) => fs.writeFileSync(new URL(f, D), JSON.stringify(o));
const core = rd('core.json'), G = core.games.map(g => g.id), by = Object.fromEntries(core.e.map(e => [e.k, e]));
const sps = {}; const sp = id => sps[id] ||= rd(`sp/${id}.json`);
const setN = (k, n) => { const e = by[k]; if (!e) return; e.n = n; const f = sp(e.id).f[k]; if (f) f.n = n; };
for (const e of core.e) if (e.id === 774 && /Noyeau/.test(e.n)) setN(e.k, e.n.replace('Noyeau', 'Noyau'));
setN('718-10', 'Zygarde Forme 10 %');
for (const e of core.e) if (e.id === 670 && e.c === 'form' && e.l) setN(e.k, 'Floette ' + e.l); // Floette Fleur Jaune / … / Fleur Éternelle (Poképédia)
// Zygarde 10 % : Légendes Z-A + Méga-Dimension (Cube Zygarde, changement de forme)
{ const e = by['718-10'], f = sp(718).f['718-10']; for (const g of ['za', 'zadlc']) { const i = G.indexOf(g); if (!((e.gb >> i) & 1)) e.gb += 2 ** i; if (!f.av.includes(g)) f.av.push(g); } }
// Xerneas, Koraidon, Miraidon: one Pokémon; the other forms follow the base (like battle forms)
for (const e of core.e) if ([716, 1007, 1008].includes(e.id) && e.c === 'form') e.bo = String(e.id);
for (const [id, s] of Object.entries(sps)) wr(`sp/${id}.json`, s);
wr('core.json', core); console.log('noms / formes v34 appliqués');
