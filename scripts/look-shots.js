// scripts/look-shots.js
// Night and day screenshots of one page, plus a ?debug=hot view to check that
// only energy rises above the bloom threshold. Usage:
//   node scripts/look-shots.js http://localhost:5199 l5-ramp 2 1355x1205
import { chromium } from '@playwright/test';

const [base = 'http://localhost:5199', lesson = 'l5-ramp', page = '2', size = '1355x1205'] = process.argv.slice(2);
const [width, height] = size.split('x').map(Number);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const look of ['night', 'day']) {
  for (const hot of [false, true]) {
    const tab = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    tab.on('pageerror', (e) => console.log('pageerror', e.message));
    await tab.goto(`${base}/?q=high&drawin=off&look=${look}${hot ? '&debug=hot' : ''}`);
    await tab.waitForFunction(() => document.documentElement.dataset.ready === 'true', null, { timeout: 60_000 });
    await tab.evaluate(() => document.fonts.ready);
    await tab.evaluate((a) => window.__book.open(a.lesson, Number(a.page)), { lesson, page });
    await tab.evaluate(() => window.__book.settle(0));
    await tab.waitForTimeout(400);
    const file = `tests/screenshots/sample/look-${lesson}-${page}-${look}${hot ? '-hot' : ''}-${size}.png`;
    await tab.screenshot({ path: file });
    console.log(file);
    await tab.close();
  }
}
await browser.close();
