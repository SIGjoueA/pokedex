// Classements des meilleurs attaquants contre les raids Téracristal 7★, 6★ et 5★ d’Écarlate / Violet.
// Calcul interne avec @smogon/calc (MIT, formule officielle de dégâts).
//   node build/rank-sv-raids.mjs           tout recalculer (7★ + 6★ ; conserve les 5★ déjà présents)
//   node build/rank-sv-raids.mjs --7star   ne recalculer que les 7★
//   node build/rank-sv-raids.mjs --5star   ne recalculer que les 5★ (conserve 7★ et 6★)
// Réutilisable après update-tera7.mjs : ajoute les nouveaux boss 7★ sans effacer le reste.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { calculate, Pokemon, Move, Generations, Field } = require('@smogon/calc');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const DATA = path.join(ROOT, 'docs/data');
const CACHE = path.join(HERE, 'cache/v60-32');
const CACHE7 = path.join(HERE, 'cache/v60-31');
const OUT = path.join(DATA, 'rank-sv-raid.json');
const ONLY7 = process.argv.includes('--7star');
const ONLY5 = process.argv.includes('--5star');
const ONLY_KEYS = (process.env.ONLY_KEYS || '').split(',').map(s => s.trim()).filter(Boolean);
const TYPES = ['normal','fire','water','grass','electric','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy'];
const TYPE_CAP = { normal:'Normal', fire:'Fire', water:'Water', grass:'Grass', electric:'Electric', ice:'Ice', fighting:'Fighting', poison:'Poison', ground:'Ground', flying:'Flying', psychic:'Psychic', bug:'Bug', rock:'Rock', ghost:'Ghost', dragon:'Dragon', dark:'Dark', steel:'Steel', fairy:'Fairy' };
const NATURE_EN = {
  Hardi:'Hardy', Solo:'Lonely', Brave:'Brave', Rigide:'Adamant', Mauvais:'Naughty',
  Assuré:'Bold', Docile:'Docile', Relax:'Relaxed', Malin:'Impish', Lâche:'Lax',
  Timide:'Timid', Pressé:'Hasty', Sérieux:'Serious', Jovial:'Jolly', 'Naïf':'Naive', Naif:'Naive',
  Modeste:'Modest', Doux:'Mild', Discret:'Quiet', Pudique:'Bashful', Foufou:'Rash',
  Calme:'Calm', Gentil:'Gentle', Malpoli:'Sassy', Prudent:'Careful', Bizarre:'Quirky',
  Aléatoire:'Serious'
};
const WEATHER_OF = {
  drought:'Sun', 'orichalcum pulse':'Sun', 'desolate land':'Harsh Sunshine',
  drizzle:'Rain', 'primordial sea':'Heavy Rain',
  'sand stream':'Sand', 'snow warning':'Snow'
};
const ACTION_SEC = 6;          // simplifié : 75 actions dans 7 min 30
const EVENT_SEC = 4;           // animation d’une action scriptée
const KO_PENALTY_SEC = 100;    // = niveau de l’attaquant (Bulbapedia / Serebii) ; wikis JP : 60 s (incertitude notée)
const REVIVE_STEP = 5, REVIVE_MAX = 30;
const TIMER_DEFAULT = 450;     // 7 min 30
const TIMER_MEWTWO = 900;      // 15 min
const TERA_CHARGES = 3;
const SHIELD_DUR_7 = 0.35;     // atwiki (Lanssorien 35 %) ; défaut 7★ si non listé
const SHIELD_DUR_6 = 0.30;
const SHIELD_DUR_5 = 0.25;     // générique 5★, non listé par boss
const IN_FLOOR = 0.03;         // plancher de dégâts encaissés : 3 % des PV par action du boss
const TOP_N = 12;
const gen = Generations.get(9);

/** Normalise apostrophes typographiques pour aligner tera7 / moves.json et les CSV PokéAPI. */
function normFr(s) {
  return String(s || '').toLowerCase().replace(/[\u2018\u2019\u201B\u2032\u0060\u00B4']/g, "'");
}
function lookupFr(map, name) {
  if (!name || !map) return undefined;
  return map.get(normFr(name)) || map.get(String(name).toLowerCase());
}


const read = f => fs.readFileSync(f, 'utf8');
const exists = f => fs.existsSync(f) && fs.statSync(f).size > 0;
const J = f => JSON.parse(read(path.join(DATA, f)));

function parseCsvLine(line) {
  const out = []; let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}
function loadCsvMaps() {
  const csv = name => {
    const f = exists(path.join(CACHE, name)) ? path.join(CACHE, name) : path.join(CACHE7, name);
    return read(f).split(/\r?\n/);
  };
  const load = (file, idCol) => {
    const lines = csv(file);
    const head = parseCsvLine(lines[0]);
    const iId = head.indexOf(idCol), iLang = head.indexOf('local_language_id'), iName = head.indexOf('name');
    const en = new Map(), fr = new Map();
    for (const line of lines.slice(1)) {
      if (!line) continue;
      const cols = parseCsvLine(line);
      if (cols.length <= Math.max(iId, iLang, iName)) continue;
      if (cols[iLang] === '9') en.set(cols[iId], cols[iName]);
      if (cols[iLang] === '5') fr.set(cols[iId], cols[iName]);
    }
    const en2fr = new Map(), fr2en = new Map(), id2en = new Map();
    for (const [id, e] of en) {
      id2en.set(id, e);
      if (fr.has(id)) { en2fr.set(e.toLowerCase(), fr.get(id)); fr2en.set(normFr(fr.get(id)), e); }
    }
    return { en2fr, fr2en, id2en };
  };
  return { moves: load('move_names.csv', 'move_id'), ab: load('ability_names.csv', 'ability_id') };
}

function smogonName(e) {
  const en = e.en || '';
  const cands = [];
  const add = n => { if (n && !cands.includes(n)) cands.push(n); };
  add(en);
  const k = e.k || '';
  const rules = [
    [/^Hisuian (.+)$/, (_, x) => x + '-Hisui'],
    [/^Alolan (.+)$/, (_, x) => x + '-Alola'],
    [/^Galarian (.+)$/, (_, x) => x + '-Galar'],
    [/^Paldean (.+)$/, (_, x) => x + '-Paldea'],
  ];
  for (const [re, fn] of rules) if (re.test(en)) add(en.replace(re, fn));
  if (k.endsWith('-hisui')) add((en.replace(/^Hisuian /, '') || e.n) + '-Hisui');
  if (k.endsWith('-alola')) add((en.replace(/^Alolan /, '') || e.n) + '-Alola');
  if (k.endsWith('-galar')) add((en.replace(/^Galarian /, '') || e.n) + '-Galar');
  if (k.includes('paldea-combat')) add('Tauros-Paldea-Combat');
  if (k.includes('paldea-blaze')) add('Tauros-Paldea-Blaze');
  if (k.includes('paldea-aqua')) add('Tauros-Paldea-Aqua');
  if (k.endsWith('-therian')) add(en.replace(' Therian', '') + '-Therian');
  if (k.endsWith('-mega') || k.includes('-mega-')) return null;
  if (k.endsWith('-gmax') || k.endsWith('-primal')) return null;
  if (/-f$/.test(k) || /-female$/.test(k) || / female/i.test(en)) {
    add(en.replace(/ Female/i, '').replace(/ femelle/i, '') + '-F');
    add(en.split(' ')[0] + '-F');
    if (/Paragruel|Basculegion/i.test(en + (e.n || ''))) add('Basculegion-F');
  }
  if (k.includes('masterpiece') || /Masterpiece|Exceptionnelle/i.test(en + (e.n || ''))) add('Sinistcha-Masterpiece');
  if (k.includes('unremarkable')) add('Sinistcha');

  if (k.includes('bloodmoon') || /Bloodmoon|Lune Vermeille/i.test(en + e.n)) add('Ursaluna-Bloodmoon');
  if (k === '964' || /Palafin/.test(en)) { add('Palafin-Hero'); add('Palafin'); }
  if (k.includes('low-key')) add('Toxtricity-Low-Key');
  if (k.includes('amped')) add('Toxtricity');
  if (k.includes('dusk') && /Lycanroc|Lougaroc/i.test(en + e.n)) add('Lycanroc-Dusk');
  if (k.includes('midnight') && /Lycanroc|Lougaroc/i.test(en + e.n)) add('Lycanroc-Midnight');
  if (k.includes('dawn') || k.includes('icerider')) add('Calyrex-Ice');
  if (k.includes('shadowrider') || (k.includes('shadow') && /Calyrex/.test(en))) add('Calyrex-Shadow');
  if (k.includes('wellspring')) add('Ogerpon-Wellspring');
  if (k.includes('hearthflame')) add('Ogerpon-Hearthflame');
  if (k.includes('cornerstone')) add('Ogerpon-Cornerstone');
  if (k === '479-heat') add('Rotom-Heat');
  if (k === '479-wash') add('Rotom-Wash');
  if (k === '479-frost') add('Rotom-Frost');
  if (k === '479-fan') add('Rotom-Fan');
  if (k === '479-mow') add('Rotom-Mow');
  for (const n of cands) {
    try { new Pokemon(gen, n, { level: 100 }); return n; } catch {}
  }
  return null;
}

function typeEff(atk, defs) {
  const chart = gen.types;
  // use calc type chart via a dummy? simpler hard 18x18 is risky.
  // Pokemon + Struggle is heavy. Use @smogon/calc TYPE_CHART
  return null;
}

const { TYPE_CHART } = require('@smogon/calc');
function effectiveness(moveType, defTypes) {
  const chart = TYPE_CHART[9] || TYPE_CHART[8];
  const row = chart[TYPE_CAP[moveType] || moveType];
  if (!row) return 1;
  let m = 1;
  for (const t of defTypes) {
    const v = row[TYPE_CAP[t] || t];
    if (v === 0) return 0;
    if (typeof v === 'number') m *= v;
  }
  return m;
}

function learnIds(f) {
  const lm = f.lm || {};
  const order = ['svdisk', 'svmask', 'sv', 'swcrown', 'swisle', 'sw'];
  const ids = new Set();
  for (const g of order) {
    if (lm[g] == null || !f.ls || !f.ls[lm[g]]) continue;
    const L = f.ls[lm[g]];
    for (const x of L.l || []) ids.add(x[0]);
    for (const x of L.m || []) ids.add(x);
    for (const x of L.e || []) ids.add(x);
    if (g.startsWith('sv') && ids.size) break;
  }
  if (!ids.size && f.ls && f.ls[0]) {
    const L = f.ls[0];
    for (const x of L.l || []) ids.add(x[0]);
    for (const x of L.m || []) ids.add(x);
    for (const x of L.e || []) ids.add(x);
  }
  return ids;
}

function damagingMoves(ids, moves, fr2en) {
  const out = [];
  for (const id of ids) {
    const row = moves[String(id)];
    if (!row) continue;
    const [fr, typ, cls, pow] = row;
    if (cls !== 'p' && cls !== 's') continue;
    if (!pow || pow < 1) continue;
    const en = lookupFr(fr2en, fr);
    if (!en) continue;
    // Capacités suicidaires : écartées (le KO de l’attaquant n’est pas une stratégie classée ici)
    if (/^(Explosion|Self-Destruct|Misty Explosion|Final Gambit|Memento)$/i.test(en) || /^(Explosion|Destruction|Explo-Brume)$/i.test(fr)) continue;
    out.push({ id: String(id), fr, en, typ, cls, pow });
  }
  return out;
}

function pickNature(cls) { return cls === 'p' ? 'Adamant' : 'Modest'; }

function avgDamage(result) {
  const d = result.damage;
  if (typeof d === 'number') return d;
  if (Array.isArray(d)) {
    if (Array.isArray(d[0])) {
      // multi-hit: sum averages of each hit
      return d.reduce((s, hit) => s + (hit.reduce((a, b) => a + b, 0) / hit.length), 0);
    }
    return d.reduce((a, b) => a + b, 0) / d.length;
  }
  return 0;
}

function moveTurns(en) {
  const two = /hyper beam|giga impact|blast burn|hydro cannon|frenzy plant|rock wrecker|roar of time|prismatic laser|eternabeam|meteor assault/i;
  if (two.test(en)) return 2;
  if (/solar beam|solar blade/i.test(en)) return 2; // no sun assumed unless field is sun — adjusted later
  return 1;
}

function isDoubleAfterHit(en) {
  return /^(Avalanche|Revenge|Payback)$/i.test(en);
}

const pokeCache = new Map();
function makePoke(name, opts) {
  // Don't cache if options vary a lot; cache base construction errors only
  return new Pokemon(gen, name, opts);
}

function calcDmg(atk, def, moveName, field, assumeHit) {
  try {
    const opts = assumeHit && isDoubleAfterHit(moveName) ? { overrides: { basePower: 120 } } : {};
    // Payback / Revenge / Avalanche base 60 doubles to 120
    const mv = new Move(gen, moveName, opts);
    const r = calculate(gen, atk, def, mv, field);
    return avgDamage(r);
  } catch {
    return 0;
  }
}
const SETUP = {
  'Belly Drum':     { atk: 6, hpCost: 0.5, fr: 'Cognobidon' },
  'Swords Dance':   { atk: 2, fr: 'Danse Lames' },
  'Nasty Plot':     { spa: 2, fr: 'Machination' },
  'Calm Mind':      { spa: 1, spd: 1, fr: 'Plénitude' },
  'Dragon Dance':   { atk: 1, spe: 1, fr: 'Danse Draco' },
  'Bulk Up':        { atk: 1, def: 1, fr: 'Gonflette' },
  'Curse':          { atk: 1, def: 1, spe: -1, fr: 'Malédiction', notGhost: true },
  'Coil':           { atk: 1, def: 1, fr: 'Enroulement' },
  'Work Up':        { atk: 1, spa: 1, fr: 'Rengorgement' },
  'Growth':         { atk: 1, spa: 1, sunAtk: 2, sunSpa: 2, fr: 'Croissance' },
  'Quiver Dance':   { spa: 1, spd: 1, spe: 1, fr: 'Papillodanse' },
  'Victory Dance':  { atk: 1, def: 1, spe: 1, fr: 'Danse Victoire' },
  'Tail Glow':      { spa: 3, fr: 'Lumi-Queue' },
  'Shell Smash':    { atk: 2, spa: 2, spe: 2, def: -1, spd: -1, fr: 'Exuviation' },
  'Iron Defense':   { def: 2, fr: 'Mur de Fer', bodyPress: true },
  'Acid Armor':     { def: 2, fr: 'Acidarmure', bodyPress: true },
  'Clangorous Soul':{ atk: 1, def: 1, spa: 1, spd: 1, spe: 1, hpCost: 1 / 3, fr: 'Dracacophonie' }
};

const BOSS_BOOSTS = {
  'Swords Dance': { atk: 2 }, 'Nasty Plot': { spa: 2 }, 'Calm Mind': { spa: 1, spd: 1 },
  'Dragon Dance': { atk: 1, spe: 1 }, 'Bulk Up': { atk: 1, def: 1 }, 'Coil': { atk: 1, def: 1 },
  'Work Up': { atk: 1, spa: 1 }, 'Growth': { atk: 1, spa: 1 }, 'Quiver Dance': { spa: 1, spd: 1, spe: 1 },
  'Victory Dance': { atk: 1, def: 1, spe: 1 }, 'Tail Glow': { spa: 3 }, 'Iron Defense': { def: 2 },
  'Amnesia': { spd: 2 }, 'Acid Armor': { def: 2 }, 'Cosmic Power': { def: 1, spd: 1 },
  'Curse': { atk: 1, def: 1, spe: -1 }, 'Agility': { spe: 2 }, 'Rock Polish': { spe: 2 },
  'Flame Charge': null, 'Trailblaze': null, 'Aqua Step': null
};

const HEAL_MOVES = new Set(['Recover','Slack Off','Soft-Boiled','Roost','Moonlight','Morning Sun','Synthesis','Shore Up','Heal Pulse','Life Dew','Milk Drink','Rest']);
const WEATHER_MOVES = { 'Sunny Day': 'Sun', 'Rain Dance': 'Rain', 'Sandstorm': 'Sand', 'Snowscape': 'Snow', 'Hail': 'Snow', 'Chilly Reception': 'Snow' };

function setupMoves(ids, moves, fr2en, types) {
  const out = [];
  const ghost = (types || []).includes('ghost');
  for (const id of ids) {
    const row = moves[String(id)];
    if (!row) continue;
    const [fr] = row;
    const en = lookupFr(fr2en, fr);
    if (!en || !SETUP[en]) continue;
    if (SETUP[en].notGhost && ghost) continue;
    out.push({ ...SETUP[en], id: String(id), fr, en });
  }
  return out;
}

function relevantSetups(setups, mv) {
  if (!setups || !setups.length) return [];
  const isBP = /^Body Press$/i.test(mv.en);
  const phys = mv.cls === 'p';
  const fit = setups.filter(s => {
    if (s.bodyPress) return isBP;
    if (s.atk && !s.spa) return phys;
    if (s.spa && !s.atk) return !phys;
    return true;
  });
  // Un seul boost : le plus fort pour la stat de l’attaque (évite de simuler 3 accumulations).
  const prioPhys = ['Belly Drum', 'Swords Dance', 'Shell Smash', 'Dragon Dance', 'Victory Dance', 'Bulk Up', 'Coil', 'Curse', 'Clangorous Soul', 'Work Up', 'Growth'];
  const prioSpec = ['Tail Glow', 'Nasty Plot', 'Shell Smash', 'Quiver Dance', 'Calm Mind', 'Clangorous Soul', 'Growth', 'Work Up'];
  const prioBP = ['Iron Defense', 'Acid Armor'];
  const prio = isBP ? prioBP : (phys ? prioPhys : prioSpec);
  for (const name of prio) {
    const hit = fit.find(s => s.en === name);
    if (hit) return [hit];
  }
  return fit.slice(0, 1);
}

function zeros() { return { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 }; }
function addBoosts(dst, src) {
  if (!src) return dst;
  for (const k of Object.keys(src)) {
    if (k === 'fr' || k === 'hpCost' || k === 'notGhost' || k === 'bodyPress' || k === 'en' || k === 'id' || k === 'sunAtk' || k === 'sunSpa') continue;
    if (typeof src[k] === 'number') dst[k] = Math.max(-6, Math.min(6, (dst[k] || 0) + src[k]));
  }
  return dst;
}

function fieldOf(weather, abilityEn) {
  const w = weather || WEATHER_OF[(abilityEn || '').toLowerCase()];
  return w ? new Field({ weather: w }) : new Field();
}

function applyGrowth(dst, weather) {
  const n = weather && /Sun|Sunshine/i.test(String(weather)) ? 2 : 1;
  dst.atk = Math.max(-6, Math.min(6, (dst.atk || 0) + n));
  dst.spa = Math.max(-6, Math.min(6, (dst.spa || 0) + n));
  return dst;
}

function healAmount(moveEn, weather, maxHP) {
  if (/^Rest$/i.test(moveEn)) return maxHP;
  if (/Moonlight|Morning Sun|Synthesis/i.test(moveEn)) {
    if (weather && /Sun|Sunshine/i.test(String(weather))) return Math.floor(maxHP * 2 / 3);
    if (weather && /Rain|Sand|Snow|Hail|Harsh/i.test(String(weather))) return Math.floor(maxHP / 4);
    return Math.floor(maxHP / 2);
  }
  if (/Shore Up/i.test(moveEn)) return Math.floor(maxHP * (weather && /Sand/i.test(String(weather)) ? 2 / 3 : 1 / 2));
  if (HEAL_MOVES.has(moveEn)) return Math.floor(maxHP / 2);
  return 0;
}

function shieldRate(moveType, teraOn, bossTera, rates) {
  const [std, tera, match] = rates;
  if (!teraOn) return std;
  return effectiveness(moveType, [bossTera]) >= 2 ? match : tera;
}

function pokeWithBoosts(base, boosts) {
  const p = base.clone();
  p.boosts = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0, ...(boosts || {}) };
  return p;
}

function parseRaidScripts() {
  const dir = exists(CACHE7) ? CACHE7 : CACHE;
  const map = new Map();
  if (!exists(dir)) return map;
  const strip = s => String(s || '')
    .replace(/<br\s*\/?>/gi, ' | ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&star;/g, '')
    .replace(/&eacute;/gi, 'é').replace(/&amp;/g, '&')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ').trim();

  for (const fn of fs.readdirSync(dir).filter(f => f.startsWith('serebii-event-') && f.endsWith('.html'))) {
    const t = fs.readFileSync(path.join(dir, fn), 'latin1');
    const chunks = t.split(/<td class="pkmn"/i).slice(1);
    const header = ((t.match(/<h1>Event Raid\s*-\s*([^<]+)/i) || [])[1] || fn).toLowerCase();
    for (const ch of chunks) {
      const stars = (ch.match(/&star;/g) || []).length;
      if (stars !== 7) continue;
      const href = ((ch.match(/href="\/pokedex-sv\/([^"]+)"/i) || [])[1] || '').replace(/-h$/, '-hisui');
      const teraM = (ch.match(/teraicon\/([a-z]+)\.png/i) || [])[1] || '';
      const notes = strip(((ch.match(/Notes([\s\S]*?)(?:Scripted Actions|Base Item|<\/table>)/i) || [])[1] || ''));
      const iScr = ch.search(/Scripted Actions/i);
      const scriptTxt = iScr >= 0 ? strip(ch.slice(iScr, iScr + 2800)) : '';
      const hpMult = +((notes.match(/HP multiplier:\s*\*?(\d+(?:\.\d+)?)/i) || [])[1] || 0);
      const sh = notes.match(/Shield Damage:\s*(\d+)\s*%\s*Std,\s*(\d+)\s*%\s*Tera,\s*(\d+)\s*%\s*Matching/i);
      const rates = sh ? [+sh[1] / 100, +sh[2] / 100, +sh[3] / 100] : [0.20, 0.30, 0.70];
      const evs = {};
      const evm = notes.match(/EVs:\s*([^|<]+)/i);
      if (evm) {
        const trans = { 'hp': 'hp', 'attack': 'atk', 'defense': 'def', 'sp. atk': 'spa', 'sp. def': 'spd', 'speed': 'spe', 'special attack': 'spa', 'special defense': 'spd' };
        for (const part of evm[1].split(',')) {
          const m = part.trim().match(/(\d+)\s+(.+)/);
          if (!m) continue;
          const k = trans[m[2].trim().toLowerCase()];
          if (k) evs[k] = +m[1];
        }
      }
      const events = [];
      const sm = scriptTxt.match(/Shield Activation\s+(\d+)%\s+HP Remaining(?:\s*\|\s*)?(\d+)%\s+Time Remaining/i);
      if (sm) events.push({ kind: 'shield', hp: +sm[1], time: +sm[2] });
      const reEvt = /(?:\bPlayer Stats & Status Reset|([A-Za-z][A-Za-z0-9' \-]*?) Stats & Status Reset|Reduce Tera Orb Charge|([A-Za-z][A-Za-z0-9' \-]*?) uses ([A-Za-z][A-Za-z0-9' \-]*?))\s+(\d+)%\s+(Time|HP) Remaining/gi;
      let m;
      const used = new Set();
      while ((m = reEvt.exec(scriptTxt))) {
        const span = m[0].trim();
        if (used.has(m.index)) continue;
        used.add(m.index);
        const pct = +m[4];
        const key = m[5].toLowerCase() === 'time' ? 'time' : 'hp';
        const who = (m[1] || '').trim().toLowerCase();
        if (/^Player Stats/i.test(span) || who === 'player') {
          events.push({ kind: 'playerReset', [key]: pct });
        } else if (/Reduce Tera Orb Charge/i.test(span)) {
          events.push({ kind: 'teraCharge', [key]: pct });
        } else if (m[1] && /Stats & Status Reset/i.test(span)) {
          events.push({ kind: 'bossReset', [key]: pct });
        } else if (m[2] && m[3]) {
          events.push({ kind: 'bossMove', name: m[3].trim(), [key]: pct });
        }
      }
      const rec = {
        hpMult, rates, evs: Object.keys(evs).length ? evs : null,
        events, durability: SHIELD_DUR_7, src: 'Serebii (Scripted Actions / Notes)'
      };
      const species = (href || header).toLowerCase().replace(/\.html$/, '');
      if (teraM) {
        map.set(species + '|' + teraM, rec);
        map.set((species.split('-')[0]) + '|' + teraM, rec);
      }
      map.set(species, rec);
    }
  }
  return map;
}

function generic7() {
  return {
    rates: [0.20, 0.30, 0.70], durability: SHIELD_DUR_7, evs: null, hpMult: 0,
    events: [
      { kind: 'shield', hp: 80, time: 80 },
      { kind: 'playerReset', time: 80 },
      { kind: 'bossReset', hp: 50 }
    ],
    src: 'script générique 7★ (données Serebii indisponibles) : bouclier à 80 % des PV ou 80 % du chrono, annulation des boosts du joueur à 80 % du chrono, reset du boss à 50 % des PV, durabilité 35 %.'
  };
}

function generic6(game) {
  const base = {
    evs: null, hpMult: 0, durability: SHIELD_DUR_6,
    events: [],
    src: ''
  };
  if (game === 'svmask') {
    return { ...base, rates: [0.30, 0.55, 0.85], events: [
      { kind: 'shield', hp: 60, time: 40 },
      { kind: 'playerReset', time: 60 }
    ], src: 'script générique 6★ Septentria (Kitakami) : bouclier 30 / 55 / 85, seuil 60 % PV ou 40 % du chrono (atwiki / Bulbapedia) ; une annulation des boosts du joueur à 60 % du chrono (hypothèse, non listée par boss).' };
  }
  if (game === 'svdisk') {
    return { ...base, rates: [0.40, 0.60, 0.80], events: [
      { kind: 'shield', hp: 60, time: 30 },
      { kind: 'playerReset', time: 60 }
    ], src: 'script générique 6★ Terra-Dôme (Blueberry) : bouclier 40 / 60 / 80 (Bulbapedia), seuil 60 % PV ou 30 % du chrono ; une annulation des boosts du joueur à 60 % du chrono (hypothèse, non listée par boss).' };
  }
  return { ...base, rates: [0.20, 0.35, 0.75], events: [
    { kind: 'shield', hp: 60, time: 55 },
    { kind: 'playerReset', time: 60 }
  ], src: 'script générique 6★ Paldea : bouclier 20 / 35 / 75, seuil 60 % PV ou 55 % du chrono (atwiki / Bulbapedia) ; une annulation des boosts du joueur à 60 % du chrono (hypothèse, non listée par boss).' };
}

function generic5(game) {
  const base = {
    evs: null, hpMult: 0, durability: SHIELD_DUR_5,
    events: [],
    src: ''
  };
  if (game === 'svmask') {
    return { ...base, rates: [0.30, 0.60, 0.90], events: [
      { kind: 'shield', hp: 60, time: 50 },
      { kind: 'playerReset', time: 60 }
    ], src: 'script générique 5★ Septentria (Kitakami) : bouclier 30 / 60 / 90 (Bulbapedia / wikiwiki) ; seuil typique 60 % PV ou 50 % du chrono ; une annulation des boosts du joueur à 60 % du chrono (hypothèse, non listée par boss).' };
  }
  if (game === 'svdisk') {
    return { ...base, rates: [0.20, 0.35, 0.75], events: [
      { kind: 'shield', hp: 60, time: 50 },
      { kind: 'playerReset', time: 60 }
    ], src: 'script générique 5★ Terra-Dôme (Blueberry) : bouclier 20 / 35 / 75, comme Paldea 5★ (Bulbapedia / wikiwiki) ; seuil typique 60 % PV ou 50 % du chrono ; une annulation des boosts du joueur à 60 % du chrono (hypothèse, non listée par boss).' };
  }
  return { ...base, rates: [0.20, 0.35, 0.75], events: [
    { kind: 'shield', hp: 60, time: 55 },
    { kind: 'playerReset', time: 60 }
  ], src: 'script générique 5★ Paldea : bouclier 20 / 35 / 75 (comme Paldea 6★, Bulbapedia / wikiwiki) ; seuil typique 60 % PV ou 55 % du chrono ; une annulation des boosts du joueur à 60 % du chrono (hypothèse, non listée par boss).' };
}

function lookupScript(scripts, smo, tera) {
  const slug = String(smo || '').toLowerCase().replace(/ /g, '');
  const base = slug.split('-')[0];
  return scripts.get(slug + '|' + tera) || scripts.get(base + '|' + tera) || scripts.get(slug) || scripts.get(base) || null;
}

function parseHpMults() {
  const dir = exists(CACHE7) ? CACHE7 : CACHE;
  const map = new Map();
  if (!exists(dir)) return map;
  for (const fn of fs.readdirSync(dir).filter(f => f.startsWith('serebii-event-') && f.endsWith('.html'))) {
    const t = fs.readFileSync(path.join(dir, fn), 'latin1');
    const chunks = t.split(/<td class="pkmn"/i).slice(1);
    const header = (t.match(/<h1>Event Raid\s*-\s*([^<]+)/i) || [])[1] || '';
    for (const ch of chunks) {
      const stars = (ch.match(/&star;/g) || []).length;
      if (stars !== 7) continue;
      const mult = +((ch.match(/HP multiplier:\s*\*?(\d+(?:\.\d+)?)/i) || [])[1] || 0);
      const teraM = ch.match(/teraicon\/([a-z]+)\.png/i);
      const href = ((ch.match(/href="\/pokedex-sv\/([^"]+)"/i) || [])[1] || '').replace(/-h$/, '-hisui');
      if (mult) map.set((href || header) + '|' + (teraM ? teraM[1] : ''), mult);
    }
  }
  return map;
}

function simulateRaid({
  timeLimit, actionSec, ourMax, bossMax, rates, durability, events,
  unaware, outgoing, incoming, setup, floorIn, leftovers
}) {
  let t = 0, dealt = 0, taken = 0;
  let bossHP = bossMax, ourHP = ourMax;
  let shieldOn = false, shieldHP = 0, shieldUsed = false, stun = false;
  let charges = 0, teraOn = false;
  let ourB = zeros(), bossB = zeros();
  let setupDone = false;
  const nPlayerResets = (events || []).filter(e => e.kind === 'playerReset').length;
  let resetsFired = 0;
  let faints = 0, weather = null;
  const fired = new Set();
  const evs = (events || []).map((e, i) => ({ ...e, id: i }));

  const remaining = () => 100 * (1 - t / timeLimit);
  const hpPct = () => 100 * bossHP / bossMax;

  function faint() {
    faints++;
    t += KO_PENALTY_SEC + Math.min(REVIVE_STEP * faints, REVIVE_MAX);
    ourHP = ourMax;
    ourB = zeros();
  }

  function hitUs(raw, useFloor) {
    let dmg = Math.max(0, raw);
    if (useFloor) dmg = Math.max(dmg, ourMax * floorIn, 1);
    if (dmg <= 0) return;
    const x = Math.min(ourHP, dmg);
    ourHP -= x; taken += x;
    if (ourHP <= 0) faint();
  }

  function applyEvent(ev) {
    if (ev.kind === 'shield') {
      if (shieldUsed) return;
      shieldUsed = true;
      shieldOn = true;
      shieldHP = bossMax * durability;
      t += EVENT_SEC;
      return;
    }
    t += EVENT_SEC;
    if (ev.kind === 'playerReset') { ourB = zeros(); resetsFired++; return; }
    if (ev.kind === 'bossReset') { bossB = zeros(); return; }
    if (ev.kind === 'teraCharge') { if (!teraOn) charges = 0; return; }
    if (ev.kind === 'bossMove') {
      const name = ev.name;
      if (WEATHER_MOVES[name]) { weather = WEATHER_MOVES[name]; return; }
      if (HEAL_MOVES.has(name)) {
        bossHP = Math.min(bossMax, bossHP + healAmount(name, weather, bossMax));
        return;
      }
      if (name === 'Growth') { applyGrowth(bossB, weather); return; }
      if (BOSS_BOOSTS[name]) { addBoosts(bossB, BOSS_BOOSTS[name]); return; }
      if (/^Splash$/i.test(name)) return;
      const dmg = incoming({ teraOn, ourB, bossB, weather, moveName: name });
      hitUs(dmg, false);
    }
  }

  function fireEvents() {
    if (t >= timeLimit || bossHP <= 0) return;
    for (const ev of evs) {
      if (fired.has(ev.id)) continue;
      const timeHit = ev.time != null && remaining() <= ev.time;
      const hpHit = ev.hp != null && hpPct() <= ev.hp;
      if (ev.kind === 'shield') {
        if (timeHit || hpHit) { fired.add(ev.id); applyEvent(ev); }
        continue;
      }
      if (timeHit || hpHit) { fired.add(ev.id); applyEvent(ev); }
      if (t >= timeLimit || bossHP <= 0) return;
    }
  }

  function leftoversHeal() {
    if (leftovers && ourHP > 0) ourHP = Math.min(ourMax, ourHP + ourMax / 16);
  }

  function bossRegularHit() {
    if (stun) { stun = false; return; }
    const avg = incoming({ teraOn, ourB, bossB, weather, moveName: null });
    hitUs(avg, true);
  }

  function doAttack() {
    const d0 = outgoing({ teraOn, ourB, bossB, weather });
    let applied = Math.max(0, d0);
    if (shieldOn) {
      const rate = shieldRate(outgoing.moveType, teraOn, outgoing.bossTera, rates);
      applied = d0 * rate;
      shieldHP -= applied;
      if (shieldHP <= 0) {
        shieldOn = false;
        stun = true;
      }
    }
    bossHP -= applied;
    dealt += applied;
    if (applied > 0) charges++;
    return applied;
  }

  while (t < timeLimit && bossHP > 0) {
    fireEvents();
    if (t >= timeLimit || bossHP <= 0) break;

    if (!teraOn && charges >= TERA_CHARGES) teraOn = true;

    // Accumulation après la dernière annulation de stats du joueur prévue au script
    // (et seulement si le bouclier est baissé : une capacité de statut échoue pendant le bouclier).
    const canSetup = setup && resetsFired >= nPlayerResets && !setupDone && !unaware && !shieldOn;
    if (canSetup) {
      const cost = setup.hpCost ? ourMax * setup.hpCost : 0;
      if (ourHP > cost) {
        if (cost) ourHP -= cost;
        if (setup.en === 'Growth') applyGrowth(ourB, weather);
        else addBoosts(ourB, setup);
        setupDone = true;
        leftoversHeal();
        t += actionSec;
        if (bossHP > 0 && t < timeLimit) { fireEvents(); if (t < timeLimit && bossHP > 0) bossRegularHit(); }
        continue;
      }
    }

    const turns = outgoing.turns({ weather, teraOn });
    doAttack();
    leftoversHeal();
    t += actionSec * turns;
    if (bossHP > 0 && t < timeLimit) { fireEvents(); if (t < timeLimit && bossHP > 0) bossRegularHit(); }
  }

  const takenSafe = Math.max(taken, 1);
  return { score: dealt * dealt / takenSafe, dealt, taken, t, win: bossHP <= 0, setupDone };
}

export function buildRankSvRaids(opts = {}) {
  const only7 = opts.only7 ?? ONLY7;
  const only5 = opts.only5 ?? ONLY5;
  const maps = loadCsvMaps();
  const core = J('core.json');
  const evo = J('evo.json');
  const movesJ = J('moves.json');
  const ref = J('ref.json');
  const tera7 = J('tera7.json');
  const raids = J('raids.json');

  const byKey = new Map(core.e.map(e => [e.k, e]));
  const evolves = new Set(evo.map(x => x[0]));
  const spCache = new Map();
  const loadSp = id => {
    const k = String(id);
    if (spCache.has(k)) return spCache.get(k);
    const f = path.join(DATA, 'sp', `${parseInt(k, 10)}.json`);
    const j = exists(f) ? JSON.parse(read(f)) : null;
    spCache.set(k, j);
    return j;
  };
  const formOf = k => {
    const sp = loadSp(k);
    return sp && sp.f && sp.f[k] ? sp.f[k] : null;
  };
  const inSV = f => {
    const av = f.av || [];
    return av.includes('sv') || av.includes('svmask') || av.includes('svdisk');
  };

  const attackers = [];
  const unmapped = [];
  for (const e of core.e) {
    if (e.c === 'mega' || e.c === 'gmax' || e.c === 'primal' || e.c === 'totem') continue;
    if (String(e.k).includes('-mega') || String(e.k).endsWith('-gmax')) continue;
    if (evolves.has(e.k)) continue;
    const f = formOf(e.k);
    if (!f || !inSV(f)) continue;
    const smo = smogonName(e);
    if (!smo) { unmapped.push(e.k + ' ' + (e.en || e.n)); continue; }
    const ids = learnIds(f);
    const mvs = damagingMoves(ids, movesJ, maps.moves.fr2en);
    const setups = setupMoves(ids, movesJ, maps.moves.fr2en, e.t || f.t);
    const hasTeraBlast = ids.has(851) || ids.has('851');
    if (!mvs.length && !hasTeraBlast) continue;
    const abs = [];
    for (const [aid] of (f.a || [])) {
      const fr = (ref.ab[String(aid)] || [])[0];
      const en = fr && lookupFr(maps.ab.fr2en, fr);
      if (en) abs.push(en);
    }
    if (!abs.length) abs.push('(no ability)');
    const legend = !!(e.lg || e.my);
    attackers.push({ k: e.k, n: e.n, en: e.en, smo, types: e.t || f.t, moves: mvs, setups, abilities: abs, legend, stats: f.s || e.s, hasTeraBlast });
  }

  const DEFENSIVE_ABILITIES = new Set([
    'bulletproof', 'well-baked body', 'water absorb', 'volt absorb', 'lightning rod',
    'storm drain', 'dry skin', 'motor drive', 'sap sipper', 'earth eater', 'levitate',
    'heatproof', 'thick fat', 'filter', 'solid rock', 'prism armor', 'multiscale',
    'fur coat', 'fluffy', 'wonder guard', 'good as gold', 'purifying salt', 'soundproof',
    'overcoat', 'magic guard', 'flash fire', 'wind rider', 'telepathy', 'friend guard',
    'immunity', 'vital spirit', 'insomnia', 'inner focus', 'keen eye', 'clear body',
    'white smoke', 'full metal body', 'hyper cutter', 'big pecks', 'damp', 'oblivious',
    'own tempo', 'stench', 'illuminate', 'run away', 'plus', 'minus', 'anticipation',
    'forewarn', 'frisk', 'pickup', 'honey gather', 'shed skin', 'natural cure',
    'hydration', 'healer', 'triage', 'regenerator', 'poison heal', 'ice face',
    'disguise', 'battle armor', 'shell armor', 'sturdy', 'dazzling', 'queenly majesty',
    "armor tail", "good as gold", "sentry", "guard dog", "mind's eye", "tera shell",
    'embody aspect', 'hospitality', 'flower veil', 'sweet veil', 'aroma veil',
    'pastel veil', 'culinary', 'lingering aroma'
  ]);
  const IMMUNITY_ABILITIES = new Set([
    'bulletproof', 'well-baked body', 'water absorb', 'volt absorb', 'lightning rod',
    'storm drain', 'dry skin', 'motor drive', 'sap sipper', 'earth eater', 'levitate',
    'flash fire', 'wonder guard', 'good as gold', 'wind rider', 'soundproof',
    'purifying salt'
  ]);
  function offensiveAbilities(abs) {
    const all = abs && abs.length ? abs : ['(no ability)'];
    const off = all.filter(a => !DEFENSIVE_ABILITIES.has(String(a).toLowerCase()));
    if (off.length) return off;
    const noImm = all.filter(a => !IMMUNITY_ABILITIES.has(String(a).toLowerCase()));
    return noImm.length ? noImm : all;
  }

  function bossPokemon(smo, { level, nature, ability, tera, evs }) {
    return makePoke(smo, {
      level,
      nature: nature || 'Serious',
      evs: evs || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      ability: ability || undefined,
      teraType: TYPE_CAP[tera] || tera
    });
  }

  const dmgCache = new Map();
  function boostKey(p) {
    const b = p.boosts || {};
    return (b.atk||0) + ',' + (b.def||0) + ',' + (b.spa||0) + ',' + (b.spd||0) + ',' + (b.spe||0);
  }
  function cachedDmg(atk, def, moveName, field, assumeHit) {
    const key = atk.name + '|' + (atk.teraType || '') + '|' + boostKey(atk) + '|' + def.name + '|' + (def.teraType || '') + '|' + boostKey(def) + '|' + moveName + '|' + (field.weather || '') + '|' + assumeHit;
    if (dmgCache.has(key)) return dmgCache.get(key);
    const v = calcDmg(atk, def, moveName, field, assumeHit);
    dmgCache.set(key, v);
    return v;
  }

  function rankAgainst(atk, bossPoke, ctx) {
    const { bossTera, bossMoves, script, timeLimit, unaware } = ctx;
    let bestD = null, bestA = null;
    const abs = offensiveAbilities(atk.abilities);
    for (const abil of abs) {
      const scored = atk.moves.map(m => {
        const stab = atk.types.includes(m.typ) ? 1.5 : 1;
        const eff = effectiveness(m.typ, [bossTera]);
        return { m, est: m.pow * stab * (eff || 0.01) };
      }).sort((a, b) => b.est - a.est);
      const cands = [];
      const seen = new Set();
      for (const x of scored) {
        if (cands.length >= (ctx.stars === 6 || ctx.stars === 5 ? 4 : 6)) break;
        if (seen.has(x.m.en + '|' + x.m.typ)) continue;
        if (x.est <= 0 && cands.length) continue;
        seen.add(x.m.en + '|' + x.m.typ); cands.push(x.m);
      }
      if (atk.hasTeraBlast) {
        const seTypes = TYPES.filter(t => effectiveness(t, [bossTera]) >= 2);
        const tbTypes = seTypes.length ? seTypes : [bossTera];
        const spa = (atk.stats || [])[3] || 0, atkS = (atk.stats || [])[1] || 0;
        const cls = atkS > spa ? 'p' : 's';
        for (const typ of tbTypes) {
          const key = 'Tera Blast|' + typ;
          if (seen.has(key)) continue;
          seen.add(key);
          cands.push({ id: '851', fr: 'Téra Explosion', en: 'Tera Blast', typ, cls, pow: 80, teraBlast: true });
        }
      }
      for (const mv of cands) {
        const nature = pickNature(mv.cls);
        const evs = mv.cls === 'p' ? { hp: 252, atk: 252 } : { hp: 252, spa: 252 };
        const ivs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
        const teraCap = TYPE_CAP[mv.typ];
        let pokePre, pokeTera, ourMax;
        try {
          const full = makePoke(atk.smo, { level: 100, nature, evs, ivs, ability: abil === '(no ability)' ? undefined : abil, item: 'Leftovers' });
          ourMax = full.maxHP();
          pokePre = makePoke(atk.smo, { level: 100, nature, evs, ivs, ability: abil === '(no ability)' ? undefined : abil, item: 'Leftovers', curHP: Math.max(1, ourMax - 1) });
          pokeTera = makePoke(atk.smo, { level: 100, nature, evs, ivs, ability: abil === '(no ability)' ? undefined : abil, item: 'Leftovers', teraType: teraCap, curHP: Math.max(1, ourMax - 1) });
        } catch { continue; }

        const outgoingFn = ({ teraOn, ourB, bossB, weather }) => {
          const atkP = pokeWithBoosts(teraOn ? pokeTera : pokePre, ourB);
          const defP = pokeWithBoosts(bossPoke, bossB);
          return cachedDmg(atkP, defP, mv.en, fieldOf(weather, abil), true);
        };
        outgoingFn.moveType = mv.typ;
        outgoingFn.bossTera = bossTera;
        outgoingFn.turns = ({ weather }) => {
          let n = moveTurns(mv.en);
          if (/solar beam|solar blade/i.test(mv.en) && weather && /Sun|Sunshine/i.test(String(weather))) n = 1;
          return n;
        };

        const incomingFn = ({ teraOn, ourB, bossB, weather, moveName }) => {
          const defP = pokeWithBoosts(teraOn ? pokeTera : pokePre, ourB);
          const atkP = pokeWithBoosts(bossPoke, bossB);
          const field = fieldOf(weather, abil);
          if (moveName) return Math.max(0, cachedDmg(atkP, defP, moveName, field, false));
          if (!bossMoves.length) return 0;
          let inc = 0, n = 0;
          for (const bm of bossMoves) {
            inc += Math.max(0, cachedDmg(atkP, defP, bm.en, field, false));
            n++;
          }
          return n ? inc / n : 0;
        };

        const common = {
          timeLimit, actionSec: ACTION_SEC, ourMax,
          bossMax: ctx.bossMax, rates: script.rates, durability: script.durability,
          events: script.events, unaware, outgoing: outgoingFn, incoming: incomingFn,
          floorIn: IN_FLOOR, leftovers: true
        };

        const scD = simulateRaid({ ...common, setup: null });
        if (scD.dealt > 0 && (!bestD || scD.score > bestD.sc.score)) bestD = { mv, abil, nature, tera: mv.typ, sc: scD, setup: null };

        if (!unaware) {
          for (const su of relevantSetups(atk.setups, mv)) {
            const scA = simulateRaid({ ...common, setup: su });
            if (scA.dealt > 0 && (!bestA || scA.score > bestA.sc.score)) bestA = { mv, abil, nature, tera: mv.typ, sc: scA, setup: su };
          }
        }
      }
    }
    if (!bestA && bestD) bestA = bestD;
    return { direct: bestD, setup: bestA };
  }

  const hpMults = parseHpMults();
  const scripts = parseRaidScripts();
  const bosses = [];

  if (!only5) {
  for (const r of tera7.raids) {
    const e = byKey.get(r.k);
    if (!e) continue;
    const smo = smogonName(e);
    if (!smo) { unmapped.push('boss7 ' + r.k); continue; }
    const nat = NATURE_EN[r.nature] || 'Serious';
    const abil = r.talent && lookupFr(maps.ab.fr2en, r.talent);
    const moveEns = [];
    for (const fr of [...(r.moves || []), ...(r.raidMoves || [])]) {
      const en = lookupFr(maps.moves.fr2en, fr);
      if (!en) continue;
      const row = Object.values(movesJ).find(x => x[0] === fr || normFr(x[0]) === normFr(fr));
      if (row && (row[2] === 'p' || row[2] === 's') && row[3] >= 1) moveEns.push({ fr, en, typ: row[1], cls: row[2], pow: row[3] });
    }
    const listed = [...(r.moves || []), ...(r.raidMoves || [])];
    const missed = listed.filter(fr => {
      const en = lookupFr(maps.moves.fr2en, fr);
      const row = Object.values(movesJ).find(x => x[0] === fr || normFr(x[0]) === normFr(fr));
      return (row && (row[2] === 'p' || row[2] === 's') && row[3] >= 1) && !moveEns.some(m => normFr(m.fr) === normFr(fr));
    });
    if (missed.length) console.warn('capacités non mappées', r.id, missed);
    let mult = 35;
    for (const [k, v] of hpMults) {
      if (k.split('|')[1] === r.tera && k.toLowerCase().includes(smo.split('-')[0].toLowerCase().replace(/ /g, ''))) { mult = v; break; }
    }
    const found = lookupScript(scripts, smo, r.tera);
    const script = found ? { ...generic7(), ...found, events: found.events && found.events.length ? found.events.slice() : generic7().events } : generic7();
    if (!script.events.some(e => e.kind === 'shield')) script.events = [{ kind: 'shield', hp: 80, time: 80 }, ...script.events];
    if (script.hpMult) mult = script.hpMult;
    const timer = /mewtwo/i.test(smo) ? TIMER_MEWTWO : TIMER_DEFAULT;
    bosses.push({
      id: r.id, k: r.k, n: r.n, stars: 7, tera: r.tera, game: 'sv', title: r.title || '',
      smo, level: r.lv || 100, nature: nat, ability: abil, moves: moveEns, hpMult: mult,
      script, timer, evs: script.evs || null
    });
  }
  } // 7★

  if (!only7 && !only5) {
    const seen = new Set();
    for (const row of raids.r) {
      const g = raids.g[row[1]];
      if (!['sv', 'svmask', 'svdisk'].includes(g)) continue;
      if (!(row[5] & (1 << 5))) continue;
      const k = row[0];
      if (seen.has(k)) continue;
      seen.add(k);
      const e = byKey.get(k);
      const f = formOf(k);
      if (!e || !f) continue;
      const smo = smogonName(e);
      if (!smo) { unmapped.push('boss6 ' + k); continue; }
      const extra = raids.x[row[7]] || '';
      const ids = learnIds(f);
      let mvs = damagingMoves(ids, movesJ, maps.moves.fr2en);
      mvs = mvs.map(m => ({ ...m, est: m.pow * ((e.t || f.t || []).includes(m.typ) ? 1.5 : 1) }))
        .sort((a, b) => b.est - a.est);
      const uniq = [];
      const have = new Set();
      for (const m of mvs) { if (have.has(m.en)) continue; have.add(m.en); uniq.push(m); if (uniq.length >= 4) break; }
      const spa = (f.s || e.s || [])[3] || 0, atk = (f.s || e.s || [])[1] || 0;
      const nature = spa > atk ? 'Modest' : 'Adamant';
      let ability;
      const abs = f.a || [];
      const pick = /talent caché garanti/i.test(extra) ? (abs.find(a => a[1]) || abs[0]) : (abs.find(a => !a[1]) || abs[0]);
      if (pick) {
        const fr = (ref.ab[String(pick[0])] || [])[0];
        ability = fr && lookupFr(maps.ab.fr2en, fr);
      }
      const defaultTera = (e.t || f.t || ['normal'])[0];
      const random = !/Téra par défaut/i.test(extra);
      bosses.push({
        id: k + '-6', k, n: e.n, stars: 6, tera: random ? '*' : defaultTera, game: g, title: '',
        smo, level: 90, nature, ability, moves: uniq, hpMult: 20,
        script: generic6(g), timer: TIMER_DEFAULT, evs: null, random, defaultTera
      });
    }
  }

  if (only5) {
    const seen = new Set();
    for (const row of raids.r) {
      const g = raids.g[row[1]];
      if (!['sv', 'svmask', 'svdisk'].includes(g)) continue;
      if (!(row[5] & (1 << 4))) continue;
      const k = row[0];
      if (seen.has(k)) continue;
      seen.add(k);
      const e = byKey.get(k);
      const f = formOf(k);
      if (!e || !f) continue;
      const smo = smogonName(e);
      if (!smo) { unmapped.push('boss5 ' + k); continue; }
      const extra = raids.x[row[7]] || '';
      const ids = learnIds(f);
      let mvs = damagingMoves(ids, movesJ, maps.moves.fr2en);
      mvs = mvs.map(m => ({ ...m, est: m.pow * ((e.t || f.t || []).includes(m.typ) ? 1.5 : 1) }))
        .sort((a, b) => b.est - a.est);
      const uniq = [];
      const have = new Set();
      for (const m of mvs) { if (have.has(m.en)) continue; have.add(m.en); uniq.push(m); if (uniq.length >= 4) break; }
      const spa = (f.s || e.s || [])[3] || 0, atk = (f.s || e.s || [])[1] || 0;
      const nature = spa > atk ? 'Modest' : 'Adamant';
      let ability;
      const abs = f.a || [];
      const pick = /talent caché garanti/i.test(extra) ? (abs.find(a => a[1]) || abs[0]) : (abs.find(a => !a[1]) || abs[0]);
      if (pick) {
        const fr = (ref.ab[String(pick[0])] || [])[0];
        ability = fr && lookupFr(maps.ab.fr2en, fr);
      }
      const defaultTera = (e.t || f.t || ['normal'])[0];
      const random = !/Téra par défaut/i.test(extra);
      bosses.push({
        id: k + '-5', k, n: e.n, stars: 5, tera: random ? '*' : defaultTera, game: g, title: '',
        smo, level: 75, nature, ability, moves: uniq, hpMult: 15,
        script: generic5(g), timer: TIMER_DEFAULT, evs: null, random, defaultTera
      });
    }
  }

  if (ONLY_KEYS.length) {
    const keep = new Set(ONLY_KEYS);
    for (let i = bosses.length - 1; i >= 0; i--) if (!keep.has(bosses[i].k) && !keep.has(bosses[i].id)) bosses.splice(i, 1);
  }

  const F = [], fI = new Map();
  const fi = k => fI.has(k) ? fI.get(k) : (fI.set(k, F.length), F.push(k), F.length - 1);
  const mv = [], mvfr = [], mvI = new Map();
  const mi = (en, fr) => {
    if (mvI.has(en)) return mvI.get(en);
    mvI.set(en, mv.length); mv.push(en); mvfr.push(fr || en); return mv.length - 1;
  };

  const P = {}, PL = {};
  const t0 = Date.now();
  let nCalcBoss = 0;
  for (const b of bosses) {
    if (process.env.DEBUG_BOSS && String(b.k) !== String(process.env.DEBUG_BOSS) && String(b.id) !== String(process.env.DEBUG_BOSS)) continue;
    const teras = b.stars === 7 ? [b.tera] : (b.random ? TYPES : [b.defaultTera || b.tera]);
    const unaware = (b.ability || '').toLowerCase() === 'unaware';
    const slot = {}, slotL = {};
    for (const tera of teras) {
      let bossPoke, bossMax;
      try {
        bossPoke = bossPokemon(b.smo, { level: b.level, nature: b.nature, ability: b.ability, tera, evs: b.evs });
        bossMax = bossPoke.maxHP() * (b.hpMult || 1);
      } catch (e) {
        console.warn('boss skip', b.id, b.smo, e.message);
        continue;
      }
      const rowsD = [], rowsDL = [], rowsA = [], rowsAL = [];
      let pool = attackers;
      if ((b.stars === 6 || b.stars === 5) && attackers.length > 90) {
        const est = attackers.map(atk => {
          const spa = (atk.stats || [])[3] || 80, atkS = (atk.stats || [])[1] || 80, hp = (atk.stats || [])[0] || 80;
          const off = Math.max(spa, atkS);
          let bestM = 0;
          for (const m of atk.moves) {
            const stab = (atk.types || []).includes(m.typ) ? 1.5 : 1;
            const eff = effectiveness(m.typ, [tera]) || 0;
            bestM = Math.max(bestM, m.pow * stab * (eff >= 1 ? eff : 0.25));
          }
          if (atk.hasTeraBlast) bestM = Math.max(bestM, 80 * 1.5 * Math.max(effectiveness('fairy', [tera]), effectiveness('fighting', [tera]), 1));
          return { atk, e: off * bestM * (hp / 80) };
        }).sort((a, b) => b.e - a.e);
        const keep = new Set();
        for (const x of est) { if (keep.size >= 80 && x.atk.legend) continue; if (keep.size >= 90) break; keep.add(x.atk); }
        pool = [...keep];
      }
      dmgCache.clear();
      const ctx = { bossTera: tera, bossMoves: b.moves, script: b.script, timeLimit: b.timer, unaware, bossMax, stars: b.stars };
      for (const atk of pool) {
        const { direct, setup } = rankAgainst(atk, bossPoke, ctx);
        if (direct) {
          const rec = { k: atk.k, legend: atk.legend, mv: direct.mv, tera: direct.tera, score: direct.sc.score };
          rowsDL.push(rec);
          if (!atk.legend) rowsD.push(rec);
        }
        if (setup) {
          const rec = { k: atk.k, legend: atk.legend, mv: setup.mv, tera: setup.tera, score: setup.sc.score, setup: setup.setup };
          rowsAL.push(rec);
          if (!atk.legend) rowsA.push(rec);
        }
      }
      const pack = L => {
        L.sort((a, b) => b.score - a.score);
        const top = L[0] ? L[0].score : 1;
        return L.slice(0, TOP_N).map(r => {
          const row = [fi(r.k), mi(r.mv.en, r.mv.fr), r.tera, Math.round(r.score / top * 1000) / 10];
          if (r.setup && r.setup.en) row.push(mi(r.setup.en, r.setup.fr));
          return row;
        });
      };
      slot[tera] = { d: pack(rowsD), a: pack(rowsA) };
      slotL[tera] = { d: pack(rowsDL), a: pack(rowsAL) };
    }
    P[b.id] = slot;
    PL[b.id] = slotL;
    nCalcBoss++;
    if (nCalcBoss % 5 === 0) console.log('  ', nCalcBoss, '/', bosses.length, b.n, ((Date.now() - t0) / 1000).toFixed(1) + 's');
  }

  const B = bosses.filter(b => P[b.id]).map(b => [b.id, b.k, b.n, b.stars, b.tera, b.game, b.title || '']);
  let outB = B, outP = P, outPL = PL, outF = F, outMv = mv, outMvfr = mvfr;
  const prev = exists(OUT) ? JSON.parse(read(OUT)) : null;
  if (prev) {
    const nF = [], fMap = new Map(), nMv = [], nFr = [], mMap = new Map();
    const addF = k => { if (fMap.has(k)) return fMap.get(k); fMap.set(k, nF.length); nF.push(k); return nF.length - 1; };
    const addM = (en, fr) => { if (mMap.has(en)) return mMap.get(en); mMap.set(en, nMv.length); nMv.push(en); nFr.push(fr || en); return nMv.length - 1; };
    const mapRow = (r, srcF, srcMv, srcFr) => {
      const out = [addF(srcF[r[0]]), addM(srcMv[r[1]], (srcFr || [])[r[1]]), r[2], r[3]];
      if (r.length > 4 && r[4] != null) {
        if (typeof r[4] === 'number') out.push(addM(srcMv[r[4]], (srcFr || [])[r[4]]));
        else out.push(r[4]);
      }
      return out;
    };
    const remap = (table, srcF, srcMv, srcFr) => {
      const out = {};
      for (const [id, teras] of Object.entries(table || {})) {
        out[id] = {};
        for (const [tt, cell] of Object.entries(teras || {})) {
          if (Array.isArray(cell)) out[id][tt] = { d: cell.map(r => mapRow(r, srcF, srcMv, srcFr)), a: cell.map(r => mapRow(r, srcF, srcMv, srcFr)) };
          else out[id][tt] = {
            d: (cell.d || []).map(r => mapRow(r, srcF, srcMv, srcFr)),
            a: (cell.a || []).map(r => mapRow(r, srcF, srcMv, srcFr))
          };
        }
      }
      return out;
    };
    const newIds = new Set(B.map(row => row[0]));
    const keep = (prev.B || []).filter(row => !newIds.has(row[0]));
    const ids = new Set(keep.map(row => row[0]));
    const oldP = Object.fromEntries(Object.entries(prev.P || {}).filter(([id]) => ids.has(id)));
    const oldL = Object.fromEntries(Object.entries(prev.L || {}).filter(([id]) => ids.has(id)));
    outP = { ...remap(oldP, prev.F, prev.mv, prev.mvfr), ...remap(P, F, mv, mvfr) };
    outPL = { ...remap(oldL, prev.F, prev.mv, prev.mvfr), ...remap(PL, F, mv, mvfr) };
    outB = [...keep, ...B];
    outF = nF; outMv = nMv; outMvfr = nFr;
  }

  const data = {
    date: '2026-11-25',
    src: 'Calcul interne avec la formule officielle de dégâts (@smogon/calc, licence MIT). Scripts et multiplicateurs 7★ : Serebii (Scripted Actions / Notes). Seuils et multiplicateurs de bouclier 6★ : atwiki / Bulbapedia. Guides Game8 / communauté utilisés uniquement pour vérifier le haut de quelques classements.',
    method: 'Attaquant de niveau 100, IV 31, 252 EV PV et 252 EV dans sa meilleure stat offensive, nature qui l’augmente, meilleur talent offensif, objet Restes. Il charge l’Orbe Téra en trois attaques, puis téracristallise dans le type de sa meilleure capacité offensive apprenable dans Écarlate / Violet. Deux classements : attaque directe, et avec une accumulation (une capacité de boost, après la dernière annulation de stats du joueur prévue au script — on n’engage pas le boost s’il en reste une autre — et seulement si le bouclier Téra est baissé : une capacité de statut échoue pendant le bouclier). Inconscient chez le boss ignore les boosts de l’attaquant. Score : dégâts infligés pendant le combat (jusqu’au K.O. du boss ou à la fin du minuteur) au carré, divisés par les dégâts encaissés. Chrono : 7 min 30 (15 min pour Mewtwo). Pénalité de K.O. : 100 secondes, égales au niveau de l’attaquant (Bulbapedia / Serebii) ; les wikis japonais indiquent 60 s — incertitude notée. Délai de retour : 5 s × le numéro du K.O., plafonné à 30 s. Chaque action de l’attaquant compte pour 6 s (simplifié : 75 actions dans 7 min 30). Bouclier Téra : multiplicateurs 7★ 20 / 30 / 70 ; 6★ selon le jeu (Paldea 20 / 35 / 75, Septentria 30 / 55 / 85, Terra-Dôme 40 / 60 / 80) ; 5★ selon le jeu (Paldea et Terra-Dôme 20 / 35 / 75, Septentria 30 / 60 / 90, Bulbapedia / wikiwiki) ; durabilité 35 % des PV max en 7★, 30 % en 6★ et 25 % en 5★ lorsque la valeur exacte n’est pas listée. Un plancher de 3 % des PV de l’attaquant par action du boss évite les classements artificiels (immunités totales). Les encouragements et les PNJ ne sont pas chiffrés. Les légendaires et fabuleux sont exclus par défaut (option pour les afficher).',
    scope: 'Raids 7★ événementiels, 6★ et 5★ d’Écarlate / Violet (Paldea, Masque Turquoise, Disque Indigo). Les 5★ Dynamax d’Épée / Bouclier et l’Aventure Dynamax sont calculés à part (rank-sw-raids). Les 1–4★ n’apportent pas assez pour un classement dédié.',
    hypotheses: {
      koPenaltySec: 100,
      koPenaltyNote: 'Bulbapedia et Serebii : la pénalité égale le niveau du Pokémon K.O. (ici 100 s). Wikis japonais (atwiki, hyperWiki, octobre 2026) : 60 s fixes. Hypothèse retenue : 100 s.',
      actionSec: 6,
      shieldDur7: 0.35,
      shieldDur6: 0.30,
      inFloor: 0.03,
      cheersAndNpc: 'mentionnés en note seulement, non chiffrés'
    },
    license: 'MIT (@smogon/calc)',
    mv: outMv, mvfr: outMvfr, F: outF,
    B: outB,
    P: outP,
    L: outPL
  };

  return { data, unmapped, nAtk: attackers.length, nBoss: bosses.length, nLegend: attackers.filter(a => a.legend).length };
}

export function writeRankSvRaids(data) {
  const json = JSON.stringify(data);
  const prev = exists(OUT) ? read(OUT) : null;
  if (prev === json) return { changed: false, file: OUT, n: data.B.length };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, json);
  return { changed: true, file: OUT, bytes: json.length, n: data.B.length };
}

function fmtTop(data, id, mode) {
  const cell = data.P[id] && data.P[id][Object.keys(data.P[id])[0]];
  const rows = cell && cell[mode];
  if (!rows) return '';
  return rows.map(r => `${data.F[r[0]]} ${data.mvfr[r[1]]}${r[4] != null ? ' + ' + data.mvfr[r[4]] : ''} tera ${r[2]} ${r[3]}%`).join(' · ');
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  console.log('rank-sv-raids:', ONLY5 ? '5★ seulement' : ONLY7 ? '7★ seulement' : '7★ + 6★');
  const { data, unmapped, nAtk, nBoss, nLegend } = buildRankSvRaids({ only7: ONLY7, only5: ONLY5 });
  if (process.env.DEBUG_BOSS) { console.log('DEBUG_BOSS: pas d’écriture'); process.exit(0); }
  const w = writeRankSvRaids(data);
  console.log(`attaquants ${nAtk} (dont ${nLegend} légendaires/fabuleux), boss calculés ${nBoss}, fiches ${data.B.length}, ${w.changed ? 'écrit' : 'inchangé'} ${w.file} ${w.bytes || ''} octets`);
  if (unmapped.length) console.log('non mappés (' + unmapped.length + '):', unmapped.slice(0, 30).join(', '));
  const id = '887-dragon';
  if (data.P[id]) {
    console.log('top Lanssorien directe:', fmtTop(data, id, 'd'));
    console.log('top Lanssorien accumulation:', fmtTop(data, id, 'a'));
  }
}
