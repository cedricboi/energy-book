// src/ink/inkMaterial.js
// The house ink style (CLAUDE.md section 4).
//
// One shared style drives every ink object: outline width, crease width,
// wobble, hatch spacing and thresholds. All sizes are in "ink pixels": CSS
// pixels at 1366x768, scaled with the viewport so the drawing keeps the same
// proportions at every size, then multiplied by the device pixel ratio.
//
// Hatching is screen-space, injected into MeshLambertMaterial after
// #include <lights_fragment_end>. Tone is the lit luminance divided by the
// light falling on the page at the object's position, so a surface as bright
// as the paper beside it is bare paper, as in a pen drawing:
//   tone > 0.75          bare paper
//   0.75 > tone > 0.5    one hatch layer at 45 degrees
//   0.5 > tone > 0.25    a second layer at -45 degrees
//   tone < 0.25          a third, denser layer
// Lines are anti-aliased with fwidth. The pattern is anchored to each
// object's projected centre, so it moves with the object (no "shower door").
import { MeshLambertMaterial, Color, Vector2, Vector3 } from 'three';

export const INK_HEX = '#1E1B24';

/**
 * The three looks shown to the teacher in Phase 3. Values in ink pixels.
 * The teacher chose C (19 Nov 2026). HOUSE_INK is the default for the book.
 */
export const INK_PRESETS = {
  A: {
    label: 'A. Fine technical pen',
    outlinePx: 1.5, creasePx: 1.1, wobblePx: 0.12, wobbleFreq: 30,
    hatchSpacing: 4.2, hatchWidth: 0.7, hatchJitter: 0.0,
    t1: 0.75, t2: 0.5, t3: 0.25, lightRef: 0.9, flatten: 0.55, widthJitter: 0.1,
    drawInSeconds: 1.1,
  },
  B: {
    label: 'B. Looser, sketchier ink',
    outlinePx: 2.0, creasePx: 1.5, wobblePx: 0.55, wobbleFreq: 45,
    hatchSpacing: 5.6, hatchWidth: 0.95, hatchJitter: 0.9,
    t1: 0.75, t2: 0.5, t3: 0.25, lightRef: 0.9, flatten: 0.7, widthJitter: 0.45,
    drawInSeconds: 1.3,
  },
  C: {
    label: 'C. Bolder, illustrated',
    outlinePx: 3.0, creasePx: 2.0, wobblePx: 0.3, wobbleFreq: 25,
    hatchSpacing: 6.5, hatchWidth: 1.35, hatchJitter: 0.25,
    t1: 0.75, t2: 0.5, t3: 0.25, lightRef: 0.75, flatten: 0.85, widthJitter: 0.25,
    flatTint: [1.13, 0.98, 0.78],
    drawInSeconds: 1.0,
  },
  // D keeps C's bold outline, but shades lightly: finer, thinner hatching
  // that only starts in real shadow, so objects read as white paper forms.
  D: {
    label: 'D. Bold outline, light shading',
    outlinePx: 2.8, creasePx: 1.7, wobblePx: 0.3, wobbleFreq: 25,
    hatchSpacing: 5.2, hatchWidth: 0.8, hatchJitter: 0.25,
    t1: 0.52, t2: 0.24, t3: 0.08, lightRef: 0.72, flatten: 0.985, widthJitter: 0.25,
    // Body colours are lifted this far towards white paper, so objects read
    // as white forms with ink, not as tan ones.
    bodyLift: 0.5,
    // The shaded side keeps the paper's colour instead of turning brown.
    flatTint: [1.04, 1.0, 0.93],
    drawInSeconds: 1.0,
  },
};

const LUMA = new Vector3(0.2126, 0.7152, 0.0722);
const PAPER_WHITE = new Color('#FBF8F1');

/** Uniforms shared by every ink material, so one change restyles everything. */
export const inkUniforms = {
  uInkColor: { value: new Color(INK_HEX) },
  uInkPx: { value: 1 }, // device pixels per ink pixel
  uResolution: { value: new Vector2(1366, 768) }, // drawing buffer, device pixels
  uOutlinePx: { value: 1.5 },
  uWidthJitter: { value: 0.1 },
  uWobblePx: { value: 0.12 },
  uWobbleFreq: { value: 30 },
  uHatchSpacing: { value: 4.2 },
  uHatchWidth: { value: 0.7 },
  uHatchJitter: { value: 0 },
  uT1: { value: 0.75 },
  uT2: { value: 0.5 },
  uT3: { value: 0.25 },
  uLayers: { value: 3 },
  uLightRef: { value: 0.9 },
  uFlatten: { value: 0.55 },
  uFlatTint: { value: new Vector3(1.13, 0.98, 0.78) },
};

/** The live style, including values that are not uniforms. */
export const HOUSE_INK = 'D';
export const inkStyle = { ...INK_PRESETS[HOUSE_INK], preset: HOUSE_INK };

const lineMaterials = new Set();
const listeners = new Set();

/** Register a LineMaterial so crease width and resolution follow the style. */
export function registerLineMaterial(m) {
  lineMaterials.add(m);
  applyLineStyle(m);
}

function applyLineStyle(m) {
  m.linewidth = inkStyle.creasePx * inkUniforms.uInkPx.value * (m.userData.widthScale ?? 1);
  m.resolution.copy(inkUniforms.uResolution.value);
}

/** Change any style values (from a preset, the debug panel or CLAUDE.md defaults). */
export function setInkStyle(values) {
  Object.assign(inkStyle, values);
  const u = inkUniforms;
  u.uOutlinePx.value = inkStyle.outlinePx;
  u.uWidthJitter.value = inkStyle.widthJitter;
  u.uWobblePx.value = inkStyle.wobblePx;
  u.uWobbleFreq.value = inkStyle.wobbleFreq;
  u.uHatchSpacing.value = inkStyle.hatchSpacing;
  u.uHatchWidth.value = inkStyle.hatchWidth;
  u.uHatchJitter.value = inkStyle.hatchJitter;
  u.uT1.value = inkStyle.t1;
  u.uT2.value = inkStyle.t2;
  u.uT3.value = inkStyle.t3;
  u.uLightRef.value = inkStyle.lightRef;
  u.uFlatten.value = inkStyle.flatten;
  u.uFlatTint.value.fromArray(inkStyle.flatTint ?? [1.13, 0.98, 0.78]);
  for (const m of lineMaterials) applyLineStyle(m);
  for (const fn of listeners) fn(inkStyle);
}

export function usePreset(name) {
  setInkStyle({ ...INK_PRESETS[name], preset: name });
}

export function onInkStyle(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Call on every resize. `width` and `height` are CSS pixels.
 * Ink pixels scale with the viewport so the drawing keeps its proportions.
 */
export function setInkResolution(width, height, dpr, hatchLayers = 3) {
  const scale = Math.sqrt((width * height) / (1366 * 768));
  inkUniforms.uInkPx.value = scale * dpr;
  inkUniforms.uResolution.value.set(Math.round(width * dpr), Math.round(height * dpr));
  inkUniforms.uLayers.value = hatchLayers;
  for (const m of lineMaterials) applyLineStyle(m);
}

/** Small 3D value noise, shared by the outline and line wobble. */
export const NOISE3_GLSL = /* glsl */ `
float el_h3(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float el_vn3(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(el_h3(i), el_h3(i + vec3(1, 0, 0)), f.x),
                 mix(el_h3(i + vec3(0, 1, 0)), el_h3(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(el_h3(i + vec3(0, 0, 1)), el_h3(i + vec3(1, 0, 1)), f.x),
                 mix(el_h3(i + vec3(0, 1, 1)), el_h3(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
`;

const HATCH_GLSL = /* glsl */ `
uniform vec3 uInkColor;
uniform float uInkPx;
uniform float uHatchSpacing;
uniform float uHatchWidth;
uniform float uHatchJitter;
uniform float uT1;
uniform float uT2;
uniform float uT3;
uniform float uLayers;
uniform float uLightRef;
uniform float uFlatten;
uniform vec3 uFlatTint;
uniform vec2 uAnchor;
uniform float uPageLight;
uniform float uMaxLayers;
uniform float uForm;
uniform float uGlassAlpha;
float elInk = 0.0;

float el_hash1(float n) { return fract(sin(n) * 43758.5453); }
float el_n1(float x) {
  float i = floor(x);
  float f = fract(x);
  return mix(el_hash1(i), el_hash1(i + 1.0), f * f * (3.0 - 2.0 * f));
}

// One set of parallel lines. p is in ink pixels, spacing and width too.
float el_hatchSet(vec2 p, float angle, float spacing, float width, float seed) {
  vec2 d = vec2(cos(angle), sin(angle));
  float across = dot(p, vec2(-d.y, d.x));
  float along = dot(p, d);
  float lineIndex = floor(across / spacing + 0.5);
  // A looser hand: each line wanders a little along its length.
  across += (el_n1(along * 0.05 + lineIndex * 7.3 + seed) - 0.5) * uHatchJitter;
  float dist = abs(fract(across / spacing + 0.5) - 0.5) * spacing;
  float aa = max(fwidth(across), 1e-4);
  return 1.0 - smoothstep(width * 0.5 - aa * 0.5, width * 0.5 + aa * 0.5, dist);
}

float el_hatching(vec2 p, float tone) {
  float soft = 0.012;
  float w1 = 1.0 - smoothstep(uT1 - soft, uT1 + soft, tone);
  float w2 = 1.0 - smoothstep(uT2 - soft, uT2 + soft, tone);
  float w3 = 1.0 - smoothstep(uT3 - soft, uT3 + soft, tone);
  float s = uHatchSpacing;
  float w = uHatchWidth;
  float layers = min(uLayers, uMaxLayers);
  float h = w1 * el_hatchSet(p, 0.7853982, s, w, 1.0);
  if (layers > 1.5) h = max(h, w2 * el_hatchSet(p, -0.7853982, s, w, 2.0));
  if (layers > 2.5) h = max(h, w3 * el_hatchSet(p + vec2(0.0, s * 0.7071 * 0.5), 0.7853982, s, w, 3.0));
  return h;
}
`;

/**
 * An ink-shaded material. Glass is transparent with the hatching in solid ink.
 * @param {object} o
 * @param {string} [o.color]  body colour (paper by default)
 * @param {boolean} [o.glass] see-through body
 * @param {number} [o.glassAlpha]
 * @param {number} [o.maxLayers] glass is drawn with one hatch layer at most
 */
export function createInkMaterial({ color = '#F4EEDF', glass = false, glassAlpha = 0.1, maxLayers = glass ? 1 : 3 } = {}) {
  const body = new Color(color);
  if (!glass && inkStyle.bodyLift) body.lerp(PAPER_WHITE, inkStyle.bodyLift);
  const material = new MeshLambertMaterial({
    color: body,
    transparent: glass,
    depthWrite: true,
  });
  const own = {
    uAnchor: { value: new Vector2() },
    uPageLight: { value: 0.6 },
    uMaxLayers: { value: maxLayers },
    uForm: { value: 1 },
    uGlassAlpha: { value: glass ? glassAlpha : 1 },
  };
  material.userData.ink = own;
  if (glass) material.defines = { EL_GLASS: '' };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, inkUniforms, own);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vElObjPos;\nvarying vec3 vElObjN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvElObjPos = transformed;\nvElObjN = objectNormal;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vElObjPos;\nvarying vec3 vElObjN;\n${HATCH_GLSL}`)
      .replace(
        '#include <lights_fragment_end>',
        /* glsl */ `#include <lights_fragment_end>
        {
          const vec3 LUMA = vec3(${LUMA.x}, ${LUMA.y}, ${LUMA.z});
          vec3 lit = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
          float albedo = max(dot(diffuseColor.rgb, LUMA), 1e-3);
          float light = dot(lit, LUMA) / albedo;
          float ref = max(uPageLight * uLightRef, 1e-3);
          float tone = clamp(light / ref, 0.0, 1.0);
          vec2 p = (gl_FragCoord.xy - uAnchor) / uInkPx;
          elInk = el_hatching(p, tone) * uForm;
          #ifdef EL_GLASS
          // Glass: shade only the outer surface. A pen drawing never hatches
          // the inside of the far wall seen through the glass.
          if (length(vElObjN.xz) > 0.3 && length(vElObjPos.xz) > 1e-4
              && dot(normalize(vElObjN.xz), normalize(vElObjPos.xz)) < 0.0) elInk = 0.0;
          #endif
          // Flatten the 3D shading towards the paper, so form is read from
          // the hatching rather than from a smooth gradient.
          // The flat colour takes the warm colour of the lamp-lit page, so a
          // shaded side stays paper-coloured and only the hatching darkens it.
          float flatLight = pow(max(light, 1e-4), 1.0 - uFlatten) * pow(uPageLight, uFlatten);
          vec3 flatColour = diffuseColor.rgb * flatLight * uFlatTint;
          vec3 shaded = lit * (flatLight / max(light, 1e-4));
          reflectedLight.directDiffuse = mix(shaded, flatColour, uFlatten);
          reflectedLight.indirectDiffuse = vec3(0.0);
        }`,
      )
      .replace(
        '#include <opaque_fragment>',
        /* glsl */ `#include <opaque_fragment>
        gl_FragColor.rgb = mix(gl_FragColor.rgb, uInkColor, elInk);
        gl_FragColor.a = mix(uGlassAlpha * uForm, 1.0, elInk);`,
      );
  };
  material.customProgramCacheKey = () => 'el-ink';
  return material;
}

const _v = new Vector3();
const _w = new Vector3();
const _size = new Vector2();
let pageLightAt = () => 0.6;

/**
 * The stage tells the ink how much light falls on the page at a point, in
 * the same units as the shader's `light` (irradiance / pi, luminance).
 */
export function setPageLightProvider(fn) {
  pageLightAt = fn;
}
/**
 * Keep a mesh's hatching anchored to its projected centre. Call once per mesh.
 */
export function anchorHatching(mesh, anchorObject = mesh) {
  const own = mesh.material.userData.ink;
  mesh.onBeforeRender = (renderer, scene, camera) => {
    anchorObject.getWorldPosition(_w);
    own.uPageLight.value = pageLightAt(_w);
    _v.copy(_w).project(camera);
    renderer.getDrawingBufferSize(_size);
    // Snap to whole pixels so the pattern does not crawl.
    own.uAnchor.value.set(Math.round((_v.x * 0.5 + 0.5) * _size.x), Math.round((_v.y * 0.5 + 0.5) * _size.y));
  };
}

// Start every page in the house style.
setInkStyle(inkStyle);
