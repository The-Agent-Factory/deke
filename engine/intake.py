"""Step 1 of the WhatsApp recipe (engine/RECIPE-WHATSAPP.md): take every video Denis dropped in the inbox,
copy it into the engine, check it, transcribe it, and print what the clip-picking step needs.

  python engine/intake.py            processes everything in <media_root>/inbox
  python engine/intake.py <file>     one specific file

For each video it prints: orientation and suggested framing, length, loudness, and the transcript with
timestamps. It writes <media_root>/engine/state-intake/<name>.json for the next step. The original moves to
inbox/done so nothing is processed twice. Fails loudly on anything unusable (no audio, no speech, too short).
"""
import json, os, re, shutil, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import render  # media root, transcript helpers

ROOT = os.path.dirname(render.MEDIA)
INBOX = os.path.join(ROOT, "inbox")
SRC = os.path.join(render.MEDIA, "source")
TR = os.path.join(render.MEDIA, "transcripts")
STATE = os.path.join(render.MEDIA, "state-intake")
VIDEO = (".mp4", ".mov", ".m4v", ".mkv", ".webm")


def probe(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries",
                          "format=duration:stream=codec_type,width,height:stream_side_data=rotation:stream_tags=rotate",
                          "-of", "json", path], capture_output=True, text=True).stdout
    info = json.loads(out)
    v = next((s for s in info["streams"] if s.get("codec_type") == "video"), None)
    a = next((s for s in info["streams"] if s.get("codec_type") == "audio"), None)
    if not v or not a:
        raise SystemExit(f"INTAKE FAILED: {os.path.basename(path)} has no {'video' if not v else 'audio'} track")
    rot = abs(int((v.get("tags") or {}).get("rotate", 0) or next((d.get("rotation", 0) for d in v.get("side_data_list", [])), 0)))
    w, h = (v["height"], v["width"]) if rot in (90, 270) else (v["width"], v["height"])
    return float(info["format"]["duration"]), w, h


def lufs(path):
    err = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-af", "ebur128", "-f", "null", "-"],
                         capture_output=True, text=True, encoding="utf-8", errors="replace").stderr
    m = re.findall(r"I:\s+(-?[\d.]+) LUFS", err)
    return float(m[-1]) if m else None


def intake(path):
    name = re.sub(r"[^A-Za-z0-9._-]+", "-", os.path.basename(path))
    os.makedirs(SRC, exist_ok=True)
    dest = os.path.join(SRC, name)
    if not os.path.exists(dest):
        shutil.copy2(path, dest)
    dur, w, h = probe(dest)
    if dur < 15:
        raise SystemExit(f"INTAKE FAILED: {name} is only {dur:.0f} s; too short to cut a reel from")
    framing = "native" if h > w else "blur43"
    loud = lufs(dest)
    subprocess.run([sys.executable, "-X", "utf8", os.path.join(os.path.dirname(os.path.abspath(__file__)), "transcribe.py"), dest],
                   check=True)
    key = os.path.splitext(name)[0]
    words = json.load(open(os.path.join(TR, f"{key}.words.json"), encoding="utf-8"))["words"]
    if len(words) < 20:
        raise SystemExit(f"INTAKE FAILED: {name} has almost no speech ({len(words)} words)")
    txt = os.path.join(TR, f"{key}.txt")
    if not os.path.exists(txt):  # rebuild the readable transcript from word timings
        with open(txt, "w", encoding="utf-8") as f:
            for i in range(0, len(words), 10):
                chunk = words[i:i + 10]
                f.write("[%d:%02d %.1f-%.1f] %s\n" % (int(chunk[0]["start"] // 60), int(chunk[0]["start"] % 60),
                                                      chunk[0]["start"], chunk[-1]["end"], " ".join(w["word"] for w in chunk)))
    report = {"source": {"type": "file", "path": dest.replace("\\", "/")}, "duration": round(dur, 1),
              "width": w, "height": h, "framing": framing, "lufs": loud, "words": len(words),
              "transcript_txt": os.path.join(TR, f"{key}.txt").replace("\\", "/")}
    os.makedirs(STATE, exist_ok=True)
    json.dump(report, open(os.path.join(STATE, f"{key}.json"), "w", encoding="utf-8"), indent=1)
    if os.path.dirname(os.path.abspath(path)) == os.path.abspath(INBOX):
        os.makedirs(os.path.join(INBOX, "done"), exist_ok=True)
        shutil.move(path, os.path.join(INBOX, "done", os.path.basename(path)))
    print(f"\n=== {name}: {dur:.0f} s, {w}x{h} -> framing '{framing}', {loud} LUFS, {len(words)} words")
    print(open(report["transcript_txt"], encoding="utf-8").read())
    return report


if __name__ == "__main__":
    files = sys.argv[1:] or [os.path.join(INBOX, f) for f in sorted(os.listdir(INBOX)) if f.lower().endswith(VIDEO)]
    if not files:
        raise SystemExit(f"Nothing to do: no videos in {INBOX}")
    for f in files:
        intake(f)
