// "Hors dex" (v21): every species obtainable in a game but absent from its regional Pokédex.
// Run after build-data.mjs (and fetch-obtainable.mjs). Idempotent.
//  - Source: build/obtainable.json = species (default form) with a learnset in the game's version group (PokéAPI GraphQL)
//    → in the game's data = obtainable by trade / transfer (Pal Park, Poké Transfer, Pokémon Bank, HOME) / event.
//    + MANUAL exceptions below (PokéAPI learnset missing for a default form), flagged as uncertain in the report.
//  - Games without expansions: appended to dex/{game}.json `x` (end of the list, national order, « Hors dex »).
//  - Games with expansions (same save: sw+swisle+swcrown, sv+svmask+svdisk, za+zadlc): nothing appended to their dexes;
//    a separate list dex/hors-{base}.json (Jeux filter « Hors dex … »), marks stored in the base game (shared save).
//    A species listed in a sibling dex of the same save is never « Hors dex ».
//  - sp/{id}.json `hx`: games where the species is Hors dex but not in its availability (sheet game switcher, marks).
//    Completion rules are unchanged (availability `av`/`gb` untouched).
import fs from 'node:fs';
const D = new URL('../docs/data/', import.meta.url);
const rd = f => JSON.parse(fs.readFileSync(new URL(f, D)));
const wr = (f, o) => fs.writeFileSync(new URL(f, D), JSON.stringify(o));
const core = rd('core.json'), ob = JSON.parse(fs.readFileSync(new URL('./obtainable.json', import.meta.url)));
const VG = { 'brilliant-diamond-shining-pearl': 'brilliant-diamond-and-shining-pearl' };
export const MANUAL = { // species obtainable but without a PokéAPI learnset for the default form in that version group
  frlg: [[386, 'Deoxys : Ticket Aurora (événement) / échange']],
  e: [[386, 'Deoxys : Ticket Aurora (événement) / échange']],
  bdsp: [[386, 'Deoxys : transfert HOME'], [489, 'Phione : reproduction de Manaphy / HOME'], [491, 'Darkrai : bonus de sauvegarde Légendes Arceus / HOME'], [492, 'Shaymin : bonus de sauvegarde Épée/Bouclier / HOME'], [493, 'Arceus : bonus de sauvegarde Légendes Arceus / HOME']],
};
const dex = Object.fromEntries(core.games.map(g => [g.id, rd(`dex/${g.id}.json`)]));
const grpOf = g => g.base || g.id;
const report = {}, hx = {}; // sid -> Set(game)
const avDefault = sid => { const sp = rd(`sp/${sid}.json`); return { sp, av: (sp.f[String(sid)] || {}).av || [] }; };
const spCache = new Map(); const spOf = sid => { if (!spCache.has(sid)) spCache.set(sid, avDefault(sid)); return spCache.get(sid); };
for (const base of [...new Set(core.games.map(grpOf))]) {
  const grp = core.games.filter(g => grpOf(g) === base), multi = grp.length > 1;
  const vg = VG[grp[0].mv?.[0]] || grp[0].mv?.[0], list = ob[vg];
  if (!list) { report[base] = { vg, note: 'pas de données PokéAPI (version group absent de la base GraphQL)', n: 0 }; continue; }
  const obt = new Set([...list, ...grp.flatMap(g => (MANUAL[g.id] || []).map(m => m[0]))]);
  const reg = new Set(grp.flatMap(g => dex[g.id].e.map(r => r[0])));
  if (!multi) {
    const g = grp[0], prev = new Set(dex[g.id].x || []);
    const add = [...obt].filter(s => !reg.has(s) && !prev.has(s));
    dex[g.id].x = [...new Set([...prev, ...add])].filter(s => !reg.has(s)).sort((a, b) => a - b);
    g.extra = dex[g.id].x.length; wr(`dex/${g.id}.json`, dex[g.id]);
    for (const s of add) if (!spOf(s).av.includes(g.id)) (hx[s] ||= new Set()).add(g.id);
    report[g.id] = { vg, regional: reg.size, mega: prev.size, transfer: add.length, total: g.extra, manual: (MANUAL[g.id] || []).filter(m => add.includes(m[0])).map(m => m[1]) };
  } else {
    for (const g of grp) { const x0 = (dex[g.id].x || []).length; dex[g.id].x = (dex[g.id].x || []).filter(s => !reg.has(s)); g.extra = dex[g.id].x.length; if (x0 !== g.extra) wr(`dex/${g.id}.json`, dex[g.id]); }
    const inX = new Set(grp.flatMap(g => dex[g.id].x || []));
    const list2 = [...obt].filter(s => !reg.has(s) && !inX.has(s)).sort((a, b) => a - b);
    wr(`dex/hors-${base}.json`, { dx: [], e: [], x: list2, game: base });
    for (const s of list2) if (!grp.some(g => spOf(s).av.includes(g.id))) (hx[s] ||= new Set()).add(base);
    report['hors-' + base] = { vg, regional: reg.size, transfer: list2.length };
  }
}
for (const [s, set] of Object.entries(hx)) { const { sp } = spOf(+s); sp.hx = [...new Set([...(sp.hx || []), ...set])]; wr(`sp/${s}.json`, sp); }
// species no longer Hors dex anywhere → drop stale hx
wr('core.json', core);
fs.writeFileSync(new URL('./hors-dex-report.json', import.meta.url), JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1));
