"""Deke's second round of notes (2026-11-16 evening): refresh his review page, same link and token.

    python update_after_notes2.py            (dry: shows the changes)
    python update_after_notes2.py --apply    (uploads 540p previews to Postiz media and re-posts the review)

The site's GET only returns Deke's answers, so the page is rebuilt from the stored copy
(site-review-before-2026-11-16.json) with this morning's update (update_after_notes.py, URLs in public-urls.json)
and then tonight's: the 7 Croatia coaching reels with the 60% blended audio Denis chose, and the rain short
with EXIT singing Golden under Deke's voice. Previews are forced to 8-bit yuv420p (10-bit does not play in browsers).
"""
import json, os, subprocess, sys
ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, r"C:\Users\lafla\claude_projects\deke\engine")
from common import load_bank, postiz_upload, site_api

MORNING = {
    "trip-harmony-at-the-holidays": "audio", "trip-a-cappella-is-just-people": "audio", "trip-you-can-hear-a-smile": "audio",
    "trip-never-sing-on-autopilot": "audio", "trip-abba-unabashedly-fun": "audio",
    "trip-why-kindergartners-steal-the-show": "audio", "trip-quieter-not-weaker": "audio",
    "trip-klapa-in-zadar": "croappella", "china-rain-show-must-go-on": "rain",
}
WHY = {
    "audio": "New sound: your camera audio with the boom taken out, blended with a cleaner copy of your voice. "
             "Closer than the room echo, without the slurring.",
    "croappella": "Ends on the CROappella IV poster (Zadar, Croatia), and the caption names the festival.",
    "rain": "EXIT singing Golden is now under your voice (no theme music), and much more of them on stage in the pouring rain.",
}
TONIGHT = [k for k, v in MORNING.items() if v in ("audio", "rain")]
INTRO_ADD = (" Updated Nov 16 after your notes: your real voice on the Croatia videos, the rain on stage in the rain "
             "video, and CROappella at the end of the Zadar one.")
INTRO_ADD2 = " Updated again Nov 16 evening: in-between sound on the Croatia videos, and Golden under the rain video."

review = json.load(open(os.path.join(ROOT, "site-review-before-2026-11-16.json"), encoding="utf-8"))
answers = site_api("GET", f"/api/content-review?week={review['week']}")
if answers.get("submittedAt"):
    raise SystemExit("Deke already answered; stop and ask Denis")
bank = {i["id"]: i for i in load_bank()["items"]}
apply = "--apply" in sys.argv
urls = json.load(open(os.path.join(ROOT, "public-urls.json"), encoding="utf-8"))
os.makedirs(os.path.join(ROOT, "v3"), exist_ok=True)
for item in review["items"]:
    kind = MORNING.get(item["id"])
    if not kind:
        continue
    it = bank[item["id"]]
    item["videoUrl"], item["posterUrl"] = urls[item["id"]]["v"], urls[item["id"]]["p"]
    item["title"] = "Updated: " + it["copy"]["ytTitle"]
    item["caption"] = WHY[kind] + "\n\n" + it["copy"]["caption"]
    if item["id"] not in TONIGHT:
        continue
    src = it["media"]
    v = os.path.join(ROOT, "v3", item["id"] + ".mp4")
    p = os.path.join(ROOT, "v3", item["id"] + ".jpg")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-vf", "scale=540:960", "-c:v", "libx264", "-preset", "slow",
                    "-crf", "27", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", v], check=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(it.get("coverSec", 1.5)), "-i", src, "-frames:v", "1",
                    "-vf", "scale=540:960", "-q:v", "4", p], check=True)
    print(item["id"], "|", item["title"], "|", WHY[kind])
    if apply:
        item["videoUrl"] = postiz_upload(v)
        item["posterUrl"] = postiz_upload(p)
        urls[item["id"]] = {"v": item["videoUrl"], "p": item["posterUrl"], "replaced": urls.get(item["id"])}
# Deke: the off-screen reel (top card) posts last; show it after the other coaching reels on his page too.
ids = [i["id"] for i in review["items"]]
hol = review["items"].pop(ids.index("trip-harmony-at-the-holidays"))
review["items"].insert([i["id"] for i in review["items"]].index("trip-quieter-not-weaker") + 1, hol)
print("page order:", [i["id"] for i in review["items"]][:8])
if not apply:
    print("dry: nothing uploaded or posted")
    raise SystemExit
body = {"week": review["week"], "deadline": review["deadline"], "items": review["items"], "explicit": True,
        "heading": review["heading"], "intro": (review["intro"] + INTRO_ADD + INTRO_ADD2)[:600]}
res = site_api("POST", "/api/content-review", body)
json.dump(urls, open(os.path.join(ROOT, "public-urls.json"), "w", encoding="utf-8"), indent=1)
json.dump(body, open(os.path.join(ROOT, "site-review-after-2026-11-16-evening.json"), "w", encoding="utf-8"), indent=1,
          ensure_ascii=False)
same = res["url"].endswith(review["token"])
print("posted, same link:", same)
if not same:
    raise SystemExit("token changed: the link Deke has no longer works")
