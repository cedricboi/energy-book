// src/scenes/transfers.js
// Lesson 2 scene: four short scenes, one per device. Energy leaves a store,
// travels along a pathway (each pathway has its own look) and arrives in other
// stores. Pathways can chain through a device, for example a torch: chemical
// store -> electrically -> bulb -> by propagation of waves -> surroundings.
// No joules are shown yet.
import { Group, Vector3, BoxGeometry, CylinderGeometry, SphereGeometry, LatheGeometry, Vector2 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createEnergyKit } from './energyKit.js';
import { createFlowPath } from '../energy/flow.js';
import { createInkObject } from '../ink/inkObject.js';
import { createSpring } from '../objects/spring.js';
import { pageSurfaceY, BOOK } from '../objects/book.js';

const geo = (parts) => {
  const g = mergeGeometries(parts.map((p) => { const q = p.toNonIndexed(); q.deleteAttribute('uv'); return q; }));
  g.computeVertexNormals();
  return g;
};

const CX = BOOK.gutter + BOOK.pageW / 2;
const LANE_Z = 0.035;
const at = (dx, h = 0, dz = 0) => new Vector3(CX + dx, pageSurfaceY(CX + dx, LANE_Z + dz) + h, LANE_Z + dz);

/**
 * Each device: its stores, its drawn objects, named points, and edges.
 * An edge runs from a store jar or a point to a store jar or a point.
 * `share` splits what arrives at a point between its outgoing edges.
 */
const DEVICES = {
  catapult: {
    label: 'Ruler catapult',
    stores: ['elastic', 'kinetic'],
    start: { elastic: 1, kinetic: 0 },
    build(add) {
      const s = createSpring({ length: 0.035, radius: 0.006, wire: 0.0012, turns: 10, name: 'band' });
      s.group.rotation.z = -Math.PI / 2;
      s.group.position.copy(at(-0.05, 0.01));
      add(s, 'stretched band', at(-0.035, 0.03));
      const e = createInkObject(new BoxGeometry(0.02, 0.012, 0.014).translate(0, 0.006, 0), { color: '#F1E4D4', name: 'eraser' });
      e.group.position.copy(at(0.0));
      add(e, 'eraser', at(0.0, 0.025));
    },
    edges: [{ from: 'elastic', to: 'kinetic', pathway: 'mechanical' }],
  },
  kettle: {
    label: 'Electric kettle',
    stores: ['internal'],
    start: { internal: 0 },
    source: 'mains',
    build(add) {
      const body = new LatheGeometry([[0, 0], [0.03, 0], [0.032, 0.05], [0.026, 0.06], [0, 0.06]].map(([r, y]) => new Vector2(r, y)), 32);
      const spout = new CylinderGeometry(0.004, 0.007, 0.025, 10).rotateZ(-0.9).translate(0.038, 0.045, 0);
      const k = createInkObject(geo([body, spout]), { color: '#EEE7DA', name: 'kettle' });
      k.group.position.copy(at(0.01));
      add(k, 'kettle of water', at(0.01, 0.075));
      const plug = createInkObject(new BoxGeometry(0.018, 0.022, 0.006).translate(0, 0.011, 0), { color: '#E8E1D4', name: 'plug' });
      plug.group.position.copy(at(-0.07));
      add(plug, 'mains supply', at(-0.07, 0.035));
    },
    points: { mains: at(-0.07, 0.022), element: at(0.01, 0.006) },
    edges: [
      { from: 'mains', to: 'element', pathway: 'electrical', colour: 'internal' },
      { from: 'element', to: 'internal', pathway: 'heating' },
    ],
  },
  torch: {
    label: 'Torch',
    stores: ['chemical', 'internal'],
    start: { chemical: 1, internal: 0 },
    build(add) {
      const body = new CylinderGeometry(0.009, 0.009, 0.06, 20).rotateZ(Math.PI / 2).translate(0, 0.01, 0);
      const head = new CylinderGeometry(0.016, 0.01, 0.02, 20).rotateZ(Math.PI / 2).translate(0.04, 0.01, 0);
      const t = createInkObject(geo([body, head]), { color: '#E9E2D4', name: 'torch' });
      t.group.position.copy(at(-0.03));
      add(t, 'torch', at(-0.03, 0.035));
    },
    points: { bulb: at(0.02, 0.012) },
    edges: [
      { from: 'chemical', to: 'bulb', pathway: 'electrical', colour: 'chemical' },
      { from: 'bulb', to: 'internal', pathway: 'waves', share: 0.5 },
      { from: 'bulb', to: 'internal', pathway: 'heating', share: 0.5 },
    ],
  },
  speaker: {
    label: 'Phone speaker',
    stores: ['chemical', 'kinetic', 'internal'],
    start: { chemical: 1, kinetic: 0, internal: 0 },
    build(add) {
      const phone = createInkObject(new BoxGeometry(0.035, 0.005, 0.07).translate(0, 0.0025, 0), { color: '#E6DFD2', name: 'phone' });
      phone.group.position.copy(at(-0.04));
      add(phone, 'phone', at(-0.04, 0.02));
      const cone = geo([new CylinderGeometry(0.012, 0.004, 0.01, 20).rotateZ(Math.PI / 2).translate(0, 0.012, 0), new BoxGeometry(0.006, 0.026, 0.026).translate(-0.007, 0.012, 0)]);
      const sp = createInkObject(cone, { color: '#E9E2D4', name: 'speaker' });
      sp.group.position.copy(at(0.03));
      add(sp, 'speaker cone', at(0.03, 0.035));
    },
    edges: [
      { from: 'chemical', to: 'kinetic', pathway: 'electrical' },
      { from: 'kinetic', to: 'internal', pathway: 'waves' },
    ],
  },
};

export default function createTransfersScene(ctx) {
  const params = {
    device: { type: 'choice', label: 'Device', value: 'catapult', options: Object.entries(DEVICES).map(([id, d]) => ({ id, label: d.label })) },
  };
  let current = null;
  let firstBuild = true;
  // While a question asks how energy moves or where it is kept, hide the
  // pathway lines and the store names (CLAUDE.md section 5, rule 6).
  let hidden = false;
  function applyHidden() {
    if (!current) return;
    current.kit.setHideNames(hidden);
    for (const e of current.edges) {
      e.flow.pathLine.visible = !hidden;
      e.flow.points.visible = !hidden;
    }
  }
  const allObjects = [];

  function build(id) {
    if (current) {
      ctx.scene.remove(current.group);
      current.kit.destroy();
      ctx.overlay.clear();
    }
    const dev = DEVICES[id];
    const group = new Group();
    ctx.scene.add(group);
    const sub = { ...ctx, scene: group };
    const kit = createEnergyKit(sub, { stores: dev.stores, scale: 1, start: dev.start, ledger: false, values: false, rowZ: -0.075 });
    const objects = [];
    dev.build((obj, label, labelAt) => {
      group.add(obj.group);
      objects.push(obj);
      ctx.overlay.add({ id: `part-${label}`, kind: 'part', anchor: () => labelAt, html: label, gap: 2 });
    });
    const pointOf = (name) => dev.points?.[name] ?? kit.jars[name]?.group.position.clone().add(new Vector3(0, 0.04, 0));
    const edges = dev.edges.map((e) => {
      const f = createFlowPath({
        from: pointOf(e.from), to: pointOf(e.to), pathway: e.pathway,
        fromStore: e.colour ?? (kit.jars[e.from] ? e.from : e.to), toStore: kit.jars[e.to] ? e.to : (e.colour ?? e.from),
        arc: 0.025, travel: 0.9, bulge: e.pathway === 'heating' ? new Vector3(0, 0.3, 1) : new Vector3(0, 1, 0.3),
      });
      group.add(f.pathLine, f.points);
      return { ...e, flow: f };
    });
    if (firstBuild) allObjects.push(...kit.objects, ...objects);
    else kit.setGlow(1);
    firstBuild = false;
    current = { id, dev, group, kit, edges, shown: { ...dev.start }, emitting: 0, running: false };
    applyHidden();
  }
  build('catapult');

  return {
    get objects() {
      return allObjects;
    },
    cueTargets: {},
    params,
    setParam(id, value) {
      if (id === 'device' && DEVICES[value]) {
        params.device.value = value;
        build(value);
      }
    },
    actions: { run: { label: 'Run it', primary: true }, reset: { label: 'Reset' } },
    act(id) {
      const c = current;
      c.shown = { ...c.dev.start };
      c.edges.forEach((e) => e.flow.clear());
      c.kit.set({ ...c.shown });
      c.running = id === 'run';
      c.emitting = id === 'run' ? 1 : 0;
    },
    setLocked() {},
    setHideValues(on) {
      hidden = on;
      applyHidden();
    },
    update(dt, { formReady }) {
      const c = current;
      let moving = c.kit.fadeGlow(dt, formReady);
      if (!c.running) return moving;
      // The first edges take energy from their source over about 1.5 s.
      const take = Math.min(c.emitting, dt / 1.5);
      c.emitting -= take;
      const firsts = c.edges.filter((e) => e.from === (c.dev.source ?? e.from) && !c.edges.some((o) => o.to === e.from));
      for (const e of firsts) {
        const amt = take / firsts.length;
        if (c.shown[e.from] !== undefined) c.shown[e.from] = Math.max(0, c.shown[e.from] - amt);
        e.flow.emit(amt);
      }
      // Energy that lands at a point moves straight on along the next edges.
      for (const e of c.edges) {
        const arrived = e.flow.step(dt);
        if (arrived <= 0) continue;
        if (c.shown[e.to] !== undefined) {
          c.shown[e.to] += arrived;
          // A store that also passes energy on (the speaker cone) sends it on.
          const onward = c.edges.filter((o) => o.from === e.to);
          for (const o of onward) {
            c.shown[e.to] -= arrived * (o.share ?? 1 / onward.length);
            o.flow.emit(arrived * (o.share ?? 1 / onward.length));
          }
        } else {
          const onward = c.edges.filter((o) => o.from === e.to);
          for (const o of onward) o.flow.emit(arrived * (o.share ?? 1 / onward.length));
        }
      }
      c.kit.set({ ...c.shown });
      const active = c.emitting > 1e-6 || c.edges.some((e) => e.flow.active);
      if (!active) c.running = false;
      return moving || active;
    },
    setTime(t) {
      current.kit.setGlow(1);
      if (t > 0) {
        this.act('run');
        for (let s = 0; s < t; s += 1 / 60) this.update(1 / 60, { formReady: true });
      }
    },
    values: () => ({ device: current.id, ...current.shown }),
    destroy() {
      current?.kit.destroy();
    },
  };
}
