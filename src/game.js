// Hearthlight — boot, scene flow (title → creator → world), overlays
// (day summary, wardrobe, shipping, credits), settings & debug hooks.

import { Display } from './engine/display.js';
import { Input } from './engine/input.js';
import { makeCanvas } from './engine/gfx.js';
import { drawText, measure, wrap } from './engine/font.js';
import { R3D } from './render/r3d.js';
import { Lighting } from './render/lighting.js';
import { Portraits } from './render/portrait.js';
import { World } from './scenes/world.js';
import { Dialogue } from './ui/dialogue.js';
import { Creator } from './ui/creator.js';
import { panel, button, UI, fitText, bindInput, ctl, device, closeButton, tc } from './ui/ui.js';
import { dayLabel } from './ui/hud.js';
import { CharModel, PetModel } from './models/chars.js';
import { newState, loadGame, saveGame, hasSave, loadSettings, saveSettings, hearts } from './state.js';
import { NPCS, NPC_ORDER } from './data/npcs.js';
import { ITEMS } from './data/items.js';
import { audio } from './engine/audio.js';
import { drawIcon } from './art/icons.js';
import { OX, OZ } from './world/overworld.js';
import { applyHomeLevel } from './world/interiors.js';
import { Party } from './party/party.js';
import { SavesDialog } from './party/hub.js';
import { partySummary } from './party/saves.mjs';
import { SessionRecovery } from './session.mjs';
import { setLang, loadLang, t, tn, num } from './i18n.js';
import { SoloPhone } from './solo/phone.js';
import { ControlsPanel } from './ui/controls.js';
import { CLASSES } from './combat/classes.js';
import { Chat } from './ui/chat.js';

const MUTE = typeof location !== 'undefined' && /[?&]mute=1\b/.test(location.search);

export class Game {
  constructor() {
    this.display = new Display(document.getElementById('world'), document.getElementById('ui'));
    this.input = new Input(this.display);
    // (a phone: its finger from the start — the touch controls and the hints that go with them)
    if (this.display.phone) { this.input.touchMode = true; this.input.lastDevice = 'touch'; }
    bindInput(this.input);
    this.settings = loadSettings();
    setLang(this.settings.lang);
    this.mode = 'boot';
    this.recovery = new SessionRecovery({ save: () => this.saveBeforeLeaving(), snapshot: () => this.sessionSnapshot() });
    this.saves = new SavesDialog(this);      // Saves & backups (Settings · the host menu's Options)
    this.projectLinks = document.getElementById('project-links');
    this.t = 0;
    this.overlay = null;
    this.phone = new SoloPhone(this);       // a phone as the solo game's controller (Settings)
    this.controls = new ControlsPanel(this); // keyboard · gamepad · phone, side by side (Settings' Controls tab)
    // what « Play » offers: the story, and any other way to play a mode adds (`{ id, name(), sub(),
    // solo(), multi() }` — the words as functions: the language may change meanwhile)
    this.experiences = [{
      id: 'story', name: () => t('Marigold Cove’s adventure'), sub: () => t('A cozy life in the valley, and a story in ten chapters'),
      solo: () => this.toCreator(), multi: () => this.toParty({}),
    }];
    this.play = null;                        // the Play screen's steps, while it's open
    this.debug = this.makeDebug();
    this.chat = new Chat(this);              // (bubbles, quick phrases & emotes — every mode: src/ui/chat.js)
    this.input.onFirstGesture = () => { audio.unlock(); this.applySettings(); };
    this.input.onGesture = () => audio.unlock();
  }

  async start() {
    const reload = this.recovery.take(performance.getEntriesByType('navigation')[0]?.type);
    const t0 = performance.now();
    // (the chosen language's dictionary before the first word is drawn)
    await loadLang(this.settings.lang);
    setLang(this.settings.lang);
    // (the online copies say hello to the relay's counters: the language and the kind of device,
    // nothing else — config.js names where; the desktop app and the dev server don't)
    try {
      const S = window.HEARTHLIGHT && window.HEARTHLIGHT.stats;
      if (S && navigator.sendBeacon) navigator.sendBeacon(S, JSON.stringify({ lang: this.settings.lang, platform: /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'phone' : 'computer' }));
    } catch (e) { /* no counting */ }
    this.r3d = new R3D();
    this.display.onResize((d) => this.r3d.resize(d.ww, d.wh));
    this.applyZoom();
    this.r3d.resize(this.display.ww, this.display.wh);
    // (a phone: 8 lights in the pool — every lit pixel loops over them all; its small view needs fewer)
    this.lighting = new Lighting(this.r3d, this.display.phone ? 8 : 14);
    this.portraits = new Portraits(this.r3d);
    this.state = newState({ name: 'Sprout', look: {} });
    this.dialogue = new Dialogue(this);
    this.world = new World(this);
    const boot = document.getElementById('boot');
    const steps = ['Painting the meadows', 'Filling the sea', 'Sketching the paths', 'Planting the forests', 'Raising the cottages', 'Waking the villagers'];
    await this.world.build((p) => {
      if (!boot) return;
      const n = Math.round(p * 20);
      boot.textContent = `${t(steps[Math.min(steps.length - 1, Math.floor(p * steps.length))])}…  ${'■'.repeat(n)}${'□'.repeat(20 - n)}`;
    });
    this.dialogue.game = this.world;
    console.log('world built in', Math.round(performance.now() - t0), 'ms');
    this.applySettings();
    this.toTitle();
    if (reload?.mode === 'game' && hasSave()) this.continueGame();
    else if (reload?.mode === 'party') this.toParty({ online: reload.online, resume: !!reload.activity, reload });
    let last = performance.now();
    const loop = (ts) => {
      const dt = Math.max(0, Math.min(0.05, (ts - last) / 1000));
      last = ts;
      if (!this.paused) this.frame(dt);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.recovery.checkpoint(); });
  }

  saveBeforeLeaving() {
    if (this.mode === 'party') this.party.saveNow();
    else if (this.mode === 'game' && this.world.player) this.world.save('quiet');
  }

  sessionSnapshot() {
    if (this.mode !== 'party') return { mode: this.mode };
    const p = this.party;
    return { mode: 'party', online: !!p.options.online, activity: p.phase === 'lobby' ? null : p.actKind,
      locals: p.players.filter((q) => q.connected && q.kind !== 'phone').map((q) => ({ kind: q.kind, layout: q.input.layoutId, index: q.input.index })) };
  }

  frame(dt) {
    this.t += dt;
    if (this.mode !== 'game') this.input.touchUi = true;
    this.input.update(dt);
    this.phone.update(dt);
    // (the saves page open over the game: nothing reads a key meanwhile)
    // (a phone or a gamepad closes it with its own Close / B)
    if (this.saves.isOpen) {
      if (this.input.pressed('cancel') || this.input.pressed('menu')) this.saves.close();
      this.input.keys.clear(); this.input.consume(); this.saves.update(); this.draw(); return;
    }
    if (this.phone.panelOpen) this.phone.updatePanel(dt, this.input);
    else if (this.mode === 'title') this.updateTitle(dt);
    else if (this.mode === 'creator') this.updateCreator(dt);
    else if (this.mode === 'game') this.updateGame(dt);
    else if (this.mode === 'party') this.party.update(dt);
    this.input.mouse.moved = false;
    this.draw();
  }

  draw() {
    if (this.projectLinks) {
      const hidden = this.mode !== 'title' || this.world.menu.open || this.phone.panelOpen || this.confirmNew || !!this.play || this.saves.isOpen;
      if (this.projectLinks.hidden !== hidden) this.projectLinks.hidden = hidden;
    }
    if (this.mode === 'title') this.drawTitle();
    else if (this.mode === 'creator') this.drawCreator();
    else if (this.mode === 'game') {
      this.world.draw();
      if (this.overlay) this.overlay.draw(this.display.ctx);
    } else if (this.mode === 'party') this.party.draw();
    if (this.phone.panelOpen) this.phone.drawPanel(this.display.ctx);
    this.drawPadNote(this.display.ctx);
    if (this.mode === 'party') this.party.remotePlay.capture();
  }

  // (the Controls: a tab of the Settings)
  openControls() { this.world.menu.show('settings'); this.world.menu.setTab = 'controls'; }

  // a gamepad plugged in (or out): a word at the top of the screen for a few seconds
  drawPadNote(ctx) {
    const n = this.input.padNote, age = n ? (performance.now() - n.at) / 1000 : 99;
    if (age > 3.5) return;
    const P = this.mode === 'party' ? this.party : null;
    const joined = P && P.players.some((p) => p.kind === 'gamepad');
    const text = !n.on ? t('{name} unplugged', { name: n.name })
      : P && P.phase === 'lobby' && !joined ? t('{name}: press {a} to join!', { name: n.name, a: 'A' })
        : t('{name} ready — play away!', { name: n.name });
    const W = this.display.w, w = measure(text) + 26, x = Math.round(W / 2 - w / 2), y = 4 + Math.round(Math.max(0, age - 3.1) * -40);
    ctx.globalAlpha = Math.min(1, age * 4, (3.5 - age) * 3);
    ctx.fillStyle = '#2a1f33'; ctx.fillRect(x, y, w, 14);
    ctx.fillStyle = n.on ? '#4f955a' : '#a8483a'; ctx.fillRect(x, y + 13, w, 1);
    drawText(ctx, '🎮', x + 9, y + 4, { color: n.on ? '#9fe0a0' : '#ffb0a0', align: 'center' });
    drawText(ctx, text, x + 18, y + 3, { color: '#fff3c4' });
    ctx.globalAlpha = 1;
  }

  // ------------------------------------------------------------------ settings
  applySettings() {
    const st = this.settings;
    setLang(st.lang);
    if (this.projectLinks) {
      this.projectLinks.setAttribute('aria-label', t('Explore more'));
      for (const label of this.projectLinks.querySelectorAll('[data-i18n]')) label.textContent = t(label.dataset.i18n);
    }
    // (?mute=1: a silent game — tests running while someone works nearby)
    audio.setVolume('master', MUTE ? 0 : st.master);
    audio.setVolume('music', st.music);
    audio.setVolume('sfx', st.sfx);
    audio.setVolume('ambient', st.ambient);
    this.input.rumbleOn = st.rumble !== false;
  }

  applyZoom() { this.display.setZoomBias(this.settings.zoom || 0); }
  // the mouse wheel (solo): the pixels a size bigger (+1) or smaller (-1), as far as makes sense on
  // this screen — a view some 16 to 64 tiles across (zoomed out, the camera's own close-up for big
  // canvases gives way: World.ppuBase). It moves the Pixel size setting, saved with it.
  zoomStep(dir) {
    const d = this.display, st = this.settings, cur = st.zoom || 0;
    const across = (b) => { const ws = Math.max(1, d.wscaleFor(b)), ww = Math.ceil(d.devW / ws / 2) * 2, wh = Math.ceil(d.devH / ws / 2) * 2; return ww / (b >= 0 && (wh / 16 > 27 || ww / 16 > 44) ? 32 : 16); };
    const now = across(cur);
    for (let b = cur + dir; Math.abs(b) <= 4; b += dir) {
      const tw = across(b);
      if (tw < 16 || tw > 64) return false;
      if (Math.abs(tw - now) > 0.5) { st.zoom = b; saveSettings(st); this.applyZoom(); return true; }
    }
    return false;
  }

  // ------------------------------------------------------------------ title
  toTitle() {
    this.recovery.setActive(false);
    const w = this.world;
    this.mode = 'title';
    this.overlay = null;
    this.titleSel = 0;
    this.titleT = 0;
    this.confirmNew = false;
    this.play = null;
    this.state = newState({ name: 'Sprout', look: {} });
    this.state.hour = 19.3;
    for (const m of Object.values(w.maps)) m.root.visible = false;
    w.maps.overworld.root.visible = true;
    if (w.wild) { w.wild.stop(); w.wild = null; }
    if (w.player) {
      this.r3d.scene.remove(w.player.model.root);
      this.r3d.scene.remove(w.pet.model.root);
      for (const n of w.npcs) this.r3d.scene.remove(n.model.root);
    }
    w.npcs = []; w.player = null;
    w.beam.visible = true;
    w.over.lighthouseLamp.lamp.emissiveIntensity = 1.5;
    w.forage.spawnDay(1, w.trees);
    w.farm.refreshAll();
    this.lighting.clear();
    for (const b of Object.values(w.over.buildings)) { for (const m of b.glowMats) this.lighting.glowMats.push(m); for (const l of b.lights) this.lighting.addSource(l); }
    for (const p of w.over.props) for (const l of p.lights) this.lighting.addSource(l);
    this.lighting.lampMats = w.overLampMats || (w.overLampMats = collectLamp(w.over.root));
    this.lighting.indoor = null;
    this.hasSave = hasSave();
    audio.playMusic('title', { fade: 2 });
    audio.setAmbient({ birds: 0, crickets: 0.4, waves: 0.6, rain: 0, wind: 0.2, fire: 0, night: 0.3 });
  }

  // (« Play » the game, not an instrument: its own word — `Play [title]`)
  titleItems() { return [[tc('Play', 'title'), 'play'], [t('Settings'), 'settings']]; }

  updateTitle(dt) {
    const input = this.input, w = this.world;
    this.titleT += dt;
    w.over.update(dt, this.titleT);
    const vh = this.titleVista ? this.titleVista.hour : 18.55;
    w.forage.updateFireflies(dt, this.titleT, vh >= 19.5, true);
    w.critters.update(dt, this.titleT, { pos: this.titleVista ? { x: this.titleVista.x, z: this.titleVista.z } : { x: 0, z: 0 } }, vh);
    for (const gm of w.over.glowcaps) gm.emissiveIntensity = 0.3 + this.lighting.lampLevel * 1.5;
    w.beam.rotation.y = this.titleT * 0.5;
    w.fx.update(dt);
    if (Math.random() < dt * 3) for (const c of w.over.chimneys) if (Math.random() < 0.3) w.fx.emit('smoke', c.x, c.y, c.z, 1);
    if (w.menu.open) { w.menu.update(dt, input); return; }
    const items = this.titleItems();
    if (this.confirmNew) {
      if (input.pressed('left') || input.pressed('right')) { this.confirmSel = 1 - this.confirmSel; audio.sfx('select'); }
      if (input.pressed('cancel')) { input.consume('cancel'); this.confirmNew = false; return; }
      const clicked = input.mouse.pressed && this.confirmRects?.find((r) => input.mouseIn(r.x, r.y, r.w, r.h));
      if (clicked) { this.confirmSel = clicked.i; input.mouse.pressed = false; }
      if (input.pressed('interact') || clicked) {
        input.consume('interact');
        if (this.confirmSel === 0) { this.confirmNew = false; this.play = null; this.toCreator(); }
        else this.confirmNew = false;
      }
      return;
    }
    if (this.play) { this.updatePlay(input); return; }
    if (input.repeat('up')) { this.titleSel = (this.titleSel + items.length - 1) % items.length; audio.sfx('select'); }
    if (input.repeat('down')) { this.titleSel = (this.titleSel + 1) % items.length; audio.sfx('select'); }
    if (this.titleRects) for (const r of this.titleRects) if (input.mouseIn(r.x, r.y, r.w, r.h)) {
      if (input.mouse.moved && this.titleSel !== r.i) { this.titleSel = r.i; audio.sfx('select', { volume: 0.5 }); }
      if (input.mouse.pressed) { this.titleSel = r.i; this.titleActivate(items[r.i][1]); input.mouse.pressed = false; return; }
    }
    if (input.pressed('interact')) { input.consume('interact'); this.titleActivate(items[this.titleSel][1]); }
  }

  titleActivate(what) {
    audio.unlock();
    audio.sfx('confirm');
    if (what === 'play') this.openPlay();
    else if (what === 'settings') this.world.menu.show('settings');
  }

  // ---- Play: what (the story, or another way a mode adds), who (alone, or together: phones,
  // gamepads, the keyboard, friends at home), and for the story alone with a saved cove, back to
  // it or a new one. The last choices come back preselected: Play, then A, A, A is where you were.
  openPlay() {
    const last = this.settings.lastPlay || {}, many = this.experiences.length > 1;
    const exp = this.experiences.find((e) => e.id === last.exp) || this.experiences[0];
    this.play = { step: many ? 'what' : 'who', exp, sel: many ? this.experiences.indexOf(exp) : last.who === 'multi' ? 1 : 0, t: 0 };
  }
  playRows() {
    const P = this.play, last = this.settings.lastPlay || {};
    if (P.step === 'what') return this.experiences.map((e) => ({ name: e.name(), sub: e.sub(), go: () => { P.exp = e; P.step = 'who'; P.sel = last.who === 'multi' ? 1 : 0; } }));
    if (P.step === 'who') {
      // (the story's saved games, said under each way: where you'll be back)
      const story = P.exp.id === 'story', solo = story && this.hasSave ? loadGame() : null, party = story ? partySummary() : null;
      return [
        { name: t('Solo'), sub: solo ? [solo.player && solo.player.name, t('Day {n}', { n: solo.day })].filter(Boolean).join(' · ') : P.exp.soloSub ? P.exp.soloSub() : t('Just you — the keyboard, a gamepad or your phone'), go: () => this.playGo('solo') },
        { name: t('Together'), sub: party ? [t('Chapter {n}', { n: party.chapter }), (party.players || []).filter((n) => typeof n === 'string').slice(0, 3).join(', ')].filter(Boolean).join(' · ') : P.exp.multiSub ? P.exp.multiSub() : t('1 to 8 players: phones, gamepads, the keyboard — friends at home too'), go: () => this.playGo('multi') },
      ];
    }
    const S = P.save;
    return [
      { name: t('Continue'), sub: [S.player && S.player.name, t('Day {n}', { n: S.day })].filter(Boolean).join(' · '), go: () => { this.play = null; this.continueGame(); } },
      { name: t('New Game'), sub: t('A new life in the cove, from the very start'), go: () => { this.confirmNew = true; this.confirmSel = 1; } },
    ];
  }
  playGo(who) {
    const P = this.play;
    this.settings.lastPlay = { exp: P.exp.id, who };
    saveSettings(this.settings);
    if (who === 'solo' && P.exp.id === 'story' && this.hasSave) { P.save = loadGame(); P.step = 'save'; P.sel = 0; audio.sfx('page'); return; }
    this.play = null;
    if (who === 'multi') P.exp.multi(); else P.exp.solo();
  }
  // (back: a step back, or out of Play from its first)
  playBack() {
    const P = this.play, many = this.experiences.length > 1;
    audio.sfx('cancel');
    if (P.step === 'save') { P.step = 'who'; P.sel = 0; return; }
    if (P.step === 'who' && many) { P.step = 'what'; P.sel = Math.max(0, this.experiences.indexOf(P.exp)); return; }
    this.play = null;
  }
  updatePlay(input) {
    const P = this.play, rows = this.playRows();
    P.t += 1 / 60;
    if (input.pressed('cancel') || input.mouse.rpressed) { input.consume('cancel'); this.playBack(); return; }
    if (input.repeat('up') || input.repeat('left')) { P.sel = (P.sel + rows.length - 1) % rows.length; audio.sfx('select'); }
    if (input.repeat('down') || input.repeat('right')) { P.sel = (P.sel + 1) % rows.length; audio.sfx('select'); }
    for (const r of this.playRects || []) if (input.mouseIn(r.x, r.y, r.w, r.h)) {
      if (input.mouse.moved && r.i >= 0 && P.sel !== r.i) { P.sel = r.i; audio.sfx('select', { volume: 0.5 }); }
      if (input.mouse.pressed) {
        input.mouse.pressed = false;
        if (r.i < 0) { this.playBack(); return; }
        P.sel = r.i; audio.sfx('confirm'); rows[r.i].go(); return;
      }
    }
    if (input.pressed('interact')) { input.consume('interact'); audio.sfx('confirm'); rows[P.sel].go(); }
  }
  // the step's choices on a paper card under the logo: a heading, a row each (its name, a line of
  // what it is), and Back
  drawPlay(ctx, W, top, bottom) {
    const P = this.play, rows = this.playRows(), touch = this.input.touchMode;
    const head = P.step === 'what' ? t('What would you like to play?') : P.step === 'who' ? P.exp.name() : t('Your cove');
    const back = t('Back'), bw = measure(back) + 14;
    // (a card no wider than it needs, nor than a comfortable line; each row's line of what it is
    // wraps to two when it must)
    const pw = Math.min(W - 16, Math.max(220, Math.min(290, Math.max(measure(head) + 40, ...rows.map((r) => Math.max(measure(r.name), measure(r.sub)) + 44)))));
    const lines = rows.map((r) => wrap(r.sub, pw - 44).slice(0, 2)), pad = touch ? 8 : 6;
    const hs = lines.map((l) => 12 + l.length * 9 + pad), ph = 24 + hs.reduce((a, h) => a + h + 4, 0) + 18;
    const px = Math.round(W / 2 - pw / 2), py = Math.round(Math.max(top, Math.min(bottom - ph, (top + bottom) / 2 - ph / 2)));
    panel(ctx, px, py, pw, ph);
    drawText(ctx, fitText(head, pw - 16), W / 2, py + 8, { color: '#8a5234', align: 'center' });
    this.playRects = [];
    let y = py + 22;
    rows.forEach((r, i) => {
      const on = P.sel === i, h = hs[i];
      ctx.fillStyle = on ? UI.sel : UI.paperShade; ctx.fillRect(px + 8, y, pw - 16, h);
      ctx.fillStyle = ['#8fd67a', '#ffd66b', '#9fdcff', '#f59ac8'][i % 4]; ctx.fillRect(px + 8, y, 3, h);
      if (on) drawText(ctx, '♥', px + 17, y + Math.round(h / 2) - 4, { color: '#ec5f73' });
      const ty = y + Math.round((h - 12 - lines[i].length * 9) / 2);
      drawText(ctx, fitText(r.name, pw - 44), px + 28, ty, { color: UI.ink });
      lines[i].forEach((l, k) => drawText(ctx, l, px + 28, ty + 11 + k * 9, { color: UI.inkSoft }));
      this.playRects.push({ x: px + 8, y, w: pw - 16, h, i });
      y += h + 4;
    });
    const bx = Math.round(W / 2 - bw / 2), by = py + ph - 17;
    button(ctx, bx, by, bw, 13, back, {});
    this.playRects.push({ x: bx, y: by, w: bw, h: 13, i: -1 });
  }

  // ------------------------------------------------------------------ party mode
  toParty(options = {}) {
    if (this.mode === 'party') return;
    audio.unlock();
    this.overlay = null;
    this.phone.stop();           // (Party Mode hosts its own room)
    this.party = new Party(this, options);
    this.party.enter();
    this.recovery.ask = true;                // (leaving the tab would end the party for everyone)
    this.recovery.setActive(true);
  }

  drawTitle() {
    const w = this.world, r3d = this.r3d, d = this.display;
    const tt = this.titleT;
    const tall = r3d.h / 16 > 27 || r3d.w / 16 > 44;
    const ppu = tall ? 32 : 16;
    // a slow tour of the valley, crossfading through the dark between vistas
    const VISTAS = [
      { x: OX + (tall ? 83.5 : 78), z: OZ + (tall ? 51.5 : 51), hour: 18.55, drift: tall ? 3 : 8 },
      { x: 22, z: 57, hour: 17.9, drift: 5 },
      { x: 141.5, z: 35.5, hour: 21.6, drift: 3 },
      { x: 160, z: 112, hour: 18.9, drift: 4 },
    ];
    const DUR = 14;
    const vi = Math.floor(tt / DUR) % VISTAS.length, vt = tt % DUR;
    const v = VISTAS[vi];
    this.titleVista = v;
    const cx = v.x + Math.sin(vt * 0.05) * v.drift, cz = v.z + Math.sin(vt * 0.045) * 1;
    r3d.setView(cx, cz, ppu);
    this.lighting.update(v.hour, r3d.target);
    r3d.render();
    d.wctx.drawImage(r3d.canvas, 0, 0);
    w.fx.draw(d.wctx, r3d);
    const fade = Math.max(0, 1 - vt / 0.9, (vt - (DUR - 0.9)) / 0.9);
    if (fade > 0 && tt > 1) { d.wctx.fillStyle = `rgba(20,14,28,${Math.min(1, fade)})`; d.wctx.fillRect(0, 0, d.ww, d.wh); }
    const ctx = d.ctx, W = d.w, H = d.h;
    ctx.clearRect(0, 0, W, H);
    const grad = ctx.createLinearGradient(0, 0, 0, H * 0.4);
    grad.addColorStop(0, 'rgba(26,18,38,0.55)');
    grad.addColorStop(1, 'rgba(26,18,38,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H * 0.4);
    // logo
    const ly = Math.round(H * 0.15);
    const glow = 0.5 + Math.sin(tt * 1.5) * 0.5;
    const scale = W < 360 ? 3 : 4;
    drawText(ctx, 'Hearthlight', W / 2 + 8, ly, { color: '#fff3c4', align: 'center', scale, outline: '#3b2a2e' });
    ctx.globalAlpha = 0.18 + glow * 0.18;
    drawText(ctx, 'Hearthlight', W / 2 + 8, ly, { color: '#ffd66b', align: 'center', scale });
    ctx.globalAlpha = 1;
    this.drawLanternIcon(ctx, Math.round(W / 2 + 8 - measure('Hearthlight', scale) / 2) - 18, ly + 2, tt);
    drawText(ctx, t('~ a cozy little life in Marigold Cove ~'), W / 2, ly + scale * 9 + 8, { color: '#f6d38f', align: 'center', shadow: '#2a1f33' });
    if (w.menu.open) { w.menu.draw(ctx); return; }
    // menu
    const items = this.titleItems();
    // (a finger wants taller rows)
    const rh = this.input.touchMode ? 21 : 16;
    const mw = Math.max(130, ...items.map(([label]) => measure(label) + 44)), mh = items.length * rh + 10;
    // Reserve the actual footer height, including wrapped translations and the phone safe area.
    const footerTop = this.projectLinks && !this.projectLinks.hidden
      ? this.projectLinks.getBoundingClientRect().top * H / window.innerHeight : H;
    const hintY = Math.floor(footerTop - 17);
    const mx = Math.round(W / 2 - mw / 2), my = Math.round(Math.min(H * 0.6, hintY - mh - 12));
    this.titleRects = [];
    // (Play open: its card in the menu's place)
    if (this.play) { this.drawPlay(ctx, W, ly + scale * 9 + 24, hintY - 6); items.length = 0; }
    else {
      ctx.fillStyle = 'rgba(30,20,40,0.55)';
      ctx.fillRect(mx, my, mw, mh);
      ctx.fillStyle = 'rgba(255,240,200,0.2)';
      ctx.fillRect(mx, my, mw, 1);
    }
    items.forEach(([label], i) => {
      const y = my + 6 + i * rh + Math.floor((rh - 16) / 2);
      const on = i === this.titleSel;
      if (on) { ctx.fillStyle = 'rgba(246,211,143,0.22)'; ctx.fillRect(mx + 4, y - 3 - Math.floor((rh - 16) / 2), mw - 8, rh - 2); drawText(ctx, '♥', mx + 12, y, { color: '#ec5f73' }); }
      drawText(ctx, label, W / 2 + 4, y, { color: on ? '#fff3c4' : '#d9c8b0', align: 'center', shadow: '#2a1f33' });
      this.titleRects.push({ x: mx, y: y - 3 - Math.floor((rh - 16) / 2), w: mw, h: rh - 2, i });
    });
    if (this.confirmNew) {
      const yes = t('Start over'), no = t('Keep it');
      const bw = Math.max(70, measure(yes) + 12, measure(no) + 12);
      const pw = Math.min(W - 12, Math.max(210, bw * 2 + 70)), ph = 56;
      const msg = wrap(t('Start over? Your saved cove will be lost.'), pw - 16);
      const extra = (msg.length - 1) * 10;
      const px = Math.round(W / 2 - pw / 2), py = Math.round(H / 2 - (ph + extra) / 2);
      panel(ctx, px, py, pw, ph + extra);
      msg.forEach((l, i) => drawText(ctx, l, W / 2, py + 10 + i * 10, { color: UI.ink, align: 'center' }));
      const x0 = px + Math.round(pw / 2 - bw - 15), x1 = px + Math.round(pw / 2 + 15);
      button(ctx, x0, py + 30 + extra, bw, 14, yes, { hot: this.confirmSel === 0 });
      button(ctx, x1, py + 30 + extra, bw, 14, no, { hot: this.confirmSel === 1 });
      this.confirmRects = [{ x: x0, y: py + 30 + extra, w: bw, h: 14, i: 0 }, { x: x1, y: py + 30 + extra, w: bw, h: 14, i: 1 }];
    }
    if (this.titleMessage) {
      this.titleMessageT = (this.titleMessageT || 0) + 1 / 60;
      if (this.titleMessageT > 4) { this.titleMessage = null; this.titleMessageT = 0; }
      else drawText(ctx, this.titleMessage, W / 2, Math.round(H * 0.15) + 58, { color: '#aee9bc', align: 'center', outline: '#2a1f33' });
    }
    const how = this.input.touchMode ? t('Tap to choose · best with sound on ♪') : device() === 'pad' ? t('Stick + {a} to choose · best with sound on ♪', { a: ctl('interact') }) : t('Arrows + E, or click · best with sound on ♪');
    drawText(ctx, fitText(how, W - 8), W / 2, hintY, { color: '#d9c8b0', align: 'center', shadow: '#2a1f33' });
  }

  drawLanternIcon(ctx, x, y, t) {
    const g = ['..##..', '.#..#.', '######', '#yYYy#', '#yYYy#', '#yyyy#', '######', '..##..'];
    const flick = Math.sin(t * 9) > 0.6;
    const col = { '#': '#5a3b2a', y: '#f6c65b', Y: flick ? '#fff3c4' : '#ffe08a' };
    for (let j = 0; j < g.length; j++) for (let i = 0; i < 6; i++) { const ch = g[j][i]; if (ch !== '.') { ctx.fillStyle = col[ch]; ctx.fillRect(x + i * 2, y + j * 2, 2, 2); } }
  }

  // ------------------------------------------------------------------ creator
  toCreator() {
    this.mode = 'creator';
    this.state = newState({ name: '', look: {} });
    this.creator = new Creator(this, 'new');
    this.prepCreatorScene();
    audio.playMusic('interior', { fade: 1.5 });
    audio.setAmbient({ birds: 0.3, crickets: 0, waves: 0.2, rain: 0, wind: 0, fire: 0.5, night: 0 });
  }

  prepCreatorScene() {
    const w = this.world;
    applyHomeLevel(1);
    if (w.maps.home) { this.r3d.scene.remove(w.maps.home.root); delete w.maps.home; }
    const home = w.interiorFor('home');
    for (const m of Object.values(w.maps)) m.root.visible = false;
    home.root.visible = true;
    w.beam.visible = false;
    w.forage.ffGroup.visible = false;
    if (this.preview) { this.r3d.scene.remove(this.preview.root); this.r3d.scene.remove(this.previewPet.root); }
    this.preview = new CharModel(this.r3d, this.creator.look);
    this.preview.root.position.set(3.4, 0, 4.4);
    this.r3d.scene.add(this.preview.root);
    this.previewPet = new PetModel(this.r3d, this.creator.pet.kind, this.creator.pet.color);
    this.previewPet.root.position.set(4.4, 0, 4.9);
    this.r3d.scene.add(this.previewPet.root);
    this.lighting.clear();
    for (const l of home.room.lights) this.lighting.addSource(l);
  }

  creatorChanged(c) {
    if (this.preview) this.preview.setLook(c.look);
    if (this.previewPet && (this.previewPet.kind !== c.pet.kind || this.previewPet.color !== c.pet.color)) {
      this.r3d.scene.remove(this.previewPet.root);
      this.previewPet = new PetModel(this.r3d, c.pet.kind, c.pet.color);
      this.previewPet.root.position.set(4.4, 0, 4.9);
      this.r3d.scene.add(this.previewPet.root);
    }
  }

  updateCreator(dt) {
    const c = this.creator;
    c.update(dt, this.input);
    if (c.back) {
      this.r3d.scene.remove(this.preview.root); this.r3d.scene.remove(this.previewPet.root);
      this.preview = this.previewPet = this.creator = null;
      this.input.textHandler = null; this.input.consume(); this.toTitle(); return;
    }
    // (the hero tab: the weapon in hand, turned three-quarters to show it swing)
    const hero = c.onHero && c.onHero();
    this.preview.setProp(hero ? CLASSES[c.cls].weapon : null);      // (it does nothing when it's the same)
    this.preview.setFacing(hero ? -0.9 : c.spin);
    this.preview.update(dt, c.demo ? c.demo(dt) : {});
    this.previewPet.update(dt, { happy: true });
    this.previewPet.root.rotation.y = -0.6;
    if (c.done) this.startNewGame(c.done);
  }

  drawCreator() {
    const r3d = this.r3d, d = this.display;
    const home = this.world.maps.home;
    const ppu = d.wh > 400 ? 64 : 48;
    if (d.portrait) {
      // the panel covers the bottom: frame the character in the space above it
      const panelH = Math.min(Math.round(d.h * 0.58), 240) + 6;
      const shiftZ = (panelH * d.scale / d.wscale) / 2 / ppu;
      r3d.setView(3.9, 4.0 + shiftZ, ppu);
    } else {
      const panelW = Math.round(Math.min(236, Math.max(186, d.w * 0.44))) + 6;
      const shiftUnits = (panelW * d.scale / d.wscale) / 2 / ppu;
      r3d.setView(3.9 + shiftUnits, 4.0, ppu);
    }
    this.lighting.updateIndoor(14, r3d.target, home.room);
    r3d.render();
    d.wctx.drawImage(r3d.canvas, 0, 0);
    // where the preview's hand is on screen (the hero tab's stars, acorns & notes fly from it)
    const pv = this.preview.root.position, hp = r3d.project(pv.x - 0.25, 0.75, pv.z + 0.1);
    this.creator.handAt = { ...d.worldToUi(hp.x, hp.y), dir: -1 };
    const ctx = d.ctx;
    ctx.clearRect(0, 0, d.w, d.h);
    const band = ctx.createLinearGradient(0, 0, 0, 30);
    band.addColorStop(0, 'rgba(26,18,38,0.75)'); band.addColorStop(1, 'rgba(26,18,38,0)');
    ctx.fillStyle = band; ctx.fillRect(0, 0, d.w, 30);
    this.creator.draw(ctx);
  }

  startNewGame(res) {
    this.r3d.scene.remove(this.preview.root);
    this.r3d.scene.remove(this.previewPet.root);
    this.preview = null;
    this.input.textHandler = null;
    const s = newState({ name: res.name, look: res.look, pet: res.pet });
    // (the hero picked in the creator: the wild lands start with it)
    s.hero = { cls: res.cls || 'knight', level: 1, xp: 0, hats: [] };
    this.state = s;
    this.mode = 'game';
    this.resetWorldForGame();
    this.world.enter(true);
    saveGame(s);
    this.recovery.ask = false;               // (the solo game saves itself: a reload just resumes it)
    this.recovery.setActive(true);
  }

  continueGame() {
    const s = loadGame();
    if (!s) { this.toCreator(); return; }
    this.state = s;
    this.mode = 'game';
    this.resetWorldForGame();
    this.world.enter(false);
    this.recovery.ask = false;
    this.recovery.setActive(true);
  }

  resetWorldForGame() {
    const w = this.world;
    w.clearProjects();
    if (w.maps.home) { this.r3d.scene.remove(w.maps.home.root); delete w.maps.home; }
    w.over.setBridge(false);
    w.beam.visible = false;
    w.over.lighthouseLamp.lamp.emissiveIntensity = 0;
    w.fx.clear();
    for (const f of w.floaters || []) w.over.root.remove(f.m);
    w.floaters = [];
    w.forage.state = null;
    this.portraits.invalidate('player');
    this.overlay = null;
  }

  // ------------------------------------------------------------------ game
  updateGame(dt) {
    if (this.overlay) {
      this.overlay.update(dt, this.input);
      this.world.fx.update(dt);
      return;
    }
    this.world.update(dt);
  }

  showSummary() {
    return new Promise((resolve) => {
      const s = this.state;
      const sum = this.summary;
      let tm = 0;
      this.overlay = {
        update: (dt, input) => {
          tm += dt;
          if (tm > 0.9 && (input.pressed('interact') || input.pressed('cancel') || input.pressed('menu') || input.mouse.pressed || tm > 7)) { input.consume(); this.overlay = null; resolve(); }
        },
        draw: (ctx) => {
          const W = this.display.w, H = this.display.h;
          ctx.fillStyle = '#1c1428';
          ctx.fillRect(0, 0, W, H);
          for (let i = 0; i < 46; i++) {
            const x = (i * 97 + 13) % W, y = (i * 53 + 7) % Math.floor(H * 0.55);
            ctx.fillStyle = Math.sin(tm * 2 + i) > 0.3 ? '#fff3c4' : '#6a5a88';
            ctx.fillRect(x, y, 1, 1);
          }
          // moon
          const moon = ['..####..', '.###....', '###.....', '###.....', '###.....', '###.....', '.###....', '..####..'];
          for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) if (moon[j][i] === '#') { ctx.fillStyle = i === 0 || j === 0 ? '#fff8dc' : '#f6f0c8'; ctx.fillRect(W - 60 + i * 2, 28 + j * 2, 2, 2); }
          const a = Math.min(1, tm * 2);
          ctx.globalAlpha = a;
          drawText(ctx, fitText(t(sum.passedOut ? 'You drifted off right where you stood…' : sum.tent ? 'You fall asleep to the crackle of the campfire…' : 'Sweet dreams…'), W - 12), W / 2, H * 0.3, { color: '#f6d38f', align: 'center' });
          drawText(ctx, dayLabel(sum.day), W / 2, H * 0.3 + 16, { color: '#fff7e6', align: 'center', scale: 2 });
          const lines = [];
          if (sum.earned) lines.push(t('Shipping crate paid out {n}¢', { n: num(sum.earned) }));
          lines.push(t(sum.weather === 'rain' ? 'Today’s forecast: soft rain (crops watered!)' : sum.weather === 'cloudy' ? 'Today’s forecast: clouds' : 'Today’s forecast: sunshine'));
          const crops = Object.values(s.farm).length;
          if (crops) lines.push(t('Your garden grew a little overnight'));
          lines.forEach((l, i) => drawText(ctx, fitText(l, W - 12), W / 2, H * 0.3 + 44 + i * 12, { color: '#d9c8e8', align: 'center' }));
          drawText(ctx, t('Game saved ♥'), W / 2, H * 0.3 + 56 + lines.length * 12, { color: '#8fd6b4', align: 'center' });
          if (tm > 0.9 && Math.floor(tm * 2) % 2) drawText(ctx, t('press {key}', { key: ctl('interact') }), W / 2, H - 24, { color: '#8a7aa8', align: 'center' });
          ctx.globalAlpha = 1;
        },
      };
    });
  }

  openWardrobe() {
    const s = this.state;
    const c = new Creator(this, 'wardrobe', s.unlocked);
    audio.sfx('open');
    this.overlay = {
      update: (dt, input) => {
        c.update(dt, input);
        if (this._wardLook !== JSON.stringify(c.look)) { this._wardLook = JSON.stringify(c.look); this.world.player.setLook(c.look); }
        this.world.player.model.update(dt, {});
        if (c.done) {
          s.player.look = c.done.look;
          this.world.player.setLook(s.player.look);
          this.portraits.invalidate('player');
          this.overlay = null;
          input.consume();
        }
      },
      draw: (ctx) => c.draw(ctx),
    };
  }

  creatorChangedWardrobe() {}

  openShipping() {
    return new Promise((resolve) => {
      const w = this.world, s = this.state;
      let sel = 0, top = 0, vis = 8, rows = [], arrows = [], closeR = null, panelR = null;
      const list = () => {
        const out = [];
        for (const slot of s.bag) if (slot && ITEMS[slot.id] && ITEMS[slot.id].sell && !['key', 'tool'].includes(ITEMS[slot.id].cat) && !out.includes(slot.id)) out.push(slot.id);
        return out;
      };
      const total = () => s.shipping.reduce((n, x) => n + ITEMS[x.id].sell * x.qty, 0);
      audio.sfx('open');
      this.overlay = {
        update: (dt, input) => {
          const items = list();
          // (its Close button, a click or tap outside, or the device's own cancel)
          const tap = input.mouse.pressed, inR = (r) => r && input.mouseIn(r.x, r.y, r.w, r.h);
          if (input.pressed('cancel') || input.pressed('menu') || input.pressed('pause') || (tap && (inR(closeR) || (panelR && !inR(panelR))))) { input.mouse.pressed = false; this.overlay = null; audio.sfx('close'); input.consume(); resolve(); return; }
          if (input.repeat('up')) sel = Math.max(0, sel - 1);
          if (input.repeat('down')) sel = Math.min(items.length - 1, sel + 1);
          // (a long bag: the wheel, or the ↑ ↓ beside the list)
          const page = (d) => { top = Math.max(0, Math.min(items.length - vis, top + d)); sel = Math.max(top, Math.min(top + vis - 1, sel)); };
          if (input.mouse.wheel) { page(Math.sign(input.mouse.wheel) * 2); input.mouse.wheel = 0; }
          for (const r of arrows) if (tap && inR(r)) { input.mouse.pressed = false; page(r.d * (vis - 1)); audio.sfx('select', { volume: 0.4 }); return; }
          const ship = (all) => {
            const id = items[sel];
            if (!id) return;
            const n = all ? this.countOf(id) : 1;
            w.takeItem(id, n);
            const e = s.shipping.find((x) => x.id === id);
            if (e) e.qty += n; else s.shipping.push({ id, qty: n });
            audio.sfx('sell');
            w.story.onSell();
            if (sel >= list().length) sel = Math.max(0, list().length - 1);
          };
          // (a finger taps once to pick a stack, again to ship it: no stack goes by a stray tap)
          for (const r of rows) if (input.mouseIn(r.x, r.y, r.w, r.h)) {
            if (input.mouse.moved && device() !== 'touch') sel = r.i;
            if (input.mouse.pressed) { input.mouse.pressed = false; if (device() === 'touch' && sel !== r.i) { sel = r.i; audio.sfx('select', { volume: 0.5 }); } else { sel = r.i; ship(true); } }
          }
          if (input.pressed('interact')) { input.consume('interact'); ship(input.down('run')); }
          // (a gamepad: X ships the whole stack)
          if (input.pressed('special') && device() === 'pad') ship(true);
        },
        draw: (ctx) => {
          const W = this.display.w, H = this.display.h;
          ctx.fillStyle = 'rgba(20,14,28,0.45)'; ctx.fillRect(0, 0, W, H);
          const pw = Math.min(W - 16, 270), ph = Math.min(H - 20, 200);
          const px = Math.round((W - pw) / 2), py = Math.round((H - ph) / 2);
          panel(ctx, px, py, pw, ph);
          panelR = { x: px, y: py, w: pw, h: ph };
          closeR = closeButton(ctx, px + pw - 8, py + 6);
          const paid = t('Paid tomorrow: {n}¢', { n: num(total()) }), pr = closeR.x - 8;
          drawText(ctx, fitText(t('Shipping Crate'), pr - measure(paid) - 12 - (px + 12)), px + 12, py + 10, { color: '#8a5234' });
          drawText(ctx, paid, pr, py + 10, { color: '#b8862a', align: 'right' });
          const items = list();
          rows = []; arrows = [];
          vis = Math.floor((ph - 50) / 16);
          if (sel < top) top = sel;
          if (sel >= top + vis) top = sel - vis + 1;
          top = Math.max(0, Math.min(top, items.length - vis));
          const more = items.length > vis, rw = pw - 16 - (more ? 22 : 0);
          items.slice(top, top + vis).forEach((id, k) => {
            const i = top + k, y = py + 26 + k * 16;
            if (i === sel) { ctx.fillStyle = UI.sel; ctx.fillRect(px + 8, y - 2, rw, 16); }
            drawIcon(ctx, id, px + 10, y - 2);
            const each = t('{n}¢ each', { n: ITEMS[id].sell });
            drawText(ctx, fitText(`${t(ITEMS[id].name)} ×${this.countOf(id)}`, rw - 34 - measure(each)), px + 30, y + 2, { color: UI.ink });
            drawText(ctx, each, px + 8 + rw - 4, y + 2, { color: UI.inkSoft, align: 'right' });
            rows.push({ x: px + 8, y: y - 2, w: rw, h: 16, i });
          });
          if (more) {
            const ax = px + pw - 8 - 18, y0 = py + 24, y1 = py + 24 + vis * 16 - 12;
            [[-1, '↑', y0, top > 0], [1, '↓', y1, top < items.length - vis]].forEach(([d, glyph, ay, can]) => {
              button(ctx, ax, ay, 18, 12, glyph, { disabled: !can });
              if (can) arrows.push({ x: ax - 2, y: ay - 3, w: 22, h: 18, d });
            });
            ctx.fillStyle = '#c9a77c'; ctx.fillRect(ax + 8, y0 + 15, 2, y1 - y0 - 18);
            const bh = Math.max(6, (y1 - y0 - 18) * vis / items.length);
            ctx.fillStyle = '#8e5d3e'; ctx.fillRect(ax + 8, y0 + 15 + (y1 - y0 - 18 - bh) * top / (items.length - vis), 2, bh);
          }
          if (!items.length) wrap(t('Nothing to ship. Crops, fish & forage sell here.'), pw - 24).forEach((l, i) => drawText(ctx, l, W / 2, py + 40 + i * 10, { color: UI.inkSoft, align: 'center' }));
          const dev = device();
          const how = dev === 'pad' ? t('{a} ship one · {x} ship all · {b} close', { a: ctl('interact'), x: ctl('special'), b: ctl('cancel') })
            : dev === 'touch' ? t('Tap a stack twice to ship it · tap outside to leave')
              : dev === 'phone' ? t('{a} ship one · {b} close', { a: ctl('interact'), b: ctl('cancel') })
                : t('{a} ship one · {run}+{a} or a click: all · {b} close', { a: ctl('interact'), run: ctl('run'), b: ctl('cancel') });
          drawText(ctx, fitText(how, pw - 12), px + pw / 2, py + ph - 12, { color: UI.inkSoft, align: 'center' });
        },
      };
    });
  }

  countOf(id) { let n = 0; for (const s of this.state.bag) if (s && s.id === id) n += s.qty; return n; }

  // Looking through the Starfall Hill telescope: a round view of the night sky
  // with one of the cove's constellations traced in gold.
  stargazeOverlay() {
    return new Promise((resolve) => {
      const s = this.state;
      const CONST = [
        { name: 'The Lantern', pts: [[0, -3], [2, -2], [2, 2], [0, 3], [-2, 2], [-2, -2], [0, -3], [0, -5]] },
        { name: 'The Heron', pts: [[-5, 3], [-2, 1], [0, 1], [2, -1], [3, -4], [4, -3], [2, -1], [1, 3], [1, 5]] },
        { name: 'Nana’s Teapot', pts: [[-3, 1], [-3, -1], [0, -2], [3, -1], [3, 1], [0, 2], [-3, 1], [-5, -1], [3, -1], [5, -3]] },
        { name: 'The Moonfin', pts: [[-5, 0], [-2, -2], [2, -2], [4, 0], [2, 2], [-2, 2], [-5, 0], [-6, -2], [-6, 2], [-5, 0]] },
        { name: 'The Old Oak', pts: [[0, 5], [0, 1], [-3, -1], [-2, -4], [0, -3], [2, -4], [3, -1], [0, 1]] },
        { name: 'The Great Turnip', pts: [[0, -5], [0, -2], [-3, 0], [-2, 3], [0, 4], [2, 3], [3, 0], [0, -2], [-1, -4], [1, -4]] },
      ];
      const c = CONST[(s.day + (s.flags.starNights || 0)) % CONST.length];
      s.flags.constellations = s.flags.constellations || [];
      const isNew = !s.flags.constellations.includes(c.name);
      if (isNew) s.flags.constellations.push(c.name);
      const stars = [];
      let seed = s.day * 97 + 13;
      const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      for (let i = 0; i < 220; i++) stars.push({ x: rnd(), y: rnd(), b: rnd(), p: rnd() * 6 });
      let tm = 0, shoot = null;
      audio.sfx('open');
      this.overlay = {
        update: (dt, input) => {
          tm += dt;
          if (!shoot && Math.random() < dt * 0.35) shoot = { x: 0.2 + Math.random() * 0.6, y: 0.1 + Math.random() * 0.3, t: 0 };
          if (shoot) { shoot.t += dt; if (shoot.t > 0.9) shoot = null; }
          if (tm > 1.2 && (input.pressed('interact') || input.pressed('cancel') || input.pressed('menu') || input.mouse.pressed)) {
            input.consume();
            this.overlay = null;
            audio.sfx('close');
            resolve();
          }
        },
        draw: (ctx) => {
          const W = this.display.w, H = this.display.h;
          const R = Math.min(W, H) * 0.44, cx = W / 2, cy = H / 2 - 6;
          ctx.fillStyle = '#0d0b16';
          ctx.fillRect(0, 0, W, H);
          ctx.save();
          ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
          const g = ctx.createRadialGradient(cx, cy + R * 0.3, R * 0.1, cx, cy, R);
          g.addColorStop(0, '#2c3570'); g.addColorStop(1, '#141433');
          ctx.fillStyle = g; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
          // milky way band
          for (let i = 0; i < 90; i++) { const u = i / 90; ctx.fillStyle = `rgba(200,190,255,${0.05 + (i % 3) * 0.02})`; ctx.fillRect(Math.round(cx - R + u * R * 2), Math.round(cy - R * 0.6 + u * R * 1.1 + Math.sin(i) * 6), 3, 2); }
          for (const st of stars) {
            const x = cx - R + st.x * R * 2, y = cy - R + st.y * R * 2;
            const tw = 0.5 + 0.5 * Math.sin(tm * 2 + st.p);
            ctx.fillStyle = st.b > 0.9 ? '#fff3c4' : st.b > 0.6 ? `rgba(255,255,255,${0.5 + tw * 0.5})` : `rgba(180,180,230,${0.3 + tw * 0.4})`;
            ctx.fillRect(Math.round(x), Math.round(y), st.b > 0.93 ? 2 : 1, st.b > 0.93 ? 2 : 1);
          }
          // the constellation, traced in over the first seconds
          const sc = R / 9;
          const reveal = Math.min(1, tm / 2.2) * (c.pts.length - 1);
          ctx.fillStyle = '#f6d38f';
          for (let i = 0; i < c.pts.length - 1; i++) {
            if (i > reveal) break;
            const [ax, ay] = c.pts[i], [bx, by] = c.pts[i + 1];
            const k = Math.min(1, reveal - i);
            const n = Math.ceil(Math.hypot(bx - ax, by - ay) * sc);
            for (let j = 0; j <= n * k; j += 2) ctx.fillRect(Math.round(cx + (ax + (bx - ax) * j / n) * sc), Math.round(cy + (ay + (by - ay) * j / n) * sc), 1, 1);
          }
          for (const [px, py] of c.pts) {
            const x = Math.round(cx + px * sc), y = Math.round(cy + py * sc);
            ctx.fillStyle = '#fff8dc'; ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3);
          }
          if (shoot) {
            const k = shoot.t / 0.9;
            for (let j = 0; j < 14; j++) { ctx.fillStyle = `rgba(255,248,220,${(1 - j / 14) * (1 - k)})`; ctx.fillRect(Math.round(cx - R + (shoot.x + k * 0.3) * R * 2 - j * 2), Math.round(cy - R + (shoot.y + k * 0.12) * R * 2 - j * 0.8), 1, 1); }
          }
          ctx.restore();
          // brass rim
          ctx.strokeStyle = '#8a5234'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, cy, R + 2, 0, Math.PI * 2); ctx.stroke();
          ctx.strokeStyle = '#e0a526'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, R + 4, 0, Math.PI * 2); ctx.stroke();
          const a = Math.min(1, Math.max(0, (tm - 1.6) * 2));
          ctx.globalAlpha = a;
          const nc = s.flags.constellations.length;
          const ny = Math.min(cy + R + 10, H - 44); // short screens: keep both lines in view
          drawText(ctx, t(c.name), cx, ny, { color: '#fff3c4', align: 'center', scale: measure(t(c.name), 2) > W - 12 ? 1 : 2, shadow: '#2a1f33' });
          drawText(ctx, isNew ? tn('New constellation! (1 charted)', 'New constellation! ({n} charted)', nc) : tn('{n} constellation charted', '{n} constellations charted', nc), cx, ny + 20, { color: '#b9a2e3', align: 'center', shadow: '#2a1f33' });
          ctx.globalAlpha = 1;
          if (tm > 1.2 && Math.floor(tm * 2) % 2) drawText(ctx, t('press {key}', { key: ctl('interact') }), W - 8, H - 12, { color: '#8a7aa8', align: 'right' });
        },
      };
    });
  }

  credits() {
    return new Promise((resolve) => {
      let tm = 0;
      const s = this.state;
      const lines = [
        ['Hearthlight', 3, '#fff3c4'], ['', 1], [t('a cozy little life in Marigold Cove'), 1, '#f6d38f'], ['', 1], ['', 1],
        [t('Old Glimmer shines again.'), 1, '#fff7e6'], ['', 1],
        ...NPC_ORDER.map((id) => [`${t(NPCS[id].name)}  ${'♥'.repeat(Math.max(1, hearts(s.friendship[id].pts)))}`, 1, '#f4a4b6']), ['', 1],
        [t('and {pet}, the best companion in the cove', { pet: s.player.pet.name }), 1, '#d9c8e8'], ['', 1], ['', 1],
        [t('Every sprite painted in code.'), 1, '#d9c8e8'], [t('Every sound synthesised live.'), 1, '#d9c8e8'], ['', 1], ['', 1],
        [t('Thank you for playing, {name}.', { name: s.player.name }), 1, '#fff7e6'], ['', 1],
        [t('The End… but life in the cove goes on.'), 1, '#8fd6b4'],
      ];
      this.overlay = {
        update: (dt, input) => {
          tm += dt;
          this.world.update(dt);
          if ((tm > 20 && (input.pressed('interact') || input.mouse.pressed)) || tm > 42 || (tm > 3 && (input.pressed('cancel') || input.pressed('menu')))) { input.consume(); this.overlay = null; resolve(); }
        },
        draw: (ctx) => {
          const W = this.display.w, H = this.display.h;
          ctx.fillStyle = `rgba(20,14,28,${Math.min(0.6, tm * 0.25)})`;
          ctx.fillRect(0, 0, W, H);
          let y = H + 10 - tm * 15;
          for (const [txt, sc, col] of lines) {
            if (y > -30 && y < H + 10) drawText(ctx, txt, W / 2, y, { color: col || '#fff7e6', align: 'center', scale: sc, shadow: '#2a1f33' });
            y += sc === 3 ? 34 : 13;
          }
          if (tm > 20 && Math.floor(tm * 2) % 2) drawText(ctx, t('press {key}', { key: ctl('interact') }), W / 2, H - 14, { color: '#8a7aa8', align: 'center' });
        },
      };
    });
  }

  // ------------------------------------------------------------------ debug
  makeDebug() {
    const g = this;
    const tick = async (dt = 1 / 60) => { g.frame(dt); await null; await null; };
    return {
      shot: (name = 'shot', scale = 3, crop = null) => g.screenshot(name, scale, crop),
      pause: (on = true) => { g.paused = on; },
      // all stepping helpers yield between frames so story promises resolve
      step: async (n = 1, dt = 1 / 60) => { for (let i = 0; i < n; i++) await tick(dt); },
      key: async (code, frames = 2) => { g.input.keys.add(code); for (let i = 0; i < frames; i++) await tick(); g.input.keys.delete(code); await tick(); },
      hold: async (code, sec = 1) => { g.input.keys.add(code); for (let i = 0; i < sec * 60; i++) await tick(); g.input.keys.delete(code); await tick(); },
      newGame: async (name = 'Alex', look = {}) => { g.toCreator(); g.creator.name = name; Object.assign(g.creator.look, look); g.creator.finish(); await tick(); },
      skip: async (n = 80) => { for (let i = 0; i < n && (g.dialogue.active || g.world.busy); i++) { g.input.keys.add('KeyE'); await tick(); g.input.keys.delete('KeyE'); for (let k = 0; k < 4; k++) await tick(); } },
      tp: (x, z, map = null) => { const w = g.world; if (map && map !== w.mapId) w.setMap(map, x, z); else { w.player.pos.x = x; w.player.pos.z = z; } w.snapCamera(); },
      hour: (h) => { g.state.hour = h; },
      give: (id, n = 1) => g.world.giveItem(id, n),
      coins: (n) => { g.state.coins += n; },
      state: () => g.state,
      world: () => g.world,
    };
  }

  async screenshot(name, scale = 3, crop = null) {
    const d = this.display;
    this.draw();
    const full = makeCanvas(d.devW, d.devH);
    full.ctx.imageSmoothingEnabled = false;
    const wx = (d.devW - d.ww * d.wscale) / 2, wy = (d.devH - d.wh * d.wscale) / 2;
    full.ctx.drawImage(d.worldCanvas, wx, wy, d.ww * d.wscale, d.wh * d.wscale);
    const ux = (d.devW - d.w * d.scale) / 2, uy = (d.devH - d.h * d.scale) / 2;
    full.ctx.drawImage(d.canvas, ux, uy, d.w * d.scale, d.h * d.scale);
    let out = full;
    const k = scale / d.wscale;
    if (crop || k !== 1) {
      const [sx, sy, sw, sh] = crop ? crop.map((v) => v * d.wscale) : [0, 0, d.devW, d.devH];
      out = makeCanvas(sw * k, sh * k);
      out.ctx.imageSmoothingEnabled = false;
      out.ctx.drawImage(full, sx, sy, sw, sh, 0, 0, sw * k, sh * k);
    }
    const blob = await new Promise((res) => out.toBlob(res, 'image/png'));
    const r = await fetch('/__shot?name=' + encodeURIComponent(name), { method: 'POST', body: blob });
    return r.text();
  }
}

function collectLamp(root) {
  const out = [];
  root.traverse((m) => { if (m.isMesh && m.material && m.material.emissive && m.material.emissive.getHex() === 0xffc15a && !out.includes(m.material)) out.push(m.material); });
  return out;
}
