// src/objects/figure.js
// Ink people, built from a simple skeleton at real size (about 1.7 m tall).
// Each limb is a capsule between two joints, so a pose is just a list of
// joint positions. Poses: stand, push, carry, skate.
// Local origin: between the feet, on the ground. The figure faces +x.
import { Vector3, Quaternion, CapsuleGeometry, SphereGeometry, BoxGeometry, CylinderGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createInkObject } from '../ink/inkObject.js';

const UP = new Vector3(0, 1, 0);

/** A capsule from joint a to joint b. */
function limb(a, b, r) {
  const A = new Vector3(...a);
  const B = new Vector3(...b);
  const d = B.clone().sub(A);
  const len = Math.max(0.001, d.length() - 2 * r * 0.4);
  const g = new CapsuleGeometry(r, len, 4, 10);
  g.applyQuaternion(new Quaternion().setFromUnitVectors(UP, d.normalize()));
  const m = A.clone().add(B).multiplyScalar(0.5);
  g.translate(m.x, m.y, m.z);
  return g.toNonIndexed();
}

const ball = (c, r) => new SphereGeometry(r, 16, 12).translate(...c).toNonIndexed();
const shoe = (c, dir = 1) => new BoxGeometry(0.24, 0.07, 0.1).translate(c[0] + 0.05 * dir, c[1] - 0.035, c[2]).toNonIndexed();

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
  const parts = [
    limb(j.hips, j.chest, 0.15), // body
    limb(j.chest, j.neck, 0.05), // neck
    ball(j.head, 0.11),
    limb(j.shoulderL, j.elbowL, 0.045), limb(j.elbowL, j.wristL, 0.04), ball(j.wristL, 0.045),
    limb(j.shoulderR, j.elbowR, 0.045), limb(j.elbowR, j.wristR, 0.04), ball(j.wristR, 0.045),
    limb(j.hipL, j.kneeL, 0.065), limb(j.kneeL, j.ankleL, 0.055),
    limb(j.hipR, j.kneeR, 0.065), limb(j.kneeR, j.ankleR, 0.055),
  ];
  const side = pose === 'skate';
  parts.push(shoe(j.ankleL, side ? 0 : 1), shoe(j.ankleR, side ? 0 : 1));
  if (pose === 'carry') parts.push(new BoxGeometry(0.3, 0.3, 0.28).translate(0.47, 1.2, 0).toNonIndexed()); // the bag
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
  return mergeGeometries(parts);
}
