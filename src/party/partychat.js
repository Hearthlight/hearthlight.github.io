// Party Mode's side of the chat (src/ui/chat.js): phones send
// { t:'say', text } / { t:'quick', id } / { t:'emote', e } / { t:'typing', on }; a keyboard player
// presses T for a chat line at the bottom of their view (their keys type meanwhile, the others
// keep playing); a gamepad holds its talk button for the wheel (the stick points, letting go says
// it; X writes with the on-screen keys). Every line goes to the phones' log, and a small fading log
// sits in the big screen's corner.
import { ChatLine, ChatWheel, drawChatLog, WHY, packLine } from '../ui/chat.js';
import { QuietInput } from './inputs.js';
import { keyOf } from './tvmenu.js';
import { audio } from '../engine/audio.js';
import { t } from '../i18n.js';

// a player's input, the way the on-screen keys like it (a held direction repeats)
class KeysInput {
  constructor(P, real) { this.P = P; this.real = real; this.hold = {}; this.fired = {}; }
  get mouse() { return this.P.game.input.mouse; }
  tick(dt) { for (const d of ['left', 'right', 'up', 'down']) { if (this.real.down(d)) this.hold[d] = (this.hold[d] || 0) + dt; else { this.hold[d] = 0; this.fired[d] = 0; } } }
  map(a) { return { interact: 'a', special: 'x', dodge: 'y', cancel: 'b', jump: 'b', menu: 'm', start: 'm' }[a] || a; }
  pressed(a) { return this.real.pressed(this.map(a)); }
  down(a) { return this.real.down(this.map(a)); }
  repeat(d) {
    if (this.real.pressed(d)) return true;
    const h = this.hold[d] || 0;
    if (h < 0.32) return false;
    const n = Math.floor((h - 0.32) / 0.075);
    if (n > (this.fired[d] || 0)) { this.fired[d] = n; return true; }
    return false;
  }
  consume() { this.real.edges.clear(); }
  mouseIn() { return false; }
}

export class PartyChat {
  constructor(P) {
    this.P = P;
    this.chat = P.game.chat;
    this.chat.reset();
    this.open = new Map();          // local player → { line } | { wheel, osk?, input }
    this.off = this.chat.onLine((l) => this.P.net.broadcast({ t: 'chat', l: packLine(l) }));
  }
  dispose() { for (const p of [...this.open.keys()]) this.close(p); if (this.off) this.off(); }

  // ---- phones (and friends at home)
  onMsg(p, d) {
    let why = '';
    if (d.t === 'say') why = this.chat.post(p, { text: String(d.text || '') });
    else if (d.t === 'quick') why = this.chat.post(p, { q: String(d.id || '') });
    else if (d.t === 'emote') why = this.chat.post(p, { e: String(d.e || '') });
    else if (d.t === 'typing') { p.typing = !!d.on; p.typingT = d.on ? 30 : 0; return; }
    if (why && WHY[why]) this.P.net.send(p.id, { t: 'chatNo', why });
  }
  // a phone joining (or back): the last lines, so its log isn't empty
  syncPad(p) { this.P.net.send(p.id, { t: 'chatLog', lines: this.chat.log.slice(-30).map(packLine) }); }

  // ---- keyboards & gamepads on the big screen
  update(dt) {
    const P = this.P;
    this.chat.update(dt);
    for (const p of P.players) if (p.typingT > 0 && (p.typingT -= dt) <= 0) p.typing = false;
    for (const [p, o] of this.open) {
      if (!P.players.includes(p) || !p.connected || P.tvmenus.isOpen(p) || (P.stage && P.stage.active) || P.vote) { this.close(p); continue; }
      if (o.line) { o.line.update(dt); if (o.line.done) this.close(p); continue; }
      const real = o.real;
      o.wheel.update(dt);
      if (o.osk) {
        o.input.tick(dt);
        o.osk.update(dt, o.input);
        if (o.osk.done) { const why = this.chat.post(p, { text: o.osk.v }); if (why && WHY[why]) P.toast(t(WHY[why]), p.color); this.close(p); }
        else if (o.osk.back) this.close(p);
        continue;
      }
      if (real.pressed('x')) { o.osk = o.wheel.write({ a: keyOf(p, 'a'), b: keyOf(p, 'b'), x: keyOf(p, 'x'), ok: keyOf(p, 'm') }); o.input = new KeysInput(P, real); audio.sfx('open', { volume: 0.5 }); continue; }
      o.wheel.aim(real.moveVector());
      if (!real.down('talk')) {
        const it = o.wheel.sel >= 0 ? o.wheel.items[o.wheel.sel] : null;
        if (it) this.chat.post(p, it.q ? { q: it.q } : { e: it.e });
        this.close(p);
      }
    }
    if (P.phase === 'paused' || P.host.menu) return;
    for (const p of P.players) {
      if (p.kind === 'phone' || !p.connected || this.open.has(p) || P.tvmenus.isOpen(p)) continue;
      if (!p.input.pressed('talk') || P.vote || (P.stage && P.stage.active)) continue;
      p.input.edges.delete('talk');
      if (p.kind === 'keys') this.openLine(p); else this.openWheel(p);
    }
  }

  openLine(p) {
    const g = this.P.game.input;
    if (g.textHandler) return;           // (someone's already typing on this keyboard: their name, a line)
    const line = new ChatLine((text) => this.chat.post(p, { text }));
    const real = p.input;
    p.input = new QuietInput(real);
    this.open.set(p, { line, real, typer: (e) => line.key(e) });
    g.textHandler = this.open.get(p).typer;
    p.typing = true;
    audio.sfx('open', { volume: 0.4 });
  }
  openWheel(p) {
    const real = p.input;
    p.input = new QuietInput(real);
    this.open.set(p, { wheel: new ChatWheel(), real });
    p.typing = true;
    audio.sfx('select', { volume: 0.5 });
  }
  close(p) {
    const o = this.open.get(p);
    if (!o) return;
    this.open.delete(p);
    const g = this.P.game.input;
    if (o.typer && g.textHandler === o.typer) g.textHandler = null;
    o.real.edges.clear();
    if (p.input instanceof QuietInput) p.input = o.real;
    p.typing = false;
  }
  isOpen(p) { return this.open.has(p); }
  // (their own input goes on being read while their hero stands still)
  realOf(p) { const o = this.open.get(p); return o ? o.real : null; }

  // the lines, wheels & keys, each in its player's view; the log in the corner
  draw(ctx) {
    const P = this.P, d = P.display;
    for (const [p, o] of this.open) {
      const v = P.cam.views.find((q) => q.members && q.members.includes(p)) || P.cam.views[0];
      if (!v) continue;
      const a = d.worldToUi(v.rect.x, v.rect.y), b = d.worldToUi(v.rect.x + v.rect.w, v.rect.y + v.rect.h);
      const vw = b.x - a.x, vh = b.y - a.y;
      if (o.line) { const w = Math.min(vw - 12, 300); o.line.draw(ctx, Math.round(a.x + (vw - w) / 2), Math.round(b.y - 44), w, p.color); continue; }
      if (o.osk) { o.osk.draw(ctx, vw, vh, a.x, a.y); continue; }
      const u = P.toUi(v, p.pos.x, 1.2 + (p.actor.baseY || 0), p.pos.z);
      o.wheel.draw(ctx, Math.round(Math.max(a.x + 62, Math.min(b.x - 62, u.x))), Math.round(Math.max(a.y + 62, Math.min(b.y - 62, u.y))), { x: keyOf(p, 'x') });
    }
  }
  drawLog(ctx, W, H) {
    if (this.chat.log.length) drawChatLog(ctx, this.chat, 6, H - 30, Math.min(220, Math.round(W * 0.36)));
  }
}
