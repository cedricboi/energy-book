// src/scenes/ramp.js
// Lesson 5 scene: a skateboarder on a half-pipe, drawn to scale (1 : 40)
// beside a height ruler, with gravitational potential, kinetic and internal
// jars and the ledger bar.
import { Group, Vector3, Mesh, SphereGeometry, MeshBasicMaterial, Color, CircleGeometry, AdditiveBlending, Matrix4 } from 'three';
import { scenePlanePoint } from '../core/pick.js';
import { STORES } from '../energy/palette.js';
import { createEnergyKit } from './energyKit.js';
import { createRampModel, rampHeight, RAMP } from '../physics/models/ramp.js';
import { createHalfPipe, HALF_PIPE_DEPTH } from '../objects/halfPipe.js';
import { createSkater } from '../objects/skater.js';
import { createInkLines, polylineToSegments } from '../ink/creases.js';
import { pageSurfaceY, BOOK } from '../objects/book.js';
import { gravitationalPotentialEnergy } from '../physics/equations.js';
import { formatQuantity } from '../physics/format.js';

export const DRAW_SCALE = 1 / 50; // page metres per real metre
const MAX = { mass: 80, height: 3.0 };
const JAR_SCALE = gravitationalPotentialEnergy(MAX.mass, MAX.height); // one scale for the page

export default function createRampScene(ctx) {
  const S = DRAW_SCALE;
  const cx = BOOK.gutter + BOOK.pageW / 2 + 0.008;
  const cz = 0.05;
  const base = pageSurfaceY(cx, cz);
  const toWorld = (x, y, z = 0) => new Vector3(cx + x * S, base + y * S, cz + z * S);

  const params = {
    height: { type: 'slider', label: 'Start height', min: 0.5, max: MAX.height, step: 0.1, value: 2.0, unit: 'm', sigFigs: 2 },
    mass: { type: 'slider', label: 'Mass of the skateboarder', min: 30, max: MAX.mass, step: 5, value: 50, unit: 'kg', sigFigs: 2 },
    friction: { type: 'switch', label: 'Friction on', value: false },
  };
  const settings = { height: 2.0, mass: 50, friction: false, side: -1 };

  let model = createRampModel({ mass: settings.mass, startHeight: settings.height, friction: settings.friction });

  // The jars stand on a store stand behind the half-pipe (scenes/stand.js).
  const jarXs = [cx - 0.05, cx, cx + 0.05];

  const kit = createEnergyKit(ctx, {
    stores: ['gravitational', 'kinetic', 'internal'],
    scale: JAR_SCALE,
    start: { gravitational: model.total, kinetic: 0, internal: 0 },
    travel: 0.2,
    jarSize: 0.42,
    rowZ: -0.075,
    xs: jarXs,
    stand: true,
    caption: 'Energy ledger. The dark line marks the total.',
    transfers: [
      { from: 'gravitational', to: 'kinetic', pathway: 'mechanical', moved: (p, c) => Math.max(0, p.gravitational - c.gravitational), bulge: new Vector3(0, 0.8, 1) },
      { from: 'kinetic', to: 'gravitational', pathway: 'mechanical', moved: (p, c) => Math.max(0, c.gravitational - p.gravitational), bulge: new Vector3(0, -0.2, 1), lift: 0.018 },
      { from: 'kinetic', to: 'internal', pathway: 'mechanical', moved: (p, c) => Math.max(0, c.internal - p.internal) },
    ],
  });

  // The half-pipe and the rider.
  const pipe = createHalfPipe();
  pipe.group.scale.setScalar(S);
  pipe.group.position.copy(toWorld(0, 0));
  const rider = createSkater();
  rider.group.scale.setScalar(S);
  ctx.scene.add(pipe.group, rider.group);
  // A larger, invisible target around the rider, so a finger can grab her.
  const grab = new Mesh(new SphereGeometry(1.5, 12, 8), new MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  grab.position.y = 0.9;
  grab.name = 'rider-grab';
  rider.group.add(grab);
  rider.group.userData.grab = grab;

  // Height ruler beside the left deck: a tick every 0.5 m, a label every 1 m.
  // The ruler and the start-height line stand at the rider's depth (the middle
  // of the pipe), so her height reads true against them from any angle.
  const rulerX = -RAMP.HALF - 0.4 - 0.9;
  const front = 0;
  const rulerSegs = polylineToSegments([toWorld(rulerX, 0, front), toWorld(rulerX, 3.0, front)]);
  for (let h = 0; h <= 3.0001; h += 0.5) {
    const len = Math.abs(h % 1) < 1e-6 ? 0.22 : 0.12;
    rulerSegs.push(...polylineToSegments([toWorld(rulerX, h, front), toWorld(rulerX + len, h, front)]));
  }
  const ruler = createInkLines(rulerSegs, { widthScale: 0.7, chain: false });
  ctx.scene.add(ruler);

  // A dashed line at the start height, across the ramp, to compare heights.
  const startLine = new Group();
  ctx.scene.add(startLine);
  let startLineObj = null;
  function drawStartLine() {
    if (startLineObj) startLine.remove(startLineObj);
    const segs = [];
    const h = settings.height;
    for (let x = -RAMP.HALF - 0.2; x < RAMP.HALF + 0.2; x += 0.3) {
      segs.push(...polylineToSegments([toWorld(x, h, front), toWorld(x + 0.15, h, front)]));
    }
    startLineObj = createInkLines(segs, { widthScale: 0.5, chain: false });
    startLine.add(startLineObj);
  }
  drawStartLine();
  // The ruler's numbers, printed beside it in the drawing (not floating).
  const marks = { left: rulerX - 0.95, right: rulerX - 0.12, top: 3.3, bottom: -0.3 };
  const marksPx = [90, Math.round((90 * (marks.top - marks.bottom)) / (marks.right - marks.left))];
  ctx.overlay.addPrinted({
    id: 'ruler-marks',
    className: 'ruler-marks',
    size: marksPx,
    quad: () => [toWorld(marks.left, marks.top, front), toWorld(marks.right, marks.top, front), toWorld(marks.right, marks.bottom, front), toWorld(marks.left, marks.bottom, front)].map((v) => ctx.scene.localToWorld(v)),
    html: [1, 2, 3].map((h) => `<span style="top:${((marks.top - h) / (marks.top - marks.bottom)) * 100}%">${formatQuantity(h, 'm')}</span>`).join(''),
  });
  const speedLabel = ctx.overlay.add({ id: 'speed', anchor: () => rider.group.position.clone().add(new Vector3(0, -0.012, 0.02)), html: '' });
  ctx.overlay.setVisible('speed', false);

  // Where friction warms the wheels and the ramp: a small glow of the
  // internal store's colour at the wheels, while she moves with friction on.
  // It is energy, so it glows (CLAUDE.md section 4).
  const warmth = new Mesh(
    new CircleGeometry(0.0035, 24),
    new MeshBasicMaterial({ color: new Color(STORES.internal.hex).multiplyScalar(2.6), transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending, toneMapped: false }),
  );
  warmth.name = 'friction-warmth';
  const surfaceNormal = new Vector3();
  const tangent = new Vector3();
  const ACROSS = new Vector3(0, 0, -1); // tangent x across = surface normal
  const basis = new Matrix4();
  warmth.visible = false;
  ctx.scene.add(warmth);

  function placeRider(v) {
    const p = toWorld(v.x, v.y);
    rider.group.position.copy(p);
    rider.group.rotation.z = Math.atan(2 * RAMP.K * v.x);
    rider.group.rotation.y = v.dir > 0 ? 0 : Math.PI;
    const glow = settings.friction && running ? Math.min(1, (v.v ?? 0) / 4) : 0;
    warmth.visible = glow > 0.02;
    warmth.material.opacity = glow;
    // Lie on the ramp's surface under the board, stretched along it.
    const slope = Math.atan(2 * RAMP.K * v.x);
    surfaceNormal.set(-Math.sin(slope), Math.cos(slope), 0);
    tangent.set(Math.cos(slope), Math.sin(slope), 0);
    basis.makeBasis(tangent, ACROSS, surfaceNormal);
    warmth.quaternion.setFromRotationMatrix(basis);
    warmth.scale.set(2.2, 1, 1);
    warmth.position.copy(p).addScaledVector(surfaceNormal, 0.0003);
  }

  let running = false;
  let locked = false;
  let pauseAtBottom = false;
  const MAX_PASSES_SMOOTH = 4;
  const storesOf = (v) => ({ gravitational: v.gravitational, kinetic: v.kinetic, internal: v.internal });

  function rebuild() {
    model = createRampModel({ mass: settings.mass, startHeight: settings.height, friction: settings.friction, side: settings.side });
    running = false;
    pauseAtBottom = false;
    ctx.overlay.setVisible('speed', false);
    const v = model.values();
    kit.setTotal(model.total);
    kit.set(storesOf(v));
    placeRider(v);
    drawStartLine();
  }
  rebuild();

  function showSpeed(v) {
    ctx.overlay.setHtml('speed', `speed at the bottom ${formatQuantity(v.v, 'm/s', 2)}`);
    ctx.overlay.setVisible('speed', true);
    speedLabel.classList.add('label-reading');
  }

  // Drag the rider up or down the wall to choose the start height. Let go
  // and she rolls (unless a prediction has to be made first).
  const hitPoint = new Vector3();
  function dragTo(worldRay) {
    if (!scenePlanePoint(ctx.scene, worldRay, cz, hitPoint)) return;
    const raw = (hitPoint.y - base) / S;
    const h = Math.round(Math.min(MAX.height, Math.max(0.5, raw)) * 10) / 10;
    // She starts on whichever wall she is dragged up.
    const side = hitPoint.x < cx ? -1 : 1;
    if (h === settings.height && side === settings.side && !running) return;
    settings.height = h;
    settings.side = side;
    params.height.value = h;
    rebuild();
    api.onParamChange?.('height', h);
  }

  // Named shots for the guided steps: where the camera can look.
  const world = (v) => ctx.scene.localToWorld(v.clone());
  const jarsCentre = () => kit.jars.kinetic.group.getWorldPosition(new Vector3()).add(new Vector3(0, 0.02, 0));
  const api = {
    shots: {
      rider: () => ({ target: rider.group.getWorldPosition(new Vector3()).add(new Vector3(0, 0.012, 0)), dist: 0.2, elevationDeg: 24, azimuthDeg: 8 }),
      wheels: () => ({ target: rider.group.getWorldPosition(new Vector3()), dist: 0.13, elevationDeg: 24, azimuthDeg: 4 }),
      jars: () => ({ target: jarsCentre(), dist: 0.24, elevationDeg: 22 }),
      pipe: () => ({ target: world(toWorld(0, 1.2)), dist: 0.34, elevationDeg: 26 }),
    },
    figure: {
      caption: `The half-pipe is drawn at 1 : ${Math.round(1 / S)}. The dashed line marks her start height.`,
      hint: 'Drag the skateboarder up either wall, then let go.',
    },
    interactive: [{
      object: rider.group,
      label: 'skateboarder',
      onDrag(ray, phase) {
        if (phase === 'start') running = false;
        dragTo(ray);
        if (phase === 'end') {
          if (!locked) {
            rebuild();
            running = true;
          }
        }
      },
    }],
    onParamChange: null,
    objects: [...kit.objects, pipe, rider],
    cueTargets: { rider: rider.group },
    params,
    setParam(id, value) {
      settings[id] = value;
      params[id].value = value;
      rebuild();
    },
    actions: {
      run: { label: 'Let her go', primary: true },
      pauseBottom: { label: 'Pause at the bottom' },
      reset: { label: 'Reset' },
    },
    act(id) {
      if (locked && id !== 'reset') return;
      if (id === 'run') {
        rebuild();
        running = true;
      } else if (id === 'pauseBottom') {
        if (!running) {
          rebuild();
          running = true;
        }
        pauseAtBottom = true;
        ctx.overlay.setVisible('speed', false);
      } else if (id === 'reset') {
        rebuild();
      }
    },
    setLocked(on) {
      locked = on;
    },
    setHideValues(on) {
      kit.setHideValues(on);
      if (on) ctx.overlay.setVisible('speed', false);
    },
    update(dt, { formReady }) {
      let moving = kit.fadeGlow(dt, formReady);
      if (!running) return moving;
      const before = model.values();
      model.step(dt * (ctx.reducedMotion ? 0.6 : 1));
      let v = model.values();
      if (pauseAtBottom && Math.sign(before.x) !== Math.sign(v.x) && before.x !== 0) {
        // Stop exactly at the bottom and show the speed there.
        running = false;
        pauseAtBottom = false;
        showSpeed(v);
      }
      const flowing = kit.step(storesOf(v), dt, dt);
      placeRider(v);
      if (v.stopped || (!settings.friction && v.passes >= MAX_PASSES_SMOOTH && v.kinetic < model.total * 0.002)) running = false;
      moving = running || flowing || moving;
      v = null;
      return moving;
    },
    /** Jump in time (screenshots): run the model from the start for t seconds. */
    setTime(t) {
      rebuild();
      kit.setGlow(1);
      // A locked scene (a prediction not yet committed) stays at the start.
      if (locked) t = 0;
      const dt = 1 / 60;
      for (let s = 0; s < t; s += dt) {
        model.step(dt);
        kit.step(storesOf(model.values()), dt, 0);
      }
      placeRider(model.values());
    },
    values() {
      const v = model.values();
      return { ...v, total: model.total, mass: settings.mass, height: settings.height, friction: settings.friction, bottomSpeed: model.bottomSpeed() };
    },
    destroy() {
      kit.destroy();
    },
  };
  return api;
}
