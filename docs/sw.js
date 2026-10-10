'use strict';
const VERSION = 'v27';
const DATA_VERSION = 'd9'; // bump when the schema of data/*.json changes
const DATA = `pokedex-data-${DATA_VERSION}`;
const SHELL = `pokedex-shell-${VERSION}`;
const IMGS = 'pokedex-img';
const SHELL_FILES = ['./', 'index.html', 'style.css', 'app.js', 'manifest.webmanifest', 'data/core.json',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'img/alpha/baron.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
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
