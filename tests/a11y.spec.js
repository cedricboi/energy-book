// tests/a11y.spec.js
// CLAUDE.md section 11: keyboard use, visible focus rings, HTML button twins
// for scene objects, reduced motion, and the WebGL fallback.
import { test, expect, chromium } from '@playwright/test';

async function ready(tab, q = '?q=low') {
  await tab.goto(`/${q}`);
  await tab.waitForFunction(() => ['true', 'fallback'].includes(document.documentElement.dataset.ready), null, { timeout: 30_000 });
}

test.describe('accessibility', () => {
  test.beforeEach(({}, info) => test.skip(info.project.name !== 'laptop-1366x768', 'checked once'));

  test('the book can be used with the keyboard alone', async ({ page: tab }) => {
    await ready(tab);
    // Tab to the first lesson in the contents and open it.
    let found = false;
    for (let i = 0; i < 30 && !found; i++) {
      await tab.keyboard.press('Tab');
      found = await tab.evaluate(() => document.activeElement?.dataset?.lesson === 'l1-stores');
    }
    expect(found, 'the first lesson button is reachable by Tab').toBe(true);
    await tab.keyboard.press('Enter');
    await tab.waitForFunction(() => window.__book.state?.lesson === 'l1-stores' && !window.__book.state.busy, null, { timeout: 30_000 });
    // The focused element shows a visible focus ring.
    await tab.keyboard.press('Tab');
    const outline = await tab.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
    expect(outline).not.toBe('none');
    // Arrow keys turn the page when no control has focus.
    await tab.evaluate(() => document.activeElement.blur());
    await tab.keyboard.press('ArrowRight');
    await tab.waitForFunction(() => window.__book.state.index === 1 && !window.__book.state.busy, null, { timeout: 30_000 });
    // PageDown (a presentation clicker) also turns the page.
    await tab.keyboard.press('PageDown');
    await tab.waitForFunction(() => window.__book.state.index === 2 && !window.__book.state.busy, null, { timeout: 30_000 });
  });

  test('every scene object a student can act on has an HTML button twin', async ({ page: tab }) => {
    await ready(tab, '?q=low&drawin=off');
    await tab.evaluate(() => window.__book.open('l1-stores', 1));
    const names = await tab.$$eval('.work-box button', (bs) => bs.map((b) => b.textContent));
    expect(names).toEqual(expect.arrayContaining(['Tap the rolling toy car', 'Tap the book held up high', 'Tap the stretched catapult']));
  });

  test('reduced motion: no draw-in, no page curl, diagrams appear at once', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1366, height: 768 } });
    const tab = await ctx.newPage();
    await ready(tab);
    await tab.evaluate(() => window.__book.open('l5-ramp', 0));
    expect(await tab.evaluate(() => window.__book.drawInDone())).toBe(true);
    await ctx.close();
  });

  test('without WebGL, a friendly message links to the teachers\' page', async () => {
    const browser = await chromium.launch({ args: ['--disable-webgl', '--disable-webgl2', '--disable-gpu', '--disable-software-rasterizer'] });
    const tab = await browser.newPage();
    await tab.goto('http://localhost:4173/');
    await tab.waitForFunction(() => document.documentElement.dataset.ready === 'fallback', null, { timeout: 30_000 });
    await expect(tab.locator('#fallback')).toBeVisible();
    await expect(tab.locator('#fallback a[href="./teachers.html"]')).toBeVisible();
    await browser.close();
  });

  test('the teachers\' page works without WebGL and lists every lesson', async ({ page: tab }) => {
    await tab.goto('/teachers.html');
    for (const t of ['Energy stores', 'Energy transfers', 'Kinetic energy', 'Gravitational potential energy', 'Energy on a ramp', 'Why a bouncing ball stops', 'Work done', 'Power', 'Ledger Run']) {
      await expect(tab.locator('h2', { hasText: t }).first()).toBeVisible();
    }
  });
});
