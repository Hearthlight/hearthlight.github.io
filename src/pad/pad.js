// Party Mode phone controller. Join the big screen's room, style your
// character, then play with a thumb-stick and two buttons. Everything is drawn
// with the game's own pixel font & paper panels on an integer-scaled canvas.

import { drawText, measure, wrap } from '../engine/font.js';
import { panel, button, UI, fitText, splitTwo, emoteGlyph } from '../ui/ui.js';
import { questRows, fitRich, wrapFit, wrapTail, whereText, BRIEF, GOLD } from '../ui/questcard.js';
import { bigButton as wideButton, diceButton, bigLines, drawLines, fitScale } from '../ui/big.js';
import { randomName, cleanName } from '../data/nicknames.js';
import { QUICK, QUICK_PAGES, QUICK_BY, EMOTES, EMOTE_BY, WHY, emojiOnly } from '../ui/chatdata.js';
import { MAX_LEN, clean } from '../party/chatfilter.mjs';
import { LOOK_GROUPS, TREASURE_HATS, randomLook, cleanLook } from '../data/looks.js';
import { CLASSES, CLASS_ORDER } from '../combat/classes.js';
import { drawClassIcon, drawGearIcon, drawMountIcon, drawPetIcon } from '../combat/icons.js';
import { roundIcon, drawIcon, drawGlyph } from '../combat/v4/icons.js';
import { TREES, TALENT, ROW_NEED, canLearn, whyNot, rankOf, spentIn, valueAt } from '../combat/v4/talents.js';
import { itemName, itemDesc, UPGRADE, ROMAN, LEVEL_COLOR, BAG, itemBorder, itemTag, itemUpgrade, meltValue, isWorn, weaponLines } from '../combat/v3/gear.js';
import { t, setLang, getLang, detectLang, onLang } from '../i18n.js';
import { shownLevel, xpBar } from '../saga/levels.js';
import { drawXpBar, drawLevelTag, liftMark, levelsText, nextSteps, levelWords, levelLine, liftWords, liftInk, drawLines as drawWrapped, XP_PAPER } from '../ui/levelbar.js';
import { relayUrl } from '../party/net.js';
import { PadMap } from './padmap.js';
import { RemoteGuest } from './remote.js';
import { qrCanvas } from '../party/qr.js';

const PM = new PadMap();

const cv = document.getElementById('pad');
const ctx = cv.getContext('2d');
const codeIn = document.getElementById('code');
const nameIn = document.getElementById('name');
// (the chat's line: the phone's own keyboard types into it — the sheet, drawChat)
const chatIn = document.createElement('input');
Object.assign(chatIn, { className: 'field', maxLength: MAX_LEN, autocomplete: 'off', enterKeyHint: 'send', spellcheck: true });
chatIn.style.letterSpacing = '0';
document.body.appendChild(chatIn);

// ------------------------------------------------------------------ storage
const store = {
  get(k, d) { try { const v = localStorage.getItem('hlpad.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('hlpad.' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
};
setLang(store.get('lang', detectLang()));
let padId = store.get('id', null);
if (!padId) {
  // LAN controllers also run on HTTP, where randomUUID is unavailable.
  padId = 'p' + Array.from(crypto.getRandomValues(new Uint8Array(12)), (n) => n.toString(16).padStart(2, '0')).join('');
  store.set('id', padId);
}

const urlCode = (location.hash.slice(1).split('.')[0] || new URLSearchParams(location.search).get('c') || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
// (the party's invitation carries the video key: whoever opens it on this page picks where they play)
const keyOf = (hash) => (hash.slice(1).split('.')[1] || '').replace(/[^a-f0-9]/gi, '').slice(0, 32);

const S = {
  joined: false,         // we have (or had) a live seat at the party
  status: 'idle',        // idle | connecting | open | closed
  code: urlCode || store.get('code', ''),
  key: keyOf(location.hash),     // the invitation's video key (the choice: here, or at home)
  name: cleanName(store.get('name', '')),
  // (a name you typed is yours; one the dice gave is rolled again by « Surprise me »)
  typed: store.get('typed', !!store.get('name', '')),
  gift: store.get('gift', null),   // the nickname given at the door to a guest without a name (said on the next screen)
  askCode: !urlCode,               // the join screen asks for the party’s code (a QR code or a link brings it)
  badCode: false,                  // …and shows it in red: no party has it
  look: cleanLook(store.get('look', null) || randomLook()),
  me: null,              // { slot, color, name }
  phase: 'lobby',        // lobby | adventure (set by the big screen)
  view: 'look',          // lobby: look | pad
  screen: 'play',        // adventure: play | choice | message
  ready: false,
  tab: 0,
  cls: store.get('cls', null),   // fighting class (the big screen has the final say)
  hats: [],                      // treasure hats dug up while exploring
  ctx: { a: null, b: null, x: null, hint: '' },
  score: null,
  choice: null,
  chat: [],              // the party's last lines: { n, c, text | q | e }
  chatTab: 0,            // the sheet's page: 0–2 phrases · 3 emotes · 4 the log
  chatNote: null,        // why a message didn't go ({ text, until })
  said: store.get('said', []),   // what you typed lately (tap to say it again)
  message: null,
  error: '',
  hostGone: false,
  kicked: false,
  menu: false,
  portrait: null,
  host: false,                   // this phone wears the crown
  hmenu: null,                   // the host menu, as sent by the big screen
  htab: 0, hscroll: 0, hconfirm: null, hconfirmT: 0,
  paused: null,                  // { by } while the host has paused the game
  quest: null,                   // the story’s card (Saga.card): the chapter, the quests, where to go
  questStep: '', questNew: false,   // (the main quest’s step, and whether it changed since the page was last open)
  qopen: null, qscroll: 0, qvel: 0, // the Quest page: a side quest opened, how far down it is scrolled
  t: 0,
};

const remote = document.getElementById('remote-video') ? new RemoteGuest(S, send, {
  retry: () => { S.kicked = false; S.error = ''; if (ws?.readyState === 1) hi(); else connect(); },
  menu: () => { S.menu = !S.menu; },
  ready: () => { S.ready = !S.ready; S.view = S.ready ? 'pad' : 'look'; send({ t: 'ready', v: S.ready }); },
  chat: () => { openChat(); setTimeout(() => { try { chatIn.focus(); } catch (e) { /* gone */ } }, 30); },
}) : null;

// ------------------------------------------------------------------ network
let ws = null, retry = 0, retryT = 0, lastSend = 0, gaveUpAt = 0;

function connect() {
  clearTimeout(retryT);
  if (ws && ws.readyState <= 1) return;
  if (!/^[A-Z]{4}$/.test(S.code)) { S.error = t('Type the 4-letter code from the big screen'); S.badCode = S.askCode = true; return; }
  S.status = 'connecting';
  const sock = new WebSocket(relayUrl(`role=pad&code=${S.code}&id=${padId}`));
  ws = sock;
  sock.onmessage = (e) => { if (typeof e.data !== 'string') { remote?.frame(e.data); return; } let m; try { m = JSON.parse(e.data); } catch (err) { return; } if (m && typeof m === 'object') onMessage(m); };
  sock.onclose = () => {
    if (ws !== sock) return;
    ws = null;
    S.status = 'closed';
    remote?.disconnect();
    if (S.kicked) return;
    if (S.joined) scheduleRetry();
    else if (!S.error) S.error = window.HEARTHLIGHT && window.HEARTHLIGHT.relay ? t('Can’t reach the party server. Check your connection.') : t('Can’t reach the big screen. Same Wi-Fi?');
  };
}

function scheduleRetry() {
  clearTimeout(retryT);
  retryT = setTimeout(connect, Math.min(4000, 500 + retry++ * 600));
}

function send(obj) {
  if (ws && ws.readyState === 1) { ws.send(JSON.stringify(obj)); lastSend = performance.now(); }
}

function onMessage(m) {
  remote?.message(m);
  switch (m.t) {
    case 'hello':
      S.status = 'open'; retry = 0; S.error = '';
      S.joined = true; S.hostGone = !m.host;
      store.set('code', S.code);
      hi();
      break;
    case 'error': {
      // (the relay's reasons, in the phone's language)
      const why = { nogame: t('No party has the code {code}. Check it on the big screen.', { code: S.code }), full: t('This party is full: eight players are in already.'), busy: t('The online party server is full right now. Try again in a few minutes.'), limit: t('Too many messages: wait a moment.') }[m.code] || m.msg;
      if (m.code === 'nogame') S.askCode = S.badCode = true;
      if (S.joined) {
        // the big screen is probably restarting: keep trying for a while
        if (!gaveUpAt) gaveUpAt = performance.now();
        if (performance.now() - gaveUpAt > 90000) { S.joined = false; S.error = why; }
        S.hostGone = true;
      } else S.error = why;
      break;
    }
    case 'you':
      S.me = { slot: m.slot, color: m.color, name: m.name };
      gaveUpAt = 0;
      // (the big screen kept this seat under an older name: it hears the one typed since — once)
      if (S.name && nameAsked !== S.name && m.name !== S.name && !String(m.name).startsWith(S.name.slice(0, 10) + ' ')) { nameAsked = S.name; send({ t: 'name', name: S.name, dice: !S.typed }); }
      break;
    case 'phase':
      S.phase = m.p;
      if (m.p === 'lobby') { S.ready = !!m.ready; S.view = S.ready ? 'pad' : 'look'; S.quest = null; S.questStep = ''; S.questNew = false; }
      if (m.p === 'solo') { S.host = false; S.hmenu = null; S.lobby = null; }
      S.menu = false;
      break;
    case 'screen':
      S.screen = m.s;
      if (m.s === 'choice') S.choice = { id: m.id, title: m.title, options: m.options || [], picked: -1, tally: null, note: m.note || '' };
      if (m.s === 'message') S.message = { title: m.title || '', text: m.text || '', a: m.a || null };
      if (m.s === 'tame') { S.tame = { id: m.id, animal: m.animal || '', food: m.food || '', foodId: m.foodId, need: m.need || 3, speed: m.speed || 0.8, zone: m.zone ?? 0.5, width: m.width || 0.22, hits: 0, misses: 0, t0: S.t, flash: 0, ok: false }; buzz([20, 30, 20]); }
      S.menu = false;
      break;
    case 'tally': if (S.choice && S.choice.id === m.id) S.choice.tally = m.counts; break;
    case 'ctx':
      S.ctx = { a: m.a || null, b: m.b === undefined ? t('Hop') : m.b, x: m.x || null, y: m.y || null, hint: m.hint || '', hp: m.hp, lv: m.lv, cd: m.cd || 0, mode: m.mode || 'play', page: typeof m.page === 'string' ? m.page : null, hot: m.hot || '', ic: m.ic || {}, camp: !!m.camp, stuck: !!m.stuck, ult: typeof m.ult === 'number' ? m.ult : null, uic: m.uic || null, ults: Array.isArray(m.ults) && m.ults.length > 1 ? m.ults.slice(0, 3).map((u) => ({ g: Number(u && u[0]) || 0, ic: (u && u[1]) || null })) : null };
      if (m.score !== undefined) S.score = m.score;
      break;
    case 'cls': if (CLASSES[m.v]) { S.cls = m.v; store.set('cls', m.v); } break;
    case 'hats': S.hats = Array.isArray(m.list) ? m.list.filter((h) => TREASURE_HATS[h]) : []; break;
    case 'lang': setLang(m.v); store.set('lang', m.v); break;
    case 'score': S.score = m.v; break;
    case 'look': S.look = cleanLook(m.look); store.set('look', S.look); break;
    case 'portrait': { const img = new Image(); img.onload = () => { S.portrait = img; }; img.src = m.src; break; }
    case 'buzz': buzz(m.p || 40); break;
    case 'host':
      if (!!m.v !== S.host) buzz(m.v ? [30, 40, 60] : 20);
      S.host = !!m.v;
      if (!S.host && S.menu === 'host') S.menu = false;
      break;
    case 'hmenu': S.hmenu = m; break;
    // the party's invitation (the Invite page): one link, whoever opens it picks where they play
    case 'invite': {
      const str = (v) => (typeof v === 'string' && /^https?:\/\//.test(v) ? v : '');
      S.invite = { link: str(m.link) || str(m.room), code: typeof m.code === 'string' ? m.code : '', lan: !!m.lan, home: !!m.home };
      if (S.invite.link && (!S.inviteQr || S.inviteQr.text !== S.invite.link)) qrCanvas(S.invite.link).then((q) => { S.inviteQr = q; }).catch(() => {});
      break;
    }
    case 'mounts': S.mounts = { owned: Array.isArray(m.owned) ? m.owned : [], all: Array.isArray(m.all) ? m.all : null, active: m.active || null }; break;
    case 'pets': S.pets = { list: Array.isArray(m.list) ? m.list : [], active: m.active || null }; break;
    case 'prog': S.prog = m; break;
    // (the story’s card — none: no story is running, no Quest page; a new step lights the tile’s dot)
    case 'quest': {
      const one = (q) => (q && typeof q === 'object' && typeof q.id === 'string' ? { ...q, title: String(q.title || ''), brief: String(q.brief || ''), now: String(q.now || ''), tail: String(q.tail || ''), done: Array.isArray(q.done) ? q.done.map(String) : [], left: +q.left || 0, where: q.where && typeof q.where === 'object' ? q.where : null } : null);
      S.quest = m.ch && typeof m.ch === 'object' ? { ch: m.ch, main: one(m.main), sides: (Array.isArray(m.sides) ? m.sides : []).map(one).filter(Boolean), offers: (Array.isArray(m.offers) ? m.offers : []).filter((o) => o && typeof o === 'object') } : null;
      const step = S.quest && S.quest.main ? S.quest.main.id + ':' + S.quest.main.k : '';
      if (step !== S.questStep) { S.questStep = step; S.questNew = !!step && S.menu !== 'quest'; }
      if (!S.quest && S.menu === 'quest') S.menu = false;
      break;
    }
    // (your hero's level: its experience, the level they fight at here, the land's own)
    case 'lv': S.lv = typeof m.lv === 'number' ? { lv: m.lv, xp: +m.xp || 0, eff: +m.eff || m.lv, land: Array.isArray(m.land) ? m.land.map(Number) : null, place: typeof m.place === 'string' ? m.place : '', solo: !!m.solo } : null; break;
    case 'lvup': levelCard(m); break;
    case 'lobby': S.lobby = { ready: m.ready || 0, total: m.total || 0, host: m.host || '' }; break;
    // (the chat: every line said, and why one of ours didn't go)
    case 'chat': if (m.l && typeof m.l === 'object') { S.chat.push(m.l); if (S.chat.length > 50) S.chat.splice(0, S.chat.length - 50); if (S.menu !== 'chat' && !(S.me && m.l.n === S.me.name)) S.chatNew = true; } break;
    case 'chatLog': S.chat = Array.isArray(m.lines) ? m.lines.filter((l) => l && typeof l === 'object').slice(-50) : []; break;
    case 'chatNo': if (WHY[m.why]) { S.chatNote = { text: t(WHY[m.why]), until: S.t + 3 }; buzz([20, 40, 20]); } break;
    case 'wmapBase': PM.onBase(m); break;
    case 'wmap': PM.onUpdate(m); break;
    case 'pause': S.paused = m.v ? { by: m.by || '' } : null; break;
    // (the big screen's farewell stays, if it said one)
    case 'ended': S.kicked = true; S.joined = false; S.error = S.screen === 'message' && S.message && S.message.text ? S.message.text : t('The party has ended. Ask the host for a new invitation.'); break;
    case 'hostgone': S.hostGone = true; break;
    case 'hostback': S.hostGone = false; hi(); break;
    case 'who': hi(); break;
    case 'kicked': S.kicked = true; S.joined = false; S.error = t('You left the party.'); break;
    default: break;
  }
}

function hi() { send({ t: 'hi', name: S.name, look: S.look, cls: S.cls, ...(remote ? { remote: true, key: remote.key } : {}) }); }

// ---- your name: typed (it is yours), or out of the hat (the dice, « Surprise me », a guest who
// typed none) — once in the party, the big screen hears each change
let nameAsked = '';
function setName(name, typed) {
  S.name = name; S.typed = typed;
  if (nameIn.value !== name) nameIn.value = name;
  store.set('name', name); store.set('typed', typed);
}
function tellName() { if (S.joined && S.name) { nameAsked = S.name; send({ t: 'name', name: S.name, dice: !S.typed }); } }
function rollName() { setName(randomName(getLang(), [S.name, S.me && S.me.name]), false); S.error = ''; dropGift(); tellName(); buzz(8); }
function dropGift() { if (S.gift) { S.gift = null; store.set('gift', null); } }
// (the field left, or Enter: an emptied name goes back to what it was, one left as it was has typed nothing)
function commitName() {
  const name = cleanName(nameIn.value);
  if (name && name !== S.name) { setName(name, true); dropGift(); tellName(); } else nameIn.value = S.name;
}

function buzz(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* not supported */ } }

// heartbeat so the big screen knows we're still here
setInterval(() => { if (performance.now() - lastSend > 1500) send({ t: 'hb' }); }, 500);
document.addEventListener('visibilitychange', () => { if (!document.hidden && S.joined && (!ws || ws.readyState > 1)) connect(); });

// ------------------------------------------------------------------ canvas
let W = 240, H = 400, scale = 3, dpr = 1;
function resize() {
  dpr = window.devicePixelRatio || 1;
  const box = document.getElementById('remote-controls')?.getBoundingClientRect();
  const dw = Math.floor((box?.width || window.innerWidth) * dpr), dh = Math.floor((box?.height || window.innerHeight) * dpr);
  scale = Math.max(1, Math.round(Math.min(dw, dh) / 215));
  W = Math.floor(dw / scale); H = Math.floor(dh / scale);
  cv.width = W; cv.height = H;
  cv.style.width = `${(W * scale) / dpr}px`;
  cv.style.height = `${(H * scale) / dpr}px`;
  ctx.imageSmoothingEnabled = false;
}
window.addEventListener('resize', resize);
resize();

const toUi = (e) => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; };
function placeField(el, r) {
  if (!r) { el.style.display = 'none'; return; }
  const k = scale / dpr;
  el.style.display = 'block';
  const origin = cv.getBoundingClientRect();
  el.style.left = `${origin.left + r.x * k}px`; el.style.top = `${origin.top + r.y * k}px`;
  el.style.width = `${r.w * k}px`; el.style.height = `${r.h * k}px`;
  // (its text as big as the field allows — never under 16 px: an iPhone zooms the page on a smaller one)
  el.style.fontSize = `${Math.round(Math.max(16, Math.min(28, r.h * k * 0.52)))}px`;
}
codeIn.value = S.code;
nameIn.value = S.name;
codeIn.placeholder = '····';
nameIn.placeholder = t('type here…');
// (a language arrives a moment after it's chosen: its dictionary is fetched first)
onLang(() => { nameIn.placeholder = t('type here…'); });
codeIn.addEventListener('input', () => { S.code = codeIn.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4); if (codeIn.value !== S.code) codeIn.value = S.code; S.error = ''; S.badCode = false; });
// (typed: yours. In the party it is told when the field is left; an emptied one is the hat’s again)
nameIn.addEventListener('input', () => { if (S.joined) return; S.name = cleanName(nameIn.value); S.typed = !!S.name; S.error = ''; });
nameIn.addEventListener('blur', () => { try { window.scrollTo(0, 0); } catch (e) { /* ignore */ } if (S.joined) commitName(); });
codeIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') { codeIn.blur(); if (S.name) join(); else nameIn.focus(); } });
nameIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') { nameIn.blur(); if (!S.joined) join(); } });
chatIn.placeholder = t('Say something…');
onLang(() => { chatIn.placeholder = t('Say something…'); });
chatIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); sayTyped(); } else if (e.key === 'Escape') { e.preventDefault(); S.menu = false; closeChat(); } });

// a two-line button: what, and underneath what it means
function choiceBtn(x, y, w, h, label, sub, id, fn, color) {
  const down = S.pressing === id, dy = down ? 1 : 0;
  ctx.fillStyle = '#3b2a22'; ctx.fillRect(x + 1, y + dy, w - 2, h); ctx.fillRect(x, y + 1 + dy, w, h - 2);
  ctx.fillStyle = down ? shade(color, -0.2) : color; ctx.fillRect(x + 1, y + 1 + dy, w - 2, h - 2);
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(x + 1, y + 1 + dy, w - 2, 1);
  // (a tall one: its name twice as big)
  const sc = h >= 36 ? fitScale(label, w - 10) : 1;
  drawText(ctx, fitText(label, w - 10, sc), x + w / 2, y + (sc === 2 ? 4 : 5) + dy, { color: '#fff7e6', align: 'center', scale: sc });
  drawText(ctx, fitText(sub, w - 10), x + w / 2, y + (sc === 2 ? 22 : h >= 36 ? 20 : 17) + dy, { color: 'rgba(255,247,230,0.85)', align: 'center' });
  tapArea(id, x - 2, y - 2, w + 4, h + 4, fn);
}

// "On my own screen": the remote page, with this name (play.html joins by itself)
function goHome() {
  nameAtDoor();
  codeIn.blur(); nameIn.blur();
  location.href = new URL('play.html#' + S.code + '.' + S.key, location.href).href;
}

// (no name typed: one out of the hat, and the next screen says so)
function nameAtDoor() {
  const name = cleanName(S.name);
  if (name) setName(name, S.typed);
  else { setName(randomName(getLang()), false); S.gift = S.name; S.giftT = 0; store.set('gift', S.gift); }
}

function join() {
  nameAtDoor();
  S.error = ''; S.kicked = false; S.badCode = false;
  codeIn.blur(); nameIn.blur();
  goFullscreen();
  connect();
}

let wakeLock = null;
function goFullscreen() {
  try {
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen && /Android/i.test(navigator.userAgent)) el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
  } catch (e) { /* ignore */ }
  try { if (navigator.wakeLock && !wakeLock) navigator.wakeLock.request('screen').then((l) => { wakeLock = l; l.addEventListener('release', () => { wakeLock = null; }); }).catch(() => {}); } catch (e) { /* ignore */ }
}

// ------------------------------------------------------------------ input
let regions = [];
let scroller = null;                 // the scrolling part of the page on screen, if any: { y, h, max } (drawQuest)
const pointers = new Map();          // pointerId -> { kind, id }
const stick = { id: null, ox: 0, oy: 0, x: 0, y: 0, vx: 0, vy: 0, r: 26 };
const held = { a: false, b: false, x: false, u: false };
let sentStick = { x: 0, y: 0 }, stickAt = 0;

function hit(p) {
  for (let i = regions.length - 1; i >= 0; i--) {
    const r = regions[i];
    if (r.circle) { if ((p.x - r.cx) ** 2 + (p.y - r.cy) ** 2 <= (r.r + 6) ** 2) return r; }
    else if (p.x >= r.x && p.y >= r.y && p.x < r.x + r.w && p.y < r.y + r.h) return r;
  }
  return null;
}

cv.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  lastTouch = performance.now();
  const p = toUi(e);
  const r = hit(p);
  if (!r) return;
  try { cv.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  if (r.kind === 'stick') {
    if (stick.id !== null) return;
    stick.id = e.pointerId; stick.ox = p.x; stick.oy = p.y; stick.x = p.x; stick.y = p.y;
    pointers.set(e.pointerId, { kind: 'stick' });
  } else if (r.kind === 'hold') {
    pointers.set(e.pointerId, { kind: 'hold', id: r.id });
    setHeld(r.id, true);
  } else if (r.kind === 'press') {
    pointers.set(e.pointerId, { kind: 'press', id: r.id });
    S.pressing = r.id;
    r.fn();
  } else if (r.kind === 'map') {
    pointers.set(e.pointerId, { kind: 'map' });
    PM.down(mapBox(), e.pointerId, p, performance.now());
  } else {
    // (on a page that scrolls, a finger that slides drags the page instead of tapping)
    pointers.set(e.pointerId, { kind: 'tap', id: r.id, y0: p.y, s0: S.qscroll, drag: !!scroller && p.y >= scroller.y && p.y < scroller.y + scroller.h, vy: 0, at: 0 });
    S.pressing = r.id; S.qvel = 0; S.qto = null;
  }
});
cv.addEventListener('pointermove', (e) => {
  const q = pointers.get(e.pointerId);
  if (!q) return;
  lastTouch = performance.now();
  const p = toUi(e);
  if (q.kind === 'stick') { stick.x = p.x; stick.y = p.y; }
  else if (q.kind === 'map') PM.move(mapBox(), e.pointerId, p, performance.now());
  else if (q.kind === 'tap' && q.drag && Math.abs(p.y - q.y0) > 4) { q.kind = 'scroll'; S.pressing = null; }
  if (q.kind === 'scroll' && scroller) {
    const y = Math.max(0, Math.min(scroller.max, q.s0 + q.y0 - p.y)), dt = (lastTouch - q.at) / 1000;
    if (q.at && dt > 0) q.vy = q.vy * 0.5 + ((y - S.qscroll) / dt) * 0.5;
    q.at = lastTouch; S.qscroll = y;
  }
});
// (a mouse wheel over the map zooms it — handy on a tablet with a mouse, or a laptop; it scrolls
// the Quest page)
cv.addEventListener('wheel', (e) => {
  if (S.menu === 'quest' && scroller) { e.preventDefault(); S.qscroll = Math.max(0, Math.min(scroller.max, S.qscroll + Math.sign(e.deltaY) * 24)); return; }
  if (S.menu !== 'map' || !PM.ready()) return;
  e.preventDefault(); const p = toUi(e); PM.step(mapBox(), e.deltaY < 0 ? 1 : -1, p.x, p.y);
}, { passive: false });
function release(e) {
  const q = pointers.get(e.pointerId);
  if (!q) return;
  pointers.delete(e.pointerId);
  if (q.kind === 'stick') { stick.id = null; stick.x = stick.ox; stick.y = stick.oy; }
  else if (q.kind === 'hold') setHeld(q.id, false);
  else if (q.kind === 'press') S.pressing = null;
  else if (q.kind === 'map') PM.up(mapBox(), e.pointerId, toUi(e), performance.now(), e.type === 'pointercancel');
  else if (q.kind === 'scroll') S.qvel = performance.now() - q.at < 90 ? q.vy : 0;      // (let go on the move: it glides on)
  else {
    S.pressing = null;
    if (e.type === 'pointercancel') return;
    const r = hit(toUi(e));
    if (r && r.id === q.id && r.fn) { buzz(6); r.fn(); }
  }
}
cv.addEventListener('pointerup', release);
cv.addEventListener('pointercancel', release);
cv.addEventListener('contextmenu', (e) => e.preventDefault());

function setHeld(id, v) {
  if (held[id] === v) return;
  held[id] = v;
  if (v) buzz(10);
  send({ t: 'b', k: id, v: v ? 1 : 0 });
}

function updateStick(now) {
  let vx = 0, vy = 0;
  if (stick.id !== null) {
    const dx = stick.x - stick.ox, dy = stick.y - stick.oy;
    const len = Math.hypot(dx, dy);
    // the base follows a thumb that drifts too far
    if (len > stick.r * 1.6) { stick.ox = stick.x - (dx / len) * stick.r * 1.6; stick.oy = stick.y - (dy / len) * stick.r * 1.6; }
    const k = Math.min(1, len / stick.r);
    if (len > 2.5) { vx = (dx / len) * k; vy = (dy / len) * k; }
  }
  stick.vx = vx; stick.vy = vy;
  const q = (v) => Math.round(v * 100) / 100;
  const nx = q(vx), ny = q(vy);
  const changed = Math.abs(nx - sentStick.x) > 0.04 || Math.abs(ny - sentStick.y) > 0.04 || ((nx === 0 && ny === 0) !== (sentStick.x === 0 && sentStick.y === 0));
  if (changed && (now - stickAt > 33 || (nx === 0 && ny === 0))) {
    sentStick = { x: nx, y: ny }; stickAt = now;
    send({ t: 'in', x: nx, y: ny });
  }
}

// ------------------------------------------------------------------ drawing kit
const INK = UI.ink, PAPER = UI.paper;
function disc(cx, cy, r, color) {
  ctx.fillStyle = color;
  for (let y = -r; y <= r; y++) {
    const w = Math.floor(Math.sqrt(r * r - y * y + r * 0.8));
    ctx.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1);
  }
}
function ring(cx, cy, r, color) {
  ctx.fillStyle = color;
  const n = Math.max(16, Math.round(r * 5));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    ctx.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 1, 1);
  }
}
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}
function light(color) {
  const m = /rgb\((\d+),(\d+),(\d+)\)/.exec(color);
  const n = m ? null : parseInt(String(color).slice(1), 16);
  const r = m ? +m[1] : n >> 16, g = m ? +m[2] : (n >> 8) & 255, b = m ? +m[3] : n & 255;
  return r * 0.299 + g * 0.587 + b * 0.114 > 160;
}
function tapArea(id, x, y, w, h, fn) { regions.push({ kind: 'tap', id, x, y, w, h, fn }); }
// a button with a picture (and a word beside it, if there's room for one)
function iconBtn(x, y, w, h, glyph, id, fn, { color = '#8e5d3e', label = '', badge = '' } = {}) {
  const down = S.pressing === id, dy = down ? 1 : 0;
  ctx.fillStyle = 'rgba(30,18,30,0.3)'; ctx.fillRect(x + 1, y + 2, w, h);
  ctx.fillStyle = '#3b2a22'; ctx.fillRect(x + 1, y + dy, w - 2, h); ctx.fillRect(x, y + 1 + dy, w, h - 2);
  ctx.fillStyle = down ? shade(color, -0.2) : color; ctx.fillRect(x + 1, y + 1 + dy, w - 2, h - 2);
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(x + 1, y + 1 + dy, w - 2, 1);
  if (label && h >= 28) {
    // (tall and narrow: the picture on top, the word under it)
    drawGlyph(ctx, glyph, x + Math.round((w - 16) / 2), y + 2 + dy, 1);
    drawText(ctx, fitText(label, w - 4), x + w / 2, y + h - 11 + dy, { color: '#fff7e6', align: 'center' });
    if (badge) badgeAt(x + w - 2, y - 3, badge);
    tapArea(id, x - 2, y - 2, w + 4, h + 4, fn);
    return;
  }
  const gx = label ? x + 2 : x + Math.round((w - 16) / 2);
  drawGlyph(ctx, glyph, gx, y + Math.round((h - 16) / 2) + dy, 1);
  if (label) drawText(ctx, fitText(label, w - 22), gx + 18, y + Math.round((h - 9) / 2) + 1 + dy, { color: '#fff7e6' });
  if (badge) badgeAt(x + w + (badge === '•' ? 1 : -2), badge === '•' ? y - 1 : y - 3, badge);
  tapArea(id, x - 2, y - 2, w + 4, h + 4, fn);
}
// a little red count on a corner (talent points to spend…) — or just a red dot ('•')
function badgeAt(rx, y, text) {
  if (text === '•') { ctx.fillStyle = '#3b2a22'; ctx.fillRect(rx - 6, y, 6, 6); ctx.fillStyle = '#e04848'; ctx.fillRect(rx - 5, y + 1, 4, 4); ctx.fillStyle = '#ff9a9a'; ctx.fillRect(rx - 5, y + 1, 2, 1); return; }
  const bw = measure(text) + 5;
  ctx.fillStyle = '#3b2a22'; ctx.fillRect(rx - bw - 1, y, bw + 2, 11);
  ctx.fillStyle = '#e04848'; ctx.fillRect(rx - bw, y + 1, bw, 9);
  drawText(ctx, text, rx - bw / 2, y + 2, { color: '#fff7e6', align: 'center' });
}
function pill(x, y, w, h, label, id, fn, { color = '#8e5d3e', hot = false, small = false } = {}) {
  const down = S.pressing === id;
  button(ctx, x, y + (down ? 1 : 0), w, h, label, { color: hot ? null : down ? shade(color, -0.2) : color, hot });
  if (small) { /* same look, just a smaller hit box */ }
  tapArea(id, x - 2, y - 2, w + 4, h + 4, fn);
}
function arrowBtn(x, y, w, h, dir, id, fn) {
  const down = S.pressing === id;
  ctx.fillStyle = '#3b2a22'; ctx.fillRect(x + 1, y, w - 2, h); ctx.fillRect(x, y + 1, w, h - 2);
  ctx.fillStyle = down ? '#b07b50' : '#8e5d3e'; ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  ctx.fillStyle = '#fff7e6';
  const cx = x + w / 2, cy = y + h / 2;
  for (let i = 0; i < 4; i++) ctx.fillRect(Math.round(cx + (dir < 0 ? -2 + i : 1 - i)), Math.round(cy - i), 1, i * 2 + 1);
  tapArea(id, x - 3, y - 3, w + 6, h + 6, fn);
}
function background() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#2c2138'); g.addColorStop(1, '#1a1324');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // soft starry speckle
  for (let i = 0; i < 40; i++) {
    const x = (i * 97 + 31) % W, y = (i * 61 + 17) % H;
    ctx.fillStyle = (i + Math.floor(S.t * 0.7)) % 7 === 0 ? 'rgba(255,243,196,0.55)' : 'rgba(185,162,227,0.22)';
    ctx.fillRect(x, y, 1, 1);
  }
}
function header(title, right = W - 28, hb = 20) {
  const col = S.me ? S.me.color : '#e0a526', o = Math.round((hb - 20) / 2);
  ctx.fillStyle = '#20172a'; ctx.fillRect(0, 0, W, hb);
  ctx.fillStyle = col; ctx.fillRect(0, 0, W, 3);
  if (S.me) {
    const tag = `P${S.me.slot + 1}`;
    const tw = measure(tag) + 8;
    ctx.fillStyle = col; ctx.fillRect(4, 6 + o, tw, 11);
    drawText(ctx, tag, 4 + tw / 2, 8 + o, { color: '#241a2e', align: 'center' });
    const room = right - 12 - tw - (S.me && S.ctx.lv && S.phase !== 'lobby' ? 52 : 0);
    drawText(ctx, fitText(S.me.name, room), 8 + tw, 8 + o, { color: '#fff7e6' });
    if (S.host && measure(S.me.name) < room - 10) drawText(ctx, '♛', 12 + tw + measure(S.me.name), 8 + o, { color: '#f6c65b' });
  } else drawText(ctx, title || 'Hearthlight', 6, 8 + o, { color: '#fff7e6' });
  // your level over its experience bar (an arrow: the land lifts you, or holds you down)
  if (S.me && S.ctx.lv && S.phase !== 'lobby') {
    const L = S.lv, w = drawLevelTag(ctx, right - 4, 6 + o, L ? shownLevel(L.lv) : S.ctx.lv, L ? xpBar(L.lv, L.xp) : null, '#ffd66b', 42);
    const lift = L ? Math.sign(shownLevel(L.eff) - shownLevel(L.lv)) : 0;
    if (lift) liftMark(ctx, right - 11 - w, 15 + o, lift);
  }
}
function portraitBox(x, y, size) {
  const col = S.me ? S.me.color : '#e0a526';
  ctx.fillStyle = '#3b2a22'; ctx.fillRect(x - 2, y - 2, size + 4, size + 4);
  ctx.fillStyle = col; ctx.fillRect(x - 1, y - 1, size + 2, size + 2);
  ctx.fillStyle = '#f3e3c3'; ctx.fillRect(x, y, size, size);
  if (S.portrait) ctx.drawImage(S.portrait, x, y, size, size);
  else drawText(ctx, '…', x + size / 2, y + size / 2 - 4, { color: UI.inkSoft, align: 'center' });
}

// ------------------------------------------------------------------ screens
// The first thing a guest sees — often someone who doesn’t play games. In order: 1 the party’s
// code (and where to read it), 2 your name (or the dice), 3 one big button; words big enough for
// an arm’s length, fields a thumb can’t miss, all of it in the top of the screen, clear of the
// phone’s keyboard. A QR code or a link that brought the code asks for the name only.
function stepLabel(n, texts, sub, x, y, w) {
  let tx = x;
  if (n) {
    ctx.fillStyle = '#3b2a22'; ctx.fillRect(x, y - 1, 15, 17);
    ctx.fillStyle = '#e0a526'; ctx.fillRect(x + 1, y, 13, 15);
    drawText(ctx, String(n), x + 8, y + 1, { color: '#3b2a2e', align: 'center', scale: 2 });
    tx += 20;
  }
  const text = texts.find((l) => measure(l, 2) <= w - (tx - x)) || texts[0], sc = fitScale(text, w - (tx - x));
  drawText(ctx, fitText(text, w - (tx - x), sc), tx, y + (sc === 2 ? 1 : 4), { color: '#8a5234', scale: sc });
  if (sub) drawText(ctx, fitText(sub, w), x, y + 20, { color: UI.inkSoft });
}
// (under a real field: its paper and its words in the game’s own letters — what a picture of the canvas keeps)
function fieldBox(r, text, bad, center = false) {
  ctx.fillStyle = bad ? '#c8454f' : '#8e5d3e'; ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.fillStyle = bad ? '#fbe4df' : '#fff8ea'; ctx.fillRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
  const sc = fitScale(text, r.w - 12);
  if (text) drawText(ctx, fitText(text, r.w - 12, sc), center ? r.x + r.w / 2 : r.x + 6, r.y + Math.round((r.h - 9 * sc) / 2) + sc, { color: INK, scale: sc, align: center ? 'center' : 'left' });
}
// a big button: the first of its labels that fits doubled (else the first, plain)
function bigPill(x, y, w, h, labels, id, fn, color) {
  const label = labels.find((l) => measure(l, 2) <= w - 10) || labels[0];
  wideButton(ctx, x, y, w, h, label, { color, down: S.pressing === id });
  tapArea(id, x - 2, y - 2, w + 4, h + 4, fn);
}
function diceBtn(x, y, size, id, fn) {
  diceButton(ctx, x, y, size, size, { down: S.pressing === id });
  tapArea(id, x - 3, y - 3, size + 6, size + 6, fn);
}

function drawJoin() {
  background();
  const hasCode = /^[A-Z]{4}$/.test(S.code);
  const invited = hasCode && !S.askCode;          // (the code came with the QR code or the link: only your name is asked)
  const choose = !remote && S.key && hasCode;     // (an invitation: at the big screen, or on your own screen at home?)
  const wide = W > H && W >= 340;                 // (a phone on its side: two columns)
  const pw = Math.min(W - 12, wide ? 440 : 260), px = Math.round((W - pw) / 2), inner = pw - 20, x0 = px + 10;
  const fh = 28, stepH = 32 + fh, colW = wide ? Math.floor((inner - 12) / 2) : inner, x2 = wide ? x0 + colW + 12 : x0;
  // its blocks: the code (typed, or on its ticket), your name, what to press — and what went wrong
  // upright: one under the other · on its side: code | name over the button, or ticket & name | button
  const codeH = invited ? 46 : stepH, side = wide && invited, split = wide && !invited;
  const actW = side ? colW : inner, actX = side ? x2 : x0;
  const where = choose ? bigLines(t('Where are you playing?'), actW, 1) : null;
  const actH = choose ? where.h + 6 + (split ? 36 : 76) : 32;
  const nameY = split ? 0 : codeH + (invited ? 0 : 8), nameX = split ? x2 : x0;
  const bodyH = side ? Math.max(codeH + stepH, actH) : nameY + stepH + 10 + actH;
  const actY = side ? Math.round((bodyH - actH) / 2) : nameY + stepH + 10;
  const err = S.error ? bigLines(S.error, inner - 16, 4) : null;
  const info = err ? [] : wrap(window.HEARTHLIGHT && window.HEARTHLIGHT.relay ? t('Works from anywhere, over the internet') : t('Same Wi-Fi as the big screen'), inner);
  const noteH = err ? err.h + 14 : info.length * 11;
  const ph = 10 + bodyH + 8 + noteH + 9;
  // (the title above the card when the screen is tall enough for both)
  const titleH = H - ph >= 96 ? 48 : !wide && H - ph >= 34 ? 24 : 0;
  const py = titleH ? titleH + 8 : Math.max(4, Math.min(8, H - ph - 4)), y0 = py + 10;
  if (titleH) {
    drawText(ctx, 'Hearthlight', W / 2, titleH === 48 ? 14 : 7, { color: '#fff3c4', align: 'center', scale: 2, outline: '#3b2a2e' });
    if (titleH === 48) drawText(ctx, t('~ party controller ~'), W / 2, 36, { color: '#f6d38f', align: 'center' });
  }
  panel(ctx, px, py, pw, ph);
  let codeR = null;
  if (invited) {
    // which party: its code, on a ticket
    const cx = x0 + Math.round(colW / 2), say = t('You’re joining the party'), sc = fitScale(say, colW);
    drawText(ctx, fitText(say, colW), cx, y0 + (sc === 2 ? 0 : 3), { color: '#8a5234', align: 'center', scale: sc });
    const code = S.code.split('').join(' '), cw = measure(code, 2) + 20;
    ctx.fillStyle = '#3b2a22'; ctx.fillRect(cx - cw / 2, y0 + 18, cw, 22);
    ctx.fillStyle = '#4f955a'; ctx.fillRect(cx - cw / 2 + 1, y0 + 19, cw - 2, 20);
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(cx - cw / 2 + 1, y0 + 19, cw - 2, 1);
    drawText(ctx, code, cx, y0 + 22, { color: '#fff7e6', align: 'center', scale: 2 });
  } else {
    stepLabel(1, [t('The party’s code'), t('Code')], t('4 letters, on the big screen'), x0, y0, colW);
    codeR = { x: x0, y: y0 + 32, w: colW, h: fh };
    fieldBox(codeR, S.code.split('').join(' '), S.badCode, true);
  }
  stepLabel(invited ? 0 : 2, [t('Your name')], t('Type it, or tap the dice'), nameX, y0 + nameY, colW);
  const nameR = { x: nameX, y: y0 + nameY + 32, w: colW - fh - 4, h: fh };
  fieldBox(nameR, S.name, false);
  diceBtn(nameX + colW - fh, nameR.y, fh, 'jdice', rollName);
  codeIn.classList.toggle('bad', !!S.badCode);
  codeAt = codeR; nameAt = nameR;
  const ay = y0 + actY;
  if (choose) {
    drawLines(ctx, where, actX + actW / 2, ay, { color: '#8a5234', align: 'center' });
    const cw = split ? Math.floor((actW - 8) / 2) : actW, cy = ay + where.h + 6;
    choiceBtn(actX, cy, cw, 36, t('At the big screen'), t('this phone is my controller'), 'jroom', join, '#4f955a');
    choiceBtn(split ? actX + cw + 8 : actX, split ? cy : cy + 40, cw, 36, t('On my own screen'), t('from home: the game shows here'), 'jhome', goHome, '#4f73b6');
  } else bigPill(actX, ay, actW, 32, [t('Join the party ♥'), t('Join ♥')], 'join', join, '#4f955a');
  const ny = y0 + bodyH + 8;
  if (err) {
    // what went wrong, big, in plain words
    ctx.fillStyle = '#c8454f'; ctx.fillRect(x0, ny, inner, err.h + 12);
    ctx.fillStyle = '#fbe4df'; ctx.fillRect(x0 + 1, ny + 1, inner - 2, err.h + 10);
    drawLines(ctx, err, px + pw / 2, ny + 6, { color: '#a8323c', align: 'center' });
  } else info.forEach((l, i) => drawText(ctx, l, px + pw / 2, ny + 1 + i * 11, { color: UI.inkSoft, align: 'center' }));
  // (under the card, if the screen goes on: how to find a party at all)
  const tips = invited || choose ? [] : wrap(t('Scan the QR code on the big screen, or type the code it shows.'), Math.min(W - 24, 230));
  if (py + ph + 12 + tips.length * 11 <= H - 4) tips.forEach((l, i) => drawText(ctx, l, W / 2, py + ph + 12 + i * 11, { color: '#b9a2e3', align: 'center' }));
}

function drawWaiting(text) {
  background();
  header();
  const dots = '.'.repeat(1 + (Math.floor(S.t * 3) % 3)), sc = fitScale(t(text) + '...', W - 16);
  drawText(ctx, t(text) + dots, Math.round(W / 2 - measure(t(text) + '...', sc) / 2), H / 2 - 16, { color: '#fff7e6', scale: sc });
  drawText(ctx, t('Room {code}', { code: S.code }), W / 2, H / 2 + 10, { color: '#b9a2e3', align: 'center' });
  bigPill(Math.round(W / 2 - 60), H - 44, 120, 28, [t('Leave')], 'leave', leave, '#8a5d42');
}

function drawLook() {
  background();
  header();
  const land = W > H;
  const groups = LOOK_GROUPS;
  const nTabs = groups.length + 1;           // + the hero tab
  let colX, colY, colW;
  // your name right under the header, clear of the phone’s keyboard — its field, its die: a typo
  // is fixed without leaving the party —, your portrait, the two main buttons
  const fh = 24, TAB = 20;
  let bx, by, bw, nameR;
  if (land) {
    const lw = Math.min(160, Math.round(W * 0.34)), ps = Math.max(48, Math.min(88, H - 26 - fh - 6 - 8 - 26 - 6 - 28 - 6));
    nameR = { x: 8, y: 26, w: lw - 8 - fh - 4, h: fh };
    portraitBox(Math.round((lw - ps) / 2) + 4, 26 + fh + 6, ps);
    bx = 8; bw = lw - 8; by = 26 + fh + 6 + ps + 8;
    colX = lw + 10; colY = 26; colW = W - colX - 8;
  } else {
    const lab = t('Your name'), lw = measure(lab) + 6, ps = H >= 520 ? 120 : H >= 420 ? 88 : H >= 350 ? 64 : 48;
    drawText(ctx, lab, 8, 26 + 8, { color: '#e8dcf2' });
    nameR = { x: 8 + lw, y: 26, w: W - 16 - lw - fh - 4, h: fh };
    portraitBox(Math.round((W - ps) / 2), 26 + fh + 8, ps);
    colX = 8; colY = 26 + fh + 8 + ps + 10; colW = W - 16;
    bx = 8; bw = W - 16;
    by = Math.min(H - 64, colY + TAB + 3 + g0RowH(colY) * maxParts() + 12);
  }
  fieldBox(nameR, S.name, false);
  diceBtn(nameR.x + nameR.w + 4, nameR.y, fh, 'ldice', rollName);
  if (!S.menu) nameAt = nameR;
  // buttons
  bigPill(bx, by, bw, 26, [t('★ Surprise me')], 'random', surpriseLook, '#8e5d3e');
  if (S.phase === 'lobby') bigPill(bx, by + 32, bw, 28, [t('Ready!  →')], 'ready', () => { S.ready = true; S.view = 'pad'; dropGift(); send({ t: 'ready', v: true }); }, '#4f955a');
  else bigPill(bx, by + 32, bw, 28, [t('Back to the game')], 'lookdone', () => { S.view = 'pad'; dropGift(); }, '#4f955a');
  // tabs: as wide as their words ask, the room left shared out (a long « Vêtements » is never cut)
  const tabNames = [...groups.map((g) => t(g.name)), t('Hero')], need = tabNames.map((n) => measure(n) + 8);
  const spare = colW - need.reduce((a, b) => a + b, 0), even = Math.floor(colW / nTabs);
  const tws = spare < 0 || need.every((n) => n <= even) ? tabNames.map(() => even) : need.map((n) => n + Math.floor(spare / nTabs));
  let tabX = colX;
  for (let i = 0; i < nTabs; i++) {
    const on = i === S.tab;
    const x = tabX, tw = tws[i];
    tabX += tw;
    const hero = i === groups.length;
    ctx.fillStyle = on ? '#fbf1dc' : hero ? '#6a4a3a' : '#5a4468';
    ctx.fillRect(x + 1, colY, tw - 2, TAB);
    ctx.fillStyle = on ? '#e0a526' : hero ? '#b8862a' : '#6e5680';
    ctx.fillRect(x + 1, colY, tw - 2, 2);
    drawText(ctx, fitText(tabNames[i], tw - 4), x + tw / 2, colY + 7, { color: on ? INK : '#e8dcf2', align: 'center' });
    tapArea('tab' + i, x, colY - 3, tw, TAB + 4, () => { S.tab = i; });
  }
  const areaH = land ? H - colY - TAB - 5 : g0RowH(colY) * maxParts() + 6;
  if (S.tab === groups.length) drawHeroes(colX, colY + TAB, colW, areaH);
  else drawLookRows(groups[S.tab], colX, colY + TAB, colW, land ? Math.max(24, Math.min(30, Math.floor((H - colY - TAB - 11) / groups[S.tab].parts.length))) : g0RowH(colY));
  // (a guest who typed no name: the one given at the door, said kindly — until they touch something)
  if (S.gift && S.me && !S.menu) {
    if (!S.giftT) S.giftT = S.t;
    if (S.t - S.giftT > 16) dropGift();
    else {
      const gw = land ? Math.max(bw, 190) : W - 16, lines = wrap(t('No name? We’ll call you {name}! Type yours up here, or tap the dice.', { name: S.me.name }), gw - 14);
      const gy = nameR.y + fh + 5, gh = lines.length * 11 + 9;
      ctx.fillStyle = '#3b2a22'; ctx.fillRect(8, gy, gw, gh);
      for (let i = 0; i < 5; i++) ctx.fillRect(nameR.x + 12 - i, gy - 5 + i, i * 2 + 1, 1);
      ctx.fillStyle = '#fff3c4'; ctx.fillRect(9, gy + 1, gw - 2, gh - 2);
      for (let i = 1; i < 5; i++) ctx.fillRect(nameR.x + 13 - i, gy - 4 + i, i * 2 - 1, 1);
      lines.forEach((l, i) => drawText(ctx, l, 8 + gw / 2, gy + 6 + i * 11, { color: INK, align: 'center' }));
      tapArea('gift', 8, gy, gw, gh, dropGift);
    }
  }
}

// a nickname goes with a surprise look, unless the name was typed
function surpriseLook() {
  S.look = randomLook(); pushLook();
  if (!S.typed) rollName();
}

// the rows of a group of the look: its label, ◂ value ▸
function drawLookRows(g, colX, top, colW, rowH) {
  panel(ctx, colX, top, colW, rowH * g.parts.length + 6);
  g.parts.forEach((part, i) => {
    const y = top + 3 + i * rowH;
    const opts = part.key === 'hat' ? part.options.concat(S.hats.map((id) => ({ id, name: TREASURE_HATS[id], treasure: true }))) : part.options;
    let idx = opts.findIndex((o) => o.id === S.look[part.key]);
    if (idx < 0) idx = 0;
    const o = opts[idx];
    const aw = 20, ah = rowH - 4;
    const vx = colX + Math.max(64, Math.round(colW * 0.38)), vw = colX + colW - 8 - vx;
    const lab = splitTwo(t(part.label), vx - colX - 12);
    if (lab.length > 1 && rowH >= 22) lab.forEach((l, k) => drawText(ctx, fitText(l, vx - colX - 12), colX + 8, y + Math.round(rowH / 2) - 9 + k * 9, { color: UI.inkSoft }));
    else drawText(ctx, fitText(t(part.label), vx - colX - 12), colX + 8, y + Math.round(rowH / 2) - 4, { color: UI.inkSoft });
    arrowBtn(vx, y + 2, aw, ah, -1, `l${part.key}`, () => { S.look[part.key] = opts[(idx + opts.length - 1) % opts.length].id; pushLook(); });
    arrowBtn(vx + vw - aw, y + 2, aw, ah, 1, `r${part.key}`, () => { S.look[part.key] = opts[(idx + 1) % opts.length].id; pushLook(); });
    const mx = vx + aw + 3, mw = vw - aw * 2 - 6;
    ctx.fillStyle = o.treasure ? '#fff0b0' : '#f3e3c3'; ctx.fillRect(mx, y + 2, mw, ah);
    let tx = mx + mw / 2;
    if (o.color) {
      ctx.fillStyle = '#3b2a22'; ctx.fillRect(mx + 3, y + 2 + Math.round(ah / 2) - 5, 10, 10);
      ctx.fillStyle = o.color; ctx.fillRect(mx + 4, y + 2 + Math.round(ah / 2) - 4, 8, 8);
      tx += 7;
    }
    drawText(ctx, fitText((o.treasure ? '★' : '') + t(o.name), mw - (o.color ? 18 : 6)), tx, y + 2 + Math.round(ah / 2) - 4, { color: o.treasure ? '#8a5a10' : INK, align: 'center' });
    if (i < g.parts.length - 1) { ctx.fillStyle = '#e8d6b4'; ctx.fillRect(colX + 6, y + rowH - 1, colW - 12, 1); }
  });
}

const maxParts = () => Math.max(...LOOK_GROUPS.map((g) => g.parts.length));

// portrait layout: rows grow to fill the space above the two big buttons
function g0RowH(colY) {
  return Math.max(24, Math.min(32, Math.floor((H - 64 - 12 - colY - 23) / maxParts())));
}

function pushLook() {
  dropGift();
  store.set('look', S.look);
  send({ t: 'look', look: S.look });
}

// ------------------------------------------------------------------ heroes (fighting classes)
function pickClass(id) {
  if (!CLASSES[id]) return;
  S.cls = id;
  store.set('cls', id);
  send({ t: 'cls', v: id });
  buzz([15, 30, 15]);
}

function drawHeroes(x, y, w, h) {
  panel(ctx, x, y, w, h);
  // eight heroes: roomy cards when they fit; else a compact grid of two columns (the picture,
  // the name, the health) and what the chosen one does underneath
  const n = CLASS_ORDER.length, gap = 3;
  const roomy = Math.floor((h - 8 - gap * (n - 1)) / n) >= 24;
  const cols = roomy ? (n > 4 && w >= 240 ? 2 : 1) : 2, rows = Math.ceil(n / cols);
  const descs = roomy ? [] : CLASS_ORDER.map((id) => wrap(t(CLASSES[id].desc), w - 10)), nl = Math.min(3, Math.max(1, ...descs.map((d) => d.length)));
  const detail = roomy ? 0 : 25 + nl * 9;
  const ch = roomy ? Math.max(24, Math.min(52, Math.floor((h - 8 - gap * (rows - 1)) / rows))) : Math.max(18, Math.min(30, Math.floor((h - 8 - detail - gap * (rows - 1)) / rows)));
  const colW = Math.floor((w - 8 - gap * (cols - 1)) / cols);
  CLASS_ORDER.forEach((id, i) => {
    const c = CLASSES[id], on = S.cls === id;
    const cy = y + 4 + Math.floor(i / cols) * (ch + gap), cx = x + 4 + (i % cols) * (colW + gap), cw = colW;
    const down = S.pressing === 'cls' + id;
    ctx.fillStyle = on ? '#fff3c4' : down ? '#e8d6b4' : '#f3e3c3'; ctx.fillRect(cx, cy, cw, ch);
    ctx.fillStyle = c.color; ctx.fillRect(cx, cy, 3, ch);
    if (on) { ctx.fillStyle = '#e0a526'; ctx.fillRect(cx, cy, cw, 1); ctx.fillRect(cx, cy + ch - 1, cw, 1); ctx.fillRect(cx + cw - 1, cy, 1, ch); }
    const iy = cy + Math.max(1, Math.round((ch - 16) / 2));
    ctx.fillStyle = '#3b2a22'; ctx.fillRect(cx + 5, iy, 16, 16);
    ctx.fillStyle = shade(c.color, 0.55); ctx.fillRect(cx + 6, iy + 1, 14, 14);
    drawClassIcon(ctx, id, cx + 7, iy + 3);
    if (!roomy) {
      drawText(ctx, fitText(t(c.name), cw - 27), cx + 24, cy + Math.round(ch / 2) - 8, { color: INK });
      drawText(ctx, (on ? '✓ ' : '') + `♥${c.hp}`, cx + 24, cy + Math.round(ch / 2) + 1, { color: on ? '#4f955a' : '#c8454f' });
      tapArea('cls' + id, cx, cy, cw, ch, () => pickClass(id));
      return;
    }
    // name & health, the X special, then as much of the blurb as fits
    const tw = cw - 33;
    drawText(ctx, t(c.name), cx + 27, cy + 3, { color: INK });
    drawText(ctx, (on ? '✓ ' : '') + `♥${c.hp}`, cx + cw - 6, cy + 3, { color: on ? '#4f955a' : '#c8454f', align: 'right' });
    drawText(ctx, fitText(t('X: {move}', { move: t(c.special.name) }), tw), cx + 27, cy + 13, { color: '#7d4f93' });
    const room = Math.floor((ch - 24) / 9);
    if (room > 0) {
      const lines = wrap(t(c.desc), tw);
      lines.slice(0, room).forEach((l, k) => drawText(ctx, k === room - 1 && lines.length > room ? fitText(l + '…', tw) : l, cx + 27, cy + 23 + k * 9, { color: UI.inkSoft }));
    }
    tapArea('cls' + id, cx, cy, cw, ch, () => pickClass(id));
  });
  if (!roomy && CLASSES[S.cls]) {
    const c = CLASSES[S.cls], dy = y + 6 + rows * (ch + gap);
    const lines = wrap(t(c.desc), w - 10);
    drawText(ctx, fitText(t('X: {move}', { move: t(c.special.name) }), w - 10), x + 5, dy, { color: '#7d4f93' });
    drawText(ctx, fitText(t(c.role || ''), w - 10), x + 5, dy + 10, { color: '#8a5234' });
    lines.slice(0, nl).forEach((l, k) => drawText(ctx, k === nl - 1 && lines.length > nl ? fitText(l + '…', w - 10) : l, x + 5, dy + 20 + k * 9, { color: UI.inkSoft }));
  }
}

// the thumb-stick (left) and the A / B / X / Y buttons (right), under zoneY
function drawControls(zoneY, lobby) {
  const land = W > H;
  // stick zone: the left half under the info strip
  const zone = { x: 0, y: zoneY, w: Math.round(W * (land ? 0.52 : 0.55)), h: H - zoneY };
  regions.push({ kind: 'stick', id: 'stick', ...zone });
  const R = stick.r = Math.round(Math.min(zone.w, zone.h) * 0.2);
  const restX = Math.round(zone.w * 0.5), restY = Math.round(zoneY + zone.h * (land ? 0.58 : 0.62));
  const active = stick.id !== null;
  const bx = active ? stick.ox : restX, byy = active ? stick.oy : restY;
  disc(bx, byy, R + 3, 'rgba(15,10,22,0.55)');
  ring(bx, byy, R + 3, active ? 'rgba(255,243,196,0.5)' : 'rgba(185,162,227,0.35)');
  const kx = bx + stick.vx * R, ky = byy + stick.vy * R;
  const col = S.me ? S.me.color : '#e0a526';
  disc(kx, ky + 2, Math.round(R * 0.55), 'rgba(10,6,16,0.5)');
  disc(kx, ky, Math.round(R * 0.55), shade(col, -0.35));
  disc(kx, ky - 1, Math.round(R * 0.55) - 1, col);
  disc(kx - 2, ky - 3, Math.max(1, Math.round(R * 0.18)), shade(col, 0.45));
  if (!active) drawText(ctx, t('move'), restX, S.ctx.y && !lobby ? restY - R - 16 : restY + R + 8, { color: 'rgba(233,220,242,0.55)', align: 'center' });
  // buttons: A (big), B below-left, X (special) above
  const rA = Math.round(Math.min(W, H) * (land ? 0.15 : 0.13));
  const rB = Math.round(rA * 0.72);
  const ax = W - rA - (land ? 18 : 12), ay = H - rA - (land ? 26 : 34);
  const bx2 = ax - rA - rB - (land ? 14 : 8), by2 = ay + Math.round(rA * 0.55);
  const ic = lobby ? {} : S.ctx.ic || {};
  bigButton(ax, ay, rA, 'A', S.ctx.a || (lobby ? t('Wave') : ''), '#5fbf6a', 'a', 0, 'top', ic.a);
  bigButton(bx2, by2, rB, 'B', S.ctx.b === null ? '' : S.ctx.b || t('Hop'), '#ec7f6d', 'b', 0, S.ctx.y && S.ctx.x && !lobby ? 'left' : 'top');
  const xx = ax - Math.round(rA * 0.45), xy = ay - rA - rB - 18;
  if (S.ctx.x && !lobby) bigButton(xx, xy, rB, 'X', S.ctx.x, '#7fa8f0', 'x', S.ctx.cd || 0, 'top', ic.x);
  // U: the ultimate — its gauge fills the button, and it glows once it's ready
  let top = xy - rB - 24;
  const glow = (ux, uy, rU) => { const k = Math.floor(S.t * 6) % 2; disc(ux, uy, rU + 3 + k, k ? 'rgba(255,214,107,0.55)' : 'rgba(255,243,166,0.35)'); };
  if (S.ctx.ults && !lobby) {
    // (a hero who has learned several: a button each, its own gauge and picture — in a row
    // leftwards from X when the phone lies on its side, over X when it stands)
    const n = S.ctx.ults.length, rU = Math.round(rB * 0.76), step = rU * 2 + (land ? 8 : 6);
    const x1 = land ? xx - rB - rU - 10 : W - rU - 8, uy = land ? xy - Math.round(rB * 0.35) : xy - rB - rU - 23;
    S.ctx.ults.forEach((u, i) => {
      const ux = x1 - (n - 1 - i) * step, ready = u.g >= 100;
      if (ready) glow(ux, uy, rU);
      bigButton(ux, uy, rU, 'U', '', '#e0a526', 'u' + (i + 1), ready ? 0 : 100 - u.g, 'top', u.ic, ready);
    });
    if (!land) top = uy - rU - 10;
  } else if (S.ctx.ult !== null && !lobby) {
    const rU = Math.round(rB * 0.82), ux = xx - rB - rU - 10, uy = xy - Math.round(rB * 0.35);
    const ready = S.ctx.ult >= 100;
    if (ready) glow(ux, uy, rU);
    bigButton(ux, uy, rU, 'U', ready ? t('Ultimate!') : '', '#e0a526', 'u', ready ? 0 : 100 - S.ctx.ult, 'top', S.ctx.uic);
  }
  // Y: whistle for your mount / get off — above B, left of X (its label on the left)
  if (S.ctx.y) {
    const rY = Math.round(rB * 0.88);
    const yx = S.ctx.x && !lobby ? bx2 + 2 : xx, yy = S.ctx.x && !lobby ? Math.round((xy + by2) / 2) - 6 : xy;
    bigButton(yx, yy, rY, 'Y', S.ctx.y, '#e8b83a', 'y', 0, S.ctx.x && !lobby ? 'left' : 'top', ic.y);
  }
  // (and what stays free of them: the gap between the stick and the buttons, from side to
  // side, and how far down a card may come over the buttons)
  return { ay, rA, rB, xy, gap: [restX + R + 10, bx2 - rB - 10], top };
}

// ------------------------------------------------------------------ the solo game
// The big screen is running the solo game and this phone is its controller:
// the stick and A / B / X / Y as in Party Mode, plus the solo game's own
// buttons (bag, map, journal, hero) and the hotbar. Menus & chats on the big
// screen are driven with the stick, A and B.
function soloAct(a) { send({ t: 'act', a }); buzz(8); }

function drawSolo() {
  background();
  const land = W > H, c = S.ctx, mode = c.mode || 'play';
  // (the big screen's pause menu: resume, save, settings, back to the title)
  const pausable = mode === 'play' || mode === 'wait';
  header(null, pausable ? W - 72 : W - 50);
  iconBtn(W - 24, 1, 20, 18, 'menu', 'menu', () => { S.menu = S.menu ? false : 'main'; }, { color: '#6a5a7a', badge: S.prog && S.prog.points > 0 ? '•' : '' });
  if (pausable) iconBtn(W - 46, 1, 20, 18, 'pause', 'pause', () => soloAct('pause'), { color: '#4a6a8a' });
  iconBtn(pausable ? W - 68 : W - 46, 1, 20, 18, 'chat', 'chats', openChat, { color: '#3f8a9a' });
  const top = 24;
  let y = top;
  // what's going on: your portrait, health and the game's hint
  const hint = mode === 'wait' ? t('Look at the big screen!') : mode === 'talk' ? t('A: next · the stick picks an answer') : c.hint || '';
  const hp = typeof c.hp === 'number' ? c.hp : null;
  // (the story’s step under it, as in Party: a tap opens the Quest page)
  const goal = mode === 'play' ? goalNow() : null;
  if (land) {
    const hl = goalStrip(hint, goal, y + 2, W - 16);
    y += Math.max(12, hl * 10 + 4);
    if (hp !== null) { hpBar(8, y - 2, Math.round(W * 0.3), hp); y += 6; }
  } else {
    const gl = goal ? goalLines(goal, W - 46, 3, GOLD, '#8a5234') : [], band = gl.length ? 7 + gl.length * 11 : 0;
    const base = Math.max(54, Math.min(80, Math.round(H * 0.15))), cardH = base + band;
    panel(ctx, 6, y + 2, W - 12, cardH);
    const ps = base - 16;
    portraitBox(14, y + 10, ps);
    const tx = 14 + ps + 10;
    let hy = y + 11;
    if (hp !== null) { hpBar(tx, y + 11, W - tx - 18, hp); hy = y + 20; }
    const lines = Math.max(1, Math.floor((y + base - hy - 2) / 11));
    wrap(hint || (goal ? '' : t('Have fun!')), W - tx - 18).slice(0, lines).forEach((l, i) => drawText(ctx, l, tx, hy + i * 11, { color: '#5a4a5a' }));
    if (band && !hint) wrapFit(S.quest.main.title, W - tx - 18, Math.min(2, lines)).forEach((l, i) => drawText(ctx, l, tx, hy + i * 11, { color: '#8a5234' }));
    if (band) goalBand(9, y + cardH - band - 1, W - 18, band, gl);
    y += cardH + 6;
  }
  // (the game thinks you're stuck: the way out, first)
  if (mode === 'play' && c.stuck) { pill(6, y, W - 12, 22, t('Stuck? Get unstuck'), 'stucks', () => { soloAct('unstuck'); buzz([20, 30, 20]); }, { color: '#4f955a' }); y += 28; }
  // the solo game's own buttons (in a menu: the tabs & close)
  if (mode !== 'talk' && mode !== 'wait') {
    const row = mode === 'menu' && c.page === 'pause' ? [[t('Resume'), 'pause', '#4f955a', 'play']]
      : mode === 'menu' && c.page ? [[t('Back'), 'cancel', '#6a5a7a'], [t('Close'), 'menu', '#a8483a', 'close']]
      : mode === 'menu' ? [['← ' + t('Tab'), 'hotPrev', '#6a5a7a'], [t('Tab') + ' →', 'hotNext', '#6a5a7a'], [t('Close'), 'menu', '#a8483a', 'close']]
      : mode === 'title' ? [] : [[t('Bag'), 'menu', '#8e5d3e', 'bag'], [t('Map'), 'worldmap', '#4a7ab8', 'map'], [t('Journal'), 'journal', '#6a4a88', 'book'], [t('Hero'), 'hero', '#b8862a', heroGlyph()]];
    if (row.length) {
      const gap = 4, bw = Math.floor((W - 12 - gap * (row.length - 1)) / row.length);
      // (the picture beside the word when there's room, else the word under it)
      const tall = row.some(([label, , , glyph]) => glyph && measure(label) > bw - 24) ? 30 : 18;
      row.forEach(([label, a, col, glyph], i) => {
        if (glyph) iconBtn(6 + i * (bw + gap), y, bw, tall, glyph, 'solo' + a, () => soloAct(a), { color: col, label });
        else pill(6 + i * (bw + gap), y, bw, 18, fitText(label, bw - 6), 'solo' + a, () => soloAct(a), { color: col });
      });
      y += tall + 6;
    }
    // what you're holding, and ◀ ▶ through the hotbar
    if (mode === 'play' && c.hot) {
      const aw = 22, mw = Math.min(W - 12 - aw * 2 - 8, 170), x0 = Math.round(W / 2 - (mw + aw * 2 + 8) / 2);
      arrowBtn(x0, y, aw, 16, -1, 'hotp', () => soloAct('hotPrev'));
      ctx.fillStyle = 'rgba(15,10,22,0.55)'; ctx.fillRect(x0 + aw + 4, y, mw, 16);
      drawText(ctx, fitText(c.hot, mw - 8), x0 + aw + 4 + mw / 2, y + 4, { color: '#fff3c4', align: 'center' });
      arrowBtn(x0 + aw + 8 + mw, y, aw, 16, 1, 'hotn', () => soloAct('hotNext'));
      y += 22;
    }
  }
  drawControls(y + 2, false);
  if (S.menu === 'main') drawMenu();
  else if (S.menu === 'cls') drawHeroMenu();
  else if (S.menu === 'mounts') drawMountMenu();
  else if (S.menu === 'pets') drawPetMenu();
  else if (S.menu === 'talents') drawTalents();
  else if (S.menu === 'gear') drawGear();
  else if (S.menu === 'map') drawMapScreen();
  else if (S.menu === 'chat') drawChat();
  else if (S.menu === 'quest') drawQuest();
}

function drawPad() {
  const land = W > H;
  const lobby = S.phase === 'lobby';
  // top-right, big enough for a thumb: the menu (or back to the wardrobe in the lobby), the
  // host's crown, the map (in the lobby: the invitations) and, in the evening, a campfire
  const HB = 28, bw = 26, bh = 24, by = 2, gap = 3;
  const styleW = lobby ? measure(t('Style')) + 28 : 0;
  let right = W - 3;
  const slot = (w) => { right -= w; const at = right; right -= gap; return at; };
  const menuX = slot(lobby ? styleW : bw), hostX = S.host ? slot(bw) : 0;
  const mapX = !lobby ? slot(bw) : 0, invX = lobby ? slot(bw) : 0, camp = !lobby && S.ctx.camp, campX = camp ? slot(bw) : 0, chatX = slot(bw);
  background();
  header(null, right + gap, HB);
  if (lobby) iconBtn(menuX, by, styleW, bh, 'shirt', 'look', () => { S.view = 'look'; S.ready = false; send({ t: 'ready', v: false }); }, { color: '#6a4a88', label: t('Style') });
  else iconBtn(menuX, by, bw, bh, 'menu', 'menu', () => { S.menu = S.menu ? false : 'main'; }, { color: '#6a5a7a', badge: S.prog && S.prog.points > 0 ? '•' : '' });
  if (S.host) hostPill(hostX, bw, bh, by);
  if (!lobby) iconBtn(mapX, by, bw, bh, 'map', 'mapp', openMap, { color: '#4a7ab8' });
  if (lobby) iconBtn(invX, by, bw, bh, 'invite', 'invp', openInvite, { color: '#4f955a' });
  if (camp) iconBtn(campX, by, bw, bh, 'campfire', 'campp', () => { send({ t: 'camp' }); buzz(15); }, { color: '#b8502a' });
  iconBtn(chatX, by, bw, bh, 'chat', 'chatp', openChat, { color: '#3f8a9a', badge: S.chatNew ? '•' : '' });
  // hint / score strip (in the lobby, the host starts the party)
  const L = S.lobby, allReady = !!(L && L.total && L.ready >= L.total);
  const hint = !lobby ? S.ctx.hint || ''
    : S.host ? (allReady ? t('Everyone’s ready — start the party when you like!') : t('Start the party whenever you like (or wait for everyone to be ready)'))
      : L && L.host ? t('♛ {name} starts the party — walk around!', { name: L.host }) : t('Waiting for everyone… walk around!');
  const top = HB + 4;
  let infoH;
  const score = S.score !== null && S.score !== undefined ? String(S.score) : '';
  const hp = !lobby && typeof S.ctx.hp === 'number' ? S.ctx.hp : null;
  // (the story’s step, always in sight: under the hint of the moment — a tap opens the Quest page)
  const goal = lobby ? null : goalNow();
  if (land) {
    infoH = 16;
    const hl = goalStrip(hint, goal, top + 2, W - 70, lobby ? 0 : 108);
    if (hl > 1) infoH = 26;
    if (score) drawText(ctx, score, W - 8, top + 2, { color: '#fff3c4', align: 'right' });
    if (hp !== null) { hpBar(8, top + infoH - 4, Math.round(W * 0.3), hp); infoH += 6; }
    if (lobby && S.prog) {
      const pts = S.prog.points || 0;
      pill(8, top, 58, 14, fitText(t('Talents') + (pts ? ' +' + pts : ''), 52), 'ltal', () => { S.menu = 'talents'; S.talSel = null; }, { color: pts ? '#62a84a' : '#8e5d3e' });
      pill(70, top, 50, 14, fitText(t('Gear'), 44), 'lgear', () => { S.menu = 'gear'; S.gearSel = null; }, { color: '#5a7ab8' });
    }
  } else {
    // a little paper card: portrait, name, stars and what to do
    // (a long hint makes the card taller — up to a point — rather than being cut short)
    const base = Math.max(62, Math.min(96, Math.round(H * 0.19))), ps = base - 16, tx = 14 + ps + 10;
    const say = hint || (goal ? '' : t('Have fun!')), gl = goal ? goalLines(goal, W - 46, 3, GOLD, '#8a5234') : [], band = gl.length ? 7 + gl.length * 11 : 0;
    const need = (hp !== null ? 29 : 22) + 8 + wrap(say, W - tx - 18).length * 11 + (lobby && S.prog ? 18 : 0);
    const cardH = Math.max(base, Math.min(Math.round(H * 0.3), need)) + band;
    panel(ctx, 6, top + 2, W - 12, cardH);
    portraitBox(14, top + 10, ps);
    if (S.me) drawText(ctx, S.me.name, tx, top + 11, { color: INK });
    if (score) drawText(ctx, score, W - 16, top + 11, { color: '#b8862a', align: 'right' });
    let hy = top + 22;
    if (hp !== null) { hpBar(tx, top + 21, W - tx - 18, hp); hy = top + 29; }
    ctx.fillStyle = '#e8d6b4'; ctx.fillRect(tx, hy, W - tx - 16, 1);
    const room = lobby && S.prog ? 18 : 0;
    const lines = Math.max(1, Math.floor((top + 2 + cardH - band - hy - 8 - room) / 11));
    wrap(say, W - tx - 18).slice(0, lines).forEach((l, i) => drawText(ctx, l, tx, hy + 5 + i * 11, { color: '#5a4a5a' }));
    // (no hint just now: the quest’s name keeps its place, over its step)
    if (band && !say) wrapFit(S.quest.main.title, W - tx - 18, Math.min(2, lines)).forEach((l, i) => drawText(ctx, l, tx, hy + 5 + i * 11, { color: '#8a5234' }));
    if (band) goalBand(9, top + cardH - band - 1, W - 18, band, gl);
    // between games: talents & gear right on the card
    if (room) {
      const bw = Math.floor((W - tx - 22) / 2), yy = top + cardH - 16, pts = S.prog.points || 0;
      pill(tx, yy, bw, 14, fitText(t('Talents') + (pts ? ' +' + pts : ''), bw - 6), 'ltal', () => { S.menu = 'talents'; S.talSel = null; }, { color: pts ? '#62a84a' : '#8e5d3e' });
      pill(tx + bw + 4, yy, bw, 14, fitText(t('Gear'), bw - 6), 'lgear', () => { S.menu = 'gear'; S.gearSel = null; }, { color: '#5a7ab8' });
    }
    infoH = cardH + 8;
  }
  // (the big screen thinks you're stuck: the way out, right here)
  if (!lobby && S.ctx.stuck) {
    pill(land ? Math.round(W / 2 - 90) : 6, top + infoH, land ? 180 : W - 12, 22, t('Stuck? Get unstuck'), 'stuckp', () => { send({ t: 'unstuck' }); buzz([20, 30, 20]); }, { color: '#4f955a' });
    infoH += 28;
  }
  // the host's big Start button
  if (lobby && S.host) {
    const label = t('Start the party!') + (L && L.total ? `  ${L.ready}/${L.total} ✓` : '');
    pill(land ? Math.round(W / 2 - 90) : 6, top + infoH, land ? 180 : W - 12, 20, label, 'hstart', () => { send({ t: 'start' }); buzz([20, 40, 20]); }, { color: allReady ? '#4f955a' : '#6a8a5a' });
    infoH += 26;
  }
  let zoneY = top + infoH;
  // the host zooms the big screen's camera right from here: a row under the card (in the
  // header when the phone lies on its side)
  if (S.host && !S.menu && zoomItem()) { if (land) zoomBar(W / 2, 5, 18); else { zoomBar(W / 2, zoneY, 20); zoneY += 26; } }
  const K = drawControls(zoneY, lobby);
  if (S.lvCard && !S.menu && !lobby) drawLevelCard(zoneY, K);
  if (S.paused && S.menu !== 'host') drawPausedCard();
  if (S.menu === 'main') drawMenu();
  else if (S.menu === 'cls') drawHeroMenu();
  else if (S.menu === 'mounts') drawMountMenu();
  else if (S.menu === 'pets') drawPetMenu();
  else if (S.menu === 'talents') drawTalents();
  else if (S.menu === 'gear') drawGear();
  else if (S.menu === 'host') drawHostMenu();
  else if (S.menu === 'map') drawMapScreen();
  else if (S.menu === 'invite') drawInvite();
  else if (S.menu === 'chat') drawChat();
  else if (S.menu === 'quest') drawQuest();
}

// ------------------------------------------------------------------ the story: the objective & the Quest page
// The big screen sends each phone its player’s card (Saga.card: the chapter, the quests under
// way, where to go — in « tu »). The step of the main quest stays in sight on the controller, and
// a tap on it (or the menu’s first tile) opens the Quest page: the chapter and its recap, the
// main quest — why, the steps done, the one under way — then the side quests (a tap opens one
// the same way) and who has a quest to give. At its foot, always there: where the step is and a
// big « Go there » — the guide on the big screen, an arrow at your hero’s feet — or « Stop
// guiding » while it runs. The page scrolls under a finger.
const goalNow = () => (S.quest && S.quest.main && S.quest.main.now ? S.quest.main : null);
function openQuest(id = null) { S.menu = 'quest'; S.qopen = id; S.qscroll = 0; S.qvel = 0; S.qto = null; S.questNew = false; }
// (the guide, asked by name: the big screen knows where a quest’s step or a villager is)
function questGuide(d, w) {
  const stop = w.go === 2;
  send({ t: 'goto', ...d, stop: stop ? 1 : 0 });
  buzz(stop ? 10 : [12, 30, 12]);
  w.go = stop ? 1 : 2;
  if (!stop) S.menu = false;
}

// a little arrow, eight ways (0 east, 2 south… — up is north, as on the big screen)
const DIR_PIX = [['.......', '...#...', '....#..', '#######', '....#..', '...#...', '.......'], ['..#####', '.....##', '....#.#', '...#..#', '..#...#', '.#.....', '#......']];
function dirArrow(x, y, dir, color) {
  const rows = DIR_PIX[dir % 2], turns = dir % 2 ? ((dir + 1) / 2) % 4 : dir / 2;
  ctx.fillStyle = color;
  for (let j = 0; j < 7; j++) for (let i = 0; i < 7; i++) {
    if (rows[j][i] !== '#') continue;
    let a = i, b = j;
    for (let k = 0; k < turns; k++) [a, b] = [6 - b, a];
    ctx.fillRect(x + a, y + b, 1, 1);
  }
}
// the step on the controller, on `rows` lines: its words, its count and how far it is — « …
// (0/1) · 45 m », the end of it never cut
function goalLines(g, w, rows, gold, soft) {
  const far = g.where && g.where.d >= 5 ? ` {${soft}}· ${t('{n} m', { n: g.where.d })}{/}` : '';
  return wrapTail(g.now + far, g.tail + far, w, rows, gold);
}
// …upright: a strip at the foot of the card, which way the step is at its end, that opens the
// Quest page
function goalBand(x, y, w, h, lines) {
  const down = S.pressing === 'goalp', wh = S.quest.main.where;
  ctx.fillStyle = down ? '#e6d2ac' : UI.paperShade; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#e0cba4'; ctx.fillRect(x, y, w, 1);
  drawText(ctx, '★', x + 4, y + 4, { color: '#e0a526' });
  lines.forEach((l, i) => drawText(ctx, l, x + 14, y + 4 + i * 11, { color: INK }));
  if (wh && wh.dir >= 0 && wh.d >= 5) dirArrow(x + w - 11, y + Math.round(h / 2) - 4, wh.dir, '#8a5234');
  else drawText(ctx, '▸', x + w - 9, y + Math.round(h / 2) - 4, { color: '#8a5234' });
  if (S.questNew) badgeAt(x + w, y - 3, '•');
  tapArea('goalp', x, y - 2, w, h + 4, () => openQuest());
}
// …on its side: the hint of the moment and the step on two lines at most, centred; how many
// (`keep`: what a second line leaves free on the right — the special’s label hangs at that
// height —: two lines start at the left edge then, the first one as long as the screen)
function goalStrip(hint, goal, y, w = W - 70, keep = 0) {
  const star = '{#e0a526}★{/} ', step = (n) => goalLines(goal, w - 12, n, '#ffd66b', '#b9a2e3').map((l, i) => (i ? l : star + l));
  const lay = (w1) => (!goal ? (hint ? wrap(hint, w).slice(0, 2) : []) : hint ? [fitRich(hint, w1), ...step(1)] : step(2));
  let L = lay(w);
  const left = keep && L.length > 1;
  if (left) { w = W - keep - 16; L = lay(W - 16); }
  L.forEach((l, i) => drawText(ctx, l, left ? 8 : W / 2, y + i * 10, { color: goal && (!hint || i) ? '#fff3c4' : '#f6d38f', align: left ? 'left' : 'center' }));
  if (goal) tapArea('goalp', left ? 4 : Math.round(W / 2 - w / 2), y - 4, w, L.length * 10 + 6, () => openQuest());
  return L.length;
}

// the guide’s button: green « Go there », red « Stop guiding » (big letters when they fit)
function goButton(x, y, w, h, on, fn) {
  const down = S.pressing === 'qgo', dy = down ? 1 : 0, color = on ? '#a8483a' : '#4f955a', label = on ? t('Stop guiding') : t('Go there');
  ctx.fillStyle = 'rgba(30,18,30,0.3)'; ctx.fillRect(x + 1, y + 2, w, h);
  ctx.fillStyle = '#3b2a22'; ctx.fillRect(x + 1, y + dy, w - 2, h); ctx.fillRect(x, y + 1 + dy, w, h - 2);
  ctx.fillStyle = down ? shade(color, -0.2) : color; ctx.fillRect(x + 1, y + 1 + dy, w - 2, h - 2);
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(x + 1, y + 1 + dy, w - 2, 1);
  const flag = on ? 0 : 20, s = measure(label, 2) <= w - 16 - flag ? 2 : 1, tw = measure(label, s) + flag, x0 = Math.round(x + (w - tw) / 2);
  if (flag) drawGlyph(ctx, 'flag', x0, y + Math.round((h - 16) / 2) + dy, 1);
  drawText(ctx, fitText(label, w - 10 - flag, s), x0 + flag, y + Math.round((h - 8 * s) / 2) + dy, { color: '#fff7e6', scale: s });
  tapArea('qgo', x - 2, y - 2, w + 4, h + 4, fn);
}

function drawQuest() {
  const C = S.quest, land = W > H;
  ctx.fillStyle = '#1c1428'; ctx.fillRect(0, 0, W, H);
  regions.push({ kind: 'tap', id: 'scrim', x: 0, y: 0, w: W, h: H, fn: () => {} });
  const open = S.qopen && C ? C.sides.find((s) => s.id === S.qopen) : null;
  if (S.qopen && !open) S.qopen = null;
  const q = open || (C && C.main);
  // the title bar: back to the whole story from a side quest, ✕
  ctx.fillStyle = '#20172a'; ctx.fillRect(0, 0, W, 22);
  drawGlyph(ctx, 'book', 3, 3, 1);
  const back = '← ' + t('Back'), kw = measure(back) + 12;
  drawText(ctx, fitText(open ? t('Side quest') : t('Quest'), W - 54 - (open ? kw : 0)), 22, 7, { color: '#fff7e6' });
  if (open) pill(W - 30 - kw, 3, kw, 16, back, 'qback', () => openQuest(), { color: '#6a5a7a' });
  iconBtn(W - 24, 2, 20, 18, 'close', 'qdone', () => { S.menu = false; }, { color: '#a8483a' });
  const px = 4, py = 24, pw = W - 8, ph = H - 28;
  panel(ctx, px, py, pw, ph);
  if (!C) { drawText(ctx, t('Waiting for the big screen…'), W / 2, py + 40, { color: UI.inkSoft, align: 'center' }); return; }
  const wh = q && q.where, where = wh ? whereText(wh) : '', can = !!(wh && wh.go), on = can && wh.go === 2;
  const fh = !where && !can ? 0 : land ? 34 : (where ? 15 : 0) + (can ? 30 : 0) + 6;
  const bx = px + 10, bw = pw - 20, by = py + 6, bh = ph - 12 - fh;
  // what it says, as rows { h, draw(x, y) } for a column w wide
  const say = (s, color, o = {}) => ({ h: o.h || 12, draw: (x, y) => drawText(ctx, s, x, y, { color, scale: o.scale || 1 }) });
  const space = (h) => ({ h });
  const head = (s, w) => ({ h: 15, draw: (x, y) => { drawText(ctx, s, x, y, { color: '#8a5234' }); ctx.fillStyle = '#e0cba4'; ctx.fillRect(x + measure(s) + 5, y + 4, Math.max(0, w - measure(s) - 5), 1); } });
  const chapter = (w) => [
    say(t('Chapter {n}', { n: C.ch.n }), '#8a5234'),
    ...wrap(String(C.ch.title || ''), w, 2).map((l) => say(l, INK, { h: 21, scale: 2 })),
    ...(C.ch.recap ? [space(2), ...wrap(String(C.ch.recap), w).map((l) => say(l, '#5a4a5a'))] : []),
  ];
  // a quest in three parts: its name, why (its brief), its steps — done ✓ dimmed, the one under
  // way bright on its band, how many are to come
  const name = (s, w) => {
    // (a side quest opened: the title bar says what it is)
    const R = open ? [space(2)] : [say(s.side ? t('Side quest') : t('Main quest'), '#8a5234')], mark = s.side ? '♥' : '★', mc = s.side ? '#ec5f73' : '#e0a526';
    wrap(s.title, w - 18, 2).forEach((l, i) => R.push({ h: 21, draw: (x, y) => { if (!i) drawText(ctx, mark, x, y, { color: mc, scale: 2 }); drawText(ctx, l, x + 18, y, { color: INK, scale: 2 }); } }));
    return R;
  };
  const why = (s, w) => (s.brief ? wrap(s.brief, w).map((l) => say(l, BRIEF)) : []);
  const steps = (s, w, done) => questRows(s, w - 6, { done, brief: false, where: false }).map((r) => ({ h: 12 + r.gap, draw: (x, y) => {
    if (r.now) { ctx.fillStyle = '#fff3c4'; ctx.fillRect(x, y + r.gap - 2, w, 12); ctx.fillStyle = '#e0a526'; ctx.fillRect(x, y + r.gap - 2, 2, 12); }
    if (r.mark) drawText(ctx, r.mark, x + 5, y + r.gap, { color: r.mc });
    drawText(ctx, r.text, x + 4 + r.x, y + r.gap, { color: r.color });
  } }));
  const others = (w) => {
    const R = [];
    if (C.sides.length) R.push(space(10), head(t('Side quests'), w));
    for (const s of C.sides) {
      const L = wrapTail(s.now, s.tail, w - 30, 2), h = 17 + L.length * 11, id = 'qs' + s.id, mc = s.side ? '#ec5f73' : '#e0a526';
      R.push({ h: h + 4, draw: (x, y) => {
        ctx.fillStyle = S.pressing === id ? '#e6d2ac' : UI.paperShade; ctx.fillRect(x, y, w, h);
        ctx.fillStyle = mc; ctx.fillRect(x, y, 2, h);
        drawText(ctx, s.side ? '♥' : '★', x + 6, y + 4, { color: mc });
        drawText(ctx, fitRich(s.title, w - 32), x + 16, y + 4, { color: INK });
        L.forEach((l, i) => drawText(ctx, l, x + 16, y + 15 + i * 11, { color: '#7a6060' }));
        drawText(ctx, '▸', x + w - 9, y + Math.round(h / 2) - 4, { color: '#8a5234' });
        tapArea(id, x, y, w, h, () => openQuest(s.id));
      } });
    }
    // who has a quest to give, and the way to them
    if (C.offers.length) R.push(space(C.sides.length ? 6 : 10));
    for (const o of C.offers) {
      const L = wrap(t('{name} has something for you', { name: String(o.name || '') }), w - 22), sub = whereText(o, true);
      const label = o.go === 2 ? t('Stop guiding') : t('Go there'), gw = measure(label) + 12, beside = !o.go || measure(sub) + gw + 28 <= w;
      const h = 8 + L.length * 11 + (o.go && !beside ? 31 : o.go ? 19 : sub ? 11 : 0);
      R.push({ h: h + 4, draw: (x, y) => {
        ctx.fillStyle = UI.paperShade; ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#e0a526'; ctx.fillRect(x, y, 2, h);
        drawText(ctx, '!', x + 8, y + 4, { color: '#e0a526' });
        L.forEach((l, i) => drawText(ctx, l, x + 16, y + 4 + i * 11, { color: INK }));
        const yy = y + 4 + L.length * 11;
        drawText(ctx, fitRich(sub, w - 22 - (o.go && beside ? gw + 6 : 0)), x + 16, yy + (o.go && beside ? 5 : 0), { color: '#7a6060' });
        if (o.go) pill(beside ? x + w - gw - 4 : x + 16, beside ? yy + 1 : yy + 13, gw, 16, label, 'qo' + o.who, () => questGuide({ who: o.who }, o), { color: o.go === 2 ? '#a8483a' : '#4f955a' });
      } });
    }
    return R;
  };
  // upright: the chapter, the quest (its name, why, its steps), the others. On its side, two
  // columns: what to do on the left (the quest’s name and its steps: the one under way shows
  // without scrolling), why on the right (its brief, then the chapter and the others)
  const cols = land && q ? 2 : 1, gap = 16, cw = Math.floor((bw - (cols - 1) * gap) / cols);
  const rule = (w) => [space(6), { h: 8, draw: (x, y) => { ctx.fillStyle = '#e0cba4'; ctx.fillRect(x, y, w, 1); } }];
  const none = q ? [] : [space(8), ...wrap(t('No quests yet. Explore and talk to people!'), cw).map((l) => say(l, UI.inkSoft))];
  const rest = open ? [] : [...chapter(cw), ...others(cw)];
  const columns = cols === 2 ? [[...name(q, cw), space(5), ...steps(q, cw, 2)], [...why(q, cw), ...(q.brief && rest.length ? rule(cw) : []), ...rest]]
    : open ? [[...name(open, cw), space(2), ...why(open, cw), space(6), ...steps(open, cw, 6)]]
      : [[...chapter(cw), ...none, ...(q ? [...rule(cw), ...name(q, cw), space(2), ...why(q, cw), space(6), ...steps(q, cw, 6)] : []), ...others(cw)]];
  // it scrolls: a finger drags it (and it glides on), the arrow pages — each column as far as
  // it is long (one that fits stays put)
  const tails = columns.map((R) => { const h = R.reduce((a, r) => a + r.h, 0); return h > bh ? h + 22 - bh : 0; });
  const max = Math.max(...tails), tall = max + bh - 22;
  const dt = Math.min(0.05, Math.max(0, S.t - (S.qT ?? S.t)));
  S.qT = S.t;
  if (![...pointers.values()].some((p) => p.kind === 'scroll')) {
    if (S.qto != null) { S.qscroll += (S.qto - S.qscroll) * Math.min(1, dt * 14); if (Math.abs(S.qto - S.qscroll) < 0.6) { S.qscroll = S.qto; S.qto = null; } }
    else if (Math.abs(S.qvel) > 6) { S.qscroll += S.qvel * dt; S.qvel *= Math.pow(0.03, dt); } else S.qvel = 0;
  }
  S.qscroll = Math.max(0, Math.min(max, S.qscroll));
  scroller = { y: by, h: bh, max };
  const r0 = regions.length;
  ctx.save();
  ctx.beginPath(); ctx.rect(px + 3, by, pw - 6, bh); ctx.clip();
  columns.forEach((R, c) => {
    let y = by - Math.round(Math.min(S.qscroll, tails[c]));
    for (const r of R) { if (r.draw && y + r.h > by && y < by + bh) r.draw(bx + c * (cw + gap), y); y += r.h; }
  });
  ctx.restore();
  // (what can be tapped in it stays inside it)
  for (let i = regions.length - 1; i >= r0; i--) {
    const r = regions[i], y0 = Math.max(r.y, by), y1 = Math.min(r.y + r.h, by + bh);
    if (y1 - y0 < 6) regions.splice(i, 1); else { r.y = y0; r.h = y1 - y0; }
  }
  if (max > 0) {
    const more = S.qscroll < max - 1, th = Math.max(12, Math.round((bh * bh) / (tall + 22)));
    ctx.fillStyle = '#e8d6b4'; ctx.fillRect(px + pw - 6, by, 2, bh);
    ctx.fillStyle = '#b08a5a'; ctx.fillRect(px + pw - 6, by + Math.round(((bh - th) * S.qscroll) / max), 2, th);
    if (more) for (let k = 0; k < 10; k++) { ctx.fillStyle = `rgba(251,241,220,${(k + 1) / 11})`; ctx.fillRect(px + 3, by + bh - 10 + k, pw - 10, 1); }
    pill(px + pw - 34, by + bh - 21, 24, 18, more ? '↓' : '↑', 'qpage', () => { S.qvel = 0; S.qto = more ? Math.min(max, S.qscroll + Math.round(bh * 0.7)) : 0; });
  }
  // the foot: where the step is, the guide
  if (fh) {
    const fy = py + ph - 6 - fh, act = () => questGuide({ q: q.id }, wh), dir = wh.dir >= 0 ? 11 : 0;
    ctx.fillStyle = '#e0cba4'; ctx.fillRect(px + 8, fy + 2, pw - 16, 1);
    if (land) {
      const gw = can ? Math.min(180, Math.round(bw * 0.45)) : 0, s = fitRich(where, bw - gw - dir - 10);
      if (dir) dirArrow(bx, fy + 15, wh.dir, '#8a5234');
      drawText(ctx, s, bx + dir, fy + 14, { color: '#8a5234' });
      if (can) goButton(bx + bw - gw, fy + 7, gw, 24, on, act);
    } else {
      const s = fitRich(where, bw - dir), x0 = Math.round(W / 2 - (measure(s) + dir) / 2);
      if (where && dir) dirArrow(x0, fy + 8, wh.dir, '#8a5234');
      if (where) drawText(ctx, s, x0 + dir, fy + 7, { color: '#8a5234' });
      if (can) goButton(bx, fy + (where ? 21 : 7), bw, 26, on, act);
    }
  }
}

// ------------------------------------------------------------------ the chat (every mode)
// A speech-bubble button opens this sheet: a line typed on the phone's own keyboard (80
// characters), the quick phrases (twelve a page, three pages: each screen reads them in its own
// language), the emotes, and the log with what you said lately. While it's open a « … » floats
// over your hero; sending closes it. (src/ui/chat.js on the big screen: the same rules.)
function openChat() { S.menu = 'chat'; S.chatNew = false; if (!S.chatOpen) { S.chatOpen = true; send({ t: 'typing', on: 1 }); } buzz(8); }
function closeChat() {
  if (S.chatOpen) { S.chatOpen = false; send({ t: 'typing', on: 0 }); try { chatIn.blur(); } catch (e) { /* gone */ } }
  placeField(chatIn, null);
}
function sayTyped() {
  const text = clean(chatIn.value);
  if (!text) return;
  send({ t: 'say', text });
  if (!emojiOnly(text)) { S.said = [text, ...S.said.filter((x) => x !== text)].slice(0, 4); store.set('said', S.said); }
  chatIn.value = '';
  S.menu = false; closeChat(); buzz(10);
}
function sayQuick(id) { send({ t: 'quick', id }); S.menu = false; closeChat(); buzz(10); }
function sayEmote(e) { send({ t: 'emote', e }); S.menu = false; closeChat(); buzz([8, 30, 8]); }
function chatLineText(l) { return l.q ? (QUICK_BY[l.q] ? t(QUICK_BY[l.q].text) : '') : l.e ? '* ' + (EMOTE_BY[l.e] ? t(EMOTE_BY[l.e].label) : '') + ' *' : String(l.text || ''); }

function drawChat() {
  ctx.fillStyle = 'rgba(15,10,22,0.7)'; ctx.fillRect(0, 0, W, H);
  regions.push({ kind: 'tap', id: 'scrim', x: 0, y: 0, w: W, h: H, fn: () => {} });
  const land = W > H, px = 4, py = 4, pw = W - 8, ph = H - 8;
  panel(ctx, px, py, pw, ph);
  tapArea('chatpanel', px, py, pw, ph, () => {});
  drawText(ctx, t('Chat'), px + 10, py + 8, { color: INK });
  iconBtn(px + pw - 24, py + 4, 18, 16, 'close', 'close', () => { S.menu = false; closeChat(); }, { color: '#a8483a' });
  // your line & Send
  const fy = py + 24, fh = 18, sw = Math.max(40, measure(t('Send')) + 14);
  placeField(chatIn, { x: px + 8, y: fy, w: pw - 16 - sw - 4, h: fh });
  pill(px + pw - 8 - sw, fy + 2, sw, 14, t('Send'), 'csend', sayTyped, { color: '#4f955a' });
  let y = fy + fh + 4;
  if (S.chatNote && S.t < S.chatNote.until) { drawText(ctx, fitText(S.chatNote.text, pw - 16), px + pw / 2, y, { color: '#c8454f', align: 'center' }); y += 11; }
  // the pages: three of phrases, the emotes, the log (on a narrow phone, two rows of tabs)
  const tabs = [...QUICK_PAGES.map((q) => t(q)), t('Emotes'), t('Log')], wide = !land && pw < 300 ? [3, 2] : [5];
  let ti = 0;
  for (const n of wide) {
    const tw = Math.floor((pw - 16 - (n - 1) * 3) / n);
    for (let k = 0; k < n; k++, ti++) { const i = ti; pill(px + 8 + k * (tw + 3), y, tw, 14, fitText(tabs[i], tw - 4), 'ctab' + i, () => { S.chatTab = i; S.chatScroll = 0; }, { color: S.chatTab === i ? '#e0a526' : '#8e5d3e', hot: S.chatTab === i }); }
    y += 18;
  }
  y += 2;
  const top = y, bottom = py + ph - 8, room = bottom - top;
  if (S.chatTab < 3) {
    const list = QUICK.filter((q) => q.page === S.chatTab), cols = land ? 3 : 2, rows = Math.ceil(list.length / cols);
    const cw = Math.floor((pw - 16 - (cols - 1) * 4) / cols), rh = Math.max(16, Math.min(34, Math.floor((room + 4) / rows) - 4));
    list.forEach((q, i) => {
      const x = px + 8 + (i % cols) * (cw + 4), yy = top + Math.floor(i / cols) * (rh + 4), text = t(q.text);
      // (a long phrase on two lines when the button is tall enough)
      const two = rh >= 24 && measure(text) > cw - 8 ? wrap(text, cw - 8).slice(0, 2) : null;
      pill(x, yy, cw, rh, two ? '' : fitText(text, cw - 8), 'cq' + q.id, () => sayQuick(q.id), { color: ['#5a7ab8', '#4f8a5a', '#9a6a3a'][S.chatTab] });
      if (two) two.forEach((l, k) => drawText(ctx, fitText(l, cw - 8), x + cw / 2, yy + Math.round(rh / 2) - 9 + k * 10 + (S.pressing === 'cq' + q.id ? 1 : 0), { color: '#fff7e6', align: 'center' }));
    });
  } else if (S.chatTab === 3) {
    const cols = land ? 6 : 4, rows = Math.ceil(EMOTES.length / cols);
    const cw = Math.floor((pw - 16) / cols), rh = Math.max(34, Math.min(58, Math.floor(room / rows)));
    EMOTES.forEach((m, i) => {
      const x = px + 8 + (i % cols) * cw, yy = top + Math.floor(i / cols) * rh, down = S.pressing === 'ce' + m.e;
      ctx.fillStyle = down ? '#e8d6b4' : '#f3e3c3'; ctx.fillRect(x + 2, yy, cw - 4, rh - 4);
      emoteGlyph(ctx, x + cw / 2, yy + Math.round((rh - 16) / 2), m.icon, rh >= 44 ? 3 : 2);
      drawText(ctx, fitText(t(m.label), cw - 6), x + cw / 2, yy + rh - 15, { color: INK, align: 'center' });
      tapArea('ce' + m.e, x + 2, yy, cw - 4, rh - 4, () => sayEmote(m.e));
    });
  } else {
    // what you said lately (tap: again), then the log, newest at the bottom
    let yy = top;
    if (S.said.length) {
      drawText(ctx, t('Say again:'), px + 10, yy + 1, { color: '#8a5234' });
      yy += 11;
      for (const text of S.said.slice(0, 3)) { pill(px + 8, yy, pw - 16, 14, fitText(text, pw - 24), 'cs' + text, () => { chatIn.value = text; sayTyped(); }, { color: '#8e7a9a' }); yy += 17; }
      yy += 3;
    }
    const rows = [];
    for (const l of S.chat) {
      const name = String(l.n || '') + ': ', nw = measure(name);
      wrap(chatLineText(l), Math.max(40, pw - 20 - nw)).forEach((line, k) => rows.push({ name: k ? '' : name, c: l.c, nw, line }));
    }
    const fit = Math.max(0, Math.floor((bottom - yy) / 10)), shown = rows.slice(-fit);
    if (!rows.length) drawText(ctx, t('Nobody has said anything yet.'), px + pw / 2, yy + 8, { color: '#8a7a6a', align: 'center' });
    shown.forEach((r, i) => {
      if (r.name) drawText(ctx, r.name, px + 10, yy + i * 10, { color: typeof r.c === 'string' && /^#[0-9a-f]{3,8}$/i.test(r.c) ? shade(r.c, -0.25) : INK });
      drawText(ctx, r.line, px + 10 + r.nw, yy + i * 10, { color: INK });
    });
  }
}

// ------------------------------------------------------------------ the world map (on the phone)
// drawn right here (padmap.js) from what the big screen sends: pinch, drag, tap
function mapBox() { return { x: 4, y: 24, w: W - 8, h: H - 24 - 28 }; }
function openMap() { S.menu = 'map'; S.mapAskT = 0; PM.recenter = true; PM.tip = null; PM.legend = false; }
function drawMapScreen() {
  ctx.fillStyle = '#1c1428'; ctx.fillRect(0, 0, W, H);
  regions.push({ kind: 'tap', id: 'scrim', x: 0, y: 0, w: W, h: H, fn: () => {} });
  const B = mapBox();
  if (S.t >= (S.mapAskT || 0)) { S.mapAskT = S.t + 1; send({ t: 'mapReq', v: 2, base: PM.v }); }
  const dt = Math.min(0.05, Math.max(0, S.t - (S.mapT ?? S.t)));
  S.mapT = S.t;
  // the title: the land you're in; ✕
  ctx.fillStyle = '#20172a'; ctx.fillRect(0, 0, W, 22);
  drawGlyph(ctx, 'map', 3, 3, 1);
  drawText(ctx, fitText(PM.here() || t('World map'), W - 50), 22, 7, { color: '#fff7e6' });
  iconBtn(W - 24, 2, 20, 18, 'close', 'mapdone', () => { S.menu = false; }, { color: '#a8483a' });
  ctx.fillStyle = '#3b2a22'; ctx.fillRect(B.x - 1, B.y - 1, B.w + 2, B.h + 2);
  if (PM.ready()) {
    PM.update(dt, B);
    PM.draw(ctx, B, S.t);
    regions.push({ kind: 'map', id: 'map', x: B.x, y: B.y, w: B.w, h: B.h });
    if (PM.legend && PM.legendBox) { const L = PM.legendBox; tapArea('mapkeybox', L.x, L.y, L.w, L.h, () => { PM.legend = false; }); }
    // (a place's « go there »: the way there, an arrow at your hero's feet — or « stop »)
    const G = PM.goBox;
    if (G) tapArea('mapgo', G.x, G.y, G.w, G.h, () => { send({ t: 'goto', x: G.h0.wx, z: G.h0.wz, stop: G.stop ? 1 : 0 }); PM.tip = null; buzz(G.stop ? 10 : [12, 30, 12]); });
  } else {
    ctx.fillStyle = '#241a30'; ctx.fillRect(B.x, B.y, B.w, B.h);
    drawText(ctx, t('Unfolding the map…'), W / 2, B.y + B.h / 2 - 4, { color: '#e8dcf2', align: 'center' });
  }
  // the tools: the whole world, zoom out & in, back to you, the legend
  const tools = [['globe', 'mapw', () => PM.world(B)], ['minus', 'mapout', () => PM.step(B, -1)], ['plus', 'mapin', () => PM.step(B, 1)], ['crosshair', 'mapme', () => PM.centreMe(B)], ['info', 'mapkey', () => { PM.legend = !PM.legend; }]];
  const gap = 4, bw = Math.min(44, Math.floor((W - 8 - gap * (tools.length - 1)) / tools.length)), x0 = Math.round((W - (bw * tools.length + gap * (tools.length - 1))) / 2);
  tools.forEach(([g, id, fn], i) => iconBtn(x0 + i * (bw + gap), H - 24, bw, 20, g, id, () => { if (PM.ready()) { fn(); buzz(6); } }, { color: id === 'mapkey' && PM.legend ? '#b8862a' : '#5a4a70' }));
}

// ------------------------------------------------------------------ the host's crown & menu
function hostPill(x, w = 20, h = 18, y = 1) { iconBtn(x, y, w, h, 'crown', 'hostpill', () => { S.menu = S.menu === 'host' ? false : 'host'; S.hconfirm = null; }, { color: '#d8962a' }); }

// the camera zoom as the host menu last described it
function zoomItem() {
  for (const tb of (S.hmenu && S.hmenu.tabs) || []) for (const it of tb.items) if (it.id === 'zoom') return it;
  return null;
}

// a chunky + or − (the pixel font's are tiny, and it has no minus sign)
function plusMinus(cx, cy, plus, id) {
  const x = Math.round(cx), y = Math.round(cy) + (S.pressing === id ? 1 : 0);
  ctx.fillStyle = '#3b2a22'; ctx.fillRect(x - 4, y, 9, 2);
  ctx.fillStyle = '#fff7e6'; ctx.fillRect(x - 4, y - 1, 9, 2);
  if (plus) { ctx.fillStyle = '#3b2a22'; ctx.fillRect(x, y - 4, 2, 9); ctx.fillStyle = '#fff7e6'; ctx.fillRect(x - 1, y - 5, 2, 9); ctx.fillRect(x - 4, y - 1, 9, 2); }
}

function magnifier(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x + 1, y, 3, 1); ctx.fillRect(x + 1, y + 4, 3, 1); ctx.fillRect(x, y + 1, 1, 3); ctx.fillRect(x + 4, y + 1, 1, 3);
  ctx.fillRect(x + 4, y + 4, 1, 1); ctx.fillRect(x + 5, y + 5, 1, 1); ctx.fillRect(x + 6, y + 6, 1, 1);
}

// − ▮▮▮▮ + Auto: the camera zoom in one row, centred on cx (under the card, or in the header)
function zoomBar(cx, y, h) {
  const it = zoomItem();
  if (!it) return;
  const [cur, n] = it.bar || [0, 1];
  const flash = () => { S.zoomFlashT = S.t + 1.8; };
  const zin = () => { hostSend('zoom', 1); flash(); };
  const zout = () => { hostSend('zoom', -1); flash(); };
  const zauto = () => { hostSend('zauto'); flash(); };
  const autoCol = it.auto ? '#4f955a' : '#6a5a7a';
  const bw = h + 10, gap = 3, tw = n * 5, aw = Math.max(34, measure(t('Auto')) + 12), total = 11 + bw + gap + tw + gap + bw + gap + aw;
  const x0 = Math.round(cx - total / 2);
  ctx.fillStyle = 'rgba(15,10,22,0.5)'; ctx.fillRect(x0 - 4, y - 2, total + 8, h + 4);
  magnifier(x0, y + Math.round(h / 2) - 3, '#f6d38f');
  pill(x0 + 11, y, bw, h, '', 'zout', zout);
  plusMinus(x0 + 11 + bw / 2, y + h / 2, false, 'zout');
  const tx = x0 + 11 + bw + gap;
  for (let j = 0; j < n; j++) { ctx.fillStyle = j === cur ? '#f6c65b' : j < cur ? '#8e7a9a' : '#4a3d58'; ctx.fillRect(tx + j * 5, y + 3, 4, h - 6); }
  pill(tx + tw + gap, y, bw, h, '', 'zin', zin);
  plusMinus(tx + tw + gap + bw / 2, y + h / 2, true, 'zin');
  pill(tx + tw + gap + bw + gap, y, aw, h, t('Auto'), 'zauto', zauto, { color: autoCol });
  if (S.t < (S.zoomFlashT || 0)) {
    const txt = it.value, w2 = measure(txt) + 8;
    ctx.fillStyle = 'rgba(20,14,28,0.85)'; ctx.fillRect(Math.round(cx - w2 / 2), y + h + 3, w2, 12);
    drawText(ctx, txt, cx, y + h + 5, { color: '#fff3c4', align: 'center' });
  }
}

// ------------------------------------------------------------------ inviting friends
// (any phone: the lobby's envelope, the menu's Invite tile, the host menu's Invite tab)
function openInvite() { S.menu = 'invite'; }
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch (e) { /* below */ }
  try { const a = document.createElement('textarea'); a.value = text; a.style.position = 'fixed'; a.style.opacity = '0'; document.body.append(a); a.select(); const ok = document.execCommand('copy'); a.remove(); return ok; } catch (e) { return false; }
}
// the phone's own share sheet (messages, mail…), else the clipboard
function shareLink(url, id) {
  const note = (text) => { S.shareNote = { id, text, until: S.t + 2.6 }; };
  buzz(12);
  if (navigator.share) navigator.share({ title: 'Hearthlight', text: t('Come and play Hearthlight with us!'), url }).then(() => note(t('Sent!'))).catch(() => {});
  else copyText(url).then((ok) => note(ok ? t('Link copied') : t('Couldn’t copy the link')));
}
function drawInvite() {
  ctx.fillStyle = 'rgba(15,10,22,0.8)'; ctx.fillRect(0, 0, W, H);
  regions.push({ kind: 'tap', id: 'iscrim', x: 0, y: 0, w: W, h: H, fn: () => {} });
  const px = 6, pw = W - 12, py = 6, ph = H - 12;
  panel(ctx, px, py, pw, ph);
  drawGlyph(ctx, 'invite', px + 6, py + 4, 1);
  drawText(ctx, fitText(t('Invite friends'), pw - 60), px + 26, py + 8, { color: '#8a5234' });
  iconBtn(px + pw - 28, py + 3, 24, 20, 'close', 'idone', () => { S.menu = false; }, { color: '#a8483a' });
  drawInviteBody(px + 6, py + 28, pw - 12, ph - 34);
}
function drawInviteBody(x, y, w, h) {
  const I = S.invite;
  if (!I || !I.link) { drawText(ctx, t('Opening the room…'), x + w / 2, y + 30, { color: UI.inkSoft, align: 'center' }); return; }
  const land = w > h * 1.3;
  ctx.fillStyle = UI.paperShade; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#4f955a'; ctx.fillRect(x, y, 3, h);
  // what it does: one link, everyone picks
  const say = I.home ? t('Send it, or let a friend scan this screen: each one picks — at the big screen (their phone as a controller) or at home (the game on their own screen).')
    : t('Let a friend scan this screen: their phone becomes a controller.');
  const tw = land ? Math.floor(w * 0.5) - 14 : w - 14, lines = wrap(say, tw).slice(0, land ? 9 : 5);
  drawText(ctx, fitText(t('One link for everyone'), tw), x + 8, y + 5, { color: INK });
  lines.forEach((l, i) => drawText(ctx, l, x + 8, y + 17 + i * 10, { color: '#5a4a5a' }));
  const btnY = y + h - 24, codeY = btnY - 22;
  // the QR code (portrait: under the words; landscape: on the right)
  const q = S.inviteQr;
  if (q) {
    const qx0 = land ? x + Math.floor(w * 0.5) : x, qw = land ? Math.floor(w * 0.5) : w, qTop = land ? y + 6 : y + 21 + lines.length * 10;
    const room = Math.min(qw - 16, (land ? btnY - 4 : codeY - 6) - qTop), m = Math.max(1, Math.floor(room / q.width)), qs = q.width * m;
    const qx = qx0 + Math.round((qw - qs) / 2), qy = qTop + Math.max(0, Math.round(((land ? btnY - 4 : codeY - 6) - qTop - qs) / 2));
    ctx.fillStyle = '#8e5d3e'; ctx.fillRect(qx - 2, qy - 2, qs + 4, qs + 4);
    ctx.imageSmoothingEnabled = false; ctx.drawImage(q, qx, qy, qs, qs);
  }
  if (I.code && !land) {
    const lw = measure(t('code')) + 4, cw2 = measure(I.code, 2), c0 = x + Math.round((w - lw - cw2) / 2);
    drawText(ctx, t('code'), c0, codeY + 5, { color: UI.inkSoft });
    drawText(ctx, I.code, c0 + lw, codeY, { color: INK, scale: 2 });
  }
  const bw = land ? Math.floor(w * 0.5) - 16 : w - 16;
  pill(x + 8, btnY, bw, 20, t('Send the invitation'), 'ilink', () => shareLink(I.link, 'link'), { color: '#4f955a' });
  if (S.shareNote && S.shareNote.id === 'link' && S.t < S.shareNote.until) drawText(ctx, fitText(S.shareNote.text, bw), x + 8 + bw / 2, btnY - 11, { color: '#3f8a4a', align: 'center' });
}

function drawPausedCard() {
  ctx.fillStyle = 'rgba(15,10,22,0.55)'; ctx.fillRect(0, 20, W, H - 20);
  const pw = Math.min(W - 24, 200), ph = 50, px = Math.round((W - pw) / 2), py = Math.round(H * 0.4);
  panel(ctx, px, py, pw, ph);
  drawText(ctx, t('Paused'), W / 2, py + 9, { color: '#8a5234', align: 'center', scale: 2 });
  drawText(ctx, fitText(t('{name} paused the game', { name: S.paused.by || '' }), pw - 12), W / 2, py + 30, { color: INK, align: 'center' });
}

function drawHostMenu() {
  const M = S.hmenu;
  ctx.fillStyle = 'rgba(15,10,22,0.78)'; ctx.fillRect(0, 0, W, H);
  regions.push({ kind: 'tap', id: 'hscrim', x: 0, y: 0, w: W, h: H, fn: () => {} });
  const px = 6, pw = W - 12, py = 22, ph = H - 28;
  panel(ctx, px, py, pw, ph);
  drawGlyph(ctx, 'crown', px + 6, py + 4, 1);
  drawText(ctx, fitText(M ? M.title : t('Host menu'), pw - 56), px + 25, py + 8, { color: '#8a5234' });
  iconBtn(px + pw - 26, py + 4, 20, 18, 'close', 'hdone', () => { S.menu = false; }, { color: '#a8483a' });
  if (!M) { drawText(ctx, t('Waiting for the big screen…'), W / 2, py + 60, { color: UI.inkSoft, align: 'center' }); return; }
  // tabs: a picture each; the chosen one's name under them
  const tabs = M.tabs;
  S.htab = Math.max(0, Math.min(tabs.length - 1, S.htab));
  const tw = Math.floor((pw - 12) / tabs.length), ty = py + 26;
  tabs.forEach((tb, i) => {
    const x = px + 6 + i * tw, on = i === S.htab;
    ctx.fillStyle = on ? '#fbf1dc' : '#e8d6b4'; ctx.fillRect(x + 1, ty, tw - 2, 22);
    ctx.fillStyle = on ? '#e0a526' : '#c9a77c'; ctx.fillRect(x + 1, ty, tw - 2, 2);
    drawGlyph(ctx, HOST_TAB_GLYPH[tb.id] || 'star', x + Math.round((tw - 16) / 2), ty + 4, 1);
    if (!on) { ctx.fillStyle = 'rgba(232,214,180,0.4)'; ctx.fillRect(x + 1, ty + 2, tw - 2, 20); }
    tapArea('htab' + i, x, ty - 4, tw, 30, () => { S.htab = i; S.hscroll = 0; S.hconfirm = null; });
  });
  drawText(ctx, tabs[S.htab].label, px + pw / 2, ty + 26, { color: INK, align: 'center' });
  // (the Invite tab: the invitations page itself)
  if (tabs[S.htab].id === 'invite') { drawInviteBody(px + 6, ty + 38, pw - 12, py + ph - ty - 44); return; }
  // rows, each as tall as its words (a second line wraps instead of being cut short)
  const items = tabs[S.htab].items, rw = pw - 12;
  const top = ty + 38, bottom = py + ph - 6;
  const hOf = (it) => (it.kind === 'button' ? (it.sub ? 14 + Math.min(2, wrap(it.sub, rw - 12).length) * 10 : 22) : it.kind === 'choice' ? 22 : 24) + 3;
  if (S.hconfirm && S.t > S.hconfirmT) S.hconfirm = null;
  S.hscroll = Math.max(0, Math.min(items.length - 1, S.hscroll || 0));
  let y = top, i = S.hscroll;
  const more = () => items.slice(i).reduce((a, it) => a + hOf(it), 0) > bottom - y;
  const needArrows = S.hscroll > 0 || more();
  const limit = needArrows ? bottom - 20 : bottom;
  while (i < items.length && y + hOf(items[i]) <= limit) { hostRow(items[i], px + 6, y, rw, hOf(items[i]) - 3); y += hOf(items[i]); i++; }
  if (needArrows) {
    const half = Math.floor((pw - 16) / 2), shown = i - S.hscroll;
    if (S.hscroll > 0) pill(px + 6, bottom - 17, half, 16, '↑', 'hup', () => { S.hscroll = Math.max(0, S.hscroll - Math.max(1, shown)); });
    if (i < items.length) pill(px + 10 + half, bottom - 17, half, 16, '↓', 'hdown', () => { S.hscroll = i; });
  }
}
const HOST_TAB_GLYPH = { game: 'flag', invite: 'invite', travel: 'waystone', camera: 'camera', options: 'cog', players: 'people' };

function hostSend(id, dir = 0) { send({ t: 'hact', id, dir }); buzz(12); }

// one row of the host menu: a button, a ◂ value ▸ choice, or a player
function hostRow(it, x, y, w, h) {
  const confirming = S.hconfirm === it.id;
  const press = () => {
    if (it.confirm && !confirming) { S.hconfirm = it.id; S.hconfirmT = S.t + 3; buzz(20); return; }
    S.hconfirm = null;
    hostSend(it.id);
  };
  if (it.kind === 'button') {
    const color = it.danger ? '#a8483a' : it.hot ? '#4f955a' : it.color ? shade(it.color, -0.25) : '#8e5d3e';
    const two = it.sub && h >= 22 && !confirming;       // softer lines under it (where to, what it does)
    pill(x, y, w, h, confirming ? t('Tap again to confirm') : two ? '' : fitText(it.label, w - 10), 'h:' + it.id, press, { color: confirming ? '#c8454f' : color });
    if (two) {
      const dy = S.pressing === 'h:' + it.id ? 1 : 0, sl = wrap(it.sub, w - 12).slice(0, 2);
      if (wrap(it.sub, w - 12).length > 2) sl[1] = fitText(sl[1] + '…', w - 12);
      drawText(ctx, fitText(it.label, w - 10), x + w / 2, y + dy + 3, { color: '#fff7e6', align: 'center' });
      sl.forEach((l, k) => drawText(ctx, l, x + w / 2, y + dy + 13 + k * 10, { color: '#e8d6b4', align: 'center' }));
    }
    return;
  }
  ctx.fillStyle = '#f3e3c3'; ctx.fillRect(x, y, w, h);
  if (it.kind === 'choice') {
    const aw = 20;
    drawText(ctx, fitText(it.label, w * 0.4), x + 5, y + Math.round(h / 2) - 4, { color: UI.inkSoft });
    const vx = x + Math.round(w * 0.42), vw = x + w - vx;
    arrowBtn(vx, y + 1, aw, h - 2, -1, 'hl' + it.id, () => hostSend(it.id, -1));
    arrowBtn(x + w - aw, y + 1, aw, h - 2, 1, 'hr' + it.id, () => hostSend(it.id, 1));
    const mx = vx + aw + 2, mw = vw - aw * 2 - 4;
    drawText(ctx, fitText(it.value, mw - 4), mx + mw / 2, y + Math.round(h / 2) - 5, { color: INK, align: 'center' });
    if (it.bar) {
      const [cur, n] = it.bar, bw = Math.min(5, Math.floor((mw - 4) / n)), bx = Math.round(mx + mw / 2 - (n * bw) / 2);
      for (let j = 0; j < n; j++) { ctx.fillStyle = j === cur ? '#e0a526' : j < cur ? '#c9a77c' : '#e8d6b4'; ctx.fillRect(bx + j * bw, y + h - 5, bw - 1, 3); }
    }
    return;
  }
  // a player
  ctx.fillStyle = '#3b2a22'; ctx.fillRect(x + 4, y + Math.round(h / 2) - 5, 10, 10);
  ctx.fillStyle = it.color; ctx.fillRect(x + 5, y + Math.round(h / 2) - 4, 8, 8);
  drawText(ctx, fitText(it.label + (it.host ? ' ♛' : ''), w * 0.45), x + 18, y + 2, { color: it.away ? '#8a7a98' : INK });
  drawText(ctx, fitText(it.sub, w * 0.45), x + 18, y + 11, { color: it.away ? '#a8483a' : UI.inkSoft });
  if (it.action) {
    const bw = Math.min(Math.round(w * 0.46), measure(confirming ? t('Tap again') : it.action) + 14);
    pill(x + w - bw - 2, y + 2, bw, h - 4, confirming ? t('Tap again') : it.action, 'h:' + it.id, press, { color: confirming ? '#c8454f' : it.away || it.label === '' ? '#a8483a' : '#b8862a' });
  }
}

function hpBar(x, y, w, pct) {
  ctx.fillStyle = '#3b2a22'; ctx.fillRect(x, y, w, 6);
  ctx.fillStyle = '#5a3a4a'; ctx.fillRect(x + 1, y + 1, w - 2, 4);
  ctx.fillStyle = pct > 50 ? '#6fd66a' : pct > 25 ? '#f2c14e' : '#ff5a6a';
  ctx.fillRect(x + 1, y + 1, Math.round((w - 2) * pct / 100), 4);
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x + 1, y + 1, Math.round((w - 2) * pct / 100), 1);
}

function bigButton(cx, cy, r, letter, label, color, id, cd = 0, side = 'top', icon = null, lit = false) {
  const down = held[id];
  if (!label && !lit && S.phase !== 'lobby') color = '#8a7a98';
  const y = cy + (down ? 2 : 0);
  disc(cx, cy + 3, r, 'rgba(10,6,16,0.55)');
  disc(cx, y, r, '#3b2a22');
  disc(cx, y, r - 1, shade(color, -0.3));
  if (icon) {
    // an illustrated move: its icon in a ring of the button's colour, darkened from
    // the top while it recharges, and the button's letter in a little badge
    disc(cx, y, r - 1, down ? shade(color, -0.12) : color);
    const ir = r - 4;
    ctx.drawImage(roundIcon(icon, ir, ir >= 31 ? 3 : ir >= 16 ? 2 : 1), cx - ir, y - ir);
    if (cd > 0) {
      const h = Math.round((ir * 2 + 1) * Math.min(1, cd / 100));
      ctx.save();
      ctx.beginPath(); ctx.rect(cx - ir, y - ir, ir * 2 + 1, h); ctx.clip();
      disc(cx, y, ir, 'rgba(16,10,24,0.7)');
      ctx.restore();
      ctx.save();
      ctx.beginPath(); ctx.rect(cx - ir, y - ir + h, ir * 2 + 1, 1); ctx.clip();
      disc(cx, y, ir, 'rgba(255,243,196,0.75)');
      ctx.restore();
    }
    if (down) disc(cx, y, ir, 'rgba(255,255,255,0.14)');
    const bx = cx + Math.round(r * 0.66), by = y + Math.round(r * 0.62);
    disc(bx, by, 6, '#3b2a22'); disc(bx, by, 5, cd > 0 ? shade(color, -0.35) : color);
    drawText(ctx, letter, bx + 1, by - 3, { color: '#fff7e6', align: 'center', outline: shade(color, -0.55) });
  } else if (cd > 0) {
    // recharging: the button fills up from the bottom
    disc(cx, y - 1, r - 2, shade(color, -0.55));
    ctx.save();
    const fill = Math.round((r * 2 - 4) * (1 - cd / 100));
    ctx.beginPath(); ctx.rect(cx - r, y + r - 2 - fill, r * 2, fill + 2); ctx.clip();
    disc(cx, y - 1, r - 2, shade(color, -0.15));
    ctx.restore();
  } else {
    disc(cx, y - 1, r - 2, down ? shade(color, -0.12) : color);
    disc(cx - Math.round(r * 0.3), y - Math.round(r * 0.35), Math.max(1, Math.round(r * 0.22)), shade(color, 0.45));
  }
  if (!icon) drawText(ctx, letter, cx, y - 7, { color: cd > 0 ? '#b9b0c8' : '#fff7e6', align: 'center', scale: 2, outline: shade(color, -0.5) });
  if (label && side === 'left') {
    label = fitText(label, Math.max(20, cx - r - 15));
    const w = measure(label) + 8, lx = Math.max(2, Math.round(cx - r - 5 - w));
    ctx.fillStyle = 'rgba(20,14,28,0.7)';
    ctx.fillRect(lx, Math.round(cy - 6), w, 11);
    drawText(ctx, label, lx + w / 2, cy - 4, { color: '#fff7e6', align: 'center' });
  } else if (label) {
    const w = measure(label) + 8;
    ctx.fillStyle = 'rgba(20,14,28,0.7)';
    ctx.fillRect(Math.round(cx - w / 2), Math.round(cy - r - 15), w, 11);
    drawText(ctx, label, cx, cy - r - 13, { color: cd > 0 ? '#b9b0c8' : '#fff7e6', align: 'center' });
  }
  regions.push({ kind: 'hold', id, circle: true, cx, cy, r });
}

// The menu: a grid of illustrated tiles, always in the same places (3 across on a
// tall phone, a row of up to 6 on a wide one); the rare & risky actions stay small
// at the bottom (and leaving asks twice).
const HERO_GLYPH = { knight: 'pan', mage: 'wand', ranger: 'slingshot', bard: 'lute', lamplighter: 'lantern', gardener: 'can', cook: 'whisk', tinkerer: 'wrench' };
// (your hero's weapon: the game's word for it wins over what this phone remembers)
const heroGlyph = () => HERO_GLYPH[(S.prog && S.prog.cls) || S.cls] || 'star';
function menuTile(x, y, cw, it) {
  const s = 40, tx = Math.round(x + (cw - s) / 2), down = S.pressing === it.id, dy = down ? 1 : 0;
  ctx.fillStyle = 'rgba(30,18,30,0.3)'; ctx.fillRect(tx + 1, y + 2, s, s);
  ctx.fillStyle = '#3b2a22'; ctx.fillRect(tx + 1, y + dy, s - 2, s); ctx.fillRect(tx, y + 1 + dy, s, s - 2);
  ctx.fillStyle = down ? shade(it.color, -0.2) : it.color; ctx.fillRect(tx + 1, y + 1 + dy, s - 2, s - 2);
  ctx.fillStyle = 'rgba(255,255,255,0.24)'; ctx.fillRect(tx + 1, y + 1 + dy, s - 2, 2);
  ctx.fillStyle = 'rgba(20,10,20,0.18)'; ctx.fillRect(tx + 1, y + s - 3 + dy, s - 2, 2);
  drawGlyph(ctx, it.glyph, tx + 4, y + 4 + dy, 2);
  if (it.badge) badgeAt(tx + s + 3, y - 4, it.badge);
  drawText(ctx, fitText(it.label, cw + 2), x + cw / 2, y + s + 4, { color: INK, align: 'center' });
  tapArea(it.id, x, y - 2, cw, s + 16, it.fn);
}
function drawMenu() {
  ctx.fillStyle = 'rgba(15,10,22,0.6)'; ctx.fillRect(0, 0, W, H);
  regions.push({ kind: 'tap', id: 'scrim', x: 0, y: 0, w: W, h: H, fn: () => { S.menu = false; } });
  const pts = S.prog && S.prog.points > 0 && S.phase !== 'lobby' ? S.prog.points : 0;
  const solo = S.phase === 'solo';
  const tiles = [
    S.quest && { id: 'questm', glyph: 'book', label: t('Quest'), color: '#d9b877', badge: S.questNew ? '•' : '', fn: () => openQuest() },
    // (separated from the others by chance: one tap, and the hero is back beside them)
    !solo && S.phase !== 'lobby' && { id: 'rejm', glyph: 'people', label: t('Rejoin'), color: '#4f955a', fn: () => { S.menu = false; send({ t: 'rejoin' }); buzz(15); } },
    !solo && S.host && { id: 'hostm', glyph: 'crown', label: t('Host'), color: '#d8962a', fn: () => { S.menu = 'host'; S.hconfirm = null; } },
    S.prog && { id: 'talm', glyph: 'star', label: t('Talents'), color: '#5a9a48', badge: pts ? '+' + pts : '', fn: () => { S.menu = 'talents'; S.talSel = null; } },
    S.prog && { id: 'gearm', glyph: 'armory', label: t('Gear'), color: '#8a6a9a', fn: () => { S.menu = 'gear'; S.gearSel = null; } },
    { id: 'mountm', glyph: 'horseshoe', label: t('Mounts'), color: '#9a7048', fn: () => { S.menu = 'mounts'; } },
    { id: 'petm', glyph: 'pet', label: t('Companions'), color: '#3f8a7a', fn: () => { S.menu = 'pets'; } },
    { id: 'hero', glyph: heroGlyph(), label: t('Hero'), color: '#b8862a', fn: () => { S.menu = 'cls'; } },
    { id: 'mapm', glyph: 'map', label: t('Map'), color: '#4a7ab8', fn: openMap },
    !solo && { id: 'lookm', glyph: 'shirt', label: t('Outfit'), color: '#6a4a88', fn: () => { S.menu = false; S.view = 'look'; } },
    !solo && S.phase !== 'lobby' && { id: 'campm', glyph: 'campfire', label: t('Campfire'), color: '#b8502a', fn: () => { S.menu = false; send({ t: 'camp' }); buzz(15); } },
    !solo && { id: 'invm', glyph: 'invite', label: t('Invite'), color: '#4f955a', fn: openInvite },
    solo && { id: 'bike', glyph: 'bike', label: t('Bicycle'), color: '#4a8a9a', fn: () => { S.menu = false; soloAct('bike'); } },
    solo && { id: 'hudm', glyph: 'screen', label: t('Display'), color: '#4a6a8a', fn: () => { soloAct('hud'); } },
  ].filter(Boolean);
  const land = W > H;
  const cols = land ? Math.min(6, tiles.length) : 3, rows = Math.ceil(tiles.length / cols);
  const cw = land ? 60 : Math.min(62, Math.floor((W - 12 - 16) / 3)), rowH = 58, footH = 24;
  const pw = cols * cw + 16, ph = 26 + rows * rowH + footH;
  const px = Math.round((W - pw) / 2), py = Math.max(4, Math.round((H - ph) / 2));
  panel(ctx, px, py, pw, ph);
  tapArea('menupanel', px, py, pw, ph, () => {});
  drawText(ctx, solo ? t('Menu') : t('Party menu'), px + 10, py + 8, { color: INK });
  iconBtn(px + pw - 24, py + 4, 18, 16, 'close', 'close', () => { S.menu = false; }, { color: '#a8483a' });
  tiles.forEach((it, i) => menuTile(px + 8 + (i % cols) * cw, py + 26 + Math.floor(i / cols) * rowH, cw, it));
  const fy = py + ph - footH;
  ctx.fillStyle = '#e8d6b4'; ctx.fillRect(px + 8, fy - 2, pw - 16, 1);
  const half = Math.floor((pw - 16 - 6) / 2), sure = S.leaveAsk && S.t < S.leaveAsk;
  iconBtn(px + 8, fy + 2, half, 17, 'buoy', 'unstuck', () => { S.menu = false; if (solo) soloAct('unstuck'); else { send({ t: 'unstuck' }); buzz(15); } }, { color: '#6a7a8a', label: t('Get unstuck') });
  iconBtn(px + 14 + half, fy + 2, half, 17, 'door', 'leave', () => { if (sure) { S.leaveAsk = 0; leave(); } else { S.leaveAsk = S.t + 3; buzz(25); } }, { color: sure ? '#d83a2a' : '#8e4a3e', label: sure ? t('Sure?') : solo ? t('Disconnect') : t('Quit') });
}

// ------------------------------------------------------------------ talents
// three specialisations (tabs), five rows each: icons with their ranks, the
// rows still locked, and what the picked talent does now and at its next rank
function drawTalents() {
  ctx.fillStyle = 'rgba(15,10,22,0.85)'; ctx.fillRect(0, 0, W, H);
  regions.push({ kind: 'tap', id: 'scrim', x: 0, y: 0, w: W, h: H, fn: () => {} });
  const P = S.prog, land = W > H;
  const px = 4, pw = W - 8, py = 22, ph = H - 26;
  panel(ctx, px, py, pw, ph);
  if (!P) { drawText(ctx, t('Waiting for the big screen…'), W / 2, py + 40, { color: UI.inkSoft, align: 'center' }); pill(px + 8, py + ph - 22, pw - 16, 16, t('Done'), 'talDone', () => { S.menu = false; }, { color: '#4f955a' }); return; }
  const cls = CLASSES[P.cls] ? P.cls : 'knight', trees = TREES[cls], picks = P.talents && !Array.isArray(P.talents) ? P.talents : {};
  drawText(ctx, fitText(t('Talents — {hero}', { hero: t(CLASSES[cls].name) }), pw * 0.62), px + 8, py + 7, { color: INK });
  drawText(ctx, t('Points: {n}', { n: P.points }), px + pw - 8, py + 7, { color: P.points ? '#4f955a' : UI.inkSoft, align: 'right' });
  // the specialisations: tabs
  if (S.talBranch == null) { let best = 0; trees.forEach((B, b) => { if (spentIn(cls, picks, b) > spentIn(cls, picks, best)) best = b; }); S.talBranch = best; }
  const tabY = py + 19, tabH = 24, tabW = Math.floor((pw - 12) / 3);
  trees.forEach((B, b) => {
    const x = px + 6 + b * tabW, on = S.talBranch === b, n = spentIn(cls, picks, b);
    ctx.fillStyle = on ? '#b8862a' : '#3b2a22'; ctx.fillRect(x + 1, tabY, tabW - 2, tabH);
    ctx.fillStyle = on ? '#fff3c4' : '#e8d6b4'; ctx.fillRect(x + 2, tabY + 1, tabW - 4, tabH - (on ? 1 : 2));
    drawIcon(ctx, B.icon, x + 4, tabY + 3, { dim: !on && !n });
    drawText(ctx, fitText(t(B.name), tabW - 28), x + 25, tabY + 4, { color: on ? INK : '#6a5a50' });
    drawText(ctx, n + '/15', x + 25, tabY + 14, { color: n ? '#4f955a' : '#8a7a70' });
    tapArea('talB' + b, x, tabY, tabW, tabH, () => { S.talBranch = b; S.talSel = null; });
  });
  const B = trees[S.talBranch], inB = spentIn(cls, picks, S.talBranch);
  // the tree: five rows
  const treeW = land ? Math.floor(pw * 0.46) : pw - 12, top = tabY + tabH + 6;
  const room = (land ? py + ph - 4 : py + ph - 128) - top;
  const s = room >= 5 * 40 ? 2 : 1, cell = 18 * s, rowH = Math.max(cell + 4, Math.min(cell + 14, Math.floor(room / 5)));
  const cx0 = px + 6 + Math.floor(treeW / 2);
  const posOf = (T) => ({ x: Math.round(cx0 + (T.col === 0.5 ? 0 : T.col === 0 ? -1 : 1) * (cell * 0.5 + 10 * s) - cell / 2), y: top + (T.row - 1) * rowH });
  // connectors first
  for (const T of B.talents) {
    if (T.row === 1) continue;
    const q = posOf(T), open = inB >= ROW_NEED[T.row - 1];
    ctx.fillStyle = open ? '#e0a526' : '#8a7a70';
    ctx.fillRect(q.x + cell / 2 - 1, q.y - (rowH - cell), 2, rowH - cell);
  }
  for (let r = 1; r <= 5; r++) {
    const need = ROW_NEED[r - 1], open = inB >= need, y = top + (r - 1) * rowH;
    if (!open) drawText(ctx, t('{n} pts', { n: need }), px + 8, y + cell / 2 - 4, { color: '#8a7a70' });
  }
  for (const T of B.talents) {
    const q = posOf(T), r = rankOf(picks, T.id), open = inB >= ROW_NEED[T.row - 1], can = canLearn(cls, picks, T.id, P.level), sel = S.talSel === T.id;
    if (sel) { ctx.fillStyle = '#fff3a6'; ctx.fillRect(q.x - 2, q.y - 2, cell + 4, cell + 4); }
    if (T.ult) { ctx.fillStyle = r ? '#ffd66b' : '#b8862a'; ctx.fillRect(q.x - 1, q.y - 1, cell + 2, cell + 2); }
    drawIcon(ctx, T.icon, q.x, q.y, { s, dim: !open || (!r && !can), rank: r, max: T.max, glow: can && !r && Math.floor(S.t * 3) % 2 === 0, t: S.t });
    tapArea('tal' + T.id, q.x - 3, q.y - 3, cell + 6, cell + 6, () => { S.talSel = T.id; });
  }
  // what the picked talent does
  const dx = land ? px + treeW + 12 : px + 8, dw = land ? pw - treeW - 20 : pw - 16;
  const dy = land ? top : top + 5 * rowH + 2;
  const T = S.talSel && TALENT[S.talSel];
  if (T && T.cls === cls) {
    const r = rankOf(picks, T.id);
    drawText(ctx, fitText(t(T.name), dw - 40), dx, dy, { color: T.ult ? '#b8862a' : '#8a5234' });
    drawText(ctx, t('Rank {r}/{m}', { r, m: T.max }), dx + dw, dy, { color: r ? '#4f955a' : UI.inkSoft, align: 'right' });
    const say = (k) => t(T.desc, { n: valueAt(T, k) });
    const lines = wrap(say(Math.max(1, r)), dw).slice(0, land ? 5 : 4);
    lines.forEach((l, i) => drawText(ctx, l, dx, dy + 12 + i * 10, { color: INK }));
    let ly = dy + 14 + lines.length * 10;
    if (r > 0 && r < T.max && T.n) { const nx = wrap(t('Next rank: {what}', { what: say(r + 1) }), dw).slice(0, 2); nx.forEach((l, i) => drawText(ctx, l, dx, ly + i * 10, { color: '#7d4f93' })); ly += nx.length * 10 + 2; }
    const why = whyNot(cls, picks, T.id, P.level);
    if (!why) pill(dx, ly, dw, 18, r ? t('Rank up') : t('Learn it'), 'talLearn', () => { send({ t: 'talent', id: T.id }); buzz([20, 30, 20]); }, { color: '#4f955a' });
    else wrap(t(why, { n: ROW_NEED[T.row - 1] }), dw).slice(0, 2).forEach((l, i) => drawText(ctx, l, dx, ly + 4 + i * 10, { color: why === 'Fully learned!' ? '#4f955a' : UI.inkSoft }));
  } else {
    drawText(ctx, fitText(t(B.name), dw), dx, dy, { color: '#8a5234' });
    wrap(t(B.desc), dw).slice(0, 2).forEach((l, i) => drawText(ctx, l, dx, dy + 12 + i * 10, { color: INK }));
    wrap(t('Tap a talent to see what it does'), dw).slice(0, 2).forEach((l, i) => drawText(ctx, l, dx, dy + 36 + i * 10, { color: UI.inkSoft }));
  }
  // reset (tap twice) & done (landscape: under the details, the tree keeps the whole height)
  if (S.talReset && S.t > S.talReset) S.talReset = 0;
  const by = py + ph - 20, bx = land ? dx : px + 8, half = land ? Math.floor((dw - 6) / 2) : Math.floor((pw - 24) / 2);
  pill(bx, by, half, 16, S.talReset ? t('Tap again') : t('Reset'), 'talReset', () => { if (!S.talReset) { S.talReset = S.t + 3; return; } S.talReset = 0; send({ t: 'talentReset' }); buzz(20); }, { color: S.talReset ? '#c8454f' : '#8a7a98' });
  pill(bx + half + (land ? 6 : 8), by, half, 16, t('Done'), 'talDone', () => { S.menu = false; }, { color: '#4f955a' });
}

// ------------------------------------------------------------------ gear
const gearIcon = (it, x, y, s = 1) => drawGearIcon(ctx, it, x, y, s);

function drawGear() {
  ctx.fillStyle = 'rgba(15,10,22,0.85)'; ctx.fillRect(0, 0, W, H);
  regions.push({ kind: 'tap', id: 'scrim', x: 0, y: 0, w: W, h: H, fn: () => {} });
  const P = S.prog, land = W > H;
  const px = 4, pw = W - 8, py = 22, ph = H - 26;
  panel(ctx, px, py, pw, ph);
  if (!P) { drawText(ctx, t('Waiting for the big screen…'), W / 2, py + 40, { color: UI.inkSoft, align: 'center' }); pill(px + 8, py + ph - 22, pw - 16, 16, t('Done'), 'gearDone', () => { S.menu = false; }, { color: '#4f955a' }); return; }
  const G = P.gear || { bag: [], rune: null, charms: [null, null], weapons: {} };
  const find = (id) => G.bag.find((q) => q.id === id);
  drawText(ctx, t('Gear'), px + 8, py + 7, { color: INK });
  drawText(ctx, '★ ' + P.dust, px + pw - 8, py + 7, { color: '#b8862a', align: 'right' });
  // what you wear: your hero's weapon, a rune and two charms
  const leftW = land ? Math.floor(pw * 0.55) : pw - 12;
  const sw = Math.floor((leftW - 12) / 4), sy = py + 22;
  [[t('Weapon'), (G.weapons || {})[P.cls]], [t('Rune'), G.rune], [t('Charm'), G.charms[0]], [t('Charm'), G.charms[1]]].forEach(([label, id], i) => {
    const x = px + 6 + i * (sw + 4), it = find(id);
    drawText(ctx, fitText(label, sw), x + sw / 2, sy, { color: UI.inkSoft, align: 'center' });
    ctx.fillStyle = '#3b2a22'; ctx.fillRect(x, sy + 10, sw, 26);
    ctx.fillStyle = it ? '#fff3c4' : '#e0d0b0'; ctx.fillRect(x + 1, sy + 11, sw - 2, 24);
    if (it) { ctx.fillStyle = itemBorder(it); ctx.fillRect(x + 1, sy + 11, sw - 2, 2); gearIcon(it, x + 5, sy + 16); drawText(ctx, itemTag(it), x + sw - 4, sy + 24, { color: '#8a5234', align: 'right' }); tapArea('gs' + i, x, sy + 10, sw, 26, () => { S.gearSel = it.id; }); }
    else drawText(ctx, i === 0 ? '·' : '—', x + sw / 2, sy + 19, { color: UI.inkSoft, align: 'center' });
  });
  // the bag
  const by0 = sy + 44;
  drawText(ctx, t('Bag ({n}/{max})', { n: G.bag.length, max: BAG }), px + 8, by0, { color: UI.inkSoft });
  const cell = 26, per = Math.max(1, Math.floor((leftW - 4) / (cell + 3)));
  G.bag.forEach((it, i) => {
    const x = px + 6 + (i % per) * (cell + 3), y = by0 + 10 + Math.floor(i / per) * (cell + 3);
    const on = isWorn(G, it), sel = S.gearSel === it.id;
    ctx.fillStyle = sel ? '#fff3a6' : itemBorder(it); ctx.fillRect(x, y, cell, cell);
    ctx.fillStyle = on ? '#fff3c4' : '#f3e3c3'; ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
    if (it.kind === 'weapon' && it.rarity >= 4 && Math.floor(S.t * 3) % 2) { ctx.fillStyle = '#ffd66b'; ctx.fillRect(x + 1, y + 1, cell - 2, 1); }
    gearIcon(it, x + 7, y + 5);
    drawText(ctx, itemTag(it), x + cell - 3, y + cell - 10, { color: '#8a5234', align: 'right' });
    if (on) drawText(ctx, '✓', x + 3, y + cell - 10, { color: '#4f955a' });
    tapArea('gb' + it.id, x, y, cell, cell, () => { S.gearSel = it.id; });
  });
  if (!G.bag.length) wrap(t('Open chests to find weapons, runes and charms'), leftW - 8).slice(0, 2).forEach((l, i) => drawText(ctx, l, px + 8, by0 + 14 + i * 10, { color: UI.inkSoft }));
  // the selected item
  const it = find(S.gearSel);
  const dx = land ? px + leftW + 10 : px + 8, dw = land ? pw - leftW - 18 : pw - 16;
  const dy = land ? sy : by0 + 12 + Math.ceil(Math.max(1, G.bag.length) / per) * (cell + 3) + 4;
  if (it) {
    const col = it.kind === 'weapon' ? itemBorder(it) : LEVEL_COLOR[it.lv] === '#c9c4cc' ? '#8a5234' : LEVEL_COLOR[it.lv];
    drawText(ctx, fitText(t(itemName(it)) + (it.kind === 'weapon' ? '' : ' ' + ROMAN[it.lv]), dw), dx, dy, { color: col === '#c9c4cc' ? '#8a5234' : col });
    let y = dy + 12;
    const lines = it.kind === 'weapon' ? weaponLines(it) : [[itemDesc(it).key, itemDesc(it).vars, null]];
    if (it.kind === 'weapon' && it.cls !== P.cls) lines.splice(1, 0, ['For the {hero}', { hero: CLASSES[it.cls] ? t(CLASSES[it.cls].name) : '' }, '#c8454f']);
    const tr = (v) => { const o = {}; for (const k in v || {}) o[k] = typeof v[k] === 'string' ? t(v[k]) : v[k]; return o; };
    for (const [key, vars, c] of lines) {
      for (const l of wrap(t(key, tr(vars)), dw).slice(0, 3)) { if (y > py + ph - 70) break; drawText(ctx, l, dx, y, { color: c === '#c9c4cc' ? '#8a7a70' : c || INK }); y += 10; }
    }
    const on = isWorn(G, it);
    y += 4;
    pill(dx, y, dw, 16, on ? t('Take off') : t('Wear it'), 'gEq', () => { send({ t: 'gear', op: on ? 'unequip' : 'equip', id: it.id }); buzz(15); }, { color: on ? '#8a7a98' : '#4f955a' });
    y += 20;
    const cost = itemUpgrade(it);
    if (cost) { pill(dx, y, dw, 16, t('Upgrade · {n} ★', { n: cost }), 'gUp', () => { if (P.dust >= cost) { send({ t: 'gear', op: 'upgrade', id: it.id }); buzz([20, 30, 20]); } else buzz(40); }, { color: P.dust >= cost ? '#b8862a' : '#8a7a70' }); y += 20; }
    if (S.gearDrop === it.id && S.t > S.gearDropT) S.gearDrop = null;
    pill(dx, y, dw, 16, S.gearDrop === it.id ? t('Tap again') : t('Melt · +{n} ★', { n: meltValue(it) }), 'gDrop', () => { if (S.gearDrop !== it.id) { S.gearDrop = it.id; S.gearDropT = S.t + 3; return; } S.gearDrop = null; S.gearSel = null; send({ t: 'gear', op: 'drop', id: it.id }); }, { color: S.gearDrop === it.id ? '#c8454f' : '#8a5a4a' });
  } else wrap(t('Tap an item to see what it does'), dw).slice(0, 3).forEach((l, i) => drawText(ctx, l, dx, dy + 6 + i * 10, { color: UI.inkSoft }));
  pill(px + 8, py + ph - 20, pw - 16, 16, t('Done'), 'gearDone', () => { S.menu = false; }, { color: '#4f955a' });
}

// ------------------------------------------------------------------ mounts
const meterAt = (time, speed) => { const u = (time * speed) % 2; return u < 1 ? u : 2 - u; };

// win an animal's trust: tap while the marker is in the green (the phone judges)
function drawTame() {
  background();
  header();
  const g = S.tame, land = W > H;
  const time = S.t - g.t0;
  const lines = [g.animal, t('Win its trust!')];
  lines.forEach((l, i) => drawText(ctx, fitText(l, W - 24), W / 2, 28 + i * 11, { color: i ? '#fff3c4' : '#f6c65b', align: 'center' }));
  drawText(ctx, fitText(t('You offer {food}', { food: g.food }), W - 40), W / 2, 30 + lines.length * 11 + 2, { color: '#b9a2e3', align: 'center' });
  if (g.foodId) foodPix(g.foodId, Math.round(W / 2) - 7, 30 + lines.length * 11 + 14, 2);
  // the meter
  const bw = W - 40, bh = land ? 16 : 20, bx = 20, by = Math.round(H * (land ? 0.42 : 0.36));
  ctx.fillStyle = '#241a2e'; ctx.fillRect(bx - 3, by - 3, bw + 6, bh + 6);
  ctx.fillStyle = '#5a4a6a'; ctx.fillRect(bx, by, bw, bh);
  const gx = Math.round(bx + (g.zone - g.width / 2) * bw), gw = Math.max(4, Math.round(g.width * bw));
  ctx.fillStyle = '#6fd66a'; ctx.fillRect(gx, by, gw, bh);
  ctx.fillStyle = '#9ff09a'; ctx.fillRect(gx, by, gw, 2);
  const m = g.ok ? g.zone : meterAt(time, g.speed);
  const mx = Math.round(bx + m * (bw - 4));
  ctx.fillStyle = '#3b2a22'; ctx.fillRect(mx - 1, by - 5, 6, bh + 10);
  ctx.fillStyle = '#fff3c4'; ctx.fillRect(mx, by - 4, 4, bh + 8);
  // hearts won so far
  const hy = by + bh + 12;
  for (let i = 0; i < g.need; i++) heartPix(Math.round(W / 2) + (i - (g.need - 1) / 2) * 22 - 7, hy, i < g.hits ? '#ef6479' : '#5a4a6a');
  for (let i = 0; i < 3; i++) { ctx.fillStyle = i < g.misses ? '#c8454f' : '#3b3144'; ctx.fillRect(Math.round(W / 2) - 16 + i * 12, hy + 20, 8, 4); }
  if (g.flash > 0) { g.flash -= 1 / 60; drawText(ctx, g.flashText, W / 2, by - 18, { color: g.flashColor, align: 'center', scale: 2, outline: '#241a2e' }); }
  // the big tap zone
  const zy = hy + 34, zh = H - zy - 30;
  const down = S.pressing === 'tameA';
  ctx.fillStyle = '#3b2a22'; ctx.fillRect(14, zy + (down ? 1 : 0), W - 28, zh);
  ctx.fillStyle = down ? '#4f955a' : '#5fbf6a'; ctx.fillRect(15, zy + 1 + (down ? 1 : 0), W - 30, zh - 2);
  drawText(ctx, 'A', W / 2, zy + zh / 2 - 12 + (down ? 1 : 0), { color: '#fff7e6', align: 'center', scale: 3, outline: '#2e5a34' });
  drawText(ctx, t('Tap in the green!'), W / 2, zy + zh / 2 + 14, { color: '#fff7e6', align: 'center' });
  if (!g.ok) regions.push({ kind: 'press', id: 'tameA', x: 14, y: zy, w: W - 28, h: zh, fn: tameTap });
  pill(W / 2 - 40, H - 24, 80, 16, t('Give up'), 'tameQuit', () => { send({ t: 'tame', id: g.id, quit: true }); S.screen = 'play'; S.tame = null; }, { color: '#8a7a98' });
}

function tameTap() {
  const g = S.tame;
  if (!g || g.ok) return;
  const m = meterAt(S.t - g.t0, g.speed);
  const hit = Math.abs(m - g.zone) < g.width / 2;
  if (hit) {
    g.hits++;
    g.speed *= 1.18; g.width *= 0.88; g.zone = 0.25 + Math.random() * 0.5;
    g.flash = 0.6; g.flashText = '♥'; g.flashColor = '#ef6479';
    if (g.hits >= g.need) g.ok = true;
    buzz(30);
  } else {
    g.misses++;
    g.flash = 0.6; g.flashText = t('Oops!'); g.flashColor = '#ff9aa8';
    buzz([15, 30, 15]);
  }
  send({ t: 'tame', id: g.id, hit, zone: g.zone });
}

function heartPix(x, y, c) {
  const rows = ['.xx.xx.', 'xxxxxxx', 'xxxxxxx', '.xxxxx.', '..xxx..', '...x...'];
  ctx.fillStyle = '#241a2e'; ctx.fillRect(x - 1, y - 1, 16, 14);
  rows.forEach((r, j) => { for (let i = 0; i < 7; i++) if (r[i] === 'x') { ctx.fillStyle = c; ctx.fillRect(x + i * 2, y + j * 2, 2, 2); } });
}

// the favourite foods (same drawings as the big screen's)
const FOOD_PIX = {
  apple: { rows: ['...g...', '..g....', '.rrrr..', 'rrwrrr.', 'rrrrrr.', 'rrrrrr.', '.rrrr..'], pal: { r: '#e04848', w: '#ffb0a0', g: '#4f9a3a' } },
  acorn: { rows: ['...s...', '.ccccc.', 'ccccccc', '.bbbbb.', '.bbwbb.', '..bbb..', '...b...'], pal: { c: '#6b4330', b: '#c8864a', w: '#f0c890', s: '#4a3020' } },
  corn: { rows: ['..y.y..', '.yyyyy.', 'gyyyyyg', 'gyywyyg', '.gyyyg.', '.ggygg.', '..g.g..'], pal: { y: '#f4c542', w: '#fff3a6', g: '#62a84a' } },
  kelp: { rows: ['.g...g.', '.gg.gg.', '..g.g..', '.gg.gg.', '..ggg..', '...g...', '..ggg..'], pal: { g: '#3a9a5a' } },
  honey: { rows: ['..ddd..', '.hhhhh.', 'hhhwhhh', 'hhhhhhh', 'hhhhhhh', '.hhhhh.', '..ooo..'], pal: { d: '#8a5a2a', h: '#f0a830', w: '#fff0a0', o: '#c8782a' } },
  bug: { rows: ['.a...a.', '..a.a..', '.bbbbb.', 'bbwbwbb', 'bbbbbbb', '.bbbbb.', '..b.b..'], pal: { a: '#2a2433', b: '#3ab8c8', w: '#e8fbff' } },
  fern: { rows: ['...g...', '.g.g.g.', '..ggg..', 'g.ggg.g', '.ggggg.', '...s...', '...s...'], pal: { g: '#4f9a3c', s: '#6b4a2a' } },
  fish: { rows: ['.......', '..bbb.t', '.bbwbbt', 'bbbbbtt', '.bbbbbt', '..bbb.t', '.......'], pal: { b: '#6aa8d8', w: '#241a2e', t: '#4a88c0' } },
};
function foodPix(food, x, y, s = 1) {
  const F = FOOD_PIX[food];
  if (!F) return;
  ctx.fillStyle = '#241a2e'; ctx.fillRect(x - 1, y - 1, 7 * s + 2, 7 * s + 2);
  ctx.fillStyle = '#fff7e6'; ctx.fillRect(x, y, 7 * s, 7 * s);
  F.rows.forEach((row, j) => { for (let i = 0; i < 7; i++) { const c = F.pal[row[i]]; if (c) { ctx.fillStyle = c; ctx.fillRect(x + i * s, y + j * s, s, s); } } });
}

// which of your mounts answers the whistle
function drawMountMenu() {
  const M = S.mounts || { owned: [], active: null };
  const list = M.all || M.owned.map((m) => ({ ...m, have: true }));
  animalList(t('My mounts'), list.map((m) => {
    const on = M.active === m.id;
    return { id: 'mnt' + m.id, have: m.have, on, name: m.have ? m.name : '???', sub: on ? '✓ ' + t('Comes when you whistle') : m.have ? t('Tap to choose it') : m.hint, icon: (x, y) => drawMountIcon(ctx, m.id, x, y, 2, !m.have), fn: m.have && !on ? () => { send({ t: 'mount', v: m.id }); M.active = m.id; buzz(15); } : null };
  }), [[t('Done'), 'mntdone', () => { S.menu = false; }, '#6a5a7a']], list.some((m) => m.have) ? '' : t('Offer a wild animal the food it loves, then win its trust.'));
}

// your companions: who trots along behind you (or nobody: they're home)
function drawPetMenu() {
  const P = S.pets || { list: [], active: null };
  animalList(t('My companions'), P.list.map((m) => {
    const on = P.active === m.id;
    return { id: 'pet' + m.id, have: m.have, on, name: m.have ? m.name : '???', sub: on ? '✓ ' + t('Follows you') : m.have ? t('Tap: it follows you') : m.hint, icon: (x, y) => drawPetIcon(ctx, m.id, x, y, 2, !m.have), fn: m.have && !on ? () => { send({ t: 'pet', v: m.id }); P.active = m.id; buzz(15); } : null };
  }), [
    P.active && [t('Send home'), 'pethome', () => { send({ t: 'pet', v: '' }); P.active = null; buzz(15); }, '#8e5d3e'],
    [t('Done'), 'petdone', () => { S.menu = false; }, '#6a5a7a'],
  ].filter(Boolean), P.list.some((m) => m.have) ? '' : t('Free a gloomy animal: it may become your friend.'));
}

// a list of animals: a picture, a name and a line under it (two columns on a wide phone)
function animalList(title, rows, foot, note = '') {
  ctx.fillStyle = 'rgba(15,10,22,0.7)'; ctx.fillRect(0, 0, W, H);
  regions.push({ kind: 'tap', id: 'scrim', x: 0, y: 0, w: W, h: H, fn: () => {} });
  const cols = W > H && rows.length > 3 ? 2 : 1, per = Math.ceil(rows.length / cols), rh = 28;
  const cw = Math.min(cols === 2 ? 190 : 230, Math.floor((W - 24 - (cols - 1) * 6) / cols));
  const noteL = note ? wrap(note, cw * cols - 10).slice(0, 2) : [];
  const pw = cw * cols + (cols - 1) * 6 + 16;
  // (the buttons side by side — or one per row when a label wouldn't fit)
  const side = Math.floor((pw - 16 - (foot.length - 1) * 6) / foot.length), stack = foot.some(([label]) => measure(label) > side - 8);
  const ph = 22 + per * rh + noteL.length * 10 + 28 + (stack ? (foot.length - 1) * 22 : 0);
  const px = Math.round((W - pw) / 2), py = Math.max(4, Math.round((H - ph) / 2));
  panel(ctx, px, py, pw, ph);
  drawText(ctx, title, px + pw / 2, py + 8, { color: INK, align: 'center' });
  rows.forEach((r, i) => {
    const x = px + 8 + Math.floor(i / per) * (cw + 6), y = py + 21 + (i % per) * rh, h = rh - 3, down = S.pressing === r.id && r.fn;
    ctx.fillStyle = '#3b2a22'; ctx.fillRect(x + 1, y, cw - 2, h); ctx.fillRect(x, y + 1, cw, h - 2);
    ctx.fillStyle = r.on ? '#4f955a' : !r.have ? '#5e5064' : down ? '#6e4630' : '#8e5d3e';
    ctx.fillRect(x + 1, y + 1, cw - 2, h - 2);
    ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(x + 1, y + 1, cw - 2, 1);
    // (the picture in its little window)
    ctx.fillStyle = r.have ? '#f7ecd4' : '#8a7a8e'; ctx.fillRect(x + 3, y + 2, 28, h - 4);
    r.icon(x + 5, y + 2 + Math.floor((h - 4 - 20) / 2));
    const tw = cw - 40;
    if (r.have) {
      drawText(ctx, fitText(r.name, tw), x + 35, y + 3, { color: '#fff7e6' });
      drawText(ctx, fitText(r.sub, tw), x + 35, y + 13, { color: r.on ? '#e8f8d0' : '#f0d8b8' });
    } else {
      // (not met yet: where to find one, on two lines)
      const L = wrap(r.sub, tw);
      drawText(ctx, L[0] || '', x + 35, y + 3, { color: '#cfc2d4' });
      if (L[1]) drawText(ctx, fitText(L.slice(1).join(' '), tw), x + 35, y + 13, { color: '#cfc2d4' });
    }
    if (r.fn) tapArea(r.id, x - 1, y - 1, cw + 2, h + 2, r.fn);
  });
  noteL.forEach((l, i) => drawText(ctx, l, px + pw / 2, py + 23 + per * rh + i * 10, { color: UI.inkSoft, align: 'center' }));
  foot.forEach(([label, id, fn, color], i) => {
    if (stack) pill(px + 8, py + ph - 24 - (foot.length - 1 - i) * 22, pw - 16, 18, fitText(label, pw - 22), id, fn, { color });
    else pill(px + 8 + i * (side + 6), py + ph - 24, side, 18, fitText(label, side - 6), id, fn, { color });
  });
}

// The Hero page: your level (how far the next one is, what it will bring, the land's own
// levels, what levels are for) and the heroes to choose from — side by side on a phone
// lying down, one over the other on a phone held up.
function drawHeroMenu() {
  ctx.fillStyle = 'rgba(15,10,22,0.7)'; ctx.fillRect(0, 0, W, H);
  regions.push({ kind: 'tap', id: 'scrim', x: 0, y: 0, w: W, h: H, fn: () => {} });
  const L = S.phase !== 'lobby' && S.lv, land = W > H;
  const ph = Math.min(H - 40, 200), side = L && land ? Math.min(190, W - 300 - 18) : 0, lw = side >= 120 ? side : 0;
  const pw = Math.min(W - 16 - (lw ? lw + 6 : 0), 300);
  const lh = L && !lw ? Math.min(levelBlock(0, 0, pw, 400, true), H - ph - 30) : 0, over = lh >= 40 ? lh + 20 : 0;
  const px = Math.round((W - pw - (lw ? lw + 6 : 0)) / 2) + (lw ? lw + 6 : 0), py = Math.round((H - ph - over) / 2) + over;
  if (lw) levelBlock(px - lw - 6, py, lw, ph);
  else if (over) levelBlock(px, py - over, pw, lh);
  ctx.fillStyle = '#20172a'; ctx.fillRect(lw ? px : 0, py - 16, lw ? pw : W, 14);
  drawText(ctx, t('Choose your hero'), lw ? px + pw / 2 : W / 2, py - 13, { color: '#fff3c4', align: 'center' });
  drawHeroes(px, py, pw, ph - 26);
  pill(px + 8, py + ph - 20, pw - 16, 18, t('Done'), 'herodone', () => { S.menu = false; }, { color: '#4f955a' });
}

// your level on a paper card: "Level 5 — 340 / 900", the bar, what comes next, the land you
// stand in, a line on what levels are for (`sizing`: only how tall it would be)
function levelBlock(x, y, w, h, sizing = false) {
  const L = S.lv, bar = xpBar(L.lv, L.xp), n = shownLevel(L.lv), tw = w - 16;
  const lift = Math.sign(shownLevel(L.eff) - n);
  const lines = nextSteps(L.lv, L.xp).map((l) => [l, INK]);
  if (L.land) lines.push([t('Here: {levels}', { levels: levelsText(L.land, L.lv, true) }) + (L.place ? ' · ' + L.place : ''), '#5a4a5a']);
  if (lift) lines.push([liftWords(lift, shownLevel(L.eff), L.solo), liftInk(lift, L.solo)]);
  lines.push([levelLine(), UI.inkSoft]);
  const tall = 34 + lines.reduce((a, [l]) => a + wrap(l, tw).length * 10 + 2, 0) + 4;
  if (sizing) return tall;
  h = Math.min(h, tall);
  panel(ctx, x, y, w, h);
  tapArea('lvblock', x, y, w, h, () => {});
  drawText(ctx, t('Level {n}', { n }), x + 8, y + 7, { color: '#8a5234' });
  drawText(ctx, bar.max ? t('max') : `${bar.have} / ${bar.need}`, x + w - 8, y + 7, { color: UI.inkSoft, align: 'right' });
  drawXpBar(ctx, x + 8, y + 19, tw, 7, bar, XP_PAPER);
  let ly = y + 32;
  for (const [l, color] of lines) {
    if (ly + wrap(l, tw).length * 10 > y + h - 2) break;
    ly = drawWrapped(ctx, [l], x + 8, ly, tw, color) + 2;
  }
  return tall;
}

// The level-up card, between the info strip and the controls — never over the stick or the
// buttons (a phone held up: under the info card; lying down: in the gap between the stick and
// the buttons): the new level, what it brought in plain numbers, the way to the Talents and,
// the first time, what levels are for. A tap puts it away. Half-way through a level it's a
// single line: a talent point.
// (a hero rising again before it's read: one card, from the first numbers to the last)
function levelCard(m) {
  const n = (v) => (typeof v === 'number' && isFinite(v) ? v : 0), c = S.lvCard && !S.lvCard.half ? S.lvCard : null;
  if (m.half) { if (c) c.pts = n(m.pts); else S.lvCard = { half: 1, pts: n(m.pts), life: 7 }; return; }
  const two = (a) => (Array.isArray(a) ? [n(a[0]), n(a[1])] : [0, 0]), hp = two(m.hp), str = two(m.str), tell = !!(m.tell || (c && c.tell));
  S.lvCard = { lv: n(m.lv), hp: [c ? c.hp[0] : hp[0], hp[1]], str: [c ? c.str[0] : str[0], str[1]], got: (c ? c.got : 0) + n(m.got), pts: n(m.pts), top: !!m.top, eff: n(m.eff), tell, life: tell ? 45 : 12 };
}
// (K: where the controls are — drawControls)
function drawLevelCard(zoneY, K) {
  const c = S.lvCard, land = W > H;
  // (its time runs only while it shows)
  if (c.seen !== undefined && S.t - c.seen < 0.3) c.age = (c.age || 0) + S.t - c.seen;
  c.seen = S.t;
  if (c.age > c.life) { S.lvCard = null; return; }
  const x = land ? K.gap[0] : 6, w = land ? K.gap[1] - K.gap[0] : W - 12, y = zoneY + (land ? 2 : 0), tw = w - 16;
  const room = (land ? H - 4 : K.top) - y;
  const close = () => { S.lvCard = null; }, talents = () => { S.lvCard = null; S.menu = 'talents'; S.talSel = null; };
  const btn = t('Talents') + (c.pts ? ' +' + c.pts : '');
  if (c.half) {
    // (the word and the button side by side when they fit, else one over the other)
    const word = t('A talent point!'), bw = Math.min(w - 16, measure(btn) + 22), wide = measure(word) + bw + 40 <= w, h = wide ? 26 : 44;
    panel(ctx, x, y, w, h);
    tapArea('lvcard', x, y, w, h, close);
    drawGlyph(ctx, 'star', x + 6, y + 5, 1);
    drawText(ctx, fitText(word, w - 34), x + 26, y + 9, { color: INK });
    pill(wide ? x + w - bw - 6 : x + 8, wide ? y + 5 : y + 23, wide ? bw : w - 16, 16, btn, 'lvtal', talents, { color: '#4f955a' });
    return;
  }
  // what it brought: health and strength where you stand (the land may already hold them), talent points
  const same = c.hp[0] === c.hp[1] && c.str[0] === c.str[1], f2 = (v) => (v / 100).toFixed(2);
  const rows = same ? [] : [[t('Health'), `${c.hp[0]} → ${c.hp[1]}`, INK], [t('Strength'), `×${f2(c.str[0])} → ×${f2(c.str[1])}`, INK]];
  rows.push([t('Talent points'), '+' + c.got, '#4f955a']);
  const noteL = same ? wrap(t('Health and strength: no change here, where the land sets the level you fight at ({n}). The gain will show in other lands.', { n: c.eff }), tw) : [];
  const base = 24 + rows.length * 11 + (noteL.length ? noteL.length * 10 + 2 : 0) + 24;
  // (what levels are for: as many of its sentences as there is room for)
  const words = [];
  let h = base;
  for (const l of c.tell ? levelWords() : []) { const wl = wrap(l, tw), more = wl.length * 10 + 4; if (h + more > room) break; words.push(wl); h += more; }
  if (words.length) h += 2;
  panel(ctx, x, y, w, h);
  tapArea('lvcard', x, y, w, h, close);
  drawGlyph(ctx, 'star', x + 6, y + 4, 1);
  drawText(ctx, fitText(c.top ? t('Level {n}: the highest!', { n: c.lv }) : t('Level {n}!', { n: c.lv }), w - 34), x + 26, y + 8, { color: '#8a5234' });
  let ly = y + 24;
  for (const [label, val, color] of rows) { drawText(ctx, fitText(label, tw - measure(val) - 6), x + 8, ly, { color: UI.inkSoft }); drawText(ctx, val, x + w - 8, ly, { color, align: 'right' }); ly += 11; }
  noteL.forEach((l) => { drawText(ctx, l, x + 8, ly, { color: '#4f73b6' }); ly += 10; });
  pill(x + 8, y + base - 22, w - 16, 16, btn, 'lvtal', talents, { color: '#4f955a' });
  ly = y + base + 1;
  for (const wl of words) { wl.forEach((l) => { drawText(ctx, l, x + 8, ly, { color: '#5a4a5a' }); ly += 10; }); ly += 4; }
}

function leave() {
  remote?.disconnect();
  send({ t: 'bye' });
  S.joined = false; S.menu = false; S.me = null; S.portrait = null;
  clearTimeout(retryT);
  if (ws) { const w = ws; ws = null; w.close(); }
  S.status = 'idle';
  S.error = '';
}

function drawChoice() {
  background();
  header();
  const c = S.choice;
  if (!c) return drawWaiting('Waiting');
  const lines = wrap(c.title, W - 24);
  lines.slice(0, 3).forEach((l, i) => drawText(ctx, l, W / 2, 28 + i * 11, { color: '#fff3c4', align: 'center' }));
  const y0 = 30 + Math.min(3, lines.length) * 11 + 6;
  const n = c.options.length;
  const land = W > H;
  const cols = land && n > 2 ? 2 : 1;
  const rows = Math.ceil(n / cols);
  const bh = Math.max(20, Math.min(40, Math.floor((H - y0 - 30) / rows) - 6));
  const bw = Math.floor((W - 16 - (cols - 1) * 8) / cols);
  c.options.forEach((opt, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = 8 + col * (bw + 8), y = y0 + row * (bh + 6);
    const picked = c.picked === i;
    const label = (typeof opt === 'string' ? opt : opt.label);
    const sub = typeof opt === 'object' ? opt.sub || '' : '';
    const count = c.tally ? c.tally[i] || 0 : null;
    const optColor = typeof opt === 'object' && opt.color ? opt.color : ['#4f73b6', '#c8454f', '#4f955a', '#dcb043', '#7d4f93', '#e58a3a'][i % 6];
    const down = S.pressing === 'opt' + i;
    const dy = down ? 1 : 0;
    ctx.fillStyle = '#3b2a22'; ctx.fillRect(x + 1, y + dy, bw - 2, bh); ctx.fillRect(x, y + 1 + dy, bw, bh - 2);
    const fill = picked ? '#fff3c4' : c.picked >= 0 ? shade(optColor, -0.35) : optColor;
    ctx.fillStyle = fill;
    ctx.fillRect(x + 1, y + 1 + dy, bw - 2, bh - 2);
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x + 1, y + 1 + dy, bw - 2, 1);
    const ink = picked || light(fill) ? INK : '#fff7e6';
    const soft = picked || light(fill) ? 'rgba(59,42,46,0.7)' : 'rgba(255,247,230,0.75)';
    const room = bw - (count !== null || picked ? 28 : 14);
    const tl = wrap(label, room).slice(0, 2);
    const subL = sub && bh >= 26 ? wrap(sub, room).slice(0, bh >= 38 && tl.length === 1 ? 2 : 1) : [];
    const nl = tl.length + subL.length;
    const ly = y + Math.round(bh / 2) - nl * 5 + 1 + dy;
    tl.forEach((l, k) => drawText(ctx, l, x + 8, ly + k * 10, { color: ink }));
    subL.forEach((l, k) => drawText(ctx, l, x + 8, ly + (tl.length + k) * 10, { color: soft }));
    if (picked) drawText(ctx, '✓', x + bw - 12, y + Math.round(bh / 2) - 4, { color: '#4f955a', align: 'center', scale: 1 });
    else if (count !== null) drawText(ctx, String(count), x + bw - 12, y + Math.round(bh / 2) - 4, { color: ink, align: 'center' });
    if (c.picked < 0) tapArea('opt' + i, x, y, bw, bh, () => { c.picked = i; send({ t: 'pick', id: c.id, i }); buzz(20); });
  });
  const note = c.picked >= 0 ? t('Waiting for the others…') : c.note || t('Tap your choice');
  drawText(ctx, note, W / 2, H - 16, { color: '#b9a2e3', align: 'center' });
}

function drawMessage() {
  background();
  header();
  const m = S.message || { title: '', text: t('Look at the big screen!') };
  const pw = W - 24;
  const lines = wrap(m.text, pw - 20);
  const ph = 28 + lines.length * 11 + (m.a ? 30 : 6);
  const px = 12, py = Math.max(26, Math.round((H - ph) / 2) - 10);
  panel(ctx, px, py, pw, ph);
  if (m.title) drawText(ctx, m.title, W / 2, py + 9, { color: '#8a5234', align: 'center' });
  lines.forEach((l, i) => drawText(ctx, l, px + 10, py + 22 + i * 11, { color: INK }));
  if (m.a) pill(px + 20, py + ph - 26, pw - 40, 20, m.a, 'msgA', () => { send({ t: 'b', k: 'a', v: 1 }); send({ t: 'b', k: 'a', v: 0 }); }, { color: '#4f955a' });
}

function drawHostGone() {
  ctx.fillStyle = 'rgba(200,69,79,0.92)';
  ctx.fillRect(0, H - 14, W, 14);
  drawText(ctx, t('Big screen disconnected — reconnecting…'), W / 2, H - 11, { color: '#fff7e6', align: 'center' });
}

// ------------------------------------------------------------------ loop
let last = performance.now(), lastDraw = 0, lastTouch = 0;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  S.t += dt;
  // (a controller lying still needs no 60 redraws a second — 30 spare eight phones' batteries;
  // full speed while a finger is on it)
  if (now - lastTouch < 800 || now - lastDraw >= 30 || frame.manual) {
    lastDraw = now;
    regions = []; scroller = null;
    ctx.clearRect(0, 0, W, H);
    // (a screen that fails to draw must never freeze the controller: the stick & the loop go on)
    try { drawScreen(); S.drawError = null; } catch (e) { console.error(e); S.drawError = String(e); }
  }
  updateStick(now);
  if (!frame.manual) requestAnimationFrame(frame);
}

let codeAt = null, nameAt = null;     // where this frame’s screen wants the code and the name fields
function drawScreen() {
  remote?.update(performance.now());
  codeAt = nameAt = null;
  if (!S.joined) {
    if (S.status === 'connecting' || (S.status === 'open' && !S.me)) drawWaiting('Joining');
    else drawJoin();
  } else {
    if (S.menu !== 'chat') closeChat();
    if (!S.me) drawWaiting(S.hostGone ? 'Waiting for the big screen' : 'Joining');
    else if (S.screen === 'choice') drawChoice();
    else if (S.screen === 'tame' && S.tame) drawTame();
    else if (S.phase === 'lobby') {
      if (S.view === 'look') { drawLook(); if (S.host) hostPill(W - 30); if (S.menu === 'host') drawHostMenu(); } else drawPad();
    }
    else if (S.phase === 'solo') drawSolo();
    else if (S.screen === 'message') drawMessage();
    else if (S.view === 'look') drawLook();
    else drawPad();
    if (S.hostGone || S.status !== 'open') drawHostGone();
  }
  // (a field left alone keeps its place and its focus; one no screen asked for goes — and lets go of the keyboard)
  placeField(codeIn, codeAt); placeField(nameIn, nameAt);
}
requestAnimationFrame(frame);

// straight in when the QR code brought us here and we already have a name (an invitation with
// the video key asks where first; play.html always goes straight in)
if (urlCode && S.name && (remote || !S.key)) join();

// scanning a new code while this page is still open only changes the hash
window.addEventListener('hashchange', () => {
  const c = location.hash.slice(1).split('.')[0].toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
  if (!c || c === S.code) return;
  if (S.joined || ws) leave();
  if (remote) remote.key = location.hash.slice(1).split('.')[1] || '';
  S.key = keyOf(location.hash);
  S.code = c; S.askCode = false; S.error = '';
  codeIn.value = c;
  if (S.name && (remote || !S.key)) join();
});

// debug hook for automated checks
window.pad = { S, PM, send, join, leave, regions: () => regions, stick, draw: () => { frame.manual = true; frame(performance.now()); frame.manual = false; } };
