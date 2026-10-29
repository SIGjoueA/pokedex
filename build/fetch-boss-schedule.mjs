// v61 : calendrier des boss (raids + Combats Max) → docs/data/boss-schedule.json
// Source : ScrapedDuck (github.com/bigfoott/ScrapedDuck, branche data : events.json, copie JSON des événements de Leek Duck, mise à jour plusieurs fois par jour).
// Pour les Lundis Max, la page Leek Duck de l'événement donne la semaine complète (« from … through … »).
// Heures = heure locale du joueur (pas de « Z ») ; les rares horaires en UTC (« Z ») sont gardés tels quels.
// Fenêtre : en cours + début dans les 15 prochains jours. Les noms non reconnus ou absents de nos classements sont listés dans « nm » (jamais supprimés en silence).
// Usage : node build/fetch-boss-schedule.mjs   (routine du lundi ; peut tourner plus souvent)
import fs from 'node:fs';
const R = new URL('..', import.meta.url).pathname, D = R + 'docs/data';
const SRC = 'https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/events.json';
const UA = { 'user-agent': 'Mozilla/5.0 (pokedex boss-schedule)' };
const ev = await (await fetch(SRC, { headers: UA })).json();
const core = JSON.parse(fs.readFileSync(D + '/core.json')).e;
const rd = JSON.parse(fs.readFileSync(D + '/rank-raid.json')), mx = JSON.parse(fs.readFileSync(D + '/rank-max.json'));
const EN = new Map(core.filter(e => e.en).map(e => [e.en.toLowerCase(), e.k]));
const BASEF = new Set(['normal', 'altered', 'incarnate', 'land', 'ordinary', 'aria', 'standard', 'hero', 'average', 'baile', 'midday', 'red striped', 'solo', 'disguised', 'amped', 'full belly', 'single strike']);
const toKey = raw => { // nom anglais Leek Duck → clé de l'appli
  let n = raw.trim().replace(/\s+Formes?\)/i, ')'), sh = 0;
  if (/^shadow /i.test(n)) { sh = 1; n = n.slice(7); }
  const m = /^(.*?) \((.*)\)$/.exec(n), base = m ? m[1] : n, form = m ? m[2] : '';
  const c = form ? (BASEF.has(form.toLowerCase()) ? [base] : [`${form} ${base}`, `${base} ${form}`, `${base} (${form})`]) : [n];
  for (const x of c) { const k = EN.get(x.toLowerCase()); if (k) return { k, sh }; }
  return { k: null, sh };
};
const split = s => { // « Cresselia and Darkrai », « Deoxys (Normal, Defense, Attack, and Speed Formes) »
  const m = /^(.*?) \(([^)]*,[^)]*)\)$/.exec(s.replace(/\s+Formes?\)/i, ')'));
  if (m) return m[2].split(/,\s*(?:and\s+)?|\s+and\s+/).filter(Boolean).map(f => `${m[1]} (${f.trim()})`);
  return s.split(/,\s*(?:and\s+)?|\s+and\s+/).map(x => x.trim()).filter(Boolean);
};
const RAIDK = new Set(rd.B.map(b => b[0] + '|' + (/obscur/.test(b[2]) ? 1 : 0))), MAXK = new Set(mx.B.map(b => b[0]));
const now = new Date(), lim = new Date(now.getTime() + 15 * 864e5);
const loc = s => s && s.replace(/\.000(Z?)$/, '$1').replace(/:00$/, '');
const page = async u => { try { const t = await (await fetch(u, { headers: UA })).text(); return t.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '); } catch { return ''; } };
const MO = 'January February March April May June July August September October November December'.split(' ');
const pdate = s => { const m = /([A-Z][a-z]+) (\d+), (\d{4})/.exec(s); return m ? `${m[3]}-${String(MO.indexOf(m[1]) + 1).padStart(2, '0')}-${m[2].padStart(2, '0')}` : null; };
const out = [], nm = [];
const add = (name, kind, s, e, l, link, shF) => {
  const r = toKey(name), k = r.k, sh = r.sh || shF || 0; const ok = k && (kind === 'raid' ? RAIDK.has(k + '|' + sh) : MAXK.has(k));
  if (ok) out.push({ k, ...(sh ? { sh } : {}), kind, s, e, l });
  else nm.push({ n: name, ...(k ? { k } : {}), ...(sh ? { sh } : {}), kind, s, e, l, why: k ? 'pas dans nos classements' : 'nom non reconnu', u: link });
};
for (const x of ev) {
  if (!x.start || !x.end) { if (/raid|max/.test(x.eventType)) nm.push({ n: x.name, kind: /max/.test(x.eventType) ? 'max' : 'raid', s: null, e: null, why: 'dates non publiées par la source', u: x.link }); continue; }
  const s0 = new Date(x.start), e0 = new Date(x.end); if (e0 < now || s0 > lim) continue;
  let s = loc(x.start), e = loc(x.end); const t = x.eventType, n = x.name;
  if (t === 'raid-battles' || /elite/.test(t)) {
    const l = /shadow/i.test(n) ? 'Raids obscurs' : /mega/i.test(n) ? 'Raids Méga' : /elite/i.test(n + t) ? 'Raids Élite' : /5-star/i.test(n) ? 'Raids 5★' : 'Raids';
    for (const b of x.extraData?.raidbattles?.bosses || []) add(b.name, 'raid', s, e, l, x.link, l === 'Raids obscurs' ? 1 : 0);
  } else if (t === 'raid-hour') { for (const b of split(n.replace(/ Raid Hour$/, ''))) add(b, 'raid', s, e, 'Heure de raids', x.link); }
  else if (t === 'raid-day') { const m = /^(.*?) (Super )?(Mega )?Raid Day$/.exec(n); const b = m && m[1] ? ((m[2] || m[3]) && !/^Mega /.test(m[1]) ? 'Mega ' + m[1] : m[1]) : n; add(b, 'raid', s, e, m && m[2] ? 'Journée Super Méga-Raids' : 'Journée Raids', x.link); }
  else if (t === 'max-mondays') { const m = /^(Dynamax|Gigantamax) (.*?) during Max Monday$/.exec(n);
    const p = await page(x.link), w = /from ([A-Z][a-z]+ \d+, \d{4}) through ([A-Z][a-z]+ \d+, \d{4})/.exec(p);
    if (w) { s = pdate(w[1]) + 'T00:00'; e = pdate(w[2]) + 'T23:59'; } // le boss reste toute la semaine ; le lundi = Power Spots en plus (6 h–21 h)
    add(m ? (m[1] === 'Gigantamax' ? 'Gigantamax ' + m[2] : m[2]) : n, 'max', s, e, 'Lundi Max', x.link); }
  else if (t === 'max-battles') { for (const b of split(n.replace(/ (Returns|in Max Battles|Max Battle Day).*$/, ''))) add(b, 'max', s, e, 'Combats Max (événement)', x.link); }
}
// Combats Max saisis à la main (build/max-schedule-manual.json)
const FR = new Map(); for (const e of core) for (const n of [e.n, e.fn]) if (n && !FR.has(n.toLowerCase())) FR.set(n.toLowerCase(), e.k);
const MAN = fs.existsSync(R + 'build/max-schedule-manual.json') ? JSON.parse(fs.readFileSync(R + 'build/max-schedule-manual.json')).entries || [] : [];
for (const x of MAN) {
  if (!x.start || !x.end || new Date(x.end) < now || new Date(x.start) > lim) continue;
  const n = String(x.name || '').trim(), g = String(x.tier) === '6', l = x.label || (g ? 'Combats Max Gigamax 6★' : 'Combats Max Dynamax 5★');
  const c = g ? [n + ' Gigamax', 'Gigantamax ' + n, n] : [n];
  let k = null; for (const y of c) { k = FR.get(y.toLowerCase()) || EN.get(y.toLowerCase()) || null; if (k) break; }
  if (k && g && !/-gmax$|-eternamax$/.test(k) && MAXK.has(k + '-gmax')) k += '-gmax';
  if (k && MAXK.has(k)) out.push({ k, kind: 'max', s: x.start, e: x.end, l, m: 1 });
  else nm.push({ n, ...(k ? { k } : {}), kind: 'max', s: x.start, e: x.end, l, why: k ? 'pas dans nos classements' : 'nom non reconnu', u: 'build/max-schedule-manual.json' });
}
out.sort((a, b) => a.s.localeCompare(b.s));
const doc = { date: now.toISOString(), src: 'Leek Duck via ScrapedDuck (events.json)', S: out, nm };
fs.writeFileSync(D + '/boss-schedule.json', JSON.stringify(doc));
console.log(`boss-schedule.json : ${out.length} entrées, ${nm.length} non reliées`);
for (const x of out) console.log(' ', x.kind, x.k + (x.sh ? ' (obscur)' : ''), x.s, '→', x.e, x.l);
for (const x of nm) console.log('  ! non relié :', x.kind, x.n, x.s, '→', x.e, x.l, '—', x.why);
