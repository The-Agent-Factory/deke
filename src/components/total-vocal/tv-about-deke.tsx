"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Award } from "lucide-react";

const CREDENTIALS = [
  "Pitch Perfect 1–3",
  "NBC’s The Sing-Off",
  "In Transit on Broadway",
  "2,000+ arrangements",
  "Founded the ICCAs & CARAs",
  "CASA Lifetime Achievement",
  "Author of 5+ books",
];

export function TvAboutDeke() {
  return (
    <section id="about" className="bg-background">
      <div className="mx-auto max-w-7xl px-4 py-20 md:px-6 md:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
          >
            <div className="relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden rounded-2xl border border-border shadow-elevated">
              <Image
                src="/images/total-vocal/deke-portrait.webp"
                alt="Deke Sharon, the father of contemporary a cappella"
                fill
                sizes="(max-width: 1024px) 100vw, 45vw"
                className="object-cover"
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              The Father of Contemporary A Cappella
            </p>
            <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              The arranger behind the modern a cappella movement
            </h2>
            <div className="mt-5 space-y-4 text-lg leading-relaxed text-muted-foreground">
              <p>
                {"For more than three decades, Deke Sharon has defined how the world hears voices-only music. He arranged and produced Pitch Perfect, served as the vocal architect of NBC’s The Sing-Off, and brings hundreds of singers to Carnegie Hall each year for Total Vocal."}
              </p>
              <p>
                {"Now he’s bringing that work directly to you — a community where the craft, the coaching, and the camaraderie live in one place."}
              </p>
            </div>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {CREDENTIALS.map((c) => (
                <li
                  key={c}
                  className="flex items-center gap-2.5 text-sm font-medium text-foreground"
                >
                  <Award className="h-4 w-4 shrink-0 text-accent" />
                  {c}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
