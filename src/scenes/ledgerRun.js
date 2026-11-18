// src/scenes/ledgerRun.js
// The chapter game scene: a marble machine drawn in ink at 1 : 10. The parts
// a level uses appear left to right: tower, spring launcher, lift, fan, and
// the target (a cup on a post at its height, or a speed gate). After a
// launch, the jars run the machine's accounts and the marble either reaches
// the cup, stalls on the last ramp, or flies over the cup.
import { Group, Vector3, BoxGeometry, CylinderGeometry, SphereGeometry, LatheGeometry, Vector2 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createEnergyKit } from './energyKit.js';
import { createInkObject } from '../ink/inkObject.js';
import { createInkLines, polylineToSegments } from '../ink/creases.js';
import { createSpring } from '../objects/spring.js';
import { pageSurfaceY, BOOK } from '../objects/book.js';
import { LEVELS, evaluate, MARBLE } from '../physics/game.js';
import { heightFromGravitationalPotentialEnergy } from '../physics/equations.js';
import { formatQuantity } from '../physics/format.js';

const fq = formatQuantity;

const S = 1 / 10;
const DURATION = 3.2;

const merge = (parts) => {
  const g = mergeGeometries(parts.map((p) => { const q = p.toNonIndexed(); q.deleteAttribute('uv'); return q; }));
  g.computeVertexNormals();
  return g;
};

export default function createLedgerRunScene(ctx) {
  const z = 0.045;
  const x0 = BOOK.gutter + 0.03;
  const W = (xm, ym = 0) => new Vector3(x0 + xm * S, pageSurfaceY(x0 + xm * S, z) + ym * S, z);
  const kit = createEnergyKit(ctx, {
    stores: ['gravitational', 'elastic', 'chemical', 'kinetic', 'internal'],
    scale: 0.5,
    start: { gravitational: 0, elastic: 0, chemical: 0, kinetic: 0, internal: 0 },
    travel: 0.25,
    jarSize: 0.42,
    rowZ: -0.095,
    caption: 'The machine\'s accounts. The dark line marks the energy put in.',
    transfers: [
      { from: 'gravitational', to: 'kinetic', pathway: 'mechanical', moved: (p, c) => Math.max(0, p.gravitational - c.gravitational) },
      { from: 'elastic', to: 'kinetic', pathway: 'mechanical', moved: (p, c) => Math.max(0, p.elastic - c.elastic) },
      { from: 'chemical', to: 'kinetic', pathway: 'electrical', moved: (p, c) => Math.max(0, p.chemical - c.chemical) },
      { from: 'kinetic', to: 'internal', pathway: 'mechanical', moved: (p, c) => Math.max(0, c.internal - p.internal) },
      { from: 'kinetic', to: 'gravitational', pathway: 'mechanical', moved: (p, c) => Math.max(0, c.gravitational - p.gravitational), bulge: new Vector3(0, -0.3, 1), lift: 0.012 },
    ],
  });

  const params = {};
  let level = LEVELS[0];
  let inputs = {};
  let machine = null;
  const partLabelIds = [];
  const marble = createInkObject(new SphereGeometry(0.004, 18, 12).translate(0, 0.004, 0), { color: '#F1EADB', creaseDeg: false, name: 'marble' });
  ctx.scene.add(marble.group);

  function buildMachine() {
    if (machine) ctx.scene.remove(machine);
    machine = new Group();
    ctx.scene.add(machine);
    const segs = [];
    const floorEnd = 1.72;
    segs.push(...polylineToSegments([W(0, 0), W(floorEnd, 0)]));
    const uses = (id) => level.inputs[id] !== undefined;
    const start = (inputs.height ?? 0) + (level.startHeight ?? 0);
    if (uses('height') || level.startHeight) {
      const tower = createInkObject(new BoxGeometry(0.08, 1, 0.08).translate(0, 0.5, 0), { color: '#E6D7BC', name: 'tower', maxLayers: 1 });
      tower.group.scale.set(S, Math.max(start, 0.01) * S, S);
      tower.group.position.copy(W(0.05, 0));
      machine.add(tower.group);
      segs.push(...polylineToSegments([W(0.09, start), W(0.35, 0)]));
    }
    if (uses('spring')) {
      const sp = createSpring({ length: 0.012, radius: 0.003, wire: 0.0007, turns: 8, name: 'launcher' });
      sp.group.rotation.z = -Math.PI / 2;
      sp.group.position.copy(W(0.38, 0.03));
      machine.add(sp.group);
    }
    if (uses('lift')) {
      const shaft = createInkObject(merge([new BoxGeometry(0.02, 0.6, 0.02).translate(-0.06, 0.3, 0), new BoxGeometry(0.02, 0.6, 0.02).translate(0.06, 0.3, 0), new BoxGeometry(0.14, 0.02, 0.1).translate(0, 0.6, 0)]), { color: '#E3D8C4', name: 'lift' });
      shaft.group.scale.setScalar(S);
      shaft.group.position.copy(W(0.7, 0));
      machine.add(shaft.group);
    }
    if (uses('fan')) {
      const fan = createInkObject(merge([new CylinderGeometry(0.06, 0.06, 0.02, 18).rotateZ(Math.PI / 2).translate(0, 0.08, 0), new BoxGeometry(0.03, 0.08, 0.03).translate(0, 0.04, 0)]), { color: '#E3D8C4', name: 'fan' });
      fan.group.scale.setScalar(S);
      fan.group.position.copy(W(1.0, 0));
      machine.add(fan.group);
    }
    // The target.
    if (level.target.height !== undefined) {
      const h = level.target.height;
      segs.push(...polylineToSegments([W(1.25, 0), W(1.55, h)]));
      const cup = createInkObject(merge([
        new LatheGeometry([[0, 0], [0.05, 0], [0.06, 0.06], [0.055, 0.06], [0.045, 0.006], [0, 0.006]].map(([r, y]) => new Vector2(r, y)), 24),
        new CylinderGeometry(0.008, 0.008, Math.max(h, 0.01), 8).translate(0, -Math.max(h, 0.01) / 2, 0),
      ]), { color: '#EFE6D3', name: 'cup' });
      cup.group.scale.setScalar(S);
      cup.group.position.copy(W(1.62, h));
      machine.add(cup.group);
      ctx.overlay.setHtml('target', `cup, ${formatQuantity(h, 'm', 2)} up`);
    } else {
      const gate = createInkObject(merge([new BoxGeometry(0.02, 0.15, 0.02).translate(0, 0.075, -0.06), new BoxGeometry(0.02, 0.15, 0.02).translate(0, 0.075, 0.06), new BoxGeometry(0.02, 0.02, 0.14).translate(0, 0.15, 0)]), { color: '#EFE6D3', name: 'gate' });
      gate.group.scale.setScalar(S);
      gate.group.position.copy(W(1.45, 0));
      machine.add(gate.group);
      ctx.overlay.setHtml('target', `speed gate, ${formatQuantity(level.target.speed, 'm/s', 2)}`);
    }
    machine.add(createInkLines(segs, { widthScale: 0.8, chain: false }));
    labelParts();
  }

  // Labels on the parts: what each gives, and what each transfers to the
  // internal store. Placed by the part, so the eye goes where the energy moves.
  function labelParts() {
    for (const id of partLabelIds) ctx.overlay.remove(id);
    partLabelIds.length = 0;
    const add = (id, at, html) => {
      partLabelIds.push(id);
      ctx.overlay.add({ id, anchor: () => at, html, gap: 2, kind: 'value' });
    };
    const spot = { tower: W(0.05, 0.15), spring: W(0.38, 0.12), lift: W(0.7, 0.7), fan: W(1.0, 0.22), track: W(0.95, -0.05), ramp: W(1.38, 0.05), first: W(0.22, 0.1) };
    const where = (part) => {
      if (part.includes('lift')) return 'lift';
      if (part.includes('fan')) return 'fan';
      if (part.includes('spring')) return 'spring';
      if (part.includes('first')) return 'first';
      if (part.includes('track')) return 'track';
      return 'ramp';
    };
    const lines = {};
    const push = (k, s) => { (lines[k] ??= []).push(s); };
    if (level.power?.lift) push('lift', `gives ${fq(level.power.lift, 'W', 2)} × t`);
    if (level.power?.fan) push('fan', `gives ${fq(level.power.fan, 'W', 2)} × t`);
    if (level.inputs.spring) push('spring', 'gives the energy you set');
    if (level.startHeight) push('tower', `tower ${fq(level.startHeight, 'm', 2)}`);
    for (const l of level.fixedLoss ?? []) push(where(l.part), `${l.part} loses ${fq(l.joules, 'J', 2)}`);
    if (level.springLoss) push('spring', `loses ${fq(level.springLoss, 'J', 2)} if used`);
    for (const [m, per] of Object.entries(level.perSecondLoss ?? {})) push(m, `loses ${fq(per, 'J', 2)} each second`);
    for (const [k, list] of Object.entries(lines)) add(`part-${k}`, spot[k], list.join('<br>'));
  }

  ctx.overlay.add({ id: 'target', kind: 'part', anchor: () => (level.target.height !== undefined ? W(1.62, level.target.height + 0.12) : W(1.45, 0.25)), html: '', gap: 2 });
  ctx.overlay.add({ id: 'result', anchor: () => W(1.0, 0.75), html: '', gap: 2 });
  ctx.overlay.setVisible('result', false);

  let run = null; // { r, t }
  function startValues() {
    const r = evaluate(level, inputs);
    return { r, v: { gravitational: r.supplied.height, elastic: r.supplied.spring, chemical: r.supplied.lift + r.supplied.fan, kinetic: 0, internal: 0 } };
  }
  function setLevel(n) {
    level = LEVELS[n - 1];
    inputs = Object.fromEntries(Object.entries(level.inputs).map(([id, r]) => [id, r.min]));
    run = null;
    buildMachine();
    resetMarble();
  }
  function resetMarble() {
    const { r, v } = startValues();
    kit.setTotal(r.totalIn);
    kit.set(v);
    marble.group.position.copy(W(0.09, (inputs.height ?? 0) + (level.startHeight ?? 0)));
    ctx.overlay.setVisible('result', false);
  }

  // Marble path for a run: down to the floor, along, and up the last ramp to
  // the height its remaining energy can reach.
  function marbleAt(f, r) {
    const start = (inputs.height ?? 0) + (level.startHeight ?? 0);
    if (f < 0.25) return W(0.09 + (0.35 - 0.09) * (f / 0.25), start * (1 - f / 0.25));
    if (f < 0.7) return W(0.35 + (1.25 - 0.35) * ((f - 0.25) / 0.45), 0);
    const reach = heightFromGravitationalPotentialEnergy(Math.max(0, r.atTarget), MARBLE);
    const g = (f - 0.7) / 0.3;
    if (level.target.height === undefined) return W(1.25 + 0.4 * g, 0);
    const h = level.target.height;
    if (r.result === 'overshoot') return W(1.25 + 0.5 * g, Math.min(reach, h) * g + Math.max(0, reach - h) * Math.sin(Math.PI * g) * 0.5);
    const top = r.result === 'win' ? h : reach;
    return W(1.25 + (1.55 - 1.25) * Math.min(1, top / Math.max(h, 1e-6)) * g, top * g);
  }

  setLevel(1);

  return {
    objects: [...kit.objects, marble],
    cueTargets: { marble: marble.group },
    params,
    actions: {},
    act() {},
    setParam(id, v) {
      if (id === 'level') {
        setLevel(Number(v));
        return;
      }
      inputs[id] = v;
      run = null;
      buildMachine();
      resetMarble();
    },
    /** Launch with the current inputs. Returns the machine's accounts. */
    launch() {
      const r = evaluate(level, inputs);
      resetMarble();
      run = { r, t: 0 };
      return r;
    },
    get level() {
      return level;
    },
    get inputs() {
      return { ...inputs };
    },
    setLocked() {},
    update(dt, { formReady }) {
      let moving = kit.fadeGlow(dt, formReady);
      if (!run) return moving;
      run.t = Math.min(DURATION, run.t + dt * (ctx.reducedMotion ? 0.5 : 1));
      const f = run.t / DURATION;
      const { r, v } = startValues();
      // The accounts, in three steps: inputs to kinetic, losses to internal,
      // kinetic to gravitational on the last climb.
      const a = Math.min(1, f / 0.35);
      const b = Math.min(1, Math.max(0, (f - 0.25) / 0.45));
      const c = Math.min(1, Math.max(0, (f - 0.7) / 0.3));
      const climb = level.target.height !== undefined ? Math.min(r.atTarget, r.result === 'overshoot' ? r.atTarget : r.atTarget) * c : 0;
      const now = {
        gravitational: v.gravitational * (1 - a) + Math.max(0, climb),
        elastic: v.elastic * (1 - a),
        chemical: v.chemical * (1 - a),
        internal: r.totalLost * b,
      };
      now.kinetic = Math.max(0, r.totalIn - now.gravitational - now.elastic - now.chemical - now.internal);
      const flowing = kit.step(now, dt, dt);
      marble.group.position.copy(marbleAt(f, r));
      if (run.t >= DURATION) {
        const words = { win: 'It landed in the cup.', stall: 'It stalled because it did not have enough energy.', overshoot: 'It overshot because it had too much energy.' };
        ctx.overlay.setHtml('result', level.target.height === undefined && r.result === 'win' ? 'It passed the gate at the right speed.' : words[r.result]);
        ctx.overlay.setVisible('result', true);
        if (!flowing) run = null;
      }
      moving = true;
      return moving;
    },
    setTime(t) {
      kit.setGlow(1);
      if (t > 0 && run) {
        for (let k = 0; k < 200 && run; k++) this.update(1 / 30, { formReady: true });
      }
    },
    values: () => ({ level: level.id, ...inputs }),
    destroy() {
      kit.destroy();
    },
  };
}
