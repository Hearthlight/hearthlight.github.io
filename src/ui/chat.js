// Talking, in every mode: a bubble over the head, quick phrases that
// travel as ids and read in each screen's own language, emotes with a little gesture, the chat
// log, and the safety rules of src/party/chatfilter.mjs (links refused, rude words hidden with
// the family filter, 1 message per 1.5 s, repeats dropped). One Chat per game (`game.chat`): the
// solo story and Party Mode (phones, keyboards, gamepads, friends at home) all post through it.
//   chat.post(speaker, { text } | { q: phraseId } | { e: emote }) → '' when said, else why not
//   drawSpeech(ctx, speaker, x, y, time) · drawBubbles · drawChatLog · ChatLine (a keyboard's
//   line) · ChatWheel (a gamepad's wheel of phrases & emotes, « Write… » → the on-screen keys)
import { t } from '../i18n.js';
import { audio } from '../engine/audio.js';
import { clean, judge, Limiter, MAX_LEN } from '../party/chatfilter.mjs';
import { bubble, emote as drawEmote, drawText, measure, wrap, panel, fitText, UI, ctl, keyLabel } from './ui.js';
import { Osk } from './osk.js';
import { QUICK_BY, EMOTE_BY, WHY, emojiOnly, emojiIn, noPicto, bubbleTime } from './chatdata.js';

export { MAX_LEN };
export * from './chatdata.js';

// ------------------------------------------------------------------ the chat of a game
const store = {
  get(k, d) { try { const v = localStorage.getItem('hearthlight.chat.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('hearthlight.chat.' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
};

export class Chat {
  constructor(game) {
    this.game = game;
    this.t = 0;
    this.log = [];                 // the last 50 lines: { id, name, color, text | q | e, at }
    this.lim = new Map();          // speaker id → { text, quick } limiters
    this.pending = new Map();      // speaker → what they said while their last bubble was still new
    this.acting = new Set();       // speakers with a gesture going
    this.faces = new Set();        // … or a face on (a smile, a laugh)
    this.muted = new Set(store.get('muted', []));   // (friends at home, strangers: their free text stays hidden)
    this.listeners = [];
  }

  // 'free' · 'filter' (the family filter) · 'quick' (quick phrases only) — Settings, the host menu
  get mode() { const m = this.game.settings && this.game.settings.chat; return m === 'filter' || m === 'quick' ? m : 'free'; }
  onLine(f) { this.listeners.push(f); return () => { this.listeners = this.listeners.filter((g) => g !== f); }; }
  reset() {
    this.log = []; this.pending.clear(); this.lim.clear();
    for (const p of this.acting) this.endGesture(p);
    for (const p of this.faces) { if (p.actor && p.face && p.actor.expr === p.face.expr) p.actor.expr = undefined; p.face = null; }
    this.acting.clear(); this.faces.clear();
  }

  limiter(id, kind) {
    let L = this.lim.get(id);
    if (!L) { L = { text: new Limiter(1 / 1.5, 3, 12), quick: new Limiter(1, 4, 2) }; this.lim.set(id, L); }
    return L[kind];
  }

  // what a speaker says: { text } | { q } | { e }. `strict`: strangers are listening (the open
  // world) — the filter is on whatever the setting. Returns '' when it was said, else why not.
  post(p, m, { strict = false } = {}) {
    if (!p || !m || typeof m !== 'object') return 'empty';
    const now = this.t;
    if (typeof m.q === 'string') {
      const q = QUICK_BY[m.q];
      if (!q) return 'empty';
      const why = this.limiter(p.id, 'quick').take('q:' + q.id, now);
      if (why) return why;
      this.show(p, { q: q.id });
      return '';
    }
    if (typeof m.e === 'string') {
      if (!EMOTE_BY[m.e]) return 'empty';
      const why = this.limiter(p.id, 'quick').take('e:' + m.e, now);
      if (why) return why;
      this.emote(p, m.e);
      return '';
    }
    if (typeof m.text !== 'string') return 'empty';
    const raw = clean(m.text), em = emojiOnly(raw);
    if (em) return this.post(p, { e: em });
    if (this.mode === 'quick') return 'quick';
    const v = judge(noPicto(raw), { family: strict || this.mode === 'filter' });
    if (!v.ok) return v.why;
    const why = this.limiter(p.id, 'text').take(v.text.toLowerCase(), now);
    if (why) return why;
    if (this.muted.has(p.id)) return '';        // (a muted speaker thinks it went out; nobody here reads it)
    this.show(p, { text: v.text });
    // (a ❤ or a :) in the words: the face and the gesture go with them — the bubble keeps the words)
    const feel = emojiIn(raw);
    if (feel) this.act(p, feel);
    return '';
  }

  // the bubble (a new one waits until the last has had a second on screen)
  show(p, s) {
    const shownFor = this.t - (p.speechAt ?? -9);
    if (p.speech && shownFor < 1) { this.pending.set(p, { s, at: this.t + 1 - shownFor }); return; }
    const text = s.q ? QUICK_BY[s.q].text : s.text;
    p.say(text, bubbleTime(s.q ? t(text) : text), !!s.q);
    p.speechAt = this.t;
    p.typing = false;
    this.line(p, s);
    audio.sfx('select', { volume: 0.35, pitch: (p.slot || 0) - 3 });
  }

  emote(p, e) {
    const E = EMOTE_BY[e];
    p.setEmote(E.icon, 2.4);
    p.typing = false;
    this.act(p, e);
    this.line(p, { e });
    audio.sfx(e === 'heart' ? 'heart' : 'pickup', { volume: 0.3 });
  }

  // an emote's face & gesture (on foot: not in a boat, on a mount or swimming)
  act(p, e) {
    const E = EMOTE_BY[e], a = p.actor;
    if (!E || !a || p.vehicle || p.mount || p.swimming) return;
    if (E.expr) { a.expr = E.expr; p.face = { expr: E.expr, t: 2.2 }; this.faces.add(p); }
    if (E.gesture) { if (p.gesture) this.endGesture(p); p.gesture = { g: E.gesture, t: 0 }; this.acting.add(p); if (E.gesture === 'cheer' && !(a.jumpY > 0)) a.jumpV = 4.2; }
  }

  line(p, s) {
    const l = { id: p.id, name: p.name || '', color: p.color || '#fff7e6', at: this.t, ...s };
    this.log.push(l);
    if (this.log.length > 50) this.log.splice(0, this.log.length - 50);
    for (const f of this.listeners) f(l, p);
  }

  // each frame: queued bubbles, gestures, typing that nobody finished
  update(dt) {
    this.t += dt;
    for (const [p, q] of this.pending) if (this.t >= q.at) { this.pending.delete(p); this.show(p, q.s); }
    for (const p of this.acting) {
      const a = p.actor, G = p.gesture;
      if (!a || !G || p.vehicle || p.mount || p.swimming) { this.endGesture(p); continue; }
      G.t += dt;
      const k = G.t;
      if (G.g === 'wave') { a.armPose = -2.7 + Math.sin(k * 16) * 0.35; if (k > 1.6) this.endGesture(p); }
      else if (G.g === 'cheer') { a.armPose = -2.9; a.armPoseL = -2.9; if (k > 1.2) this.endGesture(p); }
      else if (G.g === 'point') { a.armPose = -1.55; if (k > 1.8) this.endGesture(p); }
      else if (G.g === 'photo') { a.armPose = -1.4; a.armPoseL = -1.4; if (k > 1.8) this.endGesture(p); }
      else if (G.g === 'laugh') { if (Math.floor(k * 3) !== Math.floor((k - dt) * 3) && k < 1 && !(a.jumpY > 0)) a.jumpV = 2.4; if (k > 1.1) this.endGesture(p); }
      else if (G.g === 'sit') { if (k > 0.2 && a.moving) this.endGesture(p); else a.sitting = true; }
    }
    for (const p of this.faces) {
      if (!p.face || (p.face.t -= dt) > 0) continue;
      if (p.actor && p.actor.expr === p.face.expr) p.actor.expr = undefined;
      p.face = null; this.faces.delete(p);
    }
  }

  endGesture(p) {
    const a = p.actor, G = p.gesture;
    if (a && G) { a.armPose = undefined; a.armPoseL = undefined; if (G.g === 'sit') a.sitting = false; }
    p.gesture = null;
    this.acting.delete(p);
  }

  // ---- safety: mute (remembered), report (a local log for now: the last 20 lines seen from them)
  mute(id, on = !this.muted.has(id)) { if (on) this.muted.add(id); else this.muted.delete(id); store.set('muted', [...this.muted].slice(-200)); return on; }
  isMuted(id) { return this.muted.has(id); }
  report(id, name, why = '') {
    const lines = this.log.filter((l) => l.id === id).slice(-20).map((l) => ({ at: l.at, text: l.text || null, q: l.q || null, e: l.e || null }));
    const week = Date.now() - 7 * 864e5, all = store.get('reports', []).filter((r) => r.at > week);
    all.push({ at: Date.now(), id, name, why, lines });
    store.set('reports', all.slice(-50));
    return lines.length;
  }
  reports() { return store.get('reports', []); }
}

// a line of the log as it travels to a phone (a name, a colour; a quick phrase by its id)
export function packLine(l) {
  const o = { n: l.name, c: l.color };
  if (l.q) o.q = l.q; else if (l.e) o.e = l.e; else o.text = l.text;
  return o;
}

// ------------------------------------------------------------------ drawing
// the bubble's text in this screen's language
export const speechOf = (p) => (p.speechTr ? t(p.speech) : p.speech);

// what a speaker shows over their head (x, y: just above it, UI pixels): the bubble, or « … »
// while they type. Returns true when something was drawn.
export function drawSpeech(ctx, p, x, y, time, out = null) {
  if (p.speech) {
    if (out) out.push({ x, y, text: speechOf(p) });
    else bubble(ctx, x, y, speechOf(p), { wrapW: 120 });
    return true;
  }
  if (p.typing) { if (out) out.push({ x, y: y - 3, icon: 'dots' }); else drawEmote(ctx, x, y - 3, 'dots', time); return true; }
  return false;
}

// several bubbles at once (and emotes: { icon }): nearer the bottom first, each one nudged up off
// the ones it would cover
export function drawBubbles(ctx, list, wrapW = 120, time = 0) {
  const boxes = [];
  list.sort((a, b) => b.y - a.y);
  for (const b of list) {
    const lines = b.icon ? [] : measure(b.text) > wrapW ? wrap(b.text, wrapW) : [b.text];
    const w = b.icon ? 13 : Math.max(...lines.map((l) => measure(l))) + 8, h = b.icon ? 15 : 3 + lines.length * 10 + 4;
    let y = b.y;
    for (let k = 0; k < 8; k++) {
      const hit = boxes.find((o) => Math.abs(o.x - b.x) < (o.w + w) / 2 + 2 && y > o.y - h - 1 && y - h - 1 < o.y);
      if (!hit) break;
      y = hit.y - hit.h - 2;
    }
    boxes.push({ x: b.x, y, w, h });
    if (b.icon) drawEmote(ctx, b.x, y, b.icon, time); else bubble(ctx, b.x, y, b.text, { wrapW });
  }
}

// the chat log in a corner: the last few lines, fading after a while (x, y: its bottom-left)
export function drawChatLog(ctx, chat, x, y, w, { rows = 5, fade = 12 } = {}) {
  const now = chat.t, lines = chat.log.filter((l) => now - l.at < fade).slice(-rows);
  let yy = y;
  for (let i = lines.length - 1; i >= 0; i--) {
    const l = lines[i], a = Math.min(1, (fade - (now - l.at)) / 2);
    const what = l.q ? t(QUICK_BY[l.q].text) : l.e ? '* ' + t(EMOTE_BY[l.e].label) + ' *' : l.text;
    const name = l.name + ': ', nw = measure(name);
    const body = wrap(what, Math.max(40, w - nw - 6));
    const h = body.length * 10 + 2;
    yy -= h;
    ctx.globalAlpha = a * 0.55; ctx.fillStyle = '#1c1428'; ctx.fillRect(x, yy - 1, Math.min(w, nw + Math.max(...body.map((s) => measure(s))) + 6), h);
    ctx.globalAlpha = a;
    drawText(ctx, name, x + 3, yy + 1, { color: l.color });
    body.forEach((s, k) => drawText(ctx, s, x + 3 + nw, yy + 1 + k * 10, { color: '#fff7e6' }));
    ctx.globalAlpha = 1;
    yy -= 1;
  }
}

// ------------------------------------------------------------------ a keyboard's chat line
// T opens it at the bottom of that player's view: the keys type (the others keep playing),
// Enter sends, Esc closes. `send(text)` returns '' or why not (shown under the line).
export class ChatLine {
  constructor(send) { this.send = send; this.v = ''; this.t = 0; this.done = false; this.note = ''; this.noteT = 0; }
  key(e) {
    if (e.key === 'Enter') { if (this.v.trim()) { const why = this.send(this.v); if (why) { this.note = WHY[why] || ''; this.noteT = 2.5; audio.sfx('error', { volume: 0.4 }); } else this.done = true; } else this.done = true; return true; }
    if (e.key === 'Escape') { this.done = true; audio.sfx('close', { volume: 0.4 }); return true; }
    if (e.key === 'Backspace') { this.v = [...this.v].slice(0, -1).join(''); return true; }
    if (e.key.length >= 1 && [...e.key].length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if ([...this.v].length >= MAX_LEN) { audio.sfx('error', { volume: 0.3 }); return true; }
      this.v += e.key; audio.sfx('typewriter', { volume: 0.25 });
      return true;
    }
    // (the rest — arrows, Tab, F-keys — passes: a stray key never gets stuck in the line)
    return e.key !== 'Tab' && !/^F\d+$/.test(e.key) && e.key.length > 1 && !/^(Arrow|Shift|Control|Alt|Meta|CapsLock)/.test(e.key);
  }
  update(dt) { this.t += dt; if (this.noteT > 0) this.noteT -= dt; }
  // (x, y, w: the line's box inside the player's view, UI pixels)
  draw(ctx, x, y, w, color = '#e0a526') {
    const h = 16;
    panel(ctx, x, y, w, h + 10);
    ctx.fillStyle = color; ctx.fillRect(x + 6, y + 5, 3, h - 2);
    const label = t('Say:') + ' ', lw = measure(label);
    drawText(ctx, label, x + 13, y + 8, { color: '#8a5234' });
    const room = w - 26 - lw - 30, shown = measure(this.v) > room ? '…' + [...this.v].slice(-Math.floor(room / 5)).join('') : this.v;
    drawText(ctx, shown, x + 13 + lw, y + 8, { color: UI.ink });
    if (Math.floor(this.t * 2.5) % 2 === 0) { ctx.fillStyle = '#e0a526'; ctx.fillRect(x + 14 + lw + measure(shown), y + 7, 1, 9); }
    drawText(ctx, `${[...this.v].length}/${MAX_LEN}`, x + w - 8, y + 8, { color: '#b8a080', align: 'right' });
    const hint = this.noteT > 0 ? this.note : t('{enter} send · {esc} close', { enter: keyLabel('Enter'), esc: keyLabel('Escape') });
    drawText(ctx, fitText(hint, w - 16), x + w / 2, y + h + 12, { color: this.noteT > 0 ? '#ffb0a0' : '#fff3c4', align: 'center', shadow: '#2a1f33' });
  }
}
export const SCAN_LINE = () => [t('Say:'), t('{enter} send · {esc} close')];

// ------------------------------------------------------------------ a gamepad's wheel
// Held open by the talk button: the stick points at one of eight quick phrases & emotes, letting
// go says it (the stick at rest: nothing). X writes something on the on-screen keys instead.
export const WHEEL = [{ q: 'hi' }, { q: 'look' }, { e: 'wave' }, { q: 'follow' }, { q: 'thanks' }, { e: 'heart' }, { q: 'wait' }, { q: 'wow' }];
export class ChatWheel {
  constructor(items = WHEEL) { this.items = items; this.sel = -1; this.t = 0; this.osk = null; }
  label(it) { return it.q ? t(QUICK_BY[it.q].text) : t(EMOTE_BY[it.e].label); }
  // the stick's direction → the slot it points at (none near the middle)
  aim(v) {
    const l = Math.hypot(v.x, v.y);
    if (l < 0.45) { this.sel = -1; return; }
    const a = Math.atan2(v.x, -v.y), n = this.items.length;
    this.sel = ((Math.round(a / (Math.PI * 2 / n)) % n) + n) % n;
  }
  update(dt) { this.t += dt; }
  // (cx, cy: the wheel's middle, UI pixels)
  draw(ctx, cx, cy, keys = {}) {
    const n = this.items.length, R = 44;
    ctx.globalAlpha = 0.85; ctx.fillStyle = '#1c1428';
    for (let y = -R - 14; y <= R + 14; y++) { const hw = Math.floor(Math.sqrt(Math.max(0, (R + 14) ** 2 - y * y))); ctx.fillRect(cx - hw, cy + y, hw * 2, 1); }
    ctx.globalAlpha = 1;
    this.items.forEach((it, i) => {
      const a = (i / n) * Math.PI * 2, x = cx + Math.sin(a) * R, y = cy - Math.cos(a) * R, on = i === this.sel;
      if (it.e) {
        ctx.fillStyle = on ? '#e0a526' : '#3b2a22'; ctx.fillRect(Math.round(x - 9), Math.round(y - 9), 18, 18);
        drawEmote(ctx, x, y + 8, EMOTE_BY[it.e].icon, this.t);
      } else {
        const s = fitText(this.label(it), 64), w = measure(s) + 8;
        ctx.fillStyle = on ? '#e0a526' : '#3b2a22'; ctx.fillRect(Math.round(x - w / 2) - 1, Math.round(y - 7) - 1, w + 2, 14);
        ctx.fillStyle = on ? '#fff3c4' : '#fff7e6'; ctx.fillRect(Math.round(x - w / 2), Math.round(y - 7), w, 12);
        drawText(ctx, s, x, y - 5, { color: UI.ink, align: 'center' });
      }
    });
    const hint = t('{x} write…', { x: keys.x || ctl('special') });
    drawText(ctx, hint, cx, cy - 4, { color: '#fff3c4', align: 'center' });
  }
  // the on-screen keys, for a message of your own
  write(keys = null) { this.osk = new Osk('', { max: MAX_LEN, title: 'Say something', chat: true, keys }); return this.osk; }
}
export const SCAN_WHEEL = () => [t('{x} write…'), t('Say something')];
