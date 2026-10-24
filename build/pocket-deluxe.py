#!/usr/bin/env python3
# v52: Deluxe sets (A4b « Booster de Luxe ex », B4b « Booster de Luxe Méga ») are reprints.
# In the game a reprint with the same illustration is the SAME card as the original: copies stack in the collection,
# and since the 2026-07-29 update the card dex registers it in every booster that contains it (The Pokémon Company).
# Parallel foils (second copy of the same art inside a Deluxe set) and new illustrations stay distinct cards.
# Method: candidates = cards of earlier sets with the same Pokédex number (or the same trainer name, FR or EN),
# then a 16×16 difference hash of the illustration area (Limitless TCG small images); distance < 70/256 = same art.
# In a Deluxe set, when two cards match the same original, the lower number is the normal print, the higher the foil.
# Output: build/pocket-deluxe.json {deluxeId: originalId}. Used by fetch-pocket.mjs. Needs Pillow + curl.
import json, os, re, subprocess, collections, concurrent.futures as cf
from PIL import Image
ROOT = os.path.dirname(os.path.abspath(__file__)); C = '/tmp/pocket-img'; os.makedirs(C, exist_ok=True)
d = json.load(open(ROOT + '/../docs/data/pocket.json')); S = {s['id']: s for s in d['s']}
DLX = ['A4b', 'B4b']; LL = 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/pocket/'
def en_names(sid):
    h = subprocess.run(['curl', '-s', 'https://pocket.limitlesstcg.com/cards/%s?display=list' % sid], capture_output=True, text=True).stdout
    out = {}
    for row in re.findall(r'<tr data-hover="[^"]*">(.*?)</tr>', h, re.S):
        td = [re.sub(r'<[^>]+>|\s+', ' ', x).strip() for x in re.findall(r'<td[^>]*>(.*?)</td>', row, re.S)]
        out['%03d' % int(td[1])] = td[2].lower()
    return out
keys = lambda c, en=None: [('d', x) for x in c[3]] if c[3] else [('n', c[1].lower())] + ([('n', en)] if en else [])
order = [s['id'] for s in d['s']]; idx = collections.defaultdict(list); cand = {}
for s in d['s']:
    if s['id'] in DLX:
        EN = en_names(s['id'])
        for c in s['cards']:
            cand[s['id'] + '-' + c[0]] = [o for k in keys(c, EN.get(c[0])) for o in idx[k]]
    for c in s['cards']:
        for k in keys(c): idx[k].append(s['id'] + '-' + c[0])
need = {x for k, v in cand.items() for x in [k] + v}
def img(x):
    f = '%s/%s.webp' % (C, x)
    if not os.path.exists(f): s, l = x.split('-', 1); subprocess.run(['curl', '-sf', '-o', f, '%s%s/%s_%s_EN_SM.webp' % (LL, s, s, l)])
    return f
list(cf.ThreadPoolExecutor(6).map(img, sorted(need)))
H = {}
def h(x):
    if x not in H:
        try: im = Image.open(img(x)).convert('L')
        except Exception: H[x] = None; return None
        w, hh = im.size; im = im.crop((int(w * .08), int(hh * .11), int(w * .92), int(hh * .52))).resize((17, 16)); p = im.tobytes()
        H[x] = [p[r * 17 + c] > p[r * 17 + c + 1] for r in range(16) for c in range(16)]
    return H[x]
best = {}
for k, v in cand.items():
    a = h(k); b = [(sum(x != y for x, y in zip(a, h(o))), o) for o in v if a and h(o)]
    if b: best[k] = min(b)
m = {k: o for k, (dd, o) in best.items() if dd < 70}
root = lambda x: root(m[x]) if x in m else x
grp = collections.defaultdict(list)
for k in sorted(m): grp[(k.split('-')[0], root(k))].append(k)
foil = {k for g in grp.values() for k in g[1:]}
out = {k: root(k) for k in sorted(m) if k not in foil}
json.dump(out, open(ROOT + '/pocket-deluxe.json', 'w'), indent=0)
for s in DLX:
    n = len(S[s]['cards']); a = sum(1 for k in out if k.startswith(s + '-')); f = sum(1 for k in foil if k.startswith(s + '-'))
    print(s, n, 'cards:', a, 'same card as an original,', f, 'parallel foils,', n - a - f, 'new art / other')
