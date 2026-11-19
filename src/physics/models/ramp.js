// src/physics/models/ramp.js
// Lesson 5: a skateboarder on a smooth half-pipe.
//
// The ramp's surface is y = k x² (metres), between walls of height TOP.
// The rider starts at rest at a chosen height on the left wall.
//
// The ledger is exact by construction: the speed is always found from the
// energy left over, never integrated separately.
//   Ep = mgh                         (gravitational potential store)
//   internal = friction force × distance moved   (work done = F × d)
//   Ek = total − Ep − internal       (kinetic store), so v from Ek = ½mv²
// With friction off, the rider rises to the start height on the other side.
// With friction on, a small constant force transfers energy to the internal
// store of the board and ramp, and each pass ends lower.
import { gravitationalPotentialEnergy, speedFromKineticEnergy, workDone, kineticEnergy, speedFromDrop } from '../equations.js';
import { G } from '../constants.js';

export const RAMP = Object.freeze({
  TOP: 3.2, // wall height (m)
  HALF: 3.4, // half the width of the curved part (m)
  get K() {
    return this.TOP / (this.HALF * this.HALF);
  },
});

export const rampHeight = (x) => RAMP.K * x * x;
const slope = (x) => 2 * RAMP.K * x;
const dsdx = (x) => Math.sqrt(1 + slope(x) ** 2);

/** x position (m) on the left wall at a given height. */
export const xAtHeight = (h) => -Math.sqrt(h / RAMP.K);

/**
 * @param {object} o
 * @param {number} o.mass         kg
 * @param {number} o.startHeight  m (0.5 to 3.0)
 * @param {boolean} o.friction
 * @param {number} [o.side]  -1 to start on the left wall, 1 on the right
 * @param {number} [o.frictionFraction]  friction force as a fraction of the weight
 */
export function createRampModel({ mass = 50, startHeight = 2, friction = false, frictionFraction = 0.035, side = -1 } = {}) {
  if (startHeight > RAMP.TOP) throw new RangeError('The start height is above the top of the ramp');
  const total = gravitationalPotentialEnergy(mass, startHeight);
  const f = friction ? frictionFraction * mass * G : 0;
  const s = { x: side > 0 ? -xAtHeight(startHeight) : xAtHeight(startHeight), dir: side > 0 ? -1 : 1, travelled: 0, t: 0, stopped: false, passes: 0 };

  function energyAt(x, travelled) {
    const ep = gravitationalPotentialEnergy(mass, rampHeight(x));
    const internal = workDone(f, travelled);
    return { ep, internal, ek: total - ep - internal };
  }

  /** Advance by dt seconds (in small steps). */
  function step(dt) {
    if (s.stopped) return;
    const sub = Math.max(1, Math.ceil(dt / 0.002));
    const h = dt / sub;
    for (let i = 0; i < sub; i++) {
      const { ek } = energyAt(s.x, s.travelled);
      const v = ek > 0 ? speedFromKineticEnergy(ek, mass) : 0;
      // Move along the surface; a minimum creep starts motion from rest.
      const ds = Math.max(v, 0.05) * h;
      const dx = (ds / dsdx(s.x)) * s.dir;
      const nx = s.x + dx;
      const nTravelled = s.travelled + Math.abs(dx) * dsdx(s.x);
      const next = energyAt(nx, nTravelled);
      if (next.ek < 0) {
        // Turning point: the energy runs out before the next step. Find the
        // exact height where Ek = 0 and turn round there.
        let lo = s.x;
        let hi = nx;
        for (let k = 0; k < 40; k++) {
          const mid = (lo + hi) / 2;
          const tr = s.travelled + Math.abs(mid - s.x) * dsdx((mid + s.x) / 2);
          if (energyAt(mid, tr).ek >= 0) lo = mid;
          else hi = mid;
        }
        s.travelled += Math.abs(lo - s.x) * dsdx((lo + s.x) / 2);
        s.x = lo;
        s.dir = -s.dir;
        s.passes += 1;
        // With friction, stop once the swing is too small to see.
        if (f > 0 && Math.abs(s.x) < 0.25) s.stopped = true;
      } else {
        s.x = nx;
        s.travelled = nTravelled;
      }
      s.t += h;
    }
  }

  function values() {
    const { ep, internal, ek } = energyAt(s.x, s.travelled);
    const kinetic = Math.max(0, ek);
    return {
      gravitational: ep,
      kinetic,
      internal,
      x: s.x,
      y: rampHeight(s.x),
      v: kinetic > 0 ? speedFromKineticEnergy(kinetic, mass) : 0,
      dir: s.dir,
      t: s.t,
      passes: s.passes,
      stopped: s.stopped,
    };
  }

  return {
    total,
    mass,
    startHeight,
    friction,
    step,
    values,
    /** Speed at the bottom with no friction, from mgh = ½mv². */
    bottomSpeed: () => speedFromDrop(startHeight),
    /** Kinetic energy at the bottom with no friction (equals the starting Ep). */
    bottomKinetic: () => kineticEnergy(mass, speedFromDrop(startHeight)),
  };
}
