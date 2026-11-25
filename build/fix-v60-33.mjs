// v60.33 : classements des meilleurs attaquants des raids Téracristal 5★, Dynamax 5★ et Aventure Dynamax
// → docs/data/rank-sv-raid.json. Idempotent. Ne relance pas le calcul si le fichier est déjà complet
// (le calcul demande @smogon/calc et plusieurs minutes).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, '../docs/data/rank-sv-raid.json');

if (!fs.existsSync(OUT) || !fs.statSync(OUT).size) {
  console.error('v60.33 : docs/data/rank-sv-raid.json manquant. Lancez : npm --prefix build install && node build/rank-sv-raids.mjs --5star && node build/rank-sw-raids.mjs');
  process.exit(1);
}
const j = JSON.parse(fs.readFileSync(OUT, 'utf8'));
const B = j.B || [];
const n7 = B.filter(b => b[3] === 7).length;
const n6 = B.filter(b => b[3] === 6).length;
const n5 = B.filter(b => b[3] === 5 && !String(b[0]).endsWith('-mx')).length;
const nMx = B.filter(b => String(b[0]).endsWith('-mx')).length;
const nAdv = B.filter(b => String(b[0]).endsWith('-adv') || b[3] === 8).length;
const nP = Object.keys(j.P || {}).length;
const cells = [];
for (const teras of Object.values(j.P || {})) {
  for (const cell of Object.values(teras || {})) cells.push(cell);
}
const hasDA = cells.length && cells.every(c => c && Array.isArray(c.d) && Array.isArray(c.a));
console.log(`v60.33 rank-sv-raid : ${n7}×7★, ${n6}×6★, ${n5}×5★ ÉV, ${nMx}×5★ Dynamax, ${nAdv} Aventure, ${nP} fiches, listes directe/accumulation ${hasDA ? 'ok' : 'absentes'}`);
if (n7 < 50 || n6 < 100) {
  console.error('v60.33 : les classements 7★ / 6★ sont incomplets');
  process.exit(1);
}
if (n5 < 100) {
  console.error('v60.33 : trop peu de raids 5★ Téracristal classés (relancez : node build/rank-sv-raids.mjs --5star)');
  process.exit(1);
}
if (nMx < 200) {
  console.error('v60.33 : trop peu de raids Dynamax 5★ classés (relancez : node build/rank-sw-raids.mjs)');
  process.exit(1);
}
if (nAdv < 40) {
  console.error('v60.33 : trop peu de légendaires d’Aventure classés (relancez : node build/rank-sw-raids.mjs)');
  process.exit(1);
}
if (!hasDA) {
  console.error('v60.33 : le schéma à deux listes (d / a) est absent.');
  process.exit(1);
}
