"""Weekly run of the Deke content engine. Task Scheduler runs it Sunday morning; safe to run any time.

Steps (each one logged; a failure is reported, never hidden):
 1. Preflight: media drive, Postiz key, node, yt-dlp, claude CLI.
 2. Refresh the source list from Deke's YouTube channel (new uploads are mined first).
 3. Refill: while the bank holds under TARGET_WEEKS of reels, transcribe the next unmined
    video and run a headless Claude mining job on it (engine/MINE-PROMPT.md). Max 2 per run.
 4. Render every reel still at status "idea".
 5. Plan the next two weeks that are not planned yet (batch.py plan; schedules them
    itself only when config approval_mode is "standing").
 6. Write engine/state/last-weekly.json and run the watchdog (which emails Denis if red).
"""
import json, os, sys, subprocess, shutil, datetime, traceback
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import CONFIG, TZ, LIVE, DRY, SOURCES_PATH, ENGINE, REPO, STATE, BATCHES, ENV, now, load_bank, deke_posts, write_state

CHANNEL = "https://www.youtube.com/channel/UCTuZ5LxQIjLK-CJBy0onT_Q/videos"
MEDIA = (os.environ.get("DEKE_MEDIA") or json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.json"), encoding="utf-8")).get("media_root", "C:/deke-media")) + "/engine"
TARGET_WEEKS = 6
LOG = os.path.join(STATE, "weekly.log")
PY = [sys.executable, "-X", "utf8"]


def log(msg):
    line = f"[{now():%Y-%m-%d %H:%M}] {msg}"
    print(line, flush=True)
    open(LOG, "a", encoding="utf-8").write(line + "\n")


def sh(cmd, timeout=3600, **kw):
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=timeout, **kw)
    return r.returncode, (r.stdout or "") + (r.stderr or "")


def preflight():
    problems = []
    if not os.path.isdir(os.path.dirname(MEDIA)):
        problems.append(f"media folder {os.path.dirname(MEDIA)} is missing")
    if not ENV.get("POSTIZ_API_KEY"):
        problems.append("POSTIZ_API_KEY missing")
    for tool in ("node", "yt-dlp", "ffmpeg", "claude"):
        if not shutil.which(tool):
            problems.append(f"{tool} not on PATH")
    if problems:
        raise RuntimeError("Preflight failed: " + "; ".join(problems))
    os.makedirs(f"{MEDIA}/yt", exist_ok=True)
    os.makedirs(f"{MEDIA}/transcripts", exist_ok=True)


def refresh_sources():
    p = SOURCES_PATH
    src = json.load(open(p, encoding="utf-8")) if os.path.exists(p) else {"videos": []}
    known = {v["id"] for v in src["videos"]}
    code, out = sh(["yt-dlp", "--flat-playlist", "--playlist-end", "60", "--print",
                    "%(id)s|%(view_count)s|%(duration)s|%(title)s", "--", CHANNEL], timeout=300)
    if code != 0:
        raise RuntimeError(f"could not list Deke's channel: {out[-400:]}")
    added = 0
    for idx, line in enumerate(l for l in out.splitlines() if l.count("|") >= 3):
        vid, views, dur, title = line.split("|", 3)
        if vid in known:
            continue
        dur = float(dur) if dur not in ("NA", "None", "") else 0
        status = "skip" if dur < 120 else "new"  # shorts and promos are not mining material
        src["videos"].append({"id": vid, "title": title, "views": int(views) if views.isdigit() else 0,
                              "duration": dur, "channel_rank": idx, "status": status,
                              "found": now().date().isoformat()})
        added += 1
    # A video that already has clips in the bank counts as mined, even if it was mined by hand.
    in_bank = {(i.get("source") or {}).get("id") for i in load_bank()["items"]}
    for v in src["videos"]:
        if v["status"] == "new" and v["id"] in in_bank:
            v["status"] = "mined"
            v["mined"] = "already in bank"
    json.dump(src, open(p, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    log(f"sources: {added} new, {sum(1 for v in src['videos'] if v['status'] == 'new')} unmined")
    return src


def bank_weeks():
    items = [i for i in load_bank()["items"] if not i.get("needs_deke") and not i.get("week")]
    reels = sum(1 for i in items if i["lane"] == "reel" and i["status"] in ("idea", "rendered"))
    text = sum(1 for i in items if i["lane"] == "text" and i["status"] == "ready")
    return min(reels / 3, text / 2), reels, text


def recent_topics():
    lines = []
    try:
        for p in deke_posts(days_back=60, days_ahead=30):
            lines.append((p.get("content") or "").replace("<p>", " ").replace("</p>", " ")[:140])
    except Exception as e:
        lines.append(f"(could not read Postiz: {e})")
    for i in load_bank()["items"]:
        lines.append((i.get("copy") or {}).get("ytTitle") or (i.get("text") or {}).get("threads", "")[:140])
    open(os.path.join(STATE, "recent-topics.txt"), "w", encoding="utf-8").write("\n".join(sorted(set(lines))))


def mine_one(src):
    pool = [v for v in src["videos"] if v["status"] == "new"]
    if not pool:
        log("refill: no unmined videos left on the channel")
        return False
    # Newest uploads first (channel_rank 0 = newest), then the biggest back-catalogue hits.
    v = sorted(pool, key=lambda v: (0, v["channel_rank"]) if v["channel_rank"] < 8 else (1, -v["views"]))[0]
    vid = v["id"]
    log(f"refill: mining {vid} '{v['title']}'")
    path = f"{MEDIA}/yt/{vid}.mp4"
    if not os.path.exists(path):
        code, out = sh(["yt-dlp", "-f", "bv*[height<=1080][ext=mp4]+ba[ext=m4a]/b[height<=1080]",
                        "--merge-output-format", "mp4", "-o", f"{MEDIA}/yt/%(id)s.%(ext)s", "--", f"https://youtu.be/{vid}"])
        if code != 0:
            raise RuntimeError(f"download {vid} failed: {out[-400:]}")
    code, out = sh(PY + [os.path.join(ENGINE, "transcribe.py"), path], timeout=5400)
    if code != 0:
        raise RuntimeError(f"transcribe {vid} failed: {out[-400:]}")
    write_state("mine-job.json", {"id": vid, "title": v["title"], "url": f"https://youtu.be/{vid}"})
    recent_topics()
    before = len(load_bank()["items"])
    prompt = open(os.path.join(ENGINE, "MINE-PROMPT.md"), encoding="utf-8").read()
    code, out = sh(["claude", "-p", prompt, "--dangerously-skip-permissions", "--max-turns", "60"],
                   timeout=3600, cwd=REPO)
    open(os.path.join(STATE, f"mine-{vid}.log"), "w", encoding="utf-8").write(out)
    gained = len(load_bank()["items"]) - before
    v["status"] = "mined" if code == 0 else "mine_failed"
    v["mined"] = now().isoformat(timespec="minutes")
    v["items_added"] = gained
    json.dump(src, open(SOURCES_PATH, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    if code != 0:
        raise RuntimeError(f"mining {vid} exited {code}: {out[-600:]}")
    log(f"refill: {vid} added {gained} items")
    return True


def next_mondays(n=2):
    t = now().date()
    first = t + datetime.timedelta(days=(7 - t.weekday()) % 7 or 7)
    return [(first + datetime.timedelta(weeks=k)).isoformat() for k in range(n)]


def main():
    started = now()
    report = {"started": started.isoformat(timespec="minutes"), "steps": {}, "ok": True}
    if not LIVE and not DRY:
        log("engine not live (config live=false): weekly build paused, health check only")
        report.update(paused=True, finished=now().isoformat(timespec="minutes"))
        write_state("last-weekly.json", report)
        sh(PY + [os.path.join(ENGINE, "watchdog.py")], timeout=300)
        return
    try:
        preflight(); report["steps"]["preflight"] = "ok"
        src = refresh_sources(); report["steps"]["sources"] = "ok"
        for _ in range(2):
            weeks, reels, text = bank_weeks()
            log(f"bank: {weeks:.1f} weeks ({reels} reels, {text} text)")
            if weeks >= TARGET_WEEKS or not mine_one(src):
                break
        report["steps"]["refill"] = f"{bank_weeks()[0]:.1f} weeks in bank"
        code, out = sh(PY + [os.path.join(ENGINE, "render_queue.py")], timeout=7200)
        log("render: " + out.strip().splitlines()[-1] if out.strip() else "render: nothing")
        report["steps"]["render"] = "ok" if code == 0 else "some renders failed: " + out[-300:]
        if code != 0:
            report["ok"] = False
        weeks = next_mondays(2)
        if CONFIG["approval_mode"] == "deke":
            # One week at a time: the first unplanned Monday at least 36 hours away goes to Deke for review.
            soon = now() + datetime.timedelta(hours=36)
            weeks = [w for w in weeks if datetime.datetime.combine(datetime.date.fromisoformat(w), datetime.time(0), TZ) > soon
                     and not os.path.exists(os.path.join(BATCHES, w, "batch.json"))][:1]
        for wk in weeks:
            if os.path.exists(os.path.join(BATCHES, wk, "batch.json")):
                continue
            code, out = sh(PY + [os.path.join(ENGINE, "batch.py"), "plan", wk, "--auto"], timeout=1800)
            log(f"plan {wk}: " + out.strip()[-300:])
            report["steps"][f"plan {wk}"] = "ok" if code == 0 else out.strip()[-400:]
            if code != 0:
                report["ok"] = False
    except Exception as e:
        report["ok"] = False
        report["error"] = f"{e}\n{traceback.format_exc()[-800:]}"
        log(f"WEEKLY FAILED: {e}")
    report["finished"] = now().isoformat(timespec="minutes")
    write_state("last-weekly.json", report)
    sh(PY + [os.path.join(ENGINE, "watchdog.py"), "--email"], timeout=300)
    log("weekly done, ok=" + str(report["ok"]))
    sys.exit(0 if report["ok"] else 1)


if __name__ == "__main__":
    main()
