// v25 screenshots (360 px): PLA bar with B. shiny checked, HOME bar, Z-A Dracaufeu bar, Hisui dex (Formes off), Catégorie preview with proposed Baron entries (mock: not in the app yet)
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
// Catégorie preview (mock entries)
await p.setViewport({ width: 360, height: 1040, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await p.select('#game', 'la'); await sleep(600);
await p.evaluate(() => {
  const sel = document.querySelector('#cat');
  const add = (v, t) => { const o = document.createElement('option'); o.value = v; o.textContent = t; sel.appendChild(o); };
  add('baron', 'Barons'); add('nobaron', 'Barons manquants'); add('barons', 'Barons shiny'); add('nobarons', 'Barons shiny manquants');
  CAT_SEP_BEFORE.add('baron'); MENUS.cat.sig = ''; syncMenu(MENUS.cat);
});
await p.click('#catbtn'); await sleep(500);
await p.evaluate(() => {
  const ic = (sh, miss) => `<span class="bi" style="width:20px;height:20px${miss ? ';opacity:.55' : ''}"><img src="img/alpha/baron.png" alt="">${sh ? '<span class="bsp" style="font-size:11px;right:-6px;top:-7px">✨</span>' : ''}</span>`;
  for (const [v, sh, miss] of [['baron', 0, 0], ['nobaron', 0, 1], ['barons', 1, 0], ['nobarons', 1, 1]]) { const li = document.querySelector(`#catlist .gopt[data-v="${v}"]`); li.insertAdjacentHTML('afterbegin', (miss ? '<span style="margin-right:-6px">⚪</span>' : '') + ic(sh, miss)); li.style.background = 'rgba(229,57,53,.07)'; }
  document.querySelector('#catlist').insertAdjacentHTML('beforeend', '<li role="presentation" style="padding:6px 12px;font-size:11.5px;color:#888">Aperçu (maquette) : nouveau bloc « Barons », pas encore actif</li>');
  const l = document.querySelector('#catlist'); l.scrollTop = l.scrollHeight;
});
await sleep(400);
await p.screenshot({ path: OUT + 'preview-categorie-barons-360.png' }); console.log(OUT + 'preview-categorie-barons-360.png');
// same menu in a non-Legends game: greyed
await p.keyboard.press('Escape'); await p.select('#game', 'sw'); await sleep(600);
await p.evaluate(() => { for (const v of ['baron', 'nobaron', 'barons', 'nobarons']) document.querySelector(`#cat option[value=${v}]`).disabled = true; MENUS.cat.sig = ''; syncMenu(MENUS.cat); });
await p.click('#catbtn'); await sleep(400);
await p.evaluate(() => { const l = document.querySelector('#catlist'); l.scrollTop = l.scrollHeight; });
await sleep(300);
await p.screenshot({ path: OUT + 'preview-categorie-barons-epee-grise-360.png' }); console.log(OUT + 'preview-categorie-barons-epee-grise-360.png');
await b.close();
