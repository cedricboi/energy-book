// src/objects/skater.js
// A simple ink skateboarder: board, wheels, legs, body, arms and head, built
// from primitives at real size (1.7 m tall) and merged into one drawing.
// Local origin: the middle of the board's underside. +x is forward.
import { BoxGeometry, CylinderGeometry, SphereGeometry, CapsuleGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createInkObject } from '../ink/inkObject.js';

export function createSkater({ name = 'skater' } = {}) {
  const parts = [];
  const add = (g) => parts.push(g.toNonIndexed());
  add(new BoxGeometry(0.8, 0.03, 0.22).translate(0, 0.08, 0)); // deck
  for (const x of [-0.28, 0.28]) {
    for (const z of [-0.09, 0.09]) add(new CylinderGeometry(0.03, 0.03, 0.035, 12).rotateX(Math.PI / 2).translate(x, 0.03, z));
  }
  // Legs, knees slightly bent.
  add(new CapsuleGeometry(0.065, 0.42, 4, 10).rotateZ(0.18).translate(-0.17, 0.36, 0));
  add(new CapsuleGeometry(0.065, 0.42, 4, 10).rotateZ(-0.18).translate(0.17, 0.36, 0));
  add(new CapsuleGeometry(0.06, 0.38, 4, 10).rotateZ(-0.1).translate(-0.11, 0.78, 0));
  add(new CapsuleGeometry(0.06, 0.38, 4, 10).rotateZ(0.1).translate(0.11, 0.78, 0));
  add(new CapsuleGeometry(0.15, 0.42, 4, 12).translate(0, 1.2, 0)); // body
  add(new CapsuleGeometry(0.045, 0.5, 4, 8).rotateZ(1.2).translate(-0.38, 1.3, 0)); // arms out for balance
  add(new CapsuleGeometry(0.045, 0.5, 4, 8).rotateZ(-1.2).translate(0.38, 1.3, 0));
  add(new SphereGeometry(0.12, 18, 12).translate(0, 1.58, 0)); // head
  const geo = mergeGeometries(parts);
  return createInkObject(geo, { color: '#EFE6D3', creaseDeg: 40, name });
}
