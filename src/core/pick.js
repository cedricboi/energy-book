// src/core/pick.js
// Tap and drag objects in the 3D scene (CLAUDE.md section 6, rule 1: students
// handle the models). A scene lists its touchable objects as
//   { object, label, onTap?, onDrag?(ray, phase) }   phase: 'start' | 'move' | 'end'
// A press that hits one of them is taken here, so it does not orbit the view.
// A press that misses falls through to the drag orbit (core/input.js).
import { Raycaster, Vector2, Vector3, Box3, Sphere, Mesh, SphereGeometry, MeshBasicMaterial, Plane, Matrix4 } from 'three';

const TAP_PX = 6; // a press that moves less than this is a tap

const box = new Box3();
const sphere = new Sphere();
const scale = new Vector3();
const proxyMaterial = new MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });

/**
 * Give a small object a larger, invisible target, so a finger can catch it.
 * The target is a sphere around the object, at least minRadius metres.
 */
export function addGrabTarget(group, { grow = 1.5, minRadius = 0.012 } = {}) {
  if (group.userData.grab) return;
  group.getWorldScale(scale);
  if (Math.min(scale.x, scale.y, scale.z) < 1e-4) return; // still popping up
  group.updateMatrixWorld(true);
  box.setFromObject(group).getBoundingSphere(sphere);
  const s = Math.max(scale.x, scale.y, scale.z) || 1;
  const r = Math.max(sphere.radius * grow, minRadius) / s;
  const proxy = new Mesh(new SphereGeometry(1, 12, 8), proxyMaterial);
  proxy.scale.setScalar(r);
  proxy.position.copy(group.worldToLocal(sphere.center.clone()));
  proxy.name = 'grab-target';
  proxy.renderOrder = -1;
  group.add(proxy);
  group.userData.grab = proxy;
}

const plane = new Plane();
const toLocal = new Matrix4();
const zAxis = new Vector3(0, 0, 1);

/**
 * Where a pointer ray meets the upright plane z = const, in the scene group's
 * own coordinates (the group may be lifted or scaled while it pops up).
 * Returns the point, or null if the ray runs parallel to the plane.
 */
export function scenePlanePoint(group, worldRay, z, out = new Vector3()) {
  group.updateMatrixWorld();
  toLocal.copy(group.matrixWorld).invert();
  const ray = worldRay.clone().applyMatrix4(toLocal);
  plane.set(zAxis, -z);
  return ray.intersectPlane(plane, out);
}

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
      // Added on first use, once the object has drawn in at its full size.
      addGrabTarget(t.object);
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
