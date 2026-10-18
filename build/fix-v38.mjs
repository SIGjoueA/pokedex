// v38: Dynamax in GO (core dmx from go-overrides.json « dynamax »), Primal Energy icons (Kyogre / Groudon), Gigamax / Dynamax icons. Idempotent.
// Icons (self-hosted, 64 px webp, already in docs/img):
//  - img/max/gigamax.webp, img/max/dynamax.webp ← Bulbagarden Archives « GO Gigantamax icon.png » / « GO Dynamax icon.png » (official Pokémon GO icons)
//  - img/energy/382.webp, 383.webp ← PokeMiners/pogo_assets Images/Megas and Primals/primalTutorial_energy_icon_alpha / _omega.png (tinted blue / red)
// The same Dynamax block lives in apply-go-overrides.mjs, so a full build keeps it.
import fs from 'node:fs';
const D = new URL('../docs/data/', import.meta.url);
const rd = f => JSON.parse(fs.readFileSync(new URL(f, D))), wr = (f, o) => fs.writeFileSync(new URL(f, D), JSON.stringify(o));
for (const f of ['max/gigamax.webp', 'max/dynamax.webp', 'energy/382.webp', 'energy/383.webp']) if (!fs.existsSync(new URL('../docs/img/' + f, import.meta.url))) throw new Error('icône manquante ' + f);
const OV = JSON.parse(fs.readFileSync(new URL('./go-overrides.json', import.meta.url)));
const core = rd('core.json'), byKey = Object.fromEntries(core.e.map(e => [e.k, e])), DM = OV.dynamax.keys;
for (const e of core.e) delete e.dmx;
let n = 0; for (const [k, d] of Object.entries(DM)) { const e = byKey[k]; if (!e) throw new Error('Dynamax inconnu ' + k); e.dmx = d; n++; }
wr('core.json', core);
const me = rd('mega-energy.json'); for (const id of ['382', '383']) if (!me.ids.includes(id)) me.ids.push(id); wr('mega-energy.json', me);
console.log(`v38 ok : ${n} formes Dynamax GO`);
