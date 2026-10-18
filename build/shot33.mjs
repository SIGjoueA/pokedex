// v33 screenshots: hero image + Officiel / HOME / Animé buttons alignment (before = live v32, after = local).
// Usage: node shot33.mjs <baseURL> <tag>   e.g. node shot33.mjs https://sigjouea.github.io/pokedex/ avant ; node shot33.mjs http://localhost:8801/ apres
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:8801/', TAG = process.argv[3] || 'apres', OUT = '/workspace/pokedex/screenshots/v33/';
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const SHEETS = [['6', 'all', 'vue-ensemble'], ['6', 'xy', 'fiche-jeu'], ['26-alola', 'all', 'forme'], ['133', 'go', 'go']];
const res = [];
for (const w of [1440, 1280, 1000, 360]) {
  const p = await b.newPage();
  await p.setViewport(w < 700 ? { width: 360, height: 780, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { width: w, height: 900, deviceScaleFactor: 1 });
  await p.goto(BASE, { waitUntil: 'load' }); await sleep(2500);
  for (const [k, g, nm] of SHEETS) {
    await p.goto(BASE + '#/'); await sleep(300); await p.goto(BASE + '#/p/' + k); await sleep(1400);
    if (g !== 'all') { await p.select('#dgame', g); await sleep(900); }
    for (const mode of nm === 'vue-ensemble' ? ['off', 'home', 'anim'] : ['off']) {
      if (mode !== 'off') { await p.click(`.sprsw [data-spr=${mode}]`); await sleep(2500); }
      const m = await p.evaluate(() => { const i = document.querySelector('#heroimg').getBoundingClientRect(), s = document.querySelector('.sprsw').getBoundingClientRect(), h = document.querySelector('.hero h1').getBoundingClientRect();
        return { dx: Math.round((s.left + s.width / 2) - (i.left + i.width / 2)), gap: Math.round(s.top - i.bottom), imgH: Math.round(i.height), sTop: Math.round(s.top - document.querySelector('.hero').getBoundingClientRect().top), h1: Math.round(h.top) }; });
      res.push({ w, nm, mode, ...m });
      await p.evaluate(() => scrollTo(0, 0)); await sleep(300);
      const r = await p.evaluate(() => { const e = document.querySelector('.hero').getBoundingClientRect(); return { x: e.left, y: e.top, width: e.width, height: Math.min(e.height, 560) }; });
      await p.screenshot({ path: `${OUT}${TAG}-${nm}${mode !== 'off' ? '-' + mode : ''}-${w}px.png`, clip: { x: Math.max(0, r.x - 8), y: Math.max(0, r.y - 8), width: Math.min(r.width + 16, w), height: r.height + 16 } });
      if (mode !== 'off') { await p.click('.sprsw [data-spr=off]'); await sleep(600); }
    }
  }
  await p.close();
}
fs.writeFileSync(`${OUT}${TAG}-mesures.json`, JSON.stringify(res, null, 1));
console.table(res); await b.close();
