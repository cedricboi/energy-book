// tests/ink.spec.js
// Phase 3: the three ink looks (A, B, C), close-ups, and a draw-in frame
// sequence. Saved to tests/screenshots/<size>/ink-*.png.
import { test, expect } from '@playwright/test';

async function open(tab, query) {
  await tab.goto(`/${query}`);
  await tab.waitForFunction(() => document.documentElement.dataset.ready === 'true', null, { timeout: 30_000 });
  await tab.evaluate(() => document.fonts.ready);
}
const shot = (tab, info, name) => tab.screenshot({ path: `tests/screenshots/${info.project.name}/${name}.png` });

test.describe('ink', () => {
  for (const preset of ['A', 'B', 'C']) {
    test(`preset ${preset}`, async ({ page: tab }, info) => {
      await open(tab, `?q=high&ink=${preset}&drawin=off`);
      await tab.evaluate(() => window.__ink.setDrawIn(99));
      await shot(tab, info, `ink-${preset}`);
      await open(tab, `?q=high&ink=${preset}&drawin=off&view=closeup`);
      await tab.evaluate(() => window.__ink.setDrawIn(99));
      await shot(tab, info, `ink-${preset}-closeup`);
    });
  }

  test('draw-in frame sequence', async ({ page: tab }, info) => {
    test.skip(info.project.name !== 'laptop-1366x768', 'one size is enough for the sequence');
    await open(tab, '?q=high&ink=A&view=closeup&drawin=off');
    for (const t of [0.05, 0.2, 0.4, 0.6, 0.85, 1.1, 1.3, 1.6]) {
      await tab.evaluate((s) => window.__ink.setDrawIn(s), t);
      await shot(tab, info, `ink-drawin-${t.toFixed(2)}`);
    }
  });

  test('hatching stays under the bloom threshold', async ({ page: tab }) => {
    await open(tab, '?q=high&drawin=off');
    await tab.evaluate(() => window.__ink.setDrawIn(99));
    const hot = await tab.evaluate(() => window.__stage.hotPixels());
    expect(hot.red).toBe(0);
  });
});
