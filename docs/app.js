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
const norm = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
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
const state = { q: '', types: [], gen: '', cat: '', sort: 'id', game: '', forms: store.get('forms', false), view: store.get('view', 'grid'), goMode: store.get('goMode', true), dgame: store.get('dgame', 'home') };
let listScroll = 0;
const ik = p => p.c ? p.k : p.id; // key used in the sets
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
    p.nn = norm(p.n); p.ne = norm(p.en); p.tot = p.s.reduce((a, b) => a + b, 0);
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
  if (GAME_BY[v]) {
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
    } else if (qn && !p.nn.includes(qn) && !p.ne.includes(qn)) return false;
    if (state.gen && p.g !== +state.gen) return false;
    for (const t of state.types) if (!p.t.includes(t)) return false;
    const key = ik(p);
    if (state.cat === 'leg' && !p.lg) return false;
    if (state.cat === 'myth' && !p.my) return false;
    if (state.cat === 'baby' && !p.ba) return false;
    if (state.cat === 'fav' && !FAVS.has(key)) return false;
    if (state.cat === 'caught' && !CAUGHT.has(key)) return false;
    if (state.cat === 'missing' && CAUGHT.has(key)) return false;
    if (state.cat === 'shiny' && !SHINY.has(key)) return false;
    if (state.cat === 'noshiny' && SHINY.has(key)) return false;
    return true;
  });
  const pos = new Map(out.map((p, i) => [p, i]));
  const startsWith = p => p.nn.startsWith(qn) || p.ne.startsWith(qn);
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
function cardHTML(p) {
  const key = ik(p);
  const star = (FAVS.has(key) ? '<span class="star" aria-label="Favori">★</span>' : '') +
    (CAUGHT.has(key) ? `<span class="mk ok" aria-label="Capturé">${BALL}</span>` : '') +
    (SHINY.has(key) ? '<span class="mk sh" aria-label="Shiny capturé">✨</span>' : '');
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
  $('#count').textContent = `${res.length} ${state.forms ? 'entrées' : 'Pokémon'}${gm ? ' · ' + gm.s : state.game === 'go' ? ' · GO' : state.game === 'home' ? ' · HOME' : ''} · ${CAUGHT.size} capturés · ${SHINY.size} shiny`;
  document.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', state.types.includes(c.dataset.t)));
  const active = state.q || state.types.length || state.gen || state.cat || state.sort !== 'id' || state.game;
  $('#reset').hidden = !active;
}

/* ---------------- shared data (loaded with the first detail page) ---------------- */
const SP = {};
let SHARED = null, GODATA = null, EVO_ADJ = null;
async function loadShared() {
  if (!SHARED) SHARED = Promise.all(['evo', 'moves', 'ref'].map(n => getJSON(`data/${n}.json`))).then(([evo, moves, ref]) => ({ evo, moves, ref })).catch(e => { SHARED = null; throw e; });
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
    detailTok++;
    dv.hidden = true; lv.hidden = false;
    document.title = 'Pokédex';
    window.scrollTo(0, listScroll);
  }
}
async function openDetail(p) {
  const tok = ++detailTok;
  document.title = `${p.n} #${pad(p.id)} – Pokédex`;
  $('#detail-view').innerHTML = navHTML(p) + `<div class="detail"><div class="hero" style="--c1:${TYPE_COLORS[p.t[0]]};--c2:${TYPE_COLORS[p.t[1] || p.t[0]]}"><div class="num">#${pad(p.id)}</div><img src="img/${p.k}.webp" alt="${esc(p.n)}" width="256" height="256"><h1>${esc(p.n)}</h1></div><p class="note" id="dload">Chargement de la fiche…</p></div>`;
  try {
    const [sp, shared] = await Promise.all([loadSp(p.id), loadShared()]);
    if (tok !== detailTok) return;
    DET = { p, sp, f: sp.f[p.k], shared };
    if (state.game === 'go' || state.game === 'home' || GAME_BY[state.game]) state.dgame = state.game; // follow the list filter
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
  state.dgame = ok ? g : 'home'; store.set('dgame', state.dgame);
}
function navHTML(p) {
  const key = ik(p);
  let prev = '', next = '';
  if (GAME_BY[state.game] && DEX[state.game]) { // follow the filtered list when a game is selected
    const list = filtered().filter(x => !x.c); const i = list.findIndex(x => x.id === p.id);
    if (i > 0) prev = `#/p/${list[i - 1].k}`; if (i >= 0 && i < list.length - 1) next = `#/p/${list[i + 1].k}`;
  } else { prev = p.id > 1 ? `#/p/${p.id - 1}` : ''; next = p.id < 1025 ? `#/p/${p.id + 1}` : ''; }
  return `<div class="dnav"><a href="#/" aria-label="Retour à la liste">←</a><a class="${prev ? '' : 'disabled'}" href="${prev || '#'}" aria-label="Précédent">‹</a><a class="${next ? '' : 'disabled'}" href="${next || '#'}" aria-label="Suivant">›</a><span class="sp"></span>
    <button class="cg" aria-pressed="${CAUGHT.has(key)}" aria-label="Capturé" title="Capturé">${CAUGHT.has(key) ? BALL + ' Capturé' : BALL_OFF + ' Capturé'}</button>
    <button class="sh" aria-pressed="${SHINY.has(key)}" aria-label="Shiny capturé" title="Shiny capturé">✨ Shiny</button>
    <button class="fav" aria-pressed="${FAVS.has(key)}" aria-label="Favori">${FAVS.has(key) ? '★' : '☆'}</button></div>`;
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
function flavorHTML(sp, gm) {
  const vids = gm ? gm.ver : null;
  if (!gm) { // latest available entry
    const ks = Object.keys(sp.fv).map(Number).sort((a, b) => b - a); if (!ks.length) return '';
    return `<p class="desc">${esc(sp.ft[sp.fv[ks[0]]])}</p>`;
  }
  const rows = []; const byText = new Map();
  for (const [id, name] of vids) { const i = sp.fv[id]; if (i === undefined) continue; if (!byText.has(i)) byText.set(i, []); byText.get(i).push(name); }
  if (!byText.size) return '<p class="note">Pas d’entrée de Pokédex en français pour ce jeu dans PokéAPI (disponible à partir de Noir/Blanc).</p>';
  for (const [i, names] of byText) rows.push(`<p class="desc"><small>${esc(names.join(' / '))}</small><br>${esc(sp.ft[i])}</p>`);
  return rows.join('');
}
function abilitiesHTML(f, gm, ref) {
  const gen = gm ? gm.g : 9;
  if (gm && (gen < 3 || gm.id === 'la')) return `<p class="note">${gm.id === 'la' ? 'Les talents n’existent pas dans Légendes Pokémon : Arceus.' : 'Les talents n’existent pas avant la génération III.'}</p>`;
  let list = pickGen(f.pa, gen, f.a);
  if (gen < 5) list = list.filter(a => !a[1]);
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
    else rows = cur[2].map(id => moveRow(id, gm, shared, '')).join('');
  }
  return `<section class="box"><h2>Capacités <small class="cnt">${esc(gm.s)}</small></h2>
    <div class="tabs" role="tablist">${tabs.map(t => `<button data-mtab="${t[0]}" aria-pressed="${t[0] === movesTab}">${t[1]} <small>${t[2].length}</small></button>`).join('')}</div>
    <div class="mvs">${rows}</div><p class="note">Valeurs (type, puissance, précision, PP, catégorie) telles qu’elles étaient dans ce jeu (PokéAPI). Avant la génération IV, la catégorie dépend du type.</p></section>`;
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
        ${d.th ? `<li>Seconde attaque chargée : <b>${fmt(d.th[0])}</b> poussières d’étoiles + <b>${d.th[1]}</b> bonbons</li>` : ''}
      </ul>
      <p class="note">PC max = formule officielle avec le multiplicateur de PC du niveau (vérifiée : Mewtwo 4 724 au niv. 50). La distance d’éclosion d’œuf n’est pas fournie par la source.</p></section>
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
    const mode2 = gm ? 'main' : (state.goMode ? 'go' : 'main');
    body = `${flavorHTML(sp, gm)}
    ${regional ? `<section class="box"><h2>Pokédex régional</h2><p class="rn-line">${regional}</p></section>` : ''}
    <section class="box"><div class="kv"><div><b>${dec(f.h)} m</b><span>Taille</span></div><div><b>${dec(f.w)} kg</b><span>Poids</span></div></div>
      ${gm ? '' : `<div class="kv kv3 sm"><div><b>${f.go ? '' : ''}${sp.gr < 0 ? 'Asexué' : `${dec(((8 - sp.gr) / 8 * 100).toFixed(1))} % ♂`}</b><span>${sp.gr < 0 ? 'Sexe' : `${dec((sp.gr / 8 * 100).toFixed(1))} % ♀`}</span></div><div><b>${sp.cr}</b><span>Taux de capture</span></div><div><b>${fmt((sp.hc + 1) * 255)}</b><span>Pas pour éclore</span></div></div>
      <p class="note">Groupes d’œuf : ${sp.eg.map(esc).join(', ') || '—'} · Croissance : ${GROWTH[sp.gw] || sp.gw} · Bonheur de base : ${sp.bh}</p>`}</section>
    <section class="box"><h2>Statistiques de base${gm ? ` <small class="cnt">${esc(gm.s)}</small>` : ''}</h2>${statsHTML(sArr, gen1)}
      <p class="note">${gm ? (gen1 ? 'Génération I : une seule stat Spécial. ' : '') + `Stats telles qu’en génération ${['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'][gen]} (PokéAPI).` : 'Stats actuelles (dernière génération). Choisissez un jeu pour voir les stats de son époque.'}</p></section>
    <section class="box"><h2>Talents</h2>${abilitiesHTML(f, gm, shared.ref)}</section>
    ${heldHTML(f, gm, shared.ref)}
    <section class="box"><h2>Faiblesses &amp; résistances${gm ? '' : `
      <span class="seg" role="group"><button data-mode="go" aria-pressed="${state.goMode}">GO</button><button data-mode="main" aria-pressed="${!state.goMode}">Jeux</button></span>`}</h2>
      <div id="eff">${effHTML(types, mode2, chart)}</div>
      <p class="note" id="effnote">${effNote(mode2, gm)}</p></section>
    ${gm ? movesHTML(f, sp, gm, shared) : availHTML(sp, games)}
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
      <div class="genus">${esc(sp.gn)}${!p.c && p.en !== p.n ? ` · ${esc(p.en)}` : ''}</div>
      <div class="badges">${types.map(t => `<a class="badge" href="#" data-type="${t}">${esc(TYPE_FR[t])}</a>`).join('')}</div>
      <div class="tags">${flags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
    </div>
    ${formSwitcher(p, gm)}
    <section class="box gamebar"><label for="dgame">Jeu</label><select id="dgame" aria-label="Jeu">${opts}</select></section>
    ${body}
  </div>`;
}
function renderDetailKeepScroll() { const y = window.scrollY; renderDetail(); window.scrollTo(0, y); }
function availHTML(sp, games) {
  if (!games.length) return '';
  const rows = games.map(g => { const n = dexNumbers(sp, g); return `<li><a href="#" data-game="${g}">${esc(GAME_BY[g].n)}</a>${n ? ` <span class="mute">${n}</span>` : ''}</li>`; }).join('');
  return `<section class="box"><h2>Présent dans <small class="cnt">${games.length} jeux</small></h2><ul class="plain avl">${rows}</ul><p class="note">Selon les Pokédex régionaux (PokéAPI). Touchez un jeu pour voir ses données.</p></section>`;
}
function effNote(mode, gm) {
  return mode === 'go'
    ? 'Multiplicateurs de Pokémon GO (×1,6 par faiblesse, ×0,625 par résistance ; une immunité des jeux principaux compte comme une double résistance).'
    : `Multiplicateurs des jeux principaux (×2, ×½, immunités ×0)${gm ? ` — table des types de la génération ${['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'][gm.g]}.` : '.'}`;
}
async function changeGame(g) {
  state.dgame = g;
  if (g === 'go') { try { DET.go = await loadGo(); } catch { alert('Données GO indisponibles hors-ligne : ouvrez-les une fois avec une connexion.'); state.dgame = 'home'; } }
  pickGame(state.dgame); store.set('dgame', state.dgame);
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
  const m = e.target.closest('[data-mode]');
  if (m && DET) {
    state.goMode = m.dataset.mode === 'go'; store.set('goMode', state.goMode);
    const f = DET.f; const mode2 = state.goMode ? 'go' : 'main';
    $('#eff').innerHTML = effHTML(f.t, mode2, DATA.charts[6]); $('#effnote').textContent = effNote(mode2, null);
    document.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', (b.dataset.mode === 'go') === state.goMode));
    return;
  }
  const cgb = e.target.closest('.dnav .cg'), shb = e.target.closest('.dnav .sh');
  if (cgb || shb) {
    const p = DET && DET.p; if (!p) return; const key = ik(p);
    if (cgb) {
      CAUGHT.has(key) ? CAUGHT.delete(key) : CAUGHT.add(key);
      store.set('caught', [...CAUGHT]);
      cgb.setAttribute('aria-pressed', CAUGHT.has(key)); cgb.innerHTML = CAUGHT.has(key) ? BALL + ' Capturé' : BALL_OFF + ' Capturé';
    } else {
      SHINY.has(key) ? SHINY.delete(key) : SHINY.add(key);
      store.set('shiny', [...SHINY]);
      shb.setAttribute('aria-pressed', SHINY.has(key));
    }
    render();
    return;
  }
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
    'data/evo.json', 'data/moves.json', 'data/ref.json', 'data/go.json', ...GAMES.map(g => `data/dex/${g.id}.json`)];
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
    const data = { favs: [...FAVS], caught: [...CAUGHT], shiny: [...SHINY] };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
    const l = document.createElement('a'); l.href = url; l.download = 'pokedex-sauvegarde.json'; l.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  im.addEventListener('change', async () => {
    try {
      const d = JSON.parse(await im.files[0].text());
      const ids = x => Array.isArray(x) ? x.filter(validId) : [];
      ids(d.favs).forEach(n => FAVS.add(n)); ids(d.caught).forEach(n => CAUGHT.add(n)); ids(d.shiny).forEach(n => SHINY.add(n));
      store.set('favs', [...FAVS]); store.set('caught', [...CAUGHT]); store.set('shiny', [...SHINY]);
      render(); alert('Sauvegarde importée.');
    } catch { alert('Fichier invalide.'); }
    im.value = '';
  });
})();
