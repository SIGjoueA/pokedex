# v60 : exporte la liste des boss de raid (build/raid-bosses.json) vers docs/data/raid-bosses.json pour l'encadré « PC à la capture ».
# b = formes de base attrapables (une Méga/Primo s'attrape sous sa forme de base), sh = boss 5★ obscurs. Idempotent.
import json, re, os
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
L = json.load(open('build/raid-bosses.json'))['bosses']
key = lambda x: (int(x.split('-')[0]), x)
b = sorted({re.sub(r'-(mega|primal)(-[xy])?$', '', x['k']) for x in L}, key=key)
sh = sorted({x['k'] for x in L if 'obscur' in x['tier']}, key=key)
json.dump({'b': b, 'sh': sh}, open('docs/data/raid-bosses.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print('raid-bosses.json : %d formes, %d obscurs' % (len(b), len(sh)))
