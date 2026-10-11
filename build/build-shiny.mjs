// v31: shiny block data. Inputs (research, tracked): build/shiny/shiny-methods.json (rates per game, Bulbapedia / Poképédia / RotomLabs / Serebii)
// and build/shiny/shiny-locks.json (shiny locks per game, Poképédia + Bulbapedia). Output: docs/data/shiny.json (compact).
//   m[game] = { e: has shinies, b: base rate, c: [how to get the Shiny Charm, effect] | null, n: note, r: [[method, condition, without charm, with charm | null, charm applies (0/1), note]] }
//   l[game] = { formKey | '#'+speciesId : [ 't' total | 'p' partial, locked encounter, how to get it shiny elsewhere ] }   ('#id' = every form of the species)
//   g[game] = general rules (text), ok[game] = species ids explicitly shiny-able despite the general rule (Méga-Dimension), v[game] = verification note
// Re-runnable: node build-shiny.mjs
import fs from 'node:fs'; import path from 'node:path';
const HERE = path.dirname(new URL(import.meta.url).pathname), DOCS = path.join(HERE, '../docs');
const M = JSON.parse(fs.readFileSync(path.join(HERE, 'shiny/shiny-methods.json'), 'utf8')), L = JSON.parse(fs.readFileSync(path.join(HERE, 'shiny/shiny-locks.json'), 'utf8'));
const core = JSON.parse(fs.readFileSync(path.join(DOCS, 'data/core.json'), 'utf8')).e;
const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[’']/g, ' ').replace(/\b(forme|de|d|du|la|le)\b/g, ' ').replace(/[^a-z0-9%]+/g, ' ').trim();
const out = { m: {}, l: {}, g: {}, ok: {}, v: {} }, unmatched = [];
for (const [g, v] of Object.entries(M.jeux)) {
  out.m[g] = { e: v.existe ? 1 : 0, b: v.taux_base || null, c: v.charme_chroma ? [v.charme_chroma.obtention, v.charme_chroma.effet] : null, n: [v.note, v.acces].filter(Boolean).join(' · ') || null,
    r: (v.methodes || []).map(x => [x.nom, x.condition || '', x.chance_max, x.chance_max_charme || null, x.charme ? 1 : 0, x.note || null]) };
}
for (const [g, v] of Object.entries(L.jeux)) {
  const lk = {}, rules = [];
  for (const e of v.entrees || []) {
    if (!e.id) { if (e.obtention) rules.push(e.obtention.replace(/\s*:\s*$/, '')); continue; }
    const m = /^(.*?)\s*\((.+)\)\s*$/.exec(e.nom || ''); let key = '#' + e.id;
    if (m) {
      const q = norm(m[2]), forms = core.filter(x => x.id === e.id && x.c);
      const NOFORM = ['partenaire', 'cosplayeur']; // not a form of the app: the lock concerns one encounter only
      const hit = NOFORM.includes(q) ? null : q === 'gigamax' ? forms.find(x => x.c === 'gmax') : forms.find(x => norm(x.l) === q) || forms.find(x => norm(x.l).includes(q) || q.includes(norm(x.l)) && norm(x.l).length > 2);
      if (hit) key = hit.k; else { unmatched.push(`${g}: ${e.nom}`); if (NOFORM.includes(q)) e.statut = 'lock_partiel'; }
    }
    const st = e.statut === 'lock_partiel' ? 'p' : 't';
    const prev = lk[key]; const what = [e.nom, (e.obtention || '').replace(/\s*;\s*$/, '')].filter(Boolean).join(' — ');
    if (prev) { prev[1] += ' ; ' + (prev[1].startsWith(e.nom + ' — ') ? (e.obtention || '').replace(/\s*;\s*$/, '') : what); } else lk[key] = [st, what, e.chromatique_ailleurs || ''];
  }
  out.l[g] = lk; if (rules.length || v.regle_generale) out.g[g] = [v.regle_generale, ...rules].filter(Boolean).map(r => r.replace(/,? tels que(, entre autres)?\s*$/, '').replace(/\s*;\s*$/, '.').replace(/([^.])$/, '$1.'));
  if (v.chromatiques_autorises) out.ok[g] = v.chromatiques_autorises;
}
// Cross-check with Bulbapedia « List of unobtainable Shiny Pokémon » (build/shiny/bp-unobtainable.wiki, fetched 2026-10-11):
//  ✔ in a game  → a « total » lock of the research becomes partial (the locked encounter is one of several, e.g. event Ho-Oh vs Ho-Oh in Ultra-Soleil)
//  ~ / ✘ for a generation (no ✔) → total lock added in that generation's games when the research has none (« distribution / transfert seulement »).
{
  const W = fs.readFileSync(path.join(HERE, 'shiny/bp-unobtainable.wiki'), 'utf8').split('===In Generations I and II===')[0];
  const AB = { RGBY: ['rb', 'y'], GSC: ['gs', 'c'], C: ['c'], RSE: ['rs', 'e'], R: ['rs'], S3: ['rs'], E: ['e'], FRLG: ['frlg'], HGSS: ['hgss'], HG: ['hgss'], SS: ['hgss'], PT: ['pt'], DPPT: ['dp', 'pt'], D: ['dp'], P: ['dp'],
    B2W2: ['b2w2'], B2: ['b2w2'], W2: ['b2w2'], B: ['bw'], W: ['bw'], BW: ['bw'], XY: ['xy'], OR: ['oras'], AS: ['oras'], ORAS: ['oras'], USUM: ['usum'], US: ['usum'], UM: ['usum'], SMUSUM: ['sm', 'usum'], SM: ['sm'], PE: ['lgpe'],
    CT: ['swcrown'], IOA: ['swisle'], SWSH: ['sw'], BDSP: ['bdsp'], BD: ['bdsp'], SP: ['bdsp'], LA: ['la'], SV: ['sv', 'svmask', 'svdisk'], MD: ['zadlc'], ZA: ['za'] };
  const games = JSON.parse(fs.readFileSync(path.join(DOCS, 'data/core.json'), 'utf8')).games, GEN = [[1, 2], [3], [4], [5], [6], [7], [8], [9]];
  const genGames = i => games.filter(x => GEN[i].includes(x.g)).map(x => x.id);
  const FORMQ = { 'Galarian Form': 'galar', Bloodmoon: 'bloodmoon', 'Eternal Flower': 'eternal', '[[Gigantamax]]': 'gmax', 'Chest Form': '', 'Roaming Form': null };
  let up = 0, add = 0; const log = [];
  for (const row of W.split(/\n\|-[^\n]*\n/).slice(1)) {
    const lines = row.split('\n').filter(l => l.startsWith('|')); if (lines.length < 3) continue;
    const nm = /\{\{p\|([^}|]+)/i.exec(lines[1]); if (!nm) continue;
    const sm = /<small>(.*?)<\/small>/.exec(lines[1]); if (/Partner|Cosplay|in a cap|Pattern|Battle Bond/i.test(lines[0] + lines[1]) && !/\{\{p\|Pikachu\}\}<br><small>Partner/.test('')) { if (/Partner|Cosplay|cap|Pattern|Battle Bond/i.test(lines[1])) continue; }
    const base = core.find(x => !x.c && x.en === nm[1].trim()); if (!base) { log.push('?' + nm[1]); continue; }
    let key = String(base.id); if (sm) { const q = FORMQ[sm[1]]; if (q === undefined || q === null) continue; if (q) { const f = core.find(x => x.id === base.id && x.k.endsWith('-' + q)); if (!f) continue; key = f.k; } }
    const cells = []; for (const c of lines.slice(2).join('||').replace(/^\|\s*/, '').split('||')) { const cs = /colspan=(\d+)/.exec(c); if (cs && /#999/.test(c)) { for (let i = 0; i < +cs[1]; i++) cells.push(null); } else cells.push(c.trim()); }
    cells.forEach((c, i) => {
      if (c == null || i > 7) return; const gg = genGames(i);
      if (/\{\{yes\}\}/i.test(c)) {
        const abs = [...c.matchAll(/gameabbrev(\d)\|([A-Za-z0-9]+)/gi)].map(m => (m[2].toUpperCase() === 'S' && m[1] === '3') ? 'S3' : m[2].toUpperCase());
        const ok = abs.length ? abs.flatMap(a => AB[a] || []) : gg;
        for (const g of ok) for (const k of [key, '#' + base.id]) if (out.l[g] && out.l[g][k] && out.l[g][k][0] === 't' && (k === key || !sm)) { out.l[g][k][0] = 'p'; up++; log.push(`partiel ${g} ${k}`); }
      } else if (c === '~' || /\{\{no\}\}/i.test(c)) {
        for (const g of gg) { out.l[g] ||= {}; const k = sm ? key : '#' + base.id; if (!out.l[g][k] && !(out.l[g][key])) { out.l[g][k] = ['t', c === '~' ? 'Aucune rencontre chromatique possible en jeu' : 'Ne peut pas être chromatique', c === '~' ? 'Chromatique seulement via distribution officielle ou transfert' : '']; add++; } }
      }
    });
  }
  console.log(`Bulbapedia cross-check: ${up} locks → partial, ${add} locks added`); fs.writeFileSync(path.join(HERE, 'shiny/crosscheck.log'), log.join('\n'));
}
// Entries the research flagged « à vérifier », checked on 2026-10-11 against Bulbapedia « List of unobtainable Shiny Pokémon »:
// Let’s Go: partner Pikachu / Évoli ✘, Mew (Poké Ball Plus) ✘ — confirmed; Meltan / Melmetal only shiny from GO — confirmed (note 21–22).
// Méga-Dimension: shiny-able legendaries ✔ MD = Latias, Latios, Cobalion, Terrakion, Viridium, Mordudor (coffre), Gromago — confirmed; other scripted encounters never shiny (rule since Légendes Arceus).
out.v.lgpe = 'Vérifié le 11/10/2026 (Bulbapedia, liste non exhaustive)'; out.v.zadlc = 'Vérifié le 11/10/2026 (Bulbapedia, RotomLabs) ; autres rencontres scénarisées : règle générale';
// v31: Rouge Feu / Vert Feuille (Switch) = the GBA game (same rates, no Charme Chroma, same locks)
if (out.m.frlg) { out.m.frlgsw = out.m.frlg; out.l.frlgsw = out.l.frlg || {}; if (out.g.frlg) out.g.frlgsw = out.g.frlg; }
out.src = 'Bulbapedia (CC BY-NC-SA 2.5), Poképédia (CC BY-NC-SA 3.0), RotomLabs, Serebii';
fs.writeFileSync(path.join(DOCS, 'data/shiny.json'), JSON.stringify(out));
console.log('shiny.json', fs.statSync(path.join(DOCS, 'data/shiny.json')).size, 'bytes; games', Object.keys(out.m).length, '; locks', Object.values(out.l).reduce((a, x) => a + Object.keys(x).length, 0), '; unmatched form qualifiers (→ whole species):', unmatched.length);
console.log(unmatched.join('\n'));
