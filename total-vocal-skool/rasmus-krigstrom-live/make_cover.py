"""Cover for the Skool live: Deke Sharon + Rasmus Krigstrom.

Rasmus: lead of Ringmasters, 2012 Barbershop Harmony Society International Quartet Champions
(singers.com/group/Ringmasters). Photo: Ringmasters official site (ringmasters.se, member photo "ras").
Deke: Total Vocal bio portrait. Palette: Total Vocal charcoal #161616, gold #D4A853, cream #F2ECDC.

Usage: python make_cover.py  -> cover-1920x1080.jpg (YouTube/Skool video), cover-1460x752.jpg (Skool post/event)
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

HERE = Path(__file__).parent
REPO = HERE.parent.parent
FONTS = REPO / "canvas-fonts"
DEKE = REPO / "public/images/total-vocal/deke-bio-portrait.webp"
RASMUS = HERE / "rasmus-ringmasters.webp"
BG, GOLD, CREAM, MUTED, RED = (22, 22, 22), (212, 168, 83), (242, 236, 220), (150, 146, 138), (214, 40, 57)


def F(name, size):
    return ImageFont.truetype(str(FONTS / name), size)


def portrait(path, w, h, focus_y=0.42):
    im = Image.open(path).convert("RGB")
    return ImageOps.fit(im, (w, h), Image.LANCZOS, centering=(0.5, focus_y))


def rounded(im, r):
    m = Image.new("L", im.size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, im.width - 1, im.height - 1), r, fill=255)
    return m


def center_text(d, cx, y, text, font, fill):
    w = d.textlength(text, font=font)
    d.text((cx - w / 2, y), text, font=font, fill=fill)


def build(W, H, out):
    s = W / 1920  # layout designed at 1920 wide; heights scale from H
    sy = H / 1080
    im = Image.new("RGB", (W, H), BG)
    glow = Image.new("L", (W, H), 0)
    ImageDraw.Draw(glow).ellipse((W * .25, H * .1, W * .75, H * .9), fill=40)
    glow = glow.filter(ImageFilter.GaussianBlur(int(200 * s)))
    im = Image.composite(Image.new("RGB", im.size, (48, 41, 30)), im, glow)
    d = ImageDraw.Draw(im)

    pw, ph = int(560 * s), int(700 * sy)
    if ph > pw * 1.3:
        ph = int(pw * 1.3)
    py = int(70 * sy)
    left_x, right_x = int(110 * s), W - int(110 * s) - pw
    for path, x, fy in ((DEKE, left_x, 0.30), (RASMUS, right_x, 0.40)):
        p = portrait(path, pw, ph, fy)
        im.paste(p, (x, py), rounded(p, int(18 * s)))
        d.rounded_rectangle((x - 2, py - 2, x + pw + 1, py + ph + 1), int(20 * s), outline=GOLD, width=max(2, int(3 * s)))

    # names and roles under each portrait
    ny = py + ph + int(26 * sy)
    name_f = F("BigShoulders-Bold.ttf", int(78 * s))
    role_f = F("InstrumentSans-Regular.ttf", int(25 * s))
    for cx, name, roles in ((left_x + pw / 2, "DEKE SHARON", ["The Father of Contemporary A Cappella"]),
                            (right_x + pw / 2, "RASMUS KRIGSTRÖM", ["Lead, Ringmasters", "2012 International Quartet Champions"])):
        center_text(d, cx, ny, name, name_f, CREAM)
        for k, r in enumerate(roles):
            center_text(d, cx, ny + int(84 * s) + k * int(34 * s), r, role_f, GOLD)

    # centre column: plus sign and LIVE ON SKOOL badge
    cx = W / 2
    plus_f = F("BigShoulders-Bold.ttf", int(170 * s))
    center_text(d, cx, py + ph * 0.18, "+", plus_f, GOLD)
    live_f = F("BigShoulders-Bold.ttf", int(64 * s))
    bw, bh = int(250 * s), int(84 * s)
    by = int(py + ph * 0.52)
    d.rounded_rectangle((cx - bw / 2, by, cx + bw / 2, by + bh), int(12 * s), fill=RED)
    dot = int(14 * s)
    tw = d.textlength("LIVE", font=live_f)
    gx = cx - (tw + dot * 2) / 2
    d.ellipse((gx, by + bh / 2 - dot / 2, gx + dot, by + bh / 2 + dot / 2), fill=CREAM)
    d.text((gx + dot * 2, by + int(4 * s)), "LIVE", font=live_f, fill=CREAM)
    on_f = F("BigShoulders-Bold.ttf", int(54 * s))
    center_text(d, cx, by + bh + int(16 * s), "ON SKOOL", on_f, CREAM)
    tv_f = F("InstrumentSans-Bold.ttf", int(20 * s))
    center_text(d, cx, by + bh + int(92 * s), "TOTAL VOCAL", tv_f, MUTED)
    im.save(out, quality=93)
    print("wrote", out)


if __name__ == "__main__":
    build(1920, 1080, HERE / "cover-1920x1080.jpg")
    build(1460, 752, HERE / "cover-1460x752.jpg")
