// v60.35 : téléchargement optionnel des illustrations shiny HOME dans le pack hors-ligne.
// Idempotent : vérifie la présence des fichiers img/hs et des garde-fous dans l’appli
// (jamais automatique, réutilisation du cache, pack auto sans shiny). Ne réécrit rien.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DOCS = path.join(HERE, '../docs');
const HS = path.join(DOCS, 'img/hs');
const APP = path.join(DOCS, 'app.js');

const app = fs.readFileSync(APP, 'utf8');
const hsFiles = fs.existsSync(HS) ? fs.readdirSync(HS).filter(f => f.endsWith('.webp')) : [];
const hsBytes = hsFiles.reduce((s, f) => s + fs.statSync(path.join(HS, f)).size, 0);

if (hsFiles.length < 1580) {
  console.error(`v60.35 : docs/img/hs/ incomplet (${hsFiles.length} fichiers)`);
  process.exit(1);
}
const checks = [
  ['cacheShinyHome', /function cacheShinyHome/.test(app)],
  ['uncacheShinyHome', /function uncacheShinyHome/.test(app)],
  ['bouton et déjà téléchargé', /id="dlhs"/.test(app) && /déjà téléchargées/.test(app)],
  ['jamais automatique dans registerSW', /jamais lancé automatiquement/.test(app) && !/cacheShinyHome\(/.test((app.split('function registerSW')[1] || '').split('function swAsk')[0] || '')],
  ['pack auto sans img/hs', !/img\/hs\//.test((app.split('async function cacheImages')[1] || '').split('async function cachePack')[0] || '')],
  ['réutilise pokedex-img', /caches\.open\('pokedex-img'\)/.test(app)],
];
const bad = checks.filter(([, ok]) => !ok).map(([n]) => n);
if (bad.length) {
  console.error('v60.35 : garde-fous manquants : ' + bad.join(', '));
  process.exit(1);
}
console.log(`v60.35 : pack shiny HOME optionnel ok, ${hsFiles.length} fichiers (${(hsBytes / 1e6).toFixed(2)} Mo)`);
