// src/energy/palette.js
// The six energy stores and the four transfer pathways (CLAUDE.md section 4,
// syllabus 5(a)). Each store has one colour, one pattern and one icon.
// Colour is never the only cue: the pattern and the label carry the meaning.
//
// Names are the exact terms from the syllabus and the teacher's notes.

export const STORES = Object.freeze({
  kinetic: { id: 'kinetic', name: 'kinetic store', short: 'kinetic', hex: '#FF5A3C', pattern: 'chevrons' },
  gravitational: { id: 'gravitational', name: 'gravitational potential store', short: 'gravitational potential', hex: '#3C8CFF', pattern: 'bands' },
  elastic: { id: 'elastic', name: 'elastic potential store', short: 'elastic potential', hex: '#B45CFF', pattern: 'zigzag' },
  chemical: { id: 'chemical', name: 'chemical potential store', short: 'chemical potential', hex: '#22C47A', pattern: 'dots' },
  internal: { id: 'internal', name: 'internal store', short: 'internal', hex: '#FFA62B', pattern: 'waves' },
  nuclear: { id: 'nuclear', name: 'nuclear store', short: 'nuclear', hex: '#FF4FA8', pattern: 'rings' },
});

export const STORE_IDS = Object.keys(STORES);

/** Pattern index used by the liquid shader. */
export const PATTERN_INDEX = Object.freeze({ chevrons: 0, bands: 1, zigzag: 2, dots: 3, waves: 4, rings: 5 });

/** The four ways energy is transferred (syllabus 5(a)(i) to (iv)). */
export const PATHWAYS = Object.freeze({
  mechanical: { id: 'mechanical', name: 'transferred mechanically', detail: 'by a force acting over a distance', style: 0 },
  electrical: { id: 'electrical', name: 'transferred electrically', detail: 'by an electric current', style: 1 },
  heating: { id: 'heating', name: 'transferred by heating', detail: 'due to a temperature difference', style: 2 },
  waves: { id: 'waves', name: 'transferred by propagation of waves', detail: 'both electromagnetic and mechanical', style: 3 },
});

/**
 * Icons as inline SVG (24 x 24, stroke = currentColor), for HTML labels.
 * Kinetic: arrow. Gravitational: up arrow on a shelf. Elastic: spring.
 * Chemical: battery. Internal: thermometer. Nuclear: atom.
 */
export const ICONS = Object.freeze({
  kinetic: '<path d="M3 12h15M13 6l6 6-6 6"/>',
  gravitational: '<path d="M3 20h18M12 17V5M7 10l5-5 5 5"/>',
  elastic: '<path d="M4 12h2l2-5 3 10 3-10 3 10 2-5h1"/>',
  chemical: '<rect x="3" y="7" width="16" height="10" rx="1.5"/><path d="M21 10v4M7 12h4M9 10v4M14 12h2"/>',
  internal: '<path d="M10 14V5a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0z"/><path d="M12 9v7"/>',
  nuclear: '<circle cx="12" cy="12" r="1.6"/><ellipse cx="12" cy="12" rx="9" ry="3.5"/><ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(-60 12 12)"/>',
});

export function iconSvg(id, size = 20) {
  return `<svg class="store-icon" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[id]}</svg>`;
}

// ---------- Colour maths (also used by the colour-blind test) ----------

/** '#RRGGBB' to linear RGB in 0..1. */
export function hexToLinear(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
}

export function luminance([r, g, b]) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * HDR glow colour for a store, scaled to a target luminance so every store
 * glows equally and all of them pass the bloom threshold of 1 (CLAUDE.md
 * section 4). The hue is kept.
 */
export function glowColour(id, targetLuminance = 1.3) {
  const lin = hexToLinear(STORES[id].hex);
  const k = targetLuminance / luminance(lin);
  return lin.map((c) => c * k);
}

// Machado, Oliveira and Fernandes (2009), severity 1.0, applied in linear RGB.
export const CVD = Object.freeze({
  protanopia: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deuteranopia: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
});

export function simulate(lin, type) {
  const m = CVD[type];
  return m.map((row) => Math.min(1, Math.max(0, row[0] * lin[0] + row[1] * lin[1] + row[2] * lin[2])));
}

/** CIE76 colour difference between two linear RGB colours (via CIELAB, D65). */
export function deltaE(a, b) {
  const lab = ([r, g, bl]) => {
    const x = (0.4124 * r + 0.3576 * g + 0.1805 * bl) / 0.95047;
    const y = 0.2126 * r + 0.7152 * g + 0.0722 * bl;
    const z = (0.0193 * r + 0.1192 * g + 0.9505 * bl) / 1.08883;
    const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
  };
  const [l1, a1, b1] = lab(a);
  const [l2, a2, b2] = lab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}
