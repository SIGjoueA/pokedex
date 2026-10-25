// Review list: species obtainable only by trade, per game (regional dex). Data-driven from docs/data (PokéAPI en rows + Poképédia pl rows) + evo.json.
import fs from 'node:fs';
const R = p => JSON.parse(fs.readFileSync(new URL('../docs/data/' + p, import.meta.url)));
const core = R('core.json'), evo = R('evo.json'), loc = R('loc.json');
const NAME = {}; for (const e of core.e) if (String(e.id) === e.k) NAME[e.id] = e.n;
const sp = {}; const S = id => sp[id] ??= (() => { try { return R(`sp/${id}.json`); } catch { return null; } })();
const NOBREED = new Set(['rb', 'y', 'lgpe', 'la', 'za', 'zadlc']);
const ABBR = { 'Écarlate': ['Ec.', 'Écarlate'], 'Violet': ['Vi.', 'Violet'] };
// species-level evo edges
const edges = evo.filter(r => /^\d+$/.test(r[0]) && /^\d+$/.test(r[1])).map(r => ({ f: +r[0], t: +r[1], m: r[2] }));
const isTradeEvo = (ed, g) => {
  if (ed.t === 350) return g.g >= 5 && !['oras', 'bdsp'].includes(g.id); // Milobellus: beauté en G3/4, ROSA, DÉPS
  return ed.m.length && ed.m.every(m => m.x[0] === 'Échange');
};
const base = id => { let b = id; for (;;) { const p = edges.find(e => e.t === b && e.f !== b); if (!p) return b; b = p.f; } };
const out = {}, meta = {};
for (const g of core.games) {
  const dex = R(`dex/${g.id}.json`); const ids = [...new Set(dex.e.map(x => x[0]))];
  const V = g.ver.map(v => v[1].split(':')[0].trim()); const VID = g.ver.map(v => v[0]);
  const wild = {}, npc = {}, other = {};
  const pkKeys = [g.id];
  for (const id of ids) {
    const s = S(id); const f = s?.f?.[id]; const set = new Set(); let tr = false, oth = false;
    for (const [li, mi, , , , , vs] of (f?.en?.[g.id] || [])) { if (loc.m[mi] === 'Échange PNJ') { tr = true; continue; } (vs || VID).forEach(v => { const i = VID.indexOf(v); if (i >= 0) set.add(i); }); }
    const enN = set.size; let unm = false;
    for (const [pl, d = ''] of (f?.pl?.[g.id] || [])) {
      if (/^Échange/.test(d) || /Échange PNJ/.test(d)) { tr = true; continue; }
      const hit = V.map((v, i) => (d.includes(v) || (ABBR[v] && d.includes('Exclusif ' + ABBR[v][0]))) ? i : -1).filter(i => i >= 0);
      if (hit.length) hit.forEach(i => set.add(i)); else unm = true;
    }
    if (unm && !enN) V.forEach((_, i) => set.add(i));
    const pln = f?.pln?.[g.id] || f?.pln?.[g.base];
    if (pln && !/^Faire évoluer|Échange|^Transf|HOME/i.test(pln)) oth = pln;
    if (oth && !set.size) V.forEach((_, i) => set.add(i));
    wild[id] = set; npc[id] = tr;
  }
  // propagate: non-trade evolution + breeding, per version
  const inDex = new Set(ids); const av = {}; ids.forEach(id => av[id] = new Set(wild[id]));
  for (let k = 0; k < 6; k++) for (const ed of edges) {
    if (!inDex.has(ed.f) || !inDex.has(ed.t)) continue;
    if (!isTradeEvo(ed, g)) av[ed.f].forEach(v => av[ed.t].add(v));
    if (!NOBREED.has(g.id)) av[ed.t].forEach(v => { const b = base(ed.t); if (av[b]) av[b].add(v); });
  }
  const list = [];
  for (const id of ids) {
    const a = av[id]; if (a.size === V.length) continue;
    const pre = edges.filter(e => e.t === id && inDex.has(e.f) && isTradeEvo(e, g) && av[e.f].size);
    let reason;
    if (pre.length && !a.size) reason = `Évolution par échange (${NAME[pre[0].f]}${pre[0].m[0]?.x[1] ? ', ' + pre[0].m[0].x[1] : ''})`;
    else if (npc[id] && !a.size) reason = 'Échange avec un PNJ uniquement';
    else if (a.size) { const miss = V.filter((_, i) => !a.has(i)); const has = V.filter((_, i) => a.has(i)); reason = `Exclusif à ${has.join(' / ')} : échange nécessaire dans ${miss.join(' / ')}`; }
    else reason = V.length > 1 ? 'Absent des deux versions : échange depuis un autre jeu (ou transfert/événement)' : 'Absent du jeu : échange depuis un autre jeu (ou transfert/événement)';
    const u = /^Absent/.test(reason) || ['za','zadlc','frlgsw'].includes(g.id) && /évolution/i.test(reason) ? 1 : 0;
    list.push({ id, n: NAME[id], reason: reason + (u ? ' — à vérifier' : ''), u });
  }
  out[g.id] = list.map(({ id, reason, u }) => u ? { id, reason, u } : { id, reason }); meta[g.id] = { n: g.n, list };
}
// GO
const GOREG = { 83: 'Asie', 115: 'Australie', 122: 'Europe', 128: 'Amérique du Nord', 214: 'Amérique latine', 222: 'Zones tropicales', 313: 'Europe, Asie, Australie', 314: 'Amériques, Afrique', 324: 'Asie du Sud et du Sud-Est', 335: 'Hémisphère alterné avec Séviper', 336: 'Hémisphère alterné avec Mangriff', 337: 'Amériques', 338: 'Europe, Afrique, Asie', 357: 'Afrique, Méditerranée', 369: 'Nouvelle-Zélande / Fidji', 417: 'Nord (Canada, Alaska, Russie)', 441: 'Hémisphère sud', 455: 'Sud-est des États-Unis', 480: 'Asie-Pacifique', 481: 'Europe, Afrique, Moyen-Orient', 482: 'Amériques', 511: 'Asie-Pacifique', 513: 'Europe, Afrique, Moyen-Orient', 515: 'Amériques', 538: 'Amériques, Afrique', 539: 'Europe, Asie, Australie', 550: 'Forme Raie Rouge / Raie Bleue selon l’hémisphère (forme)', 556: 'Amériques', 561: 'Égypte, Grèce', 626: 'New York', 631: 'Amériques, Afrique… (alterné avec Fermite)', 632: 'Europe, Asie… (alterné avec Aflamanoir)', 701: 'Mexique', 707: 'France', 764: 'Hawaï', 874: 'Royaume-Uni' };
const go = Object.entries(GOREG).map(([id, r]) => ({ id: +id, n: NAME[id], reason: `Exclusivité régionale (${r}) : échange hors de la région (hors événements)` }));
const fac = evo.filter(r => r[3]?.nt).map(r => ({ id: +r[1].split('-')[0], k: r[1], n: (core.e.find(e => e.k === r[1]) || {}).n || NAME[+r[1].split('-')[0]], reason: `Facultatif : évolution gratuite en bonbons après échange (${r[3].c} bonbons sinon)` }));
out.go = go.map(({ id, reason }) => ({ id, reason })); out['go-facultatif'] = fac.map(({ id, k, reason }) => ({ id, k, reason }));
fs.writeFileSync(new URL('./trade-only.json', import.meta.url), JSON.stringify(out, null, 1));
// HTML → PDF
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
const sec = (t, l) => `<h2>${esc(t)} <small>(${l.length})</small></h2>` + (l.length ? `<table><tr><th>N°</th><th>Pokémon</th><th>Raison</th></tr>${l.map(x => `<tr><td>${x.id}</td><td>${esc(x.n)}</td><td>${esc(x.reason)}</td></tr>`).join('')}</table>` : '<p>Aucun.</p>');
const order = [...core.games].sort((a, b) => a.d.localeCompare(b.d));
const html = `<meta charset=utf-8><style>body{font:10px sans-serif}h1{font-size:18px}h2{font-size:13px;margin-top:14px;page-break-after:avoid}table{border-collapse:collapse;width:100%}td,th{border:1px solid #bbb;padding:2px 4px;text-align:left}th{background:#eee}tr{page-break-inside:avoid}</style>
<h1>Pokémon obtenables uniquement par échange — tableau à vérifier</h1><p>Généré à partir des données du Pokédex (PokéAPI + Poképédia) ; Pokédex régional de chaque jeu. Les évolutions par échange ayant une alternative (Cordon de Légendes Arceus, beauté pour Milobellus…) sont exclues.</p>
${order.map(g => sec(g.n, meta[g.id].list)).join('')}${sec('Pokémon GO : exclusivités régionales', go)}${sec('Pokémon GO : évolutions par échange sans bonbons (facultatif)', fac)}`;
fs.writeFileSync(new URL('../review/echanges.html', import.meta.url), html);
for (const g of order) console.log(g.id, meta[g.id].list.length);
console.log('go', go.length, 'go-fac', fac.length);
