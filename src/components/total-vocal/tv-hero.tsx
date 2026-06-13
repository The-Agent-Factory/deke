"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Play, ChevronDown, Mic2 } from "lucide-react";
import { TvEqualizer } from "./tv-equalizer";

const SKOOL_URL = "https://www.skool.com/deke";

const stats = [
  { value: "10 yrs", label: "at Carnegie Hall" },
  { value: "2,000+", label: "arrangements" },
  { value: "35+ yrs", label: "shaping the sound" },
];

export function TvHero() {
  return (
    <section id="top" className="relative overflow-hidden bg-gradient-hero text-white">
      {/* decorative orbs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 top-24 h-96 w-96 rounded-full bg-accent/20 blur-[128px] animate-pulse-subtle"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-primary/40 blur-[128px] animate-pulse-subtle"
        style={{ animationDelay: "1.2s" }}
      />

      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-28 md:px-6 md:pb-28 md:pt-36">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left column */}
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.2, 0.7, 0.2, 1] }}
            className="flex flex-col gap-7"
          >
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-widest text-accent backdrop-blur-sm">
              A Deke Sharon Community
            </span>

            <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl">
              Find Your Voice.
              <span className="block text-accent">Sing With the World.</span>
            </h1>

            <p className="max-w-xl text-lg leading-relaxed text-white/75">
              {"The global home for a cappella singers, directors & arrangers — led by Deke Sharon, the arranger behind "}
              <span className="font-medium text-white">Pitch Perfect</span>
              {", "}
              <span className="font-medium text-white">NBC&apos;s The Sing-Off</span>
              {", and "}
              <span className="font-medium text-white">Total Vocal at Carnegie Hall</span>.
            </p>

            <div className="flex flex-wrap gap-8 border-y border-white/10 py-5">
              {stats.map((s) => (
                <div key={s.label}>
                  <p className="font-display text-2xl font-bold text-accent md:text-3xl">{s.value}</p>
                  <p className="text-sm text-white/60">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
              {/* TODO: "Watch the intro" currently links to Skool; swap for a real intro video/modal */}
              <Link
                href={SKOOL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-7 py-4 text-base font-semibold text-accent-foreground shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
              >
                Join Total Vocal on Skool
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href={SKOOL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-white/30 bg-white/5 px-7 py-4 text-base font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/10"
              >
                <Play className="h-5 w-5" />
                Watch the intro
              </Link>
            </div>
          </motion.div>

          {/* Right column */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.2, 0.7, 0.2, 1] }}
            className="relative"
          >
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
              <Image
                src="/images/total-vocal/hero-performance.webp"
                alt="Singers performing together at Total Vocal"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#12151F]/80 via-transparent to-transparent" />

              <div className="absolute left-6 right-6 top-6">
                <TvEqualizer />
              </div>

              <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-md animate-float-subtle">
                <div>
                  <p className="text-xs text-white/60">Live monthly calls</p>
                  <p className="font-semibold text-white">Coaching with Deke, every month</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/20 text-accent">
                  <Mic2 className="h-5 w-5" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <div aria-hidden className="mt-14 hidden justify-center md:flex">
          <Link
            href="#inside"
            className="flex flex-col items-center gap-1 text-white/40 transition-colors hover:text-white/70"
          >
            <span className="text-xs uppercase tracking-widest">Explore</span>
            <ChevronDown className="h-5 w-5 animate-bounce" />
          </Link>
        </div>
      </div>
    </section>
  );
}
