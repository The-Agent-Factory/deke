"""Dub a rendered reel into other languages in Deke's own voice (Denis, 2026-11-16).

Why: Deke asked whether he can put out his videos in several languages (AltaCross pitched it to him).
This is our version: ElevenLabs Dubbing through Fal (translates, clones the speaker's voice from the clip,
speaks the translation in that voice), then the same DekeShort caption template in the new language.
Voice only, no lip-sync (Denis's choice for the sample): the mouth keeps its English movements.

  python -X utf8 engine/dub_sample.py <item-id> fr de

Input: the caption-free base the engine kept for the item (<media>/engine/bases/<id>.mp4, 1080x1920, voice
plus a 3.5 s held end frame). Only its audio goes to Fal; the picture never leaves the laptop.
Output: <media>/engine/dubs/<id>-<lang>.mp4, a -captions.jpg proof sheet, and <id>-<lang>.json
(translated words, timings, QA, Fal request id). bank.json is NOT touched: these are samples, not posts.
Needs FAL_KEY. Fails loudly: any API, ffmpeg, Whisper or QA problem stops the run.
"""
import json, os, re, shutil, subprocess, sys, time, urllib.request

ENGINE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ENGINE)
import render  # noqa: E402  (reuses MEDIA, REMOTION, HOLD, NORM, ENC, run, caption and QA helpers)

FAL = "fal-ai/elevenlabs/dubbing"
JOIN = {"fr": "REJOIGNEZ", "de": "MACH MIT BEI", "es": "ÚNETE A", "it": "UNISCITI A", "pt": "JUNTE-SE AO",
        "ja": "参加しよう", "ko": "함께해요"}
FILLERS = {"euh", "ähm", "äh", "hm", "uh", "um"}


def die(msg):
    raise SystemExit("DUB FAILED: " + msg)


def http(url, data=None, headers=None, method=None, timeout=600):
    req = urllib.request.Request(url, data=data, headers=headers or {}, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        die(f"{method or 'GET'} {url.split('?')[0]} -> HTTP {e.code}: {e.read()[:400]!r}")


def upload(path, ctype, auth):
    init = json.loads(http("https://rest.alpha.fal.ai/storage/upload/initiate?storage_type=fal-cdn-v3",
                           json.dumps({"content_type": ctype, "file_name": os.path.basename(path)}).encode(),
                           {**auth, "Content-Type": "application/json"}, "POST"))
    http(init["upload_url"], open(path, "rb").read(), {"Content-Type": ctype}, "PUT")
    return init["file_url"]


def dub(audio_url, lang, auth):
    """Queue the job (a 2-minute dub runs longer than a plain request should wait) and poll until done."""
    body = {"audio_url": audio_url, "target_lang": lang, "source_lang": "en", "num_speakers": 1}
    sub = json.loads(http(f"https://queue.fal.run/{FAL}", json.dumps(body).encode(),
                          {**auth, "Content-Type": "application/json"}, "POST"))
    rid, status_url, resp_url = sub["request_id"], sub["status_url"], sub["response_url"]
    print(f"  {lang}: queued {rid}", flush=True)
    t0 = time.time()
    while True:
        st = json.loads(http(status_url, headers=auth))
        if st.get("status") == "COMPLETED":
            break
        if st.get("status") not in ("IN_QUEUE", "IN_PROGRESS"):
            die(f"{lang} dub status {st}")
        if time.time() - t0 > 1800:
            die(f"{lang} dub still not done after 30 minutes ({rid})")
        time.sleep(10)
    out = json.loads(http(resp_url, headers=auth))
    url = (out.get("audio") or {}).get("url")
    if not url:
        die(f"{lang} dub returned no audio: {str(out)[:300]}")
    print(f"  {lang}: done in {time.time() - t0:.0f} s", flush=True)
    return rid, http(url)


def duration(path):
    return float(render.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]).stdout)


def speech_end(path):
    """Last moment the dubbed voice is sounding (silencedetect at -40 dB)."""
    err = render.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-af", "silencedetect=n=-40dB:d=0.4",
                      "-f", "null", "-"]).stderr
    total = duration(path)
    starts = [float(x) for x in re.findall(r"silence_start: (-?[\d.]+)", err)]
    ends = [float(x) for x in re.findall(r"silence_end: (-?[\d.]+)", err)]
    # The file ends in silence when the last silence never ends, or (newer ffmpeg) ends at the end of the file.
    if starts and (len(ends) < len(starts) or ends[-1] >= total - 0.05):
        return starts[-1]
    return total


_WHISPER = None


def words_in(path, lang, speech_sec):
    global _WHISPER
    from faster_whisper import WhisperModel
    if _WHISPER is None:
        _WHISPER = WhisperModel("large-v3", device="cuda", compute_type="float16")
    segs, _ = _WHISPER.transcribe(path, word_timestamps=True, vad_filter=False, language=lang)
    out = []
    for s in segs:
        for w in s.words:
            t = w.word.strip()
            if t and w.start < speech_sec - 0.05 and t.strip(",.?!").lower() not in FILLERS:
                out.append({"start": round(w.start, 3), "end": round(min(w.end, speech_sec), 3), "word": t})
    return render.join_split_words(out)


def main():
    if len(sys.argv) < 3:
        die("usage: dub_sample.py <item-id> <lang> [<lang> ...]")
    item_id, langs = sys.argv[1], sys.argv[2:]
    key = os.environ.get("FAL_KEY") or die("FAL_KEY is not set")
    auth = {"Authorization": f"Key {key}"}
    M = render.MEDIA
    base = f"{M}/bases/{item_id}.mp4"
    if not os.path.exists(base):
        die(f"no base for {item_id} at {base}; render the item first")
    outdir = f"{M}/dubs"
    os.makedirs(outdir, exist_ok=True); os.makedirs(f"{M}/work", exist_ok=True)
    src_audio = f"{outdir}/{item_id}-en.wav"
    render.run(["ffmpeg", "-v", "error", "-y", "-i", base, "-vn", "-ac", "1", "-ar", "44100", src_audio])
    base_dur = duration(base)
    print(f"base {base_dur:.2f} s, uploading audio", flush=True)
    audio_url = upload(src_audio, "audio/wav", auth)

    for lang in langs:
        dub_raw = f"{outdir}/{item_id}-{lang}-dub-raw.mp3"
        rid_file = dub_raw + ".request"
        if os.path.exists(dub_raw) and os.path.exists(rid_file):
            rid = open(rid_file).read().strip()  # already paid for: reuse it (delete both files to dub again)
            print(f"  {lang}: reusing dub {rid}", flush=True)
        else:
            rid, raw = dub(audio_url, lang, auth)
            open(dub_raw, "wb").write(raw)
            open(rid_file, "w").write(rid)
        spoken = speech_end(dub_raw)
        # The dub keeps roughly the English timing; the picture must cover the voice plus the 3.5 s end hold.
        total = round(max(base_dur, spoken + render.HOLD), 3)
        print(f"  {lang}: dub {duration(dub_raw):.2f} s, voice ends {spoken:.2f} s, final {total:.2f} s", flush=True)
        if spoken > base_dur - render.HOLD + 8:
            die(f"{lang} voice runs {spoken:.1f} s, far past the English speech ({base_dur - render.HOLD:.1f} s)")
        dub_base = f"{M}/bases/{item_id}-{lang}.mp4"
        # 0.5 s of spare picture past durationSec: the 2026-11-16 first run crashed in Remotion's frame extractor
        # when the last frames it asked for sat at the very end of the file.
        padded = total + 0.5
        render.run(["ffmpeg", "-v", "error", "-y", "-i", base, "-i", dub_raw, "-filter_complex",
                    f"[0:v]tpad=stop_mode=clone:stop_duration=10,trim=0:{padded:.3f},setpts=PTS-STARTPTS[v];"
                    f"[1:a]atrim=0:{spoken + 0.05:.3f},{render.NORM},apad[a]",
                    "-map", "[v]", "-map", "[a]", "-t", f"{padded:.3f}", *render.ENC, dub_base])
        words = words_in(dub_base, lang, total - render.HOLD)
        # Optional caption corrections, same format as a bank item's captionFixes: <dubs>/<id>-<lang>.fixes.json
        # = [["heard", "said"], ...]. Only for words a second, prompted Whisper pass confirms (2026-11-16:
        # "a capé là le fond" -> "a cappella le font", "Schorleiter" -> "Chorleiter"). Audio is never changed.
        fixes_path = f"{outdir}/{item_id}-{lang}.fixes.json"
        fixes = json.load(open(fixes_path, encoding="utf-8")) if os.path.exists(fixes_path) else []
        words = render.caption_fixes(words, fixes)
        if len(words) < 20:
            die(f"{lang}: only {len(words)} words heard in the dub")
        broken = render.caption_problems(words)
        if broken:
            die(f"{lang} captions would show broken words: " + " | ".join(broken[:5]))
        pub = os.path.join(render.REMOTION, "public", "engine")
        os.makedirs(pub, exist_ok=True)
        name = f"{item_id}-{lang}"
        shutil.copyfile(dub_base, os.path.join(pub, f"{name}.mp4"))
        props = {"baseFile": f"engine/{name}.mp4", "words": words, "showTitle": False, "durationSec": total,
                 "joinWord": JOIN.get(lang, "JOIN")}
        pfile = f"{M}/work/{name}.props.json"
        json.dump(props, open(pfile, "w", encoding="utf-8"), ensure_ascii=False)
        final = f"{outdir}/{name}.mp4"
        render.run(["npx.cmd" if os.name == "nt" else "npx", "remotion", "render", "src/index.ts", "EngineShort",
                    final, f"--props={pfile}", "--concurrency=6", "--log=error"], cwd=render.REMOTION)
        os.remove(os.path.join(pub, f"{name}.mp4"))
        render.run(["ffmpeg", "-v", "error", "-y", "-ss", "1.5", "-i", final, "-frames:v", "1", "-q:v", "3",
                    f"{outdir}/{name}.jpg"])
        result = render.qa(final, total, 130)
        result["caption_sheet"] = f"{outdir}/{name}-captions.jpg"
        # Proof-sheet tiles go to a private folder: render.caption_sheet names them work/cap_NNN.jpg, and a
        # second render running at the same time deleted ours on 2026-11-16 (German sheet failed).
        import tempfile
        shared, tiles = render.MEDIA, tempfile.mkdtemp(prefix="dub-tiles-")
        os.makedirs(f"{tiles}/work")
        render.MEDIA = tiles
        try:
            result["caption_chunks"] = render.caption_sheet(final, words, result["caption_sheet"])
        finally:
            render.MEDIA = shared
            shutil.rmtree(tiles, ignore_errors=True)
        record = {"item": item_id, "lang": lang, "fal_request": rid, "voice_end_sec": spoken, "qa": result,
                  "caption_fixes": fixes,
                  "text": " ".join(w["word"] for w in words), "words": words}
        json.dump(record, open(f"{outdir}/{name}.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        if result["problems"]:
            die(f"{lang} QA: " + "; ".join(result["problems"]))
        print(f"OK {name} {result}", flush=True)


if __name__ == "__main__":
    main()
