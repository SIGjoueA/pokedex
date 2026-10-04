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
const state = { q: '', types: [], gen: '', cat: '', sort: 'id', game: '', forms: store.get('forms', false), view: store.get('view', 'grid'), dgame: 'home' };
let listScroll = 0;
const ik = p => p.c ? p.k : p.id; // key used in the global sets
// Tracking context: a game id (or 'go') when one is selected in the Jeux filter, otherwise null = global marks (unchanged behaviour)
// 'home' = Pokémon HOME: read-only, derived from the "Transféré vers Home" marks of the compatible games.
const TRANS_G = new Set(store.get('home_g', [])), STRANS_G = new Set(store.get('homeshiny_g', []));
const trackCtx = () => (GAME_BY[state.game] || state.game === 'go' || state.game === 'home') ? state.game : null;
const trackName = (c = trackCtx()) => { return c === 'go' ? 'Pokémon GO' : c === 'home' ? 'Pokémon HOME' : c ? GAME_BY[c].s : ''; };
const homeKind = c => c === 'go' ? 'direct' : (GAME_BY[c] && GAME_BY[c].h) || null; // direct | bank | transporter | null
const HOME_KIND_FR = { direct: 'transfert direct vers HOME', bank: 'via Pokémon Bank', transporter: 'via Poké Fret / Pokémon Bank' };
const gkey = (c, p) => c + ':' + p.k;
let HOME_C = new Map(), HOME_S = new Map(); // entry key -> [game ids]
let CAUGHT_BY = new Map(), SHINY_BY = new Map(); // entry key -> [game ids incl. 'go'] with a per-game mark
function rebuildHome() {
  CAUGHT_BY = new Map(); SHINY_BY = new Map();
  for (const [set, map] of [[CAUGHT_G, CAUGHT_BY], [SHINY_G, SHINY_BY]]) for (const x of set) { const i = x.indexOf(':'); const k = x.slice(i + 1); (map.get(k) || map.set(k, []).get(k)).push(x.slice(0, i)); }
  HOME_C = new Map(); HOME_S = new Map();
  for (const [set, map] of [[TRANS_G, HOME_C], [STRANS_G, HOME_S]]) for (const x of set) { const i = x.indexOf(':'); const g = x.slice(0, i), k = x.slice(i + 1); (map.get(k) || map.set(k, []).get(k)).push(g); }
}
rebuildHome();
// Games (incl. 'go') compatible with Home in which an entry exists. Needs the regional dex files of the compatible games (loaded when Home is selected).
const COMPAT = () => [...GAMES.filter(g => g.h).map(g => g.id), 'go'];
const gamesOf = p => GAMES.filter((g, i) => inGame(p, i)).map(g => g.id);
const homeAvail = p => [...gamesOf(p).filter(g => GAME_BY[g].h), ...(p.go ? ['go'] : [])];
// ---- base view: read-only status derived from the per-game marks
const SWITCH_IDS = new Set(['za', 'zadlc', 'svdisk', 'svmask', 'sv', 'la', 'bdsp', 'swcrown', 'swisle', 'sw', 'lgpe']);
const coreOf = av => { const b = av.filter(g => GAME_BY[g].k !== 'dlc'); return b.length ? b : av; }; // extensions only count when no base game has it
function baseStatus(p, av) {
  av ||= gamesOf(p);
  const c = CAUGHT_BY.get(p.k) || [], s = SHINY_BY.get(p.k) || [];
  const sw = coreOf(av.filter(g => SWITCH_IDS.has(g))), old = coreOf(av.filter(g => !SWITCH_IDS.has(g)));
  const done = (need, have) => need.length > 0 && need.every(g => have.includes(g));
  const legacyC = CAUGHT.has(ik(p)), legacyS = SHINY.has(ik(p));
  return { c, s, sw, old, legacyC, legacyS, any: c.length > 0 || legacyC, shAny: s.length > 0 || legacyS,
    swDone: done(sw, c), oldDone: done(old, c), shSwDone: done(sw, s), shOldDone: done(old, s) };
}
const homeAvailF = (p, f) => [...(f.av || []).filter(g => GAME_BY[g] && GAME_BY[g].h).sort((a, b) => GIDX[a] - GIDX[b]), ...(p.go ? ['go'] : [])];
// "complete" = transferred from every compatible game where it exists (DLC/extension games count only when no base game has it)
const homeComplete = (p, av) => { const t = HOME_C.get(p.k) || []; const base = av.filter(g => !(GAME_BY[g] && GAME_BY[g].k === 'dlc')); const need = base.length ? base : av; return need.length > 0 && need.every(g => t.includes(g)); };
const isCaught = (p, c = trackCtx()) => { return c === 'home' ? HOME_C.has(p.k) : c ? CAUGHT_G.has(gkey(c, p)) : CAUGHT_BY.has(p.k) || CAUGHT.has(ik(p)); };
const isShiny = (p, c = trackCtx()) => { return c === 'home' ? HOME_S.has(p.k) : c ? SHINY_G.has(gkey(c, p)) : SHINY_BY.has(p.k) || SHINY.has(ik(p)); };
const isTrans = (p, c = trackCtx()) => TRANS_G.has(gkey(c, p)), isSTrans = (p, c = trackCtx()) => STRANS_G.has(gkey(c, p));
// The sheet has its own tracking context: its game switcher (state.dgame). 'home' = general infos → read-only (Home view if the list is on Home, else the derived overview).
let sheetPref = null; // game chosen in the sheet switcher during this visit to the sheets (reset on return to the list)
const sheetCtx = () => { const d = state.dgame; if (d === 'home') return state.game === 'home' ? 'home' : null; return (GAME_BY[d] || d === 'go') ? d : null; };
const saveTrack = () => { store.set('caught_g', [...CAUGHT_G]); store.set('shiny_g', [...SHINY_G]); store.set('home_g', [...TRANS_G]); store.set('homeshiny_g', [...STRANS_G]); rebuildHome(); };
function toggleMark(p, kind, c = trackCtx()) {
  if (!c || c === 'home') return; // base view and Home are read-only (derived)
  const k = gkey(c, p);
  if (kind === 'caught') {
    if (CAUGHT_G.has(k)) { CAUGHT_G.delete(k); TRANS_G.delete(k); STRANS_G.delete(k); } else CAUGHT_G.add(k); // un-catching also clears the transfer flags
  } else {
    if (SHINY_G.has(k)) { SHINY_G.delete(k); STRANS_G.delete(k); } else SHINY_G.add(k);
  }
  saveTrack();
}
// "Transféré vers Home": marking a transfer also marks the Pokémon as caught in that game; shiny transfer also marks shiny + transfer.
function toggleTransfer(p, shiny, c = trackCtx()) {
  if (!c || c === 'home' || !homeKind(c)) return; const k = gkey(c, p);
  if (!shiny) { if (TRANS_G.has(k)) { TRANS_G.delete(k); STRANS_G.delete(k); } else { TRANS_G.add(k); CAUGHT_G.add(k); } }
  else if (STRANS_G.has(k)) STRANS_G.delete(k);
  else { STRANS_G.add(k); TRANS_G.add(k); CAUGHT_G.add(k); SHINY_G.add(k); }
  saveTrack();
}
const transValid = x => markValid(x) && !!homeKind(x.split(':')[0]);
const markValid = x => typeof x === 'string' && /^([a-z0-9]+):\d+(-[a-z0-9-]+)?$/.test(x) && (GAME_BY[x.split(':')[0]] || x.startsWith('go:'));
const DEX = {}; // game id -> { order: Map(sid -> index), nums: Map(sid -> [di,num,...]), dx: [labels] }

async function getJSON(url) { const r = await fetch(url); if (!r.ok) throw new Error(url + ' ' + r.status); return r.json(); }

async function boot() {
  try {
    DATA = await getJSON('data/core.json');
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
    GAMES.map(g => `<option value="${g.id}">${esc(g.n)}</option>`).join('');
  $('#gen').innerHTML = '<option value="">Toutes gén.</option>' +
    GEN_LABELS.slice(1).map((l, i) => `<option value="${i + 1}">Gén. ${l}</option>`).join('');
  $('#typechips').innerHTML = DATA.types.map(t =>
    `<button class="chip" data-t="${t[0]}" aria-pressed="false" style="background:${TYPE_COLORS[t[0]]}">${esc(t[1])}</button>`).join('');
  $('#q').addEventListener('input', e => { state.q = e.target.value; render(); });
  $('#game').addEventListener('change', async e => { await setGame(e.target.value); });
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
  const d = await getJSON(`data/dex/${id}.json`);
  const order = new Map(), nums = new Map();
  d.e.forEach((row, i) => { order.set(row[0], i); nums.set(row[0], row.slice(1)); });
  return DEX[id] = { order, nums, dx: d.dx };
}
async function setGame(v) {
  state.game = v; $('#game').value = v;
  if (v === 'home') {
  } else if (GAME_BY[v]) {
    try { await loadDex(v); } catch { state.game = ''; $('#game').value = ''; alert('Pokédex du jeu indisponible hors-ligne : ouvrez-le une fois avec une connexion.'); }
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
  Object.assign(state, { q: '', types: [], gen: '', cat: '', sort: 'id', game: '' });
  $('#q').value = ''; $('#gen').value = ''; $('#cat').value = ''; $('#sort').value = 'id'; $('#game').value = '';
  render();
}
function badge(t) { return `<span class="badge" style="background:${TYPE_COLORS[t]}">${esc(TYPE_FR[t])}</span>`; }
const inGame = (p, gi) => !!((p.gb >> gi) & 1);

function filtered() {
  const raw = state.q.trim();
  const qn = norm(raw);
  const numeric = /^#?\d+$/.test(raw) ? parseInt(raw.replace('#', ''), 10) : null;
  const gm = GAME_BY[state.game], dex = gm && DEX[gm.id], gi = gm ? GIDX[gm.id] : -1;
  if (gm && !dex) return [];
  let out = E.filter(p => {
    if (p.c && !state.forms) return false;
    if (dex) {
      if (!dex.order.has(p.id)) return false;
      if (p.c && !inGame(p, gi)) return false;
    } else if (state.game === 'go' && !p.go) return false;
    if (numeric !== null) {
      if (dex) { const n = dex.nums.get(p.id); if (!n.some((x, i) => i % 2 === 1 && x === numeric)) return false; }
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
    return true;
  });
  const pos = new Map(out.map((p, i) => [p, i]));
  const startsWith = p => p.nn.startsWith(qn) || p.ne.startsWith(qn) || p.nj.startsWith(qn) || p.nr.startsWith(qn);
  if (qn && numeric === null && state.sort === 'id') out.sort((a, b) => (startsWith(b) - startsWith(a)) || (dex ? dex.order.get(a.id) - dex.order.get(b.id) : 0) || pos.get(a) - pos.get(b));
  else {
    const key = { id: p => dex ? dex.order.get(p.id) : p.id, name: p => p.nn, total: p => -p.tot, hp: p => -p.s[0], atk: p => -p.s[1], def: p => -p.s[2], spe: p => -p.s[5] }[state.sort];
    out.sort((a, b) => { const x = key(a), y = key(b); return x < y ? -1 : x > y ? 1 : pos.get(a) - pos.get(b); });
  }
  return out;
}
function numHTML(p) {
  const gm = GAME_BY[state.game], dex = gm && DEX[gm.id];
  let s;
  if (dex) {
    const n = dex.nums.get(p.id) || [];
    s = `<span class="rn">${dex.dx.length > 1 ? esc(dex.dx[n[0]]) + ' ' : ''}#${pad3(n[1])}</span> <span class="nat">Nat. ${pad(p.id)}</span>`;
  } else s = `#${pad(p.id)}`;
  const tag = p.c ? ` · ${esc(p.l || '')}` : p.lg ? ' · Légendaire' : p.my ? ' · Fabuleux' : '';
  return s + tag;
}
const BASE_LEGEND = `<span>${BALL} capturé dans au moins un jeu (Pokémon GO compris)</span> <span><span class="mk cm">✔</span> complété : capturé dans tous les jeux Switch où il existe</span> <span><span class="mk om">🕹</span> anciens jeux : capturé dans tous les jeux avant la Switch où il existe</span> <span><span class="mk sh">✨</span> shiny dans au moins un jeu (✨✔ / ✨🕹 : mêmes règles)</span> <span>Pokémon GO compte pour « capturé » mais pas pour les complétions. Pour marquer, choisissez un jeu dans « Jeux ».</span>`;
function baseMarks(p) {
  const b = baseStatus(p); let h = '';
  if (b.swDone) h += '<span class="mk cm" aria-label="Complété sur Switch" title="Capturé dans tous les jeux Switch où il existe">✔</span>';
  if (b.oldDone) h += '<span class="mk om" aria-label="Complété dans les anciens jeux" title="Capturé dans tous les anciens jeux où il existe">🕹</span>';
  if (b.shSwDone) h += '<span class="mk cm" title="Shiny dans tous les jeux Switch où il existe">✨✔</span>';
  if (b.shOldDone) h += '<span class="mk om" title="Shiny dans tous les anciens jeux où il existe">✨🕹</span>';
  return h;
}
function cardHTML(p) {
  const key = ik(p);
  const hm = trackCtx() === 'home';
  const star = (FAVS.has(key) ? '<span class="star" aria-label="Favori">★</span>' : '') +
    (hm ? (isCaught(p) ? '<span class="mk hm" aria-label="Transféré vers Home" title="Transféré vers Home">🏠</span>' : '') : isCaught(p) ? `<span class="mk ok" aria-label="Capturé">${BALL}</span>` : '') +
    (isShiny(p) ? `<span class="mk sh" aria-label="Shiny ${hm ? 'transféré' : 'capturé'}">✨</span>` : '') +
    (hm && isCaught(p) && homeComplete(p, homeAvail(p)) ? '<span class="mk cm" aria-label="Transféré depuis tous les jeux compatibles" title="Transféré depuis tous les jeux compatibles">✔</span>' : '') +
    (!trackCtx() ? baseMarks(p) : '') +
    (trackCtx() && trackCtx() !== 'home' && isTrans(p) ? '<span class="mk hm" aria-label="Transféré vers Home" title="Transféré vers Home">🏠</span>' : '');
  return `<a class="card${p.c ? ' form' : ''}" href="#/p/${p.k}"><img src="img/${p.k}.webp" alt="" loading="lazy" decoding="async" width="256" height="256">` +
    `<div class="info"><div class="num">${numHTML(p)}</div><div class="nm">${esc(p.n)} ${star}</div></div>` +
    `<div class="badges">${p.t.map(badge).join('')}</div></a>`;
}
function render() {
  const res = filtered();
  const box = $('#results');
  box.className = state.view === 'grid' ? 'grid' : 'grid list';
  $('#viewbtn').textContent = state.view === 'grid' ? '☰' : '▦';
  box.innerHTML = res.length ? res.map(cardHTML).join('') : `<p class="empty">${GAME_BY[state.game] && !DEX[state.game] ? 'Chargement…' : 'Aucun Pokémon trouvé.'}</p>`;
  const gm = GAME_BY[state.game];
  const ctx = trackCtx(); let prog;
  if (ctx) { // progress of the selected game: marks among the entries that belong to it
    const dx = DEX[ctx], gi = GIDX[ctx];
    const uni = E.filter(p => (state.forms || !p.c) && (ctx === 'home' ? true : ctx === 'go' ? p.go : (dx && dx.order.has(p.id) && (!p.c || inGame(p, gi)))));
    const cu = uni.filter(p => isCaught(p)).length, su = uni.filter(p => isShiny(p)).length;
    prog = ctx === 'home'
      ? `HOME : ${cu} / ${uni.length} transférés · ${su} shiny · ${uni.filter(p => isCaught(p) && homeComplete(p, homeAvail(p))).length} complets`
      : `${trackName()} : ${cu} / ${uni.length} capturés · ${su} shiny`;
  } else { // base view: derived from the per-game marks
    const uni = E.filter(p => state.forms || !p.c); let cu = 0, su = 0, sw = 0, old = 0;
    for (const p of uni) { const b = baseStatus(p); cu += b.any; su += b.shAny; sw += b.swDone; old += b.oldDone; }
    prog = `${cu} / ${uni.length} capturés · ${su} shiny · ${sw} complétés Switch · ${old} anciens jeux`;
  }
  $('#count').textContent = `${res.length} ${state.forms ? 'entrées' : 'Pokémon'}${gm ? ' · ' + gm.s : state.game === 'go' ? ' · GO' : ''} · ${prog}`;
  const lg = $('#legend'); lg.hidden = !!ctx && ctx !== 'home';
  if (!ctx) lg.innerHTML = `<details><summary>Légende des marques</summary>${BASE_LEGEND}</details>`;
  if (ctx === 'home') lg.innerHTML = '<details><summary>Légende des marques</summary><span><span class="mk hm">🏠</span> transféré depuis au moins un jeu</span> <span><span class="mk sh">✨</span> au moins un shiny transféré</span> <span><span class="mk cm">✔</span> transféré depuis tous les jeux compatibles où il existe</span></details>';
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
  state.dgame = sheetPref || (state.game === 'go' || state.game === 'home' || GAME_BY[state.game] ? state.game : 'home'); // sheet game: its own choice, else the list filter
  document.title = `${p.n} #${pad(p.id)} – Pokédex`;
  $('#detail-view').innerHTML = navHTML(p) + `<div class="detail"><div class="hero" style="--c1:${TYPE_COLORS[p.t[0]]};--c2:${TYPE_COLORS[p.t[1] || p.t[0]]}"><div class="num">#${pad(p.id)}</div><img src="img/${p.k}.webp" alt="${esc(p.n)}" width="256" height="256"><h1>${esc(p.n)}</h1>${namesHTML(p)}</div><p class="note" id="dload">Chargement de la fiche…</p></div>`;
  try {
    const [sp, shared] = await Promise.all([loadSp(p.id), loadShared()]);
    if (tok !== detailTok) return;
    DET = { p, sp, f: sp.f[p.k], shared };
    pickGame(state.dgame);
    if (state.dgame === 'go') { try { DET.go = await loadGo(); } catch { state.dgame = 'home'; } if (tok !== detailTok) return; }
    renderDetail();
  } catch (e) {
    if (tok !== detailTok) return;
    const el = $('#dload'); if (el) el.innerHTML = 'Fiche détaillée indisponible hors-ligne. Ouvrez-la une fois avec une connexion Internet, ou utilisez « Télécharger les formes et fiches » en bas de la liste.';
  }
}
function availGames(f) { return (f.av || []).slice().sort((a, b) => GIDX[a] - GIDX[b]); }
function pickGame(g) {
  const f = DET.f;
  const ok = g === 'home' || (g === 'go' && f.go && f.go.r) || (GAME_BY[g] && (f.av || []).includes(g));
  state.dgame = ok ? g : 'home';
}
const homeBall = '<svg class="ball hm" viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
function gameNames(ids) { return ids.map(g => g === 'go' ? 'Pokémon GO' : GAME_BY[g].s).join(', '); }
function homeRowsHTML(av, f, sh) {
  if (!av.length) return '<br>Aucun jeu compatible avec Home ne contient ce Pokémon.';
  const done = av.filter(g => f.includes(g)).length;
  return `<br>Transféré depuis <b>${done} / ${av.length}</b> jeux compatibles${done === av.length ? ' <span class="mk cm">✔ complet</span>' : ''} :<ul class="plain homerows">` +
    av.map(g => `<li>${f.includes(g) ? '🏠' : '▫️'} ${esc(gameNames([g]))} — ${f.includes(g) ? 'transféré' : 'pas transféré'}${sh.includes(g) ? ' · ✨ shiny' : ''}</li>`).join('') + '</ul>';
}
function baseHTML(p) {
  const f = DET && DET.p === p ? DET.f : null;
  const av = f && f.av ? f.av.slice().sort((a, b) => GIDX[a] - GIDX[b]) : gamesOf(p);
  const b = baseStatus(p, av), go = p.go;
  const row = g => `<li>${b.c.includes(g) ? BALL : BALL_OFF} ${esc(gameNames([g]))} — ${b.c.includes(g) ? 'capturé' : 'pas capturé'}${b.s.includes(g) ? ' · ✨ shiny' : ''}</li>`;
  const sw = av.filter(g => SWITCH_IDS.has(g)), old = av.filter(g => !SWITCH_IDS.has(g));
  const frac = (need, have) => `${need.filter(g => have.includes(g)).length} / ${need.length}`;
  let h = `Suivi : <b>vue d’ensemble</b> (lecture seule : calculé d’après les marques de chaque jeu). Pour marquer, choisissez un jeu dans le sélecteur « Jeu » ci-dessous (ou dans la liste « Jeux »).<br>` +
    (b.any ? `${BALL} Capturé` : 'Pas encore capturé') + (b.shAny ? ' · ✨ shiny' : '') +
    (b.swDone ? ' · <span class="mk cm">✔ Switch complet</span>' : '') + (b.oldDone ? ' · <span class="mk om">🕹 Anciens jeux complets</span>' : '') +
    (b.shSwDone ? ' · <span class="mk cm">✨✔ shiny Switch</span>' : '') + (b.shOldDone ? ' · <span class="mk om">✨🕹 shiny anciens jeux</span>' : '');
  if (b.legacyC || b.legacyS) h += `<br><span class="mute">Marque manuelle de l’ancienne version${b.legacyC ? ' (capturé)' : ''}${b.legacyS ? ' (shiny)' : ''}${b.c.length || b.s.length ? ' — remplacée par les marques par jeu' : ' — conservée tant qu’aucun jeu n’est marqué'} </span><button type="button" class="lg" title="Supprimer l’ancienne marque manuelle">Retirer</button>`;
  if (sw.length) h += `<details open><summary>Jeux Switch — ${frac(coreOf(sw), b.c)}</summary><ul class="plain homerows">${sw.map(row).join('')}</ul></details>`;
  if (old.length) h += `<details><summary>Anciens jeux — ${frac(coreOf(old), b.c)}</summary><ul class="plain homerows">${old.map(row).join('')}</ul></details>`;
  if (go) h += `<ul class="plain homerows"><li>${b.c.includes('go') ? BALL : BALL_OFF} Pokémon GO — ${b.c.includes('go') ? 'capturé' : 'pas capturé'}${b.s.includes('go') ? ' · ✨ shiny' : ''} <span class="mute">(ne compte pas pour les complétions)</span></li></ul>`;
  return h;
}
function trackHTML(p) {
  const c = sheetCtx();
  if (!c) return baseHTML(p);
  if (c === 'home') {
    const f = HOME_C.get(p.k) || [], sh = HOME_S.get(p.k) || [], av = homeAvail(p);
    return `Suivi : <b>Pokémon HOME</b> (lecture seule : calculé d’après « Transféré vers Home » dans les jeux compatibles).<br>` +
      `<span class="mk hm">🏠</span> au moins un jeu · <span class="mk sh">✨</span> au moins un shiny · <span class="mk cm">✔</span> tous les jeux compatibles` +
      homeRowsHTML(av, f, sh);
  }
  const hk = homeKind(c);
  let h = `Captures et shiny suivis pour : <b>${esc(trackName(c))}</b>`;
  { const b = baseStatus(p); h += `<br><span class="mute">Tous jeux confondus : capturé dans ${b.c.length} jeu${b.c.length > 1 ? 'x' : ''} sur ${gamesOf(p).length + (p.go ? 1 : 0)} · shiny dans ${b.s.length}.</span>`; }
  if (!hk) return h + '<br>Ce jeu ne peut pas envoyer directement de Pokémon vers HOME.';
  h += ` <span class="mute">(${HOME_KIND_FR[hk]})</span><div class="trackbtns"><button type="button" class="tr" aria-pressed="${isTrans(p, c)}" title="Transféré vers Home depuis ${esc(trackName(c))}">${homeBall} Transféré vers Home</button>`;
  if (isShiny(p, c) || isSTrans(p, c)) h += `<button type="button" class="trs" aria-pressed="${isSTrans(p, c)}" title="Shiny transféré vers Home">✨ Transféré</button>`;
  return h + '</div>';
}
function refreshTrack(p) {
  const el = $('#trackinfo'); if (el) el.innerHTML = trackHTML(p);
  const cg = document.querySelector('.dnav .cg'), sh = document.querySelector('.dnav .sh');
  const c = sheetCtx();
  if (cg) { cg.setAttribute('aria-pressed', isCaught(p, c)); cg.innerHTML = isCaught(p, c) ? BALL + ' Capturé' : BALL_OFF + ' Capturé'; }
  if (sh) sh.setAttribute('aria-pressed', isShiny(p, c));
}
function navHTML(p) {
  const key = ik(p);
  let prev = '', next = '';
  if (GAME_BY[state.game] && DEX[state.game]) { // follow the filtered list when a game is selected
    const list = filtered().filter(x => !x.c); const i = list.findIndex(x => x.id === p.id);
    if (i > 0) prev = `#/p/${list[i - 1].k}`; if (i >= 0 && i < list.length - 1) next = `#/p/${list[i + 1].k}`;
  } else { prev = p.id > 1 ? `#/p/${p.id - 1}` : ''; next = p.id < 1025 ? `#/p/${p.id + 1}` : ''; }
  const sc = sheetCtx();
  const ctxLine = `<div class="trackinfo" id="trackinfo">${trackHTML(p)}</div>`;
  return `<div class="dnav"><a href="#/" aria-label="Retour à la liste">←</a><a class="${prev ? '' : 'disabled'}" href="${prev || '#'}" aria-label="Précédent">‹</a><a class="${next ? '' : 'disabled'}" href="${next || '#'}" aria-label="Suivant">›</a><span class="sp"></span>
    <button class="cg" ${!sc || sc === 'home' ? 'disabled' : ''} aria-pressed="${isCaught(p, sc)}" aria-label="Capturé${sc ? ' – ' + trackName(sc) : ''}" title="Capturé${sc ? ' – ' + trackName(sc) : ''}">${isCaught(p, sc) ? BALL + ' Capturé' : BALL_OFF + ' Capturé'}</button>
    <button class="sh" ${!sc || sc === 'home' ? 'disabled' : ''} aria-pressed="${isShiny(p, sc)}" aria-label="Shiny capturé${sc ? ' – ' + trackName(sc) : ''}" title="Shiny capturé${sc ? ' – ' + trackName(sc) : ''}">✨ Shiny</button>
    <button class="fav" aria-pressed="${FAVS.has(key)}" aria-label="Favori">${FAVS.has(key) ? '★' : '☆'}</button></div>${ctxLine}`;
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
function formLabel(q) { return q.l || (q.c ? q.n : 'Normal'); }
function formSwitcher(p, gm) {
  const list = FORMS[p.id]; if (!list || list.length < 2) return '';
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
  return list.map(([id, hid]) => { const a = ref.ab[id]; return a ? `<div class="ab"><b>${esc(a[0])}</b>${hid ? ' <span class="tag2">Talent caché</span>' : ''}<br><span class="mute">${esc(a[1] || '')}</span></div>` : ''; }).join('');
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
    <div class="tabs" role="tablist">${tabs.map(t => `<button data-mtab="${t[0]}" aria-pressed="${t[0] === movesTab}">${t[1]} <small>${t[2].length}</small></button>`).join('')}</div>
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
  if (p.c === 'mega') note = 'Forme obtenue par Méga-Évolution (Méga-Gemme) depuis la forme de base.';
  else if (p.c === 'primal') note = 'Forme obtenue par Régression primale (Orbe) depuis la forme de base.';
  else if (p.c === 'gmax') note = 'Forme obtenue par Gigamax / Dynamax en combat.';
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
  return `
    <section class="box"><h2>Pokémon GO <small class="cnt">${esc(p.c ? p.n : '')}</small></h2>
      <div class="kv kv3"><div><b>${d.a}</b><span>Attaque</span></div><div><b>${d.d}</b><span>Défense</span></div><div><b>${d.s}</b><span>Endurance</span></div></div>
      <div class="kv"><div><b>${fmt(d.m50)}</b><span>PC max niv. 50 (IV 15/15/15)</span></div><div><b>${fmt(d.m51)}</b><span>PC max niv. 51 (meilleur compagnon)</span></div></div>
      <ul class="plain gol">
        <li>Statut : <b>${d.r ? 'disponible dans Pokémon GO' : 'pas encore sorti'}</b></li>
        <li>Shiny : <b>${sh}</b></li>
        ${d.bd ? `<li>Distance compagnon : <b>${dec(d.bd)} km</b> par bonbon</li>` : ''}
        ${d.eg ? `<li>Éclosion d’œuf (pool actuel) : <b>${d.eg.map(e => e[0] + ' km' + ({ as: ' (récompense Aventure Synchro)', ga: ' (cadeau d’ami)', gr: ' (cadeau de route)' }[e[1]] || '')).join(', ')}</b></li>` : ''}
        ${d.th ? `<li>Seconde attaque chargée : <b>${fmt(d.th[0])}</b> poussières d’étoiles + <b>${d.th[1]}</b> bonbons</li>` : ''}
      </ul>
      <p class="note">PC max = formule officielle avec le multiplicateur de PC du niveau (vérifiée : Mewtwo 4 724 au niv. 50). Œufs : seul le pool de la saison actuelle est connu${go.egg ? ` (${esc(go.egg.season)}, au ${go.egg.upd.split('-').reverse().join('/')}, source Leek Duck)` : ''} ; un Pokémon sans distance indiquée n’est pas dans ce pool (ou la donnée manque).</p></section>
    <section class="box"><h2>Attaques rapides</h2><div class="mvs">${fm || '<p class="note">—</p>'}</div></section>
    <section class="box"><h2>Attaques chargées</h2><div class="mvs">${cm || '<p class="note">—</p>'}</div>${shadow}<p class="note">† : attaque exclusive (disponible via événement / MT élite). DPS = puissance ÷ durée.</p></section>
    <section class="box"><h2>Faiblesses &amp; résistances <small class="cnt">GO</small></h2>${effHTML(types, 'go', DATA.charts[6])}
      <p class="note">Multiplicateurs de Pokémon GO (×1,6 par faiblesse, ×0,625 par résistance ; une immunité des jeux principaux compte comme une double résistance).</p></section>`;
}

function renderDetail() {
  const { p, sp, f, shared } = DET;
  const mode = state.dgame; // 'home' | 'go' | game id
  const gm = GAME_BY[mode]; const isGo = mode === 'go';
  const gen = gm ? gm.g : 9;
  const key = ik(p);
  const types = isGo && f.go ? f.go.t : gm ? pickGen(f.pt, gen, f.t) : f.t;
  const c1 = TYPE_COLORS[types[0]], c2 = TYPE_COLORS[types[1] || types[0]];
  const flags = [p.lg && 'Légendaire', p.my && 'Fabuleux', p.ba && 'Bébé', `Gén. ${GEN_LABELS[p.g]}`].filter(Boolean);
  const games = availGames(f);
  const goOk = f.go && f.go.r;
  const opts = `<option value="home"${mode === 'home' ? ' selected' : ''}>Pokémon HOME (infos générales)</option>` +
    (goOk ? `<option value="go"${isGo ? ' selected' : ''}>Pokémon GO</option>` : '') +
    games.map(g => `<option value="${g}"${mode === g ? ' selected' : ''}>${esc(GAME_BY[g].n)}</option>`).join('');
  const gimg = `img/${p.k}.webp`, simg = `img/s/${p.k}.webp`;
  const regional = gm ? dexNumbers(sp, gm.id) : '';
  let body = '';
  if (isGo && f.go && DET.go) {
    body = goHTML(p, f, sp, shared, DET.go);
    body += `<section class="box"><h2>Évolutions <small class="cnt">GO</small></h2>${evoHTML(p, f, 'go', null)}<p class="note">Coûts en bonbons et conditions issus des données GO communautaires.</p></section>`;
  } else {
    const sArr = gm ? pickGen(f.ps, gen, f.s) : f.s;
    const gen1 = gm && gen === 1;
    const chart = chartFor(gm ? gen : 9);
    const mode2 = 'main';
    body = `${flavorHTML(sp, gm)}
    ${regional ? `<section class="box"><h2>Pokédex régional</h2><p class="rn-line">${regional}</p></section>` : ''}
    <section class="box"><div class="kv"><div><b>${dec(f.h)} m</b><span>Taille</span></div><div><b>${dec(f.w)} kg</b><span>Poids</span></div></div>
      ${gm ? '' : `<div class="kv kv3 sm"><div><b>${f.go ? '' : ''}${sp.gr < 0 ? 'Asexué' : `${dec(((8 - sp.gr) / 8 * 100).toFixed(1))} % ♂`}</b><span>${sp.gr < 0 ? 'Sexe' : `${dec((sp.gr / 8 * 100).toFixed(1))} % ♀`}</span></div><div><b>${sp.cr}</b><span>Taux de capture</span></div><div><b>${fmt((sp.hc + 1) * 255)}</b><span>Pas pour éclore</span></div></div>
      <p class="note">Groupes d’œuf : ${sp.eg.map(esc).join(', ') || '—'} · Croissance : ${GROWTH[sp.gw] || sp.gw} · Bonheur de base : ${sp.bh}</p>`}</section>
    <section class="box"><h2>Statistiques de base${gm ? ` <small class="cnt">${esc(gm.s)}</small>` : ''}</h2>${statsHTML(sArr, gen1)}
      <p class="note">${gm ? (gen1 ? 'Génération I : une seule stat Spécial. ' : '') + `Stats telles qu’en génération ${['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'][gen]} (PokéAPI).` : 'Stats actuelles (dernière génération). Choisissez un jeu pour voir les stats de son époque.'}</p></section>
    <section class="box"><h2>Talents</h2>${abilitiesHTML(f, gm, shared.ref)}</section>
    ${heldHTML(f, gm, shared.ref)}
    <section class="box"><h2>Faiblesses &amp; résistances${gm ? ` <small class="cnt">${esc(gm.s)}</small>` : ''}</h2>
      <div id="eff">${effHTML(types, mode2, chart)}</div>
      <p class="note" id="effnote">${effNote(mode2, gm)}</p></section>
    ${gm ? encHTML(f, sp, gm, shared) + movesHTML(f, sp, gm, shared) : homeSrcHTML(p, f) + availHTML(sp, games)}
    <section class="box"><h2>Évolutions${gm ? ` <small class="cnt">${esc(gm.s)}</small>` : ''}</h2>${evoHTML(p, f, 'game', gm)}
      <p class="note">Conditions issues de PokéAPI${gm ? ' pour l’époque de ce jeu' : ' (dernière version)'} ; les Pokémon trop récents pour la génération choisie sont masqués. Les coûts en bonbons GO sont dans l’onglet Pokémon GO.</p></section>`;
  }
  $('#detail-view').innerHTML = navHTML(p) + `
  <div class="detail">
    <div class="hero" style="--c1:${c1};--c2:${c2}">
      <div class="num">#${pad(p.id)}</div>
      <img id="heroimg" src="${showShinyArt && p.sh ? simg : gimg}" alt="${esc(p.n)}" width="256" height="256">
      ${p.sh ? `<button id="shbtn" class="shart" type="button" aria-pressed="${showShinyArt}" title="Afficher l’illustration shiny">✨ ${showShinyArt ? 'Normal' : 'Shiny'}</button>` : ''}
      <h1>${esc(p.n)}</h1>
      ${namesHTML(p, sp)}
      <div class="badges">${types.map(t => `<a class="badge" href="#" data-type="${t}">${esc(TYPE_FR[t])}</a>`).join('')}</div>
      <div class="tags">${flags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
    </div>
    ${formSwitcher(p, gm)}
    <section class="box gamebar"><label for="dgame">Jeu</label><select id="dgame" aria-label="Jeu">${opts}</select></section>
    ${body}
    <p class="note disclaimer">Les données proviennent de PokéAPI et de sources communautaires : elles peuvent contenir des erreurs ou différer des jeux. Les données Pokémon GO sont communautaires et non officielles.</p>
  </div>`;
}
// hero names: French (h1) → genus · English → Japanese · romaji
function namesHTML(p, sp) {
  const l1 = [sp && sp.gn, p.en].filter(Boolean).map((t, i, a) => (sp && sp.gn && i === 0) ? `<span class="gn">${esc(t)}</span>` : `<span lang="en" class="en">${esc(t)}</span>`).join(' · ');
  const l2 = p.ja ? `<span lang="ja" class="ja">${esc(p.ja)}</span>${p.ro ? ` · <span class="ro">${esc(p.ro)}</span>` : ''}` : '';
  return `<div class="genus">${l1}</div>${l2 ? `<div class="jname">${l2}</div>` : ''}`;
}
function renderDetailKeepScroll() { const y = window.scrollY; renderDetail(); window.scrollTo(0, y); }
function homeSrcHTML(p, f) {
  const av = homeAvailF(p, f), t = HOME_C.get(p.k) || [], sh = HOME_S.get(p.k) || [];
  if (!av.length) return '';
  return `<section class="box"><h2>Transferts vers Home <small class="cnt">${av.filter(g => t.includes(g)).length} / ${av.length}</small></h2>` +
    `<p class="note" style="margin:0 0 6px"><span class="mk hm">🏠</span> transféré · <span class="mk sh">✨</span> shiny transféré · <span class="mk cm">✔</span> transféré depuis tous les jeux compatibles${homeComplete(p, av) ? ' (complet)' : ''}</p>` +
    `<ul class="plain homerows">${av.map(g => `<li>${t.includes(g) ? '🏠' : '▫️'} ${esc(gameNames([g]))} — ${t.includes(g) ? 'transféré' : 'pas transféré'}${sh.includes(g) ? ' · ✨ shiny' : ''}</li>`).join('')}</ul></section>`;
}
function availHTML(sp, games) {
  if (!games.length) return '';
  const rows = games.map(g => { const n = dexNumbers(sp, g); return `<li><a href="#" data-game="${g}">${esc(GAME_BY[g].n)}</a>${n ? ` <span class="mute">${n}</span>` : ''}</li>`; }).join('');
  return `<section class="box"><h2>Présent dans <small class="cnt">${games.length} jeux</small></h2><ul class="plain avl">${rows}</ul><p class="note">Selon les Pokédex régionaux (PokéAPI). Touchez un jeu pour voir ses données.</p></section>`;
}
function effNote(mode, gm) {
  return mode === 'go'
    ? 'Multiplicateurs de Pokémon GO (×1,6 par faiblesse, ×0,625 par résistance ; une immunité des jeux principaux compte comme une double résistance).'
    : `Multiplicateurs des jeux principaux (×2, ×½, immunités ×0)${gm ? ` — table des types de la génération ${['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'][gm.g]}, types du jeu.` : ' — table des types actuelle (pour GO, choisissez Pokémon GO dans le sélecteur de jeu).'}`;
}
async function changeGame(g) {
  state.dgame = g;
  if (g === 'go') { try { DET.go = await loadGo(); } catch { alert('Données GO indisponibles hors-ligne : ouvrez-les une fois avec une connexion.'); state.dgame = 'home'; } }
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
  const cgb = e.target.closest('.dnav .cg'), shb = e.target.closest('.dnav .sh');
  if (cgb || shb) {
    const p = DET && DET.p; if (!p || (cgb || shb).disabled) return;
    toggleMark(p, cgb ? 'caught' : 'shiny', sheetCtx()); refreshTrack(p); render();
    return;
  }
  const lgb = e.target.closest('#trackinfo .lg');
  if (lgb) { const p = DET && DET.p; if (!p) return; CAUGHT.delete(ik(p)); SHINY.delete(ik(p)); store.set('caught', [...CAUGHT]); store.set('shiny', [...SHINY]); refreshTrack(p); render(); return; }
  const trb = e.target.closest('#trackinfo .tr, #trackinfo .trs');
  if (trb) { const p = DET && DET.p; if (!p) return; toggleTransfer(p, trb.classList.contains('trs'), sheetCtx()); refreshTrack(p); render(); return; }
  const f = e.target.closest('.fav');
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
    'data/evo.json', 'data/moves.json', 'data/ref.json', 'data/go.json', 'data/tm.json', 'data/loc.json', ...GAMES.map(g => `data/dex/${g.id}.json`)];
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
    const data = { favs: [...FAVS], caught: [...CAUGHT], shiny: [...SHINY], caught_g: [...CAUGHT_G], shiny_g: [...SHINY_G], home_g: [...TRANS_G], homeshiny_g: [...STRANS_G] };
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
      mk(d.caught_g).forEach(n => CAUGHT_G.add(n)); mk(d.shiny_g).forEach(n => SHINY_G.add(n));
      const mt = x => Array.isArray(x) ? x.filter(transValid) : [];
      mt(d.home_g).forEach(n => { TRANS_G.add(n); CAUGHT_G.add(n); }); mt(d.homeshiny_g).forEach(n => { STRANS_G.add(n); TRANS_G.add(n); CAUGHT_G.add(n); SHINY_G.add(n); });
      rebuildHome();
      store.set('favs', [...FAVS]); store.set('caught', [...CAUGHT]); store.set('shiny', [...SHINY]); store.set('caught_g', [...CAUGHT_G]); store.set('shiny_g', [...SHINY_G]); store.set('home_g', [...TRANS_G]); store.set('homeshiny_g', [...STRANS_G]);
      render(); alert('Sauvegarde importée.');
    } catch { alert('Fichier invalide.'); }
    im.value = '';
  });
})();
