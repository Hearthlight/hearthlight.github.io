// Chapter 3’s dungeon: the Old Mine — an outdoor instance (saga/instance.js):
// the Lamplighters’ old open-pit quarry in the Red Canyon, which Foreman Grubb
// has turned into his gloom works — terraced red walls in the evening sun,
// rails and derricks. The quarry gate · the sorting yard (mole miners & fuse
// imps: the barricades close) · the rail points (three levers switch the points:
// route the ore cart into the barricade) · the crystal cut (more points, the
// levers wired: each flips every set wearing its colour) · the blasting cut
// (fuse imps lob dynamite off the ledges) · the cart run (runaway ore carts down
// marked lanes) · the Mole Brothers · the Drillosaur’s pit (Foreman Grubb) · the
// Steppe’s Hearthstone in its cart.

// the old quarry road: a boarded gate in the mesa, on the west side of the mine yard
export const QUARRY_DOOR = [-223.8, 26.8];
export const QUARRY_GATE = [-225.4, 26.6];

export const OLDMINE = {
  id: 'oldmine', name: 'The Old Mine', lv: [13, 15], theme: 'mine', music: 'oldmine', slot: 2,
  // under the evening sun: red rock, terraced walls
  outdoor: {
    zone: 'canyon', hour: 17.7, floor: 'canyon', rim: 'mesa', woods: 'mesa', cliffs: [1, 2, 4],
    objs: [['cactus', 4, 186], ['cactus', 52, 178], ['cactus', 5, 120], ['cactus', 51, 98], ['cactus', 50, 44], ['deadtree', 6, 60]],
  },
  w: 56, h: 196,
  door: QUARRY_DOOR,
  start: [28, 189],
  rooms: [
    { id: 'gate', x: 20, z: 180, w: 16, h: 14, kind: 'start', said: 'The old quarry: the Lamplighters dug it long before the mine. Grubb’s gloom works fill it now.',
      props: [['timber', 28, 193.4], ['crates', 22.5, 183], ['lampost', 33.5, 186], ['cactus', 21.5, 189, 0.8], ['rails', 28, 186]] },
    { id: 'yard', x: 10, z: 156, w: 36, h: 18, kind: 'fight', foesList: ['mole', 'mole', 'fuse', 'fuse', 'slinger', 'mole'], shout: 'Mole miners! And they’ve brought dynamite.', chest: [37, 162],
      props: [['orecart', 16, 162], ['orecart', 40, 168, 0.9], ['derrick', 14, 170.5], ['crates', 38, 159], ['tnt', 20, 171], ['lampost', 28, 158], ['shack', 36.5, 169.5, 0.9],
        ['orepile', 21, 160, 1.1], ['orepile', 42, 163], ['barrels', 13, 166], ['rails', 28, 165, 1.4], ['rails', 20, 165.5, 0.8]] },
    // (the rail points: three levers switch the points; route the cart into the barricade)
    { id: 'switch', x: 16, z: 134, w: 24, h: 16, kind: 'points', shape: 'rect', opens: ['g3'], done: 'CRASH! The ore cart bursts through the barricade!',
      said: 'Three levers work the points. Route the ore cart into the barricade — then press the big red button.', wrong: 'Clunk. The cart ends up in a siding. Try other points.',
      rails: {
        nodes: { d: [20, 148.2], j1: [20, 144], x1: [18, 138.4], j2: [28, 144], x2: [37, 147.4], j3: [28, 139.6], x3: [36.4, 137.6], b: [28, 131.4] },
        next: { d: 'j1', j1: ['x1', 'j2'], j2: ['j3', 'x2'], j3: ['x3', 'b'] },
        levers: { j1: [21.8, 146.2], j2: [26.3, 145.8], j3: [26.3, 141.4] },
        start: { j1: 0, j2: 1, j3: 0 }, go: [23.2, 139.8], goal: 'b',
      },
      props: [['lampost', 38.4, 141.5], ['lampost', 17.6, 148.6], ['barrels', 33.5, 149], ['orepile', 22.5, 136.2, 0.8], ['tnt', 38.4, 144]] },
    // (more points, harder: the levers are wired — each flips every set wearing its colour)
    { id: 'crystals', x: 12, z: 112, w: 32, h: 16, kind: 'points', shape: 'rect', opens: ['g4'], done: 'The cart smashes through — the second barricade is gone!',
      said: 'More points — but these levers are wired together: each one flips every set of points that wears its colour.', wrong: 'Clunk. The cart ends up in a siding. Try other points.',
      rails: {
        nodes: { d: [17, 126.4], j1: [17, 122], x1: [14.2, 115.2], j2: [25, 122], x2: [33, 126], j3: [25, 117.4], x3: [19.6, 114], j4: [33, 117.4], x4: [40.5, 113.8], b: [28, 109.4] },
        next: { d: 'j1', j1: ['x1', 'j2'], j2: ['j3', 'x2'], j3: ['x3', 'j4'], j4: ['b', 'x4'] },
        levers: {
          red: { at: [19.8, 124.6], flips: ['j1', 'j3'], col: '#e0483e' },
          blue: { at: [22.4, 119.4], flips: ['j2', 'j3'], col: '#4a8ae8' },
          green: { at: [35.6, 121.2], flips: ['j4', 'j2'], col: '#4ac05a' },
        },
        start: { j1: 0, j2: 0, j3: 1, j4: 1 }, go: [30, 120.4], goal: 'b',
      },
      props: [['crystal', 13.6, 126.6], ['crystal', 42.2, 126.6], ['crystal', 42.4, 113.4, 0.8], ['crystal', 13.4, 119, 0.8], ['lampost', 38.5, 125.5]] },
    { id: 'blast', x: 18, z: 90, w: 20, h: 16, kind: 'wax', drop: 'dynamite', every: 0.8, said: 'Up on the ledges, fuse imps light their sticks — keep moving!',
      props: [['tnt', 20.5, 93], ['tnt', 35.5, 103], ['lampost', 36.5, 92], ['crates', 20, 103]] },
    { id: 'carts', x: 22, z: 62, w: 12, h: 22, kind: 'logs', roll: 'cart', shape: 'rect', every: 1.7, laneW: 4, speed: 8, said: 'Runaway ore carts! Jump them, or dodge between the lanes!',
      props: [['derrick', 19.5, 64, 0.9], ['lampost', 35.5, 72]] },
    { id: 'brothers', x: 10, z: 40, w: 36, h: 16, kind: 'script',
      props: [['crates', 14, 43], ['tnt', 41.5, 44], ['lampost', 28, 41.5], ['orecart', 42, 52, 0.9], ['orepile', 13, 52], ['barrels', 38, 42]] },
    { id: 'pit', x: 6, z: 12, w: 44, h: 22, kind: 'script',
      props: [['derrick', 8.5, 16], ['crates', 47, 16], ['lampost', 12, 30], ['lampost', 44, 30], ['orepile', 45, 27, 1.2], ['orepile', 10.5, 25]] },
    { id: 'vault', x: 22, z: 1, w: 12, h: 8, kind: 'end', item: [28, 4],
      props: [['hearthstone', 28, 4], ['rails', 28, 6.5, 0.6], ['lampost', 23.5, 2.5], ['lampost', 32.5, 2.5]] },
  ],
  links: [
    { from: 'gate', to: 'yard', gate: 'g1', gx: 28, gz: 177, open: true },
    { from: 'yard', to: 'switch', gate: 'g2', gx: 28, gz: 153, open: true },
    { from: 'switch', to: 'crystals', gate: 'g3', gx: 28, gz: 131 },
    { from: 'crystals', to: 'blast', gate: 'g4', gx: 28, gz: 109 },
    { from: 'blast', to: 'carts', w: 3 },
    { from: 'carts', to: 'brothers', w: 3 },
    { from: 'brothers', to: 'pit', gate: 'g6', gx: 28, gz: 37 },
    { from: 'pit', to: 'vault', gate: 'g7', gx: 28, gz: 10.5 },
  ],
};
