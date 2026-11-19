// tests/helpers.js
// Shared Playwright helpers for the page checks.
import { expect } from '@playwright/test';

const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export async function checkPage(tab, info, name) {
  // Screenshot first, so a failing page can still be looked at.
  await tab.screenshot({ path: `tests/screenshots/${info.project.name}/${name}.png` });
  const fit = await tab.evaluate(() => window.__book.panelFits());
  expect(fit.fits, `${name}: the text panel needs ${fit.scrollHeight}px but has ${fit.clientHeight}px`).toBe(true);
  const { labels, glows, area, printed = [] } = await tab.evaluate(() => window.__book.labelRects());
  for (let i = 0; i < labels.length; i++) {
    const l = labels[i];
    const onScreen = l.x >= area.x - 1 && l.y >= area.y - 1 && l.x + l.w <= area.x + area.w + 1 && l.y + l.h <= area.y + area.h + 1;
    expect(onScreen, `${name}: label ${i} is cut off at the edge of the stage`).toBe(true);
    for (let j = i + 1; j < labels.length; j++) expect(overlap(labels[i], labels[j]), `${name}: labels ${i} and ${j} overlap`).toBe(false);
    for (const g of glows) expect(overlap(labels[i], g), `${name}: label ${i} covers a glow`).toBe(false);
    for (const p of printed) expect(overlap(labels[i], p), `${name}: label ${i} covers the printed caption`).toBe(false);
  }
  const overflow = await tab.evaluate(() => document.documentElement.scrollHeight > innerHeight || document.documentElement.scrollWidth > innerWidth);
  expect(overflow).toBe(false);
}

export async function openBook(tab, query = '') {
  await tab.goto(`/?q=high&drawin=off${query}`);
  await tab.waitForFunction(() => document.documentElement.dataset.ready === 'true', null, { timeout: 30_000 });
  await tab.evaluate(() => document.fonts.ready);
}
