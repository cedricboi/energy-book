// src/objects/ball.js
// A ball drawn in ink. Default size is a tennis ball (67 mm across), with
// its curved seam as an ink line. Local origin: the bottom of the ball.
import { SphereGeometry, Vector3 } from 'three';
import { createInkObject } from '../ink/inkObject.js';
import { polylineToSegments } from '../ink/creases.js';

export function createBall({ radius = 0.0335, seam = true, color = '#F4EEDF', name = 'ball' } = {}) {
  const geo = new SphereGeometry(radius, 64, 40);
  geo.translate(0, radius, 0);
  const pts = [];
  if (seam) {
    // The classic tennis-ball seam: a curve that wanders between the poles.
    const a = 0.44;
    for (let i = 0; i < 240; i++) {
      const t = (i / 240) * Math.PI * 2;
      const x = Math.cos(t) - a * Math.cos(3 * t);
      const z = Math.sin(t) + a * Math.sin(3 * t);
      const y = 2 * Math.sqrt(a * (1 - a)) * Math.sin(2 * t);
      const v = new Vector3(x, y, z).normalize().multiplyScalar(radius * 1.004);
      v.y += radius;
      pts.push(v);
    }
  }
  return createInkObject(geo, {
    color,
    creaseDeg: false,
    extraSegments: seam ? polylineToSegments(pts, true) : undefined,
    name,
  });
}
