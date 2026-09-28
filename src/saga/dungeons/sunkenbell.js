// Chapter 5’s dungeon: the Sunken Bell Temple — an outdoor instance (saga/instance.js)
// in the Sunken City under a hot noon sun: a drowned temple of pale stone and
// verdigris bronze, the lagoon all round. Its mechanic is the tide (room kind
// `tide`): the sea covers the floors (you wade); ring a tide bell and it draws back
// for a while — the sluice gates open — then it comes back in and they shut.
// The causeway · the forecourt (one bell, a dash) · the colonnade (jellyfish,
// crabs, a drowned lamplighter's ghost) · the tide pools (a bell at the far end,
// crabs on the wet sand) · the twin bells (they must ring together) · the
// Synchronised Swimmers' pool (drain it and they flop) · the Gloom Kraken's hall
// (the great Sunken Bell drains the whole arena) · the Great Hearth of the South.

// the way in: the steps of the domed temple on its islet, south-east of the Sunken City
export const SUNKEN_DOOR = [91.5, 248.2];

export const SUNKENBELL = {
  id: 'sunkenbell', name: 'The Sunken Bell Temple', lv: [24, 26], theme: 'sea', music: 'sunkenbell', slot: 4,
  // under the noon sun: sand and flagstones, the lagoon's shallows all round
  outdoor: {
    zone: 'sunken', hour: 12.5, floor: 'ruins', path: 'sand', rim: 'sand', woods: 'water', cliffs: false,
    objs: [['palm', 17.6, 186], ['palm', 38.4, 183], ['palm', 9.8, 160], ['palm', 46.2, 166], ['palm', 5.8, 110], ['palm', 50.2, 115], ['palm', 11.6, 86], ['palm', 44.4, 90]],
  },
  w: 56, h: 196,
  door: SUNKEN_DOOR,
  start: [28, 189],
  rooms: [
    { id: 'causeway', x: 20, z: 180, w: 16, h: 14, kind: 'start', ground: 'sand', said: 'The Sunken Bell Temple. The sea breathes in and out of it — slowly, like something asleep.',
      props: [['column', 21.5, 183], ['column', 34.5, 184, 0.9], ['coral', 22.5, 190], ['kelp', 34, 191], ['urn', 33, 181.5, 0.8], ['caustics', 28, 187]] },
    // (the tide, first: one bell by the door, the sluice across the court)
    { id: 'forecourt', x: 12, z: 154, w: 32, h: 18, kind: 'tide', bells: [[21.5, 168.6]], window: 10, opens: ['g2'], pools: [[16.5, 158.5, 1.8, 1.2], [38.5, 160, 2, 1.3]],
      said: 'A flooded court. A little bronze bell hangs on a coral post: “Ring, and the sea shall step aside.”',
      props: [['column', 14, 157], ['column', 42, 158], ['column', 14.5, 169], ['statue', 41, 168], ['kelp', 36, 163], ['coral', 17, 162], ['caustics', 24, 165], ['caustics', 34, 160], ['fishschool', 16.5, 158.5, 0.6], ['fishschool', 38.5, 160, 0.65]] },
    { id: 'colonnade', x: 10, z: 128, w: 36, h: 18, kind: 'fight', ground: 'ruins', foesList: ['jelly', 'jelly', 'reefcrab', 'reefcrab', 'ghost', 'mender'], shout: 'Gloom jellyfish drift between the columns!', chest: [38, 131],
      props: [['column', 13, 131], ['column', 13, 142], ['column', 43, 131], ['column', 43, 142], ['statue', 20, 130.5, 0.9], ['urn', 36, 143], ['clam', 17, 137], ['kelp', 40, 136], ['caustics', 28, 137]] },
    // (the bell at the far end of the pools: ring it and run — crabs come out on the wet sand)
    { id: 'tidepools', x: 8, z: 104, w: 40, h: 18, kind: 'tide', ground: 'sand', bells: [[44.4, 118.6]], window: 9, crabs: 3, opens: ['g4'],
      pools: [[13.5, 110, 2, 1.4], [21, 116.5, 2.4, 1.6], [34.5, 111.5, 2.2, 1.5], [40.5, 116, 1.6, 1.1], [26, 108, 1.4, 1]],
      said: 'The tide pools. The bell is right at the far end — the sluice is not.',
      props: [['coral', 11, 107], ['coral', 18.5, 119, 1.2], ['clam', 38, 107], ['kelp', 11, 116], ['column', 44, 106], ['urn', 30, 118.5, 0.8], ['shell', 25, 113], ['shell', 31, 115.5], ['shell', 16, 113.5], ['coral', 29, 110.5, 0.8]] },
    // (two bells at once: two heroes, or one very quick one)
    { id: 'twinbells', x: 14, z: 80, w: 28, h: 16, kind: 'tide', bells: [[24, 87], [32, 87]], together: 2.6, window: 9, opens: ['g5'],
      said: 'Two bells, side by side. The inscription: “Together, or not at all.”', alone: 'One bell alone isn’t enough — they must ring together!',
      props: [['statue', 17, 83, 0.9], ['statue', 39, 83, 0.9], ['column', 16.5, 93], ['column', 39.5, 93], ['kelp', 28, 92], ['caustics', 22, 88], ['caustics', 34, 86]] },
    // (the Synchronised Swimmers' pool: its two bells drain it — the fight is the chapter's script)
    { id: 'swimmers', x: 10, z: 50, w: 36, h: 22, kind: 'tide', ground: 'ruins', bells: [[23, 68], [33, 68]], together: 3, window: 8, cooldown: 2, opens: [],
      alone: 'One bell alone isn’t enough — they must ring together!',
      props: [['column', 12.5, 53], ['column', 43.5, 53], ['column', 12.5, 69], ['column', 43.5, 69], ['coral', 16, 60], ['coral', 40, 62], ['kelp', 14, 66], ['kelp', 42, 57], ['caustics', 28, 61]] },
    // (the Kraken's hall: the great Sunken Bell drains it all)
    { id: 'kraken', x: 6, z: 14, w: 44, h: 30, kind: 'tide', ground: 'ruins', bells: [[18, 37.5]], greatBell: true, window: 10, cooldown: 8, opens: [],
      props: [['column', 8.5, 17], ['column', 47.5, 17], ['column', 47.5, 41], ['statue', 44, 29, 1.2], ['coral', 10, 24], ['kelp', 45, 36], ['caustics', 28, 29, 1.4]] },
    { id: 'chamber', x: 22, z: 1, w: 12, h: 9, kind: 'end', item: [28, 4], ground: 'ruins',
      props: [['column', 23.5, 2.5, 0.8], ['column', 32.5, 2.5, 0.8], ['coral', 24, 8], ['coral', 32, 8]] },
  ],
  links: [
    { from: 'causeway', to: 'forecourt', gate: 'g1', gx: 28, gz: 176, open: true },
    { from: 'forecourt', to: 'colonnade', gate: 'g2', gx: 28, gz: 151 },
    { from: 'colonnade', to: 'tidepools', gate: 'g3', gx: 28, gz: 125, open: true },
    { from: 'tidepools', to: 'twinbells', gate: 'g4', gx: 28, gz: 101 },
    { from: 'twinbells', to: 'swimmers', gate: 'g5', gx: 28, gz: 77 },
    { from: 'swimmers', to: 'kraken', gate: 'g6', gx: 28, gz: 47 },
    { from: 'kraken', to: 'chamber', gate: 'g7', gx: 28, gz: 11.5 },
  ],
};
