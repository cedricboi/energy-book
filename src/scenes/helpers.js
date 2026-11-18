// src/scenes/helpers.js
// Small pieces several lesson scenes share: rulers drawn to scale, arrows,
// a simple ink person and quick primitive objects.
import { Vector3, BoxGeometry, CylinderGeometry, SphereGeometry, CapsuleGeometry, LatheGeometry, Vector2 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createInkLines, polylineToSegments } from '../ink/creases.js';
import { createInkObject } from '../ink/inkObject.js';
import { formatQuantity } from '../physics/format.js';

/**
 * A ruler drawn to scale: a line from a to b (world points) with ticks.
 * @param {(m: number) => Vector3} at  world point for a reading in metres
 */
export function addRuler(ctx, { at, length, tick, labelEvery, tickDir = new Vector3(0.006, 0, 0), id = 'ruler', prefer = 'left' }) {
  const segs = polylineToSegments([at(0), at(length)]);
  for (let m = 0; m <= length + 1e-9; m += tick) {
    const major = Math.abs(m / labelEvery - Math.round(m / labelEvery)) < 1e-6;
    const p = at(m);
    segs.push(...polylineToSegments([p, p.clone().addScaledVector(tickDir, major ? 1 : 0.55)]));
  }
  const lines = createInkLines(segs, { widthScale: 0.7, chain: false });
  ctx.scene.add(lines);
  for (let m = labelEvery; m <= length + 1e-9; m += labelEvery) {
    const reading = Math.round(m * 1000) / 1000;
    ctx.overlay.add({ id: `${id}-${reading}`, anchor: () => at(reading), html: formatQuantity(reading, 'm'), gap: 3, prefer });
  }
  return lines;
}

/** A straight ink arrow from a to b, with a head at b. */
export function arrowSegments(a, b, head = 0.006) {
  const dir = b.clone().sub(a).normalize();
  const side = new Vector3(-dir.z, 0, dir.x);
  if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
  const up = new Vector3().crossVectors(dir, side).normalize();
  const back = b.clone().addScaledVector(dir, -head);
  return [
    ...polylineToSegments([a, b]),
    ...polylineToSegments([b, back.clone().addScaledVector(up, head * 0.6)]),
    ...polylineToSegments([b, back.clone().addScaledVector(up, -head * 0.6)]),
  ];
}

/** A simple standing person, 1.6 m tall, facing +x. Origin at the feet. */
export function createPerson({ name = 'person', carrying = false } = {}) {
  const p = [];
  const add = (g) => p.push(g.toNonIndexed());
  add(new CapsuleGeometry(0.07, 0.7, 4, 10).translate(-0.08, 0.42, 0));
  add(new CapsuleGeometry(0.07, 0.7, 4, 10).translate(0.08, 0.42, 0));
  add(new CapsuleGeometry(0.16, 0.45, 4, 12).translate(0, 1.07, 0));
  add(new SphereGeometry(0.12, 16, 12).translate(0, 1.48, 0));
  if (carrying) {
    add(new CapsuleGeometry(0.045, 0.45, 4, 8).rotateZ(-1.2).translate(0.25, 1.1, 0.12));
    add(new CapsuleGeometry(0.045, 0.45, 4, 8).rotateZ(-1.2).translate(0.25, 1.1, -0.12));
    add(new BoxGeometry(0.32, 0.3, 0.3).translate(0.5, 1.08, 0)); // the bag
  } else {
    add(new CapsuleGeometry(0.045, 0.55, 4, 8).rotateZ(-1.4).translate(0.32, 1.12, 0.1));
    add(new CapsuleGeometry(0.045, 0.55, 4, 8).rotateZ(-1.4).translate(0.32, 1.12, -0.1));
  }
  return createInkObject(mergeGeometries(p), { color: '#EFE6D3', creaseDeg: 45, name });
}

/** A cup (for hot kopi): a lathe with a handle. Origin at the base. */
export function cupGeometry() {
  const pts = [[0, 0], [0.032, 0], [0.036, 0.004], [0.042, 0.09], [0.039, 0.09], [0.033, 0.006], [0, 0.006]].map(([r, y]) => new Vector2(r, y));
  const cup = new LatheGeometry(pts, 40).toNonIndexed();
  cup.deleteAttribute('uv');
  const handle = new CylinderGeometry(0.006, 0.006, 0.05, 8).rotateZ(0.2).translate(0.05, 0.05, 0).toNonIndexed();
  handle.deleteAttribute('uv');
  const g = mergeGeometries([cup, handle]);
  g.computeVertexNormals();
  return g;
}

/** A toy car: body, cabin and four wheels. Origin under the middle. */
export function carGeometry(len = 0.1) {
  const s = len / 0.1;
  const parts = [
    new BoxGeometry(0.1, 0.022, 0.045).translate(0, 0.022, 0),
    new BoxGeometry(0.05, 0.018, 0.04).translate(-0.006, 0.042, 0),
  ];
  for (const x of [-0.032, 0.032]) for (const z of [-0.024, 0.024]) parts.push(new CylinderGeometry(0.011, 0.011, 0.008, 14).rotateX(Math.PI / 2).translate(x, 0.011, z));
  const g = mergeGeometries(parts.map((p) => { const q = p.toNonIndexed(); q.deleteAttribute('uv'); return q; }));
  g.scale(s, s, s);
  g.computeVertexNormals();
  return g;
}

/** A cylinder battery. Origin at the base. */
export function batteryGeometry() {
  const parts = [new CylinderGeometry(0.012, 0.012, 0.05, 24).translate(0, 0.025, 0), new CylinderGeometry(0.004, 0.004, 0.004, 12).translate(0, 0.052, 0)];
  const g = mergeGeometries(parts.map((p) => { const q = p.toNonIndexed(); q.deleteAttribute('uv'); return q; }));
  g.rotateZ(Math.PI / 2);
  g.translate(0, 0.012, 0);
  g.computeVertexNormals();
  return g;
}
