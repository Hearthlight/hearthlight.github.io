// Chapter 10’s dungeon: the Gloomstage — the Duchess’s flying opera house, moored over the
// Umbral Scar (saga/backstage.js dresses it: black boards, violet velvet, curtains that
// rise). Its mechanic is the spotlights (room kind `spot`, saga/spots.js): pools of light
// sweep the floor; anyone caught is « Spotted! » and marched back to the door; the shadow
// of a painted flat hides you. The stage door · the wings (one light) · Crumble’s workshop
// (Snuffbot Mk III) · under the stage (a fight; the prompter’s trapdoor) · the fly tower
// (two lights, the follow-spot, the lighting board — and the Understudies’ act) · the
// stage, where the Duchess gives her Grand Finale.

// the way in (and out): the edge of the Scar, where the Teacup sets down
export const STAGE_DOOR = [1350, 99.4];

export const GLOOMSTAGE = {
  id: 'gloomstage', name: 'The Gloomstage', lv: [39, 40], theme: 'backstage', music: 'gloomstage', slot: 9, ambient: 0.66,
  w: 44, h: 182,
  door: STAGE_DOOR,
  start: [22, 175],
  rooms: [
    { id: 'stagedoor', x: 14, z: 167, w: 16, h: 12, kind: 'start',
      said: 'The stage door of the Gloomstage. A brass star on it, and a name scratched off. Somewhere above, an orchestra of nobody is tuning up.',
      props: [['mirror', 16.5, 168.6], ['rack', 27, 169], ['gloomcrate', 16.5, 176], ['gloomcrate', 27.5, 176.5, 0.8], ['sandbag', 22, 169.5], ['ghostlight', 22, 173.2], ['worklight', 28.6, 177.6]] },
    // (one light, sweeping the wings: wait in a flat’s shadow, then go)
    { id: 'wings', x: 8, z: 136, w: 28, h: 25, kind: 'spot',
      lights: [{ path: [[10, 150], [34, 150], [34, 143], [10, 143]], r: 2.2, speed: 0.2 }],
      flats: [[15, 155, 4, 0.5], [29, 155, 4, 0.5], [22, 146.5, 6, 0.5], [12, 139.5, 3, 0.5], [32, 139.5, 3, 0.5]],
      goalZ: 138.2, opens: ['g2'], back: [22, 159],
      said: 'The wings. A spotlight sweeps the boards, looking for anyone out of place. The painted flats cast good, deep shadows.',
      done: 'Through the wings, unseen!',
      props: [['sandbag', 10, 158], ['sandbag', 34, 158], ['rack', 11, 137.5, 0.8], ['paintedmoon', 33, 137.5], ['worklight', 9.4, 160], ['worklight', 34.6, 160], ['worklight', 9.4, 141, 0.9], ['worklight', 34.6, 141, 0.9],
        ['pinrail', 8.4, 148, 18], ['ropes', 34, 136.8], ['catwalk', 35, 148, 20]] },
    // (Crumble’s workshop: the Snuffbot Mk III)
    { id: 'workshop', x: 6, z: 100, w: 32, h: 30, kind: 'script',
      props: [['gloomcrate', 9, 102], ['gloomcrate', 10, 104, 0.8], ['rack', 34, 103], ['sandbag', 8, 127], ['sandbag', 36, 127], ['mirror', 35, 126.5], ['workbench', 16, 102.4], ['worklight', 7.6, 110], ['worklight', 36.4, 110], ['worklight', 7.6, 121], ['worklight', 36.4, 121], ['ghostlight', 22, 127.6], ['wash', 15, 112], ['wash', 29, 112], ['wash', 22, 121]] },
    // (under the stage: every kind of gloom she ever hired, and the prompter’s trapdoor)
    { id: 'understage', x: 8, z: 74, w: 28, h: 20, kind: 'fight',
      foesList: ['stagehand', 'stagehand', 'stagehand', 'inkimp', 'inkimp', 'poltergeist', 'murkmoth', 'murkmoth', 'clockwork'],
      shout: 'Under the stage: stagehands — and every kind of gloom she ever hired!', chest: [32, 77], rich: true,
      props: [['sandbag', 11, 76], ['sandbag', 33, 91], ['gloomcrate', 10, 91], ['gloomcrate', 12, 92, 0.7], ['rack', 22, 75.5], ['worklight', 9.6, 80], ['worklight', 34.4, 80], ['worklight', 34.4, 92.4], ['wash', 22, 84, 0.8],
        ['ropes', 9.2, 86], ['ropes', 34.8, 85]] },
    // (the fly tower: two lights crossing, the follow-spot, the lighting board — and the Understudies’ act)
    { id: 'flytower', x: 4, z: 38, w: 36, h: 30, kind: 'spot',
      lights: [{ path: [[6, 60], [38, 60]], r: 2.2, speed: 0.16 }, { path: [[38, 51], [6, 51]], r: 2.2, speed: 0.16, phase: 0.35 }, { path: [[22, 44]], r: 1.9, speed: 2.1, follow: true }],
      flats: [[12, 55.5, 4, 0.5], [32, 55.5, 4, 0.5], [22, 56, 4, 0.5], [13, 46, 4, 0.5], [31, 46, 4, 0.5]],
      board: [36.5, 64.5], dark: 5,
      goalZ: 40.2, opens: ['g5'], back: [22, 66], handsN: 2,
      said: 'The fly tower: ropes, catwalks, lights — and the follow-spot, which hunts. A lever on the lighting board puts every light out.',
      done: 'Up and over — the stage is below!',
      props: [['sandbag', 6, 40], ['sandbag', 38, 40], ['gloomcrate', 6.5, 66], ['gloomcrate', 7.8, 66.5, 0.7], ['worklight', 5.6, 67, 0.9], ['worklight', 38.4, 67, 0.9],
        // (Release v9) the fly tower proper: catwalks up the side walls, the pin rail, ropes
        ['catwalk', 6.4, 53, 24], ['catwalk', 37.6, 53, 24], ['pinrail', 4.4, 53, 22], ['ropes', 10, 63.5], ['ropes', 34, 42.5], ['ropes', 21, 63.8, 1.1]] },
    // (the stage: the Grand Finale, the Lantern Cannon on its plate)
    { id: 'stage', x: 2, z: 2, w: 40, h: 30, kind: 'script',
      props: [['backdrop', 22, 2.3], ['footlights', 9, 29.6], ['footlights', 16, 29.6], ['footlights', 28, 29.6], ['footlights', 35, 29.6], ['worklight', 5, 5.5], ['worklight', 39, 5.5], ['sandbag', 12, 5], ['sandbag', 32, 5], ['wash', 13, 11], ['wash', 31, 11], ['wash', 22, 21], ['wash', 12, 25, 0.8], ['wash', 32, 25, 0.8],
        // (Release v9) the gantry over the backdrop, and the orchestra pit either side of the way in
        ['catwalkx', 22, 3.6, 30], ['orchestra', 10.5, 31.2, 13], ['orchestra', 33.5, 31.2, 13]] },
  ],
  links: [
    { from: 'stagedoor', to: 'wings', gate: 'g1', gx: 22, gz: 164, open: true },
    { from: 'wings', to: 'workshop', gate: 'g2', gx: 22, gz: 133 },
    { from: 'workshop', to: 'understage', gate: 'g3', gx: 22, gz: 97 },
    { from: 'understage', to: 'flytower', gate: 'g4', gx: 22, gz: 71, open: true },
    { from: 'flytower', to: 'stage', gate: 'g5', gx: 22, gz: 35 },
  ],
};
