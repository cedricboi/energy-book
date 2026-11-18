// src/ui/debug.js
// Ink debug panel, shown only with ?debug=1 (Phase 3). Sliders for line
// width, wobble, hatch spacing, hatch thresholds and draw-in speed, plus the
// three presets and a replay button. Every slider has − and + buttons.

const SLIDERS = [
  { key: 'outlinePx', label: 'Outline width (px)', min: 0.5, max: 5, step: 0.1 },
  { key: 'creasePx', label: 'Line width (px)', min: 0.5, max: 4, step: 0.1 },
  { key: 'wobblePx', label: 'Wobble (px, max 0.6)', min: 0, max: 0.6, step: 0.02 },
  { key: 'widthJitter', label: 'Line swell', min: 0, max: 0.6, step: 0.05 },
  { key: 'hatchSpacing', label: 'Hatch spacing (px)', min: 2, max: 12, step: 0.1 },
  { key: 'hatchWidth', label: 'Hatch line width (px)', min: 0.3, max: 2.5, step: 0.05 },
  { key: 'hatchJitter', label: 'Hatch looseness (px)', min: 0, max: 2, step: 0.05 },
  { key: 't1', label: 'Threshold 1 (one layer)', min: 0.3, max: 1, step: 0.01 },
  { key: 't2', label: 'Threshold 2 (two layers)', min: 0.1, max: 0.9, step: 0.01 },
  { key: 't3', label: 'Threshold 3 (three layers)', min: 0, max: 0.6, step: 0.01 },
  { key: 'lightRef', label: 'Light reference', min: 0.2, max: 1.2, step: 0.01 },
  { key: 'flatten', label: 'Flatten shading', min: 0, max: 1, step: 0.05 },
  { key: 'drawInSeconds', label: 'Draw-in time (s)', min: 0.8, max: 1.4, step: 0.05 },
];

/**
 * @param {object} o
 * @param {object} o.style      the live ink style
 * @param {(v: object) => void} o.setStyle
 * @param {(name: string) => void} o.usePreset
 * @param {string[]} o.presets
 * @param {() => void} o.replay
 */
export function createDebugPanel({ style, setStyle, usePreset, presets, replay }) {
  const panel = document.createElement('aside');
  panel.className = 'debug-panel';
  panel.setAttribute('aria-label', 'Ink debug panel');
  const inputs = new Map();

  const head = document.createElement('div');
  head.className = 'debug-row debug-presets';
  for (const name of presets) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = name;
    b.addEventListener('click', () => {
      usePreset(name);
      sync();
    });
    head.append(b);
  }
  const r = document.createElement('button');
  r.type = 'button';
  r.textContent = 'Replay draw-in';
  r.addEventListener('click', replay);
  head.append(r);
  panel.append(head);

  for (const s of SLIDERS) {
    const row = document.createElement('label');
    row.className = 'debug-row';
    const name = document.createElement('span');
    name.textContent = s.label;
    const minus = document.createElement('button');
    minus.type = 'button';
    minus.textContent = '−';
    minus.setAttribute('aria-label', `Decrease ${s.label}`);
    const input = document.createElement('input');
    input.type = 'range';
    Object.assign(input, { min: s.min, max: s.max, step: s.step });
    const plus = document.createElement('button');
    plus.type = 'button';
    plus.textContent = '+';
    plus.setAttribute('aria-label', `Increase ${s.label}`);
    const out = document.createElement('output');
    const set = (v) => {
      const clamped = Math.min(s.max, Math.max(s.min, v));
      setStyle({ [s.key]: Number(clamped.toFixed(3)) });
      sync();
    };
    input.addEventListener('input', () => set(Number(input.value)));
    minus.addEventListener('click', () => set(style[s.key] - s.step));
    plus.addEventListener('click', () => set(style[s.key] + s.step));
    row.append(name, minus, input, plus, out);
    panel.append(row);
    inputs.set(s.key, { input, out });
  }

  function sync() {
    for (const [key, { input, out }] of inputs) {
      input.value = style[key];
      out.textContent = String(style[key]);
    }
  }
  sync();
  document.body.append(panel);
  return { sync };
}
