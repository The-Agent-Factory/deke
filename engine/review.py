"""Deke's weekly approval (approval_mode "deke", Denis 2026-10-31).

  send(week)   Saturday: upload previews, post the plan to dekesharon.com, email Deke the private link.
  tick()       Run often (Task Scheduler + the daily watchdog). For each week waiting on Deke:
                 - he answered          -> schedule everything he approved, drop what he skipped
                 - deadline passed      -> no answer counts as yes, schedule everything
                 - Sunday morning, quiet -> one reminder email
  python engine/review.py tick | send <monday>

Skipped items are marked skipped_by_deke in the bank and never offered again.
Every outcome is emailed to Denis; failures exit non-zero so the watchdog turns red.
"""
import datetime, html, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import CONFIG, TZ, BATCHES, now, load_bank, save_bank, send_email, site_api, postiz_upload

PLATFORM_NAMES = {"instagram": "Instagram", "facebook": "Facebook", "youtube": "YouTube Shorts",
                  "tiktok": "TikTok", "linkedin": "LinkedIn", "threads": "Threads"}


def _meta_path(week):
    return os.path.join(BATCHES, week, "batch.json")


def _load(week):
    meta = json.load(open(_meta_path(week), encoding="utf-8"))
    manifest = json.load(open(os.path.join(BATCHES, week, "manifest.json"), encoding="utf-8"))
    return meta, manifest


def _save_meta(week, meta):
    json.dump(meta, open(_meta_path(week), "w", encoding="utf-8"), indent=1)


def deadline_for(week):
    monday = datetime.date.fromisoformat(week)
    return datetime.datetime.combine(monday - datetime.timedelta(days=1), datetime.time(21, 0), TZ)


def send(week):
    meta, manifest = _load(week)
    bank = {i["id"]: i for i in load_bank()["items"]}
    items = []
    for item_id in meta["items"]:
        it = bank[item_id]
        rows = [r for r in manifest["items"] if r["engineItem"] == item_id]
        first = min(rows, key=lambda r: r["scheduledAtISO"])
        when = datetime.datetime.fromisoformat(first["scheduledAtISO"].replace("Z", "+00:00")).astimezone(TZ)
        entry = {"id": item_id, "lane": it["lane"], "when": when.strftime("%a %b %d"),
                 "platforms": [PLATFORM_NAMES.get(r["platform"], r["platform"]) for r in rows],
                 "sourceNote": it.get("sourceNote", "")}
        if it["lane"] == "reel":
            entry["title"] = it["copy"]["ytTitle"]
            entry["caption"] = it["copy"]["caption"]
            if not it.get("previewUrl"):
                it["previewUrl"] = postiz_upload(it["media"])
                if it.get("cover") and os.path.exists(it["cover"]):
                    it["posterUrl"] = postiz_upload(it["cover"])
            entry["videoUrl"] = it["previewUrl"]
            if it.get("posterUrl"):
                entry["posterUrl"] = it["posterUrl"]
        else:
            body = it["text"]["facebook"]
            entry["title"] = body.split("\n")[0][:110]
            entry["caption"] = body
        items.append(entry)
    # keep preview URLs so a re-send does not upload again
    full = load_bank()
    for b in full["items"]:
        if b["id"] in bank and bank[b["id"]].get("previewUrl"):
            b["previewUrl"] = bank[b["id"]]["previewUrl"]
            if bank[b["id"]].get("posterUrl"):
                b["posterUrl"] = bank[b["id"]]["posterUrl"]
    save_bank(full)

    deadline = deadline_for(week)
    res = site_api("POST", "/api/content-review", {"week": week, "deadline": deadline.isoformat(), "items": items})
    url = res["url"]
    meta.update(status="awaiting_deke", review_url=url, sent_to_deke=now().isoformat(timespec="minutes"),
                deadline=deadline.isoformat())
    _save_meta(week, meta)

    reels = sum(1 for i in items if i["lane"] == "reel")
    texts = len(items) - reels
    monday = datetime.date.fromisoformat(week)
    body = (
        "<div style='font-family:system-ui,Arial;font-size:16px;max-width:560px;line-height:1.5'>"
        "<p>Hi Deke,</p>"
        f"<p>Here is next week on your channels (week of {monday:%B %d}): {reels} videos and {texts} text posts, "
        "all built from your own videos and words.</p>"
        f"<p><a href='{html.escape(url)}' style='display:inline-block;background:#d97706;color:#fff;padding:12px 20px;"
        "border-radius:6px;text-decoration:none;font-weight:600'>Review next week</a></p>"
        "<p>Tap Approve or Skip on each one. It takes about three minutes, and it works on your phone. "
        "Anything you skip never posts, and you can add a note if you want more of something.</p>"
        f"<p>If I don't hear back by {deadline.strftime('%A at %I %p').replace(' 0', ' ')}, everything goes out as planned.</p>"
        "<p>Denis</p></div>"
    )
    send_email(f"Next week on your channels: {reels} videos, {texts} posts to approve", body,
               to=CONFIG["deke_email"], reply_to=CONFIG["alert_email"], bcc=CONFIG["alert_email"],
               sender=CONFIG["review_from"])
    print(f"SENT {week} to Deke: {url.split('?')[0]}")


def _remind(week, meta):
    deadline = datetime.datetime.fromisoformat(meta["deadline"])
    body = (
        "<div style='font-family:system-ui,Arial;font-size:16px;max-width:560px;line-height:1.5'>"
        "<p>Hi Deke, a quick reminder: next week's posts are waiting for your OK.</p>"
        f"<p><a href='{html.escape(meta['review_url'])}'>Review next week</a></p>"
        f"<p>If there is no answer by {deadline.strftime('%A at %I %p').replace(' 0', ' ')}, it all goes out as planned.</p>"
        "<p>Denis</p></div>")
    send_email("Reminder: next week's posts are waiting for your OK", body, to=CONFIG["deke_email"],
               reply_to=CONFIG["alert_email"], sender=CONFIG["review_from"])
    meta["reminded"] = now().isoformat(timespec="minutes")
    _save_meta(week, meta)
    print(f"REMINDED Deke about {week}")


def finalize(week, meta, answer):
    import batch
    decisions = (answer or {}).get("decisions") or {}
    skipped = [k for k, v in decisions.items() if v == "skip"]
    mpath = os.path.join(BATCHES, week, "manifest.json")
    manifest = json.load(open(mpath, encoding="utf-8"))
    manifest["items"] = [r for r in manifest["items"] if r["engineItem"] not in skipped]
    json.dump(manifest, open(mpath, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    bank = load_bank()
    for it in bank["items"]:
        if it["id"] in skipped:
            it["status"] = "skipped_by_deke"
    save_bank(bank)
    meta["items"] = [i for i in meta["items"] if i not in skipped]
    meta["deke_answer"] = {"skipped": skipped, "note": (answer or {}).get("note"),
                           "submittedAt": (answer or {}).get("submittedAt"),
                           "silence_counted_as_yes": not decisions}
    _save_meta(week, meta)
    if manifest["items"]:
        batch.publish(week)  # raises SystemExit on failure; status becomes scheduled
    else:
        meta["status"] = "all_skipped"
        _save_meta(week, meta)
    how = "Deke answered" if decisions else "No answer by the deadline, so everything went out"
    note = (answer or {}).get("note")
    send_email(f"Deke week of {week}: {len(manifest['items'])} posts scheduled, {len(skipped)} skipped",
               f"<div style='font-family:system-ui,Arial'><p><b>{how}.</b></p>"
               f"<p>Scheduled: {len(manifest['items'])} posts. Skipped by Deke: {', '.join(skipped) or 'none'}.</p>"
               + (f"<p>Deke's note: <i>{html.escape(note)}</i></p>" if note else "") + "</div>")
    print(f"FINALIZED {week}: {len(manifest['items'])} posts, skipped {skipped}")


def tick():
    failures = []
    for week in sorted(os.listdir(BATCHES)):
        if not os.path.exists(_meta_path(week)):
            continue
        meta = json.load(open(_meta_path(week), encoding="utf-8"))
        if meta.get("status") != "awaiting_deke":
            continue
        try:
            answer = site_api("GET", f"/api/content-review?week={week}")
            deadline = datetime.datetime.fromisoformat(meta["deadline"])
            if answer.get("submittedAt"):
                finalize(week, meta, answer)
            elif now() >= deadline:
                finalize(week, meta, None)
            elif now() >= deadline - datetime.timedelta(hours=14) and not meta.get("reminded"):
                _remind(week, meta)
        except SystemExit as e:
            failures.append(f"{week}: {e.code}")
        except Exception as e:
            failures.append(f"{week}: {e}")
    if failures:
        raise RuntimeError("review tick failed: " + " | ".join(failures))


if __name__ == "__main__":
    if len(sys.argv) >= 2 and sys.argv[1] == "tick":
        tick()
    elif len(sys.argv) >= 3 and sys.argv[1] == "send":
        send(sys.argv[2])
    else:
        raise SystemExit(__doc__)
