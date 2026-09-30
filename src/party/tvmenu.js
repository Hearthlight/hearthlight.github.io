// A player's own menu on the big screen, for the ones without a phone (a
// gamepad, or the keyboard): everything the phone's menu does — the Hero,
// Talents, Gear, Mounts and Companions pages (the solo game's Hero page,
// src/solo/herotab.js), the whole wardrobe (treasure hats too), the world map,
// the quest journal — and a page of their own (their name on the screen's
// letters, a campfire, unstuck, leave). Back / Select on a gamepad, or Tab on the keyboard,
// opens it; B or the same button closes it. One at a time, on the right of the
// screen (the camera slides the heroes over to the left); a friend who asks
// meanwhile is next. While it's open, that hero stands still — the others play on.

import { drawText, measure, wrap } from '../engine/font.js';
import { panel, UI, fitText, keyLabel, padName, isFace, faceGlyph, moveKeys, closeButton } from '../ui/ui.js';
import { drawWorldPanel, MapView } from './worldmap.js';
import { MapPick } from './guide.js';
import { LOOK_GROUPS, TREASURE_HATS } from '../data/looks.js';
import { HeroTab } from '../solo/herotab.js';
import { Osk } from '../ui/osk.js';
import { QuietInput, KEY_LAYOUTS } from './inputs.js';
import { CLASSES } from '../combat/classes.js';
import { randomLook } from '../data/looks.js';
import { audio } from '../engine/audio.js';
import { t, tn } from '../i18n.js';

// [id, name, the picture on its tab]
const PAGES = [['hero', 'Hero', 'pan'], ['talents', 'Talents', 'star'], ['gear', 'Gear', 'armory'], ['mounts', 'Mounts', 'horseshoe'], ['pets', 'Companions', 'pet'],
  ['look', 'Wardrobe', 'shirt'], ['map', 'Map', 'map'], ['quests', 'Journal', 'book'], ['you', 'You', 'people']];
const LOBBY_PAGES = ['look', 'you'];
// (the menu's input with the stick — and maybe a button — taken: a page that uses them itself)
const DIRS = ['left', 'right', 'up', 'down'];
const NO_STICK = (input, block = []) => ({
  mouse: input.mouse, down: (a) => input.down(a), mouseIn: (...r) => input.mouseIn(...r), consume: (...a) => input.consume(...a),
  pressed: (a) => !block.includes(a) && input.pressed(a), repeat: (d) => (DIRS.includes(d) ? false : input.repeat(d)),
});

// the button a player presses for A / B / X / Y / U / their menu, on their own device
export function keyOf(p, k) {
  if (p.kind === 'gamepad') return padName({ a: 'interact', b: 'jump', x: 'special', y: 'dodge', u: 'ult', m: 'map', t: 'talk' }[k] || 'interact', p.input.style || 'xbox');
  if (p.kind === 'keys') { const L = KEY_LAYOUTS[p.input.layoutId], c = L && L[k] && L[k][0]; return c ? keyLabel(c) : k.toUpperCase(); }
  return k.toUpperCase();
}

// a player's input, the way the Hero page likes it (repeat on a held direction) — and the big
// screen's mouse, whoever's menu it is (only over the menu, and not under what's drawn on it)
class MenuInput {
  constructor(p, real, menus) { this.p = p; this.real = real; this.menus = menus; this.hold = {}; this.fired = {}; }
  get mouse() { return this.menus.P.game.input.mouse; }
  tick(dt) {
    for (const d of ['left', 'right', 'up', 'down']) {
      if (this.real.down(d)) this.hold[d] = (this.hold[d] || 0) + dt;
      else { this.hold[d] = 0; this.fired[d] = 0; }
    }
  }
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
  consume() { this.real.edges.clear(); this.mouse.pressed = false; }
  mouseIn(x, y, w, h) { return this.menus.pointing() && this.menus.P.game.input.mouseIn(x, y, w, h); }
}

// the Hero page, for one player of the party (and their own page)
class TvHero extends HeroTab {
  constructor(P, p) {
    super(null);
    this.P = P; this.p = p;
    const me = p;
    this.W = {
      get me() { return me; },
      get progress() { return P.progress; },
      get combat() { return P.combat; },
      get mounts() { return P.mounts; },
      get buddies() { return P.buddies; },
      toast: (text) => P.toast(text, me.color),
      keyName: (k) => keyOf(me, k),
      chooseClass: (id) => {
        if (!CLASSES[id] || me.cls === id) return false;
        me.cls = id; P.saveProfile(me);
        if (P.combat) P.combat.setClass(me, id);
        P.world.fx.emit('sparkle', me.pos.x, 1.2, me.pos.z, 12, { color: CLASSES[id].color });
        P.toast(t('{name} is a {hero} now!', { name: me.name, hero: t(CLASSES[id].name) }), me.color);
        return true;
      },
    };
    this.osk = null;
    this.page = 'you';
    this.lookTab = 0; this.lookRow = 0;     // the wardrobe: which group, which part
    this.mapView = new MapView();
    this.qSel = 0;                          // the journal's quest
  }
  get world() { return { input: { touchMode: false }, wild: this.W }; }
  get wild() { return this.W; }
  get me() { return this.p; }

  // (in the lobby there's no hero yet: the wardrobe and your own page)
  syncPages() {
    const hero = [...PAGES[0]];
    hero[2] = (CLASSES[this.p.cls] || CLASSES.knight).icon;
    this.pages = (this.p.fighter ? PAGES : PAGES.filter((q) => LOBBY_PAGES.includes(q[0]))).map((q) => (q[0] === 'hero' ? hero : q));
  }

  update(dt, input) {
    if (this.osk) {
      this.typing(true);
      this.osk.update(dt, input);
      if (this.osk.done) { this.p.name = this.osk.v.trim().slice(0, 12); this.P.profileOf(this.p).named = true; this.P.saveProfile(this.p); this.P.flashTag(this.p, 3); audio.sfx('confirm'); }
      if (this.osk.done || this.osk.back) { this.osk = null; this.typing(false); input.consume(); }
      return;
    }
    // the wardrobe: ↑ ↓ a part, ← → its options (A: the next one); the map: the stick moves it,
    // A zooms in (and back out); the journal: ↑ ↓ through the quests
    if (this.page === 'look' && this.focus && this.focus.startsWith('lk:')) {
      const parts = this.lookParts();
      if (input.repeat('up') && this.lookRow > 0) { this.lookRow--; this.focus = 'lk:' + this.lookRow; audio.sfx('select', { volume: 0.4 }); }
      else if (input.repeat('up')) { this.focus = 'lg:' + this.lookTab; audio.sfx('select', { volume: 0.4 }); }
      if (input.repeat('down') && this.lookRow < parts.length - 1) { this.lookRow++; this.focus = 'lk:' + this.lookRow; audio.sfx('select', { volume: 0.4 }); }
      if (input.repeat('left')) this.stepLook(parts[this.lookRow], -1);
      if (input.repeat('right')) this.stepLook(parts[this.lookRow], 1);
      super.update(dt, NO_STICK(input));
      return;
    }
    if (this.page !== 'map') this.mapOpen = -1;
    if (this.page === 'map') {
      // the places on it (party/guide.js): the stick hops from one to the next, A goes there (the
      // menu closes: off you go), X / Y zoom; the mouse's wheel zooms, a drag moves it, a click on a
      // place goes there
      const V = this.mapView, F = V.frame, m = input.mouse, G = this.P.guides, K = this.pick || (this.pick = new MapPick(G, () => this.mapView));
      // (each time the page comes up: the place you're heading for — or the nearest — chosen, close round you)
      if (this.mapOpen !== this.opens) {
        this.mapOpen = this.opens;
        K.open(this.p);
        const big = this.P.big && this.P.big.map;
        if (big && big.region) { V.k = 2; V.cx = this.p.pos.x; V.cz = this.p.pos.z; }
      }
      for (const [d, dx, dy] of [['left', -1, 0], ['right', 1, 0], ['up', 0, -1], ['down', 0, 1]]) if (input.repeat(d)) K.hop(dx, dy);
      const go = (pl) => { G.set(this.p, pl); this.P.tvmenus.close(this.p); };
      if (input.pressed('interact')) { input.consume('interact'); const pl = K.current(); if (pl) { go(pl); return; } }
      if (input.pressed('special')) { V.step(1, null, null, this.p.pos); K.follow(); audio.sfx('select', { volume: 0.4 }); }
      if (input.pressed('dodge')) { V.step(-1); audio.sfx('select', { volume: 0.4 }); }
      if (F && (V.drag || input.mouseIn(F.x, F.y, F.w, F.h))) {
        K.point(m.x, m.y);
        if (m.pressed && K.hover && !V.drag) { m.pressed = false; go(K.hover.pl); return; }
        V.mouse(input, this.p.pos);
      } else K.hover = null;
      super.update(dt, NO_STICK(input, ['interact', 'special', 'dodge']));
      return;
    }
    if (this.page === 'quests') {
      const n = this.questList().length, Q = this.items.find((i) => i.id === 'q');
      const wheel = Q && input.mouseIn(Q.x, Q.y, Q.w, Q.h) ? Math.sign(input.mouse.wheel) : 0;
      if (input.repeat('up') || wheel < 0) { this.qSel = Math.max(0, this.qSel - 1); audio.sfx('select', { volume: 0.4 }); }
      if (input.repeat('down') || wheel > 0) { this.qSel = Math.min(Math.max(0, n - 1), this.qSel + 1); audio.sfx('select', { volume: 0.4 }); }
      super.update(dt, NO_STICK(input));
      return;
    }
    super.update(dt, input);
  }

  // a keyboard player types their name on the keyboard itself (the letters on the screen still
  // take a click): a letter writes, ⌫ rubs out, Enter is OK, Esc keeps the old name
  typing(on) {
    const g = this.P.game.input;
    if (on && this.p.kind === 'keys') { if (!this.typer) this.typer = (e) => this.typeKey(e); if (!g.textHandler) g.textHandler = this.typer; }
    else if (this.typer && g.textHandler === this.typer) g.textHandler = null;
  }
  typeKey(e) {
    const O = this.osk, P = this.P;
    if (!O || !P.tvmenus.isOpen(this.p) || P.host.menu || P.game.party !== P) { this.typing(false); return false; }
    if (e.key === 'Enter') O.press('OK');
    else if (e.key === 'Backspace') O.press('⌫');
    else if (e.key === 'Escape') { O.back = true; audio.sfx('cancel', { volume: 0.5 }); }
    else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && /[\p{L}\p{N} '’-]/u.test(e.key)) O.type(e.key);
    else return false;
    return true;
  }

  // ---- the wardrobe: the phone's look editor, treasure hats included
  lookParts() { return LOOK_GROUPS[this.lookTab].parts; }
  optionsOf(part) {
    if (part.key !== 'hat') return part.options;
    const hats = (this.P.profileOf(this.p).hats || []).filter((h) => TREASURE_HATS[h]);
    return part.options.concat(hats.map((id) => ({ id, name: TREASURE_HATS[id], treasure: true })));
  }
  stepLook(part, dir) {
    const P = this.P, p = this.p, opts = this.optionsOf(part);
    const i = Math.max(0, opts.findIndex((o) => o.id === p.look[part.key]));
    P.setLook(p, { ...p.look, [part.key]: opts[(i + dir + opts.length) % opts.length].id });
    P.saveProfile(p);
    audio.sfx('select', { volume: 0.5 });
  }
  drawLook(ctx, A) {
    const P = this.P, p = this.p;
    // you, as you look now
    const ps = Math.min(64, A.h - 60), lw = ps + 22;
    this.card(ctx, A.x, A.y, ps + 6, ps + 6, p.color);
    ctx.fillStyle = '#fff7e6'; ctx.fillRect(A.x + 3, A.y + 3, ps, ps);
    const img = P.portraits && P.portraits.get('party' + p.slot, p.look, 'happy');
    if (img) { ctx.imageSmoothingEnabled = false; ctx.drawImage(img, A.x + 3, A.y + 3, ps, ps); }
    this.btn(ctx, 'lk:rand', A.x, A.y + ps + 12, lw, 15, t('★ Surprise me'), () => { P.setLook(p, randomLook()); P.saveProfile(p); audio.sfx('sparkle', { volume: 0.6 }); });
    const hats = (P.profileOf(p).hats || []).filter((h) => TREASURE_HATS[h]).length;
    if (hats) wrap(tn('{n} treasure hat found on the rares', '{n} treasure hats found on the rares', hats), lw).slice(0, 3).forEach((l, i) => drawText(ctx, l, A.x, A.y + ps + 32 + i * 9, { color: '#b8862a' }));
    // the groups, then their parts: ◂ value ▸
    const cx = A.x + lw + 10, cw = A.x + A.w - cx;
    const gw = Math.floor(cw / LOOK_GROUPS.length);
    LOOK_GROUPS.forEach((g, i) => {
      const on = i === this.lookTab, gx = cx + i * gw;
      ctx.fillStyle = on ? '#e0a526' : '#c9a77c'; ctx.fillRect(gx, A.y, gw - 3, 13);
      drawText(ctx, fitText(t(g.name), gw - 7), gx + (gw - 3) / 2, A.y + 2, { color: on ? '#3b2a2e' : '#6b4330', align: 'center' });
      this.item('lg:' + i, gx, A.y, gw - 3, 13, () => { this.lookTab = i; this.lookRow = 0; audio.sfx('page', { volume: 0.5 }); }, () => { if (this.lookTab !== i) { this.lookTab = i; this.lookRow = 0; } });
    });
    const parts = this.lookParts(), rh = Math.max(15, Math.min(20, Math.floor((A.h - 20) / parts.length)));
    if (this.lookRow >= parts.length) this.lookRow = parts.length - 1;
    parts.forEach((part, i) => {
      const y = A.y + 18 + i * rh, opts = this.optionsOf(part);
      const o = opts.find((q) => q.id === p.look[part.key]) || opts[0];
      const lw = Math.round(cw * 0.36), vx = cx + lw, vw = cw - lw;
      drawText(ctx, fitText(t(part.label), lw - 4), cx, y + 3, { color: UI.inkSoft });
      drawText(ctx, '◂', vx, y + 3, { color: '#c8454f' });
      drawText(ctx, '▸', vx + vw - 6, y + 3, { color: '#c8454f' });
      ctx.fillStyle = o.treasure ? '#fff0b0' : '#f3e3c3'; ctx.fillRect(vx + 9, y, vw - 20, rh - 4);
      let tx = vx + 9 + (vw - 20) / 2;
      if (o.color) { ctx.fillStyle = '#3b2a22'; ctx.fillRect(vx + 12, y + 2, 9, 9); ctx.fillStyle = o.color; ctx.fillRect(vx + 13, y + 3, 7, 7); tx += 6; }
      drawText(ctx, fitText((o.treasure ? '★' : '') + t(o.name), vw - 36), tx, y + 3, { color: o.treasure ? '#8a5a10' : UI.ink, align: 'center' });
      // (a click on the ◂ half goes back)
      this.item('lk:' + i, vx, y - 1, vw, rh - 2, (m) => this.stepLook(part, m && m.x < vx + vw / 2 ? -1 : 1), () => { this.lookRow = i; });
    });
    if (!this.home) this.home = 'lk:0';
  }

  // ---- the world map (the phone's), zoomed with A, moved with the stick
  drawMap(ctx, A) {
    const P = this.P, V = this.mapView;
    ctx.fillStyle = '#2a1d34'; ctx.fillRect(A.x - 2, A.y - 2, A.w + 4, A.h + 4);
    V.hint = '';
    const r = drawWorldPanel(P, ctx, A.x, A.y + 12, A.w, A.h - 12, { counts: true, view: V });
    if (this.pick) { this.pick.layout(r); this.pick.draw(ctx); }
    // you: a ring in your colour
    if (r && r.M && this.p.pos) {
      const q = r.M(this.p.pos.x, this.p.pos.z), bl = Math.floor(this.t * 3) % 2;
      if (q.x > r.mx && q.x < r.mx + r.mw && q.y > r.my && q.y < r.my + r.mh) {
        ctx.fillStyle = '#2a1f33'; ctx.fillRect(Math.round(q.x) - 4, Math.round(q.y) - 4, 9, 9);
        ctx.fillStyle = bl ? this.p.color : '#fff7e6'; ctx.fillRect(Math.round(q.x) - 3, Math.round(q.y) - 3, 7, 7);
      }
    }
    // (the keyboard's player has the arrows — and the mouse)
    const a = keyOf(this.p, 'a'), x = keyOf(this.p, 'x'), y = keyOf(this.p, 'y'), cur = this.pick && this.pick.current();
    const how = t(cur && this.p.guide && this.p.guide.id === cur.id ? '{a}: stop guiding · {x} / {y}: zoom' : '{a}: go there · {x} / {y}: zoom', { a, x, y });
    drawText(ctx, fitText(how, A.w), A.x, A.y, { color: '#f6d38f' });
    this.item('map', A.x, A.y + 12, A.w, A.h - 12, () => {});
    this.home = 'map';
  }

  // ---- the quest journal: the adventure's quests, what to do next
  questList() { const S = this.P.saga; return S ? S.journal().filter((q) => !q.done || q.def.main) : []; }
  drawQuests(ctx, A) {
    const S = this.P.saga, list = this.questList();
    if (S) drawText(ctx, fitText(t('Chapter {n} · {title}', { n: S.chapter.id, title: t(S.chapter.title) }), A.w), A.x, A.y, { color: '#8a5234' });
    if (!list.length) { drawText(ctx, t('No quests yet. Explore and talk to people!'), A.x, A.y + 16, { color: UI.inkSoft }); this.item('q', A.x, A.y, A.w, 12, () => {}); this.home = 'q'; return; }
    this.qSel = Math.min(this.qSel, list.length - 1);
    const first = Math.max(0, Math.min(this.qSel - 2, list.length - 5)), rows = [];
    let y = A.y + 14;
    list.forEach((q, i) => {
      if (i < first || y > A.y + A.h - 16) return;
      const on = i === this.qSel, lines = q.done ? [t('Completed ✓')] : wrap(q.obj || '', A.w - 16).slice(0, on ? 4 : 1);
      const h = 11 + lines.length * 9;
      if (on) { ctx.fillStyle = UI.sel; ctx.fillRect(A.x - 2, y - 2, A.w + 4, h + 2); }
      drawText(ctx, q.def.main ? '★' : '♥', A.x, y, { color: q.done ? '#b8a080' : q.def.main ? '#e0a526' : '#ec5f73' });
      drawText(ctx, fitText(t(q.def.title), A.w - 12), A.x + 10, y, { color: q.done ? '#b8a080' : UI.ink });
      lines.forEach((l, k) => drawText(ctx, on || k === 0 ? l : '', A.x + 10, y + 10 + k * 9, { color: q.done ? '#c8b8a0' : UI.inkSoft }));
      rows.push({ i, y0: y - 2, y1: y + h + 1 });
      y += h + 3;
    });
    // (a click on a quest opens it)
    this.item('q', A.x, A.y + 12, A.w, A.h - 12, (m) => {
      const r = m && rows.find((o) => m.y >= o.y0 && m.y < o.y1);
      if (r && r.i !== this.qSel) { this.qSel = r.i; audio.sfx('select', { volume: 0.4 }); }
    });
    this.home = 'q';
  }

  // ---- your own page: who you are on the screen, and a few handy things
  drawYou(ctx, A) {
    const P = this.P, p = this.p;
    // your name & colour, and what you play with
    this.card(ctx, A.x, A.y, 30, 30, p.color);
    ctx.fillStyle = '#fff7e6'; ctx.fillRect(A.x + 3, A.y + 3, 24, 24);
    const img = P.portraits && P.portraits.get('party' + p.slot, p.look, 'happy');
    if (img) { ctx.imageSmoothingEnabled = false; ctx.drawImage(img, A.x + 3, A.y + 3, 24, 24); }
    drawText(ctx, fitText(p.name, A.w - 40), A.x + 36, A.y + 2, { color: '#8a5234' });
    const dev = p.kind === 'gamepad' ? '🎮 ' + (p.input.name ? p.input.name.replace(/\(.*$/, '').trim() : t('Gamepad')) : t('Keyboard · {keys}', { keys: moveKeys() + ' / ← ↑ → ↓' });
    drawText(ctx, fitText(dev, A.w - 40), A.x + 36, A.y + 13, { color: UI.inkSoft });
    // the buttons (as wide as their words: the rest for your buttons' list)
    const words = [t('Change your name'), t('Light a campfire'), t('Get unstuck'), t('Leave the party'), t('Press again')];
    const bw = Math.min(150, A.w - 4, Math.max(96, ...words.map((s) => measure(s))) + 16), bx = A.x;
    let y = A.y + 38;
    const btn = (id, label, fn, color) => { this.btn(ctx, id, bx, y, bw, 15, label, fn, color); y += 19; };
    // (on the keyboard: typed with its keys)
    const typed = p.kind === 'keys' ? t('Type your name on the keyboard · Enter: OK') : null;
    btn('name', t('Change your name'), () => { this.osk = new Osk(p.name, { title: 'Your name', keys: { a: keyOf(p, 'a'), b: keyOf(p, 'b'), x: keyOf(p, 'x'), ok: keyOf(p, 'm') }, hint: typed }); audio.sfx('open'); });
    if (P.phase !== 'lobby' && P.camp) btn('camp', t('Light a campfire'), () => { P.tvmenus.close(p); P.camp.build(p); }, '#b8502a');
    if (P.phase !== 'lobby') btn('unstuck', t('Get unstuck'), () => { P.tvmenus.close(p); P.unstick(p); });
    btn('leave', this.asking('leave') ? t('Press again') : t('Leave the party'), () => this.twice('leave', () => { P.tvmenus.close(p); P.removePlayer(p); }), this.asking('leave') ? '#c8454f' : '#8a7a98');
    if (!this.home) this.home = p.stuckOffer && P.phase !== 'lobby' ? 'unstuck' : 'name';
    // how you play, on your own buttons
    const kx = bx + bw + 10, kw = A.x + A.w - kx;
    if (kw < 70) return;
    drawText(ctx, t('Your buttons'), kx, A.y + 38, { color: '#8a5234' });
    const rows = [['a', t('Attack · talk · use')], ['b', t('Jump · back')], ['x', t('Special move')], ['y', t('Dodge')], ['u', t('Ultimate')], ['m', t('This menu')]];
    rows.forEach(([k, label], i) => {
      const ky = A.y + 50 + i * 12, key = keyOf(p, k);
      if (p.kind === 'gamepad' && isFace(key)) faceGlyph(ctx, kx + 5, ky + 4, key);
      else { const w = measure(key) + 6; ctx.fillStyle = '#3b2a2e'; ctx.fillRect(kx, ky - 1, w, 10); drawText(ctx, key, kx + w / 2, ky, { color: '#fff3c4', align: 'center' }); }
      const lx = kx + 16 + (isFace(key) || measure(key) < 10 ? 0 : measure(key) - 4);
      drawText(ctx, fitText(label, kx + kw - lx), lx, ky, { color: UI.ink });
    });
    const host = wrap(t('{start}: the host’s menu, for everyone (pause, zoom, skip…)', { start: p.kind === 'gamepad' ? padName('pause', p.input.style) : 'Esc' }), kw);
    host.slice(0, 3).forEach((l, i) => drawText(ctx, l, kx, A.y + 50 + rows.length * 12 + 4 + i * 9, { color: '#b8a080' }));
  }

  draw(ctx, px, py, pw, ph) {
    this.syncPages();
    super.draw(ctx, px, py, pw, ph);
    if (this.osk) this.osk.draw(ctx, pw, ph, px, py);
  }
}

export class TvMenus {
  constructor(P) {
    this.P = P;
    this.cur = null;              // { p, tab, input, real }
    this.queue = [];
    this.tabs = new Map();        // player → their TvHero (the page they were on stays)
    this.slide = 0;               // 0 → 1: the panel coming in
  }

  get open() { return !!this.cur; }
  isOpen(p) { return !!(this.cur && this.cur.p === p); }

  // a scene, a vote or the Festival Ring's blessings picked on this screen (everyone's buttons
  // count): the menu makes way — a few words with a villager don't (the box shows over the menu)
  blocked() { const P = this.P; return !!(P.vote || P.choosing || (P.stage && P.stage.active) || (P.act && P.act.picking)); }

  update(dt) {
    const P = this.P;
    if (this.cur && (!P.players.includes(this.cur.p) || !this.cur.p.connected)) this.close(this.cur.p);
    if (this.blocked()) { if (this.cur) this.close(this.cur.p, true); this.queue = []; return; }
    if (P.host.menu) return;
    for (const p of P.players) {
      if (p.kind === 'phone' || !p.connected) continue;
      const real = this.cur && this.cur.p === p ? this.cur.real : p.input;
      if (!real.pressed('m') || (this.isOpen(p) && this.cur.tab.osk)) continue;
      real.edges.delete('m');
      if (this.isOpen(p)) this.close(p);
      else if (this.cur) { if (!this.queue.includes(p)) { this.queue.push(p); P.toast(t('{name} is next for the menu', { name: p.name }), p.color); audio.sfx('select', { volume: 0.5 }); } }
      else this.openFor(p);
    }
    const c = this.cur;
    if (!c) { this.slide = Math.max(0, this.slide - dt * 6); return; }
    this.slide = Math.min(1, this.slide + dt * 6);
    c.input.tick(dt);
    if (c.real.pressed('b') && !c.tab.osk) { c.real.edges.delete('b'); this.close(c.p); return; }
    // the mouse: the close button (over the letters: back to the page) — and a click on the
    // menu stays in the menu
    const g = P.game.input, X = this.closeR;
    if (g.mouse.pressed && X && this.pointing() && g.mouseIn(X.x, X.y, X.w, X.h)) {
      g.mouse.pressed = false;
      if (c.tab.osk) { c.tab.osk = null; c.tab.typing(false); audio.sfx('close'); } else this.close(c.p);
      return;
    }
    c.tab.update(dt, c.input);
    if (g.mouse.pressed && this.pointing()) g.mouse.pressed = false;
  }

  // the big screen's mouse is on the open menu (not when the dialogue box or the big map is up:
  // a click is theirs then)
  pointing() {
    const P = this.P, R = this.rect, m = P.game.input.mouse;
    return !!(R && this.cur && !P.host.menu && !P.bigMapOpen && !P.dialogue.active && m.x >= R.x && m.y >= R.y && m.x < R.x + R.w && m.y < R.y + R.h);
  }

  openFor(p) {
    const P = this.P;
    let tab = this.tabs.get(p);
    if (!tab) { tab = new TvHero(P, p); this.tabs.set(p, tab); }
    tab.syncPages();
    tab.opens = (tab.opens || 0) + 1;
    // (a talent point waiting: straight to the talents — seemingly stuck: straight to « Get unstuck »)
    if (p.fighter && tab.points() > 0) tab.page = 'talents';
    if (p.stuckOffer && P.phase !== 'lobby') tab.page = 'you';
    tab.focus = null; tab.confirm = null;
    const real = p.input;
    p.input = new QuietInput(real);
    this.cur = { p, tab, real, input: new MenuInput(p, real, this) };
    this.queue = this.queue.filter((q) => q !== p);
    audio.sfx('open');
  }

  close(p, quiet = false) {
    const c = this.cur;
    this.queue = this.queue.filter((q) => q !== p);
    if (!c || c.p !== p) return;
    c.real.edges.clear();
    c.tab.typing(false);
    p.input = c.real;
    this.cur = null;
    if (!quiet) audio.sfx('close');
    // the next friend in line
    const next = this.queue.shift();
    if (next && this.P.players.includes(next) && next.connected && !quiet) this.openFor(next);
  }

  // the real input of a player whose menu is open (Party.update keeps it fresh)
  realOf(p) { return this.cur && this.cur.p === p ? this.cur.real : null; }

  // how far the camera slides the heroes left, in tiles (party.js updateCamera)
  shiftTiles() {
    if (!this.cur && this.slide <= 0) return 0;
    const d = this.P.display, cam = this.P.cam;
    return -((this.width() * d.scale) / d.wscale) / 2 / cam.ppu * this.slide;
  }

  width() { const W = this.P.display.w; return Math.min(W - 16, Math.max(300, Math.round(W * 0.64))); }

  draw(ctx) {
    const c = this.cur;
    this.rect = null;
    if (!c || this.P.host.menu) return;
    const d = this.P.display, W = d.w, H = d.h, p = c.p;
    // (room above for the tab with your name and the close button)
    const pw = this.width(), ph = Math.min(H - 22, 262);
    const px = Math.round(W - pw - 6 + (1 - this.slide) * (pw + 12)), py = Math.max(14, Math.round((H - ph) / 2));
    panel(ctx, px, py, pw, ph);
    this.rect = { x: px, y: py - 13, w: pw, h: ph + 13 };
    // whose menu it is: a tab in their colour on top
    const who = p.name, tw = measure(who) + 16;
    ctx.fillStyle = '#2a1f33'; ctx.fillRect(px + 10, py - 11, tw + 2, 13);
    ctx.fillStyle = p.color; ctx.fillRect(px + 11, py - 10, tw, 11);
    drawText(ctx, who, px + 11 + tw / 2, py - 8, { color: '#fff7e6', align: 'center', outline: '#2a1f33' });
    // the Close button, for the mouse (as on the big map), across from it
    const X = this.closeR, hot = !!X && this.pointing() && this.P.game.input.mouseIn(X.x, X.y, X.w, X.h);
    this.closeR = closeButton(ctx, px + pw - 8, py - 12, { hot });
    if (this.queue.length) drawText(ctx, fitText(t('Next: {names}', { names: this.queue.map((q) => q.name).join(', ') }), this.closeR.x - px - tw - 30), px + tw + 22, py - 8, { color: '#fff3c4', outline: '#2a1f33' });
    c.tab.draw(ctx, px, py, pw, ph);
    const hint = t('{x}/{y} pages · {a} choose · {b} close', { x: keyOf(p, 'x'), y: keyOf(p, 'y'), a: keyOf(p, 'a'), b: keyOf(p, 'b') });
    drawText(ctx, fitText(hint, pw - 16), px + pw / 2, py + ph - 13, { color: '#b8a080', align: 'center' });
  }
}
