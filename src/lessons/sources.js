// src/lessons/sources.js
// Every [verify] fact in the book, with where it was checked and when.
// A fact that could not be confirmed is left out of the lessons.
export const SOURCES = {
  'braking-distance': {
    fact: 'Typical braking distance for a car: 14 m at 30 mph (about 48 km/h) and 55 m at 60 mph (about 97 km/h). Doubling the speed makes the braking distance about four times as long.',
    source: 'The Highway Code (UK), rule 126, typical stopping distances, as quoted by Cornwall Council road safety',
    url: 'https://www.cornwall.gov.uk/fire-and-rescue-service/keeping-safe/road-safety/be-a-safer-driver/speeding/',
    alsoSee: 'https://www.gov.uk/guidance/the-highway-code/general-rules-techniques-and-advice-for-all-drivers-and-riders-103-to-158',
    checked: '2026-11-20',
    note: 'No official Singapore Traffic Police or LTA table of braking distances could be found online. The teacher may swap in Basic Theory of Driving figures.',
    usedIn: ['l3-kinetic', 'l7-work'],
  },
  'durian-fruit': {
    fact: 'A durian fruit typically has a mass of 1 kg to 3 kg. Wild durian trees grow 25 m to 50 m tall.',
    source: 'Wikipedia, "Durio" and "Durian"',
    url: 'https://en.wikipedia.org/wiki/Durio',
    checked: '2026-11-20',
    usedIn: ['l4-gpe'],
  },
  'tennis-rebound': {
    fact: 'An approved tennis ball dropped from 254 cm onto a hard surface must rebound to between 135 cm and 147 cm (medium and slow balls), so it returns to 53% to 58% of its drop height. The Lesson 6 model uses 55%.',
    source: 'ITF Rules of Tennis, Appendix I, 2023 technical booklet',
    url: 'https://www.itftennis.com/media/4420/2023-technical-booklet.pdf',
    checked: '2026-11-20',
    usedIn: ['l6-bounce'],
  },
  'skatepark-photo': {
    fact: 'Photo of a local skatepark for the Lesson 5 hook.',
    source: 'To be supplied by the teacher (public/photos/skatepark.jpg).',
    url: null,
    checked: null,
    usedIn: ['l5-ramp'],
  },
};
