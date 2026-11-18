import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  // Phase 7C sets this to '/energy-book/' for GitHub Pages.
  base: './',
  build: {
    target: 'es2022',
    // CLAUDE.md section 9: total JS under 1.2 MB gzipped. Warn early on big chunks.
    chunkSizeWarningLimit: 600,
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
