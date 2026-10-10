// v26 screenshots (360 px): Génération, Tri and sheet game menus open (custom dropdown). Usage: node shot26.mjs [baseURL]
import puppeteer from 'puppeteer-core';
const BASE = process.argv[2] || 'http://localhost:8801/', OUT = '/workspace/pokedex/screenshots/';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const errs = [];
const p = await b.newPage(); p.on('pageerror', e => errs.push(e.message));
await p.setViewport({ width: 360, height: 780, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await p.goto(BASE, { waitUntil: 'networkidle0' }); await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: 'networkidle0' });
const shot = async f => { await sleep(400); await p.screenshot({ path: OUT + f }); console.log(OUT + f); };
await p.click('#genbtn'); await shot('v26-menu-generations-mobile.png'); await p.keyboard.press('Escape');
await p.click('#sortbtn'); await shot('v26-menu-tri-mobile.png'); await p.keyboard.press('Escape');
await p.goto(BASE + '#/p/25'); await sleep(1500);
await p.evaluate(() => document.querySelector('#dgamebtn').scrollIntoView({ block: 'center' })); await p.click('#dgamebtn'); await shot('v26-menu-jeu-fiche-mobile.png');
await p.evaluate(() => { const l = document.querySelector('#dgamelist'); l.scrollTop = 520; }); await shot('v26-menu-jeu-fiche-mobile-2.png');
console.log('errors', errs);
await b.close();
