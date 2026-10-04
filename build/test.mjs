// Headless Chrome tests. Usage: node test.mjs [port]   (serve docs/ first)
import puppeteer from 'puppeteer-core';
const BASE = `http://localhost:${process.argv[2] || 8801}/`;
const SHOTS = '/workspace/pokedex/screenshots/';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const errs = []; let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function mk(w, h, mobile) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
  p.on('pageerror', e => errs.push(w + ': ' + e.message)); p.on('console', m => m.type() === 'error' && errs.push(w + ': ' + m.text()));
  return p;
}
for (const [w, h, mobile] of [[360, 780, true], [1000, 800, false]]) {
  const p = await mk(w, h, mobile); const tag = w + 'px';
  const count = () => p.$eval('#count', e => e.textContent);
  const cards = n => p.$$eval('.card', (es, n) => es.slice(0, n).map(e => e.querySelector('.nm').textContent.trim() + '|' + e.querySelector('.num').textContent.trim()), n);
  const go = async hash => { await p.goto(BASE + hash); await sleep(900); };
  await p.goto(BASE, { waitUntil: 'networkidle0' });
  console.log(`--- ${tag}`);
  ok(/^1025 Pokémon/.test(await count()), tag + ' initial count ' + await count());
  // game options order
  const opts = await p.$$eval('#game option', o => o.map(x => x.textContent));
  console.log(opts.join(' | '));
  ok(opts[1] === 'Pokémon HOME' && opts[2] === 'Pokémon GO' && /Z-A/.test(opts[3]) && /Rouge/.test(opts[opts.length - 1]), tag + ' game option order');
  // layout: game select left of gen
  const pos = await p.evaluate(() => { const a = document.querySelector('#game').getBoundingClientRect(), g = document.querySelector('#gen').getBoundingClientRect(); return [a.left < g.left, a.top === g.top, document.documentElement.scrollWidth <= innerWidth]; });
  ok(pos[0] && pos[1] && pos[2], tag + ' game select left of gen, no h-overflow ' + pos);
  await p.screenshot({ path: SHOTS + `list-${tag}.png` });
  // games
  const sel = async id => { await p.select('#game', id); await sleep(500); };
  await sel('rb'); let c = await cards(3); console.log('rb', await count(), c);
  ok((await count()).startsWith('151') && c[0].startsWith('Bulbizarre|#001'), tag + ' Rouge/Bleu 151 starting Bulbizarre #001');
  await sel('sv'); c = await cards(3); console.log('sv', await count(), c);
  ok(/Poussacha/.test(c[0]) && /#001/.test(c[0]), tag + ' Paldea #001 = Poussacha');
  await sel('sw'); c = await cards(3); console.log('sw', await count(), c);
  ok(/#001/.test(c[0]), tag + ' Galar dex #001: ' + c[0]);
  await sel('za'); c = await cards(2); console.log('za', await count(), c); ok(/Germignon/.test(c[0]), tag + ' Z-A first');
  await sel('go'); console.log('go', await count());
  await p.screenshot({ path: SHOTS + `game-go-${tag}.png` });
  await sel('sw'); await p.screenshot({ path: SHOTS + `game-sw-${tag}.png` });
  // forms toggle
  await sel('');
  await p.click('#formsbtn'); await sleep(400);
  const nForms = parseInt(await count()); ok(nForms > 1500, tag + ' forms shown: ' + await count());
  await p.type('#q', 'raichu'); await sleep(200); console.log('raichu+forms', await cards(6));
  await p.screenshot({ path: SHOTS + `forms-${tag}.png` });
  await p.$eval('#q', e => { e.value = ''; e.dispatchEvent(new Event('input')); });
  await p.click('#formsbtn'); await sleep(200);
  ok((await count()).startsWith('1025'), tag + ' forms hidden again');
  // detail pages
  for (const [k, re] of [['201-b', /Zarbi/], ['678-female', /Mistigrix/], ['26-alola', /Raichu/], ['25-female', /Pikachu/]]) {
    await go('#/p/' + k);
    const h = await p.$eval('.hero h1', e => e.textContent); const img = await p.$eval('#heroimg', e => e.naturalWidth);
    ok(re.test(h) && img > 0, `${tag} #/p/${k} -> ${h} img=${img}`);
    await p.screenshot({ path: SHOTS + `detail-${k}-${tag}.png`, fullPage: true });
  }
  // game switcher: Mélofée (35)
  await go('#/p/35'); await p.select('#dgame', 'rb'); await sleep(300);
  const bt = () => p.$eval('.hero .badges', e => e.textContent); let t = await bt(); let st = await p.$$eval('.stat', es => es.map(e => e.textContent));
  console.log('35 rb', t.slice(0, 80), st.join(' / '));
  ok(/Normal/.test(t) && !/Fée/.test(t) && st.some(s => s.startsWith('Spécial')), tag + ' Mélofée Gen1: Normal + Spécial');
  await p.screenshot({ path: SHOTS + `detail-35-rb-${tag}.png`, fullPage: true });
  await p.select('#dgame', 'sv'); await sleep(300);
  t = await bt(); ok(/Fée/.test(t), tag + ' Mélofée sv: Fée');
  await p.select('#dgame', 'oras'); await sleep(300); t = await bt(); ok(/Fée/.test(t), tag + ' Mélofée oras: Fée');
  await p.select('#dgame', 'hgss'); await sleep(300); t = await bt(); ok(!/Fée/.test(t), tag + ' Mélofée hgss: Normal');
  const mv = await p.$$eval('.mv', e => e.length); ok(mv > 5, tag + ' moves rows ' + mv);
  await p.screenshot({ path: SHOTS + `detail-35-hgss-${tag}.png`, fullPage: true });
  // GO
  await go('#/p/150'); await p.select('#dgame', 'go'); await sleep(700);
  let txt = await p.$eval('.detail', e => e.textContent);
  ok(txt.includes('4 724') || txt.includes('4\u202f724') || txt.includes('4 724'), tag + ' Mewtwo max CP 4724: ' + (txt.match(/[\d  ]{4,7}PC max niv\. 50/) || [''])[0]);
  await p.screenshot({ path: SHOTS + `detail-150-go-${tag}.png`, fullPage: true });
  await go('#/p/242'); await p.select('#dgame', 'go'); await sleep(700);
  txt = await p.$eval('.detail', e => e.textContent); ok(/3\s?117/.test(txt), tag + ' Leuphorie max CP 3117');
  // evolution
  await go('#/p/133'); await p.select('#dgame', 'go'); await sleep(600);
  await p.screenshot({ path: SHOTS + `detail-133-go-${tag}.png`, fullPage: true });
  await go('#/p/133'); await p.select('#dgame', 'home'); await sleep(300);
  const evl = await p.$$eval('.evpk', e => e.map(x => x.getAttribute('href'))); ok(evl.length >= 9, tag + ' Evoli evo links ' + evl.length);
  await go('#/p/26-alola'); await p.select('#dgame', 'home'); await sleep(300);
  const ea = await p.$$eval('.evpk', e => e.map(x => x.getAttribute('href') + ':' + x.textContent)); console.log('26-alola evo', ea); ok(ea.some(x => x.startsWith('#/p/25-alola') || x.startsWith('#/p/25')) , tag + ' alola evo links');
  // caught / shiny / fav for forms and base
  await go('#/p/26-alola');
  await p.click('.dnav .cg'); await p.click('.dnav .sh'); await p.click('.dnav .fav');
  let ls = await p.evaluate(() => [localStorage.caught, localStorage.shiny, localStorage.favs]);
  ok(ls.every(x => x.includes('"26-alola"')), tag + ' form stored as string key ' + ls);
  await go('#/p/25'); await p.click('.dnav .cg'); ls = await p.evaluate(() => localStorage.caught); ok(/25/.test(ls) && ls.includes('26-alola'), tag + ' base int stored ' + ls);
  // buttons alignment
  const al = await p.evaluate(() => [...document.querySelectorAll('.dnav .cg,.dnav .sh')].map(b => { const r = b.getBoundingClientRect(); const ic = b.querySelector('svg'); const ir = ic && ic.getBoundingClientRect(); return { oneLine: b.scrollHeight <= b.clientHeight + 1, noOverflow: b.scrollWidth <= b.clientWidth + 1, iconLeft: !ic || ir.right <= r.right && ir.left >= r.left, within: r.right <= innerWidth }; }));
  ok(al.every(x => x.oneLine && x.noOverflow && x.iconLeft && x.within), tag + ' dnav buttons ' + JSON.stringify(al));
  const tops = await p.evaluate(() => [...document.querySelectorAll('.dnav > :not(.sp)')].map(e => Math.round(e.getBoundingClientRect().top))); ok(new Set(tops).size === 1, tag + ' all dnav items on one row ' + tops);
  await p.screenshot({ path: SHOTS + `dnav-${tag}.png`, clip: { x: 0, y: 0, width: w, height: 140 } });
  // list shows marks, cat filter
  await go('#/'); await p.select('#cat', 'caught'); await sleep(200); console.log('caught filter', await count());
  await p.select('#cat', ''); 
  // export / import compat
  const exp = await p.evaluate(() => JSON.stringify({ favs: [...FAVS], caught: [...CAUGHT], shiny: [...SHINY] }));
  console.log('export', exp);
  await p.evaluate(() => { localStorage.clear(); });
  await p.close();
}
// offline test
{
  const p = await mk(360, 780, true);
  await p.goto(BASE, { waitUntil: 'networkidle0' });
  await p.evaluate(() => navigator.serviceWorker.ready); await sleep(1500);
  await p.goto(BASE + '#/p/25'); await sleep(1000); // caches sp/25 + shared
  await p.evaluate(() => document.querySelector('#dgame') && 0);
  await p.goto(BASE); await sleep(500);
  await p.evaluate(() => { document.querySelector('#dl2')?.click(); });
  for (let i = 0; i < 60; i++) { await sleep(2000); if (await p.evaluate(() => localStorage.packDone2)) break; }
  console.log('imgsDone', await p.evaluate(() => localStorage.imgsDone), 'packDone2', await p.evaluate(() => localStorage.packDone2));
  const nImg = await p.evaluate(async () => (await (await caches.open('pokedex-img')).keys()).length);
  const nData = await p.evaluate(async () => { for (const k of await caches.keys()) if (k.startsWith('pokedex-data')) return (await (await caches.open(k)).keys()).length; });
  console.log('cached imgs', nImg, 'data', nData);
  await p.setOfflineMode(true);
  await p.reload({ waitUntil: 'load' }); await sleep(1500);
  ok((await p.$eval('#count', e => e.textContent)).startsWith('1025'), 'offline reload list');
  await p.goto(BASE + '#/p/700'); await sleep(1200);
  ok(/Nymphali/.test(await p.$eval('.hero h1', e => e.textContent)), 'offline detail page');
  await p.select('#dgame', 'go'); await sleep(500); ok(/PC max/.test(await p.$eval('.detail', e => e.textContent)), 'offline GO page');
  await p.goto(BASE); await sleep(300); await p.select('#game', 'za'); await sleep(500); ok((await p.$eval('#count', e => e.textContent)).startsWith('232'), 'offline game dex');
  await p.close();
}
console.log('console errors:', errs.length, errs.slice(0, 10));
console.log(fails ? `${fails} FAILURES` : 'ALL PASS');
await b.close();
