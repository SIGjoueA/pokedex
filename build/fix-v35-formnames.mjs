// v35: official French name of the default form (Poképédia) for species with real alternate forms → core e.fn (+ sp f.fn).
// Shown on the sheet title, form chips, lists with « Formes » on, search. Regional / Mega / Gmax / sex-only bases keep the species name (no fn).
// Some siblings are renamed to the same official pattern (Deoxys Forme Attaque, Prismillon Motif …, Flabébé Fleur …). Idempotent.
import fs from 'node:fs';
const D = new URL('../docs/data/', import.meta.url);
const rd = f => JSON.parse(fs.readFileSync(new URL(f, D))), wr = (f, o) => fs.writeFileSync(new URL(f, D), JSON.stringify(o));
const core = rd('core.json');
// species id → prefix put before the label (base + form siblings named « Espèce Label »); '' = label used as is
const PFX = { 386: 'Forme', 487: 'Forme', 492: 'Forme', 641: 'Forme', 642: 'Forme', 645: 'Forme', 905: 'Forme', 585: 'Forme', 586: 'Forme', 647: 'Forme', 648: 'Forme',
  681: 'Forme', 720: '', 1024: 'Forme', 718: 'Forme', 745: 'Forme', 746: 'Forme', 778: 'Forme', 849: 'Forme', 774: 'Forme', 964: 'Forme', 978: 'Forme', 982: 'Forme', 999: 'Forme',
  1007: 'Forme', 1012: 'Forme', 1013: 'Forme', 741: 'Style', 892: 'Style', 716: 'Mode', 877: 'Mode', 1008: 'Mode', 666: 'Motif', 550: 'Motif', 676: 'Coupe',
  201: '', 412: '', 413: '', 421: '', 422: '', 423: '', 493: '', 669: '', 670: '', 671: '', 710: '', 711: '', 773: '', 869: '', 875: '', 888: '', 889: '', 925: '', 931: '', 1017: '' };
const LBL = { '710': 'Taille Normale', '711': 'Taille Normale', '647': 'Normale', '647-resolute': 'Décidée' }; // Pitrouille / Banshitrouye default size (label « Taille M »)
const sps = {}; const sp = id => sps[id] ||= rd(`sp/${id}.json`);
const name = (e, base) => { const p = PFX[e.id], l = LBL[e.k] || e.l; if (!l) return null; const pre = p && !l.startsWith(p + ' ') ? p + ' ' : ''; return `${base.n} ${pre}${l}`; };
const rows = [];
for (const e of core.e) { delete e.fn; if (sps[e.id]?.f?.[e.k]) delete sp(e.id).f[e.k].fn; }
for (const e of core.e) {
  if (!(e.id in PFX)) continue; const base = core.e.find(x => x.k === String(e.id));
  if (!e.c) { const fn = name(e, base); if (fn && fn !== e.n) { e.fn = fn; const f = sp(e.id).f[e.k]; if (f) f.fn = fn; rows.push([e.k, e.n, fn]); } }
  else if (e.c === 'form' && PFX[e.id] !== undefined && !e.bo) {
    const want = name(e, base); if (!want || want === e.n) continue;
    // rename only siblings that follow the short pattern « Espèce Label-without-prefix » (keeps hand-made names)
    const short = l => `${base.n} ${l.replace(/^(Forme|Style|Mode|Motif|Coupe|Fleur|Masque) /, '')}`;
    if (e.n === short(e.l) || e.n === `${base.n} ${e.l}` || (e.id === 1017 && /^Ogerpon (du|de la) /.test(e.n)) || e.id === 669 || e.id === 671 || e.k === '647-resolute') { rows.push([e.k, e.n, want]); e.n = want; const f = sp(e.id).f[e.k]; if (f) f.n = want; }
  }
}
for (const e of core.e) if (e.k === '483-origin' && e.n === 'Diagla Originel') { rows.push([e.k, e.n, 'Dialga Originel']); e.n = 'Dialga Originel'; const f = sp(483).f[e.k]; if (f) f.n = e.n; }
for (const [id, s] of Object.entries(sps)) wr(`sp/${id}.json`, s);
wr('core.json', core);
fs.writeFileSync(new URL('./formnames-v35.json', import.meta.url), JSON.stringify(rows, null, 1));
console.log('v35 noms de formes :', rows.filter(r => !r[0].includes('-')).length, 'formes par défaut,', rows.filter(r => r[0].includes('-')).length, 'formes renommées');
