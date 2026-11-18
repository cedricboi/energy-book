// src/ink/creases.js
// Ink lines drawn with LineSegments2 and LineMaterial, so they can be thicker
// than 1 px (CLAUDE.md section 4):
//   - creases from EdgesGeometry (about 30 degrees)
//   - any extra polylines an object wants (rim rings, profile lines)
// Every line gets a fixed, low-frequency wobble of under 0.6 px, so it feels
// hand-drawn but never shimmers. The wobble is computed from the vertex
// position, so it does not change from frame to frame.
//
// Lines are dashed from the start, which is how drawIn.js makes them draw
// themselves: dashSize grows from 0 to the total line length.
import { EdgesGeometry } from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { inkUniforms, registerLineMaterial, NOISE3_GLSL, INK_HEX } from './inkMaterial.js';

export function createInkLineMaterial({ widthScale = 1 } = {}) {
  const m = new LineMaterial({
    color: INK_HEX,
    linewidth: 1,
    worldUnits: false,
    dashed: true,
    dashSize: 1e6,
    gapSize: 1e6,
    dashOffset: 0,
    transparent: false,
  });
  m.userData.widthScale = widthScale;
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uWobblePx = inkUniforms.uWobblePx;
    shader.uniforms.uWobbleFreq = inkUniforms.uWobbleFreq;
    shader.uniforms.uInkPx = inkUniforms.uInkPx;
    shader.vertexShader = shader.vertexShader
      .replace(
        'uniform float linewidth;',
        `uniform float linewidth;\nuniform float uWobblePx;\nuniform float uWobbleFreq;\nuniform float uInkPx;\n${NOISE3_GLSL}\nvec2 elWobble(vec3 p) {\n  vec3 q = p * uWobbleFreq;\n  return (vec2(el_vn3(q), el_vn3(q + 31.7)) - 0.5) * 2.0 * uWobblePx * uInkPx;\n}`,
      )
      .replace(
        'vec4 clipEnd = projectionMatrix * end;',
        `vec4 clipEnd = projectionMatrix * end;
        clipStart.xy += elWobble(instanceStart) * (2.0 / resolution) * clipStart.w;
        clipEnd.xy += elWobble(instanceEnd) * (2.0 / resolution) * clipEnd.w;`,
      );
  };
  m.customProgramCacheKey = () => 'el-ink-line';
  registerLineMaterial(m);
  return m;
}

/**
 * Join loose segments into chains, so a line draws itself as continuous
 * strokes rather than scattered dashes. `positions` is a flat array of
 * segment pairs [ax, ay, az, bx, by, bz, ...].
 */
export function chainSegments(positions, tolerance = 1e-6) {
  const segs = [];
  for (let i = 0; i < positions.length; i += 6) segs.push(positions.slice(i, i + 6));
  const key = (x, y, z) => `${Math.round(x / tolerance)},${Math.round(y / tolerance)},${Math.round(z / tolerance)}`;
  const byPoint = new Map();
  segs.forEach((s, i) => {
    for (const [k, end] of [[key(s[0], s[1], s[2]), 0], [key(s[3], s[4], s[5]), 1]]) {
      if (!byPoint.has(k)) byPoint.set(k, []);
      byPoint.get(k).push([i, end]);
    }
  });
  const used = new Uint8Array(segs.length);
  const out = [];
  for (let start = 0; start < segs.length; start++) {
    if (used[start]) continue;
    let [ax, ay, az, bx, by, bz] = segs[start];
    used[start] = 1;
    out.push(ax, ay, az, bx, by, bz);
    // Walk forward from the end point.
    for (;;) {
      const next = (byPoint.get(key(bx, by, bz)) || []).find(([i]) => !used[i]);
      if (!next) break;
      const [i, end] = next;
      used[i] = 1;
      const s = segs[i];
      const [nx, ny, nz] = end === 0 ? [s[3], s[4], s[5]] : [s[0], s[1], s[2]];
      out.push(bx, by, bz, nx, ny, nz);
      [bx, by, bz] = [nx, ny, nz];
    }
  }
  return out;
}

/** Ink lines from a flat array of segment pairs. */
export function createInkLines(positions, { widthScale = 1, chain = true } = {}) {
  const geo = new LineSegmentsGeometry();
  geo.setPositions(chain ? chainSegments(positions) : positions);
  const lines = new LineSegments2(geo, createInkLineMaterial({ widthScale }));
  lines.computeLineDistances();
  // Total drawn length, for the draw-in.
  const d = geo.attributes.instanceDistanceEnd;
  lines.userData.totalLength = d.count ? d.getX(d.count - 1) : 0;
  lines.castShadow = false;
  return lines;
}

/** Crease lines where faces meet at more than `thresholdDeg`. */
export function createCreases(geometry, { thresholdDeg = 30, widthScale = 1 } = {}) {
  const edges = new EdgesGeometry(geometry, thresholdDeg);
  const pos = Array.from(edges.attributes.position.array);
  edges.dispose();
  if (pos.length === 0) return null;
  return createInkLines(pos, { widthScale });
}

/** Turn a polyline (array of Vector3) into segment pairs. */
export function polylineToSegments(points, closed = false) {
  const out = [];
  const n = points.length;
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const a = points[i];
    const b = points[(i + 1) % n];
    out.push(a.x, a.y, a.z, b.x, b.y, b.z);
  }
  return out;
}
