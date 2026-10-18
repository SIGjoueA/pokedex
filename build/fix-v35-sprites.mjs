// v35: HOME / animated (Showdown) sprite of EACH entry, from the PokeAPI sprites repository file list (build/sprite-files.json, refresh with
// the GitHub tree API). Resolution: female/<id> for gender forms, the PokeAPI pokemon id of « species-suffix », the cry's pokemon id,
// then the cosmetic file « <id>-<suffix> » (Prismillon, Flabébé, Zarbi…); base = <id>. None → no sprite (the app shows that form's own art).
// core e.hs = HOME file (without .png), e.as = Showdown file (without .gif), e.hh = 1 when self-hosted in docs/img/h/<key>.webp. Idempotent.
import fs from 'node:fs';
const D = new URL('../docs/data/', import.meta.url);
const rd = f => JSON.parse(fs.readFileSync(new URL(f, D))), wr = (f, o) => fs.writeFileSync(new URL(f, D), JSON.stringify(o));
const F = JSON.parse(fs.readFileSync(new URL('./sprite-files.json', import.meta.url)));
const set = (a, ext) => new Set((a || []).map(x => x.slice(0, -ext.length)));
const H = set(F.home, '.png'), S = set(F.showdown, '.gif'), HF = set(F.home_female, '.png'), SF = set(F.showdown_female, '.gif');
const core = rd('core.json'), cries = rd('cries.json');
const L = JSON.parse(fs.readFileSync(new URL('./.cache/list_pokemon_names.json', import.meta.url))).results;
const pid = Object.fromEntries(L.map(r => [r.name, r.url.match(/\/(\d+)\/$/)[1]]));
const slug = Object.fromEntries(L.filter(r => +r.url.match(/\/(\d+)\/$/)[1] <= 1025).map(r => [+r.url.match(/\/(\d+)\/$/)[1], r.name.split('-')[0]]));
const SP = JSON.parse(fs.readFileSync(new URL('./.cache/list_pokemon-species_names.json', import.meta.url))).results;
const spSlug = Object.fromEntries(SP.map(r => [+r.url.match(/\/(\d+)\/$/)[1], r.name]));
function res(e, ST, FE) {
  const id = String(e.id); if (!e.c) return ST.has(id) ? id : null;
  if (e.c === 'sex') return FE.has(id) ? 'female/' + id : ST.has(id) ? id : null; // same look → base
  const sfx = e.k.slice(id.length + 1), n = pid[`${spSlug[e.id]}-${sfx}`]; if (n && n !== id && ST.has(n)) return n;
  const c = cries[e.k] && cries[e.k][0], cn = c ? c.slice(2) : null; if (cn && cn !== id && ST.has(cn)) return cn;
  if (ST.has(e.k)) return e.k;
  return null;
}
let nh = 0, na = 0;
for (const e of core.e) { delete e.hs; delete e.as; const h = res(e, H, HF), a = res(e, S, SF); if (h) { e.hs = h; nh++; } if (a) { e.as = a; na++; } }
wr('core.json', core); console.log(`sprites : HOME ${nh} / ${core.e.length}, animés ${na}`);
