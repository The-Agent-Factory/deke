"""YouTube thumbnail in Bill Biffle's layout: guest photo left (760 px), charcoal panel right with serif name,
gold title lines and "with Deke Sharon".

Rasmus: official Ringmasters headshot (ringmasters.se/about, "ras.webp", 800x800 studio portrait), used instead of
a webcam frame from the call (Denis 2026-11-10: the webcam frame looked terrible, wanted a positive, fun image).
Scaled 1.2x with Lanczos only, no AI upscaler, so his face is not altered.

Usage: python make_thumb.py <photo> <out.jpg>
"""
import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance

W, H, PW = 1280, 720, 760
PANEL = (23, 23, 23)
CREAM, GOLD, WHITE = (242, 236, 220), (212, 168, 83), (245, 245, 245)
NAME = ["Rasmus", "Krigström"]
TITLE = ["Ringmasters", "2012 International", "Quartet Champion"]
FONTS = "C:/Windows/Fonts/"


def photo(src, box=None):
    im = Image.open(src).convert("RGB")
    if box:  # crop box (x0, y0, x1, y1) in the source, same 760:720 shape, e.g. from a 4K video frame
        im = im.crop(box).resize((PW, H), Image.LANCZOS)
        im = im.filter(ImageFilter.UnsharpMask(radius=1.0, percent=35, threshold=2))
        return ImageEnhance.Brightness(im).enhance(1.06)
    s = 1.2
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    im = im.filter(ImageFilter.UnsharpMask(radius=1.2, percent=40, threshold=2))
    im = ImageEnhance.Brightness(im).enhance(1.04)
    im = ImageEnhance.Color(im).enhance(1.05)
    # face centre in the 800 px source is about x 395, y 300: keep it a little left of the photo's centre
    cx = round(395 * s)
    x0 = max(0, min(im.width - PW, cx - PW // 2 + 10))
    y0 = round(40 * s)
    crop = im.crop((x0, y0, x0 + PW, y0 + H))
    if crop.height < H:  # pad the bottom with the suit colour if the photo runs out
        pad = Image.new("RGB", (PW, H), crop.getpixel((PW // 2, crop.height - 1)))
        pad.paste(crop, (0, 0))
        crop = pad
    return crop


def main(src, out, box=None):
    canvas = Image.new("RGB", (W, H), PANEL)
    canvas.paste(photo(src, box), (0, 0))
    d = ImageDraw.Draw(canvas)
    serif = ImageFont.truetype(FONTS + "cambriab.ttf", 84)
    sans = ImageFont.truetype(FONTS + "segoeui.ttf", 31)
    sans_b = ImageFont.truetype(FONTS + "seguisb.ttf", 29)
    x, y = 820, 160
    for line in NAME:
        d.text((x, y), line, font=serif, fill=CREAM)
        y += 104
    y += 10
    d.line((x, y, x + 90, y), fill=GOLD, width=4)
    y += 30
    for line in TITLE:
        d.text((x, y), line, font=sans, fill=GOLD)
        y += 45
    y += 22
    d.text((x, y), "with Deke Sharon", font=sans_b, fill=WHITE)
    canvas.save(out, quality=93)
    print("saved", out)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], tuple(int(v) for v in sys.argv[3].split(",")) if len(sys.argv) > 3 else None)
