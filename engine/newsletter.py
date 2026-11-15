"""One Voice: Deke's weekly newsletter, run by the content engine (Denis, 2026-11-15).

Rules that never bend:
  - An issue goes to subscribers ONLY after Deke taps "Approve and send" on it.
    Silence or Hold means it is held and Denis is told. (Unlike social posts.)
  - Every line comes from something Deke said on record; sources ride with the draft.
  - The site (dekesharon.com) owns the format rules, the email template, the list sync and
    the Resend broadcast. This file only drafts, asks, and tells the site when to send.

Commands:
  python newsletter.py check <issue.json>                 validate on the site, print errors
  python newsletter.py test <issue.json> [--to EMAIL]     one test copy (default: Denis)
  python newsletter.py sync [--dry]                       Resend segment <-> site subscribers
  python newsletter.py review <issue.json> --key YYYY-MM-DD --send-at ISO
                                                          stand-alone review page for Deke
  python newsletter.py finalize <issue.json>              read Deke's answer; schedule if approved
  python newsletter.py draft <week>                       write batches/<week>/newsletter.json

Weekly flow: batch.py plan -> draft(week) -> review.send adds the Newsletter card ->
review.finalize calls schedule_for_week(week, decision).
"""
import datetime, html, json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import CONFIG, TZ, DRY, ENGINE, REPO, STATE, BATCHES, now, load_bank, send_email, site_api, tag, safe_write_json

# The newsletter has its own switch (config "newsletter_live"), separate from the social engine's "live".
# Off: review emails go to Denis instead of Deke, and approved issues are only logged, never scheduled.
NL_LIVE = CONFIG.get("newsletter_live") is True and not DRY


def deke_inbox():
    return CONFIG["deke_email"] if NL_LIVE else CONFIG["alert_email"]

SEND_WEEKDAY = 2           # Wednesday (Monday = 0)
SEND_TIME = datetime.time(8, 0)
LOG_PATH = os.path.join(STATE, "newsletter.json")   # issue log: what was scheduled or held


def _log():
    try:
        return json.load(open(LOG_PATH, encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return {"issues": {}}


def _save_log(data):
    safe_write_json(LOG_PATH, data)


def next_issue_number():
    """Issue 0 is the welcome. Weekly issues count up from the last one that was scheduled."""
    done = [int(k) for k, v in _log()["issues"].items() if v.get("status") == "scheduled"]
    return max(done) + 1 if done else 1


def load_issue(path):
    return json.load(open(path, encoding="utf-8"))


def check(draft):
    """The site validates (one rule set, in src/lib/newsletter/one-voice.ts). Raises with the errors."""
    try:
        site_api("POST", "/api/newsletters/engine/test", {"draft": draft, "render": True})
    except RuntimeError as e:
        raise RuntimeError(f"newsletter draft rejected: {e}")
    return True


def test(draft, to=None):
    res = site_api("POST", "/api/newsletters/engine/test", {"draft": draft, "to": [to or CONFIG["alert_email"]]})
    return res


def sync(dry=False):
    return site_api("POST", "/api/newsletters/engine/sync", {"dryRun": dry})


def send_at_for_week(week):
    monday = datetime.date.fromisoformat(week)
    return datetime.datetime.combine(monday + datetime.timedelta(days=SEND_WEEKDAY), SEND_TIME, TZ)


def review_item(draft, send_at, readers=None):
    when = send_at.strftime("%a %b %d").replace(" 0", " ")
    return {
        "id": "newsletter",
        "lane": "newsletter",
        "when": f"{when}, {send_at.strftime('%I %p').lstrip('0')} ET",
        "platforms": [f"Email to {readers} readers" if readers else "Email to the One Voice list"],
        "title": draft["subject"],
        "caption": draft["previewText"],
        "newsletter": draft,
    }


def schedule(draft, send_at, why):
    """Only called after an explicit Approve. Logs only (no broadcast) while newsletter_live is off."""
    entry = {"subject": draft["subject"], "sendAt": send_at.isoformat(), "approved": why,
             "at": now().isoformat(timespec="minutes")}
    log = _log()
    if not NL_LIVE:
        entry["status"] = "would_schedule"
        log["issues"][str(draft["issueNumber"])] = entry
        _save_log(log)
        return {"dry": True, **entry}
    res = site_api("POST", "/api/newsletters/engine/schedule", {"draft": draft, "sendAt": send_at.isoformat()})
    entry.update(status="scheduled", broadcastId=res.get("broadcastId"), recipients=res.get("recipients"),
                 syncFailures=(res.get("sync") or {}).get("failures"))
    log["issues"][str(draft["issueNumber"])] = entry
    _save_log(log)
    return res


def hold(draft, reason):
    log = _log()
    log["issues"][str(draft["issueNumber"])] = {"subject": draft["subject"], "status": "held", "reason": reason,
                                                 "at": now().isoformat(timespec="minutes")}
    _save_log(log)


def decide(draft, send_at, decision, context):
    """decision: 'approve', 'skip' or None. Emails Denis either way. Returns a one-line summary."""
    n = draft["issueNumber"]
    if decision == "approve":
        try:
            res = schedule(draft, send_at, f"Deke approved ({context})")
        except Exception as e:
            send_email(tag(f"One Voice {n}: Deke approved it but scheduling FAILED"),
                       f"<p>Deke approved <b>{html.escape(draft['subject'])}</b>, but the site refused to schedule it:</p>"
                       f"<pre>{html.escape(str(e))[:1500]}</pre><p>Nothing was sent to subscribers.</p>")
            raise
        if res.get("dry"):
            line = f"One Voice {n} approved; newsletter_live is off, so it WOULD be scheduled for {send_at:%a %b %d %I:%M %p}"
        else:
            fails = (res.get("sync") or {}).get("failures") or []
            line = (f"One Voice {n} scheduled for {send_at:%a %b %d %I:%M %p} ET to {res.get('recipients')} readers"
                    + (f"; {len(fails)} contacts failed to sync" if fails else ""))
        send_email(tag(f"One Voice {n}: scheduled"), f"<p>{html.escape(line)}.</p><p>Subject: {html.escape(draft['subject'])}</p>")
        return line
    reason = "Deke tapped Hold" if decision == "skip" else "Deke did not answer before the deadline"
    hold(draft, reason)
    send_email(tag(f"One Voice {n}: HELD ({reason})"),
               f"<p><b>{html.escape(draft['subject'])}</b> was not sent: {reason}.</p>"
               "<p>Per your rule, a newsletter only goes out on Deke's explicit yes. "
               "Next week's draft will reuse this issue number.</p>")
    return f"One Voice {n} held: {reason}"


# ---------- stand-alone review (Issue 0, or any one-off issue) ----------

def _state_for(path):
    return path + ".state.json"


def review(path, key, send_at_iso):
    draft = load_issue(path)
    check(draft)
    send_at = datetime.datetime.fromisoformat(send_at_iso).astimezone(TZ)
    deadline = send_at - datetime.timedelta(hours=12)
    # force: a (re)send always wipes earlier answers, so a tap on Denis's preview copy can never
    # count as Deke's approval once newsletter_live is on.
    res = site_api("POST", "/api/content-review", {"week": key, "deadline": deadline.isoformat(), "force": True,
                                                   "items": [review_item(draft, send_at)]})
    url = res["url"]
    safe_write_json(_state_for(path), {"key": key, "sendAt": send_at.isoformat(), "deadline": deadline.isoformat(),
                                       "url": url, "sent": now().isoformat(timespec="minutes"), "status": "awaiting_deke"})
    body = ("<div style='font-family:system-ui,Arial;font-size:16px;max-width:560px;line-height:1.5'>"
            "<p>Hi Deke,</p>"
            "<p>Your newsletter, One Voice, is ready for you to read. It goes to the people who signed up on "
            f"dekesharon.com, on {send_at:%A %B %d} at {send_at.strftime('%I %p').lstrip('0')} Eastern.</p>"
            f"<p><a href='{html.escape(url)}' style='display:inline-block;background:#d97706;color:#fff;padding:12px 20px;"
            "border-radius:6px;text-decoration:none;font-weight:600'>Read the newsletter</a></p>"
            "<p>Read it on your phone, then tap <b>Approve and send</b> or <b>Hold</b>. "
            "It only goes out if you tap Approve.</p><p>Denis</p></div>")
    send_email(tag(f"Your newsletter is ready to read: {draft['subject']}"), body, to=deke_inbox(),
               reply_to=CONFIG["alert_email"], bcc=CONFIG["alert_email"] if NL_LIVE else None, sender=CONFIG["review_from"])
    return url


def finalize(path):
    draft = load_issue(path)
    st = json.load(open(_state_for(path), encoding="utf-8"))
    if st.get("status") != "awaiting_deke":
        return f"nothing to do ({st.get('status')})"
    answer = site_api("GET", f"/api/content-review?week={st['key']}")
    decision = (answer.get("decisions") or {}).get("newsletter")
    deadline = datetime.datetime.fromisoformat(st["deadline"])
    if not decision and now() < deadline:
        return "waiting for Deke"
    line = decide(draft, datetime.datetime.fromisoformat(st["sendAt"]), decision, "stand-alone review")
    st["status"] = "done"
    st["result"] = line
    safe_write_json(_state_for(path), st)
    return line


def tick_standalone():
    """Called by review.py tick (9 AM and 9 PM): finalize every stand-alone issue awaiting Deke."""
    if not NL_LIVE:
        return ["newsletter_live is off: stand-alone issues not checked"]
    import glob
    out = []
    for st_path in sorted(glob.glob(os.path.join(REPO, "newsletter", "issues", "*.json.state.json"))):
        issue_path = st_path[: -len(".state.json")]
        out.append(f"{os.path.basename(issue_path)}: {finalize(issue_path)}")
    return out


# ---------- weekly draft ----------

def draft(week):
    """Headless Claude writes batches/<week>/newsletter.json from the week's planned pieces."""
    import subprocess
    meta = json.load(open(os.path.join(BATCHES, week, "batch.json"), encoding="utf-8"))
    bank = {i["id"]: i for i in load_bank()["items"]}
    pieces = []
    for item_id in meta["items"]:
        it = bank.get(item_id)
        if not it:
            continue
        text = (it.get("text") or {}).get("facebook") or (it.get("copy") or {}).get("caption") or ""
        pieces.append({"id": item_id, "lane": it.get("lane"), "text": text, "sourceNote": it.get("sourceNote", ""),
                       "source": it.get("source"), "segments": it.get("segments"),
                       "ytTitle": (it.get("copy") or {}).get("ytTitle")})
    out = os.path.join(BATCHES, week, "newsletter.json")
    log = _log()
    job = {"week": week, "issueNumber": next_issue_number(), "output": out,
           "sendAt": send_at_for_week(week).isoformat(), "pieces": pieces,
           "pastSubjects": [v.get("subject") for v in log["issues"].values()],
           "media_root": CONFIG.get("media_root")}
    job_path = os.path.join(STATE, "newsletter-job.json")
    safe_write_json(job_path, job)
    prompt = open(os.path.join(ENGINE, "NEWSLETTER-PROMPT.md"), encoding="utf-8").read()
    prompt += f"\n\nJob file for this run: `{job_path}`\n"
    # Least privilege: the draft only reads sources and writes one JSON file. No shell, no web,
    # no skip-permissions; Write is pre-approved via acceptEdits.
    r = subprocess.run(["claude", "-p", prompt, "--allowedTools", "Read,Write,Glob,Grep",
                        "--permission-mode", "acceptEdits", "--max-turns", "40"],
                       capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=1800, cwd=REPO)
    open(os.path.join(STATE, f"newsletter-draft-{week}.log"), "w", encoding="utf-8").write((r.stdout or "") + (r.stderr or ""))
    if r.returncode != 0 or not os.path.exists(out):
        raise RuntimeError(f"newsletter draft for {week} failed (exit {r.returncode}); see state/newsletter-draft-{week}.log")
    check(load_issue(out))
    return out


def weekly_item(week):
    """The Newsletter card for review.send, or None if this week has no draft."""
    p = os.path.join(BATCHES, week, "newsletter.json")
    if not os.path.exists(p):
        return None
    return review_item(load_issue(p), send_at_for_week(week))


def schedule_for_week(week, decision):
    p = os.path.join(BATCHES, week, "newsletter.json")
    if not os.path.exists(p):
        return None
    return decide(load_issue(p), send_at_for_week(week), decision, f"weekly review {week}")


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a:
        print(__doc__); sys.exit(1)
    cmd = a[0]
    opt = lambda name: a[a.index(name) + 1] if name in a else None
    if cmd == "check":
        check(load_issue(a[1])); print("OK: passes the One Voice rules")
    elif cmd == "test":
        print(json.dumps(test(load_issue(a[1]), opt("--to")), indent=1))
    elif cmd == "sync":
        print(json.dumps(sync("--dry" in a), indent=1))
    elif cmd == "review":
        print(review(a[1], opt("--key"), opt("--send-at")))
    elif cmd == "finalize":
        print(finalize(a[1]))
    elif cmd == "draft":
        print(draft(a[1]))
    else:
        print(__doc__); sys.exit(1)
