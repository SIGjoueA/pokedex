// v56 check: « Évolutions » then « Où le trouver » right after « Formes » (or after the collection when no forms). Needs docs/ on :8811. SHOTS=1 → screenshots/v56/.
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const BASE = 'http://localhost:8811/', SHOT = process.env.SHOTS === '1', DIR = new URL('../screenshots/v56/', import.meta.url).pathname;
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const sleep = ms => new Promise(r => setTimeout(r, ms)); let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
await p.goto(BASE + '#/', { waitUntil: 'networkidle0' });
await p.evaluate(() => { localStorage.clear(); localStorage.setItem('imgsDoneF', 'true'); localStorage.setItem('seenV', '"v56"'); });
if (SHOT) fs.mkdirSync(DIR, { recursive: true });
for (const [k, g, exp, n] of [['25', 'sv', ['Formes', 'Évolutions', 'Où le trouver'], '1-pikachu-ev'], ['666', 'sv', ['Formes', 'Évolutions', 'Où le trouver'], '2-prismillon-ev'],
  ['37', 'sm', ['Formes', 'Évolutions', 'Où le trouver'], '3-goupix-sl'], ['25', 'go', ['Formes', 'Évolutions', 'Disponibilité'], '4-pikachu-go'], ['25', 'home', ['Formes', 'Évolutions'], '5-pikachu-home'], ['25', 'all', ['Formes', 'Évolutions'], '6-pikachu-tous']]) {
  await p.goto(BASE + '#/p/' + k, { waitUntil: 'networkidle0' }); await sleep(1000); await p.select('#dgame', g); await sleep(2000);
  const L = await p.evaluate(() => [...document.querySelectorAll('.detail section.box > h2')].map(h => h.innerText.replace(/\s+/g, ' ')));
  const i = L.findIndex(t => t.startsWith(exp[0]));
  ok(i >= 0 && exp.every((e, j) => (L[i + j] || '').startsWith(e)), `${k} ${g}: ${L.join(' | ')}`);
  if (SHOT) { await p.evaluate(() => { const s = [...document.querySelectorAll('.detail section.box')].find(x => /^Formes/.test(x.querySelector('h2')?.innerText || '')); s.scrollIntoView(); scrollBy(0, -110); }); await sleep(300); await p.screenshot({ path: DIR + n + '.png' }); }
}
ok(!errs.length, 'no page errors ' + errs.join(' | '));
await b.close(); console.log(fails ? `${fails} FAIL` : 'ALL PASS'); process.exit(fails ? 1 : 0);
