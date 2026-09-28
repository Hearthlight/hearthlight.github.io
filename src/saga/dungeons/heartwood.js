// Chapter 8’s dungeon: the Heartwood — inside the Great Tree of Elderbough (growth-ring
// floors, sap, glowing moss; saga/heartwood.js dresses it). Its mechanic is the firefly
// jars (room kind `jars`, saga/jars.js): moth swarms fill the passages; fireflies are
// the one light they can’t eat, and they’ll leave their post for a jar hung on a hook.
// The hollow · the first swarm (one jar, one hook) · the glowcaps (mushroom walls that
// part in a jar’s light, a swarm to lure off first) · the burrow (a fight) · the chase
// (a swarm that goes after whoever carries a jar) · the Moth Queen’s chamber, round the
// Heartlight.

// the way in: the arched door in the Great Tree’s trunk (Rootholm’s old hall)
export const HEART_DOOR = [958, 72.6];

export const HEARTWOOD = {
  id: 'heartwood', name: 'The Heartwood', lv: [35, 37], theme: 'heartwood', music: 'heartwood', slot: 7, ambient: 0.42,
  w: 44, h: 150,
  door: HEART_DOOR,
  start: [22, 144],
  rooms: [
    { id: 'hollow', x: 14, z: 136, w: 16, h: 12, kind: 'start',
      said: 'Inside the Great Tree: the Heartwood. It smells of sap and rain, and somewhere far above, a heart is beating very slowly.',
      props: [['shroom', 16, 138], ['shroom', 28, 139, 0.8], ['amber', 17, 145], ['glowworms', 27, 144]] },
    // (one swarm on the way out; one jar, one hook to lure it off)
    { id: 'swarm', x: 8, z: 108, w: 28, h: 22, kind: 'jars', racks: [[12, 126]], hooks: [[31, 123]], swarms: [{ at: [22, 111], r: 2.4, lure: 24 }], goalZ: 110.2, opens: ['g2'],
      said: 'A cloud of moths hangs across the way out, drinking the dark. The jars on the rack are full of fireflies.',
      done: 'The moths have gone to the jar — through!',
      props: [['shroom', 10, 110], ['shroom', 34, 128, 0.9], ['roots', 33, 112], ['amber', 11, 116], ['glowworms', 20, 127]] },
    // (glowcap walls part in a jar’s light — and a swarm to lure off first)
    { id: 'glowcaps', x: 6, z: 78, w: 32, h: 24, kind: 'jars', racks: [[22, 100]], hooks: [[9.5, 97], [9.5, 89], [34, 89]],
      swarms: [{ at: [30, 90], r: 2.2, lure: 30, chase: 5 }],
      doors: [{ at: [22, 94], w: 31, hook: 0 }, { at: [22, 85], w: 31, hook: 2 }], goalZ: 83.5, opens: ['g3'],
      said: 'Walls of glowcap mushrooms, dark and shut. Glowcaps open to light — the living kind.',
      done: 'Through the glowcaps!',
      props: [['amber', 36, 99], ['shroom', 8, 80, 0.8], ['glowworms', 36, 80]] },
    { id: 'burrow', x: 8, z: 54, w: 28, h: 18, kind: 'fight', foesList: ['rootling', 'rootling', 'mothling', 'mothling', 'beetle', 'murkmoth', 'murkmoth'], shout: 'Mothlings and rootlings, nesting in the heartwood!', chest: [32, 57],
      props: [['roots', 10, 56], ['roots', 34, 70], ['shroom', 11, 69], ['amber', 33, 62]] },
    // (a swarm that goes after anyone carrying a jar: run it to the far hook)
    { id: 'chase', x: 6, z: 26, w: 32, h: 22, kind: 'jars', racks: [[9, 45]], hooks: [[35, 29]], swarms: [{ at: [22, 29.5], r: 2.6, lure: 30, chase: 9, speed: 2.5 }], goalZ: 27, opens: ['g5'],
      said: 'This swarm is awake — it will come for any jar it sees. Run for the far hook!',
      snatched: 'The swarm catches you — and your jar! Back to the rack, and faster.',
      done: 'It settles on the jar. The way up is clear!',
      props: [['shroom', 8, 28], ['amber', 36, 46], ['glowworms', 14, 34], ['roots', 30, 44]] },
    // (the Moth Queen, round the Heartlight)
    { id: 'queen', x: 2, z: 2, w: 40, h: 20, kind: 'jars', racks: [[6, 18], [38, 18]], hooks: [[6.5, 6.5], [36.5, 6.5], [13, 15], [30, 15]], swarms: [{ at: [22, 10], r: 2.4, lure: 60, queen: true }], jarLife: 8,
      props: [['heartknot', 22, 4.2], ['shroom', 4, 12], ['shroom', 40, 12], ['glowworms', 12, 4], ['glowworms', 32, 4]] },
  ],
  links: [
    { from: 'hollow', to: 'swarm', gate: 'g1', gx: 22, gz: 132, open: true },
    { from: 'swarm', to: 'glowcaps', gate: 'g2', gx: 22, gz: 105 },
    { from: 'glowcaps', to: 'burrow', gate: 'g3', gx: 22, gz: 75.5 },
    { from: 'burrow', to: 'chase', gate: 'g4', gx: 22, gz: 51, open: true },
    { from: 'chase', to: 'queen', gate: 'g5', gx: 22, gz: 24 },
  ],
};
