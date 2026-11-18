// src/demo/beakerDemo.js
// Phase 3 demo scene: one ink beaker standing on the right-hand page.
// This is a development scene, not lesson content. Phase 5 replaces it with
// the book engine.
import { createBeaker } from '../objects/beaker.js';
import { pageSurfaceY, BOOK } from '../objects/book.js';
import { createDrawIn } from '../ink/drawIn.js';
import { inkStyle } from '../ink/inkMaterial.js';

export const BEAKER_SPOT = Object.freeze({ x: BOOK.gutter + BOOK.pageW * 0.5, z: 0.06 });

export function createBeakerDemo(scene, { reducedMotion = false } = {}) {
  const beaker = createBeaker();
  beaker.group.position.set(BEAKER_SPOT.x, pageSurfaceY(BEAKER_SPOT.x, BEAKER_SPOT.z), BEAKER_SPOT.z);
  scene.add(beaker.group);

  const drawIn = createDrawIn({
    root: beaker.rise,
    lines: beaker.lines,
    formUniforms: beaker.formUniforms,
    seconds: () => inkStyle.drawInSeconds,
    // Invisible glass must not write depth, or ambient occlusion shades the
    // page where the glass will be before it appears.
    onForm: (p) => {
      beaker.glass.material.depthWrite = p > 0.02;
    },
    reducedMotion,
  });

  return { beaker, drawIn };
}
