# Recipe: Deke WhatsApp video to scheduled reels

The exact process that produced the Nov 9 rehearsal-tips week (approved by Denis 2026-11-03). Follow it step
by step. Do not improvise steps, skip gates, or add effects. Run commands from `claude_projects/deke`.

Trigger: Denis says "new Deke WhatsApp video" (or drops a file in the inbox and asks for reels).

## 0. Denis drops the video

WhatsApp Desktop: right-click the video, Save as, into `C:\deke-media\inbox\`. Any number of videos.
Nothing else is needed from Denis or Deke.

## 1. Intake

```
python -X utf8 engine/intake.py
```

Copies each inbox video into the engine, moves the original to `inbox/done`, detects orientation
(portrait selfie = framing `native`, landscape = `blur43`, Zoom split screen = `region` on Deke's tile),
measures loudness, transcribes, and prints the timestamped transcript. Stops with a reason if a file has no
audio, no speech, or is under 15 s.

## 2. Pick the clips (Claude's judgment, inside fixed rules)

Read the printed transcript. Get exact word timings with `python -X utf8 engine/words.py <name> <from> <to>`.

- One reel per idea or tip, 15 to 30 s ideal, 60 s max. Start on the idea itself; end on a complete sentence.
- If the video is a numbered list (tips, steps), each item is its own reel, and the series gets a label:
  `"polish": {"kicker": "<TOPIC> TIP n OF N", "endLines": ["ALL N TIPS", "FREE INSIDE", "TOTAL VOCAL"]}`.
  His opening hook line may be prefixed to reel 1.
- The whole video also becomes one Skool-only item: `"skool_only": true, "maxSec": 120, "polish": false`.
  Every public caption then ends with "All N tips in one video, free inside Total Vocal: skool.com/deke".
- Single-idea videos: no kicker; the default polish from `engine/config.json reel_polish` applies.
- Copy: Deke's first person, only what he said, ends with one question. "a cappella directors", never
  "choir directors" (his own spoken words in captions are fine). No dashes. TikTok line + 4 or 5 hashtags.
- Respect `engine/MINE-PROMPT.md` wording notes (e.g. no sporty phrasing for singing).

Write `engine/state/mined-<name>.json` (shape: see `engine/state/mined-whatsapp-four-tips.json`) and run:

```
python -X utf8 engine/add_items.py engine/state/mined-<name>.json
```

Fix every REJECTED reason and rerun until it says "added".

## 3. Render (the standard is automatic)

```
python -X utf8 engine/render.py <item-id>        # once per reel
```

Every render gets, without asking: cuts at the first real silence (never through a word), captions
transcribed from the finished clip (split words joined, fillers dropped), the opening label when set, the
Maliboom a cappella bed (0.05 under voice, swells on the card), the Total Vocal closing card, loudness near
-15 LUFS, 1080x1920. A render that would clip a word or show a broken caption fails instead of shipping.

## 4. Quality gate (always, before anything goes to Deke)

```
python -X utf8 engine/verify_endings.py <item-id> ...
python -X utf8 engine/build_contact_sheet.py engine/state/<name>-qa.html "<title>" <item-id> ...
```

Read every `starts:` and `ends:` line: each must be a complete sentence with nothing from the next phrase.
Publish the contact sheet as an Artifact and look at every caption strip and the first and last frames.
Anything wrong: fix the segment times in the bank, re-render, repeat this step.

## 5. Plan the week

```
python -X utf8 engine/plan_week.py plan <monday> <reel>:tue <text>:mon <reel>:thu <text>:wed <reel>:sat
```

Same weekly shape as the approved weeks: reels Tue/Thu/Sat (IG + FB 10:00, YouTube 12:00, TikTok 14:00),
text Mon (FB 10:00, Threads 12:00) and Wed (LinkedIn 09:00, FB 10:00). Extra reels open the following week.
Before planning, check `engine/batches/` and Postiz so no week is planned twice.

## 6. Deke's page

```
python -X utf8 engine/build_deke_page.py engine/batches/<monday>-deke-plan "<intro>" "<skool paragraph>" "<reply-by line>"
```

Publish `DEKE-WEEK.html` as an Artifact. Denis sets it to "anyone with the link" and sends it to Deke on
WhatsApp. Deke watches and reads; he replies "all good" or names a post and a change. Deke never sees
frame-level detail.

## 7. Schedule

On Deke's OK (or Sunday 9 PM with no answer), apply any wording changes he asked for, then:

```
python -X utf8 engine/plan_week.py publish <monday>
```

It schedules, confirms every post exists in Postiz, and marks the bank. Denis posts the Skool-only full video
inside Total Vocal by hand on the Monday.

## 8. Log

Add a dated line to `deke/PLAN.md`: what was posted, the Deke page link, anything Deke changed.

## Media and safety

- Media lives in `C:\deke-media` (config `media_root`). D: was flagged "Full Repair Needed" on 2026-11-02.
- Nothing is scheduled without Denis's go or Deke's approval. Never post into Skool through Postiz.
