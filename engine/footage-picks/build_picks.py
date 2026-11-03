"""Build Deke's footage pick list (PICKS.html) from his YouTube channel + known Dropbox footage.

Usage:
  python engine/footage-picks/build_picks.py <yt-full.jsonl>
    yt-full.jsonl: one JSON object per video from
    yt-dlp --skip-download --print "%(.{id,title,upload_date,duration,view_count,description})j" <channel>/videos

Writes engine/footage-picks/PICKS.html and downloads thumbs/<id>.jpg.
Deke's ticks live in the artifact db (doc picks/deke); read them with ArtifactData.
"""
import html, json, re, sys, urllib.request
from pathlib import Path

HERE = Path(__file__).parent
THUMBS = HERE / "thumbs"

GROUPS = [
    ("tmn2025", "Too Many Notes, 2025 season",
     "The five episodes you filmed at Camp A Cappella in spring 2025. Only the rehearsal one has been cut so far."),
    ("instrument", "Sing like an instrument",
     "Your most watched videos. You alone, demonstrating. These travel well as short reels."),
    ("conversations", "2026 conversations",
     "The long talks recorded this summer. Guests agreed to be filmed."),
    ("classics", "Too Many Notes, earlier seasons (2014 to 2021)",
     "Your teaching episodes from earlier seasons. Each one usually holds 2 to 4 short moments."),
    ("panels", "Counterpoint panels and guest hangouts",
     "Hour-long panels with other guests. Usable, but each clip needs the guest's name right."),
    ("footage", "Footage you shot on trips",
     "Raw clips in your Dropbox (TotalVocal Skool folder)."),
    ("archive", "Performances and archive",
     "Other groups singing known songs, TV clips and old interviews. Reels from these risk copyright claims or need the group's OK, so we don't suggest them."),
]

TMN2025 = ["-zSnIm_XyKk", "723-8K0DweA", "5vYndnic4VM", "J75D3PhzzL0", "_EmgIR2OnKo"]
INSTRUMENT = ["50excXOTAuQ", "R-utZM_PUf8", "qdbCO-1pwfI", "Gc1heGjX5q8", "5ol9d9qHfTE", "YIfmBU2IPxY", "Zb0o9q1kD2k"]
CONVERSATIONS = ["NixffPanZ6s", "Zio3cjMo398", "XmhVlWMSzrc", "ygvw_tXEtvY"]
PANELS = ["ZBEjt65yNLY", "tsiZQVPQqKw", "E53e3iKccok", "_kRlJgWewZs"]
ARCHIVE = ["LjLcarzUJ6M", "7xgeM2N66Lk", "Ixx5mBB2nA4", "NgQl_2pWrr4", "BEoR39taoZc", "q9lPAWJn2bA",
           "hV10DjfCI8c", "dyeljLPfnRQ", "wIoH4zb_AuA", "FVyrGRrduAg", "B2QANmIuaxk", "_mLnOJ3QjRw",
           "EBTjQeVQM7o", "piLs3_iPc6U", "FCemsK79TOY", "8aGXxnxkfF4", "JeT54PvW5jI", "BYIIZ9P6FmY",
           "R1jKFhSpfZM", "XA1ynmZGzwU", "MzrqzFun5nk", "f7F0aYx-aYM", "tLPTvwd790A", "mDVVcsjXCDc"]
# Our own uploads (recuts, welcome, Zagreb short): not source material.
SKIP = ["y4hldFKu2UE", "99p9_FIOIEo", "h56KXroWDXA"]

RECOMMENDED = set(TMN2025 + ["50excXOTAuQ", "qdbCO-1pwfI", "Gc1heGjX5q8", "5ol9d9qHfTE",
                             "Zio3cjMo398", "XmhVlWMSzrc", "ygvw_tXEtvY",
                             "evqK8oaV8V0", "mrjZtmd55ZY", "sAmCEPFPvz8", "qu3_vLmiFmo",
                             "NB3TTGSOpwM", "gUCHXV5O8Hk"])

USED = {
    "J75D3PhzzL0": "5 reels cut in Oct. More moments left.",
    "NixffPanZ6s": "3 reels cut, 2 more ideas noted.",
    "NdfiuEfyza4": "1 reel cut in Oct.",
    "tymICSqQJAM": "1 reel cut in Oct.",
    "R-utZM_PUf8": "Full recut and a short posted Aug 29.",
}

NOTES = {
    "J75D3PhzzL0": "Already the source of 5 reels. A few strong moments are still unused.",
    "-zSnIm_XyKk": "Seven principles for being a trailblazer in a cappella. One principle per reel.",
    "723-8K0DweA": "What groups should charge for gigs. A question every new group asks.",
    "5vYndnic4VM": "How remote groups make music together from miles apart.",
    "_EmgIR2OnKo": "What a cappella can steal from big band energy and structure.",
}

FLAGS = {
    "LjLcarzUJ6M": "Stevie Wonder song", "q9lPAWJn2bA": "Meghan Trainor song",
    "BEoR39taoZc": "Dusty Springfield song", "7xgeM2N66Lk": "Colbie Caillat song",
    "NgQl_2pWrr4": "Sam Smith song", "Ixx5mBB2nA4": "Beatles song, students",
    "dyeljLPfnRQ": "Beatles song", "piLs3_iPc6U": "TV and film clips",
}

# Dropbox / local footage (no YouTube id). id must be a db-safe string.
FOOTAGE = [
    dict(id="fx-china-rain", title="China: the rain concert",
         meta="5 clips, Aug 29 (DJI 0057 to 0061)", rec=True,
         note="You asked for this one: the show that went on in the rain. We'd use the wet crowd, the umbrellas and your poncho line. The bus clip has a child in frame, so it stays out.",
         status="Not cut yet"),
    dict(id="fx-china-gala", title="China: night gala and Acapellago sets",
         meta="9 clips, Aug 29", rec=False,
         note="Other groups singing known songs. Picture only as b-roll; their audio would draw copyright claims.",
         status="3 seconds used in the judging-day reel"),
    dict(id="fx-croatia-beatbox", title="CROappella: the marble-dust beatboxer",
         meta="Zadar, Jul 28", rec=True,
         note="The best story from the Zadar trip. Waiting on Tawnya's close-ups of the beatboxer.",
         status="Needs Tawnya's close-ups"),
    dict(id="fx-croatia-rest", title="Croatia: Plitvice, Rastoke and Zadar",
         meta="85 clips, Jul 24 to 28", rec=False,
         note="Two reels already came out of this trip (singing instruments, improv class). The rest is scenery and b-roll.",
         status="2 reels posted in Aug"),
    dict(id="fx-singapore", title="Singapore: school concert",
         meta="17 clips, Jul 3 to 4, incl. one 41-minute take", rec=False,
         note="A school concert with students on stage. Without parents' consent we keep minors off your channels.",
         status="Not used"),
]

MISSING = ["Quick hits (short tips you filmed)", "The closely cut video with music",
           "Robert Plant / Home Free style footage"]


def fmt_dur(s):
    s = int(s or 0)
    h, m, sec = s // 3600, (s % 3600) // 60, s % 60
    return f"{h}:{m:02d}:{sec:02d}" if h else f"{m}:{sec:02d}"


def fmt_views(v):
    v = int(v or 0)
    if v >= 1000:
        return f"{v/1000:.0f}K views" if v >= 10000 else f"{v/1000:.1f}K views".replace(".0K", "K")
    return f"{v} views"


def blurb(desc):
    for line in (desc or "").splitlines():
        line = re.sub(r"^[^A-Za-z0-9\"']+", "", line.strip())
        if not line or "http" in line or line.lower().startswith(("filmed at", "new episode", "time for a")):
            continue
        if len(line) < 25:
            continue
        line = line.replace("—", ",").replace("–", "-")
        return line if len(line) <= 170 else line[:167].rsplit(" ", 1)[0] + "..."
    return ""


def group_of(vid):
    if vid in TMN2025: return "tmn2025"
    if vid in INSTRUMENT: return "instrument"
    if vid in CONVERSATIONS: return "conversations"
    if vid in PANELS: return "panels"
    if vid in ARCHIVE: return "archive"
    return "classics"


def fetch_thumb(vid):
    THUMBS.mkdir(exist_ok=True)
    out = THUMBS / f"{vid}.jpg"
    if out.exists() and out.stat().st_size > 1000:
        return True
    for name in ("mqdefault.jpg", "hqdefault.jpg"):
        try:
            with urllib.request.urlopen(f"https://i.ytimg.com/vi/{vid}/{name}", timeout=20) as r:
                out.write_bytes(r.read())
            return True
        except Exception:
            continue
    return False


def main(jsonl):
    vids = []
    for line in Path(jsonl).read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line.startswith("{"):
            continue
        v = json.loads(line)
        if v["id"] in SKIP:
            continue
        vids.append(v)
    if len(vids) < 60:
        raise SystemExit(f"only {len(vids)} videos in {jsonl}; metadata pull incomplete")

    items = []
    for v in vids:
        vid = v["id"]
        if not fetch_thumb(vid):
            raise SystemExit(f"thumbnail download failed for {vid}")
        d = v.get("upload_date") or ""
        title = re.sub(r"^TMN\s+", "", v["title"]).strip()
        items.append(dict(
            id=vid, group=group_of(vid), title=title,
            year=d[:4], date=d, dur=fmt_dur(v.get("duration")), views=int(v.get("view_count") or 0),
            viewsLabel=fmt_views(v.get("view_count")), note=NOTES.get(vid) or blurb(v.get("description")),
            rec=vid in RECOMMENDED, status=USED.get(vid, "Not cut yet"), used=vid in USED,
            flag=FLAGS.get(vid, ""), url=f"https://youtu.be/{vid}", thumb=f"thumbs/{vid}.jpg"))
    for f in FOOTAGE:
        items.append(dict(group="footage", year="2026", date="", dur="", views=0, viewsLabel=f["meta"],
                          used=f["status"] != "Not cut yet" and f["status"] != "Not used",
                          flag="", url="", thumb="", **{k: f[k] for k in ("id", "title", "note", "rec", "status")}))

    order = {g[0]: i for i, g in enumerate(GROUPS)}
    items.sort(key=lambda x: (order[x["group"]], not x["rec"], -x["views"], x["date"]))

    data = dict(groups=[dict(key=k, title=t, intro=i) for k, t, i in GROUPS], items=items, missing=MISSING)
    tpl = (HERE / "picks_template.html").read_text(encoding="utf-8")
    out = tpl.replace("/*__DATA__*/null", json.dumps(data, ensure_ascii=False))
    if "—" in out:
        raise SystemExit("em dash found in output")
    (HERE / "PICKS.html").write_text(out, encoding="utf-8")
    print(f"PICKS.html: {len(items)} items ({sum(i['rec'] for i in items)} recommended), {len(vids)} thumbs")


if __name__ == "__main__":
    main(sys.argv[1])
