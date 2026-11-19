// src/ink/paper.js
// Procedural paper (CLAUDE.md section 4): fbm mottling, a fine tooth, faint
// fibres, a darker gutter near the spine and slightly aged edges. No image
// files. Detail that would be smaller than a pixel fades out (fwidth), so the
// paper never shimmers while the camera moves.
//
// The paper is a MeshLambertMaterial with code injected by onBeforeCompile,
// the same route the hatching shader takes in Phase 3.
import { MeshLambertMaterial, Color, Vector2, DataTexture } from 'three';

export const PAPER_HEX = '#F4EEDF';
export const PAPER_SHADOW_HEX = '#D9CFB8';

// A blank print: one transparent texel, used until a page has text on it.
const BLANK = new DataTexture(new Uint8Array(4), 1, 1);
BLANK.needsUpdate = true;

/** Value noise and fbm shared by every procedural material. */
export const NOISE_GLSL = /* glsl */ `
float el_hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float el_vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = el_hash(i);
  float b = el_hash(i + vec2(1.0, 0.0));
  float c = el_hash(i + vec2(0.0, 1.0));
  float d = el_hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float el_fbm(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    s += a * el_vnoise(p);
    p = p * 2.03 + vec2(17.1, 9.2);
    a *= 0.5;
  }
  return s;
}
`;

/**
 * Add a varying for uv and world position to a built-in material's vertex
 * shader. Used by every procedural material in the book.
 */
export function injectVaryings(shader) {
  shader.vertexShader = shader.vertexShader
    .replace(
      '#include <common>',
      '#include <common>\nvarying vec2 vElUv;\nvarying vec3 vElWorld;',
    )
    .replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\nvElUv = uv;\nvElWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;',
    );
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <common>',
    `#include <common>\nvarying vec2 vElUv;\nvarying vec3 vElWorld;\n${NOISE_GLSL}`,
  );
}

/**
 * Paper for one page surface.
 * @param {object} o
 * @param {number} o.width  page width in metres
 * @param {number} o.height page height in metres
 * @param {number} o.spineU the u coordinate (0 or 1) of the spine edge
 * @param {number} o.seed   offsets the noise so the two pages differ
 */
export function createPaperMaterial({ width, height, spineU, seed = 0 }) {
  const material = new MeshLambertMaterial({ color: new Color(PAPER_HEX) });
  const uniforms = {
    uPageSize: { value: new Vector2(width, height) },
    uSpineU: { value: spineU },
    uSeed: { value: seed },
    uShadowTone: { value: new Color(PAPER_SHADOW_HEX) },
    // The printed text (book/pagePrint.js): a canvas covering the whole
    // page, for the front face and the back face (the turning leaf has
    // both). uPrintFlip says, per face, whether the canvas runs from the
    // fore-edge (a left-hand page) rather than from the spine.
    uPrint: { value: BLANK },
    uPrintBack: { value: BLANK },
    uPrintOn: { value: 0 },
    uPrintFlip: { value: new Vector2(0, 1) },
    // How much of the other side's print shows through (the turning leaf).
    uShowThrough: { value: 0 },
  };
  material.userData.print = uniforms;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    injectVaryings(shader);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform vec2 uPageSize;\nuniform float uSpineU;\nuniform float uSeed;\nuniform vec3 uShadowTone;\nuniform sampler2D uPrint;\nuniform sampler2D uPrintBack;\nuniform float uPrintOn;\nuniform vec2 uPrintFlip;\nuniform float uShowThrough;',
      )
      .replace(
        '#include <color_fragment>',
        /* glsl */ `#include <color_fragment>
        {
          vec2 mm = vElUv * uPageSize * 1000.0 + uSeed * 137.0;
          // Size of one screen pixel in millimetres of paper.
          float pxMm = length(fwidth(mm));
          float fine = 1.0 - smoothstep(0.35, 1.1, pxMm);
          float mid = 1.0 - smoothstep(1.5, 4.0, pxMm);

          float mottle = el_fbm(mm * 0.03);
          float cloud = el_fbm(mm * 0.11 + 3.7);
          float tooth = el_vnoise(mm * 1.1);
          // Fibres: thin streaks, mostly along the page, bent by low noise.
          vec2 fq = mm * vec2(0.07, 0.75) + vec2(el_fbm(mm * 0.04) * 9.0, 0.0);
          float fibre = smoothstep(0.86, 0.97, el_vnoise(fq));
          vec2 fq2 = mm.yx * vec2(0.06, 0.7) + vec2(el_fbm(mm * 0.05 + 11.0) * 9.0, 0.0);
          fibre = max(fibre, 0.7 * smoothstep(0.9, 0.98, el_vnoise(fq2)));

          vec3 c = diffuseColor.rgb;
          c *= 0.955 + 0.06 * mottle;
          c *= 1.0 + (cloud - 0.5) * 0.05 * mid;
          c *= 1.0 + (tooth - 0.5) * 0.045 * fine;
          c = mix(c, uShadowTone * 0.92, fibre * 0.32 * mid);

          // Gutter: the page darkens as it curves down into the spine.
          float dSpine = abs(vElUv.x - uSpineU) * uPageSize.x;
          float gutter = 1.0 - smoothstep(0.0, 0.04, dSpine);
          c *= mix(1.0, 0.72, gutter * gutter);

          // Slightly aged outer edges.
          float dEdge = min(min(vElUv.y, 1.0 - vElUv.y) * uPageSize.y,
                            abs(vElUv.x - (1.0 - uSpineU)) * uPageSize.x);
          c = mix(c * vec3(0.95, 0.92, 0.86), c, smoothstep(0.0, 0.01, dEdge));

          // Printed text. The canvas is premultiplied sRGB, so blending in
          // sRGB and then decoding matches how the browser draws type on
          // paper (multiplying commutes with the gamma curve).
          if (uPrintOn > 0.0) {
            float flip = gl_FrontFacing ? uPrintFlip.x : uPrintFlip.y;
            vec2 pu = vec2(mix(vElUv.x, 1.0 - vElUv.x, flip), vElUv.y);
            vec4 ink = gl_FrontFacing ? texture2D(uPrint, pu) : texture2D(uPrintBack, pu);
            vec3 f = vec3(1.0 - ink.a) + ink.rgb;
            f = pow(max(f, vec3(0.0)), vec3(2.2));
            c *= mix(vec3(1.0), f, uPrintOn);
            // Thin paper: the far side's print shows through, soft and faint.
            // It is the same point of the sheet, so it reads mirrored.
            if (uShowThrough > 0.0) {
              float flipO = gl_FrontFacing ? uPrintFlip.y : uPrintFlip.x;
              vec2 po = vec2(mix(vElUv.x, 1.0 - vElUv.x, flipO), vElUv.y);
              vec4 back = gl_FrontFacing ? texture2D(uPrintBack, po, 2.0) : texture2D(uPrint, po, 2.0);
              vec3 fb = pow(max(vec3(1.0 - back.a) + back.rgb, vec3(0.0)), vec3(2.2));
              c *= mix(vec3(1.0), fb, uShowThrough * uPrintOn);
            }
          }

          diffuseColor.rgb = c;
        }`,
      );
  };
  material.customProgramCacheKey = () => 'el-paper';
  return material;
}

/** The stacked edges of the page block (head, tail and fore-edge). */
export function createPageEdgeMaterial() {
  const material = new MeshLambertMaterial({ color: new Color(PAPER_SHADOW_HEX) });
  material.onBeforeCompile = (shader) => {
    injectVaryings(shader);
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      /* glsl */ `#include <color_fragment>
      {
        // Leaves of paper stacked in y. Lines are 0.3 mm apart and fade out
        // when smaller than a pixel.
        float y = vElWorld.y * 1000.0 / 0.3;
        float w = fwidth(y);
        float leaf = abs(fract(y) - 0.5) * 2.0;
        float line = 1.0 - smoothstep(0.55 - w, 0.55 + w, leaf);
        float visible = 1.0 - smoothstep(0.4, 0.9, w);
        float band = el_fbm(vec2(vElWorld.x * 300.0 + vElWorld.z * 300.0, vElWorld.y * 3000.0));
        vec3 c = diffuseColor.rgb;
        c *= 0.93 + 0.1 * band;
        c *= 1.0 - line * 0.12 * visible;
        diffuseColor.rgb = c;
      }`,
    );
  };
  material.customProgramCacheKey = () => 'el-page-edge';
  return material;
}
