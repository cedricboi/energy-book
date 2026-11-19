// src/objects/halfPipe.js
// A half-pipe at real size, drawn to scale with the physics model: surface
// y = k x², 3.2 m walls, 6.8 m across, with a deck at each top.
// Built as an open frame, like a real ramp: a thin curved riding surface on
// legs, with a rail along the ground and a platform at each top. The page
// shows through underneath, so the drawing stays light.
import { Shape, ExtrudeGeometry, BoxGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RAMP, rampHeight } from '../physics/models/ramp.js';
import { createInkObject } from '../ink/inkObject.js';

export const HALF_PIPE_DEPTH = 2.0; // m, across the ramp
const DECK = 0.4; // m, flat platform at each top
const SKIN = 0.12; // m, thickness of the riding surface
const LEG = 0.12; // m, square legs
const SPACING = 0.85; // m between legs

/** Height of the riding surface at x (the curve, then the flat decks). */
const surfaceAt = (x) => (Math.abs(x) >= RAMP.HALF ? RAMP.TOP : rampHeight(x));

export function createHalfPipe({ name = 'half-pipe' } = {}) {
  const { HALF, TOP } = RAMP;
  const W = HALF + DECK;

  // The riding surface: the curve and both decks, as a thin band.
  const top = [[-W, TOP]];
  const N = 72;
  for (let i = 0; i <= N; i++) {
    const x = -HALF + (2 * HALF * i) / N;
    top.push([x, rampHeight(x)]);
  }
  top.push([W, TOP]);
  const shape = new Shape();
  shape.moveTo(top[0][0], top[0][1]);
  for (const [x, y] of top.slice(1)) shape.lineTo(x, y);
  // Back along the underside, the band's thickness below the surface.
  for (const [x, y] of top.slice().reverse()) shape.lineTo(x, y - SKIN);
  shape.closePath();
  const skin = new ExtrudeGeometry(shape, { depth: HALF_PIPE_DEPTH, bevelEnabled: false, curveSegments: 1 });
  skin.translate(0, 0, -HALF_PIPE_DEPTH / 2);

  const parts = [skin];
  const zs = [-HALF_PIPE_DEPTH / 2 + LEG / 2, HALF_PIPE_DEPTH / 2 - LEG / 2];
  // Legs under the surface, front and back.
  for (let x = -W + LEG / 2 + SPACING; x < W - LEG / 2 - 0.1; x += SPACING) {
    const h = surfaceAt(x) - SKIN;
    if (h < 0.15) continue; // near the bottom the surface is on the ground
    for (const z of zs) parts.push(new BoxGeometry(LEG, h, LEG).translate(x, h / 2, z));
  }
  // The end legs under each deck.
  for (const x of [-W + LEG / 2, W - LEG / 2]) {
    for (const z of zs) parts.push(new BoxGeometry(LEG, TOP - SKIN, LEG).translate(x, (TOP - SKIN) / 2, z));
  }
  // Ground rails along the front and back, and a cross rail at each end.
  for (const z of zs) parts.push(new BoxGeometry(2 * W, 0.08, LEG).translate(0, 0.04, z));
  for (const x of [-W + LEG / 2, W - LEG / 2]) parts.push(new BoxGeometry(LEG, 0.08, HALF_PIPE_DEPTH).translate(x, 0.04, 0));
  const geo = mergeGeometries(parts.map((g) => {
    const n = g.toNonIndexed();
    n.deleteAttribute('uv');
    return n;
  }));

  // One hatch layer at most: the ramp is a big shape and must not compete
  // with the rider and the energy glows.
  return createInkObject(geo, { color: '#E8DCC2', creaseDeg: 25, name, maxLayers: 1 });
}
