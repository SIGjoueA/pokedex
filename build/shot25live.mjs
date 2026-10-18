// v25 live screenshot (360 px): Catégorie menu open with the Barons block (Légendes Arceus). Usage: node shot25live.mjs [baseURL]
import puppeteer from 'puppeteer-core';
const BASE = process.argv[2] || 'https://sigjouea.github.io/pokedex/', OUT = '/workspace/pokedex/screenshots/';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const p = await b.newPage(); await p.setViewport({ width: 360, height: 1040, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await p.goto(BASE, { waitUntil: 'networkidle0' });
const v = await p.evaluate(async () => (await (await fetch('sw.js', { cache: 'no-store' })).text()).match(/VERSION = '(\w+)'/)[1]);
await p.evaluate(() => { localStorage.clear(); localStorage.setItem('caught_g', '["la:25"]'); localStorage.setItem('baron_g', '["la:25"]'); });
await p.reload({ waitUntil: 'networkidle0' });
await p.select('#game', 'la'); await sleep(900);
await p.click('#catbtn'); await sleep(500);
await p.evaluate(() => { const l = document.querySelector('#catlist'); l.scrollTop = l.scrollHeight; }); await sleep(400);
const f = OUT + 'v25-menu-categorie-barons-mobile-live.png'; await p.screenshot({ path: f }); console.log(v, f);
await b.close();
