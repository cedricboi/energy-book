// src/lessons/textbook.js
// Sets a lesson as a textbook. A lesson is written as a sequence of small
// steps (hook, predict, explore, name, use, check, notes, exit: CLAUDE.md
// section 8). This lays those steps out, in the same order, as a few dense
// spreads: the text, equations, key words and numbered questions on the left
// page, and the living figure on the right. Nothing is added or left out,
// and every question keeps its id.
//
// A spread ends when the next step would not fit on the page, when the
// figure has to change (another scene, or another starting state), or when
// a question needs the figure's numbers hidden.

const KICKER = { explore: 'Investigate', predict: 'Predict', name: 'New term', use: 'Practice', check: 'Check', notes: 'Notes', exit: 'Exit ticket' };

// Rough heights in px at the printed page's size (13 px type, about 88
// characters to a line), used only to decide where a spread ends. Each
// question leaves room for the feedback that appears once it is marked.
const BUDGET = 585;
const LINE = 17.2;
const plain = (s) => String(s).replace(/<[^>]+>/g, '');
const lines = (s, perLine = 78) => Math.max(1, Math.ceil(plain(s).length / perLine));
const text = (s) => (typeof s === 'function' ? 'x'.repeat(130) : s);

/** Answer options are set in two columns, so each pair shares a row. */
function optionsCost(options) {
  let h = 0;
  for (let i = 0; i < options.length; i += 2) h += Math.max(lines(options[i].text, 40), lines(options[i + 1]?.text ?? '', 40)) * 15;
  return h + 4;
}

function questionCost(q) {
  const prompt = lines(q.prompt ?? '', 84) * LINE + 6;
  const marked = 26 + 26; // the Check button, then a line of feedback
  switch (q.type) {
    case 'mcq':
      return prompt + optionsCost(q.options) + marked + 14;
    case 'mcqReason':
      return prompt + optionsCost(q.options) + 60 + marked;
    case 'numeric':
      return prompt + 30 + 26; // the Check button sits beside the answer box
    case 'short':
      return prompt + 40 + marked + 10;
    case 'label':
    case 'match':
      return prompt + q.pairs.length * 27 + marked;
    case 'order':
      return prompt + Object.keys(q.items).length * 30 + marked;
    case 'cloze': {
      const rows = (q.text.match(/<tr/g) ?? []).length;
      return prompt + (rows ? rows * 30 : lines(q.text, 52) * 24) + marked;
    }
    default:
      return prompt + 60 + marked;
  }
}

export function cost(b) {
  if (typeof b === 'string' || typeof b === 'function') return lines(text(b)) * LINE + 6;
  if (b.lead) return lines(text(b.lead), 72) * 19.5 + 7;
  if (b.h) return 24;
  if (b.questions) return 44 + b.count * LINE;
  if (b.note) return lines(text(b.note), 90) * 15 + 6;
  if (b.steps) return b.steps.reduce((a, s) => a + lines(text(s), 78) * LINE + 3, 6);
  if (b.equations || b.keyWords) {
    const eq = (b.equations ?? []).reduce((a, e) => a + 30 + (e.words ? lines(e.words, 90) * 14 : 0), b.equations?.length ? 18 : 0);
    const kw = (b.keyWords ?? []).length ? 16 + b.keyWords.length * 18 : 0;
    return eq + kw;
  }
  if (b.try) {
    const t = b.try;
    return 18 + (t.goal ? lines(t.goal, 74) * LINE + 6 : 0) + (t.controls?.length ?? 0) * 36 + (t.controls?.length ? 26 : 0) + Math.ceil((t.actions?.length ?? 2) / 4) * 30;
  }
  if (b.predict) return questionCost({ ...b.predict, type: 'mcqReason' }) + (b.after ?? []).reduce((a, x) => a + cost(x), 0);
  if (b.q) return questionCost(b.q) + 8;
  if (b.stamp) return b.corner ? 0 : 70;
  return 20;
}

/** True if a step's starting state does not contradict the spread's. */
const agrees = (want, have) => Object.entries(want ?? {}).every(([k, v]) => have?.[k] === undefined || have[k] === v);

/** The blocks one step of the lesson becomes, in reading order. */
function blocksOf(page, { lesson, first, headed, next }) {
  const out = [];
  const paras = [...(page.text ?? [])];
  const extras = () => {
    const keyWords = [...(page.keyWords ?? []), ...(page.type === 'name' ? [].concat(page.term ?? []) : [])];
    if (page.equations?.length) out.push({ equations: page.equations });
    if (keyWords.length) out.push({ keyWords });
  };
  const tryBox = () => {
    if (page.goal || page.controls?.length || page.actions?.length) out.push({ try: { goal: page.goal, controls: page.controls, actions: page.actions } });
  };
  // A practice question needs no heading of its own: its number is enough.
  if (!headed && !['hook', 'use', 'check'].includes(page.type)) out.push({ h: page.title ?? KICKER[page.type] });
  switch (page.type) {
    case 'hook':
      if (paras.length) out.push({ lead: paras.shift() });
      out.push(...paras);
      if (first && lesson.questions?.length) out.push({ questions: true, count: lesson.questions.length });
      break;
    case 'predict':
      out.push(...paras);
      out.push({ predict: page.question, after: [...(page.after ?? []), ...(page.goal || page.controls || page.actions ? [{ try: { goal: page.goal, controls: page.controls, actions: page.actions } }] : [])] });
      break;
    case 'explore':
      out.push(...paras);
      extras();
      tryBox();
      break;
    case 'name':
      out.push(...paras);
      if (page.steps?.length) out.push({ steps: page.steps });
      extras();
      break;
    case 'exit':
      out.push(...paras);
      for (const q of page.questions ?? []) out.push({ q, n: next() });
      break;
    default: // use, check, notes
      out.push(...paras);
      extras();
      if (page.question) out.push({ q: page.question, n: next() });
      tryBox();
  }
  if (page.note) out.push({ note: page.note });
  return out;
}

// The figure of a spread set from steps is drawn smaller, at the head of the
// right-hand page, so the text can run on beneath it. `scale` shrinks the
// scene about the top of the page, and `room` is the share of the page it
// then needs (measured from each scene, see scripts/figure-rooms.mjs).
const FIGURE_SCALE = 0.7;
const ROOMS = { default: 0.535, kinetic: 0.585 };
const NO_LEDGER = ['transfers', 'power'];
const PAGE_PX = 645; // height of the printed right-hand page
const figureOf = (scene) => ({ scale: FIGURE_SCALE, room: ROOMS[String(scene).split(':')[0]] ?? ROOMS.default });
// What is left under the figure, less its caption and the energy ledger.
const rightBudget = (scene) => Math.round((1 - figureOf(scene).room) * PAGE_PX - 36 - (NO_LEDGER.includes(String(scene).split(':')[0]) ? 0 : 56));

/**
 * @param {object} lesson  a lesson written as steps
 * @param {number} [number] the lesson's number, for the kicker
 * @returns {object} the same lesson, with its pages set as spreads
 */
export function toTextbook(lesson, number) {
  if (lesson.textbook || lesson.game || lesson.pages[0]?.type !== 'hook') return lesson;
  const spreads = [];
  let cur = null;
  let n = 0;
  let asked = false; // today's questions are printed once
  const next = () => (n += 1);
  const label = number ? `Lesson ${number}` : 'Lesson';

  const open = (page) => {
    cur = {
      type: 'spread',
      scene: page.scene,
      kicker: spreads.length ? `${label} · ${KICKER[page.type] ?? 'continued'}` : label,
      title: spreads.length ? page.title ?? lesson.title : lesson.title,
      left: [],
      right: [],
      figure: figureOf(page.scene),
      usedL: 0,
      usedR: 0,
      roomR: rightBudget(page.scene),
      side: 'left',
      live: false,
      hideValues: false,
    };
    spreads.push(cur);
  };

  /** True if these blocks all fit in what is left of a spread. */
  const fits = (blocks, sp) => {
    let { usedL, usedR, side } = sp;
    for (const b of blocks) {
      const c = cost(b);
      if (b.try && usedR + c <= sp.roomR) usedR += c;
      else if (side === 'left' && usedL + c <= BUDGET) usedL += c;
      else if (usedR + c <= sp.roomR) {
        side = 'right';
        usedR += c;
      } else return false;
    }
    return true;
  };

  /** Set one block on the left page, then the right, then a new spread. */
  const place = (b, after, page, touched) => {
    const c = cost(b);
    // The controls go under the figure they work.
    if (b.try && cur.usedR + c <= cur.roomR) {
      cur.right.push(b);
      cur.usedR += c;
      return;
    }
    // A subheading stays with the text it heads.
    const need = c + (b.h && after ? cost(after) : 0);
    if (cur.side === 'left' && cur.usedL + need > BUDGET && cur.left.length) cur.side = 'right';
    if (cur.side === 'left') {
      cur.left.push(b);
      cur.usedL += c;
      return;
    }
    if (cur.usedR + need <= cur.roomR || (!cur.right.length && !cur.left.length)) {
      cur.right.push(b);
      cur.usedR += c;
      return;
    }
    open(page);
    touched.push(cur);
    if (b.h) return; // the new spread is headed by this step's title
    cur.left.push(b);
    cur.usedL += c;
  };

  for (const page of lesson.pages) {
    const live = ['hook', 'predict', 'explore'].includes(page.type) || !!page.controls?.length || !!page.actions?.length;
    const mustBreak = !cur
      || (page.scene ?? cur.scene) !== cur.scene
      || (live && cur.live && !agrees(page.sceneState, cur.sceneState))
      || (page.hideValues && cur.live)
      || (live && cur.hideValues);
    let blocks = blocksOf(page, { lesson, first: !asked, headed: false, next });
    if (blocks.some((b) => b.questions)) asked = true;
    // A step that will not fit in what is left starts a new spread, unless
    // it is too long for any one spread (then it runs on across the turn).
    const whole = blocks.reduce((a, b) => a + cost(b), 0);
    // Plain text may run on over the turn: only a question stays whole.
    const asks = blocks.some((b) => b.q || b.predict || b.try);
    const starts = mustBreak || (asks && !fits(blocks, cur) && whole <= BUDGET + cur.roomR);
    if (starts) {
      const firstSpread = !spreads.length;
      open(page);
      // The spread is headed by this step's title. The lesson's first spread
      // is headed by the lesson's title, so its opening step keeps its own.
      if (blocks[0]?.h) blocks = blocks.slice(1);
      if (firstSpread && page.title) blocks.unshift({ h: page.title });
    }
    const touched = [cur];
    blocks.forEach((b, i) => place(b, blocks[i + 1], page, touched));
    for (const sp of touched) {
      if (page.sceneState && (live || !sp.sceneState)) sp.sceneState = { ...sp.sceneState, ...page.sceneState };
      if (live) {
        sp.live = true;
        sp.handle = true;
        sp.cue ??= page.cue;
      }
      if (page.hideValues) sp.hideValues = true;
      if (page.figureHint) sp.figureHint = page.figureHint;
    }
    if (page.type === 'predict') touched[0].lockUntil = page.question.id;
  }

  for (const sp of spreads) {
    // A right-hand page left bare takes the end of the left page's text.
    const tries = 0;
    while (sp.right.length === (sp.moved ?? 0) && sp.left.length >= 2) {
      let take = 1;
      const last = sp.left.at(-1);
      if (sp.left.at(-2)?.h) take = 2;
      if (sp.left.length - take < 1) break;
      const moving = sp.left.slice(-take);
      const c = moving.reduce((a, b) => a + cost(b), 0);
      if (last.questions || last.lead || last.predict || sp.usedR + c > sp.roomR || sp.usedR + c > sp.usedL) break;
      sp.left.splice(-take);
      sp.right.splice(tries, 0, ...moving);
      sp.usedL -= c;
      sp.usedR += c;
      sp.moved = (sp.moved ?? 0) + take;
    }
    // With nothing to print beneath it, the figure keeps the whole page.
    if (!sp.right.length) {
      delete sp.right;
      delete sp.figure;
    }
    for (const k of ['usedL', 'usedR', 'roomR', 'side', 'live', 'moved']) delete sp[k];
  }
  spreads.at(-1).completes = true;
  // The lesson's stamp is pressed beside the last spread's title.
  spreads.at(-1).left.push({ stamp: true, corner: true });
  return { ...lesson, textbook: true, pages: spreads };
}
