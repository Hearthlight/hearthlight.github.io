// Release v9: four more heroes, from the rest of Nana June's old kit — the Lamplighter's lantern
// pole (light that blinds the gloom), the Gardener's watering can (seeds, vines & sprouts), the
// Cook's whisk (quick flurries, snacks for everyone) and the Tinkerer's wrench (a spring glove,
// traps and a tea turret). Same fields as classes.js; what's new (see kit9.js):
//   lit: s — the foe glows: everyone's hits on it +15% · blind: s — a foe loses its target and
//   wanders (bosses only glow) · root: s — it can't move (still attacks)
//   spark (a burst of light at a thrust's tip) · heat (the Cook's gauge) · glove (a spring punch)
//   kinds: vines (a line of erupting vines), trap (a spring trap on the ground), beacon, sprouts,
//   snack, turret (the specials) · dodge: flash · petal · slide · spring (instead of the roll)

const I = (g, s) => ({ g, s });

export const CLASSES9 = {
  lamplighter: {
    name: 'Lamplighter', weapon: 'lanternpole', color: '#f6d06a', icon: 'lantern',
    icons: { light: I('lantern', 'holy'), heavy: I('flare', 'holy'), special: I('beacon', 'holy'), air: I('star', 'holy') },
    desc: 'Sweeps of warm light from June’s lantern pole: the gloom glows, blinks, and loses its way.',
    role: 'Light & control · blinds', stats: { tough: 3, reach: 3, speed: 2, help: 4 },
    kit: 'June’s lantern pole — the very one she lit this town with. It’s been waiting for someone like you.',
    ready: 'Good thing you’ve got that lantern pole.',
    hp: 125, speed: 1, armor: 0.05,
    light: [
      { kind: 'melee', dmg: 10, range: 1.9, arc: 1.8, knock: 1.4, windup: 0.09, recover: 0.17, pose: 'swing', sfx: 'whoosh', lit: 3 },
      { kind: 'melee', dmg: 10, range: 1.9, arc: 1.8, knock: 1.4, windup: 0.09, recover: 0.17, pose: 'backswing', sfx: 'whoosh', lit: 3 },
      { kind: 'melee', dmg: 15, range: 2.2, arc: 1.1, knock: 3.2, windup: 0.11, recover: 0.28, pose: 'point', sfx: 'whack', lunge: 3.5, lit: 4, spark: 1.2, hitstop: 0.05 },
    ],
    heavy: { kind: 'aoe', name: 'Flare', dmg: 20, at: 1.3, r: 2.3, knock: 3, blind: 2.2, lit: 5, windup: 0.16, recover: 0.36, pose: 'smash', sfx: 'glow', flare: true, shake: 0.15, ring: '#fff3a6' },
    special: { kind: 'beacon', name: 'Beacon', cd: 10, dur: 6, r: 3.6, every: 0.8, dmg: 6, blind: 1.3, lit: 2, heal: 0.015, sfx: 'glow' },
    air: { kind: 'aoe', name: 'Falling Star', dmg: 13, at: 0, r: 1.6, knock: 3, blind: 1.2, lit: 3, onLand: true, sfx: 'slam', shake: 0.2 },
    dodge: { kind: 'flash', r: 1.9, blind: 1.1 },
  },
  gardener: {
    name: 'Gardener', weapon: 'wateringcan', color: '#3fb49a', icon: 'sprout',
    icons: { light: I('seed', 'nature'), heavy: I('vine', 'nature'), special: I('sprout', 'nature'), air: I('leaf', 'nature') },
    desc: 'Seeds that sprout thorns, vines that hold the gloom fast, and little sprouts that fight beside you.',
    role: 'Control & summons · roots', stats: { tough: 2, reach: 4, speed: 2, help: 4 },
    kit: 'June’s watering can. Her roses won prizes three years running — the judges never asked what was in the water.',
    ready: 'Good thing you’ve got that watering can.',
    hp: 105, speed: 1, armor: 0,
    light: [
      { kind: 'shot', dmg: 7, speed: 9, r: 0.24, life: 0.6, gravity: 9, lob: 3, windup: 0.06, recover: 0.18, pose: 'point', look: 'seed', sfx: 'flick', root: 0.4 },
      { kind: 'shot', dmg: 7, speed: 9, r: 0.24, life: 0.6, gravity: 9, lob: 3, windup: 0.06, recover: 0.18, pose: 'point', look: 'seed', sfx: 'flick', root: 0.4 },
      { kind: 'shot', dmg: 6, speed: 8, r: 0.3, life: 0.8, gravity: 11, lob: 4, explode: { r: 1.3, dmg: 14, knock: 2.5 }, root: 0.9, windup: 0.1, recover: 0.3, pose: 'point', look: 'pod', sfx: 'flick' },
    ],
    heavy: { kind: 'vines', name: 'Vine Lash', dmg: 16, len: 5, r: 0.95, root: 1.8, knock: 0.6, windup: 0.14, recover: 0.36, pose: 'point', sfx: 'thud' },
    special: { kind: 'sprouts', name: 'Sprouts', cd: 12, n: 2, life: 10, dmg: 7, every: 0.8, speed: 3.6, heal: 0.12, sfx: 'sprout' },
    air: { kind: 'aoe', name: 'Seed Rain', dmg: 10, at: 0, r: 1.9, knock: 1.5, root: 1, onLand: true, sfx: 'thud', shake: 0.15 },
    dodge: { kind: 'petal', speed: 11, clover: 3 },
  },
  cook: {
    name: 'Cook', weapon: 'whisk', color: '#f06a4a', icon: 'whisk',
    icons: { light: I('whisk', 'phys'), heavy: I('flame', 'fire'), special: I('tart', 'holy'), air: I('whirl', 'phys') },
    desc: 'A whirlwind of whisking that heats up to a sizzle — and snacks for whoever’s hungry.',
    role: 'Fast melee · snacks for all', stats: { tough: 3, reach: 1, speed: 5, help: 3 },
    kit: 'June’s whisk. She used it on eggs, on cream, and once — memorably — on a goose.',
    ready: 'Good thing you’ve got that whisk.',
    hp: 120, speed: 1.12, armor: 0.05,
    light: [
      { kind: 'melee', dmg: 6, range: 1.1, arc: 2.4, knock: 0.8, windup: 0.04, recover: 0.09, pose: 'swing', sfx: 'swish', heat: 7 },
      { kind: 'melee', dmg: 6, range: 1.1, arc: 2.4, knock: 0.8, windup: 0.04, recover: 0.09, pose: 'backswing', sfx: 'swish', heat: 7 },
      { kind: 'melee', dmg: 7, range: 1.1, arc: 2.4, knock: 0.9, windup: 0.04, recover: 0.09, pose: 'swing', sfx: 'swish', heat: 7 },
      { kind: 'melee', dmg: 11, range: 1.25, arc: 2.6, knock: 3.2, launch: 3.5, windup: 0.08, recover: 0.22, pose: 'smash', sfx: 'bonk', hitstop: 0.04, heat: 10 },
    ],
    heavy: { kind: 'aoe', name: 'Flambé', dmg: 20, at: 1.0, r: 1.9, knock: 3.5, windup: 0.13, recover: 0.34, pose: 'smash', sfx: 'sizzle', elem: 'fire', heatBurst: true, shake: 0.15, ring: '#ff8a3a' },
    special: { kind: 'snack', name: 'Snack Time!', cd: 12, tarts: 2, coffees: 1, sfx: 'poof' },
    air: { kind: 'aoe', name: 'Soufflé', dmg: 12, at: 0, r: 1.5, knock: 2.5, onLand: true, sfx: 'whoosh', shake: 0.15 },
    dodge: { kind: 'slide', speed: 12, t: 0.36, trip: 5 },
  },
  tinkerer: {
    name: 'Tinkerer', weapon: 'wrench', color: '#b8804a', icon: 'wrench',
    icons: { light: I('wrench', 'phys'), heavy: I('spring', 'storm'), special: I('kettle', 'fire'), air: I('bomb', 'fire') },
    desc: 'A trusty wrench, a spring-loaded glove, snapping traps and a tea turret that never runs dry.',
    role: 'Gadgets · turrets & traps', stats: { tough: 3, reach: 3, speed: 3, help: 2 },
    kit: 'June’s toolbox, and her big wrench. She fixed half the lamps in the valley with it — and broke the other half first.',
    ready: 'Good thing you’ve got that wrench.',
    hp: 122, speed: 1, armor: 0.1,
    light: [
      { kind: 'melee', dmg: 10, range: 1.3, arc: 2.2, knock: 1.6, windup: 0.07, recover: 0.16, pose: 'swing', sfx: 'clank' },
      { kind: 'melee', dmg: 10, range: 1.3, arc: 2.2, knock: 1.6, windup: 0.07, recover: 0.16, pose: 'backswing', sfx: 'clank' },
      { kind: 'melee', dmg: 15, range: 2.1, arc: 0.9, knock: 5, windup: 0.12, recover: 0.3, pose: 'point', sfx: 'boing', hitstop: 0.05, glove: true },
    ],
    heavy: { kind: 'trap', name: 'Spring Trap', dmg: 24, r: 0.9, at: 1.4, launch: 7, stun: 1, max: 3, life: 15, windup: 0.14, recover: 0.3, pose: 'point', sfx: 'boing' },
    special: { kind: 'turret', name: 'Tea Turret', cd: 12, life: 10, every: 0.5, dmg: 9, range: 7, speed: 10, sfx: 'tick' },
    air: { kind: 'aoe', name: 'Gadget Drop', dmg: 15, at: 0, r: 1.7, knock: 3.5, onLand: true, sfx: 'boom', shake: 0.25 },
    dodge: { kind: 'spring', speed: 8, jump: 6 },
  },
};
export const ORDER9 = ['lamplighter', 'gardener', 'cook', 'tinkerer'];
