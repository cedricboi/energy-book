// src/objects/beaker.js
// A 250 ml low-form glass beaker, drawn in ink. Real proportions: 70 mm
// outside diameter, 95 mm tall, 1.3 mm glass, a rolled lip and a pouring
// spout. In Phase 4 it becomes the energy store jar.
//
// Local origin: centre of the base, on the surface it stands on.
import { Group, Mesh, Vector2, Vector3 } from 'three';
import { createLathe, arc } from './lathe.js';
import { createInkMaterial, anchorHatching } from '../ink/inkMaterial.js';
import { addOutline } from '../ink/outline.js';
import { createInkLines, polylineToSegments } from '../ink/creases.js';

export const BEAKER = Object.freeze({
  R: 0.035, // outer radius
  H: 0.095, // height to the top of the lip
  t: 0.0013, // wall thickness
  base: 0.002, // base thickness
  corner: 0.003, // outer bottom corner radius
  lip: 0.0012, // radius of the rolled lip
});

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** The spout: the rim is pulled outward and up around one direction. */
function makeSpout(direction) {
  const s = direction.clone().setY(0).normalize();
  const { H } = BEAKER;
  return (x, y, z) => {
    const r = Math.hypot(x, z);
    if (r < 1e-6) return [x, y, z];
    const dx = x / r;
    const dz = z / r;
    const ang = Math.acos(Math.min(1, Math.max(-1, dx * s.x + dz * s.z)));
    const w = Math.exp(-((ang / 0.32) ** 2));
    const h = smooth(H - 0.016, H, y);
    const push = 0.0042 * w * h * h;
    const lift = 0.0012 * w * h * h * h;
    return [x + dx * push, y + lift, z + dz * push];
  };
}

function profile() {
  const { R, H, t, base, corner, lip } = BEAKER;
  const Ri = R - t;
  const innerCorner = 0.0016;
  const lipC = new Vector2(R + 0.0001, H - lip);
  return [
    new Vector2(0, 0),
    new Vector2(R - corner, 0),
    ...arc(R - corner, corner, corner, -Math.PI / 2, 0, 6),
    new Vector2(R, H - 2 * lip),
    // Rolled lip: up the outside, over the top, down the inside.
    ...arc(lipC.x, lipC.y, lip, -Math.PI / 2, Math.PI, 14),
    new Vector2(Ri, H - 2 * lip),
    new Vector2(Ri, base + innerCorner),
    ...arc(Ri - innerCorner, base + innerCorner, innerCorner, 0, -Math.PI / 2, 4),
    new Vector2(0, base),
  ];
}

/** A ring around the axis at profile point (r, y), passed through the deform. */
function ring(r, y, deform, steps = 160) {
  const pts = [];
  for (let i = 0; i < steps; i++) {
    const phi = (i / steps) * Math.PI * 2;
    const [x, yy, z] = deform(Math.sin(phi) * r, y, Math.cos(phi) * r);
    pts.push(new Vector3(x, yy, z));
  }
  return pts;
}

/**
 * @param {object} [o]
 * @param {Vector3} [o.spoutDirection] which way the spout points
 * @returns {{ group: Group, rise: Group, lines: any[], formUniforms: any[], glass: Mesh }}
 */
export function createBeaker({ spoutDirection = new Vector3(-1, 0, -0.35) } = {}) {
  const { R, H, t, base, corner, lip } = BEAKER;
  const deform = makeSpout(spoutDirection);

  const { geometry, hull } = createLathe(profile(), {
    segments: 128,
    deform(pos) {
      for (let i = 0; i < pos.count; i++) {
        const [x, y, z] = deform(pos.getX(i), pos.getY(i), pos.getZ(i));
        pos.setXYZ(i, x, y, z);
      }
    },
  });

  const group = new Group();
  group.name = 'beaker';
  const rise = new Group(); // scaled in y for the pop-up
  group.add(rise);

  const glass = new Mesh(geometry, createInkMaterial({ glass: true, color: '#EEF1EA', glassAlpha: 0.1 }));
  glass.name = 'beaker-glass';
  glass.renderOrder = 2;
  // Glass would cast a solid shadow from the lamp, which looks wrong. A drawn
  // shadow can be added later if the teacher wants one.
  glass.castShadow = false;
  glass.receiveShadow = true;
  rise.add(glass);
  anchorHatching(glass, group);
  const outline = addOutline(glass, hull);

  // Feature rings: the top of the lip, the inside of the lip (so the glass
  // thickness shows at the rim), where the wall meets the base, and the
  // inside of the base.
  const Ri = R - t;
  const ringSegs = [
    ...polylineToSegments(ring(R + 0.0001, H, deform), true),
    ...polylineToSegments(ring(Ri + 0.0001, H - lip, deform), true),
    ...polylineToSegments(ring(R, corner, deform), true),
    ...polylineToSegments(ring(Ri - 0.0016, base, deform), true),
  ];
  const rings = createInkLines(ringSegs, { widthScale: 1 });
  rise.add(rings);

  // Side lines: the two vertical silhouettes, turned every frame to the
  // points where the camera's line of sight touches the side of the glass.
  const sideSegs = polylineToSegments([new Vector3(0, corner, R), new Vector3(0, H - 2 * lip, R)]);
  const sides = [createInkLines(sideSegs), createInkLines(sideSegs)];
  const camLocal = new Vector3();
  sides.forEach((line, k) => {
    rise.add(line);
    line.onBeforeRender = (renderer, scene, camera) => {
      camLocal.copy(camera.position);
      group.worldToLocal(camLocal);
      const dh = Math.hypot(camLocal.x, camLocal.z);
      const alpha = Math.atan2(camLocal.x, camLocal.z);
      const theta = Math.acos(Math.min(1, R / Math.max(dh, R)));
      line.rotation.y = alpha + (k === 0 ? theta : -theta);
      // three computes modelViewMatrix just after this callback.
      line.updateMatrixWorld();
    };
  });

  return {
    group,
    rise,
    glass,
    lines: [rings, ...sides],
    formUniforms: [glass.material.userData.ink.uForm, outline.material.uniforms.uOpacity],
  };
}
