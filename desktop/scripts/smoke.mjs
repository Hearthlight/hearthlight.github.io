// Start the packaged application, verify the game loaded and exercise its bundled relay.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import WebSocket from 'ws';

const root = path.resolve(import.meta.dirname, '..');
const binaries = {
  darwin: 'dist/mac-universal/Hearthlight.app/Contents/MacOS/Hearthlight',
  win32: 'dist/win-unpacked/Hearthlight.exe',
  linux: 'dist/linux-unpacked/hearthlight',
};
const executable = path.join(root, binaries[process.platform]);
if (!fs.existsSync(executable)) throw new Error('Packaged application missing: ' + executable);
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hearthlight-smoke-'));
const screenshot = path.join(dir, 'game.png'), result = path.join(dir, 'game.json');
// Ubuntu's hosted CI runner needs Xvfb and cannot run Chromium's OS sandbox. This flag applies
// only to this isolated test process, never to the packaged app's normal launch configuration.
const headless = process.platform === 'linux' && process.env.CI === 'true';
const child = spawn(headless ? 'xvfb-run' : executable, headless ? ['-a', executable, '--no-sandbox'] : [], {
  env: { ...process.env, HEARTHLIGHT_SELFTEST: screenshot }, stdio: 'inherit',
});
let exited = false;
child.once('exit', () => { exited = true; });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const peers = [];
try {
  const deadline = Date.now() + 75000;
  while (!fs.existsSync(result) && Date.now() < deadline && !exited) await wait(200);
  if (!fs.existsSync(result)) throw new Error('Packaged app did not produce its self-test result');
  const info = JSON.parse(fs.readFileSync(result, 'utf8'));
  if (!info.ok) throw new Error('Packaged game failed to load');
  const host = new WebSocket(`ws://127.0.0.1:${info.port}/ws?role=host`); peers.push(host);
  const room = JSON.parse((await once(host, 'message'))[0]);
  if (room.t !== 'room') throw new Error('Bundled relay did not create a room');
  const pad = new WebSocket(`ws://127.0.0.1:${info.port}/ws?role=pad&code=${room.code}&id=smoke`); peers.push(pad);
  await once(pad, 'message');
  const received = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Bundled relay timeout')), 3000);
    host.on('message', (d) => { const m = JSON.parse(d); if (m.t === 'msg' && m.d.t === 'smoke') { clearTimeout(timer); resolve(); } });
  });
  pad.send(JSON.stringify({ t: 'smoke' })); await received;
  console.log(JSON.stringify({ gameLoaded: true, relayPassed: true, version: info.version, electron: info.electron }));
} finally {
  for (const peer of peers) peer.terminate();
  if (!exited) child.kill();
  fs.rmSync(dir, { recursive: true, force: true });
}
