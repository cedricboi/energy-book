// tests/beats.spec.js
// Guided steps: they play, hand over to the student, stop when the student
// touches the model, and never move the camera with reduced motion.
import { test, expect } from '@playwright/test';
import { openBook } from './helpers.js';

test.beforeEach(({}, info) => {
  test.skip(info.project.name !== 'laptop-1366x768', 'guided steps are checked at one size');
  test.setTimeout(120_000);
});

const lastStep = 'Your turn. Drag her up either wall, then let go.';

test('the steps play through, then hand the page to the student', async ({ page: tab }) => {
  await openBook(tab);
  await tab.evaluate(() => window.__book.open('l5-ramp', 2));
  await tab.waitForFunction(() => window.__book.beats().away, null, { timeout: 20_000 });
  await tab.waitForFunction((t) => window.__book.beats().text === t, lastStep, { timeout: 60_000 });
  await tab.waitForFunction(() => !window.__book.beats().inShot, null, { timeout: 10_000 });
  const b = await tab.evaluate(() => window.__book.beats());
  expect(b.playing).toBe(false);
  expect(b.away).toBe(false);
});

test('touching the model stops the steps and returns the camera', async ({ page: tab }) => {
  await openBook(tab);
  await tab.evaluate(() => window.__book.open('l5-ramp', 2));
  await tab.waitForFunction(() => window.__book.beats().index === 0, null, { timeout: 20_000 });
  await tab.locator('.page-panel:not(.page-panel-right)').dispatchEvent('pointerdown');
  const b = await tab.evaluate(() => window.__book.beats());
  expect(b.text).toBe(lastStep);
  expect(b.playing).toBe(false);
  expect(b.away).toBe(false);
});

test('with reduced motion the steps play but the camera stays still', async ({ page: tab }) => {
  await tab.emulateMedia({ reducedMotion: 'reduce' });
  await openBook(tab);
  await tab.evaluate(() => window.__book.open('l5-ramp', 2));
  await tab.waitForFunction(() => window.__book.beats().index >= 1, null, { timeout: 30_000 });
  const b = await tab.evaluate(() => window.__book.beats());
  expect(b.away).toBe(false);
  expect(b.inShot).toBe(false);
});
