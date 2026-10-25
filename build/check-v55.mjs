// v55 check: GO sheet folds ⇄ into « Disponibilité » (no separate box, no repeated region); main games keep the box. Needs docs/ on :8811. SHOTS=1 → screenshots/v55/.
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const BASE = 'http://localhost:8811/', SHOT = process.env.SHOTS === '1', DIR = new URL('../screenshots/v55/', import.meta.url).pathname;
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(e.message));
const sleep = ms => new Promise(r => setTimeout(r, ms)); let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
await p.goto(BASE + '#/', { waitUntil: 'networkidle0' });
await p.evaluate(() => { localStorage.clear(); localStorage.setItem('imgsDoneF', 'true'); localStorage.setItem('seenV', '"v55"'); });
const sheet = async (k, g) => { await p.goto(BASE + '#/p/' + k, { waitUntil: 'networkidle0' }); await sleep(1000); await p.select('#dgame', g); await sleep(1800);
  return p.evaluate(() => ({ box: document.querySelectorAll('.tradebox').length, li: $('.godispo .trl') ? $('.godispo .trl').innerText : '', rg: $('.godispo') ? $('.godispo').innerText : '' })); };
let r = await sheet('83', 'go');
ok(!r.box && /⇄ Échange requis : échange hors de la région/.test(r.li) && !/Corée|Taïwan/.test(r.li) && /Exclusivité régionale/.test(r.rg), 'GO regional: line in Disponibilité, region once ' + r.li);
await p.evaluate(() => $('.godispo').scrollIntoView({ block: 'start' })); await p.evaluate(() => scrollBy(0, -140)); await sleep(300);
if (SHOT) { fs.mkdirSync(DIR, { recursive: true }); await p.screenshot({ path: DIR + '1-go-fiche.png' }); }
r = await sheet('65', 'go');
ok(!r.box && /⇄ Échange facultatif : évolution gratuite/.test(r.li) && !/Facultatif :/.test(r.li), 'GO facultatif line ' + r.li);
r = await sheet('122', 'rb');
ok(r.box === 1, 'main game keeps the box');
// --- v55b: block order, folds, GO Raid/PvP
const h2s = () => p.evaluate(() => [...document.querySelectorAll('.detail section.box > h2')].map(h => h.innerText.replace(/\s+/g, ' ')));
const idx = (L, re) => L.findIndex(t => re.test(t));
await p.goto(BASE + '#/p/25', { waitUntil: 'networkidle0' }); await sleep(1000); await p.select('#dgame', 'all'); await sleep(2500);
let L = await h2s(); console.log('overview:', L.join(' | '));
const o = [/^Présent dans/, /^Statistiques|^Stats/, /^Faiblesses/, /^Reproduction/, /^Évolutions/, /^Cartes Pocket/, /^Pokédex/, /^Origine/];
ok(o.every(re => idx(L, re) >= 0) && o.every((re, i) => !i || idx(L, o[i - 1]) < idx(L, re)), 'overview order présence → stats → faiblesses → capture → évolutions → Pocket → Pokédex → divers');
const fl = await p.evaluate(() => [...document.querySelectorAll('section.fold')].map(s => s.dataset.fold));
ok(fl.includes('Présent dans') && fl.some(t => /Cartes Pocket/.test(t)) && !fl.some(t => /Stats|Faiblesses/.test(t)), 'folds on big blocks only: ' + fl.join(', '));
ok(await p.evaluate(() => !!document.querySelector('#dgame') && getComputedStyle(document.querySelector('#dgame').closest('.dtop')).position === 'sticky'), 'sticky game menu kept');
if (SHOT) { await p.evaluate(() => scrollTo(0, 0)); await sleep(300); await p.screenshot({ path: DIR + '2-fiche-haut.png' });
  await p.evaluate(() => { const s = [...document.querySelectorAll('section.box')].find(x => /^Statistiques|^Stats/.test(x.querySelector('h2')?.innerText || '')); s.scrollIntoView(); scrollBy(0, -120); }); await sleep(300); await p.screenshot({ path: DIR + '3-fiche-defilee.png' }); }
const foldSel = 'section.fold[data-fold="Présent dans"]';
await p.evaluate(s => { document.querySelector(s).scrollIntoView(); scrollBy(0, -110); }, foldSel); await sleep(300);
let hh = await p.evaluate(s => document.querySelector(s).offsetHeight, foldSel);
if (SHOT) await p.screenshot({ path: DIR + '4-bloc-replie.png' });
await p.click(foldSel + ' .foldbtn'); await sleep(300);
let hh2 = await p.evaluate(s => document.querySelector(s).offsetHeight, foldSel);
ok(hh <= 430 && hh2 > hh + 200, `fold collapsed ${hh}px → expanded ${hh2}px`);
await p.evaluate(s => { document.querySelector(s).scrollIntoView(); scrollBy(0, -110); }, foldSel); await sleep(300);
if (SHOT) await p.screenshot({ path: DIR + '5-bloc-deplie.png' });
await p.reload({ waitUntil: 'networkidle0' }); await sleep(2500);
ok(await p.evaluate(s => document.querySelector(s)?.classList.contains('open'), foldSel), 'fold state remembered after reload');
await p.select('#dgame', 'sv'); await sleep(1800); L = await h2s();
ok(idx(L, /^Statistiques|^Stats/) < idx(L, /^Où le trouver/) && idx(L, /^Où le trouver/) < idx(L, /^Évolutions/) && idx(L, /^Évolutions/) < idx(L, /^Capacités/) && idx(L, /^Présent dans/) < 0, 'game order + no « Présent dans » outside overview: ' + L.join(' | '));
await p.goto(BASE + '#/p/3', { waitUntil: 'networkidle0' }); await sleep(1000); await p.select('#dgame', 'go'); await sleep(2000);
ok(await p.evaluate(() => getComputedStyle($('.gomoves .mvraid')).display !== 'none' && getComputedStyle($('.gomoves .mvpvp')).display === 'none'), 'GO moves default Raid');
await p.evaluate(() => $('.mvseg [data-mvm="pvp"]').click()); await sleep(200);
let pv = await p.evaluate(() => getComputedStyle($('.gomoves .mvpvp')).display !== 'none' ? $('.gomoves .mvpvp').innerText : '');
ok(/Fouet Lianes[\s\S]*Dégâts 5 · Énergie \+8 · 2 tours · DPT 2,5 · EPT 4,0/.test(pv) && /Dégâts 100 · Énergie −45 · DPE 2,22/.test(pv) && /Ligue Super : Fouet Lianes \+ /.test(pv), 'GO PvP stats + moveset');
await p.reload({ waitUntil: 'networkidle0' }); await sleep(1000); await p.select('#dgame', 'go'); await sleep(2000);
ok(await p.evaluate(() => $('.gomoves').classList.contains('mv-pvp') && localStorage.getItem('gomvmode') === '"pvp"'), 'PvP choice remembered');
if (SHOT) { await p.evaluate(() => { const b = $('.gomoves:not(.open) .foldbtn'); if (b) b.click(); $('.gomoves').scrollIntoView(); scrollBy(0, -110); }); await sleep(300); await p.screenshot({ path: DIR + '6-go-attaques-pvp.png' }); }
ok(!errs.length, 'no page errors ' + errs.join(' | '));
await b.close(); console.log(fails ? `${fails} FAIL` : 'ALL PASS'); process.exit(fails ? 1 : 0);
