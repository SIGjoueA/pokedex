#!/usr/bin/env python3
"""v32: fetch Poképédia wikitext (MediaWiki API, CC BY-NC-SA 3.0 FR) into build/.cache/pokepedia/pages.json.
Polite: 1.5 s between requests, 50 titles per request, identified User-Agent; cache-first (re-runs only fetch missing titles).
Usage: python3 fetch-pokepedia.py species|subpages|forms|titles <t1> <t2>..."""
import json, os, re, sys, time, urllib.request, urllib.parse
HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, '.cache/pokepedia/pages.json')
UA = 'YannPokedex/1.0 (personal non-commercial PWA; https://github.com/SIGjoueA/pokedex; data cached, ~1 request / 1.5 s)'
API = 'https://www.pokepedia.fr/api.php'
pages = json.load(open(CACHE)) if os.path.exists(CACHE) else {}   # requested title -> {"t": final title, "w": wikitext} | null (missing)
NREQ = 0
def api(**p):
    global NREQ
    p.update(format='json', formatversion='2')
    for attempt in range(4):
        try:
            req = urllib.request.Request(API, data=urllib.parse.urlencode(p).encode(), headers={'User-Agent': UA, 'Accept-Encoding': 'identity'})
            r = json.load(urllib.request.urlopen(req, timeout=120)); NREQ += 1; time.sleep(1.5); return r
        except Exception as e:
            print('retry', attempt, e, file=sys.stderr); time.sleep(10 * (attempt + 1))
    raise SystemExit('API failed')
def fetch(titles):
    todo = [t for t in dict.fromkeys(titles) if t not in pages]
    print(len(todo), 'titles to fetch', file=sys.stderr)
    for i in range(0, len(todo), 50):
        batch = todo[i:i + 50]
        r = api(action='query', prop='revisions', rvprop='content', rvslots='main', titles='|'.join(batch), redirects=1)
        q = r.get('query', {})
        alias = {}
        for n in q.get('normalized', []): alias[n['from']] = n['to']
        red = {x['from']: x['to'] for x in q.get('redirects', [])}
        got = {p['title']: (p['revisions'][0]['slots']['main']['content'] if 'revisions' in p else None) for p in q.get('pages', [])}
        for t in batch:
            f = alias.get(t, t); f = red.get(f, f)
            w = got.get(f)
            pages[t] = {'t': f, 'w': w} if w is not None else None
        if (i // 50) % 5 == 4 or i + 50 >= len(todo):
            json.dump(pages, open(CACHE + '.tmp', 'w'), ensure_ascii=False); os.replace(CACHE + '.tmp', CACHE)
            print(f'{i + len(batch)}/{len(todo)} req={NREQ}', file=sys.stderr, flush=True)
core = json.load(open(os.path.join(HERE, '../docs/data/core.json')))
ascii_ = lambda s: s.replace('’', "'")
base = [e for e in core['e'] if not e.get('c')]
mode = sys.argv[1]
if mode == 'species': fetch([ascii_(e['n']) for e in base])
elif mode == 'subpages':
    # « <Nom>/Génération N » for every generation the species existed in, up to 8 (the main page holds the current one)
    t = []
    for e in base:
        p = pages.get(ascii_(e['n'])); name = p['t'] if p else ascii_(e['n'])
        t += [f'{name}/Génération {g}' for g in range(e['g'], 9)]
    fetch(t)
elif mode == 'forms': fetch([ascii_(e['n']) for e in core['e'] if e.get('c') == 'reg'])
elif mode == 'titles': fetch(sys.argv[2:])
print('requests', NREQ, 'cached', len(pages), file=sys.stderr)
