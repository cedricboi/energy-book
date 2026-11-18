// tests/compose.spec.js
// Joins the Phase 3 screenshots into comparison sheets (no image library
// needed): A, B and C side by side, and the draw-in sequence in a strip.
// Run after tests/ink.spec.js.
import { test } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';

const dir = 'tests/screenshots/laptop-1366x768';
const img = (name) => `data:image/png;base64,${readFileSync(`${dir}/${name}.png`).toString('base64')}`;

function sheet(title, items, cols) {
  return `<!doctype html><html><body style="margin:0;background:#0C1230;color:#F4EEDF;font:20px Georgia,serif">
  <h1 style="font-weight:500;font-size:26px;margin:14px 18px">${title}</h1>
  <div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:12px;padding:0 18px 18px">
  ${items.map(([src, cap]) => `<figure style="margin:0"><img src="${src}" style="width:100%;display:block;border-radius:4px"><figcaption style="margin-top:6px">${cap}</figcaption></figure>`).join('')}
  </div></body></html>`;
}

test('compose comparison sheets', async ({ page }, info) => {
  test.skip(info.project.name !== 'laptop-1366x768', 'compose once');
  if (!existsSync(`${dir}/ink-A.png`)) test.skip(true, 'run ink.spec.js first');
  const labels = { A: 'A. Fine technical pen', B: 'B. Looser, sketchier ink', C: 'C. Bolder, illustrated' };
  await page.setViewportSize({ width: 2400, height: 700 });
  await page.setContent(sheet('Ink looks at 1366x768 (whole spread)', ['A', 'B', 'C'].map((k) => [img(`ink-${k}`), labels[k]]), 3));
  await page.screenshot({ path: `${dir}/sheet-ink-spread.png`, fullPage: true });
  await page.setContent(sheet('Ink looks, close-up', ['A', 'B', 'C'].map((k) => [img(`ink-${k}-closeup`), labels[k]]), 3));
  await page.screenshot({ path: `${dir}/sheet-ink-closeup.png`, fullPage: true });
  const times = ['0.05', '0.20', '0.40', '0.60', '0.85', '1.10', '1.30', '1.60'];
  await page.setViewportSize({ width: 2400, height: 900 });
  await page.setContent(sheet('Draw-in, look A (seconds after the page opens)', times.map((t) => [img(`ink-drawin-${t}`), `${t} s`]), 4));
  await page.screenshot({ path: `${dir}/sheet-drawin.png`, fullPage: true });
});
