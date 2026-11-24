// Classements des meilleurs attaquants contre les raids Téracristal 7★ et 6★ d’Écarlate / Violet.
// Calcul interne avec @smogon/calc (MIT, formule officielle de dégâts).
//   node build/rank-sv-raids.mjs           tout recalculer (7★ + 6★)
//   node build/rank-sv-raids.mjs --7star   ne recalculer que les 7★ (conserve les 6★ déjà présents)
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
const RAID_ROUNDS_7 = 75, RAID_ROUNDS_6 = 75;
const SHIELD_SHARE_7 = 0.4, SHIELD_SHARE_6 = 0.3;
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

function shieldFactor(moveType, bossTera, share) {
  const eff = effectiveness(moveType, [bossTera]);
  const rate = eff >= 2 ? 0.7 : 0.3; // always terastallized in our builds
  return (1 - share) + share * rate;
}

function scoreWindow(dpsOut, dpsIn, hp, rounds) {
  const netIn = Math.max(dpsIn - hp / 16, dpsIn * 0.05, 0.5); // leftovers ~1/16 HP / round
  const alive = hp / netIn;
  const r = Math.min(rounds, alive);
  const dealt = dpsOut * r;
  const taken = Math.max(dpsIn * r, 1);
  // score = dealt² / taken  (dégâts infligés rapportés aux dégâts encaissés, avec un poids sur la puissance)
  return { score: dealt * dealt / taken, dealt, taken, rounds: r, dpsOut, dpsIn };
}

function parseHpMults() {
  const dir = exists(CACHE7) ? CACHE7 : CACHE;
  const map = new Map(); // english species lower + tera -> mult
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

export function buildRankSvRaids(opts = {}) {
  const only7 = opts.only7 ?? ONLY7;
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

  // Attackers
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
    const hasTeraBlast = ids.has(851) || ids.has('851');
    if (!mvs.length && !hasTeraBlast) continue;
    const abs = [];
    for (const [aid] of (f.a || [])) {
      const fr = (ref.ab[String(aid)] || [])[0];
      const en = fr && lookupFr(maps.ab.fr2en, fr);
      if (en) abs.push(en);
    }
    if (!abs.length) abs.push('(no ability)'); // calc default
    const legend = !!(e.lg || e.my);
    attackers.push({ k: e.k, n: e.n, en: e.en, smo, types: e.t || f.t, moves: mvs, abilities: abs, legend, stats: f.s || e.s, hasTeraBlast });
  }


// Talents purement défensifs : écartés s’il en reste un autre (on cherche le meilleur talent offensif).
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
  'purifying salt', 'motor drive', 'lightning rod', 'volt absorb', 'water absorb'
]);
function offensiveAbilities(abs) {
  const all = abs && abs.length ? abs : ['(no ability)'];
  const off = all.filter(a => !DEFENSIVE_ABILITIES.has(String(a).toLowerCase()));
  if (off.length) return off;
  // À défaut, éviter les immunités spéciales (Pare-Balles, Torche, etc.)
  const noImm = all.filter(a => !IMMUNITY_ABILITIES.has(String(a).toLowerCase()));
  return noImm.length ? noImm : all;
}

  function fieldFor(abilityEn) {
    const w = WEATHER_OF[(abilityEn || '').toLowerCase()];
    return w ? new Field({ weather: w }) : new Field();
  }

  function bestOffensive(atk, bossPoke, bossTera, bossMoves, share, rounds, hpMult, bossLevel, bossK) {
    let best = null;
    const abs = offensiveAbilities(atk.abilities);
    for (const abil of abs) {
      const field = fieldFor(abil);
      // candidate moves: keep top by estimated BP*STAB*eff to limit work, plus all SE
      const scored = atk.moves.map(m => {
        const stab = atk.types.includes(m.typ) ? 1.5 : 1;
        const eff = effectiveness(m.typ, [bossTera]);
        return { m, est: m.pow * stab * (eff || 0.01) * (m.cls === 'p' || m.cls === 's' ? 1 : 0) };
      }).sort((a, b) => b.est - a.est);
      const cands = [];
      const seen = new Set();
      for (const x of scored) {
        if (cands.length >= 6) break;
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
        const tera = TYPE_CAP[mv.typ];
        let poke;
        try {
          const full = makePoke(atk.smo, { level: 100, nature, evs, ivs, ability: abil === '(no ability)' ? undefined : abil, item: 'Leftovers', teraType: tera });
          // PV just below max so Multiscale / similar don't s'appliquer à tout le combat
          poke = makePoke(atk.smo, { level: 100, nature, evs, ivs, ability: abil === '(no ability)' ? undefined : abil, item: 'Leftovers', teraType: tera, curHP: Math.max(1, full.maxHP() - 1) });
        } catch { continue; }
        let dmg = calcDmg(poke, bossPoke, mv.en, field, true);
        if (dmg <= 0) continue;
        let turns = moveTurns(mv.en);
        if (/solar beam|solar blade/i.test(mv.en) && field.weather && /Sun|Sunshine/i.test(String(field.weather))) turns = 1;
        const sh = shieldFactor(mv.typ, bossTera, share);
        const dpsOut = (dmg * sh) / turns;
        // incoming: average of boss damaging moves vs this tera'd attacker
        let inc = 0, nInc = 0;
        for (const bm of bossMoves) {
          inc += Math.max(0, calcDmg(bossPoke, poke, bm.en, field, false));
          nInc++;
        }
        const dpsIn = nInc ? inc / nInc : 8;
        const hp = poke.maxHP();
        const sc = scoreWindow(dpsOut, dpsIn, hp, rounds);
        if (!best || sc.score > best.sc.score) best = { mv, abil, nature, tera: mv.typ, sc, dmg };
      }
    }
    return best;
  }

  function bossPokemon(smo, { level, nature, ability, tera, evs }) {
    return makePoke(smo, {
      level,
      nature: nature || 'Serious',
      evs: evs || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      ability: ability || undefined,
      teraType: TYPE_CAP[tera] || tera,
    });
  }

  const hpMults = parseHpMults();
  const bosses = [];

  // 7★
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
    for (const [k, v] of hpMults) if (k.endsWith('|' + r.tera) || k.includes(smo.toLowerCase().replace(/ /g, ''))) { /* loose */ }
    // prefer exact parse: try href-like
    const hrefGuess = smo.toLowerCase().replace(/ /g, '').replace('-hisui', '-hisui');
    for (const [k, v] of hpMults) {
      if (k.split('|')[1] === r.tera && k.toLowerCase().includes(smo.split('-')[0].toLowerCase().replace(' ', ''))) { mult = v; break; }
    }
    // Magikarp etc. from map if unique
    bosses.push({
      id: r.id, k: r.k, n: r.n, stars: 7, tera: r.tera, game: 'sv', title: r.title || '',
      smo, level: r.lv || 100, nature: nat, ability: abil, moves: moveEns, hpMult: mult,
      share: SHIELD_SHARE_7, rounds: RAID_ROUNDS_7
    });
  }

  // 6★
  if (!only7) {
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
      // top 4 by BP * STAB
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
        share: SHIELD_SHARE_6, rounds: RAID_ROUNDS_6, random, defaultTera
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
    let bossBase;
    try {
      bossBase = bossPokemon(b.smo, { level: b.level, nature: b.nature, ability: b.ability, tera: teras[0] });
    } catch (e) {
      console.warn('boss skip', b.id, b.smo, e.message);
      continue;
    }
    const slot = {};
    const slotL = {};
    for (const tera of teras) {
      let bossPoke;
      try {
        bossPoke = bossPokemon(b.smo, { level: b.level, nature: b.nature, ability: b.ability, tera });
      } catch { continue; }
      const rows = [], rowsL = [];
      let pool = attackers;
      if (b.stars === 6 && attackers.length > 90) {
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
      for (const atk of pool) {
        const best = bestOffensive(atk, bossPoke, tera, b.moves, b.share, b.rounds, b.hpMult, b.level, b.k);
        if (!best) continue;
        const rec = { k: atk.k, legend: atk.legend, mv: best.mv, tera: best.tera, score: best.sc.score };
        rowsL.push(rec);
        if (!atk.legend) rows.push(rec);
      }
      const pack = L => {
        L.sort((a, b) => b.score - a.score);
        const top = L[0] ? L[0].score : 1;
        return L.slice(0, TOP_N).map(r => [fi(r.k), mi(r.mv.en, r.mv.fr), r.tera, Math.round(r.score / top * 1000) / 10]);
      };
      slot[tera] = pack(rows);
      slotL[tera] = pack(rowsL);
    }
    P[b.id] = slot;
    PL[b.id] = slotL;
    nCalcBoss++;
    if (nCalcBoss % 10 === 0) console.log('  ', nCalcBoss, '/', bosses.length, b.n, ((Date.now() - t0) / 1000).toFixed(1) + 's');
  }

  const B = bosses.filter(b => P[b.id]).map(b => [b.id, b.k, b.n, b.stars, b.tera, b.game, b.title || '']);
  let outB = B, outP = P, outPL = PL, outF = F, outMv = mv, outMvfr = mvfr;
  const prev = (only7 || ONLY_KEYS.length) && exists(OUT) ? JSON.parse(read(OUT)) : null;
  if (prev && (only7 || ONLY_KEYS.length)) {
    const nF = [], fMap = new Map(), nMv = [], nFr = [], mMap = new Map();
    const addF = k => { if (fMap.has(k)) return fMap.get(k); fMap.set(k, nF.length); nF.push(k); return nF.length - 1; };
    const addM = (en, fr) => { if (mMap.has(en)) return mMap.get(en); mMap.set(en, nMv.length); nMv.push(en); nFr.push(fr || en); return nMv.length - 1; };
    const remap = (table, srcF, srcMv, srcFr) => {
      const out = {};
      for (const [id, teras] of Object.entries(table || {})) {
        out[id] = {};
        for (const [tt, rows] of Object.entries(teras || {})) {
          out[id][tt] = rows.map(([a, b, c, d]) => [addF(srcF[a]), addM(srcMv[b], (srcFr || [])[b]), c, d]);
        }
      }
      return out;
    };
    const newIds = new Set(B.map(row => row[0]));
    const keep = (prev.B || []).filter(row => only7 && !ONLY_KEYS.length ? row[3] !== 7 : !newIds.has(row[0]));
    const ids = new Set(keep.map(row => row[0]));
    const oldP = Object.fromEntries(Object.entries(prev.P || {}).filter(([id]) => ids.has(id)));
    const oldL = Object.fromEntries(Object.entries(prev.L || {}).filter(([id]) => ids.has(id)));
    outP = { ...remap(oldP, prev.F, prev.mv, prev.mvfr), ...remap(P, F, mv, mvfr) };
    outPL = { ...remap(oldL, prev.F, prev.mv, prev.mvfr), ...remap(PL, F, mv, mvfr) };
    outB = [...keep, ...B];
    outF = nF; outMv = nMv; outMvfr = nFr;
  }

  const data = {
    date: '2026-11-24',
    src: 'Calcul interne avec la formule officielle de dégâts (@smogon/calc, licence MIT). Guides Serebii / Game8 utilisés uniquement pour vérifier le haut de quelques classements.',
    method: 'Attaquant de niveau 100, IV 31, 252 EV PV et 252 EV dans sa meilleure stat offensive, nature qui l’augmente, meilleur talent offensif, objet Restes. Il téracristallise dans le type de sa meilleure capacité offensive apprenable dans Écarlate / Violet. Les stratégies de soutien (Cognobidon, Grondement, soins) ne sont pas classées. Score : dégâts infligés pendant le combat (jusqu’au KO ou à la fin du minuteur) au carré, divisés par les dégâts encaissés — même idée que les classements de raids GO. Bouclier Téra simplifié (20 / 30 / 70 % selon le type). Les légendaires et fabuleux sont exclus par défaut (option pour les afficher).',
    scope: 'Raids 7★ événementiels et raids 6★ d’Écarlate / Violet (Paldea, Masque Turquoise, Disque Indigo). Les 5★ ÉV, les 5★ ÉB / Isolarmure / Couronneige et l’Aventure Dynamax restent pour une mise à jour suivante. Les 1–4★ n’apportent pas assez pour un classement dédié.',
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

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  console.log('rank-sv-raids:', ONLY7 ? '7★ seulement' : '7★ + 6★');
  const { data, unmapped, nAtk, nBoss, nLegend } = buildRankSvRaids({ only7: ONLY7 });
  if (process.env.DEBUG_BOSS) { console.log('DEBUG_BOSS: pas d’écriture'); process.exit(0); }
  const w = writeRankSvRaids(data);
  console.log(`attaquants ${nAtk} (dont ${nLegend} légendaires/fabuleux), boss calculés ${nBoss}, fiches ${data.B.length}, ${w.changed ? 'écrit' : 'inchangé'} ${w.file} ${w.bytes || ''} octets`);
  if (unmapped.length) console.log('non mappés (' + unmapped.length + '):', unmapped.slice(0, 30).join(', '));
  const d = data.P['887-dragon'] && data.P['887-dragon'].dragon;
  if (d) {
    console.log('top Lanssorien (sans légendaires):', d.map(r => `${data.F[r[0]]} ${data.mvfr[r[1]]} tera ${r[2]} ${r[3]}%`).join(' · '));
  }
}
