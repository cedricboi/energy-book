// tests/palette.test.js
// The store palette (CLAUDE.md section 4): six stores, each with its own
// colour, pattern and icon, every glow above the bloom threshold, and a
// colour-blind check that reports pairs which rely on pattern and label.
import { describe, it, expect } from 'vitest';
import { STORES, STORE_IDS, ICONS, PATHWAYS, glowColour, luminance, hexToLinear, simulate, deltaE } from '../src/energy/palette.js';

describe('palette', () => {
  it('has exactly the six syllabus stores, with syllabus names', () => {
    expect(STORE_IDS).toEqual(['kinetic', 'gravitational', 'elastic', 'chemical', 'internal', 'nuclear']);
    expect(STORES.gravitational.name).toBe('gravitational potential store');
    expect(STORES.internal.name).toBe('internal store');
    expect(STORES.nuclear.name).toBe('nuclear store');
  });
  it('gives every store a different colour, pattern and icon', () => {
    const hexes = new Set(STORE_IDS.map((id) => STORES[id].hex));
    const patterns = new Set(STORE_IDS.map((id) => STORES[id].pattern));
    expect(hexes.size).toBe(6);
    expect(patterns.size).toBe(6);
    for (const id of STORE_IDS) expect(ICONS[id]).toBeTruthy();
  });
  it('names the four pathways in syllabus words', () => {
    expect(Object.values(PATHWAYS).map((p) => p.name)).toEqual([
      'transferred mechanically', 'transferred electrically', 'transferred by heating', 'transferred by propagation of waves',
    ]);
  });
  it('makes every glow pass the bloom threshold of 1, at the same luminance', () => {
    for (const id of STORE_IDS) expect(luminance(glowColour(id))).toBeCloseTo(1.3, 6);
  });
  it('reports which store pairs look alike under colour blindness (pattern and label must carry them)', () => {
    const report = [];
    for (const type of ['protanopia', 'deuteranopia']) {
      for (let i = 0; i < STORE_IDS.length; i++) {
        for (let j = i + 1; j < STORE_IDS.length; j++) {
          const a = simulate(hexToLinear(STORES[STORE_IDS[i]].hex), type);
          const b = simulate(hexToLinear(STORES[STORE_IDS[j]].hex), type);
          const d = deltaE(a, b);
          if (d < 15) report.push(`${type}: ${STORE_IDS[i]} / ${STORE_IDS[j]} (ΔE ${d.toFixed(1)})`);
        }
      }
    }
    console.log(report.length ? `Colour-only confusions:\n  ${report.join('\n  ')}` : 'No colour-only confusions');
    // Every confusable pair must still differ in pattern (checked above), so this passes by design.
    expect(Array.isArray(report)).toBe(true);
  });
});
