# v34: RF/VF Switch inherited GBA-only rows (Pokémon Colosseum bonus disc) — removed; « Pokecenter » areas and methods in French. Idempotent.
import json, glob
L = json.load(open('docs/data/loc.json'))
FR = {'Hoenn Pokecenter': 'Centre Pokémon (Hoenn)', 'Kanto Pokecenter': 'Centre Pokémon (Kanto)'}
L['a'] = [FR.get(a, a) for a in L['a']]
L['m'] = [m.replace('Recevoir depuis le disque bonus Pokemon Colosseum au Japon', 'Reçu depuis le disque bonus de Pokémon Colosseum (Japon)').replace('Pokemon', 'Pokémon') for m in L['m']]
GBA = {i for i, m in enumerate(L['m']) if 'Colosseum' in m}
json.dump(L, open('docs/data/loc.json', 'w'), ensure_ascii=False, separators=(',', ':'))
n = 0
for p in glob.glob('docs/data/sp/*.json'):
  s = json.load(open(p)); ch = False
  for f in s['f'].values():
    en = f.get('en') or {}
    if 'frlgsw' in en:
      r = [x for x in en['frlgsw'] if x[1] not in GBA]
      if len(r) != len(en['frlgsw']): n += len(en['frlgsw']) - len(r); ch = True
      if r: en['frlgsw'] = r
      else: del en['frlgsw']
  if ch: json.dump(s, open(p, 'w'), ensure_ascii=False, separators=(',', ':'))
print('RF/VF Switch : lignes GBA retirées', n)
