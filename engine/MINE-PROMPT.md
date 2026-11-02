# Mining job: turn one Deke video into clips and text posts

You are running headless, launched by `engine/weekly.py`. Nobody is watching. Do the job, then stop.

## Your input

Read `engine/state/mine-job.json`. It names one source video: YouTube id, title, upload date, URL.
The transcript is at `D:/deke-media/engine/transcripts/<id>.txt` (timestamped lines) and
`<id>.words.json` (word timings). Print exact word timings for any range with:

```
python -X utf8 engine/words.py <id> <from_seconds> <to_seconds>
```

Also read `engine/state/recent-topics.txt`: what Deke's accounts posted lately. Do not repeat those topics.
Read the ids in `engine/bank.json` so you do not duplicate an existing clip.

## Your output

Write `engine/state/mined-<id>.json`: a JSON array of items, then run

```
python -X utf8 engine/add_items.py engine/state/mined-<id>.json
```

If it prints REJECTED, fix every listed problem and run it again until it prints "added". Then stop.
If the video has nothing usable (music only, not Deke talking), write an empty array `[]`, run the
command, and stop.

## What to pick

Aim for 4 to 6 reels and 3 to 4 text posts from one video.

A good reel is ONE idea Deke states clearly, 15 to 45 seconds, that a stranger scrolling understands
with no context. It opens on a strong line: a surprising claim, a number, a "stop doing X". It ends on a
complete sentence. You may join up to 3 segments from the same video when that tightens the idea, but
never change his meaning and never join two halves of different points.

Cut only between words. Start a segment at the `start` of its first word, end it at the `end` of its
last word. `add_items.py` rejects cuts through a word.

Who is speaking matters:
- Deke speaking: fine.
- A guest or interviewer speaking on screen or in the audio: set `"needs_deke": true` and
  `"needs_deke_reason": "guest <name or description> speaks; needs their OK"`. These never auto-post.
- Anything naming a competitor, criticising a named person or group, or about a minor: needs_deke true.

Look at one frame first (`ffmpeg -ss 120 -i D:/deke-media/engine/yt/<id>.mp4 -frames:v 1 frame.jpg`, then view it).
For a Zoom-style split screen, crop to Deke's tile only with
`{"kind": "region", "x": .., "y": .., "w": .., "h": ..}` in 1920x1080 pixels (keep w:h at 16:9). The guest
is then off screen, so the clip does not need their OK as long as only Deke speaks in it.
Otherwise (`framing.kind`): `blur169` when two people share the frame, when there are burned-in graphics
or text, or when you are not sure. `blur43` for a single talking head who stays near the centre.

## Item shapes

Reel:
```json
{"id": "short-kebab-id", "lane": "reel", "priority": 5, "needs_deke": false,
 "source": {"type": "youtube", "id": "<id>"},
 "segments": [[123.40, 151.92]], "framing": {"kind": "blur169"},
 "sourceNote": "<video title> (youtu.be/<id>) at 2:03",
 "copy": {"ytTitle": "max 90 chars, plain, the idea itself",
          "caption": "2 to 4 short paragraphs in Deke's first person, built only from what he says in the clip, ending with one question to the reader",
          "tiktok": "one punchy line plus 4 or 5 hashtags like #acappella #singing #vocalharmony"}}
```

Text post (built from a moment in the video that works better as words than as a clip):
```json
{"id": "text-short-kebab-id", "lane": "text", "priority": 4, "needs_deke": false,
 "sourceNote": "<video title> (youtu.be/<id>) at 14:20 to 15:05",
 "text": {"facebook": "80 to 160 words, Deke's first person, ends with a question",
          "threads": "one or two sentences, under 300 characters",
          "linkedin": "the same idea framed for a cappella directors and music educators, 60 to 140 words"}}
```

Priority: 8 to 9 for the strongest, most surprising ideas; 5 for solid; 3 for filler.

## Deke's wording notes (from his own corrections; follow them)

- 2026-11-02: "emotional run around the piano" sounds like an athletic event. Say "an emotionally powerful run
  through a song in rehearsal". In general, describe singing in plain musical terms, never in words that read
  as sport or exercise.

## Hard rules

- Only Deke's own ideas, in his own framing. Never add advice, stories, numbers or opinions he did not say.
- Never quote him with words he did not say. Paraphrase is fine; invented quotes are not.
- Write "a cappella directors", never "choir directors".
- No em dashes or en dashes anywhere. Use a period, comma or colon.
- No call to action in the copy: the engine appends the Total Vocal link itself.
- Do not post, schedule, email or publish anything. Your only writes are the mined file and the add step.
