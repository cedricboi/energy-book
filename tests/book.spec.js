// tests/book.spec.js
// The book engine: the contents and every page of a lesson at four sizes.
// Each page must fit without scrolling, and no label may cover another label
// or a glow (CLAUDE.md section 12).
import { test, expect } from '@playwright/test';

const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export async function checkPage(tab, info, name) {
  // Screenshot first, so a failing page can still be looked at.
  await tab.screenshot({ path: `tests/screenshots/${info.project.name}/${name}.png` });
  const fit = await tab.evaluate(() => window.__book.panelFits());
  expect(fit.fits, `${name}: the text panel needs ${fit.scrollHeight}px but has ${fit.clientHeight}px`).toBe(true);
  const { labels, glows } = await tab.evaluate(() => window.__book.labelRects());
  for (let i = 0; i < labels.length; i++) {
    for (let j = i + 1; j < labels.length; j++) expect(overlap(labels[i], labels[j]), `${name}: labels ${i} and ${j} overlap`).toBe(false);
    for (const g of glows) expect(overlap(labels[i], g), `${name}: label ${i} covers a glow`).toBe(false);
  }
  const overflow = await tab.evaluate(() => document.documentElement.scrollHeight > innerHeight || document.documentElement.scrollWidth > innerWidth);
  expect(overflow).toBe(false);
}

export async function openBook(tab, query = '') {
  await tab.goto(`/?q=high&drawin=off${query}`);
  await tab.waitForFunction(() => document.documentElement.dataset.ready === 'true', null, { timeout: 30_000 });
  await tab.evaluate(() => document.fonts.ready);
}

test.describe('book engine', () => {
  test('contents', async ({ page: tab }, info) => {
    await openBook(tab);
    await checkPage(tab, info, 'book-contents');
  });

  test('engine test lesson, every page', async ({ page: tab }, info) => {
    test.setTimeout(120_000);
    await openBook(tab);
    for (let p = 0; p < 3; p++) {
      await tab.evaluate((i) => window.__book.open('l0-engine-test', i), p);
      await tab.evaluate(() => window.__book.settle(0.12));
      await checkPage(tab, info, `book-l0-p${p + 1}`);
    }
  });
});
