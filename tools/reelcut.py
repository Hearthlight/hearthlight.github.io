#!/usr/bin/env python3
"""Cut the clips recorded by tools/reel.js into a film (standard library + ffmpeg).

    python3 tools/reelcut.py plan tools/trailer.edl.json               # each shot's place in the film
    python3 tools/reelcut.py cut  tools/trailer.edl.json out.mp4 [mix.wav] [--crf 16]

An edit list: {"fps": 30, "clips": "screenshots/reel", "shots": [{"clip": "lobby",
"from": 0, "to": 6.4, "fade": 0.35}, …]}. `fade` crossfades a shot in over the one
before (none: a cut). Times are counted in whole frames, like R.plan() in the
browser, which places the shots' sounds for R.soundtrack(). `cut` joins the clips
(lossless mkv from /__rec) into an H.264 mp4 with the soundtrack (loudness
normalised for social video, faded out at the end).
"""
import json
import math
import os
import shutil
import subprocess
import sys

FFMPEG = shutil.which("ffmpeg") or "/opt/homebrew/bin/ffmpeg"


# Everything is counted in whole frames (xfade offsets that drift by a fraction
# of a frame per shot end up past the end of their input, and the film stops),
# rounded half up like JavaScript's Math.round (Python's round() goes to even).
def fr(x, fps):
    return int(math.floor(x * fps + 0.5))


def frames(edl, s):
    fps = edl.get("fps", 30)
    a = fr(s["from"], fps)
    return a, fr(s["to"], fps) - a


def overlap(edl, i):
    """Frames shot i crossfades over the one before (0: a plain cut)."""
    return fr(float(edl["shots"][i].get("fade", 0)), edl.get("fps", 30)) if i else 0


def plan(edl):
    fps, n = edl.get("fps", 30), 0
    for i, s in enumerate(edl["shots"]):
        start = max(0, n - overlap(edl, i))
        s["at"] = round(start / fps, 4)
        n = start + frames(edl, s)[1]
    edl["length"] = round(n / fps, 4)
    return edl


def cut(edl, out, wav=None, root=".", crf=16):
    fps = edl.get("fps", 30)
    shots = edl["shots"]
    args = [FFMPEG, "-y", "-loglevel", "error"]
    for s in shots:
        args += ["-i", os.path.join(root, s["clip"] + ".mkv")]
    if wav:
        args += ["-i", wav]
    parts = []
    for i, s in enumerate(shots):
        a, n = frames(edl, s)
        parts.append(f"[{i}:v]trim=start_frame={a}:end_frame={a + n},settb=1/{fps},setpts=N,format=yuv444p[s{i}]")
    # runs of plain cuts are concatenated; crossfades join the runs
    runs = [[0]]
    for i in range(1, len(shots)):
        if overlap(edl, i): runs.append([i])
        else: runs[-1].append(i)
    for r, ids in enumerate(runs):
        parts.append("".join(f"[s{i}]" for i in ids) + (f"concat=n={len(ids)}:v=1:a=0" if len(ids) > 1 else "null") + f",settb=1/{fps},setpts=N[r{r}]")
    cur, n = "r0", sum(frames(edl, shots[i])[1] for i in runs[0])
    for r in range(1, len(runs)):
        d = overlap(edl, runs[r][0])
        parts.append(f"[{cur}][r{r}]xfade=transition=fade:duration={d / fps:.6f}:offset={(n - d) / fps:.6f}[x{r}]")
        cur, n = f"x{r}", n - d + sum(frames(edl, shots[i])[1] for i in runs[r])
    t = n / fps
    parts.append(f"[{cur}]format=yuv420p[v]")
    graph = ";".join(parts)
    args += ["-filter_complex", graph, "-map", "[v]"]
    if wav:
        n = len(shots)
        fo = edl.get("fadeOut", 2.0)
        # (social video loudness, a gentle fade at the end)
        af = f"loudnorm=I=-15:TP=-1.5:LRA=9,aresample=48000,afade=t=out:st={max(0.0, t - fo):.3f}:d={fo:.3f},alimiter=limit=0.9"
        args += ["-af", af, "-map", f"{n}:a", "-c:a", "aac", "-b:a", "192k", "-shortest"]
    args += ["-c:v", "libx264", "-preset", "slow", "-crf", str(crf), "-tune", "animation", "-profile:v", "high",
             "-pix_fmt", "yuv420p", "-r", str(fps), "-movflags", "+faststart", out]
    subprocess.run(args, check=True)
    return t


if __name__ == "__main__":
    argv = sys.argv[1:]
    crf = 16
    if "--crf" in argv:
        k = argv.index("--crf")
        crf = int(argv[k + 1])
        del argv[k:k + 2]
    op, path = argv[0], argv[1]
    edl = json.load(open(path))
    if op == "plan":
        plan(edl)
        for s in edl["shots"]:
            print(f"{s['at']:7.3f}  {s['clip']:12s} {s['from']:.2f}–{s['to']:.2f}")
        print(f"length {edl['length']:.3f}s")
    elif op == "cut":
        plan(edl)
        n = cut(edl, argv[2], argv[3] if len(argv) > 3 else None, root=edl.get("clips", os.path.dirname(path)), crf=crf)
        print(f"wrote {argv[2]} ({n:.2f}s)")
