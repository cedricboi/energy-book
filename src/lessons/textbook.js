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
const BUDGET = 570;
const LINE = 17.2;
const plain = (s) => String(s).replace(/<[^>]+>/g, '');
const lines = (s, perLine = 88) => Math.max(1, Math.ceil(plain(s).length / perLine));
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
      return prompt + optionsCost(q.options) + marked;
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

function cost(b) {
  if (typeof b === 'string' || typeof b === 'function') return lines(text(b)) * LINE + 6;
  if (b.lead) return lines(text(b.lead), 72) * 19.5 + 7;
  if (b.h) return 24;
  if (b.questions) return 44 + b.count * LINE;
  if (b.note) return lines(text(b.note), 90) * 15 + 6;
  if (b.steps) return b.steps.reduce((a, s) => a + lines(text(s), 78) * LINE + 3, 6);
  if (b.equations || b.keyWords) {
    const eq = (b.equations ?? []).reduce((a, e) => a + 30 + (e.words ? lines(e.words, 90) * 14 : 0), b.equations?.length ? 18 : 0);
    const kw = (b.keyWords ?? []).length ? 20 + b.keyWords.length * 26 : 0;
    return eq + kw;
  }
  if (b.try) {
    const t = b.try;
    return 22 + (t.goal ? lines(t.goal, 74) * LINE + 6 : 0) + (t.controls?.length ?? 0) * 40 + (t.controls?.length ? 62 : 0) + Math.ceil((t.actions?.length ?? 2) / 4) * 34;
  }
  if (b.predict) return questionCost({ ...b.predict, type: 'mcqReason' }) + (b.after ?? []).reduce((a, x) => a + cost(x), 0);
  if (b.q) return questionCost(b.q) + 8;
  if (b.stamp) return 70;
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
      out.push({ stamp: true });
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
  const next = () => (n += 1);
  const label = number ? `Lesson ${number}` : 'Lesson';

  for (const page of lesson.pages) {
    const live = ['hook', 'predict', 'explore'].includes(page.type) || !!page.controls?.length || !!page.actions?.length;
    const mustBreak = !cur
      || (page.scene ?? cur.scene) !== cur.scene
      || (live && cur.live && !agrees(page.sceneState, cur.sceneState))
      || (page.hideValues && cur.live)
      || (live && cur.hideValues);
    let blocks = blocksOf(page, { lesson, first: !spreads.length, headed: mustBreak, next: () => 0 });
    const size = blocks.reduce((a, b) => a + cost(b), 0);
    const starts = mustBreak || cur.used + size > BUDGET;
    if (starts) {
      cur = {
        type: 'spread',
        scene: page.scene,
        kicker: spreads.length ? `${label} · ${KICKER[page.type] ?? 'continued'}` : label,
        title: spreads.length ? page.title ?? lesson.title : lesson.title,
        left: [],
        used: 0,
        live: false,
        hideValues: false,
      };
      // The lesson's first spread is headed by the lesson's title, so its
      // opening step keeps its own title as a subheading.
      if (!spreads.length && page.title) cur.left.push({ h: page.title });
      spreads.push(cur);
    }
    // Number the questions only now, when the step's place is known.
    blocks = blocksOf(page, { lesson, first: spreads.length === 1 && !cur.left.some((b) => b.questions), headed: starts, next });
    cur.left.push(...blocks);
    cur.used += blocks.reduce((a, b) => a + cost(b), 0);
    if (page.sceneState && (live || !cur.sceneState)) cur.sceneState = { ...cur.sceneState, ...page.sceneState };
    if (live) {
      cur.live = true;
      cur.handle = true;
      cur.cue ??= page.cue;
    }
    if (page.hideValues) cur.hideValues = true;
    if (page.type === 'predict') cur.lockUntil = page.question.id;
    if (page.figureHint) cur.figureHint = page.figureHint;
  }
  spreads.at(-1).completes = true;
  for (const s of spreads) {
    delete s.used;
    delete s.live;
  }
  return { ...lesson, textbook: true, pages: spreads };
}
