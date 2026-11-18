// src/core/sound.js
// One sound sprite (CLAUDE.md section 10). Sound starts only after the first
// tap, a mute button is always visible, and the book starts muted on a wide
// screen (the classroom projector). Each sound plays with a small random
// change of pitch and volume so repeats do not sound robotic.
// Howler and the sprite are loaded only when sound is first needed. If the
// sprite files are missing (they are supplied in Phase 7B), sound stays off.
const PREF = 'energy-ledger:muted';

let muted = (() => {
  try {
    const saved = globalThis.localStorage?.getItem(PREF);
    if (saved !== null && saved !== undefined) return saved === 'true';
  } catch { /* storage blocked */ }
  return (globalThis.screen?.width ?? 0) >= 1900;
})();

let unlocked = false;
let sprite = null;
let loading = null;

async function load() {
  if (sprite || loading) return loading;
  loading = (async () => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}audio/sfx.json`);
      if (!res.ok) return null;
      const map = await res.json();
      const { Howl } = await import('howler');
      sprite = new Howl({ src: [`${import.meta.env.BASE_URL}audio/sfx.mp3`], sprite: map, volume: 0.6 });
      return sprite;
    } catch {
      return null;
    }
  })();
  return loading;
}

export function isMuted() {
  return muted;
}

export function setMuted(m) {
  muted = m;
  try {
    globalThis.localStorage?.setItem(PREF, String(m));
  } catch { /* not saved */ }
  if (!m && unlocked) load();
}

export function unlockAudio() {
  unlocked = true;
  if (!muted) load();
}

/** Play a named sound from the sprite, with a little variation. */
export function play(name) {
  if (muted || !unlocked || !sprite) return;
  const id = sprite.play(name);
  sprite.rate(0.94 + Math.random() * 0.12, id);
  sprite.volume(0.5 + Math.random() * 0.2, id);
}
