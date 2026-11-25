// v60.39 : index compact des lieux pour la recherche de la liste.
// Idempotent : node fix-v60-39.mjs   (réécrit docs/data/loc-index.json à partir de sp/*.json, loc.json, core.json)
// Aucune source distante : les données sont déjà livrées. Ne pas lancer build-data.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DOCS = path.join(HERE, '..', 'docs');
const SP = path.join(DOCS, 'data', 'sp');
const OUT = path.join(DOCS, 'data', 'loc-index.json');

const norm = s => String(s).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '');

function inGame(e, gi) {
  return !!((e.gb >> gi) & 1);
}

// Pas d’héritage vers une forme régionale, une Méga, un Gigamax, un Primo ou une forme de combat.
function skipInherit(e) {
  return !!(e && (e.c === 'reg' || e.c === 'mega' || e.c === 'gmax' || e.c === 'primal' || e.mb || e.bo));
}

function placeNames(k, f, sp, gid, loc, BY) {
  const e = BY[k];
  if (f.pl && f.pl[gid] && f.pl[gid].length) {
    return f.pl[gid].map(row => row && row[0]).filter(Boolean);
  }
  if (!skipInherit(e)) {
    const b = sp.f[f.enOf || String(sp.id)];
    if (b && b.pl && b.pl[gid] && b.pl[gid].length) {
      return b.pl[gid].map(row => row && row[0]).filter(Boolean);
    }
  }
  const src = f.en ? f : (skipInherit(e) ? null : ((f.enOf && sp.f[f.enOf]) || f));
  if (!src) return [];
  const rows = (src.en && src.en[gid]) || [];
  const out = [];
  for (const r of rows) {
    if (r && r[0] != null && loc.a[r[0]]) out.push(loc.a[r[0]]);
  }
  return out;
}

function pickTypography(cands) {
  let best = cands[0];
  let bestAcc = [...best].filter(ch => ch.charCodeAt(0) > 127).length;
  for (const s of cands.slice(1)) {
    const acc = [...s].filter(ch => ch.charCodeAt(0) > 127).length;
    if (acc > bestAcc || (acc === bestAcc && s.localeCompare(best, 'fr') < 0)) {
      best = s; bestAcc = acc;
    }
  }
  return best;
}

export function buildLocIndex({ core, loc, forms }) {
  const G = core.games.map(g => g.id);
  const BY = Object.fromEntries(core.e.map(e => [e.k, e]));
  // nameNorm -> typographies, and typography-group -> gi -> Set(k)
  const typo = new Map();
  const places = new Map();
  for (const sp of forms) {
    for (const [k, f] of Object.entries(sp.f || {})) {
      const e = BY[k];
      if (!e) continue;
      for (let gi = 0; gi < G.length; gi++) {
        if (!inGame(e, gi)) continue;
        const names = placeNames(k, f, sp, G[gi], loc, BY);
        for (const name of names) {
          const key = norm(name);
          if (!key) continue;
          if (!typo.has(key)) typo.set(key, new Set());
          typo.get(key).add(name);
          if (!places.has(key)) places.set(key, new Map());
          const gm = places.get(key);
          if (!gm.has(gi)) gm.set(gi, new Set());
          gm.get(gi).add(k);
        }
      }
    }
  }
  const keys = [...places.keys()].sort((a, b) => {
    const na = pickTypography([...typo.get(a)]), nb = pickTypography([...typo.get(b)]);
    return na.localeCompare(nb, 'fr', { numeric: true }) || a.localeCompare(b);
  });
  const n = keys.map(key => pickTypography([...typo.get(key)]));
  const Kset = new Set();
  for (const gm of places.values()) for (const ks of gm.values()) for (const k of ks) Kset.add(k);
  const K = [...Kset].sort((a, b) => (+String(a).split('-')[0] - +String(b).split('-')[0]) || (a > b ? 1 : a < b ? -1 : 0));
  const Kidx = Object.fromEntries(K.map((k, i) => [k, i]));
  const L = {};
  keys.forEach((key, i) => {
    const gm = places.get(key);
    const formsHere = new Set();
    for (const ks of gm.values()) for (const k of ks) formsHere.add(k);
    const arr = [];
    for (const k of [...formsHere].sort((a, b) => Kidx[a] - Kidx[b])) {
      let bits = 0;
      for (const [gi, ks] of gm) if (ks.has(k)) bits |= 1 << gi;
      arr.push(Kidx[k], bits);
    }
    L[String(i)] = arr;
  });
  return { v: 1, g: G, k: K, n, L };
}

export function readLocSources() {
  const core = JSON.parse(fs.readFileSync(path.join(DOCS, 'data', 'core.json'), 'utf8'));
  const loc = JSON.parse(fs.readFileSync(path.join(DOCS, 'data', 'loc.json'), 'utf8'));
  const forms = fs.readdirSync(SP).filter(f => /^\d+\.json$/.test(f)).sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
    .map(f => JSON.parse(fs.readFileSync(path.join(SP, f), 'utf8')));
  return { core, loc, forms };
}

export function locIndexToJSON(idx) {
  return JSON.stringify(idx);
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1] && process.argv[1].endsWith('fix-v60-39.mjs')) {
  const idx = buildLocIndex(readLocSources());
  const json = locIndexToJSON(idx);
  const prev = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : null;
  if (prev === json) console.log('v60.39 : loc-index.json déjà à jour (' + json.length + ' octets)');
  else {
    fs.writeFileSync(OUT, json);
    console.log('v60.39 : loc-index.json écrit (' + json.length + ' octets, ' + idx.k.length + ' formes, ' + idx.n.length + ' lieux)');
  }
}
