"""Per-second check of the Deke + Rasmus Skool call: are both tiles where the 'big' layout puts them,
and is either camera off? Flags any second that is not a clean two-shot.

Writes rows {t, layout_ok, deke_off, guest_off, tiles}. Prints runs of non-clean seconds.

Usage: python scan_layout.py <video> <out.json>
"""
import json, subprocess, sys
from pathlib import Path
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "bill_biffle"))
import track_tiles as tt  # noqa: E402
from resolve_layout import camera_off  # noqa: E402

BIG = {"deke": (32, 191, 928, 522), "guest": (962, 191, 926, 521)}


def near(a, b, tol=14):
    return all(abs(x - y) <= tol for x, y in zip(a, b))


def main(video, out):
    rows = []
    for t, a in tt.frames(video, 1.0):
        ts = [b[:4] for b in tt.tiles(a)]
        ok = any(near(b, BIG["deke"]) for b in ts) and any(near(b, BIG["guest"]) for b in ts)
        rows.append(dict(t=t, layout_ok=ok, deke_off=camera_off(a, BIG["deke"]),
                         guest_off=camera_off(a, BIG["guest"]), tiles=len(ts)))
    json.dump(rows, open(out, "w"))
    bad, run = [], None
    for r in rows:
        clean = r["layout_ok"] and not r["deke_off"] and not r["guest_off"]
        key = None if clean else (r["layout_ok"], r["deke_off"], r["guest_off"])
        if key and run and run["key"] == key and r["t"] - run["end"] <= 1:
            run["end"] = r["t"]
        elif key:
            run = {"key": key, "start": r["t"], "end": r["t"]}
            bad.append(run)
    print(len(rows), "seconds scanned;", len(bad), "non-clean runs")
    for b in bad:
        s, e = b["start"], b["end"]
        print(f"{int(s // 60)}:{s % 60:04.1f}-{int(e // 60)}:{e % 60:04.1f}  layout_ok={b['key'][0]} deke_off={b['key'][1]} guest_off={b['key'][2]}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
