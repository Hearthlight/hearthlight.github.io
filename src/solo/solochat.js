// The solo game's side of the chat (src/ui/chat.js): T opens a chat line at the bottom of the
// screen (the keys type, the hero waits), a gamepad holds its talk button (LB, which a tap still
// turns the hotbar with) for the wheel of phrases & emotes, and the phone that drives the game has
// the same sheet as in Party Mode. Nobody else is listening — but the folk are: a « Hello! »
// gets a wave back, a « Thank you! » a smile.
import { ChatLine, ChatWheel, WHY, packLine } from '../ui/chat.js';
import { ctl, device } from '../ui/ui.js';
import { audio } from '../engine/audio.js';
import { t } from '../i18n.js';
import { HOTBAR } from '../state.js';

// what the villagers and wanderers answer a quick phrase with (an emote over their head)
const REPLY = { hi: 'wave', bye: 'wave', thanks: 'smile', nice: 'smile', love: 'heart', gg: 'cheer', wow: 'exclaim', lol: 'laugh', sorry: 'smile', look: 'question', help: 'exclaim', photo: 'photo' };

export class SoloChat {
  constructor(world) {
    this.w = world;
    this.chat = world.game.chat;
    this.line = null; this.wheel = null; this.osk = null;
    this.lbT = 0;
    this.chat.reset();
    this.chat.onLine((l, p) => { if (p && p === this.me) { this.heard(l, p); world.game.phone.send({ t: 'chat', l: packLine(l) }); } });
  }
  get me() { return this.w.wild ? this.w.wild.me : null; }
  get open() { return !!(this.line || this.wheel); }

  // a phone driving the solo game (src/solo/phone.js)
  onMsg(d) {
    const me = this.me;
    if (!me) return;
    let why = '';
    if (d.t === 'say') why = this.chat.post(me, { text: String(d.text || '') });
    else if (d.t === 'quick') why = this.chat.post(me, { q: String(d.id || '') });
    else if (d.t === 'emote') why = this.chat.post(me, { e: String(d.e || '') });
    else if (d.t === 'typing') { me.typing = !!d.on; me.typingT = d.on ? 30 : 0; return; }
    if (why && WHY[why]) this.w.game.phone.send({ t: 'chatNo', why });
  }

  // each frame, before the game reads its keys: returns true while a line or the wheel is open
  update(dt, input, busy) {
    const me = this.me;
    this.chat.update(dt);
    if (me && me.typingT > 0 && (me.typingT -= dt) <= 0) me.typing = false;
    if (!me) return false;
    if (this.line) {
      this.line.update(dt);
      if (this.line.done || busy) this.close();
      return !!this.line;
    }
    if (this.wheel) {
      this.wheel.update(dt);
      if (busy) { this.close(); return false; }
      if (this.osk) {
        this.osk.update(dt, input);
        if (this.osk.done) { const why = this.chat.post(me, { text: this.osk.v }); if (why && WHY[why]) this.w.hud.toast(t(WHY[why])); this.close(); }
        else if (this.osk.back) this.close();
        return true;
      }
      if (input.pressed('special')) { input.consume('special'); this.osk = this.wheel.write(); audio.sfx('open', { volume: 0.5 }); return true; }
      this.wheel.aim(input.moveVector());
      if (!input.down('hotPrev')) {
        const it = this.wheel.sel >= 0 ? this.wheel.items[this.wheel.sel] : null;
        if (it) this.chat.post(me, it.q ? { q: it.q } : { e: it.e });
        this.close();
      }
      return true;
    }
    if (busy) { this.lbT = 0; return false; }
    // T: the chat line (not while someone's typing a name)
    if (input.pressed('chat') && !input.textHandler) { input.consume('chat'); this.openLine(); return true; }
    // a gamepad's LB held: the wheel (the tap already turned the hotbar: it turns back)
    if (device() === 'pad' && input.down('hotPrev')) {
      this.lbT += dt;
      if (this.lbT > 0.35) { this.lbT = 0; const s = this.w.state; this.w.selectHot((s.hot + 1) % HOTBAR); this.wheel = new ChatWheel(); me.typing = true; audio.sfx('select', { volume: 0.5 }); return true; }
    } else this.lbT = 0;
    return false;
  }

  openLine() {
    const input = this.w.input, me = this.me;
    this.line = new ChatLine((text) => this.chat.post(me, { text }));
    this.typer = (e) => (this.line ? this.line.key(e) : false);
    input.textHandler = this.typer;
    me.typing = true;
    audio.sfx('open', { volume: 0.4 });
  }
  close() {
    const input = this.w.input;
    if (this.typer && input.textHandler === this.typer) input.textHandler = null;
    this.typer = null; this.line = null; this.wheel = null; this.osk = null;
    if (this.me) this.me.typing = false;
    input.consume();
  }

  // the folk nearby answer a quick phrase; the pet too
  heard(l, p) {
    if (!p || p !== this.me || !l.q || !REPLY[l.q]) return;
    const w = this.w, W = w.wild, at = p.pos, near = [];
    for (const n of w.npcs || []) if (n.map === w.mapId && !n.hidden) near.push(n);
    if (W && w.mapId === 'overworld') for (const n of W.npcs || []) if (!n.hidden) near.push(n);
    let best = null, bd = 6;
    for (const n of near) { const d = Math.hypot(n.pos.x - at.x, n.pos.z - at.z); if (d < bd) { bd = d; best = n; } }
    if (best && best.setEmote) { best.setEmote(REPLY[l.q], 2.2); if (best.face) best.face(at.x, at.z); }
    if (w.pet && w.pet.map === w.mapId && Math.hypot(w.pet.pos.x - at.x, w.pet.pos.z - at.z) < 5 && (l.q === 'hi' || l.q === 'love')) { w.pet.setEmote('heart', 1.6); w.pet.hop(0.05); }
  }

  draw(ctx) {
    const d = this.w.display, W = d.w, H = d.h, me = this.me;
    if (this.line) { const w = Math.min(W - 16, 320); this.line.draw(ctx, Math.round((W - w) / 2), H - 62, w, me ? me.color : undefined); }
    else if (this.osk) this.osk.draw(ctx, W, H);
    else if (this.wheel && me) {
      const u = this.w.toUi(me.pos.x, 1.2 + (this.w.player.baseY || 0), me.pos.z);
      this.wheel.draw(ctx, Math.round(Math.max(62, Math.min(W - 62, u.x))), Math.round(Math.max(62, Math.min(H - 62, u.y))), { x: ctl('special') });
    }
  }
}
