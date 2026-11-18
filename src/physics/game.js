// src/physics/game.js
// Ledger Run: the chapter game. The physics is the mechanic (CLAUDE.md,
// LESSON_PLAN chapter game). Every transfer uses physics/equations.js.
//
// A marble (0.05 kg) must arrive at a target with exactly the energy it
// needs. Inputs a student can set:
//   height   start height on the tower (Ep = mgh)
//   spring   energy stored in the spring launcher, in joules (given, because
//            ½kx² is not in the syllabus)
//   lift     seconds the lift motor runs (E = P × t)
//   fan      seconds the fan runs (E = P × t)
// Each part states how many joules it transfers to the internal store of the
// surroundings. No efficiencies or percentages (not in the syllabus).
//
// The machine wins when the energy left at the target is at least what the
// target needs and less than half of one input step more. Too little and the
// marble stalls. Too much and it overshoots.
import { gravitationalPotentialEnergy, energyFromPower, kineticEnergy } from './equations.js';

export const MARBLE = 0.05; // kg

/**
 * Level format:
 *  inputs: { id: { min, max, step } }     what the student may set
 *  power:  { lift?, fan? }                 W, for E = P × t
 *  fixedLoss: [{ part, joules }]           losses that always happen
 *  perSecondLoss: { lift?, fan? }          J lost for each second a motor runs
 *  springLoss                              J lost if the spring is used at all
 *  target: { height } or { speed }         a cup at a height, or a speed gate
 */
export const LEVELS = [
  {
    id: 1, title: 'One ramp',
    story: 'Roll the marble down one ramp and up into the cup.',
    inputs: { height: { min: 0.1, max: 1.0, step: 0.05 } },
    fixedLoss: [{ part: 'ramp', joules: 0.025 }],
    target: { height: 0.4 },
  },
  {
    id: 2, title: 'Two ramps',
    story: 'Two ramps this time. Each one transfers some energy to the internal store.',
    inputs: { height: { min: 0.1, max: 1.0, step: 0.05 } },
    fixedLoss: [{ part: 'first ramp', joules: 0.03 }, { part: 'second ramp', joules: 0.02 }],
    target: { height: 0.3 },
  },
  {
    id: 3, title: 'The spring launcher',
    story: 'The marble starts on the floor. Set the energy in the spring to send it up into the cup.',
    inputs: { spring: { min: 0.05, max: 0.5, step: 0.01 } },
    fixedLoss: [{ part: 'track', joules: 0.03 }],
    springLoss: 0.02,
    target: { height: 0.26 },
  },
  {
    id: 4, title: 'Spring and tower',
    story: 'The marble starts on a tower 0.20 m high. Add energy with the spring.',
    inputs: { spring: { min: 0, max: 0.4, step: 0.01 } },
    startHeight: 0.2,
    fixedLoss: [{ part: 'ramp', joules: 0.04 }],
    springLoss: 0.02,
    target: { height: 0.5 },
  },
  {
    id: 5, title: 'The lift',
    story: 'A lift with a 0.050 W motor carries the marble up. Choose how long it runs.',
    inputs: { lift: { min: 1, max: 20, step: 1 } },
    power: { lift: 0.05 },
    fixedLoss: [{ part: 'lift motor', joules: 0.05 }, { part: 'ramp', joules: 0.02 }],
    target: { height: 0.36 },
  },
  {
    id: 6, title: 'Lift and spring',
    story: 'Use the lift, the spring or both. The lift motor loses 0.010 J every second it runs. Least input energy earns a bonus.',
    inputs: { lift: { min: 0, max: 10, step: 1 }, spring: { min: 0, max: 0.3, step: 0.01 } },
    power: { lift: 0.05 },
    perSecondLoss: { lift: 0.01 },
    springLoss: 0.02,
    fixedLoss: [{ part: 'track', joules: 0.03 }],
    target: { height: 0.6 },
  },
  {
    id: 7, title: 'Through the speed gate',
    story: 'No cup this time. The marble must pass the gate at the bottom at exactly 2.0 m/s.',
    inputs: { height: { min: 0.1, max: 1.0, step: 0.05 } },
    fixedLoss: [{ part: 'ramp', joules: 0.025 }],
    target: { speed: 2.0 },
  },
  {
    id: 8, title: 'The five-part machine',
    story: 'Use any mix of parts to reach the high cup. Least input energy earns a bonus.',
    inputs: {
      height: { min: 0, max: 0.5, step: 0.05 },
      spring: { min: 0, max: 0.3, step: 0.01 },
      lift: { min: 0, max: 10, step: 1 },
      fan: { min: 0, max: 10, step: 1 },
    },
    power: { lift: 0.05, fan: 0.02 },
    perSecondLoss: { lift: 0.01, fan: 0.005 },
    springLoss: 0.02,
    fixedLoss: [{ part: 'ramps and track', joules: 0.05 }],
    target: { height: 0.8 },
  },
];

const round = (x) => Math.round(x * 1e9) / 1e9;

/** The energy the target needs. */
export function targetEnergy(level) {
  if (level.target.height !== undefined) return gravitationalPotentialEnergy(MARBLE, level.target.height);
  return kineticEnergy(MARBLE, level.target.speed);
}

/** Energy each input supplies, in joules. */
export function inputEnergies(level, inputs) {
  const out = {};
  const start = level.startHeight ?? 0;
  out.height = gravitationalPotentialEnergy(MARBLE, (inputs.height ?? 0) + start);
  out.spring = inputs.spring ?? 0;
  out.lift = level.power?.lift ? energyFromPower(level.power.lift, inputs.lift ?? 0) : 0;
  out.fan = level.power?.fan ? energyFromPower(level.power.fan, inputs.fan ?? 0) : 0;
  return out;
}

/** Every loss, part by part, in joules. */
export function losses(level, inputs) {
  const list = [...(level.fixedLoss ?? [])];
  if (level.springLoss && (inputs.spring ?? 0) > 0) list.push({ part: 'spring', joules: level.springLoss });
  for (const m of ['lift', 'fan']) {
    const per = level.perSecondLoss?.[m];
    if (per && (inputs[m] ?? 0) > 0) list.push({ part: `${m} motor`, joules: per * inputs[m] });
  }
  return list;
}

/** Half of the smallest energy step any input can make: the winning window. */
export function tolerance(level) {
  const steps = [];
  for (const [id, r] of Object.entries(level.inputs)) {
    const one = { [id]: r.step };
    const zero = { [id]: 0 };
    const e = inputEnergies(level, one)[id] - inputEnergies(level, zero)[id];
    steps.push(Math.abs(e));
  }
  return Math.min(...steps) / 2;
}

/** Run the machine's accounts. */
export function evaluate(level, inputs) {
  const supplied = inputEnergies(level, inputs);
  const totalIn = round(Object.values(supplied).reduce((a, b) => a + b, 0));
  const lost = losses(level, inputs);
  const totalLost = round(lost.reduce((a, l) => a + l.joules, 0));
  const atTarget = round(totalIn - totalLost);
  const need = round(targetEnergy(level));
  const tol = tolerance(level);
  let result = 'win';
  if (atTarget < need - 1e-9) result = 'stall';
  else if (atTarget >= need + tol - 1e-9) result = 'overshoot';
  return { supplied, totalIn, lost, totalLost, atTarget, need, tol, result, margin: round(atTarget - need) };
}

/** Every combination of inputs a level allows. */
export function allInputs(level) {
  const ids = Object.keys(level.inputs);
  const values = ids.map((id) => {
    const r = level.inputs[id];
    const n = Math.round((r.max - r.min) / r.step);
    return Array.from({ length: n + 1 }, (_, i) => round(r.min + i * r.step));
  });
  const out = [];
  const rec = (i, acc) => {
    if (i === ids.length) {
      out.push({ ...acc });
      return;
    }
    for (const v of values[i]) rec(i + 1, { ...acc, [ids[i]]: v });
  };
  rec(0, {});
  return out;
}

/** The winning inputs, and the one with the least input energy. */
export function solve(level) {
  const wins = allInputs(level).map((inp) => ({ inputs: inp, ...evaluate(level, inp) })).filter((r) => r.result === 'win');
  const least = wins.reduce((best, r) => (!best || r.totalIn < best.totalIn - 1e-12 ? r : best), null);
  return { wins, least, chance: wins.length / allInputs(level).length };
}

/**
 * Points (no speed bonus):
 *   100 for reaching the target
 *   +50 if this was the least input energy possible
 *   +25 × streak for levels cleared on the first try in a row
 */
export function score(level, inputs, { firstTry, streak }) {
  const r = evaluate(level, inputs);
  if (r.result !== 'win') return { points: 0, ...r };
  const { least } = solve(level);
  const leastBonus = Math.abs(r.totalIn - least.totalIn) < 1e-9 ? 50 : 0;
  const streakBonus = firstTry ? 25 * streak : 0;
  return { points: 100 + leastBonus + streakBonus, leastBonus, streakBonus, ...r };
}
