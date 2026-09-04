# Deke — Plan
**Last updated:** 2026-09-03 (local)
**Status:** active

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
