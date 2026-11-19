// tests/print.spec.js
// The page text is printed into the paper (book/pagePrint.js). In the
// landscape book, a lesson page's sheet carries ink, the printed HTML copy
// is invisible but still there for screen readers, and live controls stay
// visible. In the stacked layout nothing is printed.
import { test, expect } from '@playwright/test';
import { openBook } from './helpers.js';

const inkOf = (side) => {
  const c = window.__book.printer.sheets[side].canvas;
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let n = 0;
  for (let i = 3; i < d.length; i += 4 * 9) if (d[i] > 128) n++;
  return n;
};

test.describe('printed pages', () => {
  test('lesson text is printed into the paper', async ({ page: tab }, info) => {
    test.skip(!['laptop-1366x768', 'ipad-portrait-820x1180'].includes(info.project.name), 'checked at one landscape and one stacked size');
    await openBook(tab);
    await tab.evaluate(() => window.__book.open('l5-ramp', 2));
    await tab.evaluate(() => window.__book.settle(0));
    await tab.waitForTimeout(400);
    const r = await tab.evaluate((fn) => {
      const ink = new Function(`return (${fn})`)();
      const panel = document.querySelector('.page-panel');
      const para = panel.querySelector('.page-body p');
      const btn = panel.querySelector('.work-actions button');
      return {
        enabled: window.__book.printer.enabled,
        left: ink('left'),
        right: ink('right'),
        inked: panel.classList.contains('is-inked'),
        paraColour: getComputedStyle(para).color,
        paraText: para.textContent.length,
        buttonColour: btn ? getComputedStyle(btn).color : null,
      };
    }, inkOf.toString());
    if (info.project.name === 'ipad-portrait-820x1180') {
      expect(r.enabled).toBe(false);
      expect(r.inked).toBe(false);
      return;
    }
    expect(r.enabled).toBe(true);
    expect(r.left, 'the left page carries printed text').toBeGreaterThan(500);
    expect(r.right, 'the right page carries the printed caption').toBeGreaterThan(50);
    expect(r.inked).toBe(true);
    expect(r.paraColour, 'the HTML copy of printed text is invisible').toBe('rgba(0, 0, 0, 0)');
    expect(r.paraText, 'but its words are still there for screen readers').toBeGreaterThan(10);
    expect(r.buttonColour, 'live buttons stay visible').not.toBe('rgba(0, 0, 0, 0)');
  });

  test('the contents is printed on both pages', async ({ page: tab }, info) => {
    test.skip(info.project.name !== 'laptop-1366x768', 'checked once');
    await openBook(tab);
    await tab.evaluate(() => window.__book.settle());
    await tab.waitForTimeout(400);
    const r = await tab.evaluate((fn) => {
      const ink = new Function(`return (${fn})`)();
      return { left: ink('left'), right: ink('right'), rows: document.querySelectorAll('.page-panel-right .ink-row').length };
    }, inkOf.toString());
    expect(r.left).toBeGreaterThan(500);
    expect(r.right).toBeGreaterThan(500);
    expect(r.rows).toBeGreaterThan(8);
  });
});
