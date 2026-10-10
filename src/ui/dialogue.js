// Dialogue box with typewriter text, portraits, name tags & choices, plus a
// full-screen letter view. Everything returns promises so story scripts can
// simply `await say(...)`.
//
// World v7 comic timing, inline in any line: {p} a beat's pause, {pp} a longer
// one (between two sentences, « end.{p}Next », it stands for their space), {shake}…{/} trembling words, {wave}…{/} wavy ones, {big}…{/} a shout
// twice the size (on a line of its own), {key}…{/} the words that must be understood, bold.
// Options: expr, vars, speed (×), shake (the box jolts as the line opens), auto (seconds: the
// line moves on by itself).
//
// The box holds three rows: a longer line is read a page at a time (cut at the end of a
// sentence where one fits), the button turns the page. A page all there stays a moment before
// a press can turn it (`readTime`) — the ↓ fills up meanwhile.

import { drawText, measure, wrap, stripTags, parseRich, keyColor } from '../engine/font.js';
import { COLORS } from '../art/palette.js';
import { panel, tag, UI } from './ui.js';
import { audio } from '../engine/audio.js';
import { t } from '../i18n.js';

const TAG_COLORS = {
  hollis: '#4f7a4a', rosa: '#c8574f', pip: '#d9772f', finn: '#3f6f9e', ivy: '#4f955a', theo: '#8a5234',
  mabel: '#7d5f9e', sol: '#b8862a', wren: '#c86a8a', player: '#6b4330', narrator: '#5a4a5a',
};
const ROWS = 3, ROW_H = 13;              // a page of the box (a shout takes two rows)
const rowsOf = (lines) => lines.reduce((n, l) => n + (l.startsWith('{big}') ? 2 : 1), 0);

// A text’s sentences: cut at the space after . ! ? … (and the quotes that close them), outside
// any tag — « M. » or « Dr. » don’t end one.
function sentences(s) {
  const out = [];
  let depth = 0, from = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '{') { const e = s.indexOf('}', i); if (e > i) { depth = s.slice(i + 1, e) === '/' ? Math.max(0, depth - 1) : depth + 1; i = e; continue; } }
    if (s[i] !== ' ' || depth || i === from) continue;
    let j = i - 1;
    const back = () => { while (j >= from && s[j] === '}') j = s.lastIndexOf('{', j) - 1; };
    back();
    if (j >= from && '»”"’\')]'.includes(s[j])) { j--; back(); while (j >= from && /\s/.test(s[j])) j--; back(); }
    if (j < from || !'.!?…'.includes(s[j])) continue;
    if (s[j] === '.' && /(^|[\s}])\p{Lu}\p{L}{0,2}$/u.test(s.slice(from, j))) continue;
    out.push(s.slice(from, i));
    from = i + 1;
  }
  if (from < s.length) out.push(s.slice(from));
  return out;
}

export class Dialogue {
  constructor(game) {
    this.game = game;
    this.cur = null;
    this.letter = null;
    this.t = 0;
  }

  get active() { return !!(this.cur || this.letter); }

  speakerInfo(who) {
    const g = this.game;
    if (!who || who === 'narrator') return { name: null, color: TAG_COLORS.narrator, voice: { pitch: 62, wave: 'sine' } };
    if (who === 'player') return { name: g.state.player.name, color: TAG_COLORS.player, voice: { pitch: 66, wave: 'triangle' }, portrait: (ex) => g.portraitOf('player', ex) };
    if (who === 'pet') return { name: g.state.player.pet.name, color: '#8a5d42', voice: { pitch: 80, wave: 'sine' } };
    const npc = g.npcDef(who);
    if (!npc) return { name: who, color: '#5a4a5a', voice: { pitch: 60, wave: 'triangle' } };
    return { name: npc.saga ? t(npc.short || npc.name) : npc.short || npc.name, color: TAG_COLORS[who] || npc.tag || '#6b4330', voice: npc.voice, portrait: (ex) => g.portraitOf(who, ex) };
  }

  format(text) {
    const s = this.game.state;
    return String(text)
      .replaceAll('{name}', `{npc}${s.player.name}{/}`)
      .replaceAll('{pet}', `{npc}${s.player.pet.name}{/}`)
      .replaceAll('{petkind}', t(s.player.pet.kind)); // 'cat' → « chat »
  }

  // {p}/{pp} pauses out of the text (their place counted in visible letters), {big} lines kept
  // whole, the rest wrapped to the box — then cut into the pages the box shows one at a time:
  // [{ lines, total (visible letters), pauses ([letters into the page, seconds]) }]
  layout(text, w) {
    const pauses = [];
    let out = '', plain = 0;
    for (let i = 0; i < text.length; i++) {
      const pp = text.startsWith('{pp}', i);
      if (pp || text.startsWith('{p}', i)) {
        pauses.push([plain, pp ? 0.8 : 0.38]); i += pp ? 3 : 2;
        // (a pause between two sentences stands for the space between them)
        if (out && !/\s$/.test(out) && !out.endsWith('}') && text[i + 1] && !/\s/.test(text[i + 1])) { out += ' '; plain++; }
        continue;
      }
      if (text[i] === '{') { const e = text.indexOf('}', i); if (e > i) { out += text.slice(i, e + 1); i = e; continue; } }
      out += text[i]; plain++;
    }
    // a page takes whole sentences while they fit its rows; a shout stands on a line of its
    // own, at twice the size (`run`: the page’s last sentences, still to wrap)
    const pages = [];
    let pg = null;
    const fresh = () => { pg = { lines: [], run: '' }; pages.push(pg); };
    const settle = () => { if (pg && pg.run) { pg.lines.push(...wrap(pg.run, w)); pg.run = ''; } };
    for (const part of out.split(/(\{big\}.*?\{\/\})/)) {
      if (!part.trim()) continue;
      if (part.startsWith('{big}')) {
        settle();
        if (!pg || rowsOf(pg.lines) + 2 > ROWS) fresh();
        pg.lines.push(part.trim());
        continue;
      }
      for (const s of sentences(part.trim())) {
        if (!pg) fresh();
        const test = pg.run ? pg.run + ' ' + s : s;
        if (rowsOf(pg.lines) + wrap(test, w).length <= ROWS) { pg.run = test; continue; }
        if (pg.run || pg.lines.length) { settle(); fresh(); }
        const rows = wrap(s, w);
        // (a sentence taller than the box: its rows shared out evenly over the pages it takes)
        for (let k = Math.ceil(rows.length / ROWS), i = 0; k > 0; k--) {
          const n = Math.ceil((rows.length - i) / k);
          if (i) fresh();
          if (k > 1) pg.lines.push(...rows.slice(i, i + n)); else pg.run = rows.slice(i, i + n).join(' ');
          i += n;
        }
      }
      settle();
    }
    // each pause to its page: every row is a run of the text’s letters, minus the spaces the
    // breaks took
    const flat = stripTags(out);
    let at = 0;
    for (const q of pages) {
      q.total = 0; q.pauses = [];
      q.spans = q.lines.map((l) => { const s = stripTags(l), a = Math.max(at, flat.indexOf(s, at)); at = a + s.length; q.total += s.length; return [a, s.length]; });
    }
    for (const [p, sec] of pauses) {
      let hit = null;
      for (const q of pages) { let n = 0; for (const [a, len] of q.spans) { if (a < p) hit = [q, n + Math.min(len, p - a)]; n += len; } }
      if (hit) hit[0].pauses.push([hit[1], sec]);
    }
    return pages;
  }

  open(who, text, opts, resolve, choices = null) {
    const info = this.speakerInfo(who);
    const w = this.boxW() - (info.portrait ? 70 : 20);
    const pages = text ? this.layout(this.format(t(text, opts.vars)), w) : [];
    if (!pages.length) pages.push({ lines: [], total: 0, pauses: [] });
    this.cur = {
      who, info, pages, page: 0, hold: 0, resolve, expr: opts.expr || 'talk',
      choices, sel: 0, blipN: 0, cancel: opts.cancel, auto: opts.auto, speed: opts.speed || 1, jolt: opts.shake ? 0.35 * opts.shake : 0,
    };
    this.turn(0);
    if (opts.sfx) audio.sfx(opts.sfx, { volume: 0.6 });
    this.game.onSpeak && this.game.onSpeak(who, true);
  }

  // the page the box shows (`lines`, `total` & `shown` speak of it alone)
  turn(i) {
    const c = this.cur, q = c.pages[i];
    Object.assign(c, { page: i, lines: q.lines, total: q.total, pauses: q.pauses, shown: 0, hold: 0, age: 0, readT: 0, autoT: 0 });
    c.lock = this.readTime(c);
  }

  // How long a page stays, once it is all there, before a press can turn it or pick an answer
  // (Party Mode: the time to read it — party.js)
  readTime() { return 0.2; }
  // (…and how soon after it opens a press shows it whole)
  openTime() { return 0; }

  // the page all there, its time not over yet: presses wait
  get reading() { const c = this.cur; return !!c && c.shown >= c.total && c.readT < c.lock; }

  say(who, text, opts = {}) {
    return new Promise((resolve) => this.open(who, text, opts, resolve));
  }

  choose(who, text, options, opts = {}) {
    return new Promise((resolve) => this.open(who, text, opts, resolve, options.map((o) => this.format(t(o, opts.vars)))));
  }

  showLetter(title, text, sign, vars) {
    return new Promise((resolve) => {
      this.letter = { title: t(title, vars), text: this.format(t(text, vars)), sign: sign ? t(sign, vars) : sign, shown: 0, resolve, t: 0, readT: 0 };
      this.letter.lock = this.readTime(this.letter);
      audio.sfx('page');
    });
  }

  boxW() { return Math.min(this.game.display.w - 12, 430); }

  update(dt, input) {
    this.t += dt;
    const speed = 42 * (this.game.settings.textSpeed || 1);
    if (this.letter) {
      const L = this.letter, n = stripTags(L.text).length;
      L.t += dt;
      const before = Math.floor(L.shown);
      L.shown = Math.min(n, L.shown + dt * speed * 1.4);
      if (Math.floor(L.shown) !== before && Math.floor(L.shown) % 3 === 0) audio.sfx('typewriter', { volume: 0.35 });
      if (L.shown >= n) L.readT += dt;
      if (input.pressed('interact') || input.pressed('cancel') || input.mouse.pressed) {
        input.consume('cancel');
        if (L.shown < n) { if (L.t >= this.openTime()) L.shown = n; }
        else if (L.readT >= L.lock) { this.letter = null; audio.sfx('page'); L.resolve(); }
        input.consume('interact');
      }
      return;
    }
    const c = this.cur;
    if (!c) return;
    if (c.jolt > 0) c.jolt = Math.max(0, c.jolt - dt);
    c.age += dt;
    const before = Math.floor(c.shown);
    if (c.hold > 0) c.hold -= dt;
    else {
      c.shown = Math.min(c.total, c.shown + dt * speed * c.speed);
      // a comic pause: the letters wait a beat right there
      for (const q of c.pauses) if (q[0] > before && q[0] <= c.shown && !q.done) { q.done = true; c.shown = q[0]; c.hold = q[1]; break; }
    }
    const now = Math.floor(c.shown);
    if (now !== before && now < c.total) {
      c.blipN++;
      if (c.blipN % 2 === 0) audio.blip({ ...c.info.voice, vary: 3 });
    }
    const done = c.shown >= c.total, last = c.page >= c.pages.length - 1;
    if (done) c.readT += dt;
    const talking = !done && !(c.hold > 0);
    this.game.onSpeak && this.game.onSpeak(c.who, talking);
    // scenes can let a line move on by itself (a page at a time)
    if (done && c.auto && !c.choices) { c.autoT += dt; if (c.autoT >= c.auto) { this.advance(); return; } }
    // (a press counts: not in the blink after the page opens, nor while it is being read)
    const free = done ? c.readT >= c.lock : c.age >= this.openTime();

    if (c.choices && done && last) {
      if (input.repeat('up')) { c.sel = (c.sel + c.choices.length - 1) % c.choices.length; audio.sfx('select'); }
      if (input.repeat('down')) { c.sel = (c.sel + 1) % c.choices.length; audio.sfx('select'); }
      // mouse hover / click
      if (this.choiceRects) {
        this.choiceRects.forEach((r, i) => {
          if (this.cur === c && input.mouseIn(r.x, r.y, r.w, r.h)) {
            if (input.mouse.moved && c.sel !== i) { c.sel = i; }
            if (input.mouse.pressed && free) { this.pick(i); }
          }
        });
        if (this.cur !== c) return;
      }
      if (input.pressed('interact')) { input.consume('interact'); if (free) this.pick(c.sel); return; }
      if (input.pressed('cancel') && c.cancel !== undefined) { input.consume('cancel'); if (free) this.pick(c.cancel); return; }
      return;
    }
    if (input.pressed('interact') || (input.mouse.pressed && (!c.choices || !last))) {
      input.consume('interact');
      if (!free) return;
      if (!done) { c.shown = c.total; c.hold = 0; }
      else this.advance();
    }
  }

  // the next page — or, after the last, the line is over
  advance() {
    const c = this.cur;
    if (c.page < c.pages.length - 1) { this.turn(c.page + 1); audio.sfx('page', { volume: 0.3 }); } else this.finish();
  }

  pick(i) {
    const c = this.cur;
    audio.sfx('confirm');
    this.cur = null;
    this.game.onSpeak && this.game.onSpeak(c.who, false);
    c.resolve(i);
  }

  finish() {
    const c = this.cur;
    this.cur = null;
    this.game.onSpeak && this.game.onSpeak(c.who, false);
    c.resolve();
  }

  draw(ctx) {
    const W = this.game.display.w, H = this.game.display.h;
    if (this.letter) return this.drawLetter(ctx, W, H);
    const c = this.cur;
    if (!c) return;
    const bw = this.boxW(), bh = 62;
    const jx = c.jolt > 0 ? Math.round((Math.random() - 0.5) * 6 * c.jolt / 0.35) : 0, jy = c.jolt > 0 ? Math.round((Math.random() - 0.5) * 4 * c.jolt / 0.35) : 0;
    const bx = Math.round((W - bw) / 2) + jx, by = H - bh - 8 + jy;
    panel(ctx, bx, by, bw, bh);
    let tx = bx + 10;
    if (c.info.portrait) {
      // portrait frame
      const done = c.shown >= c.total;
      const ex = done ? (c.expr === 'talk' ? 'neutral' : c.expr) : (Math.floor(this.t * 8) % 2 ? c.expr : (c.expr === 'talk' ? 'neutral' : c.expr));
      const pc = c.info.portrait(ex === 'talk' ? 'talk' : ex);
      const fx = bx + 7, fy = by + 7;
      ctx.fillStyle = '#e9d6b0';
      ctx.fillRect(fx, fy, 48, 48);
      ctx.fillStyle = '#d9c29a';
      ctx.fillRect(fx, fy + 30, 48, 18);
      ctx.fillStyle = '#c9a77c';
      ctx.fillRect(fx, fy, 48, 1); ctx.fillRect(fx, fy + 47, 48, 1); ctx.fillRect(fx, fy, 1, 48); ctx.fillRect(fx + 47, fy, 1, 48);
      if (pc) ctx.drawImage(pc, fx + 2, fy + 2);
      tx = bx + 62;
    }
    if (c.info.name) tag(ctx, bx + 6, by - 9, c.info.name, c.info.color);
    // text: the page’s rows (a shout takes two)
    let remaining = Math.floor(c.shown), row = 0;
    const ink = c.who && c.who !== 'narrator' ? UI.ink : '#5a4a6a';
    c.lines.forEach((line) => {
      const len = stripTags(line).length;
      const n = Math.max(0, Math.min(len, remaining));
      remaining -= len;
      const big = line.startsWith('{big}');
      if (n > 0) this.drawLine(ctx, line, tx, by + 10 + row * ROW_H, ink, n, big ? 2 : 1);
      row += big ? 2 : 1;
    });
    const done = c.shown >= c.total, last = c.page >= c.pages.length - 1;
    if (done && !(c.choices && last)) {
      // the ↓: pale while the page is being read, filling with gold, then lit (and nodding)
      const k = c.lock > 0 ? Math.min(1, c.readT / c.lock) : 1, ax = bx + bw - 14, ay = by + bh - 14 + (k >= 1 && Math.floor(this.t * 2.5) % 2 ? 1 : 0);
      drawText(ctx, '↓', ax, ay, { color: '#dcc7a0' });
      if (k > 0) {
        ctx.save(); ctx.beginPath(); ctx.rect(ax, ay, 5, k >= 1 ? 9 : Math.round(k * 6) + 1); ctx.clip();
        drawText(ctx, '↓', ax, ay, { color: k >= 1 ? UI.gold : '#e9bd5a' });
        ctx.restore();
      }
      // (a line of several pages: which one this is)
      if (c.pages.length > 1) drawText(ctx, `${c.page + 1}/${c.pages.length}`, ax - 4, by + bh - 14, { color: '#c4ab84', align: 'right' });
    }
    // choices
    if (c.choices && done && last) {
      const cw = Math.max(...c.choices.map((o) => measure(o))) + 26;
      const ch = c.choices.length * 12 + 10;
      const cx = bx + bw - cw - 4, cy = by - ch - 4;
      panel(ctx, cx, cy, cw, ch);
      this.choiceRects = [];
      c.choices.forEach((o, i) => {
        const oy = cy + 6 + i * 12;
        this.choiceRects.push({ x: cx, y: oy - 1, w: cw, h: 12 });
        if (i === c.sel) {
          // (the heart lights once the answer can be picked)
          ctx.fillStyle = UI.sel;
          ctx.fillRect(cx + 4, oy - 1, cw - 8, 11);
          drawText(ctx, '♥', cx + 7, oy + 1, { color: c.readT >= c.lock ? UI.heart : '#e3b9a8' });
        }
        drawText(ctx, o, cx + 17, oy + 1, { color: UI.ink });
      });
    } else this.choiceRects = null;
  }

  // one line of dialogue, with its trembling / wavy words
  drawLine(ctx, line, x, y, ink, maxChars, scale) {
    if (!/\{(shake|wave|big)\}/.test(line)) { drawText(ctx, line, x, y, { color: ink, maxChars, scale }); return; }
    const stack = [{ color: ink, fx: null, bold: false }];
    let cx = x, count = 0;
    for (let i = 0; i < line.length && count < maxChars; i++) {
      const ch = line[i];
      if (ch === '{') {
        const e = line.indexOf('}', i);
        if (e > i) {
          const tag = line.slice(i + 1, e), top = stack[stack.length - 1];
          if (tag === '/') { if (stack.length > 1) stack.pop(); }
          else if (tag === 'shake' || tag === 'wave' || tag === 'big') stack.push({ ...top, fx: tag === 'big' ? top.fx : tag });
          else if (tag === 'key') stack.push({ ...top, color: keyColor(ink), bold: true });
          else stack.push({ ...top, color: tag.startsWith('#') ? tag : (COLORS[tag] || ink) });
          i = e;
          continue;
        }
      }
      const top = stack[stack.length - 1];
      let ox = 0, oy = 0;
      if (top.fx === 'shake') { ox = Math.round((Math.random() - 0.5) * 2); oy = Math.round((Math.random() - 0.5) * 2); }
      else if (top.fx === 'wave') oy = Math.round(Math.sin(this.t * 9 + count * 0.7) * 1.5);
      drawText(ctx, ch, cx + ox, y + oy, { color: top.color, scale, bold: top.bold });
      cx += measure(ch, scale, top.bold) + scale;
      count++;
    }
  }

  drawLetter(ctx, W, H) {
    const L = this.letter;
    ctx.fillStyle = 'rgba(20,14,28,0.55)';
    ctx.fillRect(0, 0, W, H);
    const pw = Math.min(W - 24, 300), textW = pw - 32;
    const lines = wrap(L.text, textW);
    const ph = Math.min(H - 24, 50 + lines.length * 12 + (L.sign ? 18 : 0));
    const px = Math.round((W - pw) / 2), py = Math.round((H - ph) / 2);
    // paper
    ctx.fillStyle = 'rgba(20,14,28,0.35)';
    ctx.fillRect(px + 3, py + 4, pw, ph);
    ctx.fillStyle = '#f7ecd4';
    ctx.fillRect(px, py, pw, ph);
    ctx.fillStyle = '#fbf4e2';
    ctx.fillRect(px + 2, py + 2, pw - 4, ph - 4);
    for (let y = py + 30; y < py + ph - 8; y += 12) { ctx.fillStyle = '#e8d8ba'; ctx.fillRect(px + 12, y + 10, pw - 24, 1); }
    ctx.fillStyle = '#e7a0a8';
    ctx.fillRect(px + 10, py + 2, 1, ph - 4);
    drawText(ctx, L.title, px + pw / 2, py + 10, { color: '#8a5234', align: 'center' });
    let remaining = Math.floor(L.shown);
    lines.forEach((line, i) => {
      const len = stripTags(line).length;
      const n = Math.max(0, Math.min(len, remaining));
      remaining -= len;
      if (n > 0) drawText(ctx, line, px + 16, py + 30 + i * 12, { color: '#4a3438', maxChars: n });
    });
    if (L.sign && L.shown >= stripTags(L.text).length) drawText(ctx, L.sign, px + pw - 16, py + ph - 18, { color: '#8a5234', align: 'right' });
    // wax seal
    const sx = px + pw - 22, sy = py + 6;
    ctx.fillStyle = '#c8454f'; ctx.fillRect(sx, sy + 1, 10, 8); ctx.fillRect(sx + 1, sy, 8, 10);
    ctx.fillStyle = '#e97d8f'; ctx.fillRect(sx + 3, sy + 3, 2, 2);
    // (pale while it is being read, then lit and nodding)
    if (L.shown >= stripTags(L.text).length) {
      const open = L.readT >= L.lock;
      drawText(ctx, '↓', px + pw / 2, py + ph - 12 + (open && Math.floor(this.t * 2.5) % 2 ? 1 : 0), { color: open ? UI.gold : '#dcc7a0', align: 'center' });
    }
  }
}

export { parseRich };
