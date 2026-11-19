// src/ui/hud.js
// The slim bottom bar: menu (contents and glossary), previous, page title,
// next, mute, quality and fullscreen. Keyboard arrows and a presentation
// clicker (PageUp and PageDown) turn pages.

export function createHud(root, { onPrev, onNext, onMenu, onMute, onQuality, onBeatToggle, onBeatSkip, quality, muted }) {
  const bar = document.createElement('nav');
  bar.className = 'hud';
  bar.setAttribute('aria-label', 'Book controls');
  bar.innerHTML = `
    <button type="button" class="hud-btn hud-menu" aria-haspopup="dialog">Contents</button>
    <button type="button" class="hud-btn hud-prev" aria-label="Previous page">‹ Back</button>
    <p class="hud-title" aria-live="polite"></p>
    <div class="hud-beat" hidden>
      <button type="button" class="hud-btn hud-beat-play" aria-label="Pause the guided steps">❚❚</button>
      <p class="hud-beat-text" aria-live="polite"></p>
      <span class="hud-dots" aria-hidden="true"></span>
      <button type="button" class="hud-btn hud-beat-skip" aria-label="Next guided step">›</button>
    </div>
    <button type="button" class="hud-btn hud-next primary" aria-label="Next page">Next ›</button>
    <button type="button" class="hud-btn hud-mute" aria-pressed="${muted}">${muted ? 'Sound off' : 'Sound on'}</button>
    <label class="hud-quality"><span class="sr-only">Quality</span>
      <select>
        <option value="auto">Auto</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
      </select></label>
    <button type="button" class="hud-btn hud-full" aria-label="Full screen">⛶</button>`;
  root.append(bar);
  const $ = (s) => bar.querySelector(s);
  $('.hud-prev').addEventListener('click', onPrev);
  $('.hud-next').addEventListener('click', onNext);
  $('.hud-menu').addEventListener('click', onMenu);
  $('.hud-beat-play').addEventListener('click', () => onBeatToggle?.());
  $('.hud-beat-skip').addEventListener('click', () => onBeatSkip?.());
  const mute = $('.hud-mute');
  mute.addEventListener('click', () => {
    const now = mute.getAttribute('aria-pressed') !== 'true';
    mute.setAttribute('aria-pressed', String(now));
    mute.textContent = now ? 'Sound off' : 'Sound on';
    onMute(now);
  });
  const sel = $('.hud-quality select');
  sel.value = quality ?? 'auto';
  sel.addEventListener('change', () => onQuality(sel.value));
  $('.hud-full').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  });

  window.addEventListener('keydown', (e) => {
    // Arrow keys belong to a focused slider, text box or menu. PageUp and
    // PageDown (the presentation clicker) always turn the page.
    const inControl = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName);
    if (inControl && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') {
      e.preventDefault();
      onNext();
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      onPrev();
    }
  });

  return {
    el: bar,
    setTitle(text) {
      $('.hud-title').textContent = text;
    },
    /** Show a guided step ({ text, index, count, playing }), or the page title (null). */
    setBeat(b) {
      const box = $('.hud-beat');
      box.hidden = !b;
      $('.hud-title').hidden = !!b;
      if (!b) return;
      $('.hud-beat-text').textContent = b.text;
      $('.hud-dots').innerHTML = Array.from({ length: b.count }, (_, k) => `<i class="${k === b.index ? 'on' : k < b.index ? 'done' : ''}"></i>`).join('');
      const last = b.index >= b.count - 1;
      const play = $('.hud-beat-play');
      play.textContent = b.playing ? '❚❚' : last ? '↺' : '▶';
      play.setAttribute('aria-label', b.playing ? 'Pause the guided steps' : last ? 'Play the guided steps again' : 'Play the guided steps');
      $('.hud-beat-skip').disabled = last;
    },
    setNav({ canPrev, canNext }) {
      $('.hud-prev').disabled = !canPrev;
      $('.hud-next').disabled = !canNext;
    },
  };
}
