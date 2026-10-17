// v44c preview: Florizarre sheet (♀ button) on an iPhone-size screen. Needs docs/ served on :8811.
import puppeteer from 'puppeteer-core';
const BASE = 'http://localhost:8811/', OUT = new URL('../screenshots/v44/', import.meta.url).pathname;
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage(); await p.setViewport({ width: 390, height: 1400, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
await p.goto(BASE, { waitUntil: 'networkidle0' }); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('caught_g', JSON.stringify(['svdisk:3', 'sv:3', 'svmask:3', 'xy:3'])); });
const open = async g => { await p.goto(BASE + '#/', { waitUntil: 'networkidle0' }); await p.reload({ waitUntil: 'networkidle0' }); await p.goto(BASE + '#/p/3'); await sleep(1200); if (g) { await p.select('#dgame', g); await sleep(900); } await p.evaluate(() => window.scrollTo(0, 0)); await sleep(500); };
await open(''); await p.screenshot({ path: OUT + 'florizarre-vue-ensemble.png' });
await open('svdisk'); await p.screenshot({ path: OUT + 'florizarre-ev-disque-indigo.png' });
await p.click('#actbar .fem'); await sleep(400); await p.click('#febtn'); await sleep(1200); await p.evaluate(() => window.scrollTo(0, 0)); await sleep(300);
await p.screenshot({ path: OUT + 'florizarre-ev-femelle-cochee.png' });
await b.close();
