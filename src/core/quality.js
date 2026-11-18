// src/core/quality.js
// Three quality tiers (CLAUDE.md section 9), chosen from a 2-second frame-time
// probe on start. Overrides, strongest first:
//   1. URL: ?q=high | ?q=medium | ?q=low
//   2. Saved setting (the settings menu, Phase 5A), in localStorage
//   3. The probe

const STORAGE_KEY = 'energy-ledger:quality';
export const TIER_NAMES = ['high', 'medium', 'low'];

/** Settings per tier. `dpr` is already capped for this device. */
export function tierSettings(name, devicePixelRatio = globalThis.devicePixelRatio || 1) {
  const cap = { high: 2, medium: 1.5, low: 1.25 }[name];
  if (cap === undefined) throw new RangeError(`Unknown quality tier "${name}"`);
  return {
    name,
    dpr: Math.min(devicePixelRatio, cap),
    ao: name === 'high',
    shadowMapSize: name === 'high' ? 2048 : 1024,
    bloomResolutionScale: { high: 1, medium: 0.5, low: 0.25 }[name], // Phase 4
    hatchLayers: name === 'low' ? 2 : 3, // Phase 3
  };
}

/** The tier forced by the URL or a saved setting, or null if the probe should decide. */
export function forcedTier(search = globalThis.location?.search ?? '') {
  const q = new URLSearchParams(search).get('q');
  if (TIER_NAMES.includes(q)) return q;
  try {
    const saved = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (TIER_NAMES.includes(saved)) return saved;
  } catch {
    // Private mode or blocked storage. The probe decides.
  }
  return null;
}

export function saveTier(name) {
  try {
    if (name === null) globalThis.localStorage?.removeItem(STORAGE_KEY);
    else if (TIER_NAMES.includes(name)) globalThis.localStorage?.setItem(STORAGE_KEY, name);
  } catch {
    // Not saved. The book still works.
  }
}

/**
 * Pick a tier from the average frame interval measured while rendering at the
 * high tier. A 60 Hz display caps the interval at about 16.7 ms, so anything
 * near that is keeping up.
 */
export function tierFromFrameTime(avgMs) {
  if (avgMs <= 19) return 'high';
  if (avgMs <= 30) return 'medium';
  return 'low';
}

/**
 * Render continuously for `durationMs` and return the average frame interval in ms.
 * The first few frames are skipped because they include shader compilation.
 */
export function probeFrameTime(renderOnce, durationMs = 2000, warmupFrames = 5) {
  return new Promise((resolve) => {
    const intervals = [];
    let frames = 0;
    let last = 0;
    let start = 0;
    function step(t) {
      renderOnce();
      frames += 1;
      if (frames > warmupFrames) {
        if (last) intervals.push(t - last);
        if (!start) start = t;
      }
      last = t;
      if (start && t - start >= durationMs) {
        const avg = intervals.reduce((a, b) => a + b, 0) / Math.max(1, intervals.length);
        resolve(avg);
      } else {
        requestAnimationFrame(step);
      }
    }
    requestAnimationFrame(step);
  });
}
