// src/lessons/l5-ramp.js
// Lesson 5. Energy on a ramp (conservation of energy). The sample lesson.
// Syllabus: 5(b) Ek = ½mv² and Ep = mgh, 5(c) conservation of energy, 4(d) friction.
// Every result shown comes from physics/equations.js.
import { speedFromDrop, gravitationalPotentialEnergy, kineticEnergy } from '../physics/equations.js';
import { formatQuantity } from '../physics/format.js';

const fq = formatQuantity;

// Check question numbers (given data typed, results computed).
const ballDrop = 0.8; // m
const ballSpeed = speedFromDrop(ballDrop);
const coasterTop = 20; // m
const coasterDip = 5; // m
const coasterSpeed = speedFromDrop(coasterTop - coasterDip);
const skaterMass = 60; // kg
const skaterHeight = 2.5; // m
const skaterBottomV = 6.0; // m/s
const skaterEp = gravitationalPotentialEnergy(skaterMass, skaterHeight);
const skaterEk = kineticEnergy(skaterMass, skaterBottomV);
const skaterInternal = skaterEp - skaterEk;
const exitDrop = 3.2; // m
const exitSpeed = speedFromDrop(exitDrop);

// Notes ledger: 50 kg from 2.0 m with no friction.
const notesTop = gravitationalPotentialEnergy(50, 2.0);
const notesMid = gravitationalPotentialEnergy(50, 1.0);
const notesKmid = notesTop - notesMid;

export default {
  id: 'l5-ramp',
  title: 'Energy on a ramp',
  syllabus: ['5(b)', '5(c)', '4(d)'],
  questions: [
    'Where does the energy go as a skateboarder rolls down a ramp?',
    'How fast is the skateboarder at the bottom?',
  ],
  pages: [
    {
      type: 'hook',
      scene: 'ramp',
      title: 'Dropping in',
      photo: 'photos/skatepark.jpg',
      photoAlt: 'A skateboarder at the top of a half-pipe at a local skatepark',
      text: [
        'A skateboarder tips over the top of a half-pipe. She never pushes, yet she shoots up the other side.',
        'Each pass ends a little lower, until she stops. Where does her speed come from, and where does it go?',
      ],
      sceneState: { friction: false, height: 2.0, mass: 50 },
    },
    {
      type: 'predict',
      scene: 'ramp',
      title: 'Predict before you run it',
      text: ['Imagine a half-pipe with no friction at all. She starts at rest at the top of the left side.'],
      question: {
        id: 'l5-p1',
        prompt: 'How high will she rise on the right side?',
        options: [
          { id: 'lower', text: 'Lower than her start height.' },
          { id: 'same', text: 'The same as her start height.' },
          { id: 'higher', text: 'Higher than her start height.' },
        ],
        reasonPrompt: 'Give your reason in a full sentence.',
      },
      after: [
        'Now run it. Watch the dashed line and the jars at the back of the page.',
        'The dashed line marks her start height.',
      ],
      goal: 'Press "Let her go". Watch how high she rises on the right side.',
      actions: ['run', 'reset'],
      cue: 'rider',
      sceneState: { friction: false, height: 2.0, mass: 50 },
    },
    {
      type: 'explore',
      scene: 'ramp',
      title: 'Explore the ramp',
      text: ['Friction is still off. Change the start height and the mass, then run each one.'],
      equations: [
        { html: 'E<sub>p</sub> = mgh', words: 'gravitational potential energy = mass × gravitational field strength × height' },
        { html: 'E<sub>k</sub> = ½mv²', words: 'kinetic energy = ½ × mass × speed²' },
      ],
      goal: 'Try three different start heights. For each one, use "Pause at the bottom" and read her speed.',
      controls: ['height', 'mass'],
      actions: ['run', 'pauseBottom', 'reset'],
      cue: 'rider',
      sceneState: { friction: false },
    },
    {
      type: 'name',
      scene: 'ramp',
      title: 'The principle of conservation of energy',
      term: 'conservation',
      steps: [
        'As she rolls down, her gravitational potential store falls and her kinetic store grows.',
        'As she rises, her kinetic store falls and her gravitational potential store grows again.',
        'The dark line on the ledger never moves. The total stays the same at every moment.',
        'This is the principle of conservation of energy. Energy cannot be created or destroyed. Energy can be transferred from one store to another. The total energy of an isolated system is constant.',
      ],
    },
    {
      type: 'explore',
      scene: 'ramp',
      title: 'Turn friction on',
      text: ['Real ramps are not perfectly smooth. There is friction between the wheels, the board and the ramp.'],
      goal: 'Turn friction on and run it. Watch the internal store and the dark line on the ledger.',
      controls: ['friction', 'height'],
      actions: ['run', 'reset'],
      sceneState: { friction: true, height: 2.0 },
    },
    {
      type: 'name',
      scene: 'ramp',
      title: 'Where the energy goes',
      term: 'surroundings',
      steps: [
        'With friction, some energy is transferred mechanically to the internal store of the board, the wheels and the ramp on every pass.',
        'So less energy is left to lift her back up. Each pass ends lower.',
        'The dark line still does not move. The energy is not destroyed. It is spread out in the internal store of the surroundings, where it is hard to use again.',
      ],
    },
    {
      type: 'use',
      scene: 'ramp',
      title: 'Use it on a new slope',
      text: ['With no friction, all of the gravitational potential energy lost becomes kinetic energy. So mgh = ½mv².'],
      question: {
        id: 'l5-q1',
        type: 'numeric',
        prompt: `A ball rolls from rest down a smooth slope from a height of ${fq(ballDrop, 'm', 2)}. Take g = 10 N/kg. Find its speed at the bottom.`,
        answer: ballSpeed,
        unit: 'm/s',
        units: ['m/s', 'J', 'm'],
        mistakes: [
          { id: 'no-root', value: ballSpeed * ballSpeed, feedback: 'You found v² but did not take the square root. Take the square root of 2gh to find v.' },
          { id: 'no-two', value: Math.sqrt(10 * ballDrop), feedback: 'You left out the 2. From mgh = ½mv², v² = 2gh, so v = √(2gh).' },
          { id: 'energy', value: 10 * ballDrop, feedback: 'You found gh, which is not a speed. Use v = √(2gh).' },
        ],
        correctFeedback: `Right. v = √(2gh) = √(2 × 10 × ${fq(ballDrop, 'm', 2).replace(' m', '')}) = ${fq(ballSpeed, 'm/s', 2)}.`,
      },
    },
    {
      type: 'use',
      scene: 'ramp',
      title: 'Does mass matter?',
      text: ['In mgh = ½mv², the mass m is on both sides.'],
      question: {
        id: 'l5-q2',
        type: 'mcq',
        prompt: 'Two skateboarders, of mass 40 kg and 80 kg, start from rest at the same height on a smooth ramp. Which one is faster at the bottom?',
        options: [
          { id: 'light', text: 'The 40 kg skateboarder is faster because she is lighter.', feedback: 'The lighter skateboarder has less gravitational potential energy to start with, and needs less kinetic energy for each m/s. The two effects cancel exactly.' },
          { id: 'heavy', text: 'The 80 kg skateboarder is faster because he is heavier.', feedback: 'The heavier skateboarder does have more energy, but he also needs more kinetic energy for the same speed. The mass cancels in mgh = ½mv².' },
          { id: 'same', text: 'They have the same speed because the mass cancels out.', correct: true, feedback: 'Right. Dividing both sides of mgh = ½mv² by m gives gh = ½v². The speed at the bottom depends only on the height.' },
        ],
      },
    },
    {
      type: 'check',
      scene: 'ramp',
      title: 'A roller coaster',
      question: {
        id: 'l5-q3',
        type: 'numeric',
        prompt: `A roller coaster car starts from rest at the top of a ${fq(coasterTop, 'm')} hill. It rolls down into a dip that is ${fq(coasterDip, 'm')} above the ground. Friction is small enough to ignore. Take g = 10 N/kg. Find its speed at the bottom of the dip.`,
        answer: coasterSpeed,
        unit: 'm/s',
        units: ['m/s', 'J', 'm'],
        mistakes: [
          { id: 'full-height', value: speedFromDrop(coasterTop), feedback: `You used the full ${fq(coasterTop, 'm')}. The car only falls from ${fq(coasterTop, 'm')} to ${fq(coasterDip, 'm')}, so use the drop in height.` },
          { id: 'dip-height', value: speedFromDrop(coasterDip), feedback: 'You used the height of the dip. Use how far the car falls, which is the difference between the two heights.' },
          { id: 'no-root', value: coasterSpeed * coasterSpeed, feedback: 'You found v² but did not take the square root.' },
        ],
        correctFeedback: `Right. The drop is ${fq(coasterTop - coasterDip, 'm')}, so v = √(2 × 10 × ${coasterTop - coasterDip}) = ${fq(coasterSpeed, 'm/s', 3)}.`,
      },
    },
    {
      type: 'check',
      scene: 'ramp',
      title: 'Doing the accounts',
      question: {
        id: 'l5-q4',
        type: 'numeric',
        prompt: `A ${fq(skaterMass, 'kg')} skateboarder starts from rest ${fq(skaterHeight, 'm', 2)} up a ramp. At the bottom her speed is ${fq(skaterBottomV, 'm/s', 2)}. Take g = 10 N/kg. How much energy has been transferred to the internal store of the surroundings?`,
        answer: skaterInternal,
        unit: 'J',
        units: ['J', 'm/s', 'N'],
        mistakes: [
          { id: 'ep-only', value: skaterEp, feedback: 'That is her starting gravitational potential energy. Subtract the energy that is still in her kinetic store at the bottom.' },
          { id: 'ek-only', value: skaterEk, feedback: 'That is the energy in her kinetic store at the bottom. The internal store gets what is left of the starting total.' },
          { id: 'added', value: skaterEp + skaterEk, feedback: 'You added the two stores. The total stays the same, so the internal store gets the starting total minus the kinetic energy at the bottom.' },
          { id: 'no-square', value: skaterEp - 0.5 * skaterMass * skaterBottomV, feedback: 'You did not square the speed when you found the kinetic energy.' },
        ],
        correctFeedback: `Right. Ep = ${fq(skaterEp, 'J')} and Ek = ${fq(skaterEk, 'J')}, so ${fq(skaterInternal, 'J')} went to the internal store.`,
      },
    },
    {
      type: 'use',
      scene: 'ramp',
      title: 'Back to the playground',
      sceneState: { friction: true },
      text: ['Think of a long playground slide. You start at the top and slide to the bottom.'],
      question: {
        id: 'l5-q5',
        type: 'short',
        prompt: 'Explain why a real slide never sends you back up to the top.',
        minWords: 12,
        keyIdeas: [
          { any: ['friction', 'rubbing', 'air resistance'], hint: 'Say what acts against you as you slide.' },
          { any: ['internal', 'surroundings', 'heat', 'warm'], hint: 'Name the store some of the energy goes to.' },
          { any: ['less', 'not enough', 'smaller', 'lower', 'lose', 'loses', 'lost'], hint: 'Say what this means for the energy left to lift you back up.' },
        ],
        model: 'Friction between me and the slide transfers some energy to the internal store of the slide and the surroundings. So there is less energy left in my kinetic store to lift me back to the top. The total energy is still the same.',
      },
    },
    {
      type: 'notes',
      scene: 'ramp',
      title: 'Notes. The principle',
      question: {
        id: 'l5-n1',
        type: 'cloze',
        prompt: 'Complete the statement of the principle of conservation of energy.',
        text: 'Energy cannot be {a} or {b}. Energy can be {c} from one store to another. The {d} energy of an isolated system is {e}.',
        bank: ['created', 'destroyed', 'transferred', 'total', 'constant', 'used up', 'increasing'],
        blanks: [
          { id: 'a', answer: 'created', accept: ['destroyed'] },
          { id: 'b', answer: 'destroyed', accept: ['created'] },
          { id: 'c', answer: 'transferred' },
          { id: 'd', answer: 'total' },
          { id: 'e', answer: 'constant', hint: 'The total never changes, so it is constant.' },
        ],
      },
    },
    {
      type: 'notes',
      scene: 'ramp',
      title: 'Notes. The ledger on the ramp',
      sceneState: { friction: false, height: 2.0, mass: 50 },
      hideValues: true,
      question: {
        id: 'l5-n2',
        type: 'cloze',
        prompt: `A ${fq(50, 'kg')} skateboarder starts from rest ${fq(2.0, 'm', 2)} up a smooth ramp. Complete her ledger.`,
        text: `<table class="ledger-table"><tr><th>Position</th><th>gravitational potential store</th><th>kinetic store</th></tr><tr><th>top</th><td>{a}</td><td>{b}</td></tr><tr><th>halfway down</th><td>{c}</td><td>{d}</td></tr><tr><th>bottom</th><td>{e}</td><td>{f}</td></tr></table>`,
        bank: [fq(notesTop, 'J'), fq(notesMid, 'J'), fq(0, 'J'), fq(2 * notesTop, 'J')],
        blanks: [
          { id: 'a', answer: fq(notesTop, 'J') },
          { id: 'b', answer: fq(0, 'J') },
          { id: 'c', answer: fq(notesMid, 'J') },
          { id: 'd', answer: fq(notesKmid, 'J'), hint: 'Halfway down, the total is shared equally between the two stores.' },
          { id: 'e', answer: fq(0, 'J') },
          { id: 'f', answer: fq(notesTop, 'J'), hint: 'At the bottom, all of the starting energy is in the kinetic store.' },
        ],
      },
    },
    {
      type: 'exit',
      scene: 'ramp',
      title: "Back to today's questions",
      questions: [
        {
          id: 'l5-x1',
          type: 'short',
          prompt: 'Where does the energy go as a skateboarder rolls down a ramp? Use the names of the stores.',
          minWords: 12,
          keyIdeas: [
            { any: ['gravitational'], hint: 'Name the store the energy starts in.' },
            { any: ['kinetic'], hint: 'Name the store that grows as she speeds up.' },
            { any: ['internal', 'surroundings'], hint: 'Say where some energy goes because of friction.' },
          ],
          model: 'Energy is transferred from her gravitational potential store to her kinetic store. Because of friction, some energy is transferred to the internal store of the surroundings. The total energy stays the same.',
        },
        {
          id: 'l5-x2',
          type: 'numeric',
          prompt: `A skateboarder starts from rest at the top of a smooth ramp ${fq(exitDrop, 'm', 2)} high. Take g = 10 N/kg. How fast is the skateboarder at the bottom?`,
          answer: exitSpeed,
          unit: 'm/s',
          units: ['m/s', 'J', 'm'],
          mistakes: [
            { id: 'no-root', value: exitSpeed * exitSpeed, feedback: 'You found v² but did not take the square root.' },
            { id: 'no-two', value: Math.sqrt(10 * exitDrop), feedback: 'You left out the 2 in v = √(2gh).' },
          ],
          correctFeedback: `Right. v = √(2 × 10 × ${exitDrop}) = ${fq(exitSpeed, 'm/s', 2)}.`,
        },
      ],
    },
  ],
};
