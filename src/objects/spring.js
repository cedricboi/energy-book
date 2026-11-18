// src/objects/spring.js
// A coil spring drawn in ink, built as a tube along a helix. It can be
// rebuilt at any length, so lessons can stretch or squash it.
// Local origin: the centre of the bottom end; the spring runs along +y
// unless the caller rotates it.
import { TubeGeometry, Curve, Vector3 } from 'three';
import { createInkObject } from '../ink/inkObject.js';

class Helix extends Curve {
  constructor(radius, length, turns) {
    super();
    this.radius = radius;
    this.length = length;
    this.turns = turns;
  }
  getPoint(t, target = new Vector3()) {
    const a = t * this.turns * Math.PI * 2;
    return target.set(Math.cos(a) * this.radius, t * this.length, Math.sin(a) * this.radius);
  }
}

export function springGeometry({ radius = 0.012, wire = 0.0016, length = 0.07, turns = 9 } = {}) {
  return new TubeGeometry(new Helix(radius, length, turns), Math.round(turns * 40), wire, 10, false);
}

export function createSpring({ radius = 0.012, wire = 0.0016, length = 0.07, turns = 9, color = '#D9D4CC', name = 'spring' } = {}) {
  const geo = springGeometry({ radius, wire, length, turns });
  return createInkObject(geo, { color, creaseDeg: false, name });
}
