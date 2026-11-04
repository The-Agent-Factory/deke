"""Track Deke's and Bill's video tiles through the Skool call recording, second by second.

Per sampled second (full 1920x1080): find every video tile (non-background blocks, split at the thin
background gaps between neighbours, black letterbox trimmed), tell which tile is Deke (red wall) and which
is Bill (bright window behind him), and which tile carries the light "speaking" outline.
Writes rows {t, deke:[x,y,w,h]|null, bill:[...]|null, speaker:"deke|bill|other|none", tiles:n}.

Usage: python track_tiles.py <video> <out.json> [step_seconds]
"""
import json, subprocess, sys
import numpy as np
from scipy import ndimage

W, H = 1920, 1080
BG = np.array([16, 18, 18])


def frames(path, step):
    cmd = ["ffmpeg", "-v", "error", "-i", path, "-vf", f"fps=1/{step}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE)
    n = W * H * 3
    i = 0
    while True:
        buf = p.stdout.read(n)
        if len(buf) < n:
            break
        yield round(i * step, 2), np.frombuffer(buf, np.uint8).reshape(H, W, 3)
        i += 1


def bgmask(a):
    return np.abs(a.astype(np.int16) - BG).sum(2) <= 10


def split_runs(free, lo, hi, min_len):
    """Split [lo,hi) at runs of 'free' (background) indices; return content spans."""
    spans, start = [], None
    for i in range(lo, hi):
        if not free[i] and start is None:
            start = i
        elif free[i] and start is not None:
            if i - start >= min_len:
                spans.append((start, i))
            start = None
    if start is not None and hi - start >= min_len:
        spans.append((start, hi))
    return spans


def tiles(a):
    bg = bgmask(a)
    small = ~bg[::4, ::4]
    lab, _ = ndimage.label(small)
    out = []
    for sl in ndimage.find_objects(lab):
        y0, y1, x0, x1 = sl[0].start * 4, sl[0].stop * 4, sl[1].start * 4, sl[1].stop * 4
        if (x1 - x0) < 380 or (y1 - y0) < 200 or (x1 - x0) > 1900:
            continue  # avatar chips and the full-frame component
        for bx, by, bw, bh in xycut(bg, x0, y0, x1 - x0, y1 - y0):
            # keep only the picture: the longest run of rows that are mostly lit (drops the black bars above
            # and below the video and the dark name strip at the bottom of the tile)
            inner = a[by:by + bh, bx + 8:bx + bw - 8]
            lit = (inner.max(2) > 40).mean(1) > 0.35
            spans = split_runs(~lit, 0, bh, 60)
            if not spans:
                continue
            # The call letterboxes each 16:9 picture centred in its tile, so take exactly that rectangle
            # (a brightness test would clip Bill's dark shirt).
            vh = round(bw * 9 / 16)
            if vh > bh:
                continue
            out.append((bx, by + (bh - vh) // 2, bw, vh, (bx, by, bw, bh)))
    return out


def xycut(bg, x, y, w, h, depth=0):
    """Recursively split a block at full-width/height background gaps (rows, then columns, alternating)."""
    sub = bg[y:y + h, x:x + w]
    for axis in ((0, 1) if depth % 2 == 0 else (1, 0)):
        free = sub.mean(1 - axis) > 0.85 if axis == 1 else sub.mean(1) > 0.85  # axis 1: columns, 0: rows
        n = w if axis == 1 else h
        spans = split_runs(free, 0, n, 150 if axis == 1 else 100)
        if len(spans) > 1 or (spans and (spans[0][1] - spans[0][0]) < n - 8):
            out = []
            for s0, s1 in spans:
                if axis == 1:
                    out += xycut(bg, x + s0, y, s1 - s0, h, depth + 1) if depth < 6 else [(x + s0, y, s1 - s0, h)]
                else:
                    out += xycut(bg, x, y + s0, w, s1 - s0, depth + 1) if depth < 6 else [(x, y + s0, w, s1 - s0)]
            return out
    return [(x, y, w, h)]


def profile(a, b):
    x, y, w, h = b[:4]
    t = a[y + 6:y + h - 6:3, x + 6:x + w - 6:3].reshape(-1, 3).astype(int)
    r, g, bl = t[:, 0], t[:, 1], t[:, 2]
    return dict(red=float(np.mean((r > 140) & (g < 90) & (bl < 90))),
                purple=float(np.mean((bl > 110) & (r > 70) & (g < 90))),
                bright=float(np.mean(t.mean(1) > 175)))


def outline(a, b):
    """Speaking outline: a light frame drawn on the tile's outer edge."""
    x, y, w, h = b[4]
    ring = np.concatenate([a[y:y + 3, x:x + w].reshape(-1, 3), a[y + h - 3:y + h, x:x + w].reshape(-1, 3),
                           a[y:y + h, x:x + 3].reshape(-1, 3), a[y:y + h, x + w - 3:x + w].reshape(-1, 3)])
    return float(np.mean(ring.mean(1) > 140))


def classify(a):
    ts = tiles(a)
    info = [(b, profile(a, b), outline(a, b)) for b in ts]
    deke = max(info, key=lambda z: z[1]["red"], default=None)
    deke = deke if deke and deke[1]["red"] > 0.06 else None
    rest = [z for z in info if z is not deke and z[1]["purple"] < 0.12]
    bill = max(rest, key=lambda z: z[1]["bright"], default=None)
    bill = bill if bill and bill[1]["bright"] > 0.05 else None
    lit = max(info, key=lambda z: z[2], default=None)
    speaker = "none"
    if lit and lit[2] > 0.25:
        speaker = "deke" if lit is deke else "bill" if lit is bill else "other"
    return dict(deke=list(deke[0][:4]) if deke else None, bill=list(bill[0][:4]) if bill else None,
                speaker=speaker, tiles=len(ts))


def main(path, out, step=1.0):
    rows = []
    for t, a in frames(path, step):
        rows.append(dict(t=t, **classify(a)))
    json.dump(rows, open(out, "w"))
    print(len(rows), "samples")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], float(sys.argv[3]) if len(sys.argv) > 3 else 1.0)
