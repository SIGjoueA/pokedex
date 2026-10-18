// v44: Salarsen Gigamax back to ONE entry (849-amped-gmax). The Grave Gigamax is a mark on that entry (« Gigamax Grave »), no list entry. Idempotent.
import fs from 'node:fs';
const D = new URL('../docs/data/', import.meta.url);
const rd = f => JSON.parse(fs.readFileSync(new URL(f, D))), wr = (f, o) => fs.writeFileSync(new URL(f, D), JSON.stringify(o));
const A = '849-amped-gmax', G = '849-low-key-gmax';
const core = rd('core.json');
core.e = core.e.filter(e => e.k !== G);
const a = core.e.find(e => e.k === A); a.n = 'Salarsen Gigamax'; a.l = 'Gigamax'; a.en = 'Gigantamax Toxtricity';
wr('core.json', core);
const s = rd('sp/849.json'); delete s.f[G]; s.f[A].n = 'Salarsen Gigamax'; wr('sp/849.json', s);
const cr = rd('cries.json'); delete cr[G]; wr('cries.json', cr);
// go-overrides.json: the « 849-low-key-gmax » block was removed by hand (JSON.stringify would reorder its numeric keys)
console.log('v44 ok');
