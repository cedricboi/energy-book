import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  // Phase 7C sets this to '/energy-book/' for GitHub Pages.
  base: './',
  build: {
    target: 'es2022',
    // three and postprocessing make one ~940 kB raw chunk (~330 kB gzipped).
    // The real budget is checked on gzipped size by scripts/check-budget.js.
    chunkSizeWarningLimit: 1400,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        teachers: resolve(import.meta.dirname, 'teachers.html'),
      },
    },
  },
  test: {
    include: ['tests/**/*.test.js'],
  },
});
