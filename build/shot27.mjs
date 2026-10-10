// v27 screenshots (360 px): legend as a list (base + HOME), in-app message. Usage: node shot27.mjs [baseURL]
import puppeteer from 'puppeteer-core';
const BASE = process.argv[2] || 'http://localhost:8801/', OUT = '/workspace/pokedex/screenshots/';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const sleep = ms => new Promise(r => setTimeout(r, ms)); const errs = [];
const p = await b.newPage(); p.on('pageerror', e => errs.push(e.message));
await p.setViewport({ width: 360, height: 780, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
await p.goto(BASE, { waitUntil: 'networkidle0' }); await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: 'networkidle0' });
const shot = async f => { await sleep(400); await p.screenshot({ path: OUT + f }); console.log(OUT + f); };
await p.evaluate(() => { document.querySelector('#legend details').open = true; }); await shot('v27-legende-liste-mobile.png');
await p.select('#game', 'home'); await sleep(800); await p.evaluate(() => { document.querySelector('#legend details').open = true; }); await shot('v27-legende-home-liste-mobile.png');
await p.select('#game', ''); await sleep(500);
await p.evaluate(async () => { const f = new File(['pas du json'], 'x.json', { type: 'application/json' }); const dt = new DataTransfer(); dt.items.add(f); const i = document.getElementById('import'); i.files = dt.files; i.dispatchEvent(new Event('change')); }); await sleep(300); await shot('v27-message-fichier-invalide-mobile.png');
console.log('errors', errs); await b.close();
