// The announcement lane of Party Mode’s big screen: its banners (`showBanner`), the scenes’
// title cards (stage.js) and the long notes (a dungeon room’s words: a note too long for the
// column of toasts) — one at a time, in the middle of the upper screen, never over the
// dialogue box, a letter, a vote or the big map. A later one waits its turn in a short queue:
// the same one twice is said once, one that has waited too long is forgotten (not a chapter’s
// title nor a quest completed: `keep`), and what is up makes room once it has been read. A
// scene’s title card doesn’t wait — a scene is timed on it: what is up bows out (a note comes
// back afterwards).

import { drawText, measure, wrap, visibleLength } from '../engine/font.js';
import { fitText, splitTwo } from '../ui/ui.js';
import { clamp } from '../engine/util.js';

const WAITING = 4;
// (how long one may wait before it is forgotten — a room’s words are worth more patience — and
// how long each kind stays at least when another one waits behind it)
const STALE = { banner: 8, hint: 20 }, MIN = { hint: 4, banner: 2.2, title: 99 };

export class Announcer {
  constructor(P) {
    this.P = P;
    this.cur = null;
    this.queue = [];
    this.k = 0;                 // 0 → 1: the one showing fades in (and out)
    this.rect = null;           // where it is drawn (the toasts step down under it)
  }

  // a: { kind: 'banner' | 'title' | 'hint', title, sub, dur, keep, color, start(), res() }
  // (start: as it comes up; res: once it is over — shown, skipped or dropped)
  push(a) {
    a = { sub: '', dur: 3.6, t: 0, age: 0, wait: 0, ...a };
    const same = (b) => !!b && !b.out && b.kind === a.kind && b.title === a.title && b.sub === a.sub;
    const twin = same(this.cur) ? this.cur : this.queue.find(same);
    if (twin) { if (a.res) { const r = twin.res; twin.res = () => { if (r) r(); a.res(); }; } return; }
    if (a.kind === 'title') {
      const c = this.cur;
      if (c && c.kind !== 'title' && !c.out) {
        c.out = true;
        if (c.kind === 'hint' && !c.again) this.queue.unshift({ ...c, t: 0, age: 0, wait: 0, out: false, again: true, keep: true, start: null, res: null });
      }
      let i = 0;
      while (i < this.queue.length && this.queue[i].kind === 'title') i++;
      this.queue.splice(i, 0, a);
    } else this.queue.push(a);
    while (this.queue.length > WAITING) {
      const i = this.queue.findIndex((q) => !q.keep);
      if (i < 0) break;
      this.over(this.queue.splice(i, 1)[0]);
    }
  }

  over(a) { if (a.res) { const r = a.res; a.res = null; r(); } }

  // (something needs the middle of the screen now: the banner or note that is up goes)
  bow() { const c = this.cur; if (c && c.kind !== 'title') c.out = true; }

  // nothing left to say (`kind`: only those — a scene skipped drops its title cards)
  clear(kind = null) {
    const gone = (a) => !kind || a.kind === kind;
    if (this.cur && gone(this.cur)) { this.over(this.cur); this.cur = null; this.k = 0; }
    for (const a of this.queue) if (gone(a)) this.over(a);
    this.queue = this.queue.filter((a) => !gone(a));
  }

  // what keeps `a` off the screen: the dialogue box or a letter, a vote, the big map — and a
  // scene, which only shows its own title cards
  held(a) {
    const P = this.P;
    if (P.dialogue.active || P.vote || P.bigMapOpen) return true;
    return !!(P.stage && (P.stage.active || P.stage.barK > 0)) && !(a && a.kind === 'title');
  }

  update(dt) {
    let c = this.cur;
    const hold = this.held(c || this.queue[0]);
    for (const a of this.queue) a.age += dt;
    this.k = clamp(this.k + (c && !c.out && !hold ? dt : -dt) * 5, 0, 1);
    if (c && c.out) { if (this.k <= 0) { this.over(c); this.cur = c = null; } }
    else if (c && hold) {
      // (hidden meanwhile: one that was nearly over, or waits too long, doesn’t come back)
      c.wait += dt;
      if (c.t > c.dur * 0.6 || (!c.keep && c.wait > STALE[c.kind])) c.out = true;
    } else if (c) {
      c.t += dt;
      if (c.t >= c.dur || (this.queue.length && c.t >= Math.min(c.dur, MIN[c.kind] || 2))) c.out = true;
    }
    while (!c && this.queue.length && !this.held(this.queue[0])) {
      const n = this.queue.shift();
      if (!n.keep && n.age > STALE[n.kind]) { this.over(n); continue; }
      this.cur = c = n; this.k = 0;
      if (n.start) n.start();
    }
  }

  get showing() { return !!this.cur && this.k > 0; }

  // the lane’s width: the screen (left of a player’s menu when one is open), and its top: under
  // whatever sits in the middle of the top of the screen (the objective, a race’s card, a boss’s bar)
  place(W, w, h, y) {
    const P = this.P, x = Math.round(W / 2 - w / 2);
    const scene = P.stage && (P.stage.active || P.stage.barK > 0);
    const rects = scene ? [] : [P.objectiveRect && P.objectiveRect(), P.races && P.races.cardRect, P.events && P.events.cardRect, P.camp && P.camp.cardRect, P.combat && P.combat.barRect, P.noteRect];
    for (const r of rects.filter(Boolean).sort((a, b) => a.y - b.y)) if (x < r.x + r.w + 4 && x + w > r.x - 4 && y < r.y + r.h + 4 && y + h > r.y - 2) y = r.y + r.h + 5;
    return { x, y: Math.round(y), w, h };
  }

  draw(ctx, W, H) {
    const c = this.cur;
    this.rect = null;
    if (!c || this.k <= 0) return;
    const k = this.k, rise = Math.round((1 - k) * 5);
    ctx.globalAlpha = k;
    if (c.kind === 'title') {
      // a scene’s title card: a small line over a big one
      let sc = W >= 700 ? 3 : 2;
      while (sc > 1 && measure(c.title, sc) > W - 60) sc--;
      const title = splitTwo(c.title, W - 60, sc).map((l) => fitText(l, W - 60, sc)), subs = c.sub ? wrap(c.sub, W - 70).slice(0, 2) : [];
      const lh = 9 * sc + 3, tw = Math.max(...title.map((l) => measure(l, sc)), ...subs.map((l) => measure(l)));
      const pw = tw + 34, ph = 12 + title.length * lh - 3 + (subs.length ? subs.length * 10 + 1 : 0);
      const R = this.rect = this.place(W, pw, ph, H * 0.28 - ph / 2), y = R.y + rise;
      ctx.fillStyle = 'rgba(18,12,24,0.78)'; ctx.fillRect(R.x, y, pw, ph);
      ctx.fillStyle = '#ffd66b'; ctx.fillRect(R.x + 6, y + 3, pw - 12, 1); ctx.fillRect(R.x + 6, y + ph - 4, pw - 12, 1);
      subs.forEach((l, i) => drawText(ctx, l, W / 2, y + 7 + i * 10, { color: '#b9a2e3', align: 'center' }));
      title.forEach((l, i) => drawText(ctx, l, W / 2, y + 6 + (subs.length ? subs.length * 10 + 1 : 0) + i * lh, { color: '#fff3c4', align: 'center', scale: sc, outline: '#3b2a2e' }));
    } else if (c.kind === 'hint') {
      // a long note: a few rows on a dark card, a bar in its colour
      const tw = Math.min(W - 60, 330), all = wrap(c.title, tw), lines = all.slice(0, 5);
      if (all.length > 5) lines[4] = fitText(lines[4] + ' ' + all[5], tw);
      const pw = Math.max(...lines.map((l) => measure(l))) + 22, ph = lines.length * 11 + 9;
      const R = this.rect = this.place(W, pw, ph, H * 0.19), y = R.y + rise;
      ctx.fillStyle = 'rgba(18,12,24,0.8)'; ctx.fillRect(R.x, y, pw, ph);
      ctx.fillStyle = c.color || '#fff3c4'; ctx.fillRect(R.x, y, 3, ph);
      lines.forEach((l, i) => drawText(ctx, l, R.x + 12, y + 6 + i * 11, { color: '#fff7e6' }));
    } else {
      // a banner: big letters (two lines for a long name, small ones for a very long one)
      let sc = 2, title = splitTwo(c.title, W - 44, 2);
      if (title.some((l) => measure(l, 2) > W - 44)) { sc = 1; title = splitTwo(c.title, W - 44).map((l) => fitText(l, W - 44)); }
      const subs = c.sub ? wrap(c.sub, W - 60).slice(0, 2) : [];
      const lh = 9 * sc + 2, tw = Math.max(...title.map((l) => measure(l, sc)), ...subs.map((l) => measure(l)));
      const pw = Math.min(W - 8, tw + 30), ph = 9 + title.length * lh + (subs.length ? subs.length * 10 + 2 : 0);
      const R = this.rect = this.place(W, pw, ph, H * 0.2 - 5), y = R.y + rise;
      ctx.fillStyle = 'rgba(18,12,24,0.78)'; ctx.fillRect(R.x, y, pw, ph);
      ctx.fillStyle = '#f6d38f'; ctx.fillRect(R.x + 6, y + ph - 3, pw - 12, 1);
      title.forEach((l, i) => drawText(ctx, l, W / 2, y + 5 + i * lh, { color: '#fff7e6', align: 'center', scale: sc, shadow: '#2a1f33' }));
      subs.forEach((l, i) => drawText(ctx, l, W / 2, y + 6 + title.length * lh + i * 10, { color: '#f6d38f', align: 'center' }));
    }
    ctx.globalAlpha = 1;
  }
}

// how long a note of this length stays (the time to read it)
export const noteTime = (text) => clamp(1.5 + visibleLength(text) / 14, 4, 9);
