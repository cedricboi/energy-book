// scripts/answered.mjs
// Marks every question on every spread (wrongly where it can) and reports
// any printed page whose text no longer fits.
//   node scripts/answered.mjs [base] [WxH]
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const [base = 'http://localhost:5199', size = '1366x768'] = process.argv.slice(2);
const [width, height] = size.split('x').map(Number);
const out = `tests/screenshots/answered/${size}`;
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const tab = await browser.newPage({ viewport: { width, height } });
const problems = [];
tab.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
await tab.goto(`${base}/?q=low&drawin=off`);
await tab.waitForFunction(() => document.documentElement.dataset.ready === 'true');
await tab.evaluate(() => localStorage.clear());
const ids = await tab.evaluate(() => [...new Set([...document.querySelectorAll('[data-lesson]')].map((b) => b.dataset.lesson))]);
for (const id of ids.filter((i) => i !== 'game')) {
  await tab.evaluate((l) => window.__book.open(l, 0), id);
  const count = await tab.evaluate(() => window.__book.pageCount);
  for (let p = 0; p < count; p++) {
    await tab.evaluate(([l, n]) => window.__book.open(l, n), [id, p]);
    await tab.evaluate(() => {
      for (const r of document.querySelectorAll('.tb-q input[type=radio], .tb-q input[type=checkbox]')) if (r.closest('.q-options')?.querySelector('input') === r) r.click();
      for (const s of document.querySelectorAll('.tb-q select')) { s.selectedIndex = 1; s.dispatchEvent(new Event('change', { bubbles: true })); }
      for (const t of document.querySelectorAll('.tb-q textarea')) { t.value = 'Energy is transferred to the internal store of the surroundings because of friction with the floor.'; t.dispatchEvent(new Event('input', { bubbles: true })); }
      for (const t of document.querySelectorAll('.tb-q input[type=number], .tb-q input[type=text]')) { t.value = '7'; t.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    await tab.evaluate(() => { for (const b of document.querySelectorAll('.tb-q button')) if (/check|commit/i.test(b.textContent)) b.click(); });
    await tab.evaluate(() => { for (const b of document.querySelectorAll('.tb-q .q-flap')) b.click(); });
    await tab.evaluate(() => window.__book.settle(1));
    await tab.waitForTimeout(700);
    await tab.waitForFunction(() => window.__stage.idle, null, { timeout: 20_000 }).catch(() => problems.push(`${id} p${p + 1}: never went idle`));
    const r = await tab.evaluate(() => {
      const l = window.__book.panelFits();
      const rp = document.querySelector('.page-panel-right');
      const printed = document.querySelector('.page-panel').classList.contains('is-printed');
      return { printed, l, r: rp && !rp.hidden ? { s: rp.scrollHeight, c: rp.clientHeight } : null };
    });
    if (r.printed && !r.l.fits) problems.push(`${id} p${p + 1}: left overflows (${r.l.scrollHeight} > ${r.l.clientHeight})`);
    if (r.printed && r.r && r.r.s > r.r.c + 2) problems.push(`${id} p${p + 1}: right overflows (${r.r.s} > ${r.r.c})`);
    await tab.screenshot({ path: `${out}/${id}-p${String(p + 1).padStart(2, '0')}.jpg`, quality: 78 });
  }
}
console.log('PROBLEMS\n' + (problems.length ? [...new Set(problems)].join('\n') : 'none'));
await browser.close();
