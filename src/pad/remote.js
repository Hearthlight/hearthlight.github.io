import { t, onLang } from '../i18n.js';

export class RemoteGuest {
  constructor(state, send, controls) {
    this.state = state; this.send = send; this.controls = controls;
    this.video = document.getElementById('remote-video'); this.fallback = document.getElementById('remote-fallback');
    this.status = document.getElementById('remote-status'); this.keys = new Set(); this.held = {}; this.pending = []; this.pc = null;
    this.key = location.hash.slice(1).split('.')[1] || ''; this.lastInput = 0;
    document.getElementById('remote-retry').onclick = () => { this.disconnect(); this.controls.retry(); };
    const sound = document.getElementById('remote-sound');
    sound.onclick = () => { this.video.muted = !this.video.muted; this.video.play().catch(() => {}); sound.textContent = t(this.video.muted ? 'Enable sound' : 'Mute sound'); };
    document.getElementById('remote-fullscreen').onclick = () => document.documentElement.requestFullscreen?.().catch(() => {});
    const label = () => { document.getElementById('remote-retry').textContent = t('Reconnect'); sound.textContent = t(this.video.muted ? 'Enable sound' : 'Mute sound'); document.getElementById('remote-fullscreen').textContent = t('Fullscreen'); document.getElementById('remote-help').textContent = t('Move: WASD / arrows · E: action · Space: jump · F: special · R: dodge · G: ultimate · Tab: menu · T: chat'); };
    label(); onLang(label);
    window.addEventListener('keydown', (e) => {
      if (/INPUT|TEXTAREA/.test(e.target.tagName) || (e.target.tagName === 'BUTTON' && ['Space', 'Enter'].includes(e.code))) return;
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Tab','KeyW','KeyA','KeyS','KeyD','KeyE','KeyF','KeyR','KeyG','Enter'].includes(e.code)) { e.preventDefault(); this.keys.add(e.code); }
      if (e.code === 'Tab' && !e.repeat) this.controls.menu();
      // (T: say something — the chat sheet, its line ready to type in)
      if (e.code === 'KeyT' && !e.repeat && state.joined && this.controls.chat) { e.preventDefault(); this.controls.chat(); }
      if (e.code === 'Enter' && !e.repeat && state.joined && state.phase === 'lobby') this.controls.ready();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.release());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.release(); });
    this.video.onplaying = () => { this.fallback.hidden = true; this.video.hidden = false; this.status.textContent = t('Connected · live video'); };
  }
  release() {
    this.keys.clear(); this.send({ t: 'in', x: 0, y: 0 });
    for (const k of Object.keys(this.held)) if (this.held[k]) this.send({ t: 'b', k, v: false });
    this.held = {}; this.lastVector = ''; this.wasDriving = false;
  }
  disconnect() { this.release(); this.pc?.close(); this.pc = null; this.video.srcObject = null; this.pending = []; this.generation = null; this.lastVideoTime = 0; this.status.textContent = t('Waiting for the host…'); }
  async message(m) {
    if (m.t === 'hello') this.iceServers = m.iceServers || [];
    if (m.t === 'hostgone' || m.t === 'ended') this.disconnect();
    if (m.t === 'error') this.status.textContent = t(m.code === 'nogame' ? 'The party has ended. Ask the host for a new invitation.' : 'Video reconnecting…');
    if (m.t === 'remoteError') { this.status.textContent = t(m.message); return; }
    if (m.iceServers && m.t === 'rtc') this.iceServers = m.iceServers;
    if (m.t !== 'rtc' || typeof m.generation !== 'string') return;
    if (!globalThis.RTCPeerConnection) return;
    if (this.generation !== m.generation) {
      this.pc?.close(); this.generation = m.generation; this.pending = [];
      const pc = new RTCPeerConnection({ iceServers: this.iceServers || [] }); this.pc = pc;
      pc.onicecandidate = ({ candidate }) => { if (candidate && this.pc === pc) this.send({ t: 'rtc', generation: m.generation, candidate: candidate.toJSON() }); };
      pc.ontrack = ({ streams, track }) => { if (this.pc !== pc) return; this.video.srcObject = streams[0] || new MediaStream([track]); this.video.play().catch(() => {}); };
      pc.onconnectionstatechange = () => { if (this.pc === pc && ['failed', 'disconnected'].includes(pc.connectionState)) this.status.textContent = t('Video reconnecting…'); };
    }
    const pc = this.pc;
    try {
      if (m.description?.type === 'offer' && typeof m.description.sdp === 'string' && m.description.sdp.length < 15000) {
        await pc.setRemoteDescription(m.description);
        for (const candidate of this.pending.splice(0)) await pc.addIceCandidate(candidate);
        await pc.setLocalDescription(await pc.createAnswer());
        this.send({ t: 'rtc', generation: m.generation, description: { type: pc.localDescription.type, sdp: pc.localDescription.sdp } });
      } else if (m.candidate && typeof m.candidate.candidate === 'string' && m.candidate.candidate.length < 2048) {
        if (pc.remoteDescription) await pc.addIceCandidate(m.candidate); else if (this.pending.length < 32) this.pending.push(m.candidate);
      }
    } catch (e) { console.warn('Remote video answer:', e.name, e.message); this.status.textContent = t('Using the backup connection · reduced frame rate, no sound'); }
  }
  async frame(blob) {
    if (this.decoding || blob.size > 128 * 1024) return;
    // A working RTC video wins over relay images.
    if (this.pc?.connectionState === 'connected' && this.video.readyState >= 2) return;
    this.decoding = true;
    try {
      const image = await createImageBitmap(blob);
      if (image.width <= 1280 && image.height <= 720) {
        const canvas = this.fallback; canvas.width = image.width; canvas.height = image.height;
        canvas.getContext('2d').drawImage(image, 0, 0); canvas.hidden = false; this.video.hidden = true;
        this.status.textContent = t('Using the backup connection · reduced frame rate, no sound');
      }
      image.close();
    } catch { /* drop a damaged image */ }
    finally { this.decoding = false; }
  }
  update(now) {
    if (!this.state.joined || this.state.status !== 'open' || this.state.hostGone) return;
    const gamepad = Array.from(navigator.getGamepads?.() || []).find(Boolean);
    const press = (i) => !!gamepad?.buttons[i]?.pressed;
    if (press(8) && !this.menuDown) this.controls.menu(); this.menuDown = press(8);
    if (press(9) && !this.startDown && this.state.phase === 'lobby') this.controls.ready(); this.startDown = press(9);
    if (this.state.menu || this.state.view === 'look' || this.state.screen === 'choice') { if (this.wasDriving) this.release(); return; }
    let x = (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0) - (this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0);
    let y = (this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0) - (this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0);
    if (gamepad) { const gx = gamepad.axes[0] || 0, gy = gamepad.axes[1] || 0; if (Math.hypot(gx, gy) > 0.18) { x = gx; y = gy; } if (press(14)) x = -1; if (press(15)) x = 1; if (press(12)) y = -1; if (press(13)) y = 1; }
    const len = Math.max(1, Math.hypot(x, y)); x = Math.round(x / len * 100) / 100; y = Math.round(y / len * 100) / 100;
    const buttons = { a: this.keys.has('KeyE') || this.keys.has('Enter') || press(0), b: this.keys.has('Space') || press(1), x: this.keys.has('KeyF') || press(2), y: this.keys.has('KeyR') || press(3), u: this.keys.has('KeyG') || press(11) };
    const active = !!(x || y || Object.values(buttons).some(Boolean));
    if (active || this.wasDriving) {
      const vector = `${x},${y}`;
      if (now - this.lastInput >= 33 && (this.lastVector !== vector || now - this.lastInput > 150)) { this.send({ t: 'in', x, y }); this.lastVector = vector; this.lastInput = now; }
      for (const [key, value] of Object.entries(buttons)) if (!!this.held[key] !== value) this.send({ t: 'b', k: key, v: value });
      this.held = buttons;
    }
    // (keep driving until the stop itself went out: a release inside the throttle is sent next time)
    this.wasDriving = active || (this.lastVector !== '0,0' && !!this.lastVector);
  }
}
