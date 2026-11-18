// src/core/stage.js
// The stage: a notebook on a dark wooden desk at night, lit by a warm desk
// lamp from the upper left, with a faint cool fill from the window behind.
// No lesson content lives here.
import {
  Scene, PerspectiveCamera, SpotLight, PointLight, DirectionalLight, HemisphereLight, Object3D,
  Mesh, PlaneGeometry, ShaderMaterial, Vector2, Vector3, Color, MathUtils,
} from 'three';
import { createBook, BOOK, BOOK_EXTENT } from '../objects/book.js';
import { createDesk } from '../objects/desk.js';
import { createNightWindow, NIGHT_HEX } from '../objects/nightWindow.js';

export const LAMP_HEX = '#FFD9A0';
const WALL_Z = -0.42;

// Lamp brightness, in candela. Chosen so the brightest lit paper stays below
// a linear luminance of about 0.9, under the bloom threshold of 1
// (CLAUDE.md section 4). Checked by the ?debug=hot view and by the test.
export const LAMP_INTENSITY = 1.95;

/** A soft dark halo under the book, so it sits on the desk. */
function contactShadow() {
  const half = new Vector2(BOOK_EXTENT.width / 2, BOOK_EXTENT.depth / 2);
  const pad = 0.05;
  const m = new ShaderMaterial({
    uniforms: { uHalf: { value: half }, uSoft: { value: 0.03 }, uStrength: { value: 0.65 } },
    vertexShader: /* glsl */ `
      varying vec2 vP;
      void main() {
        vP = position.xy;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec2 uHalf;
      uniform float uSoft;
      uniform float uStrength;
      varying vec2 vP;
      float sdBox(vec2 p, vec2 b) {
        vec2 d = abs(p) - b;
        return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
      }
      void main() {
        float d = sdBox(vP, uHalf - 0.004) - 0.004;
        float a = 1.0 - smoothstep(-0.004, uSoft, d);
        gl_FragColor = vec4(0.0, 0.0, 0.0, a * a * uStrength);
      }`,
    transparent: true,
    depthWrite: false,
  });
  const mesh = new Mesh(new PlaneGeometry(half.x * 2 + pad * 2, half.y * 2 + pad * 2), m);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.0003;
  mesh.renderOrder = 1;
  mesh.name = 'contact-shadow';
  return mesh;
}

/** Camera poses. `reading` is the working view, `intro` shows the window. */
const POSES = {
  reading: { elevationDeg: 50, fovDeg: 30 },
  intro: { fovDeg: 34, position: new Vector3(0, 0.2, 0.92), target: new Vector3(0, 0.2, -0.3) },
};

export function createStage({ tier, view = 'reading' }) {
  const scene = new Scene();
  scene.background = new Color(NIGHT_HEX);

  scene.add(createDesk({ backZ: WALL_Z }));
  scene.add(createNightWindow({ wallZ: WALL_Z }));
  const book = createBook();
  scene.add(book);
  scene.add(contactShadow());

  // Warm desk lamp, just out of frame at the upper left. Only its pool of
  // light is seen. The pool is centred on the left page and falls off to the right.
  const lamp = new SpotLight(new Color(LAMP_HEX), LAMP_INTENSITY, 0, 0.44, 1, 2);
  lamp.position.set(-0.6, 0.52, 0.02);
  const lampTarget = new Object3D();
  lampTarget.position.set(-0.13, 0, -0.02);
  scene.add(lampTarget);
  lamp.target = lampTarget;
  lamp.castShadow = true;
  lamp.shadow.radius = 6;
  lamp.shadow.bias = -0.0004;
  lamp.shadow.normalBias = 0.002;
  lamp.shadow.camera.near = 0.2;
  lamp.shadow.camera.far = 1.6;
  lamp.shadow.mapSize.set(tier.shadowMapSize, tier.shadowMapSize);
  scene.add(lamp);
  // A little spill from the lamp shade, which lights the wall and window frame softly.
  const spill = new PointLight(new Color(LAMP_HEX), 0.3, 0, 2);
  spill.position.set(-0.6, 0.55, 0.02);
  scene.add(spill);

  // Faint cool fill from the night window behind the desk.
  const moon = new DirectionalLight(new Color('#7D93D9'), 0.22);
  moon.position.set(0.25, 0.7, WALL_Z - 1);
  scene.add(moon);
  scene.add(new HemisphereLight(new Color('#1A2448'), new Color('#24170F'), 0.32));

  const camera = new PerspectiveCamera(POSES.reading.fovDeg, 1, 0.02, 10);
  let aspect = 1;

  // Framing is fitted by projecting the corners of the book, because the
  // near edge of the book looks larger than the far edge.
  const framingCache = new Map();
  const probeCam = new PerspectiveCamera();
  const corner = new Vector3();

  function corners(portrait) {
    const x0 = portrait ? 0 : -BOOK_EXTENT.width / 2;
    const x1 = BOOK_EXTENT.width / 2;
    const z = BOOK_EXTENT.depth / 2;
    const pts = [];
    for (const x of [x0, x1]) for (const zz of [-z, z]) for (const y of [0, 0.016]) pts.push([x, y, zz]);
    return pts;
  }

  function extentAt(target, dist, elevation, fovDeg, a, pts) {
    probeCam.fov = fovDeg;
    probeCam.aspect = a;
    probeCam.position.set(target.x, target.y + dist * Math.sin(elevation), target.z + dist * Math.cos(elevation));
    probeCam.lookAt(target);
    probeCam.updateProjectionMatrix();
    probeCam.updateMatrixWorld();
    const e = { xMin: Infinity, xMax: -Infinity, yMin: Infinity, yMax: -Infinity };
    for (const [x, y, z] of pts) {
      corner.set(x, y, z).project(probeCam);
      e.xMin = Math.min(e.xMin, corner.x);
      e.xMax = Math.max(e.xMax, corner.x);
      e.yMin = Math.min(e.yMin, corner.y);
      e.yMax = Math.max(e.yMax, corner.y);
    }
    return e;
  }

  /**
   * Landscape: the open book fills 80% of the width. Portrait: the right-hand
   * page fills 90% of the width. The book is centred, and never touches the
   * top or bottom edge.
   */
  function framing(a) {
    const key = a.toFixed(4);
    if (framingCache.has(key)) return framingCache.get(key);
    const pose = POSES.reading;
    const portrait = a < 1;
    const pts = corners(portrait);
    const elevation = MathUtils.degToRad(pose.elevationDeg);
    const widthFill = portrait ? 0.9 : 0.8;
    const heightFill = 0.84;
    const target = new Vector3(portrait ? BOOK_EXTENT.width / 4 : 0, 0.008, 0);
    let dist = 0.6;
    for (let pass = 0; pass < 3; pass++) {
      let lo = 0.1;
      let hi = 5;
      for (let i = 0; i < 40; i++) {
        const mid = (lo + hi) / 2;
        const e = extentAt(target, mid, elevation, pose.fovDeg, a, pts);
        const fits = (e.xMax - e.xMin) / 2 <= widthFill && (e.yMax - e.yMin) / 2 <= heightFill;
        if (fits) hi = mid;
        else lo = mid;
      }
      dist = hi;
      // Re-centre: move the target so the projected book sits in the middle.
      const e = extentAt(target, dist, elevation, pose.fovDeg, a, pts);
      const cx = (e.xMin + e.xMax) / 2;
      const cy = (e.yMin + e.yMax) / 2;
      const halfH = dist * Math.tan(MathUtils.degToRad(pose.fovDeg) / 2);
      target.z -= (cy * halfH) / Math.sin(elevation);
      target.x += cx * halfH * a;
    }
    const f = { target, dist };
    framingCache.set(key, f);
    return f;
  }

  /**
   * Place the camera for the current aspect. `yaw` and `pitch` (radians) are
   * the drag offsets from core/input.js.
   */
  function placeCamera(yaw = 0, pitch = 0) {
    const pose = POSES[view] ?? POSES.reading;
    camera.aspect = aspect;
    camera.fov = pose.fovDeg;
    if (view === 'intro') {
      const offset = pose.position.clone().sub(pose.target);
      // On a tall screen, step back so the whole book and window fit.
      if (aspect < 1.3) offset.multiplyScalar(1.3 / aspect);
      offset.applyAxisAngle(new Vector3(0, 1, 0), yaw);
      camera.position.copy(pose.target).add(offset);
      camera.position.y += pitch * 0.5;
      camera.lookAt(pose.target);
      camera.updateProjectionMatrix();
      return;
    }
    const { target, dist } = framing(aspect);
    const elevation = MathUtils.degToRad(pose.elevationDeg) + pitch;
    camera.position.set(
      target.x + dist * Math.cos(elevation) * Math.sin(yaw),
      target.y + dist * Math.sin(elevation),
      target.z + dist * Math.cos(elevation) * Math.cos(yaw),
    );
    camera.lookAt(target);
    camera.updateProjectionMatrix();
  }

  return {
    scene,
    camera,
    book,
    lamp,
    setAspect(a) {
      aspect = a;
    },
    placeCamera,
    setTier(t) {
      if (lamp.shadow.mapSize.x !== t.shadowMapSize) {
        lamp.shadow.mapSize.set(t.shadowMapSize, t.shadowMapSize);
        lamp.shadow.map?.dispose();
        lamp.shadow.map = null;
      }
    },
  };
}
