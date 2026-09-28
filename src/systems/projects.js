// Town projects: fund them at the notice board and the cove changes
// overnight — flower beds, road lanterns, a playground, a beach bonfire and
// a bandstand for Sol. Each one is a small, permanent, visible difference.

import { OX, OZ } from '../world/overworld.js';

const V = (x, z) => [x + OX, z + OZ];

export const PROJECTS = [
  {
    id: 'flowers', name: 'Plaza Flower Beds', cost: 600,
    desc: 'Beds of tulips & daisies around the plaza. Ivy has been dreaming of this for years.',
    objects: [
      ['flowerbed', 91, 62.9, { w: 3 }], ['flowerbed', 86.4, 76.2, { w: 2.4 }], ['flowerbed', 95.6, 76.2, { w: 2.4 }],
      ['flowerbed', 82.7, 65.6, { w: 1.2, h: 2.2 }], ['flowerbed', 82.7, 73.4, { w: 1.2, h: 2.2 }],
      ['flowerbed', 100.3, 65.6, { w: 1.2, h: 2.2 }], ['flowerbed', 100.3, 73.4, { w: 1.2, h: 2.2 }],
    ],
    letter: 'The plaza is blooming! Ivy was up at dawn planting tulips and she hasn’t stopped smiling since. Thank you for making the cove a little more colorful.',
  },
  {
    id: 'lamps', name: 'Country Road Lanterns', cost: 900,
    desc: 'Lanterns along the forest trail, the hill path and the bluffs road. No more stumbling home in the dark.',
    objects: [
      ['lamp', 56, 80.6], ['lamp', 42, 83.4], ['lamp', 28, 86.4], ['lamp', 86.4, 35.6], ['lamp', 64, 23.4], ['lamp', 54.2, 21.2],
      ['lamp', 145.2, 58.4], ['lamp', 151.6, 46], ['lamp', 157.2, 37.6],
    ],
    letter: 'The new lanterns are lit! Juniper says the owls are furious, but everyone else is delighted. Evening walks just got a lot cozier.',
  },
  {
    id: 'playground', name: 'Pip’s Playground', cost: 1400,
    desc: 'A swing set, a slide and a sandbox by the orchard. Pip has drawn up detailed plans. In crayon.',
    objects: [['swings', 104.4, 83.4], ['slide', 107.8, 84.2], ['sandbox', 104.8, 86.4]],
    letter: 'THE PLAYGROUND IS OPEN!!! I went down the slide 47 times. Mom made me stop for lunch. You’re the best. — Pip (Rosa helped with the spelling)',
  },
  {
    id: 'bonfire', name: 'Beach Bonfire', cost: 1000,
    desc: 'A stone fire pit with log seats on Driftwood Beach, lit every evening for anyone who wants to sit a while.',
    objects: [['campfire', 66.5, 93.3], ['logseat', 64.9, 94.3, { rot: 0.5 }], ['logseat', 68.1, 94.4, { rot: -0.5 }], ['logseat', 66.6, 91.7]],
    letter: 'The bonfire pit is finished! Finn has already claimed the best log. Come sit by the fire some evening — the sunsets from there are something else.',
  },
  {
    id: 'bandstand', name: 'Plaza Bandstand', cost: 2400,
    desc: 'A little bandstand in the plaza where Sol can play his evening songs — with proper acoustics.',
    objects: [['bandstand', 91, 74.6]],
    letter: 'The bandstand is up, and Sol has already written a song about it. It’s called “Bandstand”. It’s very good. Come listen tonight!',
  },
];

export const PROJECT_POINTS = {
  playground: [106.2, 85.8],
  bonfire: [64.9, 94.75],
  bandstand: V(47, 34.3),
};
