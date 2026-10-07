// v22 screenshots: mobile game sheet (origin-mark Transféré) + mobile Pokémon HOME sheet (all origin marks) (+ GO Méga-énergie X/Y). 360×780, 2×
import puppeteer from 'puppeteer-core';
const BASE = process.argv[2] || 'http://localhost:8801/';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const errs = [];
async function shot(game, hash, file, marks, full) {
  const p = await b.newPage();
  await p.setViewport({ width: 360, height: 780, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  p.on('pageerror', e => errs.push(file + ': ' + e.message));
  await p.goto(BASE, { waitUntil: 'networkidle0' });
  await p.evaluate(m => { localStorage.clear(); for (const [k, v] of Object.entries(m)) localStorage.setItem(k, JSON.stringify(v)); }, marks);
  await p.reload({ waitUntil: 'networkidle0' });
  await p.select('#game', game); await sleep(600);
  await p.goto(BASE + hash); await sleep(2000);
  await p.evaluate(() => { const t = document.querySelector('.trackbox'); window.scrollTo(0, t.getBoundingClientRect().top + scrollY - 70); }); await sleep(400);
  await p.screenshot({ path: '/workspace/pokedex/screenshots/' + file });
  const info = await p.evaluate(() => {
    const bar = document.querySelector('#actbar'), r = bar.getBoundingClientRect();
    const btns = [...bar.querySelectorAll('.act')], out = btns.filter(x => { const q = x.getBoundingClientRect(); return q.left < 0 || q.right > innerWidth + 0.5 || q.bottom > innerHeight + 0.5; }).length;
    const clip = btns.filter(x => { const t = x.querySelector('.t'); return t && t.scrollWidth > t.clientWidth + 1; }).map(x => x.textContent.trim());
    return { ctx: bar.querySelector('.actctx').textContent, btns: btns.map(x => (x.dataset.origin || x.dataset.energy || x.classList[1]) + (x.disabled ? '(grisé)' : '') + '=' + x.getAttribute('aria-pressed')).join(' '),
      barTop: Math.round(r.top), barH: Math.round(r.height), pageOverflow: document.documentElement.scrollWidth > innerWidth, btnOutside: out, clipped: clip,
      padBottom: getComputedStyle(document.querySelector('#detail-view')).paddingBottom };
  });
  console.log(file, JSON.stringify(info));
  await p.close();
}
await shot('sw', '#/p/25', 'v22-fiche-mobile-jeu-epee.png', { caught_g: ['sw:25', 'swisle:25', 'swcrown:25'], home_o: ['galar:25', 'paldea:25', 'go:25'], home_og: ['galar:25'] });
await shot('home', '#/p/25', 'v23-fiche-mobile-home.png', { caught_g: ['sw:25', 'swisle:25', 'swcrown:25'], home_o: ['galar:25', 'paldea:25', 'go:25', 'kalos:25', 'gb:25'], home_og: ['galar:25'] });
await shot('go', '#/p/6', 'v22-fiche-mobile-go-energie-xy.png', { caught_g: ['go:6'], mega_energy: ['6-x'] });
console.log('errs', errs);
await b.close();
