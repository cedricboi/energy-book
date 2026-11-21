// scripts/walk.mjs
// Walk the book the way a student does: open each lesson from the contents,
// press Next on every page, and screenshot what is on screen. No test
// shortcuts (no settle, no instant turns). Reports errors and slow turns.
//   node scripts/walk.mjs [base] [WxH] [lessonId,...]
import { chromium } from '@playwright/test';

const [base = 'http://localhost:5199', size = '1440x900', only = ''] = process.argv.slice(2);
const [width, height] = size.split('x').map(Number);
const out = `tests/screenshots/walk/${size}`;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const tab = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
const problems = [];
tab.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
tab.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') problems.push(`console ${m.type()}: ${m.text().slice(0, 200)}`); });
await tab.goto(`${base}/?q=${process.env.Q ?? 'medium'}`);
await tab.waitForFunction(() => document.documentElement.dataset.ready === 'true', null, { timeout: 60_000 });
await tab.evaluate(() => document.fonts.ready);
const idle = async (label) => {
  const t0 = Date.now();
  try {
    await tab.waitForFunction(() => !window.__book.state.busy && window.__book.drawInDone(), null, { timeout: 45_000 });
  } catch { problems.push(`${label}: still busy or drawing after 45 s`); }
  return Date.now() - t0;
};
const lessons = await tab.evaluate(() => [...document.querySelectorAll('.page-panel-right [data-lesson], .toc-portrait [data-lesson]')].map((b) => b.dataset.lesson));
const ids = [...new Set(lessons)].filter((id) => !only || only.split(',').includes(id));
await tab.screenshot({ path: `${out}/00-contents.png` });
for (const id of ids) {
  await tab.evaluate(() => window.__book.state.lesson && document.querySelector('.hud-menu').click());
  // Back to the contents through the menu is a dialog; use the page list instead.
  await tab.evaluate(() => document.querySelector('dialog.book-menu[open] button[value=close]')?.click());
  if (await tab.evaluate(() => !!window.__book.state.lesson)) {
    await tab.evaluate(() => window.__book.open && null);
    await tab.goto(`${base}/?q=${process.env.Q ?? 'medium'}`);
    await tab.waitForFunction(() => document.documentElement.dataset.ready === 'true', null, { timeout: 60_000 });
  }
  const btn = tab.locator(`[data-lesson="${id}"]:visible`).first();
  try { await btn.click({ timeout: 10_000 }); } catch (e) { problems.push(`${id}: contents row not clickable: ${e.message.split('\n')[0]}`); continue; }
  await tab.waitForFunction((l) => window.__book.state.lesson === l, id, { timeout: 30_000 }).catch(() => problems.push(`${id}: never opened`));
  let ms = await idle(`${id} open`);
  const count = await tab.evaluate(() => window.__book.pageCount);
  for (let p = 0; p < count; p++) {
    await tab.waitForTimeout(700);
    const info = await tab.evaluate(() => ({ s: window.__book.state, fits: window.__book.panelFits(), type: document.querySelector('.page-panel').dataset.type }));
    if (info.s.index !== p) problems.push(`${id} p${p + 1}: on index ${info.s.index}`);
    if (!info.fits.fits) problems.push(`${id} p${p + 1}: text overflows (${info.fits.scrollHeight} > ${info.fits.clientHeight})`);
    await tab.screenshot({ path: `${out}/${id}-p${String(p + 1).padStart(2, '0')}-${info.type}.png` });
    console.log(id, p + 1, info.type, `${ms} ms`);
    if (p < count - 1) {
      await tab.locator('.hud-next').click({ timeout: 10_000 }).catch((e) => problems.push(`${id} p${p + 1}: Next not clickable: ${e.message.split('\n')[0]}`));
      ms = await idle(`${id} p${p + 2}`);
    }
  }
}
console.log('\nPROBLEMS\n' + (problems.length ? [...new Set(problems)].join('\n') : 'none'));
await browser.close();
