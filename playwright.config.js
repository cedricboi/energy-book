// playwright.config.js
// Screenshots at the four test sizes in CLAUDE.md section 12, using Chromium
// with SwiftShader so WebGL works headless.
import { defineConfig } from '@playwright/test';

export const SIZES = [
  { name: 'projector-1920x1080', width: 1920, height: 1080 },
  { name: 'laptop-1366x768', width: 1366, height: 768 },
  { name: 'ipad-landscape-1180x820', width: 1180, height: 820 },
  { name: 'ipad-portrait-820x1180', width: 820, height: 1180 },
];

export default defineConfig({
  testDir: 'tests',
  testMatch: /.*\.spec\.js/,
  timeout: 60_000,
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    browserName: 'chromium',
    launchOptions: {
      args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
    },
  },
  projects: SIZES.map((s) => ({
    name: s.name,
    use: { viewport: { width: s.width, height: s.height }, deviceScaleFactor: 1 },
  })),
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173',
    // Always build and serve fresh, so a stale server can never be tested.
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
