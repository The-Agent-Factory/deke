# Total Vocal — Claude Design prompt

A ready-to-paste prompt for **Claude Design** (Claude.ai artifacts) that generates the
**Total Vocal** landing page — the a cappella **Skool community** led by **Deke Sharon**.

It reuses the **dekesharon.com** brand system (this codebase) as the source of truth:
deep navy + warm gold on warm beige, Space Grotesk / Inter, dark photographic hero with a
gold accent headline line, glassmorphism cards, and a gold "Premium"-style corner ribbon.
Brand tokens are taken from `src/app/globals.css` and the patterns in
`src/components/landing/{hero-section,services-section}.tsx`.

## How to use
1. Open Claude (claude.ai) and paste the prompt below.
2. Claude returns **one self-contained React + Tailwind artifact** you can preview live.
3. Search the output for `TODO:` to find every placeholder to edit.
4. The join CTA is already wired to **https://www.skool.com/deke**.

## Placeholders to fill later
- Membership price / free-vs-paid (joins go to skool.com/deke either way).
- Real hero/performance photo + Deke portrait (artifact ships tasteful placeholders).
- Member testimonials (names + quotes) and exact trust stats (member count, countries).

## The prompt

```text
You are designing a high-end marketing LANDING PAGE for "Total Vocal" — the global
a cappella community led by Deke Sharon ("the father of contemporary a cappella"),
hosted on Skool. The page's single job: get visitors to JOIN the community at
https://www.skool.com/deke.

Deliver ONE self-contained file: a single React component (default export) styled with
Tailwind CSS utility classes — no build step, no external image files, no dependencies
beyond React. Use inline SVG for all icons (use lucide-react only if it's available).
Load fonts via a Google Fonts <link>/@import in an inline <style> block. It must render
as a live preview on its own.

BRAND SYSTEM — match dekesharon.com (this is its sibling site).
Colors (OKLCH is source of truth; hex are close approximations — use the hex as Tailwind
arbitrary values, e.g. bg-[#1B2138]):
- Deep Navy (primary/commanding): oklch(0.18 0.03 260) ≈ #1B2138
- Ink (body text on light): oklch(0.15 0 0) ≈ #161616
- Warm Gold (accent/CTAs/stat numbers): oklch(0.78 0.14 75) ≈ #D8A33E; light gold ≈ #EBC579
- Warm Beige (page bg): oklch(0.96 0.005 80) ≈ #F4F1EA; card surface ≈ #E9E4D9
- Charcoal #2C2F38; muted text #8E8E8E; hairline borders #D7D1C5
- Supporting accents, sparingly: terracotta #B86142, green #4F7C5C, slate-blue #5E7E92
Signature gradients:
- Hero / dark sections: linear-gradient(135deg, #12151F 0%, #1B2138 50%, #242A3A 100%)
- Gold accents/badges: linear-gradient(135deg, #D8A33E 0%, #EBC579 100%)
Typography: Space Grotesk for display + headings (bold, tight tracking, leading ~1.1);
Inter for body + UI.
Shape/depth/motion: base radius 0.5rem; cards rounded-xl/2xl; pill badges. Soft shadow
0 2px 8px rgba(0,0,0,.04), 0 4px 16px rgba(0,0,0,.04); elevated (hover) 0 4px 12px
rgba(0,0,0,.05), 0 8px 32px rgba(0,0,0,.08). Tasteful motion only: fade/slide-up on
scroll, card hover-lift (-translate-y-1), slow-pulsing large blurred gradient orbs (gold +
navy) in the hero. Honor prefers-reduced-motion.
Signature components to reuse from the source site:
- HERO: full-height dark gradient; small eyebrow badge; big headline whose SECOND LINE IS
  GOLD (<span className="block text-[#D8A33E]">…</span>); supporting line that name-drops
  credits; a stats row (gold numbers, muted labels) with a thin divider; two CTAs —
  primary = solid gold with navy text; secondary = glassmorphism outline
  (border-white/30 bg-white/5 backdrop-blur); a floating glass info card; a "scroll" cue.
- CARDS: warm surface on beige, hover-lift + elevated shadow; the highlighted card gets a
  2px gold border + a small gold corner ribbon (like the site's "Premium" tag).
- BUTTONS: gold primary with a right-arrow icon; glass outline secondary on dark sections.

PAGE STRUCTURE (top → bottom):
1. Sticky nav — "Total Vocal" wordmark (left), anchor links (What's Inside · Who It's For ·
   About Deke · FAQ), gold "Join the Community" button → Skool. Mobile: hamburger.
2. Hero — eyebrow "A Deke Sharon Community"; headline e.g. "Find Your Voice." + gold line
   "Sing With the World."; subhead positioning it as the global home for a cappella singers,
   directors & arrangers, led by the arranger behind Pitch Perfect, NBC's The Sing-Off, and
   Total Vocal at Carnegie Hall; trust stats (e.g. 10 yrs Carnegie Hall · 2,000+
   arrangements · 35+ yrs — editable placeholders); primary CTA "Join Total Vocal on Skool"
   (→ https://www.skool.com/deke, new tab) + secondary "Watch the intro". Use a dark
   gradient + a waveform/equalizer SVG motif instead of a photo, with a clearly labeled spot
   to drop in a real performance image.
3. Credentials strip — muted chips: Pitch Perfect · The Sing-Off · Carnegie Hall ·
   Disney Dcappella · Broadway: In Transit · Lincoln Center.
4. The promise — one emotive line, e.g. "The human voice is the most powerful instrument on
   earth. When we sing together, we don't just make music — we build community."
5. What's inside — 4–6 feature cards (bento ok): live coaching calls with Deke; arranging &
   technique courses; feedback on your group's sound; a worldwide member community; a
   resource & sheet-music library; challenges & events. Make one the gold-ribbon highlight.
6. Who it's for — three segmented "For …" cards (mirror the source pattern):
   Directors & Arrangers · Competitive Groups (ICCA/CARA) · Singers & Hobbyists — each with
   a one-line outcome.
7. About Deke — portrait placeholder + short bio; credential grid (Pitch Perfect 1-3 ·
   The Sing-Off · In Transit on Broadway · 2,000+ arrangements · founded the ICCAs & CARAs ·
   CASA Lifetime Achievement · author of 5+ books).
8. Member voices — 2–3 testimonial cards (clearly-marked placeholder quotes/names).
9. Join / offer — the conversion block: value stack of what membership includes; a price
   line as an editable placeholder ("$XX/month — edit me"; note it may be free); a large
   "Join the Total Vocal community" CTA → Skool; a reassurance line (all levels welcome).
10. FAQ — accordion: Is it for beginners? Online or in person? What does it cost? How do the
    live calls work? Can my whole group join?
11. Final CTA band — navy gradient, gold button → Skool.
12. Footer — wordmark, nav, socials, © Deke Sharon, link to dekesharon.com.

COPY & QUALITY BAR:
- Voice: confident, warm, credential-forward; speak a cappella natively ("blend," "the
  riser," "arrangements," "ICCA"). Echo the source's headline energy (e.g. "Pitch Perfect
  Harmony, One Note at a Time"). No generic SaaS filler, NO lorem ipsum — write real copy.
- Every primary CTA links to https://www.skool.com/deke (target="_blank" rel="noopener").
- Mark every assumption (stats, price, quotes, image spots) with an inline {/* TODO: ... */}
  comment so it's easy to find and edit.
- Avoid generic-AI aesthetics: no purple/blue gradients, no all-Inter blandness, no emoji
  icons. Aim premium/editorial — a Carnegie Hall program meets a modern creator community.
- Accessible & responsive: semantic landmarks, alt text, visible focus states, AA contrast,
  mobile-first; decorative elements aria-hidden.

Output only the single component file, ready to preview.
```
