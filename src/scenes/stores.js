// src/scenes/stores.js
// Lesson 1 scene: a row of six store jars and six everyday objects. Tapping an
// object (or its button) sends its energy, as glowing colour, into the jar of
// the matching store. No joules are shown: this lesson comes before any
// equation, so the jars only show which store holds energy.
import { Vector3, SphereGeometry, BoxGeometry, CylinderGeometry, Mesh, MeshBasicMaterial, Color } from 'three';
import { createCutaway } from '../objects/cutaway.js';
import { glowColour } from '../energy/palette.js';
import { createEnergyKit } from './energyKit.js';
import { createFlowPath } from '../energy/flow.js';
import { createInkObject } from '../ink/inkObject.js';
import { createInkLines, polylineToSegments } from '../ink/creases.js';
import { createSpring } from '../objects/spring.js';
import { pageSurfaceY, BOOK } from '../objects/book.js';
import { carGeometry, cupGeometry, batteryGeometry, addNote } from './helpers.js';
import { STORE_IDS } from '../energy/palette.js';

const FULL = 1; // jars are on a plain "some energy" scale here

export const STORE_OF = {
  car: 'kinetic', book: 'gravitational', catapult: 'elastic', battery: 'chemical', kopi: 'internal', sun: 'nuclear',
};
export const OBJECT_NAMES = {
  car: 'rolling toy car', book: 'book held up high', catapult: 'stretched catapult', battery: 'battery', kopi: 'cup of hot kopi', sun: 'the Sun',
};

export default function createStoresScene(ctx) {
  const x0 = BOOK.gutter + 0.03;
  const dx = (BOOK.pageW - 0.06) / 5;
  const xs = STORE_IDS.map((_, i) => x0 + i * dx);
  const kit = createEnergyKit(ctx, {
    stores: STORE_IDS,
    scale: FULL,
    start: Object.fromEntries(STORE_IDS.map((s) => [s, 0])),
    jarSize: 0.36,
    stand: true,
    xs,
    rowZ: -0.09,
    ledger: false,
    values: false,
    compactLabels: true,
  });

  // Objects in two rows in front of the jars. The tall ones stand in the
  // back row, so nothing hides a name written on the page.
  const objects = {};
  const place = (obj, x, z, lift = 0) => {
    obj.group.position.set(x, pageSurfaceY(x, z) + lift, z);
    ctx.scene.add(obj.group);
    return obj;
  };
  const cx = BOOK.gutter + BOOK.pageW / 2;
  objects.car = place(createInkObject(carGeometry(0.04), { color: '#EFE6D3', name: 'car' }), cx - 0.062, -0.012);
  const book = createInkObject(new BoxGeometry(0.036, 0.007, 0.026).translate(0, 0.0035, 0), { color: '#E6D9C0', name: 'book' });
  objects.book = place(book, cx, -0.014, 0.045);
  objects.catapult = (() => {
    const s = createSpring({ length: 0.03, radius: 0.004, wire: 0.0009, turns: 10, name: 'catapult' });
    s.group.rotation.z = -Math.PI / 2;
    return place(s, cx, 0.05, 0.008);
  })();
  const battery = createInkObject(batteryGeometry(), { color: '#E9E1D0', name: 'battery' });
  battery.group.scale.setScalar(0.7);
  objects.battery = place(battery, cx - 0.062, 0.05);
  const cup = createInkObject(cupGeometry(), { color: '#F1EADB', name: 'kopi' });
  cup.group.scale.setScalar(0.38);
  objects.kopi = place(cup, cx + 0.06, -0.016);
  objects.sun = place(createInkObject(new SphereGeometry(0.011, 24, 16).translate(0, 0.011, 0), { color: '#F4EEDF', creaseDeg: false, name: 'sun' }), cx + 0.064, 0.05, 0.008);

  // Drawn details: a dashed line under the raised book, and the Sun's rays.
  const extra = [];
  const bookBase = objects.book.group.position;
  for (let y = 0; y < 0.045; y += 0.008) {
    extra.push(...polylineToSegments([new Vector3(bookBase.x, pageSurfaceY(bookBase.x, bookBase.z) + y, bookBase.z), new Vector3(bookBase.x, pageSurfaceY(bookBase.x, bookBase.z) + y + 0.004, bookBase.z)]));
  }
  const sp = objects.sun.group.position.clone().add(new Vector3(0, 0.011, 0));
  for (let a = 0; a < 8; a++) {
    const ang = (a / 8) * Math.PI * 2;
    const d = new Vector3(Math.cos(ang), Math.sin(ang), 0);
    extra.push(...polylineToSegments([sp.clone().addScaledVector(d, 0.015), sp.clone().addScaledVector(d, 0.021)]));
  }
  // Speed lines behind the rolling car.
  const cp = objects.car.group.position;
  for (const [dy, len] of [[0.006, 0.012], [0.011, 0.018], [0.016, 0.01]]) {
    extra.push(...polylineToSegments([new Vector3(cp.x - 0.026 - len, cp.y + dy, cp.z), new Vector3(cp.x - 0.026, cp.y + dy, cp.z)]));
  }
  const details = createInkLines(extra, { widthScale: 0.6, chain: false });
  ctx.scene.add(details);
  // Steam rising from the hot kopi: three wavy strokes above the cup.
  const kp = objects.kopi.group.position;
  const steam = [];
  for (const [dx, phase] of [[-0.006, 0], [0.001, 1.6], [0.007, 3.1]]) {
    const pts = [];
    for (let i = 0; i <= 14; i++) {
      const t = i / 14;
      pts.push(new Vector3(kp.x + dx + Math.sin(t * Math.PI * 2.2 + phase) * 0.0022, kp.y + 0.038 + t * 0.02, kp.z));
    }
    steam.push(...polylineToSegments(pts));
  }
  const steamLines = createInkLines(steam, { widthScale: 0.55 });
  ctx.scene.add(steamLines);

  // Each name is handwritten on the page just in front of its object, so
  // it never covers the drawing.
  const NAME_Z = { car: 0.022, book: 0.024, catapult: 0.016, battery: 0.019, kopi: 0.028, sun: 0.019 };
  for (const [id, obj] of Object.entries(objects)) {
    const { x, z } = obj.group.position;
    const at = new Vector3(x, pageSurfaceY(x, z + NAME_Z[id]), z + NAME_Z[id]);
    addNote(ctx, { id: `obj-${id}`, centre: () => at.clone(), width: 0.066, height: 0.0095, className: 'is-hand' }).textContent = OBJECT_NAMES[id];
  }

  // A flow from each object to its jar.
  const flows = {};
  for (const [id, obj] of Object.entries(objects)) {
    const store = STORE_OF[id];
    const from = obj.group.position.clone().add(new Vector3(0, 0.03, 0));
    const to = kit.jars[store].group.position.clone().add(new Vector3(0, 0.045, 0));
    flows[id] = createFlowPath({ from, to, pathway: 'mechanical', fromStore: store, toStore: store, arc: 0.03, travel: 0.9 });
    flows[id].pathLine.visible = false;
    ctx.scene.add(flows[id].pathLine, flows[id].points);
  }

  const shown = Object.fromEntries(STORE_IDS.map((s) => [s, 0]));
  const sending = new Map(); // id -> remaining amount to emit

  // The battery opens in a cutaway when tapped: its front half is cut away
  // (surfaces and lines), showing a glowing core, its chemical potential
  // store, inside.
  const bat = objects.battery;
  const core = new Mesh(
    new CylinderGeometry(0.0075, 0.0075, 0.044, 20).rotateZ(Math.PI / 2).translate(-0.025, 0.012, 0),
    new MeshBasicMaterial({ color: new Color(...glowColour('chemical', 1.4)), toneMapped: false }),
  );
  core.name = 'battery-core';
  const batCut = createCutaway(bat, { centre: new Vector3(-0.025, 0.012, 0), depth: 0.012, inside: [core] });

  function reveal(id) {
    if (id === 'battery') batCut.open(true);
    if (!objects[id] || sending.has(id) || shown[STORE_OF[id]] >= 0.7) return;
    sending.set(id, 0.7);
    flows[id].pathLine.visible = true;
  }

  const actions = {};
  for (const id of Object.keys(objects)) actions[id] = { label: `Tap ${OBJECT_NAMES[id].startsWith('the ') ? '' : 'the '}${OBJECT_NAMES[id]}` };
  actions.reset = { label: 'Empty the jars' };

  return {
    figure: {
      caption: 'Each object keeps energy in one of the six stores.',
      hint: 'Tap an object to send its energy to its jar.',
    },
    objects: [...kit.objects, ...Object.values(objects)],
    values: () => ({ ...shown }),
    cueTargets: Object.fromEntries(Object.entries(objects).map(([k, o]) => [k, o.group])),
    params: {},
    actions,
    act(id) {
      if (id === 'reset') {
        batCut.open(false);
        for (const s of STORE_IDS) shown[s] = 0;
        sending.clear();
        for (const f of Object.values(flows)) {
          f.clear();
          f.pathLine.visible = false;
        }
        kit.set({ ...shown });
        return;
      }
      if (id === 'all') {
        for (const k of Object.keys(objects)) reveal(k);
        return;
      }
      reveal(id);
    },
    setLocked() {},
    update(dt, { formReady }) {
      let moving = kit.fadeGlow(dt, formReady);
      moving = batCut.update(dt, ctx.reducedMotion) || moving;
      for (const [id, left] of sending) {
        const amt = Math.min(left, dt * 0.9);
        flows[id].emit(amt);
        if (left - amt <= 1e-6) sending.delete(id);
        else sending.set(id, left - amt);
        moving = true;
      }
      for (const [id, f] of Object.entries(flows)) {
        if (!f.active) continue;
        shown[STORE_OF[id]] += f.step(dt);
        moving = true;
      }
      kit.set({ ...shown });
      return moving;
    },
    setTime() {
      kit.setGlow(1);
    },
    values: () => ({ ...shown }),
    destroy() {
      kit.destroy();
    },
  };
}
