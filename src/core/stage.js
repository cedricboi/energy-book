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
import { setPageLightProvider } from '../ink/inkMaterial.js';

/**
 * Below this width-to-height ratio the book uses the stacked layout (the
 * right page framed at the top, the text panel below). Any landscape window
 * prints the text on the left page: the printed page has a fixed layout, so
 * it fits whatever the window's shape.
 */
export const STACK_BELOW_ASPECT = 1.0;
// Height kept in frame above the head of the page (jars plus their labels), m.
const JAR_ROOM = 0.085;
export const isStacked = (aspect) => aspect < STACK_BELOW_ASPECT;

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
  reading: { elevationDeg: 46, fovDeg: 30 },
  intro: { fovDeg: 34, position: new Vector3(0, 0.2, 0.92), target: new Vector3(0, 0.2, -0.3) },
};

/**
 * Two looks. Night (the default): a lamp-lit desk at night. Day: the same
 * desk in soft daylight, light oak and a pale wall, for comparison.
 */
const LOOKS = {
  night: { background: NIGHT_HEX, desk: undefined, wall: '#4A4038' },
  day: { background: '#DCD6CB', desk: '#C4A988', wall: '#CFC8BA' },
};

export function createStage({ tier, view = 'reading', focus = { x: 0.105, y: 0.05, z: 0 }, look = 'night' }) {
  const L = LOOKS[look] ?? LOOKS.night;
  const scene = new Scene();
  scene.background = new Color(L.background);

  scene.add(createDesk({ backZ: WALL_Z, color: L.desk }));
  const windowGroup = createNightWindow({ wallZ: WALL_Z, wallColor: L.wall });
  // By day the wall and night window are left out: a plain pale background.
  windowGroup.visible = look !== 'day';
  scene.add(windowGroup);
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
  const hemi = new HemisphereLight(new Color('#2A3458'), new Color('#2E2116'), 0.5);
  scene.add(hemi);

  if (look === 'day') {
    // Soft daylight from a high window at the upper left, a bright sky fill
    // and light bounced off the desk. No lamp spill.
    lamp.color.set('#FFF7EC');
    lamp.intensity = 3.1;
    lamp.angle = 0.75;
    lamp.penumbra = 1;
    lamp.position.set(-0.7, 1.1, 0.35);
    lampTarget.position.set(0, 0, 0);
    lamp.shadow.radius = 10;
    spill.intensity = 0;
    moon.color.set('#E3EAF6');
    moon.intensity = 0.7;
    hemi.color.set('#F3F1EC');
    hemi.groundColor.set('#A8927A');
    hemi.intensity = 1.25;
  }

  // Light falling on an upward-facing page at a point, in the shader's units
  // (irradiance / pi, as luminance). The ink uses it to decide where to hatch.
  const lum = (c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  const tmp = new Vector3();
  const axis = new Vector3();
  function pageLight(p) {
    let e = 0;
    for (const l of [lamp, spill]) {
      tmp.copy(l.position).sub(p);
      const d = tmp.length();
      tmp.divideScalar(d);
      const cosUp = Math.max(0, tmp.y);
      let spot = 1;
      if (l.isSpotLight) {
        axis.copy(l.position).sub(l.target.position).normalize();
        const c = tmp.dot(axis);
        const cone = Math.cos(l.angle);
        const pen = Math.cos(l.angle * (1 - l.penumbra));
        const x = Math.min(1, Math.max(0, (c - cone) / Math.max(pen - cone, 1e-4)));
        spot = x * x * (3 - 2 * x);
      }
      e += lum(l.color) * l.intensity * spot * cosUp / Math.max(d * d, 0.01);
    }
    e += lum(moon.color) * moon.intensity * Math.max(0, moon.position.clone().normalize().y);
    e += lum(hemi.color) * hemi.intensity;
    return e / Math.PI;
  }
  setPageLightProvider(pageLight);

  const camera = new PerspectiveCamera(POSES.reading.fovDeg, 1, 0.02, 10);
  let aspect = 1;
  // Part of the screen kept clear at the bottom (the control bar, and in
  // portrait the text panel). The book is framed in the area above it.
  let reserveBottom = 0;
  let viewW = 1;
  let viewH = 1;

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
    // The jars stand near the head of the page with their labels above them.
    // Keep that height in frame, so nothing is cut off at the top.
    for (const x of [x0, x1]) pts.push([x, JAR_ROOM, -BOOK.pageH / 2 + 0.03]);
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
  function framing(a, portrait = a < 1) {
    const key = `${a.toFixed(4)}-${portrait}`;
    if (framingCache.has(key)) return framingCache.get(key);
    const pose = POSES.reading;
    const pts = corners(portrait);
    const elevation = MathUtils.degToRad(pose.elevationDeg);
    // Landscape: about 80% of the width (85%, which gives the text page more room).
    const widthFill = portrait ? 0.9 : 0.97;
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
    const regionAspect = aspect / (1 - reserveBottom);
    camera.aspect = regionAspect;
    camera.fov = pose.fovDeg;
    // Render the full canvas, with the framed region at the top.
    if (reserveBottom > 0) camera.setViewOffset(viewW, viewH * (1 - reserveBottom), 0, 0, viewW, viewH);
    else camera.clearViewOffset();
    if (view === 'closeup') {
      // A close view of one object, for judging the ink style up close.
      const target = new Vector3(focus.x, focus.y, focus.z);
      const elevation = MathUtils.degToRad(36) + pitch;
      const dist = aspect < 1 ? 0.46 : 0.34;
      camera.fov = 28;
      camera.position.set(
        target.x + dist * Math.cos(elevation) * Math.sin(yaw),
        target.y + dist * Math.sin(elevation),
        target.z + dist * Math.cos(elevation) * Math.cos(yaw),
      );
      camera.lookAt(target);
      camera.updateProjectionMatrix();
      return;
    }
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
    const { target, dist } = framing(regionAspect, isStacked(aspect));
    const elevation = MathUtils.degToRad(pose.elevationDeg) + pitch;
    basePos.set(
      target.x + dist * Math.cos(elevation) * Math.sin(yaw),
      target.y + dist * Math.sin(elevation),
      target.z + dist * Math.cos(elevation) * Math.cos(yaw),
    );
    baseTgt.copy(target);
    // A guided shot: blend from where the camera was to the shot's pose.
    let toPos = basePos;
    let toTgt = baseTgt;
    const f = shot.to?.();
    if (f) {
      const e = MathUtils.degToRad(f.elevationDeg ?? pose.elevationDeg);
      const az = MathUtils.degToRad(f.azimuthDeg ?? 0);
      focusTgt.copy(f.target);
      focusPos.set(f.target.x + f.dist * Math.cos(e) * Math.sin(az), f.target.y + f.dist * Math.sin(e), f.target.z + f.dist * Math.cos(e) * Math.cos(az));
      toPos = focusPos;
      toTgt = focusTgt;
    }
    if (shot.from && shot.t < 1) {
      const k = shot.t * shot.t * (3 - 2 * shot.t); // ease in and out
      camera.position.lerpVectors(shot.from.pos, toPos, k);
      lookTgt.lerpVectors(shot.from.tgt, toTgt, k);
    } else {
      camera.position.copy(toPos);
      lookTgt.copy(toTgt);
    }
    camera.lookAt(lookTgt);
    camera.updateProjectionMatrix();
  }

  // Guided shots (CLAUDE.md section 11: never with reduced motion; the book
  // checks that). shot.to returns { target, dist, elevationDeg?, azimuthDeg? }
  // each frame, so a shot can follow a moving object. Null is the reading view.
  const basePos = new Vector3();
  const baseTgt = new Vector3();
  const focusPos = new Vector3();
  const focusTgt = new Vector3();
  const lookTgt = new Vector3();
  const shot = { from: null, to: null, t: 1, seconds: 1, start: 0 };
  function setShot(to, seconds = 1.4) {
    shot.from = { pos: camera.position.clone(), tgt: lookTgt.clone() };
    shot.to = to;
    shot.t = seconds > 0 ? 0 : 1;
    shot.seconds = Math.max(0.01, seconds);
    shot.start = performance.now();
  }
  /** Step a shot's blend (by the clock). Returns true while the camera is still moving. */
  function updateShot() {
    if (shot.t >= 1) return false;
    shot.t = Math.min(1, (performance.now() - shot.start) / 1000 / shot.seconds);
    return true;
  }

  return {
    scene,
    camera,
    book,
    lamp,
    setAspect(a) {
      aspect = a;
    },
    /** Canvas size in CSS px and the fraction of height kept clear at the bottom. */
    setViewport(w, h, reserve = 0) {
      viewW = w;
      viewH = h;
      aspect = w / h;
      reserveBottom = Math.min(0.7, Math.max(0, reserve));
    },
    placeCamera,
    setShot,
    updateShot,
    /** True while a guided shot holds the camera away from the reading view. */
    get inShot() {
      return !!shot.to || shot.t < 1;
    },
    setTier(t) {
      if (lamp.shadow.mapSize.x !== t.shadowMapSize) {
        lamp.shadow.mapSize.set(t.shadowMapSize, t.shadowMapSize);
        lamp.shadow.map?.dispose();
        lamp.shadow.map = null;
      }
    },
  };
}
