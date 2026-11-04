"""Turn the per-second tile tracking into clean edit segments for the Deke + Bill video.

Snaps each detection to one of the two real layouts of the call, holds the last layout through detection
blips, and checks each person's tile for "camera off" (a flat grey tile with an avatar). Output modes:
  two   both cameras on: side by side
  deke  Bill's camera off: Deke alone
  bill  Deke's camera off: Bill alone
Writes segments.json [{start, end, layout, mode}] for the given source range.

Usage: python resolve_layout.py <video> <tiles.json> <start_s> <end_s> <out.json>
"""
import json, subprocess, sys
import numpy as np

LAYOUTS = {
    "small": {"deke": [960, 124, 632, 356], "bill": [328, 124, 630, 354]},
    "big": {"deke": [32, 191, 928, 522], "bill": [962, 191, 926, 521]},
}


def snap(r):
    if not r["deke"] or not r["bill"]:
        return None
    for name, L in LAYOUTS.items():
        if all(abs(a - b) <= 14 for k in ("deke", "bill") for a, b in zip(r[k], L[k])):
            return name
    return None


def camera_off(frame, rect):
    x, y, w, h = rect
    t = frame[y + 10:y + h - 10:4, x + 10:x + w - 10:4].reshape(-1, 3).astype(int)
    # a camera-off tile is one flat grey with a small avatar in the middle
    med = np.median(t, axis=0)
    flat = np.mean(np.abs(t - med).sum(1) < 12)
    return bool(flat > 0.8 and abs(med[0] - med[2]) < 8)


def frames(path, start, end):
    W, H = 1920, 1080
    cmd = ["ffmpeg", "-v", "error", "-ss", str(start), "-i", path, "-t", str(end - start), "-vf", "fps=1",
           "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE)
    i = 0
    while True:
        buf = p.stdout.read(W * H * 3)
        if len(buf) < W * H * 3:
            break
        yield start + i, np.frombuffer(buf, np.uint8).reshape(H, W, 3)
        i += 1


def main(video, tiles, start, end, out):
    rows = {int(r["t"]): r for r in json.load(open(tiles))}
    per = []
    last = None
    for t, f in frames(video, start, end):
        lay = snap(rows.get(t, {"deke": None, "bill": None})) or last
        if lay is None:
            lay = "small"
        last = lay
        L = LAYOUTS[lay]
        d_off, b_off = camera_off(f, L["deke"]), camera_off(f, L["bill"])
        mode = "two" if not (d_off or b_off) else ("deke" if b_off and not d_off else "bill" if d_off and not b_off else "two")
        per.append((t, lay, mode))
    # debounce: a mode/layout must hold 2 s before we switch to it (avoids 1-frame flicker)
    segs = []
    for t, lay, mode in per:
        if segs and (segs[-1]["layout"], segs[-1]["mode"]) == (lay, mode):
            segs[-1]["end"] = t + 1
        else:
            segs.append({"start": t, "end": t + 1, "layout": lay, "mode": mode})
    merged = []
    for s in segs:
        if merged and s["end"] - s["start"] < 2:
            merged[-1]["end"] = s["end"]
        elif merged and (merged[-1]["layout"], merged[-1]["mode"]) == (s["layout"], s["mode"]):
            merged[-1]["end"] = s["end"]
        else:
            merged.append(dict(s))
    merged[0]["start"] = start
    merged[-1]["end"] = end
    json.dump(merged, open(out, "w"), indent=1)
    for s in merged:
        print(f'{s["start"]//60:.0f}:{s["start"]%60:04.1f}-{s["end"]//60:.0f}:{s["end"]%60:04.1f} {s["layout"]:5} {s["mode"]}')


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4]), sys.argv[5])
