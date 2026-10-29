# v58 : applique aux données de l'appli (docs/data) les corrections GO et les recommandations raid v2 / Max v1.
# Idempotent. Appelé à la fin de build-data.mjs ; entrées dans build/v58/, build/go-moves-patch.json, build/go-types-patch.json.
import json, math, collections, os
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..'))  # racine du dépôt
R='docs/data/'
def rd(p): return json.load(open(R+p))
def wr(p,o): json.dump(o,open(R+p,'w'),ensure_ascii=False,separators=(',',':'))
log=[]
# 1. attaques (22 du correctif + Ombre Nocturne+)
G=rd('go.json'); P=json.load(open('build/go-moves-patch.json'))
for k,v in P['moves'].items(): G['moves'][k]=v[:6]
# Ombre Nocturne+ : puissance raid 160 (annonce officielle Halloween 2026 partie II, 1er-5 nov. 2026) ; énergie et durée supposées comme les autres attaques « + » (100, durée de l'attaque de base)
G['moves']['NIGHT_SHADE_PLUS']=['Ombre Nocturne+','ghost',160,100,G['moves']['NIGHT_SHADE'][4],0]
wr('go.json',G); log.append('attaques +%d'%(len(P['moves'])+1))
# 2. movepools, types, Méga-Ténéfix
T=json.load(open('build/go-types-patch.json'))['types']
pools=dict(P['movepool']); pools['302-mega']={'cm':['NIGHT_SHADE_PLUS']}
bysp=collections.defaultdict(list)
for k in set(pools)|set(T): bysp[int(k.split('-')[0])].append(k)
for sp,ks in bysp.items():
  S=rd(f'sp/{sp}.json')
  for k in ks:
    g=S['f'][k]['go']
    for s in ('fm','cm','fe','ce'):
      for m in pools.get(k,{}).get(s,[]):
        if m not in (g.get(s) or []): g[s]=(g.get(s) or [])+[m]
    if k in T: g['t']=T[k]['t']
  wr(f'sp/{sp}.json',S)
log.append('movepools %d, types %d'%(len(pools),len(T)))
# 3. Mewtwo Armuré (forme GO uniquement ; game master V0150_POKEMON_MEWTWO_A)
S=rd('sp/150.json'); C=rd('core.json')
cp=lambda a,d,s,m: math.floor((a+15)*math.sqrt(d+15)*math.sqrt(s+15)*m*m/10)
b=S['f']['150']
S['f']['150-armored']={'n':'Mewtwo Armuré','t':['psychic'],'s':b['s'],'h':b['h'],'w':b['w'],'a':b['a'],'av':[],'mvOf':'150','enOf':'150',
 'go':{'a':182,'d':278,'s':214,'m50':cp(182,278,214,0.84029999),'m51':cp(182,278,214,0.84529999),'t':['psychic'],'fm':['CONFUSION_FAST','IRON_TAIL_FAST'],'cm':['DYNAMIC_PUNCH','ROCK_SLIDE','EARTHQUAKE','FUTURESIGHT'],'ce':['PSYSTRIKE'],'cl':'legendary','r':1}}
wr('sp/150.json',S)
if not any(e['k']=='150-armored' for e in C['e']):
  i=max(i for i,e in enumerate(C['e']) if e['id']==150)
  base=C['e'][[e['k'] for e in C['e']].index('150')]
  C['e'].insert(i+1,{'k':'150-armored','id':150,'n':'Mewtwo Armuré','en':'Armored Mewtwo','ja':'ミュウツー（アーマード）','ro':'Mewtwo (armored)','t':['psychic'],'g':1,'s':base['s'],'c':'form','l':'Armuré','gb':0,'go':1})
  wr('core.json',C)
log.append('Mewtwo Armuré')
# 4. recommandations raid v2 (+ météo, + capacités « + ») et Max v1
F='build/v58/'
A=json.load(open(F+'analyse.json')); M=json.load(open(F+'meteo.json')); PB=json.load(open(F+'plus-bonus.json'))
plus={a:ms for a,_,ms in PB['1.3']['changements']}
r={}
for key,a in A.items():
  m=a.get('main')
  if not m: continue
  e={'m':[m['fx'],m['cx']],'n':a['nRel'],'w':m['best']}
  if a.get('approx') and a.get('second'): e['a']=[a['second']['fx'],a['second']['cx']]
  if a.get('lines'): e['l']=[[l['t'],l['fx'],l['cx'],l['bosses']] for l in a['lines']]
  wx={}
  for w,x in M.get(key,{}).items():
    d=[x['mieux'],x['moins'],x['n1']]
    if x.get('moveset') and x['moveset']!=x.get('moveset0'): d.append(x['moveset'])
    wx[w]=d
  if wx: e['x']=wx
  if a['a'] in plus: e['p']=plus[a['a']]
  r.setdefault(a['k'],{})['o' if a['kind']=='s' else 'n']=e
X=json.load(open('build/v58/max-propose.json'))
cnt=collections.Counter((f,ro) for b in X['boss'].values() for ro,l in b.items() for f in l)
x={k:{ro:[v[ro]['f'],v[ro]['c'],cnt[(k,ro)]] for ro in 'ATH'} for k,v in X['formes'].items()}
wr('raid-moves.json',{'date':'2026-10-28','v':2,'nb':164,'r':r,'mx':x,'mxb':len(X['boss'])})
log.append('raid %d formes, max %d formes'%(len(r),len(x)))
print('\n'.join(log))
# v60 : liste des boss de raid pour l'encadré « PC à la capture »
import subprocess, sys
subprocess.run([sys.executable, 'build/raid-bosses-export.py'], check=True)
