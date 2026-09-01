"use client";

import { motion } from "framer-motion";

const CREDITS = [
  "Pitch Perfect",
  "The Sing-Off",
  "Carnegie Hall",
  "Disney DCappella",
  "Broadway: In Transit",
  "Lincoln Center",
];

export function TvCredentials() {
  return (
    <section className="border-y border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-6"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            As heard on
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 md:gap-x-12">
            {CREDITS.map((c) => (
              <span
                key={c}
                className="font-display text-base font-semibold text-foreground/70 md:text-lg"
              >
                {c}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
