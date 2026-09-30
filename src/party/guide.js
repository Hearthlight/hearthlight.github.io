// Guides — choose a place on a map, and an arrow at your feet shows the way there (every mode: the
// big screen's map, a player's own menu's, the phones', the solo menu's). A place: { id, name (as shown), x, z, k (its
// mark), major (still shown zoomed far out), st (a word under its name), own (a place this module
// draws on the big screen's maps — an act's; the story's marks draw themselves) } — the act's own
// (`act.places()`: a map's own — its centres, stops, viewpoints, the sights along its trails),
// else the named marks of the maps (waystones, lairs, races, the objective…). The way follows the
// paths and roads (world/big/route.js); the arrow points along it, a line of dots shows the next
// bends and a flag in your colour waits at the place. Each player has their own: a phone picks on
// its map, the keyboard & gamepads on the big screen's map (M) or their own menu's (MapPick).
import { Route } from '../world/big/route.js';
import { collectMarks, drawMark, drawFlag, MARK_MAJOR } from './mapmarks.js';
import { QuietInput } from './inputs.js';
import { drawText, measure } from '../engine/font.js';
import { ctl, fitText, UI } from '../ui/ui.js';
import { drawGlyph } from '../combat/v4/icons.js';
import { audio } from '../engine/audio.js';
import { t } from '../i18n.js';

const ARRIVE = 2.6;          // (tiles from the place: there)
const DOTS = 16;             // (how far ahead the dots show the way, tiles)

// a crisp pixel arrow pointing at angle a (16 directions), in a colour, with a dark rim — cached
const ARROWS = new Map();
function arrowSprite(color, a) {
  const d = ((Math.round((a / (Math.PI * 2)) * 16) % 16) + 16) % 16, key = color + d;
  let c = ARROWS.get(key);
  if (c) return c;
  const S = 15, h = 7, ang = (d / 16) * Math.PI * 2, ux = Math.cos(ang), uy = Math.sin(ang);
  c = document.createElement('canvas'); c.width = S; c.height = S;
  const g = c.getContext('2d'), inside = (px, py, grow) => {
    // (a chevron: a point ahead, two barbs behind, a notch between them)
    const along = px * ux + py * uy, side = -px * uy + py * ux;
    if (along > 5 + grow || along < -4 - grow) return false;
    const half = (5 + grow - along) * 0.78;
    if (Math.abs(side) > half) return false;
    return along > -1.5 - grow || Math.abs(side) > (-1.5 - along) * 1.6 - grow;
  };
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const px = i - h, py = j - h;
    if (inside(px, py, 0)) { g.fillStyle = color; g.fillRect(i, j, 1, 1); }
    else if (inside(px, py, 1.2)) { g.fillStyle = '#241a2e'; g.fillRect(i, j, 1, 1); }
  }
  ARROWS.set(key, c);
  return c;
}

// a name on a dark strip, centred over (x, y)
function nameTag(ctx, text, x, y, color = '#fff3c4') {
  const w = measure(text) + 6, X = Math.round(x - w / 2), Y = Math.round(y);
  ctx.fillStyle = 'rgba(20,14,28,0.72)'; ctx.fillRect(X, Y, w, 11);
  drawText(ctx, text, X + 3, Y + 2, { color });
}

export class Guides {
  constructor(P) {
    this.P = P;
    this.now = 0; this.queue = []; this.R = null;
    this.froze = new Map();       // local players whose hero waits while the big map is open (their real input)
    this.pick = new MapPick(this, () => P.mapView);
    this.iconA = 1; this.still = 0; this.iconR = null; this.wasOpen = false;
    this.last = new Map();        // (where each player was: are they walking?)
  }

  // the searches' map (the big world's, or another world's)
  route() {
    const B = this.P.big;
    if (!B || !B.map || !B.col) return null;
    if (!this.R || this.R.m !== B.map) this.R = new Route(B.col, B.map);
    return this.R;
  }
  onMap(at) { const m = this.P.big && this.P.big.map; return !!m && at.x >= m.X0 && at.z >= m.Z0 && at.x < m.X0 + m.W && at.z < m.Z0 + m.H; }
  posOf(p) { return this.P.rooms ? this.P.rooms.mapPos(p) : p.pos; }
  profOf(p) { const v = p.vehicle; return v && v.kind === 'van' && v.riders[0] === p ? 'van' : 'foot'; }

  // everything you may be guided to (a second's list)
  places() {
    const P = this.P, now = P.t || 0, c = this.cache;
    if (c && now >= c.at && now - c.at < 1) return c.list;
    let list = P.act && P.act.places ? P.act.places() : null;
    if (!list) {
      list = collectMarks(P).filter((m) => m.name).map((m) => ({ id: m.k + '@' + Math.round(m.x) + ',' + Math.round(m.z), name: m.name, st: m.st || '', k: m.k, on: m.on, x: m.x, z: m.z, major: MARK_MAJOR.has(m.k) }));
    }
    this.cache = { at: now, list };
    return list;
  }
  placeNear(x, z, r = 1.6) {
    let best = null, bd = r;
    for (const pl of this.places()) { const d = Math.hypot(pl.x - x, pl.z - z); if (d < bd) { bd = d; best = pl; } }
    return best;
  }

  // ---- a player's way
  set(p, pl) {
    const P = this.P;
    if (!pl) return;
    if (p.guide && p.guide.id === pl.id) { this.clear(p, true); return; }
    p.guide = { id: pl.id, name: pl.name, k: pl.k, x: pl.x, z: pl.z, path: null, i: 0, job: null, planned: -1e9, prof: null, none: false };
    this.plan(p);
    const many = P.players.filter((q) => q.connected !== false).length > 1;
    P.toast(many ? t('{name} is heading for {place}', { name: p.name, place: pl.name }) : t('Heading for {place}', { place: pl.name }), p.color);
    audio.sfx('select', { volume: 0.6 });
    if (P.buzz) P.buzz(p, 25);
  }
  clear(p, said = false) {
    if (!p.guide) return;
    p.guide = null;
    this.queue = this.queue.filter((q) => q !== p);
    if (said) { this.P.toast(t('Guiding stopped'), p.color); audio.sfx('close', { volume: 0.5 }); }
  }
  plan(p) {
    const g = p.guide;
    g.prof = this.profOf(p); g.planned = this.now; g.job = null;
    if (!this.queue.includes(p)) this.queue.push(p);
  }

  update(dt) {
    const P = this.P;
    this.now += dt;
    this.run();
    let moving = false;
    for (const p of P.players) {
      const at = this.posOf(p), l = this.last.get(p);
      if (l && Math.hypot(at.x - l.x, at.z - l.z) > dt * 0.6) moving = true;
      this.last.set(p, { x: at.x, z: at.z });
      const g = p.guide;
      if (!g || !this.onMap(at)) continue;
      // there: a word, a little tune, the flag gone
      const end = g.path && g.path.length ? Math.hypot(g.path[g.path.length - 2] - at.x, g.path[g.path.length - 1] - at.z) : 1e9;
      if (Math.hypot(g.x - at.x, g.z - at.z) < ARRIVE || end < 2) {
        P.toast(t('You’ve arrived: {place}', { place: g.name }), p.color);
        audio.sfx('confirm', { volume: 0.6 });
        if (P.buzz) P.buzz(p, [30, 40, 30]);
        this.clear(p);
        continue;
      }
      // how far along: the nearest point of the way a little behind or ahead of the last
      if (g.path) {
        const pts = g.path, n = pts.length / 2;
        let best = g.i, bd = Infinity;
        for (let k = Math.max(0, g.i - 10); k < Math.min(n, g.i + 80); k++) {
          const d = (pts[k * 2] - at.x) ** 2 + (pts[k * 2 + 1] - at.z) ** 2;
          if (d < bd) { bd = d; best = k; }
        }
        g.i = best; g.off = Math.sqrt(bd);
      }
      // off the way (or into the van, or out of it): a new way — not in a tunnel's dark
      if (!g.job && !this.queue.includes(p) && !(p.vehicle && p.vehicle.tunnel)) {
        const prof = this.profOf(p), since = this.now - g.planned;
        if ((prof !== g.prof && since > 0.8) || (g.path && g.off > 7 && since > 3) || (g.none && since > 10)) this.plan(p);
      }
    }
    this.still = moving ? 0 : this.still + dt;
  }

  // (the searches: one at a time, a slice a frame)
  run() {
    const R = this.route();
    if (!R) return;
    while (this.queue.length) {
      const p = this.queue[0], g = p.guide;
      if (!g || !this.P.players.includes(p)) { this.queue.shift(); continue; }
      if (!g.job) {
        const at = this.posOf(p);
        if (!this.onMap(at)) { this.queue.shift(); continue; }
        g.job = R.start(at.x, at.z, g.x, g.z, g.prof, g.prof === 'van' && this.P.roadRules ? (x, z) => !!this.P.roadRules.stopVan(null, x, z) : null);
        if (!g.job) { this.found(p, null); continue; }
      }
      const st = R.step(g.job, 7000);
      if (st === 'run') return;
      this.found(p, st === 'found' || (st === 'near' && g.prof === 'foot') ? g.job.path : null);
      return;
    }
  }
  found(p, path) {
    const g = p.guide;
    this.queue = this.queue.filter((q) => q !== p);
    g.job = null;
    if (path) { g.path = path; g.i = 0; g.none = false; return; }
    // (no road there for the van: on foot, then — and nothing at all: the arrow points straight there;
    // a place over a drop: the way to the nearest ground below it)
    if (g.prof === 'van') { g.prof = 'foot'; this.queue.push(p); return; }
    g.path = null; g.none = true;
  }

  // where the arrow points: a few tiles along the way (or the place itself)
  ahead(g, at) {
    if (!g.path) return { x: g.x, z: g.z };
    const pts = g.path, n = pts.length / 2;
    let k = g.i, left = 3.5, x = at.x, z = at.z;
    while (k < n - 1 && left > 0) {
      const nx = pts[(k + 1) * 2], nz = pts[(k + 1) * 2 + 1], d = Math.hypot(nx - x, nz - z);
      if (d > 6) break;                          // (a tunnel’s far mouth: aim at this one)
      left -= d; x = nx; z = nz; k++;
    }
    return { x, z };
  }

  // ---- in a view: the arrow at each guided hero's feet, the dots of the way, the flag
  drawView(ctx, v) {
    const P = this.P;
    if (P.phase === 'lobby') return;
    for (const p of v.members) {
      const g = p.guide;
      if (!g || p.gaze || p.aim || (p.hidden && !p.vehicle)) continue;       // (not over a view nor a viewfinder)
      const at = this.posOf(p);
      if (!this.onMap(at) || at !== p.pos) continue;             // (indoors: the guide waits at the door)
      // (everything on the ground where it is: up the stairs of a cliff's trail, on a bridge)
      const W = P.world, gy = (x, z) => (W.groundY ? W.groundY({ x, z }) : 0);
      const u0 = P.toUi(v, at.x, p.actor && p.actor.baseY != null && !p.vehicle ? p.actor.baseY : gy(at.x, at.z), at.z);
      // the dots: the next bends, flowing along the way and fading out ahead
      if (g.path) {
        const pts = g.path, n = pts.length / 2, gap = 1.4;
        let k = g.i, walked = 0, next = 1.2 + ((this.now * 1.6) % gap), px = at.x, pz = at.z;
        while (k < n - 1 && walked < DOTS) {
          const nx = pts[(k + 1) * 2], nz = pts[(k + 1) * 2 + 1], d = Math.hypot(nx - px, nz - pz);
          if (d > 6) break;
          if (walked + d >= next) {
            const f = (next - walked) / d, x = px + (nx - px) * f, z = pz + (nz - pz) * f, q = P.toUi(v, x, gy(x, z), z), X = Math.round(q.x), Y = Math.round(q.y);
            ctx.globalAlpha = Math.min(1, (next - 1) * 1.5) * (1 - next / (DOTS + 1));
            ctx.fillStyle = '#241a2e'; ctx.fillRect(X - 2, Y - 1, 5, 3); ctx.fillRect(X - 1, Y - 2, 3, 5);
            ctx.fillStyle = p.color; ctx.fillRect(X - 1, Y - 1, 3, 3);
            ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(X - 1, Y - 1, 1, 1);
            next += gap;
            continue;
          }
          walked += d; px = nx; pz = nz; k++;
        }
        ctx.globalAlpha = 1;
      }
      // the arrow, a step ahead of the feet, nodding the way
      const a = this.ahead(g, at), u1 = P.toUi(v, a.x, gy(a.x, a.z), a.z), dx = u1.x - u0.x, dy = u1.y - u0.y, L = Math.hypot(dx, dy);
      if (L > 0.5) {
        const ux = dx / L, uy = dy / L, r = 15 + Math.sin(this.now * 5) * 1.5, spr = arrowSprite(p.color, Math.atan2(uy, ux));
        ctx.drawImage(spr, Math.round(u0.x + ux * r - 7), Math.round(u0.y + uy * r - 7 - 3));
      }
      // the flag where you're going, and its name
      const f = P.toUi(v, g.x, gy(g.x, g.z), g.z), R = v.rect, d = P.display, A = d.worldToUi(R.x, R.y), B = d.worldToUi(R.x + R.w, R.y + R.h);
      if (f.x > A.x && f.x < B.x && f.y > A.y + 12 && f.y < B.y) {
        drawFlag(ctx, f.x, f.y - Math.round(Math.abs(Math.sin(this.now * 2.2)) * 2), p.color, this.now);
        nameTag(ctx, g.name, f.x, f.y - 27);
      }
    }
  }

  // ---- on a map: each guided player's way, dotted in their colour, and their flag
  drawOnMap(ctx, M, small = false) {
    for (const p of this.P.players) {
      const g = p.guide;
      if (!g) continue;
      if (g.path) {
        const pts = g.path, n = pts.length / 2, step = small ? 2 : 3;
        let last = null, acc = 0;
        for (let k = g.i; k < n; k++) {
          const q = M(pts[k * 2], pts[k * 2 + 1]);
          if (last) acc += Math.hypot(q.x - last.x, q.y - last.y);
          if (!last || acc >= step) {
            ctx.fillStyle = '#241a2e'; ctx.fillRect(Math.round(q.x) - 1, Math.round(q.y) - 1, 3, 3);
            ctx.fillStyle = p.color; ctx.fillRect(Math.round(q.x), Math.round(q.y), 1, 1);
            acc = 0;
          }
          last = q;
        }
      }
      const q = M(g.x, g.z);
      drawFlag(ctx, q.x, q.y + 1, p.color, this.now);
    }
  }

  // ---- the corner: a discreet map (a click, M or the phone opens it) — there when you stop, when
  // you've just come, under the mouse; gone while everyone's on the move
  drawIcon(ctx, x1, y1) {
    const P = this.P, m = P.game.input.mouse, R = this.iconR;
    if (P.remoteFor) return;               // (a friend at home has their own map, on their screen)
    const near = R && m.x > R.x - 30 && m.y > R.y - 30 && m.x < R.x + R.w + 10 && m.y < R.y + R.h + 10;
    const want = this.now < 10 || this.still > 1.2 || near ? 1 : 0;
    this.iconA += (want - this.iconA) * Math.min(1, (P.lastDt || 1 / 60) * (want ? 5 : 2.5));
    this.iconR = null;
    if (this.iconA < 0.03) { this.iconR = { x: x1 - 22, y: y1 - 20, w: 22, h: 20 }; return; }
    const kb = P.players.some((p) => p.kind === 'keys' && p.connected !== false), key = kb ? ctl('map', 'keys') : '';
    const kw = key ? measure(key) + 6 : 0, w = 22 + (key ? kw + 3 : 0), x = Math.round(x1 - w), y = Math.round(y1 - 20);
    ctx.globalAlpha = this.iconA;
    ctx.fillStyle = 'rgba(20,14,28,0.55)'; ctx.fillRect(x, y, w, 20);
    if (key) {
      ctx.fillStyle = '#fff7e6'; ctx.fillRect(x + 3, y + 4, kw - 2, 9);
      ctx.fillStyle = '#c9a77c'; ctx.fillRect(x + 3, y + 13, kw - 2, 1);
      drawText(ctx, key, x + 2 + kw / 2, y + 5, { color: '#3b2a2e', align: 'center' });
    }
    drawGlyph(ctx, 'map', x + w - 19, y + 2, 1);
    // (someone guided: a dot in their colour on the map)
    const g = P.players.find((p) => p.guide);
    if (g) { ctx.fillStyle = '#241a2e'; ctx.fillRect(x + w - 6, y + 1, 5, 5); ctx.fillStyle = g.color; ctx.fillRect(x + w - 5, y + 2, 3, 3); }
    ctx.globalAlpha = 1;
    this.iconR = { x, y, w, h: 20 };
  }
  // (a click on it opens the map — party.js asks)
  iconClicked() {
    const R = this.iconR, g = this.P.game.input;
    if (!R || !g.mouse.pressed || !g.mouseIn(R.x, R.y, R.w, R.h)) return false;
    g.mouse.pressed = false;
    return true;
  }

  // ---- the big screen's map (M): the heroes on this screen wait while it's open; their stick or
  // arrows hop from place to place, A goes there, X / Y zoom, B (or M, Esc) closes it — the mouse
  // points and a click goes there (for the keyboard's player, else for everyone)
  realOf(p) { return this.froze.get(p) || null; }
  mapInput(dt) {
    const P = this.P, open = !!(P.bigMapOpen && !P.host.menu);
    if (open && !this.wasOpen) this.opened();
    if (!open && this.wasOpen) this.closed();
    this.wasOpen = open;
    if (!open) return;
    const K = this.pick, gi = P.game.input;
    for (const [p, real] of this.froze) {
      if (!p.connected) continue;
      const hop = K.stick(p, real, dt);
      if (hop) K.hop(hop.x, hop.y);
      if (real.pressed('a')) { real.edges.delete('a'); const pl = K.current(); if (pl) { this.set(p, pl); P.bigMapOpen = false; return; } }
      if (real.pressed('x')) { real.edges.delete('x'); P.mapView.step(1, null, null, this.posOf(p)); K.follow(); }
      if (real.pressed('y')) { real.edges.delete('y'); P.mapView.step(-1); }
      if (real.pressed('b')) { real.edges.delete('b'); P.bigMapOpen = false; gi.consume(); return; }
    }
    // the mouse: the place under it; a click goes there
    K.point(gi.mouse.x, gi.mouse.y);
    if (gi.mouse.pressed && K.hover) {
      gi.mouse.pressed = false; P.mapView.drag = null;
      const kb = P.players.find((p) => p.kind === 'keys' && p.connected);
      for (const p of kb ? [kb] : P.players.filter((q) => q.connected)) this.set(p, K.hover.pl);
      P.bigMapOpen = false;
    }
  }
  opened() {
    const P = this.P;
    for (const p of P.players) {
      if (p.kind === 'phone' || !p.connected || P.tvmenus.realOf(p) || P.pchat.realOf(p)) continue;
      this.froze.set(p, p.input);
      p.input = new QuietInput(p.input);
    }
    // (a map bigger than the screen opens close round you)
    const m = P.big && P.big.map, me = [...this.froze.keys()][0] || P.players.find((p) => p.connected);
    if (m && m.region && me) { P.mapView.k = 2; const at = this.posOf(me); P.mapView.cx = at.x; P.mapView.cz = at.z; }
    this.pick.open(me);
  }
  closed() {
    for (const [p, real] of this.froze) { if (p.input instanceof QuietInput) p.input = real; real.edges.clear(); }
    this.froze.clear();
  }
  // over the big map (party.js drawBigMap), after drawWorldPanel: the places, the choice, the words
  drawBigMap(ctx, r) {
    const P = this.P, K = this.pick;
    K.layout(r);
    K.draw(ctx);
    // (what to press: the keyboard's keys if it's here, else a gamepad's)
    const who = [...this.froze.keys()].find((p) => p.kind === 'keys') || [...this.froze.keys()][0];
    const cur = K.current(), mine = cur && who && who.guide && who.guide.id === cur.id;
    const a = who ? P.keyOf(who, 'a') : '', x = who ? P.keyOf(who, 'x') : '', y = who ? P.keyOf(who, 'y') : '';
    const how = who ? t(mine ? '{a}: stop guiding · {x} / {y}: zoom' : '{a}: go there · {x} / {y}: zoom', { a, x, y }) : t('Click a place to go there');
    // (over the map's frame, on the left: its names stay clear)
    if (r) drawText(ctx, fitText(how, r.mw - 190), r.mx, r.my - 12, { color: '#f6d38f', outline: '#241a2e' });
  }

  // ---- a phone: « go there » from its map (the place it tapped, found again here)
  fromPhone(p, d) {
    const x = +d.x, z = +d.z;
    if (!Number.isFinite(x) || !Number.isFinite(z)) return;
    if (d.stop) { this.clear(p, true); return; }
    const pl = this.placeNear(x, z);
    if (pl) this.set(p, pl);
  }
  // …and what its map shows of the way (a phone's map update: tiles, a point every few)
  padWay(p) {
    const g = p.guide;
    if (!g) return null;
    const out = [];
    if (g.path) {
      const pts = g.path, n = pts.length / 2, every = Math.max(1, Math.ceil((n - g.i) / 160));
      for (let k = g.i; k < n; k += every) out.push(Math.round(pts[k * 2] * 2) / 2, Math.round(pts[k * 2 + 1] * 2) / 2);
    }
    return { rt: out, dest: [Math.round(g.x * 10) / 10, Math.round(g.z * 10) / 10, g.name, p.color] };
  }
}

// Picking a place on a big-screen map (the M map, a player's own menu's map page): the stick or the
// arrows hop from place to place that way, the mouse points; zoomed in, the map follows the choice.
export class MapPick {
  constructor(G, view) { this.G = G; this.viewOf = view; this.sel = null; this.hover = null; this.spots = []; this.r = null; this.rep = new Map(); }
  get view() { return this.viewOf(); }
  open(p) {
    const G = this.G, list = G.places();
    this.hover = null;
    if (p && p.guide && list.some((pl) => pl.id === p.guide.id)) { this.sel = p.guide.id; return; }
    // (else the nearest place to you)
    const at = p ? G.posOf(p) : null;
    let best = null, bd = Infinity;
    if (at) for (const pl of list) { const d = Math.hypot(pl.x - at.x, pl.z - at.z); if (d < bd) { bd = d; best = pl; } }
    this.sel = best ? best.id : null;
  }
  current() { const s = this.spots.find((q) => q.pl.id === this.sel); return s ? s.pl : null; }

  // after the map is drawn: each place's spot on it (r: drawWorldPanel's result), and which show at
  // this zoom (far out, an act's big places only — the chosen one and destinations always)
  layout(r) {
    this.r = r;
    this.spots = [];
    if (!r || !r.M) return;
    const far = r.k < 1.5, dest = new Set(this.G.P.players.filter((p) => p.guide).map((p) => p.guide.id));
    for (const pl of this.G.places()) {
      const q = r.M(pl.x, pl.z), inside = q.x >= r.mx && q.y >= r.my && q.x < r.mx + r.mw && q.y < r.my + r.mh;
      this.spots.push({ pl, x: q.x, y: q.y, inside, show: !far || pl.major || !pl.own || pl.id === this.sel || dest.has(pl.id) });
    }
  }

  // a player's stick or arrows: a hop on a push, again and again while held
  stick(p, inp, dt) {
    const v = inp.moveVector(), on = Math.hypot(v.x, v.y) > 0.5, R = this.rep.get(p) || { t: 0, on: false };
    let out = null;
    if (on && !R.on) { out = v; R.t = 0.38; }
    else if (on) { R.t -= dt; if (R.t <= 0) { out = v; R.t = 0.16; } }
    R.on = on; this.rep.set(p, R);
    return out;
  }
  hop(dx, dy) {
    const L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, list = this.spots.filter((s) => s.show);
    const cur = list.find((s) => s.pl.id === this.sel);
    if (!cur) { if (list.length) this.sel = list[0].pl.id; return; }
    let best = null, bs = Infinity;
    for (const s of list) {
      if (s === cur) continue;
      const vx = s.x - cur.x, vy = s.y - cur.y, d = Math.hypot(vx, vy);
      if (d < 0.5) continue;
      const along = (vx * ux + vy * uy) / d;
      if (along < 0.4) continue;
      const score = d * (2.4 - along * 1.4);
      if (score < bs) { bs = score; best = s; }
    }
    if (!best) return;
    this.sel = best.pl.id;
    audio.sfx('select', { volume: 0.35 });
    this.follow();
  }
  // (zoomed in: the choice off the edge brings the map round to it)
  follow() {
    const V = this.view, s = this.spots.find((q) => q.pl.id === this.sel), r = this.r;
    if (!V || !V.k || !s || !r) return;
    if (s.x < r.mx + 12 || s.y < r.my + 12 || s.x > r.mx + r.mw - 12 || s.y > r.my + r.mh - 24) { V.cx = s.pl.x; V.cz = s.pl.z; }
  }
  // the mouse: the place under it (the nearest within a few pixels)
  point(mx, my) {
    let best = null, bd = 8;
    for (const s of this.spots) { if (!s.show || !s.inside) continue; const d = Math.hypot(s.x - mx, s.y - my); if (d < bd) { bd = d; best = s; } }
    this.hover = best;
  }

  draw(ctx) {
    const r = this.r;
    if (!r) return;
    const time = this.G.now;
    ctx.save();
    ctx.beginPath(); ctx.rect(r.mx, r.my, r.mw, r.mh); ctx.clip();
    // (the places the map doesn't draw itself: an act's own)
    for (const s of this.spots) if (s.show && s.inside && s.pl.own) drawMark(ctx, { k: s.pl.k, on: s.pl.on }, s.x, s.y, time);
    const cur = this.spots.find((q) => q.pl.id === this.sel && q.inside);
    for (const s of [cur, this.hover]) {
      if (!s) continue;
      const x = Math.round(s.x), y = Math.round(s.y), blink = Math.floor(time * 4) % 2;
      ctx.strokeStyle = s === cur ? (blink ? '#fff3c4' : '#f6c65b') : '#fff3c4'; ctx.lineWidth = 1;
      ctx.strokeRect(x - 6.5, y - 6.5, 13, 13);
    }
    ctx.restore();
    // the names: the chosen place's (and the one under the mouse), on paper
    for (const s of [cur, this.hover !== cur ? this.hover : null]) {
      if (!s) continue;
      const lines = [s.pl.name, s.pl.st].filter(Boolean).map((l) => fitText(l, Math.min(220, r.mw - 12)));
      const w = Math.max(...lines.map((l) => measure(l))) + 10, h = lines.length * 10 + 5;
      const x = Math.round(Math.max(r.mx + 2, Math.min(r.mx + r.mw - w - 2, s.x - w / 2)));
      let y = Math.round(s.y - 10 - h);
      if (y < r.my + 2) y = Math.round(s.y + 10);
      ctx.fillStyle = '#3b2a22'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
      ctx.fillStyle = '#fff8ea'; ctx.fillRect(x, y, w, h);
      lines.forEach((l, i) => drawText(ctx, l, x + 5, y + 3 + i * 10, { color: i ? UI.inkSoft : UI.ink }));
    }
  }
}
