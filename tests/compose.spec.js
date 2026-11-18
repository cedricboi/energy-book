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

test('colour-blind simulation of the energy screenshot', async ({ page }, info) => {
  test.skip(info.project.name !== 'laptop-1366x768', 'compose once');
  if (!existsSync(`${dir}/energy-seq-0.15.png`)) test.skip(true, 'run energy.spec.js first');
  await page.setViewportSize({ width: 2400, height: 600 });
  const src = img('energy-seq-0.15');
  await page.setContent('<body style="margin:0;background:#0C1230;color:#F4EEDF;font:20px Georgia,serif"><div id="row" style="display:flex;gap:10px;padding:10px"></div></body>');
  await page.evaluate(async (s) => {
    const M = {
      normal: null,
      protanopia: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
      deuteranopia: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
    };
    const im = new Image();
    im.src = s;
    await im.decode();
    const toLin = (c) => { const v = c / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    const toS = (v) => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
    for (const [name, m] of Object.entries(M)) {
      const c = document.createElement('canvas');
      c.width = im.width; c.height = im.height;
      const g = c.getContext('2d');
      g.drawImage(im, 0, 0);
      if (m) {
        const d = g.getImageData(0, 0, c.width, c.height);
        for (let i = 0; i < d.data.length; i += 4) {
          const r = toLin(d.data[i]), gg = toLin(d.data[i + 1]), b = toLin(d.data[i + 2]);
          for (let k = 0; k < 3; k++) d.data[i + k] = toS(Math.min(1, Math.max(0, m[k][0] * r + m[k][1] * gg + m[k][2] * b)));
        }
        g.putImageData(d, 0, 0);
      }
      const fig = document.createElement('figure');
      fig.style.cssText = 'margin:0;flex:1';
      c.style.cssText = 'width:100%';
      fig.append(c, Object.assign(document.createElement('figcaption'), { textContent: name }));
      document.getElementById('row').append(fig);
    }
  }, src);
  await page.screenshot({ path: `${dir}/sheet-colour-blind.png`, fullPage: true });
});
