"""Index Deke's trip footage straight from Dropbox: probe, transcribe, record. No video is copied to disk.

For each new clip in the shared folder (TotalVocal Skool, minus our own deke-media copies):
  - ffprobe over the stream: length, resolution, orientation
  - audio pulled from the DJI .LRF preview when there is one (same sound, ~10x smaller), else the original,
    into a temp WAV that is deleted right after
  - faster-whisper large-v3 on the GPU: <media>/engine/transcripts/<key>.words.json and <key>.txt
    (the same files render.py and the clip miner already read)
  - one entry in engine/state/dropbox-index.json

Usage:
  python -X utf8 engine/index_dropbox.py               index everything new
  python -X utf8 engine/index_dropbox.py --list        show what is new, index nothing
  python -X utf8 engine/index_dropbox.py --only China  limit to one folder
  python -X utf8 engine/index_dropbox.py --limit 5     at most 5 clips this run
Last stdout line is JSON {"indexed": [...], "errors": [...], "pending": n} for the autopilot email.
Exit 1 if any clip failed (the error is kept in the index so the next run retries it).
"""
import argparse, datetime, json, os, subprocess, sys, tempfile

ENGINE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ENGINE)
from common import STATE, safe_write_json, load_json_safe, CONFIG  # noqa: E402
import dropbox_stream as dbx  # noqa: E402

MEDIA = (os.environ.get("DEKE_MEDIA") or CONFIG.get("media_root") or os.path.join(os.path.dirname(ENGINE), "media")) + "/engine"
TRANSCRIPTS = f"{MEDIA}/transcripts"
INDEX = os.path.join(STATE, "dropbox-index.json")


def probe(u):
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                        "stream=width,height:stream_side_data=rotation:format=duration", "-of", "json", u],
                       capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=180)
    if r.returncode != 0:
        raise RuntimeError(f"ffprobe failed: {r.stderr[-400:]}")
    d = json.loads(r.stdout)
    s = (d.get("streams") or [{}])[0]
    w, h = s.get("width", 0), s.get("height", 0)
    rot = 0
    for sd in s.get("side_data_list", []) or []:
        rot = abs(int(sd.get("rotation", 0) or 0))
    if rot in (90, 270):
        w, h = h, w
    return dict(duration=round(float(d.get("format", {}).get("duration", 0) or 0), 2), width=w, height=h,
                orientation="vertical" if h > w else "horizontal")


_model = None


def transcribe(wav, k):
    global _model
    from faster_whisper import WhisperModel
    if _model is None:
        _model = WhisperModel("large-v3", device="cuda", compute_type="float16")
    segs, info = _model.transcribe(wav, word_timestamps=True, vad_filter=True)
    segs = list(segs)
    words = [{"start": round(w.start, 2), "end": round(w.end, 2), "word": w.word.strip()} for s in segs for w in (s.words or [])]
    os.makedirs(TRANSCRIPTS, exist_ok=True)
    json.dump({"id": k, "lang": info.language, "words": words}, open(f"{TRANSCRIPTS}/{k}.words.json", "w", encoding="utf-8"))
    with open(f"{TRANSCRIPTS}/{k}.txt", "w", encoding="utf-8") as f:
        for s in segs:
            f.write("[%d:%02d %.1f-%.1f] %s\n" % (int(s.start // 60), int(s.start % 60), s.start, s.end, s.text.strip()))
    first = next((s.text.strip() for s in segs if len(s.text.strip()) > 20), "")
    return len(words), info.language, first[:160]


def index_one(clip):
    k = dbx.key(clip["path"])
    meta = probe(dbx.url(clip["path"]))
    audio_src = dbx.url(clip["proxy"] or clip["path"])
    fd, wav = tempfile.mkstemp(suffix=".wav", prefix="dbx-")
    os.close(fd)
    try:
        r = subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", audio_src, "-vn", "-ac", "1", "-ar", "16000", wav],
                           capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=7200)
        if r.returncode != 0:
            if "does not contain any stream" in r.stderr or "matches no streams" in r.stderr:
                n, lang, first = 0, None, ""  # silent clip (no audio track)
            else:
                raise RuntimeError(f"audio pull failed: {r.stderr[-400:]}")
        else:
            n, lang, first = transcribe(wav, k)
    finally:
        try:
            os.remove(wav)
        except OSError:
            pass
    talk = n / max(meta["duration"], 1) * 60  # words per minute
    return dict(meta, key=k, size=clip["size"], modTime=clip["modTime"], proxy=clip["proxy"], words=n, lang=lang,
                speech="talking" if talk >= 60 and n >= 25 else ("some speech" if n >= 10 else "no speech"),
                firstLine=first, indexedAt=datetime.datetime.now().isoformat(timespec="seconds"))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--list", action="store_true")
    ap.add_argument("--only")
    ap.add_argument("--limit", type=int, default=0)
    a = ap.parse_args()

    idx = load_json_safe(INDEX) if os.path.exists(INDEX) else {"files": {}}
    clips = dbx.footage(dbx.list_remote())
    if a.only:
        clips = [c for c in clips if c["path"].startswith(a.only)]
    new = [c for c in clips if c["path"] not in idx["files"] or idx["files"][c["path"]].get("error")
           or idx["files"][c["path"]].get("size") != c["size"]]
    new.sort(key=lambda c: c["modTime"], reverse=True)  # newest drops first
    if a.list:
        for c in new:
            print(f'{c["size"]/1e6:9.0f} MB  {"LRF " if c["proxy"] else "    "} {c["path"]}')
        print(json.dumps({"indexed": [], "errors": [], "pending": len(new)}))
        return
    todo = new[: a.limit] if a.limit else new
    lock = os.path.join(STATE, "dropbox-index.lock")
    if os.path.exists(lock) and (datetime.datetime.now().timestamp() - os.path.getmtime(lock)) < 6 * 3600:
        print(json.dumps({"indexed": [], "errors": [], "pending": len(new), "busy": True}))
        return
    open(lock, "w").write(str(os.getpid()))
    try:
        done, errors = run_batch(todo, idx)
    finally:
        os.remove(lock)
    print(json.dumps({"indexed": done, "errors": errors, "pending": len(new) - len(todo)}, ensure_ascii=False))
    if errors:
        sys.exit(1)


def run_batch(todo, idx):
    done, errors = [], []
    with dbx.served():
        for i, c in enumerate(todo, 1):
            print(f"[{i}/{len(todo)}] {c['path']}", flush=True)
            try:
                e = index_one(c)
                idx["files"][c["path"]] = e
                done.append({"path": c["path"], "duration": e["duration"], "orientation": e["orientation"],
                             "speech": e["speech"], "words": e["words"], "firstLine": e["firstLine"]})
                print(f"    {e['duration']:.0f}s {e['orientation']} {e['speech']} ({e['words']} words)", flush=True)
            except Exception as ex:  # keep going, but record it and fail the run at the end
                idx["files"][c["path"]] = {"size": c["size"], "modTime": c["modTime"], "error": str(ex)[:500]}
                errors.append({"path": c["path"], "error": str(ex)[:300]})
                print(f"    ERROR {ex}", flush=True)
            safe_write_json(INDEX, idx)
    return done, errors


if __name__ == "__main__":
    main()
