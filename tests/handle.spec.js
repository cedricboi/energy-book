// tests/handle.spec.js
// Students handle the models themselves (CLAUDE.md section 6, rule 1): drag
// the skateboarder, the box and the ball, and tap an object to send its
// energy to its jar. Run at the laptop size only.
import { test, expect } from '@playwright/test';
import { openBook } from './helpers.js';

test.beforeEach(({}, info) => {
  test.skip(info.project.name !== 'laptop-1366x768', 'handling is checked at one size');
  // Software rendering is slow when other tests run alongside.
  test.setTimeout(120_000);
});

async function dragFirst(tab, dy) {
  const [t] = await tab.evaluate(() => window.__book.touchables());
  expect(t, 'there is something to handle').toBeTruthy();
  await tab.mouse.move(t.x, t.y);
  await tab.mouse.down();
  for (let i = 1; i <= 10; i++) await tab.mouse.move(t.x, t.y - (dy * i) / 10);
  await tab.mouse.up();
}

async function openAt(tab, lesson, page) {
  await tab.evaluate((a) => window.__book.open(a.lesson, a.page), { lesson, page });
  await tab.evaluate(() => window.__book.settle(0));
}

test('drag the skateboarder up the wall, then she rolls', async ({ page: tab }) => {
  await openBook(tab);
  await openAt(tab, 'l5-ramp', 2);
  const before = await tab.evaluate(() => window.__book.values());
  await dragFirst(tab, 60);
  const after = await tab.evaluate(() => window.__book.values());
  expect(after.height).toBeGreaterThan(before.height);
  await expect(tab.locator('.ctl-value').first()).toHaveText(`${after.height} m`);
  await tab.waitForFunction(() => window.__book.values().kinetic > 0, null, { timeout: 60_000 });
});

test('the skateboarder stays put on the predict page until the prediction is in', async ({ page: tab }) => {
  await openBook(tab);
  await openAt(tab, 'l5-ramp', 1);
  await dragFirst(tab, 60);
  await tab.waitForTimeout(800);
  expect((await tab.evaluate(() => window.__book.values())).kinetic).toBe(0);
});

test('drag the box onto a higher shelf', async ({ page: tab }) => {
  await openBook(tab);
  await openAt(tab, 'l4-gpe', 1);
  const before = await tab.evaluate(() => window.__book.values());
  await dragFirst(tab, 60);
  const after = await tab.evaluate(() => window.__book.values());
  expect(after.height).toBeGreaterThan(before.height);
  expect(after.gravitational).toBeGreaterThan(before.gravitational);
});

test('drag the ball higher, then it drops', async ({ page: tab }) => {
  await openBook(tab);
  await openAt(tab, 'l6-bounce', 2);
  const before = await tab.evaluate(() => window.__book.values());
  await dragFirst(tab, 20);
  const after = await tab.evaluate(() => window.__book.values());
  expect(after.height).toBeGreaterThan(before.height);
  await tab.waitForFunction(() => window.__book.values().kinetic > 0, null, { timeout: 60_000 });
});

test('tap the toy car to send its energy to the kinetic jar', async ({ page: tab }) => {
  await openBook(tab);
  await openAt(tab, 'l1-stores', 1);
  const car = (await tab.evaluate(() => window.__book.touchables())).find((t) => t.label === 'car');
  await tab.mouse.click(car.x, car.y);
  // Software rendering is slow, so wait for the energy to arrive.
  await tab.waitForFunction(() => window.__book.values().kinetic > 0, null, { timeout: 60_000 });
  const v = await tab.evaluate(() => window.__book.values());
  expect(v.gravitational + v.elastic + v.chemical + v.internal + v.nuclear).toBe(0);
});
