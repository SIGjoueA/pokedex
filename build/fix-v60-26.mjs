// v60.26: historical Pokémon GO egg pools, applied after a rebuild (end of apply-v34.mjs) or alone: node fix-v60-26.mjs.
// Idempotent: rebuilds docs/data/go-eggs.json from the versioned cache (build/cache/v60-26/) then unions the current
// Leek Duck pool (does not wipe mid-season additions already stored for the current season if they came from Leek Duck).
// Sources (no invented data): Serebii Previous Egg Pokémon + the current Serebii Eggs page (still labelled Forever Forward
// on 2026-11-24), Leek Duck current pool, Leek Duck event page for Forever Forward Adventure Sync only (partial),
// Poképédia event lists for French season names, Bulbapedia Season (GO) for dates and as a cross-check (highlights only).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEggsHtml, mergeCurrentSeason, writeEggHistory, loadEggHistory, rebuildByKey, seasonSlug, EGGS_FILE } from './eggs.mjs';
import { DOCS } from './lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CACHE = path.join(HERE, 'cache', 'v60-26');
const rd = f => fs.readFileSync(path.join(CACHE, f), 'utf8');
const core = JSON.parse(fs.readFileSync(path.join(DOCS, 'data', 'core.json'), 'utf8'));
const byKey = Object.fromEntries(core.e.map(e => [e.k, e]));
const byEn = new Map();
for (const e of core.e) {
  const en = (e.en || '').toLowerCase();
  if (!byEn.has(en)) byEn.set(en, []);
  byEn.get(en).push(e);
}

const IMG_SUF = { a: 'alola', g: 'galar', h: 'hisui', p: 'paldea', w: 'white-striped', b: 'blue-striped' };
const NAME_FORM = [
  [/alolan? form/i, 'alola'], [/galarian form/i, 'galar'], [/hisuian form/i, 'hisui'],
  [/paldean form/i, 'paldea'], [/white[ -]?striped/i, 'white-striped'], [/blue[ -]?striped/i, 'blue-striped'],
  [/\bfemale\b/i, 'female']
];
const SKIP_COSTUME = /gofest|glasses|sunglasses|costume|holiday|santa|party hat|clone/i;
const report = { unmapped: [], skipped: [], doubtful: [], notes: [] };

function unesc(s) { return String(s || '').replace(/&amp;/g, '&').replace(/&eacute;/g, 'é').replace(/&Eacute;/g, 'É').replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&quot;/g, '"'); }

function resolveKey(dex, { img = '', name = '' } = {}) {
  dex = String(+dex);
  const raw = `${dex} ${(img || '').split('/').pop()} ${unesc(name)}`.trim();
  if (SKIP_COSTUME.test(img) || SKIP_COSTUME.test(name)) { report.skipped.push(['costume', raw]); return null; }
  if (/eternamax/i.test(name) || /890-e/.test(img) || dex === '890' && /-e\./.test(img)) {
    report.doubtful.push(['eternamax-œuf', raw]); return null;
  }
  const im = (img || '').match(/(\d+)(?:-([a-z0-9]+))?\.(?:png|gif|webp)/i);
  let suf = null;
  if (im && im[2]) {
    const s = im[2].toLowerCase();
    if (SKIP_COSTUME.test(s)) { report.skipped.push(['costume', raw]); return null; }
    suf = IMG_SUF[s];
    if (!suf) { report.unmapped.push(['suffixe-image', raw]); return null; }
  }
  if (!suf) {
    for (const [re, v] of NAME_FORM) if (re.test(name)) { suf = v; break; }
  }
  const key = suf ? `${dex}-${suf}` : dex;
  if (byKey[key]) return key;
  if (suf && byKey[dex] && suf === 'female') { report.unmapped.push(['forme', raw]); return null; }
  if (!byKey[key]) { report.unmapped.push(['clé', raw]); return null; }
  return key;
}

function addPool(pool, key, km, tag) {
  if (!key || !km) return;
  const dest = pool[key] ||= [];
  const t = tag || '';
  if (!dest.some(x => x[0] === km && (x[1] || '') === t)) dest.push(t ? [km, t] : [km]);
}

function distToTag(label) {
  const s = unesc(label).replace(/\s+/g, ' ').trim();
  if (/^not in eggs$/i.test(s)) return null;
  const km = +(s.match(/(\d+)\s*km/i) || [])[1];
  if (!km) return null;
  let tag = '';
  if (/adventure sync/i.test(s)) tag = 'as';
  else if (/route/i.test(s)) tag = 'gr';
  else if (/^7\s*km$/i.test(s)) tag = 'ga';
  return { km, tag };
}

function parseSerebiiRows(html) {
  const pool = {};
  // One Pokémon row: dex #, image, name, …, distance, max CP
  const re = /<td class="cen">\s*#(\d+)\s*<\/td>\s*<td class="cen">[\s\S]*?src="([^"]+)"[\s\S]*?<td class="fooinfo">\s*<a[^>]*>([^<]+)<\/a>([\s\S]*?)<\/td>[\s\S]*?<td class="foo(?:info|hin)">\s*([^<]+?)\s*<\/td>\s*<td class="cen">\d+<\/td>/gi;
  let m, n = 0;
  while ((m = re.exec(html))) {
    n++;
    const dex = m[1], img = m[2], name = unesc(m[3]) + ' ' + unesc(String(m[4]).replace(/<[^>]+>/g, ' '));
    const d = distToTag(m[5]);
    if (!d) continue;
    const key = resolveKey(dex, { img, name });
    if (key) addPool(pool, key, d.km, d.tag);
  }
  return { pool, n };
}

function splitSerebiiTabs(html) {
  const tabs = html.split(/<b-tab title="([^"]+)"[^>]*>/);
  const out = [];
  if (tabs.length > 1) {
    for (let i = 1; i < tabs.length; i += 2) {
      const title = unesc(tabs[i]);
      const body = tabs[i + 1].split('</b-tab>')[0];
      out.push({ title, body });
    }
  } else {
    out.push({ title: '', body: html });
  }
  return out;
}

// Official season list: English name, dates (ISO). FR names filled from Poképédia when found.
const SEASONS = [
  { id: 'celebration', en: 'Season of Celebration', from: '2020-12-01', to: '2021-03-01', aliases: [/^2\/12\/20-1\/3\/21$/] },
  { id: 'legends', en: 'Season of Legends', from: '2021-03-01', to: '2021-06-01', aliases: [/^1\/3\/21-17\/5\/21$/, /^17\/5\/21-31\/5\/21$/] },
  { id: 'discovery', en: 'Season of Discovery', from: '2021-06-01', to: '2021-09-01', aliases: [/^1\/6\/21-31\/8\/21$/] },
  { id: 'mischief', en: 'Season of Mischief', from: '2021-09-01', to: '2021-12-01', aliases: [/^1\/9\/21-30\/11\/21$/] },
  { id: 'heritage', en: 'Season of Heritage', from: '2021-12-01', to: '2022-03-01', aliases: [/^1\/12\/21-28\/2\/22$/] },
  { id: 'alola', en: 'Season of Alola', from: '2022-03-01', to: '2022-06-01', aliases: [] }, // Serebii tab 1/3/22-30/6/22 overlaps Season of GO — kept as a dated period
  { id: 'season-of-go', en: 'Season of GO', from: '2022-06-01', to: '2022-09-01', aliases: [/season of go/i] },
  { id: 'light', en: 'Season of Light', from: '2022-09-01', to: '2022-12-01', aliases: [/season of light/i] },
  { id: 'mythical-wishes', en: 'Mythical Wishes', from: '2022-12-01', to: '2023-03-01', aliases: [/mythical wishes/i] },
  { id: 'rising-heroes', en: 'Rising Heroes', from: '2023-03-01', to: '2023-06-01', aliases: [/rising heroes/i] },
  { id: 'hidden-gems', en: 'Hidden Gems', from: '2023-06-01', to: '2023-09-01', aliases: [/hidden gems/i] },
  { id: 'adventures-abound', en: 'Adventures Abound', from: '2023-09-01', to: '2023-12-01', aliases: [/adventures abound/i] },
  { id: 'timeless-travels', en: 'Timeless Travels', from: '2023-12-01', to: '2024-03-01', aliases: [/timeless travels/i] },
  { id: 'world-of-wonders', en: 'World of Wonders', from: '2024-03-01', to: '2024-06-01', aliases: [/world of wonders?/i] },
  { id: 'shared-skies', en: 'Shared Skies', from: '2024-06-01', to: '2024-09-03', aliases: [/shared skies/i] },
  { id: 'max-out', en: 'Max Out', from: '2024-09-03', to: '2024-12-03', aliases: [/max out/i] },
  { id: 'dual-destiny', en: 'Dual Destiny', from: '2024-12-03', to: '2025-03-04', aliases: [/dual destiny/i] },
  { id: 'might-and-mastery', en: 'Might & Mastery', from: '2025-03-04', to: '2025-06-03', aliases: [/might and mastery/i] },
  { id: 'delightful-days', en: 'Delightful Days', from: '2025-06-03', to: '2025-09-02', aliases: [/delightful days/i] },
  { id: 'tales-of-transformation', en: 'Tales of Transformation', from: '2025-09-02', to: '2025-12-02', aliases: [/tales of transformation/i] },
  { id: 'precious-paths', en: 'Precious Paths', from: '2025-12-02', to: '2026-03-03', aliases: [/precious paths/i] },
  { id: 'memories-in-motion', en: 'Memories in Motion', from: '2026-03-03', to: '2026-06-02', aliases: [/memories in motion/i] },
  { id: 'forever-forward', en: 'Forever Forward', from: '2026-06-02', to: '2026-09-08', aliases: [/forever forwards?/i] },
  { id: 'twilight-trails', en: 'Twilight Trails', from: '2026-09-08', to: '2026-12-01', aliases: [/twilight trails/i] }
];

function matchSeason(title) {
  const t = title.trim();
  for (const s of SEASONS) {
    if (s.aliases.some(re => re.test(t))) return s;
    const head = t.replace(/\s*\(.*$/, '').trim();
    if (seasonSlug(head) === s.id || seasonSlug(head) === seasonSlug(s.en)) return s;
    if (new RegExp(s.en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/&/g, '&?'), 'i').test(t)) return s;
  }
  return null;
}

const MONTHS = { jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12 };
function pad(n) { return String(n).padStart(2, '0'); }
function ymd(y, m, d) { if (!y || !m || !d) return null; return `${y}-${pad(m)}-${pad(d)}`; }
function parseOneDate(s, defaultYear) {
  s = s.trim().replace(/(\d+)(st|nd|rd|th)/i, '$1').replace(/\s+/g, ' ');
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) { let y = +m[3]; if (y < 100) y += 2000; return ymd(y, +m[2], +m[1]); } // D/M/Y (Serebii)
  m = s.match(/^([A-Za-z]+)\s+(\d{1,2})(?:\s*[–-]\s*)?(?:,)?\s*(\d{4})?$/);
  if (m && MONTHS[m[1].toLowerCase()]) return ymd(+(m[3] || defaultYear), MONTHS[m[1].toLowerCase()], +m[2]);
  m = s.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (m && MONTHS[m[1].toLowerCase()]) return { from: ymd(+m[2], MONTHS[m[1].toLowerCase()], 1), monthOnly: true };
  return null;
}

function parseSerebiiTitleDates(title) {
  const t = title.trim();
  // "Name (Mar 3  - Jun 2 2026)" — ignored when a named season matches, kept for dated periods
  let m = t.match(/\(([^)]+)\)\s*$/);
  const inner = m ? m[1] : t;
  const parts = inner.split(/\s*[-–—]\s*/).map(x => x.trim()).filter(Boolean);
  if (parts.length === 2) {
    const y = (inner.match(/(\d{4})/g) || []).pop();
    const a = parseOneDate(parts[0], y), b = parseOneDate(parts[1], y);
    const from = typeof a === 'string' ? a : a?.from, to = typeof b === 'string' ? b : b?.from;
    const month = !!(a && a.monthOnly) || !!(b && b.monthOnly);
    if (from || to) return { from: from || null, to: to || null, month };
  }
  if (parts.length === 1) {
    const a = parseOneDate(parts[0]);
    if (typeof a === 'string') return { from: a, to: a, point: true };
    if (a && a.monthOnly) return { from: a.from, to: null, month: true };
  }
  // "1.37 25/07/17"
  m = t.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})\s*$/);
  if (m) { const d = parseOneDate(m[1]); if (d) return { from: d, to: d, point: true }; }
  // Serebii tab « 1.0 » = pool du lancement (juillet 2016) ; jour non indiqué par Serebii
  if (/^1\.0$/.test(t)) return { from: '2016-07-01', to: null, month: true };
  // Dates officielles : https://pokemongo.com/fr/news/sinnoh-hatchathon
  if (/^hatchathon 2018$/i.test(t)) return { from: '2018-11-14', to: '2018-11-27' };
  return { from: null, to: null };
}

function wikiContent(file) {
  const j = JSON.parse(rd(file));
  const p = j.query.pages[0];
  if (p.missing || !p.revisions) return { text: '', ts: null, revid: null, missing: true };
  const r = p.revisions[0];
  return { text: r.slots.main.content, ts: r.timestamp, revid: r.revid, title: p.title };
}

function parsePokepediaFrNames() {
  const fr = {};
  const MONTH = { janvier: 1, février: 2, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6, juillet: 7, août: 8, aout: 8, septembre: 9, octobre: 10, novembre: 11, décembre: 12, decembre: 12 };
  const parseFrDate = (s, year) => {
    s = s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/1<sup>er<\/sup>|1er|1<sup>er<\/sup>/gi, '1').replace(/\s+/g, ' ').trim();
    const m = s.match(/^(\d{1,2})\s+([A-Za-zéûôàèùêç]+)\s*(\d{4})?$/i) || s.match(/^(\d{1,2})\s+([A-Za-zéûôàèùêç]+)$/i);
    if (!m) return null;
    const mon = MONTH[m[2].toLowerCase()]; if (!mon) return null;
    return ymd(+(m[3] || year), mon, +m[1]);
  };
  for (let year = 2020; year <= 2026; year++) {
    const { text, missing } = wikiContent(`pokepedia-evenements-${year}.json`);
    if (missing) continue;
    const sec = text.match(/===\s*Saisons\s*===([\s\S]*?)(?=\n==[^=]|\n===|$)/);
    if (!sec) continue;
    const rows = sec[1].split('\n|-').slice(1);
    for (const row of rows) {
      const cells = row.split('\n|').map(x => x.trim()).filter(x => x && !x.startsWith('!'));
      // name is last text line of first cell (after images)
      const raw = cells[0] || '';
      const name = unesc(raw.replace(/\[\[Fichier:[^\]]*\]\]/g, '').replace(/<[^>]+>/g, '').replace(/\[\[|\]\]/g, '').replace(/'''/g, '').trim()).split('\n').map(x => x.trim()).filter(Boolean).pop();
      if (!name || /saison$/i.test(name) && name.length < 8) continue;
      const from = cells[1] ? parseFrDate(cells[1], year) : null;
      let to = cells[2] ? parseFrDate(cells[2], year) : null;
      if (name) {
        // match to SEASONS by dates when possible
        fr._names = fr._names || [];
        fr._names.push({ name, from, to, year });
      }
    }
  }
  return fr._names || [];
}

function attachFrNames() {
  const names = parsePokepediaFrNames();
  const used = new Set();
  for (const s of SEASONS) {
    if (s.id === 'celebration') continue; // pas de nom FR officiel : pokemongo.com/fr/seasons/celebration = 404 ; l’article pokemongolive.com/fr/post/season-of-celebration-2020 est en anglais ; pas de page Poképédia
    let hit = names.find(n => n.from === s.from && (n.to === s.to || (n.to && s.to && n.to.slice(0, 7) === s.to.slice(0, 7))));
    if (!hit) hit = names.find(n => n.from === s.from);
    // last resort: unique year overlap + start day match
    if (!hit && s.from) hit = names.find(n => n.from && n.from.slice(5) === s.from.slice(5) && Math.abs(+n.from.slice(0, 4) - +s.from.slice(0, 4)) <= 1);
    if (hit && !used.has(hit.name + hit.from)) { s.fr = hit.name.replace(/'/g, '’'); used.add(hit.name + hit.from); s.frSrc = 'pokepedia'; }
    else report.notes.push(`pas de nom FR Poképédia relié à ${s.en} (${s.from})`);
  }
}

function parseBulbapediaDates() {
  const { text } = wikiContent('bulbapedia-Season_GO.json');
  const list = [];
  const tbl = (text.match(/==List of GO Seasons==([\s\S]*?)(?=\n==[^=]|$)/) || [])[1] || '';
  // rows with a name and two English dates
  const rows = tbl.split('|-').slice(1);
  for (const row of rows) {
    const name = (row.match(/\[\[([^\]]+)\]\]/) || row.match(/seasons\/[^\/]+\/ ([^\]']+)/) || row.match(/'''\[https:[^ ]+ ([^\]]+)\]'''/) || [])[1];
    const dates = [...row.matchAll(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(\d{4})/g)];
    if (name && dates.length >= 2) {
      const from = ymd(+dates[0][3], MONTHS[dates[0][1].toLowerCase()], +dates[0][2]);
      const to = ymd(+dates[1][3], MONTHS[dates[1][1].toLowerCase()], +dates[1][2]);
      list.push({ name: name.replace(/\|.*/, '').trim(), from, to });
    }
  }
  return list;
}

function parseBulbapediaHatch() {
  // Highlights only (much smaller than Serebii). Used as a cross-check, not as a pool source.
  const { text } = wikiContent('bulbapedia-Season_GO.json');
  const sections = text.split(/^===([^=]+)===\s*$/m);
  const out = {};
  const formOf = (dex, letter, name) => {
    const d = String(+dex), L = letter;
    const special = { 412: { G: 'sandy', S: 'trash' }, 585: { S: 'summer', A: 'autumn', W: 'winter' }, 351: { S: 'sunny', R: 'rainy', H: 'snowy' } };
    if (L && special[+d] && special[+d][L]) return `${d}-${special[+d][L]}`;
    if (L === 'A') return `${d}-alola`;
    if (L === 'G') return `${d}-galar`;
    if (L === 'H') return `${d}-hisui`;
    if (L === 'P') return `${d}-paldea`;
    if (L === 'W') return `${d}-white-striped`;
    if (L === 'B') return `${d}-blue-striped`;
    if (L) return null;
    return d;
  };
  for (let i = 1; i < sections.length; i += 2) {
    const name = sections[i].trim();
    const body = sections[i + 1];
    const hm = body.match(/====Hatchable Pokémon====([\s\S]*?)(?=\n====|\n===|$)/);
    if (!hm) continue;
    const season = matchSeason(name) || SEASONS.find(s => s.en === name || s.en.replace('Season of ', '') === name);
    if (!season) { report.notes.push(`Bulbapedia saison non reliée : ${name}`); continue; }
    const pool = {};
    const parts = hm[1].split(/\|-\s*/);
    for (const p of parts) {
      const lab = (p.match(/\|\s*(?:style="[^"]*"\s*\|)?\s*([0-9]+\s*km[^\n]*)/i) || [])[1];
      if (!lab) continue;
      const d = distToTag(lab.replace(/<br[\s\S]*/, ' ') + (/adventure/i.test(lab) ? ' Adventure Sync' : /route/i.test(lab) ? ' Routes' : ''));
      if (!d) continue;
      if (/adventure/i.test(lab)) d.tag = 'as';
      else if (/route/i.test(lab)) d.tag = 'gr';
      else if (d.km === 7 && !d.tag) d.tag = 'ga';
      for (const it of p.matchAll(/\{\{MSP\/GO\|(\d{3,4})([A-Za-z0-9]*)\|([^|}]+)/g)) {
        const key = formOf(it[1], it[2], it[3]);
        if (!key || !byKey[key]) { report.unmapped.push(['bulbapedia', `${it[1]}${it[2]} ${it[3]} (${name})`]); continue; }
        addPool(pool, key, d.km, d.tag);
      }
    }
    out[season.id] = pool;
  }
  return out;
}

function parseLeekduckEventEggs(html) {
  // Season event page lists some hatches (the page warns the list is not exhaustive). Used to complement
  // a Serebii snapshot that may be incomplete (e.g. Forever Forward: empty Adventure Sync, almost empty 10 km).
  const pool = {};
  const chunks = html.split(/<h3[^>]*>/i).slice(1);
  for (const ch of chunks) {
    const title = unesc((ch.match(/^([^<]+)/) || [])[1] || '');
    if (!/\bkm eggs/i.test(title)) continue;
    const km = +(title.match(/(\d+)\s*km/i) || [])[1];
    if (!km) continue;
    let tag = '';
    if (/adventure sync/i.test(title)) tag = 'as';
    else if (/route/i.test(title)) tag = 'gr';
    else if (km === 7) tag = 'ga';
    const end = ch.split(/<h[23]/i)[0];
    const text = unesc(end.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, '\n'));
    const names = text.split(/\n/).map(x => x.replace(/\s+/g, ' ').trim()).filter(x => x && !/adventure sync|km eggs|here are|advertisement|gift exchange|mateo/i.test(x));
    for (let name of names) {
      let suf = '';
      if (/\(female\)/i.test(name)) suf = 'female';
      else if (/\(male\)/i.test(name)) suf = '';
      if (/^(Alolan)\s+/i.test(name) || /alolan? form/i.test(name)) suf = 'alola';
      if (/^(Galarian)\s+/i.test(name) || /galarian form/i.test(name)) suf = 'galar';
      if (/^(Hisuian)\s+/i.test(name) || /hisuian form/i.test(name)) suf = 'hisui';
      if (/^(Paldean)\s+/i.test(name) || /paldean form/i.test(name)) suf = 'paldea';
      const form = NAME_FORM.find(([re]) => re.test(name));
      if (form) suf = form[1];
      name = name.replace(/\s*\([^)]*\)\s*$/, '').replace(/^(Alolan|Galarian|Hisuian|Paldean)\s+/i, '').trim();
      const entries = byEn.get(name.toLowerCase()) || [];
      let key = null;
      if (suf) key = entries.find(e => e.k === entries[0].id + '-' + suf || e.k.endsWith('-' + suf))?.k;
      if (!key) key = entries.find(e => e.k === String(e.id))?.k || (suf ? null : entries[0]?.k);
      if (!key) { report.unmapped.push(['leekduck-event', name + (suf ? ' / ' + suf : '')]); continue; }
      addPool(pool, key, km, tag);
    }
  }
  return pool;
}

function countPool(p) { return Object.keys(p || {}).length; }
function unionPool(a, b) {
  const o = {};
  for (const src of [a, b]) for (const [k, arr] of Object.entries(src || {})) for (const e of arr) addPool(o, k, e[0], e[1] || '');
  return o;
}

// ---- build ----
attachFrNames();
const bbDates = parseBulbapediaDates();
for (const s of SEASONS) {
  const d = bbDates.find(x => seasonSlug(x.name) === s.id || seasonSlug(x.name) === seasonSlug(s.en) || x.name === s.en);
  if (d) {
    if (d.from && s.from && d.from !== s.from) report.notes.push(`date début ${s.en}: table interne ${s.from}, Bulbapedia ${d.from}`);
    if (d.to && s.to && d.to !== s.to) report.notes.push(`date fin ${s.en}: table interne ${s.to}, Bulbapedia ${d.to}`);
  }
}

const prevHtml = rd('serebii-previouseggs.html');
const curHtml = rd('serebii-eggs.html');
const prevTabs = splitSerebiiTabs(prevHtml);
const curTabs = splitSerebiiTabs(curHtml);
// Current Serebii page has no b-tab; treat the whole page as Forever Forward (anchors still say so, checked 2026-11-24)
if (curTabs.length === 1 && !curTabs[0].title) {
  const anc = curHtml.match(/Forever Forwards? \(([^)]+)\)/);
  curTabs[0].title = anc ? `Forever Forward (${anc[1]})` : 'Forever Forward';
}

const MIXED_TITLE = '1/3/22-30/6/22'; // Alola + start of Season of GO
const seasonPools = new Map(SEASONS.map(s => [s.id, { meta: s, pool: {}, src: new Set(), periods: [] }]));
const dated = []; // pre-season and the mixed tab

function ingestTab(title, body, srcName) {
  const { pool, n } = parseSerebiiRows(body);
  const season = matchSeason(title);
  const dates = parseSerebiiTitleDates(title);
  if (title.replace(/\s+/g, '') === MIXED_TITLE.replace(/\s+/g, '') || title.trim() === MIXED_TITLE) {
    dated.push({ id: 'period-2022-03-01-alola-go', kind: 'mix', en: title, fr: 'Saison d’Alola et début de la Saison GO',
      from: '2022-03-01', to: '2022-06-30', label: title, src: srcName, pool, note: 'Onglet Serebii unique pour ces dates : il chevauche la Saison d’Alola (jusqu’au 1er juin) et le début de la Saison GO. Non attribué à une seule saison.' });
    report.notes.push(`onglet mixte « ${title} » : ${countPool(pool)} espèces, conservé comme période datée (chevauche Alola et GO)`);
    return;
  }
  if (season) {
    const rec = seasonPools.get(season.id);
    rec.pool = unionPool(rec.pool, pool);
    rec.src.add(srcName);
    if (dates.from && dates.to && (dates.from !== season.from || dates.to !== season.to)) {
      rec.periods.push({ from: dates.from, to: dates.to, label: title, src: srcName, n: countPool(pool) });
    }
    return;
  }
  // pre-season / unlabelled
  const id = 'pre-' + (dates.from || seasonSlug(title) || 'unknown');
  dated.push({ id, kind: 'pre', en: title, fr: 'Avant les saisons', from: dates.from, to: dates.to, label: title, src: srcName, pool, point: !!dates.point, month: !!dates.month });
}

for (const t of prevTabs) ingestTab(t.title, t.body, 'serebii-previous');
for (const t of curTabs) ingestTab(t.title, t.body, 'serebii-current');

// Forever Forward AS (partial) from the Leek Duck event page
const ffEv = parseLeekduckEventEggs(rd('leekduck-event-forever-forward.html'));
if (countPool(ffEv)) {
  const rec = seasonPools.get('forever-forward');
  rec.pool = unionPool(rec.pool, ffEv);
  rec.src.add('leekduck-event');
  rec.eventPartial = true;
  report.notes.push(`Toujours en avant : pool Serebii unionné avec la page d’événement Leek Duck (${countPool(ffEv)} espèces listées ; la page précise que la liste n’est pas exhaustive)`);
}

const leek = parseEggsHtml(rd('leekduck-eggs.html'), byKey);
const livePath = path.join(HERE, '.cache', 'leekduck-eggs.txt');
if (fs.existsSync(livePath)) {
  const live = parseEggsHtml(fs.readFileSync(livePath, 'utf8'), byKey);
  if (live.season && (!leek.updated || (live.updated && live.updated >= leek.updated))) {
    leek.byKey = live.byKey; leek.season = live.season; leek.updated = live.updated;
    leek.unmapped = live.unmapped;
    report.notes.push('pool actuel lu depuis build/.cache/leekduck-eggs.txt (plus récent que le cache v60-26)');
  }
}
if (leek.unmapped.length) for (const u of leek.unmapped) report.unmapped.push(['leekduck-actuel', u]);
const curId = seasonSlug(leek.season) || 'twilight-trails';
if (seasonPools.has(curId)) {
  const rec = seasonPools.get(curId);
  rec.pool = unionPool(rec.pool, leek.byKey);
  rec.src.add('leekduck');
  rec.upd = leek.updated;
} else if (leek.season) {
  report.notes.push('nouvelle saison Leek Duck non listée : ' + leek.season);
}

// Cross-check Bulbapedia highlights vs Serebii (+ current)
const bbHatch = parseBulbapediaHatch();
const bbOnly = [];
for (const [id, pool] of Object.entries(bbHatch)) {
  const rec = seasonPools.get(id);
  const have = rec ? rec.pool : {};
  for (const [k, arr] of Object.entries(pool)) {
    for (const e of arr) {
      const tag = e[1] || '';
      if (!have[k] || !have[k].some(x => x[0] === e[0] && (x[1] || '') === tag)) {
        bbOnly.push(`${id}:${k}:${e[0]}${tag ? ':' + tag : ''}`);
      }
    }
  }
}
if (bbOnly.length) report.notes.push(`Bulbapedia mentionne ${bbOnly.length} couple(s) (saison, espèce, distance) absents de Serebii ; non ajoutés (tables Bulbapedia = extraits, pas des pools complets). Ex. : ${bbOnly.slice(0, 8).join(', ')}`);


const MOIS_FR = { 1: 'janvier', 2: 'février', 3: 'mars', 4: 'avril', 5: 'mai', 6: 'juin', 7: 'juillet', 8: 'août', 9: 'septembre', 10: 'octobre', 11: 'novembre', 12: 'décembre' };
const MOIS_EN_FULL = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };
function frYMD(iso) { if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; }
function labelFrPre(p) {
  const lab = (p.label || p.en || '').trim();
  if (/^1\.0$/.test(lab)) return 'lancement (juillet 2016)';
  if (/hatchathon/i.test(lab)) return p.from && p.to ? `Marathon Éclosion (${frYMD(p.from)} – ${frYMD(p.to)})` : 'Marathon Éclosion';
  const stripped = lab.replace(/^\d+\.\d+(?:\.\d+)?\s+/, '');
  const mo = 'January|February|March|April|May|June|July|August|September|October|November|December';
  let m = stripped.match(new RegExp(`^(${mo})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\s+(\\d{4})\\s*-\\s*(${mo})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\s+(\\d{4})$`, 'i'));
  if (m) return `${pad(+m[2])}/${pad(MOIS_EN_FULL[m[1].toLowerCase()])}/${m[3]} – ${pad(+m[5])}/${pad(MOIS_EN_FULL[m[4].toLowerCase()])}/${m[6]}`;
  m = stripped.match(new RegExp(`^(${mo})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\s+(\\d{4})\\s*-\\s*(${mo})\\s+(\\d{4})$`, 'i'));
  if (m) return `${pad(+m[2])}/${pad(MOIS_EN_FULL[m[1].toLowerCase()])}/${m[3]} – ${MOIS_FR[MOIS_EN_FULL[m[4].toLowerCase()]]} ${m[5]}`;
  m = stripped.match(new RegExp(`^(${mo})\\s+(\\d{4})\\s*-\\s*(${mo})\\s+(\\d{4})$`, 'i'));
  if (m) return `${MOIS_FR[MOIS_EN_FULL[m[1].toLowerCase()]]} ${m[2]} – ${MOIS_FR[MOIS_EN_FULL[m[3].toLowerCase()]]} ${m[4]}`;
  m = stripped.match(new RegExp(`^(${mo})\\s+(\\d{4})$`, 'i'));
  if (m) return `${MOIS_FR[MOIS_EN_FULL[m[1].toLowerCase()]]} ${m[2]}`;
  const yy = y => y.length === 2 ? String(+y >= 70 ? 1900 + +y : 2000 + +y) : y;
  m = stripped.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s*-\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) return `${pad(+m[1])}/${pad(+m[2])}/${yy(m[3])} – ${pad(+m[4])}/${pad(+m[5])}/${yy(m[6])}`;
  m = stripped.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) return `${pad(+m[1])}/${pad(+m[2])}/${yy(m[3])}`;
  if (p.point && p.from) return frYMD(p.from);
  if (p.month && p.from) {
    const [y, moN] = p.from.split('-');
    if (p.to && p.to.slice(0, 7) !== p.from.slice(0, 7)) {
      const [y2, mo2] = p.to.split('-');
      return `${MOIS_FR[+moN]} ${y} – ${MOIS_FR[+mo2]} ${y2}`;
    }
    return `${MOIS_FR[+moN]} ${y}`;
  }
  if (p.from && p.to && p.from !== p.to) return `${frYMD(p.from)} – ${frYMD(p.to)}`;
  if (p.from) return frYMD(p.from);
  return lab;
}

// Build history object
const src = [
  ['Leek Duck — Eggs (pool de la saison en cours, communautaires)', 'https://leekduck.com/eggs/'],
  ['Serebii — Previous Egg Pokémon (archives des pools)', 'https://www.serebii.net/pokemongo/previouseggs.shtml'],
  ['Serebii — Pokémon Eggs (page encore titrée Forever Forward le 24/11/2026)', 'https://www.serebii.net/pokemongo/eggs.shtml'],
  ['Leek Duck — Forever Forward (Aventure Synchro, liste partielle)', 'https://leekduck.com/events/season-23-forever-forward/'],
  ['Poképédia — listes des événements (noms français des saisons), CC BY-NC-SA 3.0 FR', 'https://www.pokepedia.fr/Liste_des_%C3%A9v%C3%A9nements_de_Pok%C3%A9mon_GO_(2026)'],
  ['Bulbapedia — Season (GO) (dates, contrôle des extraits « Hatchable Pokémon »)', 'https://bulbapedia.bulbagarden.net/wiki/Season_(GO)'],
  ['Pokémon GO — Sentiers crépusculaires (page officielle de la saison en cours)', 'https://pokemongo.com/fr/seasons/twilight-trails'],
  ['Pokémon GO — Toujours en avant (page officielle, nom FR)', 'https://pokemongo.com/fr/seasons/forever-forward'],
  ['Pokémon GO — Marathon Éclosion (14–27 novembre 2018, dates et nom FR officiels)', 'https://pokemongo.com/fr/news/sinnoh-hatchathon']
];

const seasons = [];
for (const s of SEASONS) {
  const rec = seasonPools.get(s.id);
  const o = { id: s.id, en: s.en, fr: s.fr || null, from: s.from, to: s.to, src: [...rec.src].join('+') || null, pool: rec.pool };
  if (rec.upd) o.upd = rec.upd;
  if (rec.eventPartial) o.eventPartial = true;
  if (rec.periods.length) o.serebiiRanges = rec.periods.map(p => ({ from: p.from, to: p.to, label: p.label }));
  seasons.push(o);
}
for (const p of dated) {
  const o = { id: p.id, kind: p.kind, en: p.en, fr: p.fr, from: p.from || null, to: p.to || null, label: p.label, src: p.src, pool: p.pool, note: p.note || null, month: p.month || null, point: p.point || null };
  if (p.kind === 'pre') o.labelFr = labelFrPre(p);
  seasons.push(o);
}
const febJul = dated.find(p => /february 2018\s*-\s*july 2018/i.test(p.label || ''));
const jul18 = dated.find(p => /^july 2018$/i.test((p.label || '').trim()));
const oct18 = dated.find(p => /^october 2018$/i.test((p.label || '').trim()));
if (febJul && jul18) {
  const A = new Set(Object.keys(febJul.pool || {})), B = new Set(Object.keys(jul18.pool || {}));
  report.notes.push(`Chevauchement de libellés Serebii : « ${labelFrPre(febJul)} » et « ${labelFrPre(jul18)} » partagent le mois de juillet (Serebii n’indique pas le jour de changement). Ce sont des instantanés successifs : juillet 2018 reprend les ${A.size} espèces de février–juillet et en ajoute ${[...B].filter(k => !A.has(k)).length} (Taupiqueur d’Alola, Canarticho, Kangourex, M. Mime, Tauros). « ${oct18 ? labelFrPre(oct18) : 'octobre 2018'} » ne chevauche pas une période voisine datée au jour près (après juillet 2018, avant le Marathon Éclosion du 14/11/2018) ; un trou août–septembre 2018 est possible si le pool de juillet n’a pas duré jusqu’en octobre, mais les sources ne le tranchent pas.`);
}
report.notes.push('Season of Celebration : pas de nom FR officiel trouvé (page saison 404, article /fr/post/season-of-celebration-2020 resté en anglais, pas de page Poképédia) — le nom anglais est conservé.');

// Keep a previous current-season union if we re-run after a weekly update (same current id)
const prev = loadEggHistory();
if (prev && prev.current === curId) {
  const old = (prev.seasons || []).find(s => s.id === curId);
  const rec = seasons.find(s => s.id === curId);
  if (old?.pool && rec) rec.pool = unionPool(rec.pool, old.pool);
}

const hist = {
  src, checked: '2026-11-24', current: curId, updated: leek.updated || null,
  seasons
};
writeEggHistory(hist);

// Stats
const named = seasons.filter(s => !s.kind);
const pre = seasons.filter(s => s.kind === 'pre');
const mix = seasons.filter(s => s.kind === 'mix');
const keys = new Set();
for (const s of seasons) for (const k of Object.keys(s.pool || {})) keys.add(k);
const withFr = named.filter(s => s.fr).length;
const empty = named.filter(s => !countPool(s.pool));
const uniqueUnmapped = [...new Set(report.unmapped.map(x => x.join(':')))];
const uniqueSkip = [...new Set(report.skipped.map(x => x.join(':')))];

const reportPath = path.join(CACHE, 'report.json');
fs.writeFileSync(reportPath, JSON.stringify({
  current: { id: curId, season: leek.season, updated: leek.updated, n: Object.keys(leek.byKey).length },
  seasons: named.map(s => ({ id: s.id, fr: s.fr, n: countPool(s.pool), src: s.src })),
  pre: pre.map(s => ({ id: s.id, label: s.label, labelFr: s.labelFr, from: s.from, to: s.to, n: countPool(s.pool) })),
  mix: mix.map(s => ({ id: s.id, n: countPool(s.pool) })),
  species: keys.size,
  empty: empty.map(s => s.id),
  unmapped: uniqueUnmapped,
  skipped: uniqueSkip,
  doubtful: report.doubtful,
  notes: report.notes,
  bbOnlyCount: bbOnly.length,
  bbOnlySample: bbOnly.slice(0, 30)
}, null, 2));

console.log(`fix-v60-26 : ${named.length} saisons nommées (${withFr} avec nom FR), ${pre.length} périodes avant les saisons, ${mix.length} période mixte, ${keys.size} espèces, pool actuel ${leek.season} ${Object.keys(leek.byKey).length} fiches (${leek.updated})`);
if (empty.length) console.log('  saisons sans pool :', empty.map(s => s.id).join(', '));
console.log('  non reliés :', uniqueUnmapped.length, uniqueUnmapped.slice(0, 12).join(' | ') || '—');
console.log('  ignorés (costumes) :', uniqueSkip.length);
console.log('  douteux :', report.doubtful.length, report.doubtful.map(x => x[1]).join(' | ') || '—');
for (const n of report.notes) console.log('  note :', n);
console.log('  écrit', EGGS_FILE, 'et', reportPath);
