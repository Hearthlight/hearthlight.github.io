// Chapter 9’s dungeon: Hollowmoor Manor — the house on the moor where every clock stopped
// at twenty to nine, the evening a letter didn’t come (saga/manor.js dresses it). Its
// mechanic is the clocks (room kind `clock`, saga/clocks.js): step on a grandfather clock’s
// plate and the room shifts between THEN (the manor in its heyday) and NOW (dust, rubble,
// floors fallen in); what stands in one time is gone in the other. The foyer · the hall (a
// door bricked up now, open then) · the stairhall (switch midway: then’s floor, now’s way
// out) · the dining room (a fight) · the gallery (two clocks, two switches) · the ballroom,
// where the Lady in Grey dances in the old days and haunts the new.

// the way in: the manor’s porch, on the moor east of Candlewick
export const MANOR_DOOR = [1175, 139.4];

export const HOLLOWMOOR = {
  id: 'hollowmoor', name: 'Hollowmoor Manor', lv: [37, 39], theme: 'manor', music: 'hollowmoor', slot: 8, ambient: 0.4,
  w: 44, h: 162,
  door: MANOR_DOOR,
  start: [22, 155],
  rooms: [
    { id: 'foyer', x: 14, z: 146, w: 16, h: 13, kind: 'start', rug: true,
      said: 'Hollowmoor Manor. Dust sheets, cold candles, and every clock in the house stopped at twenty to nine.',
      props: [['candelabra', 16, 148], ['candelabra', 28, 148], ['dustchair', 17, 155], ['dustchair', 27, 155], ['portrait', 22, 147.4]] },
    // (a door bricked up NOW — open THEN)
    { id: 'hall', x: 10, z: 118, w: 24, h: 20, kind: 'clock', era: 'now', clock: [30.5, 128], rug: true,
      now: { walls: [[22, 118.9, 6, 1.8, 'brick']] },
      then: { walls: [[14.5, 126, 2.4, 1, 'sofa']] },
      goalZ: 117.5, opens: ['g2'],
      said: 'A bricked-up doorway. A grandfather clock, stopped. Its plate is worn smooth, as if someone stood on it a great deal.',
      done: 'Through the old door!',
      props: [['candelabra', 12, 120.5], ['portrait', 13, 136, -1], ['dustchair', 27, 135]] },
    // (THEN’s floor to cross the gap, NOW’s to get past the shelves — switch in the middle)
    { id: 'stairhall', x: 8, z: 86, w: 28, h: 26, kind: 'clock', era: 'then', clock: [33.8, 97.5], back: [22, 110],
      now: { pits: [[22, 104, 28, 4]], walls: [[12, 98, 2, 2, 'rubble']] },
      then: { walls: [[22, 91.8, 28, 1.4, 'shelf']] },
      goalZ: 88.6, opens: ['g3'],
      said: 'The stairhall. Then, a library. Now, a hole where the floor used to be.',
      fell: 'The floor’s gone NOW — down you go, and back up the stairs. Cross it THEN.',
      done: 'Up the old stairs!',
      props: [['candelabra', 10, 109], ['candelabra', 34, 109], ['dustchair', 11, 96]] },
    { id: 'dining', x: 8, z: 60, w: 28, h: 20, kind: 'fight', rug: true, foesList: ['poltergeist', 'poltergeist', 'wisp', 'wisp', 'clockwork', 'bogling', 'poltergeist'], shout: 'The dining room! The china is flying by itself!', chest: [32, 63],
      props: [['candelabra', 10, 62], ['candelabra', 34, 62], ['portrait', 22, 61.4], ['dustchair', 12, 77], ['dustchair', 32, 77]] },
    // (two clocks: NOW past the sofas, THEN over the fallen floor, NOW through the brick)
    { id: 'gallery', x: 6, z: 26, w: 32, h: 30, kind: 'clock', era: 'now', clocks: [[8.2, 44.5], [35.8, 33.5]], back: [22, 53],
      then: { walls: [[22, 50.6, 32, 1.4, 'sofa'], [22, 30, 32, 1.2, 'brick']] },
      now: { pits: [[22, 40, 32, 4]] },
      goalZ: 29, opens: ['g5'],
      said: 'The portrait gallery. A girl with a songbook, over and over, growing up — and then no more portraits.',
      fell: 'Rotten boards — down you go! That floor was only whole THEN.',
      done: 'The ballroom doors swing open…',
      props: [['portrait', 12, 27.4, -1], ['portrait', 18, 27.4, -1], ['portrait', 26, 27.4, -1], ['candelabra', 8, 54], ['candelabra', 36, 54]] },
    // (the ballroom: the Lady, and four clocks)
    { id: 'ballroom', x: 2, z: 2, w: 40, h: 22, kind: 'clock', era: 'now', clocks: [[5, 4.6], [39, 4.6], [5, 18], [39, 18]], rug: true,
      now: {}, then: {},
      props: [['coldhearth', 22, 3.4], ['candelabra', 12, 4], ['candelabra', 32, 4], ['candelabra', 12, 21], ['candelabra', 32, 21]] },
  ],
  links: [
    { from: 'foyer', to: 'hall', gate: 'g1', gx: 22, gz: 142, open: true },
    { from: 'hall', to: 'stairhall', gate: 'g2', gx: 22, gz: 115 },
    { from: 'stairhall', to: 'dining', gate: 'g3', gx: 22, gz: 83 },
    { from: 'dining', to: 'gallery', gate: 'g4', gx: 22, gz: 57.5, open: true },
    { from: 'gallery', to: 'ballroom', gate: 'g5', gx: 22, gz: 25 },
  ],
};
