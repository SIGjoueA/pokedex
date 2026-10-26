'use strict';
const VERSION = 'v56';
// v30: shown in the in-app « Nouvelle version disponible » banner (keep it short)
const NOTES = 'Fiches : Évolutions et Où le trouver juste sous Formes. Pocket : source de chaque carte promo.';
const DATA_VERSION = 'd29'; // bump when the schema of data/*.json changes
const DATA = `pokedex-data-${DATA_VERSION}`;
const SHELL = `pokedex-shell-${VERSION}`;
const IMGS = 'pokedex-img';
// v40: bump when images are replaced. Not a cache purge: a cached image stamped with an older IMG_VERSION is served at once,
// then revalidated in the background once (conditional request, usually a 304) and replaced only if it changed.
const IMG_VERSION = 'i40';
const CRIES = 'pokedex-cries'; // v29: cries (MP3), cached when first played
const SHELL_FILES = ['./', 'index.html', 'style.css', 'app.js', 'manifest.webmanifest', 'notes.json',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'img/alpha/baron.png', 'img/max/gigamax.webp', 'img/max/dynamax.webp'];

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
  else if (d.type === 'NOTES' && e.ports[0]) caches.open(SHELL).then(c => c.match('notes.json')).then(r => r ? r.json() : null).catch(() => null).then(n => e.ports[0].postMessage(n)); // v46: release notes of this (waiting) version, for the update banner
  else if (d.type === 'VERSION' && e.ports[0]) e.ports[0].postMessage({ v: VERSION, notes: NOTES, dv: DATA_VERSION }); // v34: dv = data cache version (offline pack flag)
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => ((k.startsWith('pokedex-shell-') && k !== SHELL) || (k.startsWith('pokedex-data-') && k !== DATA) || k === 'pokedex-data')).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname === 'assets.tcgdex.net' || url.hostname === 'limitlesstcg.nyc3.cdn.digitaloceanspaces.com') { // v50: Pocket card images (TCGdex), cache-first once seen
    e.respondWith(caches.open('pokedex-pocket').then(async c => { const hit = await c.match(req); if (hit) return hit; const res = await fetch(req); if (res.ok) c.put(req, res.clone()); return res; }));
    return;
  }
  if (url.origin !== location.origin) return;
  if (url.pathname.includes('/img/')) { // cache-first for images, v40: one background revalidation per IMG_VERSION
    e.respondWith(caches.open(IMGS).then(async c => {
      const hit = await c.match(req);
      if (hit) { if (hit.headers.get('x-img-v') !== IMG_VERSION) e.waitUntil(revalidateImg(c, req, hit)); return hit; }
      const res = await fetch(req);
      if (res.ok) e.waitUntil(putImg(c, req, res.clone()));
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
  if (url.pathname.includes('/data/')) { // data kept across app updates
    e.respondWith(caches.open(DATA).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; });
      // v40: core / go (updated by the weekly GO routine) = network first, cache if offline or after 3 s
      if (/\/data\/(core|go)\.json$/.test(url.pathname)) {
        if (!hit) return net;
        return Promise.race([net.catch(() => hit), new Promise(r => setTimeout(() => r(hit), 3000))]).then(r => (r && r.ok) ? r : hit);
      }
      const n2 = net.catch(() => hit); // other data: stale-while-revalidate
      return hit || n2;
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
// v40: images stamped with IMG_VERSION (x-img-v) so a replaced file is picked up without re-downloading the whole pack
async function putImg(c, req, res) {
  const h = new Headers(res.headers); h.set('x-img-v', IMG_VERSION);
  await c.put(req, new Response(await res.blob(), { status: res.status, statusText: res.statusText, headers: h }));
}
async function revalidateImg(c, req, hit) {
  try {
    const h = {}, et = hit.headers.get('etag'), lm = hit.headers.get('last-modified');
    if (et) h['If-None-Match'] = et; else if (lm) h['If-Modified-Since'] = lm;
    const res = await fetch(req.url, { headers: h, cache: 'no-store' });
    if (res.status === 304) await putImg(c, req, hit.clone());
    else if (res.ok) await putImg(c, req, res);
  } catch { /* offline: try again next time */ }
}
