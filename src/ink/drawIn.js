// src/ink/drawIn.js
// When a page opens (CLAUDE.md section 4):
//   1. the diagram rises from the page with a soft spring (overshoot under 4%)
//   2. its lines draw themselves (LineMaterial dashes, 0.8 to 1.4 s)
//   3. the solid forms fade in (body, hatching, outline)
//   4. then the energy appears (Phase 4 hooks onto `done`)
// With prefers-reduced-motion, everything appears at once.

const SPRING_K = 90;
const SPRING_ZETA = 0.72; // overshoot = exp(-pi*zeta/sqrt(1-zeta^2)) = 3.8%
const FADE_SECONDS = 0.45;

const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/**
 * @param {object} o
 * @param {import('three').Object3D} o.root     the diagram (scaled in y to rise)
 * @param {import('three').LineSegments2[]} o.lines   ink lines to draw in
 * @param {Array<{ value: number }>} o.formUniforms   uniforms faded from 0 to 1
 * @param {() => number} o.seconds   current draw-in duration (from the style)
 * @param {(p: number) => void} [o.onForm]  called with the form fade (0 to 1)
 * @param {boolean} [o.reducedMotion]
 */
export function createDrawIn({ root, lines, formUniforms, seconds, onForm, reducedMotion = false }) {
  let t = Infinity;
  let rise = 1;
  let riseV = 0;
  let onDone = null;

  function apply(time) {
    const T = seconds();
    const lineP = Math.min(1, Math.max(0, time / T));
    const eased = easeInOut(lineP);
    for (const l of lines) {
      const L = l.userData.totalLength || 1;
      // Fully drawn: one dash longer than the line, so nothing is cut.
      l.material.dashSize = lineP >= 1 ? 1e6 : Math.max(1e-6, eased * L);
      l.material.gapSize = 1e6;
      l.visible = lineP > 0;
    }
    const formP = Math.min(1, Math.max(0, (time - T) / FADE_SECONDS));
    for (const u of formUniforms) u.value = formP;
    onForm?.(formP);
    root.scale.y = Math.max(0.001, rise);
  }

  return {
    /** Start the draw-in from the beginning. */
    play(done) {
      onDone = done ?? null;
      if (reducedMotion) {
        t = Infinity;
        rise = 1;
        apply(Infinity);
        onDone?.();
        return;
      }
      t = 0;
      rise = 0;
      riseV = 0;
      apply(0);
    },
    /** Advance by dt seconds. Returns true while still animating. */
    update(dt) {
      if (t === Infinity) return false;
      t += dt;
      const c = 2 * SPRING_ZETA * Math.sqrt(SPRING_K);
      // Semi-implicit Euler in small steps keeps the spring stable at low fps.
      const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
      const h = dt / steps;
      for (let i = 0; i < steps; i++) {
        riseV += (SPRING_K * (1 - rise) - c * riseV) * h;
        rise += riseV * h;
      }
      const end = seconds() + FADE_SECONDS;
      const settled = Math.abs(1 - rise) < 1e-4 && Math.abs(riseV) < 1e-3;
      if (t >= end && settled) {
        t = Infinity;
        rise = 1;
        apply(Infinity);
        onDone?.();
        return false;
      }
      apply(t);
      return true;
    },
    /** Jump to a point in the draw-in (0 = start, 1 = lines done, >1 = fading). For tests. */
    setTime(time) {
      t = Infinity;
      // Spring position at this time, from the closed form for an under-damped spring.
      const w = Math.sqrt(SPRING_K);
      const wd = w * Math.sqrt(1 - SPRING_ZETA * SPRING_ZETA);
      rise = 1 - Math.exp(-SPRING_ZETA * w * time) * (Math.cos(wd * time) + (SPRING_ZETA * w / wd) * Math.sin(wd * time));
      apply(time);
    },
    get running() {
      return t !== Infinity;
    },
  };
}

export const DRAW_IN = { SPRING_K, SPRING_ZETA, FADE_SECONDS };
