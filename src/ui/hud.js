// Heads-up display: clock & weather, coins, hotbar, quest tracker, minimap,
// toasts, area banners and interaction prompts.

import { drawText, measure, wrap } from '../engine/font.js';
import { panel, keyHint, coinIcon, UI, heart, splitTwo, fitText, tc } from './ui.js';
import { drawIcon } from '../art/icons.js';
import { ITEMS } from '../data/items.js';
import { fmtTime, weekday, HOTBAR, saveSettings } from '../state.js';
import { makeCanvas } from '../engine/gfx.js';
import { TT } from '../world/tiles.js';
import { t, num, getLang } from '../i18n.js';

// how much the HUD shows (Settings « Display », V / LT / the phone / a tap on it cycles them):
// everything · a small minimap and the quest on one line · just the clock, health in a fight
export const HUD_MODES = ['full', 'compact', 'minimal'];
export const HUD_NAMES = { full: 'Full', compact: 'Compact', minimal: 'Minimal' };

// "Mon 3" / « Lun. 3 »
export function dayLabel(day) {
  return t('{weekday} {n}', { weekday: t(weekday(day)), n: day });
}

// "2:30pm" / « 14h30 » / "14:30" (a 24-hour clock everywhere but in English)
export function timeLabel(hour) {
  const l = getLang();
  if (l === 'en') return fmtTime(hour);
  const h = Math.floor(hour) % 24;
  const m = Math.floor((hour % 1) * 60 / 10) * 10;
  return l === 'fr' ? `${h}h${String(m).padStart(2, '0')}` : `${h}:${String(m).padStart(2, '0')}`;
}

// the clock's little sky: sun, moon, clouds or rain (16×16, framed)
export function weatherIcon(ctx, x, y, weather, hour) {
  const night = hour >= 20 || hour < 6;
  const px = (c, xx, yy, w = 1, h = 1) => { ctx.fillStyle = c; ctx.fillRect(x + xx, y + yy, w, h); };
  px('#9fd0f5', 0, 0, 16, 16);
  if (night) px('#34407e', 0, 0, 16, 16);
  else if (hour >= 18) px('#f6c9a0', 0, 0, 16, 16);
  if (weather === 'rain') {
    px('#9aa0b8', 2, 3, 12, 5); px('#b8bcd0', 3, 2, 8, 2);
    for (const [a, b] of [[3, 10], [7, 11], [11, 9], [5, 13], [9, 14]]) px('#4d7fc4', a, b, 1, 2);
  } else if (weather === 'cloudy') {
    if (!night) px('#ffd66b', 9, 3, 4, 4);
    px('#e8eaf2', 2, 6, 12, 5); px('#ffffff', 4, 5, 6, 2);
  } else if (night) {
    px('#f6f0c8', 5, 3, 6, 6); px('#34407e', 8, 3, 3, 4);
    px('#ffffff', 12, 11); px('#ffffff', 3, 12);
  } else {
    px('#ffd66b', 5, 5, 6, 6); px('#fff3a6', 6, 6, 2, 2);
    for (const [a, b] of [[7, 2], [7, 12], [2, 7], [12, 7]]) px('#f2b63d', a, b, 2, 2);
  }
  // frame
  ctx.fillStyle = '#6b4330';
  ctx.fillRect(x - 1, y - 1, 18, 1); ctx.fillRect(x - 1, y + 16, 18, 1); ctx.fillRect(x - 1, y, 1, 16); ctx.fillRect(x + 16, y, 1, 16);
}

export class Hud {
  constructor(game) {
    this.game = game;
    this.toasts = [];
    this.banner = null;
    this.coinShown = null;
    this.coinFlash = 0;
    this.minimap = null;
    this.t = 0;
    this.hotRects = [];
  }

  // toast / tip / banner texts arrive already translated (callers use t())
  toast(text, icon = null, color = UI.ink) {
    const same = this.toasts.find((t) => t.key && t.key === icon && t.age < 2.5 && t.base);
    if (same && icon) {
      same.count += 1;
      same.text = `${same.base} ×${same.count}`;
      same.age = 0;
      return;
    }
    // (long ones — a puzzle room’s rules — wrap and stay long enough to be read)
    this.toasts.push({ text, icon, color, age: 0, key: icon, base: icon ? text : null, count: 1, life: Math.max(3.2, 1.2 + text.length / 16) });
    if (this.toasts.length > 5) this.toasts.shift();
  }

  tip(text, dur = 7) { this.tipData = { text, age: 0, dur }; }

  // a save just happened (by hand or on its own): a little book by the coins for a moment
  saving(ok = true) { this.saveNote = { age: 0, ok }; }

  showBanner(title, sub = '') {
    this.banner = { title, sub, age: 0 };
  }

  // Minimap image: 2px per tile, with building footprints
  buildMinimap(map, world) {
    const S = 2;
    const c = makeCanvas(map.w * S, map.h * S);
    const col = {
      [TT.GRASS]: '#6eaf58', [TT.MEADOW]: '#7dba5c', [TT.FOREST]: '#2f6a45', [TT.PATH]: '#c9a36c', [TT.PLAZA]: '#b3adb3',
      [TT.SAND]: '#e9cf9b', [TT.WATER]: '#3a7cae', [TT.PLANK_H]: '#b07b50', [TT.PLANK_V]: '#b07b50', [TT.SOIL]: '#744d36', [TT.ROCK]: '#8a858e',
      [TT.FIELD]: '#d9b45a', [TT.HILL]: '#8fc46a', [TT.SNOW]: '#eef3fb', [TT.ICE]: '#a9cdec', [TT.LEAVES]: '#c8703a',
      [TT.MARSH]: '#5f7a45', [TT.PETALS]: '#8fc47a',
    };
    for (let z = 0; z < map.h; z++) for (let x = 0; x < map.w; x++) {
      c.ctx.fillStyle = col[map.ground[z * map.w + x]] || '#000';
      c.ctx.fillRect(x * S, z * S, S, S);
    }
    // forest canopy dots
    for (const o of map.objects) {
      if (['oak', 'pine', 'cherry', 'apple', 'palm', 'maple', 'snowpine'].includes(o.type)) {
        c.ctx.fillStyle = o.type === 'cherry' ? '#e8a0b8' : o.type === 'pine' ? '#2a5a3a' : o.type === 'maple' ? '#d9643a' : o.type === 'snowpine' ? '#5f8a78' : '#3f7f4a';
        c.ctx.fillRect(Math.round(o.x * S) - 1, Math.round(o.y * S) - 2, 3, 3);
      }
    }
    for (const b of map.buildings) {
      c.ctx.fillStyle = (b.style && b.style.roof) || '#d65a4f';
      c.ctx.fillRect(b.x * S, b.y * S, b.w * S, b.h * S);
      c.ctx.fillStyle = 'rgba(0,0,0,0.25)';
      c.ctx.fillRect(b.x * S, (b.y + b.h) * S - 1, b.w * S, 1);
    }
    this.minimap = c;
    this.minimapScale = S;
  }

  update(dt) {
    this.t += dt;
    for (const t of this.toasts) t.age += dt;
    this.toasts = this.toasts.filter((t) => t.age < (t.life || 3.2));
    if (this.banner) { this.banner.age += dt; if (this.banner.age > 3.6) this.banner = null; }
    if (this.tipData) { this.tipData.age += dt; if (this.tipData.age > this.tipData.dur) this.tipData = null; }
    if (this.saveNote) { this.saveNote.age += dt; if (this.saveNote.age > 2.6) this.saveNote = null; }
    if (this.modeNote) { this.modeNote.age += dt; if (this.modeNote.age > 1.8) this.modeNote = null; }
    if (this.objShowT > 0) this.objShowT -= dt;
    const coins = this.game.state.coins;
    if (this.coinShown === null) this.coinShown = coins;
    if (this.coinShown !== coins) {
      const d = coins - this.coinShown;
      this.coinShown += Math.sign(d) * Math.max(1, Math.ceil(Math.abs(d) * dt * 6));
      if (Math.abs(coins - this.coinShown) < 1) this.coinShown = coins;
      this.coinFlash = 0.4;
      this.coinChangedAt = this.t;
    }
    if (this.coinFlash > 0) this.coinFlash -= dt;
  }

  mode() { return HUD_MODES.includes(this.game.settings.hud) ? this.game.settings.hud : 'full'; }

  // the next display (full → compact → minimal → full), remembered, and a word about it
  cycleMode() {
    const g = this.game, st = g.settings;
    st.hud = HUD_MODES[(HUD_MODES.indexOf(this.mode()) + 1) % HUD_MODES.length];
    saveSettings(st);
    this.modeNote = { age: 0 };
    this.objShowT = 0;
  }

  draw(ctx) {
    const g = this.game, s = g.state, W = g.display.w, H = g.display.h;
    if (g.hideHud) return;
    const mode = this.mode();
    this.hudRects = [];
    // ---- clock (compact: the day and time on one line · minimal: the time alone)
    let ch = 30;
    if (mode !== 'full') {
      const tl = mode === 'compact' ? dayLabel(s.day) + ' · ' + timeLabel(s.hour) : timeLabel(s.hour), cw = measure(tl) + 22;
      ch = 18;
      panel(ctx, 5, 5, cw, ch);
      this.drawSunMoon(ctx, 10, 10, s.hour, s.weather);
      drawText(ctx, tl, 21, 10, { color: s.hour >= 24 ? '#c8454f' : UI.ink });
    } else {
      panel(ctx, 5, 5, 78, ch);
      this.drawWeatherIcon(ctx, 10, 11, s.weather, s.hour);
      drawText(ctx, dayLabel(s.day), 29, 10, { color: UI.ink });
      drawText(ctx, timeLabel(s.hour), 29, 20, { color: s.hour >= 24 ? '#c8454f' : UI.inkSoft });
    }
    // ---- out in the wild: your hero (health, special, level) — minimal: only hurt or fighting
    if (g.wild) g.wild.drawHero(ctx, 5, 5 + ch + 3, mode === 'minimal');
    // ---- coins (minimal: only for a moment when they change)
    const coinTxt = num(Math.round(this.coinShown));
    const coinW = measure(coinTxt) + 24;
    const coinA = mode !== 'minimal' ? 1 : Math.max(0, Math.min(1, 3.2 - (this.t - (this.coinChangedAt || -99))));
    if (coinA > 0) {
      ctx.globalAlpha = coinA;
      panel(ctx, W - coinW - 5, 5, coinW, 18);
      coinIcon(ctx, W - coinW + 2, 11);
      drawText(ctx, coinTxt, W - 12, 10, { color: this.coinFlash > 0 ? '#b8862a' : UI.ink, align: 'right' });
      ctx.globalAlpha = 1;
    }
    // (on a touch screen, a pause button sits left of the coins)
    this.pauseAt = g.input.touchMode ? { x: W - coinW - 18, y: 14 } : null;
    if (this.saveNote) this.drawSaveNote(ctx, W - coinW - (this.pauseAt ? 32 : 9), 7);

    // ---- minimap (out in the wild lands: the world map around you) — compact: a smaller one
    let ry = mode === 'minimal' && coinA <= 0 ? 5 : 27;
    const wild = g.wild && g.mapId === 'overworld' && g.wild.outside() ? g.wild : null;
    const dun = g.wild && g.wild.dungeons && g.wild.dungeons.heroIn(g.wild.me) ? g.wild.dungeons : null;
    const showMap = mode !== 'minimal', MW = mode === 'compact' ? 52 : 74, MH = mode === 'compact' ? 40 : 56;
    const mapTop = ry;
    if (showMap && dun) {
      const mw = MW, mh = MH, mx = W - mw - 5, my = ry;
      panel(ctx, mx, my, mw, mh);
      dun.drawMini(ctx, mx + 4, my + 4, mw - 8, mh - 8, [g.wild.me]);
      ry += mh + 3;
    } else if (showMap && wild) {
      const mw = MW, mh = MH, mx = W - mw - 5, my = ry;
      panel(ctx, mx, my, mw, mh);
      const p = g.player.pos;
      ctx.save();
      ctx.beginPath(); ctx.rect(mx + 4, my + 4, mw - 8, mh - 8); ctx.clip();
      const M = wild.big.worldMap.draw(ctx, mx + 4, my + 4, mw - 8, mh - 8, p.x, p.z, 1);
      wild.drawMapMarks(ctx, M, true);
      const q = M(p.x, p.z), ax = Math.round(q.x), az = Math.round(q.y);
      ctx.fillStyle = '#3b2a2e'; ctx.fillRect(ax - 2, az - 2, 5, 5);
      ctx.fillStyle = '#ec5f73'; ctx.fillRect(ax - 1, az - 1, 3, 3);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(ax + Math.round(g.player.dir.x), az + Math.round(g.player.dir.z), 1, 1);
      ctx.restore();
      ry += mh + 3;
    } else if (showMap && this.minimap && g.mapId === 'overworld') {
      const mw = MW, mh = MH;
      const mx = W - mw - 5, my = ry;
      panel(ctx, mx, my, mw, mh);
      const S = this.minimapScale;
      const px = g.player.pos.x * S, pz = g.player.pos.z * S;
      const vx = mw - 8, vh = mh - 8;
      const sx = Math.max(0, Math.min(this.minimap.width - vx, Math.round(px - vx / 2)));
      const sy = Math.max(0, Math.min(this.minimap.height - vh, Math.round(pz - vh / 2)));
      ctx.drawImage(this.minimap, sx, sy, vx, vh, mx + 4, my + 4, vx, vh);
      // npc dots
      for (const n of g.npcs) {
        if (n.map !== 'overworld' || n.hidden) continue;
        const nx = n.pos.x * S - sx, nz = n.pos.z * S - sy;
        if (nx < 1 || nz < 1 || nx > vx - 2 || nz > vh - 2) continue;
        ctx.fillStyle = '#fff7e6';
        ctx.fillRect(mx + 4 + nx - 1, my + 4 + nz - 1, 3, 3);
        ctx.fillStyle = '#4d7fc4';
        ctx.fillRect(mx + 4 + nx, my + 4 + nz, 1, 1);
      }
      // quest target
      const tgt = g.questTarget();
      if (tgt && tgt.map === 'overworld') {
        let tx = tgt.x * S - sx, tz = tgt.z * S - sy;
        const inside = tx >= 0 && tz >= 0 && tx < vx && tz < vh;
        tx = Math.max(2, Math.min(vx - 3, tx)); tz = Math.max(2, Math.min(vh - 3, tz));
        const blink = inside || Math.floor(this.t * 3) % 2 === 0;
        if (blink) {
          ctx.fillStyle = '#3b2a2e';
          ctx.fillRect(mx + 4 + tx - 2, my + 4 + tz - 2, 5, 5);
          ctx.fillStyle = '#f2b63d';
          ctx.fillRect(mx + 4 + tx - 1, my + 4 + tz - 1, 3, 3);
        }
      }
      // player arrow
      const ax = mx + 4 + px - sx, az = my + 4 + pz - sy;
      ctx.fillStyle = '#3b2a2e';
      ctx.fillRect(ax - 2, az - 2, 5, 5);
      ctx.fillStyle = '#ec5f73';
      ctx.fillRect(ax - 1, az - 1, 3, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(ax + Math.round(g.player.dir.x), az + Math.round(g.player.dir.z), 1, 1);
      ry += mh + 3;
    }

    if (ry > mapTop) this.hudRects.push({ x: W - MW - 5, y: mapTop, w: MW, h: ry - mapTop - 3 });
    // ---- quest tracker: the title and the objective · compact: the objective on one line ·
    // minimal: a little star (it opens up for a few seconds when the objective changes)
    const q = g.trackedQuest();
    let rightBottom = ry;
    const objKey = q ? q.id + '|' + String(q.objective) : '';
    if (objKey !== this.objKey) { if (this.objKey !== undefined && objKey) this.objShowT = 6; this.objKey = objKey; }
    const qMode = this.objShowT > 0 ? 'full' : mode;
    if (q && qMode === 'minimal') {
      // (a star to click or tap for the whole display again)
      const sx = W - 19, sy = ry;
      panel(ctx, sx, sy, 14, 14);
      drawText(ctx, '★', sx + 7, sy + 3, { color: '#f2b63d', align: 'center' });
      this.hudRects.push({ x: sx, y: sy, w: 14, h: 14 });
      rightBottom = ry + 14;
    } else if (q && qMode === 'compact') {
      const dyn = q.step && typeof q.step.obj === 'function';
      const obj = dyn ? String(q.objective) : t(q.objective);
      const tw = Math.round(Math.min(W * 0.46, Math.max(96, measure(obj) + 20), 210));
      panel(ctx, W - tw - 5, ry, tw, 16);
      drawText(ctx, '★', W - tw + 1, ry + 4, { color: '#f2b63d' });
      drawText(ctx, fitText(obj, tw - 16), W - tw + 10, ry + 4, { color: UI.inkSoft });
      this.hudRects.push({ x: W - tw - 5, y: ry, w: tw, h: 16 });
      rightBottom = ry + 16;
    } else if (q) {
      const tw = Math.round(Math.min(150, Math.max(96, W * (W < 330 ? 0.52 : 0.34))));   // (a narrow screen: wider, fewer lines)
      const lines = [];
      // objectives computed by a function come translated; plain ones are English
      const dyn = q.step && typeof q.step.obj === 'function';
      for (const l of q.objectiveLines || [q.objective]) lines.push(...wrap(dyn ? String(l) : t(l), tw - 13));
      const title = splitTwo(t(q.title), tw - 20).map((l) => fitText(l, tw - 20));
      const th = 20 + (title.length - 1) * 10 + lines.length * 10;
      panel(ctx, W - tw - 5, ry, tw, th);
      drawText(ctx, '★', W - tw + 2, ry + 6, { color: '#f2b63d' });
      title.forEach((l, i) => drawText(ctx, l, W - tw + 11, ry + 6 + i * 10, { color: '#8a5234' }));
      const oy = ry + 17 + (title.length - 1) * 10;
      lines.forEach((l, i) => drawText(ctx, l, W - tw + 4, oy + i * 10, { color: UI.inkSoft }));
      this.hudRects.push({ x: W - tw - 5, y: ry, w: tw, h: th });
      rightBottom = ry + th;
    }
    if (this.modeNote) this.drawModeNote(ctx, W, rightBottom + 4);
    // (a fight's combo counter goes under it)
    if (g.wild && g.wild.combat) g.wild.combat.comboY = rightBottom + 8;

    // ---- hotbar
    this.drawHotbar(ctx, W, H);
    this.drawTouch(ctx, W, H);
    // ---- tip
    let tipTop = H, chipsBottom = H - 38;
    if (this.tipData && !g.dialogue.active) {
      const tp = this.tipData;
      const a = Math.min(1, tp.age * 3, (tp.dur - tp.age) * 2);
      const lines = wrap(tp.text, Math.min(W - 30, 300));
      const tw = Math.max(...lines.map((l) => measure(l))) + 14, th = lines.length * 10 + 8;
      ctx.globalAlpha = Math.max(0, a);
      const tyTop = (g.input.touchMode ? H - 148 : H - 48) - th;
      panel(ctx, W / 2 - tw / 2, tyTop, tw, th, 'dark');
      lines.forEach((l, i) => drawText(ctx, l, W / 2, tyTop + 5 + i * 10, { color: '#fff3c4', align: 'center' }));
      ctx.globalAlpha = 1;
      // toasts stack above the tip when they would overlap it
      if (W / 2 - tw / 2 < 150) tipTop = tyTop - 4;
      chipsBottom = tyTop - 4;
    }
    const chipsAt = chipsBottom;

    // ---- toasts (bottom-left, above hotbar)
    let ty = Math.min(H - 44, tipTop);
    const toastBox = { x0: 5, x1: 5, y0: ty, y1: ty };
    for (let i = this.toasts.length - 1; i >= 0; i--) {
      const t = this.toasts[i], L = t.life || 3.2;
      const a = t.age < 0.2 ? t.age / 0.2 : t.age > L - 0.5 ? (L - t.age) / 0.5 : 1;
      const slide = Math.round((1 - Math.min(1, t.age / 0.18)) * -30);
      const lines = wrap(t.text, Math.min(W - 40, 330) - (t.icon ? 26 : 12));
      const tw = Math.max(...lines.map((l) => measure(l))) + (t.icon ? 26 : 12), th = 8 + lines.length * 10;
      ctx.globalAlpha = Math.max(0, Math.min(1, a));
      panel(ctx, 5 + slide, ty - th, tw, th);
      toastBox.x1 = Math.max(toastBox.x1, 5 + tw); toastBox.y0 = ty - th;
      if (t.icon) drawIcon(ctx, t.icon, 8 + slide, ty - th + 1);
      lines.forEach((l, k) => drawText(ctx, l, 5 + slide + (t.icon ? 22 : 6), ty - th + 5 + k * 10, { color: t.color }));
      ctx.globalAlpha = 1;
      ty -= th + 3;
    }

    // ---- out in the wild lands: what the buttons do right now (over the toasts)
    if (g.wild) { const tb = this.toasts.length ? toastBox : null; g.wild.drawChips(ctx, g.wild.drawActionBar(ctx, chipsAt, tb), tb); }
    this.drawBanner(ctx, W);
  }

  // « Display: compact » under the right-hand column for a moment after a change
  drawModeNote(ctx, W, y) {
    const n = this.modeNote, a = Math.min(1, n.age * 6, (1.8 - n.age) * 3);
    const text = t('Display: {m}', { m: t(HUD_NAMES[this.mode()]) }), w = measure(text) + 10;
    ctx.globalAlpha = Math.max(0, a);
    ctx.fillStyle = 'rgba(30,20,36,0.6)'; ctx.fillRect(W - w - 5, y, w, 13);
    drawText(ctx, text, W - 10, y + 2, { color: '#fff3c4', align: 'right' });
    ctx.globalAlpha = 1;
  }

  // the minimal clock's little sky: a sun, a moon, a cloud (8×8)
  drawSunMoon(ctx, x, y, hour, weather) {
    const night = hour >= 20 || hour < 6, px = (c, a, b, w = 1, h = 1) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, w, h); };
    if (weather === 'rain' || weather === 'cloudy') { px('#b8bcd0', 1, 2, 6, 3); px('#e8eaf2', 2, 1, 3, 2); if (weather === 'rain') { px('#4d7fc4', 2, 6); px('#4d7fc4', 5, 6); } return; }
    if (night) { px('#f6f0c8', 2, 1, 4, 6); px('#f6f0c8', 1, 2, 1, 4); px('#fff8dc', 2, 1, 1, 1); return; }
    px('#ffd66b', 2, 2, 4, 4); px('#fff3a6', 3, 3, 1, 1); for (const [a, b] of [[3, 0], [3, 7], [0, 3], [7, 3]]) px('#f2b63d', a, b, 2, 1);
  }

  // the save note: a book whose pages turn while it writes, then « Saved »
  drawSaveNote(ctx, xr, y) {
    const n = this.saveNote, a = Math.min(1, n.age * 5, (2.6 - n.age) * 2);
    const text = !n.ok ? t('Couldn’t save!') : n.age < 0.55 ? t('Saving…') : t('Saved');
    const w = measure(text) + 19, x = Math.round(xr - w);
    ctx.globalAlpha = Math.max(0, a);
    ctx.fillStyle = 'rgba(30,20,36,0.6)'; ctx.fillRect(x, y, w, 13);
    // the book: covers, pages, a ribbon (a page flips while it's saving)
    const bx = x + 4, by = y + 2;
    ctx.fillStyle = n.ok ? '#8e5d3e' : '#a8483a'; ctx.fillRect(bx, by, 11, 9);
    ctx.fillStyle = '#fff3c4'; ctx.fillRect(bx + 1, by + 1, 4, 7); ctx.fillRect(bx + 6, by + 1, 4, 7);
    ctx.fillStyle = '#5a3b2a'; ctx.fillRect(bx + 5, by, 1, 9);
    if (n.ok && n.age < 0.55) { const k = Math.floor(n.age * 11) % 3; ctx.fillStyle = '#e8d6b4'; ctx.fillRect(bx + 1 + k * 2, by + 1, 3, 7); }
    else { ctx.fillStyle = '#ec5f73'; ctx.fillRect(bx + 7, by + 7, 2, 3); }
    drawText(ctx, text, x + 17, y + 2, { color: n.ok ? '#fff3c4' : '#ffb0a0' });
    ctx.globalAlpha = 1;
  }

  drawBanner(ctx, W = this.game.display.w) {
    if (this.banner) {
      const b = this.banner;
      const a = b.age < 0.5 ? b.age / 0.5 : b.age > 2.8 ? Math.max(0, (3.6 - b.age) / 0.8) : 1;
      ctx.globalAlpha = a;
      // long (French) names go on two lines rather than off the screen
      let sc = 2, title = splitTwo(b.title, W - 38, 2);
      if (title.some((l) => measure(l, 2) > W - 38)) { sc = 1; title = [fitText(b.title, W - 38)]; }
      const lh = 19, extra = (title.length - 1) * lh;
      const sub = b.sub ? fitText(b.sub, W - 38) : '';
      const tw = Math.min(W - 8, Math.max(...title.map((l) => measure(l, sc)), measure(sub)) + 30);
      const bx = Math.round(W / 2 - tw / 2), by = 12 + Math.round((1 - a) * -6);
      ctx.fillStyle = 'rgba(30,20,36,0.55)';
      ctx.fillRect(bx, by, tw, (sub ? 34 : 24) + extra);
      ctx.fillStyle = '#f6d38f';
      ctx.fillRect(bx + 6, by + (sub ? 30 : 21) + extra, tw - 12, 1);
      title.forEach((l, i) => drawText(ctx, l, W / 2, by + 4 + i * lh + (sc === 1 ? 4 : 0), { color: '#fff7e6', align: 'center', scale: sc, shadow: '#2a1f33' }));
      if (sub) drawText(ctx, sub, W / 2, by + 22 + extra, { color: '#f6d38f', align: 'center' });
      ctx.globalAlpha = 1;
    }
  }

  // On-screen controls for touch devices: a stick on the left, buttons on the right
  drawTouch(ctx, W, H) {
    const g = this.game, input = g.input;
    input.touchButtons = [];
    if (!input.touchMode) return;
    const circle = (x, y, r, fill, edge) => {
      ctx.fillStyle = edge;
      for (let yy = -r - 1; yy <= r + 1; yy++) { const hw = Math.floor(Math.sqrt(Math.max(0, (r + 1) ** 2 - yy * yy))); ctx.fillRect(Math.round(x - hw), Math.round(y + yy), hw * 2 + 1, 1); }
      ctx.fillStyle = fill;
      for (let yy = -r; yy <= r; yy++) { const hw = Math.floor(Math.sqrt(Math.max(0, r * r - yy * yy))); ctx.fillRect(Math.round(x - hw), Math.round(y + yy), hw * 2 + 1, 1); }
    };
    // stick
    const st = input.stick;
    const sx = st ? st.ox : 40, sy = st ? st.oy : H - 82;
    ctx.globalAlpha = st ? 0.55 : 0.28;
    circle(sx, sy, 22, 'rgba(255,247,230,0.35)', 'rgba(59,42,46,0.5)');
    let kx = sx, ky = sy;
    if (st) { const dx = st.x - st.ox, dy = st.y - st.oy, l = Math.hypot(dx, dy) || 1, k = Math.min(l, 22); kx = sx + (dx / l) * k; ky = sy + (dy / l) * k; }
    ctx.globalAlpha = st ? 0.9 : 0.45;
    circle(kx, ky, 9, '#fff3c4', '#5a3b2a');
    ctx.globalAlpha = 1;
    // buttons
    const f = g.focus;
    const btn = (action, x, y, r, label, hot) => {
      const held = [...input.touchHeld.values()].includes(action);
      ctx.globalAlpha = held ? 1 : 0.8;
      circle(x, y, r, held ? '#f6d38f' : hot ? '#fff3c4' : '#efdfc0', '#5a3b2a');
      drawText(ctx, label, x, y - 3, { color: '#5a3b2a', align: 'center' });
      ctx.globalAlpha = 1;
      input.touchButtons.push({ action, x, y, r });
    };
    // out in the wild lands the buttons say what they do (Board, Row, Dash…)
    const wc = g.wild && g.mapId === 'overworld' ? g.wild.ctx() || {} : {};
    const fit = (s, w) => (s && measure(s) <= w ? s : null);
    const label = f ? t(f.label) : wc.a ? t(wc.a) : '';
    btn('interact', W - 32, H - 86, 17, fit(label, 32) || t('Use'), !!f || !!wc.a);
    btn('jump', W - 72, H - 64, 13, (wc.b && fit(t(wc.b), 26)) || t('Hop'));
    if (wc.x) btn('special', W - 108, H - 50, 11, fit(t(wc.x), 22) || 'X', true);
    if (wc.y) btn('dodge', W - 38, H - 46, 11, fit(t(wc.y), 22) || 'Y', true);
    // (a word too wide for the little round button — Mochila, Tasche… — becomes a satchel)
    const bag = t('Bag');
    btn('menu', W - 76, H - 104, 10, measure(bag) <= 18 ? bag : '');
    if (measure(bag) > 18) {
      const x = W - 76, y = H - 104;
      ctx.fillStyle = '#5a3b2a';
      ctx.fillRect(x - 5, y - 2, 10, 7); ctx.fillRect(x - 3, y - 5, 6, 1); ctx.fillRect(x - 3, y - 5, 1, 3); ctx.fillRect(x + 2, y - 5, 1, 3);
      ctx.fillStyle = '#efdfc0'; ctx.fillRect(x - 1, y, 2, 2);
    }
    // pause: two bars in a little round button by the coins
    if (this.pauseAt) {
      const { x, y } = this.pauseAt, held = [...input.touchHeld.values()].includes('pause');
      ctx.globalAlpha = held ? 1 : 0.85;
      circle(x, y, 8, held ? '#f6d38f' : '#efdfc0', '#5a3b2a');
      ctx.fillStyle = '#5a3b2a'; ctx.fillRect(x - 3, y - 3, 2, 7); ctx.fillRect(x + 2, y - 3, 2, 7);
      ctx.globalAlpha = 1;
      input.touchButtons.push({ action: 'pause', x, y, r: 10 });
    }
    btn('map', W - 40, H - 128, 10, tc('Map', 'touch button'));
    if (g.state.bag.some((b) => b && b.id === 'bike')) btn('bike', W - 104, H - 84, 10, t('Bike'));
  }

  drawHotbar(ctx, W, H) {
    const g = this.game, s = g.state;
    const n = HOTBAR, sz = 20, gap = 2;
    const tw = n * sz + (n - 1) * gap + 8;
    const x0 = Math.round(W / 2 - tw / 2), y0 = H - sz - 12;
    panel(ctx, x0, y0, tw, sz + 8, 'wood');
    g.input.hotbarRect = { x: x0, y: y0, w: tw, h: sz + 8 };
    this.hotRects = [];
    for (let i = 0; i < n; i++) {
      const x = x0 + 4 + i * (sz + gap), y = y0 + 4;
      const sel = i === s.hot;
      ctx.fillStyle = sel ? '#f6d38f' : '#5a3b2a';
      ctx.fillRect(x, y, sz, sz);
      ctx.fillStyle = sel ? '#fff3c4' : '#4a2e25';
      ctx.fillRect(x + 1, y + 1, sz - 2, sz - 2);
      if (sel) { ctx.fillStyle = '#e0a526'; ctx.fillRect(x, y, sz, 1); ctx.fillRect(x, y + sz - 1, sz, 1); ctx.fillRect(x, y, 1, sz); ctx.fillRect(x + sz - 1, y, 1, sz); }
      const slot = s.bag[i];
      if (slot) {
        drawIcon(ctx, slot.id, x + 2, y + 2);
        if (slot.qty > 1) drawText(ctx, String(slot.qty), x + sz - 2, y + sz - 9, { color: '#fff7e6', align: 'right', shadow: '#2a1f33' });
      }
      this.hotRects.push({ x, y, w: sz, h: sz, i });
    }
    // selected item name
    const slot = s.bag[s.hot];
    if (slot && this.t - (this.hotChangedAt || -10) < 1.8) {
      const name = ITEMS[slot.id] ? t(ITEMS[slot.id].name) : slot.id;
      drawText(ctx, name, W / 2, y0 - 10, { color: '#fff7e6', align: 'center', shadow: '#2a1f33' });
    }
  }

  drawWeatherIcon(ctx, x, y, weather, hour) { weatherIcon(ctx, x, y, weather, hour); }

  // prompt near an interactable (ui coords)
  prompt(ctx, x, y, key, label) {
    keyHint(ctx, x, y, key, label);
  }

  hearts(ctx, x, y, pts) {
    const n = Math.floor(pts / 100);
    for (let i = 0; i < 10; i++) heart(ctx, x + i * 8, y, i < n ? 1 : i === n ? (pts % 100) / 100 : 0);
  }
}
