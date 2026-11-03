"""Build Deke's cut list (CUTLIST.html): our A list (what we cut next) + a short B list he can add from.

Usage: python engine/footage-picks/build_cutlist.py engine/footage-picks/yt-channel-2026-11-03.jsonl
Deke's answers live in the artifact db, doc picks/deke: {skip: [A ids he unticked], add: [B ids he ticked], note, updatedAt}.
Rule (Denis, 2026-11-03): curated A + short B only; never ask Deke for footage we could not find.
"""
import json, sys, urllib.request
from pathlib import Path

HERE = Path(__file__).parent

# (id, why) in the order we will cut them. "fx-" ids are Dropbox footage, not YouTube.
A_LIST = [
    ("-zSnIm_XyKk", "Your newest Too Many Notes season, never cut. Seven principles, one reel each."),
    ("723-8K0DweA", "The question every new group asks. Works as a reel and as a text post."),
    ("5vYndnic4VM", "Remote groups: a big topic for directors since 2020. Never cut."),
    ("_EmgIR2OnKo", "What a cappella can steal from big bands. Never cut."),
    ("50excXOTAuQ", "Your most watched video ever. Short, just you, made for reels."),
    ("evqK8oaV8V0", "Your top teaching video. Four steps, four reels."),
    ("XmhVlWMSzrc", "The best performer of this year's conversations, and a story people share."),
    ("fx-china-rain", "The show that went on in the rain. We'd use the wet crowd, the umbrellas and you in the poncho."),
]
B_LIST = [
    ("qdbCO-1pwfI", "Same format as the trumpet. 31K views."),
    ("Gc1heGjX5q8", "Same format as the trumpet. 28K views."),
    ("mrjZtmd55ZY", "For people who think they're tone deaf. 48K views."),
    ("sAmCEPFPvz8", "Why singing used to be for everyone."),
    ("qu3_vLmiFmo", "Five pointers for women's groups."),
    ("NB3TTGSOpwM", "A 4-step plan for more rehearsal time."),
    ("gUCHXV5O8Hk", "Something directors do that doesn't help."),
    ("dTbcvuPvND4", "Ten mic tips. Easy to split into short clips."),
    ("ygvw_tXEtvY", "With Annabelle Ye: the business side music school skips."),
    ("Zio3cjMo398", "With Tom: getting into music after college."),
]
FOOTAGE = {
    "fx-china-rain": dict(title="China: the rain concert", meta="Your footage, Aug 29, 5 clips", thumb="thumbs/fx-china-rain.jpg"),
}


def dur(s):
    s = int(s or 0); h, m, x = s // 3600, (s % 3600) // 60, s % 60
    return f"{h}:{m:02d}:{x:02d}" if h else f"{m}:{x:02d}"


def views(v):
    v = int(v or 0)
    return f"{v/1000:.0f}K views" if v >= 10000 else (f"{v/1000:.1f}K views".replace(".0K", "K") if v >= 1000 else f"{v} views")


def thumb(vid):
    out = HERE / "thumbs" / f"{vid}.jpg"
    if out.exists() and out.stat().st_size > 1000:
        return
    with urllib.request.urlopen(f"https://i.ytimg.com/vi/{vid}/mqdefault.jpg", timeout=20) as r:
        out.write_bytes(r.read())


def main(jsonl):
    yt = {}
    for line in Path(jsonl).read_text(encoding="utf-8").splitlines():
        if line.strip().startswith("{"):
            v = json.loads(line); yt[v["id"]] = v
    items = []
    for tier, lst in (("a", A_LIST), ("b", B_LIST)):
        for vid, why in lst:
            if vid in FOOTAGE:
                f = FOOTAGE[vid]
                items.append(dict(id=vid, tier=tier, title=f["title"], meta=f["meta"], why=why, url="", thumb=f["thumb"], dur=""))
                continue
            v = yt.get(vid)
            if not v:
                raise SystemExit(f"{vid} not in {jsonl}")
            thumb(vid)
            title = v["title"].replace("TMN   ", "").strip()
            items.append(dict(id=vid, tier=tier, title=title, why=why, dur=dur(v.get("duration")),
                              meta=f'{(v.get("upload_date") or "")[:4]} · {views(v.get("view_count"))}',
                              url=f"https://youtu.be/{vid}", thumb=f"thumbs/{vid}.jpg"))
    tpl = (HERE / "cutlist_template.html").read_text(encoding="utf-8")
    out = tpl.replace("/*__DATA__*/null", json.dumps(dict(items=items), ensure_ascii=False))
    if "—" in out:
        raise SystemExit("em dash in output")
    (HERE / "CUTLIST.html").write_text(out, encoding="utf-8")
    print(f"CUTLIST.html: A {len(A_LIST)}, B {len(B_LIST)}")
    print(json.dumps({i["thumb"]: f"engine/footage-picks/{i['thumb']}" for i in items}))


if __name__ == "__main__":
    main(sys.argv[1])
