// v36: Gigamax names/labels, Théffroi / Polthégeist Forme Authentique, ability text « \n ». Idempotent.
import fs from 'node:fs';
const D = new URL('../docs/data/', import.meta.url);
const rd = f => JSON.parse(fs.readFileSync(new URL(f, D))), wr = (f, o) => fs.writeFileSync(new URL(f, D), JSON.stringify(o));
const core = rd('core.json');
const G = { '849-amped-gmax': ['Salarsen Gigamax', 'Gigamax'], '892-single-strike-gmax': [null, 'Gigamax Poing Final'], '892-rapid-strike-gmax': [null, 'Gigamax Mille Poings'], '890-eternamax': [null, 'Infinimax'] };
for (const e of core.e) if (G[e.k]) { const [n, l] = G[e.k]; if (n) e.n = n; e.l = l; const s = rd(`sp/${e.id}.json`); if (n && s.f[e.k]) { s.f[e.k].n = n; wr(`sp/${e.id}.json`, s); } }
for (const [id, nm] of [[854, 'Théffroi'], [855, 'Polthégeist']]) {
  const k = `${id}-antique`, i = core.e.findIndex(e => e.k === String(id)), b = core.e[i];
  b.fn = `${nm} Forme Contrefaçon`;
  if (!core.e.some(e => e.k === k)) {
    const e = { ...b, k, n: `${nm} Forme Authentique`, en: `Antique Form ${b.en}`, c: 'form', l: 'Authentique' };
    delete e.fn; delete e.hs; delete e.as; delete e.hh; delete e.go; // no separate HOME / animated sprite → official art of the form; no GO form
    core.e.splice(i + 1, 0, e);
  }
  const s = rd(`sp/${id}.json`); s.f[String(id)].fn = b.fn;
  s.f[k] = { ...s.f[String(id)], n: `${nm} Forme Authentique`, mvOf: String(id) }; delete s.f[k].fn; delete s.f[k].go;
  wr(`sp/${id}.json`, s);
}
const cr = rd('cries.json'); for (const id of [854, 855]) cr[`${id}-antique`] ||= cr[String(id)]; wr('cries.json', cr);
wr('core.json', core);
const ref = fs.readFileSync(new URL('ref.json', D), 'utf8'); fs.writeFileSync(new URL('ref.json', D), ref.replace(/ ?\\\\n ?/g, ' '));
console.log('v36 ok');
