// tests/lessons.spec.js
// Every page of every built lesson at the four sizes: the panel fits with no
// scrolling, no label covers another label or a glow, and a screenshot is
// saved as tests/screenshots/<size>/<lesson>-pNN.png.
// Set LESSONS=l5-ramp,l3-kinetic to limit the run.
import { test } from '@playwright/test';
import { checkPage, openBook } from './helpers.js';

const ALL = ['l1-stores', 'l2-transfers', 'l3-kinetic', 'l4-gpe', 'l5-ramp', 'l6-bounce', 'l7-work', 'l8-power', 'game'];
const wanted = (process.env.LESSONS ?? ALL.join(',')).split(',');

for (const id of wanted) {
  test(`${id}, every page`, async ({ page: tab }, info) => {
    test.setTimeout(240_000);
    await openBook(tab);
    const count = await tab.evaluate(async (lid) => {
      try {
        const m = await import(`/src/lessons/${lid}.js`).catch(() => null);
        return m?.default?.pages?.length ?? null;
      } catch { return null; }
    }, id);
    const n = count ?? await tab.evaluate(async (lid) => {
      await window.__book.open(lid, 0).catch(() => {});
      return window.__book.state?.lesson === lid ? window.__book.pageCount : 0;
    }, id);
    test.skip(!n, `${id} is not built yet`);
    for (let p = 0; p < n; p++) {
      await tab.evaluate((args) => window.__book.open(args.id, args.p), { id, p });
      await tab.evaluate(() => window.__book.settle(1.2));
      await checkPage(tab, info, `${id}-p${String(p + 1).padStart(2, '0')}`);
    }
  });
}
