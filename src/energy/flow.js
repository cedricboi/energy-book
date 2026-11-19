// src/energy/flow.js
// A transfer between stores: glowing particles moving along a curved path
// (CatmullRomCurve3), with one look per pathway (CLAUDE.md section 4):
//   mechanical  arrow-head particles, solid path with an arrow at the end
//   electrical  small bright dots, a double "current" path
//   heating     soft shimmering blobs, a wavy path
//   waves       expanding rings, a dotted path of ripples
//
// Accounting: energy leaves the source the moment it is emitted, travels as
// packets, and arrives at the destination when a packet lands. At every
// frame, source + in transit + destination is unchanged. TransferLedger is
// the pure part (tested). FlowPath adds the visuals.
import {
  BufferGeometry, Float32BufferAttribute, Points, ShaderMaterial, CatmullRomCurve3, Vector3, Color, AdditiveBlending,
  TubeGeometry, Mesh,
} from 'three';
import { glowColour, PATHWAYS } from './palette.js';
import { createInkLines, polylineToSegments } from '../ink/creases.js';
import { inkUniforms } from '../ink/inkMaterial.js';

/** Packets of energy in transit. Pure, no three.js. */
export class TransferLedger {
  constructor(travelSeconds = 0.9) {
    this.travel = travelSeconds;
    this.packets = [];
  }
  /** Energy leaves the source now. */
  emit(joules) {
    if (joules > 0) this.packets.push({ amount: joules, age: 0 });
  }
  /** Advance time. Returns the energy that arrived during this step. */
  step(dt) {
    let arrived = 0;
    for (const p of this.packets) p.age += dt;
    this.packets = this.packets.filter((p) => {
      if (p.age >= this.travel) {
        arrived += p.amount;
        return false;
      }
      return true;
    });
    return arrived;
  }
  get inTransit() {
    return this.packets.reduce((s, p) => s + p.amount, 0);
  }
  clear() {
    this.packets.length = 0;
  }
}

const MAX_POINTS = 160;

// The glowing tube along a transfer (docs/TECHNIQUES.md A6, our own take).
// Its colour runs from the source store to the destination store the short
// way round the colour wheel, so it never turns a muddy grey. Each pathway
// moves differently: a ripple (mechanical), sharp pulses (electrical), a
// shimmer (heating) and dashes (waves).
const HSV_GLSL = /* glsl */ `
vec3 el_rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}
vec3 el_hsv2rgb(vec3 c) {
  vec3 p = abs(fract(c.xxx + vec3(1.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0);
  return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y);
}
`;

function tubeMaterial(style, from, to, radius) {
  return new ShaderMaterial({
    uniforms: {
      uFrom: { value: from },
      uTo: { value: to },
      uTime: { value: 0 },
      uActive: { value: 0 },
      uStyle: { value: style },
      uRadius: { value: radius },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uStyle;
      uniform float uRadius;
      varying float vU;
      varying vec3 vNW;
      varying vec3 vWorld;
      void main() {
        vU = uv.x;
        // Taper both ends to under half the radius.
        float taper = mix(0.45, 1.0, smoothstep(0.0, 0.14, min(uv.x, 1.0 - uv.x)));
        // Heating: the tube's width wavers.
        if (uStyle > 1.5 && uStyle < 2.5) taper *= 0.85 + 0.25 * sin(uv.x * 40.0 - uTime * 7.0);
        vec3 centre = position - normal * uRadius;
        vec3 p = centre + normal * uRadius * taper;
        vec4 w = modelMatrix * vec4(p, 1.0);
        vWorld = w.xyz;
        vNW = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uFrom;
      uniform vec3 uTo;
      uniform float uTime;
      uniform float uActive;
      uniform float uStyle;
      varying float vU;
      varying vec3 vNW;
      varying vec3 vWorld;
      ${HSV_GLSL}
      void main() {
        // Colour: the short way round the hue circle, blended widely for
        // nearby hues and sharply for distant ones.
        vec3 a = el_rgb2hsv(uFrom);
        vec3 b = el_rgb2hsv(uTo);
        float dh = b.x - a.x;
        dh -= floor(dh + 0.5);
        float wide = mix(0.36, 0.05, smoothstep(0.08, 0.3, abs(dh)));
        float k = smoothstep(0.5 - wide, 0.5 + wide, vU);
        vec3 hsv = vec3(fract(a.x + dh * k), mix(a.y, b.y, k), mix(a.z, b.z, k));
        vec3 col = el_hsv2rgb(hsv);
        float facing = abs(dot(normalize(vNW), normalize(cameraPosition - vWorld)));
        float bright = 0.55 + 0.45 * facing;
        float m = 1.0;
        if (uStyle < 0.5) m = 0.72 + 0.28 * sin((vU * 14.0 - uTime * 3.0) * 6.2832);
        else if (uStyle < 1.5) m = 0.5 + 1.1 * pow(fract(vU * 5.0 - uTime * 2.6), 10.0);
        else if (uStyle < 2.5) m = 0.8 + 0.2 * sin(vU * 31.0 + uTime * 9.0);
        else { if (fract(vU * 9.0 - uTime * 2.2) > 0.55) discard; }
        gl_FragColor = vec4(col * bright * m * 1.45 * uActive, uActive);
      }`,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });
}

function particleMaterial(style) {
  return new ShaderMaterial({
    uniforms: {
      uInkPx: inkUniforms.uInkPx,
      uSize: { value: [8, 6, 10, 14][style] },
      uStyle: { value: style },
    },
    vertexShader: /* glsl */ `
      uniform float uInkPx;
      uniform float uSize;
      attribute vec3 aColor;
      attribute vec3 aDir;
      attribute float aLife;
      varying vec3 vColor;
      varying float vAngle;
      varying float vLife;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        vec4 ahead = projectionMatrix * modelViewMatrix * vec4(position + aDir * 0.01, 1.0);
        vec2 d = ahead.xy / ahead.w - gl_Position.xy / gl_Position.w;
        vAngle = atan(d.y, d.x);
        vColor = aColor;
        vLife = aLife;
        gl_PointSize = uSize * uInkPx;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uStyle;
      varying vec3 vColor;
      varying float vAngle;
      varying float vLife;
      void main() {
        vec2 p = gl_PointCoord * 2.0 - 1.0;
        p.y = -p.y;
        float a = 0.0;
        if (uStyle < 0.5) {
          // Arrow head pointing along the path.
          float c = cos(-vAngle), s = sin(-vAngle);
          vec2 q = vec2(c * p.x - s * p.y, s * p.x + c * p.y);
          float chevron = abs(q.y) * 1.1 + q.x * -0.9;
          a = step(abs(chevron - 0.15), 0.28) * step(abs(q.y), 0.8) * step(-0.75, q.x) * step(q.x, 0.75);
        } else if (uStyle < 1.5) {
          a = 1.0 - smoothstep(0.55, 0.8, length(p));
        } else if (uStyle < 2.5) {
          a = (1.0 - smoothstep(0.1, 1.0, length(p))) * 0.85;
        } else {
          // A ring that grows as it travels.
          float r = mix(0.35, 0.85, vLife);
          a = 1.0 - smoothstep(0.08, 0.2, abs(length(p) - r));
        }
        if (a < 0.02) discard;
        gl_FragColor = vec4(vColor * a, 1.0);
      }`,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
  });
}

/**
 * @param {object} o
 * @param {Vector3} o.from   world point where energy leaves (top of the source jar)
 * @param {Vector3} o.to     world point where it arrives
 * @param {string} o.pathway id from PATHWAYS
 * @param {string} o.fromStore
 * @param {string} o.toStore
 * @param {number} [o.arc]   how far the path bows out (m)
 * @param {Vector3} [o.bulge] direction the path bows towards (default up)
 * @param {number} [o.travel] seconds for a packet to cross
 */
export function createFlowPath({ from, to, pathway, fromStore, toStore, arc = 0.05, bulge = new Vector3(0, 1, 0), travel = 0.9 }) {
  const style = PATHWAYS[pathway].style;
  const b = bulge.clone().normalize();
  const mid = from.clone().lerp(to, 0.5).addScaledVector(b, arc);
  const curve = new CatmullRomCurve3([
    from.clone(),
    from.clone().lerp(mid, 0.55).addScaledVector(b, arc * 0.35),
    mid,
    to.clone().lerp(mid, 0.55).addScaledVector(b, arc * 0.35),
    to.clone(),
  ], false, 'centripetal');
  const ledger = new TransferLedger(travel);

  // The ink path, styled by pathway.
  const N = 80;
  const up = new Vector3(0, 1, 0);
  const side = new Vector3();
  const pts = [];
  for (let i = 0; i <= N; i++) pts.push(curve.getPointAt(i / N));
  const offsetLine = (amount, wave = 0) => pts.map((p, i) => {
    const t = curve.getTangentAt(i / N);
    side.crossVectors(t, up).normalize();
    const w = wave ? Math.sin((i / N) * Math.PI * 2 * wave) * amount : amount;
    return p.clone().addScaledVector(side, w);
  });
  let segs = [];
  if (style === 0) {
    segs = polylineToSegments(pts);
    const tip = pts[N];
    const back = curve.getTangentAt(1).multiplyScalar(-0.008);
    side.crossVectors(curve.getTangentAt(1), up).normalize().multiplyScalar(0.005);
    const a1 = tip.clone().add(back).add(side);
    const a2 = tip.clone().add(back).sub(side);
    segs.push(tip.x, tip.y, tip.z, a1.x, a1.y, a1.z, tip.x, tip.y, tip.z, a2.x, a2.y, a2.z);
  } else if (style === 1) {
    segs = [...polylineToSegments(offsetLine(0.0018)), ...polylineToSegments(offsetLine(-0.0018))];
  } else if (style === 2) {
    segs = polylineToSegments(offsetLine(0.003, 9));
  } else {
    // Dotted ripples: short dashes with gaps.
    for (let i = 0; i < N; i += 4) segs.push(...polylineToSegments(pts.slice(i, i + 2)));
  }
  const pathLine = createInkLines(segs, { widthScale: 0.6, chain: style !== 3 });
  pathLine.material.opacity = 0.75;
  pathLine.material.transparent = true;

  // The glowing tube: a child of the ink path, so it shows and hides with it.
  // It glows while energy moves along it, then fades out.
  const span = from.distanceTo(to);
  const radius = Math.min(0.0014, Math.max(0.0007, span * 0.02));
  const tube = new Mesh(
    new TubeGeometry(curve, 72, radius, 10, false),
    tubeMaterial(style, new Color(...glowColour(fromStore, 1.6)), new Color(...glowColour(toStore, 1.6)), radius),
  );
  tube.name = 'energy-tube';
  tube.renderOrder = 4;
  tube.visible = false;
  tube.frustumCulled = false;
  pathLine.add(tube);
  let glow = 0;
  let lastNow = 0;
  function updateTube() {
    const now = performance.now() / 1000;
    const dt = lastNow ? Math.min(0.1, now - lastNow) : 0;
    lastNow = now;
    const target = ledger.packets.length > 0 ? 1 : 0;
    glow += (target - glow) * Math.min(1, dt * (target ? 8 : 3));
    if (target === 0 && glow < 0.01) glow = 0;
    tube.material.uniforms.uActive.value = glow;
    tube.material.uniforms.uTime.value += dt;
    tube.visible = glow > 0;
  }

  // Particles.
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(new Float32Array(MAX_POINTS * 3), 3));
  geo.setAttribute('aColor', new Float32BufferAttribute(new Float32Array(MAX_POINTS * 3), 3));
  geo.setAttribute('aDir', new Float32BufferAttribute(new Float32Array(MAX_POINTS * 3), 3));
  geo.setAttribute('aLife', new Float32BufferAttribute(new Float32Array(MAX_POINTS), 1));
  geo.setDrawRange(0, 0);
  const points = new Points(geo, particleMaterial(style));
  points.frustumCulled = false;
  points.renderOrder = 5;

  const cFrom = new Color(...glowColour(fromStore, 2.2));
  const cTo = new Color(...glowColour(toStore, 2.2));
  const tmp = new Color();
  const p = new Vector3();

  function updateVisuals(slow = 1) {
    updateTube();
    // Show at most MAX_POINTS packets, oldest first.
    const list = ledger.packets.slice(-MAX_POINTS);
    const pos = geo.attributes.position;
    const col = geo.attributes.aColor;
    const dir = geo.attributes.aDir;
    const life = geo.attributes.aLife;
    list.forEach((pk, i) => {
      const u = Math.min(1, pk.age / ledger.travel);
      curve.getPointAt(u, p);
      if (style === 2) {
        const t = curve.getTangentAt(u);
        side.crossVectors(t, up).normalize();
        p.addScaledVector(side, Math.sin(u * Math.PI * 2 * 9) * 0.003);
        p.y += Math.sin(u * 40 + i) * 0.0008;
      }
      pos.setXYZ(i, p.x, p.y, p.z);
      tmp.copy(cFrom).lerp(cTo, u);
      col.setXYZ(i, tmp.r, tmp.g, tmp.b);
      const t = curve.getTangentAt(u);
      dir.setXYZ(i, t.x, t.y, t.z);
      life.setX(i, u);
    });
    geo.setDrawRange(0, list.length);
    pos.needsUpdate = col.needsUpdate = dir.needsUpdate = life.needsUpdate = true;
    return slow;
  }

  return {
    curve,
    ledger,
    pathLine,
    points,
    pathway,
    /** Energy leaves the source now (joules). */
    emit(joules) {
      ledger.emit(joules);
    },
    /** Advance; returns joules that arrived. */
    step(dt) {
      const arrived = ledger.step(dt);
      updateVisuals();
      return arrived;
    },
    get inTransit() {
      return ledger.inTransit;
    },
    get active() {
      return ledger.packets.length > 0;
    },
    /** True while the tube is still glowing (it fades after the energy lands). */
    get glowing() {
      return ledger.packets.length > 0 || glow > 0;
    },
    tube,
    clear() {
      ledger.clear();
      updateVisuals();
    },
  };
}
