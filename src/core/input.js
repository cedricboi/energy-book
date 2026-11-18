// src/core/input.js
// A gentle limited orbit by dragging: at most 15 degrees in any direction,
// with a soft rubber-band edge, springing back to rest when released.
// The returned object is stepped by the render loop (update) and reports
// whether it is still moving, so the loop can stop when it is not.

const DEG = Math.PI / 180;

export function createDragOrbit(element, { maxDeg = 15, onStart, onEnd, reducedMotion = false } = {}) {
  const max = maxDeg * DEG;
  // Radians of rotation per CSS pixel of drag.
  const perPixel = 0.0035;
  const stiffness = reducedMotion ? 120 : 70;
  // Slightly under-damped, so the return has a soft settle (under 4% overshoot).
  const damping = 2 * Math.sqrt(stiffness) * (reducedMotion ? 1 : 0.72);

  const state = { yaw: 0, pitch: 0, vYaw: 0, vPitch: 0, dragging: false };
  let startX = 0;
  let startY = 0;
  let pointerId = null;
  let rawYaw = 0;
  let rawPitch = 0;

  // Soft limit: follows the finger near the centre, then eases towards ±max.
  const soft = (v) => max * Math.tanh(v / max);

  function down(e) {
    if (pointerId !== null) return;
    pointerId = e.pointerId;
    element.setPointerCapture?.(e.pointerId);
    // Pick up from wherever the spring is now, so grabbing mid-return does not jump.
    const unsoft = (v) => max * Math.atanh(Math.max(-0.999, Math.min(0.999, v / max)));
    rawYaw = unsoft(state.yaw);
    rawPitch = unsoft(state.pitch);
    startX = e.clientX + rawYaw / perPixel;
    startY = e.clientY - rawPitch / perPixel;
    state.dragging = true;
    onStart?.();
  }
  function move(e) {
    if (e.pointerId !== pointerId) return;
    rawYaw = -(e.clientX - startX) * perPixel;
    rawPitch = (e.clientY - startY) * perPixel;
    state.yaw = soft(rawYaw);
    state.pitch = soft(rawPitch);
    state.vYaw = 0;
    state.vPitch = 0;
  }
  function up(e) {
    if (e.pointerId !== pointerId) return;
    element.releasePointerCapture?.(e.pointerId);
    pointerId = null;
    state.dragging = false;
    rawYaw = 0;
    rawPitch = 0;
    onEnd?.();
  }

  element.addEventListener('pointerdown', down);
  element.addEventListener('pointermove', move);
  element.addEventListener('pointerup', up);
  element.addEventListener('pointercancel', up);
  element.style.touchAction = 'none';

  return {
    get yaw() {
      return state.yaw;
    },
    get pitch() {
      return state.pitch;
    },
    get dragging() {
      return state.dragging;
    },
    /** Step the spring. Returns true while still moving. */
    update(dt) {
      if (state.dragging) return true;
      for (const [p, v] of [['yaw', 'vYaw'], ['pitch', 'vPitch']]) {
        const a = -stiffness * state[p] - damping * state[v];
        state[v] += a * dt;
        state[p] += state[v] * dt;
      }
      const moving = Math.abs(state.yaw) + Math.abs(state.pitch) > 0.0002
        || Math.abs(state.vYaw) + Math.abs(state.vPitch) > 0.0005;
      if (!moving) {
        state.yaw = state.pitch = state.vYaw = state.vPitch = 0;
      }
      return moving;
    },
    /** Hold the view at an offset as if mid-drag (for tests and screenshots). */
    setOffset(yawDeg, pitchDeg) {
      state.dragging = true;
      state.yaw = soft(yawDeg * DEG);
      state.pitch = soft(pitchDeg * DEG);
    },
    /** Let go of setOffset, so the view springs back. */
    release() {
      state.dragging = false;
    },
  };
}
