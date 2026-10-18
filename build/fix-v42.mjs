// v42: audit v33 « Amélioration » — lieux des jeux GBA / DS (RS, É, RF/VF, DP, Pt, HGSS, NB, N2B2) pour les espèces sans rencontre PokéAPI,
// depuis Poképédia (Module:Localisations/Données/<jeu> + /Indisponibles), cache build/cache/v42 (fetch une seule fois). Idempotent.
import fs from 'node:fs'; import { execFileSync } from 'node:child_process';
import { parseLua, recLine, clean } from './pokepedia.mjs';
const D = new URL('../docs/data/', import.meta.url), C = new URL('./cache/v42/', import.meta.url);
const rd = f => JSON.parse(fs.readFileSync(new URL(f, D))), wr = (f, o) => fs.writeFileSync(new URL(f, D), JSON.stringify(o));
const MOD = { rs: 'Rubis et Saphir', e: 'Émeraude', frlg: 'Rouge Feu et Vert Feuille', dp: 'Diamant et Perle', pt: 'Platine', hgss: 'Or HeartGold et Argent SoulSilver', bw: 'Noir et Blanc', b2w2: 'Noir 2 et Blanc 2' };
fs.mkdirSync(C, { recursive: true });
const get = t => { const f = new URL(t.replace(/[ /]/g, '_') + '.lua', C);
  if (!fs.existsSync(f) || !fs.statSync(f).size) fs.writeFileSync(f, execFileSync('curl', ['-sfG', 'https://www.pokepedia.fr/index.php', '--data-urlencode', 'title=Module:Localisations/Données/Pokémon ' + t, '--data', 'action=raw']));
  return parseLua(fs.readFileSync(f, 'utf8')); };
const A = s => s.replace(/’/g, "'");
const core = rd('core.json'), GI = {}; core.games.forEach((g, i) => GI[g.id] = i);
const byName = new Map(core.e.filter(e => !e.c).map(e => [A(e.n), e.id]));
const parse = mon => { const m = mon.match(/^(.*?)(?: (?:forme|sexe|nom)\(([^)]*)\))?$/); return [byName.get(A(m[1].trim())), m[2] || '', /sexe\(/.test(mon)]; };
const pl = {}, na = {}; // pl[id][g] = [[place, line]], na[id][g] = text
for (const [g, t] of Object.entries(MOD)) {
  for (const [place, mons] of Object.entries(get(t))) {
    const P = clean(place.replace(/[^@|{}]*\|/g, '').replace(/@/g, ' — ').replace(/<sup>([^<]*)<\/sup>/g, '$1'));
    for (const [mon, recs] of Object.entries(mons)) {
      const [id, form, sex] = parse(mon); if (!id || (form && !sex)) continue; // other forms (Pichu Troizépi…) never fill the base entry
      const pre = sex ? (form === 'm' ? 'mâle' : form === 'f' ? 'femelle' : form) : '';
      for (const r of (Array.isArray(recs) ? recs : [recs])) {
        const line = [pre, (recLine(g, r) || 'Sauvage').replace(/\s*\([^()]*\bavec\s*\)/g, '')].filter(Boolean).join(' · '), L = ((pl[id] ||= {})[g] ||= []);
        if (!L.some(x => x[0] === P && x[1] === line)) L.push([P, line]);
      }
    }
  }
  for (const [mon, txt] of Object.entries(get(t + '/Indisponibles'))) {
    const [id, form] = parse(mon); if (!id || form || typeof txt !== 'string') continue;
    const tx = clean(txt); if (/^À compléter/i.test(tx)) continue; (na[id] ||= {})[g] = tx;
  }
}
const stat = {}; for (const g in MOD) stat[g] = { pl: 0, na: 0, rest: [] };
const files = new Map();
for (const e of core.e) {
  if (e.c || e.mb || e.bo) continue;
  for (const g in MOD) {
    if (!((e.gb >> GI[g]) & 1)) continue;
    const sp = files.get(e.id) || rd(`sp/${e.id}.json`); files.set(e.id, sp);
    const f = sp.f[e.k], src = f.en ? f : (f.enOf && sp.f[f.enOf]) || f;
    if (src.en && src.en[g] && src.en[g].length) continue;
    const P = pl[e.id] && pl[e.id][g], N = na[e.id] && na[e.id][g];
    if (f.pl && f.pl[g] && !P) delete f.pl[g];
    if (P) { (f.pl ||= {})[g] = P; stat[g].pl++; }
    else if (N) { (f.pln ||= {})[g] = N; stat[g].na++; }
    else stat[g].rest.push(e.n);
  }
}
for (const [id, sp] of files) wr(`sp/${id}.json`, sp);
for (const [g, s] of Object.entries(stat)) console.log(`v42 ${g}: ${s.pl} lieux, ${s.na} méthode, reste ${s.rest.length}${s.rest.length ? ' (' + s.rest.join(', ') + ')' : ''}`);
