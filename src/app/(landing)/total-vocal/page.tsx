"use client";

import { useState } from "react";
import Image from "next/image";
import {
  ArrowRight,
  Play,
  Music2,
  Video,
  GraduationCap,
  MessageSquare,
  Globe2,
  BookOpen,
  Award,
  Users,
  Check,
  Quote,
  Plus,
  Instagram,
  Youtube,
  Facebook,
} from "lucide-react";

const SKOOL_URL = "https://www.skool.com/deke";

// ── Animated equalizer (decorative) ─────────────────────────────────────────
function Equalizer() {
  const bars = Array.from({ length: 26 }, (_, i) => {
    const h = 16 + Math.abs(Math.sin(i * 0.7)) * 44;
    return (
      <span
        key={i}
        className="block w-1 rounded motion-reduce:animate-none"
        style={{
          height: `${h}px`,
          transformOrigin: "bottom",
          background: "linear-gradient(180deg,#EBC579,#D8A33E)",
          opacity: 0.9,
          animation: `tvEq 1.${(i % 6) + 2}s ease-in-out ${(i * 0.07).toFixed(
            2
          )}s infinite alternate`,
        }}
      />
    );
  });
  return (
    <div
      aria-hidden="true"
      className="flex items-end gap-[5px]"
      style={{ height: "64px" }}
    >
      {bars}
    </div>
  );
}

// ── Data ─────────────────────────────────────────────────────────────────────
const navLinks = [
  { href: "#inside", label: "What's Inside" },
  { href: "#who", label: "Who It's For" },
  { href: "#about", label: "About Deke" },
  { href: "#faq", label: "FAQ" },
];

const credentials = [
  "Pitch Perfect",
  "The Sing-Off",
  "Carnegie Hall",
  "Disney DCappella",
  "Broadway: In Transit",
  "Lincoln Center",
];

const insideCards = [
  {
    icon: Video,
    title: "Live coaching calls with Deke",
    body: "Monthly live sessions where Deke works your arrangements, dials in blend, and answers anything — recorded so you never miss a beat.",
    flagship: true,
  },
  {
    icon: Music2,
    title: "Arranging & technique courses",
    body: "Step-by-step courses on arranging, vocal percussion, blend, and direction — learn the craft from the person who wrote the book on it.",
  },
  {
    icon: MessageSquare,
    title: "Feedback on your group's sound",
    body: "Post a recording and get specific, actionable notes from Deke and fellow members — tuning, balance, energy, and stage presence.",
  },
  {
    icon: Globe2,
    title: "A worldwide member community",
    body: "Singers, directors and arrangers across six continents — find collaborators, swap charts, and never woodshed alone again.",
  },
  {
    icon: BookOpen,
    title: "Resource & sheet-music library",
    body: "A growing vault of arrangements, warm-ups, templates, and reference tracks — everything you need to put a chart on the riser fast.",
  },
  {
    icon: Award,
    title: "Challenges & events",
    body: "Monthly singing challenges, arranging sprints, and live community events — momentum that keeps your group performance-ready.",
  },
];

const audiences = [
  {
    title: "Directors & Arrangers",
    body: "Sharpen your charts and your ear. Workshop arrangements with Deke and a room full of people who think in voicings.",
  },
  {
    title: "Competitive Groups",
    body: "Headed for ICCA or CARA contention? Get set-list strategy, blend feedback, and the polish that wins rounds.",
  },
  {
    title: "Singers & Hobbyists",
    body: "Love to sing and want to get better? Find your people, learn the fundamentals, and finally nail that high harmony.",
  },
];

const credits = [
  "Pitch Perfect 1–3",
  "NBC's The Sing-Off",
  "In Transit on Broadway",
  "2,000+ arrangements",
  "Founded the ICCAs & CARAs",
  "CASA Lifetime Achievement",
  "Author of 5+ books",
];

const testimonials = [
  {
    quote:
      "Deke's note on our blend fixed a problem we'd fought for two semesters in a single call. We placed at ICCA semis that spring.",
    name: "Maya R.",
    role: "Collegiate group director",
    initials: "MR",
    grad: "linear-gradient(135deg,#5E7E92,#1B2138)",
  },
  {
    quote:
      "I came in as a shower singer and left arranging my first chart. The community cheers every small win — it's addictive in the best way.",
    name: "Jordan T.",
    role: "Hobbyist singer",
    initials: "JT",
    grad: "linear-gradient(135deg,#B86142,#1B2138)",
  },
  {
    quote:
      "The sheet-music library alone is worth it, but the live calls are where it clicks. It's like having Deke on speed dial for your group.",
    name: "Andre C.",
    role: "Community-choir arranger",
    initials: "AC",
    grad: "linear-gradient(135deg,#4F7C5C,#1B2138)",
  },
];

const valueProps = [
  "Monthly live coaching calls with Deke",
  "Full arranging & technique course library",
  "Personalized feedback on your group's sound",
  "Sheet-music vault, challenges & live events",
  "A worldwide community of singers & directors",
];

const faqs = [
  {
    q: "Is it for beginners?",
    a: "Absolutely. Whether this is your first time on a riser or your tenth ICCA season, you start where you are. The fundamentals, warm-ups, and a supportive community mean nobody gets left behind on the high harmony.",
  },
  {
    q: "Is it online or in person?",
    a: "The community lives online, so you can take part from anywhere in the world. Live coaching calls, courses, and feedback all happen virtually — with occasional in-person events and the chance to sing Total Vocal at Carnegie Hall.",
  },
  {
    q: "What does it cost?",
    a: "Membership pricing is shown above — edit this placeholder to reflect your real plan (it may even be free to join). Either way, you get the full library, the live calls, and the community from day one.",
  },
  {
    q: "How do the live calls work?",
    a: "Deke hosts live coaching sessions each month where you can workshop arrangements, ask questions, and get real-time feedback on your group's sound. Can't make it live? Every call is recorded and added to the library.",
  },
  {
    q: "Can my whole group join?",
    a: "Yes — directors bring their entire ensemble all the time. It's the fastest way to get everyone speaking the same musical language, sharing charts, and tightening blend before your next performance.",
  },
];

// ── Small shared pieces ──────────────────────────────────────────────────────
function WaveLogo() {
  const heights = [9, 18, 22, 14];
  return (
    <span
      aria-hidden="true"
      className="flex items-end gap-[2.5px]"
      style={{ height: "22px" }}
    >
      {heights.map((h, i) => (
        <span
          key={i}
          className="block w-[3px] rounded-[3px]"
          style={{
            height: `${h}px`,
            background: "linear-gradient(180deg,#EBC579,#D8A33E)",
          }}
        />
      ))}
    </span>
  );
}

export default function TotalVocalPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);

  return (
    <div className="tv-root overflow-x-hidden">
      {/* Scoped keyframes + base styles */}
      <style jsx global>{`
        .tv-root {
          background: #f4f1ea;
          color: #161616;
          font-family: var(--font-sans), "Inter", system-ui, sans-serif;
          -webkit-font-smoothing: antialiased;
        }
        .tv-root ::selection {
          background: #d8a33e;
          color: #1b2138;
        }
        .tv-head {
          font-family: var(--font-heading), "Space Grotesk", sans-serif;
        }
        @keyframes tvEq {
          0% {
            transform: scaleY(0.35);
          }
          100% {
            transform: scaleY(1);
          }
        }
        @keyframes tvOrb {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
            opacity: 0.55;
          }
          50% {
            transform: translate(18px, -22px) scale(1.12);
            opacity: 0.8;
          }
        }
        @keyframes tvOrb2 {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
            opacity: 0.4;
          }
          50% {
            transform: translate(-22px, 16px) scale(1.15);
            opacity: 0.62;
          }
        }
        @keyframes tvBob {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(9px);
          }
        }
        @keyframes tvFloat {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        @keyframes tvUp {
          from {
            transform: translateY(22px);
            opacity: 0;
          }
          to {
            transform: none;
            opacity: 1;
          }
        }
        .tv-up {
          animation: tvUp 0.7s cubic-bezier(0.2, 0.7, 0.2, 1) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .tv-up {
            animation: none !important;
            transform: none !important;
            opacity: 1 !important;
          }
          .tv-root *,
          .tv-root *::before,
          .tv-root *::after {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>

      {/* ============ STICKY NAV ============ */}
      <header
        className="sticky top-0 z-[60] border-b"
        style={{
          background: "rgba(18,21,31,0.82)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          borderColor: "rgba(255,255,255,0.08)",
        }}
      >
        <nav
          aria-label="Primary"
          className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between gap-6 px-6"
        >
          <a href="#top" className="flex items-center gap-[11px]">
            <WaveLogo />
            <span className="tv-head text-[19px] font-bold tracking-[-0.02em] text-white">
              Total Vocal
            </span>
          </a>

          <div className="hidden items-center gap-[30px] md:flex">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="rounded-[3px] px-[2px] py-[6px] text-[14.5px] font-medium text-white/[0.78] transition-colors hover:text-[#EBC579] focus-visible:text-[#EBC579] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D8A33E]"
              >
                {l.label}
              </a>
            ))}
          </div>

          <a
            href={SKOOL_URL}
            target="_blank"
            rel="noopener"
            className="hidden items-center gap-2 rounded-[10px] px-[18px] py-[11px] text-[14.5px] font-bold text-[#1B2138] transition-transform hover:-translate-y-px md:inline-flex"
            style={{
              background: "linear-gradient(135deg,#D8A33E 0%,#EBC579 100%)",
              boxShadow: "0 4px 14px rgba(216,163,62,0.3)",
            }}
          >
            Join the Community
            <ArrowRight size={16} strokeWidth={2.4} />
          </a>

          <button
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
            className="flex h-11 w-11 items-center justify-center rounded-[10px] border md:hidden"
            style={{
              background: "rgba(255,255,255,0.06)",
              borderColor: "rgba(255,255,255,0.14)",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
        </nav>

        {mobileOpen && (
          <div
            className="flex flex-col gap-1 border-t px-6 pb-[22px] pt-[14px] md:hidden"
            style={{
              background: "rgba(18,21,31,0.97)",
              borderColor: "rgba(255,255,255,0.08)",
            }}
          >
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                className="border-b px-1 py-3 text-[16px] font-medium text-white/85"
                style={{ borderColor: "rgba(255,255,255,0.06)" }}
              >
                {l.label}
              </a>
            ))}
            <a
              href={SKOOL_URL}
              target="_blank"
              rel="noopener"
              className="mt-3 rounded-[10px] p-[14px] text-center text-[16px] font-bold text-[#1B2138]"
              style={{ background: "linear-gradient(135deg,#D8A33E 0%,#EBC579 100%)" }}
            >
              Join the Community
            </a>
          </div>
        )}
      </header>

      <main id="top">
        {/* ============ HERO ============ */}
        <section
          aria-labelledby="hero-h"
          className="relative overflow-hidden"
          style={{ background: "linear-gradient(135deg,#12151F 0%,#1B2138 50%,#242A3A 100%)" }}
        >
          <div aria-hidden="true" className="pointer-events-none absolute -right-[120px] -top-[160px] h-[520px] w-[520px] rounded-full" style={{ background: "radial-gradient(circle,rgba(216,163,62,0.42) 0%,rgba(216,163,62,0) 68%)", filter: "blur(20px)", animation: "tvOrb 11s ease-in-out infinite" }} />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-[200px] -left-[140px] h-[560px] w-[560px] rounded-full" style={{ background: "radial-gradient(circle,rgba(94,126,146,0.4) 0%,rgba(27,33,56,0) 70%)", filter: "blur(24px)", animation: "tvOrb2 13s ease-in-out infinite" }} />
          <svg aria-hidden="true" viewBox="0 0 1440 200" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 bottom-20 h-40 w-full opacity-[0.12]">
            <path d="M0 100 Q 90 30 180 100 T 360 100 T 540 100 T 720 100 T 900 100 T 1080 100 T 1260 100 T 1440 100" fill="none" stroke="#EBC579" strokeWidth="2" />
            <path d="M0 120 Q 120 180 240 120 T 480 120 T 720 120 T 960 120 T 1200 120 T 1440 120" fill="none" stroke="#5E7E92" strokeWidth="2" />
          </svg>

          <div className="relative z-[2] mx-auto max-w-[1200px] px-6" style={{ paddingTop: "clamp(56px,8vw,96px)", paddingBottom: "clamp(72px,9vw,104px)" }}>
            <div className="grid items-center gap-14 md:grid-cols-[1.05fr_0.95fr] md:gap-[56px]">
              {/* LEFT */}
              <div className="tv-up">
                <span className="inline-flex items-center gap-2 rounded-full border px-[14px] py-[7px] text-[12.5px] font-semibold uppercase tracking-[0.08em] text-[#EBC579]" style={{ background: "rgba(216,163,62,0.12)", borderColor: "rgba(216,163,62,0.35)" }}>
                  <span aria-hidden="true" className="block h-1.5 w-1.5 rounded-full bg-[#D8A33E]" />
                  A Deke Sharon Community
                </span>
                <h1 id="hero-h" className="tv-head mt-[22px] font-bold leading-[1.04] tracking-[-0.03em] text-white text-balance" style={{ fontSize: "clamp(40px,6.2vw,72px)" }}>
                  Find Your Voice.
                  <span className="block bg-clip-text text-transparent" style={{ background: "linear-gradient(135deg,#D8A33E 0%,#EBC579 100%)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    Sing With the World.
                  </span>
                </h1>
                <p className="mt-6 max-w-[540px] text-[clamp(16px,1.7vw,19px)] leading-[1.6] text-white/[0.72]">
                  The global home for a cappella singers, directors &amp; arrangers — led by Deke Sharon, the arranger behind{" "}
                  <strong className="font-semibold text-white">Pitch Perfect</strong>, NBC&apos;s{" "}
                  <strong className="font-semibold text-white">The Sing-Off</strong>, and{" "}
                  <strong className="font-semibold text-white">Total Vocal at Carnegie Hall</strong>.
                </p>

                {/* stats — TODO: confirm these trust stats with Deke before launch */}
                <div className="mt-[34px] flex flex-wrap items-stretch gap-[clamp(18px,3vw,34px)]">
                  {[
                    { n: "10 yrs", l: "at Carnegie Hall" },
                    { n: "2,000+", l: "arrangements" },
                    { n: "35+ yrs", l: "shaping the sound" },
                  ].map((s, i) => (
                    <div key={s.l} className="flex items-stretch gap-[clamp(18px,3vw,34px)]">
                      {i > 0 && <div aria-hidden="true" className="w-px" style={{ background: "rgba(255,255,255,0.14)" }} />}
                      <div>
                        <div className="tv-head text-[30px] font-bold leading-none text-[#D8A33E]">{s.n}</div>
                        <div className="mt-1.5 text-[13px] tracking-[0.02em] text-white/[0.55]">{s.l}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* CTAs */}
                <div className="mt-[38px] flex flex-wrap gap-[14px]">
                  <a href={SKOOL_URL} target="_blank" rel="noopener" className="inline-flex items-center gap-[10px] rounded-[12px] px-[26px] py-[16px] text-[16px] font-bold text-[#1B2138] transition-transform hover:-translate-y-0.5" style={{ background: "linear-gradient(135deg,#D8A33E 0%,#EBC579 100%)", boxShadow: "0 6px 20px rgba(216,163,62,0.32)" }}>
                    Join Total Vocal on Skool
                    <ArrowRight size={18} strokeWidth={2.4} />
                  </a>
                  {/* TODO: link "Watch the intro" to a real intro video */}
                  <a href="#about" className="inline-flex items-center gap-[10px] rounded-[12px] border px-[24px] py-[16px] text-[16px] font-semibold text-white transition-colors hover:bg-white/[0.12]" style={{ borderColor: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.05)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}>
                    <Play size={18} fill="#fff" stroke="none" />
                    Watch the intro
                  </a>
                </div>
              </div>

              {/* RIGHT */}
              <div className="tv-up relative min-h-[380px]">
                <div className="relative overflow-hidden rounded-[22px] border" style={{ borderColor: "rgba(255,255,255,0.12)", boxShadow: "0 24px 60px rgba(0,0,0,0.45)" }}>
                  {/* TODO: swap for a true Total Vocal / Carnegie Hall performance photo */}
                  <Image src="/images/total-vocal/hero.jpeg" alt="Total Vocal performance" width={640} height={470} priority className="block w-full object-cover" style={{ height: "clamp(360px,46vw,470px)" }} />
                  <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(18,21,31,0) 45%,rgba(18,21,31,0.78) 100%)" }} />
                  <div aria-hidden="true" className="pointer-events-none absolute inset-x-6 bottom-[22px]">
                    <Equalizer />
                  </div>
                </div>

                {/* floating glass info card */}
                <div className="absolute -bottom-[26px] -left-[14px] flex max-w-[280px] items-center gap-[14px] rounded-[16px] border p-[16px_18px]" style={{ background: "rgba(255,255,255,0.1)", borderColor: "rgba(255,255,255,0.2)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", boxShadow: "0 16px 40px rgba(0,0,0,0.35)", animation: "tvFloat 7s ease-in-out infinite" }}>
                  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[12px]" style={{ background: "linear-gradient(135deg,#D8A33E 0%,#EBC579 100%)" }}>
                    <Music2 size={22} stroke="#1B2138" />
                  </span>
                  <div>
                    <div className="tv-head text-[14.5px] font-semibold text-white">Live monthly calls</div>
                    <div className="mt-0.5 text-[12.5px] text-white/[0.62]">Coaching with Deke, every month</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* scroll cue */}
          <div aria-hidden="true" className="absolute bottom-[18px] left-1/2 z-[2] flex -translate-x-1/2 flex-col items-center gap-1.5">
            <span className="text-[11px] uppercase tracking-[0.18em] text-white/40">Explore</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "tvBob 2.4s ease-in-out infinite" }}>
              <path d="M12 5v14M6 13l6 6 6-6" />
            </svg>
          </div>
        </section>

        {/* ============ CREDENTIALS STRIP ============ */}
        <section aria-label="Credits" className="border-t" style={{ background: "#1B2138", borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-center gap-3 px-6 py-[26px]">
            <span className="mr-2 text-[12px] uppercase tracking-[0.16em] text-white/40">As heard on</span>
            {credentials.map((c) => (
              <span key={c} className="rounded-full border px-[15px] py-[7px] text-[14px] font-medium text-white/[0.82]" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
                {c}
              </span>
            ))}
          </div>
        </section>

        {/* ============ THE PROMISE ============ */}
        <section aria-label="Our belief" style={{ background: "#F4F1EA" }}>
          <div className="tv-up mx-auto max-w-[980px] px-6 text-center" style={{ paddingTop: "clamp(64px,9vw,108px)", paddingBottom: "clamp(64px,9vw,108px)" }}>
            <span className="mb-6 block text-[13px] font-semibold uppercase tracking-[0.16em] text-[#B86142]">Why we sing</span>
            <p className="tv-head m-0 font-medium leading-[1.28] tracking-[-0.02em] text-[#1B2138] text-balance" style={{ fontSize: "clamp(26px,3.7vw,42px)" }}>
              The human voice is the most powerful instrument on earth. When we sing together, we don&apos;t just make music — <span className="text-[#D8A33E]">we build community.</span>
            </p>
          </div>
        </section>

        {/* ============ WHAT'S INSIDE ============ */}
        <section id="inside" aria-labelledby="inside-h" style={{ background: "#F4F1EA" }}>
          <div className="mx-auto max-w-[1200px] px-6" style={{ paddingTop: "clamp(20px,3vw,40px)", paddingBottom: "clamp(72px,9vw,104px)" }}>
            <div className="tv-up mb-[clamp(40px,5vw,56px)] max-w-[680px]">
              <span className="mb-3.5 block text-[13px] font-semibold uppercase tracking-[0.16em] text-[#B86142]">What&apos;s Inside</span>
              <h2 id="inside-h" className="tv-head mb-4 font-bold leading-[1.1] tracking-[-0.025em] text-[#161616] text-balance" style={{ fontSize: "clamp(30px,4.4vw,46px)" }}>
                Everything your voice needs to grow
              </h2>
              <p className="m-0 text-[17px] leading-[1.6] text-[#2C2F38]">
                From the warm-up to the riser — coaching, courses, arrangements, and a worldwide community that has your back on every note.
              </p>
            </div>

            <div className="grid gap-[22px]" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))" }}>
              {insideCards.map(({ icon: Icon, title, body, flagship }) => (
                <article
                  key={title}
                  className="tv-up relative overflow-hidden rounded-[20px] p-[30px_28px] transition-transform hover:-translate-y-1"
                  style={{
                    background: "#E9E4D9",
                    border: flagship ? "2px solid #D8A33E" : "1px solid #D7D1C5",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04),0 4px 16px rgba(0,0,0,0.04)",
                  }}
                >
                  {flagship && (
                    <span className="absolute -right-[34px] top-4 rotate-45 px-10 py-[5px] text-[11px] font-bold uppercase tracking-[0.08em] text-[#1B2138]" style={{ background: "linear-gradient(135deg,#D8A33E 0%,#EBC579 100%)", boxShadow: "0 2px 6px rgba(0,0,0,0.15)" }}>
                      Flagship
                    </span>
                  )}
                  <span className="mb-5 flex h-[50px] w-[50px] items-center justify-center rounded-[14px]" style={{ background: flagship ? "linear-gradient(135deg,#D8A33E 0%,#EBC579 100%)" : "rgba(27,33,56,0.06)" }}>
                    <Icon size={26} strokeWidth={1.8} stroke="#1B2138" />
                  </span>
                  <h3 className="tv-head mb-2.5 text-[21px] font-semibold tracking-[-0.01em] text-[#1B2138]">{title}</h3>
                  <p className="m-0 text-[15px] leading-[1.6] text-[#2C2F38]">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ============ WHO IT'S FOR ============ */}
        <section id="who" aria-labelledby="who-h" className="relative overflow-hidden" style={{ background: "#1B2138" }}>
          <div aria-hidden="true" className="pointer-events-none absolute -right-[100px] -top-[120px] h-[380px] w-[380px] rounded-full" style={{ background: "radial-gradient(circle,rgba(216,163,62,0.18) 0%,rgba(216,163,62,0) 70%)", filter: "blur(20px)" }} />
          <div className="relative mx-auto max-w-[1200px] px-6" style={{ paddingTop: "clamp(64px,9vw,104px)", paddingBottom: "clamp(64px,9vw,104px)" }}>
            <div className="tv-up mb-[clamp(40px,5vw,56px)] max-w-[680px]">
              <span className="mb-3.5 block text-[13px] font-semibold uppercase tracking-[0.16em] text-[#EBC579]">Who It&apos;s For</span>
              <h2 id="who-h" className="tv-head m-0 font-bold leading-[1.1] tracking-[-0.025em] text-white text-balance" style={{ fontSize: "clamp(30px,4.4vw,46px)" }}>
                Wherever you are on the riser
              </h2>
            </div>

            <div className="grid gap-[22px]" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))" }}>
              {audiences.map((a) => (
                <article key={a.title} className="tv-up rounded-[20px] border p-[32px_28px] transition-transform hover:-translate-y-1" style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)" }}>
                  <span className="mb-[18px] inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-[#EBC579]">
                    <Users size={18} strokeWidth={1.8} stroke="#EBC579" />
                    For
                  </span>
                  <h3 className="tv-head mb-3 text-[23px] font-semibold tracking-[-0.01em] text-white">{a.title}</h3>
                  <p className="m-0 text-[15px] leading-[1.6] text-white/[0.66]">{a.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ============ ABOUT DEKE ============ */}
        <section id="about" aria-labelledby="about-h" style={{ background: "#F4F1EA" }}>
          <div className="mx-auto max-w-[1200px] px-6" style={{ paddingTop: "clamp(64px,9vw,104px)", paddingBottom: "clamp(64px,9vw,104px)" }}>
            <div className="grid items-center gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-[56px]">
              <div className="tv-up relative">
                <div className="relative overflow-hidden rounded-[20px]" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}>
                  <Image src="/images/total-vocal/deke.jpeg" alt="Deke Sharon" width={520} height={480} className="block w-full object-cover" style={{ height: "clamp(360px,42vw,480px)" }} />
                </div>
                <div className="tv-head absolute bottom-[18px] left-[18px] rounded-full px-3.5 py-2 text-[13px] font-bold text-[#1B2138]" style={{ background: "linear-gradient(135deg,#D8A33E 0%,#EBC579 100%)", boxShadow: "0 4px 14px rgba(0,0,0,0.18)" }}>
                  The Father of Contemporary A Cappella
                </div>
              </div>

              <div className="tv-up">
                <span className="mb-3.5 block text-[13px] font-semibold uppercase tracking-[0.16em] text-[#B86142]">About Deke</span>
                <h2 id="about-h" className="tv-head mb-[18px] font-bold leading-[1.1] tracking-[-0.025em] text-[#161616] text-balance" style={{ fontSize: "clamp(30px,4.2vw,44px)" }}>
                  The arranger behind the modern a cappella movement
                </h2>
                <p className="mb-4 text-[16.5px] leading-[1.65] text-[#2C2F38]">
                  For more than three decades, Deke Sharon has defined how the world hears voices-only music. He arranged and produced <strong className="text-[#1B2138]">Pitch Perfect</strong>, served as the vocal architect of NBC&apos;s <strong className="text-[#1B2138]">The Sing-Off</strong>, and brings hundreds of singers to <strong className="text-[#1B2138]">Carnegie Hall</strong> each year for Total Vocal.
                </p>
                <p className="mb-[26px] text-[16.5px] leading-[1.65] text-[#2C2F38]">
                  Now he&apos;s bringing that work directly to you — a community where the craft, the coaching, and the camaraderie live in one place.
                </p>

                <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))" }}>
                  {credits.map((c) => (
                    <div key={c} className="flex items-center gap-2.5 rounded-[10px] border p-[12px_14px]" style={{ background: "#E9E4D9", borderColor: "#D7D1C5" }}>
                      <Check size={16} strokeWidth={2.4} stroke="#4F7C5C" className="flex-shrink-0" />
                      <span className="text-[14px] font-medium text-[#1B2138]">{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============ MEMBER VOICES ============ */}
        <section aria-labelledby="voices-h" className="border-y" style={{ background: "#E9E4D9", borderColor: "#D7D1C5" }}>
          <div className="mx-auto max-w-[1200px] px-6" style={{ paddingTop: "clamp(64px,9vw,104px)", paddingBottom: "clamp(64px,9vw,104px)" }}>
            <div className="tv-up mx-auto mb-[clamp(40px,5vw,56px)] max-w-[680px] text-center">
              <span className="mb-3.5 block text-[13px] font-semibold uppercase tracking-[0.16em] text-[#B86142]">Member Voices</span>
              <h2 id="voices-h" className="tv-head m-0 font-bold leading-[1.1] tracking-[-0.025em] text-[#161616] text-balance" style={{ fontSize: "clamp(30px,4.4vw,46px)" }}>
                From singers who found their people
              </h2>
            </div>

            {/* TODO: replace placeholder quotes & names with real member testimonials */}
            <div className="grid gap-[22px]" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))" }}>
              {testimonials.map((t) => (
                <figure key={t.name} className="tv-up m-0 rounded-[20px] border p-[30px_28px]" style={{ background: "#F4F1EA", borderColor: "#D7D1C5", boxShadow: "0 2px 8px rgba(0,0,0,0.04),0 4px 16px rgba(0,0,0,0.04)" }}>
                  <Quote size={34} fill="#D8A33E" stroke="none" className="mb-3.5 opacity-90" />
                  <blockquote className="m-0 text-[16.5px] font-medium leading-[1.6] text-[#1B2138]">&ldquo;{t.quote}&rdquo;</blockquote>
                  <figcaption className="mt-[22px] flex items-center gap-3">
                    <span aria-hidden="true" className="tv-head flex h-[42px] w-[42px] items-center justify-center rounded-full font-semibold text-white" style={{ background: t.grad }}>
                      {t.initials}
                    </span>
                    <span>
                      <span className="block text-[14.5px] font-semibold text-[#161616]">{t.name}</span>
                      <span className="block text-[13px] text-[#8E8E8E]">{t.role}</span>
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* ============ JOIN / OFFER ============ */}
        <section aria-labelledby="join-h" style={{ background: "#F4F1EA" }}>
          <div className="mx-auto max-w-[1100px] px-6" style={{ paddingTop: "clamp(64px,9vw,104px)", paddingBottom: "clamp(64px,9vw,104px)" }}>
            <div className="tv-up relative overflow-hidden rounded-[28px]" style={{ background: "linear-gradient(135deg,#12151F 0%,#1B2138 50%,#242A3A 100%)", boxShadow: "0 24px 60px rgba(18,21,31,0.3)" }}>
              <div aria-hidden="true" className="pointer-events-none absolute -right-[80px] -top-[100px] h-[360px] w-[360px] rounded-full" style={{ background: "radial-gradient(circle,rgba(216,163,62,0.22) 0%,rgba(216,163,62,0) 70%)", filter: "blur(16px)" }} />
              <div className="grid items-center gap-9 lg:grid-cols-[1.15fr_0.85fr] lg:gap-[48px]" style={{ padding: "clamp(36px,5vw,56px)" }}>
                <div className="relative z-[2]">
                  <span className="mb-3.5 inline-block text-[13px] font-semibold uppercase tracking-[0.16em] text-[#EBC579]">Join Total Vocal</span>
                  <h2 id="join-h" className="tv-head mb-[22px] font-bold leading-[1.1] tracking-[-0.025em] text-white text-balance" style={{ fontSize: "clamp(28px,3.8vw,42px)" }}>
                    Step onto the riser with us
                  </h2>
                  <ul className="m-0 flex list-none flex-col gap-[13px] p-0">
                    {valueProps.map((v) => (
                      <li key={v} className="flex items-start gap-[11px] text-[15.5px] leading-[1.45] text-white/85">
                        <Check size={20} strokeWidth={2.4} stroke="#D8A33E" className="mt-px flex-shrink-0" />
                        {v}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* TODO: set the real price — membership may be free; edit or remove this block */}
                <div className="relative z-[2] rounded-[20px] border p-[32px_28px] text-center" style={{ background: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.14)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}>
                  <div className="flex items-baseline justify-center gap-1.5">
                    <span className="tv-head text-[48px] font-bold leading-none text-[#D8A33E]">$49</span>
                    <span className="text-[16px] text-white/60">/month</span>
                  </div>
                  <p className="m-0 mt-2 text-[13px] text-white/50">Editable placeholder — may be free</p>
                  <a href={SKOOL_URL} target="_blank" rel="noopener" className="mt-6 flex items-center justify-center gap-[10px] rounded-[13px] px-[24px] py-[17px] text-[17px] font-bold text-[#1B2138] transition-transform hover:-translate-y-0.5" style={{ background: "linear-gradient(135deg,#D8A33E 0%,#EBC579 100%)", boxShadow: "0 6px 20px rgba(216,163,62,0.32)" }}>
                    Join the Total Vocal community
                    <ArrowRight size={18} strokeWidth={2.4} />
                  </a>
                  <p className="m-0 mt-4 text-[13.5px] leading-[1.5] text-white/60">All levels welcome — from first rehearsal to Carnegie Hall.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============ FAQ ============ */}
        <section id="faq" aria-labelledby="faq-h" style={{ background: "#F4F1EA" }}>
          <div className="mx-auto max-w-[820px] px-6" style={{ paddingBottom: "clamp(72px,9vw,104px)" }}>
            <div className="tv-up mb-[clamp(36px,4vw,48px)] text-center">
              <span className="mb-3.5 block text-[13px] font-semibold uppercase tracking-[0.16em] text-[#B86142]">FAQ</span>
              <h2 id="faq-h" className="tv-head m-0 font-bold leading-[1.1] tracking-[-0.025em] text-[#161616]" style={{ fontSize: "clamp(30px,4.4vw,46px)" }}>
                Questions, answered
              </h2>
            </div>

            <div className="tv-up flex flex-col gap-3">
              {faqs.map((f, i) => {
                const isOpen = faqOpen === i;
                return (
                  <div key={f.q} className="overflow-hidden rounded-[14px] border" style={{ background: "#E9E4D9", borderColor: "#D7D1C5" }}>
                    <button
                      onClick={() => setFaqOpen(isOpen ? null : i)}
                      aria-expanded={isOpen}
                      className="tv-head flex w-full items-center justify-between gap-4 px-[22px] py-5 text-left text-[17px] font-semibold text-[#1B2138]"
                    >
                      {f.q}
                      <span className="flex flex-shrink-0 transition-transform duration-300" style={{ transform: isOpen ? "rotate(45deg)" : "rotate(0deg)" }}>
                        <Plus size={20} strokeWidth={2.4} stroke="#D8A33E" />
                      </span>
                    </button>
                    <div
                      className="overflow-hidden transition-all duration-300"
                      style={{ maxHeight: isOpen ? "320px" : "0px", opacity: isOpen ? 1 : 0 }}
                    >
                      <p className="m-0 px-[22px] pb-[22px] text-[15.5px] leading-[1.65] text-[#2C2F38]">{f.a}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      {/* ============ FINAL CTA BAND ============ */}
      <section aria-labelledby="final-h" className="relative overflow-hidden" style={{ background: "linear-gradient(135deg,#12151F 0%,#1B2138 50%,#242A3A 100%)" }}>
        <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 h-[340px] w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: "radial-gradient(ellipse,rgba(216,163,62,0.18) 0%,rgba(216,163,62,0) 68%)", filter: "blur(24px)" }} />
        <div className="tv-up relative z-[2] mx-auto max-w-[840px] px-6 text-center" style={{ paddingTop: "clamp(72px,10vw,120px)", paddingBottom: "clamp(72px,10vw,120px)" }}>
          <h2 id="final-h" className="tv-head mb-[18px] font-bold leading-[1.08] tracking-[-0.03em] text-white text-balance" style={{ fontSize: "clamp(32px,5vw,56px)" }}>
            Your section is waiting.
            <br />
            <span className="bg-clip-text text-transparent" style={{ background: "linear-gradient(135deg,#D8A33E 0%,#EBC579 100%)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Come sing with us.
            </span>
          </h2>
          <p className="mx-auto mb-[34px] max-w-[560px] text-[18px] leading-[1.6] text-white/70">
            Join the global a cappella community led by Deke Sharon — and find out how good your voice can sound in great company.
          </p>
          <a href={SKOOL_URL} target="_blank" rel="noopener" className="inline-flex items-center gap-[11px] rounded-[14px] px-8 py-[18px] text-[18px] font-bold text-[#1B2138] transition-transform hover:-translate-y-0.5" style={{ background: "linear-gradient(135deg,#D8A33E 0%,#EBC579 100%)", boxShadow: "0 8px 28px rgba(216,163,62,0.4)" }}>
            Join Total Vocal on Skool
            <ArrowRight size={20} strokeWidth={2.4} />
          </a>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="border-t" style={{ background: "#12151F", borderColor: "rgba(255,255,255,0.08)" }}>
        <div className="mx-auto max-w-[1200px] px-6" style={{ paddingTop: "clamp(48px,6vw,72px)", paddingBottom: "36px" }}>
          <div className="flex flex-wrap items-start justify-between gap-8">
            <div className="max-w-[320px]">
              <div className="mb-4 flex items-center gap-[11px]">
                <WaveLogo />
                <span className="tv-head text-[19px] font-bold tracking-[-0.02em] text-white">Total Vocal</span>
              </div>
              <p className="m-0 text-[14.5px] leading-[1.6] text-white/[0.55]">
                The global a cappella community, led by Deke Sharon. Find your voice — and sing with the world.
              </p>
            </div>

            <div className="flex flex-wrap gap-12">
              <nav aria-label="Footer" className="flex flex-col gap-[11px]">
                <span className="mb-1 text-[12px] uppercase tracking-[0.12em] text-white/40">Explore</span>
                {navLinks.map((l) => (
                  <a key={l.href} href={l.href} className="text-[14.5px] text-white/70 transition-colors hover:text-[#EBC579]">
                    {l.label}
                  </a>
                ))}
              </nav>
              <div className="flex flex-col gap-[11px]">
                <span className="mb-1 text-[12px] uppercase tracking-[0.12em] text-white/40">Connect</span>
                <a href={SKOOL_URL} target="_blank" rel="noopener" className="text-[14.5px] text-white/70 transition-colors hover:text-[#EBC579]">Join on Skool</a>
                <a href="https://www.dekesharon.com" target="_blank" rel="noopener" className="text-[14.5px] text-white/70 transition-colors hover:text-[#EBC579]">dekesharon.com</a>
                <div className="mt-1.5 flex gap-3">
                  {[
                    { Icon: Instagram, label: "Instagram" },
                    { Icon: Youtube, label: "YouTube" },
                    { Icon: Facebook, label: "Facebook" },
                  ].map(({ Icon, label }) => (
                    <a key={label} href="https://www.dekesharon.com" target="_blank" rel="noopener" aria-label={label} className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px] border transition-colors hover:border-[#D8A33E]" style={{ borderColor: "rgba(255,255,255,0.14)" }}>
                      <Icon size={18} strokeWidth={1.8} stroke="rgba(255,255,255,0.7)" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t pt-6" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
            <span className="text-[13px] text-white/40">© 2026 Deke Sharon. All rights reserved.</span>
            <span className="text-[13px] text-white/40">
              A sibling of{" "}
              <a href="https://www.dekesharon.com" target="_blank" rel="noopener" className="text-white/60 underline underline-offset-2 transition-colors hover:text-[#EBC579]">
                dekesharon.com
              </a>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
