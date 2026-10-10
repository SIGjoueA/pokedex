// v28 screenshots (360 px): GO list with Formes on (Dracaufeu + Méga X / Y + Gigamax) and the GO sheet of Méga-Dracaufeu X.
// Usage: node shot28.mjs [baseURL] [outDir]   (default: live site)
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const BASE = process.argv[2] || 'https://sigjouea.github.io/pokedex/', OUT = process.argv[3] || '/workspace/pokedex/screenshots/v28/';
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.setViewport({ width: 360, height: 780, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await p.goto(BASE, { waitUntil: 'networkidle0' }); await sleep(800);
const ver = await p.evaluate(async () => (await (await fetch('sw.js', { cache: 'no-store' })).text()).match(/VERSION = '([^']+)'/)[1]);
await p.select('#game', 'go'); await sleep(900);
if (await p.$eval('#formsbtn', x => x.getAttribute('aria-pressed')) !== 'true') { await p.click('#formsbtn'); await sleep(700); }
if (await p.$eval('#results', x => !x.classList.contains('list'))) { await p.click('#viewbtn'); await sleep(700); }
await p.evaluate(() => { const e = document.querySelector('[href="#/p/6"]'); e.scrollIntoView({ block: 'center' }); window.scrollBy(0, 30); }); await sleep(600);
await p.screenshot({ path: OUT + 'go-liste-formes.png' });
await p.goto(BASE + '#/p/6-mega-x'); await sleep(1500);
const dg = await p.evaluate(() => state.dgame); if (dg !== 'go') { await p.select('#dgame', 'go'); await sleep(900); }
await p.screenshot({ path: OUT + 'go-fiche-mega-dracaufeu-x.png' });
await p.evaluate(() => { const t = document.querySelector('#trackinfo'); t.scrollIntoView({ block: 'start' }); window.scrollBy(0, -80); }); await sleep(500);
await p.screenshot({ path: OUT + 'go-fiche-mega-dracaufeu-x-suivi.png' });
console.log('sw VERSION', ver, 'errors', errs, '→', OUT);
await b.close();
