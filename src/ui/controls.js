// src/ui/controls.js
// Live controls for explore pages. Every slider has − and + buttons so
// students can reach exact values (CLAUDE.md section 6, rule 13). The
// instruction sits inside the box students work in (rule 15).
import { formatQuantity } from '../physics/format.js';

let uid = 0;

/**
 * @param {HTMLElement} parent
 * @param {object} p   { label, min, max, step, value, unit, sigFigs }
 * @param {(v: number) => void} onChange
 */
export function createSlider(parent, p, onChange) {
  const id = `ctl-${uid++}`;
  const row = document.createElement('div');
  row.className = 'ctl ctl-slider';
  row.innerHTML = `
    <label for="${id}" class="ctl-label">${p.label}</label>
    <div class="ctl-line">
      <button type="button" class="ctl-step" aria-label="Decrease ${p.label}">−</button>
      <input id="${id}" type="range" min="${p.min}" max="${p.max}" step="${p.step}" value="${p.value}">
      <button type="button" class="ctl-step" aria-label="Increase ${p.label}">+</button>
      <output for="${id}" class="ctl-value"></output>
    </div>`;
  parent.append(row);
  const input = row.querySelector('input');
  const out = row.querySelector('output');
  const [minus, plus] = row.querySelectorAll('.ctl-step');
  const decimals = Math.max(0, -Math.floor(Math.log10(p.step) + 1e-9));
  const show = (v) => {
    out.textContent = p.unit ? formatQuantity(v, p.unit, p.sigFigs ?? 3) : String(v);
    input.setAttribute('aria-valuetext', out.textContent);
  };
  const set = (v) => {
    const clamped = Math.min(p.max, Math.max(p.min, Number(Number(v).toFixed(decimals))));
    input.value = clamped;
    show(clamped);
    onChange(clamped);
  };
  input.addEventListener('input', () => set(input.value));
  minus.addEventListener('click', () => set(Number(input.value) - p.step));
  plus.addEventListener('click', () => set(Number(input.value) + p.step));
  show(p.value);
  return {
    el: row,
    set,
    /** Show a value set elsewhere (by dragging in the scene), without reporting it back. */
    update(v) {
      input.value = v;
      show(v);
    },
    get value() {
      return Number(input.value);
    },
    disable(on) {
      [input, minus, plus].forEach((e) => {
        e.disabled = on;
      });
    },
  };
}

/** An on/off switch (a real checkbox, so it works with keyboard and screen readers). */
export function createSwitch(parent, p, onChange) {
  const id = `ctl-${uid++}`;
  const row = document.createElement('div');
  row.className = 'ctl ctl-switch';
  row.innerHTML = `<input id="${id}" type="checkbox" role="switch" ${p.value ? 'checked' : ''}><label for="${id}">${p.label}</label>`;
  parent.append(row);
  const input = row.querySelector('input');
  input.addEventListener('change', () => onChange(input.checked));
  return {
    el: row,
    update(v) {
      input.checked = !!v;
    },
    set(v) {
      input.checked = v;
      onChange(v);
    },
    get value() {
      return input.checked;
    },
    disable(on) {
      input.disabled = on;
    },
  };
}

/** A choice between a few options (for example which ball). */
export function createChoice(parent, p, onChange) {
  const id = `ctl-${uid++}`;
  const row = document.createElement('fieldset');
  row.className = 'ctl ctl-choice';
  row.innerHTML = `<legend>${p.label}</legend>${p.options.map((o) => `<label><input type="radio" name="${id}" value="${o.id}" ${o.id === p.value ? 'checked' : ''}> ${o.label}</label>`).join('')}`;
  parent.append(row);
  row.addEventListener('change', (e) => onChange(e.target.value));
  return {
    el: row,
    update(v) {
      const r = row.querySelector(`input[value="${v}"]`);
      if (r) r.checked = true;
    },
    set(v) {
      const r = row.querySelector(`input[value="${v}"]`);
      if (r) r.checked = true;
      onChange(v);
    },
    disable(on) {
      row.querySelectorAll('input').forEach((i) => {
        i.disabled = on;
      });
    },
  };
}

/** A button for a scene action (run, reset, pause at the bottom). */
export function createActionButton(parent, { label, primary = false }, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `ctl-action${primary ? ' primary' : ''}`;
  b.textContent = label;
  b.addEventListener('click', onClick);
  parent.append(b);
  return b;
}
