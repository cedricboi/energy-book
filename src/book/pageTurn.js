// src/book/pageTurn.js
// A page turn with a real bend: a leaf lifts from one page, wraps around the
// spine and lands on the other. Each vertex turns by an angle that lags with
// its distance from the spine, so the leaf curls like paper rather than
// swinging as a flat board. The vertex positions are computed on the CPU
// (about 1600 vertices), which is cheap and keeps the leaf's paper shader
// identical to the pages.
import { Mesh, PlaneGeometry, DoubleSide } from 'three';
import { BOOK, pageSurfaceY } from '../objects/book.js';
import { createPaperMaterial } from '../ink/paper.js';

const DURATION = 0.9;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export function createPageTurn(scene, { reducedMotion = false } = {}) {
  const { pageW, pageH, gutter } = BOOK;
  const nx = 64;
  const nz = 12;
  const geo = new PlaneGeometry(pageW, pageH, nx, nz);
  geo.rotateX(-Math.PI / 2);
  const base = geo.attributes.position.array.slice(); // flat, x in [-W/2, W/2]
  const mat = createPaperMaterial({ width: pageW, height: pageH, spineU: 0, seed: 3 });
  mat.side = DoubleSide;
  const leaf = new Mesh(geo, mat);
  leaf.visible = false;
  leaf.castShadow = true;
  leaf.receiveShadow = true;
  leaf.name = 'page-leaf';
  scene.add(leaf);

  let t = 1;
  let dir = 1; // 1: right to left (next page), -1: left to right (previous)
  let resolve = null;

  function pose(p) {
    const pos = geo.attributes.position;
    const lag = 0.35;
    const lift = pageSurfaceY(gutter + 0.02, 0);
    for (let i = 0; i < pos.count; i++) {
      const u = (base[i * 3] + pageW / 2) / pageW; // 0 at the spine, 1 at the edge
      const z = base[i * 3 + 2];
      const local = Math.min(1, Math.max(0, (p * (1 + lag) - lag * u)));
      const a = Math.PI * ease(local);
      const r = gutter + u * pageW;
      // Angle 0 lies on the right page, angle pi on the left page.
      const ang = dir > 0 ? a : Math.PI - a;
      const bow = Math.sin(ang) * 0.02 * u; // a little extra lift mid-turn
      pos.setXYZ(i, r * Math.cos(ang), lift + r * Math.sin(ang) * 0.92 + bow, z);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  }

  return {
    get turning() {
      return t < 1;
    },
    /** Turn a page. Resolves when the leaf lands. */
    turn(direction = 1) {
      if (reducedMotion) return Promise.resolve();
      dir = direction;
      t = 0;
      leaf.visible = true;
      pose(0);
      return new Promise((res) => {
        resolve = res;
      });
    },
    update(dt) {
      if (t >= 1) return false;
      t = Math.min(1, t + dt / DURATION);
      pose(t);
      if (t >= 1) {
        leaf.visible = false;
        resolve?.();
        resolve = null;
      }
      return true;
    },
    /** For screenshots: hold the leaf part way through a turn. */
    hold(p, direction = 1) {
      dir = direction;
      leaf.visible = p > 0 && p < 1;
      pose(p);
    },
  };
}
