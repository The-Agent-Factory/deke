"""One frame from a Dropbox trip clip, without downloading it (the miner's "look at one frame first" step).

    python -X utf8 engine/dbx_frame.py "<path relative to TotalVocal Skool>" <seconds> <out.jpg>
"""
import subprocess, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dropbox_stream
from common import CONFIG

rel, t, out = sys.argv[1], sys.argv[2], sys.argv[3]
if rel in CONFIG.get("dropbox_exclude", []):
    raise SystemExit(f"{rel} is in config dropbox_exclude; never use it")
with dropbox_stream.served():
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", t, "-i", dropbox_stream.url(rel), "-frames:v", "1", out], check=True)
print(out)
