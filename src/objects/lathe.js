// src/objects/lathe.js
// Turn a 2D profile into a lathe mesh, with the clean-up every ink object
// needs: the seam welded shut, creased normals for shading, and a separate
// smooth-normal copy for the inverted-hull outline (CLAUDE.md section 4).
import { LatheGeometry, Vector2 } from 'three';
import { mergeVertices, toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Build points for a circular arc in the profile plane (r, y).
 * Angles in radians, measured from +r towards +y.
 */
export function arc(cx, cy, radius, from, to, steps = 8) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const a = from + ((to - from) * i) / steps;
    pts.push(new Vector2(cx + radius * Math.cos(a), cy + radius * Math.sin(a)));
  }
  return pts;
}

/** Remove consecutive points that are closer than `minGap` metres. */
export function dedupe(points, minGap = 1e-5) {
  const out = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (!last || last.distanceTo(p) > minGap) out.push(p);
  }
  return out;
}

/**
 * @param {Vector2[]} profile points as (radius, height), in order along the surface
 * @param {object} o
 * @param {number} o.segments  steps around the axis
 * @param {(pos: import('three').BufferAttribute) => void} [o.deform] edit positions in place
 * @param {number} [o.creaseAngle] normals are smooth below this angle (radians)
 * @returns {{ geometry: import('three').BufferGeometry, hull: import('three').BufferGeometry }}
 *   `geometry` for drawing (creased normals), `hull` for the outline (welded, smooth normals)
 */
export function createLathe(profile, { segments = 96, deform, creaseAngle = (30 * Math.PI) / 180 } = {}) {
  const raw = new LatheGeometry(dedupe(profile), segments);
  raw.deleteAttribute('uv');
  raw.deleteAttribute('normal');
  if (deform) deform(raw.attributes.position);

  // Weld the seam and any repeated points, so there are no cracks.
  const welded = mergeVertices(raw, 1e-6);

  const geometry = toCreasedNormals(welded, creaseAngle);
  const hull = welded.clone();
  hull.computeVertexNormals();
  return { geometry, hull };
}
