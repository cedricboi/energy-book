// src/scenes/helpers.js
// Small pieces several lesson scenes share: rulers drawn to scale, arrows,
// a simple ink person and quick primitive objects.
import { Vector3, BoxGeometry, CylinderGeometry, SphereGeometry, CapsuleGeometry, LatheGeometry, Vector2, Box3, Sphere } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createInkLines, polylineToSegments } from '../ink/creases.js';
import { createInkObject } from '../ink/inkObject.js';
import { formatQuantity } from '../physics/format.js';
import { createFigure } from '../objects/figure.js';

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
  // The numbers are printed beside the ticks, in the drawing (not floating).
  // A vertical ruler reads across, with its numbers to the left. A ruler
  // lying along the page reads along its length, numbers on the far side.
  const rd = at(length).sub(at(0)).normalize();
  const tn = tickDir.clone().normalize();
  const vertical = Math.abs(rd.y) > 0.7;
  const u = vertical ? tn.clone() : rd.clone(); // the direction the text runs
  const v = vertical ? rd.clone() : tn.clone().negate(); // up the text
  const h = 0.0075;
  const w = h * 3.2;
  for (let m = labelEvery; m <= length + 1e-9; m += labelEvery) {
    const reading = Math.round(m * 1000) / 1000;
    const c = vertical
      ? at(reading).addScaledVector(u, -(w / 2 + 0.0015))
      : at(reading).addScaledVector(tn, -(h / 2 + 0.0012));
    const corner = (a, b) => ctx.scene.localToWorld(c.clone().addScaledVector(u, a * w / 2).addScaledVector(v, b * h / 2));
    ctx.overlay.addPrinted({
      id: `${id}-${reading}`,
      className: `ruler-mark${vertical ? ' is-vertical' : ''}`,
      size: [128, 40],
      html: formatQuantity(reading, 'm'),
      quad: () => [corner(-1, 1), corner(1, 1), corner(1, -1), corner(-1, -1)],
    });
  }
  void prefer;
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

/** A person, about 1.7 m tall, facing +x. Origin at the feet. Pushing, or carrying a bag. */
export function createPerson({ name = 'person', carrying = false } = {}) {
  return createFigure({ pose: carrying ? 'carry' : 'push', name });
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

// ---------- Shots for the guided steps (book/beats.js) ----------
// A shot is a function returning { target, dist, elevationDeg?, azimuthDeg? }
// in world space, so it can follow an object that moves.
const shotBox = new Box3();
const shotSphere = new Sphere();

/** Frame one or more objects (Object3D, or a function returning them). The distance fits their size. */
export function shotOf(objects, { fill = 2.6, minDist = 0.06, elevationDeg = 26, azimuthDeg = 0, lift = 0 } = {}) {
  return () => {
    const list = [].concat(typeof objects === 'function' ? objects() : objects).filter(Boolean);
    shotBox.makeEmpty();
    for (const o of list) {
      // Skip the invisible touch targets, so they do not widen the frame.
      o.updateMatrixWorld(true);
      o.traverseVisible((c) => {
        if (c.isMesh && c.name !== 'grab-target' && c.geometry) {
          c.geometry.computeBoundingBox?.();
          if (c.geometry.boundingBox) shotBox.union(c.geometry.boundingBox.clone().applyMatrix4(c.matrixWorld));
        }
      });
    }
    if (shotBox.isEmpty()) return null;
    shotBox.getBoundingSphere(shotSphere);
    const target = shotSphere.center.clone();
    target.y += lift;
    return { target, dist: Math.max(minDist, shotSphere.radius * fill), elevationDeg, azimuthDeg };
  };
}

/** Frame the energy jars of a kit (all of them, or the named stores). */
export function shotOfJars(kit, stores, opts = {}) {
  return shotOf(() => (stores ?? Object.keys(kit.jars)).map((s) => kit.jars[s]?.group), { fill: 2.2, elevationDeg: 22, ...opts });
}

/**
 * A short note printed in the drawing (a reading, a scale note), mapped onto
 * the scene in perspective rather than floating over it. By default it lies
 * flat on the page (text along x, its top away from the reader).
 * @param {object} ctx
 * @param {object} o
 * @param {string} o.id
 * @param {() => Vector3} o.centre  centre of the note, in scene coordinates
 * @param {Vector3} [o.u]  the direction the text runs
 * @param {Vector3} [o.v]  up the text
 * @param {number} [o.width]   metres
 * @param {number} [o.height]  metres
 */
export function addNote(ctx, { id, centre, u = new Vector3(1, 0, 0), v = new Vector3(0, 0, -1), width = 0.034, height = 0.008, className = '' }) {
  const lift = new Vector3(0, 0.0004, 0);
  const corner = (a, b) => ctx.scene.localToWorld(centre().add(lift).addScaledVector(u, a * width / 2).addScaledVector(v, b * height / 2));
  return ctx.overlay.addPrinted({
    id,
    className: `scene-note ${className}`,
    size: [Math.round((220 * width) / height / 4.25), 52],
    html: '',
    quad: () => [corner(-1, 1), corner(1, 1), corner(1, -1), corner(-1, -1)],
  });
}
