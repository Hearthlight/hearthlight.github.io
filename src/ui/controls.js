// The Controls screen (the title's "Controls", and the menu's Settings): the
// three ways to play side by side — the keyboard, a gamepad, a phone — each
// with what's what on it, and which one is in your hands right now. Nothing to
// switch: the game follows whichever you pick up (the prompts too). A on the
// phone's card opens its code; on the gamepad's, a little rumble to say hello.

import { drawText, measure, wrap } from '../engine/font.js';
import { panel, button, UI, fitText, keyCap, moveKeys, device, padName, isFace, faceGlyph } from './ui.js';
import { padLabel } from '../engine/input.js';
import { audio } from '../engine/audio.js';
import { t } from '../i18n.js';

const CARDS = ['keys', 'pad', 'phone'];

export class ControlsPanel {
  constructor(game) {
    this.game = game;
    this.open = false;
    this.sel = 0;
    this.t = 0;
    this.hello = 0;
  }

  show() {
    this.open = true;
    this.sel = Math.max(0, CARDS.indexOf(device() === 'touch' ? 'keys' : device()));
    this.t = 0;
    audio.sfx('open');
  }

  close() {
    this.open = false;
    this.game.input.consume();
    audio.sfx('close');
  }

  // the gamepad plugged in, if any (its name as the browser tells it)
  pad() {
    const pads = navigator.getGamepads ? [...navigator.getGamepads()] : [];
    const p = pads.find((q) => q && q.connected !== false);
    return p ? padLabel(p.id) : null;
  }

  update(dt, input) {
    this.t += dt;
    if (this.hello > 0) this.hello -= dt;
    if (input.pressed('cancel') || input.pressed('menu') || input.pressed('pause')) { this.close(); return; }
    if (input.repeat('left')) { this.sel = (this.sel + 2) % 3; audio.sfx('select', { volume: 0.4 }); }
    if (input.repeat('right')) { this.sel = (this.sel + 1) % 3; audio.sfx('select', { volume: 0.4 }); }
    for (const r of this.rects || []) if (input.mouseIn(r.x, r.y, r.w, r.h)) {
      if (input.mouse.moved && this.sel !== r.i) this.sel = r.i;
      if (input.mouse.pressed) { input.mouse.pressed = false; this.sel = r.i; if (r.go) { this.go(r.go); return; } }
    }
    if (input.pressed('interact')) { input.consume('interact'); this.go(CARDS[this.sel] === 'phone' ? 'phone' : CARDS[this.sel] === 'pad' ? 'rumble' : 'done'); }
  }

  go(what) {
    if (what === 'done') { this.close(); return; }
    if (what === 'phone') { this.open = false; this.game.phone.openPanel(); return; }
    if (what === 'rumble') {
      if (!this.pad()) { audio.sfx('cancel', { volume: 0.5 }); return; }
      this.game.input.rumble(0.7, 0.5, 260);
      this.hello = 1.2;
      audio.sfx('confirm');
    }
  }

  draw(ctx) {
    const d = this.game.display, W = d.w, H = d.h, now = device();
    ctx.fillStyle = 'rgba(20,14,28,0.72)';
    ctx.fillRect(0, 0, W, H);
    const pw = Math.min(W - 12, 468), ph = Math.min(H - 12, 256);
    const px = Math.round((W - pw) / 2), py = Math.round((H - ph) / 2);
    panel(ctx, px, py, pw, ph);
    drawText(ctx, t('Controls'), px + pw / 2, py + 7, { color: '#8a5234', align: 'center' });
    const sub = wrap(t('Play with whichever you like: the game follows the one in your hands.'), pw - 24).slice(0, 2);
    sub.forEach((l, i) => drawText(ctx, l, px + pw / 2, py + 18 + i * 9, { color: UI.inkSoft, align: 'center' }));
    const pad = this.pad(), phone = this.game.phone;
    const cy = py + 24 + sub.length * 9, gap = 6, cw = Math.floor((pw - 20 - gap * 2) / 3), ch = py + ph - 24 - cy;
    this.rects = [];
    CARDS.forEach((kind, i) => {
      const cx = px + 10 + i * (cw + gap), on = this.sel === i, inUse = kind === now;
      // the card
      ctx.fillStyle = on ? '#e0a526' : '#3b2a22'; ctx.fillRect(cx, cy, cw, ch);
      ctx.fillStyle = on ? '#fff3c4' : '#f3e3c3'; ctx.fillRect(cx + 1, cy + 1, cw - 2, ch - 2);
      if (on) { ctx.fillStyle = '#e0a526'; ctx.fillRect(cx + 1, cy + 1, cw - 2, 2); }
      this.rects.push({ x: cx, y: cy, w: cw, h: ch, i });
      // its name & picture, and whether it's here
      this.icon(ctx, kind, cx + 6, cy + 5);
      drawText(ctx, fitText(t(kind === 'keys' ? 'Keyboard' : kind === 'pad' ? 'Gamepad' : 'Phone'), cw - 34), cx + 28, cy + 8, { color: '#8a5234' });
      const st = kind === 'keys' ? [t('Always ready'), UI.inkSoft]
        : kind === 'pad' ? (pad ? [pad, '#4f955a'] : [t('Plug one in, press a button'), UI.inkSoft])
          : phone.connected ? [t('Connected ♥'), '#4f955a'] : phone.net ? [t('Waiting for your phone'), '#8a5234'] : [t('Scan a code to join'), UI.inkSoft];
      drawText(ctx, fitText(st[0], cw - 10), cx + 5, cy + 22, { color: st[1] });
      if (inUse) { const tx = t('In use'), tw = measure(tx) + 6; ctx.fillStyle = '#4f955a'; ctx.fillRect(cx + cw - tw - 4, cy - 5, tw, 10); drawText(ctx, tx, cx + cw - tw / 2 - 4, cy - 4, { color: '#fff7e6', align: 'center' }); }
      // what's what
      const rows = this.rows(kind);
      const rh = Math.max(10, Math.min(13, Math.floor((ch - 58) / rows.length)));
      ctx.fillStyle = on ? '#efd9a0' : '#e6d2ae'; ctx.fillRect(cx + 4, cy + 33, cw - 8, 1);
      rows.forEach(([label, key], j) => {
        const y = cy + 37 + j * rh;
        drawText(ctx, fitText(label, cw - 16 - this.keyW(key)), cx + 6, y + 1, { color: UI.ink });
        this.key(ctx, key, cx + cw - 6, y, kind);
      });
      // what A does here
      const act = kind === 'phone' ? t('Show the code') : kind === 'pad' ? (this.hello > 0 ? t('Brrr! Hello!') : t('Test the rumble')) : '';
      if (act) {
        const bw = cw - 12, by = cy + ch - 19;
        button(ctx, cx + 6, by, bw, 14, fitText(act, bw - 6), { hot: on, disabled: kind === 'pad' && !pad });
        this.rects.push({ x: cx + 6, y: by, w: bw, h: 14, i, go: kind === 'phone' ? 'phone' : 'rumble' });
      } else wrap(t('Keys follow your keyboard’s layout (AZERTY and QWERTZ too).'), cw - 12).slice(0, 2).forEach((l, j) => drawText(ctx, l, cx + 6, cy + ch - 21 + j * 9, { color: '#b8a080' }));
    });
    // the way out
    const hint = now === 'pad' ? t('{a} choose · {b} close', { a: padName('interact'), b: padName('cancel') }) : t('E choose · Esc close');
    drawText(ctx, fitText(hint, pw - 20), px + pw / 2, py + ph - 14, { color: '#b8a080', align: 'center' });
  }

  // the lines of a card: [what, which]
  rows(kind) {
    if (kind === 'keys') return [
      [t('Walk'), moveKeys()], [t('Run'), 'Shift'], [t('Talk & use'), keyCap('KeyE')], [t('Jump'), t('Space')], [t('Special move'), keyCap('KeyF')],
      [t('Dodge'), keyCap('KeyC')], [t('Ultimate'), keyCap('KeyG')], [t('Pause'), 'Esc'], [t('Bag & journal'), 'Tab'], [t('Map'), keyCap('KeyM')], [t('Hotbar'), keyCap('KeyQ') + ' ' + keyCap('KeyR')], [t('Display'), keyCap('KeyV')],
    ];
    if (kind === 'pad') return [
      [t('Walk'), t('Stick')], [t('Run'), padName('run')], [t('Talk & use'), padName('interact')], [t('Jump'), padName('jump')], [t('Special move'), padName('special')],
      [t('Dodge'), padName('dodge')], [t('Ultimate'), padName('ult')], [t('Pause'), padName('pause')], [t('Bag, journal & map'), padName('menu')], [t('Hotbar'), padName('hotPrev') + ' ' + padName('hotNext')], [t('Display'), padName('hud')],
    ];
    return [
      [t('Walk'), t('Stick')], [t('Run'), t('Push far')], [t('Talk & use'), 'A'], [t('Jump'), 'B'], [t('Special move'), 'X'],
      [t('Dodge'), 'Y'], [t('Ultimate'), 'U'], [t('Pause'), '⏸'], [t('Menus'), t('On the phone')],
    ];
  }

  keyW(key) { return isFace(key) ? 12 : measure(key) + 6; }

  // a key cap, a gamepad's round button, or a phone's button — right-aligned at x
  key(ctx, key, x, y, kind) {
    if (kind !== 'keys' && isFace(key)) { faceGlyph(ctx, x - 6, y + 5, key); return; }
    const w = measure(key) + 6;
    ctx.fillStyle = kind === 'keys' ? '#fff7e6' : '#3b2a2e';
    ctx.fillRect(x - w, y - 1, w, 10);
    ctx.fillStyle = kind === 'keys' ? '#c9a77c' : '#1e1624';
    ctx.fillRect(x - w, y + 8, w, 1);
    drawText(ctx, key, x - w / 2, y, { color: kind === 'keys' ? '#3b2a2e' : '#fff3c4', align: 'center' });
  }

  // little pictures: a keyboard, a gamepad, a phone
  icon(ctx, kind, x, y) {
    ctx.fillStyle = '#3b2a22';
    if (kind === 'keys') {
      ctx.fillRect(x, y + 2, 18, 11);
      ctx.fillStyle = '#e8dcc4'; ctx.fillRect(x + 1, y + 3, 16, 9);
      ctx.fillStyle = '#6b4330';
      for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) ctx.fillRect(x + 2 + c * 3 + (r === 1 ? 1 : 0), y + 4 + r * 2, 2, 1);
      ctx.fillRect(x + 5, y + 10, 8, 1);
    } else if (kind === 'pad') {
      drawText(ctx, '🎮', x + 9, y + 3, { color: '#3b2a22', align: 'center', scale: 2 });
    } else {
      ctx.fillRect(x + 4, y, 10, 16);
      ctx.fillStyle = '#9fd0f5'; ctx.fillRect(x + 5, y + 2, 8, 11);
      ctx.fillStyle = '#e8dcc4'; ctx.fillRect(x + 8, y + 14, 2, 1);
    }
  }
}
