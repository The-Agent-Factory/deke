"""Contact sheet for a set of reels: the review page Denis checks before anything ships.

  python engine/build_contact_sheet.py <out.html> "<title>" <item-id> [<item-id> ...]
  python engine/build_contact_sheet.py --week <plan-folder> "<title>"
      Whole week from <plan-folder>/manifest.json: day-by-day grid, then every post in order
      (reels with frames and captions, text posts with the exact words per platform).

Per reel: opening frame, a mid frame, the closing card, every caption as it appears on screen
(the render's caption sheet), where each cut lands, length, loudness, and a link to watch it.
"""
import base64, datetime, html, json, os, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import load_bank, TZ

E = html.escape


def b64(path):
    return "data:image/jpeg;base64," + base64.b64encode(open(path, "rb").read()).decode()


def frame(video, t, out):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.2f}", "-i", video, "-frames:v", "1",
                    "-vf", "scale=300:-1", "-q:v", "4", out], check=True)
    return b64(out)


def main(out, title, ids):
    bank = {i["id"]: i for i in load_bank()["items"]}
    work = os.path.join(os.path.dirname(bank[ids[0]]["media"]), "..", "work")
    cards = []
    for iid in ids:
        it = bank[iid]
        q = it.get("qa", {})
        dur = q.get("duration", 0)
        speech = dur - 3.5
        stills = [("Opening", 1.2), ("Middle", speech / 2), ("Closing card", dur - 0.6)]
        imgs = "".join(f'<figure><img src="{frame(it["media"], t, os.path.join(work, f"cs_{iid}_{n}.jpg"))}" '
                       f'alt="{E(lbl)} frame"><figcaption>{E(lbl)}</figcaption></figure>' for n, (lbl, t) in enumerate(stills))
        cuts = ", ".join(f"{a:.2f} to {b:.2f} s" for a, b in it.get("cut_segments", it["segments"]))
        pol = it.get("polish") or {}
        extras = []
        if pol.get("kicker"):
            extras.append(f'label "{pol["kicker"]}"')
        extras.append("a cappella bed + Total Vocal closing card" if pol is not False else "plain")
        sheet = q.get("caption_sheet")
        cards.append(f'''<section class="reel">
<header><h2>{E(it["copy"]["ytTitle"])}</h2>
<a class="watch" href="{E(it.get("previewUrl", ""))}" target="_blank" rel="noopener">Watch</a></header>
<dl>
<div><dt>Length</dt><dd>{dur:.1f} s ({speech:.1f} s of Deke, then the closing card)</dd></div>
<div><dt>Loudness</dt><dd>{q.get("lufs")} LUFS</dd></div>
<div><dt>Cuts in source</dt><dd>{E(cuts)}</dd></div>
<div><dt>Polish</dt><dd>{E(", ".join(extras))}</dd></div>
<div><dt>Checks</dt><dd>{"passed: size, length, loudness, every cut in silence, no broken caption words" if not q.get("problems") else E("; ".join(q["problems"]))}</dd></div>
</dl>
<div class="stills">{imgs}</div>
<h3>Every caption, in order ({q.get("caption_chunks", "?")})</h3>
{f'<img class="sheet" src="{b64(sheet)}" alt="All captions for {E(iid)}">' if sheet and os.path.exists(sheet) else "<p>No caption sheet.</p>"}
</section>''')
    css = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "contact_sheet.css"), encoding="utf-8").read()
    page = (f"<title>{E(title)}</title>\n<meta name=\"claude:viewport-fit-sides\" content=\"cover\">\n<style>{css}</style>\n"
            f'<main class="wrap"><p class="eyebrow">Deke reels . contact sheet . {datetime.date.today():%b %d, %Y}</p>'
            f"<h1>{E(title)}</h1><p class=\"lede\">Read every caption below, look at the first and last frames, then watch "
            "each reel once. Anything wrong: name the reel and what you saw.</p>" + "".join(cards) + "</main>")
    open(out, "w", encoding="utf-8").write(page)
    print(out, len(page))


NAMES = {"instagram": "Instagram", "facebook": "Facebook", "youtube": "YouTube Shorts", "tiktok": "TikTok",
         "linkedin": "LinkedIn", "threads": "Threads"}


def local(r):
    return datetime.datetime.fromisoformat(r["scheduledAtISO"].replace("Z", "+00:00")).astimezone(TZ)


def reel_card(it, work):
    q = it.get("qa", {})
    dur = q.get("duration", 0)
    speech = dur - 3.5
    stills = [("Opening", 1.2), ("Middle", speech / 2), ("Closing card", dur - 0.6)]
    imgs = "".join(f'<figure><img src="{frame(it["media"], t, os.path.join(work, f"cs_{it["id"]}_{n}.jpg"))}" '
                   f'alt="{E(lbl)} frame"><figcaption>{E(lbl)}</figcaption></figure>' for n, (lbl, t) in enumerate(stills))
    cuts = ", ".join(f"{a:.2f} to {b:.2f} s" for a, b in it.get("cut_segments", it["segments"]))
    sheet = q.get("caption_sheet")
    return (f'<dl><div><dt>Length</dt><dd>{dur:.1f} s ({speech:.1f} s of Deke, then the closing card)</dd></div>'
            f'<div><dt>Loudness</dt><dd>{q.get("lufs")} LUFS</dd></div>'
            f'<div><dt>Cuts in source</dt><dd>{E(cuts)}</dd></div>'
            f'<div><dt>Checks</dt><dd>{"passed: size, length, loudness, every cut in silence, no broken caption words" if not q.get("problems") else E("; ".join(q["problems"]))}</dd></div></dl>'
            f'<div class="stills">{imgs}</div><h3>Every caption, in order ({q.get("caption_chunks", "?")})</h3>'
            + (f'<img class="sheet" src="{b64(sheet)}" alt="All captions">' if sheet and os.path.exists(sheet) else "<p>No caption sheet.</p>"))


def week(folder, title):
    bank = {i["id"]: i for i in load_bank()["items"]}
    rows = sorted(json.load(open(os.path.join(folder, "manifest.json"), encoding="utf-8"))["items"],
                  key=lambda r: r["scheduledAtISO"])
    order = []
    for r in rows:
        if r["engineItem"] not in order:
            order.append(r["engineItem"])
    reels = [bank[i] for i in order if bank[i]["lane"] == "reel"]
    work = os.path.join(os.path.dirname(reels[0]["media"]), "..", "work") if reels else "."
    first = local(rows[0])
    monday = first.date() - datetime.timedelta(days=first.weekday())
    grid = []
    for d in range(7):
        day = monday + datetime.timedelta(days=d)
        todays = [r for r in rows if local(r).date() == day]
        cell = "".join(f'<li><b>{local(r).strftime("%I:%M %p").lstrip("0")}</b> {NAMES[r["platform"]]}</li>' for r in todays)
        kind = ""
        if todays:
            kind = "Video" if bank[todays[0]["engineItem"]]["lane"] == "reel" else "Text"
        grid.append(f'<div class="day{"" if todays else " rest"}"><div class="dn">{day:%a %b} {day.day}</div>'
                    f'<div class="dk">{kind or "Rest"}</div><ul>{cell}</ul></div>')
    cards = []
    for n, iid in enumerate(order, 1):
        it = bank[iid]
        mine = [r for r in rows if r["engineItem"] == iid]
        when = f'{local(mine[0]):%A %b} {local(mine[0]).day}'
        chips = " . ".join(f'{NAMES[r["platform"]]} {local(r).strftime("%I:%M %p").lstrip("0")}' for r in mine)
        if it["lane"] == "reel":
            head = it["copy"]["ytTitle"]
            words = (f'<h3>Caption</h3><p class="copy">{E(mine[0]["text"] if mine[0]["platform"] != "tiktok" else it["copy"]["caption"])}</p>'
                     f'<h3>TikTok</h3><p class="copy">{E(it["copy"]["tiktok"])}</p>')
            # Deke's view: watch the video and read the words. Frame-by-frame QA stays in the internal reel sheet.
            still = frame(it["media"], 1.2, os.path.join(work, f"cs_{it['id']}_open.jpg"))
            body = (f'<a class="poster" href="{E(it.get("previewUrl", ""))}" target="_blank" rel="noopener">'
                    f'<img src="{still}" alt="Play the video"><span>Watch the video</span></a>' + words)
            watch = ""
        else:
            head = it["text"]["facebook"].splitlines()[0]
            body = "".join(f'<h3>{NAMES[r["platform"]]}</h3><p class="copy">{E(r["text"])}</p>' for r in mine)
            watch = ""
        cards.append(f'<section class="reel"><header><div><p class="when">{n}. {E(when)} . {"Video" if it["lane"] == "reel" else "Text post"}</p>'
                     f'<h2>{E(head)}</h2><p class="chips">{E(chips)}</p></div>{watch}</header>{body}'
                     f'<p class="src">From: {E(it.get("sourceNote", ""))}</p></section>')
    css = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "contact_sheet.css"), encoding="utf-8").read()
    out = os.path.join(folder, "CONTACT-SHEET.html")
    nl = chr(10)
    page = (f"<title>{E(title)}</title>{nl}<meta name=\"claude:viewport-fit-sides\" content=\"cover\">{nl}<style>{css}</style>{nl}"
            f'<main class="wrap"><p class="eyebrow">Deke . contact sheet . week of {monday:%b} {monday.day}</p>'
            f"<h1>{E(title)}</h1><p class=\"lede\">{len(rows)} posts from {len(order)} pieces. Read every caption and post, "
            "Watch each video and read each post. If something should change, name the post number and what to change.</p>"
            f'<div class="grid">{"".join(grid)}</div>' + "".join(cards) + "</main>")
    open(out, "w", encoding="utf-8").write(page)
    print(out, len(page))


if __name__ == "__main__":
    if sys.argv[1] == "--week":
        week(sys.argv[2], sys.argv[3])
    else:
        main(sys.argv[1], sys.argv[2], sys.argv[3:])
