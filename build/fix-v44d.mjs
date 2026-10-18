// v44d: Méga-Mistigrix ♂ / ♀ = ONE entry (678-male-mega, image ♂ / ♀ like the visual females: core « fe »; the female Mistigrix
// is its second base « mb2 »). The 4 real gender differences say « mâle » / « femelle » in their name (fn / n) and subtitle (l). Idempotent.
import fs from 'node:fs';
const D = new URL('../docs/data/', import.meta.url);
const rd = f => JSON.parse(fs.readFileSync(new URL(f, D))), wr = (f, o) => fs.writeFileSync(new URL(f, D), JSON.stringify(o));
const core = rd('core.json'), byKey = Object.fromEntries(core.e.map(e => [e.k, e]));
const M = byKey['678-male-mega'], F = byKey['678-female-mega'];
if (!M) throw new Error('678-male-mega absent');
if (F) {
  M.fe = Object.fromEntries(Object.entries({ k: F.k, gb: F.gb, go: F.go, hs: F.hs, as: F.as, hh: F.hh, sh: F.sh }).filter(([, v]) => v !== undefined));
  core.e = core.e.filter(e => e !== F);
}
Object.assign(M, { n: 'Méga-Mistigrix', l: 'Méga', mb: '678', mb2: '678-female' });
for (const id of [678, 876, 902, 916]) {
  const m = byKey[String(id)], f = byKey[id + '-female']; if (!m || !f) throw new Error('entrée manquante ' + id);
  const base = m.n.replace(/ (mâle|femelle)$/i, '');
  m.fn = base + ' mâle'; m.l = 'Mâle'; f.n = base + ' femelle'; delete f.fn; f.l = 'Femelle';
  // both genders exist wherever the species does: the female's PokéAPI game list misses Z-A / Méga-Dimension (Mistigrix, Wimessir) and Légendes Arceus (Paragruel)
  f.gb |= m.gb;
  const sp = rd(`sp/${id}.json`), sm = sp.f[String(id)], sf = sp.f[id + '-female'];
  if (sm?.av && sf) { const av = [...new Set([...(sf.av || []), ...sm.av])]; if (av.length !== (sf.av || []).length) { sf.av = av; wr(`sp/${id}.json`, sp); } }
}
wr('core.json', core);
console.log(`v44d ok : Méga-Mistigrix une seule entrée (fe ${M.fe?.k}), mâle / femelle nommés, ${core.e.length} entrées`);
