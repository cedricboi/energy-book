// src/scenes/bounce.js
// Lesson 6 scene: a ball dropped beside a metre rule, drawn at 1 : 12.
// Gravitational potential, kinetic, elastic potential and internal jars.
// Each squash sends some energy to the internal store, and some away as
// sound (ripples spreading from the contact point, by propagation of waves).
// Shown four times slower than real life. "Step" moves on by 1/100 s.
import { Vector3 } from 'three';
import { createEnergyKit } from './energyKit.js';
import { createBall } from '../objects/ball.js';
import { createInkLines, polylineToSegments } from '../ink/creases.js';
import { pageSurfaceY, BOOK } from '../objects/book.js';
import { addRuler } from './helpers.js';
import { createBounceModel, BALLS, SOUND_SHARE } from '../physics/models/bounce.js';
import { gravitationalPotentialEnergy } from '../physics/equations.js';
import { play } from '../core/sound.js';
import { scenePlanePoint } from '../core/pick.js';

export const DRAW_SCALE = 1 / 12;
export const SLOW = 0.25;
const MAX_H = 1.2;

export default function createBounceScene(ctx) {
  const S = DRAW_SCALE;
  const cx = BOOK.gutter + BOOK.pageW * 0.62;
  const cz = 0.07;
  const floor = pageSurfaceY(cx, cz);
  const W = (x, y, z = 0) => new Vector3(cx + x * S, floor + y * S, cz + z * S);

  const params = {
    ball: { type: 'choice', label: 'Ball', value: 'tennis', options: Object.entries(BALLS).map(([id, b]) => ({ id, label: b.label })) },
    height: { type: 'slider', label: 'Drop height', min: 0.4, max: MAX_H, step: 0.1, value: 1.0, unit: 'm', sigFigs: 2 },
  };
  const s = { ball: 'tennis', height: 1.0 };
  let model = createBounceModel(s);
  // One jar scale for the page: the most energy any ball can start with.
  const scale = Math.max(...Object.values(BALLS).map((b) => gravitationalPotentialEnergy(b.mass, MAX_H)));

  const lossTo = (share) => (p, c) => Math.max(0, c.internal - p.internal) * share;
  const kit = createEnergyKit(ctx, {
    stores: ['gravitational', 'kinetic', 'elastic', 'internal'],
    scale,
    start: { gravitational: model.total, kinetic: 0, elastic: 0, internal: 0 },
    travel: 0.04,
    jarSize: 0.48,
    stand: true,
    rowZ: -0.09,
    transfers: [
      { from: 'gravitational', to: 'kinetic', pathway: 'mechanical', moved: (p, c) => Math.max(0, p.gravitational - c.gravitational) },
      { from: 'kinetic', to: 'gravitational', pathway: 'mechanical', moved: (p, c) => Math.max(0, c.gravitational - p.gravitational), bulge: new Vector3(0, -0.2, 1), lift: 0.016 },
      { from: 'kinetic', to: 'elastic', pathway: 'mechanical', moved: (p, c) => Math.max(0, c.elastic - p.elastic) },
      { from: 'elastic', to: 'kinetic', pathway: 'mechanical', moved: (p, c) => Math.max(0, p.elastic - c.elastic), bulge: new Vector3(0, -0.2, 1), lift: 0.016 },
      { from: 'kinetic', to: 'internal', pathway: 'mechanical', moved: lossTo(1 - SOUND_SHARE) },
      { from: 'kinetic', to: 'internal', pathway: 'waves', moved: lossTo(SOUND_SHARE), bulge: new Vector3(0, 1, 0.3), arc: 0.05 },
    ],
  });

  // The rule and the floor line stand at the ball's depth, so heights read true.
  addRuler(ctx, { at: (m) => W(-0.35, m, 0), length: MAX_H, tick: 0.1, labelEvery: 0.5, tickDir: new Vector3(0.004, 0, 0), id: 'rule' });
  const ground = createInkLines(polylineToSegments([W(-0.45, 0, 0), W(0.6, 0, 0)]), { widthScale: 0.6 });
  ctx.scene.add(ground);

  let ball = null;
  function makeBall() {
    if (ball) ctx.scene.remove(ball.group);
    const b = BALLS[s.ball];
    ball = createBall({ radius: b.radius * S, seam: s.ball === 'tennis', name: 'ball' });
    ctx.scene.add(ball.group);
  }
  makeBall();
  ctx.overlay.add({ id: 'part-ball', kind: 'part', anchor: () => ctx.scene.localToWorld(ball.group.position.clone().add(new Vector3(0.012, 0.015, 0))), html: BALLS[s.ball].label, gap: 2 });

  // Sound ripples: rings that spread from the contact point after a bounce.
  let ripple = null;
  let rippleAge = -1;
  function drawRipple() {
    if (ripple) ctx.scene.remove(ripple);
    ripple = null;
    if (rippleAge < 0 || rippleAge > 0.5) return;
    const segs = [];
    for (let k = 0; k < 3; k++) {
      const r = (0.008 + rippleAge * 0.08 + k * 0.007);
      const pts = [];
      for (let i = 0; i <= 24; i++) {
        const a = Math.PI * (i / 24);
        pts.push(W(0, 0, 0).add(new Vector3(Math.cos(a) * r, Math.sin(a) * r * 0.6, 0)));
      }
      segs.push(...polylineToSegments(pts));
    }
    ripple = createInkLines(segs, { widthScale: 0.5, chain: false });
    ctx.scene.add(ripple);
  }

  function place(v) {
    ball.group.position.copy(W(0, v.y));
    ball.group.scale.set(1 + v.squash * 0.25, 1 - v.squash * 0.35, 1 + v.squash * 0.25);
  }
  const storesOf = (v) => ({ gravitational: v.gravitational, kinetic: v.kinetic, elastic: v.elastic, internal: v.internal });

  let running = false;
  let locked = false;
  let lastBounces = 0;

  function rebuild() {
    model = createBounceModel(s);
    running = false;
    lastBounces = 0;
    rippleAge = -1;
    drawRipple();
    const v = model.values();
    kit.setTotal(model.total);
    kit.set(storesOf(v));
    place(v);
    ctx.overlay.setHtml('part-ball', BALLS[s.ball].label);
  }
  rebuild();

  function advance(mdt, screenDt) {
    model.step(mdt);
    const v = model.values();
    if (v.bounces > lastBounces) {
      lastBounces = v.bounces;
      rippleAge = 0;
      play('ball-bounce');
    }
    if (rippleAge >= 0) {
      rippleAge += screenDt;
      drawRipple();
      if (rippleAge > 0.5) rippleAge = -1;
    }
    const flowing = kit.step(storesOf(v), mdt, screenDt);
    place(v);
    return { v, flowing };
  }

  // Lift the ball to a drop height by dragging it. Let go and it drops.
  const hit = new Vector3();
  const api = {
    interactive: [{
      get object() {
        return ball.group;
      },
      label: 'ball',
      onDrag(ray, phase) {
        if (locked) return;
        if (phase === 'start') running = false;
        if (scenePlanePoint(ctx.scene, ray, cz, hit)) {
          const h = Math.round(Math.min(MAX_H, Math.max(params.height.min, (hit.y - floor) / S)) * 10) / 10;
          if (h !== s.height) {
            s.height = h;
            params.height.value = h;
            rebuild();
            api.onParamChange?.('height', h);
          }
        }
        if (phase === 'end') api.act('drop');
      },
    }],
    onParamChange: null,
    figure: {
      caption: `The ball is drawn at 1 : ${Math.round(1 / S)} and shown four times slower.`,
      hint: 'Drag the ball up to a drop height, then let go.',
    },
    get objects() {
      return [...kit.objects, ball];
    },
    get cueTargets() {
      return { ball: ball.group };
    },
    params,
    setParam(id, value) {
      s[id] = value;
      params[id].value = value;
      if (id === 'ball') makeBall();
      rebuild();
    },
    actions: {
      drop: { label: 'Drop the ball', primary: true },
      step: { label: 'Step 1/100 s' },
      reset: { label: 'Reset' },
    },
    act(id) {
      if (locked && id !== 'reset') return;
      if (id === 'drop') {
        rebuild();
        running = true;
      } else if (id === 'step') {
        running = false;
        advance(0.01, 0.04);
      } else if (id === 'reset') {
        rebuild();
      }
    },
    setLocked(on) {
      locked = on;
    },
    setHideValues(on) {
      kit.setHideValues(on);
    },
    update(dt, { formReady }) {
      let moving = kit.fadeGlow(dt, formReady);
      if (!running) return moving || rippleAge >= 0;
      const { v, flowing } = advance(dt * SLOW * (ctx.reducedMotion ? 0.5 : 1), dt);
      if (v.stopped && !flowing) running = false;
      moving = true;
      return moving;
    },
    setTime(t) {
      rebuild();
      kit.setGlow(1);
      if (locked) return;
      for (let k = 0; k < t * 60; k++) advance(SLOW / 60, 1 / 60);
    },
    values: () => ({ ...model.values(), total: model.total, ball: s.ball, height: s.height }),
    destroy() {
      kit.destroy();
    },
  };
  return api;
}
