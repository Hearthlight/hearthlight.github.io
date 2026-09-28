// Release v9: the new heroes' weapons — four kinds each (the first is the class's own moves), and
// two legendaries each (their effects: kit9.js). Same shape as weapons.js (merged into it).

const I = (g, s) => ({ g, s });

export const WEAPONS9 = {
  // ---- the Lamplighter
  lanternpole: { cls: 'lamplighter', name: 'Lantern Pole', prop: 'lanternpole', icon: I('lantern', 'holy'), desc: 'Long sweeps of light that make the gloom glow.' },
  torch: {
    cls: 'lamplighter', name: 'Torch', prop: 'torch', icon: I('torch', 'fire'), desc: 'Quick, short swings that burn; the heavy twirls all round you.',
    light: [
      { kind: 'melee', dmg: 7, range: 1.5, arc: 2, knock: 1.1, windup: 0.06, recover: 0.12, pose: 'swing', sfx: 'whoosh', lit: 2 },
      { kind: 'melee', dmg: 7, range: 1.5, arc: 2, knock: 1.1, windup: 0.06, recover: 0.12, pose: 'backswing', sfx: 'whoosh', lit: 2 },
      { kind: 'melee', dmg: 11, range: 1.6, arc: 2.2, knock: 2.6, windup: 0.08, recover: 0.22, pose: 'smash', sfx: 'whack', lit: 3, elem: 'fire', hitstop: 0.04 },
    ],
    heavy: { kind: 'aoe', name: 'Torch Twirl', dmg: 18, at: 0, r: 2, knock: 3, lit: 4, windup: 0.14, recover: 0.34, pose: 'swing', sfx: 'whoosh', twirl: true, elem: 'fire', ring: '#ff9a3a' },
  },
  mirror: {
    cls: 'lamplighter', name: 'Hand Mirror', prop: 'mirror', icon: I('mirror', 'holy'), desc: 'Beams of light from afar; the heavy is a sunbeam through everything.',
    light: [{ kind: 'shot', dmg: 8, speed: 16, r: 0.2, life: 0.55, pierce: 2, windup: 0.05, recover: 0.2, pose: 'point', look: 'beam', sfx: 'zap', lit: 3 }],
    heavy: { kind: 'shot', name: 'Sunbeam', dmg: 22, speed: 22, r: 0.34, life: 0.6, pierce: 99, knock: 2.5, windup: 0.14, recover: 0.36, pose: 'point', look: 'beam', sfx: 'zap', blind: 1.5, lit: 5, hitstop: 0.04, shake: 0.12 },
  },
  stormlamp: {
    cls: 'lamplighter', name: 'Storm Lamp', prop: 'stormlamp', icon: I('lantern', 'storm'), desc: 'A lamp swung on its chain: light bursts all round you.',
    light: [
      { kind: 'aoe', dmg: 7, at: 0, r: 1.6, knock: 1.8, windup: 0.07, recover: 0.2, pose: 'swing', sfx: 'whoosh', lit: 2, ring: '#fff3a6' },
      { kind: 'aoe', dmg: 7, at: 0, r: 1.6, knock: 1.8, windup: 0.07, recover: 0.2, pose: 'backswing', sfx: 'whoosh', lit: 2, ring: '#fff3a6' },
      { kind: 'aoe', dmg: 11, at: 0, r: 2, knock: 3, windup: 0.09, recover: 0.28, pose: 'smash', sfx: 'bell', blind: 0.6, lit: 3, ring: '#ffe89a' },
    ],
    heavy: { kind: 'aoe', name: 'Lamp Storm', dmg: 22, at: 0, r: 2.8, knock: 4.5, blind: 1.8, lit: 5, windup: 0.18, recover: 0.4, pose: 'smash', sfx: 'bell', flare: true, shake: 0.25, ring: '#ffe89a' },
  },
  // ---- the Gardener
  wateringcan: { cls: 'gardener', name: 'Watering Can', prop: 'wateringcan', icon: I('can', 'nature'), desc: 'Seeds that root the gloom, and vines that hold it.' },
  shears: {
    cls: 'gardener', name: 'Pruning Shears', prop: 'shears', icon: I('shears', 'nature'), desc: 'Snip-snip-snip: quick cuts that poison; the heavy prunes all round you.',
    light: [
      { kind: 'melee', dmg: 6, range: 1.15, arc: 1.8, knock: 0.8, windup: 0.04, recover: 0.09, pose: 'swing', sfx: 'snap' },
      { kind: 'melee', dmg: 6, range: 1.15, arc: 1.8, knock: 0.8, windup: 0.04, recover: 0.09, pose: 'backswing', sfx: 'snap' },
      { kind: 'melee', dmg: 6, range: 1.15, arc: 1.8, knock: 0.8, windup: 0.04, recover: 0.09, pose: 'swing', sfx: 'snap' },
      { kind: 'melee', dmg: 10, range: 1.3, arc: 2.2, knock: 2.4, windup: 0.07, recover: 0.2, pose: 'smash', sfx: 'snap', elem: 'poison', root: 0.6 },
    ],
    heavy: { kind: 'aoe', name: 'Topiary', dmg: 18, at: 0, r: 2.1, knock: 2, root: 1, windup: 0.14, recover: 0.34, pose: 'swing', sfx: 'snap', twirl: true, ring: '#6fc05a' },
  },
  rake: {
    cls: 'gardener', name: 'Rake', prop: 'rake', icon: I('rake', 'nature'), desc: 'Long sweeps that rake the gloom in towards you.',
    light: [
      { kind: 'melee', dmg: 9, range: 1.9, arc: 1.6, knock: -1.6, windup: 0.1, recover: 0.2, pose: 'swing', sfx: 'whoosh' },
      { kind: 'melee', dmg: 9, range: 1.9, arc: 1.6, knock: -1.6, windup: 0.1, recover: 0.2, pose: 'backswing', sfx: 'whoosh' },
      { kind: 'melee', dmg: 13, range: 2.1, arc: 1.4, knock: -2.8, windup: 0.12, recover: 0.3, pose: 'smash', sfx: 'thud', root: 0.8, hitstop: 0.04 },
    ],
    heavy: { kind: 'vines', name: 'Root Rake', dmg: 14, len: 4, r: 1.05, root: 2.2, knock: 0.4, windup: 0.14, recover: 0.36, pose: 'smash', sfx: 'thud' },
  },
  puffer: {
    cls: 'gardener', name: 'Pollen Puffer', prop: 'puffer', icon: I('puffer', 'nature'), desc: 'Puffs of pollen that make the gloom wheeze; the heavy bursts into a cloud.',
    light: [{ kind: 'shot', dmg: 4, speed: 7, r: 0.3, life: 0.45, fan: 3, spread: 0.6, knock: 0.6, windup: 0.05, recover: 0.18, pose: 'point', look: 'spore', sfx: 'poof', elem: 'poison' }],
    heavy: { kind: 'shot', name: 'Spore Pod', dmg: 8, speed: 8, r: 0.32, life: 0.9, gravity: 11, lob: 4, explode: { r: 1.8, dmg: 12, knock: 2 }, root: 1.2, windup: 0.12, recover: 0.36, pose: 'point', look: 'pod', sfx: 'poof', cloud: { r: 1.8, life: 4 } },
  },
  // ---- the Cook
  whisk: { cls: 'cook', name: 'Whisk', prop: 'whisk', icon: I('whisk', 'phys'), desc: 'A flurry of whisking that heats up to a sizzle.' },
  ladle: {
    cls: 'cook', name: 'Ladle', prop: 'ladle', icon: I('ladle', 'fire'), desc: 'Heavier blows, and a splash of hot soup.',
    light: [
      { kind: 'melee', dmg: 10, range: 1.3, arc: 2.2, knock: 1.8, windup: 0.08, recover: 0.18, pose: 'swing', sfx: 'bonk', heat: 9 },
      { kind: 'melee', dmg: 10, range: 1.3, arc: 2.2, knock: 1.8, windup: 0.08, recover: 0.18, pose: 'backswing', sfx: 'bonk', heat: 9 },
      { kind: 'aoe', dmg: 12, at: 1.1, r: 1.3, knock: 2.6, windup: 0.1, recover: 0.26, pose: 'smash', sfx: 'splash', elem: 'fire', ring: '#e8b070' },
    ],
    heavy: { kind: 'aoe', name: 'Soup Splash', dmg: 22, at: 1.2, r: 2.2, knock: 3.5, windup: 0.14, recover: 0.36, pose: 'smash', sfx: 'splash', elem: 'fire', heatBurst: true, shake: 0.15, ring: '#e8b070' },
  },
  spatula: {
    cls: 'cook', name: 'Spatula', prop: 'spatula', icon: I('spatula', 'phys'), desc: 'Flip, flip, flip! Every blow sends the gloom up in the air.',
    light: [
      { kind: 'melee', dmg: 7, range: 1.2, arc: 2.2, knock: 1, launch: 3, windup: 0.06, recover: 0.13, pose: 'swing', sfx: 'whack', heat: 8 },
      { kind: 'melee', dmg: 7, range: 1.2, arc: 2.2, knock: 1, launch: 3, windup: 0.06, recover: 0.13, pose: 'backswing', sfx: 'whack', heat: 8 },
      { kind: 'melee', dmg: 11, range: 1.3, arc: 2.4, knock: 2, launch: 5.5, windup: 0.09, recover: 0.24, pose: 'smash', sfx: 'boing', heat: 10, hitstop: 0.04 },
    ],
    heavy: { kind: 'aoe', name: 'Big Flip', dmg: 18, at: 0.8, r: 1.8, knock: 2, launch: 7, windup: 0.14, recover: 0.34, pose: 'smash', sfx: 'boing', heatBurst: true, ring: '#ffd66b' },
  },
  peppermill: {
    cls: 'cook', name: 'Pepper Mill', prop: 'peppermill', icon: I('pepper', 'fire'), desc: 'Clouds of pepper from afar: the gloom sneezes and can’t see a thing.',
    light: [{ kind: 'shot', dmg: 4, speed: 9, r: 0.25, life: 0.4, fan: 3, spread: 0.5, knock: 0.5, windup: 0.05, recover: 0.16, pose: 'point', look: 'pepper', sfx: 'flick', blind: 0.5 }],
    heavy: { kind: 'shot', name: 'Sneeze Storm', dmg: 5, speed: 9, r: 0.28, life: 0.5, fan: 7, spread: 1.2, knock: 1, windup: 0.12, recover: 0.36, pose: 'point', look: 'pepper', sfx: 'poof', blind: 1.2 },
  },
  // ---- the Tinkerer
  wrench: { cls: 'tinkerer', name: 'Wrench', prop: 'wrench', icon: I('wrench', 'phys'), desc: 'Two bonks and a spring-loaded glove; the heavy sets a trap.' },
  rivetgun: {
    cls: 'tinkerer', name: 'Rivet Gun', prop: 'rivetgun', icon: I('rivet', 'storm'), desc: 'Rapid rivets from afar; the heavy fires a spread of them.',
    light: [{ kind: 'shot', dmg: 5, speed: 17, r: 0.16, life: 0.5, windup: 0.03, recover: 0.1, pose: 'point', look: 'rivet', sfx: 'tick', move: 1 }],
    heavy: { kind: 'shot', name: 'Rivet Burst', dmg: 7, speed: 17, r: 0.18, life: 0.55, fan: 5, spread: 0.5, knock: 1.4, windup: 0.12, recover: 0.34, pose: 'point', look: 'rivet', sfx: 'tick', shake: 0.1 },
  },
  toolbox: {
    cls: 'tinkerer', name: 'Toolbox', prop: 'toolbox', icon: I('toolbox', 'phys'), desc: 'Spanners and screwdrivers thrown with gusto; the heavy throws the whole box.',
    light: [{ kind: 'shot', dmg: 9, speed: 10, r: 0.26, life: 0.7, pierce: 1, knock: 1.5, windup: 0.06, recover: 0.22, pose: 'point', look: 'tool', sfx: 'whoosh' }],
    heavy: { kind: 'shot', name: 'Kitchen Sink', dmg: 8, speed: 7, r: 0.4, life: 1.2, gravity: 11, lob: 5, explode: { r: 1.8, dmg: 22, knock: 4.5 }, windup: 0.14, recover: 0.4, pose: 'point', look: 'tool', sfx: 'whoosh', shake: 0.2 },
  },
  magnet: {
    cls: 'tinkerer', name: 'Horseshoe Magnet', prop: 'magnet', icon: I('magnet', 'storm'), desc: 'It pulls the gloom in; the heavy drags everything close and stuns it.',
    light: [
      { kind: 'melee', dmg: 7, range: 1.7, arc: 1.8, knock: -1.8, windup: 0.08, recover: 0.16, pose: 'point', sfx: 'zap' },
      { kind: 'melee', dmg: 7, range: 1.7, arc: 1.8, knock: -1.8, windup: 0.08, recover: 0.16, pose: 'point', sfx: 'zap' },
      { kind: 'aoe', dmg: 10, at: 0, r: 2, knock: -3, windup: 0.1, recover: 0.26, pose: 'point', sfx: 'zap', ring: '#e04848' },
    ],
    heavy: { kind: 'aoe', name: 'Big Pull', dmg: 14, at: 0, r: 3, knock: -5, stun: 0.5, windup: 0.18, recover: 0.4, pose: 'point', sfx: 'zap', shake: 0.15, ring: '#e04848' },
  },
};

export const WEAPON_ORDER9 = {
  lamplighter: ['lanternpole', 'torch', 'mirror', 'stormlamp'], gardener: ['wateringcan', 'shears', 'rake', 'puffer'],
  cook: ['whisk', 'ladle', 'spatula', 'peppermill'], tinkerer: ['wrench', 'rivetgun', 'toolbox', 'magnet'],
};

export const LEGENDS9 = {
  firstlight: { type: 'lanternpole', name: 'June’s First Light', desc: 'Lit gloom takes 25% more, and stays lit twice as long.' },
  glimmerwick: { type: 'stormlamp', name: 'Old Glimmer’s Wick', desc: 'Your Beacon heals twice as much and burns the gloom.' },
  heartwood: { type: 'wateringcan', name: 'Heartwood Can', desc: 'Your sprouts live twice as long and heal twice as much when they wilt.' },
  bramblecrown: { type: 'shears', name: 'Bramble Crown', desc: 'Rooted gloom takes 30% more.' },
  souppot: { type: 'ladle', name: 'Nana’s Soup Pot', desc: 'Your heavy blow also heals friends around you.' },
  goldwhisk: { type: 'whisk', name: 'The Golden Whisk', desc: 'Your heat builds twice as fast.' },
  crumbles: { type: 'rivetgun', name: 'Crumble’s Rivet Gun', desc: 'Your turrets pour twice as fast.' },
  clockheart: { type: 'wrench', name: 'Clockwork Heart', desc: 'Your traps snap a second time, and your turret lasts half as long again.' },
};
