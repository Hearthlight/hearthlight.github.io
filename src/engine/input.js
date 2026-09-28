// Unified keyboard / mouse / gamepad input with edge detection and key-repeat.

const KEYMAP = {
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  run: ['ShiftLeft', 'ShiftRight'],
  interact: ['KeyE', 'Enter', 'NumpadEnter'],
  jump: ['Space'],
  cancel: ['Escape', 'Backspace', 'KeyX'],
  menu: ['Tab', 'KeyI'],
  map: ['KeyM', 'Semicolon'],
  journal: ['KeyJ'],
  pause: ['Escape'],
  hotPrev: ['KeyQ', 'BracketLeft'],
  hotNext: ['KeyR', 'BracketRight'],
  debug: ['Backquote'],
  bike: ['KeyB'],
  special: ['KeyF'],        // out in the wild lands: your hero's special…
  dodge: ['KeyC'],          // …and a dodge roll (whistle / get off a mount)
  hero: ['KeyH'],           // the menu's Hero page (class, talents, gear, mounts)
  ult: ['KeyG'],            // your hero's ultimate, once its gauge is full
  hud: ['KeyV'],            // the HUD: full · compact · minimal
};
for (let i = 1; i <= 9; i++) KEYMAP['hot' + i] = ['Digit' + i];

// (A use · B jump/back · X special · Y dodge, like Party Mode; Start pauses, Select opens the
// bag, journal & map — `start` is Start alone, for the on-screen keyboard's OK)
const PAD = { interact: [0], cancel: [1], jump: [1], special: [2], dodge: [3], pause: [9], start: [9], menu: [8], hotPrev: [4], hotNext: [5], up: [12], down: [13], left: [14], right: [15], run: [7], hud: [6], bike: [10], ult: [11] };
const DEAD = 0.22;          // (a worn stick drifts: below this it's at rest)

// a gamepad's family, for its buttons' names: Xbox-like (A B X Y, the default),
// PlayStation (✕ ○ □ △) or Nintendo (B A Y X) — the standard mapping goes by place
export function padStyle(id = '') {
  const s = String(id).toLowerCase();
  if (/054c|playstation|dualsense|dualshock/.test(s)) return 'ps';
  if (/057e|nintendo|pro controller|joy-con/.test(s)) return 'nintendo';
  return 'xbox';
}
// its name, without the browser's (STANDARD GAMEPAD Vendor: …) tail
export function padLabel(id = '') {
  const s = String(id).replace(/\(.*$/, '').replace(/^[0-9a-f]{4}-[0-9a-f]{4}-/i, '').trim();
  return s || 'Gamepad';
}

export class Input {
  constructor(display) {
    this.display = display;
    this.keys = new Set();
    this.prev = new Set();
    this.cur = new Set();
    this.padButtons = new Set();
    this.holdTime = {};
    this.repeatFired = {};
    this.mouse = { x: -99, y: -99, down: false, pressed: false, released: false, wheel: 0, moved: false, rdown: false, rpressed: false };
    this.textHandler = null; // when set, receives printable chars (name entry)
    this.lastDevice = 'keyboard';
    this.padStyle = 'xbox';     // the family of the gamepad played last (its buttons' names)
    this.padNote = null;        // { name, on, at }: a gamepad just plugged in (or out), for a notice
    this.rumbleOn = true;
    this.anyPressed = false;
    this.onFirstGesture = null;
    // touch: a virtual stick on the left, buttons registered by the HUD
    this.touchMode = false;
    this.stick = null;          // { id, ox, oy, x, y }
    this.touchButtons = [];     // [{ action, x, y, r }] in UI px (set by the HUD each frame)
    this.touchHeld = new Map(); // pointerId -> action
    this.touchUi = false;       // true while a menu/dialogue wants plain taps
    // a phone playing the solo game (src/solo/phone.js): its stick, held actions & taps
    this.remote = null;         // { vec: {x, y}, held: Set, taps: Set }

    const canvas = display.canvas;
    window.addEventListener('keydown', (e) => {
      // Let the title screen's links keep normal keyboard focus and activation.
      const projectLinks = document.getElementById('project-links');
      if (projectLinks && !projectLinks.hidden && (e.code === 'Tab' || projectLinks.contains(e.target))) return;
      this._gesture();
      this.lastDevice = 'keyboard';
      if (this.textHandler) {
        if (this.textHandler(e)) { e.preventDefault(); return; }
      }
      if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Backspace'].includes(e.code)) e.preventDefault();
      if (e.repeat) return;
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    canvas.addEventListener('pointermove', (e) => {
      const p = display.toInternal(e.clientX, e.clientY);
      if (this.stick && e.pointerId === this.stick.id) { this.stick.x = p.x; this.stick.y = p.y; return; }
      if (this.touchHeld.has(e.pointerId)) return;
      this.mouse.x = p.x; this.mouse.y = p.y; this.mouse.moved = true;
      if (e.pointerType === 'mouse') this.lastDevice = 'mouse';
    });
    canvas.addEventListener('pointerdown', (e) => {
      this._gesture();
      canvas.focus();
      const p = display.toInternal(e.clientX, e.clientY);
      if (e.pointerType === 'touch') {
        this.touchMode = true;
        this.lastDevice = 'touch';
        if (!this.touchUi) {
          const b = this.touchButtons.find((q) => (p.x - q.x) ** 2 + (p.y - q.y) ** 2 <= (q.r + 6) ** 2);
          if (b) { this.touchHeld.set(e.pointerId, b.action); return; }
          if (!this.stick && p.x < display.w * 0.55 && p.y > display.h * 0.3 && !this.onHotbar(p)) {
            this.stick = { id: e.pointerId, ox: p.x, oy: p.y, x: p.x, y: p.y };
            return;
          }
        }
      }
      this.mouse.x = p.x; this.mouse.y = p.y;
      if (e.button === 2) { this.mouse.rdown = true; this._rclick = true; }
      else { this.mouse.down = true; this._click = true; }
      this.lastDevice = e.pointerType === 'touch' ? 'touch' : 'mouse';
    });
    const up = (e) => {
      if (this.stick && e.pointerId === this.stick.id) { this.stick = null; return; }
      if (this.touchHeld.has(e.pointerId)) { this.touchHeld.delete(e.pointerId); return; }
      if (e.button === 2) this.mouse.rdown = false;
      else { this.mouse.down = false; this._release = true; }
    };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    // (browsers only tell once a button has been pressed on the page)
    window.addEventListener('gamepadconnected', (e) => { this.padStyle = padStyle(e.gamepad.id); this.padNote = { name: padLabel(e.gamepad.id), on: true, at: performance.now() }; });
    window.addEventListener('gamepaddisconnected', (e) => { this.padNote = { name: padLabel(e.gamepad.id), on: false, at: performance.now() }; if (this.lastDevice === 'gamepad') this.lastDevice = 'keyboard'; });
    canvas.addEventListener('wheel', (e) => { this._wheel = (this._wheel || 0) + Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
  }

  _gesture() {
    // audio.unlock() is idempotent & cheap; calling it on every gesture keeps
    // Safari happy after interruptions.
    if (this.onGesture) this.onGesture();
    if (this.onFirstGesture) { const f = this.onFirstGesture; this.onFirstGesture = null; f(); }
  }

  // Called once per frame before game update.
  update(dt) {
    this.prev = this.cur;
    this.cur = new Set();
    for (const [action, codes] of Object.entries(KEYMAP)) {
      if (codes.some((c) => this.keys.has(c))) this.cur.add(action);
    }
    this._pollPad();
    for (const a of this.padButtons) this.cur.add(a);
    // virtual stick & touch buttons
    this.stickVec = null;
    if (this.stick) {
      const dx = this.stick.x - this.stick.ox, dy = this.stick.y - this.stick.oy, R = 22;
      const len = Math.hypot(dx, dy);
      if (len > 3) {
        const k = Math.min(1, len / R);
        this.stickVec = { x: (dx / len) * k, y: (dy / len) * k };
        if (dx / len < -0.5) this.cur.add('left');
        if (dx / len > 0.5) this.cur.add('right');
        if (dy / len < -0.5) this.cur.add('up');
        if (dy / len > 0.5) this.cur.add('down');
        if (len > R * 1.35) this.cur.add('run');
      }
    }
    for (const a of this.touchHeld.values()) this.cur.add(a);
    // a gamepad's stick: any direction, not just eight
    if (!this.stickVec && this.padVec) this.stickVec = this.padVec;
    // the phone (a tap always lasts one frame, however quick it was)
    const R = this.remote;
    if (R) {
      for (const a of R.held) this.cur.add(a);
      for (const a of R.taps) this.cur.add(a);
      const v = R.vec, len = Math.hypot(v.x, v.y);
      if (len > 0.18 && !this.stickVec) {
        this.stickVec = { x: v.x, y: v.y };
        if (v.x / len < -0.5 && len > 0.45) this.cur.add('left');
        if (v.x / len > 0.5 && len > 0.45) this.cur.add('right');
        if (v.y / len < -0.5 && len > 0.45) this.cur.add('up');
        if (v.y / len > 0.5 && len > 0.45) this.cur.add('down');
        if (len > 0.86) this.cur.add('run');
      }
      if (R.taps.size || R.held.size || len > 0.18) this.lastDevice = 'phone';
      R.taps.clear();
    }
    // Space jumps while you play, but still confirms in menus & dialogue
    if (this.touchUi && this.keys.has('Space')) this.cur.add('interact');

    this.anyPressed = false;
    for (const a of this.cur) {
      if (!this.prev.has(a)) this.anyPressed = true;
      this.holdTime[a] = (this.holdTime[a] || 0) + dt;
    }
    for (const a of Object.keys(this.holdTime)) if (!this.cur.has(a)) { this.holdTime[a] = 0; this.repeatFired[a] = 0; }

    this.mouse.pressed = !!this._click; this._click = false;
    this.mouse.rpressed = !!this._rclick; this._rclick = false;
    this.mouse.released = !!this._release; this._release = false;
    this.mouse.wheel = this._wheel || 0; this._wheel = 0;
    if (this.mouse.pressed) this.anyPressed = true;
  }

  _pollPad() {
    this.padButtons.clear();
    this.padVec = null;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) {
      if (!p || p.connected === false) continue;
      let used = false;
      for (const [action, idxs] of Object.entries(PAD)) {
        if (idxs.some((i) => p.buttons[i] && p.buttons[i].pressed)) { this.padButtons.add(action); used = true; }
      }
      // the left stick: a direction (pushed far, a run), and ←↑→↓ for the menus
      const ax = p.axes[0] || 0, ay = p.axes[1] || 0, len = Math.hypot(ax, ay);
      if (len > DEAD) {
        if (!this.padVec) this.padVec = { x: ax / len * Math.min(1, len), y: ay / len * Math.min(1, len) };
        if (len > 0.9) this.padButtons.add('run');
        used = true;
      }
      if (ax < -0.45) this.padButtons.add('left');
      if (ax > 0.45) this.padButtons.add('right');
      if (ay < -0.45) this.padButtons.add('up');
      if (ay > 0.45) this.padButtons.add('down');
      if (used) { this.lastDevice = 'gamepad'; this.padStyle = padStyle(p.id); }
    }
  }

  // a gamepad's rumble (what a phone's buzz is to phones): strong & weak 0–1, for ms
  // (`index`: just that pad — Party Mode's players each hold their own)
  rumble(strong = 0.5, weak = 0.3, ms = 120, index = null) {
    if (!this.rumbleOn || !navigator.getGamepads) return;
    for (const p of navigator.getGamepads()) {
      if (!p || (index !== null && p.index !== index)) continue;
      const a = p.vibrationActuator;
      try {
        if (a && a.playEffect) { const r = a.playEffect('dual-rumble', { startDelay: 0, duration: ms, weakMagnitude: weak, strongMagnitude: strong }); if (r && r.catch) r.catch(() => {}); }
        else if (p.hapticActuators && p.hapticActuators[0] && p.hapticActuators[0].pulse) p.hapticActuators[0].pulse(strong, ms);
      } catch (e) { /* no rumble on this one */ }
    }
  }

  // a phone's vibration (ms, or [on, off, on…] like navigator.vibrate) as a rumble
  buzz(pattern = 40, index = null) {
    const arr = Array.isArray(pattern) ? pattern : [pattern];
    const on = arr.filter((_, i) => i % 2 === 0).reduce((a, b) => a + (+b || 0), 0), all = arr.reduce((a, b) => a + (+b || 0), 0);
    const k = Math.min(1, on / 90);
    this.rumble(0.12 + 0.75 * k, 0.22 + 0.5 * k, Math.max(45, Math.min(600, all)), index);
  }

  // is a gamepad plugged in (and has it said so)?
  get padConnected() { return !!(navigator.getGamepads && [...navigator.getGamepads()].some((p) => p && p.connected !== false)); }

  // a gamepad or a phone: the buttons are called A / B / X / Y
  get padLike() { return this.lastDevice === 'gamepad' || this.lastDevice === 'phone'; }

  down(a) { return this.cur.has(a); }
  pressed(a) { return this.cur.has(a) && !this.prev.has(a); }
  released(a) { return !this.cur.has(a) && this.prev.has(a); }

  // True on first press and then repeatedly while held (menus).
  repeat(a, delay = 0.32, rate = 0.075) {
    if (this.pressed(a)) return true;
    const t = this.holdTime[a] || 0;
    if (t < delay) return false;
    const n = Math.floor((t - delay) / rate);
    if (n > (this.repeatFired[a] || 0)) { this.repeatFired[a] = n; return true; }
    return false;
  }

  // Swallow current presses (e.g. after closing a menu so E doesn't re-trigger).
  consume(...actions) {
    for (const a of actions.length ? actions : [...this.cur]) this.prev.add(a);
    this.mouse.pressed = false;
  }

  onHotbar(p) { const r = this.hotbarRect; return !!r && p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h; }

  moveVector() {
    if (this.stickVec) return { x: this.stickVec.x, y: this.stickVec.y };
    let x = 0, y = 0;
    if (this.down('left')) x -= 1;
    if (this.down('right')) x += 1;
    if (this.down('up')) y -= 1;
    if (this.down('down')) y += 1;
    return { x, y };
  }

  mouseIn(x, y, w, h) {
    const m = this.mouse;
    return m.x >= x && m.x < x + w && m.y >= y && m.y < y + h;
  }
}
