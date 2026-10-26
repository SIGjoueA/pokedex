// v57 check: official French descriptions applied + Couafarel trim acquisition (GO zones, main games). Needs docs/ on :8811. SHOTS=1 → screenshots/v57/.
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const BASE = 'http://localhost:8811/', SHOT = process.env.SHOTS === '1', DIR = new URL('../screenshots/v57/', import.meta.url).pathname;
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const sleep = ms => new Promise(r => setTimeout(r, ms)); let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
await p.goto(BASE + '#/', { waitUntil: 'networkidle0' });
await p.evaluate(() => { localStorage.clear(); localStorage.setItem('imgsDoneF', 'true'); localStorage.setItem('seenV', '"v57"'); });
if (SHOT) fs.mkdirSync(DIR, { recursive: true });
const shotAt = async (re, n, sel = '.detail section.box') => { if (!SHOT) return; await p.evaluate((r, s) => { const x = [...document.querySelectorAll(s)].find(e => new RegExp(r).test(e.innerText)); (x || document.body).scrollIntoView(); scrollBy(0, -110); }, re, sel); await sleep(300); await p.screenshot({ path: DIR + n + '.png' }); };
for (const [k, g, re, n] of [['181', 'b2w2', 'fanal pour guider les bateaux', '1-pharamp-n2b2-description'], ['55', 'la', 'membres palmés pour sillonner', '2-akwakwak-la-description'],
  ['676-pharaoh', 'go', 'Égypte', '3-couafarel-pharaon-go'], ['676', 'go', 'Asie-Pacifique', '4-couafarel-go-zones'], ['676', 'xy', 'Au Fringant Pokémon', '5-couafarel-xy-toiletteur'], ['676-kabuki', 'za', 'Onraz', '6-couafarel-za']]) {
  await p.goto(BASE + '#/p/' + k, { waitUntil: 'networkidle0' }); await sleep(1000); await p.select('#dgame', g); await sleep(2000);
  const t = await p.evaluate(() => document.querySelector('.detail')?.innerText || '');
  ok(new RegExp(re).test(t), `${k} ${g}: /${re}/`);
  await shotAt(re, n);
}
ok(!errs.length, 'no page errors ' + errs.join(' | '));
await b.close(); console.log(fails ? `${fails} FAIL` : 'ALL PASS'); process.exit(fails ? 1 : 0);
