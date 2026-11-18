// src/lessons/game.js
// The chapter game, Ledger Run. Eight levels and a win screen. The physics
// (physics/game.js) is the same module the lessons use.
import { LEVELS } from '../physics/game.js';

export default {
  id: 'game',
  title: 'Ledger Run',
  game: true,
  syllabus: ['5(b)', '5(c)', '5(d)', '5(e)'],
  questions: ['Can you do the energy accounts for a whole machine?'],
  pages: [
    {
      type: 'hook',
      scene: 'ledgerRun',
      title: 'Ledger Run',
      sceneState: { level: 1 },
      text: [
        'Each level is a marble machine. Make the marble arrive at the target with exactly the energy it needs.',
        'Every part tells you how much energy it transfers to the internal store. Do the accounts, set the machine, then launch. Too little energy and the marble stalls. Too much and it overshoots.',
        'You have three tries per level. You score points for reaching the target, a bonus for the least input energy, and a bonus for clearing levels on the first try.',
      ],
    },
    ...LEVELS.map((L) => ({ type: 'game', scene: 'ledgerRun', title: `Level ${L.id}. ${L.title}`, level: L.id, sceneState: { level: L.id } })),
    { type: 'win', scene: 'ledgerRun', title: 'Your score', text: ['Here is how your machines did.'], sceneState: { level: 8 } },
  ],
};
