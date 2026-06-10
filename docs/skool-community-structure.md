# Deke Sharon — Skool Build Runbook (Community Structure)

*The build-ready, step-by-step skeleton for standing up Deke Sharon's Skool community.*

> **Companion doc.** This is the **execution** companion to
> [`skool-community-strategy.md`](./skool-community-strategy.md) (the *why*, the pricing, and the
> revenue model). That doc decides **what** we're building and at **what price**; this doc is the
> **how** — exactly what to click and create inside Skool to stand the structure up in one sitting.
>
> **Depth:** high-level **skeleton only** — group / tier / category / course / level *names and
> purpose*. Individual modules and lessons are a deliberate later pass (flagged inline).

---

## 0. Branding principle (read first)

**Deke Sharon is the brand.** Not a faceless "academy." His name, face, voice, and story are the
product and the entire reason anyone joins. So, everywhere in this build:

- **The headline brand is "Deke Sharon."** *"Deke A Cappella"* is, at most, a descriptive
  subtitle — never the standalone name.
- All member-facing copy is in **Deke's first-person voice** — *"Learn directly from me…"* — anchored
  to the positioning: **"Learn contemporary a cappella from the person who invented the modern sound."**
- Use **his likeness** for branding (placeholder images already in the repo: `deke_hi.jpg`,
  `IMG_8622.jpeg`, `IMG_8623.jpeg`), his signature, and the brand color **`#C05A3C`**.
- The VIP tier is explicitly **"with Deke"** — proximity to him *is* the premium.

> Tier labels like *Ensemble / Soloists / Producers' Room* are useful **internal** names for the
> three price points. The **brand a member sees and feels is Deke Sharon** — the tiers are just how
> close they get to him.

---

## 1. How the 3 tiers map onto Skool today

The strategy doc was written when *"a single Skool group has one price,"* and worked around it with
separate groups. **Skool now supports two relevant models:**

- **Tiers** — *multiple paid plans inside one group* (e.g. three ascending price points), each unlocking more.
- **Freemium** — *one free plan + one paid plan* inside one group.

A group is configured as **either** Tiers **or** Freemium — not both at once.

### ✅ Recommended topology

| # | Group (member-facing name) | Plan model | Purpose |
|---|---|---|---|
| 1 | **Sing with Deke** *(free)* | Free group | Top-of-funnel. The audience lands here; clips, taster posts, and the waitlist live here. |
| 2 | **Deke A Cappella** *(paid)* | **Freemium** → free preview + one paid plan: **$49/mo (7-day trial)** or **$490/yr** | The paid home. One simple membership; the **annual** option is the **VIP** tier (see §3). |

Two groups, cleanly: one **free funnel**, one **paid home** with a single membership billed monthly or
annually. This is the simplest structure to launch with — no multi-tier setup to slow the doors opening.

> **Why not Skool "Tiers"?** Tiers (multiple paid plans in one group) suit a 3-tier model. We're
> launching with **one** paid plan + a free funnel, so **Freemium** is the right fit. The $99 middle
> tier can be added later once there's volume.

---

## 2. Step 1 — Create the groups & brand them

> Ticks Kanban card **t1 — "Create Skool group(s) + brand them."**

For **each** of the two groups above, set:

| Setting | "Sing with Deke" (free) | "Deke A Cappella" (paid) |
|---|---|---|
| **Name** | Sing with Deke | Deke A Cappella |
| **URL slug** | `/sing-with-deke` | `/deke-sharon` *(secure the cleanest Deke-named slug available)* |
| **Privacy** | Public (discoverable) | Private (paid) |
| **Icon** | Deke headshot (`deke_hi.jpg`) | Deke headshot (`deke_hi.jpg`) |
| **Cover image** | Deke performing / brand banner | Deke performing / brand banner |
| **Brand color** | `#C05A3C` | `#C05A3C` |
| **One-line description** | "Free a cappella tips & community from Deke Sharon — the voice behind *Pitch Perfect* & *The Sing-Off*." | "Learn contemporary a cappella directly from Deke Sharon. Courses, live classes & coaching." |

**Branding to-do (skeleton):** upload headshot + cover, set color, write the one-liners above, and
add Deke's signature/logo lockup once available. Replace placeholder repo images with final brand
assets before launch.

---

## 3. Step 2 — Membership & pricing (Freemium + annual VIP)

Configure the paid group as **Freemium**: a free preview plus **one paid plan**, offered monthly or
annually. The annual option **is** the VIP tier.

| Plan | Price | What it is |
|---|---:|---|
| **Free → "Sing with Deke"** | $0 | Community feed, intro module, monthly open Q&A clip. *(separate free group)* |
| **Membership (monthly)** | **$49/mo** · 7-day free trial | Full course library · live classes with Deke · challenges, leaderboard · feedback · resource drops. |
| **VIP (annual)** | **$490/yr** | Everything in the membership, billed yearly (≈2 months free), **plus VIP status** → a **private "Producers' Room"** space (§4) and **Deke's special-arrangements package**. |

Setup notes:
- **Annual = VIP, not just a discount.** It's a year up front + lower churn, rewarded with the VIP
  space + arrangement package. It's the premium even though the monthly-equivalent is lower.
- **⚠️ Skool can't auto-gate content by billing interval.** Monthly vs annual is the *same plan* to
  Skool. So VIP access is **manual**: when someone buys annual, **add them to a "VIP" member role/tag**
  and to the gated **Producers' Room** category (§4); Deke delivers the arrangement package directly.
  Document this as a standing operational step.
- **Free trial:** **7-day** trial on the monthly plan (confirmed).
- **$99 middle tier:** deferred — add later once there's volume.

---

## 4. Step 3 — Community feed categories

Create these post categories in the **paid** group. Gate is "who can see/post."

| Category | Purpose | Gate |
|---|---|---|
| **Start Here — Meet Deke** | Pinned welcome, intro module, how the community works. | All members |
| **Announcements** | Deke / ops posts: schedules, drops, events. | All members (admin-post) |
| **Wins & Performances** | Members share recordings & wins — the heartbeat of the community. | All members |
| **Arranging** | Arranging questions, swaps, breakdowns. | All members |
| **Vocal Technique** | Blend, tuning, tone. | All members |
| **Vocal Percussion** | Beatbox / VP. | All members |
| **Feedback & Critiques** | Where members post work for feedback (Soloists get batched Deke feedback). | All members (tier perk in *replies*) |
| **Find a Group** | Connect singers ↔ groups (ties to the brand's existing "find a group" feature). | All members |
| **The Green Room** | Off-topic, social, belonging. | All members |
| **Producers' Room** | VIP lounge for **annual** members + Deke. | **Gated — manual VIP role** (annual buyers) |

For the **free** group, create a slim set: **Start Here · Announcements · Wins & Performances ·
Ask Deke (monthly Q&A)**.

---

## 5. Step 4 — Classroom course shells

Create the courses as **shells** — title, cover (Deke's face on every one), one-line purpose, and the
unlock rule. **No modules/lessons yet** — that's the next pass.

| Course | Purpose (one line, Deke's voice) | Unlock |
|---|---|---|
| **Start Here — Meet Deke** | "Who I am, what you'll learn, and how to get the most from this community." | Free / all members |
| **Deke's Arranging in 10 Steps** | "My exact process for arranging a song for voices — start to finish." | Ensemble+ (course library) |
| **Blend & Tuning with Deke** | "How to make any group lock in and sound like one instrument." | Ensemble+ |
| **Performance & Stage Presence** | "Command the stage — the difference between singing and performing." | Ensemble+ |
| **Deke's Monthly Masterclass Library** | Container that grows by one recorded live/module per month (the "always a reason to stay" engine). | Ensemble+ (drip by date) |

Notes:
- **Modules & lessons: later pass.** Each shell gets its folder/lesson breakdown in the next round.
- Set the library to **drip** so new monthly content lands on a schedule.
- VIP teardowns/toolkits can live as **VIP-gated courses** (manual role) added later.

---

## 6. Step 5 — Gamification: rename the 9 levels

Skool gives every group a fixed **9-level** ladder (members earn points when others like their posts /
comments). Rename them as an a-cappella progression and attach an unlock to keep engagement climbing.

| Lvl | Name | Suggested unlock |
|---:|---|---|
| 1 | **Listener** | Default on join. |
| 2 | **Singer** | Unlock **Wins & Performances** posting prompt / first resource drop. |
| 3 | **Section Member** | Unlock a bonus resource pack. |
| 4 | **Soloist** | Unlock a "spotlight" feature eligibility. |
| 5 | **Arranger** | Unlock a mid-tier bonus lesson. |
| 6 | **Beatboxer** | Unlock a VP/beatbox bonus. |
| 7 | **Music Director** | Unlock a leadership/curation perk. |
| 8 | **Producer** | Unlock recognition + a premium bonus. |
| 9 | **Maestro** | Top of the ladder — public recognition from Deke. |

> Level names are an **open decision** (§10) — these are a strong default. Unlocks are illustrative;
> finalize alongside the lesson pass.

---

## 7. Step 6 — About page & onboarding (skeleton)

Write these in **Deke's first-person voice** — his story is the hook.

- **About blurb (outline):** one paragraph — who Deke is (*Pitch Perfect*, *The Sing-Off*, Broadway,
  2,500+ arrangements), what this community is, and the promise: *"learn it directly from me."*
- **Pinned "Start Here — Meet Deke" post (outline):** short welcome video + 3 bullets (how to start,
  where to post, when live classes happen).
- **Welcome auto-DM (skeleton):** 2–3 lines, signed *"— Deke,"* pointing new members to Start Here.
- **Community guidelines:** link out to the guidelines drafted in Kanban card **t9** (don't duplicate).

---

## 8. Step 7 — Calendar (recurring event placeholders)

Create recurring Skool events matching the live cadence in strategy §5 (titles only for now):

- **Weekly Live Class with Deke** — weekly (Ensemble + Soloists).
- **Soloists Group Coaching** — monthly (Soloists+).
- **Producers' Room Call with Deke** — monthly (VIP only).
- **Monthly Open Q&A** — monthly, also clipped for the free group.

---

## 9. Build checklist (work top-to-bottom)

> Completing this discharges Kanban cards **t1** (create + brand groups) and **t2** (classroom outline).

- [ ] Reserve the Deke-named URL slugs for both groups.
- [ ] Create **"Sing with Deke"** (free) — icon, cover, color, description.
- [ ] Create **"Deke A Cappella"** (paid) — same branding.
- [ ] Set the paid group to **Freemium**; add the paid plan **$49/mo with a 7-day trial** + **$490/yr** annual.
- [ ] Create a **"VIP" member role/tag** + the gated **Producers' Room** category for annual buyers.
- [ ] Create the **feed categories** (§4) in both groups; gate **Producers' Room** to the VIP role.
- [ ] Create the **5 course shells** (§5); set library to drip; set unlocks.
- [ ] Rename the **9 levels** (§6) and attach unlocks.
- [ ] Write **About**, pin **Start Here — Meet Deke**, set **welcome DM** (§7).
- [ ] Create the **recurring calendar events** (§8).
- [ ] Document the standing op: **annual purchase → add VIP role + Producers' Room + send arrangement package**.
- [ ] Swap placeholder images for final brand assets.

> Still pre-launch, tracked separately on the Kanban board: Stripe connection (**t6**), the
> founding-member waitlist (**t7**), and community guidelines (**t9**). This runbook stands up the
> *structure*; those wire up the *plumbing*.

---

## 10. Pricing (decided) & remaining open items

**Pricing — locked:** Free funnel + one paid plan, **$49/mo (7-day trial)** or **$490/yr**; the
**annual is VIP** (private Producers' Room + Deke's special-arrangements package).

Still to confirm:
1. **VIP package contents** — exactly what's in Deke's special-arrangements package.
2. **Level names** — keep the §6 set or adjust.
3. **URL slug** — confirm the exact Deke-branded slug to secure.
4. **Free group name** — "Sing with Deke" vs an alternative.
