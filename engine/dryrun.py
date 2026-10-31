"""Dry run of the whole weekly loop, head to toe, in a private copy of the engine.

Nothing reaches Deke and nothing is scheduled in Postiz:
  - it works on engine/bank-dry.json, engine/batches-dry/, engine/state-dry/ (the real ones are untouched)
  - every "Deke" email goes to Denis, marked [DRY RUN]
  - the review page uses the week key dry-<date> and shows a DRY RUN banner
  - finalize runs the Postiz publisher's dry run only
  - the last step proves it: no new Deke posts in Postiz, no email to Deke's address

  python engine/dryrun.py list                 the steps
  python engine/dryrun.py step <n>             run one step
  python engine/dryrun.py all [--answer approve-all|skip-first]   run every step
       --answer simulates Deke's taps; without it, step 6 waits for YOU to answer on the page.
Report: engine/state-dry/dryrun-report.json
"""
import os, sys
os.environ["DEKE_ENGINE_DRY"] = "1"  # must be set before common is imported
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import datetime, json, shutil, subprocess, urllib.request, urllib.parse
from common import (CONFIG, ENGINE, REPO, STATE, BATCHES, BANK_PATH, ENV, TZ, LIVE, DRY, now, load_bank,
                    deke_posts, safe_write_json, site_week)

assert DRY and not LIVE, "dry run must run in the dry workspace and never live"
PY = [sys.executable, "-X", "utf8"]
REPORT = os.path.join(STATE, "dryrun-report.json")


def target_week():
    t = now().date()
    first = t + datetime.timedelta(days=(7 - t.weekday()) % 7 or 7)
    if datetime.datetime.combine(first, datetime.time(0), TZ) < now() + datetime.timedelta(hours=36):
        first += datetime.timedelta(days=7)
    return first.isoformat()


def run(args, timeout=1800):
    r = subprocess.run(PY + args, capture_output=True, text=True, encoding="utf-8", errors="replace",
                       timeout=timeout, cwd=REPO, env=os.environ.copy())
    return r.returncode, (r.stdout + r.stderr).strip()


def report():
    return json.load(open(REPORT, encoding="utf-8")) if os.path.exists(REPORT) else {"steps": {}}


def record(n, name, ok, what, evidence):
    rep = report()
    rep.setdefault("started", now().isoformat(timespec="minutes"))
    rep["week"] = rep.get("week") or target_week()
    rep["steps"][str(n)] = {"name": name, "ok": ok, "what": what, "evidence": evidence[-1500:],
                            "at": now().isoformat(timespec="minutes")}
    safe_write_json(REPORT, rep)
    print(f"\n[{'PASS' if ok else 'FAIL' if ok is False else 'WAIT'}] Step {n}: {name}\n  {what}\n  {evidence[-600:]}")
    return ok


# ---------------------------------------------------------------- steps
def s0():
    """Fresh dry workspace: copy the real bank, clear old dry batches and state."""
    for p in (BATCHES,):
        if os.path.isdir(p):
            shutil.rmtree(p)
    os.makedirs(BATCHES, exist_ok=True)
    for f in os.listdir(STATE):
        if f != "dryrun-report.json":
            os.remove(os.path.join(STATE, f))
    if os.path.exists(REPORT):
        os.remove(REPORT)
    real = json.load(open(os.path.join(ENGINE, "bank.json"), encoding="utf-8"))
    for it in real["items"]:  # the real Nov 9 plan must not block the copy
        if it.get("week") and it.get("status") == "planned":
            it.pop("week")
            it["status"] = "rendered" if it["lane"] == "reel" else "ready"
    safe_write_json(BANK_PATH, real)
    baseline = sorted(p["id"] for p in deke_posts(7, 60))
    rep = report()
    rep["postiz_baseline"] = baseline
    safe_write_json(REPORT, rep)
    reels = sum(1 for i in real["items"] if i["lane"] == "reel")
    return record(0, "Fresh dry workspace", True, "Copied the real clip bank into a private dry copy.",
                  f"{len(real['items'])} items ({reels} reels) copied to {os.path.basename(BANK_PATH)}. Target week: {target_week()}.")


def s1():
    """Preflight: drive, keys, tools, Postiz, website."""
    probs, ok_list = [], []
    if not os.path.isdir("D:/deke-media"):
        probs.append("D: media drive missing")
    for tool in ("node", "yt-dlp", "ffmpeg", "claude"):
        (ok_list if shutil.which(tool) else probs).append(tool)
    for k in ("POSTIZ_API_KEY", "RESEND_API_KEY", "ENGINE_REVIEW_SECRET"):
        (ok_list if ENV.get(k) else probs).append(f"{k} in deke/.env" if ENV.get(k) else f"{k} missing from deke/.env")
    try:
        n = len(deke_posts(0, 30))
        ok_list.append(f"Postiz reachable ({n} Deke posts queued)")
    except Exception as e:
        probs.append(f"Postiz: {e}")
    try:
        req = urllib.request.Request(CONFIG["review_site"] + "/api/content-review?week=2000-01-03",
                                     headers={"Authorization": f"Bearer {ENV.get('ENGINE_REVIEW_SECRET', '')}",
                                              "User-Agent": "deke-content-engine/1.0"})
        try:
            urllib.request.urlopen(req, timeout=30)
            ok_list.append("website accepts the engine secret")
        except urllib.error.HTTPError as e:
            if e.code == 404:
                ok_list.append("website accepts the engine secret")
            elif e.code == 401:
                probs.append("website refuses the engine secret: run engine/install-tasks.ps1 (it sets ENGINE_REVIEW_SECRET on Railway)")
            else:
                probs.append(f"website answered {e.code}")
    except Exception as e:
        probs.append(f"website: {e}")
    return record(1, "Preflight", not probs, "Checked the drive, tools, keys, Postiz and the review website.",
                  ("Problems: " + "; ".join(probs) + ". " if probs else "") + "OK: " + ", ".join(ok_list))


def s2():
    """Find Deke's videos on YouTube (read-only)."""
    import weekly
    src = weekly.refresh_sources()
    new = [v for v in src["videos"] if v["status"] == "new"]
    return record(2, "Find Deke's videos", True, "Listed Deke's YouTube channel; long videos become mining sources.",
                  f"{len(src['videos'])} videos found, {len(new)} not mined yet. Next to mine: "
                  + (new[0]["title"] if new else "none"))


def s3():
    """Quality gate: a deliberately bad clip must be rejected."""
    bad = [{"id": "dry-bad-sample", "lane": "reel", "source": {"type": "youtube", "id": "J75D3PhzzL0"},
            "segments": [[200.9, 205.0]], "framing": {"kind": "blur43"}, "sourceNote": "dry run sample",
            "copy": {"ytTitle": "x", "caption": "For choir directors \u2014 a test", "tiktok": "#choirdirector"}}]
    p = os.path.join(STATE, "bad-sample.json")
    json.dump(bad, open(p, "w", encoding="utf-8"))
    code, out = run([os.path.join(ENGINE, "add_items.py"), p])
    caught = code != 0 and "REJECTED" in out
    return record(3, "Quality gate", caught,
                  "Fed the checker a clip that is too short, cuts through a word, says 'choir directors' and uses a dash. "
                  "It must refuse it. (The unattended Claude mining run itself is exercised by the Saturday task, "
                  "not from this script.)", out)


def s4():
    """Render one reel from the bank."""
    bank = load_bank()
    todo = [i for i in bank["items"] if i["lane"] == "reel" and i["status"] == "idea"]
    if not todo:
        return record(4, "Render a reel", True, "Nothing waiting to render; every reel in the bank is already rendered.", "")
    code, out = run([os.path.join(ENGINE, "render.py"), todo[0]["id"]], timeout=1200)
    return record(4, "Render a reel", code == 0,
                  f"Rendered '{todo[0]['id']}' (vertical, gold captions, Join Total Vocal end card) and checked size, length and loudness.",
                  out)


def s5():
    """Build next week, Postiz dry run, send the review email (to Denis)."""
    wk = report().get("week") or target_week()
    code, out = run([os.path.join(ENGINE, "batch.py"), "plan", wk, "--auto"], timeout=1800)
    meta_p = os.path.join(BATCHES, wk, "batch.json")
    meta = json.load(open(meta_p, encoding="utf-8")) if os.path.exists(meta_p) else {}
    ok = code == 0 and meta.get("status") == "awaiting_deke"
    ev = out + (f"\nReview link: {meta.get('review_url')}" if meta.get("review_url") else "")
    return record(5, "Build next week and send the review", ok,
                  f"Picked 3 reels and 2 text posts for the week of {wk}, ran the Postiz dry run, put them on the review page "
                  "and emailed the link. The email went to Denis, not Deke.", ev)


def s6(answer=None):
    """Deke's answer (you tap the buttons, or --answer simulates it)."""
    wk = report()["week"]
    meta = json.load(open(os.path.join(BATCHES, wk, "batch.json"), encoding="utf-8"))
    url = meta["review_url"]
    token = urllib.parse.parse_qs(urllib.parse.urlparse(url).query)["t"][0]
    if answer:
        items = meta["items"]
        decisions = {i: "approve" for i in items}
        if answer == "skip-first":
            decisions[items[0]] = "skip"
        req = urllib.request.Request(f"{CONFIG['review_site']}/api/content-review/{site_week(wk)}", method="POST",
                                     data=json.dumps({"token": token, "decisions": decisions,
                                                      "note": "Dry run answer (simulated)"}).encode("utf-8"),
                                     headers={"Content-Type": "application/json", "User-Agent": "deke-content-engine/1.0"})
        with urllib.request.urlopen(req, timeout=30) as r:
            res = json.loads(r.read().decode("utf-8"))
        return record(6, "Deke's answer", True, f"Simulated Deke's taps ({answer}) through the real page API.",
                      json.dumps({"decisions": decisions, "saved": res}))
    from common import site_api
    got = site_api("GET", f"/api/content-review?week={site_week(wk)}")
    if got.get("submittedAt"):
        return record(6, "Deke's answer", True, "You answered on the review page.", json.dumps(got))
    return record(6, "Deke's answer", None, "Waiting for you: open the review link, tap Approve or Skip on each post, press Send. "
                  "Then run step 7.", f"Review link: {url}")


def s7():
    """Sunday-morning reminder (forced now)."""
    wk = report()["week"]
    meta_p = os.path.join(BATCHES, wk, "batch.json")
    meta = json.load(open(meta_p, encoding="utf-8"))
    import review
    review._remind(wk, meta)
    return record(7, "Sunday reminder", True, "Sent the reminder Deke would get on Sunday morning, to Denis instead.",
                  f"reminded at {json.load(open(meta_p, encoding='utf-8')).get('reminded')}")


def s8():
    """Sunday-night finalize: apply answers, Postiz dry run, summary email."""
    wk = report()["week"]
    import review
    review.tick(force_finalize=True)
    meta = json.load(open(os.path.join(BATCHES, wk, "batch.json"), encoding="utf-8"))
    ok = meta.get("status") == "dry_finalized"
    ev = json.dumps({"status": meta.get("status"), "deke_answer": meta.get("deke_answer"),
                     "would_schedule": meta.get("would_schedule")}, indent=1, ensure_ascii=False)
    return record(8, "Sunday-night scheduling (dry)", ok,
                  "Read the answers, dropped skipped posts, and ran the Postiz dry run on what is left. Nothing was sent to "
                  "Postiz. The summary email went to Denis.", ev)


def s9():
    """Monday catch-up email."""
    code, out = run([os.path.join(ENGINE, "watchdog.py"), "--email"], timeout=300)
    return record(9, "Monday catch-up email", "emailed:" in out,
                  "Ran the daily health check on the dry workspace and sent Denis the catch-up email.", out[-800:])


def s10():
    """Proof nothing escaped: no new Deke posts, no email to Deke."""
    start = report().get("started")
    baseline = set(report().get("postiz_baseline", []))
    posts = [p for p in deke_posts(7, 60) if p["id"] not in baseline]
    req = urllib.request.Request("https://api.resend.com/emails?limit=50",
                                 headers={"Authorization": f"Bearer {ENV['RESEND_API_KEY']}", "User-Agent": "deke-content-engine/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            sent = json.loads(r.read().decode("utf-8")).get("data", [])
        since = datetime.datetime.fromisoformat(start)
        to_deke = [e for e in sent if CONFIG["deke_email"] in json.dumps(e.get("to"))
                   and datetime.datetime.fromisoformat(e["created_at"].replace(" ", "T").split(".")[0] + "+00:00") >= since]
        mail_ev = f"{len(to_deke)} emails to Deke's address since the dry run started (out of the last {len(sent)} sent)."
    except Exception as e:
        to_deke, mail_ev = None, f"Could not list sent emails: {e}"
    ok = not posts and to_deke == []
    return record(10, "Proof nothing escaped", ok, "Checked Postiz for any new Deke post and Resend for any email to Deke.",
                  f"{len(posts)} new Deke posts in Postiz since the start. {mail_ev}")


STEPS = [s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10]

if __name__ == "__main__":
    a = sys.argv[1:]
    if not a or a[0] == "list":
        for i, f in enumerate(STEPS):
            print(i, f.__doc__)
    elif a[0] == "step":
        n = int(a[1])
        ans = a[a.index("--answer") + 1] if "--answer" in a else None
        res = STEPS[n](ans) if n == 6 else STEPS[n]()
        sys.exit(0 if res else 1)
    elif a[0] == "all":
        ans = a[a.index("--answer") + 1] if "--answer" in a else None
        for i, f in enumerate(STEPS):
            res = f(ans) if i == 6 else f()
            if res is None:
                print("\nPaused at step 6. Answer on the review page, then run: python engine/dryrun.py step 7  (and 8, 9, 10)")
                sys.exit(2)
            if res is False:
                print(f"\nStopped: step {i} failed. Fix it, then run: python engine/dryrun.py step {i}")
                sys.exit(1)
        print("\nDry run complete: every step passed.")
