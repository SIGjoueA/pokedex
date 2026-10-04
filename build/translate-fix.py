#!/usr/bin/env python3
"""Second pass for translate.py: detects implausible machine translations (hallucinations / truncated / wrong length) and retries them
with ALL-CAPS words normalised and without pre-substituted names (names are replaced afterwards). Writes build/translations-fr.json.
Texts that still look wrong are dropped (the app then shows no translated text for them)."""
import json, os, re, glob
import argostranslate.translate as tr
here = os.path.dirname(os.path.abspath(__file__))
items = json.load(open(os.path.join(here, '.cache/en-texts.json')))
pre = dict(items)
done = {}
for f in glob.glob(os.path.join(here, '.cache/tr-*.json')): done.update(json.load(open(f)))
names = json.load(open(os.path.join(here, '.cache/names-en-fr.json')))  # [[en, fr], ...]
name_re = re.compile(r'(?<![\w])(' + '|'.join(re.escape(n[0]) for n in sorted(names, key=lambda n: -len(n[0]))) + r')(?![\w])', re.I)
name_map = {n[0].lower(): n[1] for n in names}
def post(s):
    s = re.sub(r'\bpokémon\b', 'Pokémon', s)
    s = name_re.sub(lambda m: name_map.get(m.group(1).lower(), m.group(1)), s)
    return s.replace("l' ", "l'").replace(' ,', ',').strip()
def ok(en, fr):
    if not fr or fr[0].islower() and not fr[0] in 'àâéèêîôûç': return False
    r = len(fr) / max(1, len(en))
    if r < 0.6 or r > 1.9: return False
    if re.search(r'\b(read|Structure de l|Translat)', fr): return False
    # same number of sentences (±1)
    if abs(len(re.findall(r'[.!?…](\s|$)', en)) - len(re.findall(r'[.!?…](\s|$)', fr))) > 1: return False
    return True
def retry(en):
    t = re.sub(r'\b([A-Z]{3,})\b', lambda m: m.group(1).capitalize(), en)
    t = re.sub(r'POK[ée]MON', 'Pokémon', t, flags=re.I)
    parts = re.split(r'(?<=[.!?])\s+', t)
    return post(' '.join(tr.translate(p, 'en', 'fr') for p in parts))
bad = [k for k, v in done.items() if not ok(k, v)]
print('implausible', len(bad), 'of', len(done))
out = {}
for k, v in done.items():
    if k in bad:
        v2 = retry(k)
        if ok(k, v2): out[k] = v2
        else: print('DROP', k[:80], '=>', v2[:80])
    else: out[k] = post(v)
json.dump(out, open(os.path.join(here, 'translations-fr.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
print('kept', len(out), 'of', len(items))
