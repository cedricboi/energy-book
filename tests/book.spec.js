// tests/book.spec.js
// The book engine: the contents and every page of a lesson at four sizes.
// Each page must fit without scrolling, and no label may cover another label
// or a glow (CLAUDE.md section 12).
import { test } from '@playwright/test';

import { checkPage, openBook } from './helpers.js';

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
