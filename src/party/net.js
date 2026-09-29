// Party Mode networking (big-screen side). Talks to a relay (the dev server's /ws, the desktop
// app's, or the online one named in config.js): we host a room with a 4-letter code, phones join
// it as pads.

const CFG = (typeof window !== 'undefined' && window.HEARTHLIGHT) || {};
// the relay's address (`query`: role, code, id)
export function relayUrl(query, override) {
  const base = override || CFG.relay || `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;
  return `${base}?${query}`;
}

export class PartyNet {
  constructor() {
    this.code = null;
    this.status = 'off';     // off | connecting | open | down | unavailable
    this.lan = null;         // { ips, port, open }
    this.onJoin = null;      // (padId)
    this.onLeave = null;     // (padId)
    this.onMsg = null;       // (padId, data)
    this.retry = 0;
    this.ws = null;
  }

  async start({ online = false } = {}) {
    this.override = online ? CFG.onlineRelay || CFG.relay : null;
    this.stopped = false;
    // (online: the relay is elsewhere and the phones open the public phone page)
    this.remote = !!(this.override || CFG.relay);
    if (!this.remote) {
      try {
        const r = await fetch('/__lan', { cache: 'no-store' });
        this.lan = r.ok ? await r.json() : null;
      } catch (e) { this.lan = null; }
      if (!this.lan) { this.status = 'unavailable'; return; }
    }
    this.connect();
  }

  connect() {
    if (this.stopped) return;
    clearTimeout(this.retryT);
    let prev = '', token = '';
    try { prev = sessionStorage.getItem('hl.partyCode') || ''; token = sessionStorage.getItem('hl.partyToken') || ''; } catch (e) { /* ignore */ }
    this.status = 'connecting';
    const ws = new WebSocket(relayUrl(`role=host${prev ? '&code=' + prev : ''}`, this.override));
    this.ws = ws;
    // The owner secret travels in a WebSocket frame, never in a URL or HTTP access log.
    ws.onopen = () => { if (prev) ws.send(JSON.stringify({ t: 'resume', token })); };
    ws.onmessage = (e) => {
      let m;
      try { m = JSON.parse(e.data); } catch (err) { return; }
      if (!m || typeof m !== 'object') return;
      if (m.t === 'room') {
        this.code = m.code; this.remoteKey = m.remoteKey || ''; this.remoteSupported = !!m.remote; this.addressed = m.frames >= 2; this.iceServers = m.iceServers || []; this.status = 'open'; this.retry = 0;
        if (this.onRoom) this.onRoom(m);
        try { sessionStorage.setItem('hl.partyCode', m.code); sessionStorage.setItem('hl.partyToken', m.token || ''); } catch (err) { /* ignore */ }
      } else if (m.t === 'error') {
        // (the online relay has no room left: say so, and knock again in a while)
        this.status = m.code === 'busy' ? 'full' : 'down';
        this.retry = Math.max(this.retry, 6);
      } else if (m.t === 'join') { if (this.onJoin) this.onJoin(m.id); }
      else if (m.t === 'leave') { if (this.onLeave) this.onLeave(m.id); }
      else if (m.t === 'msg') { if (this.onMsg) this.onMsg(m.id, m.d); }
    };
    ws.onclose = (event) => {
      if (this.ws !== ws) return;
      this.ws = null;
      if (this.stopped) return;
      if (event.code === 1008) { try { sessionStorage.removeItem('hl.partyCode'); sessionStorage.removeItem('hl.partyToken'); } catch (e) { /* ignore */ } }
      if (this.status !== 'full') this.status = 'down';
      this.retryT = setTimeout(() => this.connect(), this.status === 'full' ? 30000 : Math.min(4000, 400 + this.retry++ * 600));
    };
  }

  stop() {
    this.stopped = true;
    clearTimeout(this.retryT);
    if (this.ws) { const ws = this.ws; this.ws = null; if (ws.readyState === 1) ws.send(JSON.stringify({ t: 'end' })); ws.close(); }
    try { sessionStorage.removeItem('hl.partyCode'); sessionStorage.removeItem('hl.partyToken'); } catch {}
    this.code = null;
    this.status = 'off';
  }

  send(id, d) {
    if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify({ t: 'send', id, d }));
  }

  broadcast(d) { this.send('*', d); }

  kick(id) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify({ t: 'kick', id })); }

  video(id, on) { if (this.ws?.readyState === 1) this.ws.send(JSON.stringify({ t: 'remote', id, on })); }

  // a JPEG for one friend at home (a relay that knows addressed frames: [1, id length, id…]
  // before the picture; an older one hands it to every remote viewer)
  frame(blob, id) {
    if (this.ws?.readyState !== 1 || this.ws.bufferedAmount >= 128 * 1024) return;
    if (!id || !this.addressed) { this.ws.send(blob); return; }
    const head = new TextEncoder().encode(id).slice(0, 64), b = new Uint8Array(2 + head.length);
    b[0] = 1; b[1] = head.length; b.set(head, 2);
    this.ws.send(new Blob([b, blob]));
  }

  get playUrl() {
    if (!this.joinUrl || !this.remoteKey) return '';
    const url = new URL(this.joinUrl); url.pathname = url.pathname.replace(/pad\.html$/, 'play.html'); url.hash = this.code + '.' + this.remoteKey; return url.href;
  }

  // the address phones should open (LAN IP, never "localhost"; online, the public phone page)
  get joinUrl() {
    if (!this.code) return '';
    if (this.override && CFG.onlinePad) return `${CFG.onlinePad}#${this.code}`;
    if (CFG.pad) return `${CFG.pad}#${this.code}`;
    if (this.remote) return `${location.origin}${location.pathname.replace(/[^/]*$/, '')}pad.html#${this.code}`;
    const ip = (this.lan && this.lan.ips && this.lan.ips[0]) || location.hostname;
    const port = (this.lan && this.lan.port) || location.port;
    return `http://${ip}${port && port !== '80' ? ':' + port : ''}/pad.html#${this.code}`;
  }
}
