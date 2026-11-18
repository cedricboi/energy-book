// src/objects/crate.js
// A wooden crate drawn in ink: a box with a plank frame on each face.
// Local origin: centre of the base. Default 80 mm cube (a toy crate on the
// page). Lessons scale it to the size their numbers need.
import { BoxGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createInkObject } from '../ink/inkObject.js';

export function createCrate({ size = 0.08, color = '#E9DCC2', name = 'crate' } = {}) {
  const s = size;
  const b = s * 0.12; // frame board width
  const d = s * 0.03; // how far the frame stands proud
  const parts = [new BoxGeometry(s, s, s)];
  // Frame boards along every edge, standing slightly proud of the faces.
  const L = s + 2 * d;
  for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const x = sx * (s / 2 + d / 2 - b / 2);
    const y = sy * (s / 2 + d / 2 - b / 2);
    parts.push(new BoxGeometry(b + d, b + d, L).translate(x, y, 0)); // along z
    parts.push(new BoxGeometry(L, b + d, b + d).translate(0, x, y)); // along x
    parts.push(new BoxGeometry(b + d, L, b + d).translate(x, 0, y)); // along y
  }
  // A diagonal brace on the front and side faces.
  const diag = Math.hypot(s - 2 * b, s - 2 * b);
  for (const face of [0, 1]) {
    const brace = new BoxGeometry(diag, b * 0.9, d);
    brace.rotateZ(Math.PI / 4);
    if (face === 0) brace.translate(0, 0, s / 2 + d / 2);
    else brace.rotateY(Math.PI / 2).translate(s / 2 + d / 2, 0, 0);
    parts.push(brace);
  }
  const geo = mergeGeometries(parts.map((g) => g.toNonIndexed()));
  geo.translate(0, s / 2 + d, 0);
  return createInkObject(geo, { color, creaseDeg: 30, name });
}
