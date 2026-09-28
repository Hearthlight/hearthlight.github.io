// Chapter 4’s dungeon: the Frostbell Halls — an outdoor instance (saga/instance.js)
// high on Frostpeak Glacier, where the Frost Tenor has sung the ice into a palace:
// a snowy pass between frozen cliffs in the bright noon sun, then the halls of
// blue ice. The pass · the slope (ice imps: the ice walls rise) · the singing
// bells (listen to the tune, ring it back — longer each round) · the frozen river
// (thin ice: find the path of thick white slabs) · the ice choir (a fight) · the
// eaves (icicles fall on marked spots) · Chief Frostbite · the Frost Tenor’s hall
// (four ice pillars to hide behind from his high C) · King Croakington’s crown.

// the way in: a gate of ice at the foot of the peaks, north-east of Frostpeak Camp
export const FROST_DOOR = [300, -108];

export const FROSTBELL = {
  id: 'frostbell', name: 'The Frostbell Halls', lv: [19, 21], theme: 'ice', music: 'frostbell', slot: 3,
  // under the noon sun: snow and pines, then glacier ice; frozen cliffs all round
  outdoor: {
    zone: 'glacier', hour: 11.5, floor: 'snow', rim: 'snow', woods: 'rock', cliffs: [0, 2, 4],
    objs: [['icespike', 6, 150], ['icespike', 50, 122], ['boulder', 5, 96], ['icespike', 51, 70], ['icespike', 4, 30], ['icespike', 52, 24]],
  },
  w: 56, h: 196,
  door: FROST_DOOR,
  start: [28, 189],
  rooms: [
    { id: 'pass', x: 20, z: 180, w: 16, h: 14, kind: 'start', said: 'The Frostbell Pass. Somewhere above, the ice is singing — one long, sad note.',
      props: [['flags', 28, 181.5], ['snowman', 22.5, 187, 0.9], ['iceshard', 33.5, 185, 0.8]] },
    { id: 'slope', x: 10, z: 154, w: 36, h: 18, kind: 'fight', foesList: ['frostimp', 'frostimp', 'frostimp', 'wisp', 'wisp', 'yeti'], shout: 'Ice imps! They’ve been waiting for an audience.', chest: [38, 160],
      props: [['iceshard', 14, 158], ['iceshard', 42, 166, 1.2], ['flags', 28, 169.5, 0.9], ['snowman', 16, 167.5]] },
    // (the singing bells: listen to the tune, ring it back — a note longer each round)
    { id: 'bells', x: 16, z: 132, w: 24, h: 16, kind: 'simon', bells: [[21.5, 142.4], [25.6, 139.8], [30.4, 139.8], [34.5, 142.4]], rounds: 3, opens: ['g3'], done: 'The bells sing your tune back to you — the ice wall sinks!',
      said: 'Four frozen bells. They are about to sing a tune: listen, then ring it back, bell by bell.', again: 'Right! Now a longer tune…', wrong: 'A sour note! Listen again…',
      props: [['iceshard', 18, 134, 0.8], ['iceshard', 38, 134, 0.8]] },
    // (thin ice: find the path of thick white slabs across the frozen river)
    { id: 'crevasse', x: 22, z: 104, w: 12, h: 22, kind: 'thinice', shape: 'rect', ground: 'glacier', ice: { x0: 22, z0: 104.4, cols: 6, rows: 10, size: 2, seed: 4, back: [28, 125.4] },
      said: 'A frozen river. Thick ice is white and holds; thin ice is clear and blue — and it won’t hold you.', wrong: 'Splash! Thin ice — back to the bank.',
      gust: 'A gust sweeps snow over the river — remember the way!',
      props: [['iceshard', 20, 106, 0.7], ['iceshard', 36, 118, 0.7]] },
    { id: 'lanterns', x: 12, z: 84, w: 32, h: 16, kind: 'fight', foesList: ['frostimp', 'frostimp', 'frostimp', 'wisp', 'wisp', 'yeti'], shout: 'The ice choir! They sing — very, very badly.', chest: [37, 90], ground: 'glacier',
      props: [['iceshard', 14, 87], ['iceshard', 42, 88], ['snowman', 40, 97, 0.8]] },
    { id: 'eaves', x: 18, z: 62, w: 20, h: 16, kind: 'wax', drop: 'icicle', every: 0.75, ground: 'glacier', said: 'Icicles hang from the palace eaves above — and they’re coming down!',
      props: [['iceshard', 20, 64, 0.9], ['iceshard', 36, 74, 0.9]] },
    { id: 'chief', x: 10, z: 40, w: 36, h: 16, kind: 'script', ground: 'glacier',
      props: [['iceshard', 13, 43, 1.1], ['iceshard', 43, 44, 1.1], ['flags', 28, 41.5, 1.1]] },
    { id: 'hall', x: 6, z: 12, w: 44, h: 24, kind: 'script', ground: 'glacier',
      props: [['iceshard', 9, 15, 1.2], ['iceshard', 47, 15, 1.2], ['iceshard', 9, 32, 1.1], ['iceshard', 47, 32, 1.1]] },
    { id: 'crown', x: 22, z: 1, w: 12, h: 8, kind: 'end', item: [28, 4], ground: 'glacier',
      props: [['crownstand', 28, 4], ['iceshard', 23.5, 2.5, 0.8], ['iceshard', 32.5, 2.5, 0.8]] },
  ],
  links: [
    { from: 'pass', to: 'slope', gate: 'g1', gx: 28, gz: 176, open: true },
    { from: 'slope', to: 'bells', gate: 'g2', gx: 28, gz: 151, open: true },
    { from: 'bells', to: 'crevasse', gate: 'g3', gx: 28, gz: 129 },
    { from: 'crevasse', to: 'lanterns', w: 3 },
    { from: 'lanterns', to: 'eaves', gate: 'g4', gx: 28, gz: 81, open: true },
    { from: 'eaves', to: 'chief', w: 3 },
    { from: 'chief', to: 'hall', gate: 'g5', gx: 28, gz: 38 },
    { from: 'hall', to: 'crown', gate: 'g6', gx: 28, gz: 10.5 },
  ],
};
