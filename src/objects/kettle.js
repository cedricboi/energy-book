// src/objects/kettle.js
// An electric kettle drawn at page size: a rounded body on a flat base, a
// domed lid with a knob, a curved handle at the back and a tapered spout at
// the front. Origin at the middle of the base. The spout points along +x.
import { LatheGeometry, TubeGeometry, CylinderGeometry, SphereGeometry, Vector2, Vector3, CatmullRomCurve3 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** @param {number} h height of the body in metres */
export function kettleGeometry(h = 0.055) {
  const r = h * 0.5;
  const profile = [
    [0, 0], [r * 0.92, 0], [r * 0.98, h * 0.06], [r * 1.0, h * 0.35],
    [r * 0.94, h * 0.72], [r * 0.78, h * 0.9], [r * 0.6, h * 0.97], [0, h * 0.97],
  ].map(([x, y]) => new Vector2(x, y));
  const body = new LatheGeometry(profile, 40);
  const lid = new SphereGeometry(r * 0.56, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.45, 1).translate(0, h * 0.96, 0);
  const knob = new CylinderGeometry(r * 0.1, r * 0.13, h * 0.07, 14).translate(0, h * 1.08, 0);
  // Handle: an arc from the shoulder round the back to the lower body.
  const handle = new TubeGeometry(new CatmullRomCurve3([
    new Vector3(-r * 0.7, h * 0.86, 0), new Vector3(-r * 1.35, h * 0.86, 0),
    new Vector3(-r * 1.5, h * 0.55, 0), new Vector3(-r * 1.3, h * 0.25, 0), new Vector3(-r * 0.95, h * 0.2, 0),
  ]), 24, r * 0.11, 10);
  const spout = new CylinderGeometry(r * 0.12, r * 0.26, h * 0.42, 14).rotateZ(-0.85).translate(r * 1.12, h * 0.62, 0);
  const parts = [body, lid, knob, handle, spout].map((g) => {
    const n = g.toNonIndexed();
    n.deleteAttribute('uv');
    return n;
  });
  const g = mergeGeometries(parts);
  g.computeVertexNormals();
  return g;
}
