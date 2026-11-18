// tests/screenshots.spec.js
// Screenshots at the four sizes (CLAUDE.md section 12), plus the Phase 2 stage
// checks: bloom threshold, render-on-demand idling and frame time.
// Saved to tests/screenshots/<size>/<name>.png.
import { test, expect } from '@playwright/test';

async function open(tab, query) {
  await tab.goto(`/${query}`);
  await tab.waitForFunction(() => document.documentElement.dataset.ready === 'true', null, { timeout: 30_000 });
  await tab.evaluate(() => document.fonts.ready);
}

function shot(tab, info, name) {
  return tab.screenshot({ path: `tests/screenshots/${info.project.name}/${name}.png` });
}

test.describe('stage', () => {
  for (const q of ['high', 'low']) {
    test(`stage on the ${q} tier`, async ({ page: tab }, info) => {
      await open(tab, `?q=${q}`);
      const overflow = await tab.evaluate(() => ({
        x: document.documentElement.scrollWidth > window.innerWidth,
        y: document.documentElement.scrollHeight > window.innerHeight,
      }));
      expect(overflow).toEqual({ x: false, y: false });
      await shot(tab, info, `stage-${q}`);
    });
  }

  test('ACES tone mapping for comparison', async ({ page: tab }, info) => {
    await open(tab, '?q=high&tm=aces');
    await shot(tab, info, 'stage-high-aces');
  });

  test('intro view with the window', async ({ page: tab }, info) => {
    await open(tab, '?q=high&view=intro');
    await shot(tab, info, 'stage-intro');
  });

  test('mid-drag, then springs back and goes idle', async ({ page: tab }, info) => {
    // Software rendering runs at about 1 fps here, so the spring needs time.
    test.setTimeout(120_000);
    await open(tab, '?q=high');
    await tab.evaluate(() => window.__stage.setDrag(12, -8));
    await shot(tab, info, 'stage-mid-drag');
    await tab.evaluate(() => window.__stage.releaseDrag());
    await tab.waitForFunction(() => window.__stage.idle, null, { timeout: 100_000 });
  });

  test('nothing but energy reaches the bloom threshold', async ({ page: tab }, info) => {
    // The beaker scene has no energy in it, so no pixel may reach 1.
    await open(tab, '?q=high&demo=beaker&drawin=off');
    const hot = await tab.evaluate(() => window.__stage.hotPixels());
    console.log(`[${info.project.name}] hot pixels: red ${hot.red}, orange ${hot.orange}, brightest ${hot.maxLuminance.toFixed(3)}`);
    expect(hot.red, 'no non-energy pixel may exceed luminance 1').toBe(0);
    expect(hot.orange, 'lit surfaces stay below about 0.9 (CLAUDE.md section 4)').toBeLessThan(hot.pixels * 0.0005);
    await tab.goto('/?q=high&debug=hot&demo=beaker&drawin=off');
    await tab.waitForFunction(() => document.documentElement.dataset.ready === 'true');
    await shot(tab, info, 'stage-debug-hot');
  });

  test('render loop stops within 2 s when nothing moves', async ({ page: tab }) => {
    // The draw-in is skipped, so nothing on the page is moving.
    await open(tab, '?q=low&drawin=off');
    await tab.waitForTimeout(2000);
    expect(await tab.evaluate(() => window.__stage.idle)).toBe(true);
  });

  test('frame time on each tier', async ({ page: tab }, info) => {
    test.setTimeout(90_000);
    for (const q of ['high', 'medium', 'low']) {
      await open(tab, `?q=${q}`);
      const ms = await tab.evaluate(() => window.__stage.measure(3000));
      console.log(`[${info.project.name}] ${q}: average frame ${ms.toFixed(1)} ms (${(1000 / ms).toFixed(0)} fps)`);
    }
  });

  test('the 2 s probe picks a tier', async ({ page: tab }, info) => {
    await open(tab, '');
    const r = await tab.evaluate(() => ({ tier: window.__stage.tier, ms: window.__stage.probeMs }));
    console.log(`[${info.project.name}] probe: ${r.ms.toFixed(1)} ms, chose ${r.tier}`);
    expect(['high', 'medium', 'low']).toContain(r.tier);
  });
});
