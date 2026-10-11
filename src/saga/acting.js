// The stage’s acting: what an actor does while a line is said. A vocabulary of gestures any
// chibi can play (bow, flourish, point, fist, laugh, gasp, stomp, cower, facepalm, twirl, sneak,
// march, trip, panic, salute, applaud, sing, faint…), chained or played by several at once — a
// troupe with one who leads and two who get it slightly wrong —, entrances and exits (down a
// rope, up through a trapdoor, a curtain, a spotlight snapping on), the heroes’ own reactions, a
// push-in of the camera, and beats inside a line (an expression changing at its pause).
//   st.act.play('minnow', 'bow')            → a promise, at the gesture’s end
//   st.act.play('duchess', 'sing')          → a held pose: until the next gesture, or rest()
//   st.act.troupe(TRIO, 'tada', { flub: 1 })
//   await st.act.rope('crumble', x, z)      · st.act.spot('sp', 'duchess') · st.act.push('duchess')
//   st.say(who, 'One…{p} two!', { beats: [() => st.act.play(who, 'stomp')] })
// A gesture is a pose in time (models/chars.js `applyPose`: arms [forward, outward], legs, the
// upper body’s bend / twist / tilt, the whole body’s lean / roll / turn, its height and squash,
// the head) with cues on its beats: a sound, particles, a shake. The combat models of the
// villains (the Duchess as a boss, the Understudies’ doubles) play the same ones through `rig()`.
// A scene skipped or over leaves nothing behind: every pose, prop and light is let go (`clear`).

import { kit, THREE } from '../models/v7/kit.js';
import { audio } from '../engine/audio.js';

const ease = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));
const S = Math.sin, PI = Math.PI;
const NUM = ['l0', 'l1', 'bend', 'twist', 'tilt', 'lean', 'roll', 'turn', 'x', 'y', 'sq', 'hx', 'hy', 'hz', 'flat', 'mouth'];

// between two poses (what one doesn’t say is at rest)
function mix(a, b, k) {
  const o = {};
  for (const f of ['a0', 'a1']) { const p = a[f] || [0, 0], q = b[f] || [0, 0]; o[f] = [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k]; }
  for (const f of NUM) { const p = a[f] || 0, q = b[f] || 0; if (p || q) o[f] = p + (q - p) * k; }
  return o;
}
// the same pose the other way round (the one who gets it wrong)
function flip(p) {
  const o = { ...p, a0: p.a1, a1: p.a0, l0: p.l1, l1: p.l0 };
  for (const f of ['twist', 'tilt', 'roll', 'turn', 'x', 'hy', 'hz']) if (p[f]) o[f] = -p[f];
  return o;
}
// key poses: [[when 0..1, pose], …], eased from one to the next
const keys = (ks) => (u) => {
  let i = 0;
  while (i < ks.length - 2 && u > ks[i + 1][0]) i++;
  const [u0, p0] = ks[i], [u1, p1] = ks[i + 1];
  return mix(p0, p1, ease((u - u0) / ((u1 - u0) || 1)));
};
const Z = {};
// (a gesture at its height: the frame a test wants a picture of — tools/actingtest.js)
const mark = (name) => { if (typeof window !== 'undefined') window.__actMark = name; };
const both = (f, o) => ({ a0: [f, o], a1: [f, o] });

// ------------------------------------------------------------------ the vocabulary
// name: { dur (seconds; none: held until the next gesture), fn(u 0..1, seconds, c) → pose,
// at: when it is at its height, cues: [[when, (c) => …]], tick: [every seconds, (c) => …],
// then: the held pose it ends in }.  c: sfx, fx, dust, shake, emote, voice (see `ctx`)
export const GESTURES = {
  // ---- manners
  bow: { dur: 1.5, at: 0.45, fn: keys([[0, Z], [0.25, { bend: 0.62, hx: 0.06, y: -0.04, sq: 0.15, a0: [0.6, -0.4], a1: [-0.9, 0.9] }], [0.7, { bend: 0.62, hx: 0.06, y: -0.04, sq: 0.15, a0: [0.6, -0.4], a1: [-0.9, 0.9] }], [1, Z]]), cues: [[0.08, (c) => c.sfx('swish', 0.4, -3)]] },
  curtsy: { dur: 1.3, at: 0.45, fn: keys([[0, Z], [0.3, { y: -0.2, sq: 0.4, tilt: 0.16, hz: 0.16, ...both(0, 1.05) }], [0.65, { y: -0.2, sq: 0.4, tilt: 0.16, hz: 0.16, ...both(0, 1.05) }], [1, Z]]), cues: [[0.1, (c) => c.sfx('swish', 0.3, 4)]] },
  flourish: { dur: 1.1, at: 0.3, fn: keys([[0, Z], [0.28, { a1: [0.3, 2.75], a0: [-0.3, 0.5], twist: -0.4, tilt: -0.14, bend: -0.12, hz: -0.14, y: 0.08 }], [0.55, { a1: [1.3, 1.4], twist: 0.35, tilt: 0.1, bend: 0.12 }], [0.8, { a1: [0.3, 0.8], twist: 0.1 }], [1, Z]]), cues: [[0.26, (c) => { c.sfx('sparkle', 0.35); c.fx('sparkle', 0.5, 1.5, 6, { color: '#ffe9a0' }); }]] },
  salute: { dur: 1.1, at: 0.5, fn: keys([[0, Z], [0.12, { y: 0.12, sq: -0.15 }], [0.2, { a1: [2.2, 0.6], bend: -0.14, hx: -0.12, sq: -0.1 }], [0.8, { a1: [2.2, 0.6], bend: -0.14, hx: -0.12, sq: -0.1 }], [1, Z]]), cues: [[0.2, (c) => c.sfx('tick', 0.5, 4)]] },
  kiss: { dur: 1.0, at: 0.52, fn: keys([[0, Z], [0.25, { a1: [2.25, -0.3], bend: 0.08, tilt: 0.1 }], [0.5, { a1: [1.5, 1.0], bend: -0.24, hx: -0.18, tilt: -0.12, y: 0.08 }], [0.8, { a1: [1.1, 1.2], bend: -0.1 }], [1, Z]]), cues: [[0.5, (c) => { c.sfx('heart', 0.4); c.fx('heart', 0.4, 1.5, 2); }]] },
  wave: { dur: 1.2, at: 0.5, fn: (u, s) => { const e = ease(Math.min(u, 1 - u) * 6); return { a1: [0.2, (2.55 + S(s * 14) * 0.35) * e], tilt: S(s * 14) * 0.1 * e, hz: -0.1 * e, y: Math.abs(S(s * 7)) * 0.03 * e }; } },
  shoo: { dur: 0.9, at: 0.5, fn: (u, s) => { const k = ease(Math.min(u, 1 - u) * 6); return { a1: [0.5 * k, (1.3 + S(s * 20) * 0.5) * k], a0: [-0.2 * k, 0.5 * k], tilt: -0.16 * k, hz: -0.12 * k, bend: -0.08 * k }; } },
  nod: { dur: 0.7, at: 0.3, fn: (u) => { const k = Math.max(0, S(u * PI * 2)); return { hx: k * 0.22, y: -k * 0.05, sq: k * 0.2 }; } },
  no: { dur: 0.9, at: 0.3, fn: (u) => ({ hy: S(u * PI * 4) * 0.5, twist: S(u * PI * 4) * 0.3 }) },
  look: { dur: 1.3, at: 0.25, fn: (u) => ({ hy: S(u * PI * 2) * 0.7, twist: S(u * PI * 2) * 0.4, bend: 0.08 }) },
  shrug: { dur: 0.9, at: 0.5, fn: (u) => { const k = S(u * PI); return { ...both(0.1, 1.0 * k), y: 0.06 * k, hz: 0.16 * k, sq: -0.1 * k }; } },
  // ---- big feelings
  laugh: { dur: 1.7, at: 0.83, fn: (u) => { const k = Math.abs(S(u * PI * 3)) * (0.35 + 0.65 * u), e = ease(Math.min(u, 1 - u) * 8); return { ...both(-0.25 * e, 0.65 * e), bend: (-0.24 - 0.16 * k) * e, hx: (-0.22 - 0.2 * k) * e, y: 0.12 * k, sq: -0.12 * k }; }, cues: [[0.14, (c) => { c.voice(0); c.emote('laugh', 1.5); }], [0.47, (c) => c.voice(2)], [0.8, (c) => c.voice(5)]] },
  gasp: { dur: 1.0, at: 0.3, fn: keys([[0, Z], [0.14, { ...both(0.3, 2.05), bend: -0.3, hx: -0.3, y: 0.22, sq: -0.3 }], [0.3, { ...both(0.3, 2.0), bend: -0.32, hx: -0.3 }], [0.72, { ...both(0.3, 1.9), bend: -0.28, hx: -0.3 }], [1, Z]]), cues: [[0, (c) => { c.sfx('jump', 0.4, 7); c.emote('exclaim', 1); }]] },
  stomp: { dur: 0.8, at: 0.47, fn: keys([[0, Z], [0.3, { l1: 1.15, ...both(-0.4, 0.6), tilt: -0.12, y: 0.12 }], [0.45, { ...both(-0.6, 0.7), sq: 0.9 }], [0.7, { sq: 0.15 }], [1, Z]]), cues: [[0.45, (c) => { c.sfx('stomp', 0.6); c.shake(0.35); c.dust(8); }]] },
  tantrum: { dur: 1.6, at: 0.42, fn: (u, s) => { const e = ease(Math.min(u, 1 - u) * 9), w = S(u * PI * 6); return { l0: Math.max(0, w) * 1.1 * e, l1: Math.max(0, -w) * 1.1 * e, a0: [-0.3 * e, (0.8 + S(s * 30) * 0.14) * e], a1: [-0.3 * e, (0.8 - S(s * 30) * 0.14) * e], bend: -0.06 * e, y: Math.abs(w) * 0.1 * e, roll: w * 0.1 * e, sq: Math.abs(w) < 0.25 ? 0.6 * e : 0 }; }, cues: [[0.17, (c) => c.thump()], [0.33, (c) => c.thump()], [0.5, (c) => c.thump()], [0.67, (c) => c.thump()], [0.83, (c) => c.thump()]] },
  fist: { dur: 1.3, at: 0.4, fn: (u, s) => { const e = ease(Math.min(u, 1 - u) * 7); return { a1: [(0.4 + S(s * 22) * 0.32) * e, 2.35 * e], a0: [-0.3 * e, 0.45 * e], bend: -0.06 * e, tilt: (-0.1 + S(s * 22) * 0.05) * e, y: Math.abs(S(s * 11)) * 0.09 * e }; } },
  facepalm: { dur: 1.8, at: 0.5, fn: (u) => { const e = ease(Math.min(u * 5, (1 - u) * 6, 1)); return { a1: [2.35 * e, -0.38 * e], bend: 0.1 * e, tilt: 0.12 * e, hx: 0.14 * e, hz: 0.12 * e, hy: u > 0.3 && u < 0.8 ? S((u - 0.3) * PI * 8) * 0.25 : 0 }; }, cues: [[0.2, (c) => c.sfx('bonk', 0.35, 3)]] },
  cheer: { dur: 1.1, at: 0.25, fn: (u) => { const e = ease(Math.min(u, 1 - u) * 7); return { ...both(0.2 * e, 2.7 * e), y: Math.abs(S(u * PI * 2)) * 0.3, bend: -0.1 * e }; } },
  tada: { dur: 1.4, at: 0.3, fn: keys([[0, Z], [0.12, { y: -0.1, sq: 0.5, ...both(0, 0.5) }], [0.24, { ...both(0.2, 2.5), y: 0.24, bend: -0.14, hx: -0.15, sq: -0.2 }], [0.38, { ...both(0.2, 2.5), bend: -0.14, hx: -0.15 }], [0.85, { ...both(0.2, 2.45), bend: -0.12, hx: -0.15 }], [1, Z]]), cues: [[0.24, (c) => { c.sfx('chord', 0.3, 7); c.fx('sparkle', 0, 1.9, 8, { color: '#ffe9a0' }); }]] },
  wobble: { dur: 1.1, at: 0.2, fn: (u) => { const k = 1 - u; return { roll: S(u * PI * 5) * 0.3 * k, ...both(0, 1.3 * Math.min(1, k * 2)), l0: S(u * PI * 5) * 0.3 * k }; } },
  duck: { dur: 0.9, at: 0.4, fn: keys([[0, Z], [0.2, { y: -0.2, sq: 0.6, bend: 0.35, hx: 0.15, ...both(2.5, 0.25) }], [0.75, { y: -0.2, sq: 0.6, bend: 0.35, hx: 0.15, ...both(2.5, 0.25) }], [1, Z]]) },
  recoil: { dur: 0.7, at: 0.3, fn: keys([[0, Z], [0.25, { lean: -0.25, ...both(0.5, 1.0), y: 0.14, hx: -0.2 }], [0.6, { lean: -0.1, ...both(0.4, 0.8) }], [1, Z]]) },
  twirl: { dur: 0.9, at: 0.5, fn: (u, s, c) => ({ turn: PI * 2 * ease(u) * (c.o.turns || 1), ...both(0, 1.45 * S(u * PI)), y: 0.1 * S(u * PI) }), cues: [[0, (c) => c.sfx('swish', 0.4, 5)]] },
  trip: { dur: 0.9, at: 0.62, then: 'prone', fn: keys([[0, Z], [0.2, { lean: 0.5, ...both(2.0, 0.4), l0: -0.9, y: 0.1 }], [0.5, { flat: -1, ...both(2.8, 0.5) }], [0.68, { flat: -1, ...both(2.8, 0.5), y: 0.16 }], [1, { flat: -1, ...both(2.8, 0.5) }]]), cues: [[0.5, (c) => { c.sfx('bonk', 0.6); c.shake(0.2); c.dust(8); c.emote('star', 1.4); }]] },
  getup: { dur: 0.7, at: 0.5, fn: keys([[0, { flat: -1, ...both(2.8, 0.5) }], [0.55, { bend: 0.4, y: -0.1, sq: 0.4, ...both(0.6, 0.5) }], [1, Z]]) },
  rise: { dur: 0.8, at: 0.5, fn: keys([[0, { flat: 1, ...both(0, 1.2) }], [0.5, { flat: 0.35, bend: 0.5, ...both(0.8, 0.5), y: -0.05 }], [0.75, { bend: 0.3, sq: 0.3, hy: 0.4 }], [1, Z]]) },
  faint: { dur: 1.5, at: 0.3, then: 'out', fn: keys([[0, Z], [0.28, { a1: [2.45, -0.35], bend: -0.3, hz: 0.2, roll: 0.14 }], [0.52, { a1: [2.45, -0.35], bend: -0.4, roll: -0.18 }], [0.78, { flat: 1, ...both(0, 1.2) }], [0.87, { flat: 1, ...both(0, 1.2), y: 0.1 }], [1, { flat: 1, ...both(0, 1.2) }]]), cues: [[0.78, (c) => { c.sfx('thud', 0.6); c.dust(8); c.emote('star', 1.8); }]] },
  // ---- held poses
  point: { fn: (u, s) => ({ a1: [0.3, 1.6 + Math.exp(-s * 6) * S(s * 30) * 0.14], a0: [-0.2, 0.35], tilt: -0.2, hy: 0.45, x: 0.04, y: Math.exp(-s * 7) * 0.08 }) },
  jab: { fn: (u, s) => ({ a1: [1.5 + Math.exp(-s * 6) * S(s * 30) * 0.14, 0.1], a0: [-0.4, 0.4], lean: 0.2, l0: -0.35, l1: 0.2, y: Math.exp(-s * 7) * 0.08 }) },
  behold: { fn: (u, s) => ({ a1: [0.15, 2.9], a0: [-0.2, 0.5], bend: -0.12, tilt: -0.1, hx: -0.18, sq: -0.12, y: Math.exp(-s * 5) * 0.1 }) },
  cower: { fn: (u, s) => ({ y: -0.2, sq: 0.55, bend: 0.5, hx: 0.25, ...both(2.5, 0.25), x: S(s * 40) * 0.014 }) },
  shiver: { fn: (u, s) => ({ ...both(1.0, -0.5), bend: 0.16, x: S(s * 44) * 0.016, hx: 0.1, sq: 0.12 }) },
  sob: { fn: (u, s) => ({ ...both(2.3, -0.32), bend: 0.3, hx: 0.3, y: -0.03 - Math.abs(S(s * 7)) * 0.05, sq: 0.1 }) },
  slump: { fn: (u, s) => ({ bend: 0.32, hx: 0.28, hz: 0.1, ...both(0.2, 0.05), y: -0.05 + S(s * 1.4) * 0.008, sq: 0.18 }) },
  sulk: { fn: (u, s) => ({ twist: 0.75, bend: 0.2, hx: 0.3, ...both(0.9, -0.45), l1: Math.max(0, S(s * 3)) * 0.5 }) },
  swoon: { fn: (u, s) => ({ a1: [2.45, -0.36], a0: [-0.5, 0.8], bend: -0.34, hz: 0.22, tilt: 0.1, roll: 0.07 + S(s * 1.5) * 0.03 }) },
  proud: { fn: (u, s) => ({ ...both(-0.25, 0.65), bend: -0.22, hx: -0.2, sq: -0.08, y: 0.02 + S(s * 2) * 0.01 }) },
  vee: { fn: (u, s) => ({ ...both(0.2, 2.5), bend: -0.14, hx: -0.15, sq: -0.1, y: Math.exp(-s * 6) * S(Math.min(1, s * 4) * PI) * 0.3 }), cues: [[0, (c) => { c.sfx('chord', 0.3, 7); c.fx('sparkle', 0, 1.9, 8, { color: '#ffe9a0' }); }]] },
  present: { fn: (u, s) => ({ a1: [0.2, 1.75], a0: [0.7, -1.0], tilt: -0.3, hz: -0.14, y: -0.09 + Math.exp(-s * 5) * 0.1, sq: 0.3, l1: 0.5 }) },
  beg: { fn: (u, s) => ({ ...both(1.45, -0.34), bend: 0.1, hx: -0.28, y: -0.07 + Math.abs(S(s * 5)) * 0.06, sq: 0.2 }) },
  think: { fn: (u, s) => ({ a1: [2.2, -0.28], a0: [0.7, -0.4], hz: 0.2, tilt: 0.1, hx: 0.08, bend: 0.06 + S(s * 1.2) * 0.02 }) },
  flex: { fn: (u, s) => ({ ...both(0, 2.2 + S(s * 5) * 0.08), bend: -0.12, sq: -0.1 + Math.max(0, S(s * 5)) * 0.25 }) },
  carry: { fn: () => ({ ...both(1.35, 0), bend: -0.1 }) },
  sit: { fn: () => ({ l0: 1.35, l1: 1.35, y: -0.26 }) },
  hang: { fn: (u, s) => ({ a1: [0, 3.0], a0: [0.2, 0.3], l0: 0.25, l1: -0.25, roll: S(s * 5) * 0.1 }) },
  hush: { fn: (u, s) => ({ ...both(2.3, -0.32), sq: 0.12, y: Math.exp(-s * 6) * 0.1, hx: -0.05 }) },
  signal: { fn: (u, s) => ({ a1: [0.2, 2.6 + S(s * 6) * 0.5], a0: [0.2, 0.2], tilt: S(s * 6) * 0.12, y: -0.1, sq: 0.25 }) },
  ears: { fn: (u, s) => ({ ...both(2.75, -0.12), hy: S(s * 9) * 0.25, sq: 0.15, y: -0.03 }) },
  weep: { fn: (u, s) => ({ ...both(2.3, -0.32), bend: 0.32, hx: 0.3, y: -0.46 - Math.abs(S(s * 6)) * 0.04 }) },
  release: { fn: (u, s) => ({ ...both(0.3, 1.25 + S(s * 1.5) * 0.08), hx: -0.34, bend: -0.1, y: -0.46 }) },
  tumble: { fn: (u, s) => ({ lean: s * 7, a0: [0.3 + S(s * 15) * 0.4, 2.5], a1: [0.3 - S(s * 15) * 0.4, 2.5], l0: S(s * 13) * 0.8, l1: -S(s * 13) * 0.8 }) },
  prone: { fn: () => ({ flat: -1, ...both(2.8, 0.5) }) },
  out: { fn: () => ({ flat: 1, ...both(0, 1.2) }) },
  // ---- on stage
  sing: { at: 0.4, fn: (u, s) => ({ ...both(0.25, 1.95 + S(s * 2.2) * 0.25), bend: -0.28, hx: -0.3, roll: S(s * 2.2) * 0.08, sq: -0.08 - Math.max(0, S(s * 2.2)) * 0.08, y: 0.02 + Math.max(0, S(s * 2.2)) * 0.05, mouth: 2.4 + S(s * 12) }), tick: [0.42, (c) => c.fx('note', 0.2, 1.7, 1)] },
  aria: { dur: 2.2, at: 0.5, fn: (u, s) => { const e = ease(Math.min(u * 5, (1 - u) * 5, 1)); return { ...both(0.25 * e, (1.5 + u * 1.2) * e), bend: (-0.15 - u * 0.2) * e, hx: (-0.2 - u * 0.2) * e, y: u * 0.08 * e, sq: -u * 0.15 * e, mouth: 1 + (1.6 + S(s * 12)) * e }; }, tick: [0.3, (c) => c.fx('note', 0.2, 1.7, 1)] },
  applaud: { at: 0.3, fn: (u, s) => ({ ...both(1.25, -0.22 + Math.abs(S(s * 9)) * 0.42), bend: 0.03, y: Math.abs(S(s * 9)) * 0.06 }), tick: [PI / 9, (c) => c.sfx('tick', 0.22, 6 + Math.random() * 4)] },
  juggle: { at: 0.4, fn: (u, s) => ({ a0: [1.35 + S(s * 6.4) * 0.5, 0.2], a1: [1.35 - S(s * 6.4) * 0.5, 0.2], hx: -0.22, roll: S(s * 3.2) * 0.07, y: Math.abs(S(s * 6.4)) * 0.03 }) },
  dance: { at: 0.4, fn: (u, s) => ({ roll: S(s * 6) * 0.16, a0: [0, 1.6 + S(s * 6) * 0.8], a1: [0, 1.6 - S(s * 6) * 0.8], y: Math.abs(S(s * 6)) * 0.12, x: S(s * 3) * 0.08 }) },
  conduct: { at: 0.4, fn: (u, s) => ({ a1: [1.25 + S(s * 8) * 0.5, 0.5], a0: [0.9 + S(s * 8 + 1.5) * 0.25, 0.4], bend: 0.08, y: Math.abs(S(s * 4)) * 0.04 }) },
  mime: { at: 0.4, fn: (u, s) => ({ a0: [1.5, 0.25 + S(s * 3) * 0.2], a1: [1.5, 0.25 - S(s * 3) * 0.2], bend: 0.06, x: S(s * 1.5) * 0.08, tilt: S(s * 1.5) * 0.08 }) },
  // ---- on the move (over the walk)
  sneak: { fn: (u, s) => ({ y: -0.08, bend: 0.2, sq: 0.2, ...both(1.15, 0.2), l0: S(s * 5) * 0.9, l1: -S(s * 5) * 0.9, hy: S(s * 1.7) * 0.5 }) },
  march: { fn: (u, s, c) => { const w = S(c.T * 9); return { l0: w * 0.95, l1: -w * 0.95, a0: [-w * 1.2, 0.08], a1: [w * 1.2, 0.08], bend: -0.12, hx: -0.1, y: Math.abs(w) * 0.05 }; } },
  panic: { fn: (u, s) => ({ a0: [0.2 + S(s * 17) * 0.3, 2.8], a1: [0.2 - S(s * 17) * 0.3, 2.8], lean: 0.16, hy: S(s * 9) * 0.3 }) },
  strut: { fn: (u, s) => ({ ...both(-0.2, 0.6), bend: -0.2, hx: -0.22, roll: S(s * 7) * 0.08 }) },
  swim: { fn: (u, s) => ({ a0: [(s * 5) % (PI * 2), 0.3], a1: [(s * 5 + PI) % (PI * 2), 0.3], hx: -0.2, roll: S(s * 5) * 0.1 }) },
};

// ------------------------------------------------------------------ things on stage
// three balls in the air over a juggler (and whatever else is tossed in: `extra` colours)
function juggleBalls(K, cols) {
  const g = new THREE.Group();
  g.userData.balls = cols.map((c) => K.noCast(K.put(g, K.ball(0.09, 8, 6), K.glow(c, c, 0.35), 0, 0, 0)));
  return g;
}
// a curtain in two halves (w wide, h tall), drawn shut
function curtainPair(K, w, h, col) {
  const g = new THREE.Group(), halves = [];
  for (const s of [-1, 1]) {
    const hf = K.grp(g, s * w / 2, 0, 0);
    for (let i = 0; i < 4; i++) K.put(hf, K.box(w / 8 + 0.02, h, i % 2 ? 0.1 : 0.16), K.c(i % 2 ? col[1] : col[0]), -s * (i + 0.5) * w / 8, h / 2, 0);
    halves.push(hf);
  }
  g.userData.halves = halves;
  return g;
}
// a spotlight: a pale cone from the flies and its pool on the floor
function spotLight(r, h, color) {
  const g = new THREE.Group();
  const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 18, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  cone.position.set(0, h / 2, 0); cone.renderOrder = 4;
  const pool = new THREE.Mesh(new THREE.CircleGeometry(r, 24).rotateX(-PI / 2), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false }));
  pool.position.y = 0.12; pool.renderOrder = 3;
  g.add(cone, pool);
  g.userData = { cone, pool };
  return g;
}

// the combat models (the Duchess as a boss, the Understudies’ doubles: { body, torso, arms, head… })
// play the vocabulary too
function rigApply(R, ps) {
  const u = R.u, r = R.rest, p = ps || Z, a0 = p.a0 || [0, 0], a1 = p.a1 || [0, 0], bend = p.bend || 0, f = p.flat || 0, sq = p.sq || 0;
  u.arms[0].rotation.set(-a0[0], 0, -a0[1] + (ps ? 0 : r.az[0]));
  u.arms[1].rotation.set(-a1[0], 0, a1[1] + (ps ? 0 : r.az[1]));
  if (u.legs) { u.legs[0].rotation.x = -(p.l0 || 0); u.legs[1].rotation.x = -(p.l1 || 0); }
  u.torso.rotation.set(bend, p.twist || 0, p.tilt || 0);
  // (the head isn’t the torso’s child: it follows the bend by hand)
  const hl = r.head.y - r.torso.y;
  u.head.position.set(r.head.x, r.torso.y + hl * Math.cos(bend), r.head.z + hl * S(bend));
  u.head.rotation.set(bend + (p.hx || 0), p.hy || 0, p.hz || 0);
  u.body.rotation.set((p.lean || 0) - f * PI / 2, p.turn || 0, p.roll || 0);
  u.body.position.set(p.x || 0, (p.y || 0) * r.s + Math.abs(f) * 0.2, 0);
  u.body.scale.set(r.s * (1 + sq * 0.14), r.s * (1 - sq * 0.2), r.s * (1 + sq * 0.14));
  if (u.mouth) u.mouth.scale.y = p.mouth || 1;
}

// ------------------------------------------------------------------ the acting itself
export class Acting {
  constructor(st) {
    this.st = st;
    this.on = new Map();        // actor → { h, g, t, from, cur, o, res… }: who is playing what
    this.rigs = new Map();      // key → a combat model’s rig
    this.tweens = [];           // entrances and exits under way
    this.spots = new Map();     // key → a spotlight
    this.extras = new Map();    // key → { obj, upd, end }: juggling balls, things in hand
    this.homes = new Map();     // a hero moved by a reaction → where they stood
    this.watch = null;          // the beats of the line being said
    this.T = 0; this.dim = 0; this.dimK = 0; this.base = 0; this.wrote = null;
  }
  get P() { return this.st.P; }
  get K() { return kit(this.P.r3d); }
  get skipping() { return this.st.skipping; }

  // ---- who: an actor of the scene, a hero ('p0', a player, 'heroes' for all()), a rigged model
  who(id) {
    if (id && typeof id === 'object') return id.n || id.rig ? id : { id: id.who || id.id, n: id.actor || id, hero: id.actor ? id : null };
    const a = this.st.actors.get(id);
    if (a) return a;
    if (this.rigs.has(id)) return this.rigs.get(id);
    const p = this.P.players.find((q) => q.who === id);
    return p ? { id, n: p.actor, hero: p } : null;
  }
  list(ids) { return (ids === 'heroes' ? this.st.heroes() : Array.isArray(ids) ? ids : [ids]).map((q) => this.who(q)).filter(Boolean); }
  // a combat model on stage under a name of its own: st.act.rig('diva', e.obj)
  rig(key, obj, at = null) {
    const u = obj.userData;
    const R = { id: key, rig: true, obj, u, at, rest: { s: u.body.scale.x, head: u.head.position.clone(), torso: u.torso.position.clone(), az: [u.arms[0].rotation.z, u.arms[1].rotation.z] } };
    this.rigs.set(key, R);
    return R;
  }
  // where an actor’s feet are, and how tall they stand
  feet(h) {
    if (h.rig) { const p = h.obj.position; return { x: p.x, y: p.y, z: p.z, s: h.rest.s * (h.rest.head.y + 0.25) / 1.45, dir: { x: S(h.obj.rotation.y), z: Math.cos(h.obj.rotation.y) } }; }
    const n = h.n;
    return { x: n.pos.x, y: n.baseY || 0, z: n.pos.z, s: (n.model && n.model.scale) || 1, dir: n.dir || { x: 0, z: 1 } };
  }
  // what a gesture’s cue can do, where its actor stands
  ctx(A) {
    const st = this.st, h = A.h, me = this;
    return {
      o: A.o, T: this.T, h,
      sfx: (name, volume = 0.5, pitch = 0) => st.sfx(name, { volume: volume * (A.o.quiet ? 0.5 : 1), pitch }),
      // (side: towards the hand that plays it, up: in the actor’s own heights)
      fx: (kind, side, up, n = 1, o) => { const f = me.feet(h), sd = A.o.mirror ? -side : side; st.fx(kind, f.x + f.dir.z * sd * f.s, f.y + up * f.s, f.z - f.dir.x * sd * f.s, n, o); },
      dust: (n = 6) => { const f = me.feet(h); st.fx('dust', f.x, f.y + 0.15, f.z + 0.1, n); },
      shake: (k) => st.shake(k),
      thump: () => { const f = me.feet(h); st.sfx('stomp', { volume: 0.45 }); st.shake(0.22); st.fx('dust', f.x, f.y + 0.15, f.z + 0.1, 4); },
      emote: (kind, dur) => { if (st.skipping) return; if (h.hero && h.hero.setEmote) h.hero.setEmote(kind, dur); else if (h.n && h.n.setEmote) h.n.setEmote(kind, dur); },
      voice: (up = 0) => { const v = h.n && h.n.def && h.n.def.voice; if (v && !st.skipping) audio.blip({ ...v, pitch: v.pitch + up, vary: 1 }); },
    };
  }

  // ---- playing
  // play a gesture: resolves when it is over (a held pose: once it is taken). opts: mirror (the
  // other hand), rate, delay, quiet, keep (it goes on after the scene, for an actor who stays),
  // turns (twirl), hold (seconds a held pose is kept before the actor rests again)
  play(id, name, opts = {}) {
    const h = this.who(id), g = GESTURES[name];
    if (!h || !g || this.skipping || (!this.st.active && !opts.keep)) return Promise.resolve();
    const old = this.on.get(h.n || h);
    if (old && old.res) old.res();
    return new Promise((res) => {
      this.on.set(h.n || h, { h, g, name, t: -(opts.delay || 0), from: (old && old.cur) || Z, cur: (old && old.cur) || Z, o: opts, res, done: new Set(), tickT: 0, keep: !!opts.keep });
    });
  }
  // back to the actor’s own stance
  rest(id, dur = 0.18) {
    for (const h of this.list(id)) {
      const A = this.on.get(h.n || h);
      if (!A) continue;
      if (A.res) { A.res(); A.res = null; }
      if (this.skipping || dur <= 0) this.drop(A); else Object.assign(A, { g: null, name: null, t: 0, from: A.cur, out: dur });
    }
  }
  drop(A) {
    const h = A.h;
    if (A.res) { const r = A.res; A.res = null; r(); }
    if (h.rig) rigApply(h, null); else if (h.n) h.n.pose = null;
    this.on.delete(h.n || h);
    if (!this.st.active) { this.endExtra('jug:' + h.id); this.endExtra('hand:' + h.id); }
  }
  // several actors, the same gesture at once
  all(ids, name, opts = {}) { return Promise.all(this.list(ids).map((h, i) => this.play(h, name, { ...opts, delay: (opts.delay || 0) + (opts.lag || 0) * i }))); }
  // a troupe: the first leads, the others follow a beat behind — and with `flub`, the second
  // does it the other way round and the third looks at them first, then does it late
  // (name: one gesture for all, or one each; the sides of a tableau mirror each other by themselves)
  troupe(ids, name, opts = {}) {
    const hs = this.list(ids), lag = opts.lag === undefined ? 0.14 : opts.lag, x0 = hs.length ? this.feet(hs[0]).x : 0;
    return Promise.all(hs.map((h, i) => {
      const g = Array.isArray(name) ? name[i % name.length] : name, left = this.feet(h).x < x0 - 0.1;
      const o = { ...opts, delay: (opts.delay || 0) + lag * i, mirror: Array.isArray(name) ? !left : !!opts.mirror };
      if (!opts.flub || i < 2) return this.play(h, g, i === 1 && opts.flub && !Array.isArray(name) ? { ...o, mirror: !o.mirror } : o);
      // (the third: the wrong way round first, a look at the others, then the right way, late)
      this.play(h, g, { ...o, mirror: !o.mirror });
      return this.tw(0.55 + o.delay, () => {}).then(() => this.play(h, 'look', { rate: 2.4, mirror: !left })).then(() => { if (!this.skipping) this.st.sfx('boing', { volume: 0.4, pitch: 4 }); return this.play(h, g, { ...o, delay: 0 }); });
    }));
  }
  // an expression on the speaker’s face and portrait, in the middle of a line
  face(id, ex, who = id) {
    const h = this.who(id), c = this.st.dialogue && this.st.dialogue.cur;
    if (h && h.n && !h.rig) h.n.forceExpr = ex;
    if (c && c.who === who) c.expr = ex;
  }

  // ---- the heroes and the bystanders react
  // 'gasp' · 'recoil' (a step back from (x, z), put back when the scene ends) · 'cheer' ·
  // 'duck' · 'applaud' · any gesture; staggered so a crowd doesn’t move as one
  react(ids, name, { from = null, lag = 0.06, ...o } = {}) {
    const hs = this.list(ids);
    // (skipped or not, they end up looking the same way)
    if (this.skipping || !this.st.active) { if (from) for (const h of hs) this.turn(h, from[0], from[1]); return Promise.resolve(); }
    return Promise.all(hs.map((h, i) => {
      const n = h.n;
      if (from && n && !h.rig) {
        const dx = n.pos.x - from[0], dz = n.pos.z - from[1], l = Math.hypot(dx, dz) || 1;
        if (name === 'recoil') {
          if (!this.homes.has(n)) this.homes.set(n, { x: n.pos.x, z: n.pos.z });
          const x0 = n.pos.x, z0 = n.pos.z, k = o.step || 0.45;
          this.tw(0.28, (e) => { n.pos.x = x0 + (dx / l) * k * e; n.pos.z = z0 + (dz / l) * k * e; }, null, lag * i);
        }
        this.turn(h, from[0], from[1]);
      }
      return this.play(h, name, { ...o, delay: lag * i });
    }));
  }
  turn(h, x, z) {
    const n = h.n;
    if (!n || h.rig) return;
    const dx = x - n.pos.x, dz = z - n.pos.z, l = Math.hypot(dx, dz) || 1;
    n.dir = { x: dx / l, z: dz / l };
    if (h.hero) { if (n.model) n.model.targetFacing = Math.atan2(n.dir.x, n.dir.z); } else n.restDir = n.dir;
  }

  // ---- entrances and exits
  // a little clockwork for them: step(0..1 eased) over dur, then done — at once when skipped
  tw(dur, step, done = null, delay = 0, lin = false) {
    if (this.skipping || !this.st.active || dur <= 0) { step(1); if (done) done(); return Promise.resolve(); }
    return new Promise((res) => this.tweens.push({ t: -delay, dur, step, done, res, lin }));
  }
  ground(n) { return this.P.world.groundY ? this.P.world.groundY(n.pos) : 0; }
  // down a rope from the flies, to (x, z): the rope drops, the actor slides down it, lands
  async rope(id, x, z, { h = 7, face = null, delay = 0 } = {}) {
    const a = this.st.actor(id, x, z, { face }), st = this.st;
    if (!a) return;
    const n = a.n, base = n.seatY, y0 = base === undefined ? this.ground(n) : base, key = 'rope:' + id;
    n.hidden = true;
    await this.tw(delay, () => {});
    const rp = st.prop(key, K_rope(this.K, h + 6), x, y0 + 1.5 * (n.model.scale || 1) + h + 6, z - 0.12);
    rp.scale.set(1, 0.02, 1);
    st.sfx('whoosh', { volume: 0.4, pitch: 6 });
    await this.tw(0.3, (e) => rp.scale.set(1, Math.max(0.02, e), 1));
    n.hidden = false;
    this.play(id, 'hang');
    await this.tw(0.65, (e) => { n.seatY = y0 + h * (1 - e * e); }, () => { n.seatY = base; });
    st.sfx('land', { volume: 0.6 }); st.fx('dust', x, y0 + 0.15, z, 8); st.shake(0.12);
    if (!this.skipping) mark('rope');
    this.rest(id, 0.12);
    this.tw(0.25, (e) => rp.scale.set(1, Math.max(0.02, 1 - e), 1), () => st.dropProp(key));
    await this.play(id, 'duck', { rate: 2.4 });
  }
  // …and up it again: gone
  async ropeOut(id, { h = 8 } = {}) {
    const a = this.st.actorOf(id), st = this.st;
    if (!a) return;
    const n = a.n, base = n.seatY, y0 = base === undefined ? this.ground(n) : base, key = 'rope:' + id;
    const rp = st.prop(key, K_rope(this.K, h + 6), n.pos.x, y0 + 1.5 * (n.model.scale || 1) + h + 6, n.pos.z - 0.12);
    st.sfx('whoosh', { volume: 0.4, pitch: 2 });
    await this.tw(0.3, (e) => rp.scale.set(1, Math.max(0.02, e), 1));
    this.play(id, 'hang');
    st.sfx('whoosh', { volume: 0.6, pitch: 9 });
    if (!this.skipping) mark('ropeOut');
    await this.tw(0.55, (e) => { n.seatY = y0 + h * e * e; }, () => { n.hidden = true; n.seatY = base; this.rest(id, 0); st.dropProp(key); });
  }
  // up through a trapdoor in a puff of smoke
  // (lift: a star’s entrance — she rises slowly out of the floor, in the pose `as`)
  async trap(id, x, z, { face = null, color = '#6a4a8e', lift = 0, as = 'proud', door: withDoor = true } = {}) {
    const a = this.st.actor(id, x, z, { face }), st = this.st;
    if (!a) return;
    const n = a.n, base = n.seatY, y0 = base === undefined ? this.ground(n) : base, key = 'trap:' + id;
    if (lift) {
      const hgt = 1.7 * (n.model.scale || 1);
      n.seatY = y0 - hgt;
      this.play(id, as);
      st.sfx('tone', { volume: 0.4, pitch: 2 });
      st.fx('smoke', x, y0 + 0.3, z, 8, { color: '#d8c8ee' });
      await this.tw(lift, (e) => { n.seatY = y0 - hgt * (1 - e); }, () => { n.seatY = base; });
      if (!this.skipping) mark('lift');
      return;
    }
    const door = st.prop(key, K_trap(this.K), x, y0 + 0.04, z);
    door.visible = withDoor;
    n.hidden = true;
    st.sfx('unlock', { volume: 0.5 });
    await this.tw(0.16, (e) => door.scale.set(e, 1, e));
    st.sfx('poof', { volume: 0.7 }); st.fx('smoke', x, y0 + 0.4, z, 12, { color });
    n.hidden = false;
    this.play(id, 'cheer', { rate: 1.6, quiet: true });
    await this.tw(0.42, (e) => { n.seatY = y0 - 1.5 + 1.5 * e + S(e * PI) * 0.7; }, () => { n.seatY = base; });
    if (!this.skipping) mark('trap');
    st.fx('dust', x, y0 + 0.15, z, 6);
    this.tw(0.2, (e) => door.scale.set(1 - e, 1, 1 - e), () => st.dropProp(key));
  }
  // …and down through one: a beat in the air, legs going, then gone
  async trapOut(ids, { color = '#6a4a8e', beat = 0.4, lag = 0.1 } = {}) {
    const st = this.st;
    await Promise.all(this.list(ids).map(async (h, i) => {
      const n = h.n, base = n.seatY, y0 = base === undefined ? this.ground(n) : base, key = 'trap:' + h.id;
      const door = st.prop(key, K_trap(this.K), n.pos.x, y0 + 0.04, n.pos.z);
      door.scale.set(0.01, 1, 0.01);
      await this.tw(0.14, (e) => door.scale.set(e, 1, e), null, lag * i);
      st.sfx('unlock', { volume: 0.5, pitch: -6 });
      this.play(h, 'panic'); h.n.setEmote && !this.skipping && h.n.setEmote('exclaim', beat + 0.2);
      await this.tw(beat, () => {});
      if (!this.skipping) mark('trapOut');
      st.sfx('whoosh', { volume: 0.6, pitch: -8 });
      await this.tw(0.32, (e) => { n.seatY = y0 - 2.4 * e * e; }, () => { n.hidden = true; n.seatY = base; this.rest(h, 0); });
      st.fx('smoke', n.pos.x, y0 + 0.3, n.pos.z, 8, { color });
      await this.tw(0.2, (e) => door.scale.set(1 - e, 1, 1 - e), () => st.dropProp(key));
    }));
  }
  // a curtain at (x, y, z), shut: { open(dur), close(dur) }
  // (on: hung on something that moves — the Gloomstage — at (x, y, z) in its own frame)
  curtain(key, x, y, z, { w = 4, h = 3, col = ['#b8303e', '#861f2c'], open = false, on = null } = {}) {
    const st = this.st, g = on ? curtainPair(this.K, w, h, col) : st.prop(key, curtainPair(this.K, w, h, col), x, y, z), hv = g.userData.halves;
    if (on) { this.endExtra('curtain:' + key); g.position.set(x, y, z); on.add(g); this.extras.set('curtain:' + key, { obj: g, end: () => on.remove(g) }); }
    const set = (k) => hv.forEach((f) => f.scale.set(1 - 0.9 * k, 1, 1));
    let k0 = open ? 1 : 0;
    set(k0);
    const go = (to, dur) => { const from = k0; k0 = to; st.sfx('swish', { volume: 0.5, pitch: to ? -4 : -8 }); return this.tw(dur, (e) => set(from + (to - from) * e)); };
    // (rise: the whole curtain flies up out of sight, and is gone)
    const rise = (dur = 1.1, up = 9) => { const y0 = g.position.y; st.sfx('swish', { volume: 0.6, pitch: -9 }); return this.tw(dur, (e) => { g.position.y = y0 + up * e; }, () => { if (on) this.endExtra('curtain:' + key); else st.dropProp(key); }); };
    return { obj: g, open: (dur = 0.7) => go(1, dur), close: (dur = 0.6) => go(0, dur), rise };
  }
  // a prop swells and settles (a horn that blares, a face on the fog that shouts)
  swell(key, k = 1.25, dur = 0.4) {
    const o = typeof key === 'string' ? this.st.propOf(key) : key;
    if (!o) return Promise.resolve();
    const s0 = o.userData.s0 || (o.userData.s0 = o.scale.x);
    return this.tw(dur, (e) => o.scale.setScalar(s0 * (1 + (k - 1) * S(e * PI))), () => o.scale.setScalar(s0));
  }
  // a spotlight snaps on over an actor (it follows them) or a place [x, z, y]; the world dims
  // (beam: false — its lamp alone; night: true — a lamp that only burns after dark)
  spot(key, target, { r = 1.5, h = 9, color = '#fff4c8', dim = 0.5, quiet = false, pool = true, beam = true, night = false } = {}) {
    const st = this.st, L = this.P.lighting, D = this.P.dungeons, dun = D && D.cur && D.cur.lights ? D.cur : null;
    if (!st.active) return null;
    this.spotOff(key, true);
    const obj = st.prop('spot:' + key, spotLight(r, h, color), 0, 0, 0);
    obj.userData.pool.visible = pool; obj.userData.cone.visible = beam;
    // (its lamp: one of the dungeon’s own lights when in one — they are the light pool’s there; in
    // the dark the beam itself is fainter, or it fogs what it shows)
    const src = { x: 0, y: 3, z: 0, color, power: dun ? 2.2 : 1.6, dist: Math.max(7, r * 5), always: true, lamp: true, stage: true };
    if (dun) dun.lights.push(src); else if (L) L.sources.push(src);
    const sp = { obj, src, target, dim, k: 0, dun, haze: dun ? 0.08 : 0.2, night: night ? src.power : 0 };
    this.spots.set(key, sp);
    this.place(sp);
    this.dim = Math.max(...[...this.spots.values()].map((q) => q.dim));
    if (!quiet) st.sfx('flick', { volume: 0.7 });
    if (!this.skipping) mark('spot');
    return sp;
  }
  spotTo(key, target) { const sp = this.spots.get(key); if (sp) sp.target = target; }
  // a scene out of doors at any hour: after dark, a lamp over the actors so their acting is seen
  // (no beam, nothing by day)
  keylight(target, key = 'key') { return this.spot(key, target, { r: 2, beam: false, pool: false, dim: 0, quiet: true, night: true, color: '#ffe6c0' }); }
  spotOff(key, quiet = false) {
    const sp = this.spots.get(key), L = this.P.lighting;
    if (!sp) return;
    if (sp.dun) sp.dun.lights = sp.dun.lights.filter((l) => l !== sp.src);
    else if (L) { const i = L.sources.indexOf(sp.src); if (i >= 0) L.sources.splice(i, 1); }
    this.st.dropProp('spot:' + key);
    this.spots.delete(key);
    this.dim = this.spots.size ? Math.max(...[...this.spots.values()].map((q) => q.dim)) : 0;
    if (!quiet) this.st.sfx('flick', { volume: 0.5, pitch: -6 });
  }
  place(sp) {
    const h = typeof sp.target === 'string' || (sp.target && !Array.isArray(sp.target)) ? this.who(sp.target) : null;
    const f = h ? this.feet(h) : { x: sp.target[0], z: sp.target[1], y: sp.target[2] || 0 };
    sp.obj.position.set(f.x, f.y, f.z);
    Object.assign(sp.src, { x: f.x, y: f.y + 3, z: f.z + 0.8 });
    if (sp.night) sp.src.power = sp.night * ((this.P.lighting && this.P.lighting.lampLevel) || 0);
  }
  // (the light a scene sets for itself, less the spotlights’ own dimming)
  baseGloom(L) { return this.wrote !== null && L.gloom === this.wrote ? this.base : L.gloom; }

  // the camera goes in on an actor (or [x, z, y]) — and back where it was with pull()
  push(target, { mul = 2, dur = 0.3, dz = -0.5 } = {}) {
    const st = this.st, h = Array.isArray(target) ? null : this.who(target);
    const f = h ? this.feet(h) : { x: target[0], z: target[1], y: target[2] || 0 };
    if (!st.cv) return Promise.resolve();
    if (!this.back) this.back = { x: st.cv.x, z: st.cv.z, ppu: st.cv.ppu };
    const ppu = Math.max(8, Math.round(this.back.ppu * mul / 8) * 8);
    if (!this.skipping) st.sfx('select', { volume: 0.25, pitch: 5 });
    return st.cam(f.x, f.z - f.y + dz, { dur, ppu });
  }
  pull(dur = 0.3) {
    const b = this.back;
    this.back = null;
    return b && this.st.cv ? this.st.cam(b.x, b.z, { dur, ppu: b.ppu }) : Promise.resolve();
  }

  // ---- things in the air and in hand
  // balls over a juggler: st.act.juggle('brick', ['#ffd66b', …]) — juggle(id, null) puts them away
  juggle(id, cols = ['#f4a4b6', '#9fdcff', '#fff3a6']) {
    const h = this.who(id), key = 'jug:' + (h ? h.id : id);
    this.endExtra(key);
    if (!cols || !h || this.skipping) return null;
    const obj = juggleBalls(this.K, cols);
    this.P.world.over.root.add(obj);
    const X = { obj, h, toss: null, upd: (T) => {
      const f = this.feet(h), n = obj.userData.balls.length;
      obj.position.set(f.x, f.y, f.z);
      obj.userData.balls.forEach((b, i) => {
        if (X.toss && X.toss.i === i) { const q = X.toss, e = Math.min(1, (T - q.t0) / q.dur); b.position.set(q.dx * e, 1.2 * f.s + q.dy * e + S(e * PI) * q.up, q.dz * e); if (e >= 1) b.visible = false; return; }
        const ph = T * 4.2 + (i / n) * PI * 2;
        b.position.set(Math.cos(ph) * 0.34 * f.s * f.dir.z, (1.25 + Math.abs(S(ph)) * 0.8) * f.s, 0.12 - Math.cos(ph) * 0.34 * f.s * f.dir.x);
      });
    }, end: () => { if (obj.parent) obj.parent.remove(obj); } };
    this.extras.set(key, X);
    return X;
  }
  // one of them gets away: it flies off to (x, z) and is gone
  toss(id, i, x, z, { up = 3, dur = 1.1 } = {}) {
    const h0 = this.who(id), X = this.extras.get('jug:' + (h0 ? h0.id : id));
    if (!X || this.skipping) return Promise.resolve();
    const f = this.feet(X.h);
    X.toss = { i, t0: this.T, dur, dx: x - f.x, dz: z - f.z, dy: -1, up };
    return this.tw(dur, () => {});
  }
  // something in the hand ('fan', 'ember', 'flag' — of a colour): it goes when the scene does —
  // give(id, null) sooner
  give(id, kind, col = '#fbf6ec') {
    const h = this.who(id), key = 'hand:' + (h ? h.id : id);
    this.endExtra(key);
    if (!kind || !h || h.rig || !h.n.model || !h.n.model.arms || !this.st.active) return;
    const K = this.K, g = new THREE.Group(), arm = h.n.model.arms[1], px = 1 / 16;
    if (kind === 'ember') K.noCast(K.put(g, K.ball(0.13, 8, 6), K.glow('#ffd66b', '#ffb040', 1.6), 0, 0.04, 0.04));
    else if (kind === 'fan') for (let i = 0; i < 5; i++) { const b = K.put(g, K.box(0.07, 0.42, 0.02), K.c(i % 2 ? '#f2c14e' : '#c9a2f0'), 0, 0.2, 0); b.rotation.z = -0.7 + i * 0.35; b.position.x = S(-0.7 + i * 0.35) * 0.1; }
    else { K.put(g, K.box(0.06, 1.0, 0.06), K.c('#8a6a4a'), 0, -0.22, 0); K.put(g, K.box(0.62, 0.4, 0.04), K.c(col), 0.32, -0.52, 0); }
    g.position.set(0, -5.2 * px, 1.2 * px); g.rotation.x = kind === 'fan' ? PI : 0;
    arm.add(g);
    this.extras.set(key, { obj: g, end: () => arm.remove(g) });
  }
  endExtra(key) { const X = this.extras.get(key); if (X) { X.end(); this.extras.delete(key); } }
  // anything else that lives while the scene does: upd(T, dt) every frame, end() when it is over
  extra(key, upd, end = () => {}) { this.endExtra(key); if (this.st.active) this.extras.set(key, { upd, end }); }
  // Crumble’s Snuffbots act too (the combat model: { body, torso, arm, eyes, pilot, chimney… }):
  // stomp(), snuff() (the snuffer arm comes down), shoo() (it waves you off), puff()
  bot(obj) {
    const u = obj.userData, st = this.st, by = u.body.position.y, ax = u.arm.rotation.x, ay = u.arm.rotation.y, py = u.pilot.position.y;
    const at = () => obj.position;
    this.extra('bot', () => {
      // (the pilot bobs in his dome while he talks)
      const c = st.dialogue && st.dialogue.cur;
      u.pilot.position.y = py + (c && c.who === 'crumble' && c.shown < c.total ? Math.abs(S(this.T * 16)) * 0.07 : 0);
    }, () => { u.body.position.y = by; u.arm.rotation.x = ax; u.arm.rotation.y = ay; u.pilot.position.y = py; });
    const puff = (n = 6) => st.fx('smoke', at().x - 0.4, at().y + 3.2, at().z - 0.4, n, { color: '#8a8290' });
    return {
      puff,
      hop: () => this.tw(0.32, (e) => { u.body.position.y = by + S(e * PI) * 0.28; }, () => { u.body.position.y = by; st.sfx('thud', { volume: 0.35, pitch: 4 }); }),
      stomp: () => this.tw(0.5, (e) => { u.body.position.y = by + S(Math.min(1, e * 1.4) * PI) * 0.5; }, () => { u.body.position.y = by; st.sfx('stomp', { volume: 0.8 }); st.shake(0.5); st.fx('dust', at().x, 0.3, at().z + 0.6, 12); puff(4); mark('botStomp'); }),
      snuff: () => { st.sfx('clank', { volume: 0.6 }); return this.tw(0.7, (e) => { u.arm.rotation.x = ax - S(e * PI) * 1.3; }, () => { u.arm.rotation.x = ax; }).then(() => mark('botSnuff')); },
      shoo: () => { st.sfx('clank', { volume: 0.4, pitch: 5 }); return this.tw(0.9, (e) => { u.arm.rotation.y = ay + S(e * PI * 4) * 0.5; u.arm.rotation.x = ax - S(e * PI) * 0.5; }, () => { u.arm.rotation.y = ay; u.arm.rotation.x = ax; }); },
    };
  }

  // an actor carried along (blown, flown, slid) to (x, z) — and to a height y — whoever is talking:
  // a walk waits for its walker to finish his line, this doesn’t
  glide(id, x, z, dur, { y = null, lin = false } = {}) {
    const h = this.who(id);
    if (!h || !h.n) return Promise.resolve();
    const n = h.n, x0 = n.pos.x, z0 = n.pos.z, y0 = n.seatY === undefined ? this.ground(n) : n.seatY;
    return this.tw(dur, (e) => { n.pos.x = x0 + (x - x0) * e; n.pos.z = z0 + (z - z0) * e; if (y !== null) n.seatY = y0 + (y - y0) * e; }, null, 0, lin);
  }
  // in a moment (at once when the scene is skipped: fn must not mind)
  after(sec, fn) { return this.tw(sec, () => {}).then(fn); }

  // ---- a line’s beats: fns run one by one at the line’s {p} pauses (all of them by its end)
  beats(fns) {
    const W = { fns, i: 0 };
    this.watch = W;
    return () => { while (W.i < W.fns.length) W.fns[W.i++](); if (this.watch === W) this.watch = null; };
  }

  // ---- every frame (before the actors are drawn)
  update(dt) {
    this.T += dt;
    // the line’s beats
    const W = this.watch, c = this.st.dialogue && this.st.dialogue.cur;
    if (W && c && c.pages) {
      let n = 0;
      c.pages.forEach((q, i) => { n += i < c.page ? q.pauses.length : i === c.page ? q.pauses.filter((p) => p.done || c.shown >= c.total).length : 0; });
      while (W.i < Math.min(n, W.fns.length)) W.fns[W.i++]();
    }
    // entrances, exits
    if (this.tweens.length) {
      const due = [];
      for (const w of this.tweens) { w.t += dt; if (w.t >= 0) { const k = Math.min(1, w.t / w.dur); w.step(w.lin ? k : ease(k)); } if (w.t >= w.dur) due.push(w); }
      if (due.length) { this.tweens = this.tweens.filter((w) => !due.includes(w)); for (const w of due) { if (w.done) w.done(); w.res(); } }
    }
    // the gestures
    for (const A of [...this.on.values()]) {
      const h = A.h, n = h.n;
      // (an actor who stayed after the scene and has left since)
      if (A.keep && !this.st.active && n && this.P.npcs && !this.P.npcs.includes(n)) { this.drop(A); continue; }
      A.t += dt * ((A.o && A.o.rate) || 1);
      if (A.t < 0) continue;
      let ps;
      if (!A.g) {                                   // going back to rest
        const k = A.t / A.out;
        if (k >= 1) { this.drop(A); continue; }
        ps = mix(A.from, Z, ease(k));
      } else {
        const g = A.g, u = g.dur ? Math.min(1, A.t / g.dur) : 0, C = this.ctx(A);
        ps = g.fn(u, A.t, C);
        if (A.o.mirror) ps = flip(ps);
        if (A.t < 0.14) ps = mix(A.from, ps, ease(A.t / 0.14));
        for (const [i, q] of (g.cues || []).entries()) if (u >= q[0] && !A.done.has(i)) { A.done.add(i); q[1](C); }
        if (g.tick && (A.tickT -= dt) <= 0) { A.tickT = g.tick[0] / ((A.o && A.o.rate) || 1); g.tick[1](C); }
        const at = g.dur ? (g.at === undefined ? 0.5 : g.at) * g.dur : g.at || 0.3;
        if (!A.marked && A.t >= at) { A.marked = true; if (this.st.active) mark(A.name); }
        if (g.dur && A.t >= g.dur) {
          const r = A.res; A.res = null;
          if (g.then) Object.assign(A, { g: GESTURES[g.then], name: g.then, t: 0.2, from: ps, done: new Set(), marked: true });
          else Object.assign(A, { g: null, name: null, t: 0, from: ps, out: 0.16 });
          if (r) r();
        } else if (!g.dur && A.res && A.t >= 0.2) {
          const r = A.res; A.res = null; r();
          if (A.o.hold) { const o = A.o; this.tw(o.hold, () => {}).then(() => { if (this.on.get(h.n || h) === A && A.g === g) this.rest(h); }); }
        }
      }
      A.cur = ps;
      if (h.rig) rigApply(h, ps); else if (n) n.pose = ps;
    }
    for (const X of this.extras.values()) if (X.upd) X.upd(this.T);
    // the spotlights follow their actors, and dim the world (over whatever the scene has set)
    for (const sp of this.spots.values()) { this.place(sp); sp.k = Math.min(1, sp.k + dt * 9); sp.obj.userData.cone.material.opacity = sp.haze * sp.k + S(this.T * 3) * 0.012; sp.obj.userData.pool.material.opacity = sp.haze * 1.5; }
    const L = this.P.lighting;
    if (L && (this.dim > 0 || this.dimK > 0)) {
      if (this.wrote === null || L.gloom !== this.wrote) this.base = L.gloom;
      this.dimK += (this.dim - this.dimK) * Math.min(1, dt * 10);
      if (this.dim <= 0 && this.dimK < 0.01) { this.dimK = 0; L.gloom = this.base; this.wrote = null; } else this.wrote = L.gloom = 1 - (1 - this.base) * (1 - this.dimK);
    }
  }

  // the scene is being skipped: every entrance and exit jumps to its end, every gesture lets go
  finish() {
    const tw = this.tweens;
    this.tweens = [];
    for (const w of tw) { w.step(1); if (w.done) w.done(); w.res(); }
    for (const A of [...this.on.values()]) { if (A.res) { const r = A.res; A.res = null; r(); } }
    if (this.watch) { const W = this.watch; this.watch = null; while (W.i < W.fns.length) W.fns[W.i++](); }
  }
  // the scene is over: nobody is left in a pose, nothing in the air, no light on (but what was
  // asked to go on — `keep` — for an actor who stays)
  clear() {
    this.finish();
    for (const A of [...this.on.values()]) { const a = this.st.actors.get(A.h.id); if (!(A.keep && A.g && (!a || a.keep || a.stay))) this.drop(A); }
    for (const [key, X] of [...this.extras]) { if (X.h && this.on.has(X.h.n || X.h)) continue; X.end(); this.extras.delete(key); }
    for (const key of [...this.spots.keys()]) this.spotOff(key, true);
    const L = this.P.lighting;
    if (L && this.wrote !== null && L.gloom === this.wrote) L.gloom = this.base;
    this.dim = 0; this.dimK = 0; this.wrote = null;
    for (const [n, p] of this.homes) { n.pos.x = p.x; n.pos.z = p.z; }
    this.homes.clear(); this.rigs.clear(); this.back = null;
  }
  // (for the tests: what is still being played)
  left() { return [...this.on.values()].map((A) => (A.h.id || '?') + ':' + (A.name || 'rest')).concat([...this.extras.keys()], [...this.spots.keys()].map((k) => 'spot:' + k)); }
}

function K_rope(K, len) { const g = new THREE.Group(); K.noCast(K.put(g, K.box(0.07, len, 0.07), K.c('#d9c090'), 0, -len / 2, 0)); return g; }
function K_trap(K) { const g = new THREE.Group(); K.noCast(K.put(g, K.box(1.0, 0.02, 1.0), K.c('#1a1024'), 0, 0, 0)); K.noCast(K.put(g, K.box(1.14, 0.01, 1.14), K.c('#8a6a2a'), 0, -0.01, 0)); return g; }
