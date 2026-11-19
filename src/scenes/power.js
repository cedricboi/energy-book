// src/scenes/power.js
// Lesson 8 scene. Two comparisons:
//   stairs: two people carry identical bags up the same 3.0 m of stairs, each
//           in their own time. Each bag's gravitational potential jar fills at
//           its own rate. Both end with the same energy.
//   kettles: a 1000 W and a 2000 W kettle heat the same water, which needs
//           the same energy. The internal jars fill at different rates.
// Kettles are shown twenty times faster than real life.
import { Group, Vector3, BoxGeometry, LatheGeometry, Vector2, CylinderGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createStoreJar } from '../energy/storeJar.js';
import { createInkObject } from '../ink/inkObject.js';
import { pageSurfaceY, BOOK } from '../objects/book.js';
import { createPerson } from './helpers.js';
import { gravitationalPotentialEnergy, energyFromPower, timeFromPower } from '../physics/equations.js';
import { formatQuantity } from '../physics/format.js';
import { iconSvg } from '../energy/palette.js';

export const STAIRS = { height: 3.0, bag: 6.0 }; // m, kg
export const KETTLE = { energy: 180000, powers: [1000, 2000] }; // J needed, W
const S = 1 / 50;
const FAST = 20;

export default function createPowerScene(ctx) {
  const params = {
    compare: { type: 'choice', label: 'Compare', value: 'stairs', options: [{ id: 'stairs', label: 'two people on the stairs' }, { id: 'kettles', label: 'two kettles' }] },
    timeA: { type: 'slider', label: 'Time for A', min: 4, max: 20, step: 1, value: 4, unit: 's', sigFigs: 2 },
    timeB: { type: 'slider', label: 'Time for B', min: 4, max: 20, step: 1, value: 12, unit: 's', sigFigs: 2 },
  };
  const s = { compare: 'stairs', timeA: 4, timeB: 12 };
  const bagEnergy = gravitationalPotentialEnergy(STAIRS.bag, STAIRS.height);

  let group = null;
  let parts = null;
  let first = [];

  function jarAt(store, x, z, scale, id, name) {
    const jar = createStoreJar({ store, scale, value: 0, size: 0.5 });
    jar.group.position.set(x, pageSurfaceY(x, z), z);
    group.add(jar.group);
    ctx.overlay.add({ id, anchor: () => jar.labelPoint(), html: '', gap: 3 });
    ctx.overlay.addGlow(() => jar.glowCorners());
    return { jar, id, name, store };
  }

  function build() {
    if (group) {
      ctx.scene.remove(group);
      ctx.overlay.clear();
    }
    group = new Group();
    ctx.scene.add(group);
    const cx = BOOK.gutter + BOOK.pageW / 2;
    const objects = [];
    if (s.compare === 'stairs') {
      // A straight flight of 15 steps, 0.2 m each, drawn at 1 : 50.
      const steps = [];
      for (let i = 0; i < 15; i++) steps.push(new BoxGeometry(0.28, 0.2 * (i + 1), 1.4).translate(0.28 * i + 0.14, 0.1 * (i + 1), 0).toNonIndexed());
      const stairs = createInkObject(mergeGeometries(steps), { color: '#E6D7BC', name: 'stairs', maxLayers: 1 });
      stairs.group.scale.setScalar(S);
      stairs.group.position.set(cx - 0.06, pageSurfaceY(cx - 0.06, 0.05), 0.05);
      group.add(stairs.group);
      objects.push(stairs);
      const people = ['A', 'B'].map((k, i) => {
        const p = createPerson({ carrying: true, name: `person-${k}` });
        p.group.scale.setScalar(S);
        group.add(p.group);
        objects.push(p);
        ctx.overlay.add({ id: `who-${k}`, kind: 'part', anchor: () => p.group.position.clone().add(new Vector3(0, 1.9 * S, 0)), html: `person ${k}`, gap: 2 });
        return { p, dz: i === 0 ? -0.012 : 0.012 };
      });
      const jars = [jarAt('gravitational', cx - 0.03, -0.09, bagEnergy * 1.2, 'jarA', 'bag A'), jarAt('gravitational', cx + 0.03, -0.09, bagEnergy * 1.2, 'jarB', 'bag B')];
      parts = { kind: 'stairs', people, jars, base: stairs.group.position.clone() };
    } else {
      const kettleGeo = () => {
        const body = new LatheGeometry([[0, 0], [0.03, 0], [0.032, 0.05], [0.026, 0.06], [0, 0.06]].map(([r, y]) => new Vector2(r, y)), 32).toNonIndexed();
        const spout = new CylinderGeometry(0.004, 0.007, 0.025, 10).rotateZ(-0.9).translate(0.038, 0.045, 0).toNonIndexed();
        body.deleteAttribute('uv');
        spout.deleteAttribute('uv');
        const g = mergeGeometries([body, spout]);
        g.computeVertexNormals();
        return g;
      };
      const kettles = KETTLE.powers.map((P, i) => {
        const k = createInkObject(kettleGeo(), { color: '#EEE7DA', name: `kettle-${i}` });
        const x = cx + (i === 0 ? -0.045 : 0.045);
        k.group.position.set(x, pageSurfaceY(x, 0.04), 0.04);
        group.add(k.group);
        objects.push(k);
        ctx.overlay.add({ id: `kettle-${i}`, kind: 'part', anchor: () => k.group.position.clone().add(new Vector3(0, -0.004, 0.035)), html: `${formatQuantity(P, 'W')} kettle`, gap: 2, prefer: 'below' });
        return k;
      });
      const jars = KETTLE.powers.map((P, i) => jarAt('internal', cx + (i === 0 ? -0.045 : 0.045), -0.09, KETTLE.energy * 1.2, i === 0 ? 'jarA' : 'jarB', `${formatQuantity(P, 'W')} kettle`));
      parts = { kind: 'kettles', kettles, jars };
    }
    for (const j of parts.jars) objects.push(j.jar);
    if (!first.length) first = objects;
    else for (const j of parts.jars) j.jar.setGlowFade(1);
    t = 0;
    running = false;
    refresh();
  }

  let t = 0;
  let running = false;
  let glow = 0;

  function times() {
    return s.compare === 'stairs' ? [s.timeA, s.timeB] : KETTLE.powers.map((P) => timeFromPower(KETTLE.energy, P));
  }
  function refresh() {
    const [tA, tB] = times();
    const total = s.compare === 'stairs' ? bagEnergy : KETTLE.energy;
    [tA, tB].forEach((T, i) => {
      const f = Math.min(1, t / T);
      const j = parts.jars[i];
      const e = s.compare === 'stairs' ? total * f : energyFromPower(KETTLE.powers[i], Math.min(t, T));
      j.jar.setValue(e);
      j.jar.setGlowFade(Math.max(glow, first.includes(j.jar) ? glow : 1));
      ctx.overlay.setHtml(j.id, `<span class="jar-name">${iconSvg(j.store, 16)} ${j.name}</span><span class="jar-val">${formatQuantity(e, 'J', 3)}</span><span class="jar-val">${formatQuantity(Math.min(t, T), 's', 2)}</span>`);
      if (parts.kind === 'stairs') {
        const { p, dz } = parts.people[i];
        const along = 0.28 * 15 * f;
        const up = STAIRS.height * f;
        p.group.position.copy(parts.base).add(new Vector3(along * S, up * S, dz + 0));
      }
    });
  }

  build();

  const api = {
    get objects() {
      return first;
    },
    cueTargets: {},
    // Tap a person or a kettle to start the stopwatches.
    get interactive() {
      const things = parts.kind === 'stairs' ? parts.people.map((x) => x.p) : parts.kettles;
      return things.map((o) => ({ object: o.group, label: o.group.name, onTap: () => api.act('run') }));
    },
    params,
    setParam(id, v) {
      s[id] = v;
      params[id].value = v;
      if (id === 'compare') build();
      else {
        t = 0;
        running = false;
        refresh();
      }
    },
    actions: { run: { label: 'Start the stopwatches', primary: true }, reset: { label: 'Reset' } },
    act(id) {
      t = 0;
      running = id === 'run';
      refresh();
    },
    setLocked() {},
    update(dt, { formReady }) {
      let moving = false;
      if (formReady && glow < 1) {
        glow = Math.min(1, glow + dt / 0.5);
        moving = true;
      }
      if (running) {
        t += dt * (s.compare === 'kettles' ? FAST : 1) * (ctx.reducedMotion ? 0.5 : 1);
        if (t >= Math.max(...times())) running = false;
        moving = true;
      }
      refresh();
      return moving;
    },
    setTime(target) {
      glow = 1;
      t = target * (s.compare === 'kettles' ? FAST : 1);
      refresh();
    },
    values: () => ({ compare: s.compare, timeA: s.timeA, timeB: s.timeB, bagEnergy }),
    destroy() {},
  };
  return api;
}
