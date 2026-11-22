// src/lessons/l1-stores.js
// Lesson 1. Energy stores. Syllabus 5(a): stores (kinetic, potential
// (gravitational, chemical, elastic), nuclear and internal).
// Written directly as a textbook, in two spreads: each right-hand page has
// its own living figure at the top and printed questions beneath it.
// No equations yet, so no joules are shown.

const STORE_CHOICES = [
  { id: 'kinetic', text: 'kinetic' },
  { id: 'gravitational', text: 'gravitational potential' },
  { id: 'elastic', text: 'elastic potential' },
  { id: 'chemical', text: 'chemical potential' },
  { id: 'internal', text: 'internal' },
  { id: 'nuclear', text: 'nuclear' },
];

export default {
  id: 'l1-stores',
  title: 'Energy stores',
  textbook: true,
  syllabus: ['5(a)'],
  questions: ['Where is energy kept?', 'How can you tell which store it is in?'],
  pages: [
    {
      type: 'spread',
      scene: 'stores:top',
      kicker: 'Lesson 1',
      title: 'Energy stores',
      left: [
        { lead: 'Your phone is at 100% when you leave home in the morning. By night it is dead. The energy has not vanished. So where was it kept?' },
        { questions: true },
        { h: 'Where energy is kept' },
        'Energy is not a substance, so you cannot see it or pour it. What you can do is say where it is kept. We describe each place as an <b>energy store</b>.',
        'There are six stores. An object can have energy in more than one of them at the same time. You can tell which stores have energy in them by looking at what the object is doing, or what it is made of.',
        { key: 'To find the store, ask what the object is doing. Is it moving, high up, stretched, hot, a fuel, or made of unstable nuclei?' },
        { h: 'The six stores' },
        {
          table: {
            head: ['Store', 'It has energy when', 'In Fig. 1.1'],
            rows: [
              ['Kinetic', 'the object is moving', 'the rolling toy car'],
              ['Gravitational potential', 'the object is high up', 'the book held up high'],
              ['Elastic potential', 'the object is stretched or squashed', 'the stretched catapult'],
              ['Chemical potential', 'it is a fuel, food or a battery', 'the battery'],
              ['Internal', 'the object is hot', 'the cup of hot kopi'],
              ['Nuclear', 'energy is kept in the nuclei of its atoms', 'the Sun'],
            ],
          },
        },
        'The hotter an object is, the more energy is in its internal store. The faster it moves, the more is in its kinetic store. Later lessons put numbers to both.',
      ],
      figure: { n: 1, room: 0.585, caption: 'Six objects, and a jar for each store. Each object keeps energy in one of the six stores.' },
      right: [
        { try: { goal: 'Tap each object in the drawing. Watch which jar its energy goes to, then check it against the table.' } },
        {
          n: 1,
          q: {
            id: 'l1-x2',
            type: 'mcq',
            prompt: 'How can you tell that a ball has energy in its kinetic store?',
            options: [
              { id: 'moving', text: 'It is moving.', correct: true, feedback: 'Right. Any moving object has energy in its kinetic store.' },
              { id: 'high', text: 'It is high up.', feedback: 'Height tells you about the gravitational potential store.' },
              { id: 'hot', text: 'It is hot.', feedback: 'Temperature tells you about the internal store.' },
              { id: 'squashed', text: 'It is squashed.', feedback: 'Being squashed tells you about the elastic potential store.' },
            ],
          },
        },
      ],
    },
    {
      type: 'spread',
      scene: 'stores:cases',
      kicker: 'Lesson 1',
      title: 'Using the six stores',
      completes: true,
      left: [
        { lead: 'The six stores are enough for anything you meet. Three new cases are drawn in Fig. 1.2. Tap each one before you answer.' },
        { h: 'Worked example' },
        'A durian hangs high on a branch, not moving. Which store has energy in it because of the durian\'s height?',
        'It is not moving, so its kinetic store is empty. It is not stretched. It is high above the ground, so the energy is in its <b>gravitational potential store</b>.',
        'The durian is also food, so it has energy in its chemical potential store too. One object, two stores.',
        { h: 'Questions' },
        {
          n: 2,
          q: {
            id: 'l1-q3',
            type: 'mcq',
            prompt: 'A bowl of hot rice is on the table. Which two stores hold energy in the rice?',
            options: [
              { id: 'ck', text: 'Chemical potential and kinetic', feedback: 'The rice is not moving, so its kinetic store is empty.' },
              { id: 'ci', text: 'Chemical potential and internal', correct: true, feedback: 'Right. As food, the rice has a chemical potential store. Because it is hot, it has energy in its internal store.' },
              { id: 'gi', text: 'Gravitational potential and internal', feedback: 'The rice is hot, so the internal store is right. But as food, its main other store is chemical.' },
              { id: 'en', text: 'Elastic potential and nuclear', feedback: 'The rice is not stretched, and it is not a nuclear fuel.' },
            ],
          },
        },
        {
          n: 3,
          q: {
            id: 'l1-q2',
            type: 'label',
            prompt: 'Choose the store that each one is mainly about.',
            pairs: [
              { id: 'bow', item: 'A drawn bow, ready to fire', answer: 'elastic', hint: 'A drawn bow is bent, so think about stretched or squashed things.' },
              { id: 'iron', item: 'A hot iron', answer: 'internal', hint: 'Hot objects have more energy in their internal store.' },
              { id: 'uranium', item: 'Uranium fuel in a power station', answer: 'nuclear', hint: 'Uranium releases energy from the nuclei of its atoms.' },
            ],
            choices: STORE_CHOICES,
          },
        },
      ],
      figure: { n: 2, room: 0.485, caption: 'A durian on a branch, a bowl of hot rice and a drawn bow. Tap each one to see its stores.' },
      right: [
        { try: { goal: 'Tap each case in the drawing and watch its jars.' } },
        { h: 'Explain it' },
        {
          n: 4,
          q: {
            id: 'l1-q4',
            type: 'short',
            prompt: 'A skateboarder holds a stretched rubber band at the top of a ramp. Name two stores that hold energy here, and explain how you can tell.',
            minWords: 12,
            keyIdeas: [
              { any: ['elastic'], hint: 'The rubber band is stretched. Name its store.' },
              { any: ['gravitational'], hint: 'The skateboarder is high up. Name the store for height.' },
              { any: ['stretched', 'height', 'high', 'top'], hint: 'Say what tells you which store it is.' },
            ],
            model: 'The rubber band has energy in its elastic potential store because it is stretched. The skateboarder has energy in her gravitational potential store because she is high up at the top of the ramp.',
          },
        },
        { h: 'Back to the phone' },
        {
          n: 5,
          q: {
            id: 'l1-x1',
            type: 'short',
            prompt: 'Where is energy kept in a fully charged phone? Name the store.',
            minWords: 6,
            keyIdeas: [{ any: ['chemical'], hint: 'A phone battery keeps energy in the same store as other batteries.' }],
            model: 'The energy is kept in the chemical potential store of the phone battery.',
          },
        },
        { stamp: true },
      ],
    },
  ],
};
