// src/physics/models/bounce.js
// Lesson 6: a ball dropped onto a hard floor.
//   Falling: gravitational potential store -> kinetic store (Ep = mgh, Ek = ½mv²).
//   Squash: kinetic store -> elastic potential store, then back.
//   Each squash keeps a fraction `keep` of the energy. The rest goes to the
//   internal store of the ball and floor, and some is carried away by sound
//   (propagation of waves), which also ends in the internal store of the
//   surroundings.
// The ledger is exact by construction: every store is set from the energy
// budget, never integrated. Uses only syllabus relationships.
import { gravitationalPotentialEnergy, speedFromDrop, heightFromSpeed } from '../equations.js';
import { G } from '../constants.js';

/** Balls students can choose. `keep` is the fraction of energy kept per bounce. */
export const BALLS = Object.freeze({
  tennis: { label: 'tennis ball', mass: 0.057, radius: 0.0335, keep: 0.55 }, // ITF rebound test, see lessons/sources.js
  basketball: { label: 'basketball', mass: 0.6, radius: 0.12, keep: 0.6 },
  superball: { label: 'superball', mass: 0.02, radius: 0.016, keep: 0.85 },
  clay: { label: 'clay ball', mass: 0.1, radius: 0.025, keep: 0 },
});

export const SQUASH_TIME = 0.06; // s, contact time with the floor
export const SOUND_SHARE = 0.15; // of each bounce's loss, carried away as sound

export function createBounceModel({ ball = 'tennis', height = 1.0 } = {}) {
  const b = BALLS[ball];
  const total = gravitationalPotentialEnergy(b.mass, height);
  const s = { phase: 'fall', t: 0, top: height, internal: 0, sound: 0, bounces: 0, stopped: false, totalTime: 0 };
  let lossAtStart = 0;

  function state() {
    const m = b.mass;
    if (s.phase === 'fall' || s.phase === 'rise') {
      // Free fall from (or rise to) the top height s.top.
      const tTop = Math.sqrt((2 * s.top) / G);
      const tau = s.phase === 'fall' ? s.t : tTop - s.t;
      const y = Math.max(0, s.top - 0.5 * G * tau * tau);
      const mech = gravitationalPotentialEnergy(m, s.top);
      const gp = gravitationalPotentialEnergy(m, y);
      return { gravitational: gp, kinetic: mech - gp, elastic: 0, y, squash: 0 };
    }
    if (s.phase === 'squash') {
      // Mechanical energy falls steadily from its value at impact to `keep`
      // of it. The squash shape w rises to 1 and falls back to 0.
      const f = Math.min(1, s.t / SQUASH_TIME);
      const atImpact = total - lossAtStart;
      const mech = atImpact * (1 - (1 - b.keep) * f);
      const w = Math.sin(Math.PI * f);
      return { gravitational: 0, kinetic: mech * (1 - w), elastic: mech * w, y: 0, squash: w };
    }
    return { gravitational: 0, kinetic: 0, elastic: 0, y: 0, squash: 0 };
  }

  function values() {
    const st = state();
    // Whatever is not in the mechanical stores has gone to the internal store.
    const lost = total - st.gravitational - st.kinetic - st.elastic;
    return {
      ...st,
      internal: Math.max(0, lost),
      soundShare: SOUND_SHARE,
      bounces: s.bounces,
      phase: s.phase,
      stopped: s.stopped,
      top: s.top,
      t: s.totalTime,
    };
  }

  function step(dt) {
    let left = dt;
    while (left > 1e-9 && !s.stopped) {
      if (s.phase === 'fall') {
        const tFloor = Math.sqrt((2 * s.top) / G);
        const d = Math.min(left, tFloor - s.t);
        s.t += d;
        left -= d;
        if (s.t >= tFloor - 1e-12) {
          s.phase = 'squash';
          s.t = 0;
          lossAtStart = total - gravitationalPotentialEnergy(b.mass, s.top);
        }
      } else if (s.phase === 'squash') {
        const d = Math.min(left, SQUASH_TIME - s.t);
        s.t += d;
        left -= d;
        if (s.t >= SQUASH_TIME - 1e-12) {
          s.bounces += 1;
          const vUp = speedFromDrop(s.top) * Math.sqrt(b.keep);
          s.top = heightFromSpeed(vUp);
          if (s.top < 0.005) {
            s.phase = 'rest';
            s.stopped = true;
          } else {
            s.phase = 'rise';
            s.t = 0;
          }
        }
      } else if (s.phase === 'rise') {
        const tTop = Math.sqrt((2 * s.top) / G);
        const d = Math.min(left, tTop - s.t);
        s.t += d;
        left -= d;
        if (s.t >= tTop - 1e-12) {
          s.phase = 'fall';
          s.t = 0;
        }
      } else {
        left = 0;
      }
    }
    s.totalTime += dt - left;
  }

  return { total, ball: b, step, values, bounceHeight: (h = height) => h * b.keep };
}
