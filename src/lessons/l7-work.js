// src/lessons/l7-work.js
// Lesson 7. Work done. Syllabus 5(d): work done = force × distance moved in
// the direction of the force. Written W = F × d, as in the teacher's notes.
// Recalls weight = mass × g from Topic 3(e). Links back to Lesson 3 braking.
import { workDone, distanceFromWorkDone, weight } from '../physics/equations.js';
import { formatQuantity } from '../physics/format.js';

const fq = formatQuantity;
const trolley = { F: 40, d: 6.0 };
const lift = { m: 50, d: 5.0 };
const stuck = { F: 300 };
const slope = { W: 1200, F: 240 };
const brake = { F: 6000, E: 90000 };
const notes = { F: 25, d: 4.0 };
const exitQ = { F: 150, d: 2.0 };

export default {
  id: 'l7-work',
  title: 'Work done',
  syllabus: ['5(d)', '3(e)'],
  questions: ['When is work done on an object?', 'How do we calculate it?'],
  pages: [
    {
      type: 'hook',
      scene: 'work',
      title: 'Ten minutes of holding still',
      text: [
        'A student holds a heavy school bag perfectly still for ten minutes. Her arms ache and she is exhausted.',
        'Yet a physicist says she did no work on the bag at all. How can that be?',
      ],
      sceneState: { target: 'crate', force: 100, distance: 3 },
    },
    {
      type: 'explore',
      scene: 'work',
      title: 'Push the crate, then the wall',
      beats: [
        { say: 'A person stands ready to push a crate across the floor.', shot: 'person', seconds: 3 },
        { say: 'One jar shows the chemical potential store of the person. The other shows the internal store.', shot: 'jars', seconds: 4 },
        { say: 'Your turn. Tap the person, or press Push.' },
      ],
      text: ['The person pushes the crate at a steady speed. Friction with the floor warms the crate and the floor.'],
      goal: 'Push the crate with different forces and distances. Then choose the wall and push it as hard as you can.',
      controls: ['target', 'force', 'distance'],
      actions: ['push', 'reset'],
      cue: 'person',
    },
    {
      type: 'name',
      scene: 'work',
      title: 'Work done',
      term: ['work-done', 'joule'],
      steps: [
        'Energy was transferred only when the crate moved. Pushing the wall moved nothing, and nothing was transferred.',
        'Work done = force × distance moved in the direction of the force. We write W = F × d.',
        'Work done is measured in joules. 1 J is the work done when a force of 1 N moves an object 1 m, so 1 J = 1 N m.',
        'Work done equals the energy transferred mechanically.',
      ],
    },
    {
      type: 'use',
      equations: [{ html: 'W = F × d', words: 'work done = force × distance moved in the direction of the force' }],
      scene: 'work',
      title: 'A shopping trolley',
      question: {
        id: 'l7-q1',
        type: 'numeric',
        prompt: `A shopper pushes a trolley with a force of ${fq(trolley.F, 'N')} for ${fq(trolley.d, 'm', 2)}. How much work is done on the trolley?`,
        answer: workDone(trolley.F, trolley.d),
        unit: 'J',
        units: ['J', 'N', 'm', 'W'],
        mistakes: [
          { id: 'divide', value: trolley.F / trolley.d, feedback: 'You divided. Work done = force × distance, so multiply.' },
          { id: 'add', value: trolley.F + trolley.d, feedback: 'You added. Work done = force × distance, so multiply.' },
        ],
        correctFeedback: `Right. W = ${trolley.F} × ${trolley.d.toFixed(1)} = ${fq(workDone(trolley.F, trolley.d), 'J')}.`,
      },
    },
    {
      type: 'use',
      scene: 'work',
      title: 'Lifting a load',
      question: {
        id: 'l7-q2',
        type: 'numeric',
        prompt: `A worker lifts a ${fq(lift.m, 'kg')} sack straight up through ${fq(lift.d, 'm', 2)} at a steady speed. Take g = 10 N/kg. How much work does she do on the sack?`,
        answer: workDone(weight(lift.m), lift.d),
        unit: 'J',
        units: ['J', 'N', 'm', 'W'],
        mistakes: [
          { id: 'mass', value: lift.m * lift.d, feedback: 'You used the mass as the force. The force needed is the weight, mass × g.' },
          { id: 'weight', value: weight(lift.m), feedback: 'That is the weight, the force. Multiply by the distance too.' },
        ],
        correctFeedback: `Right. The force is the weight, ${fq(weight(lift.m), 'N')}. W = ${weight(lift.m)} × ${lift.d.toFixed(1)} = ${fq(workDone(weight(lift.m), lift.d), 'J')}.`,
      },
    },
    {
      type: 'check',
      scene: 'work',
      title: 'A car that will not move',
      question: {
        id: 'l7-q3',
        type: 'numeric',
        prompt: `Two friends push a stuck car with a total force of ${fq(stuck.F, 'N')}. The car does not move at all. How much work do they do on the car?`,
        answer: 0,
        unit: 'J',
        units: ['J', 'N', 'm', 'W'],
        mistakes: [{ id: 'force', value: stuck.F, feedback: 'That is the force. The car moved 0 m, so work done = force × 0.' }],
        correctFeedback: 'Right. The distance moved is zero, so the work done on the car is zero.',
      },
    },
    {
      type: 'check',
      scene: 'work',
      title: 'How far?',
      question: {
        id: 'l7-q4',
        type: 'numeric',
        prompt: `A force of ${fq(slope.F, 'N')} does ${fq(slope.W, 'J')} of work pushing a box up a slope. How far does the box move along the slope?`,
        answer: distanceFromWorkDone(slope.W, slope.F),
        unit: 'm',
        units: ['m', 'J', 'N'],
        mistakes: [
          { id: 'times', value: slope.W * slope.F, feedback: 'You multiplied. To find d, divide the work done by the force.' },
          { id: 'upside', value: slope.F / slope.W, feedback: 'You divided the wrong way round. d = W ÷ F.' },
        ],
        correctFeedback: `Right. d = ${slope.W} ÷ ${slope.F} = ${fq(distanceFromWorkDone(slope.W, slope.F), 'm')}.`,
      },
    },
    {
      type: 'check',
      scene: 'work',
      title: 'Braking, again',
      question: {
        id: 'l7-q5',
        type: 'numeric',
        prompt: `A car has ${fq(brake.E, 'J')} in its kinetic store. Its brakes push back with a steady force of ${fq(brake.F, 'N')}. How far does it travel while it brakes to a stop?`,
        answer: distanceFromWorkDone(brake.E, brake.F),
        unit: 'm',
        units: ['m', 'J', 'N'],
        mistakes: [
          { id: 'times', value: brake.E * brake.F, feedback: 'You multiplied. The brakes do work equal to the kinetic energy, so d = W ÷ F.' },
          { id: 'upside', value: brake.F / brake.E, feedback: 'You divided the wrong way round. d = W ÷ F.' },
        ],
        correctFeedback: `Right. The brakes must do ${fq(brake.E, 'J')} of work. d = ${brake.E} ÷ ${brake.F} = ${fq(distanceFromWorkDone(brake.E, brake.F), 'm')}.`,
      },
    },
    {
      type: 'check',
      scene: 'work',
      title: 'Four times the energy',
      question: {
        id: 'l7-q6',
        type: 'mcq',
        prompt: 'In Lesson 3, doubling a car\'s speed gave it four times the kinetic energy. With the same braking force, how does its braking distance change?',
        options: [
          { id: 'same', text: 'It stays the same, because the force is the same.', feedback: 'The force is the same, but the brakes must do more work, so they need more distance.' },
          { id: 'double', text: 'It doubles, because the speed doubles.', feedback: 'The work the brakes do depends on the energy, not the speed. The energy is four times as large.' },
          { id: 'four', text: 'It becomes four times as long, because four times the energy must be removed.', correct: true, feedback: 'Right. W = F × d. Four times the work with the same force needs four times the distance.' },
          { id: 'half', text: 'It halves, because the car is faster.', feedback: 'A faster car needs more distance to stop, not less.' },
        ],
      },
    },
    {
      type: 'use',
      scene: 'work',
      title: 'Back to the school bag',
      question: {
        id: 'l7-q7',
        type: 'short',
        prompt: 'Explain why the student did no work on the bag while she held it still, even though she was tired.',
        minWords: 14,
        keyIdeas: [
          { any: ['distance', 'did not move', 'does not move', 'not move', 'still', 'zero', '0 m'], hint: 'Say how far the bag moved.' },
          { any: ['work done', 'force times distance', 'force multiplied'], hint: 'Use the equation for work done.' },
        ],
        model: 'The bag did not move, so the distance moved in the direction of the force was zero. Work done = force × distance, so the work done on the bag was zero. She felt tired because her muscles were working inside her body, not because she did work on the bag.',
      },
    },
    {
      type: 'notes',
      scene: 'work',
      title: 'Notes. A worked example',
      hideValues: true,
      question: {
        id: 'l7-n1',
        type: 'cloze',
        prompt: `A force of ${fq(notes.F, 'N')} pulls a sled ${fq(notes.d, 'm', 2)}. Fill in the steps.`,
        text: '<table class="ledger-table"><tr><th>Equation</th><td>W = {a}</td></tr><tr><th>Substitute</th><td>W = {b} × {c}</td></tr><tr><th>Answer</th><td>W = {d}</td></tr></table>',
        bank: ['F × d', 'F ÷ d', '25', '4', fq(workDone(notes.F, notes.d), 'J'), fq(workDone(notes.F, notes.d), 'N'), '6.25 J'],
        blanks: [
          { id: 'a', answer: 'F × d' },
          { id: 'b', answer: '25', accept: ['4'] },
          { id: 'c', answer: '4', accept: ['25'] },
          { id: 'd', answer: fq(workDone(notes.F, notes.d), 'J'), hint: 'Work done is in joules, not newtons.' },
        ],
      },
    },
    {
      type: 'exit',
      scene: 'work',
      title: "Back to today's questions",
      questions: [
        {
          id: 'l7-x1',
          type: 'mcq',
          prompt: 'In which case is work done on the object?',
          options: [
            { id: 'hold', text: 'A boy holds a box still above his head.', feedback: 'The box does not move, so no work is done on it.' },
            { id: 'push', text: 'A girl pushes a box 2 m across the floor.', correct: true, feedback: 'Right. A force moves the box a distance in the direction of the force.' },
            { id: 'wall', text: 'A man pushes hard against a wall.', feedback: 'The wall does not move, so no work is done on it.' },
            { id: 'sit', text: 'A cat sits on a box.', feedback: 'The box does not move, so no work is done on it.' },
          ],
        },
        {
          id: 'l7-x2',
          type: 'numeric',
          prompt: `A force of ${fq(exitQ.F, 'N')} moves a crate ${fq(exitQ.d, 'm', 2)} in the direction of the force. Calculate the work done.`,
          answer: workDone(exitQ.F, exitQ.d),
          unit: 'J',
          units: ['J', 'N', 'm', 'W'],
          mistakes: [{ id: 'divide', value: exitQ.F / exitQ.d, feedback: 'You divided. Multiply the force by the distance.' }],
          correctFeedback: `Right. W = ${exitQ.F} × ${exitQ.d.toFixed(1)} = ${fq(workDone(exitQ.F, exitQ.d), 'J')}.`,
        },
      ],
    },
  ],
};
