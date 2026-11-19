// src/scenes/stand.js
// The store stand: a low shelf the jars stand on, with a backboard behind
// them and a paper card pinned above each jar. The jars belong to the
// drawing, and each store's name (and joules) is printed on its card, not
// floating over the scene. Shared by every lesson through energyKit.
import { BoxGeometry, Vector3 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createInkObject } from '../ink/inkObject.js';
import { pageSurfaceY } from '../objects/book.js';
import { BEAKER } from '../objects/beaker.js';

/**
 * @param {object} ctx       scene context (ctx.scene is the scene group)
 * @param {object} o
 * @param {number[]} o.xs    x of each jar (page metres)
 * @param {number} o.z       z of the jar row
 * @param {number} o.jarSize drawing scale of the jars
 * @returns {{ objects, shelf: number, cardQuad: (i: number) => () => Vector3[] }}
 */
export function createStand(ctx, { xs, z, jarSize }) {
  const n = xs.length;
  const spacing = n > 1 ? Math.min(...xs.slice(1).map((x, i) => x - xs[i])) : 0.06;
  const jarR = BEAKER.R * jarSize;
  const jarH = BEAKER.H * jarSize;
  const shelf = 0.008;
  const cardW = Math.min(0.048, Math.max(0.026, spacing * 0.92));
  const cardH = cardW * 0.5;
  const pad = jarR + 0.01;
  const width = xs[n - 1] - xs[0] + 2 * pad;
  const cx = (xs[0] + xs[n - 1]) / 2;
  const depth = 2 * jarR + 0.012;
  const board = shelf + jarH + cardH + 0.008;
  const boardT = 0.003;
  const y0 = pageSurfaceY(cx, z);
  const geo = mergeGeometries([
    new BoxGeometry(width, shelf, depth).translate(0, shelf / 2, 0),
    new BoxGeometry(width, board, boardT).translate(0, board / 2, -depth / 2 + boardT / 2),
  ].map((g) => {
    const t = g.toNonIndexed();
    t.deleteAttribute('uv');
    return t;
  }));
  const stand = createInkObject(geo, { color: '#E2D2B6', name: 'store-stand', maxLayers: 1 });
  stand.group.position.set(cx, y0, z);
  ctx.scene.add(stand.group);

  const cardZ = z - depth / 2 + boardT + 0.0006;
  const cardTop = board - 0.003;
  const cards = xs.map((x, i) => {
    const c = createInkObject(new BoxGeometry(cardW, cardH, 0.0006).translate(0, -cardH / 2, 0), { color: '#FBF7EE', name: `card-${i}`, maxLayers: 1 });
    c.group.position.set(x, y0 + cardTop, cardZ);
    ctx.scene.add(c.group);
    return c;
  });
  const inset = Math.min(0.0012, cardW * 0.03);
  const cardQuad = (i) => () => {
    const x = xs[i];
    const ya = y0 + cardTop - inset;
    const yb = ya - cardH + 2 * inset;
    const zz = cardZ + 0.0004;
    const v = (px, py) => ctx.scene.localToWorld(new Vector3(px, py, zz));
    return [v(x - cardW / 2 + inset, ya), v(x + cardW / 2 - inset, ya), v(x + cardW / 2 - inset, yb), v(x - cardW / 2 + inset, yb)];
  };
  return { objects: [stand, ...cards], shelf, cardQuad, cardAspect: cardW / cardH };
}
