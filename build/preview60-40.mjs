// v60.40 : captures 390 px avant / après des faiblesses avec météo, terrain, objets, Téra, Gravité.
// Usage : node preview60-40.mjs <baseURL> <préfixe>
import puppeteer from 'puppeteer-core'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://127.0.0.1:8940/';
const PRE = process.argv[3] || 'apres';
const OUT = new URL('../screenshots/apercu-v60.40/', import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms)), errs = [];
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
p.on('pageerror', e => errs.push('pageerror ' + e.message));
p.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text()); });
await p.evaluateOnNewDocument(() => {
  Object.defineProperty(navigator, 'connection', { configurable: true, get: () => ({ saveData: true, type: 'cellular' }) });
});
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const hideChrome = () => p.evaluate(() => {
  document.querySelectorAll('#upd, #toast, .toast').forEach(el => { el.hidden = true; el.style.display = 'none'; });
});
const shot = async (name) => {
  await hideChrome();
  const path = `${OUT}${PRE}-${name}.png`;
  await p.screenshot({ path });
  const txt = await p.evaluate(() => {
    const box = document.querySelector('#detail-view section.box h2') ? [...document.querySelectorAll('#detail-view section.box')].find(s => /Faiblesses/.test(s.innerText)) : null;
    const t = (box ? box.innerText : document.body.innerText).replace(/\s+/g, ' ').slice(0, 360);
    return t;
  });
  console.log(path + '\n   ' + txt);
};
const gotoSheet = async (hash) => {
  await p.goto(BASE + hash + (hash.includes('?') ? '&' : '?') + 'v=6040' + PRE, { waitUntil: 'networkidle0' });
  await p.evaluate(async () => {
    if (navigator.serviceWorker) { const regs = await navigator.serviceWorker.getRegistrations(); for (const r of regs) await r.unregister(); }
  });
  await p.waitForSelector('#detail-view .detail, #detail-view h1, #heroimg', { timeout: 20000 }).catch(() => {});
  await sleep(900);
};
const scrollEff = async () => {
  await p.evaluate(() => {
    const box = document.querySelector('#effbox') || [...document.querySelectorAll('#detail-view section.box')].find(s => /Faiblesses/.test(s.querySelector('h2')?.textContent || ''));
    const sticky = document.querySelector('#detail-view .dtop') || document.querySelector('.dgbar');
    const h = sticky ? sticky.getBoundingClientRect().bottom : 120;
    if (box) window.scrollTo(0, Math.max(0, box.getBoundingClientRect().top + window.scrollY - h - 6));
  });
  await sleep(250);
};
const setGame = async (id) => {
  await p.waitForSelector('#dgame', { timeout: 15000 });
  const picked = await p.evaluate((id) => {
    const sel = document.querySelector('#dgame');
    if (!sel) return null;
    const ids = [...sel.options].map(o => o.value);
    const alts = id === 'sv' ? ['sv', 'svmask', 'svdisk', 'svhors'] : [id];
    const v = alts.find(x => ids.includes(x)) || null;
    if (!v) return { ok: false, ids };
    sel.value = v;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    return { ok: true, v, ids };
  }, id);
  if (!picked || !picked.ok) throw new Error('jeu introuvable : ' + id + ' parmi ' + JSON.stringify(picked && picked.ids));
  await p.waitForFunction((v) => {
    const sel = document.querySelector('#dgame');
    const label = (document.querySelector('#dgamebtn') || {}).textContent || '';
    return sel && (sel.value === v || /Écarlate|Violet|Paldea/.test(label));
  }, { timeout: 15000 }, picked.v);
  await sleep(800);
  await p.waitForSelector('#efffield, #eff', { timeout: 15000 });
};
const setField = async (vals) => {
  await p.evaluate((vals) => {
    const set = (id, v) => { const el = document.querySelector('#' + id); if (!el) return; el.value = v; el.dispatchEvent(new Event('change', { bubbles: true })); };
    if ('wx' in vals) set('effwx', vals.wx);
    if ('tr' in vals) set('efftr', vals.tr);
    if ('it' in vals) set('effit', vals.it);
    if ('tera' in vals) set('efftera', vals.tera);
    if ('grav' in vals) {
      const el = document.querySelector('#effgrav');
      if (el && el.checked !== !!vals.grav) { el.checked = !!vals.grav; el.dispatchEvent(new Event('change', { bubbles: true })); }
    }
  }, vals);
  await sleep(400);
};

if (PRE === 'avant') {
  await gotoSheet('#/p/145');
  await setGame('sv');
  await scrollEff();
  await shot('01-electhor-faiblesses');
  await gotoSheet('#/p/6');
  await setGame('sv');
  await scrollEff();
  await shot('02-dracaufeu-faiblesses');
} else {
  await gotoSheet('#/p/145');
  await setGame('sv');
  await scrollEff();
  await shot('01-electhor-options');
  await setField({ grav: true });
  await scrollEff();
  await shot('02-electhor-gravite');
  await setField({ grav: false, it: 'iron' });
  await scrollEff();
  await shot('03-electhor-balle-fer');
  await setField({ it: 'balloon' });
  await scrollEff();
  await shot('04-electhor-ballon');
  await gotoSheet('#/p/6');
  await setGame('sv');
  await setField({ wx: 'winds', it: '', grav: false, tera: '', tr: '' });
  await scrollEff();
  await shot('05-dracaufeu-vents');
  await setField({ wx: '', tera: 'fire' });
  await scrollEff();
  await shot('06-dracaufeu-tera-feu');
  await setField({ tera: '', wx: 'sand' });
  await scrollEff();
  await shot('07-dracaufeu-tempete-sable-note');
}
await b.close();
if (errs.length) { console.error('preview errors:\n' + errs.join('\n')); process.exit(1); }
