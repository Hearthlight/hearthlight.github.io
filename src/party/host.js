// The host: the first phone to join wears a crown and can run the whole party
// from its menu — pause, skip, restart, switch activity, difficulty, options,
// players and the camera zoom. The crown can be handed over, and moves on by
// itself when the host's phone drops out. The big screen has the very same
// menu (Esc / Start), so a keyboard or a gamepad can do everything too.
//
// One menu model (`tabs()`), two renderers: the big screen draws it here, the
// host phone gets it as data (`{t:'hmenu'}`) and sends back `{t:'hact'}`.

import { drawText, measure, wrap } from '../engine/font.js';
import { panel, UI, fitText, ctl } from '../ui/ui.js';
import { audio } from '../engine/audio.js';
import { saveSettings } from '../state.js';
import { t, getLang, setLang, LANGS } from '../i18n.js';

export const DIFFS = {
  easy: { name: 'Cozy', hp: 0.75, dmg: 0.55, speed: 0.92 },
  normal: { name: 'Normal', hp: 1, dmg: 1, speed: 1 },
  hard: { name: 'Tough', hp: 1.3, dmg: 1.35, speed: 1.06 },
  heroic: { name: 'Heroic', hp: 1.7, dmg: 1.8, speed: 1.12 },
};
const DIFF_ORDER = ['easy', 'normal', 'hard', 'heroic'];
const ACTS = [
  { id: 'explore', label: 'The Adventure', color: '#ffd66b' },
  { id: 'story', label: 'The Starfall Festival', color: '#8fd67a' },
  { id: 'waves', label: 'Arena: gloom waves', color: '#b88cf0' },
  { id: 'brawl', label: 'Arena: brawl', color: '#ef6479', min: 2 },
  { id: 'king', label: 'Arena: king of the ring', color: '#f4c542', min: 2 },
];
const OPTS_KEY = 'hearthlight.party.opts.v1';
const GRACE = 8;                 // seconds a host may be away before the crown moves on

export class Host {
  constructor(party) {
    this.party = party;
    this.id = null;              // pad id wearing the crown
    this.awayT = 0;
    this.opts = { diff: 'normal', ff: false, zoom: 'auto' };
    try { Object.assign(this.opts, JSON.parse(localStorage.getItem(OPTS_KEY) || '{}')); } catch (e) { /* ignore */ }
    if (!DIFFS[this.opts.diff]) this.opts.diff = 'normal';
    this.menu = null;            // big-screen menu: { tab, sel, confirm }
    this.sentKey = '';
    this.skipAll = 0;
    this.prevStart = new Set();
  }

  get player() { return this.party.players.find((p) => p.id === this.id) || null; }
  isHost(p) { return !!p && p.id === this.id; }
  diff() { return DIFFS[this.opts.diff] || DIFFS.normal; }

  saveOpts() { try { localStorage.setItem(OPTS_KEY, JSON.stringify(this.opts)); } catch (e) { /* ignore */ } }

  // ------------------------------------------------------------------ the crown
  // a phone joined (or came back): crown it if nobody wears it
  onJoin(p) {
    if (p.kind !== 'phone') return;
    const h = this.player;
    if (!h || (!h.connected && h !== p && this.awayT > GRACE)) this.give(p, !h);
    else this.tell(p);
    if (this.isHost(p)) this.sentKey = '';     // a fresh page needs the menu again
  }

  give(p, quiet = false) {
    const P = this.party, old = this.player;
    this.id = p ? p.id : null;
    this.awayT = 0;
    this.sentKey = '';
    if (old && old !== p) this.tell(old);
    if (!p) return;
    this.tell(p);
    P.flashTag(p, 3);
    if (!quiet) {
      P.toast(t('{name} is the host now ♛', { name: p.name }), p.color);
      audio.sfx('bell', { volume: 0.5 });
    }
  }

  tell(p) { if (p && p.kind === 'phone') this.party.net.send(p.id, { t: 'host', v: this.isHost(p) }); }

  // the next phone in line (lowest seat that's here)
  heir(except = null) {
    return this.party.players.filter((q) => q.kind === 'phone' && q.connected && q !== except).sort((a, b) => a.slot - b.slot)[0] || null;
  }

  onLeave(p) { if (this.isHost(p)) this.give(this.heir(p)); }

  update(dt) {
    const P = this.party, h = this.player;
    if (!h) { const n = this.heir(); if (n) this.give(n, P.phase === 'lobby' && P.players.length <= 1); }
    else if (!h.connected) {
      this.awayT += dt;
      const n = this.awayT > GRACE ? this.heir(h) : null;
      if (n) this.give(n);
    } else this.awayT = 0;
    // the big screen's own menu: Esc, or Start on any gamepad
    const g = P.game.input;
    let start = false;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const now = new Set();
    for (const gp of pads) if (gp && gp.buttons[9] && gp.buttons[9].pressed) { now.add(gp.index); if (!this.prevStart.has(gp.index)) start = true; }
    this.prevStart = now;
    if (this.menu) this.updateMenu(dt);
    else if ((g.pressed('pause') || start) && !P.vote && !P.bigMapOpen) { g.consume(); this.openMenu(); }   // (the map open: that closes it — party.js)
    if (this.skipAll > 0) {
      this.skipAll -= dt;
      if (P.dialogue.active) { this.skipAll = Math.max(this.skipAll, 1.2); P.dialogue.skip(); }
    }
    this.sync();
  }

  // ------------------------------------------------------------------ the menu model
  tabs() {
    const P = this.party, Z = P.zoom, D = this.diff();
    const here = P.players.filter((q) => q.connected).length;
    const kind = P.act ? P.actKind : null;
    const game = [];
    game.push({ id: 'pause', kind: 'button', label: P.paused ? 'Resume the game' : 'Pause the game', hot: !!P.paused });
    if (P.dialogue.active) {
      game.push({ id: 'skip', kind: 'button', label: 'Skip this line' });
      game.push({ id: 'skipall', kind: 'button', label: 'Skip the whole scene' });
    }
    if (P.phase === 'lobby' && !P.vote && !P.choosing && here) game.push({ id: 'vote', kind: 'button', label: 'Start the vote now' });
    // (players on this screen: their own menu — hero, talents, gear, look — is one key away)
    for (const q of P.players) if (q.kind !== 'phone' && q.connected) {
      game.push({ id: 'tv:' + q.slot, kind: 'button', raw: true, color: q.color, label: t('{name}’s own menu', { name: q.name }), sub: t('hero, talents, gear, look… — {key} opens it any time', { key: P.keyOf(q, 'm') }) });
    }
    if (kind) game.push({ id: 'restart', kind: 'button', label: 'Restart this activity', confirm: true });
    for (const a of ACTS) {
      if (a.min && here < a.min) continue;
      if (a.id === kind) continue;
      game.push({ id: 'act:' + a.id, kind: 'button', label: a.label, sub: P.phase === 'lobby' ? 'Start it now' : 'Switch to it', color: a.color, confirm: P.phase !== 'lobby' });
    }
    if (P.phase !== 'lobby') game.push({ id: 'unstuck', kind: 'button', label: 'Get everyone unstuck', sub: 'anyone stuck in a corner hops to open ground' });
    if (P.camp && P.exploring()) game.push({ id: 'camp', kind: 'button', label: 'Light a campfire', sub: 'by the crowned player: warm up, and sleep there at night' });
    if (P.phase !== 'lobby') game.push({ id: 'lobby', kind: 'button', label: 'Back to the lobby', confirm: true });
    game.push({ id: 'end', kind: 'button', label: 'End the party', confirm: true, danger: true });
    const lv = Z.levels(), zoomWs = Z.mode === 'auto' ? (Z.target || Z.normal()) : Z.mode;
    const camera = [
      { id: 'zoom', kind: 'choice', label: 'Zoom', value: Z.describe(), bar: [lv.findIndex((l) => l.ws === zoomWs), lv.length], auto: Z.mode === 'auto' },
      { id: 'zauto', kind: 'button', label: Z.mode === 'auto' ? 'Auto zoom is on' : 'Back to auto zoom', hot: Z.mode === 'auto' },
    ];
    if (P.big) camera.push({ id: 'map', kind: 'button', label: P.bigMapOpen ? 'Hide the world map' : 'Show the world map' });
    const vol = (k) => Math.round((P.game.settings[k] ?? 0.7) * 10);
    const options = [
      { id: 'diff', kind: 'choice', label: 'Difficulty', value: t(D.name), bar: [DIFF_ORDER.indexOf(this.opts.diff), DIFF_ORDER.length] },
      { id: 'ff', kind: 'choice', label: 'Friendly fire', value: t(this.opts.ff ? 'On' : 'Off'), sub: 'friends can bonk each other in team fights' },
      { id: 'music', kind: 'choice', label: 'Music', value: vol('music') * 10 + '%', bar: [vol('music'), 11] },
      { id: 'sfx', kind: 'choice', label: 'Sounds', value: vol('sfx') * 10 + '%', bar: [vol('sfx'), 11] },
      { id: 'lang', kind: 'choice', label: 'Language', value: LANGS[getLang()] },
      // (files and keys want the big screen's mouse: not in the host phone's copy of the menu)
      { id: 'saves', kind: 'button', label: 'Saves & backups', sub: 'save now, export or import a file, an online backup', screen: true },
    ];
    const players = P.players.map((q) => ({
      id: 'p:' + q.slot, kind: 'player', label: q.name, color: q.color,
      sub: !q.connected ? 'away' : this.isHost(q) ? 'host ♛' : q.kind === 'phone' ? 'here' : q.kind === 'keys' ? 'keyboard' : 'gamepad',
      action: !q.connected || q.kind !== 'phone' ? 'Remove' : this.isHost(q) ? null : 'Give the crown',
      confirm: !q.connected || q.kind !== 'phone', host: this.isHost(q), away: !q.connected,
    }));
    const tabs = [
      { id: 'game', label: 'Game', items: game },
      { id: 'invite', label: 'Invite', items: P.inviteItems() },
      { id: 'camera', label: 'Camera', items: camera },
      { id: 'options', label: 'Options', items: options },
      { id: 'players', label: 'Players', items: players },
    ];
    // fast travel between the waystones the party has touched (while exploring)
    const T = P.travel;
    if (T && T.active() && T.attuned().length > 1) tabs.splice(1, 0, { id: 'travel', label: 'Travel', items: T.menuItems() });
    return tabs;
  }

  // do something from the menu (dir: -1/+1 for choices, 0 = press)
  act(id, dir = 0, from = null) {
    const P = this.party, g = P.game, Z = P.zoom;
    const who = from ? from.name : t('The big screen');
    if (id === 'pause') { this.setPaused(!P.paused, who); return; }
    if (id === 'skip') { if (P.dialogue.active) P.dialogue.skip(); return; }
    if (id === 'skipall') { if (P.stage && P.stage.active) { P.stage.skip(); return; } this.skipAll = 1.2; if (P.dialogue.active) P.dialogue.skip(); return; }
    if (id === 'vote') { if (P.phase === 'lobby' && !P.vote && !P.choosing) P.chooseActivity(); this.closeMenu(); return; }
    if (id === 'restart') { this.setPaused(false); this.closeMenu(); P.restartActivity(); return; }
    if (id === 'unstuck') { for (const q of P.players) if (q.connected) P.unstick(q, true); this.closeMenu(); return; }
    if (id === 'camp') { const q = from || P.players.find((r) => this.isHost(r) && r.connected) || P.players.find((r) => r.connected); this.closeMenu(); if (q && P.camp) P.camp.build(q); return; }
    if (id.startsWith('act:')) { this.setPaused(false); this.closeMenu(); P.switchActivity(id.slice(4)); return; }
    if (id === 'lobby') { this.setPaused(false); this.closeMenu(); if (P.phase !== 'lobby') P.backToLobby(); return; }
    if (id === 'end') { this.closeMenu(); P.exit(); return; }
    // (with the world map open, the zoom rocker zooms the map)
    if (id === 'zoom' && P.bigMapOpen && dir) { P.mapView.step(dir > 0 ? 1 : -1, null, null, P.centroid()); return; }
    if (id === 'zoom') { if (dir) Z.step(dir > 0 ? 1 : -1); else Z.set('auto'); Z.flashT = 1.8; this.opts.zoom = Z.mode; this.saveOpts(); return; }
    if (id === 'zauto') { Z.set('auto'); Z.flashT = 1.8; this.opts.zoom = 'auto'; this.saveOpts(); return; }
    if (id === 'map') { P.bigMapOpen = !P.bigMapOpen; return; }
    if (id.startsWith('inv:')) { const it = P.inviteItems().find((x) => x.id === id); if (it && it.url) copyText(it.url).then((ok) => P.toast(t(ok ? 'Link copied — send it to your friends!' : 'Couldn’t copy: the link is on the screen'), '#8fd67a')); return; }
    if (id === 'saves') { if (!from) { this.closeMenu(); g.saves.open(); } return; }
    if (id.startsWith('tv:')) { const q = P.players.find((x) => x.slot === +id.slice(3)); this.closeMenu(); if (q && !P.tvmenus.blocked()) { if (P.tvmenus.cur) P.tvmenus.close(P.tvmenus.cur.p, true); P.tvmenus.openFor(q); } return; }
    if (id.startsWith('travel:')) { this.setPaused(false); this.closeMenu(); if (P.travel) P.travel.goByName(id.slice(7)); return; }
    if (id === 'diff') {
      const i = DIFF_ORDER.indexOf(this.opts.diff);
      this.opts.diff = DIFF_ORDER[(i + (dir || 1) + DIFF_ORDER.length) % DIFF_ORDER.length];
      this.saveOpts();
      P.toast(t('Difficulty: {level}', { level: t(this.diff().name) }), '#ffd66b');
      return;
    }
    if (id === 'ff') { this.opts.ff = !this.opts.ff; this.saveOpts(); P.toast(t(this.opts.ff ? 'Friendly fire on — careful!' : 'Friendly fire off'), '#ef6479'); return; }
    if (id === 'music' || id === 'sfx') {
      const st = g.settings, cur = st[id] ?? 0.7;
      const v = dir ? cur + dir * 0.1 : cur >= 0.99 ? 0 : cur + 0.1;
      st[id] = Math.round(Math.max(0, Math.min(1, v)) * 10) / 10;
      audio.setVolume(id, st[id]);
      saveSettings(st);
      if (id === 'sfx') audio.sfx('select');
      return;
    }
    if (id === 'lang') {
      const ls = Object.keys(LANGS), i = ls.indexOf(getLang());
      const next = ls[(i + (dir || 1) + ls.length) % ls.length];
      g.settings.lang = next;
      saveSettings(g.settings);
      setLang(next);
      return;
    }
    if (id.startsWith('p:')) {
      const q = P.players.find((x) => x.slot === +id.slice(2));
      if (!q) return;
      if (!q.connected || q.kind !== 'phone') { P.removePlayer(q); if (this.isHost(q)) this.give(this.heir()); }
      else if (!this.isHost(q)) this.give(q);
    }
  }

  setPaused(on, who = '') {
    const P = this.party;
    if (!!P.paused === !!on) return;
    P.paused = on ? { by: who } : null;
    audio.muffle(!!on);
    audio.sfx(on ? 'close' : 'open', { volume: 0.6 });
    P.net.broadcast({ t: 'pause', v: !!on, by: who });
    for (const p of P.players) p.input.release && p.input.release();
  }

  // ------------------------------------------------------------------ the host phone
  onMsg(p, d) {
    if (!this.isHost(p)) return;
    if (d.t === 'hact' && typeof d.id === 'string') { this.act(d.id, Math.sign(Number(d.dir) || 0), p); this.sentKey = ''; }
  }

  sync() {
    const h = this.player;
    if (!h || h.kind !== 'phone' || !h.connected) return;
    const tabs = this.tabs().map((tb) => ({
      id: tb.id, label: t(tb.label),
      items: tb.items.filter((it) => !it.screen).map((it) => ({ ...it, label: it.kind === 'player' ? it.label : label(it), sub: it.sub ? t(it.sub) : '', action: it.action ? t(it.action) : null })),
    }));
    const msg = { t: 'hmenu', tabs, paused: !!this.party.paused, title: t('Host menu') };
    const key = JSON.stringify(msg);
    if (key === this.sentKey) return;
    this.sentKey = key;
    this.party.net.send(h.id, msg);
  }

  // ------------------------------------------------------------------ the big screen's menu
  openMenu(tab = null) {
    const i = tab ? this.tabs().findIndex((tb) => tb.id === tab) : 0;
    this.menu = { tab: Math.max(0, i), sel: 0, confirm: null, t: 0 };
    audio.sfx('open', { volume: 0.6 });
    this.setPaused(true, t('The big screen'));
  }

  closeMenu() {
    if (!this.menu) return;
    this.menu = null;
    this.party.game.input.consume();
    this.setPaused(false);
  }

  activateMenuItem(it, dir = 0) {
    const M = this.menu;
    if (!it || (it.kind === 'player' && !it.action)) return;
    if (it.confirm && M.confirm !== it.id) { M.confirm = it.id; audio.sfx('select'); return; }
    M.confirm = null;
    audio.sfx('confirm', { volume: 0.6 });
    this.act(it.id, dir);
    if (this.menu === M && it.id === 'pause') this.closeMenu();
  }

  updateMenu(dt) {
    const M = this.menu, g = this.party.game.input;
    M.t += dt;
    const tabs = this.tabs();
    M.tab = Math.max(0, Math.min(tabs.length - 1, M.tab));
    const items = tabs[M.tab].items;
    M.sel = Math.max(0, Math.min(items.length - 1, M.sel));
    const select = (i) => { if (M.sel !== i) { M.sel = i; M.confirm = null; audio.sfx('select', { volume: 0.4 }); } };
    const tab = (i) => { M.tab = (i + tabs.length) % tabs.length; M.sel = 0; M.confirm = null; audio.sfx('page', { volume: 0.4 }); };
    if (g.pressed('cancel') || g.pressed('pause')) { g.consume(); if (M.confirm) M.confirm = null; else this.closeMenu(); return; }
    const hit = (this.menuHits || []).find((r) => g.mouseIn(r.x, r.y, r.w, r.h));
    if (hit && g.mouse.moved && hit.sel !== undefined) select(hit.sel);
    if (g.mouse.pressed) {
      g.mouse.pressed = false;
      if (hit) {
        if (hit.close) this.closeMenu();
        else if (hit.tab !== undefined) tab(hit.tab);
        else if (hit.scroll) select(Math.max(0, Math.min(items.length - 1, M.sel + hit.scroll)));
        else if (hit.sel !== undefined) { select(hit.sel); this.activateMenuItem(items[hit.sel], hit.dir || 0); }
      }
      return;
    }
    if (g.mouse.wheel) { select(Math.max(0, Math.min(items.length - 1, M.sel + Math.sign(g.mouse.wheel)))); g.mouse.wheel = 0; }
    if (g.repeat('up')) select((M.sel + items.length - 1) % items.length);
    if (g.repeat('down')) select((M.sel + 1) % items.length);
    const it = items[M.sel], lr = g.repeat('left') ? -1 : g.repeat('right') ? 1 : 0;
    if (lr) {
      if (it?.kind === 'choice') { this.act(it.id, lr); audio.sfx('select', { volume: 0.5 }); }
      else { tab(M.tab + lr); return; }
    }
    if (g.pressed('hotPrev') || g.pressed('menu')) { tab(M.tab - 1); return; }
    if (g.pressed('hotNext')) { tab(M.tab + 1); return; }
    if (g.pressed('interact') || g.pressed('jump')) { g.consume('interact', 'jump'); this.activateMenuItem(it); }
  }

  // the Invite tab: one link for everyone — its QR code (big), what it does, the link itself,
  // the room code and a button to copy it
  drawInvite(ctx, px, top, pw, bottom, items, hit) {
    const P = this.party, it = items[0], x = px + 8, y = top - 2, cw = pw - 16, ch = bottom - top;
    if (!it) return;
    ctx.fillStyle = UI.selEdge; ctx.fillRect(x - 1, y - 1, cw + 2, ch + 2);
    ctx.fillStyle = '#fff7e2'; ctx.fillRect(x, y, cw, ch);
    const q = it.url ? P.qr : null;
    let qs = 0;
    if (q) {
      const m = Math.max(1, Math.floor((ch - 10) / q.width)); qs = q.width * m;
      const qx = x + 6, qy = y + Math.round((ch - qs) / 2);
      ctx.fillStyle = '#8e5d3e'; ctx.fillRect(qx - 2, qy - 2, qs + 4, qs + 4);
      ctx.imageSmoothingEnabled = false; ctx.drawImage(q, qx, qy, qs, qs);
    }
    const tx = x + (qs ? qs + 16 : 8), tw = x + cw - tx - 6;
    let ty = y + 6;
    drawText(ctx, fitText(t(it.label), tw), tx, ty, { color: '#8a5234' }); ty += 14;
    for (const l of wrap(t(it.sub), tw).slice(0, 6)) { drawText(ctx, l, tx, ty, { color: UI.ink }); ty += 10; }
    if (it.url) {
      ty += 4;
      drawText(ctx, fitText(it.url.replace(/^https?:\/\//, '').replace(/#.*$/, ''), tw), tx, ty, { color: '#4f73b6' }); ty += 11;
      if (it.code) drawText(ctx, t('code {code}', { code: it.code }), tx, ty, { color: UI.ink });
    }
    if (it.action) {
      const bl = t(it.action), bw = Math.min(tw, measure(bl) + 16), btnY = y + ch - 18;
      ctx.fillStyle = '#3b2a22'; ctx.fillRect(tx, btnY + 1, bw, 13);
      ctx.fillStyle = '#4f955a'; ctx.fillRect(tx, btnY, bw, 12);
      drawText(ctx, fitText(bl, bw - 6), tx + bw / 2, btnY + 3, { color: '#fff7e6', align: 'center' });
      hit(tx, btnY, bw, 13, { sel: 0 });
    }
    hit(x, y, cw, ch, { sel: 0 });
  }

  drawMenu(ctx) {
    const M = this.menu, P = this.party, W = P.display.w, H = P.display.h;
    ctx.fillStyle = 'rgba(20,14,28,0.55)'; ctx.fillRect(0, 0, W, H);
    const tabs = this.tabs(); M.tab = Math.min(M.tab, tabs.length - 1);
    const items = tabs[M.tab].items; M.sel = Math.max(0, Math.min(M.sel, items.length - 1));
    const pw = Math.min(W - 16, 350), rowH = 16, footerH = 43;
    const ph = Math.min(H - 16, tabs[M.tab].id === 'invite' ? 210 : 42 + items.length * rowH + footerH);
    const px = Math.round((W - pw) / 2), py = Math.round((H - ph) / 2);
    panel(ctx, px, py, pw, ph);
    this.menuHits = [];
    const hit = (x, y, w, h, data) => this.menuHits.push({ x, y, w, h, ...data });
    crown(ctx, px + 10, py + 8, '#e0a526');
    drawText(ctx, fitText(t('Host menu'), pw - 90), px + 24, py + 8, { color: '#8a5234' });
    const closeW = Math.min(60, measure(t('Close')) + 12), closeX = px + pw - closeW - 6;
    ctx.fillStyle = '#e8d6b4'; ctx.fillRect(closeX, py + 4, closeW, 14);
    drawText(ctx, fitText(t('Close'), closeW - 8), closeX + closeW / 2, py + 8, { color: UI.ink, align: 'center' });
    hit(closeX, py + 4, closeW, 14, { close: true });
    const tw = Math.floor((pw - 16) / tabs.length);
    tabs.forEach((tb, i) => {
      const x = px + 8 + i * tw, on = i === M.tab;
      ctx.fillStyle = on ? '#fbf1dc' : '#e8d6b4'; ctx.fillRect(x + 1, py + 22, tw - 2, 14);
      ctx.fillStyle = on ? '#e0a526' : '#c9a77c'; ctx.fillRect(x + 1, py + 22, tw - 2, 2);
      drawText(ctx, fitText(t(tb.label), tw - 6), x + tw / 2, py + 26, { color: on ? UI.ink : UI.inkSoft, align: 'center' });
      hit(x, py + 22, tw, 14, { tab: i });
    });
    const top = py + 42, room = Math.max(1, Math.floor((ph - 42 - footerH) / rowH));
    const invite = tabs[M.tab].id === 'invite';
    if (invite) this.drawInvite(ctx, px, top, pw, py + ph - footerH - 4, items, hit);
    const first = Math.max(0, Math.min(items.length - room, M.sel - room + 2));
    const right = px + pw - (items.length > room ? 23 : 12);
    (invite ? [] : items).slice(first, first + room).forEach((it, k) => {
      const i = first + k, y = top + k * rowH, on = i === M.sel;
      if (on) { ctx.fillStyle = UI.sel; ctx.fillRect(px + 6, y - 3, right - px - 2, rowH - 1); drawText(ctx, '♥', px + 11, y + 1, { color: '#ec5f73' }); }
      const ink = it.danger ? '#a8483a' : it.hot ? '#3f8a4a' : UI.ink;
      let left = px + 20;
      if (it.kind === 'player') { ctx.fillStyle = it.color; ctx.fillRect(left, y, 7, 7); left += 12; }
      else if (it.color) { ctx.fillStyle = it.color; ctx.fillRect(left, y - 1, 3, 10); left += 7; }
      let value = '';
      if (it.kind === 'choice') value = `◂ ${it.value} ▸`;
      else if (it.kind === 'player' && it.action) value = t(it.action);
      const valueW = value ? Math.min(measure(value), Math.floor((right - left) * 0.52)) : 0;
      const text = M.confirm === it.id ? t('press again to confirm') : it.kind === 'player' ? it.label : label(it);
      drawText(ctx, fitText(text, right - left - (valueW ? valueW + 8 : 0)), left, y + 1, { color: M.confirm === it.id ? '#c8454f' : ink });
      if (value) drawText(ctx, fitText(value, valueW), right, y + 1, { color: '#8a5234', align: 'right' });
      // Arrow targets come before the row, so clicking left really decreases the value.
      if (it.kind === 'choice') {
        hit(right - valueW - 3, y - 3, 13, rowH, { sel: i, dir: -1 });
        hit(right - 9, y - 3, 13, rowH, { sel: i, dir: 1 });
      }
      hit(px + 6, y - 3, right - px, rowH, { sel: i });
    });
    if (!invite && items.length > room) {
      const x = px + pw - 16, bottom = top + (room - 1) * rowH;
      for (const [y, dir, glyph] of [[top - 3, -1, '↑'], [bottom - 3, 1, '↓']]) {
        ctx.fillStyle = '#e8d6b4'; ctx.fillRect(x, y, 10, 13);
        drawText(ctx, glyph, x + 2, y + 3, { color: UI.inkSoft }); hit(x, y, 10, 13, { scroll: dir });
      }
    }
    // Descriptions have their own wrapped footer; they never share a line with an action.
    const footY = py + ph - footerH;
    ctx.fillStyle = '#dfc9a4'; ctx.fillRect(px + 8, footY, pw - 16, 1);
    const selected = items[M.sel];
    const description = selected?.sub && !invite ? t(selected.sub) : '';
    wrap(description, pw - 20).slice(0, 2).forEach((line, i) => drawText(ctx, line, px + 10, footY + 5 + i * 9, { color: UI.inkSoft }));
    const hint = t('↑↓ choose · ←→ change or switch tab · {a} confirm · {b} close', { a: ctl('interact'), b: ctl('cancel') });
    drawText(ctx, fitText(hint, pw - 16), px + pw / 2, py + ph - 11, { color: '#a38a65', align: 'center' });
  }

}

// the clipboard, or the old way (an http:// page on the Wi-Fi has no clipboard API)
export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch (e) { /* below */ }
  try {
    const a = document.createElement('textarea'); a.value = text; a.style.position = 'fixed'; a.style.opacity = '0';
    document.body.append(a); a.select(); const ok = document.execCommand('copy'); a.remove(); return ok;
  } catch (e) { return false; }
}

// a menu row's label, translated (place names get a capital letter)
function label(it) {
  if (it.raw) return it.label;
  const s = t(it.label);
  return it.cap ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// a little pixel crown (9×7)
export function crown(ctx, x, y, color = '#e0a526') {
  const g = ['#.#.#.#.#', '#########', '#########', '.#######.', '.#######.'];
  x = Math.round(x); y = Math.round(y);
  ctx.fillStyle = '#5a3b1a';
  for (let j = 0; j < g.length; j++) for (let i = 0; i < 9; i++) if (g[j][i] === '#') ctx.fillRect(x + i, y + j + 1, 1, 1);
  ctx.fillStyle = color;
  for (let j = 0; j < g.length; j++) for (let i = 0; i < 9; i++) if (g[j][i] === '#') ctx.fillRect(x + i, y + j, 1, 1);
  ctx.fillStyle = '#fff3c4'; ctx.fillRect(x + 4, y + 2, 1, 1);
  ctx.fillStyle = '#ec5f73'; ctx.fillRect(x + 2, y + 2, 1, 1); ctx.fillRect(x + 6, y + 2, 1, 1);
}
