// src/objects/cutaway.js
// A cutaway (TECHNIQUES.md A8): a plane facing the reader slides in and
// cuts the front half of an ink object away, surfaces and lines alike, so
// what is inside shows. The body is drawn double-sided, so its inner wall
// reads as paper, and the outline keeps the whole object's silhouette.
import { Plane, Vector3, DoubleSide } from 'three';

/**
 * @param {object} obj   an ink object (createInkObject)
 * @param {object} o
 * @param {Vector3} o.centre   middle of the object, in its rise group's space
 * @param {number} o.depth     half its depth front to back, in the same space
 * @param {import('three').Object3D[]} [o.inside]  shown only while cut open
 * @param {(planes: Plane[] | null) => void} [o.clip]  trims what is inside too
 * @param {number} [o.seconds] time to open
 */
export function createCutaway(obj, { centre, depth, inside = [], clip, seconds = 0.6 }) {
  obj.body.material.side = DoubleSide;
  const plane = new Plane(new Vector3(0, 0, -1), 0);
  for (const m of inside) {
    m.visible = false;
    obj.rise.add(m);
  }
  let cut = 0;
  let target = 0;
  const c = new Vector3();
  const s = new Vector3();

  function apply() {
    const on = cut > 0.001;
    const planes = on ? [plane] : null;
    obj.body.material.clippingPlanes = planes;
    for (const l of obj.lines) l.material.clippingPlanes = planes;
    for (const m of inside) m.visible = on;
    clip?.(planes);
    if (!on) return;
    obj.group.updateMatrixWorld();
    c.copy(centre);
    obj.rise.localToWorld(c);
    obj.rise.getWorldScale(s);
    // The plane sweeps from the front of the object to its middle.
    plane.constant = c.z + depth * s.z * (1 - cut);
  }

  return {
    /** Open (or close) the cutaway. */
    open(on = true) {
      target = on ? 1 : 0;
    },
    /** Jump straight to open or closed. */
    set(on) {
      cut = target = on ? 1 : 0;
      apply();
    },
    /** Advance the opening. Returns true while it moves. */
    update(dt, reducedMotion = false) {
      if (cut === target) return false;
      const step = reducedMotion ? 1 : dt / seconds;
      cut = target > cut ? Math.min(target, cut + step) : Math.max(target, cut - step);
      apply();
      return true;
    },
    get isOpen() {
      return target === 1;
    },
  };
}
