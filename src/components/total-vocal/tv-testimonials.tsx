"use client";

import { motion } from "framer-motion";

// TODO: replace with real member testimonials (quotes + names).
const VOICES = [
  {
    quote:
      "Deke’s note on our blend fixed a problem we’d fought for two semesters in a single call. We placed at ICCA semis that spring.",
    initials: "MR",
    name: "Maya R.",
    role: "Collegiate group director",
  },
  {
    quote:
      "I came in as a shower singer and left arranging my first chart. The community cheers every small win — it’s addictive in the best way.",
    initials: "JT",
    name: "Jordan T.",
    role: "Hobbyist singer",
  },
  {
    quote:
      "The sheet-music library alone is worth it, but the live calls are where it clicks. It’s like having Deke on speed dial for your group.",
    initials: "AC",
    name: "Andre C.",
    role: "Community-choir arranger",
  },
];

export function TvTestimonials() {
  return (
    <section className="bg-section-alt">
      <div className="mx-auto max-w-7xl px-4 py-20 md:px-6 md:py-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto mb-12 max-w-2xl text-center md:mb-16"
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Member Voices
          </p>
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            From singers who found their people
          </h2>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-3">
          {VOICES.map((v, i) => (
            <motion.figure
              key={v.initials}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="flex h-full flex-col rounded-2xl border border-border bg-card p-7 shadow-soft"
            >
              <blockquote className="flex-1 text-lg leading-relaxed text-foreground">
                {"“"}
                {v.quote}
                {"”"}
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/15 font-display text-sm font-bold text-accent">
                  {v.initials}
                </span>
                <span>
                  <span className="block font-semibold text-foreground">{v.name}</span>
                  <span className="block text-sm text-muted-foreground">{v.role}</span>
                </span>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
