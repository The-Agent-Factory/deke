"""Final Bill Biffle video: Total Vocal interview bookends + Deke's intro + the edit.

Order: splash-intro-interviews (Maliboom bed) -> Deke's intro (Mo Field lines removed, bed softly under,
fades out with the bed's own length) -> existing edit (cold open, title, conversation, thank-you card)
-> splash-outro-interviews, with the last 10 s of the Maliboom bed under the thank-you card and outro.
Maliboom is Denis's standard Deke intro/outro music (HJ_Maliboom_BED1.mp3, very hot at -7.4 LUFS).
Captions: Deke's intro cues + the edit's SRT shifted by the new opening.

Usage: python assemble_final.py
"""
import json, subprocess, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).parent))
import build_captions as bc  # cues_from, wrap, split_long, srt_time

M = Path(r"C:/Users/lafla/claude_projects/deke/media/bill-biffle")
E = M / "edit"
BRAND = Path(r"C:/Users/lafla/claude_projects/deke-video-pipeline/deke-brand/out")
SPLASH_IN, SPLASH_OUT = BRAND / "splash-intro-interviews-4k.mp4", BRAND / "splash-outro-interviews-4k.mp4"
BED = M / "music/HJ_Maliboom_BED1.mp3"
INTRO = E / "intro-trim.mov"
EDIT = E / "bill-biffle-deke-youtube.mp4"
OUT = E / "bill-biffle-deke-youtube-final.mp4"
FPS = 30
CUT_A, CUT_B, XF = 54.465, 80.33, 0.12  # intro trim points (source seconds) and video dissolve


def dur(p):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)],
                                capture_output=True, text=True).stdout)


def frames(sec):
    return round(sec * FPS) / FPS


def plate():
    im = Image.new("RGBA", (1920, 1080), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((60, 860, 560, 1010), 14, fill=(22, 22, 22, 205))
    d.line((90, 890, 146, 890), fill=(212, 168, 83, 255), width=3)
    d.text((90, 902), "Deke Sharon", font=ImageFont.truetype(r"C:/Windows/Fonts/seguisb.ttf", 44), fill=(242, 236, 220, 255))
    d.text((90, 958), "Total Vocal", font=ImageFont.truetype(r"C:/Windows/Fonts/segoeui.ttf", 26), fill=(212, 168, 83, 255))
    im.save(E / "plate-deke.png")


def main():
    plate()
    d_in, d_intro, d_edit, d_out = frames(dur(SPLASH_IN)), frames(dur(INTRO)), frames(dur(EDIT)), frames(dur(SPLASH_OUT))
    t_intro, t_edit, t_out = d_in, d_in + d_intro, d_in + d_intro + d_edit
    total = t_out + d_out
    bed_len = dur(BED)
    tail = 10.0                       # bed's last 10 s: under the thank-you card and the outro
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
         # bed 1: full under the opener, ducked under Deke's voice, fades out before the bed ends
         f"[4:a]aresample=48000,aformat=channel_layouts=stereo,atrim=duration={bed_len},"
         f"volume='if(lt(t,{d_in}),0.30,0.075)':eval=frame,afade=t=in:d=0.3,afade=t=out:st={bed_len - 5:.2f}:d=5[b1];"
         # bed 2: the bed's ending under the thank-you card and the outro
         f"[6:a]aresample=48000,aformat=channel_layouts=stereo,atrim=start={bed_len - tail:.3f},asetpts=PTS-STARTPTS,"
         f"volume=0.24,afade=t=in:d=1.2,adelay={int(tail_start * 1000)}|{int(tail_start * 1000)}[b2];"
         f"[voice][b1][b2]amix=inputs=3:duration=first:normalize=0,alimiter=limit=0.89[a]")
    cmd = ["ffmpeg", "-v", "warning", "-y", "-i", str(SPLASH_IN), "-i", str(INTRO), "-i", str(EDIT), "-i", str(SPLASH_OUT),
           "-i", str(BED), "-loop", "1", "-t", "8", "-i", str(E / "plate-deke.png"), "-i", str(BED),
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
    W = json.load(open(M / "intro-words.json"))["words"]
    L1 = CUT_A - 0.30
    words = []
    for w in W:
        if 0.30 <= w["start"] < CUT_A:
            off = t_intro - 0.30
        elif CUT_B <= w["start"] <= 88.72:
            off = t_intro + (L1 - XF) - CUT_B
        else:
            continue
        words.append({"start": w["start"] + off, "end": w["end"] + off, "word": w["word"]})
    cues = bc.split_long(bc.cues_from(words))
    for c in cues:
        c["text"] = c["text"].replace("everyone in harmony", "Everyone in Harmony")
    old = (E / "bill-biffle-deke.en.srt").read_text(encoding="utf-8").strip().split("\n\n")
    out = []
    for c in cues:
        out.append((c["start"], c["end"], c["text"]))

    def secs(t):
        h, m, s = t.split(":")
        return int(h) * 3600 + int(m) * 60 + float(s.replace(",", "."))
    for b in old:
        lines = b.split("\n")
        a, z = lines[1].split(" --> ")
        out.append((secs(a) + t_edit, secs(z) + t_edit, " ".join(lines[2:])))
    with open(E / "bill-biffle-deke-final.en.srt", "w", encoding="utf-8") as f:
        for i, (a, z, t) in enumerate(out, 1):
            f.write(f"{i}\n{bc.srt_time(a)} --> {bc.srt_time(z)}\n{bc.wrap(t)}\n\n")
    print(len(out), "caption cues")


if __name__ == "__main__":
    main()
