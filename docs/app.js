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

let DATA, E = [], BY_KEY = {}, FORMS = {}, GAMES = [], GAME_BY = {}, GIDX = {}, TYPE_FR = {};
let FAVS = new Set(store.get('favs', [])), CAUGHT = new Set(store.get('caught', [])), SHINY = new Set(store.get('shiny', []));
// Per-game marks (only used while a game or Pokémon GO is selected in the "Jeux" filter): strings "gameId:25" / "gameId:26-alola"
const CAUGHT_G = new Set(store.get('caught_g', [])), SHINY_G = new Set(store.get('shiny_g', []));
const state = { q: '', types: [], gen: '', cat: '', sort: 'id', game: '', vdex: '', forms: store.get('forms', false), view: store.get('view', 'grid'), dgame: 'all' };
let listScroll = 0;
const ik = p => p.c ? p.k : p.id; // key used in the global sets
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
const megasOf = p => p.mb ? [p] : E.filter(q => q.mb === p.k);
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
const goMegas = p => { const sp = DET && DET.p && DET.p.id === p.id ? DET.sp : null; return sp ? megasOf(p).filter(q => sp.f[q.k] && sp.f[q.k].go && sp.f[q.k].go.r) : []; };
// Méga-énergie mark id: the species ("3"), or one per Mega when the species has several (X / Y / Z): "6-x", "6-y", "150-x"…
const megaXYZ = m => (m.k.match(/mega-(x|y|z)$/) || [])[1] || '';
const energyId = m => String(m.id) + (megaXYZ(m) ? '-' + megaXYZ(m) : '');
const hasEnergy = m => MEGA_ENERGY.has(energyId(m));
const energyMates = p => { const seen = new Set(); return goMegas(p).filter(m => !seen.has(energyId(m)) && seen.add(energyId(m))); };
function energyBtnHTML(m) {
  const base = BY_KEY[String(m.id)] || m, id = energyId(m), xyz = megaXYZ(m).toUpperCase();
  const img = ENERGY_ICONS.ids.has(id) ? `img/energy/${id}.webp` : ENERGY_ICONS.ids.has(String(m.id)) ? `img/energy/${m.id}.webp` : ENERGY_ICONS.generic;
  const lab = `Méga-énergie${xyz ? ' ' + xyz : ''}`;
  return `<button class="act energy" type="button" data-energy="${m.k}" aria-pressed="${hasEnergy(m)}" aria-label="${lab} ${esc(base.n)} – Pokémon GO" title="${lab} de ${esc(base.n)} obtenue dans Pokémon GO (${xyz ? `marque séparée pour ${esc(m.n)}` : 'une marque par espèce'})"><img class="gemimg" src="${img}" alt="" width="28" height="28" decoding="async"><span class="t"><span class="lgl">${lab}</span><span class="shl">Énergie${xyz ? ' ' + xyz : ''}</span></span></button>`;
}
function toggleEnergy(m) { const k = energyId(m); if (MEGA_ENERGY.has(k)) MEGA_ENERGY.delete(k); else MEGA_ENERGY.add(k); saveTrack(); }
// v21 marks were per species ("6"): for species with X/Y Megas, the mark applies to each of them
function migrateEnergy() {
  let ch = false;
  for (const k of [...MEGA_ENERGY]) { if (k.includes('-')) continue; const ms = E.filter(q => q.mb && String(q.id) === k && megaXYZ(q)); if (!ms.length) continue; MEGA_ENERGY.delete(k); ms.forEach(m => MEGA_ENERGY.add(energyId(m))); ch = true; }
  if (ch) store.set('mega_energy', [...MEGA_ENERGY]);
}

const isZa = c => c === 'za' || c === 'zadlc';
const ZA_IDS = new Set(['za', 'zadlc']);
/** Z-A Mega forms are tracked only for Z-A / Méga-Dimension (not XY/ORAS/LGPE battle megas, not GO). */
const megaTrackGames = p => gamesOf(p).filter(g => ZA_IDS.has(g));

const hasGem = (p, c = 'za') => !!(p && p.mb && [p, ...gemMates(p)].some(q => MEGA_GEMS.has(gemGrp(c) + ':' + q.k)));
const megaBaseP = p => (p && p.mb && BY_KEY[p.mb]) || null;
const zaMegaCaughtGames = p => {
  if (!p?.mb || !hasGem(p)) return [];
  const b = megaBaseP(p); if (!b) return [];
  const bc = CAUGHT_BY.get(b.k) || [];
  return megaTrackGames(p).filter(g => bc.some(h => saveOf(h) === saveOf(g)));
};
const zaMegaShinyGames = p => {
  if (!p?.mb || !hasGem(p)) return [];
  const b = megaBaseP(p); if (!b) return [];
  const bs = SHINY_BY.get(b.k) || [];
  return megaTrackGames(p).filter(g => bs.some(h => saveOf(h) === saveOf(g)));
};
const trackCtx = () => (GAME_BY[state.game] || state.game === 'go' || state.game === 'home') ? state.game : null;
const trackName = (c = trackCtx()) => { return c === 'go' ? 'Pokémon GO' : c === 'home' ? 'Pokémon HOME' : c ? GAME_BY[c].s : ''; };
const homeKind = c => c === 'go' ? 'direct' : (GAME_BY[c] && GAME_BY[c].h) || null; // direct | bank | transporter | null
const homeBall = '<svg class="ball hm" viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
const HOME_KIND_FR = { direct: 'transfert direct vers HOME', bank: 'via Pokémon Bank', transporter: 'via Poké Fret / Pokémon Bank', vc: 'Console virtuelle 3DS : via Poké Transporter / Pokémon Bank' };
// Pokémon HOME origin marks (icons: Bulbagarden Archives, fair use — img/origin/CREDITS.txt). One mark per game + its expansions.
// Gen 4–5 Pokémon have no origin mark in HOME: grouped as « Sans marque ». gba (Rouge Feu / Vert Feuille on Switch): asset ready, no game in the list yet.
const ORIGINS = [
  { id: 'za', n: 'Z-A', fr: 'Marque Z-A (Légendes Z-A + Méga-Dimension)', games: ['za', 'zadlc'] },
  { id: 'paldea', n: 'Paldea', fr: 'Marque de Paldea (Écarlate / Violet + extensions)', games: ['sv', 'svmask', 'svdisk'] },
  { id: 'hisui', n: 'Hisui', fr: 'Marque de Hisui (Légendes Arceus)', games: ['la'] },
  { id: 'sinnoh', n: 'DÉ/PS', fr: 'Marque de Sinnoh (Diamant Étincelant / Perle Scintillante)', games: ['bdsp'] },
  { id: 'galar', n: 'Galar', fr: 'Marque de Galar (Épée / Bouclier + extensions)', games: ['sw', 'swisle', 'swcrown'] },
  { id: 'lgpe', n: 'Let’s Go', fr: 'Marque Let’s Go (Pikachu / Évoli)', games: ['lgpe'] },
  { id: 'go', n: 'GO', fr: 'Marque GO (Pokémon GO)', games: ['go'] },
  { id: 'alola', old: 1, n: 'Alola', fr: 'Trèfle (Soleil / Lune, Ultra-Soleil / Ultra-Lune)', games: ['sm', 'usum'] },
  { id: 'kalos', old: 1, n: 'Kalos', fr: 'Pentagone (X / Y, Rubis Oméga / Saphir Alpha)', games: ['xy', 'oras'] },
  { id: 'none', old: 1, n: 'Sans marque', s: 'Gén. 4–5', fr: 'Sans marque (4ᵉ–5ᵉ génération, via Poké Transfert / Pokémon Bank)', games: ['dp', 'pt', 'hgss', 'bw', 'b2w2'], noimg: 1 },
  { id: 'gb', old: 1, n: 'Game Boy', s: 'GB', fr: 'Marque Game Boy (Console virtuelle 3DS : Rouge / Bleu / Jaune / Or / Argent / Cristal)', games: ['rb', 'y', 'gs', 'c'] },
];
const ORI = Object.fromEntries(ORIGINS.map((o, i) => [o.id, { ...o, i }]));
const ORIGIN_OF = {}; ORIGINS.forEach(o => o.games.forEach(g => ORIGIN_OF[g] = o.id));
const originOf = c => ORIGIN_OF[c] || null;
// v23 (Yann's rule): only Switch-era marks count for HOME gold — Let's Go, Galar, DÉ/PS, Hisui, Paldea, Z-A, GO (except Mythicals), and GBA (Rouge Feu / Vert Feuille Switch) once added.
// Old marks (Game Boy, pentagon, clover, « Sans marque ») keep their buttons and marks but do not count (Pokémon Bank closing).
// GBA originals (Rubis/Saphir/Émeraude, Rouge Feu/Vert Feuille GBA): no HOME link (h: null) → Transféré greyed, no mark; Pal Park path = « Sans marque »
const GBA_IDS = new Set(['rs', 'e', 'frlg']);
const isGoldMark = m => !!ORI[m] && !ORI[m].old;
const marksOf = games => [...new Set(games.map(originOf).filter(Boolean))].sort((a, b) => ORI[a].i - ORI[b].i);
const omIcon = m => (!m || !ORI[m] || ORI[m].noimg) ? homeBall : `<span class="om om-${m}" aria-hidden="true"></span>`;
// Battle-only (p.bo): Primo, Éternamax, in-battle forms — inherit base marks. Megas use p.mb + Méga-Gemme (Z-A). Gigamax are separately markable.
// Outside Légendes Z-A, Megas are battle-only too (inherit the base marks); in Z-A they follow the Méga-Gemme rules.
const megaBo = (p, c) => !!(p && p.mb && c && c !== 'home' && !isZa(c));
const mp = (p, c) => (p.bo && BY_KEY[p.bo]) || (megaBo(p, c) && BY_KEY[p.mb]) || p;
const isCombat = (p, c) => !!p.bo || megaBo(p, c); // not counted in totals for context c
const gkey = (c, p) => c + ':' + mp(p, c).k;
// Save groups: a game and its expansions share one save (sw + swisle + swcrown, sv + svmask + svdisk, za + zadlc). Marks are written to every game of the group where the entry exists.
const saveOf = g => (GAME_BY[g] && GAME_BY[g].base) || g;
const saveGames = g => GAMES.filter(x => saveOf(x.id) === saveOf(g)).map(x => x.id);
const grpTargets = (c, p) => { if (!GAME_BY[c]) return [c]; const av = gamesOf(mp(p, c)); const t = saveGames(c).filter(g => av.includes(g)); return t.length ? t : [c]; };
// Entry listed in a game where it does not exist but a game of the same save does (Méga-Dex: Méga-Dimension-only species in the Z-A context) → read that game's marks (identical: marks are written to the whole save group)
const ctxFor = (p, c) => { if (!GAME_BY[c] || inGame(p, GIDX[c])) return c; const g = saveGames(c).find(x => inGame(p, GIDX[x])); return g || c; };
const sharedWith = (c, p) => grpTargets(c, p).filter(g => g !== c);
const grpsOf = av => [...new Set(av.map(saveOf))];
const grpHas = (G, have) => have.some(h => saveOf(h) === G);
const grpDone = (av, have) => { const gs = grpsOf(av); return gs.length > 0 && gs.every(G => grpHas(G, have)); };
let HOME_C = new Map(), HOME_S = new Map(); // HOME_C: entry key -> [origin marks]; HOME_S: entry keys shiny in HOME
let CAUGHT_BY = new Map(), SHINY_BY = new Map(); // entry key -> [game ids incl. 'go'] with a per-game mark
function rebuildHome() {
  CAUGHT_BY = new Map(); SHINY_BY = new Map();
  for (const [set, map] of [[CAUGHT_G, CAUGHT_BY], [SHINY_G, SHINY_BY]]) for (const x of set) { const i = x.indexOf(':'); const k = x.slice(i + 1); (map.get(k) || map.set(k, []).get(k)).push(x.slice(0, i)); }
  HOME_C = new Map(); HOME_S = new Map(); // entry key -> [origin marks]
  const push = (map, k, m) => { if (!m) return; const a = map.get(k) || map.set(k, []).get(k); if (!a.includes(m)) a.push(m); };
  for (const x of HOME_O) { const i = x.indexOf(':'); push(HOME_C, x.slice(i + 1), x.slice(0, i)); }
  for (const k of HOME_SH) if (HOME_C.has(k)) HOME_S.set(k, []); // v24: shiny in HOME (one mark per form)
}
rebuildHome();
// Games (incl. 'go') compatible with HOME in which an entry exists. Needs the regional dex files of the compatible games (loaded when HOME is selected).
const COMPAT = () => [...GAMES.filter(g => g.h).map(g => g.id), 'go'];
const gamesOf = p => GAMES.filter((g, i) => inGame(p, i)).map(g => g.id);
// Origin marks a Pokémon / form can carry in HOME = marks of the HOME-compatible games where it exists (+ GO, except Mythicals).
const homeAvail = p => {
  // Z-A Megas transfer only from Z-A / Méga-Dimension (not XY/LGPE battle megas, not GO)
  if (p.mb) return marksOf(megaTrackGames(p).filter(g => GAME_BY[g] && GAME_BY[g].h));
  return marksOf([...gamesOf(p).filter(g => GAME_BY[g].h), ...(p.go && !p.my ? ['go'] : [])]);
};
// ---- base view: read-only status derived from the per-game marks
const SWITCH_IDS = new Set(['za', 'zadlc', 'svdisk', 'svmask', 'sv', 'la', 'bdsp', 'swcrown', 'swisle', 'sw', 'lgpe']);
function baseStatus(p, av) {
  if (p.bo) { p = mp(p); av = null; }
  // Z-A Megas: capture completion = caught in every Z-A save where the Mega exists (base+gem). No GO / no anciens jeux.
  if (p.mb) {
    av = megaTrackGames(p);
    const c = zaMegaCaughtGames(p), s = zaMegaShinyGames(p);
    return { c, s, sw: av, old: [], legacyC: false, legacyS: false, any: c.length > 0, shAny: s.length > 0,
      swDone: grpDone(av, c), oldDone: false };
  }
  av ||= gamesOf(p);
  let c = CAUGHT_BY.get(p.k) || [], s = SHINY_BY.get(p.k) || [];
  // Switch / jeux actuels tier: every Switch game where it exists, PLUS Pokémon GO when the species is in GO (same gold-ball tier, not a third level)
  const sw = [...av.filter(g => SWITCH_IDS.has(g)), ...(p.go ? ['go'] : [])];
  const old = av.filter(g => !SWITCH_IDS.has(g));
  const done = grpDone; // a game and its expansions count once
  const legacyC = CAUGHT.has(ik(p)), legacyS = SHINY.has(ik(p));
  return { c, s, sw, old, legacyC, legacyS, any: c.length > 0 || legacyC, shAny: s.length > 0 || legacyS,
    swDone: done(sw, c), oldDone: done(old, c) };
}
const homeAvailF = (p, f) => p.mb ? homeAvail(p) : marksOf([...(f.av || []).filter(g => GAME_BY[g] && GAME_BY[g].h), ...(p.go && !p.my ? ['go'] : [])]);
// "complete" = transferred from every compatible game where it exists (DLC/extension games count only when no base game has it)
const homeGold = p => homeAvail(p).filter(isGoldMark); // marks that count for the gold HOME icon
const homeComplete = (p, av = homeAvail(p)) => { if (p.bo) { p = mp(p); av = homeAvail(p); } av = av.filter(isGoldMark); const t = HOME_C.get(p.k) || []; return av.length > 0 && av.every(m => t.includes(m)); }; // every Switch-era (+ GO) mark where it exists
const isCaught = (p, c = trackCtx()) => {
  p = mp(p, c);
  if (p.mb) {
    if (c === 'home') return HOME_C.has(p.k);
    if (c && isZa(c)) return zaMegaCaughtGames(p).some(g => saveOf(g) === saveOf(c));
    if (c) return false;
    return zaMegaCaughtGames(p).length > 0;
  }
  c = ctxFor(p, c);
  return c === 'home' ? HOME_C.has(p.k) : c ? CAUGHT_G.has(gkey(c, p)) : CAUGHT_BY.has(p.k) || CAUGHT.has(ik(p));
};
const isShiny = (p, c = trackCtx()) => {
  p = mp(p, c);
  if (p.mb) {
    if (c === 'home') return HOME_S.has(p.k);
    if (c && isZa(c)) return zaMegaShinyGames(p).some(g => saveOf(g) === saveOf(c));
    if (c) return false;
    return zaMegaShinyGames(p).length > 0;
  }
  c = ctxFor(p, c);
  return c === 'home' ? HOME_S.has(p.k) : c ? SHINY_G.has(gkey(c, p)) : SHINY_BY.has(p.k) || SHINY.has(ik(p));
};
const isTrans = (p, c = trackCtx()) => { const m = originOf(c); return !!m && HOME_O.has(m + ':' + mp(p, c).k); }, isSTrans = (p, c = trackCtx()) => STRANS_G.has(gkey(ctxFor(mp(p, c), c), p));
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
const saveTrack = () => { store.set('caught_g', [...CAUGHT_G]); store.set('shiny_g', [...SHINY_G]); store.set('home_g', [...TRANS_G]); store.set('homeshiny_g', [...STRANS_G]); store.set('home_o', [...HOME_O]); store.set('home_og', [...HOME_OG]); store.set('mega_gems', [...MEGA_GEMS]); store.set('mega_energy', [...MEGA_ENERGY]); rebuildHome(); for (const k of [...HOME_SH]) if (!HOME_C.has(k)) HOME_SH.delete(k); store.set('home_sh', [...HOME_SH]);
  for (const k of [...HOME_B]) if (!BY_KEY[k] || !homeBaronOn(BY_KEY[k])) HOME_B.delete(k); // HOME Baron needs the Hisui or Z-A mark
  for (const k of [...HOME_BS]) if (!HOME_B.has(k) || !HOME_SH.has(k)) HOME_BS.delete(k); // HOME Baron shiny needs HOME Baron + HOME Shiny
  store.set('baron_g', [...BARON_G]); store.set('barons_g', [...BARONS_G]); store.set('home_b', [...HOME_B]); store.set('home_bs', [...HOME_BS]); rebuildHome(); }; // shiny in HOME needs ≥ 1 transfer mark
function toggleMark(p, kind, c = trackCtx()) {
  if (!c || c === 'home' || p.bo || p.mb) return; // base view, HOME, battle-only, and Z-A Megas (caught/shiny derived from base + gem)
  const on = !(kind === 'caught' ? CAUGHT_G : SHINY_G).has(gkey(c, p));
  for (const g of grpTargets(c, p)) { // every game of the save group where the entry exists
    const k = gkey(g, p);
    // chain: shiny ⇒ caught, transferred ⇒ caught, shiny transferred ⇒ shiny + transferred + caught; removing Capturé clears shiny + transfer flags of that game
    if (kind === 'caught') { if (on) CAUGHT_G.add(k); else { CAUGHT_G.delete(k); SHINY_G.delete(k); STRANS_G.delete(k); BARON_G.delete(k); BARONS_G.delete(k); } }
    else if (on) { SHINY_G.add(k); CAUGHT_G.add(k); } else { SHINY_G.delete(k); STRANS_G.delete(k); BARONS_G.delete(k); } // v25: no Capturé → no Baron; no Shiny → no Baron shiny
  }
  // Removing Capturé clears the origin transfer only if it was set from a game sheet and no other game of that mark (e.g. X/Y ↔ ROSA) still has it caught.
  // A transfer ticked on the Pokémon HOME sheet (or received by trade) is never cleared by the games.
  if (kind === 'caught' && !on) { const m = originOf(c), mk = m + ':' + p.k; if (HOME_OG.has(mk) && !ORI[m].games.some(g => CAUGHT_G.has(gkey(g, p)))) { HOME_O.delete(mk); HOME_OG.delete(mk); } }
  saveTrack();
}
// "Transféré" from a GAME sheet: sets the transfer of that game's origin mark (same state as the HOME sheet) and marks Capturé in that game.
// (shiny = legacy shiny transfer, no longer in the UI: per-game STRANS_G kept for the future HOME redesign)
function toggleTransfer(p, shiny, c = trackCtx()) {
  if (!c || c === 'home' || !homeKind(c) || p.bo || megaBo(p, c) || (c === 'go' && p.my)) return; // Mythicals cannot be transferred from GO
  const m = originOf(c); if (!m) return;
  const mk = m + ':' + p.k, on = shiny ? !STRANS_G.has(gkey(c, p)) : !HOME_O.has(mk);
  if (on) { HOME_O.add(mk); HOME_OG.add(mk); } else if (!shiny) { HOME_O.delete(mk); HOME_OG.delete(mk); }
  for (const g of grpTargets(c, p)) {
    const k = gkey(g, p);
    if (shiny) { if (on) { STRANS_G.add(k); if (!p.mb) { CAUGHT_G.add(k); SHINY_G.add(k); } } else STRANS_G.delete(k); }
    else if (on) { if (!p.mb) CAUGHT_G.add(k); } // Megas: caught stays derived (base + gem)
    else STRANS_G.delete(k);
  }
  if (on && isZa(c) && !p.mb && !p.bo) gemMegaTransfers(p, c, true);
  saveTrack();
}
// v25 Baron / Baron shiny (Légendes games): Baron ⇒ Capturé ; Baron shiny ⇒ Baron + Shiny + Capturé. Unticking Baron clears Baron shiny. No effect on completion.
function toggleBaron(p, shiny, c = trackCtx()) {
  if (!alphaOk(p, c)) return;
  const on = !(shiny ? BARONS_G : BARON_G).has(gkey(c, p));
  for (const g of grpTargets(c, p)) {
    const k = gkey(g, p);
    if (on) { BARON_G.add(k); CAUGHT_G.add(k); if (shiny) { BARONS_G.add(k); SHINY_G.add(k); } }
    else { if (!shiny) BARON_G.delete(k); BARONS_G.delete(k); }
  }
  saveTrack();
}
// HOME sheet: Baron / Baron shiny per form, independent of the games; only with the Hisui or Z-A mark. B. shiny ⇒ Baron + Shiny (HOME).
function toggleHomeBaron(p0, shiny) {
  const p = mp(p0, 'home'), k = p.k; if (p0.bo || !homeBaronOn(p)) return;
  if (!shiny) { if (HOME_B.has(k)) { HOME_B.delete(k); HOME_BS.delete(k); } else HOME_B.add(k); }
  else if (HOME_BS.has(k)) HOME_BS.delete(k); else { HOME_BS.add(k); HOME_B.add(k); HOME_SH.add(k); }
  saveTrack();
}
// Z-A: transferring the base while owning a Mega gem also transfers that Mega
function gemMegaTransfers(p, c, fromGame) {
  for (const m of E) {
    if (m.mb !== p.k && m.mb !== String(p.id)) continue;
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
function toggleHomeOrigin(p0, m) {
  const p = mp(p0, 'home'); if (p0.bo || p.bo || !ORI[m] || (!homeAvail(p).includes(m) && !HOME_O.has(m + ':' + p.k))) return;
  const mk = m + ':' + p.k, on = !HOME_O.has(mk);
  if (on) { HOME_O.add(mk); HOME_OG.delete(mk); } else { HOME_O.delete(mk); HOME_OG.delete(mk); }
  if (on && m === 'za' && !p.mb) gemMegaTransfers(p, 'za', false);
  saveTrack();
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
function migrateMarks() {
  let changed = false;
  for (const x of [...STRANS_G]) for (const set of [TRANS_G, SHINY_G, CAUGHT_G]) if (!set.has(x)) { set.add(x); changed = true; }
  for (const x of [...TRANS_G, ...SHINY_G]) if (!CAUGHT_G.has(x)) { CAUGHT_G.add(x); changed = true; }
  for (const pass of [0, 1]) for (const set of [CAUGHT_G, SHINY_G, TRANS_G, STRANS_G, BARON_G, BARONS_G]) {
    for (const x of [...set]) {
      const i = x.indexOf(':'), g = x.slice(0, i), k = x.slice(i + 1), p = BY_KEY[k]; if (!p) continue;
      if (p.bo || megaBo(p, g)) { set.delete(x); set.add(g + ':' + mp(p, g).k); changed = true; continue; }
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
  svhors: { game: 'sv', before: 'svdisk', file: 'hors-sv', n: 'Écarlate / Violet (+ extensions) – Hors dex', s: 'Hors dex É/V' },
  swhors: { game: 'sw', before: 'swcrown', file: 'hors-sw', n: 'Épée / Bouclier (+ extensions) – Hors dex', s: 'Hors dex É/B' },
};
let MEGADEX = null;
function megaDex() {
  if (MEGADEX) return MEGADEX;
  const megas = E.filter(p => p.mb && megaTrackGames(p).length), keys = new Set();
  for (const m of megas) { keys.add(m.k); if (BY_KEY[m.mb]) keys.add(m.mb); }
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
    try { const ms = await getJSON('data/mega-stones.json'); if (ms?.stones) MEGA_STONES = ms; else if (ms && !ms.fallback) MEGA_STONES = { fallback: MEGA_STONES.fallback, stones: ms }; } catch {}
  } catch (e) {
    $('#results').innerHTML = '<p class="empty">Impossible de charger les données. Ouvrez l’application une fois avec une connexion Internet.</p>';
    return;
  }
  E = DATA.e;
  E.forEach(p => {
    BY_KEY[p.k] = p; (FORMS[p.id] ||= []).push(p);
    p.nn = norm(p.n); p.ne = norm(p.en); p.nj = norm(p.ja); p.nr = norm(p.ro); p.tot = p.s.reduce((a, b) => a + b, 0);
  });
  GAMES = DATA.games; GAMES.forEach((g, i) => { GAME_BY[g.id] = g; GIDX[g.id] = i; });
  DATA.types.forEach(t => TYPE_FR[t[0]] = t[1]);
  migrateOrigins(); migrateHomeShiny(); migrateEnergy();
  migrateMarks();
  store.set('mega_gems', [...MEGA_GEMS]); // legacy un-prefixed gem keys → "za:"
  $('#formsbtn').setAttribute('aria-pressed', state.forms);
  buildControls();
  render();
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
  initGameMenu(); initCatMenu();
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
  const order = new Map(), nums = new Map(), extra = new Set(d.x || []);
  d.e.forEach((row, i) => { order.set(row[0], i); nums.set(row[0], row.slice(1)); });
  // Species available in this game but absent from the regional Pokédex → end of list, national order, no regional nº
  (d.x || []).forEach((sid, i) => { if (!order.has(sid)) order.set(sid, d.e.length + i); });
  return DEX[id] = { order, nums, dx: d.dx, extra, regional: d.e.length, virtual: id.startsWith('vd:') };
}
async function setGame(v) {
  state.vdex = VDEX[v] ? v : '';
  if (VDEX[v]) v = VDEX[v].game;
  state.game = v; $('#game').value = state.vdex || v;
  if (v === 'home') {
  } else if (GAME_BY[v]) {
    try { await loadDex(v); if (state.vdex && VDEX[state.vdex].file) await loadDex('vd:' + state.vdex); } catch { state.game = ''; state.vdex = ''; $('#game').value = ''; alert('Pokédex du jeu indisponible hors-ligne : ouvrez-le une fois avec une connexion.'); }
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
function filtered() {
  const raw = state.q.trim();
  const qn = norm(raw);
  const numeric = /^#?\d+$/.test(raw) ? parseInt(raw.replace('#', ''), 10) : null;
  const gm = GAME_BY[state.game], dex = listDex(), gi = gm ? GIDX[gm.id] : -1;
  if (gm && !dex) return [];
  const reg = gm ? listReps(gm.id, dex) : null, R = gm && REGION_OF_GAME[gm.id];
  let out = E.filter(p => {
    if (dex && dex.mega) { if (!dex.keys.has(p.k)) return false; } // Méga-Dex: base forms + Megas, whatever the forms toggle
    else if (!regShow(p, reg)) return false;
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
    if (state.cat === 'leg' && !p.lg) return false;
    if (state.cat === 'myth' && !p.my) return false;
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
    const key = { id: p => dex ? dex.order.get(p.id) : p.id, name: p => p.nn, total: p => -p.tot, hp: p => -p.s[0], atk: p => -p.s[1], def: p => -p.s[2], spe: p => -p.s[5] }[state.sort];
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
    if (n && n.length) s = `<span class="rn">${dex.dx.length > 1 ? esc(dex.dx[n[0]]) + ' ' : ''}#${pad3(n[1])}</span> <span class="nat">Nat. ${pad(p.id)}</span>`;
    else s = `<span class="rn hors" title="Absent du Pokédex régional — obtenable par transfert, échange, événement ou Méga-Gemme">Hors dex</span> <span class="nat">#${pad(p.id)}</span>`;
  } else s = `#${pad(p.id)}`;
  const tag = p.c ? ` · ${esc(p.l || '')}` : p.lg ? ' · Légendaire' : p.my ? ' · Fabuleux' : '';
  return s + tag;
}
// Icons: Poké Ball (red = caught in at least one game, gold = completed) and HOME house (blue = transferred from at least one game, gold = from all compatible games)
const BALL_GOLD = BALL.replace('class="ball"', 'class="ball gold"').replace('#e53935', '#f2b705').replace(/fill="#fff"/g, 'fill="#fff6c9"');
const homeIcon = (gold, label) => `<span class="mk hm${gold ? ' gold' : ''}" role="img" aria-label="${label}" title="${label}"><svg class="hmi" viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" stroke-width="2" stroke-linejoin="round"/></svg></span>`;
const HOME_T = 'Transféré vers HOME avec au moins une marque d’origine', HOME_C_T = 'Transféré avec toutes les marques d’origine Switch possibles (+ GO sauf fabuleux) : anciens jeux non comptés';
const goldBall = (lv, label) => `<span class="mk ok gold" role="img" aria-label="${label}" title="${label}">${BALL_GOLD}${lv ? `<small class="lvl">${lv}</small>` : ''}</span>`;
const LVL_T = { sw: 'Complété jeux actuels : capturé dans tous les jeux Switch où il existe, et dans Pokémon GO s’il y est disponible', old: 'Complété dans les anciens jeux : capturé dans tous les jeux d’avant la Switch où il existe' };
const BASE_LEGEND = `<span>${BALL} capturé dans au moins un jeu (Pokémon GO compris)</span> <span>${goldBall('', 'Poké Ball dorée')} <b>Poké Ball dorée</b> : complété jeux actuels = capturé dans tous les jeux Switch où il existe (un jeu et ses extensions comptent pour un) <b>et</b> dans Pokémon GO s’il y est disponible</span> <span>${goldBall('🕹', 'Poké Ball dorée 🕹')} <b>Poké Ball dorée 🕹</b> : complété dans les anciens jeux = capturé dans tous les jeux d’avant la Switch où il existe (les deux niveaux : dorée + 🕹)</span> <span><span class="mk sh">✨</span> shiny dans au moins un jeu</span> <span>Pour marquer, choisissez un jeu (ou Pokémon GO) dans « Jeux ».</span> <span class="mute">Menu Catégorie : 🔴 Poké Ball · 🟡 Poké Ball dorée (jeux actuels / Switch + GO) · 🟡🕹 anciens jeux · 🏠 HOME · 🟡🏠 HOME doré · ✨ shiny.</span>`;
const HOME_LEGEND = `<span>${homeIcon(false, HOME_T)} transféré avec au moins une marque d’origine</span> <span>${homeIcon(true, HOME_C_T)} <b>dorée</b> : transféré avec <b>toutes</b> les marques Switch où il existe — ${ORIGINS.filter(o => !o.old).map(o => `${omIcon(o.id)} ${esc(o.n)}`).join(' · ')} (un jeu et ses extensions comptent pour une ; Pokémon GO compris, sauf pour les fabuleux ; plus tard Rouge Feu / Vert Feuille Switch)</span> <span><b>Anciens jeux</b> (${ORIGINS.filter(o => o.old).map(o => `${omIcon(o.id)} ${esc(o.n)}`).join(' · ')}) : boutons et marques conservés, mais ne comptent pas pour la dorure (fermeture de Pokémon Bank).</span> <span>Pour cocher : fiche du Pokémon → « Pokémon HOME » (une case par marque ; échanges HOME compris, sans « Capturé ») ou « Transféré » dans la fiche d’un jeu (implique « Capturé » dans ce jeu).</span> <span class="mute">Icônes des marques : Bulbagarden Archives (usage équitable). Menu Catégorie : 🏠 HOME · 🟡🏠 HOME doré.</span>`;
// ball shown on cards in the base view: red = caught somewhere, gold = Switch-complete, gold+🕹 = anciens jeux (both → gold+🕹)
function baseBall(p) {
  const b = baseStatus(p); if (!b.any) return '';
  if (!b.swDone && !b.oldDone) return `<span class="mk ok" aria-label="Capturé">${BALL}</span>`;
  const lv = b.oldDone ? '🕹' : '';
  return goldBall(lv, [b.swDone && LVL_T.sw, b.oldDone && LVL_T.old].filter(Boolean).join(' — '));
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
  return `<a class="card${p.c ? ' form' : ''}${sizeClass(p) ? ' ' + sizeClass(p) : ''}" href="#/p/${p.k}"><img src="img/${p.k}.webp" alt="" loading="lazy" decoding="async" width="256" height="256">` +
    `<div class="info"><div class="num">${numHTML(p)}</div><div class="nm">${esc(p.n)} ${star}</div></div>` +
    `<div class="badges">${p.t.map(badge).join('')}</div></a>`;
}
// Catégorie filters about HOME transfers: per game (this game) or global (base / HOME view). Not offered for games that cannot send Pokémon to HOME.
const TRANS_CATS = ['trans', 'notrans', 'strans', 'hcomplete'];
function transCat(p, cat) {
  if (cat === 'strans') return HOME_S.has(mp(p).k); // v24: « Shiny dans HOME » mark (HOME sheet), any context
  const c = trackCtx();
  if (c && c !== 'home') {
    if (!homeKind(c) || (c === 'go' && mp(p).my)) return false;
    const t = isTrans(p, c);
    return cat === 'trans' ? t : cat === 'notrans' ? !t : cat === 'strans' ? isSTrans(p, c) : homeComplete(p, homeAvail(p));
  }
  const q = mp(p), av = homeAvail(q); if (!av.length) return false;
  if (cat === 'hcomplete' && !av.some(isGoldMark)) return false;
  return cat === 'trans' ? HOME_C.has(q.k) : cat === 'notrans' ? !HOME_C.has(q.k) : cat === 'strans' ? HOME_S.has(q.k) : homeComplete(q, av);
}
// v25 Catégorie « Barons » block. Tous les jeux = Baron in Arceus OR Z-A OR HOME; Arceus / Z-A = that game; HOME = HOME Baron marks; greyed in other games.
// « manquants » = Alpha-capable forms only (HOME: only with the Hisui or Z-A mark ticked).
const BARON_CATS = ['baron', 'nobaron', 'barons', 'nobarons'];
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
}
function render() {
  updateCatOptions(); syncMenus();
  const res = filtered();
  const box = $('#results');
  box.className = state.view === 'grid' ? 'grid' : 'grid list';
  $('#viewbtn').textContent = state.view === 'grid' ? '☰' : '▦';
  box.innerHTML = res.length ? res.map(cardHTML).join('') : `<p class="empty">${GAME_BY[state.game] && !DEX[state.game] ? 'Chargement…' : 'Aucun Pokémon trouvé.'}</p>`;
  const gm = GAME_BY[state.game];
  const ctx = trackCtx(); let prog;
  if (ctx) { // progress of the selected game: marks among the entries that belong to it
    const dx = DEX[ctx], gi = GIDX[ctx], vd = listDex();
    const ld = vd && vd.virtual ? vd : dx;
    const reg = ld && !ld.virtual ? listReps(ctx, ld) : null;
    const uni = vd && vd.mega ? E.filter(p => vd.keys.has(p.k) && !isCombat(p, ctx)) :
      E.filter(p => regShow(p, reg) && !isCombat(p, ctx) && (ctx === 'home' ? true : ctx === 'go' ? p.go : (ld && ld.order.has(p.id) && (!p.c || inGame(p, gi)))));
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
  const head = vdx && vdx.mega ? `${res.filter(p => !p.mb).length} Pokémon + ${res.filter(p => p.mb).length} Méga` : state.forms ? `${res.length - combat} formes${combat ? ` (+ ${combat} formes de combat, non comptées)` : ''}` : `${res.length} Pokémon`;
  $('#count').textContent = `${head}${vdx ? ' · ' + vdx.s : gm ? ' · ' + gm.s : state.game === 'go' ? ' · GO' : ''} · ${prog}`;
  const lg = $('#legend'); lg.hidden = !!ctx && ctx !== 'home';
  if (!ctx) lg.innerHTML = `<details><summary>Légende des marques</summary>${BASE_LEGEND}</details>`;
  if (ctx === 'home') lg.innerHTML = `<details><summary>Légende des marques</summary>${HOME_LEGEND}</details>`;
  document.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', state.types.includes(c.dataset.t)));
  const active = state.q || state.types.length || state.gen || state.cat || state.sort !== 'id' || state.game;
  $('#reset').hidden = !active;
}

/* ---------------- shared data (loaded with the first detail page) ---------------- */
const SP = {};
let SHARED = null, GODATA = null, EVO_ADJ = null;
async function loadShared() {
  if (!SHARED) SHARED = Promise.all(['evo', 'moves', 'ref', 'tm', 'loc'].map(n => getJSON(`data/${n}.json`))).then(([evo, moves, ref, tm, loc]) => ({ evo, moves, ref, tm, loc })).catch(e => { SHARED = null; throw e; });
  return SHARED;
}
async function loadGo() { if (!GODATA) GODATA = getJSON('data/go.json').catch(e => { GODATA = null; throw e; }); return GODATA; }
async function loadSp(id) { if (!SP[id]) SP[id] = getJSON(`data/sp/${id}.json`).catch(e => { delete SP[id]; throw e; }); return SP[id]; }

/* ---------------- detail ---------------- */
let detailTok = 0, DET = null, showShinyArt = false;
function route() {
  const m = location.hash.match(/^#\/p\/(\d+(?:-[a-z0-9-]+)?)/);
  const lv = $('#list-view'), dv = $('#detail-view');
  if (m && BY_KEY[m[1]]) {
    if (!lv.hidden) listScroll = window.scrollY;
    lv.hidden = true; dv.hidden = false;
    showShinyArt = false;
    openDetail(BY_KEY[m[1]]);
    window.scrollTo(0, 0);
  } else {
    detailTok++; sheetPref = null;
    dv.hidden = true; lv.hidden = false;
    document.title = 'Pokédex';
    window.scrollTo(0, listScroll);
  }
}
async function openDetail(p) {
  const tok = ++detailTok;
  state.dgame = sheetPref || (state.game === 'go' || state.game === 'home' || GAME_BY[state.game] ? state.game : 'all'); // sheet game: its own choice, else the list filter
  document.title = `${p.n} #${pad(p.id)} – Pokédex`;
  $('#detail-view').innerHTML = navHTML(p) + `<div class="detail"><div class="hero${sizeClass(p) ? ' ' + sizeClass(p) : ''}" style="--c1:${TYPE_COLORS[p.t[0]]};--c2:${TYPE_COLORS[p.t[1] || p.t[0]]}"><div class="num">#${pad(p.id)}</div><img src="img/${p.k}.webp" alt="${esc(p.n)}" width="256" height="256"><h1>${esc(p.n)}</h1>${namesHTML(p)}</div><p class="note" id="dload">Chargement de la fiche…</p></div>`;
  try {
    const [sp, shared] = await Promise.all([loadSp(p.id), loadShared()]);
    if (tok !== detailTok) return;
    DET = { p, sp, f: sp.f[p.k], shared };
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
  const ok = g === 'all' || g === 'home' || (g === 'go' && f.go && f.go.r) || (GAME_BY[g] && ((f.av || []).includes(g) || horsGames(DET.p, DET.sp).includes(g)));
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
    (k && HOME_B.has(k) ? `<div class="hshl">${HOME_BS.has(k) ? BARONS_IC : BARON_IC} <b>${HOME_BS.has(k) ? 'Baron shiny' : 'Baron'} dans HOME</b></div>` : '') +
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
    (b.swDone ? ` · ${goldBall('', LVL_T.sw)} Jeux actuels complets` : '') + (b.oldDone ? ` · ${goldBall('🕹', LVL_T.old)} Anciens jeux complets` : '');
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
    const b = megaBaseP(p0);
    h += `<br><span class="mute">Z-A Méga : ${esc((megaStoneOf(p0)||{}).label || 'Méga-Gemme')} ${hasGem(p0, c) ? 'obtenue' : 'non obtenue'} · base ${b ? `<a href="#/p/${b.k}">${esc(b.n)}</a>` : ''} ${b && isCaught(b, c) ? 'capturée' : 'pas encore capturée'} → Méga ${isCaught(p0, c) ? 'capturée' : 'non capturée'}.</span>`;
  } else if (c !== 'go') {
    const gs = gemsFor(p0, c);
    if (gs.length) h += `<br><span class="mute gemline">Méga-Gemme${gs.length > 1 ? 's' : ''} : ${gs.map(m => `${esc(megaStoneOf(m).label)} ${hasGem(m, c) ? 'obtenue' : 'non obtenue'}`).join(' · ')}${isZa(c) ? ' (avec la forme de base capturée = Méga capturée en Z-A)' : ' (simple marque de possession dans ce jeu : les Méga y restent des formes de combat, sans effet sur la complétion)'}.</span>`;
  } else if (goMegas(p0).length) {
    const ms = energyMates(p0);
    h += `<br><span class="mute gemline">${ms.map(m => `${megaXYZ(m) ? `Méga-énergie ${megaXYZ(m).toUpperCase()}` : 'Méga-énergie'} de ${esc((BY_KEY[String(p0.id)] || p0).n)} : ${hasEnergy(m) ? 'obtenue' : 'pas encore obtenue'}`).join(' · ')} (${ms.length > 1 ? 'une marque par Méga' : 'marque par espèce'}, sans effet sur la complétion).</span>`;
  }
  if (alphaOk(p, c)) h += `<br><span class="mute baronl">${BARON_IC} Baron : ${isBaron(p, c) ? 'oui' : 'non'}${isBaronS(p, c) ? ' · Baron shiny ✨' : ''} <small>(sans effet sur la complétion)</small></span>`;
  else if (ALPHA_GAMES.has(c) && !p0.mb && !bo) h += `<br><span class="mute baronl">Ne peut pas être Baron dans ce jeu${(BY_KEY[String(p.id)] || p).lg || (BY_KEY[String(p.id)] || p).my ? ' (légendaire / fabuleux)' : ''}.</span>`;
  { const b = baseStatus(p), avG = grpsOf([...gamesOf(p), ...(p.go ? ['go'] : [])]), n = avG.length, cN = grpsOf(b.c).filter(G => avG.includes(G)).length; h += `<br><span class="mute">Tous jeux confondus : capturé dans ${cN} jeu${cN > 1 ? 'x' : ''} sur ${n} (un jeu et ses extensions comptent pour un) · shiny dans ${grpsOf(b.s).length}.</span>`; }
  if (!hk) return h + (GBA_IDS.has(c) ? '<br><span class="gbanote">Jeu GBA : pas de transfert direct vers HOME (Pal Park → 4ᵉ génération → Poké Transfert → Pokémon Bank). Un Pokémon venu par ce chemin se coche « Sans marque » sur la fiche Pokémon HOME (ancien jeu : ne compte pas pour la dorure).</span>' : '<br>Ce jeu ne peut pas envoyer directement de Pokémon vers HOME.');
  if (c === 'go' && p.my) return h + '<br>Les Pokémon fabuleux ne peuvent pas être transférés depuis Pokémon GO : GO n’est pas requis pour la complétion HOME de ce Pokémon.';
  const om = originOf(c);
  h += ` <span class="mute">(${HOME_KIND_FR[hk]})</span>`;
  if (!bo) h += `<br>${omIcon(om)} ${isTrans(p, c) ? 'Transféré vers HOME' : 'Pas encore transféré vers HOME'} — ${esc(omName(om))}${isTrans(p, c) && !HOME_OG.has(om + ':' + p.k) ? ' <span class="mute">(coché depuis la fiche Pokémon HOME : n’implique pas « Capturé » ici)</span>' : ''}.`;
  return h;
}
function refreshTrack(p) {
  const el = $('#trackinfo'); if (el) el.innerHTML = trackHTML(p);
  const bar = $('#actbar'); if (!bar) return;
  const a = document.activeElement, sel = a && bar.contains(a) ? (a.dataset.mega ? `[data-mega="${a.dataset.mega}"]` : a.dataset.origin ? `[data-origin="${a.dataset.origin}"]` : a.dataset.energy ? `[data-energy="${a.dataset.energy}"]` : '.' + [...a.classList].filter(x => x !== 'act')[0]) : null;
  bar.outerHTML = actbarHTML(p);
  if (sel) { const b = $('#actbar ' + sel); if (b) b.focus(); }
  setBarH();
}
// Fixed action row, same order on every sheet: Capturé · Shiny · Transféré (HOME) · Méga-Gemme(s) / Méga-énergie (GO).
// Buttons that do not apply stay in place, greyed (disabled). The gem/energy slot exists only for forms that have a Mega.
// Mobile: the fixed bottom bar can wrap (HOME origin marks) → its height feeds the bottom padding of the sheet.
function setBarH() { requestAnimationFrame(() => { const b = $('#actbar'), v = $('#detail-view'); if (b && v) v.style.setProperty('--barh', b.offsetHeight + 'px'); }); }
// v25 Baron buttons (official Alpha icon, self-hosted: img/alpha/CREDITS.txt). Baron shiny = icon + ✨ badge; checked = same yellow as Shiny.
const BARON_IC = '<span class="bi" aria-hidden="true"><img src="img/alpha/baron.png" alt="" width="22" height="22"></span>';
const BARONS_IC = '<span class="bi" aria-hidden="true"><img src="img/alpha/baron.png" alt="" width="22" height="22"><span class="bsp"></span></span>'; // ✨ badge drawn in CSS (keeps menu / button text clean)
function baronBtns(on, son, dis, nm, offT) {
  const t1 = dis ? offT : `Baron (Pokémon Alpha)${nm ? ' – ' + nm : ''} : implique « Capturé »`, t2 = dis ? offT : `Baron shiny${nm ? ' – ' + nm : ''} : implique Baron + Shiny + Capturé`;
  return `<button class="act baron" type="button"${dis ? ' disabled' : ''} aria-pressed="${!dis && on}" aria-label="Baron${nm ? ' – ' + esc(nm) : ''}" title="${esc(t1)}">${BARON_IC}<span class="t">Baron</span></button>` +
    `<button class="act barons" type="button"${dis ? ' disabled' : ''} aria-pressed="${!dis && son}" aria-label="Baron shiny${nm ? ' – ' + esc(nm) : ''}" title="${esc(t2)}">${BARONS_IC}<span class="t">B. shiny</span></button>`;
}
function homeBarHTML(p) {
  const q = mp(p, 'home'), av = homeAvail(q), f = HOME_C.get(q.k) || [], dis = !!p.bo, gav = av.filter(isGoldMark), done = gav.filter(m => f.includes(m)).length;
  const extra = f.filter(m => ORI[m] && !av.includes(m)); // ticked from a « hors dex » game sheet: shown so it can be unticked (no effect on completion)
  const btns = [...av, ...extra].sort((a, b) => ORI[a].i - ORI[b].i).map(m => `<button class="act ori${isGoldMark(m) ? '' : ' old'}" type="button" data-origin="${m}"${dis ? ' disabled' : ''} aria-pressed="${f.includes(m)}" aria-label="Transféré – ${esc(omName(m))}" title="${esc(omName(m))}${isGoldMark(m) ? ' (compte pour la dorure)' : ' (ancien jeu : ne compte pas pour la dorure)'} : ${dis ? 'variante de combat, suit la forme de base' : 'transféré vers HOME avec cette marque d’origine (ou reçu par échange dans HOME) — sans marquer « Capturé » dans le jeu'}">${omIcon(m)}<span class="t">${esc(ORI[m].s || ORI[m].n)}</span></button>`).join('');
  const ctx = `<b>Pokémon HOME</b> · ${!av.length ? 'aucune marque possible' : gav.length ? `dorure ${done} / ${gav.length}${done === gav.length ? ' ' + homeIcon(true, HOME_C_T) : ''}${av.length > gav.length ? ` · <span class="oldl">anciens jeux en pointillés</span>` : ''}` : 'anciens jeux seulement (pas de dorure)'}`;
  const shOn = !dis && f.length > 0, shP = HOME_SH.has(q.k);
  const shb = av.length || extra.length ? `<button class="act hsh" type="button"${shOn ? '' : ' disabled'} aria-pressed="${shOn && shP}" aria-label="Shiny dans HOME" title="${shOn ? 'Shiny dans HOME (ce Pokémon / cette forme)' : 'Cochez d’abord au moins une marque d’origine (transfert ou échange)'}"><span class="ic" aria-hidden="true">✨</span><span class="t">Shiny</span></button>` : '';
  const bOn = !dis && homeBaronOn(q), hb = !dis && alphaHomeGames(q).length ? baronBtns(HOME_B.has(q.k), HOME_BS.has(q.k), !bOn, 'HOME', `Cochez d’abord la marque ${alphaHomeGames(q).map(c => omName(ALPHA_MARK[c])).join(' ou ')} (seuls les Pokémon venus de Légendes Arceus / Z-A peuvent être Barons)`) : '';
  return `<div class="actbar homebar" id="actbar" role="toolbar" aria-label="Transferts Pokémon HOME par marque d’origine"><div class="actctx">${ctx}</div><div class="acts oris">${btns ? btns + shb + hb : '<span class="mute">Aucun jeu compatible avec HOME ne contient cette forme.</span>'}</div></div>`;
}
function actbarHTML(p) {
  const c = sheetCtx(), q = mp(p, c), nm = c ? trackName(c) : '';
  if (c === 'home') return homeBarHTML(p);
  const catchDis = !c || c === 'home' || p.bo || !!p.mb; // Megas: Capturé/Shiny derived (Z-A: base + gemme; elsewhere battle-only)
  const hk = c && c !== 'home' ? homeKind(c) : null;
  const trOn = !!(hk && !p.bo && !megaBo(p, c) && !(c === 'go' && p.my)); // same guard as toggleTransfer (logic unchanged)
  const sw = c && GAME_BY[c] ? sharedWith(c, q) : [];
  const trT = !c ? 'Choisissez un jeu pour marquer un transfert' : !hk ? (GBA_IDS.has(c) ? 'Jeu GBA : pas de transfert direct vers HOME (Pal Park → 4ᵉ gén. → Bank : « Sans marque » sur la fiche Pokémon HOME)' : 'Ce jeu ne peut pas envoyer de Pokémon vers HOME') : (c === 'go' && p.my) ? 'Fabuleux : pas de transfert depuis GO' : !trOn ? 'Variante de combat : suit la forme de base' :
    `Transféré vers HOME depuis ${nm}${sw.length ? ' (et ' + sw.map(x => GAME_BY[x].s).join(', ') + ')' : ''}${p.mb ? ' (Méga : manuel, ou auto si gemme + transfert de la base)' : ''}`;
  let slot = '';
  if (c === 'go') slot = energyMates(p).map(m => energyBtnHTML(m)).join(''); // one Méga-énergie per Mega when the species has X / Y
  else {
    const gs = gemSlot(p, c);
    slot = gs.map(x => { const xyz = (x.m.k.match(/mega-(x|y|z)$/) || [])[1]; return gemBtnHTML(x.m, c, x.on, gs.length > 1 ? (xyz ? 'Gemme ' + xyz.toUpperCase() : megaStoneOf(x.m).label) : isZa(c) ? 'Gemme' : 'Méga-Gemme'); }).join(''); // Z-A: short labels (room for the Baron buttons)
  }
  const al = alphaOk(q, c) && !p.bo, bb = al ? baronBtns(isBaron(q, c), isBaronS(q, c), false, nm, '') : ''; // v25: Légendes Arceus / Z-A, Alpha-capable forms only
  const nB = 3 + (al ? 2 : 0) + (slot.match(/class="act /g) || []).length;
  const ctx = !c ? 'Vue d’ensemble — choisissez un jeu (ou Pokémon HOME) pour marquer' : `Suivi : <b>${esc(nm)}</b>${sw.length ? ` <span class="shr">+ ${esc(sw.map(x => GAME_BY[x].s).join(', '))}</span>` : ''}`;
  return `<div class="actbar" id="actbar" role="toolbar" aria-label="Suivi${nm ? ' – ' + esc(nm) : ''}"><div class="actctx">${ctx}</div><div class="acts${nB > 6 ? ' wrap2' : ''}">
    <button class="act cg" type="button" ${catchDis ? 'disabled' : ''} aria-pressed="${isCaught(p, c)}" aria-label="Capturé${nm ? ' – ' + esc(nm) : ''}" title="${p.mb ? (isZa(c) ? 'Capturé en Z-A = forme de base capturée + Méga-Gemme' : 'Méga : forme de combat, suit la forme de base') : ('Capturé' + (nm ? ' – ' + esc(nm) : ''))}">${isCaught(p, c) ? BALL : BALL_OFF}<span class="t">Capturé</span></button>
    <button class="act sh" type="button" ${catchDis ? 'disabled' : ''} aria-pressed="${isShiny(p, c)}" aria-label="Shiny capturé${nm ? ' – ' + esc(nm) : ''}" title="${p.mb ? (isZa(c) ? 'Shiny en Z-A = forme de base shiny + Méga-Gemme' : 'Méga : forme de combat, suit la forme de base') : ('Shiny capturé' + (nm ? ' – ' + esc(nm) : ''))}"><span class="ic" aria-hidden="true">✨</span><span class="t">Shiny</span></button>
    ${bb}<button class="act tr" type="button" ${trOn ? '' : 'disabled'} aria-pressed="${trOn && isTrans(q, c)}" aria-label="Transféré vers HOME${nm ? ' – ' + esc(nm) : ''}" title="${esc(trT)}${hk ? ' — ' + esc(omName(originOf(c))) : ''}">${hk ? omIcon(originOf(c)) : homeBall}<span class="t">${isZa(c) ? 'Transf.' : 'Transféré'}</span></button>
    ${slot}</div></div>`;
}
// Sticky header: back, previous / next, favourite only.
function navHTML(p) {
  const key = ik(p);
  let prev = '', next = '';
  if (GAME_BY[state.game] && DEX[state.game]) { // follow the filtered list when a game is selected
    const seen = new Set(), list = filtered().filter(x => !seen.has(x.id) && seen.add(x.id)); const i = list.findIndex(x => x.id === p.id); // one entry per species (regional form in its region’s dex)
    if (i > 0) prev = `#/p/${list[i - 1].k}`; if (i >= 0 && i < list.length - 1) next = `#/p/${list[i + 1].k}`;
  } else { prev = p.id > 1 ? `#/p/${p.id - 1}` : ''; next = p.id < 1025 ? `#/p/${p.id + 1}` : ''; }
  return `<div class="dtop"><div class="dnav"><a href="#/" aria-label="Retour à la liste">←</a><a class="${prev ? '' : 'disabled'}" href="${prev || '#'}" aria-label="Précédent">‹</a><a class="${next ? '' : 'disabled'}" href="${next || '#'}" aria-label="Suivant">›</a><span class="sp"></span><button class="fav" type="button" aria-pressed="${FAVS.has(key)}" aria-label="Favori">${FAVS.has(key) ? '★' : '☆'}</button></div>${actbarHTML(p)}</div>`;
}
const chartFor = gen => DATA.charts[gen <= 1 ? 1 : gen <= 5 ? 2 : 6];
function effGroups(types, mode, chart) {
  const mults = {};
  for (const [atk, row] of Object.entries(chart)) mults[atk] = types.reduce((m, d) => m * (row[d] ?? 1), 1);
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
function effHTML(types, mode, chart) {
  const body = effGroups(types, mode, chart).map(x => `<div class="eff ${x.cls}"><div class="hd">${x.label} <small>${x.mult}</small></div><div class="badges">` +
    x.types.map(t => `<a class="badge" href="#" data-type="${t}" style="background:${TYPE_COLORS[t]}">${esc(TYPE_FR[t])}</a>`).join('') + '</div></div>').join('');
  return body || '<p class="note">Aucune faiblesse ni résistance.</p>';
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
function formSwitcher(p, gm) {
  let list = FORMS[p.id]; if (!list || list.length < 2) return '';
  const SZ = ['Taille S', 'Taille M', 'Taille L', 'Taille XL']; // Pitrouille / Banshitrouye: chips in size order
  if (list.every(q => SZ.includes(q.l))) list = [...list].sort((a, b) => SZ.indexOf(a.l) - SZ.indexOf(b.l));
  const gi = gm ? GIDX[gm.id] : -1;
  const chips = list.map(q => {
    const na = gm && q.c && !inGame(q, gi);
    return `<a class="fchip${q.k === p.k ? ' cur' : ''}${na ? ' na' : ''}" href="#/p/${q.k}" title="${esc(q.n)}"><img src="img/${q.k}.webp" alt="" loading="lazy" width="36" height="36"><span>${esc(formLabel(q))}</span></a>`;
  }).join('');
  return `<section class="box"><h2>Formes <small class="cnt">${list.length}</small></h2><div class="fchips${list.length > 14 ? ' many' : ''}">${chips}</div>${gm ? '<p class="note">Formes grisées : absentes de ce jeu.</p>' : ''}</section>`;
}
function dexNumbers(sp, gid) {
  const gm = GAME_BY[gid]; const n = sp.gm[gid]; if (!n) return '';
  const parts = [];
  for (let i = 0; i < n.length; i += 2) parts.push(`${gm.dx.length > 1 ? esc(gm.dx[n[i]]) + ' ' : ''}<b>#${pad3(n[i + 1])}</b>`);
  const extra = sp.gm[gid + '*'];
  if (extra) { const ep = []; for (let i = 0; i < extra.length; i += 2) ep.push(`${esc(gm.info[extra[i]])} <b>#${pad3(extra[i + 1])}</b>`); parts.push(`<span class="mute">(îles : ${ep.join(' · ')})</span>`); }
  return parts.join(' · ');
}
const TR_NOTE = '<p class="note trnote">Traduit en français faute de données officielles (traduction automatique, peut différer du texte officiel).</p>';
function flavorHTML(sp, gm) {
  const ftx = id => sp.fv[id] !== undefined ? [sp.ft[sp.fv[id]], false] : sp.tv && sp.tv[id] !== undefined ? [sp.tt[sp.tv[id]], true] : null;
  if (!gm) { // latest available entry (official French first, otherwise machine translation)
    const ks = Object.keys(sp.fv).map(Number).sort((a, b) => b - a);
    if (ks.length) return `<p class="desc">${esc(sp.ft[sp.fv[ks[0]]])}</p>`;
    const kt = Object.keys(sp.tv || {}).map(Number).sort((a, b) => b - a);
    return kt.length ? `<p class="desc">${esc(sp.tt[sp.tv[kt[0]]])}</p>${TR_NOTE}` : '';
  }
  const byText = new Map(); let anyTr = false;
  for (const [id, name] of gm.ver) { const t = ftx(id); if (!t) continue; const k = t[0]; if (!byText.has(k)) byText.set(k, { names: [], tr: t[1] }); byText.get(k).names.push(name); anyTr ||= t[1]; }
  if (!byText.size) return '<p class="note">Pas d’entrée de Pokédex disponible pour ce jeu dans PokéAPI.</p>';
  return [...byText].map(([t, o]) => `<p class="desc"><small>${esc(o.names.join(' / '))}${o.tr ? ' · traduction automatique' : ''}</small><br>${esc(t)}</p>`).join('') + (anyTr ? TR_NOTE : '');
}
function abilitiesHTML(f, gm, ref) {
  const gen = gm ? gm.g : 9;
  if (gm && (gen < 3 || gm.id === 'la')) return `<p class="note">${gm.id === 'la' ? 'Les talents n’existent pas dans Légendes Pokémon : Arceus.' : 'Les talents n’existent pas avant la génération III.'}</p>`;
  let list = pickGen(f.pa, gen, f.a);
  if (gen < 5) list = list.filter(a => !a[1]);
  list = list.filter(a => ((ref.ab[a[0]] || [])[2] || 1) <= gen); // an ability cannot exist before the generation that introduced it
  if (!list.length) return '<p class="note">Aucun talent.</p>';
  return { n: list.length, body: list.map(([id, hid]) => { const a = ref.ab[id]; return a ? `<div class="ab"><b>${esc(a[0])}</b>${hid ? ' <span class="tag2">Talent caché</span>' : ''}<br><span class="mute">${esc(a[1] || '')}</span></div>` : ''; }).join('') };
}
function heldHTML(f, gm, ref) {
  if (!gm || !f.hi) return '';
  const ids = gm.ver.map(v => v[0]); const rows = [];
  for (const [item, rar, vs] of f.hi) { const v = vs.filter(x => ids.includes(x)); if (v.length) rows.push(`<li>${esc(ref.it[item] || '?')} <span class="mute">(${rar} %)</span></li>`); }
  return rows.length ? `<section class="box"><h2>Objets tenus</h2><ul class="plain">${rows.join('')}</ul></section>` : '';
}

/* moves */
function moveInfo(id, gm, moves) {
  const m = moves[id]; if (!m) return null;
  let [name, type, cls, power, acc, pp, past] = m;
  if (past) for (const [vo, o] of [...past].sort((a, b) => b[0] - a[0])) if (vo >= gm.vo) { if (o.t) type = o.t; if (o.p !== undefined) power = o.p; if (o.a !== undefined) acc = o.a; if (o.pp !== undefined) pp = o.pp; }
  if (gm.g <= 3 && cls !== 'n') cls = PHYS_TYPES.has(type) ? 'p' : 's';
  return { name, type, cls, power, acc, pp };
}
const CLS_LABEL = { p: 'Physique', s: 'Spéciale', n: 'Statut' };
function moveRow(id, gm, shared, lead) {
  const m = moveInfo(id, gm, shared.moves); if (!m) return '';
  return `<div class="mv"><span class="lv">${lead ?? ''}</span><span class="mn"><b>${esc(m.name)}</b> ${badge(m.type)} <span class="cls cls-${m.cls}">${CLS_LABEL[m.cls]}</span></span><span class="ms">Puis. ${m.power ?? '—'} · Préc. ${m.acc ?? '—'} · PP ${m.pp ?? '—'}</span></div>`;
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
function encHTML(f, sp, gm, shared) {
  const src = f.en ? f : (f.enOf && sp.f[f.enOf]) || f;
  const rows = (src.en && src.en[gm.id]) || [];
  let body;
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
  if (p.c === 'mega') note = 'Méga-Évolution : hors Légendes Z-A (X/Y, ROSA, Soleil/Lune, USUL, Let’s Go), variante de combat qui suit la forme de base. En Légendes Z-A : marquez la Méga-Gemme ici. Capturé / shiny = forme de base capturée (ou shiny) dans la sauvegarde Z-A <b>et</b> gemme obtenue. Transfert HOME : manuel, sauf si la gemme est cochée — transférer la base transfère aussi cette Méga.';
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
    const me = `<a class="evpk${cur ? ' cur' : ''}" href="#/p/${q.k}"><img src="img/${q.k}.webp" alt="" loading="lazy" width="72" height="72"><span>${esc(q.n)}</span><small>#${pad(q.id)}</small></a>`;
    if (seen.has(k)) return `<div class="evrow">${me}</div>`;
    seen.add(k);
    const kids = (out[k] || []).map(e => `<div class="evrow"><div class="evlink">${e.lines.map(l => `<div>${esc(cap(l))}</div>`).join('') || ''}</div>${node(e.t)}</div>`).join('');
    return kids ? `<div class="evrow">${me}<div class="evbranch">${kids}</div></div>` : `<div class="evrow">${me}</div>`;
  };
  return (note ? `<p class="note">${note}</p>` : '') + `<div class="evo">${roots.map(r => node(r)).join('')}</div>`;
}

/* Pokémon GO */
function goHTML(p, f, sp, shared, go) {
  const d = f.go;
  const moveRowGo = (key, fast, elite) => {
    const m = go.moves[key]; if (!m) return '';
    const [fr, type, power, energy, dur] = m; const s = dur / 1000;
    const dps = s ? (power / s) : 0, eps = s ? energy / s : 0;
    return `<div class="mv"><span class="lv"></span><span class="mn"><b>${esc(fr)}${elite ? ' †' : ''}</b> ${badge(type)}</span><span class="ms">Puis. ${power} · ${fast ? 'Énergie +' : 'Énergie −'}${energy} · ${dec(s.toFixed(1))} s · DPS ${dec(dps.toFixed(1))}${fast ? ` · EPS ${dec(eps.toFixed(1))}` : ''}</span></div>`;
  };
  const fm = d.fm.map(k => moveRowGo(k, true, false)).join('') + (d.fe || []).map(k => moveRowGo(k, true, true)).join('');
  const cm = d.cm.map(k => moveRowGo(k, false, false)).join('') + (d.ce || []).map(k => moveRowGo(k, false, true)).join('');
  const shadow = d.shm && go.moves[d.shm] ? `<p class="note">Obscur : ${esc(go.moves[d.shm][0])} · Purifié : ${esc(go.moves[d.pum]?.[0] || '—')}</p>` : '';
  const sh = d.sh ? (d.sh.length ? `Oui (${d.sh.map(s => ({ wild: 'sauvage', raid: 'raid', egg: 'œuf', evolution: 'évolution', research: 'recherche', photobomb: 'photobomb', alola: 'forme d’Alola' }[s] || s)).join(', ')})` : 'Oui') : (p.c ? 'Non vérifié pour cette forme' : 'Non disponible');
  const types = d.t;
  // GO blocks, placed by renderDetail in the fixed sheet order (stats → moves → evolution → GO infos)
  return {
    stats: `
    <section class="box gostats"><h2>Statistiques GO <small class="cnt">${esc(p.c ? p.n : '')}</small></h2>
      <div class="kv kv3"><div><b>${d.a}</b><span>Attaque</span></div><div><b>${d.d}</b><span>Défense</span></div><div><b>${d.s}</b><span>Endurance</span></div></div>
      <div class="kv"><div><b>${fmt(d.m50)}</b><span>PC max niv. 50 (IV 15/15/15)</span></div><div><b>${fmt(d.m51)}</b><span>PC max niv. 51 (meilleur compagnon)</span></div></div>
      <p class="note">PC max = formule officielle avec le multiplicateur de PC du niveau (vérifiée : Mewtwo 4 724 au niv. 50).</p></section>
    <section class="box"><h2>Faiblesses &amp; résistances <small class="cnt">GO</small></h2>${effHTML(types, 'go', DATA.charts[6])}
      <p class="note">Multiplicateurs de Pokémon GO (×1,6 par faiblesse, ×0,625 par résistance ; une immunité des jeux principaux compte comme une double résistance).</p></section>`,
    moves: `
    <section class="box"><h2>Attaques rapides</h2><div class="mvs">${fm || '<p class="note">—</p>'}</div></section>
    <section class="box"><h2>Attaques chargées</h2><div class="mvs">${cm || '<p class="note">—</p>'}</div>${shadow}<p class="note">† : attaque exclusive (disponible via événement / MT élite). DPS = puissance ÷ durée.</p></section>`,
    info: `
    <section class="box goinfo"><h2>Pokémon GO : bonbons, compagnon, œufs</h2>
      <ul class="plain gol">
        <li>Statut : <b>${d.r ? 'disponible dans Pokémon GO' : 'pas encore sorti'}</b></li>
        <li>Shiny : <b>${sh}</b></li>
        ${d.bd ? `<li>Distance compagnon : <b>${dec(d.bd)} km</b> par bonbon</li>` : ''}
        ${d.eg ? `<li>Éclosion d’œuf (pool actuel) : <b>${d.eg.map(e => e[0] + ' km' + ({ as: ' (récompense Aventure Synchro)', ga: ' (cadeau d’ami)', gr: ' (cadeau de route)' }[e[1]] || '')).join(', ')}</b></li>` : ''}
        ${d.th ? `<li>Seconde attaque chargée : <b>${fmt(d.th[0])}</b> poussières d’étoiles + <b>${d.th[1]}</b> bonbons</li>` : ''}
        ${!d.bd && !d.eg && !d.th ? '<li>Pas de données de compagnon / œufs pour cette forme.</li>' : ''}
      </ul>
      <p class="note">Bonbons d’évolution : voir « Évolutions » ci-dessus. Œufs : seul le pool de la saison actuelle est connu${go.egg ? ` (${esc(go.egg.season)}, au ${go.egg.upd.split('-').reverse().join('/')}, source Leek Duck)` : ''} ; un Pokémon sans distance indiquée n’est pas dans ce pool (ou la donnée manque).</p></section>`
  };
}

function renderDetail() {
  const { p, sp, f, shared } = DET;
  const mode = state.dgame; // 'all' | 'home' | 'go' | game id
  const gm = GAME_BY[mode]; const isGo = mode === 'go';
  const gen = gm ? gm.g : 9;
  const key = ik(p);
  const types = isGo && f.go ? f.go.t : gm ? pickGen(f.pt, gen, f.t) : f.t;
  const c1 = TYPE_COLORS[types[0]], c2 = TYPE_COLORS[types[1] || types[0]];
  const flags = [p.lg && 'Légendaire', p.my && 'Fabuleux', p.ba && 'Bébé', `Gén. ${GEN_LABELS[p.g]}`].filter(Boolean);
  const games = availGames(f);
  const goOk = f.go && f.go.r;
  const opts = `<option value="all"${mode === 'all' ? ' selected' : ''}>Vue d’ensemble (infos générales)</option><option value="home"${mode === 'home' ? ' selected' : ''}>Pokémon HOME (transferts)</option>` +
    (goOk ? `<option value="go"${isGo ? ' selected' : ''}>Pokémon GO</option>` : '') +
    games.map(g => `<option value="${g}"${mode === g ? ' selected' : ''}>${esc(GAME_BY[g].n)}</option>`).join('') +
    horsGames(p, sp).filter(g => !games.includes(g)).map(g => `<option value="${g}"${mode === g ? ' selected' : ''}>${esc(GAME_BY[g].n)} — hors dex</option>`).join('');
  const gimg = `img/${p.k}.webp`, simg = `img/s/${p.k}.webp`;
  const regional = gm ? dexNumbers(sp, gm.id) : '';
  // Fixed body order: description → stats → abilities → moves → evolution → encounters → games → GO
  let body = '';
  if (isGo && f.go && DET.go) {
    const g = goHTML(p, f, sp, shared, DET.go);
    body = flavorHTML(sp, null) + g.stats + g.moves +
      `<section class="box"><h2>Évolutions <small class="cnt">GO</small></h2>${evoHTML(p, f, 'go', null)}<p class="note">Coûts en bonbons et conditions issus des données GO communautaires.</p></section>` +
      g.info;
  } else {
    const sArr = gm ? pickGen(f.ps, gen, f.s) : f.s;
    const gen1 = gm && gen === 1;
    const chart = chartFor(gm ? gen : 9);
    const mode2 = 'main';
    const goBox = goOk ? `<section class="box gobox"><h2>Pokémon GO</h2><p class="gol1">Disponible dans Pokémon GO${f.go.m50 ? ` · PC max niv. 50 : <b>${fmt(f.go.m50)}</b>` : ''}${f.go.bd ? ` · compagnon : <b>${dec(f.go.bd)} km</b>` : ''}</p><p><a href="#" class="golink" data-game="go">Voir les données Pokémon GO →</a></p></section>` : '';
    body = `${flavorHTML(sp, gm)}
    ${regional ? `<section class="box"><h2>Pokédex régional</h2><p class="rn-line">${regional}</p></section>` : ''}
    <section class="box"><div class="kv"><div><b>${dec(f.h)} m</b><span>Taille</span></div><div><b>${dec(f.w)} kg</b><span>Poids</span></div></div>
      ${gm ? '' : `<div class="kv kv3 sm"><div><b>${sp.gr < 0 ? 'Asexué' : `${dec(((8 - sp.gr) / 8 * 100).toFixed(1))} % ♂`}</b><span>${sp.gr < 0 ? 'Sexe' : `${dec((sp.gr / 8 * 100).toFixed(1))} % ♀`}</span></div><div><b>${sp.cr}</b><span>Taux de capture</span></div><div><b>${fmt((sp.hc + 1) * 255)}</b><span>Pas pour éclore</span></div></div>
      <p class="note">Groupes d’œuf : ${sp.eg.map(esc).join(', ') || '—'} · Croissance : ${GROWTH[sp.gw] || sp.gw} · Bonheur de base : ${sp.bh}</p>`}</section>
    <section class="box"><h2>Statistiques de base${gm ? ` <small class="cnt">${esc(gm.s)}</small>` : ''}</h2>${statsHTML(sArr, gen1)}
      <p class="note">${gm ? (gen1 ? 'Génération I : une seule stat Spécial. ' : '') + `Stats telles qu’en génération ${['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'][gen]} (PokéAPI).` : 'Stats actuelles (dernière génération). Choisissez un jeu pour voir les stats de son époque.'}</p></section>
    <section class="box"><h2>Faiblesses &amp; résistances${gm ? ` <small class="cnt">${esc(gm.s)}</small>` : ''}</h2>
      <div id="eff">${effHTML(types, mode2, chart)}</div>
      <p class="note" id="effnote">${effNote(mode2, gm)}</p></section>
    ${(() => { const ab = abilitiesHTML(f, gm, shared.ref); return typeof ab === 'string' ? `<section class="box"><h2>Talents</h2>${ab}</section>` : `<section class="box"><h2>Talents <span class="cntb" title="${ab.n} talent${ab.n > 1 ? 's' : ''}">${ab.n}</span></h2>${ab.body}</section>`; })()}
    ${heldHTML(f, gm, shared.ref)}
    ${gm ? movesHTML(f, sp, gm, shared) : ''}
    <section class="box"><h2>Évolutions${gm ? ` <small class="cnt">${esc(gm.s)}</small>` : ''}</h2>${evoHTML(p, f, 'game', gm)}
      <p class="note">Conditions issues de PokéAPI${gm ? ' pour l’époque de ce jeu' : ' (dernière version)'} ; les Pokémon trop récents pour la génération choisie sont masqués. Les coûts en bonbons GO sont dans l’onglet Pokémon GO.</p></section>
    ${gm ? encHTML(f, sp, gm, shared) : mode === 'home' ? '' : homeSrcHTML(p, f)}
    ${availHTML(sp, games, horsGames(p, sp).filter(g => !games.includes(g)))}
    ${goBox}`;
  }
  $('#detail-view').innerHTML = navHTML(p) + `
  <div class="detail">
    <div class="hero${sizeClass(p) ? ' ' + sizeClass(p) : ''}" style="--c1:${c1};--c2:${c2}">
      <div class="num">#${pad(p.id)}</div>
      <img id="heroimg" src="${showShinyArt && p.sh ? simg : gimg}" alt="${esc(p.n)}" width="256" height="256">
      ${p.sh ? `<button id="shbtn" class="shart" type="button" aria-pressed="${showShinyArt}" title="Afficher l’illustration shiny">✨ ${showShinyArt ? 'Normal' : 'Shiny'}</button>` : ''}
      <h1>${esc(p.n)}</h1>
      ${namesHTML(p, sp)}
      <div class="badges">${types.map(t => `<a class="badge" href="#" data-type="${t}">${esc(TYPE_FR[t])}</a>`).join('')}</div>
      <div class="tags">${flags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
    </div>
    <section class="box trackbox"><div class="gamebar"><label for="dgame">Jeu</label><select id="dgame" aria-label="Jeu">${opts}</select></div><div class="trackinfo" id="trackinfo">${trackHTML(p)}</div></section>
    ${formSwitcher(p, gm)}
    ${body}
    <p class="note disclaimer">Les données proviennent de PokéAPI et de sources communautaires : elles peuvent contenir des erreurs ou différer des jeux. Les données Pokémon GO sont communautaires et non officielles.</p>
  </div>`;
  setBarH();
}
// hero names: French (h1) → genus · English → Japanese · romaji
function namesHTML(p, sp) {
  const l1 = [sp && sp.gn, p.en].filter(Boolean).map((t, i, a) => (sp && sp.gn && i === 0) ? `<span class="gn">${esc(t)}</span>` : `<span lang="en" class="en">${esc(t)}</span>`).join(' · ');
  const l2 = p.ja ? `<span lang="ja" class="ja">${esc(p.ja)}</span>${p.ro ? ` · <span class="ro">${esc(p.ro)}</span>` : ''}` : '';
  return `<div class="genus">${l1}</div>${l2 ? `<div class="jname">${l2}</div>` : ''}`;
}
function renderDetailKeepScroll() { const y = window.scrollY; renderDetail(); window.scrollTo(0, y); }
function homeSrcHTML(p, f) {
  if (p.bo) return ''; // battle-only variant: shown through the base form
  const av = homeAvailF(p, f), t = HOME_C.get(p.k) || [], sh = HOME_S.get(p.k) || [];
  if (!av.length) return '';
  const gav = av.filter(isGoldMark);
  return `<section class="box"><h2>Transferts vers HOME <small class="cnt">${gav.filter(m => t.includes(m)).length} / ${gav.length}</small></h2>` +
    `<p class="note" style="margin:0 0 6px">Une marque d’origine par jeu (et ses extensions) · ${homeIcon(true, HOME_C_T)} toutes les marques Switch + GO (les anciens jeux sont affichés mais ne comptent pas)${homeComplete(p, av) ? ' (complet)' : ''}. Pour cocher : « Pokémon HOME » ou le jeu dans le sélecteur.</p>` +
    `<ul class="plain homerows">${av.map(m => `<li class="${t.includes(m) ? 'on' : ''}">${omIcon(m)} ${esc(omName(m))} — ${t.includes(m) ? 'transféré' : 'pas transféré'}${isGoldMark(m) ? '' : ' <span class="mute">(ancien jeu, hors dorure)</span>'}${sh.includes(m) ? ' · ✨ shiny' : ''}</li>`).join('')}</ul></section>`;
}
function availHTML(sp, games, hors = []) {
  if (!games.length && !hors.length) return '';
  const rows = games.map(g => { const n = dexNumbers(sp, g); return `<li><a href="#" data-game="${g}">${esc(GAME_BY[g].n)}</a>${n ? ` <span class="mute">${n}</span>` : ''}</li>`; }).join('');
  const hrows = hors.map(g => `<li><a href="#" data-game="${g}">${esc(GAME_BY[g].n)}</a> <span class="mute">hors dex</span></li>`).join('');
  return `<section class="box"><h2>Présent dans <small class="cnt">${games.length} jeux</small></h2><ul class="plain avl">${rows}</ul>${hors.length ? `<h3 class="h3">Hors Pokédex régional <small class="cnt">${hors.length}</small></h3><ul class="plain avl">${hrows}</ul>` : ''}<p class="note">Selon les Pokédex régionaux (PokéAPI). « Hors dex » : obtenable par transfert, échange ou événement sans figurer dans le Pokédex régional (marques possibles, sans effet sur la complétion). Touchez un jeu pour voir ses données.</p></section>`;
}
function effNote(mode, gm) {
  return mode === 'go'
    ? 'Multiplicateurs de Pokémon GO (×1,6 par faiblesse, ×0,625 par résistance ; une immunité des jeux principaux compte comme une double résistance).'
    : `Multiplicateurs des jeux principaux (×2, ×½, immunités ×0)${gm ? ` — table des types de la génération ${['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'][gm.g]}, types du jeu.` : ' — table des types actuelle (pour GO, choisissez Pokémon GO dans le sélecteur de jeu).'}`;
}
async function changeGame(g) {
  state.dgame = g;
  if (g === 'go') { try { DET.go = await loadGo(); } catch { alert('Données GO indisponibles hors-ligne : ouvrez-les une fois avec une connexion.'); state.dgame = 'all'; } }
  pickGame(state.dgame); sheetPref = state.dgame;
  renderDetail();
}
document.addEventListener('change', e => { if (e.target.id === 'dgame') changeGame(e.target.value); });

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
  const sb = e.target.closest('#shbtn');
  if (sb) { showShinyArt = !showShinyArt; renderDetailKeepScroll(); return; }
  const cgb = e.target.closest('#actbar .cg'), shb = e.target.closest('#actbar .sh');
  if (cgb || shb) {
    const p = DET && DET.p; if (!p || (cgb || shb).disabled) return;
    toggleMark(p, cgb ? 'caught' : 'shiny', sheetCtx()); refreshTrack(p); render();
    return;
  }
  const gemb = e.target.closest('#actbar .gem[data-mega]');
  if (gemb) {
    const p = DET && DET.p, m = BY_KEY[gemb.dataset.mega], c = sheetCtx(); if (!p || !m || !m.mb || gemb.disabled || !megaInGame(m, c)) return;
    toggleGem(m, c); refreshTrack(p); render(); // immediate: buttons, Mega capture/transfer state, counters
    return;
  }
  const enb = e.target.closest('#actbar .energy');
  if (enb) { const p = DET && DET.p, m = BY_KEY[enb.dataset.energy]; if (!p || !m || !m.mb || enb.disabled || sheetCtx() !== 'go') return; toggleEnergy(m); refreshTrack(p); render(); return; }
  const bab = e.target.closest('#actbar .baron, #actbar .barons');
  if (bab) { const p = DET && DET.p, c = sheetCtx(); if (!p || bab.disabled || !c) return; const sh = bab.classList.contains('barons'); if (c === 'home') toggleHomeBaron(p, sh); else toggleBaron(p, sh, c); refreshTrack(p); render(); return; }
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
  navigator.serviceWorker.register('sw.js').then(() => navigator.serviceWorker.ready).then(() => {
    const metered = navigator.connection && (navigator.connection.saveData || navigator.connection.type === 'cellular');
    if (!store.get('imgsDone', false) && !metered) cacheImages();
    else showOffline();
  }).catch(() => {});
}
let caching = false;
function showOffline(msg) {
  const imgs = store.get('imgsDone', false), pack = store.get('packDone2', false);
  $('#offline').innerHTML = msg || [
    imgs ? '<p style="margin:0">✓ Images des Pokémon enregistrées pour le hors-ligne.</p>' : '<p style="margin:0"><button id="dl">Télécharger les images des Pokémon (~12 Mo)</button></p>',
    pack ? '<p>✓ Formes, fiches détaillées, jeux et Pokémon GO disponibles hors-ligne.</p>' : '<p><button id="dl2">Télécharger les formes et toutes les fiches (~14 Mo)</button></p>',
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
  const fail = await runPool(E.filter(p => !p.c).map(p => `img/${p.k}.webp`), 4, 'Téléchargement des images');
  caching = false;
  if (!fail) store.set('imgsDone', true);
  showOffline();
}
async function cachePack() {
  if (caching) return; caching = true;
  const urls = [...E.filter(p => p.c).map(p => `img/${p.k}.webp`), ...Array.from({ length: 1025 }, (_, i) => `data/sp/${i + 1}.json`),
    'data/evo.json', 'data/moves.json', 'data/ref.json', 'data/go.json', 'data/tm.json', 'data/loc.json', 'data/mega-energy.json', ...GAMES.map(g => `data/dex/${g.id}.json`), ...Object.values(VDEX).filter(v => v.file).map(v => `data/dex/${v.file}.json`)];
  const fail = await runPool(urls, 5, 'Téléchargement des formes et fiches');
  caching = false;
  if (!fail) store.set('packDone2', true);
  showOffline();
}
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
    const data = { favs: [...FAVS], caught: [...CAUGHT], shiny: [...SHINY], caught_g: [...CAUGHT_G], shiny_g: [...SHINY_G], home_g: [...TRANS_G], homeshiny_g: [...STRANS_G], home_o: [...HOME_O], home_og: [...HOME_OG], home_sh: [...HOME_SH], baron_g: [...BARON_G], barons_g: [...BARONS_G], home_b: [...HOME_B], home_bs: [...HOME_BS], mega_gems: [...MEGA_GEMS], mega_energy: [...MEGA_ENERGY] };
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
      const om = x => Array.isArray(x) ? x.filter(v => typeof v === 'string' && ORI[v.slice(0, v.indexOf(':'))] && BY_KEY[v.slice(v.indexOf(':') + 1)]) : [];
      if (Array.isArray(d.home_sh)) d.home_sh.filter(k => typeof k === 'string' && BY_KEY[k]).forEach(k => HOME_SH.add(k)); else mt(d.homeshiny_g).forEach(n => HOME_SH.add(n.slice(n.indexOf(':') + 1)));
      mk(d.baron_g).forEach(n => { BARON_G.add(n); CAUGHT_G.add(n); }); mk(d.barons_g).forEach(n => { BARONS_G.add(n); BARON_G.add(n); SHINY_G.add(n); CAUGHT_G.add(n); }); // v25
      const fk = x => Array.isArray(x) ? x.filter(k => typeof k === 'string' && BY_KEY[k]) : [];
      fk(d.home_b).forEach(k => HOME_B.add(k)); fk(d.home_bs).forEach(k => HOME_BS.add(k));
      if (Array.isArray(d.home_o)) { om(d.home_o).forEach(n => HOME_O.add(n)); om(d.home_og).forEach(n => { if (HOME_O.has(n)) HOME_OG.add(n); }); }
      else [...mt(d.home_g), ...mt(d.homeshiny_g)].forEach(n => { const i = n.indexOf(':'), m = originOf(n.slice(0, i)); if (m) { HOME_O.add(m + n.slice(i)); HOME_OG.add(m + n.slice(i)); } });
      if (Array.isArray(d.mega_gems)) d.mega_gems.filter(x => typeof x === 'string').map(x => x.includes(':') ? x : 'za:' + x).filter(x => { const i = x.indexOf(':'), k = x.slice(i + 1); return GAME_BY[x.slice(0, i)] && BY_KEY[k] && BY_KEY[k].mb; }).forEach(x => MEGA_GEMS.add(x));
      if (Array.isArray(d.mega_energy)) d.mega_energy.map(String).filter(k => /^\d+(-[xyz])?$/.test(k)).forEach(k => MEGA_ENERGY.add(k));
      migrateEnergy(); migrateMarks(); rebuildHome(); store.set('mega_energy', [...MEGA_ENERGY]);
      store.set('favs', [...FAVS]); store.set('caught', [...CAUGHT]); store.set('shiny', [...SHINY]); store.set('caught_g', [...CAUGHT_G]); store.set('shiny_g', [...SHINY_G]); store.set('home_g', [...TRANS_G]); store.set('homeshiny_g', [...STRANS_G]); store.set('home_o', [...HOME_O]); store.set('home_og', [...HOME_OG]); store.set('mega_gems', [...MEGA_GEMS]);
      render(); alert('Sauvegarde importée.');
    } catch { alert('Fichier invalide.'); }
    im.value = '';
  });
})();

/* ---------------- v24: Jeux menu (custom accessible listbox; the native #game <select> stays as the hidden source of truth) ---------------- */
// Console families (double separator when it changes) and representative colours (one or two versions; a game and its expansions share them)
const CONSOLE_OF = { zadlc: 'Switch', za: 'Switch', svdisk: 'Switch', svmask: 'Switch', sv: 'Switch', la: 'Switch', bdsp: 'Switch', swcrown: 'Switch', swisle: 'Switch', sw: 'Switch', lgpe: 'Switch',
  usum: '3DS', sm: '3DS', oras: '3DS', xy: '3DS', b2w2: 'DS', bw: 'DS', hgss: 'DS', pt: 'DS', dp: 'DS', e: 'Game Boy Advance', frlg: 'Game Boy Advance', rs: 'Game Boy Advance', c: 'Game Boy / Color', gs: 'Game Boy / Color', y: 'Game Boy / Color', rb: 'Game Boy / Color' };
const GAME_COLORS = { home: ['#25b5a0'], go: ['#3a8ee6'], za: ['#2fae6f'], zadlc: ['#2fae6f'], sv: ['#e0383e', '#8b45c5'], svmask: ['#e0383e', '#8b45c5'], svdisk: ['#e0383e', '#8b45c5'], la: ['#c99a3a'],
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
  const sel = $('#' + selId); if (!sel || MENUS[selId]) return;
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
  document.addEventListener('pointerdown', e => { if (M.open && !wrap.contains(e.target)) closeMenu(M, false); });
  buildMenu(M); syncMenu(M);
}
function buildMenu(M) {
  const { cfg } = M;
  M.items = [...M.sel.options].map(o => ({ v: o.value, label: o.value ? o.textContent : cfg.allLabel, dis: o.disabled }));
  let html = '', prev = null;
  M.items.forEach((it, i) => {
    const sp = cfg.sep ? cfg.sep(it.v, prev) : '';
    if (Array.isArray(sp)) html += `<li class="gsep2" role="presentation" aria-hidden="true">${sp[1] ? `<span>${esc(sp[1])}</span>` : ''}</li>`;
    else if (sp) html += '<li class="gsep" role="presentation" aria-hidden="true"></li>';
    prev = it.v;
    html += `<li id="${cfg.listId}-${i}" class="gopt" role="option" data-i="${i}" data-v="${esc(it.v)}" aria-selected="false"${it.dis ? ' aria-disabled="true"' : ''}>${cfg.dot ? cfg.dot(it.v) : ''}<span class="gl">${esc(it.label)}</span></li>`;
  });
  M.list.innerHTML = html; M.sig = M.items.map(x => x.v + '|' + x.label + '|' + x.dis).join('\n');
}
function syncMenu(M) {
  const sig = [...M.sel.options].map(o => o.value + '|' + (o.value ? o.textContent : M.cfg.allLabel) + '|' + o.disabled).join('\n');
  if (sig !== M.sig && !M.open) buildMenu(M); // labels / disabled state change with the list context (Catégorie)
  const v = M.sel.value, it = M.items.find(x => x.v === v) || M.items[0];
  M.btn.innerHTML = `${v && M.cfg.dot ? M.cfg.dot(v) : ''}<span class="gl">${esc(v ? it.label : M.cfg.empty)}</span><span class="gcaret" aria-hidden="true">▾</span>`;
  M.btn.setAttribute('aria-label', M.cfg.label + ' : ' + (v ? it.label : 'tous'));
  for (const li of M.list.querySelectorAll('.gopt')) li.setAttribute('aria-selected', String(li.dataset.v === v));
}
function syncMenus() { for (const M of Object.values(MENUS)) syncMenu(M); }
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
function initGameMenu() {
  initMenu('game', { btnId: 'gamebtn', listId: 'gamelist', label: 'Jeu', empty: 'Jeux', allLabel: 'Tous les jeux (aucun filtre)', dot: gdot,
    sep: (v, pv) => { const g = GAME_BY[gameOfValue(v)]; if (!g) return ''; const pg = pv != null && GAME_BY[gameOfValue(pv)]; const con = CONSOLE_OF[g.id] || '';
      return !pg || CONSOLE_OF[pg.id] !== con ? ['sep2', con] : pg.g !== g.g ? 'sep' : ''; } });
}
// Catégorie: simple separators between families (sélection · captures · complétion jeux · HOME)
const CAT_SEP_BEFORE = new Set(['caught', 'swdone', 'trans', 'baron']);
function initCatMenu() { initMenu('cat', { btnId: 'catbtn', listId: 'catlist', label: 'Catégorie', empty: 'Catégorie', allLabel: 'Toutes catégories (aucun filtre)', sep: v => CAT_SEP_BEFORE.has(v) ? 'sep' : '', dot: v => v === 'baron' || v === 'nobaron' ? BARON_IC : v === 'barons' || v === 'nobarons' ? BARONS_IC : '' }); }
