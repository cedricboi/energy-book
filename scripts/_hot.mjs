import { chromium } from '@playwright/test';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const q of ['', '&debug=hot']) {
  const tab = await b.newPage({ viewport: { width: 1366, height: 768 } });
  await tab.goto(`http://localhost:5199/?q=high&drawin=off${q}`);
  await tab.waitForFunction(() => document.documentElement.dataset.ready === 'true', null, { timeout: 60000 });
  await tab.evaluate(() => window.__book.open('l5-ramp', 2));
  await tab.evaluate(() => window.__book.settle(0));
  await tab.waitForTimeout(500);
  await tab.screenshot({ path: `tests/screenshots/sample/bright${q ? '-hot' : ''}.png` });
  await tab.close();
}
await b.close();
