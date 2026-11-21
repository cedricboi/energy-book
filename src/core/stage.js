// src/core/stage.js
// The stage: a notebook on a dark wooden desk at night, lit by a warm desk
// lamp from the upper left, with a faint cool fill from the window behind.
// No lesson content lives here.
import {
  Scene, PerspectiveCamera, SpotLight, PointLight, DirectionalLight, HemisphereLight, Object3D,
  Mesh, PlaneGeometry, ShaderMaterial, Shape, ShapeGeometry, MeshLambertMaterial, Vector2, Vector3, Color, MathUtils, CanvasTexture, SRGBColorSpace,
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
// Below this window width the printed page's text would be too small to
// read (under about 12 px), so a small window is stacked whatever its shape.
export const STACK_BELOW_WIDTH = 700;
export const isStacked = (aspect, width = Infinity) => aspect < STACK_BELOW_ASPECT || width < STACK_BELOW_WIDTH;

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

/**
 * The light from a window, drawn in code: a tall window of six panes with
 * soft-edged glazing bars, used as the daylight spotlight's pattern, so soft
 * bars of light and shade fall across the desk and the book.
 */
function windowCookie() {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = '#3a3a3a'; // light outside the window still reaches the desk, dimly
  g.fillRect(0, 0, size, size);
  g.filter = 'blur(10px)';
  g.fillStyle = '#ffffff';
  const x0 = 70;
  const y0 = 40;
  const w = size - 2 * x0;
  const h = size - 2 * y0;
  const bar = 18;
  const cols = 2;
  const rows = 3;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const pw = (w - bar * (cols - 1)) / cols;
      const ph = (h - bar * (rows - 1)) / rows;
      g.fillRect(x0 + i * (pw + bar), y0 + j * (ph + bar), pw, ph);
    }
  }
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

/** A plain desk mat under the book, with rounded corners. It lies flat on the desk. */
function deskMat(hex) {
  const w = BOOK_EXTENT.width / 2 + 0.11;
  const d = BOOK_EXTENT.depth / 2 + 0.075;
  const r = 0.018;
  const s = new Shape();
  s.moveTo(-w + r, -d);
  s.lineTo(w - r, -d);
  s.quadraticCurveTo(w, -d, w, -d + r);
  s.lineTo(w, d - r);
  s.quadraticCurveTo(w, d, w - r, d);
  s.lineTo(-w + r, d);
  s.quadraticCurveTo(-w, d, -w, d - r);
  s.lineTo(-w, -d + r);
  s.quadraticCurveTo(-w, -d, -w + r, -d);
  const mesh = new Mesh(new ShapeGeometry(s, 8), new MeshLambertMaterial({ color: new Color(hex) }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.00015;
  mesh.receiveShadow = true;
  mesh.name = 'desk-mat';
  return mesh;
}

/** Camera poses. `reading` is the working view, `intro` shows the window. */
const POSES = {
  reading: { elevationDeg: 54, fovDeg: 30 },
  intro: { fovDeg: 34, position: new Vector3(0, 0.2, 0.92), target: new Vector3(0, 0.2, -0.3) },
};

/**
 * Two looks. Day (the house look, chosen by the teacher): soft daylight, light
 * oak and a pale background. Night (?look=night): the lamp-lit desk at night.
 */
const LOOKS = {
  night: { background: NIGHT_HEX, desk: undefined, wall: '#4A4038' },
  day: { background: '#DCD6CB', desk: '#C4A988', wall: '#CFC8BA' },
};

export function createStage({ tier, view = 'reading', focus = { x: 0.105, y: 0.05, z: 0 }, look = 'day', bright = false }) {
  // bright: a sample of whiter paper on a pale desk with a mat (?paper=white).
  const L = bright ? { background: '#E4E2DC', desk: '#DCCDB6', wall: '#CFC8BA' } : LOOKS[look] ?? LOOKS.night;
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
  if (bright) scene.add(deskMat('#B9C6BE'));

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
    // The window light does most of the work and the sky fill is modest,
    // so shadows are clear and fairly crisp, and the paper reads white.
    lamp.color.set('#FFF7EC');
    lampTarget.position.set(0, 0, 0);
    lamp.shadow.radius = 3.5;
    spill.intensity = 0;
    moon.color.set('#E3EAF6');
    moon.intensity = 0.45;
    hemi.color.set('#F3F1EC');
    hemi.groundColor.set('#B9A58E');
    hemi.intensity = 0.95;
    // The window's pattern falls across the desk (the spotlight casts shadows,
    // which its pattern needs).
    lamp.map = windowCookie();
    lamp.intensity = 5.0;
    lamp.angle = 0.62;
    lamp.penumbra = 0.25;
    lamp.position.set(-0.85, 0.95, -0.5);
    if (bright) {
      // Whiter paper reflects more, so the light comes down to keep lit
      // paper under the bloom threshold. The light itself is a cooler white.
      lamp.color.set('#FFFCF7');
      lamp.intensity = 4.55;
      hemi.groundColor.set('#C9C6BE');
      hemi.intensity = 0.9;
    }
  }

  // Energy lights the paper: a small fixed set of coloured point lights that
  // the scenes move to their brightest glowing jars. The set never changes
  // size, so shaders never recompile when energy appears or empties.
  const energyLights = [0, 1, 2].map(() => {
    const l = new PointLight(new Color('#ffffff'), 0, 0.12, 2);
    l.castShadow = false;
    scene.add(l);
    return l;
  });

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
    const { target, dist } = framing(regionAspect, isStacked(aspect, viewW));
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
    /** Canvas size in CSS px and the fraction of height kept clear at the bottom. */
    setViewport(w, h, reserve = 0) {
      viewW = w;
      viewH = h;
      aspect = w / h;
      reserveBottom = Math.min(0.7, Math.max(0, reserve));
    },
    placeCamera,
    energyLights,
    setTier(t) {
      if (lamp.shadow.mapSize.x !== t.shadowMapSize) {
        lamp.shadow.mapSize.set(t.shadowMapSize, t.shadowMapSize);
        lamp.shadow.map?.dispose();
        lamp.shadow.map = null;
      }
    },
  };
}
