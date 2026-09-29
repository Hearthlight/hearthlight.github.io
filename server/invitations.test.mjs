import test from 'node:test';
import assert from 'node:assert/strict';
import { invitationUrl } from '../src/party/invitations.mjs';

// Deterministic format fixture, never issued by a relay.
const base = 'https://party.example/pad.html', key = 'a1'.repeat(16);

test('joining preserves a controller invitation and its LAN host', () => {
  assert.equal(invitationUrl(' http://192.168.1.12:8787/pad.html#abcd ', base), 'http://192.168.1.12:8787/pad.html#ABCD');
});
test('remote invitations retain the complete video key and the host address', () => {
  assert.equal(invitationUrl(`https://friends.example/play.html#ABCD.${key}`, base), `https://friends.example/play.html#ABCD.${key}`);
  assert.equal(invitationUrl(`https://friends.example/pad.html#ABCD.${key}`, base), `https://friends.example/play.html#ABCD.${key}`);
});
test('a complete short remote invitation uses the configured public host', () => {
  assert.equal(invitationUrl(`abcd.${key.toUpperCase()}`, base), `https://party.example/play.html#ABCD.${key}`);
});
test('invalid invitations never navigate or downgrade a remote link without its key', () => {
  for (const value of ['ABCD', 'https://party.example/play.html#ABCD', `javascript:alert(1)#ABCD.${key}`, `https://user:pass@party.example/play.html#ABCD.${key}`, `https://party.example/login#ABCD.${key}`, 'https://party.example/pad.html#ABCDE', 'https://party.example/pad.html#ABCD.bad']) {
    assert.throws(() => invitationUrl(value, base), /complete invitation/);
  }
});
