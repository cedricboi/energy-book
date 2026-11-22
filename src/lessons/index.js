// src/lessons/index.js
// Lesson registry. Each lesson module is lazy-loaded (CLAUDE.md section 9).
// Titles live here too, so the contents can show without loading lessons.
import { toTextbook } from './textbook.js';

export const LESSONS = [
  { id: 'l1-stores', number: 1, title: 'Energy stores', load: () => import('./l1-stores.js') },
  { id: 'l2-transfers', number: 2, title: 'Energy transfers', load: () => import('./l2-transfers.js') },
  { id: 'l3-kinetic', number: 3, title: 'Kinetic energy', load: () => import('./l3-kinetic.js') },
  { id: 'l4-gpe', number: 4, title: 'Gravitational potential energy', load: () => import('./l4-gpe.js') },
  { id: 'l5-ramp', number: 5, title: 'Energy on a ramp', load: () => import('./l5-ramp.js') },
  { id: 'l6-bounce', number: 6, title: 'Why a bouncing ball stops', load: () => import('./l6-bounce.js') },
  { id: 'l7-work', number: 7, title: 'Work done', load: () => import('./l7-work.js') },
  { id: 'l8-power', number: 8, title: 'Power', load: () => import('./l8-power.js') },
  { id: 'game', number: null, title: 'Chapter game: Ledger Run', load: () => import('./game.js') },
  { id: 'l0-engine-test', number: null, title: 'Engine test', hidden: true, load: () => import('./l0-engine-test.js') },
];

export async function loadLesson(id) {
  const entry = LESSONS.find((l) => l.id === id);
  if (!entry) throw new Error(`Unknown lesson "${id}"`);
  const mod = await entry.load();
  const lesson = mod.default;
  if (!lesson?.pages?.length) throw new Error(`Lesson "${id}" has no pages yet`);
  // The book sets every lesson as a textbook (a few dense spreads). The
  // lesson files keep the steps in order, and ?layout=steps shows them one
  // step to a page, as they were first built.
  const steps = new URLSearchParams(globalThis.location?.search ?? '').get('layout') === 'steps';
  return steps ? lesson : toTextbook(lesson, entry.number);
}
