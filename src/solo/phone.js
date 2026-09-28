// Play the solo game with your phone. The big screen hosts a room on the dev
// server's relay (like Party Mode's lobby) and shows a QR code; the phone
// (pad.html) joins it and becomes the controller: the stick, A / B / X / Y,
// the bag, map, journal & hero pages and the hotbar — the game tells it what
// each button does right now. One phone at a time; the keyboard, a gamepad or
// the touch screen keep working alongside it.

import { PartyNet } from '../party/net.js';
import { mapImage, mapBase, mapUpdate } from '../party/worldmap.js';
import { qrCanvas } from '../party/qr.js';
import { drawText, wrap } from '../engine/font.js';
import { panel, button, UI, fitText } from '../ui/ui.js';
import { ITEMS } from '../data/items.js';
import { padIcons } from '../combat/classes.js';
import { ULTS } from '../combat/v4/talents.js';
import { audio } from '../engine/audio.js';
import { t, getLang } from '../i18n.js';

// the phone's buttons → the solo game's actions (B also backs out of menus)
const BTN = { a: ['interact'], b: ['jump', 'cancel'], x: ['special'], y: ['dodge'], u: ['ult'] };
const ACTS = new Set(['menu', 'pause', 'cancel', 'map', 'journal', 'hero', 'hotPrev', 'hotNext', 'bike', 'hud']);

export class SoloPhone {
  constructor(game) {
    this.game = game;
    this.net = null;
    this.pad = null;            // the phone's id while one is playing
    this.name = '';
    this.remote = { vec: { x: 0, y: 0 }, held: new Set(), taps: new Set() };
    this.panelOpen = false;
    this.qr = null; this.qrFor = '';
    this.ctxKey = ''; this.ctxT = 0;
    this.t = 0;
  }

  get connected() { return !!this.pad; }
  get wild() { const w = this.game.world; return this.game.mode === 'game' && w && w.wild && w.wild.big ? w.wild : null; }

  // ------------------------------------------------------------------ the room
  start() {
    if (this.net) return;
    const N = (this.net = new PartyNet());
    N.onLeave = (id) => { if (id === this.pad) this.drop(true); };
    N.onMsg = (id, d) => this.onMsg(id, d);
    N.start();
    this.game.input.remote = this.remote;
  }

  stop() {
    if (this.pad) { this.send({ t: 'kicked' }); this.net.kick(this.pad); }
    this.drop(false);
    if (this.net) { this.net.stop(); this.net = null; }
    this.game.input.remote = null;
    this.qr = null; this.qrFor = '';
  }

  // the phone went away: its buttons let go, the keyboard names come back
  drop(told) {
    if (!this.pad) return;
    this.pad = null;
    this.remote.held.clear(); this.remote.taps.clear(); this.remote.vec = { x: 0, y: 0 };
    const W = this.wild;
    if (W) { W.me.kind = 'keys'; W.me.id = 'solo'; }
    if (told) this.toast(t('Your phone disconnected'));
  }

  send(d) { if (this.net && this.pad) this.net.send(this.pad, d); }

  toast(text) { const w = this.game.world; if (this.game.mode === 'game' && w && w.hud) w.hud.toast(text); }

  onMsg(id, d) {
    if (!d || typeof d !== 'object') return;
    if (d.t === 'hi') {
      if (this.pad && this.pad !== id) { this.net.send(id, { t: 'error', msg: t('Another phone is already playing') }); return; }
      const first = this.pad !== id;
      this.pad = id;
      this.name = String(d.name || '').slice(0, 12);
      this.welcome();
      if (first) { audio.sfx('sparkle', { volume: 0.7 }); this.toast(t('Phone connected: {name} ♥', { name: this.name || '?' })); }
      if (this.panelOpen) this.closeAt = this.t + 1.4;
      return;
    }
    if (id !== this.pad) return;
    const R = this.remote, W = this.wild;
    switch (d.t) {
      case 'in': {
        const x = Number(d.x) || 0, y = Number(d.y) || 0, l = Math.hypot(x, y);
        R.vec = l > 1 ? { x: x / l, y: y / l } : { x, y };
        break;
      }
      case 'b': {
        const acts = BTN[d.k];
        if (!acts) break;
        for (const a of acts) { if (d.v) { R.held.add(a); R.taps.add(a); } else R.held.delete(a); }
        break;
      }
      case 'act':
        if (ACTS.has(d.a)) R.taps.add(d.a);
        else if (d.a === 'unstuck' && this.game.mode === 'game' && this.game.world.player) this.game.world.unstick();
        else if (d.a === 'worldmap') this.worldMap();
        break;
      case 'mapReq': {
        if (d.v === 2) { const b = W && mapBase(W); if (b && d.base !== b.v) this.send(b); const u = W && mapUpdate(W, W.me); if (u) this.send(u); break; }
        const src = W ? mapImage(W, d.w, d.h, d.near ? W.me.pos : null) : null;
        if (src) this.send({ t: 'map', src, near: !!d.near });
        break;
      }
      case 'bye': this.drop(true); break;
      // the phone's own screens: taming, talents & gear, mounts, the hero class
      case 'tame': if (W && W.mounts) W.mounts.onTameMsg(W.me, d); break;
      case 'talent': case 'talentReset': case 'gear': if (W && W.progress) W.progress.onMsg(W.me, d); break;
      case 'mount': if (W && W.mounts) W.mounts.choose(W.me, d.v); break;
      case 'pet': if (W && W.buddies) W.buddies.choose(W.me, typeof d.v === 'string' ? d.v : null); break;
      case 'cls': if (W) W.chooseClass(d.v); break;
      default: break;
    }
  }

  // the phone's Map button: the big screen's map, on the whole world
  worldMap() {
    const w = this.game.world;
    if (this.game.mode !== 'game' || !w.player || w.dialogue.active || w.busy > 0 || w.cinematic) return;
    if (!w.menu.open) w.menu.show('map');
    else w.menu.showTab('map');
    if (w.wild && w.wild.big) w.menu.mapView = 'world';
  }

  // tell the phone who it is and what it's playing
  welcome() {
    const g = this.game, s = g.state;
    this.send({ t: 'you', slot: 0, color: '#ef6479', name: g.mode === 'game' && s ? s.player.name : this.name });
    this.send({ t: 'phase', p: 'solo' });
    this.send({ t: 'screen', s: 'play' });
    this.send({ t: 'lang', v: getLang() });
    this.sendPortrait();
    this.attach();
    this.ctxKey = '';
  }

  // the hero out in the wild lands knows a phone is playing (letters on the buttons, the phone's screens)
  attach() {
    const W = this.wild;
    if (!W || !this.pad) return;
    W.me.kind = 'phone';
    W.me.id = this.pad;
    if (W.mounts) W.mounts.sendList(W.me);
    if (W.buddies) W.buddies.sendList(W.me);
    if (W.progress) { W.me.progKey = null; W.progress.sync(W.me); }
  }

  sendPortrait() {
    const g = this.game;
    if (g.mode !== 'game' || !g.portraits || !g.state) return;
    try {
      const c = g.portraits.get('player', g.state.player.look, 'happy');
      const cv = c.canvas || c;
      if (cv && cv.toDataURL) this.send({ t: 'portrait', src: cv.toDataURL() });
    } catch (e) { /* no portrait, no matter */ }
  }

  // ------------------------------------------------------------------ frame
  update(dt) {
    this.t += dt;
    if (!this.pad) return;
    // a new game / a loaded one: the hero gets to know the phone
    const W = this.wild;
    if (W && W.me.kind !== 'phone') { this.attach(); this.sendPortrait(); this.send({ t: 'you', slot: 0, color: '#ef6479', name: this.game.state.player.name }); }
    // what the buttons do right now (sent when it changes)
    if ((this.ctxT -= dt) > 0) return;
    this.ctxT = 0.1;
    const c = this.ctxNow(), key = JSON.stringify(c);
    if (key !== this.ctxKey) { this.ctxKey = key; this.send({ t: 'ctx', ...c }); }
  }

  ctxNow() {
    const g = this.game, w = g.world, s = g.state;
    const c = { mode: 'play', a: null, b: t('Jump'), x: null, y: null, hint: '', hot: '' };
    if (g.mode !== 'game' || !w || !w.player) {
      return { ...c, mode: 'title', a: t('OK'), b: t('Back'), hint: t('The stick picks, A chooses') };
    }
    if (this.panelOpen || g.overlay || w.menu.open || w.shop.open_) {
      const page = !this.panelOpen && !g.overlay && w.menu.open ? w.menu.page : null;
      const hint = page === 'pause' ? t('Paused — the stick picks, A chooses') : page ? t('The stick picks, ← → changes') : w.menu.open ? t('Tab ← → changes the page · the stick moves') : '';
      return { ...c, mode: 'menu', page, a: t('OK'), b: t('Back'), hint };
    }
    if (w.dialogue.active) return { ...c, mode: 'talk', a: w.dialogue.cur && w.dialogue.cur.choices ? t('Choose') : t('Next'), b: null };
    if (w.busy > 0 || w.cinematic) return { ...c, mode: 'wait', a: null, b: null };
    // playing: the valley's own prompt (Talk, Open…) or the wild lands' (Attack, Board, Ride…)
    const W = w.wild && w.wild.big ? w.wild : null;
    const wc = W ? W.ctx() : null;
    if (w.focus) c.a = t(w.focus.label);
    else if (wc && wc.a) c.a = t(wc.a);
    if (wc && wc.b !== undefined) c.b = wc.b ? t(wc.b) : null;
    if (wc && wc.x) c.x = t(wc.x);
    if (wc && wc.y) c.y = t(wc.y);
    if (wc && wc.hint) c.hint = t(wc.hint, wc.vars);
    // health & the special's recharge out in the wild lands
    const f = W && W.me.fighter;
    // (the phone always shows the special in a fight — filling up while it recharges)
    const spName = f && (f.moves ? f.moves.special : f.cls.special).name;
    if (f && !f.down && !c.x && W.armed() && W.gloomNear(12)) c.x = t(spName);
    // the moves' icons on the buttons
    const ic = W && padIcons({ a: w.focus ? null : wc && wc.a, x: (wc && wc.x) || (c.x === t(spName) ? spName : null), y: wc && wc.y }, f, W.me.mount && W.me.mount.D);
    if (ic) c.ic = ic;
    if (f && (W.armed() || f.hp < f.maxHp)) {
      c.hp = Math.round((100 * Math.max(0, f.hp)) / f.maxHp);
      c.lv = f.level;
      if (f.ultId && !f.down && W.armed() && !W.me.mount && !W.me.vehicle) { c.ult = Math.floor(f.ult); c.uic = ULTS[f.ultId].icon; }
      const full = (f.moves ? f.moves.special.cd : f.cls.special.cd) * (f.mods.cdr || 1);
      if (c.x && f.cd > 0) c.cd = Math.round((100 * f.cd) / full);
    }
    const held = s.bag[s.hot];
    c.hot = held && ITEMS[held.id] ? t(ITEMS[held.id].name) + (held.qty > 1 ? ` ×${held.qty}` : '') : t('(empty hands)');
    return c;
  }

  // ------------------------------------------------------------------ the QR panel
  openPanel() {
    this.start();
    this.panelOpen = true;
    this.closeAt = 0;
    this.sel = 0;
    audio.sfx('open');
  }

  closePanel() {
    this.panelOpen = false;
    this.game.input.consume();
    audio.sfx('close');
  }

  updatePanel(dt, input) {
    const N = this.net;
    // the code's here: draw its QR code
    if (N && N.code && this.qrFor !== N.joinUrl) { const url = N.joinUrl; this.qrFor = url; qrCanvas(url).then((c) => { if (this.qrFor === url) this.qr = c; }); }
    if (this.closeAt && this.t > this.closeAt) { this.closeAt = 0; this.closePanel(); return; }
    if (input.pressed('cancel') || input.pressed('menu') || input.pressed('pause')) { this.closePanel(); return; }
    const n = this.pad ? 2 : 1;
    if (input.repeat('left') || input.repeat('up')) this.sel = Math.max(0, this.sel - 1);
    if (input.repeat('right') || input.repeat('down')) this.sel = Math.min(n - 1, this.sel + 1);
    for (const r of this.btnRects || []) if (input.mouseIn(r.x, r.y, r.w, r.h)) { if (input.mouse.moved) this.sel = r.i; if (input.mouse.pressed) { input.mouse.pressed = false; this.sel = r.i; this.press(r.id); return; } }
    if (input.pressed('interact')) { input.consume('interact'); const r = (this.btnRects || [])[this.sel]; if (r) this.press(r.id); }
  }

  press(id) {
    if (id === 'close') this.closePanel();
    else if (id === 'stop') { this.stop(); audio.sfx('cancel'); this.closePanel(); }
  }

  drawPanel(ctx) {
    const W = this.game.display.w, H = this.game.display.h, N = this.net;
    ctx.fillStyle = 'rgba(20,14,28,0.72)';
    ctx.fillRect(0, 0, W, H);
    const pw = Math.min(W - 16, 330), ph = Math.min(H - 16, 214);
    const px = Math.round((W - pw) / 2), py = Math.round((H - ph) / 2);
    panel(ctx, px, py, pw, ph);
    drawText(ctx, t('Play with your phone'), px + pw / 2, py + 9, { color: '#8a5234', align: 'center' });
    // the QR code on the left, the words on the right
    const qs = Math.min(ph - 64, 126);
    const qx = px + 14, qy = py + 26;
    ctx.fillStyle = '#3b2a22'; ctx.fillRect(qx - 2, qy - 2, qs + 4, qs + 4);
    ctx.fillStyle = '#fffaf0'; ctx.fillRect(qx, qy, qs, qs);
    if (this.qr) {
      const k = Math.max(1, Math.floor(qs / this.qr.width)), sz = this.qr.width * k;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this.qr, qx + Math.floor((qs - sz) / 2), qy + Math.floor((qs - sz) / 2), sz, sz);
    } else drawText(ctx, '…', qx + qs / 2, qy + qs / 2 - 4, { color: UI.inkSoft, align: 'center' });
    const tx = qx + qs + 12, tw = px + pw - 12 - tx;
    let y = qy;
    const say = (text, color = UI.ink, gap = 3) => { for (const l of wrap(text, tw)) { drawText(ctx, l, tx, y, { color }); y += 10; } y += gap; };
    if (!N || N.status === 'unavailable') say(t('The phone controller needs a party server: play online or in the desktop app.'), '#c8454f');
    else if (N.status === 'full') say(t('The online party server is full right now. Try again in a few minutes.'), '#c8454f');
    else if (!N.code) say(t('Opening a room…'), UI.inkSoft);
    else {
      say(t('Scan the code with your phone (same Wi-Fi), or open:'), UI.inkSoft);
      say(N.joinUrl.replace(/^http:\/\//, ''), '#4f73b6');
      say(t('Room code: {code}', { code: N.code }), UI.ink, 6);
      if (this.pad) say(t('Connected: {name} ♥', { name: this.name || '?' }), '#4f955a');
      else say(t('Waiting for your phone') + '.'.repeat(1 + (Math.floor(this.t * 3) % 3)), '#8a5234');
      if (N.status === 'down') say(t('Reconnecting to the room…'), '#c8454f');
    }
    // how it plays
    const help = t('Stick: walk (push far to run) · A use · B jump · X special · Y dodge · the phone also opens your bag, map, journal & hero page.');
    const hl = wrap(help, pw - 28).slice(0, 3);
    hl.forEach((l, i) => drawText(ctx, l, px + 14, qy + qs + 8 + i * 10, { color: UI.inkSoft }));
    // buttons
    const btns = [['close', t('Done')]];
    if (this.pad || (N && N.code)) btns.push(['stop', t('Stop the phone')]);
    this.btnRects = [];
    const bw = 96, by = py + ph - 22;
    let bx = Math.round(px + pw / 2 - (btns.length * bw + (btns.length - 1) * 8) / 2);
    btns.forEach(([id, label], i) => {
      button(ctx, bx, by, bw, 15, fitText(label, bw - 6), { hot: this.sel === i, color: id === 'stop' ? '#a8483a' : null });
      this.btnRects.push({ id, x: bx, y: by, w: bw, h: 15, i });
      bx += bw + 8;
    });
    if (this.sel >= btns.length) this.sel = 0;
  }
}
