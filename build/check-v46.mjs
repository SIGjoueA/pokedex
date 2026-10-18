// v46 check: « Notes de version » in the ☰ menu (iPhone 390×844 @2x). Needs docs/ served on :8811. Screenshots → screenshots/v46/.
import puppeteer from 'puppeteer-core';
const BASE = 'http://localhost:8811/', OUT = new URL('../screenshots/v46/', import.meta.url).pathname;
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
await p.emulate({ viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
const sleep = ms => new Promise(r => setTimeout(r, ms)); let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const st = () => p.evaluate(() => ({ menu: !document.querySelector('#menu').hidden, main: !document.querySelector('#mmain').hidden, notes: !document.querySelector('#mnotes').hidden, title: document.querySelector('#menutitle').textContent, prev: !document.querySelector('#menuprev').hidden }));
await p.goto(BASE + '#/', { waitUntil: 'networkidle0' }); await sleep(800);
await p.evaluate(() => { localStorage.setItem('imgsDoneF', 'true'); localStorage.setItem('seenV', '"v46"'); }); await p.reload({ waitUntil: 'networkidle0' }); await sleep(1500);
await p.tap('#menubtn'); await sleep(700);
let s = await st(); ok(s.menu && s.main && !s.notes && s.title === 'Menu' && !s.prev, 'menu opens on the main panel');
await p.evaluate(() => { const m = document.querySelector('#menu'); m.scrollTop = m.scrollHeight; }); await sleep(300);
ok(await p.$eval('#notesbtn', e => { const r = e.getBoundingClientRect(), m = document.querySelector('#menu').getBoundingClientRect(); return r.height >= 44 && r.bottom <= m.bottom; }), 'Notes de version row visible');
await p.screenshot({ path: OUT + '1-menu.png' });
await p.tap('#notesbtn'); await sleep(600);
s = await st(); ok(s.menu && !s.main && s.notes && s.title === 'Notes de version' && s.prev, 'row opens the notes sub-panel');
const N = await p.evaluate(() => [...document.querySelectorAll('#mnotes .nv')].map(x => [x.querySelector('.nvv').textContent, x.querySelector('.nvd').textContent, x.querySelectorAll('li').length]));
ok(N.length === 12 && N[0][0] === 'v46' && N.at(-1)[0] === 'v35' && N.every(n => n[2] >= 2 && n[2] <= 3 && /^\d{1,2} \S+ 2026$/.test(n[1])), `12 versions v46→v35, 2–3 lines, FR dates (${N[0][1]} … ${N.at(-1)[1]})`);
await p.screenshot({ path: OUT + '2-notes.png' });
await p.tap('#menuprev'); await sleep(300); s = await st(); ok(s.menu && s.main && !s.notes && s.title === 'Menu', '‹ back to the menu');
await p.tap('#notesbtn'); await sleep(300); await p.keyboard.press('Escape'); await sleep(300); s = await st(); ok(s.menu && s.main, 'Escape in notes → back to the menu');
await p.keyboard.press('Escape'); await sleep(300); s = await st(); ok(!s.menu, 'Escape again closes');
await p.tap('#menubtn'); await sleep(300); await p.tap('#notesbtn'); await sleep(300); await p.tap('#menux'); await sleep(300); s = await st(); ok(!s.menu, '✕ closes from the notes');
await p.tap('#menubtn'); await sleep(400); s = await st(); ok(s.main && !s.notes, 'reopening shows the main panel again');
await p.touchscreen.tap(20, 830); await sleep(300); ok(!(await st()).menu, 'outside tap closes');
const sw = await p.evaluate(async () => { const n = await swAsk(navigator.serviceWorker.controller, 'NOTES'); const v = await swAsk(navigator.serviceWorker.controller); return { n: Array.isArray(n) ? n[0].v : null, v: v && v.v }; });
ok(sw.n === 'v46' && sw.v === 'v46', `service worker answers NOTES (${sw.n}) / VERSION (${sw.v})`);
// banner: render the offer with the active worker standing in for a waiting one → « Voir les notes » opens the panel
await p.evaluate(() => { SW_SHOWN = null; const c = navigator.serviceWorker.controller; Object.defineProperty(navigator.serviceWorker, 'controller', { get: () => c }); swOffer(c); }); await sleep(800);
ok(await p.evaluate(() => !!document.querySelector('#upd .updnotes')), 'update banner shows « Voir les notes de version »');
await p.tap('#upd .updnotes'); await sleep(800);
s = await st(); ok(s.menu && s.notes && await p.evaluate(() => document.querySelector('#mnotes .nv.cur .nvv').textContent === 'v46'), 'banner link opens the notes, new version tagged « Nouveau »');
await p.evaluate(() => document.querySelector('#upd').remove()); await p.keyboard.press('Escape'); await p.keyboard.press('Escape');
// after an update: one message, once
await p.evaluate(() => localStorage.setItem('seenV', '"v45"')); await p.reload({ waitUntil: 'networkidle0' }); await sleep(1500);
ok(await p.evaluate(() => { const t = document.querySelector('#toast'); return !!t && t.classList.contains('on') && /v46 installée/.test(t.textContent) && !!t.querySelector('.tnotes'); }), 'after the update: « Version v46 installée » + link');
await p.tap('#toast .tnotes'); await sleep(600); s = await st(); ok(s.menu && s.notes, 'toast link opens the notes');
await p.reload({ waitUntil: 'networkidle0' }); await sleep(1500);
ok(await p.evaluate(() => !document.querySelector('#toast.on') && JSON.parse(localStorage.getItem('seenV')) === 'v46'), 'shown only once');
// dark mode render of the panel
await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]); await p.tap('#menubtn'); await sleep(300); await p.tap('#notesbtn'); await sleep(400);
ok(await p.evaluate(() => getComputedStyle(document.querySelector('#menu')).backgroundColor !== 'rgba(0, 0, 0, 0)'), 'light mode renders');
ok(!errs.length, 'no JS errors ' + errs.join(' | '));
await b.close(); console.log(fails ? `${fails} FAIL` : 'ALL PASS'); process.exit(fails ? 1 : 0);
