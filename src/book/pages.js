// src/book/pages.js
// Renders each page type into the text panel (CLAUDE.md section 8):
// hook, predict, explore, name, use, check, notes and exit.
// Lessons are data. Nothing here knows about a particular lesson.
import { renderQuestion } from '../ui/checks.js';
import { createSlider, createSwitch, createChoice, createActionButton } from '../ui/controls.js';
import { gamePage, winPage } from './gamePage.js';
import { GLOSSARY } from '../lessons/glossaryTerms.js';

const KICKER = {
  hook: 'Starting point', predict: 'Predict', explore: 'Explore', name: 'New term', use: 'Use it',
  check: 'Check', notes: 'Notes', exit: 'Exit ticket', text: '', contents: '', game: 'Ledger Run', win: 'Ledger Run',
};

const paras = (list) => (list ?? []).map((p) => `<p>${p}</p>`).join('');

/**
 * @param {HTMLElement} panel
 * @param {object} page
 * @param {object} c   { lesson, index, scene, saved, onAnswer, onNamed, onUnlock, values }
 * @returns {{ destroy(): void }}
 */
export function renderPage(panel, page, c) {
  panel.innerHTML = '';
  panel.dataset.type = page.type;
  panel.dataset.pageKey = `${c.lesson.id}-${c.index}`;
  // Like a printed book: a running head, then the kicker and the title.
  const running = document.createElement('p');
  running.className = 'page-running';
  running.setAttribute('aria-hidden', 'true');
  running.textContent = `The Energy Ledger${c.number ? ` · Lesson ${c.number}` : ''}`;
  panel.append(running);
  const head = document.createElement('header');
  head.className = 'page-head';
  const kicker = KICKER[page.type] ?? '';
  head.innerHTML = `${kicker ? `<p class="page-kicker">${kicker}</p>` : ''}<h2 class="page-title">${page.title ?? ''}</h2>`;
  panel.append(head);
  const folio = document.createElement('p');
  folio.className = 'page-folio';
  folio.setAttribute('aria-hidden', 'true');
  folio.textContent = String(c.index * 2 + 2);
  panel.append(folio);
  const body = document.createElement('div');
  body.className = 'page-body';
  panel.append(body);

  const fill = (s) => (typeof s === 'function' ? s(c.values?.() ?? {}) : s);
  const text = (page.text ?? []).map(fill);

  switch (page.type) {
    case 'hook': {
      if (c.index === 0 && c.lesson.questions?.length) {
        body.insertAdjacentHTML('beforeend', `<aside class="todays-questions" aria-label="Today's questions"><h3>Today's questions</h3><ol>${c.lesson.questions.map((q) => `<li>${q}</li>`).join('')}</ol></aside>`);
      }
      if (page.photo) {
        const fig = document.createElement('figure');
        fig.className = 'hook-photo';
        fig.innerHTML = `<img src="${page.photo}" alt="${page.photoAlt ?? ''}"><figcaption>${page.photoCredit ?? ''}</figcaption>`;
        fig.querySelector('img').addEventListener('error', () => {
          fig.innerHTML = `<p class="photo-missing">Photo to come: ${page.photoAlt ?? 'photo'}</p>`;
        });
        body.append(fig);
      }
      body.insertAdjacentHTML('beforeend', paras(text));
      break;
    }
    case 'name': {
      body.insertAdjacentHTML('beforeend', paras(text));
      steps(body, (page.steps ?? []).map(fill), c.saved?.stepsSeen);
      textbookParts(body, page);
      for (const id of [].concat(page.term ?? [])) c.onNamed(id);
      break;
    }
    case 'explore': {
      body.insertAdjacentHTML('beforeend', paras(text));
      textbookParts(body, page);
      workBox(body, page, c);
      break;
    }
    case 'predict': {
      body.insertAdjacentHTML('beforeend', paras(text));
      // A prediction is not marked. Committing saves it and unlocks the run,
      // and the run shows what really happens (no answer before commitment).
      const q = {
        ...page.question,
        type: 'mcqReason',
        neutral: true,
        options: page.question.options.map((o) => ({ ...o, correct: undefined, feedback: 'Your prediction and reason are saved. Now run it and see.' })),
      };
      const saved = c.saved?.answers?.[q.id];
      const after = document.createElement('div');
      after.className = 'predict-after';
      after.hidden = !saved;
      renderQuestion(body, q, {
        saved,
        checkLabel: 'Commit my prediction',
        onCommit: (rec) => {
          c.onAnswer(rec);
          after.hidden = false;
          c.onUnlock();
        },
      });
      after.innerHTML = paras((page.after ?? []).map(fill));
      body.append(after);
      workBox(after, page, c);
      if (saved) c.onUnlock();
      break;
    }
    case 'use':
    case 'check':
    case 'notes': {
      body.insertAdjacentHTML('beforeend', paras(text));
      textbookParts(body, page);
      if (page.question) renderQuestion(body, page.question, { saved: c.saved?.answers?.[page.question.id], onCommit: c.onAnswer });
      if (page.controls?.length || page.actions?.length) workBox(body, page, c);
      break;
    }
    case 'exit': {
      body.insertAdjacentHTML('beforeend', paras(text));
      questionSequence(body, page.questions, c);
      break;
    }
    case 'game':
      gamePage(body, page, c);
      break;
    case 'win':
      body.insertAdjacentHTML('beforeend', paras(text));
      winPage(body, page, c);
      break;
    default:
      body.insertAdjacentHTML('beforeend', paras(text));
  }

  if (page.note) body.insertAdjacentHTML('beforeend', `<p class="page-note">${fill(page.note)}</p>`);
  return { destroy() { panel.innerHTML = ''; } };
}

/**
 * The boxed equations and the key words for a page, set like a textbook.
 * page.equations: [{ html, words }]. page.keyWords: glossary ids. A name page
 * also lists the terms it names.
 */
function textbookParts(parent, page) {
  if (page.equations?.length) {
    parent.insertAdjacentHTML('beforeend', `<div class="eq-box">${page.equations.map((e) => `<p class="eq">${e.html}</p>${e.words ? `<p class="eq-words">${e.words}</p>` : ''}`).join('')}</div>`);
  }
  const ids = [...(page.keyWords ?? []), ...(page.type === 'name' ? [].concat(page.term ?? []) : [])];
  const words = [...new Set(ids)].map((id) => GLOSSARY[id]).filter(Boolean);
  if (words.length) {
    parent.insertAdjacentHTML('beforeend', `<dl class="key-words"><dt class="key-words-head">Key words</dt>${words.map((w) => `<div><dt>${w.term}</dt><dd>${w.meaning}</dd></div>`).join('')}</dl>`);
  }
}

/** Reveal steps one at a time, like a build (CLAUDE.md section 6, rule 5). */
function steps(parent, list, seen = 0) {
  if (!list.length) return;
  const ol = document.createElement('ol');
  ol.className = 'build-steps';
  parent.append(ol);
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'build-next';
  let shown = 0;
  const show = () => {
    if (shown < list.length) {
      ol.insertAdjacentHTML('beforeend', `<li class="build-step">${list[shown]}</li>`);
      shown += 1;
    }
    btn.hidden = shown >= list.length;
    btn.textContent = 'Show the next step';
  };
  btn.addEventListener('click', show);
  parent.append(btn);
  show();
  while (shown < Math.min(seen, list.length)) show();
}

/** The box students work in: the instruction, the controls and the actions. */
function workBox(parent, page, c) {
  if (!c.scene) return;
  const box = document.createElement('section');
  box.className = 'work-box';
  box.setAttribute('aria-label', 'Try it');
  if (page.goal) box.insertAdjacentHTML('beforeend', `<p class="work-goal">${page.goal}</p>`);
  const controls = document.createElement('div');
  controls.className = 'work-controls';
  box.append(controls);
  const handles = {};
  for (const id of page.controls ?? []) {
    const p = c.scene.params[id];
    if (!p) continue;
    const onChange = (v) => c.scene.setParam(id, v);
    if (p.type === 'switch') handles[id] = createSwitch(controls, p, onChange);
    else if (p.type === 'choice') handles[id] = createChoice(controls, p, onChange);
    else handles[id] = createSlider(controls, p, onChange);
  }
  // A value changed by handling the object in the scene shows on its slider too.
  c.scene.onParamChange = (id, v) => handles[id]?.update?.(v);
  const actions = document.createElement('div');
  actions.className = 'work-actions';
  box.append(actions);
  const ids = page.actions ?? Object.keys(c.scene.actions ?? {});
  for (const id of ids) {
    const a = c.scene.actions[id];
    if (a) createActionButton(actions, a, () => c.scene.act(id));
  }
  if (c.scene.records) {
    const table = document.createElement('table');
    table.className = 'runs-table';
    box.append(table);
    const draw = () => {
      const rows = c.scene.records.slice(-4);
      table.innerHTML = `<caption>Your runs</caption><tr>${c.scene.recordColumns.map((h) => `<th>${h}</th>`).join('')}</tr>${rows.map((r) => `<tr>${r.map((v) => `<td>${v}</td>`).join('')}</tr>`).join('')}`;
      table.hidden = rows.length === 0;
    };
    c.scene.onRecord = draw;
    draw();
  }
  parent.append(box);
}

/** A set of questions shown one at a time. */
function questionSequence(parent, questions, c) {
  const holder = document.createElement('div');
  holder.className = 'q-sequence';
  parent.append(holder);
  const counter = document.createElement('p');
  counter.className = 'q-counter';
  holder.append(counter);
  const slot = document.createElement('div');
  holder.append(slot);
  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'q-next';
  next.textContent = 'Next question';
  holder.append(next);
  let i = 0;
  function show() {
    slot.innerHTML = '';
    counter.textContent = `Question ${i + 1} of ${questions.length}`;
    const q = questions[i];
    const saved = c.saved?.answers?.[q.id];
    next.hidden = !(saved && i < questions.length - 1);
    renderQuestion(slot, q, {
      saved,
      onCommit: (rec) => {
        c.onAnswer(rec);
        if (i < questions.length - 1) next.hidden = false;
      },
    });
  }
  next.addEventListener('click', () => {
    i = Math.min(questions.length - 1, i + 1);
    show();
    slot.querySelector('input, textarea, select')?.focus();
  });
  show();
}
