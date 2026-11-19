// scripts/sample-shots.js
// Quick screenshots of chosen pages against a running dev server, for
// "show before deciding" samples. Usage:
//   node scripts/sample-shots.js http://localhost:5199 l5-ramp:1,2,3 [1366x768,1180x820]
import { chromium } from '@playwright/test';

const [base = 'http://localhost:5199', spec = 'l5-ramp:1', sizeArg = '1366x768'] = process.argv.slice(2);
const [lesson, pagesArg] = spec.split(':');
const pages = pagesArg.split(',').map(Number);
const sizes = sizeArg.split(',').map((s) => s.split('x').map(Number));

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const [width, height] of sizes) {
  const tab = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  tab.on('pageerror', (e) => console.log('pageerror', e.message));
  await tab.goto(`${base}/?q=high&drawin=off`);
  await tab.waitForFunction(() => document.documentElement.dataset.ready === 'true', null, { timeout: 60_000 });
  await tab.evaluate(() => document.fonts.ready);
  for (const p of pages) {
    await tab.evaluate((a) => window.__book.open(a.lesson, a.p - 1), { lesson, p });
    await tab.evaluate(() => window.__book.settle(1.2));
    await tab.waitForTimeout(300);
    const file = `tests/screenshots/sample/${lesson}-p${String(p).padStart(2, '0')}-${width}x${height}.png`;
    await tab.screenshot({ path: file });
    console.log(file);
    // DRAG=px drags the first object students can handle up by px, lets go,
    // and takes a shot mid-drag and one second after release.
    if (process.env.DRAG) {
      await tab.evaluate(() => window.__book.settle(0));
      const [t] = await tab.evaluate(() => window.__book.touchables());
      if (t) {
        await tab.mouse.move(t.x, t.y);
        await tab.mouse.down();
        for (let i = 1; i <= 10; i++) await tab.mouse.move(t.x, t.y - (Number(process.env.DRAG) * i) / 10);
        await tab.screenshot({ path: file.replace('.png', '-drag.png') });
        await tab.mouse.up();
        await tab.waitForTimeout(1000);
        await tab.screenshot({ path: file.replace('.png', '-released.png') });
        console.log('dragged to height', (await tab.evaluate(() => window.__book.values())).height);
      }
    }
  }
  await tab.close();
}
await browser.close();
