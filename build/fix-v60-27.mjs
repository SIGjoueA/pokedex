// v60.27: raids Téracristal d’Écarlate / Violet (étape 2 du plan raids : Paldea, Masque Turquoise, Disque Indigo). Idempotent : node fix-v60-27.mjs   (V6027_REPORT=fichier.json → rapport détaillé)
// Avant : « Où le trouver » listait seulement « Cristal de raid N étoiles (Paldea) · Raid Téracristal » (parfois « Exclusif Ec./Vi. »), sans bloc dédié, sans talent caché, et presque jamais le type Téra.
// Sources (Poképédia, CC BY-NC-SA 3.0 FR ; texte brut en cache versionné build/cache/v60-27/, téléchargé une seule fois) :
//   - Module:Localisations/Données/Pokémon Écarlate et Violet : entrées « Cristal de raid 1–6 étoiles (Paldea|Septentria|Terra-Dôme) » et « Antre Interdit » ;
//   - pages « Cristal de raid N étoiles (région) » ({{#invoke:Tableau Pokémon|teracristal}}) : même liste, recoupée champ à champ ;
//   - « Raid Téracristal » : rareté selon l’histoire (étoiles et niveaux du boss), type Téra « Aléatoire » si non précisé (module Tableau Pokémon) ;
//   - « Antre Interdit » : lieu de Septentria (Masque Turquoise).
// Recoupement Serebii / Bulbapedia pour vérification seulement (non utilisés comme source de données). Les IV garantis et les taux d’apparition par Pokémon ne figurent pas sur Poképédia : ils ne sont pas inventés.
// Hors lot : cristaux événementiels (y compris 7★). Ils restent dans f.pl tels quels.
// Résultat : docs/data/sp/<id>.json → f[<clé>].rd[sv|svmask|svdisk] = [[zone, texte, drapeaux]] ; les lignes « Cristal de raid 1–6 étoiles (…) » et « Antre Interdit » sont retirées de f.pl (les clés sw* de rd, écrites en v60.24, sont conservées).
import fs from 'node:fs'; import { execFileSync } from 'node:child_process';
import { parseLua, clean } from './pokepedia.mjs';
const D = new URL('../docs/data/', import.meta.url), C = new URL('./cache/v60-27/', import.meta.url);
const rd = f => JSON.parse(fs.readFileSync(new URL(f, D)));
fs.mkdirSync(C, { recursive: true });
const fname = t => t.replace(/[ /:]/g, '_') + '.wiki';
const page = (t, opt) => { const f = new URL(fname(t), C);
  if (!fs.existsSync(f) || !fs.statSync(f).size) { try { fs.writeFileSync(f, execFileSync('curl', ['-sfLG', 'https://www.pokepedia.fr/index.php', '--data-urlencode', 'title=' + t, '--data', 'action=raw'])); } catch { if (opt) return ''; throw new Error('fix-v60-27 : page introuvable ' + t); } execFileSync('sleep', ['0.3']); }
  const w = fs.readFileSync(f, 'utf8'); if (/^#REDIRECT/i.test(w)) throw new Error(`fix-v60-27 : ${t} est une redirection`); return w; };
const A = s => s.replace(/’/g, "'"), N = s => A(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const core = rd('core.json'), BYK = Object.fromEntries(core.e.map(e => [e.k, e]));
const byName = new Map(core.e.filter(e => !e.c).map(e => [A(e.n), e.id]));
const doubt = [], rep = {};

const GAMES = { Paldea: 'sv', Septentria: 'svmask', 'Terra-Dôme': 'svdisk' };
const ZONES = ['Paldea', 'Septentria', 'Terra-Dôme'];
const STARS = [1, 2, 3, 4, 5, 6];
const placeOf = (z, s) => `Cristal de raid ${s} étoile${s > 1 ? 's' : ''} (${z})`;

// ---------- 1. module + pages (recoupement) ----------
const MOD = parseLua(page('Module:Localisations/Données/Pokémon Écarlate et Violet'));
const W_RAID = page('Raid Téracristal');
const W_ANTRE = page('Antre Interdit');
if (!/région=Septentria/.test(W_ANTRE) && !/région de \[\[Septentria\]\]/.test(W_ANTRE)) throw new Error('fix-v60-27 : Antre Interdit n’est plus situé à Septentria');
// rareté selon l’histoire (page Raid Téracristal) — texte de l’appli (raidHTML) à tenir aligné
const RARITY_APP = 'début:1,2|3 badges:1,2,3|6 badges:1,2,3,4|générique:3,4,5|tournoi:3,4,5+6';
const RARITY_LV = { 1: 12, 2: 20, 3: 35, 4: 45, 5: 75, 6: 90 };
{ const i = W_RAID.indexOf('=== Rareté des raids ==='); if (i < 0) throw new Error('fix-v60-27 : section « Rareté des raids » introuvable');
  const t = W_RAID.slice(i, W_RAID.indexOf('=== Combat ===', i));
  const rows = [...t.matchAll(/\| \{\{étoiles\|(\d+)\|pleines\}\}(?:\{\{étoiles\|(\d+)\|pleines\}\})?\n\| ([^\n]+)\n/g)].map(m => [(+m[1]) + (+m[2] || 0), m[3].replace(/<[^>]+>/g, '').trim()]);
  const lv = Object.fromEntries(rows.filter(([s]) => s <= 6).map(([s, n]) => [s, parseInt(n, 10)]));
  if (JSON.stringify(lv) !== JSON.stringify(RARITY_LV)) throw new Error('fix-v60-27 : niveaux du boss modifiés sur Poképédia : ' + JSON.stringify(lv));
  const pct = [...t.matchAll(/\| \{\{étoiles\|(\d+)\|pleines\}\}(?:\{\{étoiles\|(\d+)\|pleines\}\})?\n\| [^\n]+\n\| [^\n]+\n\| [^\n]+\n\| ([^\n]+)\n\| ([^\n]+)\n\| ([^\n]+)\n\| ([^\n]+)\n\| ([^\n]+)/g)];
  const present = (cell, star) => { const c = cell.trim(); return (c === '—' || /Évènement/.test(c)) ? 0 : star; };
  if (pct.length < 6) throw new Error('fix-v60-27 : tableau de rareté illisible (' + pct.length + ' lignes)');
  const cols = ['début', '3 badges', '6 badges', 'générique', 'tournoi'].map((_, j) => {
    const stars = [];
    for (const m of pct) { const s = (+m[1]) + (+m[2] || 0); if (s >= 7) continue; if (present(m[3 + j], s)) stars.push(s); }
    return stars;
  });
  const got = ['début', '3 badges', '6 badges', 'générique', 'tournoi'].map((n, j) => n + ':' + (n === 'tournoi' ? cols[j].filter(s => s < 6).join(',') + (cols[j].includes(6) ? '+6' : '') : cols[j].join(','))).join('|');
  if (got !== RARITY_APP) throw new Error('fix-v60-27 : rareté selon l’histoire modifiée sur Poképédia : ' + got);
  if (!/raison d'un raid par jour/.test(t) || !/réussir 10/.test(t)) throw new Error('fix-v60-27 : conditions des raids 6★ à revérifier');
}
rep.rarity = { app: RARITY_APP, lv: RARITY_LV };

function parseFields(s) {
  const o = {}; const re = /([A-Za-zÀ-ÿ0-9_-]+)\(([^)]*)\)/g; let m; while ((m = re.exec(s))) o[m[1]] = m[2]; return o;
}
function parseCrystalPage(w) {
  const m = w.match(/\{\{#invoke:Tableau Pokémon\|teracristal\|([\s\S]*?)\n\}\}/);
  if (!m) return {};
  const out = {};
  for (const line of m[1].split('\n')) {
    const t = line.trim(); if (!t || t.startsWith('=') || t.startsWith('{')) continue;
    const i = t.indexOf(' / '); if (i < 0) continue;
    const name = t.slice(0, i).trim(), rest = t.slice(i + 3);
    if (!/talent-caché\(|difficulté\(/.test(rest)) continue;
    (out[name] ||= []).push(parseFields(rest));
  }
  return out;
}

const POOLS = {}; // POOLS[place][mon] = [rec]
const pageDiff = [];
for (const z of ZONES) for (const s of STARS) {
  const place = placeOf(z, s), mod = MOD[place]; if (!mod) throw new Error('fix-v60-27 : table manquante dans le module : ' + place);
  const pg = parseCrystalPage(page(place));
  const mk = Object.keys(mod), pk = Object.keys(pg);
  for (const k of pk) if (!mod[k]) pageDiff.push(`${place} : ${k} seulement sur la page`);
  for (const k of mk) if (!pg[k]) pageDiff.push(`${place} : ${k} seulement dans le module`);
  for (const k of pk) {
    if (!mod[k]) continue;
    const a = pg[k], b = [].concat(mod[k]);
    if (a.length !== b.length) { pageDiff.push(`${place} ${k} : ${a.length} ligne(s) page / ${b.length} module`); continue; }
    for (let i = 0; i < a.length; i++) {
      const fa = new Set([...Object.keys(a[i]), ...Object.keys(b[i])]);
      for (const f of fa) if (String(a[i][f] ?? '') !== String(b[i][f] ?? '')) pageDiff.push(`${place} ${k} : ${f} page=${JSON.stringify(a[i][f])} module=${JSON.stringify(b[i][f])}`);
    }
  }
  POOLS[place] = mod;
}
if (pageDiff.length) { doubt.push('écarts page / module : ' + pageDiff.join(' ; ')); }
rep.pageDiff = pageDiff;
rep.pools = Object.fromEntries(Object.entries(POOLS).map(([p, m]) => [p, Object.keys(m).length]));

// ---------- 2. clés de fiches ----------
const REG = { Alola: 'alola', Galar: 'galar', Hisui: 'hisui', Paldea: 'paldea' };
const hasHA = k => { const id = BYK[k] ? BYK[k].id : +k, sp = rd(`sp/${id}.json`), f = sp.f[k] || sp.f[String(id)]; const a = (f && f.a) || (sp.f[String(id)] || {}).a || []; return a.some(x => x[1]); };
const HA = {}; const ha = k => (HA[k] ??= hasHA(k));
const keyOf = mon => {
  const m = mon.match(/^(.*?)(?: (forme|sexe|nom)\(([^)]*)\))?$/), id = byName.get(A(m[1].trim())); if (!id) return [null];
  if (!m[2]) return [String(id), ''];
  if (m[2] === 'sexe') {
    if (m[3] === 'm' || m[3] === 'f') { const k = m[3] === 'f' ? `${id}-female` : String(id); return BYK[k] ? [k, ''] : [String(id), m[3] === 'm' ? 'mâle' : 'femelle']; }
    return [String(id), m[3] === 'm' ? 'mâle' : m[3] === 'f' ? 'femelle' : m[3]];
  }
  if (REG[m[3]]) { const k = `${id}-${REG[m[3]]}`; return BYK[k] ? [k, ''] : [String(id), 'forme ' + m[3]]; }
  const fs_ = core.e.filter(e => e.id === id), n = N(m[3]);
  const exact = fs_.find(e => e.l && N(e.l) === n) || fs_.find(e => e.l && (N(e.l) === n || N(e.l).startsWith(n + ' ') || N(e.l).endsWith(' ' + n)));
  if (exact && exact.c !== 'gmax') return [exact.k, ''];
  const tok = s => N(s).split(' ').filter(w => w && !['de', 'du', 'des', 'la', 'le', 'les', 'forme', 'style'].includes(w));
  const want = tok(m[3]);
  const loose = fs_.filter(e => e.l && e.c !== 'gmax' && want.length && want.every(w => tok(e.l).includes(w)));
  if (loose.length === 1) return [loose[0].k, ''];
  if (loose.length > 1) {
    loose.sort((a, b) => tok(a.l).length - tok(b.l).length);
    if (tok(loose[0].l).length < tok(loose[1].l).length) return [loose[0].k, ''];
    doubt.push(`forme ambiguë « ${mon} » → ${loose.map(e => e.k + ' (' + e.l + ')').join(', ')}`);
  }
  return [String(id), (m[2] === 'nom' ? '' : 'forme ') + m[3]];
};

// ---------- 3. lignes ----------
const RD = {}; // RD[key][game] = [[zone, text, flags]]
const push = (k, g, row) => { const L = ((RD[k] ||= {})[g] ||= []); if (!L.some(x => x[0] === row[0] && x[1] === row[1])) L.push(row); };
const unkMon = new Set(), haBad = [];
const recBits = (k, fl, r, where) => {
  const bits = []; if (fl) bits.push(fl);
  const tera = r['type-téracristal'] ? clean(String(r['type-téracristal'])) : '';
  if (tera) bits.push(tera === 'Par défaut' ? 'Téra par défaut' : 'Téra ' + tera);
  const tHa = r['talent-caché'] ? String(r['talent-caché']) : '';
  if (/^(Possible|Toujours)$/i.test(tHa)) {
    if (!ha(k)) { haBad.push(`${where} : talent caché ${tHa} mais la fiche ${k} n’a pas de talent caché`); }
    else bits.push(/toujours/i.test(tHa) ? 'talent caché garanti' : 'talent caché possible');
  } else if (tHa && !/^Impossible$/i.test(tHa)) doubt.push(`${where} : talent caché inattendu « ${tHa} »`);
  let notes = r.notes ? clean(String(r.notes)) : '';
  let excl = '';
  notes = notes.replace(/\s*Exclusif Ec\.\s*/g, () => { excl = 'Écarlate uniquement'; return ' '; }).replace(/\s*Exclusif Vi\.\s*/g, () => { excl = 'Violet uniquement'; return ' '; }).replace(/\s+/g, ' ').trim();
  if (notes) bits.push(notes);
  if (excl) bits.push(excl);
  return bits;
};
// regrouper les étoiles d’une même zone quand le reste de la ligne est identique
const BAG = {}; // id → { k, g, z, bits, stars, fl }
for (const z of ZONES) for (const s of STARS) {
  const place = placeOf(z, s);
  for (const [mon, recs] of Object.entries(POOLS[place])) {
    const [k, fl] = keyOf(mon); if (!k) { unkMon.add(mon); continue; }
    for (const r of [].concat(recs)) {
      const d = +(r.difficulté || s);
      if (d !== s) doubt.push(`${place} ${mon} : difficulté ${r.difficulté} ≠ ${s}`);
      if (d >= 7) { doubt.push(`${place} ${mon} : difficulté ${d}★ (hors lot)`); continue; }
      const bits = recBits(k, fl, r, `${place} ${mon}`);
      const id = [k, GAMES[z], z, bits.join(' · ')].join('\u0001');
      const o = (BAG[id] ||= { k, g: GAMES[z], z, bits, stars: new Set() });
      o.stars.add(s);
    }
  }
}
const starTxt = stars => {
  const a = [...stars].sort((x, y) => x - y), parts = [];
  for (let i = 0; i < a.length;) { let j = i; while (j + 1 < a.length && a[j + 1] === a[j] + 1) j++; parts.push(i === j ? a[i] + '★' : a[i] + '–' + a[j] + '★'); i = j + 1; }
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts[0] + ' et ' + parts[1];
  return parts.slice(0, -1).join(', ') + ' et ' + parts[parts.length - 1];
};
let nLines = 0;
for (const o of Object.values(BAG)) {
  push(o.k, o.g, [o.z, [starTxt(o.stars), ...o.bits].join(' · '), '']); nLines++;
}
// Antre Interdit (Ogerpon, Masque Turquoise) — pas un cristal 1–6★
{ const recs = MOD['Antre Interdit'] || {}; let n = 0;
  for (const [mon, rs] of Object.entries(recs)) {
    const [k, fl] = keyOf(mon); if (!k) { unkMon.add(mon); continue; }
    for (const r of [].concat(rs)) {
      const bits = [fl, r.milieu ? clean(String(r.milieu)) : '', r.niveau ? 'Niv. ' + clean(String(r.niveau)).replace(/-/g, '–') : '', /unique/i.test(String(r.taux || '')) ? 'une seule capture' : (r.taux && r.taux !== '-' ? clean(String(r.taux)) : '')].filter(Boolean);
      push(k, 'svmask', ['Antre Interdit (Septentria)', bits.join(' · '), '']); n++; nLines++;
    }
  }
  if (n !== 1) doubt.push('Antre Interdit : ' + n + ' ligne(s) (attendu : Ogerpon seulement)');
  rep.antreInterdit = n;
}
rep.unknownNames = [...unkMon];
rep.haBad = haBad;
if (unkMon.size) doubt.push('noms inconnus : ' + [...unkMon].join(', '));
if (haBad.length) doubt.push('talent caché sans talent caché sur la fiche : ' + haBad.join(' ; '));

// Pokémon avec un raid SV mais sans jeu SV sélectionnable (av / hors dex)
const noGame = [];
for (const k of Object.keys(RD)) {
  const id = BYK[k] ? BYK[k].id : +k, sp = rd(`sp/${id}.json`), f = sp.f[k] || sp.f[String(id)] || {}, av = new Set([...(f.av || []), ...((k === String(id) && sp.hx) || [])]);
  if (![...Object.keys(RD[k])].some(g => av.has(g))) noGame.push(k + ' (' + Object.keys(RD[k]).join(',') + ')');
}
if (noGame.length) doubt.push('raids écrits mais aucun jeu ÉV sélectionnable dans l’appli (données d’disponibilité préexistantes, non modifiées) : ' + noGame.join(', '));
rep.noGame = noGame;

// ---------- 4. écriture des fiches ----------
const RAIDPL = /^Cristal de raid [1-6] étoiles? \((?:Paldea|Septentria|Terra-Dôme)\)$/;
const ANTRE = /^Antre Interdit( \(Septentria\))?$/;
let removed = 0, files = 0; const games = ['sv', 'svmask', 'svdisk'];
const ids = [...new Set(core.e.map(e => e.id))];
for (const id of ids) {
  const f = new URL(`sp/${id}.json`, D); if (!fs.existsSync(f)) continue; const sp = JSON.parse(fs.readFileSync(f)), before = JSON.stringify(sp);
  for (const [k, v] of Object.entries(sp.f)) {
    if (v.rd) { for (const g of games) delete v.rd[g]; if (!Object.keys(v.rd).length) delete v.rd; }
    if (v.pl) {
      for (const g of games) { const L = v.pl[g]; if (!L) continue;
        const keep = L.filter(([pl]) => { if (RAIDPL.test(pl) || ANTRE.test(pl)) { removed++; return false; } return true; });
        if (keep.length) v.pl[g] = keep; else delete v.pl[g];
      }
      if (!Object.keys(v.pl).length) delete v.pl;
    }
    if (RD[k]) {
      const o = { ...(v.rd || {}) };
      for (const g of games) if (RD[k][g]) o[g] = RD[k][g].sort((a, b) => a[0].localeCompare(b[0], 'fr') || a[1].localeCompare(b[1], 'fr', { numeric: true }));
      v.rd = o;
    }
  }
  const after = JSON.stringify(sp); if (after !== before) { fs.writeFileSync(f, after); files++; }
}
const missingKey = Object.keys(RD).filter(k => { const id = BYK[k] ? BYK[k].id : +k; const sp = rd(`sp/${id}.json`); return !sp.f[k]; });
if (missingKey.length) doubt.push('clés sans fiche : ' + missingKey.join(', '));
const cov = {}; for (const g of games) cov[g] = { keys: Object.values(RD).filter(o => o[g]).length, lines: Object.values(RD).reduce((a, o) => a + ((o[g] || []).length), 0) };
rep.cov = cov; rep.removedPl = removed; rep.files = files; rep.doubt = doubt; rep.lines = nLines; rep.RD = undefined;
// garder quelques exemples pour l’audit / le rapport
const ex = k => Object.fromEntries(Object.entries(RD[k] || {}).map(([g, L]) => [g, L.map(r => r[0] + ' | ' + r[1])]));
rep.examples = { '25': ex('25'), '324': ex('324'), '226': ex('226'), '286': ex('286'), '1017': ex('1017'), '89-alola': ex('89-alola'), '128-paldea-blaze-breed': ex('128-paldea-blaze-breed'), '3': ex('3'), '6': ex('6'), '313': ex('313') };
console.log(`v60.27 tables : ${Object.values(rep.pools).reduce((a, n) => a + n, 0)} entrées sur 18 cristaux (${ZONES.map(z => z + ' ' + STARS.map(s => Object.keys(POOLS[placeOf(z, s)]).length).join('/')).join(', ')}) ; pages = module${pageDiff.length ? ' SAUF ' + pageDiff.length + ' écart(s)' : ''}`);
console.log(`v60.27 raids : ${Object.entries(cov).map(([g, c]) => `${g} ${c.keys} fiches / ${c.lines} lignes`).join(', ')} ; Antre Interdit ${rep.antreInterdit} ; lignes « Cristal / Antre Interdit » retirées de pl : ${removed} ; fichiers modifiés : ${files}`);
console.log(`v60.27 noms inconnus : ${rep.unknownNames.join(', ') || '—'} ; sans jeu ÉV sélectionnable : ${noGame.length}${noGame.length ? ' — ' + noGame.join(', ') : ''}`);
console.log(`v60.27 doutes : ${doubt.length}${doubt.length ? '\n  - ' + doubt.join('\n  - ') : ''}`);
if (process.env.V6027_REPORT) fs.writeFileSync(process.env.V6027_REPORT, JSON.stringify(rep, null, 1));
