// src/lessons/l2-transfers.js
// Lesson 2. Energy transfers. Syllabus 5(a)(i) to (iv): energy can be
// transferred mechanically, electrically, by heating and by propagation of
// waves (both electromagnetic and mechanical). Also 7(a) and 9(b) as contexts.

const WAYS = [
  { id: 'mechanically', text: 'mechanically' },
  { id: 'electrically', text: 'electrically' },
  { id: 'heating', text: 'by heating' },
  { id: 'waves', text: 'by propagation of waves' },
];

const STORES = [
  { id: 'chemical', text: 'chemical potential store' },
  { id: 'kinetic', text: 'kinetic store' },
  { id: 'internal', text: 'internal store' },
  { id: 'gravitational', text: 'gravitational potential store' },
];

export default {
  id: 'l2-transfers',
  title: 'Energy transfers',
  syllabus: ['5(a)', '5(a)(i)', '5(a)(ii)', '5(a)(iii)', '5(a)(iv)', '7(a)', '9(b)'],
  questions: ['How does energy move from one store to another?', 'What are the four ways it can move?'],
  pages: [
    {
      type: 'hook',
      scene: 'transfers',
      title: 'The phone comes back',
      text: [
        'The phone from Lesson 1 charges from a power bank. It gets warm. Its screen lights up. It plays a song.',
        'Each of these moves energy from one store to another. Today you will find the four ways energy can move.',
      ],
    },
    {
      type: 'explore',
      scene: 'transfers',
      title: 'Watch energy move',
      text: ['Each scene shows energy leaving one jar and arriving somewhere else. Each path has its own look.'],
      goal: 'Choose a device and press "Run it". Try all four. Look closely at how each path looks.',
      controls: ['device'],
      actions: ['run', 'reset'],
    },
    {
      type: 'name',
      scene: 'transfers',
      title: 'Four ways energy moves',
      term: ['energy-transfer', 'mechanically', 'electrically', 'heating', 'waves'],
      text: ['Energy moving from one store to another is an energy transfer. There are four ways.'],
      steps: [
        'Transferred mechanically, by a force acting over a distance. The catapult band pushes the eraser.',
        'Transferred electrically, by an electric current. The current carries energy from the mains to the kettle.',
        'Transferred by heating, because of a temperature difference. The hot element heats the cooler water.',
        'Transferred by propagation of waves. The torch gives out light, an electromagnetic wave. The speaker gives out sound, a mechanical wave.',
      ],
    },
    {
      type: 'use',
      scene: 'transfers',
      title: 'Which way?',
      sceneState: { device: 'catapult' },
      question: {
        id: 'l2-q1',
        type: 'mcq',
        prompt: 'A girl kicks a football. How is energy transferred from her foot to the ball?',
        options: [
          { id: 'mech', text: 'It is transferred mechanically.', correct: true, feedback: 'Right. Her foot pushes the ball with a force over a short distance.' },
          { id: 'elec', text: 'It is transferred electrically.', feedback: 'There is no electric current between a foot and a ball.' },
          { id: 'heat', text: 'It is transferred by heating.', feedback: 'Heating needs a temperature difference. The kick is a push.' },
          { id: 'wave', text: 'It is transferred by propagation of waves.', feedback: 'The thud of the kick is a sound wave, but the ball moves because of the push.' },
        ],
      },
    },
    {
      type: 'use',
      scene: 'transfers',
      title: 'Which way?',
      sceneState: { device: 'kettle' },
      question: {
        id: 'l2-q2',
        type: 'mcq',
        prompt: 'A pot of soup sits on a hot stove. How is energy transferred from the hot pot to the cooler soup?',
        options: [
          { id: 'mech', text: 'It is transferred mechanically.', feedback: 'Nothing pushes the soup. Think about the temperatures.' },
          { id: 'elec', text: 'It is transferred electrically.', feedback: 'No current flows through the soup.' },
          { id: 'heat', text: 'It is transferred by heating.', correct: true, feedback: 'Right. The pot is hotter than the soup, so energy is transferred by heating.' },
          { id: 'wave', text: 'It is transferred by propagation of waves.', feedback: 'The pot touches the soup, and the transfer happens because the pot is hotter.' },
        ],
      },
    },
    {
      type: 'use',
      scene: 'transfers',
      title: 'Which way?',
      sceneState: { device: 'speaker' },
      question: {
        id: 'l2-q3',
        type: 'mcq',
        prompt: 'A drum is hit. How does energy travel from the drum skin to your ears?',
        options: [
          { id: 'mech', text: 'It is transferred mechanically.', feedback: 'The stick pushes the skin mechanically, but the energy reaches your ears another way.' },
          { id: 'elec', text: 'It is transferred electrically.', feedback: 'No current flows from the drum to you.' },
          { id: 'heat', text: 'It is transferred by heating.', feedback: 'There is no temperature difference doing this.' },
          { id: 'wave', text: 'It is transferred by propagation of waves.', correct: true, feedback: 'Right. Sound waves, which are mechanical waves, carry the energy through the air.' },
        ],
      },
    },
    {
      type: 'check',
      scene: 'transfers',
      title: 'A hand-crank radio',
      question: {
        id: 'l2-q4',
        type: 'order',
        prompt: 'You turn the handle of a hand-crank radio and it plays music. Put the energy chain in order.',
        items: {
          a: 'chemical potential store of your arm muscles',
          b: 'transferred mechanically to the kinetic store of the generator',
          c: 'transferred electrically to the radio speaker',
          d: 'transferred by propagation of sound waves to the room',
        },
        order: ['a', 'b', 'c', 'd'],
        shuffled: ['c', 'a', 'd', 'b'],
        wrongFeedback: 'Start with where the energy is kept before you turn the handle, then follow it to your ears.',
      },
    },
    {
      type: 'check',
      scene: 'transfers',
      title: 'A hair dryer',
      sceneState: { device: 'kettle' },
      question: {
        id: 'l2-q5',
        type: 'label',
        prompt: 'A hair dryer blows hot air. Choose how energy is transferred at each step.',
        pairs: [
          { id: 'a', item: 'Mains to the dryer', answer: 'electrically', hint: 'The hair dryer is plugged in, so a current carries the energy.' },
          { id: 'b', item: 'Hot wire to the air', answer: 'heating', hint: 'The wire is hotter than the air.' },
          { id: 'c', item: 'Fan to the air', answer: 'mechanically', hint: 'The fan pushes the air with a force.' },
          { id: 'd', item: 'Its whine to your ears', answer: 'waves', hint: 'You hear it, so a sound wave carries it.' },
        ],
        choices: WAYS,
      },
    },
    {
      type: 'check',
      scene: 'transfers',
      title: 'A solar garden light',
      sceneState: { device: 'torch' },
      question: {
        id: 'l2-q6',
        type: 'mcq',
        prompt: 'A solar garden light charges its battery in the day and lights up at night. How does energy from the Sun reach the solar panel?',
        options: [
          { id: 'mech', text: 'It is transferred mechanically.', feedback: 'Nothing pushes the panel. Think about what crosses space from the Sun.' },
          { id: 'elec', text: 'It is transferred electrically.', feedback: 'There is no wire from the Sun. The panel then transfers energy electrically to the battery.' },
          { id: 'heat', text: 'It is transferred by heating.', feedback: 'Heating needs matter between the objects. Space is empty, so something else carries the energy.' },
          { id: 'wave', text: 'It is transferred by propagation of waves.', correct: true, feedback: 'Right. Light, an electromagnetic wave, carries energy across space to the panel.' },
        ],
      },
    },
    {
      type: 'use',
      scene: 'transfers',
      title: 'Where did the 100% go?',
      sceneState: { device: 'speaker' },
      question: {
        id: 'l2-q7',
        type: 'short',
        prompt: 'Back to the phone. It starts at 100% and is dead by night. Explain where the energy went. Use the names of the stores and the ways energy is transferred.',
        minWords: 16,
        keyIdeas: [
          { any: ['chemical'], hint: 'Name the store the energy starts in.' },
          { any: ['electrically', 'electric current', 'current'], hint: 'Say how energy leaves the battery.' },
          { any: ['wave', 'waves', 'light', 'sound'], hint: 'Say how the screen and the speaker send energy out.' },
          { any: ['internal', 'surroundings', 'warm', 'heating'], hint: 'Say where the energy ends up.' },
        ],
        model: 'The energy starts in the chemical potential store of the battery. It is transferred electrically to the screen and the speaker. They send it out as light and sound, by propagation of waves. In the end it is in the internal store of the phone and the surroundings, which get slightly warmer.',
      },
    },
    {
      type: 'notes',
      scene: 'transfers',
      title: 'Notes. A torch',
      sceneState: { device: 'torch' },
      question: {
        id: 'l2-n1',
        type: 'cloze',
        prompt: 'Complete the energy chain for a torch.',
        text: '<table class="ledger-table"><tr><th>Starts in the</th><td>{a}</td></tr><tr><th>Reaches the bulb</th><td>{b}</td></tr><tr><th>Leaves the bulb by</th><td>{c} of light waves, and {d}</td></tr><tr><th>Ends up in the</th><td>{e}</td></tr></table>',
        bank: ['chemical potential store', 'electrically', 'propagation', 'heating', 'internal store', 'kinetic store', 'mechanically'],
        blanks: [
          { id: 'a', answer: 'chemical potential store' },
          { id: 'b', answer: 'electrically' },
          { id: 'c', answer: 'propagation' },
          { id: 'd', answer: 'heating' },
          { id: 'e', answer: 'internal store' },
        ],
      },
    },
    {
      type: 'exit',
      scene: 'transfers',
      title: "Back to today's questions",
      questions: [
        {
          id: 'l2-x1',
          type: 'label',
          prompt: 'Name the way energy is transferred in each case.',
          pairs: [
            { id: 'a', item: 'A crane lifts a load', answer: 'mechanically' },
            { id: 'b', item: 'A battery lights a lamp', answer: 'electrically' },
            { id: 'c', item: 'A hot drink warms your hands', answer: 'heating' },
            { id: 'd', item: 'The Sun warms the Earth', answer: 'waves' },
          ],
          choices: WAYS,
        },
        {
          id: 'l2-x2',
          type: 'mcq',
          prompt: 'A car brakes to a stop. Which store does its energy end up in?',
          options: STORES.map((s) => ({
            ...s,
            text: `It ends up in the ${s.text}.`,
            correct: s.id === 'internal',
            feedback: s.id === 'internal'
              ? 'Right. The brakes get hot, so the energy ends up in the internal store of the brakes and the surroundings.'
              : 'The car has stopped and the brakes are hot. Which store does a hot object have more energy in?',
          })),
        },
      ],
    },
  ],
};
