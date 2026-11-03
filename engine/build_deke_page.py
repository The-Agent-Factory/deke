"""Build the weekly plan page Deke reviews (same style as the Nov 2 page).

  python engine/build_deke_page.py <plan-folder> "<intro sentence>" "<skool paragraph>" "<reply-by text>"
Reads <plan-folder>/manifest.json and the bank; writes <plan-folder>/DEKE-WEEK.html with stills,
watch links (Postiz preview URLs), exact captions per platform, and how to answer.
"""
import base64, datetime, html, json, os, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import TZ, load_bank

NAMES = {"instagram": "Instagram", "facebook": "Facebook", "youtube": "YouTube Shorts", "tiktok": "TikTok",
         "linkedin": "LinkedIn", "threads": "Threads"}
E = html.escape


def local(r):
    return datetime.datetime.fromisoformat(r["scheduledAtISO"].replace("Z", "+00:00")).astimezone(TZ)


def still(it):
    small = os.path.join(os.path.dirname(it["media"]), "..", "work", f"{it['id']}-still.jpg")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", "2", "-i", it["media"], "-frames:v", "1",
                    "-vf", "scale=360:-1", "-q:v", "5", small], check=True)
    return "data:image/jpeg;base64," + base64.b64encode(open(small, "rb").read()).decode()


def main(folder, intro, skool, reply_by):
    bank = {i["id"]: i for i in load_bank()["items"]}
    rows = json.load(open(os.path.join(folder, "manifest.json"), encoding="utf-8"))["items"]
    order = []
    for r in sorted(rows, key=lambda r: r["scheduledAtISO"]):
        if r["engineItem"] not in order:
            order.append(r["engineItem"])
    first = local(min(rows, key=lambda r: r["scheduledAtISO"]))
    monday = first.date() - datetime.timedelta(days=first.weekday())
    sunday = monday + datetime.timedelta(days=6)
    grid = []
    for d in range(7):
        day = monday + datetime.timedelta(days=d)
        todays = [r for r in rows if local(r).date() == day]
        kind = ("Video" if bank[todays[0]["engineItem"]]["lane"] == "reel" else "Text") if todays else "Rest"
        grid.append(f'<div class="{"" if todays else "rest"}"><div class="d">{day:%a} {day.day}</div><div class="w">{kind}</div></div>')
    cards = []
    for n, iid in enumerate(order, 1):
        it = bank[iid]
        mine = sorted([r for r in rows if r["engineItem"] == iid], key=lambda r: r["scheduledAtISO"])
        chips = "".join(f"<li><span>{NAMES[r['platform']]}</span><b>{local(r).strftime('%I:%M %p').lstrip('0')}</b></li>" for r in mine)
        src = it.get("sourceNote", "").replace("Deke's WhatsApp video to Denis, Nov 2026 (four rehearsal tips)",
                                               "Your WhatsApp video with the four rehearsal tips")
        if it["lane"] == "reel":
            title, kind = it["copy"]["ytTitle"], "Video"
            caps = (f'<div class="lbl">Instagram, Facebook, YouTube caption</div><p class="copy">{E(it["copy"]["caption"])}</p>'
                    f'<div class="lbl">TikTok</div><p class="copy">{E(it["copy"]["tiktok"])}</p>')
            media = (f'<figure><img src="{still(it)}" alt="Still from the video">'
                     f'<a class="watch" href="{E(it["previewUrl"])}" target="_blank" rel="noopener">Watch the video</a></figure>')
            dur = f'{it["qa"]["duration"] - 3.5:.0f} seconds, plus the Total Vocal end card'
        else:
            title, kind = it["text"]["facebook"].split("\n")[0], "Text post"
            caps = "".join(f'<div class="lbl">{NAMES[r["platform"]]}</div><p class="copy">{E(r["text"])}</p>' for r in mine)
            media, dur = "", "Text only"
        cards.append(
            f'<article class="post"><header><span class="num">{n}</span><div><div class="day">'
            f'{local(mine[0]).strftime("%A, %b %d").replace(" 0", " ")}</div><div class="kind">{kind}</div></div></header>'
            f'<div class="body{" text" if not media else ""}">{media}<div class="info"><h3>{E(title)}</h3>'
            f'<ul class="chips">{chips}</ul><p class="meta">{E(dur)}. From: {E(src)}</p>{caps}</div></div></article>')

    css = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "deke_page.css"), encoding="utf-8").read()
    page = (f'<title>Deke Week of {monday:%b} {monday.day}</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n'
            '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700'
            '&family=Source+Sans+3:wght@400;600&display=swap">\n'
            f'<style>{css}</style>\n<main class="wrap">'
            '<section><div class="brand">Total Vocal . Your posts next week</div>'
            f'<h1>Your week on social: Monday {monday:%b} {monday.day} to Sunday {sunday:%b} {sunday.day}</h1>'
            f'<p class="lede">{E(intro)}</p></section>'
            '<section class="ask"><h2>What we need from you</h2><ol>'
            '<li>Watch the videos and read the posts. If they look good, just reply "all good".</li>'
            '<li>To change wording, reply with the post number and your words. We use your words exactly.</li>'
            '<li>To drop a post, reply "skip" and its number.</li></ol>'
            f'<p>{E(reply_by)}</p></section>'
            f'<section class="skool"><h2>Inside Total Vocal</h2><p>{E(skool)}</p></section>'
            f'<div class="week" aria-label="The week at a glance">{"".join(grid)}</div>'
            + "".join(cards) +
            f'<footer>Prepared by Denis Laflamme for Deke Sharon. Nothing on this page has been posted yet.</footer></main>')
    out = os.path.join(folder, "DEKE-WEEK.html")
    open(out, "w", encoding="utf-8").write(page)
    print(out, len(page))


if __name__ == "__main__":
    main(*sys.argv[1:5])
