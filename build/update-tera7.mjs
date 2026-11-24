// Construit docs/data/tera7.json (raids Téracristal 7★ événementiels d’Écarlate / Violet).
// Réutilisable : ajoute les nouvelles fenêtres / les nouveaux boss, sans jamais effacer l’historique.
//   node build/update-tera7.mjs            cache d’abord, télécharge les pages manquantes
//   node build/update-tera7.mjs --offline  cache uniquement (utilisé par fix-v60-31.mjs)
//   node build/update-tera7.mjs --refresh  retélécharge les sources
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const CACHE = path.join(HERE, 'cache/v60-31');
const OUT = path.join(ROOT, 'docs/data/tera7.json');
const CORE = path.join(ROOT, 'docs/data/core.json');
const UA = 'PokedexPWA/1.0 (personal non-commercial PWA; https://github.com/SIGjoueA/pokedex; data cached)';
const DELAY = 300;
const OFFLINE = process.argv.includes('--offline');
const REFRESH = process.argv.includes('--refresh');

const TYPE_FR_TO = {
  Normal: 'normal', Feu: 'fire', Eau: 'water', Plante: 'grass',
  Électrik: 'electric', Electrik: 'electric', Électrique: 'electric', Electrique: 'electric',
  Glace: 'ice', Combat: 'fighting', Poison: 'poison', Sol: 'ground', Vol: 'flying',
  Psy: 'psychic', Insecte: 'bug', Roche: 'rock', Spectre: 'ghost', Dragon: 'dragon',
  Ténèbres: 'dark', Acier: 'steel', Fée: 'fairy'
};
const TYPE_EN_TO = {
  normal: 'normal', fire: 'fire', water: 'water', grass: 'grass', electric: 'electric',
  ice: 'ice', fighting: 'fighting', poison: 'poison', ground: 'ground', flying: 'flying',
  psychic: 'psychic', bug: 'bug', rock: 'rock', ghost: 'ghost', dragon: 'dragon',
  dark: 'dark', steel: 'steel', fairy: 'fairy', stellar: 'stellar'
};
const NATURE_FR = {
  Hardy: 'Hardi', Lonely: 'Solo', Brave: 'Brave', Adamant: 'Rigide', Naughty: 'Mauvais',
  Bold: 'Assuré', Docile: 'Docile', Relaxed: 'Relax', Impish: 'Malin', Lax: 'Lâche',
  Timid: 'Timide', Hasty: 'Pressé', Serious: 'Sérieux', Jolly: 'Jovial', Naive: 'Naïf',
  Modest: 'Modeste', Mild: 'Doux', Quiet: 'Discret', Bashful: 'Pudique', Rash: 'Foufou',
  Calm: 'Calme', Gentle: 'Gentil', Sassy: 'Malpoli', Careful: 'Prudent', Quirky: 'Bizarre',
  Random: 'Aléatoire'
};
const MONTHS_EN = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12
};
const MONTHS_FR = {
  janvier: 1, février: 2, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6,
  juillet: 7, août: 8, aout: 8, septembre: 9, octobre: 10, novembre: 11, décembre: 12, decembre: 12
};

const sleep = ms => new Promise(r => setTimeout(r, ms));
const read = f => fs.readFileSync(f, 'utf8');
const exists = f => fs.existsSync(f) && fs.statSync(f).size > 0;
function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

async function fetchTo(url, dest) {
  if (!REFRESH && exists(dest)) return true;
  if (OFFLINE) return exists(dest);
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) return false;
  const buf = Buffer.from(await res.arrayBuffer());
  if (!buf.length) return false;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf);
  await sleep(DELAY);
  return true;
}

function parseCsvLine(line) {
  const out = []; let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}
function loadCsvMap(file, idCol, langEn = '9', langFr = '5') {
  const en = new Map(), fr = new Map();
  const lines = read(file).split(/\r?\n/);
  const head = parseCsvLine(lines[0]);
  const iId = head.indexOf(idCol), iLang = head.indexOf('local_language_id'), iName = head.indexOf('name');
  for (const line of lines.slice(1)) {
    if (!line) continue;
    const cols = parseCsvLine(line);
    if (cols.length <= Math.max(iId, iLang, iName)) continue;
    const id = cols[iId], lang = cols[iLang], name = cols[iName];
    if (lang === langEn) en.set(id, name);
    if (lang === langFr) fr.set(id, name);
  }
  const en2fr = new Map();
  for (const [id, e] of en) if (fr.has(id)) en2fr.set(e.toLowerCase(), fr.get(id));
  return en2fr;
}

function loadCoreIndex() {
  const core = JSON.parse(read(CORE));
  const byName = new Map(), byIdDefault = new Map();
  for (const e of core.e) {
    byName.set(e.n.normalize('NFC'), e);
    const id = String(e.id);
    if (!String(e.k).includes('-') && !byIdDefault.has(id)) byIdDefault.set(id, e);
    if (String(e.k) === id && !byIdDefault.has(id)) byIdDefault.set(id, e);
  }
  return { byName, byIdDefault, all: core.e };
}

function resolveMon(by, nom, forme) {
  const n = nom.replace(/\s+/g, ' ').trim().normalize('NFC');
  let form = (forme || '').trim();
  if (/^hisui$/i.test(form)) {
    const hisui = by.byName.get(n + ' de Hisui') || by.all.find(e => e.n === n + ' de Hisui' || (e.k === (by.byName.get(n)?.id + '-hisui')));
    if (hisui) return hisui;
    const base = by.byName.get(n);
    if (base) {
      const k = base.id + '-hisui';
      const e = by.all.find(x => x.k === k);
      if (e) return e;
    }
  }
  const exact = by.byName.get(n);
  if (exact && !form) return exact;
  if (exact && form) {
    const slug = form.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');
    const e = by.all.find(x => x.k === exact.id + '-' + slug);
    if (e) return e;
  }
  return exact || null;
}

function parseCapacites(s) {
  if (!s) return { moves: [], raidMoves: [] };
  const [a, b] = s.split(';').map(x => x.trim());
  const split = t => (t || '').split(',').map(x => x.replace(/\s+/g, ' ').trim()).filter(Boolean);
  return { moves: split(a), raidMoves: split(b) };
}

function parseFrRanges(text) {
  const t = text.replace(/<br\s*\/?>/gi, '\n').replace(/&nbsp;/g, ' ').replace(/–|—|−/g, '–');
  const out = [];
  // 30/12/2022–01/01/2023
  const full = /(\d{1,2})\/(\d{1,2})\/(\d{4})–(\d{1,2})\/(\d{1,2})\/(\d{4})/g;
  let m;
  const used = new Set();
  while ((m = full.exec(t))) {
    out.push({ s: iso(+m[3], +m[2], +m[1]), e: iso(+m[6], +m[5], +m[4]) });
    used.add(m.index);
  }
  // 28/08–03/09/2026  or  02–04/12/2022  or  05–07/12/2025
  const mid = /(\d{1,2})(?:\/(\d{1,2}))?–(\d{1,2})\/(\d{1,2})\/(\d{4})/g;
  while ((m = mid.exec(t))) {
    if ([...used].some(i => m.index >= i && m.index < i + 30)) continue;
    const y = +m[5], m2 = +m[4], d2 = +m[3], d1 = +m[1], m1 = m[2] ? +m[2] : m2;
    out.push({ s: iso(y, m1, d1), e: iso(y, m2, d2) });
  }
  return out;
}

function parseFrProse(text) {
  // « du 5 au 7 et du 12 au 14 décembre 2025 et du 20 au 26 novembre 2026 »
  let t = text.replace(/<sup>\s*er\s*<\/sup>/gi, '').replace(/1\s*er\b/gi, '1');
  t = t.replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
  const months = Object.keys(MONTHS_FR).join('|');
  // isolate the sentence with se déroulait / se déroule / prévu
  const sent = (t.match(/se déroul(?:ait|e)[^.]*?(?:\.(?=\s|$)|$)/i) || t.match(/du \d{1,2}[^.]{0,200}(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)[^.]{0,80}/i) || [t])[0];
  const out = [];
  // collect "du D au D mois année" and "du D mois au D mois année" fragments, carrying year/month forward
  const re = /du\s+(\d{1,2})(?:\s+au\s+(\d{1,2}))?(?:\s+(\w+))?(?:\s+(\d{4}))?(?:\s+au\s+(\d{1,2})(?:\s+(\w+))?(?:\s+(\d{4}))?)?/gi;
  // This is messy. Simpler: find all (du X [mois] au Y mois année) units.
  const unit = /du\s+(\d{1,2})(?:er)?(?:\s+(\w+))?(?:\s+(\d{4}))?\s+au\s+(\d{1,2})(?:er)?(?:\s+(\w+))?(?:\s+(\d{4}))?/gi;
  const units = [];
  let m;
  while ((m = unit.exec(sent))) units.push(m);
  // assign months and years from the right (later units have explicit month/year; earlier inherit)
  let year = null, month = null;
  for (let i = units.length - 1; i >= 0; i--) {
    const u = units[i];
    const m2n = u[5] && MONTHS_FR[u[5].toLowerCase()];
    const m1n = u[2] && MONTHS_FR[u[2].toLowerCase()];
    const y2 = u[6] ? +u[6] : null;
    const y1 = u[3] ? +u[3] : null;
    if (y2) year = y2;
    else if (y1) year = y1;
    u._y2 = y2 || year;
    u._y1 = y1 || u._y2;
    if (m2n) month = m2n;
    u._m2 = m2n || month;
    u._m1 = m1n || u._m2;
  }
  for (const u of units) {
    if (u._m1 && u._m2 && u._y1 && u._y2) out.push({ s: iso(u._y1, u._m1, +u[1]), e: iso(u._y2, u._m2, +u[4]) });
  }
  return out;
}

function parseEnRanges(text) {
  const t = text.replace(/&nbsp;/g, ' ').replace(/–|—/g, '-').replace(/\s+/g, ' ');
  const mon = Object.keys(MONTHS_EN).join('|');
  const day = `(\\d{1,2})(?:st|nd|rd|th)?`;
  const month = `(${mon})`;
  const year = `(\\d{4})`;
  const date = `${month}\\s+${day}(?:\\s*,?\\s*${year})?`;
  const re = new RegExp(`${date}\\s*(?:-|to)\\s*${date}`, 'gi');
  const out = [];
  let m;
  while ((m = re.exec(t))) {
    const m1 = MONTHS_EN[m[1].toLowerCase()], d1 = +m[2], y1 = m[3] ? +m[3] : null;
    const m2 = MONTHS_EN[m[4].toLowerCase()], d2 = +m[5], y2 = m[6] ? +m[6] : null;
    const Y2 = y2 || y1, Y1 = y1 || Y2;
    if (!Y1 || !Y2) continue;
    out.push({ s: iso(Y1, m1, d1), e: iso(Y2, m2, d2) });
  }
  return out;
}

function uniqWindows(L) {
  const m = new Map();
  for (const w of L) {
    if (!w || !w.s || !w.e) continue;
    const k = w.s + '/' + w.e;
    if (!m.has(k)) m.set(k, { s: w.s, e: w.e });
  }
  return [...m.values()].sort((a, b) => a.s.localeCompare(b.s) || a.e.localeCompare(b.e));
}

function parseInvokeLine(line) {
  const raw = line.replace(/\s+/g, ' ').trim();
  const m = raw.match(/^(.+?)\s*\/\s*(.*)$/);
  if (!m) return null;
  let left = m[1].trim(), rest = m[2];
  let forme = null;
  const fm = left.match(/^(.*?)\s+forme\(([^)]+)\)\s*$/);
  if (fm) { left = fm[1].trim(); forme = fm[2].trim(); }
  const get = key => {
    const r = new RegExp(key + '\\(([^)]*)\\)');
    const x = rest.match(r);
    return x ? x[1].trim() : null;
  };
  const diff = get('difficulté');
  if (diff !== '7') return null;
  const caps = parseCapacites(get('capacités'));
  return {
    nom: left, forme,
    teraFr: get('type-téracristal'),
    ha: get('talent-caché'),
    lv: +(get('niveau') || 100),
    moves: caps.moves, raidMoves: caps.raidMoves,
    notes: get('notes') || ''
  };
}

function parsePokepediaEvents(by) {
  const raids = []; // one per event boss line
  const maxEvt = 200;
  for (let n = 1; n <= maxEvt; n++) {
    const f = path.join(CACHE, `Cristal_de_raid_événementiel_${n}.wiki`);
    if (!exists(f)) continue;
    const t = read(f);
    const prose = parseFrProse(t);
    // invoke block
    const inv = t.match(/\{\{#invoke:Tableau Pokémon\|teracristal[\s\S]*?\n\}\}/);
    const block = inv ? inv[0] : t;
    for (const line of block.split('\n')) {
      if (!/difficulté\(7\)/.test(line)) continue;
      const p = parseInvokeLine(line);
      if (!p) continue;
      const mon = resolveMon(by, p.nom, p.forme);
      if (!mon) throw new Error(`Espèce inconnue « ${p.nom} » forme(${p.forme || ''}) (événement ${n})`);
      const tera = TYPE_FR_TO[p.teraFr];
      if (!tera) throw new Error(`Type Téra inconnu « ${p.teraFr} » (événement ${n}, ${p.nom})`);
      const notes = p.notes;
      const once = /Capturable une seule fois/i.test(notes) || /n'est capturable qu'une seule fois/i.test(t);
      const shinyNever = /Jamais chromatique/i.test(notes);
      let ver = '';
      if (/\bExclusif Ec\b/i.test(notes)) ver = 's';
      if (/\bExclusif Vi\b/i.test(notes)) ver = 'v';
      const feat = [];
      const featRe = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
      let fm;
      while ((fm = featRe.exec(t.split('==')[0] + ' ' + notes))) {
        const name = fm[1].trim();
        if (p.moves.includes(name) || p.raidMoves.includes(name)) feat.push(name);
      }
      // « connaissant la capacité Surf » without link sometimes
      for (const mv of [...p.moves, ...p.raidMoves]) {
        if (new RegExp('capacit[ée]s?\\s+' + mv.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(t) && !feat.includes(mv)) feat.push(mv);
      }
      const held = (notes.match(/\[\[([^\]|]+)\]\] tenue/i) || [])[1] || '';
      const mark = /Insigne Surpuissant/i.test(notes) || /Insigne\]\] Surpuissant/i.test(t);
      raids.push({
        ev: n, k: mon.k, n: mon.n, tera, ha: p.ha, lv: p.lv,
        moves: p.moves, raidMoves: p.raidMoves, notes, once, shinyNever, ver,
        feat: feat[0] || null, held, mark, windowsProse: prose, srcPage: `Cristal de raid événementiel ${n}`
      });
    }
  }
  return raids;
}

function parsePokepediaTable() {
  const f = path.join(CACHE, 'Raid_Téracristal.wiki');
  const t = read(f);
  const byEvt = new Map();
  const re = /\[\[Cristal de raid événementiel (\d+)(?:\|[^\]]*)?\]\]/g;
  const hits = [...t.matchAll(re)];
  for (let i = 0; i < hits.length; i++) {
    const n = +hits[i][1];
    const start = hits[i].index;
    const end = i + 1 < hits.length ? hits[i + 1].index : t.length;
    const chunk = t.slice(start, end);
    const dates = parseFrRanges(chunk);
    byEvt.set(n, uniqWindows(dates));
  }
  return byEvt;
}

function splitSerebiiBosses(html) {
  // Date header
  const h1 = html.match(/<h1>Event Raid\s*-\s*([^<]+)<\/h1>([\s\S]*?)<\/td><\/tr>/i);
  const title = h1 ? h1[1].replace(/&eacute;/g, 'é').replace(/&amp;/g, '&').trim() : '';
  const headerDates = h1 ? parseEnRanges(h1[2]) : [];
  const chunks = html.split(/<td class="pkmn"/i).slice(1);
  const bosses = [];
  for (const ch of chunks) {
    const stars = (ch.match(/&star;/g) || []).length;
    if (stars !== 7 && !/★★★★★★★/.test(ch) && !/7 Star/i.test(ch)) continue;
    // if Star Level present but not 7, skip
    const sl = ch.match(/<b>Star Level<\/b><br\s*\/?>([\s\S]*?)(?:<b>Notes|<\/td>)/i);
    if (sl && (sl[1].match(/&star;/g) || []).length && (sl[1].match(/&star;/g) || []).length !== 7) continue;
    const img = ch.match(/\/(?:scarletviolet\/pokemon\/(?:new\/)?|pokedex-sv\/)([\w.-]+)\.(?:png|gif|jpg)/i) || ch.match(/\/pokedex-sv\/([^"/]+)/i);
    const abil = (ch.match(/<b>Ability\??<\/b><br\s*\/?>\s*(?:<a[^>]*>)?\s*<u>([^<]+)<\/u>/i) || [])[1] || '';
    const nature = (ch.match(/<b>Nature<\/b><br\s*\/?>\s*([A-Za-z]+)/i) || [])[1] || '';
    const teraM = ch.match(/teraicon\/([a-z]+)\.png/i) || ch.match(/<b>Tera Type<\/b>[\s\S]*?<br\s*\/?>\s*([A-Za-z]+)/i);
    let tera = teraM ? teraM[1].toLowerCase() : '';
    if (tera === 'tera type') {
      const t2 = ch.match(/<b>Tera Type<\/b>[\s\S]*?alt="[^"]*"[\s\S]*?<br\s*\/?>\s*([A-Za-z]+)/i);
      tera = t2 ? t2[1].toLowerCase() : '';
    }
    tera = TYPE_EN_TO[tera] || tera;
    const mvBlock = ch.match(/<b>Moves<\/b><br\s*\/?>([\s\S]*?)(?:<b>Additional Moves<\/b>|<b>Star Level<\/b>|<\/tr>)/i);
    const addBlock = ch.match(/<b>Additional Moves<\/b><br\s*\/?>([\s\S]*?)(?:<\/tr>|<b>Star Level<\/b>)/i);
    const names = blk => blk ? [...blk.matchAll(/>([A-Za-z][^<]*)<\/a>/g)].map(x => x[1].trim()) : [];
    const shiny = /<b>Shiny Rate\??<\/b><br\s*\/?>\s*Never/i.test(ch);
    const mark = /Mightiest Mark/i.test(ch);
    const once = /Only catchable once/i.test(ch);
    const held = ((ch.match(/<b>Held Item\??<\/b><br\s*\/?>\s*([^<\n]+)/i) || [])[1] || '').trim();
    const href = (ch.match(/href="\/pokedex-sv\/([^"]+)"/i) || [])[1] || '';
    bosses.push({ title, windows: headerDates, abil, nature, tera, moves: names(mvBlock ? mvBlock[1] : ''), raidMoves: names(addBlock ? addBlock[1] : ''), shinyNever: shiny, mark, once, held: /none/i.test(held) ? '' : held, href, img: img && img[1] });
  }
  return bosses;
}

function parseBulbapedia() {
  const f = path.join(CACHE, 'Bulbapedia_Tera_Raid_Battle.wiki');
  const t = read(f);
  const i = t.indexOf('=====7★ Raids=====');
  if (i < 0) throw new Error('Table 7★ Bulbapedia introuvable');
  // next ===== of same or higher? The following =====1★ is much later (Kitakami etc.). Cut at first ===== that is not 7 after a long gap — use until =====1★ Raids===== after the 7 section, but that's at 62804 which includes other stuff?
  // Actually after 7★ table there may be text then =====1★ of another region at 62804. The 7★ table ends before =====1★ at 62804? Wait 30196 is 7★ and 62804 is 1★ of later section — that's 32k of table, ok.
  // Safer: end at first heading that is not 7 after the table close. Find the table and stop at |} after start, but the table is one big {| ... |}.
  const slice = t.slice(i);
  const tabStart = slice.indexOf('{|');
  const tabEnd = slice.indexOf('\n|}', tabStart);
  const table = slice.slice(tabStart, tabEnd + 3);
  const rows = table.split(/\n\|-\s*/).slice(1);
  const out = [];
  for (const row of rows) {
    if (!/★★★★★★★/.test(row) && !/7★/.test(row)) continue;
    const name = (row.match(/\{\{p\|([^}|]+)/) || [])[1];
    if (!name) continue;
    const form = /Hisuian form\|Hisuian/i.test(row) || /\|Hisuian\s*\|/.test(row) ? 'Hisui' : '';
    const starts = [...row.matchAll(/data-sort-value="(\d{4}-\d{2}-\d{2})"\s*\|/g)].map(x => x[1]);
    const tera = ((row.match(/\{\{Typetable\|([^}|]+)/i) || [])[1] || '').trim().toLowerCase();
    const mark = /Mightiest Mark/i.test(row);
    if (starts.length >= 2) out.push({ en: name, form, s: starts[0], e: starts[1], tera: TYPE_EN_TO[tera] || tera, mark });
  }
  return out;
}

function aromateNature(wiki) {
  const m = wiki.match(/Aromate\s+([A-ZÀ-Ü][\wÀ-ö'ïûéèêëàâùçîô-]+)/);
  return m ? m[1] : null;
}

function mergeWindows(sources, divergences, id) {
  // sources: { pp: [{s,e}], se: [...], bp: [...] }
  const all = [];
  for (const [src, L] of Object.entries(sources)) {
    for (const w of uniqWindows(L || [])) all.push({ ...w, src });
  }
  // cluster by overlap or exact
  const clusters = [];
  const used = new Set();
  all.sort((a, b) => a.s.localeCompare(b.s) || a.e.localeCompare(b.e));
  for (let i = 0; i < all.length; i++) {
    if (used.has(i)) continue;
    const c = [all[i]];
    used.add(i);
    let changed = true;
    while (changed) {
      changed = false;
      for (let j = 0; j < all.length; j++) {
        if (used.has(j)) continue;
        const w = all[j];
        if (c.some(x => x.s === w.s && x.e === w.e || !(x.e < w.s || w.e < x.s) || Math.abs(days(x.s, w.s)) <= 1 && Math.abs(days(x.e, w.e)) <= 1)) {
          c.push(w); used.add(j); changed = true;
        }
      }
    }
    clusters.push(c);
  }
  const windows = [];
  for (const c of clusters) {
    const bySrc = {};
    for (const w of c) (bySrc[w.src] ||= []).push(w);
    const exact = {};
    for (const [src, L] of Object.entries(bySrc)) {
      const u = uniqWindows(L);
      exact[src] = u[0];
    }
    const keys = Object.keys(exact);
    // pick the (s,e) with most sources agreeing, else pp, else first
    const votes = new Map();
    for (const [src, w] of Object.entries(exact)) {
      const k = w.s + '/' + w.e;
      const v = votes.get(k) || { s: w.s, e: w.e, src: [] };
      v.src.push(src);
      votes.set(k, v);
    }
    let best = [...votes.values()].sort((a, b) => b.src.length - a.src.length || (a.src.includes('pp') ? -1 : 0))[0];
    if (!best) continue;
    const disagree = [...votes.values()].length > 1;
    if (disagree) {
      divergences.push({
        id,
        chosen: { s: best.s, e: best.e, src: best.src },
        others: [...votes.values()].filter(v => v !== best).map(v => ({ s: v.s, e: v.e, src: v.src })),
        note: 'Bornes différentes selon les sources ; date retenue = celle du plus grand nombre de sources, à défaut Poképédia.'
      });
    }
    // also note if only one source
    if (keys.length === 1) {
      divergences.push({ id, chosen: { s: best.s, e: best.e, src: best.src }, others: [], note: `Fenêtre vue seulement chez ${keys[0]} (non recoupée).` });
    }
    windows.push({ s: best.s, e: best.e, src: best.src });
  }
  return uniqWindows(windows).map(w => {
    const full = windows.find(x => x.s === w.s && x.e === w.e);
    return { s: w.s, e: w.e, src: full ? full.src : [] };
  }).sort((a, b) => a.s.localeCompare(b.s));
}

function days(a, b) {
  const A = Date.parse(a + 'T00:00:00Z'), B = Date.parse(b + 'T00:00:00Z');
  return Math.round((B - A) / 86400000);
}

function raidId(k, tera) { return k + '-' + tera; }

export function buildTera7(opts = {}) {
  const offline = opts.offline ?? OFFLINE;
  if (!exists(path.join(CACHE, 'Raid_Téracristal.wiki'))) {
    throw new Error('Cache Poképédia manquant (build/cache/v60-31/Raid_Téracristal.wiki). Lancez update-tera7.mjs en ligne d’abord.');
  }
  const abMap = loadCsvMap(path.join(CACHE, 'ability_names.csv'), 'ability_id');
  const mvMap = loadCsvMap(path.join(CACHE, 'move_names.csv'), 'move_id');
  const spMap = loadCsvMap(path.join(CACHE, 'pokemon_species_names.csv'), 'pokemon_species_id');
  const by = loadCoreIndex();

  const ppBosses = parsePokepediaEvents(by);
  const ppTable = parsePokepediaTable();
  const bpRows = exists(path.join(CACHE, 'Bulbapedia_Tera_Raid_Battle.wiki')) ? parseBulbapedia() : [];

  const seBosses = [];
  for (const fn of fs.readdirSync(CACHE).filter(f => f.startsWith('serebii-event-') && f.endsWith('.html'))) {
    const html = fs.readFileSync(path.join(CACHE, fn), 'latin1');
    for (const b of splitSerebiiBosses(html)) seBosses.push({ ...b, file: fn });
  }

  function enMonToKey(en, form) {
    const fr = spMap.get(en.toLowerCase());
    if (!fr) return null;
    return resolveMon(by, fr, form === 'Hisui' || /hisui/i.test(form) || /hisuian/i.test(en) ? 'Hisui' : '');
  }

  function hrefToMon(href, img) {
    // kingambit, samurott-h, decidueye-h
    if (!href && !img) return null;
    const h = (href || '').replace(/\/$/, '');
    const hisui = /-h$/.test(h) || /hisui/i.test(h);
    const slug = h.replace(/-h$/, '').split('/')[0];
    // map slug to EN species: kingambit stays, try capitalize
    // better: use national dex from image 983.png
    const num = (img || '').match(/^(\d{1,4})(?:-h)?$/) || (img || '').match(/(\d{3,4})/);
    if (num) {
      const id = String(+num[1]);
      if (hisui || /^-h$/.test(h) || (img && /-h/.test(img))) {
        const e = by.all.find(x => x.k === id + '-hisui');
        if (e) return e;
      }
      return by.all.find(x => x.k === id) || by.byIdDefault.get(id) || null;
    }
    // fallback via species english name from slug
    const guess = slug.replace(/-/g, ' ');
    const mon = enMonToKey(guess, hisui ? 'Hisui' : '');
    return mon;
  }

  const seNorm = [];
  for (const b of seBosses) {
    let mon = hrefToMon(b.href, b.img);
    if (!mon && b.title) {
      const tm = b.title.replace(/^Mighty\s+|^Unrivaled\s+/i, '').replace(/\s+Returns$/i, '');
      // "Roaring Moon and Mighty Iron Valiant" handled per-boss via href
      mon = enMonToKey(tm, /hisuian/i.test(b.title) ? 'Hisui' : '');
    }
    if (!mon) continue;
    const talent = b.abil ? (abMap.get(b.abil.toLowerCase()) || null) : null;
    const nature = b.nature && b.nature !== 'Random' ? (NATURE_FR[b.nature] || b.nature) : (b.nature === 'Random' ? 'Aléatoire' : null);
    seNorm.push({ k: mon.k, n: mon.n, tera: b.tera, talent, nature, windows: b.windows, abilEn: b.abil, mark: b.mark, once: b.once, shinyNever: b.shinyNever, heldEn: b.held, file: b.file, movesEn: b.moves, raidMovesEn: b.raidMoves });
  }

  const bpNorm = [];
  for (const r of bpRows) {
    const mon = enMonToKey(r.en, r.form);
    if (!mon) throw new Error(`Bulbapedia : espèce inconnue ${r.en} ${r.form}`);
    bpNorm.push({ k: mon.k, n: mon.n, tera: r.tera, s: r.s, e: r.e, mark: r.mark });
  }

  // group PP by k+tera
  const groups = new Map();
  const divergences = [];
  for (const b of ppBosses) {
    const id = raidId(b.k, b.tera);
    const g = groups.get(id) || { id, k: b.k, n: b.n, tera: b.tera, evts: [], pp: [], ha: b.ha, lv: b.lv, moves: b.moves, raidMoves: b.raidMoves, notes: [], once: false, shinyNever: false, ver: '', feat: b.feat, held: b.held, mark: false };
    g.evts.push(b.ev);
    g.pp.push(b);
    if (b.once) g.once = true;
    if (b.shinyNever) g.shinyNever = true;
    if (b.ver) g.ver = b.ver;
    if (b.mark) g.mark = true;
    if (b.feat) g.feat = b.feat;
    if (b.held) g.held = b.held;
    if (b.notes) g.notes.push(b.notes);
    if (b.ha) g.ha = b.ha;
    groups.set(id, g);
  }

  // If Serebii/BP have a 7★ not in PP, add a group
  for (const b of [...seNorm, ...bpNorm]) {
    if (!b.k || !b.tera) continue;
    const id = raidId(b.k, b.tera);
    if (!groups.has(id)) {
      groups.set(id, { id, k: b.k, n: b.n, tera: b.tera, evts: [], pp: [], ha: null, lv: 100, moves: [], raidMoves: [], notes: [], once: !!b.once, shinyNever: !!b.shinyNever, ver: '', feat: null, held: '', mark: !!b.mark });
      divergences.push({ id, chosen: null, others: [], note: 'Boss présent chez Serebii ou Bulbapedia, absent des pages 7★ Poképédia.' });
    }
  }

  const raids = [];
  for (const g of [...groups.values()].sort((a, b) => (parseInt(a.k) - parseInt(b.k)) || a.k.localeCompare(b.k, 'en', { numeric: true }) || a.tera.localeCompare(b.tera))) {
    const ppWinTable = [];
    for (const ev of new Set(g.evts)) ppWinTable.push(...(ppTable.get(ev) || []));
    const tU = uniqWindows(ppWinTable);
    // prose only fills an event that the table missed (avoids les erreurs d’année du texte libre)
    const pU = uniqWindows(g.pp.flatMap(b => b.windowsProse || []));
    const seWin = seNorm.filter(b => b.k === g.k && b.tera === g.tera).flatMap(b => b.windows);
    const bpWin = bpNorm.filter(b => b.k === g.k && b.tera === g.tera).map(b => ({ s: b.s, e: b.e }));
    const sebp = new Set([...seWin, ...bpWin].map(w => w.s + '/' + w.e));
    const extraPp = pU.filter(w => sebp.has(w.s + '/' + w.e) && !tU.some(x => x.s === w.s && x.e === w.e));
    const windows = mergeWindows({ pp: tU.concat(extraPp), se: seWin, bp: bpWin }, divergences, g.id);

    const se = seNorm.filter(b => b.k === g.k && b.tera === g.tera);
    const talent = se.map(b => b.talent).find(Boolean) || null;
    const nature = se.map(b => b.nature).find(Boolean) || null;
    // aromate fallback / cross-check
    let aromate = null;
    for (const ev of g.evts) {
      const f = path.join(CACHE, `Cristal_de_raid_événementiel_${ev}.wiki`);
      if (exists(f)) aromate = aromate || aromateNature(read(f));
    }
    if (!nature && aromate) {
      // keep as fallback, noted
      // nature from mint name is already FR
    }
    // L’Aromate des récompenses n’est qu’un indice (une page à deux boss n’en liste parfois qu’un) : on ne le signale pas comme divergence.

    const noteTxt = [...new Set(g.notes)].join(' ');
    raids.push({
      id: g.id,
      k: g.k,
      n: g.n,
      tera: g.tera,
      evts: [...new Set(g.evts)].sort((a, b) => a - b),
      title: g.mark || se.some(b => b.mark) ? 'le Surpuissant' : '',
      mark: g.mark || se.some(b => b.mark) ? 'Insigne Surpuissant' : '',
      talent,
      ha: g.ha || '',
      nature: nature || aromate || '',
      natureSrc: nature ? 'se' : (aromate ? 'pp-aromate' : ''),
      moves: g.moves,
      raidMoves: g.raidMoves,
      feat: g.feat || null,
      held: g.held || '',
      once: g.once || se.some(b => b.once),
      shiny: g.shinyNever || se.some(b => b.shinyNever) ? 'never' : '',
      ver: g.ver,
      lv: g.lv || 100,
      windows,
      notes: noteTxt
    });
  }

  // never erase history: union with existing file
  if (exists(OUT)) {
    const prev = JSON.parse(read(OUT));
    const byId = new Map(raids.map(r => [r.id, r]));
    for (const old of prev.raids || []) {
      const cur = byId.get(old.id);
      if (!cur) {
        raids.push(old);
        byId.set(old.id, old);
        continue;
      }
      const have = new Set(cur.windows.map(w => w.s + '/' + w.e));
      for (const w of old.windows || []) {
        const k = w.s + '/' + w.e;
        if (!have.has(k)) { cur.windows.push(w); have.add(k); }
      }
      cur.windows.sort((a, b) => a.s.localeCompare(b.s));
      cur.evts = [...new Set([...(cur.evts || []), ...(old.evts || [])])].sort((a, b) => a - b);
    }
    raids.sort((a, b) => (parseInt(a.k) - parseInt(b.k)) || a.k.localeCompare(b.k, 'en', { numeric: true }) || a.tera.localeCompare(b.tera));
  }

  const data = {
    src: 'Poképédia (CC BY-NC-SA 3.0 FR) — pages Raid Téracristal et Cristal de raid événementiel N ; Serebii (Tera Raid Battle Events / Mighty / Unrivaled) ; Bulbapedia (Tera Raid Battle, table 7★). Noms de talents et de capacités anglophones traduits via les noms officiels (données PokeAPI).',
    updated: '2026-11-24',
    tz: 'Dates civiles inclusives. Les horaires officiels sont typiquement 00:00–23:59 UTC.',
    titleOfficial: 'le Surpuissant',
    markOfficial: 'Insigne Surpuissant',
    raids,
    divergences
  };
  return data;
}

export function writeTera7(data) {
  const json = JSON.stringify(data, null, 1) + '\n';
  const prev = exists(OUT) ? read(OUT) : null;
  if (prev === json) return { changed: false, file: OUT, n: data.raids.length };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, json);
  return { changed: true, file: OUT, n: data.raids.length };
}

async function refreshSources() {
  fs.mkdirSync(CACHE, { recursive: true });
  const pages = [
    ['https://www.pokepedia.fr/index.php?title=Raid_T%C3%A9racristal&action=raw', 'Raid_Téracristal.wiki'],
    ['https://www.pokepedia.fr/index.php?title=Insigne&action=raw', 'Insigne.wiki'],
    ['https://www.serebii.net/scarletviolet/teraraidbattleevents.shtml', 'serebii-teraraidbattleevents.html'],
    ['https://bulbapedia.bulbagarden.net/w/index.php?title=Tera_Raid_Battle&action=raw', 'Bulbapedia_Tera_Raid_Battle.wiki']
  ];
  for (const [url, fn] of pages) {
    const ok = await fetchTo(url, path.join(CACHE, fn));
    if (!ok && !exists(path.join(CACHE, fn))) console.error('manque', fn);
  }
  // event pages: known + look ahead
  let miss = 0;
  const start = 1;
  for (let n = start; n < 400 && miss < 3; n++) {
    const fn = `Cristal_de_raid_événementiel_${n}.wiki`;
    const dest = path.join(CACHE, fn);
    if (!REFRESH && exists(dest)) { miss = 0; continue; }
    const url = `https://www.pokepedia.fr/index.php?title=${encodeURIComponent('Cristal de raid événementiel ' + n)}&action=raw`;
    const ok = await fetchTo(url, dest);
    if (ok) miss = 0;
    else { miss++; if (exists(dest) === false) { /* 404 */ } }
  }
  // serebii mighty links
  const list = exists(path.join(CACHE, 'serebii-teraraidbattleevents.html')) ? fs.readFileSync(path.join(CACHE, 'serebii-teraraidbattleevents.html'), 'latin1') : '';
  const slugs = [...new Set([...list.matchAll(/\/scarletviolet\/teraraidbattles\/(event-(?:mighty|unrivaled)[^"]+)\.shtml/g)].map(m => m[1]))];
  for (const slug of slugs) {
    await fetchTo(`https://www.serebii.net/scarletviolet/teraraidbattles/${slug}.shtml`, path.join(CACHE, `serebii-${slug}.html`));
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  if (!OFFLINE) await refreshSources();
  const data = buildTera7({ offline: OFFLINE });
  const w = writeTera7(data);
  const keys = new Set(data.raids.map(r => r.k));
  const now = data.raids.filter(r => r.windows.some(x => x.s <= '2026-11-24' && '2026-11-24' <= x.e));
  const unrec = data.divergences.filter(d => /non recoupée/.test(d.note)).length;
  const conf = data.divergences.filter(d => d.others && d.others.length && !/non recoupée/.test(d.note)).length;
  console.log(`tera7: ${data.raids.length} raids, ${keys.size} espèces, ${data.raids.reduce((n, r) => n + r.windows.length, 0)} fenêtres, en cours ${now.map(r => r.n).join(', ') || 'aucun'}, divergences ${conf}, non recoupées ${unrec}, ${w.changed ? 'écrit' : 'inchangé'} ${w.file}`);
  if (!data.raids.every(r => r.windows.length)) console.warn('sans fenêtre :', data.raids.filter(r => !r.windows.length).map(r => r.id));
  if (!data.raids.every(r => r.talent)) console.warn('sans talent :', data.raids.filter(r => !r.talent).map(r => r.id));
  if (!data.raids.every(r => r.nature)) console.warn('sans nature :', data.raids.filter(r => !r.nature).map(r => r.id));
  // v60.32 : classer les 7★ (conserve les 6★ déjà présents). Ne pas relancer depuis fix-v60-31 (import uniquement).
  try {
    const { buildRankSvRaids, writeRankSvRaids } = await import('./rank-sv-raids.mjs');
    const { data: rk } = buildRankSvRaids({ only7: true });
    const wr = writeRankSvRaids(rk);
    const n7 = rk.B.filter(b => b[3] === 7).length;
    console.log(`rank-sv-raids --7star : ${n7} raids 7★, ${wr.changed ? 'écrit' : 'inchangé'} ${wr.file}`);
  } catch (e) {
    console.warn('classements 7★ non mis à jour (' + (e && e.message) + '). Installez @smogon/calc dans build/ puis lancez : node build/rank-sv-raids.mjs --7star');
  }
}
