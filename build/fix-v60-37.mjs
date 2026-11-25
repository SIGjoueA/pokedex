// v60.37 : index compact capacités + talents pour la recherche de la liste.
// Idempotent : node fix-v60-37.mjs   (réécrit docs/data/learn-index.json à partir de sp/*.json, moves.json, ref.json, core.json)
// Aucune source distante : les données sont déjà livrées. Ne pas lancer build-data.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DOCS = path.join(HERE, '..', 'docs');
const SP = path.join(DOCS, 'data', 'sp');
const OUT = path.join(DOCS, 'data', 'learn-index.json');

const METH = { l: 1, m: 2, e: 4, t: 8, o: 16 };
const pickGen = (list, gen, cur) => { const e = (list || []).find(x => x[0] >= gen); return e ? e[1] : cur; };

function addMove(L, id, k, gi, bit) {
  if (id == null || id === '') return;
  const mid = String(id);
  if (!L.has(mid)) L.set(mid, new Map());
  const fm = L.get(mid);
  if (!fm.has(k)) fm.set(k, new Map());
  const gm = fm.get(k);
  gm.set(gi, (gm.get(gi) || 0) | bit);
}

export function buildLearnIndex({ core, moves, ref, forms }) {
  const G = core.games.map(g => g.id);
  const BY = Object.fromEntries(core.e.map(e => [e.k, e]));
  const L = new Map();
  const A = new Map();
  for (const sp of forms) {
    for (const [k, f] of Object.entries(sp.f || {})) {
      if (!BY[k]) continue;
      const src = (f.mvOf && sp.f[f.mvOf]) || f;
      if (src.lm && src.ls) {
        for (const [gid, idx] of Object.entries(src.lm)) {
          const gi = G.indexOf(gid);
          if (gi < 0) continue;
          const slot = src.ls[idx];
          if (!slot) continue;
          for (const row of slot.l || []) addMove(L, Array.isArray(row) ? row[0] : row, k, gi, METH.l);
          for (const id of slot.m || []) addMove(L, id, k, gi, METH.m);
          for (const id of slot.e || []) addMove(L, id, k, gi, METH.e);
          for (const id of slot.t || []) addMove(L, id, k, gi, METH.t);
          for (const row of slot.o || []) addMove(L, Array.isArray(row) ? row[0] : row, k, gi, METH.o);
        }
      }
      if (f.a || f.pa) {
        for (let gen = 3; gen <= 9; gen++) {
          let list = pickGen(f.pa, gen, f.a || []);
          if (gen < 5) list = list.filter(a => !a[1]);
          list = list.filter(a => ((ref.ab[a[0]] || [])[2] || 1) <= gen);
          for (const [id, hid] of list) {
            const aid = String(id);
            if (!A.has(aid)) A.set(aid, new Map());
            const rec = A.get(aid).get(k) || { mask: 0, hid: 0 };
            rec.mask |= 1 << (gen - 1);
            if (hid) rec.hid |= 1 << (gen - 1);
            A.get(aid).set(k, rec);
          }
        }
      }
    }
  }
  const Kset = new Set();
  for (const m of L.values()) for (const k of m.keys()) Kset.add(k);
  for (const m of A.values()) for (const k of m.keys()) Kset.add(k);
  const K = [...Kset].sort((a, b) => (+String(a).split('-')[0] - +String(b).split('-')[0]) || (a > b ? 1 : a < b ? -1 : 0));
  const Kidx = Object.fromEntries(K.map((k, i) => [k, i]));
  const Lo = {};
  for (const mid of [...L.keys()].sort((a, b) => a - b)) {
    const arr = [];
    for (const [k, gm] of [...L.get(mid).entries()].sort((a, b) => Kidx[a[0]] - Kidx[b[0]])) {
      const packs = [...gm.entries()].sort((x, y) => x[0] - y[0]).map(([gi, mb]) => (gi << 5) | mb);
      arr.push(Kidx[k], packs.length, ...packs);
    }
    Lo[mid] = arr;
  }
  const Ao = {};
  for (const aid of [...A.keys()].sort((a, b) => a - b)) {
    const arr = [];
    for (const [k, rec] of [...A.get(aid).entries()].sort((a, b) => Kidx[a[0]] - Kidx[b[0]])) {
      arr.push(Kidx[k], rec.mask, rec.hid);
    }
    Ao[aid] = arr;
  }
  const n = {};
  for (const id of Object.keys(moves).sort((a, b) => a - b)) n[id] = moves[id][0];
  const an = {};
  for (const id of Object.keys(ref.ab).sort((a, b) => a - b)) an[id] = ref.ab[id][0];
  return { v: 1, g: G, k: K, n, an, L: Lo, A: Ao };
}

export function readLearnSources() {
  const core = JSON.parse(fs.readFileSync(path.join(DOCS, 'data', 'core.json'), 'utf8'));
  const moves = JSON.parse(fs.readFileSync(path.join(DOCS, 'data', 'moves.json'), 'utf8'));
  const ref = JSON.parse(fs.readFileSync(path.join(DOCS, 'data', 'ref.json'), 'utf8'));
  const forms = fs.readdirSync(SP).filter(f => /^\d+\.json$/.test(f)).sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
    .map(f => JSON.parse(fs.readFileSync(path.join(SP, f), 'utf8')));
  return { core, moves, ref, forms };
}

export function learnIndexToJSON(idx) {
  return JSON.stringify(idx);
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1] && process.argv[1].endsWith('fix-v60-37.mjs')) {
  const idx = buildLearnIndex(readLearnSources());
  const json = learnIndexToJSON(idx);
  const prev = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : null;
  if (prev === json) console.log('v60.37 : learn-index.json déjà à jour (' + json.length + ' octets)');
  else {
    fs.writeFileSync(OUT, json);
    console.log('v60.37 : learn-index.json écrit (' + json.length + ' octets, ' + idx.k.length + ' formes, ' + Object.keys(idx.L).length + ' capacités, ' + Object.keys(idx.A).length + ' talents)');
  }
}
