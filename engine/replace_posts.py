"""Swap a re-rendered item into posts that are already scheduled in Postiz (same slots, new video and copy).

    python engine/replace_posts.py <monday> <item-id> [<item-id> ...]           (shows what it would do)
    python engine/replace_posts.py <monday> <item-id> [<item-id> ...] --apply   (does it)

For each item in engine/batches/<monday>-deke-plan/manifest.json: deletes its scheduled Postiz posts, checks they
are gone and that every OTHER post of the week is still there, rebuilds the item's rows from the bank (same
platforms, same times, current media and copy), then schedules them again with plan_week.publish (which only sends
rows that are not scheduled and checks every post landed). Built 2026-11-16 for Deke's notes on the review pack.
Fails loudly: any API error stops the run before anything is re-sent.
"""
import datetime, json, os, sys, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import ENV, load_bank, deke_posts
import batch, plan_week


def postiz_delete(post_id):
    url = ENV.get("POSTIZ_API_URL", "https://api.postiz.com/public/v1") + f"/posts/{post_id}"
    req = urllib.request.Request(url, method="DELETE",
                                 headers={"Authorization": ENV["POSTIZ_API_KEY"], "User-Agent": "deke-content-engine/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.status, r.read().decode("utf-8", "replace")[:300]


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    apply = "--apply" in sys.argv
    if len(args) < 2:
        raise SystemExit(__doc__)
    monday, ids = args[0], args[1:]
    mp = os.path.join(plan_week.folder(monday), "manifest.json")
    m = json.load(open(mp, encoding="utf-8"))
    bank = {i["id"]: i for i in load_bank()["items"]}
    mon = datetime.date.fromisoformat(monday)
    for iid in ids:
        rows = [r for r in m["items"] if r["engineItem"] == iid]
        if not rows:
            raise SystemExit(f"{iid} is not in {mp}")
        it = bank[iid]
        if it["lane"] == "reel" and not os.path.exists(it["media"]):
            raise SystemExit(f"{iid}: media {it['media']} is missing")
        print(f"{iid}: {len(rows)} posts, " + ", ".join(f"{r['platform']} {r['local']} {r.get('postizPostId')}" for r in rows))
    if not apply:
        print("dry: nothing deleted or sent (add --apply)")
        return
    swap_ids = {r.get("postizPostId") for r in m["items"] if r["engineItem"] in ids and r.get("postizPostId")}
    keep_ids = {r.get("postizPostId") for r in m["items"] if r["engineItem"] not in ids and r.get("postizPostId")}
    for pid in sorted(swap_ids):
        status, body = postiz_delete(pid)
        print("deleted", pid, status, body[:80])
    live = {p["id"] for p in deke_posts(1, 60)}
    still = swap_ids & live
    if still:
        raise SystemExit(f"STOP: deleted posts still listed in Postiz: {sorted(still)}")
    lost = keep_ids - live
    if lost:
        raise SystemExit(f"STOP: other posts of {monday} disappeared too (Postiz group delete?): {sorted(lost)}")
    out = []
    for r in m["items"]:
        if r["engineItem"] not in ids:
            out.append(r)
            continue
        if r.get("_replaced"):
            continue
        it = bank[r["engineItem"]]
        local = datetime.datetime.strptime(r["local"], "%a %b %d %H:%M")
        day = (datetime.date(mon.year if local.month >= mon.month else mon.year + 1, local.month, local.day) - mon).days
        slot = [(x["platform"], x["local"][-5:]) for x in m["items"] if x["engineItem"] == r["engineItem"]]
        fresh = batch.manifest_rows(it, slot, mon, day)
        for f, old in zip(fresh, [x for x in m["items"] if x["engineItem"] == r["engineItem"]]):
            if f["scheduledAtISO"] != old["scheduledAtISO"] or f["platform"] != old["platform"]:
                raise SystemExit(f"STOP: rebuilt slot {f['platform']} {f['scheduledAtISO']} != {old['platform']} {old['scheduledAtISO']}")
            f["replacedFrom"] = old.get("postizPostId")
            old["_replaced"] = True
        out += fresh
    for r in out:
        r.pop("_replaced", None)
    m["items"] = out
    json.dump(m, open(mp, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    plan_week.publish(monday)


if __name__ == "__main__":
    main()
