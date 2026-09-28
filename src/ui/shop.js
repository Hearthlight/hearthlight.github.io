// Shop screens: buy & sell lists, quantities, prices, owner portrait.

import { drawText, measure, wrap } from '../engine/font.js';
import { panel, button, coinIcon, UI, tag, fitText, ctl, device } from './ui.js';
import { drawIcon } from '../art/icons.js';
import { ITEMS } from '../data/items.js';
import { countItem, addItem, removeItem } from '../state.js';
import { audio } from '../engine/audio.js';
import { t, num } from '../i18n.js';

export const SHOPS = {
  store: {
    title: 'Petal & Seed', label: 'Shop', owner: 'ivy',
    stock: ['seed_turnip', 'seed_carrot', 'seed_strawberry', 'seed_sunflower', 'seed_pumpkin', 'seed_moonbloom', 'net', 'sailcloth', 'f_plant', 'f_flowers', 'c_straw', 'c_catears', 'wp_mint', 'fl_moss'],
    buys: ['crop', 'forage', 'critter'],
  },
  bakery: {
    title: 'Rosa’s Bakery', label: 'Shop', owner: 'rosa',
    stock: ['bread', 'cookie', 'tart', 'f_candles', 'wp_rose', 'fl_check'],
    buys: ['crop', 'food'],
    buyIds: ['berry', 'apple', 'strawberry'],
  },
  cafe: {
    title: 'The Driftwood Café', label: 'Order', owner: 'sol',
    stock: ['coffee', 'cocoa', 'cookie', 'f_radio', 'f_lanterns', 'c_shades', 'wp_honey'],
    buys: [],
  },
  fish: {
    title: 'Finn’s Boathouse', label: 'Trade', owner: 'finn',
    stock: ['u_rod', 'f_tank', 'c_tophat'],
    buys: ['fish', 'junk'],
  },
  farm: {
    title: 'Honeydew Farm Stand', label: 'Shop', owner: 'bram',
    stock: ['egg', 'milk', 'honey', 'seed_wheat', 'seed_pumpkin', 'seed_sunflower', 'f_hay', 'c_straw'],
    buys: ['crop'],
    buyIds: ['wheat', 'apple', 'berry'],
  },
  market: {
    title: 'Pim’s Wandering Market', label: 'Browse', owner: 'merchant',
    // a different selection every week
    pool: ['f_minilight', 'f_musicbox', 'f_lanternset', 'seed_moonbloom', 'c_crown', 'c_witch', 'c_frog', 'f_globe', 'f_telescope', 'wp_night', 'fl_moss', 'u_can', 'f_piano', 'seaglass', 'f_tank'],
    stock: [],
    buys: ['forage', 'fish'],
  },
  carpenter: {
    title: 'Theo’s Workshop', label: 'Shop', owner: 'theo',
    stock: ['f_table', 'f_chair', 'f_rug', 'f_lamp', 'f_shelf', 'f_sofa', 'f_dresser', 'f_catbed', 'f_teddy', 'f_painting', 'f_globe', 'f_telescope', 'f_piano', 'u_can', 'wp_night', 'fl_dark', 'c_witch', 'c_frog', 'c_crown', 'c_haori', 'c_smock', 'c_scarf'],
    buys: ['material'],
  },
};

export class Shop {
  constructor(world) {
    this.world = world;
    this.open_ = false;
    this.tab = 0; // 0 buy, 1 sell
    this.sel = 0;
    this.scroll = 0;
    this.qty = 1;
    this.flash = 0;
  }

  open(id, npc) {
    this.id = id;
    this.def = SHOPS[id];
    this.npc = npc;
    this.open_ = true;
    this.tab = 0; this.sel = 0; this.scroll = 0; this.qty = 1;
    this.msg = null;
    audio.sfx('bell');
    audio.sfx('open');
  }

  close() {
    this.open_ = false;
    audio.sfx('close');
    this.world.input.consume();
  }

  owned(id) {
    const s = this.world.state;
    const d = ITEMS[id];
    if (d.cat === 'upgrade') return id === 'u_rod' ? !!s.flags.rodUpgrade : !!s.flags.canUpgrade;
    if (d.cat === 'clothes') return s.unlocked[d.unlock[0]].includes(d.unlock[1]);
    if (id === 'net') return countItem(s, 'net') > 0;
    return false;
  }

  list() {
    const s = this.world.state;
    if (this.tab === 0 && this.def.pool) {
      // weekly rotation: the three exclusives are always on the cart, plus three from the pool
      const week = Math.floor((s.day - 1) / 7);
      const rest = this.def.pool.slice(3);
      const picks = [];
      for (let k = 0; picks.length < 3 && k < 50; k++) { const id = rest[(week * 5 + k * 7) % rest.length]; if (!picks.includes(id)) picks.push(id); }
      return this.def.pool.slice(0, 3).concat(picks).filter((id) => ITEMS[id]);
    }
    if (this.tab === 0) return this.def.stock.filter((id) => ITEMS[id]);
    const out = [];
    for (const slot of s.bag) {
      if (!slot) continue;
      const d = ITEMS[slot.id];
      if (!d || !d.sell) continue;
      const ok = this.def.buys.includes(d.cat) || (this.def.buyIds || []).includes(slot.id);
      if (ok && !out.includes(slot.id)) out.push(slot.id);
    }
    return out;
  }

  update(dt, input) {
    const s = this.world.state;
    if (this.flash > 0) this.flash -= dt;
    if (input.pressed('cancel') || input.pressed('menu') || input.pressed('pause')) { this.close(); return; }
    const canSell = this.def.buys.length || (this.def.buyIds || []).length;
    if (canSell && (input.pressed('left') || input.pressed('right'))) { this.tab = 1 - this.tab; this.sel = 0; this.scroll = 0; this.qty = 1; audio.sfx('select'); }
    const items = this.list();
    if (input.repeat('up')) { this.sel = Math.max(0, this.sel - 1); this.qty = 1; audio.sfx('select', { volume: 0.5 }); }
    if (input.repeat('down')) { this.sel = Math.min(items.length - 1, this.sel + 1); this.qty = 1; audio.sfx('select', { volume: 0.5 }); }
    if (this.rows) {
      for (const r of this.rows) {
        if (input.mouseIn(r.x, r.y, r.w, r.h)) {
          if (input.mouse.moved) this.sel = r.i;
          if (input.mouse.pressed) { this.sel = r.i; this.transact(items); input.mouse.pressed = false; }
        }
      }
    }
    if (this.tabRects) for (const r of this.tabRects) if (input.mouse.pressed && input.mouseIn(r.x, r.y, r.w, r.h)) { this.tab = r.i; this.sel = 0; this.scroll = 0; audio.sfx('select'); }
    if (this.closeRect && input.mouse.pressed && input.mouseIn(this.closeRect.x, this.closeRect.y, this.closeRect.w, this.closeRect.h)) { this.close(); return; }
    if (input.pressed('interact')) { input.consume('interact'); this.transact(items); }
    void s;
  }

  transact(items) {
    const w = this.world, s = w.state;
    const id = items[this.sel];
    if (!id) return;
    const d = ITEMS[id];
    if (this.tab === 0) {
      if (this.owned(id)) { this.say(t('You already have that!')); audio.sfx('error'); return; }
      if (s.coins < d.price) { this.say(t('Not enough coins…')); audio.sfx('error'); return; }
      if (d.cat === 'upgrade') {
        if (id === 'u_rod') s.flags.rodUpgrade = true;
        if (id === 'u_can') s.flags.canUpgrade = true;
      } else if (d.cat === 'clothes') {
        s.unlocked[d.unlock[0]].push(d.unlock[1]);
      } else if (addItem(s, id, 1) > 0) { this.say(t('Your bag is full!')); audio.sfx('error'); return; }
      s.coins -= d.price;
      audio.sfx('buy');
      this.flash = 0.3;
      this.say(d.cat === 'clothes' ? t('Added to your wardrobe!') : d.cat === 'upgrade' ? t('Upgrade installed!') : t('Bought {item}!', { item: t(d.name) }));
      w.story.check();
    } else {
      if (!removeItem(s, id, 1)) return;
      s.coins += d.sell;
      s.stats.earned += d.sell;
      audio.sfx('sell');
      this.flash = 0.3;
      this.say(t('Sold {item} for {n}¢', { item: t(d.name), n: num(d.sell) }));
      w.story.onSell();
      const left = this.list();
      if (this.sel >= left.length) this.sel = Math.max(0, left.length - 1);
    }
  }

  say(msg) { this.msg = msg; this.msgT = 2; }

  draw(ctx) {
    const w = this.world, s = w.state, W = w.display.w, H = w.display.h;
    ctx.fillStyle = 'rgba(20,14,28,0.45)';
    ctx.fillRect(0, 0, W, H);
    const pw = Math.min(W - 16, 330), ph = Math.min(H - 20, 236);
    const px = Math.round((W - pw) / 2), py = Math.round((H - ph) / 2);
    panel(ctx, px, py, pw, ph);
    // header
    const portrait = w.portraitOf(this.def.owner, 'happy');
    ctx.fillStyle = '#e9d6b0'; ctx.fillRect(px + 8, py + 8, 36, 36);
    if (portrait) ctx.drawImage(portrait, 0, 0, 44, 44, px + 4, py + 4, 44, 44);
    // coins
    const ct = num(s.coins);
    coinIcon(ctx, px + pw - measure(ct) - 22, py + 11);
    drawText(ctx, ct, px + pw - 12, py + 10, { color: this.flash > 0 ? '#b8862a' : UI.ink, align: 'right' });
    drawText(ctx, fitText(t(this.def.title), pw - 52 - measure(ct) - 30), px + 52, py + 10, { color: '#8a5234', scale: 1 });
    const greet = this.msg || t(this.tab === 0 ? 'Take a look around!' : 'What would you like to sell?');
    drawText(ctx, fitText(greet, pw - 60), px + 52, py + 22, { color: UI.inkSoft });
    // tabs
    const canSell = this.def.buys.length || (this.def.buyIds || []).length;
    this.tabRects = [];
    const tabs = (canSell ? ['Buy', 'Sell'] : ['Buy']).map((l) => t(l));
    const tabW = Math.max(40, ...tabs.map((l) => measure(l) + 8));
    tabs.forEach((label, i) => {
      const tx = px + 52 + i * (tabW + 4), ty = py + 34;
      const on = this.tab === i;
      ctx.fillStyle = on ? '#e0a526' : '#c9a77c';
      ctx.fillRect(tx, ty, tabW, 11);
      drawText(ctx, label, tx + tabW / 2, ty + 2, { color: on ? '#3b2a2e' : '#6b4330', align: 'center' });
      this.tabRects.push({ x: tx, y: ty, w: tabW, h: 11, i });
    });
    const switchHint = t('←→ switch');
    if (canSell && px + 52 + 2 * (tabW + 4) + measure(switchHint) <= px + pw - 12) drawText(ctx, switchHint, px + pw - 12, py + 36, { color: UI.inkSoft, align: 'right' });
    // list
    const items = this.list();
    const lx = px + 8, ly = py + 50, lw = pw - 16, rowH = 18;
    const maxRows = Math.floor((ph - 50 - 38) / rowH);
    if (this.sel < this.scroll) this.scroll = this.sel;
    if (this.sel >= this.scroll + maxRows) this.scroll = this.sel - maxRows + 1;
    this.rows = [];
    ctx.fillStyle = '#f3e4c6';
    ctx.fillRect(lx, ly, lw, maxRows * rowH);
    if (!items.length) drawText(ctx, fitText(t(this.tab === 0 ? 'Sold out!' : 'Nothing they’d buy right now.'), lw - 8), lx + lw / 2, ly + 20, { color: UI.inkSoft, align: 'center' });
    for (let i = this.scroll; i < Math.min(items.length, this.scroll + maxRows); i++) {
      const id = items[i], d = ITEMS[id];
      const ry = ly + (i - this.scroll) * rowH;
      const on = i === this.sel;
      if (on) { ctx.fillStyle = UI.sel; ctx.fillRect(lx, ry, lw, rowH); }
      drawIcon(ctx, id, lx + 2, ry + 1);
      const owned = this.tab === 0 && this.owned(id);
      const price = this.tab === 0 ? d.price : d.sell;
      const have = countItem(s, id);
      const showHave = this.tab === 1 || (have && d.cat !== 'clothes' && d.cat !== 'upgrade');
      const nameW = (showHave ? lw - 58 - measure(`×${have}`) - 6 : lw - 6 - (owned ? measure(t('Owned')) : measure(String(price)) + 12) - 6) - 22;
      drawText(ctx, fitText(t(d.name), nameW), lx + 22, ry + 5, { color: owned ? UI.inkSoft : UI.ink });
      if (showHave) drawText(ctx, `×${have}`, lx + lw - 58, ry + 5, { color: UI.inkSoft, align: 'right' });
      if (owned) drawText(ctx, t('Owned'), lx + lw - 6, ry + 5, { color: '#4f955a', align: 'right' });
      else {
        coinIcon(ctx, lx + lw - measure(String(price)) - 16, ry + 6);
        drawText(ctx, String(price), lx + lw - 6, ry + 5, { color: this.tab === 0 && s.coins < price ? '#c8454f' : UI.ink, align: 'right' });
      }
      this.rows.push({ x: lx, y: ry, w: lw, h: rowH, i });
    }
    // scrollbar
    if (items.length > maxRows) {
      const sh = Math.max(8, (maxRows / items.length) * maxRows * rowH);
      const sy = ly + (this.scroll / (items.length - maxRows)) * (maxRows * rowH - sh);
      ctx.fillStyle = '#c9a77c'; ctx.fillRect(lx + lw + 1, ly, 2, maxRows * rowH);
      ctx.fillStyle = '#8e5d3e'; ctx.fillRect(lx + lw + 1, sy, 2, sh);
    }
    // description
    const cur = items[this.sel];
    if (cur) {
      const lines = wrap(ITEMS[cur].desc ? t(ITEMS[cur].desc) : '', pw - 24);
      lines.slice(0, 2).forEach((l, i) => drawText(ctx, i === 1 && lines.length > 2 ? fitText(l + '…', pw - 24) : l, px + 12, py + ph - 32 + i * 10, { color: UI.inkSoft }));
    }
    drawText(ctx, device() === 'pad' ? t('{a} buy/sell · {b} close', { a: ctl('interact'), b: ctl('cancel') }) : t('E buy/sell · Esc close'), px + pw - 12, py + ph - 12, { color: '#b8a080', align: 'right' });
    this.closeRect = { x: px + pw - 16, y: py + 2, w: 14, h: 12 };
    drawText(ctx, '✕', px + pw - 10, py + 4, { color: '#8a5234', align: 'center' });
  }
}
