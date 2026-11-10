"""Final Deke + Rasmus video: Total Vocal interview bookends + Deke's recorded intro + the edit, same as Bill Biffle's final.

Order: splash-intro-interviews (Maliboom bed at full) -> Deke's intro (recorded after the live, 1024x576 phone clip
scaled to 1080p, "Deke Sharon / Total Vocal" plate, bed ducked under him and fading out with the bed's own length)
-> the edit (cold open, title, conversation, thank-you card) -> splash-outro-interviews, with the last 10 s of the
Maliboom bed under the thank-you card and outro.
Captions: Deke's intro cues + the edit's SRT shifted by the new opening.

Usage: python assemble_final.py
"""
import json, subprocess, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "bill_biffle"))
import build_captions as bc  # noqa: E402  (cues_from, split_long, srt_time, wrap)

M = Path(r"C:/Users/lafla/claude_projects/deke/media/rasmus")
E = M / "edit"
BRAND = Path(r"C:/Users/lafla/claude_projects/deke-video-pipeline/deke-brand/out")
SPLASH_IN, SPLASH_OUT = BRAND / "splash-intro-interviews-4k.mp4", BRAND / "splash-outro-interviews-4k.mp4"
BED = Path(r"C:/Users/lafla/claude_projects/deke/media/bill-biffle/music/HJ_Maliboom_BED1.mp3")
INTRO_RAW = M / "intro/deke-intro-raw.mp4"       # media/inbox/Intro for Deke and Rasmus .mp4
INTRO = M / "intro/intro-trim.mp4"
INTRO_A, INTRO_B = 0.15, 46.0                    # clean start / end, checked by transcript and frames
PLATE = Path(r"C:/Users/lafla/claude_projects/deke/media/bill-biffle/edit/plate-deke.png")
EDIT = E / "edit.mp4"
OUT = E / "rasmus-krigstrom-deke-youtube-final.mp4"
FPS = 30


def dur(p):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)],
                                capture_output=True, text=True).stdout)


def frames(sec):
    return round(sec * FPS) / FPS


def trim_intro():
    # phone clip is variable frame rate (~31.6 fps) at 1024x576: make it constant 30 fps 1080p first
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(INTRO_A), "-to", str(INTRO_B), "-i", str(INTRO_RAW),
                    "-vf", f"scale=1920:1080:flags=lanczos,fps={FPS},setsar=1", "-af", "aresample=48000",
                    "-c:v", "h264_nvenc", "-preset", "p6", "-cq", "16", "-c:a", "pcm_s16le", "-f", "mov",
                    str(INTRO)], check=True)


def main():
    trim_intro()
    d_in, d_intro, d_edit, d_out = frames(dur(SPLASH_IN)), frames(dur(INTRO)), frames(dur(EDIT)), frames(dur(SPLASH_OUT))
    t_intro, t_edit, t_out = d_in, d_in + d_intro, d_in + d_intro + d_edit
    total = t_out + d_out
    bed_len = dur(BED)
    tail = 10.0
    tail_start = total - tail
    v = (f"[0:v]scale=1920:1080:flags=lanczos,fps={FPS},setsar=1,trim=duration={d_in},setpts=PTS-STARTPTS[v0];"
         f"[1:v]fps={FPS},setsar=1,trim=duration={d_intro},setpts=PTS-STARTPTS[v1i];"
         f"[5:v]fps={FPS},format=rgba[pl];[v1i][pl]overlay=0:0:eof_action=pass:enable='between(t,1.0,7.0)'[v1];"
         f"[2:v]fps={FPS},setsar=1,trim=duration={d_edit},setpts=PTS-STARTPTS[v2];"
         f"[3:v]scale=1920:1080:flags=lanczos,fps={FPS},setsar=1,trim=duration={d_out},setpts=PTS-STARTPTS[v3];"
         f"[v0][v1][v2][v3]concat=n=4:v=1:a=0,format=yuv420p[v]")
    a = (f"anullsrc=r=48000:cl=stereo,atrim=duration={d_in}[s0];"
         f"[1:a]aresample=48000,aformat=channel_layouts=stereo,atrim=duration={d_intro},loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[a1];"
         f"[2:a]aresample=48000,aformat=channel_layouts=stereo,atrim=duration={d_edit}[a2];"
         f"anullsrc=r=48000:cl=stereo,atrim=duration={d_out}[s3];"
         f"[s0][a1][a2][s3]concat=n=4:v=0:a=1[voice];"
         f"[4:a]aresample=48000,aformat=channel_layouts=stereo,atrim=duration={bed_len},"
         f"volume='if(lt(t,{d_in}),0.30,0.075)':eval=frame,afade=t=in:d=0.3,afade=t=out:st={bed_len - 5:.2f}:d=5[b1];"
         f"[6:a]aresample=48000,aformat=channel_layouts=stereo,atrim=start={bed_len - tail:.3f},asetpts=PTS-STARTPTS,"
         f"volume=0.24,afade=t=in:d=1.2,adelay={int(tail_start * 1000)}|{int(tail_start * 1000)}[b2];"
         f"[voice][b1][b2]amix=inputs=3:duration=first:normalize=0,alimiter=limit=0.89[a]")
    cmd = ["ffmpeg", "-v", "warning", "-y", "-i", str(SPLASH_IN), "-i", str(INTRO), "-i", str(EDIT), "-i", str(SPLASH_OUT),
           "-i", str(BED), "-loop", "1", "-t", "8", "-i", str(PLATE), "-i", str(BED),
           "-filter_complex", v + ";" + a, "-map", "[v]", "-map", "[a]", "-t", f"{total:.3f}",
           "-c:v", "h264_nvenc", "-preset", "p6", "-rc", "vbr", "-cq", "19", "-b:v", "8M", "-maxrate", "14M",
           "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(OUT)]
    with open(E / "assemble.log", "w") as log:
        r = subprocess.run(cmd, stderr=log)
    if r.returncode != 0:
        raise SystemExit(f"ffmpeg exited {r.returncode}; see {E / 'assemble.log'}")
    plan = {"splash_in": 0, "intro": t_intro, "edit": t_edit, "splash_out": t_out, "total": total}
    json.dump(plan, open(E / "final-plan.json", "w"), indent=1)
    captions(t_intro, t_edit)
    print("done", OUT, f"{total / 60:.2f} min", plan)


def captions(t_intro, t_edit):
    W = json.load(open(M / "intro/intro-words.json", encoding="utf-8"))["words"]
    words = []
    for w in W:
        if not INTRO_A <= w["start"] < INTRO_B:
            continue
        w = {"start": w["start"] - INTRO_A + t_intro, "end": w["end"] - INTRO_A + t_intro, "word": w["word"]}
        if w["word"].startswith("-") and words:          # Whisper splits "non-North" into "non" + "-North"
            words[-1]["word"] += w["word"]
            words[-1]["end"] = w["end"]
            continue
        words.append(w)
    for i, w in enumerate(words):
        # "We'll talk to him about why is Sweden so singy?": first pass heard "them"; two solo passes heard "him" (p 0.99)
        if w["word"] == "them" and words[i + 1]["word"] == "about":
            w["word"] = "him"
    cues = bc.split_long(bc.cues_from(words))
    out = [(c["start"], c["end"], c["text"]) for c in cues]

    def secs(t):
        h, m, s = t.split(":")
        return int(h) * 3600 + int(m) * 60 + float(s.replace(",", "."))
    old = (E / "rasmus-deke.en.srt").read_text(encoding="utf-8").strip().split("\n\n")
    for b in old:
        lines = b.split("\n")
        a, z = lines[1].split(" --> ")
        out.append((secs(a) + t_edit, secs(z) + t_edit, " ".join(lines[2:])))
    with open(E / "rasmus-krigstrom-deke-youtube-final.en.srt", "w", encoding="utf-8") as f:
        for i, (a, z, t) in enumerate(out, 1):
            f.write(f"{i}\n{bc.srt_time(a)} --> {bc.srt_time(z)}\n{bc.wrap(t)}\n\n")
    print(len(cues), "intro cues,", len(out), "caption cues")


if __name__ == "__main__":
    main()
