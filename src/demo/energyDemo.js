// src/demo/energyDemo.js
// Phase 4 demo: a squashed spring (elastic potential store) launches a ball
// (kinetic store). The ball slows on the page and the internal store fills.
// Shown slowed down four times so the energy can be followed by eye.
// Development scene only. The lesson versions are built in Phases 5 and 6.
import { Vector3 } from 'three';
import { createStoreJar } from '../energy/storeJar.js';
import { createFlowPath } from '../energy/flow.js';
import { createLedgerBar } from '../energy/ledgerBar.js';
import { createDisplayLedger } from '../energy/displayLedger.js';
import { STORES, iconSvg } from '../energy/palette.js';
import { createSpringLaunch } from '../physics/models/springLaunch.js';
import { formatQuantity } from '../physics/format.js';
import { createBall } from '../objects/ball.js';
import { createCrate } from '../objects/crate.js';
import { springGeometry, createSpring } from '../objects/spring.js';
import { pageSurfaceY } from '../objects/book.js';
import { createDrawIn } from '../ink/drawIn.js';
import { combineDrawIns } from './objectsDemo.js';
import { inkStyle } from '../ink/inkMaterial.js';
import { hullFrom } from '../ink/inkObject.js';

export const SLOW = 0.25; // model seconds per screen second

export function createEnergyDemo(scene, overlay, overlayRoot, { reducedMotion = false } = {}) {
  const model = createSpringLaunch();
  const scale = model.total; // one scale for the page: a full jar holds the total
  const stores = ['elastic', 'kinetic', 'internal'];

  // Jars in a row on the left-hand page.
  const jarX = [-0.165, -0.105, -0.045];
  const jarZ = 0.05;
  const jars = {};
  stores.forEach((s, i) => {
    const jar = createStoreJar({ store: s, scale, value: s === 'elastic' ? model.total : 0 });
    jar.group.position.set(jarX[i], pageSurfaceY(jarX[i], jarZ), jarZ);
    scene.add(jar.group);
    jars[s] = jar;
  });

  // Objects on the right-hand page: a stop block, the spring, the ball.
  const laneZ = 0.0;
  const startX = 0.03;
  const block = createCrate({ size: 0.03 });
  block.group.position.set(0.012, pageSurfaceY(0.012, laneZ), laneZ);
  scene.add(block.group);

  const ball = createBall({ name: 'ball' });
  const ballR = 0.0335;
  scene.add(ball.group);

  const springLen = (open) => 0.022 + open * model.compression;
  const spring = createSpring({ length: springLen(0), radius: 0.011, turns: 8 });
  spring.group.rotation.z = -Math.PI / 2; // lie along +x
  spring.group.position.set(startX - 0.002, pageSurfaceY(startX, laneZ) + ballR, laneZ);
  scene.add(spring.group);
  function setSpring(open) {
    const g = springGeometry({ radius: 0.011, length: springLen(open), turns: 8 });
    spring.body.geometry.dispose();
    spring.body.geometry = g;
    const hull = spring.body.children[0];
    hull.geometry.dispose();
    hull.geometry = hullFrom(g);
  }

  function placeBall(x) {
    const bx = startX + springLen(0) + ballR + x;
    ball.group.position.set(bx, pageSurfaceY(bx, laneZ), laneZ);
  }

  // Flows between the jars.
  const top = (s) => jars[s].group.position.clone().add(new Vector3(0, 0.062, 0));
  const flowEK = createFlowPath({ from: top('elastic'), to: top('kinetic'), pathway: 'mechanical', fromStore: 'elastic', toStore: 'kinetic', arc: 0.035, travel: 0.35 * SLOW });
  const flowKI = createFlowPath({ from: top('kinetic'), to: top('internal'), pathway: 'mechanical', fromStore: 'kinetic', toStore: 'internal', arc: 0.035, travel: 0.35 * SLOW });
  for (const f of [flowEK, flowKI]) scene.add(f.pathLine, f.points);

  const dl = createDisplayLedger({
    start: { elastic: model.total, kinetic: 0, internal: 0 },
    travel: 0.35 * SLOW,
    transfers: [
      { from: 'elastic', to: 'kinetic', moved: (p, c) => p.elastic - c.elastic },
      { from: 'kinetic', to: 'internal', moved: (p, c) => c.internal - p.internal },
    ],
  });
  dl.ledgers[0] = flowEK.ledger;
  dl.ledgers[1] = flowKI.ledger;

  // Labels: store name and value above each jar, part names by the objects.
  for (const s of stores) {
    overlay.add({ id: `jar-${s}`, anchor: () => jars[s].labelPointBelow(), html: '', prefer: 'below', gap: 6 });
    overlay.addGlow(() => jars[s].glowCorners());
  }
  overlay.add({ id: 'spring', kind: 'part', anchor: () => spring.group.position.clone().add(new Vector3(0.01, 0.02, 0)), html: 'spring' });
  overlay.add({ id: 'ball', kind: 'part', anchor: () => ball.group.position.clone().add(new Vector3(0, 0.07, 0)), html: 'ball' });

  const ledger = createLedgerBar(overlayRoot, { stores, total: model.total, caption: 'Energy ledger (the line marks the total)' });
  ledger.el.classList.add('demo-ledger');

  // Draw-in for every ink object.
  const drawables = [...stores.map((s) => jars[s]), block, ball, spring];
  const drawIn = combineDrawIns(drawables.map((o) => createDrawIn({
    root: o.rise, lines: o.lines, formUniforms: o.formUniforms, seconds: () => inkStyle.drawInSeconds, reducedMotion,
  })));

  let t = 0; // model time
  let running = false;
  let glow = 0;
  let autoStarted = false;
  let shown = dl.snapshot();

  function refresh() {
    for (const s of stores) {
      jars[s].setValue(Math.max(0, shown.display[s]));
      jars[s].setGlowFade(glow);
      overlay.setHtml(`jar-${s}`, `<span class="jar-name">${iconSvg(s, 16)} ${STORES[s].short}</span><span class="jar-val">${formatQuantity(Math.max(0, shown.display[s]), 'J', 2)}</span>`);
    }
    ledger.update(shown.display, shown.transit);
    const st = model.at(t);
    setSpring(st.springOpen);
    placeBall(st.x);
  }

  function reset() {
    t = 0;
    running = false;
    dl.reset({ elastic: model.total, kinetic: 0, internal: 0 });
    shown = dl.snapshot();
    refresh();
  }
  reset();

  return {
    drawIn,
    model,
    /** Start the launch. */
    play() {
      reset();
      running = true;
    },
    /** Advance by screen time. Returns true while anything moves. */
    update(dtScreen) {
      let moving = false;
      if (glow < 1 && drawableDone()) {
        glow = Math.min(1, glow + dtScreen / 0.6);
        moving = true;
        // Then the energy moves: the launch starts once the glow is in.
        if (glow >= 1 && !autoStarted) {
          autoStarted = true;
          reset();
          running = true;
        }
      }
      if (running) {
        const dt = dtScreen * SLOW * (reducedMotion ? 0.5 : 1);
        t += dt;
        const s = model.at(t);
        shown = dl.step({ elastic: s.elastic, kinetic: s.kinetic, internal: s.internal }, dt);
        for (const f of [flowEK, flowKI]) f.step(0); // refresh particle positions
        const flowing = flowEK.active || flowKI.active;
        for (const sId of stores) jars[sId].animate(dtScreen, flowing);
        if (t > model.duration && !flowing) running = false;
        moving = true;
      }
      refresh();
      return moving;
    },
    /** Jump to a model time (for screenshots), replaying the ledger exactly. */
    setTime(target) {
      reset();
      glow = 1;
      autoStarted = true;
      const dt = (1 / 60) * SLOW;
      while (t < target) {
        t = Math.min(target, t + dt);
        const s = model.at(t);
        shown = dl.step({ elastic: s.elastic, kinetic: s.kinetic, internal: s.internal }, dt);
      }
      flowEK.step(0);
      flowKI.step(0);
      refresh();
    },
    snapshot: () => ({ t, ...shown }),
  };

  function drawableDone() {
    return drawables.every((o) => o.formUniforms[0].value >= 1);
  }
}
