#!/usr/bin/env python3
"""Machine-translate (EN -> FR) the Pokédex texts that PokéAPI only has in English.
Input : build/.cache/en-texts.json  (from translate-prep.mjs)   Output: build/translations-fr.json {cleanedEnglish: french}
Engine: Argos Translate (OpenNMT/OPUS, offline).  pip install argostranslate  ;  usage: translate.py [shard nshards]"""
import json, os, re, sys
import argostranslate.package as pkg, argostranslate.translate as tr
here = os.path.dirname(os.path.abspath(__file__))
shard, n = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (0, 1)
pkg.update_package_index()
if not any(l.code == 'fr' for l in tr.get_installed_languages()):
    a = [x for x in pkg.get_available_packages() if x.from_code == 'en' and x.to_code == 'fr'][0]
    pkg.install_from_path(a.download())
items = json.load(open(os.path.join(here, '.cache/en-texts.json')))[shard::n]
out_f = os.path.join(here, f'.cache/tr-{shard}.json')
done = json.load(open(out_f)) if os.path.exists(out_f) else {}
def fix(s):
    s = re.sub(r'\bpokémon\b', 'Pokémon', s)
    s = s.replace("l' ", "l'").replace(' ,', ',')
    return s.strip()
k = 0
for raw, pre in items:
    if raw in done: continue
    done[raw] = fix(tr.translate(pre, 'en', 'fr'))
    k += 1
    if k % 50 == 0:
        json.dump(done, open(out_f, 'w'), ensure_ascii=False); print(shard, len(done), '/', len(items), flush=True)
json.dump(done, open(out_f, 'w'), ensure_ascii=False)
print('shard', shard, 'done', len(done))
