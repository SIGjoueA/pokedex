// v44 check: completing OLD games must not turn the list Poké Ball gold (gold = jeux actuels only)
import puppeteer from 'puppeteer-core';
const BASE = 'http://localhost:8811/';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
const sleep = ms => new Promise(r => setTimeout(r, ms));
await p.goto(BASE, { waitUntil: 'networkidle0' }); await sleep(800);
// pick: Bulbizarre (1, in old + current), plus a form available only in old games (sw empty), if any
const pick = await p.evaluate(() => {
  const bulb = E.find(x => x.id === 1 && !x.bo && !x.mb);
  const oldOnly = E.find(x => !x.bo && !x.mb && (() => { const s = baseStatus(x); return s.sw.length === 0 && s.old.length > 0; })());
  const keys = [bulb, oldOnly].filter(Boolean);
  const caught = keys.flatMap(x => baseStatus(x).old.map(g => g + ':' + x.k));
  return { picks: keys.map(x => ({ k: x.k, id: x.id, n: x.n, l: x.l || '', sw: baseStatus(x).sw, old: baseStatus(x).old })), caught };
});
console.log(JSON.stringify(pick.picks));
await p.evaluate(c => { localStorage.setItem('caught_g', JSON.stringify(c)); }, pick.caught);
await p.reload({ waitUntil: 'networkidle0' }); await sleep(800);
let fails = 0;
for (const x of pick.picks) {
  const r = await p.evaluate(k => { const q = BY_KEY[k], s = baseStatus(q), d = document.createElement('div'); d.innerHTML = baseBall(q);
    return { swDone: s.swDone, oldDone: s.oldDone, goldSvg: !!d.querySelector('svg.ball.gold'), lvl: d.querySelector('.lvl')?.textContent || '', html: d.innerHTML.length }; }, x.k);
  const good = r.oldDone && !r.swDone && !r.goldSvg && r.lvl === '🕹';
  if (!good) fails++;
  console.log((good ? 'PASS ' : 'FAIL ') + `${x.n} ${x.l} (${x.k}) sw=${x.sw.length} old=${x.old.length} → ` + JSON.stringify(r));
}
// card in the list actually rendered?
const card = await p.evaluate(k => { const c = [...document.querySelectorAll('.card')].find(e => /Bulbizarre/.test(e.textContent)); return c ? { gold: !!c.querySelector('svg.ball.gold'), lvl: c.querySelector('.lvl')?.textContent || '' } : null; });
console.log('card Bulbizarre:', JSON.stringify(card)); if (!card || card.gold) fails++;
// current-games complete still gold
const r2 = await p.evaluate(() => { const q = E.find(x => x.id === 1 && !x.bo && !x.mb), s = baseStatus(q); const all = [...s.sw, ...s.old].map(g => g + ':' + q.k); return all; });
await p.evaluate(c => localStorage.setItem('caught_g', JSON.stringify(c)), r2); await p.reload({ waitUntil: 'networkidle0' }); await sleep(800);
const r3 = await p.evaluate(() => { const q = E.find(x => x.id === 1 && !x.bo && !x.mb), s = baseStatus(q), d = document.createElement('div'); d.innerHTML = baseBall(q); return { swDone: s.swDone, oldDone: s.oldDone, gold: !!d.querySelector('svg.ball.gold'), lvl: d.querySelector('.lvl')?.textContent || '' }; });
const g3 = r3.swDone && r3.gold && r3.lvl === '🕹'; if (!g3) fails++;
console.log((g3 ? 'PASS ' : 'FAIL ') + 'Bulbizarre all games → gold + 🕹 ' + JSON.stringify(r3));
console.log('errors:', errs.length ? errs : 'none', '| fails:', fails);
await b.close(); process.exit(fails ? 1 : 0);
