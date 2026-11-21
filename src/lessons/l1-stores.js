// src/lessons/l1-stores.js
// Lesson 1. Energy stores. Syllabus 5(a): stores (kinetic, potential
// (gravitational, chemical, elastic), nuclear and internal).
// No equations yet, so no joules are shown.

const STORE_CHOICES = [
  { id: 'kinetic', text: 'kinetic store' },
  { id: 'gravitational', text: 'gravitational potential store' },
  { id: 'elastic', text: 'elastic potential store' },
  { id: 'chemical', text: 'chemical potential store' },
  { id: 'internal', text: 'internal store' },
  { id: 'nuclear', text: 'nuclear store' },
];

export default {
  id: 'l1-stores',
  title: 'Energy stores',
  syllabus: ['5(a)'],
  questions: ['Where is energy kept?', 'How can you tell which store it is in?'],
  pages: [
    {
      type: 'hook',
      scene: 'stores',
      title: 'A phone at 100%',
      text: [
        'Your phone is at 100% when you leave home in the morning. By night it is dead.',
        'The energy has not vanished. So where was it kept, and where did it go? We start with where it was kept.',
      ],
    },
    {
      type: 'explore',
      scene: 'stores',
      title: 'Where is the energy?',
      text: ['Each jar at the back of the page holds energy of one kind. Each object on the page has energy kept in one of them.'],
      goal: 'Tap the three objects below, one at a time. Watch which jar each one fills.',
      actions: ['car', 'book', 'catapult', 'reset'],
      cue: 'car',
    },
    {
      type: 'name',
      scene: 'stores',
      title: 'Energy stores',
      term: ['energy-store', 'kinetic-store', 'gravitational-store', 'elastic-store'],
      text: ['We describe where energy is kept as an energy store.'],
      steps: [
        'The rolling toy car has energy in its kinetic store, because it is moving.',
        'The book held up high has energy in its gravitational potential store, because of its height.',
        'The stretched catapult has energy in its elastic potential store, because it is stretched.',
      ],
    },
    {
      type: 'explore',
      scene: 'stores',
      title: 'Three more stores',
      goal: 'Tap the battery, the cup of hot kopi and the Sun. Watch which jar each one fills.',
      actions: ['battery', 'kopi', 'sun', 'reset'],
      cue: 'battery',
    },
    {
      type: 'name',
      scene: 'stores',
      title: 'Naming the other three',
      term: ['chemical-store', 'internal-store', 'nuclear-store'],
      steps: [
        'The battery has energy in its chemical potential store. Fuels and food do too.',
        'The hot kopi has energy in its internal store. The hotter it is, the more energy is in this store.',
        'The Sun has energy in its nuclear store, kept in the nuclei of its atoms.',
      ],
    },
    {
      type: 'use',
      scene: 'stores',
      title: 'A new case',
      question: {
        id: 'l1-q1',
        type: 'mcq',
        prompt: 'A durian hangs high on a tree, not moving. Which store holds its energy because of its height?',
        options: [
          { id: 'kinetic', text: 'Its kinetic store', feedback: 'The durian is not moving, so its kinetic store is empty. Think about its height.' },
          { id: 'gravitational', text: 'Its gravitational potential store', correct: true, feedback: 'Right. Energy kept because of height is in the gravitational potential store.' },
          { id: 'elastic', text: 'Its elastic potential store', feedback: 'The durian is not stretched or squashed. Think about its height.' },
          { id: 'chemical', text: 'Its chemical potential store', feedback: 'The durian does have a chemical potential store as food, but the question asks about its height.' },
        ],
      },
    },
    {
      type: 'use',
      scene: 'stores',
      title: 'Sort them',
      question: {
        id: 'l1-q2',
        type: 'label',
        prompt: 'Choose the store that each one is mainly about.',
        pairs: [
          { id: 'bow', item: 'A drawn bow, ready to fire', answer: 'elastic', hint: 'A drawn bow is bent, so think about stretched or squashed things.' },
          { id: 'rice', item: 'A bowl of rice, as food', answer: 'chemical', hint: 'Food keeps energy that our bodies release by chemical reactions.' },
          { id: 'iron', item: 'A hot iron', answer: 'internal', hint: 'Hot objects have more energy in their internal store.' },
          { id: 'uranium', item: 'Uranium fuel in a power station', answer: 'nuclear', hint: 'Uranium releases energy from the nuclei of its atoms.' },
        ],
        choices: STORE_CHOICES,
      },
    },
    {
      type: 'check',
      scene: 'stores',
      title: 'Two stores at once',
      question: {
        id: 'l1-q3',
        type: 'mcq',
        prompt: 'A bowl of hot rice is on the table. Which two stores hold energy in the rice?',
        options: [
          { id: 'ck', text: 'The chemical potential store and the kinetic store', feedback: 'The rice is not moving, so its kinetic store is empty.' },
          { id: 'ci', text: 'The chemical potential store and the internal store', correct: true, feedback: 'Right. As food, the rice has a chemical potential store. Because it is hot, it has energy in its internal store.' },
          { id: 'gi', text: 'The gravitational potential store and the internal store', feedback: 'The rice is hot, so the internal store is right. But as food, its main other store is chemical.' },
          { id: 'en', text: 'The elastic potential store and the nuclear store', feedback: 'The rice is not stretched, and it is not a nuclear fuel.' },
        ],
      },
    },
    {
      type: 'check',
      scene: 'stores',
      title: 'Explain it',
      question: {
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
    {
      type: 'notes',
      scene: 'stores',
      title: 'Notes. The six stores',
      question: {
        id: 'l1-n1',
        type: 'label',
        prompt: 'Choose the store for each one.',
        pairs: [
          { id: 'a', item: 'A moving object', answer: 'kinetic' },
          { id: 'b', item: 'An object high up', answer: 'gravitational' },
          { id: 'c', item: 'A stretched object', answer: 'elastic' },
          { id: 'd', item: 'Food, fuel, a battery', answer: 'chemical' },
          { id: 'e', item: 'A hot object', answer: 'internal' },
          { id: 'f', item: 'The nuclei of atoms', answer: 'nuclear' },
        ],
        choices: STORE_CHOICES,
      },
    },
    {
      type: 'exit',
      scene: 'stores',
      title: "Back to today's questions",
      questions: [
        {
          id: 'l1-x1',
          type: 'short',
          prompt: 'Where is energy kept in a fully charged phone? Name the store.',
          minWords: 6,
          keyIdeas: [{ any: ['chemical'], hint: 'A phone battery keeps energy in the same store as other batteries.' }],
          model: 'The energy is kept in the chemical potential store of the phone battery.',
        },
        {
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
      ],
    },
  ],
};
