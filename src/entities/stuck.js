// Is a hero stuck? They keep pushing the stick but get nowhere (about six seconds for less than
// a tile of headway), or they're boxed in — inside something, or in a pocket too small to live
// in (collision.js stuckAt), seen twice in a row. Then « Get unstuck » comes forward for a while
// (the solo game's HUD and pause menu, a phone's pill, a bubble on the big screen); nothing moves
// by itself, and it goes away as soon as they walk off, swim, ride or sail.
import { TT } from '../world/tiles.js';

const WINDOW = 6;            // seconds of pushing that should have gone somewhere
const HEADWAY = 0.6;         // tiles: less than that in WINDOW seconds is going nowhere
const OFFER = 14;            // seconds the offer stays up (unless they walk off)
const QUIET = 45;            // after an offer they didn't need: that long before « going nowhere » asks again

// water beside the hero: never « boxed in » there (they can swim off) — the walking collision
// counts water as a wall, so a hero on a river bank would look shut in
export function nearWater(world, x, z) {
  for (const [dx, dz] of [[0, 0], [0.7, 0], [-0.7, 0], [0, 0.7], [0, -0.7]]) {
    const tt = world.tileAt(x + dx, z + dz);
    if (tt === TT.WATER || tt === TT.CORAL) return true;
  }
  return false;
}

export class StuckWatch {
  constructor() { this.push = 0; this.trail = []; this.t = 0; this.offer = 0; this.boxedT = 0; this.boxed = 0; this.quiet = 0; }
  reset() { this.push = 0; this.trail.length = 0; this.offer = 0; this.boxed = 0; }
  // pushing: the stick held (not in a menu); busy: a scene, a boat, a mount, swimming… (never
  // "stuck" then); boxedAt(): the collision test, asked at most once a second and only while pushing
  update(dt, { pushing, pos, busy, boxedAt }) {
    this.t += dt;
    this.quiet = Math.max(0, this.quiet - dt);
    if (busy) { this.reset(); return false; }
    this.push = pushing ? this.push + dt : Math.max(0, this.push - dt * 2);
    const T = this.trail;
    if (!T.length || this.t - T[T.length - 1].t >= 0.25) T.push({ t: this.t, x: pos.x, z: pos.z });
    while (T.length > 2 && this.t - T[1].t > WINDOW) T.shift();
    const o = T[0], span = this.t - o.t, went = Math.hypot(pos.x - o.x, pos.z - o.z);
    if (this.push > 2 && boxedAt && this.t - this.boxedT > 1) { this.boxedT = this.t; this.boxed = boxedAt() ? this.boxed + 1 : 0; }
    if (!pushing && !this.push) this.boxed = 0;
    const nowhere = !this.quiet && this.push >= WINDOW && span >= WINDOW - 0.3 && went < HEADWAY;
    const was = this.offer > 0;
    if (nowhere || this.boxed >= 2) this.offer = OFFER;
    else if (went > 2.5) this.offer = 0;                 // (they walked off: fine after all)
    this.offer = Math.max(0, this.offer - dt);
    if (was && !this.offer) this.quiet = QUIET;
    return this.offer > 0;
  }
}
