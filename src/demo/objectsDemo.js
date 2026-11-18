// src/demo/objectsDemo.js
// Phase 3 part 2: three test objects in the house ink style, to prove it
// carries over from the beaker: a ball, a wooden crate and a spring.
// Development scene only.
import { createBall } from '../objects/ball.js';
import { createCrate } from '../objects/crate.js';
import { createSpring } from '../objects/spring.js';
import { pageSurfaceY } from '../objects/book.js';
import { createDrawIn } from '../ink/drawIn.js';
import { inkStyle } from '../ink/inkMaterial.js';

/** Run several draw-ins together, as one. */
export function combineDrawIns(list) {
  return {
    play() { list.forEach((d) => d.play()); },
    update(dt) { return list.map((d) => d.update(dt)).some(Boolean); },
    setTime(t) { list.forEach((d) => d.setTime(t)); },
  };
}

export function createObjectsDemo(scene, { reducedMotion = false } = {}) {
  const items = [
    [createBall(), -0.12, 0.03],
    [createCrate(), 0.07, -0.03],
    [createSpring(), 0.15, 0.07],
  ];
  const drawIns = [];
  for (const [obj, x, z] of items) {
    obj.group.position.set(x, pageSurfaceY(x, z), z);
    scene.add(obj.group);
    drawIns.push(createDrawIn({
      root: obj.rise, lines: obj.lines, formUniforms: obj.formUniforms,
      seconds: () => inkStyle.drawInSeconds, reducedMotion,
    }));
  }
  return { items, drawIn: combineDrawIns(drawIns) };
}
