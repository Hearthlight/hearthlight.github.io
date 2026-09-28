// Races! A start arch stands on a road in five wild lands. Press A under it
// and whoever's on the start line when the countdown ends is racing: through
// every checkpoint flag to the finish arch (mounts welcome — it's a party).
// First home wins the most stardust, everyone who finishes gets some; racing
// alone, you're up against the course's record (saved) and a target time.

import { THREE, toon } from '../render/r3d.js';
import { drawText, measure } from '../engine/font.js';
import { audio } from '../engine/audio.js';
import { drawTargetArrow } from './story.js';
import { t } from '../i18n.js';
import { drawMarks } from './mapmarks.js';

const GATHER = 7;               // seconds to reach the start line
const LINE = { w: 5.5, d: 3.2 };  // the start box (across × along the road)
const PASS = 3.4;               // how close counts as through a checkpoint
const AFTER = 25;               // seconds the others get once someone finishes
const MAX_T = 240;
const PRIZE = [60, 35, 20];     // stardust for 1st, 2nd, 3rd (then 10)
const PACE = 4.6;               // tiles/s on foot: the target time for a solo run

// along the roads (see world/big/gen.js); checkpoints get added in between
const COURSES = [
  { id: 'steppe', name: 'Steppe Sprint', pts: [[-66, 53.7], [-100, 44], [-128, 38], [-150, 32], [-175, 30], [-200, 26]] },
  { id: 'canyon', name: 'Canyon Dash', pts: [[-195, 79], [-186, 64], [-200, 26], [-208, 0], [-214, -28]] },
  { id: 'highland', name: 'Switchback Scramble', pts: [[73, 2], [70, -14], [66, -28], [72, -36], [64, -42], [72, -48], [64, -54], [70, -62], [66, -76], [58, -92]] },
  { id: 'glacier', name: 'Frostpeak Climb', pts: [[216, -16], [232, -30], [254, -44], [284, -32], [300, -52], [330, -62]] },
  { id: 'ember', name: 'Ember Trail', pts: [[270, 55], [286, 50], [300, 58], [320, 64], [350, 62], [380, 64], [404, 62]] },
];

const fmt = (s) => { const m = Math.floor(s / 60), r = s - m * 60; return m + ':' + (r < 10 ? '0' : '') + r.toFixed(1); };

export class Races {
  constructor(party) {
    this.party = party;
    this.root = new THREE.Group();
    this.root.name = 'races';
    party.world.over.root.add(this.root);
    this.best = party.loadSave('races', {}) || {};
    this.list = party.big ? COURSES.map((C) => this.course(C)) : [];
    this.race = null;              // the one running: { c, phase, t, racers: Map, done: [] }
  }

  // checkpoints every ≤ 20 tiles along the course
  course(C) {
    const pts = [];
    for (let i = 0; i < C.pts.length - 1; i++) {
      const [ax, az] = C.pts[i], [bx, bz] = C.pts[i + 1];
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 20));
      for (let k = 0; k < n; k++) pts.push({ x: ax + ((bx - ax) * k) / n, z: az + ((bz - az) * k) / n });
    }
    const last = C.pts[C.pts.length - 1];
    pts.push({ x: last[0], z: last[1] });
    let len = 0;
    for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
    // each flag faces along the road
    pts.forEach((p, i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      const L = Math.hypot(b.x - a.x, b.z - a.z) || 1;
      p.dx = (b.x - a.x) / L; p.dz = (b.z - a.z) / L;
    });
    return { ...C, cps: pts, len, par: Math.round((len / PACE) * 10) / 10, start: pts[0], built: null, flags: [], seen: false };
  }

  active() { return this.party.exploring(); }
  store() { this.party.writeSave('races', this.best); }

  // ------------------------------------------------------------------ models
  // start & finish: a chequered line across the road between two tall poles
  // with flags (it reads from above whichever way the road runs)
  gate(p, finish = false) {
    const r3d = this.party.r3d;
    const g = new THREE.Group();
    const wood = toon(r3d, { color: 0x8a5a3a, key: 'race-wood' });
    const black = toon(r3d, { color: 0x2a2230, key: 'race-black' }), white = toon(r3d, { color: 0xfbf6ec, key: 'race-white' });
    const half = LINE.w / 2, n = 12, cw = LINE.w / n, rh = 0.36;
    const tile = new THREE.PlaneGeometry(cw, rh).rotateX(-Math.PI / 2);
    for (let i = 0; i < n; i++) for (let j = 0; j < 2; j++) {
      const q = new THREE.Mesh(tile, (i + j) % 2 ? black : white);
      q.position.set(-half + cw * (i + 0.5), 0.025, (j - 0.5) * rh);
      q.receiveShadow = true;
      g.add(q);
    }
    const flags = [];
    for (const sd of [-1, 1]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 3.2, 6), wood);
      pole.position.set(sd * (half + 0.3), 1.6, 0); pole.castShadow = true; g.add(pole);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), toon(r3d, { color: 0xffd66b, key: 'race-knob' }));
      knob.position.set(sd * (half + 0.3), 3.26, 0); g.add(knob);
      // the flag always faces the camera (it's counter-rotated below)
      const fg = new THREE.Group();
      fg.position.set(sd * (half + 0.3), 2.75, 0);
      const cloth = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.55, 0.04), toon(r3d, { color: finish ? 0xef6479 : 0x62c46c, key: finish ? 'race-cloth-f' : 'race-cloth-s' }));
      cloth.position.x = 0.5; cloth.castShadow = true; fg.add(cloth);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.12, 0.05), toon(r3d, { color: 0xfff3c4, key: 'race-stripe' }));
      stripe.position.x = 0.5; fg.add(stripe);
      g.add(fg);
      flags.push(fg);
    }
    g.position.set(p.x, this.party.big.groundY(p), p.z);
    g.rotation.y = Math.atan2(p.dx, p.dz);          // local x runs across the road
    for (const f of flags) f.rotation.y = -g.rotation.y;
    g.userData.flags = flags;
    return g;
  }

  // a checkpoint: a glowing ring on the road (that's where to go) and a star
  // spinning above it
  checkpoint(p) {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(PASS - 0.7, 0.1, 4, 32).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd66b, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }));
    ring.position.y = 0.06; g.add(ring);
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0), new THREE.MeshBasicMaterial({ color: 0xfff3c4 }));
    star.scale.set(1, 1.5, 1); star.position.y = 2; g.add(star);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.8, 4), new THREE.MeshBasicMaterial({ color: 0xffd66b, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
    beam.position.y = 0.95; g.add(beam);
    g.position.set(p.x, this.party.big.groundY(p), p.z);
    g.userData = { ring, star };
    g.visible = false;
    return g;
  }

  build(c) {
    const g = new THREE.Group();
    c.gates = [this.gate(c.cps[0], false), this.gate(c.cps[c.cps.length - 1], true)];
    for (const q of c.gates) g.add(q);
    for (let i = 1; i < c.cps.length - 1; i++) { const f = this.checkpoint(c.cps[i]); g.add(f); c.flags[i] = f; }
    // the start box, painted on the road just behind the line
    const box = new THREE.Mesh(new THREE.PlaneGeometry(LINE.w, LINE.d).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd66b, transparent: true, opacity: 0.22, depthWrite: false }));
    const s = c.cps[0];
    box.position.set(s.x - s.dx * (LINE.d / 2 + 0.3), 0.03, s.z - s.dz * (LINE.d / 2 + 0.3));
    box.rotation.y = Math.atan2(s.dx, s.dz);
    g.add(box);
    c.lineMesh = box;
    this.root.add(g);
    c.built = g;
  }

  // is a player standing in the start box?
  onLine(c, p) {
    const s = c.cps[0];
    const rx = p.pos.x - (s.x - s.dx * (LINE.d / 2 + 0.3)), rz = p.pos.z - (s.z - s.dz * (LINE.d / 2 + 0.3));
    const along = rx * s.dx + rz * s.dz, across = rx * -s.dz + rz * s.dx;
    return Math.abs(along) < LINE.d / 2 + 0.4 && Math.abs(across) < LINE.w / 2 + 0.4;
  }

  // ------------------------------------------------------------------ frame
  update(dt) {
    const P = this.party, on = this.active();
    const ps = P.players.filter((p) => p.connected);
    for (const c of this.list) {
      let d = 1e9;
      for (const p of ps) d = Math.min(d, Math.hypot(p.pos.x - c.start.x, p.pos.z - c.start.z));
      if (d < 50 && !c.built) this.build(c);
      if (d < 30) c.seen = true;
      if (c.built) {
        const racing = this.race && this.race.c === c;
        c.built.visible = racing || d < 70;
        for (let i = 1; i < c.cps.length - 1; i++) if (c.flags[i]) c.flags[i].visible = racing || (d < 40 && i <= 2);
        c.lineMesh.material.opacity = racing && this.race.phase === 'gather' ? 0.35 + Math.sin(P.t * 8) * 0.12 : 0.2;
        if (c.built.visible) for (const gt of c.gates) gt.userData.flags.forEach((f, k) => { f.children[0].rotation.y = Math.sin(P.t * 3 + k) * 0.25; f.children[1].rotation.y = f.children[0].rotation.y; });
      }
    }
    const R = this.race;
    if (!R) return;
    if (!on) { this.cancel(); return; }
    R.t += dt;
    if (R.phase === 'gather') {
      const left = Math.ceil(GATHER - R.t);
      if (left !== R.beep && left <= 3 && left > 0) { R.beep = left; audio.sfx('tick', { volume: 0.9 }); }
      if (R.t >= GATHER) this.go();
    } else if (R.phase === 'run') {
      for (const [slot, r] of R.racers) {
        if (r.done) continue;
        const p = P.players.find((q) => q.slot === slot);
        if (!p || !p.connected) continue;
        const cp = R.c.cps[r.next];
        if (Math.hypot(p.pos.x - cp.x, p.pos.z - cp.z) < PASS) this.pass(p, r);
      }
      const done = [...R.racers.values()].filter((r) => r.done).length;
      if (done === R.racers.size || (R.firstAt !== null && R.t - R.firstAt > AFTER) || R.t > MAX_T) this.finish();
      // the stars spin; the leader's next one bobs and its ring pulses
      for (let i = 1; i < R.c.cps.length - 1; i++) {
        const f = R.c.flags[i];
        if (!f) continue;
        const U = f.userData, lead = i === R.lead;
        U.star.rotation.y += dt * (lead ? 5 : 2);
        U.star.position.y = 2 + (lead ? Math.sin(P.t * 6) * 0.2 : 0);
        U.ring.material.opacity = lead ? 0.6 + Math.sin(P.t * 8) * 0.3 : 0.45;
        U.ring.scale.setScalar(lead ? 1 + Math.sin(P.t * 8) * 0.04 : 1);
      }
    }
  }

  // A under a start arch
  start(c, p) {
    const P = this.party;
    if (this.race || P.vote) return;
    if (P.lairs && P.lairs.fight) { P.toast(t('Not during a boss fight!'), p.color); return; }
    if (P.events && P.events.invasion && P.events.invasion.phase === 'fight') { P.toast(t('Not now!'), p.color); return; }
    this.race = { c, phase: 'gather', t: 0, racers: new Map(), done: [], firstAt: null, beep: 0, lead: 1, by: p };
    audio.sfx('whistle', { volume: 0.9 });
    P.toast(P.solo ? t('On your marks — stay on the line!') : t('{name} starts a race — join at the line!', { name: p.name }), p.color);
  }

  go() {
    const P = this.party, R = this.race;
    for (const p of P.players) if (p.connected && this.onLine(R.c, p)) R.racers.set(p.slot, { next: 1, done: false, time: 0 });
    if (!R.racers.size) { P.toast(t('Nobody on the start line — race called off'), '#b9a2e3'); this.race = null; return; }
    R.phase = 'run'; R.t = 0;
    audio.sfx('go', { volume: 1 });
    for (const slot of R.racers.keys()) { const p = P.players.find((q) => q.slot === slot); if (p) P.buzz(p, [60, 40, 120]); }
  }

  pass(p, r) {
    const P = this.party, R = this.race, n = R.c.cps.length;
    const cp = R.c.cps[r.next];
    r.next++;
    P.world.fx.emit('sparkle', cp.x, 1.6, cp.z, 10, { color: p.color });
    if (r.next < n) { audio.sfx('coin', { volume: 0.6 }); P.buzz(p, 20); }
    else {
      r.done = true; r.time = R.t;
      R.done.push(p.slot);
      if (R.firstAt === null) R.firstAt = R.t;
      const place = R.done.length;
      audio.sfx(place === 1 ? 'cheer' : 'levelup', { volume: 0.9 });
      P.world.fx.emit('firework', cp.x, 2, cp.z, 26, { color: p.color });
      p.setEmote(place === 1 ? 'star' : 'heart', 2.5);
      P.buzz(p, [40, 30, 40, 30, 120]);
      P.toast(t('{name} finishes in {time}!', { name: p.name, time: fmt(r.time) }) + (R.racers.size > 1 ? ' (' + t(['1st', '2nd', '3rd'][place - 1] || '{n}th', { n: place }) + ')' : ''), p.color);
    }
    // who leads: most checkpoints, then nearest to the next one
    let lead = null;
    for (const q of R.racers.values()) if (!q.done && (!lead || q.next > lead.next)) lead = q;
    R.lead = lead ? lead.next : 0;
  }

  finish() {
    const P = this.party, R = this.race, G = P.progress, C = P.combat;
    this.race = null;
    const order = R.done.map((slot) => P.players.find((q) => q.slot === slot)).filter(Boolean);
    const solo = R.racers.size === 1;
    order.forEach((p, i) => {
      const r = R.racers.get(p.slot);
      let dust = solo ? 0 : PRIZE[i] ?? 10;
      if (solo) {
        const best = this.best[R.c.id];
        if (r.time < R.c.par) dust += 40;
        if (!best || r.time < best) { this.best[R.c.id] = Math.round(r.time * 10) / 10; this.store(); dust += 20; P.showBanner(t('New record! {time}', { time: fmt(r.time) }), t(R.c.name)); }
        else P.showBanner(t('{time} — the record is {best}', { time: fmt(r.time), best: fmt(best) }), t(R.c.name));
      } else if (!this.best[R.c.id] || r.time < this.best[R.c.id]) { this.best[R.c.id] = Math.round(r.time * 10) / 10; this.store(); }
      if (G && dust) { G.addDust(p, dust); P.toast(t('{name}: +{n} stardust', { name: p.name, n: dust }), p.color); }
      if (C && p.fighter) C.gainXp(p, solo ? 25 : [40, 25, 15][i] ?? 10);
    });
    if (!solo) {
      if (order.length) P.showBanner(t('{name} wins the {race}!', { name: order[0].name, race: t(R.c.name) }), order.slice(1, 3).map((p, i) => t(['2nd', '3rd'][i]) + ' ' + p.name).join(' · '));
      else P.showBanner(t('Nobody finished the {race}', { race: t(R.c.name) }), t('the flags will wait'));
    } else if (!order.length) P.showBanner(t('Out of time!'), t(R.c.name));
    audio.jingle(order.length ? 'questDone' : 'questStart');
  }

  cancel() { this.race = null; }

  // ------------------------------------------------------------------ explore hooks
  near(p) {
    if (!this.active() || this.race) return null;
    for (const c of this.list) {
      const s = c.cps[0];
      if (Math.hypot(p.pos.x - s.x, p.pos.z - s.z) < 3) return { kind: 'secret', label: 'Race', hint: 'Start the {race}: racers to the line!', vars: { race: t(c.name) }, use: (q) => this.start(c, q) };
    }
    return null;
  }

  // the phone's hint while a race is on
  ctxFor(p) {
    const R = this.race;
    if (!R) return null;
    if (R.phase === 'gather') return { hint: this.onLine(R.c, p) ? 'On the line! {n}…' : 'Race soon! Get on the start line: {n}', vars: { n: Math.max(0, Math.ceil(GATHER - R.t)) } };
    const r = R.racers.get(p.slot);
    if (!r) return null;
    if (r.done) return { hint: 'Finished! {time}', vars: { time: fmt(r.time) } };
    return { hint: 'Checkpoint {n}/{total} — follow the flags!', vars: { n: r.next, total: R.c.cps.length - 1 } };
  }

  // per view: an arrow to each racer's next flag
  drawArrows(ctx, v) {
    const R = this.race;
    if (!R || R.phase !== 'run') return false;
    let drew = false;
    const seen = new Set();
    for (const m of v.members) {
      const r = R.racers.get(m.slot);
      if (!r || r.done || seen.has(r.next)) continue;
      seen.add(r.next);
      drawTargetArrow(this.party, ctx, v, R.c.cps[r.next], m.color);
      drew = true;
    }
    return drew;
  }

  // the race card: the countdown, then the clock and who's where
  // (cardRect lets the toasts keep out of its way)
  drawUi(ctx) {
    const P = this.party, R = this.race;
    this.cardRect = null;
    if (!R) return;
    const W = P.display.w;
    const panel = (x, y, w, h) => { ctx.fillStyle = 'rgba(30,20,40,0.85)'; ctx.fillRect(x, y, w, h); ctx.fillStyle = '#ffd66b'; ctx.fillRect(x, y, w, 1); this.cardRect = { x, y, w, h }; };
    if (R.phase === 'gather') {
      const left = Math.max(0, Math.ceil(GATHER - R.t));
      const name = t(R.c.name), sub = t('on the line: {n}', { n: P.players.filter((p) => p.connected && this.onLine(R.c, p)).length });
      const w = Math.max(measure(name), measure(sub), 60) + 20, { x, y } = P.topCard(w, 40), cx = x + w / 2;
      panel(x, y, w, 40);
      drawText(ctx, name, cx, y + 4, { color: '#ffd66b', align: 'center' });
      drawText(ctx, String(left), cx, y + 14, { color: left <= 3 ? '#ff9aa8' : '#fff7e6', align: 'center', scale: 2 });
      drawText(ctx, sub, cx, y + 31, { color: '#e8d6b4', align: 'center' });
      return;
    }
    const rows = [...R.racers.entries()].map(([slot, r]) => ({ p: P.players.find((q) => q.slot === slot), r })).filter((o) => o.p);
    rows.sort((a, b) => (a.r.done && b.r.done ? a.r.time - b.r.time : a.r.done ? -1 : b.r.done ? 1 : b.r.next - a.r.next));
    const total = R.c.cps.length - 1, solo = rows.length === 1;
    const head = `${t(R.c.name)}  ${fmt(R.t)}`;
    const goal = solo ? t(this.best[R.c.id] ? 'record {time}' : 'target {time}', { time: fmt(this.best[R.c.id] || R.c.par) }) : '';
    const w = Math.max(measure(head) + 16, measure(goal) + 16, 120);
    const h = 14 + rows.length * 10 + (goal ? 10 : 0);
    const { x, y } = P.topCard(w, h), cx = x + w / 2;
    panel(x, y, w, h);
    drawText(ctx, head, cx, y + 3, { color: '#ffd66b', align: 'center' });
    rows.forEach(({ p, r }, i) => {
      const yy = y + 14 + i * 10;
      ctx.fillStyle = p.color; ctx.fillRect(x + 6, yy + 1, 5, 5);
      drawText(ctx, p.name, x + 14, yy, { color: '#fff7e6' });
      drawText(ctx, r.done ? fmt(r.time) : `${Math.min(total, r.next - 1)}/${total}`, x + w - 6, yy, { color: r.done ? '#8fd67a' : '#e8d6b4', align: 'right' });
    });
    if (goal) drawText(ctx, goal, cx, y + h - 10, { color: '#b9a2e3', align: 'center' });
    // GO!
    if (R.t < 1.1) drawText(ctx, t('GO!'), W / 2, Math.round(P.display.h * 0.3), { color: '#8fd67a', align: 'center', scale: R.t < 0.12 ? 4 : 3, outline: '#241a2e' });
  }

  // the course's name (and record) over its start line
  drawLabels(ctx, v) {
    const P = this.party;
    if (this.race || !this.active()) return;
    for (const c of this.list) {
      if (!c.built || !c.built.visible) continue;
      const s = c.cps[0];
      if (!P.players.some((p) => p.connected && Math.hypot(p.pos.x - s.x, p.pos.z - s.z) < 14)) continue;
      const u = P.toUi(v, s.x, 3.6, s.z);
      const best = this.best[c.id];
      const text = t(c.name) + (best ? ' · ' + t('record {time}', { time: fmt(best) }) : '');
      const w = measure(text) + 10;
      ctx.fillStyle = 'rgba(30,20,40,0.78)'; ctx.fillRect(Math.round(u.x - w / 2), Math.round(u.y - 12), w, 11);
      ctx.fillStyle = '#ffd66b'; ctx.fillRect(Math.round(u.x - w / 2), Math.round(u.y - 12), w, 1);
      drawText(ctx, text, u.x, u.y - 10, { color: '#fff3c4', align: 'center' });
    }
  }

  // on the part of the world map someone has explored (so it stays there between sessions)
  revealed(o) { const WM = this.party.big && this.party.big.worldMap; return !!(WM && WM.revealed(o.x, o.z)); }

  mapMarks(out = []) {
    for (const c of this.list) if (c.seen || this.revealed(c.start)) out.push({ k: 'race', x: c.start.x, z: c.start.z, name: t(c.name), st: this.best[c.id] ? t('record {time}', { time: fmt(this.best[c.id]) }) : t('Race') });
    return out;
  }
  drawMapMarks(ctx, M) { drawMarks(ctx, M, this.mapMarks(), this.party.t); }

  dispose() { this.party.world.over.root.remove(this.root); }
}

export { raceIcon } from './mapmarks.js';
