// Chapter 7’s dungeon: the Lantern Pagoda — the Dawn Monastery’s tower, floor after
// floor up to the roof (red lacquer, paper screens, gold; saga/pagoda.js dresses it).
// Its mechanic is the dawn beam (room kind `beam`, saga/beam.js): the kites’ light
// comes in through a golden lens, bronze mirrors turn to steer it (step on the plate
// in front of one), lotus lanterns lit by it open the way. The gate · the hall of
// mirrors (one mirror) · the paper screens (the beam burns its way through) · the
// ink imps’ floor · the split (a prism: two lotuses at once) · the roof, where Old
// Lucky, the Paper Dragon, circles the Dawn Mirror — and the Dawn Hearth above.

// the way in: the Pagoda’s door, on the Dawn Monastery’s court (the chapter opens it)
export const PAGODA_DOOR = [806, -114.4];

// (the roof: the Dawn Mirror in the middle, a perch on each of its eight lines)
export const ROOF = { x: 20, z: 15 };
export const PERCHES = [[20, 8.5], [25.5, 9.5], [27.5, 15], [25.5, 20.5], [20, 21.5], [14.5, 20.5], [12.5, 15], [14.5, 9.5]];

export const LANTERNPAGODA = {
  id: 'lanternpagoda', name: 'The Lantern Pagoda', lv: [31, 33], theme: 'pagoda', music: 'lanternpagoda', slot: 6, ambient: 0.52,
  w: 40, h: 150,
  door: PAGODA_DOOR,
  start: [20, 144],
  rooms: [
    { id: 'gate', x: 12, z: 136, w: 16, h: 12, kind: 'start',
      said: 'The Lantern Pagoda. Paper walls, red pillars — and the morning, caught in a golden lens, waiting to be let in.',
      props: [['plantern', 13.5, 138], ['plantern', 25.5, 138], ['incense', 20, 138], ['bonsai', 14, 145.5], ['bonsai', 26, 145.5]] },
    // (one mirror: turn it and the lotus blooms)
    { id: 'hall', x: 8, z: 110, w: 24, h: 18, kind: 'beam', sun: [9.5, 118, 'e'], mirrors: [[25, 118, 1]], lotus: [[25, 112.5]], opens: ['g2'],
      said: 'The Hall of Mirrors. The dawn comes in through the lens and runs along the floor. Step on a mirror’s plate to turn it.',
      done: 'The lotus lantern blooms — the doors open!',
      props: [['plantern', 10, 112], ['plantern', 30, 112], ['gong', 27, 125], ['scroll', 13, 111.4], ['scroll', 27, 111.4], ['teatable', 13, 125]] },
    // (paper screens across the light: it burns its way through, in order)
    { id: 'screens', x: 6, z: 84, w: 28, h: 20, kind: 'beam', sun: [32.5, 100, 'w'], mirrors: [[26, 100, 0], [26, 89, 0]],
      screens: [[26, 95, 'x', 3], [16, 89, 'z', 3]], lotus: [[9.5, 89]], opens: ['g3'],
      said: 'Paper screens. Paper burns. The morning is very, very hot up close.',
      done: 'Through the screens — the lotus blooms!',
      props: [['plantern', 8, 86], ['plantern', 32, 86], ['incense', 20, 102], ['bonsai', 8, 102], ['scroll', 20, 85.4]] },
    { id: 'ink', x: 8, z: 60, w: 24, h: 18, kind: 'fight', foesList: ['inkimp', 'inkimp', 'inkimp', 'paperlantern', 'paperlantern', 'paperbat', 'paperbat'], shout: 'Ink imps have been painting the walls — in gloom!', chest: [28, 63],
      props: [['plantern', 10, 62], ['plantern', 30, 62], ['teatable', 12, 75], ['gong', 28, 75]] },
    // (a prism splits the light in two: both lotuses at once)
    { id: 'split', x: 4, z: 30, w: 32, h: 24, kind: 'beam', sun: [35.5, 50, 'w'], prisms: [[20, 44]], mirrors: [[20, 50, 0], [8, 44, 0], [32, 44, 1]],
      screens: [[26, 44, 'z', 3]], lotus: [[8, 34], [32, 34]], opens: ['g5'],
      said: 'A crystal on a stand: it splits whatever light it’s given. Two lotuses, two beams.',
      done: 'Both lotuses bloom — the way to the roof opens!',
      props: [['plantern', 6, 32], ['plantern', 34, 32], ['plantern', 6, 52], ['plantern', 34, 52], ['incense', 14, 50], ['bonsai', 26, 50]] },
    // (the roof: the Dawn Mirror, and Old Lucky)
    { id: 'roof', x: 2, z: 4, w: 36, h: 22, kind: 'beam', tiles: true, dawn: { at: [ROOF.x, ROOF.z], r: 2, dir: 4 },
      props: [['plantern', 4, 6], ['plantern', 36, 6], ['plantern', 4, 24], ['plantern', 36, 24], ['hearth', 20, 6]] },
  ],
  links: [
    { from: 'gate', to: 'hall', gate: 'g1', gx: 20, gz: 131, open: true },
    { from: 'hall', to: 'screens', gate: 'g2', gx: 20, gz: 106 },
    { from: 'screens', to: 'ink', gate: 'g3', gx: 20, gz: 81 },
    { from: 'ink', to: 'split', gate: 'g4', gx: 20, gz: 57, open: true },
    { from: 'split', to: 'roof', gate: 'g5', gx: 20, gz: 28 },
  ],
};
