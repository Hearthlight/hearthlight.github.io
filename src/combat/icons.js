// Tiny pixel icons for the fighting classes, gear and mounts (shared by the
// big screen and the phone controller, so no Three.js in here).

import { itemColor } from './v3/gear.js';
import { WEAPONS } from './v4/weapons.js';
import { drawIcon } from './v4/icons.js';

const ICONS = {
  knight: { g: ['....aaaa....', '..aabbbbaa..', '.abbbbbbbba.', '.abbbbbbbba.', '.abbbbbbbba.', '..aabbbbaa..', '....aaaa....', '.....cc.....', '.....cc.....', '.....cc.....', '.....cc.....'], c: { a: '#2a2433', b: '#6a6478', c: '#8a5a36' } },
  mage: { g: ['........y...', '.......yyy..', '......yyyyy.', '.......yyy..', '......c.y...', '.....c......', '....c.......', '...c........', '..c.........', '.c..........'], c: { y: '#ffd66b', c: '#8a5a36' } },
  ranger: { g: ['.....cc.....', '...aaaaaa...', '..aaaaaaaa..', '..aaaaaaaa..', '...bbbbbb...', '...bbbbbb...', '...bbbbbb...', '....bbbb....', '.....bb.....'], c: { a: '#6b4330', b: '#d6a468', c: '#4a3020' } },
  bard: { g: ['......pppp..', '......p..p..', '......p..p..', '......p..p..', '......p..p..', '....ppp.ppp.', '...pppp.pppp', '...ppp..ppp.'], c: { p: '#f59ac8' } },
  // (Release v9) a lantern on its pole, a sprout, a whisk, a wrench
  lamplighter: { g: ['.......aaaa.', '....aaaa..a.', '....a....aaa', '....a...ayya', '....a...aYya', '....a...ayya', '....a....aa.', '....a.......', '....a.......', '....a.......', '...aaa......'], c: { a: '#3b2a2e', y: '#ffc94a', Y: '#fff3c4' } },
  gardener: { g: ['...ll...LL..', '..lll..LLL..', '..llll.LL...', '....l.L.....', '.....ll.....', '.....l......', '...bbbbbb...', '...bccccb...', '....bccb....', '....bbbb....'], c: { l: '#6fc05a', L: '#a8e07a', b: '#6b4330', c: '#a0683a' } },
  cook: { g: ['.......sss..', '......s...s.', '.....s.s.s.s', '.....s.s.s.s', '......s...s.', '.......sss..', '......h.....', '.....h......', '....h.......', '...h........', '..h.........'], c: { s: '#dcdce8', h: '#8a5a36' } },
  tinkerer: { g: ['........mm.m', '.......mm..m', '.......mmmmm', '......mmm...', '.....mmm....', '....mmm.....', '...mmm......', '..mmm.......', '.mmd........', '.dd.........'], c: { m: '#a8a4b0', d: '#4a4652' } },
};

// a 12×12 icon with its top-left corner at (x, y) (s: pixel size)
export function drawClassIcon(ctx, id, x, y, s = 1) {
  const ic = ICONS[id];
  if (!ic) return;
  ic.g.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const k = row[i];
      if (k === '.') continue;
      ctx.fillStyle = ic.c[k];
      ctx.fillRect(Math.round(x) + i * s, Math.round(y) + j * s, s, s);
    }
  });
}

// a rune (a gem) or a charm (a round token), 12×12, in the item's colour
export function drawGearIcon(ctx, it, x, y, s = 1) {
  // (a weapon: its illustrated icon, a little bigger than the 12×12 gems)
  if (it.kind === 'weapon') { drawIcon(ctx, WEAPONS[it.type] ? WEAPONS[it.type].icon : null, x - 3 * s, y - 3 * s, { s }); return; }
  const c = itemColor(it);
  ctx.fillStyle = '#241a2e';
  if (it.kind === 'rune') {
    for (let i = 0; i < 6; i++) ctx.fillRect(x + (5 - i) * s, y + i * s, (2 + i * 2) * s, s);
    for (let i = 0; i < 5; i++) ctx.fillRect(x + (1 + i) * s, y + (6 + i) * s, (10 - i * 2) * s, s);
    ctx.fillStyle = c;
    for (let i = 1; i < 6; i++) ctx.fillRect(x + (5 - i + 1) * s, y + i * s, (i * 2) * s, s);
    for (let i = 0; i < 4; i++) ctx.fillRect(x + (2 + i) * s, y + (6 + i) * s, (8 - i * 2) * s, s);
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(x + 4 * s, y + 3 * s, s, 2 * s);
  } else {
    ctx.fillRect(x + 2 * s, y, 8 * s, 12 * s); ctx.fillRect(x, y + 2 * s, 12 * s, 8 * s); ctx.fillRect(x + s, y + s, 10 * s, 10 * s);
    ctx.fillStyle = c; ctx.fillRect(x + 3 * s, y + s, 6 * s, 10 * s); ctx.fillRect(x + s, y + 3 * s, 10 * s, 6 * s); ctx.fillRect(x + 2 * s, y + 2 * s, 8 * s, 8 * s);
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(x + 3 * s, y + 3 * s, 2 * s, s);
  }
}

// the mounts, side on (12×10); `shadow` draws a dark silhouette (not met yet)
const MOUNT_PIX = {
  stag: { g: ['a.a.........', 'aaa.........', '.bb.........', 'bebbbbbbbbb.', '.bbbbbbbbbbt', '..bbbbbbbbb.', '..bwwwwwwbb.', '..l.l...l.l.', '..l.l...l.l.', '..h.h...h.h.'], c: { a: '#efe0c0', b: '#b07a4a', e: '#2a2433', w: '#f0dcc0', l: '#8a5a36', t: '#f0dcc0', h: '#4a3020' } },
  boar: { g: ['............', '....mmmmm...', '..bbbbbbbbb.', 'bbebbbbbbbbt', 'wbbbbbbbbbb.', '.bbbbbbbbbb.', '..bbbbbbbb..', '..l.l..l.l..', '..l.l..l.l..', '..h.h..h.h..'], c: { m: '#4a3020', b: '#8a6a5a', e: '#2a2433', w: '#fff7e6', t: '#6b4330', l: '#6b5040', h: '#3b2a22' } },
  hen: { g: ['...cc.......', '..wwww......', '.ywewww.....', 'yywwww...ww.', '...wwwwwwww.', '...wwwwwwwww', '....wwwwww..', '.....y..y...', '.....y..y...', '....yy.yy...'], c: { c: '#e04848', w: '#fff7e6', y: '#f4b73a', e: '#2a2433' } },
  turtle: { g: ['............', '............', '....ssss....', '...sSsSss...', '..sssSssss..', 'kkssssssss..', 'kekkkkkkkkk.', 'kk.kk...kk..', '............', '............'], c: { s: '#3a9a5a', S: '#8fd67a', k: '#a8d88a', e: '#2a2433' } },
  bear: { g: ['.b..........', 'bbb.........', 'bebbbbbbb...', 'nbbbbbbbbbb.', '.bbbbbbbbbbb', '.bbbbbbbbbbb', '.bbbbbbbbbb.', '.bb.bb..bbb.', '.bb.bb..bb..', '............'], c: { b: '#7a4a2a', e: '#2a2433', n: '#3b2a22' } },
  frog: { g: ['............', '..ee..ee....', '.eWe.eWe....', '.gggggggg...', 'gggggggggg..', 'gggmmmmggg..', '.gwwwwwwgg..', 'gg.gg.gg.gg.', '............', '............'], c: { e: '#62a84a', W: '#2a2433', g: '#62a84a', m: '#c8454f', w: '#d8f0a8' } },
  trike: { g: ['..f.........', '.off........', 'ooff........', '.bbfbbbbbb..', 'kbebbbbbbbbt', '.bbbbbbbbbb.', '..bwwwwwwbb.', '..l.l...l.l.', '..l.l...l.l.', '..d.d...d.d.'], c: { b: '#c8844a', f: '#f0d8a8', o: '#f4ecd8', k: '#4a3a30', e: '#2a2433', w: '#ecc896', l: '#a86a3a', d: '#4a3a30', t: '#c8844a' } },
  raptor: { g: ['............', '.cc.........', 'bbbb........', 'bebbb.......', 'kk.bbbbbbb..', '....bbbbbbbt', '....awbbb..t', '.....l..l...', '.....l..l...', '....dd.dd...'], c: { b: '#c8a060', c: '#d8584a', e: '#2a2433', k: '#8a5a3a', w: '#f0dcb0', a: '#c8a060', l: '#8a5a3a', d: '#3a2a2a', t: '#c8a060' } },
};
export function drawMountIcon(ctx, kind, x, y, s = 1, shadow = false) { drawPix(ctx, MOUNT_PIX[kind], x, y, s, shadow); }

// the companions, side on (12×10) too
const PET_PIX = {
  fox: { g: ['.o.o........', '.ooo........', 'neoo........', '.wwoooooo...', '..oooooooott', '..ooooooo.tw', '..wwwwwoo...', '..d.d..d.d..', '..d.d..d.d..', '............'], c: { o: '#d9713a', e: '#2a2433', n: '#2a2433', w: '#fbfbff', t: '#d9713a', d: '#3b2a2e' } },
  deer: { g: ['.b..........', '.bb.........', 'bbb.........', 'beb.........', 'nbbbbbbbbb..', '..bsbbsbbbt.', '..bbbsbbbb..', '..bwwwwwbb..', '..l.l..l.l..', '..l.l..l.l..'], c: { b: '#c8905a', e: '#2a2433', n: '#3b2a22', s: '#f4ead8', w: '#f1e2c8', l: '#8a5a36', t: '#f1e2c8' } },
  crab: { g: ['............', '.cc......cc.', 'c..c....c..c', '.cc.e..e.cc.', '..c.e..e.c..', '..rrrrrrrr..', '.rrRRRRRRrr.', '.rrrrrrrrrr.', 'l.l.l..l.l.l', '............'], c: { c: '#e05a3a', r: '#d8563a', R: '#f08a5a', e: '#2a2433', l: '#a83a2a' } },
  raptor: { g: ['.cc.........', 'bbbb........', 'bebbb.......', 'bbbbb.......', 'kk.bbbbbb...', '...bbbbbbbbt', '....wbbb...t', '.....l.l....', '.....l.l....', '....dd.dd...'], c: { b: '#c8a060', c: '#d8584a', e: '#2a2433', k: '#8a5a3a', w: '#f0dcb0', l: '#8a5a3a', d: '#3a2a2a', t: '#c8a060' } },
  compy: { g: ['............', '............', '.gg.........', 'geg.........', 'kgg.........', '..gggg......', '...ggggggg..', '...yggg...gg', '....l.l.....', '...ll.ll....'], c: { g: '#6aa84a', e: '#2a2433', k: '#3a5a2a', y: '#d8e8a0', l: '#4a6a3a' } },
};
export function drawPetIcon(ctx, kind, x, y, s = 1, shadow = false) { drawPix(ctx, PET_PIX[kind], x, y, s, shadow); }

function drawPix(ctx, ic, x, y, s, shadow) {
  if (!ic) return;
  ic.g.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const k = row[i];
      if (k === '.') continue;
      ctx.fillStyle = shadow ? '#6a5a70' : ic.c[k];
      ctx.fillRect(Math.round(x) + i * s, Math.round(y) + j * s, s, s);
    }
  });
}
