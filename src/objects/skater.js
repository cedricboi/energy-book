// src/objects/skater.js
// An ink skateboarder at real size: the skate pose from objects/figure.js
// (knees bent, arms out for balance) on a board with kicked ends and wheels,
// merged into one drawing. Local origin: the middle of the board's underside.
// +x is along the board.
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createInkObject } from '../ink/inkObject.js';
import { figureGeometry, boardGeometry } from './figure.js';

export function createSkater({ name = 'skater' } = {}) {
  const body = figureGeometry('skate');
  // Stand the figure on the deck.
  body.translate(0, 0.07, 0);
  return createInkObject(mergeGeometries([boardGeometry(), body]), { color: '#F2ECE0', creaseDeg: 50, name });
}
