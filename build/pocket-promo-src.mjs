// v56: sources of the promo cards (P-A, P-B) without a known « Booster promo » volume, from Limitless TCG Pocket card pages
// (« Promo-B #1 · Premium Missions »). Run after fetch-pocket.mjs. Pages cached in build/cache/ll-promo/ (1 request / s).
import fs from 'fs';
const F = new URL('../docs/data/pocket.json', import.meta.url), CD = new URL('./cache/ll-promo/', import.meta.url).pathname;
fs.mkdirSync(CD, { recursive: true });
const FR = { 'promo pack': 'Booster promo (événement)', 'wonder pick': 'Pioche Miracle (événement)', 'premium missions': 'Missions Premium (Pass Premium)', shop: 'Boutique (tickets d’échange)', missions: 'Missions', campaign: 'Campagne (cadeau de connexion / anniversaire)' };
const P = JSON.parse(fs.readFileSync(F)); let added = 0; const miss = [];
for (const st of P.s.filter(s => /^P-/.test(s.id))) {
  st.b ||= [];
  for (const c of st.cards) {
    if (c[6] && c[6].length) continue;
    const f = CD + st.id + '-' + (+c[0]) + '.html';
    if (!fs.existsSync(f)) { await new Promise(r => setTimeout(r, 1000)); const r = await fetch(`https://pocket.limitlesstcg.com/cards/${st.id}/${+c[0]}`, { headers: { 'user-agent': 'Mozilla/5.0 (personal Pokédex PWA)' } }); if (r.ok) fs.writeFileSync(f, await r.text()); }
    const h = fs.existsSync(f) ? fs.readFileSync(f, 'utf8').replace(/\s+/g, ' ') : '', m = /#\d+ · ([^<]+?) *<\/span>/.exec(h), lab = m && FR[m[1].toLowerCase()];
    if (!lab) { miss.push(st.id + '-' + c[0] + ' ' + c[1] + (m ? ' (' + m[1] + ')' : '')); c[6] = []; continue; }
    let i = st.b.indexOf(lab); if (i < 0) i = st.b.push(lab) - 1; c[6] = [i]; added++;
  }
  if (!st.b.length) delete st.b;
}
fs.writeFileSync(F, JSON.stringify(P));
console.log('promo sources added', added, '; unknown', miss.length, miss.join(' | '));
