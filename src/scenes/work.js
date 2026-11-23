// src/scenes/work.js
// Lesson 7 scene: a person pushes a crate across the floor at a steady speed,
// or pushes against a wall that does not move. The push arrow is drawn to
// scale for the force and the distance marker to scale for the distance.
// Work done = force × distance moved in the direction of the force, and it
// equals the energy transferred mechanically: from the person's chemical
// potential store to the internal store of the crate and floor (friction).
import { Vector3, BoxGeometry } from 'three';
import { createEnergyKit } from './energyKit.js';
import { createCrate } from '../objects/crate.js';
import { createInkObject } from '../ink/inkObject.js';
import { createInkLines, polylineToSegments } from '../ink/creases.js';
import { pageSurfaceY, BOOK } from '../objects/book.js';
import { createPerson, arrowSegments, addRuler, addNote } from './helpers.js';
import { workDone } from '../physics/equations.js';
import { formatQuantity } from '../physics/format.js';

export const DRAW_SCALE = 1 / 50;
const ARROW_PER_N = 0.00025; // page metres of arrow per newton (200 N = 5 cm)
const BIG_SCALE = 1000; // J for a full jar
const SMALL_SCALE = 100; // J for a full jar, for small amounts

export default function createWorkScene(ctx) {
  const S = DRAW_SCALE;
  const x0 = BOOK.gutter + 0.04;
  const z = 0.035; // clear of the printed caption at the front of the page
  const W = (x, y = 0, dz = 0) => new Vector3(x0 + x * S, pageSurfaceY(x0 + x * S, z + dz) + y * S, z + dz);

  const params = {
    target: { type: 'choice', label: 'Push against', value: 'crate', options: [{ id: 'crate', label: 'the crate' }, { id: 'wall', label: 'the wall' }] },
    force: { type: 'slider', label: 'Force', min: 0, max: 200, step: 10, value: 100, unit: 'N', sigFigs: 3 },
    distance: { type: 'slider', label: 'Distance', min: 0, max: 5, step: 0.5, value: 3, unit: 'm', sigFigs: 2 },
  };
  const s = { target: 'crate', force: 100, distance: 3 };
  const moved = () => (s.target === 'wall' ? 0 : s.distance);
  const work = () => workDone(s.force, moved());

  const kit = createEnergyKit(ctx, {
    stores: ['chemical', 'internal'],
    scale: BIG_SCALE,
    start: { chemical: work(), internal: 0 },
    travel: 0.4,
    jarSize: 0.55,
    stand: true,
    rowZ: -0.085,
    caption: 'Energy ledger. The dark line marks the work done in this push.',
    transfers: [{ from: 'chemical', to: 'internal', pathway: 'mechanical', moved: (p, c) => Math.max(0, c.internal - p.internal) }],
  });
  // The jar's scale is printed on the page in front of the jars.
  addNote(ctx, { id: 'jar-scale', centre: () => kit.jars.internal.group.position.clone().add(new Vector3(0, -0.001, 0.044)), width: 0.06, height: 0.0098 });

  // Floor line with the distance marker (0 to 5 m) along the front.
  addRuler(ctx, { at: (m) => W(1.0 + m, 0, 0.03), length: 5, tick: 0.5, labelEvery: 1, tickDir: new Vector3(0, 0, 0.004), id: 'dist', prefer: 'below' });
  const person = createPerson({ name: 'person' });
  person.group.scale.setScalar(S);
  const crate = createCrate({ size: 0.8 * S, name: 'crate' });
  const wall = createInkObject(new BoxGeometry(0.3, 2.2, 1.2).translate(0, 1.1, 0), { color: '#E3D6BE', name: 'wall', maxLayers: 1 });
  wall.group.scale.setScalar(S);
  ctx.scene.add(person.group, crate.group, wall.group);
  ctx.overlay.add({ id: 'part-person', kind: 'part', anchor: () => ctx.scene.localToWorld(person.group.position.clone().add(new Vector3(0, 1.8 * S, 0))), html: 'person', gap: 2 });
  ctx.overlay.add({ id: 'part-target', kind: 'part', anchor: () => ctx.scene.localToWorld((s.target === 'wall' ? wall.group.position : crate.group.position).clone().add(new Vector3(0, 1.3 * S, 0))), html: 'crate', gap: 2 });
  // The force is printed upright beside the arrow, in the drawing's plane.
  addNote(ctx, { id: 'force', centre: () => W(0.9, 1.6), v: new Vector3(0, 1, 0), width: 0.042, height: 0.0098 });

  let arrow = null;
  let along = 0; // m moved so far in this push
  function draw() {
    const start = 0.6 + along;
    person.group.position.copy(W(start));
    if (s.target === 'crate') {
      crate.group.visible = true;
      wall.group.visible = false;
      crate.group.position.copy(W(start + 0.75));
    } else {
      crate.group.visible = false;
      wall.group.visible = true;
      wall.group.position.copy(W(1.5));
    }
    if (arrow) ctx.scene.remove(arrow);
    arrow = null;
    if (s.force > 0) {
      const tip = W(start + 0.35, 1.1);
      const tail = tip.clone().add(new Vector3(-s.force * ARROW_PER_N, 0, 0));
      const a = tip.clone().add(new Vector3(s.force * ARROW_PER_N, 0, 0));
      arrow = createInkLines(arrowSegments(tip, a), { widthScale: 1.1 });
      ctx.scene.add(arrow);
      void tail;
    }
    ctx.overlay.setHtml('force', `push ${formatQuantity(s.force, 'N')}`);
    ctx.overlay.setHtml('part-target', s.target === 'wall' ? 'wall' : 'crate');
  }

  function scaleFor(w) {
    return w > 0 && w < SMALL_SCALE ? SMALL_SCALE : BIG_SCALE;
  }
  function setJarScale() {
    const sc = scaleFor(work());
    kit.setScale(sc);
    ctx.overlay.setHtml('jar-scale', `full jar = ${formatQuantity(sc, 'J')}`);
  }

  let running = false;
  let t = 0;
  const DURATION = 2.5; // s on screen for the push

  function reset() {
    running = false;
    t = 0;
    along = 0;
    kit.setTotal(work());
    kit.set({ chemical: work(), internal: 0 });
    setJarScale();
    draw();
  }
  reset();

  return {
    figure: {
      caption: `The person, the crate and the wall are drawn at 1 : ${Math.round(1 / S)}.`,
      hint: 'Tap the person to push.',
    },
    objects: [...kit.objects, person, crate, wall],
    cueTargets: { person: person.group },
    params,
    setParam(id, v) {
      s[id] = v;
      params[id].value = v;
      reset();
    },
    actions: { push: { label: 'Push', primary: true }, reset: { label: 'Reset' } },
    act(id) {
      reset();
      if (id === 'push') running = true;
    },
    setLocked() {},
    setHideValues(on) {
      kit.setHideValues(on);
    },
    update(dt, { formReady }) {
      let moving = kit.fadeGlow(dt, formReady);
      if (!running) return moving;
      t = Math.min(DURATION, t + dt * (ctx.reducedMotion ? 0.5 : 1));
      const f = t / DURATION;
      along = moved() * f;
      const done = workDone(s.force, along);
      const flowing = kit.step({ chemical: work() - done, internal: done }, dt, dt);
      draw();
      if (t >= DURATION && !flowing) running = false;
      moving = true;
      return moving;
    },
    setTime(target) {
      kit.setGlow(1);
      if (target <= 0) return;
      reset();
      running = true;
      for (let k = 0; k < 400 && running; k++) this.update(1 / 30, { formReady: true });
    },
    values: () => ({ force: s.force, distance: moved(), work: work(), target: s.target }),
    destroy() {
      kit.destroy();
    },
  };
}
