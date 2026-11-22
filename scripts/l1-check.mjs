// scripts/l1-check.mjs
// Looks over Lesson 1 at several window sizes: each spread as it opens, after
// every object has been tapped, and with every question answered.
//   node scripts/l1-check.mjs [base]
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const [base = 'http://localhost:5199'] = process.argv.slice(2);
const sizes = (process.env.SIZES ?? '1366x768,1920x1080,1024x768,768x1024,600x800,360x740').split(',');
const out = 'tests/screenshots/l1';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const problems = [];
for (const size of sizes) {
  const [width, height] = size.split('x').map(Number);
  const tab = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  tab.on('pageerror', (e) => problems.push(`${size} pageerror: ${e.message}`));
  tab.on('console', (m) => { if (m.type() === 'error') problems.push(`${size} console error: ${m.text().slice(0, 200)}`); });
  await tab.goto(`${base}/?q=high&drawin=off`);
  await tab.waitForFunction(() => document.documentElement.dataset.ready === 'true', null, { timeout: 60_000 });
  await tab.evaluate(() => { localStorage.clear(); return document.fonts.ready; });
  const idle = (tag) => tab.waitForFunction(() => window.__stage.idle, null, { timeout: 30_000 }).catch(() => problems.push(`${size} ${tag}: never went idle`));
  for (const p of [0, 1]) {
    await tab.evaluate((n) => window.__book.open('l1-stores', n), p);
    await tab.evaluate(() => window.__book.settle(1.2));
    await idle(`p${p + 1}`);
    const shot = (tag) => tab.screenshot({ path: `${out}/${size}-p${p + 1}-${tag}.jpg`, quality: 82 });
    await shot('a-open');
    const n = await tab.evaluate(() => {
      const bs = [...document.querySelectorAll('button')].filter((b) => /^Tap /.test(b.getAttribute('aria-label') ?? b.textContent.trim()));
      bs.forEach((b) => b.click());
      return bs.length;
    });
    if (!n) problems.push(`${size} p${p + 1}: no Tap buttons`);
    await tab.evaluate(() => window.__book.settle(2.5));
    await idle(`p${p + 1} tapped`);
    await shot('b-tapped');
    // Answer everything, wrongly where there is a choice, so feedback shows.
    await tab.evaluate(() => {
      for (const r of document.querySelectorAll('.tb-q input[type=radio]')) if (r.closest('.q-options')?.querySelector('input') === r) r.click();
      for (const s of document.querySelectorAll('.tb-q select')) { s.selectedIndex = 1; s.dispatchEvent(new Event('change', { bubbles: true })); }
      for (const t of document.querySelectorAll('.tb-q textarea')) { t.value = 'The energy is kept in the elastic store because the band is stretched and she is high.'; t.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    await tab.evaluate(() => { for (const b of document.querySelectorAll('.tb-q button')) if (/check/i.test(b.textContent)) b.click(); });
    await tab.evaluate(() => window.__book.settle(1));
    await idle(`p${p + 1} answered`);
    const fits = await tab.evaluate(() => window.__book.panelFits());
    const stacked = await tab.evaluate(() => !document.querySelector('.page-panel').classList.contains('is-printed'));
    if (!fits.fits && !stacked) problems.push(`${size} p${p + 1} answered: text overflows (${fits.scrollHeight} > ${fits.clientHeight})`);
    const right = await tab.evaluate(() => { const r = document.querySelector('.spread-right'); return r ? { s: r.scrollHeight, c: r.clientHeight, ps: r.parentElement.scrollHeight, pc: r.parentElement.clientHeight } : null; });
    if (right && !stacked && right.ps > right.pc + 2) problems.push(`${size} p${p + 1} answered: right page overflows (${right.ps} > ${right.pc})`);
    await shot('c-answered');
  }
  await tab.close();
}
console.log('\nPROBLEMS\n' + (problems.length ? [...new Set(problems)].join('\n') : 'none'));
await browser.close();
