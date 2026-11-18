// src/ui/hud.js
// The slim bottom bar: menu (contents and glossary), previous, page title,
// next, mute, quality and fullscreen. Keyboard arrows and a presentation
// clicker (PageUp and PageDown) turn pages.

export function createHud(root, { onPrev, onNext, onMenu, onMute, onQuality, quality, muted }) {
  const bar = document.createElement('nav');
  bar.className = 'hud';
  bar.setAttribute('aria-label', 'Book controls');
  bar.innerHTML = `
    <button type="button" class="hud-btn hud-menu" aria-haspopup="dialog">Contents</button>
    <button type="button" class="hud-btn hud-prev" aria-label="Previous page">‹ Back</button>
    <p class="hud-title" aria-live="polite"></p>
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
    setNav({ canPrev, canNext }) {
      $('.hud-prev').disabled = !canPrev;
      $('.hud-next').disabled = !canNext;
    },
  };
}
