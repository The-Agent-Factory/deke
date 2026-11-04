"""Build the Deke + Bill Biffle YouTube edit from the Skool call recording.

Program: 3 cold-open clips of Bill (complete thoughts) -> title card -> the Deke + Bill conversation
(Mo Field's later segment is not included) -> end card. Picture is always clean: Deke and Bill side by
side, Deke alone while Bill's camera was off, a held frame through a 2 s camera glitch.
Brand: charcoal #161616, gold #D4A853, cream #F2ECDC (same as the Total Vocal cards), Segoe UI.
No music (Sing-Off beds not yet cleared for social).

Usage: python build_edit.py   (paths below; writes <OUT>/bill-biffle-deke-youtube.mp4 + plan.json)
"""
import json, os, subprocess
from PIL import Image, ImageDraw, ImageFont, ImageFilter

SRC = r"C:/Users/lafla/claude_projects/deke/media/bill-biffle/bill-biffle-full.mp4"
OUT = r"C:/Users/lafla/claude_projects/deke/media/bill-biffle/edit"
FPS = 30
BG, GOLD, CREAM, MUTED = (22, 22, 22), (212, 168, 83), (242, 236, 220), (150, 146, 138)
SEG = r"C:/Windows/Fonts/segoeui.ttf"
SEG_SB = r"C:/Windows/Fonts/seguisb.ttf"
SERIF = r"C:/Users/lafla/claude_projects/deke/canvas-fonts/CrimsonPro-Regular.ttf"

DEKE = ("Deke Sharon", "Total Vocal")
BILL = ("Bill Biffle", "Barbershop Harmony Society International President, 2009-2010")

LAYOUTS = {
    "small": {"deke": (960, 124, 632, 356), "bill": (328, 124, 630, 354)},
    "big": {"deke": (32, 191, 928, 522), "bill": (962, 191, 926, 521)},
}
TWO = {"w": 920, "h": 518, "y": 220, "x": (30, 970)}       # side by side
SOLO = {"w": 1280, "h": 720, "y": 110, "x": 320}            # one person

COLD = [  # (start, end) source seconds; each a complete thought by Bill
    (1878.05, 1886.98),   # "the war ... between harmony and rhythm that barbershop has been fighting since day one"
    (1383.15, 1391.60),   # "when I joined the society they were singing songs I didn't know ... songs I don't know again"
    (1062.72, 1072.05),   # pep talk: "just show them how much fun it is to be a New Mexichord ..."
]
MAIN = [  # (start, end, layout, mode)
    (58.50, 282.25, "small", "two"),
    (282.25, 284.50, "small", "hold"),
    (284.50, 707.25, "big", "two"),
    (707.25, 741.25, "big", "deke"),
    (741.25, 2321.15, "big", "two"),
]
TITLE_SEC, END_SEC, GAP = 4.0, 6.0, 0.5


def font(p, s):
    return ImageFont.truetype(p, s)


def fr(t):
    return round(t * FPS) / FPS


def background():
    im = Image.new("RGB", (1920, 1080), BG)
    glow = Image.new("L", (1920, 1080), 0)
    ImageDraw.Draw(glow).ellipse((360, 140, 1560, 940), fill=18)
    glow = glow.filter(ImageFilter.GaussianBlur(220))
    im = Image.composite(Image.new("RGB", im.size, (34, 32, 29)), im, glow)
    return im


def plate(d, x, y, name, title, max_w):
    d.line((x, y, x + 56, y), fill=GOLD, width=3)
    d.text((x, y + 14), name, font=font(SEG_SB, 38), fill=CREAM)
    f = font(SEG, 24)
    while d.textlength(title, font=f) > max_w and f.size > 16:
        f = font(SEG, f.size - 1)
    d.text((x, y + 66), title, font=f, fill=GOLD)


def make_overlays():
    os.makedirs(OUT, exist_ok=True)
    bg = background()
    two = bg.copy(); d = ImageDraw.Draw(two)
    for (name, title), x in ((DEKE, TWO["x"][0]), (BILL, TWO["x"][1])):
        plate(d, x, TWO["y"] + TWO["h"] + 34, name, title, TWO["w"])
    two.save(f"{OUT}/bg-two.png")
    for who, (name, title) in (("deke", DEKE), ("bill", BILL)):
        s = bg.copy(); d = ImageDraw.Draw(s)
        plate(d, SOLO["x"], SOLO["y"] + SOLO["h"] + 30, name, title, SOLO["w"])
        s.save(f"{OUT}/bg-{who}.png")
    t = bg.copy(); d = ImageDraw.Draw(t)
    big = font(SERIF, 120)
    w = d.textlength("Bill Biffle", font=big)
    d.text(((1920 - w) / 2, 330), "Bill Biffle", font=big, fill=CREAM)
    sub = font(SEG, 34); line = "in conversation with Deke Sharon"
    d.text(((1920 - d.textlength(line, font=sub)) / 2, 490), line, font=sub, fill=CREAM)
    d.line((900, 572, 1020, 572), fill=GOLD, width=3)
    cap = font(SEG, 28); line = BILL[1]
    d.text(((1920 - d.textlength(line, font=cap)) / 2, 600), line, font=cap, fill=GOLD)
    tv = font(SEG_SB, 22); line = "TOTAL VOCAL"
    d.text(((1920 - d.textlength(line, font=tv)) / 2, 920), line, font=tv, fill=MUTED)
    t.save(f"{OUT}/title.png")
    e = bg.copy(); d = ImageDraw.Draw(e)
    for txt, f, col, y in (("Thank you, Bill.", font(SERIF, 96), CREAM, 330),
                           ("Keep the conversation going in Total Vocal,", font(SEG, 34), CREAM, 500),
                           ("the free a cappella community", font(SEG, 34), CREAM, 548),
                           ("skool.com/deke", font(SEG_SB, 44), GOLD, 640)):
        d.text(((1920 - d.textlength(txt, font=f)) / 2, y), txt, font=f, fill=col)
    e.save(f"{OUT}/end.png")


def crop_scale(rect, w, h):
    x, y, cw, ch = rect
    x, y, cw, ch = x + 4, y + 4, cw - 8, ch - 8  # keep the call's speaking outline out of the picture
    return f"crop={cw}:{ch}:{x}:{y},scale={w}:{h}:flags=lanczos,setsar=1"


def render_piece(i, start, end, layout, mode, fade=False):
    """Video only, exact frame count, composed on the branded background."""
    n = round((fr(end) - fr(start)) * FPS)
    out = f"{OUT}/p{i:02d}.mp4"
    L = LAYOUTS[layout]
    if mode in ("two", "hold"):
        bgimg = f"{OUT}/bg-two.png"
        fc = (f"[0:v]split=2[a][b];[a]{crop_scale(L['deke'], TWO['w'], TWO['h'])}[d];"
              f"[b]{crop_scale(L['bill'], TWO['w'], TWO['h'])}[g];"
              f"[1:v][d]overlay={TWO['x'][0]}:{TWO['y']}[t1];[t1][g]overlay={TWO['x'][1]}:{TWO['y']}")
    else:
        bgimg = f"{OUT}/bg-{mode}.png"
        fc = f"[0:v]{crop_scale(L[mode], SOLO['w'], SOLO['h'])}[s];[1:v][s]overlay={SOLO['x']}:{SOLO['y']}"
    if fade:
        fc += f",fade=t=in:st=0:d=0.3,fade=t=out:st={n / FPS - 0.3:.3f}:d=0.3"
    fc += ",format=yuv420p[v]"
    if mode == "hold":  # 2 s camera glitch: hold the last clean frame
        src = ["-ss", f"{fr(start) - 0.1:.3f}", "-i", SRC, "-loop", "1", "-i", bgimg]
        fc = fc.replace("[0:v]split=2", "[0:v]trim=end_frame=1,loop=loop=-1:size=1,setpts=N/30/TB,split=2")
    else:
        src = ["-ss", f"{fr(start):.3f}", "-i", SRC, "-loop", "1", "-i", bgimg]
    cmd = ["ffmpeg", "-v", "error", "-y", *src, "-filter_complex", fc, "-map", "[v]", "-frames:v", str(n), "-r", str(FPS),
           "-c:v", "h264_nvenc", "-preset", "p6", "-rc", "vbr", "-cq", "19", "-b:v", "8M", "-maxrate", "14M", "-an", out]
    subprocess.run(cmd, check=True)
    return out, n


def still_piece(i, img, sec):
    n = round(sec * FPS)
    out = f"{OUT}/p{i:02d}.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-loop", "1", "-i", img, "-vf",
                    f"fade=t=in:st=0:d=0.6,fade=t=out:st={sec - 0.6:.3f}:d=0.6,format=yuv420p", "-frames:v", str(n),
                    "-r", str(FPS), "-c:v", "h264_nvenc", "-preset", "p6", "-cq", "19", out], check=True)
    return out, n


def main():
    make_overlays()
    pieces, audio, t = [], [], 0.0
    plan = {"cold": [], "main": [], "title": None, "end": None}
    i = 0
    for s, e in COLD:
        p, n = render_piece(i, s, e, "big", "bill", fade=True); i += 1
        pieces.append(p); audio.append(("src", fr(s), n / FPS, True))
        plan["cold"].append({"src": [s, e], "at": round(t, 3)}); t += n / FPS
    p, n = still_piece(i, f"{OUT}/title.png", TITLE_SEC); i += 1
    pieces.append(p); audio.append(("silence", 0, n / FPS, False)); plan["title"] = round(t, 3); t += n / FPS
    for s, e, lay, mode in MAIN:
        p, n = render_piece(i, s, e, lay, mode); i += 1
        pieces.append(p); audio.append(("src", fr(s), n / FPS, False))
        plan["main"].append({"src": [s, e], "at": round(t, 3), "mode": mode}); t += n / FPS
    p, n = still_piece(i, f"{OUT}/end.png", END_SEC); i += 1
    pieces.append(p); audio.append(("silence", 0, n / FPS, False)); plan["end"] = round(t, 3); t += n / FPS
    with open(f"{OUT}/list.txt", "w") as f:
        for p in pieces:
            f.write(f"file '{p}'\n")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", f"{OUT}/list.txt", "-c", "copy",
                    f"{OUT}/video.mp4"], check=True)
    # Audio in one pass: cold-open clips with short fades, silence under the cards, the conversation
    # in continuous runs (the main pieces are back to back in the source, so no seams), normalised.
    inputs, parts = [], []
    k = 0
    main_start = None
    for kind, s, d, fade in audio:
        if kind == "src" and not fade:
            if main_start is None:
                main_start = s
            main_dur = s + d - main_start
            continue
        if main_start is not None:
            inputs += ["-ss", f"{main_start:.3f}", "-t", f"{main_dur:.3f}", "-i", SRC]
            parts.append(f"[{k}:a]aresample=48000[x{k}]"); k += 1; main_start = None
        if kind == "src":
            inputs += ["-ss", f"{s:.3f}", "-t", f"{d:.3f}", "-i", SRC]
            parts.append(f"[{k}:a]aresample=48000,afade=t=in:d=0.08,afade=t=out:st={d - 0.25:.3f}:d=0.25[x{k}]")
        else:
            inputs += ["-f", "lavfi", "-t", f"{d:.3f}", "-i", "anullsrc=r=48000:cl=stereo"]
            parts.append(f"[{k}:a]aresample=48000[x{k}]")
        k += 1
    if main_start is not None:
        inputs += ["-ss", f"{main_start:.3f}", "-t", f"{main_dur:.3f}", "-i", SRC]
        parts.append(f"[{k}:a]aresample=48000[x{k}]"); k += 1
    fc = ";".join(parts) + ";" + "".join(f"[x{j}]" for j in range(k)) + f"concat=n={k}:v=0:a=1,loudnorm=I=-16:TP=-1.5:LRA=11[a]"
    subprocess.run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", fc, "-map", "[a]", "-c:a", "pcm_s16le",
                    f"{OUT}/audio.wav"], check=True)
    final = f"{OUT}/bill-biffle-deke-youtube.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", f"{OUT}/video.mp4", "-i", f"{OUT}/audio.wav", "-map", "0:v",
                    "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart",
                    final], check=True)
    plan["total"] = round(t, 3)
    json.dump(plan, open(f"{OUT}/plan.json", "w"), indent=1)
    print("done", final, f"{t / 60:.1f} min")


if __name__ == "__main__":
    import sys
    if "--overlays" in sys.argv:
        make_overlays(); print("overlays written to", OUT)
    else:
        main()
