"""Clean roomy interview audio for reels cut from a long video (Denis, 2026-11-15).

The approved recipe (memory: project-audio-recipe, variant "F"):
  ElevenLabs Audio Isolation via Fal -> warmth EQ "F" -> loudnorm back to the window's own level.
No compressor stack, no spectral subtraction, no DeepFilterNet: Denis rejected all three.

Only the windows the reels use are isolated (cents, not dollars). Each window is spliced into a
copy of the source (video stream copied untouched), so the original file never changes:
  <source dir>/../audio-clean/<source name>-clean.mp4
The bank items then point at the copy (old path kept in source_before_audio_clean).

  python engine/clean_audio.py <item-id> [<item-id> ...]      (then render each with --force)
Needs FAL_KEY in the environment. Fails loudly: any API or ffmpeg error stops the run.
"""
import json, os, subprocess, sys, tempfile, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import load_bank, save_bank

PAD = 3.0  # seconds of cleaned audio either side of a reel's segments
WARM_F = ("equalizer=f=150:t=q:w=0.9:g=4.0,equalizer=f=300:t=q:w=0.9:g=3.5,equalizer=f=1100:t=q:w=1.0:g=2.5,"
          "equalizer=f=3000:t=q:w=1.2:g=-3.5,equalizer=f=6000:t=h:g=-7.0,equalizer=f=11000:t=h:g=-8.0")


def die(msg):
    print("CLEAN FAILED:", msg, file=sys.stderr)
    sys.exit(1)


def ff(*args):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *args], capture_output=True, text=True)
    if r.returncode:
        die("ffmpeg " + " ".join(args[:6]) + " ... -> " + r.stderr[-400:])


def http(url, data=None, headers=None, method=None, timeout=600):
    req = urllib.request.Request(url, data=data, headers=headers or {}, method=method)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def isolate(mp3, key):
    auth = {"Authorization": f"Key {key}"}
    init = json.loads(http("https://rest.alpha.fal.ai/storage/upload/initiate?storage_type=fal-cdn-v3",
                           json.dumps({"content_type": "audio/mpeg", "file_name": os.path.basename(mp3)}).encode(),
                           {**auth, "Content-Type": "application/json"}, "POST"))
    http(init["upload_url"], open(mp3, "rb").read(), {"Content-Type": "audio/mpeg"}, "PUT")
    out = json.loads(http("https://fal.run/fal-ai/elevenlabs/audio-isolation",
                          json.dumps({"audio_url": init["file_url"]}).encode(),
                          {**auth, "Content-Type": "application/json"}, "POST"))
    url = (out.get("audio") or {}).get("url")
    if not url:
        die(f"isolation returned no audio: {str(out)[:300]}")
    return http(url)


def window_lufs(src, a, b):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-ss", str(a), "-to", str(b), "-i", src, "-vn",
                        "-af", "loudnorm=print_format=json", "-f", "null", "-"], capture_output=True, text=True)
    t = r.stderr
    return float(json.loads(t[t.rfind("{"):t.rfind("}") + 1])["input_i"])


def pcm16k(path, a=None, b=None):
    import numpy as np
    cut = (["-ss", str(a), "-to", str(b)] if a is not None else [])
    raw = subprocess.run(["ffmpeg", "-v", "error", *cut, "-i", path, "-vn", "-ac", "1", "-ar", "16000", "-f", "s16le", "-"],
                         capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.int16).astype(float)


def lag_seconds(src, a, b, iso):
    """How late the isolated audio runs against the source window. Each MP3 encode adds a little silence at the
    start, and the round trip through the isolation service measured about 60 ms late on 2026-11-15, enough to
    break lip sync. Isolation rebuilds the waveform (raw correlation ~0.06), so this cross-correlates the
    loudness envelopes instead (10 ms window, 1 ms steps) over +-250 ms."""
    import numpy as np

    def env(sig):
        e = np.sqrt(np.convolve(sig ** 2, np.ones(160) / 160, mode="same"))[::16]  # 1 ms steps
        e = np.log10(e + 1.0)
        return e - e.mean()

    x, y = env(pcm16k(src, a, b)), env(pcm16k(iso))
    n = min(len(x), len(y))
    x, y = x[:n], y[:n]
    size = 1 << (2 * n - 1).bit_length()
    c = np.fft.irfft(np.fft.rfft(y, size) * np.conj(np.fft.rfft(x, size)), size)
    m = 250
    lags = np.concatenate([c[:m + 1], c[-m:]])
    k = int(np.argmax(lags))
    lag = k if k <= m else k - len(lags)
    peak = lags[k] / (np.sqrt((x ** 2).sum() * (y ** 2).sum()) + 1e-9)
    if peak < 0.5:
        die(f"could not align the isolated audio for {a:.1f}-{b:.1f} s (envelope correlation {peak:.2f})")
    return lag / 1000


def merge(windows):
    out = []
    for a, b in sorted(windows):
        if out and a <= out[-1][1]:
            out[-1][1] = max(out[-1][1], b)
        else:
            out.append([a, b])
    return out


def clean_range(src, a, b, tmp, n, key):
    """Isolate src[a:b], warm it, put it back at the window's own level, and line it up with the source to
    within 5 ms. Returns a 48 kHz stereo WAV exactly b - a long."""
    raw, iso, clean = (os.path.join(tmp, f"w{n}.{e}") for e in ("mp3", "iso.mp3", "wav"))
    ff("-ss", str(a), "-to", str(b), "-i", src, "-vn", "-ac", "1", "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "320k", raw)
    open(iso, "wb").write(isolate(raw, key))
    level = window_lufs(src, a, b)
    lag = lag_seconds(src, a, b, iso)
    if lag < -0.02:
        die(f"isolated audio runs early ({lag * 1000:.0f} ms) for {a:.1f}-{b:.1f} s; not expected, check by hand")
    # late: drop the late start; a few ms early (seen once, -5 ms): delay it. Then pad the tail and hold the
    # window to its exact length so the splice stays in sync.
    shift = (f"atrim=start={lag:.4f},asetpts=PTS-STARTPTS" if lag >= 0
             else f"adelay={-lag * 1000:.0f}:all=1")
    ff("-i", iso, "-af", f"{shift},{WARM_F},"
       f"loudnorm=I={level}:TP=-1.5:LRA=11,aresample=48000,apad,atrim=end={b - a:.4f}",
       "-ar", "48000", "-ac", "2", clean)
    check = lag_seconds(src, a, b, clean)
    if abs(check) > 0.005:
        die(f"still {check * 1000:.0f} ms out of sync after the fix for {a:.1f}-{b:.1f} s")
    print(f"  isolated {a:.1f}-{b:.1f} s at {level} LUFS; lag {lag * 1000:.0f} ms removed, now {check * 1000:.1f} ms")
    return clean


def clean_window_file(src, out):
    """For Dropbox reels (render.py, item "audioClean": true): the render pulls only a short window of the clip,
    so clean that whole window and write a copy with the same video. Cached by the caller."""
    key = os.environ.get("FAL_KEY")
    if not key:
        die("FAL_KEY not set (needed for audioClean)")
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", src],
                       capture_output=True, text=True)
    dur = float(r.stdout.strip())
    tmp = tempfile.mkdtemp(prefix="deke-clean-")
    clean = clean_range(src, 0.0, dur, tmp, 0, key)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    ff("-i", src, "-i", clean, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "pcm_s16le", out)
    return out


def main(ids):
    key = os.environ.get("FAL_KEY")
    if not key:
        die("FAL_KEY not set")
    bank = load_bank()
    items = {i["id"]: i for i in bank["items"]}
    missing = [i for i in ids if i not in items]
    if missing:
        die(f"not in bank: {missing}")
    by_src = {}
    for i in ids:
        it = items[i]
        src = it.get("source_before_audio_clean") or it["source"]["path"]
        if it["source"].get("type") != "file":
            die(f"{i}: only file sources are supported")
        by_src.setdefault(src, []).append(it)

    for src, its in by_src.items():
        windows = merge([[max(0, min(s[0] for s in it["segments"]) - PAD), max(s[1] for s in it["segments"]) + PAD]
                         for it in its])
        name = os.path.splitext(os.path.basename(src))[0]
        outdir = os.path.join(os.path.dirname(os.path.dirname(src)), "audio-clean")
        os.makedirs(outdir, exist_ok=True)
        out = os.path.join(outdir, f"{name}-clean.mp4")
        tmp = tempfile.mkdtemp(prefix="deke-clean-")
        full = os.path.join(tmp, "full.wav")
        ff("-i", src, "-vn", "-ar", "48000", "-ac", "2", full)
        pieces, cursor = [], 0.0
        for n, (a, b) in enumerate(windows):
            clean = clean_range(src, a, b, tmp, n, key)
            pieces.append(("orig", cursor, a))
            pieces.append(("clean", clean))
            cursor = b
        pieces.append(("orig", cursor, None))
        inputs, chains, labels = ["-i", full], [], []
        for k, p in enumerate(pieces):
            if p[0] == "orig":
                end = f":{p[2]}" if p[2] is not None else ""
                chains.append(f"[0]atrim=start={p[1]}{':end=' + str(p[2]) if p[2] is not None else ''},asetpts=N/SR/TB[p{k}]")
            else:
                inputs += ["-i", p[1]]
                chains.append(f"[{len(inputs) // 2 - 1}]anull[p{k}]")
            labels.append(f"[p{k}]")
        spliced = os.path.join(tmp, "spliced.wav")
        ff(*inputs, "-filter_complex", ";".join(chains) + ";" + "".join(labels) + f"concat=n={len(labels)}:v=0:a=1[o]",
           "-map", "[o]", spliced)
        ff("-i", src, "-i", spliced, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", out)
        # The copy keeps the source's timing, so it reuses the source transcript; transcribing a whole
        # interview again is slow and its faster-whisper process crashes on exit on this machine.
        import shutil
        tdir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "media", "engine", "transcripts")
        for ext in (".words.json", ".txt"):
            if os.path.exists(os.path.join(tdir, name + ext)):
                shutil.copyfile(os.path.join(tdir, name + ext), os.path.join(tdir, f"{name}-clean{ext}"))
        for it in its:
            it["source_before_audio_clean"] = src
            it["source"] = {"type": "file", "path": out.replace("\\", "/")}
            it["audioNote"] = "2026-11-15: ElevenLabs isolation (Fal) + warmth EQ F on the reel's window, spliced into a copy"
        print(f"CLEANED {name}: {len(windows)} window(s) -> {out}")
    save_bank(bank)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        die("usage: clean_audio.py <item-id> [...]")
    main(sys.argv[1:])
