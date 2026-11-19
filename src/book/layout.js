// src/book/layout.js
// Where things go on screen (CLAUDE.md section 6, rule 16: every page fits one
// screen, no scrolling inside a page).
//   Landscape: the left page holds the text, the question and the controls
//   (an HTML panel fitted inside the projected left page). The right page
//   holds the 3D diagram, with the ledger bar along its front edge.
//   Portrait: the right page is framed at the top. The text and controls sit
//   in an HTML panel below it.
import { Vector3 } from 'three';
import { BOOK, pageSurfaceY } from '../objects/book.js';
import { isStacked } from '../core/stage.js';

export const HUD_HEIGHT = 56; // px, the bottom bar
export const PORTRAIT_PANEL = 0.44; // fraction of the height for the text panel

/** Fraction of the screen height the stage must keep clear at the bottom. */
export function reserveFor(width, height) {
  return isStacked(width / height) ? PORTRAIT_PANEL : HUD_HEIGHT / height;
}

const v = new Vector3();
function project(camera, x, z, rect) {
  v.set(x, pageSurfaceY(x, z), z).project(camera);
  return { x: (v.x * 0.5 + 0.5) * rect.width, y: (-v.y * 0.5 + 0.5) * rect.height };
}

/**
 * The largest upright rectangle inside a projected page area.
 * Page coordinates: x across (metres), z from head (-) to foot (+).
 */
export function pageRect(camera, rect, { x0, x1, z0, z1 }, pad = 10) {
  const tl = project(camera, x0, z0, rect);
  const tr = project(camera, x1, z0, rect);
  const bl = project(camera, x0, z1, rect);
  const br = project(camera, x1, z1, rect);
  const left = Math.max(tl.x, bl.x) + pad;
  const right = Math.min(tr.x, br.x) - pad;
  const top = Math.max(tl.y, tr.y) + pad;
  const bottom = Math.min(bl.y, br.y) - pad;
  return { x: left, y: top, w: Math.max(0, right - left), h: Math.max(0, bottom - top) };
}

const H = BOOK.pageH / 2;
const W = BOOK.pageW;
const G = BOOK.gutter;

/** Areas of the two pages, in page coordinates. */
export const AREAS = {
  leftText: { x0: -(G + W) + 0.018, x1: -G - 0.014, z0: -H + 0.016, z1: H - 0.014 },
  rightLedger: { x0: G + 0.016, x1: G + W - 0.016, z0: H - 0.052, z1: H - 0.01 },
  spread: { x0: -(G + W) + 0.012, x1: G + W - 0.012, z0: -H + 0.012, z1: H - 0.01 },
};

/** Projected corners of a page area: top-left, top-right, bottom-right, bottom-left. */
export function pageQuad(camera, rect, { x0, x1, z0, z1 }) {
  return [project(camera, x0, z0, rect), project(camera, x1, z0, rect), project(camera, x1, z1, rect), project(camera, x0, z1, rect)].map((p) => ({ ...p }));
}

// The text page is laid out at a fixed size, like a printed page, then
// mapped onto the page in perspective. Width in CSS px; the height keeps the
// page's shape. Text fits the same way on every screen.
export const PRINT_W = 430;
export const printHeight = (area) => Math.round((PRINT_W * (area.z1 - area.z0)) / (area.x1 - area.x0));

// 3x3 helpers for the four-point (projective) transform.
const adj = (m) => [
  m[4] * m[8] - m[5] * m[7], m[2] * m[7] - m[1] * m[8], m[1] * m[5] - m[2] * m[4],
  m[5] * m[6] - m[3] * m[8], m[0] * m[8] - m[2] * m[6], m[2] * m[3] - m[0] * m[5],
  m[3] * m[7] - m[4] * m[6], m[1] * m[6] - m[0] * m[7], m[0] * m[4] - m[1] * m[3],
];
const mul = (a, b) => {
  const c = new Array(9).fill(0);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) c[3 * i + j] += a[3 * i + k] * b[3 * k + j];
  return c;
};
const mulv = (m, v) => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
function basis(p) {
  const m = [p[0].x, p[1].x, p[2].x, p[0].y, p[1].y, p[2].y, 1, 1, 1];
  const v = mulv(adj(m), [p[3].x, p[3].y, 1]);
  return mul(m, [v[0], 0, 0, 0, v[1], 0, 0, 0, v[2]]);
}

/**
 * CSS matrix3d that maps a w x h box (transform-origin at its top-left) onto
 * a quad of screen points [top-left, top-right, bottom-right, bottom-left].
 */
export function quadMatrix(w, h, quad) {
  const src = basis([{ x: 0, y: 0 }, { x: w, y: 0 }, { x: 0, y: h }, { x: w, y: h }]);
  const dst = basis([quad[0], quad[1], quad[3], quad[2]]);
  const t = mul(dst, adj(src)).map((x, _, a) => x / a[8]);
  return `matrix3d(${[t[0], t[3], 0, t[6], t[1], t[4], 0, t[7], 0, 0, 1, 0, t[2], t[5], 0, t[8]].map((x) => +x.toFixed(9)).join(',')})`;
}

/**
 * @returns {{ portrait: boolean, text: object, ledger: object, textQuad?: object[], ledgerQuad?: object[] }} rectangles in CSS px
 */
export function computeLayout(camera, rect, { wide = false } = {}) {
  const portrait = isStacked(rect.width / rect.height);
  if (wide) {
    // A page with no diagram (the contents) uses the whole spread.
    return {
      portrait,
      text: portrait
        ? { x: 12, y: 12, w: rect.width - 24, h: rect.height - HUD_HEIGHT - 24 }
        : pageRect(camera, rect, AREAS.spread, 18),
      ledger: { x: 0, y: 0, w: 0, h: 0 },
    };
  }
  if (portrait) {
    const top = rect.height * (1 - PORTRAIT_PANEL);
    return {
      portrait,
      text: { x: 12, y: top + 8, w: rect.width - 24, h: rect.height - top - HUD_HEIGHT - 16 },
      ledger: pageRect(camera, rect, AREAS.rightLedger, 4),
    };
  }
  return {
    portrait,
    text: pageRect(camera, rect, AREAS.leftText, 8),
    ledger: pageRect(camera, rect, AREAS.rightLedger, 4),
    // Landscape prints the text and the ledger onto the pages in perspective.
    textQuad: pageQuad(camera, rect, AREAS.leftText),
    ledgerQuad: pageQuad(camera, rect, AREAS.rightLedger),
  };
}

export function placeBox(el, r) {
  el.style.left = `${Math.round(r.x)}px`;
  el.style.top = `${Math.round(r.y)}px`;
  el.style.width = `${Math.round(r.w)}px`;
  el.style.height = `${Math.round(r.h)}px`;
}
