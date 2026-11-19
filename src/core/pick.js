// src/core/pick.js
// Tap and drag objects in the 3D scene (CLAUDE.md section 6, rule 1: students
// handle the models). A scene lists its touchable objects as
//   { object, label, onTap?, onDrag?(ray, phase) }   phase: 'start' | 'move' | 'end'
// A press that hits one of them is taken here, so it does not orbit the view.
// A press that misses falls through to the drag orbit (core/input.js).
import { Raycaster, Vector2 } from 'three';

const TAP_PX = 6; // a press that moves less than this is a tap

export function createPicker(element, camera, { getTargets, onChange }) {
  const ray = new Raycaster();
  const ndc = new Vector2();
  let active = null; // { target, id, x, y, moved }

  function rayAt(e) {
    const r = element.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return ray.ray;
  }

  function hit(e) {
    const targets = getTargets().filter((t) => t.object?.visible !== false);
    if (!targets.length) return null;
    rayAt(e);
    let best = null;
    for (const t of targets) {
      const h = ray.intersectObject(t.object, true)[0];
      if (h && (!best || h.distance < best.distance)) best = { target: t, distance: h.distance };
    }
    return best?.target ?? null;
  }

  function down(e) {
    if (active) return;
    const target = hit(e);
    if (!target) return;
    // Ours: keep the orbit from starting.
    e.stopImmediatePropagation();
    e.preventDefault();
    element.setPointerCapture?.(e.pointerId);
    active = { target, id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
    element.style.cursor = 'grabbing';
    target.onDrag?.(rayAt(e), 'start');
    onChange?.();
  }
  function move(e) {
    if (!active) {
      // Hover: show that the object can be handled.
      if (e.pointerType === 'mouse') element.style.cursor = hit(e) ? 'grab' : '';
      return;
    }
    if (e.pointerId !== active.id) return;
    e.stopImmediatePropagation();
    if (Math.hypot(e.clientX - active.x, e.clientY - active.y) > TAP_PX) active.moved = true;
    if (active.moved) active.target.onDrag?.(rayAt(e), 'move');
    onChange?.();
  }
  function up(e) {
    if (!active || e.pointerId !== active.id) return;
    e.stopImmediatePropagation();
    element.releasePointerCapture?.(e.pointerId);
    const { target, moved } = active;
    active = null;
    element.style.cursor = '';
    if (moved) target.onDrag?.(rayAt(e), 'end');
    else if (target.onTap) target.onTap();
    else target.onDrag?.(rayAt(e), 'end');
    onChange?.();
  }

  // Capture listeners run before the orbit's listeners on the same element.
  element.addEventListener('pointerdown', down, { capture: true });
  element.addEventListener('pointermove', move, { capture: true });
  element.addEventListener('pointerup', up, { capture: true });
  element.addEventListener('pointercancel', up, { capture: true });

  return {
    get dragging() {
      return !!active;
    },
  };
}
