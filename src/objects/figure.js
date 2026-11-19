// src/objects/figure.js
// Ink people, built from a simple skeleton at real size (about 1.7 m tall).
// Each limb is a capsule between two joints, so a pose is just a list of
// joint positions. Poses: stand, push, carry, skate.
// Local origin: between the feet, on the ground. The figure faces +x.
import { Vector3, Vector2, Quaternion, LatheGeometry, SphereGeometry, BoxGeometry, CylinderGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createInkObject } from '../ink/inkObject.js';

const UP = new Vector3(0, 1, 0);

/**
 * A shaped limb from joint a to joint b, like a wooden artist's mannequin:
 * a smooth solid of revolution that tapers from radius r to r * taper, swells
 * a little a third of the way along (the muscle) and closes in rounded ends.
 */
function limb(a, b, r, { taper = 0.78, swell = 0.12 } = {}) {
  const A = new Vector3(...a);
  const B = new Vector3(...b);
  const d = B.clone().sub(A);
  const L = d.length();
  const pts = [];
  const N = 18;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const base = r * (1 + (taper - 1) * t);
    const muscle = 1 + swell * Math.exp(-(((t - 0.33) / 0.22) ** 2));
    // Round the ends: the radius closes like a quarter circle near each joint.
    const e = Math.min(t, 1 - t) * L;
    const cap = Math.min(1, e / (base * 0.9));
    const round = Math.sqrt(Math.max(0, 1 - (1 - cap) ** 2));
    pts.push(new Vector2(Math.max(0.0005, base * muscle * round), t * L));
  }
  pts[0].x = 0;
  pts[N].x = 0;
  const g = new LatheGeometry(pts, 16);
  g.applyQuaternion(new Quaternion().setFromUnitVectors(UP, d.normalize()));
  g.translate(A.x, A.y, A.z);
  g.deleteAttribute('uv');
  return g.toNonIndexed();
}

const ball = (c, r) => {
  const g = new SphereGeometry(r, 16, 12).translate(...c);
  g.deleteAttribute('uv');
  return g.toNonIndexed();
};
/** The head: a slightly egg-shaped oval, tilted a little forward. */
const head = (c) => {
  const g = new SphereGeometry(1, 20, 14).scale(0.095, 0.12, 0.1).rotateZ(-0.16).translate(...c);
  g.deleteAttribute('uv');
  return g.toNonIndexed();
};
const shoe = (c, dir = 1) => {
  const g = new BoxGeometry(0.24, 0.07, 0.1).translate(c[0] + 0.05 * dir, c[1] - 0.035, c[2]);
  g.deleteAttribute('uv');
  return g.toNonIndexed();
};

// Joint positions (metres) for each pose. L and R are the left (+z) and
// right (-z) sides.
const POSES = {
  stand: {
    hips: [0, 0.94, 0], chest: [0, 1.36, 0], neck: [0, 1.5, 0], head: [0, 1.62, 0],
    shoulderL: [0, 1.42, 0.18], elbowL: [0.02, 1.15, 0.22], wristL: [0.04, 0.9, 0.22],
    shoulderR: [0, 1.42, -0.18], elbowR: [0.02, 1.15, -0.22], wristR: [0.04, 0.9, -0.22],
    hipL: [0, 0.92, 0.09], kneeL: [0.02, 0.5, 0.1], ankleL: [0, 0.09, 0.1],
    hipR: [0, 0.92, -0.09], kneeR: [0.02, 0.5, -0.1], ankleR: [0, 0.09, -0.1],
  },
  // Leaning into a push, arms out in front at shoulder height, back leg braced.
  push: {
    hips: [-0.06, 0.92, 0], chest: [0.1, 1.32, 0], neck: [0.17, 1.44, 0], head: [0.22, 1.56, 0],
    shoulderL: [0.12, 1.37, 0.18], elbowL: [0.36, 1.33, 0.19], wristL: [0.58, 1.3, 0.17],
    shoulderR: [0.12, 1.37, -0.18], elbowR: [0.36, 1.33, -0.19], wristR: [0.58, 1.3, -0.17],
    hipL: [-0.04, 0.9, 0.09], kneeL: [0.12, 0.5, 0.1], ankleL: [0.12, 0.09, 0.1],
    hipR: [-0.08, 0.9, -0.09], kneeR: [-0.28, 0.48, -0.1], ankleR: [-0.5, 0.09, -0.1],
  },
  // Holding a bag in front, against the chest.
  carry: {
    hips: [0, 0.94, 0], chest: [0.02, 1.36, 0], neck: [0.03, 1.5, 0], head: [0.05, 1.62, 0],
    shoulderL: [0.02, 1.42, 0.18], elbowL: [0.2, 1.18, 0.2], wristL: [0.36, 1.24, 0.14],
    shoulderR: [0.02, 1.42, -0.18], elbowR: [0.2, 1.18, -0.2], wristR: [0.36, 1.24, -0.14],
    hipL: [0, 0.92, 0.09], kneeL: [0.08, 0.5, 0.1], ankleL: [0.04, 0.09, 0.1],
    hipR: [0, 0.92, -0.09], kneeR: [-0.02, 0.5, -0.1], ankleR: [-0.08, 0.09, -0.1],
  },
  // Sideways on a board: knees bent, arms out for balance. Feet along x.
  skate: {
    hips: [0, 0.86, 0], chest: [0.02, 1.26, 0.03], neck: [0.03, 1.39, 0.04], head: [0.04, 1.5, 0.05],
    shoulderL: [0.18, 1.32, 0.04], elbowL: [0.42, 1.26, 0.06], wristL: [0.64, 1.18, 0.08],
    shoulderR: [-0.16, 1.32, 0.04], elbowR: [-0.4, 1.28, 0.06], wristR: [-0.62, 1.22, 0.08],
    hipL: [0.1, 0.84, 0], kneeL: [0.22, 0.5, 0.1], ankleL: [0.26, 0.14, 0],
    hipR: [-0.1, 0.84, 0], kneeR: [-0.2, 0.5, 0.1], ankleR: [-0.26, 0.14, 0],
  },
};

/** The figure's geometry for a pose (merged, one drawing). */
export function figureGeometry(pose = 'stand') {
  const j = POSES[pose];
  // Joints are small spheres between the shaped segments, as on a mannequin.
  const joint = (c, r) => ball(c, r);
  const pelvis = [j.hips[0], j.hips[1] - 0.02, j.hips[2]];
  const parts = [
    limb(pelvis, j.chest, 0.13, { taper: 1.2, swell: 0.08 }), // torso widens to the chest
    ball(pelvis, 0.12),
    limb(j.chest, j.neck, 0.05, { taper: 0.9, swell: 0 }), // neck
    head(j.head),
    joint(j.shoulderL, 0.05), limb(j.shoulderL, j.elbowL, 0.048), joint(j.elbowL, 0.04), limb(j.elbowL, j.wristL, 0.042, { taper: 0.7 }), ball(j.wristL, 0.04),
    joint(j.shoulderR, 0.05), limb(j.shoulderR, j.elbowR, 0.048), joint(j.elbowR, 0.04), limb(j.elbowR, j.wristR, 0.042, { taper: 0.7 }), ball(j.wristR, 0.04),
    joint(j.hipL, 0.065), limb(j.hipL, j.kneeL, 0.07, { swell: 0.16 }), joint(j.kneeL, 0.052), limb(j.kneeL, j.ankleL, 0.056, { taper: 0.62, swell: 0.18 }),
    joint(j.hipR, 0.065), limb(j.hipR, j.kneeR, 0.07, { swell: 0.16 }), joint(j.kneeR, 0.052), limb(j.kneeR, j.ankleR, 0.056, { taper: 0.62, swell: 0.18 }),
  ];
  const side = pose === 'skate';
  parts.push(shoe(j.ankleL, side ? 0 : 1), shoe(j.ankleR, side ? 0 : 1));
  if (pose === 'carry') parts.push(new BoxGeometry(0.3, 0.3, 0.28).translate(0.47, 1.2, 0).toNonIndexed()); // the bag
  for (const g of parts) if (g.getAttribute('uv')) g.deleteAttribute('uv');
  return mergeGeometries(parts);
}

/** A person as an ink drawing. */
export function createFigure({ pose = 'stand', name = 'person', color = '#F2ECE0' } = {}) {
  return createInkObject(figureGeometry(pose), { color, creaseDeg: 50, name });
}

/** A skateboard: deck with kicked ends and four wheels. Origin under the middle. */
export function boardGeometry() {
  const parts = [new BoxGeometry(0.62, 0.025, 0.21).translate(0, 0.085, 0).toNonIndexed()];
  for (const s of [-1, 1]) {
    parts.push(new BoxGeometry(0.14, 0.025, 0.21).rotateZ(s * 0.35).translate(s * 0.37, 0.105, 0).toNonIndexed());
    for (const z of [-0.08, 0.08]) parts.push(new CylinderGeometry(0.032, 0.032, 0.04, 14).rotateX(Math.PI / 2).translate(s * 0.24, 0.035, z).toNonIndexed());
  }
  for (const g of parts) if (g.getAttribute('uv')) g.deleteAttribute('uv');
  return mergeGeometries(parts);
}
