// v60.30: index compact des raids Dynamax (ÉB) et Téracristal (ÉV) pour le filtre « Dispo en raid » et la vue Raids.
// Idempotent : node fix-v60-30.mjs   (réécrit docs/data/raids.json à partir de f.rd, sans modifier les fiches)
// Aucune source distante : les données viennent de v60.24 / v60.27 (Poképédia, CC BY-NC-SA 3.0 FR).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DOCS = path.join(HERE, '..', 'docs');
const SP = path.join(DOCS, 'data', 'sp');
const OUT = path.join(DOCS, 'data', 'raids.json');

export const RAID_GAMES = ['sw', 'swisle', 'swcrown', 'sv', 'svmask', 'svdisk'];
export const STAR_EXP = 1 << 6;  // Expédition Dynamax, rencontres habituelles
export const STAR_RARE = 1 << 7; // fin d’expédition / hors du commun

const DEN_RE = /^Antres? ([A-Z0-9, ]+?) \(faisceau (rouge|mauve)\)(?: · |$)/;
const IV_RE = /(?:^| · )(?:\d+ IV parfaits?|IV parfaits : [^·]+)/g;
const EXP_COMMON = /Pokémon rencontrable en expédition(?: · )?/g;
const EXP_RARE = /Pokémon hors du commun \(fin d’expédition\)(?: · )?/g;
const GMAX_RE = /(?:^| · )Gigamax(?: · |$)/g;

export function starMask(text) {
  let m = 0;
  let t = String(text || '');
  t = t.replace(/(\d+)–(\d+)★/g, (_, a, b) => {
    const x = +a, y = +b;
    for (let s = Math.min(x, y); s <= Math.max(x, y); s++) if (s >= 1 && s <= 6) m |= 1 << (s - 1);
    return '★';
  });
  t = t.replace(/(\d+)★ et (\d+)★/g, (_, a, b) => {
    for (const s of [+a, +b]) if (s >= 1 && s <= 6) m |= 1 << (s - 1);
    return '★';
  });
  for (const x of t.matchAll(/(\d+)★/g)) {
    const s = +x[1];
    if (s >= 1 && s <= 6) m |= 1 << (s - 1);
  }
  return m;
}

function leftover(text) {
  let t = String(text || '');
  t = t.replace(DEN_RE, '');
  t = t.replace(GMAX_RE, ' · ');
  t = t.replace(/(\d+)–(\d+)★(?: Épée \d+ % \/ Bouclier \d+ %| Épée \d+ %| Bouclier \d+ %| \d+ %)?/g, '');
  t = t.replace(/(\d+)★ et (\d+)★/g, '');
  t = t.replace(/(\d+)★(?: Épée \d+ % \/ Bouclier \d+ %| Épée \d+ %| Bouclier \d+ %| \d+ %)?/g, '');
  t = t.replace(/(?:^| · )(?:Épée|Bouclier) \d+ %(?: \/ (?:Épée|Bouclier) \d+ %)?/g, '');
  t = t.replace(IV_RE, '');
  t = t.replace(EXP_COMMON, '');
  t = t.replace(EXP_RARE, '');
  return t.split(' · ').map(s => s.trim()).filter(Boolean).join(' · ');
}

function parseRow(row) {
  const z = row[0] || '', t = row[1] || '', fl = row[2] || '';
  const denM = t.match(DEN_RE);
  let stars = starMask(t);
  if (!stars) {
    if (/hors du commun|fin d’expédition/.test(t) || /Note Légende/.test(t)) stars = STAR_RARE;
    else if (/expédition/i.test(z) || /expédition/i.test(t)) stars = STAR_EXP;
  }
  return {
    z,
    den: denM ? denM[1] : '',
    beam: denM ? (denM[2] === 'rouge' ? 'r' : 'm') : '',
    stars,
    fl: /g/.test(fl) && /e/.test(fl) ? 'ge' : /g/.test(fl) ? 'g' : /e/.test(fl) ? 'e' : '',
    extra: leftover(t)
  };
}

function gmaxMap(core) {
  const m = {};
  for (const e of core.e) {
    if (e.c === 'gmax' || /-(?:amped-)?gmax$/.test(e.k) || /-eternamax$/.test(e.k)) (m[e.id] ||= []).push(e.k);
  }
  return m;
}

function gmaxKey(k, map) {
  const id = +String(k).split('-')[0];
  const list = map[id] || [];
  return list.length ? list[0] : k; // Salarsen : une seule fiche 849-amped-gmax (v44)
}

function raidRowsOf(k, f, sp, g, byKey) {
  if (f.rd && f.rd[g]) return f.rd[g];
  const e = byKey[k];
  if (e && (e.c === 'reg' || e.mb)) return null;
  const b = sp.f[String(sp.id)], L = b && b !== f && b.rd ? b.rd[g] : null;
  if (!L) return null;
  return e && e.c === 'gmax' ? L.filter(r => r[2] && r[2].includes('g')) : L;
}

export function buildRaids() {
  const core = JSON.parse(fs.readFileSync(path.join(DOCS, 'data', 'core.json'), 'utf8'));
  const byKey = Object.fromEntries(core.e.map(e => [e.k, e]));
  const gmap = gmaxMap(core);
  const zones = new Set(), extras = new Set(), rows = [];
  const seen = new Set();
  let nRd = 0, unmapped = [];
  for (const name of fs.readdirSync(SP).filter(n => /^\d+\.json$/.test(n))) {
    const sp = JSON.parse(fs.readFileSync(path.join(SP, name), 'utf8'));
    for (const [k, f] of Object.entries(sp.f || {})) {
      if (!f.rd) continue;
      for (const g of RAID_GAMES) {
        const L = (f.rd[g] || []);
        if (!L.length) continue;
        nRd += L.length;
        for (const raw of L) {
          const p = parseRow(raw);
          if (!p.stars) continue; // ne devrait pas arriver
          if (/Antre Interdit/i.test(p.z)) continue;
          const gmax = /g/.test(p.fl);
          let key = k;
          if (gmax) {
            const gk = gmaxKey(k, gmap);
            if (gk === k && !/gmax|eternamax/.test(k)) unmapped.push(k + ' / ' + g);
            key = gk;
          }
          const rec = { k: key, g, ...p };
          const id = [rec.k, rec.g, rec.z, rec.den, rec.beam, rec.stars, rec.fl, rec.extra].join('\t');
          if (seen.has(id)) continue;
          seen.add(id);
          zones.add(rec.z);
          extras.add(rec.extra);
          rows.push(rec);
        }
      }
    }
  }
  const z = [...zones].sort((a, b) => a.localeCompare(b, 'fr'));
  const x = [...extras].sort((a, b) => a.localeCompare(b, 'fr'));
  const zi = Object.fromEntries(z.map((s, i) => [s, i]));
  const xi = Object.fromEntries(x.map((s, i) => [s, i]));
  const r = rows
    .sort((a, b) => RAID_GAMES.indexOf(a.g) - RAID_GAMES.indexOf(b.g) || a.z.localeCompare(b.z, 'fr') || a.den.localeCompare(b.den, 'fr') || a.k.localeCompare(b.k, 'en', { numeric: true }) || a.stars - b.stars)
    .map(o => [o.k, RAID_GAMES.indexOf(o.g), zi[o.z], o.den, o.beam, o.stars, o.fl, xi[o.extra]]);
  return {
    src: 'Index compact des raids Dynamax (Épée / Bouclier, Isolarmure, Couronneige, Expédition Dynamax) et Téracristal (Paldea, Septentria, Terra-Dôme), construit à partir de f.rd (v60.24 / v60.27). Source : Poképédia, licence CC BY-NC-SA 3.0 FR.',
    g: RAID_GAMES,
    z,
    x,
    r,
    _meta: { nRd, unmapped: [...new Set(unmapped)], files: rows.length }
  };
}

function main() {
  const built = buildRaids();
  const { _meta, ...data } = built;
  const json = JSON.stringify(data);
  const prev = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (prev !== json) fs.writeFileSync(OUT, json);
  const cov = {};
  for (const row of data.r) {
    const g = data.g[row[1]];
    (cov[g] ||= { rows: 0, keys: new Set() });
    cov[g].rows++;
    cov[g].keys.add(row[0]);
  }
  const cache = path.join(HERE, 'cache', 'v60-30');
  fs.mkdirSync(cache, { recursive: true });
  const prov = {
    note: 'Aucun téléchargement : index construit localement depuis docs/data/sp/*/f.rd (v60.24 Dynamax ÉB, v60.27 Téracristal ÉV). Poképédia, CC BY-NC-SA 3.0 FR.',
    date: new Date().toISOString().slice(0, 10),
    rows: data.r.length,
    games: Object.fromEntries(Object.entries(cov).map(([g, c]) => [g, { rows: c.rows, keys: c.keys.size }])),
    unmappedGmax: _meta.unmapped
  };
  fs.writeFileSync(path.join(cache, 'provenance.json'), JSON.stringify(prov, null, 2) + '\n');
  console.log(`v60.30 raids.json : ${data.r.length} lignes / ${new Set(data.r.map(r => r[0])).size} fiches ; ${Object.entries(cov).map(([g, c]) => `${g} ${c.keys.size} fiches / ${c.rows} lignes`).join(', ')} ; Gigamax sans fiche dédiée : ${_meta.unmapped.length} ; ${prev === json ? 'inchangé' : 'écrit'}`);
}

const isMain = process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);
if (isMain) main();
