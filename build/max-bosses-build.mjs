// Construit build/max-bosses.json (boss Dynamax 5★ et Gigamax 6★) à partir de la feuille No-Floats-Left
// « Raid / Max Battle Parameters » (export CSV /tmp/nfl.csv). Lecture seule de docs/data.
// Règle : dernière apparition de chaque boss ; mécanique 2026 appliquée partout (5★ : charge ×4 ; 6★ : charge ×15, attaque ×1).
import fs from 'node:fs'; import path from 'node:path';
const R = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const rows = fs.readFileSync('/tmp/nfl.csv', 'utf8').trim().split('\n').map(l => l.match(/"([^"]*)"/g).map(s => s.slice(1, -1)));
const num = s => parseFloat(String(s).replace(',', '.'));
const date = s => { const [d, m, y] = s.split(' ')[0].split('.'); return `${y}-${m}-${d}`; };
const last = name => rows.filter(r => r[1] === 'Max' && r[3] === name).sort((a, b) => date(b[4]).localeCompare(date(a[4])))[0];
const B5 = [['144','Artikodin','Articuno'],['145','Électhor','Zapdos'],['146','Sulfura','Moltres'],['243','Raikou','Raikou'],['244','Entei','Entei'],['245','Suicune','Suicune'],['249','Lugia','Lugia'],['250','Ho-Oh','Ho-Oh'],['377','Regirock','Regirock'],['378','Regice','Regice'],['379','Registeel','Registeel'],['380','Latias','Latias'],['381','Latios','Latios'],['895','Regidrago','Regidrago'],['480','Créhelf',null],['481','Créfollet',null],['482','Créfadet',null],['483','Dialga','Dialga'],['484','Palkia','Palkia']];
const B6 = [['3-gmax','Florizarre Gigamax','Venusaur'],['6-gmax','Dracaufeu Gigamax','Charizard'],['9-gmax','Tortank Gigamax','Blastoise'],['12-gmax','Papilusion Gigamax','Butterfree'],['25-gmax','Pikachu Gigamax','Pikachu'],['52-gmax','Miaouss Gigamax','Meowth'],['68-gmax','Mackogneur Gigamax','Machamp'],['94-gmax','Ectoplasma Gigamax','Gengar'],['99-gmax','Krabboss Gigamax','Kingler'],['131-gmax','Lokhlass Gigamax','Lapras'],['143-gmax','Ronflex Gigamax','Snorlax'],['569-gmax','Miasmax Gigamax','Garbodor'],['812-gmax','Gorythmic Gigamax','Rillaboom'],['815-gmax','Pyrobut Gigamax','Cinderace'],['818-gmax','Lézargus Gigamax','Inteleon'],['849-amped-gmax','Salarsen Gigamax','Toxtricity (Amped Form)'],['861-gmax','Angoliath Gigamax','Grimmsnarl'],['890-eternamax','Éthernatos Infinimax','Eternatus (Eternamax)'],['884-gmax','Duralugon Gigamax','Duraludon']];
const out = { _doc: 'Paramètres par boss (No-Floats-Left, dernière apparition). Approximations notées dans "approx".', source: 'https://docs.google.com/spreadsheets/d/ (No-Floats-Left « Raid / Max Battle Parameters », export du 27/10/2026)', bosses: [] };
for (const [key, fr, en] of [...B5.map(x => [...x, 5]), ...B6.map(x => [...x, 6])].map(x => x)) {}
const push = (key, fr, en, tier) => {
  const r = en && last(en), ap = [];
  let p;
  if (r) p = { cpm: num(r[5]), hp: num(r[6]), limit: num(r[7]), enrageAt: num(r[8]), atkMult: num(r[9]), rate: num(r[11]), date: date(r[4]) };
  else if (tier === 6) { p = { cpm: 0.85, hp: 90000, limit: 600, enrageAt: 220, atkMult: 1, rate: 3, date: null }; ap.push('absent de la feuille (pas encore sorti) : valeurs 6★ typiques (CPM 0,85, 90 000 PV, 3 s), à confirmer'); }
  else { p = { cpm: 0.8, hp: 20000, limit: 400, enrageAt: 300, atkMult: 2, rate: 10, date: null }; ap.push('absent de la feuille : valeurs 5★ typiques (CPM 0,8, 20 000 PV, 10 s)'); }
  p.enrage = tier === 5 ? 3 : 6;
  p.meMult = tier === 5 ? 4 : 15; p.meDec = 2;
  if (tier === 5 && r && !r[16]) ap.push('charge de jauge ×4 (règle depuis le 20/04/2026) appliquée à une apparition plus ancienne');
  if (tier === 5 && r && r[16] && num(r[16]) !== 4) { ap.push(`feuille : charge ×${r[16]} à cette apparition, ramenée à ×4 (règle actuelle)`); }
  if (tier === 6) { if (p.atkMult !== 1) ap.push('attaque ×0,9 (apparition 2025) ramenée à ×1 (règle 2026)'); p.atkMult = 1; if (!(r && r[16])) ap.push('charge de jauge ×15 (règle depuis le 15/02/2026) appliquée'); }
  if (en === 'Cinderace') ap.push('apparition du 03/10/2026 absente de la feuille : paramètres 2025');
  if (en === 'Meowth' || en === 'Pikachu') ap.push(`CPM ${p.cpm} très différent des autres 6★ : repris tel quel`);
  if (key === '890-eternamax') ap.push('stats et attaques du game master (V0890_POKEMON_ETERNATUS_ETERNAMAX), absentes des données de l’app');
  out.bosses.push({ key, fr, en, tier, ...p, approx: ap });
};
// v60.7 : boss Dynamax 3★ et 4★. Paramètres communs à tout le niveau (feuille, lignes « All » du 18/09/2024 et du 16/11/2024 ; Bulbapedia identique) :
// 3★ CPM 0,5, 10 000 PV ; 4★ CPM 0,6, 20 000 PV ; 480 s, attaque toutes les 10 s, ×9 après 300 s (à confirmer), charge de jauge ×1 sans décimale.
const B3 = [['106','Kicklee'],['107','Tygnon'],['237','Kapoera'],['126','Magmar'],['633','Solochi'],['615','Hexagel'],['125','Élektek'],['766','Quartermac'],['780','Draïeul'],['870','Hexadron'],['113','Leveinard'],['302','Ténéfix'],['374','Terhal'],['213','Caratroc'],['530','Minotaupe']];
const B4 = [['884','Duralugon'],['849','Salarsen Forme Aigüe'],['849-low-key','Salarsen Forme Grave']];
const pushLow = (key, fr, tier) => out.bosses.push({ key, fr, en: null, tier, cpm: tier === 3 ? 0.5 : 0.6, hp: tier === 3 ? 10000 : 20000, limit: 480, enrageAt: 300, atkMult: 1, rate: 10, date: tier === 3 ? '2024-09-18' : '2024-11-16', enrage: 9, meMult: 1, meDec: 0,
  approx: ['paramètres communs à tous les boss ' + tier + '★ (feuille No-Floats-Left, fin 2024)', 'attaques ×9 après 300 s : à confirmer'] });
for (const x of B5) push(x[0], x[1], x[2], 5);
for (const x of B6) push(x[0], x[1], x[2], 6);
for (const x of B3) pushLow(x[0], x[1], 3);
for (const x of B4) pushLow(x[0], x[1], 4);

// Éthernatos Infinimax : bloc go inline
out.inline = { '890-eternamax': { a: 251, d: 505, s: 452, t: ['poison', 'dragon'], fm: [], cm: ['SLUDGE_BOMB', 'HYPER_BEAM', 'FLAMETHROWER'], ce: ['DYNAMAX_CANNON'] } };
fs.writeFileSync(R + '/build/max-bosses.json', JSON.stringify(out, null, 1));
console.log(out.bosses.map(b => `${b.fr}: ${b.cpm} ${b.hp} ${b.rate}s ${b.approx.join(' ; ')}`).join('\n'));
