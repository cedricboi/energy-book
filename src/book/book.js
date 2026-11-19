// src/book/book.js
// The book engine. Lessons are data (CLAUDE.md section 8). The engine opens a
// lesson, turns pages, swaps scenes, draws diagrams in after each turn, saves
// progress and keeps the text panel fitted to the left page.
import { Group } from 'three';
import { LESSONS, loadLesson as importLesson } from '../lessons/index.js';
import { loadScene } from '../scenes/index.js';
import { renderPage } from './pages.js';
import { createPageTurn } from './pageTurn.js';
import { createBeats } from './beats.js';
import { createPagePrint } from './pagePrint.js';
import { computeLayout, placeBox, quadMatrix, PRINT_W, printHeight, AREAS } from './layout.js';
import { createDrawIn } from '../ink/drawIn.js';
import { inkStyle } from '../ink/inkMaterial.js';
import { loadLesson, saveLesson, allNamedTerms } from '../ui/progress.js';
import { renderGlossary } from '../ui/glossary.js';
import { report } from '../hub/report.js';
import { play } from '../core/sound.js';

function combine(list) {
  return {
    play: () => list.forEach((d) => d.play()),
    update: (dt) => list.map((d) => d.update(dt)).some(Boolean),
    setTime: (t) => list.forEach((d) => d.setTime(t)),
  };
}

export function createBook({ stage, overlay, overlayRoot, reducedMotion, hud, onChange, instant = false }) {
  const panel = document.createElement('section');
  panel.className = 'page-panel';
  panel.setAttribute('aria-live', 'polite');
  overlayRoot.append(panel);
  const ledgerRoot = document.createElement('div');
  ledgerRoot.className = 'ledger-slot';
  overlayRoot.append(ledgerRoot);
  // The figure caption, printed under the diagram on the right page.
  const figureRoot = document.createElement('div');
  figureRoot.className = 'figure-slot';
  figureRoot.hidden = true;
  overlayRoot.append(figureRoot);
  // Guided steps: narrated shots before the student takes over.
  const beats = createBeats({
    stage,
    hud,
    getScene: () => state.scene,
    reducedMotion,
    onAway: (away) => [panel, ledgerRoot, figureRoot].forEach((el) => el.classList.toggle('is-away', away)),
    onChange: () => onChange?.(),
  });
  // Touching the controls hands the page to the student.
  panel.addEventListener('pointerdown', () => beats.interrupt());
  panel.addEventListener('keydown', () => beats.interrupt());

  // Labels keep clear of the printed caption.
  overlay.addBlocker(() => {
    if (figureRoot.hidden || !figureRoot.innerHTML) return null;
    const root = overlayRoot.getBoundingClientRect();
    const r = figureRoot.getBoundingClientRect();
    return { x: r.left - root.left, y: r.top - root.top, w: r.width, h: r.height };
  });

  // Instant turns are for screenshots only. Reduced motion also skips the turn.
  const turner = createPageTurn(stage.scene, { reducedMotion: reducedMotion || instant });
  // The page text is printed into the paper (landscape only).
  const printer = createPagePrint({ scene: stage.scene, leaf: turner.leaf, panel, figure: figureRoot, onChange: () => onChange?.() });
  let lastRect = null;
  const state = {
    lesson: null,
    index: 0,
    progress: null,
    sceneId: null,
    scene: null,
    group: null,
    drawIn: null,
    objects: [],
    busy: false,
    cue: null,
  };

  // ---------- scenes ----------
  /** Run fn(p) for p from 0 to 1 over `seconds`, rendering each frame. */
  function tween(seconds, fn) {
    return new Promise((resolve) => {
      const start = performance.now();
      const tick = () => {
        const p = Math.min(1, (performance.now() - start) / 1000 / seconds);
        fn(p);
        onChange?.();
        if (p < 1) requestAnimationFrame(tick);
        else resolve();
      };
      tick();
    });
  }

  /**
   * Before the leaf turns, the diagram folds back onto the page: its
   * surfaces fade first, then the drawing lies down flat, and its labels
   * fade with it. (The new page's drawing rises, inks itself and fills in.)
   */
  async function foldDown() {
    if (reducedMotion || instant || !state.objects.length) return;
    const objs = state.objects;
    const roots = objs.map((o) => o.rise).filter(Boolean);
    overlayRoot.classList.add('is-folding');
    await tween(0.5, (p) => {
      const fade = 1 - Math.min(1, p / 0.3);
      for (const o of objs) for (const u of o.formUniforms) u.value = Math.min(u.value, fade);
      const k = p < 0.3 ? 0 : (p - 0.3) / 0.7;
      const s = 1 - k * k * (3 - 2 * k);
      for (const r of roots) r.scale.y = Math.max(0.001, s);
    });
  }

  function clearScene() {
    overlayRoot.classList.remove('is-folding');
    if (state.cue) {
      state.cue.position.y -= 0.006;
      state.cue = null;
    }
    state.scene?.destroy?.();
    if (state.group) stage.scene.remove(state.group);
    overlay.clear();
    ledgerRoot.innerHTML = '';
    Object.assign(state, { scene: null, group: null, drawIn: null, objects: [], sceneId: null });
  }

  /** Build a page's scene. Hidden: it waits, undrawn, until the leaf lands. */
  async function makeScene(id, { hidden = false } = {}) {
    const create = await loadScene(id);
    const group = new Group();
    group.name = `scene-${id}`;
    stage.scene.add(group);
    const scene = create({ scene: group, overlay, overlayRoot, ledgerRoot, reducedMotion, energyLights: stage.energyLights });
    // Students handle the model itself (CLAUDE.md section 6, rule 1). A scene
    // can list its own touchable objects. Otherwise each lit object is a tap
    // that does its own action, or the scene's main action.
    if (!scene.interactive) {
      const actions = scene.actions ?? {};
      const primary = Object.keys(actions).find((a) => actions[a].primary);
      scene.interactive = Object.entries(scene.cueTargets ?? {})
        .filter(([k]) => actions[k] || primary)
        .map(([k, object]) => ({ object, label: k, onTap: () => scene.act(actions[k] ? k : primary) }));
    }
    const drawIn = combine(scene.objects.map((o) => createDrawIn({
      root: o.rise, lines: o.lines, formUniforms: o.formUniforms, seconds: () => inkStyle.drawInSeconds, reducedMotion,
    })));
    Object.assign(state, { scene, group, drawIn, objects: scene.objects, sceneId: id });
    if (hidden) {
      group.visible = false;
    } else {
      drawIn.play();
      play('pen-scratch');
    }
    onChange?.();
  }

  const formReady = () => state.objects.every((o) => o.formUniforms[0].value >= 1);

  // ---------- pages ----------
  function save() {
    if (state.lesson) saveLesson(state.lesson.id, state.progress);
  }

  function showPanel(page) {
    const lesson = state.lesson;
    // A page can set the scene up (data only), for example friction off.
    // This runs before the controls are drawn, so they show the right values.
    for (const [k, v] of Object.entries(page.sceneState ?? {})) state.scene?.setParam?.(k, v);
    // Caption the figure: what it shows and its scale, and how to handle it.
    const fig = state.scene?.figure;
    const number = LESSONS.find((l) => l.id === lesson.id)?.number;
    // The handling hint shows where students may handle the model: explore
    // pages, and predict pages once the prediction is in.
    const canHandle = page.type === 'explore' || (page.type === 'predict' && state.progress.answers[page.question?.id]);
    const hint = page.figureHint ?? (canHandle && state.scene?.interactive?.length ? fig?.hint : null);
    figureRoot.innerHTML = fig ? `<p class="fig-caption"><b>Fig. ${number ? `${number}.` : ''}${state.index + 1}</b>${fig.caption}</p>${hint ? `<p class="fig-hint">${hint}</p>` : ''}` : '';
    renderPage(panel, page, {
      lesson,
      number: LESSONS.find((l) => l.id === lesson.id)?.number,
      index: state.index,
      scene: state.scene,
      saved: state.progress,
      values: () => state.scene?.values?.() ?? {},
      onAnswer(rec) {
        state.progress.answers[rec.id] = rec;
        if (rec.id === page.question?.id) state.scene?.setHideValues?.(false);
        save();
        report({ lesson: lesson.id, ...rec });
        if (page.type !== 'predict') play(rec.correct ? 'chime' : 'wrong');
      },
      onNamed(termId) {
        if (!state.progress.named.includes(termId)) {
          state.progress.named.push(termId);
          save();
        }
      },
      onComplete() {
        if (!state.progress.done) {
          state.progress.done = true;
          save();
          play('chime');
        }
      },
      onUnlock() {
        state.scene?.setLocked?.(false);
      },
    });
    // Hide the scene's numbers while this page's question asks for them
    // (CLAUDE.md section 5, rule 6), until the student has answered.
    const qid = page.question?.id;
    state.scene?.setHideValues?.(!!page.hideValues && !(qid && state.progress.answers[qid]));
    // Lock the run on a predict page until the prediction is committed.
    if (page.type === 'predict' && !state.progress.answers[page.question.id]) state.scene?.setLocked?.(true);
    else state.scene?.setLocked?.(false);
    // The lit object cue: lift what students should touch.
    if (page.cue && state.scene?.cueTargets?.[page.cue]) {
      state.cue = state.scene.cueTargets[page.cue];
      state.cue.position.y += 0.006;
    }
    hud.setTitle(`${lesson.title} · page ${state.index + 1} of ${lesson.pages.length}`);
    hud.setNav({ canPrev: state.index > 0 || true, canNext: state.index < lesson.pages.length - 1 });
    panel.scrollTop = 0;
    onChange?.();
  }

  async function goTo(index, direction = 1) {
    const lesson = state.lesson;
    if (!lesson || state.busy) return;
    if (index < 0) return openContents();
    if (index >= lesson.pages.length) return;
    state.busy = true;
    const page = lesson.pages[index];
    panel.classList.add('is-leaving');
    beats.clear();
    if (state.cue) {
      state.cue.position.y -= 0.006;
      state.cue = null;
    }
    const sceneChanges = (page.scene ?? null) !== state.sceneId;
    // Every turn folds the drawing down first, so the leaf never sweeps
    // through a standing diagram. The new page's drawing then rises and
    // inks itself again, as if printed on that page.
    await foldDown();
    // The leaf carries the page it lifts from: going on, the right page
    // (its front); going back, the left page (its back).
    const { sheets } = printer;
    printer.hold(true);
    // The page's controls are hidden from here on, so its print takes them
    // in too: nothing on the page looks missing while the leaf turns.
    if (printer.enabled) {
      if (direction > 0) {
        printer.copy(sheets.right, sheets.leafFront);
        printer.print('left', sheets.left, { full: true });
      } else {
        printer.print('left', sheets.leafBack, { full: true });
      }
    } else {
      printer.clear(sheets.leafFront);
      printer.clear(sheets.leafBack);
    }
    // The new page is made before the leaf moves, hidden, so its text can
    // be printed on the leaf and on the page the leaf uncovers.
    if (sceneChanges) clearScene();
    overlayRoot.classList.add('is-folding');
    if (sceneChanges && page.scene) await makeScene(page.scene, { hidden: true });
    else if (state.group) state.group.visible = false;
    state.index = index;
    state.progress.page = index;
    save();
    showPanel(page);
    if (lastRect) layout(lastRect);
    if (printer.enabled) {
      if (direction > 0) {
        printer.print('left', sheets.leafBack, { full: true });
        printer.print('right');
      } else {
        printer.print('right', sheets.leafFront);
        printer.print('left', sheets.left, { full: true });
      }
    }
    play('page-turn');
    const turning = turner.turn(direction);
    onChange?.(); // keep the render loop running while the leaf turns
    await turning;
    // The leaf has landed: its far side is now that page.
    if (printer.enabled) {
      if (direction > 0) printer.copy(sheets.leafBack, sheets.left);
      else printer.copy(sheets.leafFront, sheets.right);
    }
    printer.hold(false);
    overlayRoot.classList.remove('is-folding');
    if (state.group) state.group.visible = true;
    if (state.drawIn) {
      state.drawIn.play();
      play('pen-scratch');
    }
    // On a printed page the controls are already drawn where they go, so
    // the HTML ones appear at once and the print drops its copies.
    if (printer.enabled) {
      panel.style.transition = 'none';
      panel.classList.remove('is-leaving');
      void panel.offsetHeight;
      panel.style.transition = '';
    } else {
      panel.classList.remove('is-leaving');
    }
    state.busy = false;
    // A predict page plays its steps only once the prediction is in.
    if (!(page.type === 'predict' && !state.progress.answers[page.question?.id])) beats.start(page.beats);
    onChange?.();
  }

  async function openLesson(id, page) {
    clearScene();
    state.lesson = await importLesson(id);
    state.progress = loadLesson(id);
    state.progress.answers ??= {};
    state.progress.named ??= [];
    const start = Number.isInteger(page) ? page : state.progress.page ?? 0;
    state.index = -1;
    state.busy = false;
    await goTo(Math.min(Math.max(0, start), state.lesson.pages.length - 1), 1);
  }

  function openContents() {
    clearScene();
    state.lesson = null;
    panel.dataset.type = 'contents';
    panel.innerHTML = `<header class="page-head"><p class="page-kicker">Contents</p><h2 class="page-title">The Energy Ledger</h2></header>
      <div class="page-body"><p>Every energy store is an account. Every transfer is a transaction. The total always balances.</p>
      <ol class="contents-list">${LESSONS.filter((l) => !l.hidden).map((l) => `<li><button type="button" data-lesson="${l.id}">${l.number ? `<span class="c-num">${l.number}</span>` : ''}<span class="c-title">${l.title}</span>${loadLesson(l.id)?.done ? '<span class="c-stamp" aria-label="complete">Balanced</span>' : ''}</button></li>`).join('')}</ol></div>`;
    panel.querySelectorAll('[data-lesson]').forEach((b) => b.addEventListener('click', () => openLesson(b.dataset.lesson)));
    hud.setTitle('Contents');
    hud.setNav({ canPrev: false, canNext: false });
    panel.classList.remove('is-leaving');
    onChange?.();
  }

  function openMenu() {
    let dlg = document.querySelector('dialog.book-menu');
    if (!dlg) {
      dlg = document.createElement('dialog');
      dlg.className = 'book-menu';
      document.body.append(dlg);
    }
    dlg.innerHTML = `<form method="dialog"><h2>Contents</h2>
      <ol class="contents-list">${LESSONS.filter((l) => !l.hidden).map((l) => `<li><button value="${l.id}">${l.number ? `${l.number}. ` : ''}${l.title}</button></li>`).join('')}</ol>
      <h2>Glossary</h2><div class="glossary-slot"></div>
      <p><button value="close" class="primary">Close</button></p></form>`;
    renderGlossary(dlg.querySelector('.glossary-slot'), allNamedTerms());
    dlg.addEventListener('close', () => {
      if (dlg.returnValue && dlg.returnValue !== 'close') openLesson(dlg.returnValue, 0);
    }, { once: true });
    dlg.showModal();
  }

  /** Fit the text panel and ledger to the pages. Call after the camera moves. */
  function layout(rect) {
    lastRect = rect;
    const l = computeLayout(stage.camera, rect, { wide: !state.lesson });
    // Landscape: the text is printed on the left page, laid out at a fixed
    // page size and mapped onto the page in perspective.
    const printed = !!l.textQuad;
    const box = printed ? { x: 0, y: 0, w: PRINT_W, h: printHeight(AREAS.leftText) } : l.text;
    const sizeChanged = panel.style.height !== `${Math.round(box.h)}px` || panel.style.width !== `${Math.round(box.w)}px`;
    placeBox(panel, box);
    panel.style.transform = printed ? quadMatrix(box.w, box.h, l.textQuad) : '';
    panel.classList.toggle('is-printed', printed);
    panel.classList.toggle('is-portrait', l.portrait);
    // Landscape lesson pages are printed into the paper.
    printer.setEnabled(printed && !!state.lesson);
    // If the page does not fit, tighten the spacing (text stays at its
    // minimum size). Re-check only when the panel or its page changes.
    if (sizeChanged || panel.dataset.fitFor !== panel.dataset.pageKey) {
      panel.dataset.fitFor = panel.dataset.pageKey;
      panel.classList.remove('dense', 'denser');
    }
    // Content can grow after the page opens (feedback, a table of runs),
    // so keep checking and step to denser spacing when needed.
    if (panel.scrollHeight > panel.clientHeight + 1 && !panel.classList.contains('dense')) panel.classList.add('dense');
    if (panel.scrollHeight > panel.clientHeight + 1 && !panel.classList.contains('denser')) panel.classList.add('denser');
    // A page never scrolls (focus can nudge it), so keep it at its top.
    if (panel.scrollTop) panel.scrollTop = 0;
    // The caption is printed only in landscape, where the page is in view.
    figureRoot.hidden = !l.figureQuad || !figureRoot.innerHTML;
    if (l.figureQuad) {
      const fb = { x: 0, y: 0, w: PRINT_W, h: printHeight(AREAS.rightFigure) };
      placeBox(figureRoot, fb);
      figureRoot.style.transform = quadMatrix(fb.w, fb.h, l.figureQuad);
    }
    if (l.ledgerQuad) {
      const lb = { x: 0, y: 0, w: PRINT_W, h: printHeight(AREAS.rightLedger) };
      placeBox(ledgerRoot, lb);
      ledgerRoot.style.transform = quadMatrix(lb.w, lb.h, l.ledgerQuad);
      ledgerRoot.classList.add('is-printed');
    } else {
      placeBox(ledgerRoot, l.ledger);
      ledgerRoot.style.transform = '';
      ledgerRoot.classList.remove('is-printed');
    }
  }

  return {
    openLesson,
    openContents,
    openMenu,
    next: () => state.lesson && goTo(state.index + 1, 1),
    prev: () => state.lesson && goTo(state.index - 1, -1),
    /** Advance animations. Returns true while anything moves. */
    update(dt) {
      const turning = turner.update(dt);
      const drawing = state.drawIn ? state.drawIn.update(dt) : false;
      const moving = state.scene ? state.scene.update(dt, { formReady: formReady() }) : false;
      // Steps wait for the diagram to finish drawing in.
      const guiding = formReady() && !turning ? beats.update() : beats.playing;
      return turning || drawing || moving || guiding;
    },
    beats,
    /** The student touched the model or the view: stop the guided steps. */
    interrupt() {
      beats.interrupt();
    },
    layout,
    get state() {
      return state;
    },
    /** For tests and screenshots: finish the draw-in and jump the scene in time. */
    settle(t) {
      state.drawIn?.setTime(99);
      if (t !== undefined) state.scene?.setTime?.(t);
      else state.scene?.setTime?.(0);
    },
    panel,
    printer,
  };
}
