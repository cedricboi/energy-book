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

export const HUD_HEIGHT = 56; // px, the bottom bar
export const PORTRAIT_PANEL = 0.44; // fraction of the height for the text panel

/** Fraction of the screen height the stage must keep clear at the bottom. */
export function reserveFor(width, height) {
  return width < height ? PORTRAIT_PANEL : HUD_HEIGHT / height;
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
  leftText: { x0: -(G + W) + 0.01, x1: -G - 0.008, z0: -H + 0.006, z1: H - 0.004 },
  rightLedger: { x0: G + 0.012, x1: G + W - 0.01, z0: H - 0.05, z1: H - 0.006 },
  spread: { x0: -(G + W) + 0.012, x1: G + W - 0.012, z0: -H + 0.012, z1: H - 0.01 },
};

/**
 * @returns {{ portrait: boolean, text: object, ledger: object }} rectangles in CSS px
 */
export function computeLayout(camera, rect, { wide = false } = {}) {
  const portrait = rect.width < rect.height;
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
  };
}

export function placeBox(el, r) {
  el.style.left = `${Math.round(r.x)}px`;
  el.style.top = `${Math.round(r.y)}px`;
  el.style.width = `${Math.round(r.w)}px`;
  el.style.height = `${Math.round(r.h)}px`;
}
