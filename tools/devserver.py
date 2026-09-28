#!/usr/bin/env python3
"""Tiny dev server for Hearthlight (standard library only).

- Serves the project statically with caching disabled.
- POST /__shot?name=<file> with a PNG body saves ./screenshots/<file>.png
  (the in-game debug hook `game.debug.shot('name')`; localhost only).
- POST /__rec?op=open|frame|close|save&name=<clip> records a video clip for
  tools/reel.js: raw RGBA frames are piped into ffmpeg (lossless, optionally
  upscaled with nearest-neighbour) as ./screenshots/reel/<clip>.mkv; `save`
  writes the body as ./screenshots/reel/<name> (the clip's audio log, a WAV…).
- GET /__lan returns the machine's LAN address so the party lobby can show
  phones where to connect.
- /ws is a small WebSocket relay for Party Mode: the big screen joins as the
  "host" of a room with a 4-letter code, phones join as "pads" with that code.
  Pad messages are forwarded to the host, the host can message any pad.

Usage: python3 tools/devserver.py [port] [--local]
  --local  only listen on this machine (phones won't be able to join)
"""
import base64
import hashlib
import json
import os
import random
import re
import shutil
import socket
import struct
import subprocess
import sys
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOTS = os.path.join(ROOT, "screenshots")
REELS = os.path.join(SHOTS, "reel")
WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ"
MAX_PADS = 16
MAX_FRAME = 1 << 20


def lan_ips():
    """Best guess at the addresses other devices on the network can reach."""
    ips = []
    for probe in ("10.255.255.255", "192.168.255.255", "8.8.8.8"):
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect((probe, 1))  # UDP connect sends nothing, it just picks a route
            ip = s.getsockname()[0]
            s.close()
            if ip and not ip.startswith("127.") and ip not in ips:
                ips.append(ip)
        except OSError:
            pass
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ip = info[4][0]
            if not ip.startswith("127.") and ip not in ips:
                ips.append(ip)
    except OSError:
        pass
    return ips


# ---------------------------------------------------------------- websockets
class WsConn:
    def __init__(self, sock, role, cid):
        self.sock = sock
        self.role = role
        self.id = cid
        self.lock = threading.Lock()
        self.alive = True

    def _send(self, opcode, data):
        n = len(data)
        head = bytearray([0x80 | opcode])
        if n < 126:
            head.append(n)
        elif n < 65536:
            head.append(126)
            head += struct.pack("!H", n)
        else:
            head.append(127)
            head += struct.pack("!Q", n)
        with self.lock:
            if not self.alive:
                return
            try:
                self.sock.sendall(bytes(head) + data)
            except OSError:
                self.alive = False

    def send(self, text):
        self._send(0x1, text.encode("utf-8"))

    def send_json(self, obj):
        self.send(json.dumps(obj, separators=(",", ":")))

    def close(self):
        if self.alive:
            self._send(0x8, b"")
        self.alive = False
        try:
            self.sock.shutdown(socket.SHUT_RDWR)
        except OSError:
            pass


class Room:
    def __init__(self, code):
        self.code = code
        self.host = None
        self.pads = {}


ROOMS = {}
ROOMS_LOCK = threading.Lock()
RECS = {}
RECS_LOCK = threading.Lock()


def rec(op, q, data):
    """Video clips for tools/reel.js: ffmpeg eats the raw frames as they come."""
    name = re.sub(r"[^a-zA-Z0-9_\-.]", "_", q.get("name", ["clip"])[0])[:80].lstrip(".") or "clip"
    os.makedirs(REELS, exist_ok=True)
    path = os.path.join(REELS, name)
    with RECS_LOCK:
        if op == "save":
            with open(path, "wb") as f:
                f.write(data)
            return path
        cur = RECS.pop(name, None) if op in ("open", "close") else RECS.get(name)
        if cur is not None and op in ("open", "close"):
            cur.stdin.close()
            cur.wait()
        if op == "open":
            w, h, fps, up = (int(q.get(k, [d])[0]) for k, d in (("w", 480), ("h", 270), ("fps", 30), ("up", 1)))
            cmd = [shutil.which("ffmpeg") or "/opt/homebrew/bin/ffmpeg", "-y", "-loglevel", "error",
                   "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{w}x{h}", "-r", str(fps), "-i", "-"]
            if up > 1:
                cmd += ["-vf", f"scale={w * up}:{h * up}:flags=neighbor"]
            cmd += ["-c:v", "libx264rgb", "-preset", "ultrafast", "-qp", "0", path + ".mkv"]
            RECS[name] = subprocess.Popen(cmd, stdin=subprocess.PIPE)
        elif op == "frame":
            if cur is None:
                raise ValueError("no clip open: " + name)
            cur.stdin.write(data)
        return path + ".mkv"


def new_code():
    for _ in range(1000):
        code = "".join(random.choice(CODE_CHARS) for _ in range(4))
        if code not in ROOMS:
            return code
    raise RuntimeError("no free room codes")


def recv_exact(sock, n):
    buf = bytearray()
    while len(buf) < n:
        chunk = sock.recv(n - len(buf))
        if not chunk:
            raise ConnectionError("closed")
        buf += chunk
    return bytes(buf)


def read_message(conn):
    """Next complete text message, or None when the socket closes."""
    parts = []
    while True:
        b1, b2 = recv_exact(conn.sock, 2)
        fin, op = b1 & 0x80, b1 & 0x0F
        n = b2 & 0x7F
        if n == 126:
            n = struct.unpack("!H", recv_exact(conn.sock, 2))[0]
        elif n == 127:
            n = struct.unpack("!Q", recv_exact(conn.sock, 8))[0]
        if n > MAX_FRAME:
            raise ConnectionError("frame too large")
        mask = recv_exact(conn.sock, 4) if b2 & 0x80 else None
        data = recv_exact(conn.sock, n)
        if mask:
            data = bytes(b ^ mask[i & 3] for i, b in enumerate(data))
        if op == 0x8:
            return None
        if op == 0x9:
            conn._send(0xA, data)
            continue
        if op == 0xA:
            continue
        parts.append(data)
        if fin:
            return b"".join(parts).decode("utf-8", "replace")


class Handler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".js": "application/javascript",
        ".mjs": "application/javascript",
        ".json": "application/json",
        ".png": "image/png",
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, max-age=0")
        super().end_headers()

    def is_local(self):
        return self.client_address[0] in ("127.0.0.1", "::1", "::ffff:127.0.0.1")

    def send_body(self, code, body, ctype="text/plain"):
        data = body.encode() if isinstance(body, str) else body
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        url = urlparse(self.path)
        if url.path == "/ws":
            if self.headers.get("Upgrade", "").lower() == "websocket":
                self.handle_ws(parse_qs(url.query))
            else:
                self.send_error(400, "WebSocket endpoint")
            return
        if url.path == "/__lan":
            port = self.server.server_address[1]
            self.send_body(200, json.dumps({"ips": lan_ips(), "port": port, "open": self.server.lan_open}), "application/json")
            return
        super().do_GET()

    def do_POST(self):
        url = urlparse(self.path)
        if url.path not in ("/__shot", "/__rec"):
            self.send_error(404)
            return
        if not self.is_local():
            self.send_error(403)
            return
        if url.path == "/__rec":
            q = parse_qs(url.query)
            data = self.rfile.read(int(self.headers.get("Content-Length", "0")))
            try:
                self.send_body(200, rec(q.get("op", [""])[0], q, data))
            except (OSError, ValueError) as err:
                self.send_body(500, str(err))
            return
        name = parse_qs(url.query).get("name", ["shot"])[0]
        name = re.sub(r"[^a-zA-Z0-9_\-]", "_", name)[:80] or "shot"
        length = int(self.headers.get("Content-Length", "0"))
        data = self.rfile.read(length)
        os.makedirs(SHOTS, exist_ok=True)
        path = os.path.join(SHOTS, name + ".png")
        with open(path, "wb") as f:
            f.write(data)
        self.send_body(200, path)

    # -------------------------------------------------------- party relay
    def handle_ws(self, q):
        key = self.headers.get("Sec-WebSocket-Key", "")
        accept = base64.b64encode(hashlib.sha1((key + WS_GUID).encode()).digest()).decode()
        self.wfile.write(
            b"HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n"
            + b"Sec-WebSocket-Accept: " + accept.encode() + b"\r\n\r\n"
        )
        self.wfile.flush()
        self.close_connection = True
        sock = self.connection
        sock.settimeout(None)
        try:
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_KEEPALIVE, 1)
            sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
        except OSError:
            pass
        role = q.get("role", ["pad"])[0]
        code = re.sub(r"[^A-Z]", "", q.get("code", [""])[0].upper())[:4]
        if role == "host":
            self.run_host(sock, code)
        else:
            cid = re.sub(r"[^a-zA-Z0-9_\-]", "", q.get("id", [""])[0])[:40] or ("p%06d" % random.randint(0, 999999))
            self.run_pad(sock, code, cid)

    def run_host(self, sock, code):
        conn = WsConn(sock, "host", "host")
        with ROOMS_LOCK:
            room = ROOMS.get(code) if code else None
            if room is None or (room.host is not None and room.host.alive):
                room = Room(code if code and code not in ROOMS else new_code())
                ROOMS[room.code] = room
            old = room.host
            room.host = conn
            pads = list(room.pads.values())
        if old is not None:
            old.close()
        conn.send_json({"t": "room", "code": room.code})
        for p in pads:
            conn.send_json({"t": "join", "id": p.id})
            p.send_json({"t": "hostback"})
        try:
            while True:
                text = read_message(conn)
                if text is None:
                    break
                try:
                    msg = json.loads(text)
                except ValueError:
                    continue
                if msg.get("t") == "send":
                    payload = json.dumps(msg.get("d"), separators=(",", ":"))
                    target = msg.get("id")
                    with ROOMS_LOCK:
                        pads = list(room.pads.values()) if target == "*" else [room.pads[target]] if target in room.pads else []
                    for p in pads:
                        p.send(payload)
                elif msg.get("t") == "kick":
                    with ROOMS_LOCK:
                        p = room.pads.pop(msg.get("id"), None)
                    if p:
                        p.send_json({"t": "kicked"})
                        p.close()
        except (ConnectionError, OSError):
            pass
        finally:
            conn.close()
            with ROOMS_LOCK:
                if room.host is conn:
                    room.host = None
                    pads = list(room.pads.values())
                    if not pads:
                        ROOMS.pop(room.code, None)
                else:
                    pads = []
            for p in pads:
                p.send_json({"t": "hostgone"})

    def run_pad(self, sock, code, cid):
        conn = WsConn(sock, "pad", cid)
        with ROOMS_LOCK:
            room = ROOMS.get(code)
            full = room is not None and cid not in room.pads and len(room.pads) >= MAX_PADS
            old = None
            if room is not None and not full:
                old = room.pads.get(cid)
                room.pads[cid] = conn
            host = room.host if room else None
        if room is None or full:
            conn.send_json({"t": "error", "code": "nogame" if room is None else "full", "msg": "No game with that code" if room is None else "This party is full"})
            conn.close()
            return
        if old is not None:
            old.close()
        conn.send_json({"t": "hello", "code": room.code, "host": host is not None})
        if host is not None:
            host.send_json({"t": "join", "id": cid})
        try:
            prefix = '{"t":"msg","id":' + json.dumps(cid) + ',"d":'
            while True:
                text = read_message(conn)
                if text is None:
                    break
                if len(text) > 65536:
                    continue
                with ROOMS_LOCK:
                    host = room.host
                if host is not None:
                    try:
                        json.loads(text)
                    except ValueError:
                        continue
                    host.send(prefix + text + "}")
        except (ConnectionError, OSError):
            pass
        finally:
            conn.close()
            with ROOMS_LOCK:
                mine = room.pads.get(cid) is conn
                if mine:
                    del room.pads[cid]
                host = room.host
                if room.host is None and not room.pads:
                    ROOMS.pop(room.code, None)
            if mine and host is not None:
                host.send_json({"t": "leave", "id": cid})

    def log_message(self, fmt, *args):
        # (args[0] is the request line — or an HTTPStatus when logging an error)
        if args and "/__shot" in str(args[0]):
            sys.stderr.write("shot saved\n")
        elif args and "/__rec?op=close" in str(args[0]):
            sys.stderr.write("clip saved\n")


class Server(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    local = "--local" in sys.argv
    port = int(args[0]) if args else 8765
    server = Server(("127.0.0.1" if local else "0.0.0.0", port), Handler)
    server.lan_open = not local
    print(f"Hearthlight: http://localhost:{port}", flush=True)
    if not local:
        for ip in lan_ips():
            print(f"  phones on the same Wi-Fi join Party Mode at http://{ip}:{port}/pad.html", flush=True)
    server.serve_forever()
