// v60.21: talents qui changent les faiblesses — corrections de données recoupées avec Showdown (data/pokedex.ts) et Bulbapedia. Idempotent.
// Pichu Troizépi : Statik seulement, pas de talent caché (PokéAPI lui prête Paratonnerre caché, comme le Pichu normal).
import fs from 'node:fs';
const D = new URL('../docs/data/', import.meta.url);
const rd = f => JSON.parse(fs.readFileSync(new URL(f, D))), wr = (f, o) => fs.writeFileSync(new URL(f, D), JSON.stringify(o));
const s = rd('sp/172.json'), f = s.f['172-spiky-eared'];
if (f) { const n = f.a.length; f.a = f.a.filter(a => !a[1]); if (f.a.length !== n) wr('sp/172.json', s); }
console.log('v60.21 ok');
