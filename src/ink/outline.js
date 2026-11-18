// src/ink/outline.js
// Inverted-hull silhouette (CLAUDE.md section 4): the back faces of the mesh,
// pushed out along smooth normals in clip space, so the line keeps a constant
// screen width. The hull geometry must be welded (objects/lathe.js does this)
// or the outline cracks at seams.
//
// The hull is drawn after the object's own faces (renderOrder), and depth
// tests against them, so it only shows where it peeks past the silhouette.
import { Mesh, ShaderMaterial, BackSide, Color } from 'three';
import { inkUniforms, NOISE3_GLSL } from './inkMaterial.js';

export function createOutlineMaterial({ widthScale = 1 } = {}) {
  return new ShaderMaterial({
    uniforms: {
      uInkColor: inkUniforms.uInkColor,
      uInkPx: inkUniforms.uInkPx,
      uResolution: inkUniforms.uResolution,
      uOutlinePx: inkUniforms.uOutlinePx,
      uWidthJitter: inkUniforms.uWidthJitter,
      uWidthScale: { value: widthScale },
      uOpacity: { value: 1 },
    },
    vertexShader: /* glsl */ `
      uniform float uInkPx;
      uniform vec2 uResolution;
      uniform float uOutlinePx;
      uniform float uWidthJitter;
      uniform float uWidthScale;
      ${NOISE3_GLSL}
      void main() {
        vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        vec3 nView = normalize(normalMatrix * normal);
        vec2 nClip = (projectionMatrix * vec4(nView, 0.0)).xy;
        float len = length(nClip);
        if (len > 1e-5) {
          nClip /= len;
          // A hand-inked line swells and thins a little along its length.
          float swell = 1.0 + uWidthJitter * (el_vn3(position * 45.0) - 0.5) * 2.0;
          float px = uOutlinePx * uWidthScale * uInkPx * swell;
          clip.xy += nClip * px * 2.0 / uResolution * clip.w;
        }
        gl_Position = clip;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uInkColor;
      uniform float uOpacity;
      void main() {
        gl_FragColor = vec4(uInkColor, uOpacity);
        #include <colorspace_fragment>
      }`,
    side: BackSide,
    transparent: true,
    depthWrite: false,
  });
}

/**
 * Add an outline hull to a mesh.
 * @param {import('three').Mesh} mesh the shaded mesh (its renderOrder is used)
 * @param {import('three').BufferGeometry} hullGeometry welded geometry with smooth normals
 */
export function addOutline(mesh, hullGeometry, options) {
  const hull = new Mesh(hullGeometry, createOutlineMaterial(options));
  hull.renderOrder = mesh.renderOrder + 1;
  hull.name = `${mesh.name || 'mesh'}-outline`;
  hull.castShadow = false;
  hull.receiveShadow = false;
  mesh.add(hull);
  return hull;
}

export const OUTLINE_INK = new Color('#1E1B24');
