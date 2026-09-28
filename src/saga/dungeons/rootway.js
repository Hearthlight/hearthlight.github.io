// Chapter 2’s dungeon: the Rootway — an outdoor instance (saga/instance.js):
// behind the falls at the foot of the Heights lies a hidden valley of the
// Deepwood, glades strung along a dirt path under cliffs and old trees, in the
// long light of late afternoon. The glade behind the falls · the root arches
// (rootlings: the roots close the way) · the fireflies’ dell (three braziers to
// light in the order the fireflies count) · the burrow fields (badger kits) ·
// Grumbleclaw’s den (the gloom badger) · the log slide (logs roll down marked
// lanes: jump them) · the Heartwood (Barkbeard), a stream falling into its
// pool · the Deepwood’s Great Hearth at the foot of the Heart Tree.

import { fbm } from '../../engine/util.js';
import { BIG } from '../../world/big/layout.js';

// the falls: where the Heights’ river drops off the plateau into the gorge
// (the same cliff line gen.js draws)
const cliffZ = (x) => -46 + Math.round((fbm(x * 0.045, 3.3, BIG.SEED + 7, 3) - 0.5) * 12);
export const FALLS = { x: 112, z: cliffZ(112) };
export const ROOTWAY_DOOR = [108.5, FALLS.z + 2.4];

export const ROOTWAY = {
  id: 'rootway', name: 'The Rootway', lv: [8, 10], theme: 'roots', music: 'rootway', slot: 1,
  // under the open sky: the Deepwood’s palettes & trees, a late-afternoon sun
  outdoor: {
    zone: 'deepwood', hour: 15.6, floor: 'grass', cliffs: [2, 4],
    // a stream off the plateau, falling into the Heartwood’s pool
    paint(T) { for (let z = -14; z <= 11; z++) for (let x = 36; x <= 37; x++) T.set(x + (z < -4 ? 1 : 0), z, T.TT.WATER); },
    // old giants framing the glades, and the Heart Tree over the Hearth
    objs: [['elderoak', 13, 139.5], ['elderoak', 35.5, 141], ['elderoak', 42.5, 118], ['elderoak', 5, 131], ['elderoak', 10.5, 97], ['elderoak', 37.5, 98.5],
      ['elderoak', 3.5, 80], ['elderoak', 16, 33], ['elderoak', 32, 36.5], ['elderoak', 3.5, 12.5], ['elderoak', 44.5, 15], ['elderoak', 24, -2.8, { big: 2.2 }]],
  },
  w: 48, h: 152,
  door: ROOTWAY_DOOR,
  start: [24, 145],
  rooms: [
    { id: 'falls', x: 16, z: 138, w: 16, h: 12, kind: 'start', said: 'Behind the falls: a hidden valley, deep in the roots of the Deepwood.', pools: [[28.6, 141.6, 2.4, 1.5]],
      props: [['flowers', 19, 141], ['flowers', 25.5, 140, 1.2], ['stump', 18.5, 146, 0.9], ['log', 29.5, 146.5, 0.8], ['fireflies', 24, 143]] },
    { id: 'hall', x: 8, z: 116, w: 32, h: 18, kind: 'fight', foesList: ['rootling', 'rootling', 'rootling', 'gloomling', 'kit'], shout: 'The roots writhe — rootlings!', chest: [24, 122],
      props: [['roots', 12, 120, 1.5], ['roots', 36, 127, 1.6], ['stones', 15, 124], ['flowers', 32, 119], ['log', 13, 129], ['stump', 35, 130.5, 0.8]] },
    { id: 'glow', x: 12, z: 96, w: 24, h: 16, kind: 'torches', torches: [[16, 106, 2], [24, 101, 3], [32, 106, 1]], opens: ['g3'], done: 'The braziers roar — the roots draw back!',
      said: 'Three cold braziers in the shade. Above each, fireflies gather: two… three… one.', wrong: 'The flames gutter out. The fireflies blink, patient: one… two… three…', ground: 'forest',
      props: [['shroom', 15, 109.5, 0.9], ['shroom', 33, 109.5], ['flowers', 24, 109.5]] },
    { id: 'burrows', x: 6, z: 74, w: 36, h: 18, kind: 'fight', pools: [[13, 80, 2.2, 1.4], [35, 84, 2.4, 1.5], [22, 88, 1.8, 1.2]], foesList: ['kit', 'kit', 'kit', 'rootling', 'rootling', 'sapling'], shout: 'Badger kits, all teeth!', chest: [30, 78],
      props: [['burrow', 11.5, 84.5], ['burrow', 29, 89, 1.1], ['burrow', 26, 78.5, 0.9], ['burrow', 17.5, 79], ['roots', 39, 79, 0.9], ['flowers', 9, 87]] },
    { id: 'den', x: 10, z: 54, w: 28, h: 16, kind: 'script', ground: 'path',
      props: [['burrow', 24, 56.2, 2.2], ['hoard', 19.5, 59], ['stump', 13.5, 65], ['stump', 34.5, 65, 0.9], ['roots', 31, 57.5, 0.8]] },
    { id: 'logs', x: 19, z: 30, w: 10, h: 20, kind: 'logs', shape: 'rect', ground: 'leaves', every: 1.6, laneW: 4.5, speed: 7, said: 'Logs rumble down the slope — jump them, or dodge between the lanes!',
      props: [['logpile', 24, 31.2, 0.9]] },
    { id: 'heart', x: 6, z: 10, w: 36, h: 16, kind: 'script', pools: [[37, 13.2, 2.4, 1.6]],
      props: [['roots', 9.5, 14, 1.5], ['roots', 39, 20.5, 1.4], ['stones', 12, 22], ['flowers', 30, 23], ['fireflies', 24, 18]] },
    { id: 'hearth', x: 18, z: 1, w: 12, h: 8, kind: 'end', item: [24, 4], ground: 'forest',
      props: [['hearth', 24, 4], ['flowers', 20, 6.5], ['flowers', 28, 6.5]] },
  ],
  links: [
    { from: 'falls', to: 'hall', gate: 'g1', gx: 24, gz: 136.5, open: true },
    { from: 'hall', to: 'glow', gate: 'g2', gx: 24, gz: 114.5, open: true },
    { from: 'glow', to: 'burrows', gate: 'g3', gx: 24, gz: 94.5 },
    { from: 'burrows', to: 'den', gate: 'g4', gx: 24, gz: 72.5, open: true },
    { from: 'den', to: 'logs', gate: 'g5', gx: 24, gz: 52.5 },
    { from: 'logs', to: 'heart', w: 3 },
    { from: 'heart', to: 'hearth', gate: 'g6', gx: 24, gz: 9.5 },
  ],
};
