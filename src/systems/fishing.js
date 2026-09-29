// Fishing: cast, wait for a bite, then a calm "keep the fish in the net"
// reeling minigame. Pools depend on water (sea / river / pond) & time.

import { THREE, toon } from '../render/r3d.js';
import { FISH_POOLS, ITEMS } from '../data/items.js';
import { audio } from '../engine/audio.js';
import { drawText, measure } from '../engine/font.js';
import { t, num } from '../i18n.js';
import { panel, UI, ctl, device } from '../ui/ui.js';
import { drawIcon } from '../art/icons.js';
import { riverX, shoreY, LAKE, WILLOW_LAKE, FARM_POND, FROST_POND, KOI_POND, MARSH, OX, OZ } from '../world/overworld.js';

const MIRROR_POND = { x: OX + 10, z: OZ + 6.5, rx: 5.2, rz: 3.3 };
const inPool = (L, x, z, pad = 1.6) => ((x - L.x) / (L.rx + pad)) ** 2 + ((z - L.z) / (L.rz + pad)) ** 2 <= 1;

export class Fishing {
  constructor(game) {
    this.game = game;
    this.state = 'idle';
    this.t = 0;
    const g = new THREE.Group();
    const red = toon(game.r3d, { color: 0xd9364a });
    const white = toon(game.r3d, { color: 0xf4efe4 });
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), red);
    top.position.y = 0.06;
    const bot = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), white);
    g.add(top, bot);
    this.bobber = g;
    this.bobber.visible = false;
    game.r3d.scene.add(g);
  }

  get active() { return this.state !== 'idle'; }

  waterKind(x, z) {
    if (this.game.mapId !== 'overworld') return null;
    if (inPool(FROST_POND, x, z, 2.5)) return 'ice';
    if (inPool(KOI_POND, x, z)) return 'koi';
    if (inPool(MARSH, x, z, 1)) return 'marsh';
    if (inPool(MIRROR_POND, x, z) || inPool(FARM_POND, x, z)) return 'pond';
    if (inPool(LAKE, x, z) || inPool(WILLOW_LAKE, x, z)) return 'lake';
    if (z < 41) return 'river'; // the stream from Waterfall Lake
    if (Math.abs(x - riverX(z)) < 3.2 && z < shoreY(Math.floor(x)) - 1) return 'river';
    return 'sea';
  }

  cast(target) {
    const g = this.game;
    this.kind = this.waterKind(target.x, target.z);
    this.target = target;
    this.state = 'casting';
    this.t = 0;
    g.player.lock = 0.5;
    audio.sfx('cast');
    this.bobber.position.set(target.x, 0.02, target.z);
  }

  roll() {
    const g = this.game;
    const night = g.state.hour >= 20 || g.state.hour < 5;
    const upgraded = !!g.state.flags.rodUpgrade;
    const pool = FISH_POOLS[this.kind].filter((f) => !f.night || night);
    const weight = (f) => f.w * (f.rare && upgraded ? 1.8 : 1) * (f.id === 'fish_moonfin' && g.story.wantsMoonfin() ? 2.5 : 1);
    const total = pool.reduce((s, f) => s + weight(f), 0);
    let r = Math.random() * total;
    for (const f of pool) { r -= weight(f); if (r <= 0) return f; }
    return pool[0];
  }

  cancel(msg) {
    this.state = 'idle';
    this.bobber.visible = false;
    if (msg) this.game.hud.toast(msg);
  }

  update(dt, input) {
    const g = this.game;
    if (this.state === 'idle') return;
    this.t += dt;
    const pressed = input.pressed('interact') || input.mouse.pressed;
    if (this.state === 'casting') {
      if (this.t > 0.45) {
        this.state = 'waiting';
        this.t = 0;
        this.bobber.visible = true;
        g.fx.emit('ring', this.target.x, 0.02, this.target.z, 1);
        g.fx.emit('splash', this.target.x, 0.05, this.target.z, 4);
        audio.sfx('splash', { volume: 0.5 });
        const fast = (g.state.flags.rodUpgrade ? 0.6 : 1) * (g.state.flags.blessDay === g.state.day ? 0.7 : 1);
        this.wait = (1.8 + Math.random() * 3.6) * fast;
      }
      return;
    }
    if (this.state === 'waiting') {
      this.bobber.position.y = 0.02 + Math.sin(this.t * 3) * 0.015;
      // (a press before anything bites reels the empty line back in — and says why)
      if (pressed) { input.consume('interact'); this.cancel(t('Too soon! Wait until a fish bites.')); g.player.lock = 0.2; return; }
      if (input.pressed('cancel')) { this.cancel(); return; }
      if (this.t > this.wait) {
        this.state = 'bite';
        this.t = 0;
        this.fish = this.roll();
        audio.sfx('bite');
        // (a gamepad rumbles, the phone that drives the game buzzes)
        if (g.wild && g.wild.buzz) g.wild.buzz(g.wild.me, [90, 40, 90]);
        g.player.emote = 'exclaim';
        g.playerEmote('exclaim', 1.1);
        g.fx.emit('splash', this.target.x, 0.05, this.target.z, 5);
      }
      return;
    }
    if (this.state === 'bite') {
      this.bobber.position.y = -0.04 + Math.sin(this.t * 30) * 0.02;
      // (the button still held down since the cast hooks it too: the reel teaches you to hold
      // it, and a fish that always got away because of that was no fun)
      if (pressed || input.down('interact') || input.mouse.down) {
        input.consume('interact');
        this.startReel();
        return;
      }
      if (this.t > 1.15) {
        this.cancel(t('It got away! Press {key} as soon as the “!” pops up.', { key: device() === 'touch' ? t('Use') : ctl('interact') }));
        audio.sfx('error', { volume: 0.5 });
      }
      return;
    }
    if (this.state === 'reel') {
      const rare = !!this.fish.rare;
      const hold = input.down('interact') || input.mouse.down;
      // fish movement: wander between random targets
      this.fishT -= dt;
      if (this.fishT <= 0) {
        this.fishTarget = Math.random();
        this.fishT = rare ? 0.45 + Math.random() * 0.5 : 0.7 + Math.random() * 0.8;
      }
      const fspeed = rare ? 0.75 : 0.42;
      this.fishPos += Math.sign(this.fishTarget - this.fishPos) * Math.min(Math.abs(this.fishTarget - this.fishPos), fspeed * dt);
      // player zone
      this.zoneV += (hold ? 2.3 : -1.7) * dt;
      this.zoneV = Math.max(-1.1, Math.min(1.1, this.zoneV));
      this.zonePos += this.zoneV * dt;
      if (this.zonePos < 0) { this.zonePos = 0; this.zoneV = Math.max(0, this.zoneV) * 0.3; }
      if (this.zonePos > 1 - this.zoneW) { this.zonePos = 1 - this.zoneW; this.zoneV = Math.min(0, this.zoneV) * 0.3; }
      const inside = this.fishPos >= this.zonePos && this.fishPos <= this.zonePos + this.zoneW;
      this.progress += (inside ? 0.36 : -0.16) * dt;
      this.reelSfx -= dt;
      if (inside && this.reelSfx <= 0) { audio.sfx('reel', { volume: 0.4 }); this.reelSfx = 0.28; }
      if (this.progress >= 1) return this.catch();
      if (this.progress <= 0) {
        this.cancel(t('The fish slipped away… so close!'));
        audio.sfx('error', { volume: 0.5 });
      }
    }
    if (this.state === 'show') {
      if (this.t > 0.4 && (pressed || this.t > 3)) { input.consume('interact'); this.state = 'idle'; }
    }
  }

  startReel() {
    this.state = 'reel';
    this.t = 0;
    this.progress = 0.3;
    this.fishPos = 0.5; this.fishTarget = 0.5; this.fishT = 0.3;
    this.zoneW = this.fish.rare ? 0.24 : 0.3;
    this.zonePos = 0.35; this.zoneV = 0;
    this.reelSfx = 0;
    if (!this.game.state.flags.fishTip) { this.game.state.flags.fishTip = true; this.tip = true; }
  }

  catch() {
    const g = this.game;
    this.state = 'show';
    this.t = 0;
    this.bobber.visible = false;
    const id = this.fish.id;
    g.giveItem(id, 1, { quiet: true });
    g.state.stats.fish++;
    g.state.collection[id] = (g.state.collection[id] || 0) + 1;
    audio.jingle('catch');
    g.fx.emit('splash', this.target.x, 0.05, this.target.z, 10);
    g.fx.emit('sparkle', g.player.pos.x, 1.4, g.player.pos.z, 8);
    this.caughtId = id;
    this.caughtNew = g.state.collection[id] === 1;
    g.story.onFish(id);
  }

  draw(ctx) {
    const g = this.game, W = g.display.w, H = g.display.h;
    if (this.state === 'reel') {
      const bw = 150, bh = 36;
      const x = Math.round(W / 2 - bw / 2), y = H - 92;
      panel(ctx, x, y, bw, bh);
      const bx = x + 8, by = y + 8, bl = bw - 16;
      // water bar
      ctx.fillStyle = '#3a7cae'; ctx.fillRect(bx, by, bl, 10);
      ctx.fillStyle = '#4f99c7'; ctx.fillRect(bx, by, bl, 2);
      // zone
      const zx = bx + Math.round(this.zonePos * bl), zw = Math.round(this.zoneW * bl);
      const inside = this.fishPos >= this.zonePos && this.fishPos <= this.zonePos + this.zoneW;
      ctx.fillStyle = inside ? '#8fd66b' : '#b5de7a';
      ctx.fillRect(zx, by - 1, zw, 12);
      ctx.fillStyle = '#5fa453'; ctx.fillRect(zx, by - 1, zw, 1); ctx.fillRect(zx, by + 10, zw, 1);
      // fish
      const fx = bx + Math.round(this.fishPos * bl) - 8;
      drawIcon(ctx, this.fish.id.startsWith('fish_') ? this.fish.id : 'fish_sardine', fx, by - 4);
      // progress
      ctx.fillStyle = '#5a3b2a'; ctx.fillRect(bx, by + 15, bl, 5);
      ctx.fillStyle = this.progress > 0.66 ? '#8fd66b' : this.progress > 0.33 ? '#f2c14e' : '#ec7f6d';
      ctx.fillRect(bx + 1, by + 16, Math.round((bl - 2) * Math.max(0, this.progress)), 3);
      // (the device in hand: a gamepad's or the phone's button, the round one on a touch screen)
      const dev = device();
      const hint = dev === 'touch' ? t('Hold the {use} button to raise the net', { use: t('Use') })
        : dev !== 'keys' ? t(this.tip ? 'Hold {a} to keep the fish in the green net!' : 'Hold {a} to raise the net', { a: ctl('interact') })
          : this.tip ? t('Hold E to keep the fish in the green net!') : t('Hold E / click to raise the net');
      drawText(ctx, hint, W / 2, y - 10, { color: '#fff7e6', align: 'center', shadow: '#2a1f33' });
    }
    if (this.state === 'show' && this.caughtId) {
      const def = ITEMS[this.caughtId];
      const txt = t('You caught a {fish}!', { fish: t(def.name) });
      const sub = this.caughtNew ? t('★ New to your collection!') : t('Worth {n}¢', { n: num(def.sell) });
      // size the card to whichever line is longer (translations run long)
      const bw = Math.max(140, Math.max(measure(txt), measure(sub)) + 56), bh = 44;
      const x = Math.round(W / 2 - bw / 2), y = Math.round(H / 2 - 70);
      panel(ctx, x, y, bw, bh);
      drawIcon(ctx, this.caughtId, x + 8, y + 8, 2);
      drawText(ctx, txt, x + 46, y + 11, { color: UI.ink });
      drawText(ctx, sub, x + 46, y + 24, { color: this.caughtNew ? '#e0a526' : UI.inkSoft });
    }
  }
}
