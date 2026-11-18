// src/energy/ledgerBar.js
// The ledger: a stacked bar showing every store in the scene, plus energy in
// transit, with a line marking the total (CLAUDE.md section 4). The total line
// never moves unless energy enters or leaves the system on purpose
// (setTotal). Drawn as SVG in the HTML overlay, so it stays sharp and each
// segment carries its store's pattern as well as its colour.
import { STORES, iconSvg } from './palette.js';
import { formatQuantity } from '../physics/format.js';

const PATTERN_SVG = {
  chevrons: '<path d="M0 2 L3 5 L0 8 M4 2 L7 5 L4 8" stroke="#1E1B24" stroke-width="1" fill="none" opacity="0.45"/>',
  bands: '<path d="M0 3 H8 M0 7 H8" stroke="#1E1B24" stroke-width="1.2" opacity="0.45"/>',
  zigzag: '<path d="M0 6 L2 3 L4 6 L6 3 L8 6" stroke="#1E1B24" stroke-width="1" fill="none" opacity="0.45"/>',
  dots: '<circle cx="2" cy="2" r="1" fill="#1E1B24" opacity="0.45"/><circle cx="6" cy="6" r="1" fill="#1E1B24" opacity="0.45"/>',
  waves: '<path d="M0 4 Q2 2 4 4 T8 4" stroke="#1E1B24" stroke-width="1" fill="none" opacity="0.45"/>',
  rings: '<circle cx="4" cy="4" r="2.6" stroke="#1E1B24" stroke-width="1" fill="none" opacity="0.45"/>',
};

let uid = 0;

/**
 * @param {HTMLElement} parent
 * @param {object} o
 * @param {string[]} o.stores  store ids in display order
 * @param {number} o.total     the starting total in joules
 * @param {string} [o.caption]
 */
export function createLedgerBar(parent, { stores, total, caption = 'Energy ledger' }) {
  const id = `lb${uid++}`;
  const el = document.createElement('figure');
  el.className = 'ledger-bar';
  el.setAttribute('role', 'img');
  const defs = stores.map((s) => `<pattern id="${id}-${s}" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="${STORES[s].hex}"/>${PATTERN_SVG[STORES[s].pattern]}</pattern>`).join('')
    + `<pattern id="${id}-transit" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#F4EEDF"/><path d="M0 0V6" stroke="#1E1B24" stroke-width="1.5" opacity="0.5"/></pattern>`;
  el.innerHTML = `
    <figcaption class="ledger-caption">${caption}</figcaption>
    <svg class="ledger-svg" viewBox="0 0 400 34" preserveAspectRatio="none" aria-hidden="true">
      <defs>${defs}</defs>
      <rect class="ledger-track" x="0" y="4" width="400" height="22" rx="3"/>
      <g class="ledger-segs"></g>
      <line class="ledger-total" x1="0" x2="0" y1="0" y2="30"/>
    </svg>
    <ul class="ledger-key"></ul>`;
  parent.append(el);
  const segs = el.querySelector('.ledger-segs');
  const totalLine = el.querySelector('.ledger-total');
  const key = el.querySelector('.ledger-key');
  key.innerHTML = stores.map((s) => `<li data-store="${s}">${iconSvg(s, 16)}<span class="k-name">${STORES[s].short}</span> <span class="k-val"></span></li>`).join('')
    + '<li data-store="transit"><span class="k-swatch"></span><span class="k-name">being transferred</span> <span class="k-val"></span></li>';

  let state = { total };
  const fullWidth = () => state.total * 1.12;

  function update(values, inTransit = 0) {
    // A total of zero (no work done) draws an empty bar, not a broken one.
    const W = fullWidth() > 0 ? 400 / fullWidth() : 0;
    let x = 0;
    let html = '';
    for (const s of stores) {
      const w = Math.max(0, values[s] ?? 0) * W;
      if (w > 0.05) html += `<rect x="${x}" y="4" width="${w}" height="22" fill="url(#${id}-${s})"/>`;
      x += w;
    }
    const wt = Math.max(0, inTransit) * W;
    if (wt > 0.05) html += `<rect x="${x}" y="4" width="${wt}" height="22" fill="url(#${id}-transit)"/>`;
    segs.innerHTML = html;
    const tx = state.total * W;
    totalLine.setAttribute('x1', tx);
    totalLine.setAttribute('x2', tx);
    for (const s of stores) key.querySelector(`[data-store="${s}"] .k-val`).textContent = formatQuantity(values[s] ?? 0, 'J', 2);
    key.querySelector('[data-store="transit"] .k-val').textContent = formatQuantity(inTransit, 'J', 2);
    const sum = stores.reduce((a, s) => a + (values[s] ?? 0), 0) + inTransit;
    el.setAttribute('aria-label', `${caption}. Total ${formatQuantity(state.total, 'J')}. ${stores.map((s) => `${STORES[s].name} ${formatQuantity(values[s] ?? 0, 'J', 2)}`).join(', ')}.`);
    return sum;
  }

  return {
    el,
    update,
    /** Only for energy deliberately entering or leaving the system. */
    setTotal(joules) {
      state = { total: joules };
    },
    get total() {
      return state.total;
    },
    destroy() {
      el.remove();
    },
  };
}
