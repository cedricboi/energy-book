// src/book/beats.js
// Guided steps: a page can play a short narrated sequence before the student
// takes over. Each step has a sentence for the bottom bar, and can move the
// camera to a shot the scene names, run a scene action, and last a while.
//
//   page.beats: [{ say, shot?, action?, seconds? }]
//     say      one full sentence, shown in the bottom bar
//     shot     a name from scene.shots ('overview' or none = the reading view)
//     action   a scene action to run as the step starts (for example 'run')
//     seconds  how long the step lasts. The last step has none: it stays.
//
// Touching the model, the controls or the view stops the sequence, returns
// the camera, and shows the last step (which hands over to the student).
// With reduced motion the camera never moves, but the steps still play.

export function createBeats({ stage, hud, getScene, reducedMotion, onAway, onChange }) {
  let beats = [];
  let i = -1;
  let elapsed = 0; // seconds into the current step, by the clock
  let startedAt = 0;
  let playing = false;
  const now = () => performance.now() / 1000;

  function shotFor(name) {
    if (!name || name === 'overview' || reducedMotion) return null;
    const fn = getScene()?.shots?.[name];
    return fn ?? null;
  }

  function show() {
    const b = beats[i];
    hud.setBeat(b ? { text: b.say, index: i, count: beats.length, playing } : null);
  }

  function enter(n) {
    i = n;
    elapsed = 0;
    startedAt = now();
    const b = beats[i];
    if (!b) return;
    if (b.action) getScene()?.act?.(b.action);
    const to = shotFor(b.shot);
    stage.setShot(to, reducedMotion ? 0 : b.shotSeconds ?? 1.4);
    onAway?.(!!to);
    show();
    onChange?.();
  }

  const api = {
    /** Start a page's sequence (or clear the bar if it has none). */
    start(list) {
      beats = list ?? [];
      playing = beats.length > 1;
      if (!beats.length) {
        api.clear();
        return;
      }
      enter(0);
    },
    /** Leave the page: no sequence, reading view. */
    clear() {
      beats = [];
      i = -1;
      playing = false;
      if (stage.inShot) stage.setShot(null, reducedMotion ? 0 : 0.8);
      onAway?.(false);
      hud.setBeat(null);
    },
    /** The student took over: jump to the last step, back to the reading view. */
    interrupt() {
      if (!playing) return;
      playing = false;
      enter(beats.length - 1);
    },
    toggle() {
      if (!beats.length) return;
      if (i >= beats.length - 1) {
        playing = beats.length > 1;
        enter(0);
        return;
      }
      playing = !playing;
      // Resume from where the step was paused.
      if (playing) startedAt = now() - elapsed;
      show();
      onChange?.();
    },
    skip() {
      if (i < beats.length - 1) {
        playing = i + 1 < beats.length - 1 && playing;
        enter(i + 1);
      }
    },
    /** Step the timer. Returns true while the sequence needs frames. */
    update() {
      if (!playing) return false;
      const b = beats[i];
      if (!b?.seconds) {
        playing = false;
        show();
        return false;
      }
      // Steps follow the clock, not frame time, so slow devices keep pace.
      elapsed = now() - startedAt;
      if (elapsed >= b.seconds) {
        if (i + 1 >= beats.length - 1) playing = false;
        enter(i + 1);
      }
      return true;
    },
    get playing() {
      return playing;
    },
    get index() {
      return i;
    },
  };
  return api;
}
