"""Print word timings for a source between two times: python engine/words.py <id> <from> <to>"""
import json, sys
w = json.load(open(f"D:/deke-media/engine/transcripts/{sys.argv[1]}.words.json", encoding="utf-8"))["words"]
a, b = float(sys.argv[2]), float(sys.argv[3])
print(" ".join(f"{x['word']}[{x['start']:.2f}-{x['end']:.2f}]" for x in w if a <= x["start"] <= b))
