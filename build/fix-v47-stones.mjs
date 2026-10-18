// v47: item sprites of the Méga-Gemmes added by Légendes Pokémon : Z-A / Méga-Dimension (+ Orbe Bleu / Rouge), which had the generic
// Gemme Sésame image. Source: PokeAPI sprites (github.com/PokeAPI/sprites, sprites/items/<name>.png — official item artwork, 160×160 for Z-A;
// classic 30×30 for the Orbs), self-hosted in docs/img/stones/<name>.png (resized to 64×64 by python3/PIL when available).
// Only mega-stones.json « img » is set: no « item » field, so gem marks keep their key (gemId). Idempotent: node fix-v47-stones.mjs [--fetch]
import fs from 'node:fs'; import { execFileSync } from 'node:child_process';
const D = new URL('../docs/', import.meta.url);
const F = { '26-mega-x': 'raichunite-x', '26-mega-y': 'raichunite-y', '36-mega': 'clefablite', '71-mega': 'victreebelite', '121-mega': 'starminite', '149-mega': 'dragoninite',
  '154-mega': 'meganiumite', '160-mega': 'feraligite', '227-mega': 'skarmorite', '358-mega': 'chimechite', '359-mega-z': 'absolite-z', '398-mega': 'staraptite',
  '445-mega-z': 'garchompite-z', '448-mega-z': 'lucarionite-z', '478-mega': 'froslassite', '491-mega': 'darkranite', '500-mega': 'emboarite', '530-mega': 'excadrite',
  '545-mega': 'scolipite', '560-mega': 'scraftinite', '604-mega': 'eelektrossite', '609-mega': 'chandelurite', '623-mega': 'golurkite', '652-mega': 'chesnaughtite',
  '655-mega': 'delphoxite', '658-mega': 'greninjite', '668-mega': 'pyroarite', '670-mega': 'floettite', '678-male-mega': 'meowsticite', '678-female-mega': 'meowsticite',
  '687-mega': 'malamarite', '689-mega': 'barbaracite', '691-mega': 'dragalgite', '701-mega': 'hawluchanite', '718-mega': 'zygardite', '740-mega': 'crabominite',
  '768-mega': 'golisopite', '780-mega': 'drampanite', '801-mega': 'magearnite', '801-original-mega': 'magearnite', '807-mega': 'zeraorite', '870-mega': 'falinksite',
  '952-mega': 'scovillainite', '970-mega': 'glimmoranite', '978-curly-mega': 'tatsugirinite', '978-droopy-mega': 'tatsugirinite', '978-stretchy-mega': 'tatsugirinite',
  '998-mega': 'baxcalibrite', '382-primal': 'blue-orb', '383-primal': 'red-orb' };
if (process.argv.includes('--fetch')) {
  for (const n of new Set(Object.values(F))) {
    const f = new URL(`img/stones/${n}.png`, D); if (fs.existsSync(f)) continue;
    const r = await fetch(`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${n}.png`, { headers: { 'User-Agent': 'PokedexPWA/1.0' } });
    if (!r.ok) { console.log('! sprite manquant', n, r.status); continue; }
    fs.writeFileSync(f, Buffer.from(await r.arrayBuffer()));
    try { execFileSync('python3', ['-c', `from PIL import Image; im=Image.open(${JSON.stringify(f.pathname)}).convert('RGBA'); w,h=im.size
if w>64: im=im.resize((64,64),Image.LANCZOS)
im.save(${JSON.stringify(f.pathname)}, optimize=True)`]); } catch (e) { console.log('(pas de redimensionnement)', n); }
    await new Promise(r => setTimeout(r, 300));
  }
}
const ms = JSON.parse(fs.readFileSync(new URL('data/mega-stones.json', D))); let n = 0, miss = [];
for (const [k, name] of Object.entries(F)) { const s = ms.stones[k]; if (!s) { miss.push(k); continue; }
  if (!fs.existsSync(new URL(`img/stones/${name}.png`, D))) { miss.push(k); continue; }
  const img = `img/stones/${name}.png`; if (s.img !== img) { s.img = img; n++; } }
fs.writeFileSync(new URL('data/mega-stones.json', D), JSON.stringify(ms));
const generic = Object.entries(ms.stones).filter(([, s]) => s.img === ms.fallback.img).map(([k]) => k);
console.log(`fix-v47-stones : ${n} images posées ; encore génériques : ${generic.length}${generic.length ? ' (' + generic.join(', ') + ')' : ''}${miss.length ? ' ; manquants : ' + miss.join(', ') : ''}`);
