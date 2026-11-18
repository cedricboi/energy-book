// src/scenes/index.js
// Scene registry. Lessons name a scene by id. Each scene module is loaded
// only when a page needs it (CLAUDE.md section 9: lazy-load).
//
// A scene module's default export is create(ctx) and returns:
//   objects      ink objects to draw in
//   cueTargets   { name: Object3D } the "lit object" cue can lift
//   params       { id: { type: 'slider'|'switch'|'choice', label, ... } }
//   setParam(id, value), actions { id: { label, primary } }, act(id)
//   setLocked(on)  stop the scene running until a prediction is committed
//   update(dt, { formReady }) -> true while anything moves
//   setTime(t)  jump in time (screenshots), values() -> numbers, destroy()
export const SCENES = {
  springLaunch: () => import('./springLaunch.js'),
  ramp: () => import('./ramp.js'),
  stores: () => import('./stores.js'),
  transfers: () => import('./transfers.js'),
  kinetic: () => import('./kinetic.js'),
  gpe: () => import('./gpe.js'),
  bounce: () => import('./bounce.js'),
  work: () => import('./work.js'),
};

export async function loadScene(id) {
  const loader = SCENES[id];
  if (!loader) throw new Error(`Unknown scene "${id}"`);
  return (await loader()).default;
}
