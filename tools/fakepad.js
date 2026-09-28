// Pretend gamepads for tests (the browser pane has no real one): navigator.getGamepads()
// returns these, with the standard mapping. Press, hold, push the stick; rumbles land
// in window.__rumble.
//   const F = await import('/tools/fakepad.js'); F.install(2, 'ps'); await F.press(0, 'a');
// Families: 'xbox' (default), 'ps' (a DualSense), 'nintendo' (a Switch Pro).

const IDS = {
  xbox: 'Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)',
  ps: 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)',
  nintendo: 'Pro Controller (STANDARD GAMEPAD Vendor: 057e Product: 2009)',
};
export const BTN = { a: 0, b: 1, x: 2, y: 3, lb: 4, rb: 5, lt: 6, rt: 7, select: 8, start: 9, l3: 10, r3: 11, up: 12, down: 13, left: 14, right: 15 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const step = async (n) => { for (let i = 0; i < n; i++) { await window.game.debug.step(1, 1 / 60); } };

export function install(n = 1, family = 'xbox') {
  const pads = window.__pads = window.__pads || [];
  for (let i = pads.length; i < n; i++) {
    const id = IDS[Array.isArray(family) ? family[i] : family] || IDS.xbox;
    pads.push({
      index: i, id, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0],
      buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })),
      vibrationActuator: { type: 'dual-rumble', playEffect: (type, o) => { (window.__rumble = window.__rumble || []).push([i, +o.strongMagnitude.toFixed(2), o.duration]); return Promise.resolve('complete'); } },
    });
    const ev = new Event('gamepadconnected');
    ev.gamepad = pads[i];
    window.dispatchEvent(ev);
  }
  navigator.getGamepads = () => [0, 1, 2, 3].map((i) => pads[i] || null);
  return pads;
}

export function unplug(i) {
  const p = window.__pads && window.__pads[i];
  if (!p) return;
  p.connected = false;
  window.__pads[i] = null;
  const ev = new Event('gamepaddisconnected');
  ev.gamepad = p;
  window.dispatchEvent(ev);
}

export function set(i, b, on = true) {
  const k = BTN[b] ?? b, btn = window.__pads[i].buttons[k];
  btn.pressed = on; btn.touched = on; btn.value = on ? 1 : 0;
}
export function stick(i, x, y) { const p = window.__pads[i]; p.axes[0] = x; p.axes[1] = y; }

// a press: down for a few frames, then up (the relay-free input needs no real time)
export async function press(i, b, frames = 3) { set(i, b, true); await step(frames); set(i, b, false); await step(2); }
export async function hold(i, b, frames) { set(i, b, true); await step(frames); set(i, b, false); await step(1); }
// several presses in a row, with a little air between them
export async function seq(i, list, gap = 2) { for (const b of list) { await press(i, b); await step(gap); } await sleep(1); }
