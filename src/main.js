// src/main.js
// Entry point. Phase 2: the stage only (book on the desk at night), with no
// lesson content.
//
// URL options (for testing and the teacher):
//   ?q=high|medium|low   force a quality tier (otherwise a 2 s probe decides)
//   ?tm=agx|aces         tone mapping (default agx)
//   ?view=intro          the wider view that shows the window
//   ?debug=hot           luminance view: red marks anything above the bloom threshold
import '@fontsource-variable/newsreader/opsz.css';
import '@fontsource/kalam/latin-400.css';
import './styles/main.css';

import { createRenderer, hasWebGL } from './core/renderer.js';
import { createStage } from './core/stage.js';
import { createPost } from './core/post.js';
import { createLoop } from './core/loop.js';
import { createDragOrbit } from './core/input.js';
import { forcedTier, tierSettings, tierFromFrameTime, probeFrameTime } from './core/quality.js';

const params = new URLSearchParams(location.search);

function showFallback() {
  document.getElementById('fallback').hidden = false;
  document.getElementById('stage').hidden = true;
  document.documentElement.dataset.ready = 'fallback';
}

async function start() {
  if (!hasWebGL()) return showFallback();
  const canvas = document.getElementById('stage');

  let tierName = forcedTier();
  const probing = tierName === null;
  let tier = tierSettings(tierName ?? 'high');

  const renderer = createRenderer(canvas, tier);
  if (!renderer) return showFallback();

  const view = params.get('view') === 'intro' ? 'intro' : 'reading';
  const stage = createStage({ tier, view });
  const post = createPost(renderer, stage.scene, stage.camera, { tier, toneMapping: params.get('tm') ?? 'agx' });
  if (params.get('debug') === 'hot') post.setDebugHot(true);

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // eslint-disable-next-line prefer-const
  let loop;
  const orbit = createDragOrbit(canvas, {
    maxDeg: 15,
    reducedMotion,
    onStart: () => loop.hold('drag'),
    onEnd: () => loop.release('drag'),
  });

  function drawFrame(dt = 0) {
    stage.placeCamera(orbit.yaw, orbit.pitch);
    post.render(dt);
  }

  loop = createLoop((dt) => {
    const moving = orbit.update(dt);
    drawFrame(dt);
    return moving;
  });

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    stage.setAspect(w / h);
    post.setSize(w, h);
    loop.request();
  }
  window.addEventListener('resize', resize);
  resize();

  let probeMs = null;
  if (probing) {
    probeMs = await probeFrameTime(() => drawFrame(1 / 60), 2000);
    tierName = tierFromFrameTime(probeMs);
    tier = tierSettings(tierName);
    renderer.setPixelRatio(tier.dpr);
    stage.setTier(tier);
    post.setTier(tier);
    resize();
  } else {
    tierName = tier.name;
  }

  // Draw once at the final settings, then let the loop go idle.
  drawFrame();
  document.documentElement.dataset.tier = tierName;
  document.documentElement.dataset.ready = 'true';

  // Hooks for the Playwright tests and for checking on a real device.
  window.__stage = {
    tier: tierName,
    probeMs,
    view,
    /** Camera position, for checking the framing. */
    get camera() {
      return { position: stage.camera.position.toArray(), aspect: stage.camera.aspect, fov: stage.camera.fov };
    },
    get idle() {
      return !loop.running;
    },
    /** Hold the view mid-drag at an offset in degrees, and draw it. */
    setDrag(yawDeg, pitchDeg) {
      orbit.setOffset(yawDeg, pitchDeg);
      drawFrame();
    },
    /** Let go, so the view springs back. */
    releaseDrag() {
      orbit.release();
      loop.request();
    },
    /** Render continuously for `ms` and return the average frame interval in ms. */
    measure(ms = 3000) {
      loop.clearStats();
      loop.hold('measure');
      return new Promise((resolve) => {
        setTimeout(() => {
          const avg = loop.averageFrameMs();
          loop.release('measure');
          resolve(avg);
        }, ms);
      });
    },
    /**
     * Render the luminance view and count pixels above the bloom threshold
     * (red) and above 0.9 (orange). Also returns the brightest luminance seen.
     */
    hotPixels() {
      post.setDebugHot(true);
      drawFrame();
      const gl = renderer.getContext();
      const w = gl.drawingBufferWidth;
      const h = gl.drawingBufferHeight;
      const px = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
      let red = 0;
      let orange = 0;
      let maxGrey = 0;
      for (let i = 0; i < px.length; i += 4) {
        const r = px[i], g = px[i + 1], b = px[i + 2];
        if (r > 250 && g < 10 && b < 10) red++;
        // Orange is (1, 0.5, 0) linear, which the sRGB transfer writes as green 188.
        else if (r > 250 && g > 175 && g < 200 && b < 10) orange++;
        else if (Math.abs(r - g) < 3 && Math.abs(g - b) < 3) maxGrey = Math.max(maxGrey, r);
      }
      // Grey is luminance / 2, written through the sRGB transfer.
      const s = maxGrey / 255;
      const linear = s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      if (params.get('debug') !== 'hot') post.setDebugHot(false);
      drawFrame();
      return { red, orange, maxLuminance: linear * 2, pixels: w * h };
    },
  };
}

start().catch((err) => {
  console.error(err);
  showFallback();
});
