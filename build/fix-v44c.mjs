// v44c (Yann): purely visual gender differences = ONE entry (classic Pokédex). The female form leaves the list (core.e) and is kept
// on its species entry as core « fe » (key, games, GO, HOME / animated sprites) for the « ♀ » mark and the female image; sp/<id>.json f[<key>-female] stays.
// Real differences (other stats / abilities / own learnset) keep two entries: Mistigrix, Wimessir, Paralyse, Fragroin (+ Méga-Mistigrix ♂ / ♀). Idempotent.
import fs from 'node:fs';
const D = new URL('../docs/data/', import.meta.url);
const rd = f => JSON.parse(fs.readFileSync(new URL(f, D))), wr = (f, o) => fs.writeFileSync(new URL(f, D), JSON.stringify(o));
export const KEEP = ['678-female', '876-female', '902-female', '916-female'];
const core = rd('core.json'), byKey = Object.fromEntries(core.e.map(e => [e.k, e]));
let moved = 0;
// games of the female mark = games of the species from generation IV on (gender differences exist since Diamant / Perle; the female's own PokéAPI game list is incomplete)
const G4 = core.games.reduce((m, g, i) => g.g >= 4 ? m | (1 << i) : m, 0);
for (const e of core.e.filter(x => x.c === 'sex' && !KEEP.includes(x.k))) {
  const sp = rd(`sp/${e.id}.json`), f = sp.f[e.k];
  if (f && f.ls) throw new Error(`${e.k} : learnset propre → différence réelle, à garder en deux entrées`);
  const B = e.k.replace(/-female$/, ''), b = byKey[B]; if (!b || B === e.k) throw new Error('base inconnue ' + e.k);
  b.fe = Object.fromEntries(Object.entries({ k: e.k, gb: e.gb, go: e.go, hs: e.hs, as: e.as, hh: e.hh, sh: e.sh }).filter(([, v]) => v !== undefined));
  if (b.l === 'Mâle') delete b.l; // a single entry: no « Mâle » label any more
  moved++;
}
for (const b of core.e) if (b.fe) b.fe.gb = b.gb & G4;
core.e = core.e.filter(x => !(x.c === 'sex' && !KEEP.includes(x.k)));
wr('core.json', core);
console.log(`v44c ok : ${moved} formes femelles rattachées à leur espèce, ${core.e.filter(x => x.fe).length} espèces avec ♀, ${core.e.length} entrées`);
