// The marks on the world maps, shared by every map: the big screen's (Party Mode's
// full map & spare panel, the solo menu's & minimap) and the phone's (Phone v6),
// which draws them itself. Each system lists what shows (`mapMarks(out)`: kind,
// place, done or not, a name & a state for the phone's tap-to-read); this module
// draws them. No Three.js in here: the phone imports it.

import { t } from '../i18n.js';

// drawn in this order (the important ones end up on top)
export const MARK_ORDER = ['star', 'nest', 'race', 'secret', 'camp', 'arena', 'roost', 'stone', 'rare', 'lair', 'invasion', 'hill', 'target'];
// zoomed far out, the phone only shows these
export const MARK_MAJOR = new Set(['stone', 'lair', 'invasion', 'hill', 'target', 'arena', 'roost']);

// a waystone: glowing blue once attuned
export function stoneIcon(ctx, x, y, attuned = true) {
  ctx.fillStyle = '#241a2e'; ctx.fillRect(x - 2, y - 4, 5, 9); ctx.fillRect(x - 3, y - 3, 7, 7);
  ctx.fillStyle = attuned ? '#9fdcff' : '#7a7a8a';
  ctx.fillRect(x - 1, y - 3, 3, 7); ctx.fillRect(x - 2, y - 2, 5, 5);
  ctx.fillStyle = attuned ? '#ffffff' : '#a8a8b8'; ctx.fillRect(x, y - 2, 1, 2);
}
// a tiny chest: gold while sealed, grey once opened
export function secretIcon(ctx, x, y, open = false) {
  ctx.fillStyle = '#241a2e'; ctx.fillRect(x - 4, y - 3, 9, 7);
  ctx.fillStyle = open ? '#8a7a70' : '#f2c14e'; ctx.fillRect(x - 3, y - 2, 7, 5);
  ctx.fillStyle = open ? '#6a5a50' : '#b8862a'; ctx.fillRect(x - 3, y, 7, 1);
  ctx.fillStyle = '#fff3c4'; ctx.fillRect(x, y, 1, 1);
}
// a little chequered flag
export function raceIcon(ctx, x, y) {
  ctx.fillStyle = '#241a2e'; ctx.fillRect(x - 3, y - 4, 8, 9);
  ctx.fillStyle = '#e8d6b4'; ctx.fillRect(x - 2, y - 3, 1, 7);
  for (let j = 0; j < 2; j++) for (let i = 0; i < 3; i++) { ctx.fillStyle = (i + j) % 2 ? '#2a2230' : '#fbf6ec'; ctx.fillRect(x - 1 + i * 2, y - 3 + j * 2, 2, 2); }
}
// a little tent: purple while the gloom's there, green once cleared
export function campIcon(ctx, x, y, cleared = false) {
  ctx.fillStyle = '#241a2e'; ctx.fillRect(x - 3, y - 3, 7, 6);
  ctx.fillStyle = cleared ? '#8fd67a' : '#b86aff';
  ctx.fillRect(x - 2, y - 1, 5, 3); ctx.fillRect(x - 1, y - 2, 3, 1); ctx.fillRect(x, y - 3, 1, 1);
}
// a red skull while the boss rules its lair, a gold crown once it's free
export function lairIcon(ctx, x, y, beaten = false) {
  ctx.fillStyle = '#241a2e'; ctx.fillRect(x - 4, y - 4, 9, 8);
  if (beaten) { ctx.fillStyle = '#ffd66b'; ctx.fillRect(x - 3, y - 1, 7, 3); ctx.fillRect(x - 3, y - 3, 1, 2); ctx.fillRect(x, y - 3, 1, 2); ctx.fillRect(x + 3, y - 3, 1, 2); }
  else { ctx.fillStyle = '#ff6b7b'; ctx.fillRect(x - 3, y - 3, 7, 4); ctx.fillRect(x - 2, y + 1, 5, 2); ctx.fillStyle = '#241a2e'; ctx.fillRect(x - 2, y - 2, 2, 2); ctx.fillRect(x + 1, y - 2, 2, 2); }
}
const dot = (ctx, x, y, r, c) => { ctx.fillStyle = c; ctx.fillRect(x - r, y - r, r * 2 + 1, r * 2 + 1); };
// (World v7) a Pelican Post roost: a little envelope, sealed in gold once found
export function roostIcon(ctx, x, y, found = true) {
  ctx.fillStyle = '#241a2e'; ctx.fillRect(x - 4, y - 3, 9, 7);
  ctx.fillStyle = found ? '#fbf6ec' : '#9a96a0'; ctx.fillRect(x - 3, y - 2, 7, 5);
  ctx.fillStyle = found ? '#c8b8a0' : '#7a7680'; ctx.fillRect(x - 3, y - 2, 1, 1); ctx.fillRect(x + 3, y - 2, 1, 1); ctx.fillRect(x - 2, y - 1, 1, 1); ctx.fillRect(x + 2, y - 1, 1, 1);
  ctx.fillStyle = found ? '#e0a526' : '#6a6670'; ctx.fillRect(x - 1, y, 3, 2);
}

export function drawMark(ctx, m, x, y, time = 0) {
  x = Math.round(x); y = Math.round(y);
  const blink = Math.floor(time * 3) % 2;
  switch (m.k) {
    case 'stone': stoneIcon(ctx, x, y, !!m.on); break;
    case 'roost': roostIcon(ctx, x, y, !!m.on); break;
    case 'secret': secretIcon(ctx, x, y, !!m.on); break;
    case 'race': raceIcon(ctx, x, y); break;
    case 'camp': campIcon(ctx, x, y, !!m.on); break;
    case 'lair': lairIcon(ctx, x, y, !!m.on); break;
    // (World v7) a rare: a silver star — dim while it’s away
    case 'rare': {
      ctx.fillStyle = '#241a2e'; ctx.fillRect(x - 4, y - 4, 9, 9);
      ctx.fillStyle = m.on ? '#6a6878' : '#dfe4ee';
      ctx.fillRect(x, y - 3, 1, 7); ctx.fillRect(x - 3, y, 7, 1); ctx.fillRect(x - 1, y - 1, 3, 3); ctx.fillRect(x - 2, y + 2, 1, 1); ctx.fillRect(x + 2, y + 2, 1, 1);
      break;
    }
    case 'invasion': {
      // a gloom invasion at a waystone: a flashing cross
      ctx.fillStyle = '#241a2e'; ctx.fillRect(x - 5, y - 5, 11, 11);
      ctx.fillStyle = Math.floor(time * 4) % 2 ? '#ff6b9a' : '#b86aff';
      for (let i = -3; i <= 3; i++) { ctx.fillRect(x + i, y + i, 1, 1); ctx.fillRect(x + i, y - i, 1, 1); ctx.fillRect(x + i + 1, y + i, 1, 1); ctx.fillRect(x + i + 1, y - i, 1, 1); }
      break;
    }
    case 'star': dot(ctx, x, y, 1, '#fff3c4'); break;
    case 'nest': if (m.on) dot(ctx, x, y, 1, '#8fd6b4'); else { dot(ctx, x, y, 2, '#241a2e'); dot(ctx, x, y, 1, m.a && blink ? '#f59ac8' : '#9a6ad0'); } break;
    case 'arena': ctx.fillStyle = '#241a2e'; ctx.fillRect(x - 3, y - 2, 7, 5); ctx.fillStyle = '#e0a526'; ctx.fillRect(x - 2, y - 1, 5, 3); ctx.fillStyle = '#fff3c4'; ctx.fillRect(x - 1, y, 3, 1); break;
    case 'hill': if (blink) { dot(ctx, x, y, 3, '#241a2e'); dot(ctx, x, y, 2, '#ff6b7b'); } break;
    case 'target': if (blink) dot(ctx, x, y, 2, '#fff3c4'); dot(ctx, x, y, 1, '#e0a526'); break;
    default: break;
  }
}
export function drawMarks(ctx, M, marks, time) { for (const m of marks) { const q = M(m.x, m.z); drawMark(ctx, m, q.x, q.y, time); } }

// everything on the map right now: each system's marks, the activity's, the objective
export function collectMarks(P, target = null) {
  const out = [];
  for (const S of [P.events, P.races, P.secrets, P.encounters, P.travel, P.lairs, P.rares]) if (S && S.mapMarks) S.mapMarks(out);
  if (P.act && P.act.mapMarks) P.act.mapMarks(out);
  if (P.mapMarks) P.mapMarks(out);
  const tgt = target || (P.act && P.act.target);
  if (tgt) out.push({ k: 'target', x: tgt.x, z: tgt.z, name: t('Objective') });
  return out.sort((a, b) => MARK_ORDER.indexOf(a.k) - MARK_ORDER.indexOf(b.k));
}
