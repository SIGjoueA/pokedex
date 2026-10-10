// v28 Pokémon GO overrides: Megas released after the (frozen) pogoapi list + Gigamax forms (Max Battles). Idempotent.
// Run automatically at the end of build-data.mjs; can be re-run alone:  node apply-go-overrides.mjs
// Source of truth: build/go-overrides.json (manual, never written by the scripts). See README « Pokémon GO ».
//  - megaReleased.keys: sp f[k].go.r = 1 and core go = 1. A Mega without GO data in the game master (not yet mined)
//    gets the base form's moves / buddy distance + its own types, flagged nost (stats not available yet).
//  - Megas / Primals: shiny in GO = Mega Evolution of a shiny → go.sh = ['mega'] when the base form has a shiny in GO.
//  - gmax.forms: go data copied from the base form (same stats in GO), r = 1 (released) or r = 0 + rf = release date
//    (the app shows it from that date: core gof); sh = ['max'] if shiny, shf = shiny release date; nosh = 1 if no shiny.
import fs from 'node:fs';
const D = new URL('../docs/data/', import.meta.url);
const rd = f => JSON.parse(fs.readFileSync(new URL(f, D)));
const wr = (f, o) => fs.writeFileSync(new URL(f, D), JSON.stringify(o));
const OV = JSON.parse(fs.readFileSync(new URL('./go-overrides.json', import.meta.url)));
const core = rd('core.json'), byKey = Object.fromEntries(core.e.map(e => [e.k, e]));
const megaKeys = OV.megaReleased.keys, gmax = OV.gmax.forms;
const sps = new Map(); const spOf = id => { if (!sps.has(id)) sps.set(id, rd(`sp/${id}.json`)); return sps.get(id); };
const log = [];
const STATS = ['a', 'd', 's', 'm50', 'm51', 'sh', 'shf', 'nosh', 'r', 'rf', 'nost', 'eg'];
const baseGo = (sp, id) => { const b = sp.f[String(id)]; return b && b.go ? b.go : null; };
for (const k of megaKeys) {
  const e = byKey[k]; if (!e) { log.push(`! Méga inconnue ${k}`); continue; }
  const sp = spOf(e.id), f = sp.f[k]; if (!f) { log.push(`! ${k} absente de sp/${e.id}.json`); continue; }
  if (!f.go) { const b = baseGo(sp, e.id); if (!b) { log.push(`! ${k} : pas de données GO pour la base`); continue; } f.go = Object.fromEntries(Object.entries(b).filter(([x]) => !STATS.includes(x))); f.go.t = e.t; f.go.nost = 1; log.push(`${k} : pas encore dans le game master → attaques de la base, stats à venir`); }
  f.go.r = 1; e.go = 1;
}
for (const e of core.e) if (e.c === 'mega' || e.c === 'primal') { // shiny Mega / Primal = Mega Evolution of a shiny
  const sp = spOf(e.id), f = sp.f[e.k], b = baseGo(sp, e.id);
  if (f && f.go && f.go.r && b && b.sh && b.sh.length) f.go.sh = ['mega'];
  if (f && f.go && f.go.r) e.go = 1;
}
for (const e of core.e) if (e.c === 'gmax') { delete e.go; delete e.gof; const sp = spOf(e.id), f = sp.f[e.k]; if (f && f.go) delete f.go; }
for (const [k, o] of Object.entries(gmax)) {
  if (k.startsWith('_')) continue;
  const e = byKey[k]; if (!e || e.c !== 'gmax') { log.push(`! Gigamax inconnu ${k}`); continue; }
  const sp = spOf(e.id), f = sp.f[k], b = baseGo(sp, e.id); if (!f || !b) { log.push(`! ${k} : pas de données GO pour la base`); continue; }
  const g = Object.fromEntries(Object.entries(b).filter(([x]) => !['sh', 'r', 'rf', 'shf', 'nosh', 'eg'].includes(x)));
  g.r = o.from ? 0 : 1; if (o.from) g.rf = o.from;
  if (o.shiny) { g.sh = ['max']; if (o.shinyFrom) g.shf = o.shinyFrom; } else g.nosh = 1;
  f.go = g;
  if (g.r) e.go = 1; else e.gof = o.from;
}
for (const [id, sp] of sps) wr(`sp/${id}.json`, sp);
wr('core.json', core);
const nM = core.e.filter(e => (e.c === 'mega' || e.c === 'primal') && e.go).length, nG = core.e.filter(e => e.c === 'gmax' && e.go).length, nF = core.e.filter(e => e.gof).length;
console.log(`GO overrides: ${nM} Méga/Primo sorties, ${nG} Gigamax sortis, ${nF} à venir (${core.e.filter(e => e.gof).map(e => e.k + ' ' + e.gof).join(', ')})`);
log.forEach(l => console.log('  ' + l));
