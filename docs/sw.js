'use strict';
const VERSION = 'v32';
// v30: shown in the in-app « Nouvelle version disponible » banner (keep it short)
const NOTES = 'Descriptions Poképédia, origine du nom, lieux des jeux Switch, GO : PvP, régions, déguisements de Métamorph, filtres Méga / Gigamax.';
const DATA_VERSION = 'd12'; // bump when the schema of data/*.json changes
const DATA = `pokedex-data-${DATA_VERSION}`;
const SHELL = `pokedex-shell-${VERSION}`;
const IMGS = 'pokedex-img';
const CRIES = 'pokedex-cries'; // v29: cries (MP3), cached when first played
const SHELL_FILES = ['./', 'index.html', 'style.css', 'app.js', 'manifest.webmanifest', 'data/core.json',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'img/alpha/baron.png'];

// v30: a new version waits until the user taps « Mettre à jour » (in-app banner) — no forced activation.
// One-time bridge: pages of v29 and older have no banner, so replacing such a version still activates at once (as before).
self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(SHELL_FILES.map(u => new Request(u, { cache: 'reload' })))).then(() => caches.keys()).then(keys => { // cache: 'reload' = fresh files, not the HTTP cache
    const legacy = keys.some(k => { const m = /^pokedex-shell-v(\d+)$/.exec(k); return m && +m[1] < 30; });
    if (legacy) return self.skipWaiting();
  }));
});
self.addEventListener('message', e => {
  const d = e.data || {};
  if (d.type === 'SKIP_WAITING') self.skipWaiting();
  else if (d.type === 'VERSION' && e.ports[0]) e.ports[0].postMessage({ v: VERSION, notes: NOTES });
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => ((k.startsWith('pokedex-shell-') && k !== SHELL) || (k.startsWith('pokedex-data-') && k !== DATA) || k === 'pokedex-data')).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.includes('/img/')) { // cache-first for images
    e.respondWith(caches.open(IMGS).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) c.put(req, res.clone());
      return res;
    }));
    return;
  }
  if (url.pathname.includes('/cries/')) { // cache-first, only once played (offline afterwards)
    e.respondWith(caches.open(CRIES).then(async c => {
      const hit = await c.match(req, { ignoreVary: true });
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok && res.status === 200) c.put(req, res.clone());
      return res;
    }));
    return;
  }
  if (url.pathname.includes('/data/')) { // stale-while-revalidate, data kept across app updates
    e.respondWith(caches.open(DATA).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  // stale-while-revalidate for the app shell
  e.respondWith(caches.open(SHELL).then(async c => {
    const hit = await c.match(req, { ignoreSearch: true }) || (req.mode === 'navigate' ? await c.match('index.html') : undefined);
    const net = fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
});
