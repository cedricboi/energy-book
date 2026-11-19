// src/energy/storeJar.js
// An energy store jar: the ink beaker with glowing liquid inside. The fill
// height is proportional to the energy, with one scale per page (CLAUDE.md
// section 5, rule 5). The store's pattern sits inside the glow and moves
// slowly only while energy is entering or leaving (render on demand).
// The glow is HDR colour, scaled so every store passes the bloom threshold.
import { Mesh, CylinderGeometry, ShaderMaterial, Vector3, Color, SphereGeometry, InstancedMesh, MeshBasicMaterial, Object3D } from 'three';
import { createBeaker, BEAKER } from '../objects/beaker.js';
import { STORES, PATTERN_INDEX, glowColour } from './palette.js';

const BASE_Y = BEAKER.base + 0.0004;
const TOP_Y = BEAKER.H - 0.012; // leave room below the lip
export const JAR_USABLE_HEIGHT = TOP_Y - BASE_Y;

const PATTERN_GLSL = /* glsl */ `
// Pattern coordinates: u around the jar (0..1), v up the jar in metres.
float elPattern(int kind, vec2 p) {
  // p is in millimetres around (x) and up (y).
  if (kind == 0) { // chevrons, pointing forward
    float c = abs(fract(p.x / 6.0) - 0.5) * 6.0;
    return step(0.5, fract((p.y + c) / 5.0));
  } else if (kind == 1) { // horizontal bands
    return step(0.55, fract(p.y / 4.0));
  } else if (kind == 2) { // zigzag
    float z = abs(fract(p.x / 5.0) - 0.5) * 5.0;
    return step(0.6, fract((p.y - z * 1.2) / 4.5));
  } else if (kind == 3) { // small dots
    vec2 c = fract(p / 4.0) - 0.5;
    return 1.0 - step(0.22, length(c));
  } else if (kind == 4) { // wavy lines
    return step(0.55, fract((p.y + sin(p.x * 0.9) * 1.1) / 4.0));
  }
  // rings
  vec2 c = fract(p / 9.0) - 0.5;
  float r = length(c) * 9.0;
  return step(0.5, fract(r / 2.4));
}
`;

function liquidMaterial(storeId) {
  // Just above the bloom threshold: brighter values are washed towards white
  // by tone mapping, which would weaken the store colours.
  const glow = glowColour(storeId, 1.3);
  return new ShaderMaterial({
    uniforms: {
      uGlow: { value: new Color(...glow) },
      uKind: { value: PATTERN_INDEX[STORES[storeId].pattern] },
      uPhase: { value: 0 },
      uFade: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vLocal;
      varying vec3 vWorld;
      varying vec3 vN;
      varying vec3 vNW;
      void main() {
        vLocal = position;
        vN = normal;
        vNW = normalize(mat3(modelMatrix) * normal);
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uGlow;
      uniform int uKind;
      uniform float uPhase;
      uniform float uFade;
      varying vec3 vLocal;
      varying vec3 vWorld;
      varying vec3 vN;
      varying vec3 vNW;
      ${PATTERN_GLSL}
      void main() {
        float angle = atan(vLocal.x, vLocal.z);
        vec2 p = vec2(angle * ${(BEAKER.R * 1000).toFixed(1)}, vWorld.y * 1000.0 + uPhase);
        bool top = abs(vN.y) > 0.5;
        // The flat top of the liquid uses flat coordinates, not the angle.
        if (top) p = vec2(vWorld.x, vWorld.z) * 1000.0 + vec2(0.0, uPhase);
        float pat = elPattern(uKind, p);
        // Light in a liquid: brighter towards the edges, where you look
        // through more of it, and a little brighter higher up, with a slow
        // swirl. The surface is brightest of all, brighter still at its rim.
        vec3 nW = normalize(vNW);
        vec3 v = normalize(cameraPosition - vWorld);
        float rim = pow(1.0 - abs(dot(nW, v)), 2.2);
        float swirl = sin(angle * 3.0 + vLocal.y * 9.0 + uPhase * 0.05) * 0.5 + 0.5;
        float b = 0.62 + 0.3 * vLocal.y + 0.5 * rim + 0.14 * swirl;
        if (top) b = 1.2 + 0.5 * smoothstep(0.55, 1.0, length(vLocal.xz) / ${(BEAKER.R - BEAKER.t).toFixed(4)});
        // The store's pattern stays (colour is never the only cue), as a
        // dimmer shade of the same colour.
        vec3 c = uGlow * b * mix(1.0, 0.62, pat);
        gl_FragColor = vec4(c * uFade, 1.0);
      }`,
    toneMapped: false,
  });
}

/**
 * @param {object} o
 * @param {string} o.store   store id from palette.js
 * @param {number} o.scale   joules that fill the jar to the top (one scale per page)
 * @param {number} [o.value] starting energy in joules
 * @param {number} [o.size]  drawing scale of the jar (1 = a real 250 ml beaker)
 */
export function createStoreJar({ store, scale, value = 0, size = 0.6 }) {
  if (!STORES[store]) throw new Error(`Unknown store "${store}"`);
  if (!(scale > 0)) throw new RangeError('A jar needs a positive scale in joules');
  const beaker = createBeaker();
  beaker.group.name = `jar-${store}`;
  beaker.group.scale.setScalar(size);

  const Ri = BEAKER.R - BEAKER.t - 0.0005;
  const geo = new CylinderGeometry(Ri, Ri, 1, 64, 1, false);
  geo.translate(0, 0.5, 0); // base at y = 0, top at y = 1
  const liquid = new Mesh(geo, liquidMaterial(store));
  liquid.name = `jar-${store}-liquid`;
  liquid.position.y = BASE_Y;
  liquid.renderOrder = 1;
  beaker.rise.add(liquid);

  // A few small bubbles rise near the wall while energy is moving in or out.
  // At rest they stay still, so an idle page stops rendering.
  const BUBBLES = 7;
  const bubbleMat = new MeshBasicMaterial({ color: new Color(...glowColour(store, 1.3)).lerp(new Color(1.6, 1.6, 1.6), 0.16).multiplyScalar(1.6), toneMapped: false, transparent: true, opacity: 0 });
  const bubbles = new InstancedMesh(new SphereGeometry(1, 8, 6), bubbleMat, BUBBLES);
  bubbles.name = `jar-${store}-bubbles`;
  bubbles.renderOrder = 1;
  bubbles.frustumCulled = false;
  beaker.rise.add(bubbles);
  const seeds = Array.from({ length: BUBBLES }, (_, i) => ({ a: i * 2.39996, r: Ri * (0.62 + 0.3 * ((i * 0.618) % 1)), off: (i * 0.371) % 1, size: 0.0009 + 0.0007 * ((i * 0.43) % 1) }));
  const dummy = new Object3D();
  let bubblePhase = 0;

  const state = { value, scale, flowing: 0 };

  function placeBubbles() {
    const h = Math.min(1, Math.max(0, state.value / state.scale)) * JAR_USABLE_HEIGHT;
    bubbles.visible = h > 0.004;
    seeds.forEach((b, i) => {
      const t = (b.off + bubblePhase * (0.25 + 0.15 * ((i * 0.77) % 1))) % 1;
      const s = b.size * (t < 0.08 ? t / 0.08 : t > 0.92 ? (1 - t) / 0.08 : 1);
      dummy.position.set(Math.sin(b.a + t * 0.8) * b.r, BASE_Y + 0.002 + t * Math.max(0, h - 0.004), Math.cos(b.a + t * 0.8) * b.r);
      dummy.scale.setScalar(Math.max(s, 1e-5));
      dummy.updateMatrix();
      bubbles.setMatrixAt(i, dummy.matrix);
    });
    bubbles.instanceMatrix.needsUpdate = true;
  }

  function applyFill() {
    const frac = Math.min(1, Math.max(0, state.value / state.scale));
    const h = frac * JAR_USABLE_HEIGHT;
    liquid.visible = h > 0.0002;
    liquid.scale.y = Math.max(h, 1e-5);
    placeBubbles();
  }
  applyFill();

  const labelAnchor = new Vector3();

  return {
    group: beaker.group,
    rise: beaker.rise,
    lines: beaker.lines,
    formUniforms: beaker.formUniforms,
    liquid,
    store,
    get value() {
      return state.value;
    },
    get scale() {
      return state.scale;
    },
    /** Set the energy in joules. The fill height follows exactly. */
    setValue(joules) {
      if (!(joules >= -1e-12)) throw new RangeError(`Energy cannot be negative (${joules})`);
      state.value = Math.max(0, joules);
      applyFill();
    },
    setScale(joules) {
      state.scale = joules;
      applyFill();
    },
    /** Fill height in metres for a value (exported for tests and labels). */
    fillHeight(joules = state.value) {
      return Math.min(1, Math.max(0, joules / state.scale)) * JAR_USABLE_HEIGHT;
    },
    /** Fade the glow in (after the draw-in) from 0 to 1. */
    setGlowFade(f) {
      liquid.material.uniforms.uFade.value = f;
      bubbleMat.opacity = f;
    },
    /** Move the pattern while energy flows. Returns true if it moved. */
    animate(dt, flowing) {
      if (!flowing) return false;
      liquid.material.uniforms.uPhase.value += dt * 6; // mm per second
      bubblePhase += dt;
      placeBubbles();
      return true;
    },
    /** World position just above the jar, for its label. */
    labelPoint(target = labelAnchor) {
      return beaker.group.localToWorld(target.set(0, BEAKER.H + 0.012, 0));
    },
    /** World position in front of the jar's base, for a label below it. */
    labelPointBelow(target = labelAnchor) {
      return beaker.group.localToWorld(target.set(0, 0, BEAKER.R + 0.004));
    },
    /** World points bounding the glow, for keeping labels off it. */
    glowCorners() {
      const h = BASE_Y + state.value / state.scale * JAR_USABLE_HEIGHT;
      const pts = [];
      for (const y of [BASE_Y, Math.min(h, TOP_Y)]) for (const [x, z] of [[-Ri, 0], [Ri, 0], [0, -Ri], [0, Ri]]) {
        pts.push(beaker.group.localToWorld(new Vector3(x, y, z)));
      }
      return state.value > 0 ? pts : [];
    },
  };
}

/** Pure helper for tests: fill fraction for a value on a page scale. */
export function fillFraction(joules, scale) {
  return Math.min(1, Math.max(0, joules / scale));
}
