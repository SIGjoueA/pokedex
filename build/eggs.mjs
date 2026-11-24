// GO egg hatch pools: current season (Leek Duck) + history helpers (v60.26).
// parseEggs: { byKey: {entryKey: [[km, tag]]}, season, updated, unmapped }.
// tag: '' | 'as' (Aventure Synchro) | 'ga' (cadeau d'ami) | 'gr' (cadeau de route)
// History lives in docs/data/go-eggs.json. mergeCurrentSeason unions the current
// pool into that file without removing past seasons (or past entries of the same season).
import fs from 'node:fs';
import path from 'node:path';
import { get, HERE, DOCS } from './lib.mjs';

export const FORM_SUFFIX = { GALARIAN: 'galar', ALOLA: 'alola', ALOLAN: 'alola', HISUIAN: 'hisui', PALDEA: 'paldea', FEMALE: 'female', MALE: '' };
export const EGG_TAGS = { as: 'récompense Aventure Synchro', ga: 'cadeau d’ami', gr: 'cadeau de route' };
export const EGGS_FILE = path.join(DOCS, 'data', 'go-eggs.json');

export function parseEggsHtml(t, byKey) {
  const season = (t.match(/current season, ([A-Za-z' ]+?)\./) || [])[1] || '';
  const updated = (t.match(/Updated on <time datetime="(\d{4}-\d{2}-\d{2})/) || [])[1] || '';
  const out = {}; const unmapped = [];
  for (const sec of t.split('<h2 id="').slice(1)) {
    const id = sec.slice(0, sec.indexOf('"'));
    const m = id.match(/^(\d+)-km-eggs(?:-(.+))?$/); if (!m) continue;
    const km = +m[1]; const tag = !m[2] ? '' : m[2].includes('adventure') ? 'as' : m[2].includes('friend') ? 'ga' : m[2].includes('route') ? 'gr' : '';
    for (const it of sec.matchAll(/pokemon_icons_crop\/pm(\d+)(?:\.f([A-Z_]+))?(?:\.c[A-Z_0-9]+)?\.icon\.png" alt="([^"]*)"/g)) {
      const dex = it[1], form = it[2];
      let key = dex;
      if (form) {
        const suf = FORM_SUFFIX[form] ?? form.toLowerCase().replace(/_/g, '-');
        key = suf === '' ? dex : `${dex}-${suf}`;
        if (!byKey[key]) { if (byKey[dex] && /\(Male\)/.test(it[3])) key = dex; else { unmapped.push(it[3]); continue; } }
      }
      if (!byKey[key]) { unmapped.push(it[3]); continue; }
      const arr = out[key] ||= [];
      if (!arr.some(x => x[0] === km && x[1] === tag)) arr.push(tag ? [km, tag] : [km]);
    }
  }
  return { byKey: out, season, updated, unmapped };
}

export async function parseEggs(byKey, { refresh = false } = {}) {
  if (refresh) {
    const f = path.join(HERE, '.cache', 'leekduck-eggs.txt');
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }
  const t = await get('https://leekduck.com/eggs/', { name: 'leekduck-eggs', text: true });
  const r = parseEggsHtml(t, byKey);
  if (r.unmapped.length) console.log('eggs: unmapped', r.unmapped.join(', '));
  return r;
}

export function seasonSlug(en) {
  return String(en || '').toLowerCase().replace(/^season of\s+/, '').replace(/&/g, 'and')
    .replace(/wonders?/, 'wonders').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function loadEggHistory() {
  if (!fs.existsSync(EGGS_FILE)) return null;
  return JSON.parse(fs.readFileSync(EGGS_FILE, 'utf8'));
}

export function rebuildByKey(hist) {
  const byKey = {};
  for (const s of hist.seasons || []) {
    const add = (pool) => {
      for (const [k, arr] of Object.entries(pool || {})) {
        const dest = byKey[k] ||= [];
        for (const e of arr) {
          const km = e[0], tag = e[1] || '';
          if (!dest.some(x => x.s === s.id && x.km === km && (x.tag || '') === tag)) dest.push(tag ? { s: s.id, km, tag } : { s: s.id, km });
        }
      }
    };
    add(s.pool);
    for (const p of s.periods || []) add(p.pool);
  }
  hist.byKey = byKey;
  return hist;
}

// Union `pool` into season `id`. Never removes another season, or an existing (key, km, tag) of this season.
export function mergeCurrentSeason(hist, { id, en, fr, from, to, upd, pool, src }) {
  if (!hist || !id || !pool) throw new Error('mergeCurrentSeason: historique, id et pool requis');
  hist.seasons ||= [];
  let s = hist.seasons.find(x => x.id === id);
  if (!s) {
    s = { id, en: en || id, fr: fr || null, from: from || null, to: to || null, src: src || 'leekduck', pool: {}, upd: upd || null };
    hist.seasons.push(s);
  } else {
    if (en && !s.en) s.en = en;
    if (fr && !s.fr) s.fr = fr;
    if (from && !s.from) s.from = from;
    if (to && !s.to) s.to = to;
    if (upd) s.upd = upd;
    if (src && s.src && s.src !== src && !String(s.src).includes(src)) s.src = s.src + '+' + src;
    else if (src && !s.src) s.src = src;
  }
  s.pool ||= {};
  let added = 0;
  for (const [k, arr] of Object.entries(pool)) {
    const dest = s.pool[k] ||= [];
    for (const e of arr) {
      const km = e[0], tag = e[1] || '';
      if (!dest.some(x => x[0] === km && (x[1] || '') === tag)) { dest.push(tag ? [km, tag] : [km]); added++; }
    }
  }
  hist.current = id;
  if (upd) hist.updated = upd;
  rebuildByKey(hist);
  return { hist, added, isNew: added >= 0 };
}

export function applyCurrentPool(byKeyPool, { season, updated }) {
  const dir = path.join(DOCS, 'data', 'sp');
  let nSet = 0, nClr = 0, nFiles = 0;
  for (const fn of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
    const p = path.join(dir, fn);
    const sp = JSON.parse(fs.readFileSync(p, 'utf8'));
    let ch = false;
    for (const [k, f] of Object.entries(sp.f || {})) {
      if (!f.go) continue;
      const eg = byKeyPool[k];
      const prev = JSON.stringify(f.go.eg || null);
      if (eg && eg.length) {
        const next = eg.map(e => e[1] ? [e[0], e[1]] : [e[0]]);
        if (JSON.stringify(f.go.eg || null) !== JSON.stringify(next)) { f.go.eg = next; ch = true; nSet++; }
      } else if (f.go.eg) { delete f.go.eg; ch = true; nClr++; }
    }
    if (ch) { fs.writeFileSync(p, JSON.stringify(sp)); nFiles++; }
  }
  const goPath = path.join(DOCS, 'data', 'go.json');
  const goj = JSON.parse(fs.readFileSync(goPath, 'utf8'));
  const egg = { season: season || goj.egg?.season || '', upd: updated || goj.egg?.upd || '', n: Object.keys(byKeyPool).length };
  if (JSON.stringify(goj.egg) !== JSON.stringify(egg)) { goj.egg = egg; fs.writeFileSync(goPath, JSON.stringify(goj)); }
  return { nSet, nClr, nFiles };
}

export function writeEggHistory(hist) {
  rebuildByKey(hist);
  fs.writeFileSync(EGGS_FILE, JSON.stringify(hist));
}

function coreByKey() {
  const core = JSON.parse(fs.readFileSync(path.join(DOCS, 'data', 'core.json'), 'utf8'));
  return Object.fromEntries(core.e.map(e => [e.k, e]));
}

// Weekly / after a rebuild: fetch (optional) the current Leek Duck pool, apply it to the sheets,
// and union it into go-eggs.json under the current season. Past seasons are never removed.
export async function updateCurrentEggs({ fetch = true, hist, seasonsMeta } = {}) {
  const byKey = coreByKey();
  const eggs = await parseEggs(byKey, { refresh: fetch });
  const id = seasonSlug(eggs.season);
  const meta = (seasonsMeta || hist?.seasons || []).find(s => s.id === id || seasonSlug(s.en) === id) || {};
  const cur = loadEggHistory() || hist || { src: [], seasons: [], checked: new Date().toISOString().slice(0, 10) };
  const { added } = mergeCurrentSeason(cur, {
    id, en: eggs.season || meta.en, fr: meta.fr || null, from: meta.from || null, to: meta.to || null,
    upd: eggs.updated, pool: eggs.byKey, src: 'leekduck'
  });
  writeEggHistory(cur);
  const app = applyCurrentPool(eggs.byKey, { season: eggs.season, updated: eggs.updated });
  console.log(`update-go-eggs : saison ${eggs.season || id} (${eggs.updated || '?'}), ${Object.keys(eggs.byKey).length} fiches dans le pool actuel, +${added} entrée(s) d’historique, ${app.nFiles} fiches réécrites`);
  return { eggs, hist: cur, added, app };
}
