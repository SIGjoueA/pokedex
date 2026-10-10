// v25 screenshots (360 px): PLA bar with B. shiny checked, HOME bar, Z-A Dracaufeu bar, Hisui dex (Formes off)
import puppeteer from 'puppeteer-core';
const BASE = `http://localhost:${process.argv[2] || 8801}/`, OUT = '/workspace/pokedex/screenshots/';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const p = await b.newPage(); await p.setViewport({ width: 360, height: 780, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await p.goto(BASE, { waitUntil: 'networkidle0' });
await p.evaluate(() => { localStorage.clear(); localStorage.setItem('caught_g', '["la:25","za:6"]'); localStorage.setItem('home_o', '["hisui:25","za:25","galar:25"]'); localStorage.setItem('home_sh', '["25"]'); localStorage.setItem('home_b', '["25"]'); localStorage.setItem('baron_g', '["za:6","zadlc:6"]'); });
await p.reload({ waitUntil: 'networkidle0' });
const bar = async (game, hash, file, click) => {
  await p.goto(BASE + '#/'); await sleep(300); await p.select('#game', game); await sleep(600);
  await p.goto(BASE + hash); await sleep(1500);
  if (click) { await p.click(click); await sleep(300); }
  await p.evaluate(() => { const t = document.querySelector('.trackbox'); if (t) window.scrollTo(0, t.getBoundingClientRect().top + scrollY - 70); }); await sleep(300);
  await p.screenshot({ path: OUT + file }); console.log(OUT + file);
};
await bar('la', '#/p/25', 'v25-fiche-arceus-barre-baron-shiny-360.png', '#actbar .barons');
await bar('home', '#/p/25', 'v25-fiche-home-barre-baron-360.png');
await bar('za', '#/p/6', 'v25-fiche-za-dracaufeu-barre-360.png');
await bar('za', '#/p/3', 'v25-fiche-za-florizarre-barre-360.png');
// Hisui dex, Formes off
await p.goto(BASE + '#/'); await sleep(300); await p.select('#game', 'la'); await sleep(800);
await p.evaluate(() => { if (state.forms) document.querySelector('#formsbtn').click(); state.view = 'list'; render(); });
await sleep(400);
await p.evaluate(() => document.querySelector('.card[href="#/p/58-hisui"]').scrollIntoView({ block: 'center' })); await sleep(800);
await p.evaluate(() => document.querySelector('.card[href="#/p/58-hisui"]').scrollIntoView({ block: 'center' })); await sleep(500);
await p.screenshot({ path: OUT + 'v25-liste-hisui-formes-off-360.png' }); console.log(OUT + 'v25-liste-hisui-formes-off-360.png');
await p.evaluate(() => { state.view = 'grid'; render(); });
await b.close();
