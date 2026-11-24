// v60.23: où trouver la Méga-Gemme / la Gemme Bleue / la Gemme Rouge de chaque Méga / Primo, jeu par jeu (X / Y, ROSA, Soleil / Lune, USUL,
// Let’s Go, Légendes Pokémon : Z-A). Source : Poképédia (CC BY-NC-SA 3.0 FR), section « Localisation(s) » de la page de chaque objet
// (texte brut en cache versionné : build/cache/v60-23/<titre>.wiki, téléchargé une seule fois ; Modèle:Mission pour les noms de missions Z-A).
// Résultat : docs/data/mega-stones.json → loc[<nom FR de l’objet>][<jeu>] = [[version ('' = les deux), texte]] (+ « Draco Ascension » pour Méga-Rayquaza).
// Seul ce que Poképédia écrit est repris (wikitexte nettoyé, sous-listes de distributions omises) ; sans section claire → rien (texte actuel
// « avec sa Méga-Gemme » conservé). Corrige aussi les noms officiels des objets de Primo : Gemme Bleue / Gemme Rouge (Orbe Bleu / Rouge = Gén. III–IV).
// Idempotent : node fix-v60-23.mjs   (V6023_REPORT=fichier.json → couverture détaillée)
import fs from 'node:fs'; import { execFileSync } from 'node:child_process';
import { clean } from './pokepedia.mjs';
const D = new URL('../docs/data/', import.meta.url), C = new URL('./cache/v60-23/', import.meta.url);
const rd = f => JSON.parse(fs.readFileSync(new URL(f, D))), wr = (f, o) => fs.writeFileSync(new URL(f, D), JSON.stringify(o));
fs.mkdirSync(C, { recursive: true });
const page = t => { const f = new URL(t.replace(/[ /:]/g, '_') + '.wiki', C);
  if (!fs.existsSync(f) || !fs.statSync(f).size) { fs.writeFileSync(f, execFileSync('curl', ['-sfLG', 'https://www.pokepedia.fr/index.php', '--data-urlencode', 'title=' + t, '--data', 'action=raw'])); execFileSync('sleep', ['0.3']); }
  const w = fs.readFileSync(f, 'utf8'); if (/^#REDIRECT/i.test(w)) throw new Error(`fix-v60-23 : ${t} est une redirection (${w.trim()})`); return w; };
const ms = rd('mega-stones.json'), core = rd('core.json'), GI = Object.fromEntries(core.games.map((g, i) => [g.id, i]));
// official French names of the Primal items since ROSA (Poképédia: « Orbe Bleu » / « Orbe Rouge » before ROSA)
const PRIMO = { '382-primal': 'Gemme Bleue', '383-primal': 'Gemme Rouge' };
for (const [k, n] of Object.entries(PRIMO)) if (ms.stones[k]) ms.stones[k].fr = n;
// Méga-Heatran (Z-A Méga-Dimension): its stone had no entry (generic « Méga-Gemme »). No « item » field: the gem mark keeps its key (gemId).
if (!ms.stones['485-mega']) ms.stones['485-mega'] = { fr: 'Heatranite', img: ms.fallback.img };
// Poképédia game codes → [game id, version label ('' = both versions)]
const GC = { XY: [['xy', '']], X: [['xy', 'X']], Y: [['xy', 'Y']], ROSA: [['oras', '']], RuO: [['oras', 'Rubis Oméga']], SaA: [['oras', 'Saphir Alpha']],
  SL: [['sm', '']], S: [['sm', 'Soleil']], L: [['sm', 'Lune']], USUL: [['usum', '']], US: [['usum', 'Ultra-Soleil']], UL: [['usum', 'Ultra-Lune']],
  LGPE: [['lgpe', '']], LGP: [['lgpe', 'Let’s Go, Pikachu']], LGE: [['lgpe', 'Let’s Go, Évoli']], LPZA: [['za', '']], 'Légendes Pokémon : Z-A': [['za', '']],
  'Pokémon Rubis Oméga': [['oras', 'Rubis Oméga']], 'Pokémon Saphir Alpha': [['oras', 'Saphir Alpha']], 'Pokémon X': [['xy', 'X']], 'Pokémon Y': [['xy', 'Y']] };
const GCI = Object.fromEntries(Object.entries(GC).map(([c, v]) => [c.toLowerCase(), v]));
// game names inside sentences (« échange avec {{Jeu|USUL}} », « {{Sup|RuO}} »)
const GN = { XY: 'X / Y', X: 'X', Y: 'Y', ROSA: 'Rubis Oméga / Saphir Alpha', RuO: 'Rubis Oméga', SaA: 'Saphir Alpha', SL: 'Soleil / Lune', S: 'Soleil', L: 'Lune',
  USUL: 'Ultra-Soleil / Ultra-Lune', US: 'Ultra-Soleil', UL: 'Ultra-Lune', LGPE: 'Let’s Go, Pikachu / Évoli', LPZA: 'Légendes Pokémon : Z-A', Champions: 'Pokémon Champions',
  RSE: 'Rubis / Saphir / Émeraude', HGSS: 'Or HeartGold / Argent SoulSilver' };
const GNI = Object.fromEntries(Object.entries(GN).map(([c, v]) => [c.toLowerCase(), v]));
// Z-A missions: {{Mission|P010|LPZA}} → « mission principale 10 : « … » » (Modèle:Mission, section LPZA)
const MIS = {}; { const w = page('Modèle:Mission'), i = w.indexOf('| LPZA = {{#switch:'); if (i < 0) throw new Error('fix-v60-23 : Modèle:Mission sans section LPZA');
  for (const m of w.slice(i).matchAll(/^\| ([A-Z]+\d+) = \[\[[^|\]]*\|\{\{#ifeq:.*?\| mission \}\} ([^\]]+)\]\] : (« [^»\n]+ »)/gm)) if (!MIS[m[1]]) MIS[m[1]] = `mission ${m[2]} : ${m[3]}`; }
const doubt = []; // what could not be read cleanly
const PH = "(?:(?:sur|dans|à|au|aux) (?:la |le |l'|les )?)?\\[\\[[^\\]]+\\]\\]", ALT = new RegExp(`(${PH})\\{\\{Sup\\|(\\w+)\\}\\}/(${PH})\\{\\{Sup\\|(\\w+)\\}\\}`, 'g');
function text(s, where, g) {
  // « sur la [[Vieille Route]]{{Sup|SL}}/dans la [[Plaine de Poni]]{{Sup|USUL}} » under a « SL et USUL » heading → the part of this game only
  s = s.replace(ALT, (m, a, ca, b, cb) => { const ga = (GCI[ca.toLowerCase()] || [[]])[0][0], gb = (GCI[cb.toLowerCase()] || [[]])[0][0];
    return ga && gb && ga !== gb ? (ga === g ? a : gb === g ? b : m) : m; });
  s = s.replace(/\{\{Mission\|([A-Z]+\d+)\|LPZA\}\}/gi, (m, c) => MIS[c] || (doubt.push(`${where} : mission ${c} inconnue`), `mission ${c}`));
  s = s.replace(/\{\{Sup\|([^{}|]+)\}\}/g, (m, c) => GNI[c.toLowerCase()] ? ` (${GNI[c.toLowerCase()]})` : '');
  s = s.replace(/\{\{(?:Jeu|jeu|Abréviation|abréviation)\|([^{}|]+)\}\}/g, (m, c) => GNI[c.toLowerCase()] || (doubt.push(`${where} : jeu ${c}`), c));
  s = s.replace(/\{\{[Pp]\}\}/g, '₽').replace(/\[\[(?:Fichier|File|Image):[^\]]*\]\]/g, '');
  s = clean(s).replace(/^Peut-être achetée/, 'Peut être achetée').replace(/\s*:\s*$/, '').replace(/ ;$/, '').replace(/\s+\./g, '.');
  s = s.replace(/'/g, '’').replace(/« /g, '«\u00a0').replace(/ »/g, '\u00a0»').replace(/ ([:;!?])/g, '\u00a0$1'); // no line break inside « … » / before « : »
  if (s && !/[.!?»)]$/.test(s)) s += '.';
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}
// « == Localisation(s) == » → { game: [[version, text]] }
function locs(w, title) {
  const m = w.match(/^==\s*Localisations?\s*==\s*$/m); if (!m) return null;
  let body = w.slice(m.index + m[0].length); const end = body.search(/^==[^=]/m); if (end >= 0) body = body.slice(0, end);
  const out = {}; let cur = null, sub = false;
  const head = h => { const cs = [...h.matchAll(/\{\{[Jj]eu\|([^{}|]+)\}\}|''\[\[([^\]|]+)\]\]''/g)].map(x => x[1] || x[2]);
    return cs.length ? cs.flatMap(c => GCI[c.toLowerCase()] || []) : null; };
  const add = (gs, raw) => { for (const [g, v] of gs) { const t = text(raw, title, g); if (t) (out[g] ||= []).push([v, t]); } };
  for (let line of body.split('\n')) {
    line = line.trim(); if (!line || /^\{\{(incomplet|clear)\}\}$/i.test(line) || /^\[\[(Fichier|File):/.test(line)) continue;
    if (/^=+/.test(line)) { const gs = head(line); cur = gs && gs.length ? gs : null; continue; } // « === Sixième génération === » / « ==== Dans {{Jeu|XY}} ==== »
    if (/^;/.test(line)) { const gs = head(line); cur = gs && gs.length ? gs : null; continue; }
    if (/^\*\*/.test(line)) { sub = true; continue; } // nested distribution details: left out
    let t = line.replace(/^\*\s*/, '');
    if (!cur) { // orb pages: « * Dans {{jeu|SL}} et {{Jeu|USUL}}, la Gemme Bleue … »
      const d = t.match(/^Dans ((?:\{\{[Jj]eu\|[^}]+\}\}|''\[\[[^\]]+\]\]'')(?: et (?:\{\{[Jj]eu\|[^}]+\}\}|''\[\[[^\]]+\]\]''))*), (.*)$/);
      if (d) { const gs = head(d[1]); if (gs && gs.length) add(gs, d[2]); }
      continue; }
    add(cur, t);
  }
  void sub; return out;
}
const loc = {}, names = new Set(Object.values(ms.stones).map(s => s.fr).filter(Boolean));
for (const n of [...names].sort()) { const l = locs(page(n), n); if (l && Object.keys(l).length) loc[n] = l; }
// Méga-Rayquaza: no Méga-Gemme in Gén. VI–VII, the move Draco Ascension (its name in these games; « Draco-Ascension » since Épée / Bouclier)
{ const w = page('Draco-Ascension');
  if (!/En sixième et septième génération, avoir cette capacité dans son \[\[moveset\]\] permet à Rayquaza de \[\[Méga-Évolution\|méga-évoluer\]\]/.test(w)
    || !/\[\[Amaryllis\]\] puis sa grand-mère dans \{\{Jeu\|ROSA\}\}, un vieil homme au \[\[Centre Pokémon\]\] du \[\[Village Flottant\]\] \(dans \{\{Jeu\|SL\}\} et \{\{Jeu\|USUL\}\}\)/.test(w))
    throw new Error('fix-v60-23 : page Draco-Ascension modifiée, texte à revoir');
  const t = 'Pas de Méga-Gemme : Rayquaza méga-évolue s’il connaît la capacité Draco Ascension';
  loc['Draco Ascension'] = { oras: [['', `${t}, enseignée par Amaryllis puis par sa grand-mère.`]], sm: [['', `${t}, enseignée par un vieil homme au Centre Pokémon du Village Flottant.`]], usum: [['', `${t}, enseignée par un vieil homme au Centre Pokémon du Village Flottant.`]] }; }
// Méga-Rayquaza « Où le trouver » (v60.22 wrote « avec sa Méga-Gemme »): the move instead, where Poképédia says so (Gén. VI–VII)
{ const f = new URL('sp/384.json', D), sp = JSON.parse(fs.readFileSync(f)), m = sp.f['384-mega']; let n = 0;
  for (const g of Object.keys(loc['Draco Ascension'])) { const t = 'Méga-Évolution de Rayquaza (avec la capacité Draco Ascension)'; if (m && m.pln && m.pln[g] && m.pln[g] !== t) { m.pln[g] = t; n++; } }
  if (n) fs.writeFileSync(f, JSON.stringify(sp)); }
// Let’s Go: Méga sheets showed « Aucune rencontre sauvage répertoriée par PokéAPI » (v60.22 did not cover lgpe) → same generated method as the other games
{ const files = new Map(); let n = 0; const de = x => x ? (/^[AEIOUYÉÈÊÂÎÔ]/i.test(x) ? 'd’' : 'de ') + x : 'de sa forme de base', BYK = Object.fromEntries(core.e.map(e => [e.k, e]));
  for (const e of core.e) { if (!e.mb || !((e.gb >> GI.lgpe) & 1)) continue;
    if (!files.has(e.id)) files.set(e.id, JSON.parse(fs.readFileSync(new URL(`sp/${e.id}.json`, D))));
    const f = files.get(e.id).f[e.k]; if (!f || (f.pl && f.pl.lgpe) || (f.en && f.en.lgpe && f.en.lgpe.length)) continue;
    const t = `Méga-Évolution ${de((BYK[e.mb] || {}).n)} (avec sa Méga-Gemme)`; if ((f.pln ||= {}).lgpe !== t) { f.pln.lgpe = t; n++; } }
  if (n) for (const [id, sp] of files) fs.writeFileSync(new URL(`sp/${id}.json`, D), JSON.stringify(sp)); }
ms.loc = loc; ms.locSrc = 'Poképédia (CC BY-NC-SA 3.0 FR), pages des objets';
wr('mega-stones.json', ms);
// coverage: every Méga / Primo form of each tracked game
const GAMES = ['xy', 'oras', 'sm', 'usum', 'lgpe', 'za'], cov = {};
for (const g of GAMES) cov[g] = { ok: 0, none: [] };
for (const e of core.e) { if (!(e.mb || e.c === 'primal')) continue;
  const n = e.id === 384 && e.c === 'mega' ? 'Draco Ascension' : (ms.stones[e.k] || {}).fr;
  for (const g of GAMES) { if (!((e.gb >> GI[g]) & 1)) continue; if (n && loc[n] && loc[n][g]) cov[g].ok++; else cov[g].none.push(e.k); } }
for (const g of GAMES) console.log(`v60.23 ${g}: ${cov[g].ok} formes avec lieu de l’objet, ${cov[g].none.length} sans${cov[g].none.length ? ' (' + cov[g].none.join(', ') + ')' : ''}`);
console.log(`v60.23 ok : ${Object.keys(loc).length} objets avec lieux ; doutes : ${doubt.length}${doubt.length ? ' — ' + doubt.join(' ; ') : ''}`);
if (process.env.V6023_REPORT) fs.writeFileSync(process.env.V6023_REPORT, JSON.stringify({ cov, doubt, loc }, null, 1));
