// src/lessons/index.js
// Lesson registry. Each lesson module is lazy-loaded (CLAUDE.md section 9).

export const lessons = [
  { id: "l1-stores", load: () => import("./l1-stores.js") },
  { id: "l2-transfers", load: () => import("./l2-transfers.js") },
  { id: "l3-kinetic", load: () => import("./l3-kinetic.js") },
  { id: "l4-gpe", load: () => import("./l4-gpe.js") },
  { id: "l5-ramp", load: () => import("./l5-ramp.js") },
  { id: "l6-bounce", load: () => import("./l6-bounce.js") },
  { id: "l7-work", load: () => import("./l7-work.js") },
  { id: "l8-power", load: () => import("./l8-power.js") },
  { id: "game", load: () => import("./game.js") },
];
