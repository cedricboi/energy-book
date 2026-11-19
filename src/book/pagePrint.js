// src/book/pagePrint.js
// The page text, printed into the paper (TECHNIQUES.md C1). Each page has a
// canvas covering the whole sheet at about 6.4 px per mm. The text panel
// and the figure caption are printed onto it (book/printer.js), and the
// canvas becomes the paper's texture: the words take the window light, sit
// in the gutter's shade, and turn over with the leaf.
//
// The HTML stays where it was, laid over the page in perspective, but its
// printed parts are made invisible (class is-inked). It still carries the
// screen-reader text and the keyboard focus, and its live controls
// (buttons, sliders, tick boxes, text boxes, the feedback card) stay
// visible as real HTML so they can be pressed and typed in.
import { CanvasTexture, LinearMipmapLinearFilter, LinearFilter } from 'three';
import { BOOK } from '../objects/book.js';
import { AREAS, PRINT_W } from './layout.js';
import { printElement } from './printer.js';

const PX_PER_M = 6400;
const W = Math.round(BOOK.pageW * PX_PER_M);
const H = Math.round(BOOK.pageH * PX_PER_M);
/** Size of a page's print sheet in pixels (it covers the whole page). */
export const PRINT_SIZE = [W, H];

/**
 * Elements that stay live HTML and are left out of the print. A button
 * marked ink-row (a contents line) is printed, and its HTML only takes taps.
 */
export const LIVE = 'button:not(.ink-row), input, textarea, select, output, canvas, video, .q-feedback, .stamp-slot.is-pressing';
const isLive = (el) => el.matches?.(LIVE);
// A full print (for the turning leaf) draws the controls too, all but the
// stamp, which is pressed in at an angle.
const isUnprintable = (el) => el.matches?.('canvas, video');

function sheet() {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const texture = new CanvasTexture(canvas);
  texture.premultiplyAlpha = true;
  texture.generateMipmaps = true;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.anisotropy = 16;
  return { canvas, ctx, texture, blank: true };
}

/** Where a page area (book/layout.js AREAS) sits on its page's canvas. */
function placeOf(area, side) {
  const { pageW, pageH, gutter } = BOOK;
  // Canvas x runs from the fore-edge on a left page, from the spine on a right page.
  const x0 = side === 'left' ? area.x0 + gutter + pageW : area.x0 - gutter;
  const y0 = area.z0 + pageH / 2;
  return { x: x0 * PX_PER_M, y: y0 * PX_PER_M, scale: ((area.x1 - area.x0) * PX_PER_M) / PRINT_W };
}

/**
 * @param {object} o
 * @param {import('three').Object3D} o.scene  holds page-left and page-right
 * @param {import('three').Mesh} o.leaf       the turning leaf
 * @param {HTMLElement} o.panel               the text panel (left page)
 * @param {HTMLElement} o.figure              the figure caption (right page)
 * @param {HTMLElement} o.rightPanel          the right page's text (the contents list)
 * @param {() => void} o.onChange             request a frame
 */
export function createPagePrint({ scene, leaf, panel, figure, rightPanel, onChange }) {
  const roots = [panel, figure, rightPanel];
  const sheets = { left: sheet(), right: sheet(), leafFront: sheet(), leafBack: sheet() };
  const pages = { left: scene.getObjectByName('page-left'), right: scene.getObjectByName('page-right') };
  const uni = (mesh) => mesh.material.userData.print;
  // Pages: the left page's canvas runs from its fore-edge.
  uni(pages.left).uPrint.value = sheets.left.texture;
  uni(pages.left).uPrintFlip.value.set(1, 1);
  uni(pages.right).uPrint.value = sheets.right.texture;
  uni(pages.right).uPrintFlip.value.set(0, 0);
  // The leaf: its front is a right-hand page, its back a left-hand page.
  uni(leaf).uPrint.value = sheets.leafFront.texture;
  uni(leaf).uPrintBack.value = sheets.leafBack.texture;
  uni(leaf).uPrintFlip.value.set(0, 1);

  let enabled = false;
  let held = false; // during a turn the pages keep what they show
  let queued = 0;
  const dirty = new Set();

  function show(on) {
    for (const m of [pages.left, pages.right, leaf]) uni(m).uPrintOn.value = on ? 1 : 0;
  }

  /** Lay the element upright for a moment, as it really looks, and print it. */
  function printInto(target, el, area, side, full) {
    if (!el || el.hidden) return;
    const transform = el.style.transform;
    const inked = el.classList.contains('is-inked');
    el.style.transform = 'none';
    el.classList.remove('is-inked');
    // A printed part that is fading or sliding in is printed as it ends up
    // (its HTML is invisible, so finishing the motion costs nothing).
    for (const anim of el.getAnimations?.({ subtree: true }) ?? []) {
      const t = anim.effect?.target;
      if (!t || t === el || t.closest?.(LIVE)) continue;
      try {
        anim.finish();
      } catch {
        // An endless animation cannot finish: print it as it is.
      }
    }
    printElement(el, target.ctx, { ...placeOf(area, side), skip: full ? isUnprintable : isLive });
    el.style.transform = transform;
    if (inked) el.classList.add('is-inked');
  }

  function clear(target) {
    target.ctx.clearRect(0, 0, W, H);
    target.texture.needsUpdate = true;
    target.blank = true;
  }

  /**
   * Print a side's content onto a sheet (by default that side's own page).
   * full: draw the live controls too (for a page whose HTML is hidden, as
   * during a turn).
   */
  function print(side, target = sheets[side], { full = false } = {}) {
    observer.disconnect();
    clear(target);
    if (side === 'left') printInto(target, panel, AREAS.leftText, 'left', full);
    else {
      printInto(target, figure, AREAS.rightFigure, 'right', full);
      printInto(target, rightPanel, AREAS.rightText, 'right', full);
    }
    target.blank = false;
    target.texture.needsUpdate = true;
    watch();
  }

  /** Lay an image the size of a sheet over what is printed on it (the folded drawing). */
  function overlay(target, image) {
    target.ctx.drawImage(image, 0, 0);
    target.texture.needsUpdate = true;
    target.blank = false;
  }

  function copy(from, to) {
    to.ctx.clearRect(0, 0, W, H);
    to.ctx.drawImage(from.canvas, 0, 0);
    to.texture.needsUpdate = true;
    to.blank = from.blank;
  }

  // Reprint when the page changes: new text, a step revealed, feedback
  // shown, classes changed, fonts or images arriving.
  /** Reprint on the next frame: one side, or both. */
  function schedule(side) {
    if (side === 'left' || side === 'right') dirty.add(side);
    else dirty.add('left').add('right');
    if (!enabled || held || queued) return;
    queued = requestAnimationFrame(() => {
      queued = 0;
      if (!enabled || held) return;
      for (const s of dirty) print(s);
      dirty.clear();
      onChange?.();
    });
  }
  const sideOf = (node) => (panel.contains(node) ? 'left' : 'right');
  const observer = new MutationObserver((records) => {
    for (const r of records) {
      const t = r.target.nodeType === 1 ? r.target : r.target.parentElement;
      // The panel's own position changes every frame: not a change of content.
      if (r.type === 'attributes' && roots.includes(t) && r.attributeName === 'style') continue;
      // Changes inside a live control do not move the printed text.
      if (r.type !== 'childList' && t?.closest?.(LIVE)) continue;
      if (t) schedule(sideOf(t));
    }
  });
  function watch() {
    if (!enabled) return;
    for (const el of roots) {
      observer.observe(el, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class', 'hidden', 'style', 'open', 'src'] });
    }
  }
  for (const el of roots) {
    for (const ev of ['transitionend', 'animationend', 'load']) {
      el.addEventListener(ev, (e) => {
        if (!e.target.closest?.(LIVE)) schedule(sideOf(e.target));
      }, true);
    }
  }
  document.fonts?.addEventListener?.('loadingdone', () => schedule());
  document.fonts?.ready.then(() => schedule());

  return {
    sheets,
    get enabled() {
      return enabled;
    },
    /** Printing is on in the landscape book; off for the contents and the stacked layout. */
    setEnabled(on) {
      if (on === enabled) return;
      enabled = on;
      for (const el of roots) el.classList.toggle('is-inked', on);
      show(on);
      if (on) {
        watch();
        schedule();
      } else {
        observer.disconnect();
        Object.values(sheets).forEach(clear);
      }
      onChange?.();
    },
    /** While held (a page turn), the pages keep what they show. */
    hold(on) {
      held = on;
      if (!on) schedule();
    },
    print,
    copy,
    clear,
    overlay,
  };
}
