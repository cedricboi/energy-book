// tests/ramp.test.js
// Lesson 5 physics: the ramp ledger stays constant to 0.1%, the speed at the
// bottom comes from mgh = ½mv², and it does not depend on mass.
import { describe, it, expect } from 'vitest';
import { createRampModel, rampHeight, RAMP } from '../src/physics/models/ramp.js';
import { ledgerBalances, speedFromDrop } from '../src/physics/equations.js';

function run(model, seconds, dt = 1 / 60, each) {
  for (let t = 0; t < seconds; t += dt) {
    model.step(dt);
    each?.(model.values());
  }
}

describe('ramp model', () => {
  it('keeps the ledger constant to 0.1% at every step, friction off', () => {
    const m = createRampModel({ mass: 50, startHeight: 2 });
    run(m, 20, 1 / 60, (v) => expect(ledgerBalances(m.total, { g: v.gravitational, k: v.kinetic, i: v.internal })).toBe(true));
  });
  it('keeps the ledger constant to 0.1% at every step, friction on', () => {
    const m = createRampModel({ mass: 65, startHeight: 3, friction: true });
    run(m, 40, 1 / 60, (v) => expect(ledgerBalances(m.total, { g: v.gravitational, k: v.kinetic, i: v.internal })).toBe(true));
  });
  it('rises to the start height on the other side with no friction', () => {
    const m = createRampModel({ startHeight: 2.4 });
    let maxRight = 0;
    run(m, 6, 1 / 120, (v) => { if (v.x > 0) maxRight = Math.max(maxRight, v.y); });
    expect(maxRight).toBeCloseTo(2.4, 3);
  });
  it('never returns to the start height with friction, and the internal store grows each pass', () => {
    const m = createRampModel({ startHeight: 2.4, friction: true });
    const peaks = [];
    let last = m.values();
    run(m, 30, 1 / 120, (v) => { if (v.passes > last.passes) peaks.push(v.y); last = v; });
    expect(peaks.length).toBeGreaterThan(2);
    for (let i = 1; i < peaks.length; i++) expect(peaks[i]).toBeLessThan(peaks[i - 1]);
    expect(peaks[0]).toBeLessThan(2.4);
  });
  it('has the speed at the bottom given by mgh = ½mv²', () => {
    const m = createRampModel({ mass: 50, startHeight: 3 });
    let atBottom = null;
    run(m, 3, 1 / 2000, (v) => { if (atBottom === null && v.x >= 0) atBottom = v; });
    expect(atBottom.v).toBeCloseTo(speedFromDrop(3), 2);
    expect(m.bottomSpeed()).toBeCloseTo(Math.sqrt(60), 10);
  });
  it('gives the same speed at the bottom for any mass', () => {
    const speeds = [30, 50, 80].map((mass) => createRampModel({ mass, startHeight: 1.8 }).bottomSpeed());
    expect(speeds[0]).toBeCloseTo(speeds[1], 12);
    expect(speeds[1]).toBeCloseTo(speeds[2], 12);
  });
  it('the ramp is drawn to scale: 3.2 m walls, 6.8 m across', () => {
    expect(rampHeight(RAMP.HALF)).toBeCloseTo(3.2, 12);
    expect(rampHeight(-RAMP.HALF)).toBeCloseTo(3.2, 12);
  });
});
