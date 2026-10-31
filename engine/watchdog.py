"""Daily health check for the Deke content engine. Runs from Task Scheduler.

Emails Denis only when something is red (plus a short Monday summary), and
always writes engine/state/status.json so any Claude session can read it.
Red means: the Postiz runway is under the alert line, a batch is waiting for a
go and will lapse, the weekly run failed or did not run, the clip bank is
running dry, or the footage autopilot stopped. A watchdog that cannot reach
Postiz is itself red: it never reports "fine" on missing data.
"""
import json, os, sys, datetime, traceback
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import LIVE, CONFIG, now, load_bank, deke_posts, send_email, write_state, read_state, BATCHES

SKOOL = "C:/Users/lafla/claude_projects/claude-academy/1- Youtube Production/pipeline/Projects/deke/growth/data/skool.jsonl"
AUTOPILOT_LOG = "D:/deke-media/autopilot-log.txt"


def check():
    t = now()
    red, amber, facts = [], [], {}

    # 1. Postiz runway
    try:
        posts = deke_posts(days_back=7, days_ahead=60)
        future = sorted(p["publishDate"] for p in posts if p["publishDate"] > t.astimezone(datetime.timezone.utc).isoformat()
                        and (p.get("status") or "").upper() not in ("DRAFT",))
        errors = [p for p in posts if (p.get("status") or "").upper() in ("ERROR", "FAILED")]
        if future:
            last = datetime.datetime.fromisoformat(future[-1].replace("Z", "+00:00"))
            runway = (last - t).total_seconds() / 86400
        else:
            last, runway = None, 0.0
        utc_now = t.astimezone(datetime.timezone.utc).isoformat()
        def line(p):
            when = datetime.datetime.fromisoformat(p["publishDate"].replace("Z", "+00:00")).astimezone(t.tzinfo)
            text = (p.get("content") or "").replace("<p>", " ").replace("</p>", " ").strip()
            return f"{when:%a %b %d %H:%M} . {(p.get('integration') or {}).get('providerIdentifier', '?')} . {text[:70]}"
        s_went = [line(p) for p in sorted(posts, key=lambda p: p["publishDate"])
                  if p["publishDate"] <= utc_now and (p.get("state") or "").upper() == "PUBLISHED"]
        s_next = [line(p) for p in sorted(posts, key=lambda p: p["publishDate"])
                  if p["publishDate"] > utc_now and (p.get("state") or "").upper() not in ("DRAFT",)][:20]
        facts.update(runway_days=round(runway, 1), scheduled_posts=len(future),
                     last_scheduled=last.astimezone(t.tzinfo).strftime("%a %b %d") if last else None)
        if runway < CONFIG["runway_alert_days"]:
            red.append(f"Postiz runway is {runway:.1f} days ({len(future)} posts scheduled). Under {CONFIG['runway_alert_days']} days means Deke's accounts go dark soon.")
        if errors:
            red.append(f"{len(errors)} Deke post(s) failed in Postiz in the last 7 days: " +
                       ", ".join(sorted({(p.get('integration') or {}).get('providerIdentifier', '?') for p in errors})))
    except Exception as e:
        red.append(f"Could not read Postiz: {e}")

    # 2. Batches waiting for a go
    for wk in sorted(os.listdir(BATCHES)) if os.path.isdir(BATCHES) else []:
        meta_p = os.path.join(BATCHES, wk, "batch.json")
        if not os.path.exists(meta_p):
            continue
        meta = json.load(open(meta_p, encoding="utf-8"))
        if meta.get("status") == "awaiting_deke":
            amber.append(f"Week {wk} is with Deke for review (answer due {meta.get('deadline', '?')[:16]}; no answer means it all posts).")
        if meta.get("status") in ("publish_failed",):
            red.append(f"Week {wk} failed to schedule in Postiz. See engine/batches/{wk}/publish.log.")
        if meta.get("status") == "awaiting_go":
            first = datetime.datetime.fromisoformat(meta["first_post_local"])
            hours = (first - t).total_seconds() / 3600
            if hours < 72:
                red.append(f"Batch {wk} is still waiting for your go and its first post is in {hours:.0f} hours. "
                           f"Review: {meta.get('review_url') or meta.get('review_file')}. To approve, run engine\\approve.ps1 {wk}.")
            else:
                amber.append(f"Batch {wk} is waiting for your go (first post {first:%a %b %d}).")

    # 3. Weekly run
    lw = read_state("last-weekly.json")
    if not lw:
        amber.append("The weekly run has not run yet.")
    else:
        age = (t - datetime.datetime.fromisoformat(lw["finished"])).total_seconds() / 86400
        facts["last_weekly"] = lw["finished"][:16]
        if not lw.get("ok"):
            red.append(f"The last weekly run failed: {lw.get('error', 'no detail')[:400]}")
        elif age > 8:
            red.append(f"The weekly run has not run for {age:.0f} days. Check the 'Deke Engine Weekly' scheduled task.")

    # 4. Clip bank depth (reels the engine can still schedule without asking Deke for anything)
    bank = load_bank()
    free = [i for i in bank["items"] if not i.get("needs_deke") and not i.get("week")]
    reels_ready = sum(1 for i in free if i["lane"] == "reel" and i["status"] in ("rendered", "idea"))
    text_ready = sum(1 for i in free if i["lane"] == "text" and i["status"] == "ready")
    weeks = min(reels_ready / 3, text_ready / 2)
    facts.update(bank_reels=reels_ready, bank_text=text_ready, bank_weeks=round(weeks, 1),
                 needs_deke=sum(1 for i in bank["items"] if i.get("needs_deke") and not i.get("week")))
    if weeks < CONFIG["bank_alert_weeks"]:
        amber.append(f"The clip bank holds {weeks:.1f} weeks ({reels_ready} reels, {text_ready} text posts). "
                     "The weekly run mines more from Deke's YouTube automatically; this is a heads-up, not a task.")

    # 5. Footage autopilot
    try:
        lines = open(AUTOPILOT_LOG, encoding="utf-8", errors="replace").read().strip().splitlines()
        stamp = lines[-1][1:25]
        age_h = (datetime.datetime.now(datetime.timezone.utc) - datetime.datetime.fromisoformat(stamp.replace("Z", "+00:00"))).total_seconds() / 3600
        facts["autopilot_last"] = lines[-1][:120]
        if age_h > 14:
            red.append(f"The Dropbox footage autopilot last logged {age_h:.0f} hours ago (it runs every 6 hours). Is the D: drive plugged in?")
        recent_new = [l for l in lines[-8:] if "nothing new" not in l]
        if recent_new:
            amber.append("Deke's Dropbox had activity: " + recent_new[-1][:160])
    except Exception as e:
        red.append(f"Cannot read the footage autopilot log ({e}). The D: drive may be unplugged.")

    # 6. Skool trend (for the report only)
    try:
        rows = [json.loads(l) for l in open(SKOOL, encoding="utf-8") if l.strip()]
        cur = rows[-1]
        wk = next((r for r in reversed(rows) if (datetime.datetime.fromisoformat(cur["scan_at"]) - datetime.datetime.fromisoformat(r["scan_at"])).days >= 7), rows[0])
        facts.update(skool_members=cur["total_members"], skool_week_gain=cur["total_members"] - wk["total_members"],
                     skool_posts=cur["total_posts"])
    except Exception as e:
        amber.append(f"Skool pulse unreadable: {e}")

    lists = {"went_out_last_7_days": locals().get("s_went", []), "coming_up": locals().get("s_next", [])}
    if not LIVE:
        # Paused on purpose: an empty queue is expected, so it is not an emergency.
        amber[:0] = ["The engine is paused (dry-run mode, config live=false). Nothing goes to Deke or Postiz."] +             [x for x in red if x.startswith("Postiz runway")]
        red = [x for x in red if not x.startswith("Postiz runway")]
    return {"checked": t.isoformat(timespec="minutes"), "red": red, "amber": amber, "facts": facts, "lists": lists,
            "level": "red" if red else ("amber" if amber else "green")}


def render_html(s):
    f, L = s["facts"], s.get("lists", {})
    li = lambda xs, c: "".join(f'<li style="margin:6px 0;color:{c}">{x}</li>' for x in xs)
    plain = lambda xs: "".join(f'<li style="margin:3px 0">{x}</li>' for x in xs) or '<li style="color:#888">none</li>'
    if s["red"]:
        todo = "<p style='font-size:16px'><b>You need to look at the red items below.</b></p>"
    else:
        todo = "<p style='font-size:16px'><b>Nothing for you to do.</b> The engine is running on its own.</p>"
    rows = "".join(f"<tr><td style='padding:3px 12px 3px 0;color:#666'>{k.replace('_', ' ')}</td><td><b>{v}</b></td></tr>"
                   for k, v in f.items() if k != "autopilot_last")
    return (f"<div style='font-family:system-ui,Arial;max-width:640px'>"
            f"<h2 style='margin:0 0 8px'>Deke engine: {s['level'].upper()}</h2>{todo}"
            f"<ul style='padding-left:18px'>{li(s['red'], '#b00020')}{li(s['amber'], '#8a5a00')}</ul>"
            f"<h3 style='margin:18px 0 4px'>Went out in the last 7 days</h3><ul style='padding-left:18px;font-size:14px'>{plain(L.get('went_out_last_7_days', []))}</ul>"
            f"<h3 style='margin:18px 0 4px'>Coming up</h3><ul style='padding-left:18px;font-size:14px'>{plain(L.get('coming_up', []))}</ul>"
            f"<h3 style='margin:18px 0 4px'>Numbers</h3><table style='font-size:14px'>{rows}</table>"
            f"<p style='color:#888;font-size:12px'>Checked {s['checked']}. You get this every Monday, plus any morning something is red. "
            f"To stop a scheduled post, delete it in Postiz.</p></div>")


def main():
    review_error = None
    try:
        import review
        review.tick()  # catch-up: finalize or remind even if the review task did not run
    except Exception as e:
        review_error = str(e)
    try:
        s = check()
        if review_error:
            s["red"].insert(0, f"Deke review step failed: {review_error[:500]}")
            s["level"] = "red"
    except Exception:
        s = {"checked": now().isoformat(), "red": ["Watchdog crashed: " + traceback.format_exc()[-800:]],
             "amber": [], "facts": {}, "level": "red"}
    write_state("status.json", s)
    print(json.dumps(s, indent=1, ensure_ascii=False))
    monday = now().weekday() == 0
    if s["red"] or monday or "--email" in sys.argv:
        subject = (f"RED: Deke engine needs you ({len(s['red'])})" if s["red"]
                   else f"Deke engine weekly: runway {s['facts'].get('runway_days')} days, Skool {s['facts'].get('skool_members')}")
        try:
            from common import tag
            send_email(tag(subject), render_html(s))
            print("emailed:", subject)
        except Exception as e:
            print("EMAIL FAILED:", e, file=sys.stderr)
            sys.exit(2)
    sys.exit(1 if s["red"] else 0)


if __name__ == "__main__":
    main()
