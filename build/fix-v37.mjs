// v37: Gigamax → base form link (gbk), Salarsen Gigamax split (Aigüe / Grave). Idempotent.
// The old key « 849-amped-gmax » stays = Salarsen Gigamax (Aigüe), so saved marks stay on the Aigüe entry (no key change needed).
import fs from 'node:fs';
const D = new URL('../docs/data/', import.meta.url);
const rd = f => JSON.parse(fs.readFileSync(new URL(f, D))), wr = (f, o) => fs.writeFileSync(new URL(f, D), JSON.stringify(o));
const core = rd('core.json');
const A = '849-amped-gmax', G = '849-low-key-gmax';
const a = core.e.find(e => e.k === A);
a.n = 'Salarsen Gigamax (Aigüe)'; a.l = 'Gigamax (Aigüe)'; a.en = 'Gigantamax Amped Toxtricity';
if (!core.e.some(e => e.k === G)) core.e.splice(core.e.indexOf(a) + 1, 0, { ...a, k: G, n: 'Salarsen Gigamax (Grave)', l: 'Gigamax (Grave)', en: 'Gigantamax Low Key Toxtricity', ja: 'ストリンダー（ローなすがた・キョダイマックスのすがた）', ro: 'Strinder (rōnasugata kyodaimakkusunosugata)' });
const LINK = { [A]: '849', [G]: '849-low-key', '892-single-strike-gmax': '892', '892-rapid-strike-gmax': '892-rapid-strike' };
for (const e of core.e) if (e.c === 'gmax') e.gbk = LINK[e.k] || String(e.id); // others (incl. Charmilly, Pikachu, genders): default base form
const s = rd('sp/849.json');
s.f[A].n = 'Salarsen Gigamax (Aigüe)';
s.f[G] = { ...s.f[A], n: 'Salarsen Gigamax (Grave)' };
wr('sp/849.json', s);
const cr = rd('cries.json'); cr[G] ||= cr[A] || cr['849-low-key']; wr('cries.json', cr);
wr('core.json', core);
console.log('v37 ok');
