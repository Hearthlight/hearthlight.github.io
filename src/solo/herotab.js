// The menu's Hero page in the solo game: your hero class, talents, gear and
// mounts — the big screen's twin of the phone's Talents & Gear screens. It
// works with the arrows + E, a gamepad (stick + A) and the mouse or a finger:
// every control is an item with a rect, and the arrows jump to the nearest one.

import { drawText, measure, wrap } from '../engine/font.js';
import { UI, fitText } from '../ui/ui.js';
import { CLASSES, CLASS_ORDER } from '../combat/classes.js';
import { drawClassIcon, drawGearIcon, drawMountIcon, drawPetIcon } from '../combat/icons.js';
import { TREES, TALENT, ROW_NEED, canLearn, whyNot, pointsFor, picksOf, spent, spentIn, rankOf, valueAt } from '../combat/v4/talents.js';
import { drawIcon, drawGlyph } from '../combat/v4/icons.js';
import { itemName, itemDesc, UPGRADE, ROMAN, LEVEL_COLOR, BAG, itemBorder, itemTag, itemUpgrade, meltValue, isWorn, weaponLines } from '../combat/v3/gear.js';
import { MOUNTS, MOUNT_ORDER, FOODS, foodIcon } from '../party/mounts.js';
import { BUDDY_KINDS, BUDDY_ORDER } from '../party/buddies.js';
import { XP_NEED } from '../combat/combat.js';
import { ZONES } from '../world/big/layout.js';
import { audio } from '../engine/audio.js';
import { t, num } from '../i18n.js';

const PAGES = [['hero', 'Hero'], ['talents', 'Talents'], ['gear', 'Gear'], ['mounts', 'Mounts'], ['pets', 'Companions']];
const ZNAME = Object.fromEntries(ZONES.map((z) => [z.id, z.name]));
const BROWN = '#8a5234';
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export class HeroTab {
  constructor(menu) {
    this.menu = menu;
    this.page = 'hero';
    this.focus = null;
    this.items = [];
    this.selTal = null;
    this.selGear = null;
    this.confirm = null;          // { id, until }: press again to reset / melt
    this.t = 0;
    this.pages = PAGES;           // (Party Mode's big-screen menu adds a page of its own: tvmenu.js)
  }

  get world() { return this.menu.world; }
  get wild() { return this.world.wild; }
  get me() { return this.wild.me; }

  show(page) { if (page) this.page = page; this.focus = null; this.confirm = null; }

  prof() { return this.wild.progress.prof(this.me); }
  points() {
    const f = this.me.fighter;
    if (!f) return 0;
    return Math.max(0, pointsFor(f.level) - spent(picksOf(this.prof(), f.clsId)));
  }

  // ------------------------------------------------------------------ input
  update(dt, input) {
    this.t += dt;
    if (this.confirm && this.t > this.confirm.until) this.confirm = null;
    const I = this.items;
    if (!I.length) return;
    if (!I.some((i) => i.id === this.focus)) this.setFocus(this.home || I[0].id, true);
    for (const d of ['left', 'right', 'up', 'down']) if (input.repeat(d)) this.nav(d);
    // X / Y (F / C): the next / previous page
    if (input.pressed('special')) this.turn(1);
    if (input.pressed('dodge')) this.turn(-1);
    if (input.pressed('interact')) { input.consume('interact'); this.activate(I.find((i) => i.id === this.focus)); }
    for (const it of I) if (input.mouseIn(it.x, it.y, it.w, it.h)) {
      if (input.mouse.moved && this.focus !== it.id) this.setFocus(it.id, true);
      if (input.mouse.pressed) { input.mouse.pressed = false; this.setFocus(it.id, true); this.activate(it, input.mouse); break; }
    }
  }

  setFocus(id, quiet = false) {
    const it = this.items.find((i) => i.id === id);
    if (!it) return;
    this.focus = id;
    if (it.hover) it.hover();
    if (!quiet) audio.sfx('select', { volume: 0.4 });
  }

  // the nearest item that way (straight lines first)
  nav(dir) {
    const cur = this.items.find((i) => i.id === this.focus);
    if (!cur) return;
    const cx = cur.x + cur.w / 2, cy = cur.y + cur.h / 2;
    let best = null, bs = 1e9;
    for (const it of this.items) {
      if (it === cur) continue;
      const dx = it.x + it.w / 2 - cx, dy = it.y + it.h / 2 - cy;
      const along = dir === 'left' ? -dx : dir === 'right' ? dx : dir === 'up' ? -dy : dy;
      if (along <= 2) continue;
      const across = dir === 'left' || dir === 'right' ? Math.abs(dy) : Math.abs(dx);
      const score = along + across * 2.2;
      if (score < bs) { bs = score; best = it; }
    }
    if (best) this.setFocus(best.id);
  }

  // (m: the mouse, when it's a click — where it landed)
  activate(it, m) { if (it && it.fn) it.fn(m); }

  go(page) {
    if (this.page === page) return;
    this.page = page; this.focus = null; this.confirm = null;
    audio.sfx('page');
  }
  turn(k) { const P = this.pages, i = P.findIndex((p) => p[0] === this.page); this.go(P[(i + k + P.length) % P.length][0]); }

  // a press you have to make twice (resetting talents, melting gear)
  twice(id, fn) {
    if (this.confirm && this.confirm.id === id) { this.confirm = null; fn(); return; }
    this.confirm = { id, until: this.t + 3 };
    audio.sfx('select');
  }
  asking(id) { return !!(this.confirm && this.confirm.id === id); }

  item(id, x, y, w, h, fn, hover) { this.items.push({ id, x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), fn, hover }); }

  // ------------------------------------------------------------------ drawing
  draw(ctx, px, py, pw, ph) {
    this.items = [];
    this.home = null;
    const W = this.wild, f = W && W.me.fighter;
    if (!f && !this.pages.some((q) => q[0] === 'you')) { drawText(ctx, t('Your hero is waiting out in the wild lands.'), px + pw / 2, py + ph / 2 - 4, { color: UI.inkSoft, align: 'center' }); return; }
    if (!this.pages.some((q) => q[0] === this.page)) this.page = this.pages[0][0];
    // the pages, and your stardust (a narrow panel: the tabs squeeze up — pages with a picture
    // of their own, Party's big-screen menu: pictures, the page you're on with its name)
    const pts = this.points();
    let x = px + 10;
    if (this.pages[0][2]) {
      for (const [id, label, glyph] of this.pages) {
        const on = this.page === id, text = on ? t(label) + (id === 'talents' && pts ? ' +' + pts : '') : '';
        const w = 20 + (on ? measure(text) + 5 : 0);
        ctx.fillStyle = on ? '#e0a526' : id === 'talents' && pts ? '#9fd08a' : '#c9a77c';
        ctx.fillRect(x, py + 5, w, 18);
        ctx.fillStyle = on ? '#f6d38f' : 'rgba(255,255,255,0.25)'; ctx.fillRect(x, py + 5, w, 1);
        drawGlyph(ctx, typeof glyph === 'function' ? glyph() : glyph, x + 2, py + 6);
        if (on) drawText(ctx, text, x + 20, py + 10, { color: '#3b2a2e' });
        else if (id === 'talents' && pts) { ctx.fillStyle = '#c8454f'; ctx.fillRect(x + 14, py + 5, 5, 5); }
        this.item('pg:' + id, x, py + 5, w, 18, () => this.go(id));
        x += w + 3;
      }
    }
    const texts = this.pages.map(([id, label]) => t(label) + (id === 'talents' && pts ? ' +' + pts : ''));
    const dust = '★ ' + num(this.prof().dust), room = pw - 24 - measure(dust) - 8 - (this.pages.length - 1) * 3;
    let pad = 12;
    while (pad > 4 && texts.reduce((a, s) => a + measure(s) + pad, 0) > room) pad -= 2;
    const each = texts.reduce((a, s) => a + measure(s) + pad, 0) > room ? Math.floor(room / texts.length) : 0;
    for (const [j, [id]] of (this.pages[0][2] ? [] : this.pages.entries())) {
      const text = each ? fitText(texts[j], each - 4) : texts[j];
      const w = each || measure(text) + pad, on = this.page === id;
      ctx.fillStyle = on ? '#e0a526' : id === 'talents' && pts ? '#9fd08a' : '#c9a77c';
      ctx.fillRect(x, py + 7, w, 13);
      ctx.fillStyle = on ? '#f6d38f' : 'rgba(255,255,255,0.25)'; ctx.fillRect(x, py + 7, w, 1);
      drawText(ctx, text, x + w / 2, py + 9, { color: on ? '#3b2a2e' : '#6b4330', align: 'center' });
      this.item('pg:' + id, x, py + 7, w, 13, () => this.go(id));
      x += w + 3;
    }
    drawText(ctx, dust, px + pw - 12, py + 10, { color: '#b8862a', align: 'right' });
    const touch = this.world.input.touchMode;
    const top = py + 28, bottom = py + ph - (touch ? 8 : 20);
    const area = { x: px + 10, y: top, w: pw - 20, h: bottom - top };
    const draw = { you: 'drawYou', hero: 'drawHero', talents: 'drawTalents', gear: 'drawGear', mounts: 'drawMounts', look: 'drawLook', map: 'drawMap', quests: 'drawQuests' }[this.page] || 'drawPets';
    this[draw](ctx, area);
    // where the keyboard / gamepad is
    const it = !touch && this.items.find((i) => i.id === this.focus);
    if (it) {
      ctx.fillStyle = Math.floor(this.t * 4) % 2 ? '#e0a526' : '#b8862a';
      ctx.fillRect(it.x - 2, it.y - 2, it.w + 4, 1); ctx.fillRect(it.x - 2, it.y + it.h + 1, it.w + 4, 1);
      ctx.fillRect(it.x - 2, it.y - 2, 1, it.h + 4); ctx.fillRect(it.x + it.w + 1, it.y - 2, 1, it.h + 4);
    }
  }

  // a light card with a dark rim (and a gold top edge when it's "on")
  card(ctx, x, y, w, h, fill, rim = '#3b2a22', gold = false) {
    ctx.fillStyle = rim; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = fill; ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    if (gold) { ctx.fillStyle = '#e0a526'; ctx.fillRect(x + 1, y + 1, w - 2, 2); }
  }

  // a small button
  btn(ctx, id, x, y, w, h, label, fn, color = '#8e5d3e') {
    ctx.fillStyle = 'rgba(30,18,30,0.3)'; ctx.fillRect(x + 1, y + 2, w, h);
    ctx.fillStyle = color; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x, y, w, 1);
    drawText(ctx, fitText(label, w - 6), x + w / 2, y + Math.round((h - 9) / 2) + 1, { color: '#fff7e6', align: 'center' });
    this.item(id, x, y, w, h, fn);
  }

  // ---- your hero: who you are, how strong, and the four heroes to pick from
  drawHero(ctx, A) {
    const W = this.wild, f = W.me.fighter, cls = CLASSES[f.clsId];
    const lw = 116;
    // portrait
    this.card(ctx, A.x, A.y, 44, 44, cls.color);
    ctx.fillStyle = '#fff7e6'; ctx.fillRect(A.x + 3, A.y + 3, 38, 38);
    ctx.fillStyle = 'rgba(0,0,0,0.06)'; ctx.fillRect(A.x + 3, A.y + 30, 38, 11);
    drawClassIcon(ctx, f.clsId, A.x + 4, A.y + 5, 3);
    const nx = A.x + 50;
    drawText(ctx, fitText(t(cls.name), lw - 50), nx, A.y + 2, { color: BROWN });
    drawText(ctx, t('Level {n}', { n: f.level }), nx, A.y + 13, { color: UI.ink });
    const need = XP_NEED(f.level), k = Math.min(1, f.xp / need);
    ctx.fillStyle = '#3b2a22'; ctx.fillRect(nx, A.y + 25, lw - 50, 5);
    ctx.fillStyle = '#e6d6b6'; ctx.fillRect(nx + 1, A.y + 26, lw - 52, 3);
    ctx.fillStyle = '#e0a526'; ctx.fillRect(nx + 1, A.y + 26, Math.round((lw - 52) * k), 3);
    drawText(ctx, t('{n}/{max} xp', { n: f.xp, max: need }), nx, A.y + 33, { color: UI.inkSoft });
    // numbers
    let y = A.y + 52;
    const row = (label, val, color = UI.ink) => {
      drawText(ctx, fitText(label, lw - measure(val) - 6), A.x, y, { color: UI.inkSoft });
      drawText(ctx, val, A.x + lw, y, { color, align: 'right' });
      y += 11;
    };
    row(t('Health'), `${Math.ceil(f.hp)}/${f.maxHp}`, f.hp < f.maxHp * 0.3 ? '#c8454f' : UI.ink);
    row(t('Strength'), '×' + (Math.round(W.combat.dmgMul(W.me) * 100) / 100).toFixed(2));
    const sp = f.moves ? f.moves.special : cls.special;
    row(t(sp.name), t('{n} s', { n: Math.round(sp.cd * f.mods.cdr * 10) / 10 }));
    const pts = this.points(), owned = spent(picksOf(this.prof(), f.clsId));
    row(t('Talents'), pts ? t('{n} +{p}', { n: owned, p: pts }) : String(owned), pts ? '#4f955a' : UI.ink);
    // what you wear
    const G = this.prof().gear, find = (id) => G.bag.find((q) => q.id === id);
    const worn = [find((G.weapons || {})[f.clsId]), find(G.rune), find(G.charms[0]), find(G.charms[1])].filter(Boolean);
    drawText(ctx, t('Gear'), A.x, y, { color: UI.inkSoft });
    if (worn.length) worn.forEach((it, i) => drawGearIcon(ctx, it, A.x + lw - 12 - (worn.length - 1 - i) * 15, y - 2));
    else drawText(ctx, '—', A.x + lw, y, { color: UI.inkSoft, align: 'right' });
    y += 14;
    // the eight heroes, two columns: the picture, the name, the role — and what the one
    // under the cursor does, in full, underneath
    const rx = A.x + lw + 12, rw = A.w - lw - 12, n = CLASS_ORDER.length, cols = 2, rows = Math.ceil(n / cols);
    drawText(ctx, t('Choose your hero'), rx, A.y + 2, { color: BROWN });
    const cw = Math.floor((rw - 4) / cols), ch = Math.max(22, Math.min(30, Math.floor((A.h - 46) / rows) - 3));
    const hov = (this.focus || '').startsWith('cls:') ? this.focus.slice(4) : f.clsId;
    CLASS_ORDER.forEach((id, i) => {
      const C = CLASSES[id], cx = rx + (i % cols) * (cw + 4), cy = A.y + 14 + Math.floor(i / cols) * (ch + 3), on = f.clsId === id;
      this.card(ctx, cx, cy, cw, ch, on ? '#fff3c4' : '#f3e3c3', '#3b2a22', on);
      ctx.fillStyle = C.color; ctx.fillRect(cx + 2, cy + 2, 18, ch - 4);
      ctx.fillStyle = '#fff7e6'; ctx.fillRect(cx + 3, cy + 3, 16, ch - 6);
      drawClassIcon(ctx, id, cx + 5, cy + Math.round(ch / 2) - 6);
      drawText(ctx, fitText(t(C.name) + (on ? ' ✓' : ''), cw - 26), cx + 23, cy + 3, { color: on ? '#4f955a' : UI.ink });
      if (ch >= 24) drawText(ctx, fitText(t(C.role || ''), cw - 26), cx + 23, cy + 13, { color: UI.inkSoft });
      this.item('cls:' + id, cx, cy, cw, ch, () => { if (this.wild.chooseClass(id)) audio.sfx('confirm'); });
      if (on) this.home = 'cls:' + id;
    });
    const dy = A.y + 16 + rows * (ch + 3), dl = wrap(t(CLASSES[hov].desc), rw).slice(0, Math.max(1, Math.floor((A.y + A.h - dy) / 9)));
    dl.forEach((l, j) => drawText(ctx, l, rx, dy + j * 9, { color: UI.inkSoft }));
    // how to fight, on this device
    const kn = (k) => W.keyName(k);
    const help = wrap(this.world.input.touchMode ? t('The round buttons: attack (hold it: a big one) · {special} · dodge · jump', { special: t(sp.name) })
      : t('{a} attack (hold it: a big one) · {x} {special} · {y} dodge · {b} jump', { a: kn('a'), x: kn('x'), y: kn('y'), b: kn('b'), special: t(sp.name) }), lw);
    const hy = Math.max(y + 2, A.y + A.h - help.length * 9);
    help.forEach((l, i) => drawText(ctx, l, A.x, hy + i * 9, { color: '#b8a080' }));
  }

  // ---- talents: three specialisations side by side, five rows each (the
  // capstone is an ultimate); a row opens with the points spent in its branch
  drawTalents(ctx, A) {
    const W = this.wild, f = W.me.fighter, cls = f.clsId, trees = TREES[cls];
    const picks = picksOf(this.prof(), cls), pts = this.points();
    const treeW = Math.floor(A.w * 0.64), colW = Math.floor(treeW / 3);
    drawText(ctx, fitText(t('{hero} · level {n}', { hero: t(CLASSES[cls].name), n: f.level }), treeW - 60), A.x, A.y, { color: BROWN });
    drawText(ctx, t('Points: {n}', { n: pts }), A.x + treeW - 4, A.y, { color: pts ? '#4f955a' : UI.inkSoft, align: 'right' });
    const top = A.y + 34, rowH = Math.max(22, Math.min(34, Math.floor((A.h - 36) / 5)));
    let firstCan = null;
    trees.forEach((B, b) => {
      const cx = A.x + b * colW, mid = cx + Math.floor(colW / 2), inB = spentIn(cls, picks, b);
      // the branch: its icon, name and points
      this.card(ctx, cx + 2, A.y + 11, colW - 4, 20, inB ? '#fff3c4' : '#efe0c0', '#3b2a22', inB > 0);
      drawIcon(ctx, B.icon, cx + 3, A.y + 12, { dim: !inB });
      drawText(ctx, fitText(t(B.name), colW - 30), cx + 24, A.y + 13, { color: BROWN });
      drawText(ctx, inB + '/15', cx + 24, A.y + 22, { color: inB ? '#4f955a' : '#8a7a70' });
      const pos = (T) => ({ x: Math.round(mid + (T.col === 0.5 ? 0 : T.col === 0 ? -1 : 1) * 13 - 9), y: top + (T.row - 1) * rowH });
      for (const T of B.talents) if (T.row > 1) { const q = pos(T); ctx.fillStyle = inB >= ROW_NEED[T.row - 1] ? '#e0a526' : '#c9b89c'; ctx.fillRect(q.x + 8, q.y - (rowH - 18), 2, rowH - 18); }
      for (let r = 2; r <= 5; r++) if (inB < ROW_NEED[r - 1]) drawText(ctx, String(ROW_NEED[r - 1]), cx + 5, top + (r - 1) * rowH + 5, { color: '#b8a080' });
      for (const T of B.talents) {
        const q = pos(T), rk = rankOf(picks, T.id), open = inB >= ROW_NEED[T.row - 1], can = canLearn(cls, picks, T.id, f.level);
        if (this.selTal === T.id) { ctx.fillStyle = '#b8862a'; ctx.fillRect(q.x - 2, q.y - 2, 22, 22); }
        if (T.ult) { ctx.fillStyle = rk ? '#ffd66b' : '#c9a77c'; ctx.fillRect(q.x - 1, q.y - 1, 20, 20); }
        drawIcon(ctx, T.icon, q.x, q.y, { dim: !open || (!rk && !can), rank: rk, max: T.max, glow: can && !rk && Math.floor(this.t * 3) % 2 === 0, t: this.t });
        this.item('tal:' + T.id, q.x, q.y, 18, 18, () => this.learn(T.id), () => { this.selTal = T.id; });
        if (can && !firstCan) firstCan = 'tal:' + T.id;
        if (!this.home && b === 0 && T.row === 1 && T.col === 0) this.home = 'tal:' + T.id;
      }
    });
    if (pts && firstCan) this.home = firstCan;
    // what the selected one does, now and at its next rank
    const dx = A.x + treeW + 8, dw = A.w - treeW - 8;
    const T = this.selTal && TALENT[this.selTal];
    let y = A.y + 12;
    if (T && T.cls === cls) {
      const rk = rankOf(picks, T.id), why = whyNot(cls, picks, T.id, f.level);
      wrap(t(T.name), dw).slice(0, 2).forEach((l) => { drawText(ctx, l, dx, y, { color: T.ult ? '#b8862a' : BROWN }); y += 10; });
      drawText(ctx, t('Rank {r}/{m}', { r: rk, m: T.max }), dx, y, { color: rk ? '#4f955a' : UI.inkSoft }); y += 12;
      wrap(t(T.desc, { n: valueAt(T, Math.max(1, rk)) }), dw).slice(0, 9).forEach((l) => { drawText(ctx, l, dx, y, { color: UI.ink }); y += 10; });
      if (rk > 0 && rk < T.max && T.n) { y += 2; wrap(t('Next rank: {what}', { what: t(T.desc, { n: valueAt(T, rk + 1) }) }), dw).slice(0, 3).forEach((l) => { drawText(ctx, l, dx, y, { color: '#7d4f93' }); y += 10; }); }
      y += 4;
      if (!why) this.btn(ctx, 'learn', dx, y, dw, 15, rk ? t('Rank up') : t('Learn it'), () => this.learn(T.id), '#4f955a');
      else wrap(t(why, { n: ROW_NEED[T.row - 1] }), dw).slice(0, 2).forEach((l, i) => drawText(ctx, l, dx, y + 3 + i * 10, { color: why === 'Fully learned!' ? '#4f955a' : UI.inkSoft }));
    } else wrap(t('Pick a talent to see what it does. A row opens once enough points sit in its branch; the last one is an ultimate ({key}).', { key: W.keyName('u') }), dw).slice(0, 7).forEach((l, i) => drawText(ctx, l, dx, y + i * 10, { color: UI.inkSoft }));
    // start again
    if (spent(picks)) this.btn(ctx, 'reset', dx, A.y + A.h - 15, dw, 15, this.asking('reset') ? t('Press again') : t('Reset talents'), () => this.twice('reset', () => W.progress.onMsg(W.me, { t: 'talentReset' })), this.asking('reset') ? '#c8454f' : '#8a7a98');
  }

  learn(id) {
    const W = this.wild, f = W.me.fighter, picks = picksOf(this.prof(), f.clsId);
    this.selTal = id;
    if (!canLearn(f.clsId, picks, id, f.level)) { audio.sfx('cancel', { volume: 0.5 }); return; }
    W.progress.onMsg(W.me, { t: 'talent', id });
    W.toast(t('You learned {talent}!', { talent: t(TALENT[id].name) }));
  }

  // ---- gear: a rune, two charms and a bag; stardust upgrades them
  drawGear(ctx, A) {
    const W = this.wild, pr = this.prof(), G = pr.gear;
    const find = (id) => G.bag.find((q) => q.id === id);
    const leftW = Math.floor(A.w * 0.56), cls = this.me.fighter.clsId;
    const sw = Math.floor((leftW - 12) / 4);
    [[t('Weapon'), (G.weapons || {})[cls], 'wpn'], [t('Rune'), G.rune, 'rune'], [t('Charm'), G.charms[0], 'c0'], [t('Charm'), G.charms[1], 'c1']].forEach(([label, id, key], i) => {
      const x = A.x + i * (sw + 4), it = find(id);
      drawText(ctx, fitText(label, sw), x + sw / 2, A.y, { color: UI.inkSoft, align: 'center' });
      this.card(ctx, x, A.y + 10, sw, 28, it ? '#fff3c4' : '#e0d0b0');
      if (it) { ctx.fillStyle = itemBorder(it); ctx.fillRect(x + 1, A.y + 11, sw - 2, 2); drawGearIcon(ctx, it, x + 6, A.y + 17); drawText(ctx, itemTag(it), x + sw - 5, A.y + 26, { color: BROWN, align: 'right' }); }
      else drawText(ctx, '—', x + sw / 2, A.y + 20, { color: UI.inkSoft, align: 'center' });
      this.item('slot:' + key, x, A.y + 10, sw, 28, it ? () => this.wear(it) : null, () => { if (it) this.selGear = it.id; });
    });
    const by = A.y + 46;
    drawText(ctx, t('Bag ({n}/{max})', { n: G.bag.length, max: BAG }), A.x, by, { color: UI.inkSoft });
    const cell = 26, per = Math.max(1, Math.floor((leftW + 3) / (cell + 3)));
    G.bag.forEach((it, i) => {
      const x = A.x + (i % per) * (cell + 3), y = by + 11 + Math.floor(i / per) * (cell + 3);
      const on = isWorn(G, it);
      this.card(ctx, x, y, cell, cell, on ? '#fff3c4' : '#f3e3c3', this.selGear === it.id ? '#b8862a' : itemBorder(it));
      drawGearIcon(ctx, it, x + 7, y + 5);
      drawText(ctx, itemTag(it), x + cell - 3, y + cell - 10, { color: BROWN, align: 'right' });
      if (on) drawText(ctx, '✓', x + 3, y + cell - 10, { color: '#4f955a' });
      this.item('bag:' + it.id, x, y, cell, cell, () => this.wear(it), () => { this.selGear = it.id; });
      if (!this.home) this.home = 'bag:' + it.id;
    });
    if (!G.bag.length) wrap(t('Open treasure chests out in the wild lands to find weapons, runes and charms.'), leftW).slice(0, 3).forEach((l, i) => drawText(ctx, l, A.x, by + 14 + i * 10, { color: UI.inkSoft }));
    // the selected one
    const it = find(this.selGear);
    const dx = A.x + leftW + 10, dw = A.w - leftW - 10;
    let y = A.y;
    if (it) {
      const on = isWorn(G, it), col = itemBorder(it);
      drawGearIcon(ctx, it, dx + (it.kind === 'weapon' ? 3 : 0), y - 1 + (it.kind === 'weapon' ? 3 : 0));
      drawText(ctx, fitText(t(itemName(it)) + (it.kind === 'weapon' ? '' : ' ' + ROMAN[it.lv]), dw - 20), dx + 20, y, { color: col === '#c9c4cc' ? BROWN : col });
      y += 18;
      const lines = it.kind === 'weapon' ? weaponLines(it) : [[itemDesc(it).key, itemDesc(it).vars, null]];
      if (it.kind === 'weapon' && it.cls !== this.me.fighter.clsId) lines.splice(1, 0, ['For the {hero}', { hero: CLASSES[it.cls] ? t(CLASSES[it.cls].name) : '' }, '#c8454f']);
      const tr = (v) => { const o = {}; for (const k in v || {}) o[k] = typeof v[k] === 'string' ? t(v[k]) : v[k]; return o; };
      for (const [key, vars, c] of lines) for (const l of wrap(t(key, tr(vars)), dw).slice(0, 3)) { drawText(ctx, l, dx, y, { color: c === '#c9c4cc' ? '#8a7a70' : c || UI.ink }); y += 10; }
      y += 4;
      this.btn(ctx, 'wear', dx, y, dw, 15, on ? t('Take off') : t('Wear it'), () => this.wear(it), on ? '#8a7a98' : '#4f955a');
      y += 19;
      const cost = itemUpgrade(it);
      if (cost) { this.btn(ctx, 'up', dx, y, dw, 15, t('Upgrade · {n} ★', { n: cost }), () => this.upgrade(it), pr.dust >= cost ? '#b8862a' : '#9a8a80'); y += 19; }
      this.btn(ctx, 'melt', dx, y, dw, 15, this.asking('melt') ? t('Press again') : t('Melt · +{n} ★', { n: meltValue(it) }), () => this.twice('melt', () => { W.progress.onMsg(W.me, { t: 'gear', op: 'drop', id: it.id }); this.selGear = null; audio.sfx('sparkle', { volume: 0.5 }); }), this.asking('melt') ? '#c8454f' : '#8a5a4a');
    } else if (G.bag.length) wrap(t('Pick a weapon, a rune or a charm to see what it does'), dw).slice(0, 3).forEach((l, i) => drawText(ctx, l, dx, y + i * 10, { color: UI.inkSoft }));
    wrap(t('Stardust comes from the gloom you chase away — and from melting gear.'), A.w).slice(0, 2).forEach((l, i, a) => drawText(ctx, l, A.x, A.y + A.h - (a.length - i) * 10 + 2, { color: '#b8a080' }));
  }

  wear(it) {
    const W = this.wild, G = this.prof().gear, on = isWorn(G, it);
    this.selGear = it.id;
    W.progress.onMsg(W.me, { t: 'gear', op: on ? 'unequip' : 'equip', id: it.id });
    if (on) audio.sfx('cancel', { volume: 0.5 });
  }

  upgrade(it) {
    const W = this.wild, cost = itemUpgrade(it);
    if (!cost || this.prof().dust < cost) { audio.sfx('cancel', { volume: 0.5 }); W.toast(t('Not enough stardust yet')); return; }
    W.progress.onMsg(W.me, { t: 'gear', op: 'upgrade', id: it.id });
  }

  // ---- mounts: the animals of the wild lands (and Dino Isle's), and which one comes when you whistle
  drawMounts(ctx, A) {
    const W = this.wild, M = W.mounts, owned = M.owned(W.me), active = M.active(W.me);
    drawText(ctx, t('Mounts  {n}/{total}', { n: owned.length, total: MOUNT_ORDER.length }), A.x, A.y, { color: BROWN });
    const cols = MOUNT_ORDER.length > 6 ? 4 : 3, rows = Math.ceil(MOUNT_ORDER.length / cols), gap = 6, cw = Math.floor((A.w - gap * (cols - 1)) / cols);
    const chh = Math.max(44, Math.min(70, Math.floor((A.h - 40) / rows) - gap));
    MOUNT_ORDER.forEach((kind, i) => {
      const D = MOUNTS[kind], have = owned.includes(kind), on = have && active === kind;
      const x = A.x + (i % cols) * (cw + gap), y = A.y + 14 + Math.floor(i / cols) * (chh + gap);
      this.card(ctx, x, y, cw, chh, on ? '#fff3c4' : have ? '#f7ecd4' : '#e6d6b6', '#3b2a22', on);
      ctx.fillStyle = have ? '#cfe6c0' : '#d6c6a6'; ctx.fillRect(x + 3, y + 4, 28, 24);
      drawMountIcon(ctx, kind, x + 5, y + 6, 2, !have);
      if (!have) drawText(ctx, '?', x + 17, y + 11, { color: '#fff7e6', align: 'center' });
      drawText(ctx, fitText(have ? t(D.name) : '???', cw - 38), x + 35, y + 5, { color: have ? UI.ink : '#8a7a70' });
      drawText(ctx, fitText(on ? '✓ ' + t('Your mount') : have ? t('Choose it') : t('Still wild'), cw - 38), x + 35, y + 16, { color: on ? '#4f955a' : UI.inkSoft });
      // where it lives and what it loves (a hint to tame it)
      foodIcon(ctx, D.food, x + 5, y + 33);
      const fl = wrap(t('Loves {food}', { food: t(FOODS[D.food].a) }), cw - 20).slice(0, chh >= 62 ? 2 : 1);
      fl.forEach((l, j) => drawText(ctx, l, x + 16, y + 32 + j * 9, { color: UI.inkSoft }));
      if (chh >= 54) drawText(ctx, fitText(t(ZNAME[D.zones[0]] || ''), cw - 10), x + 5, y + chh - 11, { color: '#b8a080' });
      this.item('mnt:' + kind, x, y, cw, chh, have && !on ? () => { M.choose(W.me, kind); audio.sfx('confirm'); W.toast(t('{animal} will come when you whistle', { animal: cap(t(D.the)) })); } : null);
      if (on || (!this.home && i === 0)) this.home = 'mnt:' + kind;
    });
    const help = owned.length ? t('Whistle with {y} · {a} to ride · {y} to get off', { y: W.keyName('y'), a: W.keyName('a') }) : t('Offer a wild animal the food it loves, then win its trust.');
    wrap(help, A.w).slice(0, 2).forEach((l, i, a) => drawText(ctx, l, A.x, A.y + A.h - (a.length - i) * 10 + 2, { color: '#b8a080' }));
  }

  // ---- companions: the animals you freed from the gloom, and which one follows you
  drawPets(ctx, A) {
    const W = this.wild, B = W.buddies, owned = B.owned(W.me), active = B.active(W.me);
    drawText(ctx, t('Companions  {n}/{total}', { n: owned.length, total: BUDDY_ORDER.length }), A.x, A.y, { color: BROWN });
    const cols = 3, rows = Math.ceil((BUDDY_ORDER.length + 1) / cols), gap = 6, cw = Math.floor((A.w - gap * (cols - 1)) / cols);
    const chh = Math.max(44, Math.min(66, Math.floor((A.h - 40) / rows) - gap));
    BUDDY_ORDER.forEach((kind, i) => {
      const K = BUDDY_KINDS[kind], have = owned.includes(kind), on = have && active === kind;
      const x = A.x + (i % cols) * (cw + gap), y = A.y + 14 + Math.floor(i / cols) * (chh + gap);
      this.card(ctx, x, y, cw, chh, on ? '#fff3c4' : have ? '#f7ecd4' : '#e6d6b6', '#3b2a22', on);
      ctx.fillStyle = have ? '#cfe6c0' : '#d6c6a6'; ctx.fillRect(x + 3, y + 4, 28, 24);
      drawPetIcon(ctx, kind, x + 5, y + 6, 2, !have);
      if (!have) drawText(ctx, '?', x + 17, y + 11, { color: '#fff7e6', align: 'center' });
      drawText(ctx, fitText(have ? t(K.name) : '???', cw - 38), x + 35, y + 5, { color: have ? UI.ink : '#8a7a70' });
      drawText(ctx, fitText(on ? '✓ ' + t('Follows you') : have ? t('Call it') : t('Still in the gloom'), cw - 38), x + 35, y + 16, { color: on ? '#4f955a' : UI.inkSoft });
      // (where to find one)
      if (!have) wrap(t(K.hint), cw - 10).slice(0, chh >= 58 ? 3 : 2).forEach((l, j) => drawText(ctx, l, x + 5, y + 31 + j * 9, { color: '#b8a080' }));
      else drawText(ctx, fitText(t('Nips at the gloom'), cw - 10), x + 5, y + 32, { color: '#b8a080' });
      this.item('pet:' + kind, x, y, cw, chh, have && !on ? () => { B.choose(W.me, kind); audio.sfx('confirm'); } : null);
      if (on || (!this.home && i === 0)) this.home = 'pet:' + kind;
    });
    // (the last cell: send them home)
    const i = BUDDY_ORDER.length, x = A.x + (i % cols) * (cw + gap), y = A.y + 14 + Math.floor(i / cols) * (chh + gap);
    if (active) {
      this.card(ctx, x, y, cw, chh, '#efe2c8', '#3b2a22');
      drawText(ctx, fitText(t('Send home'), cw - 8), x + cw / 2, y + chh / 2 - 9, { color: UI.ink, align: 'center' });
      drawText(ctx, fitText(t('Nobody follows you'), cw - 8), x + cw / 2, y + chh / 2 + 2, { color: UI.inkSoft, align: 'center' });
      this.item('pet:home', x, y, cw, chh, () => { B.choose(W.me, null); audio.sfx('confirm'); });
    }
    const help = owned.length ? t('Your companion trots along behind you and nips at any gloom that comes near.') : t('Free a gloomy animal: it may become your friend.');
    wrap(help, A.w).slice(0, 2).forEach((l, j, a) => drawText(ctx, l, A.x, A.y + A.h - (a.length - j) * 10 + 2, { color: '#b8a080' }));
  }
}
