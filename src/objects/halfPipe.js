// src/objects/halfPipe.js
// A half-pipe at real size, drawn to scale with the physics model: surface
// y = k x², 3.2 m walls, 6.8 m across, with a deck at each top.
import { Shape, ExtrudeGeometry } from 'three';
import { RAMP, rampHeight } from '../physics/models/ramp.js';
import { createInkObject } from '../ink/inkObject.js';

export const HALF_PIPE_DEPTH = 2.0; // m, across the ramp
const DECK = 0.4; // m, flat platform at each top

export function createHalfPipe({ name = 'half-pipe' } = {}) {
  const { HALF, TOP } = RAMP;
  const shape = new Shape();
  shape.moveTo(-HALF - DECK, 0);
  shape.lineTo(-HALF - DECK, TOP);
  shape.lineTo(-HALF, TOP);
  const N = 64;
  for (let i = 1; i <= N; i++) {
    const x = -HALF + (2 * HALF * i) / N;
    shape.lineTo(x, rampHeight(x));
  }
  shape.lineTo(HALF + DECK, TOP);
  shape.lineTo(HALF + DECK, 0);
  shape.closePath();
  const geo = new ExtrudeGeometry(shape, { depth: HALF_PIPE_DEPTH, bevelEnabled: false, curveSegments: 1 });
  geo.translate(0, 0, -HALF_PIPE_DEPTH / 2);
  // One hatch layer at most: the ramp is a big shape and must not compete
  // with the rider and the energy glows.
  return createInkObject(geo, { color: '#E8DCC2', creaseDeg: 25, name, maxLayers: 1 });
}
