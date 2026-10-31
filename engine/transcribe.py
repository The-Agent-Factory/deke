"""Transcribe engine source videos locally (faster-whisper large-v3 on the GPU).
Writes <id>.words.json (word timings) and <id>.txt (timestamped lines for clip mining).
Skips files already done. Usage: python transcribe.py <video> [<video> ...]"""
import sys, json, os
from faster_whisper import WhisperModel

OUT = "D:/deke-media/engine/transcripts"
model = None
for path in sys.argv[1:]:
    vid = os.path.splitext(os.path.basename(path))[0]
    words_path = f"{OUT}/{vid}.words.json"
    if os.path.exists(words_path):
        print("skip", vid); continue
    if model is None:
        model = WhisperModel("large-v3", device="cuda", compute_type="float16")
    segs, info = model.transcribe(path, word_timestamps=True, vad_filter=True)
    segs = list(segs)
    words = [{"start": round(w.start, 2), "end": round(w.end, 2), "word": w.word.strip()} for s in segs for w in s.words]
    json.dump({"id": vid, "lang": info.language, "words": words}, open(words_path, "w", encoding="utf-8"))
    with open(f"{OUT}/{vid}.txt", "w", encoding="utf-8") as f:
        for s in segs:
            f.write("[%d:%02d %.1f-%.1f] %s\n" % (int(s.start // 60), int(s.start % 60), s.start, s.end, s.text.strip()))
    print("done", vid, len(words), "words")
