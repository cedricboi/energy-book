// src/ink/inkObject.js
// Wrap any geometry as an ink drawing: hatched body, inverted-hull outline,
// crease lines, extra polylines, and the pieces drawIn.js needs.
import { Group, Mesh } from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { createInkMaterial, anchorHatching } from './inkMaterial.js';
import { addOutline } from './outline.js';
import { createCreases, createInkLines } from './creases.js';

/** A welded, smooth-normal copy of a geometry, for the outline hull. */
export function hullFrom(geometry) {
  const g = geometry.clone();
  for (const name of Object.keys(g.attributes)) if (name !== 'position') g.deleteAttribute(name);
  const welded = mergeVertices(g, 1e-6);
  welded.computeVertexNormals();
  return welded;
}

/**
 * @param {import('three').BufferGeometry} geometry  body (with normals)
 * @param {object} [o]
 * @param {string} [o.color]       body colour (paper by default)
 * @param {boolean} [o.glass]
 * @param {import('three').BufferGeometry} [o.hull]  outline hull (made from the body if absent)
 * @param {number|false} [o.creaseDeg]  crease threshold, or false for none
 * @param {number[]} [o.extraSegments]  extra ink line segment pairs
 * @param {boolean} [o.castShadow]
 * @param {string} [o.name]
 */
export function createInkObject(geometry, {
  color = '#F4EEDF', glass = false, hull, creaseDeg = 30, extraSegments, castShadow = true, name = 'ink-object',
} = {}) {
  const group = new Group();
  group.name = name;
  const rise = new Group();
  group.add(rise);

  const body = new Mesh(geometry, createInkMaterial({ color, glass }));
  body.name = `${name}-body`;
  body.castShadow = castShadow && !glass;
  body.receiveShadow = true;
  body.renderOrder = glass ? 2 : 0;
  rise.add(body);
  anchorHatching(body, group);
  const outline = addOutline(body, hull ?? hullFrom(geometry));

  const lines = [];
  if (creaseDeg !== false) {
    const creases = createCreases(geometry, { thresholdDeg: creaseDeg });
    if (creases) {
      rise.add(creases);
      lines.push(creases);
    }
  }
  if (extraSegments?.length) {
    const extra = createInkLines(extraSegments);
    rise.add(extra);
    lines.push(extra);
  }

  return {
    group,
    rise,
    body,
    lines,
    formUniforms: [body.material.userData.ink.uForm, outline.material.uniforms.uOpacity],
  };
}
