// src/physics/equations.js
// Every number on screen comes from this file (CLAUDE.md section 5, rule 1).
//
// Only the syllabus equations are used (docs/SYLLABUS_COVERAGE.md):
//   5(b)  Ek = ½mv²          Ep = mgh
//   5(d)  work done = force × distance moved in the direction of the force (W = F × d)
//   5(e)  power = energy transferred ÷ time taken (P = E/t)
//   3(e)  weight = mass × gravitational field strength (recalled, used for lifting)
// The other functions are rearrangements of these, which students also do in
// "find h" or "find v" questions. Nothing outside the syllabus is added.
//
// Units are SI throughout: kg, m, s, m/s, N, J, W.

import { G, LEDGER_TOLERANCE } from './constants.js';

function check(name, value, { positive = false } = {}) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number, got ${value}`);
  }
  if (positive ? value <= 0 : value < 0) {
    throw new RangeError(`${name} must be ${positive ? 'greater than zero' : 'zero or more'}, got ${value}`);
  }
  return value;
}

// ---------- 5(b) Kinetic energy ----------

/** Ek = ½mv². Mass in kg, speed in m/s. Returns J. */
export function kineticEnergy(mass, speed) {
  check('mass', mass);
  check('speed', speed);
  return 0.5 * mass * speed * speed;
}

/** Rearranged Ek = ½mv² for v. Returns m/s. */
export function speedFromKineticEnergy(energy, mass) {
  check('energy', energy);
  check('mass', mass, { positive: true });
  return Math.sqrt((2 * energy) / mass);
}

/** Rearranged Ek = ½mv² for m. Returns kg. */
export function massFromKineticEnergy(energy, speed) {
  check('energy', energy);
  check('speed', speed, { positive: true });
  return (2 * energy) / (speed * speed);
}

// ---------- 5(b) Gravitational potential energy ----------

/** Ep = mgh. Mass in kg, height in m. Returns J. */
export function gravitationalPotentialEnergy(mass, height, g = G) {
  check('mass', mass);
  check('height', height);
  check('g', g, { positive: true });
  return mass * g * height;
}

/** Rearranged Ep = mgh for h. Returns m. */
export function heightFromGravitationalPotentialEnergy(energy, mass, g = G) {
  check('energy', energy);
  check('mass', mass, { positive: true });
  check('g', g, { positive: true });
  return energy / (mass * g);
}

/** Rearranged Ep = mgh for m. Returns kg. */
export function massFromGravitationalPotentialEnergy(energy, height, g = G) {
  check('energy', energy);
  check('height', height, { positive: true });
  check('g', g, { positive: true });
  return energy / (g * height);
}

// ---------- 5(c) Conservation of energy ----------

/**
 * Speed after falling through a height with no energy transferred to the
 * internal store, from mgh = ½mv². Mass cancels, so it is not a parameter.
 * Returns m/s.
 */
export function speedFromDrop(height, g = G) {
  check('height', height);
  check('g', g, { positive: true });
  return Math.sqrt(2 * g * height);
}

/** Height reached by an object thrown upward at a given speed, from ½mv² = mgh. Returns m. */
export function heightFromSpeed(speed, g = G) {
  check('speed', speed);
  check('g', g, { positive: true });
  return (speed * speed) / (2 * g);
}

/** Sum of every store in a ledger. `stores` is an object of { storeName: joules }. */
export function ledgerTotal(stores) {
  let total = 0;
  for (const [name, value] of Object.entries(stores)) total += check(`store "${name}"`, value);
  return total;
}

/**
 * True when a ledger's total matches the starting total to within the tolerance
 * (CLAUDE.md section 5, rule 4). Works for a zero start too.
 */
export function ledgerBalances(startTotal, stores, tolerance = LEDGER_TOLERANCE) {
  check('startTotal', startTotal);
  const total = ledgerTotal(stores);
  if (startTotal === 0) return total === 0;
  return Math.abs(total - startTotal) / startTotal <= tolerance;
}

// ---------- 5(d) Work done ----------

/** W = F × d, where d is the distance moved in the direction of the force. Returns J. */
export function workDone(force, distance) {
  check('force', force);
  check('distance', distance);
  return force * distance;
}

/** Rearranged W = F × d for F. Returns N. */
export function forceFromWorkDone(work, distance) {
  check('work', work);
  check('distance', distance, { positive: true });
  return work / distance;
}

/** Rearranged W = F × d for d. Returns m. */
export function distanceFromWorkDone(work, force) {
  check('work', work);
  check('force', force, { positive: true });
  return work / force;
}

// ---------- 5(e) Power ----------

/** P = E/t. Energy in J, time in s. Returns W. */
export function power(energy, time) {
  check('energy', energy);
  check('time', time, { positive: true });
  return energy / time;
}

/** Rearranged P = E/t for E. Returns J. */
export function energyFromPower(powerW, time) {
  check('power', powerW);
  check('time', time);
  return powerW * time;
}

/** Rearranged P = E/t for t. Returns s. */
export function timeFromPower(energy, powerW) {
  check('energy', energy);
  check('power', powerW, { positive: true });
  return energy / powerW;
}

// ---------- 3(e) Weight (recalled from Topic 3) ----------

/** weight = mass × gravitational field strength. Returns N. */
export function weight(mass, g = G) {
  check('mass', mass);
  check('g', g, { positive: true });
  return mass * g;
}
