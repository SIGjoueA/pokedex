// v45 check: list jump buttons ⬆︎ / ⬇︎ + ☰ menu (iPhone viewport 390×844 @2x). Needs docs/ served on :8811. Screenshots → screenshots/v45/.
import puppeteer from 'puppeteer-core';
const BASE = 'http://localhost:8811/', OUT = new URL('../screenshots/v45/', import.meta.url).pathname;
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
await p.emulate({ viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
const sleep = ms => new Promise(r => setTimeout(r, ms)); let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const vis = () => p.evaluate(() => ['#jumpup', '#jumpdn'].map(s => { const e = document.querySelector(s); return !!e && e.classList.contains('show') && getComputedStyle(e).pointerEvents === 'auto'; }));
const lastIn = () => p.evaluate(() => { const c = document.querySelector('#results').lastElementChild, r = c.getBoundingClientRect(); return { k: c.getAttribute('href'), top: r.top, bottom: r.bottom, ih: innerHeight, n: document.querySelectorAll('#results .card').length, last: '#/p/' + E.filter(x => !x.c).at(-1).k }; });
const tap = s => p.tap(s);
for (const view of ['grid', 'list']) {
  await p.goto(BASE + '#/', { waitUntil: 'networkidle0' }); await sleep(800);
  if (view === 'list') { await tap('#viewbtn'); await sleep(500); }
  let v = await vis(); ok(!v[0] && !v[1], `${view}: both hidden at the top`);
  await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight * 0.45)); await sleep(400);
  v = await vis(); ok(v[0] && v[1], `${view}: both shown mid-way`);
  const box = await p.$eval('#jumpdn', e => { const r = e.getBoundingClientRect(); return [innerWidth - r.right, innerHeight - r.bottom]; });
  ok(box[0] >= 14 && box[1] >= 18, `${view}: ⬇︎ inset from the corner (right ${box[0]}px, bottom ${box[1]}px)`);
  if (view === 'grid') await p.screenshot({ path: OUT + '1-liste-milieu.png' });
  await tap('#jumpdn'); await sleep(600);
  let L = await lastIn(); v = await vis();
  ok(L.k === L.last && L.bottom <= L.ih + 1 && L.bottom > L.ih * 0.5, `${view}: ⬇︎ reaches the last entry ${L.k} (${L.n} cards, bottom ${Math.round(L.bottom)}/${L.ih})`);
  ok(v[0] && !v[1], `${view}: at the bottom ⬆︎ shown, ⬇︎ hidden`);
  if (view === 'grid') await p.screenshot({ path: OUT + '2-liste-bas.png' });
  await tap('#jumpup'); await sleep(400);
  ok(await p.evaluate(() => scrollY) === 0, `${view}: ⬆︎ returns to the top`);
}
// forms on (longer list) → ⬇︎ still reaches the last form
await p.goto(BASE + '#/', { waitUntil: 'networkidle0' }); await sleep(600); await tap('#formsbtn'); await sleep(600);
await p.evaluate(() => scrollTo(0, 3000)); await sleep(300); await tap('#jumpdn'); await sleep(600);
let F = await p.evaluate(() => { const c = document.querySelector('#results').lastElementChild, r = c.getBoundingClientRect(); return { b: r.bottom, ih: innerHeight, k: c.getAttribute('href'), last: '#/p/' + filtered().at(-1).k }; });
ok(F.k === F.last && F.b <= F.ih + 1 && F.b > F.ih * 0.5, `forms: ⬇︎ reaches the last form ${F.k}`);
await tap('#formsbtn'); await sleep(400);
// sheet: buttons never shown; back to the list restores them
await p.evaluate(() => scrollTo(0, 2000)); await sleep(300);
await p.goto(BASE + '#/p/25'); await sleep(900); await p.evaluate(() => scrollTo(0, 1500)); await sleep(300);
let v = await vis(); ok(!v[0] && !v[1], 'sheet: no jump buttons');
await p.goBack(); await sleep(800); v = await vis(); ok(v[0] && v[1], 'back to the list: buttons shown again');
// short list (search) → hidden
await p.evaluate(() => scrollTo(0, 0)); await p.type('#q', 'pika'); await sleep(600); v = await vis(); ok(!v[0] && !v[1], 'short filtered list: hidden');
ok(await p.evaluate(() => { const t = document.createElement('div'); t.className = 'toast on'; document.body.appendChild(t); const r = +getComputedStyle(t).zIndex > +getComputedStyle(document.querySelector('#jump')).zIndex; t.remove(); return r; }), 'toasts / update banner stay above the buttons');
// ---- ☰ menu (v45) ----
await p.goto(BASE + '#/', { waitUntil: 'networkidle0' }); await sleep(800);
const old = await p.evaluate(() => ({ foot: ['#offline', '#export', '#import', '#legend'].filter(s => document.querySelector('.foot ' + s) || document.querySelector('.top ' + s)), inBar: !!document.querySelector('.top .searchrow #menubtn'), hidden: document.querySelector('#menu').hidden }));
ok(!old.foot.length, 'old placements gone (footer / top bar) ' + old.foot.join(','));
ok(old.inBar && old.hidden, '☰ in the existing top bar, menu closed at start');
const mb = await p.$eval('#menubtn', e => { const r = e.getBoundingClientRect(); return [innerWidth - r.right, r.top, r.width]; });
ok(mb[0] >= 8 && mb[0] <= 20 && mb[1] >= 0 && mb[2] >= 44, `☰ top right (right ${mb[0]}px, top ${Math.round(mb[1])}px, ${mb[2]}px)`);
const isOpen = () => p.evaluate(() => { const m = document.querySelector('#menu'); return !m.hidden && m.getBoundingClientRect().height > 100 && document.querySelector('#menubtn').getAttribute('aria-expanded') === 'true'; });
await tap('#menubtn'); await sleep(400); ok(await isOpen(), 'tap ☰ opens the menu');
const off1 = await p.evaluate(() => { const o = document.querySelector('#menu #offline'); return !!o.querySelector('#dl') || /Téléchargement des images|✓ Images/.test(o.textContent); });
ok(off1, 'offline section in the menu (image button or its progress)');
await tap('#menux'); await sleep(300); ok(!(await isOpen()), '✕ closes');
await tap('#menubtn'); await sleep(300); await p.touchscreen.tap(195, 830); await sleep(300); ok(!(await isOpen()), 'outside tap closes');
await tap('#menubtn'); await sleep(300); await p.keyboard.press('Escape'); await sleep(300); ok(!(await isOpen()), 'Escape closes');
// fresh state with images already saved: version, legend, export, import, offline pack button
await p.evaluate(() => localStorage.setItem('imgsDoneF', 'true')); await p.reload({ waitUntil: 'networkidle0' }); await sleep(1200);
await p.screenshot({ path: OUT + '3-haut.png' });
await tap('#menubtn'); await sleep(900);
const M = await p.evaluate(() => ({ ver: document.querySelector('#appver').textContent, lg: document.querySelectorAll('#menu #legend .lgl li').length, ex: !!document.querySelector('#menu #export'), im: !!document.querySelector('#menu #import'), dl2: !!document.querySelector('#menu #dl2'), size: /35 Mo/.test(document.querySelector('#menu #offline').textContent), mw: (r => ({ right: r.right, top: r.top }))(document.querySelector('#menu').getBoundingClientRect()) }));
ok(/v45/.test(M.ver) && /d23/.test(M.ver), 'version shown: ' + M.ver);
ok(M.lg >= 5, `legend in the menu (${M.lg} lines)`);
ok(M.ex && M.im && M.dl2 && M.size, 'export / import / offline pack (~35 Mo) buttons in the menu');
ok(M.mw.right <= 390 - 8 && M.mw.top >= 8, 'menu inside the screen with margins');
await p.screenshot({ path: OUT + '4-menu.png' });
const dlDir = '/tmp/v45dl'; (await import('node:fs')).rmSync(dlDir, { recursive: true, force: true });
const cdp = await p.createCDPSession(); await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: dlDir });
await tap('#export'); await sleep(1500);
const fs = await import('node:fs'); let bk = null; try { bk = JSON.parse(fs.readFileSync(dlDir + '/pokedex-sauvegarde.json', 'utf8')); } catch {}
ok(bk && Array.isArray(bk.caught_g) && Array.isArray(bk.favs), 'export produces pokedex-sauvegarde.json');
if (bk) { bk.favs = [25]; fs.writeFileSync(dlDir + '/test.json', JSON.stringify(bk)); }
const fin = await p.$('#import'); await fin.uploadFile(dlDir + '/test.json'); await sleep(900);
ok(await p.evaluate(() => FAVS.has(25) && /Sauvegarde importée/.test(document.body.textContent)), 'import accepts the backup (favourite restored, toast)');
await tap('#dl2'); let prog = '';
for (let i = 0; i < 20 && !/Téléchargement des formes et fiches/.test(prog); i++) { await sleep(250); prog = await p.$eval('#menu #offline', e => e.textContent); }
ok(/Téléchargement des formes et fiches : \d+\/\d+/.test(prog), 'offline pack button starts the download, progress shown in the menu: ' + prog.slice(0, 60));
await p.goto(BASE + '#/p/25'); await sleep(600); ok(!(await isOpen()), 'navigation closes the menu');
ok(!errs.length, 'no JS errors ' + errs.join(' | '));
await b.close(); console.log(fails ? `${fails} FAIL` : 'ALL PASS'); process.exit(fails ? 1 : 0);
