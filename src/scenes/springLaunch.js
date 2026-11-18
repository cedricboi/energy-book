// src/scenes/springLaunch.js
// Scene: a squashed spring launches a ball, which rolls to rest. Used by the
// Phase 5A test lesson. Shown four times slower than real time.
import { Vector3 } from 'three';
import { createEnergyKit } from './energyKit.js';
import { createSpringLaunch } from '../physics/models/springLaunch.js';
import { createBall } from '../objects/ball.js';
import { createCrate } from '../objects/crate.js';
import { springGeometry, createSpring } from '../objects/spring.js';
import { pageSurfaceY } from '../objects/book.js';
import { hullFrom } from '../ink/inkObject.js';

export const SLOW = 0.25;

export default function createSpringLaunchScene(ctx) {
  const model = createSpringLaunch();
  const laneZ = 0.05;
  const startX = 0.03;
  const ballR = 0.0335;

  const kit = createEnergyKit(ctx, {
    stores: ['elastic', 'kinetic', 'internal'],
    scale: model.total,
    start: { elastic: model.total, kinetic: 0, internal: 0 },
    travel: 0.35 * SLOW,
    transfers: [
      { from: 'elastic', to: 'kinetic', pathway: 'mechanical', moved: (p, c) => p.elastic - c.elastic },
      { from: 'kinetic', to: 'internal', pathway: 'mechanical', moved: (p, c) => c.internal - p.internal },
    ],
  });

  const block = createCrate({ size: 0.03 });
  block.group.position.set(0.012, pageSurfaceY(0.012, laneZ), laneZ);
  const ball = createBall();
  const springLen = (open) => 0.022 + open * model.compression;
  const spring = createSpring({ length: springLen(0), radius: 0.011, turns: 8 });
  spring.group.rotation.z = -Math.PI / 2;
  spring.group.position.set(startX - 0.002, pageSurfaceY(startX, laneZ) + ballR, laneZ);
  ctx.scene.add(block.group, ball.group, spring.group);

  ctx.overlay.add({ id: 'part-spring', kind: 'part', anchor: () => spring.group.position.clone().add(new Vector3(0.012, 0.022, 0)), html: 'spring' });
  ctx.overlay.add({ id: 'part-ball', kind: 'part', anchor: () => ball.group.position.clone().add(new Vector3(0, 0.072, 0)), html: 'ball' });

  let open = -1;
  function setSpring(o) {
    if (Math.abs(o - open) < 1e-4) return;
    open = o;
    const g = springGeometry({ radius: 0.011, length: springLen(o), turns: 8 });
    spring.body.geometry.dispose();
    spring.body.geometry = g;
    const hull = spring.body.children[0];
    hull.geometry.dispose();
    hull.geometry = hullFrom(g);
  }
  function place(st) {
    setSpring(st.springOpen);
    const bx = startX + springLen(0) + ballR + st.x;
    ball.group.position.set(bx, pageSurfaceY(bx, laneZ), laneZ);
  }

  let t = 0;
  let running = false;
  let locked = false;
  const stores = (s) => ({ elastic: s.elastic, kinetic: s.kinetic, internal: s.internal });

  function reset() {
    t = 0;
    running = false;
    const s = model.at(0);
    kit.set(stores(s));
    place(s);
  }
  reset();

  return {
    objects: [...kit.objects, block, ball, spring],
    cueTargets: { spring: spring.group, ball: ball.group },
    params: {},
    actions: { run: { label: 'Release the spring', primary: true }, reset: { label: 'Reset' } },
    act(id) {
      if (id === 'run' && !locked) {
        reset();
        running = true;
      }
      if (id === 'reset') reset();
    },
    setLocked(on) {
      locked = on;
    },
    get canAct() {
      return !locked;
    },
    update(dt, { formReady }) {
      let moving = kit.fadeGlow(dt, formReady);
      if (running) {
        const mdt = dt * SLOW * (ctx.reducedMotion ? 0.5 : 1);
        t += mdt;
        const s = model.at(t);
        const flowing = kit.step(stores(s), mdt, dt);
        place(s);
        if (t > model.duration && !flowing) running = false;
        moving = true;
      }
      return moving;
    },
    /** Jump to a model time, replaying the ledger exactly (screenshots and tests). */
    setTime(target) {
      reset();
      kit.setGlow(1);
      const dt = (1 / 60) * SLOW;
      while (t < target) {
        t = Math.min(target, t + dt);
        const s = model.at(t);
        kit.step(stores(s), dt, 0);
        place(s);
      }
    },
    values() {
      return { total: model.total, ...kit.snapshot().display };
    },
    destroy() {
      kit.destroy();
    },
  };
}
