// src/physics/models/springLaunch.js
// Phase 4 demo: a squashed spring launches a ball, which then rolls to rest
// on the page. Energy: elastic potential -> kinetic (transferred
// mechanically) -> internal store of the ball and page (friction, also
// transferred mechanically).
//
// Uses only syllabus relationships: Ek = ½mv², work done = F × d, F = ma.
// The elastic store's starting value is given, not calculated (½kx² is not
// in the syllabus).
import { kineticEnergy, speedFromKineticEnergy, distanceFromWorkDone, workDone } from '../equations.js';

/**
 * @param {object} o
 * @param {number} o.elastic   energy in the squashed spring (J)
 * @param {number} o.mass      ball mass (kg)
 * @param {number} o.friction  resistive force while rolling (N)
 * @param {number} o.release   time for the spring to push the ball off (s)
 * @param {number} o.compression how far the spring is squashed (m), for drawing only
 */
export function createSpringLaunch({ elastic = 0.02, mass = 0.057, friction = 0.36, release = 0.15, compression = 0.03 } = {}) {
  const v0 = speedFromKineticEnergy(elastic, mass);
  const decel = friction / mass; // resultant force = mass × acceleration
  const stopDistance = distanceFromWorkDone(elastic, friction);
  const rollTime = v0 / decel;

  /** Stores and position at time t (s). Position is distance travelled from the start (m). */
  function at(t) {
    if (t <= 0) return { elastic, kinetic: 0, internal: 0, x: 0, v: 0, springOpen: 0 };
    if (t < release) {
      // During the push the spring opens smoothly. Friction during this short
      // push is ignored, which is stated on the page.
      const s = t / release;
      const f = s * s * (3 - 2 * s);
      const ke = elastic * f;
      return { elastic: elastic - ke, kinetic: ke, internal: 0, x: compression * f, v: speedFromKineticEnergy(ke, mass), springOpen: f };
    }
    const tau = Math.min(t - release, rollTime);
    const v = Math.max(0, v0 - decel * tau);
    const d = v0 * tau - 0.5 * decel * tau * tau;
    return {
      elastic: 0,
      kinetic: kineticEnergy(mass, v),
      internal: workDone(friction, d),
      x: compression + d,
      v,
      springOpen: 1,
    };
  }

  return { at, total: elastic, v0, stopDistance, duration: release + rollTime, compression };
}
