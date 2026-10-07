// v21 screenshots: mobile sheet in a classic game + mobile GO sheet (360×780, 2×)
import puppeteer from 'puppeteer-core';
const BASE = process.argv[2] || 'http://localhost:8801/';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const errs = [];
async function shot(game, hash, file, marks) {
  const p = await b.newPage();
  await p.setViewport({ width: 360, height: 780, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  p.on('pageerror', e => errs.push(file + ': ' + e.message));
  await p.goto(BASE, { waitUntil: 'networkidle0' });
  await p.evaluate(m => { for (const [k, v] of Object.entries(m)) localStorage.setItem(k, JSON.stringify(v)); }, marks);
  await p.reload({ waitUntil: 'networkidle0' });
  await p.select('#game', game); await sleep(600);
  await p.goto(BASE + hash); await sleep(1800);
  await p.screenshot({ path: '/workspace/pokedex/screenshots/' + file });
  console.log(file, await p.evaluate(() => [...document.querySelectorAll('#actbar .act')].map(x => x.classList[1] + (x.disabled ? '(grisé)' : '') + '=' + x.getAttribute('aria-pressed')).join(' ')));
  await p.close();
}
await shot('xy', '#/p/6', 'v21-fiche-mobile-jeu-xy.png', { caught_g: ['xy:6'], mega_gems: ['xy:6-mega-x'] });
await shot('go', '#/p/6', 'v21-fiche-mobile-go.png', { caught_g: ['go:6'], mega_energy: ['6'] });
console.log('errs', errs);
await b.close();
