import { audio } from '../engine/audio.js';

// Remote play streams only the two game canvases and generated game audio.
// No desktop, microphone or camera capture is used.
export class RemoteHost {
  constructor(party) {
    this.party = party; this.peers = new Map();
    this.canvas = document.createElement('canvas'); this.canvas.width = 960; this.canvas.height = 540;
    this.ctx = this.canvas.getContext('2d', { alpha: false }); this.lastFrame = 0; this.lastFallback = 0;
  }
  start(id) {
    this.stop(id);
    const entry = { pc: null, pending: [], generation: crypto.randomUUID(), fallback: true };
    this.peers.set(id, entry);
    this.party.net.video(id, true);
    this.offer(id, entry).catch((e) => console.warn('Remote video setup:', e.name, e.message)); // fallback already runs while ICE connects
  }
  async offer(id, entry) {
    if (!this.canvas.captureStream || !globalThis.RTCPeerConnection) return;
    if (!this.stream) {
      this.stream = this.canvas.captureStream(30);
      const sound = audio.captureStream();
      if (sound) for (const track of sound.getAudioTracks()) this.stream.addTrack(track.clone());
    }
    const pc = new RTCPeerConnection({ iceServers: this.party.net.iceServers || [] }); entry.pc = pc;
    // ICE candidates can arrive before the offer; the guest needs TURN from the first packet.
    const send = (data) => { if (this.peers.get(id) === entry) this.party.net.send(id, { t: 'rtc', generation: entry.generation, iceServers: this.party.net.iceServers || [], ...data }); };
    pc.onicecandidate = ({ candidate }) => { if (candidate) send({ candidate: candidate.toJSON() }); };
    pc.onconnectionstatechange = () => {
      if (this.peers.get(id) !== entry) return;
      entry.fallback = pc.connectionState !== 'connected'; this.party.net.video(id, entry.fallback);
    };
    for (const track of this.stream.getTracks()) {
      const sender = pc.addTrack(track, this.stream);
      if (track.kind === 'video') { const params = sender.getParameters(); params.encodings = [{ maxBitrate: 1800000, maxFramerate: 30 }]; await sender.setParameters(params).catch(() => {}); }
    }
    await pc.setLocalDescription(await pc.createOffer()); send({ iceServers: this.party.net.iceServers || [], description: { type: pc.localDescription.type, sdp: pc.localDescription.sdp } });
  }
  async signal(id, data) {
    const entry = this.peers.get(id);
    if (!entry?.pc || data.generation !== entry.generation) return;
    const pc = entry.pc;
    try {
      if (data.description?.type === 'answer' && typeof data.description.sdp === 'string' && data.description.sdp.length < 15000) {
        await pc.setRemoteDescription(data.description);
        for (const candidate of entry.pending.splice(0)) await pc.addIceCandidate(candidate);
      } else if (data.candidate && typeof data.candidate.candidate === 'string' && data.candidate.candidate.length < 2048) {
        if (pc.remoteDescription) await pc.addIceCandidate(data.candidate); else if (entry.pending.length < 32) entry.pending.push(data.candidate);
      }
    } catch (e) { console.warn('Remote video signal:', e.name, e.message); }
  }
  capture() {
    if (!this.peers.size) return;
    const now = performance.now(); if (now - this.lastFrame < 1000 / 30) return; this.lastFrame = now;
    const d = this.party.display, ctx = this.ctx, cv = this.canvas;
    const ratio = Math.min(cv.width / d.devW, cv.height / d.devH), w = d.devW * ratio, h = d.devH * ratio, x = (cv.width - w) / 2, y = (cv.height - h) / 2;
    ctx.fillStyle = '#14121c'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(d.worldCanvas, x, y, w, h); ctx.drawImage(d.canvas, x, y, w, h);
    if (!this.encoding && now - this.lastFallback >= 125 && [...this.peers.values()].some((p) => p.fallback)) {
      this.lastFallback = now; this.encoding = true;
      cv.toBlob((blob) => { this.encoding = false; if (blob && blob.size <= 128 * 1024 && this.peers.size) this.party.net.frame(blob); }, 'image/jpeg', 0.6);
    }
  }
  stop(id) {
    const entry = this.peers.get(id); if (!entry) return;
    this.peers.delete(id); entry.pc?.close(); this.party.net.video(id, false);
    if (!this.peers.size && this.stream) { this.stream.getTracks().forEach((t) => t.stop()); this.stream = null; }
  }
  dispose() { for (const id of [...this.peers.keys()]) this.stop(id); }
}
