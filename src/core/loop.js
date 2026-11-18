// src/core/loop.js
// Render on demand (CLAUDE.md section 9). The loop runs only while something
// needs frames: a hold is active (a drag, a probe) or the frame callback says
// an animation is still moving. When nothing is moving, the loop stops and the
// GPU idles.

export function createLoop(frameCallback) {
  let raf = 0;
  let last = 0;
  const holds = new Set();
  const listeners = new Set();
  // Recent frame intervals in ms, for the frame-time report.
  const intervals = [];
  const MAX_SAMPLES = 600;

  function frame(t) {
    raf = 0;
    const dtMs = last ? t - last : 1000 / 60;
    if (last) {
      intervals.push(dtMs);
      if (intervals.length > MAX_SAMPLES) intervals.shift();
    }
    last = t;
    // Clamp dt so a long pause does not make springs jump.
    const stillMoving = frameCallback(Math.min(dtMs, 50) / 1000, t);
    if (holds.size > 0 || stillMoving) {
      raf = requestAnimationFrame(frame);
    } else {
      last = 0;
      for (const fn of listeners) fn('idle');
    }
  }

  return {
    /** Ask for at least one more frame. */
    request() {
      if (!raf) raf = requestAnimationFrame(frame);
    },
    /** Keep rendering until release(key). */
    hold(key) {
      holds.add(key);
      this.request();
    },
    release(key) {
      holds.delete(key);
      this.request();
    },
    get running() {
      return raf !== 0;
    },
    /** Average of the last `count` frame intervals, in ms. */
    averageFrameMs(count = intervals.length) {
      const s = intervals.slice(-count);
      return s.length ? s.reduce((a, b) => a + b, 0) / s.length : NaN;
    },
    clearStats() {
      intervals.length = 0;
    },
    onIdle(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
