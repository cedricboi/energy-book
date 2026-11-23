// scripts/all-pages.mjs
// One screenshot of every page of every lesson (instant turns), for looking
// over the whole book. Reports errors and pages whose text does not fit.
//   node scripts/all-pages.mjs [base] [WxH] [quality]
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const [base = 'http://localhost:5199', size = '1366x768', q = 'high'] = process.argv.slice(2);
const [width, height] = size.split('x').map(Number);
const out = `tests/screenshots/all/${size}`;
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const tab = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
const problems = [];
tab.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
tab.on('console', (m) => { if (m.type() === 'error') problems.push(`console error: ${m.text().slice(0, 200)}`); });
await tab.goto(`${base}/?q=${q}&drawin=off`);
await tab.waitForFunction(() => document.documentElement.dataset.ready === 'true', null, { timeout: 60_000 });
await tab.evaluate(() => document.fonts.ready);
const ids = await tab.evaluate(() => [...new Set([...document.querySelectorAll('[data-lesson]')].map((b) => b.dataset.lesson))]);
for (const id of ids) {
  await tab.evaluate((l) => window.__book.open(l, 0), id);
  const count = await tab.evaluate(() => window.__book.pageCount);
  for (let p = 0; p < count; p++) {
    await tab.evaluate(([l, n]) => window.__book.open(l, n), [id, p]);
    await tab.evaluate(() => window.__book.settle(1.2));
    await tab.waitForFunction(() => window.__stage.idle, null, { timeout: 20_000 }).catch(() => problems.push(`${id} p${p + 1}: never went idle`));
    const info = await tab.evaluate(() => ({ fits: window.__book.panelFits(), type: document.querySelector('.page-panel').dataset.type }));
    if (!info.fits.fits) problems.push(`${id} p${p + 1}: text overflows (${info.fits.scrollHeight} > ${info.fits.clientHeight})`);
    const right = await tab.evaluate(() => { const r = document.querySelector('.page-panel-right'); return r && !r.hidden && r.classList.contains('is-textbook') ? { s: r.scrollHeight, c: r.clientHeight } : null; });
    if (right && right.s > right.c + 2) problems.push(`${id} p${p + 1}: right page overflows (${right.s} > ${right.c})`);
    await tab.screenshot({ path: `${out}/${id}-p${String(p + 1).padStart(2, '0')}-${info.type}.jpg`, quality: 80 });
  }
  console.log(id, count);
}
console.log('\nPROBLEMS\n' + (problems.length ? [...new Set(problems)].join('\n') : 'none'));
await browser.close();
