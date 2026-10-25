// Curated pass over build/trade-only.raw.json (output of trade-only.mjs), verified against Bulbapedia/Serebii/Poképédia/Pokémon GO Hub (oct. 2026).
import fs from 'node:fs';
const R = p => JSON.parse(fs.readFileSync(new URL(p, import.meta.url)));
const raw = R('./trade-only.raw.json'), core = R('../docs/data/core.json');
const N = {}; for (const e of core.e) N[e.k] = e.n;
const evoR = p => `Évolution par échange (${p})`, ex = (a, b) => `Exclusif à ${a} : échange nécessaire dans ${b}`;
const EV = 'Distribution événementielle / Cadeau Mystère uniquement';
const out = {}, indispo = {};
const ABS = { y: 'Absent de Jaune : échange depuis Rouge/Bleu', e: 'Absent d’Émeraude : échange depuis Rubis/Saphir ou RFVF',
  c: 'Absent de Cristal : échange depuis Or/Argent', gen1: 'Absent : échange depuis la 1re génération (Capsule Temporelle)' };
const KANTO = [1,2,3,4,5,6,7,8,9,138,139,140,141,144,145,146,150];
const O = { // drop: ids removed; add: rows; ev: [id, note]; abs: reason for remaining absent rows; abs2: per-id reason
  rb: { ev: [[151, EV]] }, y: { ev: [[151, EV]], abs: ABS.y, add: [[26, 'Pikachu de départ ne peut pas évoluer et aucun autre Pikachu : échange depuis Rouge/Bleu']] },
  gs: { drop: [123, 127], ev: [[151, EV], [251, EV]], abs: ABS.gen1, add: [[212, evoR('Insécateur, en tenant Peau Métal')]] },
  c: { drop: [123, 127], ev: [[151, EV]], absf: id => KANTO.includes(id) ? ABS.gen1 : ABS.c, add: [[212, evoR('Insécateur, en tenant Peau Métal')]] },
  rs: { ev: [[386, EV]] }, e: { abs: ABS.e, add: [[283, 'Essaim uniquement via mélange de records : échange depuis Rubis/Saphir'], [284, 'Essaim uniquement via mélange de records (Arakdo) : échange depuis Rubis/Saphir']] },
  pt: { drop: [200, 429, 198, 430, 431, 432, 434, 435], add: [[474, evoR('Porygon2, en tenant CD Douteux')]] },
  bdsp: { ev: [[490, EV]], add: [[198, ex('Diamant Étincelant', 'Perle Scintillante')], [430, ex('Diamant Étincelant', 'Perle Scintillante')], [200, ex('Perle Scintillante', 'Diamant Étincelant')], [429, ex('Perle Scintillante', 'Diamant Étincelant')]] },
  b2w2: { ev: [[494, 'Événement uniquement'], [641, 'Poké Radar Rêve (appli 3DS) ou événement'], [642, 'Poké Radar Rêve (appli 3DS) ou événement'], [645, 'Poké Radar Rêve (appli 3DS) ou événement']] },
  xy: { drop: [142], ev: [[719, EV], [720, EV], [721, EV]] },
  oras: { dropAbs: 1, ev: [[385, EV]], add: [[335, ex('Rubis Oméga', 'Saphir Alpha')], [336, ex('Saphir Alpha', 'Rubis Oméga')], [338, ex('Rubis Oméga', 'Saphir Alpha')], [337, ex('Saphir Alpha', 'Rubis Oméga')],
    [65, evoR('Kadabra')], [367, evoR('Coquiperl, en tenant Dent Océan')], [368, evoR('Coquiperl, en tenant Écaille Océan')], [230, evoR('Hypocéan, en tenant Écaille Draco')], [464, evoR('Rhinoféros, en tenant Protecteur')], [477, evoR('Téraclope, en tenant Tissu Fauche')]] },
  sm: { dropAbs: 1, drop: [75], ev: [[801, EV], [802, EV]], add: [[76, evoR('Gravalanch d’Alola')], [474, evoR('Porygon2, en tenant CD Douteux')],
    ['37-alola', ex('Soleil', 'Lune')], ['38-alola', ex('Soleil', 'Lune')], ['27-alola', ex('Lune', 'Soleil')], ['28-alola', ex('Lune', 'Soleil')]] },
  usum: { dropAbs: 1, ev: [[802, EV], [807, EV]], add: [[76, evoR('Gravalanch d’Alola')], [474, evoR('Porygon2, en tenant CD Douteux')],
    ['37-alola', ex('Ultra-Soleil', 'Ultra-Lune')], ['38-alola', ex('Ultra-Soleil', 'Ultra-Lune')], ['27-alola', ex('Ultra-Lune', 'Ultra-Soleil')], ['28-alola', ex('Ultra-Lune', 'Ultra-Soleil')]] },
  sw: { dropAbs: 1, add: [['83-galar', ex('Épée', 'Bouclier')], ['222-galar', ex('Bouclier', 'Épée')], ['77-galar', ex('Bouclier', 'Épée')], ['78-galar', ex('Bouclier', 'Épée')],
    ['554-galar', ex('Épée', 'Bouclier')], ['555-galar-standard', ex('Épée', 'Bouclier')], [550, ex('Épée (Motif Rouge)', 'Bouclier')], ['550-blue-striped', ex('Bouclier', 'Épée')],
    [841, 'Pomme Acidulée (évolution de Verpom) exclusive à Épée : échange nécessaire dans Bouclier'], [842, 'Pomme Sucrée (évolution de Verpom) exclusive à Bouclier : échange nécessaire dans Épée']] },
  swisle: { add: [[474, evoR('Porygon2, en tenant CD Douteux')]] },
  swcrown: { dropAbs: 1, add: [['77-galar', ex('Bouclier', 'Épée')], ['78-galar', ex('Bouclier', 'Épée')]] },
  la: { dropAbs: 1 },
  sv: { add: [['128-paldea-blaze-breed', ex('Écarlate', 'Violet')], ['128-paldea-aqua-breed', ex('Violet', 'Écarlate')]] },
  svdisk: { dropAbs: 1, ev: [[1025, 'Épilogue « Le Mochi Mayhem » (accessible après les deux DLC) — pas un échange']],
    add: [[1020, ex('Écarlate', 'Violet')], [1021, ex('Écarlate', 'Violet')], [1022, ex('Violet', 'Écarlate')], [1023, ex('Violet', 'Écarlate')]] },
  za: { dropAbs: 1, ev: [[719, 'Cadeau Mystère (mission « Shine Bright Like a Gemstone »)']],
    add: [[683, evoR('Fluvetin, en tenant Sachet Senteur')], [685, evoR('Sucroquin, en tenant Chantibonbon')], [212, evoR('Insécateur, en tenant Peau Métal')], [199, evoR('Ramoloss, en tenant Roche Royale') + ' — un Roigada de Galar s’obtient par mission']] },
  zadlc: { dropAbs: 1, add: [[350, evoR('Barpau, en tenant Écaille Lavande') + ' — seule évolution par échange absente des distorsions 3★']] },
  frlgsw: { unflag: 1 },
};
const NPC = { rb: { 83: 'Piafabec', 108: 'Flagadoss', 122: 'Abra', 124: 'Têtarte' }, y: { 122: 'Mélofée' }, gs: { 142: 'Leveinard' }, c: { 142: 'Leveinard' },
  frlg: { 83: 'Piafabec', 108: 'Akwakwak (Rouge Feu) / Flagadoss (Vert Feuille)', 122: 'Abra', 124: 'Têtarte' }, sv: { 194: 'Axoloto de Paldea' } };
NPC.frlgsw = NPC.frlg;
const k = x => String(x.k ?? x.id);
for (const g in raw) {
  if (g.startsWith('go')) continue;
  const o = O[g] || {}; let l = raw[g].map(x => ({ ...x }));
  const evIds = new Set((o.ev || []).map(e => String(e[0])));
  l = l.filter(x => !(o.drop || []).includes(x.id) && !evIds.has(k(x)) && !(o.dropAbs && x.u && /^Absent/.test(x.reason)));
  for (const x of l) if (x.u) {
    if (/^Absent/.test(x.reason) && (o.abs || o.absf)) { x.reason = o.absf ? o.absf(x.id) : o.abs; delete x.u; }
    else if (o.unflag) { x.reason = x.reason.replace(/ — à vérifier/, ''); delete x.u; }
  }
  for (const [id, reason] of o.add || []) { const kk = String(id); l = l.filter(x => k(x) !== kk); l.push(typeof id === 'string' ? { id: +kk.split('-')[0], k: kk, reason } : { id, reason }); }
  if (g === 'za' || g === 'zadlc') l = l.filter(x => !x.u);
  for (const x of l) if (/^Échange avec un PNJ/.test(x.reason)) { const w = NPC[g]?.[x.id]; if (!w) throw new Error('NPC ' + g + ' ' + x.id); x.reason = `Échange avec un PNJ contre ${w} uniquement`; }
  out[g] = l; if (o.ev) indispo[g] = o.ev.map(([id, note]) => ({ id, note }));
}
// GO — source : Pokémon GO Hub, « Regional Pokémon List » (1er sept. 2026)
const G = [[83,'Corée du Sud, Taïwan, Japon, Hong Kong'],[115,'Australie'],[122,'Europe'],[128,'Amérique du Nord'],[214,'Mexique, Amérique centrale et du Sud, sud de la Floride et du Texas'],[222,'Zones côtières tropicales (≈ 31° N – 26° S)'],
 [313,'Europe, Asie, Australie'],[314,'Amériques, Afrique'],[324,'Asie de l’Ouest, du Sud et du Sud-Est, Inde'],[335,'Europe, Asie, Australie'],[336,'Amériques, Afrique'],[337,'Hémisphère ouest'],[338,'Hémisphère est'],
 [357,'Afrique, Levant, Malte, sud de l’Espagne'],[369,'Nouvelle-Zélande, Fidji, Nouvelle-Calédonie (UTC+13)'],[417,'Régions arctiques (Alaska, nord du Canada, Russie)'],[441,'Hémisphère sud'],[455,'Sud-est des États-Unis'],
 [422,'Hémisphère ouest (Mer Occident)'],[423,'Hémisphère ouest (Mer Occident)'],['422-east','Hémisphère est'],['423-east','Hémisphère est'],[439,'Europe (Œufs 5 km)'],
 [480,'Asie-Pacifique (raids, rare sauvage)'],[481,'Europe, Moyen-Orient, Afrique, Inde (raids, rare sauvage)'],[482,'Amériques, Groenland (raids, rare sauvage)'],
 [511,'Asie-Pacifique'],[512,'Asie-Pacifique'],[513,'Europe, Moyen-Orient, Afrique, Inde'],[514,'Europe, Moyen-Orient, Afrique, Inde'],[515,'Amériques, Groenland'],[516,'Amériques, Groenland'],
 [538,'Amériques, Afrique'],[539,'Europe, Asie, Australie'],[550,'Hémisphère est (Motif Rouge)'],['550-blue-striped','Hémisphère ouest'],[556,'Sud des États-Unis, Mexique, Amérique centrale, Caraïbes, Amérique du Sud'],[561,'Égypte, Grèce'],[626,'New York et environs'],
 [631,'Europe, Asie, Australie'],[632,'Amériques, Afrique'],[707,'France et zones frontalières (Luxembourg, ouest de la Suisse, sud-est de l’Angleterre)'],
 [741,'Europe, Moyen-Orient, Afrique (Style Flamenco)'],['741-pom-pom','Amériques'],['741-pau','Îles d’Afrique, d’Asie, du Pacifique et des Caraïbes'],['741-sensu','Asie-Pacifique'],
 ['676-debutante','Amériques (coupe)'],['676-diamond','Europe, Moyen-Orient, Afrique (coupe)'],['676-star','Asie-Pacifique (coupe)'],['676-la-reine','France (coupe)'],['676-kabuki','Japon (coupe)'],['676-pharaoh','Égypte (coupe)'],
 [764,'Hawaï'],[669,'Europe, Moyen-Orient, Afrique (Fleur Rouge)'],[670,'Europe, Moyen-Orient, Afrique (Fleur Rouge)'],[671,'Europe, Moyen-Orient, Afrique (Fleur Rouge)'],
 ['669-yellow','Amériques, Groenland'],['670-yellow','Amériques, Groenland'],['671-yellow','Amériques, Groenland'],['669-blue','Asie-Pacifique'],['670-blue','Asie-Pacifique'],['671-blue','Asie-Pacifique'],
 [701,'Mexique'],[794,'Amériques, Groenland (raids)'],[795,'Europe, Moyen-Orient, Afrique, Inde (raids)'],[796,'Asie-Pacifique (raids)'],[797,'Hémisphère sud (raids)'],[798,'Hémisphère nord (raids)'],
 [805,'Hémisphère est (raids)'],[806,'Hémisphère ouest (raids)'],[874,'Royaume-Uni'],
 ['128-paldea-blaze-breed','Hémisphère est'],['128-paldea-aqua-breed','Hémisphère ouest'],['128-paldea-combat-breed','Péninsule Ibérique (Espagne, Portugal)'],
 [978,'Europe, Moyen-Orient, Afrique (Forme Courbée)'],['978-droopy','Amériques'],['978-stretchy','Asie-Pacifique'],[931,'Hémisphère est (Plumage Vert)'],['931-blue-plumage','Hémisphère ouest']];
out.go = G.map(([id, r]) => { const kk = String(id), b = +kk.split('-')[0]; return { id: b, ...(kk !== String(b) ? { k: kk } : {}), reason: `Exclusivité régionale (${r}) : échange hors de la région (hors événements)` }; });
out.go.push({ id: 666, reason: 'Motifs selon la région des Cartes Postales (pas de localisation directe) : motifs d’autres régions via cartes postales ou échange' });
out['go-facultatif'] = raw['go-facultatif'];
// order & write
const order = [...core.games].sort((a, b) => a.d.localeCompare(b.d));
const final = {}; for (const g of order) final[g.id] = out[g.id]; final.go = out.go; final['go-facultatif'] = out['go-facultatif']; final._indisponible = indispo;
fs.writeFileSync(new URL('./trade-only.json', import.meta.url), JSON.stringify(final, null, 1));
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
const nm = x => N[k(x)] || N[x.id];
const row = (x, t) => `<tr${x.u ? ' class=u' : ''}><td>${x.id}</td><td>${esc(nm(x))}</td><td>${esc(t)}${x.u ? ' <b>(à vérifier)</b>' : ''}</td></tr>`;
const sec = (t, l, f = x => x.reason) => `<h2>${esc(t)} <small>(${l.length})</small></h2>` + (l.length ? `<table><tr><th>N°</th><th>Pokémon</th><th>Raison</th></tr>${l.map(x => row(x, f(x))).join('')}</table>` : '<p>Aucun.</p>');
const ev = order.filter(g => indispo[g.id]).map(g => indispo[g.id].map(x => ({ ...x, note: `${g.n} — ${x.note}` }))).flat();
const html = `<meta charset=utf-8><style>body{font:10px sans-serif}h1{font-size:18px}h2{font-size:13px;margin-top:14px;page-break-after:avoid}table{border-collapse:collapse;width:100%}td,th{border:1px solid #bbb;padding:2px 4px;text-align:left}th{background:#eee}tr{page-break-inside:avoid}tr.u{background:#fff3cd}</style>
<h1>Pokémon obtenables uniquement par échange</h1><p>Pokédex régional de chaque jeu. Base : données du Pokédex (PokéAPI + Poképédia), corrigées et vérifiées sur Bulbapedia, Serebii, Poképédia et Pokémon GO Hub (octobre 2026). Les évolutions par échange ayant une alternative en jeu (Cordon de Légendes Arceus, distorsions de Légendes Z-A, beauté pour Milobellus…) sont exclues. Les Pokémon fabuleux/événementiels figurent à part, en fin de document.</p>
${order.map(g => sec(g.n, out[g.id])).join('')}${sec('Pokémon GO : exclusivités régionales (dont formes)', out.go)}${sec('Pokémon GO : évolutions par échange sans bonbons (facultatif)', out['go-facultatif'])}
${sec('Indisponible / événement (hors liste « échange uniquement »)', ev, x => x.note)}`;
fs.writeFileSync(new URL('../review/echanges.html', import.meta.url), html);
for (const g of order) console.log(g.id, out[g.id].length, out[g.id].filter(x => x.u).map(x => x.id + nm(x)).join(',') );
console.log('go', out.go.length, 'go-fac', out['go-facultatif'].length, 'indispo', ev.length, 'missingNames', [...out.go, ...Object.values(out).flat()].filter(x => !nm(x)).map(k));
