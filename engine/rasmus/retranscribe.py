"""Clean word-timed transcript of the Deke + Rasmus call for captions and cut decisions.

faster-whisper large-v3 with condition_on_previous_text=False (the first pass drifted into lowercase
with no punctuation after 4:54 and invented text over two audio glitches) and a name prompt.
Writes <out>.json {"words": [...]} and <out>.txt (timestamped segments).

Usage: python retranscribe.py <video> <out_base>
"""
import json, sys
from faster_whisper import WhisperModel

PROMPT = ("Deke Sharon and Rasmus Krigström talk about a cappella, barbershop and choirs. Ringmasters, Zero8, "
          "Lemon Squeezy, VOCES8, Chanticleer, Pearls of the Sound, A Scalpella, Eric Ericson Chamber Choir, "
          "Swedish Radio Choir, Robin Tyson, the King's Singers, Emanuel Roll, Victor Nilsson, Steve Zegree, "
          "Home Free, The Sing-Off, SNOBS, Barbershop Harmony Society, Marty Monson, David Wright, Ben Bram, "
          "Pitch Perfect, Pentatonix, Skool, Total Vocal.")


def main(video, base):
    model = WhisperModel("large-v3", device="cuda", compute_type="float16")
    segs, info = model.transcribe(video, word_timestamps=True, vad_filter=True, condition_on_previous_text=False,
                                  initial_prompt=PROMPT, beam_size=5)
    segs = list(segs)
    words = [{"start": round(w.start, 2), "end": round(w.end, 2), "word": w.word.strip(), "p": round(w.probability, 3)}
             for s in segs for w in s.words]
    json.dump({"words": words}, open(base + ".json", "w", encoding="utf-8"))
    with open(base + ".txt", "w", encoding="utf-8") as f:
        for s in segs:
            f.write("[%d:%02d %.1f-%.1f] %s\n" % (int(s.start // 60), int(s.start % 60), s.start, s.end, s.text.strip()))
    print("done", len(words), "words")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
