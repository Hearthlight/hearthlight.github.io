// Chapter 1's dungeon: the Glimmer Grotto, the sea caves under Old Glimmer.
// The mouth (crystals, shells) · the rock pools (gloom crabs: the doors lock) ·
// Old Glimmer's light (a crack in the rock lets it down; the Lamplighters' old
// mirrors turn it onto a sea crystal — room kind `beam`, look `cave`) ·
// the Understudies' stage (their Juggling Act) · the
// wax gallery (the Snuffer's hot wax drips) · Crumble's Snuffbot 3000 · the
// shrine where the last ember of Old Glimmer waits.

import { t } from '../../i18n.js';

// rooms in local tiles: x, z (north-west corner), w, h — the way goes north (up the screen)
export const GROTTO = {
  id: 'grotto', name: 'The Glimmer Grotto', lv: [3, 5], theme: 'cave', music: 'grotto', slot: 0,
  w: 48, h: 118,
  door: [125.5, 100.5],
  start: [24, 111],
  rooms: [
    { id: 'mouth', x: 16, z: 102, w: 16, h: 13, kind: 'start', said: 'Your lantern flickers. Somewhere below, an ember answers.',
      props: [['crystal', 19, 106], ['crystal', 29, 109, 0.8], ['shell', 21, 111], ['shell', 27, 112], ['rock', 18, 110, 0.8], ['torch', 30, 105]] },
    { id: 'pools', x: 9, z: 80, w: 30, h: 19, kind: 'fight', pools: [[15, 86, 3.2, 2.2], [32, 92, 3.6, 2.4], [22, 94, 2.2, 1.4]],
      foesList: ['reefcrab', 'reefcrab', 'shellback', 'gloomling', 'gloomling'], shout: 'Gloom crabs scuttle out of the pools!', chest: [24, 88],
      props: [['crystal', 12, 90], ['crystal', 36, 84], ['rock', 34, 88, 1.2], ['shell', 26, 96], ['shell', 18, 83], ['torch', 12, 83], ['torch', 36, 96]] },
    { id: 'plates', x: 12, z: 62, w: 24, h: 14, kind: 'beam', look: 'cave', sun: [33.5, 72, 'w'], mirrors: [[17, 72, 0], [17, 65.5, 1]], lotus: [[31, 65.5]], opens: ['g3'],
      done: 'The sea crystal blazes — the rock door grinds open!', said: 'A crack high in the rock lets down a thread of Old Glimmer’s own light. The old Lamplighters left mirrors here: step on a mirror’s plate to turn it.',
      props: [['crystal', 14, 64, 0.8], ['crystal', 34, 64, 0.8], ['torch', 15, 74.5], ['shell', 25, 70], ['rock', 24, 63.5, 0.8]] },
    { id: 'stage', x: 8, z: 42, w: 32, h: 16, kind: 'script',
      props: [['stageboards', 24, 45.5], ['spot', 16, 49], ['spot', 32, 49], ['candle', 12, 47, 1.2], ['candle', 36, 47, 1.2], ['barrel', 11, 53], ['barrel', 37, 54]] },
    { id: 'wax', x: 18, z: 26, w: 12, h: 13, kind: 'wax', every: 0.85, said: 'Hot wax drips from the ceiling — mind the dark spots!',
      props: [['candle', 19.5, 28, 1.4], ['candle', 28.5, 31, 1.1], ['candle', 19.5, 35, 0.9], ['candle', 28.5, 37, 1.3]] },
    { id: 'lair', x: 6, z: 8, w: 36, h: 16, kind: 'script',
      props: [['brazier', 9, 14], ['brazier', 39, 14], ['brazier', 11, 21], ['brazier', 37, 21], ['crystal', 24, 22, 0.8]] },
    { id: 'shrine', x: 18, z: 1, w: 12, h: 8, kind: 'end', item: [24, 4],
      props: [['pedestal', 24, 4], ['crystal', 20, 3, 0.7], ['crystal', 28, 3, 0.7]] },
  ],
  links: [
    { from: 'mouth', to: 'pools', gate: 'g1', gx: 24, gz: 98.5, open: true },
    { from: 'pools', to: 'plates', gate: 'g2', gx: 24, gz: 78, open: true },
    { from: 'plates', to: 'stage', gate: 'g3', gx: 24, gz: 60 },
    { from: 'stage', to: 'wax', gate: 'g4', gx: 24, gz: 40.5 },
    { from: 'wax', to: 'lair', w: 3 },
    { from: 'lair', to: 'shrine', gate: 'g6', gx: 24, gz: 8.5 },
  ],
};

export { t };
