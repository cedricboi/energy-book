// src/physics/format.js
// Every number on screen is formatted here (CLAUDE.md section 5, rule 7).
// Sensible significant figures (normally 2 or 3), always with a unit and a
// space before it: "12 J", "3.5 m/s", "0.0125 J", "50 000 W".
// Large numbers are grouped with a space every three digits from 10 000 up,
// as in the teacher's notes ("30 000 J"). Four-digit numbers are not grouped
// ("1800 J"). Scientific notation is never used.

import { DEFAULT_SIG_FIGS } from './constants.js';

/** Round to a number of significant figures, returning a Number. */
export function roundSig(value, sigFigs = DEFAULT_SIG_FIGS) {
  if (!Number.isFinite(value)) throw new TypeError(`value must be finite, got ${value}`);
  if (!Number.isInteger(sigFigs) || sigFigs < 1) throw new RangeError(`sigFigs must be a whole number of 1 or more`);
  if (value === 0) return 0;
  return Number(value.toPrecision(sigFigs));
}

function groupThousands(intPart) {
  if (intPart.length < 5) return intPart;
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** Format a number (no unit) to significant figures, without trailing zeros. */
export function formatNumber(value, sigFigs = DEFAULT_SIG_FIGS) {
  const rounded = roundSig(value, sigFigs);
  if (rounded === 0) return '0';
  const magnitude = Math.floor(Math.log10(Math.abs(rounded)));
  const decimals = Math.max(0, sigFigs - 1 - magnitude);
  let text = Math.abs(rounded).toFixed(decimals);
  if (text.includes('.')) text = text.replace(/0+$/, '').replace(/\.$/, '');
  const [intPart, frac] = text.split('.');
  const body = groupThousands(intPart) + (frac ? `.${frac}` : '');
  return (rounded < 0 ? '-' : '') + body;
}

/** Format a value with its unit: formatQuantity(12, 'J') -> "12 J". */
export function formatQuantity(value, unit, sigFigs = DEFAULT_SIG_FIGS) {
  if (typeof unit !== 'string' || unit.trim() === '') {
    throw new TypeError('Every number on screen needs a unit (CLAUDE.md section 5, rule 7)');
  }
  return `${formatNumber(value, sigFigs)} ${unit}`;
}
