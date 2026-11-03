"""Contact sheet for a set of reels: the review page Denis checks before anything ships.

  python engine/build_contact_sheet.py <out.html> "<title>" <item-id> [<item-id> ...]

Per reel: opening frame, a mid frame, the closing card, every caption as it appears on screen
(the render's caption sheet), where each cut lands, length, loudness, and a link to watch it.
"""
import base64, datetime, html, os, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import load_bank

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


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3:])
