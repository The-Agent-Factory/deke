"use client";

import { motion } from "framer-motion";
import { Music2, Trophy, Heart } from "lucide-react";

const AUDIENCES = [
  {
    icon: Music2,
    who: "Directors & Arrangers",
    body: "Sharpen your charts and your ear. Workshop arrangements with Deke and a room full of people who think in voicings.",
  },
  {
    icon: Trophy,
    who: "Competitive Groups",
    body: "Headed for ICCA or CARA contention? Get set-list strategy, blend feedback, and the polish that wins rounds.",
  },
  {
    icon: Heart,
    who: "Singers & Hobbyists",
    body: "Love to sing and want to get better? Find your people, learn the fundamentals, and finally nail that high harmony.",
  },
];

export function TvWhoItsFor() {
  return (
    <section id="who" className="bg-section-alt">
      <div className="mx-auto max-w-7xl px-4 py-20 md:px-6 md:py-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto mb-12 max-w-2xl text-center md:mb-16"
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Who It&apos;s For
          </p>
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Wherever you are on the riser
          </h2>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-3">
          {AUDIENCES.map((a, i) => (
            <motion.div
              key={a.who}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
            >
              <div className="h-full rounded-2xl border border-border bg-card p-8 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <a.icon className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold uppercase tracking-widest text-accent">
                  For
                </p>
                <h3 className="mt-1 font-display text-2xl font-bold text-foreground">
                  {a.who}
                </h3>
                <p className="mt-3 leading-relaxed text-muted-foreground">{a.body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
