# Deke: Plan
**Last updated:** 2026-11-03 (local)
**Status:** active

## 🆕 2026-11-04: BILL BIFFLE FINAL WITH DEKE'S INTRO (scheduled in Postiz for Thu Nov 5, 6:00 AM ET, unlisted)

- Denis said "post it". Dropbox is over quota (200 GB of 9.25 GB) so no Dropbox link; Composio YouTube upload quota exhausted; cloudflared download blocked by session rules. Spaces/Supabase S3 remotes hold ClinikPro clinic data: never use them for Deke.
- Postiz took a 720p copy (media/bill-biffle/edit/bill-biffle-720.mp4, 401 MB). First post (cmw2ioaev...) errored: "YouTube's daily upload quota is exhausted". Rescheduled: Postiz post cmw2j5qrf0hhml808dife0mb0, 2026-11-05T11:00Z, unlisted, thumbnail, tags (publisher now sends tags as {value,label}).
- **Next (Nov 5 morning):** check the post published (Postiz GET /posts releaseURL), attach captions `total-vocal-skool/bill-biffle-2026-10/Bill Biffle with Deke Sharon.en.srt` via Composio YOUTUBE_UPLOAD_CAPTION_TRACK (account youtube_bugre-glop), send Denis the unlisted link.

- Deke recorded an intro (media/inbox/billbiffle-intro-from-deke.mp4, 1:29). Denis: cut Mo Field from it (Mo half stays out), post only the final, use the usual Total Vocal intro/outro + music (ACE barbershop bed dropped: "no time, would sound bad").
- Intro trimmed 0.30-54.465 + 80.33-88.72 ("So enjoy this discussion. Well, what am I talking about this for?"), verified by transcription.
- Final `media/bill-biffle/edit/bill-biffle-deke-youtube-final.mp4` (39:30): splash-intro-interviews-4k + Maliboom bed (0.30, ducked 0.075 under Deke, fades with the bed) -> Deke intro with "Deke Sharon / Total Vocal" plate -> edit -> thank-you card + last 10 s of Maliboom -> splash-outro-interviews-4k. -15.4 LUFS. Built by engine/bill_biffle/assemble_final.py. Captions 597 cues incl. Deke's intro. Chapters shifted +66 s (0:00 Deke introduces Bill).
- Package refreshed in total-vocal-skool/bill-biffle-2026-10/ (video, .en.srt, thumbnail, UPLOAD-STEPS.txt, manifest with mediaUrls placeholder).
- Upload path: Postiz /upload is capped (~100 MB, 1.56 GB failed); publisher now supports item.mediaUrls via POST /upload-from-url and item.privacy. Needs a public temp URL (Dropbox temporary link after rclone upload to dropbox:Bill Biffle YouTube/). Captions via Composio deke-yt (youtube_bugre-glop), verified = Deke's channel UCTuZ5LxQIjLK-CJBy0onT_Q. Denis's Google login cannot open Deke's channel in YouTube Studio.
- Rasmus Krigstrom live cover: total-vocal-skool/rasmus-krigstrom-live/ (1920x1080 + 1460x752; Rasmus = lead, Ringmasters, 2012 champions; photo from ringmasters.se "ras", Denis to confirm).

## 2026-11-03 (late): BILL BIFFLE INTERVIEW EDITED FOR YOUTUBE (review page, nothing uploaded)

- **Denis:** pull the Oct 30 Skool live with Bill Biffle, edit to only Deke and Bill, closed captions, a few opening clips, "extremely respectful"; post on YouTube.
- **Source:** Skool post "Bill Biffle, past Barbershop Harmony Society president, with Deke and a Bonus!" (Mux HLS, 72.9 min, 1080p), pulled through Denis's logged-in Chrome tab (token never left the browser) to `claude_projects/downloads/`, muxed to `media/bill-biffle/bill-biffle-full.mp4`.
- **Bill's title (primary source nmchords.com director bio):** BHS International President 2009-2010; certified Sound and Singing judge 1981-2003; directed the New MexiChords (Albuquerque). Note: bio says joined 1976, Bill says 1975 on camera, so no join year in copy.
- **Edit (38:19):** cold open of 3 Bill clips (31:18 harmony vs rhythm, 23:03 songs I don't know again, 17:42 New MexiChord pep talk), title card, conversation 0:58.5 to 38:41.15 kept in full (Deke + Bill side by side via per-second tile tracking; Deke solo 11:47-12:21 while Bill's camera was off; 2 s held frame at 4:42), end card "Thank you, Bill" + skool.com/deke. No music. -16.4 LUFS. Mo Field segment 38:42-72:55 set aside (possible separate video).
- **Captions:** `media/bill-biffle/edit/bill-biffle-deke.en.srt`, 578 cues (2 x 42 chars), 71 source-checked name fixes; punctuation restored text-only (word sequence verified unchanged). Listen list: 10:36 "the stage ... Tim Brooks", 18:15 "floodlights".
- **Scripts:** `engine/bill_biffle/` (track_tiles.py, resolve_layout.py, build_edit.py, build_captions.py). Media under `media/bill-biffle/` (gitignored).
- **Review page:** https://claude.ai/artifact/98FRtXgF7u8bGuQqKoF7nY (source `media/bill-biffle/edit/REVIEW.html`, republish there).
- **Denis chose:** unlisted first, Mo Field segment left out, connect Deke's channel in Composio.
- **Postiz upload FAILED** (1.56 GB, `fetch failed` on /upload, likely size limit); nothing was queued. `postiz-publish.mjs` now supports `item.privacy` (public/unlisted/private).
- **Composio `deke-yt` (youtube_bugre-glop) connected 2026-11-03**, but every call returns 403 `quotaExceeded` on Composio's shared YouTube app (resets midnight Pacific). Channel identity not yet verified. Caption tool: YOUTUBE_UPLOAD_CAPTION_TRACK.
- **Denis uploads manually:** package in `total-vocal-skool/bill-biffle-2026-10/` (video, .en.srt, thumbnail from the 38:42 smile, UPLOAD-STEPS.txt with title/description/tags). Video is gitignored.
- **Next:** after Denis uploads unlisted, verify on YouTube (video + caption track) once Composio quota resets; Deke approves, then public.

## 🆕 2026-11-03 (night): FOOTAGE NOW WORKS ONLINE, STRAIGHT FROM DROPBOX (no media drive)

- **Denis:** "This should all be done online. Forget about the drive repair." D: is out of the footage path.
- **How:** `engine/dropbox_stream.py` serves the shared folder "TotalVocal Skool" over a local HTTP port with rclone (no file cache); ffmpeg and Whisper read from it and pull only the bytes they need. Proof: 6.7 s cut from the middle of a 2.9 GB China clip = 31 MB moved, 11 s.
- **Indexer:** `engine/index_dropbox.py` (probe + transcribe each new trip clip; DJI .LRF preview audio when present; temp WAV deleted) → transcripts `media/engine/transcripts/dbx_<folder>_<file>.words.json/.txt`, index `engine/state/dropbox-index.json` (length, shape, speech level, first line). `--list`, `--only <folder>`, `--limit n`; lock `engine/state/dropbox-index.lock`. Excludes `deke-media/` and `Deke card68 masters/`.
- **Renderer:** source type `{"type":"dropbox","path":"China/..."}` in bank items. render.py pulls only the window around the cuts (±3 s, max 15 min span) as a temp 1080p file, then the usual pipeline. Tested end to end on the China selfie (0048): 65 s, QA pass, test removed. Validator (add_items.py) and MINE-PROMPT.md know the new type.
- **Autopilot** (scheduled task DekeDropboxAutopilot, every 6 h, unchanged trigger): no longer pulls files; runs the indexer (max 40 clips per run) and emails what was indexed. State moved to `engine/state/dropbox/`. `dropbox-ingest.mjs` and the D: ledger are retired.
- **Backfill started 2026-11-03 ~18:15:** all 126 trip clips (China 24, Croatia 85, Singapore 17); log `engine/state/dropbox/backfill-2026-11-03.log`.
- **⚠️ For Denis:** `TotalVocal Skool/deke-media/` inside Deke's Dropbox holds 108 GB of duplicate trip clips our old pull process copied back into his Dropbox. Safe to delete (originals untouched); not deleted, waiting on Denis.
- Known older issue seen in the test: captions spell "ACAPELLA" as Whisper hears it.

## 🆕 2026-11-03 (evening): FOOTAGE PICK LIST FOR DEKE (pre-cut checkboxes)

- **Deke asked:** "Can you feed the footage I've sent you into this as well? The Too Many Notes that I've shot?"
- **Found the "5 Too Many Notes takes":** they are the 2025 season on his YouTube (filmed at Camp A Cappella): -zSnIm_XyKk Pioneer, 723-8K0DweA How Much Should We Charge, 5vYndnic4VM Remote Groups, J75D3PhzzL0 Rehearsal (already mined), _EmgIR2OnKo Big Bands. 4 of 5 never cut. Older 2014-2021 teaching videos are also Too Many Notes ("Questions from Too Many Notes viewers").
- **Cut list page (A + B, Denis's call):** https://claude.ai/artifact/6HWMgL31g1fcnoBfSHtrbW (source `engine/footage-picks/CUTLIST.html`, built by `python engine/footage-picks/build_cutlist.py engine/footage-picks/yt-channel-2026-11-03.jsonl`; publish with `url` + files map of `thumbs/`). A list (ticked, our plan): 4 unused TMN 2025 episodes, Sing Like A Trumpet, Creative Vocal Arranging in 4 Steps, More Women Than Men Sing Barbershop, China rain concert (DJI 0057-0061, thumb from 0058 poncho). B list (10 extras): Flute, Harmonica, So You Think You Can't Sing, Why Doesn't Everyone Sing, Arranging for Women's Voices, Maximizing Rehearsal Time, Directors Listen Up, Mic Technique, Annabelle Ye, Tom career. Answers in artifact db doc `picks/deke` = {skip, add, note, updatedAt}; fallback "Copy my list" button.
- **Rules from Denis (saved to memory feedback_client_pages.md):** never ask Deke on a client page for footage we couldn't find (it makes Denis look disorganised); give a decided A list + short B list, never the full catalogue. The 90-item catalogue version was removed.
- **Dropbox access:** Denis's account only. From Deke it holds just the shared "TotalVocal Skool" folder (China, Croatia, Singapore, card68 masters, arrangements, Sing-Off beds). Not Deke's whole Dropbox. Quick hits / music cut / Robert Plant footage are not in it, not in Drive, Gmail, local disks; no Dropbox shared links exist. Ask Denis, not Deke.
- **Next:** Denis shares the page with Deke as Editor. When answers arrive: queue A minus skips plus B adds into the engine (mine with MINE-PROMPT.md, render), then a contact sheet.

## 🆕 2026-11-03: NOV 9 WEEK SCHEDULED + WHATSAPP RECIPE (closed out)

- Denis: assume Deke accepts everything. **Scheduled:** week of Nov 9 (16 posts, `engine/batches/2026-11-09-deke-plan`) and tip 4 on Tue Nov 17 (4 posts, `engine/batches/2026-11-16-tip4`). Postiz holds 31 Deke posts through Nov 17. Denis posts the full 4-tips video in Skool by hand Mon Nov 9 (`C:\deke-media\engine\renders\wa-four-tips-full.mp4`).
- **Recipe (reproducible):** `engine/RECIPE-WHATSAPP.md` (Claude) and https://claude.ai/artifact/WESuEiob9vuT3aw6hB9Dg7 (Denis). Trigger "new Deke WhatsApp video"; inbox `C:\deke-media\inbox`. New scripts: `intake.py`, `plan_week.py` (plan/publish with Postiz confirmation), `verify_endings.py`. Saved to memory (project_whatsapp_recipe.md).
- Media root is now `deke/media` inside this project (moved from C:\deke-media at Denis's request; `/media/` in .gitignore and .railwayignore). Every engine script, the bank, manifests and the recipe point there; scripts fall back to `<repo>/media`. Inbox: `deke\media\inbox`. D: still needs Denis's repair decision.
- Deke page: https://claude.ai/artifact/RSoNaaDxHEHskSLiv76Hjg. Open question for Deke: are the Sing-Off beds cleared for social.

## 🆕 2026-11-01: GO-LIVE PREP FOR THE WEEK OF NOV 2 (contact sheet for Deke, nothing sent)

- **Denis:** "go live on the Deke queue" and send Deke a contact sheet he can improve today.
- **Week of Nov 2 = the 5 built Nov 9 pieces moved one week earlier** (engine priority picks exactly these): Mon text "Great on Tuesday, flat on Saturday" (FB, Threads; J75D3PhzzL0 8:50), Tue China Pingtan reel (IG/FB/YT/TikTok; Deke's phone footage; flagged for Deke's yes: shows other groups), Wed text one-day sings (LinkedIn, FB; NixffPanZ6s 23:47), Thu UK doctors reel (NixffPanZ6s 19:02), Sat music-career reel (NixffPanZ6s 2:37). 16 posts.
- **Contact sheet:** `engine/contact-sheets/2026-11-02.html`, private Artifact https://claude.ai/artifact/73qBXtNYj3ZKLYvNeNZcfU (republish there; Share it before sending to Deke). Stills, captions, sources, plus 10 swap-in candidates A to J (A-D rendered, E-I need a cut, J = "Creative Vocal Arranging in 4 Steps", 54K views, moment not picked). Generator: session scratchpad `build_sheet.py` (not kept in repo).
- **Read-only checks:** Postiz queue 0 posts next 21 days. ENGINE_REVIEW_SECRET is in `.env` but NOT on Railway (deke-production / service deke, 27 vars). "Deke Engine Review" task does not exist; Weekly still has the old Sunday trigger (now shows 6:00 after DST), Watchdog shows 7:30. So install-tasks.ps1 was not re-run.
- **Go-live steps (exact commands):** `engine/contact-sheets/GO-LIVE-2026-11-02.md`. Order: send sheet to Deke, run install-tasks.ps1, apply Deke's swaps, flip live, rename the vetoed `batches/2026-11-02` folder by hand (NOT `release`: it would un-veto the 5 vetoed items), `batch.py release 2026-11-09`, `batch.py plan 2026-11-02 --auto` before Mon 7 AM. Review deadline for this week is tonight 21:00 ET; the 21:00 Review task schedules it (silence = yes).
- **Gap:** after this week the bank has 0 text posts; Nov 9 will run short 2 text slots unless the miner adds text.
- **→ DENIS:** steps 1 to 5 of GO-LIVE-2026-11-02.md today.

## 🆕 2026-11-02 (later): THIS WEEK SCHEDULED + DEKE'S WHATSAPP "4 TIPS" VIDEO CUT FOR SKOOL PROMO

- Another session had sent Deke a Nov 2-7 plan (https://claude.ai/artifact/73qBXtNYj3ZKLYvNeNZcfU) with the same 5 pieces as the engine's Nov 9 batch; Deke approved it ("These are great!", one wording tweak). Denis said go: **16 posts scheduled in Postiz for Nov 2-7** from `engine/batches/2026-11-02-approved/manifest.json` (Mon FB moved to 2 PM, Threads noon). Engine Nov 9 batch marked superseded; those 5 bank items = scheduled. Lesson: two sessions planned the same week; always check `engine/batches` and Postiz before planning Deke content.
- Deke's WhatsApp video (`Deke-Whatsapp-message.mp4`, 1:45 vertical selfie, "Choir directors, do you have too much free time?", 4 rehearsal tips) copied to `D:/deke-media/engine/source/`, transcribed, cut into 4 reels (`wa-tip1..4`, 18-28 s, QA pass) + full 1:46 `wa-four-tips-full` (skool_only, never auto-planned). Renders in `D:/deke-media/engine/renders/`. Promo mechanic: full video posted only inside Total Vocal; each public tip caption ends "All four tips in one video, free inside Total Vocal: skool.com/deke". Note: Deke says "choir directors" in his own spoken hook; our copy says a cappella directors.
- Engine: new framing "native" (already-vertical sources), per-item maxSec, skool_only excluded from planning (commit after 9b6b16c).
- **Clipped endings fixed (Denis caught tip 1 cut short):** Whisper word end times run ~0.05-0.2 s early, so cuts clipped the last word ("it", "autopilot", "choir", "club", "backyard"). render.py now snaps each segment end to the quietest 20 ms just after the word (`snap_end`) and records `cut_segments`; verified by re-transcribing each render's last 3 s. Re-rendered all 4 WhatsApp tips + full, and UK doctors + career; the 8 scheduled Postiz posts for Thu Nov 5 and Sat Nov 7 were deleted and re-sent with the fixed files (16 posts total, verified). Nov 9 plan page republished with new preview links.
- **Captions fixed (Denis: "7 pm" captions broken):** render.py now transcribes each finished clip itself (punctuation, no outside words), joins Whisper fragments (7 p.m., warm-ups, t-shirts), drops fillers (uh/um), snaps cut starts and ends to silence without leaking into the next phrase, and writes `<id>-captions.jpg` (one frame per caption) for every render; template DekeShort.tsx shows the newest caption so short ones are not hidden (commit d613b31). Re-rendered 4 tips, full video, UK doctors (start moved to 1143.05 to drop "that"), career; replaced Thu Nov 5 + Sat Nov 7 Postiz posts again (16 posts total, 2 published Mon). China reel captions checked clean. Nov 9 page republished with new previews.
- **Nov 3, two more bad cuts caught by Denis (tip 1 after "time?", tip 3 last word):** quietest-point snapping landed inside words (dip between syllables of "rehear-sal"; "time?" really runs to 3.2 s though Whisper said 2.92). render.py now cuts at the first real silence (voice below room-noise threshold for 100 ms, plus 80 ms natural pause) and fails any render whose cut lands while the voice is in the upper half of his speaking level (commit 4c19fc6). Tips re-rendered (tip 1 hook ends 3.29, tip 3 ends 74.14), verified by transcribing each ending; Nov 9 page republished. This week's scheduled UK/career cuts unchanged under the new rule.
- **Nov 3, polish prototype (Denis: tasteful animation, a cappella bed, better ending):** `my-video/src/Polish.tsx` adds Kicker (small gold "REHEARSAL TIP 1 OF 4" label + hairline, gone by 3 s), MusicBed (HJ_Maliboom_BED1 Sing-Off bed at 0.05 under voice = speech loudness unchanged, swells to about -21 LUFS on the card, fades out), EndSplash (Total Vocal charcoal/gold card with Deke portrait, "ALL 4 TIPS / FREE INSIDE / TOTAL VOCAL", skool.com/deke) replacing the held frame + pill. Off by default; per item `polish`. Preview item `wa-tip1-polished-preview` (skool_only, never auto-planned): before https://uploads.postiz.com/AAzYEgTXyv.mp4 after https://uploads.postiz.com/K6hhZB0Si3.mp4. **Denis chose "apply everything now":** polish (kicker "REHEARSAL TIP n OF 4", Maliboom bed, Total Vocal card) is on all 4 tips (bank `polish` field), re-rendered on C:, frames checked, Nov 9 page republished (v5) with a line asking Deke to say if the Sing-Off beds are not cleared for social (Content ID risk). Full Skool video stays plain.
- **Nov 3: "That is the new standard" (Denis).** Saved to memory (feedback_deke_reel_standard.md). engine/config.json `reel_polish` now applies the Maliboom bed + Total Vocal closing card ("THE FREE COMMUNITY / FOR A CAPPELLA SINGERS / TOTAL VOCAL") to every reel by default; items override with their own `polish` (e.g. series kicker) or `polish:false`; skool_only stays plain. Contact sheet builder `engine/build_contact_sheet.py` (every caption, opening/middle/closing frames, cut points, loudness, checks). Tips contact sheet: https://claude.ai/artifact/KKo3meVfz9nom5FZH4wdvf
- **⚠️ D: drive (media, "Exports") dropped out mid-render on Nov 2 ~6:40 PM; Windows marks it "Full Repair Needed".** Renders now go to C:\deke-media\engine via env `DEKE_MEDIA=C:/deke-media` (bank media paths point there). The scheduled tasks still default to D:. Denis to decide on repair (chkdsk) and a backup.
- **Week of Nov 9 (Denis chose):** plan page for Deke https://claude.ai/artifact/RSoNaaDxHEHskSLiv76Hjg (source `engine/batches/2026-11-09-deke-plan/DEKE-WEEK.html`, built by `engine/build_deke_page.py`). Mon text record-the-last-take, Tue tip 1, Wed text learning-is-asymptotic, Thu tip 2, Sat tip 3 (16 posts, Postiz dry run OK, manifest `engine/batches/2026-11-09-deke-plan/manifest.json`, NOT scheduled). Tip 4 opens the week of Nov 16. Denis posts the full video in Skool Mon Nov 9 (wa-four-tips-full.mp4). Deke replies by Sun Nov 8 9 PM; then schedule with `node scripts/postiz-publish.mjs --manifest engine/batches/2026-11-09-deke-plan/manifest.json`.

## 🆕 2026-11-02: DRY RUN PASSED 11/11, ENGINE STILL OFF (waiting on Denis's "go live")

- Denis ran install-tasks.ps1: tasks Weekly (Sat 7:00), Review (9:00 + 21:00), Watchdog (8:30) registered; ENGINE_REVIEW_SECRET set on Railway (deploy 7e635fa3 SUCCESS).
- Dry run for week dry-2026-11-09: all 11 steps PASS. Denis answered on his phone (4 approve, 1 skip); finalize dropped the skip, 14 posts passed the Postiz dry run; 0 new Deke posts in Postiz, 0 emails to Deke.
- Deke saw the plan and replied: "These are great!" with one tweak: "emotional run around the piano" sounds athletic, use "emotionally powerful run through a song in rehearsal". Applied in bank.json, seed_rehearsal.py, the real Nov 9 manifest; saved as a standing rule in MINE-PROMPT.md.
- Real week 2026-11-09 sits in engine/batches as send_failed (china, uk-doctors, career, tuesday-emotion, one-day-choirs); while live=false it does nothing.

## 🆕 2026-10-31 (later): ENGINE IS OFF UNTIL A DRY RUN PASSES

- **Denis:** nothing goes to Deke until a head-to-toe dry run has passed and he has seen every step. Plan + dry-run scoreboard: https://claude.ai/artifact/JBDS8qE76TDvJhR9tytNNc (source `engine/ENGINE-OVERVIEW.html`, republish there).
- **Master switch `engine/config.json` "live": false.** While false: weekly.py and review.tick only log "paused", batch.publish refuses, every Deke-facing email goes to Denis tagged [NOT LIVE]/[DRY RUN], watchdog downgrades the empty-queue red to amber. Only Denis flips it ("go live").
- **Dry run:** `engine/dryrun.py` (11 steps, `list` / `step n` / `all [--answer approve-all|skip-first]`) and `engine/dryrun.ps1` (pauses before each step). Private workspace: bank-dry.json, batches-dry/, state-dry/ (env DEKE_ENGINE_DRY=1); site key `dry-<week>` with a DRY RUN banner (site commit 64e85ff, deployed SUCCESS). Report: `engine/state-dry/dryrun-report.json`.
- **Results 2026-10-31:** steps 0, 2, 3, 4 PASS; step 1 FAIL only because ENGINE_REVIEW_SECRET is not on Railway (Claude blocked from writing secrets); steps 5-10 wait on it. Dry run caught: re-mining a hand-mined video (fixed 344045e).
- Railway note: replaced deployments show as FAILED (SIGTERM on swap), not crashes.
- **→ DENIS:** run `engine/install-tasks.ps1` (safe while off), then `engine/dryrun.ps1` or say "continue the dry run"; at step 6 tap the buttons in the [DRY RUN] email; when all pass, say "go live".

## 🆕 2026-10-31: DEKE APPROVES EACH WEEK (replaces standing approval)

- **Decision (Denis):** weekly cycle. Saturday the engine builds next week and emails Deke a private review link; he taps Approve or Skip per post; Sunday 9 PM the engine schedules everything not skipped. **No answer = everything posts** (Denis's choice). Reminder to Deke Sunday ~7-9 AM. Skipped items are never offered again (bank status skipped_by_deke). `engine/config.json` approval_mode = "deke".
- **Site (live, commits 102535d + retry fix, Railway auto-deployed from GitHub push, SUCCESS):** page `/content-review/<week>?t=<token>` (noindex), API `POST/GET /api/content-review` (engine bearer `ENGINE_REVIEW_SECRET`), `POST /api/content-review/<week>` (Deke's token). Stored in AgentMemory (agentId content-review), no schema change. `origin` remote added = GitHub The-Agent-Factory/deke.
- **Engine:** `engine/review.py` (send / tick: remind, finalize, retry unsent), batch.py routes deke mode to review, weekly.py plans one week at a time, watchdog runs review.tick as catch-up. Previews uploaded to Postiz media (public URLs, verified streaming).
- **Week of Nov 9 is built** (China reel, UK doctors, music career, 2 text) and dry-run passed; status send_failed until the Railway secret exists.
- **→ DENIS: run `engine/install-tasks.ps1` again.** It moves Weekly to Saturday 7 AM, adds "Deke Engine Review" (9 AM + 9 PM), and sets ENGINE_REVIEW_SECRET on Railway (Claude was blocked from writing secrets). The next review check then emails Deke the Nov 9 link automatically. Tell Deke the email is coming.

## 🆕 2026-10-30: ENGINE REPAIRED, NOV 2 WEEK VETOED, CHINA REEL QUEUED

- Deke (WhatsApp Oct 30): frustrated his NEW footage sits unused (5 Too Many Notes takes, quick hits, a closely cut video with music, China). Likes the repurposed old videos and the Facebook text posts ("huge win"). Wants useful content, not daily small talk; success = engagement. Draft reply for Denis asks him to resend the backlog folder link.
- Both engine tasks are installed (Denis ran install-tasks.ps1). First Sunday run: Nov 1, 7:00.
- `engine/bank.json` was found zero-filled (laptop shut down mid-save Oct 27); watchdog crashed on it Oct 30. Rebuilt from `seed_rehearsal.py` + `state/mined-NixffPanZ6s.json` + renders; corrupt copy kept in `state/`. All engine writes now go through `common.safe_write_json` (fsync, validate, `.bak`).
- Nov 2 week: all 16 posts were removed from Postiz. Denis: on purpose, keep off. Batch marked vetoed; its 5 items are status vetoed (not reused automatically).
- China: card68 reel C added as `china-pingtan-judging-day`, priority 10, caption rebuilt from Deke's own words (the Oct caption line "every room has a sound waiting" was not his). Denis approved queuing it. Goes out in the Nov 9 week.
- Monday numbers promised to Deke: Skool members are tracked; per-post reactions/comments are NOT wired into the engine yet.

## 🆕 2026-10-27: DEKE CONTENT ENGINE (runs on its own once the tasks are installed)

Denis asked for a system that keeps Deke posting without him chasing it. Root cause of every dark spell (July, early Oct, Oct 26 on): each batch waited on a manual go. Proof posting works: Skool 215 → 302 members during the 2 weeks the Oct 19 batch ran (+4 in the dark week before).

- **Overview for Denis (republish to this URL):** https://claude.ai/artifact/JBDS8qE76TDvJhR9tytNNc (source `engine/ENGINE-OVERVIEW.html`).
- **Decision locked (Denis, 2026-10-27): STANDING APPROVAL.** `engine/config.json` approval_mode = standing. The weekly run schedules each week itself, 7+ days ahead, and emails the list. Denis vetoes by deleting a post in Postiz. needs_deke items (guest speaking, third party, minor, unconfirmed event) never auto-post.
- **Engine (`engine/`):** `bank.json` (clips + text, each with sourceNote), `render.py` (ffmpeg base + Whisper words + Remotion `EngineShort` comp in `my-video`, QA size/length/LUFS), `render_queue.py`, `batch.py plan|publish|release <monday>` (uses `scripts/postiz-publish.mjs`, channel ids pinned), `watchdog.py` (daily, Resend email when red, Monday summary, `state/status.json`), `weekly.py` (preflight → new YouTube uploads → refill bank to 6 weeks via headless `claude -p` + `MINE-PROMPT.md` + `add_items.py` validator → render → plan next 2 weeks → watchdog), `transcribe.py` (faster-whisper large-v3 local), `words.py`.
- Media: `D:/deke-media/engine/{yt,transcripts,bases,renders}`.
- **Scheduled:** week of Nov 2, 16 posts (3 rehearsal reels × IG/FB/YT/TikTok + 2 text × FB/Threads/LinkedIn), verified in Postiz. Fixed same day: 3 TikTok captions had #choirdirector, deleted and re-sent with #acappelladirector; validator now bans it.
- **2026-10-29 (card 182, Denis confirmed the Nov 2 week):** re-verified live in Postiz: all 16 posts in QUEUE on Deke's 6 channel ids (no X), 0 duplicate slots, 0 on other brands. Nothing re-sent. Proof: `jobs-1029/morning/card182/live.json`.
- **Bank:** 10 reels + 4 text (rehearsal video J75D3PhzzL0, interview NixffPanZ6s cropped to Deke's Zoom tile), 2 held event posts.
- **Blocked by this session's permissions (not worked around):** registering Windows tasks, launching headless `claude -p`. → **DENIS: run `engine/install-tasks.ps1` once** (Deke Engine Weekly, Sun 7:00; Deke Engine Watchdog, daily 8:30). The headless miner is untested until its first Sunday run; watchdog emails if it fails.
- **Waiting on Denis:** (1) link to Deke's backlog (5 Too Many Notes takes, quick hits, Robert Plant footage): not in Dropbox, Drive, Gmail or local disks, likely in WhatsApp. (2) times for Oct 29 rehearsal live and Nov 6 video-critique live, then flip `needs_deke` false on the two event items. (3) whether to fill Oct 28 to Nov 1 (nothing scheduled).
- Not done yet: China rain-concert "persistence" short and Robert Plant / Home Free style piece (Deke's asks); Skool posts stay manual.

## 🆕 2026-10-26: SOME VOICES PARTNERSHIP OUTREACH (draft in Gmail, Denis to send)

- Some Voices (somevoices.co.uk): non-audition contemporary choir, founder Laura Howe (London 2010), co-MD Curtis Stansfield, 2,500+ members, ~35 UK cities + Amsterdam, Berlin, Paris, Helsinki, Gouda. Contact sing@somevoices.co.uk.
- Denis chose "open chat first": short hello from Denis as Total Vocal community coordinator, floats 3 ideas (listing on dekesharon.com /find-group, a perk for Total Vocal members, sharing content) and asks for a 20-minute call. Gmail draft id `r2990882173519681193`, not sent.
- **Next:** Denis sends. If they reply yes, prep a call brief and add them to the Find a Group page.

## 🆕 2026-10-22: SKOOL 90-DAY PLAN (Hormozi Council run, Denis to review)

- Denis asked for a production schedule that does not babysit Deke and does not depend on Dropbox, plus coaching. Council winner: the Operator. Deke's only asks: 1 WhatsApp voice memo/week + 1 Riverside live/month. Floor = back catalogue + 3 admin-run rituals (Mon question, Wed "Postcard from Deke", Fri spotlight). Metric = members posting/commenting per week, target 25 by day 90. Kill the Postiz Skool cookie plan (ban risk on the owning account). Sell 10 founding "a cappella directors" seats at the first live before building a library.
- Deliverable: `total-vocal-skool/strategy/SKOOL-90-DAY-PLAN.html`, published as Artifact https://claude.ai/artifact/423xexSCvRwUjZbSDcBoKg (republish to this URL).
- **Next (Denis):** send the one-page agreement to Deke by WhatsApp, post the Monday question, then say "build the floor" for the first 2-week back-catalogue batch.
- **Update same day (Denis):** focus is the content machine only. $49 founding seats PARKED. Riverside DROPPED (cost), use VDO.Ninja. Evaluate moving the content hub into Brand OS; use Voicebox with Deke's cloned voice, gated on Deke's written consent + platform AI labels. Handoff for a claude_projects-level session: `total-vocal-skool/strategy/CONTENT-MACHINE-HANDOFF.md`.

## 🆕 2026-10-21: POST IN TOTAL VOCAL SKOOL AS DEKE, VIA POSTIZ (waiting on Deke's login)

- Postiz supports Skool through its Chrome extension, which copies the Skool session cookie (no official API). Postiz warns this may break Skool's terms and risk a ban, and Deke's account owns the group, so keep posting low and human-paced.
- Existing Skool channel `cmro2910e017dn60ype1i9ghx` is DENIS's account (Claude Academy customer). Not Deke.
- `scripts/postiz-publish.mjs` already supports `platform: "skool"` (optional `title`). No code change needed.
- Denis chose: Deke logs into skool.com in Denis's Chrome, then Postiz → Add Channel → Skool.
- **Blocker:** needs Deke's login (Deke present, or his password plus his OK).
- **Next after connect:** `--check` to confirm a "Deke Sharon" skool channel; add `skool` to the allowed scope; make sure the publisher picks Deke's skool channel, not Denis's (2 skool channels will exist); one test post with Denis's approval.

## 🆕 2026-10-18: "ROOM FOR EVERYONE" WITH THE UP WITH PEOPLE FEEL (local only, nothing shared)

Reference: "Room for Everyone (Voices by UWP)", Up With People, https://youtu.be/1oAafUvSUN4 (A major,
band, steady 99.4 BPM, 80 bars). Audio + Demucs stems + analysis in `musicxml-tracks/interp/`.
**Decisions locked (Denis):** Deke's form (48 bars, chart unchanged) with UWP's feel; new 4-bar groove
intro before bar 1 (Bass groove of bar 3, oo/hoo chords in intro bars 3-4); tempo 108 BPM (Deke 118, UWP 99).
- ACE working copy: `musicxml-tracks/job/ace-project/Room For Everyone UWP feel/Room For Everyone UWP feel/Room For Everyone UWP feel.acep`
  (yesterday's project untouched). UWP vocal stem kept there as a muted reference track.
- Method: ACE Vocal-to-MIDI on the Demucs vocal stem -> UWP lead syllables on the band's beat grid
  (+0.5 beat fix: tracker locked to the "ands"; chorus residual median 0 proves it) -> matched per
  section to Deke's melody relay by word + scale degree -> 16th/8th pushes copied (17 lead moves,
  42 harmony notes follow; vocables keep the pulse). Verses: UWP sings a different melody, kept Deke's.
  Dynamics from UWP's vocal loudness per section, melody part +0.15; breaths per part.
- Scripts: `scripts/uwp_feel.py`, `scripts/uwp_dynamics.py` (dry run by default). Plan + report: `interp/uwp-feel-plan.json`.
- Renders: `musicxml-tracks/exports-uwp-feel/` (mix + 13 learning tracks). First render (10:54) died at
  10:59:02 when the PC was restarted from the Start menu (System event 1074), not an ACE crash; project was
  saved 10:53 with all edits. IN FLIGHT: re-render started after the 2:25 PM boot, GPU free.
- **Engine bug 2 (not fixed in engine):** ACE 2.1 reports export "succeeded" before the file is on disk;
  `ace.py render()` checks at once and STOPs on an empty file. Workaround: `scripts/uwp_render.py` waits for
  the file size to settle, then runs the engine's own mix + tracks. Fix the same way in the engine.
- 14:46 render: GPU driver timeout (LiveKernelEvent 117, TDR) then ACE AppHang, with GPU-ClockCap active
  (ran 2:35 PM, result 0) and the GPU at 66 C idle. Retry IN FLIGHT with a 60 C cool-start gate before every
  file (`uwp_render.py cool_gate`). **DONE 14:53:** mix + 13 learning tracks rendered at 58-60 C, all 118.5 s,
  13 distinct files, none silent; Bass-missing starts at 4.1 s (groove intro check). Mix + 4 predominant
  tracks are on the explainer page as MP4 assets. Waiting on Denis's listen (tempo + intro feel).
- MP3s on Google Drive (rclone `gdrive:`, folder "Deke Room For Everyone UWP feel", anyone-with-link):
  mix https://drive.google.com/open?id=1pAvZI8gBmu-RglvAqz0wmu3wqsjMpiZ4 ,
  learning tracks folder https://drive.google.com/open?id=1gl7Xs9ukQIRjtOzGhHuiSJ2c8v6ieT3R .
  Dropbox refused (account over quota: 200 GB used of 9.25 GB). Artifacts refuse .mp3 assets.
  rclone warns its shared Google Drive client_id stops working during 2026: make our own client_id.
- Demucs cannot split a quartet into parts (one "vocals" stem). The pipeline does not need it: one solo lead take + the chart.
- Explainer page (for Denis's ACE learning-tracks video): https://claude.ai/artifact/Vn3yps3c4ZZ6ct5kxJZZDp
  (source `musicxml-tracks/interp/uwp-feel-explainer.html`; republish to the same URL).
- **Engine bug found (not fixed):** `ace.py cmd_match` keys pronunciation overrides by list index, but
  `phoneme list` omits "-" notes, so after `match` overrides land on the wrong notes. Fix: key by noteUuid.
- YouTube download needs WARP paused (bot check on the WARP IP); cookies from Chrome/Edge/Comet fail on Windows.

## 🆕 2026-10-17: "ROOM FOR EVERYONE" SATB SUNG TRACKS (local only, nothing shared)

Deke's World Singing Day 2026 arrangement (`musicxml-tracks/Room For Everyone SATB.mxl`) run
through PDF to Tracks from the MusicXML (no OMR): repeats unrolled 41 -> 48 bars, 118 bpm.
`musicxml-tracks/parts/` = 4 part MusicXML; `musicxml-tracks/exports/` = dry WAV + MP3 per part
plus full mix (light mix). ACE voices: Soprano Ember Rose, Alto Lien, Tenor Drex L, Bass Laolu.
ACE project: `musicxml-tracks/job/ace-project/Room For Everyone/`. Open item for Deke: Bass
bar 30 holds only one beat in his file (see `musicxml-tracks/job/note-check.md`).
Helper scripts: `scripts/musicxml_to_t2t_job.py`, `patch_t2t_part_lyrics.py`, `ace_fix_pronunciation.py`.

## 🆕 2026-10-17: INDIVIDUAL COACHING NOW $250/HR, VIRTUAL ONLY (live, commit `647f215`)

Denis's call: Deke's one-on-one rate goes from $200 to $250/hr, online only.
Changed in 5 files: booking card (`src/app/booking/page.tsx`), new badge on
`/coaching` individual section, site chat bot prompt (`src/app/api/chat/route.ts`),
Harmony and Conductor agent prompts. Group coaching untouched (still in-person or
virtual, $2,000+). Pushed to GitLab + GitHub, Railway deploy `a118d36f` SUCCESS,
verified on dekesharon.com: `/coaching` shows the badge, `/booking` bundle carries
"$250/hr, online", zero `$200/hr` left. Not changed: old strategy docs
(`docs/`, `public/skool/deke-skool-strategy.html`) still cite "$200-500/hr" as history.

## 🆕 2026-10-15: CARD 68, CHINA SORTED, 4 REELS RENDERED, DRY RUN PASS (nothing posted)

Brief 06, run on OMEN. Full report: `card68/deliverables/06-china-sort-renders.md`.
- China folder (24 originals) viewed: main 1 (DJI_0048 Deke selfie), b-roll 12, skip 11. DJI_0061 dropped (identifiable child on the bus), DJI_0060 with it.
- Reel C IN as a gated render (needs_deke true: names Pingtan and the festival, shows 3 groups, cuts his "very young acapella" line). F1 holds Sat Oct 24 unless Deke OKs by Thu Oct 22 12:00 ET.
- Renders in `card68/renders/` (reel-a, reel-b, reel-c, f1), 1080x1920 H.264/AAC 30 fps faststart. A cropped to avoid inset photos, B dropped the truck b-roll, so both are Deke-only.
- A/B sources re-downloaded from Deke's YouTube (old mkv files gone). F1 source is `RESOLVE EDIT KIT/WARMUPS - body clean 4K (C).mov` (the job's DJI_0021 path is stale).
- Dry run: `card68/dryrun/build_and_validate.py` (no network code), 16 payloads + 4 held, 0 errors. Do NOT use `postiz-publish.mjs --dry-run` under a no-API rule: it calls GET /integrations.
- Blocked on: box publishing the renders (public URLs), Denis on YouTube-sourced cuts, Deke on Reel C, then "post it".

## 🆕 2026-09-09 — DAILY CONTENT ROUTINE + AUTOPILOT WAS DEAD FOR A MONTH

Denis asked for a daily routine that (a) looks at what Deke drops in Dropbox and
(b) mines his popular YouTube back catalogue for Shorts, then drafts posts.

**Found first — the existing autopilot has been failing silently since ~2026-08-07.**
`DekeDropboxAutopilot` is registered and "Ready", but every run exits 1. Cause: the
media tier was moved to `D:\deke-media` and **the D: drive is not mounted**. Two bugs
turned that into a silent failure:
1. `writeFileSync(LOCK, ...)` ran BEFORE the try block, so the crash never reached the
   fail-loud email handler.
2. `main()` was called bare with no `.catch()`, so a pre-try throw died as a stack trace
   to nobody.
Also `log()` itself appends to the missing drive, which would re-throw while reporting.

**Fixed (`scripts/dropbox-autopilot.mjs`):** explicit media-drive check first with a
readable message, `mkdirSync` for the footage dir, `log()` append wrapped in try/catch,
and `main().catch()` that emails + exits 1. **Verified:** now prints
"FATAL: Media drive D:/ is not mounted ... nothing is lost" and emails, exit 1.

**Cost of the outage:** Deke dropped a **China folder on 2026-09-02 — 24 videos,
14.5 GB** that has never been pulled, probed, or transcribed. Nothing was lost (it is
all still in Dropbox) but it sat a week unnoticed. ⚠️ **C: has only ~15.9 GB free and the
drop is 14.5 GB** — plugging D: back in is the right fix, not staging onto C:.

**New: `scripts/deke-daily.ps1`** — one daily pass, drafts only, never publishes.
- **Preflight first** (per CLAUDE.md): rclone + `dropbox:` remote, media drive mounted,
  `claude` CLI on PATH, free-space warning under 20 GB. Fails loud with the real reason
  and pulls/cuts nothing. `-DryRun` tests exactly this.
- **Source A:** reuses `dropbox-autopilot.mjs` (owns the ledger; not reimplemented).
- **Source B:** headless `claude -p` → vidIQ MCP for top performers on
  `UCTuZ5LxQIjLK-CJBy0onT_Q`, transcript → exact Short timestamps, drafts Skool post +
  caption, runs stop-slop, plus ONE community discussion prompt (the weekly-ritual seed).
- **A failing does NOT abort B** — the back catalogue is what feeds the community on a
  day Deke drops nothing. Exits 1 if either half failed so Task Scheduler shows red.
- Output: `reports/daily/<date>.md`. Hard rules in the prompt: no publishing, no invented
  quotes/metrics, "a cappella directors" never "choir directors", no em dashes.

**→ DENIS: 2 things to switch it on.**
1. **Plug the D: drive back in.** Until then the Dropbox half cannot run at all.
2. Register the task (Claude is permission-blocked from `schtasks`):
   `schtasks /create /tn "DekeDaily" /tr "pwsh.exe -NoProfile -ExecutionPolicy Bypass -File C:\Users\lafla\claude_projects\deke\scripts\deke-daily.ps1" /sc daily /st 08:20 /f`
   then the battery fix:
   `Set-ScheduledTask -TaskName "DekeDaily" -Settings (New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries)`

**Skool baseline (from the daily `Deke Skool Pulse` scrape, healthy):** 2026-08-14 =
76 members / 30 posts → 2026-09-08 = **101 members / 52 posts**. Membership grew but
posting is ~0.5 posts per member lifetime, and growth flatlined at 100 from 09-03 to
09-08. Confirms Denis's read: the group is filling up but not talking.

**Still true and still unfixed:** the three fabricated testimonials on `/total-vocal`
(`src/components/total-vocal/tv-testimonials.tsx`). Denis confirmed 2026-09-09 there are
**zero real member quotes**, so these cannot be swapped for real ones — they need to come
down and be replaced with verifiable proof.

## 🆕 2026-09-07 — TOTAL VOCAL IS FREE + BIO IMAGE FIXED (live, commit `0d9359a`)

Denis caught two things shipping live on `/total-vocal`.

**1. The page was advertising a price for a free community.** The join card
rendered the literal placeholder `$XX /month` with the caption "Editable
placeholder — may be free", and the FAQ answer told visitors to "edit this
placeholder to reflect your real plan". **Total Vocal is FREE — no charge, no
card, no subscription.** Denis: "There may be, at some point, some upsell, but
for now, there is no charge." Join card now reads "Free / to join — No card, no
subscription. Just show up and sing." FAQ answers plainly.

**2. The About section image was a slice of the Skool banner.** It used
`deke-portrait.webp`, which is the Skool community thumbnail with "TOTAL VOCAL
/ ALL THINGS A CAPPELLA" text baked in; the 4:5 crop showed a fragment of that
banner. Replaced with a real bio portrait cropped from `biotop.jpg`
(`deke-bio-portrait.webp`), photographer credit (Nina Westervelt) added as a
visible caption since it fell outside the crop.

**Verified live on dekesharon.com:** no `$XX`, no placeholder wording anywhere,
free messaging present, old banner image gone, new portrait serves 200 (94KB),
credit renders. Hero image and all five UTM placements still intact.

**⚠️ STILL OUTSTANDING — FABRICATED TESTIMONIALS ARE LIVE.**
`src/components/total-vocal/tv-testimonials.tsx` carries three invented member
quotes with invented names ("Maya R.", "Jordan T.", "Andre C.") and a
fabricated competition result ("We placed at ICCA semis that spring"). These
are presented as real member testimonials. Flagged to Denis 2026-09-07, NOT
fixed (needs real quotes or removal — Claude cannot invent them). The file
carries a TODO. **This is a credibility risk on a live client page.**

**Also still open:** directors tier not discussed with Deke yet; lead-capture
path for not-ready-to-buy visitors proposed but not built; unreferenced fake
images (`hero.jpeg`, `deke.jpeg`, `hero-performance.webp`, `deke-portrait.webp`)
safe to delete.

## 🆕 2026-09-06 — TOTAL VOCAL WIRED INTO THE SITE (live, commit `663fb85`)

Deke asked whether we could have a Total Vocal Skool page. We already had one:
`/total-vocal` was fully built (hero, promise, what's inside, testimonials, FAQ,
join). **The problem was discoverability, not existence.** It was missing from
the main nav and footer, and the homepage never mentioned it. The only header
and footer references to it were checks that HIDE the chrome once you are
already on the page, so nothing on the site pointed at it.

**Shipped:**
- Total Vocal in the main nav (after Coaching) and in the footer resources
  group. Nav links set to `whitespace-nowrap` with tighter padding: nine items
  at 1440px was wrapping "Total Vocal" and "Find a Group" onto two lines.
- Homepage banner above the services section ("Can't book Deke in person?"),
  following the existing PP2 diary banner pattern.
- Cross-link section on `/coaching` and `/workshops` for the near-miss visitor
  who cannot book Deke in person but is exactly the Total Vocal member.
  Reusable component: `src/components/total-vocal-crosslink.tsx`.
- **Hero image replaced.** The old one was an AI-generated stock group with
  "TOTAL VOCAL" text baked in, cropped badly into a 4:5 portrait slot ("fake
  bandits, super ugly" per Denis). Now a real photo of Deke conducting,
  cropped to 4:5 from `deke_directs.jpg`.
- "Watch the intro" now points at the real intro video Denis supplied
  (`youtube.com/watch?v=99p9_FIOIEo&t=1s`) instead of Skool, clearing the TODO.
- All five Skool CTAs route through `skoolUrl()` (`src/lib/skool-url.ts`) so
  each placement carries a `utm_content` tag: `tv_hero`, `tv_nav`, `tv_join`,
  `tv_final_cta`, `tv_footer`.

**Verified live on dekesharon.com** (curl against production): homepage carries
3 `/total-vocal` links + banner copy, `/total-vocal` serves the new hero image
(200, 44KB) and all five UTM placements, `/coaching` and `/workshops` each
carry the cross-link. Railway auto-deployed from the GitHub push; deployment
moved `4dc118ad` → `33da0ef3`, service Online.

**Note:** pushed to BOTH remotes this time — GitLab `origin` (canonical) and
GitHub `github` (mirror). The `git push github` block noted on 2026-09-03 did
not apply.

**Open / not done:**
- Deke has NOT been consulted about the "a cappella directors" premium tier
  yet. Denis explicitly deferred it ("we haven't talked about directors yet"),
  so no directors language went into the page. Revisit copy when that tier is
  decided.
- Lead-capture path for visitors not ready to buy (offer something free, sell
  the community over email) was proposed but NOT built.
- Old fake images `public/images/total-vocal/hero.jpeg`, `deke.jpeg` and
  `hero-performance.webp` are now unreferenced. Left in place, safe to delete.

## 🆕 2026-09-03 — DEPLOYED TO PRODUCTION (dekesharon.com)

Denis ran `railway up --service deke` (Claude is permission-blocked from both
`railway up` and `git push github`). Deployment `0d1328bc` = SUCCESS 21:23 UTC.

**Verified live on dekesharon.com (browser, logged in as Denis):** board loads,
22 cards, Coming Up rail shows real bookings, and all five card controls render
(Due / Who has it / Add a note / Email this to someone / priority). New API
routes return 401 not 404, i.e. deployed and guarded.

**⚠️ FOUND IN PRODUCTION + FIXED (commit `53fae2d`):** React error #418, a
hydration mismatch the earlier locale fix did not cover. `isOverdue` and
`daysUntil` built "today" with `setHours(0,0,0,0)` = midnight in the MACHINE's
zone, so a UTC Railway container and a Toronto browser disagreed about the day
and the "12 days" badge differed between server and client. Both now derive a
calendar day number from the pinned zone via `Intl.DateTimeFormat`. Verified
zero hydration errors against a production build from browsers in UTC and
Australia/Sydney; countdowns still match (12/13 days, and a 00:30 UTC event
correctly reads as the previous Toronto day — relevant since several Ontario
tour dates are stored at 23:30/00:00 UTC).
Header copy also corrected: it still invited texting/emailing work in.

**→ NEEDS ONE MORE DEPLOY** for `53fae2d` to reach the live site.
**→ GitHub mirror still owed:** `git push github main` (blocked for Claude).

## 🆕 2026-09-03 (later) — CARDS: DUE DATES, NOTES, EMAIL HANDOFF

Denis's asks: due dates, writable notes, and "send the task to someone by email
/ label who's responsible". All three shipped. Commit `dadd4a4`.

- **Due date + priority editable inline** on the expanded card.
- **Owner is now FREE TEXT**, not a Denis/Deke enum — real work waits on venue
  contacts, guests, organisers. Names already on the board become datalist
  suggestions. Validation centralised in NEW `src/lib/activity-fields.ts`
  (`canonicalizeOwner` folds "denis" → "Denis", caps at 60 chars, strips
  newlines) and consumed by both activity routes + the triage agent's constants.
- **Notes writable:** NEW `POST/GET /api/activities/[id]/notes`. Full timeline
  shown newest-first; agent intake notes and hand-typed notes are one history.
- **Email handoff:** NEW `POST /api/activities/[id]/email` via Resend (from
  `deke@dekesharon.com`, replyTo = logged-in user). Refuses without
  `confirm: true`, validates the address, fails loudly (503) if Resend is
  unconfigured rather than silently no-op'ing, and writes the send (or the
  failure) to the card timeline.
- **BUG FIXED (pre-existing):** hydration mismatch — the board used
  `toLocaleDateString(undefined, …)`, which resolves to the SERVER locale in SSR
  and the BROWSER locale on hydration, so React discarded and re-rendered the
  whole tree ("1 Issue" badge). Dates now pinned to `en-CA` /
  `America/Toronto`. Console is clean.
- **Layout fixes found only by screenshot:** date input was clipped to "2026-1"
  in the narrow column (2-up grid → stacked); note Save button overflowed the
  card (`min-w-0` + `shrink-0`).

**Verified (run, not claimed):** due date + owner "Tawnya" (outside the old enum)
persisted; note created with correct author; empty note → 400; email without
confirm → refused; bad address → refused; REAL send succeeded (Resend id
`9a8bf11d…`) and logged to the timeline; unicode round-trip exact for
`— Renée Šuto 你好` (the earlier mangling was the test shell, not the app);
Playwright confirmed all 5 controls render and Send stays disabled until an
address is typed; tsc clean; test rows deleted (Activity back to its real set).

## 🆕 2026-09-03 — COMMAND CENTER: MESSAGING INTAKE SUSPENDED, CHAT INTAKE LIVE

Denis's call: "suspend the input through WhatsApp and simply have chat input
possible on the backend." Done, without deleting any messaging plumbing.

**What changed:**
- `src/lib/triage/intake.ts` — `isAllowedSender()` returns false unless
  `COMMAND_INTAKE_ENABLED === 'true'`. ONE gate for every inbound channel, so
  re-enabling is a single env var. Fails closed.
- `src/app/api/activities/route.ts` — POST accepts `smart: true`, which runs the
  typed sentence through `classifyMessage()` (the same agent the webhook used)
  and stores sorted title/kind/owner/priority/dueAt plus an `intake` note with the
  raw wording. Falls back to raw text if the model is down — a typed card is never
  lost. Explicit-field callers (edit form) unaffected.
- `command-client.tsx` — composer sends `smart: true`; WhatsApp promise in the hint
  replaced with "Type it the way you would say it."
- `triage-message.ts` — owner rule tightened. It assigned "send the Kingston
  contract" to Deke; gig admin/logistics now route to Denis. Re-tested, correct.
- `.env.example` + `COMMAND-CENTER-SETUP.{md,html}` — documented; the guide's two
  WhatsApp steps became a "Turning messaging back on" section.

**Verified live (run, not claimed):** triage on 3 typed sentences correct
("before Friday" → 2026-09-04; refused to invent a date for "the afternoon before
the River Run show"); full create path against deke-production, test card deleted
after; gate rejects whatsapp:/phone/email with flag unset; unsigned Twilio POST →
403 with 0 InboundMessage rows; unauthenticated POST → 401; tsc clean on changed
files; prisma validate passes.

**Board state:** 23 activities (TODAY 12, WAITING 10, DOING 1), 24 notes.

**Still open:** skill runner is optional, needs the one-time `schtasks` step for
the "Do it for me" buttons to execute.

## 🆕 2026-09-02 — COMMAND CENTER BUILT (Jarvis activity management)

**What Denis asked for:** a management system for Deke's time and activities where he
can send a WhatsApp / text / email and an agent turns it into work, with a master
dashboard simple enough for a non-technical client, driven by a visual Kanban whose
cards fire the existing skills.

**Built and verified this session (all inside the `deke` Next.js app):**

- **Schema** (`prisma/schema.prisma`, pushed to Supabase `jlxstrcjhjsoybacowiy`) — 4 new
  models, additive only, Strings-not-enums per house style:
  `Activity` (the card: lane / kind / owner / priority / dueAt / source + soft links to
  Booking, Inquiry, Lead), `ActivityNote` (append-only timeline), `InboundMessage`
  (raw intake, `externalId` unique = webhook-retry idempotency), `SkillJob` (the queue).
- **Board** `/dashboard/command` — `page.tsx` (server) + `command-client.tsx`.
  Five lanes in plain language (New / Today / In progress / Waiting / Done), native
  HTML5 drag-and-drop lifted from the Skool board, optimistic moves that revert loudly
  on failure, per-card "Do it for me" action buttons, and a **Coming Up rail that reads
  the real Booking rows** so the board can never drift from the calendar.
  Added to the sidebar as COMMAND with an unread-INBOX badge.
- **Intake:**
  - `api/webhooks/twilio/route.ts` EXTENDED — same route now serves **WhatsApp and SMS**
    (Twilio prefixes WhatsApp addresses with `whatsapp:`). **Signature verification
    implemented** (was a TODO); allow-listed senders create cards and get a reply,
    everyone else keeps the old campaign-reply behaviour untouched.
  - `api/webhooks/inbound-email/route.ts` NEW — shared-secret POST.
  - `src/lib/triage/triage-message.ts` — Haiku turns free text into
    {title, kind, owner, dueAt, priority}. **Never swallows a message:** any failure
    still creates a raw INBOX card and records why.
  - `src/lib/triage/intake.ts` — persist-first-interpret-second, fail-closed allow-list.
- **Actions:** `src/lib/skills/catalog.ts` (6 skills, plain-language labels, `danger` flag),
  `api/activities` + `[id]`, `api/jobs`, `api/jobs/claim`, `api/jobs/[id]/complete`.
  Claim/complete are guarded by `Bearer ${CRON_SECRET}`, same as the existing cron routes.
  **postiz-publish requires an explicit confirm** or the API refuses it (409).
- **Runner** `scripts/skill-runner.ps1` — Railway cannot reach the laptop, so the laptop
  **pulls**: poll claim → headless `claude -p` → report DONE/FAILED + log tail.
  Modelled on `postiz/run-social-ops.ps1`. Stale CLAIMED/RUNNING jobs older than 1h are
  auto-requeued so a dead runner cannot strand work.
- **Seed** `scripts/seed-command-center.ts` — idempotent, **23 real cards** loaded from the
  existing backlog (Tom + Alan uploads, October tour prep, Ottawa venue/outreach/songs,
  AcaTex, newsletter, directors tier, X re-auth, growth-brief fix, and the 3 open
  questions for Deke). Re-running updates instead of duplicating and never yanks a card
  out of a lane a human moved it to.
- **Also fixed along the way:** `src/lib/anthropic.ts` — the shared client that was missing
  (two files each instantiated their own and hardcoded a model id, which is how a retired
  model survived in two places).

**→ DENIS: 3 things to switch it on.**
1. Put Deke's phone number in `COMMAND_INTAKE_SENDERS` in `.env` (comma-separated;
   matched on the last 10 digits). **Empty = intake rejects everyone, by design.**
   I do not have his number, so WhatsApp intake is built but dormant.
2. Join the Twilio WhatsApp sandbox and point its inbound webhook at
   `https://<app>/api/webhooks/twilio`. Set `TWILIO_WEBHOOK_URL` if behind a proxy.
3. Register the runner (Claude is permission-blocked from `schtasks`) — command is in the
   header of `scripts/skill-runner.ps1`, **including the battery/sleep
   `Set-ScheduledTask` fix** that silently skipped 5 of 9 runs on the other tasks.

**Note before deploying:** local `deke/` was 42 commits behind GitLab per DEPLOYMENTS.md.
`git pull` before pushing. Nothing was committed or deployed this session.

## 🆕 2026-08-28 — SOCIAL AUDIT + SKOOL ABOUT-PAGE REBUILD KIT (Denis approved "ok")

**Audit findings (Denis asked "what's going on on the social front?"):**
- YouTube refactor lane NEVER started: 4 recuts built in July (rehearsal, competition, arranging, electric guitar),
  0 uploaded, 0 scheduled. `Downloads\deke-pipeline-test\` packages are gone; electric-guitar-branded.mp4 (213 MB)
  + its short survive in `deke-video-pipeline\deke-brand\out\`; other 3 re-renderable from `deke-video-pipeline\jobs\`.
- Deke socials dark since Aug 17 (last video: Patti 8/13, beatboxer 8/16-17). Queue since 8/21 = 15 text-only
  social-ops DRAFTs (FB 6, LinkedIn 5, Threads 4), unapproved. Deke X channel is DISABLED in Postiz (3 errors 8/10-13).
- YouTube IS connected in Postiz ("Deke Sharon" cms1yf65v0fykrv0y63g13rht). Postiz caps video at 30fps; our long
  renders are 60fps → re-encode needed before scheduling.
- Skool: 76→79 in 14 days (local `growth/data/skool.jsonl`), 36 posts, 2 admins. Cloud "Deke Growth Daily" brief
  has been BLIND 14 days (skool.com blocked in sandbox; reports "76 baseline" daily). Link leaks: YouTube channel
  links only dekesharon.com; dekesharon.com has no Skool link; IG bio unverified.
- Gap analysis for a hands-off refactor system given to Denis: picker → headless `claude -p` runner (local GPU,
  Task Scheduler) → shorts → manifest generator (30fps, title, tags) → Postiz drafts as the approval gate → watchdog.
  Recommended order: (1) manifest generator + YouTube-via-Postiz proven on Electric Guitar, (2) picker/runner,
  (3) graduate drafts → auto-schedule after 3 clean runs. **Awaiting Denis's go on phase 1.**

**SHIPPED: About-page rebuild kit** `total-vocal-skool/about-page-2026-08-28/` (Denis said "ok" to item 1 of the growth fix):
- `REVIEW.html` (browser review page, copy buttons) + `ABOUT-PAGE-KIT.md` (same, paste-ready)
- `about-video-door-75s.mp4` + `.srt`: 76s cut of the 3:00 About video (face frame 1, 6 segments at whisper
  boundaries, alternating punch-ins, gold captions, Maliboom bed under the close, Total Vocal JOIN splash, −15.9 LUFS).
  Builder: `work/build_about_door.py` (ffmpeg needs `setsar=1` after crop/scale or concat fails; ASS path relative + cwd).
- `gallery/03..07` 1920×1080 tiles/photos (143 tile, warm-ups tile, Rebel Wilson, Deke directing, Screen Tales);
  slots 8-9 (classroom + community screenshots) need Denis inside Skool. Tile renderer: `work/render_tile.py` + `tile.html`.
- Copy: description (3 surgical CRO edits applied, no $/tier language), 3 benefit lines, display names, membership
  question, pinned welcome post, same-day link-leak checklist.
- **Fact checks:** 143 arrangements verified (Deke's transcript). "40 warm-ups" NOT verified (Hal Leonard: "over 39
  creative exercises"; Deke: "a whole bunch") → kit prints no number, ALT-04 "40" tile ready if Deke confirms.
  J.D. Frizzell spelling verified. "Father of contemporary a cappella" / Entertainment Weekly verified on dekesharon.com.
- **POSTED 2026-08-28 (Denis: "post it"):** both welcome videos scheduled to YouTube via Postiz as UNLISTED
  (manifest `about-page-2026-08-28/publish-manifest-youtube-unlisted.json`): door 75s → post cmtd96z8d09boo10y3zewmbcj
  (20:30 UTC), full 3:00 Welcome.mp4 → cmtd98vhs09c9o10yjxmp71fu (20:35 UTC). Fetch YouTube URLs after they fire →
  paste into Skool gallery slots 1-2. Caveat: unverified whether Postiz honors `settings.type=unlisted`.
- **LEAK FOUND:** IG bio → linktr.ee/dekesharon has NO Skool link (9 links, none to skool.com/deke). Deke must add it.
  dekesharon.com is not our site; YouTube channel links + pinned comment need Deke's logins. 0 of 4 fixes doable here.
- **CANCELLED 2026-08-28 (later):** Denis had already uploaded the welcome video + linked it in Skool himself, so the
  two Postiz unlisted YouTube posts were DELETED (200) before firing; manifest marked cancelled; watcher stopped.
- **✅ ELECTRIC GUITAR SKOOL-BUMP PACKAGE BUILT** `total-vocal-skool/refactors-2026-08/electric-guitar/`:
  `electric-guitar-refactor-SKOOL-BUMP-16x9.mp4` (4:14, Too Many Notes outro → Total Vocal JOIN card, −13.9 LUFS)
  + `electric-guitar-short-SKOOL-BUMP-9x16.mp4` (35.7s, blur-fill JOIN card, −16 LUFS). Manifest
  `publish-manifest-electric-guitar.json` = 5 posts Sat Aug 29 (YT long 14:00 UTC public, IG+FB 15:00, YT Short 16:00,
  TikTok 18:00), chapters verified against final-timed captions.srt, **POSTED 8/28 (Denis: "post it"): 5/5 scheduled** — YT long cmtda2c0h09htrw0y7f2hejf9 (first try failed 400:
  Postiz wants YouTube `tags` as objects, not strings → publisher passes item.tags raw; dropped tags, resent OK),
  IG cmtd9zc8j09gwrw0ywnlmbx3h, FB cmtd9zca609gxrw0y14hcx3dn, YT Short cmtd9ze0e09ipo10ytuyaf2vy, TikTok cmtd9zfrl09gzrw0y2c1lzufg.
  TODO publisher: map youtube tags to Postiz's object shape.
  Next refactors (re-render from `deke-video-pipeline/jobs/`): rehearsal-v2, competition, arranging.
- **INTERVIEWS NOT ON CHANNEL (corrected 8/29): Tom Kerley + Alan.** Channel check: "Can You Make a Living in Music?"
  (Aug 4, ygvw_tXEtvY) IS the Annabelle interview (I had mislabeled it as Tom on 8/28). Upload page rebuilt for Tom + Alan:
  `total-vocal-skool/UPLOAD-NOW-TOM-ALAN.html`. Duplicate Annabelle copy deleted; her branded master stays at
  `deke-brand/out/annabelle-branded-v2.mp4` (+ shifted SRT left in 05-deliverables/video).
- **YouTube-via-Postiz PROVEN 8/29:** Electric Guitar long-form went live on schedule ("How to Sing Like an Electric Guitar
  (Violin, Theremin and Kazoo Too)", public). Denis's own welcome upload uses the 75s door cut ("welcome to Total Vocal Skool community").
- **→ DENIS:** open REVIEW.html, paste into Skool (~20 min), upload the 2 videos unlisted to YouTube for the gallery,
  take the 2 screenshots, do the 4 link fixes. Then say "build phase 1" for the refactor → Postiz → YouTube path.

## 🆕 2026-08-12 — PATTI PACK IS LIVE IN POSTIZ (6/6 scheduled, Thu Aug 13)

- **Denis approved v4 → promoted to `patti-labelle-sing-it-again-reel-FINAL-vertical.mp4`**
  (113s, −17.0 LUFS) and **published to Postiz: 6/6 scheduled, 0 errors** (dry-run gate passed
  first). Post IDs written back into
  `total-vocal-skool/patti-2026-08-11/deliverables/publish-manifest-patti.json` (double-post
  guard armed). Schedule (UTC): LinkedIn 13:00, IG+FB 14:00, Threads 16:00, X 17:00,
  TikTok 18:00 — all Thu Aug 13, deliberately clear of the Wed AMA day-of wave and the
  Aug 16–17 beatboxer pack. **TikTok caveat:** if Monday's failed TikTok publish was an
  integration/auth problem, this item hits the same wall Thu 2 PM ET — check Postiz dashboard;
  the Mon+Thu watchdog digest lands Thu morning as backup.
- ⚠️ Copyright note (accepted risk, Denis's call): reel contains ~35s of Patti LaBelle's live
  performance + the Maliboom bed; platforms may Content-ID-match the concert audio.

## 🆕 2026-08-11 — AMA EVE CATCH-UP + PATTI LABELLE REEL DRAFTED

- **AMA (Wed 8/12, 5 PM PT / 8 PM ET, open-to-all Skool webcast):** Wave 1 announce posts
  (IG/FB/LinkedIn/Threads/X) published Mon 8/10 via Postiz — IG announce at 37 likes by 8/11 AM.
  Wave 2 day-of posts are scheduled server-side (IG+FB 10 AM ET, Threads noon, X 6 PM ET).
  Pack: `total-vocal-skool/ama-2026-08-12/` (COPY-MASTER.md + publish-manifest-ama.json, 9 posts).
  **Still manual/unverified:** Skool calendar event + pinned community post + day-of IG Story
  (`work/ama-card-916.png`); **giveaway line still HELD** — Deke never confirmed book vs coaching.
- **⚠️ TIKTOK PUBLISH LIKELY FAILED:** CROappella reel was scheduled Mon 8/10 2 PM ET but the
  8/11 8:07 AM channel scrape still shows only the 2 July posts on TikTok. Check Postiz
  dashboard / re-auth before the Aug 16 beatboxer TikTok item hits the same wall.
- **CROappella drip otherwise healthy:** IG Zadar reel live 8/10, 1,530 views / 38 likes;
  IG followers 13,764→13,768 overnight. Beatboxer pack (5 posts, Aug 16–17) confirmed
  scheduled in Postiz with post IDs.
- **Tom + Alan interviews STILL NOT UPLOADED** (kit: `total-vocal-skool/UPLOAD-INTERVIEWS-TOM-ALAN.md`;
  no URLs pasted back, channel scrape shows nothing new since 8/4). Step-by-step walkthrough
  given to Denis 8/11. On URLs → fill Skool post placeholders.
- **🎤 NEW: Patti LaBelle reel** — Denis dropped `total-vocal-skool/pattisinging.mp4` (95s phone
  footage, Patti performing, Stern Grove Festival SF, ends on IG QR code) +
  `singitpatti.mp4` (62s Deke selfie story). **Name VERIFIED from Deke's own audio:
  Patti LaBelle** ("Paddy Devel" was dictation garble; Deke says 82 y/o, third row, high C).
  **DRAFT BUILT + QC'd:** `total-vocal-skool/patti-2026-08-11/deliverables/
  patti-labelle-sing-it-again-reel-DRAFT-vertical.mp4` — 89.5s, 1080×1920 @30fps, −17.5 LUFS,
  structure per Denis: Deke intro (0:01–0:20) → Patti belt (perf 12–21s) → Deke takeaway ending
  "Sing it again, Patti" → Patti finale (perf 53.5–74s, climax + arms-out finish, QR trimmed).
  Boundary frames QC'd clean. Transcripts: `patti-2026-08-11/transcripts/`.
  **AWAITING DENIS:** cut approval → then burned gold captions pass (caption fixes needed:
  whisper heard "Dick here"→Deke, "Tony Begum"→Tony Bennett, "Patty"→Patti) + copy/post plan
  (could slot into the TikTok/IG lanes this week — timely, feel-good, name recognition).
- **v2 WITH STING BUILT then SUPERSEDED:** sting.m4a was the wrong track. **🔍 AUDIT FINDING
  (8/11): every pipeline-shipped video's splash bookends are SILENT** (Tom, Alan, both
  branded-v2s, all splash clips, review-kit cards) — sting.m4a designed in but never mixed.
  **✅ REAL TRACK FOUND via Resolve project DBs: `HJ_Maliboom_BED1.mp3`** (50.7s bed, −7.4
  LUFS hot, at `claude-academy/.../pipeline/Projects/deke/`) — placed at beginning AND end of
  both "Deke - Annabelle Ye FINISH" and "Deke - NE Barbershop FINISH" Resolve timelines.
  Memory saved: `brand-audio-maliboom`.
- **✅ v3 FULL BUILD SHIPPED 8/11 (Denis's asks: longer Patti segments + b-roll + branded
  captions + right music):** `...deliverables/patti-labelle-sing-it-again-reel-DRAFT-v3-full.mp4`
  — 103.9s, −16.9 LUFS / −1.4 dBTP. Structure: Deke intro 0–19.8 (Maliboom bed ducked under,
  fades out into Patti) → Patti belt 19.8–34.8 (perf src 9–24, +5.5s longer, gold italic tag
  "PATTI LABELLE · STERN GROVE FESTIVAL") → Deke takeaway 34.8–74.3 with 2 b-roll stills
  (deke_directs.jpg at "get proper training", deke_carn.png Carnegie at "skills and
  technique"; blur-fill 9:16) → Patti finale 74.3–103.9 (perf src 48–77.5, +9s longer, bed
  rises over applause, ends flush). Burned gold ASS captions (#FFB703) with name fixes baked
  (Deke/Patti/Tony Bennett). ⚠️ NOTE for Denis: deke_carn.png has a Gemini AI watermark
  (bottom-right sparkle) — swap if unwanted.
- **✅ v4 SHIPPED 8/11 (Denis's v3 notes):** `...DRAFT-v4-full.mp4` — 113.0s, −17.0 LUFS.
  Changes: middle Patti belt +5s (perf src 9–29, same in-point, cuts back to Deke 5s later);
  outro music now the SAME opening section of the Maliboom bed as the intro (0–11s, fade-in
  over applause, fade-out at very end); Total Vocal "JOIN THE COMMUNITY / skool.com/deke"
  splash appended (splash-outro.mp4 16:9 → blur-fill 9:16, 4.1s). Captions re-timed +5s for
  seg C; QC frames verified (belt runs to cut, caption sync, splash clean).
  **AWAITING: Denis approval → copy/post plan.**

## 🆕 2026-08-07 LATE — VIRAL AUTHORITY MASTER PLAN DRAFTED

- **`DEKE-VIRAL-AUTHORITY-PLAN.md`** (project root) — full research-backed strategy to make
  Deke THE viral a cappella authority: 3 research passes (viral mechanics + case studies,
  vidIQ niche data, asset/audience audit), positioning, 4 named shows, phased roadmap with
  KPI gates. Status: proposed, awaiting Denis + Deke sign-off. Phase 0 = the existing
  blockers (YouTube uploads, beatboxer command, newsletter launch, FB into channel-pulse,
  approval SLA, Deke capture homework).

## 🆕 2026-08-07 NIGHT — SKOOL DIRECTORS TIER LOCKED + RIVERSIDE PRODUCER PLAYBOOK

From Denis's 8/7 evening WhatsApp chat with Deke (full sort + playbook:
**`DEKE-RIVERSIDE-PRODUCER-PLAYBOOK.md`** at the deke project root):

- **DECISION LOCKED (Deke): Skool premium ($49/mo) launches with ONE group — "a cappella
  directors." Never write "choir directors" in any copy** (his explicit correction). Monthly
  live event + directors-only content library. Expand to vocal percussion / part-specific
  groups only after this one is dialed.
- **Wednesday event = open to ALL (NOT directors-only).** Denis builds it (bells + whistles),
  records a Loom for Deke, and runs a **live test before Wednesday**. Prize-draw bait floated:
  signed book mailed / free 30-min coaching (Deke to confirm).
- **Riverside.fm: Denis owns the workspace and is producer for BOTH shows** — Skool interviews
  (Alan follow-up "Starting a Group From Scratch" in a few weeks is producer session #1) and
  the **CounterPoint podcast** (Deke's show; Denis = session production + post only,
  distribution stays with Deke). Playbook covers studios, producer role, per-track WAV
  standards, session checklists, and handoff into `D:\deke-media\incoming\` → normal pipeline.
  ⚠️ Known gotcha: media board is **host-only on non-Business plans** — dry run decides
  whether Deke self-triggers clips or Denis joins as a muted second host.
- **Deke's capture homework:** Episode Ideas Dropbox folder (texting word fragments for now);
  Osmo context intros for the Tom + Alan interviews; 5–10 min giddy Osmo promo ramble
  (Skool invite reel raw); walking-musings habit for shorts.
- **Episode bank:** "The Anxiety of Coming Back From Summer Break" (directors; Deke committed,
  "very timely" — Denis's own first rehearsal Mon 8/10 is the case study).
- **China/Korea trip (upcoming): NO lives from China** (firewall/VPN); phone service yes but
  Pocket-camera files exceed cellular data — uploads land whenever; autopilot catches them.
  ⚠️ He dictated **"pink town" festival** at trip's end — name UNVERIFIED, ask Deke, do not print.

## 🆕 2026-08-07 EVENING — INTERVIEWS BRANDED + PUBLISH-READY, BEATBOXER QUEUED

**Denis approved all three cuts + relayed Deke's OK to post (incl. beatboxer faces).**

- **Both interviews are FINAL, branded, publish-ready** (streamlined treatment: interview
  splash bookends + burned gold #FFB703 captions + −17 LUFS loudnorm — NOT the full Remotion
  chapter-card build; offer that later if wanted):
  - `Projects/deke/2026-08-07-tom-music-career-interview/05-deliverables/video/
    tom-kerley-music-career-BRANDED.mp4` — 28:57, **opens on 10s cold-open bite** ("if you can
    do anything other than music… welcome to the club"), + FINAL.srt (810 cues, intro-offset)
  - `.../2026-08-07-alan-group-startup-interview/05-deliverables/video/
    alan-group-startup-BRANDED.mp4` — 54:20, natural cold open, + FINAL.srt (1,549 cues)
  - Durations verified exact; QC frames verified (splash/captions/outro).
- **→ DENIS: 2 jobs.**
  1. **Upload both to YouTube** — paste-ready kit: `total-vocal-skool/UPLOAD-INTERVIEWS-TOM-ALAN.md`
     (titles, descriptions with mapped chapters, tags, SRT paths, Skool post texts,
     skool.com/deke link filled from the outro card). Paste URLs back → Skool posts go out.
  2. **Run the beatboxer Postiz command** (Claude is permission-blocked from live publishing):
     `cd c:\Users\lafla\claude_projects\deke; $env:POSTIZ_ALLOWED_ACCOUNTS='deke'; node scripts/postiz-publish.mjs --manifest "total-vocal-skool/croappella-2026/deliverables/publish-manifest-beatboxer.json"`
     Manifest = 5 posts (IG+FB Aug 16 10AM ET, TikTok Aug 16 2PM, LinkedIn+Threads Aug 17),
     **dry-run PASSED 8/7 (0 errors)**, extends the Aug 10–15 pack. Double-post guard armed.
- Guest names: **Tom Kerley** in titles (per Denis). **Alan = first name only everywhere.**

## 🆕 2026-08-07 PM (later) — EDITS DONE, AUTOPILOT LIVE, BEATBOXER FOUND, ⚠️ DISK FULL

- **✅ RESOLVED 8/7 evening — external drive D: ("Exports", 931 GB exFAT) is now the media
  tier.** Staging migrated: `deke/footage/` → **`D:\deke-media\`** (incoming / masters /
  archive; ledger, autopilot log/snapshot all there). Configs repointed (`dropbox-watch.json`
  staging, ledger local paths ×19), autopilot test-passed against D:, C: copy deleted after
  76/76 file verification → **C: back to 30 GB free**. 4K masters for the beatboxer build live
  at `D:\deke-media\masters\croappella-2026\`. `D:\project-archives\` is ready if Denis wants
  open-higgsfield (133 GB) / cabayodelmar (75 GB) off C:. Decision: keep working local-first;
  Dropbox stays inbound-handoff only (no working out of Dropbox — sync churn + quota).
  **Beatboxer reel re-rendered from 4K masters and shipped:**
  `croappella-beatboxer-reel-vertical.mp4` (58s, −17.0 LUFS, QC'd; still gated on Deke's OK —
  performer looks like a minor).
- *(superseded)* **⚠️ DISK WAS 100% FULL (~1 GB free of 1.9 TB).** Killed the 4K master pull mid-download.
  `claude_projects` holds 467 GB (open-higgsfield 133, davinci 76, cabayodelmar 75, deke 47,
  claude-academy 28, _archive 20, deke-video-pipeline 18); the other ~1.4 TB is outside
  claude_projects (models/apps/system). **→ DENIS: free space** — options: archive
  open-higgsfield/cabayodelmar to external drive; deke staging has 26.8 GB of re-downloadable
  Dropbox raws (NEBarbershop 9.6 GB raw is the big one — its derivative already shipped).
  Claude deleted nothing without asking (only its own temp proxies, ~1 GB).
- **Both interview edits + captions DONE and frame-verified** (see below for projects):
  Tom 29:18→28:39 (17 clips, tail hallucination + dead air out, ends on "Go get 'em");
  Alan 54:50→54:13 (12 clips, Zoom-timeout seam + aborted-then-retold Europe story cut).
  Word-timed SRTs (804/1548 cues) + XML/EDL/CSV care packages in each project's `03-edit/`.
  **Guest names: Tom KERLEY (per Denis 8/7). Alan's surname still unverified** — nothing printed.
- **AUTOPILOT IS LIVE** — `DekeDropboxAutopilot` scheduled task registered + test-fired OK
  (every 6h from 07:23): detect→pull→probe→transcribe→Resend digest. Ledger baselined (102
  pre-existing remote videos can't flood-pull). Ops: `scripts/AUTOPILOT-SETUP.md`.
- **🥁 BEATBOXER FOUND IN OUR OWN FOOTAGE: DJI_0047 = 194s solo beatbox set** (wide, ancient
  chapel, pink wash) + dome ceiling tilt-ups in 0045/0040. **58s DRAFT reel built:**
  `total-vocal-skool/croappella-2026/deliverables/reels/croappella-beatboxer-reel-DRAFT-vertical.mp4`
  (−17.1 LUFS, Deke's verbatim marble-dust quote as gold text). DRAFT = 720p proxy upscale
  (disk full); re-render from 4K masters after space is freed. ⚠️ beatboxer looks like a MINOR —
  Deke's explicit OK required. Tawnya's close-ups STILL not in Dropbox (no new MOVs).

## 🆕 2026-08-07 PM — TOM + ALAN INTERVIEWS IN PIPELINE, AUTOPILOT BUILT

- **Two new Zoom interviews pulled from Dropbox and in the pipeline** (edit + transcription +
  captions per Denis's ask):
  - `Projects/deke/2026-08-07-tom-music-career-interview` — "Tom meeting - career in music right
    out of college", 29m18s 720p, −18.6 LUFS (no repair needed).
  - `Projects/deke/2026-08-07-alan-group-startup-interview` — "Alan zoom - prepping to start a
    group", TWO Zoom segments (37m47 + 17m03) losslessly concatenated → 54m50s exact. Raws stay
    staged in `footage/incoming/`.
  - ⚠️ **NAME GATE: neither guest's surname is verified.** Denis said "Alan Weissman" but Dropbox
    says only "Alan"; Tom has no surname anywhere. Do NOT print surnames in titles/captions/lower
    thirds until Deke confirms (Becki Hine rule).
  - WhisperX (small/CPU) running on both 8/7 PM; then perfect-cuts edit + SRT. Strategy/copy
    stages follow the normal gates.
- **Dropbox AUTOPILOT built + tested:** `scripts/dropbox-autopilot.mjs` — every-6h scheduled
  run: detect (videos AND stills) → pull → probe → WhisperX transcribe main candidates into
  `<file>.whisperx/` sidecars → Resend digest email to Denis with next-step phrases. Never
  edits/posts (gates unchanged). Ledger baselined with the 102 pre-existing remote videos so
  it can't flood-pull. **→ DENIS: one `schtasks` command to arm it — see
  `scripts/AUTOPILOT-SETUP.md`** (Claude is permission-blocked from registering scheduled tasks).
- **Croatia folder re-checked 8/7:** 220 files now (was 205 at triage). The 15 new = 13 DJI
  MP4s + 2 LRFs, **zero new iPhone MOVs → Tawnya's beatboxer close-ups STILL not landed**
  (marble-dust reel stays blocked). The 13 unseen DJI clips are untriaged — possible third-reel
  material for CADENCE batch 2.

## 🆕 2026-08-07 — CADENCE SYSTEM + WATCHDOG ROUTINE

- **✅ CROappella pack IS LIVE IN POSTIZ (Denis ran the publish 8/7): 10/10 scheduled, 0 failed,
  Aug 10–15.** All post IDs written back into the manifest (double-post guard armed). Faces on
  the improv reel OK'd by Denis. First post: Mon Aug 10, 10:00 AM ET (IG+FB), TikTok 2 PM.
  Note for batch 2: X and YouTube are connected in Postiz but this pack had no items for them —
  add both lanes per CADENCE-PLAN.
- **Cloud watchdog routine LIVE:** `total-vocal-queue-watchdog` (trig_019gnKtXZeifQA1iN1KPNBCv),
  Mon+Thu 12:07 UTC (8:07 AM ET). Checks Postiz runway + ledger, emails Denis a digest
  (Resend if RESEND_API_KEY env set in the claude.ai environment, else Gmail draft + Calendar
  ping). Manage at https://claude.ai/code/routines — **add POSTIZ_API_KEY (+ optional
  RESEND_API_KEY) to the Default cloud environment** or it reports ledger-only.
- **Cadence locked from real data:** `total-vocal-skool/strategy/CADENCE-PLAN.md` — production
  floor = **3 unique reels + 2 text posts/week**, fanned out to ~17–20 scheduled posts across
  6 platforms (TikTok 5/wk, IG 4–5, FB 3–4, YT 2–3 Shorts + biweekly long-form, LinkedIn 2,
  Threads 3). Evidence: Zagreb-live week grew IG +5–11/day vs +0–2 dark; TikTok has only ever
  had our 2 posts (15→47 followers). Batch-build every 2 weeks → one review → Postiz drips.

## 🆕 CROappella IV (Zadar) DROP — PROCESSED 2026-07-28

Deke dropped **205 files / ~15 GB** into Dropbox (`Lakes (Plitvice), Rastoke, & Zadar`).
Triage + build complete. **Nothing published — waiting on Denis.**

**What it actually is (not an interview):** Deke on **faculty at CROappella IV**, Zadar,
**July 24–26 2026** — teaching a packed masterclass ("singing instruments"), plus a concert
in a stone venue, a ferry to Ugljan, and a club night. Verified against croappella.com's own
data layer: host **A.K.A. Crescendo**, director **Matea Biloglav**, coordinator **Jakov Šuto**,
sub-event **Adriatic Beatbox Battle**. Deke was **faculty/mentor, NOT a judge**.

**Built** (`total-vocal-skool/croappella-2026/`) — **TWO reels**:
- `deliverables/reels/croappella-deke-reel-vertical.mp4` — **54.3s, −17.3 LUFS** — *singing
  instruments* (voice-as-flute, hands as a second mouth). Built on large-v3-verified quotes.
- `deliverables/reels/croappella-improv-reel-vertical.mp4` — **49.8s, −16.6 LUFS** — *the
  improvisation class*, built to Deke's own 7/28 brief: circles of 4–8, nobody in charge,
  "music was never about perfection, it was about connection… time to put the play back in our
  singing." Source = Tony's phone footage (IMG_3045–3058).
  Both 1080×1920 H.264/AAC, burned gold captions + clean versions + .srt.
- `copy/croappella-copy-master.md` — 8 sections covering BOTH reels + quote bank
- `resolve-kit/` — **DaVinci edit kit, 22 clips** in 3 marker-coded groups (concert / improv /
  masterclass), DNxHR LB proxies, Lua (compile-verified with a real interpreter; all 22 media
  paths checked on disk), **plus an importable XML timeline** and a manual route.
- `deliverables/publish-manifest.json` — **10 posts** (2 reels × 5 channels). Postiz **dry-run
  PASSED: 0 errors, 0 problems.** NOT PUBLISHED. **RE-DATED 8/7 → Aug 10–15** (original 7/29–8/3
  window lapsed while awaiting approval). Fires on Denis's "go"; improv-reel posts 6–10 still
  need Deke's faces OK, or ship reel 1 only (posts 1–5).
- `REVIEW.html` — watch both reels + specs + open questions
- `TRIAGE.md` — file-by-file verdict on all 205 files + Deke's 7/28 notes

**🥁 HELD — the beatboxer / "marble dust rain" reel.** Deke's best story: the beatboxer "rocked so
hard pieces of the ancient ceiling were sprinkling down." **Tawnya's close-ups are NOT in Dropbox
yet** (checked 7/28 23:00). When they land: cut her close-ups against our wide concert shots
(DJI_0042/0046/0048). Deke says the other concert performances probably aren't needed, but "the
pink lighting in the ancient chapel is pretty amazing" → concert = visual b-roll.

**🔑 THE RESOLVE GOTCHA (root cause of "scripts don't load media"):**
Resolve's **External scripting is OFF by default** — `Preferences > System > General >
"External scripting using" = Local`, then restart. Scripts also need a **project already open**
(they can't run from the Project Manager screen). Verified on this machine: Resolve's Python API
returns `None` until that pref is set, and **Python 3.13 hard-crashes** `fusionscript.dll`
(access violation) — it supports ≤3.11; 3.12 loads but still needs the pref. The kit therefore
ships THREE routes: Lua script / manual drag-in / XML timeline import. Also note **free Resolve
on Windows cannot decode the DJI 4K HEVC** — that's why the kit points at proxies.

**⚠️ STILL OPEN WITH DEKE (full list in TRIAGE.md + REVIEW.html):**
1. ~~Which room was the concert in?~~ → **partially answered 7/28: he calls it the "ancient
   chapel."** Those are his words, so copy may use them. **Still do NOT print a proper venue
   name** — it looks like St. Donatus, but the 2026 program puts the finale at the Roman Forum
   and a different festival uses that church the same month. Becki Hine / Maddie Zahm class of error.
2. **Anyone we may name/credit?** Nobody is named (possible minors). The improv reel shows many
   faces in close-up — worth an explicit OK before it goes live.
3. **When do Tawnya's beatboxer close-ups land?** They unlock the marble-dust reel.
4. Does an organizer-filmed full session exist? Without one, no long-form YouTube teaching video
   is buildable from this drop.
**Goal:** Deliver Deke's July asks: no-barbershop posters (16:9) + recut of his most popular video via the full branded pipeline; Skool intro videos rebranded per Deke's 7/16 direction. **NEW (7/19): self-running Skool growth routine so Denis doesn't drive each batch by hand.**

## ✅ CURRENT (2026-07-27 evening) — BOTH v2 RENDERS DONE **AND QA-PASSED**

**Files (ready for Denis to watch):**
- `C:\Users\lafla\claude_projects\deke-video-pipeline\deke-brand\out\annabelle-branded-v2.mp4` — 1585.19s, −16.8 LUFS, 717 MB
- `C:\Users\lafla\claude_projects\deke-video-pipeline\deke-brand\out\tramack-branded-v2.mp4` — 1629.91s, −17.0 LUFS, 2.2 GB

**QA verified on frames (11 spot checks):** caption word-sync EXACT at 0:12 (the old fault
spot), 10:00/13:20, and 26–27 min into both videos; quote cards land on the spoken line
(annabelle 599.9/1167.7/1431.1); TIP #5/#7 chapter cards correct; guest labels correct incl.
**Renée Tramack** é; "FIRST IN 88 YEARS" fact card lands on "the first…". Durations match
predictions to 0.05s. Renders self-verified by the script (VERIFY block OK ×2).
**Known low-stakes gap:** annabelle burned captions go sparse ~1263–1279s — the deployed
final-cut SRT under-transcribed that patch (same on YouTube SRT); words shown match what's
deployed. Fix only if Denis notices it.

**Next:** Denis watches both → YouTube upload per `total-vocal-skool/UPLOAD-TOMORROW.md` →
paste URLs back. ⚠️ Message Annabelle before her interview goes public.
**Live dashboard** (auto-refreshing, shows final state): `C:\Users\lafla\claude_projects\deke\RENDER-STATUS.html`
(watcher: `deke-video-pipeline/pipeline/render_dashboard.py` — say "restart the render
dashboard" to re-arm it for future renders).

**How we got here (7/27 pm):** re-cut both jobs per the plan below.

**Refined root cause (the 7/27-am note was only half the story):** the annabelle job's
`cuts.json` (564 clips) and `whisper.json` were timed against the UNCUT 1922.9s source, but
`render_embellished.sh` stages the ALREADY-EDITED `FINAL-v3.mp4` (1575.7s — clean unbranded
edit, approved v3 audio). The 564-clip list also summed to 1570.9s ≠ 1575.7s, so it wasn't even
an exact reproduction of the approved edit. Applying a source-relative cut list to an
already-cut file compounds drift — that is what Denis saw at 0:12. Tramack's geometry was fine
(4 clips against the uncut source it really stages, matching the shipped 27:00.4 edit); it only
failed provenance because its clip `text` fields were human summaries, not transcript words.

**What the re-cut actually did:**
- **Annabelle rebased onto FINAL-v3 itself:** deployed name-verified SRT force-aligned to
  `annabelle_FINALCUT.wav` with wav2vec2 (`align_v2.py`) → word-level `whisper.json` on the
  final-cut timeline (5,308 words, 2 one-word fallbacks); `cuts.json` = single identity clip
  0→47222 @29.97; chapters + quote cards re-anchored word-precisely (old values drifted +0.7s
  early → +7.8s late). Backups: `whisper-source-timeline.json.bak`,
  `cuts-source-timeline.json.bak`, `chapters.json.bak-preanchor`.
- **Tramack:** frames untouched; clip `text` regenerated from its corrected transcript via new
  tool `pipeline/refresh_cut_text.py` (4,390 words assigned).
- **`render_embellished.sh` hardened:** preflight now gets `--source`, so staging a file the
  job's timelines don't describe is caught before rendering.

**After renders finish → QA before calling them final:** durations (annabelle ≈1585.1s,
tramack ≈1629.9s), caption-sync frame checks early/mid/late, loudness (annabelle ≈−16.x), quote
cards visible at 599.9/1167.7/1431.1 (annabelle branded timeline).

## 🆕 RESOLVE PRE-RENDER REVIEW SOP (built 2026-07-27 pm, Denis's ask)

**SOP:** `C:\Users\lafla\claude_projects\deke\SOP-RESOLVE-PRE-RENDER-REVIEW.md` — open any job
in DaVinci Resolve with EVERY layer on its own track before a final render; edit/move/delete
cards, retype captions, add content; two finishing lanes (A: ExportEdits → fold back into
chapters.json → pipeline render ships · B: Deliver from Resolve for one-offs).
**Denis's follow-along workbook (HTML, checkboxes persist per browser):**
`C:\Users\lafla\claude_projects\deke\SOP-RESOLVE-REVIEW-GUIDE.html` — 9 parts, from opening the
kit through cuts/captions/b-roll/stickers/effects/audio (Fairlight EQ + FairlightFX, loudness
target −16) to Deliver-page export and the ExportEdits hand-back. Screenshot-verified 7/27.

**New tooling behind it (typechecked; live render test pending — must NOT run while a pipeline
render is in flight, shares job-props.json):**
- `deke-brand/src/OverlayItem.tsx` + Root comps `OverlayItem` (one embellishment, transparent,
  exactly its on-screen life) and `BrandCard` (standalone intro/outro card incl. sting)
- `pipeline/export_review_kit.py <job> [--body mp4] [--captions-mov]` — runs the SAME preflight
  gates, renders per-item alpha ProRes 4444 MOVs, remuxes body to MOV+PCM, emits + installs
  `DekeReview_<job>.lua` (auto-builds the layered timeline V1–V5 + colored markers) and
  `DekeReview_ExportEdits.lua` (dumps manual tweaks to `review-kits/_resolve-edits/` for
  folding back into JSON). Kits land in `deke-video-pipeline/review-kits/<job>/`.
- Tramack kit needs `--body <academy>/2026-07-19-ne-barbershop-interview/05-deliverables/video/
  *FINAL.mp4` (raw DJI is HEVC — free Resolve on Windows can't decode it).
- **✅ SMOKE-TESTED 7/27 evening on annabelle** — kit built end-to-end (11 overlay items, body
  remux, Lua installed) and is ready at `deke-video-pipeline/review-kits/2026-07-25--annabelle/`.
  Two bugs found + fixed in the builder: (1) truncated filenames carried a Unicode ellipsis →
  now ASCII (Lua matches media BY NAME); (2) **overlays rendered with no alpha channel** —
  Remotion needs `--pixel-format yuva444p10le` on top of `--prores-profile 4444`, else every
  "transparent" card is an opaque black rectangle. All 12 MOVs verified `yuva444p12le` + visual
  frame check (TIP #5 card on true transparency).

**NEW GATE — `deke-video-pipeline/pipeline/preflight.py`** (built at Denis's request after this
incident, wired into `render_embellished.sh` so it cannot be skipped):
```
python pipeline/preflight.py <job_dir> [--source /intended/source.mp4] [--skip-audio]
```
Checks (1) is `cuts.json` older than `whisper.json`; (2) do the cut list and transcript agree on the
words (<90% overlap = different transcripts); (3) is the staged `source.mp4` the intended file and is
its audio actually processed (not raw −30 LUFS); (4) do captions fit the cut timeline.
**Verified it FAILS both bad jobs:** annabelle (stale cuts.json), tramack (69% overlap).

**Everything else is DONE and verified — do not redo:**
- Annabelle audio v3 (`...-FINAL-v3.mp4`) — −16.7 LUFS, LRA 5.5, Denis approved variant "F"
- Both caption SRTs rebuilt from final cuts, QA-passed, deployed (backups `.OLD-whisper-small`)
- Names verified: **Becki Hine** (not Becky), **Maddie Zahm** (not Zahn), **Clay/Melody Hine**,
  **SingUnited** (Denis's catch — Sweet Adelines rebranded May 2026), "mother's chorus" (not porous)
- Melody Hine IS Clay & Becki's daughter (confirmed by Deke)
- 0:40 speaker = **Renée Tramack** (resolved from the transcript itself)
- YouTube chapters verified line-by-line for BOTH videos (4 of 8 had drifted on Barbershop)
- Tags regenerated via the `youtube-tags` skill + VidIQ (334 / 348 chars, both under the 500 cap)
- Descriptions: Annabelle credited by name; links restructured on both
- Embellishment layers built, typechecked, data verified + de-overlapped
- Postiz YouTube is CONNECTED ("Deke Sharon", all 7 platforms eligible)

**Still open after the re-render:** upload to YouTube → paste URLs back → fill `[VIDEO URL]`
placeholders → Skool paste blocks → Postiz dry-run. Kit: `total-vocal-skool/UPLOAD-TOMORROW.md`.
⚠️ Message Annabelle before her interview goes public — student, class assignment, her work.

## 🔊 THE AUDIO RECIPE — LOCKED 2026-07-27 (Denis approved "F")

**This is now the standard for any roomy/weak Deke interview audio. Follow it; do not improvise.**

```
1. extract audio            → 44.1 kHz mono mp3
2. ElevenLabs Audio Isolation via Fal   ← the step that actually works
     POST https://fal.run/fal-ai/elevenlabs/audio-isolation   {"audio_url": ...}
     (upload first: POST https://rest.alpha.fal.ai/storage/upload/initiate?storage_type=fal-cdn-v3)
     needs $FAL_KEY (set in user env). ~$3 per 30-min interview.
3. warmth EQ "F"            ← fitted to Tramack's measured speech spectrum
     equalizer=f=150:t=q:w=0.9:g=4.0, f=300:w=0.9:g=3.5, f=1100:w=1.0:g=2.5,
     f=3000:w=1.2:g=-3.5, f=6000:t=h:g=-7.0, f=11000:t=h:g=-8.0
4. loudnorm=I=-16:TP=-1.5:LRA=11   ← SIMPLE. nothing else.
5. mux with -c:v copy       → no re-encode, no sync drift
```
Runner: **`scripts/repair-audio-ai.sh`** (generalised) · this job: `scripts/finish-annabelle-hq.sh`

**⚠️ QUALITY GOTCHAS — all three cost a re-render on 7/27, don't repeat them:**
1. **Upload LOSSLESS to the isolation API.** I first sent a 192 kbps mp3, so the AI enhanced already-damaged audio and preserved the compression artifacts (Denis heard them in Deke's voice). Fix = FLAC at native rate: **noise between words dropped 7.2 dB (−26.8 → −34.0)**. A 27-min interview is ~105 MB as FLAC; the upload accepts it.
2. **Never resample.** Source is 48 kHz — stay there. The first pass went 48k→44.1k→48k for no reason.
3. **ffmpeg's AAC encoder silently caps MONO at ~160–190 kbps** — `-b:a 320k` produced 175. Use `-af aformat=channel_layouts=stereo` to get a true ~230 kbps. (YouTube re-encodes anyway, so this matters least of the three.)

**On "add a compressor":** NO. Compression crushed take 1 to LRA 2.8 vs Tramack's 5.5 — that flattening IS the "manufactured" sound. v3 hits **LRA 5.5, dead on the reference**. Compression also makes isolation artifacts *more* audible by lifting the quiet parts where they live. A single gentle one is available behind `COMPRESS=1` in `finish-annabelle-hq.sh`, but the default stays clean.

**❌ REJECTED — do not reintroduce (all three failed Denis's ear):**
- **Spectral-subtraction de-reverb** (`scripts/dereverb.py`) → hollow **"metal pipe"**. Carving narrow bands makes what's left ring.
- **DeepFilterNet 3 local** → **nasal / squawky**. Free and fast (24× realtime CPU) but not broadcast quality.
- **Stacked dynamics** (2 compressors + speechnorm + limiter) → crushed LRA to 2.8 vs Tramack's 5.5. **Dynamics are the tell**: the rejected takes scored *better* on reverb while sounding worse.
- **Full 24-band spectral match** → over-corrected to −28 dB up top, muffled. Surgical ≠ better.

**Why F works — the diagnosis was measurable, not taste.** Annabelle's mic vs Tramack's, average speech spectrum: 120–250 Hz **−4.6 dB** and 250–500 Hz **−2.8 dB** (missing warmth = "telephone"), 4–8 kHz **+16 dB** and 8–14 kHz **+15 dB** (brittle = "robotic"). F halves total tonal error 38.5 → 19.0 and lands the low-mids within 1–2 dB. **Bit rate was never the issue** — both files were already 320 kbps.

**Reference target for future jobs:** `footage/incoming/totalvocal-skool/NEBarbershop/DJI_20260719085450_0037_D_AI-ISOLATED-FULL.mp3` (Tramack, 44.1 kHz mono 320 kbps, LRA ~5.5, RT60 0.30s). A/B against it.

## 🔴 AUDIO + NAMES PASS (2026-07-26 pm)
- **ROOT CAUSE FOUND: Annabelle's interview audio was never processed.** Raw source = **−30.5 LUFS**, shipped "final" = **−30.3 LUFS** — the repair chain never ran on this one (NE Barbershop correctly got it, −16.8). That is why it sounds echoey/distant, not a tuning problem. Room measured **RT60 ≈ 0.54s**.
- **Fix built and measured.** New `scripts/dereverb.py` (spectral late-reverb subtraction + envelope sharpening — ffmpeg alone CANNOT de-reverb) + FM-style polish chain to −14 LUFS / −1.0 dBTP. RT60 **0.54s → 0.30s** at recommended strength 0.8.
- **→ DENIS: pick a strength** (gentle 0.6 / **balanced 0.8 recommended** / aggressive 0.95) at `interview-audio-repair/annabelle-v2/LISTEN.html`. Then full 26-min render (~10–15 min, video stream copied, no re-sync risk).
- **NAME FIXES APPLIED** to both NE Barbershop SRTs (`.bak-prename` backups kept): `Becky Hine` → **`Becki Hine`** (she spells it with an i — LinkedIn, Song of Atlanta, BHS 2016 Reno program); `famous ranger` → `famous arranger`.
- **Verified spellings (HIGH confidence, primary sources):** **Clay Hine** (BHS Hall of Fame 2024, quartet FRED, Atlanta Vocal Project) · **Becki Hine** (Song of Atlanta Show Chorus, Sweet Adelines) · **Melody Hine** (their daughter, arranger) · **Maddie Zahn** (wrote "Mothers and Daughters"). Clay + Becki are married. NOT associated with quartet "Sidekicks".
- **`Maddie Zahn` → `Maddie Zahm`** — corrected in all 3 NE Barbershop files. Confirmed independently (MusicBrainz exact match + barbershoptags.com). She wrote "Mothers & Daughters" (released 2025-05-02; title uses an ampersand).
- **✅ THE PERFECT-100 CLAIM IS VERIFIED TRUE — do not let anyone "correct" it.** A research pass claimed the 100.0 belonged to "At Your Mother's House" instead. That was WRONG — it came from a column-major text dump of the PDF. Re-extracted the [official 2026 Quartet Finals OSS](https://files.barbershop.org/PDFs/Scores/BHS-2026-International-Convention-Quartet-Finals-OSS.pdf) **with x/y coordinates**: on the GQ block, row `Mothers & Daughters [Melody Hine]` reads `93.8 | 100.0 | 94.8 | 96.2` and the 100.0 sits at x=803 under the **PER** header (x=808). PER panel = 4 judges (Lagos, Ross, Weatherbee, Wood) → a perfect 100 from every performance judge. Local copies: `interview-audio-repair/annabelle-v2/oss.pdf` + `oss.txt`.
- **GQ verified facts:** won 2026-07-04, St. Louis · 6,723 pts / 93.4% · first non-male quartet in BHS's 88-year history · **Amanda Sandroni** (tenor), **Katie Gillis** (lead), **Ali Hauger** (bari), **Samantha Tramack** (bass).
- **✅ NE BARBERSHOP CAPTIONS REPLACED 2026-07-27.** Re-transcribed from the **FINAL CUT** with large-v3 + verified glossary → **408 cues, spans 00:27:00.36 vs a 00:27:00.40 video** (timing now correct). Swapped into both `05-deliverables/video/...FINAL.srt` and the perfect-cut `6 CAPTIONS (C).srt`; old files kept as `.OLD-whisper-small`. Passes `scripts/caption_qa.py` with only cosmetic warnings. All verified names present: Becki Hine, Clay Hine, Melody Hine, Maddie Zahm, SingUnited, Song of Atlanta, "mother's chorus".
- **NEW GATE: `scripts/caption_qa.py`** — run before any SRT replaces a shipped one. Checks timing vs real video duration (catches source-vs-final-cut desync), phantom words vs a reference, required/known-bad name spellings, empty+overlapping cues, chars-per-second. Verified it FAILS the old file and PASSES the new one. Usage: `python scripts/caption_qa.py FILE.srt --duration <sec> [--compare REF.srt]`.
- **⚠️ One line still unresolved (low stakes):** ~19:25 Deke imitates people requesting arrangements; whisper heard "Gibney Ford" / "gimme for it" / "gimme David". Audio is genuinely mangled there. Captioned as *"Oh, I heard this amazing arrangement, gimme, gimme!"* — conveys the sense without inventing a name. Ask Deke if it matters.
- **(historic) Why the captions had to be redone:** Denis has now caught **four** errors by ear in a file that passed all four approval gates. Machine-diff vs a clean large-v3 pass: the shipped SRT contains **91 words that do not exist** in the clean transcription (`bacapella`, `barbershot`, `cherenette`, `euranger`, `grittets`, `dionis`, `blana`…) and is **386 words SHORTER** — it drops real speech. Individually patched so far: `Becky→Becki Hine`, `famous ranger→famous arranger`, `Maddie Zahn→Zahm`, `mother's porous→mother's chorus`, `Why stare at me→Why start with me`, `judge in [garble]→judge in SingUnited`. **Patching one-by-one is the wrong fix.**
- **⚠️ BLOCKER on swapping in the clean file:** `interview-audio-repair/annabelle-v2/nebarber-RETRANSCRIBED.srt` (418 cues, all names verified) is transcribed from the **UNCUT source (29:16)**, but the finished video is **26:59** — the edit removed ~2.3 min. **Dropping it in as-is would desync every caption.** It must be re-aligned to the final cut (transcribe the FINAL mp4, not the source) before it can replace the shipped SRT. Until then the shipped SRT stays, with the 6 patches above applied.
- **⚠️ STILL GARBLED, needs Deke/Denis:** the phrase after "Becki Hine, director of ___" (whisper flip-flops: "Sondland"/"Song of Atlanta"?) and "a judge in ___" ("Monsignor United"/"Mancini United"?). Per PLAN line below, "Monsignor United" is a KNOWN old-`small`-model bug — **these SRTs predate the retranscription fix and should be regenerated with large-v3 + glossary**, not hand-patched.

## ⚠️ NEXT SESSION START HERE → read `total-vocal-skool/RESUME-HERE.md` first (2026-07-26)
- **Zagreb pack is LIVE and self-running.** 5 of 18 posts published (first reel went out 7/26 2:00pm ET); the remaining 13 publish through Thu 7/30 with no action needed — Postiz is server-side.
- **Four interview renders were KILLED when the session closed.** Restart with one command: `bash "C:/Users/lafla/claude_projects/deke-video-pipeline/pipeline/render_all_v2.sh"` (~30 min, unattended) — or say "resume the interview renders".
- **Transcription was broken and is now fixed at the source.** Old captions used whisper `small` with no domain vocab ("burger shop", "Boko Harami", "Monsignor United"). Re-transcribed with large-v3 + domain prompt + glossary; all errors zero, verified on screen. New tools: `transcript_qa.py`, `retranscribe.py`, `align_v2.py`.
- **Renders are now 1080p, not 4K** (Postiz rejects >1920×1080). ~4× faster. Disk hit 97% — reclaimed ~12 GB.

## Older notes (2026-07-25)
- **DENIS'S ONE JOB: upload 2 videos to YouTube, paste 2 URLs back.** Both interviews (Tramacks + Annabelle) are fully built and gate-approved; only the YouTube link is missing. Paste-ready kit — files, titles, descriptions, tags, thumbnails, verified chapters: **`total-vocal-skool/UPLOAD-TOMORROW.md`**. On URLs → fill `[VIDEO URL]` placeholders → publish-manifest → Postiz dry-run gate → editable drafts (never live).
- **Dropbox share is LIVE and syncing locally** at `C:\Users\lafla\Dropbox\TotalVocal Skool` — no rclone needed for synced folders. Zagreb pulled + processed 7/25.
- **Zagreb package shipped 7/25:** `total-vocal-skool/zagreb-2026-07/deliverables/` — 52.6s 16:9 short + 3 vertical reels (tunnel / klapa / city) + copy master. **Open question for Deke:** was the Grič Tunnel singing a klapa group, and did he hear klapa live? Copy is written to work either way, but his answer sharpens it a lot.
- Tramack thumbnail built 7/25 (was missing); both thumbnails now have YouTube-safe 1280×720 JPGs (<2 MB).

## Superseded (7/19 context, kept for history)
- **The front door is BUILT (7/19 pm), waiting on Denis's one-time Dropbox setup.** `deke/scripts/dropbox-ingest.mjs` (check/pull/probe/apply/status, rclone transport) + `dropbox-watch.json`; Stage -1 TRIAGE wired into content-pipeline SKILL.md + deke client.json. Denis's setup steps: `total-vocal-skool/FOOTAGE-HANDOFF-SETUP.md` (create Dropbox 2TB account → add Deke's shared folder → `rclone config` → verify folder name in watch config). Once done: "check deke's dropbox" → pull interview → `repair-audio.sh` → A/B → run content-pipeline for deke. NOTE: confirm which interview is the real one — local `IMG_6166.mov` (18m, audio ok) vs Dropbox `DJI_20260719085450_0037_D.MP4` (~8 GB).

## Decisions locked
- **2026-07-19 pm (Denis): ingestion = Denis buys his own Dropbox 2 TB (Plus, ~$12/mo).** Deke keeps dropping in Dropbox unchanged (Google Drive freezes on his device; per-file links = too much friction for him). Deke's shared folder added to Denis's account → rclone per-file resumable pulls. Free tier impossible (joined shares count against quota; folder is 16.8 GB).
- **2026-07-19 pm (Denis): Stage -1 TRIAGE approved as designed** — ffprobe + 90s loudness probe (free), eyes-on only if ambiguous (quoted), approval manifest gates everything; main → Inbox, b-roll → `approved-broll/`, rest skipped.
- **2026-07-19 (Deke's 2-version model, Denis's routing calls): Total Vocal Skool growth = content-pipeline (client `deke`) + a front door to build; NOT a parallel routine.** Per source video, 3 lanes: (1) 30s vertical teaser → all socials + Skool CTA tile; (2) full letterbox recut → Skool "Too Many Notes" series (own category) AND socials; (3) atomized quote-posts/reels drip between drops. ONE approval gate — everything auto up to review, auto-publish after. Backfill Postiz from the 5 finished recuts NOW so accounts stop being dark. Strategy: `total-vocal-skool/SKOOL-GROWTH-STRATEGY.md`; routine: `total-vocal-skool/TOTAL-VOCAL-ROUTINE.md`; state: `total-vocal-skool/CONTENT-LEDGER.md`. Trigger: Denis says "run the Total Vocal loop".
- **2026-07-16 (Deke via Denis): NO Too Many Notes intro/outro on Skool community videos.** They open/close on a quiet Total Vocal splash card instead (navy, "TOTAL VOCAL" + gold underline; outro adds "JOIN THE COMMUNITY" + skool.com/deke pill — CTA overlay retired on these). Implemented as `brand.splash: true` per job; splash durations = 105/122 frames, identical to the old clips, so no retiming anywhere. YouTube refactors keep Too Many Notes.
- Posters: two variants, both 16:9 landscape, zero barbershop mentions — (1) a cappella/vocal harmony welcome, (2) Skool-community framing ("Everyone who loves singing belongs here")
- Poster look: same navy #12151F / gold #D8A33E system as BHS poster; heroes = tv-deke.jpeg (right-crop) and tv-banner.jpeg
- Video: "Sing like an Electric Guitar" (R-utZM_PUf8) — Deke's #1 most-viewed ever (90,554 views), zero barbershop content
- Recut design: cold open = electric-guitar payoff (source 164.41–178.61) → Deke's own Too Many Notes logo intro (0–3.5s) → full body (demos preserved, no gap-trimming — gaps are singing) → source outro logo with end-screen zones
- B-roll: 4 nano-banana-pro stills (kazoo/strings/theremin/guitar), placed AFTER the burned-in gold instrument titles, not over them

## Done
- [x] **2026-07-19 pm: Front door built + sideways session reconciled.** `scripts/dropbox-ingest.mjs` (check/pull/probe/apply/status; rclone transport; ledger; probe smoke-tested on IMG_6166.mov: 18m08s, -19.5 LUFS) + `scripts/dropbox-watch.json`. Stage -1 section added to content-pipeline SKILL.md; `ingest` block added to deke client.json. FOOTAGE-HANDOFF-SETUP.md rewritten for the 2TB flow; TOTAL-VOCAL-ROUTINE.md stripped to thin wrapper pointing at the skill; empty `footage/2026-07-19--ne-barbershop/` deleted; memory updated. KEEP list confirmed: SKOOL-GROWTH-STRATEGY.md, CONTENT-LEDGER.md, repair-audio.sh.
- [x] **2026-07-17: Section-specific splash screens.** Splash intro title/kicker now data-driven (`brand.splashTitle`/`splashKicker`, defaults WELCOME / To Total Vocal). Arrangements = "ARRANGEMENTS", Warm-ups = "WARM-UPS"; redundant classroom tile b-roll at 0:03.5 removed from Arrangements (Warm-ups' tile at 0:38 kept — mid-video, not redundant). Both finals re-rendered into their packages; Resolve kit rebuilt with per-section `splash intro - <LABEL> (C).mov` + Lua reinstalled. ⚠️ INCIDENT: staged `source.mp4` was a hardlink to the raw warm-ups DJI (`DJI_20260716004425_0021_D.MP4`) — overwritten during staging; that file now contains ARRANGEMENTS footage. True warm-ups master survives as the 4K `1 WATCH - final video (C).mp4` (full-length, no cuts) which is now the render source. Re-copy the raw from the SD card if it still exists. Staging rule added to skill: always `rm` staged source.mp4 before copying.
- [x] `total-vocal-skool/acappella-poster-169.{html,png,pdf}` — 1920×1080 + 16:9 PDF
- [x] `total-vocal-skool/skool-community-poster-169.{html,png,pdf}`
- [x] Popularity sweep: 58/81 channel videos ranked by views (scratchpad/deke_views_sorted.txt; 23 unlisted/unavailable)
- [x] Job `deke-video-pipeline/jobs/2026-07-14--electric-guitar/` — cuts.json, chapters.json (introClip 0–105, outroClip 6936–7058, lead_in 3.5035 w/ brand override), captions retimed (614 words)
- [x] B-roll generated + staged in deke-brand/public/job/broll/
- [x] Preview render QA'd — fixed stray "Now" caption bleed (out_frame 5354→5353)
- [x] Package partials in `Downloads/deke-pipeline-test/electric-guitar-recut/`: XML, SRT, cut data, upload kit (5 title options), 4 real-footage thumbnail grabs
- [x] Fixed Denis-reported flash frame at 17.7s (join cold-open→body): source frame 107 still showed the Too Many Notes intro card → clips[1].in_frame 107→108, re-rendered, package refreshed (MP4/SRT/cut data/XML)
- [x] One-click re-render tooling: `deke-video-pipeline/RERENDER.bat` + `pipeline/rerender.py` + `EDIT-YOUR-VIDEO.md` — Denis edits cuts.json in Notepad, double-clicks, done. Validated end-to-end (both jobs rendered through it). Per-job package filenames via chapters.json package_mp4/package_srt/package_cuts
- [x] New `DekeShort` 1080×1920 Remotion composition (punch-in → animated zoom-out to blur-fill strip via chapters.json shortCam; big word-highlight captions; title overlay; progress bar)

- [x] 30s vertical Short for Deke: job `2026-07-14--electric-guitar-short` (source 158.3–189.8s: "is this worth it?" hook → guitar demo → "The electric guitar." → "It's spit.") — QA'd, delivered as `electric-guitar-short.mp4` (31.5s, 1080×1920) + SRT + XML in the package folder

## In flight
- **`2026-07-19-ne-barbershop-interview` — ALL 4 GATES APPROVED 7/19 evening (full pipeline in one session).** Angle A "History was just made"; 29:18→27:00 cut; copy bundle locked (essay, 10 quote-posts, 4 reels, HARMONY DM w/ skool.com/deke funnel); deliverables at `claude-academy/1- Youtube Production/pipeline/Projects/deke/2026-07-19-ne-barbershop-interview/05-deliverables/`. **BLOCKED on Denis: YouTube upload of FINAL.mp4 (+SRT+tags) → paste URL → fill [VIDEO URL] placeholders → Stage 6 Postiz dry-run gate.** Then optional: branded Skool render (splash bookends) + DekeShort teaser. Spend this run: ~$3.13.

## Next up
- Denis reviews the branded MP4 + picks a title from the upload kit, then manual YouTube Studio upload (SRT as CC)
- Flag any bad cuts conversationally → fix cuts.json → re-render

## Blockers (waiting on Denis / external)
- **Dropbox one-time setup (Denis, ~10 min):** create account + 2TB plan → "Add to my Dropbox" on Deke's share (or Deke invites denis@theagentfactory.ai) → `rclone config` (browser OAuth) → `rclone lsd dropbox:` and fix folder name in `scripts/dropbox-watch.json`. Unblocks: interview pull + repair + first real pipeline run.
- vidIQ credits exhausted (free plan) — yt-dlp used for popularity; tags/titles gut-checked instead of vidIQ-scored

## Open questions
- Deke said "maybe do options / maybe do both" — second candidate if he wants another: "Creative Vocal Arranging in 4 Steps" (53k views, also barbershop-free)
