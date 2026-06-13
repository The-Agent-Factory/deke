"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";

const SKOOL_URL = "https://www.skool.com/deke";

const INCLUDES = [
  "Monthly live coaching calls with Deke",
  "Full arranging & technique course library",
  "Personalized feedback on your group’s sound",
  "Sheet-music vault, challenges & live events",
  "A worldwide community of singers & directors",
];

export function TvJoin() {
  return (
    <section id="join" className="bg-background">
      <div className="mx-auto max-w-5xl px-4 py-20 md:px-6 md:py-28">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="overflow-hidden rounded-3xl border border-border bg-card shadow-elevated"
        >
          <div className="grid md:grid-cols-2">
            <div className="p-8 md:p-10">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                Join Total Vocal
              </p>
              <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Step onto the riser with us
              </h2>
              <ul className="mt-7 space-y-3">
                {INCLUDES.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-foreground">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col justify-center gap-6 bg-gradient-cta p-8 text-white md:p-10">
              <div>
                <div className="flex items-end gap-1">
                  {/* TODO: replace $XX with the real membership price (or remove if free) */}
                  <span className="font-display text-5xl font-bold text-accent">$XX</span>
                  <span className="mb-1 text-white/70">/month</span>
                </div>
                <p className="mt-1 text-sm text-white/60">
                  Editable placeholder — may be free
                </p>
              </div>
              <Link
                href={SKOOL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-7 py-4 text-base font-semibold text-accent-foreground shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
              >
                Join the Total Vocal community
                <ArrowRight className="h-5 w-5" />
              </Link>
              <p className="text-center text-sm text-white/60">
                All levels welcome — from first rehearsal to Carnegie Hall.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
