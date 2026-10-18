// v39: audit v33 « à vérifier » (REVUE-v39.md, approved). Idempotent. GO availability lives in go-overrides.json
// (released / unreleased, applied by apply-go-overrides.mjs); this script does the rest:
//  - Meltan / Melmetal: core gt = 1 (the only Mythicals transferable from GO to HOME; Melmetal Gigamax: never, like every GO Gigamax)
//  - RF/VF Switch: off-dex Pokémon obtainable without RSE / Colosseum / XD (Îles Sevii, roaming beasts, Mystiticket / Ticket Aurora
//    included on Switch, breeding, trades between two Switch copies with FRLG items) → dex x « Hors dex » + sp hx; Mew: not obtainable
//  - Isolarmure: Zarude out of the 210 count (dex nr = « non requis »)
//  - Méga-Gemmes: official FR names (Poképédia « Méga-Gemme », 2026-10-16) for the stones PokéAPI lacks; no item id so gem marks keep their key
//  - Casino de Céladopole prizes: method « Échange de jetons » (not « Cadeau »)
//  - Z-A shiny: Raichu d'Alola / Ramoloss de Galar gifts locked, wild shiny possible in Méga-Dimension
//  - Official form names (Poképédia): Mer Orient, Mode Paisible / Mode Déchaîné, Mode Transe / Mode Normal
import fs from 'node:fs';
const D = new URL('../docs/data/', import.meta.url);
const rd = f => JSON.parse(fs.readFileSync(new URL(f, D))), wr = (f, o) => fs.writeFileSync(new URL(f, D), JSON.stringify(o));
const core = rd('core.json'), byKey = Object.fromEntries(core.e.map(e => [e.k, e]));
const sps = new Map(), spOf = id => { if (!sps.has(id)) sps.set(id, rd(`sp/${id}.json`)); return sps.get(id); };
const log = [];
// 8. GO → HOME
for (const e of core.e) delete e.gt;
for (const k of ['808', '809']) byKey[k].gt = 1;
// 3. RF/VF Switch
const FRLGSW_X = [ // species id: how (Serebii / Game8 / Bulbapedia « Pokémon availability (FRLG) », PokéAPI encounters firered / leafgreen)
  161, 162, 165, 166, 167, 168, 175, 176, 177, 178, 183, 184, 187, 188, 189, 193, 194, 195, 198, 200, 201, 202, 206, 211, 214, 215,
  218, 219, 220, 221, 223, 224, 225, 226, 227, 231, 232, 246, 247, 248, // Îles Sevii (sauvages) + évolutions par niveau
  169, 242, // bonheur (Nostenfer, Leuphorie)
  186, 199, 208, 212, 230, // échange entre deux RF/VF Switch avec Roche Royale / Peau Métal / Écaille Draco
  172, 173, 174, 236, 237, 238, 239, 240, // bébés par reproduction (Debugant → Kapoera)
  243, 244, 245, // chiens légendaires errants
  249, 250, // Île Nombril (Mystiticket, inclus sur Switch)
  386, // Île Aurore (Ticket Aurora, inclus sur Switch) : Forme Attaque (RF) / Défense (VF)
];
{ const gi = core.games.findIndex(g => g.id === 'frlgsw'), g = core.games[gi], dx = rd('dex/frlgsw.json');
  dx.e = dx.e.filter(r => r[0] !== 151); dx.x = [...FRLGSW_X].sort((a, b) => a - b); g.count = dx.e.length; g.extra = dx.x.length; wr('dex/frlgsw.json', dx);
  for (const e of core.e) if (e.id === 151) e.gb &= ~(1 << gi);
  { const sp = spOf(151); for (const f of Object.values(sp.f)) if (f.av) f.av = f.av.filter(x => x !== 'frlgsw'); if (sp.gm) delete sp.gm.frlgsw; }
  for (const id of FRLGSW_X) { const sp = spOf(id), av = (sp.f[String(id)] || {}).av || []; if (!av.includes('frlgsw')) { sp.hx = sp.hx || []; if (!sp.hx.includes('frlgsw')) sp.hx.push('frlgsw'); } }
  log.push(`RF/VF Switch : ${g.count} au Pokédex (Mew retiré), ${g.extra} hors dex`); }
// 4. Isolarmure
{ const dx = rd('dex/swisle.json'); dx.nr = [893]; wr('dex/swisle.json', dx); const g = core.games.find(g => g.id === 'swisle'); g.count = dx.e.length - dx.nr.length; log.push(`Isolarmure : ${g.count} (+ Zarude non requis)`); }
// 5. Méga-Gemmes
{ const ms = rd('mega-stones.json'), img = ms.fallback.img;
  const N = { '26-mega-x': 'Raichuïte X', '26-mega-y': 'Raichuïte Y', '36-mega': 'Mélodelfite', '71-mega': 'Empiflorite', '121-mega': 'Starossite', '149-mega': 'Dracolossite', '154-mega': 'Méganiumite', '160-mega': 'Aligatueurite', '227-mega': 'Airmurite', '358-mega': 'Éokite', '359-mega-z': 'Absolite Z', '398-mega': 'Étouraptorite', '445-mega-z': 'Carchacrokite Z', '448-mega-z': 'Lucarite Z', '478-mega': 'Momartikite', '491-mega': 'Darkraïte', '500-mega': 'Roitiflamite', '530-mega': 'Minotaupite', '545-mega': 'Brutapodite', '560-mega': 'Baggaïdite', '604-mega': 'Ohmassacrite', '609-mega': 'Lugulabrite', '623-mega': 'Golemastokite', '652-mega': 'Blindépiquite', '655-mega': 'Goupelinite', '658-mega': 'Amphinolite', '668-mega': 'Néméliosite', '670-mega': 'Floettite', '678-male-mega': 'Mistigrixite', '678-female-mega': 'Mistigrixite', '687-mega': 'Sepiatrocite', '689-mega': 'Golgopathite', '691-mega': 'Kravarekite', '701-mega': 'Brutalibrite', '718-mega': 'Zygardite', '740-mega': 'Crabominablite', '768-mega': 'Sarmuraïte', '780-mega': 'Draïeulite', '801-mega': 'Magearnite', '801-original-mega': 'Magearnite', '807-mega': 'Zeraorite', '870-mega': 'Hexadronite', '952-mega': 'Scovilainite', '970-mega': 'Floréclatite', '978-curly-mega': 'Nigirigonite', '978-droopy-mega': 'Nigirigonite', '978-stretchy-mega': 'Nigirigonite', '998-mega': 'Glaivodite', '382-primal': 'Orbe Bleu', '383-primal': 'Orbe Rouge' };
  let n = 0; for (const [k, fr] of Object.entries(N)) { if (!byKey[k]) throw new Error('Méga inconnue ' + k); if (!ms.stones[k] || !ms.stones[k].item) { ms.stones[k] = { fr, img }; n++; } }
  wr('mega-stones.json', ms); log.push(`Méga-Gemmes : ${Object.keys(N).length} noms (${n} écrits)`); }
// 6. Casino de Céladopole (area 267, method 0 « Cadeau ») → « Échange de jetons »
{ const L = rd('loc.json'), A = L.a.indexOf('Casino de Céladopole'); if (A < 0) throw new Error('Casino de Céladopole ?');
  let M = L.m.indexOf('Échange de jetons'); if (M < 0) { L.m.push('Échange de jetons'); M = L.m.length - 1; wr('loc.json', L); }
  let n = 0; for (const f of fs.readdirSync(new URL('sp/', D))) { const id = +f.replace('.json', ''); const sp = spOf(id);
    for (const fo of Object.values(sp.f)) for (const rows of Object.values(fo.en || {})) for (const r of rows) if (r[0] === A && r[1] === 0) { r[1] = M; n++; } }
  log.push(`Casino de Céladopole : ${n} rencontres → Échange de jetons`); }
// 7. Z-A shiny
{ const S = rd('shiny.json'), Z = S.l.za;
  for (const k of ['26-alola', '79-galar']) if (Z[k]) { Z[k][0] = 'p'; Z[k][2] = 'Chromatique obtenable à l’état sauvage dans les Zones Sauvages Hyperespace (Méga-Dimension)'; }
  wr('shiny.json', S); }
// 9. Form names
{ const NM = { '422-east': ['Sancoki Mer Orient', 'Mer Orient'], '423-east': ['Tritosor Mer Orient', 'Mer Orient'], '716': [null, 'Mode Déchaîné'], '716-neutral': ['Xerneas Mode Paisible', 'Mode Paisible'],
    '555-zen': ['Darumacho Mode Transe', 'Mode Transe'], '555-galar-standard': ['Darumacho de Galar Mode Normal', 'Galar'], '555-galar-zen': ['Darumacho de Galar Mode Transe', 'Galar Mode Transe'] };
  for (const [k, [n, l]] of Object.entries(NM)) { const e = byKey[k]; if (n) e.n = n; e.l = l; const f = spOf(e.id).f[k]; if (f && n) f.n = n; }
  byKey['555'].fn = 'Darumacho Mode Normal'; }
for (const [id, sp] of sps) wr(`sp/${id}.json`, sp);
wr('core.json', core);
console.log('v39 ok'); log.forEach(l => console.log('  ' + l));
