// The chat, tried on every device (src/ui/chat.js), for the browser
// pane (its scripts time out after 45 s: start, then poll window.__ct):
//   (await import('/tools/chattest.js')).start('party', 4)   // phones (bots), a keyboard, a gamepad
//   (await import('/tools/chattest.js')).start('solo')       // T's line, the wheel, the folk's answer
// Each check is a line of window.__ct.log; window.__ct.fail counts what went wrong.

const g = () => window.game;
const D = () => window.game.debug;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const step = async (n = 1) => { for (let i = 0; i < n; i++) await D().step(1, 1 / 60); };
const R = { log: [], fail: 0 };
const ok = (cond, what) => { R.log.push((cond ? 'ok   ' : 'FAIL ') + what); if (!cond) R.fail++; return cond; };
// a key typed on the big screen's keyboard (the engine listens on window)
async function key(code, keyName = code.replace(/^Key/, '').toLowerCase()) {
  window.dispatchEvent(new KeyboardEvent('keydown', { code, key: keyName, bubbles: true }));
  await step(2);
  window.dispatchEvent(new KeyboardEvent('keyup', { code, key: keyName, bubbles: true }));
  await step(1);
}
async function typeText(s) { for (const ch of s) await key(ch === ' ' ? 'Space' : 'Key' + ch.toUpperCase(), ch); }

export async function party(n = 4) {
  for (let i = 0; i < 80 && !(g() && g().world && g().world.overCol); i++) await sleep(250);
  const T = window.T = await import('/tools/partybots.js?' + Date.now());
  const F = await import('/tools/fakepad.js');
  await T.boot(n);
  const P = g().party, b = T.bots;
  // (in the lobby) a keyboard player: E joins, T opens the line, the keys type, Enter sends
  g().input.keys.add('KeyE'); await step(3); g().input.keys.delete('KeyE'); await step(10);
  const kb = P.players.find((p) => p.kind === 'keys');
  if (ok(!!kb, 'a keyboard player joins')) {
    await key('KeyT', 't');
    ok(P.pchat.isOpen(kb) && kb.typing, 'T opens the chat line (and « … » over the hero)');
    await typeText('hi friends');
    await key('Enter', 'Enter');
    await step(4);
    ok(kb.speech === 'hi friends' && !P.pchat.isOpen(kb), 'Enter says it and closes the line');
    await key('KeyT', 't'); await key('Escape', 'Escape');
    ok(!P.pchat.isOpen(kb), 'Esc closes the line');
  }
  // a gamepad: A joins, LB held opens the wheel, the stick points, letting go says it
  F.install(1, 'xbox');
  await F.press(0, 'a'); await step(10);
  const gp = P.players.find((p) => p.kind === 'gamepad');
  if (ok(!!gp, 'a gamepad player joins')) {
    F.set(0, 'lb', true); await step(3);
    ok(P.pchat.isOpen(gp), 'LB held opens the wheel');
    F.stick(0, 0, -1); await step(3);               // up: « Hello! »
    F.set(0, 'lb', false); await step(2); F.stick(0, 0, 0); await step(2);
    ok(gp.speech === 'Hello!', 'letting go says what the stick points at');
    F.set(0, 'lb', true); await step(3); F.set(0, 'x', true); await step(2); F.set(0, 'x', false); await step(2);
    const o = P.pchat.open.get(gp);
    ok(!!(o && o.osk), 'X on the wheel opens the on-screen keys');
    await D().shot('chattest-osk', 2);
    for (const k of ['a', 'a']) await F.press(0, k);   // « Aa »
    await F.press(0, 'select'); await step(120);
    ok(gp.speech && /^aa$/i.test(gp.speech), 'the on-screen keys send a message');
    F.set(0, 'lb', false); await step(2);
  }
  // the adventure: phones
  T.mode('explore');
  for (let i = 0; i < 40; i++) { await sleep(30); await step(10); }
  await T.skipTalk(30);
  b[0].send({ t: 'say', text: 'Hello everyone!' });
  b[1 % n].send({ t: 'quick', id: 'look' });
  await sleep(120); await step(8);
  const me0 = T.me(b[0]), me1 = T.me(b[1 % n]);
  ok(me0 && me0.speech === 'Hello everyone!', 'a phone says a free text');
  ok(me1 && me1.speech === 'Look at that!' && me1.speechTr, 'a quick phrase travels as an id, read in the screen’s language');
  if (n > 2) { b[2].send({ t: 'emote', e: 'wave' }); await sleep(80); await step(6); ok(T.me(b[2]).emote === 'wave', 'an emote shows its icon'); }
  if (n > 3) { b[3].send({ t: 'typing', on: 1 }); await sleep(80); await step(4); ok(T.me(b[3]).typing === true, '« … » while a phone types'); }
  await D().shot('chattest-party', 2);
  if (n > 3) b[3].send({ t: 'typing', on: 0 });
  // the rules: links refused (and the phone told), a flood slowed, repeats dropped
  await step(100);
  b[0].send({ t: 'say', text: 'join me at www.example.com' });
  await sleep(120); await step(4);
  ok(b[0].msgs.some((m) => m.t === 'chatNo' && m.why === 'link'), 'a link is refused, and the phone told why');
  for (let i = 0; i < 5; i++) b[0].send({ t: 'say', text: 'spam ' + i });
  await sleep(150); await step(4);
  ok(b[0].msgs.some((m) => m.t === 'chatNo' && m.why === 'slow'), 'a flood is slowed (1 message per 1.5 s, bursts of 3)');
  ok(b[1 % n].msgs.some((m) => m.t === 'chat' && m.l && m.l.text === 'Hello everyone!'), 'every phone gets the log');
  // the family filter, « quick phrases only »
  g().settings.chat = 'filter';
  await step(200);
  b[0].send({ t: 'say', text: 'what the fuck' });
  await sleep(120); await step(4);
  ok(me0.speech && me0.speech.includes('♥') && !me0.speech.includes('fuck'), 'the family filter hides rude words');
  g().settings.chat = 'quick';
  b[0].send({ t: 'say', text: 'free text please' }); await sleep(120); await step(4);
  ok(b[0].msgs.some((m) => m.t === 'chatNo' && m.why === 'quick'), '« quick phrases only » refuses free text');
  g().settings.chat = 'free';
  ok(!(window.__errs || []).length, '0 errors (' + JSON.stringify((window.__errs || []).slice(0, 2)) + ')');
  return R;
}

export async function solo() {
  for (let i = 0; i < 80 && !(g() && g().world && g().world.overCol); i++) await sleep(250);
  window.__errs = [];
  window.addEventListener('error', (e) => window.__errs.push(String(e.message)));
  D().pause(true);
  await D().newGame('Alex');
  await D().skip(200);
  g().state.flags.wildIntro = true;
  await step(30);
  const W = g().world, me = W.wild.me;
  await key('KeyT', 't');
  ok(W.schat.open && me.typing, 'T opens the chat line in solo');
  await typeText('hello valley');
  await key('Enter', 'Enter');
  await step(4);
  ok(me.speech === 'hello valley', 'the hero says it');
  // a villager close by answers « Hello! » with a wave
  const n = W.npcs.find((q) => q.map === W.mapId && !q.hidden);
  if (n) { W.player.pos = { x: n.pos.x + 1.2, z: n.pos.z }; await step(100); g().chat.post(me, { q: 'hi' }); await step(3); ok(n.emoteKind === 'wave', 'a villager waves back at « Hello! »'); }
  await D().shot('chattest-solo', 2);
  ok(!(window.__errs || []).length, '0 errors (' + JSON.stringify((window.__errs || []).slice(0, 2)) + ')');
  return R;
}

export function start(what = 'party', ...args) {
  R.log = []; R.fail = 0;
  window.__ct = { state: 'run', log: R.log };
  (what === 'solo' ? solo(...args) : party(...args)).then(() => { window.__ct = { state: 'done', fail: R.fail, log: R.log }; })
    .catch((e) => { window.__ct = { state: 'err ' + e + ' ' + String(e && e.stack || '').slice(0, 300), fail: R.fail + 1, log: R.log }; });
  return 'started';
}
