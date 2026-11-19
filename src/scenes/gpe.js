// src/scenes/gpe.js
// Lesson 4 scene: a bookshelf with shelves at 0.5 m, 1.0 m, 1.5 m and 2.0 m,
// drawn at 1 : 20 beside a metre rule. A box sits on a chosen shelf. The
// gravitational potential jar shows Ep = mgh for its height and mass.
import { Vector3, BoxGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { scenePlanePoint } from '../core/pick.js';
import { createEnergyKit } from './energyKit.js';
import { createInkObject } from '../ink/inkObject.js';
import { createCrate } from '../objects/crate.js';
import { pageSurfaceY, BOOK } from '../objects/book.js';
import { addRuler, shotOf, shotOfJars } from './helpers.js';
import { gravitationalPotentialEnergy } from '../physics/equations.js';

export const DRAW_SCALE = 1 / 20;
export const SHELVES = [0.5, 1.0, 1.5, 2.0];
const MAX_MASS = 4;
const SCALE = gravitationalPotentialEnergy(MAX_MASS, 2.0);

export default function createGpeScene(ctx) {
  const S = DRAW_SCALE;
  const cx = BOOK.gutter + BOOK.pageW / 2 + 0.01;
  const cz = 0.045;
  const base = pageSurfaceY(cx, cz);
  const W = (x, y, z = 0) => new Vector3(cx + x * S, base + y * S, cz + z * S);

  const params = {
    shelf: { type: 'choice', label: 'Shelf height', value: '1', options: SHELVES.map((h, i) => ({ id: String(i), label: `${h.toFixed(1)} m` })) },
    mass: { type: 'slider', label: 'Mass of the box', min: 1, max: MAX_MASS, step: 1, value: 1, unit: 'kg', sigFigs: 2 },
  };
  const s = { shelf: 1, mass: 1 };
  const h = () => SHELVES[s.shelf];
  const ep = () => gravitationalPotentialEnergy(s.mass, h());

  const kit = createEnergyKit(ctx, {
    stores: ['gravitational'],
    scale: SCALE,
    start: { gravitational: ep() },
    jarSize: 0.6,
    stand: true,
    rowZ: -0.085,
    xs: [BOOK.gutter + 0.072], // behind the ruler, clear of the spine and the page edge
  });

  // The shelf unit: two sides and four boards, 0.8 m wide and 0.4 m deep.
  const parts = [
    new BoxGeometry(0.04, 2.15, 0.4).translate(-0.42, 1.075, 0),
    new BoxGeometry(0.04, 2.15, 0.4).translate(0.42, 1.075, 0),
  ];
  for (const y of SHELVES) parts.push(new BoxGeometry(0.84, 0.03, 0.4).translate(0, y - 0.015, 0));
  const shelfGeo = mergeGeometries(parts.map((p) => p.toNonIndexed()));
  const unit = createInkObject(shelfGeo, { color: '#E6D7BC', name: 'shelves', maxLayers: 1 });
  unit.group.scale.setScalar(S);
  unit.group.position.copy(W(0, 0));
  ctx.scene.add(unit.group);

  const box = createCrate({ size: 0.4 * S, name: 'box' });
  ctx.scene.add(box.group);
  addRuler(ctx, { at: (m) => W(-0.7, m, 0.2), length: 2.0, tick: 0.1, labelEvery: 0.5, tickDir: new Vector3(0.005, 0, 0), id: 'rule' });
  ctx.overlay.add({ id: 'part-box', kind: 'part', anchor: () => box.group.position.clone().add(new Vector3(0.012, 0.012, 0)), html: 'box', gap: 2 });

  function place() {
    box.group.position.copy(W(0.1, h(), 0));
    kit.set({ gravitational: ep() });
  }
  place();

  // Drag the box up or down: it settles on the nearest shelf.
  const hit = new Vector3();
  let api;
  const interactive = [{
    object: box.group,
    label: 'box',
    onDrag(ray) {
      if (!scenePlanePoint(ctx.scene, ray, cz, hit)) return;
      const metres = (hit.y - base) / S;
      let best = 0;
      SHELVES.forEach((y, i) => {
        if (Math.abs(y - metres) < Math.abs(SHELVES[best] - metres)) best = i;
      });
      if (best === s.shelf) return;
      api.setParam('shelf', String(best));
      api.onParamChange?.('shelf', String(best));
    },
  }];

  api = {
    interactive,
    onParamChange: null,
    shots: {
      shelves: shotOf(() => [unit.group, box.group], { fill: 2.2 }),
      box: shotOf(() => box.group, { fill: 4 }),
      jar: shotOfJars(kit, null, { fill: 3 }),
    },
    figure: {
      caption: `The shelves are drawn at 1 : ${Math.round(1 / S)} beside a metre rule.`,
      hint: 'Drag the box up or down to another shelf.',
    },
    objects: [...kit.objects, unit, box],
    cueTargets: { box: box.group },
    params,
    setParam(id, v) {
      s[id] = id === 'shelf' ? Number(v) : v;
      params[id].value = v;
      place();
    },
    actions: {},
    act() {},
    setLocked() {},
    setHideValues(on) {
      kit.setHideValues(on);
    },
    update(dt, { formReady }) {
      return kit.fadeGlow(dt, formReady);
    },
    setTime() {
      kit.setGlow(1);
    },
    values: () => ({ height: h(), mass: s.mass, gravitational: ep() }),
    destroy() {
      kit.destroy();
    },
  };
  return api;
}
