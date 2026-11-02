"""Render one content-bank clip into a finished 1080x1920 reel.

Recipe (same as the October batch that shipped): ffmpeg vertical base with
loudness normalised to -14 LUFS and a 3.5 s held end frame for the CTA, word
timings from the local Whisper transcript, then the DekeShort Remotion template
(gold word captions, end CTA, progress bar).

Usage:  python engine/render.py <item-id> [--force]
Reads engine/bank.json, writes D:/deke-media/engine/renders/<id>.mp4 + <id>.jpg
and updates the item's status to "rendered" (or "render_failed" with the error).
Fails loudly: any step that goes wrong exits 1 with the reason.
"""
import json, os, subprocess, sys, shutil, re, datetime

ENGINE = os.path.dirname(os.path.abspath(__file__))
BANK = os.path.join(ENGINE, "bank.json")
MEDIA = "D:/deke-media/engine"
REMOTION = os.path.join(os.path.dirname(ENGINE), "my-video")
HOLD = 3.5
ENC = ["-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-r", "30",
       "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart"]
NORM = "loudnorm=I=-14:TP=-1.5:LRA=11"


def die(msg):
    # SystemExit with a string prints it to stderr and exits 1; main() catches it to record the error.
    raise SystemExit(f"RENDER FAILED: {msg}")


def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace", **kw)
    if r.returncode != 0:
        die(f"{' '.join(map(str, cmd[:4]))}... exited {r.returncode}: {(r.stderr or r.stdout)[-1500:]}")
    return r


sys.path.insert(0, ENGINE)
from common import load_bank, save_bank  # one safe writer for the whole engine


def source_path(src):
    if src["type"] == "youtube":
        p = f"{MEDIA}/yt/{src['id']}.mp4"
        if not os.path.exists(p):
            run(["yt-dlp", "-f", "bv*[height<=1080][ext=mp4]+ba[ext=m4a]/b[height<=1080]",
                 "--merge-output-format", "mp4", "-o", f"{MEDIA}/yt/%(id)s.%(ext)s", "--", f"https://youtu.be/{src['id']}"])
        return p
    if src["type"] == "file":
        if not os.path.exists(src["path"]):
            die(f"source file missing: {src['path']}")
        return src["path"]
    die(f"unknown source type {src['type']}")


def framing_filter(framing):
    """Return a filter chain taking [in] video to 1080x1920 30fps."""
    kind = framing.get("kind", "blur169") if isinstance(framing, dict) else framing
    if kind == "native":
        # Source is already vertical (phone selfie): fill 1080x1920, no blur band.
        return "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,setsar=1"
    if kind == "crop":
        # Native 9:16 crop. cropX = left edge in source pixels at 1920x1080 scale.
        x = framing.get("cropX", 656)
        return f"scale=1920:1080,crop=608:1080:{x}:0,scale=1080:1920:flags=lanczos,fps=30,setsar=1"
    if kind == "blur45":
        x = framing.get("cropX", 528)
        fg = f"scale=1920:1080,crop=864:1080:{x}:0,scale=1080:1350:flags=lanczos"
        y = 285
    elif kind == "region":
        # One tile of a split screen (e.g. Deke's half of a Zoom call): crop x,y,w,h in 1920x1080 pixels.
        x, y0, w, h = framing["x"], framing["y"], framing["w"], framing["h"]
        fg = f"scale=1920:1080,crop={w}:{h}:{x}:{y0},scale=1080:-2:flags=lanczos"
        y = max(120, 1250 - round(1080 * h / w))
    elif kind == "blur43":
        # 4:3 centre window, bigger face than blur169, still keeps a moving speaker in frame.
        x = framing.get("cropX", 240) if isinstance(framing, dict) else 240
        fg = f"scale=1920:1080,crop=1440:1080:{x}:0,scale=1080:810:flags=lanczos"
        y = 440  # window ends at 1250, captions start at 1310
    else:  # blur169: whole frame, nothing ever cut off. Safe default for multi-cam and two-person interviews.
        fg = "scale=1080:608:flags=lanczos"
        y = 656
    return (f"split[f][b];[b]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=40:2,"
            f"eq=brightness=-0.15[bb];[f]{fg}[ff];[bb][ff]overlay=0:{y},fps=30,setsar=1")


def snap_end(src, b, lookback=0.05, lookahead=0.3):
    """Whisper word ends run early; cutting there clips the last word. Move the cut to the quietest
    20 ms just after it (where the voice really stops), so every clip ends on a complete word."""
    import numpy as np
    a0 = max(0.0, b - lookback)
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{a0:.3f}", "-t", f"{lookback + lookahead:.3f}", "-i", src,
                          "-ac", "1", "-ar", "16000", "-f", "s16le", "-"], capture_output=True).stdout
    x = np.frombuffer(raw, dtype=np.int16).astype(float)
    hop = 320  # 20 ms
    if len(x) < hop * 3:
        return b
    rms = [np.sqrt(np.mean(x[i:i + hop] ** 2)) for i in range(0, len(x) - hop, hop // 2)]
    k = int(np.argmin(rms))
    return round(a0 + k * (hop // 2) / 16000 + 0.01, 3)


def build_base(item, src, out):
    segs = [[a, snap_end(src, b)] for a, b in item["segments"]]
    item["cut_segments"] = segs  # what was actually cut, for the record and for caption timing
    parts, labels = [], []
    for i, (a, b) in enumerate(segs):
        parts.append(f"[0:v]trim={a}:{b},setpts=PTS-STARTPTS[v{i}];[0:a]atrim={a}:{b},asetpts=PTS-STARTPTS,"
                     f"afade=t=in:d=0.03,afade=t=out:st={max(0, b - a - 0.03):.3f}:d=0.03[a{i}]")
        labels.append(f"[v{i}][a{i}]")
    total = sum(b - a for a, b in segs)
    fc = ";".join(parts) + ";" + "".join(labels) + f"concat=n={len(segs)}:v=1:a=1[cv][ca];" \
        f"[cv]{framing_filter(item.get('framing', 'blur169'))},tpad=stop_mode=clone:stop_duration={HOLD}[v];" \
        f"[ca]{NORM},apad=pad_dur={HOLD}[a]"
    run(["ffmpeg", "-v", "error", "-y", "-i", src, "-filter_complex", fc, "-map", "[v]", "-map", "[a]",
         "-t", f"{total + HOLD:.3f}", *ENC, out])
    return total + HOLD


def words_for(item):
    src = item["source"]
    key = src["id"] if src["type"] == "youtube" else os.path.splitext(os.path.basename(src["path"]))[0]
    wp = f"{MEDIA}/transcripts/{key}.words.json"
    if not os.path.exists(wp):
        run([sys.executable, "-X", "utf8", os.path.join(ENGINE, "transcribe.py"), source_path(src)])
    allw = json.load(open(wp, encoding="utf-8"))["words"]
    out, offset = [], 0.0
    for a, b in item.get("cut_segments", item["segments"]):
        for w in allw:
            if a <= w["start"] < b - 0.05:
                out.append({"start": round(w["start"] - a + offset, 3),
                            "end": round(min(w["end"], b) - a + offset, 3), "word": w["word"]})
        offset += b - a
    if len(out) < 5:
        die(f"only {len(out)} caption words found for {item['id']}; check the segment times")
    return out


def qa(path, expect_dur, max_sec=90):
    probe = run(["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=codec_name,width,height,r_frame_rate",
                 "-of", "json", path]).stdout
    info = json.loads(probe)
    dur = float(info["format"]["duration"])
    v = [s for s in info["streams"] if s.get("width")][0]
    problems = []
    if (v["width"], v["height"]) != (1080, 1920):
        problems.append(f"size {v['width']}x{v['height']}")
    if abs(dur - expect_dur) > 0.5:
        problems.append(f"duration {dur:.1f}s, expected {expect_dur:.1f}s")
    if dur > max_sec:
        problems.append(f"{dur:.0f}s is too long ({max_sec} s max for this item)")
    lufs = run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-af", "ebur128", "-f", "null", "-"]).stderr
    m = re.findall(r"I:\s+(-?[\d.]+) LUFS", lufs)
    il = float(m[-1]) if m else None
    if il is None or il < -18 or il > -11:
        problems.append(f"loudness {il} LUFS (want about -14)")
    return {"duration": round(dur, 2), "lufs": il, "problems": problems}


def main():
    if len(sys.argv) < 2:
        die("usage: render.py <item-id> [--force]")
    item_id, force = sys.argv[1], "--force" in sys.argv
    bank = load_bank()
    item = next((x for x in bank["items"] if x["id"] == item_id), None)
    if not item:
        die(f"no item {item_id} in bank")
    if item.get("lane") != "reel":
        die(f"{item_id} is lane {item.get('lane')}, nothing to render")
    final = f"{MEDIA}/renders/{item_id}.mp4"
    if os.path.exists(final) and not force:
        print("already rendered", final); return
    os.makedirs(f"{MEDIA}/bases", exist_ok=True); os.makedirs(f"{MEDIA}/renders", exist_ok=True)
    try:
        src = source_path(item["source"])
        base = f"{MEDIA}/bases/{item_id}.mp4"
        dur = build_base(item, src, base)
        words = words_for(item)
        pub = os.path.join(REMOTION, "public", "engine")
        os.makedirs(pub, exist_ok=True)
        shutil.copyfile(base, os.path.join(pub, f"{item_id}.mp4"))
        props = {"baseFile": f"engine/{item_id}.mp4", "words": words, "showTitle": False, "durationSec": round(dur, 3)}
        pfile = f"{MEDIA}/work/{item_id}.props.json"
        json.dump(props, open(pfile, "w", encoding="utf-8"))
        run(["npx.cmd" if os.name == "nt" else "npx", "remotion", "render", "src/index.ts", "EngineShort", final,
             f"--props={pfile}", "--concurrency=6", "--log=error"], cwd=REMOTION)
        os.remove(os.path.join(pub, f"{item_id}.mp4"))
        run(["ffmpeg", "-v", "error", "-y", "-ss", str(item.get("coverSec", 1.5)), "-i", final, "-frames:v", "1",
             "-q:v", "3", f"{MEDIA}/renders/{item_id}.jpg"])
        result = qa(final, dur, item.get("maxSec", 90))
        if result["problems"]:
            raise SystemExit("QA: " + "; ".join(result["problems"]))
    except SystemExit as e:
        bank = load_bank()
        it = next(x for x in bank["items"] if x["id"] == item_id)
        it["status"], it["error"] = "render_failed", str(e.code)
        save_bank(bank)
        raise
    bank = load_bank()
    it = next(x for x in bank["items"] if x["id"] == item_id)
    it["cut_segments"] = item.get("cut_segments")
    it.update({"status": "rendered", "media": final, "cover": f"{MEDIA}/renders/{item_id}.jpg", "qa": result,
               "renderedAt": datetime.datetime.now().isoformat(timespec="seconds")})
    it.pop("error", None)
    save_bank(bank)
    print("OK", item_id, result)


if __name__ == "__main__":
    main()
