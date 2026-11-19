// src/ink/creases.js
// Ink lines, drawn as ribbons: each stroke is a strip of quads that always
// faces the screen, built in the vertex shader from each point and its two
// neighbours, so corners mitre neatly and the width is set in screen pixels.
// What makes them feel drawn by hand (our own take, see docs/TECHNIQUES.md):
//   - the width swells and thins slowly along each stroke (value noise)
//   - both ends of a stroke taper
//   - open strokes overshoot their ends a little, like a draughtsman's line
//   - a fixed low wobble (under 0.6 px) that never shimmers
// The pen: every stroke gets its own slot in the draw-in, so a drawing inks
// itself stroke by stroke (drawIn.js sets uPen from 0 to 1).
//   - creases from EdgesGeometry (about 30 degrees)
//   - any extra polylines an object wants (rim rings, profile lines)
import { EdgesGeometry, BufferGeometry, Float32BufferAttribute, Uint32BufferAttribute, Mesh, ShaderMaterial, Vector3, DoubleSide } from 'three';
import { inkUniforms, NOISE3_GLSL } from './inkMaterial.js';

const OVERSHOOT_MAX = 0.0012; // m, at most this far past an open stroke's end
const OVERSHOOT_FRAC = 0.06; // or this fraction of the stroke
const TAPER = 0.0045; // m, length of the taper at each end (at most 25% of the stroke)

const VERT = /* glsl */ `
uniform vec2 uResolution;
uniform float uInkPx;
uniform float uCreasePx;
uniform float uWobblePx;
uniform float uWobbleFreq;
uniform float uWidthScale;
attribute vec3 aPrev;
attribute vec3 aNext;
attribute float aSide;
attribute float aArc;     // distance along the stroke (m)
attribute float aLen;     // stroke length (m)
attribute vec2 aPen;      // this stroke's slot in the draw-in (0 to 1)
attribute float aSeed;
varying float vDist;
varying float vHalf;
varying float vArcFrac;
varying vec2 vPen;
varying float vFaint;
#include <clipping_planes_pars_vertex>
${NOISE3_GLSL}
vec2 toScreen(vec4 c) { return c.xy / c.w * uResolution * 0.5; }
void main() {
  mat4 mvp = projectionMatrix * modelViewMatrix;
  vec4 c = mvp * vec4(position, 1.0);
  vec2 s = toScreen(c);
  vec2 sp = toScreen(mvp * vec4(aPrev, 1.0));
  vec2 sn = toScreen(mvp * vec4(aNext, 1.0));
  vec2 dA = s - sp;
  vec2 dB = sn - s;
  if (dot(dA, dA) < 1e-8) dA = dB;
  if (dot(dB, dB) < 1e-8) dB = dA;
  dA = normalize(dA + 1e-9);
  dB = normalize(dB + 1e-9);
  vec2 t = normalize(dA + dB + 1e-9);
  vec2 n = vec2(-t.y, t.x);
  float m = 1.0 / max(dot(n, vec2(-dA.y, dA.x)), 0.4); // mitre, clamped to 2.5x
  // Width: a slow swell along the stroke, a finer flutter, and tapered ends.
  float swell = 0.82 + 0.34 * el_vn3(vec3(aArc * 30.0, aSeed, 0.0)) + 0.1 * el_vn3(vec3(aArc * 140.0, aSeed * 1.7, 3.0));
  float taperLen = min(${TAPER}, aLen * 0.25);
  float ends = min(aArc, aLen - aArc);
  float taper = mix(0.42, 1.0, smoothstep(0.0, max(taperLen, 1e-5), ends));
  float w = uCreasePx * uInkPx * uWidthScale * swell * taper;
  // A line finer than a pixel keeps a one-pixel core and gets fainter instead,
  // so fine lines read as fine rather than breaking up.
  float wDraw = max(w, 1.0);
  vFaint = w / wDraw;
  vHalf = 0.5 * wDraw;
  float pad = vHalf + 1.0; // one pixel of room for the antialiased edge
  vDist = aSide * pad;
  vec2 off = n * m * aSide * pad;
  // A fixed wobble from the position, so it never moves between frames.
  vec3 q = position * uWobbleFreq;
  off += (vec2(el_vn3(q), el_vn3(q + 31.7)) - 0.5) * 2.0 * uWobblePx * uInkPx;
  c.xy += off / (uResolution * 0.5) * c.w;
  gl_Position = c;
  vArcFrac = aLen > 0.0 ? aArc / aLen : 0.0;
  vPen = aPen;
  // A cutaway's plane trims lines as well as surfaces.
  #if NUM_CLIPPING_PLANES > 0
  vClipPosition = -(modelViewMatrix * vec4(position, 1.0)).xyz;
  #endif
}
`;

const FRAG = /* glsl */ `
uniform vec3 uInkColor;
uniform float uPen;
uniform float uOpacity;
varying float vDist;
varying float vHalf;
varying float vArcFrac;
varying vec2 vPen;
varying float vFaint;
#include <clipping_planes_pars_fragment>
void main() {
  #include <clipping_planes_fragment>
  // The pen: this stroke is drawn as far as its share of the draw-in allows.
  float local = clamp((uPen - vPen.x) / max(vPen.y - vPen.x, 1e-5), 0.0, 1.0);
  if (vArcFrac > local + 1e-4) discard;
  float a = clamp(vHalf + 0.5 - abs(vDist), 0.0, 1.0);
  if (a <= 0.0) discard;
  gl_FragColor = vec4(uInkColor, a * vFaint * uOpacity);
  #include <colorspace_fragment>
}
`;

/** A ribbon material. `opacity` works like a material property; `uPen` drives the draw-in. */
export function createInkLineMaterial({ widthScale = 1 } = {}) {
  const m = new ShaderMaterial({
    uniforms: {
      uResolution: inkUniforms.uResolution,
      uInkPx: inkUniforms.uInkPx,
      uCreasePx: inkUniforms.uCreasePx,
      uWobblePx: inkUniforms.uWobblePx,
      uWobbleFreq: inkUniforms.uWobbleFreq,
      uInkColor: inkUniforms.uInkColor,
      uWidthScale: { value: widthScale },
      uPen: { value: 1 },
      uOpacity: { value: 1 },
    },
    clipping: true,
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    // Sit just in front of the surface the line is drawn on.
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -4,
  });
  Object.defineProperty(m, 'opacity', {
    get: () => m.uniforms?.uOpacity.value ?? 1,
    set: (v) => {
      if (m.uniforms) m.uniforms.uOpacity.value = v;
    },
  });
  m.userData.widthScale = widthScale;
  m.isInkRibbon = true;
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

/** Split segment pairs into polylines wherever one segment does not start where the last ended. */
export function segmentsToPolylines(positions, tolerance = 1e-7) {
  const lines = [];
  let cur = null;
  for (let i = 0; i < positions.length; i += 6) {
    const a = new Vector3(positions[i], positions[i + 1], positions[i + 2]);
    const b = new Vector3(positions[i + 3], positions[i + 4], positions[i + 5]);
    if (cur && cur[cur.length - 1].distanceToSquared(a) < tolerance * tolerance) cur.push(b);
    else {
      cur = [a, b];
      lines.push(cur);
    }
  }
  return lines;
}

/** Build the ribbon geometry for polylines, with each stroke's slot in the pen's draw-in. */
export function ribbonGeometry(polylines, { overshoot = true } = {}) {
  const pos = [];
  const prev = [];
  const next = [];
  const side = [];
  const arc = [];
  const len = [];
  const pen = [];
  const seed = [];
  const index = [];
  const strokes = polylines.filter((p) => p.length >= 2).map((p) => {
    const closed = p.length > 2 && p[0].distanceToSquared(p[p.length - 1]) < 1e-14;
    const pts = p.map((v) => v.clone());
    let L = 0;
    for (let i = 1; i < pts.length; i++) L += pts[i].distanceTo(pts[i - 1]);
    if (overshoot && !closed && L > 0) {
      const o = Math.min(OVERSHOOT_MAX, L * OVERSHOOT_FRAC);
      const d0 = pts[0].clone().sub(pts[1]).normalize();
      const d1 = pts[pts.length - 1].clone().sub(pts[pts.length - 2]).normalize();
      pts[0].addScaledVector(d0, o);
      pts[pts.length - 1].addScaledVector(d1, o);
      L += 2 * o;
    }
    return { pts, closed, L };
  });
  // Each stroke's share of the draw-in grows with its length, within limits,
  // and ends with a short gap, like a pen lifting and moving on.
  const GAP = 0.004;
  const weight = (L) => Math.min(Math.max(L, 0.004), 0.06) + GAP;
  const total = strokes.reduce((a, s) => a + weight(s.L), 0) || 1;
  let t = 0;
  let base = 0;
  strokes.forEach((s, si) => {
    const w = weight(s.L);
    const p0 = t / total;
    const p1 = (t + w - GAP) / total;
    t += w;
    const { pts, closed, L } = s;
    const n = pts.length;
    let a = 0;
    for (let i = 0; i < n; i++) {
      if (i > 0) a += pts[i].distanceTo(pts[i - 1]);
      const pr = i > 0 ? pts[i - 1] : closed ? pts[n - 2] : pts[0].clone().multiplyScalar(2).sub(pts[1]);
      const nx = i < n - 1 ? pts[i + 1] : closed ? pts[1] : pts[n - 1].clone().multiplyScalar(2).sub(pts[n - 2]);
      for (const sd of [-1, 1]) {
        pos.push(pts[i].x, pts[i].y, pts[i].z);
        prev.push(pr.x, pr.y, pr.z);
        next.push(nx.x, nx.y, nx.z);
        side.push(sd);
        arc.push(a);
        len.push(L);
        pen.push(p0, p1);
        seed.push(si * 7.31 + 0.5);
      }
      if (i < n - 1) {
        const v = base + i * 2;
        index.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
      }
    }
    base += n * 2;
  });
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('aPrev', new Float32BufferAttribute(prev, 3));
  g.setAttribute('aNext', new Float32BufferAttribute(next, 3));
  g.setAttribute('aSide', new Float32BufferAttribute(side, 1));
  g.setAttribute('aArc', new Float32BufferAttribute(arc, 1));
  g.setAttribute('aLen', new Float32BufferAttribute(len, 1));
  g.setAttribute('aPen', new Float32BufferAttribute(pen, 2));
  g.setAttribute('aSeed', new Float32BufferAttribute(seed, 1));
  g.setIndex(new Uint32BufferAttribute(index, 1));
  g.computeBoundingSphere();
  return { geometry: g, totalLength: strokes.reduce((x, s) => x + s.L, 0), strokes: strokes.length };
}

/** Ink lines from a flat array of segment pairs. */
export function createInkLines(positions, { widthScale = 1, chain = true } = {}) {
  const polylines = segmentsToPolylines(chain ? chainSegments(positions) : positions);
  const { geometry, totalLength, strokes } = ribbonGeometry(polylines, { overshoot: chain });
  const lines = new Mesh(geometry, createInkLineMaterial({ widthScale }));
  lines.userData.totalLength = totalLength;
  lines.userData.strokes = strokes;
  lines.castShadow = false;
  lines.frustumCulled = false;
  lines.isInkLines = true;
  lines.renderOrder = 10;
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
