import { audio } from '../engine/audio.js';

// Remote play: a friend at home gets a picture of their own — their own camera
// (party.drawRemote), the shared HUD, the dialogue and the scenes — drawn into a canvas of
// theirs and streamed over WebRTC with the game's synthesised sounds; a JPEG trickle through
// the relay while WebRTC can't connect. Only those canvases and the game's audio are sent:
// no desktop, microphone or camera capture.
const OUT_W = 960, OUT_H = 540, FPS = 30;

export class RemoteHost {
  constructor(party) {
    this.party = party; this.peers = new Map();
    this.lastFallback = 0; this.turn = 0;
  }
  start(id, tries = 0) {
    this.stop(id);
    const generation = Array.from(crypto.getRandomValues(new Uint8Array(16)), (n) => n.toString(16).padStart(2, '0')).join('');
    const canvas = document.createElement('canvas'); canvas.width = OUT_W; canvas.height = OUT_H;
    const entry = { pc: null, pending: [], generation, fallback: true, canvas, ctx: canvas.getContext('2d', { alpha: false }), rd: null, last: 0, stream: null, t0: performance.now(), tries };
    this.peers.set(id, entry);
    this.party.net.video(id, true);
    this.offer(id, entry).catch((e) => console.warn('Remote video setup:', e.name, e.message)); // fallback already runs while ICE connects
  }
  async offer(id, entry) {
    if (!entry.canvas.captureStream || !globalThis.RTCPeerConnection) return;
    const stream = entry.stream = entry.canvas.captureStream(FPS);
    const sound = audio.captureStream();
    if (sound) for (const track of sound.getAudioTracks()) stream.addTrack(track.clone());
    const pc = new RTCPeerConnection({ iceServers: this.party.net.iceServers || [] }); entry.pc = pc;
    // ICE candidates can arrive before the offer; the guest needs TURN from the first packet.
    const send = (data) => { if (this.peers.get(id) === entry) this.party.net.send(id, { t: 'rtc', generation: entry.generation, iceServers: this.party.net.iceServers || [], ...data }); };
    pc.onicecandidate = ({ candidate }) => { if (candidate) send({ candidate: candidate.toJSON() }); };
    pc.onconnectionstatechange = () => {
      if (this.peers.get(id) !== entry) return;
      entry.fallback = pc.connectionState !== 'connected'; this.party.net.video(id, entry.fallback);
    };
    for (const track of stream.getTracks()) {
      const sender = pc.addTrack(track, stream);
      if (track.kind === 'video') { const params = sender.getParameters(); params.encodings = [{ maxBitrate: 1800000, maxFramerate: FPS }]; await sender.setParameters(params).catch(() => {}); }
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
  // a pair of canvases with the big screen's sizes, for party.drawRemote (its methods and
  // sizes come from the big screen's display: Object.create keeps them live)
  display(entry) {
    const d = this.party.game.display;
    let rd = entry.rd;
    if (!rd) {
      rd = entry.rd = Object.create(d);
      rd.worldCanvas = document.createElement('canvas'); rd.canvas = document.createElement('canvas');
      rd.wctx = rd.worldCanvas.getContext('2d', { alpha: false }); rd.ctx = rd.canvas.getContext('2d');
    }
    if (rd.worldCanvas.width !== d.ww || rd.worldCanvas.height !== d.wh) { rd.worldCanvas.width = d.ww; rd.worldCanvas.height = d.wh; rd.wctx.imageSmoothingEnabled = false; }
    if (rd.canvas.width !== d.w || rd.canvas.height !== d.h) { rd.canvas.width = d.w; rd.canvas.height = d.h; rd.ctx.imageSmoothingEnabled = false; }
    return rd;
  }
  // after the big screen's frame: the stalest pictures first, two at most a frame
  capture() {
    if (!this.peers.size) return;
    const now = performance.now(), P = this.party;
    // (a video link that hasn't come up in 8 s gets a fresh offer — twice; the JPEGs go on meanwhile)
    for (const [id, e] of this.peers) if (e.pc && e.pc.connectionState !== 'connected' && now - e.t0 > 8000 && e.tries < 2) { this.start(id, e.tries + 1); return; }
    const due = [...this.peers].filter(([, e]) => now - e.last >= 1000 / FPS - 4).sort((a, b) => a[1].last - b[1].last).slice(0, 2);
    for (const [id, e] of due) {
      e.last = now;
      const p = P.byId.get(id), rd = this.display(e);
      // (not in the party yet — full, or still joining: the big screen's own picture)
      this.compose(e, p && p.connected && P.drawRemote(p, rd) ? rd : P.game.display);
    }
    const slow = [...this.peers].filter(([, e]) => e.fallback);
    if (!this.encoding && slow.length && now - this.lastFallback >= 125) {
      this.lastFallback = now; this.encoding = true;
      const [id, e] = slow[this.turn++ % slow.length];
      e.canvas.toBlob((blob) => { this.encoding = false; if (blob && blob.size <= 128 * 1024 && this.peers.get(id) === e) this.party.net.frame(blob, id); }, 'image/jpeg', 0.6);
    }
  }
  // both layers, each at its own scale, centred as on the big screen
  compose(e, src) {
    const d = this.party.game.display, ctx = e.ctx;
    const k = Math.min(OUT_W / d.devW, OUT_H / d.devH);
    ctx.fillStyle = '#14121c'; ctx.fillRect(0, 0, OUT_W, OUT_H); ctx.imageSmoothingEnabled = false;
    const put = (cv, s) => { const w = cv.width * s * k, h = cv.height * s * k; ctx.drawImage(cv, Math.round((OUT_W - w) / 2), Math.round((OUT_H - h) / 2), Math.round(w), Math.round(h)); };
    put(src.worldCanvas, d.wscale); put(src.canvas, d.scale);
  }
  stop(id) {
    const entry = this.peers.get(id); if (!entry) return;
    this.peers.delete(id); entry.pc?.close(); this.party.net.video(id, false);
    if (entry.stream) entry.stream.getTracks().forEach((track) => track.stop());
  }
  dispose() { for (const id of [...this.peers.keys()]) this.stop(id); }
}
