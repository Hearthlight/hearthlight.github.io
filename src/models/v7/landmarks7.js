// World v7: the Dawnlands’ landmarks — the Dawn Monastery’s pagoda & torii
// gates, stone lanterns, the Saltworks’ wind pumps, the Great Tree of
// Elderbough, Hollowmoor’s stone circle, the Prism Fields’ geode, Cogsworth’s
// clock tower, and the sleeping whale’s eye & tail. Same contract as
// models/landmarks.js (installed into its BUILD table with its helpers):
// local frame, origin on the ground at the centre, fronts facing +z.

import { seeThrough } from '../../render/seethrough.js';
import { buildPelican } from './pelican.js';

export function installDawn(BUILD, H) {
  const { THREE, put, grp, beam, inst, lantern, glow, geo, B, ICO, ROCK, OCT, CYL, C, GL, T, tex, lit, speckle, Painter, paintRoof } = H;
  const HIPROOF = () => geo('v7hip', () => new THREE.ConeGeometry(1, 1, 4, 1, true).rotateY(Math.PI / 4));
  const HIPROOFC = () => geo('v7hipc', () => new THREE.ConeGeometry(1, 1, 4).rotateY(Math.PI / 4));
  const lanternRed = () => GL('v7redlantern', 0xf05a4a, 0xff6a3a, 1.0);

  // a paper lantern hanging from a string (swings in the anim)
  const paperLantern = (g, out, x, y, z, s = 1) => {
    const l = grp(g, x, y, z);
    put(l, B(0.02, 0.3 * s, 0.02), C('v7string', 0x3a2a2a), 0, 0.15 * s, 0);
    const body = glow(put(l, geo('v7plant', () => new THREE.SphereGeometry(0.2, 8, 6)), lanternRed(), 0, -0.12 * s, 0));
    body.scale.set(s, s * 1.25, s);
    put(l, B(0.16 * s, 0.04, 0.16 * s), C('v7lcap', 0x2a2024), 0, 0.12 * s, 0);
    put(l, B(0.16 * s, 0.04, 0.16 * s), C('v7lcap', 0x2a2024), 0, -0.37 * s, 0);
    out.lights.push({ x, y: y - 0.1, z: z + 0.1, color: 0xff7a4a, power: 0.8 * s, lamp: true });
    return l;
  };
  // a flared "curved" roof: a wide shallow eave under a steeper cap, upturned corners with gold tips
  const pagodaRoof = (g, y, w, tileM, trimM, goldM) => {
    put(g, HIPROOFC(), tileM, 0, y + 0.22, 0).scale.set(w * 0.74, 0.44, w * 0.74);
    put(g, HIPROOFC(), tileM, 0, y + 0.62, 0).scale.set(w * 0.5, 0.7, w * 0.5);
    put(g, B(w * 1.02, 0.1, w * 1.02), trimM, 0, y + 0.02, 0);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const c = grp(g, sx * w * 0.5, y + 0.06, sz * w * 0.5, Math.atan2(sx, sz));
      put(c, B(0.14, 0.12, 0.62), tileM, 0, 0.1, 0.18, 0, -0.5);
      glow(put(c, OCT(), goldM, 0, 0.3, 0.46)).scale.set(0.08, 0.12, 0.08);
    }
  };

  // ------------------------------------------------------------------ a Pelican Post roost
  // a tall post with a perch (a pelican dozes on it), a blue mailbox, a lantern, a hay nest
  BUILD.roost = (g, out, m, r, seed, p, r3d) => {
    const blue = C('v7mailbox', 0x3f6fae), gold = GL('v7ppgold', 0xf0c050, 0xc89020, 0.3);
    put(g, CYL(), m.dark, 0, 1.25, 0).scale.set(0.26, 2.5, 0.26);
    put(g, B(1.7, 0.14, 0.22), m.wood, 0, 2.47, 0);
    for (const s of [-1, 1]) beam(g, m.dark, 0, 1.9, 0, s * 0.7, 2.42, 0, 0.07);
    // the hay nest at its foot, a couple of letters dropped in it
    const hay = C('v7hay', 0xd8b060);
    for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; put(g, B(0.5, 0.08, 0.08), hay, Math.cos(a) * 0.55, 0.1, Math.sin(a) * 0.5 + 0.2, -a); }
    put(g, B(0.3, 0.02, 0.2), C('v7letter', 0xfbf6ec), 0.2, 0.14, 0.25, 0.4);
    put(g, B(0.3, 0.02, 0.2), C('v7letter2', 0xf4e4c8), -0.15, 0.16, 0.35, -0.3);
    // the mailbox: rounded top, a gold slot, a red flag
    const bx = grp(g, 0.5, 1.15, 0.18);
    put(bx, B(0.5, 0.42, 0.52), blue, 0, 0, 0);
    put(bx, geo('v7mbtop', () => new THREE.CylinderGeometry(0.25, 0.25, 0.52, 10, 1, false, 0, Math.PI)), blue, 0, 0.21, 0, 0, Math.PI / 2, Math.PI / 2);
    glow(put(bx, B(0.3, 0.05, 0.02), gold, 0, 0.1, 0.27));
    const flag = grp(bx, 0.27, 0.1, 0);
    put(flag, B(0.03, 0.4, 0.03), C('v7iron', 0x3b3a46), 0, 0.2, 0);
    put(flag, B(0.02, 0.14, 0.2), C('v7red', 0xc8423a), 0, 0.34, 0.1);
    // a lantern hung on the post
    put(g, B(0.4, 0.04, 0.04), m.dark, -0.2, 1.9, 0.14);
    lantern(g, out, -0.38, 1.72, 0.14, { s: 0.7 });
    // the pelican on duty, dozing
    const bird = buildPelican(r3d, { cap: true });
    bird.position.set(0.1, 2.54, 0); bird.rotation.y = 0.3 + r() * 0.4;
    bird.scale.setScalar(0.9);
    g.add(bird);
    out.anim = (t) => { bird.userData.anim(t); flag.rotation.z = Math.sin(t * 1.2) * 0.1; };
    out.anim(0);
    out.colliders.push({ x: 0, z: 0, r: 0.35 }, { x: 0.5, z: 0.18, r: 0.35 });
    void p;
  };

  // ------------------------------------------------------------------ the Dawn Monastery’s pagoda
  BUILD.pagoda = (g, out, m, r) => {
    const stone = T('v7plinth', () => { const p = speckle(16, 16, '#a8a49a', 701, 0.3); p.hline(0, 0, 16, '#c8c4b8'); p.hline(0, 15, 16, '#7a766e'); return tex(p.c, 3, 1); });
    const red = C('v7red', 0xc8423a), tileM = C('v7tile', 0x2e4a52), trimM = C('v7trim', 0x5a2a24), goldM = GL('v7gold', 0xf0c050, 0xc89020, 0.35);
    const hallT = T('v7hall', () => lit(40, 20, (p, q) => {
      p.rect(0, 0, 40, 20, '#f2e6cc');
      p.rect(0, 17, 40, 3, '#8a3a2e');
      for (const x of [0, 13, 26, 39]) p.vline(x, 0, 20, '#8a3a2e');
      // the door and two lattice windows (lit at night)
      p.rect(16, 6, 8, 11, '#5a2a24'); p.rect(17, 7, 6, 10, '#7a3a2e'); p.vline(20, 7, 10, '#5a2a24');
      for (const wx of [4, 29]) { p.rect(wx, 5, 7, 7, '#5a2a24'); for (let y = 6; y < 11; y++) for (let x = wx + 1; x < wx + 6; x++) if ((x + y) % 2) { p.px(x, y, '#f8e0a0'); q.px(x, y, '#ffb860'); } }
    }));
    // the plinth & its stair
    put(g, B(7, 0.5, 7), stone, 0, 0.25, -0.2);
    for (let k = 0; k < 3; k++) put(g, B(2.2, 0.17, 0.3), stone, 0, 0.085 + k * 0.17, 3.45 - k * 0.3);
    // three halls & three roofs
    const tiers = [[4.8, 1.6, 6.4], [3.6, 1.2, 5.0], [2.6, 1.0, 3.8]], lanterns = [];
    let y = 0.5;
    tiers.forEach(([w, h, rw], i) => {
      put(g, B(w, h, w), [hallT, hallT, C('v7ceil', 0x3a2420), C('v7ceil', 0x3a2420), hallT, hallT], 0, y + h / 2, -0.2);
      const pillars = [];
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) pillars.push([sx * (w / 2 + 0.05), y + h / 2, -0.2 + sz * (w / 2 + 0.05), 0.24, h, 0.24]);
      if (i === 0) for (const sx of [-0.9, 0.9]) pillars.push([sx, y + h / 2, -0.2 + w / 2 + 0.25, 0.22, h, 0.22]);
      inst(g, CYL(), red, pillars);
      y += h;
      const rg = grp(g, 0, 0, -0.2);
      pagodaRoof(rg, y, rw, tileM, trimM, goldM);
      if (i < 2) for (const [sx, sz] of [[-1, 1], [1, 1]]) lanterns.push(paperLantern(g, out, sx * rw * 0.46, y - 0.05, -0.2 + sz * rw * 0.46, 0.9 - i * 0.15));
      y += 0.95;
    });
    // the finial: a gold spire of rings
    put(g, CYL(), goldM, 0, y + 0.55, -0.2).scale.set(0.12, 1.2, 0.12);
    for (let k = 0; k < 4; k++) glow(put(g, geo('v7ring', () => new THREE.TorusGeometry(0.2, 0.05, 5, 12)), goldM, 0, y + 0.35 + k * 0.22, -0.2, 0, Math.PI / 2)).scale.setScalar(1 - k * 0.14);
    glow(put(g, ICO(), goldM, 0, y + 1.25, -0.2)).scale.setScalar(0.14);
    // a bronze bell on a frame by the stair, incense smoking in a burner
    const bf = grp(g, 2.7, 0.5, 2.3);
    for (const sx of [-0.45, 0.45]) put(bf, B(0.12, 1.5, 0.12), m.dark, sx, 0.75, 0);
    put(bf, B(1.2, 0.12, 0.16), m.dark, 0, 1.5, 0);
    const bell = put(bf, geo('v7bell', () => new THREE.CylinderGeometry(0.18, 0.3, 0.55, 10)), C('v7bronze', 0x9a7a3a), 0, 1.12, 0);
    put(g, geo('v7burner', () => new THREE.CylinderGeometry(0.3, 0.22, 0.35, 8)), C('v7bronze', 0x9a7a3a), -2.4, 0.68, 2.6);
    const smoke = [];
    for (let k = 0; k < 3; k++) { const s = put(g, ICO(), C('v7smoke' + k, 0xe8e4ec, { transparent: true }), -2.4, 1.0 + k * 0.35, 2.6); s.scale.setScalar(0.1 + k * 0.05); s.userData.noCast = true; smoke.push(s); }
    const ph = r() * 6;
    out.anim = (t) => {
      bell.rotation.z = Math.sin(t * 1.3 + ph) * 0.05;
      lanterns.forEach((l, i) => { l.rotation.z = Math.sin(t * 1.7 + i * 1.3) * 0.08; l.rotation.x = Math.sin(t * 1.1 + i) * 0.06; });
      smoke.forEach((s, k) => { const q = (t * 0.35 + k / 3) % 1; s.position.y = 1.0 + q * 1.4; s.position.x = -2.4 + Math.sin(t + k * 2) * 0.12 * q; s.scale.setScalar(0.08 + q * 0.2); s.material.opacity = 0.55 * (1 - q); });
    };
    out.anim(0);
    out.colliders.push({ rect: [-3.5, -3.7, 7, 6.7] }, { rect: [2.25, 2.2, 0.9, 0.2] }, { x: -2.4, z: 2.6, r: 0.35 });
  };

  // ------------------------------------------------------------------ a torii gate over the pilgrims’ way
  BUILD.torii = (g, out) => {
    const red = C('v7red', 0xc8423a), black = C('v7black', 0x2a2226);
    for (const sx of [-1.5, 1.5]) {
      put(g, CYL(), red, sx, 1.6, 0).scale.set(0.3, 3.2, 0.3);
      put(g, CYL(), black, sx, 0.2, 0).scale.set(0.38, 0.4, 0.38);
    }
    put(g, B(3.8, 0.22, 0.22), red, 0, 2.45, 0);
    put(g, B(4.4, 0.24, 0.34), red, 0, 3.02, 0);
    put(g, B(4.9, 0.18, 0.44), black, 0, 3.22, 0);
    for (const sx of [-1, 1]) put(g, B(0.5, 0.16, 0.44), black, sx * 2.55, 3.3, 0, 0, 0, sx * 0.35);
    put(g, B(0.22, 0.55, 0.2), red, 0, 2.74, 0);
    put(g, B(0.5, 0.42, 0.06), C('v7plaque', 0x2a2226), 0, 2.74, 0.12);
    // a rope with paper streamers under the beam
    for (let k = 0; k < 5; k++) put(g, B(0.1, 0.24, 0.02), C('v7paper', 0xf8f4ec), -1 + k * 0.5, 2.2, 0.12, 0, 0, (k % 2 ? 0.1 : -0.1));
    out.colliders.push({ x: -1.5, z: 0, r: 0.24 }, { x: 1.5, z: 0, r: 0.24 });
  };

  // ------------------------------------------------------------------ a stone lantern
  BUILD.stone_lantern = (g, out) => {
    const st = C('v7lanternstone', 0xa8a498);
    put(g, geo('v7slbase', () => new THREE.CylinderGeometry(0.34, 0.4, 0.2, 6)), st, 0, 0.1, 0);
    put(g, geo('v7slpole', () => new THREE.CylinderGeometry(0.12, 0.14, 0.7, 6)), st, 0, 0.55, 0);
    put(g, geo('v7slseat', () => new THREE.CylinderGeometry(0.3, 0.22, 0.14, 6)), st, 0, 0.97, 0);
    put(g, B(0.4, 0.34, 0.4), st, 0, 1.21, 0);
    glow(put(g, B(0.26, 0.2, 0.42), GL('v7slfire', 0xffe0a0, 0xffa040, 1.1), 0, 1.22, 0));
    glow(put(g, B(0.42, 0.2, 0.26), GL('v7slfire', 0xffe0a0, 0xffa040, 1.1), 0, 1.22, 0));
    put(g, geo('v7slroof', () => new THREE.ConeGeometry(0.46, 0.34, 6)), st, 0, 1.55, 0);
    put(g, ICO(), st, 0, 1.76, 0).scale.setScalar(0.08);
    put(g, ICO(), C('v7moss', 0x6f9150), -0.2, 1.48, 0.12).scale.set(0.12, 0.05, 0.1);
    out.lights.push({ x: 0, y: 1.2, z: 0.3, color: 0xffb060, power: 0.9, lamp: true });
    out.colliders.push({ x: 0, z: 0, r: 0.36 });
  };

  // ------------------------------------------------------------------ the Saltworks’ wind pump
  BUILD.windpump = (g, out, m, r) => {
    const iron = C('v7pumpiron', 0x6a6a74), H = 4.4;
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) beam(g, iron, sx * 0.9, 0, sz * 0.9, sx * 0.22, H, sz * 0.22, 0.09);
    for (const y of [1.2, 2.4, 3.5]) { const k = 0.9 - (y / H) * 0.68; for (const [a, b] of [[[-k, -k], [k, -k]], [[k, -k], [k, k]], [[k, k], [-k, k]], [[-k, k], [-k, -k]]]) beam(g, iron, a[0], y, a[1], b[0], y, b[1], 0.05); }
    put(g, B(0.7, 0.1, 0.7), m.planks, 0, H, 0);
    const wheel = grp(g, 0, H + 0.5, 0.4);
    const blade = C('v7blade', 0xf2ece0);
    for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2, b = grp(wheel, 0, 0, 0); b.rotation.z = a; put(b, B(0.22, 0.95, 0.03), i % 2 ? blade : C('v7blade2', 0xc8423a), 0, 0.72, 0, 0.3); }
    put(wheel, geo('v7wrim', () => new THREE.TorusGeometry(1.2, 0.04, 4, 20)), iron, 0, 0, 0);
    put(wheel, geo('v7whub', () => new THREE.CylinderGeometry(0.16, 0.16, 0.2, 8)), iron, 0, 0, 0, 0, Math.PI / 2);
    put(g, B(0.08, 0.08, 1.4), iron, 0, H + 0.5, -0.3);
    put(g, B(0.04, 0.7, 0.9), C('v7vane', 0xc8423a), 0, H + 0.55, -1.05);
    // the tank and its pipe
    put(g, geo('v7tank', () => new THREE.CylinderGeometry(0.75, 0.75, 1.1, 12)), C('v7tank', 0x8a6a4a), 1.8, 0.55, 0.6);
    put(g, geo('v7tanktop', () => new THREE.CylinderGeometry(0.78, 0.78, 0.08, 12)), C('v7tanktop', 0x5a4632), 1.8, 1.12, 0.6);
    beam(g, iron, 0.2, 0.9, 0.2, 1.3, 1.0, 0.5, 0.08);
    const ph = r() * 6;
    out.anim = (t) => { wheel.rotation.z = -t * 1.6 + ph; };
    out.anim(0);
    out.colliders.push({ x: 0, z: 0, r: 0.95 }, { x: 1.8, z: 0.6, r: 0.8 });
  };

  // ------------------------------------------------------------------ the Great Tree of Elderbough
  BUILD.great_tree = (g, out, m, r) => {
    const barkT = T('v7elderbark', () => {
      const p = new Painter(32, 32), rr = H.rng(907);
      p.rect(0, 0, 32, 32, '#6a5240');
      for (let x = 0; x < 32; x += 4) { p.vline(x, 0, 32, '#4a3828'); p.vline(x + 1, 0, 32, '#7e6450'); }
      for (let i = 0; i < 70; i++) { const x = Math.floor(rr() * 32), y = Math.floor(rr() * 32); p.px(x, y, rr() < 0.5 ? '#3e2e22' : '#8a705a'); }
      for (let i = 0; i < 16; i++) { const x = Math.floor(rr() * 32), y = Math.floor(rr() * 32); p.rect(x, y, 2, 3, '#5a7a3a'); p.px(x, y, '#78a04a'); }
      return tex(p.c, 6, 3);
    });
    const R0 = 3.4, R1 = 2.2, TH = 11;
    put(g, geo('v7gttrunk', () => new THREE.CylinderGeometry(R1, R0, TH, 14, 3)), barkT, 0, TH / 2, 0);
    put(g, geo('v7gtflare', () => new THREE.CylinderGeometry(R0, R0 + 1.2, 1.4, 14)), barkT, 0, 0.7, 0);
    // roots gripping the ground, radiating out
    const roots = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.2, L = 6 + r() * 3.5, w = 0.9 + r() * 0.5;
      const x1 = Math.cos(a) * (R0 - 0.2), z1 = Math.sin(a) * (R0 - 0.2), x2 = Math.cos(a + (r() - 0.5) * 0.4) * (R0 + L), z2 = Math.sin(a + (r() - 0.5) * 0.4) * (R0 + L);
      if (z2 > 4 && Math.abs(x2) < 4) continue;                    // (the door’s way stays clear)
      beam(g, barkT, x1, 2.2, z1, (x1 + x2) / 2, 0.6, (z1 + z2) / 2, w, w * 0.85);
      beam(g, barkT, (x1 + x2) / 2, 0.6, (z1 + z2) / 2, x2, -0.15, z2, w * 0.7, w * 0.6);
      roots.push([(x1 + x2) / 2, (z1 + z2) / 2, w * 0.5], [x2 * 0.85 + x1 * 0.15, z2 * 0.85 + z1 * 0.15, w * 0.4]);
    }
    // Rootholm’s hall in the trunk: an arched door, round windows, a balcony
    const doorT = T('v7gtdoor', () => lit(16, 24, (p, q) => {
      p.rect(0, 0, 16, 24, '#3a2a1e'); p.rect(2, 4, 12, 20, '#7a5238');
      for (let x = 3; x < 14; x += 3) p.vline(x, 5, 19, '#5a3b2a');
      for (let x = 0; x < 16; x++) for (let y = 0; y < 6; y++) if ((x - 7.5) ** 2 / 36 + (y - 6) ** 2 / 25 > 1) p.px(x, y, '#3a2a1e');
      p.rect(6, 7, 4, 3, '#f8d890'); q.rect(6, 7, 4, 3, '#ffb860'); p.px(11, 15, '#f2c14e');
    }));
    put(g, B(1.5, 2.3, 0.3), doorT, 0, 1.15, R0 + 0.35);
    put(g, B(2.1, 0.14, 0.7), C('v7gtstep', 0x8a8478), 0, 0.07, R0 + 0.7);
    const winM = GL('v7gtwin', 0xf8d890, 0xffb860, 0.8);
    for (const [a, y] of [[-0.5, 4.6], [0.45, 5.2], [0.05, 7.4], [-1.9, 6.1], [1.8, 3.8]]) {
      const rr2 = R0 - (R0 - R1) * (y / TH) + 0.05;
      glow(put(g, geo('v7gtwin', () => new THREE.CircleGeometry(0.34, 10)), winM, Math.sin(a) * rr2, y, Math.cos(a) * rr2, a));
    }
    const bal = grp(g, 0, 5.8, 0);
    put(bal, geo('v7gtbal', () => new THREE.TorusGeometry(R0 - 0.3, 0.12, 5, 24, Math.PI)), m.wood, 0, 0, 0, 0, Math.PI / 2);
    put(bal, geo('v7gtdeck', () => new THREE.RingGeometry(R0 - 0.9, R0 - 0.2, 24, 1, 0, Math.PI)), m.planks, 0, -0.35, 0, 0, -Math.PI / 2, Math.PI);
    // big branches up into the crown
    for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2 + 0.4; beam(g, barkT, Math.cos(a) * 1.2, TH - 1.5, Math.sin(a) * 1.2, Math.cos(a) * 7, TH + 2.6 + r() * 1.5, Math.sin(a) * 6, 0.9, 0.8); }
    // the crown: great clouds of leaves (thinning in front of whoever walks behind)
    const leafT = T('v7gtleaf', () => {
      const p = new Painter(32, 32), rr = H.rng(911);
      p.rect(0, 0, 32, 32, '#3f7a3a');
      for (let i = 0; i < 110; i++) { const x = Math.floor(rr() * 32), y = Math.floor(rr() * 32), v = rr(); p.px(x, y, v < 0.4 ? '#2e5e30' : v < 0.8 ? '#5a9a48' : '#8acc5a'); if (v > 0.9) p.px(x, y + 1, '#5a9a48'); }
      return tex(p.c, 4, 2);
    });
    const crownM = seeThrough(leafT);
    const crown = grp(g, 0, 0, 0);
    const blobs = [[0, TH + 4.2, 0, 5.6], [-5.2, TH + 2.8, 0.6, 4.2], [5.3, TH + 3.0, 0.2, 4.4], [-2.6, TH + 6.4, -1.2, 4.0], [2.8, TH + 6.0, -0.8, 4.2],
      [0.6, TH + 3.0, 4.4, 3.8], [-3.6, TH + 3.4, -4.4, 3.8], [3.8, TH + 3.6, -4.0, 3.6], [-7.8, TH + 1.6, -1.8, 3.0], [8.0, TH + 2.0, -1.4, 3.0], [0, TH + 8.2, -2.4, 3.0]];
    for (const [x, y, z, s] of blobs) put(crown, geo('v7gtblob', () => new THREE.IcosahedronGeometry(1, 2)), crownM, x, y, z).scale.set(s, s * 0.78, s * 0.92);
    // lanterns hung from the lower branches, fireflies drifting round the crown
    const hung = [];
    for (const [x, y, z] of [[-4.6, TH + 0.6, 2.4], [4.2, TH + 0.4, 2.8], [-1.6, TH - 0.4, 3.9], [2.2, 6.8, 3.2]]) {
      put(g, B(0.02, 1.1, 0.02), C('v7string', 0x3a2a2a), x, y + 0.55, z);
      hung.push(lantern(g, out, x, y - 0.1, z, { s: 1.1 }));
    }
    const flyM = GL('v7firefly', 0xfff8a0, 0xfff070, 1.6);
    const flies = [];
    for (let k = 0; k < 14; k++) { const f = glow(put(g, OCT(), flyM, 0, 0, 0)); f.scale.setScalar(0.07); f.userData.noCast = true; flies.push({ f, a: r() * 6.28, rad: 4 + r() * 6, y: 3 + r() * 9, sp: 0.2 + r() * 0.3 }); }
    const ph = r() * 6;
    out.anim = (t) => {
      crown.rotation.z = Math.sin(t * 0.35 + ph) * 0.006; crown.rotation.x = Math.sin(t * 0.27) * 0.005;
      hung.forEach((l, i) => { l.rotation.z = Math.sin(t * 1.4 + i * 1.7) * 0.07; });
      for (const q of flies) { const a = q.a + t * q.sp; q.f.position.set(Math.cos(a) * q.rad, q.y + Math.sin(t * 1.3 + q.a) * 0.5, Math.sin(a) * q.rad * 0.8 + 1); }
    };
    out.anim(0);
    out.lights.push({ x: 0, y: 1.6, z: R0 + 1.2, color: 0xffb860, power: 1.4, lamp: true }, { x: 0, y: 5.5, z: R0 + 0.6, color: 0xffc070, power: 1.0, lamp: true });
    out.colliders.push({ x: 0, z: 0, r: R0 + 0.6 });
    for (const [x, z, rad] of roots) out.colliders.push({ x, z, r: rad });
  };

  // ------------------------------------------------------------------ Hollowmoor’s stone circle
  BUILD.stone_circle = (g, out, m, r) => {
    const stoneT = T('v7menhir', () => { const p = speckle(16, 32, '#8e8894', 921, 0.3); for (let i = 0; i < 6; i++) p.rect(Math.floor(i * 5 % 14), Math.floor(i * 11 % 28), 3, 2, '#c8a860'); return tex(p.c, 1, 1); });
    const N = 11, R = 4.6;
    const stones = [];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2, x = Math.cos(a) * R, z = Math.sin(a) * R * 0.92;
      if (i === 7) { put(g, B(0.7, 0.45, 1.9), stoneT, x, 0.22, z, a + 0.3, 0, 0.08); out.colliders.push({ x, z, r: 0.6 }); continue; }  // a fallen one
      const h = 1.6 + r() * 0.9;
      put(g, B(0.72, h, 0.42), stoneT, x, h / 2, z, -a + Math.PI / 2, (r() - 0.5) * 0.08, (r() - 0.5) * 0.1);
      stones.push([x, z, h]);
      out.colliders.push({ x, z, r: 0.42 });
    }
    // a trilithon at the back: two posts and a lintel
    for (const sx of [-0.75, 0.75]) put(g, B(0.6, 2.6, 0.5), stoneT, sx, 1.3, -R - 1.4);
    put(g, B(2.3, 0.45, 0.56), stoneT, 0, 2.8, -R - 1.4);
    out.colliders.push({ x: -0.75, z: -R - 1.4, r: 0.4 }, { x: 0.75, z: -R - 1.4, r: 0.4 });
    // the altar stone, a faint rune on it
    put(g, B(1.6, 0.5, 1.0), stoneT, 0, 0.25, 0);
    const rune = glow(put(g, geo('v7rune', () => new THREE.RingGeometry(0.2, 0.3, 12)), GL('v7rune', 0x9ad8ff, 0x6ab8ff, 0.4), 0, 0.51, 0, 0, -Math.PI / 2));
    const ph = r() * 6;
    out.anim = (t) => { rune.material.emissiveIntensity = 0.25 + (0.5 + 0.5 * Math.sin(t * 1.1 + ph)) * 0.6; };
    out.anim(0);
    out.lights.push({ x: 0, y: 0.8, z: 0.4, color: 0x8ac8ff, power: 0.5 });
    out.colliders.push({ rect: [-0.8, -0.5, 1.6, 1.0] });
    void stones;
  };

  // ------------------------------------------------------------------ the Prism Fields’ giant geode
  BUILD.geode = (g, out, m, r) => {
    const shellT = T('v7geoshell', () => { const p = speckle(32, 16, '#6a5a58', 931, 0.4); for (let y = 0; y < 16; y += 4) p.hline(0, y, 32, '#8a7a72'); return tex(p.c, 3, 1); });
    const inner = C('v7geoin', 0xe8dcf4, { side: THREE.BackSide });
    // the shell: the back half of a big hollow sphere, cut open towards us
    const Rr = 3.4;
    put(g, geo('v7geoshell', () => new THREE.SphereGeometry(Rr, 18, 10, Math.PI, Math.PI, 0, Math.PI / 2)), shellT, 0, 0, 0);
    put(g, geo('v7geoin', () => new THREE.SphereGeometry(Rr - 0.35, 18, 10, Math.PI, Math.PI, 0, Math.PI / 2)), inner, 0, 0, 0);
    put(g, geo('v7georim', () => new THREE.TorusGeometry(Rr - 0.17, 0.2, 5, 18, Math.PI)), C('v7georim', 0xb8a8c8), 0, 0, 0, 0, 0, 0);
    // crystals lining it, pointing in, all the colours of a prism
    const cols = [0xff9ad6, 0x9adcff, 0xfff09a, 0xb4ffc4, 0xc8a8ff];
    const items = [];
    for (let i = 0; i < 46; i++) {
      const u = Math.PI + r() * Math.PI, v = r() * Math.PI * 0.46, rr = Rr - 0.45;
      const x = Math.cos(u) * Math.sin(Math.PI / 2 - v) * rr, y = Math.sin(v) * rr, z = Math.sin(u) * Math.sin(Math.PI / 2 - v) * rr;
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(-x, -y * 0.6, -z).normalize());
      const s = 0.14 + r() * 0.16;
      items.push([x, y, z, s, s * 3, s, q, 0, 0, cols[i % 5]]);
    }
    const crysM = GL('v7geocrys', 0xffffff, 0x8a6ad8, 0.45);
    glow(inst(g, OCT(), crysM, items));
    // big crystals round the outside
    const outside = [];
    for (let i = 0; i < 9; i++) { const a = r() * Math.PI * 2, d = Rr + 0.6 + r() * 2.2, s = 0.25 + r() * 0.3; if (Math.sin(a) > 0.3 && Math.abs(Math.cos(a)) < 0.6) continue; outside.push([Math.cos(a) * d, s * 1.5, Math.sin(a) * d, s, s * 3.2, s, r() * 3, (r() - 0.5) * 0.4, (r() - 0.5) * 0.4, cols[i % 5]]); }
    glow(inst(g, OCT(), crysM, outside));
    const ph = r() * 6;
    out.anim = (t) => { crysM.emissiveIntensity = 0.4 + (0.5 + 0.5 * Math.sin(t * 0.8 + ph)) * 0.35; };
    out.anim(0);
    out.lights.push({ x: 0, y: 1.2, z: -0.5, color: 0xc8a0ff, power: 1.6, lamp: true });
    for (let k = 0; k <= 8; k++) { const a = Math.PI + (k / 8) * Math.PI; out.colliders.push({ x: Math.cos(a) * (Rr - 0.1), z: Math.sin(a) * (Rr - 0.1), r: 0.6 }); }
  };

  // ------------------------------------------------------------------ Cogsworth’s clock tower
  BUILD.clocktower = (g, out, m, r) => {
    const brick = T('v7cwbrick', () => { const p = new Painter(16, 16); p.rect(0, 0, 16, 16, '#9a5a42'); for (let y = 0; y < 16; y += 4) { p.hline(0, y, 16, '#6a3a2a'); for (let x = (y / 4) % 2 ? 0 : 4; x < 16; x += 8) p.vline(x, y, 4, '#6a3a2a'); } p.px(3, 2, '#b8745a'); p.px(11, 6, '#b8745a'); return tex(p.c, 2, 4); });
    const brass = C('v7brass', 0xc09a4a), dk = C('v7brassdk', 0x6a5428), copper = C('v7copper', 0x5aa89a);
    put(g, B(4.4, 1.6, 4.4), brick, 0, 0.8, 0);
    put(g, B(3.4, 8.6, 3.4), brick, 0, 5.9, 0);
    for (const y of [1.6, 5.2, 10.2]) put(g, B(y === 1.6 ? 4.6 : 3.6, 0.2, y === 1.6 ? 4.6 : 3.6), brass, 0, y, 0);
    // the door & windows
    const frontT = T('v7cwfront', () => lit(20, 12, (p, q) => { p.rect(0, 0, 20, 12, '#9a5a42'); p.rect(7, 2, 6, 10, '#4a3020'); p.rect(8, 3, 4, 9, '#6a4a2a'); for (const wx of [2, 15]) { p.rect(wx, 3, 3, 4, '#3a2a20'); p.rect(wx, 3, 3, 4, '#f8d890'); q.rect(wx, 3, 3, 4, '#ffb860'); } }));
    put(g, B(4.42, 1.2, 0.02), frontT, 0, 0.7, 2.21);
    const winM = GL('v7cwwin', 0xf8d890, 0xffb860, 0.7);
    for (const y of [3.4, 7.0]) for (const sx of [-0.7, 0.7]) glow(put(g, B(0.45, 0.8, 0.05), winM, sx, y, 1.72));
    // the clock face on the south side: a dial, twelve marks, two hands that keep the day’s time
    const faceY = 8.7;
    put(g, geo('v7cwdialrim', () => new THREE.CylinderGeometry(1.35, 1.35, 0.2, 24)), brass, 0, faceY, 1.72, 0, Math.PI / 2);
    put(g, geo('v7cwdial', () => new THREE.CircleGeometry(1.2, 24)), GL('v7dial', 0xfff4dc, 0xffe0a0, 0.35), 0, faceY, 1.83);
    for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; put(g, B(0.08, k % 3 ? 0.18 : 0.3, 0.02), C('v7ink', 0x2a2433), Math.sin(a) * 0.98, faceY + Math.cos(a) * 0.98, 1.85, 0, 0, -a); }
    const hour = grp(g, 0, faceY, 1.87), minute = grp(g, 0, faceY, 1.89);
    put(hour, B(0.1, 0.62, 0.02), C('v7ink', 0x2a2433), 0, 0.28, 0);
    put(minute, B(0.07, 0.92, 0.02), C('v7ink', 0x2a2433), 0, 0.42, 0);
    put(g, ICO(), brass, 0, faceY, 1.9).scale.setScalar(0.09);
    // the roof, a gear weathervane, big gears turning on the east wall
    put(g, B(3.9, 0.3, 3.9), dk, 0, 10.45, 0);
    put(g, geo('v7cwroof', () => new THREE.ConeGeometry(2.8, 2.6, 4)), copper, 0, 11.9, 0, Math.PI / 4);
    put(g, CYL(), dk, 0, 13.6, 0).scale.set(0.08, 1.2, 0.08);
    const vane = grp(g, 0, 14.2, 0);
    const gearGeo = geo('v7gear', () => { const s = new THREE.Shape(), n = 12; for (let i = 0; i <= n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2, rr = i % 2 ? 1 : 0.8; if (i) s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } const h = new THREE.Path(); h.absarc(0, 0, 0.3, 0, Math.PI * 2, true); s.holes.push(h); return new THREE.ExtrudeGeometry(s, { depth: 0.14, bevelEnabled: false }); });
    put(vane, gearGeo, brass, 0, 0, 0).scale.setScalar(0.42);
    const gears = [];
    for (const [y, z, s, dir] of [[3.2, 0.6, 1.1, 1], [4.7, -0.7, 0.75, -1], [6.4, 0.3, 0.9, 1]]) { const gg = grp(g, 1.74, y, z, Math.PI / 2); put(gg, gearGeo, y === 4.7 ? dk : brass, 0, 0, 0).scale.setScalar(s); gears.push([gg, dir / s]); }
    // steam from a chimney pipe
    put(g, CYL(), dk, -1.3, 10.9, -1.2).scale.set(0.3, 1.5, 0.3);
    const puffs = [];
    for (let k = 0; k < 3; k++) { const s = put(g, ICO(), C('v7steam' + k, 0xf4f4f8, { transparent: true }), -1.3, 12.4, -1.2); s.userData.noCast = true; puffs.push(s); }
    out.anim = (t, dt, clock) => {
      const hrs = clock != null ? clock : (t / 60) % 24;
      hour.rotation.z = -((hrs % 12) / 12) * Math.PI * 2; minute.rotation.z = -((hrs % 1)) * Math.PI * 2;
      vane.rotation.y = Math.sin(t * 0.3) * 0.8;
      for (const [gg, k] of gears) gg.children[0].rotation.z = t * 0.6 * k;
      puffs.forEach((s, k) => { const q = (t * 0.3 + k / 3) % 1; s.position.set(-1.3 + q * 0.5, 12.4 + q * 1.6, -1.2); s.scale.setScalar(0.18 + q * 0.4); s.material.opacity = 0.6 * (1 - q); });
    };
    out.anim(0);
    out.lights.push({ x: 0, y: faceY, z: 2.3, color: 0xffe0a0, power: 1.2, lamp: true }, { x: 0, y: 1, z: 2.6, color: 0xffb860, power: 0.8, lamp: true });
    out.colliders.push({ rect: [-2.2, -2.2, 4.4, 4.4] });
  };

  // ------------------------------------------------------------------ the sleeping whale: its eye & its tail
  const skin = () => T('v7whaleskin', () => { const p = speckle(16, 16, '#5a6a80', 941, 0.25); for (let i = 0; i < 5; i++) p.rect((i * 7) % 14, (i * 5) % 14, 2, 1, '#8a9aac'); return tex(p.c, 2, 2); });
  const barnacles = (g, pts) => inst(g, geo('v7barn', () => new THREE.ConeGeometry(0.12, 0.14, 6)), C('v7barn', 0xe8e4dc), pts.map(([x, y, z, s]) => [x, y, z, s, s, s, 0, 0, 0]));
  BUILD.whale_eye = (g, out, m, r) => {
    // the eye sits on the whale’s head at the waterline, shut (for now): a great
    // mound of hide, and under a heavy lid an eye the size of a door
    const E = grp(g, 0, 0, 0);
    E.scale.setScalar(1.5);
    put(E, geo('v7eyesock', () => new THREE.SphereGeometry(1.7, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2)), skin(), 0, 0, -0.4).scale.set(1.25, 0.95, 0.7);
    // (the eye: a white almond, a gold iris, a black pupil, a glint)
    const eye = grp(E, 0, 0.78, 0.62);
    const ball = put(eye, geo('v7eyeball', () => new THREE.SphereGeometry(0.62, 14, 10)), GL('v7eyeball', 0xf4f0e8, 0xf4f0e8, 0.35), 0, 0, 0);
    ball.scale.set(1.45, 0.95, 0.55);
    const iris = put(eye, geo('v7iris', () => new THREE.SphereGeometry(0.4, 12, 8)), GL('v7iris', 0xd8a040, 0xc89030, 0.35), 0.06, 0, 0.2);
    iris.scale.set(1, 1, 0.45);
    const pupil = put(eye, geo('v7pupil', () => new THREE.SphereGeometry(0.22, 10, 6)), C('v7pupil', 0x1a1a2a), 0.08, 0, 0.35);
    pupil.scale.set(0.7, 1.2, 0.5);
    glow(put(eye, geo('v7glint', () => new THREE.SphereGeometry(0.08, 6, 4)), GL('v7glint', 0xffffff, 0xffffff, 1), 0.22, 0.14, 0.42));
    // (the lid: a fold of hide over the eye, lashes along its rim; it rolls up to open)
    const lid = grp(E, 0, 1.36, 0.66);
    const fold = put(lid, geo('v7eyelid', () => new THREE.SphereGeometry(0.66, 14, 10)), skin(), 0, -0.56, 0);
    fold.scale.set(1.5, 0.98, 0.62);
    const lashes = grp(E, 0, 0.8, 1.02);
    for (let k = 0; k < 7; k++) put(lashes, B(0.06, 0.34, 0.05), C('v7lash', 0x2a2433), -0.72 + k * 0.24, 0, 0, 0, 0.5, (k - 3) * 0.16);
    barnacles(E, [[-1.6, 0.5, 0.2, 1], [-1.3, 0.9, -0.1, 0.8], [1.5, 0.6, 0.1, 1.1], [1.8, 0.3, 0.3, 0.9], [-0.4, 1.35, -0.2, 0.7], [0.9, 1.25, -0.3, 0.8]]);
    const ph = r() * 6;
    // (the saga opens it: userData.open = 0..1; open, it looks about and blinks)
    g.userData.open = 0;
    out.anim = (t) => {
      const o = g.userData.open || 0, blink = o > 0.9 && Math.sin(t * 0.9 + ph) > 0.985 ? 0.9 : 0, k = Math.max(0, o - blink);
      // (the fold shrinks up into the brow; the lashes ride its rim)
      fold.scale.y = 0.98 * (1 - k * 0.9) + 0.02; fold.position.y = -0.56 * (1 - k * 0.9);
      lashes.position.y = 0.8 + k * 0.52 + Math.sin(t * 0.4 + ph) * 0.01;
      eye.visible = k > 0.05;
      iris.position.x = 0.06 + Math.sin(t * 0.5 + ph) * 0.12 * o; pupil.position.x = iris.position.x + 0.02;
    };
    out.anim(0);
    out.colliders.push({ x: 0, z: -0.3, r: 2.2 });
  };
  BUILD.whale_tail = (g, out, m, r) => {
    const sk = skin(), belly = C('v7belly', 0xc8d0d8);
    const stem = grp(g, 0, 0, 0);
    beam(stem, sk, 0, -0.5, 0, 0.6, 2.4, -0.2, 1.1, 0.9);
    const fl = grp(stem, 0.7, 2.6, -0.2);
    for (const s of [-1, 1]) { put(fl, geo('v7fluke', () => new THREE.SphereGeometry(1, 12, 6)), sk, s * 1.3, 0.3, 0, 0, 0, s * 0.45).scale.set(1.5, 0.35, 0.7); put(fl, geo('v7fluke', () => new THREE.SphereGeometry(1, 12, 6)), belly, s * 1.25, 0.18, 0.12, 0, 0, s * 0.45).scale.set(1.3, 0.2, 0.55); }
    barnacles(stem, [[0.3, 1.2, 0.45, 1], [0.5, 1.8, 0.3, 0.8], [0.1, 0.6, 0.5, 0.9]]);
    // water streaming off the flukes
    const drips = [];
    for (let k = 0; k < 6; k++) { const d = put(g, B(0.05, 0.3, 0.05), C('v7drip' + k, 0xcfe8f8, { transparent: true }), 0, 0, 0); d.userData.noCast = true; drips.push(d); }
    const ph = r() * 6;
    out.anim = (t) => {
      stem.rotation.z = Math.sin(t * 0.5 + ph) * 0.06; fl.rotation.x = Math.sin(t * 0.7 + ph) * 0.08;
      drips.forEach((d, k) => { const q = (t * 0.9 + k / 6) % 1, s = k % 2 ? -1 : 1; d.position.set(0.7 + s * (1.4 + (k % 3) * 0.4), 2.7 - q * 3, -0.2); d.material.opacity = 0.8 * (1 - q); });
    };
    out.anim(0);
    out.colliders.push({ x: 0.2, z: 0, r: 0.9 });
  };

  void paintRoof; void HIPROOF;
}

// ------------------------------------------------------------------ a mountain’s jagged peaks
// Faceted spires (a jittered cone, flat-shaded, coloured face by face: rock in
// three shades, moss low down, snow above a ragged line), in a cluster with
// boulders at their feet. Styles follow the land: snow, rock, mossy, red (the
// desert’s buttes), black (the volcano, the Scar), granite, karst.
export const PEAK_STYLES = {
  snow: { rock: [0x5e5c6c, 0x77738a, 0x8f8b9e], snow: 0xf2f6ff, line: 0.5, moss: null },
  rock: { rock: [0x625e6a, 0x7e7986, 0x98939e], snow: 0xf2f6ff, line: 0.82, moss: null },
  mossy: { rock: [0x5a5662, 0x736e7a, 0x8a8692], snow: null, line: 2, moss: 0x5a8a4a },
  red: { rock: [0x8a3a2a, 0xa64e38, 0xc0684a], snow: null, line: 2, moss: null },
  black: { rock: [0x241e2c, 0x342c3c, 0x46404e], snow: null, line: 2, moss: null },
  granite: { rock: [0x8a8680, 0xa4a098, 0xbeb9b0], snow: null, line: 2, moss: 0x5a8a4a },
  karst: { rock: [0x86887e, 0x9ea094, 0xb8baac], snow: null, line: 2, moss: 0x4f8a3c },
};
export function installPeaks(BUILD, H) {
  const { THREE, put, geo, C, ROCK, inst } = H;
  const peakGeo = (style, v) => geo('v7peak-' + style + v, () => {
    const P = PEAK_STYLES[style] || PEAK_STYLES.rock, rr = H.rng(4001 + v * 131 + style.length * 7);
    const g0 = new THREE.ConeGeometry(1, 1, 7, 5).translate(0, 0.5, 0);
    const pos = g0.attributes.position, jit = new Map();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), key = `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
      let j = jit.get(key);
      if (!j) { j = y > 0.99 ? [(rr() - 0.5) * 0.16, 0, (rr() - 0.5) * 0.16] : [(rr() - 0.5) * 0.36, (rr() - 0.5) * 0.12, (rr() - 0.5) * 0.36]; jit.set(key, j); }
      const k = 1 - y * 0.6;
      pos.setXYZ(i, x + j[0] * k, Math.max(0, y + j[1] * (y > 0 && y < 0.99 ? 1 : 0)), z + j[2] * k);
    }
    const g = g0.toNonIndexed();
    const p = g.attributes.position, cols = new Float32Array(p.count * 3), c = new THREE.Color();
    for (let f = 0; f < p.count; f += 3) {
      const cy = (p.getY(f) + p.getY(f + 1) + p.getY(f + 2)) / 3, h = rr();
      const snowy = P.snow !== null && cy > P.line + (h - 0.5) * 0.22;
      c.setHex(snowy ? (h < 0.3 ? 0xdce6f4 : P.snow) : P.moss !== null && cy < 0.28 + h * 0.12 ? P.moss : P.rock[Math.floor(h * 3)]);
      for (let k = 0; k < 3; k++) { cols[(f + k) * 3] = c.r; cols[(f + k) * 3 + 1] = c.g; cols[(f + k) * 3 + 2] = c.b; }
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    g.computeVertexNormals();
    return g;
  });
  // a limestone pillar (Zhangjiajie, Ha Long): a tall jittered column, streaked, green on top
  const pillarGeo = (v) => geo('v7pillar' + v, () => {
    const rr = H.rng(5003 + v * 97);
    const g0 = new THREE.CylinderGeometry(0.78, 1, 1, 8, 6).translate(0, 0.5, 0);
    const pos = g0.attributes.position, jit = new Map();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), key = `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
      let j = jit.get(key);
      if (!j) { const k = 1 + (rr() - 0.5) * 0.4; j = [k, (rr() - 0.5) * 0.05]; jit.set(key, j); }
      pos.setXYZ(i, x * j[0], y > 0.01 && y < 0.99 ? y + j[1] : y, z * j[0]);
    }
    const g = g0.toNonIndexed(), p = g.attributes.position, cols = new Float32Array(p.count * 3), c = new THREE.Color();
    for (let f = 0; f < p.count; f += 3) {
      const cy = (p.getY(f) + p.getY(f + 1) + p.getY(f + 2)) / 3, h = rr();
      c.setHex(cy > 0.97 ? 0x4f8a3c : cy > 0.86 && h < 0.5 ? 0x5a9a44 : h < 0.25 ? 0x7e8078 : h < 0.6 ? 0x9ea094 : h < 0.9 ? 0xb4b6aa : 0x6a7a5a);
      for (let k = 0; k < 3; k++) { cols[(f + k) * 3] = c.r; cols[(f + k) * 3 + 1] = c.g; cols[(f + k) * 3 + 2] = c.b; }
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    g.computeVertexNormals();
    return g;
  });
  BUILD.peak = (g, out, m, r, seed, p = {}) => {
    const style = p.style || 'rock', h = p.h || 6, mat = seeThrough(C('v7peak', 0xffffff, { vertexColors: true }));
    if (style === 'karst') {
      // a column of limestone, a cap of greenery, a pine or two clinging on top
      const rad = 0.7 + h * 0.08, cap = seeThrough(C('v7karstcap', 0x4f8a3c)), pine = C('v7karstpine', 0x2f6a45);
      put(g, pillarGeo(seed % 5), mat, 0, 0, 0, r() * 6).scale.set(rad, h, rad * 0.9);
      put(g, geo('v7kcap', () => new THREE.IcosahedronGeometry(1, 1)), cap, 0, h, 0).scale.set(rad * 1.15, rad * 0.55, rad * 1.05);
      for (let k = 0; k < 2; k++) { const a = r() * 6.28, d = rad * 0.4; put(g, geo('v7kpine', () => new THREE.ConeGeometry(0.4, 1.3, 6)), pine, Math.cos(a) * d, h + rad * 0.4 + 0.5, Math.sin(a) * d * 0.8).scale.setScalar(0.8 + r() * 0.6); }
      if (h > 6) { const a = r() * 6.28, s2 = h * (0.45 + r() * 0.2); put(g, pillarGeo((seed + 2) % 5), mat, Math.cos(a) * rad * 1.3, 0, Math.sin(a) * rad * 0.9, r() * 6).scale.set(rad * 0.6, s2, rad * 0.55); }
      out.colliders.push({ x: 0, z: 0, r: rad * 0.9 });
      return;
    }
    const main = put(g, peakGeo(style, seed % 6), mat, 0, 0, 0, r() * 6);
    main.scale.set(h * 0.44, h, h * 0.36);
    for (let k = 0; k < 3; k++) {
      const a = r() * Math.PI * 2, d = h * (0.28 + r() * 0.16), s = h * (0.42 + r() * 0.3);
      put(g, peakGeo(style, (seed + k + 1) % 6), mat, Math.cos(a) * d, 0, Math.sin(a) * d * 0.6, r() * 6).scale.set(s * 0.46, s, s * 0.4);
    }
    const P = PEAK_STYLES[style] || PEAK_STYLES.rock;
    inst(g, ROCK(), C('v7peakrock' + style, P.rock[1]), Array.from({ length: 5 }, () => { const a = r() * Math.PI * 2, d = h * (0.4 + r() * 0.2), s = 0.3 + r() * 0.5; return [Math.cos(a) * d, s * 0.4, Math.sin(a) * d * 0.7, s, s * 0.7, s, r() * 6]; }));
    out.colliders.push({ x: 0, z: 0, r: h * 0.3 });
  };
}

// ------------------------------------------------------------------ Dusty Gulch
// the Red Canyon’s gold-rush town: false-front wooden buildings round the
// railway’s end — a saloon, a general store, the sheriff’s office, the assay
// office. p.style picks which; each has a porch on posts, a sign with its own
// picture (a mug, a pick & sack, a star, scales), barrels and a hitching rail.
export function installFrontier(BUILD, H) {
  const { put, grp, lantern, glow, B, OCT, CYL, C, GL } = H;
  const STYLES = {
    saloon: { wall: 0x9a4a3a, trim: 0xf2e6c8, w: 5, d: 3.6, h: 2.6 },
    store: { wall: 0x5a7a7a, trim: 0xf2e6c8, w: 4.6, d: 3.4, h: 2.3 },
    sheriff: { wall: 0xc8944a, trim: 0x5a3a2a, w: 4.2, d: 3.2, h: 2.2 },
    assay: { wall: 0xb8a888, trim: 0x6a4a34, w: 4.2, d: 3.2, h: 2.3 },
  };
  BUILD.frontier = (g, out, m, r, seed, p) => {
    const st = p.style || 'store', S = STYLES[st] || STYLES.store, { w, d, h } = S;
    const wall = C('fr-' + st, S.wall), trim = C('fr-trim-' + st, S.trim), dark = m.dark, planks = m.planks;
    const win = GL('fr-win', 0xffe8a0, 0xffb860, 0.55), gold = GL('fr-gold', 0xf2c14e, 0xc89020, 0.3);
    // the body, its boards, the false front with a stepped top
    put(g, B(w, h, d), wall, 0, h / 2, 0);
    for (let i = 0; i < Math.round(w / 0.5); i++) put(g, B(0.03, h, 0.02), dark, -w / 2 + 0.25 + i * 0.5, h / 2, d / 2 + 0.01);
    put(g, B(w + 0.1, 0.9, 0.14), wall, 0, h + 0.45, d / 2);
    put(g, B(w * 0.5, 0.5, 0.14), wall, 0, h + 1.15, d / 2);
    put(g, B(w + 0.2, 0.1, 0.2), trim, 0, h + 0.92, d / 2);
    put(g, B(w * 0.5 + 0.1, 0.1, 0.2), trim, 0, h + 1.42, d / 2);
    put(g, B(w - 0.2, 0.12, d + 0.2), dark, 0, h + 0.05, -0.1).rotation.x = -0.08;
    // the porch: a deck, posts and a sloping roof
    put(g, B(w + 0.4, 0.14, 1.1), planks, 0, 0.07, d / 2 + 0.55);
    for (const x of [-w / 2, -w / 6, w / 6, w / 2]) put(g, B(0.14, h - 0.3, 0.14), dark, x * 0.95, (h - 0.3) / 2, d / 2 + 1.0);
    const roof = put(g, B(w + 0.5, 0.1, 1.3), trim, 0, h - 0.25, d / 2 + 0.6); roof.rotation.x = 0.22;
    // a door, two windows (lit a little), a sign over the porch
    put(g, B(0.8, 1.5, 0.06), dark, 0, 0.75, d / 2 + 0.03);
    if (st === 'saloon') for (const s of [-1, 1]) put(g, B(0.36, 0.7, 0.04), trim, s * 0.2, 0.95, d / 2 + 0.08, 0, 0, s * 0.05);
    for (const s of [-1, 1]) { glow(put(g, B(0.8, 0.7, 0.05), win, s * w * 0.3, 1.15, d / 2 + 0.03)); put(g, B(0.9, 0.08, 0.08), trim, s * w * 0.3, 1.52, d / 2 + 0.05); }
    const sign = grp(g, 0, h + 0.45, d / 2 + 0.1);
    put(sign, B(1.6, 0.6, 0.06), trim, 0, 0, 0);
    const ink = C('fr-ink', 0x3a2a2a);
    if (st === 'saloon') { put(sign, B(0.3, 0.36, 0.05), gold, -0.1, -0.02, 0.04); put(sign, B(0.1, 0.2, 0.05), gold, 0.12, 0, 0.04); put(sign, B(0.3, 0.08, 0.05), C('fr-froth', 0xfffaf0), -0.1, 0.18, 0.05); }
    else if (st === 'sheriff') { const s = glow(put(sign, OCT(), gold, 0, 0, 0.05)); s.scale.set(0.26, 0.26, 0.05); s.rotation.z = Math.PI / 4; put(sign, OCT(), gold, 0, 0, 0.05).scale.set(0.26, 0.26, 0.05); }
    else if (st === 'store') { put(sign, B(0.3, 0.34, 0.05), C('fr-sack', 0xd8c89a), -0.3, -0.04, 0.04); put(sign, B(0.06, 0.4, 0.05), ink, 0.25, 0, 0.04); put(sign, B(0.4, 0.07, 0.05), C('fr-steel', 0x9aa0aa), 0.25, 0.18, 0.05, 0, 0, 0.2); }
    else { put(sign, B(0.06, 0.34, 0.05), ink, 0, 0, 0.04); put(sign, B(0.6, 0.05, 0.05), ink, 0, 0.16, 0.04); for (const s of [-1, 1]) put(sign, B(0.22, 0.06, 0.05), gold, s * 0.28, -0.02, 0.05); }
    // barrels on the porch, a hitching rail in front, a lantern by the door
    for (const [x, z] of [[w / 2 - 0.35, d / 2 + 0.45], [w / 2 - 0.35, d / 2 + 0.95]]) { put(g, CYL(), C('fr-barrel', 0x8e5d3e), x, 0.5, z).scale.set(0.3, 0.7, 0.3); put(g, CYL(), dark, x, 0.72, z).scale.set(0.31, 0.05, 0.31); }
    for (const x of [-w * 0.35, -w * 0.05]) put(g, B(0.12, 0.8, 0.12), dark, x, 0.4, d / 2 + 2.2);
    put(g, B(w * 0.36, 0.08, 0.08), dark, -w * 0.2, 0.72, d / 2 + 2.2);
    lantern(g, out, -0.75, 1.8, d / 2 + 0.2, { s: 0.6 });
    out.colliders.push({ rect: [-w / 2, -d / 2, w, d + 0.2] });
    for (const x of [-w / 2, w / 2]) out.colliders.push({ x: x * 0.95, z: d / 2 + 1.0, r: 0.15 });
    out.colliders.push({ x: w / 2 - 0.35, z: d / 2 + 0.7, r: 0.4 });
    void r; void seed;
  };
}
