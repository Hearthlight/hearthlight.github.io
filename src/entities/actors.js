// Player, villagers and the pet companion.

import { CharModel, PetModel } from '../models/chars.js';
import { NPCS } from '../data/npcs.js';
import { clamp } from '../engine/util.js';

export class Player {
  constructor(r3d, look) {
    this.model = new CharModel(r3d, look);
    this.pos = { x: 0, z: 0 };
    this.dir = { x: 0, z: 1 };
    this.moving = false;
    this.running = false;
    this.speed = 0;
    this.stepT = 0;
    this.map = 'overworld';
    this.lock = 0;       // >0 while an action animation plays
    this.action = null;  // 'water' | 'fish' | 'plant' | 'pickup' | 'sleep'
    this.actionT = 0;
    this.radius = 0.26;
    this.held = null;    // mesh held in hand (rod/can)
    this.jumpY = 0;      // height above the ground while hopping
    this.jumpV = 0;
    this.squash = 0;     // landing squash (0..1)
    this.onJump = null;  // hooks for sounds & dust
    this.onLand = null;
  }

  get airborne() { return this.jumpY > 0 || this.jumpV > 0; }

  get facingPoint() { return { x: this.pos.x + this.dir.x * 0.85, z: this.pos.z + this.dir.z * 0.85 }; }

  setLook(look) { this.model.setLook(look); }

  update(dt, input, collision, frozen) {
    let vx = 0, vz = 0;
    if (!frozen && this.lock <= 0) {
      const v = input.moveVector();
      vx = v.x; vz = v.y;
    }
    const len = Math.hypot(vx, vz);
    this.running = input.down('run');
    this.moving = len > 0;
    const sp = (this.riding ? (this.running ? 8.6 : 6.8) : this.running ? 5.4 : 3.3) * (this.speedMul ?? 1) * (this.zoneSlow ?? 1);
    if (len > 0) { vx /= len; vz /= len; this.dir = { x: vx, z: vz }; }
    this.vel = this.vel || { x: 0, z: 0 };
    if (this.onIce && !frozen) {
      // slippery! momentum builds slowly and carries you along (bump = bounce)
      const k = Math.min(1, dt * (len > 0 ? 1.5 : 0.35));
      this.vel.x += ((len > 0 ? vx * sp : 0) - this.vel.x) * k;
      this.vel.z += ((len > 0 ? vz * sp : 0) - this.vel.z) * k;
      const ox = this.pos.x, oz = this.pos.z;
      collision.move(this.pos, this.vel.x * dt, this.vel.z * dt, this.radius);
      if (Math.abs(this.pos.x - ox) < Math.abs(this.vel.x * dt) * 0.5) this.vel.x *= -0.35;
      if (Math.abs(this.pos.z - oz) < Math.abs(this.vel.z * dt) * 0.5) this.vel.z *= -0.35;
      const vl = Math.hypot(this.vel.x, this.vel.z);
      this.sliding = vl > 0.4;
      this.speed = vl;
    } else {
      this.sliding = false;
      if (len > 0) {
        this.speed = sp;
        collision.move(this.pos, vx * sp * dt, vz * sp * dt, this.radius);
        this.vel.x = vx * sp; this.vel.z = vz * sp;
      } else { this.speed = 0; this.vel.x = 0; this.vel.z = 0; }
    }
    if (this.lock > 0) this.lock -= dt;
    // hop! (Space) — a springy little jump with a squash on landing
    if (!frozen && this.lock <= 0 && input.pressed('jump')) {
      if (!this.airborne) { this.jumpV = this.jumpPower || (this.riding ? 4.4 : 5.6); this.jumps = 1; if (this.onJump) this.onJump(); }
      else if (this.doubleJump && this.jumps === 1) { this.jumpV = 5; this.jumps = 2; if (this.onJump) this.onJump(true); }
    }
    if (this.airborne) {
      this.jumpV -= 21 * dt;
      this.jumpY += this.jumpV * dt;
      if (this.jumpY <= 0) {
        this.jumpY = 0; this.jumpV = 0; this.squash = 1;
        if (this.onLand) this.onLand();
      }
    }
    if (this.squash > 0) this.squash = Math.max(0, this.squash - dt * 7);
    this.model.root.position.set(this.pos.x, (this.baseY || 0) + this.jumpY, this.pos.z);
    this.model.setAir(this.jumpY);
    this.model.update(dt, { moving: this.moving && !this.airborne && !this.sliding && !this.down, speed: this.running ? 1 : 0.45, dir: this.moving && !this.down ? this.dir : null, expr: this.expr, armPose: this.armPose, armPoseL: this.armPoseL, air: this.airborne && !this.down ? this.jumpV : null, squash: this.squash, slide: this.sliding, down: this.down || this.sleeping, sleep: this.sleeping, lean: this.lean, sit: this.sitting });
  }

  face(x, z) {
    const dx = x - this.pos.x, dz = z - this.pos.z;
    const l = Math.hypot(dx, dz) || 1;
    this.dir = { x: dx / l, z: dz / l };
    this.model.targetFacing = Math.atan2(this.dir.x, this.dir.z);
  }
}

export class Npc {
  constructor(r3d, id) {
    this.id = id;
    this.def = NPCS[id];
    this.model = new CharModel(r3d, this.def.look, { scale: this.def.scale || (this.def.kid ? 0.86 : 1) });
    this.pos = { x: 0, z: 0 };
    this.map = null;
    this.path = null;
    this.target = null;     // { map, x, z, spot }
    this.dir = { x: 0, z: 1 };
    this.moving = false;
    this.talking = false;
    this.speed = this.def.kid ? 2.6 : 2.1;
    this.emoteKind = null;
    this.emoteT = 0;
    this.idleT = Math.random() * 4;
    this.activity = null;
    this.mood = null;
    this.waitT = 0;
    this.override = null;   // story-driven placement
    this.hidden = false;
    this.jumpY = 0; this.jumpV = 0; this.squash = 0; this.hopDelay = -1;
  }

  setEmote(kind, t = 2.2) { this.emoteKind = kind; this.emoteT = t; }

  // a little hop (Pip copies you when you jump near him)
  hop(delay = 0) { if (this.jumpY === 0 && this.jumpV === 0 && this.hopDelay < 0) this.hopDelay = delay; }

  // Called by the world each frame.
  update(dt, world) {
    if (this.emoteT > 0) { this.emoteT -= dt; if (this.emoteT <= 0) this.emoteKind = null; }
    let moving = false;
    if (!this.talking && this.path && this.path.length) {
      if (this.waitT > 0) this.waitT -= dt;
      else {
        const [tx, tz] = this.path[0];
        const dx = tx - this.pos.x, dz = tz - this.pos.z;
        const d = Math.hypot(dx, dz);
        const step = this.speed * dt;
        if (d <= step) {
          this.pos.x = tx; this.pos.z = tz;
          this.path.shift();
          if (!this.path.length) this.onArrive(world);
        } else {
          this.pos.x += (dx / d) * step;
          this.pos.z += (dz / d) * step;
          this.dir = { x: dx / d, z: dz / d };
          moving = true;
        }
      }
    } else if (!this.talking && this.activity === 'play') {
      // Pip wanders playfully around his spot
      this.idleT -= dt;
      if (this.idleT <= 0 && this.target && this.map === this.target.map) {
        this.idleT = 2 + Math.random() * 3;
        const ang = Math.random() * Math.PI * 2;
        const nx = this.target.x + Math.cos(ang) * 1.6, nz = this.target.z + Math.sin(ang) * 1.2;
        const col = world.collisionFor(this.map);
        if (col && !col.blocked(nx, nz, 0.25)) this.path = [[nx, nz]];
      }
    }
    this.moving = moving;
    if (this.talking && this.lookAt) {
      const dx = this.lookAt.x - this.pos.x, dz = this.lookAt.z - this.pos.z;
      const l = Math.hypot(dx, dz) || 1;
      this.dir = { x: dx / l, z: dz / l };
    }
    // activity flavour: held props, poses & little particles
    const act = moving ? null : this.activity;
    const PROPS = { fish: 'rod', guitar: 'guitar', saw: 'saw', easel: 'brush', paint: 'brush', garden: 'can', farm: 'can', ranger: 'book', bench: this.id === 'mabel' ? 'book' : null, festival: 'lantern', desk: null, bread: 'loaf', cafe: 'cup' };
    this.model.setProp(this.talking ? null : (PROPS[act] || null));
    const sit = act === 'bench' || act === 'campfire' || act === 'cafe' || act === 'rock';
    // (on a bench or a chair: up on its seat; a rocker rocks with whoever sits in it)
    this.actSeat = sit && this.target && this.target.seat ? this.target.seat : 0;
    const clk = (this.clk = (this.clk || 0) + dt);
    let lean = 0;
    if (act === 'rock' && !this.talking) {
      lean = Math.sin(clk * 1.3) * 0.09;
      if (this.target && this.target.rocker) this.target.rocker.rotation.x = lean;
    }
    this.fxT = (this.fxT || 0) - dt;
    if (this.fxT <= 0 && world.fx && this.map === world.mapId && !this.talking) {
      this.fxT = 0.9 + Math.random() * 0.8;
      if (act === 'guitar') world.fx.emit('note', this.pos.x + 0.2, 1.3, this.pos.z, 1);
      else if (act === 'saw') world.fx.emit('dust', this.pos.x + 0.75, 0.45, this.pos.z + 0.05, 3, { color: '#e8cf9c' });
      else if (act === 'cafe' && Math.random() < 0.35) world.fx.emit('smoke', this.pos.x + (this.restDir ? this.restDir.x * 0.4 : 0), 0.75, this.pos.z, 1, { color: '#f4efe4' });
      else if (act === 'garden' || act === 'farm') world.fx.emit('water', this.pos.x + this.dir.x * 0.6, 0.4, this.pos.z + this.dir.z * 0.6, 3);
      else if (act === 'feed') world.fx.emit('dust', this.pos.x + this.dir.x * 0.7, 0.3, this.pos.z + this.dir.z * 0.7, 4, { color: '#e8c46a' });
      else if (act === 'pray' && Math.random() < 0.4) world.fx.emit('sparkle', this.pos.x, 1.3, this.pos.z - 0.6, 2, { color: '#fff3a6' });
      else if ((act === 'easel' || act === 'paint') && Math.random() < 0.5) world.fx.emit('sparkle', this.pos.x + this.dir.x * 0.5, 1.0, this.pos.z + this.dir.z * 0.5, 2, { color: ['#ec5f73', '#7cc4e8', '#ffd66b'][Math.floor(Math.random() * 3)] });
    }
    const FACE = {
      fish: { x: 0, z: 1 }, guitar: { x: 0, z: 1 }, bench: { x: 0, z: 1 }, river: { x: 1, z: 0 }, easel: { x: 0, z: -1 }, saw: { x: 1, z: 0 }, garden: { x: 0, z: -1 }, sketch: { x: 0, z: 1 }, festival: { x: 0, z: 1 },
      bread: { x: 0, z: -1 }, mend: { x: 0, z: -1 },
      stand: { x: 0, z: 1 }, farm: { x: 0, z: -1 }, feed: { x: 0, z: 1 }, lookout: { x: 0.3, z: -1 }, pray: { x: 0, z: -1 }, campfire: { x: 0.66, z: -0.75 }, ranger: { x: -0.4, z: 0.9 },
    };
    const tf = this.target && this.map === 'overworld' && this.target.face;
    const rest = tf || FACE[act] || this.restDir || null;
    if (this.hopDelay >= 0) { this.hopDelay -= dt; if (this.hopDelay < 0) this.jumpV = this.def.kid ? 5.2 : 4.4; }
    if (this.jumpV !== 0 || this.jumpY > 0) {
      this.jumpV -= 21 * dt; this.jumpY += this.jumpV * dt;
      if (this.jumpY <= 0) { this.jumpY = 0; this.jumpV = 0; this.squash = 1; }
    }
    if (this.squash > 0) this.squash = Math.max(0, this.squash - dt * 7);
    this.model.root.position.set(this.pos.x, (this.baseY || 0) + this.jumpY, this.pos.z);
    this.model.setAir(this.jumpY);
    this.model.update(dt, {
      moving, speed: 0.35, dir: moving || this.talking ? this.dir : rest,
      talking: this.talking && this.speaking, mood: this.mood,
      expr: this.forceExpr || null,
      air: this.jumpY > 0 || this.jumpV > 0 ? this.jumpV : null, squash: this.squash,
      sit, lean,
      // (sawing strokes, loaves set out, a sip of coffee now and then, a net held up to mend)
      armPose: act === 'fish' ? -0.9 : act === 'guitar' ? -0.8 : act === 'festival' ? -1.2 : act === 'bench' && this.id === 'mabel' ? -0.9
        : act === 'saw' ? -0.8 + Math.sin(clk * 8) * 0.32 : act === 'bread' ? -1.15 + Math.sin(clk * 1.7) * 0.14
        : act === 'cafe' ? ((clk % 7) > 5.9 ? -2.05 : -0.6) : act === 'mend' ? -1.55 + Math.sin(clk * 6) * 0.12 : undefined,
      armPoseL: act === 'saw' ? -0.95 : act === 'bread' ? -1.05 + Math.sin(clk * 1.7 + 1.4) * 0.12 : act === 'mend' ? -1.5 + Math.cos(clk * 6) * 0.12 : undefined,
    });
    this.model.root.visible = !this.hidden;
  }

  onArrive(world) {
    if (this.pendingTransfer) {
      const t = this.pendingTransfer;
      this.pendingTransfer = null;
      world.transferNpc(this, t.map, t.x, t.z);
      return;
    }
    if (this.target && this.target.face) this.restDir = this.target.face;
    this.activity = this.target ? this.target.act : null;
    if (this.activity === 'guitar') this.setEmote('note', 3);
  }
}

export class Pet {
  constructor(r3d, pet) {
    this.info = pet;
    this.model = new PetModel(r3d, pet.kind, pet.color);
    this.pos = { x: 0, z: 0 };
    this.dir = { x: 0, z: 1 };
    this.map = 'overworld';
    this.sitT = 0;
    this.emoteKind = null;
    this.emoteT = 0;
    this.happyT = 0;
    this.wanderT = 3;
    this.goal = null;
  }

  setEmote(kind, t = 2) { this.emoteKind = kind; this.emoteT = t; }

  hop(delay = 0.12) { if (this.jumpY === 0 && !this.jumpV && !(this.hopDelay >= 0)) this.hopDelay = delay; }

  update(dt, player, collision, sleepy, riding = false) {
    if (this.emoteT > 0) { this.emoteT -= dt; if (this.emoteT <= 0) this.emoteKind = null; }
    if (this.happyT > 0) this.happyT -= dt;
    // copy the player's hops (a beat later)
    if (this.hopDelay >= 0) { this.hopDelay -= dt; if (this.hopDelay < 0) { this.hopDelay = undefined; this.jumpV = 4.6; } }
    if (this.jumpV || this.jumpY > 0) {
      this.jumpV -= 21 * dt; this.jumpY = (this.jumpY || 0) + this.jumpV * dt;
      if (this.jumpY <= 0) { this.jumpY = 0; this.jumpV = 0; }
    }
    if (riding) {
      // sitting on a boat deck: no walking, just enjoy the breeze
      this.model.root.position.set(this.pos.x, this.baseY || 0, this.pos.z);
      this.model.update(dt, { moving: false, dir: player.dir, happy: true, sit: true });
      return;
    }
    const px = player.pos.x - player.dir.x * 1.0, pz = player.pos.z - player.dir.z * 1.0 + 0.2;
    const dx = px - this.pos.x, dz = pz - this.pos.z;
    const d = Math.hypot(dx, dz);
    let moving = false;
    if (d > 8) { this.pos.x = px; this.pos.z = pz; }
    else if (d > 1.3) {
      const sp = clamp(d * 1.6, 2.2, player.running ? 6.2 : 4.2);
      const ok = collision.move(this.pos, (dx / d) * sp * dt, (dz / d) * sp * dt, 0.2);
      if (!ok && d > 3) { this.pos.x += (dx / d) * sp * dt; this.pos.z += (dz / d) * sp * dt; }
      this.dir = { x: dx / d, z: dz / d };
      moving = true;
      this.sitT = 0;
      this.goal = null;
    } else {
      this.sitT += dt;
      this.wanderT -= dt;
      if (this.wanderT <= 0 && !player.moving) {
        this.wanderT = 3 + Math.random() * 4;
        const a = Math.random() * Math.PI * 2;
        this.goal = { x: player.pos.x + Math.cos(a) * 1.1, z: player.pos.z + Math.sin(a) * 0.9 };
      }
      if (this.goal) {
        const gx = this.goal.x - this.pos.x, gz = this.goal.z - this.pos.z;
        const gd = Math.hypot(gx, gz);
        if (gd > 0.1) {
          collision.move(this.pos, (gx / gd) * 1.2 * dt, (gz / gd) * 1.2 * dt, 0.2);
          this.dir = { x: gx / gd, z: gz / gd };
          moving = true;
        } else this.goal = null;
      }
      if (sleepy && this.sitT > 4 && !this.emoteKind && Math.random() < dt * 0.1) this.setEmote('zzz', 2.5);
    }
    this.model.root.position.set(this.pos.x, (this.baseY || 0) + (this.jumpY || 0), this.pos.z);
    if (this.model.blob) this.model.blob.position.y = 0.01 - (this.jumpY || 0);
    this.model.update(dt, { moving: moving && !(this.jumpY > 0), dir: moving ? this.dir : null, happy: this.happyT > 0 || this.jumpY > 0, sit: !moving && this.sitT > 1.5 && !(this.jumpY > 0) });
  }
}
