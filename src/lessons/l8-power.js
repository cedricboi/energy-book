// src/lessons/l8-power.js
// Lesson 8. Power. Syllabus 5(e): power = energy transferred ÷ time taken,
// written P = E/t as a fraction. P = VI belongs to Topic 12 and is not used.
import { power, energyFromPower, gravitationalPotentialEnergy, timeFromPower } from '../physics/equations.js';
import { formatQuantity } from '../physics/format.js';
import { fracEq } from '../ui/maths.js';
import { STAIRS } from '../scenes/power.js';

const fq = formatQuantity;
const motor = { E: 6000, t: 12 };
const charger = { P: 18, min: 30 };
const sprinter = { m: 70, h: 4.0, t: 5.0 };
const kettles = { E: 240000, P1: 1200, P2: 2400 };
const dryer = { P: 1500, min: 4.0 };
const ali = { t: 4.0, tBen: 12 };
const aliE = gravitationalPotentialEnergy(STAIRS.bag, STAIRS.height);
const exitQ = { E: 900, t: 30 };

export default {
  id: 'l8-power',
  title: 'Power',
  syllabus: ['5(e)'],
  questions: ['What is power?', 'How do we compare how quickly two things transfer energy?'],
  pages: [
    {
      type: 'hook',
      scene: 'power',
      title: 'Same stairs, same bag',
      text: [
        'Two students carry the same school bag up the same staircase. One runs up. The other walks.',
        'They lift the same bag through the same height, so they do the same work on it. So what is different?',
      ],
      sceneState: { compare: 'stairs', timeA: 4, timeB: 12 },
    },
    {
      type: 'explore',
      scene: 'power',
      title: 'Two people, two times',
      text: [`Each person lifts a ${fq(STAIRS.bag, 'kg', 2)} bag up ${fq(STAIRS.height, 'm', 2)} of stairs.`],
      goal: 'Set a different time for each person and start the stopwatches. Watch how fast each jar fills, and how full each ends.',
      controls: ['timeA', 'timeB'],
      actions: ['run', 'reset'],
      sceneState: { compare: 'stairs' },
    },
    {
      type: 'name',
      scene: 'power',
      title: 'Power',
      term: ['power', 'watt'],
      steps: [
        'Both bags end with the same energy. The faster person transfers it in less time.',
        'Power is how quickly energy is transferred. Power = energy transferred ÷ time taken.',
        `${fracEq('P', 'E', 't')} where E is in joules and t is in seconds.`,
        'Power is measured in watts (W). 1 W is 1 J of energy transferred each second. Work done is energy transferred, so power is also work done ÷ time taken.',
      ],
    },
    {
      type: 'explore',
      scene: 'power',
      title: 'Two kettles',
      text: ['Both kettles heat the same water, which needs the same energy to boil.'],
      goal: 'Start the stopwatches. Which kettle boils its water first, and how do the two times compare?',
      actions: ['run', 'reset'],
      sceneState: { compare: 'kettles' },
      note: 'Shown twenty times faster than real life.',
    },
    {
      type: 'use',
      scene: 'power',
      title: 'A lift motor',
      question: {
        id: 'l8-q1',
        type: 'numeric',
        prompt: `A lift motor transfers ${fq(motor.E, 'J')} in ${fq(motor.t, 's')}. What is its power?`,
        answer: power(motor.E, motor.t),
        unit: 'W',
        units: ['W', 'J', 's', 'N'],
        mistakes: [
          { id: 'times', value: motor.E * motor.t, feedback: 'You multiplied. Power = energy ÷ time, so divide.' },
          { id: 'upside', value: motor.t / motor.E, feedback: 'You divided the wrong way round. Divide the energy by the time.' },
        ],
        correctFeedback: `Right. P = ${motor.E} ÷ ${motor.t} = ${fq(power(motor.E, motor.t), 'W')}.`,
      },
    },
    {
      type: 'use',
      scene: 'power',
      title: 'A phone charger',
      question: {
        id: 'l8-q2',
        type: 'numeric',
        prompt: `A phone charger has a power of ${fq(charger.P, 'W')}. How much energy does it transfer in ${fq(charger.min, 'min')}?`,
        answer: energyFromPower(charger.P, charger.min * 60),
        unit: 'J',
        units: ['J', 'W', 's'],
        mistakes: [
          { id: 'minutes', value: energyFromPower(charger.P, charger.min), feedback: 'You used the time in minutes. Change it to seconds first: 30 min = 30 × 60 s.' },
          { id: 'divide', value: charger.P / (charger.min * 60), feedback: 'You divided. E = P × t, so multiply.' },
        ],
        correctFeedback: `Right. t = ${charger.min} × 60 = ${charger.min * 60} s, so E = ${charger.P} × ${charger.min * 60} = ${fq(energyFromPower(charger.P, charger.min * 60), 'J')}.`,
      },
    },
    {
      type: 'check',
      scene: 'power',
      title: 'A sprinter on the stairs',
      question: {
        id: 'l8-q3',
        type: 'numeric',
        prompt: `A sprinter of mass ${fq(sprinter.m, 'kg')} runs up stairs ${fq(sprinter.h, 'm', 2)} high in ${fq(sprinter.t, 's', 2)}. Take g = 10 N/kg. What is her power in lifting herself?`,
        answer: power(gravitationalPotentialEnergy(sprinter.m, sprinter.h), sprinter.t),
        unit: 'W',
        units: ['W', 'J', 's', 'N'],
        mistakes: [
          { id: 'energy', value: gravitationalPotentialEnergy(sprinter.m, sprinter.h), feedback: 'That is the energy she gains. Divide it by the time to find the power.' },
          { id: 'no-g', value: power(sprinter.m * sprinter.h, sprinter.t), feedback: 'You left out g when you found the energy. Ep = mgh.' },
        ],
        correctFeedback: `Right. E = ${sprinter.m} × 10 × ${sprinter.h.toFixed(1)} = ${fq(gravitationalPotentialEnergy(sprinter.m, sprinter.h), 'J')}, so P = ${fq(power(gravitationalPotentialEnergy(sprinter.m, sprinter.h), sprinter.t), 'W')}.`,
      },
    },
    {
      type: 'check',
      scene: 'power',
      title: 'Twice the power',
      question: {
        id: 'l8-q4',
        type: 'mcq',
        prompt: `A ${fq(kettles.P1, 'W')} kettle and a ${fq(kettles.P2, 'W')} kettle each heat the same water. How does the time taken by the ${fq(kettles.P2, 'W')} kettle compare?`,
        options: [
          { id: 'same', text: 'It takes the same time.', feedback: 'The water needs the same energy, but the bigger kettle transfers it faster.' },
          { id: 'half', text: 'It takes half the time.', correct: true, feedback: `Right. t = E ÷ P. Twice the power gives half the time: ${fq(timeFromPower(kettles.E, kettles.P2), 's')} instead of ${fq(timeFromPower(kettles.E, kettles.P1), 's')} for ${fq(kettles.E, 'J')}.` },
          { id: 'double', text: 'It takes twice the time.', feedback: 'More power means energy is transferred faster, so less time.' },
          { id: 'quarter', text: 'It takes a quarter of the time.', feedback: 'Time depends on 1 ÷ P, not 1 ÷ P². Twice the power gives half the time.' },
        ],
      },
    },
    {
      type: 'check',
      scene: 'power',
      title: 'A hair dryer',
      question: {
        id: 'l8-q5',
        type: 'numeric',
        prompt: `A ${fq(dryer.P, 'W')} hair dryer is used for ${fq(dryer.min, 'min', 2)}. How much energy does it transfer?`,
        answer: energyFromPower(dryer.P, dryer.min * 60),
        unit: 'J',
        units: ['J', 'W', 's'],
        mistakes: [{ id: 'minutes', value: energyFromPower(dryer.P, dryer.min), feedback: 'You used the time in minutes. Change it to seconds first.' }],
        correctFeedback: `Right. t = ${dryer.min} × 60 = ${dryer.min * 60} s, so E = ${fq(energyFromPower(dryer.P, dryer.min * 60), 'J')}.`,
      },
    },
    {
      type: 'use',
      scene: 'power',
      title: 'Back to the stairs',
      sceneState: { compare: 'stairs', timeA: 4, timeB: 12 },
      question: {
        id: 'l8-q6',
        type: 'numeric',
        prompt: `Ali carries a ${fq(STAIRS.bag, 'kg', 2)} bag up ${fq(STAIRS.height, 'm', 2)} of stairs in ${fq(ali.t, 's', 2)}. Ben does the same in ${fq(ali.tBen, 's')}. Take g = 10 N/kg. What is Ali's power in lifting the bag?`,
        answer: power(aliE, ali.t),
        unit: 'W',
        units: ['W', 'J', 's'],
        mistakes: [
          { id: 'ben', value: power(aliE, ali.tBen), feedback: "That is Ben's power. Use Ali's time." },
          { id: 'energy', value: aliE, feedback: 'That is the energy given to the bag. Divide it by the time.' },
        ],
        correctFeedback: `Right. E = ${fq(aliE, 'J')}. Ali's power = ${fq(power(aliE, ali.t), 'W')} and Ben's = ${fq(power(aliE, ali.tBen), 'W')}. Same work, but Ali has the greater power.`,
      },
    },
    {
      type: 'notes',
      scene: 'power',
      title: 'Notes. Equations and units',
      question: {
        id: 'l8-n1',
        type: 'label',
        prompt: 'Choose the unit for each quantity in P = E/t.',
        pairs: [
          { id: 'p', item: 'P, power', answer: 'W' },
          { id: 'e', item: 'E, energy transferred', answer: 'J' },
          { id: 't', item: 't, time taken', answer: 's' },
          { id: 'w', item: 'W, work done', answer: 'J', hint: 'Work done is energy transferred, so it has the same unit as energy.' },
        ],
        choices: [{ id: 'W', text: 'W' }, { id: 'J', text: 'J' }, { id: 's', text: 's' }, { id: 'N', text: 'N' }],
      },
    },
    {
      type: 'exit',
      scene: 'power',
      title: "Back to today's questions",
      questions: [
        {
          id: 'l8-x1',
          type: 'short',
          prompt: 'What is power?',
          minWords: 6,
          keyIdeas: [
            { any: ['energy', 'work'], hint: 'Say what is being transferred.' },
            { any: ['time', 'quickly', 'second', 'rate', 'fast'], hint: 'Say how time comes into it.' },
          ],
          model: 'Power is how quickly energy is transferred. It is the energy transferred divided by the time taken.',
        },
        {
          id: 'l8-x2',
          type: 'numeric',
          prompt: `A fan transfers ${fq(exitQ.E, 'J')} in ${fq(exitQ.t, 's')}. Calculate its power.`,
          answer: power(exitQ.E, exitQ.t),
          unit: 'W',
          units: ['W', 'J', 's'],
          mistakes: [{ id: 'times', value: exitQ.E * exitQ.t, feedback: 'You multiplied. Power = energy ÷ time.' }],
          correctFeedback: `Right. P = ${exitQ.E} ÷ ${exitQ.t} = ${fq(power(exitQ.E, exitQ.t), 'W')}.`,
        },
      ],
    },
  ],
};
