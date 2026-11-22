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
  check: 'Check', notes: 'Notes', exit: 'Exit ticket', text: '', contents: '', game: 'Ledger Run', win: 'Ledger Run', spread: '',
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
  panel.classList.remove('is-textbook');
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
  const kicker = page.kicker ?? KICKER[page.type] ?? '';
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
      const stampSlot = document.createElement('div');
      stampSlot.className = 'stamp-slot';
      stampSlot.innerHTML = stampHtml(c.number);
      stampSlot.hidden = !c.saved?.done;
      panel.append(stampSlot);
      const prior = c.onComplete;
      c.onComplete = (fresh) => {
        stampSlot.hidden = false;
        if (fresh && !stampSlot.dataset.pressed) {
          stampSlot.dataset.pressed = '1';
          stampSlot.classList.add('is-pressing');
          // Once pressed, the stamp is printed into the paper with the page.
          setTimeout(() => stampSlot.classList.remove('is-pressing'), 500);
        }
        prior?.(fresh);
      };
      questionSequence(body, page.questions, c);
      break;
    }
    case 'spread':
      // A textbook spread: this page's blocks, set densely.
      panel.classList.add('is-textbook');
      blocks(body, page.left, page, c);
      break;
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
 * The right-hand page of a textbook spread: room for the living figure at
 * the top, then its caption and the blocks printed beneath it. Returns the
 * element (the book puts it on the right page, or after the left page's
 * text in the stacked layout).
 */
export function renderRight(page, c) {
  const el = document.createElement('div');
  el.className = 'spread-right';
  const room = document.createElement('div');
  room.className = 'figure-room';
  room.style.setProperty('--room', String(page.figure?.room ?? 0.6));
  room.setAttribute('aria-hidden', 'true');
  el.append(room);
  const body = document.createElement('div');
  body.className = 'page-body';
  el.append(body);
  if (page.figure?.caption) {
    body.insertAdjacentHTML('beforeend', `<p class="fig-caption"><b>Fig. ${c.number ? `${c.number}.` : ''}${page.figure.n ?? c.index + 1}</b>${page.figure.caption}</p>`);
  }
  blocks(body, page.right, page, c);
  const folio = document.createElement('p');
  folio.className = 'page-folio page-folio-right';
  folio.setAttribute('aria-hidden', 'true');
  folio.textContent = String(c.index * 2 + 3);
  el.append(folio);
  return el;
}

/**
 * The blocks of a textbook spread, in reading order. Each is a string (a
 * paragraph) or one of:
 *   { h }                    a subheading
 *   { lead }                 the opening paragraph, set larger
 *   { questions: true }      the lesson's questions for today
 *   { key }                  a boxed key idea
 *   { table: { head, rows }} a ruled table
 *   { keyWords: [ids] }      glossary terms and meanings
 *   { equations: [...] }     boxed equations
 *   { try: { goal, actions, controls } }  the instruction for handling the figure
 *   { q: question, n }       a numbered question, marked on the page
 *   { stamp: true }          where the lesson's stamp is pressed
 */
function blocks(parent, list, page, c) {
  const asked = [...(page.left ?? []), ...(page.right ?? [])].filter((b) => b?.q).map((b) => b.q.id);
  for (const b of list ?? []) {
    if (typeof b === 'string') {
      parent.insertAdjacentHTML('beforeend', `<p>${b}</p>`);
    } else if (b.h) {
      parent.insertAdjacentHTML('beforeend', `<h3 class="tb-h">${b.h}</h3>`);
    } else if (b.lead) {
      parent.insertAdjacentHTML('beforeend', `<p class="tb-lead">${b.lead}</p>`);
    } else if (b.questions) {
      parent.insertAdjacentHTML('beforeend', `<aside class="todays-questions" aria-label="Today's questions"><h3>Today's questions</h3><ol>${c.lesson.questions.map((q) => `<li>${q}</li>`).join('')}</ol></aside>`);
    } else if (b.key) {
      parent.insertAdjacentHTML('beforeend', `<p class="tb-key">${b.key}</p>`);
    } else if (b.table) {
      parent.insertAdjacentHTML('beforeend', `<table class="tb-table"><thead><tr>${b.table.head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${b.table.rows.map((r) => `<tr>${r.map((v, i) => (i ? `<td>${v}</td>` : `<th scope="row">${v}</th>`)).join('')}</tr>`).join('')}</tbody></table>`);
    } else if (b.keyWords || b.equations) {
      textbookParts(parent, { keyWords: b.keyWords, equations: b.equations });
      for (const id of b.keyWords ?? []) c.onNamed(id);
    } else if (b.try) {
      workBox(parent, b.try, c);
    } else if (b.q) {
      const wrap = document.createElement('div');
      wrap.className = 'tb-q';
      if (b.n) wrap.insertAdjacentHTML('beforeend', `<span class="tb-q-n" aria-hidden="true">${b.n}</span>`);
      parent.append(wrap);
      renderQuestion(wrap, b.q, {
        saved: c.saved?.answers?.[b.q.id],
        checkLabel: 'Check',
        onCommit: (rec) => {
          c.onAnswer(rec);
          // The last spread's questions all answered: the lesson's stamp is pressed.
          if (page.completes && asked.every((id) => c.saved?.answers?.[id] || id === rec.id)) c.onComplete?.(true);
        },
      });
    } else if (b.stamp) {
      const slot = document.createElement('div');
      slot.className = 'stamp-slot tb-stamp';
      slot.innerHTML = stampHtml(c.number);
      slot.hidden = !c.saved?.done;
      parent.append(slot);
      const prior = c.onComplete;
      c.onComplete = (fresh) => {
        slot.hidden = false;
        if (fresh && !slot.dataset.pressed) {
          slot.dataset.pressed = '1';
          slot.classList.add('is-pressing');
          setTimeout(() => slot.classList.remove('is-pressing'), 500);
        }
        prior?.(fresh);
      };
    }
  }
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
/**
 * The ink stamp a lesson earns when its exit ticket is complete: a ledger
 * stamp, "Accounts balanced", pressed into the page at a slight angle.
 */
export function stampHtml(number) {
  return `<div class="ink-stamp" role="img" aria-label="Lesson ${number ?? ''} complete. Accounts balanced.">
    <span class="stamp-top">Lesson ${number ?? ''}</span>
    <span class="stamp-main">Balanced</span>
    <span class="stamp-bottom">accounts checked</span>
  </div>`;
}

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
        // Every question answered: the lesson's stamp presses into the page.
        if (questions.every((qq) => c.saved?.answers?.[qq.id] || qq.id === rec.id)) c.onComplete?.(true);
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
