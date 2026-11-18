// scripts/perf-gpu.js
// Frame time on this machine's real GPU (not SwiftShader), at 1366x768.
// Run after `npm run build`:  node scripts/perf-gpu.js
// Needs `npm run preview` running in another terminal, or starts it itself.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';

const url = 'http://localhost:4173';
async function up() {
  try { await fetch(url); return null; } catch { /* start it */ }
  // Start Vite directly (not through npm and a shell), so killing it ends it.
  const p = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', '4173', '--strictPort'], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    await new Promise((r) => setTimeout(r, 200));
    try { await fetch(url); return p; } catch { /* wait */ }
  }
  throw new Error('preview server did not start');
}

const server = await up();
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
for (const q of ['high', 'medium', 'low']) {
  await page.goto(`${url}/?q=${q}&lesson=${process.env.PERF_LESSON ?? 'l5-ramp'}&page=${process.env.PERF_PAGE ?? 5}`);
  await page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
  const gpu = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  });
  const ms = await page.evaluate(() => window.__stage.measure(4000));
  console.log(`${q.padEnd(6)} ${ms.toFixed(1)} ms (${(1000 / ms).toFixed(0)} fps)  on ${gpu}`);
}
await page.goto(url);
await page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
console.log('probe', await page.evaluate(() => `${window.__stage.probeMs.toFixed(1)} ms, chose ${window.__stage.tier}`));
await browser.close();
server?.kill();
process.exit(0);
