// v45 check: list jump buttons ⬆︎ / ⬇︎ (iPhone viewport 390×844 @2x). Needs docs/ served on :8811. Screenshots → screenshots/v45/.
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
ok(!errs.length, 'no JS errors ' + errs.join(' | '));
await b.close(); console.log(fails ? `${fails} FAIL` : 'ALL PASS'); process.exit(fails ? 1 : 0);
