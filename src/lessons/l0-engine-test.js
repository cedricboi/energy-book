// src/lessons/l0-engine-test.js
// A three-page lesson for testing the book engine (Phase 5A). Not shown in
// the contents. Uses the Phase 4 spring scene.
import { kineticEnergy } from '../physics/equations.js';
import { formatQuantity } from '../physics/format.js';

const ek = kineticEnergy(0.5, 2);

export default {
  id: 'l0-engine-test',
  title: 'Engine test',
  hidden: true,
  syllabus: ['5(a)'],
  questions: ['Where does the energy in a squashed spring go?', 'How do we know none of it is lost?'],
  pages: [
    {
      type: 'explore',
      scene: 'springLaunch',
      title: 'Release the spring',
      text: ['A squashed spring is pressed against a ball. Release it and watch the jars at the back of the page.'],
      goal: 'Release the spring. Then watch where the energy goes as the ball rolls to a stop.',
      cue: 'spring',
      note: 'The motion is shown four times slower than real life.',
    },
    {
      type: 'name',
      scene: 'springLaunch',
      title: 'Naming the stores',
      term: ['elastic-store', 'kinetic-store', 'internal-store'],
      steps: [
        'Energy in the squashed spring is in its elastic potential store.',
        'Energy of the moving ball is in its kinetic store.',
        'When the ball stops, the energy is in the internal store of the ball and the page.',
      ],
    },
    {
      type: 'check',
      scene: 'springLaunch',
      title: 'A new case',
      question: {
        id: 'l0-q1',
        type: 'numeric',
        prompt: 'A 0.50 kg trolley moves at 2.0 m/s. How much energy is in its kinetic store?',
        answer: ek,
        unit: 'J',
        units: ['J', 'N', 'W'],
        mistakes: [{ id: 'no-square', value: kineticEnergy(0.5, Math.sqrt(2)), feedback: 'You did not square the speed. Square v first, then multiply by m and halve it.' },
          { id: 'no-half', value: 2 * ek, feedback: 'You forgot the half in Ek = ½mv².' }],
        correctFeedback: `Right. Ek = ½ × 0.50 × 2.0² = ${formatQuantity(ek, 'J', 2)}.`,
      },
    },
  ],
};
