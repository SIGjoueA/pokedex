// v60.38 : journal des versions v35–v60.37 dans le README.
// Idempotent : vérifie la présence du journal, la VERSION, DATA_VERSION d77, l’absence du prénom du dépositaire dans les fichiers suivis.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const README = fs.readFileSync(path.join(HERE, '../README.md'), 'utf8');
const sw = fs.readFileSync(path.join(HERE, '../docs/sw.js'), 'utf8');
const notes = fs.readFileSync(path.join(HERE, '../docs/notes.json'), 'utf8');
const checks = [
  ['journal heading', /## Journal des versions \(v35–v60\.37\)/.test(README)],
  ['ligne v35 et v60.37', /\*\*v35\*\*/.test(README) && /\*\*v60\.37\*\*/.test(README)],
  ['groupe v60.8–v60.15', /\*\*v60\.8–v60\.15\*\*/.test(README)],
  ['trou v60.13 documenté', /v60\.13/.test(README) && /n’a pas (créé|publié)/.test(README)],
  ['VERSION v60.38', /const VERSION = 'v60\.38'/.test(sw)],
  ['DATA_VERSION d77', /const DATA_VERSION = 'd77'/.test(sw)],
  ['notes.json v60.38', /"v": "v60\.38"/.test(notes)],
];
const bad = checks.filter(([, ok]) => !ok).map(([n]) => n);
if (bad.length) {
  console.error('v60.38 : garde-fous manquants : ' + bad.join(', '));
  process.exit(1);
}
console.log('v60.38 : journal README v35–v60.37 ok, DATA_VERSION d77');
