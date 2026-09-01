"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const SKOOL_URL = "https://www.skool.com/deke";

export function TvFinalCta() {
  return (
    <section className="relative overflow-hidden bg-gradient-hero text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-[120px]"
      />
      <div className="relative mx-auto max-w-3xl px-4 py-20 text-center md:px-6 md:py-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Your section is waiting. Come sing with us.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-white/70">
            {"Join the global a cappella community led by Deke Sharon — and find out how good your voice can sound in great company."}
          </p>
          <Link
            href={SKOOL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-md bg-accent px-8 py-4 text-base font-semibold text-accent-foreground shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
          >
            Join Total Vocal on Skool
            <ArrowRight className="h-5 w-5" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
