// Chapter 9’s dungeon: Hollowmoor Manor — the house on the moor where every clock stopped
// at twenty to nine, the evening a letter didn’t come (saga/manor.js dresses it). Its
// mechanic is the clocks (room kind `clock`, saga/clocks.js): step on a grandfather clock’s
// plate and the room shifts between THEN (the manor in its heyday) and NOW (dust, rubble,
// floors fallen in); what stands in one time is gone in the other. The foyer · the hall (a
// door bricked up now, open then) · the stairhall (a tired clock that runs a few seconds:
// then’s floor at a dash, now’s way out) · the dining room (a fight) · the gallery (two
// tired clocks, both times in the way: somebody keeps one ticking for the others) · the ballroom,
// where the Lady in Grey dances in the old days and haunts the new.

// the way in: the manor’s porch, on the moor east of Candlewick
export const MANOR_DOOR = [1175, 139.4];

export const HOLLOWMOOR = {
  id: 'hollowmoor', name: 'Hollowmoor Manor', lv: [34, 36], theme: 'manor', music: 'hollowmoor', slot: 8, ambient: 0.4,
  w: 44, h: 162,
  door: MANOR_DOOR,
  start: [22, 155],
  rooms: [
    { id: 'foyer', x: 14, z: 146, w: 16, h: 13, kind: 'start', rug: true,
      said: 'Hollowmoor Manor: dust, cold candles, and every clock stopped at twenty to nine.',
      props: [['candelabra', 16, 148], ['candelabra', 28, 148], ['dustchair', 17, 155], ['dustchair', 27, 155], ['portrait', 22, 147.4]] },
    // (a door bricked up NOW — open THEN)
    { id: 'hall', x: 10, z: 118, w: 24, h: 20, kind: 'clock', era: 'now', clock: [30.5, 128], rug: true,
      now: { walls: [[22, 118.9, 6, 1.8, 'brick']] },
      then: { walls: [[14.5, 126, 2.4, 1, 'sofa']] },
      // (the goal line: in the old doorway itself — a room only counts heroes a tile inside its edges)
      goalZ: 119.9, opens: ['g2'],
      said: 'NOW, this door is bricked up. Step on the plate at the foot of the clock: the room goes back to THEN.',
      task: 'Find a way through {key}the bricked-up door{/}',
      help: (d, r) => (r.ck.era === 'now' ? [[r.ck.clocks[0].x, r.ck.clocks[0].z + 1.2, 1.9]] : []),
      done: 'Through the old door!',
      props: [['candelabra', 12, 120.5], ['portrait', 13, 136, -1], ['dustchair', 27, 135]] },
    // (THEN’s floor to cross the gap, NOW’s to get past the shelves — and the only clock is a
    // tired one, by the door: it runs a few seconds, the time to dash over the floor that was)
    { id: 'stairhall', x: 8, z: 86, w: 28, h: 26, kind: 'clock', era: 'now', clocks: [[28, 108.9, 'wind']], back: [22, 110],
      lamps: [[10, 88], [34, 88], [10, 110], [34, 110], [10, 99], [34, 99]],
      now: { pits: [[22, 103, 28, 5]], walls: [[12, 97, 2, 2, 'rubble']] },
      then: { walls: [[22, 91.8, 28, 1.4, 'shelf']] },
      goalZ: 88.6, opens: ['g3'],
      said: 'The stairhall. THEN: a floor, and bookshelves in the way. NOW: no bookshelves… and no floor.',
      task: 'Cross the fallen floor in THEN, {key}before the tired clock runs down{/}', hint: 'The pale plate winds the clock: the old floor holds while it ticks',
      help: (d, r) => (d.P.players.some((p) => (p.connected || d.P.solo) && d.roomAt(p.pos.x, p.pos.z) === r && p.pos.z - d.oz > 105.5) ? [[r.ck.clocks[0].x, r.ck.clocks[0].z + 1.2, 1.9]] : []),
      fell: 'NOW, the floor is gone: down you go! Cross it THEN.',
      done: 'Up the old stairs!',
      props: [['candelabra', 10, 109], ['candelabra', 34, 109], ['dustchair', 11, 96]] },
    { id: 'dining', x: 8, z: 60, w: 28, h: 20, kind: 'fight', rug: true, foesList: ['poltergeist', 'poltergeist', 'wisp', 'wisp', 'clockwork', 'bogling', 'poltergeist'], shout: 'The dining room! The china is flying by itself!', chest: [32, 63],
      props: [['candelabra', 10, 62], ['candelabra', 34, 62], ['portrait', 22, 61.4], ['dustchair', 12, 77], ['dustchair', 32, 77]] },
    // (two tired clocks, and both times in the way: THEN over the fallen floor — a long one —, a
    // wait for NOW behind THEN’s bookshelves, THEN again for the last door, bricked up NOW. A hero
    // alone winds and runs; a party is too many for one winding: somebody keeps the clock ticking
    // for the others, who do the same from the far side)
    // (everything stands close: a party is never asked to stretch further than one picture holds)
    { id: 'gallery', x: 6, z: 26, w: 32, h: 30, kind: 'clock', era: 'now', clocks: [[10, 43.5, 'wind'], [34, 31.4, 'wind']], winds: [8, 3, 1.2], back: [22, 50],
      lamps: [[8, 28], [36, 28], [8, 53], [36, 53], [12, 37], [22, 37], [32, 37], [14, 45.5], [30, 45.5], [22, 32]],
      then: { walls: [[22, 34.6, 32, 1.2, 'shelf']] },
      now: { pits: [[22, 40, 32, 6]], walls: [[22, 30, 32, 1.2, 'brick']] },
      goalZ: 29, opens: ['g5'],
      said: 'The portrait gallery: the same girl with a songbook, growing up… then no more portraits. Two clocks to turn here.',
      task: 'Cross the gallery to {key}the ballroom doors{/}', hint: 'A tired clock ticks on while somebody stands on its plate',
      hintAt: [90, 180],
      // (the arrows: the south clock while anybody is still south of the fallen floor, else the north one — in NOW)
      help(d, r) {
        const zs = d.P.players.filter((p) => (p.connected || d.P.solo) && d.roomAt(p.pos.x, p.pos.z) === r).map((p) => p.pos.z - d.oz), [A, B] = r.ck.clocks;
        if (zs.some((z) => z > 43)) return A.run > 0 ? [] : [[A.x, A.z + 1.2, 1.9]];
        return r.ck.era === 'now' && zs.some((z) => z < 34.5) ? [[B.x, B.z + 1.2, 1.9]] : [];
      },
      fell: 'NOW, the boards are rotten: down you go! Cross them THEN.',
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
