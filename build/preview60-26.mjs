// v60.26 : captures (390 px) de l’historique des œufs GO sur les fiches. Usage : node preview60-26.mjs [baseURL]
import puppeteer from 'puppeteer-core'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:8960/', OUT = '/workspace/pokedex-v6026/screenshots/apercu-v60.26/'; fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms)), errs = [];
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage(); p.on('pageerror', e => errs.push('pageerror ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text()); });
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await p.goto(BASE, { waitUntil: 'networkidle0' }); await sleep(800);
const unstick = () => p.evaluate(() => { for (const el of document.querySelectorAll('body *')) { const ps = getComputedStyle(el).position; if (ps === 'sticky' || ps === 'fixed') el.style.visibility = 'hidden'; } });
const shot = async (name, key, openHist) => {
  await p.evaluate(k => { location.hash = '#/p/' + k; }, key); await sleep(2000);
  await p.evaluate(() => changeGame('go')); await sleep(1500);
  const sec = await p.evaluateHandle(() => [...document.querySelectorAll('#detail-view section.box')].find(s => /^Disponibilité/.test(s.querySelector('h2')?.textContent || '')));
  if (!sec.asElement()) { console.log('! pas de bloc', name); return; }
  await p.evaluate((s, open) => {
    const fb = s.querySelector('.foldbtn'); if (fb && !s.classList.contains('open')) fb.click();
    if (open) s.querySelectorAll('details.egh, details.eghsub').forEach(d => { d.open = true; });
    s.scrollIntoView();
  }, sec, openHist);
  await unstick(); await sleep(400);
  const txt = await p.evaluate(s => s.innerText.replace(/\s+/g, ' ').slice(0, 700), sec);
  await sec.asElement().screenshot({ path: OUT + name + '.png' });
  console.log(OUT + name + '.png\n   ' + txt);
};
await shot('01-bulbizarre-pool-actuel-et-historique', '1', true);
await shot('02-riolu-nombreuses-saisons', '447', true);
await shot('03-diglett-alola-cadeau-ami', '50-alola', true);
await shot('04-farfuret-hisui-cadeau-de-route', '215-hisui');
await shot('05-lucario-deja-sorti-pas-actuel', '448', true);
await shot('06-mewtwo-sans-oeuf', '150');
console.log('ERREURS', JSON.stringify(errs)); await b.close();
