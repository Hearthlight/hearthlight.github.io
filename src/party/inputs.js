// Per-player input sources for Party Mode. Every source offers the little
// interface the Player actor expects (moveVector / down / pressed), with
// A = 'interact' and B = 'jump' (and, for the ones without a phone, M = their
// own menu on the big screen: tvmenu.js).

import { padStyle } from '../engine/input.js';

// (t: talk — a keyboard's chat line, a gamepad's wheel of phrases: src/party/partychat.js)
const ACTIONS = { a: ['interact', 'a'], b: ['jump', 'b'], x: ['special', 'x'], y: ['y'], u: ['ult', 'u'], m: ['menu', 'm'], t: ['talk', 't'] };
const NONE = { a: false, b: false, x: false, y: false, u: false, m: false, t: false };
const NO_TAPS = { a: 0, b: 0, x: 0, y: 0, u: 0, m: 0, t: 0 };

class BaseInput {
  constructor(kind) {
    this.kind = kind;
    this.cur = new Set();
    this.prev = new Set();
    this.edges = new Set();
    this.vec = { x: 0, y: 0 };
  }
  moveVector() { return { x: this.vec.x, y: this.vec.y }; }
  down(a) { return this.cur.has(a); }
  pressed(a) { return this.edges.has(a); }
  released(a) { return this.prev.has(a) && !this.cur.has(a); }
  // shared bookkeeping once the raw state is known
  commit(buttons, taps, vec, run) {
    this.prev = this.cur;
    this.cur = new Set();
    this.edges = new Set();
    for (const k of ['a', 'b', 'x', 'y', 'u', 'm', 't']) {
      const on = buttons[k] || taps[k] > 0;
      for (const a of ACTIONS[k]) {
        if (on) this.cur.add(a);
        if ((on && !this.prev.has(a)) || taps[k] > 0) this.edges.add(a);
      }
    }
    const len = Math.hypot(vec.x, vec.y);
    this.vec = len < 0.18 ? { x: 0, y: 0 } : { x: vec.x, y: vec.y };
    if (run) this.cur.add('run');
    for (const d of ['left', 'right', 'up', 'down']) if (this.dirOn(d)) this.cur.add(d);
    for (const d of ['left', 'right', 'up', 'down']) if (this.cur.has(d) && !this.prev.has(d)) this.edges.add(d);
  }
  dirOn(d) {
    const v = this.vec;
    return d === 'left' ? v.x < -0.5 : d === 'right' ? v.x > 0.5 : d === 'up' ? v.y < -0.5 : v.y > 0.5;
  }
  get active() { return this.vec.x !== 0 || this.vec.y !== 0 || this.cur.size > 0; }
}

// A phone, fed by messages relayed from the controller page.
export class RemoteInput extends BaseInput {
  constructor() {
    super('phone');
    this.stick = { x: 0, y: 0 };
    this.btn = { a: false, b: false, x: false, y: false, u: false };
    this.taps = { a: 0, b: 0, x: 0, y: 0, u: 0 };
    this.seen = performance.now();
  }
  onMsg(d) {
    this.seen = performance.now();
    if (d.t === 'in') {
      const x = Number(d.x) || 0, y = Number(d.y) || 0;
      const l = Math.hypot(x, y);
      this.stick = l > 1 ? { x: x / l, y: y / l } : { x, y };
    } else if (d.t === 'b' && (d.k === 'a' || d.k === 'b' || d.k === 'x' || d.k === 'y' || d.k === 'u')) {
      const v = !!d.v;
      if (v && !this.btn[d.k]) this.taps[d.k]++;
      this.btn[d.k] = v;
    }
  }
  release() { this.stick = { x: 0, y: 0 }; this.btn = { a: false, b: false, x: false, y: false, u: false }; }
  update() {
    const run = Math.hypot(this.stick.x, this.stick.y) > 0.86;
    this.commit(this.btn, this.taps, this.stick, run);
    this.taps = { a: 0, b: 0, x: 0, y: 0, u: 0 };
  }
}

// The big screen's own keyboard: two layouts so two people can share it.
export const KEY_LAYOUTS = {
  // (one keyboard player: ZQSD / WASD or the arrows, E or Enter — the solo game's keys work too)
  wasd: { name: 'Keyboard', up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'], a: ['KeyE', 'Enter', 'NumpadEnter', 'KeyJ'], b: ['Space', 'KeyK'], x: ['KeyF', 'KeyQ', 'KeyL'], y: ['KeyR', 'KeyC', 'KeyU'], u: ['KeyG'], m: ['Tab'], t: ['KeyT'], run: ['ShiftLeft', 'ShiftRight'], join: ['KeyE', 'Enter', 'NumpadEnter', 'Space'] },
};

export class KeyInput extends BaseInput {
  constructor(keys, layout) {
    super('keys');
    this.keys = keys;           // the game's live Set of pressed key codes
    this.layout = KEY_LAYOUTS[layout] || KEY_LAYOUTS.wasd;
    this.layoutId = KEY_LAYOUTS[layout] ? layout : 'wasd';
    this.last = { a: false, b: false };
  }
  update() {
    const k = this.keys, L = this.layout, on = (cs) => cs.some((c) => k.has(c));
    let x = 0, y = 0;
    if (on(L.left)) x -= 1;
    if (on(L.right)) x += 1;
    if (on(L.up)) y -= 1;
    if (on(L.down)) y += 1;
    const l = Math.hypot(x, y) || 1;
    const btn = { a: L.a.some((c) => k.has(c)), b: L.b.some((c) => k.has(c)), x: L.x.some((c) => k.has(c)), y: L.y.some((c) => k.has(c)), u: L.u.some((c) => k.has(c)), m: L.m.some((c) => k.has(c)), t: L.t.some((c) => k.has(c)) };
    this.commit(btn, NO_TAPS, { x: x / l, y: y / l }, L.run.some((c) => k.has(c)));
  }
}

// A physical gamepad plugged into the big screen (Back / Select: its player's own menu).
export class PadInput extends BaseInput {
  constructor(index) {
    super('gamepad');
    this.index = index;
    this.style = 'xbox';          // its family: Xbox, PlayStation, Nintendo (the buttons' names)
    this.name = '';
  }
  update() {
    const p = navigator.getGamepads ? navigator.getGamepads()[this.index] : null;
    if (!p) { this.commit(NONE, NO_TAPS, { x: 0, y: 0 }, false); return; }
    if (p.id !== this.name) { this.name = p.id; this.style = padStyle(p.id); }
    let x = p.axes[0] || 0, y = p.axes[1] || 0;
    const b = (i) => !!(p.buttons[i] && p.buttons[i].pressed);
    if (b(14)) x = -1; if (b(15)) x = 1; if (b(12)) y = -1; if (b(13)) y = 1;
    const l = Math.hypot(x, y);
    if (l > 1) { x /= l; y /= l; }
    this.commit({ a: b(0), b: b(1), x: b(2), y: b(3), u: b(11), m: b(8), t: b(4) }, NO_TAPS, { x, y }, l > 0.92 || b(7) || b(6));
  }
}

// What a player without a phone feels while their menu is open: nothing at all
// (their own input still drives the menu — tvmenu.js).
export class QuietInput {
  constructor(real) { this.real = real; this.kind = real.kind; this.cur = new Set(); this.edges = new Set(); this.prev = new Set(); }
  get index() { return this.real.index; }
  get layoutId() { return this.real.layoutId; }
  get style() { return this.real.style; }
  get name() { return this.real.name; }
  moveVector() { return { x: 0, y: 0 }; }
  down() { return false; }
  pressed() { return false; }
  released() { return false; }
  update() {}
  release() {}
  get active() { return false; }
}
