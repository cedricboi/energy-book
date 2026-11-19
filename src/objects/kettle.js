// src/objects/kettle.js
// An electric kettle drawn at page size: a rounded body on a flat base, a
// domed lid with a knob, a curved handle at the back and a tapered spout at
// the front. Origin at the middle of the base. The spout points along +x.
import {
  LatheGeometry, TubeGeometry, CylinderGeometry, SphereGeometry, TorusGeometry, Vector2, Vector3, CatmullRomCurve3,
  Mesh, MeshBasicMaterial, ShaderMaterial, Color, DoubleSide,
} from 'three';
import { STORES, PATTERN_INDEX, glowColour } from '../energy/palette.js';
import { PATTERN_GLSL } from '../energy/storeJar.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** @param {number} h height of the body in metres */
export function kettleGeometry(h = 0.055) {
  const r = h * 0.5;
  const profile = [
    [0, 0], [r * 0.92, 0], [r * 0.98, h * 0.06], [r * 1.0, h * 0.35],
    [r * 0.94, h * 0.72], [r * 0.78, h * 0.9], [r * 0.6, h * 0.97], [0, h * 0.97],
  ].map(([x, y]) => new Vector2(x, y));
  const body = new LatheGeometry(profile, 40);
  const lid = new SphereGeometry(r * 0.56, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.45, 1).translate(0, h * 0.96, 0);
  const knob = new CylinderGeometry(r * 0.1, r * 0.13, h * 0.07, 14).translate(0, h * 1.08, 0);
  // Handle: an arc from the shoulder round the back to the lower body.
  const handle = new TubeGeometry(new CatmullRomCurve3([
    new Vector3(-r * 0.7, h * 0.86, 0), new Vector3(-r * 1.35, h * 0.86, 0),
    new Vector3(-r * 1.5, h * 0.55, 0), new Vector3(-r * 1.3, h * 0.25, 0), new Vector3(-r * 0.95, h * 0.2, 0),
  ]), 24, r * 0.11, 10);
  const spout = new CylinderGeometry(r * 0.12, r * 0.26, h * 0.42, 14).rotateZ(-0.85).translate(r * 1.12, h * 0.62, 0);
  const parts = [body, lid, knob, handle, spout].map((g) => {
    const n = g.toNonIndexed();
    n.deleteAttribute('uv');
    return n;
  });
  const g = mergeGeometries(parts);
  g.computeVertexNormals();
  return g;
}

/**
 * What a kettle cutaway shows: the water (its internal store) and the
 * heating element at the bottom. The water is drawn like the energy in the
 * jars: a glowing liquid, brighter at its edges and its surface, carrying
 * the internal store's pattern. It warms from a pale tint to the store's
 * glow as energy arrives. The element glows while it is on. Both are
 * trimmed by the cutaway's plane.
 * @param {number} h  the kettle's body height (as kettleGeometry)
 */
export function kettleInside(h) {
  const r = h * 0.5;
  const fill = h * 0.62;
  const k = 0.93;
  const profile = [
    [0, h * 0.05], [r * 0.9 * k, h * 0.05], [r * 0.97 * k, h * 0.1], [r * 1.0 * k, h * 0.35], [r * 0.97 * k, fill], [0, fill],
  ].map(([x, y]) => new Vector2(x, y));
  const glow = new Color(...glowColour('internal', 1.3));
  const waterMat = new ShaderMaterial({
    uniforms: {
      uCold: { value: new Color(0.36, 0.4, 0.44) },
      uGlow: { value: glow },
      uHeat: { value: 0 },
      uKind: { value: PATTERN_INDEX[STORES.internal.pattern] },
      uFill: { value: fill },
      uR: { value: r * k },
    },
    vertexShader: /* glsl */ `
      #include <clipping_planes_pars_vertex>
      varying vec3 vLocal;
      varying vec3 vWorld;
      varying vec3 vNW;
      void main() {
        vLocal = position;
        vNW = normalize(mat3(modelMatrix) * normal);
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        vec4 mvPosition = viewMatrix * w;
        gl_Position = projectionMatrix * mvPosition;
        #include <clipping_planes_vertex>
      }`,
    fragmentShader: /* glsl */ `
      #include <clipping_planes_pars_fragment>
      uniform vec3 uCold;
      uniform vec3 uGlow;
      uniform float uHeat;
      uniform int uKind;
      uniform float uFill;
      uniform float uR;
      varying vec3 vLocal;
      varying vec3 vWorld;
      varying vec3 vNW;
      ${PATTERN_GLSL}
      void main() {
        #include <clipping_planes_fragment>
        bool top = vLocal.y > uFill - 1e-5;
        vec3 v = normalize(cameraPosition - vWorld);
        float rim = pow(1.0 - abs(dot(normalize(vNW), v)), 2.2);
        float b = 0.66 + 0.45 * rim + 0.25 * vLocal.y / uFill;
        if (top) b = 1.15 + 0.45 * smoothstep(0.6, 1.0, length(vLocal.xz) / uR);
        vec2 p = top ? vWorld.xz * 1000.0 : vec2(atan(vLocal.x, vLocal.z) * uR * 1000.0, vWorld.y * 1000.0);
        float pat = elPattern(uKind, p);
        vec3 c = mix(uCold, uGlow, uHeat) * b * mix(1.0, 0.66, pat * uHeat);
        gl_FragColor = vec4(c, 1.0);
      }`,
    side: DoubleSide,
    clipping: true,
    toneMapped: false,
  });
  const water = new Mesh(new LatheGeometry(profile, 40), waterMat);
  water.name = 'kettle-water';
  const elementMat = new MeshBasicMaterial({ color: new Color(0, 0, 0), toneMapped: false });
  const element = new Mesh(new TorusGeometry(r * 0.45, r * 0.035, 8, 32).rotateX(Math.PI / 2).translate(0, h * 0.08, 0), elementMat);
  element.name = 'kettle-element';
  const on = new Color(...glowColour('internal', 2.4));
  const off = new Color(0.3, 0.27, 0.25);
  return {
    meshes: [water, element],
    /** The cutaway's planes reach the water too. */
    clip(planes) {
      waterMat.clippingPlanes = planes;
      elementMat.clippingPlanes = planes;
    },
    /** heat: 0 cold to 1 fully heated. power: the element is on. */
    set(heat, power) {
      waterMat.uniforms.uHeat.value = Math.min(1, Math.max(0, heat));
      elementMat.color.copy(off).lerp(on, power ? 1 : 0);
    },
  };
}
