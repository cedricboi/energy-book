// scripts/figure-rooms.mjs
// Measures how far down the page each scene's drawing reaches, to set the
// room a compact figure needs (ROOMS in src/lessons/textbook.js).
//   node scripts/figure-rooms.mjs [base]
import { chromium } from '@playwright/test';
const [base = 'http://localhost:5199'] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const tab = await browser.newPage({ viewport: { width: 1366, height: 768 } });
await tab.goto(`${base}/?q=low&drawin=off`);
await tab.waitForFunction(() => document.documentElement.dataset.ready === 'true');
const H = 0.297 / 2, zTop = -H + 0.008, z0 = -H + 0.016, z1 = H - 0.014;
const seen = {};
for (const id of ['l2-transfers', 'l3-kinetic', 'l4-gpe', 'l5-ramp', 'l6-bounce', 'l7-work', 'l8-power']) {
  await tab.evaluate((l) => window.__book.open(l, 0), id);
  const count = await tab.evaluate(() => window.__book.pageCount);
  for (let p = 0; p < count; p++) {
    await tab.evaluate(([l, n]) => window.__book.open(l, n), [id, p]);
    await tab.evaluate(() => window.__book.settle(1));
    const d = await tab.evaluate(() => window.__book.figureDepth());
    if (!d) continue;
    const local = zTop + (d.z - zTop) / d.scale; // where the drawing ends at full size
    const s = (seen[d.scene] ??= { local: -1, ledger: d.ledger });
    s.local = Math.max(s.local, local);
  }
}
for (const [scene, s] of Object.entries(seen)) {
  const room = (k) => ((zTop + k * (s.local - zTop) + 0.01 - z0) / (z1 - z0)).toFixed(3);
  console.log(scene, 'ends at z', s.local.toFixed(4), 'ledger', s.ledger, 'room at 0.7:', room(0.7), '0.75:', room(0.75), '0.8:', room(0.8));
}
await browser.close();
