// v60.34 : illustrations HOME par défaut (y compris shiny HOME) et secours sprite officiel.
// Idempotent : vérifie les fichiers img/hs, recense les formes sans rendu HOME, ne réécrit
// ni core.json ni les images. Relancer fetch-home-shiny.mjs seulement si des fichiers manquent.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const DOCS = path.join(ROOT, 'docs');
const CORE = path.join(DOCS, 'data/core.json');
const HS = path.join(DOCS, 'img/hs');
const H = path.join(DOCS, 'img/h');
const CACHE = path.join(HERE, 'cache/v60-34');
fs.mkdirSync(CACHE, { recursive: true });

const core = JSON.parse(fs.readFileSync(CORE, 'utf8'));
const entries = [...core.e, ...core.e.filter(e => e.fe).map(e => ({ ...e, ...e.fe, c: 'sex', l: 'Femelle' }))];

const noHome = entries.filter(e => !e.hh && !e.hs).map(e => ({ k: e.k, n: e.n || e.fn || e.k }));
const expectHs = entries.filter(e => e.hs && e.sh).map(e => e.k);
const hsFiles = fs.existsSync(HS) ? new Set(fs.readdirSync(HS).filter(f => f.endsWith('.webp')).map(f => f.replace(/\.webp$/, ''))) : new Set();
const missingHs = expectHs.filter(k => !hsFiles.has(k));
const extraHs = [...hsFiles].filter(k => !expectHs.includes(k));
const hCount = fs.existsSync(H) ? fs.readdirSync(H).filter(f => f.endsWith('.webp')).length : 0;
const hsBytes = [...hsFiles].reduce((s, k) => s + fs.statSync(path.join(HS, k + '.webp')).size, 0);

const report = {
  forms: core.e.length,
  withHome: entries.filter(e => e.hh).length,
  noHome,
  expectHs: expectHs.length,
  hsFiles: hsFiles.size,
  hsBytes,
  missingHs,
  extraHs,
  hCount,
};
fs.writeFileSync(path.join(CACHE, 'manques-home.json'), JSON.stringify(report, null, 2) + '\n');

console.log(`v60.34 : ${noHome.length} formes sans rendu HOME, shiny HOME ${hsFiles.size}/${expectHs.length} (${(hsBytes / 1e6).toFixed(2)} Mo)`);
if (noHome.length) console.log('  sans HOME : ' + noHome.map(x => x.k).join(', '));
if (missingHs.length) console.log('  shiny HOME manquants : ' + missingHs.join(', '));
if (extraHs.length) console.log('  fichiers hs en trop : ' + extraHs.join(', '));

if (!fs.existsSync(HS) || hsFiles.size < 1500) {
  console.error('v60.34 : docs/img/hs/ incomplet. Lancez : npm --prefix build install && node build/fetch-home-shiny.mjs');
  process.exit(1);
}
if (extraHs.length) {
  console.error('v60.34 : fichiers inattendus dans docs/img/hs/');
  process.exit(1);
}
// Les 7 casquettes de Pikachu n’ont pas de shiny HOME côté PokéAPI (404) : c’est un écart connu.
const knownMissing = missingHs.filter(k => !/^25-(alola|hoenn|kalos|original|sinnoh|unova|world)-cap$/.test(k));
if (knownMissing.length) {
  console.error('v60.34 : shiny HOME manquants inattendus : ' + knownMissing.join(', '));
  process.exit(1);
}
if (noHome.length !== 10) {
  console.error('v60.34 : le nombre de formes sans HOME a changé (' + noHome.length + ', attendu 10)');
  process.exit(1);
}
