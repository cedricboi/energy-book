// tests/screenshots.spec.js
// One screenshot per page per size, saved to tests/screenshots/<size>/.
// Phase 1 has one page (the plain title). Phase 5 adds every lesson page here.
import { test, expect } from '@playwright/test';

const PAGES = [{ id: '00-title', path: '/' }];

test.describe('screenshots', () => {
  for (const page of PAGES) {
    test(page.id, async ({ page: tab }, info) => {
      await tab.goto(page.path);
      await tab.waitForFunction(() => document.documentElement.dataset.ready === 'true');
      await tab.evaluate(() => document.fonts.ready);

      // WebGL must work headless, or later phases cannot be screenshotted.
      const webgl = await tab.evaluate(() => {
        const gl = document.createElement('canvas').getContext('webgl2');
        return gl ? gl.getParameter(gl.VERSION) : null;
      });
      expect(webgl, 'WebGL2 should be available through SwiftShader').toBeTruthy();

      // No page may scroll (CLAUDE.md section 6, rule 16).
      const overflow = await tab.evaluate(() => ({
        x: document.documentElement.scrollWidth > window.innerWidth,
        y: document.documentElement.scrollHeight > window.innerHeight,
      }));
      expect(overflow).toEqual({ x: false, y: false });

      await tab.screenshot({ path: `tests/screenshots/${info.project.name}/${page.id}.png` });
    });
  }
});
