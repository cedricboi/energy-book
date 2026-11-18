// src/ui/maths.js
// Equations with divisions are written as fractions (CLAUDE.md section 7),
// rendered by KaTeX to HTML once, when a lesson loads.
import katex from 'katex';
import 'katex/dist/katex.min.css';

export function tex(expr) {
  return katex.renderToString(expr, { throwOnError: false, output: 'html' });
}

/** "P = E/t" written as a fraction: frac('P', 'E', 't'). */
export function fracEq(lhs, top, bottom) {
  return tex(`${lhs} = \dfrac{${top}}{${bottom}}`);
}
