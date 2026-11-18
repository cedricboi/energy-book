// src/physics/constants.js
// Every physical constant used in the book. Nothing else defines a constant.

/**
 * Gravitational field strength near the Earth's surface, in N/kg (equal to m/s²).
 * The G2 SEC syllabus (K223/K224/K225) does not state a value. The teacher's
 * lesson notes use 10 N/kg throughout, as O-Level and SEC papers do.
 * See docs/SYLLABUS_COVERAGE.md section 4.
 */
export const G = 10;

/**
 * Energy ledgers must balance to within this fraction of the starting total
 * (CLAUDE.md section 5, rule 4: within 0.1%).
 */
export const LEDGER_TOLERANCE = 0.001;

/** Default significant figures for numbers on screen (CLAUDE.md section 5, rule 7). */
export const DEFAULT_SIG_FIGS = 3;
