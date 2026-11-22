// src/scenes/stores.js
// Lesson 1 scene: a row of six store jars and some everyday objects. Tapping
// an object (or its button) fills the jar of each store it has energy in.
// Nothing travels across the page: the jar simply fills. No joules are shown: this lesson comes
// before any equation, so the jars only show which store holds energy.
//
// Variants (the part of a scene id after the colon):
//   stores        six objects in two rows, filling the page
//   stores:top    the same six, drawn compactly at the head of the page
//                 (a textbook spread prints its text beneath)
//   stores:cases  three new cases at the head of the page: a durian on a
//                 branch, a bowl of hot rice and a drawn bow
import {
  Vector3, Vector2, SphereGeometry, BoxGeometry, CylinderGeometry, ConeGeometry, TorusGeometry, LatheGeometry,
  Mesh, MeshBasicMaterial, Color,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createCutaway } from '../objects/cutaway.js';
import { glowColour, STORE_IDS } from '../energy/palette.js';
import { createEnergyKit } from './energyKit.js';
import { createInkObject } from '../ink/inkObject.js';
import { createInkLines, polylineToSegments } from '../ink/creases.js';
import { createSpring } from '../objects/spring.js';
import { pageSurfaceY, BOOK } from '../objects/book.js';
import { carGeometry, cupGeometry, batteryGeometry, addNote } from './helpers.js';

const FULL = 1; // jars are on a plain "some energy" scale here

/** The store, or stores, each object has energy in. */
export const STORE_OF = {
  car: 'kinetic', book: 'gravitational', catapult: 'elastic', battery: 'chemical', kopi: 'internal', sun: 'nuclear',
  durian: 'gravitational', rice: ['chemical', 'internal'], bow: 'elastic',
};
export const OBJECT_NAMES = {
  car: 'rolling toy car', book: 'book held up high', catapult: 'stretched catapult', battery: 'battery', kopi: 'cup of hot kopi', sun: 'the Sun',
  durian: 'durian on a branch', rice: 'bowl of hot rice', bow: 'drawn bow',
};

const SHORT_NAMES = { car: 'Toy car', book: 'Book', catapult: 'Catapult', battery: 'Battery', kopi: 'Kopi', sun: 'Sun', durian: 'Durian', rice: 'Rice', bow: 'Bow' };

// Where things stand: [x from the middle of the page, z, lift above the
// page, how far in front its name is written].
const LAYOUTS = {
  full: {
    jarSize: 0.36, rowZ: -0.09,
    at: { car: [-0.062, -0.012, 0, 0.022], book: [0, -0.014, 0.045, 0.024], kopi: [0.06, -0.016, 0, 0.028], battery: [-0.062, 0.05, 0, 0.019], catapult: [0, 0.05, 0.008, 0.016], sun: [0.064, 0.05, 0.008, 0.019] },
  },
  top: {
    jarSize: 0.33, rowZ: -0.104,
    at: { car: [-0.062, -0.056, 0, 0.02], book: [0, -0.058, 0.03, 0.021], kopi: [0.06, -0.06, 0, 0.022], battery: [-0.062, -0.01, 0, 0.017], catapult: [0, -0.01, 0.008, 0.014], sun: [0.064, -0.008, 0, 0.016] },
  },
  cases: {
    jarSize: 0.33, rowZ: -0.11,
    at: { durian: [-0.056, -0.05, 0, 0.02], rice: [0.004, -0.05, 0, 0.021], bow: [0.06, -0.048, 0, 0.018] },
  },
};

const merge = (parts) => {
  const g = mergeGeometries(parts.map((p) => { const q = p.toNonIndexed(); q.deleteAttribute('uv'); return q; }));
  g.computeVertexNormals();
  return g;
};

const DURIAN_Y = 0.028; // height of the fruit's centre above the page

/** A durian hanging from a branch on a post. Origin on the page, under the fruit. */
function durianGeometry() {
  const parts = [
    new CylinderGeometry(0.0022, 0.0026, 0.048, 10).translate(-0.02, 0.024, 0), // post
    new CylinderGeometry(0.0018, 0.002, 0.03, 10).rotateZ(Math.PI / 2 - 0.12).translate(-0.006, 0.0465, 0), // branch
    new CylinderGeometry(0.0006, 0.0006, 0.009, 6).translate(0, DURIAN_Y + 0.0135, 0), // stalk
    new SphereGeometry(0.0095, 16, 12).scale(1, 1.12, 1).translate(0, DURIAN_Y, 0),
  ];
  // Spikes: short cones all over the husk.
  const n = 22;
  for (let i = 0; i < n; i++) {
    const y = 1 - (2 * (i + 0.5)) / n;
    const r = Math.sqrt(1 - y * y);
    const a = i * 2.39996;
    const d = new Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
    const spike = new ConeGeometry(0.0028, 0.005, 6).translate(0, 0.0022, 0);
    spike.applyQuaternion(quatFromUp(d));
    spike.translate(d.x * 0.0092, DURIAN_Y + d.y * 0.0104, d.z * 0.0092);
    parts.push(spike);
  }
  return merge(parts);
}

function quatFromUp(d) {
  // The rotation that turns +y onto d.
  const m = new Mesh();
  m.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), d.clone().normalize());
  return m.quaternion;
}

/** A bowl heaped with rice. Origin under the middle. */
function riceGeometry() {
  const bowl = new LatheGeometry([[0, 0], [0.008, 0], [0.0165, 0.0125], [0.0155, 0.0125], [0.0078, 0.002], [0, 0.002]].map(([r, y]) => new Vector2(r, y)), 32);
  const mound = new SphereGeometry(0.0148, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.5, 1).translate(0, 0.0105, 0);
  return merge([bowl, mound]);
}

const BOW_Y = 0.026; // height of the bow's middle above the page
const BOW_ARC = 2.5;
const BOW_R = 0.021;
const NOCK_X = -0.011;

/** A bow bent back, standing on its lower tip. Origin on the page under the grip. */
function bowGeometry() {
  return merge([
    new TorusGeometry(BOW_R, 0.0024, 10, 36, BOW_ARC).rotateZ(-BOW_ARC / 2).translate(-BOW_R * Math.cos(BOW_ARC / 2), BOW_Y, 0),
    new CylinderGeometry(0.003, 0.003, 0.008, 10).translate(BOW_R - BOW_R * Math.cos(BOW_ARC / 2), BOW_Y, 0), // grip
  ]);
}

export default function createStoresScene(ctx) {
  const variant = LAYOUTS[ctx.variant] ? ctx.variant : 'full';
  const L = LAYOUTS[variant];
  const x0 = BOOK.gutter + 0.03;
  const dx = (BOOK.pageW - 0.06) / 5;
  const xs = STORE_IDS.map((_, i) => x0 + i * dx);
  const kit = createEnergyKit(ctx, {
    stores: STORE_IDS,
    scale: FULL,
    start: Object.fromEntries(STORE_IDS.map((s) => [s, 0])),
    jarSize: L.jarSize,
    stand: true,
    xs,
    rowZ: L.rowZ,
    ledger: false,
    values: false,
    compactLabels: true,
  });

  // The tall objects stand in the back row, so nothing hides a name
  // written on the page.
  const cx = BOOK.gutter + BOOK.pageW / 2;
  const objects = {};
  const place = (id, obj) => {
    const [x, z, lift] = L.at[id];
    obj.group.position.set(cx + x, pageSurfaceY(cx + x, z) + lift, z);
    ctx.scene.add(obj.group);
    objects[id] = obj;
    return obj;
  };
  const extra = []; // drawn details, as separate strokes
  const wavy = []; // steam, as flowing strokes
  const dashedDrop = (x, z, height) => {
    const y0 = pageSurfaceY(x, z);
    for (let y = 0; y < height; y += 0.008) extra.push(...polylineToSegments([new Vector3(x, y0 + y, z), new Vector3(x, y0 + y + 0.004, z)]));
  };
  const steam = (p, top, spread = 0.006) => {
    for (const [dxs, phase] of [[-spread, 0], [0.001, 1.6], [spread + 0.001, 3.1]]) {
      const pts = [];
      for (let i = 0; i <= 14; i++) {
        const t = i / 14;
        pts.push(new Vector3(p.x + dxs + Math.sin(t * Math.PI * 2.2 + phase) * 0.0022, p.y + top + t * 0.02, p.z));
      }
      wavy.push(...polylineToSegments(pts));
    }
  };

  let batCut = null;
  if (variant === 'cases') {
    const durian = place('durian', createInkObject(durianGeometry(), { color: '#EDE6D2', creaseDeg: false, name: 'durian' }));
    dashedDrop(durian.group.position.x, durian.group.position.z, DURIAN_Y - 0.011);
    const rice = place('rice', createInkObject(riceGeometry(), { color: '#F4EEDF', name: 'rice' }));
    steam(rice.group.position, 0.021, 0.005);
    const bow = place('bow', createInkObject(bowGeometry(), { color: '#E9DFC8', creaseDeg: false, name: 'bow' }));
    // The string, pulled back to the nock, and the arrow resting on the grip.
    const bp = bow.group.position;
    const tipX = BOW_R * Math.cos(BOW_ARC / 2) - BOW_R * Math.cos(BOW_ARC / 2);
    const tipY = BOW_R * Math.sin(BOW_ARC / 2);
    const P = (x, y) => new Vector3(bp.x + x, bp.y + BOW_Y + y, bp.z);
    extra.push(...polylineToSegments([P(tipX, tipY), P(NOCK_X, 0), P(tipX, -tipY)]));
    extra.push(...polylineToSegments([P(NOCK_X, 0), P(0.03, 0)]));
    extra.push(...polylineToSegments([P(0.026, 0.0022), P(0.03, 0), P(0.026, -0.0022)]));
  } else {
    place('car', createInkObject(carGeometry(0.04), { color: '#EFE6D3', name: 'car' }));
    place('book', createInkObject(new BoxGeometry(0.036, 0.007, 0.026).translate(0, 0.0035, 0), { color: '#E6D9C0', name: 'book' }));
    const spring = createSpring({ length: 0.03, radius: 0.004, wire: 0.0009, turns: 10, name: 'catapult' });
    spring.group.rotation.z = -Math.PI / 2;
    place('catapult', spring);
    const battery = place('battery', createInkObject(batteryGeometry(), { color: '#E9E1D0', name: 'battery' }));
    battery.group.scale.setScalar(0.7);
    const cup = place('kopi', createInkObject(cupGeometry(), { color: '#F1EADB', name: 'kopi' }));
    cup.group.scale.setScalar(variant === 'top' ? 0.3 : 0.38);
    place('sun', createInkObject(new SphereGeometry(0.011, 24, 16).translate(0, 0.011, 0), { color: '#F4EEDF', creaseDeg: false, name: 'sun' }));

    // A dashed line under the raised book, the Sun's rays, speed lines
    // behind the rolling car and steam over the kopi.
    const bookAt = objects.book.group.position;
    dashedDrop(bookAt.x, bookAt.z, L.at.book[2]);
    const sp = objects.sun.group.position.clone().add(new Vector3(0, 0.011, 0));
    for (let a = 0; a < 8; a++) {
      const ang = (a / 8) * Math.PI * 2;
      const d = new Vector3(Math.cos(ang), Math.sin(ang), 0);
      extra.push(...polylineToSegments([sp.clone().addScaledVector(d, 0.015), sp.clone().addScaledVector(d, 0.021)]));
    }
    const cp = objects.car.group.position;
    for (const [dy, len] of [[0.006, 0.012], [0.011, 0.018], [0.016, 0.01]]) {
      extra.push(...polylineToSegments([new Vector3(cp.x - 0.026 - len, cp.y + dy, cp.z), new Vector3(cp.x - 0.026, cp.y + dy, cp.z)]));
    }
    steam(objects.kopi.group.position, variant === 'top' ? 0.03 : 0.038);

    // The battery opens in a cutaway when tapped: its front half is cut
    // away (surfaces and lines), showing a glowing core, its chemical
    // potential store, inside.
    const core = new Mesh(
      new CylinderGeometry(0.0075, 0.0075, 0.044, 20).rotateZ(Math.PI / 2).translate(-0.025, 0.012, 0),
      new MeshBasicMaterial({ color: new Color(...glowColour('chemical', 1.4)), toneMapped: false }),
    );
    core.name = 'battery-core';
    batCut = createCutaway(objects.battery, { centre: new Vector3(-0.025, 0.012, 0), depth: 0.012, inside: [core] });
  }
  ctx.scene.add(createInkLines(extra, { widthScale: 0.6, chain: false }));
  if (wavy.length) ctx.scene.add(createInkLines(wavy, { widthScale: 0.55 }));

  // Each name is handwritten on the page just in front of its object, so
  // it never covers the drawing.
  for (const [id, obj] of Object.entries(objects)) {
    const { x, z } = obj.group.position;
    const nz = z + L.at[id][3];
    const at = new Vector3(x, pageSurfaceY(x, nz), nz);
    addNote(ctx, { id: `obj-${id}`, centre: () => at.clone(), width: 0.066, height: variant === 'full' ? 0.0095 : 0.0085, className: 'is-hand' }).textContent = OBJECT_NAMES[id];
  }

  // Tapping an object fills the jar of each store it has energy in. The
  // level rises in the jar itself, with nothing drawn between the two.
  const storesOf = (id) => [].concat(STORE_OF[id]);
  const LEVEL = 0.7;
  const shown = Object.fromEntries(STORE_IDS.map((s) => [s, 0]));
  const target = { ...shown };

  function reveal(id) {
    if (id === 'battery') batCut?.open(true);
    if (!objects[id]) return;
    for (const s of storesOf(id)) target[s] = LEVEL;
  }

  const actions = {};
  for (const id of Object.keys(objects)) actions[id] = { label: `Tap ${OBJECT_NAMES[id].startsWith('the ') ? '' : 'the '}${OBJECT_NAMES[id]}`, short: SHORT_NAMES[id] };
  actions.reset = { label: 'Empty the jars' };

  return {
    figure: {
      caption: variant === 'cases' ? 'Three new cases. One of them has energy in two stores.' : 'Each object keeps energy in one of the six stores.',
      hint: 'Tap an object to see which jar fills.',
    },
    objects: [...kit.objects, ...Object.values(objects)],
    cueTargets: Object.fromEntries(Object.entries(objects).map(([k, o]) => [k, o.group])),
    params: {},
    actions,
    act(id) {
      if (id === 'reset') {
        batCut?.open(false);
        for (const s of STORE_IDS) {
          shown[s] = 0;
          target[s] = 0;
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
      if (batCut) moving = batCut.update(dt, ctx.reducedMotion) || moving;
      for (const s of STORE_IDS) {
        const gap = target[s] - shown[s];
        if (gap <= 0) continue;
        // Rises quickly, then settles, in about a second.
        shown[s] = ctx.reducedMotion || gap < 0.004 ? target[s] : shown[s] + Math.min(gap, Math.max(gap * dt * 4.5, dt * 0.12));
        moving = true;
      }
      kit.set({ ...shown });
      return moving;
    },
    setTime(t) {
      // For screenshots: past the start, every jar tapped so far is full.
      if (t > 0) Object.assign(shown, target);
      kit.set({ ...shown });
      kit.setGlow(1);
    },
    values: () => ({ ...shown }),
    destroy() {
      kit.destroy();
    },
  };
}
