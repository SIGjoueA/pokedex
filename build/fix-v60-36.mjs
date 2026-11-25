// v60.36 : secours HOME puis sprite officiel quand le sprite animé manque.
// Idempotent : vérifie le comportement dans l’appli et l’exclusion du pack auto. Ne réécrit rien.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP = path.join(HERE, '../docs/app.js');
const app = fs.readFileSync(APP, 'utf8');
const set = (app.split('function setSprite')[1] || '').split('function closePop')[0] || '';
const cacheFn = (app.split('async function cacheImages')[1] || '').split('async function cachePack')[0] || '';
const checks = [
  ['useHome', /const useHome = /.test(set)],
  ['secours artOf puis artFb', /artOf\(p, shiny\)/.test(set) && /artFb\(p, shiny\)/.test(set)],
  ['onerror animé → useHome', /img\.onerror = \(\) => useHome\(\)/.test(set)],
  ['never precached', /never precached/.test(app)],
  ['pack auto sans showdown', !/showdown/.test(cacheFn) && !/githubusercontent/.test(cacheFn)],
];
const bad = checks.filter(([, ok]) => !ok).map(([n]) => n);
if (bad.length) {
  console.error('v60.36 : garde-fous manquants : ' + bad.join(', '));
  process.exit(1);
}
console.log('v60.36 : secours HOME des sprites animés ok, pack auto inchangé');
