'use strict';
const TYPE_COLORS = {normal:'#8a8f98',fighting:'#c03a4b',flying:'#7f9bd8',poison:'#a35bc8',ground:'#b98a4b',rock:'#a89d6c',bug:'#8aaa28',ghost:'#5a6bb3',steel:'#5a8ea3',fire:'#f08030',water:'#3b8ee6',grass:'#46a846',electric:'#e0b800',psychic:'#f2587f',ice:'#4cc1c8',dragon:'#4a58d6',dark:'#5a4a52',fairy:'#e87fc5'};
const STAT_LABELS = ['PV','Attaque','Défense','Att. Spé.','Déf. Spé.','Vitesse'];
const GEN_LABELS = ['', 'I Kanto', 'II Johto', 'III Hoenn', 'IV Sinnoh', 'V Unys', 'VI Kalos', 'VII Alola', 'VIII Galar', 'IX Paldea'];
const $ = s => document.querySelector(s);
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};
const norm = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad = n => String(n).padStart(4, '0');
const dec = n => String(n).replace('.', ',');
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

let DATA, BY_ID = {}, TYPE_FR = {}, FAVS = new Set(store.get('favs', []));
const state = { q: '', types: [], gen: '', cat: '', sort: 'id', view: store.get('view', 'grid'), goMode: store.get('goMode', true) };
let listScroll = 0;

async function boot() {
  try {
    const r = await fetch('data/pokedex.json');
    DATA = await r.json();
  } catch (e) {
    $('#results').innerHTML = '<p class="empty">Impossible de charger les données. Ouvrez l’application une fois avec une connexion Internet.</p>';
    return;
  }
  DATA.pokemon.forEach(p => {
    BY_ID[p.id] = p; p.n = norm(p.fr); p.ne = norm(p.en);
    p.total = p.st.reduce((a, b) => a + b, 0);
  });
  DATA.types.forEach(t => TYPE_FR[t.key] = t.fr);
  buildControls();
  render();
  window.addEventListener('hashchange', route);
  route();
  registerSW();
}

/* ---------------- list ---------------- */
function buildControls() {
  $('#gen').innerHTML = '<option value="">Toutes gén.</option>' +
    GEN_LABELS.slice(1).map((l, i) => `<option value="${i + 1}">Gén. ${l}</option>`).join('');
  $('#typechips').innerHTML = DATA.types.map(t =>
    `<button class="chip" data-t="${t.key}" aria-pressed="false" style="background:${TYPE_COLORS[t.key]}">${esc(t.fr)}</button>`).join('');
  $('#q').addEventListener('input', e => { state.q = e.target.value; render(); });
  $('#gen').addEventListener('change', e => { state.gen = e.target.value; render(); });
  $('#cat').addEventListener('change', e => { state.cat = e.target.value; render(); });
  $('#sort').addEventListener('change', e => { state.sort = e.target.value; render(); });
  $('#typechips').addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    toggleType(b.dataset.t);
  });
  $('#viewbtn').addEventListener('click', () => { state.view = state.view === 'grid' ? 'list' : 'grid'; store.set('view', state.view); render(); });
  $('#reset').addEventListener('click', resetFilters);
  document.addEventListener('keydown', e => { if (e.key === '/' && document.activeElement.tagName !== 'INPUT') { e.preventDefault(); $('#q').focus(); } });
}
function toggleType(t) {
  const i = state.types.indexOf(t);
  if (i >= 0) state.types.splice(i, 1);
  else { state.types.push(t); if (state.types.length > 2) state.types.shift(); }
  render();
}
function resetFilters() {
  Object.assign(state, { q: '', types: [], gen: '', cat: '', sort: 'id' });
  $('#q').value = ''; $('#gen').value = ''; $('#cat').value = ''; $('#sort').value = 'id';
  render();
}
function badge(t) { return `<span class="badge" style="background:${TYPE_COLORS[t]}">${esc(TYPE_FR[t])}</span>`; }

function filtered() {
  const raw = state.q.trim();
  const qn = norm(raw);
  const numeric = /^#?\d+$/.test(raw) ? parseInt(raw.replace('#', ''), 10) : null;
  let out = DATA.pokemon.filter(p => {
    if (numeric !== null) { if (p.id !== numeric) return false; }
    else if (qn && !p.n.includes(qn) && !p.ne.includes(qn)) return false;
    if (state.gen && p.g !== +state.gen) return false;
    for (const t of state.types) if (!p.t.includes(t)) return false;
    if (state.cat === 'leg' && !p.leg) return false;
    if (state.cat === 'myth' && !p.myth) return false;
    if (state.cat === 'baby' && !p.baby) return false;
    if (state.cat === 'fav' && !FAVS.has(p.id)) return false;
    return true;
  });
  if (qn && numeric === null) { // prefix matches first
    out.sort((a, b) => (b.n.startsWith(qn) || b.ne.startsWith(qn)) - (a.n.startsWith(qn) || a.ne.startsWith(qn)) || a.id - b.id);
  }
  const s = state.sort;
  if (s !== 'id' || !qn) {
    const key = { id: p => p.id, name: p => p.n, total: p => -p.total, hp: p => -p.st[0], atk: p => -p.st[1], def: p => -p.st[2], spe: p => -p.st[5] }[s];
    out.sort((a, b) => { const x = key(a), y = key(b); return x < y ? -1 : x > y ? 1 : a.id - b.id; });
  }
  return out;
}

function cardHTML(p) {
  const star = FAVS.has(p.id) ? '<span class="star" aria-label="Favori">★</span>' : '';
  return `<a class="card" href="#/p/${p.id}"><img src="img/${p.id}.webp" alt="" loading="lazy" decoding="async" width="256" height="256">` +
    `<div class="info"><div class="num">#${pad(p.id)}${p.leg ? ' · Légendaire' : p.myth ? ' · Fabuleux' : ''}</div><div class="nm">${esc(p.fr)} ${star}</div></div>` +
    `<div class="badges">${p.t.map(badge).join('')}</div></a>`;
}
function render() {
  const res = filtered();
  const box = $('#results');
  box.className = state.view === 'grid' ? 'grid' : 'grid list';
  $('#viewbtn').textContent = state.view === 'grid' ? '☰' : '▦';
  box.innerHTML = res.length ? res.map(cardHTML).join('') : '<p class="empty">Aucun Pokémon trouvé.</p>';
  $('#count').textContent = `${res.length} Pokémon`;
  document.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', state.types.includes(c.dataset.t)));
  const active = state.q || state.types.length || state.gen || state.cat || state.sort !== 'id';
  $('#reset').hidden = !active;
}

/* ---------------- detail ---------------- */
function route() {
  const m = location.hash.match(/^#\/p\/(\d+)/);
  const lv = $('#list-view'), dv = $('#detail-view');
  if (m && BY_ID[+m[1]]) {
    if (!lv.hidden) listScroll = window.scrollY;
    lv.hidden = true; dv.hidden = false;
    renderDetail(BY_ID[+m[1]]);
    window.scrollTo(0, 0);
  } else {
    dv.hidden = true; lv.hidden = false;
    document.title = 'Pokédex';
    window.scrollTo(0, listScroll);
  }
}
function goSteps(p) { return p.go; }
function effGroups(p) {
  const g = {};
  if (state.goMode) {
    const mult = { 2: 2.56, 1: 1.6, '-1': 0.625, '-2': 0.391, '-3': 0.244 };
    for (const [t, s] of Object.entries(p.go)) (g[s] ||= []).push(t);
    return [[2, 'Très faible', '×2,56', 'w'], [1, 'Faible', '×1,6', 'w'], [-1, 'Résiste', '×0,625', 'r'], [-2, 'Résiste fortement', '×0,39', 'r'], [-3, 'Résiste énormément', '×0,24', 'r']]
      .map(([k, l, m, c]) => ({ label: l, mult: m, cls: c, types: g[k] || [] })).filter(x => x.types.length);
  }
  for (const [t, v] of Object.entries(p.wk)) (g[v] ||= []).push(t);
  return [[4, 'Très faible', '×4', 'w'], [2, 'Faible', '×2', 'w'], [0.5, 'Résiste', '×½', 'r'], [0.25, 'Résiste fortement', '×¼', 'r'], [0, 'Immunisé', '×0', 'r']]
    .map(([k, l, m, c]) => ({ label: l, mult: m, cls: c, types: g[k] || [] })).filter(x => x.types.length);
}
function effHTML(p) {
  const gs = effGroups(p);
  const body = gs.map(x => `<div class="eff ${x.cls}"><div class="hd">${x.label} <small>${x.mult}</small></div><div class="badges">` +
    x.types.map(t => `<a class="badge" href="#" data-type="${t}" style="background:${TYPE_COLORS[t]}">${esc(TYPE_FR[t])}</a>`).join('') + '</div></div>').join('');
  return body || '<p class="note">Aucune faiblesse ni résistance.</p>';
}
function statColor(v) { return v < 50 ? '#e5534b' : v < 80 ? '#e0a02f' : v < 110 ? '#9bc53d' : v < 150 ? '#3fbf7f' : '#35b7d6'; }
function evoHTML(node, curId, depth = 0) {
  const p = BY_ID[node.id];
  const me = `<a class="evpk${node.id === curId ? ' cur' : ''}" href="#/p/${p.id}"><img src="img/${p.id}.webp" alt="" loading="lazy" width="72" height="72"><span>${esc(p.fr)}</span><small>#${pad(p.id)}</small></a>`;
  if (!node.e.length) return `<div class="evrow">${me}</div>`;
  const kids = node.e.map(k => `<div class="evrow"><div class="evlink">${esc(cap(k.c || ''))}</div>${evoHTML(k, curId, depth + 1)}</div>`).join('');
  return `<div class="evrow">${me}<div class="evbranch">${kids}</div></div>`;
}
function renderDetail(p) {
  document.title = `${p.fr} #${pad(p.id)} – Pokédex`;
  const c1 = TYPE_COLORS[p.t[0]], c2 = TYPE_COLORS[p.t[1] || p.t[0]];
  const max = DATA.pokemon.length;
  const prev = p.id > 1 ? `#/p/${p.id - 1}` : '', next = p.id < max ? `#/p/${p.id + 1}` : '';
  const chain = DATA.chains[p.ch];
  const single = chain && !chain.e.length;
  const tags = [p.leg && 'Légendaire', p.myth && 'Fabuleux', p.baby && 'Bébé', `Gén. ${GEN_LABELS[p.g]}`].filter(Boolean);
  const stats = p.st.map((v, i) => `<div class="stat"><span class="lb">${STAT_LABELS[i]}</span><span class="v">${v}</span><div class="bar"><i style="width:${Math.min(100, v / 255 * 100)}%;background:${statColor(v)}"></i></div></div>`).join('') +
    `<div class="stat total"><span class="lb">Total</span><span class="v">${p.total}</span><div class="bar"><i style="width:${Math.min(100, p.total / 720 * 100)}%;background:var(--accent)"></i></div></div>`;
  $('#detail-view').innerHTML = `
  <div class="dnav"><a href="#/" aria-label="Retour à la liste">←</a><a class="${prev ? '' : 'disabled'}" href="${prev || '#'}" aria-label="Précédent">‹</a><a class="${next ? '' : 'disabled'}" href="${next || '#'}" aria-label="Suivant">›</a><span class="sp"></span>
    <button class="fav" aria-pressed="${FAVS.has(p.id)}" aria-label="Favori">${FAVS.has(p.id) ? '★' : '☆'}</button></div>
  <div class="detail">
    <div class="hero" style="--c1:${c1};--c2:${c2}">
      <div class="num">#${pad(p.id)}</div>
      <img src="img/${p.id}.webp" alt="${esc(p.fr)}" width="256" height="256">
      <h1>${esc(p.fr)}</h1>
      <div class="genus">${esc(p.genus)}${p.en !== p.fr ? ` · ${esc(p.en)}` : ''}</div>
      <div class="badges">${p.t.map(t => `<a class="badge" href="#" data-type="${t}">${esc(TYPE_FR[t])}</a>`).join('')}</div>
      <div class="tags">${tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
    </div>
    ${p.desc ? `<p class="desc">${esc(p.desc)}</p>` : ''}
    <section class="box"><div class="kv"><div><b>${dec(p.h)} m</b><span>Taille</span></div><div><b>${dec(p.w)} kg</b><span>Poids</span></div></div></section>
    <section class="box"><h2>Statistiques de base</h2>${stats}<p class="note">Stats des jeux principaux (PokéAPI). Pokémon GO utilise ses propres stats de base, non incluses ici.</p></section>
    <section class="box"><h2>Faiblesses &amp; résistances
      <span class="seg" role="group"><button data-mode="go" aria-pressed="${state.goMode}">GO</button><button data-mode="main" aria-pressed="${!state.goMode}">Jeux</button></span></h2>
      <div id="eff">${effHTML(p)}</div>
      <p class="note" id="effnote">${effNote()}</p></section>
    <section class="box"><h2>Évolutions</h2>${single || !chain ? '<p class="note">Ne possède pas d’évolution.</p>' : `<div class="evo">${evoHTML(chain, p.id)}</div>`}
      <p class="note">Conditions issues des jeux principaux. Les bonbons nécessaires dans Pokémon GO ne sont pas inclus.</p></section>
  </div>`;
}
function effNote() {
  return state.goMode
    ? 'Multiplicateurs de Pokémon GO (×1,6 par faiblesse, ×0,625 par résistance ; une immunité des jeux principaux compte comme une double résistance).'
    : 'Multiplicateurs des jeux principaux (×2, ×½, immunités ×0).';
}
document.addEventListener('click', e => {
  const t = e.target.closest('[data-type]');
  if (t) { // filter list by this type
    e.preventDefault();
    state.types = [t.dataset.type]; state.q = ''; $('#q').value = '';
    listScroll = 0; render(); location.hash = '#/';
    return;
  }
  const m = e.target.closest('[data-mode]');
  if (m) {
    state.goMode = m.dataset.mode === 'go'; store.set('goMode', state.goMode);
    const id = +location.hash.match(/#\/p\/(\d+)/)?.[1];
    $('#eff').innerHTML = effHTML(BY_ID[id]); $('#effnote').textContent = effNote();
    document.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', (b.dataset.mode === 'go') === state.goMode));
    return;
  }
  const f = e.target.closest('.fav');
  if (f) {
    const id = +location.hash.match(/#\/p\/(\d+)/)?.[1];
    FAVS.has(id) ? FAVS.delete(id) : FAVS.add(id);
    store.set('favs', [...FAVS]);
    f.setAttribute('aria-pressed', FAVS.has(id)); f.textContent = FAVS.has(id) ? '★' : '☆';
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
  const done = store.get('imgsDone', false);
  $('#offline').innerHTML = msg || (done ? '<p style="margin:0">✓ Disponible hors-ligne (données et images enregistrées).</p>'
    : '<button id="dl">Télécharger toutes les images pour le hors-ligne (~14 Mo)</button>');
  const b = $('#dl'); if (b) b.onclick = cacheImages;
}
async function cacheImages() {
  if (caching) return; caching = true;
  const ids = DATA.pokemon.map(p => p.id);
  let n = 0, fail = 0;
  const next = async () => {
    while (ids.length) {
      const id = ids.shift();
      try { const r = await fetch(`img/${id}.webp`); if (!r.ok) throw 0; await r.arrayBuffer(); } catch { fail++; }
      if (++n % 20 === 0) showOffline(`<p style="margin:0">Téléchargement des images : ${n}/${DATA.pokemon.length}…</p>`);
    }
  };
  await Promise.all(Array.from({ length: 4 }, next));
  caching = false;
  if (!fail) store.set('imgsDone', true);
  showOffline(fail ? null : undefined);
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
