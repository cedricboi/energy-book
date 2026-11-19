// tests/maths.test.js
// Equations with divisions render as real fractions (CLAUDE.md section 7).
import { describe, it, expect } from 'vitest';
import { fracEq, wordFrac } from '../src/ui/maths.js';

describe('fracEq', () => {
  it('renders P = E/t as a KaTeX fraction, not as the letters of a command', () => {
    const html = fracEq('P', 'E', 't');
    expect(html).toContain('mfrac');
    expect(html).toContain('frac-line');
    expect(html).not.toMatch(/>d<\/span>.*>f<\/span>.*>r<\/span>/);
  });
});

describe('wordFrac', () => {
  it('renders a word equation as a fraction with its words intact', () => {
    const html = wordFrac('power', 'energy transferred', 'time taken');
    expect(html).toContain('mfrac');
    expect(html.replace(/ |&nbsp;/g, ' ')).toContain('energy transferred');
    expect(html).not.toContain('\t');
  });
});
