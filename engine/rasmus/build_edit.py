"""Build the Deke + Rasmus Krigstrom YouTube edit from the Skool call recording.

Same recipe as engine/bill_biffle/build_edit.py (the Bill Biffle edit), with the guest set in edit.json:
3 cold-open clips of the guest (complete thoughts) -> title card -> the Deke + guest conversation -> end card.
Picture is always clean: both side by side on the branded background with name plates, one person alone
when the other's camera is off, a held frame through camera glitches.
Brand: charcoal #161616, gold #D4A853, cream #F2ECDC (same as the Total Vocal cards), Segoe UI, Crimson Pro.

Usage: python build_edit.py [--overlays]   (reads engine/rasmus/edit.json; writes <out>/edit.mp4 + plan.json)
"""
import json, os, subprocess, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

CFG = json.load(open(Path(__file__).with_name("edit.json"), encoding="utf-8"))
SRC, OUT = CFG["src"], CFG["out"]
FPS = 30
BG, GOLD, CREAM, MUTED = (22, 22, 22), (212, 168, 83), (242, 236, 220), (150, 146, 138)
SEG = r"C:/Windows/Fonts/segoeui.ttf"
SEG_SB = r"C:/Windows/Fonts/seguisb.ttf"
SERIF = r"C:/Users/lafla/claude_projects/deke/canvas-fonts/CrimsonPro-Regular.ttf"

DEKE = ("Deke Sharon", "Total Vocal")
GUEST = (CFG["guest_name"], CFG["guest_title"])

LAYOUTS = {"big": {"deke": (32, 191, 928, 522), "guest": (962, 191, 926, 521)}}
TWO = {"w": 920, "h": 518, "y": 220, "x": (30, 970)}       # side by side
SOLO = {"w": 1280, "h": 720, "y": 110, "x": 320}            # one person

COLD = [tuple(c[:2]) for c in CFG["cold"]]                  # (start, end) source seconds
MAIN = [tuple(m) for m in CFG["main"]]                      # (start, end, layout, mode)
TITLE_SEC, END_SEC = 4.0, 6.0


def font(p, s):
    return ImageFont.truetype(p, s)


def fr(t):
    return round(t * FPS) / FPS


def background():
    im = Image.new("RGB", (1920, 1080), BG)
    glow = Image.new("L", (1920, 1080), 0)
    ImageDraw.Draw(glow).ellipse((360, 140, 1560, 940), fill=18)
    glow = glow.filter(ImageFilter.GaussianBlur(220))
    return Image.composite(Image.new("RGB", im.size, (34, 32, 29)), im, glow)


def plate(d, x, y, name, title, max_w):
    d.line((x, y, x + 56, y), fill=GOLD, width=3)
    d.text((x, y + 14), name, font=font(SEG_SB, 38), fill=CREAM)
    f = font(SEG, 24)
    while d.textlength(title, font=f) > max_w and f.size > 16:
        f = font(SEG, f.size - 1)
    d.text((x, y + 66), title, font=f, fill=GOLD)


def centred(d, txt, f, col, y):
    d.text(((1920 - d.textlength(txt, font=f)) / 2, y), txt, font=f, fill=col)


def make_overlays():
    os.makedirs(OUT, exist_ok=True)
    bg = background()
    two = bg.copy(); d = ImageDraw.Draw(two)
    for (name, title), x in ((DEKE, TWO["x"][0]), (GUEST, TWO["x"][1])):
        plate(d, x, TWO["y"] + TWO["h"] + 34, name, title, TWO["w"])
    two.save(f"{OUT}/bg-two.png")
    for who, (name, title) in (("deke", DEKE), ("guest", GUEST)):
        s = bg.copy(); d = ImageDraw.Draw(s)
        plate(d, SOLO["x"], SOLO["y"] + SOLO["h"] + 30, name, title, SOLO["w"])
        s.save(f"{OUT}/bg-{who}.png")
    t = bg.copy(); d = ImageDraw.Draw(t)
    centred(d, GUEST[0], font(SERIF, 120), CREAM, 330)
    centred(d, "in conversation with Deke Sharon", font(SEG, 34), CREAM, 490)
    d.line((900, 572, 1020, 572), fill=GOLD, width=3)
    centred(d, CFG.get("title_card_line", GUEST[1]), font(SEG, 28), GOLD, 600)
    centred(d, "TOTAL VOCAL", font(SEG_SB, 22), MUTED, 920)
    t.save(f"{OUT}/title.png")
    e = bg.copy(); d = ImageDraw.Draw(e)
    for txt, f, col, y in ((f"Thank you, {CFG['guest_first']}.", font(SERIF, 96), CREAM, 330),
                           ("Keep the conversation going in Total Vocal,", font(SEG, 34), CREAM, 500),
                           ("the free a cappella community", font(SEG, 34), CREAM, 548),
                           ("skool.com/deke", font(SEG_SB, 44), GOLD, 640)):
        centred(d, txt, f, col, y)
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
    if mode in ("two", "hold", "holdend"):
        bgimg = f"{OUT}/bg-two.png"
        fc = (f"[0:v]split=2[a][b];[a]{crop_scale(L['deke'], TWO['w'], TWO['h'])}[d];"
              f"[b]{crop_scale(L['guest'], TWO['w'], TWO['h'])}[g];"
              f"[1:v][d]overlay={TWO['x'][0]}:{TWO['y']}[t1];[t1][g]overlay={TWO['x'][1]}:{TWO['y']}")
    else:
        bgimg = f"{OUT}/bg-{mode}.png"
        fc = f"[0:v]{crop_scale(L[mode], SOLO['w'], SOLO['h'])}[s];[1:v][s]overlay={SOLO['x']}:{SOLO['y']}"
    if fade:
        fc += f",fade=t=in:st=0:d=0.3,fade=t=out:st={n / FPS - 0.3:.3f}:d=0.3"
    fc += ",format=yuv420p[v]"
    if mode in ("hold", "holdend"):  # camera glitch: hold the last clean frame (holdend: the next clean one)
        at = fr(start) - 0.1 if mode == "hold" else fr(end) + 0.02
        src = ["-ss", f"{at:.3f}", "-i", SRC, "-loop", "1", "-i", bgimg]
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
        p, n = render_piece(i, s, e, "big", "guest", fade=True); i += 1
        pieces.append(p); audio.append(("src", fr(s), n / FPS, True))
        plan["cold"].append({"src": [s, e], "at": round(t, 3)}); t += n / FPS
    p, n = still_piece(i, f"{OUT}/title.png", TITLE_SEC); i += 1
    pieces.append(p); audio.append(("silence", 0, n / FPS, False)); plan["title"] = round(t, 3); t += n / FPS
    for s, e, lay, mode in MAIN:
        p, n = render_piece(i, s, e, lay, mode); i += 1
        # main pieces that touch in the source play as one continuous audio run; a gap means a cut
        pieces.append(p); audio.append(("src", fr(s), n / FPS, False))
        plan["main"].append({"src": [s, e], "at": round(t, 3), "mode": mode}); t += n / FPS
    p, n = still_piece(i, f"{OUT}/end.png", END_SEC); i += 1
    pieces.append(p); audio.append(("silence", 0, n / FPS, False)); plan["end"] = round(t, 3); t += n / FPS
    with open(f"{OUT}/list.txt", "w") as f:
        for p in pieces:
            f.write(f"file '{p}'\n")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", f"{OUT}/list.txt", "-c", "copy",
                    f"{OUT}/video.mp4"], check=True)
    # Audio in one pass: cold-open clips with short fades, silence under the cards, the conversation in
    # continuous runs (back-to-back source pieces are joined without a seam; a real cut gets a tiny fade).
    inputs, parts, k = [], [], 0
    run = None  # [start, end]

    def flush():
        nonlocal k, run
        if run:
            d = run[1] - run[0]
            inputs.extend(["-ss", f"{run[0]:.3f}", "-t", f"{d:.3f}", "-i", SRC])
            parts.append(f"[{k}:a]aresample=48000,afade=t=in:d=0.02,afade=t=out:st={d - 0.02:.3f}:d=0.02[x{k}]")
            k += 1; run = None

    for kind, s, d, fade in audio:
        if kind == "src" and not fade:
            if run and abs(run[1] - s) < 0.02:
                run[1] = s + d
            else:
                flush(); run = [s, s + d]
            continue
        flush()
        if kind == "src":
            inputs += ["-ss", f"{s:.3f}", "-t", f"{d:.3f}", "-i", SRC]
            parts.append(f"[{k}:a]aresample=48000,afade=t=in:d=0.08,afade=t=out:st={d - 0.25:.3f}:d=0.25[x{k}]")
        else:
            inputs += ["-f", "lavfi", "-t", f"{d:.3f}", "-i", "anullsrc=r=48000:cl=stereo"]
            parts.append(f"[{k}:a]aresample=48000[x{k}]")
        k += 1
    flush()
    fc = ";".join(parts) + ";" + "".join(f"[x{j}]" for j in range(k)) + f"concat=n={k}:v=0:a=1,loudnorm=I=-16:TP=-1.5:LRA=11[a]"
    subprocess.run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", fc, "-map", "[a]", "-c:a", "pcm_s16le",
                    f"{OUT}/audio.wav"], check=True)
    final = f"{OUT}/edit.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", f"{OUT}/video.mp4", "-i", f"{OUT}/audio.wav", "-map", "0:v",
                    "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart",
                    final], check=True)
    plan["total"] = round(t, 3)
    json.dump(plan, open(f"{OUT}/plan.json", "w"), indent=1)
    print("done", final, f"{t / 60:.1f} min")


if __name__ == "__main__":
    if "--overlays" in sys.argv:
        make_overlays(); print("overlays written to", OUT)
    else:
        main()
