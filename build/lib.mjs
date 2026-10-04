// Shared helpers for the build scripts: cached + retried HTTP fetch, small worker pool.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const CACHE = path.join(HERE, '.cache');
export const DOCS = path.resolve(HERE, '../docs');
fs.mkdirSync(CACHE, { recursive: true });
export const API = 'https://pokeapi.co/api/v2';

export async function get(url, { text = false, name } = {}) {
  const key = name || url.replace(/[^a-z0-9]+/gi, '_').slice(0, 200);
  const f = path.join(CACHE, key + (text ? '.txt' : '.json'));
  if (fs.existsSync(f)) { const t = fs.readFileSync(f, 'utf8'); return text ? t : JSON.parse(t); }
  let last;
  for (let i = 0; i < 7; i++) {
    try {
      const r = await fetch(url, { headers: { 'user-agent': 'pokedex-pwa-build/2.0 (personal project)' } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const t = await r.text();
      const parsed = text ? t : JSON.parse(t);
      fs.writeFileSync(f, t);
      return parsed;
    } catch (e) { last = e; await new Promise(r => setTimeout(r, 700 * (i + 1) ** 2)); }
  }
  throw new Error('failed ' + url + ' ' + last);
}
export async function pool(items, n, fn) {
  const res = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) { const k = i++; res[k] = await fn(items[k], k); }
  }));
  return res;
}
export const idOf = u => +u.match(/\/(\d+)\/?$/)[1];
export const frName = (names, field = 'name') => (names?.find(n => n.language.name === 'fr') || {})[field];
export const enName = names => (names?.find(n => n.language.name === 'en') || {}).name;
