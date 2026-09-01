# Total Vocal — Content Ledger
**Purpose:** The routine's memory. What's been built, what's queued, what's live. The [routine](./TOTAL-VOCAL-ROUTINE.md) reads the top unbuilt item each run and writes results back here so it never rebuilds a source or double-posts.

**Status key:** `queued` → `built` → `approved` → `live` (socials scheduled + Skool staged)

---

## Live (published / scheduled)
- **CROappella IV pack — SCHEDULED 2026-08-07, drips Aug 10–15.** 10/10 posts accepted by Postiz
  (2 reels × IG/FB/TikTok/LinkedIn/Threads); post IDs in `croappella-2026/deliverables/publish-manifest.json`.
- Zagreb pack — 18 posts, published 7/26–7/30 (historic).

## Built, awaiting review gate
- **Reel cover-frame fix (black Instagram thumbnails) — built 2026-08-29.** Root cause: Meta defaults a
  Reel's cover to frame 0, and `postiz-publish.mjs` sent no cover parameter. Reels that fade in from black
  therefore published a solid black square. Measured: beatboxer reel YAVG=16 at t=0 (pure black in video
  range), reaching ~84 only at t=0.5s. **Audit: 15 of 28 delivered videos affected** — all 5 CROappella reels,
  all 3 Zagreb reels + the Zagreb 16:9 short (YAVG 21), and 6 intro videos (YAVG 17.38).
  Fix: `scripts/pick-cover-frame.mjs` (scores frames, rejects black/blown/flat) + `scripts/add-covers.mjs`
  (adds `coverPath` to a manifest) + `coverPath` support wired into `postiz-publish.mjs` for instagram/youtube.
  Review page: `covers-review/index.html` (before/after, all 18).
  ⚠ **Auto-pick needs human review** — on the improv reel it chose a bright frame showing identifiable
  attendees, which violates the standing copy-master rule (no unnamed students/attendees, possible minors).

- **Skool Promotion Kit (tags + CTAs) — built 2026-08-29.** `strategy/SKOOL-PROMO-KIT.md` + browser version
  `strategy/SKOOL-PROMO-KIT.html`. Adds the missing conversion layer: 3-tier hashtag system (new community tags
  `#TotalVocalCommunity` / `#SingWithDeke` / `#TotalVocalSkool`), per-platform tag recipes, a CTA ladder, and
  platform link mechanics. **Audit finding: the 10 scheduled CROappella posts (Aug 10-15) carry NO Skool CTA in
  the public IG/FB captions** - the CTA sits only in the post published inside Skool. Zagreb partial, AMA correct.
  ⚠️ Blocked on: Deke's six @-handles (not stored in repo, Postiz holds them server-side) + IG bio link check.

## Queue — Phase 1: Backfill (seed Postiz now)
Teasers from already-finished recuts. No re-render needed — atomize + build teaser + schedule.
⚠️ **Path rot found 8/7:** `Downloads\deke-pipeline-test\` no longer exists. Branded renders survive in
`deke-video-pipeline\deke-brand\out\` (e.g. `electric-guitar-short-branded.mp4`). Re-verify each package
path below before building; cadence targets now in `strategy/CADENCE-PLAN.md` (floor: 3 reels + 2 text/wk).

| Source | Package | Teaser | Full recut (Skool) | Socials | Status |
|---|---|---|---|---|---|
| Electric Guitar (90k flagship) | `Downloads/…/electric-guitar-recut/` | short already exists (`electric-guitar-short.mp4`) | ready | — | queued |
| Creative Vocal Arranging | `Downloads/…/arranging-recut/` | short exists (arranging 42s) | ready | — | queued |
| Vocal Harmony Competition | `Downloads/…/competition-recut/` | build | ready | — | queued |
| Run a Great Rehearsal | `Downloads/…/rehearsal v2 recut (C)/` | build | ready | — | queued |
| TV Intro — About/Welcome | `intro videos/About Video…/` | build | Skool welcome | — | queued |
| TV Intro — Arrangements | `intro videos/Arrangements Video…/` | build | Skool | — | queued |
| TV Intro — Warm-ups | `intro videos/Warmups Video…/` | build | Skool | — | queued |

## Queue — Phase 2: Back-catalog recuts (ongoing)
Next barbershop-free high-value video from `scratchpad/deke_views_sorted.txt`.
- On deck: **"Creative Vocal Arranging in 4 Steps"** (53k views) — *if not already covered by arranging-recut; verify before building.*

## Queue — Phase 3: New event / reaction footage
Jumps the queue whenever Deke sends it (his forward focus: live discussions, reactions, BTS).

| Source | Package | Status |
|---|---|---|
| NE Barbershop interview / Tramacks (29m, 7/19 drop) | pipeline project `2026-07-19-ne-barbershop-interview` | **ready to upload** — all 4 gates approved 7/19; 27:00 4K final + SRT + copy bundle. **Thumbnail built 7/25** (`thumbnail-88-years-yt.jpg`, 1280×720). Chapters verified against final SRT. Upload kit: `UPLOAD-TOMORROW.md`. Blocked only on Denis's YouTube upload → URL → Postiz dry-run |
| Annabelle Ye interview (32m, 7/18 drop) | pipeline project `2026-07-18-annabelle-ye-deke-interview` | **AUDIO REBUILT 7/27 — upload `annabelle-ye-deke-interview-FINAL-v3.mp4`.** The gate-approved final had shipped with *completely unprocessed* audio (raw −30.5 LUFS vs "final" −30.3 — chain never ran). Fixed with the approved recipe: **ElevenLabs AI isolation + warmth EQ "F" + loudnorm −16** (see PLAN.md "THE AUDIO RECIPE"). Took 4 attempts — 3 DSP approaches rejected by ear before AI isolation. Video stream copied untouched. Blocked only on YouTube URL. ⚠️ credit Annabelle (student, her class assignment) |
| **Zagreb / Croatia (27 stills + 4 clips, 7/21 drop)** | `zagreb-2026-07/deliverables/` | **built 7/25** — 52.6s 16:9 short + 3 vertical reels (tunnel / klapa / city) + copy master. Angle: klapa (UNESCO a cappella tradition) + Grič Tunnel reverb. ⚠️ confirm w/ Deke whether he heard klapa live & what the tunnel audio actually is |
| **CROappella IV / Zadar (205 files, ~15 GB, 7/28 drop)** | `croappella-2026/deliverables/` | **built 7/28 — TWO reels.** (1) *Singing instruments* 54.3s (voice-as-flute, hands as second mouth); (2) *Improvisation class* 49.8s — Deke's own ask: circles of 4–8, no conductor, "music was never about perfection, it was about connection." Both vertical 1080×1920, captioned + clean + .srt, ≈−16.6/−17.3 LUFS. Plus copy master (8 sections, both reels), **Resolve edit kit (22 clips, DNxHR proxies, Lua + XML + manual route)**, Postiz dry-run PASSED (5 channels, 0 errors). **APPROVED by Denis 8/7 (all 10 posts, improv faces OK'd); manifest RE-DATED to Aug 10–15. Publish run still pending** — session permission blocked `node scripts/postiz-publish.mjs --manifest total-vocal-skool/croappella-2026/deliverables/publish-manifest.json`; run it from an approved session. ⚠️ venue never named (Deke calls it the "ancient chapel" — safe); nobody credited by name. **PENDING: Tawnya's beatboxer close-ups** → unlocks the "marble dust rain" reel, the best story in the drop |
| NEBarbershop remaining 15 clips (~5.6 GB) | not pulled | awaiting triage verdict |
| Singapore Broll (17 clips, ~19.9 GB, Jul 3-4) | not pulled | proposed: pull-on-demand only |

---

## Notes
- YouTube NOT yet connected in Postiz → teasers won't auto-post as YT Shorts until connected (Postiz UI). All other 6 platforms live.
- "Too Many Notes" = named series inside Skool, its own classroom category. Full recuts land there in order.
