"""Build, review and publish one week of Deke posts.

  python engine/batch.py plan <monday YYYY-MM-DD> [--auto]
      Picks 3 rendered reels + 2 text posts from the bank (never needs_deke),
      places them in the config slots, writes engine/batches/<week>/manifest.json,
      review.html and batch.json, runs the Postiz dry run, and emails Denis.
      With --auto and approval_mode "standing" it schedules the week right away.
  python engine/batch.py publish <monday>    schedule the week in Postiz (the "go")
  python engine/batch.py release <monday>    undo a plan that was never published

Every failure exits non-zero with the reason. Nothing reaches Postiz except
through scripts/postiz-publish.mjs, which writes per-item status back into the
manifest, so a re-run never double-posts.
"""
import json, os, sys, subprocess, datetime, html
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import CONFIG, TZ, REPO, BATCHES, now, load_bank, save_bank, send_email

PUBLISHER = os.path.join(REPO, "scripts", "postiz-publish.mjs")


def die(msg):
    raise SystemExit(f"BATCH FAILED: {msg}")


def slot_time(monday, day, hhmm):
    h, m = map(int, hhmm.split(":"))
    local = datetime.datetime.combine(monday + datetime.timedelta(days=day), datetime.time(h, m), TZ)
    return local, local.astimezone(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")


def eligible(item, lane, when):
    if item["lane"] != lane or item.get("needs_deke") or item.get("week"):
        return False
    if lane == "reel" and item["status"] != "rendered":
        return False
    if lane == "text" and item["status"] != "ready":
        return False
    d = when.date().isoformat()
    if item.get("notBefore") and d < item["notBefore"]:
        return False
    if item.get("notAfter") and d > item["notAfter"]:
        return False
    return True


def with_cta(text):
    return text if "skool.com/deke" in text else f"{text}\n\n{CONFIG['cta']}"


def manifest_rows(item, slot_posts, monday, day):
    rows = []
    for platform, hhmm in slot_posts:
        local, utc = slot_time(monday, day, hhmm)
        row = {"platform": platform, "scheduledAtISO": utc, "engineItem": item["id"], "local": local.strftime("%a %b %d %H:%M"),
               "integrationId": CONFIG["postiz_channels"][platform]}  # pinned: never lands on another account
        if item["lane"] == "reel":
            c = item["copy"]
            row["mediaPaths"] = [item["media"]]
            if platform in ("instagram", "youtube") and item.get("cover"):
                row["coverPath"] = item["cover"]
            if platform == "tiktok":
                row["text"] = c.get("tiktok") or c["caption"]
                row["title"] = c.get("ytTitle", "")[:90]
            elif platform == "youtube":
                row["text"] = with_cta(c["caption"])
                row["title"] = c["ytTitle"][:100]
            else:
                row["text"] = with_cta(c["caption"])
        else:
            t = item["text"]
            body = t.get(platform) or t.get("facebook")
            row["text"] = body if platform == "threads" else with_cta(body)
        rows.append(row)
    return rows


def review_html(week, chosen, rows, dry, mode):
    esc = html.escape
    cards = []
    for slot, item in chosen:
        mine = [r for r in rows if r["engineItem"] == item["id"]]
        when = ", ".join(f"{r['platform']} {r['local']}" for r in mine)
        src = esc(item.get("sourceNote", ""))
        if item["lane"] == "reel":
            body = (f"<p><b>{esc(item['copy']['ytTitle'])}</b></p><p>{esc(item['copy']['caption']).replace(chr(10), '<br>')}</p>"
                    f"<p style='color:#666'>File: {esc(item['media'])}</p>")
        else:
            body = f"<p>{esc(item['text']['facebook']).replace(chr(10), '<br>')}</p>"
        cards.append(f"<div style='border:1px solid #ddd;border-radius:8px;padding:12px;margin:12px 0'>"
                     f"<div style='font-size:12px;color:#8a5a00;text-transform:uppercase'>{item['lane']} . {esc(when)}</div>"
                     f"{body}<div style='font-size:12px;color:#666'>Source: {src}</div></div>")
    ok = "PASS" if dry.get("ok") else "FAIL: " + esc("; ".join(dry.get("errors", []))[:600])
    action = ("These are already scheduled. To stop one, delete it in Postiz before its time."
              if mode == "standing" else
              f"Nothing is scheduled yet. To send this week, say <b>post week {week}</b> in any Claude session in the deke folder, "
              f"or run <code>engine\\approve.ps1 {week}</code>.")
    return (f"<div style='font-family:system-ui,Arial;max-width:680px'><h2>Deke posts, week of {week}</h2>"
            f"<p>{len(rows)} posts from {len(chosen)} pieces. Postiz dry run: <b>{ok}</b></p><p>{action}</p>{''.join(cards)}</div>")


def run_publisher(manifest, dry):
    args = ["node", PUBLISHER, "--manifest", manifest] + (["--dry-run"] if dry else [])
    r = subprocess.run(args, capture_output=True, text=True, encoding="utf-8", errors="replace", cwd=REPO)
    out = r.stdout.strip()
    try:
        parsed = json.loads(out[out.index("{"):]) if dry and "{" in out else {}
    except ValueError:
        parsed = {}
    return r.returncode, parsed, (r.stdout + r.stderr)[-3000:]


def plan(week, auto):
    monday = datetime.date.fromisoformat(week)
    if monday.weekday() != 0:
        die(f"{week} is not a Monday")
    folder = os.path.join(BATCHES, week)
    if os.path.exists(os.path.join(folder, "batch.json")):
        die(f"week {week} is already planned; release it first")
    bank = load_bank()
    chosen, rows, short = [], [], []
    for lane in ("reel", "text"):
        for slot in CONFIG["slots"][lane]:
            when, _ = slot_time(monday, slot["day"], slot["posts"][0][1])
            if when < now() + datetime.timedelta(hours=3):
                continue  # never schedule into the past or the next 3 hours
            pool = sorted([i for i in bank["items"] if eligible(i, lane, when)],
                          key=lambda i: (-(i.get("priority") or 0), i.get("notAfter") or "9999", i["id"]))
            if not pool:
                short.append(f"{lane} slot {when:%a %b %d}")
                continue
            item = pool[0]
            item["week"] = week
            item["status"] = "planned" if lane == "reel" or item["status"] == "ready" else item["status"]
            chosen.append((slot, item))
            rows += manifest_rows(item, slot["posts"], monday, slot["day"])
    if not rows:
        die("the bank has nothing eligible for this week (see engine/state/status.json)")
    os.makedirs(folder, exist_ok=True)
    manifest = os.path.join(folder, "manifest.json")
    json.dump({"packDate": week, "items": rows}, open(manifest, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    code, dry, tail = run_publisher(manifest, dry=True)
    json.dump(dry or {"raw": tail}, open(os.path.join(folder, "dryrun.json"), "w", encoding="utf-8"), indent=1)
    if code != 0:
        die(f"Postiz dry run failed, nothing scheduled:\n{tail}")
    save_bank(bank)
    mode = CONFIG["approval_mode"] if auto else "explicit"
    first = min(datetime.datetime.fromisoformat(r["scheduledAtISO"].replace("Z", "+00:00")) for r in rows).astimezone(TZ)
    meta = {"week": week, "status": "awaiting_go", "planned": now().isoformat(timespec="minutes"),
            "first_post_local": first.isoformat(), "items": [i["id"] for _, i in chosen], "posts": len(rows),
            "short_slots": short, "review_file": os.path.join(folder, "review.html")}
    json.dump(meta, open(os.path.join(folder, "batch.json"), "w", encoding="utf-8"), indent=1)
    if mode == "deke":
        import review  # Deke approves on dekesharon.com; review.tick() schedules on Sunday night
        review.send(week)
        print(f"PLANNED {week}: {len(rows)} posts, {len(chosen)} pieces, sent to Deke for review.")
        return
    if mode == "standing":
        publish(week)
    page = review_html(week, chosen, rows, dry, mode)
    open(meta["review_file"], "w", encoding="utf-8").write(page)
    gap = f" Short {len(short)} slot(s): {', '.join(short)}." if short else ""
    print(f"PLANNED {week}: {len(rows)} posts, {len(chosen)} pieces.{gap}")
    try:
        subj = (f"Deke week of {week} is scheduled ({len(rows)} posts)" if mode == "standing"
                else f"Deke week of {week} is ready for your go ({len(rows)} posts)")
        send_email(subj + (" - short slots" if short else ""), page)
    except Exception as e:
        print("EMAIL FAILED:", e, file=sys.stderr)


def publish(week):
    folder = os.path.join(BATCHES, week)
    meta_p = os.path.join(folder, "batch.json")
    if not os.path.exists(meta_p):
        die(f"no planned batch for {week}")
    meta = json.load(open(meta_p, encoding="utf-8"))
    code, _, tail = run_publisher(os.path.join(folder, "manifest.json"), dry=False)
    open(os.path.join(folder, "publish.log"), "a", encoding="utf-8").write(f"\n=== {now().isoformat()}\n{tail}\n")
    m = json.load(open(os.path.join(folder, "manifest.json"), encoding="utf-8"))
    states = [r.get("status") for r in m["items"]]
    bank = load_bank()
    for it in bank["items"]:
        if it["id"] in meta["items"]:
            mine = [r.get("status") for r in m["items"] if r["engineItem"] == it["id"]]
            it["status"] = "scheduled" if mine and all(s == "scheduled" for s in mine) else "publish_partial"
    save_bank(bank)
    meta["status"] = "scheduled" if code == 0 and all(s == "scheduled" for s in states) else "publish_failed"
    meta["published"] = now().isoformat(timespec="minutes")
    json.dump(meta, open(meta_p, "w", encoding="utf-8"), indent=1)
    if meta["status"] != "scheduled":
        die(f"publish for {week} incomplete ({states.count('scheduled')}/{len(states)} scheduled):\n{tail}")
    print(f"SCHEDULED {week}: {len(states)} posts")


def release(week):
    folder = os.path.join(BATCHES, week)
    meta = json.load(open(os.path.join(folder, "batch.json"), encoding="utf-8"))
    if meta["status"] == "scheduled":
        die("already scheduled in Postiz; delete posts there instead")
    bank = load_bank()
    for it in bank["items"]:
        if it.get("week") == week:
            it.pop("week")
            it["status"] = "rendered" if it["lane"] == "reel" else "ready"
    save_bank(bank)
    os.replace(folder, folder + f".released-{now():%Y%m%d%H%M}")
    print("released", week)


if __name__ == "__main__":
    if len(sys.argv) < 3:
        die(__doc__)
    cmd, week = sys.argv[1], sys.argv[2]
    {"plan": lambda: plan(week, "--auto" in sys.argv), "publish": lambda: publish(week), "release": lambda: release(week)}.get(
        cmd, lambda: die(f"unknown command {cmd}"))()
