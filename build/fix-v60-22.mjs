// v60.22: textes et lieux des anciens jeux. Idempotent ; sources en cache versionné (build/cache/v42/, téléchargées une seule fois).
//  1. Lieux : les fiches des jeux à rencontres PokéAPI (Gén. I à VII + RF/VF Switch) qui n’affichaient que « Aucune rencontre sauvage répertoriée
//     par PokéAPI » reçoivent les lieux Poképédia (Module:Localisations/Données/Pokémon <jeu>) ou, sans lieu, la méthode d’obtention
//     (sous-page /Indisponibles : « Faire évoluer … », « Échange », « Événement »…). Complète fix-v42.mjs (GBA / DS, Pokédex régional seulement) :
//     ajoute Rouge / Bleu, Jaune, Or / Argent, Cristal, X / Y, ROSA, Soleil / Lune, USUL et les Pokémon « Hors dex » de tous ces jeux.
//     Seules les fiches sans aucune donnée sont touchées (les rencontres PokéAPI existantes priment). Formes : libellé Poképédia « forme(…) »
//     = libellé de la forme dans l’app (Alola, Motif Bleu…), sinon ignorée. RF/VF Switch : lignes RF/VF hors fonctions GBA (échanges GBA, événements).
//  2. Textes Pokédex : Empiflor et Hippopotas dans Noir 2 / Blanc 2 = texte officiel de Noir / Blanc (texte anglais identique à la typographie près
//     dans PokéAPI), au lieu de la traduction automatique.
//  3. Jeux sans Pokédex National (Soleil / Lune, USUL, Épée / Bouclier, Écarlate / Violet) : un Pokémon « Hors dex » n’a pas de description → sp.pna.
import fs from 'node:fs'; import { execFileSync } from 'node:child_process';
import { parseLua, recLine, clean } from './pokepedia.mjs';
const D = new URL('../docs/data/', import.meta.url), C = new URL('./cache/v42/', import.meta.url);
const rd = f => JSON.parse(fs.readFileSync(new URL(f, D))), wr = (f, o) => fs.writeFileSync(new URL(f, D), JSON.stringify(o));
const MOD = { rb: 'Rouge et Bleu', y: 'Jaune', gs: 'Or et Argent', c: 'Cristal', rs: 'Rubis et Saphir', e: 'Émeraude', frlg: 'Rouge Feu et Vert Feuille', dp: 'Diamant et Perle', pt: 'Platine',
  hgss: 'Or HeartGold et Argent SoulSilver', bw: 'Noir et Blanc', b2w2: 'Noir 2 et Blanc 2', xy: 'X et Y', oras: 'Rubis Oméga et Saphir Alpha', sm: 'Soleil et Lune', usum: 'Ultra-Soleil et Ultra-Lune' };
// version tag at the end of « taux » (« 20, A ») → version name (as in core.json games[].ver)
const VT = { No: 'Noir', No2: 'Noir 2', Bl2: 'Blanc 2', R: 'Rouge', B: 'Bleu', O: 'Or', A: 'Argent', Ru: 'Rubis', Sa: 'Saphir', RF: 'Rouge Feu', VF: 'Vert Feuille', D: 'Diamant', P: 'Perle', HG: 'Or HeartGold', SS: 'Argent SoulSilver',
  N: 'Noir', Bl: 'Blanc', N2: 'Noir 2', B2: 'Blanc 2', X: 'X', Y: 'Y', RuO: 'Rubis Oméga', Ruo: 'Rubis Oméga', SaA: 'Saphir Alpha', Saa: 'Saphir Alpha', So: 'Soleil', Lu: 'Lune', S: 'Soleil', L: 'Lune', US: 'Ultra-Soleil', UL: 'Ultra-Lune' };
fs.mkdirSync(C, { recursive: true });
const get = t => { const f = new URL(t.replace(/[ /]/g, '_') + '.lua', C);
  if (!fs.existsSync(f) || !fs.statSync(f).size) fs.writeFileSync(f, execFileSync('curl', ['-sfG', 'https://www.pokepedia.fr/index.php', '--data-urlencode', 'title=Module:Localisations/Données/Pokémon ' + t, '--data', 'action=raw']));
  return parseLua(fs.readFileSync(f, 'utf8')); };
const A = s => s.replace(/’/g, "'"), N = s => A(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
const core = rd('core.json'), GI = {}; core.games.forEach((g, i) => GI[g.id] = i);
const byName = new Map(core.e.filter(e => !e.c).map(e => [A(e.n), e.id]));
const BYK = Object.fromEntries(core.e.map(e => [e.k, e]));
// « Bargantua forme(Bleu) » → entry key ; null = form not shown in the app (ignored)
const keyOf = mon => {
  const m = mon.match(/^(.*?)(?: (forme|sexe|nom)\(([^)]*)\))?$/), id = byName.get(A(m[1].trim())); if (!id) return [null];
  if (!m[2] || m[2] === 'nom') return [String(id), ''];
  if (m[2] === 'sexe') return [String(id), m[3] === 'm' ? 'mâle' : m[3] === 'f' ? 'femelle' : m[3]];
  const lab = N(m[3]), fs_ = core.e.filter(e => e.id === id && !e.mb && e.c !== 'gmax');
  if (lab === 'alola') return [fs_.some(e => e.k === `${id}-alola`) ? `${id}-alola` : null];
  const hit = fs_.filter(e => e.l && (N(e.l) === lab || N(e.l).endsWith(' ' + lab) || N(e.n).endsWith(' ' + lab)));
  return [hit.length === 1 ? hit[0].k : null, ''];
};
const line = (g, r) => {
  const r2 = { ...r }; let ver = '', extra = [];
  if (r2[''] !== undefined && r2.niveau === undefined) r2.niveau = r2['']; // typo in the source (« [""] = "22" »)
  const two = String(r2.taux || '').match(/^\s*([\d.]+)\s*,\s*(\w+)\s*,\s*([\d.]+)\s*,\s*(\w+)\s*$/); // « 5, RF, 30, VF » = one rate per version
  if (two && VT[two[2]] && VT[two[4]]) r2.taux = `${two[1]} % ${VT[two[2]]}, ${two[3]} % ${VT[two[4]]}`;
  const lv = String(r2.niveau ?? '').match(/^\s*([\d–-]+)\s*,\s*(\w+)\s*,\s*([\d–-]+)\s*,\s*(\w+)\s*$/); // « 14, RuO, 11-13, SaA »
  if (lv && VT[lv[2]] && VT[lv[4]]) r2.niveau = `${lv[1]} (${VT[lv[2]]}), ${lv[3]} (${VT[lv[4]]})`;
  const tm = String(r2.taux || '').match(/,\s*([A-Za-zÉé0-9]+)$/); if (tm && VT[tm[1]]) { ver = VT[tm[1]]; r2.taux = String(r2.taux).slice(0, tm.index).trim(); }
  if (r2['précision-taux']) extra.push((/Pokémon de départ/.test(String(r2.milieu || '')) ? 'starter : ' : '') + clean(String(r2['précision-taux'])));
  if (r2['taux-renfort'] && r2['taux-renfort'] !== '-') extra.push(`appel à l’aide ${clean(String(r2['taux-renfort']))}${/^\d+$/.test(r2['taux-renfort']) ? ' %' : ''}`);
  if (r2.emplacement) extra.push(clean(String(r2.emplacement)));
  if (/^[-—?]$/.test(String(r2.taux || '').trim())) delete r2.taux;
  return [recLine(g, r2) || 'Sauvage', ...extra, ver].filter(Boolean).join(' · ').replace(/\s*\([^()]*\bavec\s*\)/g, '');
};
const pl = {}, na = {}, unk = {}; // pl[key][g] = [[place, line]], na[key][g] = text
for (const [g, t] of Object.entries(MOD)) {
  for (const [place, mons] of Object.entries(get(t))) {
    const P = clean(place.replace(/[^@|{}]*\|/g, '').replace(/@/g, ' — ').replace(/<sup>([^<]*)<\/sup>/g, '$1'));
    for (const [mon, recs] of Object.entries(mons)) {
      const [k, pre] = keyOf(mon); if (!k) { unk[mon] = 1; continue; }
      for (const r of (Array.isArray(recs) ? recs : [recs])) {
        if (/^Bug\b/.test(String(r.milieu || ''))) continue; // glitches (« Bug du Croupier », MissingNo.): not a way to get it
        const ln = [pre, line(g, r)].filter(Boolean).join(' · '), L = ((pl[k] ||= {})[g] ||= []);
        if (!L.some(x => x[0] === P && x[1] === ln)) L.push([P, ln]);
      }
    }
  }
  for (const [mon, txt] of Object.entries(get(t + '/Indisponibles'))) {
    const [k, pre] = keyOf(mon); if (!k || pre || typeof txt !== 'string') continue;
    const tx = clean(txt.replace(/\{\{Jeu\|BP\}\}/g, 'la Banque Pokémon')); if (/^À compléter/i.test(tx) || tx === `Faire évoluer ${mon}`) continue; (na[k] ||= {})[g] = tx;
  }
}
// RF/VF Switch = the same game: Poképédia RF/VF rows without what needs a GBA (link cable trades with Rubis / Saphir / Émeraude / Colosseum, e-Reader, events)
const GBA = /Colosseum|e-Reader|Événement|Ticket|Rubis|Saphir|Émeraude|Pal Park|Box|Cadeau Mystère|Échange/i;
for (const k in pl) if (pl[k].frlg) { const r = pl[k].frlg.filter(x => !GBA.test(x[0] + ' ' + x[1])); if (r.length) pl[k].frlgsw = r; }
for (const k in na) if (na[k].frlg && /^Faire (évoluer|reproduire)/.test(na[k].frlg)) na[k].frlgsw = na[k].frlg;
const GAMES = [...Object.keys(MOD), 'frlgsw'];
// what the app shows today (same order as encHTML / ppLocs)
const files = new Map(), spOf = id => { if (!files.has(id)) files.set(id, rd(`sp/${id}.json`)); return files.get(id); };
const shows = (e, sp, g) => {
  const f = sp.f[e.k] || {};
  let P = null; if (f.pl && f.pl[g]) P = f.pl[g]; else if (!(e.c === 'reg' || e.mb)) { const b = sp.f[f.enOf || String(sp.id)]; P = b && b.pl ? b.pl[g] || null : null; }
  if (P && P.length) return 'pl';
  if ((f.pln && f.pln[g]) || (e.c !== 'reg' && ((sp.f[String(sp.id)] || {}).pln || {})[g])) return 'pln'; // per game since v60.22 (app.js encHTML)
  const src = f.en ? f : (f.enOf && sp.f[f.enOf]) || f; if (src.en && src.en[g] && src.en[g].length) return 'en';
  return null;
};
const stat = {}; for (const g of GAMES) stat[g] = { pl: 0, na: 0, rest: [] };
const todo = []; // [entry, game] with nothing to show, computed before any change
for (const e of core.e) {
  if (e.c === 'gmax') continue; const sp = spOf(e.id);
  for (const g of GAMES) {
    const hx = e.k === String(e.id) && (sp.hx || []).includes(g);
    if (!((e.gb >> GI[g]) & 1) && !hx) continue;
    if (!shows(e, sp, g)) todo.push([e, g]);
  }
}
for (const [e, g] of todo) {
  if (e.mb || e.bo) continue; // after the base forms (below)
  const sp = spOf(e.id), f = sp.f[e.k], P = pl[e.k] && pl[e.k][g], T = na[e.k] && na[e.k][g];
  if (P) { (f.pl ||= {})[g] = P; stat[g].pl++; }
  else if (T) { (f.pln ||= {})[g] = T; stat[g].na++; }
  else if (e.c === 'form' && Object.keys(pl).some(k => k !== e.k && BYK[k] && BYK[k].id === e.id && pl[k][g])) { (f.pl ||= {})[g] = []; stat[g].rest.push(e.n); } // other forms only: never inherit them
  else stat[g].rest.push(e.n);
}
// Méga-Évolutions / Primo-Résurgences / changements de forme (core e.mb / e.bo): « Méga-Évolution de … » rather than nothing or the base form’s method; same wording as the app (encHTML)
for (const [e, g] of todo) {
  if (!e.mb && !e.bo) continue; const sp = spOf(e.id), f = sp.f[e.k];
  const now = shows(e, sp, g); if (now === 'pl' || now === 'en' || (f.pln && f.pln[g])) continue; // nothing at all, or the base form’s method showing through
  const b = BYK[e.mb || e.bo], de = n => n ? (/^[AEIOUYÉÈÊÂÎÔ]/i.test(n) ? 'd’' : 'de ') + n : 'de sa forme de base';
  (f.pln ||= {})[g] = e.mb ? `Méga-Évolution ${de((b || {}).n)} (avec sa Méga-Gemme)` : e.c === 'primal' ? `Primo-Résurgence ${de((b || {}).n)}` : `Changement de forme ${de((b || {}).n)}`; stat[g].na++;
}
// 2. B2W2 Pokédex texts: official Black / White text when PokéAPI’s English text is the same (Empiflor: « honeylike » / « honey-like »; Hippopotas: « ten » / « 10 », already « 10 » in French)
for (const id of [71, 449]) {
  const sp = spOf(id); if (!sp.pv || sp.pv[17] === undefined) continue;
  for (const v of [21, 22]) if (sp.pv[v] === undefined && sp.fv[v] === undefined) sp.pv[v] = sp.pv[17];
}
// 3. no description outside the regional Pokédex in games without a National Pokédex
const NONAT = { sm: [27, 28], usum: [29, 30], sw: [33, 34], sv: [40, 41] };
for (const e of core.e) {
  if (e.k !== String(e.id)) continue; const sp = spOf(e.id);
  for (const [g, vs] of Object.entries(NONAT)) {
    if (!(sp.hx || []).includes(g) || (e.gb >> GI[g]) & 1) continue;
    const f = sp.f[e.k] || {}; if (vs.some(v => (f.pv && f.pv[v] !== undefined) || (sp.pv && sp.pv[v] !== undefined) || sp.fv[v] !== undefined)) continue;
    sp.pna = [...new Set([...(sp.pna || []), ...vs])];
  }
}
for (const [id, sp] of files) wr(`sp/${id}.json`, sp);
const tot = Object.values(stat).reduce((a, s) => [a[0] + s.pl, a[1] + s.na, a[2] + s.rest.length], [0, 0, 0]);
for (const g of GAMES) { const s = stat[g]; if (s.pl || s.na || s.rest.length) console.log(`v60.22 ${g}: ${s.pl} lieux, ${s.na} méthode, reste ${s.rest.length}`); }
console.log(`v60.22 ok : ${tot[0]} fiches avec lieux, ${tot[1]} avec méthode, ${tot[2]} sans donnée ; noms Poképédia non reliés : ${Object.keys(unk).length}`);
if (process.env.V6022_REST) { fs.writeFileSync(process.env.V6022_REST, JSON.stringify({ rest: Object.fromEntries(GAMES.map(g => [g, stat[g].rest])), unk: Object.keys(unk) }, null, 1)); }
