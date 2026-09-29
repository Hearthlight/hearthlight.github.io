import test from 'node:test';
import assert from 'node:assert/strict';
import { SessionRecovery } from '../src/session.mjs';

function fixture() {
  const data = new Map(), listeners = new Map();
  const storage = { getItem: (k) => data.get(k) || null, setItem: (k, v) => data.set(k, v), removeItem: (k) => data.delete(k) };
  const events = { addEventListener: (k, fn) => listeners.set(k, fn), removeEventListener: (k) => listeners.delete(k) };
  let state = { mode: 'game' }, saves = 0, fail = false;
  const recovery = new SessionRecovery({ events, storage: () => storage, snapshot: () => state, save: () => { saves++; if (fail) throw new Error('disk full'); } });
  return { recovery, storage, events, data, set: (v) => { state = v; }, fail: () => { fail = true; }, saves: () => saves,
    emit: (k, e = {}) => listeners.get(k)?.(e), has: (k) => listeners.has(k) };
}

test('an accidental reload saves first and asks; cancelling leaves the session protected', () => {
  const f = fixture(); f.recovery.setActive(true);
  const e = { prevented: false, preventDefault() { this.prevented = true; } };
  f.emit('beforeunload', e);
  assert.equal(e.prevented, true); assert.equal(e.returnValue, ''); assert.equal(f.saves(), 1);
  assert.equal(f.has('beforeunload'), true);
  assert.deepEqual(f.recovery.take('reload'), { mode: 'game' });
  assert.equal(f.recovery.take('reload'), null);
});

test('returning to the title clears recovery and never asks to leave the menu', () => {
  const f = fixture(); f.recovery.setActive(true); f.emit('pagehide');
  f.recovery.setActive(false); f.emit('pagehide');
  assert.equal(f.saves(), 1); assert.equal(f.has('beforeunload'), false);
  assert.equal(f.recovery.take('reload'), null);
});

test('a party reload restores the activity, relay choice and local controls without copying credentials', () => {
  const f = fixture(); f.recovery.setActive(true);
  f.set({ mode: 'party', online: true, activity: 'waves', locals: [{kind:'keys',layout:'arrows'}, {kind:'gamepad',index:2}, {kind:'phone',secret:'not-a-local-player'}, {kind:'keys',layout:'invalid'}] });
  f.emit('pagehide');
  assert.deepEqual(f.recovery.take('reload'), { mode: 'party', online: true, activity:'waves', locals:[{kind:'keys',layout:'arrows'}, {kind:'gamepad',index:2}] });
});

test('ordinary navigation, stale data and malformed recovery never auto-start a game', () => {
  const f = fixture(); f.recovery.setActive(true);
  assert.equal(f.recovery.take('navigate'), null);
  f.recovery.remember(); assert.equal(f.recovery.take('back_forward'), null);
  f.storage.setItem('hearthlight.reload.v1', '{'); assert.equal(f.recovery.take('reload'), null);
  f.storage.setItem('hearthlight.reload.v1', JSON.stringify({mode:'game',savedAt:Date.now()-2*86400000})); assert.equal(f.recovery.take('reload'), null);
});

test('storage failures do not disable the leave confirmation', () => {
  const f = fixture(); f.recovery.setActive(true); f.fail();
  let asked = false; f.emit('beforeunload', { preventDefault() { asked = true; } });
  assert.equal(asked, true);
  const r = new SessionRecovery({ events:f.events, storage: () => { throw new Error('blocked'); }, save:()=>{}, snapshot:()=>({mode:'game'}) });
  assert.doesNotThrow(() => r.setActive(true)); assert.equal(r.take('reload'), null);
});
