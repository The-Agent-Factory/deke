"""Step 4 of the WhatsApp recipe: the ear check, automated. For each rendered reel, transcribe its first
5 seconds and the last 3 seconds of Deke speaking, and print them, so a person can confirm in one glance that
every clip starts and ends on a complete sentence (no clipped word, nothing from the next phrase).

  python engine/verify_endings.py <item-id> [<item-id> ...]
"""
import os, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import load_bank
import render

bank = {i["id"]: i for i in load_bank()["items"]}
from faster_whisper import WhisperModel
model = WhisperModel("large-v3", device="cuda", compute_type="float16")
tmp = os.path.join(render.MEDIA, "work", "verify.wav")


def said(path, start, length):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{max(0, start):.2f}", "-t", f"{length:.2f}", "-i", path,
                    "-ac", "1", "-ar", "16000", tmp], check=True)
    segs, _ = model.transcribe(tmp, language="en")
    return " ".join(s.text.strip() for s in segs)


for iid in sys.argv[1:]:
    it = bank[iid]
    speech = it["qa"]["duration"] - render.HOLD
    print(f"\n{iid}")
    print("  starts:", said(it["media"], 0, 5))
    print("  ends:  ", said(it["media"], speech - 3, 3.3))
