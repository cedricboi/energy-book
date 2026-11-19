// src/main.js
// Entry point: the book on the desk at night.
//
// URL options (for testing and the teacher):
//   ?lesson=l5-ramp&page=3  open a lesson at a page (pages count from 1)
//   ?q=high|medium|low      force a quality tier (otherwise a 2 s probe decides)
//   ?tm=aces|agx            tone mapping (default aces)
//   ?view=intro|closeup     other camera views (development)
//   ?demo=beaker|objects|energy   development scenes from Phases 3 and 4
//   ?debug=hot              luminance view: red marks anything above the bloom threshold
//   ?debug=1                ink debug panel
//   ?drawin=off             skip the draw-in (screenshots)
import '@fontsource-variable/newsreader/opsz.css';
import '@fontsource/kalam/latin-400.css';
import './styles/main.css';

import { createRenderer, hasWebGL } from './core/renderer.js';
import { createStage } from './core/stage.js';
import { createPost } from './core/post.js';
import { createLoop } from './core/loop.js';
import { Vector3 } from 'three';
import { createDragOrbit } from './core/input.js';
import { createPicker } from './core/pick.js';
import { forcedTier, tierSettings, tierFromFrameTime, probeFrameTime, saveTier } from './core/quality.js';
import { setInkResolution, usePreset, setInkStyle, inkStyle, INK_PRESETS, HOUSE_INK } from './ink/inkMaterial.js';
import { createOverlay } from './ui/overlay.js';
import { createHud } from './ui/hud.js';
import { createBook } from './book/book.js';
import { reserveFor } from './book/layout.js';
import { createDebugPanel } from './ui/debug.js';
import { setMuted, isMuted, unlockAudio } from './core/sound.js';

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

  const view = ['intro', 'closeup'].includes(params.get('view')) ? params.get('view') : 'reading';
  // ?look=day shows the daylight version (for comparison); night is the default.
  const look = params.get('look') === 'day' ? 'day' : 'night';
  document.documentElement.dataset.look = look;
  const stage = createStage({ tier, view, focus: { x: 0.1057, y: 0.058, z: 0.06 }, look });
  usePreset(INK_PRESETS[params.get('ink')] ? params.get('ink') : HOUSE_INK);
  const post = createPost(renderer, stage.scene, stage.camera, { tier, look, toneMapping: params.get('tm') ?? (look === 'day' ? 'neutral' : 'aces') });
  if (params.get('debug') === 'hot') post.setDebugHot(true);

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const overlayRoot = document.getElementById('overlay');
  const overlay = createOverlay(overlayRoot, stage.camera);
  const demoName = params.get('demo');

  // eslint-disable-next-line prefer-const
  let loop;
  const orbit = createDragOrbit(canvas, {
    maxDeg: 15,
    reducedMotion,
    onStart: () => {
      book?.interrupt();
      loop.hold('drag');
    },
    onEnd: () => loop.release('drag'),
  });

  // Tap and drag objects in the scene. Registered after the orbit, but it
  // listens in the capture phase, so a press on an object never orbits.
  createPicker(canvas, stage.camera, {
    getTargets: () => book?.state.scene?.interactive ?? [],
    onStart: () => book?.interrupt(),
    onChange: () => loop.request(),
  });

  // ---------- the book, or a development demo ----------
  let book = null;
  let demo = null;
  const hudRoot = document.getElementById('hud');
  const hud = createHud(hudRoot, {
    onPrev: () => book?.prev(),
    onNext: () => book?.next(),
    onMenu: () => book?.openMenu(),
    onMute: (m) => setMuted(m),
    onQuality: (q) => {
      saveTier(q === 'auto' ? null : q);
      location.reload();
    },
    onBeatToggle: () => book?.beats.toggle(),
    onBeatSkip: () => book?.beats.skip(),
    quality: forcedTier() ?? 'auto',
    muted: isMuted(),
  });

  function rect() {
    return { width: window.innerWidth, height: window.innerHeight };
  }

  function drawFrame(dt = 0) {
    stage.placeCamera(orbit.yaw, orbit.pitch);
    stage.camera.updateMatrixWorld();
    post.render(dt);
    overlay.update();
    book?.layout(rect());
  }

  loop = createLoop((dt) => {
    const orbiting = orbit.update(dt) || stage.updateShot(dt);
    const a = book ? book.update(dt) : false;
    const b = demo ? demo.drawIn.update(dt) || (demo.update ? demo.update(dt) : false) : false;
    drawFrame(dt);
    return orbiting || a || b;
  });

  function resize() {
    const { width: w, height: h } = rect();
    const reserve = demo ? 0 : reserveFor(w, h);
    stage.setViewport(w, h, reserve);
    overlay.setSafeArea({ x: 0, y: 0, w, h: h * (1 - reserve) });
    post.setSize(w, h);
    setInkResolution(w, h, renderer.getPixelRatio(), tier.hatchLayers);
    loop.request();
  }
  window.addEventListener('resize', resize);

  if (demoName) {
    const mod = {
      beaker: () => import('./demo/beakerDemo.js').then((m) => m.createBeakerDemo(stage.scene, { reducedMotion })),
      objects: () => import('./demo/objectsDemo.js').then((m) => m.createObjectsDemo(stage.scene, { reducedMotion })),
      energy: () => import('./demo/energyDemo.js').then((m) => m.createEnergyDemo(stage.scene, overlay, overlayRoot, { reducedMotion })),
    }[demoName];
    demo = await (mod ?? (() => null))();
    hudRoot.hidden = true;
  } else {
    book = createBook({ stage, overlay, overlayRoot, reducedMotion, hud, onChange: () => loop.request(), instant: params.get('drawin') === 'off' });
  }
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

  // Sound may only start after the first tap (browsers block autoplay).
  window.addEventListener('pointerdown', unlockAudio, { once: true });
  window.addEventListener('keydown', unlockAudio, { once: true });

  if (book) {
    const lessonId = params.get('lesson');
    const pageNum = Number(params.get('page'));
    if (lessonId) await book.openLesson(lessonId, Number.isFinite(pageNum) && pageNum > 0 ? pageNum - 1 : undefined);
    else book.openContents();
    if (params.get('drawin') === 'off') book.settle();
  } else if (demo) {
    if (params.get('drawin') === 'off') demo.drawIn.setTime(99);
    else demo.drawIn.play();
  }
  loop.request();
  drawFrame();
  document.documentElement.dataset.tier = tierName;
  document.documentElement.dataset.ready = 'true';

  if (params.get('debug') === '1') {
    createDebugPanel({
      style: inkStyle,
      setStyle: (v) => { setInkStyle(v); loop.request(); },
      usePreset: (name) => { usePreset(name); loop.request(); },
      presets: Object.keys(INK_PRESETS),
      replay: () => { (book?.state.drawIn ?? demo?.drawIn)?.play(); loop.request(); },
    });
  }

  // ---------- hooks for the Playwright tests and for checking on a device ----------
  window.__book = {
    get state() {
      const s = book?.state;
      return s ? { lesson: s.lesson?.id ?? null, index: s.index, busy: s.busy, scene: s.sceneId } : null;
    },
    async open(id, page) {
      await book.openLesson(id, page);
      book.settle();
      drawFrame();
    },
    async next() {
      await book.next();
      drawFrame();
    },
    /** Finish the draw-in and put the scene at model time t, then draw. */
    settle(t) {
      // Screenshots show the page as the student gets it: guided steps
      // handed over, camera at the reading view.
      book.beats.interrupt();
      stage.setShot(null, 0);
      // Skip the fade back in, so the screenshot shows the finished page.
      for (const el of document.querySelectorAll('.page-panel, .ledger-slot, .figure-slot')) {
        el.style.transition = 'none';
        void el.offsetHeight;
        el.style.transition = '';
      }
      book.settle(t);
      drawFrame();
      return book.state.scene?.values?.();
    },
    act(id) {
      book.state.scene?.act(id);
      loop.request();
    },
    values: () => book?.state.scene?.values?.(),
    /** Screen positions of the objects students can handle (for tests). */
    touchables() {
      return (book?.state.scene?.interactive ?? []).map((t) => {
        const p = t.object.getWorldPosition(new Vector3()).project(stage.camera);
        return { label: t.label, x: (p.x * 0.5 + 0.5) * innerWidth, y: (-p.y * 0.5 + 0.5) * innerHeight };
      });
    },
    /** True once every diagram on the page has finished drawing in. */
    drawInDone() {
      return (book?.state.objects ?? []).every((o) => o.formUniforms[0].value >= 1);
    },
    get pageCount() {
      return book?.state.lesson?.pages.length ?? 0;
    },
    /** True if the text panel's content fits without scrolling. */
    panelFits() {
      const p = book.panel;
      return { fits: p.scrollHeight <= p.clientHeight + 1, scrollHeight: p.scrollHeight, clientHeight: p.clientHeight };
    },
    labelRects: () => overlay.debugRects(),
    /** The guided steps: { index, playing, text, away, inShot }. */
    beats() {
      return {
        index: book.beats.index,
        playing: book.beats.playing,
        text: document.querySelector('.hud-beat:not([hidden]) .hud-beat-text')?.textContent ?? null,
        away: book.panel.classList.contains('is-away'),
        inShot: stage.inShot,
      };
    },
  };

  window.__energy = {
    setTime(t) {
      demo?.drawIn.setTime(99);
      demo?.setTime?.(t);
      drawFrame();
      return demo?.snapshot?.();
    },
    labelRects: () => overlay.debugRects(),
  };

  window.__ink = {
    usePreset(name) {
      usePreset(name);
      drawFrame();
    },
    setDrawIn(seconds) {
      (demo?.drawIn ?? book?.state.drawIn)?.setTime(seconds);
      drawFrame();
    },
    replay() {
      (demo?.drawIn ?? book?.state.drawIn)?.play();
      loop.request();
    },
    get style() {
      return { ...inkStyle };
    },
  };

  window.__stage = {
    tier: tierName,
    probeMs,
    view,
    get camera() {
      return { position: stage.camera.position.toArray(), aspect: stage.camera.aspect, fov: stage.camera.fov };
    },
    get idle() {
      return !loop.running;
    },
    setDrag(yawDeg, pitchDeg) {
      orbit.setOffset(yawDeg, pitchDeg);
      drawFrame();
    },
    releaseDrag() {
      orbit.release();
      loop.request();
    },
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
    /** Count pixels above the bloom threshold (red) and above 0.9 (orange). */
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
