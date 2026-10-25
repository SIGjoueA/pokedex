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
ok(!errs.length, 'no page errors ' + errs.join(' | '));
await b.close(); console.log(fails ? `${fails} FAIL` : 'ALL PASS'); process.exit(fails ? 1 : 0);
