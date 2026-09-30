// The menus: the pause page (Esc · Start: resume, save, settings, back to the title), the
// Settings page (two tabs: the settings, the controls), and the tabbed book (Tab · Select): Bag,
// Journal, Friends, Collection, Map, Hero.

import { drawText, measure, wrap } from '../engine/font.js';
import { LANGS, t, tn, num } from '../i18n.js';
import { panel, button, heart, coinIcon, UI, tag, keyCap, moveKeys, fitText, splitTwo, tc, ctl, device } from './ui.js';
import { INTERIORS } from '../world/interiors.js';
import { CLASSES } from '../combat/classes.js';
import { drawIcon, itemIcon } from '../art/icons.js';
import { ITEMS } from '../data/items.js';
import { NPCS, NPC_ORDER } from '../data/npcs.js';
import { QUESTS } from '../story/story.js';
import { saveSettings, hearts, BAG_SIZE, HOTBAR } from '../state.js';
import { BUILDINGS, AREAS, OX, OZ, areaAt } from '../world/overworld.js';
import { FOG_CELL, fogSeen } from '../state.js';
import { SPECIES, SPECIES_ORDER } from '../systems/critters.js';
import { audio } from '../engine/audio.js';
import { dayLabel, timeLabel, HUD_MODES, HUD_NAMES } from './hud.js';
import { drawWorldPanel, MapView } from '../party/worldmap.js';
import { HeroTab } from '../solo/herotab.js';
import { DIFFS } from '../party/host.js';

const TABS = [['bag', 'Bag'], ['quests', 'Journal'], ['friends', 'Friends'], ['collection', 'Collection'], ['map', 'Map'], ['hero', 'Hero']];
const TABS_SHORT = ['Bag', 'Tasks', 'Pals', 'Finds', 'Map', 'Hero'];
const PAUSE = [['Resume', 'resume'], ['Save game', 'save'], ['Settings', 'settings'], ['Back to title', 'title']];
// the Settings page's tabs: its rows, and the Controls (ui/controls.js)
const SET_TABS = [['general', 'Settings'], ['controls', 'Controls']];
// (the hero seems stuck — entities/stuck.js: the way out comes first)
const UNSTUCK_ROW = ['Get unstuck', 'unstuck'];
const CATS = { tool: 'Tool', seed: 'Seeds', crop: 'Crop', forage: 'Forage', fish: 'Fish', junk: 'Junk', food: 'Food', key: 'Special', furniture: 'Furniture', decor: 'Decor', material: 'Material', critter: 'Critter' };
const COLLECT = ['fish_sardine', 'fish_mackerel', 'fish_crab', 'fish_puffer', 'fish_moonfin', 'fish_minnow', 'fish_trout', 'fish_carp', 'fish_koi', 'fish_goldfish',
  'fish_perch', 'fish_bass', 'fish_pike', 'fish_eel', 'fish_char', 'fish_icefin', 'fish_catfish', 'fish_seaweed', 'fish_boot',
  'turnip', 'carrot', 'strawberry', 'sunflower', 'pumpkin', 'moonbloom', 'berry', 'apple', 'mushroom', 'glowcap', 'shell', 'seaglass', 'starfish', 'feather',
  'daisy', 'poppy', 'bluebell', 'lavender', 'pinecone', 'firefly'];

export class Menu {
  constructor(world) {
    this.world = world;
    this.open = false;
    this.tab = 0;
    this.sel = 0;
    this.held = -1;
    this.t = 0;
    this.hero = new HeroTab(this);
    this.page = null;             // 'pause' · 'settings' (pages of their own), or the tabbed book
    this.from = null;             // (Settings opened from the pause page goes back to it)
    this.confirm = null;          // the pause page's « back to the title? »
    this.lastTab = 'bag';         // Tab / Select open the book where you left it
  }

  show(tab = 'bag') {
    this.open = true;
    this.page = tab === 'pause' || tab === 'settings' ? tab : null;
    this.from = null; this.confirm = null;
    this.setTab = 'general';
    if (!this.page) this.tab = Math.max(0, TABS.findIndex((t) => t[0] === tab));
    this.sel = 0; this.held = -1;
    this.mapView = null;            // (the map opens on the valley, or the world when you're out in it)
    this.worldView = new MapView(); // (the world map zoomed in: the wheel, F / C, a drag)
    if (tab === 'hero') this.hero.show();
    audio.sfx('open');
    audio.muffle(true);
  }

  showLast() { this.show(this.lastTab || 'bag'); }

  showTab(tab) {
    const i = TABS.findIndex((q) => q[0] === tab);
    if (this.page) { this.page = null; this.confirm = null; this.tab = Math.max(0, i); this.sel = 0; if (tab === 'hero') this.hero.show(); audio.sfx('page'); return; }
    if (i >= 0 && i !== this.tab) { this.tab = i; this.sel = 0; audio.sfx('page'); }
  }

  close() {
    if (!this.page) this.lastTab = TABS[this.tab][0];
    this.open = false;
    this.page = null; this.confirm = null;
    this.held = -1;
    audio.sfx('close');
    audio.muffle(false);
    this.world.input.consume();
    this.world.game.applySettings();
  }

  update(dt, input) {
    this.t += dt;
    const w = this.world, s = w.state;
    if (this.page === 'pause') { this.updatePause(input); return; }
    if (this.page === 'settings') { this.updateSettingsPage(input); return; }
    if (input.pressed('cancel') || input.pressed('menu') || input.pressed('pause')) {
      if (this.held >= 0) { this.held = -1; audio.sfx('cancel'); return; }
      this.close();
      return;
    }
    if (input.pressed('hotPrev')) { this.tab = (this.tab + TABS.length - 1) % TABS.length; this.sel = 0; audio.sfx('select'); }
    if (input.pressed('hotNext')) { this.tab = (this.tab + 1) % TABS.length; this.sel = 0; audio.sfx('select'); }
    if (this.closeRect && input.mouse.pressed && input.mouseIn(this.closeRect.x, this.closeRect.y, this.closeRect.w, this.closeRect.h)) { this.close(); return; }
    if (this.tabRects && input.mouse.pressed) {
      for (const r of this.tabRects) if (input.mouseIn(r.x, r.y, r.w, r.h)) { this.tab = r.i; this.sel = 0; audio.sfx('select'); input.mouse.pressed = false; }
    }
    const key = TABS[this.tab][0];
    if (key === 'bag') this.updateBag(input);
    else if (key === 'quests') this.updateList(input, this.questList().length, (i) => { const q = this.questList()[i]; if (q && !q.done) { s.flags.pick = q.id; if (!q.saga) s.flags.tracked = q.id; audio.sfx('confirm'); } });
    else if (key === 'friends') this.updateList(input, NPC_ORDER.length, () => {});
    else if (key === 'hero') this.hero.update(dt, input);
    else if (key === 'collection' && (input.pressed('interact') || (input.mouse.pressed && this.collTabs && this.collTabs.some((r) => input.mouseIn(r.x, r.y, r.w, r.h) && r.view !== (this.collView || 'items'))))) {
      input.consume('interact');
      this.collView = (this.collView || 'items') === 'items' ? 'critters' : 'items';
      audio.sfx('page');
    }
    else if (key === 'map' && this.mapViewNow() === 'world' && w.wild && w.wild.big && this.worldZoom(dt, input)) { /* the world map moved */ }
    else if (key === 'map' && (input.pressed('interact') || (input.mouse.pressed && this.mapRect && input.mouseIn(...this.mapRect) && this.mapViewNow() !== 'world'))) {
      input.consume('interact');
      // the valley, a closer look around you, and (once the wild lands are open) the whole world
      const views = w.wild && w.wild.big ? ['valley', 'close', 'world'] : ['valley', 'close'];
      this.mapView = views[(views.indexOf(this.mapViewNow()) + 1) % views.length];
      audio.sfx('page');
    }
    // clickable rows
    if (this.rowRects && key !== 'bag') {
      for (const r of this.rowRects) if (input.mouseIn(r.x, r.y, r.w, r.h)) {
        if (input.mouse.moved) this.sel = r.i;
        if (input.mouse.pressed) { this.sel = r.i; this.activateRow(key, input); }
      }
    }
  }

  activateRow(key, input) {
    if (key === 'quests') { const q = this.questList()[this.sel]; if (q && !q.done) { this.world.state.flags.pick = q.id; if (!q.saga) this.world.state.flags.tracked = q.id; audio.sfx('confirm'); } }
  }

  // ------------------------------------------------------------------ the pause page
  updatePause(input) {
    const C = this.confirm;
    // (B / Esc steps back; Start on a gamepad — pause without cancel — resumes at once)
    const back = input.pressed('cancel'), start = input.pressed('pause') && !back;
    const mouseOn = (r) => input.mouseIn(r.x, r.y, r.w, r.h);
    if (C) {
      if (back || start) { this.confirm = null; audio.sfx('cancel'); input.consume(); return; }
      if (input.repeat('left') || input.repeat('right') || input.repeat('up') || input.repeat('down')) { C.sel = 1 - C.sel; audio.sfx('select', { volume: 0.4 }); }
      for (const r of C.rects || []) if (mouseOn(r)) {
        if (input.mouse.moved) C.sel = r.i;
        if (input.mouse.pressed) { input.mouse.pressed = false; C.sel = r.i; this.pauseQuit(); return; }
      }
      if (input.pressed('interact')) { input.consume('interact'); this.pauseQuit(); }
      return;
    }
    if (back || start || (this.closeRect && input.mouse.pressed && mouseOn(this.closeRect))) { this.close(); return; }
    // (Tab / Select: over to the book)
    if (input.pressed('menu')) { input.consume('menu'); this.showTab(this.lastTab || 'bag'); return; }
    const PAUSE = this.pauseRows();
    if (input.repeat('up')) { this.sel = (this.sel + PAUSE.length - 1) % PAUSE.length; audio.sfx('select', { volume: 0.4 }); }
    if (input.repeat('down')) { this.sel = (this.sel + 1) % PAUSE.length; audio.sfx('select', { volume: 0.4 }); }
    for (const r of this.rowRects || []) if (mouseOn(r)) {
      if (input.mouse.moved && this.sel !== r.i) { this.sel = r.i; audio.sfx('select', { volume: 0.3 }); }
      if (input.mouse.pressed) { input.mouse.pressed = false; this.sel = r.i; this.pauseDo(PAUSE[r.i][1]); return; }
    }
    if (input.pressed('interact')) { input.consume('interact'); this.pauseDo(PAUSE[this.sel][1]); }
  }

  pauseRows() { return this.world.stuckOffer && this.world.player ? [UNSTUCK_ROW, ...PAUSE] : PAUSE; }

  pauseDo(k) {
    const w = this.world;
    if (k === 'resume') this.close();
    else if (k === 'unstuck') { this.close(); w.unstick(); if (w.stuckWatch) w.stuckWatch.reset(); w.stuckOffer = false; }
    else if (k === 'save') { const ok = w.save('manual'); this.savedFlash = ok ? this.t : -this.t; audio.sfx(ok ? 'confirm' : 'error'); }
    else if (k === 'settings') { this.page = 'settings'; this.from = 'pause'; this.setTab = 'general'; this.sel = 0; audio.sfx('page'); }
    else if (k === 'title') { this.confirm = { sel: 0 }; audio.sfx('select'); }
  }

  // « back to the title »: saved first, then a fade to the title screen (or not, after all)
  pauseQuit() {
    const w = this.world, C = this.confirm;
    if (!C || C.sel === 1) { this.confirm = null; audio.sfx('cancel'); return; }
    w.save('manual');
    audio.sfx('confirm');
    this.close();
    w.run(async () => { await w.fade(1, 0.35); w.game.toTitle(); });
  }

  // the Settings page: back to the pause page it came from (Start on a gamepad resumes)
  updateSettingsPage(input) {
    const back = input.pressed('cancel') || input.pressed('menu'), start = input.pressed('pause') && !input.pressed('cancel');
    if (back || start || (this.closeRect && input.mouse.pressed && input.mouseIn(this.closeRect.x, this.closeRect.y, this.closeRect.w, this.closeRect.h))) {
      if (this.from === 'pause' && !start) { this.page = 'pause'; this.from = null; this.sel = this.pauseRows().findIndex((r) => r[1] === 'settings'); audio.sfx('page'); input.consume(); return; }
      this.close();
      return;
    }
    const tabs = this.setTabRects || [], G = this.world.game;
    const hit = input.mouse.pressed && tabs.find((r) => input.mouseIn(r.x, r.y, r.w, r.h));
    const dir = input.pressed('hotPrev') ? -1 : input.pressed('hotNext') ? 1 : 0;
    if (hit || dir) {
      if (hit) input.mouse.pressed = false;
      const i = SET_TABS.findIndex((q) => q[0] === this.setTab), next = hit ? hit.id : SET_TABS[(i + dir + SET_TABS.length) % SET_TABS.length][0];
      if (next !== this.setTab) { this.setTab = next; this.sel = 0; if (next === 'controls') G.controls.reset(); audio.sfx('page'); }
      return;
    }
    if (this.setTab === 'controls') { G.controls.updateCards(1 / 60, input); return; }
    if (this.dragSliders(input)) return;
    this.updateSettings(input);
    for (const r of this.rowRects || []) if (input.mouseIn(r.x, r.y, r.w, r.h)) {
      if (input.mouse.moved) this.sel = r.i;
      if (input.mouse.pressed) { input.mouse.pressed = false; this.sel = r.i; this.changeSetting(1, true); }
    }
  }

  // the volume bars follow a click, a drag or a finger (5 % steps); true while one is held
  dragSliders(input) {
    const m = input.mouse, st = this.world.settings, bars = this.sliderRects || [];
    if (m.pressed) {
      const b = bars.find((r) => input.mouseIn(r.x - 6, r.y, r.w + 12, r.h));
      if (b) { this.dragging = b.key; this.sel = b.i; m.pressed = false; }
    }
    if (!this.dragging) return false;
    const b = bars.find((r) => r.key === this.dragging);
    if (b) {
      const v = Math.round(Math.max(0, Math.min(1, (m.x - b.x) / b.w)) * 20) / 20;
      if (v !== st[b.key]) { st[b.key] = v; this.world.game.applySettings(); if (b.key === 'sfx' && this.t - (this.tickT || 0) > 0.12) { this.tickT = this.t; audio.sfx('select', { volume: 0.5 }); } }
    }
    if (!m.down) { this.dragging = null; saveSettings(st); this.world.game.applySettings(); }
    return true;
  }

  updateList(input, n, onPick) {
    if (input.repeat('up')) { this.sel = Math.max(0, this.sel - 1); audio.sfx('select', { volume: 0.4 }); }
    if (input.repeat('down')) { this.sel = Math.min(n - 1, this.sel + 1); audio.sfx('select', { volume: 0.4 }); }
    if (input.pressed('interact')) { input.consume('interact'); onPick(this.sel); }
  }

  updateBag(input) {
    const s = this.world.state;
    const cols = 8;
    let moved = false;
    if (input.repeat('left')) { this.sel = (this.sel + BAG_SIZE - 1) % BAG_SIZE; moved = true; }
    if (input.repeat('right')) { this.sel = (this.sel + 1) % BAG_SIZE; moved = true; }
    if (input.repeat('up')) { this.sel = (this.sel + BAG_SIZE - cols) % BAG_SIZE; moved = true; }
    if (input.repeat('down')) { this.sel = (this.sel + cols) % BAG_SIZE; moved = true; }
    if (moved) audio.sfx('select', { volume: 0.4 });
    const pick = () => {
      if (this.held < 0) { if (s.bag[this.sel]) { this.held = this.sel; audio.sfx('select'); } }
      else {
        const a = s.bag[this.held]; s.bag[this.held] = s.bag[this.sel]; s.bag[this.sel] = a;
        this.held = -1;
        audio.sfx('place');
      }
    };
    if (input.pressed('interact')) { input.consume('interact'); pick(); }
    if (this.slotRects) for (const r of this.slotRects) if (input.mouseIn(r.x, r.y, r.w, r.h)) {
      if (input.mouse.moved) this.sel = r.i;
      if (input.mouse.pressed) { this.sel = r.i; pick(); input.mouse.pressed = false; }
    }
  }

  settingsRows() {
    const w = this.world, st = w.settings;
    const pct = (v) => `${Math.round(v * 100)}%`;
    return [
      ['Master volume', pct(st.master), 'master'],
      ['Music', pct(st.music), 'music'],
      ['Sound effects', pct(st.sfx), 'sfx'],
      ['Ambience', pct(st.ambient), 'ambient'],
      ['Day length', { 0.5: 'Relaxed (2×)', 1: 'Normal', 1.5: 'Brisk', 2: 'Quick' }[st.daySpeed] || 'Normal', 'daySpeed'],
      ['Text speed', { 0.6: 'Slow', 1: 'Normal', 1.8: 'Fast' }[st.textSpeed] || 'Normal', 'textSpeed'],
      ['Display', HUD_NAMES[w.hud.mode()], 'hud'],
      ['Adventure difficulty', (DIFFS[st.adventure] || DIFFS.normal).name, 'adventure'],
      ['Play with your phone', this.world.game.phone.connected ? 'Connected' : this.world.game.phone.net ? 'Waiting' : 'Not connected', 'phone'],
      ['Gamepad rumble', st.rumble === false ? 'Off' : 'On', 'rumble'],
      ['Pixel size', st.zoom < 0 ? 'Smaller' : st.zoom > 0 ? 'Bigger' : 'Auto', 'zoom'],
      ['Language', LANGS[st.lang] || 'English', 'lang'],
      ['Saves & backups', '', 'saves'],
      ...(this.world.player ? [['Get unstuck', '', 'unstuck']] : []),
    ];
  }

  updateSettings(input) {
    const rows = this.settingsRows();
    if (input.repeat('up')) { this.sel = Math.max(0, this.sel - 1); audio.sfx('select', { volume: 0.4 }); }
    if (input.repeat('down')) { this.sel = Math.min(rows.length - 1, this.sel + 1); audio.sfx('select', { volume: 0.4 }); }
    if (input.repeat('left')) this.changeSetting(-1);
    if (input.repeat('right')) this.changeSetting(1);
    if (input.pressed('interact')) { input.consume('interact'); this.changeSetting(1, true); }
  }

  changeSetting(dir, activate = false) {
    const w = this.world, st = w.settings;
    const key = this.settingsRows()[this.sel][2];
    const cycle = (arr, v) => arr[(arr.indexOf(v) + dir + arr.length) % arr.length] ?? arr[0];
    if (['master', 'music', 'sfx', 'ambient'].includes(key)) {
      st[key] = Math.round(Math.max(0, Math.min(1, st[key] + dir * 0.1)) * 10) / 10;
    } else if (key === 'daySpeed') st.daySpeed = cycle([0.5, 1, 1.5, 2], st.daySpeed);
    else if (key === 'textSpeed') st.textSpeed = cycle([0.6, 1, 1.8], st.textSpeed);
    else if (key === 'hud') { st.hud = cycle(HUD_MODES, w.hud.mode()); }
    else if (key === 'adventure') st.adventure = cycle(Object.keys(DIFFS), st.adventure || 'normal');
    else if (key === 'phone') { if (activate || dir) w.game.phone.openPanel(); return; }
    else if (key === 'rumble') { st.rumble = st.rumble === false; if (st.rumble) w.input.rumble(0.6, 0.4, 160); }
    else if (key === 'zoom') { st.zoom = cycle([-1, 0, 1], Math.max(-1, Math.min(1, st.zoom || 0))); w.game.applyZoom(); }
    else if (key === 'lang') st.lang = cycle(Object.keys(LANGS), st.lang);
    else if (key === 'unstuck' && activate) { this.close(); w.unstick(); return; }
    else if (key === 'saves') { if (activate || dir) w.game.saves.open(); return; }
    saveSettings(st);
    w.game.applySettings();
    audio.sfx('select', { volume: 0.5 });
  }

  // the saga's quests (World v7) first, then the valley's
  questList() {
    const s = this.world.state, S = this.world.wild && this.world.wild.saga;
    const saga = S ? S.journal() : [];
    const valley = Object.entries(s.quests).map(([id, q]) => ({ id, ...q, def: QUESTS[id] }))
      .sort((a, b) => (a.done - b.done) || ((b.def.main ? 1 : 0) - (a.def.main ? 1 : 0)));
    const all = [...saga, ...valley];
    return [...all.filter((q) => !q.done), ...all.filter((q) => q.done)];
  }

  // ------------------------------------------------------------------ draw
  draw(ctx) {
    const w = this.world, s = w.state, W = w.display.w, H = w.display.h;
    if (this.page === 'pause') { this.drawPause(ctx); return; }
    ctx.fillStyle = 'rgba(20,14,28,0.5)';
    ctx.fillRect(0, 0, W, H);
    const pw = Math.min(W - 12, 360), ph = Math.min(H - 16, 250);
    const px = Math.round((W - pw) / 2), py = Math.round((H - ph) / 2) + 6;
    if (this.page === 'settings') {
      // a page of its own, two tabs above it — the settings, the controls — and its close button
      const qw = Math.min(W - 12, 468), qx = Math.round((W - qw) / 2);
      this.setTabRects = [];
      let tx = qx + 6;
      for (const [id, label] of SET_TABS) {
        const name = t(label), tw = measure(name) + 16, on = id === this.setTab;
        ctx.fillStyle = on ? UI.paper : '#c9a77c'; ctx.fillRect(tx, py - 12, tw, 14);
        ctx.fillStyle = UI.dark; ctx.fillRect(tx, py - 13, tw, 1); ctx.fillRect(tx - 1, py - 12, 1, 12); ctx.fillRect(tx + tw, py - 12, 1, 12);
        drawText(ctx, name, tx + tw / 2, py - 9, { color: on ? '#8a5234' : '#5a3b2a', align: 'center' });
        this.setTabRects.push({ x: tx, y: py - 13, w: tw, h: 14, id });
        tx += tw + 3;
      }
      panel(ctx, qx, py, qw, ph);
      this.drawClose(ctx, qx + qw - 14, py - 12);
      this.rowRects = null;
      if (this.setTab === 'controls') w.game.controls.drawCards(ctx, qx, py, qw, ph);
      else this.drawSettings(ctx, qx, py, qw, ph, true);
      // (Q / R or LB / RB: the other tab)
      const tabs = t('{prev}/{next} tabs', { prev: device() === 'pad' ? ctl('hotPrev') : keyCap('KeyQ'), next: device() === 'pad' ? ctl('hotNext') : keyCap('KeyR') });
      const back = this.from === 'pause' ? t('{b} back', { b: ctl('cancel') }) : t('{b} close', { b: ctl('cancel') });
      if (!w.input.touchMode) drawText(ctx, device() === 'phone' ? back : tabs + ' · ' + back, qx + qw - 8, py + ph - 12, { color: '#b8a080', align: 'right' });
      return;
    }
    // tabs
    this.tabRects = [];
    let tx = px + 6;
    const narrow = TABS.reduce((n, [, name]) => n + measure(t(name)) + 15, 0) > pw - 24;
    // still too wide (long words, tiny screen)? tighten the padding
    const pad = narrow && TABS_SHORT.reduce((n, name) => n + measure(t(name)) + 11, 0) > pw - 24 ? 4 : narrow ? 8 : 12;
    TABS.forEach(([, full], i) => {
      const name = t(narrow ? TABS_SHORT[i] : full);
      const tw = measure(name) + pad;
      const on = i === this.tab;
      ctx.fillStyle = on ? UI.paper : '#c9a77c';
      ctx.fillRect(tx, py - 12, tw, 14);
      ctx.fillStyle = UI.dark;
      ctx.fillRect(tx, py - 13, tw, 1); ctx.fillRect(tx - 1, py - 12, 1, 12); ctx.fillRect(tx + tw, py - 12, 1, 12);
      drawText(ctx, name, tx + tw / 2, py - 9, { color: on ? '#8a5234' : '#6b4330', align: 'center' });
      this.tabRects.push({ x: tx, y: py - 13, w: tw, h: 14, i });
      tx += tw + 3;
    });
    panel(ctx, px, py, pw, ph);
    this.drawClose(ctx, px + pw - 14, py - 12);
    if (!w.input.touchMode) drawText(ctx, this.tabsHint(), px + pw - 8, py + ph - 12, { color: '#b8a080', align: 'right' });
    const key = TABS[this.tab][0];
    this.rowRects = null; this.slotRects = null;
    if (key === 'bag') this.drawBag(ctx, px, py, pw, ph);
    else if (key === 'quests') this.drawQuests(ctx, px, py, pw, ph);
    else if (key === 'friends') this.drawFriends(ctx, px, py, pw, ph);
    else if (key === 'collection') this.drawCollection(ctx, px, py, pw, ph);
    else if (key === 'map') this.drawMap(ctx, px, py, pw, ph);
    else if (key === 'hero') this.hero.draw(ctx, px, py, pw, ph);
  }

  // the red close button (handy on touch screens)
  drawClose(ctx, cx, cy) {
    ctx.fillStyle = UI.dark; ctx.fillRect(cx - 1, cy - 1, 14, 14);
    ctx.fillStyle = '#c8454f'; ctx.fillRect(cx, cy, 12, 12);
    drawText(ctx, 'x', cx + 6, cy + 2, { color: '#fff7e6', align: 'center' });
    this.closeRect = { x: cx - 3, y: cy - 3, w: 18, h: 18 };
  }

  // where you are, for the pause page's card
  placeNow() {
    const w = this.world, p = w.player.pos;
    if (w.mapId !== 'overworld') { const d = INTERIORS[w.mapId]; return d && d.name ? t(d.name) : ''; }
    const n = w.wild ? w.wild.placeName(p.x, p.z) : areaAt(Math.floor(p.x), Math.floor(p.z));
    return n ? t(n) : '';
  }

  // « saved just now » · « saved 3 min ago »
  savedAgo() {
    const w = this.world;
    if (!w.savedAt) return '';
    const m = Math.floor((performance.now() - w.savedAt) / 60000);
    return m < 1 ? t('Saved just now') : m < 60 ? tn('Saved {n} min ago', 'Saved {n} min ago', m) : tn('Saved {n} hour ago', 'Saved {n} hours ago', Math.floor(m / 60));
  }

  drawPause(ctx) {
    const w = this.world, s = w.state, W = w.display.w, H = w.display.h, G = w.game;
    ctx.fillStyle = 'rgba(20,14,28,0.55)';
    ctx.fillRect(0, 0, W, H);
    const rh = w.input.touchMode ? 20 : 16, cardH = 46, footH = w.input.touchMode ? 4 : 16;    // (a finger: taller rows)
    const PAUSE = this.pauseRows();
    const pw = Math.min(W - 16, 250), ph = Math.min(H - 20, cardH + 8 + PAUSE.length * rh + footH);
    const px = Math.round((W - pw) / 2), py = Math.round((H - ph) / 2) + 4;
    // the title tab, a little lantern beside it
    const name = t('Paused'), tw = measure(name) + 30;
    ctx.fillStyle = UI.paper; ctx.fillRect(px + 8, py - 13, tw, 15);
    ctx.fillStyle = UI.dark; ctx.fillRect(px + 8, py - 14, tw, 1); ctx.fillRect(px + 7, py - 13, 1, 13); ctx.fillRect(px + 8 + tw, py - 13, 1, 13);
    G.drawLanternIcon(ctx, px + 13, py - 13, this.t);
    drawText(ctx, name, px + 29, py - 9, { color: '#8a5234' });
    panel(ctx, px, py, pw, ph);
    this.drawClose(ctx, px + pw - 14, py - 13);
    // the card: you, the day, where you are, what you're doing
    const cx = px + 10, cy = py + 9;
    ctx.fillStyle = '#e8d6b4'; ctx.fillRect(cx - 1, cy - 1, 28, 26);
    ctx.drawImage(w.portraitOf('player', 'happy'), 8, 4, 28, 26, cx, cy - 1, 26, 24);
    const tx = cx + 33, tw2 = px + pw - 10 - tx;
    const f = w.wild && w.wild.me.fighter, cls = w.wild && CLASSES[w.wild.me.cls];
    const who = cls ? t('{name} · {cls}, level {n}', { name: s.player.name, cls: t(cls.name), n: f ? f.level : (w.wild.profileOf().level || 1) }) : s.player.name;
    drawText(ctx, fitText(who, tw2), tx, cy, { color: UI.ink });
    drawText(ctx, fitText([dayLabel(s.day), timeLabel(s.hour), this.placeNow()].filter(Boolean).join(' · '), tw2), tx, cy + 10, { color: UI.inkSoft });
    const q = w.trackedQuest();
    if (q) {
      const obj = q.step && typeof q.step.obj === 'function' ? String(q.objective) : t(q.objective);
      drawText(ctx, '★', tx, cy + 21, { color: '#e0a526' });
      drawText(ctx, fitText(t(q.title) + ' — ' + obj, tw2 - 10), tx + 9, cy + 21, { color: '#8a5234' });
    }
    ctx.fillStyle = '#e0cba4'; ctx.fillRect(px + 8, py + cardH - 2, pw - 16, 1);
    // the choices
    this.rowRects = [];
    const saved = this.savedFlash > 0 && this.t - this.savedFlash < 2.5, failed = this.savedFlash < 0 && this.t + this.savedFlash < 2.5;
    PAUSE.forEach(([label, key], i) => {
      const y = py + cardH + 6 + i * rh + Math.floor((rh - 16) / 2), on = i === this.sel && !this.confirm;
      if (on) { ctx.fillStyle = UI.sel; ctx.fillRect(px + 8, y - 3 - Math.floor((rh - 16) / 2), pw - 16, rh - 2); drawText(ctx, '♥', px + 14, y + 1, { color: '#ec5f73' }); }
      drawText(ctx, t(label), px + 26, y + 1, { color: key === 'title' ? '#8e4a3e' : key === 'unstuck' ? '#3f8a4a' : UI.ink });
      if (key === 'save') {
        const note = saved ? t('Saved ✓') : failed ? t('Couldn’t save!') : this.savedAgo();
        drawText(ctx, fitText(note, pw - 60 - measure(t(label))), px + pw - 14, y + 1, { color: saved ? '#4f955a' : failed ? '#c8454f' : '#b8a080', align: 'right' });
      }
      this.rowRects.push({ x: px + 8, y: y - 3 - Math.floor((rh - 16) / 2), w: pw - 16, h: rh - 2, i });
    });
    if (!w.input.touchMode) {
      const hint = t('{a} choose · {b} resume', { a: ctl('interact'), b: device() === 'pad' ? ctl('pause') : ctl('cancel') });
      drawText(ctx, fitText(hint, pw - 16), px + pw / 2, py + ph - 13, { color: '#b8a080', align: 'center' });
    }
    if (this.confirm) this.drawQuitConfirm(ctx, W, H);
  }

  drawQuitConfirm(ctx, W, H) {
    const C = this.confirm, yes = t('Save & quit'), no = t('Keep playing');
    const bw = Math.max(70, measure(yes) + 12, measure(no) + 12);
    const pw = Math.min(W - 12, Math.max(210, bw * 2 + 40));
    const msg = wrap(t('Back to the title screen? Your game is saved first — you’ll pick up right here.'), pw - 20);
    const ph = 42 + msg.length * 10;
    const px = Math.round(W / 2 - pw / 2), py = Math.round(H / 2 - ph / 2);
    ctx.fillStyle = 'rgba(20,14,28,0.35)'; ctx.fillRect(0, 0, W, H);
    panel(ctx, px, py, pw, ph);
    msg.forEach((l, i) => drawText(ctx, l, W / 2, py + 9 + i * 10, { color: UI.ink, align: 'center' }));
    const by = py + ph - 22, x0 = px + Math.round(pw / 2 - bw - 8), x1 = px + Math.round(pw / 2 + 8);
    button(ctx, x0, by, bw, 14, yes, { hot: C.sel === 0 });
    button(ctx, x1, by, bw, 14, no, { hot: C.sel === 1 });
    C.rects = [{ x: x0, y: by, w: bw, h: 14, i: 0 }, { x: x1, y: by, w: bw, h: 14, i: 1 }];
  }

  drawBag(ctx, px, py, pw, ph) {
    const s = this.world.state;
    const cols = 8, sz = 22, gap = 3;
    const gx = px + 12, gy = py + 26;
    drawText(ctx, t('{name}’s bag', { name: s.player.name }), px + 12, py + 10, { color: '#8a5234' });
    coinIcon(ctx, px + pw - measure(num(s.coins)) - 22, py + 11);
    drawText(ctx, num(s.coins), px + pw - 12, py + 10, { color: UI.ink, align: 'right' });
    this.slotRects = [];
    for (let i = 0; i < BAG_SIZE; i++) {
      const x = gx + (i % cols) * (sz + gap), y = gy + Math.floor(i / cols) * (sz + gap);
      const on = i === this.sel, held = i === this.held, hot = i < HOTBAR;
      ctx.fillStyle = held ? '#e0a526' : on ? '#8e5d3e' : '#c9a77c';
      ctx.fillRect(x, y, sz, sz);
      ctx.fillStyle = hot ? '#f6e4bf' : '#efdfc0';
      ctx.fillRect(x + 1, y + 1, sz - 2, sz - 2);
      if (on) { ctx.fillStyle = UI.sel; ctx.fillRect(x + 1, y + 1, sz - 2, sz - 2); }
      const slot = s.bag[i];
      if (slot) {
        drawIcon(ctx, slot.id, x + 3, y + 3);
        if (slot.qty > 1) drawText(ctx, String(slot.qty), x + sz - 2, y + sz - 9, { color: '#fff7e6', align: 'right', shadow: '#3b2a2e' });
      }
      if (hot) drawText(ctx, String(i + 1), x + 2, y + 1, { color: '#c9a77c' });
      this.slotRects.push({ x, y, w: sz, h: sz, i });
    }
    const hint = t(this.world.input.touchMode ? 'Top row = hotbar. Tap to pick up & swap.' : 'Top row = hotbar (1–8). {key} to pick up & swap.', { key: ctl('interact') });
    drawText(ctx, fitText(hint, pw - 24), gx, gy + 3 * (sz + gap) + 4, { color: UI.inkSoft });
    const slot = s.bag[this.sel];
    const dy = gy + 3 * (sz + gap) + 18;
    if (slot) {
      const d = ITEMS[slot.id] || {};
      drawIcon(ctx, slot.id, gx, dy, 2);
      drawText(ctx, fitText(d.name ? t(d.name) : slot.id, pw - 64), gx + 40, dy + 2, { color: UI.ink });
      const cat = CATS[d.cat] ? t(CATS[d.cat]) : '';
      drawText(ctx, d.sell ? t(cat ? '{cat} · sells for {n}¢' : 'Sells for {n}¢', { cat, n: d.sell }) : cat, gx + 40, dy + 13, { color: '#8a5234' });
      const lines = wrap(d.desc ? t(d.desc) : '', pw - 70);
      // room for the description down to the footer
      const maxLines = Math.max(1, Math.floor((py + ph - 16 - (dy + 25)) / 10));
      lines.slice(0, maxLines).forEach((l, i) => drawText(ctx, i === maxLines - 1 && lines.length > maxLines ? fitText(l + '…', pw - 70) : l, gx + 40, dy + 25 + i * 10, { color: UI.inkSoft }));
    }
  }

  drawQuests(ctx, px, py, pw, ph) {
    const list = this.questList();
    drawText(ctx, t('Journal'), px + 12, py + 10, { color: '#8a5234' });
    if (!list.length) { wrap(t('No quests yet. Explore and talk to people!'), pw - 24).forEach((l, i) => drawText(ctx, l, px + 12, py + 30 + i * 10, { color: UI.inkSoft })); return; }
    this.rowRects = [];
    let y = py + 26;
    const tracked = this.world.trackedQuest();
    // (the list scrolls to keep the selected row in view)
    const first = Math.max(0, Math.min(this.sel - 3, list.length - 4));
    list.forEach((q, i) => {
      if (i < first) return;
      if (y > py + ph - 30) return;
      const on = i === this.sel;
      const def = q.def;
      const st = q.saga ? null : def.steps[Math.min(q.step, def.steps.length - 1)];
      // objectives computed by a function come translated; plain ones are English
      let obj = q.done ? t('Completed ✓') : q.saga ? q.obj : typeof st.obj === 'function' ? st.obj(this.world.state) : t(st.obj);
      if (Array.isArray(obj)) obj = obj.join('  ');
      const lines = wrap(obj, pw - 44);
      const hgt = 12 + lines.length * 10;
      if (on) { ctx.fillStyle = UI.sel; ctx.fillRect(px + 8, y - 2, pw - 16, hgt); }
      const star = def.main ? '★' : '♥';
      drawText(ctx, star, px + 12, y, { color: q.done ? '#b8a080' : def.main ? '#e0a526' : '#ec5f73' });
      const title = t(def.title) + (tracked && tracked.id === q.id ? '  ' + t('(tracking)') : '');
      drawText(ctx, fitText(title, pw - 34), px + 22, y, { color: q.done ? '#b8a080' : UI.ink });
      lines.forEach((l, k) => drawText(ctx, l, px + 22, y + 11 + k * 10, { color: q.done ? '#c8b8a0' : UI.inkSoft }));
      this.rowRects.push({ x: px + 8, y: y - 2, w: pw - 16, h: hgt, i });
      y += hgt + 4;
    });
  }

  drawFriends(ctx, px, py, pw, ph) {
    const w = this.world, s = w.state;
    const met = NPC_ORDER.filter((id) => s.friendship[id].met).length;
    drawText(ctx, t('Friends  {n}/{total}', { n: met, total: NPC_ORDER.length }), px + 12, py + 10, { color: '#8a5234' });
    this.rowRects = [];
    // two columns of villagers: portrait, name, title and hearts
    const perCol = Math.ceil(NPC_ORDER.length / 2);
    const colW = Math.floor((pw - 20) / 2);
    const rowH = Math.min(34, Math.floor((ph - 44) / perCol));
    NPC_ORDER.forEach((id, i) => {
      const fr = s.friendship[id], d = NPCS[id];
      const col = Math.floor(i / perCol), row = i % perCol;
      const x = px + 10 + col * colW, y = py + 24 + row * rowH;
      const on = i === this.sel;
      if (on) { ctx.fillStyle = UI.sel; ctx.fillRect(x - 2, y - 1, colW - 4, rowH - 2); }
      if (fr.met) {
        const pc = w.portraitOf(id, hearts(fr.pts) >= 4 ? 'happy' : 'neutral');
        ctx.drawImage(pc, 8, 4, 28, 26, x, y, 24, 22);
      } else { ctx.fillStyle = '#c9a77c'; ctx.fillRect(x + 3, y + 2, 18, 18); drawText(ctx, '?', x + 12, y + 7, { color: '#fff7e6', align: 'center' }); }
      const tx = x + 28, tw = colW - 36;
      drawText(ctx, fr.met ? d.short : '???', tx, y + 1, { color: UI.ink });
      if (fr.met) {
        const talked = fr.talked === s.day, gifted = fr.gifted === s.day;
        const today = t('{a}talk {b}gift', { a: talked ? '✓' : '·', b: gifted ? '✓' : '·' });
        // no room next to the name? just the two ticks
        const room = colW - 36 - measure(d.short) - 6;
        drawText(ctx, measure(today) <= room ? today : `${talked ? '✓' : '·'}${gifted ? '✓' : '·'}`, x + colW - 8, y + 1, { color: UI.inkSoft, align: 'right' });
        const hs = fr.pts / 100;
        for (let k = 0; k < 10; k++) heart(ctx, tx + k * 8, y + 11, Math.max(0, Math.min(1, hs - k)));
        if (rowH >= 30) drawText(ctx, fitText(t(d.title), tw), tx, y + 21, { color: '#a08870' });
      } else drawText(ctx, fitText(t('Not met yet'), tw), tx, y + 11, { color: UI.inkSoft });
      this.rowRects.push({ x: x - 2, y: y - 1, w: colW - 4, h: rowH - 2, i });
    });
  }

  drawCollection(ctx, px, py, pw, ph) {
    const s = this.world.state;
    // sub-tabs: things you've found / critters you've spotted
    const view = this.collView || 'items';
    this.collTabs = [];
    const subTabs = [['items', t('Items')], ['critters', t('Critters')]];
    const bw = Math.max(44, ...subTabs.map(([, label]) => measure(label) + 8));
    subTabs.forEach(([v, label], i) => {
      const bx = px + pw - 12 - (2 - i) * (bw + 3), by = py + 7;
      ctx.fillStyle = view === v ? '#e0a526' : '#c9a77c';
      ctx.fillRect(bx, by, bw, 12);
      drawText(ctx, label, bx + bw / 2, by + 2, { color: view === v ? '#3b2a2e' : '#6b4330', align: 'center' });
      this.collTabs.push({ x: bx, y: by, w: bw, h: 12, view: v });
    });
    if (view === 'critters') { this.drawCritters(ctx, px, py, pw, ph); return; }
    const found = COLLECT.filter((id) => s.collection[id]).length;
    drawText(ctx, t('Collection  {n}/{total}', { n: found, total: COLLECT.length }), px + 12, py + 10, { color: '#8a5234' });
    const cols = Math.floor((pw - 24) / 22);
    COLLECT.forEach((id, i) => {
      const x = px + 12 + (i % cols) * 22, y = py + 26 + Math.floor(i / cols) * 24;
      ctx.fillStyle = '#efdfc0'; ctx.fillRect(x, y, 20, 20);
      if (s.collection[id]) {
        drawIcon(ctx, id, x + 2, y + 2);
        if (s.collection[id] > 1) drawText(ctx, String(s.collection[id]), x + 19, y + 12, { color: '#8a5234', align: 'right' });
      } else {
        // silhouette
        const c = itemIcon(id);
        ctx.save();
        ctx.globalAlpha = 0.28;
        ctx.filter = 'brightness(0)';
        ctx.drawImage(c, x + 2, y + 2);
        ctx.restore();
      }
    });
    this.drawFooter(ctx, t('Fish, crops & treasures you’ve found around the cove.  ({key}: critters)', { key: ctl('interact') }), px, py, pw, ph);
  }

  // a hint line above the bottom edge, wrapped upwards when it's too long
  drawFooter(ctx, text, px, py, pw, ph) {
    const lines = wrap(text, pw - 24).slice(0, 2);
    lines.forEach((l, i) => drawText(ctx, l, px + 12, py + ph - 26 - (lines.length - 1 - i) * 10, { color: UI.inkSoft }));
  }

  drawCritters(ctx, px, py, pw, ph) {
    const w = this.world, s = w.state;
    const log = s.flags.spotted || {};
    const seen = SPECIES_ORDER.filter((k) => log[k]).length;
    drawText(ctx, t('Critters spotted  {n}/{total}', { n: seen, total: SPECIES_ORDER.length }), px + 12, py + 10, { color: '#4f955a' });
    const cell = 56, cols = Math.max(1, Math.floor((pw - 16) / cell));
    const rows = Math.ceil(SPECIES_ORDER.length / cols);
    const rowH = Math.min(38, Math.floor((ph - 68) / rows));
    SPECIES_ORDER.forEach((k, i) => {
      const x = px + 10 + (i % cols) * cell, y = py + 25 + Math.floor(i / cols) * rowH;
      ctx.fillStyle = log[k] ? '#efdfc0' : '#e6d6b6';
      ctx.fillRect(x, y, cell - 4, rowH - 3);
      const icon = w.critters.icon(k);
      const iw = Math.min(28, rowH - 12);
      if (log[k]) ctx.drawImage(icon, x + (cell - 4 - iw) / 2, y + 1, iw, iw);
      else { ctx.save(); ctx.globalAlpha = 0.3; ctx.filter = 'brightness(0)'; ctx.drawImage(icon, x + (cell - 4 - iw) / 2, y + 1, iw, iw); ctx.restore(); }
      // a name too long for its cell may have a short form ("Shore Crab [critter log]")
      let nm = log[k] ? t(SPECIES[k].name) : '???';
      if (measure(nm) > cell - 1) nm = fitText(tc(SPECIES[k].name, 'critter log'), cell - 1);
      drawText(ctx, nm, x + (cell - 4) / 2, y + rowH - 11, { color: log[k] ? UI.ink : '#b8a080', align: 'center' });
    });
    this.drawFooter(ctx, t('Get close to wild animals to log them — some only come out at night.'), px, py, pw, ph);
  }

  // the world map: the wheel zooms where you point, a drag moves it, F / C (a gamepad's
  // X / Y) zoom around you, the arrows move it once zoomed in; true when it used the input
  worldZoom(dt, input) {
    const V = this.worldView, home = this.world.player.pos;
    let used = V.mouse(input, home);
    if (input.pressed('special')) { V.step(1, null, null, V.k ? null : home); used = true; audio.sfx('select', { volume: 0.4 }); }
    if (input.pressed('dodge')) { V.step(-1); used = true; audio.sfx('select', { volume: 0.4 }); }
    if (V.k) {
      const s = (80 * dt) / V.k;
      if (input.down('left')) { V.cx -= s; used = true; }
      if (input.down('right')) { V.cx += s; used = true; }
      if (input.down('up')) { V.cz -= s; used = true; }
      if (input.down('down')) { V.cz += s; used = true; }
    }
    return used;
  }

  // which map is showing: the one you picked, else the world out in the wild lands
  mapViewNow() {
    const w = this.world;
    return this.mapView || (w.wild && w.wild.big && w.mapId === 'overworld' && w.wild.outside() ? 'world' : 'valley');
  }

  drawMap(ctx, px, py, pw, ph) {
    const w = this.world, st = w.state;
    if (this.mapViewNow() === 'world' && w.wild && w.wild.big) { this.drawWorld(ctx, px, py, pw, ph); return; }
    this.mapZoom = this.mapViewNow() === 'close';
    const mm = w.hud.minimap;
    if (!mm) return;
    const SS = w.hud.minimapScale;
    const maxW = pw - 16, maxH = ph - 40;
    // whole valley, or a closer look around you (E / click toggles)
    const fit = Math.min(maxW / mm.width, maxH / mm.height);
    const k = this.mapZoom ? Math.max(fit * 2.4, 1) : fit;
    const mw = Math.min(maxW, Math.floor(mm.width * k)), mh = Math.min(maxH, Math.floor(mm.height * k));
    const mx = px + Math.round((pw - mw) / 2), my = py + 8;
    this.mapRect = [mx, my, mw, mh];
    const pl = w.mapId === 'overworld' ? w.player.pos : (() => { const b = BUILDINGS.find((bb) => bb.id === w.mapId); return b ? { x: b.door + 0.5, z: b.y + b.h } : { x: OX + 47, z: OZ + 30 }; })();
    const S = SS * k;
    // source window (in tiles) that fits the frame
    const vwT = mw / S, vhT = mh / S;
    const ox = Math.max(0, Math.min(mm.width / SS - vwT, pl.x - vwT / 2));
    const oz = Math.max(0, Math.min(mm.height / SS - vhT, pl.z - vhT / 2));
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(mm, ox * SS, oz * SS, vwT * SS, vhT * SS, mx, my, mw, mh);
    const X = (x) => mx + (x - ox) * S, Z = (z) => my + (z - oz) * S;
    const inside = (x, z) => x >= ox && z >= oz && x <= ox + vwT && z <= oz + vhT;
    // fog over places you haven't explored yet
    const cellPx = FOG_CELL * S;
    for (let cz = Math.floor(oz / FOG_CELL); cz * FOG_CELL < oz + vhT; cz++) {
      for (let cx = Math.floor(ox / FOG_CELL); cx * FOG_CELL < ox + vwT; cx++) {
        if (fogSeen(st, cx, cz)) continue;
        const x0 = Math.max(mx, Math.floor(X(cx * FOG_CELL))), z0 = Math.max(my, Math.floor(Z(cz * FOG_CELL)));
        const x1 = Math.min(mx + mw, Math.ceil(X(cx * FOG_CELL) + cellPx)), z1 = Math.min(my + mh, Math.ceil(Z(cz * FOG_CELL) + cellPx));
        if (x1 <= x0 || z1 <= z0) continue;
        ctx.fillStyle = '#e3d3b0';
        ctx.fillRect(x0, z0, x1 - x0, z1 - z0);
        ctx.fillStyle = '#d6c29a';
        for (let yy = z0 + ((cx + cz) % 2); yy < z1; yy += 3) for (let xx = x0 + (yy % 2); xx < x1; xx += 4) ctx.fillRect(xx, yy, 1, 1);
      }
    }
    ctx.fillStyle = '#5a3b2a';
    ctx.fillRect(mx - 1, my - 1, mw + 2, 1); ctx.fillRect(mx - 1, my + mh, mw + 2, 1); ctx.fillRect(mx - 1, my, 1, mh); ctx.fillRect(mx + mw, my, 1, mh);
    // labels: regions when zoomed out, buildings when zoomed in
    const V = (x, z) => [x + OX, z + OZ];
    const labels = this.mapZoom
      ? [['Nana’s', ...V(11.5, 19)], ['Plaza', ...V(47, 27)], ['Bakery', ...V(42.5, 16.5)], ['Hall', ...V(52.5, 14.5)], ['Café', ...V(61, 22.5)], ['Seeds', ...V(31, 23.5)], ['Library', ...V(25, 33.8)], ['Theo', ...V(24, 12.5)], ['Wren', ...V(35.5, 38.5)], ['Pier', ...V(47, 62)], ['Finn', ...V(32.5, 47)], ['Lighthouse', ...V(86.5, 48.5)],
        ['Farmhouse', 8.5, 61.5], ['Barn', 25.5, 44.5], ['Windmill', 12.5, 52.5], ['Camp', 72, 22], ['Old Oak', 48, 15.5], ['Marlo', 157, 107.5], ['Telescope', 162, 23], ['Gazebo', 151, 73.5], ['Ferry', 96, 103],
        ['Frozen Pond', 214, 17], ['Koi Pond', 213, 56.5], ['Boardwalk', 205, 90], ['Pasture', 16.5, 42.5], ['Leaf Piles', 21, 10.5]]
      : [['Marigold Cove', ...V(40, 28)], ['Honeydew Fields', 20, 70.5], ['Whisperwood', 60, 8], ['Waterfall Lake', 112, 22.5], ['Starfall Hill', 162, 19], ['Glowcap Grove', 141, 41], ['Willow Lake', 159, 57.5], ['Lavender', 161, 89.5], ['Sunpetal Meadow', 130, 52], ['Old Glimmer', 131, 86], ['Turtle Isle', 160, 124], ['Seagull Bluffs', 20, 95], ['Camp', 72, 33], ['Driftwood Beach', 86, 95],
        ['Frostpine Ridge', 213, 8], ['Blossom Glade', 211, 50], ['Reedmarsh', 209, 80], ['Maple Hollow', 21, 5]];
    // labels stay inside the frame and dodge each other: one line or two
    // (long French names), nudged up or down until nothing overlaps
    const placed = [];
    const hits = (r) => placed.some((p) => r.x < p.x + p.w + 1 && p.x < r.x + r.w + 1 && r.y < p.y + p.h + 1 && p.y < r.y + r.h + 1);
    for (const [name, x, z] of labels) {
      if (!inside(x, z) || !fogSeen(st, Math.floor(x / FOG_CELL), Math.floor(z / FOG_CELL))) continue;
      const text = t(name), two = splitTwo(text, 0);
      const layouts = two.length === 2 ? (measure(text) > 88 ? [two, [text]] : [[text], two]) : [[text]];
      let best = null;
      search: for (const lines of layouts) {
        for (const dy of [0, -6, 6, -11, 11]) {
          const tw = Math.max(...lines.map((l) => measure(l))) + 4, th = lines.length * 9;
          const cx = Math.max(mx + tw / 2, Math.min(mx + mw - tw / 2, X(x)));
          const top = Math.round(Math.max(my, Math.min(my + mh - th, Z(z) - 5 - (lines.length - 1) * 4.5 + dy)));
          const r = { x: Math.round(cx - tw / 2), y: top, w: tw, h: th, cx, lines };
          if (!hits(r)) { best = r; break search; }
        }
      }
      if (!best) continue; // no room on a small map: skip rather than pile up
      placed.push(best);
      ctx.fillStyle = 'rgba(40,26,40,0.6)';
      ctx.fillRect(best.x, best.y, best.w, best.h);
      best.lines.forEach((l, i) => drawText(ctx, l, best.cx, best.y + 1 + i * 9, { color: '#fff7e6', align: 'center' }));
    }
    // villagers
    for (const n of w.npcs) {
      let x, z;
      if (n.map === 'overworld') { x = n.pos.x; z = n.pos.z; }
      else { const b = BUILDINGS.find((bb) => bb.id === n.map); if (!b) continue; x = b.door + 0.5; z = b.y + b.h; }
      if (!inside(x, z)) continue;
      ctx.fillStyle = '#3b2a2e'; ctx.fillRect(Math.round(X(x)) - 2, Math.round(Z(z)) - 2, 5, 5);
      ctx.fillStyle = '#7cc4e8'; ctx.fillRect(Math.round(X(x)) - 1, Math.round(Z(z)) - 1, 3, 3);
    }
    // quest target
    const qt = w.questTarget();
    if (qt && qt.map === 'overworld' && inside(qt.x, qt.z)) drawText(ctx, '★', X(qt.x), Z(qt.z) - 4, { color: '#f2b63d', align: 'center', outline: '#3b2a2e' });
    // you
    const blink = Math.floor(this.t * 3) % 2;
    ctx.fillStyle = '#3b2a2e'; ctx.fillRect(Math.round(X(pl.x)) - 3, Math.round(Z(pl.z)) - 3, 7, 7);
    ctx.fillStyle = blink ? '#ec5f73' : '#ffb3bf'; ctx.fillRect(Math.round(X(pl.x)) - 2, Math.round(Z(pl.z)) - 2, 5, 5);
    const found = (st.flags.areas || []).length;
    const info = t('{day} · {time} · ♥ you · {n}/{total} places found', { day: dayLabel(st.day), time: timeLabel(st.hour), n: found, total: AREAS.length });
    const zoomHint = device() === 'pad' ? t(this.mapZoom ? (w.wild && w.wild.big ? '{a}: the whole world' : '{a}: show the whole valley') : '{a}: zoom in', { a: ctl('interact') })
      : w.input.touchMode ? t(this.mapZoom ? (w.wild && w.wild.big ? 'Tap: the whole world' : 'Tap: show the whole valley') : 'Tap: zoom in')
        : t(this.mapZoom ? (w.wild && w.wild.big ? 'E / click: the whole world' : 'E / click: show the whole valley') : 'E / click: zoom in');
    drawText(ctx, info, px + 12, py + ph - 26, { color: UI.inkSoft });
    // side by side when there's room, otherwise the hint drops a line
    const sideBySide = measure(info) + measure(zoomHint) + 12 <= pw - 24;
    if (sideBySide) drawText(ctx, zoomHint, px + pw - 12, py + ph - 26, { color: '#b8a080', align: 'right' });
    else if (measure(zoomHint) + (w.input.touchMode ? 0 : measure(this.tabsHint()) + 12) <= pw - 20) drawText(ctx, zoomHint, px + 12, py + ph - 12, { color: '#b8a080' });
  }

  // the whole world: the valley and the wild lands around it, with their marks
  drawWorld(ctx, px, py, pw, ph) {
    const w = this.world, P = w.wild;
    const box = { x: px + 8, y: py + 10, w: pw - 16, h: ph - 44 };
    ctx.fillStyle = '#2a1d34'; ctx.fillRect(box.x, box.y - 4, box.w, box.h + 8);
    const r = drawWorldPanel(P, ctx, box.x, box.y + 8, box.w, box.h - 8, { counts: true, view: this.worldView });
    if (r) this.mapRect = [r.mx, r.my, r.mw, r.mh];
    const z = { a: ctl('interact'), z: ctl('special') + ' ' + ctl('dodge') };
    const hint = device() === 'pad' ? t('{a}: the valley · {z}: zoom · the stick moves it', z) : w.input.touchMode ? t('Tap: the valley') : t('{a}: the valley · wheel or {z}: zoom', z);
    drawText(ctx, hint, px + pw - 12, py + ph - 26, { color: '#b8a080', align: 'right' });
  }

  tabsHint() {
    const dev = device();
    return dev === 'pad' ? t('{prev}/{next} tabs · {b} close', { prev: ctl('hotPrev'), next: ctl('hotNext'), b: ctl('cancel') })
      : dev === 'phone' ? t('{b} close', { b: ctl('cancel') })
        : t('{prev}/{next} tabs · Esc close', { prev: keyCap('KeyQ'), next: keyCap('KeyR') });
  }

  // (`bare`: a page of its own, its name on the tab above)
  drawSettings(ctx, px, py, pw, ph, bare = false) {
    if (!bare) drawText(ctx, t('Settings'), px + 12, py + 10, { color: '#8a5234' });
    const rows = this.settingsRows(), top = py + (bare ? 12 : 26);
    this.rowRects = []; this.sliderRects = [];
    // (rows squeeze a little when there are many)
    const rh = Math.max(12, Math.min(17, Math.floor((ph - (bare ? 32 : 46)) / rows.length)));
    rows.forEach(([label, val, key], i) => {
      const y = top + i * rh;
      const on = i === this.sel;
      if (on) { ctx.fillStyle = UI.sel; ctx.fillRect(px + 8, y - 3, pw - 16, rh - 2); }
      drawText(ctx, t(label), px + 16, y + 1, { color: UI.ink });
      if (val !== '') {
        const isVol = /%$/.test(val);
        if (isVol) {
          // (the bar, then the number clear of its knob; a drag or a tap sets it — dragSliders)
          const v = parseInt(val, 10) / 100, bw = 80, bx = px + pw - 26 - measure('100%') - bw;
          ctx.fillStyle = '#c9a77c'; ctx.fillRect(bx, y + 2, bw, 5);
          ctx.fillStyle = '#e0a526'; ctx.fillRect(bx, y + 2, Math.round(bw * v), 5);
          const kx = bx + Math.round(bw * v), held = this.dragging === key;
          ctx.fillStyle = '#3b2a22'; ctx.fillRect(kx - 2, y - 1, 5, 11);
          ctx.fillStyle = held ? '#e0a526' : '#8e5d3e'; ctx.fillRect(kx - 1, y, 3, 9);
          drawText(ctx, val, px + pw - 16, y + 1, { color: UI.inkSoft, align: 'right' });
          this.sliderRects.push({ key, i, x: bx, y: y - 3, w: bw, h: rh - 2 });
        } else {
          // language names are always written in their own language
          const shown = key === 'lang' ? val : t(val);
          drawText(ctx, (on ? '← ' : '') + shown + (on ? ' →' : ''), px + pw - 16, y + 1, { color: UI.inkSoft, align: 'right' });
        }
      }
      this.rowRects.push({ x: px + 8, y: y - 3, w: pw - 16, h: rh - 2, i });
    });
    const help = (device() === 'pad' ? [
      t('Controls: the stick moves (push it far to run) · {a} use · {b} jump · {prev}/{next} hotbar', { a: ctl('interact'), b: ctl('jump'), prev: ctl('hotPrev'), next: ctl('hotNext') }),
      t('{start} pause · {select} bag, journal & map · {x} special · {y} dodge', { start: ctl('pause'), select: ctl('menu'), x: ctl('special'), y: ctl('dodge') }),
    ] : [
      t('Controls: {move}/arrows move · Shift run · E interact · 1–8 hotbar', { move: moveKeys() }),
      t('Esc pause · Tab bag · J journal · {map} map · right-click or {f} picks up placed furniture', { map: keyCap('KeyM'), f: keyCap('KeyF') }),
    ]).map((l) => wrap(l, pw - 24));
    // whole sentences only, as many as fit between the last row and the footer
    const helpTop = top + rows.length * rh - 2, bottom = py + ph - (this.world.input.touchMode ? 8 : 18);
    const room = Math.max(0, Math.floor((bottom - helpTop) / 10));
    const shownHelp = [];
    for (const block of help) if (shownHelp.length + block.length <= room) shownHelp.push(...block);
    shownHelp.forEach((l, i) => drawText(ctx, l, px + 12, bottom - (shownHelp.length - i) * 10, { color: UI.inkSoft }));
  }
}
