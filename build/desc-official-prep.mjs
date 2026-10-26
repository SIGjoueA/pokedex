// v57 prep (not applied): replace machine-translated Pokédex texts (sp.tt / sp.tv) by official French text.
// Step 1: PokéAPI English text of the slot == English text of another version that has official French (Poképédia pv / PokéAPI fv) → reuse it (same in-game entry).
// Step 2: leftovers → Poképédia species page + « /Génération N » subpage, looked up again (1 request / 1.5 s, cached in build/cache/pokepedia-desc/).
// Output: build/desc-official.json { slots: { "id:ver": { fr, how, from } }, missing: [...] }. APPLY=1 writes into docs/data/sp/*.json (pv/pt), dropping the tv slot.
import fs from 'fs';
const SP = new URL('../docs/data/sp/', import.meta.url).pathname, CD = new URL('./cache/', import.meta.url).pathname;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const cget = async (dir, name, url, wait) => { fs.mkdirSync(CD + dir, { recursive: true }); const f = CD + dir + '/' + name.replace(/[^A-Za-z0-9À-ÿ.-]+/g, '_') + '.json';
  if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f)); await sleep(wait); const r = await fetch(url, { headers: { 'User-Agent': 'PokedexPWA/1.0 (personal non-commercial PWA; ~1 req / 1.5 s)' } }); const j = r.ok ? await r.json() : null; fs.writeFileSync(f, JSON.stringify(j)); return j; };
const VN = {}; const norm = t => t.replace(/\s+/g, ' ').replace(/[’']/g, "'").trim().toLowerCase();
const GEN = { 8: 3, 10: 3, 11: 3, 12: 4, 15: 4, 16: 4, 21: 5, 22: 5, 39: 8, 40: 9, 41: 9 };
const JEU = { 8: ['S', 'RS', 'RSE'], 10: ['RF', 'RFVF'], 11: ['VF', 'RFVF'], 12: ['D', 'DP'], 15: ['HG', 'HGSS'], 16: ['SS', 'HGSS'], 21: ['N2', 'N2B2'], 22: ['B2', 'N2B2'], 39: ['LPA', 'LA'], 40: ['Ec', 'EV', 'EcVi'], 41: ['Vi', 'EV', 'EcVi'] };
const EXTRA = JSON.parse(fs.readFileSync(new URL('./desc-official-extra.json', import.meta.url)));
const out = { slots: {}, missing: [] }, APPLY = process.env.APPLY === '1';
const files = fs.readdirSync(SP).filter(f => f.endsWith('.json'));
for (const f of files) {
  const sp = JSON.parse(fs.readFileSync(SP + f)); if (!sp.tv) continue;
  const todo = Object.keys(sp.tv).filter(v => !(sp.pv && sp.pv[v] !== undefined) && sp.fv[v] === undefined); if (!todo.length) continue;
  const api = await cget('pokeapi-species', String(sp.id), `https://pokeapi.co/api/v2/pokemon-species/${sp.id}`, 300);
  const en = {}; for (const e of api?.flavor_text_entries || []) if (e.language.name === 'en') en[+e.version.url.split('/').at(-2)] = norm(e.flavor_text);
  const off = v => sp.pv && sp.pv[v] !== undefined ? sp.pt[sp.pv[v]] : sp.fv[v] !== undefined ? sp.ft[sp.fv[v]] : null;
  let page = null;
  for (const v of todo) {
    const key = sp.id + ':' + v, src = Object.keys(en).find(u => u !== v && en[u] === en[v] && off(u));
    if (en[v] && src) { out.slots[key] = { fr: off(src), how: 'même texte que ' + api.flavor_text_entries.find(e => +e.version.url.split('/').at(-2) === +src).version.name, tr: sp.tt[sp.tv[v]] }; continue; }
    if (EXTRA[key]) { out.slots[key] = { fr: EXTRA[key].fr, how: EXTRA[key].src, tr: sp.tt[sp.tv[v]] }; continue; }
    // Poképédia: species page (latest gens) + generation subpage
    const name = sp.f?.[sp.id]?.n || api?.names?.find(n => n.language.name === 'fr')?.name; let fr = null;
    for (const t of [name + '/Génération ' + GEN[v], name, ...(+v === 39 ? [name + ' de Hisui', name + ' d\'Hisui'] : [])]) {
      const j = await cget('pokepedia-desc', t, `https://www.pokepedia.fr/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&titles=${encodeURIComponent(t)}&format=json&formatversion=2&redirects=1`, 1500);
      const w = j?.query?.pages?.[0]?.revisions?.[0]?.slots?.main?.content || ''; const sec = (w.split(/=+ *Descriptions du \[\[Pokédex\]\] *=+/)[1] || '').split(/\n==[^=]/)[0];
      const re = /;\{\{Jeu\|([^}|]+)[^}]*\}\}(?:\s*(?:et|,)\s*\{\{Jeu\|([^}|]+)[^}]*\}\})*\s*\n:([^\n]+)/g;
      for (const m of sec.matchAll(re)) { const tags = m[0].match(/\{\{Jeu\|([^}|]+)/g).map(x => x.slice(6)); if (tags.some(g => JEU[v].includes(g))) { fr = m[3].replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1').replace(/'''?/g, '').trim(); break; } }
      if (fr) break;
    }
    if (fr) out.slots[key] = { fr, how: 'Poképédia', tr: sp.tt[sp.tv[v]] }; else out.missing.push(key + ' ' + (name || ''));
  }
  if (APPLY) { sp.pv ||= {}; sp.pt ||= []; for (const v of todo) { const s = out.slots[sp.id + ':' + v]; if (!s) continue; let i = sp.pt.indexOf(s.fr); if (i < 0) i = sp.pt.push(s.fr) - 1; sp.pv[v] = i; delete sp.tv[v]; }
    const used = new Set(Object.values(sp.tv)); if (!used.size) { delete sp.tv; delete sp.tt; } fs.writeFileSync(SP + f, JSON.stringify(sp)); }
}
fs.writeFileSync(new URL('./desc-official.json', import.meta.url), JSON.stringify(out, null, 1));
const by = {}; for (const [k, s] of Object.entries(out.slots)) { const v = k.split(':')[1]; by[v] ||= { ok: 0, pp: 0, ex: 0, miss: 0 }; by[v][s.how === 'Poképédia' ? 'pp' : s.how.startsWith('même') ? 'ok' : 'ex']++; }
for (const m of out.missing) { const v = m.split(' ')[0].split(':')[1]; (by[v] ||= { ok: 0, pp: 0, miss: 0 }).miss++; }
console.log(JSON.stringify(by), 'found', Object.keys(out.slots).length, 'missing', out.missing.length);
