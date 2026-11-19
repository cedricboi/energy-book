// src/scenes/kinetic.js
// Lesson 3 scene: a toy car on a level track rolls into a block of soft clay.
// Drawn at real size beside a ruler. The kinetic jar shows Ek = ½mv² live as
// the sliders move. When the car hits the clay, its kinetic energy is
// transferred mechanically to the internal store of the clay, and the dent
// depth grows in proportion to the energy (the clay pushes back with a
// steady force). The run is shown ten times slower than real life.
import { Vector3, BoxGeometry } from 'three';
import { createEnergyKit } from './energyKit.js';
import { createInkObject } from '../ink/inkObject.js';
import { createInkLines, polylineToSegments } from '../ink/creases.js';
import { pageSurfaceY, BOOK } from '../objects/book.js';
import { carGeometry, addRuler, shotOf, shotOfJars, addNote } from './helpers.js';
import { kineticEnergy, distanceFromWorkDone } from '../physics/equations.js';
import { formatQuantity } from '../physics/format.js';
import { play } from '../core/sound.js';

export const SLOW = 0.1;
export const CLAY_FORCE = 50; // N, the steady push of the clay on the car
const MAX = { mass: 0.5, speed: 3.0 };
const SCALE = kineticEnergy(MAX.mass, MAX.speed);

export default function createKineticScene(ctx) {
  const params = {
    mass: { type: 'slider', label: 'Mass of the car', min: 0.2, max: 0.5, step: 0.1, value: 0.2, unit: 'kg', sigFigs: 2 },
    speed: { type: 'slider', label: 'Speed of the car', min: 1.0, max: 3.0, step: 0.5, value: 1.0, unit: 'm/s', sigFigs: 2 },
  };
  const s = { mass: 0.2, speed: 1.0 };
  const ek = () => kineticEnergy(s.mass, s.speed);

  const kit = createEnergyKit(ctx, {
    stores: ['kinetic', 'internal'],
    scale: SCALE,
    start: { kinetic: ek(), internal: 0 },
    travel: 0.04,
    jarSize: 0.55,
    stand: true,
    transfers: [{ from: 'kinetic', to: 'internal', pathway: 'mechanical', moved: (p, c) => Math.max(0, c.internal - p.internal) }],
  });

  // Track along x, at real size. The clay block sits at the far end.
  const z = 0.028; // clear of the printed caption at the front of the page
  const x0 = BOOK.gutter + 0.02;
  const clayFront = BOOK.gutter + 0.15;
  const y = (x) => pageSurfaceY(x, z);
  const track = createInkLines([
    ...polylineToSegments([new Vector3(x0, y(x0), z - 0.03), new Vector3(clayFront, y(clayFront), z - 0.03)]),
    ...polylineToSegments([new Vector3(x0, y(x0), z + 0.03), new Vector3(clayFront, y(clayFront), z + 0.03)]),
  ], { widthScale: 0.7, chain: false });
  ctx.scene.add(track);
  addRuler(ctx, { at: (m) => new Vector3(x0 + m, y(x0 + m), z + 0.045), length: 0.15, tick: 0.01, labelEvery: 0.05, tickDir: new Vector3(0, 0, 0.005), id: 'ruler', prefer: 'below' });

  const car = createInkObject(carGeometry(0.06), { color: '#EFE6D3', name: 'car' });
  ctx.scene.add(car.group);
  const clayDepth = 0.05;
  const clay = createInkObject(new BoxGeometry(1, 0.03, 0.05).translate(0.5, 0.015, 0), { color: '#E2CDB0', name: 'clay', maxLayers: 2 });
  ctx.scene.add(clay.group);
  ctx.overlay.add({ id: 'part-car', kind: 'part', anchor: () => car.group.position.clone().add(new Vector3(0, 0.05, 0)), html: 'toy car', gap: 2 });
  ctx.overlay.add({ id: 'part-clay', kind: 'part', anchor: () => clay.group.position.clone().add(new Vector3(0.025, 0.04, 0)), html: 'soft clay', gap: 2 });
  // The dent depth is written on the clay block's front face.
  addNote(ctx, { id: 'dent', centre: () => new Vector3(clay.group.position.x + 0.024, y(clayFront) + 0.015, z + 0.0256), v: new Vector3(0, 1, 0), width: 0.042, height: 0.0095 });
  ctx.overlay.setVisible('dent', false);

  let dent = 0; // m
  function placeClay() {
    clay.group.position.set(clayFront + dent, y(clayFront), z);
    clay.group.scale.x = clayDepth - dent;
  }
  function placeCar(x) {
    car.group.position.set(x, y(x), z);
  }
  const startX = x0 + 0.035;
  const carHalf = 0.03;

  let t = 0;
  let running = false;
  let phase = 'ready';
  const records = [];
  let api;

  function reset() {
    running = false;
    phase = 'ready';
    t = 0;
    dent = 0;
    placeClay();
    placeCar(startX);
    kit.set({ kinetic: ek(), internal: 0 });
    ctx.overlay.setVisible('dent', false);
  }
  reset();

  api = {
    shots: {
      car: shotOf(() => car.group, { fill: 3.2 }),
      clay: shotOf(() => clay.group, { fill: 3.2 }),
      jars: shotOfJars(kit),
    },
    figure: {
      caption: 'The car and the clay are drawn at real size and shown ten times slower.',
      hint: 'Tap the car to roll it.',
    },
    objects: [...kit.objects, car, clay],
    cueTargets: { car: car.group },
    params,
    records,
    recordColumns: ['mass', 'speed', 'kinetic energy'],
    onRecord: null,
    setParam(id, v) {
      s[id] = v;
      params[id].value = v;
      reset();
    },
    actions: { run: { label: 'Roll the car', primary: true }, reset: { label: 'Reset' } },
    act(id) {
      reset();
      if (id === 'run') {
        running = true;
        phase = 'rolling';
      }
    },
    setLocked() {},
    setHideValues(on) {
      kit.setHideValues(on);
      ctx.overlay.setVisible('dent', !on && phase === 'done');
    },
    update(dt, { formReady }) {
      let moving = kit.fadeGlow(dt, formReady);
      if (!running) return moving;
      const mdt = dt * SLOW * (ctx.reducedMotion ? 0.5 : 1);
      t += mdt;
      const total = ek();
      const fullDent = distanceFromWorkDone(total, CLAY_FORCE);
      const hitX = clayFront - carHalf;
      const tHit = (hitX - startX) / s.speed;
      let internal = 0;
      if (t < tHit) {
        placeCar(startX + s.speed * t);
      } else {
        // In the clay: a steady force slows the car. Distance into the clay
        // follows from the energy transferred so far.
        const decel = CLAY_FORCE / s.mass;
        const tau = Math.min(t - tHit, s.speed / decel);
        const v = Math.max(0, s.speed - decel * tau);
        const d = s.speed * tau - 0.5 * decel * tau * tau;
        dent = Math.min(d, fullDent);
        internal = total - kineticEnergy(s.mass, v);
        placeCar(hitX + dent);
        placeClay();
        if (v <= 0 && phase !== 'done') {
          phase = 'done';
          play('thud');
          records.push([formatQuantity(s.mass, 'kg', 2), formatQuantity(s.speed, 'm/s', 2), formatQuantity(total, 'J', 2)]);
          api.onRecord?.();
          ctx.overlay.setHtml('dent', `dent ${formatQuantity(fullDent * 1000, 'mm', 2)}`);
          ctx.overlay.setVisible('dent', true);
        }
      }
      const flowing = kit.step({ kinetic: total - internal, internal }, mdt, dt);
      if (phase === 'done' && !flowing) running = false;
      moving = true;
      return moving;
    },
    setTime(target) {
      kit.setGlow(1);
      if (target <= 0) return;
      api.act('run');
      for (let k = 0; k < 400 && running; k++) api.update(1 / 30, { formReady: true });
    },
    values: () => ({ mass: s.mass, speed: s.speed, kinetic: ek() }),
    destroy() {
      kit.destroy();
    },
  };
  return api;
}
