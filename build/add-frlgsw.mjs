// v31: « Rouge Feu / Vert Feuille (Switch) » (Nintendo Switch, 27/02/2026; Pokémon HOME 4.1.0 since 07/10/2026, one way, GBA origin mark).
// A NEW game, separate from the GBA original (which keeps its id « frlg », its marks and no HOME link). Content = the Kanto dex of FRLG (151,
// FRLG Kanto numbering), no « Hors dex » (nothing can be transferred into it). Same mechanics as FRLG (gen III), so its game data
// (moves, encounters, Pokédex texts, held items, TMs) are those of FRLG. Placed first in the Switch section (newest release).
// Idempotent: does nothing when the game is already there. Run after build-data (imported at its end) or alone: node add-frlgsw.mjs
import fs from 'node:fs'; import path from 'node:path';
const HERE = path.dirname(new URL(import.meta.url).pathname), D = path.join(HERE, '../docs/data');
const rd = f => JSON.parse(fs.readFileSync(path.join(D, f), 'utf8')), wr = (f, o) => fs.writeFileSync(path.join(D, f), JSON.stringify(o));
const core = rd('core.json');
if (core.games.some(g => g.id === 'frlgsw')) { console.log('add-frlgsw: already present'); }
else {
  const fi = core.games.findIndex(g => g.id === 'frlg'), fr = core.games[fi], dex = rd('dex/frlg.json');
  const kanto = new Set(dex.e.map(x => x[0]));
  const game = { ...fr, id: 'frlgsw', n: 'Rouge Feu / Vert Feuille (Switch)', s: 'Rouge Feu / Vert Feuille (Switch)', d: '2026-02-27', h: 'direct', count: kanto.size, extra: 0 };
  core.games.unshift(game); // index 0 → every availability bit moves up by one; the GBA game is now at fi + 1
  let n = 0; const keys = new Set();
  for (const e of core.e) { const had = (e.gb >> fi) & 1, on = had && kanto.has(e.id) ? 1 : 0; e.gb = (e.gb * 2) + on; if (on) { n++; keys.add(e.k); } }
  wr('core.json', core);
  wr('dex/frlgsw.json', { dx: dex.dx, e: dex.e, x: [] });
  const tm = rd('tm.json'); if (tm.frlg) { tm.frlgsw = tm.frlg; wr('tm.json', tm); }
  let sps = 0;
  for (const id of kanto) {
    const f = `sp/${id}.json`, sp = rd(f);
    if (sp.gm && sp.gm.frlg) sp.gm.frlgsw = sp.gm.frlg;
    for (const [k, v] of Object.entries(sp.f)) if (keys.has(k) && v.av && v.av.includes('frlg')) {
      v.av = ['frlgsw', ...v.av.filter(g => g !== 'frlgsw')];
      if (v.lm && v.lm.frlg !== undefined) v.lm.frlgsw = v.lm.frlg;
      if (v.en && v.en.frlg) v.en.frlgsw = v.en.frlg;
    }
    wr(f, sp); sps++;
  }
  console.log(`add-frlgsw: game added (index 0), ${n} entries available, ${sps} species files updated`);
}
