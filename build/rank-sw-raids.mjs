// Classements des meilleurs attaquants contre les raids Dynamax 5★ d’Épée / Bouclier
// (Terres Sauvages, Isolarmure, Couronneige) et les légendaires d’Aventure Dynamax.
// Calcul interne avec @smogon/calc (MIT, formule officielle de dégâts, génération 8).
//   node build/rank-sw-raids.mjs
//   node build/rank-sw-raids.mjs --adventure   uniquement les 47 légendaires d’Aventure
//   node build/rank-sw-raids.mjs --max5        uniquement les 5★ Dynamax
// Fusionne dans docs/data/rank-sv-raid.json sans effacer les raids Téracristal déjà présents.
// Les 1–4★ Dynamax restent hors classement.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { calculate, Pokemon, Move, Generations, Field } = require('@smogon/calc');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const DATA = path.join(ROOT, 'docs/data');
const CACHE = path.join(HERE, 'cache/v60-33');
const CACHE32 = path.join(HERE, 'cache/v60-32');
const CACHE7 = path.join(HERE, 'cache/v60-31');
const OUT = path.join(DATA, 'rank-sv-raid.json');
const ONLY_ADV = process.argv.includes('--adventure');
const ONLY_MAX5 = process.argv.includes('--max5');
const ONLY_KEYS = (process.env.ONLY_KEYS || '').split(',').map(s => s.trim()).filter(Boolean);

const gen = Generations.get(8);
const TYPE_CAP = { normal:'Normal', fire:'Fire', water:'Water', grass:'Grass', electric:'Electric', ice:'Ice', fighting:'Fighting', poison:'Poison', ground:'Ground', flying:'Flying', psychic:'Psychic', bug:'Bug', rock:'Rock', ghost:'Ghost', dragon:'Dragon', dark:'Dark', steel:'Steel', fairy:'Fairy' };

const MAX_TURNS = 10;
const MAX_FAINTS = 4;
const DYNA_TURNS = 3;
const DYNA_LEVEL = 10;
const BARRIER_SEGS = 4;
const BARRIER_HP = [60, 30];
const BARRIER_DMG = 0.20; // hypothèse : le multiplicateur exact n’est pas publié
const BOSS_HITS_5 = 2;    // le boss 5★ peut frapper 1 à 3 fois ; moyenne retenue
const HP_MULT = 3;
const LVL_5 = 60;
const LVL_ADV = 70;
const INCOMING_FLOOR = 0.03;
const STAR5 = 1 << 4;
const STAR_RARE = 1 << 7;
const SW_GAMES = ['sw', 'swisle', 'swcrown'];

const GMAX_MOVE = {
  '3-gmax': 'G-Max Vine Lash',
  '6-gmax': 'G-Max Wildfire',
  '9-gmax': 'G-Max Cannonade',
  '12-gmax': 'G-Max Befuddle',
  '25-gmax': 'G-Max Volt Crash',
  '52-gmax': 'G-Max Gold Rush',
  '68-gmax': 'G-Max Chi Strike',
  '94-gmax': 'G-Max Terror',
  '99-gmax': 'G-Max Foam Burst',
  '131-gmax': 'G-Max Resonance',
  '133-gmax': 'G-Max Cuddle',
  '143-gmax': 'G-Max Replenish',
  '569-gmax': 'G-Max Malodor',
  '809-gmax': 'G-Max Meltdown',
  '812-gmax': 'G-Max Drum Solo',
  '815-gmax': 'G-Max Fire Ball',
  '818-gmax': 'G-Max Hydrosnipe',
  '823-gmax': 'G-Max Wind Rage',
  '826-gmax': 'G-Max Gravitas',
  '834-gmax': 'G-Max Stonesurge',
  '839-gmax': 'G-Max Volcalith',
  '841-gmax': 'G-Max Tartness',
  '842-gmax': 'G-Max Sweetness',
  '844-gmax': 'G-Max Sandblast',
  '849-amped-gmax': 'G-Max Stun Shock',
  '849-low-key-gmax': 'G-Max Stun Shock',
  '851-gmax': 'G-Max Centiferno',
  '858-gmax': 'G-Max Smite',
  '861-gmax': 'G-Max Snooze',
  '869-gmax': 'G-Max Finale',
  '879-gmax': 'G-Max Steelsurge',
  '884-gmax': 'G-Max Depletion',
  '892-single-strike-gmax': 'G-Max One Blow',
  '892-rapid-strike-gmax': 'G-Max Rapid Flow'
};

const MAX_FR = {
  'Max Flare': 'Max Brasier', 'Max Geyser': 'Max Geyser', 'Max Overgrowth': 'Max Verdoyance',
  'Max Lightning': 'Max Foudre', 'Max Hailstorm': 'Max Chute Glace', 'Max Knuckle': 'Max Poing',
  'Max Ooze': 'Max Acide', 'Max Quake': 'Max Séisme', 'Max Airstream': 'Max Cyclone',
  'Max Mindstorm': 'Max Psy', 'Max Flutterby': 'Max Frelon', 'Max Rockfall': 'Max Rocades',
  'Max Phantasm': 'Max Spectre', 'Max Wyrmwind': 'Max Dragon', 'Max Darkness': 'Max Ténèbres',
  'Max Steelspike': 'Max Métal', 'Max Starfall': 'Max Féerie', 'Max Strike': 'Max Pognée',
  'Max Guard': 'Max Garde',
  'G-Max Vine Lash': 'Giga Fouet', 'G-Max Wildfire': 'Giga Feu', 'G-Max Cannonade': 'Giga Canon',
  'G-Max Befuddle': 'Giga Folie', 'G-Max Volt Crash': 'Giga Foudre', 'G-Max Gold Rush': 'Giga Pognon',
  'G-Max Chi Strike': 'Giga Frappe', 'G-Max Terror': 'Giga Maléfice', 'G-Max Foam Burst': 'Giga Bulles',
  'G-Max Resonance': 'Giga Résonance', 'G-Max Cuddle': 'Giga Câlinerie', 'G-Max Replenish': 'Giga Récolte',
  'G-Max Malodor': 'Giga Pestilence', 'G-Max Meltdown': 'Giga Fusion', 'G-Max Drum Solo': 'Giga Percussion',
  'G-Max Fire Ball': 'Giga Incendie', 'G-Max Hydrosnipe': 'Giga Sniper', 'G-Max Wind Rage': 'Giga Coupure',
  'G-Max Gravitas': 'Giga Gravité', 'G-Max Stonesurge': 'Giga Roc', 'G-Max Volcalith': 'Giga Volcan',
  'G-Max Tartness': 'Giga Fébrilité', 'G-Max Sweetness': 'Giga Sucrosité', 'G-Max Sandblast': 'Giga Poussière',
  'G-Max Stun Shock': 'Giga Choc', 'G-Max Centiferno': 'Giga Fournaise', 'G-Max Smite': 'Giga Foudre Sainte',
  'G-Max Snooze': 'Giga Torpeur', 'G-Max Finale': 'Giga Finale', 'G-Max Steelsurge': 'Giga Fontesol',
  'G-Max Depletion': 'Giga Usure', 'G-Max One Blow': 'Giga Coup Final', 'G-Max Rapid Flow': 'Giga Flux'
};

const GMAX_SMOGON = {
  '3-gmax': 'Venusaur', '6-gmax': 'Charizard', '9-gmax': 'Blastoise', '12-gmax': 'Butterfree',
  '25-gmax': 'Pikachu', '52-gmax': 'Meowth', '68-gmax': 'Machamp', '94-gmax': 'Gengar',
  '99-gmax': 'Kingler', '131-gmax': 'Lapras', '133-gmax': 'Eevee', '143-gmax': 'Snorlax',
  '569-gmax': 'Garbodor', '809-gmax': 'Melmetal', '812-gmax': 'Rillaboom', '815-gmax': 'Cinderace',
  '818-gmax': 'Inteleon', '823-gmax': 'Corviknight', '826-gmax': 'Orbeetle', '834-gmax': 'Drednaw',
  '839-gmax': 'Coalossal', '841-gmax': 'Flapple', '842-gmax': 'Appletun', '844-gmax': 'Sandaconda',
  '849-amped-gmax': 'Toxtricity', '849-low-key-gmax': 'Toxtricity-Low-Key',
  '851-gmax': 'Centiskorch', '858-gmax': 'Hatterene', '861-gmax': 'Grimmsnarl',
  '869-gmax': 'Alcremie', '879-gmax': 'Copperajah', '884-gmax': 'Duraludon',
  '890-eternamax': 'Eternatus-Eternamax',
  '892-single-strike-gmax': 'Urshifu', '892-rapid-strike-gmax': 'Urshifu-Rapid-Strike'
};

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
function csvPath(name) {
  for (const dir of [CACHE, CACHE32, CACHE7]) {
    const f = path.join(dir, name);
    if (exists(f)) return f;
  }
  return path.join(CACHE32, name);
}
function loadCsvMaps() {
  const csv = name => read(csvPath(name)).split(/\r?\n/);
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
    const en2fr = new Map(), fr2en = new Map();
    for (const [id, e] of en) {
      if (fr.has(id)) { en2fr.set(e.toLowerCase(), fr.get(id)); fr2en.set(normFr(fr.get(id)), e); }
    }
    return { en2fr, fr2en };
  };
  return { moves: load('move_names.csv', 'move_id'), ab: load('ability_names.csv', 'ability_id') };
}

function smogonName(e) {
  const en = e.en || '';
  const k = e.k || '';
  if (k.endsWith('-gmax') || e.c === 'gmax' || k.endsWith('-eternamax')) {
    const mapped = GMAX_SMOGON[k];
    if (mapped) {
      try { new Pokemon(gen, mapped, { level: 50 }); return mapped; } catch {}
    }
    return null;
  }
  const cands = [];
  const add = n => { if (n && !cands.includes(n)) cands.push(n); };
  add(en);
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
  if (k.endsWith('-therian')) add(en.replace(' Therian', '') + '-Therian');
  if (k.endsWith('-mega') || k.includes('-mega-') || k.endsWith('-primal')) return null;
  if (/-f$/.test(k) || /-female$/.test(k) || / female/i.test(en)) {
    add(en.replace(/ Female/i, '') + '-F');
    add(en.split(' ')[0] + '-F');
  }
  if (k.includes('low-key')) add('Toxtricity-Low-Key');
  if (k.includes('amped')) add('Toxtricity');
  if (k.includes('dusk') && /Lycanroc/i.test(en)) add('Lycanroc-Dusk');
  if (k.includes('midnight') && /Lycanroc/i.test(en)) add('Lycanroc-Midnight');
  if (k.includes('dawn') || k.includes('icerider')) add('Calyrex-Ice');
  if (k.includes('shadowrider') || (k.includes('shadow') && /Calyrex/.test(en))) add('Calyrex-Shadow');
  if (k === '479-heat') add('Rotom-Heat');
  if (k === '479-wash') add('Rotom-Wash');
  if (k === '479-frost') add('Rotom-Frost');
  if (k === '479-fan') add('Rotom-Fan');
  if (k === '479-mow') add('Rotom-Mow');
  if (k === '888' || /^Zacian$/.test(en)) { add('Zacian'); add('Zacian-Crowned'); }
  if (k === '889' || /^Zamazenta$/.test(en)) { add('Zamazenta'); add('Zamazenta-Crowned'); }
  for (const n of cands) {
    try { new Pokemon(gen, n, { level: 50 }); return n; } catch {}
  }
  return null;
}

const { TYPE_CHART } = require('@smogon/calc');
function effectiveness(moveType, defTypes) {
  const chart = TYPE_CHART[8] || TYPE_CHART[9];
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

function learnIdsSW(f) {
  const lm = f.lm || {};
  const ids = new Set();
  for (const g of ['swcrown', 'swisle', 'sw']) {
    if (lm[g] == null || !f.ls || !f.ls[lm[g]]) continue;
    const L = f.ls[lm[g]];
    for (const x of L.l || []) ids.add(x[0]);
    for (const x of L.m || []) ids.add(x);
    for (const x of L.e || []) ids.add(x);
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
    if (/^(Explosion|Self-Destruct|Misty Explosion|Final Gambit|Memento)$/i.test(en)) continue;
    out.push({ id: String(id), fr, en, typ, cls, pow });
  }
  return out;
}

function pickNature(cls) { return cls === 'p' ? 'Adamant' : 'Modest'; }

function avgDamage(result) {
  const d = result.damage;
  if (typeof d === 'number') return d;
  if (Array.isArray(d)) {
    if (Array.isArray(d[0])) return d.reduce((s, hit) => s + (hit.reduce((a, b) => a + b, 0) / hit.length), 0);
    return d.reduce((a, b) => a + b, 0) / d.length;
  }
  return 0;
}

function makePoke(name, opts) { return new Pokemon(gen, name, opts); }

function calcDmg(atk, def, moveName, field, { useMax, overrideMove, assumeHit } = {}) {
  try {
    const opts = {};
    if (useMax) {
      opts.useMax = useMax;
      if (overrideMove) opts.overrideMove = overrideMove;
    } else if (assumeHit && /^(Avalanche|Revenge|Payback)$/i.test(moveName)) {
      opts.overrides = { basePower: 120 };
    }
    const mv = new Move(gen, moveName, opts);
    const r = calculate(gen, atk, def, mv, field);
    return avgDamage(r);
  } catch {
    return 0;
  }
}

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
  for (const k of ['atk', 'def', 'spa', 'spd', 'spe', 'acc', 'eva']) {
    if (!src[k]) continue;
    dst[k] = Math.max(-6, Math.min(6, (dst[k] || 0) + src[k]));
  }
}
function applyGrowth(dst) {
  dst.atk = Math.max(-6, Math.min(6, (dst.atk || 0) + 1));
  dst.spa = Math.max(-6, Math.min(6, (dst.spa || 0) + 1));
}
function pokeWithBoosts(base, boosts) {
  const p = base.clone();
  p.boosts = { ...(p.boosts || {}), ...boosts };
  return p;
}
function fieldOf() { return new Field({ gameType: 'Singles' }); }

function maxMoveOf(baseEn, typ, gmaxMove) {
  try {
    const opts = { useMax: gmaxMove ? 'gmax' : true };
    if (gmaxMove) opts.overrideMove = gmaxMove;
    return new Move(gen, baseEn, opts).name;
  } catch {
    return null;
  }
}

function simulateMaxRaid({
  ourMaxDyna, ourMaxNormal, outgoing, incoming, setup, unaware, bossMax, adventure
}) {
  let turn = 0;
  let bossHP = bossMax;
  let dyna = true;
  let ourMax = ourMaxDyna;
  let ourHP = ourMaxDyna;
  let ourB = zeros(), bossB = zeros();
  let dealt = 0, taken = 0, faints = 0, cheerPending = false;
  let setupDone = false;
  let barriersRaised = 0, barrierOn = false, bars = 0, resetsFired = 0;
  let advReset = false;
  const nResets = adventure ? 1 : 2;

  const leftovers = () => { ourHP = Math.min(ourMax, ourHP + Math.floor(ourMax / 16)); };

  const maybeEvents = () => {
    const pct = 100 * bossHP / bossMax;
    if (adventure) {
      if (!advReset && pct <= 50) {
        ourB = zeros();
        advReset = true;
        resetsFired++;
      }
      return;
    }
    while (barriersRaised < BARRIER_HP.length && pct <= BARRIER_HP[barriersRaised]) {
      barrierOn = true;
      bars = BARRIER_SEGS;
      barriersRaised++;
      ourB = zeros();
      resetsFired++;
    }
  };

  const endDyna = () => {
    if (!dyna) return;
    const ratio = ourMax ? ourHP / ourMax : 0;
    dyna = false;
    ourMax = ourMaxNormal;
    ourHP = Math.max(0, Math.round(ratio * ourMax));
  };

  const bossHits = () => {
    if (bossHP <= 0) return;
    const nHits = adventure ? ((bossHP / bossMax) <= 0.5 ? 2 : 1) : BOSS_HITS_5;
    for (let i = 0; i < nHits; i++) {
      if (cheerPending) break;
      let dmg = incoming({ dyna, ourB, bossB }) || 0;
      dmg = Math.max(dmg, INCOMING_FLOOR * ourMax);
      ourHP -= dmg;
      taken += dmg;
      if (ourHP <= 0) {
        faints++;
        ourHP = 0;
        cheerPending = true;
        endDyna();
        break;
      }
    }
  };

  while (turn < MAX_TURNS && bossHP > 0 && faints < MAX_FAINTS) {
    turn++;
    if (turn > DYNA_TURNS) endDyna();

    if (cheerPending) {
      cheerPending = false;
      ourHP = ourMax;
      leftovers();
      bossHits();
      continue;
    }

    const canSetup = setup && !setupDone && !unaware && !barrierOn && resetsFired >= nResets;
    if (canSetup) {
      const cost = setup.hpCost ? ourMax * setup.hpCost : 0;
      if (ourHP > cost) {
        if (cost) ourHP -= cost;
        if (setup.en === 'Growth') applyGrowth(ourB);
        else addBoosts(ourB, setup);
        setupDone = true;
        leftovers();
        maybeEvents();
        bossHits();
        continue;
      }
    }

    let dmg = outgoing({ dyna, ourB, bossB }) || 0;
    if (barrierOn) {
      const applied = dmg * BARRIER_DMG;
      dealt += applied;
      bossHP -= applied;
      bars -= dyna ? 2 : 1;
      if (bars <= 0) {
        barrierOn = false;
        bars = 0;
        bossB.def = Math.max(-6, (bossB.def || 0) - 2);
        bossB.spd = Math.max(-6, (bossB.spd || 0) - 2);
      }
    } else {
      dealt += dmg;
      bossHP -= dmg;
    }
    leftovers();
    maybeEvents();
    if (bossHP > 0) bossHits();
  }

  const takenSafe = Math.max(taken, 1);
  return { score: dealt * dealt / takenSafe, dealt, taken, turn, win: bossHP <= 0 && faints < MAX_FAINTS, setupDone, faints };
}

function writeMerged(data) {
  const prev = exists(OUT) ? JSON.parse(read(OUT)) : null;
  const remap = (obj, oF, oMv, oFr) => {
    const out = {};
    const fMap = new Map(), mMap = new Map();
    for (const [id, slot] of Object.entries(obj || {})) {
      const copy = {};
      for (const [typ, modes] of Object.entries(slot || {})) {
        const rec = {};
        for (const mode of ['d', 'a']) {
          rec[mode] = (modes[mode] || []).map(row => {
            const [fi, mi, t, pct, bi] = row;
            const fk = oF[fi], men = oMv[mi], mfr = (oFr && oFr[mi]) || men;
            if (!fMap.has(fk)) { fMap.set(fk, data._nF.length); data._nF.push(fk); }
            if (!mMap.has(men)) { mMap.set(men, data._nMv.length); data._nMv.push(men); data._nFr.push(mfr); }
            const next = [fMap.get(fk), mMap.get(men), t, pct];
            if (bi != null) {
              const ben = oMv[bi], bfr = (oFr && oFr[bi]) || ben;
              if (ben && !mMap.has(ben)) { mMap.set(ben, data._nMv.length); data._nMv.push(ben); data._nFr.push(bfr); }
              if (ben) next.push(mMap.get(ben));
            }
            return next;
          });
        }
        copy[typ] = rec;
      }
      out[id] = copy;
    }
    return out;
  };

  data._nF = []; data._nMv = []; data._nFr = [];
  let outP = data.P, outPL = data.L, outB = data.B, outF = data.F, outMv = data.mv, outMvfr = data.mvfr;
  if (prev) {
    const newIds = new Set(data.B.map(row => row[0]));
    const keep = (prev.B || []).filter(row => !newIds.has(row[0]));
    const ids = new Set(keep.map(row => row[0]));
    const oldP = Object.fromEntries(Object.entries(prev.P || {}).filter(([id]) => ids.has(id)));
    const oldL = Object.fromEntries(Object.entries(prev.L || {}).filter(([id]) => ids.has(id)));
    outP = { ...remap(oldP, prev.F, prev.mv, prev.mvfr), ...remap(data.P, data.F, data.mv, data.mvfr) };
    outPL = { ...remap(oldL, prev.F, prev.mv, prev.mvfr), ...remap(data.L, data.F, data.mv, data.mvfr) };
    outB = [...keep, ...data.B];
    outF = data._nF; outMv = data._nMv; outMvfr = data._nFr;
  }
  const src = prev && prev.src && prev.src !== data.src ? prev.src + ' ' + data.src : data.src;
  const method = prev && prev.method && !/Dynamax 5★|raids Dynamax/i.test(prev.method)
    ? prev.method + ' ' + data.method : (data.method || (prev && prev.method));
  const scope = 'Raids Téracristal 7★, 6★ et 5★ d’Écarlate / Violet (Paldea, Masque Turquoise, Disque Indigo). Raids Dynamax 5★ d’Épée / Bouclier (Terres Sauvages, Isolarmure, Couronneige) et légendaires d’Aventure Dynamax (Couronneige). Les 1–4★ Dynamax et les rencontres d’expédition (Niv. 65) restent hors classement.';
  const out = {
    date: '2026-11-25',
    src,
    method,
    scope,
    hypotheses: { ...((prev && prev.hypotheses) || {}), ...data.hypotheses },
    F: outF, mv: outMv, mvfr: outMvfr, B: outB, P: outP, L: outPL
  };
  fs.writeFileSync(OUT, JSON.stringify(out));
  return { file: OUT, bytes: fs.statSync(OUT).size, bosses: out.B.length };
}

export function buildRankSwRaids(opts = {}) {
  const onlyAdv = opts.onlyAdv ?? ONLY_ADV;
  const onlyMax5 = opts.onlyMax5 ?? ONLY_MAX5;
  const maps = loadCsvMaps();
  const core = J('core.json');
  const evo = J('evo.json');
  const movesJ = J('moves.json');
  const ref = J('ref.json');
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
  const learnForm = k => {
    let f = formOf(k);
    if (f && ((f.lm && Object.keys(f.lm).length) || (f.ls && f.ls.length))) return f;
    if (/-gmax$/.test(k) || /-eternamax$/.test(k)) {
      const base = k.replace(/-gmax$/, '').replace(/-eternamax$/, '');
      f = formOf(base);
      if (f) return f;
      return formOf(String(parseInt(k, 10)));
    }
    return f;
  };
  const inSW = f => {
    const av = f.av || [];
    return av.includes('sw') || av.includes('swisle') || av.includes('swcrown');
  };

  const attackers = [];
  const unmapped = [];
  for (const e of core.e) {
    if (e.c === 'mega' || e.c === 'primal' || e.c === 'totem') continue;
    if (String(e.k).includes('-mega') || String(e.k).endsWith('-primal') || String(e.k).endsWith('-eternamax')) continue;
    const isGmax = e.c === 'gmax' || String(e.k).endsWith('-gmax');
    if (!isGmax && evolves.has(e.k)) continue;
    const fAv = formOf(e.k);
    const fLearn = learnForm(e.k);
    if (!fAv || !inSW(fAv) || !fLearn) continue;
    const smo = smogonName(e);
    if (!smo) { unmapped.push(e.k + ' ' + (e.en || e.n)); continue; }
    const ids = learnIdsSW(fLearn);
    const mvs = damagingMoves(ids, movesJ, maps.moves.fr2en);
    const setups = setupMoves(ids, movesJ, maps.moves.fr2en, e.t || fLearn.t);
    if (!mvs.length) continue;
    const abs = [];
    for (const [aid] of (fLearn.a || fAv.a || [])) {
      const fr = (ref.ab[String(aid)] || [])[0];
      const en = fr && lookupFr(maps.ab.fr2en, fr);
      if (en) abs.push(en);
    }
    if (!abs.length) abs.push('(no ability)');
    const legend = !!(e.lg || e.my);
    attackers.push({
      k: e.k, n: e.n, en: e.en, smo, types: e.t || fLearn.t, moves: mvs, setups,
      abilities: abs, legend, stats: fLearn.s || e.s, gmax: isGmax, gmaxMove: isGmax ? (GMAX_MOVE[e.k] || null) : null
    });
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
    "armor tail", 'flower veil', 'sweet veil', 'aroma veil', 'pastel veil'
  ]);
  const IMMUNITY_ABILITIES = new Set([
    'bulletproof', 'well-baked body', 'water absorb', 'volt absorb', 'lightning rod',
    'storm drain', 'dry skin', 'motor drive', 'sap sipper', 'earth eater', 'levitate',
    'flash fire', 'wonder guard', 'good as gold', 'wind rider', 'soundproof', 'purifying salt'
  ]);
  function offensiveAbilities(abs) {
    const all = abs && abs.length ? abs : ['(no ability)'];
    const off = all.filter(a => !DEFENSIVE_ABILITIES.has(String(a).toLowerCase()));
    if (off.length) return off;
    const noImm = all.filter(a => !IMMUNITY_ABILITIES.has(String(a).toLowerCase()));
    return noImm.length ? noImm : all;
  }

  const dmgCache = new Map();
  function boostKey(p) {
    const b = p.boosts || {};
    return (b.atk||0) + ',' + (b.def||0) + ',' + (b.spa||0) + ',' + (b.spd||0) + ',' + (b.spe||0);
  }
  function cachedDmg(atk, def, moveName, field, extra) {
    const key = atk.name + '|' + atk.isDynamaxed + '|' + boostKey(atk) + '|' + def.name + '|' + def.isDynamaxed + '|' + boostKey(def) + '|' + moveName + '|' + (extra && extra.useMax) + '|' + (extra && extra.overrideMove);
    if (dmgCache.has(key)) return dmgCache.get(key);
    const v = calcDmg(atk, def, moveName, field, extra);
    dmgCache.set(key, v);
    return v;
  }

  const bosses = [];
  const seen5 = new Set();
  if (!onlyAdv) {
    for (const row of raids.r) {
      const g = raids.g[row[1]];
      if (!SW_GAMES.includes(g)) continue;
      if (!(row[5] & STAR5)) continue;
      const k = row[0];
      if (seen5.has(k)) continue;
      seen5.add(k);
      const e = byKey.get(k);
      if (!e) continue;
      const smo = smogonName(e);
      if (!smo) { unmapped.push('boss5 ' + k); continue; }
      const f = learnForm(k) || formOf(k);
      const extra = raids.x[row[7]] || '';
      const ids = f ? learnIdsSW(f) : new Set();
      let mvs = damagingMoves(ids, movesJ, maps.moves.fr2en);
      mvs = mvs.map(m => ({ ...m, est: m.pow * ((e.t || (f && f.t) || []).includes(m.typ) ? 1.5 : 1) }))
        .sort((a, b) => b.est - a.est);
      const uniq = [];
      const have = new Set();
      for (const m of mvs) { if (have.has(m.en)) continue; have.add(m.en); uniq.push(m); if (uniq.length >= 4) break; }
      const spa = ((f && f.s) || e.s || [])[3] || 0, atkS = ((f && f.s) || e.s || [])[1] || 0;
      const nature = spa > atkS ? 'Modest' : 'Adamant';
      let ability;
      const abs = (f && f.a) || [];
      const pick = abs.find(a => !a[1]) || abs[0];
      if (pick) {
        const fr = (ref.ab[String(pick[0])] || [])[0];
        ability = fr && lookupFr(maps.ab.fr2en, fr);
      }
      bosses.push({
        id: k + '-mx', k, n: e.n, stars: 5, tera: '*', game: g, title: '',
        smo, level: LVL_5, nature, ability, moves: uniq, hpMult: HP_MULT,
        adventure: false, gmax: !!(e.c === 'gmax' || String(k).endsWith('-gmax')), extra
      });
    }
  }
  if (!onlyMax5) {
    const seenA = new Set();
    for (const row of raids.r) {
      const g = raids.g[row[1]];
      if (!SW_GAMES.includes(g)) continue;
      if (!(row[5] & STAR_RARE)) continue;
      const k = row[0];
      if (seenA.has(k)) continue;
      seenA.add(k);
      const e = byKey.get(k);
      if (!e) continue;
      const smo = smogonName(e);
      if (!smo) { unmapped.push('bossAdv ' + k); continue; }
      const f = learnForm(k) || formOf(k);
      const ids = f ? learnIdsSW(f) : new Set();
      let mvs = damagingMoves(ids, movesJ, maps.moves.fr2en);
      mvs = mvs.map(m => ({ ...m, est: m.pow * ((e.t || (f && f.t) || []).includes(m.typ) ? 1.5 : 1) }))
        .sort((a, b) => b.est - a.est);
      const uniq = [];
      const have = new Set();
      for (const m of mvs) { if (have.has(m.en)) continue; have.add(m.en); uniq.push(m); if (uniq.length >= 4) break; }
      const spa = ((f && f.s) || e.s || [])[3] || 0, atkS = ((f && f.s) || e.s || [])[1] || 0;
      const nature = spa > atkS ? 'Modest' : 'Adamant';
      let ability;
      const abs = (f && f.a) || [];
      const pick = abs[0];
      if (pick) {
        const fr = (ref.ab[String(pick[0])] || [])[0];
        ability = fr && lookupFr(maps.ab.fr2en, fr);
      }
      bosses.push({
        id: k + '-adv', k, n: e.n, stars: 8, tera: '*', game: g, title: 'Aventure Dynamax',
        smo, level: LVL_ADV, nature, ability, moves: uniq, hpMult: HP_MULT,
        adventure: true, gmax: false
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

  function rankAgainst(atk, bossPoke, ctx) {
    const { unaware, adventure, bossTypes } = ctx;
    let bestD = null, bestA = null;
    const abs = offensiveAbilities(atk.abilities);
    for (const abil of abs) {
      const scored = atk.moves.map(m => {
        const stab = (atk.types || []).includes(m.typ) ? 1.5 : 1;
        const eff = effectiveness(m.typ, bossTypes);
        return { m, est: m.pow * stab * (eff || 0.01) };
      }).sort((a, b) => b.est - a.est);
      const cands = [];
      const seen = new Set();
      for (const x of scored) {
        if (cands.length >= 4) break;
        if (seen.has(x.m.en)) continue;
        if (x.est <= 0 && cands.length) continue;
        seen.add(x.m.en); cands.push(x.m);
      }
      for (const move of cands) {
        const nature = pickNature(move.cls);
        const evs = move.cls === 'p' ? { hp: 252, atk: 252 } : { hp: 252, spa: 252 };
        const ivs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
        const abilOpt = abil === '(no ability)' ? undefined : abil;
        let pokeN, pokeD, ourMaxN, ourMaxD;
        try {
          pokeN = makePoke(atk.smo, { level: 100, nature, evs, ivs, ability: abilOpt, item: 'Leftovers' });
          ourMaxN = pokeN.maxHP();
          pokeD = makePoke(atk.smo, { level: 100, nature, evs, ivs, ability: abilOpt, item: 'Leftovers', isDynamaxed: atk.gmax ? 'gmax' : true, dynamaxLevel: DYNA_LEVEL });
          ourMaxD = pokeD.maxHP();
        } catch { continue; }

        const gmaxMove = atk.gmaxMove;
        const maxName = maxMoveOf(move.en, move.typ, gmaxMove) || ('Max ' + (TYPE_CAP[move.typ] || move.typ));
        const maxFr = MAX_FR[maxName] || maxName;

        const outgoing = ({ dyna, ourB, bossB }) => {
          const atkP = pokeWithBoosts(dyna ? pokeD : pokeN, ourB);
          const defP = pokeWithBoosts(bossPoke, bossB);
          if (dyna) return cachedDmg(atkP, defP, move.en, fieldOf(), { useMax: atk.gmax ? 'gmax' : true, overrideMove: (atk.gmax && gmaxMove) ? gmaxMove : undefined });
          return cachedDmg(atkP, defP, move.en, fieldOf(), { assumeHit: true });
        };
        const incoming = ({ dyna, ourB, bossB }) => {
          const defP = pokeWithBoosts(dyna ? pokeD : pokeN, ourB);
          const atkP = pokeWithBoosts(bossPoke, bossB);
          let best = 0;
          for (const bm of ctx.bossMoves) {
            const v = cachedDmg(atkP, defP, bm.en, fieldOf(), {});
            if (v > best) best = v;
          }
          return best;
        };

        const run = setup => simulateMaxRaid({
          ourMaxDyna: ourMaxD, ourMaxNormal: ourMaxN, outgoing, incoming, setup, unaware,
          bossMax: ctx.bossMax, adventure
        });
        const rD = run(null);
        const rowD = { score: rD.score, fi: fi(atk.k), mi: mi(maxName, maxFr), typ: move.typ, pct: rD.win ? 100 : Math.max(1, Math.round(100 * Math.min(1, (rD.dealt || 0) / ctx.bossMax))), legend: atk.legend };
        if (!bestD || rD.score > bestD.score) bestD = rowD;

        for (const su of relevantSetups(atk.setups, move)) {
          const rA = run(su);
          if (!rA.setupDone) continue;
          const rowA = { score: rA.score, fi: fi(atk.k), mi: mi(maxName, maxFr), typ: move.typ, pct: rA.win ? 100 : Math.max(1, Math.round(100 * Math.min(1, (rA.dealt || 0) / ctx.bossMax))), bi: mi(su.en, su.fr), legend: atk.legend };
          if (!bestA || rA.score > bestA.score) bestA = rowA;
        }
      }
    }
    return { bestD, bestA };
  }

  for (const b of bosses) {
    if (process.env.DEBUG_BOSS && String(b.k) !== String(process.env.DEBUG_BOSS) && String(b.id) !== String(process.env.DEBUG_BOSS)) continue;
    let bossBase, bossDyna, bossMax;
    try {
      const evs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
      const ivs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
      bossBase = makePoke(b.smo, { level: b.level, nature: b.nature, ability: b.ability, evs, ivs });
      bossDyna = makePoke(b.smo, { level: b.level, nature: b.nature, ability: b.ability, evs, ivs, isDynamaxed: b.gmax ? 'gmax' : true, dynamaxLevel: DYNA_LEVEL });
      bossMax = bossBase.maxHP() * b.hpMult;
    } catch (e) {
      console.warn('boss skip', b.id, b.smo, e.message);
      continue;
    }
    const e = byKey.get(b.k) || {};
    const f = learnForm(b.k);
    const bossTypes = e.t || (f && f.t) || ['normal'];
    const unaware = (b.ability || '').toLowerCase() === 'unaware';
    const rowsD = [], rowsDL = [], rowsA = [], rowsAL = [];
    for (const atk of attackers) {
      const { bestD, bestA } = rankAgainst(atk, bossDyna, {
        unaware, adventure: b.adventure, bossTypes, bossMax, bossMoves: b.moves
      });
      if (bestD) (bestD.legend ? rowsDL : rowsD).push(bestD);
      if (bestA) (bestA.legend ? rowsAL : rowsA).push(bestA);
    }
    const top = (arr, n = 8) => arr.sort((a, b) => b.score - a.score).slice(0, n).map(r => {
      const row = [r.fi, r.mi, r.typ, r.pct];
      if (r.bi != null) row.push(r.bi);
      return row;
    });
    const pack = () => ({ d: top(rowsD), a: top(rowsA) });
    const packL = () => ({ d: top([...rowsD, ...rowsDL]), a: top([...rowsA, ...rowsAL]) });
    P[b.id] = { max: pack() };
    PL[b.id] = { max: packL() };

    nCalcBoss++;
    if (nCalcBoss % 5 === 0 || nCalcBoss === 1) {
      console.log('  ', nCalcBoss, '/', bosses.length, b.n, b.id, ((Date.now() - t0) / 1000).toFixed(1) + 's');
    }
  }

  const B = bosses.filter(b => P[b.id]).map(b => [b.id, b.k, b.n, b.stars, b.tera, b.game, b.title]);
  const data = {
    src: 'Calcul interne avec la formule officielle de dégâts (@smogon/calc, licence MIT, génération 8). Mécaniques des raids Dynamax et de l’Aventure : Bulbapedia, Serebii, Pokémon.com. Les guides communautaires servent uniquement à vérifier le haut de quelques classements.',
    method: 'Attaquant de niveau 100, IV 31, 252 EV PV et 252 EV dans sa meilleure stat offensive, nature qui l’augmente, meilleur talent offensif, objet Restes. Il entre en Dynamax aux tours 1 à 3 (niveau Dynamax 10, PV ×2) puis attaque normalement. Un seul Dynamax par combat : après un K.O., l’attaquant revient sans Dynamax. Score : dégâts infligés au carré, divisés par les dégâts encaissés, sur 10 tours ou jusqu’au K.O. du boss (4 K.O. de l’équipe = échec ; après un K.O., un tour est perdu à encourager, puis l’attaquant revient avec tous ses PV). Boss 5★ : niveau 60, PV ×3, deux barrières (seuils typiques 60 % puis 30 % des PV, 4 segments ; une attaque normale retire 1 segment, une capacité Dynamax ou Gigamax en retire 2). Pendant la barrière, les dégâts sont réduits (hypothèse ×0,20, multiplicateur exact non publié) et les capacités de statut échouent ; à la rupture, le boss perd 2 Def et 2 SpD. Chaque apparition de barrière annule les boosts du joueur. Le boss 5★ est modélisé avec 2 attaques par tour (il peut en infliger 1 à 3). Aventure Dynamax : combat du légendaire uniquement, niveau 70, PV ×3, sans barrière ; le légendaire frappe deux fois sous 50 % des PV ; une annulation générique des boosts à 50 % des PV ; 4 vies partagées, supposées intactes au début de ce combat. Deux classements (attaque directe / une accumulation après la dernière annulation et hors barrière). Les encouragements et les PNJ ne sont pas chiffrés. Les sets exacts de location ne sont pas reproduits un par un : l’attaquant est un Pokémon disponible dans Épée / Bouclier, y compris les formes Gigamax. Les légendaires et fabuleux sont exclus par défaut.',
    scope: 'Raids Dynamax 5★ d’Épée / Bouclier (Terres Sauvages, Isolarmure, Couronneige) et légendaires d’Aventure Dynamax (Couronneige). Les 1–4★ Dynamax et les rencontres d’expédition (Niv. 65) restent hors classement. Les raids Téracristal 5–7★ d’Écarlate / Violet sont dans le même pack, calculés à part.',
    hypotheses: {
      swBarrierDmg: 0.20,
      swBarrierDmgNote: 'Le multiplicateur de dégâts pendant une barrière Dynamax n’est pas publié. Hypothèse retenue : ×0,20, comme un bouclier Téra typique. Incertitude notée.',
      swBarrierSegs: 4,
      swBarrierSegsNote: 'Une barrière 5★ a 2 à 8 segments selon la « puissance défensive ». Valeur générique retenue : 4 segments.',
      swBossHits: 2,
      swBossHitsNote: 'Un boss 5★ peut attaquer jusqu’à 3 fois par tour. Hypothèse : 2 actions (moyenne).',
      swAdventureHpMult: 3,
      swAdventureHpMultNote: 'Aucun multiplicateur distinct n’est publié pour le légendaire d’Aventure. Même ×3,0 que les raids Dynamax 5★, au niveau 70.',
      swAdventureLives: '4 vies supposées intactes au début du combat du légendaire (des combats précédents de l’expédition peuvent en avoir consommé).',
      swKoCheer: 'Après un K.O., le tour suivant est un encouragement (sans attaque), puis l’attaquant revient avec tous ses PV. 4 K.O. = échec.',
      swStartBarrier: 'Certaines barrières 5★ apparaissent dès le début du combat ; écarté du script générique (seuils 60 % puis 30 %).'
    },
    F, mv, mvfr, B, P, L: PL
  };
  return { data, unmapped, nAtk: attackers.length, nBoss: nCalcBoss, nLegend: attackers.filter(a => a.legend).length };
}

function fmtTop(data, id, mode) {
  const slot = (data.P[id] || {}).max;
  if (!slot) return '(absent)';
  return (slot[mode] || []).slice(0, 5).map(r => {
    const n = data.F[r[0]];
    const mv = data.mvfr[r[1]] || data.mv[r[1]];
    return `${n} ${mv} ${r[3]}%`;
  }).join(' · ');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('rank-sw-raids:', ONLY_ADV ? 'Aventure seulement' : ONLY_MAX5 ? '5★ Dynamax seulement' : '5★ Dynamax + Aventure');
  const { data, unmapped, nAtk, nBoss, nLegend } = buildRankSwRaids();
  if (process.env.DEBUG_BOSS) { console.log('DEBUG_BOSS: pas d’écriture'); process.exit(0); }
  const w = writeMerged(data);
  console.log(`attaquants ${nAtk} (dont ${nLegend} légendaires/fabuleux), boss calculés ${nBoss}, fiches ${w.bosses}, écrit ${w.file} ${w.bytes} octets`);
  if (unmapped.length) console.log('non mappés (' + unmapped.length + '):', unmapped.slice(0, 40).join(', '));
  const samples = ['6-gmax-mx', '150-adv', '382-adv', '6-mx'];
  for (const id of samples) {
    if (data.P[id]) {
      console.log('top', id, 'directe:', fmtTop(data, id, 'd'));
      console.log('top', id, 'accumulation:', fmtTop(data, id, 'a'));
    }
  }
}
