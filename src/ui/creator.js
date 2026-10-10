// Character creator (new game) & wardrobe (in-game). The preview is the real
// 3D model standing in Nana's cottage; options are grouped into tabs so the
// panel always fits, with the action buttons pinned to the bottom.

import { drawText, measure, wrap } from '../engine/font.js';
import { panel, button, UI, keyCap, fitText, splitTwo, tc, ctl, device } from './ui.js';
import { CLASSES, CLASS_ORDER, STAT_NAMES, DODGE_ICON } from '../combat/classes.js';
import { drawClassIcon } from '../combat/icons.js';
import { drawIcon } from '../combat/v4/icons.js';
import { poseAt } from '../combat/combat.js';
import { Osk } from './osk.js';
import { SKIN, HAIR_COLORS, EYE_COLORS, CLOTH_COLORS } from '../art/palette.js';
import { HAIR_STYLES, TOP_STYLES, BOTTOM_STYLES, HAT_STYLES, ACC_STYLES, FACIAL_STYLES, PET_KINDS, PET_COLORS, DEFAULT_LOOK } from '../models/chars.js';
import { audio } from '../engine/audio.js';
import { TREASURE_HATS } from '../data/looks.js';
import { t, getLang } from '../i18n.js';
import { randomName } from '../data/nicknames.js';
import { TextField } from './field.js';
import { bigButton, arrowButton, diceButton, bigLines, drawLines, fitScale } from './big.js';

const STARTER_HATS = ['none', 'beanie', 'cap', 'fisher', 'flower', 'bow', 'beret', 'bandana', 'headphones'];
const STARTER_ACC = ['none', 'glasses', 'freckles', 'blush', 'bandaid'];
const STARTER_TOPS = ['tee', 'hoodie', 'sweater', 'striped', 'overalls', 'dress', 'vest', 'apron', 'coat', 'flannel', 'jacket'];
const PET_NAMES = { cat: ['Mochi', 'Biscuit', 'Pumpkin', 'Miso', 'Clover'], dog: ['Waffles', 'Pepper', 'Noodle', 'Maple', 'Bean'], bunny: ['Dumpling', 'Clover', 'Button', 'Marsh', 'Tofu'] };
// what a name may hold: letters, figures, a space, an apostrophe, a hyphen — 12 at most
const typedName = (v) => String(v).replace(/[^\p{L}\p{N} '’\-]/gu, '').replace(/^ +/, '').slice(0, 12);

export class Creator {
  constructor(game, mode = 'new', unlocked = null) {
    this.game = game;
    this.mode = mode;
    this.unlocked = unlocked || { hat: [], top: [], acc: [] };
    this.t = 0;
    this.spin = 0;
    this.tab = 0;
    this.sel = 0;
    const s = game.state;
    this.look = mode === 'new' ? { ...DEFAULT_LOOK, hair: 'bob', hairColor: 'chestnut', topColor: 'coral', bottomColor: 'blue', hatColor: 'mustard' } : { ...s.player.look };
    this.name = mode === 'new' ? '' : s.player.name;
    this.pet = mode === 'new' ? { kind: 'cat', color: 'ginger', name: 'Mochi' } : { ...s.player.pet };
    this.cls = 'knight';          // (a new game: the hero, chosen on the first tab — the Hero page changes it later)
    this.demoT = 0;
    this.done = null;
    this.nameNudge = 0;
    // a name the player typed is theirs; one the dice gave (or none yet) is rolled again by « Surprise me »
    this.nameTyped = mode !== 'new';
    this.petTyped = false;
    this.fields = null;           // a finger: the two real text fields (your name, your pet’s)
    this.buildTabs();
  }

  buildTabs() {
    const u = this.unlocked;
    const hats = [...STARTER_HATS, ...u.hat.filter((h) => !STARTER_HATS.includes(h))];
    const accs = [...STARTER_ACC, ...u.acc.filter((a) => !STARTER_ACC.includes(a))];
    const tops = [...STARTER_TOPS, ...u.top.filter((t) => !STARTER_TOPS.includes(t))];
    const ids = (arr) => arr.map((x) => x.id);
    const nm = (arr) => Object.fromEntries(arr.map((x) => [x.id, x.name]));
    const L = (key, list, names, label, type = 'list') => ({ key, list, names, label, type });
    this.tabs = [
      { name: 'Body', rows: [L('skin', ids(SKIN), nm(SKIN), 'Skin', 'color'), L('eyes', ids(EYE_COLORS), nm(EYE_COLORS), 'Eyes', 'color'), L('facial', Object.keys(FACIAL_STYLES), FACIAL_STYLES, 'Facial hair')] },
      { name: 'Hair', rows: [L('hair', Object.keys(HAIR_STYLES), HAIR_STYLES, 'Hairstyle'), L('hairColor', ids(HAIR_COLORS), nm(HAIR_COLORS), 'Hair colour', 'color')] },
      {
        name: 'Outfit', rows: [
          L('top', tops, TOP_STYLES, 'Top'), L('topColor', ids(CLOTH_COLORS), nm(CLOTH_COLORS), 'Top colour', 'color'),
          L('topColor2', ids(CLOTH_COLORS), nm(CLOTH_COLORS), 'Accent colour', 'color'), L('bottom', Object.keys(BOTTOM_STYLES), BOTTOM_STYLES, 'Bottoms'),
          L('bottomColor', ids(CLOTH_COLORS), nm(CLOTH_COLORS), 'Bottoms colour', 'color'), L('shoes', ids(CLOTH_COLORS), nm(CLOTH_COLORS), 'Shoes', 'color'),
        ],
      },
      { name: 'Extras', rows: [L('hat', hats, { ...HAT_STYLES, ...TREASURE_HATS }, 'Hat'), L('hatColor', ids(CLOTH_COLORS), nm(CLOTH_COLORS), 'Hat colour', 'color'), L('acc', accs, ACC_STYLES, 'Accessory')] },
    ];
    if (this.mode === 'new') {
      // the hero first, as on the phones in Party Mode: a weapon from June's kit, a way to fight
      const heroNames = Object.fromEntries(CLASS_ORDER.map((id) => [id, CLASSES[id].name]));
      this.tabs.unshift({ name: 'Hero', hero: true, rows: [{ key: 'cls', list: CLASS_ORDER, names: heroNames, label: 'Hero', type: 'list' }] });
      this.tabs.push({
        name: 'Pet', ctx: 'creator tab', rows: [
          { key: 'petKind', list: Object.keys(PET_KINDS), names: PET_KINDS, label: 'Companion', type: 'list' },
          { key: 'petColor', list: Object.keys(PET_COLORS), names: Object.fromEntries(Object.keys(PET_COLORS).map((k) => [k, k[0].toUpperCase() + k.slice(1)])), label: 'Colour', type: 'petcolor' },
          { key: 'petName', label: 'Name', type: 'text' },
        ],
      });
    }
  }

  // The flat list of selectable things for keyboard navigation
  items() {
    const out = [{ type: 'tabs' }];
    if (this.mode === 'new') out.push({ key: 'name', label: 'Your name', type: 'text' });
    out.push(...this.tabs[this.tab].rows);
    out.push({ key: 'random', type: 'button', label: '★ Surprise me' });
    out.push({ key: 'done', type: 'button', label: this.mode === 'new' ? 'Begin your story →' : 'Done', main: true });
    if (this.mode === 'new') out.push({ key: 'back', type: 'button', label: 'Back to title' });
    return out;
  }

  onHero() { return !!(this.tabs[this.tab] && this.tabs[this.tab].hero); }

  value(row) {
    if (row.key === 'cls') return this.cls;
    if (row.key === 'name') return this.name;
    if (row.key === 'petName') return this.pet.name;
    if (row.key === 'petKind') return this.pet.kind;
    if (row.key === 'petColor') return this.pet.color;
    return this.look[row.key];
  }

  setValue(row, v) {
    if (row.key === 'cls') { this.cls = v; this.demoT = 0; audio.sfx('chime', { volume: 0.45 }); }
    else if (row.key === 'petKind') { this.pet.kind = v; if (Object.values(PET_NAMES).flat().includes(this.pet.name) || !this.pet.name) this.pet.name = PET_NAMES[v][0]; }
    else if (row.key === 'petColor') this.pet.color = v;
    else this.look[row.key] = v;
    this.game.creatorChanged(this);
  }

  step(row, dir) {
    const list = row.list;
    const i = list.indexOf(this.value(row));
    this.setValue(row, list[(i + dir + list.length) % list.length]);
    audio.sfx('select', { volume: 0.5 });
  }

  setTab(i) {
    const n = this.tabs.length;
    this.tab = ((i % n) + n) % n;
    audio.sfx('page', { volume: 0.5 });
  }

  randomize() {
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    for (const tab of this.tabs) for (const row of tab.rows) {
      if (!row.list || row.key === 'cls') continue;       // (a surprise look, not a surprise hero)
      if (row.key === 'facial') { this.look.facial = Math.random() < 0.15 ? pick(row.list) : 'none'; continue; }
      if (row.key === 'hat') { this.look.hat = Math.random() < 0.5 ? 'none' : pick(row.list); continue; }
      if (row.key === 'acc') { this.look.acc = Math.random() < 0.6 ? 'none' : pick(row.list); continue; }
      if (row.key === 'skin') { this.look.skin = pick(row.list.slice(0, 6)); continue; }
      if (row.key === 'petKind') { this.pet.kind = pick(row.list); continue; }
      if (row.key === 'petColor') { this.pet.color = pick(row.list); continue; }
      this.look[row.key] = pick(row.list);
    }
    if (this.mode === 'new') {
      if (!this.petTyped) this.pet.name = pick(PET_NAMES[this.pet.kind]);
      if (!this.nameTyped) this.name = randomName(getLang(), [this.name]);
    }
    this.syncFields();
    audio.sfx('sparkle');
    this.game.creatorChanged(this);
  }

  // the dice: a nickname out of the hat, a pet’s name out of its kind’s
  rollName() { this.name = randomName(getLang(), [this.name]); this.nameTyped = false; this.nameNudge = 0; this.syncFields(); audio.sfx('page'); }
  rollPet() {
    const names = PET_NAMES[this.pet.kind].filter((n) => n !== this.pet.name);
    this.pet.name = names[Math.floor(Math.random() * names.length)]; this.petTyped = false;
    this.syncFields(); audio.sfx('page');
  }

  // ---- a finger: the names are typed in real text fields laid over their rows
  get touch() { return !!this.game.input.touchMode; }
  field(key) {
    if (!this.fields) {
      const make = (k) => new TextField(this.game.display, {
        filter: typedName,
        onInput: (v) => {
          if (k === 'name') { this.name = v; this.nameTyped = !!v.trim(); if (v.trim()) this.nameNudge = 0; }
          else { this.pet.name = v; this.petTyped = !!v.trim(); }
        },
      });
      this.fields = { name: make('name'), petName: make('petName') };
      this.syncFields();
    }
    return this.fields[key];
  }
  syncFields() { if (this.fields) { this.fields.name.set(this.name); this.fields.petName.set(this.pet.name); } }
  hideFields() { if (this.fields) { this.fields.name.place(null); this.fields.petName.place(null); } }
  dispose() { if (this.fields) { this.fields.name.dispose(); this.fields.petName.dispose(); this.fields = null; } }

  textKey(e, row) {
    const field = row.key === 'name' ? 'name' : 'petName';
    let v = field === 'name' ? this.name : this.pet.name;
    if (e.key === 'Backspace') v = v.slice(0, -1);
    else if (e.key.length === 1 && /[\p{L}\p{N} '\-]/u.test(e.key) && v.length < 12) v += e.key;
    else return false;
    if (field === 'name') { this.name = v; this.nameTyped = !!v.trim(); } else { this.pet.name = v; this.petTyped = !!v.trim(); }
    this.syncFields();
    audio.sfx('typewriter', { volume: 0.4 });
    return true;
  }

  update(dt, input) {
    this.t += dt;
    if (this.nameNudge > 0) this.nameNudge -= dt;
    // the on-screen keyboard, while it's up (a name typed with a gamepad or the phone)
    if (this.osk) {
      input.textHandler = null;
      this.osk.update(dt, input);
      if (this.osk.done) {
        const v = this.osk.v.trim(), name = this.osk.field === 'name';
        // (a name left as the die gave it stays the dice’s)
        if (name) { if (v !== this.name) this.nameTyped = !this.osk.diced; this.name = v; } else { if (v !== this.pet.name) this.petTyped = true; this.pet.name = v; }
        this.syncFields();
      }
      if (this.osk.done || this.osk.back) { this.osk = null; input.consume(); }
      return;
    }
    const items = this.items();
    if (this.sel >= items.length) this.sel = items.length - 1;
    const cur = items[this.sel];
    // text fields swallow printable keys (so typing "w" or "a" doesn't move)
    input.textHandler = cur && cur.type === 'text' ? (e) => ((e.key.length === 1 || e.key === 'Backspace') ? this.textKey(e, cur) : false) : null;
    if (input.repeat('up')) { this.sel = (this.sel + items.length - 1) % items.length; audio.sfx('select', { volume: 0.4 }); }
    if (input.repeat('down')) { this.sel = (this.sel + 1) % items.length; audio.sfx('select', { volume: 0.4 }); }
    if (input.pressed('hotPrev')) this.setTab(this.tab - 1);
    if (input.pressed('hotNext')) this.setTab(this.tab + 1);
    const r = this.items()[this.sel];
    if (r.type === 'tabs') {
      if (input.repeat('left')) this.setTab(this.tab - 1);
      if (input.repeat('right')) this.setTab(this.tab + 1);
    } else if (r.list) {
      if (input.repeat('left')) this.step(r, -1);
      if (input.repeat('right')) this.step(r, 1);
    }
    if (input.pressed('interact') && !(r.type === 'text' && input.keys.has('Space'))) {
      input.consume('interact');
      this.activate(r);
    }
    // (a new hero isn't thrown away by one stray key: back to the title takes a second press)
    // (the wardrobe also closes with the phone's Close, which says « menu »)
    if (input.pressed('cancel') || (this.mode !== 'new' && input.pressed('menu') && !input.textHandler)) {
      input.consume();
      if (this.mode !== 'new') { this.finish(); input.textHandler = null; return; }
      if (this.backAsk && this.t < this.backAsk) { this.back = true; input.textHandler = null; return; }
      this.backAsk = this.t + 3; audio.sfx('select');
    }
    // mouse
    if (this.hit) {
      for (const h of this.hit) {
        if (!input.mouseIn(h.x, h.y, h.w, h.h)) continue;
        if (input.mouse.moved && h.sel !== undefined) this.sel = h.sel;
        if (input.mouse.pressed) {
          input.mouse.pressed = false;
          if (h.fn) { h.fn(); break; }
          if (h.tab !== undefined) { this.setTab(h.tab); this.sel = 0; break; }
          if (h.sel !== undefined) this.sel = h.sel;
          const row = this.items()[this.sel];
          if (h.arrow) this.step(row, h.arrow);
          else if (row.list) this.step(row, 1);
          else this.activate(row);
          break;
        }
      }
    }
    // drag to spin the preview
    const S = this.spinRect;
    const inSpin = S ? input.mouseIn(S.x, S.y, S.w, S.h) : input.mouse.x < (this.panelX ?? this.game.display.w * 0.5) && input.mouse.y < (this.panelY ?? this.game.display.h);
    if (input.mouse.down && inSpin) this.spin += (input.mouse.x - (this.lastMx ?? input.mouse.x)) * 0.06;
    this.lastMx = input.mouse.x;
    this.spin += dt * 0.22;
  }

  activate(r) {
    // no keyboard in your hands (a gamepad, the phone): the letters on the screen
    if (r.type === 'text' && (device() === 'pad' || device() === 'phone')) { this.typeName(r.key === 'name' ? 'name' : 'petName'); return; }
    // a finger: the real field over the row (its own tap opens the phone’s keyboard)
    if (r.type === 'text' && this.touch) { this.field(r.key === 'name' ? 'name' : 'petName').focus(); return; }
    if (r.key === 'random') this.randomize();
    else if (r.key === 'back') { if (this.touch) this.askBack(); else this.back = true; }
    else if (r.key === 'done') this.finish();
    else if (r.type === 'tabs') this.setTab(this.tab + 1);
    else if (r.list) this.step(r, 1);
  }

  // (a new hero isn’t thrown away by one stray tap either: the back arrow asks twice)
  askBack() {
    if (this.backAsk && this.t < this.backAsk) { this.back = true; this.game.input.textHandler = null; return; }
    this.backAsk = this.t + 3; audio.sfx('select');
  }

  typeName(field) {
    this.osk = new Osk(field === 'name' ? this.name : this.pet.name, { title: field === 'name' ? 'What’s your name?' : 'Your pet’s name?' });
    this.osk.field = field;
    audio.sfx('open');
  }

  finish() {
    if (this.mode === 'new' && !this.name.trim()) {
      this.sel = 1; this.nameNudge = 2.5;
      audio.sfx('error');
      // (with a gamepad: straight to the letters)
      if (device() === 'pad' || device() === 'phone') this.typeName('name');
      return;
    }
    audio.sfx('confirm');
    this.game.input.textHandler = null;
    this.done = { look: { ...this.look }, name: this.name.trim(), pet: { ...this.pet, name: this.pet.name.trim() || 'Mochi' }, cls: this.cls };
  }

  // ---- the hero tab: the preview holds the weapon and shows how it fights
  // (the arm's pose, for the 3D preview; `fx`: what flies from the hand, for draw())
  demo(dt) {
    if (!this.onHero()) { this.fx = null; return {}; }
    const C = CLASSES[this.cls], A = C.light[0], lute = C.weapon === 'lute';
    this.demoT += dt;
    const cyc = this.demoT % 1.7, t0 = 0.35;
    const k = cyc - t0, busy = k >= 0 && k < A.windup + (A.recover || 0.2) + 0.1;
    this.fx = k >= A.windup && k < A.windup + 0.45 ? { kind: A.kind, look: A.look, pose: A.pose, t: k - A.windup, color: C.color } : null;
    return { armPose: busy ? poseAt(A, k) : lute ? -0.7 : undefined, armPoseL: lute ? -0.9 : undefined };
  }

  // the hero's card under its row: icon, weapon & role, what it does, its moves, four bars
  drawHeroCard(ctx, x, y, w, bottom) {
    const C = CLASSES[this.cls], I = C.icons || {};
    // icon in the hero's colours
    ctx.fillStyle = C.color; ctx.fillRect(x, y, 30, 30);
    ctx.fillStyle = '#fff7e6'; ctx.fillRect(x + 2, y + 2, 26, 26);
    drawClassIcon(ctx, this.cls, x + 3, y + 3, 2);
    const tx = x + 36, tw = w - 36;
    drawText(ctx, fitText(t(C.role), tw), tx, y, { color: '#8a5234' });
    const lines = wrap(t(C.desc), tw).slice(0, 3);
    lines.forEach((l, i) => drawText(ctx, l, tx, y + 11 + i * 9, { color: UI.inkSoft }));
    let yy = y + Math.max(34, 13 + lines.length * 9);
    // the moves: light, heavy (hold), special, dodge — with the buttons that do them
    const sp = C.special, moves = [[I.light, ctl('interact')], [I.heavy, ctl('interact') + '+'], [I.special, ctl('special')], [DODGE_ICON, ctl('dodge')]];
    if (yy + 30 <= bottom) {
      moves.forEach(([ic, key], i) => {
        const mx = x + i * 24;
        drawIcon(ctx, ic, mx, yy);
        if (device() !== 'touch') drawText(ctx, fitText(key, 23), mx + 9, yy + 20, { color: '#b8a080', align: 'center' });   // (a finger has its own round buttons)
      });
      const nx = x + 100, nw = w - 100;
      drawText(ctx, fitText(t(C.heavy.name), nw), nx, yy + 1, { color: UI.ink });
      drawText(ctx, fitText(t(sp.name), nw), nx, yy + 11, { color: UI.ink });
      yy += 31;
    }
    // four bars
    const keys = Object.keys(STAT_NAMES), half = Math.floor(w / 2);
    keys.forEach((k, i) => {
      const sx = x + (i % 2) * half, sy = yy + Math.floor(i / 2) * 10;
      if (sy + 8 > bottom) return;
      const v = (C.stats && C.stats[k]) || 1, lw = half - 40;
      drawText(ctx, fitText(t(STAT_NAMES[k]), lw), sx, sy, { color: UI.inkSoft });
      // (full pips in the hero's colour, empty ones hollow)
      for (let p = 0; p < 5; p++) {
        const qx = sx + lw + 2 + p * 7;
        ctx.fillStyle = p < v ? '#3b2a22' : '#c9b08a'; ctx.fillRect(qx, sy, 6, 7);
        ctx.fillStyle = p < v ? C.color : '#f6ead0'; ctx.fillRect(qx + 1, sy + 1, 4, 5);
        if (p < v) { ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(qx + 1, sy + 1, 4, 1); }
      }
    });
  }

  // what flies from the hand in the demo (the hand's place on screen: game.drawCreator)
  drawDemoFx(ctx) {
    const f = this.fx, h = this.handAt;
    if (!f || !h) return;
    const dir = h.dir || -1;
    if (f.kind === 'melee') {
      // a white swoosh round the swing
      const a = 1 - f.t / 0.45, r = 16;
      ctx.globalAlpha = Math.max(0, a);
      ctx.fillStyle = '#fff7e6';
      for (let i = 0; i < 12; i++) { const an = -1.2 + (i / 11) * 2.2; ctx.fillRect(Math.round(h.x + dir * Math.cos(an) * r), Math.round(h.y - 6 + Math.sin(an) * r * 0.7), 2, 2); }
      ctx.globalAlpha = 1;
      return;
    }
    // a star, an acorn, a note: it flies away from the hand
    const x = Math.round(h.x + dir * (14 + f.t * 170)), y = Math.round(h.y - 8 - Math.sin(f.t * 9) * (f.look === 'note' || f.look === 'note2' ? 4 : 0));
    ctx.globalAlpha = Math.max(0, 1 - f.t / 0.45);
    const glyph = f.look === 'star' ? '★' : f.look === 'note' || f.look === 'note2' ? '♪' : null;
    if (glyph) drawText(ctx, glyph, x, y - 4, { color: f.color, align: 'center', outline: '#3b2a2e', scale: 2 });
    else { ctx.fillStyle = '#3b2a2e'; ctx.fillRect(x - 3, y - 3, 7, 7); ctx.fillStyle = '#c8864a'; ctx.fillRect(x - 2, y - 1, 5, 4); ctx.fillStyle = '#6b4330'; ctx.fillRect(x - 2, y - 2, 5, 2); }
    ctx.globalAlpha = 1;
  }

  draw(ctx) {
    if (this.touch) { this.drawTouch(ctx); return; }
    this.spinRect = null;
    this.hideFields();
    const W = this.game.display.w, H = this.game.display.h;
    const portrait = this.game.display.portrait;
    // landscape: panel on the right · portrait (phones): panel along the bottom
    const pw = portrait ? W - 12 : Math.round(Math.min(236, Math.max(186, W * 0.44)));
    const ph = portrait ? Math.min(Math.round(H * 0.58), 240) : Math.min(H - 12, 236);
    const px = portrait ? 6 : W - pw - 6, py = portrait ? H - ph - 6 : Math.round((H - ph) / 2);
    this.panelX = portrait ? W : px;
    this.panelY = portrait ? py : H;
    panel(ctx, px, py, pw, ph);
    const items = this.items();
    this.hit = [];
    let y = py + 8;
    drawText(ctx, t(this.mode === 'new' ? 'Create your character' : 'Wardrobe'), px + pw / 2, y, { color: '#8a5234', align: 'center' });
    y += 13;
    // tab bar: equal tabs, widened for long (French) names
    const tabSel = this.sel === 0;
    let names = this.tabs.map((tb) => (tb.ctx ? tc(tb.name, tb.ctx) : t(tb.name)));
    const need = names.map((n) => measure(n) + 6);
    const spare = pw - 16 - need.reduce((a, b) => a + b, 0);
    const even = Math.floor((pw - 16) / this.tabs.length);
    let widths = need.every((n) => n <= even) ? names.map(() => even) : need.map((n) => n + Math.floor(Math.max(0, spare) / names.length));
    // (still too wide — Spanish, German…: tighter tabs, then shortened names)
    if (spare < 0) {
      const tight = names.map((n) => measure(n) + 3), left = pw - 16 - tight.reduce((a, b) => a + b, 0);
      if (left >= 0) widths = tight.map((n) => n + Math.floor(left / names.length));
      else { widths = names.map(() => even); names = names.map((n) => fitText(n, even - 4)); }
    }
    let tx = px + 8;
    names.forEach((name, i) => {
      const tabW = widths[i];
      const on = i === this.tab;
      ctx.fillStyle = on ? '#e0a526' : tabSel ? '#dcc294' : '#e9d6b0';
      ctx.fillRect(tx, y, tabW - 2, 12);
      if (on) { ctx.fillStyle = '#f6d38f'; ctx.fillRect(tx, y, tabW - 2, 1); }
      drawText(ctx, name, tx + (tabW - 2) / 2, y + 2, { color: on ? '#3b2a2e' : '#6b4330', align: 'center' });
      this.hit.push({ x: tx, y, w: tabW - 2, h: 12, tab: i, sel: 0 });
      tx += tabW;
    });
    if (tabSel) { ctx.fillStyle = '#c8454f'; ctx.fillRect(px + 8, y + 13, pw - 16, 1); }
    y += 18;
    // rows
    const rowH = 14;
    const vx = px + Math.round(pw * 0.6);
    items.forEach((r, i) => {
      if (r.type === 'tabs' || r.type === 'button') return;
      const on = i === this.sel;
      if (on) { ctx.fillStyle = UI.sel; ctx.fillRect(px + 6, y - 3, pw - 12, rowH); }
      drawText(ctx, fitText(t(r.label), vx - 33 - (px + 10)), px + 10, y, { color: UI.ink });
      if (r.type === 'text') {
        const v = r.key === 'name' ? this.name : this.pet.name;
        const caret = on && Math.floor(this.t * 2) % 2 ? '_' : '';
        // (your name: a die at its end — a click, a nickname out of the hat)
        const dice = r.key === 'name' ? 13 : 0;
        const fx = vx - 30, fw = px + pw - 10 - fx - dice;
        if (dice) {
          diceButton(ctx, fx + fw + 2, y - 2, 11, 11);
          this.hit.push({ x: fx + fw + 1, y: y - 3, w: 13, h: rowH, fn: () => this.rollName() });
        }
        ctx.fillStyle = this.nameNudge > 0 && r.key === 'name' ? '#f7c9c0' : '#efdfc0';
        ctx.fillRect(fx, y - 2, fw, 11);
        ctx.fillStyle = '#c9a77c'; ctx.fillRect(fx, y + 8, fw, 1);
        const empty = device() === 'pad' || device() === 'phone' ? t('{a}: type', { a: ctl('interact') }) : t('type here…');
        drawText(ctx, fitText(v || (on && empty === t('type here…') ? '' : empty), fw - 8) + (device() === 'keys' ? caret : ''), fx + 3, y, { color: v ? UI.ink : '#b8a080' });
      } else {
        const v = this.value(r);
        const lx = vx - 30, rx = px + pw - 14;
        drawText(ctx, '◂', lx, y, { color: on ? '#c8454f' : '#c9a77c' });
        drawText(ctx, '▸', rx, y, { color: on ? '#c8454f' : '#c9a77c' });
        this.hit.push({ x: lx - 3, y: y - 3, w: 11, h: rowH, sel: i, arrow: -1 });
        this.hit.push({ x: rx - 3, y: y - 3, w: 11, h: rowH, sel: i, arrow: 1 });
        const mid = (lx + rx + 3) / 2;
        if (r.type === 'color' || r.type === 'petcolor') {
          const col = r.type === 'petcolor' ? PET_COLORS[v] : findColor(r.key, v);
          ctx.fillStyle = '#5a3b2a'; ctx.fillRect(mid - 13, y - 1, 26, 9);
          ctx.fillStyle = col || '#fff'; ctx.fillRect(mid - 12, y, 24, 7);
          ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(mid - 12, y, 24, 1);
        } else drawText(ctx, fitText(r.names[v] ? t(r.names[v]) : v, rx - lx - 8), mid, y, { color: UI.inkSoft, align: 'center' });
      }
      this.hit.push({ x: px + 6, y: y - 3, w: pw - 12, h: rowH, sel: i });
      y += rowH;
    });
    // pinned buttons
    const by = py + ph - 49;
    if (this.onHero()) this.drawHeroCard(ctx, px + 10, y + 3, pw - 20, by - 8);
    if (this.nameNudge > 0 && !this.onHero()) drawText(ctx, fitText(t('Please type a name first ♥'), pw - 12), px + pw / 2, y + 2, { color: '#c8454f', align: 'center' });
    const nRandom = items.findIndex((r) => r.key === 'random'), nDone = items.findIndex((r) => r.key === 'done');
    ctx.fillStyle = '#e9d6b0'; ctx.fillRect(px + 6, by - 6, pw - 12, 1);
    button(ctx, px + 10, by, pw - 20, 14, t('★ Surprise me'), { hot: this.sel === nRandom });
    button(ctx, px + 10, by + 17, pw - 20, 14, t(items[nDone].label), { hot: this.sel === nDone, color: '#4f955a' });
    this.hit.push({ x: px + 10, y: by, w: pw - 20, h: 14, sel: nRandom }, { x: px + 10, y: by + 17, w: pw - 20, h: 14, sel: nDone });
    const hint = this.game.input.touchMode ? t('tap to choose · tap arrows to change') : t('↑↓ choose · ←→ change · {prev}/{next} tabs', { prev: ctl('hotPrev'), next: ctl('hotNext') });
    drawText(ctx, fitText(hint, pw - 8), px + pw / 2, py + ph - 14, { color: '#b8a080', align: 'center' });
    if (this.mode === 'new') {
      drawText(ctx, fitText(t('Who will come home to Marigold Cove?'), W - 20), 10, 10, { color: '#fff7e6', shadow: '#2a1f33' });
      const back = items.findIndex((r) => r.key === 'back'), bw = Math.min(W - 20, measure(t('Back to title')) + 18);
      const asking = this.backAsk && this.t < this.backAsk;
      button(ctx, 10, 24, bw, 15, t('Back to title'), { hot: this.sel === back || asking });
      if (asking) drawText(ctx, fitText(t('Press again to leave — this hero won’t be kept'), W - bw - 30), bw + 16, 28, { color: '#ffd66b', shadow: '#2a1f33' });
      this.hit.push({ x: 10, y: 24, w: bw, h: 15, sel: back });
      drawText(ctx, t('drag to spin'), 10, (portrait ? py : H) - 16, { color: '#fff7e6', shadow: '#2a1f33' });
    }
    this.drawDemoFx(ctx);
    if (this.osk) this.osk.draw(ctx, W, H);
  }

  // ---- a finger’s layout (a phone, a tablet): rows and buttons a thumb can’t miss, the name
  // first and in a real text field, tabs that wrap rather than shrink. Its boxes, in UI pixels
  // (`view`: the room left free, where game.drawCreator stands the hero)
  touchLayout() {
    const d = this.game.display, W = d.w, H = d.h, isNew = this.mode === 'new';
    const names = this.tabs.map((tb) => (tb.ctx ? tc(tb.name, tb.ctx) : t(tb.name))), n = names.length;
    const title = t(isNew ? 'Create your character' : 'Wardrobe');
    const maxRows = Math.max(...this.tabs.map((tb) => tb.rows.length));
    const L = { W, H, names, portrait: d.portrait, isNew };
    // the tabs on rows of `cols`, their names at `scale`
    const grid = (inner, cols, scale) => {
      const cw = Math.floor((inner - (cols - 1) * 2) / cols), rows = Math.ceil(n / cols), th = scale === 2 ? 22 : 20;
      return { cols, rows, scale, cw, th, h: rows * th + (rows - 1) * 2, fits: names.every((nm) => measure(nm, scale) <= cw - 5 * scale) };
    };
    const split = n === 4 ? [4, 2] : [3, 2];
    if (d.portrait) {
      const px = 6, pw = W - 12, inner = pw - 16;
      // the top card: [←] and the title, big; under them, your name
      const T = bigLines(title, inner - (isNew ? 26 : 0), 2), th = Math.max(T.h, isNew ? 20 : 0);
      L.top = { x: px, y: 4, w: pw, h: 7 + th + (isNew ? 5 + 26 : 0) + 7, T, th };
      const topEnd = L.top.y + L.top.h;
      // (the rows’ space: six of them, or the hero’s card under its row)
      const body = (rowH) => Math.max(maxRows * rowH, isNew ? rowH + 99 : 0);
      const panelH = (g, rowH, stack) => 7 + g.h + 5 + body(rowH) + 6 + (stack ? 56 : 26) + 7;
      // (the room left to the hero: under the top card — or, for the wardrobe, whose hero stands in
      // the world at mid-screen, between that hero’s feet and the panel, counted alike)
      const free = (g, rowH, stack) => H - 6 - panelH(g, rowH, stack) - (isNew ? topEnd : Math.round(H / 2) + 14 - 104);
      const all = [...split.map((c) => grid(inner, c, 2)), grid(inner, n, 1), ...split.map((c) => grid(inner, c, 1))].filter((g) => g.fits);
      if (!all.length) all.push(grid(inner, 2, 1));
      // (the first that leaves the hero room to stand; failing that, the flattest)
      const g = all.find((q) => free(q, 20, false) >= 104) || all.reduce((a, b) => (b.h < a.h ? b : a));
      // (room to spare: the two buttons one above the other, their words big; then taller rows)
      const stack = free(g, 20, true) >= 130, spare = free(g, 20, stack) - 140;
      const rowH = spare > 0 ? Math.min(26, 20 + Math.floor(spare / maxRows)) : 20;
      const ph = panelH(g, rowH, stack);
      L.panel = { x: px, y: H - 6 - ph, w: pw, h: ph };
      L.name = isNew ? { x: px + 8, y: L.top.y + 7 + th + 5, w: inner, h: 26 } : null;
      L.tabs = { x: px + 8, y: L.panel.y + 7, g };
      L.rows = { x: px + 8, y: L.tabs.y + g.h + 5, w: inner, rowH, h: body(rowH) };
      L.buttons = { x: px + 8, y: L.rows.y + L.rows.h + 6, w: inner, h: 26, stack };
      L.view = { x: 0, y: topEnd, w: W, h: L.panel.y - topEnd };
      // (room left over the hero: « Your name » on a line of its own, big, over a field as wide as the card)
      if (isNew && L.view.h >= 174) { L.top.h += 21; L.name.y += 21; L.name.above = true; L.view.y += 21; L.view.h -= 21; }
    } else {
      // on its side: the room on the left, a wide panel on the right — your name at its top
      const pw = Math.round(Math.max(250, Math.min(330, W * 0.6))), px = W - pw - 6, inner = pw - 16, ph = H - 8, head = isNew ? 30 : 0;
      const need = (g) => 6 + head + g.h + 5 + maxRows * 20 + 6 + 24 + 6;
      const g = [grid(inner, n, 1), ...split.map((c) => grid(inner, c, 1))].find((q) => q.fits && need(q) <= ph) || grid(inner, n, 1);
      const rowH = Math.max(20, Math.min(24, Math.floor((ph - need(g)) / maxRows) + 20));
      L.panel = { x: px, y: 4, w: pw, h: ph };
      L.name = isNew ? { x: px + 8, y: 10, w: inner, h: 26 } : null;
      L.tabs = { x: px + 8, y: 10 + head, g };
      L.rows = { x: px + 8, y: L.tabs.y + g.h + 5, w: inner, rowH, h: maxRows * rowH };
      L.buttons = { x: px + 8, y: 4 + ph - 6 - 24, w: inner, h: 24, stack: false };
      const T = bigLines(title, px - 12 - (isNew ? 26 : 0), 2), th = Math.max(T.h, isNew ? 20 : 0);
      L.top = { x: 6, y: 5, w: px - 12, h: th + 3, T, th, bare: true };
      L.view = { x: 0, y: L.top.y + L.top.h, w: px, h: H - L.top.y - L.top.h };
    }
    // the two buttons’ words: both big when both fit (« Begin your story → », else the short one), else both plain
    const B = L.buttons, long = t(isNew ? 'Begin your story →' : 'Done'), short = isNew ? t('Begin →') : long;
    B.surprise = t('★ Surprise me');
    const s2 = measure(B.surprise, 2) + 12, room = B.stack ? B.w : B.w - s2 - 4, big = s2 <= B.w && [long, short].find((l) => measure(l, 2) + 12 <= room);
    B.scale = big ? 2 : 1;
    B.sw = B.stack ? B.w : big ? s2 + Math.floor((room - measure(big, 2) - 12) * 0.4) : Math.max(Math.round(B.w * 0.4), measure(B.surprise) + 14);
    B.begin = big || (measure(long) + 14 <= (B.stack ? B.w : B.w - B.sw - 4) ? long : short);
    return L;
  }

  // label · the real field · its die (`N`: the row’s box)
  nameRow(ctx, N, key, label, placed) {
    const lw = label && !N.above ? measure(label) + 6 : 0, fx = N.x + lw, fw = N.w - lw - N.h - 4;
    if (N.above) drawText(ctx, fitText(label, N.w, 2), N.x, N.y - 18, { color: UI.ink, scale: 2 });
    else if (label) drawText(ctx, label, N.x, N.y + Math.round((N.h - 9) / 2) + 1, { color: UI.ink });
    // (under the field: its paper and the name in the game’s own letters — what a picture of the canvas keeps)
    const v = key === 'name' ? this.name : this.pet.name, nudge = key === 'name' && this.nameNudge > 0;
    ctx.fillStyle = '#8e5d3e'; ctx.fillRect(fx, N.y, fw, N.h);
    ctx.fillStyle = nudge ? '#f7c9c0' : '#fff8ea'; ctx.fillRect(fx + 2, N.y + 2, fw - 4, N.h - 4);
    const s = N.h >= 22 ? fitScale(v, fw - 12) : 1;
    drawText(ctx, v ? fitText(v, fw - 12, s) : t('type here…'), fx + 6, N.y + Math.round((N.h - 9 * s) / 2) + s, { color: v ? UI.ink : '#a8927a', scale: v ? s : 1 });
    const f = this.field(key);
    f.placeholder = t('type here…');
    f.nudge(nudge);
    f.place(this.osk ? null : { x: fx, y: N.y, w: fw, h: N.h });
    placed.add(key);
    diceButton(ctx, fx + fw + 4, N.y, N.h, N.h);
    this.hit.push({ x: fx + fw + 2, y: N.y - 2, w: N.h + 4, h: N.h + 4, fn: () => (key === 'name' ? this.rollName() : this.rollPet()) });
  }

  // a row for a thumb: its label, then ◂ value ▸ on buttons
  touchRow(ctx, r, i, x, y, w, h, on, placed, vs = 1) {
    if (on) { ctx.fillStyle = UI.sel; ctx.fillRect(x - 2, y, w + 4, h - 1); }
    const lw = Math.round(w * 0.36), vx = x + lw, vw = w - lw, bh = h - 2, ty = y + Math.round((h - 9) / 2) + 1;
    const lab = h >= 22 ? splitTwo(t(r.label), lw - 4) : [t(r.label)];
    if (lab.length > 1) lab.forEach((l, k) => drawText(ctx, fitText(l, lw - 4), x, y + Math.round(h / 2) - 9 + k * 9, { color: UI.ink }));
    else drawText(ctx, fitText(lab[0], lw - 4), x, ty, { color: UI.ink });
    if (r.type === 'text') { this.nameRow(ctx, { x: vx, y: y + 1, w: vw, h: bh }, 'petName', '', placed); this.hit.push({ x, y, w: lw, h, sel: i }); return; }
    arrowButton(ctx, vx, y + 1, 20, bh, -1);
    arrowButton(ctx, vx + vw - 20, y + 1, 20, bh, 1);
    const mx = vx + 22, mw = vw - 44, v = this.value(r);
    ctx.fillStyle = '#f3e3c3'; ctx.fillRect(mx, y + 1, mw, bh);
    if (r.type === 'color' || r.type === 'petcolor') {
      ctx.fillStyle = '#5a3b2a'; ctx.fillRect(mx + 5, y + 5, mw - 10, bh - 8);
      ctx.fillStyle = (r.type === 'petcolor' ? PET_COLORS[v] : findColor(r.key, v)) || '#fff'; ctx.fillRect(mx + 6, y + 6, mw - 12, bh - 10);
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(mx + 6, y + 6, mw - 12, 1);
    } else drawText(ctx, fitText(r.names[v] ? t(r.names[v]) : v, mw - 6, vs), mx + mw / 2, y + Math.round((h - 9 * vs) / 2) + vs, { color: UI.ink, align: 'center', scale: vs });
    // (a thumb’s width each side: back, on — the rest of the row: on)
    this.hit.push({ x: vx - 4, y, w: 28, h, sel: i, arrow: -1 }, { x: vx + vw - 24, y, w: 28, h, sel: i, arrow: 1 }, { x, y, w, h, sel: i });
  }

  drawTouch(ctx) {
    const L = this.touchLayout(), { W, H, isNew } = L, items = this.items(), placed = new Set();
    const cursor = device() !== 'touch';         // (a keyboard or a gamepad on a touch screen: where it stands)
    const asking = this.backAsk && this.t < this.backAsk;
    this.hit = [];
    this.spinRect = L.view;
    this.panelX = L.portrait ? W : L.panel.x; this.panelY = L.portrait ? L.panel.y : H;
    // ---- [←] the title
    const T = L.top, tx0 = T.x + (T.bare ? 0 : 8), ty0 = T.y + (T.bare ? 0 : 7);
    if (!T.bare) panel(ctx, T.x, T.y, T.w, T.h);
    if (isNew) {
      bigButton(ctx, tx0, ty0, 22, 20, '←', { hot: asking || (cursor && this.sel === items.findIndex((r) => r.key === 'back')), scale: 2 });
      this.hit.push({ x: tx0 - 5, y: ty0 - 5, w: 32, h: 30, fn: () => this.askBack() });
    }
    drawLines(ctx, T.T, tx0 + (isNew ? 26 : 0), ty0 + Math.floor((T.th - T.T.h) / 2), T.bare ? { color: '#fff7e6', outline: '#2a1f33' } : { color: '#8a5234' });
    // ---- the panel: your name (on its side), the tabs, the rows, the two buttons
    panel(ctx, L.panel.x, L.panel.y, L.panel.w, L.panel.h);
    if (L.name) this.nameRow(ctx, L.name, 'name', t('Your name'), placed);
    const G = L.tabs.g, tabSel = cursor && this.sel === 0;
    L.names.forEach((name, i) => {
      const x = L.tabs.x + (i % G.cols) * (G.cw + 2), y = L.tabs.y + Math.floor(i / G.cols) * (G.th + 2), on = i === this.tab;
      ctx.fillStyle = '#5a3b2a'; ctx.fillRect(x + 1, y, G.cw - 2, G.th); ctx.fillRect(x, y + 1, G.cw, G.th - 2);
      ctx.fillStyle = on ? '#e0a526' : tabSel ? '#dcc294' : '#e9d6b0'; ctx.fillRect(x + 1, y + 1, G.cw - 2, G.th - 2);
      ctx.fillStyle = on ? '#f6d38f' : '#f3e6c8'; ctx.fillRect(x + 1, y + 1, G.cw - 2, 1);
      drawText(ctx, G.fits ? name : fitText(name, G.cw - 4, G.scale), x + G.cw / 2, y + Math.round((G.th - 9 * G.scale) / 2) + G.scale, { color: on ? '#3b2a2e' : '#6b4330', align: 'center', scale: G.scale });
      this.hit.push({ x, y: y - 1, w: G.cw + 2, h: G.th + 2, tab: i, sel: 0 });
    });
    const R = L.rows;
    // (the values big when every option of every row of the tab fits that way: a tab keeps one size)
    const mw = R.w - Math.round(R.w * 0.36) - 44 - 6;
    const vs = this.tabs[this.tab].rows.every((r) => !r.list || r.type !== 'list' || r.list.every((o) => measure(r.names[o] ? t(r.names[o]) : o, 2) <= mw)) ? 2 : 1;
    let y = R.y;
    items.forEach((r, i) => {
      if (r.type === 'tabs' || r.type === 'button' || r.key === 'name') return;
      // (a row with a real field in it: tall enough for its letters)
      const h = r.type === 'text' ? Math.max(R.rowH, 28) : R.rowH;
      this.touchRow(ctx, r, i, R.x, y, R.w, h, cursor && i === this.sel, placed, vs);
      y += h;
    });
    if (this.onHero()) this.drawHeroCard(ctx, R.x + 2, y + 4, R.w - 4, R.y + R.h);
    const B = L.buttons, nRandom = items.findIndex((r) => r.key === 'random'), nDone = items.findIndex((r) => r.key === 'done');
    const bw = B.sw, dx = B.stack ? 0 : B.sw + 4, dy = B.stack ? B.h + 4 : 0;
    bigButton(ctx, B.x, B.y, bw, B.h, B.surprise, { hot: cursor && this.sel === nRandom, scale: B.scale });
    bigButton(ctx, B.x + dx, B.y + dy, B.w - dx, B.h, B.begin, { hot: cursor && this.sel === nDone, color: '#4f955a', scale: B.scale });
    this.hit.push({ x: B.x, y: B.y - 2, w: bw, h: B.h + 3, sel: nRandom }, { x: B.x + dx, y: B.y + dy - 1, w: B.w - dx, h: B.h + 3, sel: nDone });
    if (this.fields) for (const k of ['name', 'petName']) if (!placed.has(k)) this.fields[k].place(null);
    // ---- over the room: what the game has to say, and what a finger can do there
    const V = L.view, note = asking ? t('Press again to leave — this hero won’t be kept') : isNew && this.nameNudge > 0 ? t('Type your name, or tap the dice ♥') : '';
    if (note) {
      const N = bigLines(note, V.w - 24, 3);
      ctx.fillStyle = 'rgba(42,31,51,0.9)'; ctx.fillRect(V.x + 6, V.y + 4, V.w - 12, N.h + 10);
      drawLines(ctx, N, V.x + V.w / 2, V.y + 9, { color: asking ? '#ffd66b' : '#ffb9ae', align: 'center' });
    } else if (isNew) wrap(t('Slide to turn your hero'), V.w - 16).forEach((l, i, a) => drawText(ctx, l, V.x + V.w / 2, V.y + V.h - 4 - (a.length - i) * 11, { color: '#fff7e6', shadow: '#2a1f33', align: 'center' }));
    this.drawDemoFx(ctx);
    if (this.osk) this.osk.draw(ctx, W, H);
  }
}

function findColor(key, id) {
  const list = key === 'skin' ? SKIN : key === 'hairColor' ? HAIR_COLORS : key === 'eyes' ? EYE_COLORS : CLOTH_COLORS;
  const c = list.find((x) => x.id === id);
  return c ? c.m : '#fff';
}
