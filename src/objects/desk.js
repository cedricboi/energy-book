// src/objects/desk.js
// A dark wooden desk top, with procedural grain (no image files).
import { Mesh, BoxGeometry, MeshStandardMaterial, Color } from 'three';
import { injectVaryings } from '../ink/paper.js';

export const DESK_HEX = '#3A2A20';

function woodMaterial(hex = DESK_HEX) {
  const m = new MeshStandardMaterial({ color: new Color(hex), roughness: 0.62, metalness: 0 });
  m.onBeforeCompile = (shader) => {
    injectVaryings(shader);
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      /* glsl */ `#include <color_fragment>
      {
        // Grain runs along x. Boards are 0.14 m wide, each with its own figure.
        vec2 p = vElWorld.xz;
        float board = floor(p.y / 0.14);
        float seed = el_hash(vec2(board, 3.0)) * 50.0;
        float warp = el_fbm(vec2(p.x * 2.5 + seed, p.y * 9.0)) * 2.0;
        float rings = sin((p.y * 90.0 + warp * 7.0 + seed) ) * 0.5 + 0.5;
        float streak = el_fbm(vec2(p.x * 4.0 + seed, p.y * 160.0));
        float tone = mix(0.78, 1.18, rings * 0.55 + streak * 0.45);
        // Thin dark seam between boards.
        float seam = smoothstep(0.0012, 0.0, abs(fract(p.y / 0.14 + 0.5) - 0.5) * 0.14);
        vec3 c = diffuseColor.rgb * tone;
        c *= 1.0 - seam * 0.55;
        c *= 0.94 + 0.12 * el_hash(vec2(board, 9.0));
        diffuseColor.rgb = c;
      }`,
    );
  };
  m.customProgramCacheKey = () => 'el-wood';
  return m;
}

/**
 * @param {object} o
 * @param {number} o.backZ z of the desk's back edge (against the wall)
 */
export function createDesk({ backZ, color }) {
  const width = 2.0;
  const depth = 1.1;
  const thickness = 0.035;
  const desk = new Mesh(new BoxGeometry(width, thickness, depth), woodMaterial(color));
  desk.position.set(0, -thickness / 2, backZ + depth / 2);
  desk.receiveShadow = true;
  desk.name = 'desk';
  return desk;
}
