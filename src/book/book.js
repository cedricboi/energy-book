// src/book/book.js
// The book engine. Lessons are data (CLAUDE.md section 8). The engine opens a
// lesson, turns pages, swaps scenes, draws diagrams in after each turn, saves
// progress and keeps the text panel fitted to the left page.
import { Group } from 'three';
import { LESSONS, loadLesson as importLesson } from '../lessons/index.js';
import { loadScene } from '../scenes/index.js';
import { renderPage } from './pages.js';
import { createPageTurn } from './pageTurn.js';
import { computeLayout, placeBox } from './layout.js';
import { createDrawIn } from '../ink/drawIn.js';
import { inkStyle } from '../ink/inkMaterial.js';
import { loadLesson, saveLesson, allNamedTerms } from '../ui/progress.js';
import { renderGlossary } from '../ui/glossary.js';
import { report } from '../hub/report.js';

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

  // Instant turns are for screenshots only. Reduced motion also skips the turn.
  const turner = createPageTurn(stage.scene, { reducedMotion: reducedMotion || instant });
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
  function clearScene() {
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

  async function makeScene(id) {
    const create = await loadScene(id);
    const group = new Group();
    group.name = `scene-${id}`;
    stage.scene.add(group);
    const scene = create({ scene: group, overlay, overlayRoot, ledgerRoot, reducedMotion });
    const drawIn = combine(scene.objects.map((o) => createDrawIn({
      root: o.rise, lines: o.lines, formUniforms: o.formUniforms, seconds: () => inkStyle.drawInSeconds, reducedMotion,
    })));
    Object.assign(state, { scene, group, drawIn, objects: scene.objects, sceneId: id });
    drawIn.play();
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
    renderPage(panel, page, {
      lesson,
      index: state.index,
      scene: state.scene,
      saved: state.progress,
      values: () => state.scene?.values?.() ?? {},
      onAnswer(rec) {
        state.progress.answers[rec.id] = rec;
        if (rec.id === page.question?.id) state.scene?.setHideValues?.(false);
        save();
        report({ lesson: lesson.id, ...rec });
      },
      onNamed(termId) {
        if (!state.progress.named.includes(termId)) {
          state.progress.named.push(termId);
          save();
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
    panel.classList.remove('is-leaving');
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
    if (state.cue) {
      state.cue.position.y -= 0.006;
      state.cue = null;
    }
    const sceneChanges = (page.scene ?? null) !== state.sceneId;
    if (sceneChanges) clearScene();
    const turning = turner.turn(direction);
    onChange?.(); // keep the render loop running while the leaf turns
    await turning;
    state.index = index;
    state.progress.page = index;
    save();
    if (sceneChanges && page.scene) await makeScene(page.scene);
    showPanel(page);
    state.busy = false;
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
      <ol class="contents-list">${LESSONS.filter((l) => !l.hidden).map((l) => `<li><button type="button" data-lesson="${l.id}">${l.number ? `<span class="c-num">${l.number}</span>` : ''}<span class="c-title">${l.title}</span></button></li>`).join('')}</ol></div>`;
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
      return turning || drawing || moving;
    },
    /** Fit the text panel and ledger to the pages. Call after the camera moves. */
    layout(rect) {
      const l = computeLayout(stage.camera, rect, { wide: !state.lesson });
      const sizeChanged = panel.style.height !== `${Math.round(l.text.h)}px` || panel.style.width !== `${Math.round(l.text.w)}px`;
      placeBox(panel, l.text);
      panel.classList.toggle('is-portrait', l.portrait);
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
      placeBox(ledgerRoot, l.ledger);
    },
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
  };
}
