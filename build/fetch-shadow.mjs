// v60.19: build docs/data/shadow.json (GO Shadow / Purified forms).
// Sources (snapshots in build/shadow-src/, refreshable with --refresh):
//   - Bulbapedia « List of Shadow Pokémon in Pokémon GO » (released forms, dates, some shinies)
//   - Pokémon GO Wiki / Fandom « List of Shadow Pokémon by release date » (dates + shiny tabs)
// A form is included only if it appears in BOTH lists with a real release date.
// Shinies: union of both sources (Fandom is more complete for later shiny releases and evolutions).
// Excluded: unobtainable (Kangaskhan), event costumes (already in costumes.json),
//   Bulbapedia rows without a date and absent from Fandom (unconfirmed regional stubs),
//   Mega / Primal / Gigamax / gender forms. Apex Lugia / Ho-Oh are folded into the species.
// Every listed form can be purified (no known exception among obtainable Shadows).
// Usage: node build/fetch-shadow.mjs [--refresh]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, 'shadow-src');
const DOCS = path.resolve(HERE, '../docs');
const CORE = JSON.parse(fs.readFileSync(path.join(DOCS, 'data/core.json'), 'utf8'));
const KEYS = Object.fromEntries(CORE.e.map(e => [e.k, e]));
fs.mkdirSync(SRC, { recursive: true });

const UA = { 'User-Agent': 'PokedexPWA/1.0 (personal PWA)' };
const refresh = process.argv.includes('--refresh');

async function txt(url) {
  let last;
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(url, { headers: UA });
      if (!r.ok) throw new Error(url + ' HTTP ' + r.status);
      return await r.text();
    } catch (e) { last = e; await new Promise(r => setTimeout(r, 2000 * (i + 1))); }
  }
  throw last;
}

function wikiApi(base, title) {
  return `${base}?action=parse&page=${encodeURIComponent(title)}&prop=wikitext&format=json`;
}

if (refresh) {
  const bp = JSON.parse(await txt('https://bulbapedia.bulbagarden.net/w/api.php?action=query&titles=List_of_Shadow_Pokémon_in_Pokémon_GO&prop=revisions&rvprop=content|timestamp&format=json&formatversion=2'));
  const rev = bp.query.pages[0].revisions[0];
  fs.writeFileSync(path.join(SRC, 'bulbapedia-meta.json'), JSON.stringify({ timestamp: rev.timestamp, title: bp.query.pages[0].title }));
  fs.writeFileSync(path.join(SRC, 'bulbapedia-shadow.wiki'), rev.content);
  const fd = JSON.parse(await txt(wikiApi('https://pokemongo.fandom.com/api.php', 'List of Shadow Pokémon by release date')));
  fs.writeFileSync(path.join(SRC, 'fandom-shadow-by-date.wiki'), fd.parse.wikitext['*'] || fd.parse.wikitext);
  console.log('refreshed snapshots', rev.timestamp);
}

const bpMeta = fs.existsSync(path.join(SRC, 'bulbapedia-meta.json'))
  ? JSON.parse(fs.readFileSync(path.join(SRC, 'bulbapedia-meta.json'), 'utf8'))
  : { timestamp: '2026-11-03T23:19:59Z' };
const bpWt = stripComments(fs.readFileSync(path.join(SRC, 'bulbapedia-shadow.wiki'), 'utf8'));
const fdWt = fs.readFileSync(path.join(SRC, 'fandom-shadow-by-date.wiki'), 'utf8');

function stripComments(s) {
  return s.replace(/<!--[\s\S]*?-->/g, '');
}

function extractTemplates(wt, name) {
  const key = '{{' + name + '|';
  const out = [];
  let i = 0;
  while ((i = wt.indexOf(key, i)) >= 0) {
    let start = i + key.length, depth = 1, j = start;
    while (j < wt.length && depth) {
      if (wt.startsWith('{{', j)) { depth++; j += 2; }
      else if (wt.startsWith('}}', j)) { depth--; j += 2; }
      else j++;
    }
    out.push(wt.slice(start, j - 2));
    i = j;
  }
  return out;
}

function splitPipes(raw) {
  const parts = [];
  let cur = '', depth = 0, i = 0;
  while (i < raw.length) {
    if (raw.startsWith('{{', i)) { depth++; cur += '{{'; i += 2; continue; }
    if (raw.startsWith('}}', i)) { depth = Math.max(0, depth - 1); cur += '}}'; i += 2; continue; }
    if (raw[i] === '|' && depth === 0) { parts.push(cur); cur = ''; i++; continue; }
    cur += raw[i++];
  }
  parts.push(cur);
  return parts;
}

function parseDate(s) {
  s = String(s || '').replace(/\{\{tt\|([^}|]+)\|[^}]*\}\}/g, '$1').replace(/\{\{tt\|([^}|]+)\}\}/g, '$1').trim();
  s = s.replace(/,(\d{4})/, ', $1');
  const months = { January: '01', February: '02', March: '03', April: '04', May: '05', June: '06',
    July: '07', August: '08', September: '09', October: '10', November: '11', December: '12' };
  const m = s.match(/^([A-Z][a-z]+)\s+(\d{1,2}),\s+(\d{4})$/);
  if (m && months[m[1]]) return `${m[3]}-${months[m[1]]}-${m[2].padStart(2, '0')}`;
  return '';
}

const COSTUME_RE = /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\d{4}|Halloween|Holiday|Fashion|GOFest|Copy|Visor|Fall|Costume/i;
const APEX = new Set([249, 250]);
const FORM_SUF = { A: 'alola', G: 'galar', H: 'hisui', P: 'paldea' };

const bp = {};
const excluded = { costume: [], nodate: [], nokey: [], other: [] };
for (const raw of extractTemplates(bpWt, 'lop/shadow/GO')) {
  const chunks = splitPipes(raw);
  const kwargs = {}, pos = [];
  for (const p of chunks) {
    if (p.includes('=') && !p.trim().startsWith('{{')) {
      const i = p.indexOf('=');
      kwargs[p.slice(0, i).trim()] = p.slice(i + 1).trim();
    } else pos.push(p);
  }
  const code = pos[0] || '';
  const name = pos[1] || '';
  const m = code.match(/^(\d{4})(.*)$/);
  if (!m) { excluded.other.push(code); continue; }
  const dex = +m[1], suf = m[2];
  const shiny = /^(yes|1|y)$/i.test(kwargs.shiny || '');
  const date = parseDate(pos[6] || '');
  let typ, key;
  if (!suf) { typ = 'base'; key = String(dex); }
  else if (COSTUME_RE.test(suf)) { typ = 'costume'; key = null; }
  else if (APEX.has(dex) && suf === 'A') { typ = 'apex'; key = String(dex); }
  else if (FORM_SUF[suf]) { typ = 'form'; key = `${dex}-${FORM_SUF[suf]}`; }
  else { typ = 'unknown'; key = suf; }
  if (typ === 'costume') { excluded.costume.push(code + ' ' + name); continue; }
  if (typ === 'unknown') { excluded.other.push(code + ' ' + name); continue; }
  if (typ === 'apex') {
    const rec = bp[key] || { key, sh: 0, d: date };
    rec.apex = 1;
    if (date && (!rec.d || date < rec.d)) rec.d = rec.d || date;
    rec.apexd = date;
    bp[key] = rec;
    continue;
  }
  if (!date) { excluded.nodate.push(code + ' ' + name); continue; }
  if (!KEYS[key]) { excluded.nokey.push(code + ' ' + name + ' -> ' + key); continue; }
  const rec = bp[key] || { key, sh: 0, d: date };
  if (shiny) rec.sh = 1;
  if (date < rec.d) rec.d = date;
  bp[key] = rec;
}

function nrm(s) {
  return String(s || '').toLowerCase().replace(/[♀]/g, 'f').replace(/[♂]/g, 'm')
    .replace(/['’.]/g, '').replace(/[^a-z0-9]+/g, '');
}

const EN = new Map();
function enAdd(nk, suf, e) {
  const k = nk + '\t' + (suf || '');
  if (!EN.has(k)) EN.set(k, []);
  EN.get(k).push(e);
}
for (const e of CORE.e) {
  if (['mega', 'primal', 'gmax', 'sex'].includes(e.c)) continue;
  let en = e.en, suf = '';
  const rm = (e.k || '').match(/-(alola|galar|hisui|paldea(?:-[a-z]+)?)$/);
  if (e.c === 'reg' || rm) {
    suf = rm ? rm[1] : '';
    en = en.replace(/^(Alolan|Galarian|Hisuian|Paldean)\s+/, '');
  }
  enAdd(nrm(en), suf, e);
}

function formOf(raw) {
  const f = String(raw || '').toLowerCase();
  if (/alolan/.test(f)) return 'alola';
  if (/galarian/.test(f)) return 'galar';
  if (/hisuian/.test(f)) return 'hisui';
  if (/paldean/.test(f)) return 'paldea';
  if (/apex/.test(f)) return 'apex';
  if (/incarnate/.test(f)) return 'incarnate';
  if (/altered/.test(f)) return 'altered';
  if (/therian/.test(f)) return 'therian';
  if (/origin/.test(f)) return 'origin';
  return f;
}

function mapName(name, form) {
  if (form === 'apex') return 'apex';
  if (form === 'incarnate' || form === 'altered') form = '';
  const cands = EN.get(nrm(name) + '\t' + (form || '')) || [];
  if (cands.length === 1) return cands[0].k;
  if (cands.length > 1) {
    const base = cands.filter(c => (!form && c.k === String(c.id)) || (form && c.k.endsWith('-' + form)));
    if (base.length === 1) return base[0].k;
  }
  return null;
}

const MONTH = { January: '01', February: '02', March: '03', April: '04', May: '05', June: '06',
  July: '07', August: '08', September: '09', October: '10', November: '11', December: '12' };
const fdReg = {}, fdSh = {};
const sections = fdWt.split(/\n==([^=].*?)==\n/);
for (let i = 1; i < sections.length; i += 2) {
  const title = sections[i], body = sections[i + 1] || '';
  const tm = title.match(/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\{\{Nth\|(\d+)\}\},\s+(\d{4})/);
  if (!tm) continue;
  const date = `${tm[3]}-${MONTH[tm[1]]}-${tm[2].padStart(2, '0')}`;
  const tabs = [];
  for (const t of body.matchAll(/(Regular|Shiny)\s*\(\d+\)\s*=/g)) tabs.push([t.index, t[1].toLowerCase()]);
  const kindAt = pos => { let k = 'regular'; for (const [s, kind] of tabs) if (s <= pos) k = kind; return k; };
  for (const mm of body.matchAll(/\{\{(PS|P)\|([^}]+)\}\}/g)) {
    const fields = mm[2], name = fields.split('|')[0].trim();
    const fm = /form=([^|}]+)/.test(fields) ? formOf(fields.match(/form=([^|}]+)/)[1]) : '';
    const key = mapName(name, fm);
    if (fm === 'apex' || !key) continue;
    const shiny = mm[1] === 'PS' || kindAt(mm.index) === 'shiny' || /ci=[^|]*shiny/i.test(fields);
    if (shiny) { if (!fdSh[key] || date < fdSh[key]) fdSh[key] = date; }
    else if (!fdReg[key] || date < fdReg[key]) fdReg[key] = date;
  }
}

const s = {};
const onlyBp = [], onlyFd = [];
for (const [k, rec] of Object.entries(bp)) {
  if (!fdReg[k]) { onlyBp.push(k); continue; }
  const row = { };
  const d = [rec.d, fdReg[k]].filter(x => /^\d{4}-\d{2}-\d{2}$/.test(x)).sort()[0];
  if (d) row.d = d;
  if (rec.sh || fdSh[k]) row.sh = 1;
  if (rec.apex) row.apex = 1;
  if (!KEYS[k] || KEYS[k].c === 'mega' || KEYS[k].c === 'primal' || KEYS[k].c === 'gmax') continue;
  s[k] = row;
}
for (const k of Object.keys(fdReg)) if (!bp[k]) onlyFd.push(k);
if (onlyBp.length || onlyFd.length) {
  console.warn('intersection gaps (excluded): only BP', onlyBp, 'only Fandom', onlyFd);
}

const keys = Object.keys(s).sort((a, b) => {
  const ia = +a.split('-')[0], ib = +b.split('-')[0];
  return ia - ib || a.localeCompare(b);
});
const ordered = {};
for (const k of keys) ordered[k] = s[k];

const n = keys.length;
const ns = keys.filter(k => ordered[k].sh).length;
const nReg = keys.filter(k => /-alola|-galar|-hisui|-paldea/.test(k)).length;

const out = {
  v: '2026-11-24',
  src: 'Bulbapedia, List of Shadow Pokémon in Pokémon GO (révision du 3 novembre 2026, 23:19 UTC) ; Pokémon GO Wiki (Fandom), List of Shadow Pokémon by release date (consulté le 24 novembre 2026, y compris les chromatiques du 4 novembre 2026). Une forme n’est retenue que si elle figure dans les deux listes avec une date de sortie. Chromatiques : union des deux sources. Non inclus : Kangourex (utilisé par les Leaders, non capturable) ; 9 costumes Obscurs (déjà suivis dans Costumes) ; lignes sans date sur Bulbapedia et absentes de Fandom (formes régionales non confirmées, notamment Canarticho de Galar, M. Mime de Galar, Qwilfish de Hisui, Tutafeh de Galar, et leurs évolutions). Les variantes Apex de Lugia et Ho-Oh sont rattachées à l’espèce. Toutes les formes listées peuvent être purifiées.',
  n,
  ns,
  s: ordered
};

const dest = path.join(DOCS, 'data/shadow.json');
fs.writeFileSync(dest, JSON.stringify(out, null, 1) + '\n');
console.log(`shadow.json: ${n} formes Obscur/Purifié, ${ns} chromatiques Obscurs, ${nReg} formes régionales`);
console.log('exclus costumes:', excluded.costume.length, excluded.costume.join(', '));
console.log('exclus sans date / non confirmés:', excluded.nodate.length, excluded.nodate.join(', '));
if (excluded.nokey.length || excluded.other.length) console.log('autres', excluded.nokey, excluded.other);
// sanity
for (const k of ['1', '19-alola', '150', '249', '250', '215-hisui', '263-galar', '641', '25', '115', '83-galar']) {
  console.log(' ', k, KEYS[k] ? KEYS[k].n : '?', ordered[k] || 'ABSENT');
}
