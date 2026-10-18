// v47: Pokédex descriptions still shown as machine translations (no Poképédia / PokéAPI French text for that version) → official French text
// from Poképédia (CC BY-NC-SA 3.0 FR) when it exists. Two modes:
//   node fix-v47-desc.mjs --fetch   Poképédia MediaWiki API (50 titles / request, 1.5 s between requests, UA PokedexPWA/1.0): species main page
//                                   + « /Génération N » sub-pages of the missing versions → build/pokepedia/desc-v47.json (tracked) — then applies
//   node fix-v47-desc.mjs           apply build/pokepedia/desc-v47.json → docs/data/sp/<id>.json pt / pv (idempotent, no network; chained in apply-v34.mjs)
// Only empty slots are filled (a version that already has a Poképédia or PokéAPI French text is never touched). Report: build/desc-v47-report.json.
import fs from 'node:fs'; import path from 'node:path';
import { descs, CODE } from './pokepedia.mjs';
const HERE = path.dirname(new URL(import.meta.url).pathname), D = path.join(HERE, '../docs/data');
const OUT = path.join(HERE, 'pokepedia/desc-v47.json'), CACHE = path.join(HERE, '.cache/pokepedia-v47.json');
const rd = f => JSON.parse(fs.readFileSync(path.join(D, f), 'utf8')), wr = (f, o) => fs.writeFileSync(path.join(D, f), JSON.stringify(o));
const A = s => s.replace(/’/g, "'");
const normF = s => A(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const core = rd('core.json'), ids = [...new Set(core.e.map(e => e.id))];
const GEN = v => v <= 3 ? 1 : v <= 6 ? 2 : v <= 11 ? 3 : v <= 16 ? 4 : v <= 22 ? 5 : v <= 26 ? 6 : v <= 32 ? 7 : v <= 39 || (v >= 50 && v <= 51) ? 8 : 9;
const trSlots = sp => Object.keys(sp.tv || {}).map(Number).filter(v => !(sp.pv && sp.pv[v] !== undefined) && sp.fv[v] === undefined && !(sp.f[String(sp.id)]?.pv && sp.f[String(sp.id)].pv[v] !== undefined));
const before = {}; for (const id of ids) { const s = trSlots(rd(`sp/${id}.json`)); if (s.length) before[id] = s; }
const nSlots = o => Object.values(o).reduce((n, a) => n + a.length, 0);

if (process.argv.includes('--fetch')) {
  const UA = 'PokedexPWA/1.0 (personal non-commercial PWA; data cached, ~1 request / 1.5 s)';
  const pages = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE)) : {};
  let nreq = 0;
  async function fetchTitles(titles) {
    const todo = [...new Set(titles)].filter(t => !(t in pages));
    for (let i = 0; i < todo.length; i += 50) {
      const batch = todo.slice(i, i + 50);
      const body = new URLSearchParams({ action: 'query', prop: 'revisions', rvprop: 'content', rvslots: 'main', titles: batch.join('|'), redirects: '1', format: 'json', formatversion: '2' });
      let j; for (let a = 0; a < 4; a++) { try { const r = await fetch('https://www.pokepedia.fr/api.php', { method: 'POST', body, headers: { 'User-Agent': UA } }); if (!r.ok) throw new Error('HTTP ' + r.status); j = await r.json(); break; } catch (e) { console.log('retry', a, e.message); await new Promise(r => setTimeout(r, 10000 * (a + 1))); } }
      if (!j) throw new Error('Poképédia API failed'); nreq++; await new Promise(r => setTimeout(r, 1500));
      const q = j.query || {}, al = Object.fromEntries((q.normalized || []).map(x => [x.from, x.to])), red = Object.fromEntries((q.redirects || []).map(x => [x.from, x.to]));
      const got = Object.fromEntries((q.pages || []).map(p => [p.title, p.revisions ? p.revisions[0].slots.main.content : null]));
      for (const t of batch) { let f = al[t] || t; f = red[f] || f; pages[t] = got[f] != null ? { t: f, w: got[f] } : null; }
      fs.writeFileSync(CACHE, JSON.stringify(pages));
    }
  }
  const nameOf = id => A(core.e.find(e => e.id === id && !e.c).n);
  await fetchTitles(Object.keys(before).map(id => nameOf(+id)));
  const sub = []; for (const [id, vs] of Object.entries(before)) { const p = pages[nameOf(+id)], t = p ? p.t : nameOf(+id); for (const g of new Set(vs.map(GEN))) if (g < 9) sub.push(`${t}/Génération ${g}`); }
  await fetchTitles(sub);
  const out = {}, found = {};
  for (const [id, vs] of Object.entries(before)) {
    const p = pages[nameOf(+id)], t = p ? p.t : nameOf(+id), forms = core.e.filter(x => x.id === +id);
    const isBase = h => { if (!h) return true; const n = normF(h); const f = forms.find(x => x.l && normF(x.l) === n) || forms.find(x => normF(x.n) === n); return f ? f.k === String(id) : false; };
    const d = [t, ...[1, 2, 3, 4, 5, 6, 7, 8].map(g => `${t}/Génération ${g}`)].flatMap(x => pages[x] ? descs(pages[x].w) : []);
    for (const v of vs) { const x = d.find(x => !x.absent && isBase(x.form) && x.codes.some(c => (CODE[c] || []).includes(v))); if (x) (out[id] ||= {})[v] = x.t; }
  }
  fs.writeFileSync(OUT, JSON.stringify({ src: 'Poképédia (https://www.pokepedia.fr), CC BY-NC-SA 3.0 FR', date: new Date().toISOString().slice(0, 10), sp: out }, null, 0).replace(/\},"/g, '},\n"'));
  console.log(`Poképédia : ${nreq} requêtes, ${nSlots(Object.fromEntries(Object.entries(out).map(([k, o]) => [k, Object.keys(o)])))} textes officiels trouvés pour ${nSlots(before)} emplacements traduits automatiquement`);
}
// apply
if (!fs.existsSync(OUT)) { console.log('fix-v47-desc: pas de build/pokepedia/desc-v47.json, ignoré'); process.exit(0); }
const X = JSON.parse(fs.readFileSync(OUT)).sp; let n = 0;
for (const [id, m] of Object.entries(X)) {
  const sp = rd(`sp/${id}.json`); let ch = false;
  for (const [v, t] of Object.entries(m)) {
    if (sp.fv[v] !== undefined || (sp.pv && sp.pv[v] !== undefined)) continue;
    sp.pt ||= []; let i = sp.pt.indexOf(t); if (i < 0) { i = sp.pt.length; sp.pt.push(t); }
    (sp.pv ||= {})[v] = i; ch = true; n++;
  }
  if (ch) wr(`sp/${id}.json`, sp);
}
const after = {}; for (const id of ids) { const s = trSlots(rd(`sp/${id}.json`)); if (s.length) after[id] = s; }
const byVer = {}; for (const vs of Object.values(after)) for (const v of vs) byVer[v] = (byVer[v] || 0) + 1;
fs.writeFileSync(path.join(HERE, 'desc-v47-report.json'), JSON.stringify({ note: 'emplacements (espèce, version PokéAPI) encore en traduction automatique : pas de texte officiel français sur Poképédia ni PokéAPI', count: nSlots(after), species: Object.keys(after).length, byVersion: byVer, slots: after }, null, 1));
console.log(`fix-v47-desc : ${n} textes officiels ajoutés ; encore en traduction automatique : ${nSlots(after)} emplacements (${Object.keys(after).length} espèces)`);
