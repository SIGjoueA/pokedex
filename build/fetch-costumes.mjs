// v60.16: build docs/data/costumes.json (GO event costumes).
// Sources (snapshots in build/costumes-src/, refreshable):
//   - Bulbapedia « Event Pokémon (GO) »: released list, shiny, image codes
//   - Poképédia « Pokémon costumés »: French names and sprites (with sources)
//   - Official pokemongo.com/fr posts for 2026 names not yet on Poképédia
//   - pokemon-go-api assets (PokeMiners-derived) when a costume enum is known
// Usage: node build/fetch-costumes.mjs
// Does not invent French names: unknown ones keep the English label (frs: "en").
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, 'costumes-src');
const DOCS = path.resolve(HERE, '../docs');
const CORE = JSON.parse(fs.readFileSync(path.join(DOCS, 'data/core.json'), 'utf8'));
const FR_OF = {};
const KEYS = new Set();
for (const e of CORE.e) {
  KEYS.add(e.k);
  if (!FR_OF[e.id]) FR_OF[e.id] = e.n;
}

const bulbWt = fs.readFileSync(path.join(SRC, 'bulbapedia-event-pokemon.wiki'), 'utf8');
const ppeWt = fs.readFileSync(path.join(SRC, 'pokepedia-costumes.wiki'), 'utf8');

function wikiText(s) {
  return String(s || '')
    .replace(/\{\{anchor\|[^}]+\}\}/g, '')
    .replace(/\{\{Shinystar\/GO\|[^}]*\}\}/g, '')
    .replace(/\{\{OBP\|([^}|]+)\|[^}]*\}\}/g, '$1')
    .replace(/\{\{GO\|([^}|]+)(?:\|[^}]*)?\}\}/g, '$1')
    .replace(/\{\{ga\|([^}|]+)(?:\|[^}]*)?\}\}/g, '$1')
    .replace(/\[\[(?:[^\]|#]+[|#])?([^\]]+)\]\]/g, '$1')
    .replace(/'''|''/g, '')
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '')
    .replace(/<ref[^/]*\/>/g, '')
    .replace(/<br\s*\/?>/gi, ' / ')
    .replace(/<\/?small>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function slug(s) {
  return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'x';
}

function parseBulb(wt) {
  const start = wt.indexOf('{| style="margin:auto; background: #{{contest color}}');
  const end = wt.indexOf('==Trivia==');
  const table = wt.slice(start, end);
  const rows = table.split(/\n\|- style="background: #fff"\n/).slice(1);
  const out = [];
  let form = '';
  const MSP = /\{\{MSP\/GO\|[^{}]*?(\d{4}[A-Za-z0-9]*)\|([^}|]+)\}\}/g;
  for (const row of rows) {
    const first = row.split('\n')[0];
    const hasForm = /^\|\s*(?:rowspan="?\d+"?\s*\|)?\s*(?:\[\[|\{\{|[A-Za-zÀ-ÿ'0-9])/.test(first)
      && !/\{\{MSP\/GO/.test(first);
    if (hasForm) {
      const f = first.replace(/^\|\s*(?:rowspan="?\d+"?\s*\|)?\s*/, '');
      form = wikiText(f);
    }
    const shiny = /Shinystar\/GO/.test(row);
    const parts = [];
    let buf = [];
    for (const line of row.split('\n')) {
      if (line.startsWith('|') && !line.startsWith('|-')) {
        if (buf.length) parts.push(buf.join('\n'));
        buf = [line];
      } else buf.push(line);
    }
    if (buf.length) parts.push(buf.join('\n'));
    const cells = hasForm ? parts.slice(1) : parts;
    const mspCells = cells.filter(c => /\{\{MSP\/GO/.test(c) || /^\|\s*$/.test(c.trim()));
    const take = (cell, evo) => {
      if (!cell) return;
      const re = new RegExp(MSP.source, 'g');
      let m;
      while ((m = re.exec(cell))) out.push({ form, code: m[1], enName: m[2], evo, shiny });
    };
    take(mspCells[0], 0);
    take(mspCells[1], 1);
  }
  return out;
}

function splitCode(code) {
  const m = code.match(/^(\d{4})([A-Za-z0-9]*)$/);
  if (!m) return { dex: 0, rest: code, suffix: slug(code), skip: false };
  const dex = +m[1], rest = m[2];
  let formKey = null, suffix = rest;
  const size = rest.match(/^(Sm|La|Su)([A-Z].*)$/);
  if (size && (dex === 710 || dex === 711)) {
    formKey = dex + ({ Sm: '-small', La: '-large', Su: '-super' }[size[1]]);
    suffix = size[2];
  } else if ((dex === 710 || dex === 711) && /^Halloween/.test(rest)) {
    formKey = String(dex);
    suffix = rest;
  }
  const gal = rest.match(/^G([A-Z].*)$/);
  if (!formKey && gal && KEYS.has(dex + '-galar')) {
    formKey = dex + '-galar';
    suffix = gal[1];
  }
  const ant = rest.match(/^A(.+)$/);
  if (!formKey && ant && KEYS.has(dex + '-antique')) {
    formKey = dex + '-antique';
    suffix = ant[1];
  }
  if (dex === 150 && (rest === 'A' || rest === 'Armored')) {
    return { dex, rest, suffix: 'A', formKey: '150-armored', skip: true };
  }
  return { dex, rest, suffix: suffix || rest || slug(code), formKey, skip: false };
}

const bulbRows = parseBulb(bulbWt);
const bulbItems = [];
for (const r of bulbRows) {
  const cm = r.code.match(/<!--\s*([^>]+?)\s*-->/); r.code = (cm ? cm[1] : r.code).replace(/[^A-Za-z0-9]/g, '') || r.code;
  const p = splitCode(r.code);
  if (p.skip) continue;
  const id = p.dex + '-' + slug(p.suffix || r.form || r.code);
  bulbItems.push({
    id, dex: p.dex, suffix: p.suffix || '', form: r.form, enName: r.enName,
    evo: !!r.evo, sh: !!r.shiny, k: p.formKey || undefined, code: r.code,
  });
}

{
  const by = new Map();
  for (const it of bulbItems) {
    const prev = by.get(it.id);
    if (!prev) by.set(it.id, it);
    else { prev.sh = prev.sh || it.sh; prev.evo = prev.evo && it.evo; }
  }
  bulbItems.length = 0;
  bulbItems.push(...by.values());
}

function parsePpe(wt) {
  const rows = [];
  for (const ch of wt.split('\n|-')) {
    const fileM = ch.match(/\[\[Fichier:([^\]|]+)/);
    if (!fileM) continue;
    const file = fileM[1].trim().replace(/ /g, '_');
    const dexM = file.match(/^Sprite_(\d+)_/);
    if (!dexM) continue;
    const dex = +dexM[1];
    const parts = ch.trim().split(/\n\|\s*/);
    let den = '';
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].includes('Fichier:') && parts[i + 1]) { den = parts[i + 1]; break; }
    }
    if (!den) continue;
    den = wikiText(den.replace(/\(\(([^)]+)\)\)/g, '($1)'));
    const unoff = /non-officiel/.test(ch);
    rows.push({ dex, file, den, unoff });
  }
  return rows;
}
const ppeRows = parsePpe(ppeWt);

function tokens(s) {
  return new Set(slug(s).split('-').filter(t => t.length > 1 && !['go', 'sprite', 'male', 'female'].includes(t)));
}

const HINTS = {
  holiday2016: 'chapeau festif', anniversary: 'chapeau de fete violet', o: 'casquette originale',
  w: 'casquette monde', halloween2017: 'chapeau de sorciere', halloween: 'chapeau de sorciere',
  summer2018: 'style estival', squirtlesquad: 'lunettes de soleil', sunglasses: 'lunettes de soleil',
  hf: 'casquette a design de hf', crown: 'couronne de fleurs', straw: 'chapeau de paille',
  shedinja: 'munja', cubone: 'osselait', yamask: 'tutafeh', mimikyu: 'mimiqui', beanie: 'bonnet',
  clone: 'clone', po: 'catcheur', ro: 'rockeur', phd: 'docteur', belle: 'star',
  safari: 'chapeau de safari', flowerhat: 'coiffe de fleurs', charizard: 'dracaufeu',
  umbreon: 'noctali', rayquaza: 'rayquaza', lucario: 'lucario', fly: 'volant ballons',
  fly5: 'ballon en forme de 5', visor: 'visiere pikachu', fashion: 'costume fashion',
  explorer: 'explorateur', wintercarnival: 'carnaval d hiver', newyearshat: 'chapeau nouvel an',
  holidayribbon: 'ruban de fetes', meoetta: 'chapeau meloetta', halloweenmischief: 'chenapans d halloween',
  kariyushi: 'kariyushi', gracidea: 'gracidee', tcg: 'chapeau du jcc', cowboy: 'cowboy',
  cake: 'gateau', wcs2022: 'championnats du monde 2022', wcs2023: 'championnats du monde 2023',
  wcs2024: 'championnats du monde 2024', wcs2025: 'championnats du monde 2025',
  wcs2026: 'championnats du monde 2026', shaymin: 'echarpe shaymin', spookyfestival: 'festival effrayant',
  cempasuchil: 'cempasuchil', partytophat: 'haut-de-forme de fete', nightcap: 'bonnet de nuit',
  satchel: 'besace', trickstreats: 'tricks', captainpikachu: 'casquette de cap', sari: 'sari',
  saree: 'sari', kurta: 'kurta', hanbok: 'hanbok', studdedjacket: 'blouson',
  holidayattire: 'tenue des fetes', swimring: 'bouee', headband: 'bandeau',
  wildernesscape: 'cape des terres sauvages', baseballjersey: 'baseball', marathonvisor: 'marathon',
  excavator: 'excavateur', astronaut: 'astronaute', capelet: 'pelerine', tophat: 'haut-de-forme',
  bow: 'noeud', jacket: 'veste', pokopiahat: 'chapeau', pokopiacap: 'casquette',
};

function fileHintList(it) {
  const out = [];
  const suf = it.suffix || '';
  const form = (it.form || '').toLowerCase();
  const FILE_HINT = {
    Holiday2016: 'chapeau festif', Anniversary: 'chapeau de fete', Fall2018: 'design de hf',
    Feb2019: 'detective', Winter2018: 'bonnet', Holiday2023: 'tenue des fetes', Winter2020: 'carnaval',
    Jan2020: 'chapeau de fete rouge', Jul2025: 'chapeau de fete', Jul2023: 'chapeau de fete',
    Copy2019: 'clone', PhD: 'docteur', Po: 'catcheur', Ro: 'rockeur', Belle: 'star',
    April2020: 'coiffe de fleurs', Kanto2020: 'dracaufeu', Johto2020: 'noctali',
    Hoenn2020: 'rayquaza', Sinnoh2020: 'lucario', FlyOkinawa: 'couleurs differentes',
    FlyGreen: 'ballons verts', FlyPurple: 'ballons violets', FlyOrange: 'ballons orange',
    Fly5: 'forme de 5', Costume2: 'nouvel an', Spring2023: 'cerisier',
    November2018: 'couronne de fleurs', Summer2018: 'style estival', Halloween2017: 'sorciere',
    Halloween2021: 'chenapans', Safari: 'safari', Explorer: 'explorateur',
    Kariyushi: 'kariyushi', Gracidea: 'gracidee', Cake: 'gateau', Shaymin: 'shaymin',
    WCS2022: '2022', WCS2023: '2023', WCS2024: '2024', WCS2025: 'blouson', WCS2026: '2026',
    GoTour2023Brendan: 'brice', GoTour2023May: 'flora',
    GoTour2024Lucas: 'louka', GoTour2024Dawn: 'aurore', GoTour2024Rei: 'aurel', GoTour2024Akari: 'lucia',
    GoTour2025Hilbert: 'ludwig', GoTour2025Hilda: 'ludvina', GoTour2025Nate: 'melis', GoTour2025Rosa: 'echo',
    GoTour2026Calem: 'kalem', GoTour2026Serena: 'serena', GoTour2026Red: 'red', GoTour2026Leaf: 'leaf',
    GoTour2026Ethan: 'luth', GoTour2026Lyra: 'celesta',
    FormalRed: 'formel accessoires rouges', FormalBlue: 'formel accessoires bleus', FormalYellow: 'formel accessoires jaunes',
    DapperRed: 'elegant accessoires rouges', DapperBlue: 'elegant accessoires bleus', DapperYellow: 'elegant accessoires jaunes',
    Indonesia: 'football indonesien', Varsity: 'blouson', SwimRing: 'bouee', Headband: 'bandeau',
    Wilderness: 'terres sauvages', BaseballJersey: 'baseball', MarathonVisor: 'marathon',
    Excavator: 'excavateur', Willow: 'assistant', Cosmog: 'cosmog', Astronaut: 'astronaute',
    Capelet: 'pelerine', TopHat: 'haut-de-forme', Bow: 'noeud', Jacket: 'veste',
    PokopiaHat: 'chapeau', PokopiaCap: 'casquette', Nightcap: 'bonnet de nuit', Satchel: 'besace',
    Straw: 'paille', Beanie: 'bonnet', Kurta: 'kurta', Sari: 'sari', Saree: 'sari', Hanbok: 'hanbok',
    PartyTopHat: 'haut-de-forme de fete', Visor: 'visiere pikachu',

    TShirtGreen: 't-shirt vert', TShirtPurple: 't-shirt violet', TShirtBlue: 't-shirt bleu', TShirtBatik: 'batik',
    Amethyst: 'amethyste', Quartz: 'quartz', Pyrite: 'pyrite', Malachite: 'malachite', Aquamarine: 'aigue-marine',
    RedMonocle: 'formel accessoires rouges', BlueMonocle: 'formel accessoires bleus', YellowMonocle: 'formel accessoires jaunes',
    RedGoggles: 'elegant accessoires rouges', BlueGoggles: 'elegant accessoires bleus', YellowGoggles: 'elegant accessoires jaunes',
    IndonesiaJersey: 'football indonesien', BaseballJersey: 'baseball', Fossil: 'excavateur',
    MysticHat: 'team mystic', InstinctHat: 'team instinct', ValorHat: 'team valor',
    Y2020: 'lunettes 2020', Li: 'star', FlyRed: 'ballons speciaux',
    Holiday2022: 'chapeau de fetes', Holiday2021: 'fetes sous-marines',
    Costume2020: '', Mystic: 'blanche', Hat: 'chapeau',
    DayScarf: 'echarpe de jour', NightScarf: 'echarpe de nuit',
    Sun: 'couronne en forme de soleil', Moon: 'couronne en forme de lune',
    Fall2023: 'deguisement d halloween', Halloween2022: 'festival effrayant', Anniversary9: '9e anniversaire', Anniversary10: '10e',
    WCS2026: '2026', GOFest2021: 'meloetta', O: 'casquette originale', W: 'casquette monde',

  };
  if (FILE_HINT[suf]) out.push(FILE_HINT[suf]);
  const FORM_FILE = {
    'festive hat': 'chapeau festif', 'party hat': 'chapeau de fete', 'party hat (red)': 'chapeau de fete',
    'party hat (green)': 'chapeau de fetes', 'witch hat': 'sorciere', 'summer-style': 'style estival',
    'squirtle squad sunglasses': 'lunettes de soleil', 'h.f. custom cap': 'design de hf',
    'flower crown': 'couronne de fleurs', 'straw hat': 'paille', 'beanie hat': 'bonnet',
    'holiday outfit': 'carnaval', "new year's hat": 'nouvel an', 'clone': 'clone',
    'flower hat': 'coiffe de fleurs', 'charizard hat': 'dracaufeu', 'umbreon hat': 'noctali',
    'rayquaza hat': 'rayquaza', 'lucario hat': 'lucario', 'flying pikachu': 'ballons',
    'pikachu visor': 'visiere pikachu', 'fashionable costume': 'fashion', 'explorer': 'explorateur',
    'winter carnival': 'carnaval', 'holiday ribbon': 'ruban de fetes', 'halloween mischief': 'chenapans',
    "lucas's hat": 'louka', "dawn's hat": 'aurore', "brendan's hat": 'brice', "may's bow": 'flora',
    "rei's cap": 'aurel', "akari's kerchief": 'lucia', "hilbert's hat": 'ludwig', "hilda's hat": 'ludvina',
    "nate's visor": 'melis', "rosa's visor": 'echo', "calem's hat": 'kalem', "serena's hat": 'serena',
    "red's hat": 'red', "leaf's hat": 'leaf', "ethan's hat": 'luth', "lyra's hat": 'celesta',
    'detective pikachu': 'detective', 'mimikyu costume': 'mimiqui', 'yamask costume': 'tutafeh',
    'shedinja costume': 'munja', 'cubone costume': 'osselait', 'kariyushi shirt': 'kariyushi',
    'gracidea flower': 'gracidee', 'pokemon tcg hat': 'jcc', 'cake costume': 'gateau',
    'world championships': 'championnats du monde', 'shaymin scarf': 'shaymin',
    'spooky festival': 'festival effrayant', 'party top hat': 'haut-de-forme de fete',
    'nightcap': 'bonnet de nuit', 'captain pikachu': 'casquette de cap', 'saree': 'sari', 'kurta': 'kurta',
    'holiday attire': 'tenue des fetes', 'hat and capelet': 'pelerine', 'top hat': 'haut-de-forme',
    'bow': 'noeud', 'modern jacket': 'veste', 'pokopia hat': 'chapeau', 'pokopia cap': 'casquette',
    'astronaut': 'astronaute', 'cherry blossoms': 'cerisier', 'varsity jacket': 'blouson',
    'mega banette costume': 'mega-branette', 'scarf': 'echarpe',
    'blanche-themed accessory': 'blanche', '2020/2021/2022 glasses': 'lunettes 2020',
    'undersea holiday': 'sous-marines', 'holiday hat': 'chapeau de fetes',
    'tricks & treats': 'deguisement d halloween', 'sun scarf': 'echarpe de jour', 'moon scarf': 'echarpe de nuit',
    '9th anniversary coin': '9e anniversaire', 'formal pikachu with red accents': 'formel accessoires rouges',
    'formal pikachu with blue accents': 'formel accessoires bleus', 'formal pikachu with yellow accents': 'formel accessoires jaunes',
    'dapper pikachu with red accents': 'elegant accessoires rouges', 'dapper pikachu with blue accents': 'elegant accessoires bleus',
    'dapper pikachu with yellow accents': 'elegant accessoires jaunes',
    'indonesia football jersey': 'football indonesien', 'excavator pikachu': 'excavateur',
    "professor willow's assistant": 'assistant', 'cosmog-themed spacesuit': 'cosmog', 'hanbok': 'hanbok'
  };
  if (FORM_FILE[form]) out.push(FORM_FILE[form]);
  for (const [k, v] of Object.entries(HINTS)) {
    if (slug(suf).includes(k) || slug(form).includes(k)) out.push(v);
  }
  if (suf === 'Fall2019' || /costume$/.test(form)) {
    if (/yamask/.test(form) || it.dex === 7) out.push('tutafeh');
    if (/mimikyu/.test(form) || (it.dex === 25 && /mimikyu|costume/.test(form))) out.push('mimiqui');
    if (/shedinja/.test(form) || it.dex === 1 && /shedinja|costume/.test(form)) out.push('munja');
    if (/cubone/.test(form) || it.dex === 4 && /cubone|costume/.test(form)) out.push('osselait');
  }
  if (/meloetta/.test(form) || /Meloetta/.test(suf)) out.push('meloetta');
  if (/gems1/i.test(suf) || /lucas/.test(form)) out.push('louka');
  if (/gems2/i.test(suf) || /dawn/.test(form)) out.push('aurore');
  return out.filter(Boolean);
}

function hintOf(it) { return fileHintList(it).join(' ') + ' ' + it.form + ' ' + it.suffix; }

function scoreMatch(it, p) {
  if (p.dex !== it.dex) return -1;
  const target = slug(p.file + ' ' + p.den);
  // Unique files must not be stolen by unrelated costumes
  if (/casquette-originale/.test(target) && it.suffix !== 'O') return -1;
  if (/casquette-monde/.test(target) && it.suffix !== 'W') return -1;

  let n = 0;
  for (const h of fileHintList(it)) {
    const hs = slug(h);
    if (hs.length >= 4 && target.includes(hs)) n += 8;
    else {
      const parts = hs.split('-').filter(x => x.length > 2);
      const hit = parts.filter(x => target.includes(x)).length;
      if (hit) n += hit * 2;
    }
  }
  const a = tokens(hintOf(it) + ' ' + it.code + ' ' + it.form);
  const b = tokens(p.file + ' ' + p.den);
  for (const t of a) if (b.has(t)) n++;
  const suf = slug(it.suffix);
  if (suf.length > 3 && target.includes(suf)) n += 6;
  return n;
}

const usedPpe = new Set();
const matches = new Map();
{
  const pairs = [];
  for (let i = 0; i < bulbItems.length; i++) {
    const it = bulbItems[i];
    const cands = ppeRows.map((p, j) => ({ j, p, s: scoreMatch(it, p) })).filter(x => x.s > 0);
    cands.sort((a, b) => b.s - a.s);
    if (cands[0]) pairs.push({ i, ...cands[0] });
  }
  pairs.sort((a, b) => b.s - a.s);
  for (const x of pairs) {
    if (matches.has(x.i) || usedPpe.has(x.j) || x.s < 2) continue;
    matches.set(x.i, x.j);
    usedPpe.add(x.j);
  }
  const leftB = bulbItems.map((it, i) => i).filter(i => !matches.has(i));
  const leftP = ppeRows.map((p, j) => j).filter(j => !usedPpe.has(j));
  const byDexB = {}, byDexP = {};
  for (const i of leftB) (byDexB[bulbItems[i].dex] ||= []).push(i);
  for (const j of leftP) (byDexP[ppeRows[j].dex] ||= []).push(j);
  for (const [d, bs] of Object.entries(byDexB)) {
    const ps = byDexP[d] || [];
    if (bs.length === 1 && ps.length === 1) {
      matches.set(bs[0], ps[0]);
      usedPpe.add(ps[0]);
    }
  }
}

function shortFr(den, species) {
  let s = String(den || '').split(' / ')[0].trim();
  s = s.replace(/\s*\([^)]*\)\s*$/, '').trim();
  if (species) {
    const re = new RegExp('^' + species.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s+', 'i');
    s = s.replace(re, '').trim();
  }
  s = s.replace(/^(coiffée? d['’]une?\s+|coiffée? de\s+sa\s+|coiffée? de\s+la\s+|coiffée? du\s+|coiffée? des\s+|portant une?\s+|portant des\s+|portant le\s+|portant la\s+|portant les\s+|vêtu[e]? d['’]un(?:e)?\s+|ornée? d['’]\s+|ornée? de\s+|à la tenue de\s+|et son\s+|et sa\s+|avec un\s+|avec une\s+|avec des\s+|tenant une?\s+|au costume d['’]\s+|à\s+)/i, '');
  s = s.replace(/^(de|d['’])\s+/i, '').trim();
  if (!s) s = den.split(' / ')[0].trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const OFFICIAL = {
  '25-capelet': 'Chapeau et pèlerine',
  '41-tophat': 'Haut-de-forme',
  '42-tophat': 'Haut-de-forme',
  '169-tophat': 'Haut-de-forme',
  '854-bow': 'Nœud',
  '854-abow': 'Nœud (Authentique)',
  '855-bow': 'Nœud',
  '855-abow': 'Nœud (Authentique)',
  '25-astronaut': 'Astronaute',
  '132-pokopiahat': 'Chapeau',
  '132-pokopiacap': 'Casquette',
};

const ENUM_OF = {
  holiday2016: 'HOLIDAY_2016', anniversary: 'ANNIVERSARY', anniversary2022noevolve: 'ANNIVERSARY_2022_NOEVOLVE',
  o: 'ONE_YEAR_ANNIVERSARY', halloween2017: 'HALLOWEEN_2017', summer2018: 'SUMMER_2018',
  winter2018: 'WINTER_2018', november2018: 'NOVEMBER_2018', feb2019: 'FEB_2019',
  may2019noevolve: 'MAY_2019_NOEVOLVE', jan2020noevolve: 'JAN_2020_NOEVOLVE',
  april2020noevolve: 'APRIL_2020_NOEVOLVE', spring2020noevolve: 'SPRING_2020_NOEVOLVE',
  fall2020noevolve: 'FALL_2020_NOEVOLVE', hoenn2020noevolve: 'HOENN_2020_NOEVOLVE',
  johto2020noevolve: 'JOHTO_2020_NOEVOLVE', kanto2020noevolve: 'KANTO_2020_NOEVOLVE',
  sinnoh2020noevolve: 'SINNOH_2020_NOEVOLVE', safari2020noevolve: 'SAFARI_2020_NOEVOLVE',
  gofest2021noevolve: 'GOFEST_2021_NOEVOLVE', halloween2021noevolve: 'HALLOWEEN_2021_NOEVOLVE',
  holiday2021noevolve: 'HOLIDAY_2021_NOEVOLVE', fashion2021noevolve: 'FASHION_2021_NOEVOLVE',
  gems12021noevolve: 'GEMS_1_2021_NOEVOLVE', gems22021noevolve: 'GEMS_2_2021_NOEVOLVE',
  gofest2022noevolve: 'GOFEST_2022_NOEVOLVE', holiday2022: 'HOLIDAY_2022', fall2022: 'FALL_2022',
  fall2022noevolve: 'FALL_2022_NOEVOLVE', tcg2022noevolve: 'TCG_2022_NOEVOLVE',
  jan2022noevolve: 'JAN_2022_NOEVOLVE', jan2023noevolve: 'JAN_2023_NOEVOLVE',
  spring2023: 'SPRING_2023', spring2023instinct: 'SPRING_2023_INSTINCT',
  spring2023valor: 'SPRING_2023_VALOR', spring2023mystic: 'SPRING_2023_MYSTIC',
  may2023: 'MAY_2023', fall2023: 'FALL_2023', fall2023noevolve: 'FALL_2023_NOEVOLVE',
  holiday2023: 'HOLIDAY_2023', gotour2023bandananoevolve: 'GOTOUR_2023_BANDANA_NOEVOLVE',
  gotour2023hatnoevolve: 'GOTOUR_2023_HAT_NOEVOLVE', jan2024: 'JAN_2024', spring2024: 'SPRING_2024',
  summer2024: 'SUMMER_2024', fall2024: 'FALL_2024', winter2024: 'WINTER_2024',
  anniversary2024: 'ANNIVERSARY_2024', halloween2025: 'HALLOWEEN_2025', fashion2025: 'FASHION_2025',
  indonesia2025noevolve: 'INDONESIA_2025_NOEVOLVE', horizons2025noevolve: 'HORIZONS_2025_NOEVOLVE',
  nightcap: 'NIGHTCAP', pi: 'PI', pinoevolve: 'PI_NOEVOLVE', royalnoevolve: 'ROYAL_NOEVOLVE',
};

// Poképédia renamed some "Formel avec accessoires" files to "Élégant avec accessoires".
const FILE_ALIAS = [
  [/Formel_avec_accessoires/g, 'Élégant_avec_accessoires'],
  [/Formel avec accessoires/g, 'Élégant avec accessoires'],
];
function ppeUrl(file) {
  let f = file.replace(/_/g, ' ');
  for (const [re, to] of FILE_ALIAS) f = f.replace(re, to);
  return 'https://www.pokepedia.fr/Special:FilePath/' + encodeURIComponent(f).replace(/'/g, '%27');
}
function imgFor(it, ppe) {
  // Prefer a Poképédia sprite when we have one: the jsDelivr enum CDN is incomplete (missing 2023–2026 files).
  if (ppe) return ppeUrl(ppe.file);
  const enu = ENUM_OF[slug(it.suffix)];
  if (enu) return 'https://cdn.jsdelivr.net/gh/pokemon-go-api/assets@main/Pokemon/pm' + it.dex + '.c' + enu + '.icon.png';
  return '';
}

async function resolveAll(species) {
  const recs = Object.values(species).flat().filter(c => c.img);
  const ua = { 'User-Agent': 'PokedexCostumeBuild/1.0 (https://sigjouea.github.io/pokedex/)' };
  const byUrl = new Map();
  for (const c of recs) (byUrl.get(c.img) || byUrl.set(c.img, []).get(c.img)).push(c);
  let ok = 0, dropped = 0, retarget = 0;
  const q = [...byUrl.keys()];
  async function fetchOk(url) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const r = await fetch(url, { headers: ua, redirect: 'follow' });
        const ct = (r.headers.get('content-type') || '');
        if (r.ok && ct.startsWith('image/')) return r.url || url;
      } catch {}
      await new Promise(res => setTimeout(res, 400 * (attempt + 1)));
    }
    return null;
  }
  async function worker() {
    while (q.length) {
      const url = q.shift();
      const final = await fetchOk(url);
      for (const c of byUrl.get(url)) {
        if (final) {
          if (final !== url) retarget++;
          c.img = final;
          ok++;
        } else {
          delete c.img;
          dropped++;
        }
      }
    }
  }
  await Promise.all(Array.from({ length: 8 }, worker));
  return { ok, dropped, retarget, unique: byUrl.size };
}


const MANUAL_FILE = {
  '25-holiday2023': 'Tenue_des_fêtes',
};
for (let i = 0; i < bulbItems.length; i++) {
  if (matches.has(i)) continue;
  const want = MANUAL_FILE[bulbItems[i].id];
  if (!want) continue;
  const j = ppeRows.findIndex((p, jj) => !usedPpe.has(jj) && p.dex === bulbItems[i].dex && p.file.includes(want.replace(/ /g, '_')));
  if (j >= 0) { matches.set(i, j); usedPpe.add(j); }
}

const species = {};
let nPpe = 0, nOff = 0, nEn = 0, nImg = 0;
const unmatchedBulb = [], unmatchedPpe = [];

for (let i = 0; i < bulbItems.length; i++) {
  const it = bulbItems[i];
  if (!FR_OF[it.dex]) { unmatchedBulb.push({ reason: 'unknown species', ...it }); continue; }
  const p = matches.has(i) ? ppeRows[matches.get(i)] : null;
  let n, frs;
  if (OFFICIAL[it.id]) { n = OFFICIAL[it.id]; frs = 'off'; nOff++; }
  else if (p) {
    n = shortFr(p.den, FR_OF[it.dex]);
    frs = p.unoff ? 'ppe-unoff' : 'ppe';
    nPpe++;
  } else {
    n = (it.form || it.suffix || it.enName).replace(/^(?:Pikachu|Charmander|Caterpie) wearing (?:a |an )?/i, ''); n = n.charAt(0).toUpperCase() + n.slice(1);
    frs = 'en';
    nEn++;
    unmatchedBulb.push(it);
  }
  const img = imgFor(it, p);
  if (img) nImg++;
  const rec = { id: it.id, n, en: it.form, sh: it.sh ? 1 : 0, frs };
  if (it.evo) rec.evo = 1;
  if (it.k) rec.k = it.k;
  if (img) rec.img = img;
  if (it.suffix) rec.x = it.suffix;
  (species[it.dex] ||= []).push(rec);
}

for (let j = 0; j < ppeRows.length; j++) if (!usedPpe.has(j)) unmatchedPpe.push(ppeRows[j]);


// Evolution-only visors share the unofficial Poképédia name of the family visor.
for (const recs of Object.values(species)) {
  for (const c of recs) {
    if (c.frs !== 'en' || c.en !== 'Pikachu visor') continue;
    const donor = Object.values(species).flat().find(x => x.en === 'Pikachu visor' && x.frs !== 'en');
    if (donor) { c.n = donor.n; c.frs = donor.frs; if (donor.img && !c.img) c.img = donor.img; }
  }
}

// Keep Bulbapedia table order (chronological by event). Do not sort alphabetically:
// that mixed English and French labels and hid the history of a long list such as Pikachu's.

if (!process.env.SKIP_IMG_RESOLVE) {
  const r = await resolveAll(species);
  nImg = Object.values(species).flat().filter(c => c.img).length;
  console.log(JSON.stringify({ resolved: r, withImage: nImg }));
}

const total = Object.values(species).reduce((n, l) => n + l.length, 0);
const data = {
  v: '2026-11-23',
  src: 'Bulbapedia Event Pokémon (GO) ; Poképédia, section Pokémon costumés ; pokemongo.com/fr (Halloween 2026, World Space Week 2026, Pokopia) ; images : assets pokemon-go-api (PokeMiners) et sprites Poképédia',
  n: total,
  s: species,
};

fs.writeFileSync(path.join(DOCS, 'data/costumes.json'), JSON.stringify(data));
fs.writeFileSync(path.join(HERE, 'go-costumes.json'), JSON.stringify(data, null, 2));

const report = {
  costumes: total,
  species: Object.keys(species).length,
  names: { ppe: nPpe, official: nOff, english_unverified: nEn },
  withImage: nImg,
  unmatchedBulb: unmatchedBulb.map(x => ({ id: x.id, dex: x.dex, form: x.form, suffix: x.suffix, code: x.code })),
  unmatchedPpe: unmatchedPpe.map(x => ({ dex: x.dex, file: x.file, den: x.den })),
};
fs.writeFileSync(path.join(SRC, 'match-report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ costumes: total, species: report.species, names: report.names, withImage: nImg, unmatchedBulb: unmatchedBulb.length, unmatchedPpe: unmatchedPpe.length }, null, 2));
