// tests/energy.spec.js
// Phase 4: energy stores and flows. Screenshots at four sizes, a frame
// sequence of the transfer, label placement checks and the bloom check.
import { test, expect } from '@playwright/test';

async function open(tab, query) {
  await tab.goto(`/${query}`);
  await tab.waitForFunction(() => document.documentElement.dataset.ready === 'true', null, { timeout: 30_000 });
  await tab.evaluate(() => document.fonts.ready);
}
const shot = (tab, info, name) => tab.screenshot({ path: `tests/screenshots/${info.project.name}/${name}.png` });
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

test.describe('energy', () => {
  test('stores, flows and ledger mid-transfer', async ({ page: tab }, info) => {
    await open(tab, '?q=high&drawin=off');
    await tab.evaluate(() => window.__energy.setTime(0.3));
    await shot(tab, info, 'energy-mid');
    await open(tab, '?q=high&drawin=off&tm=aces');
    await tab.evaluate(() => window.__energy.setTime(0.3));
    await shot(tab, info, 'energy-mid-aces');
    await open(tab, '?q=high&drawin=off');
    await tab.evaluate(() => window.__energy.setTime(0.3));
    const { labels, glows } = await tab.evaluate(() => window.__energy.labelRects());
    for (let i = 0; i < labels.length; i++) {
      for (let j = i + 1; j < labels.length; j++) expect(overlap(labels[i], labels[j]), `labels ${i} and ${j} overlap`).toBe(false);
      for (const g of glows) expect(overlap(labels[i], g), `label ${i} covers a glow`).toBe(false);
    }
  });

  test('frame sequence of the transfer', async ({ page: tab }, info) => {
    test.skip(info.project.name !== 'laptop-1366x768', 'one size is enough for the sequence');
    await open(tab, '?q=high&drawin=off');
    for (const t of [0, 0.05, 0.1, 0.15, 0.22, 0.32, 0.45, 0.62]) {
      const snap = await tab.evaluate((s) => window.__energy.setTime(s), t);
      const sum = snap.display.elastic + snap.display.kinetic + snap.display.internal + snap.transit;
      expect(Math.abs(sum - 0.02) / 0.02).toBeLessThan(0.001);
      await shot(tab, info, `energy-seq-${t.toFixed(2)}`);
    }
  });

  test('energy glows bloom', async ({ page: tab }, info) => {
    test.skip(info.project.name.includes('portrait'), 'this demo puts its jars on the left page, which portrait does not show')
    await open(tab, '?q=high&drawin=off');
    await tab.evaluate(() => window.__energy.setTime(0.3));
    const hot = await tab.evaluate(() => window.__stage.hotPixels());
    expect(hot.red, 'the energy glow should pass the bloom threshold').toBeGreaterThan(50);
  });
});
