// Is a hero stuck? They keep pushing the stick but get nowhere (about four seconds for less than
// a tile of headway), or they're boxed in — inside something, or in a pocket too small to live
// in (collision.js stuckAt). Then « Get unstuck » comes forward for a while (the solo game's HUD
// and pause menu, a phone's pill, a bubble on the big screen); nothing moves by itself, and it
// goes away as soon as they walk off.
const WINDOW = 4;            // seconds of pushing that should have gone somewhere
const HEADWAY = 0.9;         // tiles: less than that in WINDOW seconds is going nowhere
const OFFER = 14;            // seconds the offer stays up (unless they walk off)

export class StuckWatch {
  constructor() { this.push = 0; this.trail = []; this.t = 0; this.offer = 0; this.boxedT = 0; this.boxed = false; }
  reset() { this.push = 0; this.trail.length = 0; this.offer = 0; this.boxed = false; }
  // pushing: the stick held (not in a menu); busy: a scene, a boat, a mount… (never "stuck" then);
  // boxedAt(): the collision test, asked at most once a second and only while pushing
  update(dt, { pushing, pos, busy, boxedAt }) {
    this.t += dt;
    if (busy) { this.push = 0; this.trail.length = 0; this.offer = Math.max(0, this.offer - dt); return this.offer > 0; }
    this.push = pushing ? this.push + dt : Math.max(0, this.push - dt * 2);
    const T = this.trail;
    if (!T.length || this.t - T[T.length - 1].t >= 0.25) T.push({ t: this.t, x: pos.x, z: pos.z });
    while (T.length > 2 && this.t - T[1].t > WINDOW) T.shift();
    const o = T[0], span = this.t - o.t, went = Math.hypot(pos.x - o.x, pos.z - o.z);
    if (this.push > 1.5 && boxedAt && this.t - this.boxedT > 1) { this.boxedT = this.t; this.boxed = !!boxedAt(); }
    if (!pushing) this.boxed = this.boxed && this.push > 0;
    const nowhere = this.push >= WINDOW && span >= WINDOW - 0.3 && went < HEADWAY;
    if (nowhere || (this.boxed && this.push > 1.5)) this.offer = OFFER;
    else if (went > 2.5) this.offer = 0;                 // (they walked off: fine after all)
    this.offer = Math.max(0, this.offer - dt);
    return this.offer > 0;
  }
}
