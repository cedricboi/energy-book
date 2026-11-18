// src/lessons/l3-kinetic.js
// Lesson 3. Kinetic energy. Syllabus 5(b): recall and apply Ek = ½mv².
// Hook figures: UK Highway Code (see lessons/sources.js, 'braking-distance').
import { kineticEnergy, speedFromKineticEnergy } from '../physics/equations.js';
import { formatQuantity } from '../physics/format.js';
import { SOURCES } from './sources.js';

const fq = formatQuantity;
const cyclist = { m: 70, v: 5.0 };
const netball = { m: 0.45, v: 12 };
const bus = { m: 12000, v: 10 };
const ball = { m: 2.0, E: 25 };
const notes = { m: 0.4, v: 3.0 };
const exitQ = { m: 60, v: 4.0 };
const ek = (o) => kineticEnergy(o.m, o.v);
const noSquare = (o) => 0.5 * o.m * o.v;
const noHalf = (o) => o.m * o.v * o.v;

export default {
  id: 'l3-kinetic',
  title: 'Kinetic energy',
  syllabus: ['5(b)'],
  questions: ['What does the energy in a kinetic store depend on?', 'How do we calculate it?'],
  pages: [
    {
      type: 'hook',
      scene: 'kinetic',
      title: 'Twice as fast, four times as far',
      text: [
        'A car travelling at 48 km/h needs about 14 m to brake to a stop. At 97 km/h, about twice the speed, it needs about 55 m.',
        'Twice the speed needs about four times the distance. Why so much more?',
      ],
      note: `Braking distances from ${SOURCES['braking-distance'].source.split(',')[0]}.`,
    },
    {
      type: 'explore',
      scene: 'kinetic',
      title: 'What does it depend on?',
      text: ['The car rolls into soft clay. A bigger dent means more energy was in its kinetic store.'],
      goal: 'Roll the car. Double the mass and roll it again. Then double the speed instead. Compare the energy.',
      controls: ['mass', 'speed'],
      actions: ['run', 'reset'],
      cue: 'car',
      note: 'Shown ten times slower than real life.',
    },
    {
      type: 'name',
      scene: 'kinetic',
      title: 'Kinetic energy',
      term: 'kinetic-energy',
      steps: [
        'Doubling the mass doubled the energy in the kinetic store.',
        'Doubling the speed made it four times as large. The energy depends on the speed squared.',
        'Kinetic energy, Ek = ½mv², where m is the mass in kg and v is the speed in m/s. Ek is in joules (J).',
      ],
    },
    {
      type: 'use',
      scene: 'kinetic',
      title: 'A cyclist',
      question: {
        id: 'l3-q1',
        type: 'numeric',
        prompt: `A cyclist and her bicycle have a total mass of ${fq(cyclist.m, 'kg')}. She rides at ${fq(cyclist.v, 'm/s', 2)}. How much energy is in her kinetic store?`,
        answer: ek(cyclist),
        unit: 'J',
        units: ['J', 'N', 'W', 'kg'],
        mistakes: [
          { id: 'no-square', value: noSquare(cyclist), feedback: 'You did not square the speed. Square v first: v² = 5.0 × 5.0.' },
          { id: 'no-half', value: noHalf(cyclist), feedback: 'You forgot the half in Ek = ½mv².' },
        ],
        correctFeedback: `Right. Ek = ½ × ${cyclist.m} × ${cyclist.v.toFixed(1)}² = ${fq(ek(cyclist), 'J')}.`,
      },
    },
    {
      type: 'use',
      scene: 'kinetic',
      title: 'A netball',
      question: {
        id: 'l3-q2',
        type: 'numeric',
        prompt: `A netball of mass ${fq(netball.m, 'kg', 2)} is thrown at ${fq(netball.v, 'm/s')}. How much energy is in its kinetic store?`,
        answer: ek(netball),
        unit: 'J',
        units: ['J', 'N', 'W', 'kg'],
        mistakes: [
          { id: 'no-square', value: noSquare(netball), feedback: 'You did not square the speed. Square v before you multiply.' },
          { id: 'no-half', value: noHalf(netball), feedback: 'You forgot the half in Ek = ½mv².' },
        ],
        correctFeedback: `Right. Ek = ½ × ${netball.m} × ${netball.v}² = ${fq(ek(netball), 'J')}.`,
      },
    },
    {
      type: 'check',
      scene: 'kinetic',
      title: 'A bus',
      question: {
        id: 'l3-q3',
        type: 'numeric',
        prompt: `A bus of mass ${fq(bus.m, 'kg')} travels at ${fq(bus.v, 'm/s')}. How much energy is in its kinetic store?`,
        answer: ek(bus),
        unit: 'J',
        units: ['J', 'N', 'W', 'kg'],
        mistakes: [
          { id: 'no-square', value: noSquare(bus), feedback: 'You did not square the speed. Square v first: v² = 10 × 10.' },
          { id: 'no-half', value: noHalf(bus), feedback: 'You forgot the half in Ek = ½mv².' },
        ],
        correctFeedback: `Right. Ek = ½ × ${bus.m} × ${bus.v}² = ${fq(ek(bus), 'J')}.`,
      },
    },
    {
      type: 'check',
      scene: 'kinetic',
      title: 'Double the speed',
      question: {
        id: 'l3-q4',
        type: 'mcq',
        prompt: 'A car speeds up from 10 m/s to 20 m/s. What happens to the energy in its kinetic store?',
        options: [
          { id: 'same', text: 'It stays the same.', feedback: 'The car is moving faster, so its kinetic store must change.' },
          { id: 'double', text: 'It becomes twice as large.', feedback: 'That would be true if Ek depended on v. It depends on v², so think about 2².' },
          { id: 'four', text: 'It becomes four times as large.', correct: true, feedback: 'Right. Ek depends on v². Doubling v multiplies v² by 2 × 2 = 4.' },
          { id: 'half', text: 'It becomes half as large.', feedback: 'Faster means more energy in the kinetic store, not less.' },
        ],
      },
    },
    {
      type: 'check',
      scene: 'kinetic',
      title: 'Work backwards',
      question: {
        id: 'l3-q5',
        type: 'numeric',
        prompt: `A ball of mass ${fq(ball.m, 'kg', 2)} has ${fq(ball.E, 'J')} in its kinetic store. How fast is it moving?`,
        answer: speedFromKineticEnergy(ball.E, ball.m),
        unit: 'm/s',
        units: ['m/s', 'J', 'kg'],
        mistakes: [
          { id: 'no-root', value: (2 * ball.E) / ball.m, feedback: 'You found v² but did not take the square root.' },
          { id: 'no-two', value: Math.sqrt(ball.E / ball.m), feedback: 'You left out the 2. From Ek = ½mv², v² = 2Ek ÷ m.' },
        ],
        correctFeedback: `Right. v² = 2 × ${ball.E} ÷ ${ball.m.toFixed(1)} = ${(2 * ball.E) / ball.m}, so v = ${fq(speedFromKineticEnergy(ball.E, ball.m), 'm/s', 2)}.`,
      },
    },
    {
      type: 'use',
      scene: 'kinetic',
      title: 'Back to braking',
      question: {
        id: 'l3-q6',
        type: 'short',
        prompt: 'Explain why doubling a car\'s speed makes its braking distance about four times as long. Use kinetic energy in your answer.',
        minWords: 14,
        keyIdeas: [
          { any: ['kinetic'], hint: 'Name the store the brakes have to empty.' },
          { any: ['four', '4'], hint: 'Say how many times larger the energy is.' },
          { any: ['square', 'squared', 'v²', 'v2'], hint: 'Say why. The energy depends on the speed squared.' },
        ],
        model: 'Kinetic energy depends on the speed squared. At twice the speed the car has four times the energy in its kinetic store. The brakes must remove all of it, so they need about four times the distance.',
      },
    },
    {
      type: 'notes',
      scene: 'kinetic',
      title: 'Notes. A worked example',
      hideValues: true,
      question: {
        id: 'l3-n1',
        type: 'cloze',
        prompt: `Find the kinetic energy of a ${fq(notes.m, 'kg', 2)} toy car moving at ${fq(notes.v, 'm/s', 2)}.`,
        text: `<table class="ledger-table"><tr><th>Equation</th><td>Ek = {a}</td></tr><tr><th>Substitute</th><td>Ek = ½ × {b} × {c}</td></tr><tr><th>Answer</th><td>Ek = {d}</td></tr></table>`,
        bank: ['½mv²', 'mv', '0.4', '3²', '3', fq(ek(notes), 'J', 2), fq(noSquare(notes), 'J', 2)],
        blanks: [
          { id: 'a', answer: '½mv²' },
          { id: 'b', answer: '0.4' },
          { id: 'c', answer: '3²', hint: 'Remember to square the speed.' },
          { id: 'd', answer: fq(ek(notes), 'J', 2), hint: 'Square the speed first, then multiply by the mass and halve it.' },
        ],
      },
    },
    {
      type: 'exit',
      scene: 'kinetic',
      title: "Back to today's questions",
      questions: [
        {
          id: 'l3-x1',
          type: 'short',
          prompt: 'What does the energy in a kinetic store depend on?',
          minWords: 8,
          keyIdeas: [
            { any: ['mass'], hint: 'Name the first quantity.' },
            { any: ['speed', 'velocity'], hint: 'Name the second quantity.' },
          ],
          model: 'It depends on the mass of the object and on its speed. It depends on the speed squared.',
        },
        {
          id: 'l3-x2',
          type: 'numeric',
          prompt: `A runner of mass ${fq(exitQ.m, 'kg')} runs at ${fq(exitQ.v, 'm/s', 2)}. Calculate the energy in her kinetic store.`,
          answer: ek(exitQ),
          unit: 'J',
          units: ['J', 'N', 'W', 'kg'],
          mistakes: [
            { id: 'no-square', value: noSquare(exitQ), feedback: 'You did not square the speed.' },
            { id: 'no-half', value: noHalf(exitQ), feedback: 'You forgot the half in Ek = ½mv².' },
          ],
          correctFeedback: `Right. Ek = ½ × ${exitQ.m} × ${exitQ.v.toFixed(1)}² = ${fq(ek(exitQ), 'J')}.`,
        },
      ],
    },
  ],
};
