"""Steps 5 and 7 of the WhatsApp recipe: lay chosen pieces into a week, and schedule it after Deke's OK.

  python engine/plan_week.py plan <monday> <item-id>:<day> [<item-id>:<day> ...]
      day: mon tue wed thu fri sat sun. Reels use the config reel slots (IG + FB 10:00, YouTube 12:00,
      TikTok 14:00); text posts use the text slots (Mon: FB 10:00 + Threads 12:00, Wed: LinkedIn 09:00 + FB 10:00).
      Writes engine/batches/<monday>-deke-plan/manifest.json, uploads watchable previews, runs the
      Postiz dry run. Nothing is scheduled.
  python engine/plan_week.py publish <monday>
      Schedules that week in Postiz, checks every post landed, marks the bank items scheduled.
"""
import datetime, json, os, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import CONFIG, REPO, BATCHES, load_bank, save_bank, postiz_upload, deke_posts
import batch

DAYS = {"mon": 0, "tue": 1, "wed": 2, "thu": 3, "fri": 4, "sat": 5, "sun": 6}


def slots_for(lane, day):
    for s in CONFIG["slots"][lane]:
        if s["day"] == day:
            return s["posts"]
    # any other day: reuse the lane's first slot times
    return CONFIG["slots"][lane][0]["posts"]


def folder(monday):
    return os.path.join(BATCHES, f"{monday}-deke-plan")


def plan(monday, picks):
    mon = datetime.date.fromisoformat(monday)
    if mon.weekday() != 0:
        raise SystemExit(f"{monday} is not a Monday")
    bank = load_bank()
    by = {i["id"]: i for i in bank["items"]}
    rows = []
    for pick in picks:
        iid, day = pick.split(":")
        it = by[iid]
        if it["lane"] == "reel":
            if it.get("status") not in ("rendered", "scheduled", "planned"):
                raise SystemExit(f"{iid} is not rendered yet (status {it.get('status')})")
            if not it.get("previewUrl"):
                it["previewUrl"] = postiz_upload(it["media"])
                it["posterUrl"] = postiz_upload(it["cover"])
        rows += batch.manifest_rows(it, slots_for(it["lane"], DAYS[day]), mon, DAYS[day])
        it.update(week=monday, status="planned")
    os.makedirs(folder(monday), exist_ok=True)
    mp = os.path.join(folder(monday), "manifest.json")
    json.dump({"packDate": monday, "items": rows}, open(mp, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    save_bank(bank)
    code, dry, tail = batch.run_publisher(mp, dry=True)
    if code != 0:
        raise SystemExit(f"Postiz dry run failed:\n{tail}")
    for r in rows:
        print(r["local"], r["platform"], r["text"][:50].replace("\n", " "))
    print(f"PLANNED {monday}: {len(rows)} posts, dry run OK. Manifest: {mp}")


def publish(monday):
    mp = os.path.join(folder(monday), "manifest.json")
    r = subprocess.run(["node", os.path.join(REPO, "scripts", "postiz-publish.mjs"), "--manifest", mp],
                       capture_output=True, text=True, encoding="utf-8", errors="replace", cwd=REPO)
    m = json.load(open(mp, encoding="utf-8"))
    bad = [x for x in m["items"] if x.get("status") != "scheduled"]
    if r.returncode != 0 or bad:
        raise SystemExit(f"PUBLISH INCOMPLETE: {len(bad)} posts not scheduled\n{(r.stdout + r.stderr)[-1500:]}")
    live = {p["id"] for p in deke_posts(1, 60)}
    missing = [x for x in m["items"] if x.get("postizPostId") not in live]
    if missing:
        raise SystemExit(f"{len(missing)} posts were accepted but are not in Postiz: {[x['local'] for x in missing]}")
    bank = load_bank()
    ids = {x["engineItem"] for x in m["items"]}
    for it in bank["items"]:
        if it["id"] in ids:
            it["status"] = "scheduled"
    save_bank(bank)
    print(f"SCHEDULED {monday}: {len(m['items'])} posts, all confirmed in Postiz")


if __name__ == "__main__":
    if len(sys.argv) >= 4 and sys.argv[1] == "plan":
        plan(sys.argv[2], sys.argv[3:])
    elif len(sys.argv) == 3 and sys.argv[1] == "publish":
        publish(sys.argv[2])
    else:
        raise SystemExit(__doc__)
