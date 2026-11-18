// src/book/gamePage.js
// The Ledger Run page: the level's story, what each part does, the inputs,
// three tries, and feedback that shows the machine's accounts. Points only
// come from correct accounting (no speed bonus).
import { createSlider, createActionButton } from '../ui/controls.js';
import { LEVELS, MARBLE, score, solve } from '../physics/game.js';
import { formatQuantity } from '../physics/format.js';

const fq = formatQuantity;
const TRIES = 3;
const INPUT_LABELS = {
  height: { label: 'Start height', unit: 'm' },
  spring: { label: 'Spring energy', unit: 'J' },
  lift: { label: 'Lift motor time', unit: 's' },
  fan: { label: 'Fan time', unit: 's' },
};

function partsList(level) {
  // The detail for each part is labelled on the machine itself. Here, only
  // the facts needed for the accounts.
  const facts = [`m = ${fq(MARBLE, 'kg', 2)}`, 'g = 10 N/kg'];
  if (level.target.height !== undefined) facts.push(`cup height ${fq(level.target.height, 'm', 2)}`);
  else facts.push(`gate speed ${fq(level.target.speed, 'm/s', 2)}`);
  return `<p class="game-parts">${facts.join(', ')}. Each part's label on the machine shows what it gives or transfers to the internal store.</p>`;
}

export function partNotes(level) {
  const rows = [];
  if (level.inputs.height || level.startHeight) {
    const tower = level.startHeight ? ` The tower adds ${fq(level.startHeight, 'm', 2)}.` : '';
    rows.push(`Tower. The gravitational potential store is mgh, with m = ${fq(MARBLE, 'kg', 2)}.${tower}`);
  }
  if (level.inputs.spring) rows.push('Spring. It gives the marble the energy you set.');
  if (level.inputs.lift) rows.push(`Lift. Its motor gives E = P × t, with P = ${fq(level.power.lift, 'W', 2)}.`);
  if (level.inputs.fan) rows.push(`Fan. It gives E = P × t, with P = ${fq(level.power.fan, 'W', 2)}.`);
  for (const l of level.fixedLoss ?? []) rows.push(`The ${l.part} transfers ${fq(l.joules, 'J', 2)} to the internal store.`);
  if (level.springLoss) rows.push(`The spring transfers ${fq(level.springLoss, 'J', 2)} to the internal store if you use it.`);
  for (const [m, per] of Object.entries(level.perSecondLoss ?? {})) rows.push(`The ${m} motor transfers ${fq(per, 'J', 2)} to the internal store for each second it runs.`);
  rows.push(level.target.height !== undefined
    ? `The cup is ${fq(level.target.height, 'm', 2)} up. Take g = 10 N/kg.`
    : `The gate needs a speed of ${fq(level.target.speed, 'm/s', 2)}.`);
  return `<ul class="game-parts">${rows.map((r) => `<li>${r}</li>`).join('')}</ul>`;
}

function streakBefore(levelId, answers) {
  let streak = 0;
  for (let n = levelId - 1; n >= 1; n--) {
    const a = answers[`game-${n}`];
    if (a?.correct && a.firstCorrect) streak += 1;
    else break;
  }
  return streak;
}

export function gamePage(body, page, c) {
  const level = LEVELS[page.level - 1];
  const key = `game-${level.id}`;
  const saved = c.saved?.answers?.[key];
  body.insertAdjacentHTML('beforeend', `<p class="game-story">${level.story}</p>${partsList(level)}`);
  const box = document.createElement('section');
  box.className = 'work-box';
  box.setAttribute('aria-label', 'Set up the machine');
  box.insertAdjacentHTML('beforeend', '<p class="work-goal">Do the accounts, then set the machine and launch.</p>');
  body.append(box);
  for (const [id, r] of Object.entries(level.inputs)) {
    const meta = INPUT_LABELS[id];
    createSlider(box, { label: meta.label, min: r.min, max: r.max, step: r.step, value: r.min, unit: meta.unit, sigFigs: 3 }, (v) => c.scene.setParam(id, v));
  }
  const actions = document.createElement('div');
  actions.className = 'work-actions';
  box.append(actions);
  const fb = document.createElement('div');
  fb.className = 'q-feedback';
  fb.setAttribute('role', 'status');
  fb.hidden = true;
  body.append(fb);

  let tries = saved?.attempts ?? 0;
  let won = !!saved?.correct;
  const btn = createActionButton(actions, { label: 'Launch', primary: true }, () => {
    if (won || tries >= TRIES) return;
    tries += 1;
    const streak = streakBefore(level.id, c.saved?.answers ?? {});
    const r = c.scene.launch();
    const s = score(level, c.scene.inputs, { firstTry: tries === 1, streak: streak + 1 });
    const accounts = `You put in ${fq(r.totalIn, 'J', 3)}. The parts transferred ${fq(r.totalLost, 'J', 3)} to the internal store. That left ${fq(r.atTarget, 'J', 3)} at the target, which needs ${fq(r.need, 'J', 3)}.`;
    fb.hidden = false;
    if (r.result === 'win') {
      won = true;
      fb.className = 'q-feedback is-right';
      const extras = [s.leastBonus ? 'the bonus for least input energy' : '', s.streakBonus ? `a first-time streak bonus of ${s.streakBonus}` : ''].filter(Boolean).join(' and ');
      fb.textContent = `${accounts} You scored ${s.points} points${extras ? `, including ${extras}` : ''}.`;
    } else {
      fb.className = 'q-feedback is-wrong';
      const why = r.result === 'stall' ? `It was ${fq(-r.margin, 'J', 2)} short.` : `It had ${fq(r.margin, 'J', 2)} too much.`;
      const left = TRIES - tries;
      fb.textContent = `${accounts} ${why}${left > 0 ? ` You have ${left} ${left === 1 ? 'try' : 'tries'} left.` : ''}`;
      if (tries >= TRIES) {
        const best = solve(level).least;
        const setting = Object.entries(best.inputs).map(([id, v]) => `${INPUT_LABELS[id].label.toLowerCase()} ${fq(v, INPUT_LABELS[id].unit, 3)}`).join(', ');
        fb.textContent += ` Here are the accounts that work. The target needs ${fq(best.need, 'J', 3)}, and the parts transfer ${fq(best.totalLost, 'J', 3)} to the internal store, so the machine needs ${fq(best.totalIn, 'J', 3)}. That means ${setting}.`;
      }
    }
    c.onAnswer({ id: key, response: c.scene.inputs, correct: won, attempts: tries, firstCorrect: tries === 1 && won, points: s.points });
    btn.disabled = won || tries >= TRIES;
  });
  if (won) {
    btn.disabled = true;
    fb.hidden = false;
    fb.className = 'q-feedback is-right';
    fb.textContent = `You cleared this level for ${saved.points ?? 100} points.`;
  }
}

export function winPage(body, page, c) {
  const answers = c.saved?.answers ?? {};
  let total = 0;
  let cleared = 0;
  for (const L of LEVELS) {
    const a = answers[`game-${L.id}`];
    if (a?.correct) {
      cleared += 1;
      total += a.points ?? 100;
    }
  }
  const all = cleared === LEVELS.length;
  body.insertAdjacentHTML('beforeend', `<p class="game-total">You cleared ${cleared} of ${LEVELS.length} levels and scored ${total} points.</p><p>${all ? 'Every machine balanced. You can do the accounts for any energy transfer.' : 'Go back to any level you have not cleared and do its accounts again.'}</p>`);
}
