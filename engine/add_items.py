"""Validate and add mined items to the bank. Used by the headless mining run (MINE-PROMPT.md).

  python engine/add_items.py <items.json>

Rejects the WHOLE file (exit 1, reasons printed) if any item breaks a rule, so a
bad mining run can never put a broken or off-brand post in the queue.
"""
import json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import load_bank, save_bank

TR = "D:/deke-media/engine/transcripts"
BANNED = [("\u2014", "em dash"), ("choir director", "say 'a cappella directors'"), ("\u2013", "en dash")]


def check(item, ids):
    e = []
    iid = item.get("id", "")
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{3,70}", iid):
        e.append(f"bad id '{iid}' (lowercase, digits, dashes)")
    if iid in ids:
        e.append(f"id '{iid}' already in bank")
    if item.get("lane") not in ("reel", "text"):
        e.append("lane must be reel or text")
    if not item.get("sourceNote"):
        e.append("sourceNote (video title, link, timestamp) is required")
    blob = json.dumps(item.get("copy", {}), ensure_ascii=False) + json.dumps(item.get("text", {}), ensure_ascii=False)
    for needle, why in BANNED:
        if needle in blob.lower():
            e.append(f"contains {why}")
    if item.get("lane") == "reel":
        src = item.get("source", {})
        key = src.get("id") if src.get("type") == "youtube" else os.path.splitext(os.path.basename(src.get("path", "")))[0]
        wp = f"{TR}/{key}.words.json"
        if src.get("type") not in ("youtube", "file") or not os.path.exists(wp):
            e.append(f"source must be a transcribed youtube id or local file ({wp} missing)")
        segs = item.get("segments") or []
        total = sum(b - a for a, b in segs) if segs else 0
        if not 12 <= total <= item.get("maxSec", 60):
            e.append(f"clip length {total:.1f}s, must be 12 to {item.get('maxSec', 60)} s")
        if os.path.exists(wp) and segs:
            words = json.load(open(wp, encoding="utf-8"))["words"]
            for a, b in segs:
                inside = [w for w in words if a <= w["start"] < b]
                cut_mid = [w for w in words if w["start"] < a < w["end"] - 0.05 or w["start"] < b < w["end"] - 0.05]
                if len(inside) < 3:
                    e.append(f"segment {a}-{b} has almost no speech")
                if cut_mid:
                    e.append(f"segment {a}-{b} cuts through the word '{cut_mid[0]['word']}'")
        c = item.get("copy", {})
        for k in ("ytTitle", "caption", "tiktok"):
            if not c.get(k):
                e.append(f"copy.{k} missing")
        if len(c.get("ytTitle", "")) > 95:
            e.append("ytTitle over 95 chars")
        if (item.get("framing") or {}).get("kind") not in ("blur169", "blur43", "blur45", "crop", "region", "native"):
            e.append("framing.kind must be blur169, blur43, blur45, crop or region")
        item.setdefault("status", "idea")
    else:
        t = item.get("text", {})
        for k in ("facebook", "threads", "linkedin"):
            if not t.get(k):
                e.append(f"text.{k} missing")
        if len(t.get("threads", "")) > 480:
            e.append("threads text over 480 chars")
        item.setdefault("status", "ready")
    item.setdefault("needs_deke", False)
    item.setdefault("priority", 3)
    return e


def main():
    new = json.load(open(sys.argv[1], encoding="utf-8"))
    new = new.get("items", new) if isinstance(new, dict) else new
    bank = load_bank()
    ids = {i["id"] for i in bank["items"]}
    problems = []
    for it in new:
        for p in check(it, ids):
            problems.append(f"{it.get('id', '?')}: {p}")
        ids.add(it.get("id"))
    if problems:
        print("REJECTED, nothing added:\n  " + "\n  ".join(problems))
        sys.exit(1)
    bank["items"] += new
    save_bank(bank)
    print(f"added {len(new)} items ({sum(1 for i in new if i['lane'] == 'reel')} reels, "
          f"{sum(1 for i in new if i['lane'] == 'text')} text)")


if __name__ == "__main__":
    main()
