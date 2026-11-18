// src/objects/nightWindow.js
// The wall behind the desk, with a window onto a deep blue night sky and a
// few faint stars. Nothing here may glow above the bloom threshold, because
// only energy glows (CLAUDE.md section 4), so the stars stay dim.
import {
  Group, Mesh, Shape, Path, ShapeGeometry, BoxGeometry, PlaneGeometry,
  MeshLambertMaterial, MeshStandardMaterial, ShaderMaterial, Color,
} from 'three';
import { NOISE_GLSL } from '../ink/paper.js';

export const NIGHT_HEX = '#0C1230';

const OPENING = { x0: -0.62, x1: 0.62, y0: 0.07, y1: 0.95 };

function skyMaterial() {
  return new ShaderMaterial({
    uniforms: {
      uZenith: { value: new Color('#070B20') },
      uMid: { value: new Color(NIGHT_HEX) },
      uHorizon: { value: new Color('#1B2550') },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uZenith;
      uniform vec3 uMid;
      uniform vec3 uHorizon;
      varying vec2 vUv;
      ${NOISE_GLSL}
      void main() {
        float h = vUv.y;
        vec3 c = mix(uHorizon, uMid, smoothstep(0.0, 0.35, h));
        c = mix(c, uZenith, smoothstep(0.35, 1.0, h));
        // A little thin cloud near the horizon.
        c += uHorizon * 0.25 * smoothstep(0.55, 0.8, el_fbm(vUv * vec2(6.0, 18.0))) * (1.0 - smoothstep(0.1, 0.45, h));
        // A few faint stars on a fixed grid. Brightness stays well under 1.
        vec2 g = vUv * vec2(260.0, 170.0);
        vec2 cell = floor(g);
        float r = el_hash(cell);
        if (r > 0.995 && h > 0.2) {
          vec2 centre = cell + 0.5 + (vec2(el_hash(cell + 7.1), el_hash(cell + 3.3)) - 0.5) * 0.6;
          float d = length(g - centre);
          float w = fwidth(g.x);
          float star = 1.0 - smoothstep(0.08, 0.08 + 1.5 * w, d);
          float bright = 0.18 + 0.4 * el_hash(cell + 1.9);
          c += vec3(0.85, 0.9, 1.0) * star * bright;
        }
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
    toneMapped: false,
  });
}

/**
 * @param {object} o
 * @param {number} o.wallZ z of the wall surface
 */
export function createNightWindow({ wallZ }) {
  const group = new Group();
  group.name = 'night-window';

  // Wall with a rectangular hole for the window.
  const wall = new Shape();
  wall.moveTo(-2, -0.1);
  wall.lineTo(2, -0.1);
  wall.lineTo(2, 2);
  wall.lineTo(-2, 2);
  wall.closePath();
  const hole = new Path();
  hole.moveTo(OPENING.x0, OPENING.y0);
  hole.lineTo(OPENING.x0, OPENING.y1);
  hole.lineTo(OPENING.x1, OPENING.y1);
  hole.lineTo(OPENING.x1, OPENING.y0);
  hole.closePath();
  wall.holes.push(hole);
  const wallMesh = new Mesh(new ShapeGeometry(wall), new MeshLambertMaterial({ color: new Color('#4A4038') }));
  wallMesh.position.z = wallZ;
  wallMesh.receiveShadow = true;
  group.add(wallMesh);

  // Window frame, mullion, transom and sill in dark painted wood.
  const frameMat = new MeshStandardMaterial({ color: new Color('#3A2F26'), roughness: 0.7 });
  const t = 0.035; // frame member width
  const d = 0.07; // frame depth
  const w = OPENING.x1 - OPENING.x0;
  const h = OPENING.y1 - OPENING.y0;
  const cx = (OPENING.x0 + OPENING.x1) / 2;
  const cy = (OPENING.y0 + OPENING.y1) / 2;
  const members = [
    [w + 2 * t, t, OPENING.x0 - t + (w + 2 * t) / 2, OPENING.y1 + t / 2], // head
    [w + 2 * t, t, cx, OPENING.y0 - t / 2], // bottom rail
    [t, h, OPENING.x0 - t / 2, cy], // left jamb
    [t, h, OPENING.x1 + t / 2, cy], // right jamb
    [t * 0.7, h, cx, cy], // mullion
    [w, t * 0.7, cx, OPENING.y0 + h * 0.62], // transom
  ];
  for (const [mw, mh, x, y] of members) {
    const m = new Mesh(new BoxGeometry(mw, mh, d), frameMat);
    m.position.set(x, y, wallZ - d / 2 + 0.01);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
  }
  const sill = new Mesh(new BoxGeometry(w + 0.16, 0.02, 0.06), frameMat);
  sill.position.set(cx, OPENING.y0 - t - 0.01, wallZ + 0.02);
  sill.receiveShadow = true;
  group.add(sill);

  // The sky, far enough back to give a little parallax when the view moves.
  const sky = new Mesh(new PlaneGeometry(7, 3.5), skyMaterial());
  sky.position.set(0, 0.9, wallZ - 2.2);
  group.add(sky);

  return group;
}

export const WINDOW_OPENING = OPENING;
