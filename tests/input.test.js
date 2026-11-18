// tests/input.test.js
// The drag orbit: limited to 15 degrees, springs back with under 4% overshoot,
// and reports when it has stopped so the render loop can idle.
import { describe, it, expect } from 'vitest';
import { createDragOrbit } from '../src/core/input.js';

const fakeElement = () => ({ addEventListener() {}, style: {} });
const DEG = Math.PI / 180;

function settle(orbit, dt = 1 / 60, maxSteps = 2000) {
  let minYaw = Infinity;
  let steps = 0;
  while (orbit.update(dt) && steps < maxSteps) {
    minYaw = Math.min(minYaw, orbit.yaw);
    steps++;
  }
  return { steps, minYaw };
}

describe('drag orbit', () => {
  it('never goes past 15 degrees, however far the drag', () => {
    const orbit = createDragOrbit(fakeElement());
    orbit.setOffset(400, -400);
    expect(Math.abs(orbit.yaw)).toBeLessThanOrEqual(15 * DEG);
    expect(Math.abs(orbit.pitch)).toBeLessThanOrEqual(15 * DEG);
  });

  it('springs back to rest with under 4% overshoot, then stops', () => {
    const orbit = createDragOrbit(fakeElement());
    orbit.setOffset(12, 0);
    const start = orbit.yaw;
    orbit.release();
    const { steps, minYaw } = settle(orbit);
    expect(orbit.yaw).toBe(0);
    expect(orbit.pitch).toBe(0);
    expect(steps).toBeLessThan(120); // under 2 s at 60 fps
    expect(-minYaw / start).toBeLessThan(0.04);
  });

  it('settles the same way at 30 fps', () => {
    const orbit = createDragOrbit(fakeElement());
    orbit.setOffset(-10, 8);
    orbit.release();
    settle(orbit, 1 / 30);
    expect(orbit.update(1 / 30)).toBe(false);
  });

  it('reduced motion returns without overshoot', () => {
    const orbit = createDragOrbit(fakeElement(), { reducedMotion: true });
    orbit.setOffset(12, 0);
    orbit.release();
    const { minYaw } = settle(orbit);
    expect(minYaw).toBeGreaterThanOrEqual(-1e-4);
  });
});
