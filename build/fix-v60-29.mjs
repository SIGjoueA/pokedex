// v60.29: précision des formes — disponibilité par jeu et textes officiels des Méga / Primo.
// Idempotent : node fix-v60-29.mjs   (V6029_REPORT=fichier.json → rapport détaillé)
// Sources (Poképédia, CC BY-NC-SA 3.0 FR ; texte brut en cache versionné build/cache/v60-29/, téléchargé une seule fois) :
//   - pages « Méga-… » / « Primo-… » : descriptions du Pokédex (Let’s Go, Soleil / Lune, Ultra-Soleil / Ultra-Lune, Légendes Z-A) ;
//   - « Méga-Pokémon » : jeu d’apparition (XY, ROSA, LPZA, LPZAmd) ;
//   - lieux déjà dans f.pl / f.en / f.rd (Poképédia + PokéAPI) pour compléter f.av.
// Recoupement : PokéAPI (encounters en) pour les ajouts Gigamax / Isolarmure / Couronneige ; table d’apparition Poképédia pour les Méga du DLC.
// Hors lot / non inventé : textes GO ou autres jeux secondaires ; Méga sans description officielle sur Poképédia (aucune en X/Y ni ROSA) ; Melmetal Gigamax (av vide, événement particulier).
// Résultat : f.pv des Méga / Primo, f.av + core.e.gb, quelques f.pl rétiquetés ou déplacés (Plaine Salutation, oiseaux de Galar, Tauros de Paldea).
import fs from 'node:fs'; import { execFileSync } from 'node:child_process';
import { descs, CODE, EXP, clean } from './pokepedia.mjs';
const D = new URL('../docs/data/', import.meta.url), C = new URL('./cache/v60-29/', import.meta.url);
const rd = f => JSON.parse(fs.readFileSync(new URL(f, D)));
const wr = (f, o) => fs.writeFileSync(new URL(f, D), JSON.stringify(o));
fs.mkdirSync(C, { recursive: true });
const fname = t => t.replace(/[ /:]/g, '_') + '.wiki';
const page = (t, opt) => { const f = new URL(fname(t), C);
  if (!fs.existsSync(f) || !fs.statSync(f).size) {
    try { fs.writeFileSync(f, execFileSync('curl', ['-sfLG', 'https://www.pokepedia.fr/index.php', '--data-urlencode', 'title=' + t, '--data', 'action=raw', '-A', 'PokedexPWA/1.0 (personal non-commercial PWA; https://github.com/SIGjoueA/pokedex; data cached)'])); }
    catch { if (opt) return ''; throw new Error('fix-v60-29 : page introuvable ' + t); }
    execFileSync('sleep', ['1.5']);
  }
  const w = fs.readFileSync(f, 'utf8'); if (/^#REDIRECT/i.test(w)) throw new Error(`fix-v60-29 : ${t} est une redirection`); return w; };
const A = s => s.replace(/’/g, "'");
const N = s => A(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const core = rd('core.json'), BYK = Object.fromEntries(core.e.map(e => [e.k, e]));
const GIDS = core.games.map(g => g.id);
const gbOf = av => GIDS.reduce((m, g, i) => m + (av.includes(g) ? 2 ** i : 0), 0);
const doubt = [], rep = { src: 'Poképédia (https://www.pokepedia.fr), CC BY-NC-SA 3.0 FR', texts: [], avAdd: [], avDel: [], retag: [], tauros: [], none: [] };

// ---------- 1. jeu d’apparition des Méga (page Méga-Pokémon) ----------
const W_LIST = page('Méga-Pokémon');
{ const m = W_LIST.match(/^==\s*Liste des Méga-Pokémon\s*==\s*$/m); if (!m) throw new Error('fix-v60-29 : liste des Méga-Pokémon introuvable');
  let body = W_LIST.slice(m.index + m[0].length); const end = body.search(/^==\s+/m); if (end >= 0) body = body.slice(0, end);
  const rows = [...body.matchAll(/\[\[(Méga-[^\]]+)\]\][\s\S]*?\{\{Abréviation\|([^}]+)\}\}/g)].map(x => [x[1], x[2]]);
  if (rows[0] && rows[0][0] === 'Méga-Gemme') rows[0][0] = 'Méga-Florizarre'; // en-tête [[Méga-Gemme]] avalé par la 1re ligne
  const counts = {}; for (const [, c] of rows) counts[c] = (counts[c] || 0) + 1;
  if (counts.XY !== 28 || counts.ROSA !== 20 || counts.LPZA !== 26 || counts.LPZAmd !== 19 || rows.length !== 93) {
    throw new Error('fix-v60-29 : décompte d’apparition inattendu ' + JSON.stringify(counts) + ' n=' + rows.length);
  }
  rep.introCounts = counts; rep.intro = Object.fromEntries(rows);
}

const DLC_TITLES = new Set(Object.entries(rep.intro).filter(([, c]) => c === 'LPZAmd').map(([n]) => n));
const keysForTitle = title => {
  const all = core.e.filter(e => (e.c === 'mega' || e.c === 'primal') && (e.n === title || e.n.startsWith(title + ' '))).map(e => e.k);
  const exact = all.filter(k => BYK[k].n === title);
  return { all, exact, keys: exact.length ? exact : all };
};
const DLC_KEYS = [...DLC_TITLES].flatMap(t => keysForTitle(t).all);
if (DLC_KEYS.length < 19) throw new Error('fix-v60-29 : clés DLC incomplètes ' + DLC_KEYS.join(','));
// Méga-Mistigrix ♀ : variante d’apparence dans sp.f, pas d’entrée core.e (une seule fiche, bouton ♀)
if (!DLC_KEYS.includes('678-female-mega')) DLC_KEYS.push('678-female-mega');
rep.dlcKeys = DLC_KEYS;

// ---------- 2. textes officiels des Méga / Primo ----------
const OFF = new Set(['XY', 'X', 'Y', 'ROSA', 'RuOSaA', 'RuO', 'SaA', 'LGPE', 'LGP', 'LGE', 'LPZA', 'LPZAmd', 'SL', 'S', 'L', 'So', 'Lu', 'USUL', 'US', 'UL']);
const FORM_HEAD = {
  'forme normale': k => k === '801-mega',
  'couleur du passe': k => k === '801-original-mega',
  'forme courbee': k => k === '978-curly-mega',
  'forme affalee': k => k === '978-droopy-mega',
  'forme raide': k => k === '978-stretchy-mega'
};
function megaDescs(w) {
  const n = w.replace(/^(=+) *Description du (?:\[\[)?Pokédex(?:\]\])? *\1 *$/m, '=== Descriptions du Pokédex ===');
  return descs(n);
}
const titles = Object.keys(JSON.parse(fs.readFileSync(new URL('pages-index.json', C), 'utf8') || '{}'))
  .filter(t => /^(Méga|Primo)-/.test(t) && !['Méga-Pokémon', 'Méga-Dimension', 'Méga-Évolution', 'Primo-Résurgence'].includes(t));
// if index missing, rebuild from cache dir + known names
const pageTitles = titles.length ? titles : [
  ...core.e.filter(e => e.c === 'mega' || e.c === 'primal').map(e => e.n.replace(/ [♂♀].*$/, '').replace(/ Forme .*$/, '').replace(/ Couleur du Passé$/, '')),
  'Primo-Kyogre', 'Primo-Groudon'
].filter((t, i, a) => a.indexOf(t) === i);

const TEXT = {}; // TEXT[formKey][ver] = official French text
for (const title of pageTitles) {
  const w = page(title, true); if (!w) continue;
  const kt = keysForTitle(title); if (!kt.all.length) { doubt.push('page sans fiche : ' + title); continue; }
  const entries = megaDescs(w).filter(x => !x.absent && x.codes.some(c => OFF.has(c)));
  if (!entries.length) { rep.none.push(title); continue; }
  for (const x of entries) {
    let ks = kt.keys;
    if (x.form) {
      const pred = FORM_HEAD[N(x.form)];
      const hit = pred ? kt.all.filter(pred) : kt.all.filter(k => {
        const e = BYK[k]; return e && (N(e.n) === N(x.form) || N(e.n).includes(N(x.form)) || (e.l && (N(e.l) === N(x.form) || N(x.form).includes(N(e.l)))));
      });
      if (!hit.length) { doubt.push(`${title} : sous-titre « ${x.form} » non relié`); continue; }
      ks = hit;
    }
    const vs = [...new Set(x.codes.filter(c => OFF.has(c)).flatMap(c => CODE[c] || []))];
    for (const k of ks) for (const v of vs) (TEXT[k] ||= {})[v] ||= x.t;
  }
}
// fallback Méga-Dimension (48) ← Légendes Z-A (47)
for (const k of Object.keys(TEXT)) if (TEXT[k][47] && TEXT[k][48] === undefined) TEXT[k][48] = TEXT[k][47];

let nText = 0, nMega = 0;
for (const [k, vers] of Object.entries(TEXT)) {
  const e = BYK[k]; if (!e) continue;
  const sp = rd(`sp/${e.id}.json`); const f = sp.f[k]; if (!f) continue;
  let ch = false;
  for (const [v, t] of Object.entries(vers)) {
    if (f.pv && f.pv[v] !== undefined) {
      // idempotent : already set (possibly to the same text)
      continue;
    }
    sp.pt ||= []; let i = sp.pt.indexOf(t); if (i < 0) { i = sp.pt.length; sp.pt.push(t); }
    (f.pv ||= {})[v] = i; ch = true; nText++;
    rep.texts.push({ k, v: +v, t });
  }
  if (ch) { wr(`sp/${e.id}.json`, sp); nMega++; }
}
// pages already applied on a previous run still count as having texts for the report
for (const [k, vers] of Object.entries(TEXT)) {
  const e = BYK[k]; if (!e) continue;
  const f = rd(`sp/${e.id}.json`).f[k];
  if (f && f.pv && Object.keys(vers).every(v => f.pv[v] !== undefined) && !rep.texts.some(x => x.k === k)) {
    // already present; note coverage only
  }
}

// ---------- 3. rétiquetage de lieux de formes mal rangés ----------
function retag(sp, k, from, to, pred, why) {
  const f = sp.f[k]; if (!f || !f.pl || !f.pl[from]) return 0;
  const keep = [], move = [];
  for (const r of f.pl[from]) (pred(r) ? move : keep).push(r);
  if (!move.length) return 0;
  if (keep.length) f.pl[from] = keep; else delete f.pl[from];
  f.pl[to] = [...(f.pl[to] || []), ...move.filter(r => !(f.pl[to] || []).some(x => x[0] === r[0] && x[1] === r[1]))];
  if (!f.pl[to].length) delete f.pl[to];
  if (!Object.keys(f.pl).length) delete f.pl;
  for (const r of move) rep.retag.push({ k, from, to, row: r, why });
  return move.length;
}

// ---------- 4. Tauros de Paldea : lignes « forme Paldea … » de la fiche de Kanto ----------
{ const sp = rd('sp/128.json'), base = sp.f['128'];
  const MAP = {
    '128-paldea-combat-breed': /forme Paldea Combative|\bforme Paldea\b(?! (Combative|Flamboyante|Aquatique))/,
    '128-paldea-blaze-breed': /forme Paldea Flamboyante/,
    '128-paldea-aqua-breed': /forme Paldea Aquatique/
  };
  for (const g of Object.keys(base.pl || {})) {
    const keep = [];
    for (const r of base.pl[g]) {
      const txt = (r[0] || '') + ' ' + (r[1] || '');
      let dest = null;
      if (/forme Paldea Combative/.test(txt)) dest = '128-paldea-combat-breed';
      else if (/forme Paldea Flamboyante/.test(txt)) dest = '128-paldea-blaze-breed';
      else if (/forme Paldea Aquatique/.test(txt)) dest = '128-paldea-aqua-breed';
      else if (/\bforme Paldea\b/.test(txt)) { dest = '128-paldea-combat-breed'; doubt.push(`Tauros « ${r[0]} » : « forme Paldea » sans race, attribué à la Race Combative`); }
      if (!dest) { keep.push(r); continue; }
      const f = sp.f[dest]; const row = [r[0], (r[1] || '').replace(/forme Paldea(?: Combative| Flamboyante| Aquatique)?(?: · )?/g, '').replace(/^ · /, '').trim()];
      if (!row[1]) row[1] = 'Sauvage';
      (f.pl ||= {}); (f.pl[g] ||= []);
      if (!f.pl[g].some(x => x[0] === row[0] && x[1] === row[1])) f.pl[g].push(row);
      rep.tauros.push({ from: '128', to: dest, g, row });
    }
    if (keep.length) base.pl[g] = keep; else delete base.pl[g];
  }
  wr('sp/128.json', sp);
}

// ---------- 5. rétiquetage Isolarmure / Couronneige ----------
for (const e of core.e) {
  if (!e.c) continue;
  const sp = rd(`sp/${e.id}.json`); const f = sp.f[e.k]; if (!f) continue;
  let n = 0;
  n += retag(sp, e.k, 'sw', 'swisle', r => r[0] === 'Plaine Salutation' || /Isolarmure/.test((r[0] || '') + ' ' + (r[1] || '')), 'Isolarmure indiqué dans le lieu');
  n += retag(sp, e.k, 'sw', 'swcrown', r => /Couronneige/.test((r[0] || '') + ' ' + (r[1] || '')), 'Couronneige indiqué dans le lieu');
  if (e.k === '79-galar') n += retag(sp, e.k, 'sw', 'swisle', r => /Gare de Brasswick/.test(r[0] || ''), 'départ du DLC Isolarmure (Gare de Brasswick)');
  if (e.k === '145-galar') n += retag(sp, e.k, 'sw', 'swcrown', r => /Terres Sauvages/.test((r[0] || '') + ' ' + (r[1] || '')), 'quête des oiseaux de la Couronneige, même si le lieu est aux Terres Sauvages');
  if (n) wr(`sp/${e.id}.json`, sp);
}
if (rep.retag.some(x => x.k === '145-galar')) {
  doubt.push('Électhor de Galar : rencontre aux Terres Sauvages, mais la quête exige le DLC Couronneige — lieu rangé sous Couronneige');
}

// ---------- 6. disponibilité (av + gb) ----------
const TRANSFER = /À transférer par (HOME|la Banque Pokémon|Pokémon HOME|le Poké Fret|le Bloc Temporel)/;
function evidence(f) {
  const ev = {};
  for (const [g, rows] of Object.entries(f.pl || {})) if (rows && rows.length) (ev[g] ||= new Set()).add('pl');
  for (const [g, rows] of Object.entries(f.en || {})) if (rows && rows.length) (ev[g] ||= new Set()).add('en');
  for (const [g, rows] of Object.entries(f.rd || {})) if (rows && rows.length) (ev[g] ||= new Set()).add('rd');
  for (const [g, t] of Object.entries(f.pln || {})) if (t && !TRANSFER.test(t)) (ev[g] ||= new Set()).add('pln');
  return ev;
}
const changedIds = new Set();
for (const e of core.e) {
  if (!e.c) continue;
  const sp = rd(`sp/${e.id}.json`); const f = sp.f[e.k]; if (!f) continue;
  const av = [...(f.av || [])];
  let ch = false;
  // DLC-only megas : pas dans le jeu de base Z-A
  if (DLC_KEYS.includes(e.k) && av.includes('za')) {
    const i = av.indexOf('za'); av.splice(i, 1); ch = true;
    rep.avDel.push({ k: e.k, g: 'za', why: 'Méga exclusive au DLC Méga-Dimension (Poképédia, apparition LPZAmd)' });
  }
  if (DLC_KEYS.includes(e.k) && !av.includes('zadlc')) { av.push('zadlc'); ch = true; rep.avAdd.push({ k: e.k, g: 'zadlc', ev: ['intro-LPZAmd'] }); }
  const ev = evidence(f);
  // Les fiches « femelle d’apparence » (c === 'sex') suivent la forme de base : on n’ajoute pas un jeu qui n’est pas déjà sur la fiche principale.
  if (e.c !== 'sex') {
    for (const g of Object.keys(ev)) {
      if (!GIDS.includes(g)) continue;
      if (!av.includes(g)) { av.push(g); ch = true; rep.avAdd.push({ k: e.k, g, ev: [...ev[g]] }); }
    }
  }
  if (!ch) continue;
  f.av = GIDS.filter(g => av.includes(g)); // keep game order
  e.gb = gbOf(f.av);
  wr(`sp/${e.id}.json`, sp);
  changedIds.add(e.k);
}
wr('core.json', core);

// Variante ♀ de Méga-Mistigrix (pas dans core.e) : mêmes jeux et mêmes textes que le ♂
{ const sp = rd('sp/678.json'), male = sp.f['678-male-mega'], fem = sp.f['678-female-mega'];
  if (male && fem) {
    const av = [...(male.av || [])];
    if (JSON.stringify(fem.av || []) !== JSON.stringify(av) || JSON.stringify(fem.pv || null) !== JSON.stringify(male.pv || null)) {
      const prev = [...(fem.av || [])];
      fem.av = av;
      if (male.pv) fem.pv = { ...male.pv };
      if (prev.includes('za') && !av.includes('za')) rep.avDel.push({ k: '678-female-mega', g: 'za', why: 'Méga exclusive au DLC Méga-Dimension (même fiche que Méga-Mistigrix ♂)' });
      wr('sp/678.json', sp);
    }
    // core.e.fe.gb de Méga-Mistigrix doit suivre l’av de la variante ♀
    const host = core.e.find(x => x.k === '678-male-mega');
    if (host && host.fe) { const gbf = gbOf(fem.av || []); if (host.fe.gb !== gbf) { host.fe.gb = gbf; wr('core.json', core); } }
  }
}

rep.counts = {
  megaPagesWithText: Object.keys(TEXT).length,
  textsApplied: nText,
  formsTextTouched: nMega,
  avAdd: rep.avAdd.length,
  avDel: rep.avDel.length,
  retag: rep.retag.length,
  tauros: rep.tauros.length,
  none: rep.none,
  doubt
};
fs.writeFileSync(new URL('report.json', C), JSON.stringify(rep, null, 2));
if (process.env.V6029_REPORT) fs.writeFileSync(process.env.V6029_REPORT, JSON.stringify(rep, null, 2));
console.log(`fix-v60-29 : ${nText} textes officiels ajoutés sur ${nMega} fiches Méga/Primo ; ${rep.avAdd.length} ajouts d’av, ${rep.avDel.length} retraits (Méga DLC hors Z-A de base) ; ${rep.retag.length} lieux rétiquetés ; Tauros de Paldea : ${rep.tauros.length} lignes déplacées ; cas douteux : ${doubt.length}`);
if (rep.none.length) console.log('  pages sans texte officiel retenu :', rep.none.join(', '));
if (doubt.length) console.log('  douteux :\n  - ' + doubt.join('\n  - '));
