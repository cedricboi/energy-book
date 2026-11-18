// src/ui/checks.js
// Question types: MCQ, MCQ with a written reason, numeric answer with units,
// short written answer, fill the blanks, match or label, and ordering.
// One question at a time (CLAUDE.md section 6, rule 12). Answers stay hidden
// until the student commits (section 5, rule 6). Feedback responds to the
// actual mistake (section 6, rule 11).
import { mark } from './marking.js';

let uid = 0;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/**
 * Render one question.
 * @param {HTMLElement} parent
 * @param {object} q        question data (with id and type)
 * @param {object} o
 * @param {object} [o.saved]   { response, attempts, firstCorrect }
 * @param {(record: object) => void} o.onCommit   called after each check
 * @param {string} [o.checkLabel]
 */
export function renderQuestion(parent, q, { saved, onCommit, checkLabel = 'Check my answer' }) {
  const id = `q${uid++}`;
  const box = document.createElement('form');
  box.className = `question q-${q.type}`;
  box.noValidate = true;
  box.dataset.qid = q.id;
  const prompt = `<p class="q-prompt" id="${id}-p">${q.prompt}</p>`;
  let body = '';
  let read;

  if (q.type === 'mcq' || q.type === 'mcqReason') {
    body = `<fieldset class="q-options" aria-labelledby="${id}-p">${q.options.map((o) => `
      <label class="q-option"><input type="radio" name="${id}" value="${o.id}"><span>${o.text}</span></label>`).join('')}</fieldset>`;
    if (q.type === 'mcqReason') body += `<label class="q-reason-label" for="${id}-r">${q.reasonPrompt ?? 'Give your reason.'}</label><textarea id="${id}-r" class="q-reason" rows="2"></textarea>`;
    read = () => ({ choice: box.querySelector(`input[name="${id}"]:checked`)?.value, reason: box.querySelector('.q-reason')?.value });
  } else if (q.type === 'numeric') {
    body = `<div class="q-num-row"><label for="${id}-v" class="sr-only">Your answer</label>
      <input id="${id}-v" class="q-value" inputmode="decimal" autocomplete="off" placeholder="Your answer">
      <label for="${id}-u" class="sr-only">Unit</label>
      <select id="${id}-u" class="q-unit"><option value="">unit</option>${(q.units ?? [q.unit]).map((u) => `<option>${esc(u)}</option>`).join('')}</select></div>`;
    read = () => ({ value: box.querySelector('.q-value').value, unit: box.querySelector('.q-unit').value });
  } else if (q.type === 'short') {
    body = `<label for="${id}-t" class="sr-only">Your answer</label><textarea id="${id}-t" class="q-text" rows="3" placeholder="Write your answer in full sentences."></textarea>`;
    read = () => ({ text: box.querySelector('.q-text').value });
  } else if (q.type === 'cloze') {
    // The text uses {id} for each blank. Each blank is a choice from a word bank.
    const bank = q.bank ?? q.blanks.map((b) => b.answer);
    const html = q.text.replace(/\{(\w+)\}/g, (_, bid) => `<label class="sr-only" for="${id}-${bid}">Blank ${bid}</label><select id="${id}-${bid}" class="q-blank" data-blank="${bid}"><option value="">choose</option>${bank.map((w) => `<option>${esc(w)}</option>`).join('')}</select>`);
    body = `<div class="q-cloze">${html}</div>`;
    read = () => ({ answers: Object.fromEntries([...box.querySelectorAll('.q-blank')].map((s) => [s.dataset.blank, s.value])) });
  } else if (q.type === 'match' || q.type === 'label') {
    body = `<div class="q-match">${q.pairs.map((p) => `
      <div class="q-pair"><label for="${id}-${p.id}" class="q-pair-item">${p.item}</label>
      <select id="${id}-${p.id}" data-pair="${p.id}"><option value="">choose</option>${q.choices.map((c) => `<option value="${esc(c.id)}">${c.text}</option>`).join('')}</select></div>`).join('')}</div>`;
    read = () => ({ answers: Object.fromEntries([...box.querySelectorAll('select[data-pair]')].map((s) => [s.dataset.pair, s.value])) });
  } else if (q.type === 'order') {
    const start = q.shuffled ?? [...q.order].reverse();
    body = `<ol class="q-order">${start.map((oid) => `<li data-id="${oid}"><span>${q.items[oid]}</span>
      <button type="button" class="q-up" aria-label="Move up">▲</button><button type="button" class="q-down" aria-label="Move down">▼</button></li>`).join('')}</ol>`;
    read = () => ({ order: [...box.querySelectorAll('.q-order li')].map((li) => li.dataset.id) });
  } else {
    throw new Error(`Unknown question type "${q.type}"`);
  }

  box.innerHTML = `${prompt}${body}
    <div class="q-actions"><button type="submit" class="q-check primary">${checkLabel}</button></div>
    <div class="q-feedback" role="status" aria-live="polite" hidden></div>
    ${q.model ? `<details class="q-model" hidden><summary>Model answer</summary><p>${q.model}</p></details>` : ''}`;
  parent.append(box);

  if (q.type === 'order') {
    box.querySelector('.q-order').addEventListener('click', (e) => {
      const li = e.target.closest('li');
      if (!li) return;
      if (e.target.classList.contains('q-up') && li.previousElementSibling) li.parentNode.insertBefore(li, li.previousElementSibling);
      if (e.target.classList.contains('q-down') && li.nextElementSibling) li.parentNode.insertBefore(li.nextElementSibling, li);
      e.target.focus();
    });
  }

  const fb = box.querySelector('.q-feedback');
  const model = box.querySelector('.q-model');
  let attempts = saved?.attempts ?? 0;
  let firstCorrect = saved?.firstCorrect;

  function show(result) {
    fb.hidden = false;
    fb.className = `q-feedback ${q.neutral ? 'is-neutral' : result.correct ? 'is-right' : 'is-wrong'}`;
    fb.textContent = result.feedback;
    if (model && (result.correct || attempts >= 2 || q.type === 'short')) model.hidden = false;
  }

  box.addEventListener('submit', (e) => {
    e.preventDefault();
    const response = read();
    const result = mark(q, response);
    if (result.needsReason || result.detail?.tooShort) {
      show(result);
      return;
    }
    attempts += 1;
    if (firstCorrect === undefined) firstCorrect = result.correct;
    show(result);
    onCommit?.({ id: q.id, response, correct: result.correct, attempts, firstCorrect });
  });

  // Restore a saved answer (and its feedback) when the student comes back.
  if (saved?.response) {
    restore(box, q, id, saved.response);
    show(mark(q, saved.response));
  }

  return { el: box, read };
}

function restore(box, q, id, r) {
  if (r.choice) {
    const radio = box.querySelector(`input[name="${id}"][value="${r.choice}"]`);
    if (radio) radio.checked = true;
  }
  if (r.reason !== undefined && box.querySelector('.q-reason')) box.querySelector('.q-reason').value = r.reason;
  if (r.value !== undefined && box.querySelector('.q-value')) box.querySelector('.q-value').value = r.value;
  if (r.unit !== undefined && box.querySelector('.q-unit')) box.querySelector('.q-unit').value = r.unit;
  if (r.text !== undefined && box.querySelector('.q-text')) box.querySelector('.q-text').value = r.text;
  if (r.answers) {
    for (const [k, v] of Object.entries(r.answers)) {
      const s = box.querySelector(`[data-blank="${k}"], [data-pair="${k}"]`);
      if (s) s.value = v;
    }
  }
  if (r.order) {
    const ol = box.querySelector('.q-order');
    for (const oid of r.order) {
      const li = ol.querySelector(`[data-id="${oid}"]`);
      if (li) ol.append(li);
    }
  }
}
