// v46b check: « 🐞 Signaler un bug / proposer une idée » row of the ☰ menu (iPhone 390×844 @2x). Needs docs/ served on :8811.
import puppeteer from 'puppeteer-core';
const BASE = 'http://localhost:8811/', OUT = new URL('../screenshots/v46/', import.meta.url).pathname;
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
await p.emulate({ viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
const sleep = ms => new Promise(r => setTimeout(r, ms)); let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
await p.goto(BASE + '#/', { waitUntil: 'networkidle0' }); await sleep(800);
await p.evaluate(() => { localStorage.setItem('imgsDoneF', 'true'); localStorage.setItem('seenV', '"v46"'); }); await p.reload({ waitUntil: 'networkidle0' }); await sleep(1500);
await p.tap('#menubtn'); await sleep(800);
await p.evaluate(() => { const m = document.querySelector('#menu'); m.scrollTop = m.scrollHeight; }); await sleep(300);
const row = await p.$eval('#bugbtn', e => { const r = e.getBoundingClientRect(), m = document.querySelector('#menu').getBoundingClientRect(); return { t: e.textContent.trim(), h: r.height, vis: r.bottom <= m.bottom && r.top >= m.top, w: r.width }; });
ok(/🐞 Signaler un bug \/ proposer une idée/.test(row.t) && row.h >= 44 && row.vis, `row visible (${Math.round(row.w)}×${Math.round(row.h)})`);
await p.screenshot({ path: OUT + '3-menu-bug.png' });
const href = await p.$eval('#bugbtn', e => e.getAttribute('href'));
const u = new URL(href), q = u.searchParams; // URLSearchParams decodes %XX (and would turn a raw + into a space)
const subj = decodeURIComponent(href.match(/subject=([^&]*)/)[1]), body = decodeURIComponent(href.match(/body=([^&]*)/)[1]);
ok(u.protocol === 'mailto:' && u.pathname === 'pokedexsigjouea@gmail.com', 'mailto: pokedexsigjouea@gmail.com');
ok(subj === 'Pokédex v46 – bug ou idée', `subject « ${subj} »`);
ok(/^[A-Za-z0-9:@.?=&%_\-!~*'()]+$/.test(href) && !/[ +#\n]/.test(href), 'href fully percent-encoded (no raw space, +, #, newline)');
ok(/^Décris le problème ou ton idée :/.test(body) && /\r\nVersion : v46 · données d23\r\n/.test(body) && /Vue : Tous les jeux · grille/.test(body) && /Fiche : aucune/.test(body) && /Écran : 390×844 \(×2\)/.test(body) && /Appareil : Mozilla\/5\.0 \(iPhone/.test(body), 'body: template, version, view, sheet, screen, UA');
console.log('--- body ---\n' + body.replace(/\r/g, '') + '\n---');
// a sheet open (menu reached via the toast / banner link): view + sheet appear
await p.keyboard.press('Escape'); await p.evaluate(() => { location.hash = '#/p/6'; }); await sleep(1500);
await p.evaluate(() => menuOpen(true)); await sleep(500);
const b2 = await p.$eval('#bugbtn', e => decodeURIComponent(e.getAttribute('href').match(/body=([^&]*)/)[1]));
ok(/Fiche : Dracaufeu #0006/.test(b2), 'sheet open → « Fiche : Dracaufeu #0006 »');
// navigation is not intercepted: a tap leaves to mailto: (request blocked here)
await p.evaluate(() => menuOpen(false)); await p.evaluate(() => { location.hash = '#/'; }); await sleep(800);
await p.tap('#menubtn'); await sleep(500);
const nav = await p.evaluate(() => new Promise(res => { const a = document.querySelector('#bugbtn'); document.addEventListener('click', e => { res({ prevented: e.defaultPrevented, href: a.href.slice(0, 60) }); e.preventDefault(); }, { once: true }); a.click(); }));
ok(!nav.prevented && nav.href.startsWith('mailto:pokedexsigjouea@gmail.com?subject='), 'tap follows the mailto: link (default not prevented)');
ok(!errs.length, 'no JS errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
await b.close(); console.log(fails ? `${fails} FAIL` : 'ALL PASS'); process.exit(fails ? 1 : 0);
