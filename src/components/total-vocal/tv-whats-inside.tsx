"use client";

import { motion } from "framer-motion";
import {
  Mic2,
  GraduationCap,
  MessageSquare,
  Globe,
  Library,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    icon: Mic2,
    title: "Live coaching calls with Deke",
    body: "Monthly live sessions where Deke works your arrangements, dials in blend, and answers anything — recorded so you never miss a beat.",
    flagship: true,
  },
  {
    icon: GraduationCap,
    title: "Arranging & technique courses",
    body: "Step-by-step courses on arranging, vocal percussion, blend, and direction — learn the craft from the person who wrote the book on it.",
  },
  {
    icon: MessageSquare,
    title: "Feedback on your group’s sound",
    body: "Post a recording and get specific, actionable notes from Deke and fellow members — tuning, balance, energy, and stage presence.",
  },
  {
    icon: Globe,
    title: "A worldwide member community",
    body: "Singers, directors and arrangers across six continents — find collaborators, swap charts, and never woodshed alone again.",
  },
  {
    icon: Library,
    title: "Resource & sheet-music library",
    body: "A growing vault of arrangements, warm-ups, templates, and reference tracks — everything you need to put a chart on the riser fast.",
  },
  {
    icon: CalendarDays,
    title: "Challenges & events",
    body: "Monthly singing challenges, arranging sprints, and live community events — momentum that keeps your group performance-ready.",
  },
];

export function TvWhatsInside() {
  return (
    <section id="inside" className="bg-background">
      <div className="mx-auto max-w-7xl px-4 py-20 md:px-6 md:py-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto mb-12 max-w-2xl text-center md:mb-16"
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            What&apos;s Inside
          </p>
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Everything your voice needs to grow
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            {"From the warm-up to the riser — coaching, courses, arrangements, and a worldwide community that has your back on every note."}
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
            >
              <div
                className={cn(
                  "group relative h-full overflow-hidden rounded-2xl border bg-card p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated",
                  f.flagship
                    ? "border-2 border-accent"
                    : "border-border hover:border-accent/30",
                )}
              >
                {f.flagship && (
                  <div className="absolute right-0 top-0 rounded-bl-lg bg-accent px-3 py-1 text-xs font-bold uppercase tracking-wide text-accent-foreground">
                    Flagship
                  </div>
                )}
                <div
                  className={cn(
                    "mb-5 flex h-14 w-14 items-center justify-center rounded-xl transition-colors",
                    f.flagship
                      ? "bg-accent text-accent-foreground"
                      : "bg-primary text-primary-foreground group-hover:bg-accent group-hover:text-accent-foreground",
                  )}
                >
                  <f.icon className="h-7 w-7" />
                </div>
                <h3 className="font-display text-xl font-semibold text-foreground">
                  {f.title}
                </h3>
                <p className="mt-2 leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
