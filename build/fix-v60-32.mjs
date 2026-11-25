// v60.32 : classements des meilleurs attaquants des raids Téracristal 7★ et 6★ → docs/data/rank-sv-raid.json
// Idempotent. Ne relance pas le calcul si le fichier est déjà présent (le calcul demande @smogon/calc et plusieurs minutes).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, '../docs/data/rank-sv-raid.json');

if (!fs.existsSync(OUT) || !fs.statSync(OUT).size) {
  console.error('v60.32 : docs/data/rank-sv-raid.json manquant. Lancez : npm --prefix build install && node build/rank-sv-raids.mjs');
  process.exit(1);
}
const j = JSON.parse(fs.readFileSync(OUT, 'utf8'));
const n7 = (j.B || []).filter(b => b[3] === 7).length;
const n6 = (j.B || []).filter(b => b[3] === 6).length;
const nP = Object.keys(j.P || {}).length;
const cells = [];
for (const teras of Object.values(j.P || {})) {
  for (const cell of Object.values(teras || {})) cells.push(cell);
}
const hasDA = cells.length && cells.every(c => c && Array.isArray(c.d) && Array.isArray(c.a));
console.log(`v60.32 rank-sv-raid : ${n7} raids 7★, ${n6} raids 6★, ${nP} fiches, listes directe/accumulation ${hasDA ? 'ok' : 'absentes'}`);
if (n7 < 50) {
  console.error('v60.32 : trop peu de raids 7★ classés');
  process.exit(1);
}
if (n6 < 100) {
  console.error('v60.32 : trop peu de raids 6★ classés (relancez : node build/rank-sv-raids.mjs)');
  process.exit(1);
}
if (!hasDA) {
  console.error('v60.32 : le schéma à deux listes (d / a) est absent. Relancez : node build/rank-sv-raids.mjs');
  process.exit(1);
}
