"""Reorder posts that are already scheduled in Postiz: give each listed slot (a date) a different item.

    python engine/move_items.py 2026-12-01=trip-you-can-hear-a-smile 2026-12-24=trip-harmony-at-the-holidays ...
    ... --apply   (does it; without it, only shows the plan)

Each DATE is a day that already holds one scheduled item in some engine/batches/<monday>-deke-plan/manifest.json.
The listed items must be exactly the items currently in the listed slots (a permutation), so nothing is dropped or
doubled. Each slot keeps its platforms and times; only the item changes. Built 2026-11-16 for Deke's note "post the
one of me off screen last". Same safety as replace_posts.py: deletes the moved posts, checks they are gone and that
every other post of the touched weeks is still there, rebuilds the rows from the bank, then plan_week.publish for
each touched week (which checks every post landed). Fails loudly: any API error stops the run.
"""
import datetime, glob, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import batch, plan_week  # noqa: E402
from common import load_bank, save_bank, deke_posts  # noqa: E402
from replace_posts import postiz_delete  # noqa: E402


def slot_index():
    """date -> (monday, manifest path, item id); refuses a date with two items."""
    out = {}
    for mp in sorted(glob.glob(os.path.join(plan_week.BATCHES, "*-deke-plan", "manifest.json"))):
        monday = os.path.basename(os.path.dirname(mp))[:10]
        for r in json.load(open(mp, encoding="utf-8"))["items"]:
            d = r["scheduledAtISO"][:10]
            prev = out.get(d)
            if prev and prev[2] != r["engineItem"]:
                out[d] = (monday, mp, None)  # two items on one day: not movable by date
            else:
                out[d] = (monday, mp, r["engineItem"])
    return out


def main():
    pairs = [a.split("=", 1) for a in sys.argv[1:] if not a.startswith("--")]
    apply = "--apply" in sys.argv
    if not pairs:
        raise SystemExit(__doc__)
    idx = slot_index()
    plan = {}
    for d, iid in pairs:
        if d not in idx:
            raise SystemExit(f"{d}: no scheduled item on that day")
        if idx[d][2] is None:
            raise SystemExit(f"{d}: more than one item that day, cannot move by date")
        plan[d] = iid
    old = {d: idx[d][2] for d in plan}
    if sorted(old.values()) != sorted(plan.values()):
        raise SystemExit(f"not a reorder: slots hold {sorted(old.values())}, plan puts {sorted(plan.values())}")
    moved = {d: i for d, i in plan.items() if old[d] != i}
    bank_all = load_bank()
    bank = {i["id"]: i for i in bank_all["items"]}
    for d in sorted(plan):
        print(f"{d}: {old[d]} -> {plan[d]}" + ("" if d in moved else " (unchanged)"))
    for i in set(moved.values()):
        it = bank[i]
        if it["lane"] == "reel" and not os.path.exists(it["media"]):
            raise SystemExit(f"{i}: media {it['media']} is missing")
    if not moved:
        print("nothing to move"); return
    if not apply:
        print("dry: nothing deleted or sent (add --apply)"); return

    weeks = {}
    for d in moved:
        weeks.setdefault(idx[d][1], []).append(d)
    manifests = {mp: json.load(open(mp, encoding="utf-8")) for mp in weeks}
    gone, keep = set(), set()
    for mp, m in manifests.items():
        for r in m["items"]:
            pid = r.get("postizPostId")
            if not pid:
                continue
            (gone if r["scheduledAtISO"][:10] in moved else keep).add(pid)
    for pid in sorted(gone):
        status, body = postiz_delete(pid)
        print("deleted", pid, status, body[:80])
    live = {p["id"] for p in deke_posts(1, 90)}
    if gone & live:
        raise SystemExit(f"STOP: deleted posts still listed in Postiz: {sorted(gone & live)}")
    if keep - live:
        raise SystemExit(f"STOP: other posts disappeared too: {sorted(keep - live)}")

    for mp, m in manifests.items():
        monday = os.path.basename(os.path.dirname(mp))[:10]
        mon = datetime.date.fromisoformat(monday)
        out = [r for r in m["items"] if r["scheduledAtISO"][:10] not in moved]
        for d in weeks[mp]:
            olds = [r for r in m["items"] if r["scheduledAtISO"][:10] == d]
            slot = [(r["platform"], r["local"][-5:]) for r in olds]
            local = datetime.datetime.strptime(olds[0]["local"], "%a %b %d %H:%M")
            day = (datetime.date(mon.year if local.month >= mon.month else mon.year + 1, local.month, local.day) - mon).days
            fresh = batch.manifest_rows(bank[moved[d]], slot, mon, day)
            for f, o in zip(fresh, olds):
                if f["scheduledAtISO"] != o["scheduledAtISO"] or f["platform"] != o["platform"]:
                    raise SystemExit(f"STOP: rebuilt slot {f['platform']} {f['scheduledAtISO']} != {o['platform']} {o['scheduledAtISO']}")
                f["movedFrom"] = {"item": o["engineItem"], "postizPostId": o.get("postizPostId")}
            out += fresh
            bank[moved[d]]["week"] = monday
        out.sort(key=lambda r: (r["scheduledAtISO"], r["platform"]))
        m["items"] = out
        json.dump(m, open(mp, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    save_bank(bank_all)
    for mp in manifests:
        plan_week.publish(os.path.basename(os.path.dirname(mp))[:10])
    print("moved", len(moved), "items in", len(manifests), "weeks")


if __name__ == "__main__":
    main()
