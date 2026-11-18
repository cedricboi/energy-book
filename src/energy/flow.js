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

function particleMaterial(style) {
  return new ShaderMaterial({
    uniforms: {
      uInkPx: inkUniforms.uInkPx,
      uSize: { value: [11, 7, 13, 18][style] },
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
 * @param {number} [o.arc]   how high the path rises (m)
 * @param {number} [o.travel] seconds for a packet to cross
 */
export function createFlowPath({ from, to, pathway, fromStore, toStore, arc = 0.05, travel = 0.9 }) {
  const style = PATHWAYS[pathway].style;
  const mid = from.clone().lerp(to, 0.5);
  mid.y += arc;
  const curve = new CatmullRomCurve3([
    from.clone(),
    from.clone().lerp(mid, 0.55).add(new Vector3(0, arc * 0.35, 0)),
    mid,
    to.clone().lerp(mid, 0.55).add(new Vector3(0, arc * 0.35, 0)),
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
    clear() {
      ledger.clear();
      updateVisuals();
    },
  };
}
