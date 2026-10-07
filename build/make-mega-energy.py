#!/usr/bin/env python3
"""Pokémon GO Méga-énergie icons → docs/img/energy/{species}.png + docs/data/mega-energy.json

Source: PokeMiners/pogo_assets (mined GO assets)
  - Images/Tutorials/megaTutorial_energyIcon.png  (generic Mega Energy icon → fallback, and shape)
  - Candy Color Data/PokemonMegaCandyAkaMegaEnergy.json (per-species Mega Energy colours)
Each species icon = the generic shape, filled with that species' energy gradient (ramp colours) + white symbol.
"""
import json, os, urllib.request, io
from collections import deque
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
DOCS = os.path.join(HERE, '..', 'docs')
RAW = 'https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/'
CACHE = os.path.join(HERE, '.cache', 'pogo')
os.makedirs(CACHE, exist_ok=True)

def get(rel):
    p = os.path.join(CACHE, rel.replace('/', '_'))
    if not os.path.exists(p):
        with urllib.request.urlopen(RAW + urllib.request.quote(rel)) as r, open(p, 'wb') as f: f.write(r.read())
    return open(p, 'rb').read()

icon = Image.open(io.BytesIO(get('Images/Tutorials/megaTutorial_energyIcon.png'))).convert('RGBA')
colors = json.loads(get('Candy Color Data/PokemonMegaCandyAkaMegaEnergy.json'))
OUT = os.path.join(DOCS, 'img', 'energy'); os.makedirs(OUT, exist_ok=True)
S = 64
icon.resize((S, S), Image.LANCZOS).save(os.path.join(OUT, 'generic.webp'), quality=90, method=6)

# masks at full resolution: strokes (alpha) and interior (everything not reachable from the border through transparent pixels)
W, H = icon.size
a = icon.getchannel('A'); px = a.load()
outside = [[False] * W for _ in range(H)]
q = deque([(x, y) for x in range(W) for y in (0, H - 1)] + [(x, y) for y in range(H) for x in (0, W - 1)])
while q:
    x, y = q.popleft()
    if x < 0 or y < 0 or x >= W or y >= H or outside[y][x] or px[x, y] > 40: continue
    outside[y][x] = True
    q.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
inner = Image.new('L', (W, H), 0); ip = inner.load()
for y in range(H):
    for x in range(W):
        if not outside[y][x]: ip[x, y] = 255
inner = inner.filter(ImageFilter.GaussianBlur(0.6))

def hexc(c): return tuple(round(max(0, min(1, c[k])) * 255) for k in 'rgb')
def mix(c1, c2, t): return tuple(round(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))
def lum(c): return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]

def pick(sid):
    k = f'{sid:04d}'
    if k in colors: return colors[k]
    for kk, v in colors.items():
        if kk.split('_')[0].zfill(4) == k: return v
    return None

done = []
ids = sorted({int(k.split('_')[0]) for k in colors})
for sid in ids:
    c = pick(sid)
    r1, r2, r3, glow = hexc(c['_RampColor1']), hexc(c['_RampColor2']), hexc(c['_RampColor3']), hexc(c['_GlowColor'])
    if len({r1, r2, r3}) == 1 and lum(r1) > 245: continue  # primal (white material: Kyogre / Groudon) → not a Mega Energy
    # diagonal gradient: dark ramp2 (bottom-right) → ramp1 (middle) → ramp3 (top-left highlight)
    grad = Image.new('RGB', (W, H)); gp = grad.load()
    for y in range(H):
        for x in range(W):
            t = (x + y) / (W + H - 2)
            gp[x, y] = mix(r3, r1, t / 0.55) if t < 0.55 else mix(r1, r2, (t - 0.55) / 0.45)
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    img.paste(grad, (0, 0), inner)
    stroke = mix(r2, (20, 20, 30), 0.35) if lum(r2) > 60 else r2
    img.paste(Image.new('RGB', (W, H), stroke), (0, 0), a)              # outer ring + symbol
    sym = Image.new('L', (W, H), 0)                                      # symbol only = strokes inside the interior
    sp = sym.load(); ap = a.load()
    for y in range(H):
        for x in range(W):
            if ap[x, y] > 0 and ip[x, y] > 200: sp[x, y] = ap[x, y]
    ring = Image.eval(Image.composite(Image.new('L', (W, H), 0), a, sym), lambda v: v)
    img.paste(Image.new('RGB', (W, H), (255, 255, 255)), (0, 0), sym.filter(ImageFilter.MaxFilter(3)))  # white symbol, slightly bolder
    # soft glow halo
    halo = Image.new('RGBA', (W, H), glow + (0,)); halo.putalpha(a.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(4)).point(lambda v: v * 0.55))
    out = Image.alpha_composite(halo, img).resize((S, S), Image.LANCZOS)
    out.save(os.path.join(OUT, f'{sid}.webp'), quality=88, method=6)
    done.append(sid)

json.dump({'src': 'PokeMiners/pogo_assets', 'generic': 'img/energy/generic.webp', 'ids': done},
          open(os.path.join(DOCS, 'data', 'mega-energy.json'), 'w'), separators=(',', ':'))
print('energy icons', len(done), 'skipped', [i for i in ids if i not in done])
