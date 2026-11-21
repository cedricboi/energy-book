// src/lessons/l4-gpe.js
// Lesson 4. Gravitational potential energy. Syllabus 5(b): recall and apply
// Ep = mgh near the Earth's surface. Recalls g from Topic 3(d).
// Hook facts: lessons/sources.js, 'durian-fruit'.
import { gravitationalPotentialEnergy, heightFromGravitationalPotentialEnergy } from '../physics/equations.js';
import { formatQuantity } from '../physics/format.js';

const fq = formatQuantity;
const ep = (m, h) => gravitationalPotentialEnergy(m, h);
const student = { m: 50, h: 3.0 };
const lift = { m: 600, h: 20 };
const box = { m: 2.0, E: 30 };
const bridge = { m: 5000, h: 4.0 };
const durian = { m: 2.0, low: 10, high: 20 };
const exitQ = { m: 0.5, h: 1.2 };

export default {
  id: 'l4-gpe',
  title: 'Gravitational potential energy',
  syllabus: ['5(b)', '3(d)'],
  questions: ['What does the energy in a gravitational potential store depend on?', 'How do we calculate it?'],
  pages: [
    {
      type: 'hook',
      scene: 'gpe',
      title: 'Do not stand under a durian tree',
      text: [
        'A durian has a mass of 1 kg to 3 kg, and its spikes are sharp. Durian trees can grow more than 25 m tall.',
        'People are warned not to stand under durian trees when the fruit is ripe. A durian falling from high up hits much harder than one falling from low down. Why?',
      ],
    },
    {
      type: 'explore',
      scene: 'gpe',
      title: 'Height and mass',
      text: ['Put the box on different shelves, and change its mass. Watch the gravitational potential jar.'],
      goal: 'Move the box from the 0.5 m shelf to the 1.0 m shelf. Then go back and double its mass instead. What happens to the energy each time?',
      controls: ['shelf', 'mass'],
      cue: 'box',
    },
    {
      type: 'name',
      scene: 'gpe',
      title: 'Gravitational potential energy',
      term: ['gpe', 'g'],
      steps: [
        'Doubling the height doubled the energy. Doubling the mass doubled it too.',
        'You met the gravitational field strength, g, in forces. Near the Earth\'s surface, g = 10 N/kg.',
        'Gravitational potential energy, Ep = mgh, where m is the mass in kg, g is 10 N/kg and h is the height in m. Ep is in joules (J).',
      ],
    },
    {
      type: 'use',
      equations: [{ html: 'E<sub>p</sub> = mgh', words: 'gravitational potential energy = mass × gravitational field strength × height' }],
      scene: 'gpe',
      title: 'Climbing the stairs',
      question: {
        id: 'l4-q1',
        type: 'numeric',
        prompt: `A student of mass ${fq(student.m, 'kg')} climbs stairs to a floor ${fq(student.h, 'm', 2)} higher. Take g = 10 N/kg. How much energy does her gravitational potential store gain?`,
        answer: ep(student.m, student.h),
        unit: 'J',
        units: ['J', 'N', 'kg', 'm'],
        mistakes: [
          { id: 'no-g', value: student.m * student.h, feedback: 'You left out g. Ep = mgh, so multiply by 10 N/kg as well.' },
          { id: 'weight', value: student.m * 10, feedback: 'That is her weight in newtons. Multiply by the height too.' },
        ],
        correctFeedback: `Right. Ep = ${student.m} × 10 × ${student.h.toFixed(1)} = ${fq(ep(student.m, student.h), 'J')}.`,
      },
    },
    {
      type: 'use',
      scene: 'gpe',
      title: 'A lift',
      question: {
        id: 'l4-q2',
        type: 'numeric',
        prompt: `A lift car of mass ${fq(lift.m, 'kg')} rises ${fq(lift.h, 'm')}. Take g = 10 N/kg. How much energy does its gravitational potential store gain?`,
        answer: ep(lift.m, lift.h),
        unit: 'J',
        units: ['J', 'N', 'kg', 'm'],
        mistakes: [{ id: 'no-g', value: lift.m * lift.h, feedback: 'You left out g. Multiply by 10 N/kg as well.' }],
        correctFeedback: `Right. Ep = ${lift.m} × 10 × ${lift.h} = ${fq(ep(lift.m, lift.h), 'J')}.`,
      },
    },
    {
      type: 'check',
      scene: 'gpe',
      title: 'How high?',
      question: {
        id: 'l4-q3',
        type: 'numeric',
        prompt: `A ${fq(box.m, 'kg', 2)} box gains ${fq(box.E, 'J')} in its gravitational potential store when it is lifted. Take g = 10 N/kg. How high was it lifted?`,
        answer: heightFromGravitationalPotentialEnergy(box.E, box.m),
        unit: 'm',
        units: ['m', 'J', 'kg'],
        mistakes: [
          { id: 'times', value: box.E * box.m * 10, feedback: 'You multiplied. To find h, divide Ep by m and by g: h = Ep ÷ (mg).' },
          { id: 'no-g', value: box.E / box.m, feedback: 'You divided by the mass only. Divide by g as well.' },
          { id: 'no-m', value: box.E / 10, feedback: 'You divided by g only. Divide by the mass as well.' },
        ],
        correctFeedback: `Right. h = ${box.E} ÷ (${box.m.toFixed(1)} × 10) = ${fq(heightFromGravitationalPotentialEnergy(box.E, box.m), 'm', 2)}.`,
      },
    },
    {
      type: 'check',
      scene: 'gpe',
      title: 'A drawbridge',
      question: {
        id: 'l4-q4',
        type: 'numeric',
        prompt: `The middle of a drawbridge has a mass of ${fq(bridge.m, 'kg')}. It is raised ${fq(bridge.h, 'm', 2)}. Take g = 10 N/kg. How much energy does its gravitational potential store gain?`,
        answer: ep(bridge.m, bridge.h),
        unit: 'J',
        units: ['J', 'N', 'kg', 'm'],
        mistakes: [{ id: 'no-g', value: bridge.m * bridge.h, feedback: 'You left out g. Multiply by 10 N/kg as well.' }],
        correctFeedback: `Right. Ep = ${bridge.m} × 10 × ${bridge.h.toFixed(1)} = ${fq(ep(bridge.m, bridge.h), 'J')}.`,
      },
    },
    {
      type: 'check',
      scene: 'gpe',
      title: 'Twice as high',
      question: {
        id: 'l4-q5',
        type: 'mcq',
        prompt: 'A bag is moved from a shelf 1.0 m high to a shelf 2.0 m high. What happens to the energy in its gravitational potential store?',
        options: [
          { id: 'same', text: 'It stays the same.', feedback: 'The bag is higher, so its gravitational potential store must change.' },
          { id: 'double', text: 'It becomes twice as large.', correct: true, feedback: 'Right. Ep = mgh, so twice the height gives twice the energy.' },
          { id: 'four', text: 'It becomes four times as large.', feedback: 'Height is not squared in Ep = mgh. Only speed is squared, in Ek = ½mv².' },
          { id: 'half', text: 'It becomes half as large.', feedback: 'Higher means more energy in the gravitational potential store, not less.' },
        ],
      },
    },
    {
      type: 'use',
      scene: 'gpe',
      title: 'Back to the durians',
      question: {
        id: 'l4-q6',
        type: 'numeric',
        prompt: `A ${fq(durian.m, 'kg', 2)} durian hangs ${fq(durian.high, 'm')} above the ground. Another hangs ${fq(durian.low, 'm')} up. Take g = 10 N/kg. How much more energy is in the higher durian's gravitational potential store?`,
        answer: ep(durian.m, durian.high) - ep(durian.m, durian.low),
        unit: 'J',
        units: ['J', 'N', 'kg', 'm'],
        mistakes: [
          { id: 'high-only', value: ep(durian.m, durian.high), feedback: 'That is the energy of the higher durian. Subtract the energy of the lower one.' },
          { id: 'no-g', value: durian.m * (durian.high - durian.low), feedback: 'You left out g. Multiply by 10 N/kg as well.' },
        ],
        correctFeedback: `Right. ${fq(ep(durian.m, durian.high), 'J')} − ${fq(ep(durian.m, durian.low), 'J')} = ${fq(ep(durian.m, durian.high) - ep(durian.m, durian.low), 'J')}. The higher durian has twice the energy, so it hits much harder.`,
      },
    },
    {
      type: 'notes',
      scene: 'gpe',
      title: 'Notes. The units',
      question: {
        id: 'l4-n1',
        type: 'cloze',
        prompt: 'Complete the units box for Ep = mgh.',
        text: '<table class="ledger-table"><tr><th>Ep, gravitational potential energy</th><td>{a}</td></tr><tr><th>m, mass</th><td>{b}</td></tr><tr><th>g, gravitational field strength</th><td>{c}</td></tr><tr><th>h, height</th><td>{d}</td></tr></table>',
        bank: ['J', 'kg', 'N/kg', 'm', 'N', 'W'],
        blanks: [
          { id: 'a', answer: 'J' },
          { id: 'b', answer: 'kg' },
          { id: 'c', answer: 'N/kg' },
          { id: 'd', answer: 'm', hint: 'Height is a length, so it is measured in metres.' },
        ],
      },
    },
    {
      type: 'exit',
      scene: 'gpe',
      title: "Back to today's questions",
      questions: [
        {
          id: 'l4-x1',
          type: 'short',
          prompt: 'What does the energy in a gravitational potential store depend on?',
          minWords: 8,
          keyIdeas: [
            { any: ['mass'], hint: 'Name the first quantity.' },
            { any: ['height', 'high'], hint: 'Name the second quantity.' },
          ],
          model: 'It depends on the mass of the object, its height and the gravitational field strength, g.',
        },
        {
          id: 'l4-x2',
          type: 'numeric',
          prompt: `A ${fq(exitQ.m, 'kg', 2)} ball is lifted ${fq(exitQ.h, 'm', 2)} onto a table. Take g = 10 N/kg. Calculate the gain in its gravitational potential store.`,
          answer: ep(exitQ.m, exitQ.h),
          unit: 'J',
          units: ['J', 'N', 'kg', 'm'],
          mistakes: [{ id: 'no-g', value: exitQ.m * exitQ.h, feedback: 'You left out g. Multiply by 10 N/kg as well.' }],
          correctFeedback: `Right. Ep = ${exitQ.m} × 10 × ${exitQ.h} = ${fq(ep(exitQ.m, exitQ.h), 'J')}.`,
        },
      ],
    },
  ],
};
