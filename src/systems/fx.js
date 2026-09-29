// World-space 2D effects drawn on the world layer after the 3D render:
// sparkles, hearts, splashes, dust, leaves, smoke, rain, fireworks…
// Positions are 3D (x, y, z in units) and projected each frame.

import { rng } from '../engine/util.js';
import { t } from '../i18n.js';
import { WIND } from '../render/wind.js';

const R = rng(99);

export class Fx {
  constructor(game) {
    this.game = game;
    this.parts = [];
    this.rain = 0;       // 0..1
    this.drops = [];
    this.flakes = [];
    this.driftKind = null;
    this.t = 0;
  }

  clear() { this.parts = []; }

  emit(kind, x, y, z, n = 1, opts = {}) {
    for (let i = 0; i < n; i++) {
      const p = { kind, x, y, z, vx: 0, vy: 0, vz: 0, life: 1, age: 0, size: 1, color: opts.color || '#fff7e6', screen: false };
      switch (kind) {
        case 'sparkle':
          p.vx = (R() - 0.5) * 1.6; p.vz = (R() - 0.5) * 1.2; p.vy = 1 + R() * 1.6; p.life = 0.6 + R() * 0.5;
          p.color = opts.color || ['#fff3a6', '#ffffff', '#ffd66b'][i % 3];
          break;
        case 'heart':
          p.vx = (R() - 0.5) * 0.6; p.vy = 1.4 + R() * 0.4; p.life = 1.2; p.color = '#ec5f73';
          break;
        case 'dust':
          p.vx = (R() - 0.5) * 0.8; p.vz = (R() - 0.5) * 0.4; p.vy = 0.3 + R() * 0.3; p.life = 0.35 + R() * 0.2; p.color = opts.color || '#e8dcc0';
          break;
        case 'splash':
          p.vx = (R() - 0.5) * 2.2; p.vz = (R() - 0.5) * 1.4; p.vy = 1.8 + R() * 1.6; p.life = 0.55; p.color = i % 2 ? '#e7f6f4' : '#9fd0f5';
          break;
        case 'drop':
          p.vx = (R() - 0.5) * 0.4; p.vz = 0.5 + R() * 0.4; p.vy = 0.2; p.life = 0.5; p.color = '#9fd0f5';
          break;
        case 'leaf':
          p.vx = (R() - 0.5) * 0.4; p.vy = -0.4 - R() * 0.3; p.vz = 0.2; p.life = 2.5 + R(); p.color = opts.color || '#6fb85a'; p.phase = R() * 6;
          break;
        case 'smoke':
          p.vx = 0.18 + R() * 0.12; p.vy = 0.55 + R() * 0.2; p.life = 2.4 + R(); p.size = 1; p.color = '#d8d4dc';
          break;
        case 'chimney': // a puff of chimney smoke: rises, slows, drifts with the wind, swells & fades
          p.vx = 0.18 + R() * 0.1; p.vz = -0.05; p.vy = 0.5 + R() * 0.16; p.life = 3.2 + R() * 1.4; p.size = 0.85 + R() * 0.4; p.phase = R() * 6;
          p.color = opts.color || '#ebe7ef'; p.hi = opts.hi || '#ffffff'; p.alpha = opts.alpha ?? 1;
          break;
        case 'water':
          p.vx = (R() - 0.5) * 0.5; p.vz = (R() - 0.5) * 0.5; p.vy = 1.1 + R() * 0.4; p.life = 0.7; p.color = i % 2 ? '#bfe3f2' : '#7cc4e8';
          break;
        case 'soil':
          p.vx = (R() - 0.5) * 1.2; p.vz = (R() - 0.5) * 0.6; p.vy = 0.8 + R() * 0.8; p.life = 0.45; p.color = i % 2 ? '#744d36' : '#8a5f42';
          break;
        case 'note':
          p.vx = 0.3 + R() * 0.2; p.vy = 0.8; p.life = 1.6; p.color = '#8a64b8'; p.phase = R() * 6;
          break;
        case 'firework': {
          const a = R() * Math.PI * 2, s = 2 + R() * 2.5;
          p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s; p.vz = 0; p.life = 1 + R() * 0.6; p.color = opts.color || '#ffd66b'; p.grav = true;
          break;
        }
        case 'ring':
          p.life = 0.8; p.color = opts.color || '#e7f6f4';
          break;
        case 'plink': // a raindrop's ring on a puddle or the water
          p.life = 0.4 + R() * 0.2; p.color = opts.color || '#dcebf5';
          break;
        case 'flash':
          p.life = 0.5; p.color = opts.color || '#fff3c4';
          break;
        case 'text':
          // floating label: pass English (+ opts.vars) and it's translated here
          p.vy = 0.9; p.life = 1.3; p.text = t(opts.text, opts.vars); p.color = opts.color || '#fff7e6';
          break;
        case 'print': // a footprint in the snow
          p.life = 7; p.color = opts.color || '#b8c6e2'; p.phase = opts.phase || 0;
          break;
        case 'burst': { // leaves flung out of a leaf pile
          const a = R() * Math.PI * 2, sp = 0.8 + R() * 1.6;
          p.vx = Math.cos(a) * sp; p.vz = Math.sin(a) * sp * 0.6; p.vy = 1.6 + R() * 1.8; p.life = 1.6 + R(); p.phase = R() * 6;
          p.color = opts.color || ['#d9543c', '#e8883a', '#eab83a', '#c8453a'][i % 4];
          break;
        }
        default: break;
      }
      Object.assign(p, opts.override || {});
      this.parts.push(p);
    }
  }

  update(dt) {
    this.t += dt;
    for (const p of this.parts) {
      p.age += dt;
      if (p.kind === 'leaf') { p.x += Math.sin(p.age * 3 + p.phase) * dt * 0.6; }
      if (p.kind === 'note') { p.x += Math.sin(p.age * 4 + p.phase) * dt * 0.4; }
      // (a breeze bends it over: the harder the wind, the flatter the plume)
      if (p.kind === 'chimney') { const k = WIND.amp.value / 0.055; p.vy *= 1 - 0.22 * k * dt; p.vx += 0.05 * k * k * dt; p.x += Math.sin(p.age * 1.7 + p.phase) * dt * 0.08; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (['sparkle', 'splash', 'water', 'soil', 'dust'].includes(p.kind)) p.vy -= 6 * dt;
      if (p.grav) { p.vy -= 1.2 * dt; p.vx *= 0.985; }
      if (p.kind === 'leaf' && p.y < 0.02) { p.y = 0.02; p.vy = 0; p.vx *= 0.9; p.vz = 0; }
      if (p.kind === 'burst') {
        p.vy -= 4 * dt; p.vx *= 0.97; p.vz *= 0.97; p.x += Math.sin(p.age * 5 + p.phase) * dt * 0.5;
        if (p.y < 0.02) { p.y = 0.02; p.vy = 0; p.vx *= 0.8; p.vz *= 0.8; }
      }
    }
    this.parts = this.parts.filter((p) => p.age < p.life);
    if (this.parts.length > 600) this.parts.splice(0, this.parts.length - 600);
  }

  draw(ctx, r3d) {
    for (const p of this.parts) {
      const s = r3d.project(p.x, p.y, p.z);
      const x = Math.round(s.x), y = Math.round(s.y);
      const k = p.age / p.life;
      switch (p.kind) {
        case 'sparkle': {
          ctx.fillStyle = p.color;
          if (k < 0.5) { ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); }
          else ctx.fillRect(x, y, 1, 1);
          break;
        }
        case 'heart': {
          ctx.globalAlpha = 1 - Math.max(0, k - 0.6) / 0.4;
          ctx.fillStyle = p.color;
          ctx.fillRect(x - 2, y - 1, 2, 2); ctx.fillRect(x + 1, y - 1, 2, 2); ctx.fillRect(x - 2, y, 5, 2); ctx.fillRect(x - 1, y + 2, 3, 1); ctx.fillRect(x, y + 3, 1, 1);
          ctx.fillStyle = '#ffb3bf'; ctx.fillRect(x - 1, y - 1, 1, 1);
          ctx.globalAlpha = 1;
          break;
        }
        case 'chimney': {
          const rad = Math.max(1, Math.round((1.5 + k * 4.4) * p.size * (r3d.ppu / 16)));
          if (x < -rad || y < -rad || x > ctx.canvas.width + rad || y > ctx.canvas.height + rad) break;
          const a = 0.68 * Math.pow(1 - k, 1.2) * Math.min(1, p.age / 0.35) * p.alpha;
          ctx.globalAlpha = a;
          ctx.fillStyle = p.color;
          for (let dy = -rad; dy <= rad; dy++) { const w = Math.floor(Math.sqrt(rad * rad - dy * dy + 0.5)); ctx.fillRect(x - w, y + dy, w * 2 + 1, 1); }
          // (a lighter crown on each puff)
          if (rad >= 3) {
            const r2 = rad - 2;
            ctx.globalAlpha = a * 0.5;
            ctx.fillStyle = p.hi;
            for (let dy = -r2; dy <= 0; dy++) { const w = Math.floor(Math.sqrt(r2 * r2 - dy * dy)); ctx.fillRect(x - w - 1, y + dy - 1, w * 2 + 1, 1); }
          }
          ctx.globalAlpha = 1;
          break;
        }
        case 'smoke': {
          const size = 2 + Math.floor(k * 4);
          ctx.globalAlpha = 0.55 * (1 - k);
          ctx.fillStyle = p.color;
          ctx.fillRect(x - size / 2, y - size / 2, size, size);
          ctx.globalAlpha = 1;
          break;
        }
        case 'plink': {
          const sc = r3d.ppu / 16, rr = (0.7 + k * 3.3) * sc, n = rr < 2 ? 6 : 10;
          ctx.globalAlpha = 0.8 * (1 - k);
          ctx.fillStyle = p.color;
          for (let a = 0; a < n; a++) { const ang = (a / n) * Math.PI * 2; ctx.fillRect(Math.round(x + Math.cos(ang) * rr), Math.round(y + Math.sin(ang) * rr * 0.5), 1, 1); }
          ctx.globalAlpha = 1;
          break;
        }
        case 'ring': {
          const r = 2 + k * 6;
          ctx.globalAlpha = 1 - k;
          ctx.fillStyle = p.color;
          for (let a = 0; a < 16; a++) {
            const ang = (a / 16) * Math.PI * 2;
            ctx.fillRect(Math.round(x + Math.cos(ang) * r), Math.round(y + Math.sin(ang) * r * 0.5), 1, 1);
          }
          ctx.globalAlpha = 1;
          break;
        }
        case 'note': {
          ctx.globalAlpha = 1 - k;
          ctx.fillStyle = p.color;
          ctx.fillRect(x + 1, y - 4, 1, 5); ctx.fillRect(x - 1, y, 2, 2); ctx.fillRect(x + 1, y - 4, 2, 1);
          ctx.globalAlpha = 1;
          break;
        }
        case 'firework': {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = (1 - k) * 0.9;
          ctx.fillStyle = p.color;
          const sz = k < 0.25 ? 3 : k < 0.6 ? 2 : 1;
          ctx.fillRect(x - (sz >> 1), y - (sz >> 1), sz, sz);
          // short trail
          const tp = r3d.project(p.x - p.vx * 0.06, p.y - p.vy * 0.06, p.z);
          ctx.globalAlpha = (1 - k) * 0.45;
          ctx.fillRect(Math.round(tp.x), Math.round(tp.y), 1, 1);
          ctx.restore();
          break;
        }
        case 'flash': {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          const r = 3 + k * 10;
          ctx.globalAlpha = (1 - k) * 0.35;
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
          break;
        }
        case 'text': {
          ctx.globalAlpha = 1 - Math.max(0, k - 0.6) / 0.4;
          this.game.drawText(ctx, p.text, x, y, { color: p.color, align: 'center', shadow: '#2a1f33' });
          ctx.globalAlpha = 1;
          break;
        }
        case 'print': {
          ctx.globalAlpha = Math.min(1, (1 - k) * 2.5) * 0.8;
          ctx.fillStyle = p.color;
          ctx.fillRect(x, y, 2, 1);
          ctx.globalAlpha = 1;
          break;
        }
        case 'burst': {
          // tumbling leaves big enough to read against the leaf litter
          ctx.globalAlpha = Math.min(1, (1 - k) * 3);
          const flip = Math.sin(this.t * 10 + (p.phase || 0)) > 0;
          ctx.fillStyle = '#5a2a1a';
          ctx.fillRect(x, y + 1, flip ? 3 : 2, flip ? 2 : 3);
          ctx.fillStyle = p.color;
          ctx.fillRect(x, y, flip ? 3 : 2, flip ? 2 : 3);
          ctx.fillStyle = '#fff3c4';
          ctx.fillRect(x, y, 1, 1);
          ctx.globalAlpha = 1;
          break;
        }
        case 'leaf': {
          ctx.globalAlpha = Math.min(1, (1 - k) * 3);
          ctx.fillStyle = p.color;
          ctx.fillRect(x, y, 2, 1);
          ctx.globalAlpha = 1;
          break;
        }
        default:
          ctx.globalAlpha = 1 - k * 0.6;
          ctx.fillStyle = p.color;
          ctx.fillRect(x, y, 1, 1);
          ctx.globalAlpha = 1;
      }
    }
  }

  // Screen-space drifting snow, cherry petals or autumn leaves (per biome)
  drawDrift(ctx, w, h, dt, kind, intensity) {
    if (!kind || intensity <= 0.01) { this.flakes.length = 0; this.driftKind = null; return; }
    if (kind !== this.driftKind) { this.flakes.length = 0; this.driftKind = kind; }
    const dens = kind === 'snow' ? 0.0011 : kind === 'petals' ? 0.00032 : 0.00022;
    const want = Math.floor(w * h * dens * intensity);
    const COLS = { snow: ['#ffffff', '#f1f5fc', '#dde6f4'], petals: ['#f7b8d0', '#fbd8e6', '#e98fb2'], leaves: ['#d9543c', '#e8883a', '#eab83a', '#c8453a'] }[kind];
    while (this.flakes.length < want) this.flakes.push({ x: R() * w, y: R() * h, s: kind === 'snow' ? 12 + R() * 14 : 16 + R() * 12, ph: R() * 6, c: COLS[Math.floor(R() * COLS.length)], big: R() < 0.25 });
    if (this.flakes.length > want) this.flakes.length = want;
    for (const f of this.flakes) {
      f.y += f.s * dt;
      f.x += (Math.sin(this.t * 1.1 + f.ph) * (kind === 'snow' ? 6 : 14) + (kind === 'snow' ? -2 : 9)) * dt;
      if (f.y > h + 4 || f.x > w + 6 || f.x < -6) { f.y = -4 - R() * 20; f.x = R() * (w + 20) - 10; }
      const x = Math.round(f.x), y = Math.round(f.y);
      ctx.fillStyle = f.c;
      if (kind === 'snow') ctx.fillRect(x, y, f.big ? 2 : 1, f.big ? 2 : 1);
      else {
        // tumbling 2-px petals / leaves
        const flip = Math.sin(this.t * 4 + f.ph) > 0;
        ctx.fillRect(x, y, flip ? 2 : 1, flip ? 1 : 2);
      }
    }
  }

  // Screen-space rain streaks over the whole world layer
  drawRain(ctx, w, h, dt, intensity) {
    if (intensity <= 0.01) { this.drops.length = 0; return; }
    const want = Math.floor(w * h * 0.0016 * intensity);
    while (this.drops.length < want) this.drops.push({ x: R() * w, y: R() * h, l: 4 + R() * 4, s: 150 + R() * 80, splash: 0 });
    if (this.drops.length > want) this.drops.length = want;
    ctx.fillStyle = 'rgba(190,210,235,0.55)';
    for (const d of this.drops) {
      d.y += d.s * dt; d.x -= d.s * dt * 0.25;
      if (d.y > h || R() < dt * 0.4) {
        // splash
        ctx.fillStyle = 'rgba(220,235,250,0.7)';
        ctx.fillRect(Math.round(d.x) - 1, Math.round(d.y), 1, 1); ctx.fillRect(Math.round(d.x) + 1, Math.round(d.y), 1, 1);
        ctx.fillStyle = 'rgba(190,210,235,0.55)';
        d.y = -10 - R() * 40; d.x = R() * (w + 40);
      }
      for (let i = 0; i < d.l; i++) ctx.fillRect(Math.round(d.x + i * 0.25), Math.round(d.y - i), 1, 1);
    }
    ctx.fillStyle = `rgba(60,70,110,${0.08 * intensity})`;
    ctx.fillRect(0, 0, w, h);
  }
}
