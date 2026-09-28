// Chapter 6’s dungeon: the Forge Heart — an outdoor instance (saga/instance.js) down
// in Emberpeak’s caldera at dusk: black rock, lava lakes, the old smiths’ anvils,
// and the Gloomstage moored on the rim above. Its mechanic is the vents (room kind
// `vent`): geysers of hot air that breathe on a rhythm and throw whoever stands on
// them, in an arc, to where their arrow points. The rim · the lava moat (one vent)
// · the old foundry (magma imps & slugs) · the pressure lake (three vents share one
// pressure: cap two and the third throws far enough) · the chain (vent to vent over
// a lava river) · Crumble’s Snuffbot Mk II (vents in its arena blow it sky-high) ·
// the Duchess’s Debut, on her stage in the crater.

// the way in: the old smiths’ Forge Gate, on Emberpeak’s north-east slope
export const FORGE_DOOR = [448, 39.6];

// (a throw that lands in the lava: its third number is 1)
export const FORGEHEART = {
  id: 'forgeheart', name: 'The Forge Heart', lv: [27, 29], theme: 'forge', music: 'forgeheart', slot: 5,
  // at dusk in the caldera: basalt and ash, lava all round, the rim rising in cliffs
  outdoor: {
    zone: 'volcano', hour: 18.6, floor: 'basalt', path: 'ash', rim: 'ash', woods: 'lava', cliffs: [0, 2, 4],
    objs: [['boulder', 17, 186], ['boulder', 39, 184], ['boulder', 9, 158], ['boulder', 47, 130]],
  },
  w: 56, h: 196,
  door: FORGE_DOOR,
  start: [28, 189],
  rooms: [
    { id: 'rim', x: 20, z: 180, w: 16, h: 14, kind: 'start', ground: 'ash', said: 'The Forge Heart. The old smiths’ way down into Emberpeak — the air shimmers, the rocks tick in the heat.',
      props: [['anvil', 22.5, 184], ['anvil', 33.5, 186, 0.8], ['brazier', 23, 190], ['brazier', 33, 190]] },
    // (one vent over a band of lava: stand on it when it blows)
    { id: 'moat', x: 12, z: 152, w: 32, h: 20, kind: 'vent', lavas: [[28, 161, 16, 2.6, 'rect']], goal: [28, 155.5], goalZ: 158.2,
      vents: [{ at: [28, 167], to: [28, 155.5], period: 3.2 }], back: [28, 169.5],
      said: 'A river of lava, and a vent in the rock that breathes. Stand on it when it blows.',
      props: [['anvil', 16, 168], ['brazier', 40, 168], ['anvil', 40, 155], ['brazier', 16, 155]] },
    { id: 'foundry', x: 10, z: 126, w: 36, h: 18, kind: 'fight', ground: 'basalt', foesList: ['imp', 'imp', 'slug', 'slug', 'knight', 'imp'], shout: 'Magma imps in the old foundry — and they’ve lit the furnaces!', chest: [38, 129],
      props: [['anvil', 14, 130], ['anvil', 42, 140], ['furnace', 20, 129], ['furnace', 36, 140], ['brazier', 28, 142]] },
    // (three vents share one pressure: cap two, and the third throws far enough)
    { id: 'pressure', x: 8, z: 100, w: 40, h: 20, kind: 'vent', group: true, lavas: [[28, 107.8, 20, 4.4, 'rect']], goal: [28, 101.6], goalZ: 103.4, opens: ['g4'], back: [28, 118],
      vents: [
        { at: [16, 115.6], cap: [13.4, 117.6], tos: [[18, 110.5, 1], [20, 106.5, 1], [22, 101.8]], period: 3.4 },
        { at: [28, 115.6], cap: [25.4, 117.6], tos: [[28, 110.5, 1], [28, 106.5, 1], [28, 101.8]], period: 3.4, phase: 1.1 },
        { at: [40, 115.6], cap: [42.6, 117.6], tos: [[38, 110.5, 1], [36, 106.5, 1], [34, 101.8]], period: 3.4, phase: 2.2 },
      ],
      said: 'Three vents, one great lake. Each has a stone cap on a lever. The more you cap, the harder the others blow.', short: 'Not far enough — into the lava! Back to the rocks.',
      done: 'Across the lake!',
      props: [['brazier', 10, 118], ['brazier', 46, 118], ['anvil', 12, 101.5], ['anvil', 44, 101.5]] },
    // (a chain: vent to islet to vent, over a lava river — in rhythm)
    { id: 'chain', x: 18, z: 60, w: 20, h: 32, kind: 'vent', lavas: [[28, 76, 10, 11.5, 'rect']], isles: [[28, 81.5, 1.6], [28, 72, 1.6]], goal: [28, 63], goalZ: 64.5, back: [28, 90],
      vents: [
        { at: [28, 89.2], to: [28, 81.5], period: 3, phase: 0 },
        { at: [28, 81.5], to: [28, 72], period: 3, phase: 1.8 },
        { at: [28, 72], to: [28, 63], period: 3, phase: 0.5 },
      ],
      said: 'Islets in a river of lava, each with a vent. Ride them one after another — keep to the rhythm.',
      props: [['brazier', 20, 90], ['brazier', 36, 90], ['anvil', 21, 62], ['brazier', 35, 62]] },
    // (Crumble’s Snuffbot Mk II: vents in the floor — lure it onto one when it blows)
    { id: 'snuffbot', x: 10, z: 34, w: 36, h: 20, kind: 'vent', ground: 'basalt',
      vents: [{ at: [17, 40], to: [17, 40], period: 4, phase: 0, h: 2 }, { at: [39, 40], to: [39, 40], period: 4, phase: 2, h: 2 }, { at: [22, 49], to: [22, 49], period: 4, phase: 1, h: 2 }, { at: [34, 49], to: [34, 49], period: 4, phase: 3, h: 2 }],
      props: [['anvil', 13, 37], ['anvil', 43, 51], ['furnace', 12, 51], ['furnace', 44, 37]] },
    { id: 'debut', x: 6, z: 4, w: 44, h: 26, kind: 'script', ground: 'obsidian',
      props: [['brazier', 9, 26], ['brazier', 47, 26], ['brazier', 9, 8], ['brazier', 47, 8]] },
  ],
  links: [
    { from: 'rim', to: 'moat', gate: 'g1', gx: 28, gz: 176, open: true },
    { from: 'moat', to: 'foundry', gate: 'g2', gx: 28, gz: 148, open: true },
    { from: 'foundry', to: 'pressure', gate: 'g3', gx: 28, gz: 123, open: true },
    { from: 'pressure', to: 'chain', gate: 'g4', gx: 28, gz: 96 },
    { from: 'chain', to: 'snuffbot', gate: 'g5', gx: 28, gz: 57, open: true },
    { from: 'snuffbot', to: 'debut', gate: 'g6', gx: 28, gz: 31.5 },
  ],
};
