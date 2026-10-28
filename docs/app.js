'use strict';
const BALL = '<svg class="ball" viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true"><circle cx="12" cy="12" r="10.5" fill="#fff" stroke="#222" stroke-width="2"/><path d="M1.5 12a10.5 10.5 0 0 1 21 0z" fill="#e53935" stroke="#222" stroke-width="2"/><path d="M1.5 12h21" stroke="#222" stroke-width="2"/><circle cx="12" cy="12" r="3.6" fill="#fff" stroke="#222" stroke-width="2"/></svg>';
const BALL_OFF = BALL.replace('class="ball"', 'class="ball off"');
const TYPE_COLORS = {normal:'#8a8f98',fighting:'#c03a4b',flying:'#7f9bd8',poison:'#a35bc8',ground:'#b98a4b',rock:'#a89d6c',bug:'#8aaa28',ghost:'#5a6bb3',steel:'#5a8ea3',fire:'#f08030',water:'#3b8ee6',grass:'#46a846',electric:'#e0b800',psychic:'#f2587f',ice:'#4cc1c8',dragon:'#4a58d6',dark:'#5a4a52',fairy:'#e87fc5'};
const STAT_LABELS = ['PV','Attaque','Défense','Att. Spé.','Déf. Spé.','Vitesse'];
const GEN_LABELS = ['', 'I Kanto', 'II Johto', 'III Hoenn', 'IV Sinnoh', 'V Unys', 'VI Kalos', 'VII Alola', 'VIII Galar', 'IX Paldea'];
const PHYS_TYPES = new Set(['normal','fighting','flying','poison','ground','rock','bug','ghost','steel']);
const GROWTH = { slow: 'Lente', medium: 'Moyenne', fast: 'Rapide', 'medium-slow': 'Parabolique', 'slow-then-very-fast': 'Erratique', 'fast-then-very-slow': 'Fluctuante' };
const METHODS = { 'light-ball-egg': 'Œuf (Balle Lumière)', 'form-change': 'Changement de forme', 'zygarde-cube': 'Cube Zygarde', 'stadium-surfing-pikachu': 'Stadium (Pikachu surfeur)', 'colosseum-purification': 'Purification (Colosseum)', 'xd-shadow': 'Obscur (XD)', 'xd-purification': 'Purification (XD)', 'rotom-catalog': 'Catalogue Motisma' };
const $ = s => document.querySelector(s);
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};
// search key: case/accent-insensitive; keeps katakana/kanji (hiragana folded to katakana, full-width to ASCII) so Japanese and romaji names match
const norm = s => String(s || '').normalize('NFKC').replace(/[\u3041-\u3096]/g, c => String.fromCharCode(c.charCodeAt(0) + 96)).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').normalize('NFC').replace(/[^a-z0-9\u30a1-\u30fc\u3400-\u9fff]/g, '');
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad = n => String(n).padStart(4, '0');
const pad3 = n => String(n).padStart(3, '0');
const dec = n => String(n).replace('.', ',');
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const fmt = n => Number(n).toLocaleString('fr-FR');
const KEYRE = /^\d+(?:-[a-z0-9-]+)?$/;
// ids in the "favs / caught / shiny" sets: integers for base species (unchanged since v1), strings like "26-alola" for forms
const validId = x => Number.isInteger(x) || (typeof x === 'string' && KEYRE.test(x) && x.includes('-'));

// v27: one naming rule for short game names — spaced slash « / » everywhere; base games in full (minus « Pokémon : »),
// expansions = base prefix (ÉV, ÉB, Z-A) + expansion name. Applied over core.json so a cached older data file reads the same.
const GAME_SHORT = { frlgsw: 'Rouge Feu / Vert Feuille (Switch)', zadlc: 'Z-A Méga-Dimension', za: 'Légendes Z-A', svdisk: 'ÉV Disque Indigo', svmask: 'ÉV Masque Turquoise', sv: 'Écarlate / Violet', la: 'Légendes Arceus', bdsp: 'Diamant Étincelant / Perle Scintillante', swcrown: 'ÉB Couronneige', swisle: 'ÉB Isolarmure', sw: 'Épée / Bouclier', lgpe: 'Let’s Go', usum: 'Ultra-Soleil / Ultra-Lune', sm: 'Soleil / Lune', oras: 'Rubis Oméga / Saphir Alpha', xy: 'X / Y', b2w2: 'Noir 2 / Blanc 2', bw: 'Noir / Blanc', hgss: 'Or HeartGold / Argent SoulSilver', pt: 'Platine', dp: 'Diamant / Perle', e: 'Émeraude', frlg: 'Rouge Feu / Vert Feuille', rs: 'Rubis / Saphir', c: 'Cristal', gs: 'Or / Argent', y: 'Jaune', rb: 'Rouge / Bleu' };
// v27: grid / list toggle shows the view you get by tapping — list with thumbnails (from grid) / 4 squares (from list). ☰ looked like a menu.
const VIEW_LIST_IC = '<svg class="vic" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="currentColor"><rect x="3" y="4" width="5" height="4.5" rx="1.2"/><rect x="10" y="5.25" width="11" height="2" rx="1"/><rect x="3" y="9.75" width="5" height="4.5" rx="1.2"/><rect x="10" y="11" width="11" height="2" rx="1"/><rect x="3" y="15.5" width="5" height="4.5" rx="1.2"/><rect x="10" y="16.75" width="11" height="2" rx="1"/></svg>';
const VIEW_GRID_IC = '<svg class="vic" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="currentColor"><rect x="3" y="3" width="7.5" height="7.5" rx="1.8"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.8"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.8"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.8"/></svg>';
let DATA, E = [], BY_KEY = {}, FORMS = {}, GAMES = [], GAME_BY = {}, GIDX = {}, TYPE_FR = {};
let FAVS = new Set(store.get('favs', [])), CAUGHT = new Set(store.get('caught', [])), SHINY = new Set(store.get('shiny', []));
// Per-game marks (only used while a game or Pokémon GO is selected in the "Jeux" filter): strings "gameId:25" / "gameId:26-alola"
const CAUGHT_G = new Set(store.get('caught_g', [])), SHINY_G = new Set(store.get('shiny_g', []));
const state = { q: '', types: [], gen: '', cat: '', sort: 'id', game: '', vdex: '', forms: store.get('forms', false), view: store.get('view', 'grid'), dgame: 'all' };
let listScroll = 0;
const ik = p => p.c ? p.k : p.id; // key used in the global sets
// v35: full name of a form; default forms of real alternate-form species carry their official form name (core fn: « Nigirigon Forme Courbée »)
const fullN = p => p.fn || p.n;
// v35: default art = the self-hosted Pokémon HOME image of THIS form (img/h/<key>.webp, core hh); official art when HOME has none
const artOf = p => p.hh ? `img/h/${p.k}.webp` : `img/${p.k}.webp`;
// Tracking context: a game id (or 'go') when one is selected in the Jeux filter, otherwise null = global marks (unchanged behaviour)
// 'home' (list) = Pokémon HOME: marks = origin-mark transfers (HOME_O), shared with the game sheets.
const TRANS_G = new Set(store.get('home_g', [])), STRANS_G = new Set(store.get('homeshiny_g', [])); // TRANS_G (v8–v21 per-game transfers): kept as a frozen backup, migrated once to HOME_O
// v22: HOME transfers per ORIGIN MARK ("kalos:6", "za:3-mega"): one state shared by the game sheets (Transféré) and the HOME sheet.
// HOME_OG = subset set from a game sheet (implies Capturé in that game; removed with Capturé). Set from the HOME sheet = no Capturé (HOME trades).
const HOME_O = new Set(store.get('home_o', [])), HOME_OG = new Set(store.get('home_og', []));
// v24: « Shiny dans HOME » (one mark per form, HOME sheet), allowed once at least one origin mark is ticked
const HOME_SH = new Set(store.get('home_sh', []));
// v25: Barons (Pokémon Alpha) — Légendes Arceus / Légendes Z-A only. Per game (same save group as Capturé): BARON_G, BARONS_G (Baron shiny). HOME sheet: HOME_B, HOME_BS (per form, independent of the games).
const BARON_G = new Set(store.get('baron_g', [])), BARONS_G = new Set(store.get('barons_g', []));
const HOME_B = new Set(store.get('home_b', [])), HOME_BS = new Set(store.get('home_bs', []));
// Méga-Gemmes: ownership per save group and per stone — keys "<save>:<megaKey>" ("za:3-mega", "xy:6-mega-x", "oras:3-mega"…).
// Légendes Z-A: captured = base caught in the Z-A save + gem. Other Mega games: plain ownership mark (Megas stay battle-only, no completion effect).
// Legacy keys without a prefix (v15–v20) were Z-A gems.
const MEGA_GEMS = new Set(store.get('mega_gems', []).map(k => k.includes(':') ? k : 'za:' + k));
// Pokémon GO: Méga-énergie obtained, one mark per species (national ids as strings).
const MEGA_ENERGY = new Set(store.get('mega_energy', []).map(String));
// v38: Pokémon GO « Dynamax » mark (usable in Max Battles), one per GO sheet (entry keys). No effect on completion (like the Méga-énergie).
const DYNAMAX = new Set(store.get('go_dynamax', []).map(String));
const GMAX_IC = '<img class="gemimg" src="img/max/gigamax.webp" alt="" width="28" height="28" decoding="async">', DMAX_IC = '<img class="gemimg" src="img/max/dynamax.webp" alt="" width="28" height="28" decoding="async">';
let ENERGY_ICONS = { generic: 'img/energy/generic.webp', ids: new Set() };
let MEGA_STONES = { fallback: { item: 'key-stone', fr: 'Gemme Sésame', img: 'img/stones/key-stone.png', label: 'Méga-Gemme' }, stones: {} };
const megaStoneOf = p => {
  if (!p?.mb) return null;
  const s = MEGA_STONES.stones?.[p.k];
  if (s) return { ...s, label: s.fr, specific: true };
  const f = MEGA_STONES.fallback || {}, xyz = (p.k.match(/mega-(x|y|z)$/) || [])[1];
  return { item: f.item || 'key-stone', fr: f.fr || 'Gemme Sésame', img: f.img || 'img/stones/key-stone.png', label: (f.label || 'Méga-Gemme') + (xyz ? ' ' + xyz.toUpperCase() : ''), specific: false };
};
// One ownership state per stone (shared by every form of the species using it: Magearna ×2, Nigirigon ×3, Mistigrix ♂/♀…).
// Stones without a PokéAPI item: one per species + X/Y/Z.
const gemId = p => (MEGA_STONES.stones?.[p.k]?.item) || `${p.id}${(p.k.match(/mega-(x|y|z)$/) || ['', ''])[1] ? '-' + p.k.match(/mega-(x|y|z)$/)[1] : ''}`;
const gemMates = p => E.filter(q => q.mb && q.id === p.id && gemId(q) === gemId(p));
// Megas of a sheet: the Mega itself, or the Megas of this (base) form. One gem button per stone.
const megasOf = p => p.mb ? [p] : E.filter(q => q.mb === p.k || q.mb2 === p.k); // v44d: mb2 = second base (Méga-Mistigrix ← Mistigrix femelle)
const uniqGems = ms => { const seen = new Set(); return ms.filter(q => !seen.has(gemId(q)) && seen.add(gemId(q))); };
// The Mega exists in this game's save group (X/Y, ROSA, SL, USUL, Let's Go, Z-A, Méga-Dimension…)
const megaInGame = (q, c) => !!(c && GAME_BY[c] && gamesOf(q).some(g => saveOf(g) === saveOf(c)));
// Gem slot of the action row: every stone of the sheet, enabled only in a game where that Mega exists (greyed elsewhere: overview, HOME, other games)
const gemSlot = (p, c) => uniqGems(megasOf(p)).map(m => ({ m, on: megaInGame(m, c) }));
const gemsFor = (p, c) => gemSlot(p, c).filter(x => x.on).map(x => x.m);
const gemGrp = c => saveOf(c || 'za');
function gemBtnHTML(m, c, on, short) {
  const st = megaStoneOf(m), za = isZa(c), pressed = !!on && hasGem(m, c);
  const why = !on ? ' — à marquer dans un jeu où cette Méga existe' : za ? ' — requise avec la forme de base pour capturer cette Méga en Z-A' : ` — possédée dans ${trackName(c)} (simple marque : la Méga reste une forme de combat, sans effet sur la complétion)`;
  return `<button class="act gem" type="button" data-mega="${m.k}"${on ? '' : ' disabled'} aria-pressed="${pressed}" aria-label="${esc(st.label)}${on ? ' – ' + esc(trackName(c)) : ''}" title="${esc(st.label)} (${esc(m.n)})${st.specific ? '' : ' – sprite Gemme Sésame'}${why}"><img class="gemimg" src="${st.img}" alt="" width="28" height="28" decoding="async"><span class="t">${esc(short || st.label)}</span></button>`;
}
// Pokémon GO: species whose Mega is released in GO (needs the sheet data)
// v28: today's date (local, AAAA-MM-JJ) for GO releases announced with a date (go-overrides.json: Gigamax Duralugon…)
let fromRank = false, rankScroll = 0; // v59: a sheet opened from « Classements » goes back there (same tab, same scroll)
const TODAY = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
const goRel = g => !!(g && (g.r || (g.rf && TODAY >= g.rf))); // released in GO (now, or from its announced date)
const goShinyOk = g => !(g && (g.nosh || (g.shf && TODAY < g.shf))); // shiny available in GO (Gigamax: per form)
// v28: temporary evolutions of GO (Mega Evolution, Primal Reversion) = GO forms: registered when you Mega Evolve / Primal Revert
const goTemp = p => !!(p && (p.mb || p.c === 'primal'));
const goTempBase = p => (p && BY_KEY[p.mb || p.bo]) || null;
const goTempsOf = p => goTemp(p) ? [p] : E.filter(q => q.mb === p.k || (q.c === 'primal' && q.bo === p.k));
const goMegas = p => { const sp = DET && DET.p && DET.p.id === p.id ? DET.sp : null; return sp ? goTempsOf(p).filter(q => sp.f[q.k] && goRel(sp.f[q.k].go)) : []; };
// Méga-énergie mark id: the species ("3"), or one per Mega when the species has several (X / Y / Z): "6-x", "6-y", "150-x"…
const megaXYZ = m => (m.k.match(/mega-(x|y|z)$/) || [])[1] || '';
const energyId = m => String(m.id) + (megaXYZ(m) ? '-' + megaXYZ(m) : '');
const hasEnergy = m => MEGA_ENERGY.has(energyId(m));
const energyMates = p => { const seen = new Set(); return goMegas(p).filter(m => !seen.has(energyId(m)) && seen.add(energyId(m))); };
const energyImg = m => { const id = energyId(m); return ENERGY_ICONS.ids.has(id) ? `img/energy/${id}.webp` : ENERGY_ICONS.ids.has(String(m.id)) ? `img/energy/${m.id}.webp` : ENERGY_ICONS.generic; };
function energyBtnHTML(m) {
  const base = BY_KEY[String(m.id)] || m, id = energyId(m), xyz = megaXYZ(m).toUpperCase();
  const img = energyImg(m);
  const lab = m.c === 'primal' ? 'Énergie Primo' : `Méga-énergie${xyz ? ' ' + xyz : ''}`;
  return `<button class="act energy" type="button" data-energy="${m.k}" aria-pressed="${hasEnergy(m)}" aria-label="${lab} ${esc(base.n)} – Pokémon GO" title="${lab} de ${esc(base.n)} obtenue dans Pokémon GO (${xyz ? `marque séparée pour ${esc(m.n)}` : 'une marque par espèce'})"><img class="gemimg" src="${img}" alt="" width="28" height="28" decoding="async"><span class="t"><span class="lgl">${lab}</span><span class="shl">Énergie${xyz ? ' ' + xyz : ''}</span></span></button>`;
}
function toggleEnergy(m) { const k = energyId(m); if (MEGA_ENERGY.has(k)) MEGA_ENERGY.delete(k); else MEGA_ENERGY.add(k); saveTrack(); }
// v21 marks were per species ("6"): for species with X/Y Megas, the mark applies to each of them
function migrateEnergy() {
  let ch = false;
  for (const k of [...MEGA_ENERGY]) { if (k.includes('-')) continue; const ms = E.filter(q => q.mb && String(q.id) === k && megaXYZ(q)); if (!ms.length) continue; MEGA_ENERGY.delete(k); ms.forEach(m => MEGA_ENERGY.add(energyId(m))); ch = true; }
  if (ch) store.set('mega_energy', [...MEGA_ENERGY]);
}

// v37b: Gigamax treated like Megas. A Gigamax sheet's « Gigamax » mark = its caught mark (same keys as before → old marks kept).
// Base sheets get a « Gigamax » button (after HOME / Méga-Gemme) linked both ways with the Gigamax sheet. Charmilly: one Gigamax for its 63 forms.
const isGmx = p => !!p && p.c === 'gmax' && p.k !== '890-eternamax'; // Infinimax: not catchable, keeps its plain Capturé
const gmaxBtnsOf = p => isGmx(p) || p.mb || p.bo ? [] : p.id === 869 ? E.filter(q => q.k === '869-gmax') : p.k === SAL_BASE.G ? E.filter(isSal) : E.filter(q => isGmx(q) && q.gbk === p.k); // v44: Salarsen Grave → the single Salarsen Gigamax entry («Gigamax Grave» mark)
// v44: Salarsen Gigamax = ONE entry (849-amped-gmax) with two capture marks: « Gigamax Aigüe » (its own key) and « Gigamax Grave »
// (key 849-low-key-gmax, no list entry since v44: the v37–v43 Grave entry's capture marks ARE this mark). Game shiny: shared, on the entry key.
// v47: HOME = two marks too: « Gigamax Aigüe » on the entry key, « Gigamax Grave » on 849-low-key-gmax (HOME_O origin mark + its own HOME shiny).
const SAL_A = '849-amped-gmax', SAL_G = '849-low-key-gmax', SAL_BASE = { A: '849', G: '849-low-key' };
const isSal = p => !!p && p.k === SAL_A;
const salKey = v => v === 'G' ? SAL_G : SAL_A;
const salOn = (v, c) => { const a = BY_KEY[SAL_A]; if (!a || !c || c === 'home') return false; return CAUGHT_G.has(ctxFor(a, c) + ':' + salKey(v)); };
const gmaxInGame = (g, c) => !!c && c !== 'home' && (c === 'go' ? !!(g.go || (g.gof && TODAY >= g.gof)) : !!GAME_BY[c] && gamesOf(g).some(x => saveOf(x) === saveOf(c)));
// v44c: purely visual gender differences = ONE entry (classic Pokédex). The female form is no list entry any more: core « fe » on the species
// entry (old key, games from gen. IV, GO, sprites), only for the female image (hero ♀ / ♂ button). v44d: no « ♀ » mark any more (old fem_g data left
// stored untouched, unused); Méga-Mistigrix ♂ / ♀ = one entry too (fe + second base mb2 = Mistigrix femelle). Real differences keep two entries.
const FEM_MIG = new Set(store.get('fem_mig', [])); // old female-key marks already copied (so an unticked Capturé is never brought back)
let FEM_OF = {}; // old female key ("3-female", "215-hisui-female", "678-female-mega") -> entry (boot)
const femP = p => p && p.fe ? (p.feP ||= { ...p, ...p.fe, c: 'sex', l: 'Femelle', fe: undefined }) : null; // pseudo entry for the female image
// Migration (start + after an import; idempotent, nothing removed): every mark of an old female key is copied once onto the species entry
// (Capturé / Shiny / Baron / HOME / Méga-Gemme marks). The old keys stay stored untouched.
function migrateFem() {
  if (!Object.keys(FEM_OF).length) return; let ch = false;
  const add = (set, x) => { if (!set.has(x)) { set.add(x); ch = true; } };
  const once = (tag, x) => { const t = tag + '|' + x; if (FEM_MIG.has(t)) return false; FEM_MIG.add(t); ch = true; return true; };
  const per = [['caught_g', CAUGHT_G, ''], ['shiny_g', SHINY_G, 's'], ['baron_g', BARON_G, 'b'], ['barons_g', BARONS_G, 'bs'], ['home_g', TRANS_G, 't'], ['homeshiny_g', STRANS_G, 'ts']];
  for (const [tag, set, kind] of per) for (const x of [...set]) {
    if (typeof x !== 'string') continue; const i = x.indexOf(':'), b = i > 0 && FEM_OF[x.slice(i + 1)]; if (!b || !once(tag, x)) continue;
    const y = x.slice(0, i) + ':' + b.k; add(set, y); if (!b.mb) add(CAUGHT_G, y); // Megas: Capturé stays derived (base + gem)
    if (kind === 's' || kind === 'bs' || kind === 'ts') add(SHINY_G, y); if (kind === 'bs') add(BARON_G, y); if (kind === 'ts') add(TRANS_G, y);
  }
  for (const [tag, set] of [['home_o', HOME_O], ['home_og', HOME_OG]]) for (const x of [...set]) {
    if (typeof x !== 'string') continue; const i = x.indexOf(':'), b = i > 0 && FEM_OF[x.slice(i + 1)]; if (!b || !once(tag, x)) continue;
    const y = x.slice(0, i) + ':' + b.k; if (set === HOME_O) { if (!HOME_O.has(y)) { HOME_O.add(y); if (HOME_OG.has(x)) HOME_OG.add(y); ch = true; } }
  }
  for (const [tag, set] of [['home_sh', HOME_SH], ['home_b', HOME_B], ['home_bs', HOME_BS], ['favs', FAVS], ['go_dynamax', DYNAMAX]]) for (const x of [...set]) {
    const b = FEM_OF[x]; if (!b || !once(tag, x)) continue; add(set, b.k); if (set === HOME_BS) { add(HOME_B, b.k); add(HOME_SH, b.k); }
  }
  for (const x of [...MEGA_GEMS]) { const i = x.indexOf(':'), b = i > 0 && FEM_OF[x.slice(i + 1)]; if (b && b.mb && once('mega_gems', x)) add(MEGA_GEMS, x.slice(0, i) + ':' + b.k); } // v44d
  for (const [tag, set] of [['caught', CAUGHT], ['shiny', SHINY]]) for (const x of [...set]) { const b = FEM_OF[x]; if (!b || !once(tag, x)) continue; add(set, ik(b)); }
  if (ch) { saveTrack(); store.set('fem_mig', [...FEM_MIG]); store.set('favs', [...FAVS]); store.set('caught', [...CAUGHT]); store.set('shiny', [...SHINY]); }
}
// v37c: GO Mega / Primal sheet: one « Méga-énergie » mark = registered OR energy (old marks: either one ⇒ on)
const goMegaOn = p => CAUGHT_G.has('go:' + p.k) || hasEnergy(p);
const isZa = c => c === 'za' || c === 'zadlc';
const ZA_IDS = new Set(['za', 'zadlc']);
/** Z-A Mega forms are tracked only for Z-A / Méga-Dimension (not XY/ORAS/LGPE battle megas, not GO). */
const megaTrackGames = p => gamesOf(p).filter(g => ZA_IDS.has(g));

const hasGem = (p, c = 'za') => !!(p && p.mb && [p, ...gemMates(p)].some(q => MEGA_GEMS.has(gemGrp(c) + ':' + q.k)));
const megaBaseP = p => (p && p.mb && BY_KEY[p.mb]) || null;
const megaBases = p => p && p.mb ? [p.mb, p.mb2].map(k => k && BY_KEY[k]).filter(Boolean) : []; // v44d: caught / shiny with either base
const zaMegaCaughtGames = p => {
  if (!p?.mb || !hasGem(p)) return [];
  const bc = megaBases(p).flatMap(b => CAUGHT_BY.get(b.k) || []); if (!bc.length) return [];
  return megaTrackGames(p).filter(g => bc.some(h => saveOf(h) === saveOf(g)));
};
const zaMegaShinyGames = p => {
  if (!p?.mb || !hasGem(p)) return [];
  const bs = megaBases(p).flatMap(b => SHINY_BY.get(b.k) || []); if (!bs.length) return [];
  return megaTrackGames(p).filter(g => bs.some(h => saveOf(h) === saveOf(g)));
};
const trackCtx = () => (GAME_BY[state.game] || state.game === 'go' || state.game === 'home') ? state.game : null;
const trackName = (c = trackCtx()) => { return c === 'go' ? 'Pokémon GO' : c === 'home' ? 'Pokémon HOME' : c ? GAME_BY[c].s : ''; };
const homeKind = c => c === 'go' ? 'direct' : (GAME_BY[c] && GAME_BY[c].h) || null; // direct | bank | transporter | null
const homeBall = '<svg class="ball hm" viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
const HOME_KIND_FR = { direct: 'transfert direct vers HOME', bank: 'via Pokémon Bank', transporter: 'via Poké Fret / Pokémon Bank', vc: 'Console virtuelle 3DS : via Poké Transporter / Pokémon Bank' };
// Pokémon HOME origin marks (icons: Bulbagarden Archives, fair use — img/origin/CREDITS.txt). One mark per game + its expansions.
// Gen 4–5 Pokémon have no origin mark in HOME: grouped as « Sans marque ». v31: gba = Rouge Feu / Vert Feuille (Switch), game « frlgsw » (HOME 4.1.0, one way).
const ORIGINS = [
  { id: 'gba', n: 'GBA', fr: 'Marque GBA (Rouge Feu / Vert Feuille sur Nintendo Switch, HOME 4.1.0)', games: ['frlgsw'] }, // v31
  { id: 'za', n: 'Z-A', fr: 'Marque Z-A (Légendes Z-A + Méga-Dimension)', games: ['za', 'zadlc'] },
  { id: 'paldea', n: 'Paldea', fr: 'Marque de Paldea (Écarlate / Violet + extensions)', games: ['sv', 'svmask', 'svdisk'] },
  { id: 'hisui', n: 'Hisui', fr: 'Marque de Hisui (Légendes Arceus)', games: ['la'] },
  { id: 'sinnoh', n: 'DÉ / PS', fr: 'Marque de Sinnoh (Diamant Étincelant / Perle Scintillante)', games: ['bdsp'] },
  { id: 'galar', n: 'Galar', fr: 'Marque de Galar (Épée / Bouclier + extensions)', games: ['sw', 'swisle', 'swcrown'] },
  { id: 'lgpe', n: 'Let’s Go', fr: 'Marque Let’s Go (Pikachu / Évoli)', games: ['lgpe'] },
  { id: 'go', n: 'GO', fr: 'Marque GO (Pokémon GO)', games: ['go'] },
  { id: 'alola', old: 1, n: 'Alola', fr: 'Trèfle (Soleil / Lune, Ultra-Soleil / Ultra-Lune)', games: ['sm', 'usum'] },
  { id: 'kalos', old: 1, n: 'Kalos', fr: 'Pentagone (X / Y, Rubis Oméga / Saphir Alpha)', games: ['xy', 'oras'] },
  { id: 'none', old: 1, n: 'Sans marque', s: 'Gén. IV–V', fr: 'Sans marque (IVᵉ–Vᵉ génération, via Poké Transfert / Pokémon Bank)', games: ['dp', 'pt', 'hgss', 'bw', 'b2w2'], noimg: 1 },
  { id: 'gb', old: 1, n: 'Game Boy', s: 'GB', fr: 'Marque Game Boy (Console virtuelle 3DS : Rouge / Bleu / Jaune / Or / Argent / Cristal)', games: ['rb', 'y', 'gs', 'c'] },
];
const ORI = Object.fromEntries(ORIGINS.map((o, i) => [o.id, { ...o, i }]));
const ORIGIN_OF = {}; ORIGINS.forEach(o => o.games.forEach(g => ORIGIN_OF[g] = o.id));
const originOf = c => ORIGIN_OF[c] || null;
// v23 (chosen rule): only Switch-era marks count for HOME gold — Let's Go, Galar, DÉ/PS, Hisui, Paldea, Z-A, GO (except Mythicals), and GBA (Rouge Feu / Vert Feuille Switch) once added.
// Old marks (Game Boy, pentagon, clover, « Sans marque ») keep their buttons and marks but do not count (Pokémon Bank closing).
// GBA originals (Rubis/Saphir/Émeraude, Rouge Feu/Vert Feuille GBA): no HOME link (h: null) → Transféré greyed, no mark; Pal Park path = « Sans marque »
const GBA_IDS = new Set(['rs', 'e', 'frlg']);
const isGoldMark = m => !!ORI[m] && !ORI[m].old;
const marksOf = games => [...new Set(games.map(originOf).filter(Boolean))].sort((a, b) => ORI[a].i - ORI[b].i);
const omIcon = m => (!m || !ORI[m] || ORI[m].noimg) ? homeBall : `<span class="om om-${m}" aria-hidden="true"></span>`;
// Battle-only (p.bo): Primo, Éternamax, in-battle forms — inherit base marks. Megas use p.mb + Méga-Gemme (Z-A). Gigamax are separately markable.
// Outside Légendes Z-A, Megas are battle-only too (inherit the base marks); in Z-A they follow the Méga-Gemme rules.
// v28: in Pokémon GO, Megas and Primals are registered forms (Mega Evolution / Primal Reversion), markable separately — not battle-only.
const megaBo = (p, c) => !!(p && p.mb && c && c !== 'home' && c !== 'go' && !isZa(c));
const boC = (p, c) => !!p.bo && !(c === 'go' && p.c === 'primal'); // battle-only in context c (Primo-Kyogre / Groudon: not in GO)
const mp = (p, c) => (boC(p, c) && BY_KEY[p.bo]) || (megaBo(p, c) && BY_KEY[p.mb]) || p;
const isCombat = (p, c) => boC(p, c) || megaBo(p, c); // not counted in totals for context c
// v28: GO counts for gold completion (jeux actuels, HOME) only for regular forms: not GO Megas / Primals / Gigamax (form totals only; Gigamax cannot leave GO)
const goGold = p => !!p.go && !p.mb && p.c !== 'gmax' && p.c !== 'primal';
// v39: Mythicals cannot leave GO for HOME, except Meltan / Melmetal (core gt)
const goMy = p => !!p.my && !p.gt;
const gkey = (c, p) => c + ':' + mp(p, c).k;
// Save groups: a game and its expansions share one save (sw + swisle + swcrown, sv + svmask + svdisk, za + zadlc). Marks are written to every game of the group where the entry exists.
const saveOf = g => (GAME_BY[g] && GAME_BY[g].base) || g;
const saveGames = g => GAMES.filter(x => saveOf(x.id) === saveOf(g)).map(x => x.id);
// v41: interchangeable forms (REVUE-FORMES-2). FLINK = games where the forms share one mark ('*' = everywhere, 'home' = HOME transfers);
// FSHORT = species with separate marks + « Cocher toutes les formes » in their Formes block (except where linked).
const FLINK = { 493: '*', 773: '*', 676: ['xy'], 649: ['bw', 'b2w2', 'home'], 483: ['home'], 484: ['home'], 487: ['home'], 646: ['home'], 800: ['home'], 888: ['home'], 889: ['home'], 898: ['home'], 1017: ['sv', 'home'] }; // v48: Ogerpon linked in Écarlate / Violet (one Ogerpon, mask = held item)
const FSHORT = new Set([386, 412, 479, 483, 484, 487, 492, 585, 586, 641, 642, 645, 646, 647, 649, 676, 718, 720, 741, 800, 888, 889, 898, 905, 1017]);
const fSibs = p => (FORMS[p.id] || []).filter(q => !q.mb && !q.bo && q.c !== 'gmax');
const fLinked = (p, c) => { const l = FLINK[p.id]; if (!l || !c || p.mb || p.bo || p.c === 'gmax') return false; return l === '*' || l.includes(c) || (!!GAME_BY[c] && l.includes(saveOf(c))); };
const fIn = (q, c) => c === 'go' ? !!q.go : GIDX[c] !== undefined && inGame(q, GIDX[c]);
const linkSet = (p, c) => fLinked(p, c) ? fSibs(p).filter(q => q === p || c === 'home' || fIn(q, c)) : [p];
const grpTargets = (c, p) => { if (!GAME_BY[c]) return [c]; const av = gamesOf(mp(p, c)); const t = saveGames(c).filter(g => av.includes(g)); return t.length ? t : [c]; };
// Entry listed in a game where it does not exist but a game of the same save does (Méga-Dex: Méga-Dimension-only species in the Z-A context) → read that game's marks (identical: marks are written to the whole save group)
const ctxFor = (p, c) => { if (!GAME_BY[c] || inGame(p, GIDX[c])) return c; const g = saveGames(c).find(x => inGame(p, GIDX[x])); return g || c; };
const sharedWith = (c, p) => grpTargets(c, p).filter(g => g !== c);
const grpsOf = av => [...new Set(av.map(saveOf))];
const grpHas = (G, have) => have.some(h => saveOf(h) === G);
const grpDone = (av, have) => { const gs = grpsOf(av); return gs.length > 0 && gs.every(G => grpHas(G, have)); };
let HOME_C = new Map(), HOME_S = new Map(), HOME_R = new Map(); // HOME_C: entry key -> [origin marks]; HOME_S: entry keys shiny in HOME
let CAUGHT_BY = new Map(), SHINY_BY = new Map(); // entry key -> [game ids incl. 'go'] with a per-game mark
function rebuildHome() {
  CAUGHT_BY = new Map(); SHINY_BY = new Map();
  for (const [set, map] of [[CAUGHT_G, CAUGHT_BY], [SHINY_G, SHINY_BY]]) for (const x of set) { const i = x.indexOf(':'); const k = x.slice(i + 1); (map.get(k) || map.set(k, []).get(k)).push(x.slice(0, i)); }
  const sg = CAUGHT_BY.get(SAL_G); if (sg) { const a = CAUGHT_BY.get(SAL_A) || []; CAUGHT_BY.set(SAL_A, [...new Set([...a, ...sg])]); CAUGHT_BY.delete(SAL_G); } // v44: Salarsen Gigamax caught = Aigüe or Grave
  HOME_C = new Map(); HOME_S = new Map(); // entry key -> [origin marks]
  const push = (map, k, m) => { if (!m) return; const a = map.get(k) || map.set(k, []).get(k); if (!a.includes(m)) a.push(m); };
  for (const x of HOME_O) { const i = x.indexOf(':'); push(HOME_C, x.slice(i + 1), x.slice(0, i)); }
  HOME_R = new Map([...HOME_C].map(([k, v]) => [k, [...v]])); // v47: raw per key (Salarsen « Gigamax Aigüe » / « Gigamax Grave » separately)
  const hg = HOME_R.get(SAL_G); if (hg) for (const m of hg) push(HOME_C, SAL_A, m); // entry level: Salarsen Gigamax in HOME = Aigüe or Grave (as in the games)
  for (const k of HOME_SH) if (HOME_R.has(k)) { HOME_S.set(k, []); if (k === SAL_G) HOME_S.set(SAL_A, []); } // v24: shiny in HOME (one mark per form)
}
rebuildHome();
// Games (incl. 'go') compatible with HOME in which an entry exists. Needs the regional dex files of the compatible games (loaded when HOME is selected).
const COMPAT = () => [...GAMES.filter(g => g.h).map(g => g.id), 'go'];
const gamesOf = p => GAMES.filter((g, i) => inGame(p, i)).map(g => g.id);
// Origin marks a Pokémon / form can carry in HOME = marks of the HOME-compatible games where it exists (+ GO, except Mythicals).
const homeAvail = p => {
  // Z-A Megas transfer only from Z-A / Méga-Dimension (not XY/LGPE battle megas, not GO)
  if (p.mb) return marksOf(megaTrackGames(p).filter(g => GAME_BY[g] && GAME_BY[g].h));
  return marksOf([...gamesOf(p).filter(g => GAME_BY[g].h), ...(goGold(p) && !goMy(p) ? ['go'] : [])]);
};
// ---- base view: read-only status derived from the per-game marks
const SWITCH_IDS = new Set(['frlgsw', 'za', 'zadlc', 'svdisk', 'svmask', 'sv', 'la', 'bdsp', 'swcrown', 'swisle', 'sw', 'lgpe']);
function baseStatus(p, av) {
  if (p.bo) { p = mp(p); av = null; }
  // Z-A Megas: capture completion = caught in every Z-A save where the Mega exists (base+gem). No GO / no anciens jeux.
  if (p.mb) {
    av = megaTrackGames(p);
    const go = (S, k) => S.has('go:' + k) ? ['go'] : []; // v28: GO Mega registered = caught (not in completion: av = Z-A only)
    const c = [...zaMegaCaughtGames(p), ...go(CAUGHT_G, p.k)], s = [...zaMegaShinyGames(p), ...go(SHINY_G, p.k)];
    return { c, s, sw: av, old: [], legacyC: false, legacyS: false, any: c.length > 0, shAny: s.length > 0,
      swDone: grpDone(av, c), oldDone: false };
  }
  av ||= gamesOf(p);
  let c = CAUGHT_BY.get(p.k) || [], s = SHINY_BY.get(p.k) || [];
  // Switch / jeux actuels tier: every Switch game where it exists, PLUS Pokémon GO when the species is in GO (same gold-ball tier, not a third level)
  const sw = [...av.filter(g => SWITCH_IDS.has(g)), ...(goGold(p) ? ['go'] : [])];
  const old = av.filter(g => !SWITCH_IDS.has(g));
  const done = grpDone; // a game and its expansions count once
  const legacyC = CAUGHT.has(ik(p)), legacyS = SHINY.has(ik(p));
  return { c, s, sw, old, legacyC, legacyS, any: c.length > 0 || legacyC, shAny: s.length > 0 || legacyS,
    swDone: done(sw, c), oldDone: done(old, c) };
}
const homeAvailF = (p, f) => p.mb ? homeAvail(p) : marksOf([...(f.av || []).filter(g => GAME_BY[g] && GAME_BY[g].h), ...(goGold(p) && !goMy(p) ? ['go'] : [])]);
// "complete" = transferred from every compatible game where it exists (DLC/extension games count only when no base game has it)
const homeGold = p => homeAvail(p).filter(isGoldMark); // marks that count for the gold HOME icon
const homeComplete = (p, av = homeAvail(p)) => { if (p.bo) { p = mp(p); av = homeAvail(p); } av = av.filter(isGoldMark); const t = HOME_C.get(p.k) || []; return av.length > 0 && av.every(m => t.includes(m)); }; // every Switch-era (+ GO) mark where it exists
const isCaught = (p, c = trackCtx()) => {
  p = mp(p, c);
  if (p.mb) {
    if (c === 'home') return HOME_C.has(p.k);
    if (c === 'go') return CAUGHT_G.has('go:' + p.k); // v28: registered in the GO Pokédex (Mega Evolved)
    if (c && isZa(c)) return zaMegaCaughtGames(p).some(g => saveOf(g) === saveOf(c));
    if (c) return false;
    return zaMegaCaughtGames(p).length > 0 || CAUGHT_G.has('go:' + p.k);
  }
  c = ctxFor(p, c);
  if (isSal(p) && c && c !== 'home' && CAUGHT_G.has(c + ':' + SAL_G)) return true; // v44: either Gigamax mark
  return c === 'home' ? HOME_C.has(p.k) : c ? CAUGHT_G.has(gkey(c, p)) : CAUGHT_BY.has(p.k) || CAUGHT.has(ik(p));
};
const isShiny = (p, c = trackCtx()) => {
  p = mp(p, c);
  if (p.mb) {
    if (c === 'home') return HOME_S.has(p.k);
    if (c === 'go') return SHINY_G.has('go:' + p.k);
    if (c && isZa(c)) return zaMegaShinyGames(p).some(g => saveOf(g) === saveOf(c));
    if (c) return false;
    return zaMegaShinyGames(p).length > 0 || SHINY_G.has('go:' + p.k);
  }
  c = ctxFor(p, c);
  return c === 'home' ? HOME_S.has(p.k) : c ? SHINY_G.has(gkey(c, p)) : SHINY_BY.has(p.k) || SHINY.has(ik(p));
};
const isTrans = (p, c = trackCtx()) => { const m = originOf(c); if (!m) return false; const k = mp(p, c).k; return HOME_O.has(m + ':' + k) || (k === SAL_A && HOME_O.has(m + ':' + SAL_G)); } // v47: Salarsen Gigamax = Aigüe or Grave HOME mark, isSTrans = (p, c = trackCtx()) => STRANS_G.has(gkey(ctxFor(mp(p, c), c), p));
// ---- v25 Barons (Alpha). Sources: Bulbapedia « Alpha Pokémon », Serebii (Legends Arceus / Z-A). Never Legendary / Mythical, Megas, battle-only variants, gift-only forms.
const ALPHA_GAMES = new Set(['la', 'za', 'zadlc']);
const ALPHA_NO = new Set(['37-alola', '38-alola', '670-eternal', '172-spiky-eared']); // PLA: Alolan Vulpix / Ninetales (gift). Z-A: Floette Fleur Éternelle (gift), Pichu Troizépi (event)
const ALPHA_MARK = { la: 'hisui', za: 'za', zadlc: 'za' }; // HOME origin mark of each Legends game
const isRegional = q => /-(alola|galar|hisui|paldea)(-(?!cap)|$)/.test(q.k);
function alphaOk(p, c) {
  if (!p || !ALPHA_GAMES.has(c) || p.mb || p.bo || ALPHA_NO.has(p.k)) return false;
  const b = BY_KEY[String(p.id)] || p; if (b.lg || b.my || p.lg || p.my) return false;
  if (!saveGames(c).some(g => inGame(p, GIDX[g]))) return false; // not in that game (or its expansion)
  // PLA: species with a Hisuian form are only wild in that form (Kantonian Growlithe, Johto Typhlosion… = transfer only), except Sneasel (both wild)
  // v34: Z-A / Méga-Dimension = only the species Poképédia lists with a Baron level (core zb); non-regional forms follow their base. Stored marks are kept, just hidden.
  if (c !== 'la' && !(p.zb || (p.c !== 'reg' && b.zb))) return false;
  if (c === 'la' && p.id !== 215 && !p.k.includes('-hisui') && (FORMS[p.id] || []).some(q => q.k.includes('-hisui'))) return false;
  return true;
}
const isBaron = (p, c = trackCtx()) => { p = mp(p, c); if (!alphaOk(p, c)) return false; return BARON_G.has(gkey(ctxFor(p, c), p)); };
const isBaronS = (p, c = trackCtx()) => { p = mp(p, c); if (!alphaOk(p, c)) return false; return BARONS_G.has(gkey(ctxFor(p, c), p)); };
const alphaHomeGames = p => ['la', 'za'].filter(c => alphaOk(p, c)); // HOME: Baron buttons only for forms that can be Alpha in PLA or Z-A
const homeBaronOn = p => alphaHomeGames(p).some(c => HOME_O.has(ALPHA_MARK[c] + ':' + p.k)); // … active only with the Hisui / Z-A mark ticked
// The sheet has its own tracking context: its game switcher (state.dgame). 'all' = overview (general infos, read-only); 'home' = Pokémon HOME sheet (origin marks).
let sheetPref = null; // game chosen in the sheet switcher during this visit to the sheets (reset on return to the list)
const sheetCtx = () => { const d = state.dgame; return d === 'home' ? 'home' : (GAME_BY[d] || d === 'go') ? d : null; };
const saveTrack = () => { store.set('caught_g', [...CAUGHT_G]); store.set('shiny_g', [...SHINY_G]); store.set('home_g', [...TRANS_G]); store.set('homeshiny_g', [...STRANS_G]); store.set('home_o', [...HOME_O]); store.set('home_og', [...HOME_OG]); store.set('mega_gems', [...MEGA_GEMS]); store.set('mega_energy', [...MEGA_ENERGY]); store.set('go_dynamax', [...DYNAMAX]); rebuildHome(); for (const k of [...HOME_SH]) if (!HOME_R.has(k)) HOME_SH.delete(k); store.set('home_sh', [...HOME_SH]);
  for (const k of [...HOME_B]) if ((!BY_KEY[k] && !FEM_OF[k]) || !['hisui', 'za'].some(m => HOME_O.has(m + ':' + k))) HOME_B.delete(k); // HOME Baron needs the Hisui or Z-A mark (v34: a form no longer Baron-capable keeps its mark, hidden)
  // v47: Baron shiny marks (BARONS_G / HOME_BS) are frozen: no button, never shown or changed, kept in storage + export (future « mode Collection »)
  store.set('baron_g', [...BARON_G]); store.set('barons_g', [...BARONS_G]); store.set('home_b', [...HOME_B]); store.set('home_bs', [...HOME_BS]); rebuildHome(); }; // shiny in HOME needs ≥ 1 transfer mark
function toggleMark(p, kind, c = trackCtx(), base = null) {
  if (!c || c === 'home' || boC(p, c) || (p.mb && c !== 'go')) return; // base view, HOME, battle-only, and Z-A Megas (caught/shiny derived from base + gem)
  if (c === 'go' && kind === 'shiny' && p.c === 'gmax' && DET && DET.p === p && DET.f && !goShinyOk(DET.f.go)) return; // no shiny for this Gigamax in GO (yet)
  const on = !(kind === 'caught' ? CAUGHT_G : SHINY_G).has(gkey(c, p));
  for (const q of linkSet(p, c)) for (const g of grpTargets(c, q)) { // every game of the save group where the entry exists (v41: every linked form)
    const k = gkey(g, q);
    // chain: shiny ⇒ caught, transferred ⇒ caught, shiny transferred ⇒ shiny + transferred + caught; removing Capturé clears shiny + transfer flags of that game
    if (kind === 'caught') { if (on) CAUGHT_G.add(k); else { CAUGHT_G.delete(k); SHINY_G.delete(k); STRANS_G.delete(k); BARON_G.delete(k); } }
    else if (on) { SHINY_G.add(k); CAUGHT_G.add(k); } else { SHINY_G.delete(k); STRANS_G.delete(k); } // v25: no Capturé → no Baron (v47: Baron shiny marks frozen, untouched)
  }
  if (on && p.c === 'gmax') { const b = base || BY_KEY[p.gbk] || (FORMS[p.id] || [])[0]; // v37: Gigamax caught / shiny ⇒ its base form caught / shiny in the same game (unticking leaves the base)
    if (b && b !== p && !boC(b, c)) for (const g of grpTargets(c, b)) { const k = gkey(g, b); CAUGHT_G.add(k); if (kind === 'shiny') SHINY_G.add(k); } }
  // Removing Capturé clears the origin transfer only if it was set from a game sheet and no other game of that mark (e.g. X/Y ↔ ROSA) still has it caught.
  // A transfer ticked on the Pokémon HOME sheet (or received by trade) is never cleared by the games.
  if (c === 'go') { // v28: GO Mega / Primal registered ⇒ base form caught + its Méga-énergie (shiny ⇒ base shiny); unticking the base clears its Megas
    if (goTemp(p) && on) { const b = goTempBase(p); if (b) { CAUGHT_G.add('go:' + b.k); if (kind === 'shiny') SHINY_G.add('go:' + b.k); } MEGA_ENERGY.add(energyId(p)); }
    if (!goTemp(p) && !on) for (const m of goTempsOf(p)) { SHINY_G.delete('go:' + m.k); if (kind === 'caught') CAUGHT_G.delete('go:' + m.k); }
  }
  if (kind === 'caught' && !on) { const m = originOf(c), mk = m + ':' + p.k; if (HOME_OG.has(mk) && !ORI[m].games.some(g => CAUGHT_G.has(gkey(g, p)))) { HOME_O.delete(mk); HOME_OG.delete(mk); } }
  saveTrack();
}
// v44: Salarsen Gigamax « Gigamax Aigüe » / « Gigamax Grave » (same mark from the Gigamax sheet and from the Gigamax button of Forme Aigüe / Forme Grave).
// Tick ⇒ that base form caught in the same game. Untick: Shiny / Transféré of the entry are cleared only once neither Gigamax mark is left in that game.
function toggleSal(v, c) {
  const a = BY_KEY[SAL_A]; if (!a || !c || c === 'home' || !gmaxInGame(a, c)) return;
  const ts = grpTargets(c, a), on = !salOn(v, c);
  for (const g of ts) { const k = g + ':' + salKey(v); if (on) CAUGHT_G.add(k); else CAUGHT_G.delete(k); }
  if (on) { const b = BY_KEY[SAL_BASE[v]]; if (b) for (const g of grpTargets(c, b)) CAUGHT_G.add(gkey(g, b)); }
  else if (!salOn(v === 'G' ? 'A' : 'G', c)) {
    for (const g of ts) { const k = g + ':' + SAL_A; SHINY_G.delete(k); STRANS_G.delete(k); BARON_G.delete(k); }
  }
  if (!on) { const m = originOf(c), mk = m + ':' + salKey(v); if (m && ORI[m] && HOME_OG.has(mk) && !ORI[m].games.some(g => CAUGHT_G.has(g + ':' + salKey(v)))) { HOME_O.delete(mk); HOME_OG.delete(mk); } } // v47: per variant
  saveTrack();
}
// v44: shared Shiny on the Salarsen Gigamax sheet: ticking it with only « Gigamax Grave » marked keeps Aigüe unticked and makes Forme Grave shiny.
function toggleSalShiny(c) {
  const a = BY_KEY[SAL_A]; if (!a || !c || c === 'home') return;
  const on = !SHINY_G.has(gkey(ctxFor(a, c), a));
  if (on && salOn('G', c) && !salOn('A', c)) { toggleMark(a, 'shiny', c, BY_KEY[SAL_BASE.G]); for (const g of grpTargets(c, a)) CAUGHT_G.delete(g + ':' + SAL_A); saveTrack(); }
  else toggleMark(a, 'shiny', c);
}
// "Transféré" from a GAME sheet: sets the transfer of that game's origin mark (same state as the HOME sheet) and marks Capturé in that game.
// (shiny = legacy shiny transfer, no longer in the UI: per-game STRANS_G kept for the future HOME redesign)
function toggleTransfer(p, shiny, c = trackCtx()) {
  if (!c || c === 'home' || !homeKind(c) || p.bo || megaBo(p, c) || (c === 'go' && (goMy(p) || goTemp(p) || p.c === 'gmax'))) return; // Mythicals, Megas / Primals and Gigamax cannot be transferred from GO
  const m = originOf(c); if (!m) return;
  if (isSal(p) && !shiny) return toggleSalTransfer(p, c, m);
  const mk = m + ':' + p.k, on = shiny ? !STRANS_G.has(gkey(c, p)) : !HOME_O.has(mk);
  for (const q of linkSet(p, 'home')) { const qk = m + ':' + q.k; // v41: linked in HOME ⇒ every form gets the transfer
    if (on) { if (q === p || !HOME_O.has(qk)) { HOME_O.add(qk); HOME_OG.add(qk); } } else if (!shiny) { HOME_O.delete(qk); HOME_OG.delete(qk); } }
  for (const g of grpTargets(c, p)) {
    const k = gkey(g, p);
    if (shiny) { if (on) { STRANS_G.add(k); if (!p.mb) { if (!(isSal(p) && CAUGHT_G.has(g + ':' + SAL_G))) CAUGHT_G.add(k); SHINY_G.add(k); } } else STRANS_G.delete(k); }
    else if (on) { if (!p.mb && !(isSal(p) && CAUGHT_G.has(g + ':' + SAL_G))) CAUGHT_G.add(k); } // Megas: caught stays derived (base + gem); v44: Salarsen Gigamax already caught as Grave
    else STRANS_G.delete(k);
  }
  if (on && isZa(c) && !p.mb && !p.bo) gemMegaTransfers(p, c, true);
  saveTrack();
}
// v47: « Transféré vers HOME » on a Salarsen Gigamax game sheet = the HOME mark of each Gigamax variant ticked in that game (Aigüe, Grave or both;
// none ticked ⇒ Aigüe + Capturé « Gigamax Aigüe », as before). Pressed = every such variant has its HOME mark. Tick ⇒ the missing marks (flagged « set
// from a game »). Untick ⇒ only the marks set from a game sheet (HOME_OG); marks ticked on the HOME sheet stay, unless all of them came from there.
const salTransVs = c => { const vs = ['A', 'G'].filter(v => salOn(v, c)); return vs.length ? vs : ['A']; };
const salTransOn = c => { const m = originOf(c); return !!m && salTransVs(c).every(v => HOME_O.has(m + ':' + salKey(v))); };
function toggleSalTransfer(p, c, m) {
  const vs = salTransVs(c);
  if (!salTransOn(c)) {
    if (!salOn('A', c) && !salOn('G', c)) for (const g of grpTargets(c, p)) CAUGHT_G.add(g + ':' + SAL_A);
    for (const v of vs) { const k = m + ':' + salKey(v); if (!HOME_O.has(k)) { HOME_O.add(k); HOME_OG.add(k); } }
  } else {
    let n = 0; for (const v of ['A', 'G']) { const k = m + ':' + salKey(v); if (HOME_OG.has(k)) { HOME_O.delete(k); HOME_OG.delete(k); n++; } }
    if (!n) for (const v of vs) HOME_O.delete(m + ':' + salKey(v));
  }
  saveTrack();
}
// v25 Baron (Légendes games): Baron ⇒ Capturé. No effect on completion. v47: the « Baron shiny » button is gone (stored marks kept, frozen).
function toggleBaron(p, shiny, c = trackCtx()) {
  if (shiny || !alphaOk(p, c)) return;
  const on = !(shiny ? BARONS_G : BARON_G).has(gkey(c, p));
  for (const g of grpTargets(c, p)) {
    const k = gkey(g, p);
    if (on) { BARON_G.add(k); CAUGHT_G.add(k); if (shiny) { BARONS_G.add(k); SHINY_G.add(k); } }
    else BARON_G.delete(k);
  }
  saveTrack();
}
// HOME sheet: Baron per form, independent of the games; only with the Hisui or Z-A mark. v47: no « Baron shiny » (HOME_BS kept, frozen).
function toggleHomeBaron(p0, shiny) {
  const p = mp(p0, 'home'), k = p.k; if (shiny || p0.bo || !homeBaronOn(p)) return;
  if (HOME_B.has(k)) HOME_B.delete(k); else HOME_B.add(k);
  saveTrack();
}
// Z-A: transferring the base while owning a Mega gem also transfers that Mega
function gemMegaTransfers(p, c, fromGame) {
  for (const m of E) {
    if (m.mb !== p.k && m.mb2 !== p.k && m.mb !== String(p.id)) continue;
    if (!hasGem(m, c)) continue;
    const mk = 'za:' + m.k; HOME_O.add(mk); if (fromGame) HOME_OG.add(mk);
  }
}
// Origin mark ticked on the HOME sheet (transfer, or Pokémon received by trade in HOME): no Capturé in the origin game.
// « Shiny » on the HOME sheet: one mark per form, only when at least one origin mark is ticked
function toggleHomeShiny(p0) {
  const p = mp(p0, 'home'); if (p0.bo || p.bo || !HOME_C.has(p.k)) return;
  if (HOME_SH.has(p.k)) HOME_SH.delete(p.k); else HOME_SH.add(p.k);
  saveTrack();
}
// v24 migration (once): old per-game shiny transfers (homeshiny_g) → shiny in HOME
function migrateHomeShiny() {
  if (store.get('home_sh', null) !== null) return;
  for (const x of STRANS_G) { const k = x.slice(x.indexOf(':') + 1), p = BY_KEY[k]; HOME_SH.add(p && (p.bo || megaBo(p, x.slice(0, x.indexOf(':')))) ? mp(p).k : k); }
  saveTrack();
}
function toggleHomeOrigin(p0, m, base = null) {
  const p = mp(p0, 'home'); if (p0.bo || p.bo || !ORI[m] || (!homeAvail(p).includes(m) && !HOME_O.has(m + ':' + p.k))) return;
  const mk = m + ':' + p.k, on = !HOME_O.has(mk);
  for (const q of linkSet(p, 'home')) { const qk = m + ':' + q.k; // v41: linked in HOME
    if (on) { if (q === p || !HOME_O.has(qk)) { HOME_O.add(qk); HOME_OG.delete(qk); } } else { HOME_O.delete(qk); HOME_OG.delete(qk); } }
  if (on && m === 'za' && !p.mb) gemMegaTransfers(p, 'za', false);
  if (on && isGmx(p)) { const b = base || BY_KEY[p.gbk] || (FORMS[p.id] || [])[0]; // v47: like the games (v37), a Gigamax in HOME ⇒ its base form gets the same origin mark (unticking leaves the base)
    if (b && b !== p && !b.bo && homeAvail(b).includes(m)) for (const q of linkSet(b, 'home')) { const qk = m + ':' + q.k; if (!HOME_O.has(qk)) { HOME_O.add(qk); HOME_OG.delete(qk); } } }
  saveTrack();
}
// v47: « Gigamax » button of a base HOME sheet = the HOME mark of its Gigamax sheet (6-gmax, 869-gmax for the 63 Charmilly forms, the shared
// Salarsen Gigamax entry for « Gigamax Aigüe » / « Gigamax Grave »). Tick = its origin mark (Galar: the only game a Gigamax can come from) + this base form;
// untick = every origin mark of the Gigamax entry (its HOME shiny goes with it), the base form keeps its marks.
const gmaxHomeMark = g => { const av = homeAvail(g); return av.find(isGoldMark) || av[0] || null; };
function toggleHomeGmax(g, base) {
  if (!isGmx(g)) return;
  const t = HOME_R.get(g.k);
  if (t && t.length) { for (const m of t) { HOME_O.delete(m + ':' + g.k); HOME_OG.delete(m + ':' + g.k); } saveTrack(); return; }
  const m = gmaxHomeMark(g); if (m) toggleHomeOrigin(g, m, base);
}
// v47: Salarsen Gigamax in HOME, two marks: « Gigamax Aigüe » (entry key) / « Gigamax Grave » (849-low-key-gmax). Tick ⇒ its origin mark + Galar on
// the matching base form (Forme Aigüe / Forme Grave); untick ⇒ every origin mark of that variant (its HOME shiny goes with it), base unchanged.
const salHomeOn = v => HOME_R.has(salKey(v));
function toggleSalHome(v) {
  const a = BY_KEY[SAL_A]; if (!a) return; const key = salKey(v), t = HOME_R.get(key);
  if (t && t.length) { for (const m of t) { HOME_O.delete(m + ':' + key); HOME_OG.delete(m + ':' + key); } saveTrack(); return; }
  if (v === 'A') return toggleHomeGmax(a, BY_KEY[SAL_BASE.A]);
  const m = gmaxHomeMark(a); if (!m) return; HOME_O.add(m + ':' + key); HOME_OG.delete(m + ':' + key);
  const b = BY_KEY[SAL_BASE.G]; if (b && !b.bo && homeAvail(b).includes(m)) for (const q of linkSet(b, 'home')) { const qk = m + ':' + q.k; if (!HOME_O.has(qk)) { HOME_O.add(qk); HOME_OG.delete(qk); } }
  saveTrack();
}
function toggleSalHomeShiny(v) { const key = salKey(v); if (!HOME_R.has(key)) return; if (HOME_SH.has(key)) HOME_SH.delete(key); else HOME_SH.add(key); saveTrack(); }
// v47 migration (once, nothing removed): the shared v44–v47 HOME mark stays « Gigamax Aigüe »; copied to « Gigamax Grave » (origin marks, « set from a
// game » flag, HOME shiny) only if a « Gigamax Grave » capture mark exists in a game. Re-run on import of a backup made before this split (no sal_h47).
function migrateSalHome(force) {
  if (!force && store.get('sal_h47', 0)) return;
  const t = HOME_R.get(SAL_A) || [];
  if (t.length && [...CAUGHT_G].some(x => typeof x === 'string' && x.endsWith(':' + SAL_G))) {
    for (const m of t) { const ka = m + ':' + SAL_A, kg = m + ':' + SAL_G; if (!HOME_O.has(kg)) { HOME_O.add(kg); if (HOME_OG.has(ka)) HOME_OG.add(kg); } }
    if (HOME_SH.has(SAL_A)) HOME_SH.add(SAL_G);
  }
  store.set('sal_h47', 1); saveTrack();
}
// v22 migration (once): per-game transfers (home_g, homeshiny_g) → per origin mark, flagged "set from a game" (they implied Capturé)
function migrateOrigins() {
  if (store.get('home_o', null) !== null) return;
  for (const x of [...TRANS_G, ...STRANS_G]) { const i = x.indexOf(':'), m = originOf(x.slice(0, i)), k = x.slice(i + 1); if (!m) continue; HOME_O.add(m + ':' + k); HOME_OG.add(m + ':' + k); }
  saveTrack();
}
function toggleGem(p, c = 'za') {
  if (!p?.mb) return;
  const on = !hasGem(p, c), G = gemGrp(c);
  for (const q of [p, ...gemMates(p)]) if (on) MEGA_GEMS.add(G + ':' + q.k); else MEGA_GEMS.delete(G + ':' + q.k); // same stone → every form of the species, in this save group only
  saveTrack();
}
const transValid = x => markValid(x) && !!homeKind(x.split(':')[0]);
const markValid = x => typeof x === 'string' && /^([a-z0-9]+):\d+(-[a-z0-9-]+)?$/.test(x) && (GAME_BY[x.split(':')[0]] || x.startsWith('go:'));
// Saved marks migration (run at start and after an import): union across each save group (nothing is lost) and move marks of battle-only variants onto their base form.
// v34 migration: forms merged into their base (Papilord, Lépidonille, Pérégrain: core.mg « old key → base key »). Every saved mark of an
// old form moves to the base (union, nothing lost). Idempotent: runs at each start / after an import, only writes when something moved.
function migrateMerged() {
  const MG = (DATA && DATA.mg) || {}; if (!Object.keys(MG).length) return;
  const mapK = x => { if (typeof x !== 'string') return x; if (MG[x]) return MG[x]; const i = x.indexOf(':'); return i > 0 && MG[x.slice(i + 1)] ? x.slice(0, i + 1) + MG[x.slice(i + 1)] : x; };
  const sets = { favs: FAVS, shiny_g: SHINY_G, caught_g: CAUGHT_G, home_g: TRANS_G, homeshiny_g: STRANS_G, baron_g: BARON_G, barons_g: BARONS_G, home_o: HOME_O, home_og: HOME_OG, home_sh: HOME_SH, home_b: HOME_B, home_bs: HOME_BS };
  for (const [name, set] of [...Object.entries(sets), ['caught', CAUGHT, 1], ['shiny', SHINY, 1]].map(x => x)) {
    const ikSet = name === 'caught' || name === 'shiny'; let ch = false;
    for (const x of [...set]) { const y = mapK(x); if (y !== x) { set.delete(x); set.add(ikSet && typeof y === 'string' && /^\d+$/.test(y) ? +y : y); ch = true; } }
    if (ch) store.set(name, [...set]);
  }
}
// v44 migration (idempotent, nothing lost): the removed Salarsen Gigamax (Grave) entry. Its per-game captures stay as the « Gigamax Grave » mark (same keys);
// its shiny / Baron / favourite / old manual marks join the single entry (shared Shiny). v47: its HOME marks stay (« Gigamax Grave » in HOME).
function migrateSal() {
  let ch = false; const mv = (set, x, y) => { set.delete(x); if (!set.has(y)) set.add(y); ch = true; };
  for (const set of [SHINY_G, TRANS_G, STRANS_G, BARON_G, BARONS_G]) for (const x of [...set]) if (typeof x === 'string' && x.endsWith(':' + SAL_G)) mv(set, x, x.slice(0, -SAL_G.length) + SAL_A);
  for (const set of [HOME_B, HOME_BS, FAVS, CAUGHT, SHINY]) if (set.has(SAL_G)) mv(set, SAL_G, SAL_A); // v47: HOME_O / HOME_OG / HOME_SH on 849-low-key-gmax = the « Gigamax Grave » HOME mark (kept)
  for (const x of SHINY_G) if (x.endsWith(':' + SAL_A)) { const g = x.slice(0, -SAL_A.length - 1); if (!CAUGHT_G.has(g + ':' + SAL_A) && !CAUGHT_G.has(g + ':' + SAL_G)) { CAUGHT_G.add(g + ':' + SAL_A); ch = true; } } // shiny ⇒ caught
  if (ch) { saveTrack(); store.set('favs', [...FAVS]); store.set('caught', [...CAUGHT]); store.set('shiny', [...SHINY]); }
}
// v48 migration (idempotent, nothing removed): species newly linked in a game (Ogerpon in Écarlate / Violet + extensions) → each per-game mark
// of one linked form is copied to every linked form present in that game (union).
function migrateLinkV48() {
  let ch = false;
  for (const set of [CAUGHT_G, SHINY_G, TRANS_G, STRANS_G, BARON_G, BARONS_G]) for (const x of [...set]) {
    if (typeof x !== 'string') continue; const i = x.indexOf(':'), g = x.slice(0, i), p = BY_KEY[x.slice(i + 1)];
    if (!p || p.id !== 1017 || !GAME_BY[g] || !fLinked(p, g)) continue;
    for (const q of linkSet(p, g)) { const y = g + ':' + q.k; if (!set.has(y)) { set.add(y); ch = true; } }
  }
  if (ch) saveTrack();
}
function migrateMarks() {
  migrateMerged(); migrateSal(); migrateFem(); migrateLinkV48();
  let changed = false;
  const salG = x => x.endsWith(':' + SAL_A) && CAUGHT_G.has(x.slice(0, -SAL_A.length) + SAL_G); // v44: Salarsen Gigamax shiny with only « Gigamax Grave » = already caught
  for (const x of [...STRANS_G]) for (const set of [TRANS_G, SHINY_G, CAUGHT_G]) if (!set.has(x) && !(set === CAUGHT_G && salG(x))) { set.add(x); changed = true; }
  for (const x of [...TRANS_G, ...SHINY_G]) if (!CAUGHT_G.has(x) && !salG(x)) { CAUGHT_G.add(x); changed = true; }
  for (const pass of [0, 1]) for (const set of [CAUGHT_G, SHINY_G, TRANS_G, STRANS_G, BARON_G, BARONS_G]) {
    for (const x of [...set]) {
      const i = x.indexOf(':'), g = x.slice(0, i), k = x.slice(i + 1), p = BY_KEY[k]; if (!p) continue;
      if (boC(p, g) || megaBo(p, g)) { set.delete(x); set.add(g + ':' + mp(p, g).k); changed = true; continue; }
      if (GAME_BY[g] && saveGames(g).length > 1) for (const t of grpTargets(g, p)) if (!set.has(t + ':' + k)) { set.add(t + ':' + k); changed = true; }
    }
  }
  for (const set of [CAUGHT, SHINY]) for (const x of [...set]) { const p = BY_KEY[x]; if (p && p.bo) { set.delete(x); set.add(ik(mp(p))); changed = true; } }
  for (const set of [HOME_O, HOME_OG]) for (const x of [...set]) { // origin transfers: battle-only variants (and Megas outside Z-A) → base form
    const i = x.indexOf(':'), m = x.slice(0, i), p = BY_KEY[x.slice(i + 1)]; if (!p) continue;
    const q = p.bo ? mp(p) : (p.mb && m !== 'za' ? BY_KEY[p.mb] : null); if (q && q !== p) { set.delete(x); set.add(m + ':' + q.k); changed = true; }
  }
  if (changed) { saveTrack(); store.set('caught', [...CAUGHT]); store.set('shiny', [...SHINY]); }
}
// Virtual dexes (list filter only). « Méga-Dex » = third Légendes Z-A dex: every species with a Mega in the Z-A save group
// (Z-A + Méga-Dimension), base form + its Megas, national order. Tracking context = Légendes Z-A (same save, shared marks).
// « Hors dex » lists of games with expansions (same save): species obtainable (transfer / trade / event) but absent from every dex of the save → separate list, marks in the base game.
// Jeux list (newest first): each extra dex sits just ABOVE the latest expansion of its game group (`before`)
const VDEX = {
  zamega: { game: 'za', before: 'zadlc', mega: 1, n: 'Légendes Pokémon : Z-A – Méga-Dex', s: 'Méga-Dex Z-A' },
  svhors: { game: 'sv', before: 'svdisk', file: 'hors-sv', n: 'Écarlate / Violet (+ extensions) – Hors dex', s: 'Hors dex ÉV' },
  swhors: { game: 'sw', before: 'swcrown', file: 'hors-sw', n: 'Épée / Bouclier (+ extensions) – Hors dex', s: 'Hors dex ÉB' },
};
let MEGADEX = null;
function megaDex() {
  if (MEGADEX) return MEGADEX;
  const megas = E.filter(p => p.mb && megaTrackGames(p).length), keys = new Set();
  for (const m of megas) { keys.add(m.k); if (BY_KEY[m.mb]) keys.add(m.mb); if (BY_KEY[m.mb2]) keys.add(m.mb2); }
  const ids = [...new Set(megas.map(m => m.id))].sort((a, b) => a - b);
  return MEGADEX = { keys, order: new Map(ids.map((id, i) => [id, i])), nums: new Map(), dx: [], extra: new Set(), regional: 0, virtual: true, mega: true, species: ids.length, megas: megas.length };
}
const listDex = () => { const gm = GAME_BY[state.game]; if (!gm) return null; const v = state.vdex && VDEX[state.vdex]; return v ? (v.mega ? megaDex() : DEX['vd:' + state.vdex] || null) : DEX[gm.id] || null; };
const DEX = {}; // game id -> { order: Map(sid -> index), nums: Map(sid -> [di,num,...]), dx: [labels] }

async function getJSON(url) { const r = await fetch(url); if (!r.ok) throw new Error(url + ' ' + r.status); return r.json(); }

async function boot() {
  try {
    DATA = await getJSON('data/core.json');
    try { const me = await getJSON('data/mega-energy.json'); if (me?.ids) ENERGY_ICONS = { generic: me.generic || ENERGY_ICONS.generic, ids: new Set(me.ids.map(String)) }; } catch {}
    try { TRADE = await getJSON('data/trade.json'); } catch {} // v54: Pokémon obtainable only by trade, per game
    try { const ms = await getJSON('data/mega-stones.json'); if (ms?.stones) MEGA_STONES = ms; else if (ms && !ms.fallback) MEGA_STONES = { fallback: MEGA_STONES.fallback, stones: ms }; } catch {}
  } catch (e) {
    $('#results').innerHTML = '<p class="empty">Impossible de charger les données. Ouvrez l’application une fois avec une connexion Internet.</p>';
    return;
  }
  E = DATA.e;
  E.forEach(p => {
    BY_KEY[p.k] = p; (FORMS[p.id] ||= []).push(p);
    if (p.gof && TODAY >= p.gof) p.go = 1; // v28: GO release announced with a date (Gigamax Duralugon 2026-11-06)
    p.nn = norm(fullN(p)); p.ne = norm(p.en); p.nj = norm(p.ja); p.nr = norm(p.ro); p.tot = p.s.reduce((a, b) => a + b, 0);
  });
  E.forEach(p => { if (p.fe) FEM_OF[p.fe.k] = p; }); // v44c
  GAMES = DATA.games; GAMES.forEach((g, i) => { GAME_BY[g.id] = g; GIDX[g.id] = i; g.s = GAME_SHORT[g.id] || g.s; });
  DATA.types.forEach(t => TYPE_FR[t[0]] = t[1]);
  migrateOrigins(); migrateHomeShiny(); migrateEnergy();
  migrateMarks(); rebuildHome(); migrateSalHome();
  store.set('mega_gems', [...MEGA_GEMS]); // legacy un-prefixed gem keys → "za:"
  $('#formsbtn').setAttribute('aria-pressed', state.forms);
  buildControls();
  render(); colInit(); pkInit();
  window.addEventListener('hashchange', route);
  route();
  registerSW();
}

/* ---------------- list ---------------- */
function buildControls() {
  $('#game').innerHTML = '<option value="">Jeux</option><option value="home">Pokémon HOME</option><option value="go">Pokémon GO</option>' +
    GAMES.map(g => Object.entries(VDEX).filter(([, v]) => (v.before || v.game) === g.id).map(([k, v]) => `<option value="${k}">${esc(v.n)}</option>`).join('') + `<option value="${g.id}">${esc(g.n)}</option>`).join('');
  $('#gen').innerHTML = '<option value="">Toutes gén.</option>' +
    GEN_LABELS.slice(1).map((l, i) => `<option value="${i + 1}">Gén. ${l}</option>`).join('');
  $('#typechips').innerHTML = DATA.types.map(t =>
    `<button class="chip" data-t="${t[0]}" aria-pressed="false" style="background:${TYPE_COLORS[t[0]]}">${esc(t[1])}</button>`).join('');
  $('#q').addEventListener('input', e => { state.q = e.target.value; render(); });
  $('#game').addEventListener('change', async e => { await setGame(e.target.value); });
  initGameMenu(); initCatMenu(); initGenMenu(); initSortMenu();
  $('#gen').addEventListener('change', e => { state.gen = e.target.value; render(); });
  $('#cat').addEventListener('change', e => { state.cat = e.target.value; render(); });
  $('#sort').addEventListener('change', e => { state.sort = e.target.value; render(); });
  $('#typechips').addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    toggleType(b.dataset.t);
  });
  $('#viewbtn').addEventListener('click', () => { state.view = state.view === 'grid' ? 'list' : 'grid'; store.set('view', state.view); render(); });
  $('#formsbtn').addEventListener('click', () => { state.forms = !state.forms; store.set('forms', state.forms); $('#formsbtn').setAttribute('aria-pressed', state.forms); render(); });
  $('#reset').addEventListener('click', resetFilters);
  document.addEventListener('keydown', e => { if (e.key === '/' && document.activeElement.tagName !== 'INPUT') { e.preventDefault(); $('#q').focus(); } });
}
async function loadDex(id) {
  if (DEX[id]) return DEX[id];
  const d = await getJSON(`data/dex/${id.startsWith('vd:') ? VDEX[id.slice(3)].file : id}.json`);
  const order = new Map(), nums = new Map(), extra = new Set(d.x || []), nreq = new Set(d.nr || []); // v39: nr = listed but not required (Zarude, Isolarmure)
  d.e.forEach((row, i) => { order.set(row[0], i); nums.set(row[0], row.slice(1)); });
  // Species available in this game but absent from the regional Pokédex → end of list, national order, no regional nº
  (d.x || []).forEach((sid, i) => { if (!order.has(sid)) order.set(sid, d.e.length + i); });
  return DEX[id] = { order, nums, dx: d.dx, extra, nreq, regional: d.e.length, virtual: id.startsWith('vd:') };
}
async function setGame(v) {
  state.vdex = VDEX[v] ? v : '';
  if (VDEX[v]) v = VDEX[v].game;
  state.game = v; $('#game').value = state.vdex || v;
  if (v === 'home') {
  } else if (GAME_BY[v]) {
    try { await loadDex(v); if (state.vdex && VDEX[state.vdex].file) await loadDex('vd:' + state.vdex); } catch { state.game = ''; state.vdex = ''; $('#game').value = ''; toast('Pokédex du jeu indisponible hors-ligne : ouvrez-le une fois avec une connexion.', 'err', 6500); }
  }
  render();
}
function toggleType(t) {
  const i = state.types.indexOf(t);
  if (i >= 0) state.types.splice(i, 1);
  else { state.types.push(t); if (state.types.length > 2) state.types.shift(); }
  render();
}
function resetFilters() {
  Object.assign(state, { q: '', types: [], gen: '', cat: '', sort: 'id', game: '', vdex: '' });
  $('#q').value = ''; $('#gen').value = ''; $('#cat').value = ''; $('#sort').value = 'id'; $('#game').value = '';
  render();
}
function badge(t) { return `<span class="badge" style="background:${TYPE_COLORS[t]}">${esc(TYPE_FR[t])}</span>`; }
const inGame = (p, gi) => !!((p.gb >> gi) & 1);

// v25: in a regional dex, the regional forms of THAT region come first (forms on), and replace the common form when the Formes toggle is off.
// Alola = Soleil/Lune, Ultra-Soleil/Ultra-Lune · Galar = Épée/Bouclier + extensions · Hisui = Légendes Arceus · Paldea = Écarlate/Violet + extensions. Let’s Go = Kanto (common first). Z-A: no Kalos forms.
const REGION_GAMES = { alola: ['sm', 'usum'], galar: ['sw', 'swisle', 'swcrown'], hisui: ['la'], paldea: ['sv', 'svmask', 'svdisk'] };
const REGION_OF_GAME = {}; for (const [r, gs] of Object.entries(REGION_GAMES)) gs.forEach(g => REGION_OF_GAME[g] = r);
// v54: trade-only rows. Keyed rows (« 76-alola ») match that form only; plain ids match the default form or, in a game, the game's regional form.
// GO: exact keys (plain id = default form). f.go = optional trades (free candy evolution): subtle tile, sheet line only.
let TRADE = null; const TRADE_IDX = {};
function tradeIdx(g) {
  if (TRADE_IDX[g]) return TRADE_IDX[g];
  const m = { t: new Map(), f: new Map(), x: new Map() };
  if (TRADE) { for (const [x, r] of (TRADE.g || {})[g] || []) m.t.set(String(x), r); for (const [x, r] of (TRADE.f || {})[g] || []) m.f.set(String(x), r); for (const [x, r] of (TRADE.x || {})[g] || []) m.x.set(String(x), r); }
  return TRADE_IDX[g] = m;
}
const tradeLook = (map, p, g) => map.get(p.k) ?? (g !== 'go' && regionOf(p) && regionOf(p) === REGION_OF_GAME[g] ? map.get(String(p.id)) : undefined);
// → { r: reason, opt: optional } | null
function tradeOf(p, g) { if (!TRADE || !g || g === 'home' || g === 'all') return null; const m = tradeIdx(g), r = tradeLook(m.t, p, g); if (r) return { r, opt: false }; const o = tradeLook(m.f, p, g); return o ? { r: o, opt: true } : null; }
// v55: GO sheet: ⇄ line inside « Disponibilité », reason without its region part (already in the 🌍 line)
function goTradeLi(p) { const t = tradeOf(p, 'go'); if (!t) return ''; const tail = t.r.includes(' : ') ? t.r.slice(t.r.lastIndexOf(' : ') + 3) : t.r;
  return `<li class="trl${t.opt ? ' opt' : ''}"><span class="trk">⇄</span> ${t.opt ? 'Échange facultatif' : 'Échange requis'} : <b>${esc(tail)}</b></li>`; }
// v54: sheet line « ⇄ Échange requis » (reason) or « Indisponible » note, at the top of a game / GO sheet
function tradeBoxHTML(p, g) {
  if (g === 'go') return ''; // v55: GO folds it into Disponibilité (goTradeLi)
  const t = tradeOf(p, g), x = !t && indispoOf(p, g);
  if (t) return `<section class="box tradebox${t.opt ? ' opt' : ''}"><h2><span class="trk">⇄</span> ${t.opt ? 'Échange facultatif' : 'Échange requis'}</h2><p>${esc(t.r)}</p></section>`;
  return x ? `<section class="box tradebox indispo"><h2>Indisponible dans ce jeu</h2><p>${esc(x)}</p></section>` : '';
}
function indispoOf(p, g) { if (!TRADE || !g || g === 'go' || g === 'home' || g === 'all') return null; return tradeLook(tradeIdx(g).x, p, g) || null; }
const regionOf = q => (q.k.match(/-(alola|galar|hisui|paldea)(?:-(?!cap)|$)/) || [])[1] || null;
const REG_REPS = {};
function regionalReps(g) { // species id -> regional form shown first / instead of the common form in this game's regional dex
  if (REG_REPS[g]) return REG_REPS[g];
  const r = REGION_OF_GAME[g], m = new Map(); if (!r) return REG_REPS[g] = m;
  for (const q of E) if (q.c && !q.bo && regionOf(q) === r && inGame(q, GIDX[g]) && !m.has(q.id)) m.set(q.id, q);
  return REG_REPS[g] = m;
}
const listReps = (gid, dex) => dex && !dex.virtual && !dex.mega && REGION_OF_GAME[gid] ? regionalReps(gid) : null;
const regShow = (p, reg) => state.forms ? true : p.c ? !!(reg && reg.get(p.id) === p) : !(reg && reg.has(p.id));
// v26: Ultra-Chimères (Ultra Beasts) — the 11 species; Necrozma / Cosmog line are Legendaries, not UB
const UB_IDS = new Set([793, 794, 795, 796, 797, 798, 799, 803, 804, 805, 806]);
const isUB = p => UB_IDS.has(p.id);
// v32: form categories — Méga-évolutions (Megas + Primo-Résurgences) and Gigamax (+ Éthernatos Infinimax); shown whatever the Formes toggle
const FORM_CATS = { mega: p => p.c === 'mega' || p.c === 'primal', gmax: p => p.c === 'gmax' };
const formCat = (p, cat = state.cat) => !!(FORM_CATS[cat] && FORM_CATS[cat](p));
function filtered() {
  const raw = state.q.trim();
  const qn = norm(raw);
  const numeric = /^#?\d+$/.test(raw) ? parseInt(raw.replace('#', ''), 10) : null;
  const gm = GAME_BY[state.game], dex = listDex(), gi = gm ? GIDX[gm.id] : -1;
  if (gm && !dex) return [];
  const reg = gm ? listReps(gm.id, dex) : null, R = gm && REGION_OF_GAME[gm.id];
  let out = E.filter(p => {
    if (dex && dex.mega) { if (!dex.keys.has(p.k)) return false; } // Méga-Dex: base forms + Megas, whatever the forms toggle
    else if (!(FORM_CATS[state.cat] && formCat(p)) && !regShow(p, reg)) return false;
    if (dex && dex.mega) {
    } else if (dex) {
      if (!dex.order.has(p.id)) return false;
      if (p.c && !inGame(p, gi)) return false;
    } else if (state.game === 'go' && !p.go) return false;
    if (numeric !== null) {
      if (dex && !dex.mega) { const n = dex.nums.get(p.id) || []; if (!n.some((x, i) => i % 2 === 1 && x === numeric) && !(dex.extra.has(p.id) && p.id === numeric)) return false; } // Hors dex: national nº
      else if (p.id !== numeric) return false;
    } else if (qn && !p.nn.includes(qn) && !p.ne.includes(qn) && !p.nj.includes(qn) && !p.nr.includes(qn)) return false;
    if (state.gen && p.g !== +state.gen) return false;
    for (const t of state.types) if (!p.t.includes(t)) return false;
    const key = ik(p);
    if (state.cat === 'trade' && !(tradeOf(p, trackCtx()) && !tradeOf(p, trackCtx()).opt)) return false;
    if (state.cat === 'leg' && !p.lg) return false;
    if (state.cat === 'myth' && !p.my) return false;
    if (state.cat === 'ub' && !isUB(p)) return false;
    if (FORM_CATS[state.cat] && !formCat(p)) return false;
    if (state.cat === 'baby' && !p.ba) return false;
    if (state.cat === 'fav' && !FAVS.has(key)) return false;
    if (state.cat === 'caught' && !isCaught(p)) return false;
    if (state.cat === 'missing' && isCaught(p)) return false;
    if (state.cat === 'shiny' && !isShiny(p)) return false;
    if (state.cat === 'noshiny' && isShiny(p)) return false;
    if (state.cat === 'swdone' && !baseStatus(p).swDone) return false;
    if (state.cat === 'olddone' && !baseStatus(p).oldDone) return false;
    if (state.cat === 'swmiss') { const b = baseStatus(p); if (!b.sw.length || b.swDone) return false; } // exists in current games (Switch + GO) but not gold
    if (state.cat === 'oldmiss') { const b = baseStatus(p); if (!b.old.length || b.oldDone) return false; } // exists in old games but not complete there
    if (state.cat === 'hmiss') { const q = mp(p); if (!homeGold(q).length || homeComplete(q)) return false; } // ≥ 1 Switch-era / GO mark missing (same set as the gold HOME icon)
    if (state.cat === 'nostrans') { const q = mp(p); if (!HOME_C.has(q.k) || HOME_S.has(q.k)) return false; } // in HOME (≥ 1 origin mark) but not marked shiny in HOME
    if (TRANS_CATS.includes(state.cat) && !transCat(p, state.cat)) return false;
    if (BARON_CATS.includes(state.cat) && !baronCat(p, state.cat)) return false;
    return true;
  });
  const pos0 = new Map(out.map((p, i) => [p, i]));
  const rr = p => reg && regionOf(p) === R ? 0 : 1; // regional form of this region before the common form (same species)
  const pos = new Map(out.map(p => [p, rr(p) * 1e6 + pos0.get(p)]));
  const startsWith = p => p.nn.startsWith(qn) || p.ne.startsWith(qn) || p.nj.startsWith(qn) || p.nr.startsWith(qn);
  if (qn && numeric === null && state.sort === 'id') out.sort((a, b) => (startsWith(b) - startsWith(a)) || (dex ? dex.order.get(a.id) - dex.order.get(b.id) : 0) || pos.get(a) - pos.get(b));
  else {
    const key = { id: p => dex ? dex.order.get(p.id) : p.id, name: p => p.nn, total: p => -p.tot, hp: p => -p.s[0], atk: p => -p.s[1], def: p => -p.s[2], spa: p => -p.s[3], spd: p => -p.s[4], spe: p => -p.s[5] }[state.sort];
    out.sort((a, b) => { const x = key(a), y = key(b); return x < y ? -1 : x > y ? 1 : pos.get(a) - pos.get(b); });
  }
  return out;
}
function numHTML(p) {
  const gm = GAME_BY[state.game], dex = listDex();
  let s;
  if (dex && dex.mega) s = `#${pad(p.id)}`;
  else if (dex) {
    const n = dex.nums.get(p.id);
    if (n && n.length && dex.nreq && dex.nreq.has(p.id)) s = `<span class="rn hors" title="Listé dans ce Pokédex mais non requis pour le compléter (hors compteur)">Non requis</span> <span class="nat">#${pad(p.id)}</span>`;
    else if (n && n.length) s = `<span class="rn">${dex.dx.length > 1 ? esc(dex.dx[n[0]]) + ' ' : ''}#${pad3(n[1])}</span> <span class="nat">Nat. ${pad(p.id)}</span>`;
    else s = `<span class="rn hors" title="Absent du Pokédex régional — obtenable par transfert, échange, événement ou Méga-Gemme">Hors dex</span> <span class="nat">#${pad(p.id)}</span>`;
  } else s = `#${pad(p.id)}`;
  const tag = p.c || p.fn ? ` · ${esc(p.l || '')}` : p.lg ? ' · Légendaire' : p.my ? ' · Fabuleux' : isUB(p) ? ' · Ultra-Chimère' : '';
  return s + tag;
}
// Icons: Poké Ball (red = caught in at least one game, gold = completed) and HOME house (blue = transferred from at least one game, gold = from all compatible games)
const BALL_GOLD = BALL.replace('class="ball"', 'class="ball gold"').replace('#e53935', '#f2b705').replace(/fill="#fff"/g, 'fill="#fff6c9"');
const homeIcon = (gold, label) => `<span class="mk hm${gold ? ' gold' : ''}" role="img" aria-label="${label}" title="${label}"><svg class="hmi" viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" stroke-width="2" stroke-linejoin="round"/></svg></span>`;
const HOME_T = 'Transféré vers HOME avec au moins une marque d’origine', HOME_C_T = 'Transféré avec toutes les marques d’origine Switch possibles (+ GO sauf fabuleux) : anciens jeux non comptés';
const goldBall = (lv, label) => `<span class="mk ok gold" role="img" aria-label="${label}" title="${label}">${BALL_GOLD}${lv ? `<small class="lvl">${lv}</small>` : ''}</span>`;
// v44: anciens jeux complets without jeux actuels = red ball + 🕹 badge (gold ball = current games only)
const oldBall = label => `<span class="mk ok gold" role="img" aria-label="${label}" title="${label}">${BALL}<small class="lvl">🕹</small></span>`;
const LVL_T = { sw: 'Complété jeux actuels : capturé dans tous les jeux Switch où il existe, et dans Pokémon GO s’il y est disponible', old: 'Complété dans les anciens jeux : capturé dans tous les jeux d’avant la Switch où il existe' };
// v27: legend as a list — one icon (same as on the cards / buttons) + one sentence per line.
const LG_INFO = '<span class="lgi-i" aria-hidden="true">i</span>';
const lgItem = (ic, html, cls) => `<li${cls ? ` class="${cls}"` : ''}><span class="lgi">${ic}</span><span>${html}</span></li>`;
const BASE_LEGEND = '<ul class="lgl">' + [
  lgItem(`<span class="mk ok">${BALL}</span>`, '<b>Capturé</b> dans au moins un jeu (Pokémon GO compris).'),
  lgItem(goldBall('', 'Poké Ball dorée'), '<b>Poké Ball dorée</b> : complété dans les jeux actuels — capturé dans tous les jeux Switch où il existe (un jeu et ses extensions comptent pour un) <b>et</b> dans Pokémon GO s’il y est disponible.'),
  lgItem(oldBall('Poké Ball 🕹'), '<b>Badge 🕹</b> : complété dans les anciens jeux — capturé dans tous les jeux d’avant la Switch où il existe. La Poké Ball reste rouge tant que les jeux actuels ne sont pas complets.'),
  lgItem(goldBall('🕹', 'Poké Ball dorée 🕹'), '<b>Poké Ball dorée 🕹</b> : complété dans les jeux actuels <b>et</b> les anciens jeux.'),
  lgItem('<span class="mk sh">✨</span>', '<b>Shiny</b> dans au moins un jeu.'),
  lgItem(LG_INFO, 'Pour marquer, choisissez un jeu (ou Pokémon GO) dans « Jeux ».'),
  lgItem('', 'Dans le menu Catégorie : 🔴 Poké Ball · 🟡 Poké Ball dorée (jeux actuels / Switch + GO) · 🟡🕹 anciens jeux · 🏠 HOME · 🟡🏠 HOME doré · ✨ shiny.', 'mute'),
].join('') + '</ul>';
const HOME_LEGEND = '<ul class="lgl">' + [
  lgItem(homeIcon(false, HOME_T), '<b>Transféré</b> vers HOME avec au moins une marque d’origine.'),
  lgItem(homeIcon(true, HOME_C_T), `<b>Maison dorée</b> : transféré avec <b>toutes</b> les marques Switch où il existe — ${ORIGINS.filter(o => !o.old).map(o => `${omIcon(o.id)} ${esc(o.n)}`).join(' · ')} (un jeu et ses extensions comptent pour une ; Pokémon GO compris, sauf pour les fabuleux autres que Meltan et Melmetal ; plus tard Rouge Feu / Vert Feuille Switch).`),
  lgItem(omIcon('kalos'), `<b>Anciens jeux</b> (${ORIGINS.filter(o => o.old).map(o => `${omIcon(o.id)} ${esc(o.n)}`).join(' · ')}) : boutons et marques conservés, mais ils ne comptent pas pour la dorure (fermeture de Pokémon Bank).`),
  lgItem(LG_INFO, 'Pour cocher : fiche du Pokémon → « Pokémon HOME » (une case par marque ; échanges HOME compris, sans « Capturé »), ou « Transféré » dans la fiche d’un jeu (implique « Capturé » dans ce jeu).'),
  lgItem('', 'Icônes des marques : Bulbagarden Archives (usage équitable). Menu Catégorie : 🏠 HOME · 🟡🏠 HOME doré.', 'mute'),
].join('') + '</ul>';
// ball shown on cards in the base view: red = caught somewhere, gold = Switch(+GO)-complete only, 🕹 badge = anciens jeux complets (v44: red+🕹 when only old games are complete, gold+🕹 when both)
function baseBall(p) {
  const b = baseStatus(p); if (!b.any) return '';
  if (!b.swDone && !b.oldDone) return `<span class="mk ok" aria-label="Capturé">${BALL}</span>`;
  if (!b.swDone) return oldBall(LVL_T.old); // v44: old games never gild the ball
  return goldBall(b.oldDone ? '🕹' : '', [LVL_T.sw, b.oldDone && LVL_T.old].filter(Boolean).join(' — '));
}
const SIZE_CLS = { 'Taille S': 'sz-s', 'Taille M': 'sz-m', 'Taille L': 'sz-l', 'Taille XL': 'sz-xl' };
const sizeClass = p => (p.id === 710 || p.id === 711) ? (SIZE_CLS[p.l] || 'sz-m') : '';
function cardHTML(p) {
  const key = ik(p);
  const hm = trackCtx() === 'home';
  const star = (FAVS.has(key) ? '<span class="star" aria-label="Favori">★</span>' : '') +
    (hm ? (isCaught(p) ? homeIcon(homeComplete(p, homeAvail(p)), homeComplete(p, homeAvail(p)) ? HOME_C_T : HOME_T) : '') : !trackCtx() ? baseBall(p) : isCaught(p) ? `<span class="mk ok" aria-label="Capturé">${BALL}</span>` : '') +
    (isShiny(p) ? `<span class="mk sh" aria-label="Shiny ${hm ? 'transféré' : 'capturé'}">✨</span>` : '') +
    (trackCtx() && trackCtx() !== 'home' && isTrans(p) ? homeIcon(false, HOME_T) : '');
  const tr = tradeOf(p, trackCtx()), trc = tr ? (tr.opt ? ' tradeo' : ' trade') : '';
  const trI = tr ? `<span class="trk" aria-label="${tr.opt ? 'Échange facultatif' : 'Échange requis'}" title="${esc(tr.r)}">⇄</span>` : '';
  return `<a class="card${trc}${p.c ? ' form' : ''}${sizeClass(p) ? ' ' + sizeClass(p) : ''}" href="#/p/${p.k}"><img src="${artOf(p)}" alt="" loading="lazy" decoding="async" width="256" height="256">` +
    `<div class="info"><div class="num">${numHTML(p)}</div><div class="nm">${esc(state.forms ? fullN(p) : p.n)} ${trI}${star}</div></div>` +
    `<div class="badges">${p.t.map(badge).join('')}</div><span class="cadd" role="button" tabindex="0" data-add="${p.k}" aria-label="Ajouter ${esc(fullN(p))} à ma collection">＋</span></a>`;
}
// Catégorie filters about HOME transfers: per game (this game) or global (base / HOME view). Not offered for games that cannot send Pokémon to HOME.
const TRANS_CATS = ['trans', 'notrans', 'strans', 'hcomplete'];
function transCat(p, cat) {
  if (cat === 'strans') return HOME_S.has(mp(p).k); // v24: « Shiny dans HOME » mark (HOME sheet), any context
  const c = trackCtx();
  if (c && c !== 'home') {
    if (!homeKind(c) || (c === 'go' && goMy(mp(p)))) return false;
    const t = isTrans(p, c);
    return cat === 'trans' ? t : cat === 'notrans' ? !t : cat === 'strans' ? isSTrans(p, c) : homeComplete(p, homeAvail(p));
  }
  const q = mp(p), av = homeAvail(q); if (!av.length) return false;
  if (cat === 'hcomplete' && !av.some(isGoldMark)) return false;
  return cat === 'trans' ? HOME_C.has(q.k) : cat === 'notrans' ? !HOME_C.has(q.k) : cat === 'strans' ? HOME_S.has(q.k) : homeComplete(q, av);
}
// v25 Catégorie « Barons » block. Tous les jeux = Baron in Arceus OR Z-A OR HOME; Arceus / Z-A = that game; HOME = HOME Baron marks; greyed in other games.
// « manquants » = Alpha-capable forms only (HOME: only with the Hisui or Z-A mark ticked).
const BARON_CATS = ['baron', 'nobaron']; // v47: « Barons shiny » filters removed
function baronCat(p, cat) {
  if (p.bo || p.mb) return false;
  const c = trackCtx(), sh = cat === 'barons' || cat === 'nobarons', miss = cat.startsWith('no'), H = sh ? HOME_BS : HOME_B;
  const g = q => sh ? isBaronS(p, q) : isBaron(p, q);
  if (c === 'home') return miss ? homeBaronOn(p) && !H.has(p.k) : H.has(p.k);
  if (c) { if (!ALPHA_GAMES.has(c) || !alphaOk(p, c)) return false; return miss !== g(c); }
  const av = ['la', 'za'].filter(q => alphaOk(p, q)); if (!av.length) return false;
  const has = av.some(g) || H.has(p.k);
  return miss !== has;
}
function updateCatOptions() {
  const c = trackCtx(), game = c && c !== 'home', off = game && !homeKind(c);
  const lab = game ? { trans: '🏠 Transférés HOME (marque de ce jeu)', notrans: '🏠 Pas encore transférés HOME (marque de ce jeu)', hcomplete: '🟡🏠 Complets HOME (marques Switch + GO)' } : { trans: '🏠 Transférés HOME (au moins une marque)', notrans: '🏠 Pas encore transférés HOME (aucune marque)', hcomplete: '🟡🏠 Complets HOME (marques Switch + GO)' };
  for (const o of document.querySelectorAll('#cat option')) if (lab[o.value]) { o.textContent = lab[o.value]; o.disabled = !!off; }
  { const o = $('#cat option[value=strans]'); if (o) o.disabled = false; }
  if (off && TRANS_CATS.includes(state.cat) && state.cat !== 'strans') { state.cat = ''; $('#cat').value = ''; }
  const bOff = !!(game && !ALPHA_GAMES.has(c)); // Barons only in Légendes Arceus / Z-A (+ Tous les jeux, HOME)
  for (const v of BARON_CATS) { const o = $(`#cat option[value=${v}]`); if (o) o.disabled = bOff; }
  if (bOff && BARON_CATS.includes(state.cat)) { state.cat = ''; $('#cat').value = ''; }
  // v32: Méga-évolutions / Gigamax greyed in a game (dex) that has none of these forms
  const gm = GAME_BY[state.game], gi = gm ? GIDX[gm.id] : -1, dex = gm ? listDex() : null;
  // v40: Ultra-Chimères too (none before Soleil / Lune)
  { const o = $('#cat option[value=trade]'), has = !!(c && c !== 'home' && tradeIdx(c).t.size); if (o) o.disabled = !has; if (!has && state.cat === 'trade') { state.cat = ''; $('#cat').value = ''; } }
  for (const v of [...Object.keys(FORM_CATS), 'ub']) {
    const o = $(`#cat option[value=${v}]`); if (!o) continue;
    const isV = v === 'ub' ? isUB : p => formCat(p, v);
    const has = state.game === 'go' ? E.some(p => p.go && isV(p)) : !gm || !dex ? true : E.some(p => isV(p) && (dex.mega ? dex.keys.has(p.k) : inGame(p, gi) && dex.order.has(p.id)));
    o.disabled = !has;
    if (!has && state.cat === v) { state.cat = ''; $('#cat').value = ''; }
  }
}
function render() {
  updateCatOptions(); syncMenus();
  const res = filtered();
  const box = $('#results');
  box.className = state.view === 'grid' ? 'grid' : 'grid list';
  { const vb = $('#viewbtn'), g = state.view === 'grid'; if (vb.dataset.v !== state.view) { vb.innerHTML = g ? VIEW_LIST_IC : VIEW_GRID_IC; vb.dataset.v = state.view; vb.title = g ? 'Afficher en liste' : 'Afficher en grille'; vb.setAttribute('aria-label', vb.title); } }
  box.innerHTML = res.length ? res.map(cardHTML).join('') : `<p class="empty">${GAME_BY[state.game] && !DEX[state.game] ? 'Chargement…' : 'Aucun Pokémon trouvé.'}</p>`;
  const gm = GAME_BY[state.game];
  const ctx = trackCtx(); let prog;
  if (ctx) { // progress of the selected game: marks among the entries that belong to it
    const dx = DEX[ctx], gi = GIDX[ctx], vd = listDex();
    const ld = vd && vd.virtual ? vd : dx;
    const reg = ld && !ld.virtual ? listReps(ctx, ld) : null;
    const uni = vd && vd.mega ? E.filter(p => vd.keys.has(p.k) && !isCombat(p, ctx)) :
      E.filter(p => regShow(p, reg) && !isCombat(p, ctx) && (ctx === 'home' ? true : ctx === 'go' ? p.go : (ld && ld.order.has(p.id) && !(ld.nreq && ld.nreq.has(p.id)) && (!p.c || inGame(p, gi)))));
    const cu = uni.filter(p => isCaught(p)).length, su = uni.filter(p => isShiny(p)).length;
    prog = ctx === 'home'
      ? `HOME : ${cu} / ${uni.length} 🏠 transférés · ${su} ✨ shiny · ${uni.filter(p => isCaught(p) && homeComplete(p, homeAvail(p))).length} 🟡🏠 complets${HOME_B.size ? ` · ${uni.filter(p => HOME_B.has(p.k)).length} Barons` : ''}`
      : `${trackName()} : ${cu} / ${uni.length} 🔴 capturés · ${su} ✨ shiny` + (ALPHA_GAMES.has(ctx) ? ` · ${uni.filter(p => isBaron(p, ctx)).length} Barons` : '') + (homeKind(ctx) ? ` · ${uni.filter(p => isTrans(p, ctx)).length} transférés vers HOME` : '');
  } else { // base view: derived from the per-game marks
    const uni = E.filter(p => (state.forms || !p.c) && !p.bo); let cu = 0, su = 0, sw = 0, old = 0, tr = 0, hc = 0;
    for (const p of uni) { const b = baseStatus(p); cu += b.any; su += b.shAny; sw += b.swDone; old += b.oldDone; tr += HOME_C.has(p.k); hc += homeComplete(p, homeAvail(p)); }
    prog = `${cu} / ${uni.length} 🔴 capturés · ${su} ✨ shiny · ${sw} 🟡 complétés jeux actuels · ${old} 🟡🕹 anciens jeux · ${tr} 🏠 transférés HOME · ${hc} 🟡🏠 complets HOME`;
  }
  // Forms view: tracked forms vs battle-only variants (shown but never counted) so the numbers add up
  const combat = state.forms ? res.filter(p => isCombat(p, ctx)).length : 0;
  const vdx = state.vdex && VDEX[state.vdex];
  const goX = ctx === 'go' && state.forms ? res.filter(p => !isCombat(p, ctx) && (goTemp(p) || p.c === 'gmax')).length : 0; // v28: GO Megas / Primals / Gigamax: form totals only, never gold completion
  const head = vdx && vdx.mega ? `${res.filter(p => !p.mb).length} Pokémon + ${res.filter(p => p.mb).length} Méga` : state.forms ? `${res.length - combat} formes${goX ? ` dont ${goX} Méga / Primo / Gigamax (hors dorure)` : ''}${combat ? ` (+ ${combat} formes de combat, non comptées)` : ''}` : `${res.length} Pokémon`;
  $('#count').textContent = `${head}${vdx ? ' · ' + vdx.s : gm ? ' · ' + gm.s : state.game === 'go' ? ' · GO' : ''} · ${prog}`;
  // v45: the legend lives in the ☰ menu (HOME legend in the HOME view, the base legend elsewhere)
  const lg = $('#legend'), lgW = ctx === 'home' ? 'home' : 'base'; if (lg.dataset.w !== lgW) { lg.dataset.w = lgW; lg.innerHTML = lgW === 'home' ? HOME_LEGEND : BASE_LEGEND; }
  document.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', state.types.includes(c.dataset.t)));
  const active = state.q || state.types.length || state.gen || state.cat || state.sort !== 'id' || state.game;
  $('#reset').hidden = !active;
  requestAnimationFrame(updJump);
}

/* ---------------- shared data (loaded with the first detail page) ---------------- */
const SP = {};
let SHARED = null, GODATA = null, EVO_ADJ = null;
async function loadShared() {
  if (!SHARED) SHARED = Promise.all(['evo', 'moves', 'ref', 'tm', 'loc'].map(n => getJSON(`data/${n}.json`))).then(([evo, moves, ref, tm, loc]) => ({ evo, moves, ref, tm, loc })).catch(e => { SHARED = null; throw e; });
  return SHARED;
}
let SHINYD = null, DESC = null; // v31: data/shiny.json (shiny block, loaded with the sheet) · data/desc.json (popup texts, loaded on the first tap)
async function loadShiny() { if (!SHINYD) SHINYD = getJSON('data/shiny.json').catch(() => { SHINYD = null; return null; }); return SHINYD; }
async function loadDesc() { if (!DESC) DESC = getJSON('data/desc.json').catch(() => { DESC = null; return null; }); return DESC; }
let CRIES = null; // v29: data/cries.json { k: [latest, legacy] } ("l/6" → cries/latest/6.mp3, "o/6" → cries/legacy/6.mp3)
async function loadCries() { if (!CRIES) CRIES = getJSON('data/cries.json').catch(() => { CRIES = null; return {}; }); return CRIES; }
let CRY_CTX = null, CRY_SRC = null;
const cryUrl = f => `cries/${f[0] === 'o' ? 'legacy' : 'latest'}/${f.slice(2)}.mp3`;
// Web Audio: the context is created / resumed inside the tap (iPhone Safari unlock), the MP3 is fetched whole (service worker cache, offline after one play)
function playCry(f, btn) {
  const AC = window.AudioContext || window.webkitAudioContext;
  try { CRY_CTX ||= new AC(); if (CRY_CTX.state === 'suspended') CRY_CTX.resume(); } catch { CRY_CTX = null; }
  if (CRY_SRC) { try { CRY_SRC.stop(); } catch {} CRY_SRC = null; }
  document.querySelectorAll('.cry.on').forEach(b => b.classList.remove('on'));
  btn.classList.add('on'); const off = () => btn.classList.remove('on');
  const fail = () => { off(); toast(navigator.onLine === false ? 'Cri indisponible hors-ligne : écoutez-le une fois avec une connexion pour le garder.' : 'Impossible de lire ce cri.', 'err', 5000); };
  fetch(cryUrl(f)).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); }).then(buf => {
    if (!CRY_CTX) { const au = new Audio(URL.createObjectURL(new Blob([buf], { type: 'audio/mpeg' }))); au.onended = off; return au.play(); }
    return new Promise((ok, ko) => CRY_CTX.decodeAudioData(buf, ok, ko)).then(ab => {
      if (!btn.classList.contains('on')) return;
      const s = CRY_CTX.createBufferSource(); s.buffer = ab; s.connect(CRY_CTX.destination); s.onended = () => { if (CRY_SRC === s) CRY_SRC = null; off(); }; CRY_SRC = s; s.start();
    });
  }).catch(fail);
}
function cryBtns(p) {
  const c = CRIES && !(CRIES instanceof Promise) ? CRIES[p.k] : null; if (!c) return '';
  const [l, o] = c, same = l && o && l === o;
  return `<div class="cries">${l ? `<button class="cry" type="button" data-cry="${l}" aria-label="Écouter le cri" title="Écouter le cri (version actuelle)"><span aria-hidden="true">🔊</span> Cri</button>` : ''}${o && !same ? `<button class="cry" type="button" data-cry="${o}" aria-label="Écouter le cri d’origine" title="Cri d’origine (jeux Gén. I–V, avant la refonte des cris)"><span aria-hidden="true">🔊</span> Ancien</button>` : ''}</div>`;
}
async function loadGo() { if (!GODATA) GODATA = Promise.all([getJSON('data/go.json'), getJSON('data/pvp.json').catch(() => null), getJSON('data/pvp-moves.json').catch(() => null), getJSON('data/raid-moves.json').catch(() => null)]).then(([g, pv, pm, rm]) => { g.pvp = pv; g.pvm = pm; g.rdm = rm; return g; }).catch(e => { GODATA = null; throw e; }); return GODATA; } // v32: + PvP rankings (data/pvp.json, optional)
async function loadSp(id) { if (!SP[id]) SP[id] = getJSON(`data/sp/${id}.json`).catch(e => { delete SP[id]; throw e; }); return SP[id]; }

/* ---------------- detail ---------------- */
let detailTok = 0, DET = null, showShinyArt = false, showFemArt = false; // v44c: showFemArt = female image of a single-entry species (hero « ♀ » button)
function route() {
  const m = location.hash.match(/^#\/p\/(\d+(?:-[a-z0-9-]+)?)/);
  const lv = $('#list-view'), dv = $('#detail-view'), rv = $('#rank-view');
  if (/^#\/classements/.test(location.hash)) { if (!lv.hidden) listScroll = window.scrollY; detailTok++; lv.hidden = true; dv.hidden = true; rv.hidden = false; document.title = 'Classements – Pokédex'; const back = fromRank, y = rankScroll; fromRank = false; window.scrollTo(0, 0); renderRank().then(() => { if (back) window.scrollTo(0, y); }); return; }
  if (rv) rv.hidden = true;
  const rp = m && (BY_KEY[m[1]] || FEM_OF[m[1]]); // v44c: an old female link (#/p/3-female) opens the species sheet, female image
  if (rp) {
    if (!lv.hidden) listScroll = window.scrollY;
    lv.hidden = true; dv.hidden = false;
    showShinyArt = false; showFemArt = !BY_KEY[m[1]];
    openDetail(rp);
    window.scrollTo(0, 0);
  } else {
    detailTok++; sheetPref = null; fromRank = false;
    dv.hidden = true; lv.hidden = false;
    document.title = 'Pokédex';
    window.scrollTo(0, listScroll);
  }
}
async function openDetail(p) {
  const tok = ++detailTok;
  state.dgame = sheetPref || (state.game === 'go' || state.game === 'home' || GAME_BY[state.game] ? state.game : 'all'); // sheet game: its own choice, else the list filter
  document.title = `${fullN(p)} #${pad(p.id)} – Pokédex`;
  $('#detail-view').innerHTML = navHTML(p) + `<div class="detail"><div class="hero${sizeClass(p) ? ' ' + sizeClass(p) : ''}" style="--c1:${TYPE_COLORS[p.t[0]]};--c2:${TYPE_COLORS[p.t[1] || p.t[0]]}"><div class="num">#${pad(p.id)}${p.c === 'sex' || p.l === 'Mâle' ? ' · ' + esc(p.l) : ''}</div><img src="img/${p.k}.webp" alt="${esc(fullN(p))}" width="256" height="256"><h1>${esc(p.n)}</h1>${namesHTML(p)}</div><p class="note" id="dload">Chargement de la fiche…</p></div>`;
  try {
    const [sp, shared, shiny] = await Promise.all([loadSp(p.id), loadShared(), loadShiny()]); CRIES = await loadCries();
    if (tok !== detailTok) return;
    DET = { p, sp, f: sp.f[p.k], shared, shiny }; spriteMode = 'home'; closePop(); // v35: every sheet opens on its own HOME image
    pickGame(state.dgame);
    if (state.dgame === 'go') { try { DET.go = await loadGo(); } catch { state.dgame = 'all'; } if (tok !== detailTok) return; }
    renderDetail();
  } catch (e) {
    if (tok !== detailTok) return;
    const el = $('#dload'); if (el) el.innerHTML = 'Fiche détaillée indisponible hors-ligne. Ouvrez-la une fois avec une connexion Internet, ou utilisez « Télécharger les formes et fiches » en bas de la liste.';
  }
}
function availGames(f) { return (f.av || []).slice().sort((a, b) => GIDX[a] - GIDX[b]); }
// Games where this species is « Hors dex » (obtainable by transfer / trade / event, absent from the regional dex) — default form only; marks only, completion unchanged
const horsGames = (p, sp) => (sp && sp.hx && p.k === String(p.id) ? sp.hx.filter(g => GAME_BY[g]).sort((a, b) => GIDX[a] - GIDX[b]) : []);
function pickGame(g) {
  const f = DET.f;
  const ok = g === 'all' || g === 'home' || (g === 'go' && goRel(f.go)) || (GAME_BY[g] && ((f.av || []).includes(g) || horsGames(DET.p, DET.sp).includes(g)));
  const sib = !ok && GAME_BY[g] ? availGames(f).find(x => saveOf(x) === saveOf(g)) : null; // same save (Z-A ↔ Méga-Dimension, extensions)
  state.dgame = ok ? g : sib || 'all';
}
function gameNames(ids) { return ids.map(g => g === 'go' ? 'Pokémon GO' : GAME_BY[g].s).join(', '); }
const omName = m => ORI[m] ? ORI[m].fr : m;
function homeRowsHTML(av, f, sh, k) {
  if (!av.length) return '<br>Aucune marque d’origine possible : ce Pokémon (ou cette forme) n’existe dans aucun jeu compatible avec HOME.';
  const row = m => `<li class="${f.includes(m) ? 'on' : ''}">${omIcon(m)} ${esc(omName(m))} — ${f.includes(m) ? `transféré${k && HOME_OG.has(m + ':' + k) ? ' <span class="mute">(depuis la fiche du jeu)</span>' : ''}` : 'pas transféré'}${sh.includes(m) ? ' · ✨ shiny' : ''}</li>`;
  const gold = av.filter(isGoldMark), old = av.filter(m => !isGoldMark(m)), done = gold.filter(m => f.includes(m)).length;
  return `<br><b class="hgrp">Compte pour la dorure</b> : ${gold.length ? `<b>${done} / ${gold.length}</b> marques${done === gold.length ? ` ${homeIcon(true, HOME_C_T)} complet` : ''}` : 'aucune (pas de dorure possible pour cette forme)'}` +
    (gold.length ? `<ul class="plain homerows">${gold.map(row).join('')}</ul>` : '') +
    (k && HOME_SH.has(k) ? '<div class="hshl"><span class="mk sh">✨</span> <b>Shiny dans HOME</b></div>' : '') +
    (k && HOME_B.has(k) ? `<div class="hshl">${BARON_IC} <b>Baron dans HOME</b></div>` : '') +
    (old.length ? `<b class="hgrp">Anciens jeux</b> <span class="mute">(marques conservées, ne comptent pas pour la dorure : fermeture de Pokémon Bank)</span><ul class="plain homerows old">${old.map(row).join('')}</ul>` : '');
}
function baseHTML(p0) {
  const p = mp(p0), f = DET && DET.p === p ? DET.f : null;
  const av = f && f.av ? f.av.slice().sort((a, b) => GIDX[a] - GIDX[b]) : gamesOf(p);
  const b = baseStatus(p, av), go = p.go;
  const shr = g => { const o = sharedWith(g, p); return o.length ? ` <span class="mute">· partagé avec ${esc(o.map(x => GAME_BY[x].s).join(', '))}</span>` : ''; };
  const row = g => `<li>${b.c.includes(g) ? BALL : BALL_OFF} ${esc(gameNames([g]))} — ${b.c.includes(g) ? 'capturé' : 'pas capturé'}${b.s.includes(g) ? ' · ✨ shiny' : ''}${shr(g)}</li>`;
  const sw = b.sw, old = b.old; // b.sw already includes Pokémon GO when the species is in GO
  const frac = (need, have) => { const gs = grpsOf(need); return `${gs.filter(G => grpHas(G, have)).length} / ${gs.length}`; };
  let h = `Suivi : <b>vue d’ensemble</b> (lecture seule : calculé d’après les marques de chaque jeu). Pour marquer, choisissez un jeu dans le sélecteur « Jeu » ci-dessous (ou dans la liste « Jeux »).<br>` +
    (b.any ? `${BALL} Capturé` : 'Pas encore capturé') + (b.shAny ? ' · ✨ shiny' : '') +
    (b.swDone ? ` · ${goldBall('', LVL_T.sw)} Jeux actuels complets` : '') + (b.oldDone ? ` · ${oldBall(LVL_T.old)} Anciens jeux complets` : '');
  if (b.legacyC || b.legacyS) h += `<br><span class="mute">Marque manuelle de l’ancienne version${b.legacyC ? ' (capturé)' : ''}${b.legacyS ? ' (shiny)' : ''}${b.c.length || b.s.length ? ' — remplacée par les marques par jeu' : ' — conservée tant qu’aucun jeu n’est marqué'} </span><button type="button" class="lg" title="Supprimer l’ancienne marque manuelle">Retirer</button>`;
  if (sw.length) h += `<details open><summary>Jeux actuels (Switch${go ? ' + GO' : ''}) — ${frac(sw, b.c)} <small class="mute">(un jeu et ses extensions comptent pour un ; GO compte dans ce palier)</small></summary><ul class="plain homerows">${sw.map(row).join('')}</ul></details>`;
  if (old.length) h += `<details><summary>Anciens jeux — ${frac(old, b.c)}</summary><ul class="plain homerows">${old.map(row).join('')}</ul></details>`;
  return h;
}
function trackHTML(p0) {
  const c = sheetCtx(), p = mp(p0, c), bo = p !== p0 ? p : null;
  const note = bo ? `<span class="bo">${p0.mb ? 'Méga-Évolution hors Légendes Z-A : variante de combat – suit la forme de base' : 'Variante de combat – suit la forme de base'}</span> (<a href="#/p/${bo.k}">${esc(bo.n)}</a>) : les marques se modifient sur la forme de base.<br>` : '';
  if (!c) return note + baseHTML(p0);
  if (c === 'home') {
    const f = HOME_C.get(p.k) || [], sh = HOME_S.get(p.k) || [], av = homeAvail(p);
    return note + `Suivi : <b>Pokémon HOME</b> — une marque d’origine par jeu (et ses extensions). Cochez la marque du Pokémon reçu, y compris par échange dans HOME : cela compte comme un transfert depuis ce jeu, sans le marquer « Capturé » dans le jeu. Même état que le bouton « Transféré » de la fiche du jeu.<br>` +
      `${homeIcon(false, HOME_T)} au moins une marque · ${homeIcon(true, HOME_C_T)} toutes les marques Switch possibles + GO (sauf fabuleux)` +
      homeRowsHTML(av, f, sh, p.k) + '<span class="mute credit">Icônes des marques d’origine : Bulbagarden Archives (usage équitable).</span>';
  }
  const hk = homeKind(c), sw = sharedWith(c, p);
  let h = note + `Captures et shiny suivis pour : <b>${esc(trackName(c))}</b>`;
  if (sw.length) h += ` <span class="mute shr">· partagé avec ${esc(sw.map(x => GAME_BY[x].s).join(', '))}</span>`;
  if (p0.mb && isZa(c)) {
    const bs = megaBases(p0), bc = bs.some(b => isCaught(b, c)); // v44d: Méga-Mistigrix = Mistigrix mâle ou femelle
    h += `<br><span class="mute">Z-A Méga : ${esc((megaStoneOf(p0)||{}).label || 'Méga-Gemme')} ${hasGem(p0, c) ? 'obtenue' : 'non obtenue'} · base ${bs.map(b => `<a href="#/p/${b.k}">${esc(fullN(b))}</a>`).join(' ou ')} ${bc ? 'capturée' : 'pas encore capturée'} → Méga ${isCaught(p0, c) ? 'capturée' : 'non capturée'}.</span>`;
  } else if (c !== 'go') {
    const gs = gemsFor(p0, c);
    if (gs.length) h += `<br><span class="mute gemline">Méga-Gemme${gs.length > 1 ? 's' : ''} : ${gs.map(m => `${esc(megaStoneOf(m).label)} ${hasGem(m, c) ? 'obtenue' : 'non obtenue'}`).join(' · ')}${isZa(c) ? ' (avec la forme de base capturée = Méga capturée en Z-A)' : ' (simple marque de possession dans ce jeu : les Méga y restent des formes de combat, sans effet sur la complétion)'}.</span>`;
  } else if (goTemp(p0) || p0.c === 'gmax') { // v28: GO Mega / Primal / Gigamax forms
    const b = goTemp(p0) ? goTempBase(p0) : BY_KEY[String(p0.id)], bl = b ? `<a href="#/p/${b.k}">${esc(b.n)}</a>` : 'la forme de base', gd = DET && DET.p === p0 && DET.f ? DET.f.go : null;
    if (goTemp(p0)) {
      const ms = energyMates(p0), en = ms.length ? `${p0.c === 'primal' ? 'Énergie Primo' : 'Méga-énergie' + (megaXYZ(p0) ? ' ' + megaXYZ(p0).toUpperCase() : '')} ${hasEnergy(p0) ? 'obtenue' : 'pas encore obtenue'}` : '';
      h += `<br><span class="gotemp">${p0.c === 'primal' ? 'Primo-Résurgence' : 'Méga-Évolution'} dans Pokémon GO : <b>Capturé</b> = enregistré au Pokédex GO (onglet Méga), c’est-à-dire ${p0.c === 'primal' ? 'Primo-Résurgence' : 'Méga-Évolution'} faite au moins une fois (une Méga capturée après un raid compte seulement comme « vue »). Cocher Capturé coche aussi ${bl} et l’énergie ; <b>Shiny</b> (${p0.c === 'primal' ? 'Primo' : 'Méga'} d’un Pokémon shiny) coche aussi ${bl} shiny.</span>` +
        `<br><span class="mute gemline">${en ? en + ' · ' : ''}Compte dans les totaux de formes GO, pas dans la dorure (jeux actuels, HOME). Pas de transfert : c’est une transformation temporaire, transférez la forme de base.</span>`;
    } else {
      h += `<br><span class="gotemp">Gigamax dans Pokémon GO : capturé en Combat Max (Dynamax) ; marques séparées de ${bl}. Shiny : ${!gd || !goShinyOk(gd) ? (gd && gd.shf ? `à partir du ${gd.shf.split('-').reverse().join('/')}` : 'pas encore disponible pour ce Gigamax') : 'disponible'}.</span>` +
        `<br><span class="mute gemline">Compte dans les totaux de formes GO, pas dans la dorure (jeux actuels, HOME). Un Gigamax de Pokémon GO ne peut pas être envoyé vers HOME.</span>`;
    }
    { const s = baseStatus(p0); h += `<br><span class="mute">Tous jeux confondus : ${s.any ? 'capturé' : 'pas encore capturé'}${s.shAny ? ' · shiny' : ''}.</span>`; }
    return h + '<br>Transfert vers HOME : impossible depuis Pokémon GO pour cette forme.';
  } else if (goMegas(p0).length) {
    const ms = energyMates(p0);
    h += `<br><span class="mute gemline">${ms.map(m => `${m.c === 'primal' ? 'Énergie Primo' : megaXYZ(m) ? `Méga-énergie ${megaXYZ(m).toUpperCase()}` : 'Méga-énergie'} de ${esc((BY_KEY[String(p0.id)] || p0).n)} : ${hasEnergy(m) ? 'obtenue' : 'pas encore obtenue'}`).join(' · ')} (${ms.length > 1 ? 'une marque par forme' : 'marque par espèce'}, sans effet sur la complétion ; cochée automatiquement quand vous marquez la ${ms.some(m => m.c === 'primal') ? 'Primo' : 'Méga'} capturée).</span>`;
  }
  if (alphaOk(p, c)) h += `<br><span class="mute baronl">${BARON_IC} Baron : ${isBaron(p, c) ? 'oui' : 'non'} <small>(sans effet sur la complétion)</small></span>`;
  else if (ALPHA_GAMES.has(c) && !p0.mb && !bo) h += `<br><span class="mute baronl">Ne peut pas être Baron dans ce jeu${(BY_KEY[String(p.id)] || p).lg || (BY_KEY[String(p.id)] || p).my ? ' (légendaire / fabuleux)' : ''}.</span>`;
  { const b = baseStatus(p), avG = grpsOf([...gamesOf(p), ...(p.go ? ['go'] : [])]), n = avG.length, cN = grpsOf(b.c).filter(G => avG.includes(G)).length; h += `<br><span class="mute">Tous jeux confondus : capturé dans ${cN} jeu${cN > 1 ? 'x' : ''} sur ${n} (un jeu et ses extensions comptent pour un) · shiny dans ${grpsOf(b.s).length}.</span>`; }
  if (!hk) return h + (GBA_IDS.has(c) ? '<br><span class="gbanote">Jeu GBA : pas de transfert direct vers HOME (Pal Park → IVᵉ génération → Poké Transfert → Pokémon Bank). Un Pokémon venu par ce chemin se coche « Sans marque » sur la fiche Pokémon HOME (ancien jeu : ne compte pas pour la dorure).</span>' : '<br>Ce jeu ne peut pas envoyer directement de Pokémon vers HOME.');
  if (c === 'go' && goMy(p)) return h + '<br>Les Pokémon fabuleux (sauf Meltan et Melmetal) ne peuvent pas être transférés depuis Pokémon GO : GO n’est pas requis pour la complétion HOME de ce Pokémon.';
  const om = originOf(c);
  h += ` <span class="mute">(${HOME_KIND_FR[hk]})</span>`
  if (c === 'frlgsw') h += '<br><span class="mute">Version Switch (HOME 4.1.0, depuis le 7/10/2026) : transfert à sens unique vers HOME, rien ne peut y revenir. La version GBA reste un jeu séparé (anciens jeux).</span>';
  if (!bo) h += `<br>${omIcon(om)} ${isTrans(p, c) ? 'Transféré vers HOME' : 'Pas encore transféré vers HOME'} — ${esc(omName(om))}${isTrans(p, c) && !HOME_OG.has(om + ':' + p.k) ? ' <span class="mute">(coché depuis la fiche Pokémon HOME : n’implique pas « Capturé » ici)</span>' : ''}.`;
  return h;
}
function refreshTrack(p) {
  const el = $('#trackinfo'); if (el) el.innerHTML = trackHTML(p);
  const bar = $('#actbar'); if (!bar) return;
  const a = document.activeElement, sel = a && bar.contains(a) ? (a.dataset.mega ? `[data-mega="${a.dataset.mega}"]` : a.dataset.origin ? `[data-origin="${a.dataset.origin}"]` : a.dataset.energy ? `[data-energy="${a.dataset.energy}"]` : a.dataset.sal ? `[data-sal="${a.dataset.sal}"]` : '.' + [...a.classList].filter(x => x !== 'act')[0]) : null;
  bar.outerHTML = actbarHTML(p);
  const fb = $('#formesbox'); if (fb && DET && DET.p === p) { const h = formSwitcher(p, GAME_BY[state.dgame]); if (h) fb.outerHTML = h; } // v41: shortcut counter
  if (sel) { const b = $('#actbar ' + sel); if (b) b.focus(); }
  setBarH();
}
// Fixed action row, same order on every sheet: Capturé · Shiny · Transféré (HOME) · Méga-Gemme(s) / Méga-énergie (GO).
// Buttons that do not apply stay in place, greyed (disabled). The gem/energy slot exists only for forms that have a Mega.
// Mobile: the fixed bottom bar can wrap (HOME origin marks) → its height feeds the bottom padding of the sheet.
// v27: in-app message instead of alert() — polite live region, auto-hides, sits above the sheet's fixed bar on mobile.
let TOAST_T = 0;
function toast(msg, kind = 'ok', ms = 4500) {
  let t = $('#toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite'); document.body.appendChild(t); }
  t.className = 'toast ' + kind; t.innerHTML = `<span class="ti" aria-hidden="true">${kind === 'err' ? '!' : '✓'}</span><span class="tm">${esc(msg)}</span><button type="button" aria-label="Fermer le message">×</button>`;
  t.querySelector('button').onclick = () => { t.classList.remove('on'); };
  const b = $('#actbar'), fixed = b && b.getClientRects().length && getComputedStyle(b).position === 'fixed'; // offsetParent is null for fixed elements
  t.style.bottom = fixed ? `calc(${b.offsetHeight + 12}px + env(safe-area-inset-bottom))` : '';
  requestAnimationFrame(() => t.classList.add('on'));
  clearTimeout(TOAST_T); TOAST_T = setTimeout(() => t.classList.remove('on'), ms);
}
addEventListener('hashchange', () => { const t = $('#toast'); if (t) { clearTimeout(TOAST_T); t.classList.remove('on'); } }); // a message never lingers over another screen's buttons
function setBarH() { requestAnimationFrame(() => { const b = $('#actbar'), v = $('#detail-view'); if (b && v) v.style.setProperty('--barh', b.offsetHeight + 'px'); updPos(); }); }
// v25 Baron buttons (official Alpha icon, self-hosted: img/alpha/CREDITS.txt). Baron shiny = icon + ✨ badge; checked = same yellow as Shiny.
const BARON_IC = '<span class="bi" aria-hidden="true"><img src="img/alpha/baron.png" alt="" width="22" height="22"></span>';
const BARONS_IC = '<span class="bi" aria-hidden="true"><img src="img/alpha/baron.png" alt="" width="22" height="22"><span class="bsp"></span></span>'; // ✨ badge drawn in CSS (keeps menu / button text clean)
function baronBtns(on, son, dis, nm, offT) {
  const t1 = dis ? offT : `Baron (Pokémon Alpha)${nm ? ' – ' + nm : ''} : implique « Capturé »`; // v47: « Baron shiny » button removed (son unused)
  return `<button class="act baron" type="button"${dis ? ' disabled' : ''} aria-pressed="${!dis && on}" aria-label="Baron${nm ? ' – ' + esc(nm) : ''}" title="${esc(t1)}">${BARON_IC}<span class="t">Baron</span></button>`;
}
function homeBarHTML(p) {
  const q = mp(p, 'home'), av = homeAvail(q), f = HOME_C.get(q.k) || [], dis = !!p.bo, gav = av.filter(isGoldMark), done = gav.filter(m => f.includes(m)).length;
  const extra = f.filter(m => ORI[m] && !av.includes(m)); // ticked from a « hors dex » game sheet: shown so it can be unticked (no effect on completion)
  const btns = [...av, ...extra].sort((a, b) => ORI[a].i - ORI[b].i).map(m => `<button class="act ori${isGoldMark(m) ? '' : ' old'}" type="button" data-origin="${m}"${dis ? ' disabled' : ''} aria-pressed="${f.includes(m)}" aria-label="Transféré – ${esc(omName(m))}" title="${esc(omName(m))}${isGoldMark(m) ? ' (compte pour la dorure)' : ' (ancien jeu : ne compte pas pour la dorure)'} : ${dis ? 'variante de combat, suit la forme de base' : 'transféré vers HOME avec cette marque d’origine (ou reçu par échange dans HOME) — sans marquer « Capturé » dans le jeu'}">${omIcon(m)}<span class="t">${esc(ORI[m].s || ORI[m].n)}</span></button>`).join('');
  const ctx = `<b>Pokémon HOME</b> · ${!av.length ? 'aucune marque possible' : gav.length ? `dorure ${done} / ${gav.length}${done === gav.length ? ' ' + homeIcon(true, HOME_C_T) : ''}${av.length > gav.length ? ` · <span class="oldl">anciens jeux en pointillés</span>` : ''}` : 'anciens jeux seulement (pas de dorure)'}`;
  const shOn = !dis && f.length > 0, shP = HOME_SH.has(q.k);
  const shb = av.length || extra.length ? `<button class="act hsh" type="button"${shOn ? '' : ' disabled'} aria-pressed="${shOn && shP}" aria-label="Shiny dans HOME" title="${shOn ? 'Shiny dans HOME (ce Pokémon / cette forme)' : 'Cochez d’abord au moins une marque d’origine (transfert ou échange)'}"><span class="ic" aria-hidden="true">✨</span><span class="t">Shiny</span></button>` : '';
  const bOn = !dis && homeBaronOn(q), hb = !dis && alphaHomeGames(q).length ? baronBtns(HOME_B.has(q.k), HOME_BS.has(q.k), !bOn, 'HOME', `Cochez d’abord la marque ${alphaHomeGames(q).map(c => omName(ALPHA_MARK[c])).join(' ou ')} (seuls les Pokémon venus de Légendes Arceus / Z-A peuvent être Barons)`) : '';
  const gbs = dis ? '' : gmaxBtnsOf(q).map(g => { // v47: « Gigamax » at the end, linked with the HOME mark of the Gigamax sheet (as on the game / GO sheets)
    const sv = isSal(g) ? (q.k === SAL_BASE.G ? 'G' : 'A') : '', lb = sv ? `Gigamax ${sv === 'G' ? 'Grave' : 'Aigüe'}` : 'Gigamax', gm = gmaxHomeMark(g), pr = sv ? salHomeOn(sv) : HOME_R.has(g.k), on = !!gm || pr;
    const ti = on ? `${lb} dans Pokémon HOME (même marque que la fiche ${g.n}${q.id === 869 ? ', une seule fiche pour toutes les formes' : ''}${sv ? ` ; marque HOME « ${lb} », distincte de l’autre forme` : ''})${gm ? ` — cocher ajoute la marque ${omName(gm)} au Gigamax et à cette forme` : ''}` : 'Aucun jeu compatible avec HOME ne contient ce Gigamax';
    return `<button class="act hgmx gem gmx" type="button" data-hgmax="${g.k}"${sv ? ` data-hsal="${sv}"` : ''}${on ? '' : ' disabled'} aria-pressed="${pr}" aria-label="${lb} – Pokémon HOME" title="${esc(ti)}">${GMAX_IC}<span class="t">${lb}</span></button>`; }).join('');
  const sal = isSal(q) && !dis ? ['A', 'G'].map(v => { // v47: Salarsen Gigamax HOME sheet = two HOME marks (« Gigamax Aigüe » / « Gigamax Grave ») + one HOME shiny each
    const n = v === 'G' ? 'Grave' : 'Aigüe', gm = gmaxHomeMark(q), pr = salHomeOn(v), on = !!gm || pr, sp = pr && HOME_SH.has(salKey(v));
    return `<button class="act hsalg gem gmx" type="button" data-hsal="${v}"${on ? '' : ' disabled'} aria-pressed="${pr}" aria-label="Gigamax ${n} – Pokémon HOME" title="${esc(`Salarsen Gigamax Forme ${n} dans Pokémon HOME (lié au bouton « Gigamax ${n} » de la fiche HOME de Salarsen Forme ${n})${gm ? ` — cocher ajoute la marque ${omName(gm)} et coche aussi Salarsen Forme ${n}` : ''}`)}">${GMAX_IC}<span class="t">Gigamax ${n}</span></button>` +
      `<button class="act hsh hsalsh" type="button" data-hsal="${v}"${pr ? '' : ' disabled'} aria-pressed="${sp}" aria-label="Shiny Gigamax ${n} – Pokémon HOME" title="${pr ? `Shiny dans HOME (Gigamax ${n})` : `Cochez d’abord « Gigamax ${n} »`}"><span class="ic" aria-hidden="true">✨</span><span class="t">Shiny ${n}</span></button>`; }).join('') : '';
  return `<div class="actbar homebar" id="actbar" role="toolbar" aria-label="Transferts Pokémon HOME par marque d’origine"><div class="actctx">${ctx}</div><div class="acts oris">${sal ? sal : btns ? btns + shb + hb + gbs : '<span class="mute">Aucun jeu compatible avec HOME ne contient cette forme.</span>'}</div></div>`;
}
function actbarHTML(p) {
  const c = sheetCtx(), q = mp(p, c), nm = c ? trackName(c) : '';
  if (c === 'home') return homeBarHTML(p);
  const catchDis = !c || c === 'home' || boC(p, c) || (!!p.mb && c !== 'go'); // Megas: Capturé/Shiny derived (Z-A: base + gemme; elsewhere battle-only); GO (v28): markable
  const gT = c === 'go' && goTemp(p), gG = c === 'go' && p.c === 'gmax', gd = (gT || gG) && DET && DET.p === p && DET.f ? DET.f.go : null;
  const shDis = catchDis || (gG && !goShinyOk(gd)), shNo = gG && !goShinyOk(gd) ? (gd && gd.shf ? `Gigamax shiny pas encore sorti dans GO (à partir du ${gd.shf.split('-').reverse().join('/')})` : 'Pas de Gigamax shiny dans Pokémon GO pour l’instant') : '';
  const tb = gT ? goTempBase(p) : null, eL = gT ? (p.c === 'primal' ? 'Énergie Primo' : 'Méga-énergie' + (megaXYZ(p) ? ' ' + megaXYZ(p).toUpperCase() : '')) : '';
  const hk = c && c !== 'home' ? homeKind(c) : null;
  const trOn = !!(hk && !p.bo && !megaBo(p, c) && !(c === 'go' && (goMy(p) || gT || gG))); // same guard as toggleTransfer
  const sw = c && GAME_BY[c] ? sharedWith(c, q) : [];
  const trT = !c ? 'Choisissez un jeu pour marquer un transfert' : !hk ? (GBA_IDS.has(c) ? 'Jeu GBA : pas de transfert direct vers HOME (Pal Park → IVᵉ gén. → Bank : « Sans marque » sur la fiche Pokémon HOME)' : 'Ce jeu ne peut pas envoyer de Pokémon vers HOME') : (c === 'go' && goMy(p)) ? 'Fabuleux : pas de transfert depuis GO' : gG ? 'Gigamax de Pokémon GO : ne peut pas être envoyé vers HOME' : gT ? `${p.c === 'primal' ? 'Primo-Résurgence' : 'Méga-Évolution'} temporaire : transférez la forme de base` : !trOn ? 'Variante de combat : suit la forme de base' :
    `Transféré vers HOME depuis ${nm}${sw.length ? ' (et ' + sw.map(x => GAME_BY[x].s).join(', ') + ')' : ''}${p.mb ? ' (Méga : manuel, ou auto si gemme + transfert de la base)' : ''}`;
  let slot = '';
  if (c === 'go') slot = gT ? '' : energyMates(p).map(m => energyBtnHTML(m)).join(''); // one Méga-énergie per Mega when the species has X / Y
  else {
    const gs = gemSlot(p, c);
    slot = gs.map(x => { const xyz = (x.m.k.match(/mega-(x|y|z)$/) || [])[1]; return gemBtnHTML(x.m, c, x.on, gs.length > 1 ? (xyz ? 'Gemme ' + xyz.toUpperCase() : megaStoneOf(x.m).label) : isZa(c) ? 'Gemme' : 'Méga-Gemme'); }).join(''); // Z-A: short labels (room for the Baron buttons)
  }
  const gx = isGmx(p), mg = !!p.mb && c !== 'go'; // v37b: Gigamax sheet → « Gigamax » first; Mega sheet → Méga-Gemme first (no Capturé)
  const sv = isSal(gmaxBtnsOf(p)[0]) ? (p.k === SAL_BASE.G ? 'G' : 'A') : '';
  const gbs = gmaxBtnsOf(p).map(g => { const on = gmaxInGame(g, c), pr = on && (sv ? salOn(sv, c) : isCaught(g, c)); return `<button class="act gem gmx" type="button" data-gmax="${g.k}"${sv ? ` data-sal="${sv}"` : ''}${on ? '' : ' disabled'} aria-pressed="${pr}" aria-label="Gigamax${nm ? ' – ' + esc(nm) : ''}" title="${on ? esc(`Gigamax obtenu dans ${nm} (coche ${sv ? `« Gigamax ${sv === 'G' ? 'Grave' : 'Aigüe'} » sur la fiche ${g.n}` : g.n}${p.id === 869 ? ', une seule fiche pour toutes les formes' : ''}) — coche aussi cette forme`) : 'À marquer dans un jeu où ce Gigamax existe (Épée / Bouclier, Pokémon GO)'}">${GMAX_IC}<span class="t">Gigamax</span></button>`; }).join('');
  const dmx = c === 'go' && !gT && !gG && !p.bo && !!p.dmx && TODAY >= p.dmx, dmb = dmx ? `<button class="act gem dmx" type="button" data-dmax="${p.k}" aria-pressed="${DYNAMAX.has(p.k)}" aria-label="Dynamax – Pokémon GO" title="Dynamax obtenu dans Pokémon GO (utilisable en Combats Max) — coche aussi ${esc(p.n)} capturé ; sans effet sur la complétion">${DMAX_IC}<span class="t">Dynamax</span></button>` : '';
  let first = '';
  if (mg) { first = slot; slot = ''; }
  const salBtns = isSal(p) && c && c !== 'home' ? ['A', 'G'].map(v => { const n = v === 'G' ? 'Grave' : 'Aigüe', dis = catchDis || !gmaxInGame(p, c); return `<button class="act salg gem gmx" type="button" data-sal="${v}"${dis ? ' disabled' : ''} aria-pressed="${!dis && salOn(v, c)}" aria-label="Gigamax ${n}${nm ? ' – ' + esc(nm) : ''}" title="${esc(`Salarsen Gigamax Forme ${n} obtenu${nm ? ' – ' + nm : ''} (coche aussi Salarsen Forme ${n} ; lié au bouton Gigamax de sa fiche). Capturé = Aigüe ou Grave`)}">${GMAX_IC}<span class="t">Gigamax ${n}</span></button>`; }).join('') : ''; // v44
  const al = alphaOk(q, c) && !p.bo, bb = al ? baronBtns(isBaron(q, c), isBaronS(q, c), false, nm, '') : ''; // v25: Légendes Arceus / Z-A, Alpha-capable forms only
  const nB = (mg ? 2 : 3) + (salBtns ? 1 : 0) + (al ? 2 : 0) + ((first + slot + dmb + gbs).match(/class="act /g) || []).length;
  const ctx = !c ? 'Vue d’ensemble — choisissez un jeu (ou Pokémon HOME) pour marquer' : `Suivi : <b>${esc(nm)}</b>${sw.length ? ` <span class="shr">+ ${esc(sw.map(x => GAME_BY[x].s).join(', '))}</span>` : ''}`;
  return `<div class="actbar" id="actbar" role="toolbar" aria-label="Suivi${nm ? ' – ' + esc(nm) : ''}"><div class="actctx">${ctx}</div><div class="acts${nB > 6 ? ' wrap2' : ''}">
    ${mg ? first : isSal(p) && c && c !== 'home' ? salBtns : `<button class="act cg${gx ? ' gem gmx' : ''}" type="button" ${catchDis ? 'disabled' : ''} aria-pressed="${gT ? goMegaOn(p) : isCaught(p, c)}" aria-label="${gT ? eL : 'Capturé'}${nm ? ' – ' + esc(nm) : ''}" title="${gT ? esc(`Capturé = enregistré au Pokédex GO (${p.c === 'primal' ? 'Primo-Résurgence' : 'Méga-Évolution'} faite au moins une fois) — coche aussi ${tb ? tb.n : 'la forme de base'} et la ${eL}`) : gG ? 'Gigamax capturé en Combat Max – Pokémon GO (coche aussi sa forme de base)' : gx ? `Gigamax obtenu${nm ? ' – ' + esc(nm) : ''} (coche aussi sa forme de base ; lié au bouton Gigamax de sa fiche)` : p.mb ? (isZa(c) ? 'Capturé en Z-A = forme de base capturée + Méga-Gemme' : 'Méga : forme de combat, suit la forme de base') : ('Capturé' + (nm ? ' – ' + esc(nm) : ''))}">${gx ? GMAX_IC : gT ? `<img class="gemimg" src="${energyImg(p)}" alt="" width="28" height="28" decoding="async">` : isCaught(p, c) ? BALL : BALL_OFF}<span class="t">${gx ? 'Gigamax' : gT ? eL : 'Capturé'}</span></button>`}
    <button class="act sh" type="button" ${shDis ? 'disabled' : ''} aria-pressed="${!shDis && isShiny(p, c)}" aria-label="Shiny capturé${nm ? ' – ' + esc(nm) : ''}" title="${shNo ? esc(shNo) : gT ? esc(`Shiny = ${p.n} shiny enregistré (${p.c === 'primal' ? 'Primo-Résurgence' : 'Méga-Évolution'} d’un Pokémon shiny) — coche aussi ${tb ? tb.n : 'la forme de base'} shiny et la ${eL}`) : p.mb ? (isZa(c) ? 'Shiny en Z-A = forme de base shiny + Méga-Gemme' : 'Méga : forme de combat, suit la forme de base') : ('Shiny capturé' + (nm ? ' – ' + esc(nm) : ''))}"><span class="ic" aria-hidden="true">✨</span><span class="t">Shiny</span></button>
    ${bb}<button class="act tr" type="button" ${trOn ? '' : 'disabled'} aria-pressed="${trOn && (isSal(q) ? salTransOn(c) : isTrans(q, c))}" aria-label="Transféré vers HOME${nm ? ' – ' + esc(nm) : ''}" title="${esc(trT)}${hk ? ' — ' + esc(omName(originOf(c))) : ''}">${hk ? omIcon(originOf(c)) : homeBall}<span class="t">${isZa(c) ? 'Transf.' : 'Transféré'}</span></button>
    ${slot}${dmb}${gbs}</div></div>`;
}
// Sticky header: back, previous / next, favourite only.
// v30: sheet game menu = same order / separators as the list « Jeux » menu (extra lists above their game's latest expansion), regional dex number on each game.
// Values: game ids; « Hors dex » lists of games with expansions and the Méga-Dex keep their list value (svhors, swhors, zamega) and open their game (changeGame).
const menuNum = (sp, g) => { const n = sp.gm && sp.gm[g]; if (!n) return ''; const a = []; for (let i = 1; i < n.length; i += 2) a.push('#' + pad3(n[i])); return a.length > 2 ? a[0] + ' …' : a.join(' · '); };
function sheetGameOpts(p, sp, games, goOk, mode) {
  const hors = horsGames(p, sp).filter(g => !games.includes(g)), mega = megaDex().keys.has(p.k);
  const items = [['all', 'Vue d’ensemble (infos générales)', ''], ['home', 'Pokémon HOME (transferts)', '']];
  if (goOk) items.push(['go', 'Pokémon GO', '']);
  for (const g of GAMES) {
    for (const [k, v] of Object.entries(VDEX)) if ((v.before || v.game) === g.id) {
      if (v.mega && mega) items.push([k, v.n, '']); // Méga-Dex: no numbers of its own (national order), same marks as Z-A
      else if (v.file && hors.includes(v.game)) items.push([k, v.n.replace(/\s*[–—-]\s*Hors dex$/i, ''), 'Hors dex']);
    }
    if (games.includes(g.id)) items.push([g.id, g.n, menuNum(sp, g.id)]);
    else if (hors.includes(g.id) && !Object.values(VDEX).some(v => v.file && v.game === g.id)) items.push([g.id, g.n, 'Hors dex']);
  }
  const has = v => items.some(x => x[0] === v), selV = has(mode) ? mode : (Object.keys(VDEX).find(k => VDEX[k].file && VDEX[k].game === mode && has(k)) || 'all');
  return items.map(([v, l, n]) => `<option value="${v}"${n ? ` data-n="${esc(n)}"` : ''}${v === selV ? ' selected' : ''}>${esc(l)}</option>`).join('');
}
function navHTML(p, extra = '') {
  const key = ik(p);
  let prev = '', next = '';
  if (GAME_BY[state.game] && DEX[state.game]) { // follow the filtered list when a game is selected
    const seen = new Set(), list = filtered().filter(x => !seen.has(x.id) && seen.add(x.id)); const i = list.findIndex(x => x.id === p.id); // one entry per species (regional form in its region’s dex)
    if (i > 0) prev = `#/p/${list[i - 1].k}`; if (i >= 0 && i < list.length - 1) next = `#/p/${list[i + 1].k}`;
  } else { prev = p.id > 1 ? `#/p/${p.id - 1}` : ''; next = p.id < 1025 ? `#/p/${p.id + 1}` : ''; }
  return `<div class="dtop"><div class="dnav">${fromRank ? '<a href="#/classements" aria-label="Retour aux classements">←</a>' : '<a href="#/" aria-label="Retour à la liste">←</a>'}<a class="${prev ? '' : 'disabled'}" href="${prev || '#'}" aria-label="Précédent">‹</a><a class="${next ? '' : 'disabled'}" href="${next || '#'}" aria-label="Suivant">›</a><span class="sp"></span><button class="cadd2" type="button" data-add="${p.k}" aria-label="Ajouter à ma collection" title="Ajouter à ma collection">＋</button><button class="fav" type="button" aria-pressed="${FAVS.has(key)}" aria-label="Favori">${FAVS.has(key) ? '★' : '☆'}</button></div>${extra}${actbarHTML(p)}</div>`;
}
const chartFor = gen => DATA.charts[gen <= 1 ? 1 : gen <= 5 ? 2 : 6];
function effGroups(types, mode, chart, adj = {}) {
  const mults = {};
  for (const [atk, row] of Object.entries(chart)) mults[atk] = types.reduce((m, d) => m * (row[d] ?? 1), 1) * (adj[atk] ?? 1);
  const g = {};
  if (mode === 'go') {
    for (const [atk, row] of Object.entries(chart)) {
      const st = types.reduce((sum, d) => sum + (row[d] === 2 ? 1 : row[d] === 0.5 ? -1 : row[d] === 0 ? -2 : 0), 0);
      if (st) (g[st] ||= []).push(atk);
    }
    return [[2, 'Très faible', '×2,56', 'w'], [1, 'Faible', '×1,6', 'w'], [-1, 'Résiste', '×0,625', 'r'], [-2, 'Résiste fortement', '×0,39', 'r'], [-3, 'Résiste énormément', '×0,24', 'r']]
      .map(([k, l, m, c]) => ({ label: l, mult: m, cls: c, types: g[k] || [] })).filter(x => x.types.length);
  }
  for (const [t, v] of Object.entries(mults)) if (v !== 1) (g[v] ||= []).push(t);
  return [[4, 'Très faible', '×4', 'w'], [2, 'Faible', '×2', 'w'], [0.5, 'Résiste', '×½', 'r'], [0.25, 'Résiste fortement', '×¼', 'r'], [0, 'Immunisé', '×0', 'r']]
    .map(([k, l, m, c]) => ({ label: l, mult: m, cls: c, types: g[k] || [] })).filter(x => x.types.length);
}
function effHTML(types, mode, chart, ab = null) {
  const mark = ab ? ab.mark : new Set(), adj = ab ? ab.adj : {};
  const body = effGroups(types, mode, chart, adj).map(x => `<div class="eff ${x.cls}"><div class="hd">${x.label} <small>${x.mult}</small></div><div class="badges">` +
    x.types.map(t => `<a class="badge${mark.has(t) ? ' abx' : ''}" href="#" data-type="${t}" style="background:${TYPE_COLORS[t]}">${esc(TYPE_FR[t])}${mark.has(t) ? '<sup aria-hidden="true">*</sup>' : ''}</a>`).join('') + '</div></div>').join('');
  return body || '<p class="note">Aucune faiblesse ni résistance.</p>';
}
// v31: abilities that change type matchups (classic games). Immunities / halvings are applied to the table when EVERY ability of the form has them
// (« son seul talent »), otherwise the affected types get a * and a note. Gen: first generation where the effect exists.
const ABIL_EFF = {
  26: { t: { ground: 0 } }, 11: { t: { water: 0 } }, 114: { t: { water: 0 }, g: 5 }, 87: { t: { water: 0, fire: 1.25 } }, 10: { t: { electric: 0 } }, 31: { t: { electric: 0 }, g: 5 }, 78: { t: { electric: 0 } },
  18: { t: { fire: 0 } }, 273: { t: { fire: 0 } }, 157: { t: { grass: 0 }, g: 5 }, 297: { t: { ground: 0 } }, 47: { t: { fire: 0.5, ice: 0.5 } }, 85: { t: { fire: 0.5 } }, 199: { t: { fire: 0.5 } }, 272: { t: { ghost: 0.5 } }, 218: { t: { fire: 2 } },
  25: { x: 'ne subit que les attaques super efficaces (et les dégâts indirects)' }, 111: { x: 'attaques super efficaces : dégâts ×0,75' }, 116: { x: 'attaques super efficaces : dégâts ×0,75' }, 232: { x: 'attaques super efficaces : dégâts ×0,75' }
};
const multFR = m => m === 0 ? 'immunisé contre' : m === 0.5 ? 'dégâts ÷ 2 de' : m === 2 ? 'dégâts × 2 de' : `dégâts ×${dec(String(m))} de`;
function abilityEff(f, gm, ref, types, chart) {
  if (!gm) return null;
  const list = abilityList(f, gm, ref).filter(([id]) => ABIL_EFF[id] && (ABIL_EFF[id].g || 3) <= gm.g); if (!list.length) return null;
  const all = abilityList(f, gm, ref), only = id => all.length > 0 && all.every(a => a[0] === id), adj = {}, mark = new Set(), notes = [];
  const STD = new Set([0, 0.25, 0.5, 1, 2, 4]);
  for (const [id, hid] of list) {
    const e = ABIL_EFF[id], nm = (ref.ab[id] || [])[0] || '?';
    if (e.x) { notes.push(`<b>Talent ${esc(nm)}</b>${hid ? ' (caché)' : ''} : ${e.x}${only(id) ? ' — son seul talent.' : ' — si le Pokémon a ce talent.'}`); continue; }
    const parts = Object.entries(e.t).map(([t, m]) => `${multFR(m)} <b>${esc(TYPE_FR[t])}</b>`);
    const base = t => types.reduce((m, d) => m * (chart[t]?.[d] ?? 1), 1), apply = only(id) && Object.entries(e.t).every(([t, m]) => STD.has(base(t) * m));
    for (const t of Object.keys(e.t)) { mark.add(t); if (apply) adj[t] = (adj[t] ?? 1) * e.t[t]; }
    notes.push(`<b>* Talent ${esc(nm)}</b>${hid ? ' (caché)' : ''} : ${parts.join(', ')}${apply ? ' — son seul talent : déjà pris en compte ci-dessus.' : ' — si le Pokémon a ce talent (le tableau montre les types seuls).'}`);
  }
  return { adj, mark, html: `<div class="abnote">${notes.map(n => `<p>${n}</p>`).join('')}</div>` };
}
function statColor(v) { return v < 50 ? '#e5534b' : v < 80 ? '#e0a02f' : v < 110 ? '#9bc53d' : v < 150 ? '#3fbf7f' : '#35b7d6'; }
const pickGen = (list, gen, cur) => { const e = (list || []).find(x => x[0] >= gen); return e ? e[1] : cur; };
function statsHTML(arr, gen1, max = 255) {
  const idx = gen1 ? [0, 1, 2, 3, 5] : [0, 1, 2, 3, 4, 5];
  const lab = gen1 ? ['PV', 'Attaque', 'Défense', 'Spécial', 'Vitesse'] : STAT_LABELS;
  const tot = idx.reduce((a, i) => a + arr[i], 0);
  return idx.map((i, j) => `<div class="stat"><span class="lb">${lab[j]}</span><span class="v">${arr[i]}</span><div class="bar"><i style="width:${Math.min(100, arr[i] / max * 100)}%;background:${statColor(arr[i])}"></i></div></div>`).join('') +
    `<div class="stat total"><span class="lb">Total</span><span class="v">${tot}</span><div class="bar"><i style="width:${Math.min(100, tot / (gen1 ? 600 : 720) * 100)}%;background:var(--accent)"></i></div></div>`;
}
function formLabel(q) { return q.l || (q.c ? q.n : 'Commun'); }
// v57: Couafarel trims — where/how each trim is obtained (GO: verified Leek Duck + Bulbapedia; main games: Poképédia)
const TRIM_MAIN = { xy: 'Au Fringant Pokémon (Avenue Floréal, Illumis) ; la coupe s’efface après quelques jours ou au PC.', oras: 'Fan Club Pokémon de Poivressel ; la coupe s’efface après quelques jours ou au PC.', sm: 'salon de Malié (Ula-Ula), 500 ₽ ; la coupe s’efface après quelques jours ou au PC.', usum: 'salons de Malié (Ula-Ula) ou d’Ekaeka (Mele-Mele), 500 ₽ ; la coupe s’efface après quelques jours ou au PC.', za: 'Onraz (Jaunemont, 6e arr.), 500 ₽ ; Cœur, Étoile, Diamant dès le début, les autres via les missions 047, 062 et 087.' };
TRIM_MAIN.zadlc = TRIM_MAIN.za;
const trimMode = gm => state.dgame === 'go' ? 'go' : TRIM_MAIN[gm?.id] ? gm.id : '';
function trimHTML(p, gm) {
  if (p.id !== 676) return '';
  const m = trimMode(gm);
  if (m === 'go') return ''; // GO: zones and cost are in « Disponibilité » (go.rgf / rg / fco / fch)
  if (m) return `<p class="note trimhow">✂️ Toiletteur : ${esc(TRIM_MAIN[m])}</p>`;
  return '<p class="note trimhow">✂️ Coupes : toiletteur dans X/Y, ROSA, SL/USUL et Z-A ; dans GO, selon la zone (choisissez le jeu « Pokémon GO »).</p>';
}
function formSwitcher(p, gm) {
  let list = FORMS[p.id]; if (!list || list.length < 2) return '';
  const SZ = ['Taille S', 'Taille M', 'Taille L', 'Taille XL']; // Pitrouille / Banshitrouye: chips in size order
  if (list.every(q => SZ.includes(q.l))) list = [...list].sort((a, b) => SZ.indexOf(a.l) - SZ.indexOf(b.l));
  const gi = gm ? GIDX[gm.id] : -1;
  const chips = list.map(q => {
    const na = gm && q.c && !inGame(q, gi);
    return `<a class="fchip${q.k === p.k ? ' cur' : ''}${na ? ' na' : ''}" href="#/p/${q.k}" title="${esc(fullN(q))}"><img src="${artOf(q)}" alt="" loading="lazy" width="36" height="36"><span>${esc(formLabel(q))}</span></a>`;
  }).join('');
  return `<section class="box" id="formesbox"><h2>Formes <small class="cnt">${list.length}</small></h2><div class="fchips${list.length > 14 ? ' many' : ''}${p.id === 676 ? ' fgrid' : ''}">${chips}</div>${gm ? '<p class="note">Formes grisées : absentes de ce jeu.</p>' : ''}${trimHTML(p, gm)}${allFormsHTML(p)}</section>`;
}
// v41: « Cocher toutes les formes » — marks Capturé for every form of the species in the sheet's game only (separate marks, S* species)
const allFormsList = (p, c = sheetCtx()) => (!c || c === 'home' || !FSHORT.has(p.id) || p.mb || p.bo || p.c === 'gmax' || fLinked(p, c)) ? [] : fSibs(p).filter(q => fIn(q, c));
function allFormsHTML(p) {
  const l = allFormsList(p); if (l.length < 2) return '';
  const c = sheetCtx(), n = l.filter(q => isCaught(q, c)).length, all = n === l.length;
  return `<div class="allforms"><button type="button" id="allforms" class="${all ? 'done' : ''}"${all ? ' disabled' : ''}>${all ? '✓ Toutes cochées' : 'Cocher toutes les formes'}</button><span class="note">Capturé : ${n} / ${l.length} formes</span></div>`;
}
function dexNumbers(sp, gid) {
  const gm = GAME_BY[gid]; const n = sp.gm[gid]; if (!n) return '';
  const parts = [];
  for (let i = 0; i < n.length; i += 2) parts.push(`${gm.dx.length > 1 ? esc(gm.dx[n[i]]) + ' ' : ''}<b>#${pad3(n[i + 1])}</b>`);
  const extra = sp.gm[gid + '*'];
  if (extra) { const ep = []; for (let i = 0; i < extra.length; i += 2) ep.push(`${esc(gm.info[extra[i]])} <b>#${pad3(extra[i + 1])}</b>`); parts.push(`<span class="mute">(îles : ${ep.join(' · ')})</span>`); }
  if (DEX[gid] && DEX[gid].nreq && DEX[gid].nreq.has(sp.id)) parts.push('<span class="mute">non requis (hors compteur)</span>');
  return parts.join(' · ');
}
const TR_NOTE = '<p class="note trnote">Traduit en français faute de données officielles (traduction automatique, peut différer du texte officiel).</p>';
// v32: Pokédex texts — Poképédia first (per version, expansions → base game, per form), then PokéAPI official French, then machine translation (marked)
const PP_CREDIT = '<p class="note ppcredit">Descriptions : <a href="https://www.pokepedia.fr" target="_blank" rel="noopener">Poképédia</a> (licence <a href="https://creativecommons.org/licenses/by-nc-sa/3.0/fr/" target="_blank" rel="noopener">CC BY-NC-SA 3.0 FR</a>).</p>';
function flavorHTML(sp, gm, f) {
  const fp = f && f.pv, pt = sp.pt || [];
  // → [text, source] with source 'pp' (Poképédia) | 'api' (PokéAPI, French) | 'tr' (machine translation)
  const ftx = id => fp && fp[id] !== undefined ? [pt[fp[id]], 'pp'] : sp.pv && sp.pv[id] !== undefined ? [pt[sp.pv[id]], 'pp']
    : sp.fv[id] !== undefined ? [sp.ft[sp.fv[id]], 'api'] : sp.tv && sp.tv[id] !== undefined ? [sp.tt[sp.tv[id]], 'tr'] : null;
  if (!gm) { // latest available entry
    const ks = [...new Set([...Object.keys(fp || {}), ...Object.keys(sp.pv || {}), ...Object.keys(sp.fv), ...Object.keys(sp.tv || {})])].map(Number).sort((a, b) => b - a);
    for (const id of ks) { const t = ftx(id); if (t) return `<p class="desc">${esc(t[0])}</p>${t[1] === 'tr' ? TR_NOTE : t[1] === 'pp' ? PP_CREDIT : ''}`; }
    return '';
  }
  const byText = new Map(); let anyTr = false, anyPp = false;
  for (const [id, name] of gm.ver) { const t = ftx(id); if (!t) continue; const k = t[0]; if (!byText.has(k)) byText.set(k, { names: [], src: t[1] }); byText.get(k).names.push(name); anyTr ||= t[1] === 'tr'; anyPp ||= t[1] === 'pp'; }
  if (!byText.size) return `<p class="note">${(sp.pna || []).some(v => gm.ver.some(x => x[0] === v)) ? 'Pas de description du Pokédex dans ce jeu (absent du Pokédex National du jeu, selon Poképédia).' : 'Pas d’entrée de Pokédex disponible pour ce jeu (Poképédia, PokéAPI).'}</p>`;
  return [...byText].map(([t, o]) => `<p class="desc"><small>${esc(o.names.join(' / '))}${o.src === 'tr' ? ' · traduction automatique' : o.src === 'api' ? ' · PokéAPI' : ''}</small><br>${esc(t)}</p>`).join('') + (anyTr ? TR_NOTE : '') + (anyPp ? PP_CREDIT : '');
}
// v32: étymologie + distributions événementielles (Poképédia), overview only
function etyHTML(sp) {
  if (!sp.ety && !sp.evd) return { ety: '', ev: '' };
  const main = (sp.ety || []).filter(r => /^(Français|Anglais|Japonais)/.test(r[0])), rest = (sp.ety || []).filter(r => !main.includes(r));
  const row = r => `<li><b>${esc(r[0])}</b> : ${esc(r[1])}</li>`;
  const ety = sp.ety ? `<section class="box etybox"><h2>Origine du nom</h2><ul class="plain ety">${(main.length ? main : sp.ety.slice(0, 3)).map(row).join('')}</ul>${rest.length && main.length ? `<details class="etymore"><summary>Autres langues (${rest.length})</summary><ul class="plain ety">${rest.map(row).join('')}</ul></details>` : ''}<p class="note">Source : Poképédia (CC BY-NC-SA 3.0 FR).</p></section>` : '';
  const ev = sp.evd ? `<section class="box evdbox"><h2>Distributions événementielles <small class="cnt">${sp.evd.length}</small></h2><details class="evd"><summary>Voir les ${sp.evd.length} distribution${sp.evd.length > 1 ? 's' : ''}</summary><ul class="plain evl">${sp.evd.map(e => `<li><span class="yr">${esc(e[0])}</span> ${esc(e[1])}</li>`).join('')}</ul></details><p class="note">Pokémon distribués lors d’événements (souvent terminés). Source : Poképédia.</p></section>` : '';
  return { ety, ev };
}
function abilityList(f, gm, ref) { // [[abilityId, hidden]] of the form in this game ([] when abilities do not exist)
  const gen = gm ? gm.g : 9;
  if (gm && (gen < 3 || gm.id === 'la')) return [];
  let list = pickGen(f.pa, gen, f.a);
  if (gen < 5) list = list.filter(a => !a[1]);
  return list.filter(a => ((ref.ab[a[0]] || [])[2] || 1) <= gen); // an ability cannot exist before the generation that introduced it
}
function abilitiesHTML(f, gm, ref) {
  const gen = gm ? gm.g : 9;
  if (gm && (gen < 3 || gm.id === 'la')) return `<p class="note">${gm.id === 'la' ? 'Les talents n’existent pas dans Légendes Pokémon : Arceus.' : 'Les talents n’existent pas avant la génération III.'}</p>`;
  const list = abilityList(f, gm, ref);
  if (!list.length) return '<p class="note">Aucun talent.</p>';
  // v31: description in a popup (tap the name) — keeps the sheet short
  return { n: list.length, body: list.map(([id, hid]) => { const a = ref.ab[id]; return a ? `<div class="ab"><button type="button" class="dsc" data-dsc="a:${id}" aria-haspopup="dialog"><b>${esc(a[0])}</b><span class="ii" aria-hidden="true">ⓘ</span></button>${hid ? ' <span class="tag2">Talent caché</span>' : ''}</div>` : ''; }).join('') + '<p class="note">Touchez un talent pour sa description.</p>' };
}
// v29: wild held items of the selected game (PokéAPI held_items: item, % per version), next to the encounters. Versions with different % are listed separately.
function heldHTML(f, gm, ref) {
  if (!gm || !f.hi) return '';
  const ids = gm.ver.map(v => v[0]), vn = Object.fromEntries(gm.ver), by = new Map();
  for (const [item, rar, vs] of f.hi) for (const v of vs) if (ids.includes(v)) { const m = by.get(item) || by.set(item, new Map()).get(item); m.set(v, rar); }
  if (!by.size) return ''; // nothing held in this game
  const rows = [...by].map(([item, m]) => {
    const rs = [...new Set(m.values())], all = ids.every(v => m.has(v));
    const pct = rs.length === 1 ? `<b>${rs[0]} %</b>${all || ids.length === 1 ? '' : ` <span class="mute">(${[...m.keys()].map(v => esc(vn[v])).join(', ')} seulement)</span>`}` : [...m].map(([v, r]) => `${esc(vn[v])} <b>${r} %</b>`).join(' · ');
    return `<li><button type="button" class="dsc hin" data-dsc="i:${item}" aria-haspopup="dialog">${esc(ref.it[item] || '?')}<span class="ii" aria-hidden="true">ⓘ</span></button> <span class="hip">${pct}</span></li>`;
  });
  return `<section class="box held"><h2>Objets tenus <small class="cnt">sauvages · ${by.size}</small></h2><ul class="plain heldl">${rows.join('')}</ul><p class="note">Probabilité qu’un Pokémon sauvage tienne l’objet (PokéAPI ; objet récupérable en le capturant).</p></section>`;
}
// v29: reproduction & capture (species data; hatch steps per game: II–III & VII 256 steps / cycle, IV + DÉPS 255, V–VI 257, Épée/Bouclier & Écarlate/Violet 128)
const NO_EGG = new Set(['rb', 'y', 'lgpe', 'la', 'za', 'zadlc']);
const stepsPerCycle = gm => !gm ? null : gm.id === 'bdsp' ? 255 : gm.g >= 8 ? 128 : gm.g === 7 ? 256 : gm.g >= 5 ? 257 : gm.g === 4 ? 255 : 256;
function breedHTML(p, sp, gm) {
  if (sp.cr == null) return '';
  const noEgg = gm && NO_EGG.has(saveOf(gm.id)), undisc = !sp.eg.length || sp.eg.every(g => /Inconnu|Indéfini/i.test(g));
  const sex = sp.gr < 0 ? '<b>Asexué</b>' : sp.gr === 0 ? '<b>♂ 100 %</b>' : sp.gr === 8 ? '<b>♀ 100 %</b>' : `<b>♂ ${dec(((8 - sp.gr) / 8 * 100).toFixed(1))} %</b> · <b>♀ ${dec((sp.gr / 8 * 100).toFixed(1))} %</b>`;
  const pc = Math.min(100, Math.pow(sp.cr / 3 / 255, 0.75) * 100), pcs = pc >= 99.5 ? '100' : pc < 1 ? dec(pc.toFixed(1)) : Math.round(pc);
  const spc = stepsPerCycle(gm), st = n => fmt(sp.hc * n);
  const hatch = noEgg ? `<span class="mute">pas d’œufs dans ${esc(gm.s)}</span>` : undisc ? ((BY_KEY[String(p.id)] || p).ba ? `<b>${sp.hc} cycles</b> <span class="mute">· bébé : œuf obtenu en faisant se reproduire son évolution</span>` : '<span class="mute">ne se reproduit pas</span>') : gm ? `<b>${sp.hc} cycles</b> · ≈ ${st(spc)} pas` : `<b>${sp.hc} cycles</b> · ≈ ${st(128)} pas (Switch) · ${st(256)} (Gén. II–VII)`;
  const row = (k, v) => `<div class="br"><span class="bk">${k}</span><span class="bv">${v}</span></div>`;
  return `<section class="box breed"><h2>Reproduction &amp; capture</h2><div class="brl">` +
    row('Sexe', sex) +
    row('Taux de capture', `<b>${sp.cr}</b> / 255 <span class="mute">· ≈ ${pcs} % (Poké Ball, PV max)</span>`) +
    row('Groupes d’œufs', sp.eg.length ? sp.eg.map(g => `<b>${esc(g)}</b>`).join(' · ') : '—') +
    row('Éclosion', hatch) +
    row('Croissance', `<b>${esc(GROWTH[sp.gw] || sp.gw)}</b>`) +
    row('Bonheur de base', `<b>${sp.bh}</b>${sp.bh != null ? ' <span class="mute">/ 255</span>' : ''}`) +
    `</div><p class="note">Données de l’espèce (PokéAPI, valeurs actuelles). Capture : estimation Gén. V+ sans bonus (statut, PV bas, Ball améliorée). Pas d’éclosion approximatifs (pas par cycle selon le jeu).</p></section>`;
}


/* ---------------- v31: shiny block (game sheets) ---------------- */
// Status (✔ / ⚠ partial lock / 🔒 shiny lock) from data/shiny.json (Poképédia + Bulbapedia, cross-checked), methods table « Sans Charme / Avec Charme »
// (best in green; rows where the Charm changes nothing, e.g. raids, hidden in games that have the Charm), Charme Chroma line, sources.
const denom = x => { const m = /1\/(\d+)/.exec(x || ''); return m ? +m[1] : Infinity; };
function shinyStatus(p, gm, S) {
  const g = gm.id, M = S.m[g], L = S.l[g] || {}, base = BY_KEY[String(p.id)] || p;
  if (!M.e) return { cls: 'none', ic: '—', html: `<b>Pas de Pokémon shiny</b> dans ${esc(gm.s)} : ils apparaissent en IIᵉ génération (Or / Argent).` };
  const battle = ['mega', 'primal'].includes(p.c);
  let lk = L[p.k] || (p.c ? L[String(p.id)] : null) || L['#' + p.id];
  if (!lk && S.ok[g] && (base.lg || base.my) && !S.ok[g].includes(p.id)) lk = ['t', 'Rencontre scénarisée (légendaire / fabuleux)', ''];
  const via = battle ? ` <span class="mute">(selon le Pokémon de base : ${esc(base.n)})</span>` : '';
  if (lk && lk[0] === 't') return { cls: 'lock', ic: '🔒', lock: true, html: `<span class="shlock">SHINY LOCK</span><b>${esc(battle ? base.n : p.n)} ne peut pas être shiny</b> dans ${esc(gm.s)}.${via}<br><span class="mute">${esc(lk[1])}</span>${lk[2] ? `<br>${esc(lk[2])}` : ''}` };
  if (lk) return { cls: 'part', ic: '⚠', html: `<b>Peut être shiny</b> dans ${esc(gm.s)}, sauf une rencontre verrouillée :${via}<br><span class="shlock">LOCK</span>${esc(lk[1])}${lk[2] ? `<br><span class="mute">Ailleurs : ${esc(lk[2])}</span>` : ''}` };
  return { cls: 'ok', ic: '✔', html: `<b>Peut être shiny</b> dans ${esc(gm.s)}.${via}` };
}
function shinyHTML(p, gm) {
  const S = DET.shiny; if (!S || !S.m[gm.id]) return '';
  const M = S.m[gm.id], st = shinyStatus(p, gm, S), charm = !!M.c;
  const stHTML = `<div class="shst ${st.cls}"><span class="ic" aria-hidden="true">${st.ic}</span><span>${st.html}</span></div>`;
  if (!M.e) return `<section class="box shinybox"><h2>✨ Shiny <small class="cnt">${esc(gm.s)}</small></h2>${stHTML}</section>`;
  const rows = M.r.filter(r => !charm || r[4]);
  const bestNo = Math.min(...rows.map(r => denom(r[2]))), bestCh = Math.min(...rows.map(r => denom(r[3])));
  // compact cell (« ≈1/819 ») ; any qualifier (« par horde », « niv. 200+ … ») moves to the method's note so the table fits 360 px
  const cut = x => { if (x == null) return null; const m = x.match(/^[≈~]?(?:1\/[\d\u202f ]*\d|\d+(?:[.,]\d+)?\s?%)/); if (!m && x.length <= 10) return [x, '']; const sh = m ? m[0] : 'n.c.'; const rest = (m ? x.slice(m[0].length) : x).replace(/[()]/g, '').replace(/^\s*;?\s*/, '').replace(/\s+;/g, ' ;').trim(); return [sh, rest]; };
  const val = (c, x, best) => c == null ? '<span class="v na">—</span>' : `<span class="v${c[0] !== 'n.c.' && denom(x) === best && best < Infinity ? ' best' : ''}"${c[0] === 'n.c.' ? ' title="non chiffré"' : ''}>${esc(c[0])}</span>`;
  const extra = (a, b) => { const A = a && a[1], B = b && b[1]; if (!A && !B) return ''; if (A === B || !charm) return A || B; return [A && (charm ? `sans Charme : ${A}` : A), B && `avec Charme : ${B}`].filter(Boolean).join(' · '); };
  const table = `<div class="shm${charm ? '' : ' one'}" role="table" aria-label="Méthodes shiny"><span class="hd">Méthode</span><span class="hd">${charm ? 'Sans Charme' : 'Chance'}</span>${charm ? '<span class="hd">Avec Charme</span>' : ''}` +
    rows.map(r => { const a = cut(r[2]), b = charm ? cut(r[3]) : null, xt = extra(a, b), sm = [r[1], r[5], xt].filter(Boolean).join(' · '); return `<span class="nm">${esc(r[0])}${sm ? `<small>${esc(sm)}</small>` : ''}</span>${val(a, r[2], bestNo)}${charm ? val(b, r[3], bestCh) : ''}`; }).join('') + '</div>';
  const row = (k, v) => `<div class="br"><span class="bk">${k}</span><span class="bv">${v}</span></div>`;
  const ch = `<div class="brl shcharm">${row('Charme Chroma', charm ? `${esc(M.c[0])} <span class="mute">· ${esc(M.c[1])}</span>` : `<span class="mute">n’existe pas dans ce jeu (apparu dans Noir 2 / Blanc 2)</span>`)}${row('Taux de base', `<b>${esc(M.b)}</b> <span class="mute">par rencontre</span>`)}</div>`;
  const rules = S.g[gm.id] ? `<p class="note">Jamais shiny dans ce jeu : ${S.g[gm.id].map(esc).join(' ')}</p>` : '';
  const body = st.lock ? `${stHTML}<details class="shd"><summary>Méthodes du jeu (autres Pokémon)</summary>${table}${ch}</details>` : `${stHTML}${table}${ch}`;
  return `<section class="box shinybox"><h2>✨ Shiny <small class="cnt">${esc(gm.s)}</small></h2>${body}${M.n ? `<p class="note">${esc(M.n)}</p>` : ''}${rules}<p class="note">Chances par rencontre, arrondies${charm ? ' ; méthodes où le Charme ne change rien (raids…) non listées' : ''} ; en vert, la meilleure méthode.${S.v[gm.id] ? ` Verrous : ${esc(S.v[gm.id])}.` : ''} Sources : ${esc(S.src)}.</p></section>`;
}

/* ---------------- v31: base-form note on form sheets ---------------- */
const deFR = w => /^[aeiouyéèêâîôûh]/i.test(w) ? 'd’' + w : 'de ' + w;
function baseNoteHTML(p) {
  if (!p.c) return '';
  const b = BY_KEY[p.mb || (p.bo && p.c !== 'primal' ? p.bo : '') || String(p.id)] || BY_KEY[String(p.id)]; if (!b || b.k === p.k) return '';
  const lk = `<a href="#/p/${b.k}">${esc(b.n)}</a>`, st = MEGA_STONES.stones?.[p.k];
  const txt = p.c === 'reg' ? `Forme ${deFR(p.l)} ${deFR(b.n).replace(b.n, lk)}`
    : p.c === 'mega' ? `Méga-Évolution ${deFR(b.n).replace(b.n, lk)}, ${p.id === 384 ? 'nécessite la capacité Draco Ascension (pas de Méga-Gemme)' : st ? `nécessite la ${esc(st.fr)}` : 'nécessite sa Méga-Gemme'} (en combat, avec une Gemme Sésame / un Méga-Anneau)`
    : p.c === 'primal' ? `Primo-Résurgence ${deFR(b.n).replace(b.n, lk)}, déclenchée en combat par ${p.id === 382 ? 'l’Orbe Bleu' : 'l’Orbe Rouge'}`
    : p.c === 'gmax' ? `Forme Gigamax ${deFR(b.n).replace(b.n, lk)} : en combat Dynamax avec le Facteur Gigamax (Épée / Bouclier), en Combats Max (GO)`
    : p.c === 'sex' ? `Forme ${p.l === 'Femelle' ? 'femelle' : 'mâle'} ${deFR(b.n).replace(b.n, lk)}`
    : `Forme « ${esc(p.l || p.n)} » ${deFR(b.n).replace(b.n, lk)}${p.bo ? ' — forme de combat : redevient ' + lk + ' après le combat' : ''}`;
  return `<section class="box basenote"><p>${txt}.</p><p class="note"><a href="#/p/${b.k}">Fiche de ${esc(p.c === 'sex' ? fullN(b) : b.n)} →</a></p></section>`;
}

/* ---------------- v31: alternative sprites (on demand, network only) ---------------- */
// Officiel = the self-hosted artwork (offline). HOME / Animé come from the PokéAPI sprites repository ONLY when tapped:
// never precached, not stored by the service worker (other origin); offline or missing → back to the official artwork.
let spriteMode = 'home'; // v35: HOME = default (self-hosted, offline); Officiel / Animé = alternatives for the current sheet
const SPR = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/';
const pokeId = p => { const c = CRIES && CRIES[p.k] && CRIES[p.k][0]; return c ? +c.slice(2) : (p.c ? 0 : p.id); };
function spriteBtns(p) {
  return `<div class="sprsw" role="group" aria-label="Illustration">${[['home', 'HOME'], ['off', 'Officiel'], ['anim', 'Animé']].map(([v, l]) => `<button type="button" data-spr="${v}" aria-pressed="${spriteMode === v}">${l}</button>`).join('')}</div>`;
}
// v35: each form uses ITS OWN sprite (core hs / as from the PokeAPI file list); never another form's image. Missing → this form's official art.
// A token guards against a late load / error of the previous sheet or mode (no stale image when switching forms).
let SPR_TOK = 0;
function setSprite(mode, quiet) {
  const p0 = DET && DET.p, p = p0 && showFemArt && p0.fe ? femP(p0) : p0, img = $('#heroimg'); if (!p || !img) return;
  const tok = ++SPR_TOK, shiny = showShinyArt && p.sh, off = `img/${shiny ? 's/' : ''}${p.k}.webp`;
  img.onerror = null; img.onload = null;
  const press = m => document.querySelectorAll('.sprsw button').forEach(b => b.setAttribute('aria-pressed', b.dataset.spr === m));
  const back = msg => { if (tok !== SPR_TOK) return; img.onerror = null; spriteMode = 'off'; img.classList.remove('pix'); img.src = off; press('off'); if (msg && !quiet) toast(msg, 'err', 4500); };
  if (mode === 'off') return back();
  let url;
  if (mode === 'home') url = !shiny && p.hh ? `img/h/${p.k}.webp` : p.hs && navigator.onLine !== false ? `${SPR}home/${shiny ? 'shiny/' : ''}${p.hs}.png` : null;
  else url = p.as && navigator.onLine !== false ? `${SPR}showdown/${shiny ? 'shiny/' : ''}${p.as}.gif` : null;
  if (!url) return back(navigator.onLine === false && mode === 'anim' ? 'Hors-ligne : sprite animé indisponible, illustration officielle.' : `${mode === 'home' ? 'Rendu HOME' : 'Sprite animé'} indisponible pour ${fullN(p)} : illustration officielle.`);
  spriteMode = mode; press(mode);
  img.classList.toggle('pix', mode === 'anim');
  img.onerror = () => back(`${mode === 'home' ? 'Rendu HOME' : 'Sprite animé'} indisponible pour ${fullN(p)} : illustration officielle.`);
  img.src = url;
}

/* ---------------- v31: description popups (ability / move / held item) ---------------- */
function closePop() { const o = $('#dpop'); if (o) o.remove(); document.querySelectorAll('.dsc[aria-expanded="true"]').forEach(b => b.setAttribute('aria-expanded', 'false')); }
async function openPop(btn) {
  const [kind, id] = btn.dataset.dsc.split(':'), was = btn.getAttribute('aria-expanded') === 'true'; closePop(); if (was) return;
  const ref = DET.shared.ref, gm = GAME_BY[state.dgame];
  let title = '', text = '', meta = '';
  if (kind === 'a') { const a = ref.ab[id] || []; title = a[0] || '?'; text = a[1] || ''; meta = 'Talent'; }
  else {
    const d = await loadDesc(); if (!btn.isConnected) return;
    if (kind === 'm') { const m = gm ? moveInfo(id, gm, DET.shared.moves) : null, raw = DET.shared.moves[id] || []; title = (m || {}).name || raw[0] || '?'; text = d && d.m[id] || '';
      if (m) meta = `${TYPE_FR[m.type] || ''} · ${CLS_LABEL[m.cls]} · Puissance ${m.power ?? '—'} · Précision ${m.acc ?? '—'} · PP ${m.pp ?? '—'}`; }
    else { title = ref.it[id] || '?'; text = d && d.i[id] || ''; meta = 'Objet'; }
    if (!d && !text) text = navigator.onLine === false ? 'Description indisponible hors-ligne (ouvrez-la une fois avec une connexion).' : 'Description indisponible.';
  }
  const o = document.createElement('div'); o.id = 'dpop'; o.className = 'dpop'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-label', title);
  o.innerHTML = `<button type="button" class="dpx" aria-label="Fermer">×</button><b>${esc(title)}</b><p>${esc(text || 'Pas de description en français dans PokéAPI.')}</p>${meta ? `<small>${esc(meta)}${kind !== 'a' ? ' · texte officiel FR (PokéAPI)' : ''}</small>` : ''}`;
  document.body.appendChild(o); btn.setAttribute('aria-expanded', 'true');
  const r = btn.getBoundingClientRect(), row = (btn.closest('.mv, .ab, li') || btn).getBoundingClientRect(), W = Math.min(innerWidth - 16, 420);
  const left = Math.max(8, Math.min(row.left, innerWidth - W - 8)); o.style.width = W + 'px'; o.style.left = left + 'px';
  const bar = $('#actbar'), barTop = bar && getComputedStyle(bar).position === 'fixed' ? bar.getBoundingClientRect().top : innerHeight, h = o.offsetHeight;
  const below = r.bottom + 6 + h <= barTop - 6; o.style.top = (scrollY + (below ? r.bottom + 6 : Math.max(r.top - 6 - h, 8))) + 'px';
  o.querySelector('.dpx').onclick = () => { closePop(); btn.focus(); };
}
document.addEventListener('click', e => {
  const sb = e.target.closest('.sprsw [data-spr]'); if (sb) { setSprite(sb.dataset.spr); return; }
  const d = e.target.closest('.dsc[data-dsc]'); if (d) { e.preventDefault(); openPop(d); return; }
  if (!e.target.closest('#dpop')) closePop();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#dpop')) { const b = $('.dsc[aria-expanded="true"]'); closePop(); if (b) b.focus(); } });
addEventListener('hashchange', closePop);

/* moves */
function moveInfo(id, gm, moves) {
  const m = moves[id]; if (!m) return null;
  let [name, type, cls, power, acc, pp, past] = m;
  if (past) for (const [vo, o] of [...past].sort((a, b) => b[0] - a[0])) if (vo > gm.vo) { if (o.t) type = o.t; if (o.p !== undefined) power = o.p; if (o.a !== undefined) acc = o.a; if (o.pp !== undefined) pp = o.pp; }
  if (gm.g <= 3 && cls !== 'n') cls = PHYS_TYPES.has(type) ? 'p' : 's';
  return { name, type, cls, power, acc, pp };
}
const CLS_LABEL = { p: 'Physique', s: 'Spéciale', n: 'Statut' };
function moveRow(id, gm, shared, lead) {
  const m = moveInfo(id, gm, shared.moves); if (!m) return '';
  return `<div class="mv"><span class="lv">${lead ?? ''}</span><span class="mn"><button type="button" class="dsc" data-dsc="m:${id}" aria-haspopup="dialog"><b>${esc(m.name)}</b><span class="ii" aria-hidden="true">ⓘ</span></button> ${badge(m.type)} <span class="cls cls-${m.cls}">${CLS_LABEL[m.cls]}</span></span><span class="ms">Puis. ${m.power ?? '—'} · Préc. ${m.acc ?? '—'} · PP ${m.pp ?? '—'}</span></div>`;
}
let movesTab = 'l';
function movesHTML(f, sp, gm, shared) {
  const src = f.mvOf ? sp.f[f.mvOf] : f;
  const idx = src && src.lm ? src.lm[gm.id] : undefined;
  if (idx === undefined) return '<section class="box"><h2>Capacités</h2><p class="note">Aucune donnée de capacités pour ce jeu.</p></section>';
  const ls = src.ls[idx];
  const tabs = [['l', 'Niveau', ls.l], ['m', gm.g <= 7 || gm.id === 'lgpe' ? 'CT / CS' : 'CT', ls.m], ['e', 'Œuf', ls.e], ['t', 'Tuteur', ls.t], ['o', 'Autre', ls.o]].filter(t => t[2] && t[2].length);
  if (!tabs.some(t => t[0] === movesTab)) movesTab = tabs[0]?.[0];
  const cur = tabs.find(t => t[0] === movesTab);
  let rows = '';
  if (cur) {
    if (cur[0] === 'l') rows = cur[2].map(([id, lv]) => moveRow(id, gm, shared, lv <= 1 ? (lv === 1 ? 'Niv. 1' : '—') : 'Niv. ' + lv)).join('');
    else if (cur[0] === 'o') rows = cur[2].map(([id, mi]) => moveRow(id, gm, shared, METHODS[shared.ref.mm[mi]] || 'Autre')).join('');
    else if (cur[0] === 'm') {
      const tm = shared.tm[gm.id] || {}; const num = id => { const l = tm[id]; if (!l) return [9, 9999]; const m = l.match(/^(CT|CS|DT)(\d+)/); return [{ CT: 0, CS: 1, DT: 2 }[m[1]], +m[2]]; };
      rows = [...cur[2]].sort((a, b) => { const x = num(a), y = num(b); return x[0] - y[0] || x[1] - y[1]; }).map(id => moveRow(id, gm, shared, tm[id] || '')).join('');
    } else rows = cur[2].map(id => moveRow(id, gm, shared, '')).join('');
  }
  return `<section class="box"><h2>Capacités <small class="cnt">${esc(gm.s)}</small></h2>
    <div class="tabs" role="tablist">${tabs.map(t => `<button data-mtab="${t[0]}" aria-pressed="${t[0] === movesTab}" title="${t[1]} : ${t[2].length} capacit${t[2].length > 1 ? 'és' : 'é'}"><span class="tlab">${t[1]}</span><span class="cntb" aria-hidden="true">${t[2].length}</span></button>`).join('')}</div>
    <div class="mvs">${rows}</div><p class="note">Valeurs (type, puissance, précision, PP, catégorie) telles qu’elles étaient dans ce jeu (PokéAPI). Avant la génération IV, la catégorie dépend du type.</p></section>`;
}

/* encounters */
// v32: detailed locations of the Switch-era games from Poképédia (f.pl[game] = [[place, details]]); non-regional forms use the base form's list
function ppLocs(f, sp, gm) {
  const k = Object.keys(sp.f).find(x => sp.f[x] === f), e = k && BY_KEY[k];
  if (f.pl && f.pl[gm.id]) return f.pl[gm.id];
  if (e && (e.c === 'reg' || e.mb)) return null; // v34: Megas say « Méga-Évolution de … »; a non-regional form without rows for this game uses the base form's list
  const b = sp.f[f.enOf || String(sp.id)]; return b && b.pl ? b.pl[gm.id] || null : null;
}
function ppLocHTML(rows, gm) {
  const by = new Map(); for (const [pl, d] of rows) { if (!by.has(pl)) by.set(pl, []); if (d) by.get(pl).push(d); }
  const KEY = /^(Donné|Échange|Œuf|Rencontre)/;
  const gifts = [...by].filter(([, ds]) => ds.some(d => KEY.test(d)));
  const list = [...by].sort((a, b) => a[0].localeCompare(b[0], 'fr', { numeric: true })).map(([pl, ds]) => `<div class="enc"><b>${esc(pl)}</b>${ds.map(d => `<div class="ms${/^(Donné|Échange)/.test(d) ? ' gift' : ''}">${esc(d)}</div>`).join('')}</div>`).join('');
  const gl = gifts.length ? `<p class="encsum">${gifts.map(([pl, ds]) => { const d = ds.find(x => KEY.test(x)); const t = /^Donné/.test(d) ? '🎁 Cadeau' : /^Échange/.test(d) ? '🔁 Échange' : /^Œuf/.test(d) ? '🥚 Œuf' : '⭐ Rencontre fixe'; return `<span class="encchip">${t} : ${esc(pl)}</span>`; }).join(' ')}</p>` : '';
  return gl + `<details${by.size <= 8 ? ' open' : ''}><summary>${by.size} lieu${by.size > 1 ? 'x' : ''}</summary>${list}</details>` +
    '<p class="note">Lieux, niveaux et taux : <a href="https://www.pokepedia.fr" target="_blank" rel="noopener">Poképédia</a> (CC BY-NC-SA 3.0 FR), données des pages de lieux. Cadeaux (« Donné ») et échanges in-game inclus.</p>';
}
function encHTML(f, sp, gm, shared) {
  const pp = ppLocs(f, sp, gm);
  if (pp && pp.length) return `<section class="box encbox"><h2>Où le trouver <small class="cnt">${esc(gm.s)}</small></h2>${ppLocHTML(pp, gm)}</section>`;
  { const k = Object.keys(sp.f).find(x => sp.f[x] === f), e = k && BY_KEY[k], N = f.pln || (e && e.c !== 'reg' ? (sp.f[String(sp.id)] || {}).pln : null) || {}, na = N[gm.id] || N[{ svmask: 'sv', svdisk: 'sv', swisle: 'sw', swcrown: 'sw', zadlc: 'za' }[gm.id]];
    if (na) return `<section class="box encbox"><h2>Où le trouver <small class="cnt">${esc(gm.s)}</small></h2><p class="encna">${esc(na)}</p><p class="note">Pas de lieu de capture dans ce jeu ; méthode d’obtention selon <a href="https://www.pokepedia.fr" target="_blank" rel="noopener">Poképédia</a> (CC BY-NC-SA 3.0 FR).</p></section>`; }
  const src = f.en ? f : (f.enOf && sp.f[f.enOf]) || f;
  const rows = (src.en && src.en[gm.id]) || [];
  let body;
  if (!rows.length && !gm.enc) { // v34: recent games (Poképédia only): say how to get it instead of « PokéAPI ne fournit aucune donnée »
    const k = Object.keys(sp.f).find(x => sp.f[x] === f), p = BY_KEY[k] || BY_KEY[String(sp.id)];
    const pre = evoGraph().filter(x => (x.t === k || x.t === String(sp.id)) && BY_KEY[x.f] && BY_KEY[x.f].id !== sp.id && inGame(BY_KEY[x.f], GIDX[gm.id])).map(x => BY_KEY[x.f].n);
    const how = p && p.mb ? `Méga-Évolution de ${(BY_KEY[p.mb] || {}).n || 'sa forme de base'} (avec sa Méga-Gemme)` : p && p.bo ? `Changement de forme de ${(BY_KEY[p.bo] || {}).n || 'sa forme de base'}` : pre.length ? `Faire évoluer ${[...new Set(pre)].join(' ou ')}` : 'Lieu non renseigné pour ce jeu (cadeau, échange, événement, raid ou rencontre unique possibles).';
    return `<section class="box encbox"><h2>Où le trouver <small class="cnt">${esc(gm.s)}</small></h2><p class="encna">${esc(how)}</p><p class="note">Aucun lieu de capture répertorié par <a href="https://www.pokepedia.fr" target="_blank" rel="noopener">Poképédia</a> pour ce Pokémon dans ce jeu.</p></section>`;
  }
  if (!rows.length) body = `<p class="note">${gm.enc ? 'Aucune rencontre sauvage répertoriée par PokéAPI pour ce Pokémon dans ce jeu (il peut s’obtenir par évolution, œuf, cadeau, échange ou autre moyen, ou la donnée est absente).' : 'PokéAPI ne fournit aucune donnée de rencontres pour ce jeu (les apparitions dans la nature ne sont pas répertoriées).'}</p>`;
  else {
    const by = new Map();
    for (const r of rows) { if (!by.has(r[0])) by.set(r[0], []); by.get(r[0]).push(r); }
    const L = shared.loc;
    const verName = id => (gm.ver.find(v => v[0] === id) || [0, ''])[1];
    const list = [...by].sort((a, b) => L.a[a[0]].localeCompare(L.a[b[0]], 'fr')).map(([a, rs]) => `<div class="enc"><b>${esc(L.a[a])}</b>` + rs.map(r => {
      const conds = r[5] ? r[5].map(c => L.c[c]) : [];
      const vs = r[6] ? [verName(r[6][0]) && r[6].map(verName).join(' / ')] : [];
      return `<div class="ms">${esc(L.m[r[1]])} · Niv. ${r[2] === r[3] ? r[2] : r[2] + '–' + r[3]} · ${r[4]} %${conds.length ? ' · ' + esc(conds.join(', ')) : ''}${vs[0] ? ' · ' + esc(vs[0]) : ''}</div>`;
    }).join('') + '</div>').join('');
    body = `<details${by.size <= 8 ? ' open' : ''}><summary>${by.size} lieu${by.size > 1 ? 'x' : ''}</summary>${list}</details>` +
      '<p class="note">Pourcentage = probabilité par rencontre selon PokéAPI (peut être incomplet).</p>';
  }
  return `<section class="box"><h2>Où le trouver <small class="cnt">${esc(gm.s)}</small></h2>${body}</section>`;
}

/* evolutions */
function evoGraph() {
  if (EVO_ADJ) return EVO_ADJ;
  EVO_ADJ = DET.shared.evo.map(([f, t, d, o]) => ({ f, t, d, o }));
  return EVO_ADJ;
}
function pickDetails(d, order) {
  const cand = d.filter(x => x.v <= order); const best = {};
  for (const x of cand) if (!(x.g in best) || x.v > best[x.g]) best[x.g] = x.v;
  return cand.filter(x => x.v === best[x.g]);
}
function goEdgeLines(o) {
  const lines = [o, ...(o.alt || [])].map(x => {
    const p = [];
    if (x.c !== undefined) p.push(`${x.c} bonbons`);
    if (x.i) p.push(x.ic ? `${x.ic} × ${x.i}` : x.i);
    if (x.km) p.push(`compagnon : marcher ${x.km} km`);
    if (x.mb) p.push('doit être le compagnon');
    if (x.l) p.push(`près d’un ${x.l}`);
    if (x.dn) p.push(x.dn === 'jour' ? 'de jour' : x.dn === 'nuit' ? 'de nuit' : 'au crépuscule');
    if (x.fm) p.push('pleine lune'); if (x.ud) p.push('console à l’envers');
    if (x.g) p.push((x.g === 'mâle' ? 'mâle' : 'femelle') + ' uniquement');
    if (x.mv) p.push(`connaît ${x.mv}`);
    if (x.q) p.push(x.q);
    if (x.nt) p.push('gratuit si échangé');
    return p.join(', ');
  });
  return lines;
}
function evoHTML(p, f, mode, gm) {
  const order = mode === 'go' ? 0 : gm ? gm.evo : 1e9, gen = gm ? gm.g : 9;
  const edges = [];
  for (const e of evoGraph()) {
    const a = BY_KEY[e.f], b = BY_KEY[e.t]; if (!a || !b) continue;
    if (mode === 'go') { if (!e.o) continue; edges.push({ ...e, lines: goEdgeLines(e.o) }); continue; }
    if (a.g > gen || b.g > gen) continue;
    const sel = pickDetails(e.d, order); if (!sel.length) continue;
    edges.push({ ...e, lines: sel.map(x => x.x.join(', ')) });
  }
  const out = {}, inn = {};
  edges.forEach(e => { (out[e.f] ||= []).push(e); (inn[e.t] ||= []).push(e); });
  let start = p.k;
  if (!out[start] && !inn[start]) start = String(p.id);
  let note = '';
  if (mode === 'go' && goTemp(p)) note = `${p.c === 'primal' ? 'Primo-Résurgence' : 'Méga-Évolution'} dans Pokémon GO : transformation temporaire de la forme de base avec de l’énergie (${p.c === 'primal' ? 'Énergie Primo' : 'Méga-énergie'}).`;
  else if (mode === 'go' && p.c === 'gmax') note = `Gigamax dans Pokémon GO : capturé en Combat Max ; ne peut pas être envoyé vers HOME${p.id === 25 || p.id === 52 ? ' et ne peut pas évoluer' : ''}.`;
  else if (p.c === 'mega') note = 'Méga-Évolution : hors Légendes Z-A (X / Y, Rubis Oméga / Saphir Alpha, Soleil / Lune, Ultra-Soleil / Ultra-Lune, Let’s Go), variante de combat qui suit la forme de base. En Légendes Z-A : marquez la Méga-Gemme ici. Capturé / shiny = forme de base capturée (ou shiny) dans la sauvegarde Z-A <b>et</b> gemme obtenue. Transfert HOME : manuel, sauf si la gemme est cochée — transférer la base transfère aussi cette Méga.';
  else if (p.c === 'primal') note = 'Forme obtenue par Régression primale (Orbe) depuis la forme de base.';
  else if (p.c === 'gmax' && !p.bo) note = 'Forme Gigamax : à capturer / marquer séparément (le facteur Gigamax ne se trouve pas à l’état sauvage autrement).';
  else if (p.c === 'gmax' && p.bo) note = 'Forme Éternamax : variante de combat – suit la forme de base.';
  if (!out[start] && !inn[start]) return note ? `<p class="note">${note}</p>` : `<p class="note">${mode === 'go' ? 'Pas d’évolution dans Pokémon GO.' : 'Ne possède pas d’évolution.'}</p>`;
  const comp = new Set([start]); const stack = [start];
  while (stack.length) { const k = stack.pop(); for (const e of [...(out[k] || []), ...(inn[k] || [])]) for (const n of [e.f, e.t]) if (!comp.has(n)) { comp.add(n); stack.push(n); } }
  const roots = [...comp].filter(k => !inn[k]);
  const seen = new Set();
  const node = (k, label) => {
    const q = BY_KEY[k]; const cur = k === start;
    const me = `<a class="evpk${cur ? ' cur' : ''}" href="#/p/${q.k}"><img src="${artOf(q)}" alt="" loading="lazy" width="72" height="72"><span>${esc(q.n)}</span><small>#${pad(q.id)}</small></a>`;
    if (seen.has(k)) return `<div class="evrow">${me}</div>`;
    seen.add(k);
    const kids = (out[k] || []).map(e => `<div class="evrow"><div class="evlink">${e.lines.map(l => `<div>${esc(cap(l))}</div>`).join('') || ''}</div>${node(e.t)}</div>`).join('');
    return kids ? `<div class="evrow">${me}<div class="evbranch">${kids}</div></div>` : `<div class="evrow">${me}</div>`;
  };
  return (note ? `<p class="note">${note}</p>` : '') + `<div class="evo">${roots.map(r => node(r)).join('')}</div>`;
}

/* Pokémon GO */
const frDate = s => s.split('-').reverse().join('/');
// v32: GO extras — max CP at level 40 (CPM 0.7903), PvP rankings (PvPoke), evolution candy of this form
const goCp = (d, L) => { const cpm = { 40: 0.7903, 50: 0.8403, 51: 0.8453 }[L]; return Math.max(10, Math.floor((d.a + 15) * Math.sqrt(d.d + 15) * Math.sqrt(d.s + 15) * cpm * cpm / 10)); };
function pvpHTML(p, go) {
  const P = go.pvp; if (!P) return '';
  const r = P.r[p.k] || (p.c === 'sex' ? P.r[String(p.id)] : null);
  const L = [['g', 'Ligue Super', '≤ 1 500 PC'], ['u', 'Ligue Hyper', '≤ 2 500 PC'], ['m', 'Ligue Master', 'sans limite']];
  const cell = (i, lab, cap, k) => { const v = r && r[i], vs = r && r[i + 3]; return `<div class="pvpc${v && v <= 100 ? ' top' : ''}"><b>${v ? '#' + v : '—'}</b><span>${lab}<small>${cap}</small></span>${vs ? `<small class="pvsh">Obscur : #${vs}</small>` : ''}</div>`; };
  return `<section class="box pvpbox"><h2>Combats GO (PvP) <small class="cnt">classement</small></h2>
    <div class="kv kv3 pvp">${L.map(([k, lab, cap], i) => cell(i, lab, cap, k)).join('')}</div>
    <p class="note">${r ? `Rang dans le classement général <a href="https://pvpoke.com/rankings/" target="_blank" rel="noopener">PvPoke</a> de chaque ligue (sur ${P.n.g} / ${P.n.u} / ${P.n.m} Pokémon classés ; en vert : top 100). « — » : pas classé dans cette ligue.` : 'Pas classé par PvPoke (pas assez performant, pas encore sorti ou forme absente du classement).'} Mis à jour le ${frDate(P.date)}.</p></section>`;
}
// v32: Ditto (Métamorph) — Pokémon it can be disguised as in GO (build/go-ditto.json, cited sources)
function ditHTML(d) {
  const D = d && d.dit; if (!D) return '';
  const chip = id => { const q = BY_KEY[String(id)]; return q ? `<a class="fchip" href="#/p/${q.k}" title="${esc(q.n)}"><img src="${artOf(q)}" alt="" loading="lazy" width="36" height="36"><span>${esc(q.n)}</span></a>` : ''; };
  const grp = (l, ids, cls) => `<p class="ditl${cls}">${esc(l)} <small class="mute">· ${ids.length}</small></p><div class="fchips ditc">${ids.map(chip).join('')}</div>`;
  return `<section class="box ditbox"><h2>Déguisements <small class="cnt">${D.cur.ids.length} actuels</small></h2>
    <p class="note">Dans Pokémon GO, Métamorph n’apparaît jamais sous sa propre forme : il se cache sous l’apparence d’une de ces espèces sauvages (révélé à la capture).</p>
    <h3 class="dith">Actuels</h3>${grp(D.cur.l, D.cur.ids, '')}
    <details class="ditpast"><summary>Anciens déguisements (${D.past.length} périodes)</summary>${D.past.map(x => grp(x.l, x.ids, ' old')).join('')}</details>
    <p class="note">Sources : ${D.src.map(([n, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(n)}</a>`).join(' · ')}. Liste vérifiée le ${frDate(D.chk)} ; les événements peuvent la changer temporairement.</p></section>`;
}
function goCandyHTML(p) {
  let out = evoGraph().filter(e => e.f === p.k && e.o && BY_KEY[e.t]);
  if (!out.length && p.c === 'form') out = evoGraph().filter(e => e.f === String(p.id) && e.o && BY_KEY[e.t]); // v34: Mordudor Forme Marche (the only one in GO) evolves like the base
  if (!out.length) return '';
  const grp = new Map(); // same cost → one line (Évoli: 25 bonbons → 8 évolutions)
  for (const e of out) { const o = e.o, c = [o.c !== undefined ? o.c + ' bonbons' : '', o.i ? (o.ic ? o.ic + ' × ' + o.i : o.i) : ''].filter(Boolean).join(' + ') || '?'; /* v34: Mordudor = 999 Pièces, no candy */ if (!grp.has(c)) grp.set(c, { names: [], nt: false }); grp.get(c).names.push(BY_KEY[e.t].n); grp.get(c).nt ||= !!o.nt; }
  return `<li>Bonbons d’évolution : ${[...grp].map(([c, g]) => `<b>${esc(c)}</b> → ${esc(g.names.join(', '))}${g.nt ? ' <span class="mute">(gratuit après un échange)</span>' : ''}`).join(' · ')}</li>`;
}
function goHTML(p, f, sp, shared, go) {
  const d = f.go;
  const moveRowGo = (key, fast, elite) => {
    const m = go.moves[key]; if (!m) return '';
    const [fr, type, power, energy, dur] = m; const s = dur / 1000;
    const dps = s ? (power / s) : 0, eps = s ? energy / s : 0;
    return `<div class="mv"><span class="lv"></span><span class="mn"><b>${esc(fr)}${elite ? ' †' : ''}</b> ${badge(type)}</span><span class="ms">Puis. ${power} · ${fast ? 'Énergie +' : 'Énergie −'}${energy} · ${dec(s.toFixed(1))} s · DPS ${dec(dps.toFixed(1))}${fast ? ` · EPS ${dec(eps.toFixed(1))}` : ''}</span></div>`;
  };
  const PM = go.pvm && go.pvm.m || {};
  const moveRowPvp = (key, fast, elite) => { // v55: PvP (combats de dresseurs) — PvPoke
    const m = go.moves[key], v = PM[key]; if (!m) return '';
    const st = !v ? 'Pas de donnée PvP' : fast ? `Dégâts ${v[0]} · Énergie +${v[1]} · ${v[2]} tour${v[2] > 1 ? 's' : ''} · DPT ${dec((v[0] / v[2]).toFixed(1))} · EPT ${dec((v[1] / v[2]).toFixed(1))}`
      : `Dégâts ${v[0]} · Énergie −${v[1]} · DPE ${dec((v[0] / v[1]).toFixed(2))}`;
    return `<div class="mv"><span class="lv"></span><span class="mn"><b>${esc(m[0])}${elite ? ' †' : ''}</b> ${badge(m[1])}</span><span class="ms">${st}</span></div>`;
  };
  const rows = (fn, ks, fast, el) => (ks || []).map(k => fn(k, fast, el)).join('');
  const both = fn => [rows(fn, d.fm, true, false) + rows(fn, d.fe, true, true), rows(fn, d.cm, false, false) + rows(fn, d.ce, false, true)];
  const [fm, cm] = both(moveRowGo), [fp, cp] = both(moveRowPvp);
  const rs = go.pvm && go.pvm.ms && (go.pvm.ms[p.k] || (p.c === 'sex' ? go.pvm.ms[String(p.id)] : null));
  const mvn = k => esc(go.moves[k]?.[0] || k);
  const rec = rs ? `<h3 class="mvh">Moveset recommandé</h3><ul class="plain gol pvrec">${[['g', 'Ligue Super'], ['u', 'Ligue Hyper'], ['m', 'Ligue Master']].filter(([l]) => rs[l]).map(([l, n]) => `<li><b>${n}</b> : ${mvn(rs[l][0])} + ${rs[l].slice(1).map(mvn).join(' / ')}</li>`).join('')}</ul>` : '';
  // v58: raid v2 (moveset le plus souvent n° 1, lignes par type, météo, capacités « + ») et Combats Max v1 — data/raid-moves.json v2
  const isEl = k => (d.fe || []).includes(k) || (d.ce || []).includes(k), mve = k => mvn(k) + (isEl(k) ? ' †' : '');
  const RD = go.rdm && go.rdm.v === 2 ? go.rdm : null, rr = RD && (RD.r[p.k] || (p.c === 'sex' ? RD.r[String(p.id)] : null));
  const ms2 = m => esc(m[0]) + ' + ' + esc(m[1]);
  const WXN = { sunny: '☀️ Ensoleillé', rainy: '🌧️ Pluvieux', partly: '⛅ Partiellement nuageux', cloudy: '☁️ Nuageux', windy: '💨 Venteux', snow: '❄️ Neige', fog: '🌫️ Brouillard' };
  const rLine = (lab, e) => `<li><b>${lab}</b> : ${ms2(e.m)} <span class="mute">(n° 1 contre ${e.w} des ${e.n} boss où il est utile)</span>${e.a ? `<br><span class="mute">≈ ${ms2(e.a)} : presque aussi bon</span>` : ''}</li>`;
  const rTypes = e => e.l ? `<h3 class="mvh">Selon le boss</h3><ul class="plain gol pvrec rdty">${e.l.map(([t, fx, cx, b]) => `<li>${badge(t)} ${ms2([fx, cx])} <span class="mute">(${b.length} boss : ${esc(b.slice(0, 6).join(', '))}${b.length > 6 ? '…' : ''})</span></li>`).join('')}</ul>` : '';
  const rWx = e => { const it = Object.entries(e.x || {}).map(([w, [up, dn, n1, ms]]) => { const pt = [n1 ? `n° 1 contre ${n1} boss` : '', up >= dn + 5 ? `mieux classé contre ${up} boss` : '', ms ? `préférez ${esc(ms)}` : ''].filter(Boolean); return pt.length ? `<li>${WXN[w]} : ${pt.join(', ')}</li>` : ''; }).join('');
    return it ? `<details class="rdwx"><summary>Selon la météo (bonus ×1,2)</summary><ul class="plain gol">${it}</ul></details>` : ''; };
  const rrec = !RD || d.nost ? '' : `<h3 class="mvh">Moveset recommandé</h3><ul class="plain gol pvrec rdrec">${rr && rr.n ? rLine('Principal', rr.n) : '<li class="mute">Peu utile contre les boss de raid testés</li>'}${rr && rr.o ? rLine('Obscur', rr.o) : ''}</ul>${rr && rr.n ? rTypes(rr.n) + (rr.n.p ? `<p class="note">Au niveau Méga super max (attaque + ×1,3), préférez <b>${esc(rr.n.p)}</b>.</p>` : '') + rWx(rr.n) : ''}`;
  const MX = RD && RD.mx && RD.mx[p.k], ROLE = { A: 'Attaquant', T: 'Tank', H: 'Soigneur' };
  const mxrec = MX ? `<h3 class="mvh">Moveset recommandé</h3><ul class="plain gol pvrec mxrec">${'ATH'.split('').map(r => { const [f, c, n] = MX[r]; return `<li><b>${ROLE[r]}</b> : ${n ? `${f.map(mve).join(' / ')} + ${c.map(mve).join(' / ')} <span class="mute">(parmi les 5 meilleurs contre ${n} des ${RD.mxb} boss)</span>` : '<span class="mute">peu utile dans ce rôle</span>'}</li>`; }).join('')}</ul>
        <p class="note">Le plus souvent le meilleur contre les ${RD.mxb} boss Dynamax et Gigamax testés où ce Pokémon est utile (niveau 40, Gardomax et Régémax niveau 3, sans esquive). Tank : jauge Max, tenue et bouclier ; soigneur : soins et survie. En combat Max, l’attaque rapide remplit la jauge ; son type donne celui de l’attaque Max.</p>` : '';
  const mvMode0 = store.get('gomvmode', 'raid'), mvMode = mvMode0 === 'pvp' ? 'pvp' : mvMode0 === 'max' && MX ? 'max' : 'raid';
  const shadow = d.shm && go.moves[d.shm] ? `<p class="note">Obscur : ${esc(go.moves[d.shm][0])} · Purifié : ${esc(go.moves[d.pum]?.[0] || '—')}</p>` : '';
  const sh = d.nosh ? 'Non disponible (pas de shiny pour ce Gigamax pour l’instant)' : d.shf && TODAY < d.shf ? `Pas encore (à partir du ${frDate(d.shf)})` : d.sh ? (d.sh.length ? `Oui (${d.sh.map(s => ({ wild: 'sauvage', raid: 'raid', egg: 'œuf', evolution: 'évolution', research: 'recherche', photobomb: 'photobomb', alola: 'forme d’Alola', mega: 'Méga-Évolution d’un Pokémon shiny', max: 'Combats Max' }[s] || s)).join(', ')})` : 'Oui') : (p.c ? 'Non vérifié pour cette forme' : 'Non disponible');
  const types = d.t;
  const effB = `<section class="box"><h2>Faiblesses &amp; résistances <small class="cnt">GO</small></h2>${effHTML(types, 'go', DATA.charts[6])}${d.nost ? '' : '\n      <p class="note">Multiplicateurs de Pokémon GO (×1,6 par faiblesse, ×0,625 par résistance ; une immunité des jeux principaux compte comme une double résistance).</p>'}</section>`;
  // v43: GO blocks returned separately, placed by renderDetail in the chosen sheet order
  return {
    stats: d.nost ? `
    <section class="box gostats"><h2>Statistiques GO <small class="cnt">${esc(p.c ? p.n : '')}</small></h2><p class="note">Statistiques GO de cette Méga pas encore dans nos données (sortie récente) : elles apparaîtront à la prochaine mise à jour GO. Attaques ci-dessous = celles de la forme de base.</p></section>` : `
    <section class="box gostats"><h2>Statistiques GO <small class="cnt">${esc(p.c ? p.n : '')}</small></h2>
      <div class="kv kv3"><div><b>${d.a}</b><span>Attaque</span></div><div><b>${d.d}</b><span>Défense</span></div><div><b>${d.s}</b><span>Endurance</span></div></div>
      <div class="kv kv3 cpmax"><div><b>${fmt(goCp(d, 40))}</b><span>PC max niv. 40</span></div><div><b>${fmt(d.m50)}</b><span>PC max niv. 50</span></div><div><b>${fmt(d.m51)}</b><span>niv. 51 (meilleur compagnon)</span></div></div>
      <p class="note">PC max avec IV 15/15/15 = formule officielle avec le multiplicateur de PC du niveau (vérifiée : Mewtwo 4 724 au niv. 50). Niveau 40 : maximum avant les Bonbons L.</p></section>`,
    pvp: d.nost ? '' : pvpHTML(p, go),
    eff: effB,
    candy: goCandyHTML(p),
    dispo: `
    <section class="box goinfo godispo${d.rgf ? ' nofold' : ''}"><h2>Disponibilité</h2>
      <ul class="plain gol">
        <li>Statut : <b>${goRel(d) ? 'disponible dans Pokémon GO' : d.rf ? `annoncé pour le ${frDate(d.rf)}` : 'pas encore sorti'}</b>${p.c === 'gmax' ? ' · Gigamax : capturé en Combat Max, ne peut pas être envoyé vers HOME' : goTemp(p) ? ` · ${p.c === 'primal' ? 'Primo-Résurgence' : 'Méga-Évolution'} temporaire (énergie), enregistrée au Pokédex GO à la première transformation` : ''}</li>
        ${d.rg ? `<li class="rgl">🌍 Exclusivité régionale : <b>${esc(d.rg)}</b>${d.rgm ? ' <span class="mute">(migrateur : échange parfois sa zone avec son pendant)</span>' : ''}</li>` : ''}
        ${d.fco ? `<li class="rgl">✂️ Obtention : <b>${esc(d.fco)}</b></li>` : ''}
        ${d.rgf ? d.rgf.map(([n, z]) => `<li class="rgl">🌍 ${esc(n)} : <b>${esc(z)}</b></li>`).join('') : ''}
        ${d.fch ? `<li class="rgl">✂️ ${esc(d.fch)}</li>` : ''}
        ${!d.fch || d.rg ? goTradeLi(p) : ''}${d.fch && d.rgf?.some(([, z]) => !/partout/.test(z)) ? `<li class="trl"><span class="trk">⇄</span> Échange requis (coupes régionales) : <b>échange hors de la région (hors événements)</b></li>` : ''}
        ${d.eg ? `<li>Éclosion d’œuf (pool actuel) : <b>${d.eg.map(e => e[0] + ' km' + ({ as: ' (récompense Aventure Synchro)', ga: ' (cadeau d’ami)', gr: ' (cadeau de route)' }[e[1]] || '')).join(', ')}</b></li>` : ''}
      </ul>
      <p class="note">Exclusivités régionales : liste vérifiée manuellement à chaque version de l’app ; des événements peuvent les rendre disponibles ailleurs temporairement. Œufs : seul le pool de la saison actuelle est connu${go.egg ? ` (${esc(go.egg.season)}, au ${go.egg.upd.split('-').reverse().join('/')}, source Leek Duck)` : ''} ; un Pokémon sans distance indiquée n’est pas dans ce pool (ou la donnée manque).</p></section>`,
    shiny: `
    <section class="box shinybox goshiny"><h2>✨ Shiny <small class="cnt">GO</small></h2><ul class="plain gol"><li>Shiny : <b>${sh}</b></li></ul></section>`,
    moves: `
    <section class="box gomoves mv-${mvMode}"><h2>Attaques</h2>
      <div class="seg mvseg" role="tablist"><button type="button" data-mvm="raid" aria-pressed="${mvMode === 'raid'}">Raids &amp; arènes</button>${MX ? `<button type="button" data-mvm="max" aria-pressed="${mvMode === 'max'}">Combats Max</button>` : ''}<button type="button" data-mvm="pvp" aria-pressed="${mvMode === 'pvp'}">Combats (PvP)</button></div>
      <div class="mvraid"><h3 class="mvh">Attaques rapides</h3><div class="mvs">${fm || '<p class="note">—</p>'}</div><h3 class="mvh">Attaques chargées</h3><div class="mvs">${cm || '<p class="note">—</p>'}</div>
${rrec}
        <p class="note">DPS = puissance ÷ durée.${RD && !d.nost ? ` Moveset recommandé : celui qui est le plus souvent le meilleur contre les ${RD.nb} boss de raid testés où ce Pokémon est utile (au moins 60 % du meilleur ; dégâts par seconde pondérés par la survie, niveau 40, sans météo ni esquive). ≈ : presque aussi bon (2 victoires d’écart ou moins).` : ''}</p></div>
      ${MX ? `<div class="mvmax">${mxrec}</div>` : ''}
      <div class="mvpvp"><h3 class="mvh">Attaques rapides</h3><div class="mvs">${fp || '<p class="note">—</p>'}</div><h3 class="mvh">Attaques chargées</h3><div class="mvs">${cp || '<p class="note">—</p>'}</div>${rec}
        <p class="note">1 tour = 0,5 s. DPT = dégâts par tour, EPT = énergie par tour, DPE = dégâts par point d’énergie. Moveset recommandé : classement PvPoke « overall »${go.pvm ? ` (au ${go.pvm.date.split('-').reverse().join('/')})` : ''}.</p></div>
      ${shadow}<p class="note">† : attaque exclusive (disponible via événement / MT élite).</p></section>`,
    comp: `
    <section class="box goinfo gocomp"><h2>Compagnon &amp; bonbons</h2>
      <ul class="plain gol">
        ${d.bd ? `<li>Distance compagnon : <b>${dec(d.bd)} km</b> par bonbon</li>` : ''}
        ${d.th ? `<li>Seconde attaque chargée : <b>${fmt(d.th[0])}</b> poussières d’étoiles + <b>${d.th[1]}</b> bonbons</li>` : ''}
        ${!d.bd && !d.th ? '<li>Pas de données de compagnon pour cette forme.</li>' : ''}
      </ul></section>`,
    dit: ditHTML(d)
  };
}
// v43: GO costumes block, placeholder until the costume data is added
function costumesHTML(title) { return `<section class="box costbox"><h2>${title}</h2><p class="note">En chantier.</p></section>`; }

function renderDetail() {
  const { p, sp, f, shared } = DET;
  const mode = state.dgame; // 'all' | 'home' | 'go' | game id
  const gm = GAME_BY[mode]; const isGo = mode === 'go';
  const gen = gm ? gm.g : 9;
  const key = ik(p);
  const types = isGo && f.go ? f.go.t : gm ? pickGen(f.pt, gen, f.t) : f.t;
  const c1 = TYPE_COLORS[types[0]], c2 = TYPE_COLORS[types[1] || types[0]];
  const flags = [p.lg && 'Légendaire', p.my && 'Fabuleux', isUB(p) && 'Ultra-Chimère', p.ba && 'Bébé', `Gén. ${GEN_LABELS[p.g]}`].filter(Boolean);
  const games = availGames(f);
  const goOk = goRel(f.go);
  const opts = sheetGameOpts(p, sp, games, goOk, mode);
  const ap = showFemArt && p.fe ? femP(p) : p, gimg = spriteMode === 'off' ? `img/${ap.k}.webp` : artOf(ap), simg = `img/s/${ap.k}.webp`; // v35: HOME by default
  const regional = gm ? dexNumbers(sp, gm.id) : '';
  // v43: sheet order chosen per view; description, tracking and forms are placed in the template below
  // v55: one order for every view — identity (hero, taille, suivi, collection, formes) → statut / présence (P) → stats, faiblesses, talents (S)
  // → capture, reproduction, évolutions (C) → attaques (M) → cartes Pocket, descriptions et divers (D). Large blocks fold (applyFolds).
  let N = '', P = '', S = '', C = '', M = '', D = '', desc = '', size = ''; // v56: N = right after Formes (Évolutions, then Où le trouver)
  if (isGo && f.go && DET.go) {
    const g = goHTML(p, f, sp, shared, DET.go);
    desc = flavorHTML(sp, null, f);
    P = g.dispo + g.shiny; S = g.stats + g.eff;
    N = `<section class="box"><h2>Évolutions <small class="cnt">GO</small></h2>${evoHTML(p, f, 'go', null)}${g.candy ? `<ul class="plain gol">${g.candy}</ul>` : ''}<p class="note">Coûts en bonbons et conditions issus des données GO communautaires.</p></section>`; C = g.comp + g.dit;
    M = g.moves + g.pvp; D = costumesHTML('Costumes');
  } else {
    const sArr = gm ? pickGen(f.ps, gen, f.s) : f.s;
    const gen1 = gm && gen === 1;
    const chart = chartFor(gm ? gen : 9);
    const mode2 = 'main';
    const abE = abilityEff(f, gm, shared.ref, types, chart); // v31
    const goBox = goOk ? `<section class="box gobox"><h2>Pokémon GO</h2><p class="gol1">Disponible dans Pokémon GO${f.go.m50 ? ` · PC max niv. 50 : <b>${fmt(f.go.m50)}</b>` : ''}${f.go.bd ? ` · compagnon : <b>${dec(f.go.bd)} km</b>` : ''}</p><p><a href="#" class="golink" data-game="go">Voir les données Pokémon GO →</a></p></section>` : '';
    const E = etyHTML(sp);
    desc = flavorHTML(sp, gm, f);
    size = `<section class="box sizebox"><div class="kv"><div><b>${dec(f.h)} m</b><span>Taille</span></div><div><b>${dec(f.w)} kg</b><span>Poids</span></div></div></section>`;
    const regB = regional ? `<section class="box"><h2>Pokédex régional</h2><p class="rn-line">${regional}</p></section>` : '';
    const statsB = `<section class="box"><h2>Statistiques de base${gm ? ` <small class="cnt">${esc(gm.s)}</small>` : ''}</h2>${statsHTML(sArr, gen1)}
      <p class="note">${gm ? (gen1 ? 'Génération I : une seule stat Spécial. ' : '') + `Stats telles qu’en génération ${['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'][gen]} (PokéAPI).` : 'Stats actuelles (dernière génération). Choisissez un jeu pour voir les stats de son époque.'}</p></section>`;
    const effB = `<section class="box"><h2>Faiblesses &amp; résistances${gm ? ` <small class="cnt">${esc(gm.s)}</small>` : ''}</h2>
      <div id="eff">${effHTML(types, mode2, chart, abE)}</div>${abE ? abE.html : ''}
      <p class="note" id="effnote">${effNote(mode2, gm)}</p></section>`;
    const abB = (() => { const ab = abilitiesHTML(f, gm, shared.ref); return typeof ab === 'string' ? `<section class="box"><h2>Talents</h2>${ab}</section>` : `<section class="box"><h2>Talents <span class="cntb" title="${ab.n} talent${ab.n > 1 ? 's' : ''}">${ab.n}</span></h2>${ab.body}</section>`; })();
    const evoB = `<section class="box"><h2>Évolutions${gm ? ` <small class="cnt">${esc(gm.s)}</small>` : ''}</h2>${evoHTML(p, f, 'game', gm)}
      <p class="note">Conditions issues de PokéAPI${gm ? ' pour l’époque de ce jeu' : ' (dernière version)'} ; les Pokémon trop récents pour la génération choisie sont masqués. Les coûts en bonbons GO sont dans l’onglet Pokémon GO.</p></section>`;
    S = statsB + effB + abB;
    if (gm) { P = tradeBoxHTML(p, gm.id) + regB; N = evoB + encHTML(f, sp, gm, shared); C = heldHTML(f, gm, shared.ref) + shinyHTML(p, gm) + breedHTML(p, sp, gm); M = movesHTML(f, sp, gm, shared); D = E.ev; }
    else if (mode === 'home') { P = homeDexHTML(p) + homeSrcHTML(p, f, 'Compatibilité') + homeShinyHTML(p, f); N = evoB; }
    else { P = availHTML(sp, games, horsGames(p, sp).filter(g => !games.includes(g))) + homeSrcHTML(p, f) + goBox; N = evoB; C = breedHTML(p, sp, gm); D = E.ety + E.ev + costumesHTML('Costumes GO'); } // « Présent dans »: overview only
  }
  $('#detail-view').innerHTML = navHTML(p, `<div class="gamebar dgbar"><label for="dgame">Jeu</label><select id="dgame" aria-label="Jeu">${opts}</select></div>`) + `
  <div class="detail">
    <div class="hero${sizeClass(p) ? ' ' + sizeClass(p) : ''}" style="--c1:${c1};--c2:${c2}">
      <div class="num">#${pad(p.id)}${p.c === 'sex' || p.l === 'Mâle' ? ' · ' + esc(p.l) : ''}</div>
      ${cryBtns(p)}
      <img id="heroimg" src="${showShinyArt && ap.sh ? simg : gimg}" alt="${esc(p.n)}${showFemArt && p.fe ? ' femelle' : ''}" width="256" height="256">
      ${spriteBtns(p)}
      ${p.sh ? `<button id="shbtn" class="shart" type="button" aria-pressed="${showShinyArt}" title="Afficher l’illustration shiny">✨ ${showShinyArt ? 'Normal' : 'Shiny'}</button>` : ''}
      ${p.fe ? `<button id="febtn" class="shart feart" type="button" aria-pressed="${showFemArt}" title="${showFemArt ? 'Afficher le mâle' : 'Afficher la femelle (différence d’apparence)'}">${showFemArt ? '♂ Mâle' : '♀ Femelle'}</button>` : ''}
      <h1>${esc(fullN(p))}</h1>
      ${namesHTML(p, sp)}
      <div class="badges">${types.map(t => `<a class="badge" href="#" data-type="${t}">${esc(TYPE_FR[t])}</a>`).join('')}</div>
      <div class="tags">${flags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
    </div>
    ${size}
    ${baseNoteHTML(p)}
    <section class="box trackbox"><div class="trackinfo" id="trackinfo">${trackHTML(p)}</div></section>
    <div id="mycol">${myColHTML(p)}</div>
    ${formSwitcher(p, gm)}
    ${N}${P}${S}${C}${M}
    <div id="mypocket"></div>
    ${desc ? `<section class="box descbox"><h2>Pokédex${gm ? ` <small class="cnt">${esc(gm.s)}</small>` : ''}</h2>${desc}</section>` : ''}
    ${D}
    <p class="note disclaimer">Les données proviennent de PokéAPI, de Poképédia (CC BY-NC-SA 3.0 FR) et de sources communautaires : elles peuvent contenir des erreurs ou différer des jeux. Les données Pokémon GO sont communautaires et non officielles.</p>
  </div>`;
  setBarH(); initSheetGameMenu(); applyFolds(); pkSheet(p); setSprite(spriteMode, true); // v35: HOME (default) or the mode chosen on this sheet
}
// hero names: French (h1) → genus · English → Japanese · romaji
function namesHTML(p, sp) {
  const l1 = [sp && sp.gn, p.en].filter(Boolean).map((t, i, a) => (sp && sp.gn && i === 0) ? `<span class="gn">${esc(t)}</span>` : `<span lang="en" class="en">${esc(t)}</span>`).join(' · ');
  const l2 = p.ja ? `<span lang="ja" class="ja">${esc(p.ja)}</span>${p.ro ? ` · <span class="ro">${esc(p.ro)}</span>` : ''}` : '';
  return `<div class="genus">${l1}</div>${l2 ? `<div class="jname">${l2}</div>` : ''}`;
}
// v55: GO moves Raid / PvP toggle, remembered (localStorage « gomvmode »)
document.addEventListener('click', e => { const b = e.target.closest('.mvseg [data-mvm]'); if (!b) return; const m = b.dataset.mvm; store.set('gomvmode', m);
  for (const s of document.querySelectorAll('.gomoves')) { const mm = m === 'max' && !s.querySelector('[data-mvm=max]') ? 'raid' : m; s.classList.toggle('mv-pvp', mm === 'pvp'); s.classList.toggle('mv-max', mm === 'max'); s.classList.toggle('mv-raid', mm === 'raid'); s.querySelectorAll('[data-mvm]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.mvm === m))); } });
// v55: large sheet blocks fold to a compact view (« Voir plus » / « Réduire »), state remembered per block title (localStorage « folds »: title → 1 = open)
const FOLD_H = 420;
const foldKey = sec => { const h = sec.querySelector('h2'); if (!h) return ''; const c = h.cloneNode(true); c.querySelectorAll('small,.cntb').forEach(x => x.remove()); return c.textContent.replace(/\s+/g, ' ').trim(); };
function applyFolds() {
  const O = store.get('folds', {});
  for (const sec of document.querySelectorAll('#detail-view .detail section.box:not(.trackbox):not(.foldok):not(#formesbox):not(.nofold)')) {
    const k = foldKey(sec); if (!k) continue;
    if (sec.scrollHeight <= FOLD_H + 80) continue; // short enough: no fold
    sec.classList.add('foldok', 'fold'); sec.dataset.fold = k; sec.classList.toggle('open', !!O[k]);
    const b = document.createElement('button'); b.type = 'button'; b.className = 'foldbtn'; b.setAttribute('aria-expanded', String(!!O[k])); b.textContent = O[k] ? 'Réduire ▲' : 'Voir plus ▼';
    b.onclick = () => { const on = !sec.classList.contains('open'), S = store.get('folds', {}); sec.classList.toggle('open', on); if (on) S[k] = 1; else delete S[k]; store.set('folds', S);
      b.textContent = on ? 'Réduire ▲' : 'Voir plus ▼'; b.setAttribute('aria-expanded', String(on)); if (!on) { const t = sec.getBoundingClientRect().top; if (t < 0) window.scrollBy(0, t - 70); } };
    sec.appendChild(b);
  }
}
function renderDetailKeepScroll() { const y = window.scrollY; renderDetail(); window.scrollTo(0, y); }
function homeSrcHTML(p, f, title = 'Transferts vers HOME') {
  if (p.bo) return ''; // battle-only variant: shown through the base form
  const av = homeAvailF(p, f), t = HOME_C.get(p.k) || [], sh = HOME_S.get(p.k) || [];
  if (!av.length) return '';
  const gav = av.filter(isGoldMark);
  return `<section class="box"><h2>${title} <small class="cnt">${gav.filter(m => t.includes(m)).length} / ${gav.length}</small></h2>` +
    `<p class="note" style="margin:0 0 6px">Une marque d’origine par jeu (et ses extensions) · ${homeIcon(true, HOME_C_T)} toutes les marques Switch + GO (les anciens jeux sont affichés mais ne comptent pas)${homeComplete(p, av) ? ' (complet)' : ''}. Pour cocher : « Pokémon HOME » ou le jeu dans le sélecteur.</p>` +
    `<ul class="plain homerows">${av.map(m => `<li class="${t.includes(m) ? 'on' : ''}">${omIcon(m)} ${esc(omName(m))} — ${t.includes(m) ? 'transféré' : 'pas transféré'}${isGoldMark(m) ? '' : ' <span class="mute">(ancien jeu, hors dorure)</span>'}${sh.includes(m) ? ' · ✨ shiny' : ''}</li>`).join('')}</ul></section>`;
}
// v47: HOME sheet, info-only blocks (no effect on marks / completion).
// « Dex national HOME » (after Formes): national nº, the species' HOME forms (no Megas / Primo / Gigamax / battle-only variants: not stored in HOME)
// with ✅ = at least one origin mark (HOME_C) / ⬜ = none, ✨ = shiny mark in HOME.
const homeForms = p => (FORMS[p.id] || [p]).filter(q => !q.bo && !['mega', 'primal', 'gmax'].includes(q.c) && (homeAvail(q).length || HOME_C.has(q.k)));
function homeDexHTML(p) {
  if (p.bo) return '';
  const L = homeForms(p); if (!L.length) return '';
  const done = L.filter(q => HOME_C.has(q.k)).length;
  const rows = L.map(q => { const on = HOME_C.has(q.k); return `<li class="${on ? 'on' : ''}${q.k === p.k ? ' cur' : ''}"><a href="#/p/${q.k}">${on ? '✅' : '⬜'} <span>${esc(L.length > 1 ? formLabel(q) : fullN(q))}</span></a>${HOME_S.has(q.k) ? ' · ✨ shiny' : ''}${q.k === p.k && L.length > 1 ? ' <span class="mute">(cette fiche)</span>' : ''}</li>`; }).join('');
  return `<section class="box" id="homedexbox"><h2>Dex national HOME <small class="cnt">#${pad(p.id)}</small></h2>` +
    `<p class="hdx1">N° national <b>#${pad(p.id)}</b> · <b>${L.length}</b> forme${L.length > 1 ? 's' : ''} dans HOME · <b>${done}</b> / ${L.length} enregistrée${done > 1 ? 's' : ''}</p>` +
    `<ul class="plain homerows hdxl">${rows}</ul><p class="note">Information seulement, sans effet sur les marques ni la complétion. ✅ = au moins une marque d’origine cochée dans « Pokémon HOME ». Méga-Évolutions, Gigamax et variantes de combat ne sont pas des formes stockées dans HOME.</p></section>`;
}
// « Shiny » (after Compatibilité): per HOME origin mark, can this form be caught shiny in one of its games (data/shiny.json, same status as the
// game sheets; GO = GO shiny data) → brought shiny to HOME. No mark possible = shiny lock everywhere (e.g. Zarude). Events are not counted.
function homeShinyHTML(p, f) {
  const S = DET.shiny; if (p.bo || !S) return '';
  const av = homeAvailF(p, f); if (!av.length) return '';
  const where = new Set(f.av || []), out = [];
  for (const m of av) {
    let st;
    if (m === 'go') { const d = f.go; st = !d || !goRel(d) ? null : d.nosh || !d.sh ? { k: 'no', t: d.sh === undefined && p.c ? 'non vérifié pour cette forme' : 'pas de shiny dans GO' } : d.shf && TODAY < d.shf ? { k: 'no', t: `pas encore (à partir du ${frDate(d.shf)})` } : { k: 'ok', t: 'shiny disponible dans GO' }; }
    else {
      const R = ORI[m].games.filter(g => where.has(g) && GAME_BY[g] && S.m[g]).map(g => ({ g, s: shinyStatus(p, GAME_BY[g], S) }));
      const ok = R.filter(r => r.s.cls === 'ok' || r.s.cls === 'part'), lock = R.filter(r => r.s.lock);
      st = !R.length ? null : ok.length ? { k: 'ok', t: `peut être shiny dans ${ok.map(r => GAME_BY[r.g].s).join(', ')}` } : lock.length ? { k: 'lock', t: `shiny lock dans ${lock.map(r => GAME_BY[r.g].s).join(', ')}` } : { k: 'no', t: 'pas de shiny dans ces jeux' };
    }
    if (st) out.push({ m, ...st });
  }
  if (!out.length) return '';
  const ok = out.filter(o => o.k === 'ok'), lockAll = !ok.length && out.some(o => o.k === 'lock'), mine = HOME_SH.has(p.k);
  const head = ok.length
    ? `<div class="shst ok"><span class="ic" aria-hidden="true">✔</span><span><b>Peut être ramené shiny dans HOME</b> depuis ${ok.map(o => `${omIcon(o.m)} ${esc(ORI[o.m].n)}`).join(' · ')}.</span></div>`
    : `<div class="shst lock"><span class="ic" aria-hidden="true">🔒</span><span>${lockAll ? '<span class="shlock">SHINY LOCK</span>' : ''}<b>${esc(fullN(p))} : impossible à obtenir shiny</b> dans les jeux compatibles HOME.</span></div>`;
  return `<section class="box shinybox" id="homeshbox"><h2>✨ Shiny <small class="cnt">HOME</small></h2>${head}` +
    `<ul class="plain homerows">${out.map(o => `<li class="${o.k === 'ok' ? 'on' : ''}">${omIcon(o.m)} ${esc(ORI[o.m].n)} — ${o.k === 'lock' ? '🔒 ' : ''}${esc(o.t)}</li>`).join('')}</ul>` +
    `<p class="note">Votre marque : ${mine ? '✨ shiny dans HOME' : 'pas marqué shiny dans HOME'}. Information seulement, sans effet sur la complétion. Selon les données shiny de chaque jeu (Poképédia, Bulbapedia) et de Pokémon GO ; les distributions événementielles ne sont pas comptées.</p></section>`;
}
function availHTML(sp, games, hors = []) {
  if (!games.length && !hors.length) return '';
  const rows = games.map(g => { const n = dexNumbers(sp, g); return `<li><a href="#" data-game="${g}">${gdot(g)}<span>${esc(GAME_BY[g].n)}</span></a>${n ? ` <span class="mute">${n}</span>` : ''}</li>`; }).join('');
  const hrows = hors.map(g => `<li><a href="#" data-game="${g}">${gdot(g)}<span>${esc(GAME_BY[g].n)}</span></a> <span class="mute">hors dex</span></li>`).join('');
  return `<section class="box"><h2>Présent dans <small class="cnt">${games.length} jeux</small></h2><ul class="plain avl">${rows}</ul>${hors.length ? `<h3 class="h3">Hors Pokédex régional <small class="cnt">${hors.length}</small></h3><ul class="plain avl">${hrows}</ul>` : ''}<p class="note">Selon les Pokédex régionaux (PokéAPI). « Hors dex » : obtenable par transfert, échange ou événement sans figurer dans le Pokédex régional (marques possibles, sans effet sur la complétion). Touchez un jeu pour voir ses données.</p></section>`;
}
function effNote(mode, gm) {
  return mode === 'go'
    ? 'Multiplicateurs de Pokémon GO (×1,6 par faiblesse, ×0,625 par résistance ; une immunité des jeux principaux compte comme une double résistance).'
    : `Multiplicateurs des jeux principaux (×2, ×½, immunités ×0)${gm ? ` — table des types de la génération ${['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'][gm.g]}, types du jeu.` : ' — table des types actuelle (pour GO, choisissez Pokémon GO dans le sélecteur de jeu).'}`;
}
async function changeGame(g) {
  if (VDEX[g]) g = VDEX[g].game; // v30: « Hors dex » list / Méga-Dex entry of the sheet menu → its game
  state.dgame = g;
  if (g === 'go') { try { DET.go = await loadGo(); } catch { toast('Données GO indisponibles hors-ligne : ouvrez-les une fois avec une connexion.', 'err', 6500); state.dgame = 'all'; } }
  pickGame(state.dgame); sheetPref = state.dgame;
  renderDetail();
}
document.addEventListener('change', e => { if (e.target.id === 'dgame') { dgameRefocus = !!(MENUS.dgame && document.activeElement === MENUS.dgame.btn); changeGame(e.target.value); } });

document.addEventListener('click', e => {
  const t = e.target.closest('[data-type]');
  if (t) { // filter list by this type
    e.preventDefault();
    state.types = [t.dataset.type]; state.q = ''; $('#q').value = '';
    listScroll = 0; render(); location.hash = '#/';
    return;
  }
  const dg = e.target.closest('[data-game]');
  if (dg) { e.preventDefault(); changeGame(dg.dataset.game); window.scrollTo(0, 0); return; }
  const mt = e.target.closest('[data-mtab]');
  if (mt) { movesTab = mt.dataset.mtab; renderDetailKeepScroll(); return; }
  const cb = e.target.closest('.cry[data-cry]'); if (cb) { playCry(cb.dataset.cry, cb); return; }
  const sb = e.target.closest('#shbtn');
  if (sb) { showShinyArt = !showShinyArt; renderDetailKeepScroll(); return; }
  if (e.target.closest('#febtn')) { showFemArt = !showFemArt; renderDetailKeepScroll(); return; } // v44c: female image
  if (e.target.closest('#allforms')) { const p = DET && DET.p, c = sheetCtx(); if (!p || !c) return; for (const q of allFormsList(p, c)) if (!isCaught(q, c)) toggleMark(q, 'caught', c); refreshTrack(p); render(); return; }
  const slb = e.target.closest('#actbar .salg[data-sal]');
  if (slb) { const p = DET && DET.p; if (!p || !isSal(p) || slb.disabled) return; toggleSal(slb.dataset.sal, sheetCtx()); refreshTrack(p); render(); return; } // v44: Gigamax Aigüe / Grave
  const cgb = e.target.closest('#actbar .cg'), shb = e.target.closest('#actbar .sh');
  if (shb && DET && isSal(DET.p) && !shb.disabled) { const c = sheetCtx(); if (c === 'go' && DET.f && !goShinyOk(DET.f.go)) return; toggleSalShiny(c); refreshTrack(DET.p); render(); return; }
  if (cgb || shb) {
    const p = DET && DET.p; if (!p || (cgb || shb).disabled) return;
    if (cgb && sheetCtx() === 'go' && goTemp(p) && goMegaOn(p)) { CAUGHT_G.delete('go:' + p.k); SHINY_G.delete('go:' + p.k); MEGA_ENERGY.delete(energyId(p)); saveTrack(); } // v37c: untick clears both old marks
    else toggleMark(p, cgb ? 'caught' : 'shiny', sheetCtx()); refreshTrack(p); render();
    return;
  }
  const gemb = e.target.closest('#actbar .gem[data-mega]');
  if (gemb) {
    const p = DET && DET.p, m = BY_KEY[gemb.dataset.mega], c = sheetCtx(); if (!p || !m || !m.mb || gemb.disabled || !megaInGame(m, c)) return;
    toggleGem(m, c); refreshTrack(p); render(); // immediate: buttons, Mega capture/transfer state, counters
    return;
  }
  const hgb = e.target.closest('#actbar .hgmx[data-hgmax]');
  if (hgb) { const p = DET && DET.p, g = BY_KEY[hgb.dataset.hgmax]; if (!p || !g || hgb.disabled || sheetCtx() !== 'home') return; if (hgb.dataset.hsal) toggleSalHome(hgb.dataset.hsal); else toggleHomeGmax(g, mp(p, 'home')); refreshTrack(p); render(); return; } // v47: HOME base sheet ↔ HOME mark of the Gigamax sheet
  const gxb = e.target.closest('#actbar .gmx[data-gmax]');
  if (gxb) { const p = DET && DET.p, g = BY_KEY[gxb.dataset.gmax], c = sheetCtx(); if (!p || !g || gxb.disabled || !gmaxInGame(g, c)) return; if (gxb.dataset.sal) toggleSal(gxb.dataset.sal, c); else toggleMark(g, 'caught', c, p); refreshTrack(p); render(); return; } // base sheet ↔ Gigamax sheet (ticks this form)
  const dmb = e.target.closest('#actbar .dmx[data-dmax]');
  if (dmb) { const p = DET && DET.p; if (!p || p.k !== dmb.dataset.dmax || sheetCtx() !== 'go') return; // v38: Dynamax ⇒ caught in GO (unticking leaves Capturé)
    if (DYNAMAX.has(p.k)) DYNAMAX.delete(p.k); else { DYNAMAX.add(p.k); if (!CAUGHT_G.has(gkey('go', p))) toggleMark(p, 'caught', 'go'); } saveTrack(); refreshTrack(p); render(); return; }
  const enb = e.target.closest('#actbar .energy');
  if (enb) { const p = DET && DET.p, m = BY_KEY[enb.dataset.energy]; if (!p || !m || !goTemp(m) || enb.disabled || sheetCtx() !== 'go') return; toggleEnergy(m); refreshTrack(p); render(); return; }
  const bab = e.target.closest('#actbar .baron, #actbar .barons');
  if (bab) { const p = DET && DET.p, c = sheetCtx(); if (!p || bab.disabled || !c) return; const sh = bab.classList.contains('barons'); if (c === 'home') toggleHomeBaron(p, sh); else toggleBaron(p, sh, c); refreshTrack(p); render(); return; }
  const hsl = e.target.closest('#actbar .hsalg[data-hsal], #actbar .hsalsh[data-hsal]');
  if (hsl) { const p = DET && DET.p; if (!p || !isSal(p) || hsl.disabled || sheetCtx() !== 'home') return; if (hsl.classList.contains('hsalsh')) toggleSalHomeShiny(hsl.dataset.hsal); else toggleSalHome(hsl.dataset.hsal); refreshTrack(p); render(); return; } // v47: Salarsen Gigamax HOME sheet
  const hsb = e.target.closest('#actbar .hsh');
  if (hsb) { const p = DET && DET.p; if (!p || hsb.disabled || sheetCtx() !== 'home') return; toggleHomeShiny(p); refreshTrack(p); render(); return; }
  const orb = e.target.closest('#actbar .ori[data-origin]');
  if (orb) { const p = DET && DET.p; if (!p || orb.disabled || sheetCtx() !== 'home') return; toggleHomeOrigin(p, orb.dataset.origin); refreshTrack(p); render(); return; }
  const lgb = e.target.closest('#trackinfo .lg');
  if (lgb) { const p = DET && DET.p; if (!p) return; CAUGHT.delete(ik(p)); SHINY.delete(ik(p)); store.set('caught', [...CAUGHT]); store.set('shiny', [...SHINY]); refreshTrack(p); render(); return; }
  const trb = e.target.closest('#actbar .tr');
  if (trb) { const p = DET && DET.p; if (!p || trb.disabled) return; toggleTransfer(p, false, sheetCtx()); refreshTrack(p); render(); return; }
  const f = e.target.closest('.dnav .fav');
  if (f) {
    const p = DET && DET.p; if (!p) return; const key = ik(p);
    FAVS.has(key) ? FAVS.delete(key) : FAVS.add(key);
    store.set('favs', [...FAVS]);
    f.setAttribute('aria-pressed', FAVS.has(key)); f.textContent = FAVS.has(key) ? '★' : '☆';
    render();
  }
});

/* ---------------- offline / PWA ---------------- */
function registerSW() {
  if (!('serviceWorker' in navigator)) { $('#offline').textContent = ''; return; }
  navigator.serviceWorker.register('sw.js').then(reg => { swWatch(reg); return navigator.serviceWorker.ready; }).then(() => {
    const metered = navigator.connection && (navigator.connection.saveData || navigator.connection.type === 'cellular');
    notesAfterUpdate();
    swDataVersion().then(() => showOffline()); // v34: the offline pack flag is only valid for the data cache it filled
    if (!store.get('imgsDoneF', false) && !metered) cacheImages();
    else showOffline();
  }).catch(() => {});
}
// v30: in-app update prompt. A new sw.js installs in the background and WAITS; the banner asks, the tap activates it,
// and the page reloads once on controllerchange (only after that tap: first install / claim never reloads or shows the banner).
// Checks: app start (register), return to the app (visibilitychange — iPhone home-screen PWA), every 30 min.
let SW_REG = null, SW_ASKED = false, SW_RELOADING = false, SW_SHOWN = null;
function swAsk(w, type = 'VERSION') { // version + notes of the waiting worker (MessageChannel), null if it does not answer. v46: type 'NOTES' = its notes.json
  return new Promise(res => { const t = setTimeout(() => res(null), 2000); try { const ch = new MessageChannel(); ch.port1.onmessage = e => { clearTimeout(t); res(e.data); }; w.postMessage({ type }, [ch.port2]); } catch { clearTimeout(t); res(null); } });
}
function updPos() { const u = $('#upd'); if (!u) return; const b = $('#actbar'), fixed = b && b.getClientRects().length && getComputedStyle(b).position === 'fixed' && !$('#detail-view').hidden; u.style.bottom = fixed ? `calc(${b.offsetHeight + 12}px + env(safe-area-inset-bottom))` : ''; }
async function swOffer(w) {
  if (!navigator.serviceWorker.controller || !w || SW_SHOWN === w) return; // first install: nothing to replace
  SW_SHOWN = w;
  const info = await swAsk(w) || {};
  if (info.v && sessionStorage.getItem('updLater') === info.v) return; // « Plus tard » for this version: ask again next session
  let u = $('#upd');
  if (!u) { u = document.createElement('div'); u.id = 'upd'; u.setAttribute('role', 'status'); u.setAttribute('aria-live', 'polite'); document.body.appendChild(u); }
  u.className = 'toast ok upd';
  u.innerHTML = `<span class="ti" aria-hidden="true">↻</span><span class="tm"><b>Nouvelle version disponible</b>${info.v || info.notes ? `<small>${info.v ? esc(info.v) + (info.notes ? ' · ' : '') : ''}${info.notes ? 'Nouveautés : ' + esc(info.notes) : ''}</small>` : ''}<button type="button" class="link updnotes">Voir les notes de version</button></span><button type="button" class="updgo">Mettre à jour</button><button type="button" class="updx" aria-label="Plus tard">×</button>`;
  u.querySelector('.updgo').onclick = e => { SW_ASKED = true; e.currentTarget.disabled = true; e.currentTarget.textContent = 'Mise à jour…'; w.postMessage({ type: 'SKIP_WAITING' }); setTimeout(() => { if (!SW_RELOADING) { SW_RELOADING = true; location.reload(); } }, 6000); };
  u.querySelector('.updnotes').onclick = async () => { const n = await swAsk(w, 'NOTES'); notesShow(Array.isArray(n) ? n : null, info.v); }; // v46: notes of the NEW version (its own cache), else the current list
  u.querySelector('.updx').onclick = () => { u.classList.remove('on'); if (info.v) sessionStorage.setItem('updLater', info.v); };
  updPos(); requestAnimationFrame(() => u.classList.add('on'));
}
function swWatch(reg) {
  SW_REG = reg;
  if (reg.waiting) swOffer(reg.waiting);
  reg.addEventListener('updatefound', () => { const w = reg.installing; if (w) w.addEventListener('statechange', () => { if (w.state === 'installed') swOffer(reg.waiting || w); }); });
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!SW_ASKED || SW_RELOADING) return; SW_RELOADING = true; location.reload(); });
  setInterval(swCheck, 30 * 60 * 1000);
}
function swCheck() { if (SW_REG && navigator.onLine !== false) SW_REG.update().then(() => { if (SW_REG.waiting) swOffer(SW_REG.waiting); }).catch(() => {}); }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') swCheck(); });
addEventListener('hashchange', () => setTimeout(updPos, 120));
// v45: list jump buttons ⬆︎ / ⬇︎ (bottom-right, above the iPhone home indicator / rounded corners). Shown once the list is scrolled a bit;
// ⬆︎ hidden at the top, ⬇︎ hidden once the last entry is in view. Cards use content-visibility:auto (estimated heights) → the ⬇︎ jump re-aims
// at the last card for a few frames until it really sits at the bottom of the screen.
const JUMP_IC = d => `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="${d ? 'M12 5v13M6 12l6 6 6-6' : 'M12 19V6M6 12l6-6 6 6'}" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
function jumpEls() {
  let w = $('#jump'); if (w) return w;
  w = document.createElement('div'); w.id = 'jump'; w.className = 'jump';
  w.innerHTML = `<button id="jumpup" type="button" aria-label="Remonter en haut de la liste" title="Haut de la liste">${JUMP_IC(0)}</button><button id="jumpdn" type="button" aria-label="Descendre en bas de la liste" title="Bas de la liste">${JUMP_IC(1)}</button>`;
  document.body.appendChild(w);
  $('#jumpup').addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'instant' }); updJump(); });
  $('#jumpdn').addEventListener('click', jumpBottom);
  return w;
}
const lastCard = () => { const c = $('#results').lastElementChild; return c && c.classList.contains('card') ? c : null; };
function lastTarget() { const c = lastCard(); if (!c) return null; const r = c.getBoundingClientRect(); return Math.max(0, Math.round(scrollY + r.bottom - innerHeight + 12)); }
function jumpBottom() {
  let n = 0;
  const go = () => { const t = lastTarget(); if (t === null) return; if (Math.abs(scrollY - t) > 1) window.scrollTo({ top: t, behavior: 'instant' }); if (++n < 8) requestAnimationFrame(go); else updJump(); };
  go();
}
function updJump() {
  const w = jumpEls(), lv = $('#list-view'), c = lastCard();
  const on = !lv.hidden && !!c && document.documentElement.scrollHeight > innerHeight * 2;
  const top = scrollY < 240, atEnd = !c || c.getBoundingClientRect().bottom <= innerHeight + 4;
  $('#jumpup').classList.toggle('show', on && !top);
  $('#jumpdn').classList.toggle('show', on && !top && !atEnd);
}
{ let raf = 0; const q = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; updJump(); }); };
  addEventListener('scroll', q, { passive: true }); addEventListener('resize', q); addEventListener('hashchange', () => setTimeout(updJump, 60)); }
let caching = false;
// v34: « packDone2 » stores the DATA_VERSION whose cache was filled (old value true = unknown). A new DATA_VERSION empties the data cache
// (sw.js activate) → the ✓ disappears and the download button comes back. DATA_DV = version reported by the active service worker.
let DATA_DV = null;
async function swDataVersion() { const c = navigator.serviceWorker && navigator.serviceWorker.controller; if (!c) return null; const r = await swAsk(c); DATA_DV = (r && r.dv) || null; return DATA_DV; }
const packOk = () => { const v = store.get('packDone2', false); return !!v && DATA_DV !== null && v === DATA_DV; };
function showOffline(msg) {
  const imgs = store.get('imgsDoneF', false), pack = packOk();
  $('#offline').innerHTML = msg || [
    imgs ? '<p style="margin:0">✓ Images des Pokémon et de leurs formes enregistrées pour le hors-ligne.</p>' : '<p style="margin:0"><button id="dl">Télécharger les images des Pokémon et de leurs formes (~17 Mo, images HOME)</button></p>',
    pack ? '<p>✓ Formes, fiches détaillées, jeux et Pokémon GO disponibles hors-ligne.</p>' : '<p><button id="dl2">Télécharger les formes et toutes les fiches (~35 Mo)</button></p>',
    '<p class="note">Les illustrations shiny ne sont enregistrées que lorsque vous les ouvrez.</p>'
  ].join('');
  const b = $('#dl'); if (b) b.onclick = cacheImages;
  const b2 = $('#dl2'); if (b2) b2.onclick = cachePack;
}
async function runPool(urls, n, label) {
  let done = 0, fail = 0; const q = urls.slice();
  const next = async () => {
    while (q.length) {
      const u = q.shift();
      try { const r = await fetch(u); if (!r.ok) throw 0; await r.arrayBuffer(); } catch { fail++; }
      if (++done % 25 === 0) showOffline(`<p style="margin:0">${label} : ${done}/${urls.length}…</p>`);
    }
  };
  await Promise.all(Array.from({ length: n }, next));
  return fail;
}
async function cacheImages() {
  if (caching) return; caching = true;
  const fail = await runPool([...new Set(E.map(artOf))], 4, 'Téléchargement des images');
  caching = false;
  if (!fail) store.set('imgsDoneF', true);
  showOffline();
}
async function cachePack() {
  if (caching) return; caching = true;
  const urls = [...E.filter(p => p.c).map(artOf), ...E.filter(p => p.hh).map(p => `img/${p.k}.webp`), ...E.filter(p => p.fe).flatMap(p => [artOf(femP(p)), `img/${p.fe.k}.webp`]), ...Array.from({ length: 1025 }, (_, i) => `data/sp/${i + 1}.json`),
    'data/evo.json', 'data/moves.json', 'data/ref.json', 'data/shiny.json', 'data/desc.json', 'data/go.json', 'data/pvp.json', 'data/pvp-moves.json', 'data/rank-pvp.json', 'data/rank-raid.json', 'data/rank-max.json', 'data/raid-moves.json', 'data/tm.json', 'data/loc.json', 'data/mega-energy.json', 'data/pocket.json', ...GAMES.map(g => `data/dex/${g.id}.json`), ...Object.values(VDEX).filter(v => v.file).map(v => `data/dex/${v.file}.json`)];
  const fail = await runPool(urls, 5, 'Téléchargement des formes et fiches');
  caching = false;
  if (!fail) { await swDataVersion().catch(() => null); store.set('packDone2', DATA_DV || false); }
  showOffline();
}
// v46: « Notes de version » (notes.json, newest first) = sub-panel of the ☰ menu; also opened from the update banner and once after an update.
const NOTE_MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const noteDate = d => { const [y, m, j] = String(d).split('-').map(Number); return y && m && j ? `${j} ${NOTE_MOIS[m - 1]} ${y}` : ''; };
let NOTES_DATA = null;
async function loadNotes() { if (!NOTES_DATA) try { const r = await fetch('notes.json'); if (r.ok) NOTES_DATA = await r.json(); } catch {} return NOTES_DATA; }
function renderNotes(list, hi) {
  const el = $('#mnotes');
  if (!Array.isArray(list) || !list.length) { el.innerHTML = '<p class="note">Notes indisponibles pour le moment (connexion nécessaire la première fois).</p>'; return; }
  el.innerHTML = list.map(n => `<section class="msec nv${n.v === hi ? ' cur' : ''}"><h3><span class="nvv">${esc(n.v)}</span>${n.v === hi ? '<span class="nvnew">Nouveau</span>' : ''}<span class="nvd">${esc(noteDate(n.d))}</span></h3><ul>${(n.l || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul></section>`).join('');
}
async function menuNotes(on, list, hi) {
  if (!$('#mnotes')) return;
  $('#mmain').hidden = on; $('#mnotes').hidden = !on; $('#menuprev').hidden = !on; $('#menutitle').textContent = on ? 'Notes de version' : 'Menu';
  if (on) { renderNotes(list || await loadNotes(), hi); $('#menu').scrollTop = 0; $('#menuprev').focus({ preventScroll: true }); }
}
function notesShow(list, hi) { menuOpen(true); menuNotes(true, list, hi); }
async function notesAfterUpdate() { // once per new version: « vXX installée · Voir les notes »
  const c = navigator.serviceWorker && navigator.serviceWorker.controller, w = c || (SW_REG && SW_REG.active); if (!w) return;
  const r = await swAsk(w); if (!r || !r.v) return;
  const seen = store.get('seenV', null); store.set('seenV', r.v);
  if (!c || seen === r.v) return; // first install: nothing new to announce
  toast(`Version ${r.v} installée.`, 'ok', 9000);
  const t = $('#toast .tm'); if (!t) return;
  const b = document.createElement('button'); b.type = 'button'; b.className = 'link tnotes'; b.textContent = 'Voir les notes de version';
  b.onclick = () => { $('#toast').classList.remove('on'); notesShow(null, r.v); }; t.appendChild(b);
}
// v45: ☰ menu (top bar, list view): offline pack, export / import, legend, version. Closes on ✕, outside tap, Escape, navigation.
function menuOpen(on) {
  const m = $('#menu'), bk = $('#menuback'), b = $('#menubtn'); if (!m || m.hidden === !on) return;
  m.hidden = bk.hidden = !on; b.setAttribute('aria-expanded', on);
  if (on) { menuNotes(false); menuVersion(); $('#menux').focus({ preventScroll: true }); } else if (document.activeElement && m.contains(document.activeElement)) b.focus({ preventScroll: true });
}
// v46: « 🐞 Signaler un bug / proposer une idée » = mailto: with version, current view / sheet and device, rebuilt on menu open and on tap (synchronous, so iOS Safari opens Mail)
const BUG_TO = 'pokedexsigjouea@gmail.com';
let APP_VER = null;
function bugMail() {
  const v = APP_VER && APP_VER.v, dv = APP_VER && APP_VER.dv;
  const sheet = !$('#detail-view').hidden && DET && DET.p ? `${fullN(DET.p)} #${pad(DET.p.id)} (${DET.p.k})` : 'aucune';
  const vd = state.vdex && VDEX[state.vdex];
  const view = [vd ? vd.s : trackName() || 'Tous les jeux', state.view === 'grid' ? 'grille' : 'liste', state.forms ? 'formes affichées' : 'formes masquées', state.q ? `recherche « ${state.q} »` : ''].filter(Boolean).join(' · ');
  const sc = window.screen || {}, inst = (matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  const body = [
    'Décris le problème ou ton idée :', '', '', '',
    'Si c’est un bug, comment le reproduire :', '', '', '',
    '———— Infos ajoutées automatiquement ————',
    `Version : ${v || 'inconnue'} · données ${dv || '—'}`,
    `Vue : ${view}`,
    `Fiche : ${sheet}`,
    `Écran : ${sc.width || '?'}×${sc.height || '?'} (×${window.devicePixelRatio || 1}) · fenêtre ${innerWidth}×${innerHeight} · appli installée : ${inst ? 'oui' : 'non'}`,
    `Appareil : ${navigator.userAgent}`,
  ].join('\r\n');
  const subject = `Pokédex${v ? ' ' + v : ''} – bug ou idée`;
  return `mailto:${BUG_TO}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
function bugHref() { const a = $('#bugbtn'); if (a) try { a.href = bugMail(); } catch { a.href = 'mailto:' + BUG_TO; } }
async function menuVersion() {
  const el = $('#appver'); if (!el) return;
  bugHref();
  const w = navigator.serviceWorker && (navigator.serviceWorker.controller || (SW_REG && SW_REG.active));
  const r = w ? await swAsk(w) : null;
  if (r && r.v) { APP_VER = r; bugHref(); }
  el.textContent = r && r.v ? `Application ${r.v} · données ${r.dv || '—'}` : 'Version inconnue (application pas encore installée)';
}
(() => {
  const b = $('#menubtn'); if (!b) return;
  b.addEventListener('click', () => menuOpen($('#menu').hidden));
  $('#menux').addEventListener('click', () => menuOpen(false));
  $('#notesbtn').addEventListener('click', () => menuNotes(true));
  $('#menuprev').addEventListener('click', () => { menuNotes(false); $('#notesbtn').focus({ preventScroll: true }); });
  $('#menuback').addEventListener('click', () => menuOpen(false));
  $('#bugbtn').addEventListener('click', bugHref); // default navigation follows with the fresh href
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#menu').hidden) { e.preventDefault(); if (!$('#mnotes').hidden) { menuNotes(false); $('#notesbtn').focus({ preventScroll: true }); } else menuOpen(false); } }); // v46: Escape in the notes = back to the menu
  addEventListener('hashchange', () => menuOpen(false));
})();
boot();

// Mouse wheel scrolls the type chips horizontally when they overflow
(() => {
  const c = document.getElementById('typechips');
  if (!c) return;
  c.addEventListener('wheel', e => {
    if (c.scrollWidth > c.clientWidth && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      c.scrollLeft += e.deltaY; e.preventDefault();
    }
  }, { passive: false });
})();

/* ---------------- backup / restore (captures, shiny, favoris) ---------------- */
(() => {
  const ex = document.getElementById('export'), im = document.getElementById('import');
  if (!ex || !im) return;
  ex.addEventListener('click', () => {
    const data = { sal_h47: 1, favs: [...FAVS], caught: [...CAUGHT], shiny: [...SHINY], caught_g: [...CAUGHT_G], shiny_g: [...SHINY_G], home_g: [...TRANS_G], homeshiny_g: [...STRANS_G], home_o: [...HOME_O], home_og: [...HOME_OG], home_sh: [...HOME_SH], baron_g: [...BARON_G], barons_g: [...BARONS_G], home_b: [...HOME_B], home_bs: [...HOME_BS], mega_gems: [...MEGA_GEMS], mega_energy: [...MEGA_ENERGY], go_dynamax: [...DYNAMAX], collection: COLL, pocket: PKQ };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
    const l = document.createElement('a'); l.href = url; l.download = 'pokedex-sauvegarde.json'; l.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  im.addEventListener('change', async () => {
    try {
      const d = JSON.parse(await im.files[0].text());
      const ids = x => Array.isArray(x) ? x.filter(validId) : [];
      ids(d.favs).forEach(n => FAVS.add(n)); ids(d.caught).forEach(n => CAUGHT.add(n)); ids(d.shiny).forEach(n => SHINY.add(n));
      const mk = x => Array.isArray(x) ? x.filter(markValid) : [];
      mk(d.caught_g).forEach(n => CAUGHT_G.add(n)); mk(d.shiny_g).forEach(n => { SHINY_G.add(n); CAUGHT_G.add(n); });
      const mt = x => Array.isArray(x) ? x.filter(transValid) : [];
      mt(d.home_g).forEach(n => { TRANS_G.add(n); CAUGHT_G.add(n); }); mt(d.homeshiny_g).forEach(n => { STRANS_G.add(n); TRANS_G.add(n); CAUGHT_G.add(n); SHINY_G.add(n); });
      // v22 origin marks; an older backup (home_g only) is converted game → origin mark (set from a game)
      const kOk = k => !!(BY_KEY[k] || FEM_OF[k] || k === SAL_G); // v44c: old female keys are migrated after the import
      const om = x => Array.isArray(x) ? x.filter(v => typeof v === 'string' && ORI[v.slice(0, v.indexOf(':'))] && kOk(v.slice(v.indexOf(':') + 1))) : [];
      if (Array.isArray(d.home_sh)) d.home_sh.filter(k => typeof k === 'string' && kOk(k)).forEach(k => HOME_SH.add(k)); else mt(d.homeshiny_g).forEach(n => HOME_SH.add(n.slice(n.indexOf(':') + 1)));
      mk(d.baron_g).forEach(n => { BARON_G.add(n); CAUGHT_G.add(n); }); mk(d.barons_g).forEach(n => { BARONS_G.add(n); BARON_G.add(n); SHINY_G.add(n); CAUGHT_G.add(n); }); // v25
      const fk = x => Array.isArray(x) ? x.filter(k => typeof k === 'string' && kOk(k)) : [];
      fk(d.home_b).forEach(k => HOME_B.add(k)); fk(d.home_bs).forEach(k => HOME_BS.add(k));
      if (Array.isArray(d.home_o)) { om(d.home_o).forEach(n => HOME_O.add(n)); om(d.home_og).forEach(n => { if (HOME_O.has(n)) HOME_OG.add(n); }); }
      else [...mt(d.home_g), ...mt(d.homeshiny_g)].forEach(n => { const i = n.indexOf(':'), m = originOf(n.slice(0, i)); if (m) { HOME_O.add(m + n.slice(i)); HOME_OG.add(m + n.slice(i)); } });
      if (Array.isArray(d.mega_gems)) d.mega_gems.filter(x => typeof x === 'string').map(x => x.includes(':') ? x : 'za:' + x).filter(x => { const i = x.indexOf(':'), k = x.slice(i + 1); return GAME_BY[x.slice(0, i)] && BY_KEY[k] && BY_KEY[k].mb; }).forEach(x => MEGA_GEMS.add(x));
      if (Array.isArray(d.mega_energy)) d.mega_energy.map(String).filter(k => /^\d+(-[xyz])?$/.test(k)).forEach(k => MEGA_ENERGY.add(k));
      if (Array.isArray(d.go_dynamax)) d.go_dynamax.map(String).filter(kOk).forEach(k => DYNAMAX.add(k)); store.set('go_dynamax', [...DYNAMAX]);
      if (d.pocket && typeof d.pocket === 'object') pkMerge(d.pocket); // v50: Pocket copies, max per language (old format = array of ids)
      if (Array.isArray(d.collection)) colImport(d.collection); // v49: older backups have no collection → nothing changes
      migrateEnergy(); migrateMarks(); rebuildHome(); if (!d.sal_h47) migrateSalHome(true); store.set('mega_energy', [...MEGA_ENERGY]);
      store.set('favs', [...FAVS]); store.set('caught', [...CAUGHT]); store.set('shiny', [...SHINY]); store.set('caught_g', [...CAUGHT_G]); store.set('shiny_g', [...SHINY_G]); store.set('home_g', [...TRANS_G]); store.set('homeshiny_g', [...STRANS_G]); store.set('home_o', [...HOME_O]); store.set('home_og', [...HOME_OG]); store.set('mega_gems', [...MEGA_GEMS]);
      render(); toast('Sauvegarde importée.');
    } catch { toast('Fichier invalide : ce n’est pas une sauvegarde du Pokédex.', 'err', 6500); }
    im.value = '';
  });
})();

/* ---------------- v24: Jeux menu (custom accessible listbox; the native #game <select> stays as the hidden source of truth) ---------------- */
// Console families (double separator when it changes) and representative colours (one or two versions; a game and its expansions share them)
const CONSOLE_OF = { frlgsw: 'Switch', zadlc: 'Switch', za: 'Switch', svdisk: 'Switch', svmask: 'Switch', sv: 'Switch', la: 'Switch', bdsp: 'Switch', swcrown: 'Switch', swisle: 'Switch', sw: 'Switch', lgpe: 'Switch',
  usum: '3DS', sm: '3DS', oras: '3DS', xy: '3DS', b2w2: 'DS', bw: 'DS', hgss: 'DS', pt: 'DS', dp: 'DS', e: 'Game Boy Advance', frlg: 'Game Boy Advance', rs: 'Game Boy Advance', c: 'Game Boy / Color', gs: 'Game Boy / Color', y: 'Game Boy / Color', rb: 'Game Boy / Color' };
const GAME_COLORS = { home: ['#25b5a0'], go: ['#3a8ee6'], frlgsw: ['#e5492c', '#64bb3c'], za: ['#2fae6f'], zadlc: ['#2fae6f'], sv: ['#e0383e', '#8b45c5'], svmask: ['#e0383e', '#8b45c5'], svdisk: ['#e0383e', '#8b45c5'], la: ['#c99a3a'],
  bdsp: ['#3b7de0', '#e57fb2'], sw: ['#22a6e8', '#d8336f'], swisle: ['#22a6e8', '#d8336f'], swcrown: ['#22a6e8', '#d8336f'], lgpe: ['#f6c915', '#b5803f'], usum: ['#f26a21', '#5b3fc4'], sm: ['#f5a524', '#3f6bd1'],
  oras: ['#c8102e', '#1d4fb8'], xy: ['#1e6fd9', '#d6203f'], b2w2: ['#2e3d56', '#e9dcd2'], bw: ['#1b1b1b', '#f2f2f2'], hgss: ['#d9a400', '#b0b7c3'], pt: ['#8d929b'], dp: ['#5fa2e0', '#e9a3c4'],
  e: ['#16a05a'], frlg: ['#e5492c', '#64bb3c'], rs: ['#c8102e', '#1d4fb8'], c: ['#5cc8e0'], gs: ['#d9a400', '#b0b7c3'], y: ['#f5d000'], rb: ['#e3262e', '#2e62c9'] };
const gameOfValue = v => VDEX[v] ? VDEX[v].game : v;
const gdot = v => { const c = GAME_COLORS[gameOfValue(v)]; return c ? `<span class="gdot" aria-hidden="true" style="--c1:${c[0]};--c2:${c[1] || c[0]}"></span>` : '<span class="gdot none" aria-hidden="true"></span>'; };
const gmNorm = t => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
// Generic custom dropdown over a hidden native <select> (source of truth: value, labels, disabled state; tests and code keep using the select).
// cfg: { btnId, listId, label, empty (button text when value ''), allLabel (list text for value ''), dot(v) → html, sep(v, prevV) → '' | 'sep' | ['sep2', caption] }
const MENUS = {};
function initMenu(selId, cfg) {
  const sel = $('#' + selId); if (!sel || (MENUS[selId] && MENUS[selId].sel === sel)) return; // v26: sheet menu (#dgame) is re-created on each render → re-init
  sel.classList.add('vh'); sel.tabIndex = -1; sel.setAttribute('aria-hidden', 'true');
  const wrap = document.createElement('div'); wrap.className = 'gsel'; sel.parentNode.insertBefore(wrap, sel); wrap.appendChild(sel);
  wrap.insertAdjacentHTML('beforeend', `<button id="${cfg.btnId}" class="gbtn" type="button" aria-haspopup="listbox" aria-expanded="false" aria-controls="${cfg.listId}" aria-label="${esc(cfg.label)}"></button><div class="gback" hidden></div><ul id="${cfg.listId}" class="gpop" role="listbox" tabindex="-1" aria-label="${esc(cfg.label)}" hidden></ul>`);
  const M = MENUS[selId] = { sel, cfg, wrap, btn: wrap.querySelector('.gbtn'), list: wrap.querySelector('.gpop'), back: wrap.querySelector('.gback'), open: false, active: 0, typed: '', typedAt: 0, items: [] };
  M.btn.addEventListener('click', () => M.open ? closeMenu(M, true) : openMenu(M));
  M.btn.addEventListener('keydown', e => { if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); openMenu(M); } });
  M.list.addEventListener('click', e => { const li = e.target.closest('.gopt'); if (li && li.getAttribute('aria-disabled') !== 'true') pickMenu(M, +li.dataset.i); });
  M.list.addEventListener('keydown', e => menuKey(M, e));
  M.list.addEventListener('focusout', e => { if (M.open && !wrap.contains(e.relatedTarget)) closeMenu(M, false); });
  M.back.addEventListener('click', () => closeMenu(M, true));
  buildMenu(M); syncMenu(M);
}
document.addEventListener('pointerdown', e => { for (const M of Object.values(MENUS)) if (M.open && !M.wrap.contains(e.target)) closeMenu(M, false); }); // one listener for every menu
function buildMenu(M) {
  const { cfg } = M;
  M.items = [...M.sel.options].map(o => ({ v: o.value, label: o.value ? o.textContent : cfg.allLabel, dis: o.disabled, n: o.dataset.n || '' }));
  let html = '', prev = null;
  M.items.forEach((it, i) => {
    const sp = cfg.sep ? cfg.sep(it.v, prev) : '';
    if (Array.isArray(sp)) html += `<li class="gsep2" role="presentation" aria-hidden="true">${sp[1] ? `<span>${esc(sp[1])}</span>` : ''}</li>`;
    else if (sp) html += '<li class="gsep" role="presentation" aria-hidden="true"></li>';
    prev = it.v;
    html += `<li id="${cfg.listId}-${i}" class="gopt" role="option" data-i="${i}" data-v="${esc(it.v)}" aria-selected="false"${it.dis ? ' aria-disabled="true"' : ''}>${cfg.dot ? cfg.dot(it.v) : ''}<span class="gl">${esc(it.label)}</span>${it.n ? `<span class="gnum${it.n === 'Hors dex' ? ' hx' : ''}">${esc(it.n)}</span>` : ''}</li>`;
  });
  M.list.innerHTML = html; M.sig = M.items.map(x => x.v + '|' + x.label + '|' + x.dis + '|' + x.n).join('\n');
}
function syncMenu(M) {
  const sig = [...M.sel.options].map(o => o.value + '|' + (o.value ? o.textContent : M.cfg.allLabel) + '|' + o.disabled + '|' + (o.dataset.n || '')).join('\n');
  if (sig !== M.sig && !M.open) buildMenu(M); // labels / disabled state change with the list context (Catégorie)
  const v = M.sel.value, it = M.items.find(x => x.v === v) || M.items[0];
  M.btn.innerHTML = `${v && M.cfg.dot ? M.cfg.dot(v) : ''}<span class="gl">${esc(v ? it.label : M.cfg.empty)}</span>${v && it.n ? `<span class="gnum${it.n === 'Hors dex' ? ' hx' : ''}">${esc(it.n)}</span>` : ''}<span class="gcaret" aria-hidden="true">▾</span>`;
  M.btn.setAttribute('aria-label', M.cfg.label + ' : ' + (v ? it.label : 'tous'));
  for (const li of M.list.querySelectorAll('.gopt')) li.setAttribute('aria-selected', String(li.dataset.v === v));
}
function syncMenus() { for (const M of Object.values(MENUS)) if (M.sel.isConnected) syncMenu(M); }
function setMenuActive(M, i, dir = 1) {
  const n = M.items.length; i = Math.max(0, Math.min(n - 1, i));
  while (M.items[i] && M.items[i].dis && i + dir >= 0 && i + dir < n) i += dir; // skip disabled options
  M.active = i;
  for (const x of M.list.querySelectorAll('.gopt.gact')) x.classList.remove('gact');
  const li = $('#' + M.cfg.listId + '-' + i);
  if (li) { li.classList.add('gact'); M.list.setAttribute('aria-activedescendant', li.id); li.scrollIntoView({ block: 'nearest' }); }
}
function openMenu(M) {
  for (const o of Object.values(MENUS)) if (o !== M) closeMenu(o, false);
  syncMenu(M);
  M.open = true; M.list.hidden = false; M.back.hidden = false; M.btn.setAttribute('aria-expanded', 'true');
  const i = M.items.findIndex(x => x.v === M.sel.value);
  M.list.focus({ preventScroll: true }); M.list.scrollTop = 0; setMenuActive(M, i < 0 ? 0 : i);
  const li = $('#' + M.cfg.listId + '-' + M.active); if (li && li.offsetTop > M.list.clientHeight * .6) M.list.scrollTop = li.offsetTop - M.list.clientHeight / 3;
}
function closeMenu(M, refocus) {
  if (!M || !M.open) return;
  M.open = false; M.list.hidden = true; M.back.hidden = true; M.btn.setAttribute('aria-expanded', 'false');
  if (refocus) M.btn.focus({ preventScroll: true });
}
function pickMenu(M, i) {
  const it = M.items[i]; if (!it || it.dis) return;
  closeMenu(M, true);
  if (M.sel.value !== it.v) { M.sel.value = it.v; M.sel.dispatchEvent(new Event('change', { bubbles: true })); }
  syncMenu(M);
}
function menuKey(M, e) {
  const k = e.key, n = M.items.length;
  if (k === 'ArrowDown') setMenuActive(M, M.active + 1, 1);
  else if (k === 'ArrowUp') setMenuActive(M, M.active - 1, -1);
  else if (k === 'Home') setMenuActive(M, 0, 1);
  else if (k === 'End') setMenuActive(M, n - 1, -1);
  else if (k === 'PageDown') setMenuActive(M, M.active + 8, 1);
  else if (k === 'PageUp') setMenuActive(M, M.active - 8, -1);
  else if (k === 'Enter' || k === ' ') pickMenu(M, M.active);
  else if (k === 'Escape') closeMenu(M, true);
  else if (k === 'Tab') { closeMenu(M, false); return; }
  else if (k.length === 1 && /\S/.test(k)) { // type-ahead (accents ignored, any word of the label)
    const now = Date.now(); M.typed = (now - M.typedAt < 700 ? M.typed : '') + gmNorm(k); M.typedAt = now;
    const order = [...M.items.keys()].map(j => (M.active + (M.typed.length > 1 ? 0 : 1) + j) % n);
    const hit = order.find(j => !M.items[j].dis && gmNorm(M.items[j].label).replace(/^[^a-z0-9]+/, '').split(/[\s:/–()-]+/).some(w => w.startsWith(M.typed)));
    if (hit !== undefined) setMenuActive(M, hit);
  } else return;
  e.preventDefault();
}
// Jeux: double separator (+ console caption) when the console changes, simple one between generations; coloured dot per game
const gameSep = (v, pv) => { const g = GAME_BY[gameOfValue(v)]; if (!g) return ''; const pg = pv != null && GAME_BY[gameOfValue(pv)]; const con = CONSOLE_OF[g.id] || '';
  return !pg || CONSOLE_OF[pg.id] !== con ? ['sep2', con] : pg.g !== g.g ? 'sep' : ''; };
function initGameMenu() {
  initMenu('game', { btnId: 'gamebtn', listId: 'gamelist', label: 'Jeu', empty: 'Jeux', allLabel: 'Tous les jeux (aucun filtre)', dot: gdot, sep: gameSep });
}
// v26: Génération + Tri use the same custom dropdown (content unchanged); the sheet's game selector too (dots + generation / console separators)
function initGenMenu() { initMenu('gen', { btnId: 'genbtn', listId: 'genlist', label: 'Génération', empty: 'Toutes gén.', allLabel: 'Toutes gén.' }); }
function initSortMenu() { initMenu('sort', { btnId: 'sortbtn', listId: 'sortlist', label: 'Tri', empty: 'Tri : N°', allLabel: 'Tri : N°' }); }
let dgameRefocus = false;
function initSheetGameMenu() {
  const sel = $('#dgame'); if (!sel) return;
  initMenu('dgame', { btnId: 'dgamebtn', listId: 'dgamelist', label: 'Jeu de la fiche', empty: 'Vue d’ensemble', allLabel: 'Vue d’ensemble', dot: v => v === 'all' ? '<span class="gdot none" aria-hidden="true"></span>' : gdot(v), sep: gameSep });
  const lb = document.querySelector('.gamebar label[for="dgame"]'); if (lb) lb.htmlFor = 'dgamebtn';
  if (dgameRefocus) { dgameRefocus = false; $('#dgamebtn').focus({ preventScroll: true }); }
}
// Catégorie: simple separators between families (sélection · captures · complétion jeux · HOME)
const CAT_SEP_BEFORE = new Set(['caught', 'swdone', 'trans', 'baron']);
const CAT_HEAD = { leg: 'Statut', caught: 'Marques', trans: 'HOME', baron: 'Barons' }; // v27: block headings, same style as the Jeux menu (SWITCH, 3DS…)
const catSep = v => CAT_HEAD[v] ? ['h', CAT_HEAD[v]] : CAT_SEP_BEFORE.has(v) ? 'sep' : '';
function initCatMenu() { initMenu('cat', { btnId: 'catbtn', listId: 'catlist', label: 'Catégorie', empty: 'Catégorie', allLabel: 'Toutes catégories (aucun filtre)', sep: catSep, dot: v => v === 'baron' || v === 'nobaron' ? BARON_IC : v === 'barons' || v === 'nobarons' ? BARONS_IC : '' }); }

/* ---------------- v49: mode Collection — a log of individual Pokémon owned (separate from dex tracking) ---------------- */
// Storage « collection »: [{ id, k (entry key), g (origin game id or 'go', fixed), n (surnom), sh (bool), sx ('m'|'f'|'x'|''), w (where now: game id | 'go' | 'home' | 'other:<text>' | ''), at (ISO created), up (ISO edited) }]
let COLL = (store.get('collection', []) || []).filter(e => e && typeof e === 'object');
let colMode = store.get('colmode', false) === true;
const colSave = () => { store.set('collection', COLL); const t = document.getElementById('coltools'); if (t) { const op = !t.querySelector('#colfp').hidden; t.parentNode.innerHTML = ''; colRender(); const pn = document.getElementById('colfp'); if (pn && op) pn.hidden = false; } };
const colGames = () => [['go', 'Pokémon GO'], ...GAMES.map(g => [g.id, g.s])]; // v54: GO first (then right under HOME in « Jeu actuel »)
const colGName = g => g === 'go' ? 'Pokémon GO' : g === 'home' ? 'Pokémon HOME' : GAME_BY[g] ? GAME_BY[g].s : '';
const colWhere = w => !w ? '' : w.startsWith('other:') ? w.slice(6) : colGName(w);
const colOrigOk = g => g === 'go' || !!GAME_BY[g];
const colId = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
const colImg = e => { const p = (e.mg && BY_KEY[e.mg]) || BY_KEY[e.k]; // v53: Méga specimen shows its Mega art
  return p ? (e.sh && p.sh ? `img/s/${p.k}.webp` : artOf(p)) : ''; };
const colValid = e => e && typeof e === 'object' && typeof e.k === 'string' && BY_KEY[e.k] && colOrigOk(e.g);
function colImport(arr) {
  const have = new Set(COLL.map(e => e.id));
  for (const e of arr) if (colValid(e)) {
    const x = { id: typeof e.id === 'string' && e.id ? e.id : colId(), k: e.k, g: e.g, n: typeof e.n === 'string' ? e.n.slice(0, 40) : '', sh: !!e.sh, sx: ['m', 'f', 'x'].includes(e.sx) ? e.sx : '', w: typeof e.w === 'string' ? e.w.slice(0, 60) : '', at: typeof e.at === 'string' ? e.at : new Date().toISOString() };
    if (typeof e.bn === 'boolean') x.bn = e.bn; if (typeof e.gx === 'boolean') x.gx = e.gx;
    if (BALL_N[e.b]) x.b = e.b; if (typeof e.l === 'string' && e.l) x.l = e.l.slice(0, 80); if (colLvOk(e.lv, (e.w || e.g) === 'go')) x.lv = e.lv; if ((e.w || e.g) === 'go') { if (Number.isInteger(e.cp) && e.cp >= 10 && e.cp <= 99999) x.cp = e.cp; if (colIvOk(e.iv)) x.iv = e.iv.slice(); } if (typeof e.cd === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.cd)) x.cd = e.cd;
    if (typeof e.mg === 'string' && BY_KEY[e.mg] && BY_KEY[e.mg].mb) x.mg = e.mg;
    if (typeof e.up === 'string') x.up = e.up;
    const gn = colGoneOk(e.gone); if (gn) x.gone = gn;
    if (Array.isArray(e.h)) { const h = e.h.filter(r => r && r.t === 'evo' && typeof r.from === 'string').map(r => ({ t: 'evo', from: r.from, d: typeof r.d === 'string' ? r.d : '' })); if (h.length) x.h = h; }
    if (!have.has(x.id)) { COLL.push(x); have.add(x.id); }
  }
  colSave(); colRender();
}
// Adding ticks Capturé (and Shiny) in the dex for the origin game, through the normal linked rules. Never unticks anything.
function colTickDex(p, g, sh, bn, gx, mgk, mgw) {
  if (!p || !colOrigOk(g)) return;
  try {
    if (!isCaught(p, g)) toggleMark(p, 'caught', g);
    if (sh && !isShiny(p, g)) toggleMark(p, 'shiny', g);
    if (bn && colBaronOk(p, g) && !isBaron(p, g)) toggleBaron(p, false, g);
    const m = gx && colGmax(p, g);
    if (m) { if (m.v) { if (!salOn(m.v, g)) toggleSal(m.v, g); } else if (!isCaught(m.g, g)) toggleMark(m.g, 'caught', g, p !== m.g ? p : null); }
    const mg = mgk && BY_KEY[mgk]; if (mg && mgw === 'go' && !isCaught(mg, 'go')) toggleMark(mg, 'caught', 'go'); // v53b: Méga = usable in the current game; dex only ticked for a GO specimen still in GO (Mega registered there)
  } catch {}
}
// v49b: Baron = Legends games with Barons (as in the dex) and an Alpha-capable form. Gigamax = Épée / Bouclier (+ extensions) or GO, species with a Gigamax form.
const colBaronOk = (p, g) => ALPHA_GAMES.has(g) && !p.bo && !p.mb && alphaOk(p, g);
function colGmax(p, g) {
  if (!(g === 'go' || ['sw', 'swisle', 'swcrown'].includes(g))) return null;
  if (isGmx(p)) return gmaxInGame(p, g) ? { g: p, v: isSal(p) ? 'A' : '' } : null;
  const x = gmaxBtnsOf(p)[0]; if (!x || !gmaxInGame(x, g)) return null;
  return { g: x, v: isSal(x) ? (p.k === SAL_BASE.G ? 'G' : 'A') : '' };
}
// v49d: « Plus en ma possession » (gone: { s: 'trade'|'free'|'gift', d: 'YYYY-MM-DD'|'', n: note }) + history h: [{ t: 'evo', from: key, d: ISO }]
const GONE_L = { trade: 'Échangé', free: 'Relâché', gift: 'Donné' };
const colGoneOk = g => g && typeof g === 'object' && GONE_L[g.s] ? { s: g.s, d: typeof g.d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(g.d) ? g.d : '', n: typeof g.n === 'string' ? g.n.slice(0, 120) : '' } : null;
const colGoneTxt = g => GONE_L[g.s] + (g.d ? ' le ' + new Date(g.d + 'T12:00:00').toLocaleDateString('fr-FR') : '');
const colAct = e => !e.gone;
// Evolutions of an entry (evo.json edges are form-aware: Goupix d’Alola → Feunard d’Alola, Miaouss de Galar → Berserkatt).
// A non-regional form without its own edges (Gigamax, cosmetic forms) uses the base species' edges.
// v49e: gender-conditioned evolutions (Kirlia → Gallame ♂, Cheniti → Cheniselle ♀ / Papilord ♂, Stalgamin → Momartik ♀, Apitrini → Apireine ♀,
// Tritox → Malamandre ♀, Psystigri / Gourmelet / Bargantua → male / female entries): game gender code (1 ♀, 2 ♂), else the GO flag unless the
// target only differs visually (core « fe », e.g. Némélios). A specimen of the other sex is not offered the evolution.
const colEvoSex = (d, o, b) => { const c = (d || []).map(x => (x.g || '').split('|')[2]).find(Boolean); return c === '1' ? 'f' : c === '2' ? 'm' : o && o.g && !b.fe ? (o.g === 'mâle' ? 'm' : 'f') : ''; };
async function colEvos(p, sx) {
  if (!p) return [];
  const sh = await loadShared(); const out = [], seen = new Set();
  const from = k => sh.evo.filter(([f]) => f === k).forEach(([, t, d, o]) => { const b = BY_KEY[t]; if (!b || b.bo || seen.has(t)) return; const req = colEvoSex(d, o, b);
    if (req && (sx === 'm' || sx === 'f') && sx !== req) return; seen.add(t); out.push({ p: b, sx: req, how: ((d || []).slice(-1)[0] || {}).x || [] }); });
  from(p.k); if (!out.length && p.c !== 'reg' && p.k !== String(p.id)) from(String(p.id));
  return out;
}
async function colEvolve(e, np, req) {
  const op = BY_KEY[e.k]; let gr = null; try { gr = (await loadSp(np.id)).gr; } catch {}
  if (req) e.sx = req; else if (gr === -1) e.sx = 'x'; else if (gr === 0) e.sx = e.sx === 'f' ? '' : (e.sx === 'x' ? '' : e.sx); else if (gr === 8) e.sx = e.sx === 'm' ? '' : (e.sx === 'x' ? '' : e.sx); else if (e.sx === 'x') e.sx = '';
  if (gr === 0 && !e.sx) e.sx = 'm'; if (gr === 8 && !e.sx) e.sx = 'f';
  if (e.bn && !colBaronOk(np, e.g)) delete e.bn; if (e.gx && !colGmax(np, e.g)) delete e.gx; if (e.mg && !colMegasCur(np, colCur(e)).some(m => m.k === e.mg)) delete e.mg;
  const now = new Date().toISOString();
  e.h = [...(Array.isArray(e.h) ? e.h : []), { t: 'evo', from: e.k, d: now }]; e.k = np.k; e.up = now;
  colTickDex(np, e.g, e.sh, e.bn, e.gx); colSave();
  return op;
}
const SEX_L = { m: '♂ Mâle', f: '♀ Femelle', x: 'Asexué' };
// v53: optional fields — Ball (b: id), lieu (l: text), date de capture (cd: YYYY-MM-DD); Méga (mg: key of the Mega entry, the specimen keeps its base k)
const BALLS = [['poke-ball', 'Poké Ball'], ['great-ball', 'Super Ball'], ['ultra-ball', 'Hyper Ball'], ['master-ball', 'Master Ball'], ['premier-ball', 'Honor Ball'], ['safari-ball', 'Safari Ball'], ['net-ball', 'Filet Ball'], ['dive-ball', 'Scuba Ball'], ['nest-ball', 'Faiblo Ball'], ['repeat-ball', 'Bis Ball'], ['timer-ball', 'Chrono Ball'], ['luxury-ball', 'Luxe Ball'], ['dusk-ball', 'Sombre Ball'], ['heal-ball', 'Soin Ball'], ['quick-ball', 'Rapide Ball'], ['cherish-ball', 'Mémoire Ball'], ['sport-ball', 'Compét’Ball'], ['fast-ball', 'Speed Ball'], ['level-ball', 'Niveau Ball'], ['lure-ball', 'Appât Ball'], ['heavy-ball', 'Masse Ball'], ['love-ball', 'Love Ball'], ['friend-ball', 'Copain Ball'], ['moon-ball', 'Lune Ball'], ['park-ball', 'Parc Ball'], ['dream-ball', 'Rêve Ball'], ['beast-ball', 'Ultra Ball'], ['strange-ball', 'Étrange Ball'], ['lapoke-ball', 'Poké Ball (Hisui)'], ['lagreat-ball', 'Super Ball (Hisui)'], ['laultra-ball', 'Hyper Ball (Hisui)'], ['laheavy-ball', 'Masse Ball (Hisui)'], ['laleaden-ball', 'Mégamasse Ball'], ['lagigaton-ball', 'Gigamasse Ball'], ['lafeather-ball', 'Plume Ball'], ['lawing-ball', 'Aile Ball'], ['lajet-ball', 'Jet Ball'], ['laorigin-ball', 'Origine Ball']];
const BALL_N = Object.fromEntries(BALLS);
const ballImg = b => BALL_N[b] ? `<img class="ballic" src="img/balls/${b}.png" alt="" width="20" height="20" loading="lazy">` : '';
// v53c: Balls catchable in each origin game (Bulbapedia « Poké Ball » availability; Cherish = event gifts). No data (Z-A, Méga-Dimension) → full list.
const B_G3 = ['poke-ball', 'great-ball', 'ultra-ball', 'master-ball', 'safari-ball', 'net-ball', 'dive-ball', 'nest-ball', 'repeat-ball', 'timer-ball', 'luxury-ball', 'premier-ball'];
const B_G4 = [...B_G3, 'dusk-ball', 'heal-ball', 'quick-ball', 'cherish-ball'], B_APRI = ['fast-ball', 'level-ball', 'lure-ball', 'heavy-ball', 'love-ball', 'friend-ball', 'moon-ball'];
const B_G5 = [...B_G4.filter(b => b !== 'safari-ball'), 'dream-ball'], B_G6 = B_G4.filter(b => b !== 'safari-ball');
const B_MOD = [...B_G4, ...B_APRI, 'sport-ball', 'dream-ball', 'beast-ball'];
const BALL_G = { rb: ['poke-ball', 'great-ball', 'ultra-ball', 'master-ball', 'safari-ball'], y: ['poke-ball', 'great-ball', 'ultra-ball', 'master-ball', 'safari-ball'],
  gs: ['poke-ball', 'great-ball', 'ultra-ball', 'master-ball', ...B_APRI, 'sport-ball'], c: ['poke-ball', 'great-ball', 'ultra-ball', 'master-ball', ...B_APRI, 'sport-ball'],
  rs: B_G3, e: B_G3, frlg: B_G3, frlgsw: B_G3, dp: [...B_G4, 'park-ball'], pt: [...B_G4, 'park-ball'], hgss: [...B_G4, ...B_APRI, 'sport-ball', 'park-ball'],
  bw: B_G5, b2w2: B_G5, xy: B_G6, oras: B_G6, sm: [...B_G6, ...B_APRI, 'beast-ball'], usum: [...B_G6, ...B_APRI, 'beast-ball'],
  lgpe: ['poke-ball', 'great-ball', 'ultra-ball', 'master-ball', 'premier-ball'], sw: B_MOD, swisle: B_MOD, swcrown: B_MOD, bdsp: B_G4,
  la: ['lapoke-ball', 'lagreat-ball', 'laultra-ball', 'laheavy-ball', 'laleaden-ball', 'lagigaton-ball', 'lafeather-ball', 'lawing-ball', 'lajet-ball', 'laorigin-ball', 'master-ball', 'cherish-ball'],
  sv: B_MOD, svmask: B_MOD, svdisk: B_MOD, go: ['poke-ball', 'great-ball', 'ultra-ball', 'master-ball', 'premier-ball'] };
const colBalls = g => BALL_G[g] ? BALLS.filter(([v]) => BALL_G[g].includes(v)) : BALLS;
// v53c: level — 1–100 (integer), GO: 1–50 by half levels; 40 / 50 highlighted for GO
const colLvOk = (v, go) => typeof v === 'number' && (go ? v >= 1 && v <= 50 && Number.isInteger(v * 2) : Number.isInteger(v) && v >= 1 && v <= 100);
const colLvHTML = e => !e.lv ? '' : (colCur(e) === 'go' && (e.lv === 40 || e.lv === 50)) ? ` <span class="collv hl">N. ${e.lv}</span>` : ` <span class="collv">N. ${String(e.lv).replace('.', ',')}</span>`;
// v53c: GO only — PC (CP) and IV Attaque / Défense / PV (0–15)
const colIvOk = v => Array.isArray(v) && v.length === 3 && v.every(n => Number.isInteger(n) && n >= 0 && n <= 15);
const colIvPct = v => Math.round((v[0] + v[1] + v[2]) / 45 * 100);
const colIvBadge = e => colCur(e) === 'go' && colIvOk(e.iv) ? `<span class="cb iv${colIvPct(e.iv) === 100 ? ' hl' : ''}" title="IV Attaque / Défense / PV">${e.iv.join('/')} · ${colIvPct(e.iv)} %</span>` : '';
const colGoHTML = e => colCur(e) !== 'go' || !(e.cp || colIvOk(e.iv)) ? '' : `<small class="colgo">${e.cp ? 'PC ' + e.cp.toLocaleString('fr-FR') : ''}${e.cp && colIvOk(e.iv) ? ' · ' : ''}${colIvOk(e.iv) ? `IV ${e.iv.join('/')} (${colIvPct(e.iv)} %)` : ''}</small>`;
const colDate = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('fr-FR') : '';
const MEGA_GAMES = ['xy', 'oras', 'sm', 'usum', 'lgpe', 'za', 'zadlc', 'go'];
const colMegaBase = p => p ? (p.mb ? BY_KEY[p.mb] : p) : null;
const colMegas = p => { const b = colMegaBase(p); return b && !b.bo && b.c !== 'gmax' ? E.filter(q => q.mb === b.k || q.mb2 === b.k) : []; };
const colMegaIn = (m, g) => MEGA_GAMES.includes(g) && colAvail(m, g);
const colMegasIn = (p, g) => colMegas(p).filter(m => g ? colMegaIn(m, g) : MEGA_GAMES.some(x => colMegaIn(m, x)));
const colCur = e => e.w || e.g; // v53b: empty Jeu actuel = origin game
const colMegasCur = (p, w) => MEGA_GAMES.includes(w) ? colMegasIn(p, w) : []; // Méga = can Mega Evolve in its CURRENT game
const colMegaL = k => { const m = BY_KEY[k]; return m ? (m.l || 'Méga') : 'Méga'; };
function myColHTML(p) {
  const all = COLL.filter(e => BY_KEY[e.k] && BY_KEY[e.k].id === p.id), mine = all.filter(colAct), gone = all.length - mine.length;
  return `<section class="box colbox"><h2>Ma collection <button type="button" class="coladd" data-add="${p.k}" aria-label="Ajouter un exemplaire">＋</button></h2>` +
    (mine.length ? `<p class="colcnt">Vous en avez <b>${mine.length}</b>${gone ? ` <small class="colgone">+ ${gone} plus en votre possession</small>` : ''}</p>` : `<p class="note colcnt">${gone ? `Vous n’en avez plus (${gone} plus en votre possession).` : 'Vous n’en avez pas encore.'} Touchez ＋ pour en ajouter un.</p>`) + (all.length ? `<ul class="plain colmini">${[...mine, ...all.filter(e => !colAct(e))].map(colRowHTML).join('')}</ul>` : '') + '</section>';
}
function colRowHTML(e) {
  const p = BY_KEY[e.k];
  return `<li${e.gone ? ' class="gone"' : ''}><button type="button" class="colrow" data-cid="${esc(e.id)}"><img src="${colImg(e)}" alt="" width="48" height="48" loading="lazy"><span class="ct"><b>${esc(fullN(p))}${e.sh ? ' ✨' : ''}</b>${e.n ? `<i>« ${esc(e.n)} »</i>` : ''}<small>${gdot(e.g)}${esc(colGName(e.g))}${e.bn ? ' · Baron' : ''}${e.gx ? ' · Gigamax' : ''}${e.mg ? ' · ' + esc(colMegaL(e.mg)) : ''}${e.gone ? ' · ' + esc(colGoneTxt(e.gone)) : e.w ? ' · ' + esc(colWhere(e.w)) : ''}</small></span></button></li>`;
}
function colCardHTML(e) {
  const p = BY_KEY[e.k]; if (!p) return '';
  return `<button type="button" class="card colcard${e.gone ? ' gone' : ''}" data-cid="${esc(e.id)}"><img src="${colImg(e)}" alt="" loading="lazy" decoding="async" width="256" height="256">` +
    `<div class="info"><div class="nm">${esc(fullN(p))}${colLvHTML(e)}${e.sh ? ' <span class="mk sh" aria-label="Shiny">✨</span>' : ''}</div>${e.n ? `<div class="sn">« ${esc(e.n)} »</div>` : ''}${e.bn || e.gx || e.mg || colIvBadge(e) ? `<div class="cbad">${colIvBadge(e)}${e.bn ? '<span class="cb bn">Baron</span>' : ''}${e.gx ? '<span class="cb gx">Gigamax</span>' : ''}${e.mg ? `<span class="cb mg">${esc(colMegaL(e.mg))}</span>` : ''}</div>` : ''}<div class="og" title="${esc(colGName(e.g))}">${gdot(e.g)}<span>${esc(colGName(e.g))}</span>${e.b ? ballImg(e.b) : ''}</div>${e.gone ? `<div class="gn">${esc(colGoneTxt(e.gone))}</div>` : ''}</div></button>`;
}
function colRender() {
  document.body.classList.toggle('colmode', colMode);
  if (typeof pkSeg === 'function') pkSeg();
  const box = $('#collection'); if (!box) return;
  box.hidden = !colMode;
  if (colMode) {
    const all = COLL.filter(e => BY_KEY[e.k]), nAct = all.filter(colAct).length, nG = all.length - nAct;
    if (all.length) {
      if (!$('#coltools')) box.innerHTML = colToolsHTML() + '<div id="colres"></div>';
      const list = colApply(all), nf = colNF();
      $('#colfn').textContent = nf ? ` (${nf})` : ''; $('#colfbtn').classList.toggle('on', nf > 0);
      $('#colres').innerHTML = `<div class="colhead"><span>${nAct} Pokémon dans votre collection${nG ? `<small class="colgone">+ ${nG} plus en votre possession</small>` : ''}${list.length !== all.length ? `<small class="colshown">${list.length} affiché${list.length > 1 ? 's' : ''}</small>` : ''}</span><button type="button" class="coladd colnew" aria-label="Ajouter un Pokémon">＋ Ajouter</button></div>` +
        (list.length ? `<div class="grid colgrid">${list.map(colCardHTML).join('')}</div>` : `<p class="note colnone">Aucun Pokémon ne correspond. <button type="button" class="linkb" id="colreset">Effacer les filtres</button></p>`);
    } else box.innerHTML = `<div class="colempty"><div class="ce-ic" aria-hidden="true">${BALL}</div><p><b>Votre collection est vide.</b></p><p>Touchez ＋ sur une carte du Dex ou sur la fiche d’un Pokémon pour enregistrer un Pokémon que vous possédez.</p><p><button type="button" class="cfok colnew colnew0">＋ Ajouter un Pokémon</button></p></div>`;
  }
  const mc = $('#mycol'); if (mc && DET && DET.p) mc.innerHTML = myColHTML(DET.p);
}
// v53: overview search / filters / sort (stored in « colview »)
const CV0 = { q: '', g: '', w: '', sh: '', sx: '', b: '', sp: '', hg: false, so: 'add' };
let CV = Object.assign({}, CV0, store.get('colview', {}) || {}); CV.q = '';
const CV_SORT = [['add', 'Date d’ajout'], ['dex', 'N° de Pokédex'], ['name', 'Nom'], ['cd', 'Date de capture'], ['g', 'Jeu d’origine'], ['lv', 'Niveau']];
const colNF = () => ['g', 'w', 'sh', 'sx', 'b', 'sp'].filter(k => CV[k]).length + (CV.hg ? 1 : 0);
const colOpt = (v, n, cur) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(n)}</option>`;
function colToolsHTML() {
  const used = k => [...new Set(COLL.map(e => e[k]).filter(Boolean))];
  const gs = colGames().filter(([v]) => used('g').includes(v) || v === CV.g);
  const ws = [['home', 'Pokémon HOME'], ...colGames()].filter(([v]) => COLL.some(e => colCur(e) === v) || v === CV.w);
  const sel = (id, lab, opts) => `<label class="cvf"><span>${lab}</span><select id="${id}">${opts}</select></label>`;
  return `<div id="coltools" class="coltools"><div class="cvbar"><input id="colq" type="search" placeholder="Nom ou surnom…" autocomplete="off" aria-label="Rechercher dans la collection">` +
    `<button type="button" id="colfbtn" class="cvbtn" aria-expanded="false">Filtres<span id="colfn"></span></button>` +
    `<select id="colso" class="cvso" aria-label="Trier par">${CV_SORT.map(([v, n]) => colOpt(v, '↕ ' + n, CV.so)).join('')}</select></div>` +
    `<div id="colfp" class="cvpanel" hidden>` +
    sel('cvg', 'Jeu d’origine', colOpt('', 'Tous', CV.g) + gs.map(([v, n]) => colOpt(v, n, CV.g)).join('')) +
    sel('cvw', 'Jeu actuel', colOpt('', 'Tous', CV.w) + ws.map(([v, n]) => colOpt(v, n, CV.w)).join('') + colOpt('other', 'Autre…', CV.w)) +
    sel('cvsh', 'Shiny', colOpt('', 'Tous', CV.sh) + colOpt('y', '✨ Shiny', CV.sh) + colOpt('n', 'Non shiny', CV.sh)) +
    sel('cvsx', 'Sexe', colOpt('', 'Tous', CV.sx) + Object.entries(SEX_L).map(([v, n]) => colOpt(v, n, CV.sx)).join('') + colOpt('none', 'Non renseigné', CV.sx)) +
    sel('cvb', 'Ball', colOpt('', 'Toutes', CV.b) + BALLS.filter(([v]) => used('b').includes(v) || v === CV.b).map(([v, n]) => colOpt(v, n, CV.b)).join('') + colOpt('none', 'Non renseignée', CV.b)) +
    sel('cvsp', 'Particularité', colOpt('', 'Toutes', CV.sp) + colOpt('bn', 'Baron', CV.sp) + colOpt('gx', 'Gigamax', CV.sp) + colOpt('mg', 'Méga', CV.sp)) +
    `<label class="cfc cvhg"><input type="checkbox" id="cvhg"${CV.hg ? ' checked' : ''}> Masquer « Plus en ma possession »</label>` +
    `<button type="button" class="linkb" id="colreset2">Effacer les filtres</button></div></div>`;
}
function colApply(all) {
  const t = norm(CV.q.trim());
  const r = all.filter(e => {
    if (CV.hg && e.gone) return false;
    if (t) { const p = BY_KEY[e.k]; if (!norm(fullN(p)).includes(t) && !norm(p.n || '').includes(t) && !norm(e.n || '').includes(t) && !(e.mg && norm(fullN(BY_KEY[e.mg]) || '').includes(t))) return false; }
    if (CV.g && e.g !== CV.g) return false;
    if (CV.w && !(CV.w === 'other' ? (e.w || '').startsWith('other:') : colCur(e) === CV.w)) return false;
    if (CV.sh && !!e.sh !== (CV.sh === 'y')) return false;
    if (CV.sx && (CV.sx === 'none' ? !!e.sx : e.sx !== CV.sx)) return false;
    if (CV.b && (CV.b === 'none' ? !!e.b : e.b !== CV.b)) return false;
    if (CV.sp && !e[CV.sp]) return false;
    return true; });
  const ix = new Map(E.map((p, i) => [p.k, i])), nm = e => fullN(BY_KEY[e.k]);
  const cmp = { add: (a, b) => (b.at || '').localeCompare(a.at || ''), dex: (a, b) => ix.get(a.k) - ix.get(b.k), name: (a, b) => nm(a).localeCompare(nm(b), 'fr'),
    cd: (a, b) => (!a.cd - !b.cd) || (b.cd || '').localeCompare(a.cd || ''), g: (a, b) => (GIDX[a.g] ?? 999) - (GIDX[b.g] ?? 999), lv: (a, b) => (b.lv || 0) - (a.lv || 0) }[CV.so] || (() => 0);
  return r.sort((a, b) => (!!a.gone - !!b.gone) || cmp(a, b) || (b.at || '').localeCompare(a.at || ''));
}
function colToolsInit() {
  const box = $('#collection'); if (!box) return;
  const save = () => { store.set('colview', Object.assign({}, CV, { q: '' })); colRender(); };
  box.addEventListener('input', ev => { if (ev.target.id === 'colq') { CV.q = ev.target.value; colRender(); } });
  box.addEventListener('change', ev => { const id = ev.target.id;
    const map = { colso: 'so', cvg: 'g', cvw: 'w', cvsh: 'sh', cvsx: 'sx', cvb: 'b', cvsp: 'sp' };
    if (map[id]) { CV[map[id]] = ev.target.value; save(); } else if (id === 'cvhg') { CV.hg = ev.target.checked; save(); } });
  box.addEventListener('click', ev => { const id = ev.target.id;
    if (id === 'colfbtn') { const pn = $('#colfp'); pn.hidden = !pn.hidden; ev.target.setAttribute('aria-expanded', String(!pn.hidden)); }
    else if (id === 'colreset' || id === 'colreset2') { const so = CV.so; CV = Object.assign({}, CV0, { so }); const op = !$('#colfp').hidden; box.innerHTML = ''; save(); if (op) { $('#colfp').hidden = false; } } });
}
function colSetMode(on) { colMode = on; store.set('colmode', on); colRender(); if (!on && !pkMode) render(); window.scrollTo(0, 0); }
// Modal: add (prefilled) or edit an entry. Origin game is fixed once added.
function colPokeOpts() { return E.filter(p => !p.bo).map(p => `<option value="${esc(fullN(p))} #${pad(p.id)}"></option>`).join(''); }
let COL_DL = false;
function colOpen(o) {
  const ed = o.id ? COLL.find(e => e.id === o.id) : null;
  const e = ed || { k: o.k || '', g: o.g || '', n: '', sh: false, sx: '', w: '' }; if (!ed && e.k && BY_KEY[e.k] && BY_KEY[e.k].mb) { e.mg = e.k; e.k = BY_KEY[e.k].mb; } // v53: ＋ on a Mega sheet = its base with Méga ticked
  const p = BY_KEY[e.k];
  if (!COL_DL) { COL_DL = true; const dl = document.createElement('datalist'); dl.id = 'colpk'; dl.innerHTML = colPokeOpts(); document.body.appendChild(dl); }
  const gopts = (sel, extra) => `<option value="">${extra ? '—' : 'Choisir le jeu…'}</option>` + colGames().map(([v, n]) => `<option value="${v}"${v === sel ? ' selected' : ''}>${esc(n)}</option>`).join('');
  const wv = e.w || (!ed && e.mg && !MEGA_GAMES.includes(e.g) ? '' : e.g) || '', wo = wv.startsWith('other:');
  const wopts = `<option value="">—</option><option value="home"${wv === 'home' ? ' selected' : ''}>Pokémon HOME</option>` + colGames().map(([v, n]) => `<option value="${v}"${v === wv ? ' selected' : ''}>${esc(n)}</option>`).join('') + `<option value="other"${wo ? ' selected' : ''}>Autre…</option>`;
  closeCol(); { const t = $('#toast'); if (t) t.classList.remove('on'); }
  const m = document.createElement('div'); m.id = 'colmodal'; m.className = 'colback';
  m.innerHTML = `<div class="colsheet" role="dialog" aria-modal="true" aria-labelledby="coltitle">
    <div class="menuhead"><h2 id="coltitle">${ed ? 'Mon Pokémon' : 'Ajouter à ma collection'}</h2><button type="button" class="menux" id="colx" aria-label="Fermer">✕</button></div>
    ${ed ? `<div class="colhero"><img src="${colImg(e)}" alt="" width="96" height="96"><div><b>${esc(fullN(p))}${colLvHTML(e)}</b>${colGoHTML(e)}${e.mg ? `<span class="cbad"><span class="cb mg">${esc(colMegaL(e.mg))}</span></span>` : ''}${e.b || e.cd || e.l ? `<small class="colcap">${e.b ? ballImg(e.b) + esc(BALL_N[e.b]) : ''}${e.b && (e.cd || e.l) ? ' · ' : ''}${e.cd || e.l ? 'Capturé' + (e.l ? ' : ' + esc(e.l) : '') + (e.cd ? ' le ' + colDate(e.cd) : '') : ''}</small>` : ''}${e.at ? `<small>Ajouté le ${new Date(e.at).toLocaleDateString('fr-FR')}</small>` : ''}${(e.h || []).filter(r => r.t === 'evo' && BY_KEY[r.from]).map(r => `<small class="colevo">A évolué de ${esc(fullN(BY_KEY[r.from]))}${r.d ? ' le ' + new Date(r.d).toLocaleDateString('fr-FR') : ''}</small>`).join('')}</div></div>
    ${e.gone ? `<div class="colgonebar"><span><b>Plus en votre possession</b> · ${esc(colGoneTxt(e.gone))}${e.gone.n ? `<br><i>${esc(e.gone.n)}</i>` : ''}</span><button type="button" id="cfrest" class="cfrest">Restaurer</button></div>` : ''}
    <div id="cfevow"></div><div id="cfevol" class="cfevol" hidden></div>` : ''}
    <form id="colform" novalidate>
      <label class="cf"><span>Pokémon <span class="req">*</span></span><input id="cfpk" list="${ed ? 'colpk' : 'colpkf'}" autocomplete="off" placeholder="Nom ou forme…" value="${p ? esc(fullN(p)) + ' #' + pad(p.id) : ''}"${ed ? ' disabled' : ''}></label>
      <label class="cf"><span>Jeu d’origine <span class="req">*</span></span><select id="cfg"${ed ? ' disabled' : ''}>${gopts(e.g)}</select>${ed ? '<small class="note">Le jeu d’origine ne change plus une fois ajouté.</small>' : ''}</label>
      <div class="cfrow"><label class="cf cfs">Surnom<input id="cfn" maxlength="40" autocomplete="off" value="${esc(e.n || '')}"></label>
        <label class="cf cflv" id="cflvw">Niveau<input id="cflv" type="number" inputmode="decimal" min="1" max="100" step="1" placeholder="1–100" value="${e.lv || ''}"></label></div>
      <div class="cfrow cfgo" id="cfgow" hidden><label class="cf">PC<input id="cfcp" type="number" inputmode="numeric" min="10" max="99999" step="1" value="${e.cp || ''}"></label>${['Attaque', 'Défense', 'PV'].map((t, i) => `<label class="cf cfiv">IV ${t}<input id="cfiv${i}" type="number" inputmode="numeric" min="0" max="15" step="1" placeholder="0–15" value="${e.iv ? e.iv[i] : ''}"></label>`).join('')}</div>
      <div class="cfrow"><label class="cfc"><input type="checkbox" id="cfsh"${e.sh ? ' checked' : ''}> ✨ Shiny</label>
        <label class="cf cfs">Sexe<select id="cfsx"><option value="">—</option></select></label></div>
      <div class="cfrow cfx"><label class="cfc" id="cfbnw" hidden><input type="checkbox" id="cfbn"${e.bn ? ' checked' : ''}> Baron</label><label class="cfc" id="cfgxw" hidden><input type="checkbox" id="cfgx"${e.gx ? ' checked' : ''}> Gigamax</label><label class="cfc cfmgl" id="cfmgw" title="Vous avez de quoi le faire méga-évoluer dans son jeu actuel" hidden><input type="checkbox" id="cfmg"${e.mg ? ' checked' : ''}> Peut méga-évoluer</label><select id="cfmgv" class="cfmgv" aria-label="Méga-évolution" hidden></select></div>
      <div class="cf"><span>Ball</span><div class="cfball"><span id="cfbi" class="cfbi">${ballImg(e.b) || ''}</span><select id="cfb"><option value="">—</option>${BALLS.map(([v, n]) => `<option value="${v}"${v === e.b ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></div></div>
      <div class="cfrow"><label class="cf cfs">Lieu de capture<input id="cfl" maxlength="80" autocomplete="off" placeholder="Ex. : Route 3" value="${esc(e.l || '')}"></label>
        <label class="cf cfd">Date de capture<input type="date" id="cfcd" value="${esc(e.cd || '')}"></label></div>
      <label class="cf">Jeu actuel<select id="cfw">${wopts}</select></label>
      <input id="cfwo" class="cfo" maxlength="60" placeholder="Précisez (ex. : Pokémon Bank)" value="${wo ? esc(wv.slice(6)) : ''}"${wo ? '' : ' hidden'}>
      ${ed ? `<fieldset class="cfgone"><legend>Plus en ma possession</legend>
        <label class="cf">Statut<select id="cfgs"><option value="">— Toujours à moi</option>${Object.entries(GONE_L).map(([v, n]) => `<option value="${v}"${e.gone && e.gone.s === v ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
        <div id="cfgx2"${e.gone ? '' : ' hidden'}><label class="cf">Date (facultatif)<input type="date" id="cfgd" value="${e.gone ? esc(e.gone.d) : ''}"></label>
        <label class="cf">Note (facultatif)<input id="cfgn" maxlength="120" autocomplete="off" placeholder="Ex. : échangé avec un ami contre un Évoli" value="${e.gone ? esc(e.gone.n) : ''}"></label>
        <small class="note">Le dex n’est pas modifié : Capturé reste coché.</small></div></fieldset>` : ''}
      <p id="cfnote" class="note cfnote" role="status" hidden></p>
      <p id="cferr" class="cferr" role="alert" hidden></p>
      <div class="cfbtns">${ed ? '<button type="button" id="cfdel" class="cfdel">Supprimer</button>' : ''}<button type="submit" id="cfok" class="cfok">${ed ? 'Enregistrer' : 'Ajouter'}</button></div>
    </form></div>`;
  if (!ed) m.insertAdjacentHTML('beforeend', '<datalist id="colpkf"></datalist>');
  document.body.appendChild(m); document.body.classList.add('colopen');
  const q = s => m.querySelector(s);
  m.addEventListener('click', ev => { if (ev.target === m) closeCol(); });
  q('#colx').onclick = closeCol;
  // v49b: gender from the species ratio (sp.gr), Baron / Gigamax only where the dex allows them
  let updTok = 0;
  const upd = async () => {
    const tk = ++updTok, pk = ed ? p : findPk(q('#cfpk').value), sx = q('#cfsx'); let g = ed ? e.g : q('#cfg').value;
    const cur = sx.value || e.sx || ''; let gr = null;
    if (pk) try { gr = (await loadSp(pk.id)).gr; } catch {} if (tk !== updTok) return;
    const opts = gr === -1 ? ['x'] : gr === 0 ? ['m'] : gr === 8 ? ['f'] : gr == null ? ['m', 'f', 'x'] : ['m', 'f'];
    sx.innerHTML = (gr === -1 ? '' : '<option value="">—</option>') + opts.map(v => `<option value="${v}">${SEX_L[v]}</option>`).join('');
    sx.value = gr === -1 ? 'x' : opts.includes(cur) ? cur : ''; sx.disabled = gr === -1;
    const msg = []; if (!ed) { colFilter(q, pk, msg); g = q('#cfg').value; }
    { const bs = q('#cfb'), bc = bs.value, ok = colBalls(g); if (bs.dataset.g !== (g || '')) { bs.dataset.g = g || ''; // v53c: only the Balls of the origin game
      bs.innerHTML = '<option value="">—</option>' + ok.map(([v, n]) => `<option value="${v}">${esc(n)}</option>`).join('');
      if (ok.some(([v]) => v === bc)) bs.value = bc; else if (bc) { msg.push(`Ball effacée : la ${BALL_N[bc]} n’existe pas dans ${colGName(g)}.`); } q('#cfbi').innerHTML = ballImg(bs.value); } }
    const wsl = q('#cfw'), mgOn = q('#cfmg').checked;
    if (!ed && g && g !== wsl.dataset.auto && (!wsl.value || wsl.value === wsl.dataset.auto) && !(mgOn && !MEGA_GAMES.includes(g))) { wsl.value = g; wsl.dataset.auto = g; q('#cfwo').hidden = true; } // v53b: Jeu actuel defaults to the origin game
    [...wsl.options].forEach(o => { o.disabled = mgOn && !!o.value && !(MEGA_GAMES.includes(o.value) && (!pk || colMegasIn(pk, o.value).length)); }); // Méga ticked first: only Mega-capable current games
    { const lw = q('#cfw').value === 'go', li = q('#cflv'); li.max = lw ? 50 : 100; li.step = lw ? 0.5 : 1; li.placeholder = lw ? '1–50' : '1–100'; } // v53c: GO level 1–50 (half levels)
    q('#cfgow').hidden = wsl.value !== 'go'; // v53c: PC / IV only in GO
    const w = wsl.value, bOk = colBVis(pk, g), gOk = colGVis(pk, g), mgs = pk ? (w ? colMegasCur(pk, w) : colMegasIn(pk, '')) : [], mOk = pk ? mgs.length > 0 : (!w || MEGA_GAMES.includes(w));
    if (!mOk && mgOn && pk) msg.push('« Peut méga-évoluer » décoché : impossible pour ce Pokémon dans son jeu actuel.');
    q('#cfmgw').hidden = !mOk; if (!mOk) q('#cfmg').checked = false;
    const mv = q('#cfmgv'), mcur = mv.value || (pk && pk.mb ? pk.k : e.mg) || ''; mv.innerHTML = mgs.map(m => `<option value="${m.k}">${esc(m.l || 'Méga')}</option>`).join('');
    if (mgs.some(m => m.k === mcur)) mv.value = mcur; mv.hidden = !(q('#cfmg').checked && mgs.length > 1);
    if (!bOk && q('#cfbn').checked) msg.push('Baron décoché : impossible pour ce Pokémon dans ce jeu.');
    if (!gOk && q('#cfgx').checked && !q('#cfgx').disabled) msg.push('Gigamax décoché : impossible pour ce Pokémon dans ce jeu.');
    q('#cfbnw').hidden = !bOk; q('#cfgxw').hidden = !gOk; if (!bOk) q('#cfbn').checked = false; if (!gOk) q('#cfgx').checked = false;
    const nt = q('#cfnote'); if (msg.length) { nt.hidden = false; nt.textContent = msg.join(' '); } else if (!nt.dataset.keep) nt.hidden = true;
    if (gOk && isGmx(pk)) { q('#cfgx').checked = true; q('#cfgx').disabled = true; } else q('#cfgx').disabled = false;
  };
  q('#cfpk').addEventListener('change', upd); q('#cfpk').addEventListener('input', () => { if (findPk(q('#cfpk').value)) upd(); }); q('#cfg').addEventListener('change', upd); q('#cfbn').addEventListener('change', upd); q('#cfgx').addEventListener('change', upd); q('#cfmg').addEventListener('change', upd);
  q('#cfb').onchange = () => { q('#cfbi').innerHTML = ballImg(q('#cfb').value); };
  q('#cfw').onchange = () => { q('#cfwo').hidden = q('#cfw').value !== 'other'; upd(); };
  const findPk = v => { const mm = /#(\d{4})\s*$/.exec(v); const t = norm(v.replace(/#\d+\s*$/, '').trim()); if (!t) return null;
    return E.find(p => !p.bo && norm(fullN(p)) === t && (!mm || p.id === +mm[1])) || E.find(p => !p.bo && p.nn === t) || null; };
  upd();
  if (ed) {
    q('#cfgs').onchange = () => { q('#cfgx2').hidden = !q('#cfgs').value; };
    const rs = q('#cfrest'); if (rs) rs.onclick = () => { delete ed.gone; ed.up = new Date().toISOString(); colSave(); colRender(); colOpen({ id: ed.id }); toast('Pokémon remis dans votre collection.'); };
    colEvos(p, e.sx).then(ev => { const w = q('#cfevow'); if (!ev.length || !w || !w.isConnected) return;
      w.innerHTML = '<button type="button" id="cfevo" class="cfevo">Faire évoluer</button>';
      q('#cfevo').onclick = () => { const l = q('#cfevol'); l.hidden = !l.hidden; if (l.hidden) return;
        l.innerHTML = '<p class="cfevoh">En quel Pokémon a-t-il évolué ?</p>' + ev.map(x => `<button type="button" class="colrow cfevopick" data-evo="${esc(x.p.k)}" data-sx="${x.sx}"><img src="${e.sh && x.p.sh ? `img/s/${x.p.k}.webp` : artOf(x.p)}" alt="" width="48" height="48"><span class="ct"><b>${esc(fullN(x.p))}</b>${x.how.length ? `<small>${esc(x.how.join(', '))}</small>` : ''}</span></button>`).join('') + '<small class="note">Le jeu d’origine, le surnom, le Shiny et le sexe sont conservés. Capturé est coché pour la nouvelle espèce.</small>';
        l.querySelectorAll('[data-evo]').forEach(bt => bt.onclick = async () => { const np = BY_KEY[bt.dataset.evo]; const op = await colEvolve(ed, np, bt.dataset.sx || '');
          colRender(); if (DET && DET.p && !$('#detail-view').hidden) { try { refreshTrack(DET.p); } catch {} } if (!colMode) render();
          colOpen({ id: ed.id }); toast(`${fullN(op)} a évolué en ${fullN(np)} · Capturé coché dans ${colGName(ed.g)}.`); }); };
    }).catch(() => {});
    const del = q('#cfdel'); del.onclick = () => {
    if (del.dataset.c !== '1') { del.dataset.c = '1'; del.textContent = 'Confirmer la suppression ?'; del.classList.add('on'); return; }
    COLL = COLL.filter(x => x.id !== ed.id); colSave(); closeCol(); colRender(); toast('Pokémon retiré de votre collection (le dex n’est pas modifié).'); }; }
  q('#colform').onsubmit = ev => {
    ev.preventDefault();
    const pk = ed ? p : findPk(q('#cfpk').value), g = ed ? e.g : q('#cfg').value, err = [];
    if (!pk) err.push('choisissez un Pokémon de la liste'); if (!colOrigOk(g)) err.push('choisissez le jeu d’origine');
    const er = q('#cferr'); q('#cfpk').classList.toggle('bad', !pk); q('#cfg').classList.toggle('bad', !colOrigOk(g));
    const lgo = q('#cfw').value === 'go', lvr = q('#cflv').value.trim().replace(',', '.'), lv = !lvr ? 0 : +lvr; if (lvr && !colLvOk(lv, lgo)) err.push(lgo ? 'le niveau GO va de 1 à 50 (demi-niveaux possibles, ex. 40,5)' : 'le niveau doit être un nombre entier de 1 à 100');
    const cpr = lgo ? q('#cfcp').value.trim() : '', cp = cpr ? +cpr : 0; if (cpr && !(Number.isInteger(cp) && cp >= 10 && cp <= 99999)) err.push('les PC doivent être un nombre entier de 10 à 99 999');
    const ivr = lgo ? [0, 1, 2].map(i => q('#cfiv' + i).value.trim()) : ['', '', ''], ivn = ivr.filter(Boolean).length, iv = ivr.map(Number);
    if (ivn && (ivn < 3 || !colIvOk(iv))) err.push('les IV demandent les trois valeurs Attaque, Défense et PV, chacune de 0 à 15');
    { const ws = q('#cfw').value; if (!q('#cfmgw').hidden && q('#cfmg').checked && pk && !colMegasCur(pk, ws).length) err.push('choisissez un jeu actuel où il peut méga-évoluer'); }
    if (err.length) { er.hidden = false; er.textContent = cap(err.join(' et ')) + '.'; return; }
    const wsel = q('#cfw').value, w = wsel === 'other' ? (q('#cfwo').value.trim() ? 'other:' + q('#cfwo').value.trim() : '') : wsel;
    const x = { n: q('#cfn').value.trim(), sh: q('#cfsh').checked, sx: q('#cfsx').value, w, bn: !q('#cfbnw').hidden && q('#cfbn').checked, gx: !q('#cfgxw').hidden && q('#cfgx').checked };
    { const mgs = colMegasCur(pk, w), on = !q('#cfmgw').hidden && q('#cfmg').checked && mgs.length; x.mg = on ? (mgs.find(m => m.k === q('#cfmgv').value) || mgs[0]).k : '';
      x.b = q('#cfb').value; x.l = q('#cfl').value.trim().slice(0, 80); x.cd = q('#cfcd').value || ''; x.lv = lv || ''; x.cp = cp || ''; x.iv = ivn === 3 ? iv : ''; for (const kk of ['mg', 'b', 'l', 'cd', 'lv', 'cp', 'iv']) if (!x[kk]) { x[kk] = undefined; if (ed) delete ed[kk]; } }
    const bk = colMegaBase(pk) || pk;
    if (ed) { const gs = q('#cfgs').value; if (gs) ed.gone = { s: gs, d: q('#cfgd').value || '', n: q('#cfgn').value.trim().slice(0, 120) }; else delete ed.gone;
      for (const kk in x) if (x[kk] === undefined) delete x[kk]; Object.assign(ed, x, { up: new Date().toISOString() }); if (x.sh || x.bn || x.gx || x.mg) colTickDex(pk, g, x.sh, x.bn, x.gx, x.mg, w); }
    else { for (const kk in x) if (x[kk] === undefined) delete x[kk]; COLL.push({ id: colId(), k: bk.k, g, ...x, at: new Date().toISOString() }); colTickDex(bk, g, x.sh, x.bn, x.gx, x.mg, w); }
    colSave(); closeCol(); colRender();
    if (DET && DET.p && !$('#detail-view').hidden) { try { refreshTrack(DET.p); } catch {} }
    if (!colMode) render();
    toast(ed ? 'Modifications enregistrées.' : `${fullN(bk)} ajouté à votre collection · Capturé coché dans ${colGName(g)}.`);
  };
  setTimeout(() => (ed ? q('#cfn') : (p ? q('#cfg') : q('#cfpk'))).focus({ preventScroll: true }), 30);
}
// v49c: cross-filtering of the add window (availability from core data: game bitmask, GO flag) + Baron / Gigamax constraints
const GMAX_GAMES = ['sw', 'swisle', 'swcrown', 'go'];
const colAvail = (p, g) => g === 'go' ? !!(p.go || (isGmx(p) && gmaxInGame(p, 'go'))) : GIDX[g] != null && inGame(p, GIDX[g]);
const colBVis = (pk, g) => pk && g ? colBaronOk(pk, g) : pk ? [...ALPHA_GAMES].some(a => colBaronOk(pk, a)) : g ? ALPHA_GAMES.has(g) : true;
const colGVis = (pk, g) => pk && g ? !!colGmax(pk, g) : pk ? GMAX_GAMES.some(x => colGmax(pk, x)) : g ? GMAX_GAMES.includes(g) : true;
const colPkOk = (p, g, bn, gx, mg, w) => !p.bo && (!mg || (MEGA_GAMES.includes(w) ? colMegasIn(p, w) : colMegasIn(p, '')).length > 0) && (!g || colAvail(p, g)) && (!bn || (g ? colBaronOk(p, g) : [...ALPHA_GAMES].some(a => colBaronOk(p, a)))) && (!gx || (g ? !!colGmax(p, g) : GMAX_GAMES.some(x => colGmax(p, x))));
const colGOk = (g, pk, bn, gx, mg) => (!pk || colAvail(pk, g) || (!!pk.mb && colAvail(colMegaBase(pk), g))) && (!bn || (ALPHA_GAMES.has(g) && (!pk || colBaronOk(pk, g)))) && (!gx || (GMAX_GAMES.includes(g) && (!pk || !!colGmax(pk, g))));
function colFilter(q, pk, msg) {
  const sel = q('#cfg'), bn = q('#cfbn').checked, gx = q('#cfgx').checked && !q('#cfgx').disabled, mg = q('#cfmg').checked, cur = sel.value;
  const gs = colGames().filter(([v]) => colGOk(v, pk, bn, gx));
  sel.innerHTML = '<option value="">Choisir le jeu…</option>' + gs.map(([v, n]) => `<option value="${v}">${esc(n)}</option>`).join('');
  if (cur && gs.some(([v]) => v === cur)) sel.value = cur;
  else if (cur) { sel.value = ''; msg.push(`Jeu d’origine effacé : ${pk ? fullN(pk) : 'ce Pokémon'} n’est pas disponible dans ${colGName(cur)}.`); }
  const g = sel.value, w = q('#cfw').value, key = [g, bn, gx, mg, w].join('|'), dl = q('#colpkf');
  if (dl.dataset.k !== key) { dl.dataset.k = key; dl.innerHTML = E.filter(p => colPkOk(p, g, bn, gx, mg, w) && !(mg && p.mb)).map(p => `<option value="${esc(fullN(p))} #${pad(p.id)}"></option>`).join(''); }
  q('#cfpk').placeholder = g || bn || gx || mg ? `Nom ou forme (${dl.options.length} possibles)…` : 'Nom ou forme…';
}
function closeCol() { const m = $('#colmodal'); if (m) m.remove(); document.body.classList.remove('colopen'); }
function colInit() {
  const seg = $('#modeseg'); if (seg) seg.addEventListener('click', e => { const b = e.target.closest('button'); if (b) pkSetMode(b.dataset.m); });
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-add]');
    if (a) { e.preventDefault(); e.stopPropagation();
      const onSheet = !$('#detail-view').hidden, c = onSheet ? sheetCtx() : trackCtx();
      colOpen({ k: a.dataset.add, g: c && colOrigOk(c) ? c : '' }); return; }
    if (e.target.closest('.colnew')) { e.preventDefault(); colOpen({}); return; }
    const r = e.target.closest('[data-cid]'); if (r && !e.target.closest('#colmodal')) { e.preventDefault(); colOpen({ id: r.dataset.cid }); }
  }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#colmodal')) closeCol(); else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.cadd')) { e.preventDefault(); e.target.click(); } });
  addEventListener('hashchange', closeCol);
  colToolsInit();
  colRender();
}

/* ---------------- v50: Cartodex Pokémon TCG Pocket (data/pocket.json from TCGdex; card images loaded on demand from assets.tcgdex.net) ---------------- */
// Storage « pocket »: array of owned card ids "A1-001". Mode « Pocket » = third segment next to Dex | Collection.
let PK = null, PKP = null, pkMode = store.get('pkmode', false) === true, pkSet = '', pkOwn = 'all', pkRar = new Set(), pkBoo = -1, PK_REV = new Map();
// v50b: « pocket » = { cardId: { lang: count } }. Old format (array of ids, v50 preview) → 1 copy in French.
const PK_LANGS = [['fr', 'FR', 'Français'], ['en', 'EN', 'Anglais'], ['ja', 'JA', 'Japonais'], ['de', 'DE', 'Allemand'], ['it', 'IT', 'Italien'], ['es', 'ES', 'Espagnol'], ['pt', 'PT', 'Portugais (Brésil)'], ['ko', 'KO', 'Coréen'], ['zh', 'ZH', 'Chinois traditionnel']];
const PK_LS = new Set(PK_LANGS.map(l => l[0])), PK_ID = /^[A-Za-z0-9-]+-[A-Za-z0-9]+$/;
function pkNorm(raw) { // → clean map; arrays (old format) give 1 French copy per id
  const out = {};
  if (Array.isArray(raw)) { for (const x of raw) if (typeof x === 'string' && PK_ID.test(x)) out[x] = { fr: 1 }; return out; }
  if (raw && typeof raw === 'object') for (const [id, m] of Object.entries(raw)) if (PK_ID.test(id) && m && typeof m === 'object') {
    const q = {}; for (const [l, n] of Object.entries(m)) if (PK_LS.has(l) && Number.isInteger(n) && n > 0) q[l] = Math.min(n, 999); if (Object.keys(q).length) out[id] = q; }
  return out;
}
const PKQ = pkNorm(store.get('pocket', {}));
if (Array.isArray(store.get('pocket', null))) store.set('pocket', PKQ); // one-time migration
let pkLang = PK_LS.has(store.get('pklang', 'fr')) ? store.get('pklang', 'fr') : 'fr';
const pkSave = () => store.set('pocket', PKQ);
const pkN = id => { const m = PKQ[id]; return m ? Object.values(m).reduce((a, n) => a + n, 0) : 0; };
const PKO = { has: id => pkN(id) > 0 };
function pkAdd(id, l, d) { const m = PKQ[id] || (PKQ[id] = {}); const n = Math.max(0, Math.min(999, (m[l] || 0) + d)); if (n) m[l] = n; else delete m[l]; if (!Object.keys(m).length) delete PKQ[id]; pkSave(); }
function pkMerge(raw) { const inc = pkNorm(raw); for (const [id, m] of Object.entries(inc)) { const t = PKQ[id] || (PKQ[id] = {}); for (const [l, n] of Object.entries(m)) t[l] = Math.max(t[l] || 0, n); } if (PK) pkAlias(); pkSave(); pkRender(); const mp = $('#mypocket'); if (mp && DET && DET.p) pkSheet(DET.p); }
// v52: card field 6 = booster indices into set.b; field 7 = original card id for Deluxe reprints (A4b, B4b) that the game treats as the
// same card (shared copies, registered in every card dex since 2026-07). c.k = ownership key. Parallel foils / new art keep their own id.
const pkLoad = () => PKP || (PKP = getJSON('data/pocket.json').then(d => { PK = d; PK_REV = new Map();
  for (const s of d.s) for (const c of s.cards) { c.id = s.id + '-' + c[0]; c.k = c[7] || c.id; if (c[7]) { if (!PK_REV.has(c[7])) PK_REV.set(c[7], []); PK_REV.get(c[7]).push([s, c]); } }
  if (pkAlias()) pkSave(); return d; }).catch(e => { PKP = null; throw e; }));
// copies stored on a Deluxe reprint id (before v52, or from an old backup) move to the original id: max per language
// (the same copy may have been ticked in both places; a sum would count it twice).
function pkAlias() { let ch = false; for (const s of PK.s) for (const c of s.cards) if (c[7] && PKQ[c.id]) { const t = PKQ[c[7]] || (PKQ[c[7]] = {}); for (const [l, n] of Object.entries(PKQ[c.id])) t[l] = Math.max(t[l] || 0, n); delete PKQ[c.id]; ch = true; } return ch; }
const pkUniq = s => s.cards.filter(c => !c[7]); // global / block totals: a reprint is not a second card
// rarity index → short symbol (◆ diamonds, ☆ stars, ✨ chromatiques, 👑 couronne, Promo = sans rareté)
const PK_SYM = ['◆', '◆◆', '◆◆◆', '◆◆◆◆', '☆', '☆☆', '☆☆☆', '✨', '✨✨', '👑', 'Promo'];
// v50c: image source 0 TCGdex EN, 1 TCGdex FR, 2 none, 3 Limitless TCG (English, sets missing from TCGdex)
const PK_LL = 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/pocket/';
const pkImg = (s, c, q = 'low') => c[5] === 2 ? '' : c[5] === 3 ? `${PK_LL}${s.id}/${s.id}_${c[0]}_EN${q === 'low' ? '_SM' : ''}.webp` : `${PK.img}${c[5] ? 'fr' : 'en'}/tcgp/${s.id}/${c[0]}/${q}.webp`;
const pkPct = (a, b) => b ? Math.floor(a / b * 1000) / 10 : 0;
const pkCnt = (s, cs = s.cards) => cs.reduce((a, c) => a + PKO.has(c.k), 0);
const pkBar = (a, b) => `<div class="pkbar" role="progressbar" aria-valuemin="0" aria-valuemax="${b}" aria-valuenow="${a}"><i style="width:${pkPct(a, b)}%"></i></div>`;
function pkCardHTML(s, c, withSet) {
  const n = pkN(c.k), o = n > 0, im = pkImg(s, c);
  return `<div class="pkcard${o ? ' own' : ''}${c[7] ? ' pkrep' : ''}" data-pk="${c.k}"><button type="button" class="pkim" data-pkv="${c.id}" aria-label="Voir ${esc(c[1])}">${im ? `<img src="${im}" alt="" loading="lazy" decoding="async" width="245" height="337">` : `<span class="pkno">${esc(c[1])}</span>`}${n ? `<b class="pkq">×${n}</b>` : ''}</button>` +
    `<div class="pkln"><span class="pkid">${withSet ? esc(s.id) + ' ' : ''}${esc(c[0])}</span><span class="pkr r${c[2]}">${PK_SYM[c[2]]}</span><button type="button" class="pktk" data-pkt="${c.k}" aria-label="Ajouter 1 exemplaire (${pkLangName()}) : ${esc(c[1])}">＋</button></div></div>`;
}
// v51: sets grouped by block (« Série A », « Série B »… as on Poképédia), newest block first, sets newest first, promo set last
const pkBlk = x => /^P-/.test(x.id) ? x.id.slice(2, 3) : x.id[0];
let PK_FOLD = new Set(store.get('pkfold', []) || []);
function pkSetRow(x) { const n = pkCnt(x); return `<li><button type="button" class="pkset${n === x.cards.length ? ' done' : ''}" data-pks="${x.id}"><span class="pksn"><b>${esc(x.n)}</b><small>${esc(x.id)}${x.d ? ' · ' + new Date(x.d + 'T12:00:00').toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }) : ''}</small></span><span class="pksc">${n} / ${x.cards.length}</span>${pkBar(n, x.cards.length)}</button></li>`; }
function pkBlocks() {
  const bl = [...new Set(PK.s.map(pkBlk))].sort().reverse();
  return bl.map(b => { const ss = PK.s.filter(x => pkBlk(x) === b).sort((x, y) => (/^P-/.test(x.id) - /^P-/.test(y.id)) || (y.d || '').localeCompare(x.d || '') || y.id.localeCompare(x.id));
    const t = ss.reduce((a, x) => a + pkUniq(x).length, 0), n = ss.reduce((a, x) => a + pkCnt(x, pkUniq(x)), 0);
    return `<details class="pkblk" data-blk="${b}"${PK_FOLD.has(b) ? '' : ' open'}><summary><span class="pkbn"><b>Série ${b}</b><small>${ss.length} extensions</small></span><span class="pksc">${n} / ${t}</span>${pkBar(n, t)}</summary><ul class="plain pksets">${ss.map(pkSetRow).join('')}</ul></details>`; }).join('');
}
function pkRender() {
  const box = $('#pocket'); if (!box) return;
  box.hidden = !pkMode; if (!pkMode) return;
  if (!PK) { box.innerHTML = '<p class="note">Chargement des cartes…</p>'; pkLoad().then(pkRender).catch(() => { box.innerHTML = '<p class="note">Impossible de charger les cartes Pocket (hors ligne ?).</p>'; }); return; }
  const all = PK.s.reduce((a, s) => a + pkUniq(s).length, 0), own = PK.s.reduce((a, s) => a + pkCnt(s, pkUniq(s)), 0);
  const credit = `<p class="note pkcred">Données et images : <a href="https://tcgdex.dev" target="_blank" rel="noopener">TCGdex</a>, <a href="https://pocket.limitlesstcg.com" target="_blank" rel="noopener">Limitless TCG</a> et <a href="https://www.pokekalos.fr" target="_blank" rel="noopener">Pokékalos</a> (extensions récentes). Pokémon TCG Pocket © The Pokémon Company / Nintendo / Creatures / GAME FREAK / DeNA.</p>`;
  const s = pkSet && PK.s.find(x => x.id === pkSet);
  if (!s) {
    box.innerHTML = `<div class="pkhead"><h2>Cartodex Pocket</h2><p><b>${own}</b> / ${all} cartes · ${dec(pkPct(own, all))} %</p>${pkBar(own, all)}</div>` +
      pkBlocks() + credit;
    return;
  }
  const rs = [...new Set(s.cards.map(c => c[2]))].sort((a, b) => a - b);
  const nb = (s.b || []).length; if (pkBoo >= nb) pkBoo = -1;
  const list = s.cards.filter(c => (!pkRar.size || pkRar.has(c[2])) && (pkBoo < 0 || (c[6] || []).includes(pkBoo)) && (pkOwn === 'all' || (pkOwn === 'dup' ? pkN(c.k) >= 2 : (pkOwn === 'own') === PKO.has(c.k))));
  const rep = s.cards.filter(c => c[7]).length;
  const n = pkCnt(s);
  box.innerHTML = `<div class="pkhead"><button type="button" class="pkback" data-pks="">← Extensions</button><h2>${esc(s.n)}</h2><p><b>${n}</b> / ${s.cards.length} cartes · ${dec(pkPct(n, s.cards.length))} %${s.o && s.o < s.cards.length ? ` <small>(${s.o} de base + ${s.cards.length - s.o} secrètes)</small>` : ''}</p>${pkBar(n, s.cards.length)}${rep ? `<p class="note pkrepn">${rep} cartes sont des rééditions identiques d’une carte d’une autre extension : le jeu les considère comme la même carte, vos exemplaires sont donc partagés (et comptés une seule fois dans les totaux).</p>` : ''}</div>` +
    `<div class="pkfil"><div class="seg" id="pkown">${[['all', 'Toutes'], ['own', 'Possédées'], ['miss', 'Manquantes'], ['dup', 'Doublons']].map(([v, t]) => `<button type="button" data-pko="${v}" aria-pressed="${pkOwn === v}">${t}</button>`).join('')}</div>` +
    `<div class="pkrar" id="pkrar">${rs.map(r => `<button type="button" class="chip pkr r${r}" data-pkr="${r}" aria-pressed="${pkRar.has(r)}" title="${esc(PK.r[r])}">${PK_SYM[r]}</button>`).join('')}</div>` +
    (nb > 1 ? `<div class="pkboo" id="pkboo" role="group" aria-label="Filtrer par booster"><button type="button" class="chip" data-pkb="-1" aria-pressed="${pkBoo < 0}">Tous les boosters</button>${s.b.map((b, i) => `<button type="button" class="chip" data-pkb="${i}" aria-pressed="${pkBoo === i}">${esc(b)} <small>${s.cards.filter(c => (c[6] || []).includes(i)).length}</small></button>`).join('')}</div>` : '') + `</div>` +
    `<p class="note pkcnt">${list.length} carte${list.length > 1 ? 's' : ''} affichée${list.length > 1 ? 's' : ''}</p><div class="pkgrid">${list.map(c => pkCardHTML(s, c)).join('')}</div>` + credit;
}
function pkSetMode(m) { // m: 'dex' | 'col' | 'pk'
  pkMode = m === 'pk'; store.set('pkmode', pkMode);
  document.body.classList.toggle('pkmode', pkMode);
  colSetMode(m === 'col'); pkSeg(); pkRender();
}
function pkSeg() { document.querySelectorAll('#modeseg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.m === (pkMode ? 'pk' : colMode ? 'col' : 'dex')))); }
const pkLangName = () => PK_LANGS.find(l => l[0] === pkLang)[2];
function pkToggle(id) { pkAdd(id, pkLang, 1); pkRefresh(id); toast(`+1 exemplaire en ${pkLangName()} (×${pkN(id)}). Touchez la carte pour gérer les langues.`); }
function pkRefresh(id) {
  if (pkMode) { const y = scrollY; pkRender(); scrollTo(0, y); }
  const mp = $('#mypocket'); if (mp && DET && DET.p) pkSheet(DET.p);
  const st = $('#pksteps'); if (st && st.dataset.id === id) st.outerHTML = pkStepsHTML(id);
}
function pkStepsHTML(id) {
  const m = PKQ[id] || {};
  return `<div id="pksteps" data-id="${id}"><p class="pktot">Total : <b>${pkN(id)}</b> exemplaire${pkN(id) > 1 ? 's' : ''}</p><ul class="plain pklangs">${PK_LANGS.map(([l, c, n]) => `<li class="${m[l] ? 'on' : ''}"><span class="pklc">${c}</span><span class="pkln2">${n}</span><button type="button" class="pkst" data-pkl="${l}" data-d="-1" aria-label="Retirer un exemplaire en ${n}"${m[l] ? '' : ' disabled'}>−</button><b class="pkn">${m[l] || 0}</b><button type="button" class="pkst" data-pkl="${l}" data-d="1" aria-label="Ajouter un exemplaire en ${n}">+</button></li>`).join('')}</ul><p class="note">Le bouton ＋ des grilles ajoute en ${pkLangName()} (dernière langue utilisée).</p></div>`;
}
// v52: « Boosters : Mewtwo, Dracaufeu » (+ Deluxe reprints of the same card); promo sets: « Source : … »
function pkBooHTML(s, c) {
  const promo = /^P-/.test(s.id), own = (c[6] || []).map(i => s.b[i]), out = [];
  if (c[7]) { const [os, oc] = pkFind(c[7]) || []; if (oc) { const ob = (oc[6] || []).map(i => os.b[i]);
    out.push(`<p class="pkboos">Même carte que <b>${esc(os.n)}</b> n° ${esc(oc[0])} : le jeu la considère comme une seule carte, les exemplaires sont partagés.</p>`);
    if (ob.length) own.unshift(...ob.map(b => `${b} (${os.id})`)); } }
  for (const [ds, dc] of PK_REV.get(c.id) || []) own.push(`${(ds.b && ds.b[0]) || ds.n} (${ds.id} n° ${dc[0]})`);
  out.unshift(own.length ? `<p class="pkboos"><b>${promo ? 'Source' : own.length > 1 ? 'Boosters' : 'Booster'} :</b> ${own.map(esc).join(', ')}</p>` : promo ? '<p class="pkboos note">Source : non renseignée (événement, mission ou boutique).</p>' : '');
  return out.join('');
}
const pkFind = id => { const i = id.lastIndexOf('-'), s = PK.s.find(x => x.id === id.slice(0, i)), c = s && s.cards.find(x => x.id === id); return c ? [s, c] : null; };
function pkView(id) {
  const [sid] = id.split('-'), s = PK.s.find(x => x.id === id.slice(0, id.lastIndexOf('-'))) || PK.s.find(x => x.id === sid), c = s && s.cards.find(x => x.id === id); if (!c) return;
  const sp = c[3].map(d => E.find(p => p.id === d && !p.c)).filter(Boolean);
  closeCol(); const m = document.createElement('div'); m.id = 'colmodal'; m.className = 'colback';
  m.innerHTML = `<div class="colsheet pkbig" role="dialog" aria-modal="true" aria-labelledby="pktitle"><div class="menuhead"><h2 id="pktitle">${esc(c[1])}</h2><button type="button" class="menux" id="colx" aria-label="Fermer">✕</button></div>
    ${pkImg(s, c) ? `<img class="pkhi" src="${pkImg(s, c, 'high')}" alt="${esc(c[1])}">` : ''}<p><b>${esc(s.n)}</b> · n° ${esc(c[0])} · ${esc(PK.r[c[2]])} <span class="pkr r${c[2]}">${PK_SYM[c[2]]}</span></p>
    ${sp.length ? `<p>${sp.map(p => `<a href="#/p/${p.k}">Voir la fiche ${esc(fullN(p))}</a>`).join(' · ')}</p>` : ''}
    ${pkBooHTML(s, c)}
    ${pkStepsHTML(c.k)}</div>`;
  document.body.appendChild(m); document.body.classList.add('colopen');
  m.addEventListener('click', ev => { if (ev.target === m) closeCol(); }); m.querySelector('#colx').onclick = closeCol;
}
function pkSheet(p) {
  const box = $('#mypocket'); if (!box) return;
  pkLoad().then(() => { if (!box.isConnected) return;
    const cs = []; for (const s of PK.s) for (const c of s.cards) if (c[3].includes(p.id) && !c[7]) cs.push([s, c]);
    if (!cs.length) { box.innerHTML = ''; return; }
    const n = cs.filter(([, c]) => PKO.has(c.k)).length, tot = cs.reduce((a, [, c]) => a + pkN(c.k), 0);
    setTimeout(applyFolds, 0); box.innerHTML = `<section class="box pkbox"><h2>Cartes Pocket <small class="cnt">${n} / ${cs.length}${tot > n ? ` · ${tot} exemplaires` : ''}</small></h2><div class="pkgrid pkmini">${cs.slice().reverse().map(([s, c]) => pkCardHTML(s, c, true)).join('')}</div><p class="note">Touchez ＋ pour cocher une carte possédée. Données : TCGdex.</p></section>`;
  }).catch(() => { box.innerHTML = ''; });
}
function pkInit() {
  document.body.classList.toggle('pkmode', pkMode); if (pkMode && colMode) colSetMode(false);
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-pkt]'); if (t) { e.preventDefault(); e.stopPropagation(); pkToggle(t.dataset.pkt); return; }
    const st = e.target.closest('[data-pkl]'); if (st) { e.preventDefault(); e.stopPropagation(); const id = st.closest('#pksteps').dataset.id, d = +st.dataset.d;
      if (d > 0) { pkLang = st.dataset.pkl; store.set('pklang', pkLang); } pkAdd(id, st.dataset.pkl, d); pkRefresh(id); return; }
    const v = e.target.closest('[data-pkv]'); if (v) { e.preventDefault(); pkView(v.dataset.pkv); return; }
    const s = e.target.closest('[data-pks]'); if (s) { e.preventDefault(); pkSet = s.dataset.pks; pkRar.clear(); pkOwn = 'all'; pkBoo = -1; pkRender(); window.scrollTo(0, 0); return; }
    const o = e.target.closest('[data-pko]'); if (o) { pkOwn = o.dataset.pko; pkRender(); return; }
    const b = e.target.closest('[data-pkb]'); if (b) { pkBoo = +b.dataset.pkb; pkRender(); return; }
    const r = e.target.closest('[data-pkr]'); if (r) { const k = +r.dataset.pkr; pkRar.has(k) ? pkRar.delete(k) : pkRar.add(k); pkRender(); }
  }, true);
  document.addEventListener('toggle', e => { const d = e.target; if (!d.classList || !d.classList.contains('pkblk')) return; d.open ? PK_FOLD.delete(d.dataset.blk) : PK_FOLD.add(d.dataset.blk); store.set('pkfold', [...PK_FOLD]); }, true);
  pkSeg(); pkRender();
}

/* ---------------- v59: « Classements » (PvP PvPoke, raids, Combats Max) ---------------- */
let RANKD = null;
const RK = Object.assign({ s: 'pvp', lg: 'g', sh: 1, rv: 'g', boss: '', ty: 'dragon', ro: 'A', mv: 'g', mb: '', q: '' }, store.get('rank', {}));
async function loadRank() { if (!RANKD) RANKD = Promise.all([loadGo(), getJSON('data/rank-pvp.json'), getJSON('data/rank-raid.json'), getJSON('data/rank-max.json').catch(() => null)]).then(([go, pv, rd, mx]) => ({ go, pv, rd, mx })).catch(e => { RANKD = null; throw e; }); return RANKD; }
const rkSeg = (k, opts) => `<div class="seg rkseg" role="group">${opts.map(([v, l]) => `<button type="button" data-rk="${k}" data-v="${v}" aria-pressed="${RK[k] === v}">${l}</button>`).join('')}</div>`;
function rkRow(i, k, sh, sub, right, tag) {
  const p = BY_KEY[k]; const nm = p ? fullN(p) : k;
  return `<li><a class="rkrow" href="#/p/${p ? p.k : k}" data-go="1"><span class="rkn">${i}</span>${p ? `<img src="${artOf(p)}" alt="" loading="lazy" width="44" height="44">` : '<span class="rkimg"></span>'}<span class="rkm"><b>${esc(nm)}${sh ? ' <span class="rksh">Obscur</span>' : ''}${tag || ''}</b><span class="rkty">${p ? p.t.map(badge).join('') : ''}</span><small>${sub}</small></span><span class="rkv">${right}</span></a></li>`;
}
async function renderRank() {
  const rv = $('#rank-view'); store.set('rank', { ...RK, q: '' });
  const head = `<div class="dtop"><div class="dnav"><a href="#/" aria-label="Retour à la liste">←</a><h1 class="rkh">Classements</h1><span class="sp"></span></div></div>`;
  let D; try { D = await loadRank(); } catch { rv.innerHTML = head + '<div class="rkwrap"><p class="note">Classements indisponibles hors-ligne. Ouvrez cet écran une fois avec une connexion Internet.</p></div>'; return; }
  const { go, pv, rd, mx } = D, M = go.moves; let EL = [];
  const mn = k => k ? esc(M[k] ? M[k][0] : k) + (EL.includes(k) ? ' †' : '') : '', ms = (f, c, c2) => [mn(f), [mn(c), mn(c2)].filter(Boolean).join(', ')].filter(Boolean).join(' + ');
  const msE = (E, k, f, c, c2) => { EL = (E && E[k]) || []; const r = ms(f, c, c2); EL = []; return r; }; // « † » = attaque exclusive, comme sur la fiche
  const ELN = '<p class="note">† : attaque exclusive (disponible via événement / MT élite).</p>';
  let body = rkSeg('s', [['pvp', 'PvP'], ['raid', 'Raids'], ['max', 'Combats Max']]);
  if (RK.s === 'pvp') {
    const L = pv.L; if (!L[RK.lg]) RK.lg = 'g'; const cur = L[RK.lg];
    body += `<div class="rkctl"><select id="rklg" aria-label="Ligue">${Object.entries(L).map(([k, v]) => `<option value="${k}"${k === RK.lg ? ' selected' : ''}>${esc(v.t)} — ${v.cp >= 10000 ? 'sans limite' : '≤ ' + v.cp.toLocaleString('fr-FR') + ' PC'}</option>`).join('')}</select>${rkSeg('sh', [[1, 'Avec Obscurs'], [0, 'Sans Obscurs']])}</div>`;
    const rows = cur.r.filter(r => RK.sh || !r[1]);
    body += `<ol class="rklist">${rows.map((r, i) => rkRow(i + 1, r[0], r[1], msE(pv.E, r[0], r[3], r[4], r[5]), `<b>${String(r[2]).replace('.', ',')}</b><small>score</small>`)).join('')}</ol>
      <p class="note">${RK.lg === 'c' && pv.cup && pv.cup.c ? `Coupe en cours (${esc(pv.cup.c)}), Méga-Évolutions admises. ` : ''}${RK.lg === 'l' ? 'Coupe des Jeunes : ≤ 500 PC, seuls les Pokémon qui peuvent évoluer et n’ont jamais évolué sont admis. ' : ''}Les ${cur.r.length} premiers sur ${cur.n} classés. Score PvPoke sur 100 et moveset le plus joué. Source : <a href="https://pvpoke.com/rankings/" target="_blank" rel="noopener">PvPoke</a>, classement « overall », données du ${new Date(pv.date).toLocaleDateString('fr-FR')}.</p>` + ELN;
  } else if (RK.s === 'raid') {
    const P = rd.P[RK.sh ? 's' : 'n'], F = rd.F, mvk = i => rd.mv[i];
    body += `<div class="rkctl">${rkSeg('rv', [['g', 'Global'], ['b', 'Par boss'], ['t', 'Par type de boss']])}${rkSeg('sh', [[1, 'Obscurs inclus'], [0, 'Sans Obscurs']])}</div>`;
    const cntRow = (r, i, nb) => rkRow(i + 1, F[r[0]][0], F[r[0]][1], msE(rd.E, F[r[0]][0], mvk(r[1]), mvk(r[2])), `<b>${r[3]}</b><small>n° 1</small>`, '') .replace('</small></span><span class="rkv">', ` · utile contre ${r[4]}${nb ? ' / ' + nb : ''} boss · meilleur ${String(r[5]).replace('.', ',')} %</small></span><span class="rkv">`);
    if (RK.rv === 'g') body += `<ol class="rklist">${P.g.map((r, i) => cntRow(r, i, rd.nb)).join('')}</ol><p class="note">Classement contre les ${rd.nb} boss de raid testés, sans moyenne : d’abord le nombre de boss où ce Pokémon est n° 1, puis le nombre de boss où il est utile (au moins 60 % du meilleur), puis son meilleur % contre un boss.</p>`;
    else if (RK.rv === 't') { const T = Object.keys(P.t).sort((a, b) => TYPE_FR[a].localeCompare(TYPE_FR[b], 'fr')); if (!P.t[RK.ty]) RK.ty = T[0]; const [nb, L] = P.t[RK.ty];
      body += `<div class="rkctl"><select id="rkty" aria-label="Type du boss">${T.map(t => `<option value="${t}"${t === RK.ty ? ' selected' : ''}>${esc(TYPE_FR[t])} (${P.t[t][0]} boss)</option>`).join('')}</select></div><ol class="rklist">${L.map((r, i) => cntRow(r, i, nb)).join('')}</ol><p class="note">Boss de type ${esc(TYPE_FR[RK.ty])} (y compris double type) : même règle que le classement global, sur ces ${nb} boss seulement.</p>`; }
    else { const Bi = rd.B.map((b, j) => [j, b]).sort((x, y) => x[1][1].localeCompare(y[1][1], 'fr')); let j = rd.B.findIndex(b => b[0] + '|' + b[2] === RK.boss); if (j < 0) j = Bi[0][0]; const b = rd.B[j];
      body += `<div class="rkctl rkboss"><input id="rkq" type="search" placeholder="Chercher un boss…" value="${esc(RK.q)}" autocomplete="off"><select id="rkb" aria-label="Boss">${Bi.filter(([, x]) => !RK.q || x[1].toLowerCase().includes(RK.q.toLowerCase())).map(([i, x]) => `<option value="${esc(x[0] + '|' + x[2])}"${i === j ? ' selected' : ''}>${esc(x[1])} (${esc(x[2])})</option>`).join('')}</select></div>
        <p class="rkbt">${esc(b[1])} · ${esc(b[2])} · ${b[3].map(badge).join('')}</p><ol class="rklist">${P.b[j].map((r, i) => rkRow(i + 1, F[r[0]][0], F[r[0]][1], msE(rd.E, F[r[0]][0], mvk(r[1]), mvk(r[2])), `<b>${String(r[3]).replace('.', ',')} %</b><small>du meilleur</small>`)).join('')}</ol><p class="note">Les 20 meilleurs attaquants contre ce boss, chacun avec son meilleur moveset. % = dégâts par seconde pondérés par la survie, comparés au n° 1.</p>`; }
    body += ELN + `<p class="note">${esc(rd.src)}, ${new Date(rd.date).toLocaleDateString('fr-FR')}.</p>`;
  } else {
    const R = { A: 'Attaquant', T: 'Tank', H: 'Soigneur' }, RD = { A: 'dégâts infligés', T: '0,6 × jauge Max remplie + 0,2 × tenue + 0,2 × dégâts absorbés par Gardomax', H: '0,7 × PV soignés + 0,3 × survie' };
    if (!mx) body += '<p class="note">Classement des Combats Max indisponible hors-ligne. Ouvrez cet écran une fois avec une connexion Internet.</p>';
    else { const F = mx.F, mvk = i => mx.mv[i], X = mx.R[RK.ro];
      body += `<div class="rkctl">${rkSeg('mv', [['g', 'Global'], ['b', 'Par boss']])}${rkSeg('ro', Object.entries(R))}</div>`;
      if (RK.mv === 'g') body += `<ol class="rklist">${X.g.map((r, i) => rkRow(i + 1, F[r[0]], 0, msE(mx.E, F[r[0]], mvk(r[1]), mvk(r[2])), `<b>${r[3]}</b><small>n° 1</small>`).replace('</small></span><span class="rkv">', ` · utile contre ${r[4]} / ${mx.nb} boss · meilleur ${String(r[5]).replace('.', ',')} %</small></span><span class="rkv">`)).join('')}</ol><p class="note">${esc(R[RK.ro])} (${RD[RK.ro]}) : classement contre les ${mx.nb} boss Dynamax et Gigamax testés, sans moyenne : d’abord le nombre de boss où ce Pokémon est n° 1 dans ce rôle, puis le nombre de boss où il est utile (au moins 60 % du meilleur), puis son meilleur % contre un boss.</p>`;
      else { const Bi = mx.B.map((b, j) => [j, b]).sort((x, y) => x[1][1].localeCompare(y[1][1], 'fr') || x[1][2] - y[1][2]); let j = mx.B.findIndex(b => b[0] === RK.mb); if (j < 0) j = Bi[0][0]; const b = mx.B[j], tl = t => t >= 6 ? 'Gigamax 6★' : 'Dynamax ' + t + '★';
        body += `<div class="rkctl rkboss"><select id="rkmb" aria-label="Boss">${Bi.map(([i, x]) => `<option value="${esc(x[0])}"${i === j ? ' selected' : ''}>${esc(x[1])} (${tl(x[2])})</option>`).join('')}</select></div>
          <p class="rkbt">${esc(b[1])} · ${tl(b[2])} · ${b[3].map(badge).join('')}</p><ol class="rklist">${X.b[j].map((r, i) => rkRow(i + 1, F[r[0]], 0, msE(mx.E, F[r[0]], mvk(r[1]), mvk(r[2])), `<b>${String(r[3]).replace('.', ',')} %</b><small>du meilleur</small>`)).join('')}</ol><p class="note">Les 20 meilleurs ${{ A: 'attaquants', T: 'tanks', H: 'soigneurs' }[RK.ro]} contre ce boss, chacun avec son meilleur moveset pour ce rôle. % = score du rôle (${RD[RK.ro]}), comparé au n° 1.</p>`; }
      body += ELN + `<p class="note">${esc(mx.src)}, ${new Date(mx.date).toLocaleDateString('fr-FR')}.</p>`; }
  }
  rv.innerHTML = head + `<div class="rkwrap">${body}</div>`;
}
document.addEventListener('click', e => {
  const b = e.target.closest('#rank-view [data-rk]'); if (b) { const k = b.dataset.rk, v = b.dataset.v; RK[k] = k === 'sh' ? +v : v; renderRank(); return; }
  if (e.target.closest('#rank-view a[data-go]')) { sheetPref = 'go'; fromRank = true; rankScroll = window.scrollY; }
});
document.addEventListener('change', e => { const t = e.target; if (!t.closest || !t.closest('#rank-view')) return; if (t.id === 'rklg') RK.lg = t.value; else if (t.id === 'rkty') RK.ty = t.value; else if (t.id === 'rkb') RK.boss = t.value; else if (t.id === 'rkmb') RK.mb = t.value; else return; renderRank(); });
document.addEventListener('input', e => { if (e.target.id !== 'rkq') return; RK.q = e.target.value; const s = $('#rkb'), q = RK.q.toLowerCase(); if (!s) return; const D0 = RANKD; D0 && D0.then(({ rd }) => { const opts = rd.B.map(x => [x[0] + '|' + x[2], x]).filter(([, x]) => !q || x[1].toLowerCase().includes(q)).sort((a, b) => a[1][1].localeCompare(b[1][1], 'fr')); s.innerHTML = opts.map(([v, x]) => `<option value="${esc(v)}">${esc(x[1])} (${esc(x[2])})</option>`).join(''); if (opts[0]) { RK.boss = opts[0][0]; const k = RK.q; renderRank().then(() => { const i = $('#rkq'); if (i) { i.value = k; i.focus(); } }); } }); });
