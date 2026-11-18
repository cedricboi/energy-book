// src/lessons/l6-bounce.js
// Lesson 6. Why a bouncing ball stops. Syllabus 5(a), 5(c) applied to new
// situations, 9(b) waves transfer energy. Tennis ball rebound: sources.js.
// Also holds the "energy in equals energy out" device ledger moved here
// from the old Lesson 9 (efficiency is not in the syllabus).
import { gravitationalPotentialEnergy } from '../physics/equations.js';
import { formatQuantity } from '../physics/format.js';
import { BALLS } from '../physics/models/bounce.js';

const fq = formatQuantity;
const ep = gravitationalPotentialEnergy;
const superball = { m: 0.02, h1: 1.2, h2: 0.9 };
const lamp = { input: 60, light: 6 };
const notesBall = { m: 0.05, h: 1.0, keep: BALLS.tennis.keep };
const nTop = ep(notesBall.m, notesBall.h);
const nBounce = ep(notesBall.m, notesBall.h * notesBall.keep);
const exitBall = { m: 0.6, h1: 1.5, h2: 0.9 };

export default {
  id: 'l6-bounce',
  title: 'Why a bouncing ball stops',
  syllabus: ['5(a)', '5(c)', '9(b)'],
  questions: ['If energy is conserved, why does a bouncing ball stop?', 'Where does the energy end up?'],
  pages: [
    {
      type: 'hook',
      scene: 'bounce',
      title: 'Lower every time',
      text: [
        'Drop a ball and it bounces lower each time, until it stops.',
        'A ball that bounced back to the same height every time would never stop. Energy is never destroyed, so why does that never happen?',
      ],
      sceneState: { ball: 'tennis', height: 1.0 },
    },
    {
      type: 'predict',
      scene: 'bounce',
      title: 'Predict the first bounce',
      text: ['You have bounced a tennis ball before. Think about how high it comes back.'],
      question: {
        id: 'l6-p1',
        prompt: 'You drop a tennis ball from 1.0 m onto a hard floor. How high will it bounce?',
        options: [
          { id: 'higher', text: 'Higher than 1.0 m.' },
          { id: 'same', text: 'About 1.0 m.' },
          { id: 'half', text: 'About half of 1.0 m.' },
          { id: 'none', text: 'Hardly at all.' },
        ],
        reasonPrompt: 'Give your reason in a full sentence.',
      },
      after: ['Now drop it and read the height of the first bounce on the metre rule.'],
      goal: 'Press "Drop the ball". Watch the first bounce against the metre rule.',
      actions: ['drop', 'reset'],
      cue: 'ball',
      sceneState: { ball: 'tennis', height: 1.0 },
    },
    {
      type: 'explore',
      scene: 'bounce',
      title: 'Follow one bounce',
      text: ['Try each ball. Use "Step" to move through one squash slowly.'],
      goal: 'Drop each ball. Then step through one squash. Watch the elastic potential jar and the internal jar.',
      controls: ['ball', 'height'],
      actions: ['drop', 'step', 'reset'],
      note: 'Shown four times slower than real life.',
    },
    {
      type: 'name',
      scene: 'bounce',
      title: 'Where the energy goes',
      term: ['elastic-store', 'surroundings'],
      steps: [
        'As the ball squashes, energy goes into its elastic potential store. As it springs back, the energy returns to its kinetic store.',
        'But not all of it comes back. Some is transferred to the internal store of the ball and the floor.',
        'Some is carried away by sound, by propagation of waves. It also ends in the internal store of the surroundings.',
        'The dark line on the ledger never moves. No energy is destroyed. It is spread out where it cannot lift the ball again.',
      ],
    },
    {
      type: 'use',
      scene: 'bounce',
      title: 'A swinging pendulum',
      question: {
        id: 'l6-q1',
        type: 'mcq',
        prompt: 'A pendulum swings lower and lower until it stops. Where has its energy gone?',
        options: [
          { id: 'destroyed', text: 'It has been destroyed by air resistance.', feedback: 'Energy cannot be destroyed. Air resistance transfers it somewhere.' },
          { id: 'gpe', text: 'It is still in its gravitational potential store.', feedback: 'The pendulum hangs at its lowest point, so its gravitational potential store is at its smallest.' },
          { id: 'internal', text: 'It is in the internal store of the surroundings.', correct: true, feedback: 'Right. Air resistance and friction at the pivot transferred it to the internal store of the air and the pivot.' },
          { id: 'kinetic', text: 'It is still in its kinetic store.', feedback: 'The pendulum has stopped, so its kinetic store is empty.' },
        ],
      },
    },
    {
      type: 'use',
      scene: 'bounce',
      title: 'A trampoline',
      question: {
        id: 'l6-q2',
        type: 'short',
        prompt: 'A girl on a trampoline keeps bouncing to the same height. Explain why she has to push with her legs on every bounce.',
        minWords: 14,
        keyIdeas: [
          { any: ['internal', 'surroundings', 'sound', 'heat'], hint: 'Say where some energy goes on each bounce.' },
          { any: ['chemical', 'muscle', 'muscles'], hint: 'Say where the extra energy comes from.' },
          { any: ['replace', 'replaces', 'make up', 'add', 'adds', 'extra', 'more'], hint: 'Say what her push does about the energy that was lost.' },
        ],
        model: 'On each bounce some energy is transferred to the internal store of the trampoline and the surroundings, and some leaves as sound. Her push transfers extra energy from the chemical potential store of her muscles. This replaces what was lost, so she reaches the same height.',
      },
    },
    {
      type: 'check',
      scene: 'bounce',
      title: 'Do the accounts',
      question: {
        id: 'l6-q3',
        type: 'numeric',
        prompt: `A ${fq(superball.m, 'kg', 2)} superball is dropped from ${fq(superball.h1, 'm', 2)} and bounces back to ${fq(superball.h2, 'm', 2)}. Take g = 10 N/kg. How much energy was transferred to the internal store of the surroundings in that bounce?`,
        answer: ep(superball.m, superball.h1) - ep(superball.m, superball.h2),
        unit: 'J',
        units: ['J', 'N', 'm'],
        mistakes: [
          { id: 'start', value: ep(superball.m, superball.h1), feedback: 'That is all the energy it started with. Subtract what it still has at the top of the bounce.' },
          { id: 'end', value: ep(superball.m, superball.h2), feedback: 'That is what it still has at the top of the bounce. The rest went to the internal store.' },
          { id: 'no-g', value: superball.m * (superball.h1 - superball.h2), feedback: 'You left out g. Use Ep = mgh for each height.' },
        ],
        correctFeedback: `Right. ${fq(ep(superball.m, superball.h1), 'J', 2)} − ${fq(ep(superball.m, superball.h2), 'J', 2)} = ${fq(ep(superball.m, superball.h1) - ep(superball.m, superball.h2), 'J', 2)}.`,
      },
    },
    {
      type: 'check',
      scene: 'bounce',
      title: 'Energy in, energy out',
      question: {
        id: 'l6-q4',
        type: 'numeric',
        prompt: `A lamp receives ${fq(lamp.input, 'J')} electrically every second. It gives out ${fq(lamp.light, 'J')} each second as light. How much energy goes to the internal store of the lamp and the surroundings each second?`,
        answer: lamp.input - lamp.light,
        unit: 'J',
        units: ['J', 'W', 'N'],
        mistakes: [
          { id: 'added', value: lamp.input + lamp.light, feedback: 'You added them. Energy in equals energy out, so subtract the light from what goes in.' },
          { id: 'light', value: lamp.light, feedback: 'That is the energy given out as light. The question asks for the rest.' },
          { id: 'input', value: lamp.input, feedback: 'That is all the energy that goes in. Some of it leaves as light.' },
        ],
        correctFeedback: `Right. ${fq(lamp.input, 'J')} in = ${fq(lamp.light, 'J')} as light + ${fq(lamp.input - lamp.light, 'J')} to the internal store. Energy in equals energy out.`,
      },
    },
    {
      type: 'use',
      scene: 'bounce',
      title: 'Back to the bouncing ball',
      question: {
        id: 'l6-q5',
        type: 'short',
        prompt: 'Answer the question from the start. If energy is conserved, why does a bouncing ball stop?',
        minWords: 14,
        keyIdeas: [
          { any: ['internal store of the surroundings', 'internal', 'surroundings'], hint: 'Use the phrase "internal store of the surroundings".' },
          { any: ['sound', 'wave', 'waves'], hint: 'Say what carries some energy away from each bounce.' },
          { any: ['not destroyed', 'conserved', 'total', 'same'], hint: 'Say what happens to the total energy.' },
        ],
        model: 'On every bounce, some energy is transferred to the internal store of the surroundings, and some is carried away as sound waves. Less is left to lift the ball, so each bounce is lower. The energy is not destroyed. The total stays the same, but it ends up spread out in the internal store of the surroundings.',
      },
    },
    {
      type: 'notes',
      scene: 'bounce',
      title: 'Notes. A bounce ledger',
      hideValues: true,
      question: {
        id: 'l6-n1',
        type: 'cloze',
        prompt: `A ${fq(notesBall.m, 'kg', 2)} ball is dropped from ${fq(notesBall.h, 'm', 2)} and bounces to ${fq(notesBall.h * notesBall.keep, 'm', 2)}. Take g = 10 N/kg. Complete its ledger in joules.`,
        text: '<table class="ledger-table"><tr><th>Start, gravitational potential</th><td>{a}</td></tr><tr><th>Just before it hits, kinetic</th><td>{b}</td></tr><tr><th>Top of the bounce, gravitational potential</th><td>{c}</td></tr><tr><th>Internal store of the surroundings</th><td>{d}</td></tr></table>',
        bank: [fq(nTop, 'J', 2), fq(nBounce, 'J', 2), fq(nTop - nBounce, 'J', 2), fq(nTop + nBounce, 'J', 2), fq(0, 'J')],
        blanks: [
          { id: 'a', answer: fq(nTop, 'J', 2) },
          { id: 'b', answer: fq(nTop, 'J', 2), hint: 'As it falls, all of the gravitational potential energy goes to the kinetic store.' },
          { id: 'c', answer: fq(nBounce, 'J', 2) },
          { id: 'd', answer: fq(nTop - nBounce, 'J', 2), hint: 'The total stays the same, so subtract what is left from the start.' },
        ],
      },
    },
    {
      type: 'exit',
      scene: 'bounce',
      title: "Back to today's questions",
      questions: [
        {
          id: 'l6-x1',
          type: 'mcq',
          prompt: 'Which statement explains why a bouncing ball stops?',
          options: [
            { id: 'destroyed', text: 'Energy is destroyed on each bounce.', feedback: 'Energy is never destroyed.' },
            { id: 'spread', text: 'Energy is transferred to the internal store of the surroundings on each bounce.', correct: true, feedback: 'Right. The energy is still there, but spread out where it cannot lift the ball.' },
            { id: 'used', text: 'Energy is used up by the ball on each bounce.', feedback: 'Energy is not used up. It is transferred to another store.' },
            { id: 'gravity', text: 'Energy is pulled back down by gravity on each bounce.', feedback: 'Gravity swaps energy between stores but does not remove it.' },
          ],
        },
        {
          id: 'l6-x2',
          type: 'numeric',
          prompt: `A ${fq(exitBall.m, 'kg', 2)} basketball is dropped from ${fq(exitBall.h1, 'm', 2)} and bounces to ${fq(exitBall.h2, 'm', 2)}. Take g = 10 N/kg. How much energy ends up in the internal store of the surroundings?`,
          answer: ep(exitBall.m, exitBall.h1) - ep(exitBall.m, exitBall.h2),
          unit: 'J',
          units: ['J', 'N', 'm'],
          mistakes: [
            { id: 'start', value: ep(exitBall.m, exitBall.h1), feedback: 'That is the energy at the start. Subtract what is left at the top of the bounce.' },
            { id: 'no-g', value: exitBall.m * (exitBall.h1 - exitBall.h2), feedback: 'You left out g.' },
          ],
          correctFeedback: `Right. ${fq(ep(exitBall.m, exitBall.h1), 'J', 2)} − ${fq(ep(exitBall.m, exitBall.h2), 'J', 2)} = ${fq(ep(exitBall.m, exitBall.h1) - ep(exitBall.m, exitBall.h2), 'J', 2)}.`,
        },
      ],
    },
  ],
};
