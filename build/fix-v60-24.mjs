// v60.24: raids Dynamax d’Épée / Bouclier (étape 1 du plan raids). Idempotent : node fix-v60-24.mjs   (V6024_REPORT=fichier.json → rapport détaillé)
// Avant : les fiches ÉB affichaient « Antre 173 · Raid Dynamax 5★ » (173 = numéro de table de Poképédia, pas un lieu), les antres d’Isolarmure /
// Couronneige et l’Expédition Dynamax étaient rangés dans le jeu de base, les taux par version, les IV garantis et « talent caché Possible » étaient perdus.
// Sources (Poképédia, CC BY-NC-SA 3.0 FR ; texte brut en cache versionné build/cache/v60-24/, téléchargé une seule fois) :
//   - Module:Localisations/Données/Pokémon Épée et Bouclier : contenu de chaque table « Antre N » (taux par étoile et par version, iv, talent-caché, notes),
//     « Antre événementiel 71 » et « Expédition Dynamax|Grand Antre Dynamax » ;
//   - « <Zone>/Antres » : antres physiques (zone, lettre) → table du faisceau rouge et du faisceau mauve ;
//   - « Antre N » : zone de jeu (Terres Sauvages / Isolarmure / Couronneige), couleur, images « <Zone> Antre <lettre> EB.png » (2e source interne) ;
//   - « Antre de Pokémon » : liste des tables (région, couleur), sens de « talent caché », rareté selon les Badges ;
//   - PokéAPI (location-area *-max-den-*, méthode max-raid ; résumé pokeapi-dens.json) : recoupement des espèces de chaque antre (rouge = common,
//     mauve = rare). Les lettres de PokéAPI ne suivent pas celles de Poképédia : comparaison par zone et par contenu.
//   Correction d’un antre seulement si deux sources concordent contre la page de zone (images de la page « Antre N » + PokéAPI) ; sinon page de zone gardée, cas signalé.
// Résultat : docs/data/sp/<id>.json → f[<clé>].rd[<jeu sw|swisle|swcrown>] = [[zone, texte, drapeaux]] (drapeaux : g = Gigamax, e = événement) ;
// lignes « Antre … » / « Grand Antre Dynamax » (Expédition) retirées de f.pl ; « Grand Antre Dynamax » (Vémini) déplacé vers Couronneige.
import fs from 'node:fs'; import { execFileSync } from 'node:child_process';
import { parseLua, clean } from './pokepedia.mjs';
const D = new URL('../docs/data/', import.meta.url), C = new URL('./cache/v60-24/', import.meta.url);
const rd = f => JSON.parse(fs.readFileSync(new URL(f, D))), wr = (f, o) => fs.writeFileSync(new URL(f, D), JSON.stringify(o));
fs.mkdirSync(C, { recursive: true });
const fname = t => t.replace(/[ /:]/g, '_') + '.wiki';
const page = (t, opt) => { const f = new URL(fname(t), C);
  if (!fs.existsSync(f) || !fs.statSync(f).size) { try { fs.writeFileSync(f, execFileSync('curl', ['-sfLG', 'https://www.pokepedia.fr/index.php', '--data-urlencode', 'title=' + t, '--data', 'action=raw'])); } catch { if (opt) return ''; throw new Error('fix-v60-24 : page introuvable ' + t); } execFileSync('sleep', ['0.3']); }
  const w = fs.readFileSync(f, 'utf8'); if (/^#REDIRECT/i.test(w)) throw new Error(`fix-v60-24 : ${t} est une redirection`); return w; };
const A = s => s.replace(/’/g, "'"), N = s => A(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const core = rd('core.json'), BYK = Object.fromEntries(core.e.map(e => [e.k, e]));
const byName = new Map(core.e.filter(e => !e.c).map(e => [A(e.n), e.id]));
const doubt = [], rep = {};

// ---------- 1. tables (module) ----------
const MOD = parseLua(page('Module:Localisations/Données/Pokémon Épée et Bouclier'));
const TABLES = {}; for (const p of Object.keys(MOD)) { const m = p.match(/^Antre (\d+)$/); if (m) TABLES[m[1]] = MOD[p]; }
// « Antre de Pokémon »: table → région / couleur, rareté selon les Badges
const W_DEN = page('Antre de Pokémon');
const LIST = {}; for (const m of W_DEN.matchAll(/^\| \[\[Antre (\d+)\|\d+\]\]\n\| ([^\n]+)\n\| ([^\n]+)\n/gm)) LIST[m[1]] = { reg: m[2].trim(), c: /^Rouge/.test(m[3]) ? 'r' : /^Mauve/.test(m[3]) ? 'm' : '?' };
if (!/les Pokémon des antres mauves d'\[\[Isolarmure\]\] et de \[\[Couronneige\]\] possèdent toujours leur talent caché/.test(W_DEN)) throw new Error('fix-v60-24 : sens de « talent caché Toujours » à revérifier (page Antre de Pokémon)');
const BADGES = []; { const i = W_DEN.indexOf('== Rareté des raids =='), t = W_DEN.slice(i, W_DEN.indexOf('|}', i));
  for (const r of t.split(/\n\|-\n/).slice(2)) { const L = r.trim().split('\n'), b = parseInt(L[0].replace(/^\|\s*/, ''), 10), cells = L[L.length - 1].replace(/^\|\s?/, '').split('||');
    if (isNaN(b) || cells.length !== 5) throw new Error('fix-v60-24 : tableau « Rareté des raids » illisible'); BADGES.push([b, cells.map((c, k) => /✔/.test(c) ? k + 1 : 0).filter(Boolean)]); } }
// the app writes this table as text (raidHTML, docs/app.js): keep both in sync
const BADGES_APP = '0:1|1:1,2|2:1,2|3:1,2,3|4:2,3|5:2,3|6:3,4|7:3,4|8:3,4,5';
if (BADGES.map(([b, s]) => b + ':' + s.join(',')).join('|') !== BADGES_APP) throw new Error('fix-v60-24 : rareté selon les Badges modifiée sur Poképédia : ' + JSON.stringify(BADGES));
// ---------- 2. dens: zone pages ----------
const REGION = { 'Terres Sauvages': 'sw', 'Isolarmure': 'swisle', 'Couronneige': 'swcrown' };
const zones = new Set(); for (const n of Object.keys(TABLES)) for (const m of page('Antre ' + n).matchAll(/\[\[([^\]|]+)\/Antres\|/g)) zones.add(m[1]);
zones.add('Îlot Calméole'); // pages « Antre 143 / 144 » : images seulement
const dens = {}; // dens[zone][letter] = { r: table, m: table }
for (const z of [...zones].sort()) {
  const w = page(z + '/Antres'), secs = w.split(/^==(?!=)\s*(.+?)\s*==\s*$/m);
  for (let i = 1; i < secs.length; i += 2) {
    const h = secs[i], b = secs[i + 1], a = h.match(/^Antre ([A-Z0-9]+)$/), r = h.match(/^Antres ([A-Z]) à ([A-Z])$/); let Ls;
    if (a) Ls = [a[1]]; else if (r) { Ls = []; for (let c = r[1].charCodeAt(0); c <= r[2].charCodeAt(0); c++) Ls.push(String.fromCharCode(c)); } else continue;
    const sub = b.split(/^===(?!=)\s*(.+?)\s*===\s*$/m), o = {};
    for (let j = 1; j < sub.length; j += 2) { const c = /rouge/i.test(sub[j]) ? 'r' : /mauve/i.test(sub[j]) ? 'm' : null, n = (sub[j + 1].match(/lst:Antre (\d+)\|Pok/) || [])[1]; if (c && n) o[c] = n; }
    if (!o.r || !o.m) doubt.push(`${z} antre ${Ls.join('')} : faisceau sans table (${JSON.stringify(o)})`);
    for (const L of Ls) (dens[z] ||= {})[L] = { ...o };
  }
}
// 2e source Poképédia : images des pages « Antre N »
const IMG = {}; for (const n of Object.keys(TABLES)) for (const m of page('Antre ' + n).matchAll(/Fichier:([^\]|]*?) Antre ([A-Z0-9]+) EB\.(?:png|jpg)/g)) ((IMG[m[1]] ||= {})[m[2]] ||= new Set()).add(n);
// PokéAPI (résumé en cache ; téléchargé si absent)
const PA_F = new URL('pokeapi-dens.json', C);
if (!fs.existsSync(PA_F)) {
  const get = u => JSON.parse(execFileSync('curl', ['-sf', u], { maxBuffer: 1 << 26 })), list = get('https://pokeapi.co/api/v2/location-area/?limit=3000').results.filter(x => /-max-den-/.test(x.name)), fr = {}, out = { src: 'PokéAPI (https://pokeapi.co) location-area *-max-den-*, méthode max-raid ; ids d’espèce (formes > 10000 conservées)', date: new Date().toISOString().slice(0, 10), dens: {} };
  for (const x of list) { const j = get(x.url); if (!(j.location.name in fr)) { const l = get(j.location.url); fr[j.location.name] = (l.names.find(y => y.language.name === 'fr') || {}).name || j.location.name; }
    const s = { z: fr[j.location.name], common: [], rare: [] };
    for (const p of j.pokemon_encounters) { const id = +p.pokemon.url.split('/').slice(-2)[0]; for (const v of p.version_details) for (const e of v.encounter_details) { const r = (e.condition_values.find(c => /rarity/.test(c.name)) || { name: '' }).name.replace('max-den-rarity-', ''); if (s[r] && !s[r].includes(id)) s[r].push(id); } }
    s.common.sort((a, b) => a - b); s.rare.sort((a, b) => a - b); out.dens[x.name] = s; }
  fs.writeFileSync(PA_F, JSON.stringify(out)); }
const PA = JSON.parse(fs.readFileSync(PA_F)).dens, PAZ = {};
for (const [n, s] of Object.entries(PA)) (PAZ[s.z] ||= []).push({ n, r: new Set(s.common.filter(i => i < 10000)), m: new Set(s.rare.filter(i => i < 10000)) });
const speciesOf = t => { const s = new Set(); for (const mon of Object.keys(TABLES[t] || {})) { if (/forme\(/.test(mon)) continue; const id = byName.get(A(mon.replace(/ (sexe|nom)\(.*$/, '').trim())); if (id) s.add(id); } return s; };
const SP = Object.fromEntries(Object.keys(TABLES).map(t => [t, speciesOf(t)]));
const J = (a, b) => { let i = 0; for (const x of a) if (b.has(x)) i++; return i / ((a.size + b.size - i) || 1); };
const bestT = s => { let b = '?', bj = 0; for (const t of Object.keys(SP)) { const j = J(SP[t], s); if (j > bj) { bj = j; b = t; } } return bj >= 0.8 ? b : '?'; };
// per zone multiset of (red/mauve) pairs from PokéAPI
const apiPairs = {}; for (const [z, L] of Object.entries(PAZ)) apiPairs[z] = L.map(d => bestT(d.r) + '/' + bestT(d.m));
const fixes = [];
const imgPair = (z, L) => { const im = IMG[z] && IMG[z][L] ? [...IMG[z][L]] : [], r = im.filter(t => LIST[t] && LIST[t].c === 'r'), m = im.filter(t => LIST[t] && LIST[t].c === 'm'); return r.length === 1 && m.length === 1 ? { r: r[0], m: m[0] } : null; };
const score = (z, D_) => { const api = [...(apiPairs[z] || [])]; let n = 0; for (const o of Object.values(D_)) { const i = api.indexOf(o.r + '/' + o.m); if (i >= 0) { api.splice(i, 1); n++; } } return { n, rest: api }; };
for (const [z, D_] of Object.entries(dens)) {
  if (!(apiPairs[z] || []).length) { doubt.push(`${z} : zone absente de PokéAPI`); continue; }
  if (apiPairs[z].length !== Object.keys(D_).length) doubt.push(`${z} : ${Object.keys(D_).length} antres (Poképédia) / ${apiPairs[z].length} (PokéAPI)`);
  // a den is corrected only when the « Antre N » page images disagree with the zone page AND the change improves the agreement with PokéAPI
  for (const L of Object.keys(D_)) { const o = D_[L], ip = imgPair(z, L); if (!ip || (ip.r === o.r && ip.m === o.m)) continue;
    const s0 = score(z, D_).n; D_[L] = ip; if (score(z, D_).n > s0) fixes.push(`${z} antre ${L} : ${o.r}/${o.m} → ${ip.r}/${ip.m} (images de la page « Antre N » + PokéAPI)`); else D_[L] = o; }
  const { rest } = score(z, D_), api = [...apiPairs[z]];
  for (const [L, o] of Object.entries(D_)) { const i = api.indexOf(o.r + '/' + o.m); if (i >= 0) { api.splice(i, 1); continue; }
    const partial = (PAZ[z] || []).some(d => J(SP[o.r], d.r) >= 0.5 && J(SP[o.m], d.m) >= 0.25);
    doubt.push(`${z} antre ${L} : tables ${o.r}/${o.m} gardées (Poképédia) ; PokéAPI ${partial ? 'proche mais pas identique (formes / espèces en plus ou en moins)' : 'différent'} ; reste PokéAPI dans la zone : ${rest.join(' ') || '—'}`); }
}
// zone → jeu
const ZG = {}; for (const [z, D_] of Object.entries(dens)) { const gs = new Set(Object.values(D_).flatMap(o => [o.r, o.m]).map(t => REGION[(LIST[t] || {}).reg])); if (gs.size !== 1 || gs.has(undefined)) throw new Error(`fix-v60-24 : zone ${z} sur plusieurs régions ${[...gs]}`); ZG[z] = [...gs][0]; }
// tables → dens
const T2D = {}; for (const [z, D_] of Object.entries(dens)) for (const [L, o] of Object.entries(D_)) for (const c of ['r', 'm']) if (o[c]) { if (LIST[o[c]] && LIST[o[c]].c !== c) doubt.push(`${z} antre ${L} : table ${o[c]} donnée ${c === 'r' ? 'rouge' : 'mauve'} mais listée ${LIST[o[c]].c === 'r' ? 'rouge' : 'mauve'}`); ((T2D[o[c]] ||= {})[z] ||= { c, L: [] }).L.push(L); }
const unmapped = Object.keys(TABLES).filter(t => !T2D[t]);
rep.tables = { total: Object.keys(TABLES).length, mapped: Object.keys(TABLES).length - unmapped.length, unmapped, dens: Object.values(dens).reduce((a, d) => a + Object.keys(d).length, 0), zones: Object.keys(dens).length, fixes };

// ---------- 3. lines ----------
const VN = { Ep: 'Épée', Bo: 'Bouclier' };
const pv = (s, where) => { const t = String(s).split(/\s*,\s*/), o = {}, un = [];
  for (let i = 0; i < t.length; i++) { if (!/^\d+(\.\d+)?$/.test(t[i])) { doubt.push(`${where} : valeur illisible « ${s} »`); return null; } const nx = t[i + 1]; if (nx === 'Ep' || nx === 'Bo') { o[nx] = +t[i]; i++; } else un.push(+t[i]); }
  // untagged value = both versions, or the version not tagged elsewhere (« 35, 30, Bo » = 35 % Épée, 30 % Bouclier)
  if (un.length > 1) { doubt.push(`${where} : plusieurs valeurs sans version « ${s} »`); return null; }
  if (un.length) { if (Object.keys(o).length) doubt.push(`${where} : « ${s} » lu ${o.Ep === undefined ? un[0] + ' % Épée' : o.Ep + ' % Épée'} / ${o.Bo === undefined ? un[0] + ' % Bouclier' : o.Bo + ' % Bouclier'}`); for (const v of ['Ep', 'Bo']) if (o[v] === undefined) o[v] = un[0]; }
  return o; };
const pc = n => String(n).replace('.', ',') + ' %';
const hasHA = (k) => { const id = BYK[k] ? BYK[k].id : +k, sp = rd(`sp/${id}.json`), f = sp.f[k] || sp.f[String(id)]; const a = (f && f.a) || (sp.f[String(id)] || {}).a || []; return a.some(x => x[1]); };
const HA = {}; const ha = k => (HA[k] ??= hasHA(k));
// « Mackogneur forme(Gigamax) » → [clé, libellé de forme, gigamax]
const REG = { Alola: 'alola', Galar: 'galar', Hisui: 'hisui', Paldea: 'paldea' };
const keyOf = mon => {
  const m = mon.match(/^(.*?)(?: (forme|sexe|nom)\(([^)]*)\))?$/), id = byName.get(A(m[1].trim())); if (!id) return [null];
  if (!m[2]) return [String(id), '', false];
  if (m[2] === 'sexe') return [String(id), m[3] === 'm' ? 'mâle' : m[3] === 'f' ? 'femelle' : m[3], false];
  if (m[3] === 'Gigamax') return [String(id), '', true];
  if (REG[m[3]]) { const k = `${id}-${REG[m[3]]}`; return BYK[k] ? [k, '', false] : [String(id), 'forme ' + m[3], false]; }
  const fs_ = core.e.filter(e => e.id === id), n = N(m[3]), f = fs_.find(e => e.l && N(e.l) === n) || fs_.find(e => e.l && N(e.l).startsWith(n + ' ')) ;
  if (f && f.c !== 'gmax') return [f.k, '', false];
  return [String(id), (m[2] === 'nom' ? '' : 'forme ') + m[3], false];
};
const starTxt = (stars) => { // [[star, {Ep,Bo}]] → « 3★ 20 % · 4–5★ Épée 25 % / Bouclier 10 % », exclusivity
  const only = v => stars.every(([, o]) => o[v] !== undefined && o[v === 'Ep' ? 'Bo' : 'Ep'] === undefined);
  const excl = only('Ep') ? 'Ep' : only('Bo') ? 'Bo' : null;
  const one = o => excl ? pc(o[excl]) : o.Ep === o.Bo ? pc(o.Ep) : [o.Ep !== undefined ? `Épée ${pc(o.Ep)}` : '', o.Bo !== undefined ? `Bouclier ${pc(o.Bo)}` : ''].filter(Boolean).join(' / ');
  const parts = []; for (let i = 0; i < stars.length;) { let j = i; const t = one(stars[i][1]); while (j + 1 < stars.length && +stars[j + 1][0] === +stars[j][0] + 1 && one(stars[j + 1][1]) === t) j++;
    parts.push(`${i === j ? stars[i][0] : stars[i][0] + '–' + stars[j][0]}★ ${t}`); i = j + 1; }
  return { txt: parts.join(' · '), excl };
};
const ivTxt = o => !o ? '' : o.Ep === o.Bo ? `${o.Ep} IV parfait${o.Ep > 1 ? 's' : ''}` : `IV parfaits : ${o.Ep} (Épée) / ${o.Bo} (Bouclier)`;
const sums = {}; // sums[table][star][ver]
const RD = {}; // RD[key][game] = [[zone, text, flags]]
const push = (k, g, row) => { const L = ((RD[k] ||= {})[g] ||= []); if (!L.some(x => x[0] === row[0] && x[1] === row[1])) L.push(row); };
let nLines = 0; const unkMon = new Set(), MERGE = {};
const recText = (k, gmax, fl, r, where) => {
  const stars = ['1', '2', '3', '4', '5'].filter(s => r[s] !== undefined && r[s] !== '-' && r[s] !== '0').map(s => [s, pv(r[s], where)]).filter(x => x[1]);
  const st = stars.length ? starTxt(stars) : null, bits = [];
  if (gmax) bits.push('Gigamax'); if (fl) bits.push(fl);
  if (st) bits.push(st.txt); else if (r.taux) { const S = SUMS[where.split(' ')[1]] || {}, all = ['1', '2', '3', '4', '5'].every(k => S[k] && ['Ep', 'Bo'].every(v => Math.abs(S[k][v] + +r.taux - 100) < 0.5));
    bits.push(all ? `1–5★ ${pc(r.taux)}` : `${pc(r.taux)} (étoiles non précisées par la source)`); doubt.push(`${where} : taux sans étoile (${r.taux} %)${all ? ' → toutes les étoiles (les autres Pokémon de l’antre font 90 % à chaque étoile)' : ''}`); }
  const iv = r.iv ? pv(r.iv, where) : null; if (iv) bits.push(ivTxt(iv));
  if (r['talent-caché'] && ha(k)) bits.push(/toujours/i.test(r['talent-caché']) ? 'talent caché garanti' : 'talent caché possible');
  if (r.notes) bits.push(clean(String(r.notes)).replace(/^Forme /, 'forme ').replace(/ dans Épée, Forme /, ' dans Épée, forme '));
  if (st && st.excl) bits.push(`${VN[st.excl]} uniquement`);
  return { txt: bits.join(' · '), stars };
};
const SUMS = {}; for (const [t, mons] of Object.entries(TABLES)) for (const [mon, recs] of Object.entries(mons)) for (const r of [].concat(recs)) for (const st of ['1', '2', '3', '4', '5']) if (r[st] !== undefined && r[st] !== '-') { const o = pv(r[st], `Antre ${t} ${mon} (somme)`); if (o) { const x = ((SUMS[t] ||= {})[st] ||= { Ep: 0, Bo: 0 }); x.Ep += o.Ep || 0; x.Bo += o.Bo || 0; } }
for (const [t, mons] of Object.entries(TABLES)) {
  for (const [mon, recs] of Object.entries(mons)) {
    const [k, fl, gmax] = keyOf(mon); if (!k) { unkMon.add(mon); continue; }
    for (const r of [].concat(recs)) {
      const { txt, stars } = recText(k, gmax, fl, r, `Antre ${t} ${mon}`);
      for (const [s, o] of stars) for (const v of ['Ep', 'Bo']) if (o[v] !== undefined) { const x = ((sums[t] ||= {})[s] ||= { Ep: 0, Bo: 0 }); x[v] += o[v]; }
      if (r.taux && !stars.length) for (const v of ['Ep', 'Bo']) ((sums[t] ||= {})['?'] ||= { Ep: 0, Bo: 0 })[v] += +r.taux;
      // dens of one zone with the same beam and the same line (other tables, same rates) are merged: « Antres A, B, C (faisceau rouge) · … »
      for (const [z, d] of Object.entries(T2D[t] || {})) { const id = [k, ZG[z], z, d.c, txt, gmax ? 'g' : ''].join('\u0001'); const o = (MERGE[id] ||= { k, g: ZG[z], z, c: d.c, txt, fl: gmax ? 'g' : '', L: new Set() }); d.L.forEach(x => o.L.add(x)); }
    }
  }
}
for (const o of Object.values(MERGE)) { const L = [...o.L].sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }));
  push(o.k, o.g, [o.z, `${L.length > 1 ? 'Antres ' + L.join(', ') : 'Antre ' + L[0]} (faisceau ${o.c === 'r' ? 'rouge' : 'mauve'}) · ${o.txt}`, o.fl]); nLines++; }
// rates sum sanity: per table, star and version = 100 %
const badSum = [];
for (const [t, S] of Object.entries(sums)) for (const [s, o] of Object.entries(S)) if (s !== '?') for (const v of ['Ep', 'Bo']) { const extra = (S['?'] || { Ep: 0, Bo: 0 })[v]; if (Math.abs(o[v] - 100) > 0.5 && Math.abs(o[v] + extra - 100) > 0.5) badSum.push(`Antre ${t} ${s}★ ${VN[v]} : ${o[v]} %`); }
rep.badSum = badSum;
// event den 71
const W_EV = page('Antre événementiel 71');
if (!/À partir du 1<sup>er<\/sup> novembre 2022 et jusqu'à la fin du service, il a 25&nbsp;% de chances de remplacer n'importe quel antre/.test(W_EV)) throw new Error('fix-v60-24 : texte de l’antre événementiel 71 modifié');
for (const [mon, recs] of Object.entries(MOD['Antre événementiel 71'] || {})) { const [k, fl, gmax] = keyOf(mon); if (!k) { unkMon.add(mon); continue; }
  for (const r of [].concat(recs)) { const { txt } = recText(k, gmax, fl, r, `Antre événementiel 71 ${mon}`); push(k, 'sw', ['Raid événementiel – n’importe quel antre', txt, (gmax ? 'g' : '') + 'e']); nLines++; } }
// Expédition Dynamax (Couronneige)
const EXP = MOD['Expédition Dynamax|Grand Antre Dynamax'] || {}; let nExp = 0;
for (const [mon, recs] of Object.entries(EXP)) { const [k, fl, gmax] = keyOf(mon); if (!k) { unkMon.add(mon); continue; }
  for (const r of [].concat(recs)) {
    const mil = clean(String(r.milieu || '')), leg = /hors du commun/.test(mil), tx = String(r.taux || ''), v = (tx.match(/, (Ep|Bo)$/) || [])[1];
    const bits = [gmax ? 'Gigamax' : '', fl, leg ? 'Pokémon hors du commun (fin d’expédition)' : 'Pokémon rencontrable en expédition', r.niveau ? 'Niv. ' + r.niveau : '', /Unique/.test(tx) ? 'une seule capture' : '',
      /Note Légende/.test(mil) ? 'une fois la Note Légende reçue' : '', v ? `${VN[v]} uniquement` : ''].filter(Boolean);
    push(k, 'swcrown', ['Expédition Dynamax – Grand Antre Dynamax', bits.join(' · '), gmax ? 'g' : '']); nExp++; } }
rep.unknownNames = [...unkMon];

// ---------- 4. write sheets ----------
const RAIDPL = /^(Antre (événementiel )?\d+)$/; let removed = 0, moved = 0, files = 0; const games = ['sw', 'swisle', 'swcrown'];
const ids = [...new Set(core.e.map(e => e.id))];
for (const id of ids) {
  const f = new URL(`sp/${id}.json`, D); if (!fs.existsSync(f)) continue; const sp = JSON.parse(fs.readFileSync(f)), before = JSON.stringify(sp);
  for (const [k, v] of Object.entries(sp.f)) {
    delete v.rd;
    if (v.pl) { for (const g of games) { const L = v.pl[g]; if (!L) continue;
        const keep = L.filter(([pl, d]) => { if (RAIDPL.test(pl)) { removed++; return false; } if (/^Grand Antre Dynamax( \(Couronneige\))?$/.test(pl) && /(^|· )Pokémon (rencontrables|hors du commun)/.test(d || '')) { removed++; return false; } return true; });
        if (g === 'sw') { const ga = keep.filter(([pl]) => pl === 'Grand Antre Dynamax'); if (ga.length) { const C2 = (v.pl.swcrown ||= []); for (const x of ga) { if (!C2.some(y => y[0] === x[0] && y[1] === x[1])) C2.push(x); moved++; } }
          v.pl.sw = keep.filter(([pl]) => pl !== 'Grand Antre Dynamax'); } else v.pl[g] = keep;
      }
      for (const g of games) if (v.pl[g] && !v.pl[g].length) delete v.pl[g];
      if (!Object.keys(v.pl).length) delete v.pl; }
    if (RD[k]) { const o = {}; for (const g of games) if (RD[k][g]) o[g] = RD[k][g].sort((a, b) => a[0].localeCompare(b[0], 'fr') || a[1].localeCompare(b[1], 'fr', { numeric: true })); v.rd = o; }
  }
  const after = JSON.stringify(sp); if (after !== before) { fs.writeFileSync(f, after); files++; }
}
const missingKey = Object.keys(RD).filter(k => { const id = BYK[k] ? BYK[k].id : +k; const sp = rd(`sp/${id}.json`); return !sp.f[k]; });
if (missingKey.length) doubt.push('clés sans fiche : ' + missingKey.join(', '));
const cov = {}; for (const g of games) cov[g] = { keys: Object.values(RD).filter(o => o[g]).length, lines: Object.values(RD).reduce((a, o) => a + ((o[g] || []).length), 0) };
rep.cov = cov; rep.removedPl = removed; rep.movedGrandAntre = moved; rep.files = files; rep.doubt = doubt; rep.expedition = nExp;
console.log(`v60.24 tables : ${rep.tables.mapped}/${rep.tables.total} reliées à ${rep.tables.dens} antres (${rep.tables.zones} zones)${unmapped.length ? ', sans antre : ' + unmapped.join(', ') : ''} ; corrections : ${fixes.length}${fixes.length ? ' — ' + fixes.join(' ; ') : ''}`);
console.log(`v60.24 raids : ${Object.entries(cov).map(([g, c]) => `${g} ${c.keys} fiches / ${c.lines} lignes`).join(', ')} ; Expédition ${nExp} ; lignes « Antre » retirées de pl : ${removed}, Grand Antre déplacé : ${moved} ; fichiers modifiés : ${files}`);
console.log(`v60.24 sommes de taux ≠ 100 % : ${badSum.length}${badSum.length ? ' — ' + badSum.slice(0, 12).join(' ; ') : ''} ; noms inconnus : ${rep.unknownNames.join(', ') || '—'}`);
console.log(`v60.24 doutes : ${doubt.length}${doubt.length ? '\n  - ' + doubt.join('\n  - ') : ''}`);
if (process.env.V6024_REPORT) fs.writeFileSync(process.env.V6024_REPORT, JSON.stringify(rep, null, 1));
