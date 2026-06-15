"use client";

import { motion } from "framer-motion";

export function TvPromise() {
  return (
    <section className="bg-section-alt">
      <div className="mx-auto max-w-4xl px-4 py-20 text-center md:px-6 md:py-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
        >
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Why we sing
          </p>
          <p className="font-display text-2xl font-medium leading-snug text-foreground sm:text-3xl md:text-4xl">
            {"The human voice is the most powerful instrument on earth. When we sing together, we don’t just make music — we build community."}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
