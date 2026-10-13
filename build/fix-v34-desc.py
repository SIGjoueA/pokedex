# v34: leftover machine translations with imperial units / mistranslations (no official Poképédia text for these versions). Idempotent.
import json, glob
R = {
 "En battant son ventilateur à feuilles, il peut fouetter des rafales de 100 pieds/seconde qui peuvent nicher des maisons.": "En agitant ses éventails de feuilles, il déclenche des rafales de 30 m/s capables de renverser des maisons.",
 "Il n'aime pas les saisons froides. Ils migrent vers d'autres pays à la recherche de chaleur, volant plus de 180 miles par jour.": "Il n'aime pas le froid. Il migre vers d'autres pays à la recherche de chaleur et parcourt plus de 300 km par jour.",
 "Il a un esprit de courage qui le rend courageusement prendre des ennemis difficiles. Il vole à la recherche de climats chauds.": "Son courage le pousse à affronter sans crainte des ennemis redoutables. Il vole à la recherche de climats chauds.",
 "Son nom scientifique est Oddium Wanderus. La nuit, on dit qu'il marche près de 1 000 pieds sur ses deux racines.": "Son nom scientifique est Oddium Wanderus. La nuit, on dit qu'il parcourt près de 300 m sur ses deux racines.",
 "Si deux d'entre eux se cassent la tête ensemble, leurs crânes d'épaisseur de pieds les empêcheraient de s'évanouir.": "Quand deux d'entre eux se cognent la tête, leur crâne épais de 30 cm les empêche de s'évanouir.",
}
n = 0
for p in glob.glob('docs/data/sp/*.json'):
  s = json.load(open(p)); ch = False
  for i, t in enumerate(s.get('tt') or []):
    if t in R: s['tt'][i] = R[t]; ch = True; n += 1
  if ch: json.dump(s, open(p, 'w'), ensure_ascii=False, separators=(',', ':'))
tf = 'build/translations-fr.json'; T = open(tf).read()
for a, b in R.items(): T = T.replace(json.dumps(a, ensure_ascii=False)[1:-1], json.dumps(b, ensure_ascii=False)[1:-1])
open(tf, 'w').write(T); print('descriptions corrigées :', n)
