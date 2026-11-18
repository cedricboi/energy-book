// src/energy/displayLedger.js
// What the jars show while energy is visibly travelling between them.
// A physics model gives the true store values. Each transfer moves energy out
// of its source the moment it happens, carries it as packets for `travel`
// seconds, and adds it to its destination when it lands. So at every frame:
//   sum of displayed stores + energy in transit = the model's total.
import { TransferLedger } from './flow.js';

/**
 * @param {object} o
 * @param {Record<string, number>} o.start   model values at t = 0
 * @param {{ from: string, to: string, moved: (prev: object, cur: object) => number }[]} o.transfers
 * @param {number} o.travel   seconds a packet takes (in model time)
 */
export function createDisplayLedger({ start, transfers, travel }) {
  const display = { ...start };
  const ledgers = transfers.map(() => new TransferLedger(travel));
  let prev = { ...start };

  return {
    ledgers,
    /** Advance to the model's new values. `dt` is model time. */
    step(model, dt) {
      transfers.forEach((tr, i) => {
        const m = Math.max(0, tr.moved(prev, model));
        display[tr.from] -= m;
        ledgers[i].emit(m);
      });
      transfers.forEach((tr, i) => {
        display[tr.to] += ledgers[i].step(dt);
      });
      prev = { ...model };
      return this.snapshot();
    },
    snapshot() {
      const transit = ledgers.reduce((s, l) => s + l.inTransit, 0);
      return { display: { ...display }, transit };
    },
    reset(values = start) {
      Object.assign(display, values);
      prev = { ...values };
      ledgers.forEach((l) => l.clear());
    },
  };
}
